A migration plan says what moves, how, in which order, with which tools, at what cost and with which rollback. The exam tests the method (assess, plan, deploy, optimize), the tool for each kind of source, the license and cost consequences, and how a design leaves room for later improvement. The right answer usually minimizes risk and downtime first, then cost and effort, unless the scenario states otherwise.

<!-- section: integrate-existing | objectives: 1.4.1 -->
## Integrating solutions with existing systems

Most migrations run in a **hybrid state** for months: part of the estate in Google Cloud, part on premises or in another cloud. Plan the integration explicitly.

| Integration need | Google Cloud pattern |
| --- | --- |
| Private network path to the data center | HA VPN first (quick), Dedicated or Partner Interconnect for bandwidth; reuse it for every wave |
| Name resolution both ways | Cloud DNS forwarding zones (to on-premises) and inbound server policy (from on-premises) |
| Expose legacy services as managed APIs, with quotas and security | Apigee in front of the backend (hybrid or cloud backends) |
| Asynchronous integration, decoupling old and new systems | Pub/Sub topics; Eventarc to route events to Cloud Run |
| Keep a cloud copy of an operational database in sync | Datastream (CDC) to BigQuery or Cloud Storage; Database Migration Service continuous jobs before cutover |
| Corporate identities for console and applications | Cloud Identity or Google Workspace synchronized with the existing directory (Google Cloud Directory Sync), SSO with the existing identity provider, or Workforce Identity Federation |
| Gradual replacement of a monolith | Strangler fig: put a load balancer or API gateway in front, route one feature at a time to the new service |

> **Exam trap.** Moving an application without its chatty dependencies (a database it queries hundreds of times per request, a file share, an authentication server) turns local calls into WAN calls. Latency, not bandwidth, then breaks the application. Move tightly coupled components in the same wave or keep them close.

<!-- section: assess-migrate | objectives: 1.4.2 -->
## Assessing and migrating systems and data

**Migration Center** is the assessment hub: automatic discovery (discovery client) or manual import (for example RVTools or CSV exports) of servers and of SQL Server, MySQL and PostgreSQL databases; application and network **dependency mapping**; **TCO reports** based on your preferences (region, machine series, pricing model, licensing); technical-fit suggestions; migration wave planning. Then a dedicated tool moves each kind of workload:

| Source | Tool | Notes |
| --- | --- | --- |
| VMs on vSphere, AWS, Azure or VMware Engine | Migrate to Virtual Machines | Continuous background replication, test clones, short cutover downtime |
| A VMware estate to keep as VMware | Google Cloud VMware Engine with HCX | No conversion, same tools, fastest exit from a data center |
| Virtual disk images (VMDK, VHD) in Cloud Storage | Image import in Migrate to Virtual Machines (BYOL or pay-as-you-go license type) | One-time, offline |
| MySQL, PostgreSQL, SQL Server (same engine) | Database Migration Service, homogeneous | Continuous (initial load plus CDC) keeps downtime low |
| Oracle or SQL Server to PostgreSQL | Database Migration Service, heterogeneous, to Cloud SQL for PostgreSQL or AlloyDB | Conversion workspace converts the schema, with Gemini-assisted conversion |
| Objects in Amazon S3, Azure Blob, other buckets, URL lists | Storage Transfer Service (agentless) | Scheduled, incremental, event-driven; optimized for more than 1 TiB |
| On-premises file systems or HDFS | Storage Transfer Service with self-hosted agents | Bandwidth control, runs over Interconnect or VPN |
| Hundreds of TB with limited bandwidth | Transfer Appliance (TA40, TA300) | When online upload would take more than about a week; AES-256, optional CMEK |
| Small or ad hoc copies | `gcloud storage cp` / `rsync` | Under about 1 TiB |
| Data warehouse or SaaS data to BigQuery | BigQuery Data Transfer Service; BigQuery Migration Service for SQL translation | |

Migrate to Virtual Machines lifecycle: **onboarding** (choose source VMs) → **replication** (first full copy while the source keeps running, then incremental replications, every two hours by default) → **set target details** (project, machine type, network) → **test-clone** (isolated test instance from replicated data, source untouched) → **cut-over** (source shut down, final replication, production VM created) → **finalize** (replication data deleted). Rollback after a cut-over is manual: delete the new VM and restart the source.

```bash
# Import a VMDK as a Compute Engine image, keeping an existing license (BYOL)
gcloud migration vms image-imports create win2016-byol \
  --location=europe-west1 \
  --source-file=gs://example-migration/win2016.vmdk \
  --license-type=compute-engine-license-type-byol
```

The older `gcloud compute images import` command is deprecated in favor of `gcloud migration vms image-imports`.

> **Exam tip.** Do the bandwidth arithmetic. 300 TB over 100 Mbps takes about nine months; Transfer Appliance captures it in under 25 days plus shipping. With a 10 Gbps Interconnect, the same data moves online in a few days, and Storage Transfer Service is the answer.

<!-- section: methodology | objectives: 1.4.3 -->
## Migration methodology, testing, network and dependency planning

Google's framework has four phases:

| Phase | Deliverables |
| --- | --- |
| Assess | Inventory, dependencies, TCO, performance baselines, migration type per workload |
| Plan | Foundation (landing zone): identity, resource hierarchy, networking, security; prioritized waves |
| Deploy | Deployment process, data transfer, cutovers |
| Optimize | Autoscaling, managed services, cost, disaster recovery, performance |

Migration types, from least to most change:

| Type | Meaning | Choose when |
| --- | --- | --- |
| Rehost (lift and shift) | Move with minor or no change | Deadline (data center exit), little cloud skill, low risk tolerance |
| Replatform (lift and optimize) | Move, then optimize (for example to Cloud SQL) | Quick wins without code rewrite |
| Refactor (move and improve) | Modify to use cloud capabilities | Scalability and availability needs justify the effort |
| Re-architect | Change how the code works (monolith to microservices) | Long-term agility |
| Rebuild (remove and replace) | Rewrite as cloud-native | The old code has no future |
| Repurchase | Replace with SaaS | Commodity function (CRM, email) |

**Workload testing**: test-clone VMs, then functional tests, performance tests against the baselines captured in Assess, and failover tests. Run the old and new systems in parallel when data correctness is critical; define success criteria and the rollback trigger before cutover.

**Network planning**: an IP plan with no overlap between on-premises, other clouds and every VPC (including GKE Pod and Service ranges); hybrid connectivity sized for the transfer and for the hybrid period; DNS strategy; firewall and egress rules; where each wave's users connect from.

**Dependency planning**: use dependency maps to group components into **move groups**; migrate low-risk, loosely coupled workloads first to build skills and the foundation, critical and tightly coupled systems later; schedule cutovers in maintenance windows; freeze changes on the source during cutover.

> **Exam trap.** A pilot or first wave should not be the most critical system. "Gain experience with minimal business risk" points to a non-critical, low-dependency workload.

<!-- section: licensing-financial | objectives: 1.4.4 -->
## Software license implications and financial impact

| Licensing option | How it works |
| --- | --- |
| Premium (on-demand) images | Windows Server, SQL Server, RHEL, SLES licenses billed per use with the VM; Google handles compliance. Premium images can't be used for BYOL |
| BYOL on sole-tenant nodes | Licenses priced per physical core or processor, or Windows Server licenses (product released and licenses acquired before 1 October 2019); maintenance policy `restart-in-place` or `migrate-within-node-group` limits the physical servers used |
| SQL Server with License Mobility (Software Assurance) | Runs on multi-tenant VMs, as long as the OS license itself doesn't require sole tenancy |
| RHEL or SLES subscriptions (BYOS), most Microsoft applications | No sole-tenant requirement |

On-demand SQL Server images always charge at least four core licenses, so small SQL Server VMs are expensive on-demand. Custom machine types can align vCPUs to licensed cores.

Financial levers:

- **CapEx to OpEx**: hardware purchase and depreciation become monthly consumption; expect a period of **double running cost** (old data center plus cloud) during migration.
- **Sustained use discounts**: automatic on eligible resources used more than 25 % of a month, up to 30 % for a full month.
- **Committed use discounts**: resource-based (vCPU, memory, GPU, local SSD, sole-tenant nodes in a region) or spend-based (Compute flexible commitments across Compute Engine, GKE and Cloud Run; service-specific commitments for Cloud SQL, Spanner, BigQuery and others), for steady workloads.
- **Spot VMs** for interruptible work; **rightsizing** recommendations after migration.
- **Network costs**: egress to the internet and between regions; Interconnect lowers egress pricing compared with internet transfer.

> **Exam trap.** A migrated Windows Server licensed before October 2019 can't simply run on a shared VM with your own license: Windows Server BYOL needs sole-tenant nodes, because License Mobility doesn't cover the Windows Server OS.

<!-- section: future-improvements | objectives: 1.5.1, 1.5.2 -->
## Envisioning improvements and the evolution of business needs

After migration, the **Optimize** phase continues indefinitely. Typical improvements an architect should plan for:

| Starting point | Improvement |
| --- | --- |
| Self-managed database on VMs | Cloud SQL, AlloyDB or Spanner (backups, HA, patching managed) |
| VMs behind a MIG | Containers on GKE Autopilot or Cloud Run |
| Cron jobs on a VM | Cloud Scheduler with Cloud Run jobs or Workflows |
| Batch ETL scripts | Dataflow or BigQuery SQL pipelines |
| Older machine series | Newer series (better price-performance), rightsized with Recommender |
| Manual console changes | Infrastructure as code (Terraform, Infrastructure Manager) and CI/CD |
| Keyword search, manual document triage | Gemini models with grounding, agents on Agent Platform |

Use **Active Assist recommenders** (idle resources, rightsizing, committed use, IAM excess permissions) and Gemini Cloud Assist to find improvements continuously, and follow release notes: products are renamed, gain features and reach end of support.

Business needs evolve: new regions and countries (data residency, latency), mergers (new organizations, overlapping IP ranges), regulations, seasonal or viral growth, new channels such as mobile or partners. Designs that absorb change:

- A resource hierarchy with folders per business unit or environment, so a new subsidiary is a new folder with inherited policies.
- Loose coupling through APIs and events, so a component can be replaced without touching others.
- Regionally deployable stacks (IaC modules) so a new country is a parameter change.
- An IP plan with reserved space for growth and future acquisitions.

> **Exam tip.** When two options both meet today's requirements, the PCA answer is often the one that also accommodates the growth or change stated in the executive statement or business requirements.

<!-- section: cloud-first | objectives: 1.5.3 -->
## Cloud-first design approach

Cloud-first means new solutions start from managed cloud services and only fall back to self-managed infrastructure when a requirement demands it.

| Traditional habit | Cloud-first choice |
| --- | --- |
| Size for peak, buy hardware | Autoscale on demand, pay for use |
| Long-lived, hand-patched servers | Immutable images and containers, replaced not patched |
| Self-managed middleware and databases | Managed and serverless services (Cloud Run, Pub/Sub, BigQuery, Cloud SQL, Spanner) |
| Perimeter security only | Zero trust: IAM, IAP, VPC Service Controls, least privilege |
| Manual change tickets | IaC, CI/CD, policy as code (organization policies) |
| Avoid failure | Design for failure: multiple zones, regions, health checks, retries |
| Monitoring added later | Observability, SLOs and error budgets from the start |

The six pillars of the Google Cloud Well-Architected Framework (operational excellence; security, privacy and compliance; reliability; cost optimization; performance optimization; sustainability) are the checklist for a cloud-first design.

> **Exam trap.** Cloud-first doesn't mean "rewrite everything now". With a hard data center exit date, rehost first and modernize after; cloud-first applies to new builds and to the optimization roadmap.

<!-- section: key-points -->
## Key points

- Migration Center assesses (discovery, dependencies, TCO); Migrate to Virtual Machines moves VMs; Database Migration Service moves databases; Storage Transfer Service and Transfer Appliance move data.
- Migrate to Virtual Machines: replicate while the source runs, test-clone, short cutover, finalize.
- Four phases: assess, plan, deploy, optimize. Six types: rehost, replatform, refactor, re-architect, rebuild, repurchase.
- First waves are low-risk; move chatty dependencies together; no overlapping IP ranges.
- Windows Server BYOL needs sole-tenant nodes; SQL Server with License Mobility runs on shared VMs; premium images include the license.
- Budget double running costs; use committed use discounts for steady load, Spot VMs for interruptible work.
- Design for change: folders, APIs and events, IaC modules, room in the IP plan.
