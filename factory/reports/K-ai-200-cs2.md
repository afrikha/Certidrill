# K-ai-200-cs2 — report

3 case studies, 17 questions, all `status: draft`. Validator: `CERT=ai-200 npx tsx factory/validate.ts --prefix ai200-cs2` → 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| ai200-cs2a-wideworld | Freight forwarding; AKS + ACR Tasks + Service Bus + Cosmos DB vector + Functions change feed + Container insights | image-builds (1.1.2 single), image-pulls (1.2.3 single), failed-documents (3.1.1 dropdown), vector-policy (2.1.3 dropdown), change-feed (2.1.4 yes/no), memory-errors (4.2.2 dropdown) |
| ai200-cs2b-trey-research | Pharma research; Container Apps + ACR + PostgreSQL pgvector with Entra auth + Functions Flex Consumption | unique-tags (1.1.1 single), failed-revision (1.2.4 single), entra-connect (2.2.1 dropdown), embedding-index (2.2.3 yes/no), index-memory (2.2.4 single), host-storage (3.2.2 multi) |
| ai200-cs2c-blue-yonder | Airline maintenance; App Service container + Azure Managed Redis + Event Grid custom topic + OpenTelemetry | portal-hosting (1.1.3 dragdrop), answer-cache (2.3.1 dropdown), excerpt-index (2.3.2 single), defect-events (3.1.2 multi), cache-span (4.2.1 dropdown) |

## Deviations

- A first version of case B ("Bellows College", tutor-api, pg-bellows) turned out to be almost identical to `ai200-cs3b-bellows-college` written in parallel. I deleted mine and replaced it with Trey Research. I also changed several decisions after reading cs1/cs3 files, to avoid testing the same decision with the same answer: tag locking (Proseware), RediSearch prerequisites (VanArsdel), HTTP + queue output with a function key (VanArsdel), Redis TTL + delete (VanArsdel/Proseware), App Service pull with a system-assigned identity (Litware), Event Grid filter/TTL/dead-letter (Wingtip, Bellows cs3b), end-to-end tracing (Coho).
- Dropdowns make up 6 of the 17 questions (35 %), more than the bank target (18–25 %), because the case questions test code.

## Facts not fully verified on Learn (left in, high confidence) — please review

- `az containerapp exec` (only used as a distractor), and Container Apps sessions: not used.
- redis-py `getex(key, ex=...)`, `set(..., keepttl=True)`, `set(..., nx=True)`, `getdel` (Redis command semantics; Learn only documents the connection, on port 10000).
- The FT.CREATE syntax (`VECTOR FLAT 6 TYPE FLOAT32 DIM 1536 DISTANCE_METRIC COSINE`) comes from Redis, not Learn; the Learn page confirms FLAT = exact, HNSW = approximate, and COSINE/L2/IP.
- Role names `EventGrid Data Sender` / `EventGrid Contributor`: the Python SDK readme writes "Event Grid Data Sender" (with a space). The built-in role names are written without the space.
- OpenTelemetry span-kind mapping (CLIENT/PRODUCER/INTERNAL → dependencies; SERVER/CONSUMER → requests) is stated on the Learn page in the .NET tab only. The Python tab was not readable.
- The Learn page "Enable OpenTelemetry in Application Insights" now tells Python users to install `microsoft-opentelemetry`, while the azure-monitor-opentelemetry readme (v1.8.12, updated 2026-11-06) is still current. The case uses `azure-monitor-opentelemetry`. The course writers should check which distro the exam expects.
- Cosmos DB: the vector-search page says vector policies can be changed by dropping and re-adding them, while the indexing-policy page says they are immutable. I avoided this point; question vector-policy re-creates the container.
- French terms that I could not check against a fr-fr page: « plan Consommation flexible » (Flex Consumption), « nombre maximal de remises » (max delivery count), « étendue (span) », « hachages » (Redis hashes), « référentiel » (ACR repository; other agents used « dépôt »).

## Note

- The WebFetch budget (shared, 800/hour) ran out once during the task. I waited and went on with fewer calls.
