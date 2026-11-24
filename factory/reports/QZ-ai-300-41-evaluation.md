# QZ-ai-300-41-evaluation — report

Quiz: `content/ai-300/quizzes/41-evaluation.yaml`, 10 questions (`ai300-qz-41-01` to `-10`). `npx tsx factory/check-quiz.ts ai-300 41-evaluation`: 0 problem(s), 0 warning(s).

| # | Objective | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 4.1.2 | 1 | single | AI-assisted evaluators (coherence, fluency) need a judge deployment |
| 2 | 4.1.3 | 1 | single | Guardrails block, safety evaluators measure (hate_unfairness, share of failed rows) |
| 3 | 4.1.1 | 2 | single | Versioned dataset (`datasets.upload_file`) vs inline `file_content` for CI and audit |
| 4 | 4.1.2 | 2 | single | Coherence and fluency support English responses only |
| 5 | 4.1.3 | 2 | yesno | Ungrounded attributes `true` label, code vulnerability (C#), protected material inputs |
| 6 | 4.1.2 | 3 | hotarea | Groundedness vs relevance trap, predicted from query, context and response |
| 7 | 4.1.1 | 3 | single | Dataset from traces is empty: ingestion delay (30–90 s), not `max_samples` (15 is the synthetic minimum) |
| 8 | 4.1.3 | 3 | single | Severity scale, pass at score ≤ threshold, gate on share of failed rows, not on averages |
| 9 | 4.1.4 | 3 | multi | `jsonl` run on stored responses: no target, no sample fields, only AI-assisted criteria use the judge |
| 10 | 4.1.4 | 3 | dropdown | Agent target run: `azure_ai_target_completions`, `{{item.question}}` input, `{{item.policy}}` context, `azure_ai_agent` |

Mock-exam questions of 4.1.1–4.1.4 (48 files, `ai300-4a-*`, case studies, series) were read first; no scenario or decision with the same answer is reused.

## Pages fetched (November 2026)

rag-evaluators, general-purpose-evaluators, risk-safety-evaluators, textual-similarity-evaluators, cloud-evaluation, cloud-evaluation-datasets, cloud-evaluation-targets, cloud-evaluation-results, evaluation-dataset-schema, evaluation-permissions, traces-to-dataset, observability (concepts).

## Preview features kept out of the correct answers

Preview on Learn: custom evaluators, the `ai-agent-evals` GitHub Action, synthetic data generation, Response Completeness, Groundedness Pro, `builtin.prohibited_actions` and `builtin.sensitive_data_leakage`, the local Azure AI Evaluation SDK. Only distractors mention some of them (Q3 c: Simple QnA). Cloud evaluation, the built-in GA evaluators, targets and traces-to-dataset carry no preview label.

## Chapter vs current Learn (chapter not edited)

1. **Judge model permission.** "Set up permissions for Microsoft Foundry evaluation workflows" says that when an evaluation invokes a model deployment, Foundry User must be assigned at the **Foundry account (resource) scope**; "a project-only role assignment doesn't authorize model inference". The chapter's table says only "Foundry User on the project". Worth adding.
2. **Bring-your-own storage** for evaluations needs Storage Blob Data Contributor for the project managed identity (same page); not in the chapter.
3. **`builtin.indirect_attack`** is listed as "Model only" in the first table of "Risk and safety evaluators" (the other safety evaluators: model and agents). The chapter lists it without restriction.
4. **Initialization parameter name.** The evaluator pages (RAG, general purpose, textual similarity) use `initialization_parameters={"deployment_name": ...}`, while "Evaluate existing datasets…" and "Evaluate model and agent targets…" use `{"model": model_deployment_name}`. The chapter uses `deployment_name` only; the quiz follows the chapter (Q9, Q10). Learn is inconsistent; not tested as such.
5. **Data mapping with standard names.** "Evaluation dataset schema" says `data_mapping` can be omitted when the dataset uses standard columns; "Evaluate existing datasets…" says to include the inputs of each evaluator even with standard names. Contradiction on Learn; not tested.
6. **Groundedness inputs.** Learn: `context` is "optional, recommended", and optional for agent evaluation with `{{sample.output_items}}` when the response contains tool call messages. The chapter says groundedness needs context; true for the string query/response case the quiz uses.
7. **Messages format.** For a model or agent target, the `messages` array must end with a user message (dataset schema page); the chapter doesn't say it.
8. **Textual similarity evaluators** are all GA; F1, BLEU, GLEU, ROUGE and METEOR return 0–1 with a default threshold of 0.5, Similarity 1–5 with threshold 3 (needs a judge). The chapter gives no thresholds for them.
9. Package versions on Learn: `azure-ai-projects>=2.2.0` for cloud evaluation, `>=2.8.0` for data generation from traces. Not in the chapter (fine at exam level).

## Doubts

- Q6 relies on the chapter's exam trap (a correct answer from general knowledge is relevant but ungrounded). Learn defines Relevance as "accuracy, completeness, and direct relevance of the response to the query"; the stem states that every statement is factually correct to remove the accuracy doubt.
- Q7: Learn says a job submitted too quickly "runs against an empty window and produces no samples"; the scenario uses that wording. The Reader prerequisite is stated in the stem so that the managed-identity cause is excluded.
- Not verified: whether the AI Red Teaming Agent is still preview (not used in this quiz).
