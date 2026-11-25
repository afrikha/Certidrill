Pipeline questions at the professional level are rarely about clicking through the CodePipeline console. They describe a company with several accounts and Regions, a source repository, a build and a deployment target, and ask how to start the right execution on the right event, build it securely, pass secrets without exposing them, deploy into another account and choose a deployment strategy that meets a downtime or rollback requirement. This chapter covers SDLC models, single- and multi-account pipeline patterns, repository configuration, version control triggers, CodeBuild build processes, build and deployment secrets, and the choice of a CodeDeploy deployment strategy.

<!-- section: sdlc-models | objectives: 1.1.1 -->
## SDLC concepts, phases and delivery models

Every software development lifecycle goes through the same phases: plan, code, build, test, release, deploy, operate and monitor. Models differ in how often they loop through them:

| Model | How it works | What the exam associates with it |
| --- | --- | --- |
| Waterfall | Each phase completes before the next one starts; long release cycles | Large, risky releases; testing late; the situation a DevOps scenario wants to leave |
| Agile (Scrum, Kanban) | Short iterations deliver small increments | Frequent small changes, which require automated build and test |
| DevOps | Development and operations share ownership of delivery and production | Automation of every phase, infrastructure as code, monitoring feeding back into planning |

The three "continuous" practices are the most tested vocabulary:

| Practice | What is automated | Where it stops |
| --- | --- | --- |
| Continuous integration | Every commit to the shared branch is built and unit tested | A tested artifact |
| Continuous delivery | Every change that passes the tests is deployed to pre-production and is ready for release | A human approves the production release |
| Continuous deployment | Every change that passes all automated tests is deployed to production | Nothing: no human step |

**Trunk-based development** (short-lived branches merged into `main` at least daily, unfinished features hidden behind feature flags such as AWS AppConfig feature flags) suits continuous deployment. Long-lived release and develop branches (GitFlow) suit scheduled releases but delay integration.

> **Exam trap.** "Every change must reach production automatically, but a release manager must sign off first" is continuous delivery, not continuous deployment: the design needs a manual approval action before the production stage. A stem that says "no manual steps to production" excludes the approval action.

<!-- section: multi-account-pipelines | objectives: 1.1.2 -->
## Pipeline patterns for single- and multi-account environments

A **single-account** pipeline separates environments by stacks, tags or VPCs: simple, but with weak isolation. The pattern AWS recommends is **multi-account**: a central tooling account owns the pipeline, each environment (dev, test, prod) is a separate account, and the pipeline deploys by assuming roles in the target accounts. The pieces that make it work:

| Piece | Where | Why |
| --- | --- | --- |
| KMS customer managed key | Tooling account, same Region as the pipeline | Encrypts the artifact bucket; its key policy lets the target accounts decrypt. The AWS managed key cannot be shared with another account |
| Artifact bucket policy | Tooling account | Lets the target accounts read input artifacts and write output artifacts |
| Cross-account role | Each target account | Trusts the pipeline's service role; allows the deploy actions (CodeDeploy, CloudFormation) and access to the bucket and the key |
| CloudFormation service role | Each target account | Passed by the cross-account role to CloudFormation, which creates the resources with it |
| `sts:AssumeRole` permission | Pipeline service role | Lets CodePipeline assume the cross-account roles |

The action declares the role to assume; the artifact store declares the key by ARN (an alias is recognized only in the account that created the key):

```json
{
  "pipeline": {
    "name": "orders-release",
    "pipelineType": "V2",
    "roleArn": "arn:aws:iam::111122223333:role/CodePipelineServiceRole",
    "artifactStore": {
      "type": "S3",
      "location": "codepipeline-artifacts-111122223333-eu-west-1",
      "encryptionKey": { "id": "arn:aws:kms:eu-west-1:111122223333:key/1a2b3c4d-5678-90ab-cdef-EXAMPLE11111", "type": "KMS" }
    },
    "stages": [
      {
        "name": "DeployProd",
        "actions": [
          {
            "name": "DeployStack",
            "actionTypeId": { "category": "Deploy", "owner": "AWS", "provider": "CloudFormation", "version": "1" },
            "roleArn": "arn:aws:iam::444455556666:role/PipelineDeployRole",
            "configuration": {
              "ActionMode": "CREATE_UPDATE",
              "StackName": "orders-prod",
              "TemplatePath": "BuildOutput::template.yaml",
              "RoleArn": "arn:aws:iam::444455556666:role/CloudFormationExecutionRole"
            },
            "inputArtifacts": [{ "name": "BuildOutput" }]
          }
        ]
      }
    ]
  }
}
```

Other facts the exam uses:

- A cross-account pipeline is created or edited with the CLI, CloudFormation or an SDK; the console cannot create a pipeline that uses resources of another account.
- **Cross-Region actions** need an artifact bucket and key in every Region where actions run, declared in `artifactStores`; CodePipeline copies the input artifacts there. Source actions can't be cross-Region.
- To deploy one template to many accounts and Regions, use the **CloudFormation StackSets** deploy action, or StackSets with service-managed permissions and automatic deployment so that new accounts of an OU receive the stack.
- The **AWS CDK Pipelines** construct builds a self-mutating pipeline; each target account is bootstrapped with `cdk bootstrap --trust` naming the tooling account.

```bash
cdk bootstrap aws://444455556666/eu-west-1 \
  --trust 111122223333 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

> **Exam trap.** "The deploy action in the production account fails with an access denied error on the artifact" almost always means the key: the artifact bucket uses the default AWS managed key, or the key policy doesn't name the production account. Fix the key and the bucket policy, not the deployment group.

<!-- section: repositories | objectives: 1.1.3 -->
## Configuring code, image and artifact repositories

| Repository type | AWS options | Configuration that matters to a pipeline |
| --- | --- | --- |
| Source code | AWS CodeCommit; GitHub, GitHub Enterprise Server, GitLab and Bitbucket through AWS CodeConnections | Branch protection and pull request approval rules; a connection per provider shared by CodePipeline, CodeBuild and CodeDeploy |
| Container images | Amazon ECR private repositories | Tag immutability, scan on push, lifecycle policy, repository policy for cross-account pulls, replication to other Regions or accounts |
| Packages | AWS CodeArtifact | Domain shared by the organization, upstream repositories, one external connection to a public registry |
| Build output | Amazon S3 | Versioning (required when an S3 bucket is a pipeline source), SSE-KMS encryption, lifecycle rules |

**AWS CodeConnections** (formerly AWS CodeStar Connections; the old `codestar-connections` namespace still works) gives AWS services access to third-party Git providers without storing a token. A connection created with the CLI or CloudFormation stays `PENDING` until someone completes the authorization handshake in the console, then becomes `AVAILABLE`. Self-managed providers (GitHub Enterprise Server, GitLab self-managed) also need a **host** resource, with a VPC configuration when the server is private. Principals that use the connection need `codeconnections:UseConnection`.

AWS CodeCommit closed to new customers in July 2024 and reopened on November 25, 2025: it is again a valid answer. Chapter 13 covers CodeArtifact, ECR and S3 in depth.

<!-- section: version-control-integration | objectives: 1.1.4 -->
## Starting pipelines from version control events

How a change starts a pipeline depends on the source provider:

| Source | Change detection | Filtering |
| --- | --- | --- |
| CodeConnections (GitHub, GitLab, Bitbucket) | Events from the connection | V2 **triggers**: push filters on branches, file paths and Git tags; pull request filters on branches and file paths for the `OPEN`, `UPDATED` and `CLOSED` events |
| AWS CodeCommit | An EventBridge rule on the repository and branch (created by the console) | One branch per source action; for more logic, an EventBridge rule with a pattern on `referenceCreated` or `referenceUpdated` |
| Amazon S3 | An EventBridge rule on the object key | Object key only; the bucket must be versioned |
| Amazon ECR | An EventBridge rule on an image push | Repository and image tag |

Triggers are supported only for connection sources (`providerType: CodeStarSourceConnection`); once a trigger is declared, the default change detection on the configured branch is disabled. A push trigger runs the commit of the destination branch; a pull request trigger runs the commit of the source branch. If an include and an exclude pattern are identical, the exclude wins.

```yaml
Triggers:
  - ProviderType: CodeStarSourceConnection
    GitConfiguration:
      SourceActionName: Source
      Push:
        - Tags:
            Includes:
              - release-*
      PullRequest:
        - Events:
            - OPEN
            - UPDATED
          Branches:
            Includes:
              - main
          FilePaths:
            Includes:
              - services/orders/**
```

Other V2 pipeline settings tested with version control:

- **Execution modes**: SUPERSEDED (default; a newer execution replaces one waiting at a stage), QUEUED (executions run one after another, in order), PARALLEL (independent executions, for example one per feature branch).
- **Pipeline variables** passed at start (target environment, version), and **output variables** from actions, such as `#{SourceVariables.CommitId}` or a CodeBuild exported variable.
- **Output artifact format**: the default ZIP of the files, or a **full clone** that lets a downstream CodeBuild action run Git commands (tags, history); full clone works only with CodeBuild as the next action, and the CodeBuild role needs permission to use the connection.

Polling is a legacy option: "as soon as changes are pushed" with the least overhead means event-based detection or a trigger.

> **Exam trap.** "Run the production pipeline only when a release tag is pushed" is a V2 trigger with a tag filter on a connection source. A CodeCommit source has no trigger filters: use an EventBridge rule matching `referenceType` tag, with the pipeline as target.

<!-- section: build-processes | objectives: 1.1.5 -->
## Setting up build processes with AWS CodeBuild

A CodeBuild **project** defines the source, the environment (image, compute, privileged mode, VPC), the service role, environment variables, the cache, the artifacts and the buildspec location (a `buildspec.yml` at the root of the source by default, another file name, or an inline buildspec). Use **version 0.2** of the buildspec: all commands of a build run in the same shell instance.

```yaml
version: 0.2
env:
  variables:
    IMAGE_REPO: 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api
  exported-variables:
    - IMAGE_TAG
phases:
  install:
    runtime-versions:
      python: 3.12
  pre_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin 111122223333.dkr.ecr.eu-west-1.amazonaws.com
      - export IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-12)
  build:
    on-failure: ABORT
    commands:
      - pip install -r requirements.txt
      - python -m pytest tests/unit
      - docker build -t $IMAGE_REPO:$IMAGE_TAG .
    finally:
      - echo "Build phase finished"
  post_build:
    commands:
      - if [ "$CODEBUILD_BUILD_SUCCEEDING" = "1" ]; then docker push $IMAGE_REPO:$IMAGE_TAG; fi
artifacts:
  files:
    - imagedefinitions.json
    - appspec.yaml
cache:
  paths:
    - '/root/.cache/pip/**/*'
```

Phase rules the exam tests:

- The phases are `install`, `pre_build`, `build` and `post_build`, always in that order. A command with a non-zero exit code fails its phase.
- If `build` fails, `post_build` still runs, which is why it tests `CODEBUILD_BUILD_SUCCEEDING` (`1` succeeding, `0` failing) before pushing anything; the artifact upload is always attempted.
- `on-failure` per phase: `ABORT`, `CONTINUE`, or `RETRY` (3 attempts), `RETRY-count` (0 to 100), with an optional regular expression. A `finally` block runs even when a command of the phase failed.
- `exported-variables` become CodePipeline output variables; secrets and variables starting with `AWS_` cannot be exported. A value given when the build starts overrides the project's, which overrides the buildspec's.

| Need | CodeBuild setting |
| --- | --- |
| Build Docker images | Privileged mode on the project |
| Reach a private database or internal endpoint | VPC configuration (subnets and security groups); internet access then goes through a NAT gateway |
| Faster dependency downloads shared by all build hosts | Amazon S3 cache |
| Faster builds on the same host for frequent builds | Local cache: source (Git metadata), Docker layer (needs privileged mode, Linux only), custom (directories listed in the buildspec); not available in a VPC |
| Several builds from one start: parallel, dependent, combinations, test shards | Batch builds: `build-list`, `build-graph`, `build-matrix`, `build-fanout` |
| Very fast start for short builds | Lambda compute: no Docker, no privileged mode, no caching, no VPC, 15-minute maximum, `/tmp` only |
| Predictable capacity with no provisioning delay | Reserved capacity fleet |
| A private base image from Docker Hub or another registry | Registry credentials stored in Secrets Manager and referenced by the project |

> **Exam trap.** A build that must pull from or push to Docker needs privileged mode; Lambda compute can't do it at all. A build that times out reaching a private RDS instance needs the project in the VPC, and a VPC build that must also download packages needs a NAT gateway in the route of its private subnets.

<!-- section: build-deployment-secrets | objectives: 1.1.6 -->
## Managing build and deployment secrets

| Need | AWS Secrets Manager | Systems Manager Parameter Store |
| --- | --- | --- |
| Automatic rotation | Managed rotation for supported services, or a Lambda rotation function; as often as every 4 hours | None built in |
| Cross-account access | Resource policy on the secret plus a customer managed KMS key | Advanced parameters can be shared with other accounts |
| Size and scale | Larger secrets, JSON key-value pairs | Standard: 4 KB, 10,000 per account and Region, no extra charge; Advanced: 8 KB, 100,000, parameter policies, charged |
| Typical content | Database passwords, API keys, third-party tokens | Configuration values, non-rotated secrets as `SecureString`, AMI IDs |

A buildspec reads both stores at run time through the CodeBuild service role, which needs `ssm:GetParameters` or `secretsmanager:GetSecretValue`, plus `kms:Decrypt` on a customer managed key:

```yaml
version: 0.2
env:
  parameter-store:
    SONAR_URL: /ci/sonar/url
  secrets-manager:
    SONAR_TOKEN: arn:aws:secretsmanager:eu-west-1:111122223333:secret:ci/sonar-AbCdEf:token
    DB_PASSWORD: prod/orders/db:password:AWSCURRENT
phases:
  build:
    commands:
      - ./scan.sh --url "$SONAR_URL" --token "$SONAR_TOKEN"
```

The `secrets-manager` format is `secret-id:json-key:version-stage:version-id`; without a stage or ID, CodeBuild reads the `AWSCURRENT` version. Project environment variables have the types `PLAINTEXT`, `PARAMETER_STORE` and `SECRETS_MANAGER`, and the CodePipeline Commands action accepts `SECRETS_MANAGER` variables. Secret values are masked in build logs.

Rules the exam applies:

- Never put a secret in a plaintext environment variable, the buildspec, the pipeline definition, the template or the source repository. A CloudFormation template uses a dynamic reference (`{{resolve:secretsmanager:...}}`) instead.
- Applications read secrets at run time (ECS `secrets` with `valueFrom`, the Lambda Parameters and Secrets extension, the SDK with the instance role), so rotation needs no redeployment; a value baked into an AMI or image at build time breaks at the next rotation.
- Cross-account reading of a secret needs the resource policy, an identity policy in the reading account and a customer managed key; the AWS managed key `aws/secretsmanager` doesn't work across accounts.
- Short-lived tokens are generated at build time instead of being stored, for example `aws codeartifact login` in `pre_build`.

> **Exam trap.** Masking in the logs does not protect a secret from someone who can edit the buildspec or the pipeline: they can print or send it. Restrict who can modify the buildspec, the project and the pipeline, and scope each secret to the build role that needs it.

<!-- section: deployment-strategy-choice | objectives: 1.1.7 -->
## Determining the deployment strategy with AWS CodeDeploy

CodeDeploy deploys a revision to a deployment group on one of three compute platforms. The deployment type and configuration decide downtime, cost and rollback speed:

| Platform | Deployment types | Predefined configurations |
| --- | --- | --- |
| EC2/On-premises | In-place (rolling across the instances) or blue/green (new instances behind the load balancer) | `CodeDeployDefault.OneAtATime` (default), `HalfAtATime`, `AllAtOnce`; custom minimum healthy hosts as a count or a percentage |
| AWS Lambda | Traffic shifting between two versions of an alias | `LambdaCanary10Percent5Minutes` (also 10, 15, 30 minutes), `LambdaLinear10PercentEvery1Minute` (also 2, 3, 10 minutes), `LambdaAllAtOnce` |
| Amazon ECS | Blue/green with a test listener and traffic shifting | `ECSCanary10Percent5Minutes`, `ECSCanary10Percent15Minutes`, `ECSLinear10PercentEvery1Minutes`, `ECSLinear10PercentEvery3Minutes`, `ECSAllAtOnce` |

All predefined names start with `CodeDeployDefault.` (for example `CodeDeployDefault.LambdaCanary10Percent5Minutes`); AWS SAM's `DeploymentPreference` uses the short form (`Canary10Percent5Minutes`). ECS services can also use the ECS deployment controller, which now offers rolling, blue/green, linear and canary deployments natively; CodeDeploy is not required for ECS blue/green anymore.

| Requirement in the stem | Strategy |
| --- | --- |
| Lowest cost, short reduced capacity acceptable | In-place, `HalfAtATime` or a custom minimum healthy hosts value |
| No reduced capacity and the fastest rollback | Blue/green: the original fleet stays until the new one is validated |
| Test with a small share of real traffic before everyone | Canary |
| Increase exposure gradually and evenly | Linear |
| Roll back automatically when errors rise | CloudWatch alarms on the deployment group with automatic rollback on alarm and on failure |
| Validate before production traffic arrives | Hooks: `ValidateService` on EC2; `BeforeAllowTraffic` on Lambda; `AfterAllowTestTraffic` on ECS |

A CodeDeploy rollback is a **new deployment** of the last known good revision, with a new deployment ID. EC2 targets need the CodeDeploy agent; Lambda and ECS targets don't. Chapter 14 covers each deployment method and hook in detail.

> **Exam tip.** Zero downtime alone doesn't select blue/green: rolling with enough healthy hosts also avoids an outage. Look for the second constraint: full capacity during deployment and instant rollback point to blue/green; "a small percentage of users first" points to canary; "the cheapest option" points to in-place.

<!-- section: key-points -->
## Key points

- Continuous delivery stops at a human approval before production; continuous deployment has none. Trunk-based development suits continuous deployment.
- Multi-account pipelines: a tooling account, a KMS customer managed key shared through its key policy, an artifact bucket policy, cross-account roles with `roleArn` on the action, a CloudFormation service role in the target account. No console for cross-account pipelines.
- Cross-Region actions need an artifact bucket and key per Region in `artifactStores`; StackSets or CDK Pipelines for many accounts and Regions.
- CodeConnections: `PENDING` until completed in the console; V2 triggers filter pushes on branches, paths and tags and pull requests on `OPEN`, `UPDATED`, `CLOSED`, only for connection sources. CodeCommit uses EventBridge rules.
- Buildspec 0.2: `post_build` runs after a failed `build`, so check `CODEBUILD_BUILD_SUCCEEDING`; `on-failure` and `finally`; privileged mode for Docker; VPC for private resources; Lambda compute has no Docker, cache or VPC.
- Secrets Manager for rotated and cross-account secrets, Parameter Store for configuration; `env` `secrets-manager` and `parameter-store` with the right role permissions; never plaintext.
- CodeDeploy: in-place or blue/green on EC2, canary, linear or all-at-once on Lambda and ECS, alarms with automatic rollback; a rollback is a new deployment.
