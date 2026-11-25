# Task FIX-dp-300-1 — course and bank corrections, DP-300, chapters 11-deploy-azure-sql, 12-scale-performance, 13-migration, 21-authentication-authorization, 22-data-protection

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-300.md`.

Your chapters (and the only bank objectives you may touch):
- `11-deploy-azure-sql`: objectives 1.1.1, 1.1.2, 1.1.7, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.8, 1.1.9; findings in `factory/reports/QZ-dp-300-11-deploy-azure-sql.md`
- `12-scale-performance`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5; findings in `factory/reports/QZ-dp-300-12-scale-performance.md`
- `13-migration`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7, 1.3.8; findings in `factory/reports/QZ-dp-300-13-migration.md`
- `21-authentication-authorization`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7, 2.1.8; findings in `factory/reports/QZ-dp-300-21-authentication-authorization.md`
- `22-data-protection`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6; findings in `factory/reports/QZ-dp-300-22-data-protection.md`

Report: `factory/reports/FIX-dp-300-1.md`.

Checks: `npx tsx factory/check-cert.ts dp-300 11-deploy-azure-sql 12-scale-performance 13-migration 21-authentication-authorization 22-data-protection`; `npm run -s content:validate -- --cert dp-300`; `npx tsx factory/check-quiz.ts dp-300 11-deploy-azure-sql 12-scale-performance 13-migration 21-authentication-authorization 22-data-protection`.
