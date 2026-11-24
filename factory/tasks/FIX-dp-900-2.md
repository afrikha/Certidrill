# Task FIX-dp-900-2 — course and bank corrections, DP-900, chapters 31-azure-storage, 32-cosmos-db, 41-large-scale-analytics, 42-real-time-analytics, 43-power-bi

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-900.md`.

Your chapters (and the only bank objectives you may touch):
- `31-azure-storage`: objectives 3.1.1, 3.1.2, 3.1.3; findings in `factory/reports/QZ-dp-900-31-azure-storage.md`
- `32-cosmos-db`: objectives 3.2.1, 3.2.2; findings in `factory/reports/QZ-dp-900-32-cosmos-db.md`
- `41-large-scale-analytics`: objectives 4.1.1, 4.1.2, 4.1.3; findings in `factory/reports/QZ-dp-900-41-large-scale-analytics.md`
- `42-real-time-analytics`: objectives 4.2.1, 4.2.2; findings in `factory/reports/QZ-dp-900-42-real-time-analytics.md`
- `43-power-bi`: objectives 4.3.1, 4.3.2, 4.3.3; findings in `factory/reports/QZ-dp-900-43-power-bi.md`

Report: `factory/reports/FIX-dp-900-2.md`.

Checks: `npx tsx factory/check-cert.ts dp-900 31-azure-storage 32-cosmos-db 41-large-scale-analytics 42-real-time-analytics 43-power-bi`; `npm run -s content:validate -- --cert dp-900`; `npx tsx factory/check-quiz.ts dp-900 31-azure-storage 32-cosmos-db 41-large-scale-analytics 42-real-time-analytics 43-power-bi`.
