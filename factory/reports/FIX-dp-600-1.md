# FIX-dp-600-1 — chapters 11, 12, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-600 11-security-governance 12-development-lifecycle 21-get-data 22-transform-data` 0 problems; `content:validate --cert dp-600` 0 problems, 0 warnings; `check-quiz dp-600` (4 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The shared WebFetch budget ran out several times during the pass. Two pages could not be fetched: the Fabric protection-policies page and the fr-fr deployment-process page (see "For a human decision").

## 11-security-governance

| Finding | Learn | Change |
| --- | --- | --- |
| 1. Labels and access | Confirmed (governance/information-protection, "Access control"): a label associated with a Purview **protection** policy controls access to the item in the tenant; publishing policies cover .pbix and the supported export paths; nothing else, and nothing cross-tenant | Label exam trap: new "unless … protection policy" clause. Key point updated |
| 2. Who creates OneLake security roles | Learn is inconsistent: create-manage-roles says "Write **or** Reshare (generally included for Admin or Member)"; the Data security overview (get-started-security) says Admin or Member and shows Contributor = No | The chapter said "Write and Reshare", which neither page says. It now says "Workspace Admins and Members create and manage the roles" (both pages agree on this). The permission wording is flagged |
| 3. User's identity mode | Confirmed (sql-analytics-endpoint-onelake-security): table `GRANT`/`REVOKE` ignored; RLS/CLS/OLS defined only in OneLake security; SQL permissions only for views, procedures and functions; the switch deletes existing SQL roles. The get-started-security table: ReadData shows SQL data "Only in Delegated mode" | item-permissions: the granular-SQL bullet now says this applies to delegated mode. data-level-security: new sentences after the User's identity sentence. Key point updated |
| 4. "Each table needs its own policy" | Fabric RLS page: "Each table must have its own row-level security defined separately". CREATE SECURITY POLICY (applies to Warehouse in Fabric): one policy can hold predicates for several tables, with one predicate per DML operation per table | "Each table needs its own predicate; one security policy can hold the predicates of several tables" |
| 5a. RLS + OLS from different roles | Confirmed (Analysis Services OLS, Restrictions, linked from the Fabric OLS page): this gives an error at query time | OLS paragraph: new sentence |
| 5b. Write on a semantic model | Confirmed: Write is implicit for Admin/Member/Contributor (service-datasets-permissions), and can be added on the **Direct access** tab of Manage permissions (service-datasets-manage-access-permissions) | item-permissions: new bullet |
| 5c. Execute Apache Spark | Confirmed (lakehouse-sharing): "Use Lakehouse Livy endpoint to execute Spark jobs". Its internal permission name isn't given, so it got a bullet, not a table row | item-permissions: new bullet |
| 5d. Service principals and RLS | Confirmed (service-admin-row-level-security): they can't be added to an RLS role, so RLS isn't applied for apps using a service principal as the effective identity | RLS members bullet: consequence added |

## 12-development-lifecycle

| Finding | Learn | Change |
| --- | --- | --- |
| 1. Power BI items in Git integration | Confirmed (intro-to-git-integration, updated 2026-09-29): **Report (preview)**, **Semantic model (preview)**, **Paginated report (preview)**. Lakehouse, Warehouse, Notebooks, Pipeline and Dataflow gen2 have no marker. Git integration has no preview label as a whole. The PBIP page (updated 2026-09-23) has no preview label | git-integration: new sentence on item support. pbip-projects: deploy bullet says the Report and Semantic model items are in preview in Git. Key point updated. Bank: see below |
| 2. Deploy to an empty stage | Confirmed (understand-the-deployment-process): pipeline admin + source workspace contributor. Also: owner of the item to deploy dataflows | Permissions table: new row "Deploy to an empty stage"; dataflow owner added to the "next stage" row |
| 3a. Same name and type at first deployment | Confirmed: a Power BI item's first deployment fails | Autobinding paragraph: new sentence |
| 3b. Autobinding and Dataflow Gen2 | Confirmed: "Autobinding isn't supported for dataflows Gen2" | Same paragraph |
| 3c. Query caching settings not copied | Confirmed (semantic model properties not copied) | "Not copied" cell |
| 4a. Enhanced metadata for writes | Confirmed (service-premium-connect-tools) | XMLA bullet |
| 4b. XMLA refresh and tile caches | Confirmed: tile caches aren't refreshed by XMLA refreshes; they refresh when a user opens the report | XMLA refresh bullet |
| 4c. Default semantic models can't be modified through XMLA | Confirmed on the page | Not added: default semantic models are being phased out in Fabric, and no fetched page shows they are still created. Not worth a line |
| 5. .pbids `database` optional for `tds` | Confirmed as far as Learn goes: the desktop-data-sources example marks `database` "(optional)"; no prose says more. One data source per file, mode optional, no credentials: confirmed | One sentence before the JSON example |

## 21-get-data

| Finding | Learn | Change |
| --- | --- | --- |
| Shortcut identity exception | Confirmed (onelake-shortcuts): through Direct Lake over SQL or T-SQL in delegated identity mode, the calling item owner's identity reaches the target. Learn recommends Direct Lake over OneLake or T-SQL User identity mode | Internal-shortcut bullet: exception and recommendation |
| Gateway checkbox not enforced | Confirmed (data-factory/data-source-management): for cloud connections created through Dataflow Gen2 it "isn't currently enforced"; every shareable cloud connection works through a gateway if one is present | Gateway use row of the connection table |
| Eventhouse database shortcuts | Confirmed (onelake-shortcuts): an eventhouse database shortcut shares all or some subitems; same tenant and region | Shortcut bullet: one sentence |
| Copy job activity in a pipeline | Confirmed (what-is-copy-job): the copy job activity runs inside a pipeline, with its orchestration and triggers; no preview label | Copy job row of the method table |

## 22-transform-data

| Finding | Learn | Change |
| --- | --- | --- |
| sp_rename for columns | Learn contradicts itself. The T-SQL surface area page (updated 2026-09-29) says to rename a Warehouse column with `sp_rename`. The sp_rename page says `OBJECT` is the only supported `@objtype` for Warehouse; for the SQL analytics endpoint, tables and columns can't be renamed. There is no Fabric example | None. Needs a human decision (chapter and `dp600-2b-sp-rename-column`) |
| Materialized views | The surface area page (2026-09-29, more specific) lists them under Limitations. "What is Fabric Data Warehouse?" (2026-09-02) lists them in its summary with no detail | None (the chapter follows the more specific page). Watch for a change |
| IDENTITY copy wording | The IDENTITY page says: "Consider using CTAS or SELECT...INTO to create a copy of an existing table and add an IDENTITY column". Its examples show only inheritance of an existing IDENTITY | None: the chapter's wording follows Learn. Learn gives no syntax for adding the new column |
| Partitioning: liquid clustering, 1 GB per partition | Confirmed (delta-lake-partitioning): "For file skipping and read performance alone, liquid clustering is more effective than partitioning"; target at least 1 GB per partition. The page ties liquid clustering to Fabric Runtime 2.0 | None. Spark tuning is out of scope in the profile, and the chapter's pruning sentence is still right |

## Mock-exam bank questions changed

- `maintain/dp600-1a-dls-defaultreader` (explanation EN + FR): removed "Virtual members can't be removed one by one". create-manage-roles says to "remove them from the DefaultReader role, or modify or remove the DefaultReader role". The answer (remove ReadAll) doesn't change. None of the options removes the group from DefaultReader, so the answer stays the only right one.
- `maintain/dp600-1b-git-conflict-steps` (stem, actions, explanation EN + FR): the conflicted item is now a notebook named **NB-PnL**, not a report. Reason: Report is a preview item in Git integration. The sequence doesn't change.
- `maintain/dp600-1b-git-resolve-ui` (stem, template EN + FR): **NB-Orders** is now a notebook, not semantic model SM-Orders. The reason is the same; the answer doesn't change.
- `maintain/dp600-1b-git-first-sync` (stem EN + FR): the workspace now holds "a warehouse, a lakehouse and four notebooks" instead of semantic models and reports, because the correct answer commits them all. The answer doesn't change.
- `maintain/dp600-1b-git-commit-disabled` (stem, explanation EN + FR): the item updated from Git is now pipeline **PL-Sales**, not report Sales. The answer doesn't change.

## Checked and left unchanged

- 1.1.x: the label questions (`dp600-1a-lbl-*`, `cs3b-label-inheritance`). None says a label never restricts access. Also unchanged: `dls-sql-user-identity`, `item-granular-sql-order` (a warehouse, so no identity mode applies), `item-shortcut-target` and `2a-shortcut-passthrough` (Spark and lakehouse explorer, not Direct Lake over SQL), `cs1b-branch-rls`, `dls-ols-tmdl` and `cs3c-student-ols` (no RLS and OLS from different roles), and `lbl-mandatory-spn`/`ws-spn-items`.
- 1.2.x: the deployment questions (`dp600-1b-pipeline-*`, `cs1a-pipeline-binding`; deploying to a stage that already has a workspace still needs Contributor on both), the XMLA questions (`1c-xmla-refresh-facts` already says tile caches aren't refreshed), and the .pbids questions. `dp600-1b-git-true-statements` and `git-commit-permissions` were left alone: Power BI items appear only in the setting, and no correct answer depends on them.
- 2.1.x: the copy job, connection and gateway questions. None depends on the Dataflow Gen2 gateway checkbox or on copy job versus copy job activity.
- Quiz files: none changed. No quiz answer relies on a corrected sentence (check-quiz 0/0).

## For a human decision

1. **Git integration of reports and semantic models (preview), where the case text or objective 1.2.2 requires it.** Not rewritten:
   - Case-study questions `dp600-cs2c-branch-workflow` and `dp600-cs4b-client-tool-flow`. Their case texts (cs2c, cs4b, shared with other objectives) put a .pbip semantic model in a Git-connected workspace.
   - The series `dp600-sr1-merged-model-1/2/3`: the scenario file `series/dp600-sr1-merged-model.yaml` is about semantic model SM-Sales updated from Git. These could be changed to a notebook, but the series file isn't in this task's scope.
   - 1.2.2 questions that deploy a .pbip through Git integration (`dp600-1b-pbip-deploy-statements`, `pbip-multiple-pbir`, `pbir-dataset-reference`, `pbip-gitignore`, `pbip-file-roles`, `cs4a-pbip-repository`, `cs3b-pbip-repo`). Objective 1.2.2 names .pbip, whose stated purpose is source control. The PBIP page itself has no preview label, but its Git deployment path uses the preview items.

   Decide whether DP-600 keeps these as an exam-required preview or moves them to GA items.
2. **OneLake security status.** No preview label appears on the OneLake security pages (data-access-control-model, create-manage-roles, get-started-onelake-security updated 2026-08-31, sql-analytics-endpoint-onelake-security). The older lakehouse-sharing page still labels its folder-level section "OneLake security permissions (preview)". The chapter and the bank treat the feature as GA.
3. **Who creates OneLake security roles**: "Write or Reshare" (create-manage-roles) versus "Admin or Member, not Contributor" (Data security overview). A Contributor has Write, so these two statements conflict. The chapter now states only Admin and Member.
4. **sp_rename for columns** (see 22): surface area versus sp_rename page. Concerns the chapter (`columns are renamed with sp_rename`) and `dp600-2b-sp-rename-column` (`'COLUMN'` objtype).
5. **Materialized views in Warehouse** (see 22): watch the surface area page. Concerns the chapter key point and `dp600-2b-agg-statements`, `2b-sqlep-statements`, `2b-migrate-redesign`, `2b-date-table-proc`.
6. **Protection policies**: their own page couldn't be fetched (budget), so their preview or GA status wasn't checked. The chapter mentions them only as the exception in a trap callout, not as an answer.
7. **Reference titles**: `dp600-1a-dls-defaultreader` and `dp600-1a-dls-sql-user-identity` cite get-started-onelake-security as "Get started with OneLake security". The page's title is now "OneLake security roles, permissions, and scopes", which `dp600-1a-item-shortcut-target` uses for another URL (data-access-control-model). Not changed: the target page titles need to be re-checked together.

## French terms not settled

- « éléments appariés » (deployment pipelines, paired items, existing text in 12): the fr-fr page couldn't be fetched to confirm Learn's term. It isn't the VNet « peering » case.
- « stratégie de protection » (Purview protection policy), « point de terminaison Livy », « métadonnées améliorées » (enhanced metadata), « caches de vignettes » (tile caches), « paramètres de mise en cache des requêtes », « raccourci de base de données » (eventhouse database shortcut), « activité de travail de copie », « mode identité déléguée / identité de l'utilisateur » (existing usage kept). None of these is in the glossary.
