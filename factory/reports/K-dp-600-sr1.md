# K-dp-600-sr1 — report

6 series × 3 questions (dp600-sr1-*), all `series_yesno`, status draft. Validator: 24 files, 0 problem(s).

| Series | Objective | Domain | Answers | Difficulty |
| --- | --- | --- | --- | --- |
| dp600-sr1-ledger-auditors | 1.1.2 | maintain | N Y N | 1 1 2 |
| dp600-sr1-merged-model | 1.2.1 | maintain | N N Y | 1 3 2 |
| dp600-sr1-monthly-sales | 2.2.5 | prepare | Y N N | 1 2 3 |
| dp600-sr1-inactive-customers | 2.2.6 | prepare | Y N Y | 2 2 1 |
| dp600-sr1-live-orders | 3.1.1 | semantic-models | Y N N | 2 1 3 |
| dp600-sr1-joint-accounts | 3.1.3 | semantic-models | N N Y | 1 3 2 |

Mix: 6 easy / 8 medium / 4 hard. Two series per domain. Objectives were chosen to avoid decisions already tested by the DP-600 case studies (2.2.5, 2.2.6 and 3.1.1 had no question; 1.2.1 tests update vs commit and role + Git permission, not branch-out).

## Sources fetched (2026-11-17)

- Share your data and manage permissions (warehouse: Read = connect only, ReadData, ReadAll, GRANT).
- Roles in workspaces in Microsoft Fabric (Viewer reads warehouse data with T-SQL; Contributor writes).
- Basic concepts in Git integration; Get started with Git integration (Commit/Update direction, Update syncs whole branch, commits disabled while updates pending, Viewer can't perform any Git action, Contributor + Git Read for update; Updates > Update all).
- Tables in Fabric Data Warehouse (CTAS); SELECT - GROUP BY clause (Transact-SQL) (applies to Fabric Warehouse, expressions of grouping columns).
- Merge queries overview; Left anti join (left table = first selected; join kinds); fr-fr Merge queries overview for French labels.
- Table storage mode in Power BI semantic models (en-us + fr-fr: Dual / « Double », limited vs regular / « relations régulières », Dual queries hit cache when possible).
- Many-to-many relationship guidance (bridge table, Both on Account–AccountCustomer).

## Choices and doubts

- Code fences in monthly-sales use `sql` (the ai-103 series already use `python` in solutions); change to `text` if the renderer only highlights the course languages.
- French Power Query labels follow the fr-fr Learn page (« Requêtes de fusion en tant que nouvelles », « Jointure externe gauche », « Anti jointure gauche ») with the English label in parentheses; the DP-600 course uses the shorter « Externe gauche » / « Anti gauche ».
- Git tab and button names (Changes, Updates, Update all, Commit) kept in English in French text, as portal labels.
- live-orders-2: hourly refresh assumes the capacity allows it; the answer (No) doesn't depend on refresh frequency.
- inactive-customers-3: after a left anti merge the new column holds empty tables (the Learn example shows nulls after expansion); the solution removes it either way.
