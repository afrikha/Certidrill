Transforming data turns raw tables into clean, typed star schemas that semantic models consume. The exam shows T-SQL in a warehouse, PySpark or Spark SQL in a notebook and Power Query in Dataflow Gen2, and asks which statement, step or engine meets a requirement such as no code or read-only access.

<!-- section: views-functions-procedures | objectives: 2.2.1 -->
## Views, functions and stored procedures

Pick the engine first:

| Requirement | Tool |
| --- | --- |
| No-code or low-code transformation by an analyst | Dataflow Gen2 (Power Query) |
| SQL developers, multi-table transactions, data written to a warehouse | T-SQL in a warehouse |
| Large-scale or complex logic on lakehouse Delta tables, Python skills | Notebook (PySpark or Spark SQL) |
| Declarative bronze-silver-gold tables refreshed by Fabric in a lakehouse | Materialized lake views |

Where T-SQL objects can be created:

| Object | Warehouse | SQL analytics endpoint of a lakehouse |
| --- | --- | --- |
| Tables, `INSERT`, `UPDATE`, `DELETE`, `MERGE` | Yes | No: tables are read-only, they come from the lakehouse Delta tables |
| Views, functions, stored procedures | Yes | Yes, on top of the lakehouse tables |
| Materialized views, triggers, synonyms | No | No |

```text
-- View: a reusable query, always current, no stored data
CREATE VIEW dbo.vSalesByRegion
AS
SELECT r.RegionName, SUM(s.SalesAmount) AS TotalSales
FROM dbo.FactSales AS s
JOIN dbo.DimRegion AS r ON r.RegionKey = s.RegionKey
GROUP BY r.RegionName;
GO

-- Inline table-valued function: a view with parameters, usable in FROM and JOIN
CREATE FUNCTION dbo.fnSalesSince (@FromDate date)
RETURNS TABLE
AS
RETURN
    SELECT OrderID, OrderDate, SalesAmount
    FROM dbo.FactSales
    WHERE OrderDate >= @FromDate;
GO

-- Stored procedure: parameters, several statements, DML
CREATE PROCEDURE dbo.usp_LoadFactSales @LoadDate date
AS
BEGIN
    DELETE FROM dbo.FactSales WHERE OrderDate = @LoadDate;
    INSERT INTO dbo.FactSales (OrderID, OrderDate, CustomerKey, SalesAmount)
    SELECT OrderID, OrderDate, CustomerKey, Amount
    FROM stg.Orders
    WHERE OrderDate = @LoadDate;
END;
GO

EXEC dbo.usp_LoadFactSales @LoadDate = '2026-11-01';
SELECT * FROM dbo.fnSalesSince('2026-10-01');
```

| Requirement | Object |
| --- | --- |
| Hide joins and columns behind a stable name, no parameter | View |
| Same, but filtered by a value the caller passes, then joined to other tables | Inline table-valued function |
| Reload a table in several steps, called by a pipeline | Stored procedure |
| Store a precomputed result in a warehouse | `CREATE TABLE AS SELECT` (CTAS), refreshed by a procedure |
| Store a precomputed result in a lakehouse, with dependencies and refresh managed by Fabric | Materialized lake view |

A materialized lake view is Spark SQL whose result persists as a Delta table, with optional data quality constraints:

```text
CREATE MATERIALIZED LAKE VIEW silver.orders_clean
(
    CONSTRAINT valid_amount CHECK (amount > 0) ON MISMATCH DROP
)
AS SELECT order_id, region, CAST(amount AS DECIMAL(18,2)) AS amount
FROM bronze.orders;
```

`ON MISMATCH DROP` removes the failing rows; `FAIL` stops the refresh. Fabric chooses an incremental, full or skipped refresh; incremental refresh needs Delta change data feed on the sources.

> **Exam trap.** The SQL analytics endpoint accepts `CREATE VIEW`, `CREATE FUNCTION` and `CREATE PROCEDURE`, but no statement that writes to a lakehouse table. To write, use Spark, a dataflow, a pipeline, or a warehouse.

After changing underlying tables, run `sp_refreshview` to update a view's metadata; `WITH SCHEMABINDING` blocks changes that would break the view. A Direct Lake on SQL model that reads a view falls back to DirectQuery.

<!-- section: enrich-data | objectives: 2.2.2 -->
## Enriching data with new columns and tables

Warehouse rules: `ALTER TABLE` can only `ADD` **nullable** columns, `DROP COLUMN` and add or drop `NOT ENFORCED` constraints (`ALTER COLUMN` is in preview); computed columns aren't supported; columns are renamed with `sp_rename`. CTAS creates and fills a new table whose column types come from the query.

```text
ALTER TABLE dbo.DimCustomer ADD Segment varchar(20) NULL;
UPDATE dbo.DimCustomer
SET Segment = CASE WHEN AnnualRevenue >= 1000000 THEN 'Enterprise' ELSE 'SMB' END;

CREATE TABLE dbo.FactSalesEnriched
AS
SELECT s.*, s.Quantity * s.UnitPrice AS GrossAmount, YEAR(s.OrderDate) AS OrderYear
FROM dbo.FactSales AS s;
```

In a notebook, `withColumn` adds or replaces a column:

```text
from pyspark.sql import functions as F

orders = spark.read.table("silver_orders")
enriched = (orders
    .withColumn("OrderYear", F.year("OrderDate"))
    .withColumn("SizeBand", F.when(F.col("Quantity") >= 100, "Bulk").otherwise("Standard"))
    .withColumn("NetAmount", F.col("Amount") - F.col("Discount")))
enriched.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable("gold_orders")
```

In Dataflow Gen2, the **Add column** tab offers Custom column (M formula), Conditional column (if-then rules, no code), Column from examples and Index column.

| Requirement | Answer |
| --- | --- |
| New attribute on an existing warehouse table | `ALTER TABLE ... ADD` a nullable column, then `UPDATE`; or CTAS into a new table |
| Derived value always in sync, nothing stored | Expression in a view (no computed columns) |
| Business user, rule-based band, no code | Dataflow Gen2 conditional column |
| Attribute coming from another table | Join or merge |

> **Exam tip.** Do transformations as far upstream as possible: a column added in the warehouse or lakehouse is shared by every model and report, compresses better than a model calculated column and works with Direct Lake.

<!-- section: star-schema | objectives: 2.2.3 -->
## Implementing a star schema in a lakehouse or warehouse

A **fact table** holds measurable events at a declared grain (one row per order line) and foreign keys; a **dimension table** holds descriptive attributes and one key per member. Learn recommends `dim` and `fact` prefixes (`DimCity`, `FactOrder`) and staging (integration) tables where data is loaded and transformed before production tables.

Surrogate keys in a warehouse use `IDENTITY`:

```text
CREATE TABLE dbo.DimCustomer
(
    CustomerKey   bigint IDENTITY,       -- bigint only, no seed or increment
    CustomerID    varchar(20) NOT NULL,  -- business key from the source
    CustomerName  varchar(100) NOT NULL,
    City          varchar(50) NULL,
    ValidFrom     date NOT NULL,
    ValidTo       date NULL,
    IsCurrent     bit NOT NULL
);
ALTER TABLE dbo.DimCustomer
    ADD CONSTRAINT PK_DimCustomer PRIMARY KEY NONCLUSTERED (CustomerKey) NOT ENFORCED;

-- Unknown member with an explicit key
SET IDENTITY_INSERT dbo.DimCustomer ON;
INSERT INTO dbo.DimCustomer (CustomerKey, CustomerID, CustomerName, ValidFrom, IsCurrent)
VALUES (-1, 'N/A', 'Unknown', '1900-01-01', 1);
SET IDENTITY_INSERT dbo.DimCustomer OFF;
DBCC CHECKIDENT ('dbo.DimCustomer', RESEED);
```

| Fact about `IDENTITY` in a warehouse | Value |
| --- | --- |
| Data type | `bigint` only |
| Seed and increment | Not configurable |
| Values | Unique, but not sequential: gaps and unordered ranges are normal |
| Add to an existing table | Not with `ALTER TABLE`: copy the table with CTAS or `SELECT ... INTO` |
| Explicit values | `SET IDENTITY_INSERT ... ON` (column list required, one table per session), then `DBCC CHECKIDENT ... RESEED` |

`PRIMARY KEY` and `UNIQUE` need `NONCLUSTERED` and `NOT ENFORCED`; `FOREIGN KEY` needs `NOT ENFORCED`. They aren't checked: the load must guarantee uniqueness. In a lakehouse, Spark has no warehouse `IDENTITY`: generate keys with `row_number()` over a window plus the current maximum key.

Slowly changing dimensions:

| Type | Behaviour | Implementation |
| --- | --- | --- |
| Type 1 | Overwrite, no history | `MERGE ... WHEN MATCHED THEN UPDATE` |
| Type 2 | New row per change; `ValidFrom`, `ValidTo`, `IsCurrent`; new surrogate key | Expire the current row, insert the new version |
| Type 3 | Previous value in an extra column | `UPDATE` both columns |

```text
MERGE dbo.DimProduct AS tgt
USING stg.Product AS src
    ON tgt.ProductID = src.ProductID
WHEN MATCHED AND tgt.ListPrice <> src.ListPrice THEN
    UPDATE SET tgt.ListPrice = src.ListPrice
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ProductID, ProductName, ListPrice)
    VALUES (src.ProductID, src.ProductName, src.ListPrice);
```

`MERGE` is generally available in Fabric Data Warehouse. Facts store the dimension's **surrogate** key looked up at load time, so Type 2 history attaches each sale to the version valid on its date.

> **Exam trap.** `NOT ENFORCED` constraints don't reject duplicates. A duplicate key in a dimension breaks the one side of the relationship in the semantic model (Direct Lake queries fail on duplicates).

<!-- section: denormalize | objectives: 2.2.4 -->
## Denormalizing data

A star schema keeps one table per dimension: snowflaked tables (Product, Subcategory, Category) are flattened into `DimProduct`, and header attributes (order date, customer) are pushed down to the order line fact.

```text
CREATE TABLE dbo.DimProduct
AS
SELECT p.ProductID, p.ProductName, p.ListPrice,
       COALESCE(sc.SubcategoryName, 'None') AS Subcategory,
       COALESCE(c.CategoryName, 'None') AS Category
FROM stg.Product AS p
LEFT JOIN stg.Subcategory AS sc ON sc.SubcategoryID = p.SubcategoryID
LEFT JOIN stg.Category AS c ON c.CategoryID = sc.CategoryID;
```

| Normalized (snowflake) | Denormalized (star) |
| --- | --- |
| Less redundancy, smaller source tables | Repeated attribute values, compressed well by columnar storage |
| More joins and relationships in every query | One join per dimension, simpler and faster models |
| Hierarchy split across tables | Hierarchy (Category, Subcategory, Product) in one table |

> **Exam trap.** Use `LEFT JOIN` when flattening: an `INNER JOIN` silently drops products that have no subcategory.

<!-- section: aggregate-data | objectives: 2.2.5 -->
## Aggregating data

Aggregate tables change the grain (order line to day and store) for a gold layer, a smaller Import model or a high-level report.

```text
from pyspark.sql import functions as F

daily = (spark.read.table("silver_sales")
    .groupBy("OrderDate", "StoreID")
    .agg(F.sum("Amount").alias("TotalAmount"),
         F.countDistinct("CustomerID").alias("Customers"),
         F.count("*").alias("OrderLines")))
daily.write.mode("overwrite").saveAsTable("gold_daily_sales")
```

T-SQL uses `GROUP BY` (the warehouse also accepts `GROUP BY ALL`, which groups by every non-aggregated column) and `HAVING`. Dataflow Gen2 **Group by** has Basic (one grouping column) and Advanced (several columns and aggregations) modes, with operations such as Sum, Average, Median, Min, Max, Count rows, Count distinct rows and All rows. A materialized lake view can hold a gold aggregate declaratively.

> **Exam trap.** Distinct counts, averages and ratios aren't additive: a monthly figure can't be rebuilt from daily distinct counts or daily averages. Store the numerator and the denominator (sum and count), or keep the detail table.

<!-- section: merge-join | objectives: 2.2.6 -->
## Merging and joining data

**Merge** (join) adds columns from another table; **append** (union) stacks rows of tables with the same columns.

| Rows needed | Power Query join kind | T-SQL | PySpark `how` |
| --- | --- | --- | --- |
| Only matching rows | Inner | `INNER JOIN` | `"inner"` |
| All left rows, matching right | Left outer | `LEFT OUTER JOIN` | `"left"` |
| All right rows, matching left | Right outer | `RIGHT OUTER JOIN` | `"right"` |
| All rows of both | Full outer | `FULL OUTER JOIN` | `"full"` |
| Left rows without a match | Left anti | `NOT EXISTS`, or `LEFT JOIN` plus `IS NULL` on the right key | `"left_anti"` |
| Right rows without a match | Right anti | `NOT EXISTS` from the other side | `"left_anti"` with the tables swapped |

```text
orders = spark.read.table("silver_orders")
customers = spark.read.table("silver_customers")
joined = orders.join(customers, on="CustomerID", how="left")
orphans = orders.join(customers, on="CustomerID", how="left_anti")
all_regions = sales_eu.unionByName(sales_us)
```

In Power Query, a merge returns a nested table column that you expand to pick the columns; **Use fuzzy matching** joins on similar text with a similarity threshold. T-SQL `UNION` removes duplicate rows, `UNION ALL` keeps them; PySpark `unionByName` matches columns by name, `union` by position. In a warehouse, three-part names (`Warehouse.schema.table`) join a warehouse to another warehouse or to a lakehouse SQL analytics endpoint.

> **Exam trap.** Joining on a key that isn't unique on one side multiplies rows (fan-out) and inflates sums. Also, the default warehouse collation `Latin1_General_100_BIN2_UTF8` is case-sensitive: `'abc'` doesn't match `'ABC'`.

<!-- section: data-quality | objectives: 2.2.7 -->
## Resolving duplicates, missing data and nulls

| Problem | Power Query | T-SQL | PySpark |
| --- | --- | --- | --- |
| Identical rows | Remove duplicates on all columns | `SELECT DISTINCT` | `distinct()` |
| Several rows per key, keep the latest | Group by the key with Max of the date, then inner merge back | `ROW_NUMBER() OVER (PARTITION BY key ORDER BY date DESC)` = 1 | `row_number()` over a window, keep 1 |
| List the duplicates | Keep duplicates | `GROUP BY key HAVING COUNT(*) > 1` | `groupBy(key).count()` then filter |
| Null to a default | Replace values | `COALESCE(col, 0)` or `ISNULL` | `fillna({"col": 0})` |
| Drop incomplete rows | Filter out null, Remove blank rows | `WHERE col IS NOT NULL` | `dropna(subset=[...])` |
| Gaps under a header value | Fill down | Window function | Window function |
| Fact key missing from the dimension | Left anti merge to find them | `LEFT JOIN` plus `COALESCE(d.CustomerKey, -1)` | Left join plus `fillna(-1)` |

```text
from pyspark.sql import Window, functions as F

w = Window.partitionBy("CustomerID").orderBy(F.col("ModifiedDate").desc())
latest = (spark.read.table("bronze_customer")
    .withColumn("rn", F.row_number().over(w))
    .filter("rn = 1").drop("rn"))
clean = (latest
    .dropna(subset=["CustomerID"])
    .fillna({"Country": "Unknown", "CreditLimit": 0}))
```

The warehouse also supports `QUALIFY`, which filters on a window function without a subquery.

> **Exam trap.** `dropDuplicates(["CustomerID"])` keeps an arbitrary row per key, not the latest: use `row_number()` with an ordering when "keep the most recent" is required. Power Query's Remove duplicates is case-sensitive.

`COUNT(col)` and `AVG(col)` ignore nulls, `COUNT(*)` doesn't: replacing nulls with 0 lowers an average. `col = NULL` is never true: use `IS NULL`.

<!-- section: data-types | objectives: 2.2.8 -->
## Converting column data types

Warehouse and SQL analytics endpoint tables accept a restricted set of types:

| Not supported in tables | Use instead |
| --- | --- |
| `money`, `smallmoney` | `decimal` |
| `datetime`, `smalldatetime`, `datetimeoffset` | `datetime2` (precision up to 6 fractional digits) |
| `nchar`, `nvarchar` | `char`, `varchar` (UTF-8 collation) |
| `text`, `ntext`, `json` | `varchar` |
| `tinyint` | `smallint` |
| `image` | `varbinary` |

Lakehouse Delta types surface in the SQL analytics endpoint as SQL types: `STRING` as `varchar(8000)`, `TIMESTAMP` as `datetime2`, `TINYINT` as `smallint`; a Delta type with no mapping doesn't appear as a column. `uniqueidentifier` is stored as binary and shows as binary through the SQL analytics endpoint.

```text
-- T-SQL: CAST fails on a bad value, TRY_CAST returns NULL
SELECT CAST(OrderDateText AS date) AS OrderDate,
       TRY_CAST(AmountText AS decimal(18,2)) AS Amount
FROM stg.Orders;
```

```text
typed = (spark.read.table("bronze_orders")
    .withColumn("Amount", F.col("Amount").cast("decimal(18,2)"))
    .withColumn("OrderDate", F.to_date("OrderDateText", "dd/MM/yyyy")))
```

In Power Query, **Change type** sets the type (the automatic Changed Type step can be wrong on CSV); **Using locale** parses values written in another culture (`31/12/2026`, decimal comma); conversion errors are handled with Replace errors or Remove errors.

> **Exam trap.** Direct Lake doesn't support binary or GUID columns and requires matching data types on both sides of a relationship: convert those columns to strings or integers upstream, not in the model.

<!-- section: filter-data | objectives: 2.2.9 -->
## Filtering data

| Clause | Filters | Evaluated |
| --- | --- | --- |
| `WHERE` | Rows | Before grouping; can't use aggregates |
| `HAVING` | Groups | After `GROUP BY` |
| `QUALIFY` | Rows by a window function result | After window functions |

```text
SELECT StoreID, SUM(Amount) AS Total
FROM dbo.FactSales
WHERE OrderDate >= '2026-01-01' AND Channel IN ('Web', 'Store')
GROUP BY StoreID
HAVING SUM(Amount) > 100000;
```

```text
recent = (spark.read.table("silver_sales")
    .filter((F.col("OrderDate") >= "2026-01-01") & F.col("Channel").isin("Web", "Store"))
    .where(F.col("CustomerID").isNotNull()))
```

Filter as early as possible. In Power Query, put Filter rows right after the source so the step **folds** (runs in the source); a filter placed after a non-folding step processes every row in the mashup engine. Filtering a Delta table on its partition column reads only the matching partitions.

> **Exam trap.** `WHERE Region <> 'West'` also excludes rows where Region is NULL. In PySpark, combine conditions with `&` and `|` and parentheses, not with `and` and `or`.

<!-- section: key-points -->
## Key points

- SQL analytics endpoint: views, functions and procedures yes, writes to lakehouse tables no. No materialized views in the warehouse: use CTAS tables, or materialized lake views in a lakehouse.
- Warehouse `ALTER TABLE` adds only nullable columns; no computed columns; CTAS builds new enriched tables.
- `IDENTITY` is `bigint`, no seed or increment, unique but not sequential; constraints are `NOT ENFORCED`.
- Type 1 overwrites with `MERGE`; Type 2 adds rows with validity dates and new surrogate keys.
- Flatten snowflakes with `LEFT JOIN`; pre-aggregate only additive values.
- Keep the latest duplicate with `ROW_NUMBER` or `row_number()`, not `dropDuplicates`.
- No `nvarchar`, `datetime`, `money` or `tinyint` in warehouse tables.
- `WHERE` before grouping, `HAVING` after, `QUALIFY` on window results; filter early so Power Query folds.
