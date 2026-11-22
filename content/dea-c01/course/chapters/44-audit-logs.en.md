Audit questions give a pipeline and an auditor's request ("who deleted these objects", "keep application logs for one year", "query three years of API activity across all accounts") and ask which log source, store and query engine answer it at the stated cost. This chapter covers CloudTrail, CloudWatch Logs, CloudTrail Lake and its 2026 status, log analysis engines and logging pipelines for large volumes.

<!-- section: cloudtrail-api-calls | objectives: 4.4.1 -->
## Tracking API calls with AWS CloudTrail

CloudTrail records an event for every API call (console, CLI, SDK, other AWS services) and for some non-API events such as `ConsoleLogin`. Four event types exist:

| Event type | Examples | Logged by default |
| --- | --- | --- |
| Management events (control plane) | `CreateTable`, `PutBucketPolicy`, `AttachRolePolicy`, `ConsoleLogin` | Yes |
| Data events (data plane, high volume) | S3 `GetObject`, `PutObject`, `DeleteObject`; Lambda `Invoke`; DynamoDB item operations | No, enable and pay for them |
| Network activity events | API calls made through a VPC endpoint, recorded for the endpoint owner | No |
| Insights events | Unusual call rates or error rates of management APIs | No |

Where events go:

- **Event history**: the last **90 days** of management events of one Region, searchable at no cost. No data events, no longer retention.
- A **trail** delivers events to an S3 bucket (log files about every 5 minutes, gzip JSON with a `Records` array) and optionally to a CloudWatch Logs log group and EventBridge. Console trails are **multi-Region**; a Region supports five trails. The first copy of management events is free; data events and extra copies are charged.
- An **organization trail**, created in the management account or by a delegated administrator, logs every member account to one bucket; members can see it but cannot change or delete it.
- Global services (IAM, STS, CloudFront) are recorded in `us-east-1`; a multi-Region trail includes them.

Protecting the evidence:

- Log files are encrypted with S3 server-side encryption by default; set an **SSE-KMS** key on the trail for key-level access control and auditing (the key policy must let CloudTrail use it).
- **Log file integrity validation** makes CloudTrail hash each log file (SHA-256) and deliver an hourly **digest file**, signed with RSA, that chains to the previous digest. `aws cloudtrail validate-logs` then proves whether a file was modified, deleted or never delivered.
- Use a dedicated log archive account, with S3 Object Lock if logs must be immutable.

```bash
aws cloudtrail create-trail --name org-audit \
  --s3-bucket-name anycompany-audit-logs \
  --is-multi-region-trail --is-organization-trail \
  --enable-log-file-validation \
  --kms-key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
aws cloudtrail start-logging --name org-audit
```

**Advanced event selectors** keep data events affordable: log only writes, only one bucket prefix, only some functions.

```json
[
  {
    "Name": "Writes and deletes in the raw zone",
    "FieldSelectors": [
      { "Field": "eventCategory", "Equals": ["Data"] },
      { "Field": "resources.type", "Equals": ["AWS::S3::Object"] },
      { "Field": "readOnly", "Equals": ["false"] },
      { "Field": "resources.ARN", "StartsWith": ["arn:aws:s3:::anycompany-raw/landing/"] }
    ]
  }
]
```

> **Exam trap.** "Find who deleted objects from a bucket last week" fails if only management events were logged: `DeleteObject` is a data event and is never in the 90-day event history. Enable S3 data events on a trail (or an event data store) before the need arises; nothing can be recovered afterwards.

<!-- section: cloudwatch-logs-storage | objectives: 4.4.2 -->
## Storing application logs in Amazon CloudWatch Logs

A **log event** (timestamp and message) belongs to a **log stream** (one source: a Lambda execution environment, an instance, a container), and streams belong to a **log group**, which carries the retention, encryption, access and class settings.

How logs arrive: Lambda writes to `/aws/lambda/<function-name>` (or a custom group); Glue, MWAA, Step Functions and Redshift can send their logs to log groups; EC2 and on-premises servers use the CloudWatch agent; custom code calls `PutLogEvents`.

Settings that the exam tests:

- **Retention**: by default logs **never expire**. Set 1 day to 10 years (3,653 days) per log group; account-level retention policies (minimum 30 days) can enforce it on groups by name prefix. Expired events are deleted within about 72 hours.
- **Encryption**: log data is always encrypted; associate a **customer managed KMS key** with a log group when the key must be controlled or audited (the key policy must allow the CloudWatch Logs service principal of the Region).
- **Log class**, chosen at creation and never changed:

| Log class | Use | Not available |
| --- | --- | --- |
| Standard | Logs that feed alarms, metric filters, subscriptions or Live Tail | Nothing |
| Infrequent Access (renamed Essentials) | Logs kept for audit or occasional Logs Insights queries; lower ingestion price, same storage and query price | Subscription filters, metric filters, Live Tail, anomaly detection, embedded metric format, `GetLogEvents` and `FilterLogEvents` |

- **Metric filters** turn matching log events into CloudWatch metrics for alarms (for example a count of `ERROR` lines from a Glue job).
- **Subscription filters** stream events, gzip-compressed and at least once, usually within three minutes, to Kinesis Data Streams, Amazon Data Firehose, Lambda or OpenSearch Service. Up to five per log group (Standard class only), plus one account-level subscription filter per Region; cross-account delivery uses a destination in the receiving account.
- **Export to S3** (`CreateExportTask`) is a one-off batch copy: data can take up to 12 hours to become exportable and a task times out after 24 hours. The bucket can use SSE-S3 or SSE-KMS (not DSSE-KMS). AWS recommends subscriptions, not repeated exports, for continuous archiving.

```bash
aws logs create-log-group --log-group-name /anycompany/ingest/orders \
  --log-group-class STANDARD \
  --kms-key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
aws logs put-retention-policy --log-group-name /anycompany/ingest/orders \
  --retention-in-days 400
aws logs put-subscription-filter --log-group-name /anycompany/ingest/orders \
  --filter-name archive-to-s3 --filter-pattern "" \
  --destination-arn arn:aws:firehose:eu-west-1:111122223333:deliverystream/logs-archive \
  --role-arn arn:aws:iam::111122223333:role/CWLtoFirehoseRole
```

> **Exam tip.** "Archive every application log to S3 continuously with the least operational overhead" is a subscription filter to Firehose (which can also convert to Parquet), not a scheduled `CreateExportTask`. "Cut the cost of audit-only logs that are queried a few times a year" is the Infrequent Access class, but only for a new log group.

<!-- section: cloudtrail-lake | objectives: 4.4.3 -->
## AWS CloudTrail Lake for centralized SQL queries

**Status in 2026**: CloudTrail Lake has been **closed to new customers since May 31, 2026**. Existing customers keep using it, with critical bug fixes and security updates only. Organization event data stores keep covering new member accounts and Regions; account-level event data stores do not ingest accounts added to the organization later. CloudTrail itself (trails, Insights) is not affected. AWS recommends migrating to **Amazon CloudWatch**.

What CloudTrail Lake does for existing customers:

- An **event data store** is an immutable store of events selected with advanced event selectors, converted to Apache ORC. It needs no trail and no S3 bucket. One store holds one category: CloudTrail events (management, data, network activity), Insights events, AWS Config configuration items, AWS Audit Manager evidence, or events from outside AWS sent with `PutAuditEvents` through a channel.
- An **organization event data store** collects every account and Region of the organization.
- Retention depends on the pricing option: one-year extendable retention (up to 3,653 days) or seven-year retention (up to 2,557 days).
- Queries are SQL (Trino `SELECT`), billed by data scanned, with joins across event data stores; results are kept seven days and can be saved to S3. A store can be federated to the Glue Data Catalog and queried with Athena.

```text
SELECT eventSource, eventName, userIdentity.arn, COUNT(*) AS calls
FROM a1b2c3d4-5678-90ab-cdef-EXAMPLE11111
WHERE eventTime > '2026-11-01 00:00:00'
  AND errorCode = 'AccessDenied'
GROUP BY eventSource, eventName, userIdentity.arn
ORDER BY calls DESC
```

The replacement path:

- Since December 2025, CloudTrail events can be collected **directly in CloudWatch** through a service-linked channel, without a trail, and enabled centrally for the organization. CloudWatch normalizes sources to OCSF and OpenTelemetry, offers OpenSearch-powered analytics and Apache Iceberg access, and is queried with Logs Insights.
- History moves with **Export to CloudWatch** in the CloudTrail console or `aws logs create-import-task`; events from before 2023 are not migrated (keep querying them in CloudTrail Lake or copy them to S3).

```bash
aws logs create-import-task \
  --import-source-arn arn:aws:cloudtrail:eu-west-1:111122223333:eventdatastore/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
  --import-role-arn arn:aws:iam::111122223333:role/CloudTrailLakeExportRole
```

> **Exam trap.** The exam guide still names CloudTrail Lake for "centralized logging queries". Know what it does (SQL across accounts and Regions, no trail, retention up to about 10 years), but a company that is not already a customer cannot adopt it in late 2026: choose CloudTrail events in CloudWatch, or an organization trail to S3 queried with Athena.

<!-- section: log-analysis | objectives: 4.4.4 -->
## Analyzing logs with Logs Insights, Athena and OpenSearch Service

| Requirement | Service |
| --- | --- |
| Interactive troubleshooting of logs already in CloudWatch Logs, no infrastructure | CloudWatch Logs Insights |
| SQL over months or years of CloudTrail, VPC Flow Logs, load balancer or S3 access logs stored in S3, pay per query | Amazon Athena |
| Full-text search, near real-time dashboards and alerting on streaming logs | Amazon OpenSearch Service with OpenSearch Dashboards |
| Heavy transformation or enrichment of very large log volumes | Amazon EMR (Spark), see the next section |

**CloudWatch Logs Insights** queries one or many log groups (across accounts from a monitoring account) with Logs Insights QL, OpenSearch PPL or OpenSearch SQL. Fields of JSON logs and of AWS sources (Lambda, CloudTrail, VPC Flow Logs, Route 53) are discovered automatically. Pricing is per GB of uncompressed data scanned, so narrow the time range and use **field indexes** to skip events. Queries time out after 60 minutes; results stay available seven days.

```text
fields @timestamp, jobName, rowsRejected, @message
| filter level = "ERROR" and jobName like /orders/
| stats count(*) as errors, sum(rowsRejected) as rejected by jobName, bin(1h)
| sort errors desc
| limit 20
```

**Athena** reads logs where they land in S3. For CloudTrail, create the table from the CloudTrail console, or with DDL that uses **partition projection** so that new days are queryable without `ALTER TABLE ADD PARTITION` or a crawler (excerpt):

```text
CREATE EXTERNAL TABLE cloudtrail_logs (
  eventtime STRING, eventsource STRING, eventname STRING, awsregion STRING,
  sourceipaddress STRING, errorcode STRING, requestparameters STRING,
  useridentity STRUCT<type: STRING, arn: STRING, accountid: STRING>)
PARTITIONED BY (`timestamp` STRING)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://anycompany-audit-logs/AWSLogs/111122223333/CloudTrail/eu-west-1/'
TBLPROPERTIES (
  'projection.enabled'='true',
  'projection.timestamp.type'='date',
  'projection.timestamp.format'='yyyy/MM/dd',
  'projection.timestamp.range'='2024/01/01,NOW',
  'projection.timestamp.interval'='1',
  'projection.timestamp.interval.unit'='DAYS',
  'storage.location.template'='s3://anycompany-audit-logs/AWSLogs/111122223333/CloudTrail/eu-west-1/${timestamp}');

SELECT useridentity.arn, eventname, COUNT(*) AS calls
FROM cloudtrail_logs
WHERE "timestamp" BETWEEN '2026/11/01' AND '2026/11/07'
  AND eventsource = 's3.amazonaws.com' AND eventname LIKE 'Delete%'
GROUP BY useridentity.arn, eventname;
```

Always filter on the partition column; for repeated queries, convert the JSON to partitioned Parquet (Athena CTAS, Glue or EMR).

**OpenSearch Service** indexes log events for fast search, visualizations and anomaly detection. Feed it with **OpenSearch Ingestion** (serverless Data Prepper pipelines billed in OCUs, which filter and transform data), Firehose or a CloudWatch Logs subscription. Index storage costs more than S3: keep recent logs searchable and the history in S3 for Athena.

> **Exam trap.** Logs Insights cannot query files in S3, and Athena cannot query CloudWatch Logs without a federated connector. Pick the engine where the logs already are, unless the requirement justifies moving them.

<!-- section: logging-integration | objectives: 4.4.5 -->
## Integrating AWS services into a logging pipeline

Each data service has its own log:

| Source | Where its logs go | Point to remember |
| --- | --- | --- |
| Amazon Redshift | Audit logging to S3 or CloudWatch Logs: connection log, user log, user activity log | Off by default; the user activity log (each query) also needs `enable_user_activity_logging = true` in the parameter group; S3 delivery requires SSE-S3 and no Object Lock; Redshift Serverless sends audit logs to CloudWatch Logs only |
| Amazon S3 | CloudTrail data events, or server access logs | Server access logs: free delivery, best effort within hours, include authentication failures and lifecycle actions. CloudTrail data events: within minutes, integrity validation, prefix filters |
| Amazon EMR | `/mnt/var/log` on each node, archived to the S3 log URI set at cluster creation | Step, application (Spark, Hive, YARN containers), bootstrap and system logs survive cluster termination only in S3 |
| AWS Glue, Lambda, MWAA, Step Functions | CloudWatch Logs | Set levels (Airflow components, Step Functions `ALL`, `ERROR`, `FATAL`, `OFF`) and retention on each group |
| VPC Flow Logs | CloudWatch Logs, S3 (text or Parquet, Hive-compatible partitions) or Firehose | S3 in Parquet is the cheapest base for Athena |
| API calls of every service | CloudTrail | One organization trail or CloudWatch collection for all accounts |

For **large volumes**, separate collection, storage and processing:

1. Collect: CloudWatch Logs subscription filters or direct delivery to **Amazon Data Firehose**, which buffers, compresses, converts JSON to Parquet with a Glue table schema and can partition dynamically by a key such as account or date.
2. Store: S3 as the log lake, catalogued in the Glue Data Catalog, with S3 Lifecycle rules that move old logs to cheaper storage classes.
3. Process: **Amazon EMR** (or EMR Serverless) runs Spark across many nodes for jobs beyond a query engine: sessionizing billions of clickstream lines, joining logs with reference data, compacting millions of small files. Glue jobs fit smaller volumes with less to manage.
4. Serve: Athena for ad hoc SQL, Redshift for dashboards joined with business data, OpenSearch Service for search.

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, explode, to_date

spark = SparkSession.builder.appName("cloudtrail-compaction").getOrCreate()

raw = (spark.read.option("multiLine", "true")
       .json("s3://anycompany-audit-logs/AWSLogs/*/CloudTrail/*/2026/11/*/"))

events = raw.select(explode("Records").alias("r")).select(
    col("r.eventTime").alias("event_time"),
    col("r.eventSource").alias("event_source"),
    col("r.eventName").alias("event_name"),
    col("r.awsRegion").alias("aws_region"),
    col("r.recipientAccountId").alias("account_id"),
    col("r.userIdentity.arn").alias("principal_arn"),
    col("r.errorCode").alias("error_code"),
)

(events.withColumn("event_date", to_date("event_time"))
    .write.mode("append")
    .partitionBy("event_date")
    .parquet("s3://anycompany-audit-curated/cloudtrail/"))
```

> **Exam tip.** "Process several terabytes of logs per day with custom Spark code and the lowest cost per terabyte" points to EMR (Spot capacity for task nodes, or EMR Serverless). "Query the same logs a few times a month" points to Athena on Parquet, with no cluster at all.

<!-- section: key-points -->
## Key points

- CloudTrail: management events by default, data events (S3 objects, Lambda `Invoke`, DynamoDB items) opt-in and charged; event history 90 days, management events only; multi-Region organization trail to a log archive bucket.
- Integrity: log file validation (SHA-256 hashes, hourly signed digest files, `validate-logs`); SSE-KMS on the trail for key control.
- CloudWatch Logs: retention never expires by default; KMS key per log group; Infrequent Access (Essentials) class has no subscriptions or metric filters and cannot be changed later; subscriptions to Firehose for continuous archive, export tasks for one-off copies.
- CloudTrail Lake: closed to new customers since May 31, 2026; event data stores, SQL, up to 3,653 days; migrate to CloudWatch (service-linked channel, `create-import-task`).
- Logs Insights for logs in CloudWatch, Athena with partition projection and Parquet for logs in S3, OpenSearch Service for search and live dashboards.
- Redshift audit logging is off by default and needs `enable_user_activity_logging` for queries; EMR logs persist only in the S3 log URI; EMR or EMR Serverless for heavy log processing.
