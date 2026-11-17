# K-dp-800-cs1 — report

3 case studies, 18 questions, all `status: draft`. Validator: `CERT=dp-800 npx tsx factory/validate.ts --prefix dp800-cs1` → 21 files, 0 problem(s).

| Case study | Questions | Domains |
| --- | --- | --- |
| dp800-cs1a-adventure-works (online retail; Azure SQL Database, Foundry embeddings, full-text + DiskANN hybrid search, DAB on Container Apps) | external-model (single, 3.1.2), embedding-refresh (single, 3.1.3), hybrid-rrf (dropdown sql, 3.2.9), recall-check (single, 3.2.10), dab-search (dropdown json, 2.4.4), specs-filter (multi, 1.3.3) | 3 |
| dp800-cs1b-wide-world-importers (freight forwarding; Azure SQL Database, SDK-style SQL project + GitHub Actions, change event streaming to Event Hubs) | status-reference (single, 2.3.2), release-pipeline (ordering, 2.3.8), partner-events (single, 2.4.7), shipment-history (single, 1.1.2), deadlock-retry (yes/no, 1.3.8), notes-vector (yes/no, 3.2.3) | 3 |
| dp800-cs1c-woodgrove-bank (retail bank; SQL Server 2025 on premises, Arc-enabled, RAG with sp_invoke_external_rest_endpoint) | column-protection (dragdrop, 2.1.1), advisor-rls (dropdown sql, 2.1.3), endpoint-identity (multi, 2.1.7), terms-answer (dropdown sql, 3.3.5), callcenter-audit (single, 2.1.6), card-ledger (single, 1.1.2) | 3 |

Types: single 8, dropdown 4, multi 2, yes/no 2, ordering 1, dragdrop 1. Difficulty: 5 easy, 9 medium, 4 hard.

## Overlap with the parallel cs2 batch

The cs2 agent wrote its case studies at the same time. I rewrote my first drafts that tested the same decision with the same answer: embedding refresh by change tracking + Functions SQL trigger (cs2a-embedding-refresh; mine now requires in-transaction consistency → table trigger), AI_GENERATE_CHUNKS OVERLAP percentage (cs2a-note-chunks; replaced by a vector dimensions/float16 question), managed-identity credential for the external model (cs2a-openai-identity; mine now tests LOCATION/API_FORMAT), DAB runtime cache + read + @item policy (cs2a-portal-dab; mine now exposes a stored procedure), ANN vs ENN / metric mismatch (cs2c-ann-enn; mine now measures recall), Always Encrypted deterministic for NationalID (cs2a-national-id; mine now requires randomized).

Remaining partial overlaps: cs1b-release-pipeline vs cs2b-deploy-workflow (both gate production with a GitHub environment; mine is about DeployReport before approval and reusing the artifact); cs1c-endpoint-identity vs cs2a-openai-identity (both have the Managed Identity credential as a correct option; mine is about SQL Server 2025 server options). The cs3/cs4 batches did not exist when I checked.

## Facts not verified on a fetched Learn page / doubts

- **`allow server scoped db credentials`**: the CREATE EXTERNAL MODEL page requires it for managed identity on SQL Server 2025; I assume it applies equally to sp_invoke_external_rest_endpoint with a managed identity credential (cs1c-endpoint-identity).
- **Change event streaming** is in preview (stated in the explanation). The CES pages fetched do not compare CES with CDC/Change Tracking; the "previous values" claim comes from the overview ("current schema, previous values, and new values").
- **Change tracking does not keep previous values** (cs1b-partner-events distractor) and **Azure SQL Database has no SQL Server Agent**: standard knowledge, not re-read.
- **DML statements in a SQL project object file break the build** (cs1b-status-reference distractor a): standard behavior (SQL70001), not on the fetched page.
- **Temporal tables**: HIDDEN placement, HISTORY_RETENTION_PERIOD syntax and "HIDDEN only on GENERATED ALWAYS columns" come from knowledge of ALTER TABLE; the fetched overview page confirms only HIDDEN behavior for SELECT * and INSERT.
- **Append-only ledger syntax** `WITH (LEDGER = ON (APPEND_ONLY = ON))` and updatable `WITH (SYSTEM_VERSIONING = ON, LEDGER = ON)`: the ledger overview confirms the behaviors, not the DDL.
- **Audit action groups**: descriptions of SCHEMA_OBJECT_ACCESS_GROUP and DATABASE_OBJECT_ACCESS_GROUP from knowledge (cs1c-callcenter-audit distractors).
- **DAB**: `rest.methods` and `graphql.operation` for stored procedures and `execute` as the only stored-procedure action come from the entities page; the page itself has inconsistent defaults for these two properties (the question does not rely on defaults). `subscription` is not a graphql.operation value (only query/mutation are documented).
- **Chat completions response path** `$.result.choices[0].message.content` combines the verified `result` envelope with the standard Azure OpenAI response shape; api-version `2024-10-21` matches the DP-800 RAG chapter. `max_tokens` is used in the payload; some newer reasoning models use `max_completion_tokens` instead.
- **text-embedding-3-large = 3,072 dimensions** and support of the `dimensions` parameter: Azure OpenAI model facts not fetched in this task.
- **cs1a-embedding-refresh**: a trigger that calls AI_GENERATE_EMBEDDINGS inside the UPDATE transaction is the answer because the case requires that a description update fail when its embedding cannot be generated; Learn does not discuss calling AI functions from triggers.
- Reference titles: T-SQL reference pages use the "NAME (Transact-SQL)" heading convention; DAB titles are the HTML titles read on the pages.
- The WebFetch budget (shared by all agents) ran out once; curl/gh to learn.microsoft.com and MicrosoftDocs are blocked in this session.
