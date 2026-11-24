# Task FIX-sc-200-2 — course and bank corrections, SC-200, chapters 22-xdr-incidents, 23-endpoint-response, 24-m365-activities, 31-xdr-hunting, 32-sentinel-hunting

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-200.md`.

Your chapters (and the only bank objectives you may touch):
- `22-xdr-incidents`: objectives 2.1.7, 2.1.8, 2.1.9, 2.1.10; findings in `factory/reports/QZ-sc-200-22-xdr-incidents.md`
- `23-endpoint-response`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4; findings in `factory/reports/QZ-sc-200-23-endpoint-response.md`
- `24-m365-activities`: objectives 2.3.1, 2.3.2, 2.3.3; findings in `factory/reports/QZ-sc-200-24-m365-activities.md`
- `31-xdr-hunting`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6; findings in `factory/reports/QZ-sc-200-31-xdr-hunting.md`
- `32-sentinel-hunting`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4; findings in `factory/reports/QZ-sc-200-32-sentinel-hunting.md`

Report: `factory/reports/FIX-sc-200-2.md`.

Checks: `npx tsx factory/check-cert.ts sc-200 22-xdr-incidents 23-endpoint-response 24-m365-activities 31-xdr-hunting 32-sentinel-hunting`; `npm run -s content:validate -- --cert sc-200`; `npx tsx factory/check-quiz.ts sc-200 22-xdr-incidents 23-endpoint-response 24-m365-activities 31-xdr-hunting 32-sentinel-hunting`.
