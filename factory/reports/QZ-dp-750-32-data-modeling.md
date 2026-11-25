# QZ-dp-750-32-data-modeling — report

File: `content/dp-750/quizzes/32-data-modeling.yaml` (10 questions, ids dp750-qz-32-01..10). Check: `npx tsx factory/check-quiz.ts dp-750 32-data-modeling` → 0 problem(s), 0 warning(s).

Objectives: 3.1.6 (q1, q10), 3.1.7 (q4, q6), 3.1.8 (q3, q9), 3.1.9 (q5, q8), 3.1.10 (q2, q7). Positions 6–10: dragdrop, multi, single, dropdown, yes/no.

Before writing, I read the mock-exam questions of 3.1.6–3.1.10 (`dp750-3a-scd*`, `-grain*`, `dp750-3b-*`, `cs1b/cs1c/cs2b/cs3c/cs4b`, `sr1-*`). The quiz tests other decisions:

- the surrogate key as the fact reference;
- `DROP` on an external table;
- `DESCRIBE HISTORY` to find a commit;
- column granularity (`TIMESTAMP`, `DECIMAL` scale);
- deletion vectors for MERGE rewrites;
- the coarsest grain per IoT requirement;
- which datasets need external tables;
- row-level concurrency (no partitioning plus deletion vectors);
- a batch change data feed read in Python (`update_preimage`, inclusive versions);
- the behavior of the NULL-merge-key SCD2 `MERGE` from the chapter.

## Chapter vs current Learn (Nov 2026)

- **Deletion vectors default.** The chapter says they are "enabled by default for new tables from Databricks Runtime 14.1". The Learn page "Deletion vectors in Databricks" now says that Delta tables need explicit enablement, or the workspace setting *Auto-enable deletion vectors* (SQL warehouse or DBR 14.3 LTS+), and that "default settings vary by region". The same page says MERGE with deletion vectors needs DBR 14.3 LTS without Photon (12.2 LTS with Photon). The chapter should be updated.
- **Row-level concurrency runtime.** The page "Row-level concurrency" requires DBR 14.3 LTS+, no partitioning and deletion vectors. The deletion vectors page says 14.2. The chapter states no version (fine). The chapter's table cell "Row-level concurrency" under liquid clustering is right only when deletion vectors are enabled. Learn ties the feature to "no partitions + deletion vectors" and doesn't mention liquid clustering.
- **"Legacy" change data feed.** The Learn page "Use change data feed on Azure Databricks" now says "You must explicitly turn on legacy change data feed on individual tables". There seems to be a newer mechanism that the chapter doesn't describe; to be checked.
- **SCD2 MERGE pattern.** The chapter's single `MERGE` with a NULL merge key and `UNION ALL` isn't on any Learn page I fetched. Training unit "Implement a slowly changing dimension (SCD) type 2" uses a MERGE that closes rows, then a separate INSERT. "Upsert into a Delta Lake table using merge" has no SCD2 example and points to AUTO CDC. The pattern is valid MERGE semantics, so q10 tests it, but the chapter could cite the training approach too. Side note: the training's INSERT joins on `valid_to = current_timestamp()` in a separate statement, which looks fragile.
- **Granularity unit.** The training unit "Choose granularity on a column or table based on requirements" covers only table grain. Its IoT example has millisecond, second and minute levels, no hourly. The chapter's column-granularity paragraph (`TIMESTAMP` vs `DATE`, `DECIMAL` scale) isn't from that unit. q4 relies on the `DECIMAL type` reference page for precision and scale.
- **Recovery period.** The managed tables page says the configurable recovery period (0 hours or 7–30 days) is Public Preview. The quiz uses only the 7-day default.
- **External tables.** "Work with external tables" lists DELTA, CSV, JSON, AVRO, PARQUET, ORC, TEXT, which matches the chapter. It adds that dropping a table requires ownership or `MANAGE`.

## Unverified points / doubts

- q5: the distractor `delta.autoOptimize.autoCompact = true` wasn't checked on a fetched page; I believe `true` is a valid value.
- q3: the description of `DESCRIBE DETAIL` (current table state, no commits) is general knowledge; the history page doesn't mention it.
- q8 option d: that you can set `WriteSerializable` per table comes from memory. The row-level concurrency page shows only that WriteSerializable is the default level.
- q7 option b says "supports only path-based access". I added this because managed tables also accept external clients through open APIs, and without it the option could be argued.
