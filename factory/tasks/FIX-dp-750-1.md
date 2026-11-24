# Task FIX-dp-750-1 — course and bank corrections, DP-750, chapters 11-compute, 12-unity-catalog-objects, 21-securing-objects, 22-governance, 31-ingestion-design

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/dp-750.md`.

Your chapters (and the only bank objectives you may touch):
- `11-compute`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5; findings in `factory/reports/QZ-dp-750-11-compute.md`
- `12-unity-catalog-objects`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7, 1.2.8; findings in `factory/reports/QZ-dp-750-12-unity-catalog-objects.md`
- `21-securing-objects`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5; findings in `factory/reports/QZ-dp-750-21-securing-objects.md`
- `22-governance`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7; findings in `factory/reports/QZ-dp-750-22-governance.md`
- `31-ingestion-design`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5; findings in `factory/reports/QZ-dp-750-31-ingestion-design.md`

Report: `factory/reports/FIX-dp-750-1.md`.

Checks: `npx tsx factory/check-cert.ts dp-750 11-compute 12-unity-catalog-objects 21-securing-objects 22-governance 31-ingestion-design`; `npm run -s content:validate -- --cert dp-750`; `npx tsx factory/check-quiz.ts dp-750 11-compute 12-unity-catalog-objects 21-securing-objects 22-governance 31-ingestion-design`.
