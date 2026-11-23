Automation questions start from a pipeline that someone runs by hand or that breaks silently, and ask which service runs it on time, retries what fails and calls the right API: an orchestrator, an event rule or a schedule, a Lambda function, an SDK call, or a built-in feature of Glue, EMR, Redshift or Athena. The answer is usually the managed option with the least code that still meets the stated constraint.

<!-- section: orchestration | objectives: 3.1.1 -->
## Orchestrating data pipelines

| Orchestrator | What it is | Choose it when |
| --- | --- | --- |
| **AWS Step Functions** Standard | Serverless state machine in Amazon States Language (JSON); up to one year, exactly-once, billed per state transition; `.sync` (wait for a job) and `.waitForTaskToken` (callback) patterns, Distributed Map for millions of S3 objects | AWS-native pipelines with branching, retries and error handling, no servers |
| Step Functions Express | Up to five minutes, at-least-once (asynchronous), billed per execution and duration; no `.sync` or callback | High-volume, short event processing |
| **Amazon MWAA** | Managed Apache Airflow environment: Python DAGs in an S3 bucket, `requirements.txt` and plugins, schedulers and autoscaling workers on Fargate in your VPC | Existing Airflow DAGs, open-source portability, many third-party operators |
| **MWAA Serverless** | Airflow workflows defined in YAML in S3, compute provisioned per run, scheduled by EventBridge Scheduler, one IAM role per workflow | Airflow-style workflows without a permanent environment |
| **AWS Glue workflows** | Triggers chaining Glue crawlers and jobs | Pipelines made only of Glue components |
| **Amazon EventBridge** | Event rules and schedules | Starting a pipeline on an event or a time, not managing its steps |

```json
{
  "StartAt": "TransformSales",
  "States": {
    "TransformSales": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": { "JobName": "sales-to-parquet" },
      "Retry": [
        { "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 60, "MaxAttempts": 2, "BackoffRate": 2.0 }
      ],
      "Catch": [
        { "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }
      ],
      "Next": "BuildDailyTotals"
    },
    "BuildDailyTotals": {
      "Type": "Task",
      "Resource": "arn:aws:states:::athena:startQueryExecution.sync",
      "Parameters": {
        "QueryString": "INSERT INTO curated.daily_sales SELECT store_id, sale_date, SUM(amount) FROM curated.sales GROUP BY store_id, sale_date",
        "WorkGroup": "etl"
      },
      "End": true
    },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:eu-west-1:111122223333:pipeline-alerts",
        "Message.$": "$.Cause"
      },
      "End": true
    }
  }
}
```

> **Exam trap.** Without `.sync`, `glue:startJobRun` returns as soon as the job starts, and the next state runs on incomplete data. "Wait for the Glue job to finish before querying" is the `.sync` integration, not a Wait state with a guessed duration.

<!-- section: troubleshoot-workflows | objectives: 3.1.2 -->
## Troubleshooting managed workflows

**Step Functions.** The execution history (90 days for Standard) shows each state's input, output and error. Errors are named: `States.ALL` (any), `States.TaskFailed`, `States.Timeout` (`TimeoutSeconds` or a missed `HeartbeatSeconds`), `States.Permissions`, or the service error. A `Retry` block sets `ErrorEquals`, `IntervalSeconds`, `MaxAttempts` and `BackoffRate`; `Catch` sends the error to a fallback state; `ResultPath` keeps the original input next to the error. Express workflows keep history only in CloudWatch Logs, so enable logging on them.

**Amazon MWAA.** Turn on the Airflow log types (DAG processing, scheduler, task, web server, worker), each with a level, in CloudWatch Logs groups named `airflow-<environment>-<type>`.

| Symptom | Usual cause |
| --- | --- |
| DAG missing from the UI | File not under `dags/` in the bucket, or a Python import error (DAG processing logs) |
| Environment update fails or takes long | `requirements.txt` conflict: pin versions with the Airflow constraints file; read the requirements install log |
| Task fails calling a service | Execution role lacks the permission, or private subnets have no NAT gateway or VPC endpoints for S3, CloudWatch Logs, SQS and KMS |
| Tasks queued for long | Worker maximum too low or concurrency limits; raise maximum workers or the environment class |
| Airflow UI unreachable | Private web server: access only from inside the VPC (VPN, bastion) |

> **Exam tip.** Glue job failures inside a workflow are investigated in the job's own logs and metrics; the orchestrator only reports that the step failed and its error message.

<!-- section: sdk-calls | objectives: 3.1.3 -->
## Calling AWS SDKs from code

Data code calls AWS through an SDK (boto3 in Python, the AWS SDK for Java...). The exam tests patterns, not syntax:

- **Credentials** come from the role of the compute (Lambda execution role, Glue job role, EC2 instance profile), never from keys in code.
- **Asynchronous APIs** return an ID and need polling or a waiter: Athena `StartQueryExecution`, Glue `StartJobRun`, Redshift Data API `ExecuteStatement`, EMR `AddJobFlowSteps`.
- **Paginators** read every page of a list or result (`NextToken`); one call returns only the first page.
- **Retries with exponential backoff** handle throttling (`ThrottlingException`, `ProvisionedThroughputExceededException`); SDK retry modes `standard` and `adaptive`.

```python
import time
import boto3
from botocore.config import Config

athena = boto3.client("athena", config=Config(retries={"mode": "adaptive", "max_attempts": 10}))

run = athena.start_query_execution(
    QueryString="SELECT store_id, SUM(amount) FROM curated.sales WHERE sale_date = ? GROUP BY store_id",
    ExecutionParameters=["'2026-11-21'"],
    WorkGroup="analysts",
)
query_id = run["QueryExecutionId"]

while True:
    status = athena.get_query_execution(QueryExecutionId=query_id)["QueryExecution"]["Status"]["State"]
    if status in ("SUCCEEDED", "FAILED", "CANCELLED"):
        break
    time.sleep(2)

for page in athena.get_paginator("get_query_results").paginate(QueryExecutionId=query_id):
    for row in page["ResultSet"]["Rows"]:
        print([col.get("VarCharValue") for col in row["Data"]])
```

The **Redshift Data API** runs SQL over HTTPS with no driver or persistent connection, using Secrets Manager or temporary IAM credentials, on provisioned clusters and Serverless workgroups; results are kept 24 hours.

```bash
aws redshift-data execute-statement \
  --workgroup-name analytics \
  --database dev \
  --sql "CALL refresh_daily_sales()" \
  --with-event
```

> **Exam tip.** "A Lambda function must run Redshift SQL without managing connections or drivers" is the Redshift Data API.

<!-- section: service-features | objectives: 3.1.4 -->
## Using service features to process data

| Service | Features the exam uses |
| --- | --- |
| **AWS Glue** | Spark, streaming and Python shell jobs; worker types G.1X to G.16X and memory-optimized R.1X to R.8X (DPU = 4 vCPUs, 16 GB); **Flex** execution for non-urgent jobs (Glue 3.0+, G.1X or G.2X) at lower cost; job bookmarks for incremental runs; Auto Scaling; timeout (default 480 minutes from Glue 5.0, 2,880 before), retries 0–10, max concurrent runs (default 1) |
| **Amazon EMR** | Steps on EC2 clusters (transient clusters that terminate after their steps), managed scaling, Spot task nodes, EMR Serverless applications, EMR on EKS |
| **Amazon Redshift** | `COPY` from S3 in parallel, `UNLOAD` to S3 in Parquet, stored procedures, materialized views with auto refresh, scheduled queries, streaming ingestion from Kinesis or MSK, zero-ETL integrations |
| **Amazon Athena** | CTAS and `INSERT INTO` to transform with SQL, Iceberg `MERGE`, `UNLOAD` |

> **Exam trap.** A Glue job that fails when the previous run is still active raises a concurrent runs exceeded error: raise the job's maximum concurrency or serialize runs, don't add workers.

<!-- section: data-apis | objectives: 3.1.5 -->
## Consuming and maintaining data APIs

**Consuming** an external API (SaaS, partner, internal service) in a pipeline:

- Respect rate limits: backoff on HTTP 429, follow pagination tokens, request incremental windows (`updated_since`) instead of full extracts.
- Store API keys and OAuth secrets in Secrets Manager and rotate them.
- For supported SaaS sources (Salesforce, ServiceNow, Zendesk, SAP OData...), **Amazon AppFlow** copies data to S3 or Redshift on a schedule, on an event or on demand, with no code.

**Maintaining** an API that exposes data:

- **API Gateway** in front of Lambda or direct service integrations (DynamoDB, Step Functions); throttling and usage plans with API keys per consumer; caching for repeated reads; stages and versions so changes don't break clients; request validation.
- Return paginated results and limit page sizes; serve large extracts as S3 presigned URLs, not in the response body.
- The Redshift Data API and the Athena API already expose SQL as an API for internal consumers.

> **Exam tip.** "Ingest Salesforce objects into S3 daily with the least development effort" is Amazon AppFlow, not a Lambda function that calls the Salesforce API.

<!-- section: data-preparation | objectives: 3.1.6 -->
## Preparing data for transformation

**AWS Glue DataBrew** is visual, no-code preparation for analysts: a **dataset** points to data (S3, Data Catalog, databases), a **project** opens a sample in a grid, transformations (more than 250: split, pivot, fill missing values, standardize formats, mask PII) are saved as a reusable **recipe**, and a **recipe job** applies the recipe to the full dataset and writes to S3 on a schedule. A **profile job** computes column statistics, distributions, correlations and data quality checks.

**Amazon SageMaker Unified Studio** brings data and AI tools into **projects** inside a **domain**: Visual ETL flows (Glue Spark), JupyterLab notebooks on Glue, EMR or Athena Spark compute, a SQL query editor for Athena and Redshift, and workflows, all on catalog data governed by SageMaker Catalog.

| Requirement | Answer |
| --- | --- |
| Analysts clean CSV files visually and rerun the same steps every day | DataBrew recipe and scheduled recipe job |
| Data engineers and data scientists share data, notebooks and ETL in one governed workspace | SageMaker Unified Studio project |
| Complex, code-based transformation at scale | Glue or EMR Spark job |

> **Exam trap.** DataBrew projects work on a sample; the full data is processed only by a recipe job. "The output contains only 500 rows" means the recipe was never run as a job.

<!-- section: athena-queries | objectives: 3.1.7 -->
## Querying data with Amazon Athena

Athena is serverless SQL (Trino engine) on data described in the Glue Data Catalog, billed per byte scanned with a 10 MB minimum per query, or through **capacity reservations** (dedicated DPUs, minimum 4, up to 20 workgroups per reservation).

| Feature | Use |
| --- | --- |
| **Workgroups** | Separate teams: result location and encryption, per-query data scanned limit, workgroup data usage alarms, "override client-side settings" |
| **Query result reuse** | Return the previous result of an identical query (default 60 minutes, up to 7 days); not for tables with Lake Formation fine-grained permissions |
| **Parameterized queries** | `?` placeholders with `ExecutionParameters`, or prepared statements: reuse a query safely |
| CTAS, `INSERT INTO`, `UNLOAD` | Write results as Parquet or ORC to S3, partitioned |
| **Federated queries** | Data source connectors (Lambda functions) query DynamoDB, RDS, Redshift and others in place |
| Iceberg DML | `UPDATE`, `DELETE`, `MERGE INTO`, `OPTIMIZE`, `VACUUM` |

> **Exam tip.** "Prevent a single analyst query from scanning more than 1 TB" is a per-query data usage control on the workgroup, enforced by overriding client-side settings.

<!-- section: lambda-processing | objectives: 3.1.8 -->
## Automating processing with AWS Lambda

Lambda runs code on events: 128 MB to 10,240 MB of memory, `/tmp` up to 10,240 MB, timeout up to 30 minutes (1,800 seconds), payloads of 6 MB synchronous and 1 MB asynchronous. It suits per-file and per-batch work; long or heavy transformations belong in Glue or EMR.

| Trigger | Mechanism |
| --- | --- |
| S3 object created | S3 Event Notifications or EventBridge invoke the function asynchronously |
| Kinesis, DynamoDB Streams, MSK, SQS | An **event source mapping** polls and invokes with batches |
| Schedule | EventBridge Scheduler |
| Step Functions or API Gateway | Direct invocation |

Kinesis and DynamoDB Streams mappings: batch size (default 100, up to 10,000), batching window up to 5 minutes, parallelization factor 1–10 per shard (order kept per partition key), starting position `TRIM_HORIZON`, `LATEST` or `AT_TIMESTAMP`, and error handling with bisect on error, maximum retry attempts, maximum record age, an on-failure destination (SQS or SNS) and `ReportBatchItemFailures`.

```yaml
  ClickProcessor:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: python3.13
      Timeout: 120
      Events:
        Clicks:
          Type: Kinesis
          Properties:
            Stream: !GetAtt ClickStream.Arn
            StartingPosition: LATEST
            BatchSize: 500
            MaximumBatchingWindowInSeconds: 10
            ParallelizationFactor: 2
            BisectBatchOnFunctionError: true
            MaximumRetryAttempts: 3
            FunctionResponseTypes:
              - ReportBatchItemFailures
            DestinationConfig:
              OnFailure:
                Destination: !GetAtt FailedClicksQueue.Arn
```

> **Exam trap.** With the defaults (infinite retries, no maximum record age) one bad record blocks its shard until the record expires, and `IteratorAge` keeps growing. Set retries, bisect, a maximum record age and an on-failure destination.

<!-- section: events-schedulers | objectives: 3.1.9 -->
## Managing events and schedulers with EventBridge

**Event rules** match events on an event bus and send them to targets (Step Functions, Lambda, SNS, SQS, Glue workflows...). AWS services publish state changes: Glue job state change (`SUCCEEDED`, `FAILED`, `TIMEOUT`, `STOPPED`), Glue crawler state change, Step Functions execution status change, EMR step and cluster changes, and S3 object events once **EventBridge is turned on for the bucket** (then all S3 events are sent, filtered by rules on bucket, prefix or size).

**EventBridge Scheduler** runs millions of one-time, rate or cron schedules with a **time zone**, a **flexible time window**, retries and a dead-letter queue, targeting more than 270 services through universal targets. It is the recommended replacement for scheduled rules.

```bash
aws scheduler create-schedule \
  --name nightly-sales-pipeline \
  --schedule-expression "cron(30 2 * * ? *)" \
  --schedule-expression-timezone "Europe/Paris" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{"Arn": "arn:aws:states:eu-west-1:111122223333:stateMachine:sales-pipeline", "RoleArn": "arn:aws:iam::111122223333:role/scheduler-start-pipeline"}'
```

| Requirement | Answer |
| --- | --- |
| Start the pipeline when a file lands, with filtering on suffix and several targets | S3 to EventBridge rule |
| Run at 02:30 local time, daylight saving included | EventBridge Scheduler with a time zone |
| Run a crawler after a Glue job succeeds, Glue only | Glue workflow conditional trigger |
| Archive events and replay them after a fix | EventBridge archive and replay |

> **Exam tip.** Cron expressions in EventBridge have six fields and use `?` in day-of-month or day-of-week: `cron(30 2 * * ? *)`.

<!-- section: key-points -->
## Key points

- Step Functions Standard for AWS-native pipelines (`.sync`, Retry, Catch); Express for short high-volume work; MWAA for Airflow DAGs; MWAA Serverless for Airflow without an environment.
- Troubleshoot Step Functions from execution history and error names; MWAA from its CloudWatch log types, `requirements.txt`, execution role and VPC endpoints.
- SDK code: role credentials, polling or waiters for asynchronous APIs, paginators, backoff; Redshift Data API instead of drivers.
- Glue Flex for non-urgent jobs, bookmarks for incremental runs; EMR transient clusters; Redshift `COPY`, `UNLOAD`, materialized views.
- AppFlow for SaaS ingestion; API Gateway throttling, usage plans and caching to serve data.
- DataBrew recipes and jobs for visual preparation; SageMaker Unified Studio for shared projects.
- Athena workgroups, result reuse, parameterized queries, CTAS and federated queries.
- Lambda up to 30 minutes; event source mappings with bisect, retries and failure destinations.
- EventBridge rules for events, EventBridge Scheduler for time zones and flexible windows.
