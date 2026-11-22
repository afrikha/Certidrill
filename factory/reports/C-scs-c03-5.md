# C-scs-c03-5 — COURSE SCS-C03, chapter 63-compliance (2026-11-22)

Files: `content/scs-c03/course/chapters/63-compliance.en.md` and `.fr.md`. Six sections (5 with objectives + key points): 6.3.1 in three sections (config-rules, remediation-notifications, security-hub-compliance), 6.3.2 (audit-evidence), 6.3.3 (well-architected-review). About 2,180 English words of prose (code excluded), 4 code blocks (bash, yaml, json x2), 5 callouts. `check-cert.ts scs-c03 63-compliance`: 0 problems.

## Verified on AWS pages (WebFetch, 2026-11-22)
- Config: aggregator (read-only, no remediation, no charge, organization vs authorized accounts, `AWSConfigRoleForOrganizations`); triggers and evaluation modes (proactive doesn't block or remediate); auto remediation (resource ID parameter, all noncompliant resources remediated when turned on, stale snapshots, no remediation for service-linked rules); RemediationConfiguration API (attempts 1–25 default 5, RetryAttemptSeconds default 60, TargetType SSM_DOCUMENT); organization rules (API/CLI only, Regional, 7-hour recorder window); organization conformance packs (remediation included, excluded accounts, `awsconfigconforms` delivery bucket prefix, template sizes); `config-multiaccountsetup.amazonaws.com` (Knowledge Center); EventBridge event types; SNS message types; runbook `AWS-DisableS3BucketPublicReadWrite`; Well-Architected Security Pillar conformance pack exists.
- Security Hub CSPM: standards list, CIS versions (v5.0.0 recommended), Config prerequisite (service-linked rules `securityhub-`, outside quota, `AWSConfigurationRecorderForSecurityHubCSPM` when Security Hub is also on, Config.1); automation rules (100 per admin, Regional); custom actions (50); event detail-types; central configuration now superseded by Security Hub CSPM declarative policies (mutually exclusive); Organizations "Security Hub policies" for the new Security Hub; new Security Hub automation rules (OCSF, Jira Cloud / ServiceNow ITSM, home Region).
- Audit Manager: closed to new accounts/Regions/organizations April 30, 2026, maintenance, alternatives and caveats (no conformance pack for SOC 2, GDPR); evidence types by data source; assessment report `digest.txt` + `ValidateAssessmentReportIntegrity`; evidence finder uses CloudTrail Lake.
- Artifact: reports, third-party reports (Vendor Insights), organization agreements (management account, all features, covers current and future accounts; from the FAQ), notifications (20 verified emails), example IAM policy actions and condition keys `artifact:ReportSeries` / `artifact:ReportCategory`.
- WA Tool: workload fields (up to 100 account IDs, environment), Framework lens auto-applied, up to 20 lenses, profiles, review templates (same Region), HRI/MRI, milestones, Trusted Advisor integration (Business and Enterprise Support, per workload, Framework lens only), Jira.

## From knowledge, not confirmed on a fetched page
- `configRuleName` field in the Config compliance-change event pattern; managed rule identifier `S3_BUCKET_PUBLIC_READ_PROHIBITED` and rule `cmk-backing-key-rotation-enabled`; Security Hub CSPM compliance statuses `PASSED/FAILED/WARNING/NOT_AVAILABLE`; `config.amazonaws.com` as the aggregator delegated-admin principal (the AWS page's command omits the principal).
- The Artifact "Accepting organization agreements" page returned no content (rate limit then empty); used the Artifact FAQ instead.

## Deliberately left out
- SsmControls defaults (not verified); Security pillar SEC question titles (not on fetched pages); AWS Well-Architected Agent (in preview); the Trusted Advisor support-plan renaming (WA page still says Business and Enterprise Support).

## Points for review
- Evidence finder depends on CloudTrail Lake, itself closed to new customers since May 31, 2026; how this affects existing Audit Manager customers enabling evidence finder now is not documented — the chapter only states the dependency.
- French: « lens / lenses » kept in English (no stable AWS fr_fr term found), « avenant d'associé commercial (BAA) », « evidence finder » kept in English, « politiques déclaratives », « configuration centrale (central configuration) ».
