# Task FIX-az-120-2 — course and bank corrections, AZ-120, chapters 23-storage, 31-high-availability, 32-disaster-recovery, 41-performance-costs, 42-monitoring-operations

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-120.md`.

Your chapters (and the only bank objectives you may touch):
- `23-storage`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6, 2.3.7, 2.3.8, 2.3.9; findings in `factory/reports/QZ-az-120-23-storage.md`
- `31-high-availability`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.1.8, 3.1.9; findings in `factory/reports/QZ-az-120-31-high-availability.md`
- `32-disaster-recovery`: objectives 3.2.2, 3.2.1, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8; findings in `factory/reports/QZ-az-120-32-disaster-recovery.md`
- `41-performance-costs`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6, 4.1.7; findings in `factory/reports/QZ-az-120-41-performance-costs.md`
- `42-monitoring-operations`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6, 4.2.7, 4.2.8, 4.2.9; findings in `factory/reports/QZ-az-120-42-monitoring-operations.md`

Report: `factory/reports/FIX-az-120-2.md`.

Checks: `npx tsx factory/check-cert.ts az-120 23-storage 31-high-availability 32-disaster-recovery 41-performance-costs 42-monitoring-operations`; `npm run -s content:validate -- --cert az-120`; `npx tsx factory/check-quiz.ts az-120 23-storage 31-high-availability 32-disaster-recovery 41-performance-costs 42-monitoring-operations`.
