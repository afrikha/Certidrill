# QZ-dp-900-14-data-roles — report

File: `content/dp-900/quizzes/14-data-roles.yaml` (10 questions, objectives 1.4.1 ×4, 1.4.2 ×3, 1.4.3 ×3). Check: `npx tsx factory/check-quiz.ts dp-900 14-data-roles` → 0 problem(s), 0 warning(s).

Pages fetched (2026-11-24): Explore job roles in the world of data (`explore-roles-responsibilities-world-of-data/2-explore-job-roles`), Identify data services (`explore-roles-responsibilities-world-of-data/3-data-services`).

## Chapter vs current Learn
- No wrong fact found. The roles, the AI engineer with Microsoft Foundry, the AI-assistance notes and "one person, several roles" match the current page.
- Not in the chapter (no impact on the quiz): Learn's data services page now says Fabric Data Factory is the built-in version of Data Factory, recommended when all data work is in Fabric; it lists Microsoft Fabric IQ (preview, for business users and AI agents); and it says Azure Cosmos DB is sometimes managed by database administrators but often by software developers. Worth a line in the chapter if the course is revised (Fabric IQ is preview: keep it out of questions).

## Doubts
- The mock bank has 36 questions on 1.4.x; almost every task of the chapter's table is already tested. The quiz uses other tasks and traps (PostgreSQL provisioning, privacy-in-transit vs access to a table, stream ingestion vs telemetry analysis, availability/performance trap on a recovery need, engineer/analyst split of transform vs model, ADX + Power BI together).
- Q7 s1 and Q10 t1/t2 rely on the split "data engineer = privacy of data moving between stores; administrator = access to data in a database". Learn states both, but the boundary is implicit; the explanations spell it out.
- Q9 uses `UPDATE` without `WHERE` (elementary SQL, within DP-900 level).
