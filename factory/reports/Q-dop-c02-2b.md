# Q-dop-c02-2b — QUESTIONS DOP-C02, domain config (2026-11-23)

- 51 questions in `content/dop-c02/questions/config/dopc02-2b-*.yaml`: 2.1.7 ×8, 2.2.1 ×8, 2.2.2–2.3.1 ×7 each; single 42 / multi 9; difficulty 9 easy / 24 medium / 18 hard; English only.
- Checks: `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-2b-` → 0 problem(s); `npm run content:validate -- --cert dop-c02 --prefix dopc02-2b-` → 0 problem(s), 0 warning(s).
- Retired services appear only as distractors: CloudTrail Lake (closed to new customers May 31, 2026) in `org-trail-log-archive`, Change Manager (closed November 7, 2025) in `automation-approval`.

## Facts newly verified on AWS pages (worth reusing)
- Security Hub CSPM **central configuration is now legacy**: Security Hub CSPM declarative policies (Organizations policy type) replace it and are mutually exclusive with it (`securityhub-cspm-policy`).
- Control Tower **auto-enrollment** (opt-in landing zone setting): accounts moved between registered OUs inherit the new OU's baselines/controls; not retroactive (`ct-auto-enroll`, and stated as off in `account-factory-basic`, `ct-register-ou`).
- `aws:approve` does not support multi-account/Region automations; SNS topic name must start with "Automation".
- AWS RAM shares no S3 buckets (only S3 Access Grants among S3 resources).
- Organizations created in the console after July 10, 2026 get an SCP denying LeaveOrganization/CloseAccount automatically (not used in a question).

## Facts relied on but not shown on a fetched page (judged standard, left in)
- CodeArtifact cross-account read through a repository policy (`cdk-construct-codeartifact`; the fetched welcome page does not cover cross-account policies).
- Customizations for AWS Control Tower runs on a CodePipeline pipeline (distractor explanation in `afc-blueprint-hub`).
- Run Command `--output-s3-bucket-name` (the fetched "Run commands at scale" page covers targets and rate controls only).
- DLM retention count and cross-Region copy rule as policy settings (fetched page states DR copies to other Regions/accounts, not the setting names).
- `aws:approve` timeout followed by `onFailure: Abort` stops the runbook (the page's own example pairs timeoutSeconds with onFailure: Abort).
