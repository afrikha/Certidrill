Observability questions ask what the code or the configuration should emit so that problems can be found later: structured logs with the right level and no secrets, custom metrics published the cheapest way, alarms and event rules that notify the team, traces that follow a request across services, and health checks that remove a broken target before users notice.

<!-- section: structured-logging | objectives: 4.2.1 -->
## Structured logging of application events and user actions

Write logs as **JSON objects**, one per event, with consistent keys: timestamp, level, message, service, a **correlation ID** (request ID, trace ID, order ID) and the business context (user action, entity ID). JSON keys are discovered automatically by CloudWatch Logs Insights and can be filtered and aggregated; free text must be parsed first.

```json
{
  "timestamp": "2026-11-20T09:15:02.118Z",
  "level": "INFO",
  "message": "order placed",
  "service": "checkout",
  "requestId": "79b4f56e-95b1-4643-9700-2807f4e68189",
  "xrayTraceId": "1-6736a1b2-0f3c5d7e9a1b2c3d4e5f6a7b",
  "userAction": "PlaceOrder",
  "orderId": "o-1234",
  "amount": 59.9
}
```

**Lambda advanced logging controls** remove most of the code:

| Setting | Values and behavior |
| --- | --- |
| Log format | `Text` (the default) or `JSON`; with JSON, Lambda writes its system logs and the application logs of supported runtimes (Python, Node.js, Java, .NET) as JSON with `timestamp`, `level`, `message` and the request ID, without code changes |
| Application log level | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`: lower levels are not sent to CloudWatch Logs |
| System log level | `DEBUG`, `INFO`, `WARN` for the platform events (start, end, report) |
| Log group | A custom log group instead of `/aws/lambda/<function-name>`, for example shared by the functions of one application |

When you switch to JSON without choosing levels, both levels default to `INFO`.

```yaml
  CheckoutFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: src/
      LoggingConfig:
        LogFormat: JSON
        ApplicationLogLevel: INFO
        SystemLogLevel: WARN
        LogGroup: /checkout/functions
```

**Powertools for AWS Lambda** (Python, TypeScript, Java, .NET) adds a Logger that writes structured JSON with the Lambda context and a correlation ID taken from the event.

Other practices the exam expects:

- Set a **retention period** on each log group (`aws logs put-retention-policy`); by default logs never expire and keep costing.
- On containers, send stdout and stderr to CloudWatch Logs with the `awslogs` log driver (ECS) or a log agent; on EC2, use the CloudWatch agent.
- **Never log secrets, tokens or full payloads with personal data.** As a safety net, a CloudWatch Logs **data protection policy** detects sensitive data (credentials, financial data, PII, PHI, device identifiers) with managed or custom data identifiers and **masks it at ingestion**, at every egress point (console, Logs Insights, metric and subscription filters). Only principals with `logs:Unmask` see the original. A policy can be set on one log group or on the whole account; findings produce the `LogEventsWithFindings` metric in the `AWS/Logs` namespace.

> **Exam trap.** A data protection policy masks only events ingested after it is created, and it doesn't stop the application from sending the data. "Ensure credit card numbers already written by the function are never visible to support engineers" needs the policy and code that stops logging them, plus handling of the existing events.

<!-- section: custom-metrics | objectives: 4.2.2 -->
## Implementing code that emits custom metrics

A custom metric belongs to a **namespace** you choose (not starting with `AWS/`), has a name, an optional **unit** and up to **30 dimensions** (name-value pairs). Each unique combination of dimension values is a separate metric that is billed: never use a high-cardinality value such as a user ID or request ID as a dimension.

| Method | How | Choose it when |
| --- | --- | --- |
| `PutMetricData` API | The SDK or CLI calls CloudWatch directly; values or statistic sets; standard (60 s) or high resolution (1 s) | Code outside Lambda, low call volume, the metric must exist immediately |
| **Embedded metric format** (EMF) | The code writes a JSON log line with an `_aws` block; CloudWatch extracts the metrics asynchronously | Lambda and containers: no extra API call, no added latency, the log keeps the high-cardinality context |
| **Metric filter** | A pattern on an existing log group counts or extracts values | No code change is allowed |
| CloudWatch agent (StatsD, collectd) | The agent on EC2 or on premises publishes system and application metrics | Memory and disk metrics of instances, existing StatsD code |
| OpenTelemetry metrics | An OpenTelemetry SDK exports metrics to CloudWatch | New instrumentation (AWS recommends OpenTelemetry for new implementations) |

```json
{
  "_aws": {
    "Timestamp": 1763630102118,
    "CloudWatchMetrics": [
      {
        "Namespace": "AnyCompany/Checkout",
        "Dimensions": [["Service", "PaymentMethod"]],
        "Metrics": [
          { "Name": "OrderValue", "Unit": "None" },
          { "Name": "PaymentLatency", "Unit": "Milliseconds", "StorageResolution": 1 }
        ]
      }
    ]
  },
  "Service": "checkout",
  "PaymentMethod": "card",
  "OrderValue": 59.9,
  "PaymentLatency": 182,
  "orderId": "o-1234"
}
```

EMF limits: up to 100 metric definitions per log event, up to 30 dimension keys per dimension set, timestamp no more than 14 days in the past or 2 hours in the future. Powertools Metrics writes EMF for you.

```bash
aws cloudwatch put-metric-data --namespace AnyCompany/Checkout \
  --metric-name OrdersPlaced --unit Count --value 1 \
  --dimensions Service=checkout,Environment=prod
aws cloudwatch put-metric-data --namespace AnyCompany/Checkout \
  --metric-name PageLoadTime --unit Milliseconds \
  --statistic-values Sum=3120,Minimum=180,Maximum=1430,SampleCount=6
```

- **High resolution** (1 second) can be read with periods of 1, 5, 10, 30 or 60 seconds and alarmed on with 10- or 30-second periods, at a higher cost.
- A **statistic set** sends Sum, Minimum, Maximum and SampleCount in one call, but percentiles are then unavailable.
- Every `PutMetricData` call is charged: batch values rather than one call per event.

> **Exam tip.** "Publish business metrics from a Lambda function without adding latency or API calls" means the embedded metric format. "Create a metric from an existing log without changing the code" means a metric filter.

<!-- section: notification-alerts | objectives: 4.2.3 -->
## Notification alerts for quotas, deployments and other actions

A **CloudWatch alarm** watches one metric (or a metric math expression) and changes state among `OK`, `ALARM` and `INSUFFICIENT_DATA`. Its settings: statistic and **period**, threshold and comparison, **evaluation periods** and **datapoints to alarm** ("3 out of 5" ignores a single spike), and **missing data treatment** (`missing`, `notBreaching`, `breaching`, `ignore`). Actions: publish to an **Amazon SNS** topic (email, SMS, Lambda, HTTPS, SQS), scale an Auto Scaling group, stop or recover an instance. A **composite alarm** combines alarms with AND/OR so that one incident sends one notification.

```bash
aws cloudwatch put-metric-alarm --alarm-name checkout-errors \
  --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value=checkout \
  --statistic Sum --period 60 --evaluation-periods 5 --datapoints-to-alarm 3 \
  --threshold 5 --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:oncall
```

| Event to notify | Mechanism |
| --- | --- |
| Usage approaches a service quota (Lambda concurrency, API rate) | A CloudWatch alarm created from the Service Quotas console on the quota's usage metric, notifying an SNS topic |
| A deployment completes or fails | An **EventBridge rule** on the CodeDeploy deployment state-change event, the CodePipeline execution state-change event or the CloudFormation stack status event, targeting SNS, Lambda or a chat webhook |
| A specific API call is made (a key is scheduled for deletion, a bucket policy changes) | EventBridge rule on the CloudTrail event "AWS API Call via CloudTrail" |
| An error message appears in logs | Metric filter + alarm |

```json
{
  "source": ["aws.codedeploy"],
  "detail-type": ["CodeDeploy Deployment State-change Notification"],
  "detail": {
    "state": ["SUCCESS", "FAILURE"],
    "application": ["checkout"]
  }
}
```

> **Exam trap.** An alarm notifies only on a **state change**. A metric that stays above the threshold sends one notification, not one per period; and a metric with no data stays in `INSUFFICIENT_DATA` unless missing data is treated as breaching or not breaching.

<!-- section: tracing | objectives: 4.2.4 -->
## Implementing tracing with AWS X-Ray and OpenTelemetry

A trace follows one request through API Gateway, Lambda, containers and downstream calls. The trace ID travels in the `X-Amzn-Trace-Id` header (or the W3C `traceparent` header with OpenTelemetry). Each service adds a segment, each downstream call a subsegment; add **annotations** for the values you will filter on (customer tier, order type) and **metadata** for the rest.

**Sampling** keeps costs down: the default rule records the first request each second (the reservoir) and 5 percent of additional requests. Custom rules match on service, host, method or URL path, with a priority from 1 to 9999 (lowest evaluated first). The decision is made at the first instrumented service and followed downstream.

Turning tracing on:

| Component | How |
| --- | --- |
| Lambda | **Active tracing** (`Tracing: Active` in SAM, `TracingConfig` in CloudFormation); the execution role needs permission to send traces (`AWSXRayDaemonWriteAccess`) |
| API Gateway REST API | Enable X-Ray tracing on the stage |
| Application code (calls to DynamoDB, HTTP, SQL) | An **OpenTelemetry** SDK or the **AWS Distro for OpenTelemetry** (ADOT); in Lambda, the AWS Lambda Layer for OpenTelemetry or the AWS managed ADOT layer |
| Collection on EC2, ECS, EKS | The **CloudWatch agent** (it collects OpenTelemetry traces) or an **OpenTelemetry Collector** with the X-Ray exporter, as an agent or a sidecar |

```yaml
Globals:
  Function:
    Tracing: Active
  Api:
    TracingEnabled: true
```

**Status in 2026**: the X-Ray SDKs and the X-Ray daemon entered **maintenance mode on February 25, 2026** (security fixes only) and reach end of support on February 25, 2027. AWS X-Ray itself continues; new and existing applications should instrument with OpenTelemetry and replace the daemon with the CloudWatch agent or an OpenTelemetry Collector (stop the daemon first: they use the same port).

```json
{
  "name": "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "value": "http://cwagent:4318/v1/traces"
}
```

**CloudWatch Application Signals** builds on OpenTelemetry instrumentation to show services, their dependencies, latency, errors and service level objectives (SLOs) without custom dashboards.

> **Exam trap.** For a new application in 2026, "instrument the code with the X-Ray SDK and run the X-Ray daemon" is no longer the best answer: use OpenTelemetry (ADOT) with the CloudWatch agent or a collector. Traces missing from Lambda with active tracing on usually means the execution role can't write to X-Ray.

<!-- section: workload-health | objectives: 4.2.5 -->
## Monitoring workload health with health checks and probes

| Check | Configured on | Effect of a failure |
| --- | --- | --- |
| Load balancer target group health check | Protocol, port, **path** (for example `/health`), interval, timeout, healthy and unhealthy thresholds, success codes | The target stops receiving traffic until it passes again |
| Auto Scaling group health check | Type `EC2` (instance status) or `ELB` (also the load balancer's verdict), with a grace period after launch | The instance is terminated and replaced |
| ECS container `healthCheck` | Command (`CMD-SHELL`), interval 5–300 s (default 30), timeout 2–60 s (default 5), retries 1–10 (default 3), `startPeriod` 0–300 s | An unhealthy essential container makes the task unhealthy; the service replaces it |
| ECS service with a load balancer | `healthCheckGracePeriodSeconds` | Ignores load balancer health checks while a new task starts |
| Kubernetes probes on EKS | `livenessProbe`, `readinessProbe`, `startupProbe` (HTTP, TCP, command or gRPC) | Liveness failure: the container is restarted. Readiness failure: the pod is removed from the Service endpoints, not restarted. Startup: other probes wait until it succeeds |
| Elastic Beanstalk enhanced health | Health agent on the instances | Environment health color and causes in the console |
| CloudWatch Synthetics canary | A script (Node.js, Python or Java) run on a schedule, as often as once per minute | Metrics in the `CloudWatchSynthetics` namespace and alarms, even with no user traffic |

```json
{
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

```yaml
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

Design the endpoints carefully: a **liveness** check tests the process only (it must not fail because a database is slow, or every container restarts at once); a **readiness** check may test the dependencies the instance needs before it takes traffic.

> **Exam tip.** "Stop sending traffic to a pod while its cache warms up, without restarting it" means a readiness probe. "Instances pass EC2 status checks but the application returns 500 errors and Auto Scaling never replaces them" means switching the Auto Scaling group to ELB health checks.

<!-- section: key-points -->
## Key points

- JSON logs with level and correlation ID; Lambda advanced logging (`LogFormat: JSON`, application and system log levels, custom log group); retention on every log group.
- Data protection policies mask sensitive data at ingestion; `logs:Unmask` reveals it; only new events are masked.
- Custom metrics: EMF from Lambda and containers, `PutMetricData` elsewhere, metric filters with no code change; up to 30 dimensions, never high-cardinality ones; high resolution 1 s.
- Alarms: period, evaluation periods, datapoints to alarm, missing data treatment, SNS actions, composite alarms; quota alarms from Service Quotas; EventBridge rules for deployment state changes.
- Tracing: Lambda active tracing and API Gateway stage tracing; annotations indexed; default sampling 1 per second + 5 %; X-Ray SDKs and daemon in maintenance since February 25, 2026, use OpenTelemetry (ADOT) with the CloudWatch agent or a collector.
- Health: target group health checks, ASG ELB health checks, ECS `healthCheck`, liveness (restart) vs readiness (no traffic) probes, Synthetics canaries.
