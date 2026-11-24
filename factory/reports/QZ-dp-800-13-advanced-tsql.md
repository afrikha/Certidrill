# QZ-dp-800-13-advanced-tsql — report

File: `content/dp-800/quizzes/13-advanced-tsql.yaml` (10 questions, `dp800-qz-13-01` to `-10`). `npx tsx factory/check-quiz.ts dp-800 13-advanced-tsql`: 0 problem(s), 0 warning(s).

Plan: 1 CTE semicolon (1.3.1) · 2 JSON strict mode (1.3.3) · 3 MATCH cycle, mutual blocks (1.3.6) · 4 ERROR_* called from a logging procedure (1.3.8) · 5 fuzzy blocking predicate (1.3.5) · 6 REGEXP_COUNT with `im` flags at compatibility level 160 (1.3.4, dropdown) · 7 NOT EXISTS vs LEFT JOIN filter placement vs NOT IN (1.3.7, multi) · 8 XACT_ABORT OFF inside TRY...CATCH (1.3.8, Yes/No) · 9 LAST_VALUE IGNORE NULLS carry-forward (1.3.2, dropdown) · 10 nested OPENJSON with AS JSON and OUTER APPLY (1.3.3, dropdown).

## The chapter (and mock questions) out of date against current Learn

- **Fuzzy string matching is no longer preview-only.** The Learn page "Fuzzy String Match" (fetched on 2026-11-24) says the functions are **generally available from SQL Server 2025 (17.x) CU11**, preview only on earlier builds ("If they're not enabled by default on your build, set PREVIEW_FEATURES to ON"). It also lists Azure SQL Managed Instance (SQL Server 2025 or Always-up-to-date update policy). The chapter says "They are in **preview**; in SQL Server 2025 they require `PREVIEW_FEATURES = ON`", and repeats it in Key points. Mock questions that depend on preview status or on the PREVIEW_FEATURES step: `dp800-1c-fuzzy-merge-suppliers` (ordering: the "preview" step is required because "PREVIEW_FEATURES is OFF by default"), `dp800-cs2b-supplier-duplicates` (its explanation), and the stems of `dp800-1c-fuzzy-*` (these are harmless because they set it to ON). The quiz states PREVIEW_FEATURES = ON in its stem, so it works on every build, and no answer depends on preview status.
- The chapter says "Every comparison is computed row by row, so reduce the candidate pairs first". The Learn fuzzy pages (overview, EDIT_DISTANCE) say nothing about performance. EDIT_DISTANCE only says that with maximum_distance the function "might stop processing" once the distance is exceeded. Q5 relies on plain join logic, not on a Learn statement.

## Inferred or not literally verified

- Q8: XACT_STATE() = 1 in CATCH after a foreign key violation with XACT_ABORT OFF. No Learn page says this word for word. I inferred it from TRY...CATCH (an error makes the transaction uncommittable inside TRY only when it would end the transaction outside TRY; example C says XACT_ABORT ON is what makes it uncommittable), from SET XACT_ABORT (with OFF, only the failing statement is rolled back), and from the XACT_STATE example, which commits when the state is 1.
- Q10: CROSS JOIN can't reference `o.Lines`, and OUTER APPLY keeps the left row when OPENJSON returns no rows. This is standard APPLY behavior; I didn't fetch the FROM clause page this session, so it isn't cited.
- Q6: the REGEXP_COUNT page states no compatibility level requirement, which agrees with the chapter (only REGEXP_LIKE and the TVFs need 170). The REGEXP_LIKE page wasn't re-fetched this session.
- The JSON path expressions page failed to load. Strict/lax behavior was verified on the JSON_VALUE and OPENJSON pages instead.
- IGNORE NULLS (Q9): Learn applies it to SQL Server 2022+, Azure SQL Database, Azure SQL Managed Instance and Azure SQL Edge. SQL database in Fabric isn't named in the argument section. Q9 uses Azure SQL Database.
- ERROR_PROCEDURE returns the name without the schema (Q4 says `usp_TransferCredit`). This matches the mock bank. I didn't re-fetch it.

## Doubts

- Q7 reuses the NOT IN/NULL trap of `dp800-1c-corr-not-in-null`, but only as one distractor. The tested decision is where the date filter goes in a LEFT JOIN, combined with a correlated NOT EXISTS.
- Q3's first wording was too close to `dp800-1c-graph-direction` (Social.Person/Follows) according to the checker. I rewrote it with Chat.Member/Chat.Blocks.
