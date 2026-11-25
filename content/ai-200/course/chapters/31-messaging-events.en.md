AI back ends rarely do their heavy work inside the HTTP request: they queue it. Azure Service Bus carries **messages**, commands that a receiver must process exactly as agreed (summarize this document, index this batch), with locks, retries and a dead-letter queue. Azure Event Grid routes **events**, notifications that something happened (a blob was uploaded, an evaluation finished), to the handlers that subscribed, with filters and retries. Exam questions show Python SDK code, an `az` command or a subscription definition and ask which setting meets a reliability or routing requirement.

<!-- section: service-bus-entities | objectives: 3.1.1 -->
## Service Bus queues, topics and messages

A namespace (`<namespace>.servicebus.windows.net`) contains the entities:

| Entity | Delivery | Use |
| --- | --- | --- |
| Queue | Each message to **one** receiver among competing consumers | Work distribution and load leveling: a GPU worker pool reads jobs at its own pace |
| Topic with subscriptions | A copy to **each** subscription whose rules match; each subscription is read like a queue | Several independent consumers of the same message (indexer, auditor, notifier) |

| Tier | Adds |
| --- | --- |
| Basic | Queues only |
| Standard | Topics and subscriptions, sessions, transactions, duplicate detection; messages up to 256 KB |
| Premium | Dedicated capacity, messages up to 100 MB, private endpoints |

Code authenticates with Microsoft Entra ID: `DefaultAzureCredential` plus a data role on the namespace or the entity, **Azure Service Bus Data Sender** to send, **Data Receiver** to receive, **Data Owner** for both.

```text
import json
from azure.identity import DefaultAzureCredential
from azure.servicebus import ServiceBusClient, ServiceBusMessage

client = ServiceBusClient(
    fully_qualified_namespace="contoso-ai.servicebus.windows.net",
    credential=DefaultAzureCredential(),
)

with client.get_queue_sender(queue_name="summarize-jobs") as sender:
    batch = sender.create_message_batch()
    for doc in documents:
        batch.add_message(ServiceBusMessage(
            json.dumps({"documentId": doc.id}),
            message_id=doc.id,                      # duplicate detection key
            session_id=doc.customer_id,             # FIFO per customer (session-enabled queue)
            application_properties={"priority": doc.priority},
            content_type="application/json",
        ))
    sender.send_messages(batch)
```

| Message property | Purpose |
| --- | --- |
| `message_id` | Identifies the message; duplicate detection drops a second message with the same ID within the detection window |
| `session_id` | Groups related messages; a session receiver gets them in order, one receiver per session at a time |
| `correlation_id`, `subject`, `application_properties` | Metadata read by subscription filters; filters never read the body |
| `time_to_live` | Expiration of the message |
| `scheduled_enqueue_time_utc` or `sender.schedule_messages()` | Delayed delivery |

`create_message_batch()` raises `ValueError` from `add_message` when the batch is full: send it and start a new one. Sessions (queue or subscription) and duplicate detection (queue or topic) can be enabled only when the entity is created, never changed afterwards; the duplicate detection window (10 minutes by default, 20 seconds to 7 days) can be changed later.

> **Exam trap.** "Process the steps of each conversation in order" needs a **session-enabled** entity and `session_id` on every message, in Standard or Premium. A plain queue with competing consumers doesn't preserve order.

<!-- section: service-bus-receive | objectives: 3.1.1 -->
## Receiving and settling messages

| Receive mode | Behavior | Guarantee |
| --- | --- | --- |
| `ServiceBusReceiveMode.PEEK_LOCK` (default) | The message is locked for this receiver; the code settles it after processing | At least once: a crash or an expired lock redelivers it |
| `ServiceBusReceiveMode.RECEIVE_AND_DELETE` | The message is removed when it is sent to the receiver | At most once: a crash loses it |

```text
from azure.servicebus import AutoLockRenewer

renewer = AutoLockRenewer()
with client.get_queue_receiver(queue_name="summarize-jobs", max_wait_time=30) as receiver:
    for msg in receiver:
        renewer.register(receiver, msg, max_lock_renewal_duration=600)   # long model call
        try:
            job = json.loads(str(msg))
            summarize(job["documentId"])
            receiver.complete_message(msg)                   # done: remove
        except InvalidPayload as err:
            receiver.dead_letter_message(msg, reason="InvalidPayload",
                                         error_description=str(err))
        except TransientError:
            receiver.abandon_message(msg)                    # retry now; delivery count + 1
```

| Settlement | Effect |
| --- | --- |
| `complete_message` | Processing succeeded; the message is deleted |
| `abandon_message` | Releases the lock: the message is redelivered and its delivery count increases |
| `dead_letter_message` | Moves it to the dead-letter queue with a reason and a description |
| `defer_message` | Sets it aside; read it later with `receive_deferred_messages` and its sequence number |

The **lock duration** is a queue or subscription property: 1 minute by default, 5 minutes at most. Set it above the normal processing time, and renew the lock (`AutoLockRenewer`) for longer work. Because delivery is at least once, make the handler **idempotent**, for example by recording the `message_id` of processed messages. Settle each message before closing the receiver or the client, and create one client per process.

> **Exam trap.** A message that is never completed isn't lost in peek-lock mode: when its lock expires it comes back with a higher delivery count, and the receiver must handle the duplicate.

<!-- section: dead-letter | objectives: 3.1.1 -->
## Handling the dead-letter queue

Every queue and every subscription has a dead-letter sub-queue (DLQ), created automatically; a topic has none of its own. Messages stay there until a receiver reads and completes them: the DLQ applies no time to live and nothing is cleaned up for you.

| Reason (`dead_letter_reason`) | Cause |
| --- | --- |
| `MaxDeliveryCountExceeded` | Delivered more times than **MaxDeliveryCount** (10 by default): abandons or expired locks |
| `HeaderSizeExceeded` | The size quota of the message stream was exceeded |
| `TTLExpiredException` | The message expired and dead-lettering on message expiration is enabled on the entity |
| `Session ID is null` | A message without `session_id` sent to a session-enabled entity |
| `MaxTransferHopCountExceeded` | More than four hops of auto-forwarding |
| Your own reason | The application called `dead_letter_message` (poison message, failed validation) |

A subscription can also dead-letter messages whose filter evaluation throws an exception, if that option is on. Expired messages are simply dropped when dead-lettering on expiration is off. Deferred messages that expire aren't moved to the DLQ.

```text
from azure.servicebus import ServiceBusSubQueue

with client.get_queue_receiver(queue_name="summarize-jobs",
                               sub_queue=ServiceBusSubQueue.DEAD_LETTER) as dlq:
    for msg in dlq.receive_messages(max_message_count=50, max_wait_time=5):
        log_failure(msg.dead_letter_reason, msg.dead_letter_error_description)
        if can_be_fixed(msg):
            with client.get_queue_sender("summarize-jobs") as sender:
                sender.send_messages(ServiceBusMessage(fix(msg)))   # resubmit a new message
        dlq.complete_message(msg)                                    # remove from the DLQ
```

For a subscription, use `get_subscription_receiver(topic_name, subscription_name, sub_queue=ServiceBusSubQueue.DEAD_LETTER)`. The path seen in tools is `<queue>/$deadletterqueue` or `<topic>/Subscriptions/<subscription>/$deadletterqueue`. Service Bus Explorer in the portal can also peek and resend dead-lettered messages.

```bash
az servicebus queue create --resource-group rg-ai --namespace-name contoso-ai \
  --name summarize-jobs --max-delivery-count 5 --lock-duration PT2M \
  --enable-dead-lettering-on-message-expiration true
```

> **Exam trap.** A message can't be dead-lettered from the DLQ, and the DLQ doesn't retry by itself. A message moves back to processing only when your code (or Service Bus Explorer) sends a new copy to the queue.

<!-- section: topics-filters | objectives: 3.1.1 -->
## Topics, subscriptions and filters

Each subscription has rules; each rule has a filter and, for SQL filters, an optional action. A new subscription has a default rule (`$Default`) with a true filter that accepts every message: remove or replace it when you add your own filter, otherwise the subscription still receives everything.

| Filter | Matches on | Notes |
| --- | --- | --- |
| Correlation filter | Equality on `correlation_id`, `subject`, `message_id`, `session_id`, `reply_to`, `to`, `content_type` and application properties (all must match) | Most efficient: prefer it whenever an equality test is enough |
| SQL filter | SQL-like expression on application properties and system properties (`sys.` prefix): `AND`, `OR`, `NOT`, comparisons, `LIKE`, `EXISTS`, `IS NULL` | Lowers throughput; can carry an action (`SET priority = 'high'`) |
| Boolean filter | `TrueFilter` (all), `FalseFilter` (none) | `TrueFilter` equals the SQL filter `1=1` |

Several matching rules **without** actions produce one copy in the subscription; each matching rule **with** an action produces its own copy.

```bash
az servicebus topic subscription rule create --resource-group rg-ai \
  --namespace-name contoso-ai --topic-name model-results \
  --subscription-name low-confidence --name below-threshold \
  --filter-sql-expression "confidence < 0.6 AND language = 'fr'"

az servicebus topic subscription rule delete --resource-group rg-ai \
  --namespace-name contoso-ai --topic-name model-results \
  --subscription-name low-confidence --name '$Default'
```

> **Exam tip.** "Route each message to a reviewer queue based on a property, with the least impact on throughput" is a correlation filter. Filters that test the content of the body don't exist: copy the value to an application property when you send.

<!-- section: event-grid-custom | objectives: 3.1.2 -->
## Event Grid topics and custom events

Event Grid pushes events from **topics** to **event subscriptions**, which deliver them to handlers: Azure Functions, webhooks, Service Bus queues and topics, Event Hubs, Storage queues. Delivery is at least once and unordered.

| Topic type | Source |
| --- | --- |
| System topic | Events of an Azure service (Blob Storage, Resource Manager...) |
| Custom topic | Your application publishes its own events to the topic endpoint (`https://...eventgrid.azure.net/api/events`) |
| Namespace topic | Event Grid namespaces: CloudEvents only, push or **pull** delivery where the consumer receives, acknowledges, releases or rejects |

An event in the **CloudEvents 1.0** schema carries `id`, `source`, `type`, `subject`, `time` and `data`; the **Event Grid schema** carries `id`, `topic`, `subject`, `eventType`, `eventTime`, `dataVersion` and `data`. The input schema is chosen when the custom topic is created.

```text
from azure.identity import DefaultAzureCredential
from azure.core.messaging import CloudEvent
from azure.eventgrid import EventGridPublisherClient

client = EventGridPublisherClient(
    "https://eval-events.westeurope-1.eventgrid.azure.net/api/events",
    DefaultAzureCredential(),            # identity holds EventGrid Data Sender
)

client.send([
    CloudEvent(
        source="/contoso/evaluations",
        type="Contoso.Evaluation.Completed",
        subject="/models/claims-classifier/runs/4512",
        data={"runId": 4512, "score": 0.91},
    ),
])
```

| Need | Setting |
| --- | --- |
| Authenticate the publisher | Microsoft Entra ID with **EventGrid Data Sender**, or the topic access key (`AzureKeyCredential`) |
| Event Grid schema instead of CloudEvents | `EventGridEvent(subject=..., event_type=..., data=..., data_version="1.0")` |
| Better throughput | Send a list of events in one call rather than one call per event |
| Webhook handler | Must answer the subscription validation handshake; the Event Grid trigger of Azure Functions does it for you |

> **Exam trap.** Event Grid isn't a queue: it doesn't hold work for a consumer that reads at its own pace (except namespace pull delivery), and it guarantees no order. When the handler needs load leveling, deliver the event to a Service Bus queue and process it from there.

<!-- section: event-grid-filters | objectives: 3.1.2 -->
## Filtering events

An event subscription filters on three levels, combined with AND:

| Filter | Example |
| --- | --- |
| Event types | `includedEventTypes`: only `Microsoft.Storage.BlobCreated` (default: all types of the source) |
| Subject | `subjectBeginsWith` `/blobServices/default/containers/uploads/` and `subjectEndsWith` `.pdf` |
| Advanced filters | Operators on a key of the event: `NumberGreaterThan`, `NumberInRange`, `StringContains`, `StringBeginsWith`, `StringIn`, `BoolEquals`, `IsNotNull`... |

```json
{
  "filter": {
    "includedEventTypes": [ "Contoso.Evaluation.Completed" ],
    "subjectBeginsWith": "/models/claims-classifier/",
    "advancedFilters": [
      { "operatorType": "NumberLessThan", "key": "data.score", "value": 0.8 },
      { "operatorType": "StringIn", "key": "data.region", "values": [ "emea", "apac" ] }
    ]
  }
}
```

Rules to remember:

- Several values in one advanced filter are combined with **OR**; several filters with **AND**.
- Keys use dot notation into `data` (`data.appEventTypeDetail.action`); keys that contain a dot aren't supported. Arrays need `enableAdvancedFilteringOnArrays`.
- String comparisons are case-insensitive. A missing key doesn't match, except for `NumberNotIn` and `StringNotIn`.
- Limits: 25 advanced filters and 25 filter values in total per subscription, 512 characters per string value.
- Design custom subjects as paths (`/models/<model>/runs/<id>`) so subscribers can filter by prefix.

> **Exam tip.** Filter on the event subscription rather than in the handler: events that don't match are never delivered, so you pay for no execution.

<!-- section: event-grid-retries | objectives: 3.1.2 -->
## Retries and dead-lettering in Event Grid

Event Grid waits 30 seconds for a response; 200 to 204 means success. It retries failures with exponential backoff (10 seconds, 30 seconds, 1 minute, 5 minutes... then every 12 hours) until the **retry policy** ends:

| Setting | Range | Default |
| --- | --- | --- |
| Maximum delivery attempts | 1–30 | 30 |
| Event time to live | 1–1,440 minutes | 1,440 (24 hours) |

Whichever limit is reached first ends delivery. Some responses aren't retried: 400 (bad request), 403 (forbidden) and 413 (payload too large) for every endpoint, plus 401 for webhooks (a 401 from an Azure resource endpoint is retried after 5 minutes or more); 400 and 413 dead-letter the event immediately. Dead-lettering is **off by default**: without it, undeliverable events are dropped. Enable it with a blob container: the event reaches it 5 minutes after the last attempt, and is dropped if the container stays unavailable for 4 hours. The dead-letter event adds `deadLetterReason`, `deliveryAttempts` and `lastDeliveryOutcome`.

```bash
az eventgrid event-subscription create --name low-scores \
  --source-resource-id "$TOPIC_ID" \
  --endpoint-type servicebusqueue --endpoint "$QUEUE_ID" \
  --included-event-types Contoso.Evaluation.Completed \
  --advanced-filter data.score NumberLessThan 0.8 \
  --max-delivery-attempts 10 --event-ttl 120 \
  --deadletter-endpoint "$STORAGE_ID/blobServices/default/containers/eg-deadletter"
```

Batching (off by default) groups up to 5,000 events per request; a batch succeeds or fails as a whole, so request only what the handler processes within 30 seconds.

| Requirement | Service |
| --- | --- |
| A command that must be processed once, with retries under your control and a dead-letter queue | Service Bus queue |
| The same message to several consumers with property filters | Service Bus topic |
| React to a state change, fan out to handlers, pay per event | Event Grid |
| React to an event, then process it with load leveling | Event Grid subscription that delivers to a Service Bus queue |

> **Exam trap.** A 30-minute TTL with 30 attempts doesn't give 30 attempts: the backoff reaches only about six attempts in 30 minutes, then the event is dead-lettered or dropped.

<!-- section: key-points -->
## Key points

- Queue: one receiver per message. Topic: a copy per matching subscription. Standard or Premium for topics, sessions and duplicate detection.
- Peek-lock (default) is at least once: `complete`, `abandon`, `dead_letter`, `defer`; lock 1 minute by default, 5 at most, renew for long work; idempotent handlers.
- DLQ per queue and per subscription; `MaxDeliveryCountExceeded` after 10 deliveries by default; read it with `sub_queue=ServiceBusSubQueue.DEAD_LETTER` and resubmit a new message.
- `$Default` accepts everything until removed; correlation filters are the cheapest; filters read properties, never the body.
- Event Grid: custom topics, CloudEvents or Event Grid schema, EventGrid Data Sender, at least once, no order.
- Filters: event types, subject prefix or suffix, advanced filters (values OR, filters AND, 25 limit).
- Retries: 30 attempts and 24 hours by default, first limit wins; dead-lettering to a blob container is off by default.
