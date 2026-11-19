Ingestion questions describe data that arrives somewhere (on-premises file servers, devices, SaaS applications, partners, web clients) at a given volume and frequency, and ask how to bring it into AWS quickly, securely and with the least operations. Identify three things first: the pattern (one-time migration, recurring batch, continuous stream), the size and the available bandwidth, then the protocol the source speaks.

<!-- section: ingestion-patterns | objectives: 3.5.2 -->
## Data ingestion patterns

| Pattern | Frequency and latency | Typical AWS services |
| --- | --- | --- |
| One-time bulk migration | Once; days are acceptable | AWS DataSync over the network, AWS Data Transfer Terminal for physical transfer |
| Recurring batch | Hourly, nightly, weekly | DataSync scheduled tasks, AWS Transfer Family (partners push files), Amazon AppFlow (SaaS), AWS Glue jobs |
| Micro-batch, near real time | Seconds to minutes | Amazon Data Firehose (buffers then delivers) |
| Real-time streaming | Milliseconds to seconds, replay possible | Amazon Kinesis Data Streams, Amazon MSK |
| Event-driven files | Each object as it arrives | S3 event notifications or EventBridge to Lambda, SQS or Step Functions |
| Ongoing hybrid file access | Continuous, applications keep using NFS/SMB | AWS Storage Gateway (S3 File Gateway) |
| Third-party data sets | Subscription | AWS Data Exchange |

Amazon AppFlow transfers data from SaaS applications (for example Salesforce, ServiceNow, Slack) to S3 or Redshift on a schedule, on an event or on demand, with no code. AWS Data Pipeline is closed to new customers: never choose it for a new design.

> **Exam tip.** The deciding word is often the latency: "within seconds" and "multiple consumers" mean Kinesis Data Streams; "near real time into S3, Redshift or OpenSearch with no code" means Data Firehose; "every night" means a scheduled batch.

<!-- section: transfer-services | objectives: 3.5.3, 3.5.10 -->
## Data transfer services and solutions

| Service | What it does | Choose it when |
| --- | --- | --- |
| AWS DataSync | Online transfer from NFS, SMB, HDFS, self-managed object storage and other clouds to S3 (any storage class, including Glacier classes), EFS or any FSx file system; encryption in transit and integrity verification; scheduling, filters, bandwidth limit | Migrate or replicate file data, move cold data to archive, recurring copies between storage systems |
| AWS Storage Gateway, S3 File Gateway | NFS or SMB share on premises, files stored as objects in S3, local cache for low latency | On-premises applications keep a file interface while data lands in S3 |
| Storage Gateway, Volume Gateway | iSCSI volumes; cached mode (primary data in S3, hot data cached locally) or stored mode (all data on premises, asynchronous backup to S3 as EBS snapshots) | Block storage extension or backup of on-premises volumes |
| Storage Gateway, Tape Gateway | Virtual tape library for existing backup software, tapes archived to S3 Glacier Flexible Retrieval or Deep Archive | Replace physical tapes without changing the backup application |
| AWS Transfer Family | Managed SFTP, FTPS, FTP and AS2 endpoints, plus web apps, storing in S3 or EFS | Partners exchange files over those protocols; keep their clients and credentials |
| AWS Data Transfer Terminal | Physical locations with high-speed connections to AWS where you bring your own storage devices | Very large data sets with limited bandwidth |
| AWS Direct Connect | Private dedicated network connection | Large recurring transfers with consistent throughput |
| S3 Transfer Acceleration | Uploads enter at the nearest CloudFront edge location, then use the AWS network | Global clients uploading to a central bucket over long distances |

Agents: DataSync needs an agent (deployed on premises as a VM, or on EC2) to read NFS, SMB and HDFS locations; transfers between AWS storage services don't need one. DataSync has two task modes: **Enhanced** (parallel listing, transfer and verification, virtually unlimited objects) and **Basic**; the mode can't be changed after the task is created.

Availability in November 2026: AWS Snowball Edge is no longer available to new customers (AWS points to DataSync for online transfers and Data Transfer Terminal for physical ones), and Amazon FSx File Gateway is no longer available to new customers (access FSx for Windows File Server directly).

> **Exam trap.** DataSync moves data; Storage Gateway gives ongoing hybrid access. "Migrate 200 TB of file shares and decommission the NAS" is DataSync. "Users on premises must keep accessing files that are stored in S3" is S3 File Gateway.

<!-- section: sizes-speeds | objectives: 3.5.6 -->
## Sizes and speeds

Compute the transfer time before choosing between network and physical transfer:

```text
transfer time (s) = data (bytes) x 8 / (bandwidth (bit/s) x utilization)

100 TB over 1 Gbps at 80 % utilization:
  100 x 10^12 x 8 = 8 x 10^14 bits
  8 x 10^14 / (1 x 10^9 x 0.8) = 1,000,000 s = about 11.6 days
same data over 10 Gbps at 80 %: about 1.2 days
```

Limits to know:

| Item | Limit |
| --- | --- |
| S3 single `PUT` | 5 GB per object |
| S3 multipart upload | Up to 50 TB per object; parts uploaded in parallel and retried individually |
| Kinesis Data Streams shard (provisioned) | Write 1 MB/s or 1,000 records/s; read 2 MB/s shared by consumers |
| Enhanced fan-out | 2 MB/s per shard for each registered consumer, pushed over HTTP/2 |
| Kinesis Data Streams record | Payload up to 10 MiB |
| Kinesis on-demand stream | Starts at 4 MB/s write; adapts up to double the peak of the previous 30 days |
| Data Firehose record | Up to 1,000 KB |
| Site-to-Site VPN tunnel | Up to 1.25 Gbps (standard), 5 Gbps (large bandwidth) |
| Direct Connect dedicated | 1, 10, 100 or 400 Gbps |

> **Exam trap.** A deadline that the network can't meet (for example 500 TB in one week over a 1 Gbps link already half used) rules out DataSync over that link. Today's answers are a faster link (Direct Connect) or a physical transfer at a Data Transfer Terminal, not a Snowball order for a new customer.

<!-- section: secure-ingestion | objectives: 3.5.5 -->
## Securing ingestion access points

| Access point | Controls |
| --- | --- |
| Producers on EC2, containers or Lambda | IAM role with only `kinesis:PutRecord(s)`, `firehose:PutRecord(Batch)` or `s3:PutObject` on the target resource |
| Traffic from a VPC | Interface VPC endpoints for Kinesis Data Streams, Data Firehose and DataSync; S3 gateway endpoint; endpoint policies limit which resources can be reached |
| S3 landing bucket | Bucket policy conditions (`aws:SourceVpce`, `aws:SecureTransport`), S3 Block Public Access, default encryption with SSE-KMS |
| Partner file transfer | Transfer Family VPC endpoint, internet-facing with Elastic IP addresses that partners allowlist, security groups restricted to partner IP ranges; FTP only on an internal endpoint |
| Browser and mobile uploads | Presigned URLs, or Amazon Cognito identity pools issuing temporary credentials |
| Hybrid links | Site-to-Site VPN, or Direct Connect with MACsec or VPN; DataSync agent activated with a VPC endpoint so the transfer stays private |

Data in streams is encrypted at rest with server-side encryption using an AWS KMS key, and all endpoints use TLS.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUploadsOutsideTheIngestionEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::example-ingest-raw/*",
      "Condition": {
        "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f67890" }
      }
    }
  ]
}
```

> **Exam tip.** "Producers in private subnets must send to Kinesis without traversing the internet" is an interface VPC endpoint, not a NAT gateway: it removes the internet path and the NAT data processing charge.

<!-- section: streaming-services | objectives: 3.5.7 -->
## Streaming data services

| Service | What it is | Choose it when |
| --- | --- | --- |
| Amazon Kinesis Data Streams | Durable, ordered (per shard) stream; retention from 24 hours (default) to 365 days; several consumers read and replay | Custom real-time processing, multiple independent consumers, replay |
| Amazon Data Firehose | Fully managed delivery: buffers, optionally transforms, compresses, converts and delivers to S3, Redshift, OpenSearch Service, Splunk, Apache Iceberg tables or HTTP endpoints | Load streaming data into a destination with no code and no capacity management |
| Amazon Managed Service for Apache Flink | Managed Apache Flink applications (Java, Scala, Python, SQL) reading streams | Windowed aggregations, anomaly detection, stream joins in real time |
| Amazon MSK | Managed Apache Kafka (provisioned Standard or Express brokers, or MSK Serverless), MSK Connect for connectors | Existing Kafka applications and tools, without code changes |
| Amazon Kinesis Video Streams | Ingest, store and play back video from devices | Cameras and video analytics, for example with Amazon Rekognition |

> **Exam trap.** Firehose doesn't store data for replay and has no consumers of its own: it delivers. When several applications must read the same records independently or reprocess yesterday's data, put Kinesis Data Streams in front.

<!-- section: streaming-architectures | objectives: 3.5.9 -->
## Designing streaming architectures

```text
producers (apps, agents, IoT) --> Kinesis Data Streams --+--> Lambda (per-record processing)
                                                         +--> Managed Service for Apache Flink --> alerts, DynamoDB
                                                         +--> Data Firehose --> S3 (Parquet) --> Athena
```

Design rules:

- **Ordering** is guaranteed per shard: records with the same partition key go to the same shard. Choose a high-cardinality key (device ID, customer ID) to avoid a **hot shard**.
- **Fan-out**: each consumer with enhanced fan-out gets its own 2 MB/s per shard and about 70 ms propagation; shared-throughput consumers split 2 MB/s per shard.
- **Lambda consumer**: event source mapping with batch size and batching window; a failed batch is retried, so make processing idempotent and send failures to an on-failure destination.
- **Decouple and buffer**: the stream absorbs bursts; downstream consumers scale independently.
- **Archive raw data**: Firehose to S3 next to real-time processing, for later analytics.
- **SQS versus Kinesis**: SQS deletes a message once it is processed and has no replay for other consumers; use it for work queues, Kinesis for streams.

<!-- section: ingestion-configuration | objectives: 3.5.13 -->
## Selecting ingestion configurations

Kinesis Data Streams:

| Setting | Choice |
| --- | --- |
| Capacity mode | **On-demand** for unpredictable or new traffic (no shard planning); **provisioned** for predictable traffic, with shard count managed by you (`UpdateShardCount`) or hot shards split. You can switch modes twice in 24 hours |
| Shard count (provisioned) | Maximum of write MB/s ÷ 1, write records/s ÷ 1,000 and read MB/s ÷ 2 |
| Retention | 24 hours by default, up to 365 days for replay |
| Consumers | Enhanced fan-out for several low-latency consumers |

Data Firehose:

| Setting | Choice |
| --- | --- |
| Buffering hints (S3) | Size 1–128 MiB (default 5), interval 0–900 seconds (default 300); the first condition reached triggers delivery. Larger buffers mean fewer, bigger objects |
| Transformation | Lambda function on each batch (cleanup, enrichment, CSV to JSON) |
| Record format conversion | JSON to Apache Parquet or ORC, using a schema in the AWS Glue Data Catalog |
| Dynamic partitioning | Keys from the data (for example `customer_id`) become S3 prefixes for faster, cheaper queries |
| Compression and encryption | GZIP or Snappy before delivery; SSE-KMS |

Other configurations: DataSync tasks with a schedule, include and exclude filters, a bandwidth limit during business hours, and "transfer only changed data"; S3 multipart upload thresholds for large files; a Transfer Family server with a custom identity provider when partners authenticate against an existing directory.

> **Exam trap.** Firehose converts only JSON to Parquet or ORC. For CSV input, add a Lambda transformation to JSON first, or convert later with a Glue job.

<!-- section: key-points -->
## Key points

- Pattern first: one-time migration, scheduled batch, near real time (Firehose), real time with replay (Kinesis Data Streams or MSK).
- DataSync migrates and replicates; Storage Gateway provides ongoing hybrid access; Transfer Family receives SFTP, FTPS, FTP and AS2.
- Snowball Edge and FSx File Gateway are closed to new customers; Data Pipeline too.
- Shard: 1 MB/s or 1,000 records/s in, 2 MB/s out; enhanced fan-out gives 2 MB/s per consumer.
- Secure ingestion with least-privilege roles, VPC endpoints, bucket policies on `aws:SourceVpce`, KMS encryption, Elastic IP allowlisting for partners.
- Compute transfer time: bytes x 8 ÷ (bandwidth x utilization).
