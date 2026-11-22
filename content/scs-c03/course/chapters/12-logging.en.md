Logging questions ask which source records the evidence, where it is stored so that no workload account can alter it, how it reaches a central account and which tool queries, normalizes or correlates it. This chapter covers log sources and their destinations, organization trails and the log archive account, CloudWatch Logs centralization and subscriptions, Amazon Security Lake and third-party tools, analysis with Logs Insights, Athena and Security Hub, normalization with Lambda, CloudWatch Logs transformers, OpenSearch Service and Managed Grafana, and the network log sources chosen from the threat.

<!-- section: log-sources | objectives: 1.2.1 -->
## Log sources and where they can go

| Source | Records | On by default? | Destinations |
| --- | --- | --- | --- |
| CloudTrail management events | Control plane API calls (who, what, when, source IP) | Event history: 90 days, one Region view; a trail is needed to keep them | S3, CloudWatch Logs |
| CloudTrail data events | S3 object, Lambda invoke, DynamoDB item and other resource operations | No, selected per trail, charged | S3, CloudWatch Logs |
| CloudTrail network activity events | API calls through your VPC endpoints, including those denied by the endpoint policy (`VpceAccessDenied`) | No, per event source, charged | S3, CloudWatch Logs |
| VPC and transit gateway flow logs | IP flow metadata, accepted or rejected | No | CloudWatch Logs, S3, Amazon Data Firehose |
| Route 53 Resolver query logs | DNS queries from VPCs, through Resolver endpoints and matched by DNS Firewall | No | CloudWatch Logs, S3, Firehose |
| AWS WAF logs | Every inspected web request and the rule that matched | No | CloudWatch Logs, S3, Firehose (names starting with `aws-waf-logs-`) |
| AWS Network Firewall logs | Alert, flow and TLS logs | No | CloudWatch Logs, S3, Firehose |
| ELB access logs | Requests to the load balancer | No | S3 in the same Region (SSE-S3 only) |
| CloudFront standard logs | Viewer requests | No | CloudWatch Logs, Firehose, S3 |
| S3 server access logs | Requests to a bucket, best effort | No | Another bucket |
| EKS control plane logs | `api`, `audit`, `authenticator`, `controllerManager`, `scheduler` | No | CloudWatch Logs |
| Lambda, API Gateway, Bedrock invocation logs | Application output, API requests, prompts and responses | Lambda yes (role permitting); others no | CloudWatch Logs, S3, Firehose depending on the service |
| AWS Config | Configuration history and snapshots | When the recorder runs | S3 bucket of the delivery channel |

Choose the store from the requirement:

| Requirement | Store |
| --- | --- |
| Real-time alarms and metric filters, interactive queries | CloudWatch Logs (Standard log class) |
| Years of cheap, immutable retention | S3 with Object Lock, lifecycle to colder storage classes, SSE-KMS |
| Stream to a SIEM or third-party endpoint | Firehose (Splunk, HTTP endpoints, partner destinations) or a subscription filter |
| One normalized, queryable security data lake across accounts | Amazon Security Lake |

> **Exam trap.** Event history is not a log archive: it keeps 90 days of management events only and can't be made tamper-proof. Any retention, data event or organization requirement needs a trail.

<!-- section: organization-logging | objectives: 1.2.2 -->
## Organization trails, log archive account and centralized CloudWatch Logs

An **organization trail** is created in the management account or a CloudTrail delegated administrator account. Console-created organization trails are multi-Region; new member accounts are added automatically; members see the trail but can't stop, change or delete it. Store the files in a bucket of a dedicated **log archive account** (the AWS Control Tower layout), encrypted with a customer managed KMS key, with log file integrity validation and S3 Object Lock.

```bash
aws cloudtrail create-trail --name org-trail \
  --s3-bucket-name example-org-log-archive \
  --is-organization-trail --is-multi-region-trail \
  --enable-log-file-validation \
  --kms-key-id arn:aws:kms:eu-west-1:999988887777:key/1234abcd-12ab-34cd-56ef-1234567890ab \
  --cloud-watch-logs-log-group-arn arn:aws:logs:eu-west-1:111122223333:log-group:org-trail:* \
  --cloud-watch-logs-role-arn arn:aws:iam::111122223333:role/CloudTrailToCloudWatch
aws cloudtrail start-logging --name org-trail
```

The bucket policy allows `cloudtrail.amazonaws.com` to read the bucket ACL and to write under `AWSLogs/` followed by the management account ID and by the organization ID, each with `s3:x-amz-acl` set to `bucket-owner-full-control` and `aws:SourceArn` set to the trail ARN owned by the management account:

```json
{
  "Sid": "AWSCloudTrailOrganizationWrite",
  "Effect": "Allow",
  "Principal": { "Service": "cloudtrail.amazonaws.com" },
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::example-org-log-archive/AWSLogs/o-exampleorgid/*",
  "Condition": {
    "StringEquals": {
      "s3:x-amz-acl": "bucket-owner-full-control",
      "aws:SourceArn": "arn:aws:cloudtrail:eu-west-1:111122223333:trail/org-trail"
    }
  }
}
```

The KMS key policy must allow `cloudtrail.amazonaws.com` `kms:GenerateDataKey*` (scoped with the `kms:EncryptionContext:aws:cloudtrail:arn` condition), and readers need `kms:Decrypt`. Add an SCP that denies `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail` and `cloudtrail:PutEventSelectors` outside a break-glass role.

**A dedicated CloudWatch logging account** receives application and service logs from every account. Three mechanisms:

| Mechanism | How it works | Choose it when |
| --- | --- | --- |
| CloudWatch Logs centralization rules | From the management or delegated administrator account, rules copy new log data from source accounts, OUs or the whole organization and from selected Regions into a destination account and Region, with an optional backup Region | Native copy of log groups across the organization; trusted access for CloudWatch required; historical data isn't copied |
| Cross-account subscription | A subscription filter (or an account-level subscription policy) in each source account sends events to a **destination** in the central account, backed by Kinesis Data Streams or Firehose; the destination policy can allow the organization | Streaming to processing or a SIEM; the log group and the destination are in the same Region |
| CloudWatch telemetry enablement rules | Organization, OU or account rules that turn on telemetry automatically (VPC Flow Logs, EKS control plane logs, WAF logs, Route 53 Resolver logs, CloudTrail events, Security Hub CSPM findings) | Guarantee that new resources log from day one |

An account-level subscription policy uses `put-account-policy --policy-type SUBSCRIPTION_FILTER_POLICY`; exclude the log groups of the delivery pipeline with `selection-criteria` (`LogGroupName NOT IN [...]`) to avoid a recursive loop.

The **CloudWatch agent** ships OS and application logs from EC2 and on-premises servers; its configuration lists each file, its log group and stream, and is stored in Parameter Store for the whole fleet:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/secure",
            "log_group_name": "/servers/linux/secure",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 365
          }
        ]
      }
    }
  }
}
```

> **Exam trap.** A centralization rule only copies log data that arrives after the rule exists, and source log groups encrypted with a customer managed key are skipped unless you choose how to handle them. For a requirement to keep every account's history, plan the rule before the workloads, not after.

<!-- section: security-lake | objectives: 1.2.3 -->
## Amazon Security Lake and third-party tools

Security Lake builds a data lake in S3 buckets that you own, in the delegated administrator account. It collects natively supported sources through an independent, duplicated stream (your existing logging is unchanged), converts them to **Apache Parquet** and the **Open Cybersecurity Schema Framework (OCSF)**, and catalogs them in AWS Glue with one Lake Formation table per source.

- **Native sources**: CloudTrail management events and S3 and Lambda data events, Amazon EKS audit logs, Route 53 Resolver query logs, Security Hub CSPM findings, VPC Flow Logs and AWS WAF logs. Management events require CloudTrail logging to be configured.
- **Rollup Regions** consolidate data from contributing Regions, which helps with data residency requirements; retention and storage class transitions are set per Region.
- **Custom sources** (up to 50 per account): the third party writes OCSF (version 1.3 or earlier) in Parquet, one OCSF event class per source, under the prefix Security Lake assigns, using the provider role Security Lake creates.
- **Subscribers** consume data per source and Region, up to 10 sources each:

| Subscriber access | How it works | Typical subscriber |
| --- | --- | --- |
| Data access | Notified of new S3 objects through an SQS queue or an HTTPS endpoint, then reads the objects | A SIEM that ingests everything (Splunk, partners) |
| Query access | Queries the Lake Formation tables in place with Athena or another engine | Analysts, OpenSearch Service direct query, another account's Athena |

To send logs to a third-party tool without Security Lake: a Firehose stream (native Splunk and HTTP endpoint destinations), a CloudWatch Logs subscription, or S3 event notifications for a tool that reads the bucket.

**CloudTrail Lake** (event data stores queried in SQL) is closed to new customers since May 31, 2026; existing customers keep it, and AWS recommends migrating to CloudWatch, which can import event data store history (data from before 2023 isn't migrated) and ingest CloudTrail events live.

> **Exam tip.** "Normalize logs from many accounts and a third-party firewall into one open schema, with the LEAST effort to onboard a new SIEM" is Security Lake with an OCSF custom source and a subscriber. A bucket of raw logs plus Glue jobs works but carries the normalization work yourself.

<!-- section: log-analysis | objectives: 1.2.4 -->
## Analyzing logs with Logs Insights, Athena and Security Hub

**CloudWatch Logs Insights** queries one or many log groups, across accounts from a cross-account observability monitoring account, in Logs Insights QL, OpenSearch PPL or OpenSearch SQL. Billing is per GB of uncompressed data scanned; queries time out after 60 minutes; results are kept 7 days.

```text
fields @timestamp, userIdentity.arn, sourceIPAddress, errorCode
| filter eventSource = "iam.amazonaws.com" and errorCode = "AccessDenied"
| stats count(*) as denied by userIdentity.arn, sourceIPAddress
| sort denied desc
```

**Amazon Athena** queries logs in S3 with SQL: CloudTrail (the console creates the table), ALB, CloudFront, VPC Flow Logs, WAF logs and Security Lake tables. Use partition projection on account, Region and date so that queries scan only the days needed.

```text
SELECT eventtime, useridentity.arn, eventname, sourceipaddress
FROM cloudtrail_logs
WHERE eventsource = 's3.amazonaws.com'
  AND eventname IN ('PutBucketPolicy', 'DeleteBucketPolicy', 'PutBucketAcl')
  AND timestamp >= '2026/11/01'
ORDER BY eventtime DESC
```

**Security Hub findings** are analyzed in the console with filters and groupings (by resource, account, severity or finding type), in Security Hub CSPM with insights, and programmatically through each service's API. Security Hub findings use OCSF; Security Hub CSPM findings use ASFF.

| Requirement | Tool |
| --- | --- |
| Investigate last hour's Lambda errors or a sign-in spike | Logs Insights |
| SQL over months of CloudTrail or flow logs in S3, lowest cost | Athena with partitions |
| Which exposed resources to fix first | Security Hub exposures |
| Visual entity investigation, behavior graphs | Amazon Detective (chapter 22) |

> **Exam trap.** Logs Insights only sees log groups in CloudWatch Logs and charges per GB scanned; for seven years of trail files already in S3, Athena is the cost-effective answer. Neither alerts by itself: alarms come from metric filters, Logs Insights scheduled queries or EventBridge.

<!-- section: log-normalization | objectives: 1.2.5 -->
## Normalizing, parsing and correlating logs

| Need | Service | How |
| --- | --- | --- |
| Parse and enrich at ingestion, no code | CloudWatch Logs transformers | Processors per log group or account: built-in parsers (`parseVPC`, `parseWAF`, `parseCloudfront`, `parseRoute53`, `parsePostgres`), Grok, JSON and string mutation, type conversion, added account and Region keys; Standard log class only; original and transformed events both kept |
| Custom parsing or redaction in a stream | AWS Lambda | Subscription filter target, or Firehose data transformation before delivery to S3, OpenSearch Service or a third party |
| Search, correlation rules, threat detection on indexed logs | Amazon OpenSearch Service | OpenSearch Ingestion pipelines, Security Analytics (detectors with Sigma rules mapped to MITRE ATT&CK, OpenSearch 2.5 or later), direct query of Security Lake in place |
| Shared dashboards across many data sources | Amazon Managed Grafana | Workspaces with CloudWatch, OpenSearch Service, Athena, X-Ray, Timestream and Managed Service for Prometheus data sources; users from IAM Identity Center or a SAML 2.0 identity provider |

Correlation joins events by a common key: the access key ID or role session in CloudTrail, the ENI or IP address in flow logs, the query name in Resolver logs. OCSF in Security Lake gives every source the same field names, so a single query can join DNS, network and API activity.

> **Exam trap.** Transformers apply only to events ingested after they exist and only to Standard log class groups. A log group created in the Essentials class (formerly Infrequent Access) also has no metric filters, subscription filters or Live Tail, and its class can't be changed: recreate it in Standard.

<!-- section: network-log-sources | objectives: 1.2.6 -->
## Choosing network log sources from the design and the threat

| Threat or question | Log source |
| --- | --- |
| Port scans, rejected connections, unexpected outbound flows | VPC Flow Logs at VPC, subnet or ENI level, with `action` and `tcp-flags` |
| Traffic between VPCs or to on-premises through a hub | Transit gateway flow logs (`tgw-attachment-id`, `packets-lost-no-route`, `packets-lost-blackhole`) |
| DNS tunneling, queries to malicious domains, data exfiltration by DNS | Route 53 Resolver query logs, DNS Firewall rules in alert or block mode |
| Payload-level alerts on east/west or egress traffic | Network Firewall alert logs |
| Web exploits, bots, rate-based blocks | AWS WAF logs |
| Use of your VPC endpoints by principals outside the organization | CloudTrail network activity events |

**VPC Flow Logs**: the default format is version 2 (`version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status`). A custom format adds fields such as `vpc-id`, `subnet-id`, `pkt-srcaddr`, `pkt-dstaddr` (original addresses behind a NAT gateway or load balancer), `tcp-flags`, `flow-direction` and `traffic-path`. The maximum aggregation interval is 10 minutes by default or 1 minute; Nitro instances aggregate at 1 minute or less. Flow logs don't affect throughput or latency.

```bash
aws ec2 create-flow-logs --resource-type VPC --resource-ids vpc-0a1b2c3d4e5f67890 \
  --traffic-type ALL --max-aggregation-interval 60 \
  --log-destination-type s3 --log-destination arn:aws:s3:::example-flow-logs \
  --log-format '${version} ${account-id} ${vpc-id} ${interface-id} ${pkt-srcaddr} ${pkt-dstaddr} ${srcport} ${dstport} ${protocol} ${tcp-flags} ${action} ${flow-direction}'
```

Flow logs don't record: traffic to the Amazon DNS server (use Resolver query logs), instance metadata (`169.254.169.254`), Amazon Time Sync, DHCP, Windows license activation, ARP, traffic to the reserved VPC router address, or mirrored source traffic. A flow log's format and IAM role can't be changed after creation: delete and recreate it.

**Route 53 Resolver query logs** (Route 53 VPC Resolver in current documentation) record unique queries only: a repeated query answered from the cache within the TTL isn't logged. A query logging configuration is associated with VPCs and can be shared with other accounts through AWS RAM.

> **Exam trap.** "Identify which instance resolved a known malicious domain" can't be answered with flow logs, which never show queries to the Amazon DNS server. It's Resolver query logs, or GuardDuty, which already analyzes DNS logs for its findings.

<!-- section: key-points -->
## Key points

- Event history is 90 days of management events; trails add retention, data events and network activity events; data and network events are opt-in and charged.
- Organization trail from the management or delegated administrator account, to a log archive bucket with SSE-KMS, integrity validation, Object Lock and an SCP protecting the trail.
- Central CloudWatch logging: centralization rules (new data only), cross-account destinations with Kinesis or Firehose, account-level subscription policies, telemetry enablement rules.
- Security Lake: OCSF and Parquet, native sources, rollup Regions, custom sources in OCSF 1.3 or earlier, data access or query access subscribers. CloudTrail Lake is closed to new customers.
- Logs Insights for recent CloudWatch logs, Athena for S3 history, Security Hub for findings (OCSF; CSPM in ASFF).
- Transformers, Lambda, OpenSearch Security Analytics and Managed Grafana normalize, correlate and visualize.
- Flow logs miss DNS to the Amazon resolver and metadata traffic; Resolver query logs skip cached answers; transit gateway flow logs show drops by cause.
