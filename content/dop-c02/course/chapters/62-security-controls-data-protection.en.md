Security control questions in DOP-C02 are automation questions: how to apply the same network rules, encryption, certificate renewals and data discovery to every account and Region, and keep them applied. Expected answers use delegated administrators, organization-wide policies and event-driven remediation, layered so that one failed control is not a breach.

<!-- section: network-security | objectives: 6.2.1 -->
## Network security components

| Control | Level | Stateful or type | Rules | Typical use |
| --- | --- | --- | --- | --- |
| Security group | ENI (instance, task, endpoint, load balancer) | Yes | Allow only; can reference other security groups | Micro-segmentation between tiers |
| Network ACL | Subnet | No: allow return ephemeral ports explicitly | Allow and deny, in number order | Block an IP range at the subnet edge |
| Route table | Subnet, gateway | n/a | Routes | Force traffic through an inspection endpoint |
| AWS Network Firewall | Firewall endpoints in dedicated subnets | Stateless and stateful rule groups | Suricata-compatible rules, domain lists, IP and port rules | Egress domain filtering, IDS/IPS |
| AWS WAF | CloudFront, ALB, API Gateway REST API, AppSync, Cognito user pool | Layer 7 | Managed rule groups, rate-based rules, IP sets, Bot Control | SQL injection, XSS, bots, HTTP floods |
| AWS Shield Standard | Edge and Regional | Automatic | Nothing to configure | Common network and transport layer DDoS |
| AWS Shield Advanced | CloudFront, Route 53, Global Accelerator, ELB, Elastic IP | Paid | Protections per resource, health-based detection | DDoS cost protection, Shield Response Team, automatic layer 7 mitigation with WAF |

Network Firewall only inspects traffic that routing sends to its endpoints; at scale, a central **inspection VPC** attached to a Transit Gateway inspects east-west and egress traffic for all VPCs.

**AWS Firewall Manager** applies WAF, Shield Advanced, security group (common groups, audit of permissive rules), Network Firewall, DNS Firewall and third-party firewall policies across an organization. Prerequisites: AWS Organizations, a Firewall Manager administrator account, **AWS Config enabled** in the accounts, AWS RAM sharing for Network Firewall and DNS Firewall policies. New accounts and resources in scope are protected automatically.

> **Exam trap.** A stateless network ACL that allows inbound port 443 but not outbound ephemeral ports breaks the responses. A security group cannot deny: to block a specific malicious IP range, use a network ACL deny or a WAF IP set.

<!-- section: certificates-pki | objectives: 6.2.2 -->
## Certificates and PKI

**AWS Certificate Manager (ACM)** issues public certificates (valid 198 days) and manages private certificates from **AWS Private CA**.

| Fact | Detail |
| --- | --- |
| Validation | DNS (CNAME record, recommended), email, or HTTP for CloudFront distribution tenants |
| Managed renewal | Automatic for DNS-validated certificates that are in use (associated with a service or exported); the ARN stays the same. Keep the validation CNAME in place |
| Imported certificates | Never renewed by ACM: reimport before expiry |
| Region | Certificates are regional; for CloudFront, request or import the certificate in `us-east-1` |
| Export | Public certificates created from June 17, 2025 can be exported with a passphrase-protected private key; private certificates can be exported for instances and on-premises servers |

Expiration automation relies on events:

| EventBridge event | When |
| --- | --- |
| `ACM Certificate Approaching Expiration` | Daily, starting 30 days before expiry for public certificates and 45 days for private and imported ones (configurable with `PutAccountConfiguration`) |
| `ACM Certificate Renewal Action Required` | Automatic renewal failed and needs action |
| `ACM Certificate Expired` | At expiry (not for imported certificates) |
| `ACM Certificate Available` | Issued, renewed or imported |

The AWS Config managed rule `acm-certificate-expiration-check` also flags certificates close to expiry.

> **Exam trap.** "Certificates on the load balancer expire and someone renews them by hand" is fixed with ACM certificates validated by DNS, not with a Lambda function. Only imported certificates need reimport automation on the expiration event.

<!-- section: data-management | objectives: 6.2.3 -->
## Data management: classification, keys and access

**Classify** data with resource tags (for example `data-classification=confidential`), standardized with tag policies and required at creation with `aws:RequestTag` in SCPs; Macie finds what is actually stored. Classification drives the KMS key, access, retention and backup.

**AWS KMS keys**

| Key type | Control | Rotation |
| --- | --- | --- |
| AWS owned | None; used by the service | Decided by the service |
| AWS managed (`aws/s3`, `aws/ebs`) | View only; key policy fixed; usable only in your account through that service | Every year, automatically |
| Customer managed | Key policy, grants, enable and disable, deletion with a waiting period | Optional automatic rotation (default every 365 days, custom period with `RotationPeriodInDays`) and on-demand rotation |

- Automatic rotation applies to symmetric keys with AWS KMS key material; asymmetric, HMAC and custom key store keys rotate manually; imported material supports on-demand rotation only. Multi-Region keys rotate from the primary key.
- The **key policy** is the primary control: IAM policies work only if it lets the account delegate (the default key policy does). **Grants** give programmatic use of a key to a principal (EBS uses them). `kms:ViaService` limits use to one service; the **encryption context** binds ciphertext to metadata and appears in CloudTrail.
- Cross-account use needs the key policy to allow the other account **and** an IAM policy in that account.
- **Multi-Region keys** share key material and ID across Regions, so data encrypted in one Region decrypts in another (DR, global tables).

**Access controls**: S3 Block Public Access, bucket policies with `aws:PrincipalOrgID` or `aws:SourceVpce`, Object Ownership with ACLs disabled, S3 Object Lock and AWS Backup Vault Lock for immutable data.

> **Exam trap.** Deleting a customer managed key makes all data encrypted with it unreadable. A key that may be needed again is disabled, not deleted; deletion always has a waiting period.

<!-- section: multi-account-automation | objectives: 6.2.4 -->
## Automating security controls across accounts and Regions

The pattern is the same for every security service: enable trusted access in AWS Organizations, designate a **delegated administrator** (usually a security tooling account), and let the service auto-enable new accounts.

| Service | Organization-wide automation |
| --- | --- |
| AWS Control Tower | Landing zone, Account Factory for new accounts, controls applied per OU |
| AWS Security Hub CSPM | Delegated administrator, home Region with linked Regions for cross-Region aggregation, organization-wide configuration of standards and controls |
| Amazon GuardDuty, Amazon Inspector, Amazon Macie, Amazon Detective | Delegated administrator, auto-enable for new member accounts |
| AWS Config | Organization rules and conformance packs, aggregator |
| AWS Firewall Manager | Security policies applied to OUs or accounts |
| AWS Systems Manager | Quick Setup configurations (patch policies, Default Host Management Configuration) across the organization |
| AWS CloudFormation StackSets | Service-managed permissions, automatic deployment to accounts added to the target OUs |
| SCPs, RCPs, declarative policies | Preventive guardrails attached to OUs |

**AWS Control Tower controls** have three behaviors:

| Behavior | Implemented with | Effect |
| --- | --- | --- |
| Preventive | SCPs, RCPs, declarative policies | Blocks the action |
| Detective | AWS Config rules | Reports noncompliant resources |
| Proactive | CloudFormation Hooks | Blocks noncompliant resources in CloudFormation before provisioning |

Controls are mandatory, strongly recommended or elective, enabled per OU and inherited by every enrolled account. Customizations for AWS Control Tower or Account Factory for Terraform add baseline resources to new accounts.

**Security Hub CSPM** at scale: the delegated administrator picks a **home Region** that aggregates findings from linked Regions and sets the standards (AWS Foundational Security Best Practices, CIS, PCI DSS, NIST), controls and parameters for the root, OUs or accounts. Central configuration is now a legacy feature; AWS recommends Security Hub CSPM policies in AWS Organizations (the two cannot be combined). Security Hub CSPM requires AWS Config. The current **AWS Security Hub** enables Security Hub CSPM automatically and correlates CSPM, GuardDuty, Inspector and Macie signals into exposure findings (OCSF format).

> **Exam tip.** "Every new account must automatically get GuardDuty, Security Hub CSPM and baseline Config rules" means delegated administrators with auto-enable, plus Control Tower or StackSets automatic deployment. A Lambda function looping over accounts is the distractor.

<!-- section: defense-in-depth | objectives: 6.2.5 -->
## Combining controls for defense in depth

| Layer | Preventive controls | Detective controls |
| --- | --- | --- |
| Edge | CloudFront with ACM certificates, AWS WAF, Shield | WAF logs, Shield events |
| Network | Network Firewall, network ACLs, security groups, private subnets, VPC endpoints | VPC Flow Logs, GuardDuty |
| Compute | IMDSv2, Systems Manager patching, hardened AMIs from Image Builder | Amazon Inspector, GuardDuty Runtime Monitoring |
| Identity | SCPs, permissions boundaries, MFA, least-privilege roles | IAM Access Analyzer, CloudTrail |
| Data | KMS encryption, S3 Block Public Access, Object Lock | Macie, AWS Config rules |
| Posture and response | Control Tower controls, Config remediation | Security Hub CSPM, Amazon Detective for investigation |

A typical response chain: a GuardDuty finding matches an EventBridge rule on type and severity, an Automation runbook or Step Functions workflow isolates the instance (isolation security group, volume snapshots, tag) and notifies through SNS; Detective then supports the investigation.

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [{"numeric": [">=", 7]}],
    "resource": {"resourceType": ["Instance"]}
  }
}
```

> **Exam trap.** GuardDuty, Inspector, Macie and Security Hub CSPM detect and report; none of them blocks traffic or changes a resource by itself. The remediation is always an added automation (EventBridge plus Lambda, Step Functions or Automation) or a preventive control.

<!-- section: sensitive-data-discovery | objectives: 6.2.6 -->
## Automating sensitive data discovery with Amazon Macie

Macie analyzes objects in S3 general purpose buckets:

| Mode | Behavior | Use |
| --- | --- | --- |
| Automated sensitive data discovery | Evaluates the bucket inventory daily and samples representative objects | Continuous, cost-controlled visibility across the whole S3 estate |
| Sensitive data discovery job | Analyzes the objects you scope (buckets, object criteria), once or on a schedule (daily, weekly, monthly) | Deep analysis of specific buckets, compliance evidence |

- Detection uses **managed data identifiers** (credentials, financial and personal data), **custom data identifiers** (a regex plus optional keywords and proximity) and **allow lists** (text to ignore).
- Macie also generates **policy findings** on bucket security (public access, encryption disabled, external sharing).
- Findings go to EventBridge and, per settings, to Security Hub CSPM, for automated responses (tag or quarantine the object, notify the owner).
- Discovery results are kept 90 days; for longer retention, configure a repository: an S3 bucket with a customer managed symmetric KMS key in the same Region.
- Macie must be able to read objects: a key policy or bucket policy that excludes Macie leaves objects unanalyzed.
- Multi-account: delegated Macie administrator, auto-enable for new accounts, automated discovery enabled centrally.

> **Exam tip.** "Discover PII in all buckets of 200 accounts, including new ones, with the least operational overhead" is Macie with a delegated administrator and automated sensitive data discovery. Athena queries or custom Lambda scanners are distractors.

<!-- section: encryption | objectives: 6.2.7 -->
## Encrypting data in transit and at rest

**In transit**: TLS terminated with ACM certificates on CloudFront, load balancers and API Gateway, with a security policy that excludes old protocols; re-encrypt to targets when end-to-end encryption is required. Enforce TLS for S3 with a bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyInsecureTransport",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::example-data", "arn:aws:s3:::example-data/*"],
    "Condition": {"Bool": {"aws:SecureTransport": "false"}}
  }]
}
```

Databases enforce TLS with parameters (for example `rds.force_ssl` for RDS for PostgreSQL).

**At rest**

| Service | Key facts |
| --- | --- |
| Amazon S3 | New objects are encrypted with SSE-S3 by default; choose SSE-KMS (with **S3 Bucket Keys** to cut KMS requests and cost), DSSE-KMS or SSE-C. Encrypt existing objects with S3 Batch Operations copy |
| Amazon EBS | **Encryption by default** is an account setting per Region; snapshots of encrypted volumes stay encrypted. Encrypt an existing volume by copying its snapshot with encryption and creating a new volume |
| Amazon RDS and Aurora | Encryption is chosen at creation. Encrypt an existing database by copying a snapshot with a KMS key and restoring it |
| DynamoDB, SQS, SNS, CloudWatch Logs | Server-side encryption with AWS owned, AWS managed or customer managed KMS keys |

**Key stores**

| Requirement | Answer |
| --- | --- |
| AWS manages the HSMs, keys integrated with AWS services | AWS KMS |
| Single-tenant HSMs you control, keys used directly by your applications (PKCS#11, JCE) | AWS CloudHSM cluster |
| KMS integration but key material in HSMs you control | KMS custom key store backed by a CloudHSM cluster |
| Key material must stay outside AWS | KMS external key store |

> **Exam trap.** Changing an RDS instance or an existing EBS volume from unencrypted to encrypted in place is not possible: the answer always goes through an encrypted snapshot copy and a restore or a new volume, with a cutover.

<!-- section: key-points -->
## Key points

- Security groups: stateful allow; network ACLs: stateless with deny; Network Firewall needs routing; Firewall Manager (requires AWS Config) applies controls organization-wide.
- ACM public certificates (198 days) renew automatically when DNS-validated and in use; imported ones never do; CloudFront uses `us-east-1`.
- KMS key policy first, then IAM; multi-Region keys for cross-Region decryption.
- Delegated administrators with auto-enable, Control Tower controls and StackSets secure new accounts automatically; detection services never remediate alone.
- RDS and existing EBS volumes are encrypted through an encrypted snapshot copy, never in place.
