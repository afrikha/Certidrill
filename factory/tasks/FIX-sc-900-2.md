# Task FIX-sc-900-2 — course and bank corrections, SC-900, chapters 24-identity-protection-governance, 31-azure-infrastructure-security, 32-defender-for-cloud, 33-sentinel, 34-defender-xdr

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-900.md`.

Your chapters (and the only bank objectives you may touch):
- `24-identity-protection-governance`: objectives 2.4.1, 2.4.2, 2.4.3, 2.4.4; findings in `factory/reports/QZ-sc-900-24-identity-protection-governance.md`
- `31-azure-infrastructure-security`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7; findings in `factory/reports/QZ-sc-900-31-azure-infrastructure-security.md`
- `32-defender-for-cloud`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4; findings in `factory/reports/QZ-sc-900-32-defender-for-cloud.md`
- `33-sentinel`: objectives 3.3.1, 3.3.2; findings in `factory/reports/QZ-sc-900-33-sentinel.md`
- `34-defender-xdr`: objectives 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5, 3.4.6, 3.4.7, 3.4.8; findings in `factory/reports/QZ-sc-900-34-defender-xdr.md`

Report: `factory/reports/FIX-sc-900-2.md`.

Checks: `npx tsx factory/check-cert.ts sc-900 24-identity-protection-governance 31-azure-infrastructure-security 32-defender-for-cloud 33-sentinel 34-defender-xdr`; `npm run -s content:validate -- --cert sc-900`; `npx tsx factory/check-quiz.ts sc-900 24-identity-protection-governance 31-azure-infrastructure-security 32-defender-for-cloud 33-sentinel 34-defender-xdr`.
