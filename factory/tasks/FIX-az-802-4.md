# Task FIX-az-802-4 — course and bank corrections, AZ-802, chapters 61-os-security, 62-ad-ds-security, 71-monitoring, 72-troubleshoot-windows-server, 73-troubleshoot-active-directory

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-802.md`.

Your chapters (and the only bank objectives you may touch):
- `61-os-security`: objectives 6.1.1, 6.1.2, 6.1.3, 6.1.4, 6.1.5, 6.1.6, 6.1.7, 6.1.8, 6.1.9; findings in `factory/reports/QZ-az-802-61-os-security.md`
- `62-ad-ds-security`: objectives 6.2.1, 6.2.2, 6.2.3, 6.2.4, 6.2.5, 6.2.6, 6.2.7, 6.2.8, 6.2.9; findings in `factory/reports/QZ-az-802-62-ad-ds-security.md`
- `71-monitoring`: objectives 7.1.1, 7.1.2, 7.1.3, 7.1.4, 7.1.5, 7.1.6, 7.1.7, 7.1.8; findings in `factory/reports/QZ-az-802-71-monitoring.md`
- `72-troubleshoot-windows-server`: objectives 7.2.1, 7.2.2, 7.2.3, 7.2.4, 7.2.5, 7.2.6, 7.2.7, 7.2.8; findings in `factory/reports/QZ-az-802-72-troubleshoot-windows-server.md`
- `73-troubleshoot-active-directory`: objectives 7.3.1, 7.3.2, 7.3.3, 7.3.4, 7.3.5, 7.3.6, 7.3.7; findings in `factory/reports/QZ-az-802-73-troubleshoot-active-directory.md`

Report: `factory/reports/FIX-az-802-4.md`.

Checks: `npx tsx factory/check-cert.ts az-802 61-os-security 62-ad-ds-security 71-monitoring 72-troubleshoot-windows-server 73-troubleshoot-active-directory`; `npm run -s content:validate -- --cert az-802`; `npx tsx factory/check-quiz.ts az-802 61-os-security 62-ad-ds-security 71-monitoring 72-troubleshoot-windows-server 73-troubleshoot-active-directory`.
