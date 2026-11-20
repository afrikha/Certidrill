A professional-level pipeline question is rarely about whether to automate. It asks how one pipeline in a tooling account builds an artifact once, scans and signs it, promotes it through test and production accounts in several Regions, gates it on quality checks (including checks of AI output), and rolls it back on its own when a metric degrades. This chapter covers CodePipeline, CodeBuild and CodeDeploy design, security scanning and artifact signing, cross-account and cross-Region delivery, evaluation of generative AI applications, and deployment strategies with automatic rollback.

<!-- section: pipeline-orchestration | objectives: 5.2.1 -->
## Orchestrating build and deployment pipelines

**AWS CodePipeline** models a release as stages that contain actions (source, build, test, deploy, approval, invoke). Actions with the same `runOrder` run in parallel; stages run in sequence. New pipelines should use the **V2 type**, which is where all recent features live:

| Requirement | V2 feature |
| --- | --- |
| Start only for a Git tag, a branch pattern, a pull request or changes under certain file paths | Triggers with filters on the source action |
| Pass a value (target environment, image tag) when an execution starts | Pipeline-level variables (action-level variables exist in V1 and V2) |
| Keep every commit, in order, instead of letting newer runs overtake waiting ones | `QUEUED` execution mode (the default `SUPERSEDED` lets a newer execution replace a waiting one) |
| Let feature branches deploy to their own environments without waiting for each other | `PARALLEL` execution mode |
| Go back to the last successful artifact of a stage | Stage rollback (manual, or automatic on stage failure) |
| Block, skip or roll back a stage depending on an alarm, a time window or a variable | Stage conditions: entry (`beforeEntry`: fail or skip), on failure (roll back), on success (roll back or fail), with rules such as `CloudWatchAlarm`, `DeploymentWindow`, `LambdaInvoke`, `VariableCheck` |
| Run a few shell commands without a separate CodeBuild project | The Commands action |
| Retry a flaky stage on its own | Automatic retry on stage failure (not combinable with an on-failure condition) |

The other services:

- **Source**: AWS CodeCommit (open to new customers again since November 25, 2025), GitHub, GitLab or Bitbucket through **AWS CodeConnections**, an S3 object, or an ECR image push.
- **AWS CodeBuild** runs the build and test commands of a `buildspec.yml` in managed containers. It can run inside a VPC to reach private test databases, read secrets from Secrets Manager or Parameter Store at run time (never in the source), publish test and coverage reports, and push images to ECR.
- **AWS CodeDeploy** deploys to EC2 and on-premises instances (agent and `appspec.yml` with lifecycle hooks), to Lambda (alias traffic shifting) and to ECS (blue/green with test and production listeners).
- **Manual approval** actions pause the pipeline (they time out after seven days) and notify an SNS topic.

```yaml
version: 0.2
env:
  secrets-manager:
    REGISTRY_TOKEN: prod/build/registry:token
phases:
  pre_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin "$REPO_URI"
  build:
    commands:
      - docker build -t "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION" .
      - docker push "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"
  post_build:
    commands:
      - printf '{"ImageURI":"%s"}' "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION" > imageDetail.json
artifacts:
  files:
    - imageDetail.json
    - appspec.yaml
    - taskdef.json
```

> **Exam trap.** "Deployments must happen only on release tags `v*`" or "each developer branch deploys to its own stack in parallel" requires a V2 pipeline (trigger filters, `PARALLEL` mode). With a V1 pipeline, the answer would need extra Lambda or EventBridge glue, which is more operational overhead. Note also that stage rollback is not available in `PARALLEL` mode.

<!-- section: security-scanning-signing | objectives: 5.2.2 -->
## Security scanning and artifact signing in the pipeline

DevSecOps moves security checks into the pipeline so that a vulnerable or tampered artifact never reaches an account that runs workloads.

**Vulnerability scanning with Amazon Inspector**

| Scan point | Mechanism | What it catches |
| --- | --- | --- |
| Source repository | Inspector code security, connected to GitHub or GitLab (including self-managed instances through CodeConnections or a VPC) | First-party code (SAST), third-party dependencies, infrastructure as code; can open pull requests with fixes |
| Pipeline gate | CodePipeline `InspectorScan` action, mode `SourceCodeScan` or `ECRImageScan`, with `CriticalThreshold`, `HighThreshold`, `MediumThreshold`, `LowThreshold` | Fails the action when more findings than the threshold exist; outputs an SBOM and the variable `HighestScannedSeverity` |
| Any CI tool | Inspector SBOM Generator (CycloneDX SBOM) plus the Inspector Scan API; ready plugins for GitHub Actions, Jenkins and TeamCity | Vulnerabilities before the image is pushed |
| Registry | ECR enhanced scanning by Inspector, on push or continuous | OS and programming-language packages; continuous mode rescans when a new CVE is published |
| Running functions | Inspector Lambda scanning | Vulnerable packages and code in deployed functions |

ECR **basic scanning** is billed by ECR and scans on push or manually. **Enhanced scanning** is configured at the registry level, billed by Inspector, and sends findings to Security Hub and EventBridge (basic scanning does not). Continuous scanning covers an image for a limited window after push or last use (7 days by default for ECR scanning activated since October 15, 2026; configurable). Inspector also maps images to the ECS tasks and EKS pods that run them, which helps prioritize.

**Signing artifacts with AWS Signer**

- **ECR managed signing** (recommended): a registry signing configuration holds up to 10 rules, each pairing a Signer signing profile with repository filters. ECR signs every matching image at push, with the identity of the pusher, which needs `signer:SignPayload` on the profile. The profile must be in the registry's Region; a central account can own profiles used by other accounts.
- **Manual signing**: the Notation CLI with the AWS Signer plugin signs client-side before the push. Verification at deployment also uses Notation-based tooling (for example an admission controller on EKS).
- **Lambda code signing**: a code signing configuration lists the allowed signing profiles and an untrusted-artifact policy, `Warn` (default: deploy and emit the `SignatureValidationErrors` metric) or `Enforce` (block). Lambda checks integrity, expiry, mismatch and revocation of .zip packages and layers at deployment time; running code is not rechecked.

```bash
aws ecr put-signing-configuration \
  --signing-configuration '{"rules":[{"signingProfileArn":"arn:aws:signer:eu-west-1:111122223333:/signing-profiles/release","repositoryFilters":[{"filter":"prod-*","filterType":"WILDCARD_MATCH"}]}]}'
aws lambda create-code-signing-config \
  --allowed-publishers SigningProfileVersionArns=arn:aws:signer:eu-west-1:111122223333:/signing-profiles/lambda/v1 \
  --code-signing-policies UntrustedArtifactOnDeployment=Enforce
```

> **Exam trap.** "Block deployment of any image with critical vulnerabilities" is a pipeline gate (`InspectorScan` threshold or SBOM scan before push). Continuous ECR scanning only reports findings after the image is in the registry; it does not stop a deployment by itself.

<!-- section: cross-account-pipelines | objectives: 5.2.3 -->
## Multi-account and multi-Region pipelines

The usual layout: a **tooling (deployment) account** owns the pipeline, the artifacts and the build; workload accounts (test, staging, production) own the resources and expose a **cross-account role** that the pipeline assumes. No long-term credentials exist anywhere.

| Element | Where | Requirement |
| --- | --- | --- |
| Artifact bucket | Tooling account | Bucket policy that lets the target accounts read artifacts and write output artifacts |
| Encryption key | Tooling account, pipeline Region | **Customer managed KMS key**; the key policy allows the target accounts; reference it by key ID or ARN (aliases don't resolve across accounts). The AWS managed key can't be shared |
| Cross-account role | Each target account | Trust policy scoped to the pipeline service role; permissions for the deploy action (CloudFormation, CodeDeploy, ECS) and for the artifact bucket and key |
| Pipeline service role | Tooling account | `sts:AssumeRole` on each cross-account role |
| Action | Pipeline definition | `roleArn` of the target-account role; created with the CLI, SDK or CloudFormation, not the console |

For a **CloudFormation deploy action**, the cross-account role passes a second role, the CloudFormation execution role in the target account, which actually creates the resources.

**Cross-Region actions** add a `region` to the action and an `artifactStores` map with one bucket per Region. Each bucket and its key are in the action's Region and in the pipeline account. CodePipeline copies the action's input artifacts there. Source, third-party and custom actions can't be cross-Region.

```json
{
  "pipeline": {
    "name": "orders-release",
    "pipelineType": "V2",
    "artifactStores": {
      "eu-west-1": { "type": "S3", "location": "tooling-artifacts-eu-west-1", "encryptionKey": { "id": "arn:aws:kms:eu-west-1:111122223333:key/1111aaaa-22bb-33cc-44dd-555566667777", "type": "KMS" } },
      "us-east-1": { "type": "S3", "location": "tooling-artifacts-us-east-1", "encryptionKey": { "id": "arn:aws:kms:us-east-1:111122223333:key/8888eeee-99ff-00aa-11bb-222233334444", "type": "KMS" } }
    },
    "stages": [
      {
        "name": "DeployProd",
        "actions": [
          {
            "name": "DeployUsEast1",
            "region": "us-east-1",
            "roleArn": "arn:aws:iam::444455556666:role/PipelineDeployRole",
            "actionTypeId": { "category": "Deploy", "owner": "AWS", "provider": "CloudFormation", "version": "1" },
            "configuration": {
              "ActionMode": "CREATE_UPDATE",
              "StackName": "orders",
              "TemplatePath": "BuildOutput::template.yaml",
              "RoleArn": "arn:aws:iam::444455556666:role/CloudFormationExecutionRole"
            },
            "inputArtifacts": [ { "name": "BuildOutput" } ]
          }
        ]
      }
    ]
  }
}
```

**Artifact promotion**: build once, then promote the same immutable artifact. Reference container images by digest (or immutable tags), replicate them with ECR cross-account and cross-Region replication rules (only images pushed after the rule is created are replicated), and move from one environment to the next only after tests, an approval action or an alarm-based stage condition. Rebuilding per environment breaks the guarantee that production runs what was tested. For infrastructure in many accounts, the pipeline can call CloudFormation StackSets actions or CDK Pipelines (target accounts bootstrapped with `cdk bootstrap --trust` for the tooling account).

> **Exam tip.** "The deploy action in the production account fails with access denied on the artifact" almost always means the artifacts are encrypted with the default AWS managed key, or the customer managed key policy does not include the production account. Switch the artifact store to a customer managed key and grant the target role.

<!-- section: ai-evaluation | objectives: 5.2.4 -->
## Evaluating AI applications before release

Prompts, model versions and knowledge bases change behavior as much as code does, so they deserve a quality gate. **Amazon Bedrock Evaluations** offers:

| Job type | How it scores | Use when |
| --- | --- | --- |
| Automatic (programmatic) | Built-in or custom prompt datasets; task types general text generation, summarization, question and answer, classification; metrics accuracy, robustness, toxicity | Quick, cheap comparison of models on standard tasks |
| Model as a judge (LLM-as-a-judge) | A judge model scores each response and explains why: quality metrics (`Builtin.Correctness`, `Builtin.Completeness`, `Builtin.Faithfulness`, `Builtin.Helpfulness`, `Builtin.Relevance`...) and responsible AI metrics (`Builtin.Harmfulness`, `Builtin.Stereotyping`, `Builtin.Refusal`); custom metrics allowed | Human-like quality judgment at scale |
| RAG evaluation | Retrieve only (`Builtin.ContextRelevance`, `Builtin.ContextCoverage`) or retrieve and generate (correctness, faithfulness, citation precision and coverage...) | Checking a Bedrock knowledge base or another RAG source |
| Human evaluation | Your own work team (up to 50 workers per team) rates responses | Subjective criteria, brand tone, expert domains |

You can **bring your own inference responses**: the dataset already contains the outputs of a model or RAG system hosted outside Bedrock, and Bedrock only scores them. Reports land in S3.

For agents, **Amazon Bedrock AgentCore Evaluations** scores agent traces (OpenTelemetry) with built-in evaluators such as `Builtin.Helpfulness` or custom ones: **on-demand** (chosen traces, for example in a build), **batch** (many sessions, baselines and regression tests after a prompt or model change), and **online** (a sample of live sessions, for production monitoring).

A pipeline gate: a CodeBuild or Lambda action starts the evaluation job on a fixed golden dataset, waits, reads the report and fails the stage if a score falls below the threshold agreed with the business. Guardrails are a different control: they filter each request and response at run time; evaluations measure quality before release.

> **Exam trap.** SageMaker Clarify and SageMaker Model Monitor are no longer open to new customers. For foundation model and RAG quality, the answer is Bedrock Evaluations (or AgentCore Evaluations for agents), not a Clarify processing job.

<!-- section: deployment-strategies | objectives: 5.2.5 -->
## Deployment strategies with rollback

| Strategy | How it works | Rollback | Trade-off |
| --- | --- | --- | --- |
| All at once / in place | Replace the version on every target together | Redeploy the previous version | Fastest, full outage risk |
| Rolling | Replace targets in batches | Redeploy; partial mix of versions meanwhile | No extra capacity; capacity reduced during the update unless an extra batch is added |
| Immutable | New instances with the new version, swapped in after health checks | Terminate the new instances | Extra capacity for the duration |
| Blue/green | Full new environment, traffic switched at once after tests | Switch traffic back (fast while blue exists) | Doubles resources temporarily |
| Canary | A small percentage of traffic first, then the rest after a bake time | Shift traffic back to the old version | Real-user validation with small blast radius |
| Linear | Equal increments at fixed intervals | Shift back | Slower, gradual |

Platform by platform:

- **EC2 with CodeDeploy**: in-place with `CodeDeployDefault.OneAtATime` (default), `HalfAtATime` or `AllAtOnce`, or blue/green that copies the Auto Scaling group and reroutes the load balancer.
- **Lambda**: an alias shifts weight between versions; CodeDeploy configurations such as `CodeDeployDefault.LambdaCanary10Percent5Minutes` or `LambdaLinear10PercentEvery1Minute`, with pre-traffic and post-traffic hook functions and CloudWatch alarms that trigger automatic rollback.
- **Amazon ECS**: rolling update with the **deployment circuit breaker** (failure threshold `BOUNDED_PERCENT` by default, 50 % of desired count clamped between 3 and 200; `rollback=true` returns to the last `COMPLETED` deployment) and CloudWatch alarms in the deployment configuration. ECS also has built-in **blue/green** (lifecycle hooks with Lambda or pause, bake time during which blue is kept for instant rollback), **LINEAR** and **CANARY** strategies with an ALB or NLB and two target groups. CodeDeploy ECS configurations (`ECSCanary10Percent5Minutes`, `ECSLinear10PercentEvery1Minutes`) remain; with an NLB, CodeDeploy supports only `ECSAllAtOnce`.
- **API Gateway**: a canary release on a stage sends a percentage of requests to the new deployment, then is promoted or removed.
- **CloudFormation**: rollback triggers watch up to 5 CloudWatch alarms (or composite alarms) during the update and a monitoring period of 0–180 minutes, and roll back the whole stack update if one goes to `ALARM`.
- **CodePipeline V2**: stage rollback returns the stage to the last successful source revision, automatically on failure or through an on-success condition fed by an alarm.

```yaml
OrdersFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: app.handler
    Runtime: python3.13
    CodeUri: src/
    AutoPublishAlias: live
    DeploymentPreference:
      Type: Canary10Percent5Minutes
      Alarms:
        - !Ref OrdersErrorsAlarm
        - !Ref OrdersLatencyP99Alarm
      Hooks:
        PreTraffic: !Ref PreTrafficCheckFunction
```

> **Exam tip.** "Shift 10 % of users to the new version, and return everyone to the old version automatically if errors rise, with the LEAST effort" means a canary configuration with CloudWatch alarms attached (CodeDeploy, SAM `DeploymentPreference` or ECS built-in canary), not a Route 53 weighted record changed by a script.

<!-- section: key-points -->
## Key points

- Use CodePipeline V2: trigger filters on tags, branches and paths, pipeline variables, `QUEUED` and `PARALLEL` modes, stage conditions, stage rollback and automatic retry.
- Scan in the pipeline (`InspectorScan` thresholds, SBOM Generator and Scan API), scan the registry continuously (ECR enhanced scanning), sign with AWS Signer (ECR managed signing, Lambda code signing with `Enforce`).
- Cross-account pipelines need a customer managed KMS key, a bucket policy, a target-account role and `roleArn` on the action; cross-Region actions need one artifact store per Region.
- Build once, promote the same digest; ECR replication across accounts and Regions; approvals and alarm conditions between stages.
- Gate AI releases with Bedrock Evaluations (programmatic, judge model, RAG, human) and AgentCore Evaluations for agents.
- Canary, linear and blue/green shift traffic with alarm-driven rollback; the ECS circuit breaker and CloudFormation rollback triggers roll back automatically.
