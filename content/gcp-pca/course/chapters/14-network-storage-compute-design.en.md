This chapter maps requirements to Google Cloud building blocks: hybrid and multicloud connectivity, VPC design, data processing, storage, compute platforms, machine choices and AI services. Exam scenarios rarely ask what a product does. They give a requirement such as "lowest operational overhead", "preserve client IP", "global consistency" or "no public internet" and ask which design meets it. Several products renamed in 2025–2026 are given here under their current names, with the old name the exam guide or older material may still use.

<!-- section: hybrid-multicloud | objectives: 1.3.1 -->
## Integrating with on-premises and multicloud environments

| Option | Path | Capacity | Encryption | Typical requirement |
| --- | --- | --- | --- | --- |
| HA VPN | IPsec over the internet, BGP through Cloud Router | About 1–3 Gbps per tunnel (250,000 packets per second) | Yes (IPsec) | Quick, low cost, encrypted, 99.99 % SLA with two interfaces |
| Dedicated Interconnect | Your router meets Google in a colocation facility | 10, 100 or 400 Gbps links, up to 8 per connection | No by default; MACsec or HA VPN over Interconnect | High, steady bandwidth, lower egress pricing, private path |
| Partner Interconnect | Through a service provider | VLAN attachments from 50 Mbps to 50 Gbps | No by default | No presence in a colocation facility, or less than 10 Gbps |
| Cross-Cloud Interconnect | Dedicated physical link from Google to AWS, Azure, OCI or Alibaba Cloud | 10 or 100 Gbps (400 Gbps for AWS and OCI) | MACsec supported | High-bandwidth private link to another cloud |
| Partner Cross-Cloud Interconnect | Another cloud through a partner | Partner-dependent | Partner-dependent | Multicloud without buying ports |
| Network Connectivity Center (NCC) | Hub with VPC and hybrid spokes | Not a link: an orchestration layer | n/a | Connect many VPCs and sites any-to-any; use Google's backbone as a WAN between sites |

Interconnect SLA targets: **99.99 %** for critical production (at least four connections, two in each of two metros, each pair in different edge availability domains; or, in qualifying metros only, four connections in one metro across two facility and edge availability domain combinations, ordered as a connection group with the `PRODUCTION_CRITICAL` intended topology, with the VLAN attachments in the metro's low-latency region) and **99.9 %** for non-critical production (two connections in one metro, different edge availability domains). A single connection has no SLA.

Other integration pieces the exam combines with connectivity:

- **Private Google Access for on-premises hosts**: on-premises clients reach Google APIs over VPN or Interconnect through `private.googleapis.com` (199.36.153.8/30) or `restricted.googleapis.com` (199.36.153.4/30, only APIs supported by VPC Service Controls). It requires DNS records for `googleapis.com` on premises and Cloud Router custom advertisements of the range.
- **Hybrid DNS** with Cloud DNS: outbound forwarding zones send Google-side queries for on-premises names to on-premises resolvers; an inbound server policy lets on-premises resolvers query Cloud DNS private zones.
- **BigQuery Omni** runs BigQuery on data that stays in Amazon S3 or Azure Blob Storage through BigLake tables (Enterprise edition reservations or on-demand pricing). It answers "analyze data in another cloud without copying it".

> **Exam trap.** Cloud Interconnect is private but **not encrypted**. When a requirement says "encrypt all traffic between the data center and Google Cloud" with Interconnect bandwidth, add HA VPN over Cloud Interconnect (or MACsec on supported circuits), not a second Interconnect.

<!-- section: cloud-native-networking | objectives: 1.3.3 -->
## Cloud-native networking

A **VPC network is global**, its **subnets are regional**, and routes and firewall policies apply network-wide. Use **custom mode** in production: auto mode creates a /20 in every region from 10.128.0.0/9, which overlaps between networks and blocks peering or hybrid routing.

Choosing how networks talk to each other:

| Requirement | Design |
| --- | --- |
| Central network team, many projects of one organization sharing subnets | **Shared VPC**: host project owns the network, service projects attach; Network User role granted per subnet |
| Two VPCs (possibly different organizations) exchange all subnet routes, no overlap | **VPC Network Peering** (non-transitive, both sides must configure it) |
| Consume one service from another VPC, overlapping IPs allowed, consumer-initiated | **Private Service Connect** endpoint or backend |
| Many VPCs and on-premises sites, any-to-any, transitive | **NCC** with VPC spokes and hybrid spokes |
| Reach Google APIs from VMs with no external IP | Private Google Access on the subnet, or a PSC endpoint for Google APIs |
| Outbound internet for private VMs | **Cloud NAT** (outbound only) |

Routing: Cloud Router exchanges routes with BGP for HA VPN, Interconnect and router appliances. The VPC **dynamic routing mode** is regional by default; set it to **global** so routes learned in one region reach subnets in all regions.

Firewalls: hierarchical firewall policies (organization and folders) are evaluated first, then VPC firewall rules and network firewall policies, then the implied rules (deny ingress, allow egress). Cloud NGFW Standard adds FQDN and geolocation objects, which are components of firewall policy rules (VPC firewall rules do not have them); Enterprise adds intrusion prevention and TLS inspection.

Load balancing decision (from Google's decision tree):

| Traffic | Choice |
| --- | --- |
| HTTP(S), internet users worldwide, one anycast IP, Cloud CDN, Cloud Armor | Global external Application Load Balancer (Premium Tier) |
| HTTP(S) but TLS must terminate in one region, or Standard Tier | Regional external Application Load Balancer |
| Internal HTTP(S) between services | Regional or cross-region internal Application Load Balancer |
| TCP with proxy, optional SSL offload | Proxy Network Load Balancer |
| UDP, ESP, ICMP, or the backend must see the **client source IP** | Passthrough Network Load Balancer (external regional or internal) |

Container networking: GKE clusters are **VPC-native** (Pods and Services use alias IP secondary ranges), so Pod IPs are routable in the VPC and across peering, VPN and Interconnect. Plan secondary ranges large enough for Pod growth before creating the cluster.

> **Exam trap.** VPC Network Peering is **not transitive**: if A peers with B and B peers with C, A cannot reach C. Also, peered networks exchange custom routes (static routes and routes learned from on-premises) only when export and import of custom routes are enabled on the peering. Use a hub with NCC, or Shared VPC, when many networks must reach each other.

<!-- section: data-processing | objectives: 1.3.4 -->
## Choosing data processing solutions

| Product (current name) | Model | Choose it when |
| --- | --- | --- |
| Pub/Sub | Serverless messaging, at-least-once by default | Decouple producers and consumers, ingest events at any scale |
| Dataflow | Serverless Apache Beam, batch and streaming | New pipelines, streaming with windowing, exactly-once processing, minimal operations |
| Managed Service for Apache Spark (formerly Dataproc and Serverless for Apache Spark) | Managed Spark/Hadoop clusters or serverless Spark | Existing Spark or Hadoop jobs to move with few changes |
| BigQuery | Serverless data warehouse, SQL | Analytics, ELT in SQL, BI, ML in SQL (BigQuery ML) |
| Datastream | Serverless change data capture | Replicate Oracle, MySQL, PostgreSQL, SQL Server changes to BigQuery or Cloud Storage |
| Cloud Data Fusion | Managed CDAP pipelines | Visual integration by data engineers who don't write code |
| Managed Service for Apache Airflow (formerly Cloud Composer) | Managed Airflow | Orchestrate multi-step workflows across services on a schedule (DAGs) |

Patterns to recognize: **Pub/Sub → Dataflow → BigQuery** for streaming analytics; **Datastream → BigQuery** for near-real-time replication of an operational database; **Managed Service for Apache Spark** with Cloud Storage replacing HDFS for a Hadoop lift-and-shift (ephemeral clusters per job cut cost).

> **Exam tip.** "Existing Spark jobs, minimal code change" points to Managed Service for Apache Spark; "new pipeline, unified batch and streaming, no cluster management" points to Dataflow. Orchestration (Airflow) is not processing: it calls the processing services.

<!-- section: storage-types | objectives: 1.3.5 -->
## Choosing storage types

| Need | Product |
| --- | --- |
| Unstructured objects, data lake, backups, media | Cloud Storage (Standard, Nearline 30 days, Coldline 90 days, Archive 365 days minimum duration) |
| Shared POSIX file system over NFS | Filestore (Zonal, Regional, Enterprise multishares for GKE) |
| Block storage for one VM (or shared multi-writer) | Hyperdisk (Balanced by default), Persistent Disk, Local SSD for scratch |
| Relational, regional, MySQL / PostgreSQL / SQL Server | Cloud SQL (Enterprise or Enterprise Plus edition) |
| PostgreSQL-compatible, high performance, transactional plus analytics | AlloyDB for PostgreSQL |
| Relational, horizontal scale, strong global consistency, up to 99.999 % | Spanner (multi-region needs Enterprise Plus edition) |
| Wide-column, very high throughput, low latency, time series, IoT | Bigtable |
| Document database for mobile, web, serverless apps | Firestore |
| In-memory cache, sessions | Memorystore for Valkey or for Redis (Memorystore for Memcached is deprecated: no new instances in new projects after February 1, 2027, shutdown on January 31, 2029; Google recommends migrating to Valkey) |
| Analytics over large datasets | BigQuery |

> **Exam trap.** Bigtable is not relational and offers no multi-row SQL transactions; BigQuery is not an operational database. "Global, relational, strongly consistent writes in several regions" is Spanner, not Cloud SQL with cross-region replicas (replicas are read-only and asynchronous).

<!-- section: compute-platforms | objectives: 1.3.6 -->
## Mapping compute needs to platform products

| Platform | You manage | Choose it when |
| --- | --- | --- |
| Compute Engine | OS, patching, scaling (with MIGs) | Lift-and-shift, specific OS or kernel, licensed software, full control |
| Google Cloud VMware Engine | VMware workloads (Google runs the VMware stack on dedicated bare metal) | Move a vSphere estate fast with HCX, no re-platforming |
| GKE Autopilot | Workloads only; GKE manages nodes | Containers on Kubernetes with the least node management (Google's recommendation for most workloads) |
| GKE Standard | Node pools, node configuration | Privileged Pods, custom node settings, granular infrastructure control |
| Cloud Run services | Container image or source code | Stateless HTTP or event-driven containers, scale to zero, pay per use |
| Cloud Run jobs | Container that runs to completion | Batch tasks, scheduled scripts |
| Cloud Run functions (formerly Cloud Functions) | A function | Small event handlers: Cloud Storage uploads, Pub/Sub messages, webhooks |
| App Engine | Application code | Existing App Engine apps; Google recommends Cloud Run for new users |

> **Exam tip.** Read the operational-overhead clue: "no infrastructure to manage, HTTP, containers" is Cloud Run; "Kubernetes APIs or portability with Helm charts" is GKE (Autopilot unless a node-level need is stated); "custom kernel module or license bound to a VM" is Compute Engine.

<!-- section: compute-resources | objectives: 1.3.7 -->
## Choosing compute resources

| Family | Series (examples) | Use |
| --- | --- | --- |
| General-purpose | E2 (lowest cost), N4, N2, N2D, C4, C3, T2D | Web, app servers, most workloads |
| Compute-optimized | H4D, H3, C2, C2D | HPC, compute-bound jobs |
| Memory-optimized | X4, M4, M3, M2, M1 | SAP HANA, in-memory databases |
| Storage-optimized | Z3 | High local storage IOPS (databases, analytics) |
| Accelerator-optimized | A4, A3, A2 (GPU training), G4, G2 (inference, graphics) | ML, HPC on GPUs |

- **Custom machine types**: N and E general-purpose series let you choose vCPU and memory, for workloads that don't fit a predefined shape (for example a license priced per vCPU).
- **Spot VMs**: up to 91 % cheaper, can be preempted at any time with a best-effort 30-second shutdown, no SLA, no live migration, no maximum runtime unless you set one. For fault-tolerant batch, CI, rendering, stateless workers in a MIG.
- **Sole-tenant nodes**: dedicated physical hosts for compliance isolation or licenses tied to physical cores.
- **Specialized workloads**: GPUs on accelerator-optimized series, Cloud TPUs (v5e, v5p, v6e, TPU7x Ironwood) for large training and serving, Hyperdisk ML for read-only model weights shared by many nodes.

> **Exam trap.** Spot VMs are never the answer for a stateful database or anything with an availability SLA requirement, even when "lowest cost" is stated: the requirement that excludes them is usually in the same sentence.

<!-- section: ai-ml | objectives: 1.3.2 -->
## Google Cloud AI and machine learning solutions

Vertex AI is now **Gemini Enterprise Agent Platform** (short name Agent Platform). Vertex AI Model Garden is **Model Garden**, Vertex AI Pipelines is **Agent Platform Pipelines**, Vertex AI Agent Engine is **Agent Runtime**, and Vertex AI Search is **Agent Search**. The Agent Builder tools of the exam guide are part of the platform: Agent Development Kit (ADK, code-first framework), Agent Studio (low-code), Agent Garden (prebuilt agents), Agent Runtime (managed deployment), plus RAG Engine and Vector Search for grounding.

| Requirement | Recommended approach |
| --- | --- |
| Standard task: OCR, translation, speech-to-text | Pre-trained APIs (no model to build) |
| Generate, summarize, reason, multimodal input | Gemini models (Pro for complex reasoning, Flash and Flash-Lite for low latency and cost) through the Agent Platform API |
| Answer from company documents | Retrieval-augmented generation: RAG Engine or Agent Search grounding, not retraining |
| Use a partner or open model (Claude, Llama, Gemma) | Model Garden: managed API (Model as a Service) or self-deploy to an endpoint |
| Multi-step assistant that calls tools and APIs | Agent built with ADK or Agent Studio, deployed on Agent Runtime |
| Own model, large-scale training | Managed Training on Agent Platform or GKE, on AI Hypercomputer |

**AI Hypercomputer** is Google's integrated AI infrastructure: GPUs and TPUs, networking and storage (Cloud Storage, Managed Lustre); open software (PyTorch, JAX, GKE, Cluster Director for Slurm); and consumption options. Spot VMs (up to 91 % off, preemptible), Flex-start VMs (up to seven days, not preempted, capacity best-effort), calendar-mode future reservations (up to 90 days, up to 80 VMs, assured capacity) and standard reservations with committed use discounts.

> **Exam tip.** Prefer the least custom option that meets the requirement: pre-trained API, then Gemini with prompting and grounding, then tuning, then custom training. Retraining a model to "know" internal documents is almost always the wrong answer.

<!-- section: key-points -->
## Key points

- HA VPN: encrypted, quick, 99.99 % with two interfaces. Interconnect: bandwidth and private path, not encrypted by default; 99.99 % needs four connections in two metros, or four in one qualifying metro ordered as a `PRODUCTION_CRITICAL` connection group.
- Cross-Cloud Interconnect links Google to AWS, Azure, OCI or Alibaba Cloud; NCC gives any-to-any transitive connectivity.
- Shared VPC for central control in one organization; peering is non-transitive; PSC exposes one service and tolerates overlapping IPs.
- Client IP or UDP: passthrough Network Load Balancer. Global HTTP(S) with CDN and Cloud Armor: global external Application Load Balancer.
- Dataflow for new pipelines, Managed Service for Apache Spark for existing Spark, Datastream for CDC, Airflow to orchestrate.
- Spanner for global relational consistency, Bigtable for high-throughput key-value, Cloud SQL or AlloyDB for regional relational.
- Cloud Run by default for stateless containers, GKE Autopilot for Kubernetes, Compute Engine for full control.
- Agent Platform is the former Vertex AI; choose pre-trained APIs or Gemini with grounding before custom training.
