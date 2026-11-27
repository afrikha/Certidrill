# Q-gcp-ace-3c — report

48 questions written (`content/gcp-ace/questions/operations/gcpace-3c-*.yaml`), 4 per objective (3.2.6–3.2.8, 3.3.1–3.3.5, 3.4.1–3.4.4): single 38, multi 10; difficulty 14 easy / 24 medium / 10 hard.
Validation: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-3c-` → 48 files, 0 problem(s).
Doubts: sink writer identity roles (Logs Writer plus destination role, as the routing page now says), some reference titles as WebFetch reported them, and three inferred points listed below.

## Details

- Facts checked with WebFetch on docs.cloud.google.com on 2026-11-27. Commands and flags checked with the local gcloud 570.0.0 / bq 2.1.32 `--help`.
- Overlap with other prefixes: I changed three drafts after grepping the bank. The IAP SSH rule (3a), the network firewall policy rule plus association (2c), the app-to-db port 5432 rule (2c), Cloud Storage `--authorize-cmek` (4b) and the release of an idle static IP (3d) are tested elsewhere. My questions on those topics test other decisions: `--source-ranges` replacing the list, FQDN/geolocation objects, add-access-config, rewriting existing objects.
- Writer identity (`gcpace-3c-sink-writer-identity`, `gcpace-3c-org-sink-include-children`): "Route logs to supported destinations" and the aggregated sinks page say to grant `roles/logging.logWriter` for all destinations in addition to the destination role (BigQuery Data Editor). The correct options follow this. If reviewers consider Logs Writer unnecessary, the options stay correct but the wording should be checked.
- Inferred rather than read verbatim:
  - `gcloud compute addresses create` without `--subnet` reserves an external address. This comes from the `--subnet` help text (`gcpace-3c-internal-static-ip`, option d).
  - An explicit deny-all ingress rule at priority 65534 with logging records the traffic that the implied deny would block. The fetched page only says that implied rules can't be logged (`gcpace-3c-fw-log-implied-deny`).
  - Routes with an internal passthrough NLB next hop accept `--tags` (`gcpace-3c-route-tags-priority`).
- Reference titles taken as WebFetch reported them. Some may lack the product segment: "Dataflow jobs list | Google Cloud Documentation", "Use the Dataflow job monitoring interface | Google Cloud Documentation", "Database Center overview | Google Cloud Documentation", "Set up Database Center | Google Cloud Documentation", "Public NAT | Google Cloud Documentation", "Best practices for Cloud DNS | Google Cloud Documentation", "BigQuery IAM roles and permissions | Google Cloud Documentation". The VPC page reported its title as "Quickstart: Create and manage VPC networks | …".
- Database Center: Gemini Cloud Assist chat is Preview, so it is never a correct answer. The "Deletion protection not enabled" and "No point-in-time recovery" checks are partly marked Preview and are not used.
- `gcloud monitoring channels` exists only in alpha/beta, so no question relies on it. `gcloud monitoring policies create --policy-from-file` is GA.
- The VPC Flow Logs metadata default differs between sources (gcloud help says exclude-all), so it is not tested.
- `firewall-policies-rule-evaluation` failed to fetch. The current page `firewall-policies-rule-eval-order` was used instead.
