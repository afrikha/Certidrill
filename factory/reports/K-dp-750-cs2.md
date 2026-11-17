# K-dp-750-cs2 — 3 case studies, 17 questions (DP-750)

Case studies (prefix dp750-cs2):
- dp750-cs2a-wide-world-importers (cold-chain logistics; Event Hubs streaming, Auto Loader, file arrival trigger) — 5 questions: eventhubs-read (3.2.6), autoloader-schema (3.4.3), compute-choice (1.1.1), table-maintenance (4.4.5), file-trigger (4.2.2).
- dp750-cs2b-humongous-insurance (P&C insurer; governance, federation, sharing, SCD) — 6 questions: abac-mask (2.2.2), reinsurer-share (2.2.7), foreign-catalog (1.2.6), key-vault-scope (2.1.3), gold-privileges (2.1.1), scd-types (3.1.6).
- dp750-cs2c-fourth-coffee (retail chain; jobs, bundles, operations) — 6 questions: log-analytics (4.4.6), loyalty-merge (3.3.7), run-if (4.1.4), repair-run (4.4.2), bundle-modes (4.3.4), compute-acl (1.1.5).

Types: single 6, dropdown 4, multi 2, yesno_statements 2, dragdrop 2, ordering 1. Difficulty: 1 = 5, 2 = 9, 3 = 3.

## Deviations and notes
- Overlap avoided with work already present: dp750-cs1a (Lakeflow Connect from Azure SQL, expectations drop/fail/warn, row filter + mask, open sharing OIDC) and the series sr1 (liquid clustering, CAN RESTART, COPY INTO). That is why cs2 uses ABAC policies instead of table-level filters, Auto Loader schema evolution instead of expectations, and CAN ATTACH TO.
- Naming on Learn (Nov. 2026): Delta Sharing pages are now titled "OpenSharing" (no mention of "Delta Sharing" on the overview page); Databricks Asset Bundles are "Declarative Automation Bundles (formerly known as Databricks Asset Bundles)". Questions use the current Learn names.
- `TO \`account users\` EXCEPT ...` in the ABAC policy: the Learn examples use named groups; `account users` is the built-in account group, not shown in the CREATE POLICY examples.
- AUTO CDC `TRACK HISTORY ON (col, col)` with a positive column list is not shown with parentheses on Learn, so the dragdrop uses the documented `TRACK HISTORY ON * EXCEPT (...)` form only.
- The Kafka/Event Hubs service-credential example on Learn shows a generic `:9092` port; the question uses 9093, the Event Hubs Kafka port stated on the same Authentication page; 9092 is deliberately not offered as an option.
- Unverified and left out: start-up time of pro/classic SQL warehouses (explanations only say they lack the serverless fast start).
