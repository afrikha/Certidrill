The same EC2 capacity can cost very different amounts depending on how it is bought and where it runs. Exam questions describe a workload (steady, spiky, interruptible, licensed, at the edge, on premises) and ask for the purchasing option, compute service, location or cost tool that meets the requirement most cost-effectively.

<!-- section: purchasing-options | objectives: 4.2.4 -->
## EC2 purchasing options

| Option | How you pay | Choose it when |
| --- | --- | --- |
| On-Demand | Per second, no commitment | Short, unpredictable or first-time workloads; the baseline before you know the usage |
| Savings Plans | Commitment in USD per hour for 1 or 3 years | Steady usage, with flexibility to change instance family, Region or service |
| Reserved Instances | Commitment to an instance configuration for 1 or 3 years | Steady usage of a known instance type; zonal RIs also reserve capacity |
| Spot Instances | Current Spot price, up to 90 % below On-Demand, can be interrupted | Fault-tolerant, flexible jobs: batch, CI, big data, stateless web tiers |
| Dedicated Hosts | A whole physical server | Bring-your-own licenses per socket, per core or per VM; host-level visibility |
| Dedicated Instances | Instances on single-tenant hardware | Compliance requiring hardware isolation, without host management |
| Capacity Reservations | On-Demand price for reserved capacity in one AZ, used or not | Guaranteed capacity for a critical event or DR, any duration |
| Capacity Blocks | Reserved cluster of GPU instances for a future period | Short ML training runs that need many GPUs at once |

Payment options for Savings Plans and Reserved Instances are All Upfront, Partial Upfront and No Upfront: the more you pay upfront and the longer the term, the larger the discount.

> **Exam trap.** Savings Plans and regional Reserved Instances give a discount, not capacity. "Guarantee capacity in a specific AZ" requires a zonal Reserved Instance or an On-Demand Capacity Reservation; a Capacity Reservation can be combined with a Savings Plan to get both.

<!-- section: savings-plans-reserved | objectives: 4.2.4 -->
## Savings Plans and Reserved Instances

| Plan | Maximum discount | Applies to | Flexibility |
| --- | --- | --- | --- |
| Compute Savings Plans | Up to 66 % | EC2, Fargate, Lambda | Any family, size, Region, OS, tenancy |
| EC2 Instance Savings Plans | Up to 72 % | EC2 | One family in one Region; any size, OS, tenancy |
| SageMaker AI Savings Plans | Up to 64 % | SageMaker AI | Any family, size, Region, component |
| Database Savings Plans | Up to 35 % | Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS, OpenSearch Service | Any engine, family, size, AZ, Region, serverless usage; 1 year, No Upfront |

Reserved Instances:

| Attribute | Standard RI | Convertible RI |
| --- | --- | --- |
| Discount | Larger | Smaller |
| Exchange for another family, OS or tenancy | No | Yes |
| Modify (AZ, scope, size within family) | Yes | Yes |
| Sell in the Reserved Instance Marketplace | Yes | No |

| Scope | Capacity reserved | AZ flexibility | Size flexibility |
| --- | --- | --- | --- |
| Regional RI | No | Any AZ in the Region | Within the family (Linux/Unix, default tenancy) |
| Zonal RI | Yes, in that AZ | No | No |

Decision rules:

- Workload will move from EC2 to Fargate or Lambda, or between Regions: **Compute Savings Plans**.
- Stays on one instance family in one Region, maximum discount: **EC2 Instance Savings Plans** (or Standard RIs).
- Instance type may change during the term but you want an RI: **Convertible RI**.
- Commitment may no longer be needed before the end of the term: **Standard RI** (resellable) or a 1-year term.
- Discounts are shared across all accounts of an organization's consolidated billing family by default; sharing can be turned off per account.

> **Exam tip.** Commit only to the steady baseline (the minimum usage seen in Cost Explorer), cover peaks with On-Demand or Spot. Over-committing wastes money because unused commitment is still billed.

<!-- section: spot-strategies | objectives: 4.2.4 -->
## Using Spot Instances safely

- EC2 gives a **two-minute interruption notice**, and earlier an **EC2 instance rebalance recommendation** when the risk rises. The interruption behavior can be terminate, stop or hibernate.
- No bidding: you pay the current Spot price, which changes gradually with supply and demand.
- Diversify: request several instance types and sizes across several AZs. In Auto Scaling groups and EC2 Fleet, use the **`price-capacity-optimized`** allocation strategy (recommended); `lowest-price` has the highest interruption risk.
- A **mixed instances policy** in an Auto Scaling group keeps an On-Demand base capacity (covered by Savings Plans) and fills the rest with Spot.
- **Fargate Spot** runs interruption-tolerant ECS tasks at up to 70 % below the Fargate price.

| Workload | Spot? |
| --- | --- |
| Image rendering queue, checkpointed batch jobs, CI build agents | Yes |
| Stateless web tier behind a load balancer, with an On-Demand base | Yes, for the part above the base |
| Single primary database, long transaction without checkpoints | No |
| Job that must finish by a fixed deadline with no retry window | No |

> **Exam trap.** Spot is the cheapest answer only if the stem accepts interruptions ("can be restarted", "stateless", "flexible timing"). If it says "cannot be interrupted", choose On-Demand with Savings Plans or Reserved Instances.

<!-- section: compute-services | objectives: 4.2.12 -->
## Choosing a cost-effective compute service

| Service | Billing | Best fit | Limits to remember |
| --- | --- | --- | --- |
| AWS Lambda | Requests plus GB-seconds of duration; nothing when idle | Event-driven, spiky or low-volume work; glue code | Maximum timeout of 30 minutes on the current Lambda quotas page (older pages and the FAQ still say 15 minutes; 90 minutes for some Lambda Managed Instances invocations), 128 MB–10,240 MB memory |
| AWS Fargate (ECS, EKS) | vCPU and memory per second (1-minute minimum) | Containers without managing servers, variable load | You pay for task size even if underused; Fargate Spot for interruptible tasks |
| Amazon EC2 | Per instance-second, with all purchasing options | Steady, high utilization; special hardware (GPU, local NVMe); OS control; licensing | You manage patching and capacity |
| ECS or EKS on EC2 | EC2 instances that host the containers | Large, steady container fleets packed densely | Pay for idle capacity in the cluster |

Rules of thumb:

- Idle most of the time or invoked a few times per hour: **Lambda** (no cost when idle). A job running for hours cannot be Lambda: use Fargate, AWS Batch or EC2.
- Containers with unpredictable load and no wish to manage hosts: **Fargate**. A steady fleet at high utilization costs less on EC2 with Savings Plans or Spot.
- Arm-based **Graviton** instances, Fargate and Lambda on Arm usually offer better price performance for code that runs on Arm.
- **AWS Batch** schedules batch jobs on EC2 (including Spot) or Fargate with no extra charge for Batch itself.
- Compute Savings Plans cover all three services, so a migration from EC2 to Lambda or Fargate keeps the discount.

> **Exam trap.** "LEAST operational overhead" favors Lambda or Fargate over EC2 even when EC2 is slightly cheaper; "MOST cost-effective" for a steady 24/7 workload usually favors EC2 with a commitment.

<!-- section: workload-availability | objectives: 4.2.3, 4.2.13 -->
## Availability by workload class and global infrastructure

Pay for availability only where the business needs it:

| Aspect | Production | Non-production (dev, test, training) |
| --- | --- | --- |
| Availability Zones | At least two, Auto Scaling group across AZs, Multi-AZ databases | Often one AZ, single instance, Single-AZ database |
| Purchasing | Savings Plans or RIs for the baseline, On-Demand or Spot for peaks | Spot or On-Demand, no long-term commitment |
| Schedule | Always on | Stopped outside working hours (Instance Scheduler on AWS starts and stops tagged EC2 and RDS instances; up to 70 % saving for business-hours-only use) |
| Size | Sized for peak with scaling | Smallest size that works, burstable T instances |

Global infrastructure affects cost:

- **Prices differ between Regions.** When no latency, data residency or service-availability requirement applies, a cheaper Region lowers cost.
- **Data transfer** between AZs and between Regions is billed; traffic within one AZ over private IP addresses is not. Chatty components of a non-critical system can share an AZ.
- Data transfer into AWS from the internet is free; data transfer out to the internet is billed.
- An RDS instance can be stopped for up to 7 days (then it restarts automatically); instance hours stop, storage is still billed.

> **Exam tip.** Multi-AZ, multi-Region and always-on settings in a development environment are a classic "reduce cost" answer target: the wrong options keep production-grade availability where the stem says it is not required.

<!-- section: edge-hybrid | objectives: 4.2.5, 4.2.6 -->
## Edge and hybrid compute

| Requirement | Service |
| --- | --- |
| Lightweight request or response manipulation at CloudFront edge locations (headers, redirects, URL rewrites, JWT validation) | CloudFront Functions (JavaScript, sub-millisecond, millions of requests per second, lowest cost) |
| Edge logic needing network access, request body, third-party libraries or more time and memory | Lambda@Edge (Node.js, Python; runs for seconds, up to 10,240 MB of memory on origin events) |
| Low latency to users in a metropolitan area without a nearby Region | AWS Local Zones (extension of a parent Region, different prices) |
| Ultra-low latency to mobile devices on a 5G carrier network | AWS Wavelength Zones (carrier gateway) |
| AWS services on premises for low latency to local systems, local data processing or data residency | AWS Outposts (racks or servers, connected to the parent Region through a service link) |
| Run ECS or EKS on your own servers | Amazon ECS Anywhere, Amazon EKS Anywhere |

- Edge processing cuts cost by answering requests near the user (less origin load and less data transfer from the origin) and by reducing the amount of data sent back to the Region.
- Outposts is ordered with a term commitment and payment option; AWS delivers, maintains and patches it. It is not the answer when the only goal is to reduce cost: it is chosen for latency, local processing or residency.

> **Exam trap.** CloudFront Functions cannot call the network or read the request body. If the edge code must call an external API or a DynamoDB table, choose Lambda@Edge.

<!-- section: cost-tools | objectives: 4.2.1, 4.2.2 -->
## Cost management features and tools for compute

**Features**

- **Cost allocation tags**: AWS-generated tags (prefix `aws:`, for example `aws:createdBy`) and user-defined tags must each be **activated** in the Billing and Cost Management console by the management account (or a standalone account) before they appear in Cost Explorer and reports. Activation takes up to 24 hours; a backfill can apply the activation to up to 12 previous months.
- **Consolidated billing** (AWS Organizations): one bill for all member accounts, aggregated volume pricing tiers, and shared RI and Savings Plans discounts, at no additional cost.

**Tools**

| Need | Tool |
| --- | --- |
| Explore and graph spend by service, account, tag; forecast; RI and Savings Plans recommendations, utilization and coverage; rightsizing recommendations | AWS Cost Explorer (up to 13 months of history, 18-month forecast) |
| Alert when actual or forecasted cost, usage, RI or Savings Plans utilization or coverage crosses a threshold; optionally act | AWS Budgets (email or SNS; budget actions apply an IAM policy or SCP, or stop EC2 or RDS instances) |
| Most detailed line items (hourly, per resource, per tag) for analysis in Athena, Redshift or Amazon Quick | AWS Cost and Usage Report, delivered to S3 through AWS Data Exports |
| Detect unusual spend automatically with machine learning | AWS Cost Anomaly Detection |
| Right-size instances, Auto Scaling groups, Lambda functions and Fargate services | AWS Compute Optimizer |

```bash
aws ce get-cost-and-usage --time-period Start=2026-10-01,End=2026-11-01 \
  --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=TAG,Key=CostCenter
```

> **Exam trap.** AWS Budgets alerts and can apply controls, but it does not show the detailed history. "Notify the finance team when the forecast exceeds the budget" is Budgets; "analyze per-resource hourly costs with SQL" is the Cost and Usage Report with Athena.

<!-- section: key-points -->
## Key points

- Steady baseline: Savings Plans (Compute for flexibility, EC2 Instance for the highest discount) or Reserved Instances; peaks: On-Demand or Spot.
- Discount is not capacity: zonal RIs and Capacity Reservations reserve capacity; Savings Plans and regional RIs do not.
- Spot: up to 90 % off, two-minute notice, diversify, `price-capacity-optimized`, only for interruption-tolerant work.
- Lambda for idle or spiky work that lasts minutes, not hours, Fargate for containers without hosts, EC2 with commitments for steady high utilization.
- Non-production: one AZ, schedules, Spot, small sizes. Regions differ in price; cross-AZ and cross-Region transfer is billed.
- Edge: CloudFront Functions for light logic, Lambda@Edge for network or body access; Local Zones, Wavelength and Outposts for latency and on-premises needs.
- Activate cost allocation tags; use Cost Explorer to analyze, Budgets to alert, the Cost and Usage Report for detail, Cost Anomaly Detection for surprises.
