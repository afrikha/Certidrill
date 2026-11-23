Before an alarm can fire, the right number must reach CloudWatch with the right name, dimensions and resolution, sent by a principal that is allowed to send it. This chapter covers what to monitor at each layer, the CloudWatch metric model, the IAM roles and policies behind log and metric collection, metric filters that turn log events into metrics, metric streams that push metrics out of CloudWatch, and custom metrics from code and from the CloudWatch agent.

<!-- section: monitoring-approach | objectives: 4.1.1 -->
## How to monitor applications and infrastructure

Monitor every layer, from the user inward, and send everything to one place per account (or to a central monitoring account):

| Layer | Signal | AWS feature |
| --- | --- | --- |
| User experience | Availability and latency seen from outside, real user page loads | **CloudWatch Synthetics** canaries (scripted checks on a schedule, metric `SuccessPercent`), CloudWatch RUM, Internet Monitor |
| Application | Requests, errors, latency (p99), dependencies, service level objectives | **CloudWatch Application Signals**, traces (X-Ray, OpenTelemetry), custom business metrics, application logs |
| Containers and functions | Task, pod, node and function metrics and logs | **Container Insights** (ECS, EKS), **Lambda Insights** |
| Infrastructure | CPU, network, disk, status checks; memory and disk space | Service metrics in `AWS/*` namespaces; the **CloudWatch agent** for in-guest metrics |
| API activity and configuration | Who changed what | CloudTrail, AWS Config |
| Prometheus workloads | PromQL metrics | Amazon Managed Service for Prometheus, Amazon Managed Grafana |

| Requirement | Answer |
| --- | --- |
| Detect that a public endpoint or a login flow is broken before users report it | Synthetics canary on a schedule, with an alarm on `SuccessPercent` |
| Memory, disk space or process count of EC2 instances | CloudWatch agent (never in `AWS/EC2`) |
| One team sees metrics, logs and traces of 40 accounts | CloudWatch cross-account observability: a sink in the monitoring account, links from source accounts, onboarded through AWS Organizations |
| SLOs on latency and availability of microservices without code changes | Application Signals (automatic instrumentation with the CloudWatch agent and AWS Distro for OpenTelemetry) |

> **Exam tip.** Monitoring questions often hide the real gap: the metric doesn't exist yet. If the scenario needs memory, a business count or an error rate from log lines, the answer starts with collection (agent, `PutMetricData`, embedded metric format or a metric filter), then the alarm.

<!-- section: cloudwatch-metrics | objectives: 4.1.2 -->
## CloudWatch metrics: namespaces, dimensions and resolution

| Concept | Facts |
| --- | --- |
| Namespace | Container for metrics, such as `AWS/EC2`, `AWS/ApplicationELB`, `CWAgent` or your own (`AnyCompany/Checkout`). No default: every custom data point names one. Up to 255 characters |
| Metric | Name + namespace + dimensions. Exists only in its Region; can't be deleted, expires after 15 months without new data |
| Dimension | Name/value pair (`InstanceId=i-0abc`), up to **30** per metric. Each combination is a separate metric: CloudWatch doesn't aggregate across dimensions of custom metrics |
| Resolution | **Standard** (1 minute, default and all AWS service metrics) or **high resolution** (1 second, custom metrics only) |
| Period | 1, 5, 10, 30 seconds or a multiple of 60; sub-minute periods only for high-resolution metrics |
| Statistics | `Average`, `Sum`, `Minimum`, `Maximum`, `SampleCount`, percentiles (`p99`), trimmed mean; percentiles need raw values and no negative values |
| Units | `Count`, `Percent`, `Seconds`, `Bytes`...; data points with different units are aggregated separately |

Data retention (rolled up automatically):

| Data point period | Kept for |
| --- | --- |
| Under 60 seconds (high resolution) | 3 hours |
| 60 seconds | 15 days |
| 300 seconds | 63 days |
| 3,600 seconds | 455 days (15 months) |

`PutMetricData` accepts timestamps up to two weeks in the past and two hours in the future.

Service-specific points: EC2 **basic monitoring** sends data every 5 minutes; **detailed monitoring** (charged) every minute, needed for 1-minute alarms and faster scaling. `AWS/EC2` also publishes aggregates by `AutoScalingGroupName`, so one graph covers the group.

To combine metrics, use **metric math** (`100 * errors / requests`, `FILL(m1, 0)`, `SEARCH(...)`) in graphs and alarms, or **Metrics Insights** SQL to query many metrics at once:

```text
SELECT AVG(CPUUtilization) FROM SCHEMA("AWS/EC2", InstanceId)
GROUP BY InstanceId ORDER BY AVG() DESC LIMIT 10
```

> **Exam trap.** An alarm on a custom metric published with dimensions `Service` and `Environment` stays in `INSUFFICIENT_DATA` if it names only `Service`: the dimension set must match exactly.

<!-- section: collection-permissions | objectives: 4.1.5 -->
## IAM roles and permissions for log and metric collection

Every collector writes with an identity. Most "no data arrives" questions are a missing role, a missing resource policy or a missing network path.

| Source | Identity and permissions |
| --- | --- |
| CloudWatch agent on EC2 | Instance profile with `CloudWatchAgentServerPolicy` (plus `AmazonSSMManagedInstanceCore` when managed by Systems Manager). Writing the agent configuration to Parameter Store needs `CloudWatchAgentAdminPolicy`, on one admin instance only |
| CloudWatch agent on premises | Credentials of a role or user with `CloudWatchAgentServerPolicy`, in a named profile of the agent's credentials file |
| Lambda function logs | Execution role with `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` (`AWSLambdaBasicExecutionRole`) |
| ECS `awslogs` log driver | **Task execution role** (`logs:CreateLogStream`, `logs:PutLogEvents`) |
| ECS FireLens (Fluent Bit) to CloudWatch or Firehose | **Task role**, because the log router container makes the calls |
| VPC Flow Logs to CloudWatch Logs | Role trusted by `vpc-flow-logs.amazonaws.com`; to S3, a bucket policy for `delivery.logs.amazonaws.com` |
| CloudTrail to CloudWatch Logs | Role assumed by CloudTrail with `logs:CreateLogStream` and `logs:PutLogEvents` |
| API Gateway REST API execution and access logs | Account-level CloudWatch Logs role ARN (trust `apigateway.amazonaws.com`, `AmazonAPIGatewayPushToCloudWatchLogs`) set once per Region |
| Subscription filter to Kinesis or Firehose | Role trusted by `logs.amazonaws.com` with `kinesis:PutRecord` or `firehose:PutRecord` |
| Subscription filter to Lambda | Resource-based permission on the function for `logs.amazonaws.com` |
| Metric stream to Firehose | Role trusted by `streams.metrics.cloudwatch.amazonaws.com` with `firehose:PutRecord` and `firehose:PutRecordBatch` |
| Application code calling `PutMetricData` | `cloudwatch:PutMetricData` (resource `*`), which can be limited with the `cloudwatch:namespace` condition key |

```json
{
  "Effect": "Allow",
  "Action": "cloudwatch:PutMetricData",
  "Resource": "*",
  "Condition": { "StringEquals": { "cloudwatch:namespace": "AnyCompany/Checkout" } }
}
```

**Network path**: instances in private subnets without a NAT gateway need interface VPC endpoints for CloudWatch Logs (`logs`) and CloudWatch (`monitoring`), plus `ssm` endpoints if the agent configuration comes from Parameter Store.

> **Exam trap.** An ECS task that runs but sends no logs with `awslogs` lacks permissions on the **execution** role; the task role is for the application's own AWS calls (and for FireLens).

<!-- section: metric-filters | objectives: 4.1.7 -->
## Creating metrics from log events with metric filters

A metric filter watches one log group and publishes a CloudWatch metric each time an event matches its pattern.

| Component | Behavior |
| --- | --- |
| Filter pattern | Term, JSON (`{ $.status = 500 }`) or space-delimited (`[ip, user, ..., status=5*, bytes]`) syntax; case sensitive |
| Metric value | `1` to count matches, or a field (`$.latencyMs`) to extract a value |
| Default value | Published for periods with ingested events but no match (`0` avoids gaps); **not allowed when the filter has dimensions** |
| Dimensions | Taken from fields of the event; each new value creates a new metric (and cost) |
| Unit | Set at creation; changing it later has no effect |

Rules: metric filters are **not retroactive** (only events ingested after creation), they work only on log groups of the **Standard** log class, a log group can have up to 100 of them, and delivery is at least once.

```yaml
PaymentErrorsFilter:
  Type: AWS::Logs::MetricFilter
  Properties:
    LogGroupName: /app/checkout
    FilterPattern: '{ $.level = "ERROR" && $.component = "payment" }'
    MetricTransformations:
      - MetricNamespace: AnyCompany/Checkout
        MetricName: PaymentErrors
        MetricValue: "1"
        DefaultValue: 0
        Unit: Count
```

```bash
aws logs put-metric-filter --log-group-name /web/access \
  --filter-name http-5xx \
  --filter-pattern '[ip, id, user, timestamp, request, status_code=5*, size]' \
  --metric-transformations metricName=Http5xx,metricNamespace=AnyCompany/Web,metricValue=1,defaultValue=0
```

> **Exam trap.** "Create a metric from last month's logs" can't be done with a metric filter. Query the history with CloudWatch Logs Insights, and create the filter for the future.

<!-- section: metric-streams | objectives: 4.1.8 -->
## CloudWatch metric streams to Amazon S3 and Amazon Data Firehose

A **metric stream** continuously pushes metric updates out of CloudWatch with low latency, instead of polling `GetMetricData`.

| Setting | Options |
| --- | --- |
| Destination | **Amazon Data Firehose** delivery stream (custom setup: to S3, OpenSearch Service, HTTP endpoints, partners), **quick S3 setup** (CloudWatch creates the Firehose stream and bucket), or **quick partner setup** (Datadog, Dynatrace, Elastic, New Relic, Splunk Observability Cloud, Sumo Logic) |
| Output format | JSON, OpenTelemetry 1.0.0 or 0.7.0; Firehose can transform further (for example to Parquet) |
| Scope | All metrics, or include filters **or** exclude filters by namespace or metric name (not both); new metrics matching the filters are added automatically |
| Statistics | `Minimum`, `Maximum`, `SampleCount`, `Sum` always; additional statistics (percentiles) at extra charge |
| Cross-account | A stream in a cross-account observability monitoring account can include the linked source accounts' metrics |
| IAM | Role trusted by `streams.metrics.cloudwatch.amazonaws.com` that can write to the Firehose stream |

Billing is per metric update streamed plus the Firehose charges. A common pattern: metric stream to Firehose to S3, catalogued with AWS Glue and queried with Athena for long-term capacity analysis beyond 15 months.

```bash
aws cloudwatch put-metric-stream --name all-ec2-to-lake \
  --firehose-arn arn:aws:firehose:eu-west-1:111122223333:deliverystream/metrics-to-s3 \
  --role-arn arn:aws:iam::111122223333:role/metric-stream-firehose \
  --output-format opentelemetry1.0 \
  --include-filters Namespace=AWS/EC2 Namespace=AWS/ApplicationELB
```

> **Exam tip.** "Send all CloudWatch metrics to a third-party observability tool in near real time with the least operational overhead" is a metric stream (partner quick setup or Firehose HTTP endpoint), not a scheduled Lambda that calls `GetMetricData`.

<!-- section: custom-metrics | objectives: 4.1.9 -->
## Collecting custom metrics with the CloudWatch agent and from code

| Method | Use it when |
| --- | --- |
| **CloudWatch agent** | In-guest system metrics (memory, disk, swap, `procstat` per process), StatsD and collectd metrics, Prometheus scraping on ECS and EKS, on EC2 or on premises |
| **Embedded metric format (EMF)** | Code (especially Lambda) writes a structured JSON log line; CloudWatch extracts the metrics asynchronously, with no API call in the request path |
| `PutMetricData` | Low-volume metrics from scripts or code, or high-resolution values (`--storage-resolution 1`) |

Agent configuration extract (metrics part):

```json
{
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": { "InstanceId": "${aws:InstanceId}", "AutoScalingGroupName": "${aws:AutoScalingGroupName}" },
    "aggregation_dimensions": [["AutoScalingGroupName"]],
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"], "metrics_collection_interval": 60 },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] },
      "procstat": [{ "exe": "nginx", "measurement": ["pid_count"] }],
      "statsd": { "service_address": ":8125", "metrics_collection_interval": 10 }
    }
  }
}
```

Fleet rollout: store the file in **Parameter Store**, install the agent with Run Command (`AWS-ConfigureAWSPackage`, package `AmazonCloudWatchAgent`), apply it with `AmazonCloudWatch-ManageAgent` through a **State Manager association** targeting tags, so new Auto Scaling instances are configured automatically. `aggregation_dimensions` adds a group-level metric, so one alarm watches the whole Auto Scaling group.

EMF log line written by a function:

```json
{
  "_aws": {
    "Timestamp": 1764000000000,
    "CloudWatchMetrics": [{
      "Namespace": "AnyCompany/Checkout",
      "Dimensions": [["Service"]],
      "Metrics": [{ "Name": "OrderValue", "Unit": "None" }]
    }]
  },
  "Service": "checkout",
  "OrderValue": 129.5,
  "orderId": "o-7781"
}
```

High-cardinality fields such as `orderId` stay in the log (searchable with Logs Insights) without becoming dimensions. EMF needs a Standard-class log group.

```bash
aws cloudwatch put-metric-data --namespace AnyCompany/Batch \
  --metric-name RecordsRejected --unit Count --value 42 \
  --dimensions Job=nightly-import --storage-resolution 1
```

> **Exam trap.** Custom metrics with a dimension per user, request or order ID create millions of metrics and cost. Keep identifiers in logs (EMF properties) and dimensions for low-cardinality values (service, environment, Auto Scaling group).

<!-- section: key-points -->
## Key points

- Monitor from the outside in: Synthetics and RUM, Application Signals and traces, Container and Lambda Insights, service metrics, the agent for in-guest data.
- A metric is namespace + name + exact dimension set (up to 30), per Region; standard 1-minute or high-resolution 1-second; 3 hours, 15 days, 63 days, 15 months.
- Collection needs an identity: instance profile with `CloudWatchAgentServerPolicy`, ECS execution role for `awslogs`, task role for FireLens, service roles for Flow Logs, CloudTrail, API Gateway and metric streams; VPC endpoints in private subnets.
- Metric filters: new events only, Standard log class only, no default value with dimensions.
- Metric streams: Firehose, quick S3 or partner setup, JSON or OpenTelemetry, include or exclude filters, linked accounts.
- Custom metrics: agent (memory, disk, procstat, StatsD) deployed through Parameter Store and State Manager; EMF from code; `PutMetricData` limited by `cloudwatch:namespace`.
