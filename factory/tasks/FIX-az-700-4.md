# Task FIX-az-700-4 — course and bank corrections, AZ-700, chapters 51-network-security-groups, 52-flow-logs-security-admin, 53-azure-firewall, 54-waf

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-700.md`.

Your chapters (and the only bank objectives you may touch):
- `51-network-security-groups`: objectives 5.1.1, 5.1.5, 5.1.2, 5.1.3, 5.1.4; findings in `factory/reports/QZ-az-700-51-network-security-groups.md`
- `52-flow-logs-security-admin`: objectives 5.1.6, 5.1.7, 5.1.8, 5.1.9, 5.1.10; findings in `factory/reports/QZ-az-700-52-flow-logs-security-admin.md`
- `53-azure-firewall`: objectives 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5, 5.2.6, 5.2.7; findings in `factory/reports/QZ-az-700-53-azure-firewall.md`
- `54-waf`: objectives 5.3.1, 5.3.2, 5.3.3, 5.3.4, 5.3.5, 5.3.6, 5.3.7; findings in `factory/reports/QZ-az-700-54-waf.md`

Report: `factory/reports/FIX-az-700-4.md`.

Checks: `npx tsx factory/check-cert.ts az-700 51-network-security-groups 52-flow-logs-security-admin 53-azure-firewall 54-waf`; `npm run -s content:validate -- --cert az-700`; `npx tsx factory/check-quiz.ts az-700 51-network-security-groups 52-flow-logs-security-admin 53-azure-firewall 54-waf`.
