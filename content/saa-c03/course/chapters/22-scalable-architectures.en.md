A scalable architecture keeps its performance when load grows, and its cost when load falls. SAA-C03 questions give a workload (a spiky web application, a read-heavy database, a global audience, a legacy application to modernize) and ask how to scale it: which scaling method, which cache, which edge service, containers or serverless, and which storage and database types fit.

<!-- section: scaling-models | objectives: 2.1.6, 2.1.18 -->
## Horizontal and vertical scaling

| | Vertical scaling (scale up) | Horizontal scaling (scale out) |
| --- | --- | --- |
| How | Bigger instance type or database class | More instances, tasks, functions or shards |
| Limit | The largest size available | Practically none if the component is stateless |
| Downtime | Usually a restart (stop, change type, start) | None: add or remove nodes behind a load balancer or queue |
| Availability | Still one node | Nodes spread across Availability Zones |
| Typical fit | Relational database primary, legacy application that can't be distributed | Web and application tiers, queue workers, containers |

Amazon EC2 Auto Scaling keeps a group between a minimum and a maximum, replaces unhealthy instances and resizes the group:

| Method | Use when |
| --- | --- |
| Target tracking | Keep a metric near a value (average CPU 50 %, requests per target 1,000). The recommended default |
| Step scaling | Add more capacity the further a CloudWatch alarm is breached |
| Simple scaling | One adjustment per alarm, then a cooldown (legacy behavior) |
| Scheduled | Known calendar patterns (business hours, month-end batch) |
| Predictive | Recurring daily or weekly patterns: capacity is launched ahead of the forecast; combine with dynamic scaling |

```yaml
WebScalingPolicy:
  Type: AWS::AutoScaling::ScalingPolicy
  Properties:
    AutoScalingGroupName: !Ref WebAsg
    PolicyType: TargetTrackingScaling
    TargetTrackingConfiguration:
      PredefinedMetricSpecification:
        PredefinedMetricType: ALBRequestCountPerTarget
        ResourceLabel: !Join ["/", [!GetAtt Alb.LoadBalancerFullName, !GetAtt WebTg.TargetGroupFullName]]
      TargetValue: 1000
```

Scaling strategy by component:

| Component | How it scales |
| --- | --- |
| EC2 web or application tier | Auto Scaling group across AZs behind a load balancer |
| Queue workers | Auto Scaling on backlog per instance (queue depth divided by instances), not CPU |
| Amazon ECS service | Service Auto Scaling on the task count; capacity providers or Fargate for the hosts |
| AWS Lambda | Automatic, per request, within the account's concurrency quota |
| Amazon DynamoDB | On-demand capacity mode (no planning) or provisioned capacity with auto scaling |
| Amazon Aurora | Aurora Replicas with Aurora Auto Scaling for reads; Aurora Serverless v2 scales capacity in ACUs |
| Amazon RDS | Vertical (instance class), read replicas for reads, storage autoscaling for disk |
| Kinesis Data Streams | On-demand capacity mode, or more shards in provisioned mode |

> **Exam trap.** A worker fleet that processes an SQS queue must scale on the number of messages waiting per instance. CPU stays flat when workers wait on I/O while the backlog grows.

<!-- section: caching | objectives: 2.1.3 -->
## Caching strategies

A cache serves repeated reads from fast storage close to the consumer, which cuts latency and load on the origin. Choose the layer from where the repeated reads happen:

| Layer | Service | Caches |
| --- | --- | --- |
| Edge, close to users | Amazon CloudFront | Static and dynamic HTTP responses, with TTLs per cache behavior |
| API | API Gateway stage cache (REST APIs) | Responses of an API method |
| Application and database | Amazon ElastiCache (Valkey, Redis OSS, Memcached), node-based or serverless | Query results, computed objects, session data, leaderboards |
| DynamoDB | DynamoDB Accelerator (DAX) | Eventually consistent reads, in microseconds |

Two population strategies, usually combined with a TTL:

| | Lazy loading (cache-aside) | Write-through |
| --- | --- | --- |
| How | Read the cache; on a miss, read the database and write the result to the cache | Every database write also updates the cache |
| Pros | Only requested data is cached; a failed node only causes misses | Cached data is never stale |
| Cons | Miss penalty (three trips); data can be stale | Write penalty; caches data nobody reads; a new node starts empty |
| Add a TTL | Limits staleness | Limits churn of unused data |

ElastiCache choices: Valkey or Redis OSS for replication, Multi-AZ automatic failover, persistence, rich data types (sorted sets, pub/sub) and cluster mode to scale horizontally; Memcached for a simple multithreaded cache with no replication. ElastiCache Serverless removes node sizing.

> **Exam trap.** DAX is API-compatible with DynamoDB and needs only minimal code changes, but it serves eventually consistent reads; it doesn't help strongly consistent reads or write-heavy tables. ElastiCache in front of a relational database requires application code to read and populate the cache.

<!-- section: edge-accelerators | objectives: 2.1.7 -->
## Edge accelerators: CloudFront and Global Accelerator

| | Amazon CloudFront | AWS Global Accelerator | S3 Transfer Acceleration |
| --- | --- | --- | --- |
| What it is | Content delivery network that caches at edge locations | Two static anycast IP addresses that bring traffic onto the AWS network at the nearest edge | Faster uploads to one S3 bucket over long distances |
| Protocols | HTTP and HTTPS (including WebSocket) | TCP and UDP | HTTPS to S3 |
| Caching | Yes | No | No |
| Origins or endpoints | S3, ALB, EC2, any HTTP server | ALB, NLB, EC2 instances, Elastic IP addresses, in one or more Regions | An S3 bucket |
| Failover | Origin groups (primary and secondary) | Health checks move new connections to healthy endpoints or Regions | None |
| Typical stem | Static assets, video, global website, protect an S3 origin | Gaming, VoIP, IoT over UDP, clients that need fixed IPs, fast multi-Region failover | Users worldwide upload large files to a central bucket |

CloudFront details: an **origin access control** (OAC) lets only the distribution read a private S3 bucket; cache behaviors route paths to different origins with their own TTLs; CloudFront Functions (lightweight header and URL manipulation) and Lambda@Edge (heavier logic at regional edge caches) run code at the edge; AWS WAF and AWS Shield protect it.

> **Exam tip.** "Improve performance for a global TCP or UDP application" or "static IP addresses that clients can allow-list" means Global Accelerator. "Cache content close to users and reduce origin load" means CloudFront. Global Accelerator never caches.

<!-- section: read-replicas | objectives: 2.1.15, 2.1.18 -->
## When to use read replicas

A **read replica** is an asynchronously updated, read-only copy of a database. It scales **reads**, not writes.

| | RDS read replica | RDS Multi-AZ | Aurora Replica |
| --- | --- | --- | --- |
| Purpose | Read scaling, reporting, cross-Region DR | High availability | Read scaling and failover target |
| Replication | Asynchronous | Synchronous (DB instance) | Shared cluster storage, lag usually under 100 ms |
| Readable | Yes, own endpoint | Standby isn't readable (Multi-AZ DB instance) | Yes, through the reader endpoint |
| How many | Up to 15 per source | One standby | Up to 15 per cluster |
| Other Region | Yes | No | Aurora Global Database for other Regions |
| Failover | Manual promotion to a standalone instance | Automatic | Automatic promotion |

Use read replicas when:

- Reads dominate (catalogs, dashboards) and the primary's CPU or I/O is saturated by SELECT queries.
- Reporting or analytics queries must not slow down production.
- A copy must exist in another Region for local reads or disaster recovery (promote it if the source Region fails).

> **Exam trap.** A read replica doesn't fix write bottlenecks and doesn't provide automatic failover. The application must also send its reads to the replica (or Aurora reader) endpoint, which is a configuration or code change.

<!-- section: storage-types | objectives: 2.1.13, 2.1.22 -->
## Storage types: object, file and block

| | Object | File | Block |
| --- | --- | --- | --- |
| Service | Amazon S3 | Amazon EFS, Amazon FSx | Amazon EBS, instance store |
| Access | HTTPS API, whole objects by key | Shared file system (NFS, SMB) mounted by many clients | Raw volume attached to an instance, formatted by its OS |
| Scale | Virtually unlimited | EFS grows and shrinks automatically; FSx is provisioned | Fixed size per volume, resizable |
| Typical data | Static web content, backups, data lakes, media | Shared content, home directories, lift-and-shift file shares | Boot volumes, databases, low-latency transactional data |

Choosing inside file and block storage:

| Requirement | Service |
| --- | --- |
| Shared POSIX file system for Linux instances, containers or Lambda across AZs | Amazon EFS |
| Windows SMB shares with Active Directory integration | Amazon FSx for Windows File Server |
| High-performance computing or ML training, sub-millisecond, linked to S3 | Amazon FSx for Lustre |
| Multiprotocol (NFS, SMB, iSCSI), NetApp features such as snapshots and SnapMirror | Amazon FSx for NetApp ONTAP |
| Migrate ZFS file servers | Amazon FSx for OpenZFS |
| Persistent block storage for one instance | Amazon EBS (gp3 general purpose, io2 Block Express for the highest IOPS and durability, st1/sc1 HDD for throughput or cold data) |
| Temporary, very fast scratch space lost when the instance stops | Instance store |

> **Exam trap.** An EBS volume lives in one Availability Zone and attaches to instances in that AZ (Multi-Attach for io1/io2 only, same AZ). Instances in several AZs that must share files need EFS or FSx, not EBS.

<!-- section: containers | objectives: 2.1.8, 2.1.14, 2.1.20 -->
## Containers: when to use them and how to orchestrate them

Use containers when an application must run identically everywhere, be packaged with its dependencies, start in seconds, pack densely on shared hosts, or be split into microservices with independent deployments. They also suit long-running processes and workloads that exceed Lambda's limits.

Migrating an application into containers:

1. Make it stateless: move sessions to ElastiCache or DynamoDB, files to S3 or EFS, configuration and secrets to Parameter Store or Secrets Manager, logs to standard output (CloudWatch Logs).
2. Write a Dockerfile and build an image; store it in **Amazon ECR** (private registry with image scanning and replication).
3. Describe how to run it: an ECS task definition or a Kubernetes manifest (CPU, memory, ports, IAM role, environment).
4. Run it as a service behind an ALB, with health checks and auto scaling.

| | Amazon ECS | Amazon EKS |
| --- | --- | --- |
| Orchestrator | AWS-native, simple, deeply integrated with IAM, ALB, CloudWatch | Managed Kubernetes control plane, upstream Kubernetes APIs |
| Choose it when | No Kubernetes requirement, least operational overhead | The team already uses Kubernetes, needs its ecosystem (Helm, operators) or portability across clouds and on premises |
| Building blocks | Cluster, task definition, task, service | Cluster, pods, deployments, nodes |
| Compute options | AWS Fargate, Amazon EC2, ECS Managed Instances, ECS Anywhere (on-premises servers) | EKS Auto Mode (AWS manages the nodes), EC2 nodes, AWS Fargate, EKS Hybrid Nodes, EKS Anywhere |
| Scaling | Service Auto Scaling (tasks) and cluster auto scaling (instances) | Horizontal Pod Autoscaler, plus node scaling (Auto Mode or your own autoscaler) |

> **Exam tip.** "Run containers without managing servers or clusters of instances" means Fargate (with ECS or EKS). "Specific instance types or GPUs with AWS managing the hosts" points to ECS Managed Instances or EKS Auto Mode; "full control of the hosts" points to the EC2 capacity option.

<!-- section: serverless | objectives: 2.1.12, 2.1.21 -->
## Serverless technologies and patterns

Serverless means no servers to provision or patch, automatic scaling, built-in availability across AZs and pay-per-use. The main compute services are **AWS Lambda** (functions run per event) and **AWS Fargate** (containers without hosts); serverless building blocks around them include API Gateway, SQS, SNS, EventBridge, Step Functions, DynamoDB, S3 and Aurora Serverless v2.

Lambda limits that decide the answer:

| Quota | Value |
| --- | --- |
| Maximum timeout | 30 minutes on the current Lambda quotas page (older pages and the FAQ still say 15 minutes; 90 minutes for some Lambda Managed Instances invocations) |
| Memory | 128 MB to 10,240 MB (CPU scales with memory) |
| Ephemeral `/tmp` storage | 512 MB to 10,240 MB |
| Payload | 6 MB synchronous request and response, 1 MB asynchronous |
| Concurrency | 1,000 concurrent executions per Region by default (adjustable) |
| Package | 50 MB zipped upload, 250 MB unzipped with layers, 10 GB container image |

**Reserved concurrency** guarantees and caps a function's concurrency (it also protects a downstream database from too many connections); **provisioned concurrency** keeps environments initialized to remove cold-start latency.

Common serverless patterns: API Gateway + Lambda + DynamoDB for a web API; S3 event to Lambda for file processing; SQS to Lambda for buffered work; EventBridge Scheduler to Lambda instead of a cron server; Step Functions to chain functions.

| Requirement | Compute choice |
| --- | --- |
| Short, event-driven, unpredictable or idle much of the time | Lambda |
| Runs longer than the Lambda maximum timeout (for example several hours), or needs a long-lived process, as containers without managing hosts | Fargate |
| Interruption-tolerant containers at lower cost | Fargate Spot (two-minute interruption warning) |
| Needs a specific OS, licensed software on dedicated hosts, GPUs or full control | Amazon EC2 |

> **Exam trap.** A job that runs for several hours can't run in a single Lambda invocation. Split it with Step Functions, or run it on Fargate or AWS Batch.

<!-- section: purpose-built | objectives: 2.1.22, 2.1.23 -->
## Recommending purpose-built services

AWS favors a purpose-built service per access pattern over one general system:

| Requirement | Service |
| --- | --- |
| Relational, joins and transactions, MySQL or PostgreSQL compatible, high availability | Amazon Aurora or Amazon RDS |
| Key-value or document access at any scale with single-digit millisecond latency | Amazon DynamoDB |
| MongoDB-compatible document database | Amazon DocumentDB |
| Apache Cassandra-compatible wide-column | Amazon Keyspaces |
| Graph relationships (social networks, fraud rings, recommendations) | Amazon Neptune |
| Full-text search and log analytics | Amazon OpenSearch Service |
| Data warehouse and complex SQL analytics on large datasets | Amazon Redshift |
| In-memory cache or session store | Amazon ElastiCache |
| Batch jobs that need many instances for hours | AWS Batch |
| Static website with global users | S3 + CloudFront |
| Many VPCs and on-premises networks connected through a hub | AWS Transit Gateway |

Read the qualifier: "LEAST operational overhead" favors the managed or serverless option (Fargate over EC2, DynamoDB over a self-managed NoSQL cluster); "without changing the application code" favors a compatible service (Aurora for MySQL, DocumentDB for MongoDB, Amazon MQ for ActiveMQ, EFS for an NFS share).

<!-- section: key-points -->
## Key points

- Scale out stateless tiers with Auto Scaling groups across AZs; target tracking is the default policy, predictive for recurring patterns, scheduled for known dates; queue workers scale on backlog per instance.
- Cache at the right layer: CloudFront at the edge, API Gateway for API responses, ElastiCache for the application, DAX for DynamoDB eventually consistent reads.
- Lazy loading caches only what is read; write-through keeps the cache fresh; add a TTL to both.
- CloudFront caches HTTP; Global Accelerator gives static anycast IPs for TCP/UDP and fast failover.
- Read replicas scale reads (up to 15, asynchronous, cross-Region possible); Multi-AZ is for availability.
- Object (S3), file (EFS for Linux, FSx family for Windows, Lustre, ONTAP, OpenZFS), block (EBS in one AZ, instance store ephemeral).
- ECS for least overhead, EKS for Kubernetes; Fargate removes hosts; ECR stores images.
- Lambda for short event-driven code (minutes, not hours); Fargate for longer containers; EC2 for full control.
