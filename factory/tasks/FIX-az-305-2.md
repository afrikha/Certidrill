# Task FIX-az-305-2 — course and bank corrections, AZ-305, chapters 31-backup-disaster-recovery, 32-high-availability, 41-compute, 42-application-architecture, 43-migrations, 44-networking

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-305.md`.

Your chapters (and the only bank objectives you may touch):
- `31-backup-disaster-recovery`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4; findings in `factory/reports/QZ-az-305-31-backup-disaster-recovery.md`
- `32-high-availability`: objectives 3.2.1, 3.2.2, 3.2.3; findings in `factory/reports/QZ-az-305-32-high-availability.md`
- `41-compute`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5; findings in `factory/reports/QZ-az-305-41-compute.md`
- `42-application-architecture`: objectives 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6; findings in `factory/reports/QZ-az-305-42-application-architecture.md`
- `43-migrations`: objectives 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5; findings in `factory/reports/QZ-az-305-43-migrations.md`
- `44-networking`: objectives 4.4.1, 4.4.2, 4.4.3, 4.4.4, 4.4.5; findings in `factory/reports/QZ-az-305-44-networking.md`

Report: `factory/reports/FIX-az-305-2.md`.

Checks: `npx tsx factory/check-cert.ts az-305 31-backup-disaster-recovery 32-high-availability 41-compute 42-application-architecture 43-migrations 44-networking`; `npm run -s content:validate -- --cert az-305`; `npx tsx factory/check-quiz.ts az-305 31-backup-disaster-recovery 32-high-availability 41-compute 42-application-architecture 43-migrations 44-networking`.
