# Task FIX-dp-750-2 — course and bank corrections, DP-750, chapters 32-data-modeling, 33-ingestion, 34-transformation, 35-data-quality, 41-pipeline-design

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-750.md`.

Your chapters (and the only bank objectives you may touch):
- `32-data-modeling`: objectives 3.1.6, 3.1.7, 3.1.8, 3.1.9, 3.1.10; findings in `factory/reports/QZ-dp-750-32-data-modeling.md`
- `33-ingestion`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7; findings in `factory/reports/QZ-dp-750-33-ingestion.md`
- `34-transformation`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7; findings in `factory/reports/QZ-dp-750-34-transformation.md`
- `35-data-quality`: objectives 3.4.1, 3.4.2, 3.4.3, 3.4.4; findings in `factory/reports/QZ-dp-750-35-data-quality.md`
- `41-pipeline-design`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6; findings in `factory/reports/QZ-dp-750-41-pipeline-design.md`

Report: `factory/reports/FIX-dp-750-2.md`.

Checks: `npx tsx factory/check-cert.ts dp-750 32-data-modeling 33-ingestion 34-transformation 35-data-quality 41-pipeline-design`; `npm run -s content:validate -- --cert dp-750`; `npx tsx factory/check-quiz.ts dp-750 32-data-modeling 33-ingestion 34-transformation 35-data-quality 41-pipeline-design`.
