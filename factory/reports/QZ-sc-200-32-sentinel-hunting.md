# QZ-sc-200-32-sentinel-hunting — report

File: `content/sc-200/quizzes/32-sentinel-hunting.yaml` (10 questions, `sc200-qz-32-01` to `-10`). `npx tsx factory/check-quiz.ts sc-200 32-sentinel-hunting` reports 0 problem(s) and 0 warning(s).

Coverage: 3.2.1 (q1, q9), 3.2.2 (q4, q8), 3.2.3 (q2, q6, q10), 3.2.4 (q3, q5, q7). Formats in positions 6–10: yesno_statements, single, multi, ordering, dropdown (KQL).

Learn pages fetched (Nov. 2026): sentinel/hunting, sentinel/bookmarks, sentinel/manage-data-overview, sentinel/summary-rules, azure-monitor/logs/summary-rules, datalake/kql-queries, datalake/kql-jobs, datalake/kql-manage-jobs, datalake/notebooks, datalake/notebook-jobs, datalake/sentinel-mcp-get-started, datalake/sentinel-mcp-tools-overview, datalake/sentinel-mcp-data-exploration-tool, datalake/sentinel-mcp-overview.

## Chapter (and mock questions) out of date or inaccurate against Learn

1. **Bookmarks in the Defender portal (important).** The bookmarks page ("Keep track of data during hunting with Microsoft Sentinel") now says bookmarks can be **created only in the Azure portal** (Microsoft Sentinel > Threat management > Hunting). In the Defender portal you can view existing bookmarks but can't add new ones; Incident actions on bookmarks are also listed as Azure portal only. The chapter (section hunting-queries, table and Exam trap) places Add bookmark and Incident actions on the Hunting page of the Defender portal without this caveat. Mock questions that rely on creating bookmarks should state the portal or be reviewed: `sc200-3b-hq-bookmark-incident`, `sc200-3b-hq-hunt-order`, `sc200-3b-hq-bookmark-facts`, `sc200-3c-hunting-tool-match` (t3), `sc200-sr2-hunt-schedule-3`. The quiz avoids bookmark creation for this reason.
2. **Notebook session timeout.** The chapter says "Interactive session timeout: 30 minutes by default, configurable". The notebooks page says both: the session timeout setting defaults to 30 minutes (configurable), and its limits table lists an "interactive session inactivity timeout" of 20 minutes. Session start is "about 5-6 minutes" (chapter: "a few minutes"). Not used in the quiz.
3. **Notebook jobs in the Defender portal.** The chapter says the Jobs page shows notebook jobs read-only. The notebook-jobs page says you can enable and disable a notebook job's schedule in the Defender portal and view its history, but not edit it (the manage-jobs page says "view-only"). Minor; q7 relies on "can't edit" only.
4. **Not in the chapter, useful to add:** disabling or deleting a KQL job doesn't stop runs already in progress or queued; a submitted notebook job is no longer linked to the local notebook (edit = download the definition, edit, Edit job, Submit; renaming creates a new job definition). q7 tests the latter, which a careful reader of the chapter can't fully derive: consider adding one sentence to the chapter.
5. **Summary rules:** the Azure Monitor page also says the rule is set to `isActive: false` after eight consecutive bin retries, and that data can only be processed from the recent past up to 24 hours. Restrictions for an Auxiliary source table aren't documented (only its pricing).

## Doubts and unverified points

- Data lake interactive query timeout: the kql-queries page gives 4 minutes in its limits table and 8 minutes elsewhere (not used).
- The data exploration collection page carries a prerelease notice (it seems to apply to the graph tools, which are marked preview); the MCP overview page has no preview notice. q3 uses only `search_tables` / `query_lake` and the Security Reader requirement.
- q9 (ordering): the Log Analytics Contributor assignment to `msg-resources-<guid>` is placed before creating the job, as Learn lists it as a prerequisite; strictly, it is needed before the first run (which starts at least 30 minutes after creation). Exam convention puts prerequisites first.
- q9 distractor "save under Shared queries in advanced hunting": the explanation relies on the Hunting page listing only Content hub queries and queries created there; no page states explicitly that advanced hunting shared queries don't appear in it.
- q10: Learn doesn't say what `TimeGenerated` contains in a summary rule destination table, so `TimeGenerated` isn't offered; `_BinStartTime` is the documented bin start column.
