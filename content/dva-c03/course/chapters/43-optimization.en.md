Optimization questions describe an application that works but is slow, throttled or expensive, and ask for the setting, API call or service that fixes it with the stated qualifier. Read the symptom (cold starts, throttles, a growing queue, a hot key), find the metric that proves it, then pick the smallest change that removes the bottleneck.

<!-- section: lambda-concurrency | objectives: 4.3.1 -->
## Lambda concurrency: reserved, provisioned and SnapStart

An execution environment handles one request at a time, so concurrency is the number of environments in use: **concurrency = average requests per second × average duration in seconds** (100 requests per second × 0.5 s = 50).

- **1,000 concurrent executions** per Region by default, shared by all functions (quota increase possible); **100 units always stay unreserved**.
- Each function can add **1,000 execution environments every 10 seconds**; beyond the available concurrency, requests are throttled (`TooManyRequestsException`).

| Requirement | Setting |
| --- | --- |
| Guarantee capacity to one function, or cap it to protect a downstream system | Reserved concurrency (no charge); 0 stops all invocations |
| Remove cold-start latency for a predictable baseline | Provisioned concurrency on a published version or alias (billed while configured) |
| Provisioned capacity that follows a schedule or the load | Application Auto Scaling on the alias: scheduled scaling or target tracking on `LambdaProvisionedConcurrencyUtilization` |
| Faster cold starts at no extra cost for a Java function | SnapStart on a published version (Java 11 and later; also Python 3.12+ and .NET 8+, with caching and restore charges) |

- Provisioned concurrency can't be set on `$LATEST` nor exceed reserved concurrency. Lambda runs the code outside the handler at allocation time, so put SDK clients and heavy imports there.
- Size it from the formula or the peak of `ConcurrentExecutions` plus about **10%**; extra requests spill over (`ProvisionedConcurrencySpilloverInvocations`).
- SnapStart can't be combined with provisioned concurrency, Amazon EFS or ephemeral storage above 512 MB.

```bash
# Keep 50 pre-initialized environments behind the "live" alias, then scale them at 70% utilization
aws lambda put-provisioned-concurrency-config \
  --function-name orders-api --qualifier live \
  --provisioned-concurrent-executions 50

aws application-autoscaling register-scalable-target \
  --service-namespace lambda \
  --resource-id function:orders-api:live \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 50 --max-capacity 200

aws application-autoscaling put-scaling-policy \
  --service-namespace lambda \
  --resource-id function:orders-api:live \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --policy-name pc-70 --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue": 0.7, "PredefinedMetricSpecification": {"PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"}}'
```

> **Exam trap.** Reserved concurrency reserves and limits; it doesn't pre-warm anything. "P99 latency spikes on the first requests after idle periods" is answered by provisioned concurrency (or SnapStart), never by raising reserved concurrency.

<!-- section: pools-scaling | objectives: 4.3.1 -->
## Connection pools, thread pools and scaling of servers

**Database connections from Lambda.** Each execution environment opens its own connection, so a spike can exhaust a relational database:

1. Open the connection (and SDK clients) **outside the handler** so warm invocations reuse it.
2. Add **Amazon RDS Proxy**: it pools and shares database connections, queues or rejects what it can't serve, and keeps application connections during a failover. It sits in the database's VPC, is never public, and uses Secrets Manager credentials or IAM authentication.
3. Cap the function with reserved concurrency if the database still can't take the peak.

**SDK connection pools and thread pools.** In a multithreaded application, the SDK's HTTP pool must match the threads that share a client:

| SDK | Pool setting | Default |
| --- | --- | --- |
| Python (boto3 / botocore) | `max_pool_connections` in `botocore.config.Config` | 10 connections |
| JavaScript v3 (Node.js) | `maxSockets` of the `https.Agent` passed to the request handler | 50 sockets; connections are reused (keep-alive) by default |

More threads than pooled connections makes threads wait: size the SDK pool to the threads and reuse one client per process.

```text
# Python: one client per process, pool sized for 32 worker threads
from botocore.config import Config
import boto3
from concurrent.futures import ThreadPoolExecutor

s3 = boto3.client("s3", config=Config(max_pool_connections=32))
with ThreadPoolExecutor(max_workers=32) as pool:
    pool.map(lambda key: s3.head_object(Bucket="media-bucket", Key=key), keys)
```

**Servers and containers.** On EC2, concurrency comes from instances: an **EC2 Auto Scaling** group with target tracking (average CPU, `ALBRequestCountPerTarget`, or SQS backlog per instance), an instance warmup equal to the boot time, and scheduled or predictive scaling for known peaks. ECS services scale tasks with Service Auto Scaling.

> **Exam tip.** "Too many connections" errors on Amazon RDS or Aurora after a Lambda traffic spike, with the LEAST code change: RDS Proxy. A bigger DB instance only moves the limit.

<!-- section: memory-compute | objectives: 4.3.2 -->
## Optimizing memory and compute

**Lambda.** Memory is the only sizing setting: 128 MB (default) to 10,240 MB in 1 MB steps, and **CPU is allocated in proportion to memory** (one vCPU equivalent at 1,769 MB). A CPU-, network- or memory-bound function often runs much faster with more memory, and the shorter duration offsets the higher price per GB-second.

| Signal | Action |
| --- | --- |
| `Max Memory Used` in the `REPORT` log line close to `Memory Size` | Increase memory (risk of out-of-memory errors) |
| `Max Memory Used` far below `Memory Size` and duration flat when memory drops | Reduce memory |
| CPU-bound code, long duration | Increase memory to get more CPU; test with AWS Lambda Power Tuning |
| Compute-intensive code with arm64 builds for all dependencies | Switch to the `arm64` architecture (AWS Graviton) for better price performance; rebuild the package, layers and container images |
| Large temporary files | Raise ephemeral storage (`/tmp`, 512 MB to 10,240 MB) |

- **AWS Lambda Power Tuning** (open source, on Step Functions in your account) runs the function at several memory settings and compares cost and speed.
- **AWS Compute Optimizer** (opt-in) recommends Lambda memory (x86_64 functions) and sizes for EC2, Auto Scaling groups, EBS and ECS on Fargate, from 14 days of CloudWatch metrics (93 days with paid enhanced infrastructure metrics).

**EC2 and containers.** Pick the family from the bottleneck (C for CPU, R for memory, I for local I/O); publish memory with the CloudWatch agent (not an EC2 default metric). In an ECS task definition, `memory` is the container's hard limit and `memoryReservation` its soft limit.

```bash
# Raise memory (and therefore CPU) for a CPU-bound function
aws lambda update-function-configuration \
  --function-name thumbnailer \
  --memory-size 2048
```

> **Exam trap.** There is no CPU setting on a Lambda function. "The function is CPU-bound" is answered by increasing memory, not by provisioned concurrency or a bigger timeout.

<!-- section: messaging | objectives: 4.3.3 -->
## Optimizing messaging with SQS and SNS

**Amazon SQS producers and consumers.**

| Goal | Setting |
| --- | --- |
| Fewer empty responses and API calls | Long polling: `WaitTimeSeconds` or queue `ReceiveMessageWaitTimeSeconds` above 0, up to 20 s |
| Fewer requests per message | `SendMessageBatch`, `DeleteMessageBatch`, `ReceiveMessage` with up to 10 messages per call |
| Payload above 1 MiB (SQS maximum) | Payload in S3, pointer in the message (Extended Client Library) |
| No duplicate processing | Visibility timeout longer than processing time |

**Lambda event source mapping for SQS** (Lambda long-polls and deletes messages of successful batches):

- **Batch size**: up to 10,000 (standard; above 10 needs a batching window of at least 1 second), 10 (FIFO). The batching window (up to 5 minutes) gives fewer, larger invocations.
- **Visibility timeout** of the queue: at least **6 times the function timeout** (plus the batching window); `maxReceiveCount` of the redrive policy at least 5.
- **Partial batch response**: set `ReportBatchItemFailures` and return the failed `itemIdentifier` values, so only those messages return to the queue.
- **Scaling**: 5 concurrent invocations at first, up to 300 more per minute, up to 1,250 per mapping. **Maximum concurrency** (2 to 1,000) caps one queue's consumers; keep reserved concurrency at least equal to it. **Provisioned mode** (pollers, extra cost) scales 3 times faster and excludes maximum concurrency.
- **FIFO**: concurrency is limited by the number of message group IDs.

```bash
aws lambda update-event-source-mapping \
  --uuid a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 5 \
  --function-response-types ReportBatchItemFailures \
  --scaling-config '{"MaximumConcurrency": 50}'
```

**Amazon SNS fan-out.** Publish once to a topic, subscribe one SQS queue per consumer: each consumer gets its copy and scales or fails on its own. Optimize it with:

- **Filter policies** on subscriptions (message attributes, or the JSON body with `FilterPolicyScope` = `MessageBody`): each queue receives only what it processes.
- **Raw message delivery** (SQS, HTTP/S, Firehose) to drop the SNS JSON envelope.
- **`PublishBatch`** (10 messages per call). Maximum message size 256 KiB by default, up to 1 MiB with the topic's `MaximumMessageSize`; larger payloads via S3 and the Extended Client Libraries.

```json
{
  "eventType": ["order_shipped"],
  "country": ["FR", "BE"]
}
```

> **Exam trap.** A consumer that receives every message from a topic and ignores 90% of them needs an SNS filter policy on its subscription, not code changes or a second topic per message type.

<!-- section: caching | objectives: 4.3.4 -->
## Implementing caching

| Where the repeated work is | Cache |
| --- | --- |
| Repeated eventually consistent DynamoDB reads, microsecond latency | DynamoDB Accelerator (DAX) |
| SQL results, computed objects, sessions, leaderboards | Amazon ElastiCache (Valkey, Redis OSS, Memcached) |
| Static and cacheable dynamic content for global users | Amazon CloudFront |
| Responses of a REST API stage | API Gateway caching |
| Configuration and secrets read on every invocation | Variables outside the handler, or the AWS Parameters and Secrets Lambda Extension (local cache, TTL 300 s by default) |

**ElastiCache strategies.**

| Strategy | How | Strength | Weakness |
| --- | --- | --- | --- |
| Lazy loading (cache-aside) | Read the cache; on a miss read the database and write the result to the cache | Only requested data is cached; a node failure isn't fatal | Miss penalty of 3 trips; data can be stale |
| Write-through | Write to the cache every time you write to the database | Cache data is never stale | Write penalty; caches data that is never read (churn); new nodes miss data |
| TTL on every key | Keys expire after a number of seconds | Bounds staleness and wasted space | Expired keys cause misses |

Combine them with a TTL. Valkey or Redis OSS for replication, failover, sorted sets and hashes, pub/sub, backups; Memcached for a simple multithreaded key-value cache.

**DAX.** API-compatible with DynamoDB (swap in the DAX client, inside a VPC). The **item cache** holds `GetItem`/`BatchGetItem` results, the **query cache** `Query`/`Scan` results, default TTL 5 minutes. Writes go to DynamoDB then DAX (write-through). **Strongly consistent reads pass through and aren't cached**; DAX doesn't suit write-intensive tables.

**CloudFront.** Long `Cache-Control: max-age` (or `s-maxage` for CloudFront only) at the origin; only the query strings, headers and cookies that change the response in the cache key; separate behaviors for static and dynamic paths; Origin Shield in front of the origin. Default TTL without a cache policy: 24 hours. For frequent updates, prefer **versioned file names** to invalidations.

**API Gateway (REST).** Stage cache billed hourly, TTL 300 s by default, 3,600 maximum, 0 disables; only `GET` cached by default; keys from method parameters. `Cache-Control: max-age=0` refreshes an entry for clients allowed `execute-api:InvalidateCache`.

> **Exam trap.** DAX doesn't speed up a workload that uses `ConsistentRead=True`: those reads bypass the cache. Either accept eventually consistent reads or choose another fix.

<!-- section: bottlenecks | objectives: 4.3.5 -->
## Detecting performance bottlenecks with CloudWatch

| Symptom | Metric or tool | Typical fix |
| --- | --- | --- |
| Lambda requests rejected | `Throttles`, `ConcurrentExecutions` | Quota increase, reserved concurrency, SQS buffer |
| Latency on first requests | `Init Duration` in `REPORT` lines, `ProvisionedConcurrencySpilloverInvocations` | Provisioned concurrency, SnapStart, lighter initialization |
| Stream consumer falling behind | `IteratorAge` (Kinesis, DynamoDB Streams) | Larger batch, parallelization factor, more shards |
| Queue backlog growing | `ApproximateNumberOfMessagesVisible`, `ApproximateAgeOfOldestMessage` | More consumers, larger batches, maximum concurrency |
| Slow API | API Gateway `Latency` versus `IntegrationLatency` | Gap = API Gateway overhead; high `IntegrationLatency` = backend |
| DynamoDB throttling on a few keys | `ThrottledRequests`, CloudWatch Contributor Insights for DynamoDB (most accessed and most throttled keys) | Better partition key, write sharding, DAX for reads |
| Slow SQL | CloudWatch Database Insights (database load by waits, SQL statements, hosts, users) | Index or rewrite the top statement, read replicas |

Tools:

- **CloudWatch Logs Insights** on Lambda `REPORT` lines (`@duration`, `@maxMemoryUsed`, `@memorySize`).
- **Lambda Insights** (extension layer): CPU, memory, disk, network, cold starts.
- **CloudWatch Application Signals**: latency, faults and SLOs per service, topology map, OpenTelemetry (ADOT) instrumentation.
- **X-Ray traces**: the slow segment (downstream call, SQL query). Instrument with OpenTelemetry (ADOT): X-Ray SDKs and daemon in maintenance since February 25, 2026, end of support February 25, 2027.
- **Percentiles** (`p99`) and **anomaly detection** alarms show tail latency that averages hide.

```text
filter @type = "REPORT"
| stats avg(@duration), pct(@duration, 99), max(@maxMemoryUsed / 1000 / 1000) as maxMemoryMB by bin(5m)
```

> **Exam tip.** High `Latency` with low `IntegrationLatency` means the time is spent in API Gateway (for example a Lambda authorizer without result caching), not in the backend.

<!-- section: ai-tools | objectives: 4.3.6 -->
## Using AWS AI tools to find optimization opportunities

| Need | Tool |
| --- | --- |
| Review code for inefficiencies, propose an optimized version and its tests | Kiro (IDE, CLI): agent on the code, specs for a refactoring, steering files with performance rules, hooks on file changes, MCP servers for telemetry |
| The same AI review in a pipeline | Kiro CLI headless in a CodeBuild step, or an Amazon Bedrock call from the build |
| Most expensive lines of code at run time | Amazon CodeGuru Profiler: machine learning on live Java/JVM and Python profiles (Lambda included) |
| Incident investigation and recommendations on observability, infrastructure, pipelines, resilience | AWS DevOps Agent (generally available March 31, 2026); hands code improvements to Kiro |
| Root-cause hypotheses during an issue | CloudWatch investigations (generative AI over metrics, logs, traces, deployments) |
| Rightsizing from utilization | AWS Compute Optimizer |

Typical findings of an AI code review: an SDK client created inside the handler, `Scan` with a filter where a `Query` on a key or GSI works, sequential calls that can be batched (`BatchGetItem`, `SendMessageBatch`) or parallelized, repeated reads without a cache. Treat the output as a proposal: a developer reviews it and a measurement (Power Tuning, load test, metrics before and after) confirms the gain.

November 2026: Amazon Q Developer closed to new sign-ups on May 15, 2026 (successor Kiro); Amazon DevOps Guru closed to new customers on October 29, 2026 (use CloudWatch anomaly detection and AWS DevOps Agent); CodeGuru Reviewer closed to new customers on November 7, 2025.

> **Exam trap.** For a new team, a tool that is closed to new customers is never the right answer: choose Kiro for AI-assisted code optimization, not Amazon Q Developer, and CloudWatch anomaly detection or AWS DevOps Agent, not DevOps Guru.

<!-- section: key-points -->
## Key points

- Concurrency = requests per second × duration; reserved concurrency limits, provisioned concurrency pre-initializes (not `$LATEST`), SnapStart speeds cold starts.
- Clients and connections outside the handler; RDS Proxy for database connections; SDK pools sized to threads.
- Lambda CPU follows memory: `Max Memory Used`, Power Tuning, Compute Optimizer; arm64 for price performance.
- SQS: long polling, batches, visibility timeout 6 times the function timeout, partial batch responses, maximum concurrency; SNS fan-out with filter policies.
- ElastiCache lazy loading, write-through, TTL; DAX caches eventually consistent reads only; CloudFront cache keys and TTLs; API Gateway cache.
- Prove the bottleneck with a metric: `Throttles`, `IteratorAge`, `ApproximateAgeOfOldestMessage`, `IntegrationLatency`, Contributor Insights, traces.
- AI tools: Kiro, CodeGuru Profiler, AWS DevOps Agent, CloudWatch investigations; never a service closed to new customers.
