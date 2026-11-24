# Task FIX-az-400-1 — course and bank corrections, AZ-400, chapters 11-flow-of-work, 12-metrics-queries, 13-collaboration, 21-branching, 22-repositories, 31-package-management

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-400.md`.

Your chapters (and the only bank objectives you may touch):
- `11-flow-of-work`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4; findings in `factory/reports/QZ-az-400-11-flow-of-work.md`
- `12-metrics-queries`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7; findings in `factory/reports/QZ-az-400-12-metrics-queries.md`
- `13-collaboration`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6; findings in `factory/reports/QZ-az-400-13-collaboration.md`
- `21-branching`: objectives 2.1.1, 2.1.2, 2.1.3; findings in `factory/reports/QZ-az-400-21-branching.md`
- `22-repositories`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6; findings in `factory/reports/QZ-az-400-22-repositories.md`
- `31-package-management`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4; findings in `factory/reports/QZ-az-400-31-package-management.md`

Report: `factory/reports/FIX-az-400-1.md`.

Checks: `npx tsx factory/check-cert.ts az-400 11-flow-of-work 12-metrics-queries 13-collaboration 21-branching 22-repositories 31-package-management`; `npm run -s content:validate -- --cert az-400`; `npx tsx factory/check-quiz.ts az-400 11-flow-of-work 12-metrics-queries 13-collaboration 21-branching 22-repositories 31-package-management`.
