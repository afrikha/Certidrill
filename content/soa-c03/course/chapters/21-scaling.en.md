An elastic workload adds capacity before users notice a slowdown and removes it when demand falls. SOA-C03 asks the operator's side of that promise: which Auto Scaling setting explains a group that scales too late or flaps, how to keep a slow-booting instance out of service until it is ready, where a cache removes load from a database, and how RDS, Aurora and DynamoDB grow without an outage.

<!-- section: asg-configuration | objectives: 2.1.1 -->
## Auto Scaling group settings that decide behavior

An Auto Scaling group keeps its **desired capacity** between a **minimum** and a **maximum**, launching instances from a launch template across the subnets (Availability Zones) you list. The settings below explain most exam scenarios:

| Setting | Default | What it controls |
| --- | --- | --- |
| Health check type | EC2 status checks and scheduled events | Add **ELB** health checks so an instance that fails the target group check is replaced; they are ignored until you turn them on |
| Health check grace period | 300 seconds in the console, 0 with the CLI or an SDK | Time after launch before failed health checks count against a new instance |
| Default instance warmup | Not set | Time after `InService` before an instance's metrics count in the group's aggregated metrics; start with 300 seconds and tune |
| Default cooldown | 300 seconds | Pause between activities of **simple** scaling policies only |
| Instance maintenance policy | Not set | Minimum and maximum healthy percentage while instances are replaced (health checks, instance refresh), for example launch before terminate |

How health checks act: an instance that is no longer `running` is marked unhealthy and replaced immediately; an `impaired` status check gets a few minutes for AWS to fix the problem first; an instance with a scheduled event is replaced. Replacements happen up to 10 % of desired capacity at a time and ignore the cooldown.

> **Exam trap.** A group created with the CLI has a grace period of 0. With ELB health checks on, new instances that need three minutes to start the application fail the target group check and are terminated in a loop. Set a grace period, or better, a launch lifecycle hook that keeps the instance in `Pending:Wait` until it is ready.

<!-- section: scaling-policies | objectives: 2.1.1 -->
## Choosing and tuning a scaling policy

| Requirement | Policy |
| --- | --- |
| Keep a metric near a value (average CPU 50 %, 1,000 requests per target) | Target tracking (`ASGAverageCPUUtilization`, `ASGAverageNetworkIn`, `ASGAverageNetworkOut`, `ALBRequestCountPerTarget`, or a custom metric) |
| Add more instances the further an alarm threshold is breached | Step scaling with step adjustments |
| One fixed adjustment per alarm, then wait | Simple scaling (uses the cooldown) |
| Known calendar peaks (Monday 08:00, end of month) | Scheduled action that changes minimum, maximum or desired capacity |
| Recurring daily or weekly pattern, slow boot | Predictive scaling, combined with target tracking |

Operational facts:

- Target tracking **creates and owns its CloudWatch alarms**: never edit or delete them. It scales in more gradually than out. With several target tracking policies (each on a different metric), the group scales out if any policy asks and scales in only if all agree.
- Adjustment types for step and simple policies: `ChangeInCapacity`, `ExactCapacity`, `PercentChangeInCapacity` (with `MinAdjustmentMagnitude`).
- Target tracking and step scaling don't wait for the cooldown; while new instances warm up, scale-in by those policies is blocked.
- Predictive scaling needs at least 24 hours of data (two weeks is better), produces an hourly forecast for the next 48 hours, refreshed every 6 hours. Start in **forecast only** mode, then switch to **forecast and scale**. It never scales in: keep a dynamic policy for that. `SchedulingBufferTime` launches capacity before the forecast hour. When several policies are active, desired capacity is the highest of their results.

```json
{
  "TargetValue": 1000.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ALBRequestCountPerTarget",
    "ResourceLabel": "app/web-alb/50dc6c495c0c9188/targetgroup/web-tg/6d0ecf831eec9f09"
  }
}
```

> **Exam tip.** "Capacity arrives too late every morning although the peak is the same each day" points to predictive scaling or a scheduled action, not a lower target value. "The group keeps scaling out and in every few minutes" points to a missing default instance warmup or a step policy with thresholds too close together.

<!-- section: asg-lifecycle | objectives: 2.1.1 -->
## Lifecycle hooks, warm pools and suspended processes

**Lifecycle hooks** pause an instance in `Pending:Wait` (launch) or `Terminating:Wait` (scale in) so a script, a Systems Manager Automation runbook or a Lambda function invoked through EventBridge can install software, register it, or copy logs before termination. Heartbeat timeout: 30 to 7,200 seconds, default 3,600; the default result is `ABANDON` (`CONTINUE` is the other value). Record a heartbeat to restart the timeout, and complete the action as soon as the work is done.

```bash
aws autoscaling put-lifecycle-hook --auto-scaling-group-name web-asg \
  --lifecycle-hook-name drain-logs \
  --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
  --heartbeat-timeout 900 --default-result CONTINUE

aws autoscaling complete-lifecycle-action --auto-scaling-group-name web-asg \
  --lifecycle-hook-name drain-logs --instance-id i-0abc1234def567890 \
  --lifecycle-action-result CONTINUE
```

**Warm pools** keep pre-initialized instances beside the group for applications with long boot times. Pool states: `Stopped` (pay only for volumes and Elastic IP addresses, the usual choice), `Hibernated` (memory kept on the EBS root volume), `Running` (discouraged: full instance cost). Limits: an EBS root volume is needed, no Spot Instances, no weighted mixed instances groups. By default the pool holds maximum capacity minus desired capacity.

Other controls:

- **Scale-in protection** on an instance stops the group from terminating it on scale in (it is still replaced if unhealthy).
- **Suspending processes** (`Launch`, `Terminate`, `HealthCheck`, `ReplaceUnhealthy`, `AZRebalance`, `AlarmNotification`, `ScheduledActions`, `AddToLoadBalancer`, `InstanceRefresh`) freezes one behavior while you troubleshoot, for example `ReplaceUnhealthy` to inspect a failing instance. A group that fails to launch any instance for more than 24 hours can receive an **administrative suspension**; fix the cause and resume the processes.
- Launch failures appear in the group's **activity history**: an unavailable instance type in an AZ, a vCPU quota, a deleted AMI, a missing key pair or security group, a KMS key the service-linked role cannot use.

> **Exam trap.** Instances in a warm pool are stopped or hibernated without waiting for user data to finish. Without a launch lifecycle hook, a half-configured instance can be put in service on the next scale out.

<!-- section: serverless-container-scaling | objectives: 2.1.1 -->
## Scaling containers and Lambda functions

**Amazon ECS service auto scaling** uses **Application Auto Scaling** to change the service's desired task count: target tracking (average CPU, average memory, ALB requests per target), step, scheduled and predictive policies. Scale-in is turned off while an ECS deployment is in progress; set a minimum of 0 to let a service scale to zero. On EC2 capacity, tasks also need instances: a capacity provider with managed scaling grows the underlying Auto Scaling group.

**AWS Lambda** scales by concurrency (execution environments running at once):

| Control | Effect |
| --- | --- |
| Account concurrency quota | 1,000 per Region by default, shared by all functions; Lambda keeps 100 unreserved, so at most 900 can be reserved by default |
| Reserved concurrency | Guarantees and **caps** a function's concurrency; no extra charge; requests above it are throttled |
| Provisioned concurrency | Pre-initialized environments on a version or alias, no cold start, extra charge; scheduled or utilization-based through Application Auto Scaling |
| Scaling rate | Each function adds up to 1,000 execution environments every 10 seconds |

> **Exam tip.** "A batch function must never use more than 50 concurrent executions so the downstream database isn't overwhelmed" is reserved concurrency of 50. "Latency-sensitive function suffers from cold starts during business hours" is provisioned concurrency scheduled with Application Auto Scaling.

<!-- section: caching | objectives: 2.1.2 -->
## Caching with CloudFront, ElastiCache and DAX

**Amazon CloudFront** absorbs read traffic at the edge. A **cache policy** sets the cache key (headers, cookies, query strings) and the TTLs; everything in the cache key is also sent to the origin, and an **origin request policy** forwards extra values without adding them to the key. Fewer values in the key mean a higher cache hit ratio.

| Origin response | CloudFront TTL |
| --- | --- |
| No `Cache-Control` or `Expires` header | Default TTL (24 hours when no cache policy is used) |
| `max-age` or `s-maxage` within the range | The header value (`s-maxage` wins for CloudFront, browsers use `max-age`) |
| Header below minimum or above maximum TTL | Clamped to the minimum or maximum TTL |
| `no-cache`, `no-store`, `private` with minimum TTL 0 | Not cached |
| Minimum, default and maximum TTL all 0 | Caching disabled |

**Origin Shield** adds a regional caching layer in front of the origin so that, ideally, one request per object reaches it: useful for viewers spread across Regions or a constrained on-premises origin. For frequently updated files, versioned file names are cheaper and more reliable than invalidations.

**Amazon ElastiCache** offloads repeated database reads and session data:

| Need | Choice |
| --- | --- |
| No capacity planning, automatic scaling, Multi-AZ replication built in | ElastiCache Serverless (Valkey, Redis OSS or Memcached), billed per GB stored and ECPU |
| Replicas, automatic failover, backups, complex data types | Valkey or Redis OSS node-based cluster |
| Scale writes and memory beyond one node, online resharding | Valkey or Redis OSS with **cluster mode enabled** |
| Multithreaded, simple key-value cache, add or remove nodes | Memcached (no replication, no failover) |

Node-based Valkey and Redis OSS clusters with cluster mode enabled support **auto scaling of shards and replicas** (target tracking on engine CPU or database capacity usage). Caching strategies: **lazy loading** caches only requested data but returns stale data and costs three trips on a miss; **write-through** keeps the cache fresh but caches data that is never read; add a **TTL** to bound staleness.

**DynamoDB Accelerator (DAX)** is a write-through, in-VPC cache for DynamoDB with microsecond reads and no change beyond the DAX client. The item cache TTL is 5 minutes by default. Only eventually consistent reads are served from the cache; strongly consistent reads pass through to DynamoDB.

> **Exam trap.** DAX doesn't help a workload that uses strongly consistent reads, and it doesn't cache other databases. For RDS read offload, use ElastiCache or read replicas.

<!-- section: rds-aurora-scaling | objectives: 2.1.3 -->
## Scaling Amazon RDS and Aurora

| Need | Mechanism |
| --- | --- |
| More CPU or memory | Modify the DB instance class, immediately or in the maintenance window (brief interruption) |
| Storage filling up | **Storage autoscaling**: set a maximum storage threshold (`--max-allocated-storage`) |
| Read-heavy workload on RDS | Read replicas: up to 15 per primary, asynchronous, automatic backups must be on (retention not 0), monitor `ReplicaLag` |
| Read-heavy workload on Aurora | Up to 15 Aurora Replicas behind the reader endpoint, added and removed by **Aurora Auto Scaling** (target tracking, default cooldowns 300 seconds) |
| Unpredictable or intermittent load on Aurora | **Aurora Serverless v2** |
| Too many connections from Lambda or a large fleet | **RDS Proxy** connection pooling |

Storage autoscaling starts when free space is 10 % of allocated storage or less for at least five minutes, and at most four modifications in 24 hours have run. Each increase is the largest of 10 GiB, 10 % of allocated storage, or the growth predicted for the next 7 hours. It never shrinks storage, and the maximum threshold must be at least 10 % above current storage.

Aurora Serverless v2 scales in steps as small as 0.5 **Aurora capacity unit (ACU)** (about 2 GiB of memory each), from a minimum that can be 0 (automatic pause on recent versions) up to 256 ACUs (384 for some Aurora PostgreSQL versions). A cluster can mix provisioned and Serverless v2 instances; readers in promotion tiers 0 and 1 keep at least the writer's capacity so a failover doesn't land on a small instance.

> **Exam trap.** Aurora Auto Scaling only works if the cluster already has at least one reader, and it removes only the replicas it created. Creating a read replica doesn't fix a write bottleneck: scale the writer instance class (or Serverless v2 maximum) instead.

<!-- section: dynamodb-scaling | objectives: 2.1.3 -->
## Scaling Amazon DynamoDB

| Requirement | Capacity mode |
| --- | --- |
| Unknown or spiky traffic, no capacity management (default, recommended) | On-demand |
| Steady, predictable traffic, lowest cost | Provisioned with auto scaling |

Provisioned auto scaling uses Application Auto Scaling target tracking with a target utilization between 20 % and 90 % (the console suggests 70 %). It reacts after consumed capacity exceeds the target for two consecutive minutes and takes several minutes to apply, so requests above the old capacity are throttled meanwhile; burst capacity absorbs only short spikes. Scale-down follows 15 consecutive data points below the target. Each **global secondary index has its own capacity** and needs its own scaling policy: an under-provisioned GSI throttles writes to the base table.

You can switch a table from provisioned to on-demand up to four times in a rolling 24-hour window, and back to provisioned at any time.

> **Exam tip.** "Throttling on a provisioned table during short, unpredictable bursts although auto scaling is enabled" points to on-demand mode. "Hot reads of the same items" points to DAX, not more capacity.

<!-- section: key-points -->
## Key points

- ELB health checks on the group, a realistic grace period and a default instance warmup prevent most replacement loops and flapping.
- Target tracking for most cases (never edit its alarms), step for graduated reactions, scheduled for calendar peaks, predictive (forecast only first) for recurring patterns; only simple scaling uses the cooldown.
- Lifecycle hooks: `Pending:Wait` and `Terminating:Wait`, timeout 30 to 7,200 seconds (default 3,600, default result `ABANDON`). Warm pools cut boot latency; suspended processes help troubleshooting.
- ECS uses Application Auto Scaling; Lambda concurrency: 1,000 per Region by default, reserved caps, provisioned removes cold starts.
- CloudFront cache policies and TTLs, Origin Shield; ElastiCache Serverless or node-based Valkey/Redis OSS for replicas and failover, Memcached for multithreaded simple caching; DAX for eventually consistent DynamoDB reads.
- RDS: modify the class, storage autoscaling, up to 15 read replicas; Aurora Auto Scaling of replicas, Serverless v2 in 0.5-ACU steps, RDS Proxy for connections.
- DynamoDB: on-demand for spikes, provisioned with 20–90 % target tracking for steady load, scale every GSI.
