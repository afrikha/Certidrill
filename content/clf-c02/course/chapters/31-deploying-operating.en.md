Every action on AWS, from launching an instance to deleting a bucket, is an API call. You can make that call by clicking in a browser, by typing a command, from your own code, or by describing the infrastructure in a template that AWS deploys for you. The exam asks you to pick the access method that fits a requirement, to tell a one-time task from a repeatable process, and to recognize the cloud, hybrid and on-premises deployment models.

<!-- section: access-methods | objectives: 3.1.2, 3.1.4 -->
## Ways to access AWS services

| Method | What it is | Best for |
| --- | --- | --- |
| **AWS Management Console** | Web interface in a browser; also the AWS Console Mobile Application to check resources and alarms on a phone | Learning, exploring, one-off tasks, visual monitoring |
| **AWS Command Line Interface (AWS CLI)** | One tool to control AWS services with commands from a terminal | Scripts and automation of repeated tasks |
| **AWS SDKs** | Libraries for programming languages (Python, Java, JavaScript, .NET, Go and others) that call AWS APIs from application code | Applications that use AWS services |
| **AWS APIs** | HTTPS requests to service endpoints, signed with your credentials; what the console, CLI and SDKs use underneath | Custom tools and integrations |
| **Infrastructure as code (IaC)** | Templates or code that describe resources; AWS creates, updates and deletes them as a unit | Repeatable, consistent environments |

Console access uses a user name and password (with MFA) or the IAM Identity Center access portal. Programmatic access (CLI, SDKs, APIs) uses access keys or, better, temporary credentials from a role or IAM Identity Center.

```bash
# The same task as a few clicks in the console, now scriptable
aws ec2 describe-instances --region eu-west-3
```

> **Exam trap.** The console, the CLI and the SDKs all call the same APIs. None of them is "more powerful"; the requirement decides: a developer's application uses an SDK, an administrator's script uses the CLI, a reproducible environment uses IaC.

<!-- section: provisioning-operating | objectives: 3.1.1 -->
## Provisioning and operating resources

| Service | Role |
| --- | --- |
| **AWS CloudFormation** | IaC service: a template in JSON or YAML describes resources; CloudFormation deploys them as a **stack**, predictably and repeatedly, with rollback on error |
| **AWS Cloud Development Kit (AWS CDK)** | Open-source framework to define infrastructure in TypeScript, JavaScript, Python, Java, C#/.NET or Go; it generates CloudFormation templates and deploys through CloudFormation |
| **AWS Elastic Beanstalk** | Upload application code; AWS provisions and manages the capacity, load balancing, scaling and health monitoring |
| **AWS Systems Manager** | Operate fleets of servers on AWS and on premises: patching, running commands, secure sessions without SSH, parameter storage, automation runbooks |
| **AWS Service Catalog** | Administrators publish approved products (CloudFormation templates) that users can launch by themselves |
| **AWS Control Tower** | Sets up and governs a multi-account environment (landing zone) following best practices |
| **AWS Organizations** | Groups accounts, with central policies and consolidated billing |

```yaml
# Minimal CloudFormation template: one S3 bucket with versioning
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  ReportsBucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
```

> **Exam tip.** "Deploy a web application without managing the infrastructure, by uploading the code" is Elastic Beanstalk. "Provision the same infrastructure in several Regions or accounts from a template" is CloudFormation. "Developers want to define infrastructure in a familiar programming language" is the AWS CDK.

<!-- section: one-time-repeatable | objectives: 3.1.5 -->
## One-time operations or repeatable processes

| Situation | Approach |
| --- | --- |
| Try a service, inspect a resource, fix one setting once | Console |
| The same task is run regularly (start or stop instances, export reports) | CLI script or SDK program, Systems Manager Automation |
| The same environment is needed in development, test and production, or in several Regions | IaC (CloudFormation or CDK) |
| Changes must be reviewed, versioned and reversible | IaC templates stored in version control |
| Business users launch standard resources without AWS expertise | Service Catalog products |

Benefits of repeatable processes: identical environments, fewer manual errors, faster deployment, an audit trail of what changed, and the ability to recreate everything after a failure (disaster recovery). The Well-Architected Framework calls this "perform operations as code".

> **Exam trap.** Clicking through the console is fine once. As soon as the stem says "consistent", "repeatable", "across multiple accounts" or "without manual errors", the answer is automation, usually CloudFormation.

<!-- section: deployment-models | objectives: 3.1.3, 3.1.6 -->
## Cloud deployment models

| Model | Definition | AWS examples |
| --- | --- | --- |
| **Cloud** (all-in) | All parts of the application run in the cloud, built there or migrated | A web application on EC2, RDS and S3; a serverless application on Lambda and DynamoDB |
| **Hybrid** | Connects cloud resources with existing resources that are not in the cloud, usually an on-premises data center | AWS Site-to-Site VPN or AWS Direct Connect between the data center and a VPC; AWS Storage Gateway; AWS Outposts |
| **On-premises** (private cloud) | Resources deployed in your own data center with virtualization and resource management tools | Few cloud benefits; chosen for dedicated resources |

**AWS Outposts** brings AWS infrastructure and services into your data center, for workloads that need low latency to on-premises systems or must keep data on site. It is a hybrid solution managed with the same AWS APIs and console.

The models are often combined with the service models:

| Service model | You manage | AWS example |
| --- | --- | --- |
| Infrastructure as a service (IaaS) | Operating system, runtime, application, data | Amazon EC2 |
| Platform as a service (PaaS) | Application and data | AWS Elastic Beanstalk |
| Software as a service (SaaS) | Only your use of the software and your data | A complete application delivered over the internet |

> **Exam tip.** "Keep some systems in the on-premises data center and connect them to AWS" is hybrid. "Run AWS services inside our own data center" is AWS Outposts.

<!-- section: key-points -->
## Key points

- Console for visual and one-off work, CLI for scripts, SDKs for application code, APIs underneath everything.
- CloudFormation: JSON or YAML templates deployed as stacks, repeatable, with rollback. CDK: the same with programming languages, through CloudFormation.
- Elastic Beanstalk: upload code, AWS runs it. Systems Manager: operate fleets. Service Catalog: approved self-service products.
- Repeatable, consistent, multi-account or multi-Region requirements mean IaC and automation.
- Deployment models: cloud, hybrid (connected to on premises; Outposts, VPN, Direct Connect), on-premises (private cloud).
