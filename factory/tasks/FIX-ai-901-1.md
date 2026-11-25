# Task FIX-ai-901-1 — course and bank corrections, AI-901, chapters 11-responsible-ai, 12-model-components, 13-ai-workloads, 21-generative-apps-agents

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/ai-901.md`.

Your chapters (and the only bank objectives you may touch):
- `11-responsible-ai`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6; findings in `factory/reports/QZ-ai-901-11-responsible-ai.md`
- `12-model-components`: objectives 1.2.1, 1.2.2, 1.2.3; findings in `factory/reports/QZ-ai-901-12-model-components.md`
- `13-ai-workloads`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5; findings in `factory/reports/QZ-ai-901-13-ai-workloads.md`
- `21-generative-apps-agents`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5; findings in `factory/reports/QZ-ai-901-21-generative-apps-agents.md`

Report: `factory/reports/FIX-ai-901-1.md`.

Checks: `npx tsx factory/check-cert.ts ai-901 11-responsible-ai 12-model-components 13-ai-workloads 21-generative-apps-agents`; `npm run -s content:validate -- --cert ai-901`; `npx tsx factory/check-quiz.ts ai-901 11-responsible-ai 12-model-components 13-ai-workloads 21-generative-apps-agents`.
