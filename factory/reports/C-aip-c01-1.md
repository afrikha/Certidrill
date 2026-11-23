# C-aip-c01-1 — COURSE AIP-C01, chapters 00, 11, 12, 13 (EN only, 2026-11-23)

## Result
- 4 files: `00-getting-started.en.md`, `11-solution-design.en.md`, `12-fm-selection.en.md`, `13-data-pipelines.en.md`. Objectives 1.1.1–1.1.3, 1.2.1–1.2.4, 1.3.1–1.3.4 all in section markers.
- `check-cert.ts aip-c01 <4 chapters>`: 0 problems; `content:validate --course --chapters ...`: 0 problem(s).
- Prose words (code fences and markers excluded, tables included): 00: 1,668; 11: 1,881; 12: 2,223 (4 objectives, slightly above 2,200); 13: 1,951.
- Code fences: json, text, bash only (Python samples in `text`).

## Verified (WebFetch, 2026-11-23)
- WA Generative AI Lens: pillars' focus areas, lifecycle stages, six design principles, scope (Bedrock + SageMaker AI; ML Lens for traditional ML), revisions (April 15, 2025 initial; November 19, 2025 new version with agentic AI section and eight scenarios), use in WA Tool = import JSON from aws-samples custom-lens repo as custom lens.
- Converse API (fields, content blocks, document `name` rule, promptVariables restrictions, response usage/metrics/stopReason examples, Bedrock doesn't store content, Meta/Mistral template, reasoningContent signature), Anthropic InvokeModel body, batch inference JSONL (`recordId`, `modelInput`, Converse invocation type), CountTokens (free).
- Cross-Region inference (geo vs global, ~10 % savings, SCP `unspecified`, no routing charge, CloudTrail `inferenceRegion`, no PT); Bedrock API error codes page (429 ThrottlingException, 503 ServiceUnavailable).
- Model card structure (Claude Haiku 4.5 card: lifecycle, context window, modalities, APIs, features, geo `us./eu./au./jp./in.` and `global.` profile IDs, bare ID not supported on demand, service tiers).
- Model lifecycle page (applies to models launched on or after September 7, 2026: Legacy 6 months or 45 days; 15-day inactivity; no new PT in Legacy; `modelLifecycle` field).
- Intelligent prompt routing (same family, two models, English-optimized, default routers Nova/Llama).
- AppConfig (profile types, validators, rollback on alarm, Agent / StartConfigurationSession); What's New November 19, 2026: native AI model invocation and AI prompt configurations, no extra cost.
- Step Functions Bedrock integration (256 KiB Body, Input/Output S3Uri), Retry/Catch defaults, prescriptive-guidance circuit breaker (DynamoDB CircuitStatus + TTL).
- Bedrock customization methods (SFT, RFT, distillation; pricing tokens × epochs + storage), Custom Model Import (architectures, safetensors, no embeddings/batch/CloudFormation), SageMaker LoRA adapter inference components, JumpStart LoRA hyperparameters, Model Registry approval statuses and transitions, deployment guardrails modes.
- Bedrock evaluations (job types, automatic task/metric/dataset table, supported model types); Bedrock in SageMaker Unified Studio (playgrounds, compare, chat agent and flow apps).
- Glue Data Quality (DQDL, rule types, recommendations Data Catalog only incl. ADVANCED mode with Bedrock, row-level results ETL only, dynamic rules, anomaly detection, CloudWatch/EventBridge/S3), Glue Studio Evaluate Data Quality actions; Data Wrangler in Canvas; SageMaker Processing; BDA (standard/custom output, blueprints, projects, `InvokeDataAutomationAsync`); Transcribe overview; Comprehend entity types and APIs.

## Not fetched (stable knowledge, reviewer may check)
- DQDL syntax of `ColumnLength ... between`, `ColumnValues ... in [...]`, `DataFreshness ... <= 24 hours` (rule types verified, exact syntax from memory).
- `aws sagemaker update-model-package --model-approval-status` CLI form (boto3 form verified).
- Bedrock service tiers and Provisioned Throughput details reused from C-sap-c03 / C-aif-c01 reports; Lambda response streaming, API Gateway WebSocket, Step Functions callback task token, XGBoost `text/csv` input, Comprehend dominant language and custom entity recognition, Textract.
- Step Functions example uses JSONata (`Arguments`, `{% %}`) as the AWS example does; Retry on `States.ALL` chosen to avoid unverified Bedrock error names in Step Functions.

## Doubts and decisions
- Exam format "2 min 24 s per question" computed from 180 min / 75; the profile's "about 2 min 20 s" for mocks was not repeated.
- "Use instead" column of the closures table (00) is Certidrill guidance: Clarify/Model Monitor replacements follow the AWS availability-change pages; Kendra/Q Business → Knowledge Bases/AgentCore and App Runner → Lambda/ECS Fargate are design alternatives, not official successors.
- Model IDs: only the verified Claude Haiku 4.5 profile IDs are named; other model IDs are placeholders. Haiku 4.5 card says "EOL no sooner than Oct 16, 2026", lifecycle Active on 2026-11-23: recheck if it enters Legacy.
- The lifecycle page also mentions a "GPT-6.1 Sol" model and a `bedrock-mantle` endpoint; neither is used in the course.
- 00 has no key-points section, like the SAP-C03 model chapter.
- Not done: SAP-C03 chapter 13 (another task) still presents Bedrock Agents as a current option without the Agents Classic closure; flag for its owner.
