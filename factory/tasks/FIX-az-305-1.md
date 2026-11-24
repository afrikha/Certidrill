# Task FIX-az-305-1 — course and bank corrections, AZ-305, chapters 11-logging-monitoring, 12-authentication-authorization, 13-governance, 21-relational-data, 22-nonrelational-data, 23-data-integration

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-305.md`.

Your chapters (and the only bank objectives you may touch):
- `11-logging-monitoring`: objectives 1.1.1, 1.1.2, 1.1.3; findings in `factory/reports/QZ-az-305-11-logging-monitoring.md`
- `12-authentication-authorization`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5; findings in `factory/reports/QZ-az-305-12-authentication-authorization.md`
- `13-governance`: objectives 1.3.1, 1.3.2, 1.3.3; findings in `factory/reports/QZ-az-305-13-governance.md`
- `21-relational-data`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4; findings in `factory/reports/QZ-az-305-21-relational-data.md`
- `22-nonrelational-data`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4; findings in `factory/reports/QZ-az-305-22-nonrelational-data.md`
- `23-data-integration`: objectives 2.3.1, 2.3.2; findings in `factory/reports/QZ-az-305-23-data-integration.md`

Report: `factory/reports/FIX-az-305-1.md`.

Checks: `npx tsx factory/check-cert.ts az-305 11-logging-monitoring 12-authentication-authorization 13-governance 21-relational-data 22-nonrelational-data 23-data-integration`; `npm run -s content:validate -- --cert az-305`; `npx tsx factory/check-quiz.ts az-305 11-logging-monitoring 12-authentication-authorization 13-governance 21-relational-data 22-nonrelational-data 23-data-integration`.
