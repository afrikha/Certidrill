# FIX-dp-700-2 — chapters 22, 23, 31, 32 and 33 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-700 22-batch-data 23-streaming-data 31-monitor-fabric-items 32-resolve-errors 33-optimize-performance` 0 problems; `content:validate --cert dp-700` 0 problems, 0 warnings; `check-quiz dp-700` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers untouched. The web-fetch budget ran out twice during the pass (shared hourly limit); every fact below was fetched before it was used.

## 22-batch-data

| Finding | Learn | Change |
| --- | --- | --- |
| Mirroring after a capacity pause | Confirmed (mirroring/troubleshooting): after the capacity resumes, the mirrored database shows **Paused** until **Resume replication**; a long pause can reseed from the beginning; throttling resumes by itself | mirroring section, Cost bullet; key point |
| Activator also takes operators before ingestion | Confirmed (process-events-using-event-processor-editor: Lakehouse, Eventhouse with event processing, derived stream, Activator) | None: this is in chapter 23, which already lists Activator |
| KQL database shortcut sources | Confirmed (real-time-intelligence/onelake-shortcuts): internal KQL databases, lakehouses, warehouses; external ADLS, Amazon S3, Google Cloud Storage | shortcuts section: the targets bullet now separates lakehouse and KQL database shortcuts |
| Refresh materialized lake view activity | Confirmed (data-factory/activity-overview, no preview label) | pipeline-ingestion: added to the activity list |
| T-SQL in a KQL database is query-only | Confirmed (kusto/query/t-sql): DQL only; CREATE, INSERT, DROP, ALTER not supported; `explain` returns the KQL of a SELECT | choose-store table "KQL (and read-only T-SQL)"; transform-code lead-in sentence |
| Workspace monitoring named without its status | Preview (workspace-monitoring-overview) | mirroring section: "(preview)" |

## 23-streaming-data

| Finding | Learn | Change |
| --- | --- | --- |
| Update policy and other databases | Confirmed (kusto update-policy): the function can reference other databases if the policy has a `ManagedIdentity` with `viewer` on them; no cross-eventhouse query, no plugin | kql-processing bullet |
| Update policies over accelerated shortcuts | Learn contradicts itself (query-acceleration-overview: not supported; update-policy: allowed with `Hot` >= 100 years, plus a preview section for external delta tables as source) | None. For a human decision |
| Schema changes, standard vs accelerated | Confirmed (query-acceleration-overview): a schema change needs an `.alter` of the external delta table schema; a breaking change can restart acceleration from scratch | native-or-shortcut sentence narrowed to standard shortcuts; query-acceleration limits bullet |
| SQL operator and eventstream names | Confirmed (process-events-using-sql-code-editor): names with `_` or `.` aren't compatible | eventstream section |
| Group by window types | Training unit "Eventstream transformations": "various time windows including" tumbling and sliding; no Fabric doc page lists them | Operator table: "(such as tumbling or sliding)" |

## 31-monitor-fabric-items

| Finding | Learn | Change |
| --- | --- | --- |
| Monitor hub, Job runs page, job alerting are preview | Confirmed: monitoring-hub ("currently in preview"), monitoring-hub-jobs ("Job runs page ... in preview"), monitoring-hub-alerts ("Job alerting in the Monitor hub is currently in preview"). The legacy Monitoring hub is not preview (data-factory/monitor-pipeline-runs, monitoring-hub-pipeline-runs) | Tool table: legacy Monitoring hub first, Job runs (preview); workspace monitoring (preview); alerts row. Paragraph after the table; Job runs heading; Activator-based job alerts (preview); key points |
| Per-item failure notifications | job-scheduler (no preview label): set in the item's schedule, item level for all its schedules, scheduled runs only, Entra users or groups including B2B guests | Alerts table row 1 and paragraph now lead with the item's **Failure notifications**; the Contributor/Write rule is attributed to the Monitor hub alerts page, the only page that states it |
| Activator on Job events | explore-fabric-job-events and set-alerts-fabric-job-events: no preview label; ItemJobCreated (manual or scheduled), ItemJobSucceeded, ItemJobFailed | Alerts table row 2 adds it as the GA option |
| Reload vs Refresh | Learn uses both on the same page | "the **Reload** icon (called **Refresh** in the page's list of tasks)" |
| Eventstream metric sets | Confirmed (event-streams/monitor): rich set also for IoT Hub, derived stream and Activator; third set for streaming connector sources | monitor-ingestion paragraph and a new sentence |
| Workspace monitoring workloads | Confirmed (workspace-monitoring-overview) | Workload table: warehouse snapshots, Mirroring, Databases/Data Engineering, Real-Time hub job events, Activator, Real-Time Dashboards, KQL querysets (3 rows added) |

## 32-resolve-errors

| Finding | Learn | Change |
| --- | --- | --- |
| Database shortcut tenant | Confirmed wrong (database-shortcut): same region, tenants can differ; at least contributor on the source data when created from a cluster URI. "Permissions on both databases" isn't on the page | eventhouse-errors sentence |
| `SET TRANSACTION ISOLATION LEVEL` "is ignored" | Learn disagrees: transactions page says a T-SQL change of isolation level "is ignored at query execution time"; tsql-surface-area lists the statement as unsupported ("Don't try to use these commands") | Chapter states both facts. Bank explanations ("ignored") left unchanged. For a human decision |
| `ALTER TABLE` subset | tsql-surface-area also says `ALTER TABLE ... ALTER COLUMN` is in preview | Table row: "(`ALTER COLUMN` is in preview)" |
| Spark bursting exceptions | Confirmed (spark-job-concurrency-and-queueing): F2 4/20, trial 128/128 and no queue, FTL4 8/16; capacity admins can turn on **Disable job-level bursting** (F64 job capped at 128) | notebook-errors paragraph. Chapter 33 compute paragraph: F2 and trial |
| Data conversion errors: fix unsourced | Learn defines the metric only | None |

## 33-optimize-performance

| Finding | Learn | Change |
| --- | --- | --- |
| Data clustering preview | Confirmed (data-clustering: "This feature is in preview"). Chapter already says preview | None in the chapter; two bank questions rewritten |
| Lakehouse Maintenance activity preview | Confirmed (lakehouse-table-maintenance: "Lakehouse Maintenance activity (Preview)"); activity-overview has no label | Chapter already says preview; bank question rewritten |
| Native execution engine status | Ambiguous: no banner, but "during the preview phase, specific configurations are necessary" and enablement "under active development" | None. For a human decision |
| Caching vs retention | cache-policy: the policies are independent, default effective policy `null` (all hot), no ≤ rule. workspace-monitoring-overview states "caching period must be less than or equal to the retention period" for the monitoring database | eventstream-eventhouse: "independent ... (keep the hot period within the retention)", plus the `null` default. Chapter 31 keeps the rule for workspace monitoring, as its page says |
| V-Order precedence | Confirmed (delta-optimization-and-v-order) | lakehouse-tables: session `true` wins over a writer option `false` |
| Maintenance dialog labels | Confirmed: **On** options for compaction (with **Apply V-order**), VACUUM and deletion vectors, then **Run now**; job in notifications and Monitoring hub | lakehouse-tables paragraph |

## Mock-exam bank questions changed (18)

Preview feature as the correct answer, rewritten (same id, type, objective, difficulty; `status: draft`):

- `dp700-3a-jobruns-filter` (3.1.1): answer is now the legacy Monitoring hub with its filters (Job runs page is preview). Reference: How to monitor pipeline runs in Monitoring hub.
- `dp700-3a-ingest-monitor-yesno` (3.1.1): s1 and s2 were Job runs page facts. Now s1 Submitter filter of the Monitoring hub (Yes), s2 Connector metrics on an Event Hubs node (No). Answers Yes/No/Yes.
- `dp700-3a-ingestion-results-kql` (3.1.1): was workspace monitoring `EventhouseIngestionResultsLogs`; now completes a `.show ingestion failures` query (10 days, FailureKind, by Table).
- `dp700-3a-failed-pipelines-kql` (3.1.1): was `ItemJobEventLogs` (workspace monitoring). Now ingestion volume and delay with `ingestion_time()`. The id no longer matches the content.
- `dp700-cs4a-ingestion-failures` (3.1.1, case study): answer was workspace monitoring; the stem now asks for the failures of the last three days with monitoring off, answer `.show ingestion failures`.
- `dp700-3a-dataflow-90-days` (3.1.2): was workspace monitoring with 90-day retention. Now: how far the refresh history of two dataflows goes (50 refreshes or six months, whichever first).
- `dp700-3a-notebook-jobtype-kql` (3.1.2): was `ItemJobEventLogs`. Now a T-SQL dropdown on `queryinsights.exec_requests_history` (`total_elapsed_time_ms`, `status = 'Succeeded'`, `query_hash`). The id no longer matches the content.
- `dp700-3a-refresh-tool-match` (3.1.3): workspace monitoring item and its target removed (3 targets, 5 items left); stem sentence on workspace monitoring removed.
- `dp700-3a-alert-all-runs` (3.1.4): answer was Monitor hub paid alerts; now Activator alert rules on Job events in Real-Time hub. Option a renamed to failure notifications.
- `dp700-3a-paid-alert-order` (3.1.4): now the three steps of an alert on Job events in Real-Time hub (Set alert, event types and item, Send email and save in an Activator item). The id no longer matches the content.
- `dp700-3a-alerts-yesno` (3.1.4): s2 was a paid-alert fact. Now: manual run and schedule notifications (No), Activator on Job events runs a pipeline (Yes), notifications per schedule (No).
- `dp700-3a-schedule-failure-email` (3.1.4): answer moved from the Monitor hub Alerts page to the failure notifications in the schedule of PL_Nightly.
- `dp700-3a-alert-guest-recipient` (3.1.4): stem and explanation moved to the schedule's failure notifications; reference Job Scheduler.
- `dp700-3a-alert-mechanism-match` (3.1.4): item "Schedule failure emails" became the failure notifications of the item's schedule; explanation and reference updated.
- `dp700-3a-alert-permissions` (3.1.4): stem now names the schedule's failure notifications. The Contributor/Write rule is stated only on the Monitor hub alerts page (preview), cited with Job Scheduler. See "For a human decision".
- `dp700-3c-add-clustering` (3.3.3): clustering is preview. Now a varchar/int join key mismatch fixed by CTAS (performance guidelines: same types for joins, avoid explicit conversions).
- `dp700-3c-cluster-columns` (3.3.3, multi d3): now int key matching the dimension plus one INSERT ... SELECT from the lakehouse table.
- `dp700-3c-load-maintain-order` (3.3.2): the Lakehouse Maintenance activity (preview) became a Notebook activity that runs an existing notebook with `OPTIMIZE fact_sales VORDER`. "Pipeline activities only, minimize effort" removed from the stem.

## Checked and left unchanged

- Update policy questions `dp700-2d-kql-policy-statements` (already says no managed identity), `dp700-cs1a-update-policy`.
- SQL operator questions: no eventstream name with `_` or `.` uses a SQL operator. Window questions use SQL operator functions, not the Group by operator.
- T-SQL in eventhouse statements (`dp700-2c-engine-statements`: "queried", still true).
- Bursting: `dp700-3d-capacity-sizing`, `dp700-3b-notebook-430-interactive`, `dp700-3b-notebook-queued-sources`, `dp700-cs2a-capacity-430` (F8 and up, 3x holds).
- Isolation level: `dp700-3c-blocking-resolve`, `dp700-cs4b-update-conflict`, `dp700-3c-append-merge-conflict` explanations say "ignored", which matches the transactions page.
- Caching/retention questions (`dp700-3d-retention-cost`, `dp700-3d-kql-policies-match`, `dp700-cs3a-cache-retention`, `dp700-3d-staging-softdelete`): none states the ≤ rule.
- Native engine questions `dp700-3d-native-engine-enable`, `dp700-cs2a-native-engine`, `dp700-3d-resource-profile`: status ambiguous, not changed.
- `dp700-3c-result-cache`: result set caching page has no preview label, enabled by default.
- Questions that only mention the Monitor hub in passing (spark-detail-tabs, spark-run-locations, sr2-policy-error-2) or use a preview feature only as a distractor (refresh-contacts, mirror-monitor explanation).

## Quiz files

None changed; all five quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- Case study `case-studies/dp700-cs4a-city-power.yaml`, requirement 6 ("use KQL to investigate the failed ingestion operations of EH-Grid over the last 30 days") is only met by workspace monitoring (preview). Not edited (case file outside my scope). No question tests it now.
- `dp700-3a-alert-permissions`: the role rule (Contributor or Write) comes only from the preview Monitor hub alerts page. Keep, or rewrite on another decision.
- Ids `dp700-3a-failed-pipelines-kql`, `dp700-3a-notebook-jobtype-kql`, `dp700-3a-paid-alert-order` no longer describe their content (ids kept as required).
- `SET TRANSACTION ISOLATION LEVEL`: transactions page ("ignored") vs surface area page ("not supported, don't use"). The chapter states both.
- Update policies over accelerated shortcuts: the two Learn pages contradict each other (chapter 23 still says "limited to a preview").
- Native execution engine: GA or preview? The page has no banner but still says "during the preview phase". Release notes not checked.
- Caching ≤ retention: stated only on the workspace monitoring page; the caching policy page says the policies are independent.
- Out of scope, not changed: `questions/manage/dp700-cs3c-shortcut-cache` (1.1.3) wasn't checked against the database shortcut tenant fact (it doesn't state it).

## French terms not settled (not in the glossary)

- « notifications d'échec » (Failure notifications), « événements de tâche (Job events) », « ensemble de requêtes KQL » (KQL queryset), « instantanés d'entrepôt » (warehouse snapshots), « réamorcer » (reseed), « capacité d'évaluation » (trial capacity, already used in chapter 32), « vecteurs de suppression » (deletion vectors), « supervision de l'espace de travail » (workspace monitoring, existing usage), « hub de surveillance » (Monitor hub, existing usage).
