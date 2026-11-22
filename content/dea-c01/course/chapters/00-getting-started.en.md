DEA-C01 tests whether you can build and run data pipelines on AWS. A typical question describes a company's sources (databases, files dropped in Amazon S3, a clickstream, a SaaS application), their volume and arrival rate, what must happen to the data and who will query it, then asks for the service, setting or fix that meets a cost, latency or effort target. You never write a full program, but you will read short SQL, PySpark, JSON and AWS CLI snippets. This chapter covers the format, a reading method, how to handle code in a stem, the services whose name or status changed, the families of options you must separate and a study plan.

<!-- section: exam-format -->
## Format and scoring

| Item | Value |
| --- | --- |
| Certification | AWS Certified Data Engineer – Associate |
| Exam guide | DEA-C01, version 1.1 of December 12, 2025; no successor announced in November 2026 |
| Duration | 130 minutes |
| Questions | 65, of which 15 are unscored and not marked |
| Score | Scaled from 100 to 1,000; 720 passes |
| Scoring model | Compensatory: a weak domain can be offset by a strong one |
| Guessing | An unanswered question is wrong and a wrong answer costs nothing more: answer everything |
| Languages | English, Japanese, Korean and Simplified Chinese; there is no French version |
| Price | 150 USD |

| Domain | Weight | Course module |
| --- | --- | --- |
| Data Ingestion and Transformation | 34 % | Chapters 11 to 14 |
| Data Store Management | 26 % | Chapters 21 to 24 |
| Data Operations and Support | 22 % | Chapters 31 to 34 |
| Data Security and Governance | 18 % | Chapters 41 to 45 |

Two formats exist. A **multiple choice** question has four options and one answer; most of the exam uses it. A **multiple response** question ends with "Choose two." (five options) or "Choose three." (six options) and scores only if the whole selection is right. There are no labs, case studies, drag-and-drop or Yes/No series.

The guide puts machine learning training and inference, language-specific syntax and business conclusions drawn from the data out of scope: you are asked to move, shape, store, secure and monitor data, not to interpret it.

> **Exam tip.** Certidrill mock exams score all 65 questions, because you can't know which 15 the real exam ignores. Pace yourself at two minutes per question and flag long code questions for a second pass.

<!-- section: reading-questions -->
## A method for pipeline questions

Stems are two to five sentences. Before reading the options, extract five facts:

1. **Source and format**: an RDS database, CSV files, JSON events, a Kafka topic, a SaaS API.
2. **Volume and rate**: "2 TB each night", "50,000 events per second", "a few files per day".
3. **Latency**: nightly, hourly, "within minutes", "near real time", "sub-second".
4. **Consumer**: analysts in Amazon Athena, a Redshift dashboard, a downstream application, an alert.
5. **Qualifier**: the phrase that ranks two working answers.

Then cross out each option that misses a fact, and use the qualifier on what remains.

| Qualifier | What it usually points to |
| --- | --- |
| "LEAST operational overhead" | A managed or serverless service with a built-in feature: Amazon Data Firehose instead of a consumer fleet, AWS Glue instead of a self-managed Spark cluster, EventBridge Scheduler instead of cron on EC2 |
| "MOST cost-effective" | Columnar formats, partitioning, Glue flex jobs, Spot capacity for interruptible work, S3 storage classes, batch instead of streaming when latency allows |
| "near real time" | Firehose buffering, Kinesis Data Streams with Lambda, Redshift streaming ingestion; never a nightly job |
| "without managing servers" | Lambda, Glue, Athena, Redshift Serverless, EMR Serverless, Step Functions, MWAA Serverless |
| "reprocess" or "replay" | A store that keeps the data: Kinesis retention, Kafka retention, an EventBridge archive, raw objects in S3 |
| "minimal code changes" | Configuration of an existing service, or a managed version of the tool already in use (Amazon MSK for Kafka, Amazon MWAA for Airflow) |
| "least privilege" or "only approved users" | IAM roles scoped to resources, Lake Formation permissions, KMS key policies |

> **Exam trap.** Two options often differ only in latency. "Load clickstream data into Amazon S3 within 5 minutes" is satisfied by Firehose with a short buffer interval; a Glue job that runs every hour fails the requirement even though it is cheaper.

<!-- section: code-in-questions -->
## Reading code in a question

Code appears in the stem or in the options. Read it for one decisive detail rather than line by line:

| Snippet | What to look for |
| --- | --- |
| Athena or Redshift SQL | The `WHERE` clause on a partition column, `format` and `partitioned_by` in a `CREATE TABLE AS`, `IAM_ROLE` and `FORMAT AS PARQUET` in a `COPY`, `AUTO REFRESH` on a materialized view |
| PySpark or Glue script | `transformation_ctx` and `job.commit()` (job bookmarks), `groupFiles` (small files), `repartition` or `coalesce` (output file count), a `collect()` that pulls data to the driver |
| JSON policy | `Effect`, `Action`, `Resource` and `Condition`; a `Deny` always wins over an `Allow` |
| Step Functions definition | The resource suffix `.sync` or `.waitForTaskToken`, `Retry` and `Catch` blocks |
| AWS CLI | The parameter that changes behavior, for example `--parallelization-factor` or `--schedule-expression` |

A typical stem shows a short script and asks why each run reprocesses every file:

```python
source = glueContext.create_dynamic_frame.from_catalog(
    database="sales_raw", table_name="orders")
# ... transformations ...
glueContext.write_dynamic_frame.from_options(
    frame=source, connection_type="s3",
    connection_options={"path": "s3://example-curated/orders/"},
    format="parquet")
```

The source has no `transformation_ctx` and the script never calls `job.commit()`, so a job bookmark can't record progress, whatever the job setting says.

<!-- section: service-status -->
## Names and services that changed

The guide still uses some old names, and several in-scope services were closed or retired before November 2026. Certidrill never makes a closed service the correct answer for a new design:

| Service | Status in November 2026 |
| --- | --- |
| Amazon Kinesis Data Firehose | Now **Amazon Data Firehose**; same service |
| Kinesis Data Analytics for SQL | Shut down on January 27, 2026; use **Amazon Managed Service for Apache Flink** |
| Amazon QuickSight | Now part of **AWS Quick**, whose BI feature is Quick Sight |
| AWS CloudTrail Lake | Closed to new customers since May 31, 2026; AWS recommends Amazon CloudWatch |
| AWS Data Pipeline | Closed to new customers, maintenance only; use Step Functions, MWAA or Glue workflows |
| AWS Glue Ray jobs | Maintenance, no new customers; use Glue Spark or Python shell jobs |
| Amazon S3 Select and S3 Glacier Select | Maintenance, no new customers; query with Athena |
| Amazon Kendra, Amazon Q Business, Timestream for LiveAnalytics, S3 Glacier vaults | Maintenance, no new customers |
| AWS Snowball Edge, Lake Formation Governed Tables, Amazon QLDB | Shut down |
| Amazon Q Developer | Sign-ups closed on May 15, 2026; the successor is Kiro |
| SageMaker Data Wrangler | Now inside SageMaker Canvas |

<!-- section: confusing-pairs -->
## Families of options to tell apart

| Family | Options | Deciding difference |
| --- | --- | --- |
| Streaming | Kinesis Data Streams, Data Firehose, Amazon MSK, Amazon SQS | A retained, replayable stream read by your consumers; managed delivery to a destination with buffering and format conversion; Apache Kafka compatibility; a work queue whose messages disappear once processed |
| Transformation | Lambda, Glue, EMR, Redshift SQL | Short per-event or per-file work; serverless Spark with the Data Catalog; full control of open-source frameworks at large scale; SQL on data already in the warehouse |
| Orchestration | Step Functions, MWAA, Glue workflows, EventBridge | Serverless state machine for AWS services; Apache Airflow DAGs; chains of Glue jobs and crawlers only; event routing and schedules, no workflow state |
| Querying S3 | Athena, Redshift Spectrum, S3 Select | Serverless SQL billed per data scanned; S3 data joined with warehouse tables from Redshift; closed to new customers |
| Change data capture | AWS DMS, zero-ETL integrations, DynamoDB Streams | Replication from many engines with full load and CDC; managed replication from supported sources into Redshift without pipelines; item-level changes of one DynamoDB table for 24 hours |
| Access control | IAM policies, S3 bucket policies, Lake Formation | Who can call which API; who can reach one bucket; table, column, row and LF-tag permissions on the data lake |
| Data quality and preparation | Glue Data Quality, Glue DataBrew | Rules evaluated in pipelines and on catalog tables; visual, no-code cleaning recipes |
| Sensitive data | Amazon Macie, Lake Formation data filters | Discovers personal data in S3; restricts what an authorized user sees |

<!-- section: study-plan -->
## How to prepare

1. Follow the chapters in order: ingestion and transformation weigh a third of the exam and give the vocabulary of the other domains.
2. Build one pipeline end to end in a sandbox account: files land in S3, an S3 event starts a Glue job that writes Parquet, a crawler updates the Data Catalog, Athena queries the result, and Step Functions with an SNS alert wraps it.
3. Learn the numbers that decide answers: Kinesis shard throughput and retention, Lambda event source mapping settings, Firehose buffering, DynamoDB Streams retention, Redshift COPY file sizing.
4. Take a mock exam after each module and reread the sections linked to every miss, including the reason each distractor fails.
5. Book the exam once three consecutive mock exams of unseen questions score 800 or more.
