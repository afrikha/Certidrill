A highly available architecture keeps serving when a component, an instance or a whole Availability Zone fails. SAA-C03 questions point at a single point of failure (one instance, one NAT gateway, a Single-AZ database, a legacy server nobody may modify) and ask for the design that removes it, the metric that proves it, or the automation that keeps the infrastructure intact. Multi-Region recovery is in the next chapter.

<!-- section: multi-az-design | objectives: 2.2.8, 2.2.16 -->
## Removing single points of failure across Availability Zones

An Availability Zone is one or more data centers with redundant power, networking and connectivity; every Region has at least three. The basic rule: **every tier runs in at least two AZs**, and a failure is detected and routed around automatically.

| Single point of failure | Highly available design |
| --- | --- |
| One EC2 instance | Auto Scaling group across two or three AZs behind a load balancer |
| One NAT gateway for all private subnets | One zonal NAT gateway per AZ with per-AZ route tables, or a regional NAT gateway |
| Single-AZ RDS instance | RDS Multi-AZ (DB instance or DB cluster) or Aurora with a replica in another AZ |
| Self-managed cache on one instance | ElastiCache (Valkey or Redis OSS) with replicas and Multi-AZ automatic failover |
| Files on one EBS volume shared by several servers | Amazon EFS (Regional, multi-AZ) or FSx Multi-AZ |
| One Site-to-Site VPN tunnel or one Direct Connect link | Both VPN tunnels, a second Direct Connect connection or a VPN as backup |

The load balancer is the hinge of the design. It runs nodes in every enabled AZ, health-checks each target and sends traffic only to healthy ones. Configure the Auto Scaling group with **`HealthCheckType: ELB`** so that an instance that fails the load balancer health check (application down while the OS is fine) is replaced, not only an instance that fails EC2 status checks.

```yaml
WebAsg:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MinSize: "3"
    MaxSize: "9"
    DesiredCapacity: "3"
    VPCZoneIdentifier:
      - !Ref PrivateSubnetA
      - !Ref PrivateSubnetB
      - !Ref PrivateSubnetC
    LaunchTemplate:
      LaunchTemplateId: !Ref WebLaunchTemplate
      Version: !GetAtt WebLaunchTemplate.LatestVersionNumber
    TargetGroupARNs:
      - !Ref WebTargetGroup
    HealthCheckType: ELB
    HealthCheckGracePeriod: 300
```

**Static stability**: provision enough capacity in the remaining AZs to absorb the loss of one AZ without waiting for scaling. With three AZs and a peak need of six instances, run three per AZ (nine), so that two AZs still hold six.

> **Exam trap.** "Minimum two instances" doesn't mean highly available if both are in the same AZ. Look for subnets in different AZs, and for the database, cache and NAT layers, which are often the remaining single points of failure.

<!-- section: route-tables | objectives: 2.2.3 -->
## Networking basics: route tables and subnets

Each subnet lives in one AZ and is associated with exactly one route table (the main route table if none is set explicitly). Every route table has a `local` route for the VPC CIDR. When several routes match, the most specific prefix wins.

| Subnet type | Default route | Notes |
| --- | --- | --- |
| Public | `0.0.0.0/0` to an internet gateway | Instances also need a public IPv4 or Elastic IP address |
| Private with outbound internet | `0.0.0.0/0` to a NAT gateway | Outbound only; no inbound connection from the internet |
| Isolated | No default route | Reaches AWS services through VPC endpoints |

```text
Route table rt-private-a (private subnet in AZ a)
Destination      Target
10.0.0.0/16      local
0.0.0.0/0        nat-0aaa (zonal NAT gateway in AZ a)
pl-xxxx (S3)     vpce-0123 (gateway endpoint)

Route table rt-private-b (private subnet in AZ b)
Destination      Target
10.0.0.0/16      local
0.0.0.0/0        nat-0bbb (zonal NAT gateway in AZ b)
pl-xxxx (S3)     vpce-0123 (gateway endpoint)
```

A **zonal NAT gateway** lives in one AZ, in a public subnet, with an Elastic IP address. If private subnets of every AZ route to a single one, the loss of that AZ cuts internet access for all AZs. Create one per AZ and one private route table per AZ. A **regional NAT gateway** is the newer alternative: one NAT gateway for the VPC that expands automatically into the AZs where workloads run, needs no public subnet, and is the single target of every private route table.

Gateway VPC endpoints (S3, DynamoDB) add a route with the service's prefix list to the chosen route tables, so traffic to those services doesn't depend on the NAT gateway at all.

> **Exam tip.** "Instances in a private subnet lost internet access when one AZ failed" means a single zonal NAT gateway: deploy a NAT gateway in each AZ and point each AZ's route table to its own (or use a regional NAT gateway).

<!-- section: database-ha | objectives: 2.2.9, 2.2.16 -->
## Highly available databases and proxies

| Option | Standbys | Replication | Readable standby | Failover |
| --- | --- | --- | --- | --- |
| RDS Multi-AZ DB instance | One, in another AZ | Synchronous | No | Automatic, typically 60–120 seconds; the endpoint's DNS record moves to the standby |
| RDS Multi-AZ DB cluster (MySQL, PostgreSQL) | Two, three AZs in total | Semisynchronous (one reader acknowledges) | Yes | Automatic, depends on replica lag; lower write latency than a DB instance deployment |
| Aurora | Up to 15 Aurora Replicas | Shared storage replicated across AZs | Yes, reader endpoint | Automatic promotion of a replica |
| DynamoDB | Not applicable | Managed, across multiple AZs | Yes | Nothing to configure |

Applications reconnect after a failover because the DNS name stays the same and points to the new primary; clients must not cache DNS for long (a JVM should use a TTL of 60 seconds or less).

**Amazon RDS Proxy** is a fully managed, highly available database proxy between the application and RDS or Aurora:

- **Connection pooling**: many short-lived clients (Lambda functions, autoscaled containers) share a small pool of database connections, so the database isn't exhausted by connection storms.
- **Faster, transparent failover**: the proxy keeps client connections open and reconnects to the new primary, instead of every client waiting for DNS.
- **Security**: clients can be required to authenticate with IAM; the proxy reads database credentials from Secrets Manager.
- Runs in the same VPC as the database, can't be publicly accessible, and its default endpoint spans two AZs. It connects to the writer instance; it isn't a read replica.

> **Exam trap.** "Lambda functions open too many connections and the database runs out of memory" is solved by RDS Proxy, not by a bigger instance class or read replicas.

<!-- section: distributed-patterns | objectives: 2.2.5 -->
## Distributed design patterns

Distributed systems fail partially: a dependency slows down, a call times out, a message arrives twice. The Well-Architected Reliability Pillar recommends:

| Pattern | What it does | AWS examples |
| --- | --- | --- |
| Timeouts | Never wait indefinitely for a dependency | Client timeouts in the SDK, ALB idle timeout, Lambda timeout |
| Retries with exponential backoff and jitter | Retry transient errors at growing, randomized intervals, a limited number of times, at one layer only | Built into the AWS SDKs; Step Functions `Retry` |
| Idempotency | Repeating an operation has the same effect as doing it once, so retries and duplicate messages are safe | Idempotency keys stored in DynamoDB, SQS FIFO deduplication |
| Throttling and load leveling | Protect a service from more requests than it can handle | API Gateway throttling and usage plans, SQS between tiers |
| Fail fast and circuit breaking | Stop calling a dependency that is failing and return a fallback | Return cached content, serve a static page from S3 |
| Bulkheads and cells | Isolate failures to a part of the system | Separate queues and functions per customer tier, cell-based architecture |
| Static stability | Keep working without control plane actions during an impairment | Pre-provisioned capacity in each AZ |
| Graceful degradation | Offer reduced functionality instead of an outage | CloudFront serves cached pages; non-critical features disabled |

> **Exam tip.** Retries without jitter make all clients retry together and create traffic spikes; retries on non-idempotent operations (charging a card) create duplicates. The safe answer combines backoff, jitter, a retry limit and idempotency.

<!-- section: immutable-automation | objectives: 2.2.7, 2.2.13 -->
## Immutable infrastructure and automation

**Immutable infrastructure** forbids in-place changes to production resources. A change (patch, new version, configuration) is built as new resources, deployed beside the old ones, then traffic is switched; rollback means switching back.

- **Golden images**: bake software into AMIs (EC2 Image Builder automates building and testing them) or container images; reference them in a new launch template version.
- **Replace, don't patch**: Auto Scaling **instance refresh** replaces instances with the new launch template version in batches; Elastic Beanstalk offers immutable and traffic-splitting deployment policies.
- **Blue/green**: a full parallel environment, with traffic shifted by Route 53 weighted records or ALB weighted target groups.

Automation keeps the infrastructure in its intended state:

| Goal | Service |
| --- | --- |
| Create and update every resource from versioned templates | AWS CloudFormation (change sets preview changes; failed updates roll back) |
| Detect manual changes to stack resources | CloudFormation drift detection |
| Prevent accidental replacement or deletion of critical resources | Stack policies, termination protection, `DeletionPolicy: Retain` |
| Continuously evaluate configuration and fix deviations | AWS Config rules with automatic remediation (Systems Manager Automation runbooks) |
| Patch and configure fleets on a schedule | Systems Manager Patch Manager and State Manager |
| Replace unhealthy capacity | Auto Scaling health checks, EC2 automatic recovery |

> **Exam trap.** Connecting to production instances to patch them by hand breaks immutability and causes drift. "Ensure every instance runs the same, tested configuration" means a new AMI or launch template version rolled out by instance refresh, not SSH and scripts.

<!-- section: observability | objectives: 2.2.12, 2.2.15 -->
## Metrics and workload visibility

Start from the business requirement, then pick the metric that proves it. An availability target of 99.9 % allows about 8.8 hours of downtime per year; 99.99 % allows about 53 minutes.

| Business requirement | Metric or signal (Amazon CloudWatch) |
| --- | --- |
| The site must answer | ALB `HealthyHostCount` and `UnHealthyHostCount`; Route 53 health checks; CloudWatch Synthetics canaries that run user journeys |
| Few failed requests | `HTTPCode_Target_5XX_Count` and `HTTPCode_ELB_5XX_Count` compared with `RequestCount` |
| Fast responses | `TargetResponseTime` at a high percentile (p99), not only the average |
| Orders processed in time | SQS `ApproximateAgeOfOldestMessage`, `ApproximateNumberOfMessagesVisible` |
| Readers see recent data | RDS `ReplicaLag` |
| Instance hardware healthy | EC2 `StatusCheckFailed_System` |

CloudWatch alarms act on these metrics (notify through SNS, scale, recover an instance); **composite alarms** combine several alarms to reduce noise; a Route 53 health check can follow a CloudWatch alarm to drive DNS failover.

**AWS X-Ray** traces requests across distributed components:

- A **trace** gathers every **segment** produced by one request (one per service); **subsegments** detail downstream calls (DynamoDB, an HTTP API, SQL).
- The **trace map** (service map) shows each service as a node with its latency and error rates, which locates the failing or slow component in a microservice chain.
- **Sampling** keeps cost down (by default, the first request each second plus 5 % of the others); **annotations** are indexed key-value pairs used to filter traces, **metadata** isn't indexed.
- The X-Ray SDKs and daemon are in maintenance mode since February 25, 2026: AWS recommends OpenTelemetry instrumentation to send traces to X-Ray.

> **Exam tip.** "Identify which microservice adds latency to user requests" means X-Ray. "Be alerted when the application stops answering" means a CloudWatch alarm on load balancer metrics or a Synthetics canary. CloudTrail records API calls; it doesn't measure availability.

<!-- section: legacy-apps | objectives: 2.2.19 -->
## Making legacy applications more reliable

When the application can't be changed, put reliability around it:

| Situation | Solution without code changes |
| --- | --- |
| A single stateful server that must survive hardware failure | EC2 automatic recovery (keeps instance ID, IP addresses, EBS volumes) or an Auto Scaling group with minimum = maximum = 1 to replace it |
| The server must be reachable at a fixed address after replacement | Elastic IP address, a Route 53 record or a load balancer DNS name |
| Several identical servers but no load balancing | An ALB or NLB with health checks in front |
| The database must survive an AZ failure | RDS Multi-AZ: same endpoint, automatic failover |
| Too many connections or slow failover | RDS Proxy (only the connection endpoint changes) |
| The application writes files to local disk and needs shared storage | Amazon EFS (NFS) or FSx for Windows File Server (SMB) mounted at the same path |
| An on-premises message broker (JMS, AMQP) | Amazon MQ |
| Clients have hard-coded IP addresses | Global Accelerator static IPs or NLB Elastic IPs in front of the new endpoints |

> **Exam trap.** "Without changing the application" rules out rewriting it for SQS, Lambda or DynamoDB. Prefer drop-in managed equivalents (Multi-AZ, EFS, Amazon MQ, a load balancer) that the application sees as the same endpoint or protocol.

<!-- section: managed-services | objectives: 2.2.2, 2.2.20 -->
## Managed and purpose-built services for reliability

A managed service shifts availability, scaling and patching to AWS. For AI features, use the managed API rather than hosting your own model:

| Requirement | Managed service |
| --- | --- |
| Sentiment, entities, key phrases, language detection or PII in text | Amazon Comprehend |
| Convert text to lifelike speech | Amazon Polly |
| Convert speech in audio or video to text | Amazon Transcribe |
| Translate text between languages | Amazon Translate |
| Detect objects, faces or unsafe content in images and videos | Amazon Rekognition |
| Extract text, forms and tables from scanned documents | Amazon Textract |
| Chatbot or voice conversational interface | Amazon Lex |
| Build, train and deploy custom ML models | Amazon SageMaker AI |

For processing at volume, call these APIs from an asynchronous pipeline (S3 event, SQS queue, Step Functions) so that throttling or a transient error leads to a retry, not a lost document.

Purpose-built services are highly available by design: S3 (Standard classes store data across at least three AZs), DynamoDB, Aurora, EFS Regional file systems, SQS, SNS, Lambda. A self-managed equivalent on EC2 would need that resilience engineered.

> **Exam tip.** "Analyze customer reviews for sentiment with the LEAST operational overhead" means Comprehend, not a model trained and hosted on SageMaker AI or EC2.

<!-- section: key-points -->
## Key points

- Every tier in two or more AZs; check database, cache, NAT and connectivity layers for hidden single points of failure.
- Auto Scaling with ELB health checks replaces unhealthy instances; static stability pre-provisions capacity for the loss of one AZ.
- Zonal NAT gateway per AZ with per-AZ route tables, or a regional NAT gateway; most specific route wins.
- RDS Multi-AZ for availability (DNS moves to the standby); RDS Proxy for connection pooling and faster failover.
- Timeouts, retries with backoff and jitter, idempotency, throttling and graceful degradation.
- Immutable infrastructure: new AMI or image, instance refresh, blue/green; CloudFormation drift detection and Config remediation keep integrity.
- CloudWatch metrics and alarms for availability, X-Ray traces to find the slow service.
- Legacy applications: wrap them with automatic recovery, load balancers, Multi-AZ, EFS, Amazon MQ; managed AI services instead of self-hosted models.
