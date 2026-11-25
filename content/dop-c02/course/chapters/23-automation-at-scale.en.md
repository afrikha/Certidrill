Large estates are run by automation: thousands of instances patched in waves, inventory collected from every account, compliance reported centrally, and workflows that call dozens of APIs with retries and approvals. Questions ask which managed service does the job with the least custom code, how to call AWS safely from scripts and functions, and how to keep software in a desired, compliant state. Systems Manager, EventBridge, Lambda and Step Functions are the core; AWS OpsWorks, still named in the exam guide, is shut down.

<!-- section: automation-services | objectives: 2.3.1 -->
## AWS services to automate tasks and processes

| Requirement | Service |
| --- | --- |
| Run a task on a schedule (cron, rate or one time, with a time zone) | Amazon EventBridge Scheduler (targets any AWS API through universal targets) |
| React to a change, finding or alarm in near real time | EventBridge rule with an event pattern, targeting Lambda, Step Functions, Systems Manager Automation, SNS, SQS |
| Short custom logic (up to 15 minutes) | AWS Lambda |
| Multi-step workflow with retries, branches, parallel work, waits or human approval | AWS Step Functions |
| Operational runbook on AWS resources (restart, snapshot, remediate), with approvals and rate control, across accounts and Regions | Systems Manager **Automation** |
| Run a command or script on many instances now | Systems Manager **Run Command** |
| Keep instances in a desired state continuously | Systems Manager **State Manager** |
| Disruptive tasks in an agreed time slot | Systems Manager **Maintenance Windows** |
| Remediate noncompliant resources | AWS Config remediation (Automation documents), manual or automatic |
| Track and resolve operational issues | Systems Manager OpsCenter (OpsItems from alarms and EventBridge, runbooks run from the OpsItem) |
| Provision infrastructure repeatably | CloudFormation, StackSets, Service Catalog |

Systems Manager rate control applies to Run Command, Automation and State Manager: `MaxConcurrency` (number or percentage of targets at once) and `MaxErrors` (stop after this many failures). Automation runs in **multiple accounts and Regions** from a central account: an administration role in the central account and an execution role in each target account, with target locations listing accounts or OUs and Regions.

```bash
aws ssm start-automation-execution --document-name AWS-RestartEC2Instance \
  --target-parameter-name InstanceId --targets Key=tag:App,Values=orders \
  --max-concurrency 10% --max-errors 2 \
  --target-locations '[{"Accounts":["ou-ab12-33333333"],"Regions":["eu-west-1","us-east-1"],"ExecutionRoleName":"AWS-SystemsManager-AutomationExecutionRole","TargetLocationMaxConcurrency":"5","TargetLocationMaxErrors":"1"}]'
```

> **Exam trap.** A Lambda function that loops over every instance in every account is the custom-code answer; Automation with target locations, rate control and error thresholds does the same with no code to maintain. Systems Manager Incident Manager and Change Manager are closed to new customers: don't build new processes on them.

<!-- section: interacting-infrastructure | objectives: 2.3.2 -->
## Interacting with the software-defined infrastructure

Everything on AWS is an authenticated API call (Signature Version 4). The tools on top of it:

| Tool | Use it for |
| --- | --- |
| AWS Management Console | Exploration, one-off actions; not repeatable |
| AWS CLI | Scripts and pipelines; profiles, `--query` (JMESPath), `--output`, waiters, automatic pagination |
| AWS SDKs | Application and Lambda code; built-in retries, pagination helpers, waiters |
| AWS CloudShell | Browser shell already authenticated as the console user, CLI preinstalled, 1 GB persistent home directory per Region |
| CloudFormation, CDK, SAM, Terraform | Declarative, versioned infrastructure |
| AWS Cloud Control API | One CRUD interface (`create-resource`, `get-resource`, `update-resource` with a JSON patch) for many resource types |
| Systems Manager Session Manager | Shell access to instances without SSH keys, bastions or open inbound ports, logged to S3 or CloudWatch Logs |

```text
# ~/.aws/config: a profile that assumes a role in another account
[profile prod-deploy]
role_arn = arn:aws:iam::444455556666:role/deployer
source_profile = tooling
region = eu-west-1
```

```bash
aws ec2 describe-instances --profile prod-deploy \
  --filters Name=tag:App,Values=orders Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].[InstanceId,PrivateIpAddress]' --output text
aws cloudformation wait stack-update-complete --stack-name orders-prod
aws cloudcontrol get-resource --type-name AWS::S3::Bucket --identifier example-artifacts
```

Good practice for scripts and functions at scale:

- **Retries with exponential backoff and jitter** on throttling (`ThrottlingException`, `TooManyRequestsException`) and 5xx errors. SDK retry modes: legacy, **standard** (3 attempts by default) and **adaptive** (adds client-side rate limiting).
- **Pagination**: list calls return pages; use paginators instead of reading only the first page.
- **Waiters** instead of sleep loops.
- **Temporary credentials** from roles (instance profile, Lambda execution role, IAM Identity Center), never long-term access keys in code.
- **Idempotency**: client tokens (`ClientToken`, `ClientRequestToken`) so a retried create doesn't create twice.

> **Exam tip.** "The script lists only some of the 3,000 instances" is pagination. "Intermittent `ThrottlingException` during a bulk update" is backoff with jitter and lower concurrency, not a quota increase first. AWS Cloud9 is closed to new customers: use CloudShell or a local IDE.

<!-- section: inventory-patching | objectives: 2.3.3 -->
## Automating inventory, configuration and patch management

| Need | Feature |
| --- | --- |
| Software, OS, network and custom inventory of managed nodes | Systems Manager **Inventory** (`AWS-GatherSoftwareInventory` association, set up by Quick Setup) |
| Inventory and compliance of all accounts and Regions in one place | **Resource data sync** to a central S3 bucket, queried with Athena or dashboards |
| Configuration history of AWS resources (security groups, buckets, roles) | AWS Config recorder, organization aggregator, advanced queries (SQL) |
| Who changed what | CloudTrail, linked from the Config timeline |
| Patch all nodes of the organization on a schedule | Patch Manager **patch policy** created with Quick Setup |
| Fine-grained, single account and Region patch job | Maintenance window with `AWS-RunPatchBaseline` |

Nodes must be **managed nodes**: SSM Agent running, connectivity to Systems Manager endpoints (internet or VPC endpoints `ssm`, `ssmmessages`, `ec2messages`), and permissions from an instance profile with `AmazonSSMManagedInstanceCore` or from Default Host Management Configuration. On premises, a **hybrid activation** registers servers (IDs prefixed `mi-`).

**Patch Manager** applies a **patch baseline** per OS: AWS managed or custom, with approval rules (classification, severity, auto-approval delay in days), approved and rejected lists. `AWS-RunPatchBaseline` runs with `Operation=Scan` (report only) or `Install` (with `RebootOption`). AWS recommends **patch policies**: one Quick Setup configuration covers selected OUs, accounts and Regions, with separate scan and install schedules and no patch groups needed; maintenance windows, State Manager and **Patch now** target one account-Region pair at a time. Compliance is still reported per account and Region.

```bash
aws ssm create-patch-baseline --name prod-al2023 --operating-system AMAZON_LINUX_2023 \
  --approval-rules 'PatchRules=[{PatchFilterGroup={PatchFilters=[{Key=CLASSIFICATION,Values=[Security]},{Key=SEVERITY,Values=[Critical,Important]}]},ApproveAfterDays=7}]'
aws ssm send-command --document-name AWS-RunPatchBaseline \
  --targets Key=tag:Env,Values=prod --parameters Operation=Scan \
  --max-concurrency 20% --max-errors 5%
```

> **Exam trap.** "Instances don't appear in Fleet Manager or Patch Manager" means they aren't managed: missing instance profile permissions, agent not running, or private subnets without VPC endpoints or NAT. Creating maintenance windows in each of 50 accounts by script is the high-overhead answer when a patch policy exists.

<!-- section: lambda-step-functions | objectives: 2.3.4 -->
## Lambda and Step Functions for complex automation

Lambda limits that shape a design: **15-minute** maximum timeout, memory up to 10,240 MB, `/tmp` up to 10,240 MB. Anything longer, multi-step or waiting on people goes to Step Functions.

| | Standard workflow | Express workflow |
| --- | --- | --- |
| Maximum duration | 1 year | 5 minutes |
| Execution semantics | Exactly once per step, full history kept | At least once (asynchronous) or at most once (synchronous) |
| Use it for | Long automations, approvals, auditable runs | High-volume, short event processing |
| Callback pattern (`.waitForTaskToken`) | Supported | Not supported |

Workflow features:

- **AWS SDK integrations** (`arn:aws:states:::aws-sdk:<service>:<apiAction>`) call most AWS APIs directly, with no Lambda function in between.
- **Optimized integrations** (`.sync` to run a job and wait, `.waitForTaskToken` to pause until `SendTaskSuccess` is called, for example by an approver).
- **Map** state: inline for small arrays; **Distributed** mode processes items from S3 (CSV, JSON, object lists) with up to 10,000 parallel child executions.
- **Retry** with `BackoffRate`, `MaxDelaySeconds` and `JitterStrategy`; **Catch** to a compensating step.

```json
{
  "StartAt": "ListInstances",
  "States": {
    "ListInstances": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:ec2:describeInstances",
      "Parameters": { "Filters": [{ "Name": "tag:Retire", "Values": ["true"] }] },
      "ResultSelector": { "ids.$": "$.Reservations[*].Instances[*].InstanceId" },
      "Next": "SnapshotEach"
    },
    "SnapshotEach": {
      "Type": "Map",
      "ItemsPath": "$.ids",
      "MaxConcurrency": 10,
      "ItemProcessor": {
        "ProcessorConfig": { "Mode": "INLINE" },
        "StartAt": "CreateImage",
        "States": {
          "CreateImage": {
            "Type": "Task",
            "Resource": "arn:aws:states:::aws-sdk:ec2:createImage",
            "Parameters": { "InstanceId.$": "$", "Name.$": "States.Format('retire-{}', $)" },
            "Retry": [{ "ErrorEquals": ["States.ALL"], "MaxAttempts": 3, "BackoffRate": 2, "JitterStrategy": "FULL" }],
            "End": true
          }
        }
      },
      "End": true
    }
  }
}
```

Lambda automation code uses the SDK with the function's **execution role**, assumes roles in other accounts with STS when needed, stays idempotent (events can be delivered more than once), and sends failed asynchronous events to an on-failure destination. A schedule or an EventBridge rule starts the workflow.

> **Exam tip.** "The cleanup function times out after 15 minutes when the fleet grows" means move the loop into Step Functions (Map state, Distributed mode for very large sets). "Wait for a manager's approval before deleting" is a Standard workflow with `.waitForTaskToken` or an Automation `aws:approve` step.

<!-- section: desired-state | objectives: 2.3.5 -->
## Automating software configuration to a desired state

**State Manager** associations bind an SSM document to targets (tags, resource groups, all nodes) on a schedule and reapply it, so drift is corrected automatically. They also apply to new instances that match the targets when they come online.

| Need | Document or feature |
| --- | --- |
| Run Ansible playbooks from GitHub or S3 | `AWS-ApplyAnsiblePlaybooks` (`AWS-RunAnsiblePlaybook` is deprecated) |
| Run Chef recipes | `AWS-ApplyChefRecipes` |
| Apply PowerShell DSC configurations | `AWS-ApplyDSCMofs` |
| Install and keep agents or packages current | `AWS-ConfigureAWSPackage` with Distributor packages |
| Keep the SSM Agent updated | `AWS-UpdateSSMAgent` |
| Collect inventory | `AWS-GatherSoftwareInventory` |
| Custom steps | Your own Command document (`aws:runShellScript`, `aws:runPowerShellScript`) |

```bash
aws ssm create-association --association-name web-baseline \
  --name AWS-ApplyAnsiblePlaybooks \
  --targets Key=tag:Role,Values=web \
  --parameters '{"SourceType":["S3"],"SourceInfo":["{\"path\":\"https://s3.amazonaws.com/example-config/web/\"}"],"PlaybookFile":["site.yml"],"InstallDependencies":["True"]}' \
  --schedule-expression "rate(30 minutes)" \
  --compliance-severity HIGH --max-concurrency 10% --max-errors 5%
```

Choosing the layer:

| What must stay in the desired state | Tool |
| --- | --- |
| OS packages, agents, files, services on instances | State Manager |
| Instance configuration defined in a stack | `cfn-init` plus `cfn-hup` |
| Application runtime settings and feature flags | AWS AppConfig |
| AWS resource configuration (encryption, public access) | AWS Config rules with automatic remediation |
| Everything at launch, immutable | Baked AMI from EC2 Image Builder |

> **Exam trap.** AWS OpsWorks Stacks, OpsWorks for Chef Automate and OpsWorks for Puppet Enterprise are shut down since May 2024. "Migrate Chef cookbooks with the least effort" points to State Manager with `AWS-ApplyChefRecipes`; "Ansible playbooks" to `AWS-ApplyAnsiblePlaybooks`.

<!-- section: software-compliance | objectives: 2.3.6 -->
## Maintaining software compliance

| Question | Where the answer comes from |
| --- | --- |
| Is each node patched against its baseline? | Systems Manager **Compliance**: patch compliance (from `AWS-RunPatchBaseline` scans) |
| Is each node still in its desired state? | Compliance: association compliance, with the association's severity |
| Custom checks (an agent version, a hardening score) | `PutComplianceItems` with a custom compliance type |
| Organization-wide report | Resource data sync of compliance and inventory to S3, then Athena |
| Required or forbidden software, patch and association status as Config rules | Managed rules `ec2-managedinstance-applications-required`, `ec2-managedinstance-applications-blacklisted`, `ec2-managedinstance-patch-compliance-status-check`, `ec2-managedinstance-association-compliance-status-check`, `ec2-instance-managed-by-systems-manager` |
| Known vulnerabilities (CVEs) in packages, images and functions | Amazon Inspector continuous scanning of EC2 (SSM Agent or agentless), ECR images and Lambda functions |

Compliance data feeds **AWS Config** (as `AWS::SSM::PatchCompliance` and `AWS::SSM::AssociationCompliance` items), so conformance packs and organization aggregators report it with the rest of the estate, and EventBridge rules can react to a compliance change, for example by opening an OpsItem or running an Automation runbook.

```bash
aws ssm list-compliance-summaries
aws ssm list-resource-compliance-summaries \
  --filters Key=ComplianceType,Values=Patch,Type=EQUAL Key=OverallSeverity,Values=CRITICAL,Type=EQUAL
```

> **Exam trap.** Patch Manager reports missing patches; Amazon Inspector reports vulnerabilities, including in software that Patch Manager doesn't manage. Inspector Classic assessment templates are shut down since May 2026: current Inspector scans automatically, with no assessment run to schedule.

<!-- section: key-points -->
## Key points

- EventBridge (rules and Scheduler), Lambda, Step Functions and Systems Manager (Automation, Run Command, State Manager, Maintenance Windows, OpsCenter) automate operations; rate control with `MaxConcurrency` and `MaxErrors`.
- Automation runs across accounts and Regions with target locations and administration and execution roles.
- CLI and SDK at scale: role profiles, `--query`, pagination, waiters, standard or adaptive retries with backoff, idempotency tokens; CloudShell and Session Manager for access.
- Managed nodes need the agent, permissions and connectivity; Inventory and resource data sync centralize data; patch policies cover the organization with separate scan and install schedules.
- Lambda ends at 15 minutes; Step Functions Standard (1 year, callbacks) or Express (5 minutes), SDK integrations, Distributed Map.
- State Manager keeps desired state with Ansible, Chef, DSC or custom documents; OpsWorks is shut down.
- Compliance: Systems Manager Compliance, Config managed rules, Inspector for CVEs.
