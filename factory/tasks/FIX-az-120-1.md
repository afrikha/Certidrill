# Task FIX-az-120-1 — course and bank corrections, AZ-120, chapters 11-target-requirements, 12-azure-environment, 13-sap-rise, 21-compute, 22-networking

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-120.md`.

Your chapters (and the only bank objectives you may touch):
- `11-target-requirements`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.7, 1.1.8, 1.1.9; findings in `factory/reports/QZ-az-120-11-target-requirements.md`
- `12-azure-environment`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6; findings in `factory/reports/QZ-az-120-12-azure-environment.md`
- `13-sap-rise`: objectives 1.3.1, 1.3.3, 1.3.2, 1.3.4, 1.3.5; findings in `factory/reports/QZ-az-120-13-sap-rise.md`
- `21-compute`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7; findings in `factory/reports/QZ-az-120-21-compute.md`
- `22-networking`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.2.8, 2.2.9; findings in `factory/reports/QZ-az-120-22-networking.md`

Report: `factory/reports/FIX-az-120-1.md`.

Checks: `npx tsx factory/check-cert.ts az-120 11-target-requirements 12-azure-environment 13-sap-rise 21-compute 22-networking`; `npm run -s content:validate -- --cert az-120`; `npx tsx factory/check-quiz.ts az-120 11-target-requirements 12-azure-environment 13-sap-rise 21-compute 22-networking`.
