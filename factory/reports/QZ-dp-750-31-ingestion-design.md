# QZ-dp-750-31-ingestion-design — report

File: `content/dp-750/quizzes/31-ingestion-design.yaml` (10 questions, ids dp750-qz-31-01..10). Check: `npx tsx factory/check-quiz.ts dp-750 31-ingestion-design` → 0 problem(s), 0 warning(s).

Objectives: 3.1.1 (q1, q6), 3.1.2 (q3, q7), 3.1.3 (q5, q9), 3.1.4 (q2, q8), 3.1.5 (q4, q10). Positions 6–10: dragdrop, ordering, single, dropdown, multi.

Before writing, I read the mock-exam questions of 3.1.1–3.1.5 (`dp750-3a-*`, `cs4a`). The quiz tests other decisions: credentials in secrets, managed table formats, Lakeflow Connect job/gateway behavior, monthly granularity under the 1 GB rule, batch-rerun vs checkpoint, a four-table extraction matrix (CDC for a small audited table, full extraction for a small table with deletes), the setup order of the SQL Server connector, foreign Iceberg tables, a three-table loading matrix, and a five-table partition review.

## Chapter / mock exam vs current Learn (Nov 2026)

- **SQL Server connector architectures.** The chapter says database connectors work "with an ingestion gateway and staging storage". The Learn page "Microsoft SQL Server ingestion connector" now also describes **Integrated CDC**: one pipeline, no separate gateway, staging set through `data_staging_options`. The chapter doesn't mention it. q3 and q7 say "standard architecture with an ingestion gateway" to stay unambiguous.
- **Streaming sources in Lakeflow Connect.** The chapter maps Kafka/Event Hubs to "Standard connector in a pipeline, or Structured Streaming". The page "Lakeflow Connect connector concepts" now lists **managed streaming connectors**: serverless, with a Unity Catalog connection; it names RabbitMQ. Check whether managed connectors now cover Kafka or Event Hubs. If so, the "most managed first" table in the chapter (and `dp750-3a-tool-match`, `dp750-3a-tool-statements`) needs an update. I avoided this decision in the quiz.
- **Foreign Iceberg tables.** The chapter says "read-only, through Lakehouse Federation". The training unit "Choose a data table format" only says that Iceberg tables of other catalogs (AWS Glue, Snowflake Horizon Catalog) are read "through foreign table connections". It mentions neither read-only nor Lakehouse Federation. I couldn't fetch the Iceberg docs page (rate limit), so I didn't verify the chapter's wording.
- **Partitioned → liquid conversion.** Mock questions `dp750-3a-replace-partitioning` and `dp750-cs3c-cluster-conversion` use `ALTER TABLE … REPLACE PARTITIONED BY WITH CLUSTER BY` (DBR 18.1). Chapter 31 says partitioning and liquid clustering "can't be combined", and chapter 32's Exam trap says to recreate the table with CTAS. If the in-place syntax exists, chapter 32's trap is out of date; if it doesn't, those mock questions are wrong. My fetch of `tables/partitions` failed (rate limit), so this is unverified. A human should check it.
- **Default trigger latency.** The Learn page "Configure Structured Streaming trigger intervals" gives "3-5 second latency" for the default trigger, which the chapter doesn't state.

## Unverified points / doubts

- q8: I verified only the training sentence about foreign Iceberg tables. The explanation adds that Unity Catalog governs access and that each query reads the current snapshot; that is consistent with federation, but I didn't read it on a fetched page. The option is worded "accessed through a catalog connection" to avoid the "catalog federation" / "Lakehouse Federation" naming question.
- q9: the triggers page implies but doesn't say that a `processingTime` query keeps running between batches, or that `availableNow` stops after processing (the chapter says both).
- q5: the Auto Loader page confirms checkpoint-based exactly-once and resume after failure. The fact that `spark.read` re-reads all the files on rerun is general Spark behavior (the chapter says it too).
- q7: Learn doesn't give a numbered setup procedure. The order (source CT/CDC → connection → gateway → pipeline) comes from the connector page: the admin creates the connection and non-admins then create gateway-pipeline pairs, and the pipeline references `ingestion_gateway_id`.
- Learn training uses "< 100K rows" for full extraction. q6 uses 15,000 and 20,000 rows, well below it.
