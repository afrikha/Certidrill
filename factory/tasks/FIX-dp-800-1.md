# Task FIX-dp-800-1 — course and bank corrections, DP-800, chapters 11-database-objects, 12-programmability, 13-advanced-tsql, 14-ai-assisted-tools, 21-security-compliance, 22-performance

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-800.md`.

Your chapters (and the only bank objectives you may touch):
- `11-database-objects`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6; findings in `factory/reports/QZ-dp-800-11-database-objects.md`
- `12-programmability`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5; findings in `factory/reports/QZ-dp-800-12-programmability.md`
- `13-advanced-tsql`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7, 1.3.8; findings in `factory/reports/QZ-dp-800-13-advanced-tsql.md`
- `14-ai-assisted-tools`: objectives 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5; findings in `factory/reports/QZ-dp-800-14-ai-assisted-tools.md`
- `21-security-compliance`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7, 2.1.8; findings in `factory/reports/QZ-dp-800-21-security-compliance.md`
- `22-performance`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4; findings in `factory/reports/QZ-dp-800-22-performance.md`

Report: `factory/reports/FIX-dp-800-1.md`.

Checks: `npx tsx factory/check-cert.ts dp-800 11-database-objects 12-programmability 13-advanced-tsql 14-ai-assisted-tools 21-security-compliance 22-performance`; `npm run -s content:validate -- --cert dp-800`; `npx tsx factory/check-quiz.ts dp-800 11-database-objects 12-programmability 13-advanced-tsql 14-ai-assisted-tools 21-security-compliance 22-performance`.
