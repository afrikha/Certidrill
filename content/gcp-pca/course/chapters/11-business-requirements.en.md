A Professional Cloud Architect starts from the business, not from the products. Exam questions and case studies give you business drivers (expand to new markets, cut costs, leave a data center, launch a new service), a list of requirements and constraints, then ask for the design or the first step that serves them best. This chapter covers how to translate a business strategy into architecture decisions, how to separate functional from non-functional requirements, how to plan business continuity, how to optimize cost, how to support the application design and how to integrate with external systems.

<!-- section: use-cases-strategy | objectives: 1.1.1 -->
## Business use cases and product strategy

A use case says what the business must achieve; the product strategy says where it is going next. The architecture has to serve both: today's need, without blocking tomorrow's. Read every case study for its drivers and map each one to a design lever:

| Business driver | Architecture consequence on Google Cloud |
| --- | --- |
| Faster time to market | Managed and serverless products (Cloud Run, BigQuery, Cloud SQL), CI/CD, buying a capability before building it |
| Expansion to new countries or continents | Multi-region deployment, global external Application Load Balancer, Cloud CDN, a check of data residency rules per country |
| Lower and more predictable costs | Pay-per-use services, autoscaling, rightsizing, committed use discounts for the steady baseline only |
| Better customer experience | Lower latency (serving close to users, caching), higher availability, personalization with analytics and AI |
| Exit a data center before a contract ends | Rehost first (Migrate to Virtual Machines, Google Cloud VMware Engine), modernize later |
| New data or AI products | A shared analytics foundation (BigQuery, Cloud Storage), Agent Platform and Gemini models, governed access to data |
| Regulated activity (health, payments, public sector) | Compliance controls from day one: resource location restrictions, Assured Workloads, CMEK, audit logs |

Product strategy also tells you **what will change**. A retailer that plans flash sales needs elastic capacity; a SaaS vendor that will sign enterprise customers needs tenant isolation and per-tenant cost reporting; a company that wants to add a second cloud provider later needs portable components (containers, open-source engines, Terraform). The Well-Architected Framework calls this **design for change**: small, decoupled components that can be replaced without rewriting the rest.

> **Exam tip.** When the executive statement and the technical requirements pull in different directions, the business requirement usually breaks the tie. "Reduce time to market" favors the managed option even if a self-managed one is cheaper on paper; "cut costs by 30 %" favors the cheaper option if every technical requirement is still met.

<!-- section: requirements | objectives: 1.1.2 -->
## Functional and non-functional requirements

**Functional requirements** describe what the system does: accept orders, send invoices, let doctors read patient records, recommend products. **Non-functional requirements** describe how well it does it, and they drive most architecture decisions:

| Non-functional requirement | How it is expressed | Typical Google Cloud answer |
| --- | --- | --- |
| Availability | Target uptime (99.9 %, 99.99 %), maintenance windows | Multiple zones, regional managed instance groups, high availability databases, multi-region for the highest targets |
| Reliability and recovery | RTO and RPO | Replication, backups in another region, tested failover |
| Scalability | Peak load, growth per year, seasonality | Autoscaling, horizontally scalable databases (Spanner, Bigtable) |
| Performance and latency | Response time at a percentile (p95 under 200 ms) | Region placement, Premium Tier, caching, Cloud CDN |
| Security | Least privilege, encryption, isolation | IAM predefined roles, CMEK, VPC Service Controls |
| Compliance | Laws and standards (health data, card data, residency) | Assured Workloads, resource locations policy, audit logs |
| Operability | Team size and skills, on-call burden | Managed services, Infrastructure as Code, Google Cloud Observability |
| Cost | Budget, unit cost (cost per order, per user) | Pricing model choice, budgets, labels |

Turn vague wording into measurable targets: "fast" becomes a latency objective at a percentile, "always available" becomes an availability objective over a period. These targets become **service level indicators (SLIs)** and **service level objectives (SLOs)** that you monitor later.

**Constraints** are requirements you can't negotiate: an existing Oracle license, a team that knows only VMs, a deadline, a regulator. They eliminate options before the qualifier is applied.

> **Exam trap.** A design that satisfies every functional requirement can still be the wrong answer. If the stem says "the operations team has two people", a self-managed Kubernetes or database cluster fails the operability requirement even though it works.

<!-- section: business-continuity | objectives: 1.1.3 -->
## Business continuity plan

A **business continuity plan (BCP)** keeps critical business functions running during and after a disruption: people, processes, suppliers and technology. **Disaster recovery (DR)** is the technology part of it: restoring applications and data. The plan starts with a **business impact analysis**, which classifies each application by the cost of its downtime and gives it two targets:

- **Recovery time objective (RTO)**: the longest the application can stay offline.
- **Recovery point objective (RPO)**: the longest window of data that may be lost.

Smaller RTO and RPO cost more and add complexity. Google's DR planning guide describes three patterns, from cheapest to most expensive:

| Pattern | Meaning | Example on Google Cloud | Fits |
| --- | --- | --- | --- |
| Cold | Nothing runs in the recovery site; resources are created when needed | Backups and snapshots stored in another region, infrastructure recreated with Terraform | Archives, internal reporting: RTO of hours to days |
| Warm | A scaled-down copy is ready but must be completed before it serves | Cloud SQL cross-region read replica, Asynchronous Replication for disks, a small managed instance group that scales up on failover | Important internal applications: RTO of minutes to hours |
| Hot | A standby or a second active site already serves | Global external Application Load Balancer with backends in two regions, Spanner multi-region, dual-region Cloud Storage | Customer-facing services: RTO and RPO near zero |

Design for the failure domain that the requirement names:

| Failure to survive | Minimum design |
| --- | --- |
| One VM or one host | Managed instance group with autohealing; live migration handles host maintenance |
| One zone | Resources in at least two zones: regional managed instance group, Cloud SQL high availability, regional disks, regional GKE cluster |
| One region | A second region with replicated data and a way to shift traffic (global load balancer, Cloud DNS routing policy) |
| Loss of your usual access path | A second connection (redundant Interconnect, HA VPN) and break-glass accounts |

A plan that isn't tested doesn't count. The DR planning guide asks you to test it regularly, automate the recovery infrastructure, check that permissions in the recovery environment match production, and simulate the loss of your usual access to Google Cloud.

> **Exam trap.** Cloud SQL high availability is a **regional** configuration: primary and standby in two zones of one region. It protects against a zone failure, not a region failure. A regional outage requires a cross-region replica that you promote, or the advanced disaster recovery features of the Enterprise Plus edition.

<!-- section: cost-optimization | objectives: 1.1.4 -->
## Cost optimization

The cost optimization pillar of the Well-Architected Framework has four principles: align cloud spending with business value, foster a culture of cost awareness, optimize resource usage, and optimize continuously. In questions, cost is decided by the **pricing model** that matches the usage pattern:

| Usage pattern | Pricing lever | Facts to know |
| --- | --- | --- |
| VM running most of the month, no commitment | Sustained use discounts | Automatic, up to 30 % net for a VM running the whole month, on eligible machine series |
| Steady baseline of specific resources for years | Resource-based committed use discounts | 1 or 3 years for vCPUs, memory, GPUs, Local SSD; up to 55 % (70 % for memory-optimized); can't be cancelled |
| Steady spend across Compute Engine, GKE and Cloud Run | Compute flexible (spend-based) committed use discounts | Hourly spend commitment at billing account level, across projects and regions; not for Spot VMs |
| Interruptible, fault-tolerant batch work | Spot VMs | Up to 91 % off, preempted at any time, no SLA |
| Spiky or idle-most-of-the-time traffic | Serverless that scales to zero | Cloud Run, Cloud Run functions: pay only while instances run |
| Data rarely read | Colder storage classes or Autoclass | Minimum storage durations: Nearline 30 days, Coldline 90, Archive 365; Autoclass moves objects without retrieval or early deletion fees |
| Analytics queries | BigQuery on-demand or capacity (editions) | On-demand bills bytes scanned (partition and cluster tables to reduce them); capacity bills slots, with autoscaling and commitments |

A committed use discount and a sustained use discount never apply to the same usage: commitments apply first, and only the remaining on-demand usage can earn sustained use discounts. A custom machine type costs 5 % more than the predefined equivalent, so use it only when no predefined shape fits.

Visibility and control come with:

- **Labels** on resources and **billing export to BigQuery** to report cost per team, application or tenant.
- **Recommendations** (idle VMs, rightsizing, unused disks and IP addresses) and the FinOps hub.
- **Budgets** with threshold rules on actual or forecasted spend. They send emails and can publish to Pub/Sub so that code reacts, for example by disabling billing on a sandbox project.

```bash
gcloud billing budgets create --billing-account=0X0X0X-0X0X0X-0X0X0X \
  --display-name="analytics-monthly" --budget-amount=20000USD \
  --filter-projects=projects/analytics-prod \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0,basis=forecasted-spend \
  --notifications-rule-pubsub-topic=projects/finops/topics/budget-alerts
```

> **Exam trap.** An alerts-only budget does not cap spending: it notifies. If a stem requires automatic action when a budget is exceeded, the answer adds a Pub/Sub notification and code that acts on it.

<!-- section: application-design | objectives: 1.1.5 -->
## Supporting the application design

The architect advises developers so that the application can use what the platform offers. The Well-Architected Framework lists five core principles that apply to every design: **design for change, document your architecture, simplify your design and use fully managed services, decouple your architecture, and use a stateless architecture**.

| Application need | Design that supports it |
| --- | --- |
| Instances that can be added, removed or replaced at any time | Stateless tier; sessions and shared state in Memorystore, Firestore or a database |
| Spiky web or API traffic | Cloud Run or a managed instance group with autoscaling behind a load balancer |
| Long or slow tasks triggered by users | Return immediately, publish a message to Pub/Sub, process it with workers; Cloud Run jobs for run-to-completion work |
| Scheduled tasks | Cloud Scheduler calling a Cloud Run service, a job or a workflow, rather than cron on a VM |
| Large file uploads and downloads | Signed URLs so that clients read and write Cloud Storage directly; Cloud CDN for public static content |
| Read-heavy database | Cache (Memorystore) and read replicas |
| Secrets and configuration | Secret Manager, not values in code or images |
| Many teams shipping independently | Microservices with clear APIs, one CI/CD pipeline per service, containers in Artifact Registry |

Decoupling also limits the blast radius: when a downstream service is slow, a queue absorbs the load instead of failing the whole request. Stateless design is what makes autoscaling, Spot VMs and rolling updates safe.

> **Exam tip.** When users "lose their session" or "their cart" after a scale-in or a VM replacement, the fix is to move session state out of the instances, not to disable autoscaling or add session affinity.

<!-- section: integration-patterns | objectives: 1.1.6 -->
## Integration patterns with external systems

External systems are partners, SaaS applications, on-premises systems and other clouds. Choose the pattern first, then the product:

| Pattern | Google Cloud product | Use when |
| --- | --- | --- |
| Expose APIs to partners with keys, quotas, analytics, monetization or a developer portal | Apigee | Full API management, many consumers, API products, hybrid runtimes |
| Simple managed gateway in front of serverless backends | API Gateway | An OpenAPI specification, API keys or Google authentication, backends on Cloud Run, Cloud Run functions or App Engine |
| Asynchronous messaging, fan-out, buffering | Pub/Sub | Producers and consumers scale independently; at-least-once delivery by default |
| Route events from Google services or partners to services | Eventarc | Triggers on events delivered in CloudEvents format to Cloud Run, Cloud Run functions, Workflows or GKE |
| Connect SaaS and enterprise applications with little code | Application Integration with Integration Connectors | Salesforce, SAP, ServiceNow, databases; triggers on APIs, schedules, Pub/Sub or webhooks |
| Orchestrate several API calls with retries and waits | Workflows | Sequence of steps across services without a server |
| Replicate database changes to analytics | Datastream | Change data capture from MySQL, PostgreSQL, Oracle, SQL Server and others into BigQuery or Cloud Storage |
| Exchange files in batches | Cloud Storage with Storage Transfer Service, signed URLs or event notifications | Partners drop files, processing starts on arrival |
| Private network path to the external system | Cloud Interconnect, HA VPN, Private Service Connect | Traffic must not cross the internet, or a provider publishes a service |

Pub/Sub details that decide questions:

- Delivery is **at least once** by default, so subscribers must be idempotent.
- **Exactly-once delivery** exists only for **pull** subscriptions, and only when subscribers connect in the same region.
- **Ordering** requires an ordering key; messages with the same key in the same region are delivered in order.
- **Export subscriptions** write directly to BigQuery or Cloud Storage without a subscriber application.

> **Exam trap.** Apigee and API Gateway both front APIs, but only Apigee offers developer portals, monetization, API products and advanced API security. When the stem mentions external developers, partners onboarding themselves or API revenue, choose Apigee; for internal serverless backends with the least overhead, API Gateway is enough.

<!-- section: key-points -->
## Key points

- Map each business driver to a design lever; when requirements conflict, the stated business priority breaks the tie.
- Non-functional requirements (availability, RTO and RPO, latency, operability, compliance, cost) decide most architecture questions; constraints eliminate options first.
- RTO is downtime, RPO is data loss; cold, warm and hot DR patterns trade cost for faster recovery, and Cloud SQL high availability covers a zone, not a region.
- Commit only the steady baseline, use Spot VMs for interruptible work, scale to zero when idle, and remember that an alerts-only budget doesn't stop spending.
- Stateless, decoupled designs on managed services are what make autoscaling, Spot VMs and safe releases possible.
- Choose the integration pattern first: Apigee for full API management, API Gateway for simple serverless APIs, Pub/Sub for asynchronous messaging, Eventarc for events, Application Integration for SaaS, Datastream for change data capture.
