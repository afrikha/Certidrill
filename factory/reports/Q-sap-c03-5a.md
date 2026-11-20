# Q-sap-c03-5a — QUESTIONS SAP-C03, domain operations (5.1.1–5.2.3)

- 56 questions in `content/sap-c03/questions/operations/sapc03-5a-*.yaml`, 8 per objective (5.1.1, 5.1.2, 5.1.3, 5.1.4, 5.2.1, 5.2.2, 5.2.3).
- Types: 46 single, 10 multi (8 × choose 2 of 5, 2 × choose 3 of 6). Difficulty: 8 easy / 28 medium / 20 hard. Single answer positions: a 11, b 12, c 12, d 11. After rebalancing, the correct option is the longest in only 2 of 46 single questions, and no multi question has its correct options as the longest ones.
- Validator: `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-5a-` reports 0 problem(s).
- Multi stems end with "(Choose two.)" / "(Choose three.)" and have **no** scoring NOTE, because the blueprint sets `scoring.multi: all_or_nothing` (same choice as 4a; batches 1a/1b/2x use the NOTE, so the bank is inconsistent on this point).
- Every reference was fetched on 2026-11-20. Titles are the full page titles, with the service suffix.

## Facts verified on AWS pages that decide answers
- IaC generator: scans resources that CloudFormation doesn't manage, up to 500 resources per template, then imports them into a stack. `cdk migrate` is available.
- Stack refactoring (`create-stack-refactor`, `list-stack-refactor-actions`, `execute-stack-refactor`): resources show as MOVE actions, logical IDs can be renamed, stacks with a stack policy aren't supported, and only FULLY_MUTABLE types are supported.
- Exports and ImportValue work in the same account and Region only, and an export can't change while it is imported. **Fn::GetStackOutput** (new): StackName, OutputName, Region, RoleArn; works across accounts and Regions; weak reference.
- Stack policies apply to all users. A Deny on Update:Replace or Update:Delete protects one logical resource. An override policy applies to one update only.
- Third-party public extensions are activated per account and Region (execution role, auto-update, alias).
- Hooks: targets RESOURCE / STACK / CHANGE_SET / CLOUD_CONTROL; FailureMode FAIL / WARN; the LambdaHook and GuardHook resource types; alias unique per account and Region; Control Tower proactive controls can be implemented as hooks.
- `cloudformation-stack-drift-detection-check` takes the `cloudformationRoleArn` parameter. Config custom policy rules are written in Guard and need no Lambda.
- Drift-aware change sets: `--deployment-mode REVERT_DRIFT`, a three-way comparison that reverts drifted properties.
- Dynamic references: 60 per template; not supported in UserData, in `AWS::CloudFormation::Init` metadata, or for secure values in custom resources. A secret in another account needs its full ARN. ssm-secure works only on a list of properties (ElastiCache AuthToken, RDS and Redshift master passwords, ...), can't read another account, and doesn't support public parameters. SecureString can't be an SSM parameter type.
- Secrets Manager cross-account access needs a resource policy, a customer managed key (aws/secretsmanager isn't allowed), and an identity policy.
- ECS `secrets` with valueFrom is injected when a container starts; JSON keys need Fargate platform version 1.4.0 or later.
- Lambda extension: port 2773, `SECRETS_MANAGER_TTL` up to 300 s.
- RDS ManageMasterUserPassword: rotation every 7 days by default.
- StackSets:
  - Service-managed StackSets never deploy to the management account. A delegated administrator uses `--call-as DELEGATED_ADMIN`.
  - Account filters: INTERSECTION, DIFFERENCE, UNION.
  - In STRICT mode, MaxConcurrentCount can be at most FailureToleranceCount + 1. A stop in one Region skips the following Regions.
  - A parameter override on an OU doesn't apply to accounts that join later. Automatic deployment ignores account filters.
  - ManagedExecution Active queues conflicting operations.
  - RetainStacksOnAccountRemoval.
- CodePipeline:
  - V2-only features: triggers and filters, QUEUED and PARALLEL modes, stage conditions, rollback, the Commands action, automatic retry. Stage rollback isn't available in PARALLEL mode.
  - Entry Skip works only with LambdaInvoke and VariableCheck rules. Automatic retry can't be combined with an onFailure condition.
  - InspectorScan action: SourceCodeScan and ECRImageScan modes, thresholds, an SBOM output.
  - Cross-account: a customer managed key, a bucket policy, the action roleArn, and the CloudFormation role in the same account as the action role. Cross-Region: artifactStores in the pipeline account; source actions can't be cross-Region.
  - PutApprovalResult can be scoped to an action ARN. The BranchName variable is produced for push triggers.
- CodeBuild in a VPC needs private subnets and a NAT gateway (no public IPs or EIPs) and doesn't support shared VPCs.
- ECR managed signing: up to 10 rules, the signing profile in the same Region (cross-account allowed), and `signer:SignPayload`.
- Lambda code signing: Warn vs Enforce, `.zip` packages only, every layer must be signed. The `lambda:CodeSigningConfigArn` condition key blocks CreateFunction.
- Signer profile revocation: signatures made after the effective time aren't trusted. The effective time must be in the past.
- Inspector Code Security: SAST, dependencies, IaC, and auto-fix pull requests. It reaches GitLab Self-Managed through CodeConnections or a VPC.
- EKS signature verification: Gatekeeper with Ratify or Kyverno, plus the AWS Signer plugin.
- GitHub OIDC: the `sub` condition is required and can't be only a wildcard.

## Points stated from general knowledge (not read verbatim on a fetched page)
- The `ssm` dynamic reference doesn't resolve SecureString parameters, and AWS::SSM::Parameter can't create SecureString parameters (ssm-elasticache distractors).
- A StackSet that still has stack instances can't be deleted (retain-decommission distractor).
- The `elasticfilesystem:Encrypted` key is used in an SCP on CreateFileSystem. The EFS page confirms both the key and that SCPs can be used, but the exact policy sample wasn't on the page.
- Organization conformance packs accept Config custom policy (Guard) rules.
- The Terraform awscc provider calls the Cloud Control API. The stem states this as a fact of the scenario.
- A GitHub App installation can be limited to selected repositories.
- The ECR "Signature verification" page mentions "managed verification with Amazon EKS", while the EKS page lists only admission controllers. The EKS question offers no managed-verification option, so the answer doesn't depend on this.

## Service status
- No answer uses Migration Hub, ADS, Snow Family, OpsWorks, Amazon Q Developer, SageMaker Model Monitor or Clarify, or Incident Manager. CodeCommit appears only as a distractor (with IAM user Git credentials).
- No answer depends on Lambda timeout limits.

## Overlap check
- `sapc03-1a-ecr-gate-critical-images` uses a findings-reading stage plus tag immutability. `sapc03-5a-sbom-gate-s3-audit` tests the InspectorScan ECRImageScan action plus SBOM delivery, which is a different mechanism.
- Inspector Lambda scanning was dropped because `sapc03-2c-lambda-code-scanning` already covers it.
- The tag-policy hook (3b) and Control Tower proactive (SAA) questions aren't duplicated: the hook questions here test WARN→FAIL rollout, Lambda hooks with an external API, and CLOUD_CONTROL targets.
- `saac03-2d-stacksets-auto-deploy` covers basic auto-deployment. The StackSet questions here cover the management account, the delegated admin, the per-OU override trap, managed execution, and the other topics listed above.
