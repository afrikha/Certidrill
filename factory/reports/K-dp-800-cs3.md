# K-dp-800-cs3 — report

3 case studies, 18 questions, all `status: draft`. Validator: `CERT=dp-800 npx tsx factory/validate.ts --prefix dp800-cs3` → 21 files, 0 problem(s).

| Case study | Questions | Domains |
| --- | --- | --- |
| dp800-cs3a-blue-yonder-airlines (regional airline maintenance; Azure SQL Database with graph tables and a partitioned table, DAB in Container Apps, Application Insights) | installed-components (dropdown sql, 1.3.6, d3), oldest-month (single, 1.1.6, d3), dab-cli (dropdown bash, 2.4.1, d2), api-telemetry (single, 2.4.6, d1), morning-blocking (single, 2.2.4, d2), defect-vectors (yes/no, 3.2.4, d2) | 3 |
| dp800-cs3b-proseware (online training; SQL database in Microsoft Fabric, Copilot in Fabric, Fabric data agent as MCP server, lakehouse) | copilot-region (single, 1.4.2, d1), copilot-context (multi, 1.4.1, d2), agent-mcp (single, 1.4.5, d1), learner-masking (dropdown sql, 2.1.2, d2), leaderboard (yes/no, 1.3.2, d2), transcript-chunks (single, 3.1.5, d3) | 3 |
| dp800-cs3c-litware-insurance (insurance claims; Azure SQL Database, SDK-style SQL project in Azure Repos + Azure Pipelines, Query Store, RAG prompt) | claim-numbers (single, 1.1.5, d1), open-claims (multi, 1.2.3, d3), search-regression (single, 2.2.3, d1), hotfix-drift (ordering, 2.3.7, d2), pipeline-controls (dragdrop, 2.3.9, d2), claim-context (dropdown sql, 3.3.3, d2) | 3 |

Types: single 8, dropdown 4, multi 2, yes/no 2, ordering 1, dragdrop 1. Difficulty: 5 easy, 9 medium, 4 hard.

All 18 objectives were untested by the cs1/cs2 case studies. The DAB Entra provider (tested in cs2c) is fixed text in the dab-cli template, not a slot. cs3c-hotfix-drift avoids the DeployReport step already tested by cs1b-release-pipeline.

## Fetched on learn.microsoft.com (2026-11-17)

AI_GENERATE_CHUNKS (Fabric support, OVERLAP percentage 0-50, chunk_order / chunk_offset / chunk_set_id); Fabric SQL database limitations (DDM supported, compat 170 default); Enable and configure Copilot in Fabric; Copilot in SQL database in Fabric (US/France region rule, trial unsupported, schema only); Copilot SQL database privacy page (schema, executed queries, errors, session history); Data agent as MCP server (Settings > Model Context Protocol tab, HTTP, publish first); Fabric Data Warehouse MCP server (preview); Azure SQL dynamic data masking (functions, granular UNMASK, Fabric T-SQL only); MATCH; TRUNCATE TABLE (aligned indexes for PARTITIONS); ALTER PARTITION FUNCTION; dab init; DAB Application Insights; Understand and resolve blocking problems (scenario 2, RCSI default); VECTOR_DISTANCE; VECTORPROPERTY; VECTOR_NORMALIZE (Azure OpenAI vectors normalized); OVER clause (default RANGE frame); LAG (default can be an expression); Sequence numbers; sp_query_store_force_plan; Create user-defined functions; Detect and resolve schema drift (training unit); Schema comparison overview; Azure DevOps branch policies; Define approvals and checks; FOR JSON; JSON_OBJECT.

## Facts not verified on a fetched page (kept, general T-SQL / product knowledge)

- `dab configure` modifies an existing file and doesn't create entities; `dab update` changes an existing entity (course chapter 24, not the CLI pages).
- A SNAPSHOT-isolation update still waits for an exclusive lock held by another transaction; RCSI doesn't stop writers blocking writers (the blocking page only says modifications can block one another).
- `CREATE INDEX ... ON PS_FlightMonth(FlightDate)` (with DROP_EXISTING) aligns a nonclustered index.
- `LAST_VALUE` with the default RANGE frame returns the current row's value (or a peer's); `RANK` 1,1,3 vs `DENSE_RANK` 1,1,2.
- Dot and cosine give the same ordering for unit-length vectors (mathematical; Learn only says Azure OpenAI vectors are normalized).
- `random()` masking only for numeric columns; output of `partial(0,"XXX-XXX-",4)` computed from the pattern rule.
- `FOR JSON ... ROOT()` keeps the array wrapper; `ROOT` combined with `INCLUDE_NULL_VALUES` is valid. Nested FOR JSON subqueries were avoided because their escaping behavior isn't on the fetched pages.
- `CROSS APPLY` / `OUTER APPLY` semantics and the bind error of a correlated function call in `JOIN ... ON` (not on the UDF page).
- TRUNCATE ... WITH (PARTITIONS) on Azure SQL Database: the page's applies-to says SQL Server 2016 and later; Azure SQL Database support assumed (the course chapter also uses it).
- Exclusive lock check on a service connection: the approvals page doesn't map each check to each resource type (used only as a distractor).

## Design choices and doubts

- cs3b-copilot-region: the "OpenAI as a Microsoft subprocessor" tenant settings aren't mentioned on the SQL database Copilot page, so they are neither required by the case nor offered as options.
- cs3a-morning-blocking: SET XACT_ABORT ON is deliberately not offered, because Learn ties it to run-time errors and the case's cause is a client time-out; the answer follows Learn's scenario 2 (rollback in the client error handler).
- cs3c-hotfix-drift: "create a feature branch" before the schema compare is my ordering (the project in the working copy is the compare target).
- cs3c-search-regression: a Query Store RECOMPILE hint could sometimes help, but only forcing plan 212 restores the known good plan deterministically.
