AZ-305 is a design exam. Nearly every question describes an environment, lists requirements and asks what you should recommend: a service, a tier, a redundancy option or a topology. You configure nothing. This chapter covers the format, a method for reading requirement-driven questions and the service families the exam expects you to tell apart.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Microsoft Certified: Azure Solutions Architect Expert |
| Prerequisite | The Azure Administrator Associate certification (exam AZ-104) is required to earn the certification |
| Duration | 100 minutes of exam time (Microsoft's figure for associate and expert exams without labs) |
| Questions | Not published; about 40 to 60 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn can be opened during the exam, on the same clock |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Design identity, governance, and monitoring solutions | 25 to 30 % |
| Design data storage solutions | 20 to 25 % |
| Design business continuity solutions | 15 to 20 % |
| Design infrastructure solutions | 30 to 35 % |

The score is scaled: 700 doesn't mean 70 % of the questions. Questions made of several elements (drop-down lists, Yes/No statements, drag and drop) give one point per correct element, so a partly correct answer still earns points.

Question formats, from most to least frequent: one answer among four, answer areas with two or three drop-down lists, series of three Yes/No statements, "select two", and drag and drop that matches requirements to services. There is no lab, no command to complete and no portal click path. An exam also contains sections with their own rules:

- **Case studies.** A company description in tabs (overview, existing environment, planned changes, technical and business requirements) followed by several questions. Once you leave a case study, you can't come back to it.
- **Yes/No series.** The same scenario is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final. Several solutions can meet the goal, or none.
- **Main section.** Independent questions that you can flag and review until you submit.

> **Exam tip.** Microsoft Learn is available, but the timer keeps running. Use it to check one precise fact (which tier has a feature, a limit), never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a design question

A typical stem gives a short context (subscriptions, tenants, an on-premises datacenter, workloads), then two to five requirements, often as a bulleted list. Each requirement is there to eliminate one answer choice. Work in this order:

1. Read the last sentence first: what must you recommend?
2. List the requirements, including those hidden in the context ("the company has no VPN", "developers must not manage credentials").
3. Eliminate every choice that fails one requirement, even a minor one.
4. Among the remaining choices, the cheapest and simplest one wins.

| Words in the stem | What they select |
| --- | --- |
| "minimize costs" | The cheapest tier, SKU or redundancy that still has every required feature |
| "minimize administrative effort" | The managed service or built-in feature (platform service, policy, managed identity) rather than virtual machines, scripts or custom code |
| "recovery point objective (RPO) of 15 minutes" | How much data may be lost: it sets the replication or backup frequency |
| "recovery time objective (RTO) of 1 hour" | How long the service may be down: it sets the failover mechanism |
| "must remain available if a datacenter fails" | Availability zones: zone-redundant tiers and SKUs |
| "must remain available if a region fails" | A second region: geo-replication, failover groups, global load balancing |
| "must not be exposed to the internet" | Private endpoints, private connectivity, internal load balancers |
| "without storing credentials" | Managed identities; the secrets that can't be avoided go to Azure Key Vault |
| "principle of least privilege" | The narrowest role at the narrowest scope, activated just in time when it is privileged |
| "must apply to future subscriptions" | An assignment at a management group, inherited downward |
| "prevent", as opposed to "identify" or "report" | A blocking control (Azure Policy `deny`, a lock), as opposed to an audit |
| "minimize changes to the application" | Rehosting on a compatible service rather than rearchitecting |

> **Exam trap.** "Minimize costs" never overrides a functional requirement. If the workload needs a feature that only a higher tier provides, the higher tier is the answer; the cheaper one is the planted distractor.

In a Yes/No series, judge each solution on its own: forget the solution proposed in the previous question, and accept a solution that meets the goal even if you would have designed a better one.

<!-- section: design-principles -->
## Design principles the exam rewards

The study guide expects designs aligned with the Azure Well-Architected Framework and the Cloud Adoption Framework. The five pillars of the Well-Architected Framework explain most trade-offs between two valid options:

| Pillar | Question it asks | Typical answer |
| --- | --- | --- |
| Reliability | What happens when a component, a zone or a region fails? | Redundancy across zones or regions, backups, tested failover |
| Security | Who can reach the data, and with which identity? | Microsoft Entra authentication, least privilege, private networking, encryption |
| Cost Optimization | Is anything paid for and not needed? | The right tier, autoscaling, reservations, cooler storage tiers |
| Operational Excellence | Can it be deployed and observed without manual steps? | Infrastructure as code, policy, centralized monitoring |
| Performance Efficiency | Does it follow the load? | Horizontal scaling, caching, partitioning |

The Cloud Adoption Framework supplies the organization-wide answers: Azure landing zones (a management group hierarchy with platform and workload subscriptions), naming and tagging conventions, and the migration methodology.

When two options meet every requirement, the exam prefers, in this order: a platform service over virtual machines, a built-in feature over custom code, an identity over a secret, and a policy over a manual procedure.

<!-- section: confusing-pairs -->
## Services that are easy to confuse

Answer choices come from the same product family. Learn the one-line difference:

| Family | Options | What separates them |
| --- | --- | --- |
| Recovery objectives | RPO, RTO | RPO is the data you may lose; RTO is the time to be back in service |
| Resilience scope | Availability zones, second region | Zones survive a datacenter failure; only another region survives a regional failure |
| Protection | Azure Backup, Azure Site Recovery | Backup restores data to a point in time; Site Recovery replicates machines to fail over quickly |
| Governance | Azure Policy, Azure RBAC, resource locks | Policy controls what resources may be; RBAC controls who may act; locks block deletion or change for everyone |
| Workload credentials | Managed identity, service principal, Azure Key Vault | A managed identity has no secret to manage; a service principal has a secret or a certificate; Key Vault stores the secrets that remain |
| Relational databases | Azure SQL Database, Azure SQL Managed Instance, SQL Server on Azure Virtual Machines | Fully managed database; near-complete compatibility with a SQL Server instance; full control of the operating system and the instance |
| SQL geo-redundancy | Active geo-replication, failover groups | Readable secondaries per database; group failover behind listener endpoints that don't change |
| Storage redundancy | LRS, ZRS, GRS, GZRS | One datacenter; three zones; a second region; zones plus a second region |
| Messaging | Queue Storage, Service Bus, Event Grid, Event Hubs | Simple queue; enterprise messaging with ordering and transactions; event notification and routing; high-volume telemetry streaming |
| Load balancing | Azure Load Balancer, Application Gateway, Traffic Manager, Azure Front Door | Regional layer 4; regional layer 7 with a web application firewall; global, DNS-based; global layer 7 with acceleration and a web application firewall |
| Compute | Azure Functions, Logic Apps, Container Apps, Azure Kubernetes Service, Azure Batch | Event-driven code; low-code workflows; serverless containers; full Kubernetes; large-scale parallel jobs |
| External users | B2B collaboration, External ID in an external tenant | Partners as guests in your workforce tenant; customers of your applications in a separate tenant |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the identity, governance and monitoring decisions come back in every later design.
2. For each service family, write your own "requirement, answer" table and compare it with the chapter's.
3. After each domain, take a mock exam, read every explanation and reread the sections linked to your mistakes.
4. Train on case studies: read the questions first, then look in the tabs for the requirements each question depends on.
5. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
