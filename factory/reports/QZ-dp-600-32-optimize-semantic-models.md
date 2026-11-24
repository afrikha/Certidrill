# QZ-dp-600-32-optimize-semantic-models — report

File: `content/dp-600/quizzes/32-optimize-semantic-models.yaml` (10 questions, `dp600-qz-32-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts dp-600 32-optimize-semantic-models` → 0 problem(s), 0 warning(s).

## Coverage

| # | Objective | Type | Difficulty | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.2.1 | single | 1 | Aggregation precedence between two aggregation tables |
| 2 | 3.2.3 | single | 1 | Direct Lake doesn't need incremental refresh (framing, no model partitions, no hybrid tables) |
| 3 | 3.2.5 | single | 2 | Incremental refresh filter placed after a non-foldable step: move it so it folds |
| 4 | 3.2.2 | yesno | 2 | What a Boolean filter argument may contain (one table, scalar aggregation, not two tables) |
| 5 | 3.2.4 | single | 2 | Date table for a Direct Lake on SQL model (no calculated tables, no Auto date/time) |
| 6 | 3.2.1 | dropdown | 3 | Dual dimensions for regular relationships, RLS on a dimension related to both tables, Profiler event |
| 7 | 3.2.3 | ordering | 3 | TABLETRAITS, then OPTIMIZE/VACUUM, then refresh because automatic updates are off |
| 8 | 3.2.5 | single | 3 | Back-dated update of one historical partition via SSMS/XMLA |
| 9 | 3.2.4 | yesno | 3 | Direct Lake on OneLake: SSO vs fixed identity permissions, OneLake security evaluated for the fixed identity |
| 10 | 3.2.2 | dropdown | 3 | FILTER over VALUES with measures (context transition), COUNTROWS keeping blanks |

Read all 65 mock-exam questions of 3.2.1–3.2.5 first. The bank covers this chapter closely. Positions 4 and 10 share some patterns with bank questions (`dp600-3c-boolean-filter-candidate`, `dp600-3c-iterator-context-transition`, `dp600-3c-blank-to-zero`), but they test other decisions and other combinations.

## Chapter issues against current Learn (chapter not edited)

1. **Aggregation table storage mode.** The chapter's table says the aggregation table storage mode is "Import (can't be changed afterwards)". Learn ("User-defined aggregations") says it can be Import, or DirectQuery optimized with columnstore indexes. Only the Import setting is irreversible. The chapter should say "Import or DirectQuery; Import can't be changed back".
2. **SQL analytics endpoint RLS with Direct Lake on OneLake: Learn contradicts itself.** "Direct Lake overview" (considerations table) says queries succeed, because OneLake doesn't apply SQL-based RLS. "Integrate Direct Lake security" says that if a table in the SQL analytics endpoint enforces RLS, Direct Lake on OneLake returns an error. The chapter's trap ("the query succeeds without the SQL filter") follows the overview. No quiz question depends on this point. Check the mock questions that rely on it.
3. **Splitting datetime columns.** The chapter recommends splitting a datetime into date and time columns. I didn't find it on the Learn pages I fetched ("Data reduction techniques for Import modeling", "Understand Direct Lake query performance"). It's a known VertiPaq practice but unverified on Learn, so the quiz doesn't test it.
4. **Detail missing from the chapter.** "How Direct Lake works" says one table that exceeds a guardrail prevents Direct Lake mode for the entire model. The overview says the guardrails other than model size are evaluated per query. The chapter says neither. Not tested.
5. **Old FILTER guidance on Learn.** "Avoid using FILTER as a filter argument in DAX" still says to use FILTER for the `||` operator. "CALCULATE function (DAX)" allows Boolean filters on several columns of a single table. The quiz avoids `||` and uses only rules stated on the CALCULATE page.

## Doubts

- Q1: option b (Dual aggregation table) is wrong because storage mode doesn't decide which aggregation table is tried first. Learn doesn't say whether a Dual aggregation table is allowed, and the explanation doesn't claim either way.
- Q3: the failing step calls a custom function (`fnChannel`). The stem states that View Native Query is unavailable from that step onward, so the answer doesn't rest on knowing which M functions fold.
- Q7: Learn gives the guardrail fix as "OPTIMIZE and VACUUM", so the quiz keeps both as one action.
