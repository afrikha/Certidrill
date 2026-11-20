# C-saa-c03-5 — COURSE SAA-C03, chapters 42–45 (2026-11-19)

## Output
- `content/saa-c03/course/chapters/42-storage-tiering-lifecycle.{en,fr}.md` (about 1,870 English words, without code)
- `43-cost-compute-purchasing.{en,fr}.md` (about 1,880)
- `44-compute-rightsizing.{en,fr}.md` (about 1,660)
- `45-cost-database-selection.{en,fr}.md` (about 1,810)
- `check-cert.ts saa-c03 42… 43… 44… 45…`: course problems (your chapters) 0.
- No links in the chapters (so the EN/FR link check has nothing to compare). Code: `json`, `bash`, `text` only.

## Facts that changed recently (checked on docs.aws.amazon.com / aws.amazon.com)
- **S3 Lifecycle 30-day rule removed** (What's New, July 16, 2026): you can now transition to Standard-IA / One Zone-IA from day 0. The 30-day minimum storage charge of those classes still applies (storage class page). Chapter 42 says this and warns that older material gives the 30-day rule. Question writers should not make "must wait 30 days" a correct answer.
- **Database Savings Plans** (Dec 2025): up to 35 %, 1-year term, No Upfront only; covers Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS, OpenSearch Service; cannot be combined with RIs or DynamoDB reserved capacity on the same usage.
- **DynamoDB on-demand** is now "the default and recommended" capacity mode.
- **Timestream for LiveAnalytics** closed to new customers on 6/20/25; Timestream for InfluxDB recommended (used as the time series answer). Timestream is not in the guide's in-scope list.
- Aurora Serverless v2: 0–256 ACUs (Aurora MySQL), up to 384 (Aurora PostgreSQL, specific versions); auto-pause at 0 ACUs.
- Redshift Serverless base capacity 4–512 RPUs (1,024 in five Regions), default 128; 60-second minimum, per-second metering.
- Compute Optimizer now also covers RDS/Aurora, DynamoDB, NAT gateways, ElastiCache, etc.

## Left out or stated cautiously (not verified)
- EBS Snapshots Archive restore duration (24–72 h is commonly quoted; the docs pages fetched did not state it): chapter only says it must be restored before use.
- Lambda@Edge viewer-event timeout (the fetched summary said 30 s for viewer events, which contradicts the usual 5 s): chapter gives no timeout.
- Maximum hibernation duration (often quoted as 60 days): omitted.
- Fargate Spot two-minute warning: omitted.
- From general knowledge, not on a fetched page: T3/T3a/T4g default to unlimited mode is NOT stated (chapter describes both modes only); memory metrics need the CloudWatch agent (stated; standard AWS guidance); Lambda per-ms billing not stated; DynamoDB TTL deletes without consuming write capacity (stated, standard DynamoDB doc fact); RDS for Oracle License Included = SE2 (stated).

## Overlap with neighbours
- 4.1.15 (storage auto scaling) and 4.1.4/4.1.21 are in chapter 41; 4.3.14 migration and 4.3.3/4.3.8/4.3.10 are in chapter 46. Chapter 45 touches migration types only for 4.3.7 (homogeneous vs heterogeneous) and points to DMS Schema Conversion + DMS.
