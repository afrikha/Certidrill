Monitoring becomes automation when every signal has a consumer: an S3 object triggers a function, an API call matching an EventBridge pattern pages a team, a log line becomes a metric whose alarm acts, an agent reports what the hypervisor can't see, and AWS Config fixes a noncompliant resource. The exam rewards the managed, asynchronous path with the right permissions on the target.

<!-- section: event-driven-patterns | objectives: 4.3.1 -->
## Event-driven, asynchronous design patterns

| Producer | Native destinations | Notes |
| --- | --- | --- |
| S3 Event Notifications | SNS standard topic, SQS standard queue, Lambda, EventBridge | Destination in the same Region as the bucket; one destination type per notification configuration |
| EventBridge rule | Up to five targets per rule: Lambda, SNS, SQS, Step Functions, Kinesis, Systems Manager Automation, another event bus, API destinations... | Pattern matching on any field, input transformation, archive and replay |
| CloudWatch alarm | SNS, Lambda, EC2 and Auto Scaling actions, Systems Manager OpsItems | Fires on state transitions (see below) |
| SNS topic | SQS, Lambda, HTTP(S), email, SMS, Firehose | Fan-out to many subscribers, with filter policies |

Choosing between S3 notifications and EventBridge:

- **S3 notifications directly**: simplest for one consumer filtered by prefix and suffix.
- **Enable EventBridge on the bucket** when you need several consumers for the same event type, filtering on object size or other fields, a target that S3 can't call (Step Functions, an SQS **FIFO** queue, another account's bus), or archive and replay. Once enabled, all the bucket's events go to EventBridge.

S3 notifications are delivered at least once and can arrive out of order: make processing idempotent (for example a conditional DynamoDB write on the object key and version).

**Lambda asynchronous invocation** (S3, SNS, EventBridge and alarms invoke Lambda this way): Lambda queues the event, retries failed runs up to **two** more times by default (configurable 0–2), and keeps the event for up to 6 hours (maximum event age). Configure an **on-failure destination** (SQS, SNS, Lambda, EventBridge) or a dead-letter queue to keep what fails; on-success destinations chain the next step without code.

> **Exam trap.** A Lambda function triggered by `s3:ObjectCreated:*` that writes its output to the same bucket triggers itself in a loop. Write to a second bucket, or limit the notification to an input prefix and write elsewhere.

<!-- section: s3-log-processing | objectives: 4.3.7 -->
## Processing log files delivered to S3

ALB and CloudFront access logs, VPC Flow Logs, CloudTrail and S3 server access logs arrive in S3 as files. The classic pipeline:

1. The log file lands in the bucket under a known prefix (`AWSLogs/111122223333/elasticloadbalancing/`).
2. An S3 event notification (or EventBridge rule on `Object Created`) invokes a Lambda function, or posts to an SQS queue consumed by Lambda for buffering and retries.
3. The function reads the object (gunzip if compressed), parses each line and sends the records on.

| Destination | How the function delivers | Permissions on the function's execution role |
| --- | --- | --- |
| CloudWatch Logs | `PutLogEvents` to a log group and stream, after which metric filters, alarms and Logs Insights apply | `logs:CreateLogStream`, `logs:PutLogEvents`, plus `s3:GetObject` on the source |
| OpenSearch Service | Signed bulk requests to the domain (`_bulk`), domain access policy or fine-grained access control mapping the role | `es:ESHttpPost` and `es:ESHttpPut`, plus `s3:GetObject` |
| Another bucket or account | `PutObject`, or rely on S3 Replication instead of code | Bucket policy on the destination, KMS key policy if SSE-KMS |

Without custom code, **Amazon OpenSearch Ingestion** pipelines can use an S3 source driven by SQS notifications to parse and index new log files. When the logs originate in CloudWatch Logs instead, don't export to S3 first: use a subscription filter (chapter 44).

Operational details the exam checks:

- An SQS queue between S3 and Lambda absorbs bursts, adds a dead-letter queue and allows reprocessing. The queue policy must allow `s3.amazonaws.com` with `aws:SourceArn` set to the bucket.
- A bucket encrypted with SSE-KMS: the function's role needs `kms:Decrypt` on the key.

> **Exam tip.** S3 must be allowed to invoke the function: the console adds the function's resource-based policy; in CloudFormation, declare an `AWS::Lambda::Permission` with principal `s3.amazonaws.com` and `SourceArn` of the bucket, or the notification configuration fails validation.

<!-- section: eventbridge-notifications | objectives: 4.3.8 -->
## EventBridge rules that notify on an event pattern

A rule on an event bus matches events with a JSON **event pattern**: every field listed must match, arrays mean "any of these values", fields not listed are ignored. AWS service events arrive on the **default** bus.

```json
{
  "source": ["aws.ec2"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["ec2.amazonaws.com"],
    "eventName": ["AuthorizeSecurityGroupIngress"],
    "requestParameters": {
      "ipPermissions": {
        "items": {
          "ipRanges": { "items": { "cidrIp": ["0.0.0.0/0"] } }
        }
      }
    }
  }
}
```

Content-filtering operators: `prefix`, `suffix`, `equals-ignore-case`, `wildcard`, `anything-but` (also with prefix, suffix or wildcard), `numeric` ranges, `cidr` for IP addresses, `exists`, and `$or` across fields.

```json
{
  "source": ["aws.codepipeline"],
  "detail-type": ["CodePipeline Pipeline Execution State Change"],
  "detail": {
    "state": ["FAILED"],
    "pipeline": [{ "prefix": "prod-" }]
  }
}
```

Delivering the notification:

| Requirement | Configuration |
| --- | --- |
| Readable email or chat message instead of raw JSON | **Input transformer**: `InputPathsMap` extracts fields, `InputTemplate` builds the message |
| SNS topic as target | Topic policy allows `events.amazonaws.com` to `sns:Publish` (the console adds it). If the topic uses SSE-KMS, the **customer managed key** policy must allow `events.amazonaws.com` `kms:GenerateDataKey` and `kms:Decrypt` |
| Third-party webhook (chat, ticketing tool) | **API destination**: an HTTPS endpoint with a connection that stores the authorization (API key, OAuth, basic), rate-limited, no Lambda to maintain |
| Target temporarily unavailable | Retry policy (default: 24 hours, up to 185 attempts) and an SQS dead-letter queue on the target |
| Notify about events from all accounts | Each account forwards to a central bus (chapter 51); the rule and the topic live in the central account |

> **Exam trap.** Notifications that never arrive although the rule shows matches usually mean the target can't be reached: a missing SNS topic policy, or a topic encrypted with the AWS managed key `aws/sns`, whose key policy can't be edited to allow EventBridge or CloudWatch. Use a customer managed key.

<!-- section: custom-metrics-filters | objectives: 4.3.6 -->
## Custom metrics, metric filters, alarms and notifications

Three ways to create a custom metric:

| Method | Use it when |
| --- | --- |
| `PutMetricData` (CLI, SDK) | A script or application publishes a value (queue backlog per instance, business KPI). `--storage-resolution 1` makes it high resolution (1-second) |
| Embedded Metric Format (EMF) | The application already writes JSON logs: a log line with an `_aws` metadata block becomes a metric with no API call in the request path |
| **Metric filter** on a log group | The value is in existing logs and the application can't change; count matches or extract a number |

```bash
aws logs put-metric-filter \
  --log-group-name CloudTrail/org-trail \
  --filter-name root-usage \
  --filter-pattern '{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }' \
  --metric-transformations metricName=RootAccountUsage,metricNamespace=Security,metricValue=1,defaultValue=0

aws cloudwatch put-metric-alarm --alarm-name root-usage \
  --namespace Security --metric-name RootAccountUsage \
  --statistic Sum --period 300 --evaluation-periods 1 \
  --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions arn:aws:sns:us-east-1:111122223333:security-alerts
```

Metric filter rules: patterns are terms (`ERROR`), space-delimited fields or JSON selectors (`{ $.latency > 500 }`); the metric value can be a constant or a field (`$.latency`); a filter only applies to events ingested **after** it is created; dimensions can be extracted from JSON or space-delimited fields, but a filter with dimensions can't set a default value.

Alarm settings that change behaviour: period, evaluation periods and **datapoints to alarm** (M out of N), `treatMissingData` (`missing`, `notBreaching`, `breaching`, `ignore`), and a high-resolution alarm period of 10 or 30 seconds on high-resolution metrics.

> **Exam trap.** A metric filter created today doesn't count yesterday's errors. To analyze the past, query the log group with Logs Insights; the filter is for what happens from now on.

<!-- section: alarm-actions | objectives: 4.3.3 -->
## Alarm notifications and automatic actions

| Action | Typical use | Requirement |
| --- | --- | --- |
| SNS topic | Email, SMS, chat, HTTP endpoints, fan-out to queues | Topic policy and, with SSE-KMS, a customer managed key allowing `cloudwatch.amazonaws.com` |
| Lambda function | Custom automation directly from the alarm, same or another account | Resource policy on the function for `lambda.alarms.cloudwatch.amazonaws.com`, scoped with `AWS:SourceAccount` or `AWS:SourceArn`; invoked asynchronously |
| EC2 action | Stop, terminate, reboot or **recover** the instance | Alarm on a metric of that EC2 instance |
| Auto Scaling action | Step or simple scaling policy of an Auto Scaling group or an Application Auto Scaling target | Not available on composite alarms |
| Systems Manager | Create an OpsItem in OpsCenter | Runs on the transition into `ALARM` |

Actions run on state **transitions** (`--alarm-actions`, `--ok-actions`, `--insufficient-data-actions`), not repeatedly while the alarm stays in `ALARM`. A **composite alarm** combines alarms with `AND`, `OR`, `NOT` to cut noise and can suppress its actions while another alarm (a maintenance or parent alarm) is in `ALARM`.

**EC2 automatic recovery** reacts to a failed **system** status check (`StatusCheckFailed_System`) by moving the instance to healthy hardware. It keeps the instance ID, private, public and Elastic IP addresses, instance metadata, placement group and EBS volumes; RAM content is lost. **Simplified automatic recovery** is on by default for supported instance types without instance store volumes; a CloudWatch alarm with the recover action (`arn:aws:automate:region:ec2:recover`) adds custom notifications and covers some types simplified recovery doesn't, such as metal sizes.

> **Exam trap.** Recovery and reboot solve different failures. A failed **instance** status check (OS, kernel, full disk) doesn't trigger recovery: use a reboot action, then fix the OS. Recovery applies to individual instances; for a fleet, an Auto Scaling group replacing unhealthy instances is the resilient design.

<!-- section: agents-ec2 | objectives: 4.3.9 -->
## Installing and configuring agents on EC2 instances

**SSM Agent** comes preinstalled on many AWS-provided AMIs (Amazon Linux 2 and 2023, Windows Server, some Ubuntu releases). It only makes the instance *managed* when it can reach Systems Manager with permissions:

| Option | Details |
| --- | --- |
| Instance profile | Role with `AmazonSSMManagedInstanceCore` attached to each instance |
| **Default Host Management Configuration** | One setting per account and Region: Systems Manager uses the role `AWSSystemsManagerDefaultEC2InstanceManagementRole` (policy `AmazonSSMManagedEC2InstanceDefaultPolicy`) for every instance. Requires IMDSv2 and SSM Agent 3.2.582.0 or later |
| On-premises and other clouds | Hybrid activation (activation code and ID), then managed nodes with an `mi-` ID |

Private subnets need a route to Systems Manager: a NAT gateway, or interface VPC endpoints for `ssm` and `ssmmessages` (plus `ec2messages` for older agent versions).

**CloudWatch agent** collects what EC2 doesn't publish by itself: memory, disk space, per-process metrics (`procstat`), StatsD and collectd metrics, and log files. Fleet installation with Systems Manager:

1. Attach `CloudWatchAgentServerPolicy` (with `AmazonSSMManagedInstanceCore`) to the instance role.
2. Install with Run Command `AWS-ConfigureAWSPackage`, package `AmazonCloudWatchAgent`, or a State Manager association that keeps it installed on new instances matched by tag.
3. Store the JSON configuration in Parameter Store (by convention `AmazonCloudWatch-linux`); saving it from the wizard requires `CloudWatchAgentAdminPolicy`.
4. Apply it with Run Command `AmazonCloudWatch-ManageAgent`, action `configure`, source `ssm`, or on the instance:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -c ssm:AmazonCloudWatch-linux -s
```

```json
{
  "metrics": {
    "append_dimensions": { "AutoScalingGroupName": "${aws:AutoScalingGroupName}" },
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          { "file_path": "/var/log/app/app.log", "log_group_name": "/app/web", "retention_in_days": 30 }
        ]
      }
    }
  }
}
```

> **Exam trap.** Memory and disk space are not in the `AWS/EC2` namespace; no alarm can watch them until the CloudWatch agent publishes them (namespace `CWAgent` by default). Configuration changes on hundreds of instances: update the Parameter Store parameter and re-run the `configure` action through State Manager or Run Command, not SSH.

<!-- section: config-remediation | objectives: 4.3.10 -->
## Configuring AWS Config rules to remediate issues

A remediation action attaches a **Systems Manager Automation runbook** (target type `SSM_DOCUMENT`) to a Config rule, AWS managed (`AWS-DisablePublicAccessForSecurityGroup`, `AWSConfigRemediation-ConfigureS3BucketPublicAccessBlock`, `AWS-PublishSNSNotification`) or your own.

| Setting | Meaning |
| --- | --- |
| Manual vs automatic | Manual: an operator chooses **Remediate** on noncompliant resources. Automatic: Config runs the runbook when a resource becomes noncompliant |
| Resource ID parameter | The runbook parameter replaced at run time by the noncompliant resource's ID |
| `AutomationAssumeRole` | The role the runbook assumes to fix the resource; the caller needs `iam:PassRole` |
| `MaximumAutomaticAttempts` / `RetryAttemptSeconds` | Default 5 attempts within 60 seconds (1–25 attempts); after that, a remediation exception is added to stop endless loops |

```yaml
Resources:
  PublicReadRemediation:
    Type: AWS::Config::RemediationConfiguration
    Properties:
      ConfigRuleName: s3-bucket-public-read-prohibited
      TargetType: SSM_DOCUMENT
      TargetId: AWSConfigRemediation-ConfigureS3BucketPublicAccessBlock
      Automatic: true
      MaximumAutomaticAttempts: 5
      RetryAttemptSeconds: 60
      Parameters:
        BucketName:
          ResourceValue:
            Value: RESOURCE_ID
        AutomationAssumeRole:
          StaticValue:
            Values:
              - arn:aws:iam::111122223333:role/ConfigRemediationRole
```

Service-linked rules can't have remediation. To roll a rule and its remediation out to every account, use an organization conformance pack or CloudFormation StackSets. Track runs with `describe-remediation-execution-status`.

> **Exam trap.** A remediation that "doesn't run" is often a role problem: no `AutomationAssumeRole`, a role that doesn't trust `ssm.amazonaws.com`, or a role without the permissions the runbook needs. Writing a Lambda function triggered by EventBridge on compliance changes works, but a Config remediation with a managed runbook is the least operational overhead answer.

<!-- section: key-points -->
## Key points

- S3 notifications for one consumer; EventBridge on the bucket for several consumers, FIFO queues or Step Functions. Idempotent consumers, no recursive writes.
- Lambda async: two retries by default, 6-hour maximum event age, on-failure destination.
- S3 log files: event (or SQS buffer) → Lambda → `PutLogEvents` or OpenSearch `_bulk`; OpenSearch Ingestion without code.
- EventBridge: input transformer, SNS topic policy, customer managed KMS key, retry policy and DLQ.
- Custom metrics: `PutMetricData`, EMF, metric filters (not retroactive).
- Alarm actions: SNS, Lambda (resource policy), EC2 recover on system check, Auto Scaling, OpsItems.
- Agents: SSM Agent with instance profile or Default Host Management Configuration; CloudWatch agent through Systems Manager and Parameter Store.
- Config remediation: Automation runbook, automatic with retries, `AutomationAssumeRole`, conformance packs for every account.
