# Q-dva-c03-2b — report

47 questions in `content/dva-c03/questions/security/`, prefix `dvac03-2b-`: 2.1.6 = 10, 2.1.7 = 10, 2.2.1 = 9, 2.2.2 = 9, 2.2.3 = 9. Types: single 39, multi 8. Difficulty: 15 easy, 22 medium, 10 hard. Validator: 0 problem(s).

## Choices and deviations

- Multi stems end with the NOTE line ("Each correct selection is worth one point."), as in the finished SAA-C03 questions, although the AWS exam scores multiple response all or nothing.
- French: "assume a role" is translated « assumer un rôle », as in `objectives.yaml` (2.1.7). The SAA-C03 bank uses « endosser ».
- Questions about the new 2026 S3 features: SSE-C blocked by default on new general purpose buckets since April 2026 (`dvac03-2b-sse-c-new-bucket`) and `UpdateObjectEncryption` with S3 Batch Operations (`dvac03-2b-update-object-encryption`). Also: exportable ACM public certificates (June 2025), RDS blue/green deployment with `TargetKmsKeyId` to encrypt an unencrypted instance, RDS for MySQL `require_secure_transport` default (0 up to 8.4, 1 in 9.7, so the stem says 8.4).
- No overlap with sibling tasks: KMS API usage (GenerateDataKey and envelope encryption code) is left to 2.2.4 (Q-dva-c03-2c); presigned URLs, federation and MFA access control are left to Q-dva-c03-2a.
- `dvac03-2b-caa-record` shows the DNS record as inline code (no `text` fence, because questions use only python/javascript/json/yaml/bash fences).

## Facts not fully confirmed on a fetched page (from memory, used only in explanations or distractors)

- Reference title of `lambda-intro-execution-role.html`: the fetch tool returned "Defining Lambda Event Function permissions with an execution role", which looks garbled. I used "Defining Lambda function permissions with an execution role". Check it.
- `dvac03-2b-efs-tls-mount`, distractor c: the EFS interface VPC endpoint serves the EFS API, not NFS traffic.
- `dvac03-2b-cross-account-lambda-steps`, distractor f: DynamoDB tables support resource-based policies. The option is described as a working technique that fails the stated requirement for an account B role.
- `dvac03-2b-assume-role-session-token`: the error text for a missing session token ("security token included in the request is invalid") comes from memory.
- The EFS file system policy with `aws:SecureTransport` could not be confirmed on the EFS pages, so the question does not use it.
