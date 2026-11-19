A loosely coupled architecture lets each component fail, scale and change without breaking the others. SAA-C03 questions describe a tightly coupled design (a web tier calling a slow back end directly, a monolith that loses orders under load) and ask which AWS service puts a buffer, a contract or an orchestrator between the parts: APIs, load balancers, queues, topics, events or workflows.

<!-- section: coupling-principles | objectives: 2.1.4, 2.1.19 -->
## Loose coupling and stateless microservices

Components are **tightly coupled** when one must be available, fast and unchanged for the other to work (a synchronous call that times out, a hard-coded IP address, a shared schema), and **loosely coupled** when an intermediary absorbs the differences:

| Coupling problem | Loose coupling answer |
| --- | --- |
| The consumer is slower than the producer, or goes offline | A queue (Amazon SQS) buffers the work |
| One event must reach several independent consumers | Publish/subscribe (Amazon SNS) or an event bus (Amazon EventBridge) |
| Clients must not know which servers answer | A load balancer or an API (ALB, API Gateway) with a DNS name |
| Several steps must run in order with retries and error handling | A workflow (AWS Step Functions) |

A **microservice** is a small service that owns one business capability, its data and its API, and is deployed independently. Design it **stateless** whenever possible:

| | Stateless | Stateful |
| --- | --- | --- |
| Where state lives | Outside the compute: Amazon DynamoDB, Amazon ElastiCache, Amazon S3, a database | In memory or on the local disk of one instance or container |
| Scaling | Add or remove any instance; any instance can serve any request | New instances don't have the state; removing one loses it |
| Failure | Another instance takes over transparently | Sessions or in-progress work are lost |

> **Exam trap.** "Users are logged out when an instance is terminated by Auto Scaling" is solved by moving session data to ElastiCache or DynamoDB, not by enabling sticky sessions. Sticky sessions keep users on one instance but lose their session when that instance goes away.

<!-- section: multi-tier | objectives: 2.1.9, 2.1.10, 2.1.17 -->
## Multi-tier architectures and load balancing

The classic three-tier design separates presentation, logic and data, each in its own subnets and security groups, each scalable on its own:

```text
Internet
  -> internet-facing Application Load Balancer   (public subnets, 2+ AZs)
  -> web tier: Auto Scaling group                 (private subnets)
  -> internal Application Load Balancer          (private subnets)
  -> application tier: Auto Scaling group         (private subnets)
  -> data tier: Amazon RDS Multi-AZ or Aurora     (private subnets)
```

- Each tier's security group allows traffic only from the security group of the tier in front of it (security group referencing), not from CIDR ranges.
- An **internet-facing** load balancer has public node IP addresses; an **internal** one has only private addresses and is reachable only from the VPC (or connected networks). Both reach their targets over private IP addresses, so targets don't need public IPs.
- When no immediate answer is needed (order placement, image processing), replace the internal load balancer with an SQS queue: the application tier scales on queue depth and nothing is lost when it is slow.

Elastic Load Balancing offers three current load balancer types:

| | Application Load Balancer | Network Load Balancer | Gateway Load Balancer |
| --- | --- | --- | --- |
| OSI layer | 7 (HTTP, HTTPS, gRPC) | 4 (TCP, UDP, TLS, QUIC) | 3 (IP packets, GENEVE) |
| Routing | Path, host, HTTP headers, method, query string, source IP | Flow hash; a TCP connection stays on one target | 5-tuple flow hash to a fleet of virtual appliances |
| Targets | Instances, IP addresses, Lambda functions, containers | Instances, IP addresses, an ALB | Appliance instances or IP addresses |
| Static IP | No (use a DNS name) | One static IP per AZ, optional Elastic IP | No |
| Cross-zone load balancing default | On (can be turned off per target group) | Off | Off |

> **Exam tip.** "Route /api to one service and /images to another behind one endpoint" or "authenticate users before they reach the application" means ALB. "Clients must allow-list fixed IP addresses" or "UDP" means NLB. "Insert third-party firewall appliances transparently" means GWLB.

Clients use one DNS name; health checks remove failed targets and the Auto Scaling group replaces them without any client change. An ALB requires at least two Availability Zones.

<!-- section: api-gateway | objectives: 2.1.1 -->
## Creating and managing APIs with Amazon API Gateway

Amazon API Gateway is a managed front door for APIs (authorization, throttling, monitoring, versioning) in front of Lambda functions, HTTP endpoints, AWS services or private resources through a VPC link. Three API types exist:

| Need | API type |
| --- | --- |
| Full feature set: API keys and usage plans, per-client throttling, caching, AWS WAF, request validation, resource policies, private or edge-optimized endpoints | REST API |
| Simple proxy to Lambda or HTTP back ends at lower price and latency, JWT (OIDC/OAuth 2.0) authorizers | HTTP API |
| Persistent two-way connections (chat, live dashboards) | WebSocket API |

REST API endpoint types:

| Endpoint type | Use when |
| --- | --- |
| Edge-optimized | Clients are spread worldwide; requests enter through the CloudFront network |
| Regional | Clients are in the same Region, or you put your own CloudFront distribution in front |
| Private | The API must be reachable only from VPCs, through an interface VPC endpoint |

Facts the exam relies on:

- **Throttling**: by default 10,000 requests per second per account per Region (steady state, adjustable) with a burst of 5,000 requests (lower defaults in some newer Regions). Usage plans with API keys set per-client rate limits and quotas.
- **Caching** (REST only): a stage-level cache with a default TTL of 300 seconds, from 0 to 3,600 seconds, reduces calls to the back end.
- **Authorization**: IAM (SigV4), Amazon Cognito user pools, Lambda authorizers (custom tokens), JWT authorizers (HTTP API), resource policies (REST).
- **Integration timeout**: 50 ms to 29 seconds by default; it can be raised for Regional and private REST APIs, not for edge-optimized ones. Payload size: 10 MB. Longer work belongs behind an asynchronous pattern: API Gateway integrates directly with SQS or Step Functions, with no Lambda function in between, and returns at once.

> **Exam trap.** API keys identify clients for usage plans; they are not an authorization mechanism. Use IAM, Cognito or a Lambda authorizer to control access.

<!-- section: queues-messaging | objectives: 2.1.2, 2.1.11 -->
## Queues and publish/subscribe: Amazon SQS, Amazon SNS, Amazon MQ

**Point-to-point (queue)**: a producer sends a message, one consumer processes it and deletes it. **Publish/subscribe (topic)**: a publisher sends a message once and every subscriber receives its own copy.

Amazon SQS is a fully managed queue with no broker to run:

| | Standard queue | FIFO queue |
| --- | --- | --- |
| Delivery | At least once (occasional duplicates) | Exactly-once processing (deduplication over a 5-minute interval) |
| Ordering | Best effort | Strict, within each message group ID |
| Throughput | Nearly unlimited | 300 API calls per second per action, 3,000 messages per second with batching; high throughput mode raises this |

SQS settings to know: message size up to 1 MiB; retention from 1 minute to 14 days (default 4 days); **visibility timeout** default 30 seconds, maximum 12 hours (a received message is hidden from other consumers until it is deleted or the timeout expires); **delay queues** and message timers up to 15 minutes; **long polling** with a wait time up to 20 seconds reduces empty responses and cost; a **dead-letter queue** (DLQ) receives messages that failed `maxReceiveCount` times.

```json
{
  "RedrivePolicy": {
    "deadLetterTargetArn": "arn:aws:sqs:eu-west-1:111122223333:orders-dlq",
    "maxReceiveCount": "5"
  }
}
```

With Lambda as the consumer, set the queue's visibility timeout to at least six times the function timeout, use a `maxReceiveCount` of at least 5, and report batch item failures so that only failed messages return to the queue. Make consumers idempotent: delivery is at least once.

Amazon SNS is a managed publish/subscribe service. A **topic** pushes each message to its subscriptions: SQS queues, Lambda functions, HTTP/S endpoints, email, SMS, mobile push and Amazon Data Firehose. A **subscription filter policy** delivers only matching messages to a subscriber, so consumers don't have to discard what they don't need. SNS FIFO topics keep ordering and deduplication and deliver to SQS queues.

The **fan-out** pattern combines both: publish once to an SNS topic, subscribe one SQS queue per consumer. Each consumer gets a durable copy, processes at its own pace and can be added without touching the producer.

```json
{
  "eventType": ["order_placed"],
  "amount": [{ "numeric": [">=", 1000] }]
}
```

Amazon MQ is a managed message broker for **Apache ActiveMQ Classic and RabbitMQ**. Choose it to migrate existing applications that use standard protocols and APIs (JMS, AMQP, MQTT, STOMP, OpenWire) **without rewriting the messaging code**.

> **Exam trap.** SQS doesn't push messages; consumers poll. SNS doesn't store messages for later; a subscriber that is down misses them unless an SQS queue (or a retry policy and DLQ) is subscribed. "Every downstream system must receive the order, even if one is offline" is SNS fan-out to SQS queues, not SNS alone.

<!-- section: event-driven | objectives: 2.1.5, 2.1.17 -->
## Event-driven architectures

Producers emit **events** (facts: "object created", "order placed") without knowing who consumes them; routers deliver them; consumers react. New consumers are added without changing producers.

| Service | Model | Choose it when |
| --- | --- | --- |
| Amazon EventBridge event bus | Router: rules with event patterns send matching events to targets | Routing by event content to many AWS targets, events from AWS services and SaaS partners, archive and replay of events |
| Amazon SNS | Push publish/subscribe | High fan-out to many subscribers with simple attribute filtering, SMS, email, mobile push |
| Amazon SQS | Queue (pull) | Buffering work for one consumer group, load leveling |
| Amazon Kinesis Data Streams | Ordered, replayable stream (shards) | Real-time streaming of high-volume records, ordering per partition key, several consumers reading the same data, replay |
| Amazon S3 Event Notifications | Native event source | React to object creation or deletion (to Lambda, SQS, SNS or EventBridge) |

EventBridge details: a rule matches events by pattern (source, detail type, any field of the event) and sends them to up to 5 targets (Lambda, SQS, SNS, Step Functions, Kinesis, API destinations and more). **EventBridge Scheduler** runs scheduled tasks (cron or one-time) at scale.

Kinesis Data Streams keeps records for 24 hours by default, up to 365 days.

Lambda is the usual consumer. It is invoked in three ways: **synchronously** (API Gateway, ALB), **asynchronously** (S3, SNS, EventBridge: Lambda queues the event, retries twice, then sends it to a failure **destination** or DLQ) and through an **event source mapping** (SQS, Kinesis, DynamoDB Streams: Lambda polls and sends batches).

> **Exam tip.** "Process events from many AWS services and SaaS applications and route them by content" means EventBridge. "Multiple applications must read the same clickstream in order and replay the last 24 hours" means Kinesis Data Streams. "Decouple and buffer" means SQS.

<!-- section: workflow-orchestration | objectives: 2.1.16 -->
## Workflow orchestration with AWS Step Functions

AWS Step Functions runs **state machines** defined in Amazon States Language (JSON). Each state is a step: `Task` (call a Lambda function or another AWS service API directly), `Choice` (branch), `Parallel`, `Map` (iterate; Distributed Map for large datasets in S3), `Wait`, `Pass`, `Succeed`, `Fail`. Retries with exponential backoff and error catching are declared on each state, so the business code doesn't implement them.

```json
{
  "StartAt": "ChargeCard",
  "States": {
    "ChargeCard": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "charge-card", "Payload.$": "$" },
      "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }],
      "Next": "ShipOrder"
    },
    "ShipOrder": { "Type": "Task", "Resource": "arn:aws:states:::sqs:sendMessage", "Parameters": { "QueueUrl": "https://sqs.eu-west-1.amazonaws.com/111122223333/shipping", "MessageBody.$": "$" }, "End": true },
    "NotifyFailure": { "Type": "Task", "Resource": "arn:aws:states:::sns:publish", "Parameters": { "TopicArn": "arn:aws:sns:eu-west-1:111122223333:alerts", "Message.$": "$" }, "End": true }
  }
}
```

| | Standard workflow | Express workflow |
| --- | --- | --- |
| Maximum duration | 1 year | 5 minutes |
| Execution semantics | Exactly-once | At-least-once (asynchronous), at-most-once (synchronous) |
| Priced by | State transitions | Number of executions, duration and memory |
| `.sync` (run a job and wait) and `.waitForTaskToken` (callback) | Supported | Not supported |
| Typical use | Long business processes, human approval, non-idempotent steps (payments) | High-volume, short event processing, streaming data transformation |

The workflow type can't be changed after creation.

> **Exam tip.** "Coordinate several Lambda functions with branching, retries and a manual approval step, with the LEAST operational overhead" means a Step Functions Standard workflow with a callback task token, not Lambda functions calling each other or a custom state table in DynamoDB.

<!-- section: managed-services | objectives: 2.1.2, 2.1.19 -->
## Managed services for common integration needs

Replace self-managed components with a managed service:

| Requirement | Managed service |
| --- | --- |
| Partners upload files over SFTP, FTPS, FTP or AS2, stored in S3 or EFS, without running SFTP servers | AWS Transfer Family (with managed workflows to process uploaded files; web apps for browser-based transfers) |
| Store database credentials and API keys, rotate them automatically, never in code | AWS Secrets Manager |
| Store configuration values and parameters hierarchically at low cost | AWS Systems Manager Parameter Store |

AWS Secrets Manager encrypts secrets with AWS KMS, rotates them on a schedule (managed rotation for supported services, or a Lambda rotation function), and can **replicate a secret to other Regions**; rotation happens in the primary Region and propagates to the replicas, which can be promoted to standalone secrets for disaster recovery.

> **Exam trap.** Parameter Store `SecureString` parameters are encrypted but have no built-in automatic rotation. "Rotate the database password every 30 days automatically" means Secrets Manager.

<!-- section: choosing-integration | objectives: 2.1.17, 2.1.19 -->
## Choosing the decoupling service from the requirement

| Requirement in the stem | Answer |
| --- | --- |
| Orders are lost when the processing tier is overloaded | SQS queue between the tiers; scale consumers on queue depth |
| Process each order exactly once and in order per customer | SQS FIFO queue, message group ID = customer ID |
| One upload must trigger a thumbnail, a virus scan and an index update independently | SNS topic (or EventBridge rule) fanning out to one SQS queue or Lambda function per task |
| React to AWS service events (an EC2 state change, a GuardDuty finding) or SaaS events | EventBridge rule |
| Real-time ingestion of thousands of records per second, ordered, replayable by several consumers | Kinesis Data Streams |
| Multi-step process with retries, branches and long waits | Step Functions Standard |
| Migrate an on-premises ActiveMQ application unchanged | Amazon MQ |
| Long-running request (minutes) behind an API | Asynchronous: API Gateway to SQS or Step Functions, client polls or is notified |

<!-- section: key-points -->
## Key points

- Stateless compute + state in DynamoDB, ElastiCache or S3; sticky sessions don't fix lost sessions.
- ALB for HTTP routing and authentication, NLB for TCP/UDP and static IPs, GWLB for inline appliances; internal load balancers between tiers.
- API Gateway: REST API for the full feature set (usage plans, caching, WAF, private), HTTP API for simple and cheaper, WebSocket for two-way.
- SQS buffers (standard: at least once, FIFO: ordered and exactly-once processing); SNS pushes to many; SNS to SQS fan-out for durable multi-consumer delivery; DLQ for poison messages.
- EventBridge routes events by content from AWS services and SaaS; Kinesis Data Streams for ordered, replayable streams; Amazon MQ for existing broker protocols.
- Step Functions Standard (1 year, exactly-once, callbacks) vs Express (5 minutes, high volume).
- Transfer Family for managed SFTP/FTPS/FTP/AS2; Secrets Manager for rotated secrets.
