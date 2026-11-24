# Task FIX-az-900-1 — course and bank corrections, AZ-900, chapters 11-cloud-computing, 12-cloud-benefits, 13-service-types, 21-core-architecture, 22-compute-networking, 23-storage

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-900.md`.

Your chapters (and the only bank objectives you may touch):
- `11-cloud-computing`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.7; findings in `factory/reports/QZ-az-900-11-cloud-computing.md`
- `12-cloud-benefits`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4; findings in `factory/reports/QZ-az-900-12-cloud-benefits.md`
- `13-service-types`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4; findings in `factory/reports/QZ-az-900-13-service-types.md`
- `21-core-architecture`: objectives 2.1.1, 2.1.3, 2.1.2, 2.1.4, 2.1.5, 2.1.6, 2.1.7; findings in `factory/reports/QZ-az-900-21-core-architecture.md`
- `22-compute-networking`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6; findings in `factory/reports/QZ-az-900-22-compute-networking.md`
- `23-storage`: objectives 2.3.4, 2.3.1, 2.3.2, 2.3.3, 2.3.5, 2.3.6; findings in `factory/reports/QZ-az-900-23-storage.md`

Report: `factory/reports/FIX-az-900-1.md`.

Checks: `npx tsx factory/check-cert.ts az-900 11-cloud-computing 12-cloud-benefits 13-service-types 21-core-architecture 22-compute-networking 23-storage`; `npm run -s content:validate -- --cert az-900`; `npx tsx factory/check-quiz.ts az-900 11-cloud-computing 12-cloud-benefits 13-service-types 21-core-architecture 22-compute-networking 23-storage`.
