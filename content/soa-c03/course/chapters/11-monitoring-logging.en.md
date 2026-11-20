Monitoring questions check that the right signal exists: is the metric or log collected, does an alarm watch it, can the action reach its target, can the team see every account and Region on one screen. This chapter covers the services that collect metrics, logs and API activity for serverless, compute, container and AI workloads, the CloudWatch agent, alarms and composite alarms, cross-account dashboards and the notifications that reach Amazon SNS.

<!-- section: telemetry-services | objectives: 1.1.1 -->
## CloudWatch, CloudTrail and Managed Service for Prometheus

| Service | What it records | Retention and cost points |
| --- | --- | --- |
| CloudWatch metrics | Time series in namespaces (`AWS/EC2`, `AWS/Lambda`, `CWAgent`, custom ones), each identified by name and dimensions | Data at 1-minute resolution is kept 15 days, 5-minute 63 days, 1-hour 455 days (15 months); custom metrics are billed |
| CloudWatch Logs | Log events in log groups and streams | Logs never expire unless you set a retention period on the log group |
| AWS CloudTrail | API calls: identity, time, source IP, request and response | Event history shows 90 days of management events at no charge; a trail is needed for longer storage, data events and analysis |
| Amazon Managed Service for Prometheus | Prometheus metrics, queried with PromQL | Workspace data replicated across three AZs, kept 150 days by default, configurable up to 1,095 days |

**CloudWatch Logs features** you must place:

- **Metric filter**: a pattern on a log group that counts matches or extracts a value into a metric. It applies only to events ingested after it is created.
- **Subscription filter**: streams matching events in near real time to Kinesis Data Streams, Amazon Data Firehose, Lambda or OpenSearch Service (two per log group).
- **Logs Insights**: an interactive query language over one or more log groups; **Live Tail** streams events as they arrive.
- **Log alarm**: runs a Logs Insights query on a schedule and compares the aggregated result with a threshold, with M-out-of-N evaluation; the alternative to metric filter plus metric alarm.

```text
fields @timestamp, @message
| filter @message like /ERROR/
| stats count(*) as errors by bin(5m)
```

**CloudTrail** trails deliver log files to an S3 bucket, and optionally to a CloudWatch Logs log group (so metric filters and alarms can react to API calls). Management events are logged by default; **data events** (S3 object-level calls, Lambda invocations, DynamoDB item calls) must be selected and are charged. An **organization trail** (management or delegated administrator account) logs every member account. Turn on **log file integrity validation** to prove files weren't altered (`aws cloudtrail validate-logs`). **CloudTrail Insights** flags unusual API call or error rates; **CloudTrail Lake** stores events in event data stores queried with SQL.

**Managed Service for Prometheus** ingests through an AWS managed collector (agentless scraper for Amazon EKS, on EC2 or Fargate nodes, which pushes over a VPC endpoint), an OpenTelemetry collector (ADOT), a self-managed Prometheus server using `remote_write`, or the CloudWatch agent (destination `amp`). Alerting rules run in the workspace and the alert manager sends to an SNS topic. Amazon Managed Grafana visualizes it.

<!-- section: workload-monitoring | objectives: 1.1.1 -->
## Monitoring serverless, compute, container and AI workloads

| Workload | Collected without setup | What you configure |
| --- | --- | --- |
| Lambda | `Invocations`, `Errors`, `Throttles`, `Duration`, `ConcurrentExecutions`; logs in `/aws/lambda/<function-name>` if the execution role can write logs | Log retention, JSON log format, Lambda Insights for system-level metrics, tracing with OpenTelemetry |
| EC2 | CPU, network and instance store disk I/O every 5 minutes (basic monitoring), status checks every minute | Detailed monitoring (1-minute, charged); the CloudWatch agent for memory, disk space, processes and log files |
| ECS and EKS | Cluster and service CPU and memory utilization (ECS) | Container Insights, with enhanced observability, for cluster, node, pod, task and container metrics and logs |
| Amazon Bedrock | `AWS/Bedrock` metrics by `ModelId`: `Invocations`, `InvocationLatency`, `InvocationClientErrors`, `InvocationServerErrors`, `InvocationThrottles`, `InputTokenCount`, `OutputTokenCount`, `TimeToFirstToken` | Model invocation logging (disabled by default) to CloudWatch Logs, S3 or both; CloudTrail for API activity |

Bedrock **model invocation logging** records requests, responses and metadata of `Converse`, `ConverseStream`, `InvokeModel` and `InvokeModelWithResponseStream` calls, to a destination in the same account and Region. CloudWatch Logs delivery uses an IAM role trusting `bedrock.amazonaws.com`; S3 delivery needs a bucket policy for the same principal. Bodies over 100 KB and binary data go to S3 only.

> **Exam trap.** "Track token usage and throttling of a Bedrock model" is the `AWS/Bedrock` metrics, available immediately. "Keep the prompts and responses for audit" needs model invocation logging, which is off until you configure it. CloudTrail records who called the API, not the prompt content.

<!-- section: cloudwatch-agent | objectives: 1.1.2 -->
## The CloudWatch agent on EC2, ECS and EKS

The agent collects system metrics (memory, disk, swap, `procstat` processes, network), StatsD and collectd metrics, log files and traces from EC2 and on-premises servers. Metrics go to the `CWAgent` namespace, are billed as custom metrics and can also go to Managed Service for Prometheus.

Installation with Systems Manager, the usual exam answer:

1. Attach an instance profile with `CloudWatchAgentServerPolicy` (plus the Systems Manager core permissions). Only the instance that writes the configuration to Parameter Store needs the admin role `CloudWatchAgentAdminRole`.
2. Install with Run Command: document `AWS-ConfigureAWSPackage`, action `Install`, name `AmazonCloudWatchAgent`.
3. Create the configuration (wizard or JSON) and store it in **Parameter Store**, so every instance loads the same file.
4. Start it with the `AmazonCloudWatch-ManageAgent` document (action `configure`, source `ssm`, the parameter name), or with a State Manager association to keep new instances configured.

```json
{
  "agent": { "metrics_collection_interval": 60 },
  "metrics": {
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
    },
    "aggregation_dimensions": [["AutoScalingGroupName"]],
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/web/nginx/error",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
```

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c ssm:AmazonCloudWatch-web-config
```

The resulting metrics are `mem_used_percent` and `disk_used_percent`. `aggregation_dimensions` adds a metric per Auto Scaling group, so one alarm can watch the whole group.

**Containers**:

- **Amazon ECS**: turn on Container Insights with the account setting or per cluster. The EC2 container instances need ECS agent 1.29 or later.

```bash
aws ecs put-account-setting --name containerInsights --value enhanced \
  --principal-arn arn:aws:iam::111122223333:root
aws ecs update-cluster-settings --cluster orders \
  --settings name=containerInsights,value=enhanced
```

- **Amazon EKS**: install the **Amazon CloudWatch Observability** add-on. It deploys the CloudWatch agent and Fluent Bit (container logs), and turns on Container Insights with enhanced observability and Application Signals. Give the agent `CloudWatchAgentServerPolicy` through EKS Pod Identity (recommended), IAM roles for service accounts, or the node role.

```bash
aws eks create-addon --cluster-name orders \
  --addon-name amazon-cloudwatch-observability \
  --pod-identity-associations serviceAccount=cloudwatch-agent,roleArn=arn:aws:iam::111122223333:role/cw-agent
```

| Symptom | Likely cause |
| --- | --- |
| No `CWAgent` metrics at all | Instance role lacks `CloudWatchAgentServerPolicy`, agent not started, or no route to the CloudWatch endpoints from a private subnet (add a NAT gateway or interface endpoints) |
| Logs arrive but no memory metric | The `mem` section is missing from the configuration in use |
| New Auto Scaling instances send nothing | Agent installed by hand instead of in the AMI, user data or a State Manager association |

> **Exam trap.** Memory and disk-space utilization are never in `AWS/EC2`. Any question that needs them, including Compute Optimizer memory-based recommendations, needs the CloudWatch agent.

<!-- section: alarms | objectives: 1.1.3 -->
## CloudWatch alarms, composite alarms and their actions

A **metric alarm** watches one metric or a metric math expression (or an anomaly detection band). It is defined by statistic, **period**, threshold, **evaluation periods** and **datapoints to alarm** (3 out of 5 tolerates isolated spikes), and **missing data treatment**: `missing`, `notBreaching`, `breaching` or `ignore`. States are `OK`, `ALARM` and `INSUFFICIENT_DATA`. Actions run on a **state transition** only, except Auto Scaling actions, which repeat every minute while the alarm stays in the state.

| Action | Metric alarm | Composite alarm |
| --- | --- | --- |
| Notify an SNS topic | Yes | Yes |
| Invoke a Lambda function (asynchronously) | Yes | Yes |
| EC2 action: stop, terminate, reboot, recover | Yes, on EC2 metrics | No |
| Auto Scaling or Application Auto Scaling policy | Yes | No |
| Create a Systems Manager OpsItem or Incident Manager incident | Yes (in `ALARM` only) | Yes |
| Start a CloudWatch investigation | Yes | No |

A Lambda action needs a resource-based policy on the function for `lambda.alarms.cloudwatch.amazonaws.com`, restricted with `AWS:SourceAccount` and `AWS:SourceArn`; the function can be in another account.

```bash
aws cloudwatch put-metric-alarm --alarm-name web-mem-high \
  --namespace CWAgent --metric-name mem_used_percent \
  --dimensions Name=AutoScalingGroupName,Value=web-asg \
  --statistic Average --period 300 --evaluation-periods 3 --datapoints-to-alarm 2 \
  --threshold 85 --comparison-operator GreaterThanThreshold \
  --treat-missing-data missing \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:ops-alerts
```

A **composite alarm** evaluates a rule over other alarms with `ALARM()`, `OK()`, `INSUFFICIENT_DATA()`, `AND`, `OR`, `NOT` and `AT_LEAST(M, state, (alarms))`. It reduces noise: one notification when symptoms coincide, none during maintenance. It can watch up to 100 underlying alarms, all in its account and Region (in a cross-account observability monitoring account, they can watch source-account metrics). An **actions suppressor** alarm, with wait and extension periods, silences it while another alarm is in `ALARM`.

```bash
aws cloudwatch put-composite-alarm --alarm-name checkout-degraded \
  --alarm-rule 'AT_LEAST(2, ALARM, (alb-5xx-high, p99-latency-high, db-cpu-high)) AND NOT ALARM(deploy-in-progress)' \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:oncall
```

**Through EventBridge**: every state change emits an event with source `aws.cloudwatch` and detail-type `CloudWatch Alarm State Change`. A rule can then reach targets that alarms can't call directly (Step Functions, Systems Manager Automation, SQS, an event bus in another account).

```json
{
  "source": ["aws.cloudwatch"],
  "detail-type": ["CloudWatch Alarm State Change"],
  "detail": {
    "alarmName": ["web-mem-high"],
    "state": { "value": ["ALARM"] }
  }
}
```

| Symptom | Fix |
| --- | --- |
| Alarm stays in `INSUFFICIENT_DATA` | Wrong namespace or dimensions (agent metrics carry the dimensions you appended), metric not published, or period shorter than the metric's resolution |
| Alarm in `ALARM` but nobody is notified | Email subscription not confirmed, alarm actions disabled, or encrypted topic whose key policy doesn't allow CloudWatch |
| Alarm on a sparse error metric flaps to `INSUFFICIENT_DATA` | Treat missing data as `notBreaching` |
| An EC2 or Auto Scaling action is rejected on a composite alarm | Composite alarms don't support these actions; put them on the metric alarm |

Test the chain with `aws cloudwatch set-alarm-state`, which holds the state only until the next evaluation.

> **Exam tip.** A target tracking scaling policy creates and manages its own alarms. Don't edit or delete them; change the policy instead.

<!-- section: dashboards | objectives: 1.1.4 -->
## Dashboards across accounts and Regions

A CloudWatch dashboard is global: one dashboard can hold widgets from several Regions. Widgets include line, number, gauge and bar graphs, alarm status, text, Logs Insights tables and custom widgets backed by Lambda; variables let one dashboard switch between instances or environments. Dashboards are defined as JSON, so they can be created with `put-dashboard` or CloudFormation (`AWS::CloudWatch::Dashboard`) and reused.

```bash
aws cloudwatch put-dashboard --dashboard-name ops-overview \
  --dashboard-body file://ops-overview.json
```

Two ways to see other accounts:

| Method | How it works | Choose it when |
| --- | --- | --- |
| **CloudWatch cross-account observability** | Each Region of the **monitoring account** has a **sink**; each **source account** creates a **link** to it and chooses the data shared: metrics, log groups, traces, Application Signals services and SLOs, Application Insights applications, Internet Monitor monitors. Onboard through AWS Organizations so new accounts link automatically | Central teams that also need to search logs, query metrics and create alarms on source-account data; no extra charge for logs and metrics |
| **Cross-account cross-Region console** | Sharing accounts let a monitoring account read their CloudWatch data; the console switches account and Region per widget | One dashboard of graphs, alarms and Logs Insights widgets from many accounts and Regions |

Cross-account observability works **within a Region**: set up a sink in each Region you monitor. A monitoring account can link up to 100,000 source accounts; a source account can share with up to five monitoring accounts.

**Sharing a dashboard** with people who have no AWS account:

- Up to **five email addresses** per dashboard; each person sets a password.
- A **public link**: anyone with the link can view.
- An **SSO provider** (SAML through Amazon Cognito): every user of the provider can see every dashboard of the account.

CloudWatch creates Amazon Cognito resources in US East (N. Virginia) and a viewer IAM role allowing `cloudwatch:GetMetricData` and `ec2:DescribeTags` on the whole account; composite alarm, Logs Insights and custom widgets stay hidden until you widen it.

> **Exam trap.** A shared dashboard isn't scoped to its widgets: viewers can query every metric in the account. For partners that may only see one application, use a separate account or share screenshots, not a dashboard of the production account.

<!-- section: sns-notifications | objectives: 1.1.5 -->
## Sending notifications to Amazon SNS

| Source | How it publishes to SNS |
| --- | --- |
| CloudWatch alarms | Alarm action on any state |
| Amazon S3 | Event Notifications (object created, removed, restored...) to a standard topic, not a FIFO topic |
| EC2 Auto Scaling | `put-notification-configuration` for launch, terminate and their errors |
| CloudFormation | Stack event notifications (`--notification-arns`) |
| Amazon RDS | Event subscriptions by source type (instance, snapshot, parameter group) and category (failover, maintenance) |
| AWS Backup, AWS Config, CloudTrail | Vault notifications; delivery channel notifications; log file delivery notifications |
| Everything else (AWS Health, GuardDuty findings, EC2 state changes, deployments) | An EventBridge rule with the topic as target |

```bash
aws autoscaling put-notification-configuration --auto-scaling-group-name web-asg \
  --topic-arn arn:aws:sns:eu-west-1:111122223333:ops-alerts \
  --notification-types autoscaling:EC2_INSTANCE_LAUNCH_ERROR autoscaling:EC2_INSTANCE_TERMINATE
```

The **topic access policy** must allow the service principal to publish, scoped to the source:

```json
{
  "Sid": "AllowS3Publish",
  "Effect": "Allow",
  "Principal": { "Service": "s3.amazonaws.com" },
  "Action": "SNS:Publish",
  "Resource": "arn:aws:sns:eu-west-1:111122223333:uploads",
  "Condition": {
    "ArnLike": { "aws:SourceArn": "arn:aws:s3:::example-uploads" },
    "StringEquals": { "aws:SourceAccount": "111122223333" }
  }
}
```

For a topic encrypted with SSE-KMS, the publishing service must also be allowed `kms:GenerateDataKey*` and `kms:Decrypt` in the **key policy**. The AWS managed key `aws/sns` can't be edited, so use a customer managed key when CloudWatch, S3 or EventBridge publish to an encrypted topic. Subscribers then filter with **subscription filter policies** (one topic, several queues or teams).

> **Exam trap.** "The alarm fires but no email arrives" after encryption was turned on is the key policy, not the topic policy. "The bucket notification can't be saved" is a topic policy that doesn't allow `s3.amazonaws.com`.

<!-- section: key-points -->
## Key points

- Metrics kept 15 months at decreasing resolution; logs never expire by default; CloudTrail event history 90 days, trails for more, data events opt-in.
- Metric filters see new events only; log alarms run scheduled Logs Insights queries; subscription filters stream logs.
- Managed Service for Prometheus: managed EKS collector, `remote_write`, PromQL, alert manager to SNS. Bedrock: `AWS/Bedrock` metrics; invocation logging off by default.
- CloudWatch agent: `CloudWatchAgentServerPolicy`, `AWS-ConfigureAWSPackage`, configuration in Parameter Store, `mem_used_percent` in `CWAgent`; Container Insights for ECS and EKS (CloudWatch Observability add-on).
- Alarms act on transitions; composite alarms only notify, invoke Lambda or open OpsItems and incidents.
- Dashboards are global; cross-account observability is per Region; a shared dashboard exposes all metrics.
- SNS: topic policy for the service principal, customer managed key for encrypted topics, EventBridge for the rest.
