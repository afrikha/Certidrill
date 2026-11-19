# Q-saa-c03-2b — questions SAA-C03, domain `resilient`, objectives 2.1.11–2.1.22

48 files `content/saa-c03/questions/resilient/saac03-2b-*.yaml`, all `draft`. Validator: `48 files, 0 problem(s)`.

- Per objective: 4 each for 2.1.11 to 2.1.22 (48).
- Types: single 40, multi 8 (all "Choose two.", 5 options; one "complete solution" multi: stateless-sessions).
- Difficulty: 15 easy, 24 medium, 9 hard.
- Single answers spread: a 11, b 10, c 10, d 9. Multi answer pairs varied (b+c, d+e, c+e, a+c, b+d, b+e, a+d, c+d).
- Course chapters for these objectives did not exist yet when the batch was written; questions rely on AWS documentation only.

## Sources fetched (2026-11-19, WebFetch)

SQS: visibility timeout, short and long polling, dead-letter queues, FIFO queues, message quotas (message size now 1 MiB). SNS: fanout to SQS, message filtering. Lambda: quotas, concurrency (reserved vs provisioned), provisioned concurrency (Application Auto Scaling), async error handling (throttled events retried up to 6 h), container images. ECS: services, Fargate task definition differences, ECS Anywhere. EKS: what is EKS, EKS on Fargate. EBS Multi-Attach, EC2 instance store, EFS, FSx for Windows, FSx for Lustre. RDS read replicas, RDS Multi-AZ DB instance, Aurora Auto Scaling, Aurora endpoints, Aurora Serverless v2 auto-pause. Step Functions: workflow types, integration patterns, Distributed Map. EventBridge: rule DLQ, SaaS partner sources; EventBridge Scheduler: overview, schedule types (time zones, DST). EC2 Auto Scaling: target tracking, scheduled, predictive, SQS-based scaling. Kinesis Data Streams: concepts, retention. Amazon MQ, AWS Batch, DynamoDB, Neptune, Global Accelerator (docs + FAQ), S3 Event Notifications, ElastiCache use cases, Prescriptive Guidance API Gateway + SQS pattern.

## Not verified on a fetched page (stable knowledge, review)

- ECS `DAEMON` scheduling strategy not supported on Fargate (saac03-2b-ecs-service-desired, distractor).
- Instance store cost included in the instance price; data lost on stop/terminate (fetched page linked out for persistence details) (saac03-2b-instance-store-scratch).
- RDS Multi-AZ failover is automatic (fetched page says "failover support") (saac03-2b-multiaz-vs-rr, three-tier-ha).
- Standard SQS queues: best-effort ordering and at-least-once delivery; FIFO deduplication interval not stated (not used as a number).
- ALB does not carry UDP; CloudFront does not proxy UDP (saac03-2b-ga-udp-multiregion distractors); Global Accelerator UDP support is from the FAQ.
- EventBridge does not guarantee ordering (saac03-2b-kinesis-replay distractor).
- Step Functions is not an SNS subscription protocol (saac03-2b-eventbridge-saas distractor).
- FSx for Lustre "data repository association" term (the fetched overview page speaks of linking to S3).
- Lambda .zip limit 250 MB unzipped is from the quotas page (verified); Lambda container image 10 GB verified.

## Deviations and doubts

- Lambda docs now title several pages "... Event Function ..." (new Lambda function kinds such as durable functions and Lambda Managed Instances). Reference titles copy the current page titles. The 2-hour job question (lambda-timeout-fargate) stays beyond the 90-minute limit of Lambda Managed Instances async invocations, and the explanation speaks of the 15-minute timeout of a "standard" function.
- Reference titles use the page H1 without the " - <Service>" suffix of the HTML title.
- French: "backlog par instance" kept as the AWS term is not settled in fr_fr; "agent de messages (broker)" for Amazon MQ broker; "rubrique" for SNS topic; "interrogation longue" for long polling.
