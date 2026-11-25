# QZ-dp-300-52-backup-restore — report

File: `content/dp-300/quizzes/52-backup-restore.yaml` (10 questions). `npx tsx factory/check-quiz.ts dp-300 52-backup-restore` → 0 problem(s), 0 warning(s).

Objectives: 5.2.1 (q1, q3, q10), 5.2.2 (q5), 5.2.3 (q4), 5.2.4 (q2, q8), 5.2.5 (q6), 5.2.6 (q7), 5.2.7 (q9). Formats 6–10: single, single, dropdown, yesno_statements, dropdown.

The bank's 46 questions on 5.2.x were read first. The quiz tests decisions they don't cover:
- BULK_LOGGED
- `az sql db restore --time` vs `--deleted-time`, copy and midb
- Hyperscale backup redundancy fixed at creation
- restoring an encrypted backup on another server
- an online tail-log backup WITH NORECOVERY at cutover
- a deleted server: LTR restore within the same subscription
- REPLACE overriding the tail-log check
- a geo-restore PowerShell script
- MI backup stripes, restore version and credential
- the differential/log schedule vs RPO/RTO

## Chapter vs current Learn (Nov 2026)

- **"A backup taken on a managed instance can be restored to SQL Server 2022 only" is out of date.** This is in the chapter and in the T-SQL differences page. The update policy page says:
  - with the **SQL Server 2025** policy, the database can be restored to SQL Server 2025;
  - with **Always-up-to-date**, it can't be restored to any SQL Server.

  The SQL Server 2025 policy is now the default for new instances deployed from the portal. Fix the chapter. Check the mock questions that rely on "2022 only". q9 states the SQL Server 2022 policy explicitly.
- **MI stripes:** Learn says 32 stripes are "enough for databases up to 4 TB if backup compression is used", and that each stripe is at most 195 GB. The chapter has the 195 GB / 32 stripes figures, but not the 4 TB rule of thumb.
- **BULK_LOGGED:** the Learn recovery-models table says "Point-in-time recovery isn't supported". The chapter's wording is more precise: not inside a log backup that contains minimally logged operations. Both are consistent; q1 uses the chapter's nuance only in its explanation.
- **PITR target:** Learn adds two points the chapter lacks:
  - a restore between Hyperscale and other service tiers isn't supported;
  - PITR can't run on a geo-secondary.
- **LTR:** immutable LTR backups are in preview for SQL Managed Instance (GA for SQL Database). Immutable LTR backups also block deletion of the logical server. Neither point is in the chapter.
- **Backup to URL:** Learn says that from SQL Server 2025, backup to URL supports only container-level immutability. The chapter doesn't cover immutability.

## Facts not fully verified

- q6 option b says geo-restore isn't possible after the server is deleted. Learn says deleting a server deletes its databases and their PITR backups, and that only LTR backups survive. It doesn't say in so many words that the geo-replicated copies are deleted too. This is inferred.
- q9 s3: "restoring a striped block-blob backup needs a SAS credential, not an access-key credential". This is derived from the backup-to-URL page ("multi-blob backups require block blobs and a SAS credential"; access key → page blob), not from an explicit sentence about restore.
- q2: `az sql midb restore` parameter names (`--managed-instance`, `--dest-name`, `--time`) are used in a distractor without fetching its reference page. They match the existing bank question `dp300-5b-pitr-midb-cli`.
- q8: I assumed `Restore-AzSqlDatabase -FromGeoBackup` works without `-Edition` / `-ServiceObjectiveName`. In the fetched syntax they appear in the example but aren't listed as required. `Get-AzSqlDatabaseLongTermRetentionBackup` is used as a distractor with the parameters of the template line; its real parameter set (`-Location`) isn't checked.
- French: « mode de récupération utilisant les journaux de transactions » for bulk-logged comes from memory of the fr-fr SQL docs. I didn't fetch it.
