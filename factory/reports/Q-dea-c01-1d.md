# Q-dea-c01-1d — report

48 questions in `content/dea-c01/questions/ingestion/`, prefix `deac01-1d-`: 6 per objective (1.3.2, 1.3.3, 1.3.4, 1.4.1–1.4.5).
Types: single 40, multi 8 (one per objective; 7 choose two, 1 choose three). Difficulty: 15 easy / 24 medium / 9 hard.
Validators: `factory/validate.ts` and `tools/validate-questions.ts`: 0 problems (the only warning is about `blueprint.yaml`, not about these files).

## Choices and deviations
- No scoring NOTE on multi questions: `blueprint.scoring.multi` is `all_or_nothing` (the validator rejects the note).
- Correct answers use only services and features that are open (no CloudTrail Lake, Kendra, S3 Select, Data Pipeline, Q Developer, Snowball Edge...). Glue Python shell appears only as a distractor (Python 3.6 shell is retired; 3.9 is still documented).
- AWS CodeCommit is not used (closed to new customers); the Git question uses GitHub.
- No answer depends on the Lambda maximum timeout.
- 1.4.5 avoids AWS SAM (1.4.6) and stays on CloudFormation/CDK features used to deploy data solutions (drift, change sets, StackSets, grants, IaC generator, DeletionPolicy/UpdateReplacePolicy); task 1e covers 1.4.6 and 1.4.8, so overlap with it should be checked at review.

## Facts not stated verbatim on a fetched page (from general AWS knowledge, low risk)
- EventBridge scheduled rules (now called "legacy") evaluate cron in UTC: the page shows only UTC examples and recommends EventBridge Scheduler (deac01-1d-scheduler-local-time-zone).
- CloudWatch Logs subscription filter destinations (Kinesis Data Streams, Firehose, Lambda, OpenSearch Service) used in a distractor explanation (deac01-1d-glue-job-failure-email).
- S3 Event Notifications destinations (SNS, SQS, Lambda, EventBridge) in a distractor explanation (deac01-1d-s3-eventbridge-start-workflow).
- Data API: the fetched page says the Redshift cluster must be in a VPC; the caller does not need to be. The question does not rely on VPC settings.

## Notes for other agents
- S3 performance page (Nov. 2026) states at least 3,500 PUT/COPY/POST/DELETE and **11,000** GET/HEAD requests per second per partitioned prefix (older material says 5,500).
- Kinesis Data Streams now has three modes: On-demand Standard, On-demand Advantage (account-level, warm throughput, up to 50 EFO consumers), Provisioned.
- Lambda Kafka ESM provisioned mode: up to 5 MB/s per event poller, MinimumPollers 1–200, MaximumPollers 1–2,000 capped at the partition count, billed in Event Poller Units.
- Glue job run timeout default: 2,880 min for Glue 4.0 and earlier, 480 min for Glue 5.0 and later.
