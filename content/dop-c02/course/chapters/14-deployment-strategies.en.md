Deployment questions at the professional level describe a fleet that must stay online, a release that must reach 10 percent of users first, an agent that stopped reporting or a deployment stuck in a hook, and ask which platform feature, deployment configuration, permission or fix meets the requirement with the least downtime and operational overhead. This chapter covers deployment methods per compute platform, mutable and immutable patterns, storage choices that make immutable deployments possible, the code distribution services, access to artifact repositories, deployment agents and troubleshooting.

<!-- section: platform-methods | objectives: 1.4.1 -->
## Deployment methods per compute platform

| Platform | Native mechanisms | Strategies available |
| --- | --- | --- |
| Amazon EC2 (standalone or Auto Scaling group) | CodeDeploy (EC2/On-premises platform), Auto Scaling **instance refresh**, Elastic Beanstalk | In-place (one at a time, half at a time, all at once, custom minimum healthy hosts), blue/green (new instances or a copied Auto Scaling group), rolling replacement of instances |
| AWS Elastic Beanstalk | Environment deployment policy | All at once, Rolling, Rolling with additional batch, Immutable, Traffic splitting; blue/green by cloning the environment and **swapping environment URLs** |
| Amazon ECS | Service `deploymentConfiguration` (ECS controller), `CODE_DEPLOY` controller, `EXTERNAL` controller | Rolling update, native blue/green, linear and canary (ECS controller, since 2025); blue/green with canary, linear or all-at-once shifting through CodeDeploy |
| Amazon EKS | Kubernetes `Deployment` objects applied by the pipeline (`kubectl`, Helm or a GitOps controller) | Rolling update (`maxSurge`, `maxUnavailable`, readiness probes); blue/green or canary with two Deployments and weighted routing at the load balancer or ingress |
| AWS Lambda | Versions (immutable) and aliases (pointers with optional weighted routing), CodeDeploy (Lambda platform), AWS SAM `DeploymentPreference` | All at once, canary, linear traffic shifting between two versions of an alias |

For EC2 fleets in an Auto Scaling group, **instance refresh** replaces instances to apply a new launch template version (a new AMI): it respects `MinHealthyPercentage` (default 90) and `MaxHealthyPercentage`, can pause at **checkpoints**, can skip instances that already match, and can roll back automatically, including when a listed CloudWatch alarm goes to `ALARM`.

```bash
aws autoscaling start-instance-refresh --auto-scaling-group-name web-prod \
  --desired-configuration '{"LaunchTemplate":{"LaunchTemplateName":"web","Version":"$Latest"}}' \
  --preferences '{"MinHealthyPercentage":90,"MaxHealthyPercentage":120,"SkipMatching":true,"AutoRollback":true,"AlarmSpecification":{"Alarms":["web-5xx-high"]}}'
```

> **Exam trap.** AWS App Runner is in maintenance and AWS recommends Amazon ECS Express Mode instead; AWS Copilot CLI and AWS App2Container are at end of support or closed to new customers; AWS CodeStar and AWS Proton are shut down. None of them is the answer for a new deployment design.

<!-- section: mutable-immutable | objectives: 1.4.3 -->
## Mutable and immutable deployment patterns

| | Mutable (in place) | Immutable |
| --- | --- | --- |
| What changes | Existing servers receive the new code or configuration | New servers, tasks or versions are created; old ones are discarded |
| AWS examples | CodeDeploy in-place, Elastic Beanstalk All at once and Rolling, Systems Manager Run Command or State Manager updating packages | AMI baked by EC2 Image Builder plus instance refresh, CodeDeploy blue/green, Elastic Beanstalk Immutable, a new ECS task definition revision, a new Lambda version |
| Speed and cost | Fast, no extra capacity (except an additional batch) | Extra capacity during the deployment, longer for AMI-based releases |
| Risk | Configuration drift between servers, partial failures leave mixed versions | Every server is identical to a tested image; failed launches never take traffic |
| Rollback | Redeploy the previous revision on the same servers | Switch back to the old servers, task set or version, or terminate the new ones |

Two ways to configure an instance at launch:

| Approach | Boot time | Consistency | Use it when |
| --- | --- | --- | --- |
| **Golden AMI** (baked by Image Builder) | Short: software is already installed | High: the image is tested once | Scale-out must be fast, warm pools, regulated baselines |
| **Bootstrap** (user data, `cfn-init`, State Manager, CodeDeploy on scale-out) | Longer: install at every launch | Depends on external repositories at launch time | Configuration changes often, many variants of one base image |

Most designs mix both: a hardened base AMI from a pipeline plus the application revision deployed by CodeDeploy.

> **Exam tip.** "Every instance must run exactly the tested build, and a scale-out must not depend on package repositories being reachable" points to an immutable, baked AMI. "Patch the running fleet without replacing instances" is mutable: Patch Manager or Run Command.

<!-- section: storage-patterns | objectives: 1.4.2 -->
## Application storage patterns

Immutable and blue/green deployments work only when servers keep **no unique state**: sessions, uploads and data live outside the compute layer.

| Storage | Scope and sharing | Deployment consequence |
| --- | --- | --- |
| Amazon EBS | One Availability Zone; attached to one instance (Multi-Attach only for io1/io2, Nitro instances in the same AZ) | Lost or detached when an instance is replaced unless snapshotted; do not keep user data on the root volume of a replaceable instance |
| Amazon EFS | Regional, shared NFS mounted concurrently by EC2 instances in several AZs, ECS tasks (EC2 and Fargate), EKS pods (EFS CSI driver) and Lambda functions in a VPC | Shared content survives every deployment; blue and green see the same files |
| Amazon S3 | Regional object storage reached through the API | Static assets, uploads, deployment bundles, CodePipeline artifacts; versioning keeps every revision |
| Lambda `/tmp` | 512 MB by default, configurable up to 10,240 MB, per execution environment | Temporary only; use S3 or EFS for anything shared or persistent |
| ECS on Fargate ephemeral storage | 20 GiB by default, up to 200 GiB per task | Lost when the task stops; attach EFS or an EBS volume configured at deployment for more |

For containers on EKS, the EBS CSI driver gives `ReadWriteOnce` volumes bound to one AZ, while the EFS CSI driver gives `ReadWriteMany` volumes shared across AZs. For ECS, an EBS volume can be attached to each task when the service is deployed: the task definition marks the volume `configuredAtLaunch` and the service deployment supplies size, type and encryption.

> **Exam trap.** "Users are logged out during each deployment" or "uploaded files disappear after instance refresh" means state is stored on the instances: move sessions to ElastiCache or DynamoDB and files to S3 or EFS. Sticky sessions don't fix a blue/green switch.

<!-- section: distribution-tools | objectives: 1.4.4 -->
## Services that distribute code

| Service | What it distributes | Targets |
| --- | --- | --- |
| AWS CodeDeploy | Application revisions (bundle in S3 or GitHub plus `appspec.yml`), ECS task definitions, Lambda versions | EC2 instances, on-premises servers, ECS services, Lambda aliases |
| EC2 Image Builder | AMIs and container images built from recipes and components, tested, then distributed | Other Regions, other accounts, organizations or OUs (launch permissions), launch templates updated with the new AMI, Amazon ECR for container images |
| Amazon ECR | Container images, with replication rules (cross-Region, cross-account) and pull through cache | ECS, EKS, Lambda container functions |
| AWS CodeArtifact | Software packages (npm, PyPI, Maven, NuGet, generic and others) | Build environments and developers |
| Systems Manager Distributor and Run Command | Software packages and commands | Managed nodes (EC2 and on premises) |

An Image Builder pipeline runs on a schedule or when a dependency changes, applies build components, launches a test instance with test components, then the **distribution configuration** copies the AMI to each Region and account and can set a launch template version. Cross-account distribution needs a role in each target account that Image Builder can assume.

> **Exam tip.** "Produce a patched, tested AMI every week and make it available in three Regions and the production accounts, with no manual step" is an EC2 Image Builder pipeline with a schedule and a distribution configuration, followed by an Auto Scaling instance refresh.

<!-- section: traffic-shifting | objectives: 1.4.8 -->
## Blue/green, canary and linear deployments in practice

| Requirement | Method |
| --- | --- |
| Zero downtime, full capacity, instant rollback | Blue/green |
| Expose a small share of production traffic first, then everything | Canary |
| Increase traffic in equal steps with a wait between steps | Linear |
| Reduced capacity acceptable, cheapest | Rolling or in-place |
| Validate the new version with test traffic before any production user | Blue/green with a test listener (ECS) or a pre-traffic hook |

**ECS native strategies** run under the default `ECS` deployment controller. Blue/green, linear and canary need a traffic-shifting resource (Application Load Balancer, Network Load Balancer, Service Connect or VPC Lattice); the load balancer configuration names an **alternate target group**, a **production listener rule** and an optional **test listener rule**. Lifecycle hooks (a Lambda function or a pause that waits for `ContinueServiceDeployment`) run at stages such as `POST_SCALE_UP`, `POST_TEST_TRAFFIC_SHIFT` and `POST_PRODUCTION_TRAFFIC_SHIFT`; the blue revision keeps running for the **bake time**, which makes rollback immediate.

```json
{
  "deploymentConfiguration": {
    "strategy": "CANARY",
    "canaryConfiguration": { "canaryPercent": 10.0, "canaryBakeTimeInMinutes": 15 },
    "bakeTimeInMinutes": 30,
    "alarms": { "alarmNames": ["orders-5xx-high"], "enable": true, "rollback": true },
    "lifecycleHooks": [
      {
        "hookTargetArn": "arn:aws:lambda:eu-west-1:111122223333:function:orders-smoke-test",
        "roleArn": "arn:aws:iam::111122223333:role/ecs-hooks",
        "lifecycleStages": ["POST_TEST_TRAFFIC_SHIFT"]
      }
    ]
  }
}
```

Canary percent ranges from 0.1 to 100 (default 5) and canary bake time from 0 to 1,440 minutes (default 10); a linear step is 3 to 100 percent with a step bake time of 0 to 1,440 minutes. The deployment **circuit breaker** applies to rolling updates only.

**CodeDeploy** predefined configurations:

| Platform | Configurations |
| --- | --- |
| EC2/On-premises | `CodeDeployDefault.OneAtATime` (default), `HalfAtATime`, `AllAtOnce`; custom minimum healthy hosts as a count or a percentage |
| Lambda | `LambdaCanary10Percent5Minutes` (also 10, 15, 30 minutes), `LambdaLinear10PercentEvery1Minute` (also 2, 3, 10 minutes), `LambdaAllAtOnce` |
| ECS | `ECSCanary10Percent5Minutes`, `ECSCanary10Percent15Minutes`, `ECSLinear10PercentEvery1Minutes`, `ECSLinear10PercentEvery3Minutes`, `ECSAllAtOnce` |

For **Lambda**, an alias can also split traffic by itself (`--routing-config AdditionalVersionWeights`), but only CodeDeploy (or SAM `DeploymentPreference`) shifts it automatically, runs `BeforeAllowTraffic` and `AfterAllowTraffic` hooks and rolls back on alarms. **API Gateway** canary release settings on a REST API stage send a percentage of requests to a new deployment.

> **Exam trap.** A canary that "rolls back automatically when the error rate rises" needs the CloudWatch alarm attached to the deployment (CodeDeploy deployment group, ECS `alarms` with `rollback`, SAM `Alarms`). An alarm that only notifies an SNS topic rolls nothing back.

<!-- section: artifact-permissions | objectives: 1.4.5 -->
## Permissions for artifact repositories

| Repository | Identity side | Resource side |
| --- | --- | --- |
| S3 bucket (CodeDeploy revisions, pipeline artifacts) | Instance profile or role with `s3:GetObject` (and `s3:GetObjectVersion` for versioned revisions); `kms:Decrypt` if SSE-KMS | Bucket policy for another account; KMS key policy allowing the other account for a customer managed key |
| Amazon ECR | `ecr:GetAuthorizationToken` (resource `*`) plus `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchCheckLayerAvailability` | Repository policy granting the other account or role these pull actions |
| AWS CodeArtifact | `codeartifact:GetAuthorizationToken`, `sts:GetServiceBearerToken`, `codeartifact:GetRepositoryEndpoint`, `codeartifact:ReadFromRepository`; publishing adds `codeartifact:PublishPackageVersion` | Domain policy (cross-account access to the domain) and repository policy |

ECS pulls images with the **task execution role**; EKS nodes with the node IAM role (the kubelet pulls, not the pod); EC2 instances with their instance profile; CodeBuild with its service role.

CodeArtifact authorization tokens last 12 hours by default, configurable from 900 to 43,200 seconds; `--duration-seconds 0` ties the token to the remaining session of the assumed role. Both `sts:GetServiceBearerToken` and `codeartifact:GetAuthorizationToken` are required, and the root user can't get a token.

```bash
aws codeartifact login --tool npm --domain example-corp \
  --domain-owner 111122223333 --repository shared-libs --duration-seconds 0
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowProdAccountPull",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::444455556666:root" },
      "Action": ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    }
  ]
}
```

> **Exam trap.** A repository policy alone isn't enough for cross-account ECR pulls: the pulling role also needs `ecr:GetAuthorizationToken` in its own identity policy. For a KMS-encrypted artifact bucket, the bucket policy without the key policy still returns `AccessDenied`.

<!-- section: deployment-agents | objectives: 1.4.6 -->
## Configuring deployment agents

| Agent | Needed for | Credentials and connectivity |
| --- | --- | --- |
| CodeDeploy agent | EC2/On-premises deployments only (not Lambda, not ECS) | Instance profile (EC2) or a registered IAM user or role (on premises); outbound HTTPS to CodeDeploy and S3, or VPC endpoints |
| SSM Agent | Run Command, State Manager, Patch Manager, Session Manager, Distributor | Instance profile with `AmazonSSMManagedInstanceCore` or Default Host Management Configuration; hybrid activation on premises |
| ECS container agent | ECS on EC2 container instances (managed for you on Fargate) | Container instance role; `ECS_CLUSTER` in `/etc/ecs/ecs.config` |

Install the CodeDeploy agent at scale with **Systems Manager Distributor** (package `AWSCodeDeployAgentV2` for agent 2.x, which needs SSM Agent 2.3.274.0 or later), and keep it current with a State Manager association on a schedule. On Linux the configuration file is `/etc/codedeploy-agent/conf/codedeployagent.yml` and logs go to `/var/log/aws/codedeploy-agent`; the agent keeps the five most recent revisions besides the current one (`:max_revisions:`), and polls for work every 30 seconds by default.

```bash
aws ssm create-association --association-name codedeploy-agent \
  --name AWS-ConfigureAWSPackage \
  --targets "Key=tag:App,Values=orders" \
  --parameters '{"action":["Install"],"name":["AWSCodeDeployAgentV2"]}' \
  --schedule-expression "rate(14 days)"
sudo systemctl status codedeploy-agent
```

> **Exam tip.** Baking the agent into the AMI is fine, but an instance launched before the instance profile was attached may cache missing credentials: restart the agent after fixing the profile.

<!-- section: troubleshooting | objectives: 1.4.7 -->
## Troubleshooting deployments

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| CodeDeploy EC2 deployment stays pending, then fails on every instance | Agent not installed or not running, no instance profile, no route to the endpoints | Install or restart the agent, attach the profile, add a NAT gateway or VPC endpoints |
| Fails at `DownloadBundle` | Instance profile can't read the S3 revision or decrypt it | Grant `s3:GetObject` and `kms:Decrypt` |
| Fails at `ApplicationStop` | The **previous** revision's stop script is broken (it runs from the old revision) | Redeploy with `--ignore-application-stop-failures` (or the console option), then fix the script |
| `Install` fails because files already exist | Files not created by CodeDeploy at the destination | `--file-exists-behavior OVERWRITE` or `RETAIN` (default `DISALLOW`) |
| `HEALTH_CONSTRAINTS` error | Too many instances failed for the minimum healthy hosts setting | Read per-instance lifecycle event logs; fix the failing hook |
| New Auto Scaling instances lack the application | Deployment group not linked to the Auto Scaling group | Add the group to the deployment group (CodeDeploy then deploys the last successful revision on launch) |
| ECS tasks stop with `CannotPullContainerError` | Execution role permissions, image tag missing, no route to ECR from private subnets | Fix the role, the tag, or add ECR and S3 VPC endpoints |
| ECS rolling deployment never completes | Health checks failing, grace period too short, not enough capacity with `maximumPercent` 100 | Circuit breaker with rollback, longer `healthCheckGracePeriodSeconds`, capacity |
| Lambda deployment rolled back immediately | A `BeforeAllowTraffic` hook failed or never called `PutLifecycleEventHookExecutionStatus` | Fix the hook and its permission to report status |

CodeDeploy writes per-deployment logs on the instance and exposes lifecycle event status per instance in the console and API (`aws deploy get-deployment-instance` for EC2, `list-deployment-targets` and `get-deployment-target` for any platform). Sending agent logs to CloudWatch Logs with the CloudWatch agent makes fleet-wide troubleshooting possible.

> **Exam trap.** Fixing an `ApplicationStop` failure by editing the script in the new revision doesn't work: CodeDeploy runs `ApplicationStop` from the last successfully deployed revision. Ignore the failure for one deployment, then the fixed script becomes the one in place.

<!-- section: key-points -->
## Key points

- EC2: CodeDeploy in-place or blue/green, instance refresh with checkpoints and alarm rollback; Beanstalk: Rolling with additional batch, Immutable, Traffic splitting, URL swap for blue/green.
- ECS controller: rolling (circuit breaker), native blue/green, linear and canary with alternate target group, listener rules, hooks and bake time; CodeDeploy controller remains for CodeDeploy-based blue/green.
- Lambda: versions and aliases; CodeDeploy or SAM for automatic shifting, hooks and alarm rollback.
- Immutable deployments need stateless compute: sessions in ElastiCache or DynamoDB, files in S3 or EFS.
- Image Builder bakes, tests and distributes AMIs across Regions and accounts; CodeArtifact and ECR hold packages and images.
- Cross-account pulls need both identity and resource policies (and KMS key policies).
- CodeDeploy agent only for EC2/on premises; install and update with Distributor and State Manager.
- Shut down or closed services (CodeStar, Proton, App Runner for new designs, Copilot, App2Container) are never the answer.
