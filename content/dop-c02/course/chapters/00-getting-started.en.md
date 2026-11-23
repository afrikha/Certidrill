DOP-C02 is the professional exam for engineers who automate the delivery, operation and governance of AWS workloads. Every question describes a company with an existing pipeline, fleet, monitoring setup or multi-account organization, a failure or a new requirement, and constraints such as approvals, compliance or zero downtime; it then asks for the automation design that satisfies all of them. Associate-level knowledge of each service is assumed. What is tested is the choice between several designs that would all work, decided by one qualifier or one buried detail. This chapter explains the format, a reading method for long stems, the principles that break ties, the service status traps of November 2026 and the pairs of options the exam sets against each other.

<!-- section: exam-format -->
## Exam format

| Item | Value |
| --- | --- |
| Certification | AWS Certified DevOps Engineer – Professional |
| Exam version | DOP-C02 (no DOP-C03 announced in November 2026) |
| Duration | 180 minutes |
| Questions | 75: 65 scored and 10 unscored, not identified |
| Score | Scaled from 100 to 1,000; 750 passes |
| Scoring model | Compensatory: only the overall score counts, no minimum per domain; no penalty for guessing |
| Price and delivery | 300 USD; Pearson VUE test center or online proctored |
| Languages | English, Japanese, Korean (the Korean version retires after December 31, 2026), Simplified Chinese; no French version |

The six domains and where this course covers them:

| Domain | Weight | Course module |
| --- | --- | --- |
| SDLC Automation | 22 % | Chapters 11 to 14 |
| Configuration Management and IaC | 17 % | Chapters 21 to 23 |
| Resilient Cloud Solutions | 15 % | Chapters 31 to 35 |
| Monitoring and Logging | 15 % | Chapters 41 to 46 |
| Incident and Event Response | 14 % | Chapters 51 to 53 |
| Security and Compliance | 17 % | Chapters 61 to 63 |

Two question types exist. **Multiple choice** has four options and one correct answer. **Multiple response** ends with "Choose two." or "Choose three." and offers five or six options; every selected answer must be correct to earn credit, there is no partial credit. There is no case study, ordering, matching or lab item.

The guide lists job tasks that are out of scope for the candidate: advanced networking knowledge (such as advanced routing algorithms), deep-level security recommendations to developers, designing, querying and optimizing databases, and developing full-stack application code. Expect questions on how to automate, deploy and operate an application, not on how to write it.

> **Exam tip.** You have about 2 minutes 24 seconds per question, and stems are long. Answer every question on the first pass, flag the ones you doubt and keep 20 minutes to revisit them; a blank answer scores the same as a wrong one. Certidrill mock exams score all 75 questions.

<!-- section: reading-questions -->
## Reading a professional-level DevOps scenario

A stem runs five to ten sentences: a company with several accounts or Regions, its existing pipeline, fleet or monitoring setup, what went wrong or what must change, constraints (a security team must approve production changes, no downtime, auditors require evidence, the team has little time), then a qualifier and "Which solution will meet these requirements?". The options are complete automation designs: a trigger, a service, a target and the permissions that connect them. Each wrong option fails exactly one constraint: a manual step, the wrong account, the wrong lifecycle hook, a polling script where an event exists, or custom code where a managed feature does the job.

1. Read the final question and the qualifier first.
2. List the hard constraints: which accounts and Regions, who approves, what must happen automatically, how fast, what may not change (application code, the AMI, the network).
3. For each option, follow the chain trigger → action → target → permissions, and find the link that breaks a constraint.
4. Between the survivors, apply the qualifier.
5. For "Choose two" or "Choose three", check that the selected options form one working design and that each one is needed.

| Words in the stem | What they usually select |
| --- | --- |
| "LEAST operational overhead" | Managed features (CodeDeploy alarm rollback, Config managed rules, Patch Manager, StackSets with automatic deployment) over custom Lambda code, cron jobs or scripts on EC2 |
| "MOST automated", "without manual intervention" | An event-driven chain: EventBridge rule or CloudWatch alarm to SSM Automation, Lambda or CodePipeline, with automatic rollback |
| "zero downtime", "LEAST downtime" | Blue/green, immutable or traffic-shifting deployments; rolling with an additional batch when cost matters |
| "roll back automatically" | CodeDeploy or ECS deployments with CloudWatch alarms and automatic rollback, CloudFormation rollback triggers, SAM `DeploymentPreference` alarms |
| "without changing the application code" | A change around the application: CloudWatch agent, OpenTelemetry auto-instrumentation, load balancer health checks, deployment configuration |
| "across all accounts", "including future accounts" | Organization-level features: StackSets with service-managed permissions, Config conformance packs or rules deployed by a delegated administrator, Control Tower controls, SCPs |
| "must be approved before production" | A CodePipeline manual approval action (with an SNS notification) before the production stage |
| "MOST cost-effective" | The cheapest design that still meets every requirement: rolling instead of blue/green when brief reduced capacity is accepted, Spot for build fleets, lifecycle rules on artifacts |

> **Exam trap.** Professional distractors are rarely wrong services; they are right services wired at the wrong place. An approval action placed after the production deployment, a CloudWatch alarm with no rollback configured, an EventBridge rule in the wrong Region or account, or a StackSet that covers today's accounts but not new ones all fail a stated constraint.

<!-- section: devops-principles -->
## Principles that decide between valid designs

The exam rewards the same habits a senior DevOps engineer applies daily:

| Principle | What the correct option usually does |
| --- | --- |
| Everything as code | Infrastructure in CloudFormation, AWS CDK or AWS SAM; pipelines, alarms and runbooks defined in templates and stored in Git |
| Build once, deploy many | One immutable artifact (image digest, package version, AMI) promoted through test, staging and production, never rebuilt per environment |
| Event-driven, not polling | EventBridge rules, CloudWatch alarms and service integrations start the next step |
| Fail fast, roll back automatically | Cheap tests run first; alarms watch every deployment and trigger rollback without a human |
| Least privilege and no long-term secrets | Roles assumed across accounts, secrets in Secrets Manager or Parameter Store, KMS customer managed keys where another account must decrypt |
| Central governance, delegated operation | Organization-wide controls applied once from the management account or a delegated administrator |
| Observe before you act | Metrics, logs and traces collected by agents or OpenTelemetry, with alarms and dashboards that drive automation |

AWS also changes its catalog, and the DOP-C02 guide predates many of these changes. Certidrill never makes these a correct answer:

| Service or feature | Status (verified November 2026) | Current answer |
| --- | --- | --- |
| AWS OpsWorks (Stacks, Chef Automate, Puppet Enterprise) | Full shutdown since May 2024 | Systems Manager (State Manager, Run Command, Automation), AWS AppConfig, CloudFormation |
| AWS CodeStar | Shut down July 2024 | CodePipeline, CodeBuild and CodeDeploy defined with CloudFormation or the AWS CDK |
| AWS Proton | Shut down October 7, 2026 | Service Catalog, CloudFormation modules, AWS CDK constructs |
| Amazon Inspector Classic and its assessment templates | Shut down May 20, 2026 | Amazon Inspector automated scanning of EC2 instances, ECR images and Lambda functions |
| AWS App Runner | Maintenance, closed to new customers | Amazon ECS Express Mode, as AWS recommends |
| AWS App2Container, AWS Copilot CLI | Closed to new customers; Copilot end of support June 12, 2026 | ECS task definitions and services defined with CloudFormation or the AWS CDK |
| Amazon CodeGuru Reviewer, CodeGuru Security | Reviewer: no new repository associations; Security: discontinued | Amazon Inspector code and image scanning, scanners run in CodeBuild |
| AWS Cloud9 | Closed to new customers | Local IDEs with the AWS Toolkits, AWS CloudShell |
| Systems Manager Incident Manager and Change Manager | Closed to new customers | CloudWatch alarms, EventBridge, SNS and SSM Automation runbooks with approval steps |
| AWS CloudTrail Lake | Closed to new customers May 31, 2026 | CloudTrail trails to S3 queried with Athena, CloudTrail logs in CloudWatch Logs |
| AWS X-Ray SDKs and daemon | Maintenance mode since February 25, 2026 (X-Ray itself continues) | AWS Distro for OpenTelemetry, CloudWatch Application Signals |
| Amazon Q Developer | New sign-ups closed May 15, 2026 | Kiro |

Names changed too: Amazon Kinesis Data Firehose is now **Amazon Data Firehose**, AWS Fault Injection Simulator is now **AWS Fault Injection Service**, and the guide's AWS Security Hub is documented today as **AWS Security Hub CSPM**. AWS CodeCommit, closed to new customers in 2024, reopened on November 25, 2025 and is again a valid source repository.

> **Exam trap.** The guide still lists OpsWorks and "Amazon Inspector and common assessment templates". When an option relies on a Chef recipe in OpsWorks or an Inspector Classic assessment template, treat it as a distractor and look for the Systems Manager or current Amazon Inspector design.

<!-- section: confusing-pairs -->
## Option families the exam sets against each other

| Family | Options | What separates them |
| --- | --- | --- |
| Deployment strategy | In-place rolling, rolling with additional batch, immutable, blue/green, canary, linear | Rolling keeps cost low but reduces capacity and mixes versions; immutable and blue/green keep full capacity and roll back fastest; canary sends a small share first, linear shifts equal steps at fixed intervals |
| CodeDeploy hooks | `BeforeInstall`, `AfterInstall`, `ApplicationStart`, `ValidateService`; `BeforeAllowTraffic`, `AfterAllowTraffic` | EC2 hooks run scripts on the instance; Lambda and ECS hooks invoke Lambda validation functions that report back to CodeDeploy |
| Secrets | Secrets Manager, Parameter Store `SecureString` | Secrets Manager rotates on a schedule and shares across accounts with a resource policy; Parameter Store is cheaper configuration storage with no built-in rotation |
| Template reuse | Nested stacks, CloudFormation modules, StackSets, Service Catalog | Reuse inside one stack; packaged resource blocks; one template to many accounts and Regions; governed self-service products for end users |
| Change control | Change sets, drift detection, rollback triggers | Preview an update; find manual changes made outside CloudFormation; roll back an update when an alarm fires |
| Systems Manager | Run Command, State Manager, Automation, Patch Manager | One-off commands; a desired state applied on a schedule; multi-step runbooks that call AWS APIs; patch baselines and maintenance windows |
| Compliance | Config rules, conformance packs, Control Tower controls, SCPs | Detect and remediate configuration; deploy a set of rules and remediations as one unit; managed preventive, detective and proactive controls; deny actions at the organization level |
| Events | EventBridge, SNS, CloudWatch alarms | Route events to targets with patterns and cross-account buses; fan out notifications; watch a metric against a threshold |
| Logs | Metric filters, subscription filters, Logs Insights | Turn log patterns into metrics and alarms; stream log events to Lambda, Kinesis Data Streams or Amazon Data Firehose; query logs interactively |
| Alarms | Static threshold, anomaly detection, composite alarms | Fixed value; a band learned from the metric's history; a rule combining several alarms to cut noise |
| Instance fleets | Auto Scaling lifecycle hooks, warm pools, instance refresh | Run actions while an instance launches or terminates; keep pre-initialized instances ready; replace instances to roll out a new launch template |
| Multi-Region data | Aurora Global Database, DynamoDB global tables, cross-Region AWS Backup copies | One writer Region with fast cross-Region failover; multi-Region writes; point-in-time backups copied to another Region |
| Security findings | GuardDuty, Amazon Inspector, Macie, Security Hub, Detective | Threat detection from logs; software vulnerabilities in EC2, ECR and Lambda; sensitive data in S3; aggregated findings and standards; investigation of a finding |

<!-- section: study-plan -->
## Study plan

1. Read the modules in order: SDLC automation builds the pipeline vocabulary that configuration management, resilience, monitoring, incident response and security reuse.
2. Build a small lab: a CodePipeline V2 pipeline with a CodeBuild build and test stage, a manual approval, and a CodeDeploy blue/green deployment with alarm rollback; then a second account that the pipeline deploys to with a cross-account role and a KMS customer managed key. Delete everything afterwards.
3. Add the operations layer: a CloudWatch alarm that starts an SSM Automation runbook through EventBridge, a Config rule with automatic remediation and a StackSet deployed to an organizational unit.
4. For each chapter, rewrite its decision tables from memory as "requirement, then design"; the exam asks the same decision with different words.
5. Take a mock exam after each module; for every question, including those you got right, explain which constraint each wrong option fails.
6. Book the exam when three full 75-question mocks in a row reach 800 or more within 180 minutes on questions you haven't seen before.
