Business requirements rarely point to a single design. Data has to move, and the method depends on volume, bandwidth and deadline; each design gains on one quality and loses on another; each existing workload must be kept, rebuilt, replaced or retired; and the result must be measured against the goals that justified it, while staying secure, compliant and observable. This chapter covers these decisions as the exam asks them: one requirement in the stem decides between options that would all work.

<!-- section: data-movement | objectives: 1.1.7 -->
## Movement of data

Start with the arithmetic: time = volume ÷ effective bandwidth. At 1 Gbps, about 1 GB moves in 8 seconds, so 100 TB takes about 12 days in ideal conditions; at 100 Mbps it takes more than 100 days. Real links rarely run at full speed, and the transfer must not starve production traffic.

| Situation | Recommended tool |
| --- | --- |
| Small to medium transfer, scripts, a few large files | `gcloud storage` (`cp`, `rsync`) |
| Another cloud (Amazon S3, Azure Blob Storage) or another bucket to Cloud Storage | Storage Transfer Service: managed, scheduled, incremental; no connection to set up |
| On-premises file systems, very large transfers (up to petabytes and billions of files) with enough bandwidth | Storage Transfer Service for on-premises data: agents installed in the data center, bandwidth caps, scheduling, monitoring |
| Not enough bandwidth for the deadline (network upload longer than about a week), remote sites | Transfer Appliance: Google-owned SSD hardware (TA40, TA300), AES-256 encryption, optionally with CMEK, shipped back to Google |
| SaaS and data warehouse sources loaded into BigQuery on a schedule | BigQuery Data Transfer Service |
| Continuous replication of database changes to analytics | Datastream (change data capture into BigQuery, Cloud Storage or Apache Iceberg tables) |
| Database migration with minimal downtime | Database Migration Service: initial snapshot then continuous change data capture, cutover when in sync |
| Streaming events | Pub/Sub, processed by Dataflow |

```bash
# One-time copy of a local directory, then a resumable sync of changes
gcloud storage cp --recursive ./exports gs://adatum-landing/exports
gcloud storage rsync --recursive ./exports gs://adatum-landing/exports
```

Transfer Appliance also has an **online mode**: data copied to the appliance is streamed to Cloud Storage without waiting for the shipment. In offline mode, the data is typically in Cloud Storage about 10 business days after the appliance is shipped back.

Cost and placement matter as much as speed. Inbound data transfer is not charged, but traffic between zones, between regions and to the internet is. Keep processing close to the data: query data where it lands rather than copying it between regions, and colocate compute with storage.

> **Exam trap.** A large one-time transfer over a slow link is not solved by buying a faster tool: `gcloud storage` and Storage Transfer Service both depend on the bandwidth. When the stem gives a volume, a link speed and a deadline that the link can't meet, the answer is Transfer Appliance, or more bandwidth (Cloud Interconnect) if the need is ongoing.

<!-- section: design-tradeoffs | objectives: 1.1.8 -->
## Design decision trade-offs

Every architecture decision gives up something. The exam expects you to name what is traded and to pick the side the requirements favor:

| Trade-off | One side | Other side | The stem decides with |
| --- | --- | --- | --- |
| Availability against cost | Multi-region, hot standby, higher SLA | Single region, cold recovery, lower bill | The RTO, RPO and the cost of downtime |
| Managed against control | Cloud Run, Cloud SQL, BigQuery: less operations | Compute Engine, GKE Standard, self-managed engines: full control | Team size, "least operational overhead", custom software or kernel needs |
| Consistency against latency | Strong consistency across regions (Spanner) | Local reads and asynchronous replicas | "Must never read stale data" against "lowest latency" |
| Performance against cost | SSD, larger machines, Premium Tier, caching | Balanced disks, smaller machines, Standard Tier | A latency objective or a budget |
| Speed of migration against optimization | Rehost now | Refactor before moving | A deadline (data center exit) or a goal (scalability, lower license cost) |
| Portability against native features | Containers, open-source engines, Terraform | Proprietary managed services with more automation | "Avoid lock-in" or "multicloud strategy" |
| Security against usability | VPC Service Controls, private access only, approvals | Open access paths, fewer controls | The data's sensitivity and the regulations |

How to decide in an exam question:

1. Identify the **hard requirements** (residency, RPO, compliance). Options that miss one are wrong, however cheap.
2. Identify the **qualifier**: cheapest, fastest, least effort, most secure.
3. Prefer the option that meets the requirement **exactly**. Over-delivering (a multi-region database for an internal tool with an RTO of one day) is wrong when cost or simplicity is the qualifier.

> **Exam tip.** Record the trade-offs you made. The Well-Architected Framework asks you to document your architecture, including the decisions and the reasons for them, so that later changes start from known assumptions. In process questions, an architecture decision record is the expected artifact.

<!-- section: workload-disposition | objectives: 1.1.9 -->
## Workload disposition strategies

For each workload of the portfolio, decide whether to **build**, **buy**, **modify** or **deprecate** it. Google's migration guidance names six migration types (rehost, replatform, refactor, re-architect, rebuild, repurchase) that map to the build, buy and modify decisions; deprecating a workload is a general disposition decision, not one of Google's six types:

| Decision | Migration type | What happens | Choose it when |
| --- | --- | --- | --- |
| Modify (minimal) | Rehost (lift and shift) | Move as is to Compute Engine or Google Cloud VMware Engine | Deadline, no code access, licensed or vendor software |
| Modify | Replatform (lift and optimize) | Move, then adopt managed pieces: containers on GKE, Cloud SQL instead of a self-managed database | Quick wins without rewriting the code |
| Modify | Refactor (move and improve) | Change the code to use cloud capabilities before or during the move | Scalability or cost goals that the current design blocks |
| Modify (deep) | Re-architect (continue to modernize) | Change how the code works, for example split a monolith into microservices | Long-term product evolution, teams that ship independently |
| Build | Rebuild (remove and replace) | Decommission and rewrite as a cloud-optimized application | Heavy technical debt, a strategic differentiating application |
| Buy | Repurchase | Replace with a SaaS equivalent | Commodity function (email, CRM, ticketing): no business value in running it |
| Deprecate | Retire (general strategy, not one of Google's six migration types) | Turn it off after confirming nobody depends on it | Duplicate or unused applications found during assessment |

The migration framework runs in four phases: **assess** (inventory, dependencies, total cost of ownership, performance baselines), **plan** (landing zone: identity, resource hierarchy, networking), **deploy** (move workloads and data) and **optimize** (use cloud features to improve performance, scalability, recovery and cost). Assessment with Migration Center gives the inventory and cost estimates that make the decision per workload.

> **Exam trap.** "Build" is not the default. When a capability is a commodity and the stem stresses time to market or a small team, buying (a SaaS product or a managed Google Cloud service) beats building it on VMs. Build only what differentiates the business.

<!-- section: success-measurements | objectives: 1.1.10 -->
## Success measurements

A design is justified by results, so define how success is measured before the project starts:

| Measure | Definition | Examples |
| --- | --- | --- |
| Key performance indicator (KPI) | A metric tied to a business objective, with a target | Conversion rate, orders per minute at peak, time to onboard a customer, cost per transaction |
| Return on investment (ROI) | (Gain − cost) ÷ cost over a period | Savings from closing a data center against the cost of migration and running |
| Total cost of ownership (TCO) | All costs of running the workload: infrastructure, licenses, people, facilities | On-premises TCO compared with the Google Cloud estimate during assessment |
| Service level indicator (SLI) | A measured property of the service | Share of successful requests, p95 latency |
| Service level objective (SLO) | The target for an SLI over a window | 99.9 % of requests succeed over 28 days |
| Service level agreement (SLA) | A contractual commitment with penalties | Google's SLA for a product, or your SLA to customers, looser than your SLO |

For software delivery, DORA research measures five metrics. **Throughput**: change lead time, deployment frequency and failed deployment recovery time. **Instability**: change fail rate and deployment rework rate. They show whether the move to the cloud actually speeds up delivery.

Measure with the platform: billing export to BigQuery and labels for cost per application, Cloud Monitoring dashboards and SLOs for service levels, and the CI/CD system for delivery metrics. An **error budget** (100 % minus the SLO) turns the reliability target into a decision rule: while budget remains, the team ships features; when it is spent, it prioritizes reliability work.

> **Exam trap.** KPIs measure business outcomes, not resource metrics. "CPU utilization below 60 %" is an operational metric; "checkout completes in under 2 seconds for 99 % of users" is a measurable objective linked to revenue. When a stem asks how to show that the migration met its business goals, choose the option that measures the business outcome.

<!-- section: security-compliance | objectives: 1.1.11 -->
## Security and compliance as business requirements

Security on Google Cloud follows a **shared responsibility** model: Google always secures the infrastructure and the network, you always control access policies and your data. The more managed the service, the more controls Google takes: you carry most of the security work on Compute Engine (IaaS), less on GKE or BigQuery (PaaS), and with serverless products such as Cloud Run functions the split resembles SaaS. Google adds **shared fate**: secure blueprints, the Well-Architected Framework, a risk protection program with insurers, and governance products.

Translate each business statement into a control:

| Business requirement | Control |
| --- | --- |
| "Data must stay in the EU" | Organization policy `constraints/gcp.resourceLocations` with `in:eu-locations`; regional resources; Assured Workloads EU Data Boundary |
| "Regulated workload (FedRAMP, CJIS, ITAR, health data)" | Assured Workloads controls for the folder: residency, personnel access, key requirements |
| "We control the encryption keys" | CMEK in Cloud KMS, Cloud HSM for hardware-protected keys, Cloud External Key Manager for keys kept outside Google |
| "Know and approve when Google staff access our data" | Access Transparency logs, Access Approval, Key Access Justifications |
| "Prevent copying data outside the company" | VPC Service Controls perimeter around the projects and services |
| "Find and mask personal data" | Sensitive Data Protection (discovery, inspection, de-identification) |
| "Prove who did what" | Cloud Audit Logs, kept in a central bucket with the required retention |
| "Show our auditors Google's certifications" | Compliance Reports Manager (SOC 2, ISO 27001 and other reports) |

The resource locations constraint applies to **new** resources where a location can be chosen. It doesn't move or flag existing resources (Security Health Analytics detects those), and it doesn't affect global resources.

> **Exam trap.** Encryption at rest is on by default for all customer data. A requirement "data must be encrypted at rest" is already met; only a requirement about **key control**, rotation you manage or the ability to revoke access calls for CMEK or an external key manager.

<!-- section: observability | objectives: 1.1.12 -->
## Observability

Observability is a business requirement because incidents cost money and SLOs need data. Google Cloud Observability groups the products:

| Need | Product |
| --- | --- |
| Metrics, dashboards, uptime checks, alerting, SLO monitoring | Cloud Monitoring (with Google Cloud Managed Service for Prometheus for Prometheus metrics) |
| Logs: collection, search, routing, retention | Cloud Logging; Observability Analytics (formerly Log Analytics) to query logs and traces with SQL |
| Latency of requests across services | Cloud Trace |
| CPU and memory hot spots in code | Cloud Profiler (Go, Java, Node.js, Python) |
| Grouped application errors | Error Reporting |
| Agent on Compute Engine VMs | Ops Agent |
| Vendor-neutral instrumentation | OpenTelemetry, accepted by Monitoring and Trace |

Logging facts that appear in design questions:

| Bucket or log | Default | Can you change it? |
| --- | --- | --- |
| `_Required` bucket: Admin Activity, System Event, Access Transparency audit logs | 400 days | No; these audit logs can't be disabled |
| `_Default` bucket: all other logs | 30 days | Yes in a project, from 1 to 3,650 days |
| Data Access audit logs | Off, except for BigQuery | Enable per service; they add log volume and cost |
| Policy Denied audit logs | On | Can be excluded with exclusion filters |

**Sinks** route log entries to a log bucket, BigQuery, Cloud Storage, Pub/Sub (third-party tools) or another project. An **aggregated sink** at the organization or folder level collects logs from every child project, including future ones, into one central place.

```bash
gcloud logging sinks create org-audit-sink \
  logging.googleapis.com/projects/sec-logging/locations/europe-west1/buckets/audit \
  --organization=123456789012 --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com"'
```

> **Exam tip.** Alert on symptoms that users feel, through SLO burn-rate alerts in Cloud Monitoring, rather than on every resource metric. When a stem asks for fewer noisy pages while protecting the user experience, choose SLO-based alerting.

<!-- section: key-points -->
## Key points

- Compute transfer time from volume and bandwidth: Storage Transfer Service for other clouds and large online transfers, `gcloud storage` for smaller ones, Transfer Appliance when the link can't meet the deadline, Datastream and Database Migration Service for databases.
- Every design trades availability, control, consistency, performance, speed or portability against cost or effort: hard requirements eliminate, the qualifier decides, and the exact fit beats over-delivery.
- Build what differentiates, buy commodity functions, modify with rehost, replatform, refactor or re-architect, and retire what nobody uses.
- Measure success with business KPIs, ROI and TCO, SLIs and SLOs with error budgets, and the five DORA delivery metrics.
- Turn security and compliance statements into controls: resource locations policy and Assured Workloads for residency, CMEK and EKM for key control, VPC Service Controls against exfiltration, audit logs for proof.
- Admin Activity audit logs are always on and kept 400 days in `_Required`; Data Access logs are off except for BigQuery; aggregated sinks centralize logs for a whole organization.
