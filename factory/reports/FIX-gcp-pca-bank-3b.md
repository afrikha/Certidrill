# FIX-gcp-pca-bank — part 3b (item 3 for reports Q-gcp-pca-3a…6b and QZ-gcp-pca-*, plus item 4)

Checks after the edits: `npm run -s content:validate -- --cert gcp-pca` → 659 files, 0 problem(s), 0 warning(s); `npx tsx factory/check-quiz.ts gcp-pca` → 16 quiz files, 0 problem(s), 0 warning(s). Ids, objectives, types, difficulty and `status: draft` unchanged.

## Changed files

- `gcppca-5a-deploy-targets-rollback` — the stem now says the rel-118 rollout failed at verification, so rel-117 is clearly "the last release with a successful rollout" (the default of `gcloud deploy targets rollback`); explanation updated to match. https://docs.cloud.google.com/deploy/docs/roll-back
- `gcppca-6b-cloudsql-failover-drill` — option b explanation no longer says "a restart keeps the instance in its zone" (not on any page). It now says a restart drains connections, stops and starts the instance, and is not a failover. https://docs.cloud.google.com/sql/docs/mysql/start-stop-restart-instance, https://docs.cloud.google.com/sql/docs/mysql/high-availability
- `gcppca-3b-eu-sovereign-keys` — correct explanation: "the external key manager can allow or deny it" replaced by "a policy can approve or deny it based on the reason". The KAJ page says external enforcement applies only to select sovereign boundaries. Added that KAJ is on by default for new folders whose boundary includes it. https://docs.cloud.google.com/assured-workloads/key-access-justifications/docs/overview
- `quizzes/11-business-requirements` q2 — added spend cap budgets: they pause new usage of one eligible service per project (Gemini API, Agent Platform, Cloud Run, Cloud Run functions; Compute Engine not eligible), so they can't stop a whole project. Option d explanation reworded; a second reference was added. https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps
- `quizzes/15-migration-future` q7 (item 4, vs `gcppca-cs5b-billing-database`) — rewritten. The old version used the same Oracle-target decision as cs5b with the opposite answer. It also repeated `gcppca-1c-alloydb-columnar`, and a draft that tested DMS continuous migration would have repeated `gcppca-5a-dms-oracle-alloydb`. The question now tests the assessment step: a DMS conversion workspace pulls a schema snapshot and shows conversion issues with no migration job and no data copied. Distractors: a one-time DMS job, the Migration Center TCO report, and Datastream to BigQuery. Answer is still b. https://docs.cloud.google.com/database-migration/docs/oracle-to-alloydb/create-conversion-workspace, https://docs.cloud.google.com/database-migration/docs/oracle-to-alloydb
- `quizzes/21-network-topologies` q9 (item 4, vs `gcppca-2a-ncc-vpc-spokes-mesh`) — removed the "VPC spokes only" distractor, which was the bank question's correct answer. Option b now tests hybrid spokes with their default import ranges, which are empty and import no hub subnets. The correct option c (unchanged id) adds include import ranges and subnet range advertisement on the Cloud Router BGP sessions; the docs require both steps, and the old option and explanation named only the import ranges. A second reference was added. https://docs.cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/spoke-filters-overview

## Doubts settled without a change (confirmed on the docs)

- PAM (3a-sod-pam-jit): GA since 2024-09-16; single-level approval, justification and duration carry no Preview label (IAM release notes, pam-overview). Principal Access Boundary policies are GA since 2024-12-16 (not used).
- Project Creator granted on a folder (3a-rh-sandbox-folder): documented (resource-manager/docs/access-control-folders).
- `_Required` holds Admin Activity, System Event and Access Transparency logs, not Data Access, and its sink can't be modified (logging/docs/routing/overview).
- Secret expiration deletes the secret and all its versions (secret-manager/docs/creating-and-managing-expiring-secrets).
- New org policies are usually not retroactive (resource-manager organization-policy overview).
- CSEK is a Cloud Storage feature, and CSEK for Compute Engine is deprecated. The bank's "not supported by BigQuery / Cloud SQL" wording is consistent with this.
- BigQuery Email mask keeps the domain; Hash (SHA-256) is joinable (column-data-masking-intro).
- Logs Viewer reads no Data Access logs; Private Logs Viewer does (logging/docs/access-control).
- Data Access exemptions and org-level inheritance (logging/docs/audit/configure-data-access).
- Agent Platform CMEK: key in the resource's region, no global, dual-region or multi-region key rings (serving profiles are an exception: `us`/`eu`); the service agent needs Encrypter/Decrypter (vertex-ai/docs/general/cmek).
- Cloud Deploy launch stages: canary and parallel (multi-target) GA 2023-06-26, automation GA 2024-03-11, deploy policies and repair rollout GA 2025-03-31, analysis GA 2026-03-23 (deploy release notes). An abandoned release can't be promoted or rolled back to, and abandoning redeploys nothing (deploy/docs/abandon-release).
- Cloud Build GitHub triggers report results in the GitHub Checks tab (build-repos-from-github).
- Org policy dry run supports custom and managed constraints and logs violations in audit logs. No launch-stage label is shown.
- MIG `--replacement-method=recreate` keeps names and needs maxSurge 0 (rolling-out-updates page). A revision that can receive traffic can't be deleted (run/docs/managing/revisions).
- `.bigqueryrc` command sections with `maximum_bytes_billed` (bq-cli-reference); Spanner emulator REST port 9020 for gcloud (spanner/docs/emulator).
- Quizzes: a stopped Cloud SQL instance still pays for storage and IPs (q13-5); Hyperdisk ML supports G2, with 2,500 read-only attachments up to 512 GiB (q14-6); Cloud Armor protects backend services with hybrid and serverless NEGs (q15-10); VPC firewall egress destinations are IP ranges only and FQDN objects belong to firewall policies (q21-8); ADK agent registration is GA (2026-04-20), its authorization step has no Preview label, and app and Agent Runtime locations must match (q24-8).

## Could not confirm (left as is, not deciding)

- SBOM generation (q31-5): no launch stage on the page. The command is in the GA `gcloud artifacts` group, and the release notes page failed to load. "SPDX 2.3" is not on the generate page.
- KAJ external-manager enforcement for the EU Data Boundary with Access Justifications specifically. This is why the 3b explanation was made generic.
- Infrastructure Manager admin role and Compute Network Admin scope (5b-infra-manager-service-account), the Eventarc ack deadline (q11-9), Transfer Appliance lead time (q12-10) and Policy Analyzer launch stage (q41-3): none of these decides an answer.
- `firewall/docs/fqdn-objects`, `hybrid-spokes` and `conversion-workspaces-about` failed to load (client_error); other pages were used instead.
- Out of scope here: items 1 and 2 (Preview/deprecated answers, renames such as basic Viewer → Reader in 3b-private-logs-viewer option d) and the cs* questions.
