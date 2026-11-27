Planning compute means picking the platform, then concrete settings: machine type, availability policy, disk type, instance template, SSH access model, patching. Associate Cloud Engineer questions describe a simple need and ask for the product, command or flag that meets it with the least effort or cost.

<!-- section: compute-choices | objectives: 2.1.1 -->
## Choosing a compute platform

| Requirement in the stem | Platform |
| --- | --- |
| Full control of the OS, custom kernel or agents, licensed software, lift and shift of an existing VM | **Compute Engine** |
| Containerized microservices that need the Kubernetes API, Helm charts, DaemonSets, StatefulSets or portability with other Kubernetes clusters | **Google Kubernetes Engine (GKE)**: Autopilot by default, Standard for node-level control |
| Stateless container serving HTTP requests, scale to zero, no cluster to manage | **Cloud Run** service |
| Containerized batch task that runs to completion (nightly export, data processing) | **Cloud Run** job |
| A single function reacting to an HTTP call or an event (new object in a bucket, Pub/Sub message) | **Cloud Run functions** (formerly Cloud Functions) |
| An AI agent built with ADK, LangChain, LangGraph or another framework, to deploy and scale without managing infrastructure, with sessions and Memory Bank | **Agent Runtime** on Gemini Enterprise Agent Platform (formerly Vertex AI Agent Engine) |

Rules of thumb:

- Less operational overhead: Compute Engine → GKE Standard → GKE Autopilot → Cloud Run → Cloud Run functions.
- Cloud Run and Cloud Run functions scale to zero and, by default, bill only while handling requests; VMs and GKE Standard nodes bill while running.
- Cloud Run functions are built into containers and deployed as Cloud Run services, with Cloud Run's scaling and traffic features.

> **Exam trap.** "Run a container" does not mean GKE. If nothing in the stem needs Kubernetes (no cluster-wide scheduling, no Kubernetes manifests to keep, no sidecars or DaemonSets), Cloud Run is the least-effort answer.

<!-- section: launch-instance | objectives: 2.1.2 -->
## Launching a Compute Engine instance

```bash
gcloud config set compute/zone europe-west1-b
gcloud compute instances create web-01 \
  --machine-type=e2-standard-2 \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --maintenance-policy=MIGRATE --restart-on-failure \
  --tags=http-server --deletion-protection
```

Machine families: **general-purpose** (E2 lowest cost, N4, N2, N2D, C4), **compute-optimized** (H, C2: HPC), **memory-optimized** (M: SAP HANA), **storage-optimized** (Z) and **accelerator-optimized** (A, G: GPUs). Shared-core types (`e2-micro`, `e2-small`) suit small, bursty workloads.

**Availability policy.** Two scheduling settings decide what happens during host maintenance and host failures:

| Setting | Values | Default and notes |
| --- | --- | --- |
| On host maintenance (`--maintenance-policy`) | `MIGRATE` (live migration to another host, no reboot) or `TERMINATE` (the VM is stopped) | `MIGRATE` for most VMs |
| Automatic restart (`--restart-on-failure` / `--no-restart-on-failure`) | Restart the VM if it is stopped by a host error or crash | On by default |

VMs with GPUs or TPUs, bare metal instances and some machine series (H4D, X4) can't live migrate and use `TERMINATE`. Change the settings of a stopped VM with `gcloud compute instances set-scheduling`.

**SSH keys.** Linux VMs accept SSH keys in one of two ways:

| Method | How it works | When |
| --- | --- | --- |
| **OS Login** (recommended) | Access follows IAM roles; keys are tied to the user's Google identity | Organizations, audit, least privilege (see below) |
| Metadata-based keys | Public keys in the `ssh-keys` metadata entry, `USERNAME:KEY_VALUE`, in **project** metadata (all VMs of the project) or **instance** metadata (one VM) | Small projects, users without Google identities |

- `gcloud compute ssh` and the console SSH button generate and push keys for you (to metadata, or to the OS Login profile).
- To stop project-wide keys from working on a sensitive VM, set the instance metadata `block-project-ssh-keys=TRUE`.
- VMs without an external IP address are reached through IAP TCP forwarding: `gcloud compute ssh web-01 --tunnel-through-iap` (for a VM with no external IP, `gcloud compute ssh` also switches to IAP tunneling automatically), with a firewall rule allowing TCP 22 from `35.235.240.0/20` and the IAP-secured Tunnel User role (`roles/iap.tunnelResourceAccessor`).

```bash
gcloud compute instances add-metadata db-01 --metadata=block-project-ssh-keys=TRUE
gcloud compute project-info add-metadata --metadata-from-file=ssh-keys=keys.txt
```

> **Exam trap.** `gcloud compute project-info add-metadata --metadata-from-file=ssh-keys=...` replaces the whole `ssh-keys` value: re-add the existing keys in the file, or every other user loses access.

<!-- section: vm-storage | objectives: 2.1.3 -->
## Choosing storage for Compute Engine

Hyperdisk and Persistent Disk are durable network storage (required for boot disks); **Local SSD** is attached to the host, fastest, and loses its data when the VM stops or the host fails.

| Option | Use | Key facts |
| --- | --- | --- |
| **Hyperdisk Balanced** | Most boot and data disks, general databases | IOPS and throughput provisioned independently of size; up to 64 TiB; read-write attach to up to 8 VMs |
| **Hyperdisk Balanced High Availability** | Mission-critical data needing zero RPO across zones | Synchronous replication across two zones of a region |
| **Hyperdisk Extreme** | SAP HANA, high-end SQL Server and Oracle | Highest IOPS; not a boot disk |
| **Hyperdisk Throughput** | Hadoop, Spark, Kafka, cold data | Throughput-oriented, up to 32 TiB; not a boot disk |
| **Hyperdisk ML** | Model weights read by many VMs | Read-only attach to many instances; not a boot disk |
| Persistent Disk `pd-balanced`, `pd-ssd`, `pd-standard` | Series that support PD: general purpose (balanced), low-latency databases (SSD), cheap sequential HDD (standard) | Performance grows with size |
| Local SSD | Scratch space, caches, temporary data | Ephemeral; added at VM creation |

Rules to remember:

- Hyperdisk performance is set independently of capacity and can be changed while the disk is in use; Persistent Disk performance depends on capacity, so you grow the disk to get more IOPS.
- The newest machine series use Hyperdisk only: C4 and C4D, for example, do not support Persistent Disk.
- Disks can be resized up, never down.
- **Zonal** disks live in one zone. **Regional** disks (`pd-balanced`, `pd-ssd`, `pd-standard` with a 200 GiB minimum, or Hyperdisk Balanced High Availability) replicate synchronously to a second zone of the same region. On a zonal outage you **force-attach** the disk to a VM in the replica zone. Regional Persistent Disk attaches only to E2, N1, N2 and N2D machine types.

```bash
gcloud compute disks create orders-data --region=europe-west1 \
  --replica-zones=europe-west1-b,europe-west1-c --type=pd-balanced --size=200GB
gcloud compute instances attach-disk standby-01 --zone=europe-west1-c \
  --disk=orders-data --disk-scope=regional --force-attach
```

> **Exam trap.** A regional disk protects against a zone failure, not against deletion or corruption: a bad write is replicated to both zones at once. Point-in-time protection needs snapshots (schedule them with a snapshot schedule).

<!-- section: mig-autoscaling | objectives: 2.1.4 -->
## Autoscaled managed instance groups

A **managed instance group (MIG)** creates identical VMs from an **instance template**, recreates failed VMs (autohealing with a health check) and scales with an autoscaler. Order of operations:

1. Create the instance template (global, or regional to keep it in one region). Templates are immutable: to change the fleet, create a new template and roll it out.
2. Create a health check and allow its probes in the firewall: the Compute Engine autohealing page gives the source ranges `130.211.0.0/22` and `35.191.0.0/16`.
3. Create the MIG from the template, zonal (`--zone`) or **regional** (`--region`, VMs spread across zones, survives a zone outage).
4. Turn on autoscaling.

```bash
gcloud compute instance-templates create web-tmpl-v1 \
  --machine-type=e2-standard-2 --image-family=debian-12 --image-project=debian-cloud \
  --tags=http-server --metadata-from-file=startup-script=startup.sh
gcloud compute health-checks create http web-hc --port=80 --request-path=/healthz
gcloud compute instance-groups managed create web-mig --region=europe-west1 \
  --template=web-tmpl-v1 --size=2 --health-check=web-hc --initial-delay=120
gcloud compute instance-groups managed set-autoscaling web-mig --region=europe-west1 \
  --min-num-replicas=2 --max-num-replicas=10 --target-cpu-utilization=0.6
```

| Autoscaler setting | What to know |
| --- | --- |
| Signals | Average CPU utilization (default signal), load balancer serving capacity, Cloud Monitoring metrics, schedules (up to 128 per group). With several signals, the one that needs the most VMs wins |
| Initialization period | Default 60 seconds: metrics from VMs still booting are ignored |
| Stabilization period | Default 10 minutes before scaling in, so capacity for the recent peak is kept; configurable from 0 to 3,600 seconds (`--stabilization-period`) |
| Scale-in controls | Limit how many VMs can be removed within a time window |
| Mode (`--mode`) | `on`, `off`, `only-scale-out`: turn off or restrict scaling while keeping the configuration |
| Cannot be autoscaled | Unmanaged instance groups, stateful MIGs, MIGs with VM repairs turned off, MIGs owned by GKE |

> **Exam trap.** Autoscaling needs a managed instance group, and a managed instance group needs an instance template. An unmanaged instance group (a set of existing VMs you grouped yourself) can sit behind a load balancer but can neither autoscale nor autoheal.

<!-- section: os-login | objectives: 2.1.5 -->
## Configuring OS Login

OS Login ties Linux SSH access to IAM: access ends when the role is removed or the account is disabled.

1. Enable it with the metadata key `enable-oslogin=TRUE`, in project metadata (all VMs) or instance metadata (one VM). **Instance metadata wins**: `enable-oslogin=FALSE` on a VM turns it off there.
2. Grant one role per user, on the project or the instance (a user who connects from the console or the gcloud CLI with an instance-level grant also needs a project-level role that includes `compute.projects.get`):

| Role | Gives |
| --- | --- |
| Compute OS Login (`roles/compute.osLogin`) | SSH as a standard user, no sudo |
| Compute OS Admin Login (`roles/compute.osAdminLogin`) | SSH with sudo (administrator) |
| Service Account User (`roles/iam.serviceAccountUser`) on the VM's service account | Also required when the VM has a service account attached |
| Compute OS Login External User (`roles/compute.osLoginExternalUser`), at the organization | Users from another organization |
| IAP-secured Tunnel User (`roles/iap.tunnelResourceAccessor`) | Also required to connect through IAP TCP forwarding |

3. Optional: require 2-Step Verification with `enable-oslogin-2fa=TRUE` (together with `enable-oslogin=TRUE`).
4. Enforce it across projects with the organization policy constraint `compute.requireOsLogin`: new projects get `enable-oslogin=true`, and requests that set it to false are rejected.

```bash
gcloud compute project-info add-metadata --metadata=enable-oslogin=TRUE
gcloud projects add-iam-policy-binding example-prod \
  --member=group:ops-admins@example.com --role=roles/compute.osAdminLogin
gcloud compute os-login ssh-keys add --key-file=$HOME/.ssh/id_ed25519.pub --ttl=30d
```

When OS Login is enabled, Compute Engine deletes the VM's `authorized_keys` files and ignores SSH keys stored in project or instance metadata.

> **Exam tip.** "Developers must lose SSH access as soon as they leave the company, with no key cleanup" or "give one team sudo on the VMs and another team only standard login" both point to OS Login with `roles/compute.osAdminLogin` and `roles/compute.osLogin`, granted to groups.

<!-- section: vm-manager | objectives: 2.1.6 -->
## Configuring VM Manager

**VM Manager** manages the operating systems of a VM fleet at scale. Its features:

| Feature | Purpose |
| --- | --- |
| **Patch** | Run patch jobs on demand or on a schedule (patch deployments), with pre- and post-patch scripts, reboot settings and compliance reports |
| **OS policies** | Declare packages, files and configuration a VM must keep (install, remove, keep in state); OS policy assignments target VMs by zone, labels or OS |
| **OS inventory management** | Collect OS details, installed packages and vulnerability reports |

Setup steps:

1. Enable the OS Config API (`osconfig.googleapis.com`) in the project.
2. Set the metadata `enable-osconfig=TRUE` in project metadata (or per VM).
3. Make sure the **OS Config agent** runs on each VM: it is preinstalled on recent Google-provided images of most Linux distributions and Windows Server, and stays idle until the API and metadata are enabled.
4. Attach a service account to each VM (it needs no IAM role; VM Manager uses it to sign requests).
5. VMs without external IPs need **Private Google Access** on their subnet to reach the OS Config API.

The console can enable VM Manager automatically on the first visit to a VM Manager page. The organization policy constraint `compute.requireOsConfig` adds `enable-osconfig=TRUE` to the metadata of **new** projects and rejects requests that set it to `FALSE`. It doesn't change projects created before the policy or existing VMs: update their metadata yourself.

```bash
gcloud services enable osconfig.googleapis.com
gcloud compute project-info add-metadata --metadata=enable-osconfig=TRUE
gcloud compute os-config patch-jobs execute --instance-filter-all \
  --display-name=emergency-patch --reboot-config=default
gcloud compute os-config patch-deployments create weekly-patch --file=weekly-patch.yaml
gcloud compute os-config os-policy-assignments create web-baseline \
  --location=europe-west1-b --file=web-baseline.yaml
```

> **Exam trap.** A patch job reports VMs as "no agent detected" or "inactive": check the three prerequisites before anything else, the OS Config API, the `enable-osconfig` metadata and a running agent (plus Private Google Access for VMs without external IPs).

<!-- section: spot-custom | objectives: 2.1.7 -->
## Spot VMs and custom machine types

**Spot VMs** use spare capacity at a large discount (up to 91 % for many machine types, GPUs, TPUs and Local SSDs; the price can change once a day), but Compute Engine can **preempt** them at any time.

| Fact | Detail |
| --- | --- |
| Preemption notice | 0 seconds (default) or 120 seconds, then a best-effort shutdown period of up to 30 seconds; a shutdown script can save state |
| Termination action | `STOP` (default; the VM stays `TERMINATED` with its disks, which are still billed) or `DELETE` |
| Runtime | No minimum or maximum unless you set one (`--max-run-duration`) |
| Limits | No SLA, no live migration, no automatic restart, no Free Tier credits |
| In a MIG | The group recreates preempted VMs when capacity returns, to reach its target size |
| Quota | Preemptible quota if you requested it in the region, otherwise standard quota |

Preemptible VMs are the legacy version (24-hour limit). Use Spot VMs for fault-tolerant, restartable work: batch, rendering, CI runners, checkpointed training.

```bash
gcloud compute instances create render-01 --zone=us-central1-a \
  --machine-type=n2-standard-8 --provisioning-model=SPOT \
  --instance-termination-action=DELETE \
  --metadata-from-file=shutdown-script=save-state.sh
```

**Custom machine types** let you pick the vCPU count and memory independently when no predefined shape fits (for example, software licensed per vCPU that needs a lot of memory).

- Supported series: N4, N4D, N4A, N2, N2D, E2 and N1 (and G2 with GPUs).
- Memory in multiples of 256 MB; usually 0.5 to 8 GB per vCPU (N1: up to 6.5 GB). Beyond that, **extended memory** (N4, N4A, N4D, N2, N2D, N1; not E2) is billed at a higher rate.
- vCPU counts follow series rules: E2 even numbers from 2 to 32, N2 even numbers up to 32 then multiples of 4.
- Price: a 5 % premium over the equivalent predefined machine type.

```bash
gcloud compute instances create erp-01 --zone=europe-west1-b \
  --machine-type=n2-custom-6-30720
gcloud compute instances create erp-02 --zone=europe-west1-b \
  --custom-vm-type=n2 --custom-cpu=6 --custom-memory=30GB
gcloud compute instances create cache-01 --zone=europe-west1-b \
  --machine-type=n2-custom-2-20480-ext
```

> **Exam trap.** "Must not be interrupted" or "must finish before a deadline" rules out Spot, even when cost is the first criterion. And a custom machine type is the answer only when predefined shapes waste resources: it costs 5 % more than the same predefined shape.

<!-- section: key-points -->
## Key points

- Compute Engine for OS control, GKE for Kubernetes, Cloud Run for stateless containers, Cloud Run functions for event-driven code, Agent Runtime for AI agents.
- `MIGRATE` (default) or `TERMINATE` on host maintenance, automatic restart on by default; GPU and Spot VMs don't live migrate.
- Metadata `ssh-keys` (project or instance), `block-project-ssh-keys=TRUE`; OS Login (`enable-oslogin=TRUE`, `roles/compute.osLogin` or `roles/compute.osAdminLogin`) is the recommended model and makes metadata keys ignored.
- Hyperdisk performance is independent of size; regional disks replicate across two zones and are force-attached on failover; Local SSD is ephemeral.
- Instance template, then MIG, then autoscaler; regional MIG for zone resilience; stateful and unmanaged groups don't autoscale.
- VM Manager needs the OS Config API, `enable-osconfig=TRUE`, a running agent and an attached service account.
- Spot: up to 91 % cheaper, preempted any time, `STOP` or `DELETE`; custom machine types `SERIES-custom-VCPUS-MEMORY_MB`, 5 % premium, `-ext` for extended memory.
