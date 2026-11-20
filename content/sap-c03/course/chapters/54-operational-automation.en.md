Operational excellence at scale means the system notices trouble, adds capacity and recovers before a person is paged, and that every automated action is bounded so it can't make an incident worse. Exam stems describe fleets across many accounts and Regions, quotas that block a launch, a remediation that loops, a scaling policy that reacts too late or a Lambda function that loses events, and ask for the design with the right health signal, safety limit or runbook. This chapter covers health and capacity monitoring, controlled remediation, scaling policies, automated recovery, and runbooks for patching, remediation and scaling.

<!-- section: health-capacity | objectives: 5.4.1 -->
## Health monitoring, capacity planning and operational responses

Monitor health at every layer, and wire each signal to a response:

| Layer | Signal | Typical response |
| --- | --- | --- |
| Instance and target | EC2 status checks, load balancer target health | Auto Scaling replacement, EC2 automatic recovery |
| Application | CloudWatch alarms on error rate, latency, queue age; canaries; SLO burn rate | Scale, roll back, run a runbook, page |
| AWS services and scheduled events | AWS Health events in EventBridge (`source` `aws.health`): issues, scheduled changes such as instance retirement, account notifications | Automation runbook, ticket, notification |
| Organization-wide | AWS Health organizational view with a delegated administrator, aggregating events of every member account | Central operations team |
| Limits | Service Quotas usage metrics (`AWS/Usage`) | Quota increase before the limit blocks a launch or a failover |

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

An EventBridge rule only sees its own account's Health events; aggregate them through organizational view. Public events can take up to an hour to start arriving after the rule is created.

**Capacity planning**:

- **Quota alarms**: a CloudWatch alarm on usage divided by `SERVICE_QUOTA(usage)` warns at, for example, 80 % of the On-Demand vCPU quota of the DR Region.
- **Service Quotas Automatic Management**: *Notify Only* sends notifications at 80 % and 95 % utilization; *Notify and Auto-Adjust* also creates increase requests, only for quotas that support automated approval. Notifications reach email, Slack or the console mobile app, the AWS Health dashboard and EventBridge.
- **Quota request templates** (Organizations with all features): up to 10 quota increases requested automatically for every **new** account created in the organization; existing accounts are not changed; not in opt-in Regions.
- **On-Demand Capacity Reservations** guarantee instances of a type in an Availability Zone, with no term, billed whether used or not: the way to be sure capacity exists for a failover or an event.
- **Compute Optimizer** and predictive scaling forecasts show trends for right-sizing and headroom.

```bash
aws cloudwatch put-metric-alarm --alarm-name dr-region-vcpu-80pct \
  --comparison-operator GreaterThanThreshold --threshold 80 --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-west-2:111122223333:capacity-team \
  --metrics '[{"Id":"usage","ReturnData":false,"MetricStat":{"Metric":{"Namespace":"AWS/Usage","MetricName":"ResourceCount","Dimensions":[{"Name":"Service","Value":"EC2"},{"Name":"Type","Value":"Resource"},{"Name":"Resource","Value":"vCPU"},{"Name":"Class","Value":"Standard/OnDemand"}]},"Period":300,"Stat":"Maximum"}},{"Id":"pct","Expression":"100 * usage / SERVICE_QUOTA(usage)","Label":"vCPU quota used","ReturnData":true}]'
```

> **Exam trap.** A warm-standby Region that has never run production often has default quotas: the failover then fails on launch limits. Plan quotas per Region (alarms, automatic management or templates for new accounts) and reserve critical capacity; scaling policies can't exceed a quota.

<!-- section: controlled-remediation | objectives: 5.4.2 -->
## Controlled remediation with safety constraints

Automation without limits turns a small fault into an outage (a retry storm, a remediation loop, every instance rebooted at once). Each pattern has AWS mechanisms:

| Safety pattern | Purpose | AWS implementation |
| --- | --- | --- |
| Circuit breaker | Stop calling or acting on something that keeps failing, then probe before resuming | Application circuit breaker with state in DynamoDB or ElastiCache; ECS deployment circuit breaker; AWS Config auto-remediation stops after `MaximumAutomaticAttempts` (1–25, default 5) failures within `RetryAttemptSeconds` (default 60) and records a remediation exception |
| Rate limits | Cap how fast requests or actions hit a target | API Gateway throttling (rate and burst per stage, method or usage plan; clients get 429); AWS WAF rate-based rules; Systems Manager concurrency and error thresholds; Config `ConcurrentExecutionRatePercentage` and `ErrorPercentage`; SQS as a buffer |
| Bulkhead | Isolate failures so one consumer or tenant can't exhaust shared capacity | Reserved concurrency per Lambda function; separate queues and consumer pools per priority or tenant; cell-based architecture; separate accounts |
| Retries with exponential backoff and jitter | Absorb transient errors without synchronized retry waves | AWS SDK standard mode (default 3 attempts, full jitter, a retry quota that stops retries when it is depleted); adaptive mode adds client-side rate limiting; Step Functions `Retry` |
| Human approval and freeze periods | Keep a person in the loop for risky steps | `aws:approve` step in Automation; Systems Manager Change Calendar blocks runbooks during a freeze |
| Stop conditions | Abort automatically when health degrades | A CloudWatch alarm attached to an Automation execution cancels it; FIS experiments stop on alarm |

Step Functions retriers default to `IntervalSeconds` 1, `MaxAttempts` 3 and `BackoffRate` 2.0; `MaxDelaySeconds` caps the wait and `JitterStrategy` `FULL` randomizes it:

```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Parameters": { "FunctionName": "arn:aws:lambda:eu-west-1:111122223333:function:charge-card", "Payload.$": "$" },
  "Retry": [
    {
      "ErrorEquals": ["Lambda.TooManyRequestsException", "States.Timeout"],
      "IntervalSeconds": 2,
      "MaxAttempts": 4,
      "BackoffRate": 2.0,
      "MaxDelaySeconds": 30,
      "JitterStrategy": "FULL"
    }
  ],
  "Catch": [ { "ErrorEquals": ["States.ALL"], "Next": "RefundAndNotify" } ],
  "Next": "ConfirmOrder"
}
```

Retry at one layer only: three layers that each try three times send up to 27 requests to a dependency that is already struggling. Retried operations must be idempotent (an idempotency key stored in DynamoDB, for example).

> **Exam trap.** "Automatically remediate noncompliant instances across 2,000 accounts without risking a fleet-wide outage" needs both automation and limits: an Automation runbook with concurrency and error thresholds (or Config remediation with execution controls), not a Lambda function that loops over every instance at once.

<!-- section: scaling-policies | objectives: 5.4.3 -->
## Metric-based, scheduled and predictive scaling

| Policy | How it decides | Use it for |
| --- | --- | --- |
| Target tracking | Keeps a metric at a target value; creates and manages its own alarms (don't edit them); scales out quickly and in gradually | The default for most workloads: `ASGAverageCPUUtilization`, `ALBRequestCountPerTarget`, a custom metric such as queue backlog per instance |
| Step scaling | Adjusts by different amounts depending on the size of the alarm breach | Fine control, several thresholds |
| Simple scaling | One adjustment, then waits for the cooldown | Legacy; prefer step or target tracking |
| Scheduled | Sets minimum, maximum or desired capacity at a time (one-time or cron, with a time zone) | Known events: a sale starting at 9:00, nightly shutdown of test fleets |
| Predictive (Auto Scaling groups) | Forecasts load from history and launches capacity ahead of it | Recurring daily or weekly patterns, applications with long initialization |

**Predictive scaling** needs at least 24 hours of metric data (two weeks give better forecasts), analyzes up to 14 days, forecasts the next 48 hours hourly and updates every 6 hours. It starts in **forecast only** mode so you can compare forecast and actual load; **forecast and scale** then launches capacity. It never scales in from the forecast, so pair it with a target tracking policy: when several policies are active, the group uses the largest desired capacity. `SchedulingBufferTime` launches instances before the forecast hour; `MaxCapacityBreachBehavior` `IncreaseMaxCapacity` with a `MaxCapacityBuffer` allows exceeding the group maximum.

```bash
aws autoscaling put-scaling-policy --auto-scaling-group-name web-prod \
  --policy-name cpu-target-50 --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{"PredefinedMetricSpecification":{"PredefinedMetricType":"ASGAverageCPUUtilization"},"TargetValue":50}'
aws autoscaling put-scaling-policy --auto-scaling-group-name web-prod \
  --policy-name cpu-predictive --policy-type PredictiveScaling \
  --predictive-scaling-configuration '{"MetricSpecifications":[{"TargetValue":50,"PredefinedMetricPairSpecification":{"PredefinedMetricType":"ASGCPUUtilization"}}],"Mode":"ForecastAndScale","SchedulingBufferTime":600}'
aws autoscaling put-scheduled-update-group-action --auto-scaling-group-name web-prod \
  --scheduled-action-name black-friday --start-time 2026-11-27T07:00:00Z --min-size 40 --max-size 200
```

Supporting features: **default instance warmup** keeps new instances out of the metric until they serve traffic; **warm pools** keep pre-initialized (stopped or hibernated) instances ready for applications that take minutes to boot; **lifecycle hooks** run configuration before an instance goes in service.

**Application Auto Scaling** applies target tracking, step and scheduled policies to other resources: ECS service desired count, DynamoDB provisioned capacity, Aurora replicas, Lambda provisioned concurrency, SageMaker AI endpoint variants (on `InvocationsPerInstance`), and more.

> **Exam tip.** "Traffic rises every weekday at 8:00 and instances need 10 minutes to boot; users see errors for the first minutes" is predictive scaling (forecast and scale with a scheduling buffer) together with target tracking, or warm pools. A single one-off event at a known time is a scheduled action.

<!-- section: failure-recovery | objectives: 5.4.4 -->
## Automated failure recovery with health checks and replacement

**EC2 Auto Scaling** assumes instances are healthy until told otherwise. EC2 status checks always apply; Elastic Load Balancing, VPC Lattice and EBS health checks are optional; custom systems report status with `SetInstanceHealth`. Optional checks start after the health check grace period. An unhealthy instance is terminated and replaced from the current launch template; an instance maintenance policy decides whether replacements launch before the old instance terminates. A standalone instance that can't be in a group uses **EC2 automatic recovery**, which moves it to new hardware on a system status check failure and keeps its instance ID, IP addresses and EBS volumes.

**Amazon ECS** replaces tasks through the service scheduler when an essential container exits, a container health check (`command`, `interval`, `timeout`, `retries`, `startPeriod`) reports unhealthy, or the load balancer health check fails after `healthCheckGracePeriodSeconds`. With `maximumPercent` above 100, the replacement starts before the unhealthy task stops.

**AWS Lambda** recovery depends on the invocation type:

| Invocation | Built-in retries | Where failures go |
| --- | --- | --- |
| Synchronous (API Gateway, SDK) | None: the caller retries | Error returned to the caller |
| Asynchronous (S3, SNS, EventBridge) | 2 retries by default (0–2), about 1 then 2 minutes apart for function errors; throttles and system errors retried with backoff up to the maximum event age (60 seconds to 6 hours, default 6 hours) | On-failure destination (SQS, SNS, Lambda, EventBridge or S3) with the full invocation record; or a dead-letter queue (SQS or SNS) with the event only |
| Kinesis and DynamoDB Streams event source mapping | Until success, record expiry or the limits `MaximumRetryAttempts` and `MaximumRecordAgeInSeconds`; `BisectBatchOnFunctionError` splits a failing batch | On-failure destination (SQS, SNS, S3 or a Kafka topic) |
| SQS event source mapping | The message reappears after the visibility timeout | Redrive policy (`maxReceiveCount`) to a dead-letter queue; `ReportBatchItemFailures` retries only the failed messages |

```bash
aws lambda update-function-event-invoke-config --function-name resize-image \
  --maximum-retry-attempts 1 --maximum-event-age-in-seconds 3600 \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:s3:::example-failed-invocations"}}'
aws lambda update-event-source-mapping --uuid a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
  --maximum-retry-attempts 5 --maximum-record-age-in-seconds 3600 --bisect-batch-on-function-error \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:sqs:eu-west-1:111122223333:stream-failures"}}'
```

With default settings, a bad record can block a Kinesis shard for up to a week: set retry and age limits plus an on-failure destination. Above the compute layer, Route 53 health checks with failover records and Amazon Application Recovery Controller zonal shift move traffic away from an impaired endpoint or Availability Zone.

> **Exam trap.** An Auto Scaling group that uses only EC2 health checks keeps an instance whose application has crashed, because the OS still passes status checks. Behind a load balancer, turn on the ELB health check type (with a grace period long enough for startup).

<!-- section: runbooks-incident-response | objectives: 5.4.5 -->
## Automated runbooks and incident response

**Systems Manager Automation** runbooks are documents of steps: AWS-owned ones (`AWS-RestartEC2Instance`, `AWS-DisableS3BucketPublicReadWrite`, troubleshooting runbooks `AWSSupport-*`) and custom ones built from actions such as `aws:executeAwsApi`, `aws:runCommand`, `aws:executeScript`, `aws:branch`, `aws:approve` and `aws:waitForAwsResourceProperty`.

```yaml
schemaVersion: '0.3'
description: Redeploy the orders service after approval and wait for steady state
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  AutomationAssumeRole:
    type: String
  ClusterName:
    type: String
  ServiceName:
    type: String
  Approvers:
    type: StringList
mainSteps:
  - name: approve
    action: aws:approve
    timeoutSeconds: 3600
    inputs:
      Approvers: '{{ Approvers }}'
      MinRequiredApprovals: 1
      Message: Force a new deployment of the orders service?
  - name: forceNewDeployment
    action: aws:executeAwsApi
    inputs:
      Service: ecs
      Api: UpdateService
      cluster: '{{ ClusterName }}'
      service: '{{ ServiceName }}'
      forceNewDeployment: true
  - name: waitForSteadyState
    action: aws:waitForAwsResourceProperty
    timeoutSeconds: 1800
    inputs:
      Service: ecs
      Api: DescribeServices
      cluster: '{{ ClusterName }}'
      services:
        - '{{ ServiceName }}'
      PropertySelector: '$.services[0].deployments[0].rolloutState'
      DesiredValues:
        - COMPLETED
```

| Trigger | When to use it |
| --- | --- |
| EventBridge rule (alarm state change, AWS Health event, GuardDuty finding) | Event-driven response |
| CloudWatch alarm creates an OpsItem; the runbook runs from OpsCenter | Operator-assisted response with context |
| AWS Config rule with automatic remediation | Configuration drift (public bucket, missing encryption) |
| State Manager association | Keep a desired state on a schedule (agent installed, configuration applied) |
| Maintenance window | Disruptive tasks in an agreed time slot, with rate control |

**Across accounts and Regions**, run the runbook from the management account or a delegated administrator: `AWS-SystemsManager-AutomationAdministrationRole` in the central account, `AWS-SystemsManager-AutomationExecutionRole` in every target account (deployed with StackSets), target locations as accounts or OUs plus Regions, and two levels of rate control: `TargetLocationMaxConcurrency` and `TargetLocationMaxErrors` per account-Region pair, `TargetsMaxConcurrency` and `TargetsMaxErrors` per resource. Custom runbooks must be shared with the target accounts.

**Patching**: a Patch Manager **patch policy** created with Quick Setup covers an organization, chosen OUs or accounts, and Regions; scanning and installation have separate schedules (for example scan daily, install weekly), it runs `AWS-RunPatchBaseline` with one baseline per operating system, and compliance is reported per account-Region pair. For Auto Scaling fleets, an immutable alternative is often better: EC2 Image Builder produces a patched AMI, and an instance refresh replaces instances in batches.

**Scaling runbooks** prepare for events (raise minimum capacity, pre-warm, request quotas) with an approval step, then revert after the event.

**Incident response procedure**: detect (alarm, SLO burn rate), create an OpsItem and notify through SNS, run diagnostic and mitigation runbooks, use CloudWatch investigations to correlate signals, then hold a post-incident review that turns each manual action into a runbook. Incident Manager (response plans, on-call engagement) is for existing customers only since November 7, 2025.

> **Exam tip.** "Run the same remediation in every account of three OUs and four Regions, from one place, 10 % of accounts at a time, stopping if errors exceed 5 %" is a multi-account Automation execution with `TargetLocationMaxConcurrency` and `TargetLocationMaxErrors`, not a script looping over `sts:AssumeRole` calls.

<!-- section: key-points -->
## Key points

- Watch health at every layer; route AWS Health events (organizational view) and alarms through EventBridge to runbooks.
- Plan capacity per Region: quota alarms with `SERVICE_QUOTA()`, Automatic Management at 80 % and 95 %, quota request templates for new accounts, Capacity Reservations for critical failover capacity.
- Bound every automation: circuit breakers, rate limits, bulkheads, backoff with jitter, approvals, Change Calendar, alarm stop conditions, idempotent operations.
- Target tracking by default; scheduled for known events; predictive for recurring patterns (no scale-in, pair with target tracking); warm pools for slow boots.
- ELB health checks for Auto Scaling behind a load balancer; ECS replaces unhealthy tasks; Lambda async retries 0–2 with destinations, stream mappings need retry and age limits.
- Automation runbooks with multi-account rate control; patch policies or immutable AMI refresh for patching; OpsItems and SNS for incidents.
