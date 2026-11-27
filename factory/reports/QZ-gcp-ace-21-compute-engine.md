# QZ-gcp-ace-21-compute-engine — report

File: `content/gcp-ace/quizzes/21-compute-engine.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-ace 21-compute-engine` → 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (Q1), 2.1.2 (Q10), 2.1.3 (Q8, Q9), 2.1.4 (Q2, Q6), 2.1.5 (Q4), 2.1.6 (Q5), 2.1.7 (Q3, Q7). Multi: Q5 and Q7 (choose two), Q10 (choose three). The ~55 mock-exam questions of 2.1.1–2.1.7 were read; the quiz tests other decisions: Cloud Run functions run as Cloud Run services, largest recommendation wins with several autoscaling signals, predefined vs custom shape (5% premium), OS Login on one VM through instance metadata, `compute.requireOsConfig` does not update existing projects, autoscaler `only-scale-out` mode vs `off` / `stop-autoscaling`, Spot VMs in a MIG for self-healing fleets, C4 needs Hyperdisk (Extreme is not bootable), snapshot schedule because a regional disk replicates corruption, IAP TCP forwarding for a VM without external IP.

Commands and flags checked with the local gcloud CLI (SDK 570.0.0): `update-autoscaling --mode` (off, on, only-scale-out), `stop-autoscaling` (deletes the configuration), `--min-num-replicas`, `resource-policies create snapshot-schedule --hourly-schedule --max-retention-days --start-time`, `disks add-resource-policies --region`, `compute ssh --tunnel-through-iap / --internal-ip`, `instance-templates create --provisioning-model --instance-termination-action --maintenance-policy --restart-on-failure`.

Pages fetched on 2026-11-27 (docs.cloud.google.com): Compare Cloud Run functions; Autoscaling groups of instances; Manage autoscalers; General-purpose machine family for Compute Engine (C4 disk support, n2-standard-8 shape, 5% custom premium); Set up OS Login; Set up VM Manager; Spot VMs; Google Cloud Hyperdisk overview; Modify a Persistent Disk or Google Cloud Hyperdisk's settings; Move your workload to a new compute instance; Create schedules for disk snapshots; Use IAP for TCP forwarding; Connect to Linux VMs using Identity-Aware Proxy.

## Chapter issues (not edited)

- **`compute.requireOsConfig`** (VM Manager section): the chapter says the constraint "enforces `enable-osconfig=TRUE`". Per Set up VM Manager, it sets the key on **new** projects and rejects requests that set it to FALSE, but it does **not** change projects or VMs created before the policy; those must be updated manually. Worth adding (Q5 relies on it). The same caveat likely applies to `compute.requireOsLogin` (not re-checked).
- **OS Login roles on an instance**: the chapter says to grant the OS Login roles "on the project or the instance". Set up OS Login adds that users who connect from the console or the gcloud CLI need the role at project level, or another project-level role that includes `compute.projects.get`. Worth a sentence.
- **IAP fallback**: Use IAP for TCP forwarding states that `gcloud compute ssh` automatically uses IAP TCP tunneling when the VM has no external IP; the chapter only shows `--tunnel-through-iap`.
- **Stabilization period**: the chapter gives "default 10 minutes"; the autoscaler page says it can be set from 0 to 3600 seconds (`--stabilization-period`). Not wrong, but now configurable.
- **Moving to C4/N4**: the chapter says C4 doesn't support Persistent Disk (confirmed). The migration page also allows an in-place `set-machine-type` after replacing the disks with Hyperdisk Balanced, only under conditions (gVNIC, NVMe driver, no Local SSD or GPU, not in a MIG); the chapter doesn't describe the migration path.
- **N2 and Hyperdisk Balanced**: the general-purpose page says Hyperdisk Balanced (and Balanced High Availability) on N2 requires contacting the account team. The chapter's disk table doesn't mention series restrictions beyond C4/C4D.
- Not verified (not needed for the quiz): Hyperdisk Balanced multi-writer "up to 8 VMs"; regional Persistent Disk "attaches only to E2, N1, N2 and N2D"; Spot quota rule (preemptible quota if requested).

## Doubts

- Q10: option e (`--tunnel-through-iap`) is counted as a required action although gcloud also falls back to IAP by itself for a VM without external IP; the explanation says so. The other two correct actions (firewall from 35.235.240.0/20, IAP-secured Tunnel User) are strictly required.
- Q9: Asynchronous Replication is used only as a distractor; whether it supports a regional source disk was not checked (the option is wrong either way, since it replicates corrupted writes).
- Q5: the OS Config agent and API are stated as already in place so that only the metadata decision remains.
