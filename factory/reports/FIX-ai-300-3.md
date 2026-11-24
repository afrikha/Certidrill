# FIX-ai-300-3 — chapters 41, 42, 51 and 52 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-300 41-evaluation 42-observability 51-rag-optimization 52-fine-tuning` 0 problems; `content:validate --cert ai-300` 0 problems, 0 warnings; `check-quiz ai-300 41-evaluation 42-observability 51-rag-optimization 52-fine-tuning` 0 problems, 0 warnings.

Every chapter change was made in EN and FR, with the same sections, tables and callouts. No code block changed.

## 41-evaluation

| Finding | Learn | Change |
| --- | --- | --- |
| Judge model permission | Confirmed (evaluation-permissions): when an evaluation calls a model deployment, Foundry User is needed at the Foundry account scope, because "a project-only role assignment doesn't authorize model inference" | Role row of the cloud-evaluation table; workflow sentence (CI identity) |
| Bring-your-own storage | Confirmed (same page): the project managed identity needs Storage Blob Data Contributor on the connected storage account (not used with account-key connections) | Role row |
| `builtin.indirect_attack` is model-only | Confirmed (risk-safety-evaluators: "Model only"; the other safety evaluators cover models and agents) | Safety table, Inputs column |
| `deployment_name` vs `model` init parameter | The evaluator pages (rag, textual-similarity) use `deployment_name`. The QZ report says the dataset and target pages use `model`; I didn't re-fetch those | None. Learn is inconsistent |
| `data_mapping` can be omitted | evaluation-dataset-schema: it can be omitted with standard columns. QZ report: "Evaluate existing datasets" says to include it | None. Learn contradicts itself, and the point isn't tested |
| Groundedness `context` | Confirmed (rag-evaluators): optional and recommended; for an agent, it can come from tool call results. Dataset schema: it is needed when `query` and `response` are strings | Required-fields row, trap sentence and key point reworded ("judged against the context") |
| `messages` must end with a user message for a target | Confirmed (evaluation-dataset-schema) | Messages row of the dataset table |
| Textual similarity thresholds | Confirmed (textual-similarity-evaluators, all GA): F1, BLEU, GLEU, ROUGE and METEOR return 0–1 with a default threshold of 0.5; Similarity returns 1–5 with threshold 3 and needs a judge deployment | Two rows of the quality table |
| Package versions | Not added (no exam value) | None |
| Automation tools (not in the report) | The `ai-agent-evals` GitHub Action page and the azd evaluation page are both marked preview | "(preview)" added to both rows of the automation table |

## 42-observability

| Finding | Learn | Change |
| --- | --- | --- |
| Cost latency | Confirmed: "Analyze Microsoft Foundry costs…" and "Cost and FinOps in Microsoft Foundry" say 8 to 24 hours (usage within minutes). The QZ report says "Monitor model deployments" still says about five hours; I followed the cost pages | Cost bullet |
| "No hard spending limit" | Budgets alert but can't block requests (both cost pages). Foundry cost controls (preview, Manage > Cost) can alert or block requests. AI gateway token limits (Manage > Gateways, GA) cap the tokens a project can use on a deployment | Cost bullet rewritten; key point |
| Cost page renamed | Confirmed: H1 "Cost and FinOps in Microsoft Foundry" (HTML title "Cost and FinOps overview") | Bank reference titles (see below) |
| Cost roles and filters | Confirmed (manage-costs): Cost Management Reader **or Reader** on the resource group or subscription, and no Foundry role shows cost. Budgets and exports need Cost Management Contributor or Contributor (analyze-costs). To isolate Azure OpenAI, filter on **Service tier**. The `agent.name` tag is added from November 2026. The `project` tag doesn't cover Marketplace models or Claude models | Roles and Cost Management bullets |
| Time to Response on Standard | Confirmed (monitor-openai-reference): "Tokens per Second, Time to Response, and Time Between Tokens aren't currently available for Standard deployments" | Sentence after the metrics table |
| Tracing status | Confirmed (trace-agent-setup): GA for prompt, hosted and external agents; workflow agents are preview | Server-side tracing row |
| Monitor tab metrics | Confirmed: the "View agent metrics (preview)" heading | Monitor tab sentence |
| Cost optimization page | Confirmed: cache writes can be billed on GPT-5.6 and later (optimize-costs, prompt-caching). Batch doesn't support fine-tuned models (optimize-costs, batch FAQ). The 50 % batch discount is confirmed by the batch how-to ("50% less cost than global standard") | Prompt-caching and batch rows |
| `llm-emit-token-metric` dimensions | The policy page lists default dimensions (API ID, Operation ID, Product ID, User ID, Subscription ID, Location, Gateway ID, Backend ID) and up to five custom dimensions. It doesn't define "User ID" | Sentence reworded: default dimensions plus up to five custom ones (for example an end-user ID); no claim about what User ID means |
| `ManagedNetworkEvent` category | Confirmed (monitor-openai-reference; export billed, like AzureOpenAIRequestUsage) | New row in the log-category table |
| Playground evaluations on by default | Confirmed (concepts/observability: "enabled by default … included in consumption-based billing"; turn off under metrics) | None |
| `FineTunedTrainingHours` | Confirmed (monitor-openai-reference: "Processed FineTuned Training Hours") | None |

## 51-rag-optimization

| Finding | Learn | Change |
| --- | --- | --- |
| Product name "Foundry IQ (Azure AI Search)" | Confirmed: chunking page H1 | None. Naming is the owner's decision |
| Threshold exam trap | Confirmed (vector query page): a `vectorSimilarity` threshold filters before fusion; Learn recommends a minimum threshold only on a pure single vector query, because RRF ranges are small and volatile. Still preview (`2026-08-01-preview`) | Trap reworded: "remove everything" now applies to a cut-off on the fused score, and the vector threshold is said to filter only vector results before fusion |
| Embedding model migration | Confirmed (migration guide). The points: a field's dimensions can't change; equal dimensions don't make two models compatible; a vectorizer change doesn't regenerate vectors; raw scores can't be compared across models; built-in indexers need a rebuild into a new index; a second vector field works only with push ingestion; Cohere Embed v3 was deprecated on 15 Nov 2026 and retires on 15 Feb 2027 (replaced by v5-fast / v5-pro) | New paragraph in embedding-models |
| Compare view legend | Confirmed (evaluate-results): Degraded Strong/Weak, Changed Strong/Weak, same p bands | A/B step 4 |
| Overlap rule, Text Split `unit` | The overlap rule is on the chunking page. The `unit` parameter isn't in the chapter | None |
| API versions | Chunking page: Content Understanding semantic chunking is GA in REST `2026-10-01`. The vector query page still shows `2026-04-01` in its GA examples. The chapter names only the preview version for thresholds | None |
| Separate embedding deployments | Confirmed (Azure OpenAI Embedding skill: "ideally separate" from the query vectorizer's deployment) | Sentence after the skill paragraph |
| HNSW `efSearch` claim | **Not confirmed**: neither vector-search-ranking nor vector index creation states the effect of `efSearch`/`efConstruction` on recall or latency. They give the defaults (m 4, efConstruction 400, efSearch 500) and say the parameters tune "recall, latency, memory, and disk footprint" | Lever row reworded to what Learn says |
| RBAC page "(classic)" | Role name Cognitive Services OpenAI User confirmed on the skill page | None |

## 52-fine-tuning

| Finding | Learn | Change |
| --- | --- | --- |
| Overview title | Confirmed: "Training in Microsoft Foundry" | Bank reference titles (see below) |
| Open models | Confirmed (overview): SFT also supports Llama-3.3-70B-Instruct, Qwen3-32B, gpt-oss-20b and Ministral-3B (plus preview models). RFT: o4-mini, gpt-5 by invitation, open models in preview only. DPO: OpenAI models only. Support for one method doesn't carry over to another | Methods table and its lead sentence |
| DPO billing | Confirmed (fine-tuning-cost-management): SFT and DPO use token-based billing, tokens × epochs × price | DPO row; key point |
| Canceled runs, service errors, grader tokens | Confirmed (same page) | Billing paragraph |
| "Both losses stay high" | Not on Learn (the SFT page only says to look for a decreasing training loss and to inspect failing validation examples when validation loss rises) | Action reworded to Learn's data-quality guidance (overview: accurate, consistent, representative; missing scenarios, duplicates). "Inspect failing validation examples" added to the overfitting row. The pattern row itself is kept: flag |
| RFT grader testing | RFT how-to: correct, incorrect and malformed answers; superficial answers must not score high. The overview says "adversarial". Also: `cosine` is for evaluations, not RFT. More `text_similarity` metrics (gleu, meteor, rouge_1–5) | Grader table and reward-hacking row |
| Data Zone Standard deployment | Confirmed (overview: US only, per-token billing) | Replaces the "Global Provisioned / imported custom models" row. That row isn't on the overview (whose list of five types is the reference), on the cost page or on the deployment-types page. Lifecycle step 5 now lists Data Zone Standard |
| Deployment options | Fireworks on Foundry (preview) is on the deploy page only | None |
| Role renames | Confirmed (SFT page) | None (the chapter already uses Foundry names) |
| Synthetic data | The fine-tuning page lists only Simple Q&A and Tool use (still preview); the chapter matches. "Simulation seed" exists on the synthetic **evaluation** page (chapter 41), so `ai300-5b-prelaunch-eval-data` is correct | None |
| `FineTunedTrainingHours` | Confirmed (monitor-openai-reference) | None |

## Mock-exam bank questions changed (21 in content, plus reference titles in 14 more files)

Facts corrected:

- `quality/ai300-4b-budget-no-hard-cap` (explanation EN + FR, option c explanation, reference title). Budgets can't block requests; Foundry cost controls (preview) can, but they keep their own running total, which isn't reconciled with the bill. So they don't act on "the actual monthly cost" in the stem. The answer doesn't change.
- `quality/ai300-4a-aw-ci-auth`: option d moved Foundry User from "for the Foundry project" to "on the Foundry resource". The `ai-agent-evals` action calls a judge deployment, and a project-only assignment doesn't authorize inference. The explanation was updated in EN and FR.
- `quality/ai300-cs1b-latency-metrics`, `quality/ai300-4b-latency-metrics-match`, `quality/ai300-4b-latency-alert-order`: the stems now say the deployment is provisioned. Time to Response and Time Between Tokens aren't available on Standard deployments, and the deployment type wasn't stated (no case-study file edited).
- `quality/ai300-4b-throughput-hotarea`: the explanation adds that Tokens Per Second and Time to Response aren't available for Standard deployments (chat-std is Standard).
- `quality/ai300-4b-ptu-billing-yesno`: the stem now says "a Standard deployment of a fine-tuned model". Statement s3 (hourly hosting fee) would be false for a Developer deployment. The explanation was updated.

Preview correct answers rewritten. Each keeps its id, type, objective and difficulty, and now has a GA answer:

- `ai300-4a-rs-agent-risks` (4.1.3): the answers were prohibited_actions and sensitive_data_leakage, both preview. Now: hate_unfairness + self_harm on an agent. Indirect attack (model only) and sensitive data leakage are distractors.
- `ai300-4a-rs-risk-dd` (4.1.3): target t4 was sensitive_data_leakage. It now maps to violence.
- `ai300-4a-qm-completeness` (4.1.2): the answer was Response Completeness (preview). It is now Similarity (meaning vs wording, judge model); ROUGE is a distractor.
- `ai300-4a-qm-scales-yn` (4.1.2): s3 was about Groundedness Pro (preview). It now says F1 returns 0–1 without the judge (Yes).
- `ai300-cs2b-quality-evaluators` (4.1.2): Response Completeness became ROUGE (recall against the reference summary), for case requirement 6.
- `ai300-5a-rag-evaluator-map` (5.1.4): the Response Completeness target was replaced by Retrieval (context vs query, 1–5, no labels).
- `ai300-4a-ds-synthetic-new-agent` (4.1.1): the question was about synthetic generation (preview). It now tests the target-run rule: the `messages` array must end with a user message.
- `ai300-4a-ds-synthetic-portal-order` (4.1.1): the synthetic portal flow (preview) became the "From traces" portal flow (sampling, preview rows, start the evaluation).
- `ai300-4b-monitor-alerts` (4.2.1): the answer was Monitor-settings Alerts (preview). It is now an Azure Monitor metric alert on Model Availability Rate.
- `ai300-4b-project-chargeback` (4.2.3): the answer was the `project` tag (preview). It is now the Service tier = Azure OpenAI filter, and the project tag is a distractor.
- `ai300-5a-text-recall-size` (5.1.3): `hybridSearch.maxTextRecallSize` / `countAndFacetMode` (preview) became multi-field `fields`, `exhaustive: true` and `select` (GA, verified on the vector query and vector ranking pages).
- `ai300-5b-programmed-training` (5.2.1): the answer was Programmed Training (preview). It is now SFT on Llama-3.3-70B-Instruct; the distractors are RFT/DPO combinations that aren't supported or are preview.
- `ai300-5b-deploy-option-dragdrop` (5.2.4): Managed compute and Fireworks (preview) were replaced by Data Zone Standard vs Global Standard for fine-tuned models. Global Batch is a distractor (doesn't support fine-tuned models).
- `ai300-5b-managed-compute-prereqs` (5.2.4): the Managed compute (preview) prerequisites became serverless deployment prerequisites (Foundry Owner or `deployments/write`, plus quota). The Managed compute and Fireworks prerequisites are distractors.

Reference titles updated, URL unchanged:

- "Fine-tuning in Microsoft Foundry" became "Training in Microsoft Foundry" in 15 files of 5.2.x.
- "Plan and manage costs for Microsoft Foundry" became "Cost and FinOps in Microsoft Foundry" in `4b-budget-no-hard-cap`, `4b-ptu-billing-yesno` and `4b-cost-analysis-meters`.
- Out of scope, not changed: `genaiops/ai300-3b-finetune-reasons` and `ai300-3b-finetuned-eval-tier` (objective 3.2.2) still use the old title.

## Checked and left unchanged

- `ai300-4a-qm-groundedness-inputs`: response + context is still right for stored string rows.
- `ai300-4a-rs-xpia`: a model deployment, so indirect attack fits.
- `ai300-4a-rs-red-team`, `-rs-red-team-cloud`, `ai300-4b-lifecycle-stages`: the AI Red Teaming Agent page has no preview label.
- `ai300-5a-rrf-score-filter`: consistent with the reworded threshold trap.
- `ai300-4b-ptu-429-metric`: Global Provisioned, not fine-tuned.
- `ai300-5b-deployment-type-dragdrop`, `ai300-5b-rft-spending-limit`, `ai300-5b-reward-hacking`, `ai300-4b-batch-*`, `ai300-4b-prompt-caching`, `ai300-4b-cost-analysis-meters`.
- The HNSW questions (`5a-chunk-context`, `5a-embedding-skill-config`) don't rely on the `efSearch` effect.

## Quiz files

None changed. The four quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

1. **Preview features kept because the objective names them.**
   - 5.1.1 "similarity thresholds": `ai300-5a-vector-threshold`, `ai300-cs3b-similarity-threshold`.
   - 5.2.2 "synthetic data": `ai300-5b-prelaunch-eval-data`, `-sdg-real-gap`, `-dataset-statements`, `-sdg-tool-use`, `-sdg-workflow-order`, `-sdg-wizard-settings`, `-synthetic-test-leakage`, `ai300-cs3c-synthetic-data`.
   - 4.1.4 "custom evaluation metrics" (custom evaluators are preview): `ai300-4a-aw-code-evaluator`, `-aw-code-limits-yn`, `-aw-custom-name-fix`, `-aw-prompt-evaluator`, `-aw-sdk-order`, `ai300-cs1b-custom-evaluators`, `ai300-5b-multi-grader-json`.
2. **Preview tools with no clear GA equivalent in the exam's framing. Not rewritten; please decide.**
   - The `ai-agent-evals` GitHub Action and the azd evaluation extension are both preview on Learn: `ai300-4a-aw-gh-action`, `-aw-ci-auth`, `-aw-pr-gate`, `ai300-5a-gha-variant-compare`. A Learn training module on GitHub Actions evaluation appears in search, but I didn't fetch it.
   - Client-side tracing is preview: `ai300-4b-azure-monitor-export-code`, `-console-exporter`, `-span-processor-session`, `-trace-function-content`, `-tracing-env-yesno`, `-continuous-eval-setup-order`, `ai300-cs2b-tracing-code`, `ai300-cs4b-tracing`.
3. **`ai300-cs2c-chunking-split`** uses the Text Split `azureOpenAITokens` unit (preview). The case study's requirement 1 explicitly allows preview features in the indexing pipeline, so it was kept.
4. **`ai300-4b-scheduled-vs-continuous`**: Learn labels "Recurring evaluations (preview)" in the Monitor settings. The concepts page recommends scheduled evaluation for drift with no label. This is ambiguous, so the question is unchanged. The chapter already says preview.
5. **Learn inconsistencies**:
   - `deployment_name` vs `model` initialization parameter;
   - `data_mapping` omission;
   - cost latency: 8–24 h on the cost pages vs about five hours on "Monitor model deployments", per the QZ report;
   - grader testing: "adversarial" on the overview vs "malformed" on the RFT page (the chapter now names both).
6. **Not verified, left in the chapters**:
   - 52: "Standard serverless deployments … East US 2, North Central US, Sweden Central". No fetched page lists the regions.
   - 52: the pattern "both losses stay high → not learning".
7. **Product name** "Foundry IQ (Azure AI Search)": the chapters, quizzes and bank still say "Azure AI Search".
8. **French terms not in the glossary**:
   - « contrôles des coûts (cost controls) »;
   - « limites de jetons de la passerelle IA (AI gateway) »;
   - « stockage personnel (bring-your-own storage) »;
   - « ingestion par envoi (push) »;
   - « dépréciés » / « mis hors service »;
   - « réponses mal formées »;
   - « déploiement approvisionné » (provisioned, already used in chapter 42);
   - « vectoriseur ».

   The bank mixes « modèle affiné » (`4b-ptu-billing-yesno`) and « modèle ajusté » (chapters and most of the bank). This wasn't harmonized.
