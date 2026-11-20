# Q-dva-c03-3a — QUESTIONS DVA-C03, deployment 3.1.1–3.2.2 (2026-11-20)

56 questions, prefix `dvac03-3a-`, 8 per objective; single 46 / multi 10 (one "Choose three": `ecs-secrets-kms`); difficulty 16 easy / 29 medium / 11 hard. Validator: 0 problem(s). No course chapters existed for these objectives when the batch was written.

## Facts seen on AWS pages that other agents may need
- Lambda Developer Guide page titles now say "Lambda Event Functions" (e.g. "Working with .zip file archives for Python Lambda Event Functions", "Create a Lambda Event Function using a container image"); reference titles were copied as fetched.
- Lambda quotas page: maximum function timeout is now **1,800 seconds (30 min)**, and up to 5,400 s for Lambda Managed Instances / async / most event source mappings. Not used in this batch; course and troubleshooting writers should not keep "15 minutes".
- "Choose between REST APIs and HTTP APIs" now lists the **JWT authorizer for both** REST and HTTP APIs, so "JWT authorizer = HTTP API only" is no longer a safe distinction.
- ECR: `IMMUTABLE_WITH_EXCLUSION` tag mutability (exclusion filters) and lifecycle `transition` to `archive` storage class exist; ECR basic scanning is "AWS native technology" (no Clair).
- ECS resolves image tags to digests at deployment by default (software version consistency); `--force-new-deployment` re-resolves.

## Points used from general knowledge (pages did not state them explicitly)
- GetParametersByPath without `Recursive` returns only the level directly under the path (API page only says Recursive "retrieves all parameters within a hierarchy").
- Stage-variable alias syntax `function:${stageVariables.lambdaAlias}`: the tutorial page was rate-limited; the stage-variables page confirms a per-stage Lambda function name and that permissions must be added manually.
- `aws ecr get-authorization-token` returns a JSON document with a base64 token (distractor explanation).
- A CloudFormation dynamic reference in an ECS `environment` entry ends up as plaintext in the task definition (distractor explanation).
- Private REST API resource policy shown as `aws:SourceVpce` restriction (page lists it as the way to restrict, not as mandatory).

## Deliberately avoided
- API Gateway console test without deployment (not confirmed by the page).
- Exact Secrets Manager path of the Parameters and Secrets extension (only the port, header and TTL, verified on the Systems Manager page, are used).
- Amazon Q Developer, Cloud9 and AWS Copilot CLI are not used anywhere; X-Ray SDK not used.
