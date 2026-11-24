# Task FIX-sc-200-1 — course and bank corrections, SC-200, chapters 11-defender-settings, 12-automation, 13-sentinel-platform, 14-data-ingestion, 15-detections, 21-xdr-workloads

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-200.md`.

Your chapters (and the only bank objectives you may touch):
- `11-defender-settings`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6; findings in `factory/reports/QZ-sc-200-11-defender-settings.md`
- `12-automation`: objectives 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.11; findings in `factory/reports/QZ-sc-200-12-automation.md`
- `13-sentinel-platform`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4; findings in `factory/reports/QZ-sc-200-13-sentinel-platform.md`
- `14-data-ingestion`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7; findings in `factory/reports/QZ-sc-200-14-data-ingestion.md`
- `15-detections`: objectives 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5; findings in `factory/reports/QZ-sc-200-15-detections.md`
- `21-xdr-workloads`: objectives 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6; findings in `factory/reports/QZ-sc-200-21-xdr-workloads.md`

Report: `factory/reports/FIX-sc-200-1.md`.

Checks: `npx tsx factory/check-cert.ts sc-200 11-defender-settings 12-automation 13-sentinel-platform 14-data-ingestion 15-detections 21-xdr-workloads`; `npm run -s content:validate -- --cert sc-200`; `npx tsx factory/check-quiz.ts sc-200 11-defender-settings 12-automation 13-sentinel-platform 14-data-ingestion 15-detections 21-xdr-workloads`.
