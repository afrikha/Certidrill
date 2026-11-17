# K-dp-700-cs3 — report

3 case studies, 17 questions (single 8, dropdown 6, yesno_statements 2, dragdrop 1); difficulty 4 easy / 9 medium / 4 hard. Validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective) |
| --- | --- | --- |
| dp700-cs3a-proseware | Wind-farm telemetry, Real-Time Intelligence (Event Hubs → eventstream → eventhouse, Activator) | filter-ingest (2.3.4), kql-window (2.3.7), accelerated-shortcut (2.3.3), cache-retention (3.3.4), vibration-alert (3.1.4), workspace-roles (1.3.1) |
| dp700-cs3b-woodgrove | Insurance claims, mirroring Azure SQL DB + warehouse + deployment pipeline | mirroring (2.2.4), rls-code (1.3.3), masking (1.3.4), deploy-rule (1.2.3), query-insights (3.3.3) |
| dp700-cs3c-tailspin | E-commerce medallion lakehouse, pipelines + notebooks, S3 shortcut | merge-code (2.2.9), event-trigger (1.4.2), notebook-exit (1.4.3), shortcut-cache (1.1.3), finance-access (1.3.2), table-maintenance (3.3.1) |

## Points to check by a reviewer

- **merge-code**: `whenMatchedUpdateAll("cond")` with a positional condition. The fetched Learn page (Azure Databricks, "Upsert into a Delta Lake table using merge") shows `whenMatchedUpdateAll()` without arguments and a positional condition on `whenNotMatchedInsertAll`; the delta-spark API accepts a condition on both, but this was not seen on Learn. The reference is an Azure Databricks page because no Fabric page on MERGE was fetched (WebFetch budget ran out once during the task).
- **notebook-exit**: Learn documents `mssparkutils.notebook.exit()` and says mssparkutils is renamed to notebookutils; `notebookutils.notebook.exit` is inferred from that rename. `output.result.exitValue` comes from the Microsoft Fabric blog (not a Learn page).
- **rls-code**: the BLOCK distractor explanation ("restricts write operations") is general SQL Server behaviour; the Fabric RLS page documents only filter predicates.
- **event-trigger**: the Learn page describes Azure Blob Storage events; the case uses a general-purpose v2 account (no ADLS Gen2 mention) to stay within what the page says.
- **cache-retention**: "sharding" is a real Kusto policy used as a distractor; not checked on a Fabric-specific page.
- Eventstream Group by window types could not be verified on Learn, so windowing is tested with KQL `bin()` only.
- OneLake security is still labelled preview on the lakehouse sharing page (Nov 2026), so it is not tested here.
