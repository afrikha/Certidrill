# Q-gcp-pca-2b — report

44 questions in `content/gcp-pca/questions/provisioning/`, prefix `gcppca-2b-`, 4 per objective (2.3.2–2.3.6, 2.4.1–2.4.3, 2.5.1–2.5.3).
Types: single 35, multi 9. Difficulty: 9 easy / 22 medium / 13 hard. Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-2b-` → 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-2b-` → 0 problems, 0 warnings.

## Names that changed (checked on docs.cloud.google.com, 2026-11-27): other agents should apply them too

- Vertex AI docs now redirect to **Gemini Enterprise Agent Platform** (`/gemini-enterprise-agent-platform/...`): "Agent Platform Pipelines", "Agent Platform ML Metadata" (the caching page still says "Vertex ML Metadata"), "serverless training" (was custom training), "Agent Studio", "Agent Platform User" role, "Agent Runtime" (was Agent Engine), "Agent Platform Vector Search".
- **Cloud Composer → Managed Service for Apache Airflow** ("Managed Airflow").
- **Vertex AI Search → Agent Search** (the docs say "is being renamed"; console still shows AI Applications).
- **NotebookLM Enterprise → Gemini Notebook for business / Gemini Notebook Enterprise**. The IAM role is still named "Cloud NotebookLM User". The exam guide still says "NotebookLM": questions use the current docs name.
- Gemini Enterprise: no-code agent builder is now **Workflow Builder** (not Agent Designer); custom ADK agents are hosted on Agent Runtime and registered by admins; Agent Registry exists for A2A agents.
- Lineage graphs: "Knowledge Catalog" appears on the Pipelines page (Dataplex rename?), not used in questions.

## Deprecations used as decisive facts

- **Video Intelligence API**: deprecated 14 Sept 2026, shutdown 14 Sept 2027, Google recommends Gemini models (gcppca-2b-video-analysis-gemini).
- **Feature Store optimized online serving**: deprecated, no new features after 17 May 2026, sunset 17 Feb 2027 (gcppca-2b-feature-store-bigtable-serving).
- **Cloud Deployment Manager**: end of support 31 March 2026 (distractor in gcppca-2b-infrastructure-manager-terraform).

## Doubts / deliberately avoided

- Spot VMs page now describes a configurable **preemption notice** (0 s default, 120 s option) plus a best-effort 30 s shutdown period; launch stage not stated, so no question relies on notice durations (the classic "30-second notice" is no longer accurate as stated).
- GKE "No upgrades" maintenance exclusion: the page now says max **90 days** (less than 30 recommended). Not used as a decisive number.
- Cloud Run worker pools: the deploy page says they "do not support autoscaling", while the resource-model page lists CPU, Pub/Sub backlog and external-metric scaling. Only "fixed number of instances" is used.
- GKE regional clusters: the page only says a regional cluster cannot be changed to zonal; the reverse was not claimed.
- RAG Engine launch stage varies by region (GA, allowlist, Preview): used only as a distractor.
- Model Garden organization policy: the constraint name is not given on the page, so the question names the control generically ("Model Garden organization policy").
- Gemini Enterprise federation: confirmed for SharePoint Online (separate federation and ingestion pages exist); federation support for other connectors not checked.
- Cloud TPU intro page says "The Cloud TPU API is deprecated" without detail: not used.
- Mistral AI is used as the example partner model (2.5.3) to avoid naming other vendors' models.
