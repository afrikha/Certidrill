# Task FIX-az-400-3 — course and bank corrections, AZ-400, chapters 42-sensitive-information, 43-security-scanning, 51-monitoring, 52-metrics-analysis

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-400.md`.

Your chapters (and the only bank objectives you may touch):
- `42-sensitive-information`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4; findings in `factory/reports/QZ-az-400-42-sensitive-information.md`
- `43-security-scanning`: objectives 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5, 4.3.6; findings in `factory/reports/QZ-az-400-43-security-scanning.md`
- `51-monitoring`: objectives 5.1.1, 5.1.2, 5.1.3, 5.1.4; findings in `factory/reports/QZ-az-400-51-monitoring.md`
- `52-metrics-analysis`: objectives 5.2.1, 5.2.2, 5.2.3, 5.2.4; findings in `factory/reports/QZ-az-400-52-metrics-analysis.md`

Report: `factory/reports/FIX-az-400-3.md`.

Checks: `npx tsx factory/check-cert.ts az-400 42-sensitive-information 43-security-scanning 51-monitoring 52-metrics-analysis`; `npm run -s content:validate -- --cert az-400`; `npx tsx factory/check-quiz.ts az-400 42-sensitive-information 43-security-scanning 51-monitoring 52-metrics-analysis`.
