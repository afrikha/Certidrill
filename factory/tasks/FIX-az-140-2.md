# Task FIX-az-140-2 — course and bank corrections, AZ-140, chapters 21-identity, 22-security, 31-fslogix, 32-clients-redirection, 33-user-settings

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-140.md`.

Your chapters (and the only bank objectives you may touch):
- `21-identity`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7; findings in `factory/reports/QZ-az-140-21-identity.md`
- `22-security`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7; findings in `factory/reports/QZ-az-140-22-security.md`
- `31-fslogix`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5; findings in `factory/reports/QZ-az-140-31-fslogix.md`
- `32-clients-redirection`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6; findings in `factory/reports/QZ-az-140-32-clients-redirection.md`
- `33-user-settings`: objectives 3.2.7, 3.2.8, 3.2.9, 3.2.10, 3.2.11; findings in `factory/reports/QZ-az-140-33-user-settings.md`

Report: `factory/reports/FIX-az-140-2.md`.

Checks: `npx tsx factory/check-cert.ts az-140 21-identity 22-security 31-fslogix 32-clients-redirection 33-user-settings`; `npm run -s content:validate -- --cert az-140`; `npx tsx factory/check-quiz.ts az-140 21-identity 22-security 31-fslogix 32-clients-redirection 33-user-settings`.
