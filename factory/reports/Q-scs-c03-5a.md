# Q-scs-c03-5a — questions SCS-C03, domain `data`, objectives 5.1.1–5.2.1

43 files `content/scs-c03/questions/data/scsc03-5a-*.yaml`, all `draft`. Validator: `43 files, 0 problem(s)`.

- Per objective: 5.1.1 = 11, 5.1.2 = 11, 5.1.3 = 11, 5.2.1 = 10.
- Types: single 35, multi 6 (all "Choose two."), ordering 1 (VPC Encryption Controls, 5.1.3), dragdrop 1 (private access mechanisms, 5.1.2).
- Difficulty: 7 easy, 21 medium, 15 hard.
- Single answers spread: a 8, b 12, c 8, d 7 (options are shuffled).
- No SCS-C03 course chapters existed when the batch was written. The questions were written from AWS documentation.

## Sources fetched (2026-11-22)

ALB security policies, ALB target groups, ALB listener rule action types, NLB listeners; CloudFront viewer and custom-origin HTTPS pages; EFS encryption in transit, EFS IAM, EFS encryption at rest; RDS PostgreSQL SSL, RDS encryption; ElastiCache in-transit encryption and its enabling page; API Gateway mutual TLS and the page on disabling the default endpoint; OpenSearch infrastructure security and node-to-node encryption; S3 bucket policy examples, S3 VPC endpoint bucket policies, S3 gateway endpoints, interface endpoint creation, endpoint services; Client VPN authorization rules and authentication; Verified Access policies and policy evaluation; EC2 Instance Connect Endpoint connection and permissions; Systems Manager VPC endpoints; EC2 data protection (Nitro instance list); VPC Encryption Controls; EKS network security best practices, EKS default envelope encryption; SageMaker inter-container traffic encryption; EMR encryption options and the keys/certificates page; ECS Service Connect TLS; MSK encryption; S3 DSSE-KMS, SSE-C, SSE-C blocking, Bucket Keys, SSE-KMS; EBS encryption by default, snapshot sharing, associated KMS keys; KMS key stores; SQS key management; S3 client-side encryption.

## Not verified on a fetched page (well-established knowledge, please review)

- Default RDS DB parameter groups cannot be modified (scsc03-5a-rds-postgres-force-ssl, option a).
- The `EnforceHTTPS` setting of OpenSearch domain endpoint options. The question says "require HTTPS", and the ntn page confirms that HTTPS can be required (scsc03-5a-opensearch-https-tls-policy).
- Private DNS makes the default service name resolve to the endpoint IP addresses, and gateway endpoints exist only for S3 and DynamoDB (scsc03-5a-interface-endpoint-private-dns).
- Client VPN certificate-based (mutual) authentication alone cannot provide group-based authorization rules. The pages fetched describe groups only for AD and SAML (scsc03-5a-client-vpn-saml-groups, option c).
- `kms:EncryptionContextKeys` matches context key names rather than values (scsc03-5a-bucket-key-context, option d).
- `aws eks associate-encryption-config` is the operation that associates a CMK. The question does not name it.
- ECS Service Connect does not take public ACM certificates. This is inferred from the TLS page, which describes AWS Private CA only.

## Deviations and doubts

- JSON policy fences are used in two stems (s3-https-deny-policy, bucket-key-context), identical in EN and FR, as the task allows.
- The dragdrop item stem keeps the scoring NOTE, following the AIF-C01 example, although the profile says matching is all or nothing.
- Avoided duplicates: SAP-C03 already covers the DynamoDB CMK switch, ALB TLS 1.3 default policy, CloudHSM key store and Verified Access contractor/TCP cases. The parallel 5c batch has an "imported material + automatic rotation + FIPS" question, so this batch has no KMS key-store-choice question.
- The EBS associated KMS keys question (5.2.1) touches snapshot sharing, which the 5b batch (5.2.4) may also cover from a backup angle.
- AWS App Mesh is not used anywhere. It is named on the EKS best-practices page but is discontinued.
