# Task FIX-ai-103-1 — course and bank corrections, AI-103, chapters 11-foundry-services, 12-foundry-setup, 13-manage-monitor-secure, 14-responsible-ai, 21-generative-apps

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/ai-103.md`.

Your chapters (and the only bank objectives you may touch):
- `11-foundry-services`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4; findings in `factory/reports/QZ-ai-103-11-foundry-services.md`
- `12-foundry-setup`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4; findings in `factory/reports/QZ-ai-103-12-foundry-setup.md`
- `13-manage-monitor-secure`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4; findings in `factory/reports/QZ-ai-103-13-manage-monitor-secure.md`
- `14-responsible-ai`: objectives 1.4.1, 1.4.2, 1.4.3, 1.4.4; findings in `factory/reports/QZ-ai-103-14-responsible-ai.md`
- `21-generative-apps`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6; findings in `factory/reports/QZ-ai-103-21-generative-apps.md`

Report: `factory/reports/FIX-ai-103-1.md`.

Checks: `npx tsx factory/check-cert.ts ai-103 11-foundry-services 12-foundry-setup 13-manage-monitor-secure 14-responsible-ai 21-generative-apps`; `npm run -s content:validate -- --cert ai-103`; `npx tsx factory/check-quiz.ts ai-103 11-foundry-services 12-foundry-setup 13-manage-monitor-secure 14-responsible-ai 21-generative-apps`.
