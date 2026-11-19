SAA-C03 is a design exam. Almost every question describes a company, its current architecture and its requirements, then asks which AWS solution meets them. You never type a command or follow a console path: you pick the service, feature, storage class, instance family, purchasing option or topology that satisfies every stated requirement. This chapter covers the format, a method for reading scenario questions, the principles that decide between two valid designs and the service pairs the exam expects you to tell apart.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | AWS Certified Solutions Architect – Associate |
| Exam guide | Version 1.1, October 29, 2026 |
| Duration | 130 minutes |
| Questions | 65: 50 scored and 15 unscored, which are not identified |
| Score | Scaled from 100 to 1,000; 720 passes |
| Scoring model | Compensatory: only the total score counts, there is no passing mark per domain |
| Wrong or blank answers | A blank answer counts as wrong and there is no penalty for guessing: always answer |
| Target candidate | About one year of hands-on experience designing solutions on AWS |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Design Secure Architectures | 30 % |
| Design Resilient Architectures | 26 % |
| Design High-Performing Architectures | 24 % |
| Design Cost-Optimized Architectures | 20 % |

There are only two question types. **Multiple choice** has one correct answer among four options (about 80 % of the questions). **Multiple response** ends with "Choose two." or "Choose three." and has two correct answers among five options, or three among six; it earns the point only if every selected answer is correct. There is no case study, no Yes/No series, no drop-down list, no drag and drop and no lab.

> **Exam tip.** Since you can't tell which 15 questions are unscored, treat every question as if it counts. Certidrill mock exams score all 65 questions.

<!-- section: reading-questions -->
## Reading a scenario question

A stem has two to five sentences: a company ("A media company", "AnyCompany"), what it runs today, what it needs, then a deciding qualifier and the question "Which solution will meet these requirements?". The four options are complete designs, and usually two or three of them would work. The qualifier chooses between them. Work in this order:

1. Read the last two sentences first: the qualifier and what you must choose.
2. List every requirement, including those hidden in the context ("the application can't be modified", "the data must stay private").
3. Eliminate each option that fails one requirement, even a minor one.
4. Apply the qualifier to the options that remain.

| Words in the stem | What they select |
| --- | --- |
| "LEAST operational overhead" | A managed or serverless service, or a built-in feature, rather than EC2 instances, scripts or custom code |
| "MOST cost-effective" | The cheapest option that still meets every functional requirement: storage class, purchasing option, right size |
| "highest availability" | Several Availability Zones; a second Region only if the stem mentions a Regional outage |
| "without changing the application code" | A service in front of or under the application: a proxy, a load balancer, a managed engine of the same type |
| "MOST secure" | Private connectivity, IAM roles instead of keys, encryption with a customer managed key, least privilege |
| "minimal downtime" | Replication and cutover (managed migration, blue/green, Multi-AZ) rather than backup and restore |
| "least latency" for global users | Edge services: Amazon CloudFront for HTTP content, AWS Global Accelerator for TCP or UDP |
| "unpredictable" or "unknown access pattern" | On-demand or auto-scaling capacity, S3 Intelligent-Tiering, serverless |
| "decouple", "absorb spikes" | A queue (Amazon SQS) or an event bus between the components |
| RPO and RTO in minutes or hours | The disaster recovery strategy: backup and restore, pilot light, warm standby or multi-site active/active |

> **Exam trap.** "MOST cost-effective" never overrides a functional requirement. If the workload needs millisecond retrieval, S3 Glacier Deep Archive is wrong however cheap it is; it is the planted distractor.

<!-- section: design-principles -->
## Design principles the exam rewards

The exam is built on the AWS Well-Architected Framework. Its six pillars explain most trade-offs between two working designs:

| Pillar | Question it asks | Typical answer |
| --- | --- | --- |
| Operational excellence | Can it be deployed, observed and changed without manual steps? | Infrastructure as code (AWS CloudFormation), managed services, automation |
| Security | Who can reach what, and is the data protected? | IAM roles, least privilege, private subnets, encryption, logging |
| Reliability | What happens when an instance, an Availability Zone or a Region fails? | Multi-AZ, Auto Scaling groups, backups, tested failover |
| Performance efficiency | Does each component use the right resource type and size? | Purpose-built databases, caching, edge services, the right instance family |
| Cost optimization | Is anything paid for and not needed? | Right sizing, Savings Plans, Spot Instances, storage classes, lifecycle rules |
| Sustainability | Can the same result use fewer resources? | Managed services, higher utilization, Graviton-based instances |

When several options meet every requirement, the exam usually prefers, in this order: a managed service over self-managed software on EC2, a built-in feature over custom code, an IAM role over stored credentials, horizontal scaling over a bigger single instance, and a design across several Availability Zones over a single one.

Some in-scope services are closed to new customers or no longer supported in November 2026: AWS Data Pipeline, AWS Proton, the AWS Snow Family devices (use AWS DataSync or AWS Data Transfer Terminal), Amazon Glacier vaults (the S3 Glacier storage classes of Amazon S3 are not affected) and AWS Application Discovery Service. Certidrill never makes them a correct answer.

<!-- section: confusing-pairs -->
## Services that are easy to confuse

The options of a question come from the same family. Learn the one-line difference:

| Family | Options | What separates them |
| --- | --- | --- |
| Database resilience | RDS Multi-AZ, read replicas, Aurora Global Database | Multi-AZ is for availability (standby, automatic failover); read replicas scale reads and can live in another Region; Aurora Global Database replicates to other Regions with a fast Regional failover |
| Messaging | Amazon SQS, Amazon SNS, Amazon EventBridge, Amazon Kinesis Data Streams | A queue that a consumer polls; push publish/subscribe fan-out; an event bus with rules that route events; an ordered stream that several consumers can replay |
| Edge | Amazon CloudFront, AWS Global Accelerator | CloudFront caches HTTP and HTTPS content at edge locations; Global Accelerator gives two static anycast IP addresses and routes TCP or UDP over the AWS network without caching |
| Load balancers | Application Load Balancer, Network Load Balancer, Gateway Load Balancer | Layer 7 routing by path or host; layer 4 with very high throughput and static IP addresses; transparent insertion of third-party appliances |
| Network filtering | Security groups, network ACLs | Security groups are stateful, allow-only and attached to network interfaces; network ACLs are stateless, have allow and deny rules and apply to a subnet |
| VPC endpoints | Gateway endpoints, interface endpoints | Gateway endpoints exist only for Amazon S3 and DynamoDB, are free and use route tables; interface endpoints (AWS PrivateLink) are network interfaces with private IP addresses, billed by the hour |
| Multi-account guardrails | Service control policies, IAM policies | An SCP only limits the maximum permissions of member accounts; only IAM and resource policies grant permissions |
| Purchasing options | On-Demand, Savings Plans, Reserved Instances, Spot Instances | No commitment; a spend commitment for one or three years; a commitment to an instance configuration; spare capacity at a large discount that can be interrupted |
| Block storage | EBS gp3, io2 Block Express, st1, sc1 | General purpose SSD with IOPS set independently of size; highest IOPS and durability for critical databases; throughput-optimized HDD for large sequential reads; cold HDD, the cheapest |
| File storage | Amazon EFS, FSx for Windows File Server, FSx for Lustre, FSx for NetApp ONTAP | NFS for Linux; SMB with Active Directory for Windows; high-performance computing file system; multiprotocol NetApp features |
| Data transfer | AWS DataSync, AWS Storage Gateway, AWS Transfer Family | Online copy and migration jobs; hybrid access that keeps on-premises applications working against AWS storage; managed SFTP, FTPS and FTP endpoints |
| Secrets | AWS Secrets Manager, Systems Manager Parameter Store | Secrets Manager rotates secrets automatically; Parameter Store stores configuration and SecureString values without rotation |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the security decisions of the first module come back in every later design.
2. Open a free-tier AWS account and build one small three-tier application across two Availability Zones: VPC, subnets, an Application Load Balancer, an Auto Scaling group and an RDS Multi-AZ database make the vocabulary concrete.
3. For each service family, write your own "requirement, answer" table and compare it with the chapter's.
4. After each domain, take a mock exam, read every explanation, including the reasons the wrong options fail, and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row reach 800 or more on questions you haven't seen before.
