# Task FIX-sc-100-2 — course and bank corrections, SC-100, chapters 23-privileged-access, 24-regulatory-compliance, 31-posture-management, 32-endpoints, 33-cloud-services

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-100.md`.

Your chapters (and the only bank objectives you may touch):
- `23-privileged-access`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6, 2.3.7; findings in `factory/reports/QZ-sc-100-23-privileged-access.md`
- `24-regulatory-compliance`: objectives 2.4.1, 2.4.2, 2.4.3, 2.4.4; findings in `factory/reports/QZ-sc-100-24-regulatory-compliance.md`
- `31-posture-management`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7; findings in `factory/reports/QZ-sc-100-31-posture-management.md`
- `32-endpoints`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6; findings in `factory/reports/QZ-sc-100-32-endpoints.md`
- `33-cloud-services`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6; findings in `factory/reports/QZ-sc-100-33-cloud-services.md`

Report: `factory/reports/FIX-sc-100-2.md`.

Checks: `npx tsx factory/check-cert.ts sc-100 23-privileged-access 24-regulatory-compliance 31-posture-management 32-endpoints 33-cloud-services`; `npm run -s content:validate -- --cert sc-100`; `npx tsx factory/check-quiz.ts sc-100 23-privileged-access 24-regulatory-compliance 31-posture-management 32-endpoints 33-cloud-services`.
