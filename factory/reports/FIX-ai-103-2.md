# FIX-ai-103-2 — chapters 22, 23, 31, 32, 33 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-103 22-agents 23-optimize-operationalize 31-image-video-generation 32-multimodal-understanding 33-multimodal-responsible-ai` 0 problems; `content:validate --cert ai-103` 0 problems, 0 warnings; `check-quiz ai-103` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. Only one code block changed (23: `"model": "o4-mini"` became `"gpt-5-mini"`, identical in both languages). Word counts: 22 (2,700 EN words) and 32 (2,518) were already over the 2,200 guide; they grew by under 200 words each.

## 22-agents

| Finding | Learn | Change |
| --- | --- | --- |
| Intent Resolution, Task Adherence, Task Completion preview | Confirmed (agent-evaluators and built-in-evaluators: all three "(preview)"; the tool evaluators and Task Navigation Efficiency aren't marked) | Evaluator table and Key points: "(preview)" |
| Tool evaluator limits | Confirmed: avoid Tool Call Accuracy, Tool Input Accuracy, Tool Output Utilization, Tool Call Success **and Groundedness** with Foundry IQ (Azure AI Search), Bing Grounding, Bing Custom Search, SharePoint Grounding, Code Interpreter, Fabric Data Agent, Web Search | Sentence rewritten with the full lists |
| OpenAPI request bodies, account managed identity | Confirmed: `application/json` and `application/json-patch+json`; account managed identity is a "legacy option", to migrate | OpenAPI rules paragraph |
| Hosted agents: OpenAI Agents SDK, .zip | Confirmed: hosted-agents names Agent Framework, LangGraph, Semantic Kernel or custom code (LangChain/Deep Agents through `langchain-azure-ai`), Python and C#; no OpenAI Agents SDK. The .zip upload is on deploy-hosted-agent (tip). Protocols: Responses, Invocations, Activity, A2A | Agent types table: OpenAI Agents SDK removed, frameworks, languages and protocols added |
| Azure Functions tool | Confirmed: queue-based (`AzureFunctionTool`, input/output queues, `CorrelationId`), standard setup only, Storage Queue Data Contributor for the project and function app identities; HTTP-triggered functions go through the OpenAPI tool. No preview label | Tools table row and a new paragraph; Key points |
| MCP defaults, private MCP | Confirmed: `require_approval` defaults to `always`; omitted or `[]` `allowed_tools` = all tools; private MCP: standard setup with private networking and a subnet delegated to `Microsoft.App/environments` | MCP paragraph; Key points |
| A2A roles and limits | Confirmed: Foundry Project Manager to create the connection; Foundry Agent Consumer on the target; for Foundry agent targets text only, no streaming | A2A row |
| Connected agents → "A2A tool or workflows" | The A2A page still lists Foundry workflows; the workflow page says they retire December 1, 2026 and to use Agent Framework | Sentence: "A2A tool, or Agent Framework workflows (Foundry workflows retire December 1, 2026)" |
| Monitoring roles | Confirmed: Log Analytics Reader for log-based views, Privileged Monitoring Data Reader for protected tables | monitor-agents paragraph |
| "Azure AI Search tool" naming | Learn title: "Connect a Foundry IQ (Azure AI Search) index to Foundry agents"; no preview label; one index | Parenthesis added in the tools section; the name used throughout is a human decision (below) |
| Memory preview | Confirmed (what-is-memory); limits 100 scopes / 10,000 memories, no VNet, chat + embedding deployments, `{{$userId}}` with the memory search tool | None (the chapter already says preview) |
| Content Understanding tool status | **Not confirmed**: its Learn page failed to load twice, and it's not in the tool catalog table | None. Flagged |

## 23-optimize-operationalize

| Finding | Learn | Change |
| --- | --- | --- |
| o4-mini and o3 retired | Confirmed (model-retirement-schedule): o4-mini, o3, o3-mini, o1, o3-pro retired 2026-11-19 (replacements gpt-5.6-terra / gpt-5.6-sol). The reasoning page still lists them in its region table, with no note | JSON example: `gpt-5-mini` (GA, retires 2027-07-13) |
| GPT-6 Astra exception, tuning knob | Confirmed: "Reasoning models other than GPT-6 Astra don't support…"; values and defaults vary by model; "treat `reasoning_effort` as a tuning knob". "Start at `medium`" isn't on the page | Parameters table row and the sentence below it |
| Client-side tracing preview | Confirmed: H1 "Add client-side tracing to Foundry agents (preview)"; GenAI tracing "an experimental preview feature". Agent tracing overview: GA for prompt and hosted agents, preview for workflow and external agents | observability paragraph, env-var sentence, Key points |
| Preview evaluators | Confirmed: Task Adherence, Response Completeness, Groundedness Pro, Rubric preview; Groundedness, Relevance, Coherence, Fluency unmarked | Reflection table: Task Adherence (preview) (Rubric was already marked) |
| Model router subset "= failover set, at least two" | **Wrong**: how-to says "You must select at least one model"; neither page calls the subset a failover set. Confirmed: new models are excluded from a subset until added; full pool picks them up | Bullet rewritten; Key points |
| Failover | Confirmed (concept): "fails over to the next-best model automatically, with nothing to configure" on a retryable error | Bullet reworded |
| Modalities, Claude, versions, preview features | Confirmed: text and image input, routing on text only, no audio; Claude must be in the same resource with a matching deployment type; 2025-11-18 GA and default, 2025-05-19 and 2025-08-07 (preview) retire 2027-01-27; Auto, session affinity, per-request controls preview | Two bullets updated, one added |
| gpt-4.1 family deprecated | Confirmed: retires 2027-04-14 | None (still available; code examples keep gpt-4.1-mini). Recheck before April 2027 |

## 31-image-video-generation

| Finding | Learn | Change |
| --- | --- | --- |
| GPT-image-1 series "limited access preview" | **Learn disagrees**: the image generation page says "Limited access preview" for 1, 1.5 and 1-mini; the retirement schedule says gpt-image-1 Preview (retirement 2026-10-28, already passed), gpt-image-1-mini GA, gpt-image-1.5 GA | None. Human decision |
| Responses `image_generation` tool models | Confirmed (responses page): GPT-image-1 series, gpt-image-2.5-flare/-sunburst; gpt-image-2 not listed; multi-turn editing and streaming not supported | Sentence added |
| 2.5 size rules, gpt-image-2 pixel count | Confirmed: multiples of 16, 1:3 to 3:1, edge ≤ 3,840, 655,360–8,294,400 pixels, above `2560x1440` experimental; same pixel count for gpt-image-2. The `size=auto` caveat wasn't in the fetched text | Model table, two rows |
| Default quota | Confirmed: 5 images/min for the GPT-image-1 series and GPT-image-2 only | Sentence reworded ("per deployment" removed, not stated) |
| Streaming | Confirmed for the GPT-image-1 series and GPT-image-2; `partial_images` is "0 and 3" in one place, "1-3" in another | Control table row |
| Transparent background on gpt-image-2 | Learn inconsistent ("GPT-image-1 only" vs "GPT-image-1 and GPT-image-2") | None. Flagged |
| Roles | The page names Cognitive Services User (user setup) and Cognitive Services OpenAI User (managed identity) | None (chapter's role is right for a managed identity) |
| Sora 2 preview | Confirmed: "Sora 2 video generation is currently in preview" | None (already says preview). 3.1.2 and 3.1.4 have no GA alternative: see below |
| Sora 2 sizes and durations | Learn inconsistent: API table 4/8/12 s and two sizes; Limitations section 1–20 s and nine sizes | None. Flagged |

## 32-multimodal-understanding

| Finding | Learn | Change |
| --- | --- | --- |
| Pro mode current? | Confirmed: what's-new introduces pro mode "(preview)" with `2025-05-01-preview`; the GA `2025-11-01` notes and the overview don't mention it; standard-pro-modes now opens the quickstart; agentic mode is preview in `2026-06-01-preview` | Pro mode paragraph, table row and Key points say preview `2025-05-01-preview` |
| `contentCategories` not for image analyzers | Confirmed (analyzer-reference): document and video only, also `enableSegment`; image: `returnDetails` only | Sentence in cu-pipelines; Key points |
| Custom analyzers derive only from four bases | Confirmed (prebuilt-analyzers) | `baseAnalyzerId` row |
| Image limits differ between APIs | Confirmed: Chat Completions (vision page) JPEG, PNG, GIF first frame, WEBP, 20 MB, 10 images per call; Responses non-animated GIF, 50 images, under 512 MB | Formats sentence |
| GPT-4.5 | Confirmed: "o-series, GPT-5 series, GPT-4.1 series, GPT-4.5, GPT-4o series" | Model list |
| FR « réseau appairé » | Guide: « peering » | « réseau virtuel connecté par peering » |

## 33-multimodal-responsible-ai

| Finding | Learn | Change |
| --- | --- | --- |
| DALL-E retired; Content Credentials models | Confirmed: `dall-e-3` retired March 4, 2026; the Content Credentials (classic) page names DALL-E and GPT-image-1 series and says all AI-generated images from Azure OpenAI include them. The `/azure/foundry/` version failed to load; GPT-image-2 isn't mentioned | Sentence and `softwareAgent` row note which series each value is for and that DALL-E is retired |
| Spotlighting models only | Confirmed: guardrails overview, Spotlighting (Preview) Models ✅ Agents ❌; Prompt Shields page: off by default, Chat Completions only | "(not for agents)"; Key points |
| Guardrail action names | Confirmed: Annotate (models only), Annotate and block (models and agents) | Prompt Shields paragraph |
| Document attack detection default | Confirmed (Prompt Shields page): user prompt attack detection on by default, document attack detection off until enabled | Same paragraph; Key points |
| Default policies for vision and image generation | Confirmed (default-safety-policies) | One sentence in visual-policy |
| CU and guardrails | Confirmed (CU overview): guardrails can restrict field generation; analysis can succeed with warnings. "Inherits the guardrails of the deployments" wasn't on a fetched page | Sentence rewritten |
| Groundedness detection retires April 30, 2027 | Confirmed | None (not in the chapter) |

## Mock-exam bank questions changed

- `generative/ai103-2d-critic-evaluator-match` (2.3.2, dragdrop): three correct answers were preview (Task Adherence, Rubric, Response Completeness). Rewritten with GA evaluators: Groundedness, Coherence, Fluency, Similarity (distractors Relevance, BLEU). Same id, type, objective, difficulty 1. New reference: General Purpose Evaluators for Generative AI.
- `generative/ai103-2d-groundedness-pro-critic` (2.3.2, single): the answer was Groundedness Pro (preview). The GA version of the same decision (Groundedness with a cheap judge) is already the quiz's q9, so the stem now tests a different check: drafts that are grounded but don't address the question → **Relevance** (b). Same options, difficulty 2.
- `generative/ai103-2d-formatting-reenabled` (2.3.1, single): the answer (`Formatting re-enabled`) is documented only for o3-mini and o1, retired 2026-11-19. Rewritten on a gpt-5-mini deployment: state the output structure in the developer message (d); distractors: higher reasoning effort, chain-of-thought prompt, JSON mode.
- Retired o-series deployments replaced by `gpt-5-mini` (stems, code, explanations): `ai103-2d-reasoning-budget-facts`, `ai103-2d-reasoning-request-code` (deployment `triage-o4` → `triage-g5`), `ai103-2d-reasoning-sampling-error` (explanation now "Reasoning models other than GPT-6 Astra"), `ai103-2d-usage-logging-code` (`planner-o4` → `planner-g5`), `ai103-2d-reasoning-summary-review`, `ai103-2d-reasoning-token-cost`, `ai103-2d-reflection-facts`, and the distractor option of `ai103-2d-router-deploy-rest`. Answers unchanged.
- `generative/ai103-2d-router-facts` (EN + FR): stem "an o-series reasoning model" → gpt-5-mini; explanation no longer says the subset is the failover set "with at least two models"; it says the router drops an unsupported optional parameter (concept page). Answers unchanged.
- `generative/ai103-2d-router-claude-order` (EN + FR explanation): "the subset is also the fallback set" removed; failover described as automatic. Answer unchanged.

## Checked and left unchanged

- Preview evaluators used only in stems or as distractors: `ai103-2c-eval-rule-code`, `ai103-2c-eval-tool-choice`, `ai103-2c-enforced-controls`, `ai103-2d-trace-find-step`.
- Agents: `ai103-2c-openapi-spec-fix` (already gives both content types), `ai103-cs2c-allergen-agent`, `ai103-2c-code-first-workflow`, `ai103-2c-keep-ownership` (connected agents and workflows as distractors, explanations match Learn), `ai103-2c-mcp-tool-facts`, `ai103-cs1a-payment-approval` (`[]` = all tools), `ai103-2c-guardrail-tool-coverage`.
- Vision: `ai103-3a-stream-preview-code` (gpt-image-2 streaming confirmed), `ai103-3a-chat-image-tool` (gpt-image-1.5 is a supported tool model), `ai103-3a-image-facts` (quota sentence matches Learn), the `contentCategories` questions (`ai103-3b-cu-routing`, `ai103-3b-objects-hotarea`, `ai103-cs4a-scene-analyzer`, `ai103-3b-cu-analyzer-json`: none uses it on an image analyzer), `ai103-3b-inject-spotlighting` (all three statements match the Prompt Shields page).
- Quiz files: none changed; all five agree with the corrected chapters (check-quiz 0/0).

## For a human decision

1. **Preview features as correct answers where the objective has no GA alternative** (kept, as the rule allows for objective-named features):
   - Sora 2 (3.1.2, 3.1.4): every video question of the bank and quizzes 31 q7/q9.
   - Pro mode (3.2.7 names it): `ai103-3b-pro-mode-crosscheck`, `ai103-3b-pro-mode-facts`; agentic mode (preview successor): `ai103-3b-agentic-mode`.
   - Memory (2.2.2 "conversation memory"): `ai103-2b-memory-*`, `ai103-cs1b-guest-memory` and others.
   - Client-side tracing (2.3.3 / 2.2.6 "tracing"; the only Python way to add spans): `ai103-2c-client-trace-content`, `ai103-2d-content-recording-env`, `ai103-2d-observability-facts`, `ai103-2d-tracing-export-code`, `ai103-2c-trace-export-code`.
   - Agent Monitoring Dashboard (2.2.6 "integrate monitoring"): "View agent metrics (preview)", recurring evaluations, red team scans and alerts (preview): `ai103-2c-monitor-no-data`, `ai103-2c-continuous-eval-role`, `ai103-2d-monitor-live-evals`, `ai103-2d-redteam-signal` (scheduled red team scans as the answer).
2. **GPT-image-1 series status**: the image generation page says limited access preview; the retirement schedule says gpt-image-1 Preview with retirement 2026-10-28 (passed), gpt-image-1-mini and gpt-image-1.5 GA. Questions that depend on it: `ai103-3a-face-fidelity` (answer "Deploy gpt-image-1.5"), `ai103-3a-control-mapping` (gpt-image-1 deployment; the transparent background is documented reliably only for gpt-image-1), `ai103-cs2a-cutout-controls` (explanation "With gpt-image-1"), `ai103-3b-policy-manifest` and `ai103-3b-policy-visible-label` (GPT-image-1 series), and the many 3.1.x stems on a gpt-image-1.5 deployment. Not changed.
3. **Naming**: keep "Azure AI Search tool" (chapter, quiz 22, bank) or switch to "Foundry IQ (Azure AI Search) tool" as Learn now titles it.
4. **Content Understanding tool for agents** (2.2.3 names "content understanding"): status not verifiable (page failed to load, not in the tool catalog). The chapter row and its requirement row are unchanged.
5. **Learn inconsistencies kept as is**: Sora 2 durations and sizes; `partial_images` range; transparent background on gpt-image-2; AI Search tool identity (account vs project managed identity); A2A page still recommends Foundry workflows.
6. **Out of scope**: `questions/generative/ai103-cs1c-evaluators` (objective 2.1.4, another agent) uses Task Adherence (preview) as an answer, per the QZ-22 report.

## French terms not settled (not in the glossary)

« garde-fou », « attaque par document », « attaque par invite utilisateur », « analyseur », « file d'attente » (queue), « option héritée » (legacy option), « modification en plusieurs tours » (multi-turn editing), « réglage fin » (tuning knob), « grossièretés » (profanity), « matériel protégé (œuvres d'art et personnages de studio) », « représentations de personnalités publiques », « génération trompeuse de candidats politiques », « déduction d'attributs sensibles ». « message developer » (`developer` role) is kept as in the chapter and the bank.
