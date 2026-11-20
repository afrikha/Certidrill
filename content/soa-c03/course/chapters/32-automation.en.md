Operations teams automate two kinds of work: recurring tasks run against a fleet (scripts, configuration, patching, maintenance) and reactions to something that just happened (an object arrives, an API call changes a security group, an alarm fires). AWS Systems Manager handles the first kind; Amazon EventBridge, Amazon S3 Event Notifications and AWS Lambda handle the second, and AWS DevOps Agent investigates incidents when alerts arrive. This chapter covers managed nodes, Run Command and State Manager, Automation runbooks, patching, maintenance windows and Session Manager, then event-driven designs and AI-assisted operations.

<!-- section: managed-nodes | objectives: 3.2.1 -->
## Managed nodes and the Systems Manager toolbox

Every Systems Manager tool acts only on **managed nodes**. An EC2 instance becomes one when three conditions hold:

| Condition | What to check |
| --- | --- |
| SSM Agent installed and running | Preinstalled on many AWS-provided AMIs (Amazon Linux 2023, Windows Server); install it yourself on custom images |
| Permissions | An instance profile with the AWS managed policy `AmazonSSMManagedInstanceCore`, or **Default Host Management Configuration** |
| Network path | Outbound HTTPS (443) to the `ssm`, `ssmmessages` and `ec2messages` endpoints, through a NAT gateway or interface VPC endpoints; S3 reachable for agent updates and patching |

**Default Host Management Configuration** (DHMC) is an account setting, turned on Region by Region, that gives every instance the role `AWSSystemsManagerDefaultEC2InstanceManagementRole` without an instance profile. It requires IMDSv2 and SSM Agent 3.2.582.0 or later; instances can take up to 30 minutes to pick up the role. If an attached instance profile already allows `ssm:UpdateInstanceInformation`, the instance uses the profile instead. On-premises servers and VMs join through a **hybrid activation** (activation code and ID plus an IAM service role).

Choose the tool from the requirement:

| Requirement | Tool |
| --- | --- |
| Run a script once on hundreds of instances selected by tag, a few at a time | Run Command |
| Keep a configuration applied on current and future instances, and correct drift | State Manager association |
| Multi-step workflow that calls AWS APIs (stop, snapshot, create an AMI, wait for approval, restart) | Automation runbook |
| Install OS patches by approval rules and report compliance | Patch Manager |
| Run tasks only inside an agreed weekly window | Maintenance Windows |
| Interactive shell without SSH keys, bastion host or inbound port | Session Manager |
| List installed software and configuration of the fleet | Inventory |
| Turn on recommended settings for many accounts and Regions | Quick Setup |

> **Exam trap.** Systems Manager Change Manager and Incident Manager closed to new customers on November 7, 2025. For a new setup they are never the answer: approvals go in an Automation runbook step (`aws:approve`), incident response in your ticketing or paging tool.

<!-- section: run-command-state-manager | objectives: 3.2.1 -->
## Run Command and State Manager

**Run Command** sends an SSM document of type Command (`AWS-RunShellScript`, `AWS-RunPowerShellScript`, `AWS-ConfigureAWSPackage`, `AWS-UpdateSSMAgent`) to targets chosen by instance ID, tag or resource group. Two rate controls protect the fleet: **concurrency** (a number or a percentage of targets running at once) and **error threshold** (stop sending to new targets after that many failures). The console shows only part of the output: send it to an S3 bucket or CloudWatch Logs for the full text, and to SNS for status notifications.

```bash
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=tag:Environment,Values=Production" \
  --parameters 'commands=["systemctl restart nginx"]' \
  --max-concurrency "10%" \
  --max-errors "2" \
  --output-s3-bucket-name "example-ops-command-output" \
  --cloud-watch-output-config "CloudWatchOutputEnabled=true"
```

**State Manager** keeps a desired state. An **association** binds a document (Command or Automation), targets, parameters and a schedule (cron or rate). It runs when created, then on schedule, and it applies automatically to new instances that match the target tags, so instances launched by an Auto Scaling group receive the same configuration. Typical associations: install and configure the CloudWatch agent with `AWS-ConfigureAWSPackage`, keep SSM Agent current, collect inventory with `AWS-GatherSoftwareInventory`, apply Ansible playbooks. Association compliance appears in the Compliance view.

| Need | Run Command | State Manager |
| --- | --- | --- |
| Execution | Once, on demand | At creation, then on a schedule |
| New instances matching the tags | Not covered | Covered automatically |
| Reports drift as compliance | No | Yes |

> **Exam tip.** "Every instance, including those launched later, must always have the agent configured, with the least operational overhead" is a State Manager association targeting a tag. Run Command alone fixes only today's instances.

<!-- section: automation-runbooks | objectives: 3.2.1 -->
## Automation runbooks

An **Automation runbook** (SSM document of type Automation, schema 0.3) chains steps that call AWS APIs and scripts. AWS provides hundreds (`AWS-RestartEC2Instance`, `AWS-StopEC2Instance`, `AWS-CreateImage`, `AWS-UpdateLinuxAmi`, `AWS-DisablePublicAccessForSecurityGroup`); you write your own in YAML or JSON. Common actions: `aws:executeAwsApi`, `aws:changeInstanceState`, `aws:createImage`, `aws:runCommand` (run a Command document on instances), `aws:executeScript` (Python or PowerShell), `aws:waitForAwsResourceProperty`, `aws:branch` and `aws:approve` (pause until named principals approve).

```yaml
description: Stop an instance, create an AMI, then start the instance again
schemaVersion: '0.3'
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
  AutomationAssumeRole:
    type: String
mainSteps:
  - name: stopInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: stopped
  - name: createImage
    action: aws:createImage
    inputs:
      InstanceId: '{{ InstanceId }}'
      ImageName: 'backup-{{ InstanceId }}-{{ global:DATE_TIME }}'
      NoReboot: true
  - name: startInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: running
```

A runbook runs with the permissions of the user who starts it, or with the **AutomationAssumeRole** passed as a parameter. That role is required when a service starts the runbook for you, and the caller needs `iam:PassRole` on it. Rate control (concurrency, error threshold) applies to runbooks that target many resources, and a central account can run one execution across several accounts and Regions with the `AWS-SystemsManager-AutomationAdministrationRole` and `AWS-SystemsManager-AutomationExecutionRole` roles.

Ways to start a runbook: console or `aws ssm start-automation-execution`, an EventBridge rule target, an AWS Config remediation action, a State Manager association, a maintenance window task. Writing and debugging custom runbooks is detailed with remediation in the monitoring domain.

> **Exam trap.** A runbook started by EventBridge or AWS Config fails with an access error when no AutomationAssumeRole is set or when that role lacks the API permissions of its steps. The fix is the role, not the rule.

<!-- section: patching-sessions | objectives: 3.2.1 -->
## Patching, maintenance windows and Session Manager

**Patch Manager** compares managed nodes with a **patch baseline**: rules that auto-approve patches by classification and severity a number of days after release, plus explicit approved and rejected lists. AWS's predefined baselines are examples; AWS recommends custom baselines for real control. A node is compliant when every patch that the baseline approves and that is available is installed.

| Operation or method | Behavior |
| --- | --- |
| `Scan` | Reports missing patches, installs nothing |
| `Scan and install` | Installs missing approved patches, reboots if needed |
| Patch policy (Quick Setup) | Recommended method; one configuration for the whole organization, chosen OUs, accounts and Regions, or one account-Region pair |
| Maintenance window task | Runs `AWS-RunPatchBaseline` with Run Command on a schedule you control |
| Patch now | On-demand patching from the console |

Patch compliance can be exported as CSV reports to an S3 bucket; compliance is a snapshot of the last successful operation.

**Maintenance Windows** define a schedule (cron or rate, with time zone), a duration in hours and a **cutoff** (no new task starts during the last hours), registered targets and tasks of four types: Run Command, Automation, Lambda and Step Functions. Each task targets nodes of a single account-Region pair.

**Session Manager** opens shell or port-forwarding sessions through SSM Agent: no inbound security group rule, no SSH key, no bastion host. Access is an IAM decision (`ssm:StartSession`, restricted by resource tags), sessions can be encrypted with a KMS key, and session preferences send the full session output to S3 or CloudWatch Logs. CloudTrail records who started and ended a session, not what was typed.

> **Exam trap.** "Auditors need every command typed during interactive sessions" is Session Manager logging to S3 or CloudWatch Logs. CloudTrail alone records `StartSession` and `TerminateSession` only.

<!-- section: eventbridge-automation | objectives: 3.2.2 -->
## Event-driven automation with EventBridge

An event is JSON with `source`, `detail-type` and `detail`. AWS services publish to the **default event bus** of each Region; applications publish to custom buses. A **rule** matches an **event pattern** and sends the event to up to five targets. Arrays in a pattern are OR, fields are AND, and filters such as `prefix`, `numeric`, `anything-but` and `exists` refine the match.

This rule reacts to anyone opening a security group:

```json
{
  "source": ["aws.ec2"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["ec2.amazonaws.com"],
    "eventName": ["AuthorizeSecurityGroupIngress"]
  }
}
```

Events with the detail-type `AWS API Call via CloudTrail` need a CloudTrail trail with logging on. A rule in the default `ENABLED` state matches write management events only; read-only calls need the state `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`.

| Target | Permission EventBridge needs |
| --- | --- |
| Lambda function, SNS topic, SQS queue | Resource-based policy on the target allowing `events.amazonaws.com` |
| Systems Manager Automation, Run Command, Step Functions, ECS task, event bus in another account or Region | IAM role that EventBridge assumes |
| API destination (HTTP endpoint) | Connection with the endpoint's credentials |

Delivery features: an **input transformer** reshapes the event for the target; a failed delivery is retried for 24 hours and up to 185 times by default, then dropped unless the target has a **dead-letter queue** (SQS); an **archive** stores events for **replay**. For time-based automation, AWS recommends **EventBridge Scheduler** (one-time, rate or cron schedules with a time zone); scheduled rules are a legacy feature.

> **Exam trap.** Rules are Regional. Trusted Advisor events arrive only in US East (N. Virginia), so a rule for them created in eu-west-1 never matches. Create the rule where the events are emitted and forward them to another bus if needed.

<!-- section: s3-lambda-events | objectives: 3.2.2 -->
## S3 Event Notifications and Lambda

S3 Event Notifications send bucket events (object created, removed, restored, replicated, lifecycle transition or expiration, tagging, ACL changes) to four destinations: an SNS topic, an SQS standard queue, a Lambda function, or **Amazon EventBridge**. With EventBridge turned on for the bucket, every event goes to the default bus, where rules add richer filters and more targets. Delivery is at least once and usually takes seconds, so consumers must be idempotent. Each configuration can filter on key prefix and suffix; two configurations for the same event type can't have overlapping filters. The destination needs a resource policy that allows `s3.amazonaws.com`, scoped with `aws:SourceArn` to the bucket.

| Requirement | Answer |
| --- | --- |
| Process each `.csv` file uploaded under `incoming/` | Notification on `s3:ObjectCreated:*` with prefix and suffix filters, to Lambda |
| Deliver object events to an SQS FIFO queue | EventBridge (FIFO queues aren't a direct S3 destination) |
| Several independent consumers for the same event | SNS topic fanning out to queues, or EventBridge with several rules |
| Stop development instances at 19:00 local time every weekday | EventBridge Scheduler schedule with a time zone, target `AWS-StopEC2Instance` or the `StopInstances` API |
| Run a fix when AWS Health announces an EC2 scheduled event | EventBridge rule on `aws.health`, target an Automation runbook |

Lambda is the glue for custom logic. Give its execution role only the actions it performs. S3, SNS and EventBridge invoke functions asynchronously: Lambda retries a failed asynchronous invocation twice by default, then sends the event to an on-failure destination or a dead-letter queue if one is configured. Reserved concurrency caps a function so that a burst of events doesn't overload a downstream system.

> **Exam trap.** A function that writes its output to the bucket that triggers it starts a loop. Write to a second bucket, or filter the trigger on an input prefix that the function never writes to.

<!-- section: ai-operations | objectives: 3.2.2 -->
## AWS DevOps Agent and AI-assisted operations

**AWS DevOps Agent** (generally available since March 31, 2026) is an AI agent for incident response. Administrators create **Agent Spaces** that define the AWS accounts, third-party tools and permissions the agent may use. Investigations start automatically from connected alerting sources and tickets (CloudWatch, Datadog, PagerDuty, ServiceNow and others), through **webhooks** for event-driven automation, or manually from the agent's web app. The agent builds an application topology, correlates telemetry, code and deployment history to find the root cause, proposes mitigation steps and, from past incidents, prevention recommendations; it can hand code changes to Kiro as agent-ready instructions.

| Need | Answer |
| --- | --- |
| Same corrective action every time a known condition occurs | Deterministic automation: EventBridge rule or CloudWatch alarm, then Automation runbook or Lambda |
| Find why a service degraded across metrics, logs, traces and recent deployments | AWS DevOps Agent investigation, triggered by the alert |
| Anomaly detection on metrics | CloudWatch anomaly detection |
| AI help to write runbooks or infrastructure code | Kiro |

Review the agent's mitigation plan before applying it; keep least-privilege access in the Agent Space.

> **Exam trap.** Amazon DevOps Guru closed to new customers on October 29, 2026 (end of support September 30, 2027): AWS points to CloudWatch for anomaly detection and to AWS DevOps Agent for investigations. Amazon Q Developer closed to new sign-ups on May 15, 2026, with Kiro as successor. Neither is an answer for a new setup.

<!-- section: key-points -->
## Key points

- Managed node = SSM Agent + permissions (instance profile or DHMC with IMDSv2) + HTTPS path to `ssm`, `ssmmessages`, `ec2messages`.
- Run Command runs once with concurrency and error threshold; State Manager enforces a state on current and future instances.
- Automation runbooks chain API steps; services that start them need an AutomationAssumeRole.
- Patch policies in Quick Setup are the recommended patching method; `Scan` reports, `Scan and install` patches.
- Session Manager: no inbound port or keys; session logs to S3 or CloudWatch Logs for command auditing.
- EventBridge rules match patterns per Region; CloudTrail API events need a trail; retries 24 hours, DLQ, archive and replay; Scheduler for schedules.
- S3 notifications go to SNS, SQS standard, Lambda or EventBridge; use EventBridge for FIFO queues and advanced filtering.
- DevOps Agent investigates alerts; deterministic fixes stay in EventBridge and Systems Manager; DevOps Guru, Change Manager, Incident Manager and Q Developer are closed to new customers.
