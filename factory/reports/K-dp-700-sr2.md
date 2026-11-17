# K-dp-700-sr2 — report

5 Yes/No series × 3 questions (status draft), prefix dp700-sr2:

| Series | Objective | Domain | Answers (1-2-3) | Difficulty |
| --- | --- | --- | --- | --- |
| dp700-sr2-region-schedules | 1.4.2 | manage | N N Y | 2 1 2 |
| dp700-sr2-shared-session | 1.1.1 | manage | N Y N | 3 2 1 |
| dp700-sr2-furnace-window | 2.3.7 | ingest | N Y N | 2 2 3 |
| dp700-sr2-policy-error | 3.2.4 | monitor | Y N N | 2 3 1 |
| dp700-sr2-small-files | 3.3.1 | monitor | Y N N | 2 1 1 |

Mix: 5 easy / 7 medium / 3 hard.

## Deviations and overlap
- First drafts on 1.2.1 (branch out) and 1.3.3 (column-level security) were dropped: dp700-sr1 wrote the same series in parallel (feature-isolation, marketing-columns). A KQL `has` vs `contains` series (3.3.6) was dropped for the same reason (dp700-sr1-error-code-query).
- Avoided decisions already tested by case studies: default environment for libraries (cs1c), native vs shortcut vs accelerated shortcut in RTI (cs3a), late-arriving dimension (cs4b), workspace roles (cs3a).
- 3.3.1 shares the VACUUM topic with dp700-cs3c-table-maintenance, but the decision tested here (auto compaction for a streaming writer) is different.

## Facts not verified / left out
- Fabric eventstream **Group by** operator window types: no Learn page confirmed hopping/session support, so the windowing series uses the **SQL operator** (Stream Analytics query language, verified on "Process events by using a SQL operator").
- "Up to 20 schedules per pipeline": the Learn sentence sits in the interval-based schedule section, so the limit was left out; only "several schedules, each with its own time zone and parameter values" is stated.
- `spark.highConcurrency.max` is not on the pipelines high-concurrency page (which states a maximum of 5 notebooks per session tag); the series uses 4 notebooks and does not rely on that property.
- Whether Microsoft Entra groups can be T-SQL principals in Fabric Warehouse could not be confirmed on Learn (relevant to the dropped CLS draft only).
