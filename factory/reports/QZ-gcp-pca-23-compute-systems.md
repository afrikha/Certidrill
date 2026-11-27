# QZ-gcp-pca-23-compute-systems — report

File: `content/gcp-pca/quizzes/23-compute-systems.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-pca 23-compute-systems` → 0 problem(s), 0 warning(s).

## Plan

| # | Objective | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.3.2 | 1 | single | Spot VMs have no maximum runtime (preemptible: 24 h) |
| 2 | 2.3.1 | 1 | single | Custom N2 machine type (4 vCPUs, 20 GB) vs predefined shapes |
| 3 | 2.3.6 | 2 | single | Cloud Run minimum instances against cold starts |
| 4 | 2.3.3 | 2 | single | Firewall ingress from 35.235.240.0/20 for IAP TCP forwarding |
| 5 | 2.3.5 | 2 | single | Workload Identity Federation for GKE with a principal identifier |
| 6 | 2.3.4 | 3 | single | Config Connector (continuous reconciliation) vs Infrastructure Manager / Cloud Deploy / Deployment Manager |
| 7 | 2.3.1 | 3 | multi (2) | Custom image + predictive autoscaling on CPU (not shorter initialization period, not schedules, not LB signal) |
| 8 | 2.3.3 | 3 | single | Static outbound IP: Direct VPC egress all-traffic + Cloud NAT with reserved IP |
| 9 | 2.3.5 | 3 | multi (2) | HPA + cluster autoscaler (not MIG autoscaling, not VPA with HPA on CPU) |
| 10 | 2.3.6 | 3 | multi (3) | Ingress internal-and-cloud-load-balancing + Cloud Armor, max instances 15, min instances 1 |

Mock-exam questions of 2.3.1–2.3.6 were read first; none of their decisions is repeated (the bank already tests reservations, sole-tenant, rolling and canary updates, Spot termination action, max run duration, Spot node pools, Direct VPC egress with private-ranges-only, Pod range sizing, private nodes + NAT, VMware Engine routes, Infrastructure Manager, OS policies, patch deployments, Autopilot choice, maintenance exclusions, regional control plane, Cloud Run jobs, worker pools, instance-based billing, Cloud Run functions upgrade). Q8 uses an internal API on VMs rather than Memorystore to stay clear of `gcppca-2b-cloud-run-direct-vpc`.

## Facts verified (docs.cloud.google.com, fetched 2026-11-27)

- Spot VMs: no minimum or maximum runtime unless limited, no SLA, no live migration, default STOP, up to 91 %; preemptible VMs: up to 24 hours, Google recommends Spot.
- Custom machine types: N2 0.5–8 GB per vCPU, vCPUs in multiples of 2 up to 32, 5 % premium.
- Cloud Run: min instances default 0; max instances default 100, can be exceeded briefly; ingress settings (`internal` rejects external ALBs, `internal-and-cloud-load-balancing` blocks direct run.app internet requests); static outbound IP needs all-traffic egress + Cloud NAT with a reserved address (Direct VPC egress or connector).
- IAP TCP forwarding: 35.235.240.0/20, ports 22/3389, `roles/iap.tunnelResourceAccessor`, no external IP needed.
- Workload Identity Federation for GKE: always on in Autopilot; principal identifiers recommended; linking method needs both the `roles/iam.workloadIdentityUser` binding and the annotation.
- Config Connector: Kubernetes add-on; reconciliation page says the system "works constantly" toward the declared state.
- Predictive autoscaling: CPU utilization only, 3 days of history, for long initialization and daily/weekly cycles.
- Cluster autoscaler: don't enable Compute Engine autoscaling on node MIGs. VPA: combining with HPA on CPU requires HPA rightsizing (Preview) or multidimensional Pod autoscaling.
- Serverless NEGs with global external Application Load Balancer and Cloud Armor.

## Not verified on a fetched page

- Q4 distractor: 35.191.0.0/16 is a Google Cloud health check range (well-known, page not fetched).
- Q3 distractor: with instance-based billing and minimum instances at 0, the service still scales to zero (inferred from the min-instances page, not stated in one sentence).
- Q8 distractor: that a static external IP cannot be attached to a Cloud Run service for outbound traffic (inferred: the static outbound IP page offers only the Cloud NAT path).

## Chapter remarks (not edited)

- 2.3.1 MIG table: predictive autoscaling is mentioned, but not that it works **only with CPU utilization** (load balancing and Monitoring metrics are not supported) and needs 3 days of history. Worth adding: it is a classic trap.
- 2.3.5: the chapter lists HPA and VPA but not the documented limitation that a VPA on CPU/memory should not be combined with an HPA on the same metric (GKE offers multidimensional Pod autoscaling, or HPA rightsizing in Preview).
- 2.3.6 table: "Maximum instances caps scale-out" — the docs add that the cap can be exceeded briefly during traffic spikes; relevant when it protects a database connection limit.
