AWS gives you security building blocks, security documentation and places to learn about threats, but you choose and configure them. The exam asks you to match a need (block SQL injection, absorb a DDoS attack, detect a compromised instance, find a public snapshot) to the right AWS service, to know where AWS publishes security information, and to remember that third-party security products are also available through AWS Marketplace.

<!-- section: security-capabilities | objectives: 2.4.1 -->
## Security capabilities that AWS provides

Group the services by what they protect:

| Capability | AWS services |
| --- | --- |
| Identity and access | AWS Identity and Access Management (IAM), AWS IAM Identity Center, Amazon Cognito (users of your applications), AWS Directory Service |
| Network and application protection | Security groups and network ACLs, AWS WAF, AWS Shield, AWS Firewall Manager |
| Threat detection | Amazon GuardDuty |
| Vulnerability and sensitive data discovery | Amazon Inspector, Amazon Macie |
| Investigation and central view | Amazon Detective, AWS Security Hub and AWS Security Hub CSPM |
| Data protection | AWS Key Management Service (AWS KMS), AWS CloudHSM, AWS Certificate Manager (ACM), AWS Secrets Manager |
| Audit and compliance | AWS CloudTrail, AWS Config, AWS Artifact |

- **Security Hub CSPM** checks your resources against security standards and best practices (posture management). **Security Hub** correlates the findings of Security Hub CSPM, Inspector, Macie and GuardDuty, prioritizes the critical issues and offers automated response workflows. AWS recommends enabling both.
- Many of these services are built in and free (Shield Standard, security groups, IAM); others are paid and must be turned on (GuardDuty, Inspector, Macie, Shield Advanced).

<!-- section: protection-services | objectives: 2.4.3 -->
## AWS WAF, AWS Shield, AWS Firewall Manager and Amazon GuardDuty

| Service | What it does | Typical requirement |
| --- | --- | --- |
| **AWS WAF** | Web application firewall at layer 7: rules that allow, block or count HTTP(S) requests by IP address, country, rate, SQL injection or cross-site scripting patterns; managed rule groups | "Block SQL injection attacks against the website" |
| **AWS Shield Standard** | Automatic protection against common network and transport layer (layer 3 and 4) DDoS attacks, for every customer at no extra charge | "Basic DDoS protection without additional cost" |
| **AWS Shield Advanced** | Paid subscription: enhanced DDoS protection of the resources you choose, access to the Shield Response Team, DDoS cost protection | "24/7 DDoS response team" or "protect against scaling charges caused by an attack" |
| **AWS Firewall Manager** | Central management of WAF rules, Shield Advanced protections and security groups across all accounts of an AWS Organizations organization, including new accounts and resources | "Apply the same firewall rules to every account" |
| **Amazon GuardDuty** | Threat detection that continuously analyzes CloudTrail events, VPC Flow Logs and DNS logs to find malicious or unauthorized activity; produces findings | "Detect cryptocurrency mining or unusual API calls" |

- AWS WAF attaches to Amazon CloudFront distributions, Application Load Balancers, Amazon API Gateway REST APIs and a few other services, not directly to an EC2 instance.
- Firewall Manager requires AWS Organizations: it is a governance tool for many accounts, not a firewall by itself.
- GuardDuty finds threats; it does not block them. Amazon Inspector finds software vulnerabilities; Amazon Macie finds sensitive data in Amazon S3.

> **Exam trap.** Shield protects against DDoS floods; WAF filters web requests by content. "SQL injection" or "cross-site scripting" is always AWS WAF, never Shield. "Same rules across many accounts" adds Firewall Manager.

<!-- section: identifying-issues | objectives: 2.4.6 -->
## Identifying security issues with AWS Trusted Advisor and other services

**AWS Trusted Advisor** inspects your account and recommends improvements following AWS best practices. Its checks are grouped in six categories: cost optimization, performance, security, fault tolerance, service limits and operational excellence.

| Support plan | Trusted Advisor checks |
| --- | --- |
| Basic Support | All service limits checks, plus selected security and fault tolerance checks; security checks are refreshed manually |
| Business Support+, Enterprise Support, Unified Operations | All checks, in the console and through the Trusted Advisor API |

The security checks available to every customer: **Amazon S3 Bucket Permissions** (open buckets), **Security Groups – Specific Ports Unrestricted**, **MFA on root account**, **Amazon EBS Public Snapshots** and **Amazon RDS Public Snapshots**.

Other services that identify security issues:

| Need | Service |
| --- | --- |
| Best-practice recommendations across cost, security and resilience | AWS Trusted Advisor |
| Software vulnerabilities (CVEs) and unintended network exposure of EC2 instances, container images and Lambda functions | Amazon Inspector |
| Malicious activity in the account | Amazon GuardDuty |
| Resources that don't comply with security standards | AWS Security Hub CSPM |
| Configuration changes and noncompliant resources against your rules | AWS Config |

> **Exam tip.** "Which service checks whether the root user has MFA or a security group allows unrestricted access, and is available with Basic Support?" is Trusted Advisor. It recommends; it does not scan the operating system for vulnerabilities (that is Inspector).

<!-- section: marketplace-security | objectives: 2.4.4 -->
## Third-party security products in AWS Marketplace

**AWS Marketplace** is a curated digital catalog of software from independent software vendors, ready to run on AWS. It includes a security category: firewalls and intrusion prevention appliances, endpoint protection, vulnerability management, identity, and security information and event management (SIEM) tools.

- You find, subscribe to and deploy a product in your account, often as an AMI, a container or a SaaS subscription.
- The charges appear on your AWS bill.
- Use it when the company already standardizes on a security vendor, or needs a capability that it prefers to buy from a partner.

> **Exam tip.** "The company wants to use a third-party firewall product it already knows" points to AWS Marketplace, not to building the product yourself.

<!-- section: security-information | objectives: 2.4.2, 2.4.5 -->
## Security documentation and sources of information

| Source | What you find there |
| --- | --- |
| **AWS Security Center** (the security section of the AWS website) | Overview of AWS security, compliance programs, security bulletins, how to report a vulnerability |
| **AWS Security Blog** | Announcements, walkthroughs and best practices written by AWS security experts |
| **AWS Knowledge Center** (part of AWS re:Post) | Answers to the questions AWS customers ask most often, including security how-tos and troubleshooting |
| **AWS documentation** | A security chapter in each service guide (for example, how S3 encrypts data) and the security documentation index |
| **Security pillar of the AWS Well-Architected Framework**, AWS whitepapers | Design principles and best practices for securing workloads |
| **AWS Artifact** | On-demand compliance reports (for example, SOC and ISO reports) and agreements |
| **AWS Trusted Advisor**, **Security Hub** | Recommendations and findings about your own account |

> **Exam trap.** AWS Artifact gives AWS's compliance reports; it doesn't evaluate your resources. Your own account's security status comes from Trusted Advisor, Security Hub or AWS Config.

<!-- section: key-points -->
## Key points

- WAF: layer 7 web filtering (SQL injection, XSS, IP, geography, rate). Shield Standard: free, automatic DDoS protection. Shield Advanced: paid, response team and cost protection.
- Firewall Manager: the same WAF, Shield Advanced and security group rules across every account of an organization.
- GuardDuty detects threats, Inspector finds vulnerabilities, Macie finds sensitive data, Security Hub gives the central, prioritized view.
- Trusted Advisor: best-practice checks in six categories; Basic Support gets service limits plus selected security checks (S3 permissions, open ports, root MFA, public EBS and RDS snapshots).
- Third-party security tools: AWS Marketplace, billed through AWS.
- Information: Security Center, Security Blog, Knowledge Center, service documentation, Well-Architected security pillar, Artifact for compliance reports.
