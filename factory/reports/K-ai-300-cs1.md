# K-ai-300-cs1 — report

## Files
- `content/ai-300/case-studies/ai300-cs1a-relecloud-bank.yaml` (retail bank, card fraud: Azure ML pipeline + managed feature store + online endpoint + model monitor + Event Grid, plus a Foundry agent whose prompt moves to Git) — 6 questions:
  `ai300-cs1a-env-conda` (1.2.2, single, 1), `ai300-cs1a-pipeline-bindings` (2.1.7, dropdown yaml, 2), `ai300-cs1a-feature-spec` (2.2.1, single, 2), `ai300-cs1a-precision-signal` (2.4.2, dropdown yaml, 2), `ai300-cs1a-retrain-trigger` (2.4.3, single, 3), `ai300-cs1a-prompt-git` (3.3.3, multi, 1).
- `content/ai-300/case-studies/ai300-cs1b-vanarsdel.yaml` (law firm, network-isolated Foundry + Azure AI Search RAG app on App Service, model router batch workload, custom evaluators) — 6 questions:
  `ai300-cs1b-foundry-bicep` (3.1.4, dropdown bicep, 2), `ai300-cs1b-private-access` (3.1.3, multi, 2), `ai300-cs1b-triage-router` (3.2.2, dropdown text, 2), `ai300-cs1b-custom-evaluators` (4.1.4, dragdrop, 2), `ai300-cs1b-latency-metrics` (4.2.2, yes/no, 1), `ai300-cs1b-ab-retrieval` (5.1.4, single, 3).
- `content/ai-300/case-studies/ai300-cs1c-trey-research.yaml` (medical imaging research: multi-node GPU training, Bayesian sweep, MLflow comparison and registration, RAG embedding choice) — 6 questions:
  `ai300-cs1c-gpu-cluster` (1.1.3, single, 2), `ai300-cs1c-distributed-job` (2.1.6, dropdown yaml, 2), `ai300-cs1c-sweep-bayesian` (2.1.4, dropdown yaml, 3), `ai300-cs1c-best-runs` (2.1.8, single, 2), `ai300-cs1c-register-model` (2.2.2, single, 1), `ai300-cs1c-embedding-choice` (5.1.2, yes/no, 1).
- Difficulty: 5 easy, 10 medium, 3 hard. Objectives chosen among those not yet tested by cs2–cs4 case studies.
- Woodgrove and Proseware are already used by the sr1 series, so the cases use Relecloud, VanArsdel and Trey Research (unused in AI-300).

## Deviations and doubts
- Dropdowns are 6/18 (33 %), above the bank target, because the case questions are code-heavy; singles 7, multi 2, yes/no 2, dragdrop 1, no ordering (an Event Grid ordering was dropped: provider registration and Logic App creation have no defined order).
- `ai300-cs1c-gpu-cluster`: the distributed training page still cites `Standard_NC24rs_v3` as its InfiniBand example, but the NCv3 sizes are retired (NC24rs_v3 retirement page on Learn). The question uses `Standard_ND96isr_H100_v5` (8 H100, InfiniBand, fetched size page) and the NCads_H100_v5 series (1–2 GPUs) as distractor. The course chapter 21 still shows `Standard_NC24rs_v3`: the course owner may want to update it.
- `ai300-cs1c-sweep-bayesian`: whether Bayesian sampling supports early termination isn't stated on the fetched page, so it isn't tested.
- `ai300-cs1a-retrain-trigger`: the signal-level Event Grid filter value format (`<monitor-name>_<signal-description>`) is ambiguous on Learn; the options only say "a filter on the signal name".
- `ai300-cs1a-precision-signal`: `tabular_classification`, `data_context: ground_truth` verified on the model performance page; distractor keys (`numerical`, `categorical`, `classification`, `training`, `validation`) are real keys/values used elsewhere in monitor YAML.
- `ai300-cs1b-foundry-bicep`: API version 2025-06-01 verified for `accounts` and `accounts/projects`; the template reference doesn't enumerate `kind` values, so `AIServices` comes from the Foundry docs and the distractor explanations only say the other kinds aren't the Foundry kind.
- `ai300-cs1b-triage-router`: the case states that the three approved models are available to model router in Sweden Central (premise, not a verified regional fact). Model router supports only Global Standard and Data Zone Standard (fetched page); the router regions list includes Sweden Central for both.
- `ai300-cs1a-prompt-git`: references are Learn training module units (no docs article covers prompt versioning in Git).
- French: Git tag translated « balise Git » (« étiquette » kept for model/Azure tags).
