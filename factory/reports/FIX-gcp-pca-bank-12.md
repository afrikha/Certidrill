# FIX-gcp-pca-bank — items 1 and 2 (Preview/deprecated correct answers, stale names)

Scope: `content/gcp-pca/questions/**`, `case-studies/*`, `quizzes/*`. Items 3 and 4 were handled by other agents. Each edit was a minimal exact-string replacement, with the file re-read from disk just before the edit. Ids, objectives, types, difficulty and `status: draft` are unchanged.

## Item 1 — Preview or deprecated product as the correct answer

- `gcppca-4a-cat-design-center` (questions/processes): the answer stays the same. Application Design Center has been **GA since 2025-12-05** (release notes), so it does not need to be rewritten. I removed "or imported Terraform modules" from the explanation because importing Terraform modules is still Preview. Sources: https://docs.cloud.google.com/application-design-center/docs/release-notes, https://docs.cloud.google.com/application-design-center/docs/overview
- `gcppca-1b-gca-application-design-center` (objective 1.2.6, exception): answer kept. The explanation now says that Application Design Center is GA and Gemini Cloud Assist is Preview. Source: https://docs.cloud.google.com/cloud-assist/overview
- `gcppca-5a-gca-design-terraform` (objective 5.1.5, exception): answer kept. The explanation now says that Gemini Cloud Assist is Preview and Application Design Center is GA. Source: https://docs.cloud.google.com/cloud-assist/design-application
- Other questions with Gemini Cloud Assist as the answer, all in objectives 1.2.6 or 5.1.5: the sentence "Gemini Cloud Assist is a Preview offering." was added to the explanation of `gcppca-5a-gca-investigation-logs`, `gcppca-5a-gca-residency-cmek`, `gcppca-5a-gca-user-roles`, `gcppca-1b-gca-investigation-from-alert`, `gcppca-1b-gca-iam-least-privilege`, `gcppca-1b-gca-folder-exempt-regulated` and quiz `13-technical-requirements.yaml` q4 (`gcppca-qz-13-04`). Source: https://docs.cloud.google.com/cloud-assist/overview
- `gcppca-5a-gca-finops-insights`: added "Gemini Cloud Assist in Cloud Billing is a Preview offering." Source: https://docs.cloud.google.com/billing/docs/how-to/gemini/overview
- Quiz `12-business-tradeoffs.yaml` q9 (`gcppca-qz-12-09`): one correct answer was "Security Health Analytics findings". Security Health Analytics is disabled for new activations of Security Command Center (Standard-legacy, Premium, Enterprise). I replaced that answer with a Cloud Asset Inventory search of the organization scope filtered on location, removed the stem sentence "Security Command Center Premium is active…", rewrote the explanation and added a reference. Sources: https://docs.cloud.google.com/security-command-center/docs/concepts-security-health-analytics, https://docs.cloud.google.com/asset-inventory/docs/searching-resources, https://docs.cloud.google.com/resource-manager/docs/organization-policy/defining-locations

Grep results with no change needed. In each case the product is only a distractor, or appears only in the stem, and its explanation is correct:
- Video Intelligence API: `gcppca-2b-video-analysis-gemini`, `gcppca-2b-speech-batch-recognition`, qz-24-02.
- Deployment Manager: `gcppca-5b-deployment-manager-migration` (stem only), `gcppca-4a-cat-service-catalog`, `gcppca-2b-infrastructure-manager-terraform`, qz-23-06.
- CSEK: 10 files, distractor only.
- Memorystore for Memcached: qz-14-07.
- Binary Authorization continuous validation: `gcppca-3b-ondemand-scan-gate`, qz-61-05.
- Not found in the bank: Policy Controller, Security Command Center Enterprise tier (the quiz 11 hit is a SaaS "enterprise tier"), global external passthrough Network Load Balancer (every passthrough answer is regional external or internal with global access), forecast alerting conditions, Observability Analytics views.
- Observability Analytics itself is GA, and every answer that uses it upgrades a log bucket to it, with no analytics views.

I also checked these possibly-Preview answers, and they are GA:
- Cloud Run worker pools: GA since 2026-04-14 (https://docs.cloud.google.com/run/docs/release-notes). The question does not use the Preview CPU autoscaling or GPU features.
- Gemini role picker on the IAM page (`gcppca-5a-gca-role-picker`): the console feature has no Preview banner. Only the Policy Assist REST API is Preview, and the question already says so (https://docs.cloud.google.com/iam/docs/role-picker-gemini). Unchanged.

## Item 2 — stale names

- `gcppca-5a-gca-user-roles`: "Vertex AI User" becomes "Agent Platform User (`roles/aiplatform.user`)". The role title changed, as the Gemini Enterprise Agent Platform roles and permissions page shows, and the explanation says "(formerly Vertex AI User)". The distractor "Editor (`roles/editor`)" becomes "Writer (`roles/writer`)". Sources: https://docs.cloud.google.com/iam/docs/roles-permissions/aiplatform, https://docs.cloud.google.com/iam/docs/roles-overview
- `gcppca-cs5a-demand-forecast`: "A custom training job" becomes "A serverless training job (formerly custom training)" in a distractor explanation. Source: profile list of current names.
- Basic roles (source for every line below: https://docs.cloud.google.com/iam/docs/roles-overview). Where an option proposes a new grant of a basic role, it now uses the current name (Admin, Writer, Reader or `roles/admin|writer|reader`), and the explanation follows. The files are `gcppca-5b-terraform-gitops-cloud-build`, `gcppca-5b-infra-manager-service-account`, `gcppca-1b-gca-iam-least-privilege`, `gcppca-4b-skl-partner-gap`, `gcppca-1b-shared-vpc-central-network`, `gcppca-1b-metrics-scope-central-project`, `gcppca-4b-chg-iac-review`, `gcppca-4b-bc-backup-vault`, `gcppca-4b-skl-sandbox`, `gcppca-4b-dec-guardrails-code`, `gcppca-2b-gemini-notebook-business`, `gcppca-4a-cat-project-factory`, `gcppca-2b-partner-model-access`, `gcppca-3b-private-logs-viewer`, `gcppca-3a-rh-no-organization`, `gcppca-3a-sod-iam-admin`, `gcppca-3a-rh-security-reviewer`, `gcppca-3a-iam-groups`, `gcppca-3a-sod-kms-admin`, `gcppca-3a-iam-vm-service-account`, `gcppca-3a-iam-replace-editor`, quiz 11 q8 (`gcppca-qz-11-08`, the role on the recovery project distractor) and quiz 13 q4.
- Basic roles kept under their legacy names, with "legacy" added where the fact depends on it:
  - `gcppca-3a-iam-deny-prod-delete` and `gcppca-3a-iam-conditional-unconditional`: "IAM Conditions cannot be added to legacy basic roles". This qualifier matters because Admin, Writer and Reader now accept conditions.
  - `gcppca-6b-essential-contacts-folder`: "legacy basic role".
  - `gcppca-5b-attached-service-account`: "Editor, a legacy basic role".
  - `gcppca-3a-iam-replace-editor` stem: the existing grant is now "the legacy Editor basic role".
  - Existing-state mentions are unchanged: the default service account's Editor grant, and teams that already hold Owner (`gcppca-2a-hierarchical-deny-folder`, `gcppca-3a-sod-key-project`, `gcppca-4a-cicd-trigger-sa`, quiz 31 q2). These describe real grants that still exist.
- Already current, no change: Dataproc (written as Managed Service for Apache Spark), Cloud Composer (Managed Service for Apache Airflow), Log Analytics (written as "Observability Analytics (formerly Log Analytics)"), Agent Runtime, Agent Search, Gemini Notebook for business. The role name "Cloud NotebookLM User" is unchanged because the docs still use it. Container Registry appears only as a deprecated distractor. No stale names were found in the case studies.

## Could not confirm / for review

- The task said Application Design Center is Preview. The release notes say it has been GA since 2025-12-05, so `gcppca-4a-cat-design-center` keeps it as the answer. Only Terraform import and design validation are Preview.
- Essential Contacts fallback: I did not check whether notifications sent "to owners" now also go to holders of the Admin basic role. `gcppca-6b-essential-contacts-folder` keeps "Owner".
- The resource-locations doc still recommends Security Health Analytics for finding existing violations. I chose Cloud Asset Inventory because Security Health Analytics is disabled for new activations. The search page shows `location:` queries only with a project scope, but it lists the organization as a valid scope.

## Checks

- `npm run -s content:validate -- --cert gcp-pca` → 659 files, 0 problem(s), 0 warning(s).
- `npx tsx factory/check-quiz.ts gcp-pca` → 16 quiz files, 0 problem(s), 0 warning(s).
