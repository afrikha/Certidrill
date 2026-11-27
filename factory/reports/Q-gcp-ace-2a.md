# Q-gcp-ace-2a — report

48 questions in `content/gcp-ace/questions/planning/`, prefix `gcpace-2a-`, 8 per objective (2.1.1–2.1.6). Types: single 38, multi 10 (9 "Choose two." with 5 options, 1 "Choose three." with 6 options: `mig-create-commands`). Difficulty: 14 easy, 24 medium, 10 hard.
Validation: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-2a-` → 0 problem(s); `npm run content:validate -- --cert gcp-ace --prefix gcpace-2a-` → 0 problem(s), 0 warning(s). No scoring NOTE (multi is all or nothing).

## How the facts were checked (2026-11-27)

- Each command and flag was checked against the local gcloud CLI help (SDK 570.0.0) and, for the main ones, against docs.cloud.google.com pages fetched with WebFetch (all references were fetched).
- Facts used as deciding details: regional Persistent Disk attaches only to E2/N1/N2/N2D; N4 supports only Hyperdisk (Balanced, Balanced HA, Throughput) and no Persistent Disk or Local SSD; provisioned IOPS applies to Hyperdisk Balanced/Balanced HA/Extreme, and changes are allowed once every 4 hours; Local SSD can't be added after creation; GPU/TPU, bare metal and most Confidential VMs (except N2D SEV on Milan) can't live migrate, E2 maintenance behavior can't be changed; `ssh-keys` metadata is replaced as a whole; instance `enable-oslogin` overrides project metadata; `compute.requireOsLogin` rejects setting `enable-oslogin=false`; `roles/compute.osLoginExternalUser` at organization level; VM Manager needs an attached service account (no role) and Private Google Access without external IP; MIG VMs are not patched by default (`--mig-instances-allowed`); `--cool-down-period` is the initialization period (default 60 s); predictive autoscaling does not cover one-time events; Cloud Run jobs task timeout up to 168 h, service request timeout up to 60 min.

## Doubts for a reviewer

- `compute-agent-runtime-adk`: the Agent Runtime pages list Sessions without a Preview label but do not state a launch stage explicitly. Memory Bank was deliberately not used.
- `mig-pubsub-backlog`: that a filter is needed when the project has several subscriptions comes from the doc's description of `--stackdriver-metric-filter` (select one value from a metric with several), not from a sentence saying "required". That num_undelivered_messages is a GAUGE metric (option b's wrong target type) is general knowledge, not a fetched sentence.
- `disk-hyperdisk-ml-weights`: the Hyperdisk overview gives two different limits for read-only attachments (100 VMs vs 2,500); the stem uses 40 VMs to stay under both.
- `vmm-mig-vms-patching` option b assumes the patch deployment's patch configuration has the MIG-allowed setting, like the patch job flag (field not checked on the REST page).
- `compute-windows-iis-lift-shift`: "Windows containers can't run on Cloud Run" is inferred from the container contract ("compiled for Linux 64-bit").
- Cloud Run worker pools and the newer TCP ingress for Cloud Run were left out: their launch stage could not be confirmed.
- `oslogin-org-policy-folder` doesn't show a command: the doc still shows the legacy `gcloud beta resource-manager org-policies enable-enforce` syntax.
