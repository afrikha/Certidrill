# K-ai-300-cs4 — report

## Files
- `content/ai-300/case-studies/ai300-cs4a-coho-winery.yaml` (viticulture, classic ML: dev/prod workspaces + registry, batch and online endpoints, model monitoring, Foundry batch deployment) — 6 questions:
  `ai300-cs4a-data-asset` (1.2.1, dropdown), `ai300-cs4a-github-workflow` (1.3.3, dropdown), `ai300-cs4a-registry-share` (1.2.4, single), `ai300-cs4a-nightly-scoring` (2.3.1, multi), `ai300-cs4a-monitor-signals` (2.4.1, dragdrop), `ai300-cs4a-catalog-deployment` (3.2.1, single).
- `content/ai-300/case-studies/ai300-cs4b-margies-travel.yaml` (online travel agency, RAG assistant: Foundry + Azure AI Search + App Service + Application Insights) — 5 questions:
  `ai300-cs4b-search-access` (3.1.2, single), `ai300-cs4b-eval-mapping` (4.1.1, dropdown python), `ai300-cs4b-tracing` (4.2.4, yes/no), `ai300-cs4b-hybrid-query` (5.1.3, dropdown json), `ai300-cs4b-chunk-overlap` (5.1.1, single).
- Difficulty: 2 easy, 7 medium, 2 hard.

## Deviations and doubts
- PTU spillover was first planned for cs4b but dropped: the series `ai300-sr2-ptu-bursts` already tests that decision.
- `ai300-cs4a-catalog-deployment`: the Batch page states the 50 % discount relative to Global Standard; Data Zone Batch is assumed cheaper than Data Zone Standard and Standard (same discount logic in the deployment types page). The case text fixes which deployment types are available in Sweden Central for the chosen model, so no regional availability fact is claimed.
- `ai300-cs4b-tracing`: the documented content-capture variable (`OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT`, default false) comes from the client-side tracing page written for Foundry agents; the case app calls the model through `azure-ai-projects`.
- `ai300-cs4b-hybrid-query`: `kind` slot has only two options (`text`, `vector`), the only VectorQueryKind values in the 2026-10-01 REST reference.
- Reference titles: some Learn pages only exposed their HTML title (Text Split skill, Enable RBAC, general purpose evaluators); those titles were used.
