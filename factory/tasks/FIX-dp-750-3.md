# Task FIX-dp-750-3 — course and bank corrections, DP-750, chapters 42-lakeflow-jobs, 43-development-lifecycle, 44-monitoring-optimization

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-750.md`.

Your chapters (and the only bank objectives you may touch):
- `42-lakeflow-jobs`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5; findings in `factory/reports/QZ-dp-750-42-lakeflow-jobs.md`
- `43-development-lifecycle`: objectives 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5, 4.3.6; findings in `factory/reports/QZ-dp-750-43-development-lifecycle.md`
- `44-monitoring-optimization`: objectives 4.4.1, 4.4.2, 4.4.3, 4.4.4, 4.4.5, 4.4.6, 4.4.7; findings in `factory/reports/QZ-dp-750-44-monitoring-optimization.md`

Report: `factory/reports/FIX-dp-750-3.md`.

Checks: `npx tsx factory/check-cert.ts dp-750 42-lakeflow-jobs 43-development-lifecycle 44-monitoring-optimization`; `npm run -s content:validate -- --cert dp-750`; `npx tsx factory/check-quiz.ts dp-750 42-lakeflow-jobs 43-development-lifecycle 44-monitoring-optimization`.
