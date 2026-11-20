Protecting data as an operator means knowing which data is sensitive, encrypting it at rest and in transit, keeping credentials out of code and configuration files, and acting on the findings that security services produce. Questions usually describe a failure (a KMS access denied error, an expiring certificate, a hard-coded password, a high-severity finding) and ask for the fix with the least operational overhead. This chapter covers data classification, encryption at rest with AWS KMS and its troubleshooting, encryption in transit with ACM, secrets storage, and the reports and findings of Security Hub, GuardDuty, Config, Inspector, Macie and AWS Security Agent.

<!-- section: data-classification | objectives: 4.2.1 -->
## Implementing a data classification scheme

A classification scheme defines a few levels (for example public, internal, confidential, restricted), the controls each level requires (encryption key, access, retention, logging) and how every resource gets its level. On AWS the level is usually a **tag** (`classification=confidential`) that policies, rules and reports can read.

| Step | AWS mechanism |
| --- | --- |
| Discover sensitive data in S3 | Amazon Macie: automated sensitive data discovery samples every bucket continuously; discovery jobs analyze chosen buckets once or on a schedule |
| Detect your own data types (employee IDs, contract numbers) | Macie custom data identifiers (regex, keywords, proximity); allow lists to ignore known values |
| Standardize tag keys and values across accounts | Organizations tag policies |
| Refuse untagged resources | SCP with a `Null` condition on `aws:RequestTag/classification` for actions that support tags at creation |
| Report resources missing the tag | AWS Config rule `required-tags` |
| Grant access by level | ABAC conditions on `aws:ResourceTag/classification` and `aws:PrincipalTag` |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireClassificationTagOnVolumes",
      "Effect": "Deny",
      "Action": "ec2:CreateVolume",
      "Resource": "arn:aws:ec2:*:*:volume/*",
      "Condition": {
        "Null": { "aws:RequestTag/classification": "true" }
      }
    }
  ]
}
```

Macie creates **sensitive data findings** (an object contains, for example, card numbers or credentials) and **policy findings** (a bucket became public, lost default encryption or is shared outside the account). Findings go to EventBridge and, optionally, Security Hub CSPM, so a rule can tag the bucket, notify the data owner or start a runbook.

> **Exam trap.** Macie analyzes Amazon S3 only. "Find personal data in our S3 data lake" is Macie; "find unencrypted RDS instances" is an AWS Config rule, not Macie.

<!-- section: encryption-at-rest | objectives: 4.2.2 -->
## Configuring encryption at rest

AWS services encrypt at rest with **AWS KMS** keys. The choice that matters in operations is who controls the key: an **AWS managed key** (`aws/ebs`, `aws/rds`, `aws/s3`) has a fixed key policy and can't be shared with another account; a **customer managed key** has a key policy you write, optional automatic rotation (90 to 2,560 days), can be disabled, and can be shared.

| Service | How to turn it on | Existing unencrypted data |
| --- | --- | --- |
| Amazon EBS | Encryption by default, an account setting per Region, with the default key of your choice | Snapshot, copy the snapshot with encryption, create a volume from the copy |
| Amazon RDS, Aurora | Choose encryption and the key at creation | Snapshot, encrypted snapshot copy, restore to a new instance |
| Amazon S3 | Default encryption SSE-S3 for every new object; set SSE-KMS as bucket default for KMS control, with S3 Bucket Keys to reduce KMS requests | Copy objects in place with the new encryption (S3 Batch Operations for many objects) |
| Amazon EFS | Encryption at rest chosen at file system creation | New encrypted file system, copy the data (DataSync) |
| DynamoDB | Always encrypted; switch between AWS owned, AWS managed and customer managed keys at any time | Not needed |

```bash
aws ec2 enable-ebs-encryption-by-default --region eu-west-1
aws ec2 modify-ebs-default-kms-key-id \
  --kms-key-id alias/ebs-workloads --region eu-west-1
```

Deleting a key is irreversible: `ScheduleKeyDeletion` imposes a waiting period of 7 to 30 days (30 by default), during which the key is **Pending deletion**, unusable, and the deletion can be cancelled. When unsure, **disable** the key instead: re-enabling it restores access.

**Troubleshooting** encryption at rest:

| Symptom | Cause and fix |
| --- | --- |
| `AccessDenied` on `kms:Decrypt` although the IAM policy allows it | The key policy doesn't allow the principal or doesn't delegate to IAM; add the principal or the account statement |
| Another account can't copy a shared encrypted snapshot | Snapshot encrypted with an AWS managed key; re-encrypt with a customer managed key and share the key |
| An instance with encrypted volumes doesn't start | The KMS key is disabled or pending deletion (`KMSInvalidStateException`), or the caller lacks `kms:CreateGrant`; enable the key or fix the key policy |
| Access denied only through one service | A `kms:ViaService` condition limits the key to other services |
| `ThrottlingException` from KMS under heavy S3 load | Turn on S3 Bucket Keys, or request a higher KMS request quota |
| Objects uploaded without encryption headers aren't SSE-KMS | Set SSE-KMS as default encryption; deny `s3:PutObject` with another `s3:x-amz-server-side-encryption` value if required |

> **Exam trap.** CloudTrail records every use of a KMS key (`Decrypt`, `GenerateDataKey`) with the caller; it is the place to audit who decrypted data. An AWS owned key leaves no such trail in your account.

<!-- section: encryption-in-transit | objectives: 4.2.3 -->
## Configuring encryption in transit with ACM

**AWS Certificate Manager (ACM)** issues public certificates, valid for 198 days, after domain validation; DNS validation is recommended because it renews automatically. ACM deploys certificates to integrated services (Elastic Load Balancing, CloudFront, API Gateway); a certificate for CloudFront must be in US East (N. Virginia), one for a load balancer in the load balancer's Region. Imported certificates are never renewed by ACM. **AWS Private CA** issues private certificates for internal endpoints.

| Requirement | Configuration |
| --- | --- |
| HTTPS for users of a web application | HTTPS listener on the ALB with an ACM certificate and a current TLS security policy; HTTP listener that redirects to HTTPS |
| Encryption up to the instances | HTTPS target group on the ALB, or TLS listener on an NLB; a TCP listener passes TLS through to the targets |
| CloudFront always encrypted | Viewer protocol policy "Redirect HTTP to HTTPS" or "HTTPS only", origin protocol policy HTTPS |
| Clients must use TLS with an S3 bucket | Bucket policy that denies requests where `aws:SecureTransport` is false |
| Force TLS to the database | `rds.force_ssl` (PostgreSQL), `require_secure_transport` (MySQL) in the parameter group |

Troubleshooting certificates:

| Symptom | Fix |
| --- | --- |
| Certificate stays "Pending validation" | Create the CNAME record that ACM provides in the domain's DNS zone |
| Certificate not listed when configuring CloudFront | Request or import it in us-east-1 |
| DNS-validated certificate not renewed | The validation CNAME was deleted, or the certificate isn't used by an integrated service; restore the record |
| Browser error after an imported certificate expired | Reimport a renewed certificate; monitor imported certificates before expiry |

Monitoring: the `DaysToExpiry` metric (`AWS/CertificateManager`, dimension `CertificateArn`) supports a CloudWatch alarm; EventBridge receives **ACM Certificate Approaching Expiration** daily, by default from 30 days before expiry for public certificates and 45 days for private and imported ones (adjustable with `PutAccountConfiguration`), and **ACM Certificate Renewal Action Required** when automatic renewal fails.

> **Exam trap.** An expiring imported certificate is a monitoring and reimport problem, not a renewal setting. "Stop managing renewals" means requesting an ACM certificate with DNS validation instead of importing one.

<!-- section: secrets | objectives: 4.2.4 -->
## Storing secrets securely

| | AWS Secrets Manager | Systems Manager Parameter Store |
| --- | --- | --- |
| Content | Database credentials, API keys, any secret up to 64 KB | Configuration values; `SecureString` parameters encrypted with KMS |
| Rotation | Built in: managed rotation, or a Lambda rotation function | None built in |
| Cross-Region | Replicas of a secret in other Regions | No |
| Cross-account | Resource policy plus a customer managed KMS key | Advanced parameters can be shared |
| Cost | Per secret per month and per API call | Standard tier free; advanced tier charged |

Parameter Store tiers: **standard** (10,000 parameters per account and Region, 4 KB values, no policies) and **advanced** (100,000 parameters, 8 KB values, parameter policies such as expiration, sharing). A standard parameter can be upgraded; an advanced one can't go back to standard.

**Rotation** in Secrets Manager: many managed secrets (for example, an RDS master password with `--manage-master-user-password`) use **managed rotation** without Lambda; other secrets use a rotation function. Schedules run as often as every four hours (`rate(4 hours)`), in a rotation window of at least one hour, in UTC. Two strategies: **single user** (one user's password changes; simplest, suits most cases) and **alternating users** (two users, the function clones the first with a superuser secret; one set of credentials always stays valid, for high availability). Versions carry the staging labels `AWSCURRENT` (what applications get), `AWSPENDING` (during rotation) and `AWSPREVIOUS`.

Retrieve secrets at run time instead of copying them: CloudFormation dynamic references (`{{resolve:secretsmanager:...}}`, `{{resolve:ssm-secure:...}}`), the `secrets` section of an ECS task definition, the Parameters and Secrets Lambda extension. A deleted secret stays recoverable for a recovery window of 7 to 30 days (30 by default).

```bash
aws secretsmanager rotate-secret \
  --secret-id prod/orders/db \
  --rotation-rules '{"ScheduleExpression": "rate(30 days)"}'
```

> **Exam trap.** "Rotate the database password automatically every 30 days with the least effort" is Secrets Manager rotation. A `SecureString` parameter is encrypted but nobody rotates it for you.

<!-- section: security-findings | objectives: 4.2.5 -->
## Reporting and remediating security findings

| Service | What it finds | Typical remediation |
| --- | --- | --- |
| Amazon GuardDuty | Threats from CloudTrail management events, VPC flow logs and DNS logs, plus protection plans (S3, EKS, Runtime Monitoring, Malware Protection for EC2 and S3, RDS, Lambda); Extended Threat Detection correlates multi-stage attack sequences | Isolate the instance (restrictive security group), revoke credentials, snapshot for forensics |
| Amazon Inspector | Software vulnerabilities and network exposure in EC2 instances, ECR images and Lambda functions, with an Inspector score adjusted to your environment | Patch with Patch Manager, rebuild the image, update the dependency |
| AWS Config | Noncompliant configurations | Automatic remediation with an Automation runbook |
| Amazon Macie | Sensitive data and S3 bucket policy issues | Restrict access, encrypt, move the data |
| IAM Access Analyzer | External and unused access | Remove the grant or the unused permission |
| AWS Security Agent | Risks found by design reviews, code reviews (comments on pull requests) and on-demand penetration tests with validated findings; its penetration testing is now part of AWS Continuum | Fix the code or configuration, then retest |

**Two Security Hub products** aggregate these findings. **AWS Security Hub CSPM** runs security standards (AWS Foundational Security Best Practices, CIS, PCI DSS, NIST) as controls, needs AWS Config recording for most controls, uses the ASFF format, works per Region with cross-Region aggregation, and offers automation rules (update or suppress findings) and custom actions. **AWS Security Hub** correlates signals from Security Hub CSPM, GuardDuty, Inspector, Macie and Access Analyzer in the OCSF format, produces **exposure findings** with attack paths, and creates tickets in Jira Cloud or ServiceNow.

Every one of these services publishes findings to **EventBridge**, which is the standard path to automated response:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [{ "numeric": [">=", 7] }]
  }
}
```

Route high-severity findings to SNS for the on-call team and to a runbook that isolates the resource. Reduce noise at the source: GuardDuty **suppression rules** and trusted IP lists, Inspector suppression rules, Security Hub CSPM automation rules or disabled controls that don't apply.

> **Exam trap.** GuardDuty, Inspector and Security Hub CSPM detect and report; none of them fixes the resource by itself. The remediation is an EventBridge rule (or Config remediation) that starts Lambda or a Systems Manager Automation runbook.

<!-- section: key-points -->
## Key points

- Classification: tag the level, Macie for S3 discovery, tag policies and SCPs to enforce, `required-tags` to report.
- AWS managed keys can't be shared or edited; customer managed keys can; existing unencrypted EBS and RDS data is encrypted through an encrypted snapshot copy.
- KMS errors: key policy, key state, grants, `kms:ViaService`, throttling (S3 Bucket Keys); deletion waits 7 to 30 days, disabling is reversible.
- ACM: public certificates valid 198 days, DNS validation renews automatically, CloudFront certificates in us-east-1, imported certificates need monitoring and reimport.
- Secrets Manager rotates (managed or Lambda, as often as every 4 hours); Parameter Store standard 4 KB, advanced 8 KB with policies.
- Security Hub CSPM runs standards on Config data; Security Hub correlates findings into exposures; EventBridge drives remediation.
