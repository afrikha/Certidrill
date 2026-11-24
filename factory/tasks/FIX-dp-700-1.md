# Task FIX-dp-700-1 — course and bank corrections, DP-700, chapters 11-workspace-settings, 12-lifecycle-management, 13-security-governance, 14-orchestration, 21-loading-patterns

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-700.md`.

Your chapters (and the only bank objectives you may touch):
- `11-workspace-settings`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4; findings in `factory/reports/QZ-dp-700-11-workspace-settings.md`
- `12-lifecycle-management`: objectives 1.2.1, 1.2.2, 1.2.3; findings in `factory/reports/QZ-dp-700-12-lifecycle-management.md`
- `13-security-governance`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.8, 1.3.4, 1.3.5, 1.3.6, 1.3.7; findings in `factory/reports/QZ-dp-700-13-security-governance.md`
- `14-orchestration`: objectives 1.4.1, 1.4.2, 1.4.3; findings in `factory/reports/QZ-dp-700-14-orchestration.md`
- `21-loading-patterns`: objectives 2.1.1, 2.1.2, 2.1.3; findings in `factory/reports/QZ-dp-700-21-loading-patterns.md`

Report: `factory/reports/FIX-dp-700-1.md`.

Checks: `npx tsx factory/check-cert.ts dp-700 11-workspace-settings 12-lifecycle-management 13-security-governance 14-orchestration 21-loading-patterns`; `npm run -s content:validate -- --cert dp-700`; `npx tsx factory/check-quiz.ts dp-700 11-workspace-settings 12-lifecycle-management 13-security-governance 14-orchestration 21-loading-patterns`.
