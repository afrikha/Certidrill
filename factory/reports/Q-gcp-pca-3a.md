# Q-gcp-pca-3a — QUESTIONS GCP-PCA, domain security, 3.1.1–3.1.7 (2026-11-27)

## Counts
- 50 standalone questions in `content/gcp-pca/questions/security/`, prefix `gcppca-3a-`.
- Per objective: 3.1.1 = 8, 3.1.2 to 3.1.7 = 7 each.
- Types: single 40, multi 10 (9 "Choose two." with 5 options, 1 "Choose three." with 6 options). No scoring NOTE, because `blueprint.scoring.multi` is `all_or_nothing`.
- Difficulty: 10 easy, 25 medium, 15 hard (20/50/30 %).
- `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-3a-`: 50 files, 0 problem(s). `npm run content:validate -- --cert gcp-pca --prefix gcppca-3a-`: 0 problem(s), 0 warning(s).

## Sources
- All facts were checked with WebFetch on docs.cloud.google.com, which is where cloud.google.com/*/docs now redirects (302). References use the docs.cloud.google.com URLs that were fetched. Titles are the H1, without the "| Product | Google Cloud Documentation" suffix.
- curl to docs.cloud.google.com is blocked in this session, so every read went through WebFetch summaries. Exact role IDs and constraint names were checked in a second, targeted fetch.

## Doubts and points not fully verified
- **Privileged Access Manager** (gcppca-3a-sod-pam-jit): the overview page lists several PAM features as Preview (multi-level approvals, scheduling, withdrawal…) but does not label core PAM as GA. The question uses only core features: an entitlement, a justification, one approver and a maximum duration. Please confirm that single-level approval is GA.
- **Principal Access Boundary policies**: the page states no launch stage, so I did not use them, not even as a distractor.
- **Project Creator** (`roles/resourcemanager.projectCreator`) granted on a folder (gcppca-3a-rh-sandbox-folder): I could not read it on the Resource Manager roles page because the page was cut off. This is standard behaviour and I am confident of it, but it is not verified this session.
- **Organization resource from Cloud Identity** (gcppca-3a-rh-no-organization): the page says a Workspace or Cloud Identity account is tied to exactly one organization resource. It does not describe the sign-up and provisioning flow.
- **CSEK not supported by BigQuery or Cloud SQL** (ds-default-encryption, ds-external-keys, cmek-autokey explanations): the CSEK page covers only Cloud Storage. That CSEK is limited to Cloud Storage and Compute Engine comes from general knowledge.
- **Data Access logs are not in the `_Required` bucket** (sod-central-logging, option b): the audit logs overview implies this (the Data Access logs it describes are in `_Default`) but does not list the content of `_Required`.
- **Secret expiration** (ds-secret-rotation, option d): the claim that an expiration deletes the secret comes from general knowledge. The rotation page only covers schedules and Pub/Sub.
- **compute.vmExternalIpAccess and existing VMs** (sc-orgpolicy-existing): this relies on the general statement that new policies are "usually not retroactive". The constraint page says that the managed version blocks creating and updating VMs.
- **Cloud KMS keys and key rings can be deleted "in some circumstances"**: the destroy/restore page now says so. No question claims that they cannot be deleted.
- Deny-policy permissions `compute.googleapis.com/instances.delete` and `cloudresourcemanager.googleapis.com/projects.delete` were confirmed on "Permissions supported in deny policies".

## Possible overlap for reviewers
- Deny policies appear twice with different decisions: iam-deny-prod-delete (organization rule with a tag condition and an exception principal) and rh-inherited-grant (a lower-level allow policy cannot revoke an inherited grant).
- IAP appears in 3.1.5 (hierarchical firewall rule for 35.235.240.0/20) and in 3.1.7 (TCP forwarding roles, web app access): the angles differ.
