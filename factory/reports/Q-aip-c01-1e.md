# Q-aip-c01-1e — QUESTIONS AIP-C01, objectives 1.6.3–1.6.6 (EN only, 2026-11-23)

## Result
- 32 files in `content/aip-c01/questions/foundation/`, prefix `aipc01-1e-`: 8 per objective (1.6.3, 1.6.4, 1.6.5, 1.6.6).
- Types: single 27, multi 5 (5 options / 2 correct, no scoring NOTE). Difficulty: 5 easy, 16 medium, 11 hard.
- Correct option positions spread over a–d; option lengths rebalanced so the correct option is not the longest by more than ~15 characters.
- `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-1e-` → 32 files, 0 problem(s). `npm run content:validate -- --cert aip-c01 --prefix aipc01-1e-` → 0 problem(s), 0 warning(s).

## Verified (WebFetch, docs.aws.amazon.com / aws.amazon.com, 2026-11-23)
- Prompt Management: overview, create (variants, TEXT/CHAT, caching needs CHAT, metadata, DRAFT), versions (snapshot, numbered from 1, `CreatePromptVersion`), deploy page, prerequisites (IAM action list incl. `bedrock:CreatePromptVersion`, `bedrock:RenderPrompt`; KMS), prompt optimization (heuristic, one model, ~1k tokens, shown as variant, up to 3 in comparison).
- Converse API reference: prompt version ARN as `modelId`; forbidden `additionalModelRequestFields`, `inferenceConfig`, `system`, `toolConfig`; `requestMetadata` 16 entries.
- Model invocation logging (off by default, S3/CloudWatch Logs, `requestMetadata` only caller field, `identity.arn`, 100 KB inline, Athena on S3). CloudTrail page (RenderPrompt / InvokeFlow are data events; sample InvokeModel event shows only `modelId` in requestParameters).
- Guardrails sensitive information filters: invocation log `input` always keeps the original request; masking replaces with `{TYPE}`. CloudWatch Logs data protection (`logs:Unmask`, masking at ingestion, account and log-group policies).
- Structured outputs: `max_tokens` stop returns incomplete JSON even with structured outputs; strict tool use.
- Step Functions Map (inline: 40 concurrent, 256 KiB, 25,000 history; distributed: 10,000 children, S3 inputs); Bedrock optimized integration.
- CloudWatch anomaly detection (seasonality, custom metrics, metric math), EMF, Synthetics canaries (once per minute, Node.js/Python/Java). AppConfig automatic rollback on alarms. CodePipeline manual approval. EventBridge CloudTrail events (write management events match ENABLED rules with a trail). S3 Versioning; S3 EventBridge Object Created.
- Bedrock LLM-as-a-judge: BYO responses, 1,000 prompts, one `modelIdentifier` and one response per prompt per job, built-in metric IDs, custom metrics (up to 10).
- Flows: node types (condition order, first true wins; Iterator one by one; DoWhile `maxIterations` default 10, runs at least once; inline code preview, no internet; Lex single utterance), deploy (immutable versions, aliases, rollback), test and trace (`enableTrace`, `conditionNodeOutputTrace`), async executions (preview, InvokeFlow 1 h vs 24 h), service role (`bedrock:RenderPrompt` for flows created after 2024-11-22, `GetPrompt` for older ones).
- Nova prompting guides: chain-of-thought (skip for simple tasks, thinking/output tags), few-shot, long context (documents first, markers, numbered citations), structured output (prefill, stop sequence, temperature 0, validate in code).
- AppConfig What's New (2026-11-19): AI model invocation and AI prompt configuration profile types — not used as an answer (no user-guide page fetched); questions use a plain AppConfig configuration holding the prompt version ARN.

## Doubts and decisions
- `aipc01-1e-invocation-log-retention`: distractor explanation says CloudTrail is not a record of full prompts/responses. The CloudTrail page does not state it explicitly; based on the sample event and the course chapter's trap.
- `aipc01-1e-request-metadata-chargeback`: claims that `requestMetadata` is allowed with a prompt ARN (it is not in the forbidden list) and that AWS/Bedrock token metrics have no tenant dimension. Sibling `aipc01-1a-std-cost-attribution-logs` (1.1.3) also uses requestMetadata, but for log filtering with Cost Explorer via inference profiles; here the constraints (per prompt version, no new resources) make inference profiles the wrong choice.
- `aipc01-1e-prefill-json`: the stem states that the model does not support structured outputs but supports prefill (hypothetical model, not named). Prefill support depends on the model.
- `aipc01-1e-flow-iterator-scale`: flow executions (StartFlowExecution) are in preview; used only as a distractor.
- `aipc01-1e-validate-repair-loop`: the grounding source size limit (100,000 characters) is taken from course chapter 31 (verified by C-aip-c01-4), not re-fetched; the explanation does not quote the number.
- `aipc01-1e-flow-renderprompt-role`: the IAM service prefix for prompt actions appeared as `bedrock-agent` in a truncated Service Authorization Reference excerpt; the user guide prerequisites page uses `bedrock:` (used here).
- Bedrock human-based evaluation jobs, Agents Classic, Kendra, Q Business and other closed services are never correct answers; Agents Classic appears only as a distractor explained as closed.
- Not fetched (stable knowledge): X-Ray traces do not carry full model I/O, Route 53 health checks see only HTTP status, ECS environment variable changes need new tasks, EventBridge `anything-but` pattern for excluding the pipeline role.
