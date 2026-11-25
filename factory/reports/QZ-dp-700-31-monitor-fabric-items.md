# QZ-dp-700-31-monitor-fabric-items — notes

`content/dp-700/quizzes/31-monitor-fabric-items.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.1.1 (q3, q4), 3.1.2 (q1, q5, q6, q8), 3.1.3 (q2, q7), 3.1.4 (q9, q10). Positions 6–10: single ×3, yesno, dropdown.

## Preview status (important for the chapter and the mock bank)

- **Preview on current Learn**: the new **Monitor hub** ("The Monitor hub is currently in preview"), its **Job runs** page ("currently in preview"), **job alerting in the Monitor hub** ("Set up job alerts in the Monitor hub (preview)"; the page says this covers both the schedule failure notifications and the Activator-based alerts), **workspace monitoring** ("What is workspace monitoring (preview)?") and the Operations agent investigation.
- The chapter labels workspace monitoring and the new Monitor hub as preview. It doesn't say that the Schedule failures and Alerts (paid) pages are preview, and its alerts table presents them as the default answers.
- Several mock questions make these preview features the **correct answer**, which breaks the rule "never make a preview feature the correct answer". They should be reviewed:
  - workspace monitoring: `dp700-cs4a-ingestion-failures`, `dp700-3a-dataflow-90-days`, `dp700-3a-ingestion-results-kql`, `dp700-3a-failed-pipelines-kql`, `dp700-3a-notebook-jobtype-kql`, the KQL item of `dp700-3a-refresh-tool-match`;
  - Job runs page or Monitor hub alerts: `dp700-3a-jobruns-filter`, `dp700-3a-alert-all-runs`, `dp700-3a-paid-alert-order`, `dp700-3a-schedule-failure-email`, the schedule failure item of `dp700-3a-alert-mechanism-match`, and statement s2 of `dp700-3a-ingest-monitor-yesno`.
- To respect the rule, this quiz uses only the legacy Monitoring hub, run detail pages, eventstream Data insights and Runtime logs, Dataflow Gen2 refresh history, query insights, Direct Lake behaviour, Real-Time hub Job events and Activator rules as correct answers.

## Chapter vs current Learn

- Job runs page: the refresh control is called **Reload** in the text and **Refresh** in the table of the same Learn page. The chapter uses "Refresh".
- Eventstream monitoring: Learn has a third metric set for streaming connector sources (Kafka, CDC sources, Google Pub/Sub, Kinesis...): Source Outgoing/Incoming Events, Connector Errors Logged, Connector Processing Errors and Failures, Connector Events Skipped. The rich metric set also applies to IoT Hub, derived stream and Activator nodes. The chapter mentions neither.
- Workspace monitoring now also collects Activator, mirrored database, copy job, GraphQL, SQL database and Real-Time Dashboard logs. The chapter's workload table is shorter.

## Unverified

- q9: the Job events page doesn't say whether these events are GA or preview, and it doesn't say whether runs started by a pipeline raise them. The scenario only uses scheduled and manual runs, which the page documents (`jobInvokeType` Scheduled or Manual). The failure notifications in the item's schedule (distractor a) belong to the job alerting feature that is in preview.
- q10: the condition names (`EXIT RANGE`, `INCREASES`, `DECREASES`, absence of data) are as written on the "Fabric Activator rules" page. The exact labels in the Activator UI weren't checked.
- q4: the claim that a lakehouse's Recent runs show its own jobs (table maintenance) and not eventstream logs is general knowledge.

## Design notes

- The new decisions are: the `long_running_queries` view, Direct Lake framing, rerun from a selected activity of a run that succeeded, Runtime logs for eventstream errors, Dataflow Gen2 history depth (50 refreshes) against log retention (28 days), `sql_pool_insights` for pressure, Direct Lake on SQL fallback (refresh warning plus slow queries), cross-database queries / `query_hash` / Contributor rights in query insights, Job events alerts covering manual runs and successes, and a stateful `EXIT RANGE` rule per shipment.
