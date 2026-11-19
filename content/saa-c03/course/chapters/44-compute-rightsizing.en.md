Buying compute cheaply is half of the job; the other half is not buying too much of it. Exam questions show an over-sized or idle fleet, a workload profile or a traffic pattern, and ask for the instance family and size, the scaling method or the load balancer that delivers the required performance at the lowest cost.

<!-- section: instance-families | objectives: 4.2.7, 4.2.14 -->
## Instance families and naming

An instance type name reads as series, generation, options, then size: `c7gn.xlarge` is compute optimized (`c`), 7th generation, Graviton processor (`g`), network optimized (`n`), size `xlarge`.

| Family | Optimized for | Typical workloads |
| --- | --- | --- |
| M | General purpose, balanced vCPU and memory | Application servers, small and medium databases, mixed workloads |
| T | Burstable performance (baseline plus CPU credits) | Low average CPU with short spikes: small web servers, dev and test |
| C | Compute (high vCPU-to-memory ratio) | Batch processing, media transcoding, scientific modeling, ad serving, game servers |
| R, X, U, Z | Memory (R memory optimized, X memory intensive, U and Z high memory) | In-memory databases and caches, real-time big data analytics, SAP HANA |
| I, D, Im, Is | Storage (fast local NVMe or dense HDD instance store) | NoSQL databases, data warehousing, distributed file systems, high random I/O |
| P, G, Trn, F, VT | Accelerated computing (GPU, Trainium, FPGA, video transcoding) | ML training and inference, graphics rendering, video encoding |
| Hpc | High performance computing | Tightly coupled simulations at scale |

| Option letter | Meaning |
| --- | --- |
| `g` | AWS Graviton (Arm) processor |
| `a` | AMD processor |
| `i` | Intel processor |
| `d` | Local NVMe instance store volumes |
| `n` | Network and EBS optimized |
| `e` | Extra memory or extra instance storage |
| `z` | High CPU frequency |
| `flex` | Flex instance |

**Virtualization.** Current-generation instances run on the AWS Nitro System with hardware virtualization (HVM AMIs); `.metal` sizes give direct access to the physical server for workloads that need it (licensing, custom hypervisors, hardware features).

**Burstable T instances.** They earn CPU credits below their baseline and spend them above it. In standard mode the CPU is held at the baseline when credits run out; in unlimited mode the instance keeps bursting and surplus credits are billed. A T instance that runs above its baseline most of the time costs more than an M instance of the same size: move it to a fixed-performance family.

> **Exam tip.** Match the bottleneck named in the stem to the family letter: "CPU-bound" → C, "large in-memory dataset" → R or X, "high sequential or random local I/O" → I or D, "GPU" → P or G, "mostly idle with spikes" → T. Graviton (`g`) is the cost answer when the software runs on Arm.

<!-- section: instance-sizing | objectives: 4.2.15, 4.2.7 -->
## Choosing the instance size

Within a family each size roughly doubles vCPU, memory and price (`large` → `xlarge` → `2xlarge`), so moving down one size about halves the cost.

Right-sizing process:

1. Collect at least two weeks of metrics: CPU, network and disk from CloudWatch, and **memory**, which is an in-guest metric collected only by the **CloudWatch agent**.
2. Look at the peak, not the average, and size for the peak with headroom (or scale out for it).
3. Use **AWS Compute Optimizer**: after you opt in, it analyzes the last 14 days by default (93 days with the paid enhanced infrastructure metrics) and classifies instances as under-provisioned, over-provisioned or optimized, with recommended types. It also covers Auto Scaling groups, EBS volumes, Lambda functions, ECS services on Fargate, RDS and Aurora, and more.
4. Change family when the profile does not fit: memory at 90 % and CPU at 10 % on an M instance suggests an R instance of a smaller size.
5. Prefer the latest generation: it usually gives more performance for the same or a lower price.

| Observation | Action |
| --- | --- |
| CPU peaks at 15 %, memory at 30 %, steady | Smaller size in the same family, or a T instance |
| CPU constantly above 80 %, response time degrades | Larger size, or more instances behind a load balancer |
| Memory-bound, CPU low | Memory optimized family (R), possibly smaller |
| Load varies strongly during the day | Keep a smaller size and scale horizontally with an Auto Scaling group |
| Lambda function with high duration and low memory | Raise memory: CPU grows with memory (1,769 MB is about one vCPU), often lowering total cost |

> **Exam trap.** EC2 does not publish memory utilization by default. A right-sizing design that must consider memory needs the CloudWatch agent on the instances; Compute Optimizer then uses those metrics.

<!-- section: utilization | objectives: 4.2.8 -->
## Optimizing compute utilization

Idle capacity is the main source of compute waste. Three architectural levers reduce it:

| Lever | How it saves | Example |
| --- | --- | --- |
| Containers | Several services share one host; tasks are packed densely | ECS on EC2 with the `binpack` placement strategy and capacity providers, or Fargate so you pay only for task size |
| Serverless | No idle capacity at all; pay per request and duration | Lambda behind API Gateway for an API with long quiet periods |
| Microservices | Each component scales independently instead of scaling the whole monolith for one hot path | Separate image-resizing service on Spot, catalog service on Fargate |

Other techniques:

- **Decouple with queues** (SQS): workers scale on queue depth and can run on Spot; no capacity is kept for peaks.
- **Event-driven processing**: S3 event → Lambda instead of an instance polling for new files.
- **Batch windows**: run non-urgent processing in bulk with AWS Batch on Spot rather than on always-on servers.
- **Consolidate** low-utilization instances: several underused VMs can become containers on fewer hosts.

> **Exam trap.** "Instances run at 5 % CPU most of the day and process a file a few times per hour" is not a right-sizing question: the most cost-effective answer is usually to replace the instances with Lambda triggered by the event.

<!-- section: scaling | objectives: 4.2.9, 4.2.11 -->
## Scaling strategies: horizontal, vertical and hibernation

| Method | How | Pros | Cons |
| --- | --- | --- | --- |
| Vertical (scale up) | Change to a larger instance type | No application change; suits a single database or legacy monolith | Requires a stop and start (downtime); capped by the largest size; you pay for peak size all the time |
| Horizontal (scale out) | Add or remove instances, usually with an Auto Scaling group behind a load balancer | Follows demand, survives instance and AZ failures, can mix Spot | Application must be stateless (sessions in ElastiCache or DynamoDB) |

EC2 Auto Scaling policies:

| Policy | Use when |
| --- | --- |
| Target tracking | Keep a metric at a target (average CPU 50 %, requests per target); recommended default |
| Step scaling | Different adjustments for different alarm breach sizes |
| Simple scaling | One adjustment, then a cooldown before the next one |
| Scheduled scaling | Known patterns: scale out at 08:00, in at 20:00; scale non-production to zero at night |
| Predictive scaling | Recurring daily or weekly cycles: launches capacity ahead of the forecast load |

Scaling in removes paid capacity, so set a realistic minimum (two instances in two AZs for production, zero is possible for non-production).

**Long start-up times** push teams to over-provision. Two cost-friendly answers:

- **Warm pools**: pre-initialized instances kept next to the Auto Scaling group in the Stopped (cheapest: you pay only EBS volumes and Elastic IP addresses) or Hibernated state, moved into service when the group scales out. Running warm instances are discouraged because they bill like normal instances.
- **EC2 hibernation**: saves RAM to the EBS root volume and resumes processes and caches on start. No instance charge while hibernated; you pay for EBS storage, including the RAM contents. Prerequisites: enabled **at launch** (not on an existing instance), encrypted EBS root volume large enough for the RAM, RAM under 150 GiB for Linux (16 GiB or less for Windows), a supported family (for example M5, C5, R5, T3), no bare metal. For Spot, the request must be persistent.

```bash
aws ec2 run-instances --image-id ami-0abcdef1234567890 --instance-type m5.large \
  --hibernation-options Configured=true \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"Encrypted":true}}]'
aws ec2 stop-instances --instance-ids i-0123456789abcdef0 --hibernate
```

> **Exam trap.** "Keep the in-memory state and resume quickly, pay nothing for compute while paused" is hibernation, not stop (which loses RAM) and not a smaller instance. Hibernation cannot be turned on later: the instance must be relaunched with it enabled.

<!-- section: load-balancing | objectives: 4.2.10 -->
## Choosing a load balancing strategy

| | Application Load Balancer | Network Load Balancer | Gateway Load Balancer |
| --- | --- | --- | --- |
| Layer | 7 (HTTP, HTTPS, gRPC) | 4 (TCP, UDP, TLS) | 3 gateway plus 4 load balancing (IP packets) |
| Routing | Path, host, HTTP header, method, query string, source IP | Port and protocol | All traffic to a fleet of appliances, GENEVE on port 6081 |
| Targets | Instances, IP addresses, Lambda functions, ECS tasks | Instances, IP addresses, an Application Load Balancer | Instances, IP addresses (virtual appliances) |
| Static IP | No (DNS name) | Yes, one per AZ, Elastic IP possible | Reached through Gateway Load Balancer endpoints |
| Extras | User authentication (Cognito, OIDC), WebSockets, HTTP/2 | Extreme performance, very low latency, source IP preserved | Third-party firewalls, IDS/IPS, deep packet inspection inserted transparently |
| Typical exam use | Web apps and microservices | Gaming, IoT, financial feeds, partners who allow-list IPs | Centralized inspection appliances |

Cost considerations:

- Every load balancer is billed per hour plus capacity units. **One ALB with host-based and path-based rules** can front many applications or microservices instead of one ALB each.
- An ALB can invoke **Lambda targets**, so a lightly used HTTP API needs no running instances.
- When clients need fixed IP addresses for an HTTP application, place the **ALB behind an NLB** (ALB as NLB target) rather than running proxies on EC2.
- TLS termination on the ALB or NLB offloads encryption work from the targets, which can then be smaller.
- The Classic Load Balancer is legacy; do not choose it for new designs.

> **Exam trap.** Path-based routing (`/api/*` to one target group, `/images/*` to another) is an ALB feature only. A stem that needs it plus UDP cannot be solved by a single load balancer; a stem that needs static IPs plus path routing is NLB in front of ALB.

<!-- section: key-points -->
## Key points

- Family by bottleneck: C compute, R/X memory, I/D local storage, P/G accelerators, M balanced, T mostly idle with spikes; `g` = Graviton for better price performance.
- Each size step doubles resources and price; right-size on peaks, using Compute Optimizer and the CloudWatch agent for memory.
- Remove idle capacity with containers (bin packing, Fargate), serverless (Lambda) and independently scaled microservices.
- Horizontal scaling with target tracking, scheduled and predictive policies beats permanent vertical over-sizing; vertical scaling needs a stop.
- Warm pools (Stopped or Hibernated) and hibernation address long start-ups without paying for running instances.
- ALB for layer 7 routing and Lambda targets, NLB for TCP/UDP and static IPs, GWLB for inline appliances; consolidate apps behind one ALB.
