# Task FIX-sc-500-3 — course and bank corrections, SC-500, chapters 41-defender-cloud-posture, 42-sentinel-workspace, 43-sentinel-collection, 44-security-copilot

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/sc-500.md`.

Your chapters (and the only bank objectives you may touch):
- `41-defender-cloud-posture`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6; findings in `factory/reports/QZ-sc-500-41-defender-cloud-posture.md`
- `42-sentinel-workspace`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.8, 4.2.9; findings in `factory/reports/QZ-sc-500-42-sentinel-workspace.md`
- `43-sentinel-collection`: objectives 4.2.4, 4.2.5, 4.2.6, 4.2.7, 4.2.10; findings in `factory/reports/QZ-sc-500-43-sentinel-collection.md`
- `44-security-copilot`: objectives 4.3.1, 4.3.2, 4.3.3, 4.3.4; findings in `factory/reports/QZ-sc-500-44-security-copilot.md`

Report: `factory/reports/FIX-sc-500-3.md`.

Checks: `npx tsx factory/check-cert.ts sc-500 41-defender-cloud-posture 42-sentinel-workspace 43-sentinel-collection 44-security-copilot`; `npm run -s content:validate -- --cert sc-500`; `npx tsx factory/check-quiz.ts sc-500 41-defender-cloud-posture 42-sentinel-workspace 43-sentinel-collection 44-security-copilot`.
