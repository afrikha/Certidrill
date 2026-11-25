# QZ-dp-750-35-data-quality — report

File: `content/dp-750/quizzes/35-data-quality.yaml` (10 questions). `npx tsx factory/check-quiz.ts dp-750 35-data-quality` → 0 problem(s), 0 warning(s).

Objectives: 3.4.1 (Q1, Q5, Q8), 3.4.2 (Q3, Q10), 3.4.3 (Q4, Q6), 3.4.4 (Q2, Q7, Q9). Formats 6–10: dropdown, yesno_statements, dropdown, multi, single.

Pages fetched (Nov 24, 2026): Constraints on Azure Databricks; Manage data quality with pipeline expectations; Expectation recommendations and advanced patterns; Configure schema inference and evolution in Auto Loader; Update table schemas with schema evolution; Pipeline event log.

## Chapter out of date or incomplete against current Learn

- **UNIQUE constraint**: Learn says UNIQUE is **Public Preview** (Databricks SQL and DBR 18.2+); PK/FK are GA from DBR 15.2. The chapter lists "Informational PRIMARY KEY or UNIQUE" without the preview label.
- **`addNewColumnsWithTypeWidening`** is **Public Preview (DBR 16.4+)** on Learn; the chapter table presents it as a normal mode. Never use it as a correct answer.
- Missing from the chapter (Learn, Auto Loader schema page): `addNewColumns` **isn't allowed when the stream schema is provided** (works with schema hints); **schema hints are used only when no schema is provided**. Q10 relies on these two facts; the chapter only implies them ("default without a provided schema"). Worth adding to the chapter.
- Expectations: Learn also lists "not supported on tables targeted by REPLACE WHERE flows", and notes that standalone (Databricks SQL) streaming tables/MVs have no Data quality tab (event log only). Not in the chapter.
- CHECK constraints: Learn adds `DROP FEATURE` (DBR 15.4 LTS+) to remove them and downgrade the protocol. Minor, not in the chapter.

## Doubts / not verified on a fetched page

- Q1: that `SHOW TBLPROPERTIES` does not show PK/FK constraints is inferred (Learn lists it only for CHECK; key constraints via information_schema / DESCRIBE TABLE EXTENDED / SHOW CREATE TABLE).
- Q6: the need for `mergeSchema` on the Auto Loader `writeStream` comes from the schema-evolution page example (Auto Loader + `mergeSchema`), not from an explicit statement.
- Q7 s3 ("restart without fixing fails again on the same reading"): derived from "atomically rolls back" + "manual intervention is required before reprocessing"; Learn has no explicit sentence.
- Q8: `count(DISTINCT a, b)` and `count_if` syntax not re-fetched (standard Databricks SQL functions).
