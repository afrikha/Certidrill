# Task FIX-dp-420-2 — course and bank corrections, DP-420, chapters 22-availability-recovery, 23-performance, 24-fleet-management, 31-ai-retrieval, 32-agent-memory, 33-operational-analytics

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-420.md`.

Your chapters (and the only bank objectives you may touch):
- `22-availability-recovery`: objectives 2.2.1, 2.2.2, 2.2.3; findings in `factory/reports/QZ-dp-420-22-availability-recovery.md`
- `23-performance`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6; findings in `factory/reports/QZ-dp-420-23-performance.md`
- `24-fleet-management`: objectives 2.4.1, 2.4.2; findings in `factory/reports/QZ-dp-420-24-fleet-management.md`
- `31-ai-retrieval`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7; findings in `factory/reports/QZ-dp-420-31-ai-retrieval.md`
- `32-agent-memory`: objectives 3.2.1, 3.2.2, 3.2.3; findings in `factory/reports/QZ-dp-420-32-agent-memory.md`
- `33-operational-analytics`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4; findings in `factory/reports/QZ-dp-420-33-operational-analytics.md`

Report: `factory/reports/FIX-dp-420-2.md`.

Checks: `npx tsx factory/check-cert.ts dp-420 22-availability-recovery 23-performance 24-fleet-management 31-ai-retrieval 32-agent-memory 33-operational-analytics`; `npm run -s content:validate -- --cert dp-420`; `npx tsx factory/check-quiz.ts dp-420 22-availability-recovery 23-performance 24-fleet-management 31-ai-retrieval 32-agent-memory 33-operational-analytics`.
