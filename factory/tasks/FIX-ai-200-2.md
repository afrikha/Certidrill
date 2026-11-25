# Task FIX-ai-200-2 — course and bank corrections, AI-200, chapters 31-messaging-events, 32-functions, 41-secrets-configuration, 42-observability

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/ai-200.md`.

Your chapters (and the only bank objectives you may touch):
- `31-messaging-events`: objectives 3.1.1, 3.1.2; findings in `factory/reports/QZ-ai-200-31-messaging-events.md`
- `32-functions`: objectives 3.2.1, 3.2.2; findings in `factory/reports/QZ-ai-200-32-functions.md`
- `41-secrets-configuration`: objectives 4.1.1, 4.1.2; findings in `factory/reports/QZ-ai-200-41-secrets-configuration.md`
- `42-observability`: objectives 4.2.1, 4.2.2; findings in `factory/reports/QZ-ai-200-42-observability.md`

Report: `factory/reports/FIX-ai-200-2.md`.

Checks: `npx tsx factory/check-cert.ts ai-200 31-messaging-events 32-functions 41-secrets-configuration 42-observability`; `npm run -s content:validate -- --cert ai-200`; `npx tsx factory/check-quiz.ts ai-200 31-messaging-events 32-functions 41-secrets-configuration 42-observability`.
