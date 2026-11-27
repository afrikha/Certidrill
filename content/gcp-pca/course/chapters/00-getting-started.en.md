The Professional Cloud Architect exam checks that you can turn business and technical requirements into a Google Cloud design, then provision, secure, migrate and operate it. Questions rarely ask what a product does: they describe a company, its constraints and a goal, and offer several designs that would all work. The one that wins is the one that meets the requirement stated in the stem with the least cost, risk or effort. This chapter explains the format, the case studies, a reading method, the 2025–2026 product renames and the pairs of options the exam sets against each other.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 2 hours |
| Questions | 50 to 60, multiple choice and multiple select |
| Case studies | 2 per exam, 20 to 30 % of the questions, shown on a split screen |
| Result | Pass or fail; Google publishes no score and no passing score |
| Price and delivery | 200 USD; online proctored or at a Pearson VUE test center |
| Languages | English and Japanese (Certidrill: English only) |
| Validity | 2 years |
| Prerequisites | None; 3+ years of industry experience, including 1+ year designing and managing solutions on Google Cloud, recommended |

The six sections of the exam guide don't weigh the same:

| Section | Weight | Course chapters |
| --- | --- | --- |
| 1. Designing and planning a cloud solution architecture | about 25 % | 11 to 15 |
| 2. Managing and provisioning a cloud solution infrastructure | about 17.5 % | 21 to 24 |
| 3. Designing for security and compliance | about 17.5 % | 31 and 32 |
| 4. Analyzing and optimizing technical and business processes | about 15 % | 41 and 42 |
| 5. Managing implementation | about 12.5 % | 51 and 52 |
| 6. Ensuring solution and operations excellence | about 12.5 % | 61 |

Two question types exist. **Multiple choice** has four options and one correct answer. **Multiple select** ends with "Choose two." or "Choose three." and offers more options than answers. Google doesn't publish partial credit, so Certidrill scores multiple select questions all or nothing. There are no labs, drag-and-drop or Yes/No series.

To renew during the renewal eligibility period, you can take the **renewal exam**: 1 hour, 25 questions, 100 USD, built around one generative AI case study. Completing a renewal learning path on Google Skills is another option. A lapsed certification requires the standard exam again.

> **Exam tip.** Two hours for up to 60 questions gives about 2 minutes each, but case study questions take longer because you reread the case. Answer every question on the first pass, note the ones you doubt and keep 15 minutes to come back to them. An unanswered question can't earn credit.

<!-- section: case-studies -->
## The case studies

Google publishes the case studies in the exam guide before the exam: Altostrat Media, Cymbal Retail, EHR Healthcare and KnightMotives Automotive. Two of them appear in your exam. Each one follows the same structure, and every part feeds questions:

| Part of the case | What questions take from it |
| --- | --- |
| Company overview | Scale, geography, industry, therefore regulation (health records, payments) |
| Solution concept | The target the questions build toward, often including generative AI |
| Existing technical environment | What must be migrated, integrated or kept: databases, data centers, other clouds, licenses |
| Business requirements | Cost, time to market, new markets, customer experience: they break ties |
| Technical requirements | Availability, latency, security, scalability, managed services: they eliminate options |
| Executive statement | The priority of leadership: "reduce costs", "move fast", "no lock-in" |

Read the four published case studies more than once before exam day, and prepare for each one a short list: workloads, constraints, likely target products. In the exam, the case text is on screen, so you don't memorize it; you only need to recognize which requirement each question targets.

Certidrill mock exams use **original** case studies in the same format, never Google's. They train the same skill: finding the line of the case that decides the answer.

> **Exam trap.** In a case study question, an option can be a good design and still be wrong because it contradicts one line of the case, for example a self-managed database when the technical requirements ask for managed services, or a single-region design when the company is expanding to another continent. Check every surviving option against the case, not against your general preference.

<!-- section: reading-questions -->
## Reading a question

A stem describes a company in two to five sentences, its current architecture and a constraint, then asks "What should you do?" or "Which solution should you recommend?". Read it in this order:

1. Read the last sentence and the qualifier first: cheapest, least operational overhead, minimal changes, most secure, Google-recommended practice.
2. Underline the hard constraints: region or residency, RPO and RTO, downtime allowed, existing licenses or skills, budget, deadline.
3. Eliminate each option that breaks a constraint, even if it is otherwise elegant.
4. Between the survivors, apply the qualifier.

| Words in the stem | What they usually select |
| --- | --- |
| "least operational overhead", "fully managed" | Serverless or managed products (Cloud Run, BigQuery, Cloud SQL, Spanner) over VMs and self-installed software |
| "minimize cost" | The cheapest design that still meets every requirement: Spot VMs for interruptible work, committed use discounts for steady use, colder storage classes, scale to zero |
| "without changing the application" | Rehost: Compute Engine, Migrate to Virtual Machines, Google Cloud VMware Engine, a managed database of the same engine |
| "globally", "users on several continents" | Global external Application Load Balancer, Cloud CDN, Spanner multi-region, Premium Tier |
| "data must stay in the EU" | Regional resources in the EU, the resource locations organization policy, Assured Workloads |
| "least privilege" | A predefined role on the narrowest resource, granted to a group or a service account, not a basic role |
| "no service account keys" | Service account impersonation, Workload Identity Federation, Workload Identity for GKE |
| "prevent data exfiltration" | VPC Service Controls, not firewall rules or IAM alone |
| "RPO of zero", "no data loss" | Synchronous replication: Spanner, Cloud SQL high availability within a region, regional disks |

> **Exam trap.** "Google-recommended practice" means the option that follows the published Google Cloud documentation and the Well-Architected Framework, even when a custom script would also work. Scripts, cron jobs on VMs and long-lived keys are rarely the recommended answer.

<!-- section: renamed-products -->
## Product names in November 2026

Google renamed many products in 2025 and 2026, and older study material uses the old names. The exam guide and Certidrill use the current ones:

| Old name | Current name |
| --- | --- |
| Cloud Functions | Cloud Run functions |
| BeyondCorp Enterprise | Chrome Enterprise Premium |
| Vertex AI | Gemini Enterprise Agent Platform ("Agent Platform"), launched in April 2026 as the evolution of Vertex AI; Model Garden keeps its name |
| Container Registry | Artifact Registry (Container Registry has been shut down since March 18, 2025) |
| Cloud DLP | Sensitive Data Protection |
| Log Analytics | Observability Analytics |
| Dataproc on Compute Engine, Serverless for Apache Spark | Managed Service for Apache Spark |
| GKE node auto-provisioning | Node pool auto-creation |
| Google Cloud Architecture Framework | Google Cloud Well-Architected Framework |

A feature in **Preview** is never the correct answer in Certidrill questions. Gemini Cloud Assist, which the guide lists twice, is presented by its documentation as a Preview offering in November 2026: questions on it test what it does and when to use it, not a deployment that depends on it for production.

<!-- section: confusing-pairs -->
## Options the exam sets against each other

| Don't confuse | With | Difference |
| --- | --- | --- |
| Shared VPC | VPC Network Peering | Shared VPC: one host project owns the network, service projects use its subnets, central network administration. Peering: two networks exchange routes, each keeps its own administration, not transitive |
| VPC Network Peering | Private Service Connect | Peering connects whole networks with non-overlapping ranges; Private Service Connect exposes one service through an endpoint, overlapping ranges allowed |
| Cloud NAT | A load balancer | Cloud NAT gives private VMs outbound internet access only; inbound traffic needs a load balancer or an external IP |
| Global external Application Load Balancer | External passthrough Network Load Balancer | Global, HTTP(S), proxy, Cloud CDN and Cloud Armor; versus regional, any TCP/UDP traffic, client IP preserved, no proxy |
| Cloud SQL | Spanner | Regional relational database with vertical scaling; versus horizontally scalable relational database with multi-region strong consistency and up to 99.999 % availability |
| Bigtable | BigQuery | Low-latency key-value reads and writes at high throughput; versus SQL analytics over large datasets |
| Cloud Interconnect | HA VPN | Private physical connection, high bandwidth; versus encrypted tunnels over the internet. Both reach 99.99 % only with a redundant topology |
| Committed use discounts | Spot VMs | Commitment for 1 or 3 years for steady load; versus spare capacity up to 91 % cheaper, preemptible at any time, no SLA |
| CMEK | Default encryption | Data is always encrypted at rest; CMEK adds a key that you control in Cloud KMS, which you can disable or rotate |
| VPC Service Controls | IAM | IAM decides who may call an API; VPC Service Controls decides from where data may be accessed and blocks copies outside the perimeter |
| Cloud Run | GKE | Containers without cluster management, scale to zero; versus full Kubernetes control: node pools you size, DaemonSets, StatefulSets, service mesh, portable manifests |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: section 1 builds the design vocabulary that the other sections reuse.
2. Open a Google Cloud project with the free trial and create, then delete, the resources the chapters show: a custom mode VPC, a regional managed instance group behind a load balancer, a Cloud Run service, a Cloud SQL instance with high availability, a bucket with a lifecycle rule.
3. Read the four published case studies and the Well-Architected Framework overview pages of each pillar.
4. After each module, take a mock exam. For every question, including the ones you got right, say which requirement each wrong option fails.
5. Book the exam when three full mock exams in a row reach 80 % or more within 2 hours on questions you haven't seen before.
