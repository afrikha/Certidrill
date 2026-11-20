# C-sap-c03-3 — COURSE SAP-C03, chapters 22–25 (2026-11-20)

Files: `content/sap-c03/course/chapters/{22-encryption-keys,23-multi-account-governance,24-compliance-architectures,25-responsible-ai}.{en,fr}.md`. `check-cert.ts`: 0 course problems for these chapters. Prose (code excluded) EN: 1,822 / 1,956 / 1,819 / 1,505 words.

## Verified on AWS pages (2026-11-20)
- KMS: rotation 90–2,560 days (CLI reference), on-demand up to 25 per key, multi-Region rotation on primary, rotation fee only for 1st/2nd rotation; key store comparison (CloudHSM/XKS: symmetric only, no auto rotation, no multi-Region; PQ keys can't use imported material).
- PQC: ML-DSA 44/65/87 (`ML_DSA_SHAKE_256`, RAW 4 KB / EXTERNAL_MU), ML-KEM 512/768/1024 keys (Encapsulate/Decapsulate, not in China Regions), KMS hybrid PQ TLS (`tlsDetails.keyExchange`), ALB PQ policies and defaults (console vs CLI/CFN/CDK), Private CA ML-DSA.
- CloudHSM hsm2m.medium FIPS 140-3, hsm1.medium no new clusters. Private CA short-lived mode 7 days.
- Organizations: SCP quotas raised May 2026 to 10 per target / 10,240 chars (RCP 5 / 5,120); RCP scope; declarative policy attributes.
- Control Tower control behaviors, guidance, LZ 4.0 mandatory controls not default, Region deny controls, AFC, AFT.
- CloudTrail Lake closed to new customers May 31, 2026; Audit Manager no new accounts from April 30, 2026 (maintenance mode). Both are called out as traps, never as answers.
- Security Hub vs Security Hub CSPM, Security Lake, CloudWatch Logs centralization rules, Bedrock invocation logging, Bedrock CloudTrail management vs data events.
- Bedrock Guardrails policies, `bedrock:GuardrailIdentifier`, account-level and Organizations enforcement; cross-Region inference (geographic vs global, SCP needs); AgentCore Identity inbound/outbound, AgentCore Policy; Step Functions callback pattern; Lambda durable functions (execution up to 1 year); European Sovereign Cloud (Jan 14, 2026, `eusc-de-east-1`, partition `aws-eusc`).

## From prior knowledge, not re-fetched (to review)
- KMS deletion waiting period 7–30 days; ALB mTLS trust store; API Gateway mTLS; `s3:TlsVersion`; ACM certificate for CloudFront in us-east-1; Private CA sharing via RAM; CloudHSM "at least two HSMs across AZs"; Step Functions Express 5-minute limit.
- Residency IAM actions `kms:ReplicaRegion`, `dynamodb:CreateTableReplica`, `rds:CreateGlobalCluster`, and the statement that these replicas are requested in the source Region; `arn:aws-eusc:` ARN prefix.
- Hybrid PQ TLS on ACM and Secrets Manager endpoints (only from an AWS Security Blog title cited on the KMS page).
- Bedrock knowledge base metadata filters; Bedrock Agents user confirmation / return of control (page title seen in search only).

## Deviations and notes
- No Lambda timeout figure stated anywhere (the durable functions page now lists up to 30 minutes per invocation for event functions).
- AWS Security Agent threat modeling (public preview, June 2026) deliberately left out.
- French: our translation following BRIEF-AWS §6; to review « mécanisme d'autorisation JWT », « coffre de jetons », « jeton d'accès de charge de travail », « expérience limitée aux contrôles », « Région de cumul (rollup) ».
