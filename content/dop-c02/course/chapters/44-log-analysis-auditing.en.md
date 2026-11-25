Audit questions ask where a piece of evidence lives and which service turns it into an answer: a vulnerable package (Amazon Inspector), a resource that drifted from policy (AWS Config rules), an API call and who made it (AWS CloudTrail), a pattern that must be spotted while logs are still flowing (Kinesis Data Streams), or a question over months of stored logs (Amazon Athena, CloudWatch Logs Insights). Pick the managed option that answers with the least custom code and that works across every account of the organization.

<!-- section: inspector-scanning | objectives: 4.2.3 -->
## Amazon Inspector: automated vulnerability scanning

The exam guide still says "assessment templates". Those belonged to **Amazon Inspector Classic**, which was shut down on May 20, 2026. Current Amazon Inspector has no templates, no assessment runs and no Inspector agent: once activated, it discovers resources and scans them automatically and continuously.

| Resource | How it is scanned | When it is rescanned |
| --- | --- | --- |
| EC2 instance, agent-based | Through **SSM Agent**: the instance must be a Systems Manager managed instance (instance profile with `AmazonSSMManagedInstanceCore`, or Default Host Management Configuration) | At launch, when software is installed, when a new relevant CVE is published |
| EC2 instance, agentless | **Hybrid** scan mode: Inspector snapshots the EBS volumes of instances that aren't SSM managed, reads them through the EBS direct APIs, then deletes the snapshots | Every 24 hours |
| EC2 network exposure | Network reachability analysis (security groups, route tables, gateways) | Every 12 hours |
| ECR container image | **Enhanced scanning**: Inspector set as the registry's scanning service, OS and programming-language packages | On push, or **continuous** (push, new CVE, image moved back from archived) for the configured re-scan duration |
| Lambda function | **Standard scanning**: dependencies in the function and its layers. **Code scanning** (requires standard): vulnerabilities in your own code | At deployment, on code or layer update, on a new CVE |

Operating it at scale:

- **Organizations**: designate a **delegated administrator** account. It activates scan types for members and auto-activates new accounts, and sees every finding.
- **Findings**: package vulnerability, code vulnerability, network reachability, each with an Inspector score that adjusts the CVSS score to your environment. **Suppression rules** hide accepted findings by criteria.
- **Integrations**: every finding is published to **EventBridge** (source `aws.inspector2`) and to AWS Security Hub. Export findings or a **software bill of materials (SBOM)** to an S3 bucket encrypted with a KMS key.
- **Exclusions**: tag an EC2 instance with `InspectorEc2Exclusion`; excluded resources produce no findings and no charges.
- **Pipelines**: the `inspector-sbomgen` tool and the Inspector Scan `ScanSbom` API scan an image in CodeBuild before it is pushed, so a build can fail on critical CVEs.

```json
{
  "source": ["aws.inspector2"],
  "detail-type": ["Inspector2 Finding"],
  "detail": {
    "severity": ["CRITICAL"],
    "status": ["ACTIVE"]
  }
}
```

> **Exam trap.** An option that installs the Inspector agent, creates an assessment target and schedules an assessment template describes Inspector Classic, which no longer exists. The current answer is "activate Amazon Inspector (through the delegated administrator) and make the instances SSM managed".

> **Exam trap.** ECR **basic** scanning (provided by Amazon ECR, scan on push or manual) doesn't rescan when a new CVE appears. "Rescan existing images automatically when new vulnerabilities are published" requires Inspector **enhanced** scanning with **continuous** frequency. Instances missing from Inspector coverage are usually not SSM managed: check SSM Agent, the instance profile and, in private subnets, the VPC endpoints for Systems Manager.

<!-- section: config-rules | objectives: 4.2.4 -->
## AWS Config rules

AWS Config records **configuration items** for supported resources (the configuration recorder, with continuous or daily recording) and delivers history and snapshots to an S3 bucket. **Rules** evaluate those configurations and mark each resource `COMPLIANT`, `NON_COMPLIANT`, `NOT_APPLICABLE` or `ERROR`. Without the recorder, change-triggered rules have nothing to evaluate.

| Rule type | Written as | Use it when |
| --- | --- | --- |
| AWS managed rule | Predefined identifier with parameters (`REQUIRED_TAGS`, `ENCRYPTED_VOLUMES`, `S3_BUCKET_PUBLIC_READ_PROHIBITED`, `CLOUD_TRAIL_ENABLED`, `INCOMING_SSH_DISABLED`) | A managed rule exists: always the first choice |
| Custom Lambda rule | A Lambda function that receives the configuration item and calls `PutEvaluations` | Logic that needs code or calls to other APIs |
| Custom policy rule | AWS CloudFormation Guard DSL, no function to maintain | Property checks that a declarative rule can express |

**Triggers**: configuration changes (scope by resource type, resource ID or tag), **periodic** (1, 3, 6, 12 or 24 hours), or both. **Evaluation modes**: **detective** evaluates deployed resources; **proactive** evaluates a resource definition before it is deployed (through the `StartResourceEvaluation` API, for example from a pipeline step) but doesn't block or remediate by itself.

Scaling across accounts:

| Need | Feature |
| --- | --- |
| Same rule in every account of the organization | **Organization Config rule**, from the management or delegated administrator account |
| A set of rules (and remediations) deployed as one unit, with a compliance score | **Conformance pack** (YAML template), or **organization conformance pack** |
| One read-only view of compliance for many accounts and Regions | **Aggregator** in a central account |
| React to compliance changes | EventBridge rule on source `aws.config`, detail-type `Config Rules Compliance Change` |

> **Exam trap.** An aggregator only collects and displays: it doesn't deploy rules nor remediate. To enforce a rule everywhere, use organization rules or organization conformance packs. A Config rule only detects; the fix comes from a remediation action (see chapter 45).

> **Exam tip.** Config answers "what was this resource's configuration, and was it compliant, at a given time". CloudTrail answers "who changed it". The resource timeline in Config links each configuration change to the CloudTrail event that caused it.

<!-- section: cloudtrail-events | objectives: 4.2.5 -->
## AWS CloudTrail log events

| Event type | Logged by default | Examples |
| --- | --- | --- |
| Management events | Yes | `CreateTrail`, `AttachRolePolicy`, `RunInstances`, `ConsoleLogin` |
| Data events | No, selected per resource type (charged) | S3 `GetObject` and `PutObject`, Lambda `Invoke`, SNS `Publish` |
| Network activity events | No | API calls made through VPC endpoints from a private VPC |
| Insights events | No, enabled on the trail | Unusual API call rate or API error rate on write management events |

- **Event history**: the last 90 days of management events, per Region, free and immutable. Anything longer, data events or analysis needs a **trail**.
- **Trails**: a multi-Region trail is the console default and the recommended choice; an **organization trail** logs the management account and all members, and members can't modify or delete it. **Advanced event selectors** narrow data events (one bucket, only `DeleteObject`) to control cost.
- **Protection**: SSE-KMS encryption of log files, a dedicated bucket in a log archive account, S3 Object Lock or MFA Delete, and **log file integrity validation**: an hourly digest file holds a SHA-256 hash of every log file and is signed with SHA-256 with RSA.
- **Reacting**: deliver the trail to a CloudWatch Logs log group for metric filters and alarms, or match the events in EventBridge.

Fields used in filters and queries: `eventSource`, `eventName`, `userIdentity` (`type`, `arn`), `sourceIPAddress`, `errorCode`, `requestParameters`, `recipientAccountId`.

```bash
aws cloudtrail validate-logs \
  --trail-arn arn:aws:cloudtrail:us-east-1:111122223333:trail/org-trail \
  --start-time 2026-11-01T00:00:00Z
```

> **Exam trap.** EventBridge receives `AWS API Call via CloudTrail` events only if a trail with logging is enabled, and only on the **default** event bus. A rule in the default `ENABLED` state matches write management events; read-only events (`Get*`, `Describe*`, `List*`) need the rule state `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`.

> **Exam tip.** CloudTrail Lake is closed to new customers (since May 31, 2026). For SQL over CloudTrail history in a new design, query the trail's S3 files with Athena or send the trail to CloudWatch Logs and use Logs Insights.

<!-- section: real-time-log-streams | objectives: 4.2.9 -->
## Analyzing real-time log streams

A **subscription filter** on a CloudWatch Logs log group streams matching events, gzip-compressed, to Kinesis Data Streams, Amazon Data Firehose, Lambda or OpenSearch Service, usually within minutes of ingestion. Facts that decide answers:

- Up to **five** subscription filters per log group, plus **one account-level** subscription filter per Region; Standard log class only.
- Delivery is at least once; retryable errors are retried for up to 24 hours.
- Cross-account centralization: the central account creates a CloudWatch Logs **destination** (`put-destination`) in front of its stream, with a destination policy allowing the source accounts; each source account subscribes its log groups to that destination ARN.

| Requirement | Destination and consumer |
| --- | --- |
| Several independent consumers, replay of recent records, custom processing order | **Kinesis Data Streams**, with Lambda (event source mapping), KCL applications or enhanced fan-out consumers |
| Windowed aggregations and real-time anomaly detection with SQL or Java | Kinesis Data Streams → **Amazon Managed Service for Apache Flink** |
| Load into S3, OpenSearch Service or a partner tool with no code, optional Lambda transformation and Parquet conversion | **Amazon Data Firehose** |
| Simple action on each matching event | Lambda directly |

**Kinesis Data Streams** capacity: in provisioned mode each shard ingests 1 MB/s or 1,000 records/s and serves 2 MB/s of reads shared by standard consumers (each enhanced fan-out consumer gets its own 2 MB/s per shard); on-demand mode scales automatically. Retention is 24 hours by default, extendable up to 365 days.

```bash
aws logs put-subscription-filter \
  --log-group-name /app/payments \
  --filter-name to-kinesis \
  --filter-pattern '{ $.level = "ERROR" }' \
  --destination-arn arn:aws:kinesis:eu-west-1:111122223333:stream/log-stream \
  --role-arn arn:aws:iam::111122223333:role/CWLtoKinesisRole
```

> **Exam trap.** Firehose is a delivery service, not a stream you can replay or read with several consumers. "Multiple applications must process the same log records in real time" points to Kinesis Data Streams; "deliver the logs to S3 or OpenSearch with the least operational overhead" points to Firehose.

<!-- section: log-analysis-services | objectives: 4.2.10 -->
## Analyzing logs with Athena and CloudWatch Logs Insights

| Requirement | Service |
| --- | --- |
| Interactive troubleshooting of recent logs already in CloudWatch Logs | **CloudWatch Logs Insights** |
| SQL over months or years of logs stored in S3 (CloudTrail, ALB, VPC Flow Logs, CloudFront, S3 access logs) | **Amazon Athena** |
| Full-text search and dashboards on log data | Amazon OpenSearch Service |
| A query that must run on a schedule and send its result | Logs Insights **scheduled query** (results to S3 or EventBridge) |

**Logs Insights** queries one or more log groups (including other accounts' through cross-account observability) with Logs Insights QL, OpenSearch PPL or OpenSearch SQL. Fields are discovered automatically for CloudTrail, VPC Flow Logs, Lambda, Route 53 and any JSON log. Queries time out after 60 minutes, results stay 7 days, and you pay for the uncompressed data scanned: narrow the time range and the log groups. Save frequent queries and add them to dashboards.

```text
fields @timestamp, eventName, userIdentity.arn, sourceIPAddress
| filter errorCode = "AccessDenied"
| stats count(*) as denied by userIdentity.arn, eventName
| sort denied desc
| limit 20
```

**Athena** queries files in place in S3 through a table in the AWS Glue Data Catalog. The CloudTrail console can create the table for a trail; a Glue crawler can infer others. Reduce the data scanned (and the cost) with **partition projection** on date and Region, columnar formats (Parquet, for example through Firehose record format conversion) and **workgroups** that cap the data scanned per query.

```text
SELECT useridentity.arn, eventname, sourceipaddress, eventtime
FROM cloudtrail_logs
WHERE eventsource = 'iam.amazonaws.com'
  AND eventname IN ('CreateAccessKey', 'AttachUserPolicy')
  AND eventtime >= '2026-11-01T00:00:00Z'
ORDER BY eventtime DESC;
```

> **Exam trap.** Logs Insights only reads CloudWatch Logs. When the logs live in S3 (ALB access logs, a log archive bucket fed by an organization trail), the serverless answer is Athena, not copying the files back into CloudWatch Logs.

<!-- section: key-points -->
## Key points

- Inspector today: activate it (delegated administrator for the organization), EC2 through SSM Agent or agentless hybrid mode, ECR enhanced continuous scanning, Lambda standard and code scanning; findings to EventBridge and Security Hub. Assessment templates = Inspector Classic, shut down.
- Config: recorder first; managed rule before custom Lambda or Guard rule; change-triggered or periodic; organization rules and conformance packs enforce, aggregators only display.
- CloudTrail: management events by default, data and network activity events opt-in; organization trail, SSE-KMS, integrity validation with hourly digests; EventBridge needs a trail, and read-only events need `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`.
- Real-time logs: subscription filters (five per log group) to Kinesis Data Streams for multiple consumers and Flink analytics, to Firehose for no-code delivery; cross-account through a Logs destination.
- Logs in CloudWatch Logs → Logs Insights; logs in S3 → Athena with partition projection and workgroups.
