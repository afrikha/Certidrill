Data modeling questions describe the queries a team will run and ask for the structure that makes them fast and cheap: Redshift distribution and sort keys, DynamoDB keys and indexes, data lake partitions and formats. Then something changes (a new column, a new source engine, ten times more data) and you pick the design that absorbs it. The chapter also covers schema conversion, data lineage and vector embeddings.

<!-- section: redshift-schema | objectives: 2.4.1 -->
## Designing Amazon Redshift schemas

Redshift spreads rows across the slices of its compute nodes: a query is fast when it reads few blocks and moves little data between nodes. A **star schema** (large fact table, small dimensions) is the usual model.

| Table setting | Options | Choose it when |
| --- | --- | --- |
| Distribution style | `AUTO` (default: Redshift picks and adjusts the style as the table grows) | No clear join pattern |
| | `KEY` on one column | Two large tables joined on that column: matching rows share a slice, the join is collocated |
| | `ALL` | Small, slowly changing dimensions: a full copy on every node |
| | `EVEN` | Tables not joined, or no column spreads evenly |
| Sort key | Compound (columns by priority) | Filters and range scans on the leading column, usually a date |
| | Interleaved | Equal weight to several filter columns; costly to maintain, rarely the answer |
| | `AUTO` | Automatic table optimization chooses from the workload |
| Column compression | `ENCODE AUTO` (default), `AZ64`, `ZSTD`, `LZO` | Keep AUTO unless a specific encoding is asked |

```text
CREATE TABLE sales_fact (
  sale_id      BIGINT,
  customer_id  INTEGER,
  product_id   INTEGER,
  sale_date    DATE,
  amount       DECIMAL(12,2)
)
DISTSTYLE KEY
DISTKEY (customer_id)
COMPOUND SORTKEY (sale_date, product_id);

CREATE TABLE product_dim (
  product_id   INTEGER,
  category     VARCHAR(64),
  brand        VARCHAR(64)
)
DISTSTYLE ALL;
```

A distribution key needs **high cardinality and an even spread**: a key with a few dominant values (country, status) causes **data skew**, one slice holding most rows. Semi-structured JSON can go into a `SUPER` column, queried with PartiQL, instead of being flattened upfront.

> **Exam trap.** Sort keys let Redshift skip blocks through zone maps (min and max per block); distribution keys decide which slice stores a row. "Queries filter on the last 7 days" is a sort key on the date; "a join of two large tables is slow because of redistribution" is a matching `DISTKEY`.

<!-- section: dynamodb-schema | objectives: 2.4.1 -->
## Designing DynamoDB tables

DynamoDB is modeled from **access patterns**, not entities: list every query first, then choose keys that answer each one with `GetItem` or `Query`, never `Scan`.

| Element | Rules |
| --- | --- |
| Partition key | Hashed to place the item; high cardinality (customer ID, device ID) so requests spread across partitions |
| Sort key | Orders items within a partition key, allows range conditions (`begins_with`, `between`); composite values like `ORDER#2026-11-21#0042` serve several patterns |
| Global secondary index (GSI) | Other partition and sort keys, can be added at any time, eventually consistent, its own capacity |
| Local secondary index (LSI) | Same partition key, other sort key, only at table creation, strongly consistent reads possible, 10 GB per item collection |
| Item size | 400 KB maximum: large payloads go to S3, the item keeps the object key |

Patterns to know: **single-table design** (several entity types with generic keys `PK` and `SK`, so one `Query` returns a customer and its orders), **write sharding** (a hot key such as today's date gets a suffix, `2026-11-21#7`, to spread writes), **sparse GSI** (only items with the attribute are indexed: "open orders"), **TTL** for free expiry and **DynamoDB Streams** to feed changes downstream.

> **Exam tip.** "Query an existing table by a non-key attribute" is a GSI: an LSI can't be added after the table is created.

<!-- section: lake-schema | objectives: 2.4.1 -->
## Designing data lake schemas with Lake Formation

In a data lake the schema lives in the **AWS Glue Data Catalog**, governed by Lake Formation: databases group tables, and each table points to an S3 location with columns, format, SerDe and **partition columns**. Lake Formation grants access on databases, tables and columns.

- **Zones** as separate databases and prefixes: raw (as received), cleaned (typed, deduplicated, Parquet), curated (business tables), each with its own grants.
- **Partition columns** matching the common filters (date, Region), not high-cardinality IDs.
- **Apache Iceberg tables** for updates, deletes, ACID transactions, time travel and schema evolution; Athena, Glue, EMR and Redshift use them, and Amazon S3 Tables stores Iceberg tables with automatic maintenance.
- Lowercase column names, consistent types, and LF-Tags on sensitive columns.

> **Exam trap.** Lake Formation Governed Tables have been shut down. Transactional inserts, updates and deletes on lake tables call for Apache Iceberg tables (or S3 Tables).

<!-- section: schema-evolution | objectives: 2.4.2 -->
## Handling changes in data characteristics

Athena applies the table schema when it reads (schema on read) and never rewrites files, so the changes a table tolerates depend on how the format maps columns:

| Change | CSV, TSV | JSON, Avro | Parquet (read by name, the default) | ORC (read by index, the default) |
| --- | --- | --- | --- | --- |
| Add a column at the end | Yes | Yes | Yes | Yes |
| Add a column in the middle | No | Yes | Yes | No |
| Remove or reorder columns | No | Yes | Yes | No |
| Rename a column | Yes | No | No | Yes |

**Iceberg tables** support adding, dropping, renaming and reordering columns, and promotions such as int to bigint or float to double, as **metadata-only** changes: no data file is rewritten.

```text
ALTER TABLE lake.orders ADD COLUMNS (coupon_code string);
ALTER TABLE lake.orders CHANGE COLUMN qty quantity int;
ALTER TABLE lake.orders DROP COLUMN legacy_flag;
```

**Glue crawlers** apply a schema change policy: update the catalog table (default), add new columns only, or ignore and log (`UpdateBehavior=LOG`); partitions can inherit the table schema so one odd file doesn't create a divergent partition.

```bash
aws glue update-crawler \
  --name orders-raw-crawler \
  --schema-change-policy UpdateBehavior=LOG,DeleteBehavior=LOG \
  --configuration '{"Version":1.0,"CrawlerOutput":{"Partitions":{"AddOrUpdateBehavior":"InheritFromTable"}}}'
```

**Streaming schemas** are versioned in the **AWS Glue Schema Registry** (Avro, JSON Schema, Protobuf), integrated with MSK, Kinesis Data Streams, Managed Service for Apache Flink and Lambda. Its compatibility mode decides which new versions are accepted: `BACKWARD` (recommended: consumers using the new version can read data written with the previous one), `FORWARD`, `FULL`, the `_ALL` variants that check every earlier version, `NONE`, `DISABLED`.

**Volume and velocity** changes are absorbed by on-demand modes (Kinesis Data Streams, DynamoDB), autoscaling (EMR managed scaling, Glue Auto Scaling, Redshift Serverless) and repartitioning when a key becomes skewed.

> **Exam tip.** "Producers will add fields and existing consumers must keep working" is the Schema Registry with `BACKWARD` compatibility, or a format read by name. "Stop the crawler from changing a curated table" is `UpdateBehavior=LOG`.

<!-- section: schema-conversion | objectives: 2.4.3 -->
## Converting schemas between engines

A heterogeneous migration converts the schema and code objects (tables, views, procedures) first, then moves the data with AWS DMS.

| Tool | What it is | Choose it when |
| --- | --- | --- |
| **DMS Schema Conversion** | Managed, web-based feature of AWS DMS built on the SCT engine: an **instance profile** (network, encryption), **data providers** (source and target connections), a **migration project** with Secrets Manager credentials; assessment report, conversion, apply to target or export SQL to S3; generative AI conversion on some paths | Supported paths: Oracle, SQL Server, Db2, SAP ASE to Aurora or RDS PostgreSQL; Oracle or SQL Server to MySQL; Oracle to Redshift; nothing to install |
| **AWS SCT** | Installed application with projects; converts OLTP schemas and data warehouses (Teradata, Netezza, Greenplum, Vertica, Snowflake, BigQuery, Azure Synapse...) to Redshift; manages **data extraction agents** | Warehouse migrations to Redshift, paths DMS Schema Conversion lacks |
| **AWS DMS** | Full load and change data capture (CDC) | Moving the data once the schema exists |

Order: assessment report (what converts automatically, what needs manual work), conversion, fixes, apply to target, DMS full load plus CDC, cutover. An **extension pack** emulates source features the target lacks.

> **Exam trap.** AWS DMS migrates data, not stored procedures. "Convert the PL/SQL packages before migrating" needs DMS Schema Conversion or SCT.

<!-- section: data-lineage | objectives: 2.4.4 -->
## Establishing data lineage

Lineage records where a data set came from, which jobs transformed it and who consumes it.

| Tool | What it tracks | How |
| --- | --- | --- |
| **Amazon SageMaker Catalog** (SageMaker Unified Studio) | Catalog assets, their sources, transformations and subscribers | **OpenLineage**-compatible events: automatic for Visual ETL jobs (Glue 5.0 or later, DataFrames only); Spark settings for Glue notebooks and EMR; "Import data lineage" on Glue (Lakehouse) and Redshift connections (Redshift lineage read daily from system tables); API for other OpenLineage tools |
| **SageMaker ML Lineage Tracking** | ML workflow steps from data preparation to deployment | Trial components (processing, training, transform jobs), artifacts (S3 data set, ECR image), actions (deployment), contexts (endpoint), associations (`ContributedTo`, `Produced`, `DerivedFrom`...); many created automatically |

> **Exam tip.** "Show which source tables and ETL jobs produced this curated table" is SageMaker Catalog lineage; "find the data set used to train this model version" is ML Lineage Tracking.

<!-- section: data-optimization | objectives: 2.4.5 -->
## Indexing, partitioning and compression

| Technique | Where | Best practice |
| --- | --- | --- |
| Partitioning | Tables on S3 (Athena, Glue, Redshift Spectrum) | Columns of the common filters (date, Region); avoid many tiny partitions |
| Partition projection | Athena | Many or predictable partitions: computed from table properties, no crawler or `MSCK REPAIR TABLE` |
| Partition indexes | Glue Data Catalog | Many partitions filtered by equality or range; `STRING` partition keys for filter pushdown |
| Bucketing | Athena, Spark | High-cardinality column looked up by single values (user ID) |
| Columnar formats | Parquet, ORC | Read only needed columns; skip row groups using min/max statistics, more effective when data is sorted on the filter column |
| Compression | Snappy, ZSTD, GZIP | Athena bills bytes scanned before decompression; compressed text files can't be split, columnar files can |
| File size | S3 data lakes | Fewer, larger files; compact small files (Glue, EMR, Iceberg compaction) |

```text
CREATE EXTERNAL TABLE logs.clicks (user_id string, page string, ts timestamp)
PARTITIONED BY (dt string)
STORED AS PARQUET
LOCATION 's3://example-lake/clicks/'
TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.dt.type' = 'date',
  'projection.dt.format' = 'yyyy-MM-dd',
  'projection.dt.range' = '2024-01-01,NOW',
  'storage.location.template' = 's3://example-lake/clicks/dt=${dt}/'
);
```

S3 supports at least 3,500 write and 5,500 read requests per second per prefix.

> **Exam trap.** Partitioning by a high-cardinality column such as `user_id` creates millions of tiny partitions and slows queries. Partition by date; bucket or sort by the high-cardinality column.

<!-- section: vectorization | objectives: 2.4.6 -->
## Vectorization and Amazon Bedrock knowledge bases

**Vectorization** turns content into **embeddings**: fixed-length arrays of numbers produced by an embedding model, close to each other when meanings are similar. A vector store indexes them; a question embedded with the same model finds the nearest chunks (cosine or Euclidean distance). This is the retrieval step of retrieval-augmented generation (RAG).

An **Amazon Bedrock knowledge base** runs the pipeline: a **data source** (for example S3) holds documents; a **sync** (ingestion job) parses them, splits them into **chunks**, calls the embedding model and writes vectors and metadata to the vector store (re-sync when documents change); applications call `Retrieve` (chunks) or `RetrieveAndGenerate` (chunks passed to a foundation model).

| Chunking strategy | Behavior |
| --- | --- |
| Default | About 300 tokens per chunk, sentence boundaries kept |
| Fixed-size | Your maximum tokens and overlap percentage |
| Hierarchical | Small child chunks matched, larger parent chunks returned |
| Semantic | Splits where meaning changes; uses a foundation model, costs more |
| No chunking | One chunk per file (content already chunked) |

Vector stores: OpenSearch Serverless, OpenSearch Service managed clusters, **Amazon S3 Vectors**, Aurora PostgreSQL (pgvector), Neptune Analytics (GraphRAG), Pinecone, Redis Enterprise Cloud, MongoDB Atlas. The index dimension must match the embedding model.

| Index | How it works | Trade-off |
| --- | --- | --- |
| **HNSW** | Multi-layer graph of neighbors, searched from coarse to fine | High recall, low latency, more memory, no training; the usual default |
| **IVF** | Vectors clustered around centroids; a query searches the nearest clusters | Less memory, needs training on sample vectors, recall depends on clusters probed |

```text
CREATE INDEX ON kb.chunks USING hnsw (embedding vector_cosine_ops);
```

> **Exam trap.** A new embedding model means re-embedding every document: vectors from two models aren't comparable and dimensions may differ. Plan a new index and a full sync.

<!-- section: key-points -->
## Key points

- Redshift: `KEY` on the join column of large tables, `ALL` for small dimensions, `AUTO` by default; sort key on the filter column; avoid skewed keys.
- DynamoDB: design from access patterns; GSI anytime, LSI only at creation; shard hot keys; 400 KB items.
- Lake schemas live in the Glue Data Catalog under Lake Formation; Iceberg for transactions (Governed Tables are shut down).
- Change tolerance depends on the format; Iceberg changes are metadata-only; crawler `UpdateBehavior=LOG` freezes a schema; Schema Registry `BACKWARD` for streams.
- DMS Schema Conversion or SCT converts schemas and code; DMS moves data.
- Lineage: SageMaker Catalog for data, ML Lineage Tracking for models.
- Partition on common filters, project partitions, compressed Parquet, no small files.
- Bedrock knowledge bases: chunk, embed, store, retrieve; HNSW for recall, IVF for memory.
