# Task FIX-az-802-1 — course and bank corrections, AZ-802, chapters 11-domain-controllers, 12-sites-domains-forests, 13-security-principals, 14-group-policy, 21-remote-management

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-802.md`.

Your chapters (and the only bank objectives you may touch):
- `11-domain-controllers`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5; findings in `factory/reports/QZ-az-802-11-domain-controllers.md`
- `12-sites-domains-forests`: objectives 1.2.1, 1.2.2, 1.2.3; findings in `factory/reports/QZ-az-802-12-sites-domains-forests.md`
- `13-security-principals`: objectives 1.3.1, 1.3.2, 1.3.3; findings in `factory/reports/QZ-az-802-13-security-principals.md`
- `14-group-policy`: objectives 1.4.1, 1.4.2; findings in `factory/reports/QZ-az-802-14-group-policy.md`
- `21-remote-management`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4; findings in `factory/reports/QZ-az-802-21-remote-management.md`

Report: `factory/reports/FIX-az-802-1.md`.

Checks: `npx tsx factory/check-cert.ts az-802 11-domain-controllers 12-sites-domains-forests 13-security-principals 14-group-policy 21-remote-management`; `npm run -s content:validate -- --cert az-802`; `npx tsx factory/check-quiz.ts az-802 11-domain-controllers 12-sites-domains-forests 13-security-principals 14-group-policy 21-remote-management`.
