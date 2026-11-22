An orchestrator decides what runs, in which order, what happens when a step fails and who is told. Exam questions give you a pipeline (crawl, transform, load, validate, notify) and a constraint: only Glue components, existing Airflow DAGs, serverless only, a human approval, thousands of files in parallel, or an alert within minutes of a failure. This chapter compares the orchestration services, details Step Functions, lists the techniques that make pipelines resilient and covers alerting with Amazon SNS and Amazon SQS.

<!-- section: orchestration-services | objectives: 1.3.1 -->
## Orchestration services for ETL pipelines

| Service | Model | Best fit |
| --- | --- | --- |
| AWS Step Functions | State machine in JSON (Amazon States Language), serverless, optimized integrations with Glue, EMR, Athena, Lambda, Batch, ECS, SNS, SQS, DynamoDB, Bedrock and SDK calls to most AWS APIs | Pipelines made of AWS services, error handling per step, human approvals, large parallel fan-out |
| Amazon MWAA | Managed Apache Airflow: Python DAGs, schedulers and autoscaling workers on Fargate in your VPC, operators for S3, Redshift, EMR, Glue, Lambda, SageMaker AI | Teams with existing Airflow DAGs or operators, complex dependencies, backfills, tasks outside AWS |
| MWAA Serverless | Airflow workflows in YAML or Python DAGs, no environment to manage, billed for task run time | Airflow semantics without sizing an environment |
| AWS Glue workflows | Graph of Glue jobs, crawlers and triggers, with shared run properties | Pipelines made only of Glue jobs and crawlers |
| Amazon EventBridge | Rules on an event bus, Scheduler, Pipes (source, filter, enrichment, target) | Starting workflows on events or schedules, routing; no workflow state |
| AWS Lambda | Code | A single small step, or glue between services; not a workflow engine |

Glue workflows start from one trigger: on a schedule, on demand, or on EventBridge events with a batch size and a batch window of up to 900 seconds. Conditional triggers inside the workflow fire when watched jobs or crawlers reach `SUCCEEDED`, `FAILED`, `TIMEOUT` or `STOPPED` (crawlers: `SUCCEEDED`, `FAILED`, `CANCELLED`), on all or any of them. Keep a workflow at 100 jobs, crawlers and triggers or fewer.

EventBridge Pipes connects one source (SQS, Kinesis, DynamoDB Streams, MSK, self-managed Kafka, Amazon MQ) to one target, with an optional filter and an enrichment step (Lambda, Step Functions Express, API Gateway or an API destination), keeping the source order.

| Requirement | Answer |
| --- | --- |
| Crawl new data, run three Glue jobs in sequence, then crawl the output, with only Glue features | Glue workflow with conditional triggers |
| Migrate 200 existing Airflow DAGs with minimal code changes | Amazon MWAA |
| Run a Glue job, then an EMR step, then an Athena query, wait for each, notify on failure, serverless | Step Functions Standard |
| Start the pipeline when a file lands in S3 | EventBridge rule on Object Created targeting the state machine or Glue workflow |
| Process each new SQS message through a filter and a state machine without code | EventBridge Pipes |

> **Exam trap.** AWS Data Pipeline is closed to new customers. A question that proposes it for a new orchestration has a better answer among Step Functions, MWAA and Glue workflows.

<!-- section: step-functions | objectives: 1.3.1, 1.3.3 -->
## Step Functions for data workflows

| Property | Standard | Express |
| --- | --- | --- |
| Maximum duration | One year | Five minutes |
| Execution semantics | Exactly once | At least once (asynchronous), at most once (synchronous) |
| Pricing | Per state transition | Per execution, duration and memory |
| History | 90 days in the console and API | CloudWatch Logs only, if enabled |
| `.sync` and `.waitForTaskToken` | Yes | No |
| Distributed Map, redrive | Yes | No (Express can run as Distributed Map children) |

Integration patterns are chosen by the resource suffix:

- **Request Response** (no suffix): call the API and move on.
- **Run a Job** (`.sync`): start the job and wait for it to finish, for example `arn:aws:states:::glue:startJobRun.sync`.
- **Wait for Callback** (`.waitForTaskToken`): pass `$$.Task.Token` to an external worker or person, who returns it with `SendTaskSuccess` or `SendTaskFailure`; set `HeartbeatSeconds` to fail stuck tasks.

```json
{
  "StartAt": "TransformOrders",
  "States": {
    "TransformOrders": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": { "JobName": "orders-to-parquet" },
      "Retry": [{
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 60, "MaxAttempts": 2,
        "BackoffRate": 2, "JitterStrategy": "FULL"
      }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }],
      "Next": "RefreshPartitions"
    },
    "RefreshPartitions": {
      "Type": "Task",
      "Resource": "arn:aws:states:::athena:startQueryExecution.sync",
      "Parameters": {
        "QueryString": "MSCK REPAIR TABLE curated.orders",
        "WorkGroup": "etl"
      },
      "End": true
    },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:eu-west-3:111122223333:etl-alerts",
        "Message.$": "States.Format('Orders pipeline failed: {}', $.Cause)"
      },
      "Next": "Failed"
    },
    "Failed": { "Type": "Fail" }
  }
}
```

**Map** states process arrays. Inline mode suits small inputs; **Distributed Map** reads items from S3 (for example a CSV file or object list), runs up to 10,000 child workflows in parallel, batches items, writes results to S3 with `ResultWriter`, and stops when `ToleratedFailurePercentage` or `ToleratedFailureCount` is exceeded. Choose it when the data set exceeds 256 KiB, the history would pass 25,000 events, or you need more than 40 concurrent iterations.

> **Exam tip.** "Wait until the Glue job finishes before loading Redshift, without polling code" is `.sync`. "Pause until a data steward approves the file" is `.waitForTaskToken`, which only Standard workflows support.

<!-- section: resilient-pipelines | objectives: 1.3.2 -->
## Building pipelines for performance, availability and fault tolerance

| Goal | Technique |
| --- | --- |
| Survive transient errors | `Retry` with backoff and jitter in Step Functions, SDK retries, Glue job retries (0 to 10; a timed-out job isn't retried) |
| Contain permanent errors | `Catch` to a cleanup or alert state; dead-letter queues; on-failure destinations; tolerated failure thresholds on Distributed Map |
| Rerun safely | Idempotent steps: deterministic output paths, overwrite of a partition, upserts, idempotency tokens such as the Redshift Data API `ClientToken` derived from the execution ID |
| Resume without redoing work | Step Functions redrive of a failed Standard execution from the failed step (within 14 days); Glue bookmarks; Flink and Glue streaming checkpoints |
| Absorb spikes | SQS or Kinesis between producers and processors; Lambda reserved concurrency and `MaxConcurrency` on Map states to protect downstream systems |
| Scale | Partition the work (Distributed Map, more shards, more Glue workers, auto scaling), avoid single-threaded steps |
| Availability | Regional managed services that span Availability Zones (Step Functions, SQS, SNS, Kinesis, Glue, MWAA); EMR with On-Demand primary and core nodes, Spot only on task nodes |
| Don't lose data | Land raw data in S3 before transforming; keep streams' retention long enough to replay after an outage |
| Jobs blocked by capacity | Glue job run queuing instead of immediate failure; maximum concurrency sized to the workload |

> **Exam trap.** Retries without idempotency turn one failure into duplicates. When a stem says a rerun doubled the rows in Redshift, the fix is an idempotent load (staging table and merge, or delete then insert in one transaction), not more retries.

<!-- section: serverless-workflows | objectives: 1.3.3 -->
## Implementing and maintaining serverless workflows

A serverless pipeline usually chains an event source, a state machine and managed processing steps: S3 Object Created → EventBridge rule → Step Functions → Lambda for validation → Glue for the transformation → Athena or the Redshift Data API → SNS. Nothing runs between executions and nothing needs patching.

Maintaining it means:

- **Deploying as code**: AWS SAM or CloudFormation templates for the state machine, its role, its schedule and its alarms.
- **Observing**: CloudWatch metrics such as `ExecutionsFailed` and `ExecutionsTimedOut` with alarms; CloudWatch Logs for Express workflows, which keep no history in Step Functions.
- **Recovering**: redrive failed Standard executions instead of restarting from the first step.
- **Least privilege**: one IAM role per state machine with only the actions its tasks call; `.sync` Glue tasks need `glue:StartJobRun`, `glue:GetJobRun`, `glue:GetJobRuns` and `glue:BatchStopJobRun`.

```yaml
OrdersPipeline:
  Type: AWS::Serverless::StateMachine
  Properties:
    Type: STANDARD
    DefinitionUri: statemachine/orders.asl.json
    Policies:
      - Statement:
          - Effect: Allow
            Action:
              - glue:StartJobRun
              - glue:GetJobRun
              - glue:GetJobRuns
              - glue:BatchStopJobRun
            Resource: "*"
          - Effect: Allow
            Action: sns:Publish
            Resource: !Ref EtlAlertsTopic
    Events:
      Nightly:
        Type: ScheduleV2
        Properties:
          ScheduleExpression: cron(0 3 * * ? *)
          ScheduleExpressionTimezone: Europe/Paris
```

Choose Express for high-volume, short, idempotent work (for example per-record enrichment called by Pipes or API Gateway) and Standard for anything that waits on jobs, people or callbacks.

<!-- section: notifications | objectives: 1.3.4 -->
## Sending alerts with Amazon SNS and Amazon SQS

| Service | Role in alerting |
| --- | --- |
| Amazon SNS | Push to people and systems: email, SMS, HTTP/S, Lambda, SQS, Data Firehose, mobile push; filter policies on attributes or body route each alert to the right subscribers; FIFO topics deliver in order to SQS FIFO queues |
| Amazon SQS | Buffer alerts or failed items for a program to process later, with retention and a dead-letter queue; it doesn't notify people by itself |
| SNS to several SQS queues | Fan-out: the on-call tool, a ticketing integration and an audit queue each get every alert |

Common alert sources:

- **EventBridge rule** on `Glue Job State Change` (`FAILED`, `TIMEOUT`), `Glue Crawler State Change`, Step Functions execution status changes, EMR or DMS events, with an SNS topic as target.
- **CloudWatch alarm** on a metric (Step Functions `ExecutionsFailed`, Lambda `Errors`, Kinesis `IteratorAge`) with an SNS action.
- **A workflow step**: a Step Functions `sns:publish` task in a `Catch` branch.

```json
{
  "source": ["aws.glue"],
  "detail-type": ["Glue Job State Change"],
  "detail": {
    "jobName": ["orders-to-parquet"],
    "state": ["FAILED", "TIMEOUT"]
  }
}
```

The SNS topic's access policy must allow `events.amazonaws.com` (or `cloudwatch.amazonaws.com`) to publish, and an encrypted topic needs a customer managed KMS key whose policy lets that service use it.

> **Exam tip.** "Email the data team within minutes when any Glue job fails, with the LEAST operational overhead" is an EventBridge rule on Glue job state changes targeting an SNS topic with an email subscription, not a Lambda function that polls job runs.

<!-- section: key-points -->
## Key points

- Step Functions for AWS-service pipelines; MWAA for Airflow DAGs; Glue workflows for Glue-only chains; EventBridge to start and route, not to keep state.
- Standard: one year, exactly once, `.sync`, callbacks, redrive, Distributed Map; Express: five minutes, high volume, idempotent work.
- `.sync` waits for a job; `.waitForTaskToken` waits for a callback.
- Resilience: retries with backoff and jitter, `Catch`, dead-letter queues, idempotent writes, checkpoints, queues to absorb spikes, Spot only for EMR task nodes.
- Alerts: EventBridge or CloudWatch alarm to an SNS topic; SQS buffers for programs, not people.
- Data Pipeline is closed to new customers.
