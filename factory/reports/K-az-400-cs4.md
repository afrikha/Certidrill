# K-az-400-cs4 — report

Two case studies, 12 questions, all `status: draft`. Validator: `CERT=az-400 npx tsx factory/validate.ts --prefix az400-cs4` -> 0 problem(s).

## Case studies

- `az400-cs4a-humongous-insurance` (insurance, Azure DevOps + App Service + private Azure SQL): agent-pool (3.3.2), service-connection (4.1.3), feed-views (3.1.2), db-slot-order (3.4.8), branch-policies (2.1.2), kql-sql-duration (5.2.4).
- `az400-cs4b-alpine-ski-house` (ski resorts, GitHub Enterprise Cloud + Azure Container Apps): oidc-login (4.2.2), feature-targeting (3.4.6), blue-green (3.4.1), codeowners-ruleset (2.1.3), ghas-features (4.3.1), trace-latency (5.2.3).

Types: single 4, dropdown 2, dragdrop 2, yesno_statements 2, multi 1, ordering 1. Difficulty: 1 = 3, 2 = 6, 3 = 3.

## Overlap with existing series (checked)

- The sr1 OIDC series tests the federated credential entity type (Environment vs Branch). In cs4b the credential is given, and the question tests `environment:`, `id-token: write` and `client-id`.
- The sr2 feature-flag series tests where to configure the targeting audience. cs4b tests how default percentage, inclusion and exclusion combine.
- The sr1 KQL series tests the top failing requests. cs4a tests the dependency table and percentile/timechart.

## Doubts and points to check

- I could not fetch the `SqlAzureDacpacDeployment@1` task reference page (fetch error), so the ordering question names no task. The reference is the "Deploy to Azure SQL Database" page.
- I could not get the exact title of the Managed DevOps Pools overview page, so I left that reference out. The agent-pool question cites "Configure networking" (VNet injection, subnet delegation, private endpoints). The claim that agents can use the same software as Microsoft-hosted agents comes from the fetched overview page.
- The GitHub rulesets and CODEOWNERS references are Microsoft Learn training units, because Learn has no reference page for them. The case does not claim that repository admins cannot edit organization rulesets.
- The Container Apps blue-green explanation avoids saying how a rollback works in single revision mode. It only says that traffic weights need multiple revision mode.
- The French uses « ensemble de règles » for rulesets and « protection push » for push protection. Please review these two terms.
- The web-fetch hourly limit was reached near the end. Every fact used was fetched before the limit, except the items listed above.
