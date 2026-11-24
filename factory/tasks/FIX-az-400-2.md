# Task FIX-az-400-2 — course and bank corrections, AZ-400, chapters 32-testing-strategy, 33-pipelines, 34-deployments, 35-infrastructure-as-code, 36-pipeline-maintenance, 41-authentication-authorization

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-400.md`.

Your chapters (and the only bank objectives you may touch):
- `32-testing-strategy`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4; findings in `factory/reports/QZ-az-400-32-testing-strategy.md`
- `33-pipelines`: objectives 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7, 3.3.8, 3.3.9; findings in `factory/reports/QZ-az-400-33-pipelines.md`
- `34-deployments`: objectives 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5, 3.4.6, 3.4.7, 3.4.8; findings in `factory/reports/QZ-az-400-34-deployments.md`
- `35-infrastructure-as-code`: objectives 3.5.1, 3.5.2, 3.5.3, 3.5.4, 3.5.5; findings in `factory/reports/QZ-az-400-35-infrastructure-as-code.md`
- `36-pipeline-maintenance`: objectives 3.6.1, 3.6.2, 3.6.3, 3.6.4, 3.6.5; findings in `factory/reports/QZ-az-400-36-pipeline-maintenance.md`
- `41-authentication-authorization`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6, 4.1.7; findings in `factory/reports/QZ-az-400-41-authentication-authorization.md`

Report: `factory/reports/FIX-az-400-2.md`.

Checks: `npx tsx factory/check-cert.ts az-400 32-testing-strategy 33-pipelines 34-deployments 35-infrastructure-as-code 36-pipeline-maintenance 41-authentication-authorization`; `npm run -s content:validate -- --cert az-400`; `npx tsx factory/check-quiz.ts az-400 32-testing-strategy 33-pipelines 34-deployments 35-infrastructure-as-code 36-pipeline-maintenance 41-authentication-authorization`.
