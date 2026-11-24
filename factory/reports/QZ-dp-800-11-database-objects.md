# QZ-dp-800-11-database-objects — end-of-chapter quiz, DP-800, chapter 11

Result: `content/dp-800/quizzes/11-database-objects.yaml`, 10 questions (dp800-qz-11-01 to -10), EN + FR. `npx tsx factory/check-quiz.ts dp-800 11-database-objects` = 0 problem(s), 0 warning(s).

- Objectives: 1.1.1 (q1, q8), 1.1.2 (q6, q7, q10), 1.1.3 (q4), 1.1.4 (q3), 1.1.5 (q2), 1.1.6 (q5, q9).
- Formats 6-10: dropdown, yesno_statements, single, multi, single.
- Decisions chosen to avoid the 58 mock-exam questions of 1.1.x: NEWSEQUENTIALID vs NEWID/ROWGUIDCOL, ALTER SEQUENCE RESTART WITH, column-level vs table-level CHECK and DEFAULT without column names, one JSON index per json column (drop and re-create to add a path), RANGE LEFT with datetime2 boundaries, memory-optimized hash/nonclustered/durability DDL, temporal history tampering vs ledger (no conversion) vs UTC, columnstore REORGANIZE WITH COMPRESS_ALL_ROW_GROUPS, SWITCH needs empty target on the same filegroup, edge constraint clauses OR vs separate constraints AND.

## Verified on learn.microsoft.com (2026-11-24)

NEWSEQUENTIALID; ALTER SEQUENCE (RESTART WITH, no START WITH, type can't change); CREATE TABLE (column-level CHECK references only its column, DEFAULT = constant/scalar function/NULL); CREATE JSON INDEX (one per json column, modifying paths requires re-creating, no overlap, clustered key, no preview label); CREATE PARTITION FUNCTION (LEFT/RIGHT semantics, n+1 partitions); Indexes on Memory-Optimized Tables (hash vs nonclustered, PK required for SCHEMA_AND_DATA); Troubleshooting Hash Indexes (BUCKET_COUNT 1-2x distinct keys); Temporal tables (UTC period columns, AS OF); Temporal table security (history read-only while versioning ON; CONTROL on both tables to turn it off); Ledger considerations and limitations (no conversion either way); index maintenance page (columnstore REORGANIZE online, COMPRESS_ALL_ROW_GROUPS for OPEN rowgroups, deleted rows removed at 10 %, rebuild online only from SQL Server 2019 with ONLINE = ON); ALTER TABLE SWITCH (target exists and empty, same filegroup incl. indexes); Edge constraints (clauses OR, constraints AND, CASCADE/NO ACTION).

## Not verified on a fetched page (common T-SQL behaviour, check in review)

- q1: ROWGUIDCOL doesn't generate values (CREATE TABLE section not reached in the fetched part).
- q6: `CLUSTERED` primary key / index not supported on memory-optimized tables is inferred from the index page listing only hash and nonclustered (columnstore separately).
- q7 s1: changing history rows after `SYSTEM_VERSIONING = OFF` is inferred (the security page only says history is read-only while ON).
- q9 option c: a CHECK constraint on the target isn't needed for a switch out (the SWITCH text doesn't mention CHECK constraints).
- I left out the "nonaligned index blocks SWITCH" trap because the SWITCH text on ALTER TABLE doesn't state it.

## Chapter / Learn discrepancies

- None found that contradict the chapter. The chapter says "BUCKET_COUNT one to two times the distinct keys"; Learn adds that 2-3x suits equality-heavy workloads.
- The partition switching page (`/sql/relational-databases/tables/transfer-data-efficiently-by-using-partition-switching`) didn't load (client error) and the `ownership-chains` URL under `/sql/relational-databases/security/` failed too; the quiz cites ALTER TABLE instead.
- Whether JSON indexes are GA in SQL Server 2025 wasn't checked on the "What's new" page (rate limit). The CREATE JSON INDEX page shows no preview label.
