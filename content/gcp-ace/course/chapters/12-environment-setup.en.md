Once projects exist, an environment still needs to be made observable, sized within its quotas, connected to a network and placed in the right locations, and you need a way to see what it contains. These are setup tasks: the exam asks which API to enable, which scope to configure, which command shows a quota or a location, and which tool lists every resource of an organization.

<!-- section: observability-setup | objectives: 1.1.6 -->
## Setting up Google Cloud Observability

Google Cloud Observability groups Cloud Logging, Cloud Monitoring, Cloud Trace and Cloud Profiler. Setting it up means three things: the APIs, the scopes that decide what you can see, and the agents that collect data from VMs.

**What works without setup.** Every project, folder, organization and billing account has a Log Router with two sinks: `_Required` (Admin Activity, System Event and Access Transparency audit logs, retention fixed at 400 days, can't be modified or deleted) and `_Default` (all other logs, 30 days by default; in a project the retention is configurable from 1 to 3,650 days, while folder and organization `_Default` buckets keep 30 days). Google Cloud services send their metrics to Cloud Monitoring automatically. Data Access audit logs are off by default (except for BigQuery) and must be enabled per service.

**Scopes: one place to see several projects.** Scopes aggregate data at read time; they don't move or copy it.

| Scope | Used by | What to know |
| --- | --- | --- |
| Metrics scope | Cloud Monitoring: dashboards, Metrics Explorer, alerting policies, uptime checks | Hosted by a **scoping project**; by default contains only that project; add up to **375** projects. Alerting policies and dashboards are stored in the scoping project |
| Log scope | Logs Explorer | Lists log views (recommended), projects, folders or organizations |
| Trace scope | Trace Explorer | Lists trace views |
| Observability scope | Default log scope and trace scope of a project | One per project; doesn't apply to metrics |

Typical design: create a dedicated monitoring project (for example `ops-monitoring`) and add the production projects to its metrics scope. A team with **Monitoring Viewer** on that scoping project sees the metrics of every project in the scope. Adding a project requires **Monitoring Admin** on the scoping project and on the added project. In the console: Monitoring > **Settings** > Metrics scope > **Add projects**.

```bash
gcloud services enable logging.googleapis.com monitoring.googleapis.com cloudtrace.googleapis.com

gcloud observability scopes describe _Default --location=global --project=ops-monitoring
```

**Agents on Compute Engine.** Platform metrics (CPU, disk I/O, network) need no agent. Memory usage, disk space used, process metrics, and system or application logs (syslog, Apache, MySQL) need the **Ops Agent**, the primary and preferred agent for Compute Engine. The legacy Logging and Monitoring agents get no new features or new OS support; uninstall them before installing the Ops Agent, otherwise logs can be ingested twice and metrics can conflict.

```bash
# On one Linux VM
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
sudo systemctl status google-cloud-ops-agent"*"

# On a fleet: an agent policy per zone (uses VM Manager OS policies)
gcloud compute instances ops-agents policies create ops-agent-euw1b \
  --zone=europe-west1-b --file=ops-agent-policy.yaml --project=web-prod-1934
```

```yaml
# ops-agent-policy.yaml
agentsRule:
  packageState: installed
  version: 2.*.*
instanceFilter:
  all: true
```

The agent writes with the VM's service account, which needs **Logs Writer** (`roles/logging.logWriter`) and **Monitoring Metric Writer** (`roles/monitoring.metricWriter`). Installing requires access to the package repositories: the agent packages are reachable through Private Google Access, but Linux dependencies come from upstream repositories that a private network can block; when repositories are blocked, Google recommends a custom image with the agent preinstalled. In the console: VM details > **Observability** tab > **Install Ops Agent**, or Monitoring > VM Instances > **Install/Update Ops Agent** for several VMs.

> **Exam trap.** "Memory utilization is missing from the VM's charts" isn't fixed by an IAM role or by enabling an API: install the Ops Agent. If the agent is installed but sends nothing, check the service account roles and the access scopes of the VM.

<!-- section: quotas | objectives: 1.1.7 -->
## Assessing quotas and requesting increases

| Concept | Meaning |
| --- | --- |
| Allocation quota | How much of a resource you can hold: vCPUs per region, static IP addresses, networks |
| Rate quota | How many requests in a period: API calls per minute |
| Concurrent quota | Simultaneous long-running operations |
| System limit | Fixed constraint (maximum object size, for example); can't be raised |
| Scope | Most quotas apply per project; some per folder, organization or user (number of projects you can create); allocation quotas are global, regional or zonal |

When a request would exceed a quota, the task fails with a quota error and keeps failing until enough quota is available: nothing is queued. Plan increases before a launch or a migration.

```bash
# Compute Engine quotas: project-wide, then per region (limit and usage)
gcloud compute project-info describe --project=web-prod-1934
gcloud compute regions describe europe-west1 --project=web-prod-1934

# Cloud Quotas: find the quota ID, then request a new value
gcloud quotas info list --service=compute.googleapis.com --project=web-prod-1934
gcloud quotas preferences create --service=compute.googleapis.com \
  --project=web-prod-1934 --quota-id=QUOTA_ID \
  --dimensions=region=europe-west1 --preferred-value=200 \
  --email=ops@example.com --justification="Black Friday capacity"
```

`--preferred-value` is the quota value you want in total (for example 200 vCPUs), not an increment; `--dimensions`, `--email` and `--justification` are optional. In the console: **IAM & Admin > Quotas & System Limits**, select the quota, **Edit**, enter the new value, **Submit request**. Requests are reviewed; you receive an email when they are approved or denied. Some APIs keep very low limits until billing is enabled on the project.

- Viewing quotas: **Quota Viewer** (`roles/servicemanagement.quotaViewer`); requesting changes needs `serviceusage.quotas.update` and `cloudquotas.quotas.update`, included in **Quota Administrator** (`roles/servicemanagement.quotaAdmin`, grantable on a project, folder or organization), Service Usage Admin and the legacy basic roles Owner and Editor.
- **Quota adjuster** can request increases automatically when usage approaches the limit (it needs usage history).
- Set **quota alerts** in Cloud Monitoring to be warned before you reach a value.
- You can also lower a quota (a quota override) to cap usage, for example to protect a budget.
- The number of projects you can create is a quota of its own (`cloudresourcemanager.googleapis.com/projects_count` in an organization).

> **Exam trap.** A quota is per project and often per region: a second region has its own vCPU quota, and a new project starts with its own default quotas. Raise the quota of the project and region where the resources will run.

<!-- section: networking-setup | objectives: 1.1.9 -->
## Setting up cloud networking

A VPC network is **global**; its subnets are **regional**. Each new project gets an **auto mode** network named `default` (one subnet per region in `10.128.0.0/9`, new regions added automatically) unless the `compute.skipDefaultNetworkCreation` constraint is enforced. Its pre-populated ingress rules, all at priority 65534:

| Rule | Source | Allows |
| --- | --- | --- |
| `default-allow-internal` | `10.128.0.0/9` | All TCP, UDP and ICMP between instances |
| `default-allow-ssh` | `0.0.0.0/0` | TCP 22 |
| `default-allow-rdp` | `0.0.0.0/0` | TCP 3389 |
| `default-allow-icmp` | `0.0.0.0/0` | ICMP |

Every network also has the implied actions, applied when no firewall rule matches: deny all ingress, allow all egress. Google recommends **custom mode** networks for production: you choose the regions and non-overlapping ranges, which matters for VPN, Interconnect and peering.

```bash
gcloud compute networks create prod-vpc --subnet-mode=custom --bgp-routing-mode=regional

gcloud compute networks subnets create prod-euw1 --network=prod-vpc \
  --region=europe-west1 --range=10.10.0.0/20 --enable-private-ip-google-access

gcloud compute firewall-rules create prod-allow-iap-ssh --network=prod-vpc \
  --direction=INGRESS --action=allow --rules=tcp:22 --source-ranges=35.235.240.0/20

# Outbound internet for VMs without external IPs
gcloud compute routers create prod-router --network=prod-vpc --region=europe-west1
gcloud compute routers nats create prod-nat --router=prod-router --region=europe-west1 \
  --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges

# Convert an auto mode network (one-way) and expand a subnet (can't shrink)
gcloud compute networks update default --switch-to-custom-subnet-mode
gcloud compute networks subnets expand-ip-range prod-euw1 --region=europe-west1 --prefix-length=19
```

For several projects that share one network administered centrally, use **Shared VPC**: a **Shared VPC Admin** (`roles/compute.xpnAdmin`, granted at organization or folder level) enables a host project and attaches service projects; service project administrators receive **Compute Network User** (`roles/compute.networkUser`) on the host project or on specific subnets.

```bash
gcloud compute shared-vpc enable net-host-prod
gcloud compute shared-vpc associated-projects add web-prod-1934 --host-project=net-host-prod
```

Expanding a subnet doesn't interrupt its traffic, but it can't be undone. Subnets created automatically in an auto mode network (or in a network converted from auto mode) can be expanded only up to a `/16` prefix, so they don't overlap the other automatic subnets.

Firewall policies, load balancing, VPN and Interconnect are covered in the networking chapters of module 2.

> **Exam trap.** Creating a VM in a custom mode network fails in a region that has no subnet: custom mode creates nothing automatically. And a custom mode network can never return to auto mode.

<!-- section: locations | objectives: 1.1.10 -->
## Verifying product availability across locations

| Location type | Examples | Failure domain |
| --- | --- | --- |
| Zone | `europe-west1-b` (region plus a letter) | Zonal resources: VM instances, zonal Persistent Disk; a zonal disk attaches only to VMs in its zone |
| Region | `europe-west1`, usually three or more zones | Regional resources: subnets, static external IP addresses, regional MIGs, regional disks |
| Multi-region, dual-region | `EU`, `US` (Cloud Storage, BigQuery) | Data replicated across regions |
| Global | VPC networks, images, firewall rules, global load balancers | Usable from any region |

Products, machine series, GPUs and TPUs aren't available everywhere. Before choosing a location, check the product's locations page, the Compute Engine **Available regions and zones** table (machine series, processors, GPUs, Confidential VM support per zone), or the CLI:

```bash
gcloud compute regions list
gcloud compute zones list --filter="region:europe-west1"
gcloud compute machine-types list --filter="name=c4d-standard-4" --format="value(zone)"
gcloud compute accelerator-types list --filter="name=nvidia-l4" --format="value(zone)"
gcloud run regions list
```

To enforce where resources may be created, set the `gcp.resourceLocations` organization policy (value groups such as `in:eu-locations`); it doesn't move existing resources.

> **Exam tip.** "The machine type or GPU is not available in zone X" is answered by listing the zones that offer it and choosing one of them in the required region, not by a quota request. A quota error and an availability error are different messages.

<!-- section: asset-inventory | objectives: 1.1.11 -->
## Cloud Asset Inventory and Gemini Cloud Assist

**Cloud Asset Inventory** keeps the metadata of your resources and policies across a project, folder or organization: search, export, history of the last **35 days**, and change notifications. Enable `cloudasset.googleapis.com` in the project you run the commands from; **Cloud Asset Viewer** (`roles/cloudasset.viewer`) on the scope reads the metadata. It is eventually consistent and not designed for real-time queries.

| Need | Command |
| --- | --- |
| Find resources across the organization | `gcloud asset search-all-resources --scope=organizations/ORG_ID` |
| Find who has a role, or every binding of a user | `gcloud asset search-all-iam-policies --scope=organizations/ORG_ID --query="policy:ana@example.com"` |
| Snapshot to Cloud Storage or BigQuery for analysis | `gcloud asset export` |
| See how a resource or its policy changed | `gcloud asset get-history` (start time within the last 35 days) |
| Be notified of changes | `gcloud asset feeds create` (to a Pub/Sub topic) |

```bash
gcloud asset search-all-resources --scope=organizations/123456789012 \
  --asset-types=compute.googleapis.com/Instance --query="location:europe-west1"

gcloud asset export --organization=123456789012 --content-type=resource \
  --bigquery-table=projects/ops-inventory/datasets/assets/tables/daily_snapshot \
  --output-bigquery-force

gcloud asset feeds create bucket-changes --project=ops-inventory \
  --asset-types=storage.googleapis.com/Bucket --content-type=iam-policy \
  --pubsub-topic=projects/ops-inventory/topics/asset-changes
```

Content types: `resource`, `iam-policy`, `org-policy`, `access-policy`, `os-inventory`, `relationship`. A feed can take up to 10 minutes to start, and the Cloud Asset Inventory service agent needs permission to publish to the topic.

**Gemini Cloud Assist** is an AI assistant in the console (Cloud Assist panel) and other surfaces: you ask in natural language about your environment, costs, logs and metrics, it generates `gcloud` commands, `kubectl` manifests and Terraform, and runs investigations of incidents. Setup by an administrator on a project or folder: enable `geminicloudassist.googleapis.com` (which also enables `cloudaicompanion.googleapis.com`) plus the supporting APIs `cloudasset.googleapis.com`, `designcenter.googleapis.com`, `appoptimize.googleapis.com` and `apphub.googleapis.com`, and grant **Gemini Cloud Assist User** (`roles/geminicloudassist.user`) and **Cloud Asset Viewer** to the users. Folder-level setup is possible only in the console, and projects added to the folder later must be enabled individually.

```bash
gcloud services enable geminicloudassist.googleapis.com --project=web-prod-1934
gcloud projects add-iam-policy-binding web-prod-1934 \
  --member="group:web-ops@example.com" --role="roles/geminicloudassist.user"
```

> **Exam trap.** Gemini Cloud Assist is a **Preview** offering in November 2026, and it can store data in any Google Cloud location: don't enable it in projects with data residency or CMEK requirements. For an auditable, repeatable inventory, the answer is Cloud Asset Inventory (search or export to BigQuery), not a chat assistant.

<!-- section: key-points -->
## Key points

- `_Required` (400 days, fixed) and `_Default` (30 days, configurable) exist everywhere; Data Access audit logs are off by default except BigQuery.
- A metrics scope (up to 375 projects) in a central scoping project gives one view; Monitoring Viewer there is enough to read.
- Memory and disk-space metrics and application logs need the Ops Agent; its service account needs Logs Writer and Monitoring Metric Writer.
- Quotas are per project and often per region; request increases in Quotas & System Limits or with `gcloud quotas preferences create`; system limits can't change.
- Production networks: custom mode, planned ranges, no `0.0.0.0/0` SSH; auto to custom is one-way, subnets expand but never shrink.
- Check zone availability of machine types and GPUs with `gcloud compute machine-types list` and `accelerator-types list`.
- Cloud Asset Inventory: search, export, 35-day history, feeds; Gemini Cloud Assist is Preview.
