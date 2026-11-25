Security monitoring questions on DOP-C02 are automation questions: which service already produces the evidence or finding, how to make that evidence complete and tamper-proof across every account and Region, and which event pattern, alarm or query turns it into an alert or an answer with the least custom code. This chapter covers auditing and detection services, the common threats the exam names, an organization-wide audit design, alerting, logging and analysis.

<!-- section: auditing-services | objectives: 6.3.1 -->
## Security auditing services

Each auditing service answers a different question:

| Question | Service | What it records |
| --- | --- | --- |
| Who called which API, when, from where | AWS CloudTrail | Management events (control plane), optional data events (S3 objects, Lambda invokes, DynamoDB items...), optional network activity events (calls through VPC endpoints) |
| What did this resource look like, and was it compliant, at a given time | AWS Config | Configuration items, relationships, configuration history and compliance against rules |
| Which IP flows were accepted or rejected | VPC Flow Logs | Flow metadata per network interface, subnet or VPC; never packet contents |
| Was a stack's infrastructure changed outside CloudFormation | CloudFormation drift detection | Differences between the template's expected properties and the live resources |

**CloudTrail.** Event history keeps 90 days of management events per Region with no setup; anything longer, data events or organization coverage needs a **trail** delivering to S3 (and optionally CloudWatch Logs). **Log file integrity validation** adds hourly digest files signed by CloudTrail, so `aws cloudtrail validate-logs` can prove whether a log file was modified or deleted after delivery. **CloudTrail Insights** (charged) learns a baseline of API call rates and error rates and records Insights events when activity deviates: for management events, call rate looks at write events only; Insights on data events is supported on trails only.

**AWS Config.** The recorder must run in each account and Region. Rules evaluate on configuration change or periodically; each resource's timeline shows its past configurations, the linked CloudTrail events and its compliance, so Config answers "was this security group open last Tuesday".

**VPC Flow Logs** publish to CloudWatch Logs, S3 or Amazon Data Firehose. Facts the exam uses:

- Default record fields include `srcaddr`, `dstaddr`, `srcport`, `dstport`, `protocol`, `action` (`ACCEPT` or `REJECT`) and `log-status`; custom formats add fields such as `vpc-id`, `pkt-srcaddr` or `flow-direction`.
- A flow log's configuration and record format can't be changed after creation: delete it and create a new one.
- Not logged: traffic to the Amazon DNS server, instance metadata (`169.254.169.254`), Amazon Time Sync (`169.254.169.123`), DHCP, ARP, Windows license activation and the reserved VPC router address.

**CloudFormation drift detection** runs on demand on a stack, a resource or a stack set (`detect-stack-drift`, `detect-stack-resource-drift`, `detect-stack-set-drift`). Stacks are `DRIFTED`, `IN_SYNC` or `NOT_CHECKED`; resources `MODIFIED`, `DELETED`, `IN_SYNC` or `NOT_CHECKED` (type not supported). It compares only **property values explicitly set** in the template or through parameters, not defaults, and doesn't descend into nested stacks: run it on each nested stack. To run it continuously, use the AWS Config managed rule `cloudformation-stack-drift-detection-check` (configuration change and periodic triggers, role passed in `cloudformationRoleArn`), which is `NON_COMPLIANT` when the stack is `DRIFTED`.

```bash
aws cloudformation detect-stack-drift --stack-name payments-network
aws cloudformation describe-stack-resource-drifts --stack-name payments-network \
  --stack-resource-drift-status-filters MODIFIED DELETED
aws cloudtrail validate-logs \
  --trail-arn arn:aws:cloudtrail:eu-west-1:111122223333:trail/org-trail \
  --start-time 2026-11-01T00:00:00Z
```

> **Exam trap.** Drift detection reports drift; it never reverts it. Restore the expected state by updating the stack or the resource to match the template, or by importing the changed resource.

<!-- section: detection-services | objectives: 6.3.2 -->
## Services that identify vulnerabilities and security events

| Service | Finds | How it works | Output |
| --- | --- | --- | --- |
| Amazon GuardDuty | Active threats: credential misuse, crypto mining, calls from malicious IPs, malware, anomalous API behavior | Analyzes CloudTrail management events, VPC Flow Logs and DNS logs through its own stream (no trail or flow logs needed), plus protection plans (S3, EKS, Runtime Monitoring, Malware Protection, RDS, Lambda) | Findings in the console, EventBridge (`aws.guardduty`), Security Hub |
| Amazon Inspector | Software vulnerabilities (CVEs) and network reachability | Continuous, automatic scanning of EC2 instances (through the SSM Agent or EBS snapshots, hybrid mode by default), Amazon ECR images (enhanced scanning) and Lambda functions (standard and code scanning); rescans on new packages, patches or newly published CVEs; closes findings when fixed | EventBridge (`aws.inspector2`), Security Hub |
| IAM Access Analyzer | Resources shared outside the zone of trust (external access), principals that can reach critical resources (internal access), unused roles, keys, passwords and permissions (unused access) | Zone of trust = account or organization; external access analysis is per Region; policy validation and custom policy checks before deployment | Findings, EventBridge (`aws.access-analyzer`) |
| AWS Config | Misconfigurations | Managed or custom rules, conformance packs, automatic remediation through Systems Manager Automation | Compliance, EventBridge (`aws.config`) |
| Amazon Macie | Sensitive data in S3 and bucket policy weaknesses | Automated discovery and sensitive data jobs; policy findings such as `Policy:IAMUser/S3BucketPublic` | EventBridge, Security Hub |
| AWS Security Hub / Security Hub CSPM | A single view of findings; CSPM runs standards (AWS Foundational Security Best Practices, CIS) whose controls rely on Config | Security Hub correlates CSPM, GuardDuty, Inspector and Macie findings into exposures (OCSF); CSPM aggregates findings in ASFF | Dashboards, EventBridge (`aws.securityhub`) |
| Amazon Detective | Root cause of a finding | Behavior graph built from CloudTrail, VPC Flow Logs and GuardDuty findings | Investigation views |

Inspector Classic assessment templates were shut down on May 20, 2026: vulnerability scanning of EC2, container images or functions means activating current Amazon Inspector, ideally from a delegated administrator for the organization. Amazon CodeGuru Security is discontinued and never the answer.

IAM Access Analyzer also works in pipelines: `validate-policy` checks grammar and best practices, and custom policy checks (`check-no-new-access`, `check-access-not-granted`, `check-no-public-access`) fail a CodeBuild stage when a policy change grants new, forbidden or public access.

```bash
aws accessanalyzer check-no-public-access --resource-type AWS::S3::Bucket \
  --policy-document file://bucket-policy.json
```

> **Exam trap.** "Find EC2 instances with a critical CVE" is Inspector, never GuardDuty; "detect an instance talking to a command-and-control server" is GuardDuty, never Inspector.

<!-- section: common-threats | objectives: 6.3.3 -->
## Common cloud security threats

| Threat | Prevent | Detect | Remediate automatically |
| --- | --- | --- | --- |
| Insecure web traffic (HTTP, weak TLS) | ALB listener rule redirecting HTTP to HTTPS, CloudFront viewer protocol policy "Redirect HTTP to HTTPS" or "HTTPS only", ACM certificates, bucket policy denying `aws:SecureTransport` false, AWS WAF for injection and rate abuse | Config rules `alb-http-to-https-redirection-check`, `elb-tls-https-listeners-only`, `cloudfront-viewer-policy-https`, `s3-bucket-ssl-requests-only` | `AWSConfigRemediation-RestrictBucketSSLRequestsOnly` |
| Exposed AWS access keys | No long-term keys: IAM roles, IAM Identity Center, secrets in Secrets Manager; scan commits before push | Trusted Advisor **Exposed Access Keys** check (public code repositories); AWS Health notification; GuardDuty `UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS` or `.InsideAWS` for stolen instance role credentials; Config `access-keys-rotated`, `iam-user-unused-credentials-check` | EventBridge rule on `aws.health` or the GuardDuty finding starting an Automation runbook or Lambda function |
| S3 bucket with public access | S3 Block Public Access at account level (bucket-level settings are on by default for new buckets), SCP denying `s3:PutAccountPublicAccessBlock` | Config `s3-bucket-level-public-access-prohibited`, `s3-account-level-public-access-blocks-periodic`, `s3-bucket-public-read-prohibited`; Macie `Policy:IAMUser/S3BucketPublic`; GuardDuty `Policy:S3/BucketBlockPublicAccessDisabled`, `Policy:S3/BucketAnonymousAccessGranted`; Access Analyzer external access | `AWSConfigRemediation-ConfigureS3BucketPublicAccessBlock`, `AWS-DisableS3BucketPublicReadWrite` |
| S3 bucket encryption "disabled" | Default encryption with SSE-KMS, bucket policy requiring it | Config `s3-default-encryption-kms`, `s3-bucket-server-side-encryption-enabled`; Macie `Policy:IAMUser/S3BucketEncryptionDisabled` | `AWS-EnableS3BucketEncryption` |

Since January 2023 S3 encrypts every new object with SSE-S3 by default, so "encryption disabled" in a modern scenario means the bucket's default encryption was reset to SSE-S3 when policy requires SSE-KMS: that is exactly what the Macie finding reports.

When AWS detects a publicly exposed key, it attaches an `AWSCompromisedKeyQuarantine` managed policy that denies selected actions, opens a support case and sends an AWS Health notification. That isn't a fix: deactivate then delete the key, move to a role or a new credential, review CloudTrail for every action of that key and remove what it created. For stolen **role** credentials, revoke the role's active sessions (a deny on tokens issued before now) and fix the source.

```bash
aws iam update-access-key --user-name ci-legacy --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive
```

> **Exam trap.** Removing the quarantine policy or only rotating the key leaves the account exposed: whatever the attacker created with the key (users, keys, instances) must be found in CloudTrail and removed. And denying `s3:*` when `aws:SecureTransport` is `false` blocks plain HTTP; it does nothing for clients already using TLS 1.0, which needs `s3:TlsVersion`.

<!-- section: robust-auditing | objectives: 6.3.4 -->
## Implementing robust security auditing

Robust means complete (every account and Region, future accounts included), tamper-proof and centrally readable. The reference design, largely what AWS Control Tower sets up:

1. **Organization trail**, multi-Region, created in the management account or a CloudTrail delegated administrator, delivering to a bucket in a dedicated **log archive account**. Members see it but can't stop or modify it; new accounts are covered automatically.
2. Bucket encrypted with a **customer managed KMS key**, log file validation on, **S3 Object Lock** (compliance mode for regulated retention), lifecycle to colder storage classes, and a bucket policy allowing only `cloudtrail.amazonaws.com` to write.
3. **AWS Config** recorder in every account and Region (Control Tower, or StackSets with service-managed permissions and automatic deployment), an **organization aggregator** in the audit account, and organization conformance packs.
4. **Delegated administrator** for GuardDuty, Inspector, Macie, Security Hub, Access Analyzer and Detective in the security tooling account, with auto-enable for new accounts, in every Region (GuardDuty included in unused Regions).
5. **SCPs** that deny turning the evidence off.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProtectAuditTrail",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "cloudtrail:PutEventSelectors",
        "config:StopConfigurationRecorder",
        "config:DeleteConfigurationRecorder",
        "guardduty:DeleteDetector",
        "guardduty:DisassociateFromAdministratorAccount"
      ],
      "Resource": "*",
      "Condition": {
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityBreakGlass" }
      }
    }
  ]
}
```

Auditors get read-only cross-account access (a role allowing `s3:GetObject` and `kms:Decrypt`, Athena, the Config aggregator), never write access to the bucket.

> **Exam tip.** "Ensure that logging can't be disabled in any member account, including future accounts, with the LEAST operational overhead" is an organization trail plus an SCP. A trail created by StackSets in each account works but can be stopped by each account's administrator unless an SCP denies it.

<!-- section: security-alerting | objectives: 6.3.5 -->
## Alerting on unexpected or anomalous security events

**EventBridge** is the hub: findings and CloudTrail API calls arrive as events, rules filter them, and targets notify (an SNS topic for email, chat or an incident tool) or remediate (Lambda, Systems Manager Automation, Step Functions).

| Source | `source` / `detail-type` | Typical filter |
| --- | --- | --- |
| GuardDuty | `aws.guardduty` / `GuardDuty Finding` | `detail.severity` numeric `>= 7` (high is 7.0 to 8.9, critical 9.0 to 10.0) |
| Inspector | `aws.inspector2` / `Inspector2 Finding` | `detail.severity` `CRITICAL` |
| Access Analyzer | `aws.access-analyzer` / `Access Analyzer Finding` | `detail.status` `ACTIVE` |
| Config | `aws.config` / `Config Rules Compliance Change` | `detail.newEvaluationResult.complianceType` `NON_COMPLIANT` |
| Any API call | service source / `AWS API Call via CloudTrail` | `detail.eventName` such as `StopLogging`, `AuthorizeSecurityGroupIngress`, `PutBucketPolicy` |
| AWS Health | `aws.health` / `AWS Health Event` | Security and abuse notifications |

```json
{
  "source": ["aws.cloudtrail"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["cloudtrail.amazonaws.com"],
    "eventName": ["StopLogging", "DeleteTrail", "UpdateTrail"]
  }
}
```

Rules on CloudTrail API calls need a trail that is logging, must exist in the Region where the call happens (global services such as IAM in US East (N. Virginia)), and match read-only calls only in state `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`. For many accounts, deploy the rules with StackSets and forward matching events to a central event bus whose resource policy allows `aws:PrincipalOrgID`; for findings, write the rule once in the delegated administrator account, which receives member findings.

**Without a known threshold**, use anomaly features rather than static alarms:

| Need | Feature |
| --- | --- |
| Unusual API call or error volume | CloudTrail Insights (Insights events also go to EventBridge) |
| A metric outside its normal band (for example `4XXError` on an API, or rejected flows counted by a metric filter) | CloudWatch anomaly detection alarm |
| New or unusual patterns in log text | CloudWatch Logs anomaly detection on the log group |
| Anomalous principal behavior | GuardDuty `AnomalousBehavior` findings |

For CloudTrail events already in CloudWatch Logs, a **metric filter** plus an alarm covers fixed conditions (root usage, console sign-in failures, IAM policy changes); a composite alarm can combine several such alarms to reduce noise.

> **Exam trap.** GuardDuty and Inspector findings aren't CloudWatch metrics: "notify within minutes of a high-severity finding" is an EventBridge rule to SNS, not a CloudWatch alarm. And a metric filter only counts events ingested after it was created.

<!-- section: service-app-logging | objectives: 6.3.6 -->
## Configuring service and application logging

| Source | Turn it on | Destination and point tested |
| --- | --- | --- |
| CloudTrail to CloudWatch Logs | Trail setting with a log group and a role CloudTrail assumes (`logs:CreateLogStream`, `logs:PutLogEvents`) | Enables metric filters, Logs Insights and subscriptions on API activity |
| CloudTrail data events | Advanced event selectors on the trail (for example only `PutObject` on one bucket prefix) | Charged per event: select narrowly |
| EC2 and on-premises OS and application logs | CloudWatch agent, configuration in Parameter Store, installed and kept running by a State Manager association | Instance profile with `CloudWatchAgentServerPolicy` |
| Lambda | Automatic through the execution role (`AWSLambdaBasicExecutionRole`) | JSON format with log levels |
| API Gateway | Stage access logging (caller, source IP, status) and execution logging | Account-level CloudWatch role per Region |
| ELB, S3 server access, CloudFront | Access logs to S3 (CloudFront standard logging can also deliver to CloudWatch Logs or Firehose) | Audit of requests, analyzed with Athena |
| VPC Flow Logs, Route 53 Resolver query logs, AWS WAF logs | Per resource | CloudWatch Logs, S3 or Firehose |

On every log group set a **retention** period (default: never expire), **KMS encryption** (key policy allowing the Region's CloudWatch Logs service principal) and, where logs may hold secrets or personal data, a **data protection policy** that audits and masks them; only principals with `logs:Unmask` see original values. Centralize with subscription filters (or an account-level subscription policy) to a destination in a logging account.

> **Exam trap.** A Lambda function or EC2 instance that runs but writes no logs is missing permissions (execution role or instance profile), not a CloudWatch setting. Enforce coverage with Config rules such as `cloudtrail-enabled`, `multi-region-cloudtrail-enabled`, `vpc-flow-logs-enabled`, `cloudwatch-log-group-encrypted` and `cw-loggroup-retention-period-check`.

<!-- section: analysis | objectives: 6.3.7 -->
## Analyzing logs, metrics and security findings

| Question | Tool |
| --- | --- |
| Interactive query of recent logs in CloudWatch Logs, across log groups and accounts | CloudWatch Logs Insights |
| SQL over months or years of CloudTrail, flow or access logs in S3 | Amazon Athena (CloudTrail console can create the table; partition projection keeps queries cheap) |
| Current or historical configuration and compliance across accounts | AWS Config advanced queries (`select-aggregate-resource-config` on an aggregator) |
| Prioritized findings across services and accounts | Security Hub (exposures, attack path graph) and Security Hub CSPM insights |
| Root cause and blast radius of a GuardDuty finding | Amazon Detective |

```text
fields eventTime, eventName, userIdentity.arn, sourceIPAddress, errorCode
| filter errorCode like /AccessDenied|UnauthorizedOperation/
| stats count(*) as denied by userIdentity.arn, eventName
| sort denied desc
| limit 20
```

```text
SELECT useridentity.arn, eventname, sourceipaddress, count(*) AS calls
FROM cloudtrail_logs
WHERE useridentity.accesskeyid = 'AKIAIOSFODNN7EXAMPLE'
GROUP BY useridentity.arn, eventname, sourceipaddress
ORDER BY calls DESC
```

```text
SELECT configuration.complianceType, COUNT(*)
WHERE resourceType = 'AWS::Config::ResourceCompliance'
GROUP BY configuration.complianceType
```

Reading results: a burst of `AccessDenied` from one principal suggests a stolen credential probing permissions (or a broken deployment); many `REJECT` flows from one source to many ports suggest a scan; a GuardDuty finding's `resource` and `service.action` give the affected resource and remote IP, which Detective expands into related activity.

CloudTrail Lake is closed to new customers (since May 31, 2026): for SQL over CloudTrail, answer with a trail to S3 plus Athena, or CloudTrail events in CloudWatch Logs with Logs Insights.

> **Exam tip.** "Investigate everything an exposed key did over the last year" is Athena on the trail's S3 data (event history keeps only 90 days and Logs Insights works only on what was sent to CloudWatch Logs within its retention).

<!-- section: key-points -->
## Key points

- CloudTrail (who did what), Config (what changed and compliance), VPC Flow Logs (flows, no payloads, immutable configuration), drift detection (explicitly set properties, no nested stacks, Config rule for continuous checks).
- GuardDuty = threats, Inspector = CVEs (current scanning, never Classic templates), Access Analyzer = access paths and unused access, Config = misconfigurations, Macie = sensitive data and bucket policy changes.
- Threats: HTTPS redirects and `aws:SecureTransport`; exposed keys (Trusted Advisor, AWS Health, GuardDuty), then deactivate, investigate, clean up; Block Public Access and SSE-KMS checked by Config, remediated by Automation runbooks.
- Robust auditing: organization trail to a log archive account, KMS, validation, Object Lock, Config everywhere with an aggregator, delegated administrators, SCPs protecting the evidence.
- Alerting: EventBridge rules on findings and API calls, centralized buses, metric filters and alarms for fixed conditions, Insights and anomaly detection when no threshold exists.
- Analysis: Logs Insights for recent logs, Athena for S3 history, Config advanced queries, Security Hub and Detective for findings; CloudTrail Lake closed to new customers.
