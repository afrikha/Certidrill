# QZ-ai-200-31-messaging-events — notes

Quiz `content/ai-200/quizzes/31-messaging-events.yaml`: 10 questions (3.1.1 × 5, 3.1.2 × 5). Types: single 5, dropdown 1, dragdrop 1, yesno_statements 1, multi 2. Checker: `0 problem(s), 0 warning(s)`.

## Sources fetched (2026-11-24)

Azure Event Grid Delivery and Retry Explained; Event Filtering in Azure Event Grid; Service Bus Dead-Letter Queues; Azure Service Bus Topic Filters Overview; Azure Service Bus duplicate message detection; Message Transfers, Locks, and Settlement; `az servicebus queue` (CLI reference); Azure Service Bus client library for Python (version 7.15.0).

## Chapter vs current Learn (to fix in the chapter, not done here)

- **Role name**: the chapter writes "Event Grid Data Sender" (in the EN and FR tables and in a code comment). The mock-exam bank uses the Azure role name **EventGrid Data Sender**, with no space. I didn't fetch the RBAC page in this task, so check it before you correct the chapter.
- **401 responses**: the delivery page contradicts itself. One table says 401 isn't retried for webhooks only. The status-code table says 401 to an Azure resource endpoint is "Retry after 5 minutes or more". The chapter follows the first table. The quiz doesn't test 401.
- Details from the delivery page that the chapter doesn't have (none is required): dead-lettering waits 5 minutes after the last attempt; an event is dropped if the dead-letter location stays unavailable for 4 hours; the TTL is checked only at the next scheduled attempt; duplicates can still occur even when the endpoint answers within 3 minutes; Event Grid delays deliveries to endpoints that keep failing.
- The DLQ page also lists the reason `HeaderSizeExceeded`, which the chapter's reason table doesn't have. It also says that deferred messages aren't moved to the DLQ when they expire.
- The chapter says that duplicate detection "is chosen when the queue or subscription is created". The duplicate detection page doesn't say this, and Q5 doesn't rely on it.

## Facts not verified on a fetched page, or derived

- Q10: you can't express an OR across two different keys in one event subscription. Learn documents only OR between the values of one filter and AND between filters, so two subscriptions are needed. An event that matches both is delivered once per subscription ("at least once for each matching subscription" — verified).
- Q7: using FalseFilter to pause a subscription is derived from "FalseFilter selects none". A SQL filter `1=1` with an action that selects every message and adds a property is derived from the chapter (TrueFilter = `1=1`; actions on SQL filters). A correlation filter on `subject`: Learn lists the property as `Label`, and the SDK calls it `subject`.
- Q8 s1: Event Grid's delivery ends when Service Bus accepts the event. This is derived from the list of success codes. Learn doesn't explicitly cover the Service Bus endpoint case.
- Q6: the ISO 8601 values `PT1M` / `PT4M` / `PT10M`. The CLI page asks for an ISO 8601 timespan and gives a maximum of 5 minutes, but no example value.
- Q3: the exact signature `get_subscription_receiver(topic_name=..., subscription_name=..., sub_queue=ServiceBusSubQueue.DEAD_LETTER)`. The Python readme says that `get_<queue|subscription>_receiver` accepts `sub_queue=ServiceBusSubQueue.DEAD_LETTER`, but it only links to a sample.

## Design notes

- The mock bank already covers almost every decision in the chapter (about 50 questions). The quiz uses other decisions and combinations:
  - default MaxDeliveryCount;
  - a 400 response that is dead-lettered at once;
  - the DLQ of a subscription;
  - filtering on the subscription versus in the handler;
  - an idempotent consumer versus duplicate detection (the opposite of `ai200-3a-duplicate-sends`);
  - queue creation flags;
  - a filter type for each requirement;
  - the Event Grid → Service Bus chain;
  - sizing a batch to 30 seconds plus idempotency;
  - OR across keys.
- Q4 and Q10 both use `StringIn`, but they test different decisions: where to filter, and how to combine conditions.
- Q1 uses `shuffle: false` (ascending values, with "Never" last).
