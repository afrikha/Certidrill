# Task FIX-az-140-3 — course and bank corrections, AZ-140, chapters 34-app-delivery, 35-microsoft-365-apps, 41-monitoring, 42-updates-backup-dr

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-140.md`.

Your chapters (and the only bank objectives you may touch):
- `34-app-delivery`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.9, 3.3.10; findings in `factory/reports/QZ-az-140-34-app-delivery.md`
- `35-microsoft-365-apps`: objectives 3.3.5, 3.3.6, 3.3.7, 3.3.8; findings in `factory/reports/QZ-az-140-35-microsoft-365-apps.md`
- `41-monitoring`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6; findings in `factory/reports/QZ-az-140-41-monitoring.md`
- `42-updates-backup-dr`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5; findings in `factory/reports/QZ-az-140-42-updates-backup-dr.md`

Report: `factory/reports/FIX-az-140-3.md`.

Checks: `npx tsx factory/check-cert.ts az-140 34-app-delivery 35-microsoft-365-apps 41-monitoring 42-updates-backup-dr`; `npm run -s content:validate -- --cert az-140`; `npx tsx factory/check-quiz.ts az-140 34-app-delivery 35-microsoft-365-apps 41-monitoring 42-updates-backup-dr`.
