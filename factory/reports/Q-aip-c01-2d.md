# Q-aip-c01-2d — QUESTIONS AIP-C01, domain implementation, 2.5.2–2.5.6 (EN only, 2026-11-23)

## Result
- 40 files `content/aip-c01/questions/implementation/aipc01-2d-*.yaml`, 8 per objective (2.5.2–2.5.6).
- Types: single 33, multi 7 (all "Choose two.", 5 options). Difficulty: 6 easy / 20 medium / 14 hard.
- `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-2d-` → 0 problem(s); `content:validate --cert aip-c01 --prefix aipc01-2d-` → 0 problem(s), 0 warning(s).

## Verified (WebFetch, 2026-11-23)
- Bedrock Flows: overview, node types (iterator sequential, collector, DoWhile default maxIterations 10, condition order + `default` condition, KB node retrievalResults vs outputText, guardrails only on prompt node and on KB node with modelId, S3 storage/retrieval, Lambda, Lex single utterance, inline code preview), versions/aliases/TSTALIASID, guardrails in flows, async flow executions (preview, 24 h vs InvokeFlow 1 h), multi-turn (agent node only, preview).
- API Gateway: OpenAPI 2.0/3.0 import, request validation (400, integration not invoked), mock integrations, SDK generation (Java, JavaScript, Android, iOS Objective-C/Swift, Ruby; deploy first).
- Amplify AI kit: What's New (Nov 2024) and AWS blog (conversation vs generation, owner auth, DynamoDB history, streaming, `responseComponents`, `a.ai.dataTool` with owner auth). docs.amplify.aws also read (conversation owner-only, generation non-owner modes) but not used as reference (host not allowed).
- BDA: overview, how it works, custom output (40 document / 1 image / 1 audio / 1 video blueprint per project, best-layout matching), blueprints (field types, explicit vs inferred, table fields, limits 100 fields async / 15 sync), API page (`InvokeDataAutomation` sync = images only; `notificationConfiguration.eventBridgeConfiguration.eventBridgeEnabled`).
- Step Functions: integration patterns (AgentCore and DynamoDB Request Response only; callback Standard only, one-year wait), Bedrock integration (256 KiB Body, Input/Output S3), Standard vs Express, error handling (Retry on errors only, Catch after retries), Choice, Parallel, Map, Distributed Map.
- Amazon Connect Lambda (8 s block timeout, 20 s for a sequence, STRING_MAP vs JSON, arrays not referenceable, `$.External` vs contact attributes); AppFlow Salesforce (CDC and platform events, schedule ≥ 1 min); Lambda quotas (1,800 s).
- Kiro: specs (feature, bugfix, Quick Spec), steering (workspace/global, inclusion modes, AGENTS.md always), hooks (`.kiro/hooks/`, PostFileSave, command/agent actions), MCP, CLI and headless mode (`--no-interactive`, `KIRO_API_KEY`, `--trust-tools`). Q Developer end-of-support blog (May 15, 2026; April 30, 2027; chat apps and console remain).
- Prescriptive Guidance agentic patterns (prompt chaining, routing, orchestration, evaluator loops, parallelization, saga); Strands multi-agent patterns page.
- Converse and ConverseStream references (prompt ARN forbids system/inferenceConfig/additionalModelRequestFields/toolConfig; requestMetadata 16; stopReason values), structured outputs.
- Model invocation logging (100 KB, large data to S3 only, bedrock-mantle not captured, identity.arn, Logs Insights example), Logs Insights `pattern`, CloudWatch generative AI observability, X-Ray concepts (annotations indexed, 50 per trace), X-Ray SDK migration (maintenance Feb 25, 2026; `aws.xray.annotations`).

## Overlap with sibling tasks (written in parallel)
- While writing, 2a/2c questions appeared on the same decisions; I dropped and replaced 11 of my drafts (Flows alias rollback, API Gateway request validation, A2I→task-token human review, ensemble Parallel vote, Prompt Management + inferenceConfig, routing with Choice, ConverseStream TTFT, max_tokens truncation, ADOT tracing, requestMetadata correlation, AgentCore + callback approval).
- Remaining near-topic: `aipc01-2d-chain-compensation` uses Catch after retries for a saga compensation; `aipc01-2c-res-sfn-retry-fallback` / `aipc01-2a-catch-resultpath-fallback` use Catch for a fallback. Different decision (undo side effect vs fallback), same construct; reviewer may judge.
- `aipc01-2d-logs-insights-feature-tokens` (query choice) vs `aipc01-2c-gateway-cost-attribution` (requestMetadata + Logs Insights as part of a multi): related, kept.

## Doubts and decisions
- Agent Squad (named in 2.5.5) not used as an answer: repository moved out of awslabs (see C-aip-c01-3).
- Q Developer (named in 2.5.4/2.5.6) appears only as a closed/ending option; Kiro is the answer for new teams. `aipc01-2d-devprod-q-transition` relies on the end-of-support dates of the AWS blog.
- Flows features in preview (async flow executions, multi-turn) are used only in explanations of distractors, never as answers.
- `aipc01-2d-express-sync-chain`: "Standard costs more at this volume" is inferred from the pricing bases on the workflow-type page (state transitions vs executions/duration/memory), no price computed.
- `aipc01-2d-mantle-logging-gap`: relies on the logging page sentence that bedrock-mantle calls are "not currently captured"; recheck if AWS adds mantle logging.
- Not verified on a fetched page (stable knowledge, kept in explanations only): StartExecution of a Standard workflow returns immediately; CloudWatch Logs data protection masks sensitive data; guardrail trace content; CodeBuild secrets from Secrets Manager; `fileMatchPattern` key name (questions only say "fileMatch inclusion mode and a pattern").
- Amazon Connect page title is now "… - Amazon Connect Customer" (product naming on the page); kept as fetched.
