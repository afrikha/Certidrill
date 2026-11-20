# C-soa-c03-1 — COURSE SOA-C03, chapters 00, 11, 12, 13 (2026-11-20)

## Output
- `content/soa-c03/course/chapters/{00-getting-started,11-monitoring-logging,12-remediation,13-performance}.{en,fr}.md` (8 files).
- `npx tsx factory/check-cert.ts soa-c03 00-getting-started 11-monitoring-logging 12-remediation 13-performance`: course problems (your chapters) 0.
- English words outside code blocks and markers (inline code counted): 00 = 1,645; 11 = 2,223; 12 = 2,221; 13 = 2,221 (at the 2,200 ceiling; dense objective lists: 5, 3 and 6 objectives).
- Coverage: 11 → 1.1.1 (telemetry-services, workload-monitoring), 1.1.2, 1.1.3, 1.1.4, 1.1.5; 12 → 1.2.1 (analyze-metrics, automated-remediation), 1.2.2 (eventbridge-routing, eventbridge-troubleshooting), 1.2.3 (automation-runbooks, running-automation); 13 → one section per objective 1.3.1–1.3.6.
- No Lambda maximum timeout stated anywhere.

## Verified on AWS pages this session (WebFetch)
- Certification page: 130 min, 65 questions, languages English/Japanese/Korean/Simplified Chinese with Korean and Chinese retired after Nov 19, 2026 (chapter 00 says English and Japanese), ~1 year experience.
- CloudWatch alarms: action list per alarm type (SNS, Lambda, EC2, Auto Scaling, OpsItem/incident, investigations); actions only on transitions except Auto Scaling (every minute); Lambda action principal `lambda.alarms.cloudwatch.amazonaws.com`, async, cross-account; composite alarms: only SNS, Lambda, OpsItems, incidents; 100 underlying alarms; AT_LEAST; same account/Region except cross-account observability monitoring account; alarm state change event (`aws.cloudwatch`, `CloudWatch Alarm State Change`); **log alarms** (scheduled Logs Insights queries, new); PromQL alarms exist (not used).
- Dashboards: sharing (5 emails, public, SSO; Cognito in us-east-1; viewers get GetMetricData/DescribeTags account-wide); cross-account observability (per Region, sink/link, 100,000 sources, 5 monitoring accounts per source, Organizations, data types, no extra charge for logs/metrics); cross-account cross-Region console.
- CloudWatch agent: SSM install (`AWS-ConfigureAWSPackage`, `AmazonCloudWatchAgent`, `AmazonCloudWatch-ManageAgent`), `CloudWatchAgentServerPolicy`, `CloudWatchAgentAdminRole`, `CWAgent` namespace, `amp` destination; Container Insights ECS commands (`containerInsights` = enabled/enhanced, ECS agent 1.29+); EKS `amazon-cloudwatch-observability` add-on (agent + Fluent Bit, Container Insights enhanced + Application Signals, Pod Identity/IRSA/node role).
- Managed Service for Prometheus: 150-day default retention, max 1,095 days, 3 AZs, managed collector for EKS.
- Bedrock: model invocation logging (APIs captured, destinations, disabled by default, 100 KB rule, role/bucket policy), `AWS/Bedrock` runtime metric names.
- EventBridge: retry 24 h / 185 attempts; DLQ (standard SQS, same Region, attributes, no retry for permission/missing-resource errors); input transformer (100 variables, reserved variables); troubleshooting page (Lambda policy, role trust, KMS key policy, metrics, sandbox, global services in us-east-1, loops); CloudTrail events need a trail, read-only events need `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`; 5 targets per rule; Pipes; **new "Custom Event Bus" with subscribers and retention, rule-based bus renamed "Custom Event Bus - Classic"** (no launch date found).
- Systems Manager Automation: action list, common step properties, `aws:executeScript` runtimes (Python 3.10–3.12, PowerShell 7.4), 600 s, 100 KB output, no throttling retry; rate control and adaptive concurrency (100 → 500); multi-account roles and target locations; service role / AmazonSSMAutomationRole / iam:PassRole; EC2 runbook names.
- AWS DevOps Agent (what it does, Agent Spaces, integrations, web app); Kiro docs index (IDE/CLI/web/mobile, specs, steering, hooks, MCP); Amazon DevOps Guru end of support notice (no new customers Oct 29, 2026; access ends Sep 30, 2027).
- Compute Optimizer: resource list (incl. RDS/Aurora, NAT gateways), opt-in, 14/93 days, EC2 findings and performance risk, memory needs the CloudWatch agent.
- EBS: full `AWS/EBS` metric list and instance EBS metrics; Elastic Volumes 4 modifications per rolling 24 h, no shrink, optimizing state; volume initialization (FSR, 100–300 MiB/s initialization rate, dd/fio).
- S3: multipart limits (48.8 TiB object, 5 MiB–5 GiB parts, 10,000 parts, 100 MB guidance); Transfer Acceleration (no periods, endpoints, virtual-hosted, 20 minutes).
- S3 Files (built on EFS, NFS 4.1/4.2, EC2/Lambda/EKS/ECS, 128 KiB default, 1–365 days default 30, one mount target per AZ, sync both ways).
- EFS lifecycle defaults (30 days IA, 90 days Archive, back on first access) and metrics.
- RDS: Performance Insights pages now titled **CloudWatch Database Insights**; DB load/AAS definitions; 7 days included, 1–24 months paid; proactive recommendations require paid-tier retention; Advanced mode enabled by default; RDS Proxy (same VPC, not public, Secrets Manager/IAM, writer only, 16 KB pinning, two-AZ default endpoint).
- ENA allowance counters (`ethtool -S`, CloudWatch agent).

## From general knowledge (not on a page fetched in this session; flag if reviewing)
- CloudWatch metric retention tiers (15 d / 63 d / 455 d); CloudTrail details (90-day event history, data events charged, organization trail, `validate-logs`, Insights, Lake); two subscription filters per log group; metric filters apply to new events only.
- `amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c ssm:...` syntax; `retention_in_days` in the agent log config; `disk` `used_percent` → `disk_used_percent`.
- AMP alert manager sending to SNS; Pipes enrichment targets other than API destinations (Lambda, Step Functions Express, API Gateway); pattern operators list; cross-account bus resource policy; archive and replay; EventBridge Scheduler.
- Without `AutomationAssumeRole`, Automation uses the starting user's permissions (matches the wording of AWS runbook parameter descriptions); `modify-document-permission` sharing.
- SNS: S3 notifications not supported to FIFO topics; KMS actions for publishing services; `aws/sns` key cannot be edited; service notification sources table (Auto Scaling, CloudFormation, RDS, Backup, Config, CloudTrail).
- EC2 recover action ARN; status check semantics; Trusted Advisor plan requirement; placement group limits (7 partitions / 7 spread instances per AZ, also verified by C-saa-c03-4); `modify-instance-placement`; MTU 9001; RDS CloudWatch metric names; Enhanced Monitoring 1–60 s; `DatabaseConnectionsCurrentlySessionPinned`; `create-db-proxy` shorthand syntax; AWS CLI S3 settings; S3 Lifecycle 30-day minimum and 128 KB default (C-saa-c03-4 verified the small-object rule); Compute Optimizer CLI filter value `Overprovisioned`.

## Choices and deviations
- `00-getting-started` follows the SAA-C03/DVA-C03 model: no key-points section.
- Performance Insights is presented as "now documented as CloudWatch Database Insights", since the guide still says Performance Insights; no end-of-life date was found, none is stated.
- EventBridge Custom Event Bus (subscribers) mentioned in one paragraph only; the chapter keeps rules on the default bus as the main model (AWS service events, CloudTrail included, arrive there).
- Kiro is described generically (no AWS-specific MCP server names: not confirmed). DevOps Agent: the doc does not say whether it executes mitigations itself, so the chapter says it "proposes" them.
- Not used (unverified): CloudWatch investigations internals, EFS `PercentIOLimit` remediation, DataSync Enhanced mode details, RDS Database Insights CLI flags, cluster placement group per-flow bandwidth figure.
- French to review: « journal de suivi » (trail), « récepteur (sink) / lien (link) », « suppression des actions (actions suppressor) », « transformateur d'entrée », « abonnés (subscribers) », « fichiers de pilotage (steering) », « adhésion préalable » (opt in), « actualisation d'instances » (instance refresh), « épinglage (pinning) », « restauration rapide d'instantanés ».
