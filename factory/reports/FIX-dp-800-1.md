# FIX-dp-800-1 — chapters 11, 12, 13, 14, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-800 11-database-objects 12-programmability 13-advanced-tsql 14-ai-assisted-tools 21-security-compliance 22-performance` 0 problems; `content:validate --cert dp-800` 0 problems, 0 warnings; `check-quiz dp-800` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. One code block changed (13, fuzzy matching: a comment), identically in both languages. The shared WebFetch budget ran out several times; every finding below was fetched in the end except where marked "not confirmed".

## 11-database-objects

| Finding | Learn | Change |
| --- | --- | --- |
| BUCKET_COUNT 1-2x distinct keys; Learn adds 2-3x | Confirmed (hash-indexes-for-memory-optimized-tables): 1-2x "in most cases"; 2-3x when equality lookups matter more than memory | Hash index row: added the 2-3x case |
| External tables in Azure SQL Database are preview (found while checking the bank) | Confirmed: the page title is "Data virtualization with Azure SQL Database (Preview)"; `https://` only for BULK INSERT; CETAS not available; master key needed for a credential with SECRET. The Managed Instance page (managed-instance/data-virtualization-overview) has no preview label: `abs://`/`adls://` only, generic `https://` disabled, CETAS disabled by default | The chapter already said "labeled preview". Added one sentence on Managed Instance (no preview label, same prefixes, `https://` disabled, CETAS off by default) |
| JSON indexes GA? | CREATE JSON INDEX shows no preview label or PREVIEW_FEATURES note on any of the four platforms; offline build only | None |

## 12-programmability

| Finding | Learn | Change |
| --- | --- | --- |
| `ALTER AUTHORIZATION ON SCHEMA` drops permissions | Confirmed (ALTER AUTHORIZATION, SCHEMA row): permissions on schema-contained objects without an explicit owner are dropped | Procedures paragraph: new sentence (re-grant after a schema transfer) |
| WITH ENCRYPTION wording | Confirmed (CREATE VIEW): encrypts the sys.syscomments entries; the view can't be published by SQL Server replication | View options table, ENCRYPTION row reworded |

## 13-advanced-tsql

| Finding | Learn | Change |
| --- | --- | --- |
| Fuzzy matching no longer preview-only | Confirmed (fuzzy-string-match/overview, EDIT_DISTANCE, EDIT_DISTANCE_SIMILARITY): GA from SQL Server 2025 CU11; preview on earlier SQL Server 2025 builds, PREVIEW_FEATURES = ON "if they're not enabled by default"; also Azure SQL Database, Managed Instance (SQL Server 2025 or Always-up-to-date policy), SQL database in Fabric | Intro of the section, comment in the code (`-- only on SQL Server 2025 builds before CU11`), Key points |
| "Computed row by row, reduce pairs first" isn't on Learn | Confirmed that Learn says nothing on performance, except that with `maximum_distance` EDIT_DISTANCE "might stop processing" | Sentence kept (plain logic); added the early stop with `max` |
| ALLOW_BUILTIN_TVF_IN_ALL_COMPAT_LEVELS (found while checking the bank) | ALTER DATABASE SCOPED CONFIGURATION: "in preview", Azure SQL Database and SQL database in Fabric only; covers GENERATE_SERIES, OPENJSON, REGEXP_MATCHES, REGEXP_SPLIT_TO_TABLE, STRING_SPLIT. PREVIEW_FEATURES default OFF | Regex section: "(in preview, Azure SQL Database and SQL database in Fabric only)" |

## 14-ai-assisted-tools

| Finding | Learn | Change |
| --- | --- | --- |
| Instructions and inline suggestions | Confirmed (sql/tools/.../github-copilot/custom-instructions): `.instructions.md` files apply to "every GitHub Copilot surface that matches the applyTo glob, including ask mode, edit mode, agent mode, and inline completions"; plan mode inherits the conventions | 1.4.4 rule rewritten (the old "don't apply to inline suggestions" removed), Key points aligned. VS Code docs (not Learn) say the opposite: see human decision |
| AGENTS.md row | Confirmed not backed: the same page names AGENTS.md only as OpenAI Codex's file | Row removed from the instruction-files table (unverifiable on Learn) |
| Plan mode row | Confirmed: the page mentions "plan mode for database design" and links to a plan mode quickstart | None |
| applyTo relative to the workspace root | **Not confirmed**: the Learn page doesn't say | None (bank questions `dp800-1d-applyto-*` rely on it) |
| Fabric tenant settings | Confirmed (fabric/fundamentals/copilot-enable-fabric): four settings, the fourth being "Data sent to OpenAI as a Microsoft subprocessor can be processed outside…"; delegation via OneLake catalog > Govern > Capacities | New table row; delegation path added to the bullet. The "Capacities can be designated…" row isn't on that page: kept, not confirmed |
| SSMS admin controls | Confirmed (ssms/github-copilot/admin-controls): ADMX Disable Agent Mode (SSMS 22.7+), MCP allow list in GitHub AI Controls > MCP; no audit logs on that page | Governance paragraph: one sentence added; audit-log claim kept (training unit, per the QZ report) |
| FR « dépôt » | Glossary: repository = « référentiel » | « référentiel » throughout the FR chapter |

## 21-security-compliance

| Finding | Learn | Change |
| --- | --- | --- |
| Immutable storage conditions for auditing | Confirmed (auditing-overview): Allow protected append writes = Append blobs or Block and append blobs (None not supported); storage retention interval shorter than the SQL Auditing retention; retention 0 with a storage policy not supported | Auditing table, Protection row |
| Column-level encryption permissions | QZ: no change needed | None |

Note: auditing-overview now describes a new server-level architecture (one Extended Events session for all databases, logs in a single `master` folder). The chapter's statements still hold; not added.

## 22-performance

| Finding | Learn | Change |
| --- | --- | --- |
| Hyperscale 1-2 ms for the frequently accessed part | Confirmed (service-tiers-sql-database-vcore); GP and BC 4 TB, Hyperscale 128 TB | Hyperscale row, and the exam tip now says "for all the data" |
| ALLOW_SNAPSHOT_ISOLATION defaults | Confirmed (transaction locking and row versioning guide): ON in Azure SQL Database, OFF in SQL Server and Managed Instance (RCSI likewise) | SNAPSHOT bullet and Key points |
| Hyperscale serverless auto-pause (from the QZ doubts) | Confirmed (serverless-tier-overview): "a preview feature of Azure SQL Database Hyperscale"; GP delay 15 min-7 days, Hyperscale 60 min-7 days | "auto-pause in General Purpose, in preview in Hyperscale" |
| NOLOCK on modified tables | QZ: no change needed | None |

## Mock-exam bank questions changed

- `develop/dp800-1c-fuzzy-merge-suppliers` (ordering, 1.3.5): the stem now says SQL Server 2025 with CU11 or later; PREVIEW_FEATURES is no longer a step (count 4 → 3, sequence pairs, repoint, delete); new explanation for the `preview` distractor. Why: the preview step was part of the correct answer, and the functions are GA from CU11.
- `develop/dp800-cs2b-supplier-duplicates` (single, 1.3.5, case study Munson's): stem says SQL-ERP1 has CU11 or later and asks "Which predicate should you use?"; the options are now four predicates only (`EDIT_DISTANCE >= 85`, `EDIT_DISTANCE_SIMILARITY <= 15`, `EDIT_DISTANCE_SIMILARITY >= 85` correct, `JARO_WINKLER_DISTANCE >= 85`); explanations updated. Why: the correct answer included enabling PREVIEW_FEATURES. The case text wasn't changed.
- `develop/dp800-1c-json-tvf-compat` (single, 1.3.3): the correct answer was ALLOW_BUILTIN_TVF_IN_ALL_COMPAT_LEVELS (preview). Now the application is certified at levels 120 and 130 and policy forbids preview features; answer `ALTER DATABASE CURRENT SET COMPATIBILITY_LEVEL = 130` (a); the TVF setting (b) and level 170 (c) are distractors; PREVIEW_FEATURES option removed.
- `develop/dp800-1a-external-steps` (ordering, 1.1.2): Azure SQL Database → Azure SQL Managed Instance (data virtualization isn't labeled preview there); `https` and `cetas` explanations rewritten for MI; reference replaced by the MI data virtualization page. Same answer.
- `develop/dp800-1a-specialized-map` (dragdrop, 1.1.2): "an Azure SQL database" → "a database on Azure SQL Managed Instance", so the external table answer is a GA feature. Same answer.

## Checked and left unchanged

- The other fuzzy questions (`dp800-1c-fuzzy-collation-max`, `-dedupe-query`, `-max-distance`, `-one-edit`, `-transposition`, `-prefix-names`, `-statements`): their stems set PREVIEW_FEATURES to ON, which is harmless on every build; no answer depends on preview status.
- Regex questions with PREVIEW_FEATURES or ALLOW_BUILTIN_TVF_IN_ALL_COMPAT_LEVELS as distractors (`dp800-1c-regex-like-compat`, `-regex-check-rollout`, `-regex-tvf-results`): still wrong options.
- `dp800-2b-serverless-pause`: its Hyperscale distractor (minimum delay 60 minutes) matches serverless-tier-overview.
- `dp800-2b-snapshot-report`, `-snapshot-facts`, `-tier-hyperscale`, `-readscale-facts`, `-db-settings-map`: agree with the corrected chapter.
- `dp800-1d-copilot-chat-settings`, `dp800-1d-copilot-enable-location` (Disable Agent Mode, MCP allow list) and `dp800-1d-fabric-copilot-switch`, `-cross-geo`: agree with the fetched pages.
- No bank question tests inline completions, AGENTS.md, the sys.syscomments wording or ALTER AUTHORIZATION.

## Quiz files

None changed. The six quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 13 Q5 sets PREVIEW_FEATURES = ON in its stem, which still works.

## For a human decision

- Instruction files and inline completions: Learn (T-SQL custom-instructions quickstart) says they apply to inline completions; the VS Code documentation says custom instructions aren't used for inline suggestions. The chapter now follows Learn and names the source. Confirm, or remove the point.
- `applyTo` relative to the workspace root: not on Learn; the chapter and `dp800-1d-applyto-*` rely on it.
- Fabric setting name: the chapter says "Capacities can be designated as Fabric Copilot capacities", the bank says "…as Copilot in Fabric capacities"; neither is on the fetched page.
- Data virtualization in Azure SQL Database stays in the chapter (objective 1.1.2 names external tables, and the chapter labels it preview). Decide whether to keep it as the main platform or lead with SQL Server / Managed Instance.
- `dp800-1a-external-steps`: the master key requirement for a SAS credential is stated on the Azure SQL Database page; the MI page doesn't mention it (it's standard CREATE DATABASE SCOPED CREDENTIAL behavior, not re-fetched).
- French terms not in the glossary: « builds » (SQL Server builds), « stratégie de groupe (ADMX) », « hors zone géographique » (cross-geo), « complétions inline ». Portal labels kept in English: Allow protected append writes, Append blobs, Block and append blobs, OneLake catalog > Govern > Capacities, AI Controls > MCP, the ADMX path.
