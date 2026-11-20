A professional-level migration question describes a portfolio, not a server: hundreds of applications across data centers and business units, a contractual deadline and teams with limited cloud skills. SAP-C03 asks how to discover and group that portfolio, which of the 7 Rs fits each workload, which AWS service moves servers, databases and files, and how to modernize a monolith or a mainframe without a risky big bang. AWS Transform is now the entry point for discovery, planning and modernization.

<!-- section: discovery-waves | objectives: 4.1.1 -->
## Discovery, assessment and wave planning

Discovery answers what runs where, what depends on what, and what it should cost on AWS. Each source gives part of the answer:

| Source | What it provides | What it lacks |
| --- | --- | --- |
| RVTools export, export for vCenter | VM inventory, sizing, fast directional business case | Network connections, database engines and editions |
| AWS Transform discovery tool | Inventory from VMware vCenter, Microsoft Hyper-V or imported servers; servers, databases and network connections; Oracle details through SQL if credentials are given | Connections from servers it cannot reach with OS credentials |
| CMDB extracts, spreadsheets | Application definitions, owners | Live utilization and connections |
| Application owner questionnaire | Business function, criticality, location, recovery objectives | Technical data |

The **AWS Transform discovery tool** runs on Amazon Linux 2023, as an OVA appliance on vCenter, a VHD on Hyper-V, or a standalone installer on an existing Linux server. It reaches Windows servers through WinRM and Linux servers through SSH, and exports Migration Portfolio Assessment (MPA) files.

**AWS Transform migration assessment** turns an inventory (RVTools, discovery tool export, CMDB, Migration Evaluator or MPA files) into a total cost of ownership business case: best-fit EC2 instances (Graviton, Dedicated Hosts, several pricing models), SQL Server on RDS or EC2 with licensing analysis, EBS, S3 or FSx for NetApp ONTAP storage, and MSK Express for self-managed Kafka. It does **not** map dependencies: AWS Transform groups dependent applications during **migration planning**.

Wave planning rules that the exam expects:

- Build **move groups** from applications that share a database, a message queue, a criticality level, a location or an owner; keep each move group in a single wave.
- Migrate non-production environments before production.
- Without connection data, each application is planned alone: confirm dependencies with the owners before you split two systems that talk to each other.
- Record the target RTO and RPO per application during discovery: they drive the DR design later.

> **Exam trap.** AWS Migration Hub and AWS Application Discovery Service no longer accept new customers (since November 7, 2025). For a new discovery and planning effort the answer is AWS Transform, not the Discovery Agent or Migration Hub wave planning.

<!-- section: seven-rs | objectives: 4.1.1, 4.1.4, 4.1.5 -->
## The 7 Rs as portfolio decisions

| Strategy | What changes | Typical trigger in the stem |
| --- | --- | --- |
| Retire | Application decommissioned or archived | Duplicate or unused system found in discovery |
| Retain | Stays in the source environment for now | Recent hardware, unresolved dependency, regulatory hold |
| Rehost (lift and shift) | Nothing in the application | Data center exit deadline, large number of servers |
| Relocate | Moved to a cloud version of the same platform, many servers at once | Same hypervisor or platform on AWS, an RDS instance moved to another VPC or account |
| Repurchase (drop and shop) | Replaced by another product or a SaaS | CRM or HR system with an available SaaS equivalent |
| Replatform (lift, tinker and shift) | Some optimization, same core architecture | Self-managed database to RDS, VMs to containers |
| Refactor or re-architect | Architecture redesigned with cloud-native features | Scaling or agility the current design cannot reach |

AWS guidance for large migrations recommends rehost, relocate, replatform and retire, and refactoring only when the others are not acceptable: modernize **after** the migration, once the data center is closed.

> **Exam tip.** A fixed deadline ("the colocation contract ends in 6 months") plus "minimal changes" points to rehost now and modernize later. "Reduce operational overhead of the database" without touching application code points to replatform.

<!-- section: rehost | objectives: 4.1.2 -->
## Rehosting with AWS Transform MGN

**AWS Transform MGN** (MGN, previously AWS Application Migration Service) migrates physical, virtual and cloud servers, Windows and Linux, to EC2 in a Region, a Local Zone or an Outpost. The lifecycle:

1. Install the **AWS Replication Agent** on each source server (the MGN connector can run prerequisite checks and agent installation across many servers).
2. MGN launches lightweight **replication servers** in a **staging area subnet** of the target account. The agent reads each volume at block level, then replicates every write continuously.
3. **Replication template**: replication server instance type, staging subnet, target storage. **Launch template** (account-level default, overridable per server): instance type, subnet, security groups. **Post-launch actions**: OS conversion, license and subscription changes, DR configuration.
4. Launch a **test instance**, validate, then mark the server ready for cutover. Each new test replaces the previous one.
5. Launch the **cutover instance** in a short window, stop the source, finalize the cutover and archive the source server.
6. Group servers into **applications** and applications into **waves** to launch, cut over and archive in bulk.

```bash
aws mgn create-wave --name wave-03-finance
aws mgn start-test --source-server-ids s-1234567890abcdef0 s-0fedcba0987654321
aws mgn start-cutover --source-server-ids s-1234567890abcdef0 s-0fedcba0987654321
aws mgn finalize-cutover --source-server-id s-1234567890abcdef0
```

**AWS Transform** sits above MGN for large VMware, Hyper-V or bare metal programs: AI agents run discovery, migration planning, **network migration** (translate the source network configuration into a VPC architecture and deploy it), **landing zone** creation (multi-account foundation with governance controls) and **server rehost** with guided replication, testing and cutover workflows. AWS Transform has no additional charge.

> **Exam trap.** MGN agentless snapshot replication through the MGN vCenter Client is no longer available for new deployments; agent-based replication is the answer, and it gives continuous data protection and the shortest cutover window. A cutover instance doesn't receive changes made on the source after it launches, so stop writes on the source first.

<!-- section: data-migration | objectives: 4.1.3 -->
## Database and data migration

**AWS DMS** copies data between engines (homogeneous or fully heterogeneous) with three task types: **full load**, **full load plus CDC** (existing data, then ongoing changes) and **CDC only** (target already loaded, for example from a native backup). CDC reads the source logs through native APIs; prerequisites differ by engine: Oracle supplemental logging, MySQL row-level binary logging, PostgreSQL logical replication slots, backups enabled on RDS sources with logs kept long enough (24 hours is usually enough). A CDC start point is a timestamp or a native position (SCN, LSN, binlog file and position) and can't be changed after the task is created. CDC has no latency SLA.

| Need | DMS option |
| --- | --- |
| No replication instance to size or patch | DMS Serverless: capacity computed from the source metadata, pay for use |
| Same engine to RDS or Aurora with native tools (dump and restore) | Homogeneous data migrations: serverless, migration project with data providers and an instance profile; no built-in data validation |
| Different engine (Oracle to Aurora PostgreSQL, SQL Server to Aurora MySQL) | DMS Schema Conversion (managed) or AWS Schema Conversion Tool (desktop) for schema and code, then DMS for data |
| Inventory of on-premises database servers | DMS Fleet Advisor |
| Run both systems during a coexistence period | Bidirectional tasks with loopback prevention; no conflict detection, so assign write ownership per table |

File and object data:

| Requirement | Service |
| --- | --- |
| One-time or scheduled copy of NFS, SMB, HDFS or object storage (including other clouds) to S3, EFS or FSx, with encryption and integrity validation | AWS DataSync (agent on premises; Enhanced mode for virtually unlimited object counts, parallel listing and transfer) |
| Partners keep sending files over SFTP, FTPS, FTP or AS2 to S3 or EFS | AWS Transfer Family |
| On-premises applications keep using file, volume or tape protocols with cloud storage behind them | AWS Storage Gateway (S3 File Gateway, Volume Gateway, Tape Gateway) |
| Network too slow for the dataset and the deadline | AWS Data Transfer Terminal: bring your own devices to a network-ready AWS location |

DataSync over Direct Connect with a VPC endpoint keeps the transfer off the public internet. The task mode (Enhanced or Basic) can't be changed after the task is created.

> **Exam trap.** AWS Snow Family devices are no longer offered to new customers. "Petabytes, limited bandwidth, 6 weeks" now points to Data Transfer Terminal or a dedicated Direct Connect with DataSync, not Snowball Edge.

<!-- section: replatform | objectives: 4.1.4 -->
## Replatforming to managed services

Replatforming keeps the application design but hands undifferentiated work (patching, backups, failover, scaling) to AWS:

| Source workload | Managed target | Operational work removed |
| --- | --- | --- |
| Oracle or SQL Server on VMs, license kept | Amazon RDS for Oracle or SQL Server | OS and engine patching, backups, Multi-AZ failover |
| MySQL or PostgreSQL clusters | Amazon Aurora (provisioned or Serverless v2) | Storage management, replica failover, cross-Region replication with Global Database |
| Java or .NET applications on VMs | Containers on Amazon ECS with AWS Fargate | Host fleet, AMI patching, capacity planning |
| Scheduled scripts on a VM | AWS Lambda triggered by EventBridge Scheduler | Servers that idle between runs |
| Self-managed Kafka | Amazon MSK | Broker operations |
| ActiveMQ or RabbitMQ brokers | Amazon MQ | Broker patching, standby brokers |
| Windows file servers | Amazon FSx for Windows File Server | File server OS, DFS replicas |
| Web applications on a supported platform | AWS Elastic Beanstalk | Load balancer, scaling and deployment wiring |

**AWS Transform** helps here too: it containerizes applications from source code and deploys them to ECS or EKS, and it ports .NET Framework applications to cross-platform .NET that runs on Linux, which removes Windows license cost.

> **Exam tip.** When two options both meet the functional requirement, "LEAST operational overhead" prefers Fargate over EC2 launch type, Aurora over a self-managed cluster on EC2, and Lambda over a cron server, unless the stem names a constraint they break (a kernel module, a long-running stateful process, a license tied to physical cores).

<!-- section: refactor | objectives: 4.1.5 -->
## Refactoring with the strangler fig pattern

A big-bang rewrite of a large monolith is risky and delays business features. The **strangler fig** pattern extracts features one at a time while the monolith keeps running:

1. Put a **proxy layer** in front of the monolith; at first it routes all traffic to it. Amazon API Gateway is serverless and Multi-AZ, so it does not become the single point of failure that a self-managed proxy would; an Application Load Balancer with path-based rules also works.
2. Build new features as microservices; keep bug fixes in the monolith.
3. Extract one bounded context (users, cart, account...) at a time and change the proxy route to the new service. Use domain-driven design to find the boundaries first.
4. Each microservice **owns its data** (polyglot persistence: DynamoDB, Aurora, ElastiCache). When the monolith still needs that data, the service publishes change events to a queue and a synchronizing agent updates the monolith database: eventually consistent, tactical, removed later.
5. Where monolith code calls an extracted capability, an **anti-corruption layer** (adapter or facade) translates the call to the new interface, so callers are unaware of the migration.
6. Decommission the monolith when nothing routes to it.

Serverless adoption usually follows: extracted services on Lambda behind API Gateway, integrated through EventBridge or SQS instead of synchronous calls.

Don't use the pattern for a small application that is cheaper to rewrite, or when you can't intercept calls (no access to the code base).

> **Exam trap.** AWS Migration Hub Refactor Spaces, which automated strangler fig routing across accounts, no longer accepts new customers (since November 7, 2025). Build the facade with API Gateway or an ALB yourself; AWS suggests AWS Transform as the alternative.

<!-- section: legacy-modernization | objectives: 4.1.6 -->
## Modernizing mainframes and legacy workloads

**AWS Transform for mainframe** supports z/OS applications in COBOL and PL/I with JCL, CICS transactions, BMS screens, Db2 databases and VSAM files, and Fujitsu GS21 applications. Its agents:

- analyze the codebase and generate documentation for code nobody remembers;
- extract business logic and decompose the monolith into domains;
- plan migration waves, with human approval of decomposition and waves;
- refactor COBOL workloads into cloud-optimized **Java** applications;
- provide IaC templates for the target environment.

| Legacy situation | Modernization path |
| --- | --- |
| COBOL batch and CICS online on z/OS, skills retiring | AWS Transform for mainframe: analysis, decomposition, refactor to Java on AWS compute |
| Oracle database with PL/SQL, license cost | DMS Schema Conversion to Aurora PostgreSQL, then DMS full load plus CDC, cutover after validation |
| .NET Framework on Windows Server | AWS Transform .NET modernization to Linux-ready .NET, then containers |
| Unsupported OS, application must move first | Rehost with MGN to buy time, then modernize on AWS |

VSAM and Db2 data move with the refactored programs; parallel runs compare outputs before cutover.

> **Exam trap.** The AWS Mainframe Modernization managed runtime environment has stopped accepting new customers, and its self-managed experience is closed to new customers too. For a new mainframe program, the answer is AWS Transform for mainframe.

<!-- section: key-points -->
## Key points

- AWS Transform: discovery tool (inventory, network connections), migration assessment (TCO, no dependency mapping), migration planning (move groups, waves). Migration Hub and Application Discovery Service are closed to new customers.
- 7 Rs: retire, retain, rehost, relocate, repurchase, replatform, refactor; for large programs migrate first, modernize after.
- MGN: agent, staging subnet, continuous block-level replication, test then cutover instances, applications and waves; agentless replication no longer available for new deployments.
- DMS: full load, full load plus CDC, CDC only; Serverless; homogeneous data migrations with native tools; Schema Conversion or SCT for engine changes.
- DataSync for bulk and scheduled copies, Transfer Family for partner protocols, Storage Gateway for hybrid access, Data Transfer Terminal for offline volumes; no Snow devices for new customers.
- Replatform to RDS, Aurora, ECS on Fargate, Lambda, MSK, Amazon MQ, FSx.
- Strangler fig: proxy, extract by bounded context, data ownership, anti-corruption layer; Refactor Spaces is closed to new customers.
- Mainframes: AWS Transform for mainframe (COBOL and PL/I to Java).
