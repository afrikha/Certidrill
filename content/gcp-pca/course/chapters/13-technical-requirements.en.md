Technical requirements turn business goals into numbers: an availability target, a peak load, a latency objective, an RTO and an RPO. This chapter covers the Google Cloud Well-Architected Framework, which the exam guide calls a key requirement for the role, then the techniques that meet each target: zones and regions for availability and failover, flexible resources, autoscaling, performance and latency, Gemini Cloud Assist, and backup and recovery. Questions give a target and ask for the design that reaches it with the least cost or effort.

<!-- section: well-architected | objectives: 1.2.1 -->
## The Google Cloud Well-Architected Framework

The framework (older material calls it the Google Cloud Architecture Framework, whose System Design category was removed in August 2024) has six **pillars** and five **core principles** that apply to every pillar.

| Core principle | What it means in a design |
| --- | --- |
| Design for change | Small, independent components; frequent, low-risk releases |
| Document your architecture | Diagrams, decisions and their reasons, kept current |
| Simplify your design and use fully managed services | Fewer moving parts, less operational work |
| Decouple your architecture | Components communicate through APIs and queues, fail independently |
| Use a stateless architecture | State in managed stores, so instances can scale and be replaced |

| Pillar | Principles to recognize in questions |
| --- | --- |
| Operational excellence | Operational readiness with CloudOps (SLOs, monitoring, performance testing, capacity planning), incident and problem management, resource optimization, automating change, continuous improvement |
| Security, privacy, and compliance | Security by design, zero trust, shift-left security, preemptive cyber defense, secure and responsible AI, AI for security, regulatory and privacy needs |
| Reliability | Targets based on user experience, realistic targets, redundancy, horizontal scaling, observability, graceful degradation, testing recovery from failures and from data loss, blameless postmortems |
| Cost optimization | Align spending with business value, cost awareness, optimize resource usage, optimize continuously |
| Performance optimization | Plan resource allocation, use elasticity, modular design, monitor and improve continuously |
| Sustainability | Low-carbon regions, efficient AI and software, right-sizing, data lifecycle, measurement, culture, industry guidelines |

The framework also offers **cross-pillar perspectives** that apply the pillars to a domain: AI and ML, and financial services.

> **Exam tip.** When two options both work, the one that follows a core principle usually wins: the managed service over the self-managed one, the queue between two services over a direct synchronous call, the stateless tier over session affinity, the automated rollout over a manual runbook.

<!-- section: high-availability | objectives: 1.2.2 -->
## High availability and failover design

Availability comes from **redundancy across failure domains** and **automatic failover**. Google publishes SLAs that show what each topology can reach:

| Product and topology | Monthly uptime SLA |
| --- | --- |
| Compute Engine, single instance (most machine families) | 99.9 % (99.95 % memory-optimized) |
| Compute Engine, instances in multiple zones; load balancing | 99.99 % |
| Cloud SQL Enterprise edition with high availability | 99.95 % |
| Cloud SQL Enterprise Plus edition with high availability | 99.99 % |
| Spanner regional / dual-region and multi-region | 99.99 % / 99.999 % |
| Cloud Storage Standard, regional / dual-region and multi-region | 99.9 % / 99.95 % |

Single-zone and shared-core Cloud SQL instances are not covered by the Cloud SQL SLA, and Spot VMs aren't covered by any SLA.

Building blocks:

| Layer | Zone failure | Region failure |
| --- | --- | --- |
| VMs | Regional managed instance group spread across zones, autohealing with health checks | Instance groups in two regions behind the global external Application Load Balancer |
| Kubernetes | Regional GKE cluster (control plane and nodes in several zones) | Clusters in two regions with multi-cluster load balancing |
| Relational database | Cloud SQL high availability: synchronous replication to a standby in another zone, failover in about 60 seconds, the standby serves no reads | Cross-region read replica promoted on failure; Enterprise Plus adds a DR replica, replica failover, switchover and a write endpoint; Spanner multi-region for zero RPO |
| Block storage | Regional Persistent Disk or Hyperdisk Balanced High Availability: synchronous copy in two zones, force-attach to a standby VM | Asynchronous Replication for disks: RPO about one minute, between two regions of the same continent |
| Objects | Regional bucket (at least two zones) | Dual-region or multi-region bucket |
| DNS and traffic | Load balancer health checks | Cloud DNS routing policies: failover (primary and backup), geolocation, weighted round robin |

Global external Application Load Balancers use one anycast IP address and send each user to the closest healthy backend; when a region's backends fail their health checks, traffic goes to the next region without a DNS change. For regional services, a Cloud DNS **failover** policy with health checks sends clients to backup targets.

> **Exam trap.** Synchronous replication across zones (Cloud SQL high availability, regional disks) gives zero data loss for committed data but only protects one region. Cross-region replication of Cloud SQL and disks is **asynchronous**: the RPO isn't zero. When the stem asks for zero data loss after a region failure, the answer is a multi-region database such as Spanner.

<!-- section: flexibility | objectives: 1.2.3 -->
## Flexibility of cloud resources

Flexibility means resources can change shape, size or location as needs change, with little effort:

| Need | Feature |
| --- | --- |
| A VM shape that no predefined type matches | Custom machine types on N4, N4D, N4A, N2, N2D, E2 and N1 (and G2), with extended memory on most of them; 5 % price premium |
| A bigger or smaller VM | Stop, change the machine type, restart; use rightsizing recommendations |
| No downtime during host maintenance | Live migration to another host in the same zone (not for GPU VMs, TPUs or bare metal instances) |
| More disk space or performance | Resize disks while attached; on Hyperdisk, provision IOPS and throughput separately from capacity |
| Same environment again, in another project or region | Infrastructure as Code: Terraform, Infrastructure Manager |
| Move workloads between environments or clouds | Containers built once, stored in Artifact Registry, run on Cloud Run or GKE |
| Capacity guaranteed for a launch or a failover | Compute Engine reservations, which can be combined with committed use discounts |

```bash
gcloud compute instances create report-vm-1 --zone=europe-west1-b \
  --custom-vm-type=n2 --custom-cpu=6 --custom-memory=48GB
```

> **Exam trap.** Flexibility is not free capacity. Quotas limit how many resources a project can create in a region; a design that scales to hundreds of VMs during a sale or a failover needs quota increases requested in advance, and reservations if capacity must be guaranteed.

<!-- section: scalability | objectives: 1.2.4 -->
## Scalability to meet growth requirements

Prefer **horizontal** scaling (more instances) over vertical scaling (bigger instances): it has no hard ceiling and adds redundancy. Each platform scales differently:

| Platform | Scaling mechanism | Facts to know |
| --- | --- | --- |
| Managed instance groups | Autoscaler on CPU utilization, load balancing serving capacity, Cloud Monitoring metrics or schedules | With several signals, the largest recommendation wins; initialization period 60 seconds by default; stabilization period of 10 minutes before scale-in; scale-in controls limit how fast the group shrinks |
| Predictive autoscaling | Scales out ahead of forecast load | CPU utilization signal only; needs 3 days of history; for applications that take minutes to start |
| GKE | Horizontal Pod Autoscaler (replicas), Vertical Pod Autoscaler (requests), cluster autoscaler (nodes), node pool auto-creation | The cluster autoscaler reacts to Pod resource requests that can't be scheduled, not to node CPU; Autopilot manages nodes for you |
| Cloud Run | Instances added on requests, events and CPU utilization; scale to zero | Concurrency up to 1,000 requests per instance; minimum instances to avoid cold starts; maximum instances to protect a database, keeping headroom because the maximum can be exceeded briefly during traffic spikes |
| Spanner | Add nodes or processing units without downtime | Managed autoscaler on CPU and storage targets, in the Enterprise and Enterprise Plus editions |
| Bigtable | Add nodes; autoscaling on CPU and storage | Throughput grows linearly with nodes |
| Cloud SQL | Vertical scaling, read replicas for reads | Writes stay on one primary: a requirement to scale writes horizontally points to Spanner |
| BigQuery | Serverless; capacity editions with slot autoscaling | No cluster to size |

The autoscaler can't manage unmanaged instance groups, MIGs with a stateful configuration, or MIGs with VM repairs turned off. Plan for growth also at the data layer: a stateless web tier that scales to 500 instances still fails if every instance opens connections to a single database.

```bash
gcloud compute instance-groups managed set-autoscaling web-mig \
  --region=europe-west1 --min-num-replicas=3 --max-num-replicas=60 \
  --target-cpu-utilization=0.65 --cool-down-period=120
```

> **Exam trap.** Autoscaling reacts after load rises. If the application takes several minutes to initialize and users complain at the morning peak, the answer is predictive autoscaling or a scaling schedule, not a lower CPU target.

<!-- section: performance-latency | objectives: 1.2.5 -->
## Performance and latency

Latency is mostly distance and round trips. Reduce both:

| Requirement | Design |
| --- | --- |
| Users in one country | Region closest to them; regional resources |
| Users on several continents | Global external Application Load Balancer, backends in several regions, Premium Tier |
| Static or cacheable content | Cloud CDN on the external Application Load Balancer (Premium Tier only); Media CDN for large-scale streaming |
| Repeated reads of the same data | Memorystore cache in front of the database |
| Millisecond reads and writes at very high throughput | Bigtable |
| Global strongly consistent transactions | Spanner multi-region, with leaders placed near most writers |
| High-IOPS, low-latency disk | Hyperdisk or SSD Persistent Disk; Local SSD for scratch data that can be lost |
| Object storage feeding AI or analytics compute | Rapid storage class in zonal buckets, in the same zone as the compute |
| Communication between tightly coupled VMs | Compact placement policy |

**Network Service Tiers**: Premium Tier (the default) carries traffic on Google's backbone from the point of presence closest to the user and is required for global load balancers and Cloud CDN. Standard Tier uses the public internet up to the region, costs less and supports only regional load balancers.

Measure before optimizing: Cloud Trace shows where request latency goes, Cloud Profiler shows hot spots in code, and load tests confirm that the design meets the objective at peak.

> **Exam trap.** Cloud CDN and the global external Application Load Balancer need Premium Tier. An option that combines Standard Tier with a global load balancer or Cloud CDN to save cost is invalid.

<!-- section: gemini-cloud-assist | objectives: 1.2.6 -->
## Gemini Cloud Assist

Gemini Cloud Assist is an AI assistant across the application lifecycle in Google Cloud. In November 2026, its documentation presents it as a **Preview** offering under the Pre-GA terms.

| Phase | Capabilities |
| --- | --- |
| Design and build | Natural language design in Application Design Center, Infrastructure as Code generation, IAM assistance |
| Support and troubleshoot | Investigations: root-cause analysis on logs, metrics and configuration, with observations, hypotheses and recommended fixes; handoff to a support case |
| Optimize | Cost optimization in the FinOps hub and Cloud Hub, proactive cost anomaly analysis, database optimization, Flow Analyzer, Storage Insights |

It is used from the Cloud Assist panel in the console, Cloud Hub, Application Design Center, the Google Cloud mobile app and the Investigations page; an investigation can start from a log entry in Logs Explorer or from an alert. Investigations are scoped to one project or one App Hub application and use only the permissions of the person or service account that runs them, and don't modify data.

Setup on a project enables the Gemini Cloud Assist API (`geminicloudassist.googleapis.com`) and the APIs it requires, and grants the Gemini Cloud Assist User role (`roles/geminicloudassist.user`) and the Cloud Asset Viewer role (`roles/cloudasset.viewer`). Some features are free for all Google Cloud users; advanced ones (natural language design, Infrastructure as Code, investigations) belong to Gemini Code Assist Enterprise, and creating investigations requires Premium Support or access through your account team.

> **Exam trap.** Gemini Cloud Assist can store data in any Google Cloud data center globally. Google says not to enable it for projects with data residency or CMEK requirements. When a stem combines a residency requirement with "use Gemini Cloud Assist on the production project", that's the option to reject.

<!-- section: backup-recovery | objectives: 1.2.7 -->
## Backup and recovery

Replication protects against infrastructure failure; **backups** protect against deletion, corruption and ransomware, because a replica copies the damage. Recovery from data loss must be tested, like failover.

| Product | Backup and recovery features |
| --- | --- |
| Backup and DR Service | Central, policy-based backups for Compute Engine, Persistent Disk, Filestore, Google Cloud VMware Engine, Cloud SQL, AlloyDB, and self-managed Oracle, SQL Server, SAP HANA, MySQL and PostgreSQL. **Backup vaults** are immutable and indelible, with a minimum enforced retention of up to 99 years, in regional or multi-regional locations |
| Compute Engine snapshots | Standard (incremental, geo-redundant, kept after disk deletion, schedulable), archive (cheapest, slowest restore, long retention), instant (fastest, same zone or region, deleted with the disk); machine images for a whole VM |
| Cloud SQL | Automated and on-demand backups, point-in-time recovery from automated backups and logs, final backup on deletion; enhanced backups managed by Backup and DR, stored in another region if needed |
| Spanner | Backups and point-in-time recovery: version retention of 1 hour by default, up to 7 days; deletion protection against dropping the database |
| Cloud Storage | Soft delete (7 days by default, 3 to 90 days), Object Versioning, retention policies and bucket lock; turbo replication for a 15-minute RPO in dual-region buckets (default RPO is 12 hours) |
| GKE | Backup for GKE: Kubernetes manifests and Persistent Disk volume snapshots, backup plans and restore plans, restore into a cluster in another region |

```bash
gcloud compute resource-policies create snapshot-schedule daily-7d \
  --region=europe-west1 --daily-schedule --start-time=02:00 \
  --max-retention-days=7 --storage-location=eu
gcloud compute disks add-resource-policies orders-db-data \
  --zone=europe-west1-b --resource-policies=daily-7d
```

Backup vaults are the recommended storage for Backup and DR: self-managed backup storage has no immutability or enforced retention, and the legacy management console has been deprecated since September 30, 2026.

> **Exam trap.** Spanner point-in-time recovery does not protect against deleting the database, and restoring a backup creates a **new** database. To protect against ransomware or a malicious administrator deleting backups, choose Backup and DR vaults with enforced retention, not snapshots in the same project that the same administrator can delete.

<!-- section: key-points -->
## Key points

- The Well-Architected Framework has six pillars (operational excellence; security, privacy, and compliance; reliability; cost optimization; performance optimization; sustainability) and five core principles that favor managed, decoupled, stateless, documented designs built for change.
- Multiple zones give 99.99 % on Compute Engine; zone failures are covered by synchronous replication, region failures by asynchronous replicas or by multi-region products such as Spanner (99.999 %).
- Custom machine types, live migration, Hyperdisk, Infrastructure as Code and containers make resources flexible; quotas and reservations must be planned for peaks and failover.
- Scale horizontally: MIG autoscaler (largest signal wins, predictive for slow starts), GKE autoscalers driven by Pod requests, Cloud Run to zero, Spanner and Bigtable by adding nodes.
- Latency comes down with nearby regions, Premium Tier, global load balancing, Cloud CDN, caching and the right database.
- Gemini Cloud Assist designs, investigates and optimizes, but it is a Preview offering that can store data anywhere: not for residency or CMEK-constrained projects.
- Backups complement replication: Backup and DR vaults for immutable backups, snapshots and schedules for disks, point-in-time recovery for databases, soft delete and versioning for objects.
