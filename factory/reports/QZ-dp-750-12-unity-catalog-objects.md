# QZ-dp-750-12-unity-catalog-objects — report

File: `content/dp-750/quizzes/12-unity-catalog-objects.yaml` (10 questions, ids dp750-qz-12-01..10). Check: `npx tsx factory/check-quiz.ts dp-750 12-unity-catalog-objects` → 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (q1), 1.2.2 (q10), 1.2.3 (q2), 1.2.4 (q6), 1.2.5 (q3, q7), 1.2.6 (q9), 1.2.7 (q4, q8), 1.2.8 (q5). Positions 6–10: single, yes/no, drag-and-drop, multi, yes/no.

## Chapter / mock exam vs current Learn (Nov 2026)

- **Materialized views: compute.** The chapter says they are "created only with a pro or serverless SQL warehouse or within a pipeline". The Learn page "Use standalone materialized views" adds "a notebook running on serverless general compute".
- **Federation is not always read-only.** The chapter says "Both are read-only" for query and catalog federation. The Learn page "Hive metastore federation: enable Unity Catalog to govern tables…" says that federated *internal* Hive metastores "allow reads and writes" (external ones are read-only). The overview page "Connect to external databases and catalogs" does say "read-only", so Learn contradicts itself.
- **Type widening runtime.** The chapter says DBR 15.2+ (as the ALTER TABLE … COLUMN page does). The Learn page "Type widening" says DBR 15.4 LTS and above, and that tables with type widening can only be read by 15.4 LTS+.
- **RENAME/DROP COLUMN.** The fetch of "ALTER TABLE … COLUMN clause" reported both clauses as "Public Preview", and RENAME COLUMN as requiring table ownership (only ALTER/ADD/DROP COLUMN need MODIFY). This needs a check by a human: the chapter and the mock question `dp750-1b-ddl-rename-column` treat it as a standard feature.
- **Genie naming.** Learn now names the configured environment **Genie Agent** ("Create and manage a Genie Agent"). Several mock questions still say "Genie space": `dp750-1b-genie-entity-matching`, `-instruction-limits`, `-knowledge-store-facts`, `-sql-expressions`, `-sql-function`, `-text-instructions`, `-trusted-assets`. Learn also lists the end-user entitlement "consumer access or Databricks SQL", which the chapter doesn't mention.
- **MySQL two-level namespace.** The chapter says no `database` option is needed. The Learn MySQL page shows `CREATE FOREIGN CATALOG … USING CONNECTION` with only the `tinyInt1isBit` option, which is consistent, but it doesn't state the two-level namespace explicitly.
- **REFRESH syntax.** Confirmed: `[ FULL ] [ WHERE predicate ] [ SYNC | ASYNC ]` can be combined.

## Unverified points / doubts

- q4: Learn's documented workflow is `ADD COLUMN`, then `ALTER COLUMN … SET DEFAULT`. Delta may also require the table feature `delta.feature.allowColumnDefaults` before setting a default. I couldn't verify this on a fetched Learn page (the column-defaults page failed to load), so I left it out of the stem.
- q6: whether Unity Catalog forbids an external table and an external volume on overlapping paths is unverified. The answer drops the volume first (its files stay), so it doesn't depend on that rule.
- q10 s2 ("the current workspace must be included") comes from the Learn page "Create catalogs" (Catalog Explorer flow). The "Workspace-catalog binding" page doesn't repeat it.
- I didn't verify the materialized view schedule limits in the chapter (EVERY 1–72 hours, 1–31 days, 1–8 weeks; TRIGGER ON UPDATE at most once a minute with up to 10 sources) or the recovery period range (0 hours or 7–30 days). The quiz doesn't use them.
