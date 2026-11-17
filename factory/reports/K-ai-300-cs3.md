# K-ai-300-cs3 — report

3 case studies, 18 questions (6 each), all `status: draft`. Validator: `CERT=ai-300 npx tsx factory/validate.ts --prefix ai300-cs3` → 21 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| ai300-cs3a-humongous-insurance | Insurance, classic tabular ML + GenAI summaries | workspace-bicep (1.3.2 dropdown), workspace-roles (1.1.4 yes/no), mlflow-laptop (2.1.1 single), rai-components (2.2.3 drag-drop), archive-versions (2.2.4 single), safety-evals (4.1.3 multi) |
| ai300-cs3b-lucerne-publishing | Publishing, RAG on Foundry + Azure AI Search | deployment-types (3.2.1 drag-drop), project-role (3.1.2 single), upgrade-policy (3.2.3 single), token-metrics (4.2.3 dropdown text), tracing (4.2.4 yes/no), similarity-threshold (5.1.1 single) |
| ai300-cs3c-fourth-coffee | Retail, AutoML forecasting + batch scoring + fine-tuning | automl-forecast (2.1.2 dropdown), batch-output (2.3.2 single), datastore-identity (1.1.2 multi), synthetic-data (5.2.2 yes/no), grader-method (5.2.1 single), overfitting (5.2.3 single) |

Difficulty: 4 easy, 11 medium, 3 hard.

## Deviations and overlap avoidance

- The parallel case-study agents (cs2, cs4) had already covered GitHub OIDC, registry promotion, managed-network outbound rules, safe rollout, monitoring signals, hybrid query, chunk overlap, Developer deployment for fine-tuned tests, DPO, `OnceCurrentVersionExpired`, groundedness mapping and the Log Analytics Reader / content-capture tracing points. My first drafts on those topics were replaced so that no case tests the same decision with the same answer (e.g. upgrade policy answer is `NoAutoUpgrade`, fine-tuning method answer is RFT on o4-mini, tracing tests the once-per-resource connection, Contributor to connect and Privileged Monitoring Data Reader).
- No ordering question in this batch.

## Facts that rely on preview or "classic" pages

- `threshold` of kind `vectorSimilarity` (Azure AI Search) is documented for the preview REST API `2026-08-01-preview`; the case states that preview API versions are allowed.
- Synthetic data generation in Foundry is in preview (one reference file per job, 20 MB limit, 50–1,000 samples, optional 80/20 split, Foundry User minimum).
- Tracing facts come from the page "View Trace Results for AI Applications using OpenAI SDK (classic)"; token metric names from "Monitoring data reference for Azure OpenAI (classic)".
- Foundry RBAC roles use the 2026 names (Foundry User, Foundry Project Manager, Foundry Account Owner, Foundry Owner); explanations mention the former Azure AI names where useful.

## Points to double-check at review

- ai300-cs3b-upgrade-policy assumes that a Data Zone Standard deployment belongs to the "Standard deployment types" for which automatic version upgrades apply (Learn says automatic updates are supported only for Standard deployment types, in contrast with provisioned).
- ai300-cs3b-similarity-threshold: Learn's example uses `vectorSimilarity` 0.8 on a cosine field; I read the value as the similarity of the field's metric.
- ai300-cs3a-workspace-bicep: the `hbiWorkspace` description ("reduces diagnostic data collected by the service") comes from the Bicep reference (API 2026-09-01).
- The shared WebFetch budget ran out once during the session; every fact used was fetched afterwards or before.
