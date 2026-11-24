# Task FIX-sc-100-1 — course and bank corrections, SC-100, chapters 11-resiliency-ransomware, 12-mcra-mcsb, 13-caf-waf, 21-security-operations, 22-identity-access

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-100.md`.

Your chapters (and the only bank objectives you may touch):
- `11-resiliency-ransomware`: objectives 1.1.1, 1.1.3, 1.1.2, 1.1.4; findings in `factory/reports/QZ-sc-100-11-resiliency-ransomware.md`
- `12-mcra-mcsb`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4; findings in `factory/reports/QZ-sc-100-12-mcra-mcsb.md`
- `13-caf-waf`: objectives 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.1; findings in `factory/reports/QZ-sc-100-13-caf-waf.md`
- `21-security-operations`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6; findings in `factory/reports/QZ-sc-100-21-security-operations.md`
- `22-identity-access`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.2.8; findings in `factory/reports/QZ-sc-100-22-identity-access.md`

Report: `factory/reports/FIX-sc-100-1.md`.

Checks: `npx tsx factory/check-cert.ts sc-100 11-resiliency-ransomware 12-mcra-mcsb 13-caf-waf 21-security-operations 22-identity-access`; `npm run -s content:validate -- --cert sc-100`; `npx tsx factory/check-quiz.ts sc-100 11-resiliency-ransomware 12-mcra-mcsb 13-caf-waf 21-security-operations 22-identity-access`.
