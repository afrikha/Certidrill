# Task FIX-ai-200-1 — course and bank corrections, AI-200, chapters 11-container-hosting, 12-container-orchestration, 21-cosmos-db, 22-postgresql, 23-managed-redis

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/ai-200.md`.

Your chapters (and the only bank objectives you may touch):
- `11-container-hosting`: objectives 1.1.1, 1.1.2, 1.1.3; findings in `factory/reports/QZ-ai-200-11-container-hosting.md`
- `12-container-orchestration`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4; findings in `factory/reports/QZ-ai-200-12-container-orchestration.md`
- `21-cosmos-db`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4; findings in `factory/reports/QZ-ai-200-21-cosmos-db.md`
- `22-postgresql`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6; findings in `factory/reports/QZ-ai-200-22-postgresql.md`
- `23-managed-redis`: objectives 2.3.1, 2.3.2; findings in `factory/reports/QZ-ai-200-23-managed-redis.md`

Report: `factory/reports/FIX-ai-200-1.md`.

Checks: `npx tsx factory/check-cert.ts ai-200 11-container-hosting 12-container-orchestration 21-cosmos-db 22-postgresql 23-managed-redis`; `npm run -s content:validate -- --cert ai-200`; `npx tsx factory/check-quiz.ts ai-200 11-container-hosting 12-container-orchestration 21-cosmos-db 22-postgresql 23-managed-redis`.
