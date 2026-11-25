# FIX-dp-800-2 — chapters 23, 24, 31, 32, 33, 34 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-800 23-cicd-database-projects 24-azure-integration 31-models-embeddings 32-search-design 33-vector-hybrid-search 34-rag` 0 problems; `content:validate --cert dp-800` 0 problems, 0 warnings (643 files, 13 chapters, 73/73 objectives); `check-quiz dp-800` (6 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The fetch budget ran out several times. Every finding below was still fetched, except the ones marked "not confirmed".

## 23-cicd-database-projects

| Finding | Learn | Change |
| --- | --- | --- |
| Azure Repos: no YAML PR trigger | Confirmed (azure-repos-git FAQ: "you cannot configure a PR trigger in the YAML file"; yaml-schema/pr: "supported only in GitHub and Bitbucket Cloud") | Pipeline controls table, triggers row: Build Validation branch policy only for Azure Repos Git; `pr` applies to GitHub and Bitbucket Cloud |
| SQLCMD `DefaultValue` isn't compiled into the .dacpac | Confirmed (sqlcmd-variables) | reference-data section: new sentence (it pre-fills the publish dialog only; a command-line deployment without `/v` or a profile gets empty values) |
| Inconclusive test condition is missing | Confirmed (using-test-conditions table: eight conditions. Inconclusive is the default condition on every test. The page's prose says "six") | testing-strategy: Inconclusive added to the list |
| Publish defaults `BlockOnPossibleDataLoss` True, `DropObjectsNotInSource` False, `AllowIncompatiblePlatform` False | Confirmed. The page loaded with `?view=sql-server-ver17` | None |
| "Windows, Linux, macOS" for SDK-style builds | Partly confirmed: sql-database-projects says ".NET 8+ support (cross platform)" and names no OS. Also: SDK-style is preview in VS 2022, and VS 2026 supports only the original format | None. The chapter's VS 2022 (preview) row is right |
| Training unit "drops every object the project doesn't know about" | Default `DropObjectsNotInSource=False` confirmed. The chapter is right | None |

## 24-azure-integration

| Finding | Learn | Change |
| --- | --- | --- |
| Cache applies to REST only; `level` defaults to `L1L2` | Confirmed (concept/cache/level-1, DAB 2.0+: "Applies only to REST endpoints"; "`L1L2` (default)") | Entity settings table, `cache` row |
| `set-session-context` disables response caching | Confirmed (row-level-security page, text and Warning) | Caching trap: new sentence. Key points updated |
| Pagination keyword `$first` or `$limit` | Learn disagrees: the runtime page uses `$limit=-1`; the keyword page "Use $first (REST) and first (GraphQL)" documents `$first`, and `-1` expands to `max-page-size` | None (the chapter follows the more specific keyword page). See "For a human decision" |
| Values above `max-page-size` | Learn disagrees: the runtime page says "capped", the `$first` page's validation table says 400 | None (the chapter doesn't state either) |
| CES preview, destinations, AMQP | Confirmed (change-event-streaming overview: preview on all four platforms; Event Hubs or Fabric Eventstream; AMQP deprecated since Aug 15, 2026) | None (the chapter already says all three) |

## 31-models-embeddings

| Finding | Learn | Change |
| --- | --- | --- |
| CES destinations: Event Hubs and Fabric Eventstream | Confirmed (overview) | Maintenance table CES row and key points |
| `ONNX Runtime` requirements | Confirmed (CREATE EXTERNAL MODEL: SQL Server 2025, Windows only, Machine Learning Services, `external AI runtimes enabled`, `PREVIEW_FEATURES = ON`) | `API_FORMAT` row |
| Managed identity role on Azure OpenAI | Learn varies by page: sp_invoke_external_rest_endpoint (Azure SQL examples) names Cognitive Services OpenAI **User**, and CREATE EXTERNAL MODEL names Cognitive Services OpenAI **Contributor** for SQL Server 2025 (Arc) | Credential table row now names both, each with its page and platform |
| SCHEMABINDING view blocks dropping the model | On Learn. The sentence is ambiguous: it says the views "can't be dropped", then says to modify or drop the view first | None (optional addition, wording unclear) |
| MI: AI_GENERATE_CHUNKS works with either update policy | Not fetched (budget) | None (the chapter doesn't contradict it) |

## 32-search-design

| Finding | Learn | Change |
| --- | --- | --- |
| BACPAC with vector indexes supported from DacFx 170.5.96 | Confirmed (CREATE VECTOR INDEX) | Vector index table, "Not supported" row |
| VECTOR_SEARCH limitations (ascending `distance`, no view, no APPLY with `WITH APPROXIMATE`, subquery for aggregates) | Confirmed (VECTOR_SEARCH) | None: chapter 33 already covers them (vector-search section) |
| Cosine range 0 to 2 | Confirmed (VECTOR_DISTANCE metric table: [0, 2]) | None |

## 33-vector-hybrid-search

| Finding | Learn | Change |
| --- | --- | --- |
| Trap "two metrics need two vector indexes" | **Not confirmed**: neither CREATE VECTOR INDEX nor VECTOR_SEARCH says whether two vector indexes can exist on one column | The trap now keeps only the confirmed rule: changing the query's `METRIC` doesn't change the index; with no index of that metric, the search is an exact kNN scan with a warning (VECTOR_SEARCH). "Silently" was removed, because Learn says a warning is raised |
| Cosine "between 0 and 2" unsourced | Confirmed (VECTOR_DISTANCE) | None |
| `ON filegroup` on Azure SQL Database | Not fetched | None |
| Learn examples (ORDER BY two columns, TOP without ORDER BY) | Learn inconsistencies, not chapter errors | None |

## 34-rag

| Finding | Learn | Change |
| --- | --- | --- |
| FOR JSON AUTO: dotted aliases become keys with dots | Confirmed (format-json-output-automatically-with-auto-mode, example A) | JSON construct table, `FOR JSON AUTO` row |
| Reasoning models: no `temperature`, `max_completion_tokens` | Confirmed (foundry/openai/how-to/reasoning: reasoning models other than GPT-6 Astra don't support `temperature`, `top_p`, …, `max_tokens`; `max_completion_tokens` caps output in Chat Completions) | prompt-payload: one sentence ("most reasoning models…, check the model's feature table") |
| Azure SQL Database creates the master key automatically | Confirmed (CREATE DATABASE SCOPED CREDENTIAL: Azure SQL Database creates a DMK as part of creating the credential) | None |
| `@retry_count` = retries, 0 to 10 | Confirmed (sp_invoke_external_rest_endpoint) | None |
| "Exact figures: compute them in SQL" unsourced | Not on the RAG units fetched by the quiz writer, and not contradicted | None. Flagged |
| JSON_ARRAYAGG nested in JSON_OBJECT / FOR JSON | Not documented | None (the chapter doesn't claim it) |

## Mock-exam bank questions changed

None. Every finding was checked against the bank (291 questions with objectives 2.3.x, 2.4.x, 3.1.x, 3.2.x, 3.3.x, case studies and series included). No question contradicts a verified Learn fact.

## Checked and left unchanged

- PR triggers: `dp800-2c-ctl-path-trigger` (option b already says that Azure Repos Git PR triggers aren't configured in YAML) and `dp800-2c-ctl-ado-checks`.
- SQLCMD DefaultValue: `dp800-2b-refdata-env-vars` and `dp800-2c-sec-exposed-profile` (both agree with Learn).
- Test conditions: `dp800-2b-test-negative` (Inconclusive is a distractor, explained as a placeholder) and `dp800-2b-test-expected-schema`.
- DAB cache: `dp800-2d-cache-runtime`, `dp800-2d-shared-cache`, `dp800-sr2-dabcache-1/2/3` and `dp800-cs2a-portal-dab`. All are REST and none uses `set-session-context` with a cache. The series sets `level: L1` explicitly, so the `L1L2` default doesn't change the answers.
- Pagination: `dp800-2d-page-size` and `dp800-2d-rest-query` use `$first` (keyword page). The page-size explanation says that `max-page-size` "caps every request" (runtime page). The `$first` page answers 400 instead, but the answer is the same either way.
- CES destination type: `dp800-2d-ces-setup-order` says `AzureEventHubs` is the only type for Azure SQL Database. Confirmed by "Configure change event streaming (preview) to Azure Event Hubs".
- Azure OpenAI role: `dp800-3a-create-model-identity`, `dp800-3c-prompt-credential` and `dp800-3c-prompt-setup-order` use Cognitive Services OpenAI User on Azure SQL Database, as the sp_invoke_external_rest_endpoint page does.
- ONNX: `dp800-3a-sql2025-identity-config`, `dp800-cs1a-external-model` and `dp800-3a-create-model-identity` mention ONNX only as an option or a fact, not as a preview answer.
- Temperature: `dp800-3c-prompt-payload`, `dp800-cs4a-tutor-call` and `dp800-3c-extract-truncated` use chat deployments. No stem names a reasoning model.
- FOR JSON AUTO: `dp800-3c-json-token-reduction`, `dp800-3c-json-single-object` and `dp800-3c-json-path-root`. Vector indexes: `dp800-3b-idx-normalized` and the other 3.2.6 questions (none relies on two indexes on one column).

## Quiz files

None changed. The six quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 23 q9 (the Azure Repos `pr` trap) and quiz 34 q7 (AUTO dotted keys) now match the chapter text.

## For a human decision

- **CES (preview) as the correct answer**: `dp800-cs1b-partner-events`, `dp800-2d-ces-setup-order`, `dp800-2d-ces-limitations` (2.4.7), and `dp800-3a-ces-multi-consumer`, `dp800-3a-ces-setup-order` (3.1.3). They were kept, because objectives 2.4.7 and 3.1.3 name CES. CES is still preview on every platform.
- **DAB pagination keyword**: the runtime page uses `$limit`, the keyword page uses `$first`. The two pages also disagree on values above `max-page-size` (capped or 400). The chapter and the bank follow `$first`.
- **DAB defaults that Learn states inconsistently** (QZ report, not re-fetched): the `rest.methods` and `graphql.operation` defaults for stored procedures, and the `set-session-context` default. The chapter says POST and mutation.
- **Two vector indexes on one column**: not documented. The claim was removed from the chapter 33 trap. Test it before reintroducing it.
- **Unsourced chapter 34 row** "Exact figures such as a total or a count: compute them in SQL": sound, but not on the Learn pages fetched. Keep it or source it.
- French: « dépôt » for Git repositories (chapter 23, Azure DevOps usage). The glossary's `repository` = « référentiel » entry is tagged compute (ACR). This wasn't changed, but the glossary should say whether it also covers Git repositories.
