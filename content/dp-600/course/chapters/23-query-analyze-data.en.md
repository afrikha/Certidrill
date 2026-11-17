Fabric offers four ways to select, filter and aggregate data: the visual query editor and T-SQL over warehouses and SQL analytics endpoints, KQL over eventhouses, and DAX over semantic models. Exam questions show a short query with gaps to complete, or ask which tool or language fits a user and a data store.

<!-- section: choose-language | objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4 -->
## Choosing a query tool

| Data and user | Tool |
| --- | --- |
| Warehouse or SQL analytics endpoint, analyst who doesn't write SQL | Visual query editor |
| Warehouse or SQL analytics endpoint, SQL skills, window functions, cross-database joins | SQL query editor (T-SQL), or SSMS and Visual Studio Code through the connection string |
| KQL database in an eventhouse: logs, telemetry, time series | KQL queryset (KQL; a subset of T-SQL is also accepted) |
| Semantic model: measures, relationships, row-level security already defined | DAX query view |

> **Exam tip.** A DAX query uses the model's measures and security; a T-SQL query on the SQL analytics endpoint reads the Delta tables and ignores the semantic model. When a requirement says "use the existing measures", the answer is DAX.

<!-- section: visual-query-editor | objectives: 2.3.1 -->
## The visual query editor

Available in a warehouse, a SQL analytics endpoint and a mirrored database: **New visual query** in the ribbon opens a canvas that uses the Power Query diagram view.

1. Drag tables from **Explorer** to the canvas (or **Insert to canvas**).
2. Add steps: each step is an operator on the canvas. Only Power Query operations that fold to SQL are offered, for example choosing columns, filtering rows, grouping and merging.
3. To join, select **Merge queries as new** on one table, pick the key in each table and a **Join kind** (Inner, Left outer...).
4. Use the results: **Download Excel file**, **Visualize results**, **Save as view** or **Save as table**.

| Action | Result |
| --- | --- |
| Save as view | A view in a schema where you can create objects; it appears in Explorer |
| Save as table | A table created with `CREATE TABLE AS SELECT` (CTAS) |
| View SQL, then Edit SQL script | The generated T-SQL, opened in the SQL query editor |
| Drag tables from several warehouses | A cross-warehouse query |

Limits to remember:

- Read-only: `SELECT` only, no DDL or DML.
- **Visualize results** doesn't support SQL with `ORDER BY`.
- If a step can't be translated to SQL, a banner says the query isn't supported as a warehouse view.
- For merged queries, only the table with **Enable load** set appears in the SQL script.
- Queries save automatically to **My queries**; users with the Viewer workspace role and users the warehouse was shared with can't move them to **Shared queries**.

> **Exam trap.** The visual query editor never writes data except through Save as table. A request to insert, update or delete rows needs the SQL query editor in a warehouse, not the visual editor and not a SQL analytics endpoint.

<!-- section: sql-queries | objectives: 2.3.2 -->
## Querying with SQL

**New SQL query** opens the editor; **Select TOP 100 rows** on a table generates a starter script. Cross-database queries use three-part names (`item.schema.table`) on warehouses and SQL analytics endpoints of the current workspace, after adding them to Explorer with **+ Warehouses**.

```text
WITH Sales2026 AS
(
    SELECT s.CustomerKey, s.OrderDate, s.SalesAmount, c.Country
    FROM SalesWarehouse.dbo.FactSales AS s
    INNER JOIN CrmLakehouse.dbo.Customer AS c ON c.CustomerKey = s.CustomerKey
    WHERE s.OrderDate >= '2026-01-01'
)
SELECT TOP (10)
       Country,
       COUNT(*) AS Orders,
       COUNT(DISTINCT CustomerKey) AS Customers,
       SUM(SalesAmount) AS Revenue,
       RANK() OVER (ORDER BY SUM(SalesAmount) DESC) AS RevenueRank
FROM Sales2026
GROUP BY Country
HAVING SUM(SalesAmount) > 50000
ORDER BY Revenue DESC;
```

Logical order of evaluation, which explains most errors:

| Step | Clause | Consequence |
| --- | --- | --- |
| 1 | `FROM`, `JOIN` | Tables combined |
| 2 | `WHERE` | Rows filtered; no aggregates, no `SELECT` aliases |
| 3 | `GROUP BY` | Rows grouped |
| 4 | `HAVING` | Groups filtered with aggregates |
| 5 | `SELECT` (including window functions) | Aliases defined |
| 6 | `ORDER BY`, then `TOP` | Aliases usable here |

Window functions add a value per row without collapsing rows:

| Function | Ties (two rows at 100) | Typical use |
| --- | --- | --- |
| `ROW_NUMBER()` | 1, 2 | Keep one row per key |
| `RANK()` | 1, 1, then 3 | Ranking with gaps |
| `DENSE_RANK()` | 1, 1, then 2 | Ranking without gaps |
| `SUM(x) OVER (PARTITION BY p ORDER BY d)` | Not applicable | Running total per partition |
| `LAG(x)` / `LEAD(x)` | Not applicable | Previous or next row value |

```text
SELECT OrderDate, StoreID, SalesAmount,
       SUM(SalesAmount) OVER (PARTITION BY StoreID ORDER BY OrderDate) AS RunningTotal,
       LAG(SalesAmount) OVER (PARTITION BY StoreID ORDER BY OrderDate) AS PreviousDay
FROM dbo.DailyStoreSales;
```

> **Exam trap.** `COUNT(*)` counts rows, `COUNT(col)` skips nulls and `COUNT(DISTINCT col)` counts unique non-null values. "Number of customers who ordered" is `COUNT(DISTINCT CustomerKey)`, not `COUNT(CustomerKey)`.

On a SQL analytics endpoint the same `SELECT` syntax works, but tables are read-only; `INSERT ... SELECT` across items is possible only when the target is a warehouse.

<!-- section: kql-queries | objectives: 2.3.3 -->
## Querying with KQL

A KQL queryset runs queries on a KQL database of an eventhouse. A query is a table name followed by operators chained with `|`, each one working on the output of the previous.

```kusto
SensorReadings
| where Timestamp > ago(7d) and DeviceType == "Freezer"
| extend TempF = Temperature * 9 / 5 + 32
| summarize AvgTemp = avg(Temperature), MaxTemp = max(Temperature), Readings = count()
    by DeviceId, bin(Timestamp, 1h)
| where MaxTemp > -10
| top 10 by AvgTemp desc
```

```kusto
Orders
| where OrderDate between (datetime(2026-10-01) .. datetime(2026-10-31))
| summarize Orders = count(), Customers = dcount(CustomerId), Late = countif(IsLate == true)
    by Region
| render columnchart
```

```kusto
// Latest reading of each device
SensorReadings
| summarize arg_max(Timestamp, *) by DeviceId
```

| T-SQL | KQL |
| --- | --- |
| `SELECT col1, col2` | `project col1, col2` (`project-away` removes columns) |
| `WHERE` | `where` |
| Computed column `AS` | `extend` |
| `GROUP BY` with aggregates | `summarize agg() by col` |
| `HAVING` | `where` after `summarize` |
| `ORDER BY` | `order by` or `sort by` (descending by default) |
| `TOP (n) ... ORDER BY` | `top n by col` |
| `COUNT(DISTINCT col)` | `dcount(col)` (estimate) or `count_distinct(col)` (exact) |
| `SELECT DISTINCT` | `distinct col1, col2` |

String and time operators:

| Operator | Meaning |
| --- | --- |
| `==` / `=~` | Equal, case-sensitive / case-insensitive |
| `has` | Contains a whole term; uses the term index, faster |
| `contains` | Contains any substring, slower |
| `in`, `!in` | In a list |
| `ago(1h)`, `between (a .. b)` | Relative time, inclusive range |
| `bin(Timestamp, 5m)` | Rounds down to buckets for time series |

> **Exam trap.** `take 10` returns any 10 rows, with no order; "the 10 highest" is `top 10 by col desc`. And `order by` without `asc` sorts descending, the opposite of SQL.

A KQL queryset also accepts a subset of T-SQL; prefix a SQL query with `explain` to see its KQL translation. `join` defaults to `kind=innerunique`, which deduplicates the left side's keys: specify `kind=inner` or `kind=leftouter` when every left row matters.

<!-- section: dax-queries | objectives: 2.3.4 -->
## Querying with DAX

**DAX query view** runs DAX queries on a semantic model: in Power BI Desktop (left pane icon) or in the Fabric portal (**Write DAX queries** on the semantic model). A query returns a table and creates nothing in the model.

```text
DEFINE
    MEASURE Sales[Total Sales] = SUM ( Sales[SalesAmount] )
EVALUATE
    SUMMARIZECOLUMNS (
        'Product'[Category],
        'Date'[Month],
        TREATAS ( { 2026 }, 'Date'[Year] ),
        "Total Sales", [Total Sales],
        "Orders", COUNTROWS ( Sales )
    )
ORDER BY 'Product'[Category], 'Date'[Month]

EVALUATE
    TOPN (
        5,
        SUMMARIZECOLUMNS ( 'Product'[Product], "Sales", [Total Sales] ),
        [Sales], DESC
    )

EVALUATE
    CALCULATETABLE (
        SELECTCOLUMNS ( Customer, "Name", Customer[Name], "City", Customer[City] ),
        Customer[Country] = "France"
    )
```

| SQL idea | DAX query |
| --- | --- |
| `SELECT * FROM T` | `EVALUATE T` |
| `WHERE` | `FILTER ( T, condition )` or `CALCULATETABLE ( expression, filter )` |
| `GROUP BY` with aggregates | `SUMMARIZECOLUMNS ( group columns, filters, "Name", expression )` |
| `TOP (n)` | `TOPN ( n, table, order expression, DESC )` |
| `ORDER BY` | `ORDER BY` clause after `EVALUATE` |
| Temporary calculation | `DEFINE MEASURE` or `DEFINE VAR` |

Useful features:

- **Quick queries** from the Data pane: Show top 100 rows, Show column statistics, Define all measures in the model, Evaluate a measure.
- **CodeLens** above a `DEFINE MEASURE`: Update model: Add new measure, or Update model: Overwrite measure; **Update model with changes** applies them all. A `///` comment becomes the measure description.
- Performance analyzer copies a visual's DAX query, or **Run** opens it in DAX query view.

| Limit or prerequisite | Value |
| --- | --- |
| Desktop | 15 MB of data and 1,000,000 values per query |
| Web | 99,999 rows per query |
| Web permission | Write permission on the semantic model, and the workspace setting that lets users edit data models in the service |
| Viewer with Build permission | Use Power BI Desktop with a live connection instead |

> **Exam trap.** `SUMMARIZECOLUMNS` groups and aggregates in one call, and its filter arguments (such as `TREATAS`) restrict the result. `SUMMARIZE` with extension columns is the older pattern; `FILTER` over a whole fact table is the slow pattern.

<!-- section: key-points -->
## Key points

- Visual query editor: Power Query diagram over a warehouse or SQL analytics endpoint, folding steps only, read-only; Save as view or Save as table (CTAS).
- T-SQL: `WHERE` before grouping, `HAVING` after; aliases only usable in `ORDER BY`; three-part names for cross-database queries in the current workspace.
- `ROW_NUMBER`, `RANK` and `DENSE_RANK` differ only on ties.
- KQL: `where`, `project`, `extend`, `summarize ... by bin()`, `top n by`; `take` is unordered; `has` is faster than `contains`; `=~` ignores case.
- DAX query: `EVALUATE` returns a table, `DEFINE MEASURE` adds temporary measures, `SUMMARIZECOLUMNS` groups and aggregates.
- DAX queries use the model's measures and security; SQL on the endpoint doesn't.
