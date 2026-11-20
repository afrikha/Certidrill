SOA-C03 is an operations exam. A typical question describes a workload that already runs on AWS, then a symptom (an alarm that never fires, an instance that can't be reached, a deployment that rolls back, a database that slows down at peak) or a new operational requirement (collect memory metrics, patch every instance, share a subnet with another account). You choose the configuration change, automation or troubleshooting step that fixes it with the stated constraint. This chapter covers the format, a method for reading operations questions and the snippets they show, the habits the exam rewards, the services whose status changed and the features you must tell apart.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | AWS Certified CloudOps Engineer – Associate (formerly SysOps Administrator – Associate) |
| Exam guide | SOA-C03, version 1.2 of October 29, 2026; SOA-C03 replaced SOA-C02 on September 30, 2025 |
| Duration | 130 minutes |
| Questions | 65: 50 scored and 15 unscored, which are not identified |
| Score | Scaled from 100 to 1,000; 720 passes |
| Scoring model | Compensatory: only the total score counts, there is no passing mark per domain |
| Wrong or blank answers | A blank answer counts as wrong and there is no penalty for guessing: always answer |
| Target candidate | About one year of experience deploying, managing and operating workloads on AWS |
| Languages | English and Japanese (the Korean and Simplified Chinese versions were retired after November 19, 2026); no French version |

The five domains:

| Domain | Weight |
| --- | --- |
| Monitoring, Logging, Analysis, Remediation, and Performance Optimization | 22 % |
| Reliability and Business Continuity | 22 % |
| Deployment, Provisioning, and Automation | 22 % |
| Security and Compliance | 16 % |
| Networking and Content Delivery | 18 % |

There are only two question types. **Multiple choice** has one correct answer among four options (roughly four questions out of five). **Multiple response** ends with "Choose two." or "Choose three." and has two correct answers among five options, or three among six; the point is earned only if every selected answer is correct. There are **no exam labs**: the hands-on labs of SOA-C02 were suspended on March 28, 2023, and the SOA-C03 guide lists only the two question types.

What changed from SOA-C02: the cost and performance domain was folded into task 1.3; the guide adds the CloudWatch agent for Amazon ECS and Amazon EKS, the AWS CDK next to CloudFormation, compliance enforcement with AWS Config conformance packs and CloudWatch network monitoring; S3 static websites were removed. Version 1.1 (June 1, 2026) added Amazon Bedrock, AWS DevOps Agent, the AWS Health Dashboard, Kiro, AWS Security Agent, Amazon S3 Files and the four disaster recovery strategies. Designing architectures, CI/CD pipelines or hybrid networks, writing software, defining governance, capacity planning, TCO analysis and billing are out of scope.

> **Exam tip.** You can't tell which 15 questions are unscored, so give each one the same care. Certidrill mock exams score all 65.

<!-- section: reading-questions -->
## Reading an operations question

A stem has two to five sentences: a company ("AnyCompany", "a media company"), its environment, the symptom or requirement, a qualifier, then "Which solution will meet these requirements?". Many stems include a snippet: AWS CLI output, an IAM or bucket policy, a CloudFormation template, a CloudWatch agent configuration, an EventBridge event pattern or VPC flow log records. Work in this order:

1. Read the last two sentences first: the qualifier and what you must choose.
2. Classify the problem: not collected, collected but not alarmed, alarmed but no action, action denied, or misconfigured resource.
3. Read the snippet for the one value that is wrong: a missing permission, a wrong dimension, a `DENY` or `REJECT`, a port, a state.
4. Eliminate each option that fails a requirement, then apply the qualifier.

| Words in the stem | What they usually select |
| --- | --- |
| "LEAST operational overhead" | A built-in feature or managed automation (alarm action, AWS Config managed rule with automatic remediation, Systems Manager Automation, EventBridge rule) rather than scripts on an instance or cron jobs |
| "automatically", "without manual intervention" | An event-driven chain: metric or event, then alarm or rule, then a target that fixes it |
| "MOST cost-effective" | The cheapest option that still meets every functional requirement: gp3 over gp2, lifecycle rules, rightsizing, gateway endpoints |
| "with the least downtime" | An online change (Elastic Volumes, rolling or Multi-AZ failover, instance refresh) rather than stop, snapshot and rebuild |
| "memory", "disk space", "processes" | The CloudWatch agent: EC2 doesn't publish these metrics by itself |
| "who made the change", "which API call" | AWS CloudTrail |
| "configuration history", "continuous compliance" | AWS Config |
| "across all accounts" or "every Region" | AWS Organizations features: StackSets, delegated administrator, organization trail, cross-account observability, multi-account Automation |
| "without opening inbound ports", "no SSH keys" | Systems Manager Session Manager or Run Command |
| "near real time" | A metric alarm or an EventBridge rule, not a scheduled report |

> **Exam trap.** Two options often both work. One adds a Lambda function or a script to do what a native setting already does (an alarm action, a Config remediation, an Auto Scaling health check type). With "LEAST operational overhead", the native setting wins.

<!-- section: operations-principles -->
## Habits the exam rewards

The exam follows the operational excellence and reliability pillars of the AWS Well-Architected Framework. The answers it prefers share a few habits:

- **Observe before acting.** A fix starts with the right signal: a metric for numbers, a log for details, CloudTrail for API activity, AWS Config for resource configuration, AWS Health for AWS-side events.
- **Automate the response.** A human reading an email is never the best answer when an alarm action, an EventBridge rule or a runbook can do it.
- **Grant the automation its own permissions.** Most "the target never runs" questions come down to a missing resource policy, an IAM role the service can't assume or a KMS key policy.
- **Change through code.** Use CloudFormation or the AWS CDK, detect drift, preview changes with change sets and roll out to many accounts with StackSets.
- **Spread and replace.** Several Availability Zones, health checks that replace unhealthy targets, backups that are tested.

Service status in November 2026, applied in every Certidrill question:

| Service | Status | What to use |
| --- | --- | --- |
| AWS OpsWorks | End of life (OpsWorks Stacks on May 26, 2024), disabled for all customers | Systems Manager, CloudFormation |
| AWS Cloud9 | Closed to new customers | Your own IDE, AWS CloudShell, Kiro |
| AWS CodeCommit | Open again to new customers since November 25, 2025 | Can be a correct answer |
| AWS X-Ray SDKs and daemon | Maintenance mode since February 25, 2026; X-Ray itself continues | OpenTelemetry (AWS Distro for OpenTelemetry) with the CloudWatch agent or a collector |
| Amazon Q Developer | New sign-ups closed on May 15, 2026 | Kiro |
| Amazon DevOps Guru | No new customers from October 29, 2026; access ends September 30, 2027 | CloudWatch investigations, AWS DevOps Agent |

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Family | Options | What separates them |
| --- | --- | --- |
| Telemetry | CloudWatch metrics, CloudWatch Logs, CloudTrail, AWS Config | Numeric time series; text events from applications and services; who called which API, when and from where; what a resource looked like over time and whether it complies with rules |
| Alarms | Metric alarm, composite alarm, metric filter | A threshold on one metric or expression, with any action; a rule combining other alarms, limited to notification-type actions; a pattern that turns log events into a metric |
| Event routing | EventBridge rule, EventBridge Pipes, SNS topic | Content-based routing of many events to up to five targets per rule; one source to one target with filtering and enrichment; push fan-out of a message to subscribers |
| Systems Manager | Run Command, Automation, State Manager, Patch Manager, Session Manager | Run a command once on many instances; a multi-step runbook that calls AWS APIs; keep instances in a defined state on a schedule; scan and install patches by baseline; an audited shell without SSH or open ports |
| Health checks | EC2 status checks, ELB health checks, Route 53 health checks | Hardware and OS reachability of one instance; application response of each target, used to route traffic and, if enabled, to replace instances in an Auto Scaling group; endpoint health used by DNS failover |
| Database resilience | RDS Multi-AZ, read replicas, RDS Proxy | A standby with automatic failover, no read scaling on a Multi-AZ DB instance; asynchronous copies that serve reads; a connection pool that absorbs connection storms and shortens failover |
| Network filtering | Security groups, network ACLs | Stateful, allow rules only, on network interfaces; stateless, numbered allow and deny rules, on subnets, so return traffic needs ephemeral ports opened |
| Network diagnosis | VPC Flow Logs, Reachability Analyzer | Records of real traffic that was accepted or rejected; a static analysis of the path between two resources, without sending packets |
| Infrastructure as code | Change set, drift detection, StackSets | Preview of what an update will change; difference between the template and resources changed by hand; one template deployed to many accounts and Regions |
| Sharing | AWS RAM, StackSets | Share one existing resource (subnet, transit gateway, Resolver rule) with other accounts; create a copy of the resources in each account |
| Optimization advice | Compute Optimizer, Trusted Advisor, Cost Explorer | Rightsizing from utilization metrics; checks across cost, security, fault tolerance, performance and service limits; spending history and forecasts |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the monitoring module builds the signals that the reliability, deployment and security chapters act on.
2. In a sandbox account, install the CloudWatch agent on an instance with Systems Manager, publish memory metrics, create an alarm that notifies an SNS topic, then an EventBridge rule that runs an Automation runbook.
3. Break things on purpose and read the evidence: remove a Lambda resource policy, deny a port in a network ACL, edit a stack resource by hand and detect drift.
4. After each domain, take a mock exam, read every explanation, including why the wrong options fail, and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row reach 800 or more on questions you haven't seen before.
