# QZ-dp-800-12-programmability — end-of-chapter quiz, DP-800, chapter 12

Result: `content/dp-800/quizzes/12-programmability.yaml`, 10 questions (dp800-qz-12-01 to -10), EN + FR. `npx tsx factory/check-quiz.ts dp-800 12-programmability` = 0 problem(s), 0 warning(s).

- Objectives: 1.2.1 (q1, q9, q10), 1.2.2 (q3, q7), 1.2.3 (q4), 1.2.4 (q2, q6), 1.2.5 (q5, q8).
- Formats 6-10: dropdown, single, dropdown, multi, multi.
- Decisions chosen to avoid the 44 mock-exam questions of 1.2.x: WITH ENCRYPTION, EXECUTE-only permission through ownership chaining, two-part name for scalar UDF calls, inline TVF facts, direct trigger recursion with RECURSIVE_TRIGGERS OFF, parameterized sp_executesql (Unicode @params, no concatenation), SCHEMABINDING for a deterministic UDF in an indexed computed column, INSTEAD OF DELETE soft delete, broken ownership chain fixed by schema transfer plus re-grant, indexed view blocked by outer join and GETDATE().

## Verified on learn.microsoft.com (2026-11-24)

CREATE VIEW (ENCRYPTION, replication, only ENCRYPTION/SCHEMABINDING/VIEW_METADATA attributes); Managing Permissions with Stored Procedures in SQL Server (ownership chaining, EXECUTE only, parameterize dynamic SQL); CREATE FUNCTION (two-part name for scalar calls, inline TVF = single SELECT, no EXECUTE AS on inline TVFs, SCHEMABINDING required for determinism); Indexes on computed columns (deterministic and precise, same owner, PERSISTED for imprecise); CREATE TRIGGER (INSTEAD OF semantics and cascade restriction, FOR/AFTER, RECURSIVE_TRIGGERS prevents direct recursion only, fire whether rows are affected or not); sp_executesql (Unicode @stmt/@params, name + type, plan reuse, injection warning); ALTER AUTHORIZATION (schema transfer drops permissions on schema-contained objects without explicit owners); Create indexed views (no outer joins, deterministic WHERE, GETDATE, SUM on nullable, COUNT_BIG).

## Not verified on a fetched page (check in review)

- q4 s1: predicate pushdown into an inline TVF is from the chapter; the page cited only covers the single-SELECT body.
- q5: RECURSIVE_TRIGGERS is OFF by default (ALTER DATABASE SET options page not fetched).
- q6: sp_describe_first_result_set and sp_prepare used as distractors from long-standing knowledge.
- q7 option a: "PERSISTED requires a deterministic expression" (CREATE TABLE section not fetched); the cited page only says PERSISTED is for deterministic but imprecise expressions.

## Chapter / Learn discrepancies

- The chapter (ownership chaining with views) doesn't mention that `ALTER AUTHORIZATION ON SCHEMA` drops the permissions on objects with no explicit owner; q9 relies on Learn for this. Worth a line in the chapter.
- The chapter says WITH ENCRYPTION "obfuscates the definition in sys.sql_modules"; CREATE VIEW on Learn words it as encrypting the entries in sys.syscomments. It means the same thing, but the wording could match Learn.
- The URL `/sql/relational-databases/security/ownership-chains` couldn't be fetched (client error), so the quiz cites the ADO.NET page "Managing Permissions with Stored Procedures in SQL Server".
