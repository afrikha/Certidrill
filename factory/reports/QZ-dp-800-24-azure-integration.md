# QZ-dp-800-24-azure-integration — report

File: `content/dp-800/quizzes/24-azure-integration.yaml` (10 questions, `dp800-qz-24-01` to `-10`). Check: `npx tsx factory/check-quiz.ts dp-800 24-azure-integration` → 0 problem(s), 0 warning(s).

## Preview feature used as the correct answer in the mock exam
- Change event streaming is still **preview** on SQL Server 2025, Azure SQL Database, Managed Instance and Fabric. The source is "What is change event streaming (preview)", fetched on 2026-11-24. The chapter labels it preview, which is correct. However, `dp800-cs1b-partner-events` (answer d = CES), `dp800-2d-ces-setup-order` and `dp800-2d-ces-limitations` make CES the correct answer or the subject of the question. That goes against the rule "never make a preview feature the correct answer". To review. In the quiz, CES is only a distractor.

## Chapter incomplete or ambiguous against current Learn
- **Caching.** "Implement internal, level 1 cache" (DAB 2.0+) says the cache applies only to **REST** endpoints, not GraphQL. It also says `level` defaults to `L1L2`. The chapter states neither.
- **Session context.** "Implement row-level security with session context" says that when `set-session-context` is enabled, **response caching is disabled** for the data source. This is a good exam trap that the chapter doesn't mention.
- **Pagination.** The runtime reference uses `$limit=-1` (REST) and `first: -1` (GraphQL), and says values above `max-page-size` are **capped**. The chapter says `$first` with `-1`. Check which REST keyword DAB 2.x documents (`$first` keyword page against the runtime page).

## Inconsistencies inside the DAB documentation (no question depends on the disputed point)
- Authorization overview: the page says unconfigured roles inherit (named role → authenticated → anonymous), and also says undefined roles are denied. "What's new in version 2.0" confirms inheritance. Question 3 relies on it and cites both pages.
- Entities reference: the default of `rest.methods` for stored procedures is given as both `POST` and `["GET","POST"]`. The default of `graphql.operation` is given as both `mutation` and `query`. The chapter (POST, mutation) and the bank questions `dp800-cs1a-dab-search` and `dp800-2d-proc-query-call` depend on these defaults. The quiz avoids them.
- Data source reference: the default of `set-session-context` is given as `true`. Question 9 states the value explicitly (false), so it doesn't depend on the default.
- MCP tool names: the overview writes `describe_entities` and `read_records`, while the runtime `dml-tools` keys use hyphens. Question 1 uses the overview's spelling for the tools.

## Unverified or assumed
- Question 10: "Track Data Changes" confirms that change tracking and CDC can be enabled on the same **database**. It doesn't say so explicitly for the same table. The question assumes they can coexist on dbo.Orders.
- Question 4: `dab export` starts a temporary runtime, per "Export schema with the DAB CLI". That is why it is wrong.
- The Logic Apps page names only the "When an item is created" trigger. Standard built-in triggers need change tracking (verified).
