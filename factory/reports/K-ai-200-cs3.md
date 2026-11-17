# K-ai-200-cs3 — report

3 case studies, 17 questions (validator: 0 problem(s)).

- ai200-cs3a-coho-vineyard (wine producer, App Service custom containers + Cosmos DB for NoSQL + Service Bus topic + Key Vault + OpenTelemetry): 6 questions (1.1.3, 2.1.1, 2.1.2, 3.1.1, 4.1.1, 4.2.1).
- ai200-cs3b-bellows-college (university RAG tutor, Container Apps + KEDA + PostgreSQL pgvector/PgBouncer + Event Grid): 6 questions (1.2.1, 1.2.2, 2.2.3, 2.2.5, 2.2.6, 3.1.2).
- ai200-cs3c-vanarsdel (furniture e-commerce, Azure Managed Redis cache + semantic cache, Functions Python v2, App Configuration, KQL): 5 questions (2.3.1, 2.3.2, 3.2.1, 4.1.2, 4.2.2).

Types: single 6, dropdown 5 (29 %, above the 18–25 % profile range: the code-completion objectives lend themselves to it), multi 2, yesno 2, dragdrop 1, ordering 1. Difficulty 5/9/3.

## Overlap avoided

ai200-cs2a-wideworld (written in parallel) tests ACR Tasks base-image triggers, AKS image pulls, the Service Bus DLQ, the Cosmos DB diskANN vector index, the Cosmos DB trigger with leases and ContainerLogV2 KQL. My first plan overlapped (same company and decisions), so cs3 avoids those decisions entirely.

## Points from general knowledge, not confirmed on a fetched Learn page (low risk)

- App Service exposes custom connection strings with the `CUSTOMCONNSTR_` prefix (cs3a-supplier-key, distractor explanation).
- Azure SDK tracing instrumentation (`azure_sdk`, enabled by default in azure-monitor-opentelemetry) correlates Service Bus send/receive into one distributed trace (cs3a-order-tracing explanation). Note: the Learn "Enable OpenTelemetry" page now recommends the new `microsoft-opentelemetry` distro for new Python apps; the case states the app already uses `azure-monitor-opentelemetry` (no action needed per Learn).
- After `revision set-mode multiple`, traffic still follows the latest revision until weights are pinned, hence the "pin to v1" step (cs3b-release-revisions); inferred from the blue-green page, which pins weights before deploying green.
- `identity: none` as a scale-rule value (distractor only); `queueLength` metadata of the KEDA azure-queue scaler (distractor).
- `@app.route(..., methods=[...], auth_level=...)` parameters and identity-based queue connection `<prefix>__queueServiceUri` (the prefix mechanism is confirmed on the Cosmos DB trigger page; the queue suffix is shown only for AzureWebJobsStorage on manage-connections).
- FT.CREATE vector syntax (standard Redis Query Engine syntax; Learn modules page confirms RediSearch, creation-time only, Enterprise/NoCluster policies).
- Reference title for the AppRequests table page taken as its H1 ("AppRequests").

WebFetch budget (shared) ran out twice during the task; `--scale-rule-identity` CLI syntax could not be verified, so the scaling question uses the YAML/ARM form (`identity: system`) shown on the scale-app page.
