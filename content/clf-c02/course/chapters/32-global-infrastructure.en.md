The AWS global infrastructure is built from Regions, the Availability Zones inside them, and edge locations spread across many more cities. The exam asks what each one is, how they relate, how to use several Availability Zones for high availability, and when a workload needs more than one Region.

<!-- section: building-blocks | objectives: 3.2.1, 3.2.5 -->
## Regions, Availability Zones and edge locations

| Component | What it is | Used for |
| --- | --- | --- |
| **Region** | A separate geographic area, designed to be isolated from the other Regions for the greatest fault tolerance and stability | Where you create most resources; chosen for compliance, latency, service availability and price |
| **Availability Zone (AZ)** | One or more discrete data centers with redundant power, networking and connectivity, in separate facilities; each Region has multiple AZs | Running copies of a workload in physically separate locations |
| **Edge location** | A site in a large city, far more numerous than Regions, part of the AWS global network | Amazon CloudFront caching, Amazon Route 53 DNS answers, AWS Global Accelerator entry points, AWS Shield and AWS WAF at the edge |
| **Local Zone** | An extension of a Region that places compute and storage closer to users in a metropolitan area | Low-latency applications for users in a city far from a Region |
| **AWS Outposts** | AWS infrastructure installed in your own data center | Low latency to on-premises systems, local data processing |

How they relate:

- A Region **contains** several AZs; the AZs of a Region are connected through low-latency, high-bandwidth, redundant networking over dedicated metro fiber.
- An AZ belongs to **exactly one** Region. A subnet, an EC2 instance and an EBS volume live in **one** AZ.
- Edge locations are **not** inside Regions: they are separate points of presence connected to the Regions by the AWS network.
- Resources are Regional by default and are **not automatically replicated** to other Regions: you choose to copy them. A few services are global (IAM, Route 53, CloudFront).

Four factors for choosing a Region:

| Factor | Question |
| --- | --- |
| Compliance and data sovereignty | Must the data stay in a country or jurisdiction? |
| Latency | Where are the users? |
| Service availability | Are the services and features needed offered in that Region? |
| Pricing | Prices differ from one Region to another |

> **Exam trap.** An Availability Zone is not a single data center and not a Region. "Separate geographic area" is a Region; "one or more discrete data centers with redundant power and networking" is an AZ; "caches content close to users" is an edge location.

<!-- section: high-availability | objectives: 3.2.2, 3.2.6, 3.2.7 -->
## High availability with multiple Availability Zones

**High availability** means a workload keeps running when a component fails. AZs are physically separate, with their own power, cooling and networking, so they **do not share single points of failure**: a fire, flood or power outage affects at most one AZ. AWS recommends deploying applications in multiple AZs so they remain available if one AZ fails.

| Layer | How to use several AZs |
| --- | --- |
| Web and application servers | EC2 instances in an Auto Scaling group spread across at least two AZs, behind an Elastic Load Balancing load balancer that sends traffic only to healthy targets |
| Relational database | Amazon RDS Multi-AZ: a standby in another AZ, automatic failover |
| Object storage | Amazon S3 stores data across at least three AZs (except One Zone classes) automatically |
| File storage | Amazon EFS Regional file systems store data across multiple AZs |
| Serverless | AWS Lambda, Amazon DynamoDB and Amazon SQS run across multiple AZs of the Region automatically |

> **Exam tip.** "Highly available" with "a single Region" means multiple Availability Zones. A second Region is only required when the stem talks about a Regional outage, users on another continent or data residency.

<!-- section: multiple-regions | objectives: 3.2.3, 3.2.8 -->
## When to use multiple Regions

| Reason | Example |
| --- | --- |
| **Disaster recovery** | Copies of data and infrastructure in a second Region, ready if the primary Region becomes unavailable |
| **Business continuity** | The business must keep operating during a Regional event |
| **Low latency for end users** | Users on several continents are served from the nearest Region |
| **Data sovereignty** | Customer data of one country must be stored in a Region in that country |

Disaster recovery strategies, from cheapest and slowest to most expensive and fastest:

| Strategy | Second Region holds |
| --- | --- |
| Backup and restore | Backups only; infrastructure is redeployed when needed |
| Pilot light | Replicated data and core infrastructure; servers started at failover |
| Warm standby | A scaled-down, running copy that can take traffic at once |
| Multi-site active/active | Full copies serving users in every Region |

Services that help: Amazon S3 Cross-Region Replication, DynamoDB global tables, Aurora Global Database, AWS Backup cross-Region copies, AWS Elastic Disaster Recovery, Route 53 failover routing.

> **Exam trap.** Multiple Regions add cost and complexity. Don't choose them for availability alone: multiple AZs in one Region already protect against the failure of a data center.

<!-- section: edge-benefits | objectives: 3.2.4 -->
## Benefits of edge locations

- **Lower latency**: content is served from a location close to the user instead of from the Region.
- **Less load on the origin**: Amazon CloudFront caches static and dynamic content at the edge.
- **Faster, more reliable paths**: AWS Global Accelerator and S3 Transfer Acceleration bring traffic onto the AWS global network at the nearest edge location.
- **Protection at the edge**: Shield and WAF filter attacks before they reach the application.
- **Fast DNS**: Route 53 answers queries from edge locations.

> **Exam tip.** "Deliver videos or a website to users worldwide with low latency" is CloudFront using edge locations, not a copy of the application in every Region.

<!-- section: key-points -->
## Key points

- Region: separate geographic area, isolated. AZ: one or more data centers, independent power and networking, multiple per Region. Edge location: cache and network entry point in many cities.
- AZs don't share single points of failure: spread instances, load balancers and databases across at least two AZs for high availability.
- Choose a Region for compliance, latency, service availability and price; data doesn't leave a Region unless you copy it.
- Multiple Regions: disaster recovery, business continuity, global low latency, data sovereignty.
- Edge locations: CloudFront, Route 53, Global Accelerator, Shield and WAF close to users.
