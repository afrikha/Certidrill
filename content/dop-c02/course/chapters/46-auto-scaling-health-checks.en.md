Automated monitoring only pays off when capacity follows demand and broken components are taken out of service without a human. This chapter covers which AWS services scale themselves and how to configure them (EC2 Auto Scaling, Application Auto Scaling for DynamoDB, ECS, Aurora and Lambda, RDS storage autoscaling, ECS capacity providers, Amazon EKS autoscalers), then the health checks that feed load balancers, Auto Scaling groups and Route 53 failover.

<!-- section: auto-scaling-capabilities | objectives: 4.3.2 -->
## Auto scaling capabilities across AWS services

| Resource | What scales | Mechanism |
| --- | --- | --- |
| EC2 instances | Number of instances in an **Auto Scaling group** | EC2 Auto Scaling: target tracking, step, simple, scheduled and predictive policies |
| DynamoDB table or GSI in provisioned mode | Read and write capacity units | **Application Auto Scaling** target tracking on utilization (20–90 %) |
| DynamoDB in on-demand mode | Nothing to configure | Capacity follows traffic, billed per request |
| ECS service | Desired task count | Application Auto Scaling (CPU, memory, `ALBRequestCountPerTarget`, custom metrics) |
| ECS cluster on EC2 | Container instances | **Capacity provider** with managed scaling of its Auto Scaling group |
| Fargate | Nothing at cluster level | Each task gets its own capacity; scale the service |
| Aurora | Number of Aurora Replicas | Application Auto Scaling (`RDSReaderAverageCPUUtilization`, `RDSReaderAverageDatabaseConnections`) |
| Aurora Serverless v2 | Capacity of each instance, in ACUs | Automatic, between the minimum and maximum ACUs you set |
| RDS DB instance | Allocated storage | **Storage autoscaling** (`MaxAllocatedStorage`) |
| Lambda | Concurrency, automatically | Provisioned concurrency can itself be scaled by Application Auto Scaling (`LambdaProvisionedConcurrencyUtilization`) |
| EKS | Pods and nodes | Horizontal Pod Autoscaler, Vertical Pod Autoscaler; **Cluster Autoscaler** or **Karpenter** for nodes; EKS Auto Mode manages nodes for you |

> **Exam trap.** Aurora storage grows automatically: there's nothing to enable. RDS storage autoscaling applies to RDS DB instances, never shrinks storage, and doesn't add read replicas. Read scaling on Aurora is replica auto scaling; on RDS, replicas are added manually.

<!-- section: ec2-auto-scaling | objectives: 4.3.5 -->
## Configuring EC2 Auto Scaling groups

| Policy | Behaviour | Choose it when |
| --- | --- | --- |
| Target tracking | Keeps a metric at a target (`ASGAverageCPUUtilization`, `ASGAverageNetworkIn`, `ASGAverageNetworkOut`, `ALBRequestCountPerTarget`, or a custom metric or metric math) | Default choice: "keep CPU at 50 %" |
| Step scaling | Adds or removes capacity in steps by alarm breach size | Different reactions to small and large breaches |
| Scheduled | Sets min, max, desired at a time (cron) | Known peaks (business hours, month-end batch) |
| Predictive | Forecasts load from history (daily and weekly patterns) and launches capacity ahead; mode **forecast only** or **forecast and scale** | Recurring patterns with slow-starting instances |

Settings that decide exam answers:

- **Queue-driven workers**: scale on backlog per instance (`ApproximateNumberOfMessagesVisible` divided by `GroupInServiceInstances`) with a target tracking policy using metric math, not on raw queue length.
- **Default instance warmup**: stops new instances' metrics from triggering further scaling before they serve traffic.
- **Warm pools**: pre-initialized instances kept `Stopped`, `Running` or `Hibernated`, to cut scale-out time for applications with long boot or bootstrap; an instance reuse policy can return instances to the pool on scale-in.
- **Lifecycle hooks**: pause an instance in `Pending:Wait` (configure software, register it) or `Terminating:Wait` (drain, copy logs) for one hour by default; extend with `record-lifecycle-action-heartbeat`, finish with `complete-lifecycle-action`. Notifications go to EventBridge, SNS or SQS.
- **Mixed instances policy**: several instance types, On-Demand base plus Spot with the `price-capacity-optimized` allocation strategy, and Capacity Rebalancing.
- **Instance refresh**: replaces instances after a launch template change, with minimum healthy percentage, checkpoints, skip matching and automatic rollback on alarms.

```bash
aws autoscaling put-scaling-policy --auto-scaling-group-name web-asg \
  --policy-name cpu50 --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ASGAverageCPUUtilization"},
    "TargetValue": 50.0
  }'
```

> **Exam trap.** A target tracking policy creates and manages its own CloudWatch alarms: don't edit or delete them. Several target tracking policies on one group can coexist; the group scales out if any policy asks and scales in only when all agree.

<!-- section: service-scaling-config | objectives: 4.3.5, 4.3.2 -->
## Configuring DynamoDB, ECS, RDS storage and EKS scaling

**Application Auto Scaling** always takes two calls: register the scalable target (service namespace, resource ID, scalable dimension, min and max), then attach a policy.

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/Orders \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --min-capacity 100 --max-capacity 4000

aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb --resource-id table/Orders \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --policy-name orders-wcu-70 --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "PredefinedMetricSpecification": {"PredefinedMetricType": "DynamoDBWriteCapacityUtilization"},
    "TargetValue": 70.0
  }'
```

**DynamoDB**: target utilization between 20 and 90 %. Scale-out triggers when consumed capacity exceeds the target for two consecutive minutes; scale-in after 15 consecutive data points below it, and the update itself takes several minutes, so sudden spikes are throttled meanwhile. Configure each GSI too (a throttled GSI throttles writes to its table). For spiky or unpredictable traffic, **on-demand** mode is the answer.

**ECS service** scaling uses `ecs:service:DesiredCount` with `ECSServiceAverageCPUUtilization`, `ECSServiceAverageMemoryUtilization` or `ALBRequestCountPerTarget`. Services on EC2 also need cluster capacity:

| Capacity provider setting | Effect |
| --- | --- |
| Managed scaling | ECS creates a target tracking policy on the Auto Scaling group driven by `CapacityProviderReservation` (instances needed ÷ instances running × 100) |
| `targetCapacity` 100 (default) | No spare instances; new tasks wait in `PENDING` until instances join |
| `targetCapacity` below 100 | Keeps headroom so tasks start immediately, at higher cost |
| Managed termination protection | ECS sets scale-in protection on instances running tasks, so scale-in only removes empty instances |
| Strategy `base` and `weight` | `base` = minimum tasks on one provider; `weight` = ratio of the rest (for example On-Demand base 2, then Spot weight 3 to On-Demand weight 1) |

Don't attach your own scaling policies to an Auto Scaling group managed by a capacity provider. Fargate and Fargate Spot capacity providers need no cluster scaling.

**RDS storage autoscaling**: set `--max-allocated-storage` above the allocated storage. RDS adds storage when free space is 10 % or less of allocated storage for at least 5 minutes, the previous storage optimization has completed, and fewer than four storage modifications happened in the past 24 hours. The increment is the largest of 10 GiB, 10 % of allocated storage, or the predicted growth over the next 7 hours.

**Amazon EKS**: the Horizontal Pod Autoscaler (needs the Kubernetes Metrics Server) scales pod replicas; pods that can't be scheduled trigger node scaling by the **Cluster Autoscaler** (adjusts managed node groups' Auto Scaling groups) or **Karpenter** (launches right-sized EC2 instances directly from NodePools, consolidates underused nodes). **EKS Auto Mode** runs this node scaling for you.

> **Exam trap.** "Scale the ECS service" and "scale the cluster" are different layers. More tasks with no room on the instances stay `PENDING`: the fix is a capacity provider with managed scaling, not a bigger service maximum.

<!-- section: health-check-capabilities | objectives: 4.3.4 -->
## Health check capabilities in AWS services

| Service | Health signal | Action on failure |
| --- | --- | --- |
| EC2 | System, instance and attached EBS status checks | Alarm actions, automatic recovery (system check) |
| ALB, NLB target groups | Periodic HTTP, HTTPS, TCP or gRPC checks per target | Stops routing to the target; **fails open** to all targets if none is healthy |
| EC2 Auto Scaling | EC2 status (always), plus optional **ELB**, **VPC Lattice** and **EBS** checks, and custom health (`set-instance-health`) | Terminates and replaces the unhealthy instance |
| ECS | Container `healthCheck` in the task definition, plus load balancer checks | Stops and replaces the task; deployment circuit breaker rolls back failed deployments |
| Route 53 | Endpoint, **calculated** and **CloudWatch alarm** health checks | DNS stops returning the unhealthy record (failover, weighted, latency, multivalue routing) |
| EKS | Liveness, readiness and startup probes; target group checks through the AWS Load Balancer Controller | Restarts the container or removes the pod from endpoints |

> **Exam trap.** By default an Auto Scaling group only uses EC2 status checks. An instance whose application returns 500 errors stays `InService` until you set the group's health check type to **ELB**; only then does the group replace instances the load balancer marks unhealthy.

> **Exam tip.** Keep load balancer health checks **shallow** (the process answers) and monitor dependencies separately. A deep check that fails when the shared database is slow marks every target unhealthy at once, which triggers fail-open on the ALB or a replacement storm in the Auto Scaling group.

<!-- section: configuring-health-checks | objectives: 4.3.11, 4.3.4 -->
## Configuring ALB, Auto Scaling and Route 53 health checks

**ALB target group defaults** (instance and IP targets):

| Setting | Default | Range |
| --- | --- | --- |
| Protocol and path | HTTP, `/` | HTTP or HTTPS, any path |
| Port | Traffic port | Any port |
| Interval | 30 seconds | 5–300 |
| Timeout | 5 seconds | 2–120 |
| Healthy threshold | 5 | 2–10 |
| Unhealthy threshold | 2 | 2–10 |
| Success codes | 200 | 200–499 (gRPC 0–99, default 12) |

```bash
aws elbv2 modify-target-group --target-group-arn "$TG_ARN" \
  --health-check-path /health --health-check-interval-seconds 10 \
  --healthy-threshold-count 3 --unhealthy-threshold-count 2 \
  --matcher HttpCode=200-299

aws autoscaling update-auto-scaling-group --auto-scaling-group-name web-asg \
  --health-check-type ELB --health-check-grace-period 120
```

The **health check grace period** delays ELB and other optional checks on new instances: 300 seconds by default in the console, 0 with the CLI or an SDK. With launch lifecycle hooks it can be 0, because the instance only enters `InService` once initialized. A new target stays in the `initial` state until it passes its first checks.

**Route 53 health checks**:

- **Endpoint**: HTTP, HTTPS, TCP, optionally with string matching (the string must be in the first 5,120 bytes of the body). Interval 30 seconds or 10 seconds (fast, extra cost); **failure threshold** 3 by default. HTTP(S) endpoints must accept the TCP connection within 4 seconds and return 2xx or 3xx within 2 seconds. The endpoint is healthy when more than 18 % of the health checkers report it healthy. HTTPS checks don't validate certificates.
- **Calculated**: combines up to 255 child health checks with a minimum number that must be healthy.
- **CloudWatch alarm**: healthy when the alarm's data says `OK`; you choose healthy, unhealthy or last known status for insufficient data. Same account only. The classic way to watch a resource with no public endpoint; Route 53 also offers private endpoint checks run from a health check source in your VPC.
- The security groups and network ACLs of a public endpoint must allow the Route 53 health checker IP ranges (`ROUTE53_HEALTHCHECKS` in `ip-ranges.json`).

```json
{
  "Type": "HTTPS_STR_MATCH",
  "FullyQualifiedDomainName": "api.example.com",
  "Port": 443,
  "ResourcePath": "/health",
  "SearchString": "\"status\":\"ok\"",
  "RequestInterval": 10,
  "FailureThreshold": 3
}
```

For **failover routing**, associate a health check with the primary record. An **alias** record pointing to an ALB can instead set **Evaluate target health**, which uses the load balancer's own target health without a separate Route 53 health check. Health checks also emit the `HealthCheckStatus` metric in CloudWatch (us-east-1) for alarms and SNS notifications.

> **Exam trap.** Route 53 health checkers come from the internet: a health check on a private IP address or an internal ALB always fails. Use a CloudWatch alarm-based health check (or a private endpoint check from your VPC) for private resources.

<!-- section: key-points -->
## Key points

- EC2 → Auto Scaling group policies; DynamoDB, ECS services, Aurora replicas, Lambda provisioned concurrency → Application Auto Scaling (register target, then policy); RDS → storage autoscaling; Aurora storage → automatic; EKS → HPA plus Cluster Autoscaler or Karpenter.
- Target tracking first; predictive and warm pools for slow-starting instances; backlog per instance for queue workers.
- DynamoDB: target 20–90 %, reacts in minutes; on-demand for spiky traffic. ECS on EC2: capacity provider with managed scaling and termination protection.
- RDS storage autoscaling: free space at most 10 % for 5 minutes, increment the largest of 10 GiB, 10 % or 7-hour forecast, capped by `MaxAllocatedStorage`.
- Auto Scaling group health type ELB to replace instances failing application checks; grace period 300 s console, 0 s CLI.
- ALB health check defaults 30 s interval, 5 s timeout, 5 healthy, 2 unhealthy, code 200; fail-open when no target is healthy.
- Route 53: endpoint checks (18 % of checkers, 30 s or 10 s, threshold 3), calculated checks, CloudWatch alarm checks for private resources; Evaluate target health on alias records.
