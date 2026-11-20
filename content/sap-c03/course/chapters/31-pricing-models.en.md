At professional level, pricing is an architecture decision made for a whole organization: which commitments the central finance team buys and how they flow to dozens of accounts, which runtime a workload uses (Graviton, Lambda, Step Functions Standard or Express, Fargate Spot), how capacity follows demand, and how an AI feature is billed per token. Questions give usage curves, interruption tolerance, deadlines and ownership constraints, and only the qualifier ("MOST cost-effective", "LEAST operational overhead", "without long-term commitment") separates two workable designs.

<!-- section: purchase-portfolio | objectives: 3.1.1 -->
## Building a purchase portfolio

Think in layers, from the most predictable usage to the least:

| Usage layer | Purchase option | Why |
| --- | --- | --- |
| Floor that runs 24/7 for at least a year | Savings Plans or Reserved Instances | Largest discount for a fixed hourly commitment |
| Daily or seasonal variation above the floor | On-Demand, with scaling | No commitment wasted when usage drops |
| Interruptible, retryable work | Spot Instances, Fargate Spot | Spare capacity at a deep discount |
| Capacity that must exist at a given time | On-Demand Capacity Reservations, zonal RIs, Capacity Blocks for ML | Guarantees capacity; a discount comes only from a separate commitment |
| Throughput reserved inside a managed service | Provisioned capacity (DynamoDB provisioned with reserved capacity, Bedrock Reserved tier or Provisioned Throughput) | Lower unit price or guaranteed throughput for steady demand |

Savings Plans types and their reach:

| Plan | Up to | Covers | Commitment flexibility |
| --- | --- | --- | --- |
| Compute Savings Plans | 66 % | EC2 in any family, size, OS, tenancy or Region; Fargate; Lambda | Highest |
| EC2 Instance Savings Plans | 72 % | One instance family in one Region, any size, OS or tenancy | Family and Region fixed |
| SageMaker AI Savings Plans | 64 % | SageMaker AI instance usage, any family, size, Region or component | Across SageMaker AI only |
| Database Savings Plans | 35 % | Latest provisioned generations and serverless usage of Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS, OpenSearch Service | 1-year term, any engine, family, size, AZ or Region |

How discounts are applied and shared:

- Within an organization, Reserved Instance discounts are applied first, then EC2 Instance Savings Plans, then Compute Savings Plans. The commitment is a dollar amount per hour; usage above it is billed On-Demand, and unused commitment is still billed.
- With consolidated billing, any account's RIs and Savings Plans can benefit the others; sharing can be turned off for an account (for example a business unit that must keep its own discounts for chargeback).
- Savings Plans terms cannot be changed after purchase. Standard RIs can be sold in the Reserved Instance Marketplace; Convertible RIs can be exchanged but not sold.
- Dedicated Instance fees ($2 per hour per Region) and Amazon EKS cluster fees are not discounted by Savings Plans; the EC2 worker nodes are.

Common professional pattern: a central cloud financial management team buys Compute Savings Plans in a dedicated account at the level of the organization-wide floor shown by Cost Explorer recommendations, and lets workload teams use any instance family, Region or Fargate. Teams that are certain to stay on one family in one Region add EC2 Instance Savings Plans.

> **Exam trap.** A Capacity Reservation reserves capacity at the On-Demand price; it is not a discount. When the stem needs both guaranteed capacity for a launch event and a lower price, combine an On-Demand Capacity Reservation with a Savings Plan or a regional RI. A zonal RI also gives both, but only for one instance type in one AZ.

<!-- section: spot-at-scale | objectives: 3.1.1 -->
## Spot capacity at scale

Spot is chosen for interruptible work: stateless web tiers above a base, queue workers, CI, rendering, big data, checkpointed batch. A professional design removes the single points that make Spot fail:

- **Diversify** across many instance types and all AZs. Attribute-based instance type selection (vCPU and memory ranges instead of a list) lets an Auto Scaling group or EC2 Fleet use new types automatically.
- Use the **`price-capacity-optimized`** allocation strategy, which picks the pools least likely to be interrupted among the cheapest ones.
- Turn on **Capacity Rebalancing** so the group launches a replacement when EC2 sends a rebalance recommendation, before the two-minute interruption notice.
- Keep state out of the instance (SQS, DynamoDB, S3) and make work idempotent so a retried message causes no harm.
- Run the On-Demand base of a mixed instances policy under Savings Plans and let Spot cover the rest.

| Workload statement | Purchase answer |
| --- | --- |
| Nightly analytics that can rerun, no deadline before morning | Spot, diversified, with checkpoints |
| Payment service that "must not be interrupted", steady load | Savings Plans covering the base, On-Demand for peaks |
| Training cluster needing many GPUs for two weeks next month | Capacity Blocks for ML |
| Disaster recovery capacity that must be available in the recovery Region | On-Demand Capacity Reservations in that Region |

<!-- section: workload-architecture-costs | objectives: 3.1.2 -->
## Cost-optimized runtime choices

**Graviton.** Graviton-based instances cost up to 20 % less than comparable x86 instances and use up to 60 % less energy for the same performance. Managed services such as Amazon RDS, Amazon Aurora and Amazon EKS run on Graviton, and Lambda and Fargate offer an Arm64 architecture. Migration work is the build, not the infrastructure: interpreted languages and Java usually move unchanged, compiled code and native libraries need an Arm build, and container images should be published as multi-architecture images in Amazon ECR so the same tag runs on both. Compute Optimizer can recommend Graviton types.

**AWS Lambda.** You pay for requests and for duration multiplied by the configured memory; memory also sets the CPU share, so more memory can finish sooner and cost the same or less. Nothing is billed while idle. Lambda durable functions run multi-step workflows for up to one year with checkpoints; during wait operations the function is suspended without compute charges, so a workflow that waits days for an event pays only for its processing time. AWS positions durable functions for workflows tightly coupled with application code, and Step Functions for orchestration across AWS services with visual design.

**AWS Step Functions.** The workflow type decides both behavior and bill:

| Attribute | Standard Workflows | Express Workflows |
| --- | --- | --- |
| Maximum duration | One year | Five minutes |
| Billing | Per state transition | Per execution, duration and memory |
| Execution semantics | Exactly-once | At-least-once (asynchronous), at-most-once (synchronous) |
| State transition rate | Quota applies | No limit |
| `.sync` job and `.waitForTaskToken` callback patterns | Supported | Not supported |
| Execution history | Kept by Step Functions for 90 days | Only in CloudWatch Logs, if logging is enabled |

| Requirement | Design |
| --- | --- |
| Millions of short event-processing executions per day | Express |
| Order approval waiting for a human for up to a week | Standard with a callback task token |
| Non-idempotent payment step that must never run twice | Standard |
| Long business process with a high-volume inner loop | Standard parent that starts Express child workflows for the inner loop |
| Wait days for an external event inside one function's code | Lambda durable functions |

> **Exam tip.** Polling in a loop (a Lambda function that checks a job every minute, or a Standard workflow with Wait and Choice states) pays for every check. A `.sync` integration or a callback token lets the workflow wait without paying for polling transitions.

> **Exam trap.** Express Workflows look cheaper for everything, but they cannot run longer than five minutes and do not support `.sync` or callback patterns. A stem with a long-running job, a human approval or an exactly-once requirement needs Standard.

<!-- section: rightsizing-scaling | objectives: 3.1.3 -->
## Rightsizing and scaling on metrics

**AWS Compute Optimizer** analyzes EC2 instances, Auto Scaling groups, EBS volumes, Lambda functions, ECS services on Fargate, commercial software licenses, Aurora and RDS, NAT gateways, DynamoDB, ElastiCache, MemoryDB, DocumentDB, WorkSpaces and SageMaker. It does nothing until you opt in; from the management account you can opt in the whole organization.

| Setting | Options | Default |
| --- | --- | --- |
| Lookback period | 14 days, 32 days (captures monthly patterns), 93 days (enhanced infrastructure metrics, paid) | 14 days |
| CPU threshold (EC2) | P90, P95, P99.5 | P99.5 |
| CPU headroom (EC2) | 30 %, 20 %, 0 % | 20 % |
| Memory headroom (EC2) | 30 %, 20 %, 10 % | 20 % |
| Preferred instances | A custom set of families (for example those covered by your RIs or Savings Plans) | All |

Preferences can be set at organization, account or Region level. Memory recommendations need memory metrics from the CloudWatch agent or from an external observability product. For non-production, the "maximum savings" preset (P90, 0 % CPU headroom, 10 % memory headroom) gives the most aggressive downsizing.

```bash
# From the management account: opt in every member account
aws compute-optimizer update-enrollment-status --status Active --include-member-accounts
```

**Scaling policies.** Rightsizing fixes the unit size; scaling fixes the unit count.

| Demand pattern | Policy |
| --- | --- |
| Load proportional to a metric (CPU, requests per target, queue backlog per task) | Target tracking |
| Known calendar (business hours, month-end close) | Scheduled scaling, including scaling to zero for non-production at night |
| Recurring daily or weekly cycle with slow-starting instances | Predictive scaling combined with target tracking |
| Large, sudden steps that need different reactions by size | Step scaling |

**Fargate Spot.** ECS tasks on Fargate Spot run at up to 70 % below the Fargate price. When AWS reclaims capacity, the task gets a two-minute warning, sent as an ECS task state change event to EventBridge and as SIGTERM to the containers; `stopTimeout` can be set up to 120 seconds (default 30). Fargate does not replace Spot capacity with regular Fargate capacity, so mix both in a capacity provider strategy: only one provider can have a `base`, and `weight` splits the rest.

```bash
aws ecs create-service --cluster reporting --service-name pdf-workers \
  --task-definition pdf-worker:12 --desired-count 12 \
  --capacity-provider-strategy capacityProvider=FARGATE,base=2,weight=1 capacityProvider=FARGATE_SPOT,weight=3 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0a1b2c3d4e5f60718],securityGroups=[sg-0123456789abcdef0]}"
```

> **Exam trap.** Compute Optimizer recommends; it does not resize anything. Applying a recommendation at scale needs automation (for example a Systems Manager Automation runbook or an infrastructure-as-code change), and Auto Scaling still has to handle load changes after the new size is chosen.

<!-- section: ai-ml-costs | objectives: 3.1.4 -->
## Cost of AI and ML workloads

**Amazon Bedrock service tiers** are chosen per request with the `service_tier` parameter (`reserved`, `priority`, `default`, `flex`); without it, Standard serves the request.

| Tier | Price | Use for |
| --- | --- | --- |
| Reserved | Fixed price per 1,000 tokens per minute, 1- or 3-month reservation (minimum 100,000 input and 10,000 output tokens per minute), arranged through the account team | Mission-critical traffic that needs guaranteed capacity; overflow goes to Standard |
| Priority | 75 % premium over Standard | Customer-facing calls that need the fastest responses without a reservation |
| Standard | On-demand price | Everyday generation and analysis |
| Flex | 50 % discount from Standard | Evaluations, summarization, agentic steps that tolerate longer processing |

Other levers:

- **Batch inference**: 50 % lower than on-demand for select models; input and output files in S3, job notifications through EventBridge. For offline work such as classifying a document archive overnight.
- **Prompt caching**: a long, repeated prefix (system prompt, tool definitions, an uploaded contract) is cached; cache reads are billed at a lower rate, cache writes can cost more than normal input. Default TTL 5 minutes, refreshed on every hit; some models offer 1 hour. It needs a minimum prefix size and only works on-demand, not in batch.
- **Intelligent Prompt Routing**: sends each prompt to the cheaper or stronger model of a family; up to 30 % lower cost.
- **Model choice**: the smallest model that meets the quality bar is the largest saving; measure with evaluations before committing.
- **Response caching in the application**: identical or normalized questions answered from DynamoDB or ElastiCache avoid the model call entirely, which prompt caching does not.
- **Provisioned Throughput**: hourly model units, no commitment or 1- or 6-month terms; required for some custom models, not supported through inference profiles. Imported custom models are billed per Custom Model Unit per minute in 5-minute windows and scale to zero after 5 minutes without calls.

**Amazon SageMaker AI inference** options:

| Option | Fit | Limits |
| --- | --- | --- |
| Real-time endpoint | Sustained, low-latency traffic; instance billed while running | Payload 25 MB, 60 s (8 minutes when streaming) |
| Serverless inference | Intermittent traffic, no idle cost | Payload 4 MB, 60 s |
| Asynchronous inference | Queued large or slow requests; can scale to zero | Payload 1 GB, up to one hour |
| Batch transform | Whole datasets offline, no persistent endpoint | Runs for hours or days |

Steady endpoint fleets are covered by SageMaker AI Savings Plans.

> **Exam tip.** Match the latency requirement before the price: "results needed tomorrow" points to Bedrock batch inference or the Flex tier, "chat users expect sub-second answers at peak" points to Priority or Reserved, and "intermittent internal tool" points to Standard or SageMaker AI Serverless inference.

<!-- section: key-points -->
## Key points

- Layer purchases: commitments for the 24/7 floor, On-Demand for variation, Spot for interruptible work, reservations only where capacity must be guaranteed.
- RIs apply first, then EC2 Instance Savings Plans, then Compute Savings Plans; discounts are shared across the organization unless sharing is turned off.
- Database Savings Plans: up to 35 %, 1 year, cover serverless and many engines; SageMaker AI Savings Plans: up to 64 %.
- Spot at scale: many types and AZs, `price-capacity-optimized`, Capacity Rebalancing, stateless and idempotent work.
- Graviton costs up to 20 % less than comparable x86; publish multi-architecture images.
- Step Functions: Standard for long, exactly-once, callback or `.sync` work; Express for high-volume executions of five minutes or less. Lambda durable functions do not bill compute while waiting.
- Compute Optimizer: opt in the organization, 14/32 days free, 93 days paid, memory needs the CloudWatch agent; it recommends, automation applies.
- Fargate Spot: up to 70 % off, two-minute warning, no automatic fallback; combine with Fargate in a capacity provider strategy.
- Bedrock: Flex 50 % off, Priority 75 % premium, Reserved for guaranteed capacity, batch 50 % off, prompt caching for repeated prefixes.
