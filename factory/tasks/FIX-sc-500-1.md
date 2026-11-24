# Task FIX-sc-500-1 — course and bank corrections, SC-500, chapters 11-entra-access, 12-key-vault, 13-governance, 21-storage-security, 22-database-security

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-500.md`.

Your chapters (and the only bank objectives you may touch):
- `11-entra-access`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6; findings in `factory/reports/QZ-sc-500-11-entra-access.md`
- `12-key-vault`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7; findings in `factory/reports/QZ-sc-500-12-key-vault.md`
- `13-governance`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7, 1.3.8, 1.3.9; findings in `factory/reports/QZ-sc-500-13-governance.md`
- `21-storage-security`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4; findings in `factory/reports/QZ-sc-500-21-storage-security.md`
- `22-database-security`: objectives 2.2.1, 2.2.2, 2.2.3; findings in `factory/reports/QZ-sc-500-22-database-security.md`

Report: `factory/reports/FIX-sc-500-1.md`.

Checks: `npx tsx factory/check-cert.ts sc-500 11-entra-access 12-key-vault 13-governance 21-storage-security 22-database-security`; `npm run -s content:validate -- --cert sc-500`; `npx tsx factory/check-quiz.ts sc-500 11-entra-access 12-key-vault 13-governance 21-storage-security 22-database-security`.
