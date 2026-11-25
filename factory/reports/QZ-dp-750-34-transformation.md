# QZ-dp-750-34-transformation — report

File: `content/dp-750/quizzes/34-transformation.yaml` (10 questions, `npx tsx factory/check-quiz.ts dp-750 34-transformation` → 0 problem(s), 0 warning(s)).

Objectives: 3.3.1 (Q1), 3.3.2 (Q2, Q7), 3.3.3 (Q3), 3.3.4 (Q4, Q6), 3.3.5 (Q8), 3.3.6 (Q5), 3.3.7 (Q9, Q10). Formats 6–10: yesno_statements, dropdown, multi, single, dropdown.

Decisions chosen to avoid the mock bank (heavily covered for 3.3.x): selection details for a few columns; DATE for a calendar day; `nullif(trim(...), '')` vs `trim(nullif(...))`; `GROUPING SETS` without grand total vs `ROLLUP (channel, region)`; PySpark `unpivot` argument order; `GROUPING SETS` + `HAVING` + `FILTER` semantics; `try_cast` + decimal precision + counting failed conversions without the legitimate NULLs; `exceptAll` / `EXCEPT ALL` vs `subtract` / `EXCEPT` / anti join; `REPLACE WHERE` failing on rows outside the predicate (and the `REPLACE USING` / constraint-check traps); `MERGE WITH SCHEMA EVOLUTION` with a conditional `WHEN NOT MATCHED BY SOURCE` restricted to a target slice.

## Chapter out of date or incomplete against current Learn (Nov 2026)

- **Load operations table** (section load-operations): the chapter shows no DataFrame equivalent for `REPLACE USING`. Learn ("Selectively overwrite data with Delta Lake") now gives `REPLACE USING` in SQL from DBR 16.3 and in **Python/Scala from DBR 18.2**, and adds **`REPLACE ON`** (SQL DBR 17.1+, Python/Scala 18.2+) for arbitrary or NULL-safe conditions (`<=>`). Learn also says DBR 16.3–17.1 use a legacy behavior of `REPLACE USING` (dynamic partition overwrite only), and that `REPLACE USING` / `REPLACE ON` never delete rows when the source is empty.
- **`replaceWhere` constraint check**: Learn says the `spark.databricks.delta.replaceWhere.constraintCheck.enabled = false` override is for classic compute; the chapter doesn't mention it (used only as a distractor in Q9).
- **`MERGE WITH SCHEMA EVOLUTION`**: the MERGE INTO reference says "Databricks Runtime 15.2 or above"; the chapter says 15.4 LTS. The quiz states no version.
- **Data types**: the try_cast page now refers to a `DECFLOAT` type (with `DECFLOAT_ROUNDING_MODE`). The chapter's type table doesn't list it; its status wasn't checked.
- **Profiling**: the "Notebook outputs and results" page documents **Open selection details** (profiling statistics for selected column headers) but no longer describes the **+ > Data Profile** tab or its DBR 9.1 requirement that the chapter gives. Not re-checked on another page.
- **PySpark unpivot**: the Learn `unpivot` page doesn't mention the `melt` alias that the chapter cites (not used in the quiz).

## Not verified on a fetched page (kept, from the chapter or standard SQL)

- Q7: `::` behaving like `cast` (error on malformed input with ANSI mode on); the stem states that ANSI_MODE is TRUE instead of relying on the SQL warehouse default. `DOUBLE` drift (chapter).
- Q6: that `HAVING` also filters the grand-total row of `GROUPING SETS` (the HAVING page says it filters the results produced by `GROUP BY`; no explicit grouping-sets example).
- Q3: `trim` semantics (only `nullif` was fetched).

## Doubts

- French: « dépivoter » follows the study guide wording (« dépivotant »); « ensembles de regroupement » for grouping sets and « détails de la sélection » for selection details weren't checked against Learn fr-fr. The UI label **Open selection details** is kept in English.
