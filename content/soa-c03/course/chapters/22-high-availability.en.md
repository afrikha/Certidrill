A highly available workload keeps serving when an instance, a database host or a whole Availability Zone fails. For the CloudOps engineer that means two jobs: making health checks report the truth (load balancer target groups, Route 53) and configuring the redundancy that health checks fail over to (Multi-AZ databases, Auto Scaling groups across AZs, zonal shift). Exam questions describe a symptom, such as healthy instances marked unhealthy or a failover that took too long, and ask for the setting to change.

<!-- section: elb-health-checks | objectives: 2.2.1 -->
## Elastic Load Balancing health checks

Each target group runs its own health checks against every registered target; the load balancer routes only to targets in the `healthy` state.

| Setting | Application Load Balancer default | Network Load Balancer default |
| --- | --- | --- |
| Protocol | HTTP (HTTP or HTTPS allowed) | TCP (HTTP and HTTPS allowed) |
| Port | Traffic port of the target | Traffic port of the target |
| Path | `/` (`/AWS.ALB/healthcheck` for gRPC) | `/` for HTTP or HTTPS checks |
| Interval | 30 seconds (range 5–300) | 30 seconds (range 5–300) |
| Timeout | 5 seconds | 6 seconds (HTTP), 10 seconds (TCP, HTTPS) |
| Healthy threshold | 5 consecutive successes | 5 |
| Unhealthy threshold | 2 consecutive failures | 2 |
| Success codes | 200 (configurable 200–499) | 200–399 |

With the ALB defaults, a new target needs 5 × 30 seconds, so about two and a half minutes, before it receives traffic; lower the interval or the healthy threshold to bring capacity online faster. A target that fails twice in a row stops receiving new requests.

Related behavior:

- **Fail open**: if every target in all enabled AZs is unhealthy, the load balancer routes to all of them anyway. A Network Load Balancer also fails open on an empty target group, and removes an AZ's IP address from DNS when that AZ has no healthy target.
- **Deregistration delay** (connection draining): 300 seconds by default; in-flight requests finish before the target is removed. Shorten it for short requests to speed up deployments and scale in.
- **Auto Scaling integration**: target group health replaces instances only when the group uses the **ELB** health check type.
- **Weighted target groups**: if one target group of a weighted forward action has only unhealthy targets, the ALB doesn't fail over to the other one automatically.

> **Exam trap.** A health check path that queries the database marks every target unhealthy when the database slows down, and the fleet fails open or gets replaced in a loop. Point the check at a lightweight page that tests the instance itself.

<!-- section: elb-troubleshooting | objectives: 2.2.1 -->
## Troubleshooting unhealthy targets

Read the reason code first: codes that start with `Elb` come from the load balancer, codes that start with `Target` from the target.

```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:eu-west-1:111122223333:targetgroup/web-tg/6d0ecf831eec9f09 \
  --query "TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Reason]" \
  --output text
```

| Reason code | Likely cause | Fix |
| --- | --- | --- |
| `Elb.InitialHealthChecking` | Target just registered | Wait for the healthy threshold; check the grace period |
| `Target.Timeout` | Security group or network ACL blocks the health check port, or the application is too slow | Allow the load balancer's security group on the health check port; raise the timeout |
| `Target.ResponseCodeMismatch` | Path returns 301/302 (HTTP to HTTPS redirect), 403 or 404 | Fix the path or add the code to the success codes |
| `Target.FailedHealthChecks` | Application down, port closed, health check protocol mismatch | Check the service and the health check port and protocol |
| `Target.NotInUse` | Target in an AZ not enabled on the load balancer, or the target group isn't used by a listener rule | Enable the AZ or attach the target group |
| `Target.DeregistrationInProgress` | Target being removed | Wait for the deregistration delay |

> **Exam tip.** "Instances behind an ALB are healthy when tested locally but show `Target.Timeout`" is almost always a security group on the instances that doesn't allow traffic from the ALB's security group on the health check port.

<!-- section: route53-health-checks | objectives: 2.2.1 -->
## Amazon Route 53 health checks

Route 53 health checks decide which records DNS returns with failover, weighted, latency, geolocation and multivalue answer routing. Types:

| Type | Monitors |
| --- | --- |
| Endpoint (public) | An IP address or domain name over HTTP, HTTPS or TCP, optionally with string matching in the first 5,120 bytes of the body |
| Private endpoint | A resource reachable from your VPC (private subnet, on premises through VPN or Direct Connect), from a health check source created in the VPC |
| Calculated | Up to 255 child health checks, healthy when at least the number you choose are healthy |
| CloudWatch alarm | The alarm's data stream: OK is healthy, ALARM is unhealthy; choose the status for insufficient data |
| ARC routing control | An on/off switch you set during a controlled failover |

How a public endpoint check decides:

- Health checkers in several Regions probe every 30 seconds (standard) or 10 seconds (fast); the endpoint is unhealthy after the **failure threshold** (default 3) of consecutive failures.
- The endpoint is healthy if **more than 18 %** of health checkers report it healthy.
- HTTP and HTTPS: TCP connection within 4 seconds, then a 2xx or 3xx status within 2 seconds. TCP: connection within 10 seconds. HTTPS checks don't validate the certificate.
- Firewalls and security groups must allow the health checkers: use the AWS-managed prefix list `com.amazonaws.<region>.route53-healthchecks`.
- Health check metrics (`HealthCheckStatus`, `HealthCheckPercentageHealthy`) exist only in **us-east-1**: create alarms and their SNS topics there.

For alias records to a load balancer or another alias, set **Evaluate Target Health** to Yes instead of creating a separate check; with No, Route 53 keeps returning the record even if the targets are failing. A non-alias record without a health check is always considered healthy.

> **Exam trap.** A public endpoint health check can't reach an instance in a private subnet. Use a private endpoint health check, or a CloudWatch alarm on a metric that reflects the resource's health and a health check that monitors that alarm.

<!-- section: multi-az-compute | objectives: 2.2.2 -->
## Fault-tolerant compute, networking and storage across AZs

| Component | Fault-tolerant configuration |
| --- | --- |
| EC2 fleet | Auto Scaling group with subnets in at least two (preferably three) AZs; it launches in the AZ with the fewest instances and rebalances (launching before terminating) when an AZ recovers |
| Application Load Balancer | At least two AZs required; cross-zone load balancing always on at the load balancer level (can be turned off per target group) |
| Network and Gateway Load Balancer | Cross-zone load balancing off by default; turn it on when targets are unevenly spread across AZs |
| NAT gateway | Zonal resource: one per AZ, with each private subnet's route table pointing to the NAT gateway in its own AZ |
| Amazon EFS | Regional file system (data in several AZs) for production; One Zone is cheaper but zonal |
| Amazon FSx | Multi-AZ deployment (Windows File Server, ONTAP) adds a standby in another AZ |
| EBS volume | Lives in one AZ: rely on snapshots and a multi-AZ application tier |

**Amazon Application Recovery Controller (ARC) zonal shift** moves a supported resource's traffic (for example a load balancer with its targets) away from an impaired AZ, for one minute up to three days, extendable and cancellable. Resources must be opted in, and you must **prescale** the remaining AZs first. **Zonal autoshift** lets AWS start the shift itself when its telemetry detects an AZ impairment; it requires weekly **practice runs** (about 30 minutes each) that report `SUCCEEDED` or `FAILED`.

> **Exam tip.** "Workload in two AZs must survive the loss of one AZ at full capacity" means sizing each AZ for 100 % of the load (static stability), not relying on Auto Scaling to launch replacements during the event.

<!-- section: multi-az-databases | objectives: 2.2.2 -->
## Multi-AZ databases and caches

| Option | Standby | Readable | Replication | Failover |
| --- | --- | --- | --- | --- |
| RDS Multi-AZ DB instance deployment | One, in another AZ | No | Synchronous | Typically 60–120 seconds; the endpoint DNS record moves to the standby |
| RDS Multi-AZ DB cluster (MySQL, PostgreSQL) | Two readers in two other AZs | Yes | Semisynchronous (one reader acknowledges) | Depends on replica lag; readers are failover targets |
| Aurora cluster | Aurora Replicas, priority tiers 0 (highest) to 15 | Yes | Shared storage, six copies across AZs | Typically under 60 seconds, often under 30; without replicas, the writer is recreated in the same AZ (usually under 10 minutes) |
| ElastiCache Valkey or Redis OSS | Replicas in other AZs | Yes | Asynchronous by default | Multi-AZ with automatic failover promotes a replica |

Operating facts:

- Convert a Single-AZ RDS instance with **modify** and the Multi-AZ option; test with **Reboot with failover**. Automatic failover triggers: primary host or storage failure, loss of network connectivity, OS patching, an unresponsive primary, a modification, or a user-requested failover. Subscribe to **RDS event notifications** to learn about a failover.
- Applications must reconnect after a failover. Keep DNS caching short (for Java, a JVM DNS TTL of 60 seconds or less) and always connect through the endpoint, never an IP address. **RDS Proxy** keeps client connections open and can reduce failover time by up to 66 % for Aurora.
- Aurora promotes the replica in the highest-priority tier, then the largest one in that tier. Place readers in different AZs from the writer.
- A Multi-AZ standby isn't a read scaling solution: for reads, use read replicas, a Multi-AZ DB cluster or Aurora Replicas.

> **Exam trap.** A read replica in another AZ isn't automatic failover: promoting it is a manual action and creates a standalone instance with a new endpoint. "Automatic failover with no application change" is Multi-AZ.

<!-- section: key-points -->
## Key points

- ALB defaults: HTTP on `/`, every 30 seconds, timeout 5 seconds, 5 healthy / 2 unhealthy, success code 200; NLB defaults to TCP. All targets unhealthy means fail open.
- Read the reason code: `Target.Timeout` is usually a security group, `Target.ResponseCodeMismatch` a redirect or a wrong path, `Target.NotInUse` an AZ not enabled.
- Turn on the ELB health check type on the Auto Scaling group; deregistration delay defaults to 300 seconds.
- Route 53: checkers every 30 or 10 seconds, failure threshold 3, healthy above 18 %, allow the `route53-healthchecks` prefix list, metrics only in us-east-1, Evaluate Target Health for alias records; private endpoint or CloudWatch alarm checks for private resources.
- Spread Auto Scaling groups across AZs, one NAT gateway per AZ, EFS Regional and FSx Multi-AZ; ARC zonal shift (up to three days) and zonal autoshift with practice runs.
- RDS Multi-AZ instance: one non-readable synchronous standby, 60–120 second failover; Multi-AZ DB cluster: two readable readers; Aurora: tiered replicas, failover usually under 30–60 seconds; RDS Proxy shortens failover.
