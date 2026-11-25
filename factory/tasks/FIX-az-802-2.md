# Task FIX-az-802-2 — course and bank corrections, AZ-802, chapters 22-azure-hybrid-services, 31-hyper-v-guests, 32-hyper-v-storage-networking, 33-azure-vms, 41-name-resolution

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-802.md`.

Your chapters (and the only bank objectives you may touch):
- `22-azure-hybrid-services`: objectives 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5; findings in `factory/reports/QZ-az-802-22-azure-hybrid-services.md`
- `31-hyper-v-guests`: objectives 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.1.8; findings in `factory/reports/QZ-az-802-31-hyper-v-guests.md`
- `32-hyper-v-storage-networking`: objectives 3.1.9, 3.1.10, 3.1.11, 3.1.13, 3.1.12, 3.1.14; findings in `factory/reports/QZ-az-802-32-hyper-v-storage-networking.md`
- `33-azure-vms`: objectives 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5; findings in `factory/reports/QZ-az-802-33-azure-vms.md`
- `41-name-resolution`: objectives 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6; findings in `factory/reports/QZ-az-802-41-name-resolution.md`

Report: `factory/reports/FIX-az-802-2.md`.

Checks: `npx tsx factory/check-cert.ts az-802 22-azure-hybrid-services 31-hyper-v-guests 32-hyper-v-storage-networking 33-azure-vms 41-name-resolution`; `npm run -s content:validate -- --cert az-802`; `npx tsx factory/check-quiz.ts az-802 22-azure-hybrid-services 31-hyper-v-guests 32-hyper-v-storage-networking 33-azure-vms 41-name-resolution`.
