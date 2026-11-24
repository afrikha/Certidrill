# QZ-dp-300-23-compliance-controls — notes

`content/dp-300/quizzes/23-compliance-controls.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.3.1 (q1), 2.3.2 (q4, q7), 2.3.3 (q2, q9), 2.3.4 (q3, q6), 2.3.5 (q5, q8), 2.3.6 (q10). Positions 6–10: multi, yesno_statements, dropdown, dropdown, multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Server-level auditing was re-architected (GA July 2025).** Learn ("Auditing - Azure SQL Database"): one server-level extended event session now captures all databases. Server audit logs go to a single `master` folder, and reading them needs `VIEW DATABASE SECURITY AUDIT` in the user database. For large OLTP workloads, Learn recommends database-level auditing. The chapter doesn't mention this. Its `sys.fn_get_audit_file` path example (`.../sqldbauditlogs/sql-contoso/`) should be checked against the new folder layout.
- **Immutable audit storage.** Learn: **Allow protected append writes** must be *Append blobs* or *Block and append blobs*; *None* isn't supported (used in q7). For time-based retention, the storage retention interval must be shorter than the SQL Auditing retention, and an auditing retention of 0 isn't supported. The chapter only says "must allow protected append writes".
- **Data classification.** Learn: label-based access control through Microsoft Purview Information Protection access policies is **retired**. Switching the policy mode needs tenant-wide Security Admin permission. User Access Administrator can also view classifications. The chapter could add the retirement.
- **Ledger.** Learn lists more items than the chapter:
  - Verification needs a database option set first (snapshot isolation; the page doesn't name it).
  - `sys.sp_verify_database_ledger` needs `VIEW LEDGER CONTENT`.
  - For Azure Confidential Ledger, the server identity needs the **Contributor** role. The chapter only gives Storage Blob Data Contributor for Blob Storage.
  - The ledger overview says ledger also **blocks** changes to append-only tables, history tables and ledger views at the API level, and **detects** file-level tampering. The chapter's trap says "doesn't prevent it". That holds for a sysadmin with access to the files, but it's worded too strongly.
- **CDC on Azure SQL Database.** Learn adds limits that the chapter doesn't list: online index operations aren't supported (error 18773), ADR aggressive log truncation is disabled, a database created by a Microsoft Entra user has its own restrictions, and there is no SLA or sub-second latency. `maxtrans`/`maxscans` can still be changed with `sp_cdc_change_job`; the 20-second and 1-hour intervals can't.
- **Change tracking.** The primary key requirement is stated on the ALTER TABLE page only, not on the change tracking pages (q2 cites both).
- **DDM `datetime()`.** The SQL Server page marks it "SQL Server 2022"; the Azure SQL DDM page lists Datetime as applied with T-SQL. q3 relies on the Azure page.

## Doubts / not verified on a fetched page

- q6: Learn doesn't state the explanation's claim that a column-level `DENY SELECT` also stops filtering on the column (`WHERE Salary > ...` fails). It is standard SQL Server permission behavior.
- q8: the explanation says `VIEW LEDGER CONTENT` is the verification permission. This comes from the `sys.sp_verify_database_ledger` page, not from the chapter. It appears only as a distractor.
- q9: `sys.fn_cdc_map_time_to_lsn` and the `N'all'` row filter for the net changes function come from general CDC knowledge. I didn't check them on a fetched page.

## Design notes

The mock bank already covers most decisions of these objectives. The quiz uses other ones:
- 2.3.1, 2.3.3: what classification stores; the change tracking primary key.
- 2.3.4: the `datetime`/`partial` prefix/`random` masks; DDM inference answered by a column DENY.
- 2.3.2: a database-level policy for one extra destination; immutability set to None; support operations audit with its own destination.
- 2.3.5: ledger database defaults; manual digests with `GENERATE LEDGER DIGEST` and `sp_verify_database_ledger`.
- 2.3.3: CDC net changes on a table without a primary key (`@index_name`, gating role).
- 2.3.6: RLS with block predicates only (BEFORE UPDATE, AFTER UPDATE, BEFORE DELETE).
