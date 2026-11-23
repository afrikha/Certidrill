# Q-dea-c01-1c — report

48 questions in `content/dea-c01/questions/ingestion/`, prefix `deac01-1c-`, 6 per objective (1.2.4–1.2.10, 1.3.1).
Types: single 40, multi 8 (one per objective; one "Choose three."). Difficulty: 15 easy / 24 medium / 9 hard.
No per-element NOTE on multi (blueprint scores multi all or nothing). `factory/validate.ts` and `tools/validate-questions.ts`: 0 problems.

## Course consistency

The DEA-C01 course chapters (`12-transformation`, `13-orchestration`) did not exist when the batch was written, so the questions are checked against AWS documentation only. A chapter author should check that the chapters agree with them.

## Facts stated from general knowledge, not from a page fetched in this task

- DynamoDB item size limit of 400 KB (distractor of `variety-raw-zone`).
- RDS Proxy does not support Amazon Redshift (distractor of `redshift-data-api`).
- API Gateway AWS service integration with DynamoDB GetItem plus mapping templates (`api-direct-dynamodb`). The fetched tutorial shows an AWS integration with SNS and says that other services can be exposed the same way.
- Glue bookmark option Pause behavior (distractor of `bookmark-transformation-ctx`).
- MWAA does not run custom container images from ECR, and its workers cannot be reached with Systems Manager Run Command (distractors of `mwaa-deploy-dag-deps`).
- Athena `ProcessedBytes` CloudWatch metric (distractor of `athena-per-query-limit`).
- OpenSearch Service vector index (correct option of `titan-embeddings-search`; the reference is the Titan Embeddings page).
- Aurora PostgreSQL zero-ETL integration with Redshift exists (distractor of `rds-data-api-aurora`).

## Choices and deviations

- `api-lambda-dynamodb` cites the API Gateway calculator tutorial (Lambda and AWS service integrations), because no dedicated Lambda-integration page was fetched.
- `glue-event-trigger-batch` uses S3 events through a CloudTrail trail (not CloudTrail Lake), as the Glue page on EventBridge-triggered workflows documents.
- `kds-shard-sizing` uses `shuffle: false` (values in ascending order). It relies on the per-shard write limit of 1 MB/s or 1,000 records/s, and the stem rules out record aggregation.
- The Kinesis quotas page also shows a PutRecord figure of "10 MiB per second" that conflicts with the 1 MB/s per-shard limit. The question uses the 1 MB/s / 1,000 records/s limit, which the page states first.
- No answer depends on the Lambda maximum timeout. No closed or maintenance-mode service is a correct answer, and none is used as a distractor.
