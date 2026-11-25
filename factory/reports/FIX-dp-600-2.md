# FIX-dp-600-2 — chapters 23, 31 and 32 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-600 23-query-analyze-data 31-design-semantic-models 32-optimize-semantic-models` 0 problems; `content:validate --cert dp-600` 0 problems, 0 warnings; `check-quiz dp-600 23-query-analyze-data 31-design-semantic-models 32-optimize-semantic-models` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers untouched.

The shared WebFetch budget ran out twice during the pass. Two checks couldn't be made (the fr-fr DAX query view page, and the "How Direct Lake works" page). They are listed below.

## 23-query-analyze-data

| Finding | Learn | Change |
| --- | --- | --- |
| `QUALIFY` missing | Confirmed. SELECT (Transact-SQL) puts `QUALIFY` after `HAVING` and before `SELECT`, "in Fabric Data Warehouse only". The QUALIFY clause page applies to the Warehouse and the SQL analytics endpoint in Fabric and has no preview label. It filters on window function results without a CTE or subquery, and it rejects a window function in `WHERE` | sql-queries: new paragraph after the window function code (no window function in `WHERE`; `QUALIFY ROW_NUMBER() OVER (...) = 1` keeps one row per key). Key points: filter on window functions with a CTE or `QUALIFY`, never in `WHERE` |
| DAX query view on the web: setting name and preview label | Confirmed. The setting is **User can edit data models in the Power BI service (preview)**. The web is "only available for nondefault semantic models" (use Desktop with a live connection). Web queries are discarded on close | Limits table: setting named in the Web permission row; new row "Web, default semantic model"; the Web row says queries aren't kept after the browser closes |
| 15 MB and 1,000,000 values shown as Desktop limits | Learn lists them without a platform label. The web gets "other limitations" (99,999 rows) on top | Limits table: "Desktop" became "Every query", and "Web" became "Web, in addition" |
| Quick queries incomplete | Confirmed: Define all measures in the model, Define new measure; for tables, Show top 100 rows, Show column statistics, Define all measures in this table; for columns, Show data preview, Show column statistics; for measures, Evaluate, Define and evaluate, Define with references and evaluate. "Define all measures" is unavailable above 500 measures | Quick queries bullet: full list plus the 500-measure limit |
| Visual query editor: 750,000 objects | Confirmed: warehouses with more than 750,000 combined objects (tables, views and columns) aren't supported for modeling | New limit bullet |
| VQE join kinds ("Inner, Left outer...") | **Not confirmed**. The VQE page shows only Inner in its example and doesn't list the other kinds. Nothing contradicts the chapter either | None |
| Items confirmed as written (QZ report) | Re-checked on the VQE page: DQL only, folding operations only, Visualize results without `ORDER BY`, Enable load, Save as view, Save as table (CTAS), Viewer and shared recipients can't move queries to Shared queries | None |

## 31-design-semantic-models

| Finding | Learn | Change |
| --- | --- | --- |
| Large format and Pro workspaces | Confirmed (Large semantic models). The format can be enabled for F, P and A SKUs, PPU, "and Pro workspaces assigned to Reserved Capacity for Pro Workspaces", with a 1 GB size limit for those. "Semantic models in Pro workspaces do not support XMLA-based write operations" | large-model-format: requirements sentence rewritten with both facts |
| Workspace default only for new models | Confirmed: "For existing semantic models, only step 3 [the per-model setting] is necessary" | Per-workspace bullet: an existing model needs the per-model setting |
| Hybrid table: Learn's option name | Confirmed. The incremental refresh page doesn't use "hybrid table" any more; the option is "Get the latest data in real time with DirectQuery (Premium only)" | storage-modes requirement table: option name added to the Hybrid table row (the "hybrid table" term is kept: see "For a human decision") |
| Ordering calculation items | Confirmed (Calculation groups page): reorder in the **Calculation items** section of the **Properties** pane, or move up or down from the context menu. `Ordinal` appears only in the TMDL sample (`sortByColumn: Ordinal`) | Calculation group bullet: how to reorder, and the Ordinal column sorts the items. Same wording as quiz 31 q-explanation |
| Composite: unsupported sources | Confirmed (Use DirectQuery for Power BI semantic models and Analysis Services): also SSAS Tabular before 2022, real-time and sample semantic models, Excel Online Refresh, data imported from Excel or CSV files in the service, usage metrics; streaming models not supported in composite models | Limits table, Sources not supported row |
| Composite: Build for viewers in a Pro workspace | Confirmed: viewers "generally need Read …; Build permissions might be required if the reports are in a Pro workspace" | composite-models bullet |
| Composite: calculation groups on remote sources | Learn is inconsistent on the same page: "Calculation groups on remote sources aren't supported, with undefined query results", while another section describes remote calculation groups that do change remote measures | Limits row: "(undefined query results)" added, as in the limitation list. Needs a human decision on how to present the other section |
| Items confirmed as written | Desktop upload limit 10 GB, 8-million-row segments, push models, region lock (Large semantic models); Discourage implicit measures, variant data type, `#,##0.00%` dynamic format string on an item (Calculation groups); chain of three, RLS can't be defined on remote tables, remote column data types (DirectQuery for semantic models) | None |

## 32-optimize-semantic-models

| Finding | Learn | Change |
| --- | --- | --- |
| Aggregation table storage mode | Confirmed (User-defined aggregations): Import "for greatest performance", and "once you set the storage mode to Import, you can't change it again"; or DirectQuery "optimized for fast queries by using columnstore indexes". Detail table must be DirectQuery | Rules table row; key points bullet |
| Guardrails: per query or per model | Confirmed (Direct Lake overview, updated 2026-09-18): "Max model size on disk/OneLake" is evaluated at the model level; "all other guardrails … are evaluated per query". Table values (F2-F8, F32, F64, F512) re-checked: unchanged | Sentence before the guardrail table ("Guardrails per table" became "Guardrails … evaluated per query") |
| "One table over a guardrail prevents Direct Lake for the whole model" (How Direct Lake works) | **Not checked**: the fetch budget ran out before this page was fetched. The overview doesn't say it | None |
| Boolean filter rules | Confirmed (CALCULATE function): columns from a single table, no measures, no nested CALCULATE, no functions that scan or return a table "unless you pass them as arguments to aggregation functions"; a scalar aggregation is allowed (`'Sales'[OrderDateKey] = MAX ( 'Sales'[OrderDateKey] )`) | dax-performance: "or a table function" became "a function that scans or returns a table (except inside an aggregation that returns a scalar …)". The quiz (q4) and the bank test this exception |
| Old `FILTER` / `||` guidance | The CALCULATE page doesn't mention `||`. The chapter doesn't cover `||` either | None |
| SQL analytics endpoint RLS with Direct Lake on OneLake | **Learn contradicts itself.** Direct Lake overview (updated 2026-09-18): "queries will succeed, and SQL based RLS is not applied". Integrate Direct Lake security (updated 2026-08-31): Direct Lake on OneLake returns an error "if any table in the SQL analytics endpoint enforces RLS". But the same page also says Direct Lake on OneLake "avoids these limitations" | None. The chapter's trap ("the query succeeds without the SQL filter") follows the more recent overview. Needs a human decision |
| Splitting datetime into date and time columns | **Not confirmed**. Not on "Data reduction techniques for Import modeling" or "Understand Direct Lake query performance". Learn recommends reducing column cardinality only in general | None. Needs a human decision (keep, or drop the clause from the reduce-the-model bullet and the key point) |

## Mock-exam bank questions changed

None. No bank question of objectives 2.3.1-2.3.4, 3.1.1-3.1.7 or 3.2.1-3.2.5 is contradicted by a verified Learn fact, and none has a preview or retired feature as its correct answer.

## Checked and left unchanged

- Window functions (2.3.2): `dp600-2d-sql-window-functions`, `dp600-2d-vqe-edit-sql`. Neither says a window function can only be filtered through a CTE, so `QUALIFY` doesn't add a second correct answer.
- DAX query view (2.3.4): `dp600-2e-dax-viewer-build` and `dp600-2e-dax-web-row-limit` both have Power BI Desktop as their correct answer, not the web (preview setting). The second says "in Power BI Desktop the limits are 15 MB and 1,000,000 values". That is still true, because these limits apply to every query. Also `dp600-2e-dax-query-rules`.
- Large format (3.1.6): `dp600-3b-lsm-license`. Option a (Pro workspace plus the large format, for an 18 GB model) is still wrong: even with Reserved Capacity for Pro Workspaces the limit is 1 GB. Its explanation ("Pro workspaces stay limited to 1 GB") still holds. Also `dp600-3b-lsm-max-size`, `dp600-3b-lsm-usecases`, `dp600-cs2c-large-format`, `dp600-cs1b-large-format`.
- Composite models (3.1.7): `dp600-3b-comp-viewer-perm` (Read for viewers; the stem says F64 capacity, so the Pro-workspace Build note doesn't apply), `dp600-3b-comp-chain`, `dp600-3b-comp-extend`, `dp600-3b-comp-dq-semantic`, `dp600-cs4b-staffing-composite`.
- Aggregations (3.2.1): `dp600-3b-perf-agg-hits`, `dp600-3b-perf-agg-rls`, `dp600-3b-perf-manage-agg`, `dp600-3b-perf-auto-agg`, `dp600-3b-perf-direct-lake-agg`, `dp600-3b-perf-pa-categories`. All use an Import aggregation table as a given; none says Import is the only option.
- Direct Lake on OneLake vs SQL (3.2.4): `dp600-3c-onelake-security`, `dp600-3c-onelake-only-features`, `dp600-3c-flavor-requirements`, `dp600-3c-flavor-statements`. None relies on what happens to SQL endpoint RLS under Direct Lake on OneLake.
- Guardrails (3.2.3): `dp600-3c-guardrails-f64`, `dp600-3c-guardrails-hotarea`, `dp600-3c-fallback-*`. The figures match Learn.

## Quiz files

None changed. All three quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 23 q7 (dedup through a CTE) offers no `QUALIFY` option, so it stays correct.

## For a human decision

1. **Direct Lake on OneLake and SQL endpoint RLS** (chapter 32, trap in direct-lake-onelake-vs-sql): Learn says "queries succeed" on the overview and "an error is returned" on Integrate Direct Lake security. The chapter follows the overview, which is the more recent page.
2. **Splitting datetime columns** (chapter 32, model-reduction bullet and key point): not found on Learn. Keep it as general VertiPaq practice, or remove it.
3. **Calculation groups on remote sources** (chapter 31 limits table): Learn says both "not supported, with undefined query results" and describes remote calculation groups that change remote measures.
4. **DAX query view in the web** relies on a workspace setting labelled "(preview)". The chapter now names it with its label. No bank or quiz answer depends on the web experience.
5. **"Hybrid table"** (chapters 31 and 32, plus the bank: `dp600-3b-perf-auto-agg`, `dp600-3b-perf-direct-lake-agg`, `dp600-3c-flavor-requirements`, `dp600-3a-sm-mode-definitions`): the incremental refresh page no longer uses the term. It names the option "Get the latest data in real time with DirectQuery". Naming choice. Kept for now, with the option name added in chapter 31.
6. **Real-time DirectQuery licensing**: the incremental refresh page lists Premium, PPU and Embedded under "supported plans", but the setting label, the publishing note and the partition note say Premium only. Chapter 32 says "Premium, PPU or Embedded only" (not changed).
7. **Not checked (fetch budget)**: "How Direct Lake works" (whether one table over a guardrail blocks Direct Lake for the whole model).

## French terms not settled (not in the glossary, or not checked on fr-fr Learn)

- Quick query labels in chapter 23 FR (« Définir une nouvelle mesure », « Définir toutes les mesures de cette table », « Afficher l'aperçu des données », « Définir et évaluer », « Définir avec des références et évaluer »): translated in the style of the existing labels. The fr-fr page couldn't be fetched (budget), so they aren't checked against the FR UI.
- Setting names kept in English in FR: **User can edit data models in the Power BI service (preview)**, **Get the latest data in real time with DirectQuery**, Reserved Capacity for Pro Workspaces (portal labels).
- « index columnstore », « modèles d'exemple » (sample models), « métriques d'utilisation » (usage metrics), « SSAS tabulaire »: not in the glossary.
- No « appairé » or other glossary violation found in the three FR chapters. There is no `content/dp-600/glossary.yaml`.
