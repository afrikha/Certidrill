# Task FIX-sc-500-2 — course and bank corrections, SC-500, chapters 23-network-security, 31-ai-data-agents, 32-ai-foundry-defender, 33-servers-vms, 34-app-platform

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-500.md`.

Your chapters (and the only bank objectives you may touch):
- `23-network-security`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6, 2.3.7, 2.3.8, 2.3.9; findings in `factory/reports/QZ-sc-500-23-network-security.md`
- `31-ai-data-agents`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.11; findings in `factory/reports/QZ-sc-500-31-ai-data-agents.md`
- `32-ai-foundry-defender`: objectives 3.1.7, 3.1.8, 3.1.9, 3.1.10; findings in `factory/reports/QZ-sc-500-32-ai-foundry-defender.md`
- `33-servers-vms`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8, 3.2.9; findings in `factory/reports/QZ-sc-500-33-servers-vms.md`
- `34-app-platform`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7, 3.3.8, 3.3.9; findings in `factory/reports/QZ-sc-500-34-app-platform.md`

Report: `factory/reports/FIX-sc-500-2.md`.

Checks: `npx tsx factory/check-cert.ts sc-500 23-network-security 31-ai-data-agents 32-ai-foundry-defender 33-servers-vms 34-app-platform`; `npm run -s content:validate -- --cert sc-500`; `npx tsx factory/check-quiz.ts sc-500 23-network-security 31-ai-data-agents 32-ai-foundry-defender 33-servers-vms 34-app-platform`.
