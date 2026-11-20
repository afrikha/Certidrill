Data security questions name a type of data (customer records, reports, logs, backups) and a constraint: who may read it, how long to keep it, how to encrypt it and with which key, or how to recover it. This chapter covers data access and governance, classification and retention, encryption at rest, key policies, encryption in transit, key rotation and certificate renewal, and backups and replication.

<!-- section: data-governance | objectives: 1.3.1, 1.3.5 -->
## Data access, governance and compliance

Amazon S3 access is decided by several layers; all must allow and any explicit deny wins:

| Control | Use |
| --- | --- |
| IAM policies | What a user or role of your account may do |
| Bucket policy | Who may access the bucket, from other accounts, through which endpoint or from which organization |
| S3 Block Public Access | Overrides any public ACL or policy; set at organization, account, bucket or access point level, the most restrictive wins |
| Object Ownership: bucket owner enforced | The default for new buckets: ACLs are disabled, the bucket owner owns every object, access is governed by policies only |
| S3 Access Points | One named entry point per application or team, each with its own policy, optionally restricted to a VPC |
| Presigned URL | Temporary access to one object for someone without AWS credentials |

For a data lake, **AWS Lake Formation** grants database, table, column and row-level permissions on data cataloged in the AWS Glue Data Catalog, centrally for Athena, Redshift Spectrum and EMR, instead of writing bucket policies per prefix.

Compliance requirements map to services:

| Requirement | Service |
| --- | --- |
| Download AWS's SOC or PCI DSS reports, accept a business associate addendum | AWS Artifact |
| Record every configuration change and evaluate resources against rules (encryption enabled, no public bucket) | AWS Config rules, conformance packs |
| Record who did what through the API, in every account | AWS CloudTrail, an organization trail to a central log archive bucket |
| Check accounts continuously against PCI DSS or CIS benchmarks | AWS Security Hub CSPM standards |
| Prevent noncompliant actions in member accounts | SCPs or Control Tower preventive controls |
| Keep data in one country | Choose the Region, deny the others with an SCP |

> **Exam trap.** AWS Artifact gives AWS's own compliance reports; it doesn't assess your resources. "Continuously check that every EBS volume is encrypted" is an AWS Config rule.

<!-- section: classification-retention | objectives: 1.3.3, 1.3.10 -->
## Data classification, retention and lifecycle

**Classify first**: Amazon Macie discovers sensitive data (names, addresses, card numbers, credentials) in S3 with managed and custom data identifiers, by automated discovery or by jobs, and flags public or unencrypted buckets. Tag the results (`classification=confidential`) and use the tags in policies and lifecycle rules.

**Retain** with the right mechanism:

| Requirement | Answer |
| --- | --- |
| Objects can't be deleted or overwritten by anyone, root user included, for 7 years | S3 Object Lock in compliance mode with a 7-year retention period |
| Same protection, but a few authorized administrators may shorten it | S3 Object Lock in governance mode; they need `s3:BypassGovernanceRetention` |
| Keep specific objects indefinitely during litigation | Object Lock legal hold, removed by a user with `s3:PutObjectLegalHold` |
| Backups can't be deleted before their retention ends, even by administrators | AWS Backup Vault Lock in compliance mode |
| Recover from accidental overwrites and deletions | S3 Versioning, with MFA Delete for extra protection |
| Delete logs after 400 days automatically | S3 Lifecycle expiration rule, or CloudWatch Logs retention setting |

Object Lock requires versioning and works on object versions; a bucket can have a default retention mode and period. Compliance mode can't be shortened or removed; the only way to delete such a version before its date is to close the account.

**S3 Lifecycle** rules transition objects to cheaper classes and expire them. Minimum storage durations matter: S3 Standard-IA and S3 One Zone-IA charge at least 30 days, S3 Glacier Instant Retrieval and S3 Glacier Flexible Retrieval at least 90 days, S3 Glacier Deep Archive at least 180 days; objects must be 30 days old before a lifecycle transition to Standard-IA or One Zone-IA. With versioning, add noncurrent version expiration, otherwise old versions accumulate.

> **Exam trap.** Governance mode and legal holds can be removed by authorized users; only compliance mode satisfies "no one, including the root user". Choose governance mode when the stem keeps an exception for administrators or asks to test retention settings first.

<!-- section: encryption-at-rest | objectives: 1.3.4, 1.3.6 -->
## Encryption at rest and key management

AWS KMS uses **envelope encryption**: a data key encrypts the data, and a KMS key, which never leaves the service's HSMs unencrypted, encrypts the data key.

| KMS key | Owned and managed by | Key policy | Rotation | Cost | Choose it when |
| --- | --- | --- | --- | --- | --- |
| AWS owned key | The service, in an AWS account | Not visible | Managed by the service | None | Default encryption with no control needed |
| AWS managed key (`aws/s3`, `aws/ebs`) | The service, in your account | Visible, not editable | Every year, automatic | Per-use only | Encryption visible in CloudTrail, no key administration |
| Customer managed key | You | Yours to write | Optional, automatic or on demand | Monthly fee plus per-use | Control who uses the key, cross-account sharing, disable or schedule deletion, custom rotation |

Encryption by service:

| Service | Encryption at rest |
| --- | --- |
| Amazon S3 | Every new object is encrypted, SSE-S3 by default. Options: SSE-KMS (KMS key, auditable, with **S3 Bucket Keys** to cut KMS request costs), DSSE-KMS (two layers), SSE-C (your key, sent with each request; disabled by default for new buckets since April 2026), or client-side encryption |
| Amazon EBS | Encryption by default is a per-Region account setting for new volumes and snapshot copies; the default key is `aws/ebs` or a customer managed key. An existing unencrypted volume is encrypted by snapshot, encrypted copy, then new volume |
| Amazon RDS, Aurora | Chosen at creation; covers storage, logs, automated backups, snapshots and read replicas. To encrypt an existing instance: snapshot, copy the snapshot with encryption, restore. Encryption can't be turned off |
| DynamoDB | Always encrypted; AWS owned key by default, or an AWS managed or customer managed key |
| Amazon EFS | Encryption at rest is chosen when the file system is created, with KMS |

**Multi-Region keys** share key material and key ID across Regions, so data encrypted in one Region decrypts in another without a re-encryption call. **AWS CloudHSM** provides single-tenant HSMs validated at FIPS 140-2 or FIPS 140-3 Level 3 (in FIPS mode) whose users and keys you manage, for requirements such as "keys in a dedicated HSM under our exclusive control"; a KMS custom key store backed by CloudHSM keeps the KMS integrations.

> **Exam trap.** An encrypted EBS snapshot or RDS snapshot shared with another account must use a customer managed key: the key policy of an AWS managed key can't be changed to let another account use it.

<!-- section: key-policies | objectives: 1.3.8 -->
## Access policies for encryption keys

Every KMS key has exactly one **key policy**, and it is the primary control: IAM policies grant KMS permissions only if the key policy allows it, typically through this default statement that delegates to IAM in the account:

```json
{
  "Sid": "Enable IAM User Permissions",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
  "Action": "kms:*",
  "Resource": "*"
}
```

Design the policy with separate statements for **key administrators** (`kms:Create*`, `kms:Put*`, `kms:Enable*`, `kms:ScheduleKeyDeletion`, but no cryptographic use) and **key users** (`kms:Encrypt`, `kms:Decrypt`, `kms:ReEncrypt*`, `kms:GenerateDataKey*`, `kms:DescribeKey`). Useful conditions:

| Need | Mechanism |
| --- | --- |
| Use the key only through one service (S3 in eu-west-1) | Condition `kms:ViaService` |
| Let another account use the key | Key policy naming that account, plus an IAM policy in that account |
| Give an AWS service temporary, scoped use of a key (EBS attaching an encrypted volume) | Grants, created and retired programmatically |
| Prevent anyone from deleting keys | Deny `kms:ScheduleKeyDeletion` in an SCP, except for a break-glass role |
| Find keys shared outside the organization | IAM Access Analyzer external access findings |

> **Exam tip.** "Separation of duties between those who manage keys and those who use them" is solved in the key policy: administrators without `kms:Decrypt`, users without `kms:PutKeyPolicy`.

<!-- section: encryption-in-transit | objectives: 1.3.7 -->
## Encryption in transit

Encrypt every hop that crosses a trust boundary with TLS:

| Path | How |
| --- | --- |
| Users to CloudFront or a load balancer | HTTPS listener with an ACM certificate; redirect HTTP to HTTPS |
| CloudFront to the origin | Origin protocol policy HTTPS only |
| Load balancer to targets | HTTPS target group (ALB) or TLS listener (NLB) when end-to-end encryption is required; a TCP listener on an NLB passes TLS through to the instances |
| Application to RDS, Aurora, ElastiCache, Redshift | TLS connections; enforce them with the engine's parameter (for example `rds.force_ssl` for PostgreSQL) |
| Clients to S3 | Bucket policy denying requests where `aws:SecureTransport` is false |
| On-premises to AWS | Site-to-Site VPN, MACsec on Direct Connect |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-corp-records", "arn:aws:s3:::example-corp-records/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

**AWS Certificate Manager (ACM)** issues public certificates trusted by browsers, validated by DNS or email, valid for 198 days, and deploys them to integrated services (ELB, CloudFront, API Gateway). Certificates are Regional: a certificate for CloudFront must be requested in US East (N. Virginia), one for an ALB in the ALB's Region. Public certificates created on or after June 17, 2025 can be exported for use outside integrated services. **AWS Private CA** issues private certificates for internal services and mutual TLS.

> **Exam trap.** A certificate requested in eu-west-1 can't be selected for a CloudFront distribution. Request or import it in us-east-1.

<!-- section: rotation-renewal | objectives: 1.3.11 -->
## Rotating keys and renewing certificates

| Item | Rotation or renewal |
| --- | --- |
| Customer managed KMS key, symmetric, AWS key material | Automatic rotation, optional, every 90 to 2,560 days (365 by default); on-demand rotation at any time |
| AWS managed KMS key | Rotated automatically every year; can't be changed |
| Imported key material | No automatic rotation; on-demand rotation only |
| Asymmetric, HMAC and custom key store keys | No automatic rotation: create a new key and move the alias |
| ACM certificate, DNS validated, in use | Renewed automatically from 45 days before expiry; the ARN doesn't change |
| Imported certificate in ACM | Not renewed by ACM; monitor expiry (AWS Config rule `acm-certificate-expiration-check`, EventBridge) and reimport |
| Database password | Secrets Manager managed rotation |
| IAM access keys | Rotate or remove; find unused keys with IAM Access Analyzer |

Rotation keeps the key ID, ARN and old key material, so older data still decrypts with no application change. Rotation doesn't re-encrypt existing data. Moving an alias to a new key is the manual method: applications that use the alias follow it.

If ACM can't validate a domain at renewal (a DNS CNAME record deleted, for example), it sends AWS Health and EventBridge events 30, 15, 7, 3 and 1 days before expiry.

> **Exam trap.** "Rotate the key every 90 days with the least operational overhead" is automatic rotation of a customer managed key with a 90-day period, not a new key and a Lambda function. The yearly rotation of AWS managed keys can't be shortened.

<!-- section: backup-replication | objectives: 1.3.2, 1.3.9 -->
## Backups, replication and data recovery

**AWS Backup** centralizes backups of EC2, EBS, RDS, Aurora, DynamoDB, EFS, FSx, S3 and other services: a **backup plan** (schedule, retention, lifecycle to cold storage, copy rules) assigned to resources by tag, stored in **backup vaults**. Copy rules send recovery points to another Region or account; across an organization, backup policies apply plans to every account.

| Protection need | AWS Backup feature |
| --- | --- |
| Backups immutable for their retention, against administrators and attackers | Vault Lock in compliance mode (after a grace time of at least 3 days, the lock can't be removed) |
| Backups that a compromised production account can't touch | Copy to a vault in a separate backup account, or a logically air-gapped vault (always locked in compliance mode, shareable for restore with AWS RAM) |
| Prove that backups ran and comply | AWS Backup Audit Manager reports |

Service-level options:

| Data | Recovery feature |
| --- | --- |
| Amazon S3 | Versioning; replication (requires versioning on source and destination): CRR to another Region, SRR in the same Region; S3 Replication Time Control replicates most objects within 15 minutes, with an SLA; S3 Batch Replication copies existing objects |
| Amazon RDS | Automated backups with point-in-time restore within the retention period (up to 35 days), manual snapshots kept until deleted, cross-Region snapshot copies or automated backup replication |
| DynamoDB | Point-in-time recovery to any second of the last 1 to 35 days (35 by default), on-demand backups; restores create a new table |
| Amazon EBS | Incremental snapshots, automated by Amazon Data Lifecycle Manager or AWS Backup, copied across Regions; Recycle Bin recovers deleted snapshots |

| Requirement | Answer |
| --- | --- |
| Recover a DynamoDB table to its state of 10 minutes ago | Point-in-time recovery |
| Copy objects to another Region within minutes, with a guarantee | CRR with S3 Replication Time Control |
| Replicate objects that already exist in the bucket | S3 Batch Replication |
| One policy for backups of every account and service, with cross-Region copies | AWS Backup plans and organization backup policies |
| Replicate SSE-KMS objects to another Region | Replication rule with SSE-KMS replication enabled and a KMS key in the destination Region |

> **Exam trap.** Replication isn't a backup: a deletion or an overwrite is replicated too, apart from what versioning keeps. Ransomware and accidental deletion call for versioning, Object Lock or locked backup vaults.

<!-- section: key-points -->
## Key points

- S3 access: IAM, bucket policy, Block Public Access, ACLs disabled by default; Lake Formation for data lake permissions.
- Macie classifies S3 data; Object Lock compliance mode: no one can delete; governance mode: authorized bypass.
- AWS owned, AWS managed, customer managed keys: only customer managed keys can be shared and administered.
- RDS encryption is set at creation; encrypt later through an encrypted snapshot copy.
- Key policies are mandatory; IAM works only if the key policy delegates to it; grants for services.
- ACM certificates for CloudFront live in us-east-1; DNS validation renews automatically; imported ones don't.
- KMS rotation keeps the key ID and old material; 90 to 2,560 days for customer managed keys.
- Backups are immutable with Vault Lock and separated in another account; replication alone is not a backup.
