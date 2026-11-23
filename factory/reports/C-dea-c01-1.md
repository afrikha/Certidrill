# C-dea-c01-1 — COURSE DEA-C01, chapters 00, 11, 12, 13 (2026-11-23)

## Output
- `content/dea-c01/course/chapters/{00-getting-started,11-ingestion,12-transformation,13-orchestration}.{en,fr}.md`.
- Prose words (EN, code and table pipes excluded): 00 ≈ 1,410; 11 ≈ 2,190 (12 objectives, kept just under 2,200); 12 ≈ 1,950; 13 ≈ 1,470.
- `check-cert.ts dea-c01 00-getting-started 11-ingestion 12-transformation 13-orchestration`: course problems (your chapters) 0. All 26 objectives (1.1.1–1.1.12, 1.2.1–1.2.10, 1.3.1–1.3.4) in section markers.
- SQL in `text` fences (Redshift streaming ingestion, Athena CTAS); PySpark in `python`.

## Facts verified (WebFetch, AWS docs, 2026-11-22/23)
Kinesis quotas (shard 1 MB/s or 1,000 rec/s write, 2 MB/s read, GetRecords 5 TPS, PutRecords 500, 10 MiB records, 24 h–365 d, EFO 20 consumers / 50 on On-demand Advantage); Lambda Kinesis ESM parameters, on-failure destinations (SQS/SNS metadata, S3 with payload), tumbling windows (900 s, 1 MB state); DynamoDB Streams vs Kinesis Data Streams for DynamoDB; EventBridge Scheduler syntax; S3 notifications (no SQS FIFO, overlap rule, at-least-once); EventBridge archive/replay, API destinations (5 s timeout, 24 h retries), Pipes sources and enrichments; Glue bookmarks, triggers, workflows (900 s batch window, 100 components), worker types, flex (G.1X/G.2X), timeout defaults (480 min Glue 5.0+, 2,880 before, max 7 days), retries 0–10, groupFiles, OOM debugging, streaming jobs (100 s windows, checkpoints, hourly billing), VPC self-referencing rule; Firehose CIDR for Redshift and Splunk, record format conversion (JSON only); Redshift streaming ingestion syntax, zero-ETL sources, Data API limits, COPY file sizing; Athena CTAS 100-partition limit, federated query (read-only); Step Functions Standard vs Express, integration patterns, Distributed Map, redrive (14 days), Glue and Bedrock integrations; MWAA and MWAA Serverless (What's New, Nov 2025); Fargate sizes (32 vCPU / 244 GB, no GPU); EMR Spot guidelines; Bedrock batch inference (50 % lower for select models, not provisioned models); Lambda quotas (timeout given once with the 30/15/90-minute caveat per F-lambda-timeout; exam trap uses multi-hour jobs).

## From general knowledge, not fetched (low risk, review if desired)
- Firehose source from Amazon MSK; SAM `ScheduleV2` event with `ScheduleExpressionTimezone`; Glue JDBC `hashfield`/`hashpartitions`; `glueparquet` format; Athena `startQueryExecution.sync`; `JitterStrategy`; SNS topic policy / customer managed KMS key for EventBridge and CloudWatch publishers; Lambda tumbling-window `event["window"]` field.
- Not stated: Kinesis on-demand numbers, Redshift port, EventBridge targets per rule, SQS retention.

## Deviations
- 00-getting-started follows the SAA/DVA model structure (ends with `study-plan`, no `key-points` section).
