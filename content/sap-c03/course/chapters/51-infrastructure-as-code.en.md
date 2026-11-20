Infrastructure as code (IaC) is how a professional architect keeps hundreds of accounts and several Regions identical, reviewable and recoverable. SAP-C03 questions compare declarative templates with imperative code, place guardrails at the right stage (authoring, deployment, runtime), keep secrets out of templates and choose a mechanism to roll the same baseline out to every account of an organization.

<!-- section: declarative-imperative | objectives: 5.1.1 -->
## Declarative and imperative infrastructure as code

**AWS CloudFormation** is declarative: a JSON or YAML template describes the desired resources and CloudFormation computes the create, update and delete operations of a **stack**. **AWS CDK** is imperative at authoring time: TypeScript, Python, Java, C# or Go code with loops, conditions and classes, which **synthesizes** a CloudFormation template; the deployment itself is still a CloudFormation stack.

| Requirement | Choice |
| --- | --- |
| Templates readable by auditors, no programming skills in the team | CloudFormation (YAML), with modules or nested stacks for reuse |
| Reusable, tested abstractions shared by many teams | CDK constructs: L1 (`Cfn*`, one-to-one with CloudFormation), L2 (sensible defaults, helper methods), L3 patterns (several resources wired together) |
| Preview the exact change before production | CloudFormation change sets; `cdk diff` |
| Bring manually created resources under IaC | IaC generator (template from existing resources), resource import into a stack |
| Serverless application shorthand | AWS SAM transform (`AWS::Serverless`) |
| Protect data on replacement or deletion | `DeletionPolicy` and `UpdateReplacePolicy` (`Retain` or `Snapshot`), stack policies, termination protection |
| Detect manual changes | Drift detection on stacks and stack sets |

CDK needs each target account and Region to be **bootstrapped** (the `CDKToolkit` stack: an S3 bucket and an ECR repository for assets, plus deployment roles). For pipelines that deploy into other accounts, bootstrap the targets with a trust to the tooling account:

```bash
cdk bootstrap aws://444455556666/eu-west-1 \
  --trust 111122223333 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
cdk synth
cdk diff
cdk deploy --all --require-approval broadening
```

```yaml
Resources:
  OrdersTable:
    Type: AWS::DynamoDB::Table
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
```

> **Exam trap.** CDK isn't a separate provisioning engine: drift, rollbacks, change sets and stack quotas are CloudFormation's. "Use a general-purpose language AND keep CloudFormation's rollback and drift detection" is satisfied by CDK; tighten the execution policy instead of the default `AdministratorAccess` when the stem requires least privilege for deployments.

<!-- section: policy-as-code | objectives: 5.1.2 -->
## Policy as code: validate, enforce, remediate

Guardrails work best in layers, from the developer's laptop to the running account:

| Stage | Tool | Effect |
| --- | --- | --- |
| Authoring and CI | AWS CloudFormation Guard rules run on templates; `cfn-lint`; CDK aspects | Fail the build before anything is deployed |
| Synthesis (CDK) | Aspects visit every construct during the prepare phase; an error annotation fails `cdk synth` | Mutate (add tags, force encryption) or validate |
| Deployment | CloudFormation Hooks | Inspect resources, stacks, change sets or Cloud Control API operations before provisioning; `FAIL` stops the operation, `WARN` lets it continue with a warning |
| Runtime, preventive | SCPs and RCPs (maximum permissions), permissions boundaries | Deny the API call whatever the tool used |
| Runtime, detective | AWS Config rules, conformance packs, organization rules | Flag noncompliant resources after deployment |
| Remediation | AWS Config remediation with Systems Manager Automation documents (manual or automatic); stack drift detection | Restore the compliant configuration |

**CloudFormation Hooks** target `RESOURCE`, `STACK`, `CHANGE_SET` or `CLOUD_CONTROL`, for `CREATE`, `UPDATE` or `DELETE` actions (change sets: `CREATE` only), through `preCreate`, `preUpdate` and `preDelete` handlers. A hook can be built from AWS Control Tower **proactive controls** (no code), Guard rules, a Lambda function in any supported runtime, or a custom hook published in the CloudFormation registry. Start new hooks in `WARN` mode to observe their effect without blocking stacks.

AWS Control Tower groups the same ideas: **preventive** controls (SCPs, RCPs), **detective** controls (Config rules) and **proactive** controls (Hooks).

```text
# CloudFormation Guard rule: every S3 bucket must block public access
let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]

rule s3_block_public_access when %buckets !empty {
  %buckets.Properties.PublicAccessBlockConfiguration.BlockPublicAcls == true
  %buckets.Properties.PublicAccessBlockConfiguration.RestrictPublicBuckets == true
}
```

An AWS Config rule in **proactive** evaluation mode can evaluate resource properties before deployment, but it neither remediates nor blocks; to block a non-compliant deployment, use a Hook.

> **Exam trap.** An SCP blocks the API call but gives the developer a late, generic `AccessDenied` in the middle of a stack operation; a Config rule only detects after the fact. "Prevent non-compliant resources from being provisioned through CloudFormation, with a clear message, across all accounts" points to CloudFormation Hooks (for example Control Tower proactive controls), with SCPs kept as the backstop for other paths.

<!-- section: secrets-in-iac | objectives: 5.1.3 -->
## Managing secrets in infrastructure code

Secrets never appear in a template, a parameter file or a Git repository. Options:

| Need | Mechanism |
| --- | --- |
| Database master password with no human ever seeing it | `ManageMasterUserPassword: true` on RDS or Aurora: RDS generates the password, stores it in Secrets Manager and rotates it (every 7 days by default); optional customer managed key |
| A new random secret created by the stack | `AWS::SecretsManager::Secret` with `GenerateSecretString`, then a rotation schedule |
| Reference an existing secret in any property | `{{resolve:secretsmanager:secret-id:SecretString:json-key}}`; full ARN for a secret in another account |
| Reference a SecureString parameter | `{{resolve:ssm-secure:name:version}}`: only on supported properties (RDS and Redshift master passwords, ElastiCache `AuthToken`, IAM user login password, Directory Service passwords...) |
| Non-secret configuration (AMI ID, VPC ID) | `{{resolve:ssm:name}}` or an SSM parameter type in `Parameters` |
| Same secret in several Regions | Secrets Manager replica secrets |

Rules of dynamic references:

- At most 60 per template; resolved during stack and change set operations.
- Not supported for secure values in custom resources, nor in `AWS::CloudFormation::Init` metadata or EC2 `UserData`; don't put them in properties that form a resource's primary identifier.
- CloudFormation stores only the reference, never the resolved SecureString value.
- Changing only the secret doesn't update the resource: CloudFormation reads the value when the resource is created or updated. Use **versionless** references with Secrets Manager rotation rather than pinning a version.

`NoEcho` parameters only mask values in console and API output; a value typed as a parameter still travels through the deployment tooling. Prefer dynamic references. In CDK, read secrets with `SecretValue` or `Secret.fromSecretNameV2` so the synthesized template contains a reference, not the value.

```yaml
Resources:
  AppDatabase:
    Type: AWS::RDS::DBCluster
    Properties:
      Engine: aurora-postgresql
      MasterUsername: dbadmin
      ManageMasterUserPassword: true
  PartnerApiKey:
    Type: AWS::SecretsManager::Secret
    Properties:
      GenerateSecretString:
        SecretStringTemplate: '{"client":"partner-a"}'
        GenerateStringKey: apikey
        PasswordLength: 40
        ExcludePunctuation: true
```

> **Exam trap.** Secrets Manager provides managed rotation and cross-Region replicas; Parameter Store SecureString has neither, but costs less for configuration values. "Credentials must rotate automatically every 30 days without redeploying the stack" points to Secrets Manager with a versionless dynamic reference, not an `ssm-secure` reference.

<!-- section: multi-account-region | objectives: 5.1.4 -->
## Multi-account and multi-Region deployments with StackSets

A **StackSet** deploys one template from an **administrator account** to **stack instances** in target accounts and Regions; updating the StackSet updates every instance.

| | Self-managed permissions | Service-managed permissions |
| --- | --- | --- |
| Targets | Any accounts, listed by ID | Accounts of AWS Organizations: whole organization or OUs (child OUs included) |
| IAM roles | You create `AWSCloudFormationStackSetAdministrationRole` in the administrator account and `AWSCloudFormationStackSetExecutionRole` (exact name) in each target | Created by StackSets |
| Prerequisites | None beyond the roles | All features enabled, trusted access activated |
| New accounts | Add them manually | **Automatic deployment** when an account joins or moves into a target OU; on removal, delete or retain stacks |
| Who administers | The administrator account | Management account or a **delegated administrator** (`--call-as DELEGATED_ADMIN`) |

Service-managed StackSets **never deploy to the management account**, even when it sits in a targeted OU: deploy there with a regular stack. Account filters refine OU targets: `INTERSECTION` (only listed accounts in the OUs), `DIFFERENCE` (all but the listed accounts), `UNION` (the OUs plus extra accounts). A delegated administrator can deploy to any account of the organization; the management account can't restrict it to some OUs.

Operation preferences control the rollout: **maximum concurrent accounts**, **failure tolerance** per Region (beyond it the operation stops), **Region concurrency** sequential (in a Region order you choose) or parallel, and the concurrency mode (with strict failure tolerance, concurrency is at most failure tolerance plus one).

```bash
aws cloudformation create-stack-set --stack-set-name security-baseline \
  --template-body file://baseline.yaml --capabilities CAPABILITY_NAMED_IAM \
  --permission-model SERVICE_MANAGED \
  --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false

aws cloudformation create-stack-instances --stack-set-name security-baseline \
  --deployment-targets OrganizationalUnitIds=ou-ab12-11111111 \
  --regions eu-west-1 eu-central-1 \
  --operation-preferences RegionConcurrencyType=SEQUENTIAL,MaxConcurrentPercentage=25,FailureTolerancePercentage=10
```

Other patterns: a CDK or CodePipeline pipeline with cross-account stages for application stacks that need ordered promotion (test, then production accounts), and Control Tower for the landing zone itself. Deleting stacks from a StackSet with **retain stacks** keeps them running independently.

> **Exam trap.** "Every new account added to the Production OU must receive the logging and security baseline automatically, with no manual step" is a service-managed StackSet with automatic deployment targeting the OU. Self-managed StackSets need the execution role created in each account first, and nothing deploys to newly created accounts on its own.

<!-- section: key-points -->
## Key points

- CloudFormation is declarative; CDK code synthesizes CloudFormation; constructs L1, L2, L3; bootstrap each account and Region, with `--trust` for cross-account pipelines.
- Change sets and `cdk diff` preview; DeletionPolicy, UpdateReplacePolicy, stack policies and termination protection protect data; drift detection finds manual changes.
- Policy as code in layers: Guard and aspects in CI, CloudFormation Hooks at deployment (FAIL or WARN), SCPs and RCPs as the backstop, Config rules to detect, Systems Manager Automation to remediate.
- Control Tower controls: preventive (SCP, RCP), detective (Config), proactive (Hooks).
- Secrets: ManageMasterUserPassword, GenerateSecretString, versionless `secretsmanager` references, `ssm-secure` only on supported properties, 60 references per template, none in UserData or custom resources.
- StackSets: self-managed roles vs service-managed with Organizations, automatic deployment to OUs, delegated administrator, no deployment to the management account, concurrency and failure tolerance.
