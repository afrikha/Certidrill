# FIX-ai-200-1 — chapters 11, 12, 21, 22 and 23 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-200 11-container-hosting 12-container-orchestration 21-cosmos-db 22-postgresql 23-managed-redis` 0 problems; `content:validate --cert ai-200` 0 problems, 0 warnings; `check-quiz ai-200` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. One code block was removed in both languages (the `EnableNoSQLVectorSearch` command in 21). No other code block changed.

## 11-container-hosting

| Finding | Learn | Change |
| --- | --- | --- |
| "A service principal is no longer supported for image pull" | Confirmed only for **Windows** container image pull; managed identity is recommended for Windows and Linux (configure-custom-container) | App Service section: sentence narrowed to Windows |
| `az webapp exec` shown as a normal command | Confirmed preview; the browser terminal isn't marked preview. `az webapp exec --shell` can use another shell such as `/bin/sh` (configure-custom-container) | Logs and shell paragraph: "(preview)" and the `--shell` detail |
| Sidecars: ports 80/8080, container-specific variables, `WEBSITES_PORT` | Confirmed: only ports 80 and 8080 for external HTTP traffic, each container on a unique port (overview-sidecar); container-specific variables can override shared ones; `WEBSITES_PORT` and `DOCKER_REGISTRY_SERVER_*` "don't apply for sidecar-enabled apps" (configure-sidecar) | Several containers paragraph: two sentences. Key point on `WEBSITES_PORT` qualified |
| (found while checking) `WEBSITES_PORT` isn't an environment variable | Confirmed: "isn't injected into the container as an environment variable" (reference-app-settings) | Settings table, `WEBSITES_PORT` row |
| ABAC repository permissions: which tiers | Confirmed: all three tiers (container-registry-skus) | Roles paragraph: "(available on every tier)" |
| Content trust listed as Premium on the SKU page | The chapter doesn't mention it; no question relies on it | None |
| FR « étiquette » for image tags | Writing guide: « balise ». Glossary: « référentiel » for repository | FR: « balise stable / unique / mobile », « manifestes non balisés » (the AI-200 bank's form), « Stratégie de balisage », « référentiel(s) » for ACR repositories (« dépôt » kept for Git repositories) |

## 12-container-orchestration

| Finding | Learn | Change |
| --- | --- | --- |
| Revision name `<app>--<suffix>` vs `<app>-<suffix>` | **Learn disagrees with itself.** revisions (2025-10-27) gives `<CONTAINER_APP_NAME>-<REVISION_SUFFIX>`, example `album-api-first-revision`, and forbids `--` in the suffix. traffic-splitting (2025-06-16) uses `my-example-app--5g3ty20`, `myapp--knowngoodrevision`. The CLI reference uses only placeholders | None. Needs a human decision (the chapter, 14 bank and case-study files and quiz 12 use `--`) |
| "Labels (preview)" mode | Confirmed: the mode is "Deployment labels (preview)"; labels in multiple mode and the `revision label` commands are GA | Mode row renamed "Deployment labels (preview)" / « Étiquettes de déploiement (préversion) » |
| `--max-inactive-revisions` is preview | Confirmed ("Change inactive revision limit (preview)") | Sentence after the commands |
| `--attach-acr` permissions | Learn: Owner, Azure account administrator or co-administrator on the subscription; Terraform section: Owner or User Access Administrator | None (the chapter's "Owner or another role that can assign roles" is the safer wording) |
| Secret names limited to 20 characters | Not on manage-secrets or quotas | Removed from the `--secrets` row |
| Scale-down step and TCP rules in the portal | Confirmed: KEDA removes 100 % of the replicas that must shut down; TCP scale rules can't be configured in the portal (scale-app) | Scaler table: new row; TCP rule row |
| FR « étiquette » for an image tag, « dépôt » | Same rules as 11 | « Image ou balise erronée », « autorisations de référentiel ABAC » (Kubernetes and revision labels stay « étiquettes ») |

## 21-cosmos-db

| Finding | Learn | Change |
| --- | --- | --- |
| Step "enable `EnableNoSQLVectorSearch`" | Confirmed obsolete: "enables vector indexing and search by default. You don't need to register the feature or enable an account capability" (vector-search, 2026-08-05; Python how-to, 2026-11-17) | Step 1 and its command removed; replaced by one paragraph; steps renumbered; key point rewritten |
| Hierarchical partition keys | Confirmed: contact the Cosmos DB team to configure the account | Same paragraph |
| Changing vector policies | **Learn inconsistent**: vector-search says you can add or remove paths, and drop then re-add a policy or index to change it; the Python how-to says both policies must be set at creation and "can't be modified later", new containers only | None (the trap already says drop and re-add, or create a new container). Needs a human decision |
| "Can't be disabled once enabled" (checked because of the step removal) | Confirmed (vector-search, Current limitations) | Kept |
| `float16` halves storage with some accuracy loss | Confirmed ("reduce the storage footprint of vectors by 50%, however some reduction in accuracy may result") | None |
| Python request charge | Learn (find-request-unit-charge, 2026-04-27) shows `container.client_connection.last_response_headers["x-ms-request-charge"]`; `get_response_headers()` isn't on Learn | Response headers row now uses Learn's form ("last operation") |
| Default consistency Session | Confirmed ("the default level applied to Azure Cosmos DB accounts", how-to-manage-consistency) | None |
| More instances than leases | Learn: instances shouldn't exceed leases | None |

## 22-postgresql

| Finding | Learn | Change |
| --- | --- | --- |
| DiskANN product quantization is preview | Confirmed: "Scale efficiently with Quantization (Preview)", pg_diskann 0.6+; the 16,000-dimension support is a subsection of it. `diskann.iterative_search` and the rest of the page aren't marked preview | Index table DiskANN row, 2,000-dimension bullet and key point: "(preview)" |
| `dimensions` argument of `create_embeddings` | Confirmed: `integer DEFAULT NULL`, text-embedding-3 and later, azure_ai 1.1.0+ (the signature blocks on the page omit it) | Paragraph after the SQL block; `retry_delay_ms` default 1,000 added |
| azure_ai with managed identity | Confirmed: `azure_openai.auth_type` = `managed-identity`, server system-assigned identity, Cognitive Services OpenAI User (generative-ai-azure-overview, generative-ai-enable-managed-identity-azure-ai) | One sentence in the same paragraph. See human decisions (preview?) |
| `hnsw.ef_search` "about 20 for latency-critical calls" | Not on Learn (training unit: 40 default, 100-200 for accuracy, at least `LIMIT`) | Replaced by "lower it for latency-critical calls, but not below `LIMIT`" |
| `LISTEN`/`NOTIFY` and `PREPARE` in transaction mode; who can create extensions; psycopg `with` commits; `GRANT` after `pgaadauth_create_principal` | Not confirmed (how-to-allow-extensions covers only the allowlist; other points are PostgreSQL, psycopg or PgBouncer behavior) | None |

## 23-managed-redis

| Finding | Learn | Change |
| --- | --- | --- |
| RediSearch: Enterprise only, or Enterprise and non-clustered | **Learn disagrees**: architecture (2026-08-18) says Enterprise is the only policy; redis-modules (2026-11-17, more recent and specific) says Enterprise or non-clustered | None (the chapter follows redis-modules, per the "most specific, most recent" rule) |
| Redis 8.2 (preview) includes every module | Confirmed: in-memory tiers; the "enable at creation, can't add later" rule is stated "with Redis 7.4" (redis-modules) | Module sentence qualified "With Redis 7.4", 8.2 preview in parentheses; key point "(Redis 7.4)" |
| High availability on and off | Confirmed: can't be disabled on an existing instance, can be enabled later; non-HA only for dev and test (architecture) | HA paragraph: one sentence |
| Non-clustered policy only up to 25 GB | Confirmed (architecture) | Client class row |
| Flash Optimized preview | Confirmed only for the A2000 and A4500 sizes (architecture, overview); the training unit calls the whole tier preview | Flash Optimized row: "sizes A2000 and A4500 in preview" |
| 15,000 connections for the smallest Balanced size | Confirmed: 0.5 GB and 1 GB Balanced sizes show 15,000 (overview) | None |

## Mock-exam bank questions changed

- `questions/containers/ai200-1a-app-settings-statements.yaml` (1.1.3): the stem combined a sidecar with `WEBSITES_PORT` and `DOCKER_REGISTRY_SERVER_*`, which don't apply to sidecar-enabled apps (configure-sidecar). The sidecar was removed from the stem (EN + FR). Option e (about sidecars) became "Each app setting must also be declared with an ENV instruction in the Dockerfile", still false, with a new explanation. Answer unchanged (a, c).
- `questions/data/ai200-2a-vec-enable-feature.yaml` (2.1.3): the answer was the obsolete `EnableNoSQLVectorSearch` capability. Rewritten, same id, type, objective and difficulty: what vector search on a new container requires. Answer: a vector embedding policy that declares the path; the capability is now a distractor explained as unnecessary. References: vector-search and the Python how-to.
- `questions/data/ai200-2b-3072-dims.yaml` (2.2.3): the answer was DiskANN with product quantization (preview). Rewritten: re-embed with `dimensions => 1536` (azure_ai 1.1.0, text-embedding-3-large) into a `vector(1536)` column, then HNSW. New distractor: `batch_size => 1536`. References: optimize-performance-pgvector and generative-ai-azure-openai.
- `questions/data/ai200-2b-reduce-footprint.yaml` (2.2.4): one of the two correct options was DiskANN with product quantization. It became "Replace the HNSW index with an IVFFlat index built on the loaded data" (training unit "Choose and configure vector indexes": IVFFlat's lower memory footprint when HNSW would exceed memory, 90-95% recall). pg_diskann removed from the stem; explanation and reference updated. Answer still b, d.
- `questions/data/ai200-2b-pq-rerank.yaml` (2.2.3): the stem relied on a `product_quantized = true` index. It now uses a DiskANN index with the default `relaxed_order` iterative search, which "might cause the results to be out of order". Same query to complete, same answer. Explanations of the correct answer and of option `i10` updated.
- `questions/data/ai200-2b-build-memory.yaml` (2.2.4): `WITH (product_quantized = true)` removed from the fixed part of the template, so that the shown solution has no preview feature. Answer unchanged.

Checked and left unchanged: `ai200-1a-app-sidecar-otel` (no `WEBSITES_PORT` setup; option d's explanation is right for the app before the sidecar is added), `ai200-cs2c-portal-hosting` (no sidecar), the ACR auth questions using service principals (AKS or generic, not App Service Windows), `ai200-1b-label-url`, `ai200-1b-label-traffic` and `ai200-1b-revisions-yesno` (labels in multiple mode are GA; the 100 inactive revisions default is GA), `ai200-1b-keda-tcp-cli` (CLI), `ai200-2a-sdk-request-charge` and `ai200-2a-idx-index-metrics` (already use `last_response_headers`), `ai200-2a-vec-limitations` (both statements confirmed), `ai200-2a-vec-container-policy`, `ai200-cs2a-vector-policy` and case study cs1b ("vector search enabled" is now redundant, not wrong), `ai200-2c-pg-embeddings-identity` (matches Learn; see below), `ai200-2c-pg-diskann-iterative`, `ai200-2b-hnsw-recall`, and the Redis questions `ai200-2c-redis-search-instance`, `ai200-2c-redis-add-search-module` and `ai200-cs3c-semantic-index` (Enterprise policy, modules at creation: true for Redis 7.4, the GA version).

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 22 Q9 uses `ef_search = 20` with `LIMIT 5` only through the "at least `LIMIT`" rule.

## For a human decision

- **Container Apps revision name format** (`app--suffix` vs `app-suffix`): see the 12 table. Nothing was changed.
- **Cosmos DB vector policy changes**: drop and re-add (vector-search) vs "can't be modified later, set at creation" (Python how-to).
- **azure_ai managed identity**: the how-to's H1 is "Enable Managed Identity for Foundry Tools with the azure_ai extension preview" (its HTML title has no "preview"), while the azure_ai overview presents SAMI support without a preview label. The chapter now mentions it and `ai200-2c-pg-embeddings-identity` tests it. If it is preview, that question's answer must be rewritten.
- **RediSearch with the non-clustered policy**: architecture vs redis-modules (see 23). The chapter and the bank follow redis-modules.
- **Not verified, left in place**: `halfvec` and `sparsevec` rows of 22 (not on the Learn pages fetched); the 22 points listed as not confirmed; "HA on by default" in 23 (not stated on architecture or overview).
- **French terms not in the glossary**: « balise » (image tag, from the questions guide), « manifeste non balisé », « stratégie de balisage », « étiquettes de déploiement » (Deployment labels mode), « palier de réduction » (scale down step), « clés de partition hiérarchiques ».
