# Task FIX-sc-900-3 — course and bank corrections, SC-900, chapters 41-service-trust-privacy, 42-purview-compliance-management, 43-information-protection-governance, 44-insider-risk-ediscovery-audit

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-900.md`.

Your chapters (and the only bank objectives you may touch):
- `41-service-trust-privacy`: objectives 4.1.1, 4.1.2; findings in `factory/reports/QZ-sc-900-41-service-trust-privacy.md`
- `42-purview-compliance-management`: objectives 4.2.1, 4.2.2, 4.2.3; findings in `factory/reports/QZ-sc-900-42-purview-compliance-management.md`
- `43-information-protection-governance`: objectives 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.6, 4.3.5; findings in `factory/reports/QZ-sc-900-43-information-protection-governance.md`
- `44-insider-risk-ediscovery-audit`: objectives 4.4.1, 4.4.2, 4.4.3; findings in `factory/reports/QZ-sc-900-44-insider-risk-ediscovery-audit.md`

Report: `factory/reports/FIX-sc-900-3.md`.

Checks: `npx tsx factory/check-cert.ts sc-900 41-service-trust-privacy 42-purview-compliance-management 43-information-protection-governance 44-insider-risk-ediscovery-audit`; `npm run -s content:validate -- --cert sc-900`; `npx tsx factory/check-quiz.ts sc-900 41-service-trust-privacy 42-purview-compliance-management 43-information-protection-governance 44-insider-risk-ediscovery-audit`.
