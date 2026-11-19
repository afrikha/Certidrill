AWS offers compute at several levels of management: virtual servers you control (Amazon EC2), containers that AWS orchestrates, and serverless functions where you manage only code. The exam asks you to match a workload to an EC2 instance family, a container option or a serverless option, and to know what auto scaling and load balancers add.

<!-- section: compute-services | objectives: 3.3.1 -->
## AWS compute services

| Service | What it is | Choose it when |
| --- | --- | --- |
| **Amazon EC2** | Virtual servers (instances) with full control of the operating system | You need a specific OS, software or configuration; lift-and-shift of servers |
| **Amazon Lightsail** | Simple virtual private servers with bundled resources and a predictable monthly price | Simple websites, blogs, small applications, users new to the cloud |
| **AWS Elastic Beanstalk** | Upload code; AWS provisions EC2, load balancing and scaling | Deploy a web application without managing the infrastructure |
| **AWS Batch** | Runs batch computing jobs on managed compute, queued and scheduled | Thousands of jobs, simulations, rendering |
| **AWS Lambda** | Runs code in response to events, no servers to manage | Short event-driven tasks |
| **Amazon ECS, Amazon EKS, AWS Fargate** | Container orchestration and serverless compute for containers | Containerized applications |
| **AWS Outposts** | AWS compute and storage in your data center | Workloads that must run on premises |

<!-- section: ec2-instance-types | objectives: 3.3.2 -->
## Choosing an EC2 instance type

An instance type sets the CPU, memory, storage and network capacity. Types are grouped by what they are optimized for:

| Category | Families (examples) | Appropriate use |
| --- | --- | --- |
| **General purpose** | M, T, Mac | Balance of compute, memory and network: web servers, code repositories, small and medium databases, development and test |
| **Compute optimized** | C | CPU-bound work: batch processing, media transcoding, high-performance web servers, scientific modeling, dedicated game servers |
| **Memory optimized** | R, X, U | Large data sets in memory: in-memory databases and caches, real-time big data analytics |
| **Storage optimized** | I, D, H | High, sequential read and write access to very large data sets on local storage: NoSQL databases, data warehousing, distributed file systems |
| **Accelerated computing** | P, G, Inf, Trn, F | Hardware accelerators (GPUs, AWS Inferentia, AWS Trainium, FPGAs): machine learning, graphics, video |
| **High-performance computing (HPC)** | Hpc | Large, tightly coupled simulations at scale |

Name format: in `c7g.xlarge`, `c` is the family, `7` the generation, `g` an option (AWS Graviton processor) and `xlarge` the size. T instances are **burstable**: they provide a baseline CPU and can burst above it, cost-effective for workloads that are idle most of the time.

> **Exam trap.** "Storage optimized" is about fast local disk access to huge data sets, not about storing a lot of files cheaply (that is Amazon S3). "Memory optimized" is for in-memory processing, not for "more storage".

<!-- section: containers | objectives: 3.3.3 -->
## Container options

| Service | Role | Choose it when |
| --- | --- | --- |
| **Amazon Elastic Container Service (Amazon ECS)** | AWS's fully managed container orchestration service | Run containers on AWS with the simplest AWS-native tooling |
| **Amazon Elastic Kubernetes Service (Amazon EKS)** | Managed Kubernetes control plane | The company already uses Kubernetes, or wants its open-source ecosystem and portability |
| **Amazon Elastic Container Registry (Amazon ECR)** | Managed registry that stores container images | Store and share Docker or OCI images privately |
| **AWS Fargate** | Serverless compute engine for ECS and EKS: no EC2 instances to manage | Containers without servers or clusters of instances to patch and scale |

ECS and EKS run containers either on EC2 instances that you manage (full control, specific instance types, GPUs) or on Fargate (AWS manages the servers).

> **Exam tip.** "Kubernetes" in the stem points to EKS. "Run containers without managing servers" points to Fargate. ECR stores images; it doesn't run them.

<!-- section: serverless | objectives: 3.3.4 -->
## Serverless compute

**Serverless** means no servers to provision or patch, automatic scaling, built-in high availability, and pay-for-use pricing.

| | AWS Lambda | AWS Fargate |
| --- | --- | --- |
| Unit | A function (your code) | A container (task or pod) |
| Triggered by | Events: S3 uploads, API Gateway requests, SQS messages, schedules, DynamoDB streams | ECS or EKS, which start and keep tasks running |
| Duration | Up to 15 minutes per invocation | Long-running services or jobs |
| Billing | Per request and per millisecond of duration, by memory allocated | For the vCPU and memory that the tasks request, while they run |
| Typical use | Resize an image after upload, process a message, back end of an API | Web services and APIs packaged as containers |

Lambda memory ranges from 128 MB to 10,240 MB; CPU is allocated in proportion to memory.

> **Exam trap.** A job that runs for an hour can't be a single Lambda invocation (15-minute limit): choose Fargate, AWS Batch or EC2.

<!-- section: auto-scaling | objectives: 3.3.5 -->
## Auto scaling provides elasticity

**Elasticity** is the ability to acquire resources when you need them and release them when you don't, so capacity follows demand and you pay only for what runs.

**Amazon EC2 Auto Scaling** maintains an **Auto Scaling group** of instances:

| Setting | Meaning |
| --- | --- |
| Minimum capacity | Never fewer instances than this |
| Desired capacity | The number that should run now |
| Maximum capacity | Never more than this, to cap cost |

- **Scale out** (add instances) when demand rises, **scale in** (remove) when it falls, according to scaling policies: target tracking (for example, keep average CPU at 50 %), scheduled scaling (known peaks), predictive scaling.
- Health checks replace unhealthy instances automatically, which also improves availability.
- Containers, DynamoDB tables and Aurora replicas can scale too; Lambda and Fargate scale with no configuration of servers.

> **Exam trap.** Scaling **out** adds instances (horizontal); scaling **up** moves to a larger instance (vertical). Auto Scaling groups scale out and in; elasticity in the exam means following demand automatically.

<!-- section: load-balancers | objectives: 3.3.6 -->
## Purposes of load balancers

**Elastic Load Balancing** distributes incoming traffic across multiple targets (EC2 instances, containers, IP addresses, Lambda functions) in one or more Availability Zones.

Purposes:

- **Spread the load** so no single server is overwhelmed.
- **Health checks**: send traffic only to healthy targets.
- **High availability**: targets in several AZs; if one AZ fails, traffic goes to the others.
- **Single entry point**: one DNS name for clients while targets are added and removed by Auto Scaling.
- **TLS termination** with certificates from AWS Certificate Manager.

| Type | Layer | Use |
| --- | --- | --- |
| **Application Load Balancer** | 7 (HTTP, HTTPS) | Web applications and microservices; routing by URL path or host name |
| **Network Load Balancer** | 4 (TCP, UDP, TLS) | Very high performance, static IP addresses |
| **Gateway Load Balancer** | 3 (IP packets) | Third-party virtual appliances such as firewalls inserted transparently |

> **Exam tip.** Load balancer plus Auto Scaling group across two AZs is the standard answer to "scalable and highly available web tier".

<!-- section: key-points -->
## Key points

- EC2 for full control, Lightsail for simple fixed-price servers, Elastic Beanstalk to deploy code, Batch for batch jobs.
- Instance families: general purpose (M, T), compute (C), memory (R, X), storage (I, D), accelerated (P, G, Inf, Trn), HPC.
- ECS (AWS orchestration), EKS (Kubernetes), ECR (images), Fargate (serverless containers).
- Lambda: event-driven functions, 15-minute maximum, billed per request and millisecond.
- Auto Scaling groups (minimum, desired, maximum) give elasticity; load balancers spread traffic to healthy targets across AZs.
