# Task FIX-dp-800-2 — course and bank corrections, DP-800, chapters 23-cicd-database-projects, 24-azure-integration, 31-models-embeddings, 32-search-design, 33-vector-hybrid-search, 34-rag

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-800.md`.

Your chapters (and the only bank objectives you may touch):
- `23-cicd-database-projects`: objectives 2.3.3, 2.3.4, 2.3.2, 2.3.5, 2.3.1, 2.3.6, 2.3.7, 2.3.8, 2.3.9; findings in `factory/reports/QZ-dp-800-23-cicd-database-projects.md`
- `24-azure-integration`: objectives 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6, 2.4.7; findings in `factory/reports/QZ-dp-800-24-azure-integration.md`
- `31-models-embeddings`: objectives 3.1.1, 3.1.2, 3.1.4, 3.1.5, 3.1.6, 3.1.3; findings in `factory/reports/QZ-dp-800-31-models-embeddings.md`
- `32-search-design`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5; findings in `factory/reports/QZ-dp-800-32-search-design.md`
- `33-vector-hybrid-search`: objectives 3.2.6, 3.2.7, 3.2.8, 3.2.9, 3.2.10; findings in `factory/reports/QZ-dp-800-33-vector-hybrid-search.md`
- `34-rag`: objectives 3.3.1, 3.3.3, 3.3.2, 3.3.4, 3.3.5; findings in `factory/reports/QZ-dp-800-34-rag.md`

Report: `factory/reports/FIX-dp-800-2.md`.

Checks: `npx tsx factory/check-cert.ts dp-800 23-cicd-database-projects 24-azure-integration 31-models-embeddings 32-search-design 33-vector-hybrid-search 34-rag`; `npm run -s content:validate -- --cert dp-800`; `npx tsx factory/check-quiz.ts dp-800 23-cicd-database-projects 24-azure-integration 31-models-embeddings 32-search-design 33-vector-hybrid-search 34-rag`.
