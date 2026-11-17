A loading pattern answers three questions: how much data each run moves (everything, or only what changed), in which order tables are loaded so that keys stay consistent, and how continuous data lands without small files or lost events. Exam questions give a source (with or without change data capture, with or without a reliable timestamp), a target model and a latency, and ask for the method, the step order or the code that completes the load.

<!-- section: full-incremental | objectives: 2.1.1 -->
## Full and incremental loads

| | Full load | Incremental load |
| --- | --- | --- |
| Each run moves | All rows of the source | Only rows inserted or changed since the last successful run |
| Target operation | Truncate and reload, or overwrite | Append, or upsert (merge) on a key |
| Fits | Small tables, first load, sources without a change indicator, a reset after corruption | Large or growing tables, frequent runs, limited source load |
| Deletes at the source | Disappear naturally | Lost unless CDC or a soft-delete flag carries them |

Ways to detect changes, from the simplest:

1. **High watermark**: a column that only increases (`LastModified` datetime, an identity, a `rowversion`). Store the last value, read rows above it, then save the new maximum.
2. **Change data capture (CDC)** or change tracking at the source: inserts, updates **and deletes**.
3. **Delta change data feed** when the source is itself a Delta table in OneLake.
4. **Comparing attributes** with the target (hash of columns): expensive, last resort.

The watermark pattern in a pipeline (Learn tutorial): two Lookup activities read the old watermark from a control table and the new one from the source, the copy reads the rows between them, and a stored procedure saves the new value only if the copy succeeds.

```text
-- Copy activity source query (old value excluded, new value included)
SELECT * FROM dbo.Orders
WHERE LastModifyTime > '@{activity('LookupOldWatermark').output.firstRow.WatermarkValue}'
  AND LastModifyTime <= '@{activity('LookupNewWatermark').output.firstRow.NewWatermarkValue}'

-- Stored procedure activity, on success of the copy
EXEC dbo.usp_write_watermark @LastModifiedtime = '...', @TableName = 'Orders';
```

`>` on the old value and `<=` on the new one copy each row exactly once, even if rows arrive while the pipeline runs.

The same need with less to build:

| Method | Incremental behaviour |
| --- | --- |
| **Copy job** | First run copies everything, later runs only changes. **Watermark** column types: `rowversion`, datetime, date, integer, string interpreted as datetime (inserts and updates only). **CDC** when enabled on the source: inserts, updates and deletes. Update methods: **Append** (default), **Merge** on a key (primary key by default), **Overwrite**, **SCD Type 2** (some databases). A failed run resumes from the last successful state; a reset forces a full copy per job or per table |
| **Dataflow Gen2 incremental refresh** | Filters a Date, DateTime or DateTimeZone column into **buckets**; only buckets whose change-detection column maximum changed are reloaded (delete, then insert for that range). Destinations: lakehouse, warehouse, Azure SQL Database. The query should fully fold; up to 50 buckets per query |
| **Mirroring** | Continuous replication, nothing to schedule |
| **Notebook** | Read changes, then Delta `MERGE` into the target |

```text
MERGE INTO silver.customers AS t
USING staged_changes AS s
  ON t.CustomerID = s.CustomerID
WHEN MATCHED AND s.Operation = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED AND s.Operation != 'D' THEN INSERT *
```

> **Exam trap.** A watermark on `LastModified` never sees a deleted row. "Deleted rows must be removed from the target" requires CDC (copy job with CDC and Merge, or a merge of CDC rows in a notebook), a soft-delete flag at the source, or a periodic full comparison.

> **Exam trap.** In Dataflow Gen2 incremental refresh, use a different column to filter (for example `OrderDate`) and to detect changes (for example `ModifiedDate`). Using the same column triggers a warning and can miss changes or create duplicates.

<!-- section: dimensional-model | objectives: 2.1.2 -->
## Preparing data for a dimensional model

Fabric guidance for loading a star schema in a warehouse:

1. Optionally load **staging** tables (a `staging` schema with source-like columns, truncated at the start of each run, never exposed to business users). If the data is already in a lakehouse (bronze, silver or gold), staging in the warehouse may be unnecessary.
2. Process **dimensions**, in dependency order (a geography dimension used by customer and supplier dimensions first).
3. Process **facts**: look up the surrogate key of each dimension.
4. Post-processing: refresh the semantic model, log the run, notify.

Transformations along the way: combine (merge on keys, append similar sources), convert data types, calculate values (full name, gross amount), detect historical change, aggregate to the declared grain.

**Dimension processing** matches the incoming rows to existing ones on the **business key**:

| Change type | Action |
| --- | --- |
| New member | Insert with a new surrogate key |
| SCD type 1 attribute changed | Update the row in place |
| SCD type 2 attribute changed | Expire the current row (end date, `IsCurrent = 0`), insert a new version with a new surrogate key |
| SCD type 3 | Update the "previous value" column, no new row |
| Deleted at the source | Soft delete (`IsDeleted = 1`), never a physical delete if facts reference it |

```text
-- SCD type 2 in a warehouse: expire, then insert the new versions
UPDATE d
SET d.ValidTo = CAST(GETDATE() AS date), d.IsCurrent = 0
FROM dbo.DimCustomer AS d
JOIN stg.Customer AS s ON s.CustomerID = d.CustomerID
WHERE d.IsCurrent = 1 AND d.City <> s.City;

INSERT INTO dbo.DimCustomer (CustomerID, CustomerName, City, ValidFrom, ValidTo, IsCurrent)
SELECT s.CustomerID, s.CustomerName, s.City, CAST(GETDATE() AS date), NULL, 1
FROM stg.Customer AS s
LEFT JOIN dbo.DimCustomer AS d ON d.CustomerID = s.CustomerID AND d.IsCurrent = 1
WHERE d.CustomerID IS NULL;
```

The second statement inserts both brand-new customers and the new versions of the customers expired by the first one (they no longer have a current row).

**Surrogate keys**: use the smallest practical integer type. The warehouse offers `IDENTITY` (`bigint` only, values unique but not sequential); in Spark, compute `max(key) + row_number()`. Facts store surrogate keys; for an SCD type 2 dimension, look up the **current** version (or the version valid on the transaction date when loading history). Date keys are computed (`YYYYMMDD`).

**Missing members**: when a fact references a business key that isn't in the dimension yet, either point it to an **Unknown** member (key `-1`) and fix it later, or insert an **inferred member** (business key only, attributes "Unknown", `IsInferredMember = 1`). When the real attributes arrive, update that row in place and clear the flag: it's a late-arriving detail, not an SCD type 2 change.

> **Exam trap.** Never truncate and fully reload a dimension whose surrogate keys are generated: new keys break every fact that references the old ones, and SCD type 2 history may be impossible to rebuild. Reload dimensions incrementally.

> **Exam tip.** The warehouse doesn't enforce foreign keys (`NOT ENFORCED`). The fact load must handle failed lookups itself (Unknown or inferred member); a fact row is inserted with a valid key, never dropped silently.

<!-- section: streaming-pattern | objectives: 2.1.3 -->
## Loading patterns for streaming data

| Pattern | Path | Use when |
| --- | --- | --- |
| Raw events to KQL | Eventstream, **Direct ingestion** to an Eventhouse table | Lowest effort, query fresh events with KQL, transform later in the eventhouse |
| Shaped events to KQL | Eventstream operators (filter, manage fields, aggregate), **Event processing before ingestion** to an Eventhouse | Drop or reshape events before they're stored |
| Events to Delta | Eventstream, Lakehouse destination | Spark and SQL users need the stream as Delta tables |
| Code-based stream to Delta | Spark structured streaming (notebook to develop, Spark job definition with retry policy in production) | Complex logic, libraries, stream-static joins |
| Medallion inside the eventhouse | Raw table, **update policy** to a typed table, **materialized view** for latest values or aggregates | Bronze-silver-gold with KQL only, transformed at ingestion time |

Rules that the exam checks:

- **Direct ingestion** attaches to the default or a derived stream and stores events without processing; you finish the setup (table, mapping) from the eventhouse destination in Live view. **Event processing before ingestion** is attached after an operator or a derived stream.
- Destinations without operator support receive processed data through a **derived stream**.
- To avoid losing the first events (for example the initial CDC snapshot) on an Eventhouse (event processing) or Lakehouse destination, clear **Activate ingestion** when adding it, publish, then activate ingestion with a **Custom time** earlier than the start.
- A Spark stream to Delta needs a **checkpoint location** (exactly-once progress tracking and restart) and usually a **trigger interval** sized to produce well-sized files instead of one small file per micro-batch:

```text
(events.writeStream
    .format("delta")
    .option("checkpointLocation", "Files/checkpoints/telemetry")
    .outputMode("append")
    .trigger(processingTime="1 minute")
    .toTable("bronze_telemetry"))
```

- An update policy with `IsTransactional: true` guarantees that a failed transformation doesn't ingest into the source table either; with the default `false`, the source keeps the rows and the target misses them.
- To feed lakehouse and Direct Lake consumers from an eventhouse without a second pipeline, turn on **Eventhouse OneLake availability** (Delta copy written in batches, up to 3 hours of latency by default).

> **Exam trap.** A real-time dashboard on events less than a few seconds old reads the **eventhouse**, not a lakehouse fed by Spark micro-batches. Conversely, "join the stream with Delta reference tables and write Delta for Spark users" points to Spark structured streaming or an eventstream Lakehouse destination.

<!-- section: key-points -->
## Key points

- Full load = everything each run; incremental = only changes, detected by a watermark, CDC or change data feed.
- Watermark: `>` old value, `<=` new value, save the new value on success; it never captures deletes.
- Copy job: watermark or CDC, Append, Merge, Overwrite or SCD Type 2; Dataflow Gen2 incremental refresh: buckets, a separate change-detection column.
- Dimensional load: staging, dimensions in dependency order, then facts with surrogate key lookups; no truncate and reload of dimensions.
- Missing dimension members: Unknown member or inferred member updated in place later.
- Streaming: Direct ingestion or processing before ingestion to an eventhouse, Lakehouse destination, or Spark with checkpoint and trigger; update policies and materialized views inside the eventhouse.
