Configuration management questions ask how to describe infrastructure as code, change it safely, roll it out to many accounts and Regions, keep running systems in their desired configuration, and give teams reusable building blocks that already contain the organization's security standards. The answer is usually a managed feature (change sets, StackSets, Service Catalog, State Manager, AppConfig) chosen over custom scripts, and never a retired service such as AWS OpsWorks.

<!-- section: iac-options | objectives: 2.1.1 -->
## Infrastructure as code options on AWS

| Requirement | Tool |
| --- | --- |
| Declarative templates in JSON or YAML, native rollback, drift detection | AWS CloudFormation |
| Serverless applications (functions, APIs, tables, state machines) with short syntax and local testing | AWS SAM (a CloudFormation transform plus the SAM CLI) |
| General-purpose language (TypeScript, Python, Java, C#, Go), loops, classes, unit tests, shared construct libraries | AWS CDK (synthesizes CloudFormation) |
| Multi-cloud tooling the team already uses | Terraform with the AWS provider (state managed by the team, for example in S3) |
| Uniform create, read, update, delete API for resource types, from any tool | AWS Cloud Control API |
| Third-party or custom resource types inside templates | CloudFormation registry (public extensions, private resource types, modules, hooks) |
| Bring resources created by hand under IaC | IaC generator (scans the account and generates a template), resource import into a stack |

CDK concepts the exam uses: **constructs** at three levels (L1 `Cfn*` resources mapped one-to-one to CloudFormation, L2 with defaults and helper methods such as `bucket.grantRead(role)`, L3 patterns), **stacks** and **stages**, **aspects** that visit every construct (enforce tags or encryption), and `cdk bootstrap` once per account and Region before the first deployment.

> **Exam trap.** CDK and SAM are not separate deployment engines: both end as CloudFormation stacks, so change sets, rollback, drift, stack policies and StackSets still apply. A requirement for "the same rollback and drift detection as the rest of the estate" doesn't exclude CDK.

<!-- section: composing-templates | objectives: 2.1.4 -->
## Composing and deploying templates

| Need | CloudFormation feature |
| --- | --- |
| Reuse a component inside one deployment, update parent and children together | Nested stacks (`AWS::CloudFormation::Stack`) |
| Share values between independently managed stacks (network stack, application stacks) | Outputs with `Export`, consumed by `Fn::ImportValue`; an export can't change or be deleted while imported |
| Values that differ per environment | `Parameters`, `Mappings`, `Conditions`, SSM parameter types (`AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>`) |
| Expand shorthand or generate resources | Transforms and macros: `AWS::Serverless-2016-10-31`, `AWS::Include`, `AWS::LanguageExtensions` (`Fn::ForEach`, `Fn::Length`), custom macros backed by Lambda |
| Logic CloudFormation doesn't support (call an API, look up a value, seed data) | Custom resource (`Custom::Name`) whose `ServiceToken` is a Lambda function or SNS topic in the stack's Region |
| Configure software on EC2 and wait for it | `AWS::CloudFormation::Init` metadata with the helper scripts |

The **helper scripts**: `cfn-init` reads the `AWS::CloudFormation::Init` metadata and installs packages, writes files and starts services; `cfn-signal` reports success or failure to a `CreationPolicy` (or a wait condition); `cfn-hup` is a daemon that detects metadata changes (every 15 minutes by default) and reruns actions, so a stack update can reconfigure running instances; `cfn-get-metadata` reads the metadata.

```yaml
Resources:
  WebServer:
    Type: AWS::EC2::Instance
    CreationPolicy:
      ResourceSignal:
        Count: 1
        Timeout: PT15M
    Metadata:
      AWS::CloudFormation::Init:
        config:
          packages:
            yum:
              nginx: []
          services:
            systemd:
              nginx:
                enabled: true
                ensureRunning: true
    Properties:
      ImageId: '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64}}'
      InstanceType: t3.small
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          /opt/aws/bin/cfn-init -v --stack ${AWS::StackName} --resource WebServer --region ${AWS::Region}
          /opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource WebServer --region ${AWS::Region}
```

A **custom resource** receives `Create`, `Update` and `Delete` requests and must send its result to the presigned S3 URL in the request. If it never answers, the stack waits until `ServiceTimeout` (1 to 3,600 seconds, default 3,600), then fails; a provider that crashes on `Delete` blocks stack deletion the same way. Always send a response, including in error handlers.

Deployment commands: `aws cloudformation package` (uploads local code to S3) and `aws cloudformation deploy` (creates and executes a change set); `sam build` and `sam deploy`; `cdk synth`, `cdk diff`, `cdk deploy`.

> **Exam trap.** An Auto Scaling group or instance that reports `CREATE_COMPLETE` before the application is installed lacks a `CreationPolicy` with `cfn-signal`. A stack stuck in `CREATE_IN_PROGRESS` for an hour on a custom resource means the function never sent its response.

<!-- section: change-management | objectives: 2.1.2 -->
## Change management for IaC

Every change goes through version control and a pipeline; nobody edits production in the console.

| Control | What it does |
| --- | --- |
| Change sets | Show which resources will be added, modified or **replaced** before execution |
| Pipeline with approval | CodePipeline CloudFormation action `CHANGE_SET_REPLACE`, then a manual approval, then `CHANGE_SET_EXECUTE` |
| Stack policy | Denies updates (for example `Update:Replace` or `Update:Delete`) to protected resources; overridden only by a temporary policy supplied with the update |
| Termination protection | Prevents stack deletion |
| `DeletionPolicy` and `UpdateReplacePolicy` | `Retain` or `Snapshot` keep data when a resource is deleted or replaced |
| Rollback triggers | Up to 5 CloudWatch alarms watched during the update and for a monitoring time of 0 to 180 minutes |
| Drift detection | Reports resources and properties changed outside CloudFormation; it reports, it doesn't fix |
| CloudFormation Hooks | Inspect resources, stacks or change sets before provisioning; `FAIL` blocks, `WARN` only warns |
| Git sync | Keeps a stack in sync with a template and deployment file in a Git repository |

Updating a property has one of three behaviors, given in the resource reference: **no interruption**, **some interruption**, or **replacement** (new physical ID, data lost unless retained). Renaming an RDS instance or changing a DynamoDB key schema means replacement.

```bash
aws cloudformation create-change-set --stack-name orders-prod \
  --change-set-name release-42 --template-body file://orders.yaml \
  --parameters ParameterKey=ImageTag,ParameterValue=1.42.0 --capabilities CAPABILITY_IAM
aws cloudformation describe-change-set --stack-name orders-prod --change-set-name release-42 \
  --query 'Changes[].ResourceChange.[LogicalResourceId,Action,Replacement]'
aws cloudformation execute-change-set --stack-name orders-prod --change-set-name release-42
aws cloudformation detect-stack-drift --stack-name orders-prod
```

> **Exam tip.** "Reviewers must see that the database will be replaced before anything happens" is a change set reviewed at a manual approval. "Prevent anyone from replacing the database through a stack update" is a stack policy (plus `DeletionPolicy` and `UpdateReplacePolicy` to keep the data).

<!-- section: stacksets | objectives: 2.1.5 -->
## StackSets across accounts and Regions

A **StackSet** deploys one template from an administrator account to **stack instances** in many accounts and Regions.

| | Self-managed permissions | Service-managed permissions |
| --- | --- | --- |
| Targets | Account IDs you list | Organization root or OUs of AWS Organizations |
| Roles | You create `AWSCloudFormationStackSetAdministrationRole` (administrator) and `AWSCloudFormationStackSetExecutionRole` (each target) | Created for you (trusted access with Organizations) |
| New accounts | Added manually | **Automatic deployment** when an account joins a target OU; stacks deleted or retained when it leaves |
| Administered from | The administrator account | Management account or a **delegated administrator** (`--call-as DELEGATED_ADMIN`) |

Service-managed StackSets don't deploy to the management account. **Operation preferences** control rollout speed and safety: maximum concurrent accounts (count or percentage), failure tolerance per Region, sequential or parallel Regions with a Region order. **Parameter overrides** give individual accounts or Regions different values. Drift detection also works on StackSets.

```bash
aws cloudformation create-stack-set --stack-set-name config-baseline \
  --template-body file://baseline.yaml --permission-model SERVICE_MANAGED \
  --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false --capabilities CAPABILITY_NAMED_IAM
aws cloudformation create-stack-instances --stack-set-name config-baseline \
  --deployment-targets OrganizationalUnitIds=ou-ab12-11111111 --regions us-east-1 eu-west-1 \
  --operation-preferences RegionConcurrencyType=SEQUENTIAL,MaxConcurrentPercentage=20,FailureTolerancePercentage=5
```

> **Exam trap.** Global resources (IAM roles) in a StackSet deployed to several Regions of the same account collide on names: deploy them in one Region only, or include the Region in the name. Self-managed StackSets fail in accounts where the execution role is missing.

<!-- section: config-management | objectives: 2.1.3, 2.1.6 -->
## Configuration management services and strategies

| Need | Service |
| --- | --- |
| Keep software and OS settings in a desired state on EC2 and on-premises nodes, on a schedule | Systems Manager **State Manager** associations (SSM documents, Ansible playbooks with `AWS-ApplyAnsiblePlaybooks`, Chef recipes with `AWS-ApplyChefRecipes`, PowerShell DSC) |
| Run a one-time command across a fleet with rate control | Systems Manager **Run Command** |
| Multi-step operational changes with approvals and branching | Systems Manager **Automation** runbooks |
| Store configuration values and parameters | Systems Manager **Parameter Store** (secrets that rotate: Secrets Manager) |
| Record AWS resource configuration history and evaluate compliance | **AWS Config** (rules, conformance packs, remediation through Automation); Config records, it doesn't configure |
| Change application behavior at runtime without redeploying code (feature flags, throttling limits, allow lists) | **AWS AppConfig** |
| Chef or Puppet stacks formerly on AWS OpsWorks | OpsWorks is shut down: State Manager with Chef recipes or Ansible playbooks, or a self-managed server |

**AWS AppConfig** separates an application, its environments and configuration profiles (feature flags or freeform data from the hosted store, S3, Parameter Store, Secrets Manager and other sources). Validators (JSON Schema or a Lambda function) run before deployment; a **deployment strategy** rolls the change out gradually; CloudWatch alarms attached to the environment roll it back automatically. Applications read configuration through the AppConfig Agent (Lambda extension, ECS or EKS sidecar) or the `StartConfigurationSession` and `GetLatestConfiguration` APIs.

| Predefined strategy | Behavior |
| --- | --- |
| `AppConfig.Linear20PercentEvery6Minutes` | 20 % of targets every 6 minutes, 30-minute deployment, 30-minute bake time (AWS recommended) |
| `AppConfig.Canary10Percent20Minutes` | Exponential growth of 10 % over 20 minutes, 10-minute bake time (AWS recommended) |
| `AppConfig.AllAtOnce` | All targets immediately, 10-minute bake time |
| `AppConfig.Linear50PercentEvery30Seconds` | 50 % every 30 seconds, for testing and demonstration only |

> **Exam trap.** AWS OpsWorks (Stacks, for Chef Automate, for Puppet Enterprise) is in full shutdown since May 2024, even though the exam guide still names it: never choose it. A feature flag stored in Parameter Store and read at startup needs a restart and has no gradual rollout or alarm rollback; AppConfig has both.

<!-- section: reusable-governed | objectives: 2.1.7 -->
## Reusable templates with built-in governance

| Requirement | Mechanism |
| --- | --- |
| Teams self-provision only approved products, without IAM permissions on the underlying services | **AWS Service Catalog** portfolio with products (CloudFormation or Terraform) and a **launch constraint** (the role used to provision) |
| Restrict parameter values (instance types, CIDR ranges) | Service Catalog **template constraint** |
| Same portfolio in every account of the organization | Portfolio sharing with an organization or OU from the management or delegated administrator account; recipient accounts see it as an imported portfolio, and their IAM principals still need access to it (granted locally or by sharing principal names) |
| Standard tags enforced at launch | Service Catalog TagOptions |
| Reuse a group of resources with secure defaults inside any template | **CloudFormation module** (`Org::Service::Name::MODULE`) registered in the private registry of each account and Region (`AWS::CloudFormation::ModuleVersion` in a StackSet distributes it) |
| Reusable component in a programming language, versioned and published | CDK **construct library** published to CodeArtifact; **aspects** enforce encryption or tags on every construct |
| Block noncompliant resources at deployment, organization-wide | CloudFormation **Hooks** (Control Tower **proactive controls** are Hooks), with **CloudFormation Guard** rules also run in CI |

```text
let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]

rule bucket_encrypted_and_versioned when %buckets !empty {
  %buckets.Properties.BucketEncryption exists
  %buckets.Properties.VersioningConfiguration.Status == 'Enabled'
}
```

A module version can't be edited: a change registers a new version, but templates keep using the **default** version (the first one registered) until you set the new one as default (`aws cloudformation set-type-default-version`); stacks then pick it up on their next update. In Service Catalog, a new **product version** is published and users update their provisioned products.

> **Exam tip.** "Developers must launch a compliant environment without having permissions to create IAM roles or VPCs" is Service Catalog with a launch constraint. "A shared, versioned VPC pattern reused inside many teams' own templates" is a CloudFormation module or a CDK construct library.

<!-- section: key-points -->
## Key points

- CloudFormation, SAM and CDK all deploy CloudFormation stacks; Cloud Control API and the registry extend them; IaC generator imports existing resources.
- Nested stacks for composition, exports for sharing between stacks, macros and `AWS::LanguageExtensions` for generation, custom resources for API logic (always send a response).
- `cfn-init`, `cfn-signal` with `CreationPolicy`, `cfn-hup` for updates in place.
- Change sets, approvals, stack policies, retention policies, rollback triggers, drift detection and Hooks make IaC changes safe.
- StackSets: self-managed vs service-managed, automatic deployment to OUs, delegated administrator, concurrency and failure tolerance.
- State Manager keeps desired state (Ansible, Chef), Config records and evaluates, AppConfig deploys runtime configuration gradually with alarm rollback; OpsWorks is shut down.
- Service Catalog (launch and template constraints), CloudFormation modules and CDK constructs carry governance into reusable templates.
