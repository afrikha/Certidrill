Once logs are collected, the exam asks where they go, how fast, who can read or delete them, how they are encrypted, how long they are kept and how to find one event among billions. This chapter covers real-time ingestion paths and log classes, encryption at rest and in transit, KMS keys on log groups, tamper-resistant storage, retention and lifecycle, subscription filters that stream logs to Kinesis, Firehose, Lambda and OpenSearch Service, and searching with filter patterns and CloudWatch Logs Insights.

<!-- section: real-time-ingestion | objectives: 4.1.3 -->
## Real-time log ingestion

| Source | Path into AWS |
| --- | --- |
| Lambda | Automatic to CloudWatch Logs (`/aws/lambda/<function>` by default, or a custom log group), text or JSON format |
| EC2 and on premises | CloudWatch agent tailing files and Windows event logs |
| ECS and EKS | `awslogs` log driver, or FireLens / Fluent Bit (to CloudWatch Logs, Firehose, Kinesis Data Streams, OpenSearch Service); the CloudWatch Observability add-on on EKS |
| AWS services | Vended logs (VPC Flow Logs, Route 53 query logs, API Gateway access logs) to CloudWatch Logs, S3 or Firehose |
| Applications at high volume | `PutLogEvents` (batch up to 1 MB, events up to 1,024 KB), or directly to Kinesis Data Streams or Firehose |

| Need | Choose |
| --- | --- |
| Consumers process each record within seconds, replay possible | **Kinesis Data Streams** (retention 24 hours by default, extendable), consumed by Lambda, Managed Service for Apache Flink or KCL applications |
| Load logs into S3, OpenSearch Service, Redshift or a partner with no code | **Amazon Data Firehose** (buffers by size and time, so near real time; optional Lambda transformation and format conversion) |
| Watch events arrive while debugging | CloudWatch Logs **Live Tail** (console or `aws logs start-live-tail`) |
| Route events from CloudWatch Logs onward as they arrive | Subscription filters (see below) |

**Log classes**, chosen at creation and **never changeable** afterwards:

| Class | Use | Missing features |
| --- | --- | --- |
| Standard | Logs used for real-time monitoring and alerting | None |
| Infrequent Access (being renamed **Essentials**) | Lower ingestion price for logs queried occasionally | Metric filters, subscription filters, Live Tail, anomaly detection, embedded metric format, `GetLogEvents` and `FilterLogEvents` (query with Logs Insights instead) |
| Delivery | Lambda logs delivered on to S3 or Firehose only | Kept two days, no Logs Insights |

> **Exam trap.** A log group created in the Infrequent Access (Essentials) class can't feed a metric filter, a subscription filter or EMF metrics, and it can't be switched to Standard. Create a new Standard log group and point the source to it.

<!-- section: encryption-options | objectives: 4.1.4 -->
## Encryption options for logs and metrics

| Data | At rest | In transit |
| --- | --- | --- |
| CloudWatch metrics and alarms | Always encrypted, AWS owned keys | TLS to the CloudWatch endpoints |
| CloudWatch Logs | Always encrypted (AES-GCM); optionally a **customer managed KMS key per log group** | TLS; interface VPC endpoint to stay off the internet |
| S3 log archives | SSE-S3 by default; SSE-KMS for key control and audit; bucket policy can deny non-TLS requests (`aws:SecureTransport`) | TLS |
| CloudTrail log files | SSE-S3 by default; SSE-KMS with a key whose policy allows CloudTrail | TLS |
| Kinesis Data Streams | Server-side encryption with a KMS key, turned on per stream | TLS |
| Amazon Data Firehose | Server-side encryption with KMS; destination encryption (SSE-KMS on S3) | TLS |
| OpenSearch Service | Encryption at rest with KMS, node-to-node encryption, HTTPS required | TLS |

**Server-side versus client-side**: server-side encryption is done by the service after it receives the data, so it can still search, filter and index it. **Client-side** encryption (for example with the AWS Encryption SDK) protects a sensitive field before it is logged; the service never sees the plaintext, so that field can't be searched or turned into a metric. For sensitive values that must stay searchable by a few people, use CloudWatch Logs **data protection** masking instead.

<!-- section: log-encryption-kms | objectives: 4.1.13 -->
## Encrypting CloudWatch Logs with AWS KMS

```bash
aws logs create-log-group --log-group-name /app/payments \
  --kms-key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab

aws logs associate-kms-key --log-group-name /app/orders \
  --kms-key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
```

The key policy must allow the **Regional** CloudWatch Logs principal, scoped with the encryption context:

```json
{
  "Sid": "AllowCloudWatchLogs",
  "Effect": "Allow",
  "Principal": { "Service": "logs.eu-west-1.amazonaws.com" },
  "Action": ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"],
  "Resource": "*",
  "Condition": {
    "ArnLike": { "kms:EncryptionContext:aws:logs:arn": "arn:aws:logs:eu-west-1:111122223333:log-group:*" }
  }
}
```

| Fact | Detail |
| --- | --- |
| Key type | **Symmetric** customer managed key in the same Region as the log group |
| Console | Can't associate a key with an existing log group: use the CLI, API or CloudFormation (`KmsKeyId`) |
| Delay | Association or disassociation takes effect within five minutes |
| Disassociate | New events use the default encryption; old events stay encrypted with the key |
| Key disabled, deleted or access revoked | CloudWatch Logs can't read the data encrypted with it: it becomes unretrievable |
| Readers | Need `kms:Decrypt` on the key in addition to `logs:` read permissions |

> **Exam trap.** "Associating the key fails with an access error" is a key policy that doesn't name `logs.<region>.amazonaws.com` or whose encryption context condition doesn't match the log group ARN. Granting the role `kms:*` doesn't fix a missing key policy statement for the service.

<!-- section: secure-log-storage | objectives: 4.1.6 -->
## Securely storing and managing logs

Typical multi-account design (the AWS Control Tower pattern): a dedicated **Log Archive account** receives CloudTrail organization trail files, AWS Config history and application logs; workload teams can't delete or change them.

| Control | Protects against |
| --- | --- |
| Organization trail with **log file integrity validation** (SHA-256 digest files, check with `aws cloudtrail validate-logs`) | Undetected modification or deletion of CloudTrail files |
| S3 **Object Lock** in **compliance** mode (default retention on the bucket; requires versioning) | Deletion by anyone, root included, during the retention period; governance mode can be bypassed with `s3:BypassGovernanceRetention` |
| Bucket policy: allow writes only from the service principals with `aws:SourceArn` / `aws:SourceOrgID`, deny `s3:DeleteObject`, deny non-TLS | Tampering and confused deputy |
| SCP denying `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail`, `logs:DeleteLogGroup`, `logs:DisassociateKmsKey` outside an admin role | A member account turning off its own audit trail |
| KMS key in the Log Archive account, separate key administrators and users | One compromised identity reading and destroying logs |
| CloudWatch Logs **data protection policy** (log group or account level) | Exposure of PII and credentials: matching data is masked; only principals with `logs:Unmask` see it |
| Cross-account observability or subscription destinations instead of shared credentials | Copying keys between accounts |

```json
{
  "Sid": "DenyAuditTampering",
  "Effect": "Deny",
  "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail", "logs:DeleteLogGroup"],
  "Resource": "*",
  "Condition": { "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityAdmin" } }
}
```

<!-- section: log-lifecycle | objectives: 4.1.10 -->
## Managing log storage lifecycles

**CloudWatch Logs retention** is set per log group, from 1 day to 10 years (3,653 days) in fixed steps, or **never expire**, which is the default. Log groups created automatically (Lambda, many AWS services) start with never expire.

```bash
aws logs put-retention-policy --log-group-name /aws/lambda/checkout --retention-in-days 30
```

Enforcing retention at scale:

- Set `RetentionInDays` in every `AWS::Logs::LogGroup` template, and create Lambda log groups in the template so they aren't created automatically without retention.
- Detect: AWS Config managed rule `cw-loggroup-retention-period-check` (non-compliant if retention is shorter than `MinRetentionTime`, 365 days by default). Remediate with a Systems Manager Automation runbook.
- React: an EventBridge rule on the CloudTrail event `CreateLogGroup` invokes a Lambda function that calls `PutRetentionPolicy`.

**Moving logs to S3** for cheap long-term storage:

| Method | Behavior |
| --- | --- |
| `create-export-task` | One-off batch; data can take up to 12 hours to be exportable; one active export task per account; SSE-S3 or SSE-KMS buckets; bucket policy for `logs.<region>.amazonaws.com`. AWS doesn't recommend it for continuous archiving |
| Subscription filter to Firehose to S3 | Continuous, near real time, compressed, partitioned by prefix: the recommended archive path |
| Vended logs straight to S3 | VPC Flow Logs, ALB access logs, CloudTrail: delivered to the bucket with no log group to manage |

**S3 lifecycle rules** then tier and expire the archive: transition to S3 Standard-IA (objects at least 30 days old), S3 Glacier Instant Retrieval, S3 Glacier Flexible Retrieval or S3 Glacier Deep Archive, then expire. Mind minimum storage durations (30 days for Standard-IA, 90 for Glacier Instant and Flexible Retrieval, 180 for Deep Archive) and per-object transition charges for millions of small log files.

```json
{
  "Rules": [{
    "ID": "app-logs-tiering",
    "Filter": { "Prefix": "app-logs/" },
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "Expiration": { "Days": 2555 }
  }]
}
```

> **Exam tip.** "Keep logs searchable for 30 days and archived cheaply for seven years" is a 30-day log group retention plus a subscription filter to Firehose to S3 with lifecycle rules (and Object Lock if they must be immutable).

<!-- section: log-subscriptions | objectives: 4.1.11 -->
## Processing log data with CloudWatch Logs subscriptions

A **subscription filter** sends matching events of a log group, as they are ingested, to a destination. Up to **5** per log group, Standard class only.

| Destination | Typical use | Permission |
| --- | --- | --- |
| Kinesis Data Streams | Custom real-time processing, several consumers, replay | Role trusted by `logs.amazonaws.com` with `kinesis:PutRecord` |
| Amazon Data Firehose | Delivery to S3, OpenSearch Service, Redshift, Splunk or HTTP endpoints | Role with `firehose:PutRecord` |
| Lambda | Per-event logic: alert, enrich, forward to a ticketing tool | `lambda add-permission` for `logs.amazonaws.com` |
| OpenSearch Service | Full-text search and dashboards on recent logs | Created from the console; the domain ARN and endpoint |

Data arrives **gzip-compressed** (base64-encoded in the `awslogs.data` field for Lambda), as JSON with `owner`, `logGroup`, `logStream`, `subscriptionFilters`, `messageType` and `logEvents`. Throttled deliveries to Kinesis are retried for up to 24 hours, then dropped (`DeliveryThrottling` metric); set the distribution to `Random` to spread load across shards.

```bash
aws logs put-subscription-filter --log-group-name /app/checkout \
  --filter-name errors-to-kinesis \
  --filter-pattern '{ $.level = "ERROR" }' \
  --destination-arn arn:aws:kinesis:eu-west-1:111122223333:stream/app-errors \
  --role-arn arn:aws:iam::111122223333:role/CWLtoKinesis \
  --distribution Random
```

**Centralizing across accounts**: in the central account create a Kinesis Data Streams or Firehose stream, a role that CloudWatch Logs can assume, a **destination** (`put-destination`) in the same Region as the source log groups, and a destination access policy (`put-destination-policy`) allowing `logs:PutSubscriptionFilter` from the source accounts or the whole organization (`aws:PrincipalOrgID`). Each source account then creates subscription filters whose `destination-arn` is the destination ARN.

**Account-level subscription filter policy** (`put-account-policy --policy-type SUBSCRIPTION_FILTER_POLICY`) applies one filter to every log group of the account, to Kinesis Data Streams, Firehose or Lambda. Use `--selection-criteria 'LogGroupName NOT IN [...]'` to exclude the log groups written by the delivery chain itself, or the subscription creates a recursive loop that multiplies ingestion costs.

> **Exam trap.** An account-wide subscription whose delivery chain writes its own logs to CloudWatch Logs (a Firehose error log group, a forwarding function's log group) feeds itself. Exclude those log groups with the selection criteria; an account-level policy already skips the destination Lambda function's own log group.

<!-- section: log-search | objectives: 4.1.12 -->
## Searching logs with filter patterns and CloudWatch Logs Insights

**Filter pattern syntax** is shared by metric filters, subscription filters, `FilterLogEvents` and Live Tail. It is case sensitive.

| Pattern | Matches |
| --- | --- |
| `ERROR` | Events containing ERROR |
| `ERROR timeout` | Both terms |
| `?ERROR ?WARN` | Either term |
| `ERROR -healthcheck` | ERROR but not healthcheck |
| `"Internal Server Error"` | The exact phrase |
| `%5\d\d%` | Regular expression (no parentheses) |
| `{ $.status >= 500 && $.path = "/pay*" }` | JSON fields, numeric and string comparisons |
| `[ip, user, ..., status=5*, bytes]` | Space-delimited fields, `...` skips fields |

```bash
aws logs filter-log-events --log-group-name /app/checkout \
  --filter-pattern '{ $.level = "ERROR" }' --start-time 1764000000000

aws logs tail /app/checkout --follow --filter-pattern ERROR
```

**CloudWatch Logs Insights** queries one or many log groups (including source accounts from a monitoring account) with its own query language, OpenSearch PPL or OpenSearch SQL. Fields of JSON logs and of AWS service logs (Lambda, CloudTrail, VPC Flow Logs, Route 53) are discovered automatically. Queries time out after 60 minutes, results are kept 7 days, up to 100 Logs Insights QL queries run concurrently, and billing is per GB scanned: narrow the time range and log groups.

```text
fields @timestamp, @message
| filter level = "ERROR" and service = "payment"
| parse @message "orderId=* amount=*" as orderId, amount
| stats count(*) as errors by bin(5m), errorCode
| sort errors desc
| limit 20
```

```text
filter @type = "REPORT"
| stats avg(@duration), max(@maxMemoryUsed / 1000 / 1000) as maxMemMB by bin(1h)
```

| Requirement | Tool |
| --- | --- |
| Count matching events continuously and alarm | Metric filter |
| Ad hoc investigation, aggregation, parsing across log groups | Logs Insights (save the query; add it to a dashboard) |
| Search history older than the retention period | Athena over the S3 archive |
| Watch a deployment live | Live Tail or `aws logs tail --follow` |

<!-- section: key-points -->
## Key points

- Kinesis Data Streams for real-time processing and replay, Firehose for no-code delivery; log class is fixed at creation and only Standard supports metric filters, subscriptions, Live Tail and EMF.
- Logs and metrics are always encrypted at rest; a customer managed symmetric KMS key per log group needs a key policy for `logs.<region>.amazonaws.com` with the `aws:logs:arn` encryption context; a disabled key makes logs unreadable.
- Secure storage: Log Archive account, organization trail with integrity validation, Object Lock compliance mode, SCPs against tampering, data protection masking with `logs:Unmask`.
- Retention defaults to never expire: set it in templates, check it with AWS Config, archive through Firehose to S3 with lifecycle rules; export tasks are for one-off copies.
- Subscription filters: up to 5 per log group, gzip JSON, destinations Kinesis, Firehose, Lambda, OpenSearch Service; cross-account through a destination with an access policy; account-level policies with exclusions against recursion.
- Filter patterns for metric and subscription filters and quick searches; Logs Insights for queries, 60-minute timeout, results kept 7 days.
