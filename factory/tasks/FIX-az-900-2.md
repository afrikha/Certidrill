# Task FIX-az-900-2 — course and bank corrections, AZ-900, chapters 24-identity-security, 31-cost-management, 32-governance-compliance, 33-management-tools, 34-monitoring

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-900.md`.

Your chapters (and the only bank objectives you may touch):
- `24-identity-security`: objectives 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6, 2.4.7, 2.4.8; findings in `factory/reports/QZ-az-900-24-identity-security.md`
- `31-cost-management`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4; findings in `factory/reports/QZ-az-900-31-cost-management.md`
- `32-governance-compliance`: objectives 3.2.1, 3.2.2, 3.2.3; findings in `factory/reports/QZ-az-900-32-governance-compliance.md`
- `33-management-tools`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5; findings in `factory/reports/QZ-az-900-33-management-tools.md`
- `34-monitoring`: objectives 3.4.1, 3.4.2, 3.4.3; findings in `factory/reports/QZ-az-900-34-monitoring.md`

Report: `factory/reports/FIX-az-900-2.md`.

Checks: `npx tsx factory/check-cert.ts az-900 24-identity-security 31-cost-management 32-governance-compliance 33-management-tools 34-monitoring`; `npm run -s content:validate -- --cert az-900`; `npx tsx factory/check-quiz.ts az-900 24-identity-security 31-cost-management 32-governance-compliance 33-management-tools 34-monitoring`.
