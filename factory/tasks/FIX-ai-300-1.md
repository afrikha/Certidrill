# Task FIX-ai-300-1 — course and bank corrections, AI-300, chapters 11-workspace-resources, 12-workspace-assets, 13-iac-machine-learning, 21-model-training, 22-model-registration

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/ai-300.md`.

Your chapters (and the only bank objectives you may touch):
- `11-workspace-resources`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4; findings in `factory/reports/QZ-ai-300-11-workspace-resources.md`
- `12-workspace-assets`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4; findings in `factory/reports/QZ-ai-300-12-workspace-assets.md`
- `13-iac-machine-learning`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5; findings in `factory/reports/QZ-ai-300-13-iac-machine-learning.md`
- `21-model-training`: objectives 2.1.1, 2.1.3, 2.1.5, 2.1.2, 2.1.4, 2.1.6, 2.1.7, 2.1.8; findings in `factory/reports/QZ-ai-300-21-model-training.md`
- `22-model-registration`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4; findings in `factory/reports/QZ-ai-300-22-model-registration.md`

Report: `factory/reports/FIX-ai-300-1.md`.

Checks: `npx tsx factory/check-cert.ts ai-300 11-workspace-resources 12-workspace-assets 13-iac-machine-learning 21-model-training 22-model-registration`; `npm run -s content:validate -- --cert ai-300`; `npx tsx factory/check-quiz.ts ai-300 11-workspace-resources 12-workspace-assets 13-iac-machine-learning 21-model-training 22-model-registration`.
