Detection questions start from a workload and a risk, then ask which signal must exist, which account sees it and what fires when it changes. This chapter covers how to derive monitoring requirements from a workload, health checks as a detection signal, the delegated administrator pattern that aggregates findings across an organization, alerts and dashboards built on GuardDuty, Macie, Security Hub and Security Lake, and the automations that assess the environment on a schedule: AWS Config conformance packs, Security Hub CSPM standards and Systems Manager State Manager.

<!-- section: monitoring-requirements | objectives: 1.1.1 -->
## Deriving monitoring requirements from a workload

Start from what the workload holds and how it runs, then map each risk to the service that produces the signal. Monitoring is your side of the shared responsibility model: AWS secures the infrastructure, you decide what is logged, analyzed and alerted on.

| Workload trait | Risk to detect | Signal and service |
| --- | --- | --- |
| Any account | Credential misuse, unusual API activity, crypto mining, calls from known malicious IPs | Amazon GuardDuty (foundational sources), AWS CloudTrail management events |
| S3 buckets with personal or regulated data | Data exposure, public access, unencrypted buckets, exfiltration | Amazon Macie (sensitive data and policy findings), GuardDuty S3 Protection, CloudTrail S3 data events |
| EC2, Amazon EKS, Amazon ECS on Fargate | Malicious processes, reverse shells, container escape | GuardDuty Runtime Monitoring (agent), EKS Protection (audit logs), Malware Protection for EC2 |
| Software packages and images | Known CVEs, network exposure | Amazon Inspector continuous scanning of EC2, Amazon ECR images and Lambda functions |
| Aurora and RDS | Anomalous logins, brute force | GuardDuty RDS Protection |
| Lambda functions | Calls to malicious endpoints from functions | GuardDuty Lambda Protection (network activity of the function) |
| Configuration drift | A resource no longer compliant with policy | AWS Config rules, Security Hub CSPM controls |
| Generative AI on Amazon Bedrock | Prompt abuse, data leakage in responses | Model invocation logging (off by default), Amazon Bedrock Guardrails metrics, CloudTrail |
| Network paths | Scans, unexpected flows, DNS tunneling | VPC Flow Logs, Route 53 Resolver query logs, AWS Network Firewall logs (chapter 12) |

GuardDuty analyzes three **foundational data sources** as soon as it is enabled: CloudTrail management events, VPC Flow Logs from EC2 and DNS logs. It reads them through its own independent stream, so you don't create a trail or flow logs for it. Its **protection plans** extend coverage: S3 Protection, EKS Protection, Runtime Monitoring, Malware Protection for EC2, Malware Protection for S3, Malware Protection for AWS Backup, RDS Protection, Lambda Protection and AI Protection. At first enablement every plan except Runtime Monitoring is turned on for the 30-day trial. Malware Protection for S3 is the only plan usable without enabling GuardDuty itself. **Extended Threat Detection** is always on at no extra cost: it correlates individually low-signal events across resources and time into an attack sequence finding.

> **Exam trap.** "Detect cryptocurrency mining on EC2 with the LEAST operational overhead" is GuardDuty, not VPC Flow Logs plus a custom Athena query. And enabling GuardDuty doesn't require turning on VPC Flow Logs or a CloudTrail trail; those you configure for your own retention and investigation needs.

<!-- section: health-checks | objectives: 1.1.2 -->
## Health checks and workload monitoring strategies

Health checks detect availability failures, which may be the first sign of an attack (resource exhaustion, a tampered endpoint, a deleted route).

| Check | What it tests | Where results appear |
| --- | --- | --- |
| Route 53 public endpoint health check | HTTP, HTTPS or TCP from health checkers in at least three Regions; optional string matching in the first 5,120 bytes of the body; fast interval of 10 seconds at extra cost | Health check status and CloudWatch metrics; alarm notifications use an SNS topic in US East (N. Virginia) |
| Route 53 private endpoint health check | A private IP, name or port reachable from a **health check source** created in your VPC (an IP address in three subnets of three AZs, up to 200 checks per source) | The Region of the health check source |
| Route 53 calculated health check | Whether a minimum number of child health checks are healthy | Same as its children; can't reference private endpoint health checks |
| Route 53 CloudWatch alarm health check | The data stream of a CloudWatch alarm in the same account (standard-resolution metric, no M-out-of-N, no metric math) | Route 53 |
| ELB target group health check | Each target on a path and port; unhealthy targets receive no traffic | Target health and `UnHealthyHostCount` metric |
| EC2 status checks | System and instance reachability | `StatusCheckFailed` metrics; an alarm can recover or reboot the instance |
| CloudWatch Synthetics canary | Scripted requests to an endpoint or user journey on a schedule | Canary metrics, screenshots and logs |
| AWS Health | AWS-side events affecting your resources, including abuse and key exposure notices | AWS Health Dashboard and EventBridge events from `aws.health` |

A monitoring strategy combines these with alarms on the security services' own signals. For an internet-facing web application: Route 53 health check plus ELB target health for availability, AWS WAF metrics for blocked requests, GuardDuty for the instances, and an EventBridge rule on `aws.health` events so that a notice that AWS detected exposed access keys reaches the security team.

> **Exam trap.** A public Route 53 health check of an instance behind a security group that only allows the corporate CIDR always fails: allow the Route 53 health checker IP ranges (`ROUTE53_HEALTHCHECKS` in the published AWS IP ranges) or use a private endpoint health check, which needs no internet exposure.

<!-- section: event-aggregation | objectives: 1.1.3 -->
## Aggregating security events across accounts and Regions

The organization-wide pattern is the same for every security service: from the management account, designate a **delegated administrator** (usually a dedicated security tooling account), enable the service for all existing members and set auto-enable for new accounts. The management account then stays out of daily operations.

```bash
aws guardduty enable-organization-admin-account --admin-account-id 111122223333
aws securityhub enable-organization-admin-account --admin-account-id 111122223333
```

| Service | Aggregation scope | Points tested |
| --- | --- | --- |
| GuardDuty | Delegated administrator per Region | Enable it in every Region, including unused ones; administrator sees and manages member findings |
| AWS Security Hub (new, GA December 2, 2025) | Organization, with an aggregator Region | Correlates GuardDuty, Inspector, Macie and Security Hub CSPM findings into exposures; findings in OCSF; no third-party partner findings |
| AWS Security Hub CSPM (the former Security Hub) | Organization, home Region plus linked Regions | Runs standards and controls; findings in ASFF; receives findings from AWS services and third-party products |
| Macie, Inspector, Detective | Delegated administrator | Same account recommended for all security services |
| AWS Config | Aggregator (organization or individual accounts) | **Read-only** view of configuration and compliance; no authorization needed for organization sources |
| Amazon Security Lake | Delegated administrator, rollup Regions | Centralizes logs and findings in OCSF (chapter 12) |

Security Hub and Security Hub CSPM share the same delegated administrator: if CSPM already has a non-management delegated administrator, Security Hub uses it. Enabling Security Hub automatically enables Security Hub CSPM, but it doesn't turn on GuardDuty or Inspector; exposure findings need at least CSPM and Inspector.

For raw events rather than findings, route them through **Amazon EventBridge**: a rule in each member account (deployed with CloudFormation StackSets) forwards matching events to an event bus in the security account, whose resource policy allows the organization with `aws:PrincipalOrgID`. For metrics and logs, CloudWatch cross-account observability links source accounts to a monitoring account in each Region.

> **Exam trap.** A Config aggregator shows noncompliant resources across the organization but can't deploy rules or remediate. Deployment uses organization Config rules or conformance packs; aggregation is only for viewing.

<!-- section: security-alerting | objectives: 1.1.4 -->
## Alerts, metrics and dashboards for anomalous events

**EventBridge is the alerting hub** for security findings. GuardDuty sends a new finding to EventBridge in near real time; later occurrences of the same finding are aggregated and sent every 6 hours by default, or every 15 minutes or 1 hour if the administrator changes the frequency (the setting applies to members). Findings archived by suppression rules aren't sent. In the delegated administrator account, rules also match member findings (`detail.accountId` filters one account).

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [{ "numeric": [">=", 7] }]
  }
}
```

| Source | `source` and `detail-type` | Notes |
| --- | --- | --- |
| GuardDuty | `aws.guardduty`, `GuardDuty Finding` | Numeric severity: high is 7.0 to 8.9, critical 9.0 to 10.0 |
| Macie | `aws.macie`, `Macie Finding` | New findings published immediately; updated policy findings every 15 minutes by default |
| Security Hub CSPM | `aws.securityhub`, `Security Hub Findings - Imported` | Also `Security Hub Findings - Custom Action` for analyst-triggered actions |
| Security Hub | `aws.securityhub`, `Findings Imported V2` | OCSF findings |
| CloudTrail API calls | `aws.cloudtrail` and others, `AWS API Call via CloudTrail` | Requires a trail with logging (chapter 13) |

Macie publishes every finding to EventBridge; to Security Hub CSPM it publishes only policy findings by default, so sensitive data findings must be added in the publication settings.

**CloudWatch alerts on API activity**: send the organization trail to a CloudWatch Logs log group, then create metric filters and alarms for root usage, console sign-in without MFA, IAM policy changes, security group changes or `StopLogging` calls (the CIS AWS Foundations Benchmark monitoring controls).

```bash
aws logs put-metric-filter --log-group-name org-trail \
  --filter-name root-usage --metric-transformations metricName=RootUsage,metricNamespace=Security,metricValue=1 \
  --filter-pattern '{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }'
aws cloudwatch put-metric-alarm --alarm-name root-usage --namespace Security --metric-name RootUsage \
  --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:security-alerts
```

Anomaly-based options need no fixed threshold: **CloudTrail Insights** flags unusual API call or error rates, CloudWatch **anomaly detection** alarms fire outside a learned band, and CloudWatch Logs **anomaly detection** surfaces unusual log patterns.

**Dashboards**: the Security Hub Summary dashboard, with a Trends view keeping up to one year of data and a Security coverage widget showing which accounts and Regions have security services enabled; the Exposure page with a potential attack path graph; the Security Hub CSPM security score per standard; Macie's S3 sensitivity heat map; CloudWatch dashboards; and Amazon Managed Grafana or OpenSearch Dashboards on top of Security Lake (chapter 12).

> **Exam tip.** "Notify the security team within minutes of a high-severity GuardDuty finding in any account" is an EventBridge rule in the delegated administrator account, in each Region, targeting an SNS topic. It's not a CloudWatch alarm: GuardDuty findings aren't CloudWatch metrics.

<!-- section: regular-assessments | objectives: 1.1.5 -->
## Automated, recurring assessments

| Tool | What it assesses | Schedule and scope |
| --- | --- | --- |
| AWS Config rule | One resource configuration against a rule (managed or custom Lambda or Guard rule) | On configuration change, or periodic (1, 3, 6, 12 or 24 hours); remediation through Systems Manager Automation, manual or automatic with retries |
| Conformance pack | A YAML template of Config rules and remediation actions deployed as one entity | One account and Region, or organization-wide from the management or delegated administrator account; new accounts receive it |
| Security Hub CSPM standards | AWS Foundational Security Best Practices, CIS AWS Foundations Benchmark, PCI DSS, NIST SP 800-53 controls | Continuous, mostly backed by Config rules (Config recording must be on) |
| Security Hub automation rules | Update or suppress findings on criteria (severity, resource, account); in Security Hub, also open Jira or ServiceNow tickets | Applied as findings arrive |
| State Manager association | Keeps managed nodes in a defined state: agent installed and running, inventory collected, patch compliance scanned | Cron or rate expression, minimum interval 30 minutes; targets by tags, resource groups, node IDs or all nodes |
| Inspector | Vulnerabilities and network reachability | Continuous, rescans on new CVEs or changes |
| Macie job | Sensitive data in selected buckets | One-time or periodic (daily, weekly, monthly); automated discovery samples continuously |

```bash
aws configservice put-organization-conformance-pack \
  --organization-conformance-pack-name baseline-security \
  --template-s3-uri s3://example-security-templates/baseline.yaml \
  --excluded-accounts 444455556666
aws ssm create-association --association-name gather-inventory \
  --name AWS-GatherSoftwareInventory \
  --targets Key=tag:Environment,Values=Production \
  --schedule-expression "rate(1 day)"
```

Organization deployment of Config rules and conformance packs requires Config recording in member accounts; if a new account has no recorder, deployment is retried for 7 hours. Security Hub CSPM across an organization is now configured with **Security Hub CSPM policies** in AWS Organizations (policy type `SECURITYHUB_CSPM_POLICY`), which replace **central configuration** (configuration policies from the delegated administrator in the home Region), now a legacy feature; the two are mutually exclusive.

For recurring investigations, an EventBridge Scheduler schedule can start a Step Functions workflow or a Systems Manager Automation runbook (for example, snapshot and tag an instance, query Logs Insights, publish a report). AWS Audit Manager is closed to new customers since April 30, 2026: evidence collection for new customers relies on conformance packs, Security Hub CSPM and AWS Control Tower controls.

> **Exam trap.** "Install and keep the CloudWatch agent running on every current and future instance" is a State Manager association targeting a tag, not a one-off Run Command. And a conformance pack deployed in one Region assesses only that Region: deploy it in every Region in use.

<!-- section: key-points -->
## Key points

- Map workload risks to signals: GuardDuty (threats), Inspector (vulnerabilities), Macie (sensitive data), Config and Security Hub CSPM (configuration), CloudTrail (API activity).
- GuardDuty reads CloudTrail management events, VPC Flow Logs and DNS logs on its own; protection plans extend it; Extended Threat Detection is free and always on.
- Route 53 health checks: public from at least three Regions, private through a health check source in the VPC, calculated, or based on a CloudWatch alarm.
- Delegated administrator per service, enabled in every Region; Security Hub and Security Hub CSPM share it; Config aggregators are read-only.
- New Security Hub: exposures, attack paths, OCSF, no partner findings; Security Hub CSPM: standards, controls, ASFF, partner integrations.
- Alerting: EventBridge rules on findings to SNS, Lambda or Automation; metric filters on CloudTrail logs for API events; Insights and anomaly detection when no threshold is known.
- Recurring assessments: Config rules and organization conformance packs, CSPM standards, State Manager associations (30-minute minimum), Inspector, Macie jobs.
