Compliance is proving that a workload meets the rules of a law, a standard or an industry; governance is the set of controls that keep accounts and resources within those rules. The exam asks where to find compliance documents, which service records which logs, how data is encrypted and which service detects or audits what.

<!-- section: compliance-governance | objectives: 2.2.1 -->
## Compliance and governance concepts

- AWS infrastructure and services are audited by independent third parties against many **compliance programs** (for example SOC 1, SOC 2 and SOC 3, PCI DSS, ISO/IEC 27001, FedRAMP, HIPAA). A customer **inherits** the controls that AWS operates, which reduces its own audit work.
- AWS's compliance doesn't make the customer's workload compliant: the customer is still audited on its part of the shared responsibility model.
- **Governance** means central rules for many accounts: AWS Organizations applies **service control policies (SCPs)** that limit what member accounts can do; AWS Control Tower sets up a governed multi-account environment with preventive and detective controls; AWS Config rules check resources continuously.

<!-- section: cloud-security-benefits | objectives: 2.2.2 -->
## Benefits of cloud security

| Benefit | What it means |
| --- | --- |
| Encryption available everywhere | Most services encrypt data with a setting or by default, with keys managed in AWS KMS |
| Inherited controls | Physical security and the audited infrastructure come from AWS; no data center to secure |
| Visibility | Every API call can be logged (AWS CloudTrail) and every configuration recorded (AWS Config) |
| Automation | Security checks and responses run continuously, not in periodic manual reviews |
| Scale | Protections such as AWS Shield Standard are on by default for every customer |

<!-- section: encryption | objectives: 2.2.7 -->
## Encryption options

| Option | Protects | On AWS |
| --- | --- | --- |
| **Encryption at rest** | Stored data: disks, objects, databases, backups | Amazon S3 encrypts every new object by default (SSE-S3); Amazon EBS volumes and RDS databases are encrypted when you enable it (EBS encryption by default is a Regional setting); keys in **AWS KMS** |
| **Encryption in transit** | Data moving over a network | TLS (HTTPS) on AWS service endpoints and on your own applications, with certificates from **AWS Certificate Manager (ACM)**; IPsec tunnels of AWS Site-to-Site VPN |
| **Server-side encryption** | Data encrypted by the AWS service when it stores it | S3 options SSE-S3, SSE-KMS; RDS, EBS and DynamoDB encryption with KMS keys |
| **Client-side encryption** | Data encrypted by the customer before it is sent to AWS | The customer manages the process and the keys |

| Key service | Use |
| --- | --- |
| **AWS Key Management Service (AWS KMS)** | Create and control encryption keys, integrated with most services; every use of a key is logged in CloudTrail |
| **AWS CloudHSM** | Dedicated, single-tenant hardware security modules in your VPC, under your exclusive control |
| **AWS Certificate Manager (ACM)** | Provision and renew TLS certificates for load balancers, Amazon CloudFront and Amazon API Gateway |

> **Exam trap.** HTTPS, TLS and VPN tunnels are encryption **in transit**. Encrypting an EBS volume or an S3 object is encryption **at rest**. AWS KMS manages keys; ACM manages certificates.

<!-- section: security-logs | objectives: 2.2.3 -->
## Where security logs are captured

| Log | Records | Where it goes |
| --- | --- | --- |
| **AWS CloudTrail** | API calls and console actions: who, what, when, from where | Event history shows the last 90 days of management events by default; a **trail** stores events in an S3 bucket (and optionally CloudWatch Logs) for longer retention |
| **Amazon CloudWatch Logs** | Application, operating system and service logs | Log groups, searchable, with metric filters and alarms |
| **VPC Flow Logs** | IP traffic accepted or rejected by network interfaces of a VPC | CloudWatch Logs or Amazon S3 |
| **AWS Config** | Configuration changes of resources, and their history | Configuration history and snapshots in an S3 bucket |
| Service logs | S3 server access logs, Elastic Load Balancing access logs, CloudFront logs | Usually an S3 bucket |

<!-- section: compliance-information | objectives: 2.2.4, 2.2.5, 2.2.9 -->
## Compliance information, locations and industries

**AWS Artifact**, in the AWS Management Console, is the self-service portal for AWS compliance documents, at no cost:

- **Artifact Reports**: AWS's audit reports and certifications (SOC reports, PCI DSS attestation, ISO certificates) to give to your auditors;
- **Artifact Agreements**: review and accept agreements with AWS, such as the **Business Associate Addendum (BAA)** required to process protected health information under HIPAA.

Compliance needs depend on **where** and **in which industry** a company operates:

| Need | Example | How AWS helps |
| --- | --- | --- |
| Data must stay in a country or region | European personal data under GDPR, national data residency laws | Choose the Region; data stays there unless the customer moves it |
| US government workloads | FedRAMP, ITAR | AWS GovCloud (US) Regions |
| Health data (US) | HIPAA | BAA in AWS Artifact, HIPAA eligible services only |
| Payment card data | PCI DSS | PCI DSS attestation in AWS Artifact; services in scope of PCI DSS |

Compliance requirements also **vary among AWS services**: not every service is in scope of every program. The AWS page *AWS Services in Scope by Compliance Program* lists the services each program covers; a regulated workload uses only those.

> **Exam trap.** AWS Artifact gives **AWS's** reports and agreements; it doesn't check **your** resources. "Check continuously that every EBS volume is encrypted" is an AWS Config rule, not Artifact.

<!-- section: securing-resources | objectives: 2.2.6 -->
## How customers secure resources

| Service | What it does | Typical stem |
| --- | --- | --- |
| **Amazon GuardDuty** | Threat detection from CloudTrail events, VPC Flow Logs and DNS logs, without agents | "detect compromised instances", "unusual API calls", "crypto mining" |
| **Amazon Inspector** | Automated vulnerability management: scans EC2 instances, container images in Amazon ECR and Lambda functions for software vulnerabilities and unintended network exposure | "find unpatched software (CVEs) on instances" |
| **AWS Security Hub** | Gathers and prioritizes findings from GuardDuty, Inspector, Macie and other services across accounts; Security Hub CSPM checks resources against standards such as CIS and PCI DSS | "single view of security findings", "security score against a standard" |
| **AWS Shield** | DDoS protection: **Shield Standard** is automatic, at no additional cost; **Shield Advanced** is paid, with enhanced protection, the Shield Response Team and DDoS cost protection | "protect against DDoS attacks" |
| **Amazon Macie** | Discovers and protects sensitive data, such as personal data, in Amazon S3 | "find personally identifiable information in S3 buckets" |

> **Exam trap.** GuardDuty **detects threats** in activity logs; Inspector **finds vulnerabilities** in software; Security Hub **aggregates** findings. None of them blocks traffic: AWS WAF and AWS Shield do (chapter 24).

<!-- section: governance-services | objectives: 2.2.8 -->
## Services that aid governance and compliance

| Purpose | Service | What it answers |
| --- | --- | --- |
| Monitoring | **Amazon CloudWatch** | How resources perform: metrics, logs, alarms |
| Auditing activity | **AWS CloudTrail** | Who did what, when and from where |
| Auditing configuration | **AWS Config** | What a resource's configuration is and was, and whether it complies with rules |
| Reporting on access | **Access reports** | The IAM **credential report** lists every IAM user with the status of its password, access keys and MFA; **last accessed information** shows which services an identity (or, in AWS Organizations, an account) used and when |
| Central rules | **AWS Organizations** SCPs, **AWS Control Tower** controls | What member accounts may do, and whether accounts follow best practices |

<!-- section: key-points -->
## Key points

- At rest: S3 by default, EBS and RDS with KMS keys. In transit: TLS with ACM certificates, VPN. Keys: KMS; dedicated hardware: CloudHSM.
- Logs: CloudTrail (API calls, 90 days of event history, trails to S3), CloudWatch Logs, VPC Flow Logs, Config history.
- AWS Artifact: AWS's compliance reports and agreements (BAA). Location needs: choose the Region; GovCloud (US). Check the services in scope of each program.
- GuardDuty threats, Inspector vulnerabilities, Security Hub aggregation, Shield DDoS, Macie sensitive data in S3.
- CloudWatch monitors; CloudTrail and Config audit; access reports show credentials and permissions used.
