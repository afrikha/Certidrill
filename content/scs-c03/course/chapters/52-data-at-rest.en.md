Most AWS storage is now encrypted by default, so data-at-rest questions test the choices behind encryption: who controls and audits the key, which data must never change or disappear, how long it is kept, and how backups survive an attacker with administrator credentials. This chapter covers encryption types and key services, integrity mechanisms (Object Lock, versioning, code signing, file validation), lifecycle and retention policies, and backup and replication designs that resist ransomware.

<!-- section: encryption-choices | objectives: 5.2.1 -->
## Choosing the encryption type and the key service

Start from the requirement, not from the service. The deciding words are usually "the company must manage the keys", "audit every use of the key", "AWS must never see the plaintext" or "two layers of encryption".

| Requirement in the stem | Encryption type |
| --- | --- |
| Encrypt at rest, no key management, no extra cost | SSE-S3 (the default for every new S3 object since January 2023) |
| Control the key policy, disable the key, see each decryption in CloudTrail | SSE-KMS with a customer managed key |
| Compliance rule demanding two independent layers of encryption | DSSE-KMS (header value `aws:kms:dsse`), KMS key in the bucket's Region |
| The company supplies its own key with each request and S3 must not store it | SSE-C, now blocked by default and enabled per bucket |
| Data encrypted before it leaves the application; AWS never handles plaintext | Client-side encryption (AWS Encryption SDK, Amazon S3 Encryption Client, AWS Database Encryption SDK) with KMS-wrapped keys |

**SSE-C in 2026.** Since April 2026, SSE-C is disabled by default for new general purpose buckets (and for existing buckets in accounts with no SSE-C objects): writes that request it fail with `403 AccessDenied` until the bucket default encryption sets `BlockedEncryptionTypes` to `NONE`. SSE-C requires HTTPS, and S3 never stores the key: lose it and the object is lost.

**S3 Bucket Keys** cut KMS request costs by up to 99 percent with a short-lived bucket-level key. Side effects: the encryption context becomes the bucket ARN, so key policy or IAM conditions written on object ARNs stop matching, and CloudTrail logs fewer KMS events, against the bucket. Bucket Keys don't work with DSSE-KMS.

To guarantee that only an approved key is used, combine default encryption with a bucket policy that rejects other keys:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireApprovedKmsKey",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::example-claims-archive/*",
      "Condition": {
        "StringNotEqualsIfExists": {
          "s3:x-amz-server-side-encryption-aws-kms-key-id": "arn:aws:kms:eu-west-3:111122223333:key/1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
        }
      }
    }
  ]
}
```

**Key service.** Customer managed keys in the standard KMS key store, already protected by FIPS 140-3 Security Level 3 validated HSMs, fit almost every requirement. Leave them only when the stem demands key material you generated (imported material), single-tenant HSMs you control (an AWS CloudHSM key store, or a CloudHSM cluster used directly through PKCS #11, JCE or CNG), or keys kept outside AWS (an external key store); chapter 53 compares these origins.

> **Exam trap.** SSE-S3 encrypts with AES-256, but the keys belong to S3: there is no key policy to restrict, no key to disable and no KMS event per decryption in CloudTrail. "Prove who decrypted the data" or "revoke access by disabling the key" always means SSE-KMS with a customer managed key.

<!-- section: service-encryption | objectives: 5.2.1 -->
## Encryption at rest across storage and database services

Each service has its own rule for when encryption can be chosen and whether it can be added later.

| Service | Default and options | When it can be changed |
| --- | --- | --- |
| Amazon EBS | Encryption by default is an account setting per Region, with a default KMS key you choose | New volumes only; an existing unencrypted volume is encrypted by copying a snapshot with encryption and creating a new volume |
| Amazon RDS and Aurora | Encryption chosen at creation with an AWS managed or customer managed key; replicas and snapshots inherit it | Never in place: snapshot, copy the snapshot with a KMS key, restore to a new instance or cluster |
| Amazon DynamoDB | Always encrypted; AWS owned key by default, or an AWS managed key, or a customer managed key | The key type can be switched on an existing table |
| Amazon EFS | Encryption at rest chosen at creation | Never in place: create an encrypted file system and copy the data (DataSync) |
| Amazon S3 | SSE-S3 by default; bucket default encryption can be SSE-KMS or DSSE-KMS | New writes use the new default; existing objects keep their encryption until copied (S3 Batch Operations) |

```bash
# Make every new EBS volume and snapshot copy in this Region encrypted with a chosen key
aws ec2 enable-ebs-encryption-by-default --region eu-west-3
aws ec2 modify-ebs-default-kms-key-id --kms-key-id alias/ebs-workloads --region eu-west-3
```

**Sharing encrypted data across accounts.** Snapshots and AMIs encrypted with an AWS managed key (`aws/ebs`, `aws/rds`) can't be shared, because that key's policy can't be edited. Re-encrypt the copy with a customer managed key, allow the other account in its key policy, then share; the receiving account copies it again under its own key, so its restores don't depend on the source key.

> **Exam trap.** Turning on EBS encryption by default doesn't touch existing volumes and applies to one Region only. A stem asking to "ensure all existing and future volumes are encrypted in every Region" needs the setting in every Region, a migration for the existing volumes, and a detective control such as the AWS Config managed rule for encrypted volumes.

<!-- section: integrity | objectives: 5.2.2 -->
## Protecting data integrity

Integrity controls stop changes and prove that none happened.

**S3 Versioning** keeps every version; a simple delete only adds a delete marker, and versioning can be suspended but never removed. MFA delete, enabled only by the root user through the CLI or API, requires a second factor to permanently delete a version or change the versioning state.

**S3 Object Lock** applies a write-once-read-many (WORM) model to object versions. It requires versioning, can now be enabled on existing buckets, and can never be disabled afterwards, nor can versioning be suspended.

| Control | What it prevents | Who can still bypass it |
| --- | --- | --- |
| Governance mode retention | Overwrite or deletion of the version, and changes to its lock | Principals with `s3:BypassGovernanceRetention` who send the header `x-amz-bypass-governance-retention:true` (the console sends it) |
| Compliance mode retention | Deletion of the version by any user, root included; the mode can't change and the period can't be shortened | Nobody; the only early way out is closing the account |
| Legal hold | Deletion until the hold is removed, with no end date and independent of any retention period | Principals with `s3:PutObjectLegalHold` |
| Bucket default retention | Applies a mode and a period (days or years) to every new version without an explicit setting | An explicit retention on the upload overrides it |

A simple `DELETE` on a locked object adds a delete marker and leaves the protected version intact; a `DELETE` with its version ID returns `403`. Cap lock durations with the `s3:object-lock-remaining-retention-days` condition key in the bucket policy. Replicating from a locked bucket requires Object Lock on the destination and `s3:GetObjectRetention` and `s3:GetObjectLegalHold` in the replication role.

```bash
aws s3api put-object-lock-configuration --bucket example-trade-records --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Years":7}}}'
aws s3api put-object-legal-hold --bucket example-trade-records --key 2026/11/ledger.csv --legal-hold Status=ON
```

**S3 Glacier Vault Lock** belongs to the original vault-based Amazon Glacier service, which no longer accepts new customers. On existing vaults, you initiate the lock policy (state in progress, with a lock ID) and must complete it within 24 hours or it is deleted; once completed, it can never be changed or deleted. New WORM archives use S3 Object Lock with the S3 Glacier storage classes.

**Digital code signing.** AWS Signer manages signing profiles. A Lambda code signing configuration lists the allowed profiles and the action when the expiry, mismatch or revocation check fails: `Warn` (default) deploys and emits the `SignatureValidationErrors` metric, `Enforce` blocks the deployment; integrity is checked too. It applies to .zip packages and their layers, and code already deployed keeps running until the next deployment. Signer also signs Amazon ECR images with the Notation CLI, verified at deployment on Amazon EKS.

**File validation.**

| Evidence needed | Mechanism |
| --- | --- |
| Prove CloudTrail log files weren't modified or deleted after delivery | Log file integrity validation: hourly digest files of SHA-256 hashes, signed with SHA-256 with RSA; check with `aws cloudtrail validate-logs` |
| Detect corruption during upload to S3 | Checksums: SDKs calculate one automatically (CRC64NVME by default; CRC32, CRC32C, SHA-1, SHA-256 and others available) and S3 validates it before storing the object |
| Prove a DataSync copy matches the source | Verification mode `ONLY_FILES_TRANSFERRED` (recommended) or `POINT_IN_TIME_CONSISTENT` (not available in Enhanced mode) |

> **Exam trap.** Governance mode is not "immutable": an administrator with `s3:BypassGovernanceRetention` can delete the data. When a regulator (SEC 17a-4, for example) or a ransomware scenario requires that no one, including the root user, can delete records during the period, the answer is compliance mode.

<!-- section: lifecycle-retention | objectives: 5.2.3 -->
## Lifecycle management and retention

Retention has two sides: keep data at least as long as required, and delete it as soon as it is no longer allowed or needed. Automate both.

**S3 Lifecycle** rules, filtered by prefix, tags or size, transition objects between storage classes, expire current versions, expire noncurrent versions (optionally keeping a few newer ones), remove expired delete markers and abort incomplete multipart uploads. Minimum billed durations: 30 days for Standard-IA and One Zone-IA, 90 for Glacier Instant Retrieval and Glacier Flexible Retrieval, 180 for Glacier Deep Archive. Lifecycle never deletes a version still protected by Object Lock.

```json
{
  "Rules": [
    {
      "ID": "claims-retention-7y",
      "Filter": { "Prefix": "claims/" },
      "Status": "Enabled",
      "Transitions": [ { "Days": 90, "StorageClass": "GLACIER_IR" }, { "Days": 365, "StorageClass": "DEEP_ARCHIVE" } ],
      "Expiration": { "Days": 2557 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

A classic pairing: Object Lock compliance mode with a seven-year default retention guarantees the minimum, and a Lifecycle expiration just after seven years guarantees the maximum.

**Amazon EFS lifecycle policies** move files based on last access, and metadata operations such as directory listings don't count as access. By default, files not read for 30 days move to Infrequent Access and after 90 days to Archive, and they stay there when read unless Transition into Standard is set to On first access. Metadata always stays in Standard, and retention for EFS comes from AWS Backup.

**Amazon FSx for Lustre backups** exist only for persistent file systems not linked to an S3 data repository; scratch and S3-linked file systems rely on S3. Automatic daily backups keep 0 to 90 days, and the default is 0, which means off. User-initiated backups never expire, even after the file system is deleted. AWS Backup adds longer retention, hourly schedules and copies to other accounts or Regions.

**Recycle Bin** retains deleted EBS snapshots and EBS-backed AMIs for 1 to 365 days and deleted EBS volumes for 1 to 7 days, through tag-level rules or Region-level rules (with optional exclusion tags). A locked rule can't be changed or deleted until it is unlocked and the unlock delay has passed.

> **Exam trap.** An FSx for Lustre persistent file system created without a retention value has no automatic backups. "Daily backups kept 35 days with the least operational overhead" means setting the automatic backup retention to 35 days (or an AWS Backup plan); a scratch file system is rebuilt from S3 instead.

<!-- section: backup-replication | objectives: 5.2.4 -->
## Secure backup, replication and ransomware protection

Assume the attacker holds administrator credentials in the workload account. The backup design must still leave a copy that cannot be deleted, encrypted with a key the attacker can't disable, in an account the attacker doesn't control.

**AWS Backup** centralizes plans (schedule, lifecycle, copy rules) for EBS, EC2, RDS, Aurora, DynamoDB, EFS, FSx, S3 and more; Organizations backup policies push them to every account, and copy rules send recovery points to another Region or to a dedicated backup account.

| Vault protection | Behavior |
| --- | --- |
| Vault access policy | Resource policy on the vault, for example denying `backup:DeleteRecoveryPoint` to everyone except a recovery role |
| Vault Lock, governance mode | Blocks deletion and lifecycle changes, but principals with sufficient IAM permissions can remove the lock |
| Vault Lock, compliance mode | After the grace time (at least 72 hours, `--changeable-for-days`), nobody, root user and AWS included, can delete unexpired recovery points, change the lock or delete a non-empty vault |
| Minimum and maximum retention | Backup and copy jobs with a retention outside the range (1 to 36,500 days) fail |
| Logically air-gapped vault | Always compliance-locked; AWS owned key by default or a customer managed key set at creation; shared with specific account IDs through AWS RAM for restores elsewhere; with multi-party approval, recoverable even if the owning account is inaccessible |

```bash
aws backup create-logically-air-gapped-backup-vault --backup-vault-name org-recovery-vault --min-retention-days 7 --max-retention-days 120
aws ec2 lock-snapshot --snapshot-id snap-0a1b2c3d4e5f67890 --lock-mode compliance --cool-off-period 24 --lock-duration 90
```

**Amazon Data Lifecycle Manager** automates EBS snapshots and EBS-backed AMIs at no extra cost (never instance store-backed AMIs).

| Capability | Default policy | Custom policy |
| --- | --- | --- |
| Targets | All volumes or instances in the Region without recent snapshots | Volumes or instances with specific tags |
| Cross-Region copy | Yes, default settings | Yes, with its own retention and KMS key |
| Cross-account sharing, fast snapshot restore, archiving, pre and post scripts | No | Yes |
| Schedules and retention | One schedule, age-based | Up to 4 schedules, age-based or count-based |

A cross-account copy event policy in the backup account copies the snapshots shared with it under its own key. **EBS snapshot lock** adds WORM protection per snapshot: governance mode, or compliance mode with an optional 1 to 72 hour cooling-off period, for 1 to 36,500 days; after the cooling-off, the lock can only be extended.

**AWS DataSync** encrypts traffic between locations with mutual TLS 1.3 and verifies data with checksums during and after the transfer; use a VPC endpoint for the agent and IAM roles scoped to the destination.

**S3 Replication** needs versioning on both buckets; SSE-KMS objects replicate only when the rule opts in to KMS-encrypted objects and names a destination key. For a backup copy, make the destination account the replica owner and leave delete marker replication off: version-specific deletions are never replicated, so a purge in the source doesn't reach the copy.

| Ransomware tactic | Countermeasure |
| --- | --- |
| Delete backups with stolen administrator credentials | Copies in a separate backup account, Vault Lock compliance mode or a logically air-gapped vault, SCPs denying deletion |
| Schedule deletion of the KMS key protecting backups | Customer managed key owned by the backup account (or the AWS owned key of an air-gapped vault), SCP denying `kms:ScheduleKeyDeletion`, alarm on the event |
| Encrypt or overwrite S3 objects | Versioning, Object Lock, replication to a locked bucket in another account |
| Delete EBS snapshots and AMIs | Recycle Bin rules (locked), EBS snapshot lock |

> **Exam trap.** Copying backups to another Region in the same account doesn't protect against a compromised account. The deciding requirement "even if the production account is compromised" needs a different account, a lock in compliance mode and a key that the production account can't delete.

<!-- section: key-points -->
## Key points

- SSE-S3 is the default; SSE-KMS with a customer managed key is needed to control and audit key use; DSSE-KMS for two layers; SSE-C is blocked by default on new buckets since April 2026.
- Bucket Keys reduce KMS calls but change the encryption context to the bucket ARN; not available with DSSE-KMS.
- EBS default encryption is per Region and affects only new volumes; RDS and EFS encryption can't be added in place.
- Object Lock: governance can be bypassed with `s3:BypassGovernanceRetention`, compliance can't; legal holds have no end date; once enabled, Object Lock can't be disabled.
- Glacier Vault Lock is only for existing vault customers; new designs use S3 Object Lock.
- Lambda code signing: `Warn` by default, `Enforce` blocks; CloudTrail digest files prove log integrity.
- FSx for Lustre automatic backup retention defaults to 0 days; scratch and S3-linked file systems have no backups.
- Ransomware resilience: separate account, compliance-mode locks (Vault Lock, air-gapped vault, snapshot lock, Object Lock), and a key the attacker can't delete.
