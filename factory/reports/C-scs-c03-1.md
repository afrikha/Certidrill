# C-scs-c03-1 — COURSE SCS-C03, chapters 00, 11, 12, 13 (2026-11-22)

Files: `content/scs-c03/course/chapters/{00-getting-started,11-monitoring-alerting,12-logging,13-troubleshooting-detection}.{en,fr}.md`.
Check: `npx tsx factory/check-cert.ts scs-c03 00-getting-started 11-monitoring-alerting 12-logging 13-troubleshooting-detection` → course problems (your chapters): 0.
English prose words (code blocks excluded): 00 ≈ 1,785; 11 ≈ 2,098; 12 ≈ 2,187; 13 ≈ 1,564.

## Facts verified on AWS pages (WebFetch, 2026-11-22)
- New Security Hub (News Blog GA post, Security Hub FAQ): correlates GuardDuty, Inspector, Macie, CSPM; OCSF; exposures, attack path, Trends (1 year); Jira/ServiceNow; enabling it enables CSPM, not GuardDuty/Inspector; shared delegated admin; no third-party partner findings; EventBridge detail-types `Security Hub Findings - Imported` (CSPM) and `Findings Imported V2`.
- Security Hub CSPM central configuration is now **legacy**, replaced by Organizations policy type `SECURITYHUB_CSPM_POLICY` (mutually exclusive). Other chapter authors (61-multi-account, 63-compliance) may want to align.
- GuardDuty: foundational sources, protection plan list (includes AI Protection, Malware Protection for AWS Backup), Extended Threat Detection, EventBridge frequency (6 h default, 15 min / 1 h), severity ranges incl. Critical 9.0–10.0.
- Macie: EventBridge publication, 15-minute default for updated policy findings, only policy findings to CSPM by default; periodic jobs daily/weekly/monthly.
- Config conformance packs and organization APIs (7-hour retry without recorder; aggregators read-only); State Manager 30-minute minimum.
- Route 53 health checks incl. new private endpoint health checks (health check source, 200 checks, 3 AZs, same account/Region, not in calculated checks); string match 5,120 bytes; SNS topic in us-east-1.
- CloudTrail: organization trail behavior, org-trail bucket policy, network activity events (`VpceAccessDenied`), CloudTrail Lake closure (May 31, 2026) and migration to CloudWatch (pre-2023 data not migrated).
- EventBridge: trail required for CloudTrail detail-types; read-only management events only with rule state `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`.
- CloudWatch Logs: centralization rules (new data only, CMK handling, backup Region), account-level subscription policies, log classes (Infrequent Access renamed **Essentials**; Delivery class 2 days), transformers (Standard only, built-in processors), Logs Insights languages/limits, telemetry enablement rules.
- Security Lake: native sources, OCSF/Parquet, custom sources (OCSF 1.3 or earlier, 50 per account), subscribers (10 sources each, data vs query access).
- Flow logs limitations, TGW flow log fields, Resolver query logging (now named "Route 53 VPC Resolver" in docs), Network Firewall log types.
- Lambda logging (JSON levels, S3/Firehose via Delivery class), API Gateway execution/access logs and new execution-log delivery to own destinations, CloudFront standard logging v2 and legacy requirements, ALB access log bucket rules, CloudWatch agent troubleshooting page.

## From general knowledge, not re-fetched (believed current)
- `aws guardduty|securityhub enable-organization-admin-account`, `put-organization-conformance-pack --template-s3-uri --excluded-accounts`, `aws lambda update-function-configuration --logging-config`, `aws apigateway update-account/update-stage` patch paths, `aws events put-rule --state ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`.
- CloudTrail global service events delivered in us-east-1; CloudTrail/CloudWatch Logs KMS key policy conditions; Route 53 `ROUTE53_HEALTHCHECKS` IP ranges; ELB target health reason codes; VPC flow log default format v2 and 10-minute default aggregation; Config periodic frequencies; Macie `aws.macie` / `Macie Finding`; Managed Grafana Athena data source; CloudFront real-time logs to Kinesis Data Streams.

## Deviations / decisions
- Chapter 00 documents four response types (ordering and matching from the guide), as blueprint `typeMix` and the profile now do.
- "What to choose instead" column for closed services: alternatives for SNS message data protection, Audit Manager and CloudTrail Lake follow AWS's own recommendations (A-aws-7); for Incident Manager/Change Manager and Simple AD the alternatives are ordinary available services (my choice, no AWS migration page read). No alternative given for Amazon Q Business.
- Section id in chapter 00 is `decision-rules` (SAP uses `design-principles`, SOA `operations-principles`).
