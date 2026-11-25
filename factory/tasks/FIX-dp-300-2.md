# Task FIX-dp-300-2 — course and bank corrections, DP-300, chapters 23-compliance-controls, 31-monitor-activity, 32-query-performance, 33-optimal-configuration, 41-sql-agent-jobs

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-300.md`.

Your chapters (and the only bank objectives you may touch):
- `23-compliance-controls`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6; findings in `factory/reports/QZ-dp-300-23-compliance-controls.md`
- `31-monitor-activity`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6; findings in `factory/reports/QZ-dp-300-31-monitor-activity.md`
- `32-query-performance`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8; findings in `factory/reports/QZ-dp-300-32-query-performance.md`
- `33-optimal-configuration`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7, 3.3.8, 3.3.9; findings in `factory/reports/QZ-dp-300-33-optimal-configuration.md`
- `41-sql-agent-jobs`: objectives 4.1.1, 4.1.3, 4.1.2; findings in `factory/reports/QZ-dp-300-41-sql-agent-jobs.md`

Report: `factory/reports/FIX-dp-300-2.md`.

Checks: `npx tsx factory/check-cert.ts dp-300 23-compliance-controls 31-monitor-activity 32-query-performance 33-optimal-configuration 41-sql-agent-jobs`; `npm run -s content:validate -- --cert dp-300`; `npx tsx factory/check-quiz.ts dp-300 23-compliance-controls 31-monitor-activity 32-query-performance 33-optimal-configuration 41-sql-agent-jobs`.
