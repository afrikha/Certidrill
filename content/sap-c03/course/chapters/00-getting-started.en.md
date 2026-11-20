SAP-C03 is the architect exam for complex organizations. Every question describes a company with several accounts, Regions or business units, its existing estate and a set of constraints, then asks for the design that satisfies all of them. Associate-level knowledge of each service is assumed; what is tested is the trade-off between several designs that would all work, decided by one qualifier or one buried constraint. This chapter explains the format, a reading method for long stems, the principles that break ties, the service status traps of November 2026 and the pairs of options the exam sets against each other.

<!-- section: exam-format -->
## Exam format

| Item | Value |
| --- | --- |
| Certification | AWS Certified Solutions Architect – Professional |
| Exam version | SAP-C03, in use from November 17, 2026 (SAP-C02 was used until November 16, 2026) |
| Duration | 180 minutes |
| Questions | 75: 65 scored and 10 unscored, not identified |
| Score | Scaled from 100 to 1,000; 720 passes |
| Scoring model | Compensatory: only the overall score counts, no minimum per domain |
| Price and delivery | 300 USD; Pearson VUE test center or online proctored |
| Languages | English, Japanese, Korean, Portuguese (Brazil), Simplified Chinese, Spanish (Latin America); no French version |

The five domains were rebuilt for SAP-C03:

| Domain | Weight | Course module |
| --- | --- | --- |
| Architecture Design and Implementation Built for the Cloud | 25 % | Chapters 11 to 16 |
| Security, Compliance, and Governance | 25 % | Chapters 21 to 25 |
| Cost-Optimized Architecture Design | 15 % | Chapters 31 to 34 |
| Resilience, Migration, and Business Continuity | 15 % | Chapters 41 to 43 |
| Operational Excellence and Automation | 20 % | Chapters 51 to 54 |

Compared with SAP-C02, the guide adds generative AI (Amazon Bedrock, AgentCore, RAG, guardrails), post-quantum cryptography, data residency, IPv6, lakehouse, service mesh, multi-tenancy, DevSecOps, SLOs and chaos engineering with AWS Fault Injection Service. It removes IoT, end-user computing, media services, Lightsail, Amazon SES, Amplify, App Runner, AWS Batch, AWS Proton and Service Catalog.

Two question types exist. **Multiple choice** has four options and one correct answer. **Multiple response** ends with "Choose two." or "Choose three." and offers five or six options; every selected answer must be correct to earn credit. There is no case study, drag and drop or lab.

> **Exam tip.** You have about 2 minutes 24 seconds per question, and stems are long. Answer every question on the first pass, flag the ones you doubt, and keep 20 minutes to revisit them; a blank answer scores the same as a wrong one. Certidrill mock exams score all 75 questions.

<!-- section: reading-questions -->
## Reading a professional-level scenario

A stem runs five to ten sentences: an organization ("AnyCompany") with accounts, Regions or subsidiaries, what it runs today, the change it wants, constraints (compliance, budget, team skills, deadline), then a qualifier and "Which solution will meet these requirements?". The four options are complete multi-service designs; each wrong one fails exactly one constraint, often a small one.

1. Read the final question and the qualifier first.
2. List the hard constraints: number of accounts and Regions, data residency, encryption ownership, RPO and RTO, downtime allowed, "no code changes", existing skills.
3. For each option, find the constraint it breaks; eliminate it even if it is otherwise elegant.
4. Between the survivors, apply the qualifier.
5. For "Choose two" or "Choose three", check that the selected options work together and that each one is needed.

| Words in the stem | What they usually select |
| --- | --- |
| "LEAST operational overhead" | Managed or serverless services, built-in features, organization-wide controls applied once, over scripts, EC2 fleets or per-account setup |
| "MOST cost-effective" | The cheapest design that still meets every requirement: Savings Plans for steady use, Spot for interruptible work, storage tiers, removing data transfer |
| "lowest RPO" or "lowest RTO" | Continuous replication and a running standby (warm standby, active-active) rather than backups |
| "without changing the application code" | A change around the application: proxy, load balancer, DNS, managed engine of the same type, rehosting |
| "across all accounts", "including future accounts" | Organizations-level controls: SCPs, RCPs, delegated administrators, Control Tower controls, StackSets with automatic deployment |
| "must not leave the Region" or "the EU" | Regional resources, geographic profiles, SCPs denying other Regions |
| "the team has no experience with X" | Avoid X even if it fits technically (for example EKS for a team without Kubernetes skills) |
| "minimal downtime" during migration | Replication then cutover (AWS Transform MGN, AWS DMS with ongoing replication, blue/green) |

> **Exam trap.** Professional distractors are rarely wrong services; they are right services configured at the wrong scope. An SCP attached to the management account, a guardrail created in one Region for a multi-Region workload, or a policy that covers existing accounts but not new ones all fail a stated constraint.

<!-- section: design-principles -->
## Principles that decide between valid designs

The AWS Well-Architected Framework remains the reference, read at organization scale:

| Pillar | Professional-level question | Typical answer |
| --- | --- | --- |
| Operational excellence | Can hundreds of accounts be governed and changed consistently? | Infrastructure as code, StackSets, Control Tower, automated runbooks, observability with SLOs |
| Security | Is access least privilege everywhere, including for third parties and new accounts? | IAM Identity Center, SCPs and RCPs, delegated administrators, encryption with customer managed keys, centralized logging |
| Reliability | What survives an AZ or a Region failure, and how fast does it recover? | Multi-AZ by default, multi-Region where RTO and RPO require it, tested failover, chaos experiments |
| Performance efficiency | Is each workload on the right engine and close to its users? | Purpose-built databases, caching, edge services, containers or serverless |
| Cost optimization | Is spend visible per team and minimized without breaking requirements? | Tagging and cost categories, Savings Plans, rightsizing with Compute Optimizer, data transfer design |
| Sustainability | Can the result use fewer resources? | Managed services, Graviton, higher utilization |

Tie-breakers the exam applies consistently: a control applied once at the organization beats the same control repeated per account; a managed service beats self-managed software; temporary credentials from roles beat long-term keys; private connectivity beats internet paths; automation beats manual runbooks; and a design that meets the requirement exactly beats one that over-delivers at higher cost.

AWS also changes its catalog. In November 2026, Certidrill never makes these a correct answer:

| Service | Status | Use instead |
| --- | --- | --- |
| AWS Migration Hub, AWS Application Discovery Service | Closed to new customers since November 7, 2025 | AWS Transform for discovery, assessment and planning |
| AWS Snow Family devices | Not offered to new customers | AWS DataSync, AWS Data Transfer Terminal, AWS Outposts |
| AWS OpsWorks | End of life | Systems Manager, CloudFormation, configuration management on EC2 |
| AWS App Mesh | Discontinued on September 30, 2026 | Amazon ECS Service Connect, Amazon VPC Lattice |
| Amazon Q Developer | New sign-ups closed May 15, 2026 | Kiro |

Names changed too: AWS Application Migration Service is now **AWS Transform MGN**; Amazon QuickSight (as the guide still writes) is now **Amazon Quick**. AWS CodeCommit reopened to new customers on November 25, 2025 and is a valid answer. The Lambda maximum timeout is now 30 minutes (1,800 seconds), and durable functions run for up to one year.

<!-- section: confusing-pairs -->
## Option families the exam sets against each other

| Family | Options | What separates them |
| --- | --- | --- |
| Organization guardrails | SCPs, RCPs, permissions boundaries, IAM policies | SCPs cap what principals in member accounts can do; RCPs cap what can be done to resources in member accounts, including by external principals; neither applies to the management account and neither grants anything; a permissions boundary caps one role or user; only IAM and resource policies grant |
| Account access | IAM Identity Center, cross-account roles with external ID | Identity Center gives workforce users single sign-on to many accounts; a third party assumes a role in your account with an external ID to prevent the confused deputy problem |
| VPC connectivity | VPC peering, Transit Gateway, PrivateLink, VPC Lattice, Cloud WAN | Peering: one-to-one, non-transitive, no overlapping CIDRs; Transit Gateway: Regional hub with route tables for segmentation; PrivateLink: expose one service, overlapping CIDRs allowed; VPC Lattice: service-to-service with IAM auth across accounts; Cloud WAN: global network managed by a core network policy |
| Hybrid connectivity | Direct Connect, Site-to-Site VPN | Direct Connect: private, consistent bandwidth, not encrypted by default; VPN: encrypted over the internet, quick to set up, common as Direct Connect backup |
| Hybrid DNS | Route 53 Resolver inbound and outbound endpoints | Inbound: on-premises resolvers query AWS private zones; outbound with forwarding rules: VPCs resolve on-premises domains |
| Disaster recovery | Backup and restore, pilot light, warm standby, multi-site active-active | From the cheapest with the longest RTO and RPO to the most expensive with near-zero RTO and RPO; AWS Elastic Disaster Recovery replicates servers continuously and launches them on demand |
| Multi-Region data | Aurora Global Database, DynamoDB global tables, S3 Replication | One writer Region with fast cross-Region failover; multi-active writes in every Region; asynchronous object copies, with Replication Time Control for a 15-minute objective |
| Migration | AWS Transform MGN, AWS DMS with AWS SCT, AWS Transform | Rehost servers with block-level replication; migrate databases, converting schemas between engines; discovery, assessment and modernization |
| Data transfer | DataSync, Transfer Family, Storage Gateway | Scheduled or one-time copies between storage systems; managed SFTP, FTPS, FTP and AS2 endpoints for partners; on-premises applications using AWS storage through a local cache |
| Purchasing | Compute Savings Plans, EC2 Instance Savings Plans, Reserved Instances, Spot | Flexible spend commitment across EC2, Fargate and Lambda; higher discount tied to an instance family in a Region; commitment for services without Savings Plans coverage or with capacity reservation needs; spare capacity for interruptible work |
| Workflows and containers | Step Functions or Lambda durable functions; ECS or EKS | Workflow as a managed state machine or as code with checkpoints; AWS-native orchestration with least overhead or Kubernetes for existing skills and portability |

<!-- section: study-plan -->
## Study plan

1. Read the modules in order: architecture builds the vocabulary, and security, cost, resilience and operations reuse it at organization scale.
2. Build a small multi-account environment: AWS Organizations with a few OUs, IAM Identity Center, an SCP, a cross-account EventBridge rule and a shared VPC Lattice service network. Delete everything afterwards.
3. For each chapter, rewrite its decision tables from memory as "requirement, then design"; the exam asks the same decision with different words.
4. Take a mock exam after each module; for every question, including those you got right, explain why each wrong option fails a specific constraint.
5. Book the exam when three full 75-question mocks in a row reach 800 or more within 180 minutes on questions you haven't seen before.
