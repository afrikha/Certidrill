# C-gcp-pca-3 — report

Chapters written (English only): `23-compute-systems`, `24-ai-ml-platform`, `31-security-design`, `32-compliance` in `content/gcp-pca/course/chapters/`. Check: `npx tsx factory/check-cert.ts gcp-pca 23-compute-systems 24-ai-ml-platform 31-security-design 32-compliance` → 0 problems; `npm run content:validate -- --cert gcp-pca --course --chapters ...` → 0 problem(s), 101/101 objectives covered.

## Length

- `wc -w` including code and tables: 23 = 2,666, 24 = 2,388, 31 = 2,784, 32 = 1,825. Prose of 23, 24 and 31 is a little above the 2,200-word guideline (31 covers 9 objectives). Trim in review if needed.

## Facts verified on docs.cloud.google.com (2026-11-27) that changed recently

- Vertex AI → Gemini Enterprise Agent Platform (announced April 22, 2026). Names confirmed on docs: Agent Platform Pipelines, Agent Platform ML Metadata, Agent Platform Experiments, Agent Platform Feature Store, Agent Runtime, Agent Studio, Model Garden, Colab Enterprise. Vertex AI Search → **Agent Search** (API still Discovery Engine). The page "Name changes from Vertex AI" could not be fetched (client error), so names such as "Model Registry" and "endpoint" are used without an "Agent Platform" prefix.
- NotebookLM Enterprise is presented in the docs as **Gemini Notebook Enterprise / Gemini Notebook for business**; the exam guide still says NotebookLM. The chapter uses "NotebookLM Enterprise (named Gemini Notebook Enterprise in the current documentation)".
- Gemini Enterprise no-code agent builder is named **Workflow Builder** on the agents overview page (not "Agent Designer").
- IAM basic roles are now **Admin / Writer / Reader** (`roles/admin`, `roles/writer`, `roles/reader`); Owner/Editor/Viewer are "legacy basic roles" that do not support IAM Conditions. Question writers should take this into account.
- CSEK for Compute Engine is deprecated (Cloud Storage only).
- Cloud Deployment Manager reached end of support March 31, 2026 (page also mentions April 1, 2026 and extensions to March 31, 2027; turndown after June 30, 2027).
- GKE "no channel" deprecated, removed June 14, 2027. SCC Enterprise tier deprecated, shuts down May 21, 2027.
- Log Analytics appears as **Observability Analytics** on the routing page.
- Disable SA key creation: the constraints page shows the managed `constraints/iam.managed.disableServiceAccountKeyCreation`; the legacy boolean name was not seen and is not used.

## Open doubts

- Spot VM 120-second preemption notice (`--preemption-notice-duration`): documented, but launch stage (GA or Preview) not stated on the page fetched. Mentioned in one sentence only; the exam classic (about 30 s shutdown period) is kept as the main fact.
- Cloud Run GPU: RTX PRO 6000 is documented next to L4 without a launch stage; the chapters only cite L4 as an example.
- The Gemini model list page shows version names that could not be cross-checked; the chapters name no Gemini version.
- Model Garden org policy constraint is still named `constraints/vertexai.allowedModels` on the constraints page.
- Cloud Asset Inventory history duration not verified: stated without a figure.
