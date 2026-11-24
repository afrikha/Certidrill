# QZ-dp-700-12-lifecycle-management — report

File: `content/dp-700/quizzes/12-lifecycle-management.yaml` (10 questions, `dp700-qz-12-01` to `-10`). `npx tsx factory/check-quiz.ts dp-700 12-lifecycle-management` → 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (Q1, Q4, Q6), 1.2.2 (Q3, Q7, Q9), 1.2.3 (Q2, Q5, Q8, Q10). Formats 6–10: multi, dragdrop, yesno, single, multi.

## Preview issue (important)

**Warehouse database projects are in preview**: "Develop Warehouse Projects in Visual Studio Code" and "Pre-deployment and post-deployment scripts for Fabric Data Warehouse (Preview)" both carry "This feature is in preview" (checked Nov. 2026). The chapter says so in one parenthesis, but all 10 mock-exam questions on 1.2.2 (`dp700-1b-dbproj-*`, `dp700-cs1b-database-project`) make warehouse projects the correct answer, which breaks the "no preview feature as the correct answer" rule. The quiz therefore tests 1.2.2 on **SQL database in Fabric** (no preview label on Learn) and on generic SqlPackage / SQL project behaviour (SqlPackage Publish and Script, pre/post-deployment scripts overview).

## Avoiding the mock bank

New decisions: unsupported items ignored; what a deployment copies (definitions vs roles, workspace settings, data); what Git stores for a SQL database; Update can't select items / Viewer sees no Git info / folders; 300-item limit per deployment; Git sync of an internal OneLake shortcut whose target is empty (Unidentified section); DropObjectsNotInSource, Script action, pre-deployment script; SQL database update failure (revert in source control); OneLake shortcut remapping on deployment; deployment overriding target shortcuts (manual prod edits lost, prod-only shortcut deleted, data and item ID kept).

## Facts checked on Learn

- Basic concepts in Git integration (2026-06-15): Update always applies the whole branch; Viewer sees no Git information; folders up to 10 levels; unsupported items ignored.
- Lakehouse git integration and deployment pipelines: internal shortcuts updated during Git sync, target must exist, invalid table shortcuts moved to **Unidentified**; deployment creates an empty lakehouse, internal shortcuts remapped but target tables not created, external shortcuts keep their target; deployment overrides the target's shortcut state (created/updated/deleted to match the source).
- The deployment pipelines process: 300 items per deployment; overwrite keeps ID, URL, permissions; data, permissions, workspace settings not copied.
- SQL database source control: SQL project folder `<name>.SQLDatabase`; update = project build + SqlPackage publish; a syntax error or unsupported feature makes the update fail and the change must be reverted in source control; collation and compatibility level not included.
- SqlPackage Publish: `DropObjectsNotInSource` default False; `BlockOnPossibleDataLoss` default **True**.

## Chapter / bank remarks (no edit made)

- Chapter: `BlockOnPossibleDataLoss` is already `True` by default in SqlPackage; the chapter's "True in production" guidance is right but could say it's the default (the risk is someone setting it to False).
- Chapter: Learn now documents that a deployment deletes target shortcuts that aren't in the source and reverts manual edits ("A deployment overrides the state of shortcuts in the target workspace"); the chapter only says deployments overwrite paired items. Q10 relies on this; worth a line in the lakehouse row.
- Chapter: Learn also documents the **Unidentified** section for invalid shortcuts after Git sync; the chapter says "become invalid".
- Lakehouse Git tracking is now opt-in per object type (Lakehouse settings, `alm.settings.json`), and OneLake security data access roles metadata can be tracked (preview). Not in the chapter; not tested.
- Learn's lakehouse page still labels the variable library "(preview)" in a link text, while the variable library overview shows no preview label. The chapter and `dp700-1b-deploy-stage-config` / `dp700-1b-deploy-value-set` use variable libraries as correct answers: worth a check. The quiz doesn't use them as an answer.
- `dp700-1b-dbproj-script-rules` s3 (`:r` not supported) is right for Fabric Data Warehouse, but the generic SQL projects page says `:r` includes are the way to compose scripts; the statement should name the warehouse explicitly (it does in its stem) — fine as is, noted for SQL database questions.

## Doubts

- Q5 option b relies on "a workspace can be assigned to only one deployment pipeline" (also used by `dp700-1b-deploy-assign-issues`); not re-fetched in this task.
- Q3: Learn says Fabric writes object definitions to a SQL project folder; it doesn't explicitly say "no table data", but only object definitions are described and static data goes through post-deployment scripts.
