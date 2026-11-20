At professional level, an event-driven design is judged on its guarantees, not on its boxes. SAP-C03 scenarios describe accounts or Regions exchanging events, a pipeline that must not lose or double-count records, or a long process that must survive failures, and ask which combination of messaging service, state store and orchestrator meets the ordering, delivery and durability constraints with the stated qualifier.

<!-- section: messaging-guarantees | objectives: 1.1.1 -->
## Messaging patterns: ordering, delivery and idempotency

Read the stem for three properties: may a message arrive twice, must order be kept, and how many consumers need a copy.

| Service | Delivery | Ordering | Consumers | Replay |
| --- | --- | --- | --- | --- |
| SQS standard queue | At least once, occasional duplicates | Best effort | One consumer group per queue | No |
| SQS FIFO queue | Exactly-once processing: duplicates removed within a 5-minute deduplication interval | Strict within a message group ID | One consumer group; one in-flight batch per message group | No |
| SNS standard topic | Push to every subscription, retried per protocol | None | Many (fan-out) | No |
| SNS FIFO topic | Deduplicated, ordered fan-out to SQS queues | Strict per message group | Many | No |
| EventBridge event bus | At least once to each matching target, retried for up to 24 hours and 185 attempts by default | None | Up to 5 targets per rule, many rules | Archive and replay |
| Kinesis Data Streams | At least once (producer and consumer retries can duplicate) | Strict within a shard, so per partition key | Many independent consumers | Yes, within retention (24 hours default, up to 365 days) |

Ordering is always scoped. In an SQS FIFO queue, the **message group ID** is both the ordering unit and the unit of parallelism: use the customer or account ID, never a constant. SQS hashes it to a partition, and each partition supports up to 300 operations per second, or 3,000 messages per second with batching, so high throughput mode needs many distinct group IDs. Deduplication uses content-based deduplication (a SHA-256 hash of the body) or an explicit `MessageDeduplicationId`.

In Kinesis Data Streams, the **partition key** is MD5-hashed to a shard. A shard accepts up to 1 MB or 1,000 records per second for writes and serves 2 MB per second of reads shared by standard consumers; enhanced fan-out gives each registered consumer its own 2 MB per second per shard. A low-cardinality key (country code) creates a hot shard; a high-cardinality key (device ID, order ID) spreads load and keeps per-entity order.

**Idempotency** is required wherever delivery is at least once: SQS standard, SNS, EventBridge, Kinesis and every Lambda event source mapping. The standard pattern is an idempotency key carried in the message (order ID plus event type) and a conditional write that fails if the key was already processed:

```bash
aws dynamodb put-item \
  --table-name processed-events \
  --item '{"eventId": {"S": "order-8841#payment"}, "expiresAt": {"N": "1767225600"}}' \
  --condition-expression "attribute_not_exists(eventId)"
```

A `ConditionalCheckFailedException` means "already done": acknowledge and skip; a TTL attribute purges old keys. Powertools for AWS Lambda implements this pattern with DynamoDB.

> **Exam trap.** An SQS FIFO queue doesn't make a non-idempotent consumer safe. It removes duplicate sends within 5 minutes, but a consumer that times out after charging a card and before deleting the message sees it again. "Never charge twice" still needs an idempotency key.

<!-- section: externalized-state | objectives: 1.1.2 -->
## Stateless compute with externalized state

A stateless component keeps nothing that another instance would need: any execution environment, task or instance can serve any request, be replaced at any time and scale to zero. State moves to a managed store chosen by access pattern:

| State | Store | Features that matter |
| --- | --- | --- |
| Sessions, shopping carts, tokens, rate-limit counters | Amazon ElastiCache (Valkey, Redis OSS) or DynamoDB with TTL | Sub-millisecond reads, expiry, atomic increments; DynamoDB when durability and multi-Region (global tables) matter more than latency |
| Business entities and their versions | DynamoDB | Conditional writes for optimistic locking, transactions across items, Streams to emit changes as events |
| Large payloads, files, intermediate results | Amazon S3 | Pass an S3 pointer instead of the payload when a message or state limit is reached; conditional writes prevent overwrites |
| Progress of a multi-step process | AWS Step Functions or Lambda durable functions | The service checkpoints each step; no custom status table |

Design consequences:

- **Claim check.** Step Functions limits state input and output to 256 KiB, SQS messages to 1 MiB and asynchronous Lambda payloads to 1 MB: store the body in S3 and pass its key.
- **Optimistic concurrency.** Writers updating the same record use a version attribute and a condition expression on it; the loser retries with fresh data.
- **Local storage is only a cache.** Lambda `/tmp` and container ephemeral storage disappear with the environment.
- **Multi-Region stateless tiers** need a multi-Region store, such as DynamoDB global tables.

> **Exam trap.** Sticky sessions on a load balancer and an in-memory cache in each instance make a tier stateful. When a stem says instances are replaced by Auto Scaling or Spot interruptions and users lose their carts, the fix is to move the state to ElastiCache or DynamoDB, not to lengthen stickiness.

<!-- section: serverless-pipelines | objectives: 1.1.3 -->
## Serverless data processing and analytics pipelines

Each stage of a serverless analytics pipeline has a managed answer:

```text
Ingest      Kinesis Data Streams (ordered, replayable)  |  Amazon Data Firehose (buffered delivery)
Process     Lambda event source mapping  |  Firehose transformation  |  AWS Glue streaming or batch ETL
Store       Amazon S3: partitioned Parquet or Apache Iceberg tables
Catalog     AWS Glue Data Catalog (crawlers or table definitions)
Query       Amazon Athena (pay per data scanned)  |  Amazon Quick dashboards
```

**Kinesis Data Streams** has an on-demand capacity mode (shards managed for you) and a provisioned mode (you size shards). Its data delivery feature writes records to Apache Iceberg streaming tables on Amazon S3 Tables or to S3 buckets with no consumer application.

**Lambda as a stream consumer** processes each shard in order, batch by batch:

| Requirement | Event source mapping setting |
| --- | --- |
| Keep up with a growing `IteratorAge` without adding shards | `ParallelizationFactor` from 1 to 10 concurrent batches per shard; order is still kept per partition key |
| Fewer, larger invocations | Batching window up to 5 minutes (payload up to 6 MB) |
| One bad record must not block the shard | `BisectBatchOnFunctionError`, `MaximumRetryAttempts`, `MaximumRecordAgeInSeconds`, an on-failure destination (SQS or SNS), and partial batch responses (`ReportBatchItemFailures`) |
| Consumer must not share read throughput with others | Enhanced fan-out consumer |
| Aggregations over a time window | Tumbling windows |

**Amazon Data Firehose** buffers records and delivers them to S3, Redshift, OpenSearch Service, Iceberg tables and HTTP endpoints. It converts JSON to Parquet or ORC with a Glue table schema, and **dynamic partitioning** writes records to S3 prefixes built from keys in the data (`customer_id`), so Athena scans less.

**AWS Glue** runs serverless Spark and Python ETL jobs, streaming jobs and crawlers; job bookmarks process only new data. **Athena** cost and speed depend on bytes scanned: columnar formats, compression, partitioning (partition projection for highly partitioned tables) and Iceberg tables (ACID updates, time travel). Workgroups enforce data-scanned limits and separate costs per team.

> **Exam tip.** "Near-real-time delivery to S3 with format conversion and no code" is Firehose. "Several applications read and replay the same ordered stream" is Kinesis Data Streams. "Ad hoc SQL on S3 with the LEAST operational overhead" is Athena over the Glue Data Catalog.

<!-- section: durable-workflows | objectives: 1.1.4 -->
## Multi-step workflows with durable execution

A durable workflow records its progress so that a crash or a timeout resumes it instead of restarting it. AWS offers two models.

**AWS Step Functions** runs state machines defined in Amazon States Language, outside your code:

| | Standard workflow | Express workflow |
| --- | --- | --- |
| Maximum duration | 1 year | 5 minutes |
| Execution semantics | Exactly-once | At-least-once (asynchronous), at-most-once (synchronous) |
| Pricing | Per state transition | Per execution, duration and memory |
| `.sync` and `.waitForTaskToken` | Supported | Not supported |
| Distributed Map, activities, redrive | Supported (redrive within 14 days) | Not supported |
| Execution history | Up to 25,000 events, kept 90 days | CloudWatch Logs only |

Professional-level patterns:

- **Saga.** Each step has a compensating step (refund, release stock) reached through `Catch`; the state machine owns the rollback.
- **Callback.** `.waitForTaskToken` pauses a Standard execution until `SendTaskSuccess` or `SendTaskFailure` returns the token (human approval, partner system).
- **Fan-out.** Distributed Map runs up to 10,000 parallel child executions over S3 objects.
- **Cross-account steps.** A `Task` state assumes a role in another account whose trust policy names the state machine. Cross-Region SDK integrations aren't available: reach another Region through an event bus or an API.

**Lambda durable functions** keep the workflow inside function code. A durable execution checkpoints each durable operation (step, wait, callback, invoke, parallel, map); after a wait or an interruption the function replays from the start, skipping completed steps and reusing their results. Executions can run for up to one year, and waits incur no compute charge. Rules to remember:

- Durable execution is enabled only at function creation, with an execution timeout and a retention period.
- Invoke a published version or an alias so that replays run the same code; synchronous invocation fits executions that finish within 30 minutes.
- Code outside steps runs again on every replay: keep it deterministic and put side effects in steps.
- Lambda doesn't retry a failed durable execution: configure a DLQ and alarm on FAILED, STOPPED and TIMED_OUT.

```bash
aws lambda create-function \
  --function-name order-fulfilment \
  --runtime nodejs22.x \
  --role arn:aws:iam::111122223333:role/order-fulfilment-durable \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --durable-config '{"ExecutionTimeout": 86400, "RetentionPeriodInDays": 14}'
```

| Requirement | Choose |
| --- | --- |
| Visual workflow across many AWS services, auditors read the execution graph | Step Functions Standard |
| Very high volume of short event transformations | Step Functions Express |
| Developers want the workflow in Python, TypeScript or Java next to business logic, with waits of days | Lambda durable functions |
| Process millions of S3 objects in parallel | Step Functions Distributed Map |

> **Exam trap.** A single Lambda function, even with the current 30-minute maximum timeout, isn't a durable workflow: if it fails at minute 20, the work restarts from zero. "Survive interruptions and wait for days" means Step Functions Standard or durable functions.

<!-- section: cross-account-events | objectives: 1.1.5 -->
## Cross-account and cross-Region event routing

Organizations centralize events (security findings, business events) in a hub account, or distribute them from producers to consumer accounts. EventBridge offers these building blocks.

**Bus to bus.** The receiving bus has a resource-based policy allowing `events:PutEvents` from accounts or the organization; a rule on the sending bus targets the receiving bus ARN; rules on the receiving bus route events locally. Event bus targets created after March 2, 2023 need an IAM role in the sender account, which is also the account charged.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowOrgAccountsToPutEvents",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "events:PutEvents",
    "Resource": "arn:aws:events:eu-west-1:111122223333:event-bus/central-events",
    "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
  }]
}
```

**Direct cross-account targets.** A rule can deliver straight to an SQS queue, SNS topic, Lambda function, Kinesis data stream or API Gateway API in another account **in the same Region**. It needs an execution role in the bus account (its SCPs apply) and a resource-based policy on the target.

**Cross-Region.** A rule can target an event bus in another Region, in the same or another account, with the same bus-to-bus permissions.

**Global endpoints** add Regional fault tolerance for producers: `PutEvents` goes to an endpoint backed by a custom bus with the same name in a primary and a secondary Region, and a Route 53 health check fails custom events over to the secondary Region. AWS documents an RTO and RPO of 360 seconds, at most 420 seconds, with its prescriptive alarm. Event replication is required for automatic recovery to the primary Region.

| Requirement | Design |
| --- | --- |
| All member accounts send GuardDuty and Config events to a security account | Rule in each account targeting a central bus whose policy uses `aws:PrincipalOrgID` |
| Deliver order events from a producer account to a queue owned by a consumer team, same Region, fewest components | Direct cross-account SQS target with an execution role and a queue policy |
| Producers must keep publishing during a Regional outage | EventBridge global endpoint with replication |

> **Exam trap.** Cross-account forwarding is not transitive. If account B receives events from account A and has a rule that forwards them to account C, the events don't reach C. Send them from A to C directly, or have A target a central bus that C reads.

<!-- section: websocket-realtime | objectives: 1.1.12 -->
## Real-time updates with WebSocket and publish/subscribe

When clients need server-pushed updates (live dashboards, chat, bidding), polling a REST API wastes requests and adds latency. An **API Gateway WebSocket API** keeps a persistent two-way connection and routes each JSON message by a route selection expression, usually `$request.body.action`:

| Route | Invoked when |
| --- | --- |
| `$connect` | A client opens a connection; authorization (IAM or a Lambda authorizer) runs here and protects every other route |
| `$disconnect` | The connection closes (best effort) |
| Custom route (for example `subscribe`) | The route selection expression matches its route key |
| `$default` | No route matches, or the message isn't JSON |

The backend stays stateless: the `$connect` integration stores the connection ID (with user and topics) in DynamoDB, and any producer pushes data with the `@connections` API, signed with SigV4 and allowed by `execute-api:ManageConnections`:

```text
POST   https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/@connections/{connection_id}   send a message
GET    .../@connections/{connection_id}                                                          connection status
DELETE .../@connections/{connection_id}                                                          disconnect the client
```

A `GoneException` means the client has left: delete its connection item.

For publish/subscribe fan-out, a producer publishes an event (EventBridge, SNS or DynamoDB Streams); a Lambda function looks up the subscribed connection IDs in DynamoDB and posts to each. Producers never know about connections.

WebSocket quotas that shape designs:

| Quota | Value |
| --- | --- |
| Connection duration | 2 hours (clients must reconnect) |
| Idle connection timeout | 10 minutes (send heartbeats) |
| Message payload | 128 KB, sent in frames of 32 KB at most |
| New connections per second per account per Region | 500 by default (adjustable); no concurrent connection quota |

> **Exam tip.** "Push updates to thousands of browsers without managing servers" means an API Gateway WebSocket API with connection IDs in DynamoDB. An Application Load Balancer also passes WebSocket traffic, but you then run the connection servers yourself.

<!-- section: key-points -->
## Key points

- Know each service's promise: SQS standard and EventBridge are at least once and unordered; SQS FIFO orders per message group with 5-minute deduplication; Kinesis orders per shard (partition key) and replays.
- Choose high-cardinality message group IDs and partition keys; make every at-least-once consumer idempotent with a DynamoDB conditional write.
- Stateless compute keeps sessions in ElastiCache or DynamoDB, payloads in S3 (claim check), and workflow progress in Step Functions or durable functions.
- Pipelines: Kinesis or Firehose to partitioned Parquet or Iceberg on S3, Glue Data Catalog, Athena; tune Lambda stream consumers with parallelization factor, bisect, destinations and partial batch responses.
- Step Functions Standard (1 year, exactly-once, callbacks, Distributed Map) vs Express (5 minutes, high volume); Lambda durable functions checkpoint and replay code for up to one year.
- EventBridge: bus-to-bus with a resource policy and a role, direct cross-account targets in the same Region, cross-Region bus targets, global endpoints for Regional failover; forwarding isn't transitive.
- WebSocket APIs: `$connect` authorization, connection IDs in DynamoDB, `@connections` to push, 2-hour connections and 10-minute idle timeout.
