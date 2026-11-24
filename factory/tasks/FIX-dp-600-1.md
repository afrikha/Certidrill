# Task FIX-dp-600-1 — course and bank corrections, DP-600, chapters 11-security-governance, 12-development-lifecycle, 21-get-data, 22-transform-data

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-600.md`.

Your chapters (and the only bank objectives you may touch):
- `11-security-governance`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5; findings in `factory/reports/QZ-dp-600-11-security-governance.md`
- `12-development-lifecycle`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6; findings in `factory/reports/QZ-dp-600-12-development-lifecycle.md`
- `21-get-data`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5; findings in `factory/reports/QZ-dp-600-21-get-data.md`
- `22-transform-data`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.2.8, 2.2.9; findings in `factory/reports/QZ-dp-600-22-transform-data.md`

Report: `factory/reports/FIX-dp-600-1.md`.

Checks: `npx tsx factory/check-cert.ts dp-600 11-security-governance 12-development-lifecycle 21-get-data 22-transform-data`; `npm run -s content:validate -- --cert dp-600`; `npx tsx factory/check-quiz.ts dp-600 11-security-governance 12-development-lifecycle 21-get-data 22-transform-data`.
