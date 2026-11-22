Transformation questions describe raw data and a target shape (clean, joined, columnar, partitioned, enriched) and ask which engine should do the work, how it connects to the sources, how to make it cheaper or faster, and why a run failed. Start from the data: how much, how fast and how structured. Then choose the smallest engine that fits, and look for the setting that fixes cost or performance before changing services.

<!-- section: data-characteristics | objectives: 1.2.9 -->
## Volume, velocity and variety

| Dimension | Question to ask | Consequence |
| --- | --- | --- |
| Volume | Megabytes, terabytes or petabytes per run? | Lambda for small files; Glue or EMR (distributed Spark) for large data sets; Redshift for large SQL transformations on loaded data |
| Velocity | Nightly, hourly, minutes, seconds? | Batch jobs; micro-batches (Firehose, Glue streaming); continuous processing (Managed Service for Apache Flink, Lambda on Kinesis) |
| Variety | Structured, semi-structured or unstructured? | Schema-on-write in a warehouse, schema-on-read with the Glue Data Catalog and Athena, or extraction with a model |

| Kind | Examples | Typical handling |
| --- | --- | --- |
| Structured | Relational tables, CSV with a fixed schema | SQL, JDBC reads, Redshift tables |
| Semi-structured | JSON, Avro, XML, logs | Crawlers infer schemas, Redshift `SUPER` with `JSON_PARSE`, Glue `Relationalize` to flatten nesting |
| Unstructured | PDFs, images, emails, free text | Stored as objects in S3; metadata or text extracted by AI services or large language models |

<!-- section: transformation-services | objectives: 1.2.5 -->
## Choosing a transformation service

| Service | Strengths | Limits to remember |
| --- | --- | --- |
| AWS Lambda | Per-event or per-file work, no servers, scales by request | Maximum timeout of 30 minutes on the current Lambda quotas page (older pages and the FAQ still say 15 minutes; 90 minutes for some Lambda Managed Instances invocations); up to 10,240 MB of memory and of `/tmp` |
| AWS Glue Spark job | Serverless Spark with DynamicFrames, the Data Catalog, bookmarks and connections | Startup time; billed per DPU-hour |
| Glue Python shell job | Light Python tasks (calls, small files) without Spark | Single node |
| Glue streaming job | Continuous Spark on Kinesis or Kafka | Runs and bills while active |
| AWS Glue DataBrew | Visual recipes for analysts, no code | Preparation and profiling, not complex pipelines |
| Amazon EMR on EC2 | Full control of Spark, Hive, Trino, HBase and cluster configuration; Spot capacity | You size and manage clusters |
| EMR Serverless | Spark or Hive applications without clusters; pre-initialized capacity for fast starts | Less configuration control than EMR on EC2 |
| EMR on EKS | Spark jobs on an existing Amazon EKS cluster | Requires Kubernetes |
| Amazon Redshift | SQL ELT: `INSERT ... SELECT`, materialized views, stored procedures | Data must be loaded or reachable through Spectrum |
| Athena CTAS and `INSERT INTO` | SQL transformation of S3 data, serverless, per data scanned | 100 partitions written per query |
| Managed Service for Apache Flink | Stateful stream processing in Java, Python or SQL | Streaming only |

Glue Ray jobs are in maintenance with no new customers: never choose them for a new design.

| Requirement | Answer |
| --- | --- |
| Convert each uploaded file of a few megabytes as soon as it lands | Lambda triggered by the S3 event |
| Nightly Spark transformation of 5 TB, LEAST operational overhead | Glue Spark job (or EMR Serverless) |
| Existing Spark jobs that need custom libraries and cluster tuning | EMR on EC2 |
| Analysts cleaning data without code | Glue DataBrew |
| Data already in Redshift, results needed in Redshift | SQL in Redshift (ELT) |

> **Exam trap.** A transformation that runs for several hours rules out Lambda whatever its memory. The fix is Glue, EMR, AWS Batch or an ECS task, not a longer Lambda timeout.

<!-- section: containers | objectives: 1.2.1 -->
## Containers for data processing

| Choice | When |
| --- | --- |
| Amazon ECS | AWS-native container orchestration with the least to learn |
| Amazon EKS | Kubernetes skills or tooling already in place, portability, EMR on EKS |
| AWS Fargate | No instances to manage; tasks up to 32 vCPU and 244 GB of memory on Linux; no GPUs |
| EC2 launch type or managed nodes | GPUs, specific instance families, very large or long-running workloads |
| AWS Batch | Queues of batch jobs with priorities, retries and Spot on ECS, EKS or Fargate |

Performance and cost levers: size CPU and memory per task from metrics rather than defaults; scale out with more tasks instead of one large one; use ARM64 (Graviton) images where libraries support them (`runtimePlatform` with `cpuArchitecture: ARM64`); run interruptible work on Spot; keep images small and in Amazon ECR in the same Region to cut startup time.

<!-- section: source-connections | objectives: 1.2.2 -->
## Connecting to data sources with JDBC and ODBC

| Client | How it connects |
| --- | --- |
| Glue job or crawler | Glue connection (JDBC, Kafka, MongoDB or Network type) with a subnet, a security group and credentials from Secrets Manager |
| BI tool or SQL client to Redshift | Redshift JDBC or ODBC driver, or the Redshift Data API without a driver |
| BI tool to Athena | Athena JDBC or ODBC driver |
| Athena to RDS, DynamoDB, Redshift, CloudWatch Logs, Snowflake... | Federated query connectors |
| Redshift to Aurora or RDS PostgreSQL and MySQL | Redshift federated queries |

JDBC reads are single-threaded by default. Glue DynamicFrames fetch 1,000 rows at a time; with plain Spark JDBC, set `fetchsize`, or the whole table may be cached by one executor and fail with an out-of-memory error. Glue can split a JDBC read with `hashfield` or `hashpartitions` options.

> **Exam tip.** "A Lambda function must run SQL on Redshift without managing connections or drivers" is the Redshift Data API with a secret or temporary credentials.

<!-- section: multi-source-integration | objectives: 1.2.3 -->
## Integrating data from multiple sources

| Need | Solution |
| --- | --- |
| Join S3 data with an RDS table once a day | Glue job reading both through the Data Catalog and a JDBC connection, writing the joined result to S3 |
| Ad hoc SQL across S3, DynamoDB and a relational database, no copies | Athena federated query (read-only: no `INSERT INTO` on federated sources) |
| Warehouse tables joined with data lake files | Redshift Spectrum external tables |
| Continuous replication of operational databases into Redshift without pipelines | Zero-ETL integration from Aurora MySQL or PostgreSQL, RDS for MySQL, PostgreSQL or Oracle, DynamoDB, or applications such as Salesforce, SAP, ServiceNow and Zendesk |
| SaaS data into S3 or Redshift | Amazon AppFlow |
| One schema view across sources | Glue Data Catalog tables filled by crawlers |

Keys and types rarely match across sources: standardize them (Glue `ApplyMapping`, `ResolveChoice`) before joining, and broadcast the small side of a join to avoid shuffling the large one.

<!-- section: format-conversion | objectives: 1.2.6 -->
## Transforming data between formats

Columnar formats (Apache Parquet, ORC) read only the needed columns, compress well and store statistics, so Athena, Redshift Spectrum and Spark scan less. Snappy is the usual Parquet codec; GZIP-compressed CSV or JSON files can't be split, so one large file is read by one task.

| Path | Use |
| --- | --- |
| Glue job | Any input format to Parquet with partition keys, on a schedule or event |
| Athena CTAS | One-time or periodic conversion in SQL, up to 100 partitions per query, then `INSERT INTO` batches |
| Data Firehose record format conversion | Streaming JSON to Parquet or ORC using a Glue Data Catalog schema; CSV needs a Lambda transformation to JSON first |
| EMR or EMR Serverless | Very large conversions with tuned Spark |

```python
raw = glueContext.create_dynamic_frame.from_catalog(
    database="sales_raw", table_name="orders_csv",
    transformation_ctx="raw")
glueContext.write_dynamic_frame.from_options(
    frame=raw, connection_type="s3",
    connection_options={"path": "s3://example-curated/orders/",
                        "partitionKeys": ["order_date"]},
    format="glueparquet",
    format_options={"compression": "snappy"},
    transformation_ctx="curated")
```

```text
CREATE TABLE curated.orders_parquet
WITH (format = 'PARQUET',
      write_compression = 'SNAPPY',
      external_location = 's3://example-curated/orders_ctas/',
      partitioned_by = ARRAY['order_date'])
AS SELECT order_id, customer_id, amount, order_date
FROM raw.orders_csv
WHERE order_date >= DATE '2026-11-01';
```

In a CTAS, partition columns come last in the `SELECT`, in the order of `partitioned_by`. More than 100 partitions fail with `HIVE_TOO_MANY_OPEN_PARTITIONS`.

<!-- section: cost-optimization | objectives: 1.2.4 -->
## Optimizing processing costs

| Lever | Detail |
| --- | --- |
| Glue flex execution | Spare capacity for non-urgent jobs (tests, one-time loads, nightly runs with slack); G.1X or G.2X workers, Glue 3.0 or later |
| Glue auto scaling and right worker type | Pay for the workers actually needed; R types only for memory-bound jobs |
| Incremental processing | Job bookmarks, partition predicates, CDC instead of full reloads |
| Glue job timeout | Default 480 minutes for Glue 5.0 and later (2,880 before), maximum 7 days: set it lower to stop runaway jobs |
| EMR purchasing | Spot for task nodes; On-Demand primary and core nodes for long-running or data-critical clusters; all Spot only when losing the cluster is acceptable |
| Transient clusters, serverless | Terminate EMR clusters after their steps, or use EMR Serverless |
| Less data scanned | Parquet, partitioning, compression, avoiding `SELECT *` |
| Architecture | Graviton where supported, batch instead of streaming when latency allows |
| Model calls | Amazon Bedrock batch inference, 50 % below on-demand pricing for supported models |

> **Exam trap.** Flex suits work that can start late. A job that must finish within a tight SLA every morning stays on the standard execution class.

<!-- section: troubleshooting | objectives: 1.2.7 -->
## Troubleshooting transformation failures and performance

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Driver out of memory, `glue.driver.jvm.heap.usage` climbing, executors idle | Hundreds of thousands of small files listed and tracked by the driver, or `collect()` | `groupFiles`, compact small files, keep work distributed |
| Executor out of memory, "Container killed by YARN for exceeding memory limits" | Large JDBC read in one executor, skewed key | DynamicFrame JDBC reads or `fetchsize`, parallel reads, R workers |
| One task runs for hours while the others finish | Data skew on a join or group key | Salt the hot key, repartition, broadcast the small table |
| Thousands of tiny output files | Too many partitions written | `coalesce` or `repartition` before writing |
| Job reprocesses old data | Bookmark not enabled, no `transformation_ctx`, missing `job.commit()` | Fix the script and the job option |
| Athena query fails on a new partition | Schema of the new files differs from the table | Align types, update the table, rerun the crawler |
| Timeout | Under-sized job or unbounded input | More or larger workers, incremental input, a timeout that matches the SLA |

Look at the job's CloudWatch metrics and logs first, then the Spark UI for stages, shuffle sizes and straggler tasks.

<!-- section: data-apis | objectives: 1.2.8 -->
## Creating data APIs

| Need | Design |
| --- | --- |
| REST API over curated data with low latency | API Gateway with Lambda reading DynamoDB, or RDS through RDS Proxy |
| SQL results for an application without drivers | Redshift Data API: asynchronous, queries up to 24 hours, results up to 500 MB kept for 24 hours |
| Ad hoc queries over S3 from an application | Athena API (`StartQueryExecution`, then poll and read results in S3) |
| Simple reads and writes on one table | API Gateway direct service integration with DynamoDB, no Lambda |
| Protect the back end and meter clients | API Gateway throttling, usage plans and API keys, caching |

```bash
aws redshift-data execute-statement \
  --workgroup-name analytics \
  --database sales \
  --secret-arn arn:aws:secretsmanager:eu-west-3:111122223333:secret:sales-api \
  --sql "SELECT region, SUM(amount) FROM orders GROUP BY region"
aws redshift-data describe-statement --id "$STATEMENT_ID"
aws redshift-data get-statement-result --id "$STATEMENT_ID"
```

<!-- section: llm-processing | objectives: 1.2.10 -->
## Integrating large language models in data processing

Large language models in Amazon Bedrock turn unstructured or messy input into structured fields: classifying support tickets, extracting entities from contracts, normalizing free-text addresses, summarizing documents, generating embeddings. The data engineer's job is to call the model at the right point of the pipeline, at a sensible cost, and to check what comes back.

| Pattern | When |
| --- | --- |
| `InvokeModel` or `Converse` from Lambda or a Glue job | Per record or per file, as data arrives |
| Step Functions optimized integration `bedrock:invokeModel` | A workflow step; inline `Body` up to 256 KiB, or `Input` and `Output` locations in S3 for larger payloads |
| Distributed Map over S3 objects with a model call per item | Thousands of documents processed in parallel |
| Bedrock batch inference | Large backlogs with no latency need: input records in S3, asynchronous job, results written to S3, lower price; not for provisioned models |

```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::bedrock:invokeModel",
  "Parameters": {
    "ModelId": "amazon.nova-lite-v1:0",
    "Input": { "S3Uri.$": "$.requestUri" },
    "Output": { "S3Uri": "s3://example-enriched/tickets/" }
  },
  "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "MaxAttempts": 3, "BackoffRate": 2 }],
  "Next": "LoadResults"
}
```

Ask for a fixed output structure (structured outputs or a JSON schema in the prompt), validate it before loading, keep the raw input to reprocess with a better prompt, and retry throttled calls with backoff.

> **Exam tip.** "Classify 20 million archived reviews by next week, MOST cost-effective" is batch inference. Calling the model synchronously for each record in a loop is slower, more expensive and throttled.

<!-- section: key-points -->
## Key points

- Choose by volume, velocity and variety: Lambda for small events, Glue or EMR for large Spark work, Redshift for SQL on loaded data, Flink for stateful streams.
- Jobs of several hours rule out Lambda.
- Fargate: up to 32 vCPU and 244 GB, no GPU; ECS for simplicity, EKS for Kubernetes.
- Glue JDBC needs a connection with network settings and Secrets Manager; Redshift Data API needs no driver.
- Athena federated queries read in place; zero-ETL replicates into Redshift.
- Parquet and Snappy; Firehose converts only JSON; CTAS writes at most 100 partitions.
- Cost: flex, auto scaling, bookmarks, Spot task nodes, less data scanned, Bedrock batch inference.
- Driver OOM means many small files; a straggler task means skew.
