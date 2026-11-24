# Task FIX-sc-900-1 — course and bank corrections, SC-900, chapters 11-security-compliance-concepts, 12-identity-concepts, 21-entra-id-identities, 22-authentication, 23-access-management

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-900.md`.

Your chapters (and the only bank objectives you may touch):
- `11-security-compliance-concepts`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5; findings in `factory/reports/QZ-sc-900-11-security-compliance-concepts.md`
- `12-identity-concepts`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6; findings in `factory/reports/QZ-sc-900-12-identity-concepts.md`
- `21-entra-id-identities`: objectives 2.1.1, 2.1.2, 2.1.3; findings in `factory/reports/QZ-sc-900-21-entra-id-identities.md`
- `22-authentication`: objectives 2.2.1, 2.2.2, 2.2.3; findings in `factory/reports/QZ-sc-900-22-authentication.md`
- `23-access-management`: objectives 2.3.1, 2.3.2; findings in `factory/reports/QZ-sc-900-23-access-management.md`

Report: `factory/reports/FIX-sc-900-1.md`.

Checks: `npx tsx factory/check-cert.ts sc-900 11-security-compliance-concepts 12-identity-concepts 21-entra-id-identities 22-authentication 23-access-management`; `npm run -s content:validate -- --cert sc-900`; `npx tsx factory/check-quiz.ts sc-900 11-security-compliance-concepts 12-identity-concepts 21-entra-id-identities 22-authentication 23-access-management`.
