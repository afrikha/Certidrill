# K-dp-750-cs4 — report

Case studies (2) and questions (12), all `status: draft`, validator: 0 problem(s).

- `dp750-cs4a-humongous-insurance` (insurance; Lakeflow Connect SQL Server + ClaimFlow CDC files, Unity Catalog row filter, OpenSharing to a reinsurer, bundles CI/CD, workspace-catalog binding): questions `dp750-cs4a-tracking-method` (3.1.1, dragdrop), `-claims-history` (3.2.4, dropdown SQL), `-row-filter` (2.2.3, dropdown SQL), `-reinsurer-share` (2.2.7, multi), `-prod-target` (4.3.4, dropdown YAML), `-catalog-binding` (1.2.2, single). Domains: data, governance, pipelines, environment.
- `dp750-cs4b-fourth-coffee` (retail IoT; Event Hubs Kafka endpoint into a serverless pipeline, expectations, file arrival trigger, repair run, liquid clustering): questions `dp750-cs4b-eventhubs-identity` (2.1.5, single), `-telemetry-stream` (3.2.6, dropdown Python), `-expectations` (3.4.4, yes/no), `-price-trigger` (4.2.2, single), `-repair-run` (4.4.2, single), `-events-layout` (3.1.9, single). Domains: governance, data, pipelines.
- Difficulty: 4 easy, 6 medium, 2 hard.

## Naming changes found on Learn (Nov. 2026)

- Databricks Asset Bundles are now **Declarative Automation Bundles** ("formerly known as Databricks Asset Bundles" on the bundles page). The case text uses the new name with the old one in parentheses.
- The Delta Sharing documentation is now titled **"What is OpenSharing?"**; modes are "Databricks-to-Databricks" and "Databricks-to-Open". No "formerly Delta Sharing" note on the page. The case says "OpenSharing, the Azure Databricks implementation of the Delta Sharing protocol". The course chapters should align.
- The Python reference is titled "Lakeflow pipelines Python language reference"; the questions keep the study-guide name Lakeflow Spark Declarative Pipelines.

## Points to double-check at review

- `dp750-cs4b-telemetry-stream`: the bootstrap server uses port 9093 (Event Hubs Kafka port, as in the OAUTHBEARER example of the Authentication page); the service-credential example on the same page shows a generic `:9092`. Port is not a slot.
- `dp750-cs4b-eventhubs-identity`: the role names Azure Event Hubs Data Receiver / Data Owner are standard Azure built-in roles but were not fetched in this task.
- `dp750-cs4a-prod-target`: the `mode` slot has only two options (development, production) because no other mode exists; the guide asks for 3–5.
- `dp750-cs4a-reinsurer-share`: relies on the ALTER SHARE default (WITH HISTORY on Databricks SQL and DBR 16.2+), so WITHOUT HISTORY must be explicit. Note: the Row filters page says OpenSharing providers cannot share tables with table-level policies; the shared table (gold.loss_summary) has none, the filtered table is silver.claims.
- ALTER SHARE page contains a probable doc error ("The table must not reside in Unity Catalog"); not used.
