# Q-clf-c02-3b — report

48 questions (`clfc02-3b-*`, 4 per objective 3.2.7–3.4.4), single 42 / multi 6, difficulty 19 easy / 22 medium / 7 hard. Validator: 0 problem(s).

## Facts checked (November 2026) that matter for other agents
- **Lambda durations changed.** "Lambda quotas" now lists: function timeout 900 s; Lambda Managed Instances up to 5,400 s for asynchronous and event-source-mapping invocations; **Lambda MicroVMs** up to 8 hours per session. "What is AWS Lambda?" now names three primitives: Lambda Event Functions, Web Functions, MicroVMs. A "job runs 2 hours → not Lambda" trap is no longer safe; I used a 10-hour job. In French I kept "Event Functions" in English.
- **Aurora serverless**: the page "Using Aurora serverless" no longer says "v2" in its text. I wrote "Aurora serverless".
- **Amazon ECS Managed Instances** (AWS-managed EC2 capacity for ECS) and AWS Batch on ECS Managed Instances exist. A "stop managing ECS instances" question must not offer both Fargate and Managed Instances as if only one were right.
- **AWS DMS Serverless**: the docs page says nothing about DCUs or min/max capacity, so I left that out. The DMS FAQ says it "automatically provisions, monitors, and scales resources".
- **NLB**: a static IP per AZ is confirmed. Elastic IPs are "one per subnet", not "per AZ". The page does not mention latency, so I left out "ultra-low latency".
- **AWS SCT** is still offered as a download, next to DMS Schema Conversion ("What is AWS Database Migration Service?").
- **Neptune intro**: the use cases listed are recommendation engines, fraud detection, knowledge graphs, drug discovery and network security. Social networking is not listed.

## Deviations / notes
- The WebFetch hourly limit was hit early. curl and the remote browser are blocked for docs.aws.amazon.com. I drafted from memory, then fetched every referenced page after the reset and rewrote anything I could not verify.
- Multi stems end with "(Choose two.)" + NOTE only, following the saa-c03 precedent. They do not use the "complete solution / part of the solution" sentence.
- 3.4.1 includes a DynamoDB/Aurora "managed database services" multi, and 3.4.3/3.4.4 touch RDS Multi-AZ. These overlap a little with 3.4.5/3.2.6 (other batches), but the decisions differ.
