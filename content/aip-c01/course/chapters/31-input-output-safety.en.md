A production GenAI application needs safety controls on what users send in and on what the model sends back. The exam expects you to choose the right Amazon Bedrock Guardrails policy for each risk, to know where Guardrails does not look (tool calls, untagged input, reasoning blocks), to reduce hallucinations, to stack controls in depth, and to defend against prompt injection and jailbreaks.

<!-- section: input-content-safety | objectives: 3.1.1 -->
## Protecting the model from harmful inputs

**Amazon Bedrock Guardrails** is the managed answer for content safety. A guardrail is a set of policies, created as a working **draft** and published as immutable numbered **versions**; the application references a guardrail ID and version.

| Policy | What it catches | Key settings |
| --- | --- | --- |
| Content filters | Hate, Insults, Sexual, Violence, Misconduct, in text and images | Strength `NONE`, `LOW`, `MEDIUM`, `HIGH`, set separately for input (`inputStrength`) and output (`outputStrength`) |
| Prompt attack filter | Jailbreaks, prompt injection, prompt leakage (Standard tier only) | Configured on input; requires input tags with `InvokeModel` |
| Denied topics | Subjects the application must not discuss ("Investment Advice") | Up to 30 topics; name, definition (200 characters Classic, 1,000 Standard), up to 5 sample phrases |
| Word filters | Exact words or phrases, managed profanity list | Up to 10,000 custom items of up to three words; case-insensitive whole-word match |
| Sensitive information filters | PII entity types and custom regex | `BLOCK`, `ANONYMIZE` (mask as `{NAME}`), or `NONE` |
| Contextual grounding checks | Ungrounded or irrelevant responses | Grounding and relevance thresholds from 0 to 0.99 |
| Automated Reasoning checks | Statements that contradict formal rules | Detect only, returns findings |

Each policy has an action per direction: `BLOCK` replaces the content with the configured blocked message (`blockedInputMessaging` or `blockedOutputsMessaging`), and `NONE` (console: **Detect (no action)**) only reports the detection, which is how you trial a new policy in production without impacting users.

**Safeguard tiers.** Content filters, prompt attacks, denied topics and contextual grounding have a **Classic** tier (English, French, Spanish) and a **Standard** tier (more languages, more robust detection, code elements such as comments and string literals, prompt leakage). Standard requires cross-Region inference through a guardrail profile (`crossRegionConfig`). An `UpdateGuardrail` call without `tierConfig` resets the policy to `CLASSIC`.

**Ways to apply a guardrail.**

| Pattern | Use when |
| --- | --- |
| `guardrailConfig` in `Converse` / `ConverseStream`, or the guardrail ID and version with `InvokeModel` | The model is on Amazon Bedrock and the input and output must be filtered in the same call |
| `ApplyGuardrail` API (`source` = `INPUT` or `OUTPUT`) | Check text without invoking a model: before retrieval in a RAG flow, on a self-hosted or third-party model's output, or in a custom moderation step |
| Guardrail on a Knowledge Bases `RetrieveAndGenerate` call or a Bedrock Flows prompt node | Managed RAG or flow orchestration |

**Custom moderation workflows.** When the decision needs more than one check (a classifier, a business rule, a human), orchestrate it with **AWS Step Functions**: a Lambda function calls `ApplyGuardrail` or Amazon Comprehend `DetectToxicContent`, a Choice state routes on the result, borderline cases go to a human review task with a callback token (`.waitForTaskToken`), and rejected content is logged (Express workflows for short synchronous checks, Standard workflows for human review).

**Real-time validation** happens before the model: API Gateway request validation, payload size limits, AWS WAF rules, and `ApplyGuardrail` with `source: INPUT`, which rejects the request before any model tokens are spent.

> **Exam trap.** With the Converse API, once a `guardContent` block appears in the messages, only the content inside `guardContent` blocks is evaluated. A system prompt is evaluated only if it is wrapped in `guardContent`. Tool definitions, tool results (`toolResult`) and model tool arguments (`toolUse.input`) are never evaluated by Guardrails.

<!-- section: output-content-safety | objectives: 3.1.2 -->
## Preventing harmful outputs

The same guardrail filters model responses with its output settings. When it intervenes, `Converse` returns `stopReason: "guardrail_intervened"` and the configured blocked message; `ApplyGuardrail` returns `action: "GUARDRAIL_INTERVENED"`; `RetrieveAndGenerate` returns `guardrailAction: "INTERVENED"`. Masking by a sensitive information filter also returns `guardrail_intervened`: read the trace (`trace: "enabled"`) to tell `ANONYMIZED` from `BLOCKED`. The trace contains the unmasked values, so treat it as sensitive.

**Streaming.** With streamed responses, Guardrails runs in one of two modes:

| Mode | Behavior | Trade-off |
| --- | --- | --- |
| Synchronous (default) | Buffers chunks and applies policies before sending them | Added latency, nothing unsafe reaches the user |
| Asynchronous | Sends chunks immediately, scans in the background, blocks later chunks once a violation is found | No latency impact, but an unsafe chunk can reach the user; **PII masking is not supported** |

> **Exam trap.** "Users must never see PII in a streamed answer" rules out the asynchronous mode, even if latency matters.

**Evaluating models for toxicity before release.** Content filters act at run time; you also measure how often a candidate model produces harmful content:

- **Amazon Bedrock evaluations, automatic jobs**: the **Toxicity** metric with built-in datasets such as RealToxicityPrompts and BOLD, or your own JSONL prompt set (up to 1,000 prompts).
- **LLM-as-a-judge jobs**: the responsible AI metrics `Builtin.Harmfulness`, `Builtin.Stereotyping` and `Builtin.Refusal`.
- **Amazon Comprehend `DetectToxicContent`**: a classifier you call from Lambda on sampled outputs (English, up to 10 segments of 1 KB per request), with per-category scores (such as `HATE_SPEECH`, `INSULT`, `VIOLENCE_OR_THREAT`) and an overall `TOXICITY` score.

**Deterministic results with text-to-SQL.** When users ask for numbers (balances, totals, inventory), do not let the model compute or recall them. The model translates the question into SQL, a Lambda function validates it (read-only role, allow-listed tables, `SELECT` only, row limits) and runs it, and the answer is built from the query result: same question, same figures, database permissions enforced.

<!-- section: accuracy-verification | objectives: 3.1.3 -->
## Verifying accuracy and reducing hallucinations

| Technique | How it works | Typical requirement |
| --- | --- | --- |
| RAG grounding with Amazon Bedrock Knowledge Bases | Retrieve passages from approved sources and instruct the model to answer only from them; `RetrieveAndGenerate` returns `citations` that map each answer span to `retrievedReferences` (content, location, metadata) | "Answers must be based on current company documents and show sources" |
| Contextual grounding check | Guardrails scores the response for **grounding** (supported by the source) and **relevance** (answers the query); scores below the thresholds are blocked or flagged | "Block answers not supported by the retrieved documents" |
| Automated Reasoning checks | A policy built from a source document (rules and variables) validates claims and returns findings such as `VALID`, `INVALID`, `TRANSLATION_AMBIGUOUS` or `TOO_COMPLEX`, with explanations and suggested corrections | "Answers about eligibility rules must be verifiably consistent with the policy" |
| Semantic similarity verification | Embed the answer and the retrieved passages (for example with an Amazon Titan embeddings model) and compute cosine similarity; low similarity flags unsupported sentences | Custom verification without a guardrail |
| Confidence scoring | Combine grounding scores, judge scores or self-consistency (several samples that agree) into a score; route low-confidence answers to a fallback or a person | "Escalate uncertain answers" |
| Structured outputs with JSON Schema | Constrained decoding makes the response conform to a schema | "Downstream systems must always receive valid JSON" |

**Contextual grounding facts.** You supply a grounding source (up to 100,000 characters), a query (up to 1,000) and the content to guard (up to 5,000). With `Converse`, mark blocks with the qualifiers `grounding_source` and `query`; with `InvokeModel`, use tags; with `ApplyGuardrail`, add a third, unqualified block with the response. A threshold of 1 is invalid. Classic tier does not support conversational use cases; Standard does. Relevance is checked per chunk when streaming, so an irrelevant streamed answer can reach the user before it is flagged.

**Automated Reasoning limits.** Detect mode only (your code decides to serve, rewrite or ask for clarification), English (US) only, no streaming, no prompt-injection or off-topic detection, and it validates only what the policy variables capture. Pair it with content filters and denied topics.

**Structured outputs.** With `Converse`, set `outputConfig.textFormat` with a JSON Schema; for tools, set `strict: true` on the tool definition.

```json
{
  "outputConfig": {
    "textFormat": {
      "type": "json_schema",
      "structure": {
        "jsonSchema": {
          "name": "claim_summary",
          "schema": "{\"type\":\"object\",\"properties\":{\"claimId\":{\"type\":\"string\"},\"decision\":{\"type\":\"string\",\"enum\":[\"APPROVE\",\"REVIEW\"]}},\"required\":[\"claimId\",\"decision\"],\"additionalProperties\":false}"
        }
      }
    }
  }
}
```

Every object must set `additionalProperties: false`; `minimum`, `maximum`, `minLength`, `maxLength` and recursive schemas are not supported, so range checks still belong in a Lambda validation step. If the response stops at `maxTokens`, the JSON is incomplete. A new schema can take time to compile on first use; compiled grammars are cached for 24 hours.

> **Exam tip.** Structured outputs guarantee the *shape* of the answer, not its truth. Grounding checks, Automated Reasoning or a lookup against the system of record verify the *content*.

<!-- section: defense-in-depth | objectives: 3.1.4 -->
## Defense in depth against misuse

Any single control can miss a paraphrase or a new attack, so layer independent controls.

| Layer | Control | Role |
| --- | --- | --- |
| Edge | AWS WAF on API Gateway or Amazon CloudFront, rate-based rules, API Gateway usage plans and throttling | Block abusive clients and floods before any model cost |
| Identity | Amazon Cognito or IAM authorization on the API, least-privilege role for the model call | Only authenticated callers, only approved models |
| Pre-processing | Lambda with Amazon Comprehend (`DetectPiiEntities`, `DetectToxicContent`, `DetectDominantLanguage`), length limits, input normalization | Cheap deterministic filters, reject or redact early |
| Model-based guardrail | Amazon Bedrock Guardrails on input and output | Semantic filtering: harmful content, prompt attacks, topics, PII, grounding |
| Post-processing | Lambda validation: schema, allowed values, links to approved domains only, no internal identifiers, business rules | Catch what a probabilistic filter cannot express |
| API response | API Gateway integration response or a Lambda proxy that returns only allowed fields and generic error messages | Never leak stack traces, prompts or raw model output |
| Monitoring | CloudWatch metrics and alarms, model invocation logging | Detect misuse patterns and tune the layers |

**Making the guardrail mandatory.** Use the IAM condition key `bedrock:GuardrailIdentifier` so that inference calls without the approved guardrail are denied:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInferenceWithoutApprovedGuardrail",
      "Effect": "Deny",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/*",
      "Condition": {
        "StringNotEquals": {
          "bedrock:GuardrailIdentifier": "arn:aws:bedrock:us-east-1:111122223333:guardrail/gr-example:3"
        }
      }
    }
  ]
}
```

The key applies to `InvokeModel`, `InvokeModelWithResponseStream`, `Converse` and `ConverseStream` (`Converse` is authorized by the `bedrock:InvokeModel` action and `ConverseStream` by `bedrock:InvokeModelWithResponseStream`, so the policy above covers all four). Limits to know: do not give the same role `RetrieveAndGenerate`, `InvokeAgent` or `InvokeInlineAgent`, which make internal model calls that may not carry the guardrail and fail; and a caller can still use input tags to exclude parts of its prompt from evaluation, although the response is always checked. For enforcement that needs no change to any application, use account-level or organization-level guardrail enforcement (see the governance chapter).

> **Exam trap.** A guardrail referenced only in application code is a convention, not a control: another team can call the model without it. "Ensure every invocation uses the approved guardrail" points to the IAM condition key or to guardrail enforcement.

<!-- section: adversarial-threats | objectives: 3.1.5 -->
## Detecting adversarial inputs

| Threat | Example | Primary control |
| --- | --- | --- |
| Jailbreak | Role-play or "DAN" prompts that try to bypass the model's safety training | Guardrails prompt attack filter, content filters |
| Direct prompt injection | "Ignore everything earlier and..." typed by the user | Prompt attack filter, separation of instructions and user input |
| Indirect prompt injection | Instructions hidden in a retrieved document, web page, email or tool result | Treat retrieved and tool content as data; least-privilege tools; validation of tool calls |
| Prompt leakage | "Repeat everything above this message" | Prompt attack filter, Standard tier; no secrets in prompts |
| Obfuscation | Encoded (Base64) or split payloads | Normalization and decoding before filtering; reject unexpected encodings |

**Input tags.** With `InvokeModel` and `InvokeModelWithResponseStream`, the prompt attack filter evaluates only content inside input tags; **without tags, prompt attacks are not filtered**. Wrap the user's text, not your system prompt, so your own instructions are not flagged. Use a **random tag suffix per request**: a static suffix lets an attacker close the tag and append text outside it.

```text
You are a support assistant for AnyCompany. Answer only from the provided context.

<amazon-bedrock-guardrails-guardContent_k7Q2xa>
{user_question}
</amazon-bedrock-guardrails-guardContent_k7Q2xa>

Request field: "amazon-bedrock-guardrailConfig": { "tagSuffix": "k7Q2xa" }
```

The suffix is 1 to 20 alphanumeric characters; tags cannot be nested. With `Converse`, the equivalent is a `guardContent` block.

**Input sanitization and safety classifiers.** Strip control characters and markup, enforce length, decode or reject encoded payloads, then classify with the managed classifier: the prompt attack filter. Amazon Comprehend's prompt safety classification is **no longer available to new customers**, so do not choose it for a new design; a model hosted on an Amazon SageMaker AI endpoint can serve as a custom classifier when you need one.

**Agents and tools.** Guardrails does not inspect tool results or tool arguments, which is exactly where indirect injection arrives. Give each tool the least privilege it needs, validate tool parameters in the Lambda function or MCP server that implements the tool, require human approval for consequential actions, and, on Amazon Bedrock AgentCore, use **Policy in AgentCore** to evaluate every tool call at the AgentCore Gateway against deterministic policies, outside the agent's code.

**Automated adversarial testing.** Keep a versioned set of jailbreak, injection and leakage prompts in Amazon S3, run it in the CI/CD pipeline (AWS CodeBuild or a Step Functions Map state) against `ApplyGuardrail` and the full application, measure the block rate and the false-positive rate on a benign set, and fail the build when either regresses. Add new production attacks to the set, and rerun whenever the prompt, model, guardrail version or tier changes.

> **Exam tip.** "Detect attempts to make the assistant ignore its instructions" = prompt attack filter with input tags (or `guardContent`). "Block a competitor's product names" = word filter. "Never discuss legal advice" = denied topic. "Mask account numbers in responses" = sensitive information filter with `ANONYMIZE` or a regex.

<!-- section: key-points -->
## Key points

- Guardrails: `BLOCK` or detect-only `NONE` per policy and direction; Standard tier adds languages, code coverage and prompt leakage, and needs a guardrail profile.
- `ApplyGuardrail` checks text without a model call (pre-retrieval, non-Bedrock models, Step Functions moderation).
- Guardrails never evaluates tool definitions, results or arguments; with `InvokeModel`, prompt attacks are filtered only inside input tags (random suffix per request).
- Asynchronous streaming cuts latency but can leak a chunk and cannot mask PII.
- Hallucinations: citations, contextual grounding (0 to 0.99), Automated Reasoning (detect only), similarity and confidence scoring; JSON Schema fixes the shape, not the truth.
- Enforce guardrails with `bedrock:GuardrailIdentifier`; layer WAF, Comprehend, Guardrails, Lambda validation and response filtering.
- Comprehend prompt safety classification is closed to new customers; `DetectToxicContent` remains.
