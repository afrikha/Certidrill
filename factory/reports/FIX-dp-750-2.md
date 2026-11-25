# FIX-dp-750-2 — chapters 32, 33, 34, 35 and 41 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-750 32-data-modeling 33-ingestion 34-transformation 35-data-quality 41-pipeline-design` 0 problems; `content:validate --cert dp-750` 0 problems, 0 warnings; `check-quiz dp-750` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers untouched. The shared WebFetch budget ran out several times. Every finding below was fetched before any change was made.

## 32-data-modeling

| Finding | Learn | Change |
| --- | --- | --- |
| Deletion vectors "enabled by default from DBR 14.1" | "Deletion vectors in Databricks": Delta tables need explicit enablement; the workspace setting *Auto-enable deletion vectors* turns them on for new tables (SQL warehouse or DBR 14.3 LTS+), "default settings vary by region". MERGE needs DBR 14.3 LTS without Photon, 12.2 LTS with Photon. The DP-750 training unit "Design and implement a clustering strategy" still says "enabled by default … 14.1" | clustering paragraph rewritten (explicit enablement, setting, MERGE runtime); key points |
| Row-level concurrency conditions | "Row-level concurrency": DBR 14.3 LTS+, no partitions, deletion vectors (the deletion vectors page says 14.2; the specific page is followed). "Use liquid clustering for tables": clustered tables allow row-level concurrency, and turning off deletion vectors turns it off | Table cell "Row-level concurrency (with deletion vectors)"; paragraph "(DBR 14.3 LTS and above, unpartitioned tables only)" |
| Liquid clustering runtime (not in the QZ report) | "Use liquid clustering for tables": GA for Delta tables on DBR 15.4 LTS+ (managed Iceberg 16.4 LTS+). The training unit says 13.3 LTS | "requires DBR 13.3 LTS" became "generally available for Delta tables from DBR 15.4 LTS" |
| Partitioned → liquid trap (CTAS only), flagged by FIX-dp-750-1 | Same page: `ALTER TABLE … REPLACE PARTITIONED BY WITH CLUSTER BY` on DBR 18.1+, then `OPTIMIZE … FULL` | Exam trap rewritten: in-place conversion on 18.1+, CTAS on older runtimes; key points |
| "Legacy" change data feed | "Use change data feed on Azure Databricks": legacy CDF = per-table property, materialized at write time; **automatic change data feed** (DBR 19+, UC Delta tables with row tracking, managed or external, or Iceberg v3) computes changes at read time, same `table_changes` / `readChangeFeed`; "Databricks recommends that you migrate". No status label | Table cell "(legacy feed)"; new paragraph after the table; trap and key points say "legacy" |
| SCD2 MERGE pattern not on Learn | Training unit "Implement a slowly changing dimension (SCD) type 2": `MERGE` that closes changed rows and inserts new keys, then `INSERT … SELECT` of new versions. The chapter's single-MERGE pattern is valid MERGE semantics | One sentence citing the two-statement variant. The training's join on `valid_to = current_timestamp()` looks fragile; not reproduced |
| Granularity unit has no hourly level | "Choose granularity…": the IoT example stops at minutes, but its requirements table has exactly the chapter's four rows (millisecond, second, minute, hourly) and the "finer grain when uncertain" advice | None. Column granularity isn't in the unit; not contradicted |
| Recovery period configurable | "Unity Catalog managed tables": 7 days default; 0 hours or 7–30 days, "Configurable recovery period is in Public Preview" | UNDROP row: configurable range marked Public Preview |
| External tables: formats, drop | "Work with external tables": formats match; drop needs ownership or `MANAGE`; privileges match | One sentence on drop privileges |

## 33-ingestion

| Finding | Learn | Change |
| --- | --- | --- |
| Event Hubs: UC service credentials missing; OAuth in UC pipelines | "Authentication" (Kafka): DBR 16.1+, service credential recommended on shared (standard) clusters or serverless; `databricks.serviceCredential`; don't set `kafka.security.protocol`, `kafka.sasl.mechanism`, `kafka.sasl.jaas.config` and the other SASL options; access connector needs Event Hubs permissions. Client ID/secret: dedicated 12.2 LTS+, standard 14.3 LTS+, pipelines **without** Unity Catalog; "does not work … on Unity Catalog Lakeflow pipelines" (the page also contradicts itself on standard access mode) | event-hubs paragraph: service credential sentence; client ID/secret not supported in UC pipelines; "the same options" became "the Kafka options". Key points |
| Lakeflow Connect auto full refresh, window, queryable snapshot | "Fully refresh target tables": section applies to **database connectors** only. Auto full refresh off by default; truncate, incompatible schema change, column rename, column added with default; `min_interval_hours` 24. Window: `start_hour`, `days_of_week`, `time_zone_id` (UTC default). Data stays queryable during the snapshot: CDC section, database connectors | Full refresh row rewritten, scoped to database connectors |
| `addNewColumns` vs provided schema (Q9 relies on it) | "Configure schema inference and evolution in Auto Loader": `addNewColumns` isn't allowed with a provided schema, works with schema hints; hints are used only when no schema is provided | One sentence after the evolution-mode table |
| Bundles naming | "What are Declarative Automation Bundles?": "Declarative Automation Bundles (formerly known as Databricks Asset Bundles)" | "(now named Declarative Automation Bundles on Learn)" added; exam name kept. See human decision |
| AUTO CDC new clauses | "AUTO CDC INTO (pipelines)": `SYSTEM SEQUENCE BY` and `STORED AS BITEMPORAL` are **Beta**; `AUTO CDC … ONCE`, `COLUMNS TO UPDATE`, `IGNORE NULL UPDATES ON (…)` carry no label. The page doesn't state the serverless/Pro/Advanced requirement or mention `APPLY CHANGES` | None (additions not needed; bitemporal must never be an answer) |
| `read_files` inferColumnTypes contradiction | Not re-fetched | None |

## 34-transformation

| Finding | Learn | Change |
| --- | --- | --- |
| `REPLACE USING` DataFrame form, `REPLACE ON`, legacy behavior, empty source | "Selectively overwrite data with Delta Lake": `REPLACE USING` SQL 16.3+, Python/Scala 18.2+ (`.option("replaceUsing", …)`); 16.3–17.1 legacy = partition overwrite only, all partition columns in `USING`; `REPLACE ON` SQL 17.1+, Python/Scala 18.2+ (`replaceOn`, `targetAlias`), `<=>` treats NULLs as equal; empty source: `REPLACE USING`/`ON` delete nothing, `REPLACE WHERE` might delete rows. No status labels | Load table: DataFrame cell for `REPLACE USING`, new `REPLACE ON` row; paragraph: NULL keys, legacy range, empty source |
| `replaceWhere` constraint check override | Same page: classic compute, `spark.databricks.delta.replaceWhere.constraintCheck.enabled = false` overwrites the range and inserts the rest | Same paragraph, one clause |
| `MERGE WITH SCHEMA EVOLUTION` 15.2 vs 15.4 LTS | SQL reference "MERGE INTO": DBR 15.2+. Feature page "Update table schemas with schema evolution": DBR 15.4 LTS+ | None (chapter follows the feature page). For a human decision |
| Data Profile tab no longer on the outputs page | "Notebook outputs and results" documents only **Open selection details**. "Tutorial: EDA techniques using Databricks notebooks" still documents **+ > Data Profile** next to **Table**, DBR 9.1 LTS+, no deprecation note | None |
| `DECFLOAT`, `melt` alias | Not fetched | None (not confirmed) |

## 35-data-quality

| Finding | Learn | Change |
| --- | --- | --- |
| UNIQUE is Public Preview | "Constraints on Azure Databricks": PK/FK GA from DBR 15.2; UNIQUE Public Preview (Databricks SQL and DBR 18.2+), nullable, NULLs distinct; all three informational | Uniqueness row labelled |
| `addNewColumnsWithTypeWidening` Public Preview | Auto Loader schema page: "Public Preview in Databricks Runtime 16.4 and above" | Mode row labelled |
| `addNewColumns` with a provided schema; schema hints | Same page (see 33) | One sentence after the mode table |
| Expectations: REPLACE WHERE flows; standalone tables | "Manage data quality with pipeline expectations": not supported on tables targeted by REPLACE WHERE flows; Databricks SQL standalone streaming tables/MVs have no Data quality tab (event log) | Two rules extended |
| CHECK `DROP FEATURE` | Constraints page: DBR 15.4 LTS+ removes check constraints and downgrades the protocol | One sentence |
| CTAS and constraints | Constraints page: "CTAS statements don't support this constraint clause" for PK/FK/UNIQUE; nothing about NOT NULL/CHECK | Rule narrowed to the PK/FK/UNIQUE clauses |

## 41-pipeline-design

| Finding | Learn | Change |
| --- | --- | --- |
| Continuous mode discouraged | "Triggered vs. continuous pipeline mode": recommends a continuous job with Pipeline mode Triggered; built-in continuous "not being removed, but Databricks discourages its use for new pipelines"; the job takes precedence over the pipeline mode | Pipeline mode row; key points |
| `CREATE VIEW` in pipelines | "CREATE VIEW (pipelines)": Unity Catalog pipeline, default publishing mode only; unique in the target catalog and schema; no expectations, no streaming query, not a streaming source; no status label. "CREATE TEMPORARY VIEW (pipelines)": private to the pipeline, not added to the catalog | New paragraph after the `STREAM` paragraph (table unchanged) |
| Timeout per retry | QZ report: chapter correct | None |
| Job parameters "apply to every task" | Not contradicted, not confirmed (QZ report) | None |
| For each limits (Inputs 5,000, parameters 10,000 characters) | Not re-fetched (budget) | None |

## Mock-exam bank questions changed

None. No question of objectives 3.1.6–3.1.10, 3.2.1–3.2.7, 3.3.1–3.3.7, 3.4.1–3.4.4 or 4.1.1–4.1.6 contradicts a verified fact.

## Checked and left unchanged

- Clustering and deletion vectors: `dp750-3b-ctas-cluster-change`, `-layout-statements`, `-zorder-partitioned`, `-cluster-auto-prereqs`, `-dv-purge-steps`, `dp750-cs3c-cluster-conversion` (already uses `REPLACE PARTITIONED BY WITH CLUSTER BY`, DBR 18.1). None says deletion vectors are on by default or that liquid clustering needs 13.3.
- Change data feed: `dp750-3b-history-statements`, `-cdf-table-changes`, `-cdf-history-steps`, `-cdf-checkpoint-recovery` (legacy CDF set with the property on DBR 17.3: "only after enablement" holds). `dp750-3a-delta-default-cdf` (3.1.4, not mine) says CDF is specific to Delta Lake; automatic CDF also covers Iceberg v3. Reported, not changed.
- Managed/external and UNDROP: `dp750-3b-undrop-managed` (7-day default), `-table-type-*`, `-set-managed-steps`.
- Event Hubs: `dp750-3c-eh-service-credential-steps`, `-eh-read-kafka-sql`, `dp750-cs1b-eventhubs-read`, `cs2a-eventhubs-read`, `cs4b-telemetry-stream` already use `databricks.serviceCredential` without SASL options; `dp750-3c-eh-sasl-connstr` (connection string, `PLAIN`) is still valid.
- Lakeflow Connect full refresh: `dp750-3b-lc-full-refresh`, `-lc-statements` (database connector scenarios).
- Loads: `dp750-3d-insert-only-merge`, `-insert-by-name` (`REPLACE USING` as distractor, explanation right); `-merge-schema-evolution` and `-insert-schema-evolution` state no conflicting runtime.
- Constraints and schema evolution: `dp750-3d-constraint-syntax`, `-key-uniqueness` (UNIQUE only as a distractor, explanations match Learn), `-evolution-modes` (`addNewColumnsWithTypeWidening` only as a distractor).
- Profiling: `dp750-3c-profile-data-profile-tab` (Data Profile tab still documented on its reference, the EDA tutorial).
- Pipelines: `dp750-4a-pipeline-settings` (answer Triggered), `-sdp-sql-datasets`, `-auto-cdc-sql`, `-sdp-python-drop` (temporary view as distractor, no plain `CREATE VIEW` option).

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 32 q5 (enable deletion vectors) and q8 (no partitioning plus deletion vectors) agree with the new wording, as do quiz 33 Q10 (Entra OAuth on a dedicated DBR 17.3 LTS cluster) and quiz 41 Q9 (`CREATE VIEW` publishes to the catalog).

## For a human decision

- **Training module vs product docs** (DP-750 module "Design and Implement Data Modeling with Azure Databricks"): it says liquid clustering requires 13.3 LTS and deletion vectors are on by default from 14.1. The chapter now follows the product pages (15.4 LTS GA; explicit enablement or workspace setting). Exam items written from the training could expect the old answers.
- **Bundles name**: Learn now says "Declarative Automation Bundles (formerly known as Databricks Asset Bundles)". The profile, `objectives.yaml` (study guide wording) and 11 other DP-750 files (chapters 00 and 43, bank questions, case studies, series) use the old name. Chapter 33 mentions both. Decide on one name across the cert.
- **`MERGE WITH SCHEMA EVOLUTION` runtime**: 15.2 (SQL reference) vs 15.4 LTS (feature page, kept in chapters 34 and 35).
- **Row-level concurrency runtime**: 14.2 (deletion vectors page) vs 14.3 LTS (row-level concurrency page, used).
- **Automatic change data feed** needs "Databricks Runtime 19", and no status is given. It was added as a recommendation, not as an exam answer.
- **Kafka authentication page** contradicts itself on client ID/secret on standard access mode (14.3 LTS+ supported vs "does not work on compute with standard access mode"). The chapter avoids the point.
- `dp750-3a-delta-default-cdf` (another agent's objective 3.1.4): "the change data feed is a Delta Lake feature" is no longer strictly true (automatic CDF covers Iceberg v3).
- Not confirmed, left out: For each input limits, `melt` alias, `DECFLOAT`, `dbutils.notebook.exit` ending the notebook as succeeded, job parameters applying to every task.

## French terms not settled (not in the glossary)

- Streaming table: chapters 35 and 41 write « table de diffusion en continu », chapters 32, 33 and 22 « table de streaming ». My additions follow each chapter's form. One form should be chosen.
- « flux de données modifiées hérité / automatique » (legacy / automatic change data feed); « suivi des lignes (row tracking) »; « stratégie d'actualisation complète automatique » (auto full refresh policy); « mode de publication par défaut » (default publishing mode); « job continu »; « indications de schéma (schema hints) » (the QZ report used « indicateurs de schéma »); « rétrograder le protocole » (downgrade).
- UI labels kept in English: **Auto-enable deletion vectors**, Data quality, Triggered, Continuous.
