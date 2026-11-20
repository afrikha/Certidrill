Cloud economics explains why the same workload usually costs less, and costs differently, on AWS than in a company's own data center. The exam asks you to recognize capital and operating expenses, fixed and variable costs, the hidden costs of on-premises environments, licensing models, rightsizing, the savings that automation brings and the effect of economies of scale.

<!-- section: economics-aspects | objectives: 1.4.1, 1.4.2 -->
## Aspects of cloud economics and cost savings

| Aspect | On premises | On AWS |
| --- | --- | --- |
| Type of expense | **Capital expenditure (CapEx)**: buy servers, storage and buildings upfront, then depreciate them over years | **Operating expenditure (OpEx)**: pay a monthly bill for what was used |
| Capacity | Sized for the expected peak, years in advance | Adjusted to the actual demand, in minutes |
| Pricing | Fixed whatever the usage | Pay-as-you-go, with discounts for commitments (Savings Plans, Reserved Instances) or for interruptible capacity (Spot Instances) |
| Undifferentiated work | Racking, cabling, powering, patching hardware | Done by AWS; managed services also remove database and operating system administration |

The **total cost of ownership (TCO)** compares everything a workload costs over its life: not only servers, but also facilities, power, staff, licenses and the cost of unused capacity. The cost savings of moving to the cloud come from:

- no upfront hardware purchase and no hardware refresh cycle;
- no capacity bought for a peak that rarely happens, and resources turned off when unused;
- less staff time spent on infrastructure, more on the business (managed services);
- lower unit prices from AWS's economies of scale, and regular AWS price reductions.

> **Exam trap.** The cloud doesn't make everything free of cost: you still pay for what runs. A question about "the MOST cost savings" points to an option that removes idle capacity or upfront spend, not to one that simply moves the same oversized servers to AWS.

<!-- section: fixed-variable-costs | objectives: 1.4.3 -->
## Fixed costs and variable costs

| Item | Fixed costs | Variable costs |
| --- | --- | --- |
| Definition | Paid whatever the usage, often in advance | Grow and shrink with the actual usage |
| Examples | Data center lease, purchased servers, annual maintenance contracts, a reserved commitment | EC2 instance hours, gigabytes stored in Amazon S3, requests to AWS Lambda, data transfer out |
| Risk | Paying for idle capacity, or running out of capacity | Costs that rise with usage, which must be monitored (AWS Budgets) |

Moving to AWS turns most fixed costs into variable costs: this is the advantage "trade fixed expense for variable expense". A company can still choose some fixed commitment, a Savings Plan for example, in exchange for a lower price on its steady baseline usage.

<!-- section: on-premises-costs | objectives: 1.4.4 -->
## Costs of on-premises environments

| Cost category | Examples |
| --- | --- |
| Hardware | Servers, storage arrays, network equipment, spare parts, replacement every few years |
| Facilities | Floor space or colocation fees, power, cooling, fire suppression, physical security |
| Software | Operating system, database, virtualization and backup licenses, support contracts |
| Staff | Administrators for hardware, virtualization, storage, networking and data center operations |
| Resilience | A second site for disaster recovery, often idle |
| Overprovisioning | Capacity bought for the peak and idle the rest of the time |

Some of these costs are **direct** and visible (servers, licenses); others are **indirect** and easy to forget in a comparison (power, cooling, staff time, the idle disaster recovery site). A fair TCO comparison includes both. Migration Evaluator (chapter 13) builds this comparison from real inventory and utilization data.

<!-- section: licensing | objectives: 1.4.5 -->
## Licensing strategies

| Model | How it works | Fits when |
| --- | --- | --- |
| **License included** | The software license is part of the AWS price, billed per hour or per second of use (for example, Windows Server on Amazon EC2, Amazon RDS for SQL Server) | The company has no licenses to reuse, or wants to pay only while the software runs |
| **Bring Your Own License (BYOL)** | The company uses licenses it already owns, if the vendor's license terms allow it; AWS bills only the infrastructure | The company already paid for licenses and wants to keep using them |

- Licenses counted **per physical socket or per core** usually need **Amazon EC2 Dedicated Hosts**: a whole physical server dedicated to you, with visibility of its sockets and cores.
- **AWS License Manager** tracks license usage against the rules you define (number of cores, of instances) and can prevent launches that would exceed them.
- **AWS Marketplace** sells third-party software with pay-as-you-go or annual pricing, billed on the AWS bill.

> **Exam trap.** BYOL lowers cost only when the company already owns eligible licenses. "Reuse existing per-core server licenses" points to Dedicated Hosts, not to Dedicated Instances (which isolate the hardware but don't expose sockets and cores) and not to a Savings Plan (a pricing commitment, not a licensing model).

<!-- section: rightsizing | objectives: 1.4.6 -->
## Rightsizing

**Rightsizing** is matching the type and size of each resource to the actual workload, at the lowest cost that still meets performance needs. On premises, servers are bought large "just in case"; on AWS, an oversized instance is a cost you can change in minutes.

| Step | Tool or action |
| --- | --- |
| Measure CPU, memory, network and storage utilization over time | Amazon CloudWatch metrics |
| Get recommendations based on that utilization | **AWS Compute Optimizer** (EC2 instances, Auto Scaling groups, EBS volumes, Lambda functions and more); cost checks of **AWS Trusted Advisor** (for example, low-utilization EC2 instances) |
| Act | Change to a smaller size or a better-fitting instance family; stop or delete idle resources; turn off development environments outside working hours |
| Then commit | Buy Savings Plans or Reserved Instances only for the rightsized baseline |

> **Exam tip.** Rightsize **before** you buy a commitment: a Savings Plan bought for oversized instances locks in waste for one or three years.

<!-- section: automation | objectives: 1.4.7 -->
## Benefits of automation

| Automation | Benefit |
| --- | --- |
| **Infrastructure as code** (AWS CloudFormation) | The same environment created in minutes, again and again, without manual errors; easy to delete when no longer needed |
| **AWS Auto Scaling**, Amazon EC2 Auto Scaling | Capacity follows demand automatically: no paying for idle instances at night, no shortage during peaks |
| Scheduled start and stop, AWS Systems Manager automation | Routine operations (patching, restarts, instance schedules) run without staff time |
| Backup policies (AWS Backup) | Consistent protection without manual tasks |

Automation reduces labor cost and human error, speeds up deployments and makes environments consistent and repeatable.

<!-- section: economies-of-scale | objectives: 1.4.8 -->
## Economies of scale

AWS buys hardware, power and network capacity for hundreds of thousands of customers and runs data centers at a scale no single company reaches. Its cost per unit is lower, and AWS passes part of that saving to customers as **lower pay-as-you-go prices**; AWS has lowered its prices many times since launch. A single company running its own data center pays the full cost of each server, each kilowatt and each administrator.

> **Exam trap.** Economies of scale explain **why AWS prices are low**. They don't describe a discount you negotiate or a commitment you buy: Savings Plans, Reserved Instances and volume tiers are pricing options (chapter 41).

<!-- section: key-points -->
## Key points

- On premises: CapEx, fixed costs, capacity for the peak. AWS: OpEx, variable costs, capacity for the actual demand.
- TCO includes indirect costs: power, cooling, space, staff, idle disaster recovery site.
- License included: pay per use. BYOL: reuse your licenses; per-socket or per-core licenses need Dedicated Hosts; AWS License Manager tracks them.
- Rightsizing: measure, follow Compute Optimizer recommendations, then commit.
- Automation: fewer errors, less labor, capacity that follows demand.
- Economies of scale: lower unit prices for every customer.
