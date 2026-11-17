Between the bronze landing tables and the curated gold tables sits the silver work: profile what arrived, give every column the right type, remove duplicates and nulls, reshape the data, and load it into the target table without breaking reruns. The exam shows SQL or PySpark fragments and asks which clause, function or write mode produces the stated result.

<!-- section: profiling | objectives: 3.3.1 -->
## Profiling data

Profile before you clean: the statistics tell you which columns have nulls, outliers, unexpected values or skewed distributions.

| Tool | How | What you get |
| --- | --- | --- |
| Data Profile tab | Run `display(df)`, then click **+ > Data Profile** next to **Table** in the output (Databricks Runtime 9.1 LTS and above) | Summary statistics for numeric, string and date columns, and a histogram of the value distribution of each column |
| `dbutils.data.summarize(df)` | Same profile, generated from code (Python, Scala, R) | Analyzes the whole DataFrame: expensive on very large data |
| Selection details | Select column headers in a results table, then **Open selection details** | Profiling statistics of the selected columns |
| `df.describe()` / `df.summary()` | PySpark methods | `count`, `mean`, `stddev`, `min`, `max`; `summary()` adds the 25 %, 50 % and 75 % percentiles |
| SQL aggregates | `count(*)`, `count(col)`, `count_if(col IS NULL)`, `approx_count_distinct(col)`, `percentile_approx(col, 0.5)`, `min`, `max` | Exactly the statistics you name, usable in a job or a check |

`dbutils.data.summarize(df, precise=False)` is the default: some statistics are approximate to reduce run time (the distinct count of a high-cardinality categorical column may have about 5 % relative error; histograms and percentiles up to 0.01 % of the row count). With `precise=True` (Databricks Runtime 10.4 LTS and above), every statistic except numeric histograms and percentiles is exact.

```text
# Python: profile a bronze table
df = spark.read.table("contoso.bronze.orders")
dbutils.data.summarize(df, precise=True)

-- SQL: null rate, cardinality and distribution of key columns
SELECT count(*)                          AS row_count,
       count_if(customer_id IS NULL)     AS null_customers,
       approx_count_distinct(customer_id) AS distinct_customers,
       min(order_ts)                     AS first_order,
       max(order_ts)                     AS last_order,
       percentile_approx(amount, 0.5)    AS median_amount
FROM contoso.bronze.orders;
```

> **Exam trap.** `count(col)` ignores nulls and `count(*)` doesn't. The number of nulls in a column is `count(*) - count(col)` or `count_if(col IS NULL)`.

<!-- section: data-types | objectives: 3.3.2 -->
## Choosing column data types

Auto Loader infers JSON and CSV columns as `STRING` by default, so the silver layer is where types are set on purpose.

| Requirement | Type |
| --- | --- |
| Money, quantities that must add up exactly | `DECIMAL(p, s)`: precision 1 to 38, default `DECIMAL(10, 0)` |
| Scientific measures where tiny rounding errors are acceptable | `DOUBLE` (8 bytes) or `FLOAT` (4 bytes) |
| Identifiers that can exceed 2,147,483,647 | `BIGINT` (8 bytes) rather than `INT` (4 bytes) |
| Small codes (0 to 100) | `TINYINT` (1 byte) or `SMALLINT` (2 bytes) |
| A calendar day | `DATE` |
| An instant, displayed in the session time zone | `TIMESTAMP` |
| A wall-clock time with no time zone (local opening hours, a reading recorded as written) | `TIMESTAMP_NTZ` |
| Flags | `BOOLEAN` |
| Text | `STRING` |
| Semi-structured JSON whose shape varies | `VARIANT` |
| Fixed nested structure, list, key-value pairs | `STRUCT`, `ARRAY`, `MAP` |

Convert with `cast(col AS type)` or `col::type`. Under ANSI SQL mode, an invalid value makes `cast` raise an error; `try_cast` returns `NULL` instead, which lets you load the row and count the failures.

```text
SELECT try_cast(order_id AS BIGINT)          AS order_id,
       try_cast(amount   AS DECIMAL(12, 2))  AS amount,
       to_date(order_day, 'yyyy-MM-dd')      AS order_day,
       try_cast(order_ts AS TIMESTAMP)       AS order_ts
FROM contoso.bronze.orders;
```

> **Exam trap.** `DOUBLE` for amounts is the classic wrong answer: binary floating point can't represent 0.1 exactly, so totals drift. Use `DECIMAL`. And `CAST(5.345 AS DECIMAL)` gives `5`, because the default scale is 0.

<!-- section: duplicates-nulls | objectives: 3.3.3 -->
## Resolving duplicates, missing values and nulls

Find duplicates by grouping on the business key:

```text
SELECT order_id, count(*) AS copies
FROM contoso.bronze.orders
GROUP BY order_id
HAVING count(*) > 1;
```

| Requirement | SQL | PySpark |
| --- | --- | --- |
| Remove rows identical in every column | `SELECT DISTINCT *` | `df.distinct()` or `df.dropDuplicates()` |
| Keep one row per key, any row | (use the window below) | `df.dropDuplicates(["order_id"])` |
| Keep the **latest** row per key | `row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC)` then `QUALIFY rn = 1` | Same window with `F.row_number()`, then filter `rn == 1` |
| Drop rows where a key column is null | `WHERE customer_id IS NOT NULL` | `df.dropna(subset=["customer_id"])` |
| Drop rows where every column is null | | `df.dropna(how="all")` |
| Replace nulls with a default | `coalesce(country, 'Unknown')`, `ifnull`, `nvl` | `df.fillna({"country": "Unknown", "qty": 0})` |
| Treat empty strings as missing | `nullif(trim(email), '')` | `F.when(F.trim("email") == "", None)` |

```text
-- Keep the most recent version of each order
SELECT *
FROM contoso.bronze.orders
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1;
```

Rules that decide exam answers:

- `col = NULL` is never true; use `IS NULL`. Use the null-safe operator `<=>` to compare two columns that can both be null.
- Equality joins never match null keys: rows with a null key disappear from an inner join.
- `dropDuplicates` without an ordering keeps an arbitrary row: when the requirement says "the most recent", a window with `ORDER BY` is required.
- Whether to drop, default or keep a null depends on the column: a null key is usually quarantined, a null optional attribute is kept or defaulted.

> **Exam trap.** `DISTINCT` and `dropDuplicates()` without a column list only remove rows identical in **every** column. Two versions of the same order with different `updated_at` both survive.

<!-- section: filter-aggregate | objectives: 3.3.4 -->
## Filtering, grouping and aggregating

| Clause | Filters | Can reference aggregates |
| --- | --- | --- |
| `WHERE` | Rows, before grouping | No |
| `HAVING` | Groups, after grouping | Yes |
| `QUALIFY` | Rows, after window functions | Window function results |
| `FILTER (WHERE ...)` on an aggregate | Rows fed to that one aggregate | Not applicable |

```text
SELECT region,
       date_trunc('MONTH', order_ts)                 AS order_month,
       count(*)                                      AS orders,
       count(DISTINCT customer_id)                   AS customers,
       sum(amount)                                   AS revenue,
       sum(amount) FILTER (WHERE channel = 'web')    AS web_revenue
FROM contoso.silver.orders
WHERE status <> 'cancelled'
GROUP BY region, date_trunc('MONTH', order_ts)
HAVING sum(amount) > 10000;
```

The PySpark equivalent:

```text
from pyspark.sql import functions as F

monthly = (spark.read.table("contoso.silver.orders")
    .filter(F.col("status") != "cancelled")
    .groupBy("region", F.date_trunc("MONTH", "order_ts").alias("order_month"))
    .agg(F.count("*").alias("orders"),
         F.countDistinct("customer_id").alias("customers"),
         F.sum("amount").alias("revenue"))
    .filter(F.col("revenue") > 10000))
```

For subtotals in one pass, `GROUP BY ROLLUP (region, country)` adds a subtotal per region and a grand total, `CUBE` adds every combination, and `GROUPING SETS` lists exactly the combinations you want. Window functions (`sum(amount) OVER (PARTITION BY customer_id ORDER BY order_ts)`) compute running totals or ranks **without** collapsing the rows.

> **Exam tip.** A filter on an aggregated value (`sum(amount) > 10000`) goes in `HAVING`; a filter on a column of the row goes in `WHERE`, where it also reduces the data before the shuffle.

<!-- section: joins-set-operators | objectives: 3.3.5 -->
## Joins and set operators

| Requirement | Join | PySpark `how` |
| --- | --- | --- |
| Only rows with a match on both sides | `INNER JOIN` | `"inner"` |
| Every left row, matched columns or nulls | `LEFT [OUTER] JOIN` | `"left"` |
| Every row of both sides | `FULL [OUTER] JOIN` | `"full"` |
| Left rows **that have** a match, left columns only, no duplication | `LEFT SEMI JOIN` | `"left_semi"` |
| Left rows **without** a match (orphans, new keys) | `LEFT ANTI JOIN` | `"left_anti"` |
| Every combination | `CROSS JOIN` | `"cross"` |

```text
-- Orders whose customer doesn't exist in the dimension
SELECT o.*
FROM contoso.silver.orders AS o
LEFT ANTI JOIN contoso.silver.customers AS c
  ON o.customer_id = c.customer_id;
```

Set operators combine the rows of two queries that have the same number of columns, matched **by position**, with compatible types.

| Operator | Result | Default |
| --- | --- | --- |
| `UNION` | Rows of both queries | `DISTINCT`: duplicates removed. `UNION ALL` keeps them and is cheaper |
| `INTERSECT` | Rows present in both | `DISTINCT` |
| `EXCEPT` (alias `MINUS`) | Rows of the first query absent from the second | `DISTINCT` |

When set operations are chained, `INTERSECT` is evaluated before `UNION` and `EXCEPT`.

| PySpark method | SQL equivalent |
| --- | --- |
| `df1.union(df2)` / `unionAll` | `UNION ALL`, by position |
| `df1.unionByName(df2, allowMissingColumns=True)` | Union by column name; missing columns become null |
| `df1.intersect(df2)` / `intersectAll` | `INTERSECT` / `INTERSECT ALL` |
| `df1.subtract(df2)` / `exceptAll` | `EXCEPT` / `EXCEPT ALL` |

> **Exam trap.** In PySpark, `union()` does **not** remove duplicates and does **not** match columns by name. Two monthly extracts with the same columns in a different order need `unionByName`, followed by `distinct()` if duplicates must go.

<!-- section: denormalize-pivot | objectives: 3.3.6 -->
## Denormalizing, pivoting and unpivoting

**Denormalizing** joins the dimensions into the fact to produce one wide table, so reports avoid repeated joins. It suits gold tables read many times; the cost is redundant storage and a rebuild when a dimension attribute changes. Keep silver tables normalized and denormalize in gold, often as a materialized view.

```text
CREATE OR REPLACE TABLE contoso.gold.sales_wide AS
SELECT o.order_id, o.order_ts, o.amount,
       c.customer_name, c.segment, p.product_name, p.category
FROM contoso.silver.orders   AS o
JOIN contoso.silver.customers AS c ON o.customer_id = c.customer_id
JOIN contoso.silver.products  AS p ON o.product_id  = p.product_id;
```

**PIVOT** turns row values into columns. Every column not named in the aggregate or the `FOR` list becomes a grouping column.

```text
SELECT *
FROM (SELECT region, year, quarter, amount FROM contoso.silver.sales)
PIVOT (sum(amount) AS sales FOR quarter IN (1 AS q1, 2 AS q2, 3 AS q3, 4 AS q4));
```

**UNPIVOT** (Databricks SQL and Databricks Runtime 12.2 LTS and above) turns columns into rows. Its default is `EXCLUDE NULLS`: a null value produces no row unless you write `INCLUDE NULLS`.

```text
SELECT *
FROM contoso.silver.quarterly_sales
UNPIVOT INCLUDE NULLS (sales FOR quarter IN (q1, q2, q3, q4));
```

In PySpark, `df.groupBy("region", "year").pivot("quarter", [1, 2, 3, 4]).sum("amount")` pivots; passing the list of values avoids an extra pass to compute the distinct values. `df.unpivot(["region", "year"], ["q1", "q2", "q3", "q4"], "quarter", "sales")` (alias `melt`) unpivots.

> **Exam trap.** The pivot keeps the grouping columns that remain in the input. Select only the columns you need in a subquery first, or an extra column (an `order_id`, say) creates one row per value and the pivot looks broken.

<!-- section: load-operations | objectives: 3.3.7 -->
## Loading with insert, append and merge

| Requirement | SQL | DataFrame |
| --- | --- | --- |
| Add new rows to existing ones | `INSERT INTO t SELECT ...` | `df.write.mode("append").saveAsTable("t")` |
| Replace the whole content | `INSERT OVERWRITE t SELECT ...` or `CREATE OR REPLACE TABLE ... AS` | `df.write.mode("overwrite").saveAsTable("t")` |
| Replace only a slice (one day, one region) | `INSERT INTO t REPLACE WHERE order_day = '2026-11-01' SELECT ...` | `.mode("overwrite").option("replaceWhere", "order_day = '2026-11-01'")` |
| Replace the rows whose key values appear in the new data | `INSERT INTO t REPLACE USING (country) SELECT ...` | |
| Insert by column name rather than position | `INSERT INTO t BY NAME SELECT ...` | `saveAsTable` in append mode matches by name |
| Update existing rows and insert new ones (upsert), delete | `MERGE INTO` | `DeltaTable.merge` |

`REPLACE WHERE` fails and writes nothing if a returned row falls outside the predicate. `REPLACE USING` treats null keys as unequal, so rows with a null key aren't removed.

```text
MERGE INTO contoso.silver.customers AS t
USING (
  SELECT * FROM contoso.bronze.customer_changes
  QUALIFY row_number() OVER (PARTITION BY customer_id ORDER BY change_ts DESC) = 1
) AS s
ON t.customer_id = s.customer_id
WHEN MATCHED AND s.op = 'DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'DELETE' THEN INSERT *
WHEN NOT MATCHED BY SOURCE AND t.is_active = false THEN DELETE;
```

`MERGE` rules:

- Clauses of each kind are evaluated in the order written; every `WHEN MATCHED` clause except the last needs a condition (same rule for `WHEN NOT MATCHED` and `WHEN NOT MATCHED BY SOURCE`).
- If several source rows match one target row, the merge fails with `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE` (an unconditional `DELETE` is the exception). Deduplicate the source first, as above.
- `UPDATE SET *` and `INSERT *` need the source to have the target's columns. A new source column is ignored unless you write `MERGE WITH SCHEMA EVOLUTION INTO` (Databricks Runtime 15.4 LTS and above).
- `WHEN NOT MATCHED BY SOURCE` acts on target rows absent from the source: use it to delete or flag records removed upstream in a full-snapshot load.

```text
from delta.tables import DeltaTable

target = DeltaTable.forName(spark, "contoso.silver.customers")
(target.alias("t")
   .merge(updates_df.alias("s"), "t.customer_id = s.customer_id")
   .whenMatchedUpdateAll()
   .whenNotMatchedInsertAll()
   .execute())
```

In Structured Streaming, run the merge inside `foreachBatch` to upsert each micro-batch.

> **Exam trap.** `INSERT INTO` and append mode are not idempotent: rerunning a failed job duplicates the rows. When a load must be safe to rerun, use `MERGE`, `REPLACE WHERE` or an overwrite of the slice.

<!-- section: key-points -->
## Key points

- Profile with the Data Profile tab or `dbutils.data.summarize` (approximate by default, `precise=True` for exact counts); `count(col)` skips nulls.
- `DECIMAL` for money, `BIGINT` for large ids, `TIMESTAMP_NTZ` for times without a zone, `try_cast` to convert without failing.
- Latest row per key: `row_number()` window with `QUALIFY`; `DISTINCT` only removes fully identical rows.
- `WHERE` before grouping, `HAVING` after; left anti join finds orphans, left semi join filters without duplicating.
- `UNION`, `INTERSECT`, `EXCEPT` are `DISTINCT` by default in SQL; PySpark `union()` keeps duplicates and matches by position.
- `UNPIVOT` excludes nulls by default; `PIVOT` groups by every leftover column.
- Append for new rows, `REPLACE WHERE` for a slice, `MERGE` for upserts, with a deduplicated source.
