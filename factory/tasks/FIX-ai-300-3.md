# Task FIX-ai-300-3 — course and bank corrections, AI-300, chapters 41-evaluation, 42-observability, 51-rag-optimization, 52-fine-tuning

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/ai-300.md`.

Your chapters (and the only bank objectives you may touch):
- `41-evaluation`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4; findings in `factory/reports/QZ-ai-300-41-evaluation.md`
- `42-observability`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4; findings in `factory/reports/QZ-ai-300-42-observability.md`
- `51-rag-optimization`: objectives 5.1.1, 5.1.2, 5.1.3, 5.1.4; findings in `factory/reports/QZ-ai-300-51-rag-optimization.md`
- `52-fine-tuning`: objectives 5.2.1, 5.2.2, 5.2.3, 5.2.4; findings in `factory/reports/QZ-ai-300-52-fine-tuning.md`

Report: `factory/reports/FIX-ai-300-3.md`.

Checks: `npx tsx factory/check-cert.ts ai-300 41-evaluation 42-observability 51-rag-optimization 52-fine-tuning`; `npm run -s content:validate -- --cert ai-300`; `npx tsx factory/check-quiz.ts ai-300 41-evaluation 42-observability 51-rag-optimization 52-fine-tuning`.
