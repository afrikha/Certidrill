# Q-aip-c01-3a — QUESTIONS AIP-C01, domain safety, objectives 3.1.1–3.1.5 (English only, 2026-11-23)

## Result
- 55 files in `content/aip-c01/questions/safety/`, prefix `aipc01-3a-`: 11 per objective (3.1.1 `input-*`, 3.1.2 `output-*`, 3.1.3 `acc-*`, 3.1.4 `did-*`, 3.1.5 `adv-*`).
- Types: single 46, multi 9 (8 "Choose two", 1 "Choose three"). Difficulty: 8 easy / 28 medium / 19 hard.
- `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-3a-` → 0 problem(s); `npm run content:validate -- --cert aip-c01 --prefix aipc01-3a-` → 0 problem(s), 0 warning(s).
- No other question existed in `questions/safety/` when the batch was written (3b/3c cover 3.2–3.4).
- Length check: after rebalancing, the correct option is the longest in 18 of 46 singles, mostly by a few characters.

## Verified (WebFetch, 2026-11-23) — every reference is one of these pages
- Guardrails: overview (draft/versions), prompt attacks (jailbreak, injection, leakage Standard only; input tags required with InvokeModel*, input-only fields), input tagging (random suffix per request, 1–20 alphanumeric, no nesting, untagged = whole prompt except prompt attacks), Converse (guardContent behavior table, tool content not evaluated, stopReason, ANONYMIZED vs BLOCKED in trace, trace has unmasked values), content filters (categories, per-direction strength/action, image modality), sensitive information filters (types, ANONYMIZE on input, regex limits, invocation logs not masked), contextual grounding (0–0.99, 1 invalid, qualifiers, ApplyGuardrail unqualified block, Classic strict vs Standard conversational, Region subset), Automated Reasoning (detect only, no injection/encoded/streaming support) and concepts (finding types, bare assertions → IMPOSSIBLE, variable descriptions, confidence threshold), ApplyGuardrail (no model call, pre-retrieval use case, assessments), streaming (sync default, async no PII masking), IAM `bedrock:GuardrailIdentifier` (4 APIs, RetrieveAndGenerate/InvokeAgent limitation, input-tag bypass), enforcements (BEDROCK_POLICY, account-level API, numeric version, Selective/Comprehensive, no AR), tiers (denied topic 200 vs 1,000 chars, languages, leakage), denied topics (30, don't use for entities), word filters (10,000 items, three words, whole-word), cross-Region guardrail profile, Guardrails CloudWatch metrics (namespace, InvocationsIntervened, GuardrailContentSource).
- Comprehend trust and safety (DetectToxicContent categories, English, 10 × 1 KB; prompt safety classification closed to new customers), Comprehend PII (English/Spanish, redaction async only).
- Structured outputs (outputConfig.textFormat, additionalProperties false, no min/max, 12 optional properties, max_tokens truncation, InvokeModel supported).
- RetrieveAndGenerate API (citations, guardrailConfiguration, guardrailAction; **cannot be used with managed knowledge bases** → stems say "customer-managed knowledge base").
- Bedrock evaluation task types (Toxicity, RealToxicityPrompts, BOLD), judge metrics (Harmfulness, Stereotyping, Refusal...), judge page.
- Policy in AgentCore (Gateway interception, deterministic policies on tool, principal, parameters).
- Step Functions integration patterns (Express = Request Response only; callback, one-year wait, heartbeat).
- WAF rate-based rules; API Gateway throttling and usage plans; Bedrock prompt injection security page; Prescriptive Guidance agentic AI security §4 (automated testing suites, prompt logging metrics, sanitization/obfuscation); Knowledge Bases GenerateQuery (text-to-SQL).

## Stated from stable knowledge (no page fetched) — reviewer may check
- API Gateway REST request validators with a JSON schema model (`input-realtime-validation`); Cognito user pool authorizers and WAF web ACL association with an API Gateway stage (`did-edge-layers`); a Converse request takes a single `guardrailConfig` (`adv-converse-system-flagged`, distractor d); Converse authorized by `bedrock:InvokeModel` (from the C-aip-c01-4 report).
- Comprehend entity detection flags organization names (distractor explanation only).

## Doubts and decisions
- The Converse guardrail page says that once a guardContent block is present only guardContent is evaluated, but also notes that "a word filter can still catch unwrapped text". `input-guardcontent-latest-turn` is worded "limit guardrail evaluation to the newest user message"; if the reviewer reads the note strictly, add "content filters only" to the stem.
- Whether an input blocked in a Converse call still incurs model inference was not verified, so no stem relies on it (`input-realtime-validation` rejects prompts with ApplyGuardrail before the model call).
- `adv-screen-tool-results` and `input-applyguardrail-before-retrieval` assume ApplyGuardrail evaluates the prompt attack filter on content sent with `source: INPUT` without input tags (tags are documented only for InvokeModel*). Consistent with the docs, not stated literally.
- `acc-applyguardrail-selfhosted`: the ApplyGuardrail page says "decoupled from foundation models" but does not literally say "models hosted outside Bedrock"; the course chapter states it.
- Closed services appear only as distractors explained as closed: Kendra, A2I, SageMaker AI Clarify, Model Monitor, Comprehend prompt safety classification, Bedrock Agents (Agents Classic). No question relies on Bedrock human-based evaluation jobs.
- Policy in AgentCore page now also mentions a "Dogwood" policy language; not used (questions mention only policy engines and Gateway enforcement).
- The shared WebFetch budget ran out once during research (HTTP 403 from the proxy); no reference relies on an unfetched page.
