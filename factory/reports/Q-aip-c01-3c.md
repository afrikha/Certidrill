# Q-aip-c01-3c — QUESTIONS AIP-C01, safety 3.3.3–3.4.3 (English only, 2026-11-23)

## Result
- 50 files `content/aip-c01/questions/safety/aipc01-3c-*.yaml`, `{ en }` only.
- Per objective: 3.3.3: 11, 3.3.4: 9, 3.4.1: 10, 3.4.2: 11, 3.4.3: 9 (each within ±1 of 10, total 50).
- Types: single 42 (4 options), multi 8 (all 5 options / "Choose two."). Difficulty: 8 easy, 25 medium, 17 hard.
- Correct option positions for singles: a 10, b 11, c 10, d 11. Correct option is the longest in 17 of 42 singles, mostly by a few characters.
- `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-3c-` → 0 problem(s); `npm run content:validate -- --cert aip-c01 --prefix aipc01-3c-` → 0 problem(s), 0 warning(s).

## De-duplication with 3a / 3b (written in parallel)
After reading the 3a/3b stems, I deleted and replaced 13 of my first drafts that tested the same decision with the same answer: org-level guardrail enforcement without code change, detect-mode trial, Automated Reasoning detect-only (act on findings), grounding NONE + routing, RetrieveAndGenerate citation spans, Standard tier for languages, Policy in AgentCore for a refund limit, AI Service Cards for Nova, Step Functions Standard callback for human review, ApplyGuardrail ANONYMIZE to store masked text, Builtin.Stereotyping judge, model card vs AI Service Card, and a clause→guardrail-policy mapping multi.
Remaining near-overlaps (different decision, flagged for the reviewer):
- `aipc01-3c-enforcement-prerequisites` (numeric version + resource-based policy) vs `aipc01-3a-did-org-enforcement` (comprehensive content guarding).
- `aipc01-3c-alarm-pii-interventions` (GuardrailPolicyType = SensitiveInformationPolicy) vs `aipc01-3a-did-intervention-alarm` (GuardrailContentSource = Input).
- `aipc01-3c-runtime-disclaimer-check` (Lambda appends a mandatory disclaimer + metric) vs `aipc01-3a-did-output-postprocessing` (Lambda URL allow-list).
- `aipc01-3c-central-invocation-log-archive` (invocation logging only to same-account destinations → S3 Replication) vs `aipc01-3b-decision-logs-object-lock` (Object Lock).

## Verified on AWS pages (WebFetch, 2026-11-23)
Guardrails enforcements (BEDROCK_POLICY, per-Region guardrail, numeric version, resource policy for ApplyGuardrail, included/excluded models, selective_content_guarding, Automated Reasoning unsupported, union of org/account/request guardrails, inheritance into one effective policy, DescribeEffectivePolicy); Guardrails CloudWatch metrics and dimensions; GuardrailIdentifier condition key and its limits (same-organization sharing only); identity-based policy examples (deny on foundation-model ARNs usable as SCP, Converse blocked with InvokeModel); CloudTrail management vs data events; model invocation logging (same account/Region destinations, 100 KB → S3 only, identity.arn, requestMetadata); CloudWatch Logs data protection (masking at ingestion and egress, logs:Unmask, not retroactive, LogEventsWithFindings); metric filters (dimensions, not retroactive); anomaly detection; metric math (MAX/MIN over arrays, alarms); embedded metric format; judge built-in metrics (Stereotyping, Refusal, Harmfulness, ProfessionalStyleAndTone, custom metrics); prompt datasets (BOLD domains, 100-prompt samples, Toxicity datasets, category key, 1,000 prompts); judge dataset (category, BYOI modelResponses, one modelIdentifier); Clarify and Model Monitor availability-change pages (replacements); AgentCore Observability and its configuration (Transaction Search, ADOT, Lambda OTel layer, session-ID header, span log group resource policy, DISABLE_ADOT_OBSERVABILITY); Guardrails overview (reasoning blocks excluded); ReasoningContentBlock (redactedContent); model reasoning page; RetrieveAndGenerate response (citations, span, retrievedReferences; not usable with managed knowledge bases); KnowledgeBaseRetrievalResult score; contextual grounding (NONE action, thresholds, tiers, UpdateGuardrail resets tier); content filters, denied topics (definition best practices), word filters (managed PROFANITY list), sensitive information filters (ANONYMIZE, logs not masked, trace unmasked); Automated Reasoning (detect only, no streaming); structured outputs (Anthropic citations incompatible → 400, no min/max); DocumentBlock citations config; Prompt Management (variables, variants, versions); Flows deploy (versions, aliases, TSTALIASID) and node types (guardrail on prompt node; KB node only with RetrieveAndGenerate); AppConfig split operator, Lambda validators, alarm-based rollback; Step Functions callback; CodePipeline Lambda invoke action; Service Catalog overview; Well-Architected Generative AI Lens (custom lens); AWS responsible AI resources page (AI Service Cards, Nova 2 Lite listed); Comprehend PII and dominant language; Policy in AgentCore.

## Taken from the task brief or peer reports, not re-fetched
- CloudWatch Evidently discontinued (C-aip-c01-5: ended 10/17/2025) — used as a closed distractor in `aipc01-3c-ab-split-appconfig`.
- Amazon Bedrock Agents → Agents Classic, A2I closed to new customers on July 30, 2026; Lambda maximum timeout 1,800 s (task brief).
- AWS/Bedrock runtime metrics are not broken down by caller (stated in `token-anomaly-per-role`; dimension list from C-aip-c01-5, ModelId-based).
- Converse response `citationsContent` blocks (C-aip-c01-4 verified ContentBlock); I fetched only DocumentBlock.

## Stated from stable knowledge (review)
- Service Catalog launch constraints and portfolio sharing with accounts (overview page does not name them).
- CloudTrail management events delivered to EventBridge; SCP with `aws:PrincipalArn` exception; S3 Replication across accounts; Macie scans S3 only (not CloudWatch Logs).
- Policy in AgentCore: Cedar conditions on tool input amounts are not shown on a fetched page; the refund-limit question that relied on it was removed. `agentcore-policy-denial-alarm` only relies on "enforcement decisions are logged and monitored with CloudWatch metrics and logs" (no metric name given).
- Guardrail trace exposes the contextual grounding score (fields not named on the fetched page; course chapter 31 states it).

## Doubts and decisions
- Bedrock human-based evaluation jobs never used as an answer; human calibration is "company reviewers rate a sample" (`judge-calibration`).
- Guidance "Amazon Bedrock agent tracing" (3.4.1) is taught through AgentCore Observability; Agents Classic `enableTrace` appears only as a closed distractor.
- `aipc01-3c-alarm-pii-interventions` uses only the GuardrailPolicyType dimension because the metrics page lists GuardrailPolicyType and GuardrailContentSource as separate dimensions; whether they can be combined was not verified.
- `aipc01-3c-token-anomaly-per-role` uses identity.arn as a metric-filter dimension; the EMF page warns about high-cardinality dimensions (role session names), which a reviewer may want mentioned.
- Reference `https://aws.amazon.com/ai/responsible-ai/resources/` (AI Service Cards) is not under docs.aws.amazon.com or /faqs/; the validator raised no warning.
- Generator scripts were kept outside the repository (/tmp); only question files and this report were written.
