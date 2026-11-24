# Task FIX-az-140-1 — course and bank corrections, AZ-140, chapters 11-networking, 12-storage, 13-plan-host-pools, 14-implement-host-pools, 15-session-host-images

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-140.md`.

Your chapters (and the only bank objectives you may touch):
- `11-networking`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5; findings in `factory/reports/QZ-az-140-11-networking.md`
- `12-storage`: objectives 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5; findings in `factory/reports/QZ-az-140-12-storage.md`
- `13-plan-host-pools`: objectives 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6; findings in `factory/reports/QZ-az-140-13-plan-host-pools.md`
- `14-implement-host-pools`: objectives 1.4.1, 1.4.2, 1.4.3, 1.4.4; findings in `factory/reports/QZ-az-140-14-implement-host-pools.md`
- `15-session-host-images`: objectives 1.5.1, 1.5.2, 1.5.3, 1.5.5, 1.5.7, 1.5.4, 1.5.6; findings in `factory/reports/QZ-az-140-15-session-host-images.md`

Report: `factory/reports/FIX-az-140-1.md`.

Checks: `npx tsx factory/check-cert.ts az-140 11-networking 12-storage 13-plan-host-pools 14-implement-host-pools 15-session-host-images`; `npm run -s content:validate -- --cert az-140`; `npx tsx factory/check-quiz.ts az-140 11-networking 12-storage 13-plan-host-pools 14-implement-host-pools 15-session-host-images`.
