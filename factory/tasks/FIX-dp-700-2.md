# Task FIX-dp-700-2 — course and bank corrections, DP-700, chapters 22-batch-data, 23-streaming-data, 31-monitor-fabric-items, 32-resolve-errors, 33-optimize-performance

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-700.md`.

Your chapters (and the only bank objectives you may touch):
- `22-batch-data`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.2.8, 2.2.9; findings in `factory/reports/QZ-dp-700-22-batch-data.md`
- `23-streaming-data`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6, 2.3.7; findings in `factory/reports/QZ-dp-700-23-streaming-data.md`
- `31-monitor-fabric-items`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4; findings in `factory/reports/QZ-dp-700-31-monitor-fabric-items.md`
- `32-resolve-errors`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7; findings in `factory/reports/QZ-dp-700-32-resolve-errors.md`
- `33-optimize-performance`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6; findings in `factory/reports/QZ-dp-700-33-optimize-performance.md`

Report: `factory/reports/FIX-dp-700-2.md`.

Checks: `npx tsx factory/check-cert.ts dp-700 22-batch-data 23-streaming-data 31-monitor-fabric-items 32-resolve-errors 33-optimize-performance`; `npm run -s content:validate -- --cert dp-700`; `npx tsx factory/check-quiz.ts dp-700 22-batch-data 23-streaming-data 31-monitor-fabric-items 32-resolve-errors 33-optimize-performance`.
