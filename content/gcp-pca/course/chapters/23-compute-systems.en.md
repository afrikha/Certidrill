Configuring compute is where design choices become concrete settings: a machine series, a provisioning model, a network attachment, an update policy. Exam questions describe a workload and its constraints (cost, interruption tolerance, operational overhead, private connectivity) and ask which configuration meets them with the least effort. This chapter covers Compute Engine provisioning, Spot capacity, network configuration for VMs, GKE, serverless and Google Cloud VMware Engine, infrastructure automation and patching, GKE operations and Cloud Run.

<!-- section: compute-provisioning | objectives: 2.3.1 -->
## Provisioning Compute Engine resources

Pick the **machine series** from the workload profile, then the size.

| Family | Series (examples) | Typical workload |
| --- | --- | --- |
| General-purpose | C4, C4A, C4D, N4, N2, N2D, E2, Tau T2D/T2A | Web and app servers, microservices, databases; E2 = lowest cost, Tau = scale-out |
| Compute-optimized | H3, H4D, C2, C2D | HPC, compute-bound batch, high per-core performance |
| Memory-optimized | M1, M2, M3, M4, X4 | SAP HANA, large in-memory databases; X4 is bare metal |
| Storage-optimized | Z3, Z4D | High local storage throughput: NoSQL, search, data warehouses |
| Accelerator-optimized | A2, A3, A4, A4X, G2, G4 | ML training and inference (A series), graphics and smaller inference (G series) |

- **Custom machine types** (N4, N2, N2D, N1, E2 among others) let you choose vCPUs and memory independently: the answer when a predefined shape wastes memory or vCPUs, or when licensing is per vCPU.
- **Shared-core** types (`e2-micro`, `e2-small`, `e2-medium`) suit small, bursty, non-critical workloads.
- **Sole-tenant nodes** dedicate a physical host to your project: the answer for bring-your-own-license software licensed per physical core or socket, and for compliance rules that forbid sharing hardware with other customers.
- **Reservations** guarantee zonal capacity for a VM shape; **committed use discounts** lower the price of steady usage in exchange for a one- or three-year commitment.

**Managed instance groups (MIGs)** turn one VM definition into an elastic, self-healing fleet:

| Feature | What to know |
| --- | --- |
| Instance template | Immutable VM definition (machine type, image, disks, network, metadata). To change the fleet, create a new template and roll it out |
| Zonal vs regional MIG | A regional MIG spreads VMs across zones of a region and survives a zone outage: the default answer for high availability |
| Autohealing | A health check recreates VMs that fail it; set an initial delay longer than the boot time |
| Autoscaling | Signals: average CPU utilization, load balancer serving capacity, Cloud Monitoring metrics, schedules (up to 128). With several signals, the largest recommendation wins. Predictive autoscaling forecasts cyclical load for slow-starting apps; it works only with CPU utilization (not load balancing or Monitoring metrics) and needs 3 days of CPU-based autoscaling history |
| Not autoscalable | Unmanaged instance groups, stateful MIGs, MIGs with repairs turned off, GKE node pool MIGs (use the cluster autoscaler) |

```bash
gcloud compute instance-templates create web-tmpl-v1 \
  --machine-type=n4-standard-4 --image-family=debian-12 \
  --image-project=debian-cloud --no-address --tags=web

gcloud compute instance-groups managed create web-mig \
  --region=europe-west1 --template=web-tmpl-v1 --size=3 \
  --health-check=web-hc --initial-delay=120

gcloud compute instance-groups managed set-autoscaling web-mig \
  --region=europe-west1 --min-num-replicas=3 --max-num-replicas=20 \
  --target-cpu-utilization=0.6
```

> **Exam trap.** The autoscaler's initialization period (formerly cool down, default 60 seconds) only tells it to ignore metrics from VMs that are still booting. If scale-out is slow because the image installs software at boot, the fix is a custom image with the software baked in, not a shorter initialization period.

<!-- section: spot-standard | objectives: 2.3.2 -->
## Spot versus standard provisioning

| | Standard | Spot VMs | Preemptible VMs (legacy) |
| --- | --- | --- | --- |
| Availability | Runs until you stop it | Compute Engine can preempt at any time to reclaim capacity | Same, and always stopped after 24 hours |
| Price | On-demand | Up to 91 % discount, price can change up to once a day | Discounted |
| SLA | Compute Engine SLA | None | None |
| Host maintenance | Live migration possible | No live migration, no automatic restart | Same |
| Runtime limit | None | None unless you set one | 24 hours |

Spot VMs are the current model for interruptible capacity; preemptible VMs are their predecessor. On preemption, the **termination action** is `STOP` (default, the VM stays in `TERMINATED` with its disks) or `DELETE`. Compute Engine gives a best-effort shutdown period of up to 30 seconds, which a shutdown script can use to checkpoint; you can also request a 120-second preemption notice at creation. Inside the VM, the metadata key `instance/preempted` reports the event.

```bash
gcloud compute instances create render-01 \
  --zone=us-central1-a --machine-type=c2d-standard-16 \
  --provisioning-model=SPOT --instance-termination-action=DELETE \
  --metadata=shutdown-script='gcloud storage cp /work/ckpt gs://render-ckpt/'
```

Design rules:

- Spot fits **fault-tolerant, restartable** work: batch, rendering, CI runners, distributed training with checkpoints, stateless web tiers behind a MIG mixed with standard VMs.
- In a MIG, a preempted Spot VM is recreated when capacity returns; nothing guarantees when. Keep a standard baseline for the minimum capacity the SLO needs.
- In GKE Standard, create Spot node pools (`--spot`); in Autopilot, request Spot Pods with the node selector `cloud.google.com/gke-spot: "true"`. Run critical system workloads on standard nodes.
- Spot capacity counts against preemptible quota; GPUs on Spot VMs are preempted at maintenance events.

> **Exam trap.** "Must complete within a deadline" or "cannot be interrupted" rules Spot out, even if cost is the first requirement. For interruptible batch with no deadline, Spot plus checkpoints to Cloud Storage is the lowest-cost answer.

<!-- section: compute-networking | objectives: 2.3.3 -->
## Network configuration for compute

**Compute Engine.** Prefer VMs **without external IP addresses** (`--no-address`; enforce with the org policy `constraints/compute.vmExternalIpAccess`). Outbound internet goes through **Cloud NAT** (outbound only), Google APIs through **Private Google Access** on the subnet, administrator SSH or RDP through **IAP TCP forwarding**. Firewall rules target VMs by network tag, service account or secure tag. A VM can have several network interfaces, each in a different VPC network, for network virtual appliances.

**GKE.** New clusters are **VPC-native**: Pod IPs come from a secondary range of the subnet (alias IPs) and are routable in the VPC, across VPC Network Peering and from on-premises over Cloud VPN or Cloud Interconnect. Sizing rules:

| Range | Default behavior |
| --- | --- |
| Nodes | Subnet primary range |
| Pods | Secondary range; each node gets a `/24` (256 addresses) for up to 110 Pods. 900 nodes need a `/14` |
| Services | GKE-managed range `34.118.224.0/20` (4,096 Services) on recent versions, or a user-managed secondary range |

In a **Shared VPC**, the host project's network administrator creates the subnet and its secondary ranges before the service project creates the cluster; GKE cannot manage those ranges. Use private nodes (no external node IPs) with Cloud NAT for image pulls from outside Google.

**Serverless.** Cloud Run reaches VPC resources with **Direct VPC egress** (recommended) or a **Serverless VPC Access connector**:

| | Direct VPC egress | Serverless VPC Access connector |
| --- | --- | --- |
| Cost | Network egress only | Connector VMs plus egress |
| Performance | Lower latency, higher throughput | Higher latency, lower throughput |
| IP usage | More: subnet `/26` or larger, plan about twice the instance count | Fewer |
| Network tags | Per service or job | Shared by every service using the connector |

`--vpc-egress=private-ranges-only` sends only internal destinations through the VPC; `all-traffic` sends everything, which is needed for a fixed egress IP through Cloud NAT. **Ingress** controls who can call the service: `all`, `internal` (VPC networks, Shared VPC, internal Application Load Balancer, VPC Service Controls perimeter, and Google sources such as Pub/Sub or Eventarc in the same project or perimeter) or `internal-and-cloud-load-balancing` (adds external Application Load Balancers, for Cloud Armor and Cloud CDN). `--no-default-url` disables the `run.app` URL.

```bash
gcloud run deploy orders-api --image=europe-west1-docker.pkg.dev/acme/apps/orders:1.4 \
  --region=europe-west1 --ingress=internal-and-cloud-load-balancing \
  --network=prod-vpc --subnet=run-subnet --vpc-egress=private-ranges-only
```

**Google Cloud VMware Engine.** Private clouds attach to a **VMware Engine network**. Standard VMware Engine networks are global and connect to your VPC network through **VPC Network Peering**; on-premises networks reach the private cloud through the peered VPC network's Cloud Interconnect or HA VPN. Legacy VMware Engine networks (projects created before November 2023) are regional and use private services access instead.

> **Exam trap.** VPC Network Peering is not transitive. A VMware Engine network peered with a hub VPC network is not automatically reachable from another VPC network peered with that same hub.

<!-- section: orchestration-patching | objectives: 2.3.4 -->
## Infrastructure orchestration, configuration and patching

| Requirement | Tool |
| --- | --- |
| Declarative, versioned infrastructure across environments | Terraform, reviewed in Git and applied by a pipeline |
| Managed Terraform runs with state handled by Google | **Infrastructure Manager** (Infra Manager): runs Terraform in an ephemeral Cloud Build job, stores state and logs in Cloud Storage, supports previews and revisions |
| Manage Google Cloud resources as Kubernetes objects, reconciled continuously | **Config Connector** |
| Legacy Deployment Manager templates | Migrate: Cloud Deployment Manager reached end of support on March 31, 2026; Google points to Infrastructure Manager (DM Convert translates configurations to Terraform) |
| Change a MIG's VMs safely | New instance template plus a rolling update |
| OS patches and package state on a VM fleet | **VM Manager** |

**MIG rolling updates.** A *proactive* update replaces or refreshes VMs automatically at the pace set by `maxSurge` and `maxUnavailable`; an *opportunistic* update applies the new template only when a VM is recreated or when you target it. A canary uses two versions:

```bash
gcloud compute instance-groups managed rolling-action start-update web-mig \
  --region=europe-west1 --version=template=web-tmpl-v1 \
  --canary-version=template=web-tmpl-v2,target-size=10% --type=proactive
```

**VM Manager** has three parts: **Patch** (on-demand patch jobs and scheduled patch deployments, compliance reporting), **OS policies** (install, remove and keep packages and configuration in a declared state) and **OS inventory management**. The OS Config agent is preinstalled on most Google images but must be activated: enabling VM Manager turns on the OS Config API and sets the instance metadata. VMs without external IPs need Private Google Access or a mirror to reach package repositories.

Immutable infrastructure is the alternative: rebuild the image (with the patches) in a pipeline, publish a new template and roll it out. For GKE, patching nodes means letting release channels and auto-upgrade do the work inside maintenance windows.

> **Exam tip.** "Lowest operational overhead to keep hundreds of VMs patched with a report of compliance" points to VM Manager Patch with a scheduled patch deployment, not to custom cron scripts or SSH loops.

<!-- section: container-orchestration | objectives: 2.3.5 -->
## Container orchestration with GKE

| | Autopilot | Standard |
| --- | --- | --- |
| Nodes | Managed by Google, provisioned from Pod specifications | You create and size node pools |
| Billing | Driven by the resources Pods request | Per node (VM), whatever the usage |
| Security defaults | Hardened; privileged Pods blocked | Anything you configure, including privileged Pods |
| Release channel | Mandatory | Recommended; "no channel" is deprecated and removed on June 14, 2027 |
| Choose when | Most workloads; least operational effort | Node-level control: custom kernels, privileged agents, specific node configurations |

Google recommends Autopilot unless a workload needs what Autopilot constraints forbid. A Standard cluster can also run selected workloads in Autopilot mode through **compute classes**, which declare node configurations GKE provisions on demand.

Operations to know:

- **Release channels**: Rapid (earliest, excluded from the GKE SLA), Regular (default), Stable, Extended (up to 24 months on a minor version, with extra cost during extended support). Control timing with **maintenance windows** and **maintenance exclusions** ("no upgrades" lasts at most 90 days).
- **Regional clusters** replicate the control plane and nodes across zones; zonal clusters have a single-zone control plane.
- **Scaling**: Horizontal Pod Autoscaler (replicas), Vertical Pod Autoscaler (requests), cluster autoscaler (nodes in a pool), node auto-provisioning (creates node pools). Autopilot handles node scaling itself. Do not combine a VPA with an HPA scaling on CPU: GKE documents multidimensional Pod autoscaling or HPA rightsizing with VPA (Preview) for that case; VPA works alongside an HPA on custom or external metrics.
- **Identity**: Workload Identity Federation for GKE gives each Kubernetes service account an IAM principal, so Pods call Google APIs without keys.

```bash
gcloud container clusters create-auto shop-prod \
  --region=europe-west1 --release-channel=regular

gcloud container node-pools create batch-spot --cluster=analytics \
  --region=europe-west1 --spot --machine-type=n2-standard-8 \
  --enable-autoscaling --min-nodes=0 --max-nodes=20
```

> **Exam trap.** A team that "must not manage nodes, upgrades or capacity planning" for Kubernetes workloads wants Autopilot, not a Standard cluster with autoscaling. If the workload needs no Kubernetes API at all, Cloud Run is lighter still.

<!-- section: serverless | objectives: 2.3.6 -->
## Serverless computing

| Requirement | Product |
| --- | --- |
| Containerized HTTP service or API, any language, scale to zero | **Cloud Run** service |
| Run-to-completion batch or scheduled task, parallel tasks | **Cloud Run** job (triggered by Cloud Scheduler or Workflows) |
| Single-purpose code reacting to an event or HTTP call, deployed from source | **Cloud Run functions** |
| Existing App Engine application | Keep on App Engine or migrate to Cloud Run; new designs use Cloud Run |
| Long-lived connections, Kubernetes APIs, sidecars, DaemonSets | GKE |

**Cloud Run functions** is the former Cloud Functions (2nd gen): each function is built into a container and runs as a Cloud Run service, so it gets Cloud Run features (Direct VPC egress, traffic splitting, GPUs, concurrency up to 1,000 requests per instance). Event-driven functions use **Eventarc**, which covers Google sources (including 90+ through Cloud Audit Logs) and Pub/Sub. Cloud Run functions (1st gen) is the original version with fewer triggers and options; Google recommends upgrading.

Cloud Run settings that decide exam answers:

| Setting | Effect |
| --- | --- |
| Minimum instances | Removes cold starts for latency-sensitive services; billed while idle |
| Maximum instances | Caps scale-out, protects a downstream database; the cap can be exceeded for a brief period during traffic spikes, so keep headroom below the database's connection limit |
| Concurrency | Requests per instance; raise it for I/O-bound services to use fewer instances |
| Billing: request-based or instance-based | Request-based charges only while handling requests; instance-based charges for the instance lifetime, required for background work and for GPUs |
| Request timeout | Up to 60 minutes; longer work belongs in a Cloud Run job |
| GPU | One NVIDIA GPU (L4, for example) per instance, scales to zero, instance-based billing: serverless model inference |
| Traffic splitting and revision tags | Canary and blue-green releases without extra tooling |

```bash
gcloud run deploy invoice-render --source=. --region=europe-west1 \
  --min-instances=1 --max-instances=50 --concurrency=40 --no-allow-unauthenticated
gcloud run services update-traffic invoice-render --region=europe-west1 \
  --to-revisions=invoice-render-00012-abc=10
```

> **Exam trap.** Cloud Run scales to zero only with minimum instances set to 0. "First request after a quiet night must answer within 200 ms" needs minimum instances of at least 1, which means paying for an idle instance.

<!-- section: key-points -->
## Key points

- Pick the series from the profile (E2 cheapest, C4/N4 general, H/C2 compute, M/X memory, Z storage, A/G accelerators); custom machine types fix wasted shape; sole-tenant nodes for per-core licensing and dedicated-hardware compliance.
- Regional MIG + health check autohealing + autoscaling = resilient VM tier; change it with a new instance template and a rolling or canary update.
- Spot VMs: up to 91 % cheaper, no SLA, no runtime limit, `STOP` or `DELETE` on preemption, a preemption notice of 0 s (default) or 120 s, then up to 30 s of best-effort shutdown; only for fault-tolerant work. Preemptible VMs are the legacy version with a 24-hour limit.
- No external IPs: Cloud NAT out, Private Google Access to Google APIs, IAP TCP forwarding for admin access.
- GKE is VPC-native: size Pod secondary ranges (`/24` per node by default); in Shared VPC the host project creates them.
- Cloud Run: Direct VPC egress preferred over connectors; ingress `internal-and-cloud-load-balancing` to force traffic through an external Application Load Balancer.
- Infrastructure Manager for managed Terraform (Deployment Manager is out of support), Config Connector for Kubernetes-style resource management, VM Manager for patching.
- Autopilot by default, Standard for node-level control; Regular channel is the default; maintenance windows and exclusions control upgrade timing.
