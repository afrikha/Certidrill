# Q-scs-c03-1a — report

61 questions in `content/scs-c03/questions/detection/`, prefix `scsc03-1a-`: 9 each for 1.1.1–1.1.5, 8 each for 1.2.1–1.2.2.
Types: 48 single, 9 multi (7 × choose 2 of 5, 2 × choose 3 of 6), 2 ordering, 2 dragdrop. Difficulty: 9 easy / 31 medium / 21 hard.
Validator: `CERT=scs-c03 npx tsx factory/validate.ts --prefix scsc03-1a-` → 0 problem(s).

## Verified on AWS pages (Nov 2026) and used as deciding facts
- GuardDuty: protection plans list, Runtime Monitoring (EKS on EC2, ECS Fargate, EC2; agent auto/manual), Lambda Protection (all functions incl. non-VPC, no flow logs needed), RDS Protection engines (login for MySQL/MariaDB/Aurora, data activity PostgreSQL-based only; learning period up to 2 weeks), S3 Protection (no CloudTrail data events needed), Malware Protection for S3 (independent mode, no findings, EventBridge/CloudWatch, tagging/TBAC), severities (Critical 9–10, High 7–8.9), update frequency 15 min/1 h/6 h set by admin, admin EventBridge rules receive member findings, same delegated admin across Regions, export needs KMS key in bucket Region and is per Region.
- New Security Hub: OCSF, exposure findings, automation rules (finding rules: Comment/SeverityId/StatusId or Jira Cloud/ServiceNow ITSM ticket; resource rules: criticality only), cross-Region aggregation (rules only in home Region; pre-existing findings not replicated until updated; not auto-enabled; members view in home Region; no extra cost).
- Security Hub CSPM: cross-Region aggregation (no auto-enable, members inherit), CloudWatch.1 exact CIS pattern; central configuration is now legacy → Security Hub CSPM policies in AWS Organizations (declarative, ALL_SUPPORTED, drift correction) used as the answer.
- Route 53: public health check metrics only in us-east-1; CloudWatch alarm health check limits (same account, standard resolution, no M of N, no metric math, no extended stats); private endpoint health checks (health check source in 3 subnets, same account, cannot be referenced by calculated checks).
- ACM: Approaching Expiration events from 45 days (imported/private), Expired and Renewal Action Required not for imported. DaysBeforeExpiry max is 45 (CloudFormation page), so a first draft asking for 60 days was rewritten.
- AWS Health: organizational view + delegated admin, 90-day retention; global events need a rule in us-east-1.
- CloudTrail: organization trail behavior, S3 bucket policy (AWSLogs/o-id/*, SourceArn = management-account trail ARN), KMS key policy (Decrypt with Null condition on encryption context), log file validation, Insights (call rate = write mgmt only; error rate read/write), network activity events (VpceAccessDenied), data events selectors.
- CloudWatch: cross-account observability (one sink per Region, 5 monitoring accounts per source, link fails if source shares more types), Logs centralization rules (backup Region, CMK tag LogsManaged = true), cross-account subscription destination steps, anomaly detection (exclude periods), log anomaly detection (1,500 chars, poor on CloudTrail/flow logs), agent config fields, agent SSM install, Synthetics.
- Config: org conformance packs (7-hour retry for recorder), aggregators read-only, auto remediation (retries, stale snapshot, not on service-linked rules), proactive rules don't block, access-keys-rotated periodic default 90; runbook AWS-DisablePublicAccessForSecurityGroup.
- Others: EKS control plane log types, Bedrock invocation logging (images and >100 KB only to S3), WAF S3 destination (same account, aws-waf-logs- prefix, no AWS managed KMS key), ALB access log fields, S3 logging comparison, Object Lock compliance mode, VPC flow log limitations, Inspector scan types, Macie ASDD/jobs/org admin.

## Not fully verified (general knowledge, kept because standard)
- Macie per-Region delegated admin and the "automatic enablement for new accounts" toggle (the fetched page did not show them).
- restricted-ssh being change-triggered; CloudWatchAgentServerPolicy allowing reads of `AmazonCloudWatch-*` parameters; EventBridge `>=` numeric operator (page shows `=`, `>`, `<=`).
- CloudTrail not capturing Bedrock prompt bodies (stated as "invocation log is the feature that captures bodies").
- GuardDuty EKS Protection not delivering audit logs to the customer (the same statement is verified for Lambda Protection).

## Deviations / notes
- Closed services appear only as wrong options with the closure as the reason (CloudTrail Lake). No Amazon Q Developer, CodeGuru Security, Audit Manager, Simple AD or Incident Manager in correct answers.
- Course chapters 11/12 did not exist when the questions were written; facts come from the AWS pages listed in each question.
