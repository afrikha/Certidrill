# C-dva-c03-1 — COURSE DVA-C03, chapters 00, 11, 12, 13 (2026-11-20)

## Result
- 8 files: `00-getting-started`, `11-application-code`, `12-lambda`, `13-data-stores` (.en.md + .fr.md), all objectives 1.1.1–1.1.10, 1.2.1–1.2.4, 1.3.1–1.3.4 covered.
- `npx tsx factory/check-cert.ts dva-c03 00-getting-started 11-application-code 12-lambda 13-data-stores`: course problems (your chapters): 0.
- English prose words (code blocks excluded): 00 = 1,572; 11 = 2,248 (10 objectives, slightly above 2,200); 12 = 1,711; 13 = 1,667.

## Conflicting or notable facts (read on AWS pages via WebFetch)
- **Lambda maximum timeout**: the developer guide quota page and the timeout page now say 1,800 seconds (30 minutes); the API reference (`CreateFunction` Timeout) and the Lambda FAQ still say 900 seconds / 15 minutes; no release-history entry or What's New for a 30-minute limit (only the 90-minute Lambda Managed Instances timeout, Sept 2026). The chapter states 15 minutes and mentions the quota page discrepancy. To recheck before publication. Note: `content/saa-c03/.../22-scalable-architectures` states 15 minutes.
- **Amazon Quick** is now titled **AWS Quick** in its documentation (Quick Sight, Quick Flows, Quick Automate, Quick Index, Quick Research, Apps). The exam guide says "Amazon Quick": the chapters use the guide's name and mention the documentation name.
- Lambda docs now call standard functions "Event Functions" (since Lambda Web Functions); not used in the chapters.
- Amazon CodeGuru Reviewer: no new repository associations since November 7, 2025 (verified). Amazon Inspector code security (SAST, SCA, IaC) used for 1.1.9 "security scanning".
- KCL 1.x end of support January 30, 2026 (Kinesis docs).
- SDK retry docs carry a 2026 opt-in notice (`AWS_NEW_RETRIES_2026=true`) for new retry behavior; the chapter keeps only stable facts (modes, default 3 attempts, env vars).
- DynamoDB Streams event source mapping batch size max is 1,000 (SAM docs), Kinesis 10,000.
- GSI multi-attribute keys (up to 4 + 4 attributes) from the GSI page, included in one sentence.
- API Gateway HTTP vs REST page summary claimed JWT authorizers for both types: not used.

## Stated from general knowledge (not found on a fetched page)
- boto3 Table resource rejects Python `float` (TypeError, use `Decimal`).
- `BatchGetItem` 100 items; KMS `Encrypt` 4 KB limit (chapter 00 confusing pairs).
- A Lambda function DLQ applies to asynchronous invocations only (SQS sources use the queue redrive policy).
- DAX item cache / query cache split.
- Kiro: inline suggestions confirmed only as "available in Kiro" (migration guide); hooks triggers named from the hooks page (`PostFileSave`, `PreToolUse`, `PostToolUse`, `Stop`), described generically.

## Left out (not verifiable)
- Data Firehose buffer sizes and intervals; SQS event source `MaximumConcurrency` range; Kinesis record size (producer page says 1 MB, SAA chapter says 10 MiB).
