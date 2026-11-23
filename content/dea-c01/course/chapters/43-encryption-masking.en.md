Encryption and masking questions combine a regulation or company policy with a pipeline: card numbers must be unreadable to analysts but joinable, an auditor needs aggregated data without identities, a partner account must read encrypted objects, every connection to the warehouse must use TLS. The answer picks the technique (masking, hashing, tokenization, encryption), the service that applies it (Macie, Glue, DataBrew, Redshift dynamic data masking), the right kind of KMS key and policy, and the setting that forces encryption in transit. This chapter covers masking and anonymization, KMS encryption, cross-account encryption and encryption in transit or before transit.

<!-- section: masking-anonymization | objectives: 4.3.1 -->
## Data masking and anonymization

| Technique | Result | Reversible | Keeps joins |
| --- | --- | --- | --- |
| Redaction or full masking | Value replaced (`****`) | No | No |
| Partial masking | Part kept (last four digits) | No | No |
| Hashing (SHA-256) | Same input, same digest: pseudonymization | No (but guessable for small value sets) | Yes |
| Deterministic encryption | Same input, same ciphertext | Yes, with the key | Yes |
| Probabilistic encryption | Different ciphertext each time | Yes, with the key | No |
| Tokenization | Value replaced by a token kept in a secured lookup table | Through the lookup | Yes |
| Generalization, aggregation | Age bands, region instead of address, counts | No | Not row level |
| Random substitution, shuffling | Realistic fake values, values moved between rows | No | No |

Pseudonymized data (hashed, encrypted, tokenized) is still personal data under many laws; anonymization must make re-identification impossible, which usually means generalizing or aggregating as well.

**Find the sensitive data first.** Amazon Macie scans S3 with managed and custom data identifiers (automated sensitive data discovery, or discovery jobs) and sends findings to EventBridge and Security Hub. A DataBrew profile with entity detection or the Glue Detect Sensitive Data transform finds PII inside datasets.

**Mask it in the pipeline:**

| Tool | Capabilities |
| --- | --- |
| Glue **Detect Sensitive Data** transform | Detect PII in each cell, or detect fields containing PII on a sample portion with a detection threshold; managed entity categories (universal, HIPAA, networking, country-specific) and custom regex entities; actions: redact (replacement text, `*******` by default), partially redact, SHA-256 hash, or enrich with detection results |
| DataBrew PII recipe steps | `MASK_CUSTOM`, `MASK_DATE`, `MASK_DELIMITER`, `MASK_RANGE`, `CRYPTOGRAPHIC_HASH`, `ENCRYPT` and `DECRYPT` (AWS Encryption SDK with a KMS key, decryptable outside DataBrew), `DETERMINISTIC_ENCRYPT` and `DETERMINISTIC_DECRYPT` (AES-GCM-SIV with a key stored in Secrets Manager, decryptable only in DataBrew), `REPLACE_WITH_RANDOM_BETWEEN`, `REPLACE_WITH_RANDOM_DATE_BETWEEN`, `SHUFFLE_ROWS` |
| Lake Formation | Exclude sensitive columns, or a cell-level data filter |
| CloudWatch Logs data protection | Masks sensitive data in log events; `logs:Unmask` to see it |

**Mask at query time** with Redshift **dynamic data masking**: the stored data is unchanged; a masking policy rewrites the column for the users or roles it is attached to.

```sql
CREATE MASKING POLICY mask_card
WITH (card_number VARCHAR(19))
USING ('XXXX-XXXX-XXXX-' || RIGHT(card_number, 4));

CREATE MASKING POLICY show_card
WITH (card_number VARCHAR(19))
USING (card_number);

ATTACH MASKING POLICY mask_card ON payments (card_number) TO PUBLIC;
ATTACH MASKING POLICY show_card ON payments (card_number) TO ROLE fraud_team PRIORITY 10;
```

- Superusers and `sys:secadmin` create and attach policies.
- When several policies apply, the **highest priority** wins; default priority 0; a policy for a user or role must have a higher priority than the `PUBLIC` one.
- Conditional masking uses other columns of the row in the expression (cell-level masking).
- Masking expressions can call SQL or Lambda UDFs; Python UDFs are no longer supported after June 30, 2026.

> **Exam trap.** "Analysts must join on customer ID without seeing it" excludes redaction and probabilistic encryption: use hashing or deterministic encryption (or tokenization). "Fraud investigators must see the real value" excludes hashing: use dynamic data masking with a higher-priority policy for their role, or reversible encryption.

<!-- section: kms-encryption | objectives: 4.3.2 -->
## Encrypting and decrypting with AWS KMS

| Key type | Key policy | Rotation | Cross-account | Typical use |
| --- | --- | --- | --- | --- |
| AWS owned key | Not visible | Managed by the service | No | Default encryption you never manage (DynamoDB default, Redshift default since 2025) |
| AWS managed key (`aws/s3`, `aws/glue`...) | Visible, not editable | Yearly, automatic | No | Encryption with CloudTrail auditing but no control |
| Customer managed key | Yours | Optional automatic (365 days by default, 90 to 2,560 days) and on demand | Yes | Control, separation of duties, cross-account, disable or delete |

Services use **envelope encryption**: KMS generates a data key (`GenerateDataKey`), the service encrypts data locally with it and stores the encrypted data key next to the data; reading calls `Decrypt` on the data key. Principals therefore need `kms:GenerateDataKey` to write and `kms:Decrypt` to read. Automatic rotation applies to symmetric keys with KMS-generated material; old material is kept, so existing data stays readable.

| Service | Encryption at rest |
| --- | --- |
| Amazon S3 | SSE-S3 by default on every new object; SSE-KMS (S3 Bucket Keys cut KMS requests and cost), DSSE-KMS (two layers), SSE-C |
| Amazon Redshift | Always encrypted for new clusters (AWS owned key unless you choose a KMS key) |
| AWS Glue | **Security configuration** on jobs and crawlers: S3 targets, CloudWatch Logs, job bookmarks; **Data Catalog encryption**: metadata (databases, tables, partitions...) with a symmetric KMS key, and connection passwords |
| Amazon Athena | Query results: SSE-S3, SSE-KMS or CSE-KMS; the workgroup's "Override client-side settings" enforces it |
| Amazon EMR | **Security configuration**: EMRFS on S3 (SSE-S3, SSE-KMS, CSE-KMS, CSE-C), local disk (EBS encryption with KMS, LUKS) |
| Kinesis Data Streams, Data Firehose | Server-side encryption with a KMS key |
| Amazon MSK, DynamoDB | Always encrypted; choose a customer managed key to control it |

```bash
aws kms create-key --description "Data lake curated zone"
aws kms create-alias --alias-name alias/datalake-curated --target-key-id 1234abcd-12ab-34cd-56ef-1234567890ab
aws kms enable-key-rotation --key-id 1234abcd-12ab-34cd-56ef-1234567890ab --rotation-period-in-days 180

aws s3api put-bucket-encryption --bucket example-datalake \
  --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault":
    {"SSEAlgorithm": "aws:kms", "KMSMasterKeyID": "alias/datalake-curated"}, "BucketKeyEnabled": true}]}'
```

> **Exam trap.** Changing a bucket's default encryption does not re-encrypt existing objects; copy them (S3 Batch Operations for many). For a heavy Athena or Glue workload on SSE-KMS data that hits KMS request quotas, enable S3 Bucket Keys.

<!-- section: cross-account-encryption | objectives: 4.3.3 -->
## Encryption across AWS account boundaries

Cross-account use of a KMS key needs **two** permissions:

1. The **key policy** in the owning account allows the other account (or a role in it).
2. An **IAM policy** in the other account delegates that permission to its users or roles.

Only cryptographic operations, `DescribeKey`, `CreateGrant` and a few grant and read operations work across accounts. Reference the key by its key ARN (or alias ARN); a bare key ID or alias name is looked up in the caller's account.

```json
{
  "Sid": "AllowAnalyticsAccountToDecrypt",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::444455556666:role/AthenaAnalysts" },
  "Action": ["kms:Decrypt", "kms:DescribeKey"],
  "Resource": "*"
}
```

```json
{
  "Effect": "Allow",
  "Action": "kms:Decrypt",
  "Resource": "arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"
}
```

| Scenario | What to configure |
| --- | --- |
| Another account reads SSE-KMS objects | Bucket policy for the reader, key policy for the reader, IAM policy in the reader's account for `s3:GetObject` and `kms:Decrypt` |
| Data encrypted with `aws/s3` must be shared | Not possible: re-encrypt with a customer managed key |
| Replicate SSE-KMS objects to another account | Replication rule with SSE-KMS objects selected and a replica KMS key in the destination; the replication role needs `kms:Decrypt` on the source key and `kms:Encrypt` on the destination key |
| Lake Formation location encrypted, in another account | Register with a user-defined role that the key policy allows |
| A service in another account uses the key temporarily | KMS grant (`CreateGrant`), retired when no longer needed |

> **Exam trap.** AWS managed keys cannot be used across accounts because their key policy cannot be edited. When a cross-account reader gets `AccessDenied` on objects it is allowed to read, check the key: a customer managed key and both policies are required.

<!-- section: encryption-in-transit | objectives: 4.3.4 -->
## Encryption in transit and before transit

AWS service endpoints use TLS; the job is to **refuse** unencrypted connections and to verify certificates.

| Component | Enforce TLS |
| --- | --- |
| Amazon S3 | Bucket policy `Deny` when `aws:SecureTransport` is `false`; `s3:TlsVersion` to require a minimum version |
| Amazon Redshift | `require_ssl` set to `true` in the parameter group (default for new clusters and serverless workgroups since 2025 with `default.redshift-2.0`); clients use `sslmode=verify-full` |
| RDS and Aurora | `rds.force_ssl` (PostgreSQL), `require_secure_transport` (MySQL) |
| Amazon MSK | Client-broker: TLS only (default), TLS and plaintext, or plaintext; within the cluster: encrypted by default |
| Amazon EMR | In-transit encryption in the security configuration, with certificates that EMR manages, a zip file in S3, or a custom provider |
| Glue JDBC connections | Require SSL connection on the connection |
| On-premises to AWS | Site-to-Site VPN (IPsec), or Direct Connect with MACsec or a VPN over it |

```json
{
  "Sid": "DenyInsecureTransport",
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": ["arn:aws:s3:::example-datalake", "arn:aws:s3:::example-datalake/*"],
  "Condition": { "Bool": { "aws:SecureTransport": "false" } }
}
```

**Encryption before transit** (client-side) means the data leaves the producer already encrypted, so neither the network nor the storage service sees plaintext:

| Need | Tool |
| --- | --- |
| Encrypt records or files in any application | AWS Encryption SDK with a KMS keyring |
| Encrypt objects before upload to S3 | Amazon S3 Encryption Client |
| Encrypt DynamoDB attributes before writing | AWS Database Encryption SDK |
| Spark on EMR writes encrypted objects | EMRFS CSE-KMS |
| Athena results unreadable by S3 alone | CSE-KMS for query results |
| Mask fields before data leaves a source | DataBrew `ENCRYPT` step, Glue Detect Sensitive Data |

> **Exam tip.** "Data must be encrypted before it is sent to AWS" or "the storage service must never see plaintext" is client-side encryption. "All connections to the warehouse must be encrypted" is `require_ssl` (Redshift) or `aws:SecureTransport` (S3), not a KMS setting.

<!-- section: key-points -->
## Key points

- Hashing and deterministic encryption keep joins; redaction and probabilistic encryption do not; anonymization usually needs generalization or aggregation.
- Macie finds PII in S3; Glue Detect Sensitive Data redacts or hashes in jobs; DataBrew PII steps mask, hash, encrypt, substitute or shuffle.
- Redshift dynamic data masking: masking policies attached to users, roles or `PUBLIC`, highest priority wins, managed by `sys:secadmin`; stored data unchanged.
- KMS: AWS owned, AWS managed (yearly rotation, not shareable) and customer managed keys (rotation 90 to 2,560 days, on demand, shareable); envelope encryption with `GenerateDataKey` and `Decrypt`.
- Glue security configurations and Data Catalog encryption, Athena result encryption enforced by the workgroup, EMR security configurations, S3 Bucket Keys.
- Cross-account: customer managed key, key policy plus IAM policy, key ARN, grants; replication needs a replica key.
- In transit: `aws:SecureTransport`, Redshift `require_ssl`, `rds.force_ssl`, MSK TLS; before transit: Encryption SDK, S3 Encryption Client, CSE-KMS.
