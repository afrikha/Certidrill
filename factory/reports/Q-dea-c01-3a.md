# Q-dea-c01-3a — report

54 questions in `content/dea-c01/questions/operations/`, prefix `deac01-3a-`, 6 per objective 3.1.1–3.1.9.
Types: single 45, multi 9 (one per objective; 5 options / 2 correct). Difficulty 16 / 27 / 11.
Correct positions of singles: a 11, b 12, c 11, d 11.
`CERT=dea-c01 npx tsx factory/validate.ts --prefix deac01-3a-` → 0 problem(s); `npm run content:validate -- --cert dea-c01 --prefix deac01-3a-` → 0 problem(s).
All references were fetched (docs.aws.amazon.com).

## Deviations and choices

- Multi stems carry **no** "NOTE: Each correct selection is worth one point." line: the DEA-C01 blueprint scores `multi` all or nothing, and `tools/validate-questions.ts` rejects the note in that case (the SAA-C03 / DVA-C03 examples still show it).
- Course chapters for domain 3 did not exist yet, so the questions were written from AWS documentation only. A check against the chapters once they are written would help.
- No closed or maintenance-mode service is a correct answer. Current names used: Amazon Data Firehose, Managed Service for Apache Flink, AWS Quick. No answer depends on the Lambda maximum timeout.

## Facts that were checked with care or left out

- DynamoDB stream filtering: the Lambda page for DynamoDB says that filtering works only on the `dynamodb` key, while the general page says metadata fields can be filtered. The question filters on `dynamodb.NewImage.status.S`, so it does not rely on `eventName`.
- Glue workflows started from S3 events: the Glue page uses CloudTrail-based S3 events. The question says only "an EventBridge rule that targets the workflow" and does not say how the S3 events reach EventBridge.
- AWS Data Exchange for APIs: the page confirms AWS billing and the `send-api-asset` command, but not SigV4. SigV4 is not mentioned in the question.
- SageMaker Unified Studio: the visual workflows page body could not be read, so only Visual ETL (drag-and-drop, Glue interactive sessions, Git) is tested.
- Glue Flex: its lower price comes from the Glue pricing page ($0.29 vs $0.44 per DPU-hour, Region not named). The supported worker types (G.1X or G.2X, Glue 3.0+) come from "Configuring job properties for Spark jobs", so the stem says G.1X.
- Step Functions: AWS does not document the name of the Glue concurrency error as it appears in Step Functions, so no question uses it.
- Lambda reference titles say "Lambda Event Functions" because that is the current page title, as fetched.
- `deac01-3a-athena-partition-projection` covers application logs that only Athena reads. `deac01-3c-trail-athena-projection` (another batch) also uses projection, for CloudTrail logs. The two may overlap in spirit.
