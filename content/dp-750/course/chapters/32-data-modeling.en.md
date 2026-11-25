Data modeling decisions shape every query that follows: how a dimension keeps (or forgets) its history, what one row of a table represents, how changes are recorded over time, how files are organized for data skipping, and who owns the data files. Exam questions state a business rule ("sales must be reported by the customer's region at the time of the sale", "queries filter on customer and date, patterns change often") and ask for the SCD type, the grain, the history design, the clustering statement or the table type.

<!-- section: scd-types | objectives: 3.1.6 -->
## Choosing a slowly changing dimension type

| Type | Behavior on change | History | Fact table joins on | Use when |
| --- | --- | --- | --- | --- |
| 0 | Never update after the first insert | Original value only | Natural key | True constants (birth date, first registration date), regulatory "as first recorded" |
| 1 | Overwrite in place | None | Natural key | Error corrections, contact details, analysis on the current state only |
| 2 | Close the current row, insert a new version | Complete | Surrogate key (one per version) | Reporting by the value at the time of the event, audit of territory or organization changes |
| 3 | Keep the previous value in an extra column | One prior value | Natural key | Only "current versus previous" comparisons; rare |

A type 2 dimension needs a **surrogate key** per version (`BIGINT GENERATED ALWAYS AS IDENTITY`), the **natural key** from the source, a **validity start** and **end**, and usually a **current flag**. Types are chosen per attribute: in a customer dimension, the registration date can be type 0, the e-mail address type 1 and the sales region type 2.

> **Exam trap.** Type 1 rewrites history in reports: after a customer moves from Seattle to Portland, all past sales appear under Portland. If historical reports must keep Seattle, the answer is type 2, not type 1 or type 3.

The simplest implementation in Azure Databricks is **AUTO CDC** in Lakeflow Spark Declarative Pipelines (it replaces `APPLY CHANGES`, same syntax). The target is a streaming table; `SEQUENCE BY` orders changes, so a late, older record never overwrites a newer one.

```text
CREATE OR REFRESH STREAMING TABLE dim_customer;

CREATE FLOW dim_customer_flow AS AUTO CDC INTO dim_customer
FROM STREAM(sales.bronze.customer_changes)
KEYS (customer_id)
APPLY AS DELETE WHEN operation = 'DELETE'
SEQUENCE BY change_seq
COLUMNS * EXCEPT (operation, change_seq)
STORED AS SCD TYPE 2
TRACK HISTORY ON * EXCEPT (last_login);
```

With `STORED AS SCD TYPE 2`, the target gets `__START_AT` and `__END_AT` columns (`__END_AT` is null for the current version). `TRACK HISTORY ON * EXCEPT (last_login)` updates `last_login` in place instead of creating a version. `STORED AS SCD TYPE 1` keeps only the current state, without those columns. AUTO CDC requires a serverless pipeline or the Pro or Advanced edition.

Outside a pipeline, a type 2 dimension is maintained with one `MERGE` that both closes and inserts: the changed rows are sent twice, once with their key (to close the current version) and once with a null key (so they don't match and are inserted as the new version). The Learn training module uses two statements instead: a `MERGE` that closes the changed rows and inserts new customers, then an `INSERT ... SELECT` of the new versions.

```text
MERGE INTO sales.gold.dim_customer AS t
USING (
  SELECT s.customer_id AS merge_key, s.* FROM sales.silver.customer_updates AS s
  UNION ALL
  SELECT NULL AS merge_key, s.* FROM sales.silver.customer_updates AS s
  JOIN sales.gold.dim_customer AS c
    ON s.customer_id = c.customer_id AND c.is_current = true
  WHERE s.region <> c.region
) AS u
ON t.customer_id = u.merge_key AND t.is_current = true
WHEN MATCHED AND t.region <> u.region THEN
  UPDATE SET is_current = false, valid_to = u.change_ts
WHEN NOT MATCHED THEN
  INSERT (customer_id, name, region, valid_from, valid_to, is_current)
  VALUES (u.customer_id, u.name, u.region, u.change_ts, NULL, true);
```

<!-- section: granularity | objectives: 3.1.7 -->
## Choosing the granularity of a table or column

The **grain** is what one row represents. Declare it before adding columns: "one row per order line", "one row per device per minute".

- In a fact table, the grain is the combination of its dimension keys: date, product, customer and store give "one row per product per customer per store per day". Adding an hour key multiplies the rows.
- **Atomic** grain (the most detailed level of the source) answers any question: you can aggregate up, never disaggregate down. **Aggregate** grain is faster for known queries but limits analysis. Keep both: an atomic table plus aggregates maintained by **materialized views**, which refresh as the atomic data changes.
- A dimension's grain must match the facts that reference it: one row per customer (type 1), one row per customer version (type 2) or one row per customer per period (periodic snapshot).
- Compliance can impose the grain: financial regulators often require transaction-level detail.

| Requirement | Minimum grain |
| --- | --- |
| Detect a vibration anomaly in real time | Each event (millisecond timestamp) |
| Temperature trend for predictive maintenance | Per-second aggregate |
| Hourly energy consumption per device | Per-minute aggregate |
| Daily production report per plant | Hourly aggregate |

Column granularity follows the same logic: keep a `TIMESTAMP` when time of day matters (a `DATE` loses it for good), and choose a `DECIMAL(p,s)` scale that matches the smallest unit reported.

> **Exam tip.** When requirements are uncertain and the budget allows it, store the finer grain: detail never captured can't be recovered, while coarser views can always be derived.

<!-- section: history-tables | objectives: 3.1.8 -->
## Designing a temporal (history) table

Three mechanisms record changes over time:

| Mechanism | What it gives | Limit |
| --- | --- | --- |
| Delta time travel (`VERSION AS OF`, `TIMESTAMP AS OF`, `DESCRIBE HISTORY`) | Any past state of the table, with no design work | Only within the retention windows (7 days of files, 30 days of log by default) |
| Change data feed | Row-level changes with `_change_type` (`insert`, `update_preimage`, `update_postimage`, `delete`), `_commit_version`, `_commit_timestamp` | Off by default (legacy feed); only records changes made after it is enabled; follows the table retention |
| Explicit history table | Every change kept as long as you decide | Must be populated by a job or pipeline |

The table describes the **legacy** change data feed, turned on per table with `delta.enableChangeDataFeed`. Databricks recommends migrating to **automatic change data feed** (Databricks Runtime 19 and above, Unity Catalog Delta tables with row tracking, or Iceberg v3 tables): it computes changes at read time, needs no per-table property and is queried with the same `table_changes` and `readChangeFeed`.

SCD type 2 tracks **business** versions for reporting; a temporal table records **technical** changes for debugging, audit and reproducing a report as it was.

```text
ALTER TABLE sales.bronze.orders SET TBLPROPERTIES (delta.enableChangeDataFeed = true);

SELECT order_id, amount, _change_type, _commit_version
FROM table_changes('sales.bronze.orders', 12)
WHERE _change_type IN ('insert', 'update_postimage');

SELECT * FROM sales.bronze.orders TIMESTAMP AS OF '2026-11-01';
SELECT * FROM sales.bronze.orders@v42;
```

To keep history beyond the retention windows, stream the change feed into an append-only history table, scheduled after each load:

```text
(spark.readStream
   .option("readChangeFeed", "true")
   .table("sales.bronze.orders")
   .writeStream
   .option("checkpointLocation", "/Volumes/sales/audit/chk/orders_history")
   .trigger(availableNow=True)
   .toTable("sales.audit.orders_history"))
```

`table_changes` versions are inclusive; `startingVersion` or `startingTimestamp` do the same in Python. Raising `delta.logRetentionDuration` and `delta.deletedFileRetentionDuration` extends time travel, at a storage cost; Microsoft Learn advises against using table history as a long-term backup.

> **Exam trap.** Enabling the legacy change data feed today doesn't reveal yesterday's changes: it captures only commits made after the property is set. Enable it before loading production data.

<!-- section: clustering | objectives: 3.1.9 -->
## Clustering strategy: liquid clustering, Z-ordering, deletion vectors

Delta collects minimum, maximum and null count statistics per file; a filter skips files that can't match. Clustering puts related rows in the same files so that **data skipping** works.

```text
CREATE TABLE sales.silver.orders (
  order_id BIGINT, customer_id STRING, region STRING, order_date DATE, amount DECIMAL(12,2)
) CLUSTER BY (customer_id, order_date);

OPTIMIZE sales.silver.orders;
ALTER TABLE sales.silver.orders CLUSTER BY (region, order_date);
OPTIMIZE sales.silver.orders FULL;
ALTER TABLE sales.silver.orders CLUSTER BY AUTO;

OPTIMIZE sales.legacy.orders ZORDER BY (customer_id, order_date);
```

| Feature | Liquid clustering | Z-ordering | Partitioning |
| --- | --- | --- | --- |
| Status | Recommended for new tables | Legacy | Only for tables above 1 TB |
| Keys | Up to 4, any cardinality | Several columns, applied at `OPTIMIZE` time | One low-cardinality column (or a few) |
| Change keys | `ALTER TABLE ... CLUSTER BY`, no rewrite (`OPTIMIZE FULL` to recluster existing data) | Full rewrite | Full rewrite |
| Concurrency | Row-level concurrency (with deletion vectors) | Transaction-level | Transaction-level |
| Combine with | Neither partitioning nor `ZORDER` | Partitioning | Z-ordering |

Liquid clustering is generally available for Delta tables from Databricks Runtime 15.4 LTS and is incremental: each `OPTIMIZE` reorganizes only what needs it (schedule it every one or two hours on busy tables, or let predictive optimization run it on managed tables). `CLUSTER BY AUTO` lets Databricks pick and revise the keys from the query history; it requires predictive optimization. Choose keys from the columns most used in filters; their order matters little.

**Deletion vectors** make `DELETE`, `UPDATE` and `MERGE` mark rows as removed in a small file instead of rewriting whole Parquet files; readers apply them on the fly. On Delta tables they must be enabled explicitly, unless the workspace setting **Auto-enable deletion vectors** turns them on for new tables (SQL warehouse or Databricks Runtime 14.3 LTS and above; defaults vary by region). `MERGE` with deletion vectors needs Databricks Runtime 14.3 LTS (12.2 LTS with Photon). They are applied physically by `OPTIMIZE`, auto compaction or `REORG TABLE ... APPLY (PURGE)`, and enable row-level concurrency (Databricks Runtime 14.3 LTS and above, unpartitioned tables only).

```text
ALTER TABLE sales.silver.orders SET TBLPROPERTIES ('delta.enableDeletionVectors' = true);
REORG TABLE sales.silver.orders APPLY (PURGE);
```

> **Exam trap.** Liquid clustering can't be enabled on a partitioned table with `ALTER TABLE ... CLUSTER BY`. On Databricks Runtime 18.1 and above, convert it in place with `ALTER TABLE ... REPLACE PARTITIONED BY WITH CLUSTER BY (...)`, then run `OPTIMIZE ... FULL`; on older runtimes, recreate it unpartitioned (for example with CTAS and `CLUSTER BY`).

<!-- section: managed-external | objectives: 3.1.10 -->
## Managed or unmanaged (external) tables

| Characteristic | Managed table | External table |
| --- | --- | --- |
| Data location | Managed storage of the schema, catalog or metastore | `LOCATION` in a registered external location |
| Data files managed by | Unity Catalog | You |
| Formats | Delta, Iceberg | Delta, CSV, JSON, Avro, Parquet, ORC, text |
| Predictive optimization, automatic liquid clustering | Yes | No |
| `DROP TABLE` | Files deleted by Unity Catalog after the recovery period | Only metadata removed; files stay in storage |
| `UNDROP TABLE` | Within the recovery period (7 days by default; configurable to 0 hours or 7–30 days in Public Preview) | Recovers the definition; requires `CREATE EXTERNAL TABLE` on the location |

```text
CREATE TABLE sales.bronze.legacy_orders (order_id BIGINT, amount DECIMAL(12,2))
LOCATION 'abfss://lake@contosodata.dfs.core.windows.net/legacy/orders';
```

Creating an external table requires `CREATE EXTERNAL TABLE` on the external location, plus `CREATE TABLE` and `USE SCHEMA` on the schema and `USE CATALOG` on the catalog. Dropping a table requires ownership or `MANAGE` on it.

Databricks recommends **managed** tables in most cases: automatic optimization, faster queries, lower cost, lifecycle handled by Unity Catalog. Choose **external** tables when:

- the data must outlive the table definition or the workspace;
- other systems read or write the files directly (this bypasses Unity Catalog access control and auditing);
- you register existing data (for example from Hive metastore) without moving it; it can be converted to managed later;
- the format is neither Delta nor Iceberg;
- a storage or compliance policy outside Azure Databricks dictates the location.

> **Exam tip.** "Dropping the table must not delete the files" points to an external table; "minimize maintenance, automatic OPTIMIZE and VACUUM" points to a managed table.

<!-- section: key-points -->
## Key points

- Type 1 overwrites, type 2 versions with a surrogate key and validity dates, type 3 keeps one previous value, type 0 never changes.
- AUTO CDC with `SEQUENCE BY` and `STORED AS SCD TYPE 2` adds `__START_AT` and `__END_AT` and handles late records.
- Declare the grain first; keep atomic data and derive aggregates with materialized views.
- Time travel is bounded by retention; the legacy change data feed records changes only after it is enabled (automatic change data feed needs no per-table setting); a history table fed by `readChangeFeed` keeps everything.
- Liquid clustering: up to 4 keys, keys change without rewrite, `REPLACE PARTITIONED BY WITH CLUSTER BY` converts a partitioned table (DBR 18.1+), `CLUSTER BY AUTO` needs predictive optimization, incompatible with partitioning and `ZORDER`.
- Deletion vectors speed up deletes and updates and must be enabled on Delta tables unless the workspace auto-enables them; `REORG ... APPLY (PURGE)` then `VACUUM` removes data physically.
- Managed by default; external when files must survive `DROP`, other engines access them, or the format isn't Delta or Iceberg.
