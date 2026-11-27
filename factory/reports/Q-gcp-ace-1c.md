# Q-gcp-ace-1c — questions GCP-ACE, domain `setup`, objectives 1.2.1–1.2.4

30 files `content/gcp-ace/questions/setup/gcpace-1c-*.yaml`, all `draft`, English only. Validation: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-1c-` → `30 files, 0 problem(s)`; `npm run content:validate -- --cert gcp-ace --prefix gcpace-1c-` → 0 problem(s), 0 warning(s).

- Per objective: 1.2.1 = 8, 1.2.2 = 8, 1.2.3 = 7, 1.2.4 = 7.
- Types: single 24, multi 6 (all "Choose two.", 5 options, no scoring NOTE because the blueprint scores multi all or nothing).
- Difficulty: 9 easy, 15 medium, 6 hard.
- Correct option of the single questions: a 5, b 7, c 6, d 6.

## Sources fetched (2026-11-27, docs.cloud.google.com)

Cloud Billing: manage-billing-account, create-billing-account, billing-access, concepts (overview), modify-project, secure-project-billing-account-link, budgets, budgets-spend-caps, budgets-notification-recipients, budgets-programmatic-notifications, disable-billing-with-notifications, export-data-bigquery, export-data-bigquery-setup, export-data-bigquery-tables, standard-usage table structure, quotas, release notes; IAM roles overview and Cloud Billing roles/permissions; Resource Manager "Set up a Google Cloud organization resource"; GKE cost allocations; gcloud reference: billing (group), billing projects link/list/describe/unlink, billing accounts list/add-iam-policy-binding, billing budgets create. Commands and flags also checked with the local gcloud SDK 570.0.0 `--help` (billing budgets create, billing projects describe, billing accounts describe/get-iam-policy, `billing/quota_project` property, container clusters update `--enable-cost-allocation`).

## Doubts and points for review

- Spend cap budgets (gcpace-1c-spend-cap-cloud-run correct answer; distractor in gcpace-1c-budget-auto-disable-billing): GA since 2026-10-13 per the Cloud Billing release notes, eligible services Gemini API, Gemini Enterprise Agent Platform, Cloud Run, Cloud Run functions. Newer than the exam guide; the real exam may not test it yet.
- Locking the project–billing account link (gcpace-1c-lock-billing-link, gcpace-1c-disable-billing-blockers): the doc page has no Preview label and no release-note entry was found, so I treated it as GA. Console only (no gcloud command).
- "Email alerts to project owners" on budgets is in Preview (recipients page): used only as a distractor, with the stage stated. CUD metadata and FOCUS exports are Preview: distractors only.
- gcpace-1c-check-project-billing-status: the gcloud reference doesn't list output fields; the claim that `gcloud billing projects describe` shows the linked account and whether billing is enabled rests on the ProjectBillingInfo resource (billingAccountName, billingEnabled), not on a fetched page.
- gcpace-1c-disable-billing-blockers distractor d: the doc says disabling billing on a Shared VPC host also disables dependent services in service projects; it doesn't say it is blocked (I state it isn't).
- Billing roles still name the legacy basic role "Owner"/"Project Owner" in the Cloud Billing docs; gcpace-1c-cross-organization-billing uses "Owner role (`roles/owner`)" as those pages do (IAM now calls Owner/Editor/Viewer legacy basic roles).
- Adjacent topic in another batch: gcpace-4a-org-domain-project-creator (4.1.2) tests removing the domain's default Project Creator binding; my gcpace-1c-restrict-billing-account-creation tests the same default policy for Billing Account Creator (different answer; Project Creator is a distractor there). A reviewer may want to keep only one of them in a single exam.
