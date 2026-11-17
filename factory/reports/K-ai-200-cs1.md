# K-ai-200-cs1 — report

3 case studies, 17 questions, all `status: draft`. Validator: `CERT=ai-200 npx tsx factory/validate.ts --prefix ai200-cs1` → 20 files, 0 problem(s).

| Case study | Questions | Domains |
| --- | --- | --- |
| ai200-cs1a-proseware (legal research, Container Apps + PostgreSQL pgvector + Managed Redis + Service Bus) | change-control (multi, 1.2.1), image-lock (single, 1.1.1), search-recall (dropdown sql, 2.2.5), eviction-policy (single, 2.3.1), long-processing (single, 3.1.1), latency-query (dropdown kusto, 4.2.2) | 4 |
| ai200-cs1b-wingtip (toy e-commerce, AKS + Cosmos DB vector search + Functions change feed + Event Grid + App Configuration) | workload-identity (dropdown yaml, 1.2.3), giftfinder-query (single, 2.1.3), ru-tuning (yes/no, 2.1.2), discontinued (single, 2.1.4), restock-events (multi, 3.1.2), catalog-settings (dropdown python, 4.1.2) | 4 |
| ai200-cs1c-litware (wind farms, ACR + App Service + Service Bus topics + Functions + OpenTelemetry) | registry-cleanup (single, 1.1.2), parts-ordering (single, 3.1.1), schedule-crew (dropdown python, 3.2.1), failed-orders (dragdrop, 3.1.1), turbine-attribute (single, 4.2.1) | 3 |

Difficulty: 5 easy, 9 medium, 3 hard. No ordering question in this batch.

## Deviations / overlap with parallel batches

- The cs2/cs3 agents wrote case studies at the same time. I removed or rewrote my first drafts that tested the same decision with the same answer: Container Apps canary ordering (cs3b-release-revisions), KEDA azure-servicebus scale rule (cs3b-ingest-scaling), pgvector HNSW + cosine index (cs3b-vector-index), redis `ex` + `delete` (cs3c-product-cache), Container Apps Key Vault reference (cs2b-db-secret), `--type system` logs (cs2b-failed-revision), unique tags (cs2b-unique-tags), Service Bus default rule (cs3a-order-filters), App Config refresh/sentinel (cs3c-config-refresh), Event Grid dead-lettering (cs3b-event-deadletter), App Service ACR managed-identity pull (cs2c-portal-hosting).
- Remaining partial overlaps to watch: cs1b-ru-tuning vs cs3a-index-consistency (both touch consistency and RU, different statements); cs1b-discontinued vs cs2a-change-feed (both rely on "latest version mode does not capture deletes"; mine tests the soft-delete + TTL fix); cs1a-latency-query vs cs3c-latency-report (both use `percentile(DurationMs, 95)`; mine tests table, binning and grouping).

## Facts not verified on a fetched Learn page (kept because they are standard, or left out)

- OpenTelemetry Python API names (`trace.get_current_span()`, `set_attribute`, `start_as_current_span`, `add_event`): Learn's Python tabs could not be read; these are the standard OpenTelemetry API. The concept (span attributes → customDimensions; a custom span is a separate item) was verified.
- **Doubt for reviewers**: Learn's "Enable OpenTelemetry" page now lists the Python package `microsoft-opentelemetry` ("Microsoft OpenTelemetry Distro") and warns not to initialize both distros. Questions that name the "Azure Monitor OpenTelemetry Distro" / `configure_azure_monitor()` (e.g., cs3a-order-tracing) may need a check. My questions avoid naming the distro.
- Azure Managed Redis eviction policy names `allkeys-random` and `noeviction` (only `volatile-lru` default and `allkeys-lru` were on the fetched page).
- ACR task cron schedules run in UTC (not fetched; all options of cs1c-registry-cleanup use the same cron, so the answer does not depend on it).
- Service Bus duplicate detection discards a repeated message ID within the detection window (distractor explanation only).
- The `hnsw.ef_search` / `WHERE` filter interaction (filter applied to the candidate list) comes from pgvector behavior; the Learn page confirms the parameter and its default of 40.
- Left out because unverifiable: the identity-based connection setting name `<prefix>__fullyQualifiedNamespace` for Service Bus in Functions, the class name `AutoLockRenewer` (the question uses the generic "automatic lock renewal"), and whether all versions and deletes change feed mode is GA.
- The WebFetch budget (shared by all agents) ran out several times during the task.
