# Q-dea-c01-3c — QUESTIONS DEA-C01, operations 3.3.5–3.4.5 (2026-11-23)

45 questions, prefix `deac01-3c-`, 5 per objective (3.3.5, 3.3.6, 3.3.7, 3.3.8, 3.4.1–3.4.5); single 37 / multi 8 (all "Choose two", no scoring NOTE: blueprint scores multi all or nothing); difficulty 13 easy / 23 medium / 9 hard. Both validators: 0 problem(s) (`factory/validate.ts` and `content:validate --cert dea-c01`). No course chapters existed for these objectives when the batch was written.

## Deduplication against parallel batches
After a first draft, 13 questions were replaced because other DEA-C01 batches already tested the same decision with the same answer: Glue self-referencing security group (5 copies elsewhere), bookmark `transformation_ctx` (1c), Glue skewness alarm (1d), Glue DQ EventBridge alert (1d), CloudTrail + Athena partition projection (4c), Essentials log class (4b), EMR for Spark log sessionization (4c), Firehose ProcessingFailed (1a), COPY MAXERROR (2c), DataBrew profile job for statistics (3a, 3b), crawler file sampling (2b), DynamoDB write sharding (1b, 2a), Kinesis partition key by device (1e).
Remaining near-overlaps, kept because the answer differs: `sfn-express-logging` (ERROR level + log delivery permissions) vs `3b-sfn-express-logging` (ALL + execution data); `cwl-account-subscription` (account-level policy, one account) vs `4c-cwlogs-central-firehose` (cross-account destination); `trail-event-history-delete` (Event history, last 90 days) vs `4b-ct-event-history-90d` (trail for 3 years); `databrew-duplicates-correlation` (which profile settings) vs `3a-databrew-profile-job` (which service).

## Facts seen on AWS pages that other agents may need
- CloudWatch Logs: the Infrequent Access log class is now named **Essentials** (both `INFREQUENT_ACCESS` and `ESSENTIALS` accepted; read APIs return `ESSENTIALS` from December 2026). An **account-level retention policy** and **intelligent tiering for storage** (July 2026) now exist for CloudWatch Logs; questions that make a per-group retention script the answer are now contestable.
- Account-level subscription filter policy: one per account per Region, applies to existing and future log groups, additive with up to 5 log-group-level filters; selection criteria support only `NOT IN`.
- AWS Glue job timeout default: 2,880 min for Glue 4.0 and earlier, **480 min for Glue 5.0 and later** (max 10,080). Glue 5.0 has real-time logging for all jobs; `--enable-continuous-cloudwatch-log` matters for 4.0 and earlier. Default log groups `/aws-glue/jobs/error` and `/aws-glue/jobs/output`.
- Glue job run queuing covers per-job max concurrent runs, account concurrency, DPU and VPC IP exhaustion (AWS Big Data Blog); Flex jobs are not supported. Only the blog states the per-job concurrency coverage; the add-job page says only that runs fail immediately without queuing.
- CloudTrail Insights now also analyzes data events (trails only, not event data stores). The management-event API call rate type covers write calls only; the error rate type covers read and/or write.
- CloudTrail will deliver S3 Lifecycle and S3 authentication-failure data events to trails that log S3 data events starting December 21, 2026 (billed). Not used.
- EventBridge: read-only CloudTrail management events are matched only by rules in the `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` state; a trail is required.
- DataBrew profile jobs default to `CUSTOM_ROWS` with 20,000 rows (JobSample API); project samples are FIRST_N, LAST_N or RANDOM, 1–5,000 rows.
- DQDL: `between` is documented as exclusive; the `where` clause is documented for Glue 4.0 only; recommendations are supported for the Data Catalog, not for ETL jobs; no multiplication example exists for dynamic rules (only +/-), so `avg(last(n)) * 0.8` was avoided.
- EMR Serverless: CloudWatch logging is disabled by default; when enabled, only the driver stdout/stderr are published unless `logTypes` adds `SPARK_EXECUTOR`; managed storage keeps logs 30 days and is needed for the console Spark UI.
- Glue S3 shuffle: `--write-shuffle-files-to-s3` (setting it to false does not disable it); `--write-shuffle-spills-to-s3` is Glue 2.0 only; the shuffle files are not deleted after the job.

## Points from general knowledge (not stated on a fetched page)
- Salting (two-stage aggregation) for a skewed groupBy: AWS pages describe skew and AQE skew join (sort-merge joins only) but not salting; the explanation uses the general technique.
- Glue `StartJobRun` and Lake Formation `GrantPermissions` recorded as management events (the CloudTrail page defines management events as control plane operations but does not list these two).
- Firehose `Dropped` records are not stored anywhere (page says they count as successfully processed).
- An SNS topic cannot subscribe to a CloudWatch Logs log group (distractor explanation).

## Deliberately avoided
- CloudTrail Lake, S3 Select, Kinesis Data Analytics for SQL and the other closed or maintenance-mode services are never correct answers; CloudTrail Lake does not appear in the final batch.
- Any Lambda timeout value; EMR step `ActionOnFailure` values (page not readable); gzip splittability (taken by 1e and not stated by the Athena page).
