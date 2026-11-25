# Task FIX-dp-420-1 — course and bank corrections, DP-420, chapters 11-resource-models-sdk, 12-database-operations, 13-data-models-partitioning, 14-change-feed, 15-ai-assisted-tools, 21-security-controls

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-420.md`.

Your chapters (and the only bank objectives you may touch):
- `11-resource-models-sdk`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6; findings in `factory/reports/QZ-dp-420-11-resource-models-sdk.md`
- `12-database-operations`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6; findings in `factory/reports/QZ-dp-420-12-database-operations.md`
- `13-data-models-partitioning`: objectives 1.3.1, 1.3.3, 1.3.2, 1.3.4, 1.3.5, 1.3.6, 1.3.7, 1.3.8; findings in `factory/reports/QZ-dp-420-13-data-models-partitioning.md`
- `14-change-feed`: objectives 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5; findings in `factory/reports/QZ-dp-420-14-change-feed.md`
- `15-ai-assisted-tools`: objectives 1.5.1, 1.5.2; findings in `factory/reports/QZ-dp-420-15-ai-assisted-tools.md`
- `21-security-controls`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4; findings in `factory/reports/QZ-dp-420-21-security-controls.md`

Report: `factory/reports/FIX-dp-420-1.md`.

Checks: `npx tsx factory/check-cert.ts dp-420 11-resource-models-sdk 12-database-operations 13-data-models-partitioning 14-change-feed 15-ai-assisted-tools 21-security-controls`; `npm run -s content:validate -- --cert dp-420`; `npx tsx factory/check-quiz.ts dp-420 11-resource-models-sdk 12-database-operations 13-data-models-partitioning 14-change-feed 15-ai-assisted-tools 21-security-controls`.
