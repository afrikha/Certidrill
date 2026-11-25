# QZ-dp-600-12-development-lifecycle — report

File: `content/dp-600/quizzes/12-development-lifecycle.yaml` (10 questions, `dp600-qz-12-01` to `-10`). `npx tsx factory/check-quiz.ts dp-600 12-development-lifecycle` → 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (q1, q6), 1.2.2 (q3), 1.2.3 (q4, q10), 1.2.4 (q2), 1.2.5 (q8, q9), 1.2.6 (q5, q7). Hard formats (6–10): dragdrop, multi, single ×2, ordering.

## Chapter out of date or imprecise against current Learn (pages fetched 2026-11-24)

1. **Power BI items in Git integration are still preview.** *Overview of Fabric Git integration* lists **Report (preview)**, **Semantic model (preview)** and Paginated report (preview). Lakehouse, Notebooks, Warehouse and Pipeline are listed without a preview marker. The chapter presents Git integration of reports and semantic models (and deploying a .pbip through Git integration) as standard, with no preview note. Many mock questions rely on it: `dp600-1b-git-*`, `dp600-1b-pbip-multiple-pbir`, `dp600-1b-pbip-deploy-statements`, `dp600-sr1-merged-model-*`, `dp600-cs2c-branch-workflow`, `dp600-cs4b-client-tool-flow`. Under the "never a preview feature as the correct answer" rule, these need review. The quiz uses notebooks for Git (q6) and never makes Git integration of a semantic model or report a correct answer.
2. **Deployment permissions.** The deployment process page says "Deploy to an empty stage: pipeline admin + source workspace contributor". The chapter's table only gives "Deploy to the next stage: Contributor on both workspaces".
3. **Missing from the chapter:**
   - The first deployment of a Power BI item fails if the target already holds an item with the same name and type.
   - Autobinding isn't supported for Dataflow Gen2.
   - The deployment process page adds query caching settings to the list of items not copied.
4. **XMLA facts missing from the chapter (minor):**
   - Write operations on Desktop-authored models require enhanced metadata.
   - XMLA refreshes don't refresh tile caches.
   - Default semantic models can't be modified through XMLA.
5. **.pbids:** in the `tds` protocol, `database` is optional. With only a server, the user picks the database in Navigator. The chapter's example is fine, but this matters for "one file vs several" questions. q7 therefore uses two sources of different types.

## Doubts / unverified

- **q3:** *Power BI Desktop projects (PBIP)* says a project opens from the .pbip file or from a report's definition.pbir. That the other files (definition.pbism, TMDL, localSettings.json) are not entry points is inferred from this, not stated.
- **q10 (ordering):** Learn says rules "apply only after you deploy the semantic models from the source stage to the target stage" and take effect at the next deployment, and that data source credentials aren't copied. That credentials must be entered after the second deployment (once the rule switched the source) is inferred. The stem says the service has never connected to sqldb-test, which rules out an existing connection being reused.
- **q8:** assumes moving a workspace to another capacity is acceptable (both capacities exist; no cost constraint stated). No per-workspace XMLA setting exists; Learn says the capacity setting "applies to all workspaces and semantic models assigned to the capacity".
- The *Impact analysis* page was last updated in 2023, so UI labels (Child items / All downstream items / Browse by item type) may have changed.
