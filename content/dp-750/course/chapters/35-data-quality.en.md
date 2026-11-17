Data quality in Unity Catalog is enforced at three levels: constraints on Delta tables reject bad writes, schema enforcement and evolution decide what happens when the shape of the data changes, and expectations in Lakeflow Spark Declarative Pipelines warn, drop or fail on each record. The exam asks which mechanism meets a requirement such as "keep loading but count the bad rows" or "stop the load".

<!-- section: validation-checks | objectives: 3.4.1 -->
## Validation checks: nullability, cardinality and ranges

Delta tables support two **enforced** constraints. When a write violates one, the whole transaction fails with an error and nothing is written.

| Check | Mechanism | Syntax |
| --- | --- | --- |
| Nullability | `NOT NULL` column constraint | `ALTER TABLE t ALTER COLUMN c SET NOT NULL` (or `DROP NOT NULL`) |
| Range, allowed values, rule between columns | `CHECK` constraint | `ALTER TABLE t ADD CONSTRAINT name CHECK (expr)` |
| Uniqueness of a key | Informational `PRIMARY KEY` or `UNIQUE`: **not enforced** | Check with a query (below) |
| Referential integrity | Informational `FOREIGN KEY`: **not enforced** | Check with a left anti join |

```text
CREATE TABLE contoso.silver.orders (
  order_id    BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  quantity    INT,
  amount      DECIMAL(12, 2),
  order_day   DATE,
  CONSTRAINT orders_pk PRIMARY KEY (order_id)
);

ALTER TABLE contoso.silver.orders
  ADD CONSTRAINT valid_quantity CHECK (quantity BETWEEN 1 AND 1000);
ALTER TABLE contoso.silver.orders
  ADD CONSTRAINT valid_day CHECK (order_day >= '2020-01-01');
ALTER TABLE contoso.silver.orders DROP CONSTRAINT valid_day;
```

Rules to know:

- Adding a `NOT NULL` or `CHECK` constraint first verifies **all existing rows**; it fails if one violates it.
- A `CHECK` expression can use deterministic functions only: no user-defined, aggregate or window function, no subquery. So a constraint can't express "unique" or "exists in another table".
- Adding a constraint can upgrade the table writer protocol, which matters for external Delta clients.
- CTAS doesn't accept constraint clauses: create the table, then add the constraints.
- `CHECK` constraints appear in `SHOW TBLPROPERTIES` and `DESCRIBE DETAIL`; key constraints in `information_schema`, `DESCRIBE TABLE EXTENDED` or `SHOW CREATE TABLE`.

Cardinality and referential checks are queries that a job runs before publishing:

```text
-- Cardinality: the key must be unique
SELECT count(*) AS row_count, count(DISTINCT order_id) AS distinct_keys
FROM contoso.silver.orders;

-- Referential: orders without a known customer
SELECT count(*) AS orphans
FROM contoso.silver.orders AS o
LEFT ANTI JOIN contoso.silver.customers AS c ON o.customer_id = c.customer_id;
```

```text
# Fail the task when a check doesn't pass
stats = spark.sql("""SELECT count(*) AS n, count(DISTINCT order_id) AS k
                     FROM contoso.silver.orders""").first()
if stats.n != stats.k:
    raise ValueError(f"{stats.n - stats.k} duplicate order_id values")
```

> **Exam trap.** A `PRIMARY KEY` in Unity Catalog doesn't prevent duplicates: it's informational, used by the optimizer and by tools. To guarantee uniqueness, deduplicate in the load (`MERGE` on the key) and test it.

<!-- section: type-checks | objectives: 3.4.2 -->
## Data type checks

Type problems arrive in strings: a CSV `amount` of `"12,50"`, a date written `"31/12/2026"`. Check before you cast.

| Requirement | Technique |
| --- | --- |
| Find values that don't convert | `WHERE amount IS NOT NULL AND try_cast(amount AS DECIMAL(12, 2)) IS NULL` |
| See the type of an expression | `typeof(expr)` |
| See the schema of a table or DataFrame | `DESCRIBE TABLE t`, `df.printSchema()`, `df.dtypes` |
| Read files with known types | Provide a schema: a DDL string or a `StructType` |
| Let Auto Loader infer real types instead of strings | `cloudFiles.inferColumnTypes` = `true` |
| Force the type of a few columns while inferring the rest | `cloudFiles.schemaHints`, for example `"amount decimal(12,2), order_day date"` |
| Keep values that don't fit the schema | The rescued data column `_rescued_data` |

```text
-- Count the rows whose amount isn't a valid decimal
SELECT count(*) AS bad_amounts
FROM contoso.bronze.orders_raw
WHERE amount IS NOT NULL
  AND try_cast(amount AS DECIMAL(12, 2)) IS NULL;
```

```text
orders = (spark.readStream.format("cloudFiles")
    .option("cloudFiles.format", "csv")
    .option("cloudFiles.schemaLocation", "/Volumes/contoso/bronze/_schemas/orders")
    .option("cloudFiles.schemaHints", "amount decimal(12,2), order_day date")
    .load("/Volumes/contoso/landing/orders/"))
```

The **rescued data column** captures, as a JSON blob with the source file path, the values that don't parse against the schema: a column absent from the schema, a type mismatch, or a case mismatch. Auto Loader adds `_rescued_data` automatically when it infers the schema; set `rescuedDataColumn` to rename it or to keep it with a schema you provide. A silver step then routes rows where `_rescued_data IS NOT NULL` to a quarantine table.

When a Delta table already exists, a write whose column type is incompatible with the table is rejected by schema enforcement (next section): the type check happens on write even if you forgot to cast.

> **Exam trap.** By default Auto Loader infers JSON and CSV columns as `STRING`, so a type error doesn't fail ingestion; it appears later in a cast. When the requirement is "keep the raw values, never lose a row", that's the intended behavior: cast in silver with `try_cast`.

<!-- section: schema-enforcement-drift | objectives: 3.4.3 -->
## Schema enforcement and schema drift

**Schema enforcement**: a write to a Delta table whose columns don't match the table schema fails, unless schema evolution is enabled for that write. Without evolution, `UPDATE SET *` and `INSERT *` in a `MERGE` only update the target's columns and ignore extra source columns.

**Schema drift** (new, missing or retyped columns from the source) is handled by choosing where evolution is allowed:

| Requirement | Setting |
| --- | --- |
| Add new source columns on an append | `.option("mergeSchema", "true")` |
| Add new columns during a merge | `MERGE WITH SCHEMA EVOLUTION INTO` (Databricks Runtime 15.4 LTS and above) |
| Add new columns during an `INSERT` | `INSERT WITH SCHEMA EVOLUTION INTO` (Databricks Runtime 18.1 and above; `mergeSchema` before that) |
| Replace the schema and partitioning on an overwrite | `.option("overwriteSchema", "true")` (not with dynamic partition overwrite) |
| Rename or drop a column without rewriting files | Enable column mapping, then `RENAME COLUMN` / `DROP COLUMN` |
| Evolve for every write of the session | `spark.databricks.delta.schema.autoMerge.enabled`: not recommended for production |

Supported schema changes are adding columns, reordering, renaming and type widening. A schema update conflicts with concurrent writes and **terminates the streams reading the table**. Dropping a column with column mapping is metadata-only: to purge the data, run `REORG TABLE`, then `VACUUM`.

```text
(new_orders_df.write
   .option("mergeSchema", "true")
   .mode("append")
   .saveAsTable("contoso.silver.orders"))
```

For files, Auto Loader's `cloudFiles.schemaEvolutionMode` decides what a new column does:

| Mode | When a new column appears |
| --- | --- |
| `addNewColumns` (default without a provided schema) | The stream fails with `UnknownFieldException` after adding the column to the schema; a restart resumes with the new schema. Existing column types don't change |
| `addNewColumnsWithTypeWidening` | Same, and supported types are widened (`int` to `long`); unsupported changes go to the rescued data column |
| `rescue` | The schema never evolves and the stream doesn't fail; new columns go to the rescued data column |
| `failOnNewColumns` | The stream fails and stays failed until you update the schema or remove the file |
| `none` (default with a provided schema) | New columns are ignored; nothing is rescued unless `rescuedDataColumn` is set |

The schema history lives in the `_schemas` folder of `cloudFiles.schemaLocation`. Run `addNewColumns` streams in a Lakeflow job with retries so the expected failure restarts automatically.

> **Exam trap.** With `addNewColumns`, the first failure is by design, not a bug. "New columns must appear in the table without manual intervention" means `addNewColumns` plus automatic restart; "the stream must never stop" means `rescue`; "an engineer must review every schema change" means `failOnNewColumns`.

<!-- section: expectations | objectives: 3.4.4 -->
## Expectations in Lakeflow Spark Declarative Pipelines

An **expectation** is a named Boolean SQL constraint applied to each record of a streaming table, a materialized view or a temporary view in a pipeline. The action decides what happens to records that fail it.

| Action | SQL | Python | Invalid records | Metrics |
| --- | --- | --- | --- | --- |
| warn (default) | `EXPECT (expr)` | `@dp.expect` | Written to the target | Yes |
| drop | `EXPECT (expr) ON VIOLATION DROP ROW` | `@dp.expect_or_drop` | Dropped before the write | Yes, dropped count |
| fail | `EXPECT (expr) ON VIOLATION FAIL UPDATE` | `@dp.expect_or_fail` | The update fails; a table update is rolled back atomically | No |

```text
CREATE OR REFRESH STREAMING TABLE contoso.silver.orders (
  CONSTRAINT valid_id     EXPECT (order_id IS NOT NULL) ON VIOLATION FAIL UPDATE,
  CONSTRAINT valid_amount EXPECT (amount >= 0)          ON VIOLATION DROP ROW,
  CONSTRAINT known_store  EXPECT (store_id IS NOT NULL)
)
AS SELECT * FROM STREAM(contoso.bronze.orders);
```

```text
from pyspark import pipelines as dp

rules = {"valid_amount": "amount >= 0", "valid_qty": "quantity BETWEEN 1 AND 1000"}

@dp.table(comment="Orders that pass every rule")
@dp.expect_or_fail("valid_id", "order_id IS NOT NULL")
@dp.expect_all_or_drop(rules)
def orders_silver():
    return spark.readStream.table("contoso.bronze.orders")
```

Rules to know:

- The constraint is a SQL Boolean expression evaluated per record: no Python function, no external call, no subquery on another table. Names are unique per dataset.
- `expect_all`, `expect_all_or_drop` and `expect_all_or_fail` take a dictionary of rules and exist only in Python; SQL declares several `CONSTRAINT` clauses but can't group them.
- With fail, a triggered pipeline fails that flow only (parallel flows continue); a continuous pipeline stops the flow and its dependent flows. Fix the code or the data before rerunning.
- Metrics appear in the **Data quality** tab of the dataset in the pipeline UI and in the pipeline **event log**. There are none for fail, and none for views until they are queried.
- Expectations aren't supported with `AUTO CDC FROM SNAPSHOT`.
- The legacy `import dlt` and `@dlt.expect` still work, but `from pyspark import pipelines as dp` is the current module.

To keep the bad records instead of losing them, use a **quarantine** pattern: one table with the rules as drop expectations, and a second table that selects the inverse condition.

```text
@dp.table
def orders_quarantine():
    return (spark.readStream.table("contoso.bronze.orders")
            .where("NOT (amount >= 0 AND quantity BETWEEN 1 AND 1000)"))
```

| Requirement | Choice |
| --- | --- |
| Load everything, measure quality | warn |
| Publish only valid rows, count the rejects | drop |
| A violation means corrupt input: stop and alert | fail |
| Publish valid rows and keep rejects for review | drop + quarantine table |
| Reject a bad write to a table outside a pipeline | `CHECK` / `NOT NULL` constraint |

> **Exam trap.** An expectation with no `ON VIOLATION` clause doesn't filter anything: the invalid rows land in the target and only the metrics show them. "Invalid rows must not reach the silver table" requires `DROP ROW` (or fail).

<!-- section: key-points -->
## Key points

- Only `NOT NULL` and `CHECK` are enforced on Delta tables; primary, foreign and unique keys are informational.
- Adding a constraint validates existing rows; a violating write fails the whole transaction.
- Detect bad types with `try_cast(...) IS NULL`; fix types with schema hints or an explicit schema; keep the leftovers in `_rescued_data`.
- Schema enforcement rejects mismatched writes; `mergeSchema` or `WITH SCHEMA EVOLUTION` opts in to new columns; `overwriteSchema` replaces the schema.
- Auto Loader `addNewColumns` fails once then evolves on restart; `rescue` never fails; `failOnNewColumns` waits for you.
- Expectations: warn by default, `DROP ROW` to filter, `FAIL UPDATE` to stop; metrics in the Data quality tab and event log.
