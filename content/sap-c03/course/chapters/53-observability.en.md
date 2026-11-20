Observability questions at the professional level combine several accounts and Regions, containers and serverless, AI workloads and real users. They ask which instrumentation standard to adopt now that the X-Ray SDKs are in maintenance, how a central team sees every account's logs without copying them by hand, how to alert without noise, which metric proves that a model or an agent is healthy, and how to turn a business target into an SLO with burn-rate alarms. This chapter covers each of these, in the order of the exam guide.

<!-- section: standardized-instrumentation | objectives: 5.3.1 -->
## Standardized instrumentation for metrics, logs and traces

The standard is **OpenTelemetry (OTel)**: one vendor-neutral API and SDK per language, one collector, one wire protocol (OTLP). **AWS Distro for OpenTelemetry (ADOT)** is the AWS-supported distribution, with auto-instrumentation agents for Java, Python, .NET and Node.js and a Lambda layer.

| Signal | Collection on AWS | Notes |
| --- | --- | --- |
| Infrastructure metrics | Vended metrics (EC2, ELB, RDS...); CloudWatch agent for memory, disk, processes | Memory and disk usage of EC2 are not vended: they need the agent |
| Application metrics | Embedded metric format (EMF) in structured logs, `PutMetricData`, OTel metrics | EMF turns log lines into metrics with no API call, ideal for Lambda and high-cardinality dimensions |
| Logs | CloudWatch agent, Lambda and ECS log drivers, Fluent Bit | Logs Insights to query; metric filters to derive metrics |
| Traces | ADOT or OTel SDK, then the CloudWatch agent or an OTel Collector with the X-Ray exporter | The X-Ray SDKs and daemon are in maintenance mode since February 25, 2026 (security fixes only) |

Two features build on these traces:

- **Transaction Search** ingests 100 % of spans as structured logs in the `aws/spans` log group (traces of up to 10,000 spans, searchable on any attribute) and indexes a percentage of them as X-Ray trace summaries (1 % is free). It is a prerequisite for AgentCore Observability.
- **CloudWatch Application Signals** auto-instruments services (EKS, ECS, EC2, Lambda) with ADOT and publishes standard metrics per service and operation (latency, faults = 5xx, errors = 4xx), an application map of dependencies, and SLOs. On EKS, it comes with the Amazon CloudWatch Observability add-on.

```json
{
  "agent": { "metrics_collection_interval": 60 },
  "metrics": {
    "namespace": "Orders/Host",
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  },
  "logs": {
    "logs_collected": {
      "files": { "collect_list": [ { "file_path": "/var/log/orders/app.log", "log_group_name": "/orders/app", "log_stream_name": "{instance_id}" } ] }
    }
  },
  "traces": {
    "traces_collected": {
      "otlp": { "grpc_endpoint": "0.0.0.0:4317", "http_endpoint": "0.0.0.0:4318" }
    }
  }
}
```

A single CloudWatch agent (version 1.300025.0 or later) thus collects metrics, logs and OTel traces, which reduces the number of agents to manage.

> **Exam trap.** "Standardize instrumentation across teams and avoid vendor lock-in" points to OpenTelemetry with ADOT, not to adding the X-Ray SDK to every service. And "trace only a sample but still find any single transaction by order ID" points to Transaction Search (all spans stored as logs), not to raising the X-Ray sampling rate to 100 %.

<!-- section: container-monitoring | objectives: 5.3.2 -->
## Monitoring containerized applications

**CloudWatch Container Insights** collects metrics and logs for ECS, EKS (including Fargate for both) and self-managed Kubernetes on EC2. Data is written as performance log events in EMF, from which CloudWatch derives aggregated metrics at cluster, node, service, task and pod level; finer detail is available with Logs Insights queries on those events. It is not on by default.

| Platform | Enable | What enhanced observability adds |
| --- | --- | --- |
| Amazon ECS | Account setting or cluster setting `containerInsights` = `enhanced` (or `enabled` for the original version) | Task-level and container-level metrics, curated dashboards to drill from cluster to container |
| Amazon EKS | Amazon CloudWatch Observability EKS add-on (`amazon-cloudwatch-observability`), which runs the CloudWatch agent and Fluent Bit | Container, pod, node and control plane detail, with observation-based pricing instead of per-metric pricing; can also enable Application Signals |

```bash
aws ecs put-account-setting-default --name containerInsights --value enhanced
aws ecs update-cluster-settings --cluster orders-prod --settings name=containerInsights,value=enhanced
aws eks create-addon --cluster-name payments-prod --addon-name amazon-cloudwatch-observability
```

Other container signals:

- **Logs**: the `awslogs` driver sends ECS container output to CloudWatch Logs; **FireLens** (Fluent Bit sidecar) routes it to CloudWatch, Firehose, S3 or OpenSearch with filtering. On EKS, Fluent Bit runs as a DaemonSet; EKS control plane logs (API server, audit, authenticator, controller manager, scheduler) are enabled per cluster and go to CloudWatch Logs.
- **Traces**: an ADOT collector as a sidecar (ECS) or as a DaemonSet or deployment (EKS) receives OTLP from the application.
- **Prometheus metrics**: for EKS, OTel Container Insights accepts metrics over OTLP and supports PromQL queries.
- **Events**: ECS publishes task and service state changes to EventBridge, including the reason a task stopped, which feeds alerts on crash loops.

> **Exam tip.** "CPU and memory of each container in an ECS task, with the LEAST operational overhead" is Container Insights with enhanced observability, not a self-managed Prometheus server or a custom sidecar that calls `PutMetricData`.

<!-- section: log-aggregation | objectives: 5.3.3 -->
## Multi-account log aggregation and archives

Four mechanisms, often combined:

| Mechanism | Data movement | Scope | Best for |
| --- | --- | --- | --- |
| CloudWatch cross-account observability (Observability Access Manager: sink in the monitoring account, links from source accounts) | None, data is viewed in place | Same Region; up to 100,000 source accounts per monitoring account, five monitoring accounts per source account; metrics, logs, traces, Application Signals services and SLOs | Operations team troubleshooting across accounts, cross-account dashboards and alarms |
| Log centralization rules (management account or delegated administrator, AWS Organizations) | Copy of new log events to one destination account and Region, optional backup Region | Accounts, OUs or the whole organization, several source Regions | A central, cross-Region copy; first copy free, backup copy paid; historical data is not copied |
| Subscription filters to a cross-account destination | Real-time stream of matching events | A destination (in the same Region as the log groups) fronts Kinesis Data Streams or Firehose; account-level filters cover all log groups of an account | Feeding a SIEM, transforming, archiving to S3 through Firehose |
| Export task to S3 | Batch copy | One active export task per account | Occasional exports, not continuous archiving |

A log group accepts up to five subscription filters. The destination's access policy controls who can subscribe; an organization-wide policy uses `aws:PrincipalOrgID`:

```bash
aws logs put-destination --destination-name org-logs \
  --target-arn arn:aws:kinesis:eu-west-1:999988887777:stream/org-logs \
  --role-arn arn:aws:iam::999988887777:role/CWLtoKinesisRole
aws logs put-destination-policy --destination-name org-logs --access-policy file://org-policy.json
```

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "*" },
    "Action": "logs:PutSubscriptionFilter",
    "Resource": "arn:aws:logs:eu-west-1:999988887777:destination:org-logs",
    "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
  }]
}
```

**Centralized archive in S3**, usually in the **Log Archive account** that AWS Control Tower creates (it also receives the organization CloudTrail trail and AWS Config history):

- Firehose buffers, compresses, can convert to Parquet and partition by account or date, and writes to S3 with SSE-KMS.
- S3 Lifecycle moves objects to archival classes: **S3 Glacier Instant Retrieval** (millisecond access, 90-day minimum), **S3 Glacier Flexible Retrieval** (minutes to hours, 90-day minimum), **S3 Glacier Deep Archive** (within 12 hours, 180-day minimum, lowest cost), then expires them at the end of the retention period.
- **S3 Object Lock** in compliance mode makes the archive immutable (WORM), even for the root user, for regulators.
- Athena queries the archive in place. Security logs can also go to **Amazon Security Lake** (OCSF format).

> **Exam trap.** "A central security account must receive every log of every account and Region in near real time, with the LEAST operational overhead" no longer needs a subscription filter per log group and account: use centralization rules (copy) or account-level subscription filters (stream). Cross-account observability alone doesn't satisfy a retention requirement, because the data stays in the source accounts.

<!-- section: alerting | objectives: 5.3.4 -->
## Alerting with CloudWatch alarms, SNS and Systems Manager

An alarm evaluates a metric (or a metric math expression, or a Metrics Insights query over many resources) per period: it goes to `ALARM` when **M of the last N datapoints** breach. Missing data can be treated as `missing`, `notBreaching`, `breaching` or `ignore`. Threshold choices:

- **Static threshold** for known limits (error rate above 1 %, queue age above 300 seconds).
- **Anomaly detection** for seasonal metrics, using a band learned from history.
- **Composite alarms** combine alarms with `AND`, `OR`, `NOT`, so that one page is sent instead of twenty; an **actions suppressor** silences a composite alarm while a parent condition (for example a deployment or a dependency outage) is in `ALARM`.
- **Alarm mute rules** silence actions during scheduled maintenance while evaluation continues; `DisableAlarmActions` stops them until re-enabled.

| Alarm action | Typical use |
| --- | --- |
| Amazon SNS topic | Email, SMS, HTTPS webhook, Lambda or SQS subscribers; fan-out to chat and paging tools |
| AWS Lambda function | Custom automated response |
| EC2 action (stop, terminate, reboot, recover) | Single-instance recovery (standard metric alarms only) |
| Auto Scaling or Application Auto Scaling policy | Scale out or in (not from composite alarms) |
| Systems Manager OpsItem | Operational work item in OpsCenter, with related resources and runbooks |
| Systems Manager Incident Manager incident | Only for existing Incident Manager customers: it closed to new customers on November 7, 2025 |
| CloudWatch investigation | Start an AI-assisted investigation of the alarm |

Every state change is also an EventBridge event (`CloudWatch Alarm State Change`), which can start a Systems Manager Automation runbook, a Step Functions workflow, or be forwarded to a central event bus in another account. With cross-account observability, the monitoring account can alarm on source-account metrics directly.

```bash
aws cloudwatch put-composite-alarm --alarm-name orders-user-impact \
  --alarm-rule "ALARM(orders-5xx-rate) AND ALARM(orders-p99-latency)" \
  --actions-suppressor orders-deployment-in-progress \
  --actions-suppressor-wait-period 120 --actions-suppressor-extension-period 300 \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:orders-oncall
```

> **Exam trap.** A new design that needs incident tracking should not answer with Incident Manager (closed to new customers). Use alarms that create OpsItems and notify through SNS, with Automation runbooks attached.

<!-- section: ai-ml-monitoring | objectives: 5.3.5 -->
## Monitoring AI and ML workloads

| What to watch | Where |
| --- | --- |
| Foundation model latency | `AWS/Bedrock` `InvocationLatency` (milliseconds) and, for streaming chat, `TimeToFirstToken`, per `ModelId` |
| Errors and throttling | `InvocationClientErrors`, `InvocationServerErrors`, `InvocationThrottles`; requests that fail before the model is identified have no `ModelId` dimension, so alarm on the undimensioned metric too |
| Usage and cost drivers | `InputTokenCount`, `OutputTokenCount`, cache read and write token counts, `EstimatedTPMQuotaUsage` against the tokens-per-minute quota |
| Prompts and responses for audit or debugging | Model invocation logging (off by default) to CloudWatch Logs and/or S3, with delivery success and failure metrics |
| Safety controls | `AWS/Bedrock/Guardrails`: `InvocationsIntervened`, latency, by `GuardrailPolicyType` and input or output source |
| Agent performance | AgentCore Observability: sessions, traces and spans of each step, with session count, latency, duration, token usage and error rates in the `bedrock-agentcore` namespace and the CloudWatch GenAI observability page; AgentCore Evaluations online for quality scores |
| Real-time endpoint inference | `AWS/SageMaker` `ModelLatency` and `OverheadLatency` (microseconds), `Invocation4XXErrors`, `Invocation5XXErrors`, `InvocationsPerInstance` (the usual scaling metric), `ModelSetupTime` for serverless endpoints |
| Model drift (predictive ML) | Endpoint data capture to S3, then a scheduled drift job that compares production data and predictions with the training baseline and publishes a custom metric; ground-truth labels joined later give model quality |

AgentCore Observability needs Transaction Search enabled once per account. Agents hosted in AgentCore Runtime are instrumented automatically; agents hosted elsewhere (EKS, ECS, Lambda) use the ADOT SDK or the ADOT Lambda layer and send OTLP to CloudWatch.

SageMaker Model Monitor (data quality, model quality, bias drift, feature attribution drift) is no longer open to new customers; existing users keep it. AWS points new designs to open-source monitoring solutions it publishes (Evidently, MLflow) running in the account, with CloudWatch for system metrics and SNS for alerts.

> **Exam tip.** Rising `InvocationThrottles` with stable traffic is a quota problem (request a higher tokens-per-minute quota, use cross-Region inference or provisioned throughput), not a model-quality problem. A drop in answer quality with normal latency is a job for evaluations, not for latency alarms.

<!-- section: user-experience | objectives: 5.3.6 -->
## Monitoring the user experience: synthetics and RUM

| | CloudWatch Synthetics (synthetic transactions) | CloudWatch RUM (real user monitoring) |
| --- | --- | --- |
| Source of data | Scripted canaries on a schedule | Sessions of real users in browsers and mobile apps |
| Works with no traffic | Yes (nights, before launch) | No |
| Measures | Availability and latency of journeys and APIs, broken links, visual changes | Page load times, Core Web Vitals, JavaScript and HTTP errors, sessions by browser, device and geolocation |
| Setup | Canary (a Lambda function using the Synthetics runtime) with a blueprint or script | App monitor, a code snippet in the application, a session sample rate |
| Key signals | `CloudWatchSynthetics` `SuccessPercent`, `Duration` (with `Location`), `2xx`, `4xx`, `5xx` | Performance and error events; data kept 30 days unless also sent to CloudWatch Logs |

**Synthetics details**: runtimes for Node.js and Python drive Playwright, Puppeteer or Selenium (Chrome only for Selenium); Java canaries have no browser. Blueprints: heartbeat monitoring, API canary, broken link checker, visual monitoring, canary recorder, GUI workflow builder, multi checks. A canary can run once or as often as every minute, inside a VPC to test internal endpoints, and stores screenshots, HAR files and logs in S3. Deploy canaries in several Regions to measure the experience from different geographies; alarm on `SuccessPercent`.

**RUM details**: the web client is authorized through an Amazon Cognito identity pool (or your existing authentication); a session sample rate keeps cost under control. Mobile apps (iOS and Android) use SDKs built on ADOT and report screen load and launch times, crashes, Android ANRs and iOS app hangs.

With **X-Ray active tracing** on canaries and app monitors, both appear on the Application Signals map, linked to the back-end services they call, so a slow page can be followed to the slow dependency.

> **Exam trap.** "Detect that checkout is broken before customers report it, including at 3 a.m. when nobody is shopping" is a Synthetics canary. "Understand which browsers and countries experience slow page loads" is RUM. Each is wrong for the other requirement.

<!-- section: slos | objectives: 5.3.7 -->
## Service-level objectives with Application Signals

An **SLI** is a measured indicator (latency of `POST /orders`, availability of a service), an **SLO** is the target for that indicator over an interval, and an SLA is the contractual promise, usually looser than the SLO. **CloudWatch Application Signals** manages SLOs on its services and operations (`Latency` and `Availability`, where availability = 1 − fault rate, 4xx counted as good), on dependencies, or on any CloudWatch metric or single-series metric math expression.

| Choice | Options |
| --- | --- |
| Calculation | **Period-based**: good periods / total periods (each bad minute spends a full minute of budget). **Request-based**: good requests / total requests (budget follows traffic) |
| Attainment goal | For example 99.9 % |
| Interval | **Rolling** (trailing window, reflects recent experience) or **calendar** (aligned with the month of an SLA) |
| Composite SLO | Availability across 2 to 20 operations (not latency) |
| Exclusion windows | Up to 10 per SLO, one-time or recurring, to exclude planned maintenance |
| Alarms | SLI alarm, warning threshold on remaining error budget, burn rate alarms; editing core settings resets history; alarms aren't deleted with the SLO |

```text
Error budget, period-based: 30 days x 1,440 one-minute periods = 43,200 periods
Goal 99 %  -> budget = 1 % = 432 bad minutes
Burn rate  = error rate in look-back window / (100 % - goal)
Burn rate 1  = budget lasts exactly the interval; above 1 = goal at risk
Threshold to page when 2 % of a 30-day budget burns in 1 hour = 2 % x 720 h / 1 h = 14.4
Multi-window pairs: 1 h with 5 min (2 %), 6 h with 30 min (5 %), 3 days with 6 h (10 %)
Composite rule: ALARM(burn-1h) AND ALARM(burn-5m)
```

The short window stops the alert quickly once the problem is fixed; the long window prevents paging on a short blip. Canaries feed period-based SLOs (each run is a period); RUM app monitors feed request-based SLOs.

> **Exam tip.** "Alert on-call only when the monthly availability target is genuinely at risk, without alert fatigue" means an SLO with multi-window burn-rate alarms combined in a composite alarm, not a static alarm on every 5xx spike.

<!-- section: key-points -->
## Key points

- Instrument with OpenTelemetry (ADOT); the CloudWatch agent collects metrics, logs and OTLP traces; X-Ray SDKs and daemon are in maintenance mode.
- Transaction Search stores all spans in `aws/spans`; Application Signals gives service metrics, an application map and SLOs.
- Container Insights must be enabled; enhanced observability adds task and container detail on ECS and the EKS add-on for EKS.
- Cross-account observability views data in place (one Region); centralization rules copy logs across accounts and Regions; subscription filters stream to Kinesis or Firehose; archive in the Log Archive account with Glacier classes and Object Lock.
- Alarms: M of N datapoints, missing-data treatment, anomaly detection, composite alarms with suppressors; OpsItems and SNS rather than Incident Manager for new designs.
- AI metrics: Bedrock latency, time to first token, throttles and tokens; guardrail interventions; AgentCore Observability for agents; SageMaker `ModelLatency`; drift through data capture and custom metrics.
- Synthetics for proactive journeys, RUM for real users; SLOs with error budgets and burn-rate alarms.
