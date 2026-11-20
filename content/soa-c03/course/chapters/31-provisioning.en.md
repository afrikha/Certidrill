Provisioning is where most operational incidents start: an AMI that can't be shared, a stack stuck in `UPDATE_ROLLBACK_FAILED`, a subnet out of addresses, a StackSet that skips half the accounts. SOA-C03 questions give the error or the requirement and ask for the image pipeline, template attribute, sharing mechanism or deployment strategy that fixes it with the least effort.

<!-- section: images | objectives: 3.1.1 -->
## Building and managing AMIs and container images

**AMIs** are Regional. Key operations:

| Task | How |
| --- | --- |
| Create from an instance | `create-image` reboots the instance by default for consistent snapshots; `--no-reboot` doesn't guarantee file system integrity |
| Use in another Region | `copy-image` to that Region (the copy can be encrypted with a key there) |
| Share with accounts, an organization or OUs | Add launch permissions; encrypted AMIs must use a **customer managed KMS key** shared with the target accounts (AMIs encrypted with the AWS managed key can't be shared); snapshots don't need separate sharing |
| Retire | **Deprecate** (hidden from listings but still launchable by ID, existing launch templates keep working), **disable**, then **deregister** and delete snapshots |
| Protect | **Deregistration protection**, optionally with a 24-hour cooldown after it is turned off; Recycle Bin rules for deleted AMIs |

**EC2 Image Builder** automates golden images:

| Resource | Role |
| --- | --- |
| Component | YAML document run by AWS Task Orchestrator and Executor (AWSTOE) to build (install, harden) or test |
| Image recipe / container recipe | Base image plus components; a container recipe adds a Dockerfile and the target ECR repository |
| Infrastructure configuration | Instance type, subnet, security group and instance profile of the build instances |
| Distribution settings | Target Regions, accounts, launch permissions (propagated to every Region), launch template updates |
| Image pipeline | Manual, cron or rate schedule; start condition `EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE` (default: build only when the base image or a component has a new version) or `EXPRESSION_MATCH_ONLY` (build at every match) |
| Lifecycle policy | Deprecates, disables or deletes old images and their snapshots or ECR images, daily, across Regions and accounts |

**Amazon ECR** keeps container images under control: **lifecycle policies** expire images by count (`imageCountMoreThan`) or age (`sinceImagePushed`), lower `rulePriority` wins, test with a preview, expiry happens within 24 hours; **tag immutability** rejects a push that reuses a tag (`ImageTagAlreadyExistsException`); **basic scanning** (OS packages, manual or on push) or **enhanced scanning** with Amazon Inspector (OS and language packages, on push or continuous); **replication** across Regions and accounts copies only images pushed after the rule exists, and cross-account replication needs a registry policy in the destination account.

> **Exam trap.** "Launch fails in the partner account with a KMS error although the AMI is shared" means the customer managed key used to encrypt the AMI's snapshots isn't shared with that account (or the AMI uses the AWS managed key and must be copied with a customer managed key first).

<!-- section: cloudformation-cdk | objectives: 3.1.2 -->
## Managing resources with CloudFormation and the AWS CDK

| Need | CloudFormation feature |
| --- | --- |
| Preview the impact of an update (add, modify, replace) | **Change set**, then execute it; executing removes the stack's other change sets |
| Find manual changes made outside the stack | **Drift detection**: `IN_SYNC`, `MODIFIED`, `DELETED`, `NOT_CHECKED`; only explicitly set properties are compared, nested stacks need their own detection |
| Prevent updates to a critical resource | **Stack policy** (once set, every update not explicitly allowed is denied; override for one update with a temporary policy) |
| Prevent stack deletion | Termination protection |
| Keep data when a resource is deleted or replaced | `DeletionPolicy` (`Delete` default, `Retain`, `RetainExceptOnCreate`, `Snapshot`; RDS defaults to `Snapshot`) and `UpdateReplacePolicy` |
| Wait until instances are configured | `CreationPolicy` with `cfn-signal` (count and timeout, default 5 minutes, maximum 12 hours) |
| Control how an Auto Scaling group is updated | `UpdatePolicy` (rolling update, replacing update, scheduled action handling) |

```yaml
WebAsg:
  Type: AWS::AutoScaling::AutoScalingGroup
  CreationPolicy:
    ResourceSignal:
      Count: 2
      Timeout: PT15M
  UpdatePolicy:
    AutoScalingRollingUpdate:
      MaxBatchSize: 1
      MinInstancesInService: 2
      WaitOnResourceSignals: true
      PauseTime: PT10M
  Properties:
    MinSize: '2'
    MaxSize: '6'
    VPCZoneIdentifier: [!Ref PrivateSubnetA, !Ref PrivateSubnetB]
    LaunchTemplate:
      LaunchTemplateId: !Ref WebLaunchTemplate
      Version: !GetAtt WebLaunchTemplate.LatestVersionNumber
```

The **AWS CDK** defines infrastructure in a programming language and deploys it through CloudFormation. Constructs come in three levels: **L1** (`Cfn*` classes, one-to-one with CloudFormation resources), **L2** (curated, with defaults and helper methods), **L3** (patterns combining several resources). Each account and Region pair must be **bootstrapped** once (stack `CDKToolkit` with an S3 bucket, an ECR repository and IAM roles).

```bash
cdk bootstrap aws://111122223333/eu-west-1
cdk synth          # writes the CloudFormation template to cdk.out
cdk diff           # compares with the deployed stack
cdk deploy WebStack
```

> **Exam tip.** "Know whether an update will replace the production database before running it" is a change set. "Find out who changed a security group created by a stack" starts with drift detection (what changed) and CloudTrail (who).

<!-- section: deployment-issues | objectives: 3.1.3 -->
## Identifying and fixing deployment issues

| Symptom | Cause and fix |
| --- | --- |
| Stack in `ROLLBACK_COMPLETE` | Creation failed and was rolled back; only deletion is possible: delete, fix the template, create again. To debug, create with `--disable-rollback` (preserve successfully provisioned resources) |
| Stack in `UPDATE_ROLLBACK_FAILED` | A resource can't return to its previous state (changed or deleted outside CloudFormation, missing permission): fix the cause and `continue-update-rollback`, skipping resources only as a last resort |
| `DELETE_FAILED` | Non-empty S3 bucket, security group still in use, termination protection: empty or detach, or delete again retaining that resource |
| `InsufficientCapabilitiesException` | Template creates IAM resources or uses macros: pass `CAPABILITY_IAM`, `CAPABILITY_NAMED_IAM` or `CAPABILITY_AUTO_EXPAND` |
| Access denied during creation | The caller or the stack's **service role** lacks permissions on the underlying service, or `iam:PassRole` for the role; check also SCPs, permissions boundaries and KMS key policies |
| Wait condition or `CreationPolicy` timeout | `cfn-signal` never ran: helper scripts missing, user data error (check `/var/log/cfn-init.log`), no internet or endpoint access from the subnet |
| Quota exceeded | Replacement creates the new resource before deleting the old one; raise the quota or free resources |

Always find the **first** `*_FAILED` event in the stack events: later failures are consequences.

**Subnet sizing** errors appear as "insufficient free addresses" when an Auto Scaling group, an EKS node group, Lambda functions in a VPC or a load balancer can't get IP addresses. Facts: IPv4 subnets range from /16 to /28; AWS reserves **five addresses** in every subnet (network address, VPC router, DNS, future use, broadcast), so a /28 offers 11 usable addresses and a /24 offers 251. A VPC CIDR block can't be resized: add a **secondary CIDR block** (non-overlapping, /16 to /28) and create new, larger subnets, then move workloads.

> **Exam trap.** Deleting and recreating a stack in `ROLLBACK_COMPLETE` without reading the events repeats the same failure. Disable rollback to keep the failed instance and read its logs.

<!-- section: multi-account-provisioning | objectives: 3.1.4 -->
## Provisioning and sharing across accounts and Regions

**CloudFormation StackSets** deploy one template as stack instances in many accounts and Regions from an administrator account.

| Permission model | Setup | Typical use |
| --- | --- | --- |
| Self-managed | Create `AWSCloudFormationStackSetAdministrationRole` in the administrator account and `AWSCloudFormationStackSetExecutionRole` (exact name, trusting the administrator) in each target account | Accounts outside an organization |
| Service-managed | Trusted access with AWS Organizations; StackSets creates the roles; run from the management account or a delegated administrator | Deploy to OUs, with **automatic deployment** to accounts added later |

Operation options: **maximum concurrent accounts**, **failure tolerance** (per Region, the operation stops beyond it), **Region concurrency** (sequential in the order you give, the default, or parallel), and **retain stacks** when removing instances. An update applies to all stack instances of the StackSet.

**AWS Resource Access Manager (AWS RAM)** shares existing resources instead of duplicating them: subnets (VPC sharing), transit gateways, Route 53 Resolver rules, prefix lists, IPAM pools, Aurora clusters for cross-account cloning and others. Share with accounts, OUs, the whole organization or, for some types, IAM roles and users. With **sharing with AWS Organizations enabled**, accounts in the organization don't need to accept an invitation; outside accounts must accept. The owner keeps ownership; the share's managed permission is the maximum the consumer's IAM policies can grant. In a shared VPC, participants (same organization) create and own their own resources in the shared subnets but can't modify the owner's subnets.

> **Exam tip.** "Deploy the same AWS Config rules and IAM roles to every existing and future account of an OU" is a service-managed StackSet with automatic deployment. "Let ten accounts launch instances into the network team's subnets" is VPC sharing through AWS RAM, not VPC peering.

<!-- section: deployment-strategies | objectives: 3.1.5 -->
## Deployment strategies and the services that implement them

| Strategy | Behavior | AWS implementation |
| --- | --- | --- |
| All at once (in place) | Every target updated together; fastest, downtime risk | Run Command on the whole fleet, CloudFormation update without update policy |
| Rolling | Batches replaced while the rest serves | Auto Scaling **instance refresh**; CloudFormation `AutoScalingRollingUpdate`; ECS rolling update (`minimumHealthyPercent`, `maximumPercent`) |
| Immutable or replacing | New instances or a new group, old one kept until the new one is healthy | CloudFormation `AutoScalingReplacingUpdate` (`WillReplace`); new Auto Scaling group behind the same target group |
| Blue/green | Two environments, traffic switched at once, instant rollback | ALB weighted target groups (weights 0–999), Route 53 weighted records, ECS native blue/green with bake time |
| Canary and linear | A small share of traffic first, then the rest at once or in steps | Lambda weighted aliases (two published versions, not `$LATEST`), ALB weights, ECS canary or linear |

**Instance refresh** defaults: minimum healthy percentage 90 % (100 % maximum) without an instance maintenance policy; instance warmup = default instance warmup, else health check grace period; skip matching off with the CLI, on in the console; checkpoints, bake time, **CloudWatch alarms** and **auto rollback** are off until you set them. Note that CloudFormation rolling updates don't honor the group's instance maintenance policy.

ECS rolling deployments stop and roll back automatically with the **deployment circuit breaker** (tasks can't start) or **CloudWatch alarms** (application metrics). Images can be **prebaked** (golden AMI: faster launch and scaling) or **bootstrapped** with user data (simpler, slower launches); combine them by baking stable software and bootstrapping environment settings.

> **Exam trap.** A weighted alias or weighted target group doesn't roll back by itself. Automatic rollback requires something that watches alarms: instance refresh with auto rollback, the ECS circuit breaker or alarms, or CloudFormation rollback triggers.

<!-- section: third-party-tools | objectives: 3.1.6 -->
## Using Terraform and Git with AWS

**Terraform** on AWS stores state in an **S3 backend**:

- Lock the state with S3 native locking (`use_lockfile = true`, Terraform 1.11 or later); DynamoDB-based locking is deprecated. A second run fails with `Error acquiring the state lock` while the `.tflock` object exists.
- Turn on S3 Versioning on the state bucket to roll back a bad state, encrypt with SSE-KMS (`encrypt = true` with `kms_key_id`), deny requests without TLS, and log object-level access with CloudTrail data events.
- Use a separate backend (ideally a separate account) per environment, read-only production state for most users, and writes only from the pipeline role.
- **AWS Service Catalog** can publish Terraform configurations as products (types **External**, for Terraform Community Edition, and **Terraform Cloud**) so users launch approved stacks through a launch role without direct permissions.

**Git** drives infrastructure changes:

- **AWS CodeConnections** (formerly AWS CodeStar Connections) links CodePipeline, CodeBuild and other services to GitHub, GitLab, Bitbucket and other providers through a connection ARN, without stored tokens.
- **CloudFormation Git sync** watches a template and a stack deployment file (parameters, tags) in a GitHub, GitHub Enterprise, GitLab, GitLab self-managed or Bitbucket repository and updates the stack on each commit, optionally commenting proposed changes on pull requests.
- AWS CodeCommit is available again to new customers and hosts private Git repositories in your account.

> **Exam tip.** "Two engineers corrupted the Terraform state by applying at the same time" is fixed by state locking on the S3 backend. "Deploy the stack automatically whenever the template changes in the GitHub repository, with the least operational overhead" is CloudFormation Git sync.

<!-- section: key-points -->
## Key points

- AMIs are Regional: copy to share across Regions, share encrypted AMIs only with a customer managed key, deprecate then deregister, protect with deregistration protection.
- Image Builder: components, recipes, infrastructure and distribution configurations, pipelines that build only on dependency updates by default, lifecycle policies; ECR lifecycle rules, tag immutability, Inspector scanning, replication.
- CloudFormation: change sets, drift detection, stack policies, DeletionPolicy, CreationPolicy with cfn-signal, UpdatePolicy; CDK constructs L1–L3, bootstrap per account and Region, synth, diff, deploy.
- Read the first failed event; `ROLLBACK_COMPLETE` means delete and recreate, `UPDATE_ROLLBACK_FAILED` means continue the rollback; pass capabilities for IAM; five reserved IPs per subnet, add a secondary CIDR to grow.
- StackSets: self-managed roles with exact names or service-managed with automatic deployment to OUs; AWS RAM shares subnets and other resources without invitations inside an organization.
- Rolling (instance refresh, UpdatePolicy), immutable, blue/green, canary and linear; automatic rollback needs alarms or a circuit breaker.
- Terraform: S3 backend with native locking, versioning and encryption; Service Catalog Terraform products; CodeConnections and CloudFormation Git sync for Git-driven deployments.
