# FIX-gcp-ace — bank, setup/ and planning/ (gcpace-1*, gcpace-2*)

Scope: 315 questions in `content/gcp-ace/questions/setup/` and `planning/`. Ids, objectives, types, difficulty and `status: draft` are unchanged. Facts were checked on docs.cloud.google.com on 2026-11-27, and commands with the local gcloud SDK 570 `--help`.

Checks:
- `npm run -s content:validate -- --cert gcp-ace` → 630 files, 0 problem(s), 0 warning(s).
- `npx tsx factory/check-cert.ts gcp-ace` → course problems: 0.
- `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-1` / `gcpace-2` → 0 problem(s).

## Content changes (one line per file)

- `gcpace-1c-lock-billing-link`: the answer (lock the link) is kept. The stem now asks for a safeguard against a single mistaken change, so it no longer says the lock stops the owners. The explanation says that Project Owner, Project Billing Manager or Billing Account Administrator can unlock. https://docs.cloud.google.com/billing/docs/how-to/secure-project-billing-account-link
- `gcpace-1c-spend-cap-cloud-run`: the explanation now gives the scope (one project, one eligible service) and the pause for the rest of the budget period. Unconfirmed claims ("gross" cost, lifted manually) were removed. Cloud Run is on the eligible list (Gemini API, Agent Platform, Cloud Run, Cloud Run functions), GA since 2026-10-13. `gcpace-1c-budget-auto-disable-billing` was checked and is consistent, so it is unchanged. https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps, https://docs.cloud.google.com/billing/docs/release-notes
- `gcpace-1a-obs-sink-bucket-writer` (rewritten because it duplicated 3c-sink-writer-identity): it now tests that a sink to a log bucket in its own project is authorized automatically. A sink to another project needs Logs Writer and Logs Bucket Writer on the destination project. The answer changed from c to b. https://docs.cloud.google.com/logging/docs/export/configure_export_v2
- `gcpace-1a-obs-org-aggregated-sink` (rewritten because it duplicated 3c-org-sink-include-children): it now tests a folder-scoped aggregated sink (`--folder … --include-children`), with an organization sink as the over-broad distractor. The explanation names both writer roles. The answer changed from d to c. https://docs.cloud.google.com/logging/docs/export/aggregated_sinks, https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- `gcpace-1a-obs-ops-agent-roles` (rewritten because it duplicated 3d-ops-agent-sa-roles): the roles are already in place, and the missing piece is the access scope. The answer is to stop the VM, then run `set-service-account --scopes=cloud-platform` and start the VM. https://docs.cloud.google.com/stackdriver/docs/solutions/agents/ops-agent/authorization, https://docs.cloud.google.com/compute/docs/instances/change-service-account
- `gcpace-1a-restrict-project-creation` (rewritten because it duplicated 4a-org-domain-project-creator): the domain grant is already removed, and the question is where to grant Project Creator (on the folder vs on the organization, or Folder Creator / Project IAM Admin). "Google recommends removing" was dropped because the docs only say admins "might want to". https://docs.cloud.google.com/resource-manager/docs/access-control-proj
- `gcpace-1b-standalone-folder-creator` (pair with 1a-folder-creator-role, same answer): it is now a diagnosis question. Neither Organization Owner nor Organization Administrator can create folders. https://docs.cloud.google.com/resource-manager/docs/standalone-organization-overview
- `gcpace-2b-gpu-zone-availability` (same question as 1b-loc-gpu-zones): it now covers a model limited by host I/O and network bandwidth, where the answer is CPU-only VMs. https://docs.cloud.google.com/tpu/docs/intro-to-tpu
- `gcpace-2b-run-deploy-source` (same question as 3a-run-deploy-from-source): it now covers deploying a Cloud Run function from source with `--function` (entry point) and `--base-image`. https://docs.cloud.google.com/run/docs/deploy-functions
- `gcpace-2b-autopilot-traits` (overlapped 3a-autopilot-billing-requests on Pod-request billing): the correct statement is now "the cluster management fee applies as for Standard". The fee distractor became "you choose the node machine type at creation". https://cloud.google.com/kubernetes-engine/pricing
- Basic roles (https://docs.cloud.google.com/iam/docs/roles-overview):
  - New grants now use the current names: `gcpace-1a-api-service-usage-admin` (Owner→Admin), `gcpace-1a-api-billing-compute` (Owner→Admin), `gcpace-1a-iam-project-iam-admin` (Editor→Writer), `gcpace-1b-quota-admin-role` (Editor→Writer, and the explanation no longer relies on its quota permissions), `gcpace-1b-standalone-pipeline-sa` (Owner→Admin).
  - Where the old name decides the answer or describes an existing grant, it is now called "legacy basic": `gcpace-1a-iam-owner-external-console` (the console-only rule is about Owner), `gcpace-1b-standalone-add-owner`, `gcpace-1b-quota-billing-project`, `gcpace-1c-cross-organization-billing` (the billing docs name Project Owner).
- Preview / launch stage, objective 2.4.2:
  - `gcpace-2d-ai-antigravity-agents`: the explanation says the Antigravity docs don't label the platform Preview, and the reference title was fixed to "Choose your Antigravity | Google Antigravity Docs".
  - `gcpace-2d-ai-gemini-cli-facts` and `gcpace-2d-ai-gemini-md-context`: they now say Gemini CLI's Google Cloud page has no Preview label.
  - `gcpace-2d-ai-adc-governed-templates`: Gemini Cloud Assist is now marked Preview.
  - `gcpace-2d-ai-adc-redeploy-replace` and `gcpace-2d-ai-adc-role-deploy`: they now say Application Design Center is GA.
  - Already correct: `gcpace-2d-ai-cloud-assist-tasks` and `gcpace-1b-gca-verify-answer` (both state Preview).
  - Sources: https://docs.cloud.google.com/cloud-assist/overview, https://docs.cloud.google.com/gemini/docs/codeassist/gemini-cli, https://antigravity.google/docs/overview
- `gcpace-2a-compute-agent-runtime-adk`: the Sessions sentence now follows the Sessions overview (no Preview label), which replaces the "Scale your agents" reference. https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/sessions
- `gcpace-2a-mig-pubsub-backlog`: the explanations of options b and c no longer rely on the unconfirmed GAUGE claim. They now use the documented rule that values returned by a broad filter are added together. https://docs.cloud.google.com/compute/docs/autoscaler/scaling-cloud-monitoring-metrics
- `gcpace-2b-storage-agent-publisher`: the stem no longer claims that trigger creation fails, because the docs only say to grant the role before creating the trigger. It now asks what to do before creating the trigger, and the answer is unchanged. https://docs.cloud.google.com/eventarc/standard/docs/run/create-trigger-storage-gcloud
- `gcpace-2d-tags-tag-user-app-team`: the explanation now matches the option (Tag User on the tag value and on pay-prod). https://docs.cloud.google.com/firewall/docs/use-tags-for-firewalls

## Reference titles

201 reference titles in 139 files now carry the full HTML page title, each fetched with WebFetch (130 distinct URLs). The gcloud reference pages follow "gcloud … | Google Cloud SDK | Google Cloud Documentation", checked on 3 pages. Files with a title-only change are every `gcpace-1a-*` file, every `gcpace-2a-*` file and these `gcpace-2d-*` files: ai-adc-*, ai-cloud-assist-tasks, ai-gemini-cli-facts, ai-gemini-md-context, conn-*, iac-cc-*, iac-helm-artifact-registry, iac-tf-*, lb-*, nst-*, tags-*.

Titles left unchanged because they are not docs.cloud.google.com pages: cloud.google.com/about/locations, /storage/pricing and /kubernetes-engine/pricing (title "… | Google Cloud"), geminicli.com (2 pages) and the Fabric FAST GitHub README.

## Checked, no change needed

- 1c-restrict-billing-account-creation vs 4a-org-domain-project-creator: mirror answers, both right. Billing Account Creator can be granted on the organization only, and Billing Account Administrator can't create accounts (billing-access).
- 1b-quota-billing-project vs 1a-api-quota-project-consumer: they test different decisions (missing quota project vs `serviceusage.services.use` on it). Both are consistent with the Set the quota project and Troubleshoot quota errors pages.
- `obs-metrics-scope-setup` (Monitoring Admin on both projects) matches the Metrics scopes page. `disable-billing-blockers` matches modify-project (CUDs and locked link block; Shared VPC host doesn't). `link-roles-least-privilege` matches billing-access (Billing Account User combined with Project Billing Manager links). `compute-windows-iis-lift-shift` matches the container contract (Linux 64-bit). G4 is GA on the GPU machine types page and T4/P4 end of support is 2027-08-01 (`gpu-lifecycle-transcode`).

## Could not confirm

- Launch stage of Google Antigravity and Gemini CLI: no stage is stated in the docs. The explanations say only that the pages carry no Preview label.
- Intercepting aggregated sinks: their behaviour toward `_Default` was not on the page, so the topic was not used.
- `vmm-mig-vms-patching` option b assumes that a patch deployment's patch configuration has the MIG-allowed setting. Patch jobs have `--mig-instances-allowed`, but the patchDeployments REST page couldn't be read. The option is a distractor either way.
- `quota-gcloud-views` (VPC network quota shown by `project-info describe`) and `check-project-billing-status` (describe output fields) rest on the resource schemas, not on a sentence in the docs.
- Remaining similar but different decisions, left as they are: 2b gpu-custom-ops / gpu-high-precision (both GPU, with different deciding facts), cpu-prototyping and the new gpu-zone-availability (both CPU, with different deciding facts), and 2c-fw-source-tags-database vs 2d-tags-src-tag-db-ingress (network tags vs secure tags).
