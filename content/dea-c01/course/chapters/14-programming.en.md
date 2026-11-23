The exam does not test language syntax, but it tests the engineering choices around code: which setting makes a Glue job or a Lambda function finish faster, where a function keeps its files, how a pipeline is described as code, packaged with AWS SAM and promoted through CI/CD, and which distributed design or data structure fits a problem.

<!-- section: code-optimization | objectives: 1.4.1 -->
## Optimizing code to reduce runtime

Most of a job's runtime is spent reading data, moving it between nodes and writing it. Faster code reads less, shuffles less and writes fewer, larger files.

| Symptom | Fix |
| --- | --- |
| The job reads the whole table to process one day | Filter on partition columns before reading: `push_down_predicate` on a Glue DynamicFrame, `WHERE` on partition columns in Spark SQL or Athena |
| Listing millions of partitions is slow | Glue partition indexes plus `catalogPartitionPredicate` (pruning inside the Data Catalog) |
| Each run reprocesses old files | Glue job bookmarks (`transformation_ctx` on sources, `job.commit()` at the end) |
| Thousands of small files | Group files on read (`groupFiles`, `groupSize`), write fewer files of 128 MB or more |
| Queries scan CSV or JSON | Compressed Parquet or ORC, only the needed columns |
| Python UDFs, row loops, `collect()` on large data | Built-in Spark functions on the executors; keep data off the driver |
| Large table joined with a small lookup | Broadcast join: no shuffle of the large table |
| One task runs far longer than the others | Data skew: salt or split the hot key, let adaptive query execution split skewed joins |
| One record per API call | Batch APIs: Kinesis `PutRecords` (up to 500 records), DynamoDB `BatchWriteItem` (up to 25 items) |
| Row-by-row inserts into Redshift | `COPY` from S3 files, loaded in parallel by all slices |

```python
orders = glue_context.create_dynamic_frame.from_catalog(
    database="sales_raw",
    table_name="orders_csv",
    push_down_predicate=f"dt = '{args['run_date']}'",
    transformation_ctx="orders_src",
)
df = orders.toDF().select("order_id", "customer_id", "amount", "dt")
df.repartition("dt").write.mode("append").partitionBy("dt").parquet(
    "s3://example-curated/orders/"
)
job.commit()
```

Glue capacity: a DPU is 4 vCPUs and 16 GB. Workers range from G.025X (0.25 DPU) through G.1X, G.2X, G.4X and G.8X to G.12X, G.16X and the memory-optimized R types (Glue 4.0 or later). Auto scaling (`--enable-auto-scaling`) adjusts workers during the run. The **Flex** execution class runs non-urgent jobs (tests, one-time loads) at a lower price on G.1X or G.2X workers. New jobs default to Glue 6.0 and, from Glue 5.0, to a 480-minute timeout.

> **Exam trap.** More workers do not fix a job slowed by skew or by tiny files: the extra workers wait. Fix the data layout (key salting, file grouping, compaction) first.

<!-- section: lambda-performance | objectives: 1.4.2 -->
## Lambda concurrency and performance settings

Concurrency = requests per second × average duration in seconds (100 per second at 0.5 s = 50). The default quota is 1,000 concurrent executions per account and Region.

| Setting | Effect |
| --- | --- |
| Memory, 128 MB to 10,240 MB | CPU grows with memory: CPU-bound parsing often gets faster and cheaper with more memory |
| Timeout, default 3 s, maximum 1,800 s on the current quota page | Longer batch work belongs in Glue, AWS Batch, ECS or a Step Functions loop |
| Reserved concurrency | Guarantees and caps the function's concurrency, free; 100 units always stay unreserved; 0 stops the function |
| Provisioned concurrency | Pre-initialized environments on a version or alias, extra charge, schedulable with Application Auto Scaling: no cold starts |
| SnapStart | Restores a cached initialized snapshot to cut cold starts (Java, among others); not combined with provisioned concurrency on one version |

Create SDK clients and database connections outside the handler, and put RDS Proxy in front of a relational database.

| Event source mapping | Concurrency and tuning |
| --- | --- |
| Kinesis Data Streams | One batch per shard at a time, `ParallelizationFactor` 1 to 10 (100 shards × 2 = 200 invocations, order kept per partition key); `BatchSize` default 100, maximum 10,000; batching window up to 5 minutes; `BisectBatchOnFunctionError`, `MaximumRetryAttempts`, `MaximumRecordAgeInSeconds`, on-failure destination, `ReportBatchItemFailures` |
| Amazon SQS | Up to 1,250 concurrent invokes by default; `MaximumConcurrency` 2 to 1,000 per queue, or provisioned mode (pollers, extra cost), not both; keep reserved concurrency at least equal to the sum of maximum concurrency values |

A growing `IteratorAge` means the Kinesis consumer falls behind: raise `ParallelizationFactor` or `BatchSize`, add shards, or use enhanced fan-out when consumers share read throughput.

> **Exam trap.** Reserved concurrency limits; provisioned concurrency removes cold starts. "Never open more than 50 database connections" is reserved concurrency or SQS maximum concurrency.

<!-- section: lambda-storage | objectives: 1.4.7 -->
## Storage and mounted volumes in Lambda

| Option | Characteristics |
| --- | --- |
| `/tmp` | 512 MB to 10,240 MB, private to one execution environment, may survive warm invocations: scratch space |
| Amazon EFS | Shared by all concurrent environments, persistent: large shared reference files |
| Amazon S3 Files | An S3 bucket mounted as a file system: file-based code on S3 objects |
| Layers | Up to 5, read-only under `/opt`, 250 MB unzipped with the code: libraries |
| Container image | Up to 10 GB: large dependencies |

EFS and S3 Files require a **VPC-connected function**, a mount target reachable in each Availability Zone used (S3 Files: each subnet), security groups allowing NFS on TCP 2049, a mount path starting with `/mnt/`, an access point, and `ClientMount` (plus `ClientWrite` to write) permissions in the execution role. A function uses one of the two, not both.

```bash
aws lambda update-function-configuration --function-name enrich-events \
  --vpc-config SubnetIds=subnet-0a1b2c3d,subnet-4e5f6a7b,SecurityGroupIds=sg-0123abcd \
  --file-system-configs Arn=arn:aws:elasticfilesystem:eu-west-1:111122223333:access-point/fsap-0abc1234def567890,LocalMountPath=/mnt/reference
```

> **Exam tip.** "Concurrent invocations read the same 20 GB of reference files" is EFS. "Each invocation needs 5 GB of scratch space" is a larger `/tmp`: no VPC, nothing to manage.

<!-- section: languages-frameworks | objectives: 1.4.3 -->
## Languages and frameworks for data engineering

| Language | Typical use on AWS |
| --- | --- |
| Python | PySpark and Python shell jobs in Glue, Lambda, Airflow DAGs on MWAA, Boto3 |
| SQL | Athena, Redshift, Spark SQL, Flink SQL, RDS and Aurora |
| Scala and Java | Spark jobs on Glue or EMR; Flink applications, Kafka clients |
| R | SparkR on EMR, SageMaker AI notebooks |
| Bash and PowerShell | EMR bootstrap actions, CodeBuild commands, AWS CLI or AWS Tools for PowerShell scripts |

Glue job types: **Spark** (`glueetl`) for distributed ETL, **Spark Streaming** (`gluestreaming`) for Kinesis or Kafka, **Python shell** (`pythonshell`) for small tasks without Spark. Glue Ray jobs are in maintenance and closed to new customers. Frameworks: Spark (Glue, EMR, Athena), Flink (Managed Service for Apache Flink), Hive and Trino (EMR), Airflow (MWAA).

> **Exam tip.** A small transformation costs less as a Python shell job or a Lambda function than as a Spark job; Spark pays off when data no longer fits on one machine.

<!-- section: engineering-practices | objectives: 1.4.4 -->
## Software engineering practices for pipelines

| Practice | Implementation |
| --- | --- |
| Version control | Scripts, DAGs, SQL and templates in Git, reviewed through pull requests |
| Configuration | Job arguments, Parameter Store, Secrets Manager: nothing hardcoded |
| Tests | `pytest` on transformation functions; Glue scripts in the Glue Docker image (`public.ecr.aws/glue/aws-glue-libs:6.0`); sample-data runs in a test account; Glue Data Quality rules |
| Logging | Glue 5.0+: real-time logs in `/aws-glue/jobs/error` and `/aws-glue/jobs/output`; Lambda JSON logs; Step Functions logs in CloudWatch Logs |
| Monitoring | CloudWatch alarms on Glue job metrics and Lambda `Errors`, `Throttles`, `IteratorAge`; EventBridge rule on Glue job state changes to SNS |
| Idempotency | Overwrite partitions or `MERGE` on keys so a retry does not duplicate rows |

The local Glue image lacks job bookmarks, Glue Data Quality and Lake Formation credential vending: test those in AWS.

> **Exam trap.** A job that loads duplicates after a retry has an idempotency problem. Make the write idempotent rather than adding alarms.

<!-- section: infrastructure-as-code | objectives: 1.4.5, 1.4.8 -->
## Infrastructure as code with CloudFormation and the CDK

| Requirement | Feature |
| --- | --- |
| Same pipeline in dev and prod | One template with `Parameters` |
| Preview a change | Change sets (`cdk diff`) |
| Detect manual changes | Drift detection |
| Many accounts and Regions | StackSets |
| Keep data when the stack is deleted | `DeletionPolicy: Retain` |
| No secrets in templates | `{{resolve:ssm:...}}`, `{{resolve:secretsmanager:...}}` |

```yaml
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]
  GlueRoleArn:
    Type: String
Resources:
  OrdersJob:
    Type: AWS::Glue::Job
    Properties:
      Name: !Sub "orders-curate-${Env}"
      Role: !Ref GlueRoleArn
      GlueVersion: "5.0"
      WorkerType: G.1X
      NumberOfWorkers: 10
      Command:
        Name: glueetl
        ScriptLocation: !Sub "s3://example-artifacts-${Env}/jobs/orders_curate.py"
      DefaultArguments:
        "--job-bookmark-option": job-bookmark-enable
```

The **AWS CDK** (TypeScript, Python, Java, C#, Go) generates CloudFormation from code. L1 constructs (`Cfn*`) map one-to-one to resources, L2 constructs add secure defaults and helpers such as `bucket.grantRead(role)`, L3 constructs are multi-resource patterns. `cdk bootstrap` prepares each account and Region once, `cdk synth` produces the template, `cdk deploy` deploys it.

> **Exam tip.** CDK and SAM both produce CloudFormation stacks. Choose the CDK for loops, classes and unit tests in a general-purpose language, SAM for compact serverless templates.

<!-- section: sam | objectives: 1.4.6 -->
## Packaging and deploying serverless pipelines with AWS SAM

A SAM template is a CloudFormation template with `Transform: AWS::Serverless-2016-10-31`. Short types expand at deployment: `AWS::Serverless::Function` (function, role, event sources), `AWS::Serverless::StateMachine`, `AWS::Serverless::SimpleTable` (DynamoDB table with a single-attribute key; use `AWS::DynamoDB::Table` for a sort key or indexes), `AWS::Serverless::LayerVersion`. Policy templates (`S3ReadPolicy`, `DynamoDBCrudPolicy`, `SQSPollerPolicy`) grant least privilege in one line.

```yaml
Transform: AWS::Serverless-2016-10-31
Resources:
  LandingBucket:
    Type: AWS::S3::Bucket
  OrdersTable:
    Type: AWS::Serverless::SimpleTable
  IngestFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: python3.13
      Handler: app.handler
      CodeUri: src/ingest/
      AutoPublishAlias: live
      DeploymentPreference:
        Type: Canary10Percent5Minutes
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
      Events:
        NewFile:
          Type: S3
          Properties:
            Bucket: !Ref LandingBucket
            Events: s3:ObjectCreated:*
```

| Command | Role |
| --- | --- |
| `sam build` | Builds code and dependencies |
| `sam local invoke` | Runs a function locally in a container |
| `sam deploy --guided` | Uploads artifacts to S3, deploys through a change set |
| `sam package` | Uploads artifacts and writes the template for a pipeline |
| `sam sync` | Fast sync to a development stack |

`AutoPublishAlias` with `DeploymentPreference` creates a CodeDeploy deployment that shifts traffic gradually (`Canary10Percent5Minutes`, `Linear10PercentEvery1Minute`, `AllAtOnce`), with `PreTraffic` and `PostTraffic` hooks and alarms that roll back.

> **Exam trap.** A SAM `S3` event needs the bucket declared in the same template. For an existing bucket, configure S3 Event Notifications or an EventBridge rule separately.

<!-- section: cicd | objectives: 1.4.9 -->
## CI/CD for data pipelines

Continuous integration builds and tests each change; continuous delivery promotes the same tested artifact through environments:

1. **Source**: a push to the Git repository (GitHub, GitLab or Bitbucket through AWS CodeConnections) starts AWS CodePipeline.
2. **Build and unit tests** in CodeBuild (`buildspec.yml` phases `install`, `pre_build`, `build`, `post_build`), artifacts in S3.
3. **Deploy to test** with a CloudFormation change set action.
4. **Integration and data tests** on sample data: row counts, schemas, data quality rules.
5. **Manual approval** action.
6. **Deploy to production**: same artifact, production parameters; Lambda traffic shifted by CodeDeploy.

```yaml
version: 0.2
phases:
  install:
    commands:
      - pip install -r requirements-dev.txt
  pre_build:
    commands:
      - python -m pytest tests/unit --junitxml=reports/unit.xml
  build:
    commands:
      - sam build
      - sam package --s3-bucket "$ARTIFACT_BUCKET" --output-template-file packaged.yaml
artifacts:
  files:
    - packaged.yaml
```

> **Exam tip.** Build once, deploy many. Rebuilding for production would ship code that was never tested.

<!-- section: distributed-computing | objectives: 1.4.10 -->
## Distributed computing

Distributed computing splits data into partitions processed in parallel by many nodes, with a coordinator that plans the work. It scales **out** rather than **up** and survives node failures by rerunning tasks.

| Concept | AWS example |
| --- | --- |
| Coordinator and workers | Spark driver and executors (Glue, EMR); Redshift leader and compute nodes |
| Partition, the unit of parallelism | Spark partitions, Kinesis shards, Kafka partitions, Redshift slices, DynamoDB partitions |
| Shuffle | Data redistributed by key for joins and aggregations |
| Skew | One oversized partition (hot key, null join key) |
| MPP | Every node scans its share: Redshift, Athena |

On EMR, the **primary** node coordinates, **core** nodes run tasks and hold HDFS, **task** nodes only compute (good Spot candidates). HDFS disappears with the cluster; EMRFS keeps data in S3, which allows transient clusters. Parallelism is capped by partitions: a Lambda Kinesis consumer gets shards × parallelization factor batches, a Spark stage one task per partition.

> **Exam trap.** Order is kept only inside a partition: Kinesis shard, Kafka partition, SQS FIFO message group. Strict order per customer means the customer ID is the partition key.

<!-- section: data-structures | objectives: 1.4.11 -->
## Data structures and algorithms

| Structure | Strength | Where |
| --- | --- | --- |
| Graph | Multi-hop traversals over vertices and edges | Amazon Neptune (Gremlin or openCypher on property graphs, SPARQL on RDF), Neptune Analytics |
| Tree | Sorted hierarchy, O(log n) lookups and ranges | B-tree indexes in RDS and Aurora, nested JSON in DocumentDB |
| Hash table | O(1) key lookup | DynamoDB partition key, MemoryDB, Spark hash joins |
| Queue | First in, first out | SQS (FIFO per message group) |
| Append-only log | Ordered, replayable offsets | Kinesis sequence numbers, Kafka offsets |
| Blocks with min/max statistics | Skip blocks outside the filter | Parquet row groups, Redshift zone maps with sort keys |

A full scan is O(n), so a DynamoDB `Query` on a key beats a `Scan`; sorting is O(n log n), so sort keys and sort orders are maintained at write time, not at every query.

> **Exam trap.** "Find accounts linked to a fraudster within three hops of shared devices" is a Neptune graph traversal, not recursive self-joins in a relational database.

<!-- section: key-points -->
## Key points

- Read less (pruning, bookmarks, columnar formats), shuffle less (broadcast, skew fixes) and write larger files before adding Glue workers.
- Lambda: memory raises CPU; reserved concurrency caps, provisioned concurrency pre-warms; Kinesis concurrency = shards × `ParallelizationFactor` (1–10); SQS `MaximumConcurrency` 2–1,000.
- Lambda storage: `/tmp` up to 10,240 MB, EFS or S3 Files shared through a VPC mount under `/mnt/`, layers under `/opt`, images up to 10 GB.
- Glue job types: Spark, Spark Streaming, Python shell; Ray jobs closed to new customers.
- Git, tests, CloudWatch logs and alarms, idempotent writes.
- CloudFormation, CDK and SAM all deploy CloudFormation stacks; SAM adds `AWS::Serverless::*` types, policy templates and CodeDeploy gradual deployments.
- CI/CD: CodePipeline stages, CodeBuild `buildspec.yml`, approval, same artifact in every environment.
- Parallelism follows partitions and order holds within one; graphs for relationships, hash keys for direct lookups.
