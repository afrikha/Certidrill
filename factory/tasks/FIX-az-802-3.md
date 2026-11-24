# Task FIX-az-802-3 — course and bank corrections, AZ-802, chapters 42-ip-addressing, 51-azure-files, 52-file-shares, 53-storage-spaces, 54-file-systems-encryption

Read `factory/FIX-AGENT.md` and follow it. Exam profile: `factory/profiles/az-802.md`.

Your chapters (and the only bank objectives you may touch):
- `42-ip-addressing`: objectives 4.2.1, 4.2.3, 4.2.4, 4.2.5, 4.2.2; findings in `factory/reports/QZ-az-802-42-ip-addressing.md`
- `51-azure-files`: objectives 5.1.1, 5.1.2, 5.1.3, 5.1.4, 5.1.5, 5.1.6; findings in `factory/reports/QZ-az-802-51-azure-files.md`
- `52-file-shares`: objectives 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5; findings in `factory/reports/QZ-az-802-52-file-shares.md`
- `53-storage-spaces`: objectives 5.3.1, 5.3.2, 5.3.3, 5.3.4, 5.3.6, 5.3.7; findings in `factory/reports/QZ-az-802-53-storage-spaces.md`
- `54-file-systems-encryption`: objectives 5.3.8, 5.3.5, 5.3.9, 5.3.10, 5.3.11; findings in `factory/reports/QZ-az-802-54-file-systems-encryption.md`

Report: `factory/reports/FIX-az-802-3.md`.

Checks: `npx tsx factory/check-cert.ts az-802 42-ip-addressing 51-azure-files 52-file-shares 53-storage-spaces 54-file-systems-encryption`; `npm run -s content:validate -- --cert az-802`; `npx tsx factory/check-quiz.ts az-802 42-ip-addressing 51-azure-files 52-file-shares 53-storage-spaces 54-file-systems-encryption`.
