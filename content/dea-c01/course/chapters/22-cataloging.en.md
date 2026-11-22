A data catalog stores what engines need to read data where it lives: location, format, schema and partitions. Exam questions ask how to build and reference the AWS Glue Data Catalog, when a crawler is the right tool and how to tune it, why a query misses new partitions, how a job reaches a database in a VPC, and how a business catalog lets teams find and request data.

<!-- section: catalog-consumption | objectives: 2.2.1 -->
## Consuming data through a catalog

The catalog holds metadata only; the data stays in its source (S3, a database, a table bucket). An engine looks up the table, then reads the files or rows directly.

| Consumer | How it uses the Glue Data Catalog |
| --- | --- |
| Amazon Athena | Each catalog database and table is queryable with SQL; Lake Formation permissions apply |
| Redshift Spectrum | `CREATE EXTERNAL SCHEMA ... FROM DATA CATALOG` exposes catalog tables to Redshift SQL |
| Amazon EMR | Hive, Spark and Trino use the Data Catalog as their metastore |
| AWS Glue jobs | `create_dynamic_frame.from_catalog` reads a table by name, with partition pruning |
| SageMaker Unified Studio | Catalog tables are imported as assets of the business catalog |

Other accounts consume catalog tables through Lake Formation cross-account grants and resource links. S3 Tables integrated with the Data Catalog, and Athena data source connectors (Lambda functions for DynamoDB, JDBC databases and others), appear as additional catalogs that the same engines query.

> **Exam tip.** "Query the files in place, without loading or copying them" means a catalog table read by Athena or Redshift Spectrum. Defining the table once in the Data Catalog makes it available to both.

<!-- section: technical-catalog | objectives: 2.2.2 -->
## Building a technical catalog: Glue Data Catalog and Hive metastore

There is one Glue Data Catalog per account and Region. It contains **databases** (logical groups), **tables** (location, format, SerDe, columns, partition keys), **partitions**, and **connections**. It is compatible with the Apache Hive metastore.

| Way to create a table | When |
| --- | --- |
| Glue crawler | Unknown or changing schemas, many datasets |
| Athena DDL (`CREATE EXTERNAL TABLE`, `CREATE TABLE AS SELECT`) | Known schema, full control of types and properties |
| CloudFormation (`AWS::Glue::Table`), CDK or the Glue API | Tables deployed as code with the pipeline |
| Glue ETL job with `enableUpdateCatalog` | The job that writes the data registers the table and its partitions |

```text
CREATE EXTERNAL TABLE raw.clicks (
  user_id string,
  url string,
  event_time timestamp
)
PARTITIONED BY (dt string)
STORED AS PARQUET
LOCATION 's3://example-lake/raw/clicks/';
```

EMR can use the Glue Data Catalog as its Hive metastore through the `hive-site` classification, which gives a persistent metastore shared by clusters, Athena and Glue (and other accounts with `hive.metastore.glue.catalogid`):

```json
[
  {
    "Classification": "hive-site",
    "Properties": {
      "hive.metastore.client.factory.class": "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory"
    }
  }
]
```

The alternative is an external Hive metastore in an Amazon RDS or Aurora MySQL database, which the team operates. The default metastore on the cluster disappears with a transient cluster.

> **Exam trap.** A Hive metastore on the EMR primary node is lost when the cluster terminates. "Transient clusters must share table definitions with Athena" means the Glue Data Catalog as metastore.

<!-- section: crawlers | objectives: 2.2.3 -->
## Discovering schemas with Glue crawlers

A crawler connects to a data store, runs **classifiers** (built-in ones for CSV, JSON, Parquet, ORC, Avro, XML and others, or custom grok, JSON, XML and CSV classifiers) to infer format and schema, groups compatible files into tables and writes tables and partitions to the Data Catalog. Sources: S3, JDBC databases, DynamoDB, MongoDB and DocumentDB, Delta Lake, Iceberg and Hudi tables, existing catalog tables. It runs on demand, on a cron schedule, or from a Glue workflow trigger, with an IAM role that can read the source and update the catalog.

| Setting | Options |
| --- | --- |
| Include path and exclusions | S3 path or JDBC path `database/schema/table` (`%` as wildcard); exclude glob patterns such as `**.tmp` |
| Sample size (S3) | 1 to 249 files per leaf folder instead of all files, to shorten crawls of folders with a uniform schema |
| Subsequent runs (`RecrawlPolicy`) | `CRAWL_EVERYTHING`, `CRAWL_NEW_FOLDERS_ONLY` (incremental), `CRAWL_EVENT_MODE` (S3 event notifications identify changed folders) |
| Schema change policy | `UpdateBehavior`: `UPDATE_IN_DATABASE` or `LOG`; `DeleteBehavior`: `LOG`, `DELETE_FROM_DATABASE` or `DEPRECATE_IN_DATABASE` |
| Output configuration | Add new columns only (`MergeNewColumns`); partitions inherit the table schema (`InheritFromTable`); single schema for each S3 path (`CombineCompatibleSchemas`); table level; maximum number of tables |
| Lake Formation credentials | Crawl with Lake Formation permissions, in the same or another account |

Crawlers create partition indexes by default for S3 and Delta Lake targets.

```bash
aws glue create-crawler --name clicks-raw \
  --role arn:aws:iam::111122223333:role/GlueCrawlerRole \
  --database-name raw \
  --targets '{"S3Targets":[{"Path":"s3://example-lake/raw/clicks/","Exclusions":["**.tmp"]}]}' \
  --recrawl-policy RecrawlBehavior=CRAWL_NEW_FOLDERS_ONLY \
  --schema-change-policy UpdateBehavior=LOG,DeleteBehavior=LOG \
  --schedule "cron(15 * * * ? *)"
```

> **Exam trap.** A crawler that creates one table per folder instead of one partitioned table usually found incompatible schemas or formats (a stray CSV among Parquet files, different headers). Remove or exclude the odd files, enable "Create a single schema for each S3 path", or set the table level.

<!-- section: partition-sync | objectives: 2.2.4 -->
## Synchronizing partitions with the catalog

New folders in S3 are invisible to Athena and Spectrum until their partitions exist in the catalog (or are projected).

| Method | Use |
| --- | --- |
| Glue job with `enableUpdateCatalog` and `partitionKeys` | The writing job adds partitions as it writes (S3 targets; JSON, CSV, Avro, Parquet) |
| Crawler, incremental or event mode | Mixed producers, schema changes to detect |
| `MSCK REPAIR TABLE` in Athena | Hive-style folders (`dt=2026-11-20/`) at first load or to resync; adds only, can time out on large tables |
| `ALTER TABLE ADD PARTITION ... LOCATION` | Daily adds, or folders not in `key=value` form; `DROP PARTITION` removes stale ones |
| Glue API `BatchCreatePartition` | A Lambda function triggered by S3 events registers each new folder |
| Athena partition projection | Predictable values (dates, integers, enums, injected strings): partitions computed at query time, nothing to register |

```text
ALTER TABLE raw.clicks ADD IF NOT EXISTS
PARTITION (dt = '2026-11-20') LOCATION 's3://example-lake/raw/clicks/dt=2026-11-20/';

ALTER TABLE raw.device_logs SET TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.dt.type' = 'date',
  'projection.dt.format' = 'yyyy/MM/dd',
  'projection.dt.range' = '2024/01/01,NOW',
  'storage.location.template' = 's3://example-lake/raw/device_logs/${dt}/'
);
```

When a table has millions of partitions, **partition indexes** (up to 3 per table) let `GetPartitions` return only matching partitions. Redshift Spectrum, EMR and Glue Spark DataFrames use them automatically; Athena needs the table property `partition_filtering.enabled` set to `true`. The first index key must appear in the filter, combined with `AND` only.

> **Exam trap.** Partition projection works only in Athena: Redshift Spectrum, EMR and Athena for Spark still read partitions from the catalog. When several engines share the table, register partitions instead.

<!-- section: connections | objectives: 2.2.5 -->
## Creating source and target connections

A **Glue connection** is a Data Catalog object that stores a URL, credentials and VPC settings for a data store. Crawlers and jobs reuse it for sources and targets, and the same connection schema serves Glue, Athena and SageMaker Unified Studio.

| Type | Details |
| --- | --- |
| JDBC | `jdbc:postgresql://host:5432/db`, `jdbc:mysql://host:3306/db`, `jdbc:redshift://host:5439/dev`, `jdbc:sqlserver://host:1433;databaseName=db` |
| Native connectors | Redshift, MySQL, PostgreSQL, Oracle, SQL Server, DocumentDB, OpenSearch Service, Snowflake, BigQuery, SAP HANA, Teradata, Salesforce and others |
| Kafka | Bootstrap servers (MSK or self-managed); SASL/SCRAM, SASL/GSSAPI, SASL/PLAIN or TLS client authentication |
| MongoDB | MongoDB or MongoDB Atlas URL |
| Network | Only VPC, subnet and security group, to reach a private endpoint |
| Marketplace or custom connectors | Data stores without native support |

Store credentials in **Secrets Manager** and reference the secret; avoid user names and passwords in the connection. For a source inside a VPC, Glue places elastic network interfaces in the connection's subnet:

| Symptom | Fix |
| --- | --- |
| Connection test or crawler times out | Security group with a self-referencing inbound rule for all TCP ports; database security group allows the Glue security group on the database port |
| Job reaches the database but cannot read or write S3 | S3 gateway endpoint in the VPC (HTTPS 443 to its prefix list if outbound is restricted) or a NAT gateway |
| Authentication failure | Secret contents and the IAM role's permission to read the secret |

> **Exam tip.** The self-referencing security group rule is the classic answer to "the Glue job cannot connect to the RDS database in a private subnet": Glue's own workers must be able to talk to each other.

<!-- section: business-catalog | objectives: 2.2.6 -->
## Business data catalogs with Amazon SageMaker Catalog

A technical catalog tells engines how to read data. A **business catalog** tells people what the data means, who owns it and how to get access.

| | Technical catalog | Business catalog |
| --- | --- | --- |
| Example | Glue Data Catalog, Hive metastore | Amazon SageMaker Catalog |
| Content | Location, format, columns, partitions | Business names, descriptions, glossary terms, owners, metadata forms |
| Users | Engines and data engineers | Analysts, data scientists, data stewards |
| Access | IAM and Lake Formation grants | Subscription requests approved by the owner |

Amazon SageMaker Catalog is part of Amazon SageMaker Unified Studio (it uses the Amazon DataZone APIs):

- A **domain** organizes assets, users and projects; **domain units** map business units. The catalog's scope is the domain.
- A **project** is the team's workspace. **Data sources** (Glue Data Catalog, Redshift) import technical metadata as **inventory assets**, visible only to the project.
- Owners curate assets: business names, descriptions, README, **business glossary** terms, mandatory **metadata forms**. AI recommendations (Amazon Bedrock models) suggest names, descriptions and glossary terms; unreviewed suggestions are not published.
- **Publishing** makes the latest version of an asset discoverable by every project in the domain. Assets can be grouped into **data products**.
- A consumer project sends a **subscription request** with a justification; the owner approves or rejects it. For managed assets, approval triggers fulfillment: Lake Formation grants on Glue tables (the table must be Lake Formation-managed; LF-tag-based access control is not supported for this), permissions on Redshift tables and views. For unmanaged assets, events published to EventBridge drive a custom grant.

> **Exam trap.** A business catalog does not replace Lake Formation: SageMaker Catalog records the request and approval, then Lake Formation (or Redshift) enforces the access. "Self-service discovery with an approval workflow and business glossary" is SageMaker Catalog; "column-level permissions on a table" is Lake Formation.

<!-- section: key-points -->
## Key points

- A catalog holds metadata; data stays in place. Athena, Redshift Spectrum, EMR and Glue jobs all read the Glue Data Catalog.
- One Glue Data Catalog per account and Region: databases, tables, partitions, connections; Hive-metastore compatible and usable as the EMR metastore through `hive-site`.
- Crawlers: classifiers, include and exclude paths, sample size, `CRAWL_NEW_FOLDERS_ONLY` or `CRAWL_EVENT_MODE`, schema change policy, single schema per S3 path.
- Register partitions from the writing job, a crawler, `MSCK REPAIR TABLE` (Hive-style, adds only) or `ALTER TABLE ADD PARTITION`; partition projection is Athena-only; partition indexes speed up huge tables.
- Glue connections hold URL, secret and VPC settings; a self-referencing security group rule and an S3 endpoint are required inside a VPC.
- SageMaker Catalog: domains, projects, data sources, glossary, metadata forms, publishing, subscriptions fulfilled through Lake Formation or Redshift.
