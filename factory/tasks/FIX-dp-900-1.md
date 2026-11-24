# Task FIX-dp-900-1 — course and bank corrections, DP-900, chapters 11-data-representation, 12-data-storage, 13-data-workloads, 14-data-roles, 21-relational-concepts, 22-azure-relational-services

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-900.md`.

Your chapters (and the only bank objectives you may touch):
- `11-data-representation`: objectives 1.1.1, 1.1.2, 1.1.3; findings in `factory/reports/QZ-dp-900-11-data-representation.md`
- `12-data-storage`: objectives 1.2.1, 1.2.2, 1.2.3; findings in `factory/reports/QZ-dp-900-12-data-storage.md`
- `13-data-workloads`: objectives 1.3.1, 1.3.2; findings in `factory/reports/QZ-dp-900-13-data-workloads.md`
- `14-data-roles`: objectives 1.4.1, 1.4.2, 1.4.3; findings in `factory/reports/QZ-dp-900-14-data-roles.md`
- `21-relational-concepts`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4; findings in `factory/reports/QZ-dp-900-21-relational-concepts.md`
- `22-azure-relational-services`: objectives 2.2.1, 2.2.2; findings in `factory/reports/QZ-dp-900-22-azure-relational-services.md`

Report: `factory/reports/FIX-dp-900-1.md`.

Checks: `npx tsx factory/check-cert.ts dp-900 11-data-representation 12-data-storage 13-data-workloads 14-data-roles 21-relational-concepts 22-azure-relational-services`; `npm run -s content:validate -- --cert dp-900`; `npx tsx factory/check-quiz.ts dp-900 11-data-representation 12-data-storage 13-data-workloads 14-data-roles 21-relational-concepts 22-azure-relational-services`.
