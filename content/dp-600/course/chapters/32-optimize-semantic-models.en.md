Enterprise models must stay fast, fresh and cheap on capacity. The exam gives a slow report, a model that falls back to DirectQuery or a refresh that runs too long, and asks for the diagnostic tool, the DAX rewrite, the Direct Lake setting or the incremental refresh policy that fixes it.

<!-- section: visual-query-performance | objectives: 3.2.1 -->
## Improving performance of queries and report visuals

Start with **Performance analyzer** in Power BI Desktop (**Optimize** ribbon > **Performance analyzer** > **Start recording** > **Refresh visuals**). Each visual shows its durations; copy its DAX query, or select **Run** to open it in DAX query view.

| Category that dominates | Meaning | Fix |
| --- | --- | --- |
| DAX query | The model or the measure is slow | Simplify DAX, reduce the model, add aggregations |
| Visual display | The visual renders too many points or is a slow custom visual | Fewer data points, Top N filter, another visual |
| Other | The visual waited for other visuals | Fewer visuals per page, drillthrough and tooltip pages |

Reduce the model (Import and Direct Lake both use the VertiPaq column store, where size depends on column cardinality):

- Remove unused columns, especially high-cardinality ones (GUIDs, free text, timestamps); split a datetime into a date column and a time column, or drop the time.
- Remove unused rows (old history) and pre-aggregate when the detail isn't reported.
- Use integer keys and the smallest suitable type; disable **Auto date/time** and use one date table.
- Prefer columns computed upstream or in Power Query over DAX calculated columns.

Reduce what visuals ask for:

- Limit visuals per page; filter large tables with **Top N**; move details to drillthrough pages.
- **Query reduction** options (Options > Current file): disable cross-highlighting by default, add an **Apply** button to slicers and filters so each change doesn't send queries.

**User-defined aggregations** speed up large DirectQuery models: an Import aggregation table (for example sales by day and product) is mapped to a DirectQuery **detail table** in **Manage aggregations** (Summarization Sum, Min, Max, Count, Count table rows, with GroupBy columns).

| Rule | Value |
| --- | --- |
| Detail table storage mode | DirectQuery (required) |
| Aggregation table storage mode | Import (can't be changed afterwards) |
| Related dimensions | Dual, so both tables can use them |
| Several aggregation tables | **Precedence**: higher is tried first |
| Visibility | Aggregation table hidden; users query the detail table |
| Row-level security | Must filter both the aggregation and the detail table to keep hits |
| Check hits | SQL Profiler, event `Aggregate Table Rewrite Query` |

**Automatic aggregations** (Premium capacities) build and train aggregations for DirectQuery models without manual mapping.

> **Exam trap.** Aggregations and hybrid tables aren't supported in Direct Lake models: to speed up Direct Lake, optimize the Delta tables and the DAX, or create aggregated Delta tables upstream.

<!-- section: dax-performance | objectives: 3.2.2 -->
## Improving DAX performance

The storage engine (VertiPaq) scans compressed columns in parallel and caches results; the formula engine evaluates complex logic row by row. Fast DAX sends simple column filters to the storage engine.

```text
-- Slow: FILTER evaluates the condition for every row of Product
Red Sales =
CALCULATE ( [Sales], FILTER ( 'Product', 'Product'[Color] = "Red" ) )

-- Fast: Boolean column filter; KEEPFILTERS keeps existing filters on Color
Red Sales =
CALCULATE ( [Sales], KEEPFILTERS ( 'Product'[Color] = "Red" ) )

-- FILTER is needed when the condition uses a measure: iterate a small table
Sales for Profitable Months =
CALCULATE ( [Sales], FILTER ( VALUES ( 'Date'[Month] ), [Profit] > 0 ) )

-- Variables: each measure is evaluated once instead of twice
Sales Growth % =
VAR _Current = [Sales]
VAR _PY = CALCULATE ( [Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
RETURN
    DIVIDE ( _Current - _PY, _PY )
```

A Boolean filter argument can't reference a measure, columns of several tables, a nested `CALCULATE` or a table function: those cases need `FILTER`, ideally over `VALUES` of a column rather than a whole table.

| Pattern to avoid | Better |
| --- | --- |
| `FILTER ( FactTable, ... )` as a `CALCULATE` argument | Boolean column predicate, or `FILTER` over `VALUES ( column )` |
| Repeating the same measure in one expression | `VAR` |
| `IF ( ISBLANK ( [M] ), 0, [M] )` on every row | Leave blanks: converting them to 0 makes visuals return every combination |
| `IFERROR` or `ISERROR` around arithmetic | `DIVIDE`, or test the condition first |
| `COUNT ( Table[Key] )` to count rows | `COUNTROWS ( Table )` |
| `IF ( HASONEVALUE ( c ), VALUES ( c ) )` | `SELECTEDVALUE ( c )` |
| Iterator over a large fact table calling a measure (context transition on each row) | Iterate a smaller table (dimension or `VALUES`), or aggregate first |

`DIVIDE` handles a zero denominator; the `/` operator is fine when the denominator is a non-zero constant.

> **Exam trap.** Both versions usually return the same numbers; the question is speed. Choose the Boolean predicate unless the condition references a measure or several tables.

<!-- section: direct-lake-config | objectives: 3.2.3 -->
## Configuring Direct Lake: framing, refresh and fallback

**Framing** is the Direct Lake refresh: it reads only the Delta log and points the model at the latest Parquet files, so it usually takes seconds. Queries then show the data as of the last successful framing. Columns are loaded into memory (**transcoding**) when a query first needs them, stay resident, and are evicted after framing on changed tables, after a period without use, or under memory pressure.

| Setting or behaviour | Detail |
| --- | --- |
| **Keep your Direct Lake data up to date** (semantic model settings, Refresh) | On by default: Delta changes trigger framing of the affected tables |
| When to turn it off | New data must not be visible before an ETL process finishes; then refresh at the end (portal, schedule, REST API, TOM) |
| After a non-recoverable refresh error | Automatic updates are suspended until an on-demand refresh succeeds |
| Framing prerequisite | The model owner (or fixed identity) needs read access to the source tables |

**DirectQuery fallback** exists only for Direct Lake on SQL. A query stays in Direct Lake only if no table has SQL row-level security, object-level security or dynamic data masking at the SQL analytics endpoint, no table is a non-materialized view, no table exceeds the guardrails, and the model was framed after the tables changed.

| `DirectLakeBehavior` | Behaviour | Use |
| --- | --- | --- |
| `Automatic` (default) | Falls back to DirectQuery silently | Production |
| `DirectLakeOnly` | The query fails with an error | Development: find and fix fallback causes |
| `DirectQueryOnly` | Always DirectQuery | Development: measure fallback performance |

Set it in the model's **Properties** pane (**Direct Lake behavior**) or with TOM:

```text
database.Model.DirectLakeBehavior = DirectLakeBehavior.DirectLakeOnly;
database.Model.SaveChanges();
```

Diagnose with DAX: the `[DirectLakeFallbackInfo]` column gives each table's reason, `None` meaning Direct Lake.

```text
EVALUATE TABLETRAITS ()
```

Guardrails per table depend on the SKU (excerpt):

| Fabric SKU | Parquet files and row groups per table | Rows per table | Max model size in OneLake |
| --- | --- | --- | --- |
| F2 to F8 | 1,000 | 300 million | 10 GB |
| F32 | 1,000 | 300 million | 40 GB |
| F64 | 5,000 | 1.5 billion | Unlimited |
| F512 | 10,000 | 12 billion | Unlimited |

| Cause | Fix |
| --- | --- |
| Too many Parquet files or row groups | `OPTIMIZE` (and `VACUUM`) the Delta table; otherwise a larger SKU |
| SQL view | Materialize it as a Delta table (for example a materialized lake view) |
| RLS or OLS at the SQL endpoint | Define the security in the semantic model instead |
| Table not framed | Refresh the model |

```text
OPTIMIZE gold_sales;
VACUUM gold_sales RETAIN 168 HOURS;
```

> **Exam trap.** When a guardrail is exceeded, Direct Lake on SQL falls back to DirectQuery (the refresh succeeds with a warning, queries are slower), while Direct Lake on OneLake fails the refresh and can't be queried until the Delta tables are optimized.

<!-- section: direct-lake-onelake-vs-sql | objectives: 3.2.4 -->
## Direct Lake on OneLake or on SQL analytics endpoint

| Area | Direct Lake on OneLake | Direct Lake on SQL |
| --- | --- | --- |
| Sources | One or more Fabric items with Delta tables (natively or through shortcuts) | One Fabric item with a SQL analytics endpoint |
| DirectQuery fallback | None: the query errors | Yes, controlled by Direct Lake behavior |
| SQL views | Not supported (use materialized lake views) | Supported, through fallback |
| SQL endpoint RLS, OLS, CLS | Not applied: access depends on OneLake permissions (OneLake security) | RLS through fallback; OLS and CLS supported, errors when access is denied |
| Semantic model RLS | Supported (fixed identity connection recommended) | Supported (same) |
| Calculated columns and tables | Preview (calculated columns use user context only) | No (except calculation groups, what-if and field parameters) |
| Composite with Import or DirectQuery tables | Yes | No |
| Auto date/time | Supported | Not supported |
| Created from | Power BI Desktop or web modeling, OneLake catalog | **New semantic model** on the SQL analytics endpoint |

| Requirement | Answer |
| --- | --- |
| Tables from a lakehouse and a warehouse in one model | Direct Lake on OneLake |
| Reuse T-SQL row-level security defined in the warehouse | Direct Lake on SQL (queries fall back to DirectQuery) |
| Model built on SQL views without materializing them | Direct Lake on SQL |
| Never pay DirectQuery performance; errors are preferable | Direct Lake on OneLake, or Direct Lake on SQL with `DirectLakeOnly` |
| Add Import tables to a Direct Lake model | Direct Lake on OneLake |

Both share limits: no gateway (cloud connections only), no model in My workspace, matching types on related columns, unique values on the one side, no binary or GUID columns.

> **Exam trap.** With Direct Lake on OneLake, a T-SQL RLS policy on the warehouse isn't enforced: the query succeeds without the SQL filter, and access depends on the user's OneLake permissions. Put row-level security in the semantic model or in OneLake security.

<!-- section: incremental-refresh | objectives: 3.2.5 -->
## Implementing incremental refresh

Incremental refresh partitions an Import (or hybrid) table by date so that each refresh reloads only recent periods.

1. In Power Query, create two **Date/Time** parameters named exactly `RangeStart` and `RangeEnd` (reserved, case-sensitive).
2. Filter the date column with them, `>=` on one boundary and `<` on the other, in a step that **folds** to the source.
3. In Power BI Desktop, define the **incremental refresh policy** on the table, then publish.
4. Run the first refresh in the service: it creates the partitions and loads history.

```text
let
    Source = Sql.Database("contoso-sql.database.windows.net", "SalesDb"),
    Sales = Source{[Schema = "dbo", Item = "FactSales"]}[Data],
    Filtered = Table.SelectRows(Sales, each [OrderDate] >= RangeStart and [OrderDate] < RangeEnd)
in
    Filtered
```

| Policy setting | Meaning |
| --- | --- |
| Archive data starting before refresh date | Historical window kept (for example 5 years), in yearly, quarterly or monthly partitions |
| Incrementally refresh data starting before refresh date | Window reloaded on every refresh (for example 10 days) |
| Get the latest data in real time with DirectQuery | Adds a DirectQuery partition after the refresh window (hybrid table); Premium, PPU or Embedded only |
| Only refresh complete days | Excludes the current partial day; required with real-time DirectQuery |
| Detect data changes | Refreshes only partitions whose maximum value of an audit column (such as `LastModified`, not the partition column) changed |

| Fact | Value |
| --- | --- |
| Licensing | Pro, Premium Per User, Premium, Embedded (real-time partition: not Pro) |
| Refresh duration limit | 2 hours with Pro, 5 hours with Premium; no limit through the XMLA endpoint |
| Partition management | SSMS or TMSL through the XMLA endpoint: refresh one historical partition, bootstrap a large initial load |
| Data source | One source for all partitions; filters must fold (relational sources work best) |
| Model that may exceed 1 GB | Enable large semantic model storage format before the first refresh |

> **Exam trap.** Using `>=` (or `<=`) on both boundaries loads boundary rows into two partitions and duplicates them. Also, republishing the model from Power BI Desktop replaces the partitions and their data, and a model with incremental refresh can't be downloaded back to a `.pbix`: change it with XMLA tools (TMSL, ALM Toolkit) instead.

Direct Lake models don't use model partitions or incremental refresh: framing already avoids reloading data, and partitioning is done at the Delta table level.

<!-- section: key-points -->
## Key points

- Performance analyzer: DAX query, Visual display or Other tells you whether to fix the model, the visual or the page.
- Smaller models are faster: remove high-cardinality columns, split datetimes, disable Auto date/time.
- Aggregations: Import aggregation table over a DirectQuery detail table, Dual dimensions; not in Direct Lake.
- Boolean filters beat `FILTER` over tables; use variables, `DIVIDE`, `COUNTROWS`, `SELECTEDVALUE`; don't turn blanks into zeros.
- Framing copies metadata only; Keep your Direct Lake data up to date is on by default; turn it off to expose data after ETL.
- `DirectLakeBehavior`: Automatic, DirectLakeOnly, DirectQueryOnly; `TABLETRAITS()` shows fallback reasons.
- OneLake: multiple sources, no fallback, OneLake security. SQL: one source, views and SQL RLS through fallback.
- Incremental refresh: `RangeStart` and `RangeEnd` Date/Time parameters, `>=` and `<`, folding filter, first refresh in the service, XMLA for partitions.
