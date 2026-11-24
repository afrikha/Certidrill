# Task FIX-dp-300-3 — course and bank corrections, DP-300, chapters 42-automated-deployment, 43-azure-database-tasks, 51-hadr-strategy, 52-backup-restore, 53-configure-hadr

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-300.md`.

Your chapters (and the only bank objectives you may touch):
- `42-automated-deployment`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4; findings in `factory/reports/QZ-dp-300-42-automated-deployment.md`
- `43-azure-database-tasks`: objectives 4.3.1, 4.3.2, 4.3.3, 4.3.4; findings in `factory/reports/QZ-dp-300-43-azure-database-tasks.md`
- `51-hadr-strategy`: objectives 5.1.1, 5.1.2, 5.1.3, 5.1.4; findings in `factory/reports/QZ-dp-300-51-hadr-strategy.md`
- `52-backup-restore`: objectives 5.2.1, 5.2.2, 5.2.6, 5.2.3, 5.2.4, 5.2.5, 5.2.7; findings in `factory/reports/QZ-dp-300-52-backup-restore.md`
- `53-configure-hadr`: objectives 5.3.1, 5.3.2, 5.3.3, 5.3.4, 5.3.5, 5.3.6, 5.3.7; findings in `factory/reports/QZ-dp-300-53-configure-hadr.md`

Report: `factory/reports/FIX-dp-300-3.md`.

Checks: `npx tsx factory/check-cert.ts dp-300 42-automated-deployment 43-azure-database-tasks 51-hadr-strategy 52-backup-restore 53-configure-hadr`; `npm run -s content:validate -- --cert dp-300`; `npx tsx factory/check-quiz.ts dp-300 42-automated-deployment 43-azure-database-tasks 51-hadr-strategy 52-backup-restore 53-configure-hadr`.
