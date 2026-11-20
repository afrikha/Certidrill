# Q-dva-c03-1b — questions DVA-C03, domain `development`, objectives 1.1.6–1.1.10

57 files `content/dva-c03/questions/development/dvac03-1b-*.yaml`, all `draft`. Validator: `57 files, 0 problem(s)`.

- Per objective: 1.1.6 = 12, 1.1.7 = 12, 1.1.8 = 11, 1.1.9 = 11, 1.1.10 = 11.
- Types: single 47 (4 options), multi 10 (8 × 5 options / choose 2, 2 × 6 options / choose 3).
- Difficulty: 17 easy, 29 medium, 11 hard.
- Single answers spread: a 11, b 12, c 13, d 11.
- Multi stems end with the scoring NOTE sentence, as in the finished SAA-C03 bank (the blueprint says all-or-nothing; the NOTE wording is kept for consistency with saa-c03 until the AWS scoring rule is implemented).
- Code in stems/options: python (Boto3), javascript (SDK v3), json (EventBridge pattern); identical in EN and FR.
- Course chapter 11-application-code did not exist when this batch was written: questions are based on AWS documentation only and should be cross-checked with the chapter once it lands.

## Sources fetched (2026-11-20)

Kinesis Data Streams: quotas, key concepts, enhanced fan-out, producer troubleshooting, PutRecords API, KCL 1.x/2.x page. Lambda: Kinesis ESM overview, ESM parameters, partial batch response, on-failure destinations (S3 gets full record, SQS/SNS metadata only), event filtering (general, SQS, Kinesis), SQS overview, Invoke examples. DynamoDB: Streams, change data capture comparison (Kinesis Data Streams for DynamoDB), Python/Boto3 programming page, Boto3 DynamoDB customization reference (valid types: no float). Firehose: data transformation, required transformation parameters, record format conversion, dynamic partitioning. JS SDK v3 document client page. API Gateway Lambda proxy integrations. SNS raw message delivery, message filtering, filter policy scope, fanout to SQS. EventBridge: PutEventsRequestEntry, comparison operators, DLQ, retry policy, archive/replay, input transformation, Pipes. S3: Event Notifications, key name filtering, event message structure, Using EventBridge, enabling EventBridge, destination permissions (incl. KMS key policy). Kiro (kiro.dev): specs, feature specs, steering, hooks, hook triggers, MCP, permissions, IDE chat (context providers), kiroignore, code references, powers, GitHub. Amazon Inspector Code Security + scan configuration; CodeGuru Reviewer availability change. Bedrock: Converse (user guide + API reference), client-side tool use, cross-Region inference, inference profiles, Invoke API, batch inference, pricing page (batch 50 % lower than on-demand; Flex tier also 50 % off Standard), prompt caching, structured outputs, knowledge base RetrieveAndGenerate. AgentCore: overview, Runtime, service contract, invoke, Gateway, Memory. AWS Quick (what is / how it works / FAQ). DVA-C03 guide pages (domain 1, in-scope services, service mentions).

## Deviations and doubts

- **Kiro references point to kiro.dev/docs**, not docs.aws.amazon.com: AWS's "Kiro Documentation" page (aws.amazon.com/documentation-overview/kiro) links only to kiro.dev/docs. Titles are the page H1 without the " - Docs - Kiro" suffix. Kiro changes fast (IDE 1.x permission modes "Supervised / Accept file changes (formerly Autopilot) / Approve for me", CLI V3 hooks); recheck dvac03-1b-kiro-* before publication.
- **Amazon Quick**: the docs now name it "AWS Quick" (evolved from QuickSight). Its developer integration surface is thin (connectors from OpenAPI/MCP), so no question uses it; 1.1.10 relies on Bedrock and AgentCore.
- **Amazon Inspector** is not in the guide's in-scope list (non-exhaustive) but is the AWS service that does repository security scanning (SAST/SCA/IaC) in 2026, which skill 1.1.9 names; used in dvac03-1b-inspector-code-security and dvac03-1b-ai-code-security-checks. CodeGuru Reviewer (no new repository associations since Nov 7, 2025) and Amazon Q Developer (sign-ups closed May 15, 2026) appear only as wrong options, with the closure stated in the stem context ("starting in 2026", "never used ... before").
- Kinesis record size: the docs now say 1 MB by default, raisable to 10 MiB; no question depends on it. "On-demand Advantage" mode exists; questions only use generic on-demand.
- Bedrock batch inference: the "50 % lower price" is for select models (pricing page); the new Flex tier is also 50 % off, so dvac03-1b-bedrock-batch-inference also states "LEAST code for request loops, throttling and retries" and offers no Flex option.

## Not verified on a fetched page (stable knowledge, review)

- TRIM_HORIZON = oldest available record (ESM parameters page lists the values only) — dvac03-1b-lambda-kinesis-starting-position.
- Boto3 `ParamValidationError` when `Detail` is a dict; `str(dict)` not valid JSON — dvac03-1b-eventbridge-detail-string.
- Lambda metric name IteratorAge — dvac03-1b-lambda-kinesis-parallelization.
- EventBridge FIFO target needs a message group ID; fields absent from a pattern are ignored when matching — dvac03-1b-s3-events-to-fifo-queue, dvac03-1b-eventbridge-pattern-match.
- Converse `requestMetadata` field (distractor) — dvac03-1b-bedrock-converse-multi-turn.
- Standard SDK retry mode retries ThrottlingException — dvac03-1b-bedrock-throttling-retry.
- Raw message delivery not available for email subscriptions (page lists SQS, HTTP/S, Firehose only) — dvac03-1b-eventbridge-input-transformer.
