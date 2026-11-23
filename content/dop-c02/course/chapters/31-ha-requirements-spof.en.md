High availability starts with a number that the business can defend: how long the workload may be down, how much data it may lose, and what each extra nine costs. DOP-C02 questions give that requirement in business terms ("customers in three countries", "regulator requires recovery in one hour", "no single point of failure") and expect the DevOps engineer to translate it into a design, to read the AWS service level agreements correctly, to find the component that still fails alone, and to configure Elastic Load Balancing so that traffic keeps flowing across Availability Zones. Multi-AZ and multi-Region data replication is in the next chapter; recovery procedures and backups are in the chapter on automated recovery.

<!-- section: business-to-technical | objectives: 3.1.5 -->
## Translating business requirements into resiliency targets

A resiliency requirement has four parts, and each one drives a different design decision:

| Business statement | Technical target | What it decides |
| --- | --- | --- |
| "The shop must be open 99.95 % of the month" | Availability target (allowed downtime) | Redundancy level: Multi-AZ, multi-Region, active/active |
| "We can't lose more than 5 minutes of orders" | Recovery point objective (RPO) | Data path: synchronous, asynchronous, backups and their frequency |
| "Back online within 1 hour after a disaster" | Recovery time objective (RTO) | How much is pre-deployed and how automated the failover is |
| "Must survive the loss of a data center" | Disruption scope (instance, AZ, Region, logical corruption) | Where the redundant copy lives |

Downtime budget for common targets (a month counted as 730 hours):

| Availability | Downtime per month | Downtime per year | Typical design |
| --- | --- | --- | --- |
| 99 % | About 7.3 hours | About 3.65 days | Single instance with automated replacement |
| 99.9 % | About 43.8 minutes | About 8.76 hours | Multi-AZ, automated failover |
| 99.95 % | About 21.9 minutes | About 4.38 hours | Multi-AZ, health-checked, no manual step |
| 99.99 % | About 4.4 minutes | About 52.6 minutes | Multi-AZ with static stability, fast detection, safe deployments |
| 99.999 % | About 26 seconds | About 5.3 minutes | Multi-Region active/active, fully automated |

Two consequences the exam relies on:

- **Above about 99.9 %, a human can't be in the loop.** Detecting, deciding and failing over manually takes longer than the monthly budget. The answer contains health checks, alarms and automatic actions.
- **Deployments count as downtime.** Most outages follow a change. A 99.99 % target requires rolling, canary or blue/green deployments with alarm-based rollback, not only redundant infrastructure.

**AWS Resilience Hub** formalizes the translation. A **resiliency policy** sets RTO and RPO targets per disruption type (customer application, cloud infrastructure, Availability Zone, and optionally Region) and a tier (for example mission critical or non critical). An **assessment** of the application (defined from CloudFormation stacks, Resource Groups, Terraform state files, myApplications or EKS clusters) estimates the achievable RTO and RPO, reports *policy met* or *policy breached*, and recommends changes, alarms, standard operating procedures and AWS Fault Injection Service experiments. Run assessments from the pipeline so that a change that breaks the policy is caught before production.

> **Exam trap.** RTO and RPO are not availability. A nightly backup can meet "RPO 24 hours" while the application is down for two days. When a stem gives both an availability target and RTO/RPO, check each one against the design.

<!-- section: slas | objectives: 3.1.2 -->
## AWS SLAs and composite availability

A service level agreement is a **commercial commitment**: if AWS misses the monthly uptime percentage, the customer can claim a **service credit** on future bills (through AWS Support, within the claim window the SLA sets). It isn't a design guarantee, and the conditions matter:

| Service | Commitment (credits start below) | Condition |
| --- | --- | --- |
| Amazon EC2, Region level | 99.99 % | Instances deployed across **two or more AZs** in the Region |
| Amazon EC2, instance level | 99.5 % per instance | Any single instance |
| Amazon RDS Multi-AZ DB instance or DB cluster | 99.95 % | Multi-AZ configuration |
| Amazon RDS Single-AZ instance | 99.5 % | Instance level |
| Amazon DynamoDB | 99.99 % standard tables, 99.999 % global tables | Per Region |
| AWS Lambda | 99.95 % | Per Region |
| Amazon S3 Standard | 99.9 % | S3 Standard-IA, One Zone-IA, Intelligent-Tiering: 99 % |
| Amazon Route 53 | Credits start below 100 % per hosted zone | Measured on DNS query answers |

**Your workload's availability is not the SLA of its best component.** Combine components:

- **In series** (every component is needed): multiply availabilities. The result is lower than the weakest component.
- **In parallel** (redundant, independent copies with automatic failover): availability = 1 − (1 − A)^n.

```text
Series:   load balancer 99.99 % x web tier 99.9 % x database 99.95 %
          0.9999 x 0.999 x 0.9995 = 0.9984  -> about 99.84 %

Parallel: two independent copies of a 99 % component with automatic failover
          1 - (1 - 0.99)^2 = 0.9999  -> 99.99 %

Hard dependency: a 99.99 % service that calls a 99.9 % dependency
          synchronously can't be more than 99.9 % available
```

The parallel formula assumes independent failures and instant failover. Copies in the same AZ share failure modes, and failover detection (health check interval × threshold, DNS TTL) consumes the downtime budget. Remove hard dependencies with asynchronous calls (queues), caches, and graceful degradation.

> **Exam trap.** The EC2 99.99 % Region-level commitment applies only to workloads running in at least two AZs. A design of one large instance "because EC2 has a 99.99 % SLA" falls under the 99.5 % instance-level commitment.

<!-- section: ha-techniques | objectives: 3.1.4 -->
## Techniques to achieve high availability

| Technique | How it works on AWS | Protects against |
| --- | --- | --- |
| Redundancy across AZs | Auto Scaling groups, ECS services and EKS node groups in subnets of at least two (preferably three) AZs; Multi-AZ databases | Instance, host and AZ failure |
| Health checks and automatic replacement | ELB target health, Auto Scaling `ELB` health check type, ECS service scheduler, Route 53 health checks | Failed instance or task |
| Automatic failover of stateful tiers | RDS Multi-AZ, Aurora replicas, ElastiCache Multi-AZ, Amazon EFS Regional | Primary database or node failure |
| Static stability | Capacity pre-provisioned so the remaining AZs carry the full load without launching anything | Control plane impairment, capacity shortage during an event |
| Multi-Region | Active/passive (pilot light, warm standby) or active/active, with Route 53, Global Accelerator or ARC to shift traffic | Regional impairment |
| Zonal shift | Amazon Application Recovery Controller (ARC) zonal shift moves load balancer, Auto Scaling group or EKS traffic away from one AZ (up to three days, extendable); zonal autoshift lets AWS start it | Gray failure in one AZ |
| Loose coupling | SQS, SNS, EventBridge between tiers, retries with backoff and jitter, idempotency | Slow or failed dependency |
| Safe deployments | Canary, linear or blue/green with CloudWatch alarm rollback | Bad change |
| Cell-based architecture | Independent copies of the stack, each serving a subset of customers | Blast radius of a bad change or poison request |

Static stability in numbers: a service that needs 6 instances at peak, spread over 3 AZs, runs 3 per AZ (9 instances), so that any 2 AZs still hold 6. With 2 AZs, it must run 6 per AZ (12 instances): three AZs are cheaper for the same resilience.

> **Exam tip.** "Highly available with the LEAST operational overhead" favors managed services that are Multi-AZ by design (DynamoDB, S3, Lambda, SQS, Aurora, EFS Regional) over self-managed clusters on EC2 that you must replicate and fail over yourself.

<!-- section: single-points-of-failure | objectives: 3.1.6 -->
## Identifying and remediating single points of failure

A single point of failure (SPOF) is any component whose loss stops the workload. Find them systematically:

| Tool | What it finds |
| --- | --- |
| AWS Resilience Hub assessment | Resources that can't meet the policy's RTO/RPO per disruption type (for example a Single-AZ database breaks the AZ target), with recommendations |
| AWS Config managed rules | Drift from HA standards, for example `autoscaling-multiple-az` (group spans one AZ) and `rds-multi-az-support` (RDS instance not Multi-AZ; not evaluated for Aurora); attach automatic remediation |
| AWS Trusted Advisor (fault tolerance category) | Account-wide checks on redundancy, backups and AZ balance |
| AWS Well-Architected Tool | Reliability pillar review with an improvement plan |
| AWS Fault Injection Service (FIS) | Proves the hypothesis: stop instances, fail an AZ, inject API errors or latency, with CloudWatch alarm stop conditions |

Typical findings and their fixes:

| Single point of failure | Remediation |
| --- | --- |
| One EC2 instance running the application or a scheduled job | Auto Scaling group across AZs behind a load balancer; for jobs, EventBridge Scheduler invoking Lambda or an ECS task |
| One NAT gateway used by private subnets of every AZ | One NAT gateway per AZ with per-AZ route tables (or a regional NAT gateway) |
| Single-AZ RDS instance | Modify to Multi-AZ (DB instance or DB cluster deployment), or Aurora with a replica in another AZ |
| Session state in instance memory with sticky sessions | Externalize sessions to ElastiCache or DynamoDB; stateless instances |
| Shared files on one EBS volume or one NFS server | Amazon EFS (Regional) or FSx Multi-AZ |
| Clients using an instance's IP address | Load balancer DNS name or Route 53 alias record |
| Instance type available in one AZ only, capacity errors | Several instance types (mixed instances policy or attribute-based selection) |
| One VPN tunnel or one Direct Connect connection | Both tunnels, a second connection, or VPN as backup |
| Recovery that depends on creating resources during the event | Pre-provisioned, scaled-down capacity (static stability) |
| Every instance updated at the same time | Rolling or canary deployment with alarm rollback |

> **Exam trap.** "Two instances behind a load balancer" is still a single point of failure when both are in one subnet, when the database behind them is Single-AZ, or when private subnets route through one NAT gateway. Check every tier, including networking and the deployment process.

<!-- section: cross-az-load-balancing | objectives: 3.1.8 -->
## Configuring load balancing across Availability Zones

Each enabled AZ of a load balancer has a load balancer node, and DNS returns the nodes' IP addresses (TTL of 60 seconds). **Cross-zone load balancing** decides whether a node sends traffic only to targets in its own AZ or to targets in every enabled AZ:

| Load balancer | Cross-zone default | Where to change it |
| --- | --- | --- |
| Application Load Balancer | Always on at the load balancer level | Can be turned off per target group |
| Network Load Balancer | Off | Load balancer attribute `load_balancing.cross_zone.enabled`; also per target group |
| Gateway Load Balancer | Off | Load balancer attribute |
| Classic Load Balancer | Off with the API or CLI, on with the console | Load balancer attribute |

Why it matters: with 2 targets in AZ a and 8 in AZ b, each node receives 50 % of clients. With cross-zone on, each target gets 10 %. With cross-zone off, each AZ a target gets 25 % and each AZ b target 6.25 %: the small AZ is overloaded. Keep target counts balanced across AZs (Auto Scaling groups rebalance automatically) or turn cross-zone on.

```bash
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:eu-west-1:111122223333:loadbalancer/net/orders-nlb/50dc6c495c0c9188 \
  --attributes Key=load_balancing.cross_zone.enabled,Value=true
```

Behaviors to configure for availability:

- **Fail open.** If a target group doesn't have enough healthy targets, the load balancer routes to all registered targets. **Target group health** settings define the thresholds: **DNS failover** (below the minimum healthy count or percentage in an AZ, that AZ's node IP addresses are removed from DNS) and **unhealthy state routing** (below the minimum, fail open).

```bash
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:eu-west-1:111122223333:targetgroup/web-tg/6d0ecf831eec9f09 \
  --attributes \
    "Key=target_group_health.dns_failover.minimum_healthy_targets.percentage,Value=50" \
    "Key=target_group_health.unhealthy_state_routing.minimum_healthy_targets.percentage,Value=50"
```

- **NLB zonal affinity.** `dns_record.client_routing_policy` keeps clients in their AZ: `availability_zone_affinity` (100 %), `partial_availability_zone_affinity` (85 %) or `any_availability_zone` (0 %).
- **Auto Scaling integration.** Register the group with the target group and set the health check type to `ELB`, so that targets failing the load balancer check are replaced.
- **Deregistration delay** (300 seconds by default) lets in-flight requests finish when a target leaves during scale-in or deployment.
- **Zonal shift.** Opt the load balancer in to ARC zonal shift; a shift removes the impaired AZ's node from DNS. Prescale the remaining AZs first unless the fleet is statically stable.
- **ALB requires at least two AZs**; enable every AZ that has targets, or targets in a non-enabled AZ get `Target.NotInUse`.

> **Exam trap.** An NLB in front of an Auto Scaling group whose instances are unevenly spread (for example after an AZ outage) overloads the AZ with fewer targets, because cross-zone load balancing is off by default on NLB. Turn it on, or keep the group balanced.

<!-- section: key-points -->
## Key points

- Translate business statements into an availability target, RPO, RTO and disruption scope; above 99.9 %, detection and failover must be automated, and deployments count against the budget.
- Resilience Hub resiliency policies (RTO/RPO per disruption type) and assessments, run from the pipeline, verify the design.
- SLAs are credit commitments: EC2 99.99 % only across two or more AZs (99.5 % per instance), RDS Multi-AZ 99.95 %, DynamoDB 99.99 % (global tables 99.999 %), Lambda 99.95 %, S3 Standard 99.9 %.
- Series availabilities multiply; parallel redundancy gives 1 − (1 − A)^n only with independent failures and automatic failover.
- Find SPOFs with Resilience Hub, Config rules (`autoscaling-multiple-az`, `rds-multi-az-support`), Trusted Advisor, the Well-Architected Tool and FIS experiments; check every tier including NAT, sessions, DNS and deployments.
- Cross-zone load balancing: always on for ALB (off per target group possible), off by default for NLB and GWLB; target group health thresholds control DNS failover and fail open; ELB health checks on Auto Scaling groups, deregistration delay, ARC zonal shift.
