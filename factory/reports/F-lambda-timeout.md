# F-lambda-timeout — report

Rule applied: no question depends on 15 vs 30 minutes; explanations say "far longer than the maximum timeout of a Lambda function (minutes, not hours)"; each course chapter gives the maximum once with the 30/15/90-minute caveat, elsewhere neutral wording; exam traps use multi-hour jobs.

## Questions (EN + FR)
- saa-c03/questions/performance/saac03-3a-fargate-long-event-task.yaml: job 25–40 min changed to 2–3 hours; option a explanation neutral.
- saa-c03/questions/performance/saac03-3a-batch-fargate-long-jobs.yaml: option explanation neutral (3-hour job).
- saa-c03/questions/performance/saac03-3a-batch-simulation-jobs.yaml: jobs 1–4 h changed to 2–4 h; explanation neutral.
- saa-c03/questions/resilient/saac03-2b-batch-containers.yaml: jobs 1–6 h changed to 2–6 h; explanation neutral.
- saa-c03/questions/resilient/saac03-2b-lambda-timeout-fargate.yaml: job "about 2 hours" changed to about 3 hours (stem + explanations); explanation neutral.
- saa-c03/questions/resilient/saac03-2b-sfn-callback-approval.yaml: option c explanation neutral (5-day wait).
- saa-c03/questions/resilient/saac03-2a-sqs-lambda-partial-batch.yaml: option e "maximum value of 15 minutes" changed to "its maximum value".
- saa-c03/questions/cost/saac03-4b-fargate-scheduled-long-job.yaml: option explanation neutral.
- clf-c02/questions/technology/clfc02-3b-serverless-lambda-benefits.yaml: option e explanation neutral.
- clf-c02/questions/technology/clfc02-3b-compute-batch-jobs.yaml: Lambda option explanation neutral.
- clf-c02/questions/technology/clfc02-3b-serverless-long-running-job.yaml: Lambda option explanation neutral.
- dva-c03/questions/deployment/dvac03-3c-manual-approval-qa.yaml: option c explanation neutral.
- dva-c03/questions/troubleshooting/dvac03-4a-kinesis-iterator-age.yaml: removed "timeouts cannot exceed 15 minutes" from option a explanation (90 min possible on Lambda Managed Instances event source mappings).
- dva-c03/questions/troubleshooting/dvac03-4b-init-clients-outside-handler.yaml: option c "maximum of 15 minutes" changed to "its maximum value".
- dva-c03/questions/troubleshooting/dvac03-4a-async-events-dropped.yaml: option c "maximum of 15 minutes" changed to "its maximum value".

## Course chapters (EN + FR)
- saa-c03/course/chapters/22-scalable-architectures: limits table gets the caveated maximum; decision row, exam trap (30 min to several hours) and key point neutral.
- saa-c03/course/chapters/32-elastic-compute: key figures get the caveated maximum; decision row, exam trap (40 min to several hours) and key point neutral.
- saa-c03/course/chapters/37-data-lakes-analytics: service table gets the caveated maximum; decision row neutral.
- saa-c03/course/chapters/43-cost-compute-purchasing: pricing table gets the caveated maximum; guidance line and key point neutral.
- clf-c02/course/chapters/33-compute-services: comparison table gets the caveated maximum; exam trap (1 hour to several hours) and key point neutral.
- dva-c03/course/chapters/12-lambda: timeout row replaced by the caveated maximum (removed "expect 15 minutes on the exam").

## Left unchanged (not a maximum statement, answer independent of 15 vs 30)
- Distractor options that set a timeout to 15 minutes / 900 seconds (valid value either way): saac03-2b-lambda-provisioned, saac03-2b-apigw-sqs-async, saac03-3b-lambda-tmp-and-cpu, saac03-3a-lambda-cold-start-java, dvac03-1a-long-report-async-job.
- Unrelated 15-minute values (S3 RTC, SQS delay, EFS replication, Support response times, STS, CloudFormation rollback monitoring).
- aif-c01: no Lambda maximum-duration statement found.

## Validation
- validate.ts saac03 / clfc02 / dvac03: 0 problems each; check-cert.ts saa-c03, clf-c02, dva-c03: course problems 0.
