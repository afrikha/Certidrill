AWS charges mainly for compute, storage and data transfer out. The exam gives a workload (steady, short, interruptible, licensed per socket, needing guaranteed capacity) and asks for the cheapest purchasing option, or a storage need and asks for the right class, or a traffic path and asks whether it is charged.

<!-- section: purchasing-options | objectives: 4.1.1 -->
## Compute purchasing options

| Option | How you pay | Discount compared to On-Demand |
| --- | --- | --- |
| **On-Demand Instances** | Per second (or per hour), no commitment, no upfront payment | None: the reference price |
| **Savings Plans** | Commitment to an amount of usage in USD per hour, for 1 or 3 years | Up to 72 % (EC2 Instance Savings Plans), up to 66 % (Compute Savings Plans) |
| **Reserved Instances (RIs)** | Commitment to an instance configuration (type, platform, tenancy, Region or Availability Zone) for 1 or 3 years | Up to 72 % |
| **Spot Instances** | Spare EC2 capacity at the current Spot price; AWS can interrupt the instance with a **two-minute warning** | Up to 90 % |
| **Dedicated Hosts** | A whole physical server reserved for you; On-Demand or reserved | Not a discount: an isolation and licensing option |
| **Dedicated Instances** | Instances on hardware dedicated to your account; you don't manage the host | Not a discount: an isolation option |
| **On-Demand Capacity Reservations** | Capacity reserved in one Availability Zone, any duration, billed at the On-Demand rate whether you use it or not | None on its own; combine with Savings Plans or regional RIs for the discount |

Savings Plans and RIs share the same payment options: **All Upfront**, **Partial Upfront** and **No Upfront**. Longer term and more paid upfront give the larger discount.

| Savings Plan | Applies to | Flexibility |
| --- | --- | --- |
| **Compute Savings Plans** | Amazon EC2, AWS Fargate, AWS Lambda | Any instance family, size, Region, operating system or tenancy |
| **EC2 Instance Savings Plans** | Amazon EC2 | One instance family in one Region; any size, operating system, tenancy |

<!-- section: when-to-use | objectives: 4.1.3 -->
## When to use each option

| Workload | Best option |
| --- | --- |
| Short, unpredictable or new workload; testing; cannot be interrupted | On-Demand |
| Steady usage for 1 or 3 years, may change instance family, Region or move to Fargate or Lambda | Compute Savings Plans |
| Steady usage of one instance family in one Region, largest discount | EC2 Instance Savings Plans or Standard RIs |
| Batch jobs, image rendering, CI builds, big data: fault-tolerant and flexible in time | Spot Instances |
| Existing server-bound software licenses (per socket, per core, per VM), or compliance requiring control of instance placement on a physical server | Dedicated Hosts |
| Compliance requiring single-tenant hardware, without managing hosts | Dedicated Instances |
| Guaranteed capacity in one Availability Zone for a short critical event or for disaster recovery, without a 1-year or 3-year commitment | On-Demand Capacity Reservations |

> **Exam trap.** Spot is the cheapest only when the stem accepts interruptions. "The job cannot be interrupted" rules Spot out; "BYOL per socket" points to Dedicated Hosts, not Dedicated Instances.

<!-- section: ri-flexibility | objectives: 4.1.4 -->
## Reserved Instance flexibility

| Attribute | Standard RI | Convertible RI |
| --- | --- | --- |
| Discount | Larger | Smaller |
| Exchange for another instance family, operating system or tenancy | No | Yes, for a Convertible RI of equal or greater value |
| Modify Availability Zone, scope or size within the family | Yes | Yes |
| Sell on the Reserved Instance Marketplace | Yes | No |

| Scope | Capacity reserved | Discount applies to |
| --- | --- | --- |
| **Regional RI** | No | Any Availability Zone of the Region, and any **size** of the same family (Linux/Unix, default tenancy): instance size flexibility |
| **Zonal RI** | Yes, in that Availability Zone | The exact instance type in that Availability Zone only |

Instance size flexibility uses a normalization factor: one regional RI for an `m5.xlarge` (factor 8) can cover two `m5.large` instances (factor 4 each).

<!-- section: ri-organizations | objectives: 4.1.5 -->
## Reserved Instances in AWS Organizations

With consolidated billing, the organization's accounts are treated as one account for discounts:

- An RI or Savings Plan discount applies **first to the account that bought it**. Unused discount then applies to matching usage in **any other account** of the organization.
- The management account can **turn off discount sharing** for chosen accounts; those accounts then neither give nor receive shared RI and Savings Plans discounts.
- The **capacity reservation** of a zonal RI stays with the purchasing account; only the billing discount is shared.

> **Exam tip.** "Buy RIs in one account and let the other accounts benefit" is consolidated billing in AWS Organizations, with no extra cost and no configuration beyond keeping sharing on.

<!-- section: data-transfer | objectives: 4.1.6 -->
## Data transfer costs

| Traffic | Charge |
| --- | --- |
| Inbound from the internet to AWS | Free |
| Outbound from AWS to the internet | Per GB, with lower rates at higher volume; the first 100 GB per month are free |
| Within one Availability Zone, using private IP addresses | Free |
| Between Availability Zones of the same Region | Charged per GB, in each direction |
| Between Regions | Charged per GB, by the source Region |
| From an AWS origin (S3, EC2) to Amazon CloudFront | Free |
| From EC2 to Amazon S3 in the same Region | Free |

> **Exam trap.** Data **in** is free and data **out** is charged. Serving users from CloudFront usually lowers the cost of data out compared to serving them directly from S3 or EC2.

<!-- section: storage-pricing | objectives: 4.1.2, 4.1.7 -->
## Storage options, tiers and their pricing

| Service | What you pay for |
| --- | --- |
| **Amazon S3** | GB stored per month (depends on the storage class), requests, data retrieval for some classes, data transfer out, optional features (replication, analytics) |
| **Amazon EBS** | GB **provisioned** per month, whether used or not; extra IOPS and throughput for some volume types; snapshots per GB stored (incremental, kept in S3) |
| **EC2 instance store** | Included in the instance price; data is lost when the instance stops or terminates |
| **Amazon EFS** | GB actually stored per month (no provisioning), lower price in the Infrequent Access and Archive classes |

| S3 storage class | Access pattern | Minimum storage duration | Retrieval |
| --- | --- | --- | --- |
| S3 Standard | Frequent | None | Milliseconds, no retrieval fee |
| S3 Intelligent-Tiering | Unknown or changing; moves objects automatically, monitoring fee per object | None | Milliseconds (automatic tiers), no retrieval fee |
| S3 Standard-IA | Infrequent, needs fast access | 30 days | Milliseconds, per-GB fee |
| S3 One Zone-IA | Infrequent, re-creatable data, one Availability Zone | 30 days | Milliseconds, per-GB fee |
| S3 Glacier Instant Retrieval | Archive read about once a quarter | 90 days | Milliseconds, per-GB fee |
| S3 Glacier Flexible Retrieval | Archive, read once or twice a year | 90 days | Minutes to hours |
| S3 Glacier Deep Archive | Long-term archive (years), lowest price | 180 days | Within 12 hours (Standard) |

The colder the class, the lower the storage price and the higher the cost and delay of each read. **S3 Lifecycle** rules move objects to cheaper classes or delete them on a schedule.

> **Exam trap.** EBS bills the **provisioned** size: an empty 500 GB volume costs the same as a full one. EFS and S3 bill only what you store.

<!-- section: key-points -->
## Key points

- On-Demand: no commitment. Savings Plans and RIs: 1 or 3 years, up to 72 %. Spot: up to 90 %, interruptible. Dedicated Hosts: licenses per socket or core. Dedicated Instances: single-tenant hardware. Capacity Reservations: capacity without a term.
- Compute Savings Plans cover EC2, Fargate and Lambda in any Region; EC2 Instance Savings Plans cover one family in one Region.
- Convertible RIs can be exchanged; Standard RIs can be sold on the RI Marketplace. Regional RIs give size and AZ flexibility; zonal RIs reserve capacity.
- In an organization, discounts are shared across accounts by default; sharing can be turned off.
- Data in: free. Data out to the internet, between AZs and between Regions: charged.
- S3: the colder the class, the cheaper the storage and the costlier the read. EBS: provisioned GB. EFS and S3: stored GB.
