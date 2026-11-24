# FIX-ai-103-1 — chapters 11 to 14 and 21 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-103 11-foundry-services 12-foundry-setup 13-manage-monitor-secure 14-responsible-ai 21-generative-apps` 0 problems; `content:validate --cert ai-103` 0 problems, 0 warnings; `check-quiz ai-103` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers untouched.

## 11-foundry-services

| Finding | Learn | Change |
| --- | --- | --- |
| Reasoning examples `o3`, `o4-mini` | Model retirement schedule (2026-11-18): o3, o4-mini, o3-mini, o1 retire 2026-11-19, replaced by gpt-5.6-sol / gpt-5.6-terra. The reasoning page (2026-11-20) and the models page still list them (see human decisions) | Reasoning row now "GPT-5 and GPT-6 families"; new sentence giving the retirement date |
| `gpt-image-1` as image example | Retirement schedule: gpt-image-1 (2025-04-15) lifecycle Preview, retired 2026-10-28; models page lists gpt-image-1.5 and gpt-image-2 with no preview label | Image row: `gpt-image-1.5`, `gpt-image-2`, `sora-2` (preview) |
| Audio models | Confirmed: models page lists gpt-realtime-translate, gpt-realtime-whisper, gpt-live-transcribe | `gpt-live-transcribe` added to the audio row |
| Classic RAG "Only GA features" | Confirmed out of date (RAG overview, 2026-11-17): planning and answer synthesis GA in REST `2026-10-01`, other capabilities preview; "for new RAG implementations, start with agentic retrieval" | Classic RAG and agentic retrieval rows rewritten with the page's criteria; new sentence on GA status and the recommendation |
| Integrated vectorization with Azure Vision | Confirmed: Azure Vision multimodal embeddings skill and Foundry model catalog vectorizer are preview (integrated vectorization page; Azure Vision vectorizer page H1 "(preview)") | Integrated vectorization row |
| Toolbox: only function calling excluded | Confirmed (Toolbox page, 2026-10-26): function calling, Grounding with Bing, computer use, image generation, SharePoint, Fabric data agent, Azure Functions can't go in a toolbox | Toolbox sentence lists the seven tools |
| Azure Functions tool only on a (classic) page | **Not confirmed**: "Integrate Azure Functions with Foundry Agents" (2026-08-24) targets current agents, no preview notice; requires the standard setup and Storage queues | Azure Functions row: "through Storage queues; standard agent setup only" |
| Agent types (no workflow agent) | Confirmed (Agent Service overview, 2026-10-26) | None in the chapter (bank question fixed, below) |
| "Foundry IQ (Azure AI Search)" naming | Confirmed on many page titles | None: naming decision (below) |

## 12-foundry-setup

| Finding | Learn | Change |
| --- | --- | --- |
| Trap "private endpoints with no public access can't be configured through the portal" | Wrong: network isolation page (2026-11-17) and private networking page (2026-10-29) both have portal steps | First half of the trap replaced by a confirmed fact: outbound VNet injection can't be added to an existing resource nor updated; redeploy (configure-private-link) |
| Roles to deploy a standard setup | Confirmed on "Use your own resources" (2026-08-21): Foundry Account Owner at subscription scope + Role Based Access Control Administrator or Owner. "Set up standard agent resources" (2026-07-09) only lists Storage Blob Data Contributor and Cosmos DB Operator for the capability-settings caller | None (see human decisions) |
| Cosmos DB throughput | "Use your own resources": at least 3,000 RU/s, 3 to 5 containers per project at 1,000 RU/s each, 10,000 RU/s for two projects with Responses API agents. The standard setup page contradicts itself (5, 6 or 3 containers) | Sentence now says 3 to 5 containers per project and gives the two-project example |
| Same region for Azure OpenAI, Foundry resource and project | Confirmed on "Use your own resources". The private networking page only requires the Foundry resource in the VNet region; other resources can be elsewhere | None |
| Network injection on an existing resource | Confirmed (see first row) | In the trap |
| Key Vault connection details | Confirmed (2026-08-14): one per Foundry resource, created first, resource with no existing connections, Key Vault Secrets Officer minimum for the Foundry resource's managed identity, no secret migration | New paragraph before the CMK paragraph |
| Pipeline roles | Confirmed (RBAC page, 2026-11-12): Contributor deploys models but can't assign roles or publish agents; publishing needs at least Foundry Project Manager on the resource | One sentence added to the CI/CD role paragraph |
| FR « dépôt » | Glossary: repository → « référentiel » | « référentiel » (2 places) |

## 13-manage-monitor-secure

| Finding | Learn | Change |
| --- | --- | --- |
| `o3` as the 1 RPM per 1,000 TPM example | Quota page (2026-08-13) still lists o3 and o4-mini at 1/1,000, o3-mini and o1-mini at 1/10,000; o3 retired 2026-11-19 per the schedule | Ratio text: "the quota page lists lower RPM ratios for the o-series reasoning models" |
| Tools unsupported with network injection | Confirmed wrong (configure-private-link, 2026-11-17): browser automation is supported. Not supported: Fabric data agent (needs public access), Logic Apps, computer use, image generation (under development); partial: Fabric IQ, workflow agents | Sentence rewritten |
| Search tool with private networking | Confirmed (Search tool page, 2026-11-17): basic setup can't use a private search service; standard setup with network injection; project managed identity, no key auth with private networking | New sentence after the indexer sentence |
| Roles on an external search service | Confirmed: Search Index Data Contributor and Search Service Contributor; prerequisites name the Foundry account's system-assigned MI, troubleshooting names the project MI | Managed-identities paragraph names the roles and the inconsistency |
| Continuous evaluation status | Observability page (2026-10-17): continuous evaluation, scheduled evaluation, scheduled red teaming, Azure Monitor alerts, no preview label. Agent Monitoring Dashboard: "Recurring evaluations (preview)", "Red team scans (preview)", "Alerts (preview)"; "Set up continuous evaluation" not preview | One sentence after the four practices. Ambiguity flagged below |
| Preview agent evaluators | Confirmed (built-in evaluators reference, 2026-10-08): Task Adherence, Task Completion, Intent Resolution, Response Completeness, Groundedness Pro preview; tool evaluators not | "Several agent evaluators are in preview" replaced by the list; drift table row marks Intent Resolution preview |
| Debug sessions | Not verified (not on the indexer monitoring page) | None, flagged |

## 14-responsible-ai

| Finding | Learn | Change |
| --- | --- | --- |
| Agent guardrails presented as standard in prose | Confirmed (guardrails overview, 2026-11-17): agent guardrails, Tool call and Tool response are preview | Exam tip rewritten (model deployment: documents + indirect attack detection; agent: tool response, preview); 1.4.4 bullets and key points mark tool call/response and Task Adherence preview |
| Indirect Attack evaluator "Model only" | Confirmed (risk and safety evaluators, 2026-09-29) | Sentence after the safety-evaluator paragraph; RAG and Agent rows mark the preview evaluators |
| Blocklists "built-in profanity list" | Confirmed wrong (blocklists page, 2026-07-29): custom lists only, Azure OpenAI models only, 10,000 terms per list, regex or exact, about 5 minutes to apply. Profanity is only a default control of image generation models (default safety policies) | Blocklists bullet |
| Trace retention | Confirmed (trace setup, 2026-09-07): 90 days in the portal; storage follows Application Insights / Log Analytics | Sentence in the trace paragraph |
| Privileged Monitoring Data Reader in public preview | Not confirmed on Learn (trace setup page has no preview label; the source was a Message Center post) | None, flagged |
| OBO via agent identity | Confirmed (agent identity concepts, 2026-10-28): "acting on behalf of the user is in preview" | OBO row of the tool-access table |
| Red teaming regions | Confirmed (AI Red Teaming Agent, 2026-08-19): East US 2, France Central, North Central US, Sweden Central; text only | Regions sentence |
| "The tool catalog notes that third-party MCP and A2A servers aren't verified" | The tool-catalog URL now serves the Toolbox page, which says nothing about it. The MCP tool page (2026-11-17) says Microsoft doesn't test or verify remote MCP servers; nothing found for A2A | Bullet now cites MCP servers only |
| Document embedding role (`user` vs `system`) | Not used by the chapter | None |
| FR « dépôt(s) » | Glossary « référentiel » | « référentiels publics », « référentiel source » |

## 21-generative-apps

| Finding | Learn | Change |
| --- | --- | --- |
| Response Completeness preview | Confirmed (built-in and RAG evaluator pages) | Marked preview in the evaluator table and key points |
| Foundry Project Manager "manages the project and its connections" | RBAC page: management actions on projects, build, publish agents, assign Foundry User only; connections not mentioned | Row rewritten |
| Foundry Agent Consumer for agent-only callers | Confirmed (RBAC page) | New row in the role table; production-app steps mention it |
| Embeddings not routed by the project endpoint | Confirmed (SDK overview, 2026-10-19) | `openai` row |
| Translator / Speech endpoints | Confirmed: Text Translation `https://api.cognitive.microsofttranslator.com/`, Speech regional endpoints, Document Translation on `cognitiveservices.azure.com` | Foundry Tools endpoint row |
| Start new RAG with agentic retrieval | Confirmed (RAG overview) | One sentence before the code sample |
| Security trimming | Security filter page (2026-11-17) distinguishes the app-managed filter pattern from native ACL filtering | None (the chapter's sentence is still right) |
| Reasoning effort values, GPT-6 Astra temperature | Reasoning page (2026-11-20): values none/minimal/low/medium/high/xhigh/max, model-dependent; GPT-6 Astra supports temperature/top_p | None in the chapter (no claim made); bank checked, below |

## Mock-exam bank questions changed

All keep id, type, objective, difficulty and `status: draft`. EN and FR.

- `planning/ai103-1a-agent-types` (1.1.2): the onboarding answer was the workflow agent (preview; Foundry workflows retire 2026-12-01). The onboarding process is now an existing Agent Framework workflow → hosted agent. "Workflow agent" options replaced by "Voice-based prompt agent".
- `planning/ai103-1a-image-search` (1.1.3): the answer was the Azure Vision multimodal skill and vectorizer (preview). The answer is now a GenAI Prompt skill (GA in REST 2026-04-01, image verbalization), then AzureOpenAIEmbedding and an Azure OpenAI vectorizer. Explanation mentions the Azure Vision option as preview.
- `planning/ai103-1a-classic-rag` (1.1.3): the deciding constraint "generally available features only" no longer holds (agentic planning is GA). Constraint changed to "keep fine-grained control of each query"; correct and option-a explanations updated.
- `planning/ai103-1a-reasoning-contracts` (1.1.1): correct option example `o3` (retired) → `gpt-5.6-sol`, its replacement.
- `planning/ai103-1a-model-task-map` (1.1.1): correct item `gpt-image-1` (retired 2026-10-28) → `gpt-image-2`.
- `planning/ai103-1b-safety-evaluators-prod` (1.3.2): the answer was Sensitive Data Leakage (preview). Now Ungrounded Attributes (GA, model and agent targets) on unsupported inferences about a patient's emotional state or demographic group; distractor explanations adjusted.
- `planning/ai103-1b-eval-data-json` (1.2.4): the slot answer was `builtin.task_adherence` (preview). Requirement now grammar and readability → `builtin.fluency`; task_adherence kept as a distractor marked preview.
- `planning/ai103-1c-agent-tool-call-scan` (1.4.1): Tool call (preview) was the answer. Rewritten for a model deployment: Hate control on **Output**, not User input, because complaints quote abusive messages.
- `planning/ai103-1c-pii-annotate-pilot` (1.4.1): the PII control (preview) was the answer. Now Protected material for text on Output with Annotate.
- `planning/ai103-1c-chatbot-risk-mapping` (1.4.1): target t4 was PII (preview). Now code copied from a public GitHub repository → Protected material for code; PII kept as a distractor, Task Adherence item removed.
- `planning/ai103-1c-third-party-mcp-controls` (1.4.4): option a (Indirect attacks on Tool response, preview) was correct. Requirement 1 is now authorization with the agent's own Entra identity → agent identity (agentic-identity) connection; distractors: project managed identity, custom keys. The `require_approval` half is unchanged.
- `planning/ai103-1c-task-drift-guardrail` (1.4.4): Task Adherence (preview) was the answer. Rewritten: practice for a third-party remote MCP server (connect to the provider's own server, review and log shared data; Microsoft doesn't verify servers).
- `planning/ai103-1c-user-delegated-access` (1.4.4): user delegation (agent identity acting on behalf of the user, preview) was the answer. Now a nightly job with no signed-in user → agent identity with only the Tickets.Read.Payments app role; distractors: Read.All, delegation, default permissions of a new agent identity (none).
- `planning/ai103-1c-evaluator-per-issue` (1.4.2): t3 Response Completeness and t4 Sensitive Data Leakage (both preview). Now t3 → Relevance, t4 (unnecessary tool calls) → Tool Selection; the two preview evaluators remain as distractors.
- `planning/ai103-1c-score-thresholds` (1.4.2): s3 tested Response Completeness (preview). Now "Relevance needs a ground truth" → No. Answers Yes/No/No.
- `generative/ai103-2a-eval-completeness` (2.1.4): Response Completeness (preview) was the answer. Now Coherence (answers in no logical order, grammar fine).
- `generative/ai103-2a-eval-grounded-pro` (2.1.4): Groundedness Pro (preview) was the answer. Now Document Retrieval (labeled relevance judgments, NDCG, no judge deployment).
- `generative/ai103-cs1c-evaluators` (2.1.4) + case `ai103-cs1c-margiestravel` requirement 2: Response Completeness and Task Adherence (both preview) were the answers. Requirement 2 now asks for the same meaning as the expected answers and support by the retrieved passages → Similarity and Groundedness (F1 Score, Relevance, Coherence distractors).
- `generative/ai103-cs4b-release-evaluators` (2.1.4) + case `ai103-cs4b-consolidated` Check 4: Check 4 targeted support-agent with the Indirect Attack evaluator, which is model only. Check 4 now targets chat-ops responses to mail-triage. Explanation says XPIA supports model targets; Intent Resolution distractor marked preview.
- `planning/ai103-cs4b-email-spotlighting` (1.4.1) + case requirement 2: built on Spotlighting (preview). Requirement 2 now asks to detect and block emails with hidden instructions passed as documents. Statements: DefaultV2 doesn't detect them (No), an Indirect attacks control with Annotate and block does (Yes), User prompt attacks doesn't (No).
- `planning/ai103-cs4a-promo-guardrail` (1.4.1) + case `ai103-cs4a-southridge` requirement 5: built on a guardrail assigned to an agent (preview). gr-promo is now assigned to the chat-main deployment. Statements: DefaultV2 blocks medium and high Violence (Yes), Annotate labels and returns content (Yes), gr-promo can scan Tool call of chat-main (No).
- Series `ai103-sr1-tool-injection` + `-1`, `-2`, `-3` (1.4.1): built on an agent guardrail with Tool response (preview, the Yes answer). Rewritten around an app (PolicyChat) that sends retrieved passages to gpt-main. Solutions: Indirect attacks control and passages passed as documents (Yes); User prompt attacks control (No); Indirect attacks control but passages appended as plain text (No, because User input controls need document embeddings).
- `generative/ai103-2b-tools-endpoint` (2.1.5): explanation said Translation uses `cognitiveservices.azure.com`. Now Document Translation does; Text Translation uses `api.cognitive.microsofttranslator.com`, Speech uses regional endpoints. The answer doesn't change.

## Checked and left unchanged

- Agent types: `ai103-1a-voice-agent`, `ai103-1a-hosted-agent` (workflow agent only as a distractor, explanations still correct).
- Toolbox and tools: `ai103-1a-toolbox-tools`, `ai103-1a-action-tools`, `ai103-1a-client-function` (match the Toolbox page).
- Networking and setup: `ai103-1a-private-network-facts`, `ai103-1a-vnet-region`, `ai103-1a-cosmos-throughput`, `ai103-1b-network-yn` (match configure-private-link and the private networking pages).
- Roles: `ai103-1b-pipeline-role`, `ai103-2b-role-personas`, `ai103-cs4b-team-roles` (match the RBAC matrix).
- Guardrails and safety: `ai103-1c-defaultv2-detections`, `ai103-1c-judge-model-evaluators`, `ai103-1c-adversarial-probing`, `ai103-1c-enforced-tool-limits` (Prohibited Actions only as a distractor), `ai103-2a-eval-safety-pick` (XPIA on a model target, correct), `ai103-cs3c-rag-evaluators` (Response Completeness only as a distractor), `ai103-1b-observability-yn` (continuous evaluation, no preview label).
- SDK and endpoints: `ai103-2b-openai-v1`, `ai103-2b-client-match`, `ai103-2b-api-key-tool`.
- `ai103-1c-agent-red-team-cloud`: the cloud AI Red Teaming Agent has no preview label, and its agentic categories are cloud only (concept page). See below for the preview status of the matching evaluators.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 11 keeps `o3` as a distractor, quiz 14 keeps Task Adherence as a distractor marked preview.

## For a human decision

1. **"Foundry IQ (Azure AI Search)"**: most Search and agent-tool page titles now use this name; the study guide and the RBAC page say Azure AI Search. The chapters, quizzes and bank keep "Azure AI Search". This needs a naming and glossary decision (EN/FR) for the whole certification.
2. **o-series retirement**: the retirement schedule (2026-11-18) retires o3, o4-mini, o3-mini and o1 on 2026-11-19. The reasoning page (2026-11-20) and the models page still list them, and the reasoning page uses o4-mini in its samples. The chapters now avoid them as examples. These bank items still use them, in a stem or as a distractor: `ai103-1a-reasoning-params` (o4-mini deployment), `ai103-2a-o4mini-params` (o4-mini deployment), `ai103-1a-slm-ticket-routing`, `ai103-1a-model-router`, `ai103-1a-image-input-models` (distractors). Also `gpt-image-1` as a distractor in `ai103-1a-media-models`. Decide whether to replace them with GPT-5.x models.
3. **Monitoring preview labels**: the observability page has no preview label; the Agent Monitoring Dashboard marks recurring evaluations, red team scans and alerts as preview. Items whose answer relies on them: `ai103-1b-red-teaming` (scheduled red teaming), `ai103-1b-symptom-tool-dd` (t4 scheduled evaluation), `ai103-1b-safety-evaluators-prod` (Azure Monitor alert part).
4. **Evaluation GitHub Action and Azure DevOps extension (preview)**: they are answers in 1.2.4 items (`ai103-1b-ai-agent-evals-yn`, `ai103-1b-eval-data-json`, `ai103-cs1c-eval-workflow`, `ai103-1b-devops-eval-task`, probably `ai103-1b-cicd-tools-dd`). The objective says "Integrate … with CI/CD pipelines" without naming the action. Kept.
5. **Memory (preview)**: objective 1.1.4 names "memory", so `ai103-1a-memory-facts` and `ai103-1a-memory-and-knowledge` were kept, with memory as the answer.
6. **AI Red Teaming Agent agentic categories**: the red teaming page has no preview label, but the Prohibited Actions and Sensitive Data Leakage evaluators are preview (`ai103-1c-agent-red-team-cloud`).
7. **Search tool roles**: the tool page names the Foundry account's system-assigned MI in its prerequisites and the project MI in troubleshooting. The chapter now states both.
8. **Standard setup roles and Cosmos containers**: the two Learn pages differ (see 12). The chapter follows "Use your own resources".
9. **Not verified**: ch21 "the `/openai/v1` endpoint is the only one that also accepts an API key" (no fetched page says whether Foundry Tools endpoints accept keys); ch13 "Debug sessions"; ch14 preview status of Privileged Monitoring Data Reader protected tables.
10. **Shared case text**: requirement 2 of cs1c, requirement 5 of cs4a, and requirement 2 and Check 4 of cs4b were changed. Only questions of my objectives depend on them. Not checked, other agent's scope: cs4b requirement 1 (personal data in support-agent responses, question `ai103-cs4b-personal-data`, 4.1.2) may rely on an agent guardrail with the PII risk, which is preview.
11. After 2026-12-01, the workflow agent distractors of `ai103-1a-voice-agent` and `ai103-1a-hosted-agent` will name a retired feature.

## French terms not settled (not in the glossary)

« mise hors service » (retirement); « verbalisation d'images »; « évaluations récurrentes », « analyses de red teaming »; « injection réseau » / « injection de réseau virtuel sortante »; « identité d'agent »; « boîte à outils » (toolbox, existing text); « liste de blocage » (blocklist, existing); « taux de défauts » (existing); Azure region names in prose (« USA Est 2 », « France Centre », « USA Centre Nord », « Suède Centre »). « référentiel » was applied for GitHub repositories following the glossary entry for repository (area compute, also_seen « dépôt »); the glossary should confirm it for source-code repositories.
