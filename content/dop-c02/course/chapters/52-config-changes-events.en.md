Incident questions in this area describe a fleet that drifted, a resource that became noncompliant or an event that should trigger a change, and ask for the most automated way to bring systems back to the desired state. The answer is almost always an event source (AWS Config, Amazon EventBridge, an Auto Scaling lifecycle event, a CloudWatch alarm) wired to a managed executor (Systems Manager Automation, State Manager, Run Command, an instance refresh) with a role that has just enough permissions, rather than a script someone runs by hand.

<!-- section: fleet-management | objectives: 5.2.1 -->
## Fleet management with Systems Manager and Auto Scaling

**AWS Systems Manager** manages EC2 instances, on-premises servers and edge devices as *managed nodes*. A node is managed when three conditions hold:

1. SSM Agent is installed and running (preinstalled on many AWS-provided AMIs).
2. The node has permissions: an instance profile with the `AmazonSSMManagedInstanceCore` policy, or Default Host Management Configuration, which lets Systems Manager manage every EC2 instance of an account and Region without an instance profile. Hybrid nodes use a hybrid activation.
3. The node reaches the Systems Manager endpoints (`ssm`, `ssmmessages`, `ec2messages`) through the internet, a NAT gateway or interface VPC endpoints.

> **Exam trap.** An instance missing from Fleet Manager or rejected by Run Command is almost always one of these three: no agent, no permissions, or no network path to the endpoints (private subnet without NAT or VPC endpoints).

| Capability | Use it for |
| --- | --- |
| Run Command | One-time command or script on many nodes (`AWS-RunShellScript`, `AWS-RunPowerShellScript`) |
| State Manager | An association that keeps nodes in a defined state on a schedule and reports compliance |
| Automation | Multi-step runbooks against nodes and AWS resources (stop, snapshot, patch, change a security group), with approvals and rate control |
| Patch Manager | Scan and install patches against patch baselines; patch policies through Quick Setup |
| Maintenance Windows | Run tasks (Run Command, Automation, Lambda, Step Functions) inside a defined time slot |
| Inventory | Collect software, files, services and configuration from nodes |
| Parameter Store | Configuration values and `SecureString` parameters encrypted with AWS KMS |
| Session Manager | Shell access without SSH keys or open inbound ports, logged to CloudWatch Logs or S3 |
| Distributor | Package and deploy software to nodes |

Targets are chosen by instance IDs, **tags**, resource groups or all nodes. Run Command and Automation expose **rate control**: `--max-concurrency` (a number or a percentage of targets at a time) and `--max-errors` (stop sending to new targets once the threshold is exceeded; targets already running continue).

**Patch policies** in Quick Setup are AWS's recommended way to patch an organization: one policy covers every account and Region of the organization or selected OUs, with separate scan and install schedules (for example scan daily, install weekly) and a baseline per operating system. They run `AWS-RunPatchBaseline`. Maintenance windows, State Manager associations and "Patch now" are limited to one account and Region at a time.

**Amazon EC2 Auto Scaling** is the fleet manager for stateless instances: the launch template defines the configuration, and changing the fleet means replacing instances, not editing them.

| Tool | Role in fleet changes |
| --- | --- |
| Launch template version | New AMI, user data or instance type. Existing instances keep the old version |
| Instance refresh | Rolling replacement of instances to match the new configuration |
| Lifecycle hooks | Pause an instance in `Pending:Wait` or `Terminating:Wait` to run custom actions |
| Warm pool | Pre-initialized stopped, hibernated or running instances to cut scale-out time |
| Health checks | EC2 status checks, plus ELB health checks when enabled, to replace unhealthy instances |

<!-- section: aws-config | objectives: 5.2.2 -->
## Configuration management with AWS Config

AWS Config records the configuration of supported resources (the **configuration recorder**, per account and Region), keeps a history of configuration items, and evaluates them with **rules**.

| Rule element | Options |
| --- | --- |
| Rule type | AWS managed rules; custom rules backed by a Lambda function; custom policy rules written in AWS CloudFormation Guard |
| Trigger | Configuration change (scoped by resource type, tag or resource ID) or periodic (1, 3, 6, 12 or 24 hours) |
| Evaluation mode | Detective (evaluates deployed resources) and, for rules that support it, proactive (evaluates a resource definition before it is provisioned) |
| Result | `COMPLIANT`, `NON_COMPLIANT`, `NOT_APPLICABLE`, `INSUFFICIENT_DATA` |

At scale:

- **Conformance packs** bundle rules and remediation actions in one YAML template deployed as a unit; **organization conformance packs** and **organization rules** deploy them to every member account from the management account or a delegated administrator.
- **Aggregators** collect configuration and compliance data from many accounts and Regions into one account for a read-only view. An aggregator does not deploy rules or remediate.
- Compliance changes are emitted to EventBridge as `Config Rules Compliance Change` events, so other automation can react.

> **Exam trap.** AWS Config detects and records; it does not prevent a change. To block a noncompliant resource before it exists, use proactive evaluation, CloudFormation Hooks or an SCP; to fix it after the fact, attach a remediation action.

<!-- section: apply-changes | objectives: 5.2.3 -->
## Applying configuration changes to systems

Choose the mechanism by the nature of the change:

| Requirement | Answer |
| --- | --- |
| Run a one-off fix on 400 tagged instances, 10 % at a time, stop after 5 errors | Run Command with tag targets, `--max-concurrency 10%`, `--max-errors 5` |
| Keep an agent installed and configured, re-applied if someone removes it | State Manager association on a schedule |
| Multi-step change with a human approval, across accounts and Regions | Automation runbook with an `aws:approve` step, run from the delegated administrator account on target accounts and Regions |
| New AMI for an Auto Scaling group without downtime | New launch template version, then instance refresh |
| Change application feature flags or settings without redeploying code | AWS AppConfig deployment with a gradual strategy and alarm rollback |
| Change infrastructure defined in CloudFormation | Update the template and stack (preview with a change set); never edit the resource directly, it creates drift |

**Instance refresh** replaces instances in a rolling way. Without an instance maintenance policy, the minimum healthy percentage defaults to 90 % and the maximum healthy percentage to 100 %. Useful options: **skip matching** (do not replace instances already on the desired configuration), **checkpoints** (pause at given percentages to validate), and **auto rollback**, which reverses the refresh when it fails or when a CloudWatch alarm enters `ALARM`. Rollback requires a desired configuration with a specific launch template version (not `$Latest` or `$Default`) and is possible only while the refresh is in progress.

```bash
aws autoscaling start-instance-refresh --auto-scaling-group-name web-asg \
  --desired-configuration '{"LaunchTemplate":{"LaunchTemplateName":"web-lt","Version":"7"}}' \
  --preferences '{"MinHealthyPercentage":90,"SkipMatching":true,"AutoRollback":true,"AlarmSpecification":{"Alarms":["web-5xx-high"]}}'
```

**AWS AppConfig** deploys configuration (feature flags, freeform configuration stored in AppConfig, Parameter Store, S3 or other sources) with validators (JSON Schema or a Lambda function) and a deployment strategy. During the bake time it monitors CloudWatch alarms and rolls back if one fires.

| Predefined strategy | Behavior |
| --- | --- |
| `AppConfig.Linear20PercentEvery6Minutes` | 20 % of targets every 6 minutes over 30 minutes, 30-minute bake time (AWS recommended) |
| `AppConfig.Canary10Percent20Minutes` | Exponential growth from 10 % over 20 minutes, 10-minute bake time (AWS recommended) |
| `AppConfig.AllAtOnce` | All targets immediately, 10-minute bake time |
| `AppConfig.Linear50PercentEvery30Seconds` | Testing and demonstration only |

> **Exam tip.** "Change a setting at runtime, validate it, roll it out gradually and roll back automatically on an alarm" describes AppConfig. Parameter Store alone stores values but has no deployment strategy or rollback.

<!-- section: event-driven-changes | objectives: 5.2.4 -->
## Modifying infrastructure in response to events

An **EventBridge rule** matches an event and invokes a target. For configuration changes, Systems Manager Automation, Run Command, Lambda, Step Functions and SNS are the usual targets; Automation and Run Command run with a role that EventBridge passes or the runbook assumes.

| Event | Automated response |
| --- | --- |
| EC2 instance launched into an Auto Scaling group must be configured before it receives traffic | Launch lifecycle hook, EventBridge rule on `EC2 Instance-launch Lifecycle Action`, Run Command or Automation configures it, then `complete-lifecycle-action` with `CONTINUE` |
| Instance being terminated must upload its logs | Termination lifecycle hook, script copies logs to S3, then completes the action |
| Security group opened to `0.0.0.0/0` on port 22 | AWS Config rule with automatic remediation, or EventBridge rule on the CloudTrail `AuthorizeSecurityGroupIngress` call invoking an Automation runbook |
| AWS Health scheduled maintenance on an instance | EventBridge rule on `aws.health` events invoking an Automation runbook that stops and starts the instance in a maintenance window |
| ACM certificate approaching expiration (imported) | EventBridge rule on `ACM Certificate Approaching Expiration` starting a reimport workflow |
| CloudWatch alarm on disk usage | Alarm state change event, EventBridge, Automation runbook extends the volume |

```json
{
  "source": ["aws.autoscaling"],
  "detail-type": ["EC2 Instance-launch Lifecycle Action"],
  "detail": {
    "AutoScalingGroupName": ["web-asg"]
  }
}
```

Lifecycle hook facts the exam tests:

- Default heartbeat timeout: one hour. `record-lifecycle-action-heartbeat` restarts the timeout. An instance stays in a wait state at most 48 hours or 100 times the heartbeat timeout, whichever is smaller.
- `complete-lifecycle-action` with `CONTINUE` puts a launching instance in service; `ABANDON` terminates and replaces it. For a terminating instance both results let it terminate.
- With a launch hook, the health check grace period starts when the instance reaches `InService`.
- Warm pool instances that are stopped or hibernated do not wait for user data to finish: use a launch hook to hold them until bootstrapping completes.
- A hook does not delay a Spot interruption (two-minute notice).

> **Exam trap.** User data runs once at launch and is not a way to change existing instances. To change running instances, use Systems Manager; to change the configuration of future instances, create a launch template version and run an instance refresh.

<!-- section: remediation | objectives: 5.2.5 -->
## Remediating a non-desired state

| Undesired state | Detect | Remediate automatically |
| --- | --- | --- |
| Resource configuration violates a rule | AWS Config rule | Config remediation action (Systems Manager Automation document) |
| Software or settings drift on instances | State Manager association compliance | The association reapplies the desired state at each run |
| Missing patches | Patch Manager compliance scan | Patch policy install schedule |
| Unhealthy instance | EC2 or ELB health check | Auto Scaling replaces it |
| Stack resources changed outside CloudFormation | CloudFormation drift detection | None built in: update the stack or import the resource; drift detection only reports |
| Security finding | Security Hub CSPM control or GuardDuty finding | EventBridge rule on the finding invoking Automation or Lambda |

**Config remediation** uses only Systems Manager Automation documents (`TargetType` = `SSM_DOCUMENT`), AWS managed or custom. A remediation can be manual (an operator chooses Remediate) or **automatic**. Parameters map the noncompliant resource with `RESOURCE_ID`, and the runbook needs an `AutomationAssumeRole` that has the permissions to fix the resource.

```bash
aws configservice put-remediation-configurations --remediation-configurations '[{
  "ConfigRuleName": "s3-bucket-versioning-enabled",
  "TargetType": "SSM_DOCUMENT",
  "TargetId": "Custom-EnableS3Versioning",
  "Automatic": true,
  "MaximumAutomaticAttempts": 5,
  "RetryAttemptSeconds": 60,
  "Parameters": {
    "BucketName": {"ResourceValue": {"Value": "RESOURCE_ID"}},
    "AutomationAssumeRole": {"StaticValue": {"Values": ["arn:aws:iam::111122223333:role/ConfigRemediationRole"]}}
  }
}]'
```

`MaximumAutomaticAttempts` accepts 1 to 25 (default 5) and `RetryAttemptSeconds` defaults to 60. If all attempts happen within that period and fail, AWS Config adds a remediation exception for the resource to stop infinite retries.

> **Exam trap.** A remediation that keeps failing is usually a permissions problem in `AutomationAssumeRole`, not in the Config service role. And a remediation that "works then reverts" means another process (a pipeline, a State Manager association, a stack update) keeps reapplying the old configuration: fix the source of truth, not only the resource.

> **Exam tip.** Security Hub CSPM automation rules update finding fields (severity, workflow status, notes); they do not change resources. Remediation of a finding goes through EventBridge to Automation or Lambda.

<!-- section: key-points -->
## Key points

- Managed node = SSM Agent + permissions (instance profile or Default Host Management Configuration) + network path to the Systems Manager endpoints.
- Run Command for one-off changes, State Manager for a desired state that is reapplied, Automation for multi-step and cross-account runbooks, patch policies for organization-wide patching.
- Auto Scaling fleets change by launch template version plus instance refresh; lifecycle hooks run custom actions at launch and termination (one-hour default timeout).
- AWS Config detects; remediation actions are Systems Manager Automation documents with an assume role, manual or automatic with retries.
- EventBridge connects events (Config, CloudTrail API calls, AWS Health, ACM, Auto Scaling, alarms) to automated changes.
- CloudFormation drift detection reports drift but never fixes it; AppConfig deploys runtime configuration with alarm-based rollback.
