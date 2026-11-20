Remediation questions start where monitoring ends: a metric crossed a threshold, an event arrived, a resource drifted. Read the right metric to find the cause, then pick the least manual fix that stays fixed: an alarm action, an EventBridge rule, an AWS Config remediation or a Systems Manager Automation runbook, with AI agents to speed up the investigation.

<!-- section: analyze-metrics | objectives: 1.2.1 -->
## Analyzing performance metrics to find the cause

Work from the symptom to the evidence:

| Question to answer | Tool |
| --- | --- |
| Which resource is the outlier among hundreds? | CloudWatch Metrics Insights (SQL-like query across all instances, functions or tables) |
| Which client, IP or key produces most errors or traffic? | Contributor Insights rules on a log group (top-N contributors) |
| Is this value abnormal for this time of day? | Anomaly detection band on the metric, and an alarm on the band |
| What changed just before the problem? | CloudTrail event history or Lake (API calls), AWS Config resource timeline (configuration changes) |
| Is AWS itself having an issue, or is maintenance scheduled? | AWS Health Dashboard (account events; `aws.health` events in EventBridge) |
| What does the application log say? | CloudWatch Logs Insights |

```text
SELECT AVG(CPUUtilization) FROM SCHEMA("AWS/EC2", InstanceId)
GROUP BY InstanceId ORDER BY AVG() DESC LIMIT 10
```

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=ModifyDBInstance \
  --start-time 2026-11-19T08:00:00Z --max-results 20
```

Metrics that point to a known fix:

| Symptom and metric | Likely cause | Remediation |
| --- | --- | --- |
| `StatusCheckFailed_System` = 1 | Problem on the underlying host | Alarm action **recover** (same instance ID, IP addresses and EBS volumes), or stop and start |
| `StatusCheckFailed_Instance` = 1 | OS problem: kernel, network configuration, full disk | Reboot action, then fix the OS (`AWSSupport-ExecuteEC2Rescue`) |
| T instance slow, `CPUCreditBalance` near 0 | Burst credits exhausted | Unlimited mode, or a larger or non-burstable type |
| `HTTPCode_Target_5XX_Count` and `UnHealthyHostCount` rise on an ALB | Targets fail health checks or the application errors | Application logs, health check path; ELB health checks on the Auto Scaling group |
| Lambda `Throttles` above 0 | Concurrency limit reached | Reserved concurrency, account quota increase, fewer retries upstream |
| SQS `ApproximateAgeOfOldestMessage` rising | Consumers too slow or too few | Scale consumers on queue depth per instance |
| DynamoDB `ThrottledRequests` | Provisioned capacity exceeded or hot key | On-demand mode, auto scaling, better key distribution |

> **Exam trap.** A system status check failure is fixed by moving the instance to healthy hardware (recover, or stop and start an EBS-backed instance). Rebooting keeps it on the same host and doesn't help.

<!-- section: automated-remediation | objectives: 1.2.1 -->
## Automated remediation strategies

| Trigger | Remediation path | Choose it when |
| --- | --- | --- |
| Metric alarm | EC2 action (recover, reboot, stop), Auto Scaling policy, Lambda function | The fix is one built-in action |
| Metric alarm | OpsItem or Incident Manager incident, with runbooks attached | People must track or approve the response |
| Alarm or event, through EventBridge | Systems Manager Automation runbook, Lambda, Step Functions | Multi-step fix, AWS API calls, or a target alarms can't call |
| AWS Config rule turns `NON_COMPLIANT` | **Automatic remediation** with an Automation runbook (for example `AWSConfigRemediation-EnforceEC2InstanceIMDSv2`), with retry attempts | Configuration must stay compliant continuously |
| CloudTrail API call event | EventBridge rule to Lambda or a runbook that reverts the change | Undo a forbidden change (a security group opened to `0.0.0.0/0`) |
| AWS Health scheduled change | EventBridge rule to a runbook (for example stop and start before an instance retirement) | Act before AWS maintenance |

```bash
aws cloudwatch put-metric-alarm --alarm-name web01-system-check \
  --namespace AWS/EC2 --metric-name StatusCheckFailed_System \
  --dimensions Name=InstanceId,Value=i-0abc1234def567890 \
  --statistic Maximum --period 60 --evaluation-periods 2 \
  --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:automate:eu-west-1:ec2:recover
```

**AI-assisted investigation and remediation** (in the guide since version 1.1):

- **CloudWatch investigations**: an alarm action can start an investigation when the alarm enters `ALARM`, so the analysis is ready when the on-call engineer opens it.
- **AWS DevOps Agent**: an always-available AI agent that starts investigating when an alert or a support ticket arrives, correlates telemetry, code and deployment data to find the root cause, proposes mitigation steps (including how to validate and revert them) and recommends improvements from past incidents. It works inside **Agent Spaces**: each space defines the AWS accounts (a primary account plus secondary application accounts), the integrations (CloudWatch, Datadog, Dynatrace, New Relic, Splunk, Grafana, GitHub, GitLab, ServiceNow, PagerDuty, Slack, MCP servers) and dedicated IAM roles; the agent can't reach resources outside its space. Operators use its web app; administrators set it up in the console.
- **Kiro**: AWS's agentic development environment (IDE, CLI with a headless mode for CI, web, mobile), successor of Amazon Q Developer. Specs, steering files and hooks guide the agent; MCP servers connect it to external tools. Operators use it to turn a diagnosis into code: a runbook, a Lambda remediation, a template change, or DevOps Agent's agent-ready instructions.

> **Exam trap.** AI agents speed up the diagnosis; they don't replace the detection and the automatic fix. "Restore service automatically within a minute" is still an alarm action or an EventBridge rule with a runbook. Amazon Q Developer (sign-ups closed) and Amazon DevOps Guru (no new customers) aren't valid answers for a new setup.

<!-- section: eventbridge-routing | objectives: 1.2.2 -->
## Routing, enriching and delivering events with EventBridge

AWS services send their events to the account's **default event bus** in each Region. A **rule** on the bus matches events with an **event pattern** and sends them to up to **five targets**. A rule can also run on a schedule, though **EventBridge Scheduler** is the newer service for schedules. Custom applications publish with `PutEvents` to a custom bus: the rule-based one is now called Custom Event Bus - Classic, and the new **Custom Event Bus** lets consumers create **subscribers** (filter, optional transformation, one target each) and retains events so a subscriber can deliver in order, start from the past and pause.

```json
{
  "source": ["aws.health"],
  "detail-type": ["AWS Health Event"],
  "detail": {
    "service": ["EC2"],
    "eventTypeCategory": ["scheduledChange"]
  }
}
```

A pattern matches when every field listed matches (AND); values in one array are alternatives (OR). Matching is exact and case-sensitive unless an operator says otherwise:

| Operator | Example |
| --- | --- |
| Prefix, suffix | `[{ "prefix": "prod-" }]`, `[{ "suffix": ".png" }]` |
| Anything but | `[{ "anything-but": ["running", "pending"] }]` |
| Numeric | `[{ "numeric": [">", 0, "<=", 5] }]` |
| Exists | `[{ "exists": false }]` |
| Case-insensitive | `[{ "equals-ignore-case": "alarm" }]` |
| Wildcard | `[{ "wildcard": "arn:aws:s3:::logs-*" }]` |
| Alternatives on different fields | `"$or": [{ "a": ["x"] }, { "b": ["y"] }]` |

**Targets** include Lambda, SNS, SQS, Step Functions, Systems Manager Automation and Run Command, ECS tasks, Kinesis Data Streams, Data Firehose, CloudWatch Logs, API destinations (HTTPS endpoints) and an event bus in another account or Region. For Lambda, SNS, SQS and CloudWatch Logs, EventBridge can rely on the target's resource-based policy; for the others it assumes an IAM role that trusts `events.amazonaws.com`.

What the target receives:

- the whole matched event (default), part of it (`InputPath`, for example `$.detail`), or constant JSON;
- an **input transformer**: up to 100 variables taken from the event (`InputPathsMap`) inserted into a template (`InputTemplate`); reserved variables include `aws.events.rule-name` and `aws.events.event.json`.

```json
{
  "InputPathsMap": {
    "instance": "$.detail.instance-id",
    "state": "$.detail.state"
  },
  "InputTemplate": "{\"instanceId\": <instance>, \"state\": <state>, \"rule\": <aws.events.rule-name>}"
}
```

**Enrichment** happens in **EventBridge Pipes**, which connect one source (SQS, Kinesis, DynamoDB Streams and other streams) to one target, with optional filtering (you pay only for matching events) and an enrichment step (Lambda, Step Functions Express workflow, API Gateway or an API destination) that adds data before delivery, preserving batch order.

**Delivery elsewhere**: to centralize events, a rule targets the event bus of another account or Region; the receiving bus needs a resource-based policy that allows `events:PutEvents` from the sender (or the whole organization). **Archives** keep events from a bus for a retention period so they can be **replayed** after a fix.

<!-- section: eventbridge-troubleshooting | objectives: 1.2.2 -->
## Troubleshooting event bus rules

Start with the rule's metrics: `TriggeredRules` (the pattern matched), `Invocations`, `FailedInvocations`, and with a dead-letter queue `InvocationsSentToDLQ`.

| Symptom | Cause and fix |
| --- | --- |
| `TriggeredRules` stays at 0 | Pattern doesn't match: test it with `TestEventPattern` or the console sandbox; check exact values, case, ARN format, and that the field exists (CloudTrail events have an empty `resources` field) |
| No "AWS API Call via CloudTrail" events | No CloudTrail trail with logging; read-only calls (`Describe*`, `Get*`, `List*`) also need the rule state `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`; events of global services such as IAM appear in US East (N. Virginia) |
| Rule triggered, Lambda never runs | The function's resource-based policy doesn't allow `events.amazonaws.com` for this rule ARN |
| SNS or SQS target receives nothing | Topic or queue policy missing `events.amazonaws.com`, or the target is encrypted with a key whose policy doesn't allow EventBridge `kms:Decrypt` and `kms:GenerateDataKey` |
| Other targets fail | The IAM role doesn't trust `events.amazonaws.com` or lacks the action (for Automation: `ssm:StartAutomationExecution` plus `iam:PassRole`) |
| Events lost after an outage of the target | The default retry policy (24 hours, up to 185 attempts, exponential backoff with jitter) expired; add a dead-letter queue (standard SQS queue, same Region) |
| Costs explode, target runs endlessly | The target's action emits an event that matches the same rule: narrow the pattern |

```bash
aws events test-event-pattern \
  --event-pattern file://pattern.json --event file://sample-event.json
```

Permission and missing-resource errors aren't retried: those events go straight to the dead-letter queue, with `ERROR_CODE`, `ERROR_MESSAGE`, `RULE_ARN` and `TARGET_ARN` attributes. Configure the retry policy per target with `MaximumRetryAttempts` and `MaximumEventAgeInSeconds`. Targets must be idempotent: a rule can, rarely, invoke a target twice.

> **Exam trap.** A rule on a security group change that "never fires" while CloudTrail shows the call usually lives in the wrong Region or on a custom bus. AWS service events, CloudTrail events included, arrive only on the default bus of the Region where the call was made.

<!-- section: automation-runbooks | objectives: 1.2.3 -->
## Systems Manager Automation runbooks

A **runbook** is an SSM document of type `Automation` (YAML or JSON, `schemaVersion: '0.3'`) with parameters and `mainSteps`. AWS publishes hundreds of predefined runbooks (prefixes `AWS-`, `AWSSupport-`, `AWSConfigRemediation-`); you write custom ones for your procedures.

| Predefined runbook | What it does |
| --- | --- |
| `AWS-RestartEC2Instance`, `AWS-StopEC2Instance`, `AWS-StartEC2Instance` | Change instance state |
| `AWS-ResizeInstance` | Change the instance type (stop, modify, start) |
| `AWS-CreateImage`, `AWS-UpdateLinuxAmi`, `AWS-UpdateWindowsAmi` | Create an AMI; patch a source AMI into a new one |
| `AWS-ASGEnterStandby`, `AWS-ASGExitStandby` | Take an Auto Scaling instance out of service and back |
| `AWSSupport-ExecuteEC2Rescue`, `AWSSupport-TroubleshootSSH`, `AWSSupport-ResetAccess` | Diagnose and repair an unreachable instance |
| `AWSConfigRemediation-EnforceEC2InstanceIMDSv2`, `AWSConfigRemediation-ModifyEBSVolumeType` | Remediations used by AWS Config rules |

Main step actions:

| Action | Use |
| --- | --- |
| `aws:executeAwsApi` | Call any AWS API and read outputs with selectors |
| `aws:executeScript` | Run Python (3.10 to 3.12) or PowerShell 7.4 for up to 600 seconds |
| `aws:runCommand` | Run a Command document (shell, PowerShell) on managed instances |
| `aws:approve` | Wait for approvers, notified through SNS |
| `aws:branch`, `aws:loop` | Conditions and loops |
| `aws:waitForAwsResourceProperty`, `aws:assertAwsResourceProperty` | Wait for or check a resource state |
| `aws:changeInstanceState`, `aws:createImage`, `aws:createStack` | Common operations without writing API calls |
| `aws:invokeLambdaFunction`, `aws:executeStateMachine`, `aws:executeAutomation` | Hand off to Lambda, Step Functions or a child runbook |

Each step can set `onFailure` (`Abort` by default, `Continue` or `step:<name>`), `maxAttempts`, `timeoutSeconds`, `nextStep` and `isEnd`.

```yaml
description: Create an AMI, wait for approval, then stop the instance
schemaVersion: '0.3'
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
  AutomationAssumeRole:
    type: String
    default: ''
mainSteps:
  - name: createImage
    action: aws:createImage
    inputs:
      InstanceId: '{{ InstanceId }}'
      ImageName: 'before-stop-{{ InstanceId }}-{{ global:DATE_TIME }}'
      NoReboot: true
  - name: approve
    action: aws:approve
    inputs:
      Approvers:
        - arn:aws:iam::111122223333:role/OpsLead
      MinRequiredApprovals: 1
      NotificationArn: arn:aws:sns:eu-west-1:111122223333:approvals
  - name: stopInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: stopped
```

A custom script step, when no built-in action fits:

```yaml
  - name: tagVolume
    action: aws:executeScript
    inputs:
      Runtime: python3.11
      Handler: handler
      InputPayload:
        volumeId: '{{ VolumeId }}'
      Script: |-
        import boto3
        def handler(events, context):
            boto3.client('ec2').create_tags(
                Resources=[events['volumeId']],
                Tags=[{'Key': 'reviewed', 'Value': 'false'}])
            return {'tagged': events['volumeId']}
```

`aws:executeScript` doesn't retry throttled API calls for you, and returns at most 100 KB of output.

<!-- section: running-automation | objectives: 1.2.3 -->
## Running runbooks at scale and from code

Ways to start a runbook:

| Start | Typical use |
| --- | --- |
| Console, CLI `start-automation-execution`, SDK `StartAutomationExecution` | On demand, or from your own scripts and tools |
| EventBridge rule target | React to an event or alarm state change |
| AWS Config remediation action | Fix non-compliant resources, manually or automatically |
| State Manager association, maintenance window task | Run on a schedule or keep resources in a state |
| OpsCenter OpsItem, Incident Manager response plan | Operator-run response to an incident |

```text
import boto3
ssm = boto3.client("ssm")
run = ssm.start_automation_execution(
    DocumentName="AWS-RestartEC2Instance",
    Parameters={"InstanceId": ["i-0abc1234def567890"]},
)
print(run["AutomationExecutionId"])
```

**Rate control** runs one runbook on many resources: `--targets` (tags, a resource group, parameter values, or every instance), `--target-parameter-name` (the parameter that receives each target), `--max-concurrency` and `--max-errors` (number or percentage). Adaptive concurrency, when opted in, raises the concurrent automation quota from 100 to up to 500.

```bash
aws ssm start-automation-execution --document-name AWS-RestartEC2Instance \
  --targets Key=tag:Patch,Values=Group1 --target-parameter-name InstanceId \
  --max-concurrency 10% --max-errors 2
```

**Multi-account and multi-Region**: create `AWS-SystemsManager-AutomationAdministrationRole` in the central account and `AWS-SystemsManager-AutomationExecutionRole` in every target account (StackSets is the recommended way), then pass `--target-locations` with accounts or OUs, Regions and their own concurrency and error limits. Targeting OUs requires the management account or a delegated administrator for Systems Manager. Custom runbooks must be shared with the target accounts.

```bash
aws ssm modify-document-permission --name Ops-StopWithApproval \
  --permission-type Share --account-ids-to-add 444455556666
```

**Permissions**: a runbook runs with the role passed in `AutomationAssumeRole`, a service role that trusts `ssm.amazonaws.com` (the `AmazonSSMAutomationRole` managed policy plus what the steps call); the user who starts it needs `iam:PassRole` on that role. Without an assume role, Automation uses the permissions of the user who started it, which fails as soon as an EventBridge rule or a Config remediation starts it.

> **Exam tip.** "Run the same fix on 500 tagged instances, at most 10 % at a time, and stop if more than 5 fail" is rate control on one Automation execution, not a loop in a script. Across accounts, add target locations rather than logging in to each account.

<!-- section: key-points -->
## Key points

- Outliers: Metrics Insights; top contributors: Contributor Insights; recent changes: CloudTrail and AWS Config; AWS-side events: AWS Health.
- System status check failure: recover or stop and start; instance status check failure: reboot and fix the OS.
- Remediate with alarm actions, EventBridge rules, Config automatic remediation and Automation runbooks; DevOps Agent and CloudWatch investigations speed up diagnosis, Kiro turns it into code.
- EventBridge: AWS events on each Region's default bus, exact AND/OR patterns with operators, five targets per rule, input transformers, Pipes for enrichment, cross-account buses with a bus policy.
- Troubleshoot with `TriggeredRules` and `FailedInvocations`, `TestEventPattern`, resource policies, role trust, KMS key policies, a CloudTrail trail, a DLQ after 24 hours of retries.
- Runbooks: `schemaVersion: '0.3'`, steps such as `aws:executeAwsApi`, `aws:executeScript`, `aws:runCommand`, `aws:approve`; run with rate control and target locations under `AutomationAssumeRole`.
