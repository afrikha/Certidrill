# Task FIX-sc-100-3 — course and bank corrections, SC-100, chapters 34-network-sse, 41-microsoft-365, 42-applications, 43-data

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-100.md`.

Your chapters (and the only bank objectives you may touch):
- `34-network-sse`: objectives 3.4.1, 3.4.2, 3.4.3, 3.4.4; findings in `factory/reports/QZ-sc-100-34-network-sse.md`
- `41-microsoft-365`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5; findings in `factory/reports/QZ-sc-100-41-microsoft-365.md`
- `42-applications`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6, 4.2.7, 4.2.8; findings in `factory/reports/QZ-sc-100-42-applications.md`
- `43-data`: objectives 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5, 4.3.6, 4.3.7; findings in `factory/reports/QZ-sc-100-43-data.md`

Report: `factory/reports/FIX-sc-100-3.md`.

Checks: `npx tsx factory/check-cert.ts sc-100 34-network-sse 41-microsoft-365 42-applications 43-data`; `npm run -s content:validate -- --cert sc-100`; `npx tsx factory/check-quiz.ts sc-100 34-network-sse 41-microsoft-365 42-applications 43-data`.
