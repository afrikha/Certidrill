# Q-dva-c03-2c — questions DVA-C03, domain `security`, objectives 2.2.4–2.2.7 and 2.3.1

45 files `content/dva-c03/questions/security/dvac03-2c-*.yaml`, all `draft`. Validator: `45 files, 0 problem(s). Types: single=37 multi=8`.

- Per objective: 2.2.4 = 9, 2.2.5 = 9, 2.2.6 = 9, 2.2.7 = 9, 2.3.1 = 9.
- Types: single 37, multi 8 (all "Choose two" with 5 options; 1 "complete solution", 1 "which two", 6 "combination of steps").
- Difficulty: 14 easy, 22 medium, 9 hard.
- Single answers spread: a 7, b 9, c 11, d 10.
- Code in stems: python (KMS encrypt/decrypt, GetParametersByPath), json (Bedrock IAM policy, ECS `secrets`), yaml (CloudFormation dynamic reference, buildspec), bash (create-key-pair), text (~/.ssh/config). Identical in EN and FR.
- No course chapter `22-encryption-secrets` existed when the batch was written; questions rely on AWS docs only.

## Sources fetched (2026-11-20)

KMS API: Encrypt, Decrypt, GenerateDataKey, GenerateDataKeyWithoutPlaintext, ReEncrypt. KMS guide: Encryption context, Multi-Region keys, HMAC keys, Download public key, Rotate AWS KMS keys. Encryption SDK: Data key caching. EC2: Create a key pair, EC2 Instance Connect, CLI get-password-data. CodeCommit SSH setup (Linux). API Gateway generated client certificate. Private CA modes (short-lived). ACM: request private certificate, export private certificate, import certificate + prerequisites, exportable public certificates. Session Manager. CloudWatch Logs masking (overview, log group policy, account-wide policy), CLI get-log-events `--unmask`, Logs Insights `unmask`. Macie: automated discovery, custom data identifiers, allow lists, EventBridge findings. DynamoDB condition keys; IAM example Cognito row-level access; Database Encryption SDK overview + concepts. Secrets Manager: Lambda (Lambda guide), Python caching client, cross-account access, replication, managed rotation; RDS password management with Secrets Manager; ECS secrets env vars + task execution role; CloudFormation secretsmanager dynamic references; CodeBuild buildspec reference; Parameter Store SecureString KMS, parameter tiers, GetParametersByPath. Bedrock: Request access to models, inference profile prerequisites, API keys, Converse API, quotas (overview, increase, runtime), identity-based policy examples.

## Availability findings used (avoid elsewhere)

- Amazon SNS message data protection is no longer available to new customers (SNS page notice): not used.
- S3 Object Lambda is available only to existing customers since November 7, 2025: not used (also a candidate fix for other PII questions).
- Bedrock Model access page now applies to AWS GovCloud (US) only; commercial Regions enable models on first use (used as a distractor in marketplace-first-use).
- Anthropic first-time use form required only for models earlier than Claude Opus 4.7 (bedrock-anthropic-ftu says "a model that requires the form").

## Not verified on a fetched page (stable knowledge, review)

- EC2 Instance Connect Endpoint requires inbound SSH on the instance from the endpoint (distractor explanation, session-manager-no-ssh).
- AWS managed key aws/secretsmanager usable by same-account principals through Secrets Manager without IAM KMS permissions (explanation, ecs-secret-execution-role).
- `${aws:username}` not defined for federated role sessions; `${cognito-identity.amazonaws.com:aud}` = identity pool ID (distractors, ddb-leadingkeys-cognito).
- `acm get-certificate` returns certificate and chain only (distractor, export-private-cert).
- Exact names `bedrock:CreateModelInvocationJob`, `bedrock:InvokeAgent`, `bedrock:GetFoundationModel` (distractors, bedrock-conversestream-perm).
- Macie suppression rules archive findings (distractor, macie-custom-identifier).
- KMS request-rate quota increase is requested through Support/Service Quotas (distractor wording kept neutral).

## Deviations and doubts

- us.amazon.nova-pro-v1:0 used as the US cross-Region profile example; the question does not depend on its lifecycle status.
- Several single questions still have the correct option slightly longer than the distractors (differences under ~10 characters); the largest gaps were rebalanced.
