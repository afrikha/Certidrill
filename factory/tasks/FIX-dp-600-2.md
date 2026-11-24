# Task FIX-dp-600-2 — course and bank corrections, DP-600, chapters 23-query-analyze-data, 31-design-semantic-models, 32-optimize-semantic-models

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-600.md`.

Your chapters (and the only bank objectives you may touch):
- `23-query-analyze-data`: objectives 2.3.1, 2.3.2, 2.3.3, 2.3.4; findings in `factory/reports/QZ-dp-600-23-query-analyze-data.md`
- `31-design-semantic-models`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7; findings in `factory/reports/QZ-dp-600-31-design-semantic-models.md`
- `32-optimize-semantic-models`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5; findings in `factory/reports/QZ-dp-600-32-optimize-semantic-models.md`

Report: `factory/reports/FIX-dp-600-2.md`.

Checks: `npx tsx factory/check-cert.ts dp-600 23-query-analyze-data 31-design-semantic-models 32-optimize-semantic-models`; `npm run -s content:validate -- --cert dp-600`; `npx tsx factory/check-quiz.ts dp-600 23-query-analyze-data 31-design-semantic-models 32-optimize-semantic-models`.
