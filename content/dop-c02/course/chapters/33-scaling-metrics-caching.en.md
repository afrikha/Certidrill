A scalable solution adds capacity in proportion to demand, removes it when demand falls, and keeps each tier from overwhelming the next. DOP-C02 tests the engineering behind that sentence: picking the metric that really tracks load, decoupling tiers so they scale independently, choosing the auto scaling, load balancing and caching mechanism that fits, diagnosing why something didn't scale, and deploying to several Regions to serve a global audience.

<!-- section: scaling-metrics | objectives: 3.2.1 -->
## Choosing the right metric for scaling

A good scaling metric **rises and falls in proportion to the load each unit of capacity carries**, and adding capacity brings it back toward the target. CPU works for CPU-bound fleets; it is a poor signal for I/O-bound applications, queue workers or memory-bound containers.

| Workload | Metric to scale on | Mechanism |
| --- | --- | --- |
| Web fleet behind an ALB | `ALBRequestCountPerTarget` or `ASGAverageCPUUtilization` | EC2 Auto Scaling target tracking |
| Queue workers on EC2 or ECS | **Backlog per instance (or task)**: visible messages ÷ running capacity, target = acceptable latency ÷ processing time per message | Target tracking with metric math |
| ECS service | `ECSServiceAverageCPUUtilization`, `ECSServiceAverageMemoryUtilization` or `ALBRequestCountPerTarget` | Application Auto Scaling |
| EKS pods | CPU or memory requests utilization, custom or external metrics (queue depth) | Horizontal Pod Autoscaler, then nodes by Karpenter, Cluster Autoscaler or EKS Auto Mode |
| Lambda with provisioned concurrency | `LambdaProvisionedConcurrencyUtilization` | Application Auto Scaling target tracking or scheduled |
| DynamoDB provisioned table and each GSI | Read and write capacity utilization | Application Auto Scaling target tracking (20–90 %) |
| Aurora readers | Average reader CPU or average connections | Aurora Auto Scaling of replicas |
| Kinesis Data Streams consumers | `GetRecords.IteratorAgeMilliseconds` (consumer lag), write throttling | On-demand capacity mode or more shards |

Queue length alone is a bad target: it ignores how many workers are already running and overshoots while the queue drains. AWS documents a backlog-per-instance policy with metric math, no custom metric to publish:

```json
{
  "CustomizedMetricSpecification": {
    "Metrics": [
      {
        "Label": "Get the queue size (the number of messages waiting to be processed)",
        "Id": "m1",
        "MetricStat": {
          "Metric": {
            "MetricName": "ApproximateNumberOfMessagesVisible",
            "Namespace": "AWS/SQS",
            "Dimensions": [ { "Name": "QueueName", "Value": "my-queue" } ]
          },
          "Stat": "Sum"
        },
        "ReturnData": false
      },
      {
        "Label": "Get the group size (the number of InService instances)",
        "Id": "m2",
        "MetricStat": {
          "Metric": {
            "MetricName": "GroupInServiceInstances",
            "Namespace": "AWS/AutoScaling",
            "Dimensions": [ { "Name": "AutoScalingGroupName", "Value": "my-asg" } ]
          },
          "Stat": "Average"
        },
        "ReturnData": false
      },
      { "Label": "Calculate the backlog per instance", "Id": "e1", "Expression": "m1 / m2", "ReturnData": true }
    ]
  },
  "TargetValue": 100
}
```

With an acceptable latency of 10 seconds and 0.1 second of processing per message, the target is 100 messages per instance. `GroupInServiceInstances` requires group metrics collection on the Auto Scaling group.

> **Exam trap.** Scaling a memory-bound container service on CPU never triggers, and scaling queue workers on CPU reacts only after the backlog is already late. Match the metric to the bottleneck the stem describes.

<!-- section: loose-coupling | objectives: 3.2.2 -->
## Loosely coupled and distributed architectures

Tight coupling (a synchronous call chain) means the slowest tier sets the throughput of all tiers and a failure propagates. Decoupling lets each tier scale on its own metric:

| Need | Service | Scaling-relevant facts |
| --- | --- | --- |
| Buffer work between producers and consumers | Amazon SQS standard queue | Nearly unlimited throughput, at-least-once delivery: consumers must be idempotent |
| Strict ordering and deduplication per group | SQS FIFO queue | Parallelism limited by the number of message group IDs |
| Fan out one event to several consumers | Amazon SNS topic with SQS subscriptions | Each consumer gets its own queue and scales independently |
| Route events by content, across accounts | Amazon EventBridge rules (event buses) | Filtering on the event pattern; targets such as Lambda, SQS, Step Functions |
| Ordered stream replayed by several consumers | Kinesis Data Streams | Ordering per shard; capacity per shard (provisioned) or on-demand mode |
| Coordinate multi-step processing | AWS Step Functions | Standard workflows (long-running, exactly-once) or Express workflows (high volume, short) |

SQS settings that appear in scaling questions:

| Setting | Value |
| --- | --- |
| Maximum message size | 1 MiB |
| Retention | 4 days by default, 60 seconds to 14 days |
| Visibility timeout | 30 seconds by default, up to 12 hours |
| Delay | Up to 15 minutes |
| Lambda consumer | Visibility timeout at least six times the function timeout; `maxReceiveCount` of at least 5 before the dead-letter queue |

A **dead-letter queue** isolates poison messages so that one bad message doesn't block or loop forever. **Partial batch responses** (`ReportBatchItemFailures`) return only the failed messages of a batch to the queue.

> **Exam tip.** "Orders are lost when the processing tier is overloaded during sales" is solved by putting an SQS queue between the web tier and the processing tier and scaling the workers on backlog per instance, not by a bigger instance type.

<!-- section: autoscaling-lb-caching | objectives: 3.2.6 -->
## Selecting auto scaling, load balancing and caching

**Auto scaling policies** (EC2 Auto Scaling and Application Auto Scaling share the model):

| Pattern | Policy |
| --- | --- |
| Keep a metric near a value | Target tracking (it creates and owns its CloudWatch alarms) |
| React more strongly to larger breaches | Step scaling |
| Known calendar peaks | Scheduled actions |
| Recurring daily or weekly cycles, slow boot | Predictive scaling (forecast only first, then forecast and scale) with a dynamic policy for scale-in |
| Long application initialization | Warm pool (stopped or hibernated pre-initialized instances), lifecycle hooks, default instance warmup |
| Roll out a new AMI or launch template | Instance refresh with checkpoints and alarm-based rollback |

**Load balancers:**

| Requirement | Choice |
| --- | --- |
| HTTP/HTTPS routing by path, host, header; Lambda or IP targets; authentication | Application Load Balancer |
| TCP/UDP/TLS, extreme throughput, static or Elastic IP per AZ, client IP preserved | Network Load Balancer |
| Insert third-party virtual appliances (firewalls) transparently | Gateway Load Balancer |
| Known sudden spike (product launch, live event) | ALB LCU reservation: a minimum capacity of at least 100 LCUs, sized from the `PeakLCUs` metric |

**Caching** removes load before it reaches the tier that doesn't scale:

| Where | Service | Notes |
| --- | --- | --- |
| Edge, static and cacheable dynamic content | Amazon CloudFront | Cache policy defines the cache key and TTLs; Origin Shield reduces origin load |
| API responses | API Gateway REST API stage cache | TTL 300 seconds by default, up to 3,600 (0 disables); only `GET` cached by default; client invalidation with `Cache-Control: max-age=0` needs `execute-api:InvalidateCache`; check `CacheHitCount` and `CacheMissCount` |
| Database query results, sessions | Amazon ElastiCache (Valkey, Redis OSS, Memcached), serverless or node-based | Lazy loading or write-through, with TTLs |
| DynamoDB reads | DynamoDB Accelerator (DAX) | Item cache for eventually consistent reads; strongly consistent reads pass through |
| Relational read scaling | RDS read replicas, Aurora replicas behind the reader endpoint | Asynchronous: readers may lag |

> **Exam trap.** A cache in front of DynamoDB doesn't help a workload that requires strongly consistent reads, and read replicas don't relieve a write bottleneck. Identify whether the pressure is on reads or writes before choosing.

<!-- section: scaling-issues | objectives: 3.2.5 -->
## Identifying and remediating scaling issues

| Symptom | Likely cause | Remediation |
| --- | --- | --- |
| Group stays at its maximum while latency grows | Maximum capacity too low, or the bottleneck is elsewhere (database) | Raise the maximum; find the real bottleneck with metrics and traces |
| Launches fail with insufficient capacity in one AZ | Single instance type | Mixed instances policy with several types or attribute-based instance type selection, several AZs |
| Launches fail with a vCPU limit error | Service quota | Request an increase in Service Quotas; alarm on quota usage metrics before it happens |
| Capacity arrives after the morning peak | Reactive policy on a predictable pattern, long boot | Predictive or scheduled scaling, warm pool |
| Group scales out and in repeatedly | Missing instance warmup, step thresholds too close | Default instance warmup, target tracking |
| New instances terminated in a loop | Health check grace period too short with `ELB` health checks | Grace period or a launch lifecycle hook until the application is ready |
| DynamoDB `ProvisionedThroughputExceededException` on one key | Hot partition (each partition serves at most 3,000 RCU and 1,000 WCU) | Better partition key design, write sharding, DAX for hot reads |
| DynamoDB throttling on short bursts despite auto scaling | Auto scaling reacts in minutes | On-demand capacity mode |
| Lambda `TooManyRequestsException` (throttles) | Account concurrency (1,000 per Region by default) or reserved concurrency reached | Quota increase, reserved concurrency for critical functions, queue in front |
| Lambda SQS consumer not scaling enough | Standard event source mapping (adds up to 300 concurrent invokes per minute, up to 1,250) | Provisioned mode (up to 100,000 concurrent invocations, extra cost) |
| API Gateway HTTP 429 | Account throttle (10,000 requests per second with a 5,000 burst by default) or usage plan limit | Quota increase, caching, per-client usage plans |
| Database out of connections when Lambda scales | One connection per execution environment | RDS Proxy connection pooling; cap with reserved concurrency or SQS maximum concurrency (2–1,000) |
| Kinesis write throttling, growing iterator age | Too few shards (1 MB/s or 1,000 records/s of writes per shard) | On-demand mode or reshard; enhanced fan-out for many consumers |

Diagnostics: the Auto Scaling **activity history** explains every launch and failure; CloudWatch metrics and Container Insights show saturation; AWS X-Ray or OpenTelemetry traces show which dependency limits throughput; **AWS Compute Optimizer** recommends instance types and sizes from utilization history.

> **Exam trap.** Adding application capacity in front of a saturated dependency makes the outage worse (more connections, more retries). The fix is at the bottleneck: pooling, caching, queueing or scaling the dependency itself.

<!-- section: global-scale | objectives: 3.2.8 -->
## Deploying in multiple Regions for global scalability

Global scalability means serving users on several continents with low latency, and growing past what one Region can offer, not only surviving a Regional outage.

| Requirement | Design |
| --- | --- |
| Static and cacheable content close to users | CloudFront in front of the Regional origins |
| Route each user to the nearest healthy Region | Route 53 latency-based routing with health checks, or geoproximity with biases |
| Static IP addresses, fast Regional failover, TCP or UDP | AWS Global Accelerator with an endpoint group per Region (traffic dials) |
| Local reads and writes in every Region | DynamoDB global tables (MREC: last writer wins) |
| Relational data, local reads, occasional writes | Aurora Global Database with write forwarding from the secondary Regions |
| One global endpoint for objects | S3 Multi-Region Access Point (routes to the closest bucket, with two-way replication) |
| Same infrastructure everywhere | CloudFormation StackSets or a pipeline with one stage per Region; ECR replication; Secrets Manager replica secrets; KMS multi-Region keys |

Deployment practice for many Regions: build once, promote the same artifact, deploy Region by Region (a first small Region as a canary), with alarm checks and automatic rollback between waves, so that a bad change never reaches every Region at the same time. Service quotas are per Region: raise them in each Region before routing traffic there.

> **Exam tip.** "Users in Asia see high latency for dynamic API calls" is not solved by CloudFront caching if the responses aren't cacheable. Deploy the API in an Asian Region with replicated data (DynamoDB global tables) and route users with Route 53 latency routing or Global Accelerator.

<!-- section: key-points -->
## Key points

- Scale on a metric proportional to per-unit load: requests per target for web fleets, backlog per instance for queue workers, memory for memory-bound services, iterator age for stream consumers.
- Backlog per instance with metric math: visible messages ÷ `GroupInServiceInstances`, target = acceptable latency ÷ processing time.
- Decouple with SQS (1 MiB messages, 4 to 14 days retention, visibility timeout six times the Lambda timeout, DLQ), SNS fan-out, EventBridge, Kinesis, Step Functions; consumers must be idempotent.
- Target tracking by default, scheduled or predictive for known patterns, warm pools for long boots, instance refresh for new AMIs; ALB LCU reservation for known spikes.
- Cache at the edge (CloudFront), the API (stage cache, 300 seconds by default), the database (ElastiCache) and DynamoDB (DAX, eventually consistent reads only).
- Diagnose with activity history, metrics and traces: quotas, single instance types, hot partitions, Lambda and API Gateway throttles, connection exhaustion (RDS Proxy), shard limits.
- Global scale: CloudFront, Route 53 latency routing or Global Accelerator, global tables, Aurora write forwarding, S3 Multi-Region Access Points, Region-by-Region deployments and per-Region quotas.
