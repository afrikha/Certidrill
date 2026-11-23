# C-dea-c01-5 — COURSE DEA-C01, chapters 44-audit-logs and 45-privacy-governance (2026-11-23)

## Output
- `content/dea-c01/course/chapters/44-audit-logs.{en,fr}.md`: 5 sections + key points, objectives 4.4.1–4.4.5; about 2,200 English prose words (code excluded), 5 callouts.
- `content/dea-c01/course/chapters/45-privacy-governance.{en,fr}.md`: 7 sections + key points, objectives 4.5.1–4.5.7; about 2,200 English prose words (code excluded), 7 callouts.
- `npx tsx factory/check-cert.ts dea-c01 44-audit-logs 45-privacy-governance`: course problems (your chapters): 0.

## Facts checked on AWS pages (WebFetch, November 22–23, 2026)
- CloudTrail concepts (event types and defaults, 90-day event history, five trails per Region, organization trails, global events in us-east-1), FAQ (delivery about every 5 minutes, SSE by default, first copy of management events free), log file integrity validation (SHA-256, hourly digest signed with RSA, chained), sending events to CloudWatch Logs (role, 256 KB event limit).
- CloudTrail Lake page and "availability change" page: closed to new customers May 31, 2026; critical fixes only; account-level EDS don't ingest new member accounts; migration via Export to CloudWatch / `aws logs create-import-task`; pre-2023 data not migrated; CloudWatch capabilities (OCSF/OTel, OpenSearch-powered analytics, Iceberg APIs). Retention 3,653 / 2,557 days, Trino SQL, federation to Glue/Athena, PutAuditEvents channels.
- What's New Dec 5, 2025: CloudTrail events in CloudWatch via service-linked channels, no trail, org-wide.
- CloudWatch Logs: default retention indefinite, account-level retention policies (min 30 days), deletion within ~72 h; log classes (Infrequent Access renamed Essentials, differs in ingestion price only, class cannot change, feature list); subscriptions (5 per log group, 1 account-level per Region, gzip, at-least-once, <3 min, Standard only); export to S3 (12 h availability, 24 h timeout, SSE-S3/SSE-KMS, not DSSE-KMS, use subscriptions for continuous archive); Logs Insights (QL/PPL/SQL, 60 min timeout, 7-day results, per GB scanned, field indexes).
- Athena CloudTrail table with partition projection (DDL properties, SerDe, input format) — the chapter shows an abbreviated column list, labelled "excerpt".
- S3 logging comparison (CloudTrail data events vs server access logs), Redshift audit logging (3 logs, off by default, `enable_user_activity_logging`, SSE-S3 only, no Object Lock, Serverless → CloudWatch only), EMR logging (/mnt/var/log, S3 log URI), OpenSearch Ingestion (Data Prepper, OCUs).
- Redshift data sharing: overview, reads/writes considerations (RA3 or RG node types, Serverless; consumers cannot reshare), general considerations (consumer pays compute and cross-Region transfer, producer pays storage; encryption rules), CREATE DATABASE / GRANT / ALTER DATASHARE syntax pages.
- Lake Formation cross-account sharing (named resources, LF-TBAC, RAM invitation outside org, resource links), Macie (discovery methods, identifiers, allow lists, EventBridge/Security Hub CSPM publication, event schema `aws.macie` / `Macie Finding` / `CLASSIFICATION`|`POLICY`), Macie + Lake Formation pattern (AWS Security Blog), Glue Detect PII transform.
- Control Tower Region deny (AWS-GR_REGION_DENY, CT.MULTISERVICE.PV.1, home Region cannot be denied), AWS Backup condition keys (`backup:CopyTargets` on `CopyFromBackupVault`), SCP Region example (GitHub aws-samples, summary only).
- AWS Config: how it works, FAQ, advanced query, remediation with SSM Automation documents.
- KMS external key store; AWS data privacy FAQ (no move outside chosen Region); AWS European Sovereign Cloud (GA January 14, 2026, `aws-eusc`, `eusc-de-east-1`).
- SageMaker Unified Studio: catalog publishing, discovery/subscription, approval (owning project only, full or filtered, automatic approval cases), Glue fulfillment (LF-managed, grantable permissions, no LF-TBAC, no cross-Region), Redshift fulfillment (grant/view/datashare, no cross-Region), project members (Owner, Contributor).
- AWS Data Exchange data set types (Lake Formation still marked Preview).

## Not fully verified / judgement calls (for review)
- SCP JSON: the AWS example JSON could not be quoted (docs page did not render, GitHub summary only); the chapter shows an abbreviated `NotAction` list and says so. Key spelled `aws:PrincipalArn`.
- The `backup:CopyTargets` deny statement (`ForAnyValue:ArnNotLike` with Region-wildcard vault ARNs) is my construction from the condition-key reference; no AWS example was found.
- Redshift CLI `authorize-data-share` / `associate-data-share-consumer` flags and the datashare ARN format are from my knowledge (the fetched page did not show CLI syntax).
- `aws lakeformation add-lf-tags-to-resource` JSON shape, `get-resource-config-history --limit`, `select-aggregate-resource-config --expression` syntax: from knowledge, not fetched.
- Macie "sensitivity score per bucket" and "occurrences such as cells or records": from knowledge.
- "Cross-Region inference" as a sovereignty watch point is stated generically (no Bedrock specifics).
- SageMaker Unified Studio: "each project has its own IAM role" from knowledge (project role); member limit (20) not used.
- The exam guide's 4.4.3 still asks for CloudTrail Lake: the chapter teaches what it does and states it cannot be adopted by new customers; question writers should not make it the answer for a new design.
- PySpark example (CloudTrail JSON with `multiLine` and `explode("Records")`) not executed.
