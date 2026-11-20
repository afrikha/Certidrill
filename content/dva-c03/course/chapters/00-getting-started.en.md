DVA-C03 is a developer exam. Questions describe an application that already runs on AWS (a Lambda function behind API Gateway, a queue consumer, a DynamoDB table, a deployment pipeline) and a problem: an error, a missing permission, a slow call, a requirement that the code doesn't meet yet. You choose the API call, SDK setting, event source configuration, policy statement or deployment option that fixes it. This chapter covers the format, a method for reading the questions and the code they show, the habits the exam rewards, the services whose status changed in 2026 and the pairs of features you must tell apart.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | AWS Certified Developer – Associate |
| Exam code | DVA-C03, from December 1, 2026 (DVA-C02 is in use until November 30, 2026); the guide prints no version number |
| Duration | 130 minutes |
| Questions | 65: 50 scored and 15 unscored, which are not identified |
| Score | Scaled from 100 to 1,000; 720 passes |
| Scoring model | Compensatory: only the total score counts, there is no passing mark per domain |
| Wrong or blank answers | A blank answer counts as wrong and there is no penalty for guessing: always answer |
| Languages | English, Japanese, Korean, Portuguese (Brazil), Simplified Chinese, Spanish (Latin America); the exam isn't offered in French |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Development with AWS Services | 30 % |
| Security | 26 % |
| Testing and Deployment | 22 % |
| Troubleshooting and Optimization | 22 % |

There are only two question types. **Multiple choice** has one correct answer among four options (about 80 % of the questions). **Multiple response** ends with "Choose two." or "Choose three." and has two correct answers among five options, or three among six; it earns the point only if every selected answer is correct. There is no case study, no drop-down list, no drag and drop and no lab.

Compared with DVA-C02, the new guide adds AI topics: securing calls to AI services (access, private connectivity, content filtering, PII redaction, prompt injection, agent tool authorization), AI-assisted coding, managed AI services in applications, and AI tools in testing, CI/CD, troubleshooting and optimization. It also adds presigned URLs, container images and deployments to Amazon ECS, Amazon EKS and AWS Fargate. Designing architectures or pipelines, administering IAM users, choosing foundation models, prompt engineering and designing guardrails stay out of scope.

> **Exam tip.** Since you can't tell which 15 questions are unscored, treat every question as if it counts. Certidrill mock exams score all 65 questions.

<!-- section: reading-questions -->
## Reading a developer question

A stem has two to five sentences: a company ("AnyCompany"), its application, a requirement or a symptom, then a deciding qualifier and the question "Which solution will meet these requirements?". Usually two options would work; the qualifier chooses between them. Work in this order:

1. Read the last two sentences first: the qualifier and what you must choose (a code change, a configuration, a permission).
2. List every constraint, including those hidden in the context ("the function runs in a VPC", "messages must be processed in order", "the team can't change the client").
3. Eliminate each option that fails one constraint, even a minor one.
4. Apply the qualifier to the options that remain.

| Words in the stem | What they select |
| --- | --- |
| "LEAST development effort" | A built-in feature or setting (an event source mapping option, a destination, an API Gateway validator, an SDK paginator) rather than code you write |
| "LEAST operational overhead" | A managed or serverless service rather than instances, cron jobs or scripts you run |
| "without changing the application code" | Configuration only: an environment variable, a layer or extension, an event source setting, a mapping template, a cache in front |
| "MOST secure" | An IAM role with least privilege, temporary credentials, secrets in Secrets Manager, KMS encryption, private connectivity through VPC endpoints |
| "MOST cost-effective" | The cheapest option that still meets every functional requirement: eventually consistent reads, right-sized memory, caching, on-demand capacity for spiky traffic |
| "in order" or "exactly once" | SQS FIFO queues with a message group ID, idempotent consumers, conditional writes |
| "lowest latency" | A cache (DAX, ElastiCache, CloudFront, API Gateway cache) or provisioned concurrency |
| "decouple" or "absorb spikes" | A queue or an event bus between the producer and the consumer |

Many questions show code or configuration: a Python (boto3) or JavaScript (SDK v3) snippet, an IAM or bucket policy, a CloudFormation, AWS SAM, buildspec or appspec file, an AWS CLI command, a CloudWatch Logs Insights query or an error message. Read the error first: `AccessDeniedException` points to a policy, `ThrottlingException` or `ProvisionedThroughputExceededException` to retries with backoff or more capacity, a timeout to a network path or a too-short timeout, `ValidationException` to a malformed request.

> **Exam trap.** An option that adds a feature nobody asked for (a second Region, a new pipeline, a rewrite in another language) is a distractor even if it would work. The exam rewards the smallest change that meets every stated requirement.

<!-- section: developer-habits -->
## Habits the exam rewards

The correct option usually follows the same handful of developer practices:

| Practice | What it looks like in an answer |
| --- | --- |
| No long-term credentials in code | The SDK default credential chain with an IAM role (Lambda execution role, ECS task role, instance profile); never access keys in environment variables or source code |
| Least privilege | Actions and resources limited to what the code calls, with conditions where useful |
| Configuration outside the code | Environment variables, Parameter Store, Secrets Manager, AWS AppConfig, stage variables |
| Retries that don't make things worse | SDK retries with exponential backoff and jitter, idempotent operations, dead-letter queues for poison messages |
| Asynchronous where nobody waits | A queue, a topic, an event bus or an asynchronous invocation instead of a long synchronous call |
| Reuse across invocations | SDK clients and connections created outside the Lambda handler |
| Infrastructure as code | AWS SAM, AWS CloudFormation or AWS CDK templates rather than console clicks |
| Observability | Structured JSON logs, custom metrics, traces with OpenTelemetry |

Some services changed status. Certidrill never makes a closed or unsupported service the correct answer:

| Service | Status in November 2026 |
| --- | --- |
| Amazon Q Developer | Sign-ups closed on May 15, 2026; IDE plugins end on April 30, 2027; the successor is Kiro |
| AWS Cloud9 | Closed to new customers since July 25, 2024; use AWS CloudShell or a local IDE |
| AWS CodeCommit | Open again to new customers since November 25, 2025 |
| AWS X-Ray SDKs and daemon | Maintenance mode since February 25, 2026, end of support on February 25, 2027; instrument with OpenTelemetry (AWS Distro for OpenTelemetry); the X-Ray service continues |
| AWS Copilot CLI | End of support on June 12, 2026 |
| Amazon CodeGuru Reviewer | No new repository associations since November 7, 2025 |
| Amazon Quick | Named AWS Quick in its documentation; QuickSight continues as AWS Quick Sight inside it |

<!-- section: confusing-pairs -->
## Features that are easy to confuse

The options of a question come from the same family. Learn the one-line difference:

| Family | Options | What separates them |
| --- | --- | --- |
| Messaging | Amazon SQS, Amazon SNS, Amazon EventBridge, Amazon Kinesis Data Streams | A queue that one consumer polls; push fan-out to subscribers; an event bus whose rules route events by content; an ordered stream that several consumers read and replay |
| SQS queue types | Standard, FIFO | At-least-once with best-effort order and nearly unlimited throughput; strict order per message group ID with deduplication |
| Lambda concurrency | Reserved, provisioned | Reserved caps and guarantees a function's concurrency at no charge; provisioned keeps environments initialized to remove cold starts, for a charge |
| Lambda failure handling | Destinations, dead-letter queue | Destinations receive the full invocation record, on success or failure, to more target types; a DLQ receives only the failed event, in SQS or SNS |
| DynamoDB indexes | GSI, LSI | A GSI has any partition key, is added at any time and is eventually consistent; an LSI keeps the table's partition key, is created with the table and allows strongly consistent reads |
| DynamoDB reads | Query, Scan | Query reads one partition key value; Scan reads the whole table; both apply filters after reading |
| Cognito | User pools, identity pools | A user pool signs users in and issues tokens; an identity pool exchanges a token for temporary AWS credentials |
| Configuration and secrets | Secrets Manager, Parameter Store | Secrets Manager rotates secrets automatically; Parameter Store holds configuration and SecureString values without rotation |
| KMS | `Encrypt`, `GenerateDataKey` | `Encrypt` handles small payloads (up to 4 KB); envelope encryption uses a data key from `GenerateDataKey` for real data |
| Workflows | Step Functions Standard, Express | Long-running (up to one year), exactly-once, with callbacks; short (up to five minutes) and high-volume |
| Caches | DAX, ElastiCache | DAX sits in front of DynamoDB with the same API; ElastiCache caches anything but needs cache code in the application |
| API types | REST API, HTTP API | REST has request validation, mapping templates, caching, API keys and usage plans; HTTP is simpler and cheaper |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the development module sets up the services that the security, deployment and troubleshooting chapters build on.
2. Build one small serverless application with AWS SAM: an API Gateway API, two Lambda functions, a DynamoDB table and an SQS queue. Deploy it, break it on purpose (remove a permission, shorten a timeout, send a malformed event) and read the errors in CloudWatch Logs.
3. Call each service from both the AWS CLI and an SDK, and practice the arithmetic the exam asks for: RCUs and WCUs, Lambda concurrency, SQS visibility timeouts.
4. After each domain, take a mock exam, read every explanation, including the reasons the wrong options fail, and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row reach 800 or more on questions you haven't seen before.
