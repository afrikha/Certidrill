Monitoring questions describe a pipeline that failed overnight, a job that got slower, or an auditor asking who changed a table, and ask what should have been logged, where, and how the team should have been told. The tools are few (CloudTrail, CloudWatch Logs and metrics, EventBridge, SNS, the services' own logs) but the exam cares about defaults: what is not logged unless you turn it on, where each log goes, and how long it stays.

<!-- section: cloudtrail | objectives: 3.3.5 -->
## Tracking API calls with AWS CloudTrail

CloudTrail records API calls made in the account (console, CLI, SDK, other services) with who, when, from where and with which parameters.

| Event type | Content | Logged by default |
| --- | --- | --- |
| Management events | Control plane: `CreateTable`, `StartJobRun`, `PutBucketPolicy`, `ConsoleLogin` | Yes |
| Data events | Data plane, high volume: S3 `GetObject` and `PutObject`, Lambda `Invoke`, DynamoDB item operations | No: add them to a trail, with selectors to limit cost |
| Network activity events | API calls through your VPC endpoints | No |
| Insights events | Unusual API call rates or error rates | No |

- **Event history**: the last 90 days of management events per Region, viewable and searchable at no cost, no setup.
- A **trail** delivers events as files to an S3 bucket, optionally to CloudWatch Logs and EventBridge. Console trails are multi-Region; an **organization trail** from the management account covers every member account, and member accounts can't change or stop it.
- **Log file integrity validation** writes hourly digest files (SHA-256) to prove that delivered files were not modified or deleted.
- **CloudTrail Lake** (SQL over event data stores) is **closed to new customers since May 31, 2026**; existing customers keep using it, with only critical fixes. AWS recommends **Amazon CloudWatch** for similar capabilities, and existing event data stores can be exported to a CloudWatch log group (`aws logs create-import-task`).

> **Exam trap.** "Find who downloaded objects from the bucket last week" fails if S3 data events were not enabled on a trail before the downloads: event history and default trails contain management events only.

<!-- section: audit-log-extraction | objectives: 3.3.1 -->
## Extracting logs for audits

Auditors want logs that are complete, tamper-evident, kept for the required period and queryable.

| Need | Solution |
| --- | --- |
| Account-wide API history kept for years | Organization trail to a central S3 bucket in a log archive account, S3 Object Lock or a restrictive bucket policy, S3 Lifecycle to archive classes |
| SQL over CloudTrail files | Athena table on the trail's S3 prefix with partition projection (the CloudTrail console can create it) |
| Interactive search of CloudTrail events | Trail delivery to CloudWatch Logs, queried with Logs Insights |
| One-off copy of a CloudWatch log group to S3 | Export task (`create-export-task`): data may take up to 12 hours to become exportable, a task times out after 24 hours; SSE-S3 and SSE-KMS buckets supported |
| Continuous copy of CloudWatch Logs to S3 or another account | Subscription filter to Amazon Data Firehose (AWS recommends subscriptions, not repeated exports) |
| Database activity | Redshift audit logs, RDS and Aurora logs published to CloudWatch Logs, DMS task logs |

```text
SELECT eventtime, useridentity.arn, eventname, requestparameters
FROM cloudtrail_logs
WHERE eventsource = 'glue.amazonaws.com'
  AND eventname IN ('DeleteTable', 'UpdateTable')
  AND timestamp >= '2026/11/01'
ORDER BY eventtime DESC;
```

> **Exam tip.** CloudWatch Logs export to S3 is a batch operation for occasional extracts. "Stream all application logs to S3 in near real time for the auditors" is a subscription filter to Data Firehose.

<!-- section: logging-deployment | objectives: 3.3.2 -->
## Deploying logging and monitoring for traceability

Most data services log little by default. Turn on what each one offers:

| Service | What to enable |
| --- | --- |
| AWS Glue | Continuous logging to CloudWatch (`--enable-continuous-cloudwatch-log`, otherwise logs arrive only when the job ends), job metrics and observability metrics, Spark UI event logs to S3, job run insights |
| Amazon EMR | Log URI in S3 at cluster creation (step, application and node logs are archived there), CloudWatch agent for metrics |
| Amazon MWAA | Each Airflow log type and its level |
| Amazon Redshift | Audit logging (connection, user and user activity logs) to S3 or CloudWatch; the user activity log also needs the `enable_user_activity_logging` parameter; Serverless sends audit logs to CloudWatch only |
| Amazon S3 | CloudTrail data events (who accessed which object), or S3 server access logs (best effort) |
| Lambda | JSON log format and log levels, a log group per application |
| Kinesis, Firehose, DMS | CloudWatch metrics; Firehose error logging; DMS task logs |
| Configuration history | AWS Config records resource configuration changes and evaluates rules |

Redshift audit logs on S3 need a bucket policy that lets the Redshift service write, **SSE-S3 encryption** (SSE-KMS isn't supported for these files) and Object Lock turned off. Redshift also keeps the same information in system tables (`SYS_` and `STL_` views), for a limited time.

> **Exam trap.** Turning on Redshift audit logging alone does not record the queries: without `enable_user_activity_logging=true` in the parameter group, only connection and user logs are written.

<!-- section: cloudwatch-logs | objectives: 3.3.7 -->
## Configuring and automating CloudWatch Logs

Application data is written to **log groups** (one per application or function) made of **log streams** (one per instance, container or function environment).

- **Retention**: by default logs never expire; set 1 day to 10 years per group (`put-retention-policy`), or in infrastructure as code.
- **Log class**, chosen at creation and not changeable: **Standard** (all features), **Essentials** (formerly Infrequent Access: lower ingestion price, Logs Insights queries, no metric filters, subscription filters or Live Tail), **Delivery** (Lambda logs delivered to S3 or Firehose, fixed 2-day retention).
- **CloudWatch agent** on EC2 or on premises: a JSON configuration lists the files to collect, their log group and stream names and retention; distribute it with Systems Manager Parameter Store.
- **Metric filters** turn matching log lines into metrics (count of `ERROR`), the base for alarms.
- **Subscription filters** stream events to Kinesis Data Streams, Data Firehose or Lambda (OpenSearch Service through a Lambda function); an account-level policy can cover all log groups.
- **Data protection policies** mask sensitive data at ingestion.

```yaml
  PipelineLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /anycompany/ingestion
      RetentionInDays: 90
      LogGroupClass: STANDARD
  IngestionErrors:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref PipelineLogGroup
      FilterPattern: '{ $.level = "ERROR" }'
      MetricTransformations:
        - MetricName: IngestionErrors
          MetricNamespace: AnyCompany/Pipeline
          MetricValue: "1"
  IngestionErrorsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      Namespace: AnyCompany/Pipeline
      MetricName: IngestionErrors
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertsTopic
```

> **Exam trap.** A log group in the Essentials class can't host metric filters or subscription filters, and its class can't be changed. If alarms on log patterns are required, create the group as Standard.

<!-- section: notifications | objectives: 3.3.3 -->
## Sending alerts with notifications

| Signal | Path to the team |
| --- | --- |
| A metric crosses a threshold (Kinesis `GetRecords.IteratorAgeMilliseconds`, Lambda `Errors`, Redshift CPU, a metric filter count) | CloudWatch alarm, action to an SNS topic |
| A job or workflow changes state (Glue job `FAILED` or `TIMEOUT`, Step Functions execution failed, EMR step failed, crawler failed) | EventBridge rule to SNS, Lambda or a ticketing target |
| A Glue job runs longer than expected | Job delay notification threshold: Glue emits a "Glue Job Run Status" event |
| Service events (Redshift cluster events, DMS replication task failures) | The service's event notifications or subscriptions to SNS, or EventBridge |
| Several alarms describe one incident | Composite alarm, one notification |

SNS delivers to email, SMS, HTTPS endpoints, Lambda and SQS. Encrypt topics with KMS and restrict who can publish with a topic policy (EventBridge and CloudWatch need permission to publish to an encrypted topic's key).

```json
{
  "source": ["aws.glue"],
  "detail-type": ["Glue Job State Change"],
  "detail": {
    "jobName": ["sales-to-parquet"],
    "state": ["FAILED", "TIMEOUT"]
  }
}
```

> **Exam tip.** "Notify the team when any Glue job fails, without changing the job scripts" is an EventBridge rule on Glue Job State Change with an SNS target, not code in the job.

<!-- section: performance | objectives: 3.3.4 -->
## Troubleshooting performance issues

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Kinesis `WriteProvisionedThroughputExceeded` | Hot shard (skewed partition key) or too few shards | Better partition key, more shards, or on-demand mode |
| Lambda consumer `IteratorAge` rising | Function too slow or failing on a record | Parallelization factor, larger batches, fix errors with bisect and failure destination |
| DynamoDB throttling on one key | Hot partition | Write sharding, better key; CloudWatch Contributor Insights shows top keys |
| Athena query slow or costly | Full scans of CSV, many small files, no partition filter | Parquet, partitioning or projection, compaction; check with `EXPLAIN` |
| Redshift query slow | Skewed distribution, unsorted rows, stale statistics, queuing | Review `SVV_TABLE_INFO` (skew, unsorted, stats), `EXPLAIN`, Redshift Advisor, workload management queues, concurrency scaling |
| Glue job slow | Data skew, small files, too few workers, one large unsplittable file | Repartition, group small files, bigger or more workers, Auto Scaling; read the Spark UI and observability metrics |
| Firehose delivery delayed | Large buffer settings or failing transformation Lambda | Lower buffer size and interval, fix the function |

> **Exam trap.** Adding Glue workers does not help when one Spark task processes most of the data: the cause is data skew. Repartition or salt the skewed key; the Spark UI shows one long task among many short ones.

<!-- section: pipeline-maintenance | objectives: 3.3.6 -->
## Troubleshooting and maintaining Glue and EMR pipelines

**AWS Glue.**

| Error | Cause and fix |
| --- | --- |
| Driver out of memory | Too many small files listed by the driver: group input files, use a larger worker type |
| Executor out of memory | Wide transformations on large partitions: memory-optimized R workers, more partitions |
| Concurrent runs exceeded | A run started while the previous one is active: raise max concurrent runs or serialize |
| Job reprocesses or skips data | Job bookmarks disabled, or the script lacks `transformation_ctx` and `job.commit()`; reset or rewind the bookmark to reprocess |
| Job times out | Timeout too short (default 480 minutes from Glue 5.0) or job stuck: check metrics before raising it |
| Connection to a database fails | Glue connection subnet and security group (self-referencing rule), route or VPC endpoint to S3 |

**Job run insights** (`--enable-job-insights`) points to the failing script line and a recommended action; continuous logging shows progress during the run.

**Amazon EMR.** Read step logs (`stderr`, `syslog`, `controller`) under the cluster's S3 log URI or `/mnt/var/log/` on the nodes; check the cluster's state-change reason. Common causes: insufficient EC2 capacity or IP addresses in the subnet, missing permissions on the EMR roles, HDFS or disk full, YARN containers killed for memory. Maintenance: keep data in S3 (EMRFS) so transient clusters can be replaced, use managed scaling, pin release versions and test upgrades, and remember that EMR keeps details of terminated clusters for two months.

> **Exam tip.** "A Glue job processes the same files every night although bookmarks are enabled" points to a missing `job.commit()` or `transformation_ctx` in the script.

<!-- section: log-analysis | objectives: 3.3.8 -->
## Analyzing logs with AWS services

| Tool | Choose it when |
| --- | --- |
| **CloudWatch Logs Insights** | Interactive queries on log groups (also SQL and PPL), discovered fields for JSON logs, save and schedule queries; no infrastructure |
| **Athena** | Logs already in S3 (CloudTrail, ALB, VPC Flow Logs, S3 access logs, exported logs): SQL, joins with other data, long history at low cost |
| **Amazon OpenSearch Service** | Full-text search, near real-time dashboards (OpenSearch Dashboards) and anomaly detection on large log volumes |
| **Amazon EMR** | Very large volumes of big data application logs processed with Spark or Hive |

```text
fields @timestamp, level, jobName, message
| filter level = "ERROR"
| stats count(*) as errors by jobName, bin(1h)
| sort errors desc
| limit 20
```

> **Exam trap.** Logs Insights queries only log groups in CloudWatch Logs. "Query five years of CloudTrail files in S3 with SQL at the lowest cost" is Athena.

<!-- section: key-points -->
## Key points

- CloudTrail logs management events by default; data, network activity and Insights events must be enabled; event history covers 90 days; organization trails and integrity validation for audits.
- CloudTrail Lake is closed to new customers (May 31, 2026): use trails with S3 and Athena or CloudWatch for new designs.
- Exports to S3 are occasional (up to 12 hours of delay); subscriptions with Data Firehose are continuous.
- Turn on Glue continuous logging, EMR log URI, MWAA log types, Redshift audit logging plus `enable_user_activity_logging`.
- Log groups: set retention, choose the class at creation (Essentials has no metric or subscription filters), automate with the agent and CloudFormation.
- Alerts: CloudWatch alarms on metrics, EventBridge rules on state changes, SNS for delivery.
- Performance: hot shards and keys, small files, skew, stale Redshift statistics.
- Glue: memory, bookmarks, concurrency, job run insights; EMR: step logs in the S3 log URI.
- Logs Insights for log groups, Athena for logs in S3, OpenSearch for search and dashboards, EMR for huge volumes.
