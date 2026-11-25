Once a generative solution works, you make it better, cheaper and observable. You tune prompts and generation parameters, add reflection loops where quality matters more than latency, instrument every call so tokens, safety signals and latency can be analyzed, and combine models and deterministic rules so each request goes to the cheapest component that can handle it. Exam questions ask which parameter or technique fixes a symptom, how to read a trace or a usage object, and how to split work between models, rules and flows.

<!-- section: tune-generation | objectives: 2.3.1 -->
## Tuning generation: prompts and parameters

Prompt engineering techniques documented for Foundry models (Learn notes they aren't recommended for reasoning models):

| Technique | What it does | Fixes |
| --- | --- | --- |
| System message | Sets role, rules, scope and tone for the whole conversation | Off-topic or inconsistent answers |
| Clear instructions first | States the task before the context and examples | The model misses the actual task |
| Few-shot learning | Adds example input and output pairs after the system message | Wrong format or style; the model isn't changed permanently |
| Break the task down | Splits a complex task into smaller steps or calls | Errors on complex multi-part tasks |
| Chain of thought | Asks the model to proceed step by step and show the steps | Reasoning errors on non-reasoning models; easier to check |
| Specify the output structure | Requires a format (JSON, a table) and inline citations | Unparseable output, missing citations |
| Grounding context | Provides the source data to answer from | Fabrications |
| Repeat instructions at the end | Uses recency bias | Instructions ignored in long prompts |
| Prime the output | Ends the prompt with the start of the expected answer | Wrong form of answer |

Generation parameters:

| Parameter | Effect | Guidance |
| --- | --- | --- |
| `temperature` | Randomness, 0 to 2 | Low (about 0.2) for factual, legal or extraction tasks; higher (about 0.7) for creative text |
| `top_p` | Also controls randomness, by limiting the token probability mass | Change temperature **or** top_p, not both |
| `max_output_tokens` (Responses) / `max_completion_tokens` (Chat Completions) | Caps generated tokens, reasoning tokens included | Too low truncates the answer |
| `reasoning` effort | How much a reasoning model thinks: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` (supported values and defaults vary by model) | Raise for hard problems, lower for latency and cost; a tuning knob, not the first fix when quality drops |
| `presence_penalty`, `frequency_penalty` (Chat Completions) | Discourage repeated tokens or topics | Repetitive output |

Reasoning models other than GPT-6 Astra don't support `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, `logprobs`, `top_logprobs`, `logit_bias` and `max_tokens`. Prompt them with a clear goal, firm constraints and an explicit output contract instead of prescribing every intermediate step. A `developer` message works like a system message.

```json
{
  "model": "gpt-5-mini",
  "reasoning": { "effort": "low" },
  "max_output_tokens": 4000,
  "input": "Classify this ticket as billing, technical or account. Return only the label."
}
```

A response that returns `status: "incomplete"` with reason `max_output_tokens` may have spent the whole budget on reasoning before any visible output, and those tokens are still billed. Learn suggests reserving at least 25,000 tokens for reasoning and output on a new workload, then tuning.

| Symptom | First fix |
| --- | --- |
| Answers vary too much between identical requests | Lower temperature |
| Facts invented about company data | Ground with RAG, not a parameter change |
| JSON sometimes invalid | Specify the structure (structured output schema), lower temperature |
| Long answers cut off | Raise `max_output_tokens` |
| Reasoning model too slow or costly on simple tasks | Lower the reasoning effort, or route to a smaller model |

> **Exam trap.** Temperature doesn't add knowledge. When answers are wrong about facts the model can't know, the fix is grounding; when answers are inconsistent in form, the fix is the prompt and the parameters.

<!-- section: reflection | objectives: 2.3.2 -->
## Reflection, chain-of-thought evaluation and self-critique loops

**Reflection** makes the model review its own output before it is returned. A self-critique loop has three roles, which can be three calls to the same model or to different models:

1. **Generate** a draft answer.
2. **Critique** it against explicit criteria: grounded in the sources, answers the question, follows the format and the policy. Ask for a structured verdict (pass or fail, list of problems).
3. **Revise** using the critique, then stop when the verdict passes or after a fixed number of iterations.

```text
draft = generate(question, sources)
for attempt in range(2):                       # bounded: cost and latency grow with each loop
    review = critique(draft, sources, rubric)  # structured verdict: {"passed": ..., "issues": [...]}
    if review["passed"]:
        break
    draft = revise(draft, review["issues"], sources)
```

**Chain-of-thought evaluation.** For non-reasoning models, ask for the steps explicitly so a reviewer, a critique call or an evaluator can check them; this also reduces inaccuracy. For reasoning models, don't ask for or extract the hidden reasoning: Learn says extracting raw reasoning by other means isn't supported. Use the `reasoning.summary` option of the Responses API to get summaries (not guaranteed on every request), and judge the final answer.

Use the evaluators as the critic or as the check after the loop:

| Need | Tool |
| --- | --- |
| Is the draft supported by the sources? | Groundedness evaluator, or a critique prompt with the sources |
| Does it follow the system rules? | Task Adherence (preview) |
| Weighted score on several custom criteria with per-criterion reasoning | Rubric evaluator (preview) |
| Why did a response fail? | The `reason` returned with each evaluator score |

> **Exam trap.** Each reflection pass multiplies tokens and latency. Use a bounded loop for high-stakes outputs (contracts, medical or financial summaries), not for every chat turn, and keep a stop condition.

> **Exam tip.** "The model must verify its work before answering" with a reasoning model: state in the prompt what done means and how to verify, rather than adding "think step by step".

<!-- section: observability | objectives: 2.3.3 -->
## Observability: tracing, token analytics, safety signals and latency

**Tracing** records every operation as OpenTelemetry spans in the Application Insights resource connected to the project: model calls, tool executions (`execute_tool`), agent invocations (`invoke_agent`), memory operations, with durations, token counts and, when content recording is on, inputs and outputs. Tracing is generally available for prompt and hosted agents (workflow and external agents are in preview) and works for prompt agents once Application Insights is connected. Client-side instrumentation (preview) adds your application's own spans:

```text
os.environ["AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING"] = "true"
from azure.ai.projects.telemetry import AIProjectInstrumentor
from opentelemetry import trace

AIProjectInstrumentor().instrument()
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("claim-triage"):   # parent span groups the whole request
    response = openai.responses.create(model="gpt-4.1-mini", input=claim_text)
```

GenAI tracing instrumentation is an experimental preview feature: the `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` variable must be `true` before `instrument()` is called, or tracing isn't enabled. A `ConsoleSpanExporter` prints spans locally for debugging; `configure_azure_monitor` sends them to Application Insights.

**Token analytics.** Every response carries a `usage` object; reasoning tokens are billed as output tokens:

```json
"usage": {
  "input_tokens": 75,
  "output_tokens": 1186,
  "output_tokens_details": { "reasoning_tokens": 1024 },
  "total_tokens": 1261
}
```

Track input tokens (prompt size, retrieved passages, conversation history), output tokens and reasoning tokens per deployment, agent or feature. The agent **Monitor** tab charts token usage; a high count points to verbose prompts, too many retrieved chunks or long histories.

**Safety signals** to collect and alert on:

| Signal | Source |
| --- | --- |
| Blocked prompts | HTTP 400 with code `content_filter` |
| Blocked or filtered completions | `finish_reason` `content_filter` |
| Detections in annotate mode | Content filter annotations (`filtered`, `severity`, `detected`) |
| Filter didn't run | Error object in the annotations |
| Harm rate on live traffic | Continuous evaluation with safety evaluators |
| Exploitable weaknesses | Scheduled red teaming results |

**Latency breakdown.** The trace shows each span's duration, so total latency splits into retrieval, each model call, each tool call and your own code.

| Slow part in the trace | Typical fix |
| --- | --- |
| Model call with a long output | Lower `max_output_tokens`, a smaller model, or a lower reasoning effort |
| Model call with a huge input | Fewer or shorter retrieved chunks, summarize the history |
| A tool span | Optimize or cache the API, run independent calls concurrently |
| Variable latency under load | Provisioned throughput for consistent latency |
| Perceived wait in a chat UI | Stream the response |

> **Exam trap.** Monitoring metrics tell you that latency rose; the trace of one request tells you which step caused it. Choose tracing for "find the step", the Monitor tab or Azure Monitor alerts for "be notified when".

<!-- section: orchestrate-models | objectives: 2.3.4 -->
## Orchestrating multiple models, flows and hybrid rules engines

| Approach | How it works | Fits |
| --- | --- | --- |
| Model router | One deployment that routes each prompt to an underlying model | Mixed traffic, no routing logic to maintain |
| Cascade | A small model answers first; escalate to a larger model when confidence or a check fails | Mostly simple requests with occasional hard ones |
| Specialized pipeline | Different models per step: embedding model for retrieval, small model for classification, LLM for generation, multimodal model for images | Each step with its own cost and quality needs |
| Hybrid LLM and rules | The LLM interprets unstructured input; deterministic rules make or validate the decision | Regulated decisions, fixed thresholds, auditability |
| Workflow | Agent Framework sequences, branches and runs steps in parallel | Known multistep processes |

**Model router** facts:

- Routing modes: **Balanced** (default: the most cost-effective model within about 1–2% of the best quality for the prompt), **Cost** (a wider band, about 5–6%), **Quality** (the best model, ignoring cost).
- A **model subset** limits the models it can pick (at least one model); new models are excluded from a subset until you add them. Routing across the full pool picks up new models automatically.
- If the selected model returns a retryable error, the router fails over to the next-best model automatically, with nothing to configure.
- Supported deployment types: Global Standard and Data Zone Standard.
- The context window is that of the **smallest** model in the set. The router accepts text and image input but routes on the text only; audio input isn't supported.
- Claude models must be deployed in the same Foundry resource, with a deployment type that matches the router deployment, before the router can use them.
- Version `2025-11-18` is GA and the default; Auto, session affinity and per-request routing controls are preview.

**Hybrid example.** Litware Insurance must approve claims under 1,000 USD automatically and send larger ones to an adjuster. The LLM extracts the amount, the policy number and the incident type from the claim email as JSON; a rules engine applies the threshold and the policy coverage; only the explanation letter is generated again by the LLM. The decision is reproducible and auditable, and the model never decides the payout.

| Requirement | Choice |
| --- | --- |
| Fixed legal threshold that must always apply | Rule in code, not an instruction to the model |
| Reduce cost on traffic that is mostly simple, without writing routing code | Model router in Cost or Balanced mode |
| Highest answer quality whatever the cost | Model router in Quality mode, or a fixed large model |
| Thousands of documents to summarize overnight | Batch deployment, 50% cheaper, 24-hour target |
| Summarize text, extract fields from an image, then classify | Pipeline with a multimodal model and a small classifier |

> **Exam trap.** The model router context window is the smallest one among its models. A prompt that only fits a large-context model can fail through the router: restrict the subset or shorten the prompt.

<!-- section: key-points -->
## Key points

- Prompt techniques: system message, few-shot, break down, chain of thought (non-reasoning models), output structure, grounding, repeat at the end, priming.
- Change temperature or top_p, not both. Reasoning models: `reasoning` effort and `max_output_tokens`; no temperature or top_p.
- Reflection: generate, critique against criteria, revise, with a bounded number of loops. Don't extract raw reasoning; use reasoning summaries.
- Tracing: OpenTelemetry spans in Application Insights; client-side tracing (preview): set `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` before `instrument()`.
- Tokens: `usage.input_tokens`, `output_tokens`, `output_tokens_details.reasoning_tokens` (billed as output).
- Safety signals: HTTP 400 `content_filter`, `finish_reason` `content_filter`, annotations, continuous safety evaluation.
- Model router: Balanced (default), Cost, Quality; a model subset excludes new models until you add them; automatic failover; smallest context window applies.
- Rules decide what must be deterministic; the LLM handles unstructured input and language.
