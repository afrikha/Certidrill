# FIX-gcp-ace — bank, sections 3 and 4 (operations/ gcpace-3*, security/ gcpace-4*)

Scope: 189 files in `content/gcp-ace/questions/operations/` and 126 files in `content/gcp-ace/questions/security/`. Ids, objectives, types, difficulty and `status: draft` are unchanged. Facts were checked on docs.cloud.google.com (WebFetch, 2026-11-27) and the local gcloud 570.0.0 `--help`.

Checks: `npm run -s content:validate -- --cert gcp-ace` → 630 files, 0 problem(s), 0 warning(s). `npx tsx factory/check-cert.ts gcp-ace` → course problems: 0. `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-3` / `gcpace-4` → 189 and 126 files, 0 problem(s).

## Settled points

- **Sink writer identity.** "Route logs to supported destinations" says to grant Logs Writer (`roles/logging.logWriter`) "for all destinations", in the project that stores the destination, plus the destination role (Logs Bucket Writer, Storage Object Creator, BigQuery Data Editor, Pub/Sub Publisher). A log bucket in the same project as the sink has no writer identity and needs no grant. Every sink question in 3c is now consistent with this (https://docs.cloud.google.com/logging/docs/export/configure_export_v2).
- **Basic roles.** The Roles overview names Admin/Writer/Reader and calls Owner/Editor/Viewer legacy basic roles. Conditions can't be added to bindings of legacy basic roles, and a project creator automatically gets Owner. `gcpace-4a-writer-basic-role-condition` and `gcpace-4a-condition-expiry-title` match the page. The default service account pages still say "Editor", so the questions about default service accounts keep "Editor (`roles/editor`)" (https://docs.cloud.google.com/iam/docs/roles-overview).
- **Preview products as answers.** The only Preview product that is a correct answer is Gemini Cloud Assist, in four 3.4.12 questions, and their explanations already state Preview. No spend cap budget question is in these folders.
- **Delegation chain order** (`gcpace-4b-imp-delegation-chain`). The gcloud global flag help confirms the active account → SERVICE_ACCOUNT_1 → SERVICE_ACCOUNT_2 order, so no change was needed.
- Confirmed with no change: Compute Viewer description ("Read-only access to get and list Compute Engine resources…"), on the compute/docs/access/iam page; StatefulSet scale-down in reverse ordinal order with default PVC retention `Retain` (kubernetes.io); the static-route network tags rule for ILB next hops; `gcloud container node-pools update --machine-type`; `iam.serviceAccounts.get/update/disable/enable` are SUPPORTED in custom roles; `iam.disableCrossProjectServiceAccountUsage` "controls whether you can attach a service account to a resource in another project"; project migration ("Roles granted directly on the project move with it"; inherited ones are lost); BigQuery long-term storage reset rules (pricing page); role recommendations (90-day maximum observation period, basic-role recommendations at no charge).

## Changed files (content)

- `gcpace-3c-sink-writer-identity`: rewritten. It overlapped `gcpace-1a-obs-sink-bucket-writer` ("which principal", same answer). The stem now gives the writer identity, and the options test which roles to grant and in which project: Logs Writer + BigQuery Data Editor in the destination project. https://docs.cloud.google.com/logging/docs/export/configure_export_v2
- `gcpace-3c-org-sink-include-children`: option e (a sink without `--include-children`, the same decision as `gcpace-1a-obs-org-aggregated-sink`) is replaced by a wrong role grant (Job User + Data Viewer). The explanation now names Logs Writer + BigQuery Data Editor in the destination project. https://docs.cloud.google.com/logging/docs/export/configure_export_v2, https://docs.cloud.google.com/logging/docs/export/aggregated_sinks
- `gcpace-3c-sink-bigquery-audit`: the explanation now names the writer identity's roles (Logs Writer + BigQuery Data Editor in `sec-prod`). https://docs.cloud.google.com/logging/docs/export/configure_export_v2
- `gcpace-3a-run-deploy-from-source`: rewritten. It tested the same decision as `gcpace-2b-run-deploy-source` (`--source`, same answer). It now tests what a source deploy does with a Dockerfile and no local Docker: Cloud Build uses the Dockerfile, and the `cloud-run-source-deploy` repository is created automatically in the region. https://docs.cloud.google.com/run/docs/deploying-source-code
- `gcpace-3a-hpa-kubectl-autoscale`: the correct option no longer depends on the target flag (`--cpu-percent` in the GKE guide, `--cpu=60%` in the current kubectl reference). The explanation names both. https://docs.cloud.google.com/kubernetes-engine/docs/how-to/horizontal-pod-autoscaling, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_autoscale/
- `gcpace-3a-autopilot-balanced-class`: the Spot explanation now uses the documented fact that Spot Pods run on the default general-purpose class. https://docs.cloud.google.com/kubernetes-engine/docs/how-to/autopilot-spot-pods
- `gcpace-3c-internal-static-ip`: the option d explanation now follows the gcloud reference ("regional external addresses (--region specified, --subnet omitted)"). Source: `gcloud compute addresses create --help`.
- `gcpace-3c-fw-log-implied-deny`: the stem now asks for TCP and UDP connections, because firewall logging "only records TCP and UDP connections". https://docs.cloud.google.com/firewall/docs/firewall-rules-logging
- `gcpace-3d-idle-disk-ip-actions`: added a reference for "You can't reduce the size of a disk." https://docs.cloud.google.com/compute/docs/disks/resize-persistent-disk
- `gcpace-3b-workbench-prereqs-multi`: the Owner distractor is now called the legacy Owner basic role. https://docs.cloud.google.com/iam/docs/roles-overview
- `gcpace-4a-deny-policy-statements`: option a and its explanation name the Admin basic role and the legacy Owner role. https://docs.cloud.google.com/iam/docs/roles-overview
- `gcpace-4a-role-recommendations-basic`: the stem now says "legacy Editor basic role (`roles/editor`)". https://docs.cloud.google.com/iam/docs/roles-overview, https://docs.cloud.google.com/policy-intelligence/docs/role-recommendations-overview
- `gcpace-4a-topic-grant-redundant`: the explanation now says "Pub/Sub Editor"/"Pub/Sub Viewer" instead of the ambiguous "Editor"/"Viewer". https://docs.cloud.google.com/iam/docs/resource-hierarchy-access-control
- `gcpace-4a-default-sa-no-editor`: "on or after 3 May 2024" becomes "after May 3, 2024 … by default", as the docs word it. https://docs.cloud.google.com/iam/docs/service-account-types
- `gcpace-4a-org-role-administrator`: the stem and explanation are limited to organization-level custom roles. I could not confirm that the role also covers project-level custom roles. https://docs.cloud.google.com/iam/docs/creating-custom-roles
- `gcpace-4b-imp-terraform-provider`: distractor d relied on an unverified claim (that Terraform ignores the gcloud impersonation property). It is replaced by re-running `gcloud auth application-default login` with the user account, which is clearly wrong. Titles were also completed. https://docs.cloud.google.com/docs/terraform/authentication
- `gcpace-4c-gke-autopilot-setup`, `gcpace-4c-gke-namespace-principalset`: the stems now state uniform bucket-level access, because identity federation with Cloud Storage "is supported only for uniform bucket-level access buckets". Added the "Identity federation: products and limitations" reference. https://docs.cloud.google.com/iam/docs/federated-identity-supported-services
- `gcpace-4c-gke-principal-identifier`, `gcpace-4c-wif-project-number`: same uniform bucket-level access precision in the stem, so the denial has only one cause. Titles were also completed. https://docs.cloud.google.com/iam/docs/federated-identity-supported-services

## Changed files (reference titles only)

Titles fetched without the " | … | Google Cloud Documentation" suffix were replaced with the page title (og:title). Two-segment titles ("Dataflow jobs list | Google Cloud Documentation", "Public NAT | …", "Database Center overview | …", "BigQuery IAM roles and permissions | …"…) were checked and are the real page titles. Unchanged.

- `gcpace-3d-psh-dashboard-project`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/service-health/docs/view-events
- `gcpace-3d-psh-relevance-filter`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/service-health/docs/view-events
- `gcpace-4b-actas-deploy-denied`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/service-account-permissions, https://docs.cloud.google.com/run/docs/configuring/services/service-identity
- `gcpace-4b-bq-query-one-dataset`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/bigquery/docs/access-control
- `gcpace-4b-bucket-upload-only`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/storage/docs/access-control/iam-roles, https://docs.cloud.google.com/storage/docs/access-control/using-iam-permissions
- `gcpace-4b-cloudsql-secret-two-roles`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/sql/docs/mysql/roles-and-permissions, https://docs.cloud.google.com/secret-manager/docs/access-control
- `gcpace-4b-cmek-storage-agent`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- `gcpace-4b-condition-object-prefix`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/conditions-attribute-reference, https://docs.cloud.google.com/storage/docs/access-control/using-iam-permissions
- `gcpace-4b-cross-project-run-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/run/docs/configuring/services/service-identity, https://docs.cloud.google.com/iam/docs/attach-service-accounts
- `gcpace-4b-cross-project-topic-grant`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/pubsub/docs/access-control, https://docs.cloud.google.com/iam/docs/attach-service-accounts
- `gcpace-4b-custom-role-no-setiampolicy`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/best-practices-service-accounts, https://docs.cloud.google.com/iam/docs/service-account-permissions
- `gcpace-4b-default-sa-editor-existing`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/best-practices-service-accounts, https://docs.cloud.google.com/compute/docs/access/service-accounts
- `gcpace-4b-function-runtime-flag`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy, https://docs.cloud.google.com/iam/docs/attach-service-accounts
- `gcpace-4b-gke-node-pool-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/kubernetes-engine/security/configure-node-service-accounts, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster
- `gcpace-4b-imp-adc-local-code`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation
- `gcpace-4b-imp-audit-vs-keys`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/service-account-impersonation, https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation
- `gcpace-4b-imp-block-key-fallback`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/best-practices-service-accounts, https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation
- `gcpace-4b-imp-check-config`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation
- `gcpace-4b-imp-config-set-unset`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation
- `gcpace-4b-imp-delegation-chain`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/sdk/gcloud/reference, https://docs.cloud.google.com/iam/docs/service-account-impersonation
- `gcpace-4b-imp-elevation-design`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/best-practices-service-accounts, https://docs.cloud.google.com/iam/docs/service-account-impersonation
- `gcpace-4b-imp-flag-one-command`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation, https://docs.cloud.google.com/iam/docs/service-account-impersonation
- `gcpace-4b-imp-sau-indirect-access`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/best-practices-service-accounts, https://docs.cloud.google.com/iam/docs/service-account-permissions
- `gcpace-4b-imp-time-bound`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/manage-access-service-accounts, https://docs.cloud.google.com/iam/docs/best-practices-service-accounts
- `gcpace-4b-inherited-folder-grant`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/manage-access-service-accounts, https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
- `gcpace-4b-instance-template-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/attach-service-accounts, https://docs.cloud.google.com/compute/docs/access/service-accounts
- `gcpace-4b-list-roles-of-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/manage-access-service-accounts, https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
- `gcpace-4b-member-prefix-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/principal-identifiers, https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
- `gcpace-4b-oslogin-needs-sau`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/compute/docs/oslogin/set-up-oslogin, https://docs.cloud.google.com/iam/docs/best-practices-service-accounts
- `gcpace-4b-principal-set-future-sas`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/best-practices-service-accounts, https://docs.cloud.google.com/iam/docs/principal-identifiers
- `gcpace-4b-pubsub-publisher-topic`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/pubsub/docs/access-control
- `gcpace-4b-pubsub-push-auth`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- `gcpace-4b-revoke-token-creator`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/manage-access-service-accounts
- `gcpace-4b-run-default-identity`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/run/docs/securing/service-identity
- `gcpace-4b-run-deploy-identity`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/run/docs/configuring/services/service-identity, https://docs.cloud.google.com/run/docs/securing/service-identity
- `gcpace-4b-run-invoker-one-service`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/run/docs/securing/managing-access
- `gcpace-4b-sa-viewer-analyst`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/keys-list-get, https://docs.cloud.google.com/iam/docs/service-account-permissions
- `gcpace-4b-sau-on-one-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/manage-access-service-accounts, https://docs.cloud.google.com/iam/docs/best-practices-service-accounts
- `gcpace-4b-scheduler-oidc-run`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/scheduler/docs/http-target-auth
- `gcpace-4b-secret-accessor-one-secret`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/secret-manager/docs/access-control
- `gcpace-4b-split-dev-sec-roles`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/service-account-permissions, https://docs.cloud.google.com/iam/docs/manage-access-service-accounts
- `gcpace-4b-user-keys-cleanup`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/list, https://docs.cloud.google.com/iam/docs/keys-list-get
- `gcpace-4b-vm-change-sa-stop`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/compute/docs/instances/change-service-account
- `gcpace-4b-vm-default-scope-403`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/compute/docs/access/service-accounts, https://docs.cloud.google.com/compute/docs/instances/change-service-account
- `gcpace-4b-vm-no-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/compute/docs/instances/change-service-account, https://docs.cloud.google.com/compute/docs/access/service-accounts
- `gcpace-4b-who-has-access-on-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/manage-access-service-accounts
- `gcpace-4c-cloud-run-id-token`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/run/docs/configuring/custom-audiences
- `gcpace-4c-gke-enable-workload-pool`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- `gcpace-4c-gke-existing-node-pool`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- `gcpace-4c-gke-image-pull-node-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/artifact-registry/docs/integrate-gke
- `gcpace-4c-gke-link-ksa-iam-sa`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- `gcpace-4c-gke-pod-spec-fixes`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- `gcpace-4c-wif-aws-credential-config`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- `gcpace-4c-wif-aws-workload`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- `gcpace-4c-wif-create-aws-provider`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- `gcpace-4c-wif-eks-workloads`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-kubernetes
- `gcpace-4c-wif-github-attribute-condition`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- `gcpace-4c-wif-github-workflow`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- `gcpace-4c-wif-impersonation-role`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- `gcpace-4c-wif-pool-admin-role`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- `gcpace-4c-wif-required-apis`: reference title(s) completed to the page title with suffix — https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

## Near-duplicate pairs reviewed

- 4c `access-token-curl` / `cloud-run-id-token` vs 4b (`imp-flag-one-command`, `scheduler-oidc-run`, `imp-time-bound`): these test different decisions (access token vs ID token, impersonation flag vs `--account`, OIDC vs OAuth for Scheduler). No change.
- 1c `restrict-billing-account-creation` vs 4a `org-domain-project-creator`: opposite answers (Billing Account Creator vs Project Creator), and each is right for its stem. Option d ("Owner" for the project creator) matches the Roles overview. No change.
- 1a sink questions vs 3c: fixed as described above.
- Automated scan (stem and answer token overlap) across the bank: the only other same-decision/same-answer pair was 2b/3a run-deploy-source (fixed). `3b-run-429-concurrency` vs `3b-run-concurrency-one` have opposite answers that are both right. `3a-gke-get-credentials` vs 2b kubeconfig questions test different decisions.

## Not confirmed

- BigQuery pricing page title (`gcpace-3b-bq-long-term-reset-multi`): the fetched text begins "BigQuery | Google Cloud" and has no metadata, so "BigQuery pricing | Google Cloud" is kept. The content (90 days, reset rules) is confirmed. The cloud.google.com pricing and calculator titles are kept as they are ("… | Google Cloud").
- `gcpace-4a-disable-custom-role`: the docs confirm that disabling inactivates the bindings and keeps them. Re-enabling by setting the stage back to `GA` is not written explicitly on the page; `gcloud iam roles update --stage` accepts a stage. Kept.
- `gcpace-3a-k8s-statefulset-scale-down`: the behaviour is confirmed on kubernetes.io only. The GKE pages referenced don't state it.
- Inferences left as the writers reported them, not re-verified: `3d-lb-status-details` (`httpRequest.status`), `3d-psh-alert-roles` (four roles from the quickstart), `4a-bucket-condition-ubla` (ACL entries have scope + permission only and no expiry on the ACL page — consistent).
