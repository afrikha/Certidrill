# C-aip-c01-5 — COURSE AIP-C01, chapters 41, 42, 43, 51 (2026-11-23)

Chapters (English only): `41-cost-optimization` (4.1.1–4.1.4, ~2,000 prose words), `42-performance` (4.2.1–4.2.6, ~1,940), `43-monitoring` (4.3.1–4.3.6, ~1,980), `51-evaluation-quality-gates` (5.1.1, 5.1.2, 5.1.4, 5.1.8, 5.1.9, ~1,850). `check-cert.ts` and `content:validate`: 0 problems for these chapters.

## Facts verified (WebFetch, docs.aws.amazon.com / aws.amazon.com, 2026-11-23)
- Prompt caching (implicit/explicit, checkpoints, 512–4,096 token minimum, 4 checkpoints for Claude/Nova, TTL 5 min default and 1 h for some Claude, tools→system→messages, not for batch, cache reads not counted in TPM).
- Service tiers Reserved/Priority/Standard/Flex (`service_tier`, Reserved 1 or 3 months, min 100k input / 10k output TPM, 99.5%); pricing page: batch 50% lower than on-demand, Flex 50% discount, Priority 75% premium.
- Intelligent prompt routing (same family, English-optimized, default routers Nova and Llama); latency-optimized inference (preview, listed models, fallback billed standard).
- Batch inference (`CreateModelInvocationJob`, 24–168 h, no provisioned models, no tool calling with Converse type); Provisioned Throughput commitments; custom model on-demand deployment option; distillation.
- TPM burndown and `max_tokens` reservation; CountTokens free; inference profiles; geographic vs global CRIS (~10% savings).
- `AWS/Bedrock` metric list incl. `TimeToFirstToken`, `EstimatedTPMQuotaUsage`, cache token counts; OTPS diagnosis formula; invocation logging (100 KB, destinations, LoggingConfig/CloudWatchConfig/S3Config fields); CloudTrail management vs data events.
- Bedrock Evaluations (task types, metrics, datasets, 1,000 prompts, judge built-in metric IDs, human job: two inference sources, rating methods), KB query config (hybrid support, decomposition, filters), KB logging statuses.
- AgentCore observability setup, runtime and gateway metrics; CloudWatch GenAI observability / Model Invocations; Cost Anomaly Detection timings; OpenSearch Serverless metrics and vector collection facts (NextGen vs classic); ElastiCache Valkey 8.2 vector search; SageMaker scaling metrics, scale to zero, deployment guardrails, production variants, shadow tests; API Gateway cache; AppConfig split rules and bake-time rollback; Synthetics canaries; Evidently ended 10/17/2025.

## Doubts / deviations
- Bedrock human-based evaluation jobs use a SageMaker flow definition (`AwsManagedHumanLoopRequestSource: AWS/Bedrock/Evaluation`, an Augmented AI mechanism). A2I is closed to new customers since July 30, 2026; whether Bedrock human evaluation jobs are affected was not verified. The chapter presents them as a Bedrock feature without mentioning the flow definition.
- OpenSearch Serverless now distinguishes "NextGen" and "Classic" vector collections (refresh 5 s vs 60 s, 32x default compression on NextGen). Mentioned briefly; the exam guide predates this.
- Latency-optimized inference is still documented as preview with old model IDs (Claude 3.5 Haiku, Llama 3.1, Nova Pro); kept as "examples listed on the feature page".
- Burndown multipliers vary by model generation (5x, 10x, 15x...); the chapter says "5 or more for several Anthropic Claude models, check the model card" rather than listing models.
- OpenSearch hybrid-query score normalization (search pipeline) is described generically, without processor names, as it was not fetched from AWS docs.
- AppConfig predefined deployment strategy names not verified, so not named.
