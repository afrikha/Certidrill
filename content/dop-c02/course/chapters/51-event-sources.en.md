Incident response starts with an event: AWS announces a scheduled maintenance, someone changes a security group, a deployment fails, a finding is raised. This chapter maps the services that generate and carry those events, the architectures that distribute them (fan-out, streaming, queuing), how to bring events from every account and Region to one place, and how to build processing workflows with SQS, SNS, Kinesis, Lambda and Step Functions that retry, keep order where needed and never lose a failed event.

<!-- section: event-generating-services | objectives: 5.1.1 -->
## Services that generate, capture and process events

| Service | Role | Events to know |
| --- | --- | --- |
| **AWS Health** | Generates events about AWS itself as it affects you | Source `aws.health`, detail-type `AWS Health Event`; categories `issue`, `scheduledChange`, `accountNotification`; account-specific events (your instances, your certificates) and public events (a service issue in a Region) |
| **Amazon EventBridge** | Captures, routes and processes events | **Default bus** receives AWS service events; **custom buses** for your applications; partner buses for SaaS; archive and replay; schema registry; Pipes; Scheduler |
| **AWS CloudTrail** | Captures API activity | `AWS API Call via CloudTrail`, `AWS Console Signin via CloudTrail`, Insights events; sent to the default bus only when a trail is logging |
| AWS Config | Configuration and compliance changes | `Configuration Item Change Notification`, `Config Rules Compliance Change` |
| Security services | Findings | GuardDuty, Amazon Inspector (`aws.inspector2`), AWS Security Hub, Macie |
| Developer tools | Pipeline and deployment state | `CodePipeline Pipeline Execution State Change`, `CodeBuild Build State Change`, `CodeDeploy Deployment State-change Notification` |
| Compute and storage | Resource state | `EC2 Instance State-change Notification`, `EC2 Instance Launch Successful` (Auto Scaling), S3 `Object Created` (when EventBridge is enabled on the bucket), `CloudWatch Alarm State Change` |

Every event has the same envelope: `version`, `id`, `detail-type`, `source`, `account`, `time`, `region`, `resources` and a service-specific `detail`. Patterns match on these fields.

```json
{
  "source": ["aws.health"],
  "detail-type": ["AWS Health Event"],
  "detail": {
    "service": ["EC2"],
    "eventTypeCategory": ["scheduledChange"]
  }
}
```

AWS Health also offers the **AWS Health Dashboard** (account and organization views) and the AWS Health API (`DescribeEvents`, `DescribeAffectedEntities`, and the organization variants). Events stay visible for 90 days.

> **Exam trap.** The AWS Health Dashboard shows events but doesn't act. "Automatically stop and start instances scheduled for retirement" or "open a ticket for every scheduled change" requires an EventBridge rule on `aws.health` with a target (a Systems Manager Automation runbook, Lambda, SNS), not polling the Health API from a cron job.

<!-- section: event-driven-architectures | objectives: 5.1.2 -->
## Event-driven architectures: fan-out, streaming and queuing

| Pattern | Services | Properties | Choose it when |
| --- | --- | --- | --- |
| **Fan-out** (publish/subscribe) | SNS topic → several SQS queues or Lambda functions; EventBridge bus with several rules | Each subscriber gets its own copy; subscribers are independent and added without changing the producer | One event, several independent processes (billing, shipping, analytics) |
| **Event streaming** | Kinesis Data Streams, DynamoDB Streams, Amazon MSK | Ordered records per shard (partition key), retained and **replayable**, several consumers read the same data | Ordered processing, real-time analytics, reprocessing history |
| **Queuing** (point to point) | SQS standard or FIFO | Messages buffered until a consumer deletes them; consumers scale on backlog; dead-letter queue | Decoupling, load leveling, retries for one consumer group |

Key behaviours:

- **SNS + SQS fan-out**: each queue's policy must allow the topic (`sns.amazonaws.com` with `aws:SourceArn`); enable **raw message delivery** to receive the original payload. **Subscription filter policies** (on message attributes or the payload) send each subscriber only what it needs. An SNS FIFO topic with FIFO queues keeps order in a fan-out.
- **SQS standard**: at-least-once, best-effort order, near-unlimited throughput. **SQS FIFO**: order per **message group ID**, deduplication over a 5-minute interval. Visibility timeout default 30 seconds (maximum 12 hours); retention 4 days by default, up to 14 days. A **redrive policy** moves a message to the dead-letter queue after `maxReceiveCount` receives; **DLQ redrive** sends it back once fixed.
- **Kinesis Data Streams**: records with the same partition key go to the same shard and are read in order; the data stays until retention expires, so a new consumer can reprocess it.

> **Exam trap.** SQS isn't a broadcast: a message read and deleted by one consumer is gone for the others. "Several teams must each receive every order event" is fan-out (SNS or EventBridge to one queue per team), not several consumers polling one queue.

> **Exam tip.** "Ordered per customer" → FIFO with the customer ID as message group ID, or Kinesis with the customer ID as partition key. "Replay last week's events" → Kinesis retention or an EventBridge **archive** with **replay**; SQS can't replay deleted messages.

<!-- section: integrating-event-sources | objectives: 5.1.3 -->
## Integrating event sources across accounts and Regions

**Cross-account event buses.** The usual design sends events from every workload account to a central bus in an operations or security account:

1. The central bus has a **resource-based policy** allowing `events:PutEvents` from the organization.
2. In each account, a rule on the default bus matches the events to forward and targets the central bus ARN. New cross-account bus targets (created after March 2, 2023) need an **IAM role** that allows `events:PutEvents` on the target bus; the console creates it.
3. Central rules match on `account` as well as `source` and route to SNS, a ticketing integration or automation.
4. Deploy the forwarding rules to every account and Region with **CloudFormation StackSets** (service-managed, automatic deployment to new accounts).

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowOrgPutEvents",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "events:PutEvents",
    "Resource": "arn:aws:events:us-east-1:999988887777:event-bus/central-ops",
    "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
  }]
}
```

A rule can also target a bus in another Region (in the supported destination Regions) to centralize events from several Regions. Cross-account events are billed to the sending account.

**Source-specific integration rules:**

| Source | Integration detail |
| --- | --- |
| AWS Health | A rule in **each Region** where you have resources; **global** events (IAM, for example) arrive in US East (N. Virginia), so a rule there is mandatory. Events are also sent to a backup Region (US West (Oregon) for the others): de-duplicate on `communicationId` if you add backup rules |
| AWS Health, organization-wide | Enable **organizational view** and register a **delegated administrator**: EventBridge rules in that account receive one feed of Health events for all accounts |
| CloudTrail | An **organization trail** for logging, but API call events reach EventBridge on each account's default bus: forward them to the central bus. Read-only calls need `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` on both the forwarding rule and the central rule |
| Security findings | Aggregate with the delegated administrator of GuardDuty, Inspector or Security Hub, and match findings on the aggregation account's bus |
| SaaS and custom applications | Partner event sources, or `PutEvents` to a custom bus; describe payloads in the **schema registry** (schema discovery generates code bindings) |

> **Exam trap.** An EventBridge rule only sees events of its own account and Region. A single rule in the management account doesn't receive member accounts' CloudTrail or Health events unless they are forwarded to it (or, for Health, organizational view with a delegated administrator is used).

<!-- section: event-processing-workflows | objectives: 5.1.4 -->
## Building event processing workflows

| Requirement | Building block |
| --- | --- |
| Process each message of a queue with retries and buffering | SQS → Lambda **event source mapping** |
| Process a stream in order, shard by shard | Kinesis or DynamoDB Streams → Lambda event source mapping |
| Notify many subscribers or fan out | SNS (filter policies) or EventBridge rules |
| Multi-step process with branching, waits, human approval, error handling | **AWS Step Functions** |
| Point-to-point integration from a queue or stream to a target, with filtering and enrichment but no glue code | **EventBridge Pipes** (sources: SQS, Kinesis, DynamoDB Streams, Amazon MQ, Amazon MSK, self-managed Kafka) |
| Run a task at a time or rate | EventBridge Scheduler |

**Lambda event source mappings** (Lambda polls the source):

| Setting | SQS | Kinesis and DynamoDB Streams |
| --- | --- | --- |
| Batch size and batching window | Yes | Yes |
| Partial failures | `ReportBatchItemFailures`: only the failed messages return to the queue | `ReportBatchItemFailures` returns the failed sequence number; **bisect batch on function error** splits the batch |
| Retries and discard | Queue redrive policy to a dead-letter queue | `MaximumRetryAttempts`, `MaximumRecordAgeInSeconds`, **on-failure destination** (for example an SQS queue or SNS topic) |
| Throughput | Lambda scales pollers on backlog; maximum concurrency per mapping | **Parallelization factor** (1–10 concurrent batches per shard), enhanced fan-out |
| Filtering | Filter criteria on the mapping (filtered-out records are dropped) | Same |

Set the SQS visibility timeout to several times the function timeout (AWS recommends at least six), or messages become visible again while still being processed and are handled twice.

**Step Functions** workflows:

| | Standard | Express |
| --- | --- | --- |
| Duration | Up to 1 year | Up to 5 minutes |
| Execution semantics | Exactly once | At least once (asynchronous) or at most once (synchronous) |
| Use | Long, auditable processes, human approval, callbacks | High-volume, short event processing |

Integration patterns: request-response, **run a job** (`.sync`, waits for a CodeBuild build, an ECS task or a Glue job to finish) and **wait for callback** (`.waitForTaskToken`, pauses until an external system calls `SendTaskSuccess` or `SendTaskFailure`). **Map** and **Distributed Map** process items in parallel (Distributed Map reads large datasets from S3).

```json
{
  "StartAt": "Isolate",
  "States": {
    "Isolate": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:ec2:modifyInstanceAttribute",
      "Parameters": { "InstanceId.$": "$.detail.resource.instanceDetails.instanceId", "Groups": ["sg-0a1b2c3d4e5f67890"] },
      "Retry": [{ "ErrorEquals": ["States.ALL"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }],
      "Next": "Snapshot"
    },
    "Snapshot": { "Type": "Pass", "End": true },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": { "TopicArn": "arn:aws:sns:us-east-1:111122223333:secops", "Message.$": "States.JsonToString($)" },
      "End": true
    }
  }
}
```

> **Exam trap.** Chaining Lambda functions that call each other, or one function that sleeps while waiting for an approval, is the wrong answer when Step Functions is available: Step Functions adds retries, catch, waits and callbacks without paying for idle compute, and shows each execution's history.

> **Exam tip.** For a GuardDuty finding that must trigger isolation, snapshot and notification in order with retries, the managed design is an EventBridge rule → Step Functions state machine. For one action (notify a topic), an EventBridge rule with an SNS target is enough.

<!-- section: key-points -->
## Key points

- Event producers: AWS Health (`aws.health`), CloudTrail API calls (need a trail), Config, security findings, CodePipeline and other service state changes, all on the default bus.
- Fan-out = SNS or EventBridge; streaming = Kinesis or DynamoDB Streams (ordered, replayable); queuing = SQS (buffer, DLQ, redrive).
- Central operations: forward from each account's default bus to a central bus (resource policy with `aws:PrincipalOrgID`, IAM role on the sending target), deployed with StackSets.
- AWS Health: one rule per Region plus US East (N. Virginia) for global events; organizational view with a delegated administrator for one organization-wide feed.
- Workflows: Lambda event source mappings with partial batch responses, bisect and on-failure destinations; Step Functions Standard or Express with Retry, Catch, `.sync` and `.waitForTaskToken`; EventBridge Pipes for point-to-point without code.
