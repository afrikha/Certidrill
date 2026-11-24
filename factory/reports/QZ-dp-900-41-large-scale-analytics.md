# QZ-dp-900-41-large-scale-analytics — report

File: `content/dp-900/quizzes/41-large-scale-analytics.yaml` (10 questions, EN + FR). Check: `npx tsx factory/check-quiz.ts dp-900 41-large-scale-analytics` → 0 problem(s), 0 warning(s).

Objectives: 4.1.1 (q1, q3, q7, q10), 4.1.2 (q2, q5, q6), 4.1.3 (q4, q8, q9). Formats 6–10: single ×2, dropdown, multi, yesno_statements.

## Sources fetched (Nov 2026)
Module "Explore fundamentals of large-scale analytics" units 2, 3 and 4; Fabric decision guide Warehouse vs Lakehouse; OneLake shortcuts; What is Azure Databricks?; DP-900 study guide (skills as of July 21, 2026, page updated 2026-11-13: no change to 4.1). The hourly WebFetch limit was hit afterwards; nothing written depends on an unfetched page.

## Overlap with the mock exam
The bank has ~50 questions on 4.1.1–4.1.3 and covers nearly every fact of the chapter. The quiz avoids their scenarios and decisions where possible, but some consolidation items necessarily re-test known facts in new scenarios and combinations: q4 (Databricks SQL warehouse for BI, also the answer of one target of `dp900-4a-svc-databricks-component-match`), q8 (combines the decisions of `dp900-4a-svc-databricks-scenario`, `-fabric-warehouse`, `-fabric-lakehouse` in one three-team scenario), q9 (Fabric vs Databricks comparison, close in theme to `dp900-4a-svc-both-platforms-statements` but other statements). Reviewer may want to vary them further.

## Doubts / to verify
- q7: the correct option says the column is removed "in the pipeline" before the load (ETL). Learn's unit 3 says Fabric pipelines can load data and apply custom logic; the copy activity's column mapping can drop a column. Option c assumes mirroring replicates the whole table, column included (not verified whether some mirroring sources allow column selection; the option's flaw also lies in "hide in the semantic model", which never removes data from the store).
- q4: "The Unity Catalog metastore" is used as a distractor name (real Unity Catalog concept, not taught in the chapter; it is wrong either way).

## Chapter vs current Learn
- The chapter is consistent with the current Learn units. Two Learn points the chapter doesn't carry, which could be added: Learn now names the analytical data model the "semantic model" with DAX measures and Direct Lake mode (the chapter mentions the semantic model but not Direct Lake), and the unit 4 note on combined solutions (ELT into a lake, Databricks notebook processing, load into a Fabric Warehouse).
- Learn's unit 4 gives the Warehouse criteria "strong schema enforcement and concurrency for many simultaneous users" and Lakehouse "mixed or semi-structured data or machine-learning workflows"; the chapter's requirement table only has the T-SQL row. q8 uses the Learn criteria; adding them to the chapter would align it.
