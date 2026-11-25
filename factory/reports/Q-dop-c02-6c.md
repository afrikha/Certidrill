# Q-dop-c02-6c — QUESTIONS DOP-C02, security 6.3.2–6.3.7 (2026-11-23)

36 questions (6 per objective), single 30 / multi 6, difficulty 6 easy / 18 medium / 12 hard. Validators: 0 problem(s).

## Duplicates avoided
- Read the stems of the existing security-related questions (2a, 2b, 2c, 4a, 4b, and the 6a/6b files that appeared during the task). Two of my drafts tested the same decision as sibling questions and were replaced:
  - check-no-new-access in a pipeline (same as `dopc02-6a-check-no-new-access-pr`) → replaced by `dopc02-6c-guardduty-attack-sequence-s3`.
  - Config advanced query on an aggregator (same as `dopc02-6b-config-advanced-query-aggregator`) → replaced by `dopc02-6c-contributor-insights-top-ips`.
- Kept, but close: `dopc02-6c-guardduty-high-severity-sns` and `dopc02-6b-guardduty-isolate-instance` both use an EventBridge rule with a numeric severity filter of 7 or higher. Mine tests where the rule goes (one rule in the delegated administrator account vs one per member account, EventBridge vs CloudWatch alarm); 6b tests the filter on resource type and a runbook target. A reviewer may want to change one of them.

## Facts not verified on a page fetched in this task (the WebFetch hourly limit was reached once)
Used because they are stable and well known, or stated by the course chapter 63; check them in review:
- CloudTrail Event history keeps 90 days (used in explanations of `athena-cloudtrail-key-history`, `trail-multi-region-opt-in`).
- `iam-user-unused-credentials-check` covers IAM users only (distractor in `access-analyzer-unused-org`).
- `s3-account-level-public-access-blocks-periodic` Config rule name (distractor in `org-s3-block-public-access`).
- GetSecretValue is logged as a read-only management event (`readonly-events-rule-state`).
- SCP action names `config:StopConfigurationRecorder`, `config:DeleteDeliveryChannel`, `guardduty:DisassociateFromAdministratorAccount`, `guardduty:DeleteDetector` (`scp-protect-config-guardduty`; the SCP page does not show an `aws:PrincipalArn` exception example).
- `$context` variables for API Gateway access logs (only named generically in the answer).
- CloudWatch cross-account observability does not copy log data (distractor in `logs-centralization-rule`).
- Contributor Insights: only the overview page was read (top-N contributors, real time, rules on a log field); JSON log support and dashboard widgets come from its subtopics, not fetched.
- AWS-EnableS3BucketEncryption runbook parameters could not be read (page not rendered), so no question relies on that runbook.

## Other notes
- CloudWatch Logs Insights: the stats function is `countDistinct` (not `count_distinct`, which the course chapter does not use but which is a common error); `sort`/`limit` must follow the last `stats`.
- Organization-level S3 Block Public Access (Organizations S3 policy type) exists and is the answer of `org-s3-block-public-access`; the course chapter 63 table still says "S3 Block Public Access at account level ... SCP denying s3:PutAccountPublicAccessBlock". Course owner may want to add the S3 policy.
- CloudWatch Logs centralization rules (cross-account, cross-Region, backup Region, new data only) are not in chapter 63 either.
- Internal access analyzer page (`access-analyzer-internal-access.html`) did not render through WebFetch; no question depends on it.
