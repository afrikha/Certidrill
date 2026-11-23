Ingestion questions give you a source, a rate and a deadline, and ask how to get the data into AWS reliably with the least effort. Decide first whether the data arrives as a stream or in batches, then what starts each load (a schedule, an event, a polling consumer), and finally which failure behavior the stem cares about: throttling, duplicates, replay or lost state.

<!-- section: streaming-sources | objectives: 1.1.1 -->
## Reading from streaming sources

| Source | How data is read | Facts that decide answers |
| --- | --- | --- |
| Amazon Kinesis Data Streams | Consumers (Lambda, Firehose, Managed Service for Apache Flink, Glue streaming jobs, KCL applications) read each shard in order | Per shard: write 1 MB/s or 1,000 records/s, read 2 MB/s shared by standard consumers; retention 24 hours to 365 days; records up to 10 MiB |
| Amazon MSK | Kafka consumer groups, Lambda event source mapping, MSK Connect, Firehose, Glue streaming jobs | Kafka APIs and offsets; existing Kafka clients keep working |
| DynamoDB Streams | Lambda event source mapping or the DynamoDB Streams Kinesis adapter | Item changes kept 24 hours, no duplicates, order per item, at most two readers per shard; view type (`KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`) fixed once set |
| Kinesis Data Streams for DynamoDB | Any Kinesis consumer | Retention up to one year, more consumers, possible duplicates |
| AWS DMS | Full load, full load plus CDC, or CDC only, to targets such as Kinesis Data Streams, Apache Kafka, S3 or Redshift | Needs MySQL row-level binary logging, Oracle supplemental logging or PostgreSQL logical replication; CDC has no latency SLA |
| AWS Glue streaming ETL | Spark Structured Streaming on Kinesis, Kafka or MSK, writing to S3 or JDBC stores | 100-second windows by default; checkpoints, not job bookmarks; billed hourly while running |
| Amazon Redshift streaming ingestion | A materialized view reads Kinesis Data Streams or MSK directly | No S3 staging; refresh manually or with `AUTO REFRESH YES` |

Streaming ingestion into Redshift needs an external schema mapped to the stream service and a materialized view per stream:

```sql
CREATE EXTERNAL SCHEMA kds
FROM KINESIS
IAM_ROLE 'arn:aws:iam::111122223333:role/redshift-streaming-role';

CREATE MATERIALIZED VIEW clicks_mv AUTO REFRESH YES AS
SELECT approximate_arrival_timestamp,
       partition_key,
       JSON_PARSE(kinesis_data) AS payload
FROM kds."web-clicks"
WHERE CAN_JSON_PARSE(kinesis_data);
```

> **Exam trap.** When three teams must consume DynamoDB table changes, or a team must reprocess last week's changes, DynamoDB Streams (two readers per shard, 24 hours) is wrong: enable Kinesis Data Streams for DynamoDB.

<!-- section: batch-sources | objectives: 1.1.2, 1.1.3 -->
## Batch sources and their configuration

| Source | Typical reader | Configuration that matters |
| --- | --- | --- |
| Files in Amazon S3 | Glue job on a Data Catalog table, EMR step, Athena, Redshift `COPY` | Partition prefixes, file format and size, job bookmarks |
| Relational database | Glue job with a JDBC connection, DMS full load | Bookmark keys, fetch size, credentials in Secrets Manager |
| Amazon Redshift | `UNLOAD` to S3, Redshift Data API | Parquet output, IAM role on the cluster |
| SaaS application | Amazon AppFlow flow, on demand, on schedule or on event, to S3 or Redshift | Connector, private transfer with AWS PrivateLink where supported |
| Small custom source | Lambda function started by a schedule | Payload and duration limits, idempotent writes |

Glue settings tested most often:

- **Job bookmarks** (`job-bookmark-enable`, `-disable`, the default, or `-pause`) make a run process only new data: S3 objects by modification time, JDBC rows by bookmark keys (by default a primary key that only increases or decreases, without gaps). Each source needs a `transformation_ctx` and the script must call `job.commit()`. Resetting (`aws glue reset-job-bookmark`) or rewinding reprocesses data but doesn't delete existing output.
- **File grouping**: `groupFiles` set to `inPartition`, with an optional `groupSize` in bytes, packs small CSV or JSON files into larger tasks; automatic above 50,000 files; not for Parquet, ORC or Avro.
- **Workers**: G.1X has 4 vCPU and 16 GB, G.2X twice that, up to G.16X; R types are memory-optimized.

```python
orders = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={"paths": ["s3://example-landing/orders/"],
                        "recurse": True,
                        "groupFiles": "inPartition",
                        "groupSize": "134217728"},
    format="json",
    transformation_ctx="orders_src")
# ... mappings and writes ...
job.commit()
```

For Redshift `COPY`, load Parquet or ORC directly, or split compressed CSV and JSON into similar files of 1 MB to 1 GB after compression, in a multiple of the cluster's slices, loaded by a single `COPY`.

<!-- section: data-apis | objectives: 1.1.4 -->
## Consuming data APIs

| Requirement | Solution |
| --- | --- |
| Data from a supported SaaS application (Salesforce, ServiceNow, Zendesk, Slack...) with no code | Amazon AppFlow flow on a schedule or an event |
| A REST API without a connector, polled every few minutes | Lambda started by EventBridge Scheduler, handling pagination and HTTP 429 with backoff, writing to S3 or Firehose |
| A long API extraction | Glue Python shell job or a container task, orchestrated by Step Functions |
| API credentials | AWS Secrets Manager, read at run time through the IAM role |
| A function in a VPC must reach a public API | Private subnet routed to a NAT gateway |

The reverse direction, pushing events to a partner's HTTPS endpoint, is an **EventBridge API destination**: its connection holds the authorization in Secrets Manager, `--invocation-rate-limit-per-second` caps calls, each call must answer within 5 seconds, and failures are retried for up to 24 hours before a dead-letter queue.

<!-- section: schedulers | objectives: 1.1.5 -->
## Schedulers for jobs and crawlers

| Scheduler | Use it for |
| --- | --- |
| EventBridge Scheduler | Rate, cron or one-time (`at(...)`) schedules in any IANA time zone, for almost any target |
| Glue scheduled trigger | Glue jobs and crawlers (at most two crawlers per trigger) on a cron expression |
| Crawler schedule | Rerun one crawler to pick up new partitions and schema changes |
| Amazon MWAA | Airflow DAGs with schedules, dependencies, retries and backfills in Python |

AWS cron expressions have six fields: minutes, hours, day of month, month, day of week, year. Day of month and day of week can't both be `*`: one must be `?`.

```bash
aws scheduler create-schedule --name nightly-orders-load \
  --schedule-expression "cron(30 2 * * ? *)" \
  --schedule-expression-timezone "Europe/Paris" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{"Arn": "arn:aws:states:eu-west-3:111122223333:stateMachine:orders-load",
             "RoleArn": "arn:aws:iam::111122223333:role/scheduler-invoke-sfn"}'
```

> **Exam tip.** "Run at 2:30 AM local time all year" is a cron expression with a time zone. `rate(1 days)` is a fixed 24-hour interval, and a cron in UTC shifts by an hour when daylight saving time changes.

<!-- section: event-triggers | objectives: 1.1.6 -->
## Event triggers

| Mechanism | Behavior |
| --- | --- |
| S3 Event Notifications | Selected event types to SNS, standard SQS queues or Lambda, filtered by key prefix and suffix; filters for the same event type can't overlap |
| S3 events to EventBridge | Enabled on the bucket, every event reaches the default bus; rules filter on any field and feed several targets, including SQS FIFO queues, Step Functions and Glue workflows |
| Glue workflow EventBridge trigger | Starts when a batch size or a batch window (up to 900 seconds) is reached, whichever comes first |
| DynamoDB Streams, Kinesis, SQS | Lambda event source mappings poll and invoke the function |

Notifications arrive at least once, usually within seconds, so consumers must tolerate duplicates. A function that writes into the bucket that triggers it loops: write elsewhere or filter on an input prefix.

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": { "name": ["example-landing"] },
    "object": { "key": [{ "prefix": "invoices/" }] }
  }
}
```

> **Exam trap.** S3 Event Notifications can't target an SQS FIFO queue, and two configurations can't share an overlapping prefix for the same event type. When two pipelines react to the same objects, or ordering through FIFO is required, use EventBridge.

<!-- section: lambda-kinesis | objectives: 1.1.7 -->
## Calling Lambda from Kinesis

An **event source mapping** polls each shard (once per second by default), builds batches from one shard and invokes the function synchronously; the execution role needs read access to the stream.

| Setting | Default and range | Use |
| --- | --- | --- |
| `BatchSize` | 100, up to 10,000 | More records per invocation; batch payload capped at 6 MB |
| `MaximumBatchingWindowInSeconds` | 0, up to 300 | Fill batches when traffic is light |
| `StartingPosition` | `TRIM_HORIZON`, `LATEST`, `AT_TIMESTAMP` | Oldest record, new records, or a point in time |
| `ParallelizationFactor` | 1 to 10 | Concurrent batches per shard, order kept per partition key |
| Enhanced fan-out consumer | Off | Dedicated 2 MB/s per shard over HTTP/2 |
| `BisectBatchOnFunctionError` | false | Split a failing batch to isolate the bad record |
| `MaximumRetryAttempts` | -1 (until expiry), up to 10,000 | Stop retrying a poison batch |
| `MaximumRecordAgeInSeconds` | -1, up to 604,800 | Skip records older than this |
| On-failure destination | None | SQS or SNS get batch metadata; an S3 bucket also gets the payload |
| `FunctionResponseTypes` | None | `ReportBatchItemFailures`: retry from the first failed record only |

```bash
aws lambda create-event-source-mapping \
  --function-name enrich-clicks \
  --event-source-arn arn:aws:kinesis:eu-west-3:111122223333:stream/web-clicks \
  --starting-position LATEST \
  --batch-size 500 --maximum-batching-window-in-seconds 5 \
  --parallelization-factor 4 \
  --bisect-batch-on-function-error --maximum-retry-attempts 3 \
  --maximum-record-age-in-seconds 3600 \
  --function-response-types ReportBatchItemFailures \
  --destination-config '{"OnFailure": {"Destination": "arn:aws:sqs:eu-west-3:111122223333:clicks-failed"}}'
```

A function error blocks the shard until the batch succeeds or expires (up to a week with the defaults). Delivery is at least once: make the function idempotent.

> **Exam trap.** A rising `IteratorAge` with normal function duration means the consumer is too slow: raise `ParallelizationFactor` or add shards. A rising `IteratorAge` with the same batch failing again and again is a poison record: bisect, limit retries, add an on-failure destination.

<!-- section: ip-allowlists | objectives: 1.1.8 -->
## Allowlisting IP addresses for data sources

| Connection | What to allow |
| --- | --- |
| Glue job to a database in a VPC | A security group with a self-referencing inbound rule (all TCP from itself) on the connection, access to the database port, an S3 gateway endpoint |
| Data Firehose to Amazon Redshift | A publicly accessible cluster whose security group allows the Firehose CIDR block of the Region (for example `52.70.63.192/27` in us-east-1) |
| Data Firehose to Splunk | The Region's Firehose CIDR blocks for Splunk, different from the Redshift block |
| Data Firehose to OpenSearch Service in a VPC | No public allowlist: Firehose creates network interfaces in your subnets; security groups allow HTTPS |
| Lambda or Glue calling a partner API that allowlists callers | A NAT gateway's Elastic IP address |
| On-premises firewall allowing AWS services | Ranges from `ip-ranges.json`; in security groups, AWS-managed prefix lists |

> **Exam trap.** Glue network interfaces have private IP addresses only, even in a public subnet. A database outside AWS must allow a NAT gateway's Elastic IP address, or be reached over VPN or Direct Connect.

<!-- section: throttling | objectives: 1.1.9 -->
## Throttling and rate limits

| Service | Symptom | Fixes |
| --- | --- | --- |
| DynamoDB | `ProvisionedThroughputExceededException`, `WriteThrottleEvents` | A partition serves at most 3,000 read and 1,000 write units per second: write sharding for hot keys, on-demand mode or auto scaling, SDK retries with backoff |
| Kinesis Data Streams (write) | `WriteProvisionedThroughputExceeded` | High-cardinality partition key, more shards or on-demand mode, `PutRecords` (500 records per call) or KPL aggregation, retry only failed records |
| Kinesis Data Streams (read) | `ReadProvisionedThroughputExceeded` | `GetRecords` allows 5 calls per second per shard, shared: enhanced fan-out |
| Amazon RDS | Connection storms from Lambda | RDS Proxy pools connections and queues or rejects excess; read replicas for reads |
| Lambda | A function overwhelms a database | Reserved concurrency, maximum concurrency on the SQS mapping, a queue in front |
| API Gateway | HTTP 429 for clients | Stage and method throttling, usage plans with API keys |
| Third-party API | HTTP 429 | Client-side rate limiting, backoff with jitter |

```python
import boto3
from botocore.config import Config

dynamodb = boto3.client(
    "dynamodb",
    config=Config(retries={"max_attempts": 10, "mode": "adaptive"}))
```

<!-- section: fan-in-fan-out | objectives: 1.1.10 -->
## Fan-in and fan-out

**Fan-in** merges many producers into one stream: devices write to one Kinesis or Firehose stream, partition keys spread the load over shards, and aggregation keeps the record rate under shard limits. **Fan-out** delivers the same data to several consumers:

| Need | Pattern |
| --- | --- |
| Several low-latency applications on one stream | Enhanced fan-out: up to 20 consumers per stream (50 on On-demand Advantage streams), each with 2 MB/s per shard |
| A few consumers that tolerate shared throughput | Standard consumers sharing 2 MB/s per shard |
| One message to several queues, each at its own pace | SNS topic with SQS subscriptions and filter policies |
| One event to several services by content | EventBridge rules and targets |
| One Kafka topic, several applications | One consumer group per application |
| Table changes to more than two consumers | Kinesis Data Streams for DynamoDB |

<!-- section: replayability | objectives: 1.1.11 -->
## Replayability

A pipeline is replayable when past data can go through it again after a bug fix or for a new consumer:

| Component | Replay capability |
| --- | --- |
| Kinesis Data Streams | Retention up to 365 days; restart at `TRIM_HORIZON` or `AT_TIMESTAMP` |
| Amazon MSK | Topic retention; consumers reset offsets |
| Data Firehose | None: keep raw data in S3 (source record backup when a transformation is enabled) |
| Amazon SQS | None once deleted; dead-letter queue redrive covers failures only |
| EventBridge | Archive filtered by an event pattern, kept indefinitely by default; replay a time range to the source bus, not necessarily in order, with a `replay-name` field |
| S3 raw zone | Immutable raw objects with S3 Versioning, reprocessed by rerunning the job |
| Glue job bookmarks | Reset or rewind; output isn't deleted |
| AWS DMS | New CDC task from a timestamp or a native start point (LSN, SCN, binlog position) |

Replay creates duplicates downstream: write idempotently (deterministic keys, upserts, merges into an Iceberg table) or clear the target partition first.

<!-- section: stateful-stateless | objectives: 1.1.12 -->
## Stateful and stateless transactions

A **stateless** step handles each record or request alone (a Firehose transformation, a function parsing one object, a self-contained REST call), so it scales and retries anywhere. A **stateful** step depends on earlier data: windowed counts, deduplication, sessions, stream joins, the position reached in a source.

| Need | Service and state mechanism |
| --- | --- |
| Windowed aggregations, stream joins, exactly-once results | Managed Service for Apache Flink: automatic checkpoints (every 60 seconds by default), snapshots for updates |
| Small per-shard aggregates in Lambda | Tumbling windows on a Kinesis or DynamoDB Streams mapping: up to 900 seconds, up to 1 MB of state per shard |
| Progress of a streaming Spark job | Glue streaming checkpoints |
| Progress of a batch job | Glue job bookmarks |
| Deduplication across invocations | DynamoDB conditional writes on an event ID |
| Multi-step business transaction | Step Functions Standard workflow |

```python
def handler(event, context):
    state = event.get("state") or {}
    for record in event["Records"]:
        key = record["kinesis"]["partitionKey"]
        state[key] = state.get(key, 0) + 1
    if event.get("isFinalInvokeForWindow"):
        save_counts(event["window"], state)
        return {"state": {}}
    return {"state": state}
```

> **Exam tip.** "Count events per device every 5 minutes with the LEAST operational overhead" is a tumbling window or Managed Service for Apache Flink, never a global variable in a Lambda handler.

<!-- section: key-points -->
## Key points

- Kinesis shard: 1 MB/s or 1,000 records/s in, 2 MB/s out, 24 hours to 365 days; DynamoDB Streams: 24 hours, two readers per shard.
- Bookmarks need `transformation_ctx` and `job.commit()`; `groupFiles` fixes many small files.
- EventBridge Scheduler with a time zone; six-field cron with `?`.
- S3 events to SQS FIFO or to several consumers go through EventBridge.
- Kinesis to Lambda: parallelization for lag; bisect, retry limits and on-failure destination for poison records.
- Firehose to Redshift: public cluster allowing the Firehose CIDR; Glue: self-referencing security group rule.
- Replay needs retention; Firehose and SQS don't replay.
