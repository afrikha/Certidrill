# K-dp-700-cs2 — report

Produced 3 case studies (all `status: draft`) and 18 questions, prefix `dp700-cs2`:

- `dp700-cs2a-blue-yonder` (airline, Spark structured streaming + lakehouse + Airflow): egt-window (2.3.5, dropdown), status-upsert (2.1.3), capacity-430 (3.2.3), planner-access (1.3.2), airflow-pool (1.1.4), native-engine (3.3.5, yes/no).
- `dp700-cs2b-munsons` (food producer, warehouse + pipelines + Dataflow Gen2 + Import model): retailer-tool (1.4.1), watermark-query (2.1.1, dropdown), brand-month (2.2.8, dropdown), dataflow-error (3.2.2), model-refresh (3.1.3), statistics (3.3.3, yes/no).
- `dp700-cs2c-wide-world` (importer, lakehouse/warehouse/eventhouse + Git): supplier-upsert (2.2.5, multi), copy-retry (3.2.1), transform-tools (2.2.2, drag and drop), git-conflict (1.2.1, ordering), moved-target (3.2.7), copy-partitions (3.3.2, dropdown).

## Deviations

- The cs1, cs3 and cs4 agents wrote in parallel and converged on the same decisions (accelerated shortcuts, cache/retention, Activator, mirroring, RLS/DDM code, deployment rules, query insights, merge code, domains, audit logs, endorsement, OneLake security roles, ForEach parameters) and on two of the companies first chosen here (City Power & Light, Lucerne Publishing). My first designs were dropped. This batch deliberately targets objectives that the other batches did not test when it was written (2.1.1, 2.1.3, 2.2.2, 2.2.5, 2.2.8, 3.1.3, 3.2.1, 3.2.2, 3.2.7, 3.3.2, 3.3.5, 1.1.4, 1.2.1). Re-check overlap at review time: 1.3.2 (planner-access, SQL-endpoint-only share) and 3.2.3 are close to cs3c-finance-access and cs1c-schema-mismatch but with different answers.
- Spark API facts (watermark/output modes, foreachBatch, Delta merge) are referenced to Azure Databricks pages on learn.microsoft.com, because Fabric Learn has no API-level page for them; the behaviour is Apache Spark / Delta Lake, identical in Fabric.

## Points to double-check

- dp700-cs2c-supplier-upsert: Learn says staging is required when the Copy sink is a Fabric Warehouse and the COPY statement reads directly only from Blob/ADLS Gen2. I did not verify whether the UI now enables staging automatically; the case says the staging settings are still at their defaults.
- dp700-cs2a-planner-access option d: "Read alone does not give access to table data through the SQL analytics endpoint without SQL permissions" is inferred from the sharing page (Read vs Read all with SQL analytics endpoint), not quoted.
- dp700-cs2b-model-refresh: the 4-consecutive-failure deactivation is from the Power BI scheduled refresh page; "Take over" is used only as a distractor.
- Activity overview page: the default value of Retry was not used (the fetched summary was ambiguous).
