# QZ-ai-103-23-optimize-operationalize

Quiz `content/ai-103/quizzes/23-optimize-operationalize.yaml`: 10 questions (2.3.1 ×2, 2.3.2 ×3, 2.3.3 ×3, 2.3.4 ×2), positions 6–10 = dropdown, single, multi, single, hotarea. `check-quiz`: 0 problem(s), 0 warning(s). Pages fetched on 2026-11-24.

## Chapter out of date or incomplete against current Learn (chapter not edited)

- **o4-mini and o3 are retired**: the Model retirement schedule gives 2026-11-19 for o4-mini (2025-04-16) and o3 (2025-04-16), with gpt-5.6-terra / gpt-5.6-sol as replacements. The chapter's JSON example uses `"model": "o4-mini"`. Many mock-exam questions of 2.3.1–2.3.3 use o4-mini or o3 as the deployment (ai103-2d-reasoning-*, usage-logging-code, reflection-facts, formatting-reenabled…). The quiz uses gpt-5-mini (GA, retires 2027-07-13).
- **gpt-4.1 / gpt-4.1-mini / gpt-4.1-nano are deprecated** (retirement 2027-04-14). Still used in the quiz as non-reasoning models; recheck in 2027.
- **Client-side tracing is preview**: "Add client-side tracing to Foundry agents (preview)", and GenAI tracing is "an experimental preview feature". The chapter shows `AIProjectInstrumentor` / `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` without a preview mark. Agent tracing overview: "Tracing is generally available for prompt and hosted agents. Workflow and external agents are in preview." No quiz answer relies on client-side tracing.
- **Preview evaluators**: Built-in Evaluators Reference marks Task Adherence, Response Completeness, Groundedness Pro, Rubric (and others) as preview; Groundedness, Relevance, Coherence, Fluency aren't marked. The chapter's reflection table lists Task Adherence without "(preview)".
- **Reasoning models**: Learn now names an exception, "Reasoning models other than GPT-6 Astra don't support … temperature, top_p …", and says to "treat reasoning_effort as a tuning knob rather than the first thing you reach for when quality drops". The chapter's "most reasoning models reject" is consistent but doesn't name GPT-6 Astra.
- **Model router**: version 2025-11-18 is GA and the default; 2025-08-07 and 2025-05-19 (preview) retire on 2027-01-27. Several features are preview (Auto, session affinity, per-request routing controls, Messages API, capacity routing). Learn says model router "accepts text and image input, but it bases the routing decision on the text only. Audio input isn't supported", and drops optional parameters the selected model doesn't support. The concept page no longer states the chapter's "model subset is also the failover set, include at least two" or "new models aren't added unless you add them" (not verified on the how-to page). Claude: routed only when deployed in the same resource "with a deployment type that matches the model router deployment".

## Facts not verified on a Foundry product page (taken from the chapter or inferred)

- **Cascade** (q6): not described in Foundry product docs. Supported by the Learn training unit "Design Model Routing for Agent Ecosystems" (escalate to the next tier when a quality validator score is below the floor), used as reference.
- **q8**: running independent tool calls concurrently and caching a once-a-day API are the chapter's "typical fixes"; Learn only says a trace shows which step caused the latency. The arithmetic of the trace (8.7 s of tool spans out of 11.6 s) decides the answer.
- **q3**: Learn has no page on self-critique loops; the "structured verdict with issues" answer comes from the chapter, backed by the evaluator result format (label, passed, reason) and the prompt-engineering "specify an output structure" guidance.
- **q7**: Learn shows `"reasoning_effort"` in a REST `/chat/completions` body and `max_completion_tokens` for Chat Completions; that the Responses-style `reasoning` object and `max_output_tokens` fail on Chat Completions is inferred, not stated.
- **q9**: "gpt-4.1-mini as judge costs less than gpt-4.1" is general pricing knowledge, not fetched. Groundedness needs `deployment_name`; Groundedness Pro needs no deployment and is preview (fetched).
- **q5**: "predictable / consistent latency" is on the Provisioned throughput page, not on the latency page.
- **Streaming (q2)**, `n` and Global Batch facts: latency page and chapter.

## Doubts

- q10 relies on "The default pass threshold is 3. Scores at or above the threshold are considered passing" (RAG evaluators page). If Microsoft changes the default threshold, the answer of p2 changes.
- The French « message développeur » for the `developer` role is not in the glossary; the chapter uses « Un message `developer` ».
