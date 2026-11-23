# Q-dea-c01-1a — report

49 questions in `content/dea-c01/questions/ingestion/`, prefix `deac01-1a-`, 7 per objective (1.1.1–1.1.7).
Types: single 39, multi 10 (task target was about 41/8; 10 multi = 20 %, inside the profile's 12–22 % range). Two multi questions are "Choose three." Difficulty: 15 easy / 25 medium / 9 hard. Correct single options: a 10, b 10, c 8, d 11.
No per-element NOTE on multi questions (blueprint scores multi all or nothing). `factory/validate.ts` and `tools/validate-questions.ts`: 0 problems, 0 warnings.

## Course consistency

When this batch was written, `content/dea-c01/course/chapters/` held only empty domain folders, so the questions were checked against AWS documentation only. The author of chapter `11-ingestion` should check that the chapter agrees with them.

## Overlap with other DEA-C01 batches (written in parallel)

The other batches (1b, 1c, 1d, 2a, 2c, 3a, 4a...) already cover many 1.1.x topics. After a first draft, I replaced 16 of my questions that repeated an existing DEA question's decision with the same answer: Redshift streaming ingestion approach, COPY split files, Glue JDBC parallel read, Glue Flex, COPY manifest, Data Exchange API, Redshift Data API async, MWAA migration, Glue workflow event batching, S3/Lambda recursion, overlapping S3 notifications, Lambda tumbling window, Kinesis batching window, UNLOAD partitioned, DMS to S3 Parquet, and federated query.
Some overlap remains, and a reviewer should decide on it:
- `kinesis-execution-role` vs `deac01-4a-lambda-kinesis-exec-role` (same managed policy; mine is the ingestion angle).
- `redshift-streaming-setup` (which setup statements) vs `deac01-2a-redshift-streaming-ingestion` (which approach).
- `mwaa-deploy-dag` (copy the DAG to `dags/`) vs `deac01-1c-mwaa-deploy-dag-deps` and `deac01-1e-cicd-mwaa-dag-deploy`.
- `scheduler-one-time-glue` (time zone of a one-time schedule) vs `deac01-1d-scheduler-local-time-zone` (time zone of a recurring schedule).
- `s3-eventbridge-size-routing` vs `deac01-1b-s3-eventbridge-targets` and `deac01-1c-s3-eventbridge-sfn` (EventBridge routing; mine filters on object size).
- `glue-conditional-trigger` vs `deac01-1c-glue-workflow-crawler-job`.
- `datasync-nfs-nightly` (DataSync) vs `deac01-2a-datasync-hdfs-migration`.

## Facts stated from general knowledge, not from a page fetched in this task

- Parameter Store has no built-in automatic rotation (distractor of `api-key-rotation`).
- MSK Connect needs a connector plugin and a capacity setting (distractor of `firehose-msk-source`).
- Lambda event source mappings do not support Firehose streams as a source (distractor of `firehose-lambda-transform`).
- Firehose record format conversion runs after the Lambda transformation (distractor of `firehose-transform-buffer`).
- Gateway VPC endpoints exist only for S3 and DynamoDB, and security groups are stateful (distractors of `lambda-vpc-external-api`).
- BigQuery is not a DMS source, and AppFlow has no Oracle source (distractors).

## Choices and deviations

- `glue-group-small-files` uses 40,000 files, because Glue turns grouping on automatically above 50,000 input files.
- `cron-last-day-month` and `redshift-streaming-setup` put code in inline code spans in the options. Options are rendered as inline Markdown, so fenced blocks cannot be used there.
- `eventbridge-archive-replay` says that only events received after the archive is created are archived. The fetched page implies this but does not state it in those words.
- `s3-events-cross-account-bus` uses forwarding from bus to bus, which the EventBridge page documents. It offers no option that targets the state machine directly across accounts, because I could not confirm which services support direct cross-account targets.
- No answer depends on the Lambda maximum timeout. No closed or maintenance-mode service is a correct answer.
