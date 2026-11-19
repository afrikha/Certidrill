Compute questions describe a workload (a web tier with daily peaks, a nightly batch, a containerized API, an HPC simulation, an event-driven function) and ask for the compute service, the instance family, the scaling policy or the size that meets the performance requirement with the stated qualifier. The pattern is always the same: match the execution model first, then decouple and scale on the right metric, then size the resource.

<!-- section: compute-services | objectives: 3.2.1 -->
## AWS compute services and their use cases

| Requirement | Service |
| --- | --- |
| Full control of OS, licensing, GPUs, long-running servers | Amazon EC2 (with EC2 Auto Scaling) |
| Short event-driven code, no servers, scale to zero, at most 15 minutes per invocation | AWS Lambda |
| Containers without managing servers or clusters of instances | AWS Fargate (with Amazon ECS or Amazon EKS) |
| Containers with AWS-native orchestration | Amazon ECS |
| Kubernetes, portability, Kubernetes tooling | Amazon EKS |
| Thousands of batch jobs queued, scheduled and run on managed compute (EC2, Spot, Fargate) | AWS Batch |
| Big data frameworks (Apache Spark, Hadoop, Hive, Presto) on clusters | Amazon EMR (on EC2, on EKS or EMR Serverless) |
| Deploy a web application by uploading code; AWS provisions EC2, load balancer and scaling | AWS Elastic Beanstalk |
| Run AWS compute in your own data center | AWS Outposts; ECS Anywhere or EKS Anywhere for containers on your own servers |

- **AWS Batch** is for jobs that run to completion: it manages job queues, priorities and compute environments, and picks instances (including Spot) for you. It isn't for request-driven APIs.
- **Amazon EMR** is the answer when the stem names a big data framework; AWS Glue is the serverless ETL answer covered elsewhere.
- **Fargate** removes instance management: you choose task CPU and memory (from 0.25 vCPU / 512 MiB to 32 vCPU / 244 GB for Linux), and pay for what tasks request.

> **Exam trap.** A job that runs for 40 minutes can't be a single Lambda invocation (900-second limit). Pick Fargate, AWS Batch or EC2, or split the work with AWS Step Functions.

<!-- section: distributed-computing | objectives: 3.2.2 -->
## Distributed computing with global infrastructure and edge services

| Location | What runs there | Use |
| --- | --- | --- |
| Region, several Availability Zones | All services | Spread an Auto Scaling group across AZs for availability and capacity |
| Local Zone | EC2, EBS and some other services close to a large city | Single-digit millisecond latency to users in that metro area (media rendering, gaming, real-time apps) |
| Wavelength Zone | EC2 inside a telecom provider's 5G network | Ultra-low latency to mobile devices |
| AWS Outposts | AWS infrastructure on premises | Low latency to on-premises systems, local data processing |
| CloudFront edge location | Caching, CloudFront Functions, Lambda@Edge | Deliver and compute at the edge, closest to viewers |
| AWS Global Accelerator | Anycast static IPs, traffic carried on the AWS backbone | Improve TCP/UDP performance to Regional endpoints worldwide |

Placement groups control how instances are placed in an AZ:

| Strategy | Placement | Use |
| --- | --- | --- |
| Cluster | Close together in one AZ, high bandwidth and low latency | HPC, tightly coupled workloads with most traffic between instances |
| Partition | Groups of instances on separate racks, up to 7 partitions per AZ | Large distributed and replicated workloads: HDFS, HBase, Cassandra |
| Spread | Each instance on distinct hardware, up to 7 running instances per AZ per group | A small number of critical instances that must not fail together |

For tightly coupled HPC, combine a cluster placement group with instances that support **Elastic Fabric Adapter (EFA)**; enhanced networking (ENA) gives high bandwidth on current instance types.

> **Exam tip.** "Lowest latency between nodes" is a cluster placement group; "survive the failure of a rack" with many instances is partition; "a few critical instances isolated from each other" is spread.

<!-- section: serverless | objectives: 3.2.5 -->
## Serverless technologies and patterns

**AWS Lambda** key figures: memory 128 MB to 10,240 MB in 1 MB steps, CPU allocated in proportion to memory (one vCPU equivalent at 1,769 MB), timeout up to 900 seconds, `/tmp` storage 512 MB to 10,240 MB, 1,000 concurrent executions per Region by default (can be raised), and each function can scale by 1,000 execution environments every 10 seconds.

| Need | Lambda feature |
| --- | --- |
| Guarantee capacity for one function and cap it | Reserved concurrency (no extra charge) |
| Remove cold starts for latency-sensitive functions | Provisioned concurrency on a version or alias (billed while configured), scaled with Application Auto Scaling |
| Protect a database from too many connections | Reserved concurrency as a cap, plus RDS Proxy |
| Long or multi-step processes | AWS Step Functions orchestrating functions |

Common serverless patterns: API Gateway plus Lambda for APIs; S3 event, SQS, SNS or EventBridge triggering Lambda; Kinesis or DynamoDB Streams processed by Lambda in batches; Fargate when the code is a container, runs longer, or needs more than Lambda's memory.

> **Exam trap.** Reserved concurrency doesn't make functions faster: it reserves and limits. Cold-start latency is solved by provisioned concurrency.

<!-- section: containers | objectives: 3.2.6 -->
## Container orchestration

| Choice | ECS | EKS |
| --- | --- | --- |
| Orchestrator | AWS-native, simpler | Kubernetes (upstream compatible) |
| Data plane | EC2 instances (capacity providers) or Fargate | Managed node groups, self-managed nodes, Fargate, or EKS Auto Mode |
| Scaling of tasks or pods | ECS Service Auto Scaling (target tracking on CPU, memory or ALB requests per target) | Horizontal Pod Autoscaler |
| Scaling of nodes | Capacity provider with an Auto Scaling group (managed scaling) | Cluster Autoscaler or Karpenter; EKS Auto Mode manages nodes with Karpenter |
| On premises | ECS Anywhere | EKS Anywhere |

Pick **ECS on Fargate** for the least operational overhead with containers; **EKS** when the company already uses Kubernetes or needs its ecosystem; the **EC2 launch type** when you need GPUs, specific instance types or Reserved capacity under your control.

> **Exam tip.** "Migrate existing Kubernetes manifests with minimal changes" points to EKS, not ECS. "No servers or clusters to manage" points to Fargate.

<!-- section: decoupling | objectives: 3.2.3, 3.2.7 -->
## Queues, messaging and decoupling for independent scaling

A synchronous chain scales only as well as its slowest component. Put a buffer between producers and consumers so each tier scales on its own:

| Service | Model | Decide on |
| --- | --- | --- |
| Amazon SQS standard | Queue, one consumer per message, at-least-once, best-effort ordering, nearly unlimited throughput | Buffer work for a worker fleet |
| Amazon SQS FIFO | Ordered within a message group, exactly-once processing, limited throughput (high throughput mode raises it) | Order matters (payments, sequential updates) |
| Amazon SNS | Publish/subscribe, push to many subscribers (SQS, Lambda, HTTP, email) | Fan-out of one event to several systems |
| Amazon EventBridge | Event bus with content-based rules, SaaS and AWS sources | Route events by content to targets |
| Amazon Kinesis Data Streams | Ordered stream per shard, several consumers replay data | Real-time streaming, multiple readers of the same records |

SQS settings that the exam tests: **visibility timeout** (default 30 seconds, maximum 12 hours; set it longer than the processing time or messages are processed twice), **long polling** (wait up to 20 seconds, fewer empty responses), **dead-letter queue** after a maximum number of receives, message retention 4 days by default and up to 14 days, maximum message size 1 MiB.

**SNS to several SQS queues** (fan-out) lets each consumer service scale and fail independently.

> **Exam trap.** If orders are lost when the processing tier is overloaded, the fix is an SQS queue between the tiers, not a bigger instance: the queue absorbs the peak and the workers scale on its depth.

<!-- section: auto-scaling | objectives: 3.2.4 -->
## Scaling capabilities: EC2 Auto Scaling and AWS Auto Scaling

**Amazon EC2 Auto Scaling** keeps a group of instances between a minimum and a maximum, from a **launch template**, across several AZs, replacing unhealthy instances (EC2 or ELB health checks).

| Policy | Behavior | Use |
| --- | --- | --- |
| Target tracking | Keeps a metric at a target value, creates and manages the CloudWatch alarms | Recommended default |
| Step scaling | Adds or removes capacity by steps depending on the size of the alarm breach | Custom reactions to large breaches |
| Simple scaling | One adjustment, then a cooldown | Legacy |
| Scheduled scaling | Changes capacity at set times | Known calendar events |
| Predictive scaling | Forecasts load from up to 14 days of history (at least 24 hours) and launches capacity ahead; doesn't scale in | Recurring daily or weekly patterns, long initialization |

- With several policies, the group scales out if any policy requires it and the highest desired capacity wins.
- **Instance warmup** keeps a new instance out of the group metrics until it is ready; **warm pools** keep pre-initialized instances (stopped, hibernated or running) for applications with very long boot times.
- **Application Auto Scaling** scales other resources: ECS services, DynamoDB capacity, Aurora replicas, Lambda provisioned concurrency, Spot Fleet and others.
- **AWS Auto Scaling scaling plans** configure scaling for several of these resources at once; for predictive scaling alone, AWS recommends predictive scaling policies set directly on the resources.

> **Exam tip.** Traffic that rises every weekday at 8 a.m. and the instances need 10 minutes to boot: predictive scaling (with pre-launch) or scheduled scaling, plus target tracking for the unexpected.

<!-- section: scaling-metrics | objectives: 3.2.8 -->
## Choosing the metrics and conditions for scaling

Choose a metric that changes in inverse proportion to capacity: double the instances, the metric halves.

| Workload | Metric to scale on |
| --- | --- |
| CPU-bound web or application tier | `ASGAverageCPUUtilization` |
| Web tier behind an Application Load Balancer | `ALBRequestCountPerTarget` |
| Network-bound tier (streaming, proxies) | `ASGAverageNetworkIn` or `ASGAverageNetworkOut` |
| Workers reading an SQS queue | Backlog per instance: `ApproximateNumberOfMessagesVisible` divided by the number of instances, target = acceptable latency divided by the time per message |
| Memory-bound application | Custom CloudWatch metric published by the CloudWatch agent (memory isn't an EC2 default metric) |
| ECS service | Average CPU or memory utilization of the service, or ALB requests per target |

Conditions to set correctly: minimum capacity for the baseline and the AZ count, maximum capacity as a cost guard, warmup equal to boot plus initialization time, and scale-in protection for instances doing long work.

> **Exam trap.** Scaling workers on the queue's raw message count doesn't track per-instance load; AWS recommends the backlog-per-instance metric with target tracking.

<!-- section: instance-selection | objectives: 3.2.9 -->
## Selecting EC2 instance types and features

| Family | Optimized for | Examples of use |
| --- | --- | --- |
| M, T (burstable) | General purpose, balanced CPU and memory; T builds CPU credits for low average usage | Web servers, small databases, dev/test |
| C | Compute | Batch processing, media transcoding, high-performance web servers, scientific modeling, gaming |
| R, X, U, z | Memory | In-memory databases and caches, real-time big data analytics, SAP HANA |
| P, G, Trn, Inf, F | Accelerated computing (GPU, Trainium, Inferentia, FPGA) | ML training and inference, graphics, video |
| I, D, H | Storage, high local disk I/O and density | NoSQL databases, data warehousing, distributed file systems |
| Hpc | High performance computing | Tightly coupled simulations |

Name format: `c7gn.xlarge` = family `c`, generation `7`, options `g` (AWS Graviton) and `n` (network and EBS optimized), size `xlarge`. Other options: `a` AMD, `i` Intel, `d` local NVMe instance store, `e` extra memory or storage, `flex` Flex instance.

- **Graviton** (Arm) instances give better price performance when the software runs on Arm.
- A **T** instance whose CPU stays high exhausts its credits (standard mode) or pays for surplus credits (unlimited mode): move to M or C.

> **Exam tip.** Match the bottleneck in the stem to the letter: CPU to C, memory to R, local I/O to I, GPU to P or G, inter-node latency to Hpc or a cluster placement group.

<!-- section: right-sizing | objectives: 3.2.10 -->
## Selecting resource type and size

- **Lambda memory** is the only performance knob: more memory also gives more CPU, so a CPU-bound function often runs faster and costs no more at a higher setting. Measure with CloudWatch duration and memory metrics, AWS Lambda Power Tuning or AWS Compute Optimizer recommendations.
- **AWS Compute Optimizer** analyzes utilization and recommends sizes for EC2 instances, Auto Scaling groups, EBS volumes, Lambda functions and ECS services on Fargate.
- **Fargate**: size task CPU and memory from the container's measured use; scale out with more tasks rather than one huge task.
- **EC2**: scale out (more instances) for stateless tiers; scale up (bigger instance) when the software can't be distributed, such as a single database writer.

```bash
# Give a CPU-bound function more memory, which also gives it more CPU
aws lambda update-function-configuration \
  --function-name image-resize \
  --memory-size 3008
```

> **Exam trap.** There is no separate CPU setting for Lambda. "The function is CPU-bound and slow" is answered by increasing its memory.

<!-- section: key-points -->
## Key points

- Lambda for short events (15-minute limit), Fargate for serverless containers, ECS or EKS for orchestration, Batch for queued jobs, EMR for Spark and Hadoop.
- Local Zones and Wavelength bring compute closer to users; placement groups: cluster for latency, partition for racks, spread for a few critical instances.
- Decouple with SQS (buffer), SNS (fan-out), EventBridge (routing), Kinesis (streams) so each tier scales on its own.
- Target tracking by default; predictive or scheduled for known patterns; warm pools for slow boots; Application Auto Scaling for non-EC2 resources.
- Scale on a metric that drops when capacity grows: CPU, requests per target, backlog per instance.
- Pick the instance family from the bottleneck; size Lambda by memory; use Compute Optimizer.
