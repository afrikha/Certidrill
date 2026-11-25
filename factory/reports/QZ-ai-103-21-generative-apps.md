# QZ-ai-103-21-generative-apps — report

Quiz: `content/ai-103/quizzes/21-generative-apps.yaml` (10 questions, `ai103-qz-21-01`…`10`). Checker: 0 problem(s), 0 warning(s).

| # | Obj. | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.1.1 | 1 | single | EU processing + pay per token, no reservation → Data Zone Standard |
| 2 | 2.1.4 | 1 | single | Grounded but off-topic answer → Relevance (not Groundedness/Retrieval) |
| 3 | 2.1.2 | 2 | single | Invented citation links → add title/url fields to the index and pass them with the passages |
| 4 | 2.1.6 | 2 | single | Developer with Reader gets a data-action error → Foundry User on the project (Account Owner has no data actions) |
| 5 | 2.1.5 | 2 | yesno | `AIProjectClient` (connections) vs `get_openai_client()` (evals); a connection doesn't make the OpenAI client a search client |
| 6 | 2.1.1 | 3 | single | Reasoning model: `incomplete` / `max_output_tokens` → raise the cap, check `status` |
| 7 | 2.1.4 | 3 | single | Compare versions on the same dataset; agent target without `version` = latest version |
| 8 | 2.1.3 | 3 | multi | Fixed-order pipeline → sequential Agent Framework workflow + structured output (Foundry workflows retires 1 Dec 2026) |
| 9 | 2.1.6 | 3 | multi | App identity for app-level RAG → Foundry User on project + Search Index Data Reader |
| 10 | 2.1.2 | 3 | dropdown | Python `SearchClient`: `VectorizableTextQuery`, security filter `any(search.in)`, `query_type="semantic"` |

All 75 mock-exam questions of 2.1.x were read first; the quiz avoids their decision/answer pairs (some facts recur in new combinations, e.g. Foundry User in Q4/Q9, max_output_tokens covering reasoning tokens in Q6 vs `ai103-2a-responses-facts`).

## Chapter out of date or inaccurate against current Learn (not edited)

- **Response Completeness is preview** on the RAG evaluators page (Nov 2026); the chapter's evaluator table doesn't say so. The bank question `ai103-2a-eval-completeness` (and `ai103-cs1c-evaluators`) use it as the correct answer, which conflicts with "never test a preview feature as the answer". Groundedness Pro is correctly marked preview.
- **Agent evaluators Intent Resolution, Task Adherence and Task Completion are preview** (agent evaluators page) — relevant to `ai103-cs1c-evaluators` (Task Adherence as answer).
- **Azure AI Search is now branded "Foundry IQ (Azure AI Search)"** in Learn page titles (security filter, RAG overview, agent tool page "Connect a Foundry IQ (Azure AI Search) index to Foundry agents"); the RBAC page still says Azure AI Search. The chapter and the quiz keep "Azure AI Search" (study guide name). Worth a glossary/naming decision.
- **Foundry Project Manager**: the chapter says it manages "the project and its connections". The RBAC page says it can publish agents and assign only the Foundry User role; it doesn't say it manages connections (A2A page: creating an A2A connection needs Foundry Project Manager). The RBAC page is internally inconsistent on project creation.
- **Foundry User for application identities**: Learn now recommends **Foundry Agent Consumer** for principals that only call agents; Foundry User is "least-privilege for developers building and testing agents". The chapter's "day-to-day development and application identities" is fine for apps that call models through the project, but should mention Agent Consumer for agent-only callers.
- **Embeddings**: the SDK overview says "the project endpoint used by the Foundry SDK doesn't currently route embedding requests". The chapter lists what `get_openai_client()` serves but doesn't state this limitation; worth an explicit line (embeddings → `/openai/v1`).
- **Translator endpoint**: the SDK overview lists `https://api.cognitive.microsofttranslator.com/` for Text Translation and regional Speech endpoints, not only `<resource>.cognitiveservices.azure.com` as the chapter's endpoint table suggests for all Foundry Tools.
- **RAG guidance**: Learn ("RAG and Generative AI - Foundry IQ") now says to start new RAG implementations with agentic retrieval (planning and answer synthesis GA in REST `2026-10-01`, other parts preview). The chapter presents app-code RAG as the default and Foundry IQ only for multi-source cases.
- **Security trimming**: the security filter page now distinguishes the filter pattern from native ACL/permission filtering; the chapter only says "apply security filters at retrieval time".
- **Reasoning effort values**: Learn lists `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` (model-dependent) and says GPT-6 Astra supports `temperature`/`top_p`; the chapter's "reasoning effort setting" is generic, fine, but any bank item claiming all reasoning models reject temperature should be checked.
- Reasoning page title is now "Azure OpenAI reasoning models - GPT-6 Astra and GPT-5"; the chapter's example model `gpt-4.1-mini` is still plausible but dated.

## Unverified / doubts

- Python syntax `reasoning={"effort": "high"}` in `responses.create` (Q6): Learn shows the nested `reasoning` object in REST/JSON form only; the Python keyword form is the standard OpenAI SDK form, not seen verbatim on Learn.
- Q4/Q9: Learn's RBAC page doesn't state one role explicitly for "calling standard model deployments through the project"; the answer relies on the chapter and on Foundry User's "project data actions".
- Q10: the claim that `search.ismatch` needs searchable fields and that `eq` can't be applied to a collection comes from OData filter rules, not from a page fetched in this task (the security filter page shows the `any(search.in)` form).
