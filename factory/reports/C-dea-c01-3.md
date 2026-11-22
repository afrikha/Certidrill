# C-dea-c01-3 — COURSE DEA-C01, chapters 24, 31, 32, 33 (2026-11-23)

## Output
- `content/dea-c01/course/chapters/24-data-modeling.{en,fr}.md` — 8 sections + key points (2.4.1 ×3, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6), 8 callouts. ~2,200 EN words outside code.
- `31-automation.{en,fr}.md` — 9 sections + key points (3.1.1 to 3.1.9), 9 callouts. ~2,180 words.
- `32-analysis.{en,fr}.md` — 6 sections + key points (3.2.1 to 3.2.6), 6 callouts. ~1,680 words.
- `33-monitoring.{en,fr}.md` — 8 sections + key points (3.3.5, 3.3.1, 3.3.2, 3.3.7, 3.3.3, 3.3.4, 3.3.6, 3.3.8), 8 callouts. ~2,150 words.
- `check-cert.ts dea-c01 24-data-modeling 31-automation 32-analysis 33-monitoring`: course problems (your chapters) 0.
- Code fences: text (SQL, Logs Insights), bash, json, yaml, python only; identical EN/FR.

## Verified with WebFetch (docs.aws.amazon.com)
- Lambda quotas: timeout 1,800 s (30 min), memory and /tmp 128/512–10,240 MB, payloads 6 MB / 1 MB. Kinesis ESM parameters (batch 100 default / 10,000, window 5 min, parallelization 1–10, retries/record age -1 default, SQS or SNS on-failure, tumbling 900 s).
- Bedrock KB: 8 vector stores (incl. S3 Vectors, Neptune Analytics), chunking strategies (default ~300 tokens).
- Athena: Spark workgroups (engine fixed, notebook editor, DPU 4 vCPU/16 GB, coordinator/executor 1 DPU, max concurrent 20 (3–60), idle 20 min (1–480), session not ended by closing tab); PySpark engine v3 console, Spark 3.5 via SageMaker Unified Studio / Spark Connect; capacity reservations (min 4 DPU, 20 workgroups, not Spark); query result reuse (60 min default, 7 days max, not with LF fine-grained); schema update table per format; Iceberg metadata-only evolution and type promotions; data optimization page.
- SageMaker Catalog lineage (OpenLineage; Visual ETL automatic with Glue 5.0+ DataFrames; Glue notebooks/EMR config; "Import data lineage" on Glue and Redshift connections, Redshift daily); ML Lineage Tracking entities and association types.
- DMS Schema Conversion (components, conversion paths, gen AI paths, built on SCT engine); SCT data warehouse sources and extraction agents (no deprecation notice).
- Glue Schema Registry (formats, 8 compatibility modes, BACKWARD recommended — default not stated, so not claimed); crawler schema change policy (LOG, MergeNewColumns, InheritFromTable).
- Step Functions Standard vs Express; MWAA architecture and log types/group naming; MWAA Serverless (YAML, EventBridge Scheduler, per-workflow role) — exists since Nov 2025.
- Glue worker types (G.1X–G.16X, R.1X–R.8X), Flex (Glue 3.0+, G.1X/G.2X only), timeout defaults (480 min Glue 5.0+, 2,880 before), retries 0–10, max concurrency 1, G.025X; Glue EventBridge events and job delay notification; job run insights.
- EventBridge Scheduler (270+ services, flexible windows, templated/universal targets); S3 → EventBridge (all events once enabled).
- Redshift Data API (24 h result retention, 500 MB, Serverless support); Redshift Serverless capacity (RPU 16 GB, base 128 default, min 4); PIVOT/UNPIVOT limits; materialized view refresh (incremental conditions, AUTO REFRESH 300 s default, CASCADE); audit logging (enable_user_activity_logging, SSE-S3 only, Object Lock off, Serverless → CloudWatch only).
- CloudTrail concepts (defaults, 90-day event history, org trails); CloudTrail Lake closure notice (May 31, 2026; CloudWatch recommended; `aws logs create-import-task`).
- CloudWatch Logs log classes: **Infrequent Access renamed Essentials** (read APIs return ESSENTIALS from December 2026), Delivery class; export to S3 (12 h availability, 24 h timeout, SSE-KMS ok, subscriptions recommended).
- Kinesis quotas (1 MB/s or 1,000 rec/s write per shard; on-demand starts at 4 MB/s write). Note: max record payload is now 10 MiB — not used in the chapters.
- Data Wrangler in SageMaker Canvas; DataBrew 250+ transformations, recipe and profile jobs.

## From general knowledge, not confirmed on a fetched page
- Redshift distribution/sort key behavior, ENCODE AUTO, SUPER/PartiQL, late-binding view syntax, RA3/pause-resume, concurrency scaling, `SVV_TABLE_INFO` columns.
- DynamoDB key rules (LSI only at creation, 10 GB item collection, 400 KB items, sparse GSI, write sharding).
- S3 3,500/5,500 requests per second per prefix; Athena 10 MB minimum per query; Athena `ExecutionParameters` string values quoted (`"'2026-11-21'"`); `approx_distinct`.
- Step Functions error names (`States.Timeout` covering heartbeat), Retry/Catch fields, `.sync` integrations for Glue and Athena; Express logging.
- Redshift Data API CLI `--with-event`; EventBridge Scheduler DLQ and "recommended over scheduled rules"; SAM Kinesis event properties.
- Glue flags `--enable-continuous-cloudwatch-log`, observability metrics, Spark UI; Glue Auto Scaling; bookmark `transformation_ctx`/`job.commit()`; Glue connection self-referencing security group rule; EMR log paths (`stderr`, `syslog`, `controller`, `/mnt/var/log/`); EMR 2-month retention of terminated clusters (this one confirmed).
- CloudTrail integrity validation (hourly SHA-256 digests); subscription filter destinations (Kinesis, Firehose, Lambda; OpenSearch via Lambda); account-level subscription filter policy; SNS + KMS key policy for EventBridge/CloudWatch.
- HNSW vs IVF trade-offs; pgvector `hnsw` index syntax.

## Choices and deviations
- 2.4.1 split into three sections (Redshift, DynamoDB, Lake Formation); Lake Formation schema = Glue Data Catalog + Iceberg, with a trap on the shut-down Governed Tables.
- AWS SCT presented as still available (no notice on its welcome page) for data warehouse migrations, DMS Schema Conversion for managed OLTP paths.
- CloudTrail Lake presented only as closed to new customers (existing users continue), with CloudWatch as AWS's recommendation; never recommended for new designs.
- Quick Sight presented as the BI capability of AWS Quick (formerly Amazon QuickSight); log class name "Essentials (formerly Infrequent Access)"; CloudFormation sample uses `STANDARD`.
- Amazon Q Developer and Kiro not mentioned (not needed for these objectives).
- French to review: « tranches (slices) », « asymétrie des données (data skew) », « conception à table unique », « partitionnement des écritures (write sharding) », « GSI clairsemé (sparse) », « fragments (chunks) », « plongements (embeddings) », « vue à liaison tardive (late-binding) », « journal de suivi (trail) », « fichiers de condensat », « saler (salting) », « calcul (calculation) » for Athena Spark.
