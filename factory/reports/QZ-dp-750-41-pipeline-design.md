# QZ-dp-750-41-pipeline-design — report

File: `content/dp-750/quizzes/41-pipeline-design.yaml` (10 questions). `npx tsx factory/check-quiz.ts dp-750 41-pipeline-design` → 0 problem(s), 0 warning(s).

Objectives: 4.1.1 (Q10), 4.1.2 (Q2), 4.1.3 (Q3, Q6), 4.1.4 (Q4, Q7), 4.1.5 (Q1, Q8), 4.1.6 (Q5, Q9). Formats 6–10: dropdown, yesno_statements, single, dropdown, dragdrop.

Pages fetched (Nov 24, 2026): Configure task dependencies (run-if); Use a For each task to run another task in a loop; Add branching logic to a job with the If/else task; Configure and edit tasks in Lakeflow Jobs; Dynamic value references; Orchestrate Databricks notebooks and modularize code; Triggered vs. continuous pipeline mode; CREATE VIEW (pipelines); Pipeline SQL language reference; CREATE TEMPORARY VIEW (pipelines); Configure pipelines; Pipeline concepts.

## Chapter out of date or incomplete against current Learn

- **Continuous mode**: Learn (pipeline-mode, configure-pipeline) now recommends running continuous pipelines in a **continuous job** with Pipeline mode left at Triggered, and "discourages" built-in Continuous mode for new pipelines; a job overrides the pipeline mode. The chapter's settings table presents Continuous mode only. (The mock question `dp750-4a-pipeline-settings` answers Triggered, unaffected.)
- **Views**: pipelines now support `CREATE VIEW` (published to Unity Catalog, no expectations, no streaming query, not a streaming source) besides `CREATE TEMPORARY VIEW` (private, not in the catalog). The chapter's dataset table lists only the temporary view. Q9 uses `CREATE VIEW` as a distractor.
- **Timeout and retries**: Learn says "the timeout applies to each retry" but doesn't say that a timed-out run is retried (the Jobs API has a separate retry-on-timeout setting, default off, from memory, not fetched). The chapter's "Timeouts apply to each retry" is correct; Q4 avoids timed-out attempts on purpose.
- **Job parameters**: the chapter says they "apply to every task that accepts key-value parameters"; the dynamic value references page only documents referencing them (`{{job.parameters.<name>}}`). Not contradicted, not confirmed. Q3 uses the explicit reference.
- For each: Learn adds Inputs limit 5,000 characters and job parameter values 10,000 characters; not in the chapter (minor).

## Doubts / not verified on a fetched page

- Q7 s1/s2: "`dbutils.notebook.exit()` ends the notebook as succeeded" is from the chapter; the fetched page only says it ends the notebook and returns a string.
- Q8: relies on "a task whose All failed condition isn't met is Excluded" and "Excluded counts as successful" (both on the run-if page). The If/else page doesn't state the status of the branch not taken, so Q8 avoids If/else.
- Q2: Learn has no explicit "use a notebook for external API calls / foreachBatch" sentence; the decision follows the chapter's table.
