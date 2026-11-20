Encryption questions name the data (an S3 object, a queue message, a database password, a log line with customer data) and a constraint: who controls the key, where encryption happens, how big the payload is, or how a secret reaches the code without being hard-coded. This chapter covers encryption at rest and in transit, certificates, client-side and server-side encryption, KMS operations in code, development keys and certificates, sensitive data, and secret management.

<!-- section: encryption-at-rest-transit | objectives: 2.2.1 -->
## Encryption at rest and in transit

Most services encrypt at rest by default; the exam asks which key and how to enforce it.

| Service | Encryption at rest |
| --- | --- |
| Amazon S3 | Every new object is encrypted, SSE-S3 by default. SSE-KMS (KMS key, audited in CloudTrail; S3 Bucket Keys cut KMS requests), DSSE-KMS (two layers), SSE-C (key sent with each request; disabled by default for new buckets since April 2026) |
| DynamoDB | Always encrypted: AWS owned key by default, or an AWS managed or customer managed key |
| Amazon SQS | SSE-SQS (SQS-managed keys) or SSE-KMS; the message body is encrypted, not the metadata or attributes; data keys are reused 5 minutes by default (`KmsDataKeyReusePeriodSeconds`, 1 minute to 24 hours) |
| Lambda environment variables | Always encrypted with an AWS managed key, or a customer managed key; optional encryption helpers encrypt values client-side |
| CloudWatch Logs | Always encrypted; associate a customer managed KMS key with a log group to control access |
| EBS, RDS, Aurora, EFS | Chosen at creation, with KMS |

With SSE-KMS on a queue or a bucket, the producer needs `kms:GenerateDataKey` and the consumer `kms:Decrypt` on the key, in the key policy or through IAM if the key policy delegates to IAM.

**In transit**, every AWS endpoint uses TLS (Bedrock, for example, requires TLS 1.2). Enforce it in resource policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyHttp",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-invoices", "arn:aws:s3:::example-invoices/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyUploadsWithoutKms",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::example-invoices/*",
      "Condition": { "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" } }
    }
  ]
}
```

For your own endpoints, terminate HTTPS on CloudFront, an Application Load Balancer or API Gateway with an ACM certificate, and use TLS from the application to the database.

> **Exam trap.** Default encryption changes nothing for objects already in a bucket, and SQS SSE applies only to messages sent after it is turned on. To re-encrypt existing S3 objects with a new key, copy them (S3 Batch Operations for many objects).

<!-- section: certificates | objectives: 2.2.2 -->
## Managing certificates

**AWS Certificate Manager (ACM)** issues public certificates trusted by browsers and deploys them to integrated services: Elastic Load Balancing, CloudFront, API Gateway custom domain names and others.

| Rule | Detail |
| --- | --- |
| Validity of a public certificate | 198 days |
| Validation | DNS (recommended, needed for automatic renewal), email; HTTP only for CloudFront distribution tenants |
| Renewal | Automatic for DNS-validated certificates in use, starting 45 days before expiry; the ARN doesn't change |
| Region | Certificates are Regional: CloudFront and edge-optimized API Gateway custom domains need the certificate in US East (N. Virginia); a Regional API or a load balancer needs it in its own Region |
| Imported certificates | Any CA, PEM format; no managed renewal: monitor expiry with EventBridge and reimport (same ARN) |
| Export | Public certificates created on or after June 17, 2025 can be requested as exportable, for EC2 or on-premises servers |

**AWS Private CA** creates a private root and subordinate CAs for internal names, mutual TLS, IoT devices and code signing. Request a private certificate through ACM (`aws acm request-certificate --certificate-authority-arn ...`) to deploy it on integrated services with managed renewal, or call `acm-pca issue-certificate` with your CSR to install it anywhere.

| CA mode | Use |
| --- | --- |
| General-purpose (default) | Any validity period, usually with revocation (CRL or OCSP) |
| Short-lived certificate | Certificates valid 7 days at most, so no revocation needed; cheaper; ACM can't issue from such a CA |

Private CAs are Regional and billed monthly per CA plus per certificate.

> **Exam trap.** "Browsers must trust the certificate of a public website" is an ACM public certificate. Private CA certificates are trusted only by clients that trust your root, which suits internal services and mutual TLS.

<!-- section: client-server-encryption | objectives: 2.2.3 -->
## Client-side or server-side encryption

| Requirement | Choice |
| --- | --- |
| Encrypt at rest with the least effort; AWS handles keys | Server-side, SSE-S3 or the service default |
| Control and audit key use, revoke access by disabling a key | Server-side with SSE-KMS and a customer managed key |
| Data must never reach AWS unencrypted; only the application sees plaintext | Client-side encryption |
| Encrypt individual DynamoDB attributes before they are written | AWS Database Encryption SDK for DynamoDB (formerly DynamoDB Encryption Client) |
| Encrypt S3 objects in the application | Amazon S3 Encryption Client |
| Encrypt any data or file in code, with multiple keys or Regions | AWS Encryption SDK (envelope encryption, KMS keyrings) |

With server-side encryption, S3 decrypts the object for any principal with `s3:GetObject` (and `kms:Decrypt` for SSE-KMS). With client-side encryption, AWS stores ciphertext and the reader must hold the key; services that read content, such as Athena queries, see only ciphertext.

> **Exam tip.** "Encrypt before sending to S3" or "AWS must not be able to read the data" means client-side encryption. "Separate who can read the data from who can read the bucket" is SSE-KMS with a key policy.

<!-- section: kms-operations | objectives: 2.2.4 -->
## Encrypting and decrypting with KMS keys

| Operation | Use |
| --- | --- |
| `Encrypt` | Small data only: up to 4,096 bytes with a symmetric key (a password, a token) |
| `GenerateDataKey` | Returns a plaintext data key and the same key encrypted under the KMS key, for envelope encryption |
| `GenerateDataKeyWithoutPlaintext` | Only the encrypted data key, for a component that will decrypt it later |
| `Decrypt` | Symmetric ciphertext carries the key ID, so `KeyId` is optional |
| `ReEncrypt` | Change the KMS key of a ciphertext without exposing the plaintext |

**Envelope encryption**: call `GenerateDataKey`, encrypt the data locally with the plaintext key, erase the plaintext key from memory, and store the encrypted data key next to the data. To read, call `Decrypt` on the encrypted data key, then decrypt locally. Only the small data key travels to KMS, so any size of data works.

```bash
aws kms encrypt --key-id alias/app-secrets \
  --plaintext fileb://token.txt \
  --encryption-context purpose=api-token \
  --query CiphertextBlob --output text | base64 --decode > token.enc

aws kms decrypt --ciphertext-blob fileb://token.enc \
  --encryption-context purpose=api-token \
  --query Plaintext --output text | base64 --decode
```

```python
# Python (boto3): envelope encryption
kms = boto3.client("kms")
key = kms.generate_data_key(KeyId="alias/app-data", KeySpec="AES_256",
                            EncryptionContext={"tenant": "t-81"})
# encrypt the file locally with key["Plaintext"], then discard it
# store key["CiphertextBlob"] with the encrypted file
```

The **encryption context** is non-secret authenticated data: decryption fails with `InvalidCiphertextException` unless the same context, case included, is supplied. It appears in CloudTrail, so it identifies what was decrypted but must not contain sensitive data.

Symmetric cryptographic operations share one request quota per account and Region (10,000, 20,000 or 100,000 requests per second depending on the Region), including requests made by services for you. On `ThrottlingException`, retry with backoff, cache data keys with the AWS Encryption SDK, or enable S3 Bucket Keys.

> **Exam trap.** "Encrypt a 2 MB file with KMS" is not `Encrypt` (4 KB limit): use `GenerateDataKey` and encrypt locally, or the AWS Encryption SDK.

<!-- section: dev-certificates-ssh | objectives: 2.2.5 -->
## Certificates and SSH keys for development

**EC2 key pairs**: EC2 stores the public key; you keep the private key, downloaded once at creation.

```bash
aws ec2 create-key-pair --key-name dev-key --key-type ed25519 \
  --key-format pem --query KeyMaterial --output text > dev-key.pem
chmod 400 dev-key.pem

ssh-keygen -m PEM -t rsa -b 4096 -f ~/.ssh/dev-rsa
aws ec2 import-key-pair --key-name dev-rsa \
  --public-key-material fileb://~/.ssh/dev-rsa.pub
```

| Rule | Detail |
| --- | --- |
| Key types | RSA (Linux and Windows), ED25519 (Linux only); DSA isn't accepted |
| Private key formats | `.pem` for OpenSSH, `.ppk` for PuTTY |
| Imported RSA lengths | 1024, 2048 or 4096 bits (2048 or 4096 for EC2 Instance Connect) |
| Key pair created by CloudFormation | Private key stored in Parameter Store under `/ec2/keypair/<key-pair-id>` |
| No key to manage at all | Systems Manager Session Manager, or EC2 Instance Connect (temporary keys pushed for 60 seconds) |

**Development certificates**: for local HTTPS or a test load balancer, generate a self-signed certificate with OpenSSL and import it into ACM; it works but clients don't trust it and ACM never renews it. For internal test services that need trust, issue from a Private CA (short-lived mode keeps cost down). CloudFront signed URLs need an RSA 2048 or ECDSA P-256 key pair generated with OpenSSL, whose public key is uploaded to a key group.

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout dev.key -out dev.crt -subj "/CN=dev.example.internal"
aws acm import-certificate --certificate fileb://dev.crt --private-key fileb://dev.key
```

> **Exam trap.** A lost EC2 private key can't be downloaded again: AWS never kept it. Create a new key pair, or connect with Session Manager or EC2 Instance Connect to replace the public key.

<!-- section: sensitive-data | objectives: 2.2.6 -->
## Identifying, masking and limiting sensitive data

| Requirement | Service or feature |
| --- | --- |
| Find PII, financial data or credentials stored in S3 buckets | Amazon Macie: automated sensitive data discovery or discovery jobs, managed and custom data identifiers; findings to EventBridge and Security Hub CSPM |
| Mask PII and PHI written to application logs | CloudWatch Logs data protection policy (account or log group): managed data identifiers for credentials, financial data, PII, PHI and device identifiers, plus custom identifiers |
| See unmasked log data | Only principals with `logs:Unmask` |
| Alarm when logs contain sensitive data | `LogEventsWithFindings` metric in the `AWS/Logs` namespace |
| Detect or redact PII in text inside the application | Amazon Comprehend PII detection (real time or batch redaction jobs) |
| Block or mask PII in prompts and responses of generative AI | Amazon Bedrock Guardrails sensitive information filters (chapter on AI security) |
| Limit who reads sensitive attributes or items | IAM conditions (`dynamodb:Attributes`, `dynamodb:LeadingKeys`), separate tables or buckets, KMS key policies, ABAC tags |

CloudWatch Logs masks at ingestion: events ingested before the policy was created stay unmasked. Masking applies at every egress point (console, Logs Insights, metric filters, subscription filters). PHI handling also requires a HIPAA-eligible service and a business associate addendum, but the technical controls are the same: encrypt, restrict, mask, audit.

> **Exam trap.** Amazon SNS message data protection and S3 Object Lambda are no longer available to new customers: don't choose them for a new application. Mask in the code, in CloudWatch Logs data protection, or with Comprehend before publishing.

<!-- section: secrets-management | objectives: 2.2.7 -->
## Secret management services

| Need | Secrets Manager | Parameter Store |
| --- | --- | --- |
| Value type | Secrets (credentials, API keys), usually JSON | Configuration and secrets: `String`, `StringList`, `SecureString` (KMS) |
| Maximum size | 64 KB | 4 KB standard, 8 KB advanced |
| Automatic rotation | Managed rotation (RDS, Aurora, Redshift and others), or a rotation Lambda function; schedule from every 4 hours | None built in |
| Cross-account access | Resource policy on the secret plus a customer managed KMS key | Advanced parameters can be shared |
| Cost | Per secret per month and per API call | Standard tier free (10,000 parameters); advanced tier charged (100,000 parameters, parameter policies) |

A rotation function runs four steps: `createSecret` (new version labeled `AWSPENDING`), `setSecret` (change the password in the database), `testSecret`, `finishSecret` (move `AWSCURRENT` to the new version; the old one becomes `AWSPREVIOUS`). Single-user rotation changes one user's password; alternating users rotation keeps two users so one credential is always valid. For RDS and Aurora, a **managed master user password** lets the database store and rotate its own secret.

Retrieving secrets without calling the API on every invocation:

| Method | Detail |
| --- | --- |
| AWS Parameters and Secrets Lambda Extension | Layer that serves `http://localhost:2773`; header `X-Aws-Parameters-Secrets-Token` set to the session token; cache 300 seconds by default (`SECRETS_MANAGER_TTL`, `SSM_PARAMETER_STORE_TTL`) |
| Client-side caching libraries | Cache in memory in long-running code |
| CloudFormation dynamic references | `{{resolve:secretsmanager:prod/db:SecretString:password}}`, `{{resolve:ssm-secure:/app/prod/key}}` resolved at deployment, never shown in the template |
| CodeBuild | `env: secrets-manager:` and `env: parameter-store:` in the buildspec |
| ECS | `secrets` in the container definition, read with the task execution role |

```bash
aws secretsmanager get-secret-value --secret-id prod/orders/db \
  --query SecretString --output text
aws ssm get-parameters-by-path --path /orders/prod --recursive --with-decryption
```

The execution role needs `secretsmanager:GetSecretValue` (or `ssm:GetParameter*`) and `kms:Decrypt` when a customer managed key encrypts the secret. A Lambda function in a VPC without NAT needs a Secrets Manager (or Systems Manager) interface endpoint.

> **Exam trap.** "Rotate the database password automatically with the least operational overhead" is Secrets Manager managed rotation, not a `SecureString` parameter with a scheduled Lambda function. Choose Parameter Store when the requirement is configuration values or the lowest cost without rotation.

<!-- section: key-points -->
## Key points

- S3 encrypts every new object (SSE-S3 by default); enforce SSE-KMS and TLS with bucket policy denies on `s3:x-amz-server-side-encryption` and `aws:SecureTransport`.
- SSE-KMS producers need `kms:GenerateDataKey`, consumers `kms:Decrypt`; encryption applies only to data written afterwards.
- ACM public certificates: 198 days, DNS validation renews automatically, us-east-1 for CloudFront and edge-optimized APIs; imported ones aren't renewed.
- Private CA for internal trust and mutual TLS; short-lived mode for certificates of 7 days or less.
- Client-side encryption when AWS must never see plaintext: AWS Encryption SDK, S3 Encryption Client, Database Encryption SDK.
- `Encrypt` handles 4 KB; larger data uses `GenerateDataKey` and envelope encryption; the encryption context must match.
- EC2 private keys are downloaded once; ED25519 is Linux only; Session Manager avoids SSH keys.
- Macie for S3, CloudWatch Logs data protection with `logs:Unmask`, Bedrock Guardrails for prompts; SNS message data protection and S3 Object Lambda are closed to new customers.
- Secrets Manager rotates and costs more; Parameter Store stores configuration and `SecureString` cheaply; cache with the Lambda extension on port 2773.
