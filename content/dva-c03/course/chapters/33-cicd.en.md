Deployment questions ask for the packaging method, template or appspec setting, pipeline feature, deployment strategy or rollback mechanism that meets a requirement such as "no downtime", "shift 10 percent of traffic first" or "roll back automatically when errors rise". Designing the pipeline architecture itself is out of scope.

<!-- section: lambda-packaging | objectives: 3.3.1 -->
## Lambda deployment packages: .zip archives, container images and layers

| | .zip archive | Container image | Layer |
| --- | --- | --- | --- |
| Size limit | 50 MB zipped for a direct upload (larger through Amazon S3); 250 MB unzipped, layers included | 10 GB uncompressed image | Counts in the 250 MB unzipped limit |
| Where it lives | Uploaded to Lambda or read from an S3 bucket | An Amazon ECR repository | A versioned layer (immutable `LayerVersion`) |
| Runtime | A managed runtime or a custom runtime | An AWS base image, or any image with the runtime interface client | Extracted under `/opt` for .zip functions |
| Choose it when | Small code, fastest iteration, managed runtime patching | Large dependencies (ML libraries), existing container tooling and scanning | Several .zip functions share libraries, a custom runtime or an extension |

A function can use up to **5 layers**; they keep the package small so code-only changes deploy faster. A layer must match the function's runtime and architecture (x86_64 or arm64).

```bash
aws lambda publish-layer-version --layer-name shared-libs \
  --zip-file fileb://layer.zip --compatible-runtimes python3.12 --compatible-architectures arm64
aws lambda update-function-configuration --function-name orders \
  --layers arn:aws:lambda:eu-west-1:111122223333:layer:shared-libs:4
aws lambda update-function-code --function-name thumbnails \
  --image-uri 111122223333.dkr.ecr.eu-west-1.amazonaws.com/thumbnails:1.4.0
```

> **Exam trap.** Container-image functions don't support layers: put every dependency in the image. "The package exceeds 250 MB unzipped" is solved by a container image, not by more layers (layers count in the same limit). "Upload fails at 50 MB" is solved by uploading the .zip to S3 first.

<!-- section: containers | objectives: 3.3.2 -->
## Deploying containers with Amazon ECS, Amazon EKS and AWS Fargate

An **ECS task definition** is a versioned JSON document (`family:revision`, each registration creates a new immutable revision) describing containers: image, CPU, memory, ports, environment variables, secrets, log configuration and health check. Deploying new code means registering a new revision and updating the service to use it.

```json
{
  "family": "orders-api",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::111122223333:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::111122223333:role/orders-api-task",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:1.4.0",
      "portMappings": [{ "containerPort": 8080 }],
      "secrets": [{ "name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:eu-west-1:111122223333:secret:orders-db" }],
      "logConfiguration": { "logDriver": "awslogs", "options": { "awslogs-group": "/ecs/orders-api", "awslogs-region": "eu-west-1", "awslogs-stream-prefix": "api" } }
    }
  ]
}
```

- **Task execution role**: used by the ECS agent to pull the image from ECR, fetch secrets and write logs. **Task role**: used by the application code to call AWS APIs.
- **Fargate** needs the `awsvpc` network mode and task-level `cpu` and `memory`.

ECS deployment types are **rolling update**, **blue/green** and **external**; the ECS deployment controller also offers built-in **linear** and **canary** strategies, and services can still use the CodeDeploy controller for blue/green. A rolling update is bounded by two values of the service:

| Setting | Meaning | Example (desired count 4) |
| --- | --- | --- |
| `minimumHealthyPercent` | Lower limit of running, healthy tasks during the deployment (rounded up) | 50: two old tasks can stop before new ones start |
| `maximumPercent` | Upper limit of running tasks (rounded down) | 200: four new tasks can start before old ones stop |

The **deployment circuit breaker** (tasks never reach a steady state) and **CloudWatch alarms** (metrics breach) stop a deployment and can roll back to the last successful revision. ECS blue/green runs the green revision beside the blue one, runs Lambda or pause **lifecycle hooks**, and keeps blue during a **bake time** for an instant rollback.

On **Amazon EKS**, a Kubernetes `Deployment` manifest declares the image and the rolling update; `kubectl apply -f` deploys it, `kubectl rollout status` follows it and `kubectl rollout undo` returns to the previous ReplicaSet.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
        - name: api
          image: 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:1.4.0
          ports:
            - containerPort: 8080
```

> **Exam trap.** `AccessDenied` when the task starts pulling the image or reading a secret is the **execution** role; `AccessDenied` from the application calling DynamoDB is the **task** role. A rolling update with `minimumHealthyPercent` 100 and `maximumPercent` 100 can't start or stop any task and gets stuck.

<!-- section: iac-templates | objectives: 3.3.3 -->
## Infrastructure as code with CloudFormation, AWS SAM and AWS CDK

A CloudFormation template has one required section, `Resources`, and optional `Parameters`, `Mappings`, `Conditions`, `Outputs` and `Transform`. Intrinsic functions connect resources: `!Ref` (name or ID), `!GetAtt` (an attribute such as an ARN), `!Sub` (string substitution), `!ImportValue` (an output exported by another stack). Facts to know:

- **Change sets** preview an update; **nested stacks** reuse templates inside one parent stack; **cross-stack references** (`Export` then `!ImportValue`) share values between independent stacks, and an exported value can't be deleted while imported.
- `DeletionPolicy: Retain` or `Snapshot` keeps data when a resource or the stack is deleted.
- `aws cloudformation package` uploads local code to S3 and rewrites the paths; `aws cloudformation deploy` creates and executes a change set.

AWS SAM is a CloudFormation extension declared by `Transform: AWS::Serverless-2016-10-31`. Short resource types (`AWS::Serverless::Function`, `Api`, `HttpApi`, `SimpleTable`, `LayerVersion`, `StateMachine`) expand into full CloudFormation, `Globals` sets shared properties, and policy templates (`DynamoDBCrudPolicy`, `SQSPollerPolicy`) give least-privilege permissions.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: python3.12
    Timeout: 30
Resources:
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: src/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
      Events:
        CreateOrder:
          Type: Api
          Properties:
            Path: /orders
            Method: post
  OrdersTable:
    Type: AWS::Serverless::SimpleTable
Outputs:
  OrdersTableName:
    Value: !Ref OrdersTable
    Export:
      Name: orders-table-name
```

`sam build` then `sam deploy --guided` (saves the answers in `samconfig.toml`) deploys through CloudFormation. With the **AWS CDK**, `cdk bootstrap` prepares each account and Region once (the `CDKToolkit` stack with an S3 bucket and ECR repository for assets), `cdk synth` produces the template, `cdk diff` compares it with the deployed stack and `cdk deploy` deploys it.

> **Exam tip.** "Deploy the same template to several environments" means parameters (or SAM `samconfig.toml` environments) and one stack per environment, not copied templates. "`cdk deploy` fails because assets have nowhere to go in a new account" means run `cdk bootstrap`.

<!-- section: codedeploy | objectives: 3.3.4 -->
## Deploying revisions with AWS CodeDeploy

CodeDeploy deploys an application **revision** to a **deployment group** on one of three compute platforms. The `appspec.yml` (or JSON) file describes the revision:

| Platform | What the appspec contains | Lifecycle hooks you implement |
| --- | --- | --- |
| EC2/On-premises | `files` (source to destination), `permissions`, `hooks` that run scripts | `ApplicationStop`, `BeforeInstall`, `AfterInstall`, `ApplicationStart`, `ValidateService` (plus traffic hooks behind a load balancer) |
| AWS Lambda | The function, alias, `CurrentVersion` and `TargetVersion` | `BeforeAllowTraffic`, `AfterAllowTraffic` (Lambda validation functions) |
| Amazon ECS | Task definition ARN, container name and port | `BeforeInstall`, `AfterInstall`, `AfterAllowTestTraffic`, `BeforeAllowTraffic`, `AfterAllowTraffic` (Lambda functions) |

The EC2/On-premises order is `ApplicationStop` → `DownloadBundle` → `BeforeInstall` → `Install` → `AfterInstall` → `ApplicationStart` → `ValidateService`; `DownloadBundle` and `Install` are reserved for the CodeDeploy agent.

```yaml
version: 0.0
os: linux
files:
  - source: /build
    destination: /var/www/orders
hooks:
  ApplicationStop:
    - location: scripts/stop.sh
      timeout: 60
  AfterInstall:
    - location: scripts/install_dependencies.sh
      timeout: 300
      runas: root
  ApplicationStart:
    - location: scripts/start.sh
  ValidateService:
    - location: scripts/health_check.sh
      timeout: 120
```

- EC2 and on-premises targets need the **CodeDeploy agent** running, and an instance profile (or IAM credentials on premises) that can read the revision from S3.
- A deployment group selects targets by tags or Auto Scaling groups.
- A hook script times out after 3,600 seconds by default; a Lambda validation hook must report success or failure to CodeDeploy (`PutLifecycleEventHookExecutionStatus`) within one hour.
- Predefined configurations: `CodeDeployDefault.OneAtATime` (default), `HalfAtATime`, `AllAtOnce` for EC2; `LambdaCanary10Percent5Minutes`, `LambdaLinear10PercentEvery1Minute`, `LambdaAllAtOnce` and variants for Lambda; `ECSCanary10Percent5Minutes`, `ECSLinear10PercentEvery1Minutes`, `ECSAllAtOnce` and variants for ECS.

<!-- section: codepipeline | objectives: 3.3.5 -->
## Orchestrating pipelines with AWS CodePipeline

A pipeline is a series of **stages** (Source, Build, Test, Deploy) made of **actions**; actions pass **artifacts** through an S3 artifact store. Source providers include AWS CodeCommit, connections (AWS CodeConnections) to GitHub, GitLab and Bitbucket, Amazon S3 and Amazon ECR. Build and test actions usually run AWS CodeBuild with a `buildspec.yml`.

V2 pipelines add features that V1 lacks:

| V2 feature | Use |
| --- | --- |
| Triggers with filters | Start only on a push to given branches, on Git tags, on changed file paths, or on pull request events (opened, updated, closed) |
| Pipeline-level variables | Pass values (target environment, version) when the execution starts |
| Execution modes QUEUED and PARALLEL | QUEUED: executions wait in order; PARALLEL: independent executions (feature branches). SUPERSEDED, the default, lets a newer execution overtake a waiting one |
| Stage conditions and rollback | Entry and failure conditions on stages; roll a stage back to the last successful execution (not in PARALLEL mode) |

```json
{
  "triggers": [
    {
      "providerType": "CodeStarSourceConnection",
      "gitConfiguration": {
        "sourceActionName": "Source",
        "push": [{ "tags": { "includes": ["v*"] } }]
      }
    }
  ]
}
```

**Progression through environments**: a typical release runs Build, deploys to test, runs automated tests, waits on a **manual approval** action (approvers are notified through Amazon SNS and approve in the console or with the `PutApprovalResult` API; an approval that gets no answer within 7 days fails), then deploys to production. Deploy actions can run in other Regions (cross-Region actions) and in other accounts by assuming a role there.

> **Exam trap.** "Start the production pipeline only when a release tag is pushed, not on every commit" means a V2 pipeline with a Git tag trigger filter. A manual approval action pauses the pipeline; it doesn't deploy anything itself.

<!-- section: source-control | objectives: 3.3.8 -->
## Source control branches and tags for versions and releases

| Git feature | Use in releases |
| --- | --- |
| Branches | `main` for production-ready code, feature branches for work in progress, release branches to stabilize a version |
| Pull requests | Review and approval before merging; CodeCommit approval rule templates require a number of approvers |
| Tags (labels) | Mark the exact commit of a release (`v1.4.0`); annotated tags carry a message and an author |
| Commit SHA | Immutable identifier reused as image tag, Lambda version description or artifact name, to trace what runs where |

```bash
git switch -c release/1.4
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
```

AWS CodeCommit, closed to new customers in 2024, **reopened to new customers on November 25, 2025**, so it is again a valid answer alongside GitHub, GitLab or Bitbucket through connections.

<!-- section: deployment-strategies | objectives: 3.3.6 -->
## Deployment strategies: all at once, rolling, blue/green, canary, linear

| Strategy | How it works | Downtime and capacity | Rollback |
| --- | --- | --- | --- |
| All at once (in place) | Every target updated simultaneously | Short outage | Redeploy the old version |
| Rolling | Batches updated one after another | Capacity reduced by one batch | Redeploy; mixed versions meanwhile |
| Rolling with additional batch | Launches an extra batch first, then rolls | Full capacity kept | Redeploy |
| Immutable | New instances in a new group, swapped in when healthy | Full capacity, double cost during deployment | Terminate the new instances |
| Blue/green | A full new environment; traffic switched when validated | None | Switch traffic back |
| Canary | A small share (for example 10 %) first, the rest after a wait | None | Shift traffic back to the old version |
| Linear | Equal increments at a fixed interval | None | Shift traffic back |

Where each one is configured:

- **Elastic Beanstalk** deployment policies: All at once, Rolling, Rolling with additional batch, Immutable, Traffic splitting (canary-style testing on new instances). Blue/green: clone the environment, deploy to it, then **swap environment URLs**.
- **CodeDeploy**: in-place or blue/green for EC2; canary, linear or all-at-once traffic shifting for Lambda and ECS.
- **Lambda with SAM**: `AutoPublishAlias` plus `DeploymentPreference` (see the next section).
- **API Gateway**: a **canary release** on a REST API stage sends a percentage of requests (`percentTraffic`) to a new deployment, with its own logs and metrics, until you promote it.

> **Exam tip.** "Zero downtime, full capacity, and the fastest rollback if the new version fails" points to blue/green (or Elastic Beanstalk immutable / traffic splitting). "Reduced capacity is acceptable and the cheapest option is required" points to rolling. "Expose the new version to 10 percent of users first" points to canary.

<!-- section: rollback | objectives: 3.3.7 -->
## Automatic and manual rollback

**CloudFormation** rolls a stack back automatically when a create or update fails. Options:

| Need | Setting |
| --- | --- |
| Keep failed resources to debug a failed creation | `--disable-rollback` (or `--on-failure DO_NOTHING`) |
| Roll back when an alarm fires during or just after the update | Rollback triggers: up to 5 CloudWatch alarms, monitoring time 0 to 180 minutes |
| The rollback itself fails (`UPDATE_ROLLBACK_FAILED`) | Fix the cause, then `continue-update-rollback`, optionally with `--resources-to-skip` |
| A first creation failed (`ROLLBACK_COMPLETE`) | Delete the stack and create it again; it can't be updated |

**CodeDeploy** rolls back automatically when a deployment fails or when a CloudWatch alarm of the deployment group goes to `ALARM`. A rollback is a **new deployment** of the last known good revision, with a new deployment ID. Manual rollback: stop the deployment or redeploy the previous revision.

**Lambda with SAM**: CodeDeploy watches the listed alarms during traffic shifting and returns the alias to the old version if one fires; the `PreTraffic` and `PostTraffic` hooks are validation functions that can fail the deployment.

```yaml
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: src/
      AutoPublishAlias: live
      DeploymentPreference:
        Type: Canary10Percent5Minutes
        Alarms:
          - !Ref OrdersErrorsAlarm
        Hooks:
          PreTraffic: !Ref PreTrafficCheckFunction
          PostTraffic: !Ref PostTrafficCheckFunction
```

**ECS**: circuit breaker or deployment alarms with `rollback: true`. **CodePipeline V2**: stage rollback, manual or as a failure condition. **Elastic Beanstalk** rolling: redeploy a known good version.

> **Exam trap.** The first SAM gradual deployment can't shift traffic: CodeDeploy needs an existing version. Deploy once with `AutoPublishAlias`, then add `DeploymentPreference`.

<!-- section: ai-cicd | objectives: 3.3.9 -->
## Using AWS AI tools to support CI/CD workflows

| CI/CD task | AWS AI tool and how it is used |
| --- | --- |
| Environment provisioning | Kiro generates CDK, SAM or CloudFormation code from a spec; the pipeline still validates it (cfn-lint, `cdk diff`, change set) before deployment |
| Automated review and approval support | Kiro CLI headless (`kiro-cli chat --no-interactive`) in a CodeBuild step reviews the change or summarizes the change set and test reports for approvers; a Lambda function can call a model in Amazon Bedrock to do the same |
| Post-deployment validation | A CodeDeploy `AfterAllowTraffic` / SAM `PostTraffic` hook, an ECS lifecycle hook or a CloudWatch Synthetics canary checks the release; AI summarizes the results |
| Linking incidents to releases | AWS DevOps Agent (generally available since March 31, 2026) correlates telemetry, code and deployment data to find the change that caused an incident |

Rules the exam applies:

- Keep a **deterministic gate** (tests, alarms, a manual approval for production); the AI informs the decision.
- An automated approval calls `PutApprovalResult` only from a role scoped to that pipeline action; production changes that are sensitive keep a human in the loop.
- AI tools get least-privilege roles; their keys come from AWS Secrets Manager, never from the buildspec.

```bash
aws codepipeline put-approval-result --pipeline-name orders-release \
  --stage-name ApproveProd --action-name ReviewChange \
  --result summary="Tests passed and change set adds 1 alarm",status=Approved \
  --token 3f6a1c2e-0000-4b2d-9e8f-EXAMPLE
```

> **Exam trap.** "Let the AI agent deploy straight to production with administrator credentials to save time" is never the answer: scope the agent's permissions and keep the approval and alarm-based rollback in place.

<!-- section: key-points -->
## Key points

- Lambda: .zip 50 MB direct (S3 beyond) and 250 MB unzipped with layers; container image 10 GB, no layers; up to 5 layers per function.
- ECS: task definition revisions; execution role vs task role; Fargate needs `awsvpc`; rolling update bounded by `minimumHealthyPercent` and `maximumPercent`; circuit breaker and alarms roll back; native blue/green, linear and canary.
- CloudFormation `Resources` required, change sets, exports; SAM transform, `sam build` and `sam deploy --guided`; CDK `bootstrap`, `synth`, `diff`, `deploy`.
- CodeDeploy appspec hooks per platform; agent on EC2; predefined canary, linear and all-at-once configurations; rollback is a new deployment.
- CodePipeline V2: trigger filters on tags, branches, paths and pull requests; QUEUED and PARALLEL modes; stage rollback; manual approval through SNS and `PutApprovalResult`.
- AI tools (Kiro, Bedrock, AWS DevOps Agent) assist provisioning, review and validation; deterministic gates and least privilege stay.
