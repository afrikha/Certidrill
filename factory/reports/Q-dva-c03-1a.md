# Q-dva-c03-1a — QUESTIONS DVA-C03, domain development, objectives 1.1.1–1.1.5 (2026-11-20)

## Result
- 60 questions in `content/dva-c03/questions/development/`, prefix `dvac03-1a-`: 12 per objective (1.1.1–1.1.5).
- Types: single 50, multi 10 (8 × 5 options / choose 2, 2 × 6 options / choose 3). Difficulty: 18 easy / 30 medium / 12 hard.
- `CERT=dva-c03 npx tsx factory/validate.ts --prefix dvac03-1a-`: 60 files, 0 problem(s).
- Code in stems: python, javascript, json, bash fences, identical EN/FR.

## Facts verified on AWS pages and worth knowing
- SQS max message size is now **1 MiB** (quotas page, SendMessageBatch API); the Extended Client Library page still says "256 KB to 2 GB". Question uses 40 MB payloads, so the answer holds either way.
- SDK retry behavior page (sdkref) carries a 2026 opt-in notice (`AWS_NEW_RETRIES_2026=true`); questions only use stable facts (standard default, adaptive = client-side rate limiter, AWS_MAX_ATTEMPTS includes the first request).
- boto3 `Config(retries={"max_attempts": N})` counts retries only; `total_max_attempts` counts all requests (boto3 Retries page) — used in `dvac03-1a-total-max-attempts` (hard).
- REST API integration timeout: 50 ms–29 s, raisable above 29 s for Regional and private APIs (quota page); no question relies on it being fixed.
- EventBridge relaunched **Custom Event Bus** (subscribers instead of rules, Sept 2026); Classic buses keep rules. Questions use "the default event bus" with rules, or say "add its own filter" generically.
- Lambda docs now title pages "Lambda Event Function(s)"; reference titles copied as fetched.

## From general knowledge (not on a fetched page)
- EventBridge retry policy maximums (MaximumEventAgeInSeconds 24 h, used in `eventbridge-target-dlq` distractor a).
- `$context.error.validationErrorString` usable in the BAD_REQUEST_BODY gateway response template (variable confirmed on the variables page, usage location not stated) — `validation-error-detail`.
- DynamoDB `table_exists` waiter waits for ACTIVE; ResourceNotFoundException while the table is CREATING.
- S3 `MaxKeys` capped at 1,000 per response; SNS can't deliver to a browser over HTTPS; SNS→SQS delivery uses the queue policy, not an IAM role.
- Lambda aliases have no environment variables of their own.

## Deviations / choices
- Avoided Lambda maximum-timeout claims (course report C-dva-c03-1 found 15 vs 30 min conflict).
- Replaced a "JWT authorizers on REST APIs" distractor (HTTP-vs-REST page says both, doubtful) with custom domain names.
