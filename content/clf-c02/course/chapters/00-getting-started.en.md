CLF-C02 is a foundational exam. Each question asks you to recognize one thing: a cloud concept, an AWS service, a Well-Architected pillar, a responsibility under the shared responsibility model, a purchasing option or a Support plan. You never type a command, follow a console path or design a full architecture. This chapter covers the format, a method for reading the short questions, the services the exam expects you to tell apart and a study plan.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | AWS Certified Cloud Practitioner |
| Exam guide | Version 1.3, October 29, 2026 |
| Duration | 90 minutes |
| Questions | 65: 50 scored and 15 unscored, which are not identified |
| Score | Scaled from 100 to 1,000; 700 passes |
| Scoring model | Compensatory: only the total score counts, there is no passing mark per domain |
| Wrong or blank answers | A blank answer counts as wrong and there is no penalty for guessing: always answer |
| Target candidate | Up to six months of exposure to the AWS Cloud, in any job role, technical or not |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Cloud Concepts | 24 % |
| Security and Compliance | 30 % |
| Cloud Technology and Services | 34 % |
| Billing, Pricing, and Support | 12 % |

There are only two question types. **Multiple choice** has one correct answer among four options; it is the large majority of the exam. **Multiple response** ends with "Choose two." (rarely "Choose three.") and has two correct answers among five options, or three among six; it earns the point only if every selected answer is correct. There is no case study, no Yes/No series, no drop-down list, no drag and drop and no lab.

> **Exam tip.** Since you can't tell which 15 questions are unscored, treat every question as if it counts. Certidrill mock exams score all 65 questions.

<!-- section: reading-questions -->
## Reading a question

A stem has one to three sentences: a company ("A retail company", "AnyCompany") and one need, then the question: "Which AWS service will meet this requirement?", "Which pillar of the AWS Well-Architected Framework...?", "Which task is the customer's responsibility...?". The four options come from the same family, so one detail of the stem decides. Work in this order:

1. Read the question sentence first: are you choosing a service, a concept, a pillar, a responsibility or a pricing option?
2. Underline the key words of the need: "API calls", "compliance reports", "estimate", "alert", "patch the operating system".
3. Eliminate the options that do something close but different.
4. For "Choose two.", check each option on its own: each correct option must answer the question alone.

| Words in the stem | What they point to |
| --- | --- |
| "who made this API call", "audit account activity" | AWS CloudTrail |
| "configuration history", "is this resource compliant with a rule" | AWS Config |
| "metrics", "alarm", "application logs" | Amazon CloudWatch |
| "download AWS compliance reports" (SOC, PCI DSS, ISO) | AWS Artifact |
| "estimate the cost before deploying" | AWS Pricing Calculator |
| "alert when spending exceeds an amount" | AWS Budgets |
| "patch the guest operating system of an EC2 instance" | The customer |
| "physical security of data centers" | AWS |
| "move without changes", "lift and shift" | The rehost migration strategy |
| "pay only for what you use", "no upfront investment" | Trade fixed expense for variable expense |

> **Exam trap.** "MOST cost-effective" never overrides a stated requirement. If the workload can't be interrupted, Spot Instances are wrong however cheap they are.

<!-- section: confusing-pairs -->
## Services that are easy to confuse

Learn the one-line difference between the members of each family:

| Family | Options | What separates them |
| --- | --- | --- |
| Frameworks | AWS Well-Architected Framework, AWS Cloud Adoption Framework (AWS CAF) | Six pillars to design and review a workload; six perspectives to prepare an organization for cloud adoption |
| Global infrastructure | Region, Availability Zone, edge location | A geographic area; isolated data centers inside a Region; points of presence close to users for caching and DNS |
| Monitoring and audit | CloudWatch, CloudTrail, Config | Performance metrics and logs; who did what through the API; what a resource's configuration is and was |
| Recommendations | AWS Trusted Advisor, AWS Compute Optimizer | Best-practice checks in categories such as cost optimization, security, fault tolerance, performance and service quotas; right size of compute resources from their measured utilization |
| Cost tools | Pricing Calculator, Cost Explorer, Budgets, Cost and Usage Report | Estimate before deploying; analyze past costs and forecast; alert on a threshold; the most detailed billing data file |
| Security services | Shield, WAF, GuardDuty, Inspector, Macie | DDoS protection; web request filtering; threat detection from logs; vulnerability scanning; sensitive data discovery in Amazon S3 |
| Network filtering | Security groups, network ACLs | Stateful, allow rules, on an instance's network interface; stateless, allow and deny rules, on a subnet |
| Storage | Amazon EBS, instance store, Amazon EFS | Persistent block volume for one instance; temporary block storage lost when the instance stops; shared file system for many instances |
| Purchasing options | On-Demand, Savings Plans, Reserved Instances, Spot Instances, Dedicated Hosts | No commitment; a spend commitment for one or three years; a commitment to an instance configuration; spare capacity that can be interrupted; a physical server for your own per-socket or per-core licenses |
| Credentials | AWS Secrets Manager, Systems Manager Parameter Store | Secrets with automatic rotation; configuration values and SecureString parameters without rotation |

AWS renames and closes services. In November 2026: AWS Migration Hub and AWS Application Discovery Service are closed to new customers (AWS Transform offers similar capabilities); AWS Snowball Edge is no longer available to new customers (AWS DataSync for online transfers); Amazon Glacier vaults are closed to new customers, but the S3 Glacier storage classes of Amazon S3 are not affected; AWS Application Migration Service is now named AWS Transform MGN; Amazon AppStream 2.0 is now documented as Amazon WorkSpaces Applications; the Support plans are Basic, Business Support+, Enterprise Support and Unified Operations. Certidrill never makes a closed service or a retired plan a correct answer.

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the concepts of the first module (benefits, pillars, shared responsibility) explain the answers of the later ones.
2. Open an AWS Free Tier account, look at the AWS Management Console, launch and terminate one small EC2 instance, create an S3 bucket and an AWS Budgets alert: the vocabulary becomes concrete.
3. For each family of the table above, write the one-line difference from memory, then compare.
4. After each domain, take a mock exam, read every explanation, including why the wrong options fail, and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row reach 800 or more on questions you haven't seen before.

<!-- section: key-points -->
## Key points

- 90 minutes, 65 questions (15 unscored), 700 out of 1,000 to pass, no per-domain minimum, no penalty for guessing.
- Security (30 %) and technology (34 %) are almost two thirds of the exam.
- Each question tests one fact: find the key word, then eliminate the neighbors from the same family.
- Never choose a service closed to new customers.
