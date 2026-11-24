# QZ-dp-600-23-query-analyze-data — notes

`content/dp-600/quizzes/23-query-analyze-data.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.3.1 (q3, q6), 2.3.2 (q4, q7, q10), 2.3.3 (q2, q8), 2.3.4 (q1, q5, q9). Positions 6–10: dragdrop, dropdown (T-SQL), yesno, dropdown (DAX), single.

## Chapter vs current Learn (fix in the chapter, not done here)

- **QUALIFY**: the SELECT (Transact-SQL) page now lists `QUALIFY` in the logical processing order, "in Fabric Data Warehouse only" (between HAVING and SELECT). The chapter's evaluation-order table and its "keep one row per key" advice (ROW_NUMBER) don't mention it. I didn't check whether it is GA or preview, so the quiz doesn't use it (q7 uses the CTE pattern and offers no QUALIFY option).
- **DAX query view on the web**: Learn names the workspace setting "User can edit data models in the Power BI service (preview)" and says Write DAX queries is only available for non-default semantic models. The chapter describes the setting without its name or preview label.
- **Quick queries**: Learn lists more than the chapter (Define new measure, Define all measures in this table, Show data preview, Define and evaluate, Define with references and evaluate) and notes that "Define all measures" is unavailable above 500 measures. Not wrong in the chapter, just incomplete.
- **Visual query editor**: Learn adds a limit (warehouses with more than 750,000 combined tables, views and columns aren't supported for modeling). Its page only shows the Inner join kind; the other join kinds come from the Power Query merge documentation.
- Confirmed as written: VQE read-only (DQL only), folding operations only, Visualize results without ORDER BY, Enable load in merged scripts, Save as table = CTAS, Viewer and shared recipients can't move queries to Shared queries; DAX query view limits (15 MB, 1,000,000 values, 99,999 rows on the web); TOPN returns ties and doesn't sort; KQL T-SQL subset (DQL only) and `explain`; cross-database queries in the current workspace.

## Not verified on a fetched page

- q3: that the VQE merge dialog offers every Power Query join kind (Left outer, Left anti, Right outer). The VQE page shows only Inner; the chapter says "Inner, Left outer...".
- q6: that Save as view works in the visual query editor of a mirrored database (the VQE page applies to mirrored databases and documents Save as view, but its example is a warehouse). The Spark notebook explanation (no T-SQL, doesn't evaluate measures by itself) is general knowledge.
- q7: "a window function can't be referenced in WHERE" is general T-SQL knowledge; the ROW_NUMBER page only shows the CTE pattern.
- q8: that `project` of a column that no longer exists after `summarize` fails (follows from the summarize page: the output contains only the `by` columns and the aggregates).
- q10: the ON vs WHERE behaviour is quoted from the FROM clause page; the effect of `OR o.OrderDate IS NULL` is reasoning, not documentation.

## Design notes

- The bank already covers most single decisions of these objectives (about 60 questions). New decisions used: DAX for existing measures vs SQL/Spark, KQL `extend`, VQE Left outer join, DENSE_RANK with partition, "Define all measures in the model" + Update model with changes, a four-tool mapping with traps (mirrored DB in VQE, DELETE, T-SQL in a KQL queryset), dedup with ties (ROW_NUMBER), `where` after `summarize` and lost columns, TOPN without sort order + TREATAS filter, LEFT JOIN turned into inner join by WHERE.
- No preview feature is a correct answer.
