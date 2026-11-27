# FIX-gcp-pca-course — correction pass, Professional Cloud Architect course (English only)

Scope: `content/gcp-pca/course/chapters/*.en.md` only. No question, case study or quiz was touched (another agent works on the bank). Section markers and objectives unchanged. All pages fetched on docs.cloud.google.com on 2026-11-27.

Checks: `npx tsx factory/check-cert.ts gcp-pca` → course problems 0 (all chapters: 0). `npm run -s content:validate -- --cert gcp-pca --course` → 659 files, 0 problem(s), 0 warning(s); 17 chapters, 122 sections, 101/101 objectives covered, 0 problem(s).

## Fixes (chapter | change | source)

- 61-operations-excellence | Forecasted metric-value condition marked Preview, "not a default to recommend"; forecast window 1 hour to 2.5 days (was 1 h–7 d) | https://docs.cloud.google.com/monitoring/alerts/metric-forecast
- 61-operations-excellence | Metric absence: alignment period plus retest window at most 25 hours (was "up to 24 hours") | https://docs.cloud.google.com/monitoring/alerts/concepts-indepth
- 24-ai-ml-platform | Stored-video row now points to Gemini video understanding (Cloud Storage URIs, descriptions, timestamped chapters); Video Intelligence API flagged deprecated since 2026-09-14, shutdown 2027-09-14, Gemini as replacement, not for new designs | https://docs.cloud.google.com/video-intelligence/docs/features ; https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/video-understanding
- 24-ai-ml-platform | "Gemini Notebook for business (formerly NotebookLM Enterprise, the name the exam guide uses)" in the section body, heading text and key point (marker unchanged) | https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/overview
- 31-security-design | "Key rings cannot be deleted" replaced: key rings, keys and versions can be deleted only in some circumstances; deleted key ring names can be reused, deleted key names cannot; deleting vs destroying | https://docs.cloud.google.com/kms/docs/resource-hierarchy
- 31-security-design | IAP row: Google recommends IAP directly on Cloud Run (GA 2026-03-13), covers all ingress paths incl. default `run.app` URL; cannot be set on both the load balancer and the service | https://docs.cloud.google.com/run/docs/securing/identity-aware-proxy-cloud-run ; https://docs.cloud.google.com/run/docs/release-notes
- 31-security-design | Secret Manager bullet: on Cloud Run, env var resolved at instance startup (pin a version), volume fetched at each read (follows rotation with `latest`) | https://docs.cloud.google.com/run/docs/configuring/services/secrets
- 14-network-storage-compute-design | Interconnect 99.99 %: added single-metro topology (qualifying metros, four connections across two facility/edge availability domain combinations, connection group `PRODUCTION_CRITICAL`, attachments in the metro's low-latency region); key point updated | https://docs.cloud.google.com/network-connectivity/docs/interconnect/tutorials/dedicated-creating-9999-availability
- 21-network-topologies | Same single-metro 99.99 % row added to the topology table; key point updated | same URL
- 14-network-storage-compute-design | Memorystore for Memcached: no new instances in new projects after 2027-02-01, shutdown 2029-01-31, migrate to Valkey | https://docs.cloud.google.com/memorystore/docs/memcached/memcached-overview
- 14 and 21 | FQDN and geolocation objects are firewall policy rule components; VPC firewall rules do not have them | https://docs.cloud.google.com/firewall/docs/firewalls (VPC firewall rule component list has no FQDN/geolocation; "Use FQDN objects in firewall policy…"); https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-details
- 21-network-topologies | IAP TCP forwarding row: besides `roles/iap.tunnelResourceAccessor`, SSH needs instance access (OS Login roles or Compute Instance Admin v1) | https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- 22-storage-systems | Bucket relocation after creation possible only with Storage Intelligence configured | https://docs.cloud.google.com/storage/docs/locations
- 22-storage-systems | CSEK row: Cloud Storage; CSEK for Compute Engine deprecated | https://docs.cloud.google.com/compute/docs/disks/customer-supplied-encryption
- 22-storage-systems | Exam trap: identity federation with Cloud Storage APIs only on uniform bucket-level access buckets; federated identities cannot generate signed URLs | https://docs.cloud.google.com/iam/docs/federated-identity-supported-services
- 12-business-tradeoffs | Google's six migration types listed explicitly (no "retire"); the Retire row is labeled a general strategy, not one of Google's six | https://docs.cloud.google.com/architecture/migration-to-gcp-getting-started
- 51-advising-teams | API Gateway: OpenAPI 2.0, 3.0.x and 3.1.x (the unverified "since November 2025" date removed) | https://docs.cloud.google.com/api-gateway/docs/openapi-overview
- 51-advising-teams | Investigations: Investigation Creator (`roles/geminicloudassist.investigationCreator`) creates, Investigation Editor runs/edits, Investigation Viewer reads; creator becomes Investigation Owner | https://docs.cloud.google.com/iam/docs/roles-permissions/geminicloudassist ; https://docs.cloud.google.com/cloud-assist/investigations
- 51-advising-teams | Regional MIG: a fixed `maxSurge`/`maxUnavailable` must be 0 or at least the number of zones | https://docs.cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- 42-business-processes | Spend cap budgets: GA since 2026-10-13, monthly period only (eligible services list re-confirmed) | https://docs.cloud.google.com/billing/docs/release-notes ; https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps
- 42-business-processes | Sustained use discounts: full eligible list (N1, M1, M2, f1-micro, g1-small up to 30 %; N2, N2D, C2 up to 20 %; sole-tenant nodes; GPUs on N1), >25 % of the month, not E2 or unlisted series | https://docs.cloud.google.com/compute/docs/sustained-use-discounts
- 41-technical-processes | DR table: instance templates are regional (recommended, own region only) or global (any region); regional/zonal resources restrict them | https://docs.cloud.google.com/compute/docs/instance-templates
- 13-technical-requirements | Cloud Run maximum instances can be exceeded briefly during traffic spikes: keep headroom | https://docs.cloud.google.com/run/docs/configuring/max-instances
- 13-technical-requirements | Autoscaler can't manage MIGs with VM repairs turned off (third case added) | https://docs.cloud.google.com/compute/docs/autoscaler
- 23-compute-systems | Predictive autoscaling only with CPU utilization (not LB or Monitoring metrics), 3 days of history | https://docs.cloud.google.com/compute/docs/autoscaler/predictive-autoscaling
- 23-compute-systems | Don't combine VPA with an HPA on CPU: multidimensional Pod autoscaling or HPA rightsizing with VPA (Preview); VPA with HPA on custom/external metrics is fine | https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- 23-compute-systems | Cloud Run maximum instances row: can be exceeded briefly, keep headroom | https://docs.cloud.google.com/run/docs/configuring/max-instances

## Checked and left unchanged

- 13 and 51 Gemini Cloud Assist residency/CMEK warning: not on the Gemini data governance page (https://docs.cloud.google.com/gemini/docs/discover/data-governance) nor the overview, but stated in a caution on the setup page (https://docs.cloud.google.com/cloud-assist/set-up-gemini): kept.
- 61 Cloud Profiler figures (about 10 s per minute, overhead commonly < 0.5 %, 30-day retention): confirmed on https://docs.cloud.google.com/profiler/docs/about-profiler.
- 15 sustained use discount figures (> 25 % of a month, up to 30 %): confirmed on the SUD page.
- 51 "Cloud Run rollback does not re-run health checks, immediate": confirmed on https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration.
- 24 calendar mode "up to 90 days, up to 80 VMs, up to 53 %": confirmed on https://docs.cloud.google.com/ai-hypercomputer/docs/consumption-models.
- 13/51 Gemini Cloud Assist User role: the roles page says it also grants creating investigations, so the setup roles are kept.

## Not confirmed

- Exact conditions for deleting a Cloud KMS key ring or key: the delete pages (`kms/docs/delete-key-rings`, `kms/docs/delete-keys`) returned site errors; the chapter states only "in some circumstances".
- Launch stage of the 3.x OpenAPI support in API Gateway (page gives none); no date kept.
- FQDN objects vs VPC firewall rules: no page says "not supported in VPC firewall rules" in one sentence; the wording rests on the VPC firewall rule component list and the FQDN page linking FQDN objects to firewall policies. The FQDN objects page itself names no policy type.
- GKE "node auto-provisioning" vs "node pool auto-creation" naming in 23 (chapter 13 uses the new name): the GKE page could not be fetched; left as is.
