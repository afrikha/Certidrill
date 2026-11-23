Analysis questions sit at the end of the pipeline: the data is in S3, Redshift or a database, and someone must check it, clean it, query it, summarize it or show it on a dashboard. You pick the tool that fits the user (analyst, engineer, business user), the SQL construct that produces the expected result, and the capacity model (provisioned or serverless) that fits the workload's shape and budget.

<!-- section: visualization | objectives: 3.2.1 -->
## Visualizing data with AWS services

**Quick Sight**, the business intelligence capability of **AWS Quick** (the service formerly called Amazon QuickSight), builds interactive dashboards on Athena, Redshift, RDS, Aurora, S3 files, SaaS sources and more. A **dataset** either imports data into **SPICE**, the in-memory engine (fast, refreshed on a schedule or incrementally, no load on the source at view time), or uses **direct query** (always current, every visual runs a query on the source).

| Need | Tool |
| --- | --- |
| Dashboards for business users, embedded in a portal, row-level security per user | Quick Sight (AWS Quick) |
| Fast dashboards for many viewers on data refreshed daily | Quick Sight with a SPICE dataset |
| Numbers that must reflect the source within seconds | Quick Sight direct query |
| First look at a new data set's distributions, missing values and correlations | DataBrew data profile (profile job), viewed in the DataBrew console |
| Log and text exploration | OpenSearch Dashboards |
| Operational metrics and time series from many sources | Amazon Managed Grafana or CloudWatch dashboards |
| Ad hoc charts while exploring with code | Notebooks (matplotlib and similar libraries) |

When Quick Sight reads data through Athena, its service role needs access to the S3 buckets of the data and of the Athena query results, and Lake Formation permissions if the tables are governed.

> **Exam trap.** A dashboard opened by hundreds of users on Athena in direct query mode runs (and pays for) a scan for every visual. "Reduce cost and latency; daily freshness is enough" is a SPICE dataset with a scheduled refresh.

<!-- section: verify-clean | objectives: 3.2.2 -->
## Verifying and cleaning data

Verification answers "is the data complete, unique, valid and consistent?" before anyone trusts it; cleaning fixes what fails.

| Tool | Typical use |
| --- | --- |
| **Athena** SQL | Count rows per partition against the source, find duplicates (`GROUP BY key HAVING COUNT(*) > 1`), nulls in mandatory columns, out-of-range values; write a cleaned table with CTAS |
| **Lambda** | Validate each file or record on arrival (schema, required fields, checksum) and route failures to a quarantine prefix or a dead-letter queue |
| **Quick Sight** | Visual checks of trends and outliers by business owners; calculated fields to flag anomalies |
| **Jupyter notebooks** | Exploratory checks in pandas or PySpark: SageMaker Unified Studio JupyterLab, SageMaker AI notebooks, EMR Studio, Glue interactive sessions, Athena Spark notebooks |
| **SageMaker Data Wrangler** (now in **SageMaker Canvas**) | Low-code data flows with transforms, a Data Quality and Insights report, export to S3, Feature Store, SageMaker Pipelines or a Python script |
| **Glue DataBrew** | Visual cleaning recipes and profile jobs with data quality rules |

```text
SELECT order_id, COUNT(*) AS copies
FROM raw.orders
WHERE dt = '2026-11-21'
GROUP BY order_id
HAVING COUNT(*) > 1;
```

> **Exam tip.** In the current SageMaker Studio, Data Wrangler is opened from SageMaker Canvas. A choice that says "Data Wrangler in SageMaker Studio Classic" points to the old experience.

<!-- section: sql-views | objectives: 3.2.3 -->
## Querying and creating views with SQL in Redshift and Athena

| Object | Athena | Redshift |
| --- | --- | --- |
| View | `CREATE OR REPLACE VIEW`; stored in the Glue Data Catalog; recomputed at each query | `CREATE VIEW`; recomputed at each query |
| Late-binding view | Not applicable | `WITH NO SCHEMA BINDING`: not checked against underlying objects until queried; required for views on Spectrum external tables, survives dropping and recreating tables |
| Materialized view | Persist results with CTAS or `INSERT INTO` | `CREATE MATERIALIZED VIEW`: stored result, incremental or full refresh, `AUTO REFRESH YES`, automatic query rewriting |
| Querying S3 | Native (tables of the Data Catalog) | Redshift Spectrum external schema on the Data Catalog |

```text
CREATE MATERIALIZED VIEW mv_daily_sales
AUTO REFRESH YES
AS
SELECT store_id, sale_date, SUM(amount) AS total_amount, COUNT(*) AS orders
FROM sales_fact
GROUP BY store_id, sale_date;

CREATE VIEW v_recent_clicks AS
SELECT user_id, page, ts
FROM spectrum_lake.clicks
WHERE dt >= '2026-11-01'
WITH NO SCHEMA BINDING;
```

Redshift materialized views refresh **incrementally** when the definition uses supported constructs (inner joins, filters, `GROUP BY`, `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`); outer joins, window functions, `DISTINCT` aggregates, `UNION` or subqueries force a full recompute. Auto refresh runs at an interval (default 300 seconds) only when the view is stale; `REFRESH MATERIALIZED VIEW ... CASCADE` refreshes nested views.

> **Exam trap.** A standard view saves no compute: every query reruns the aggregation. "A dashboard repeats the same expensive aggregation every few minutes" is a Redshift materialized view with auto refresh, not a view.

<!-- section: athena-spark | objectives: 3.2.4 -->
## Exploring data with Athena notebooks for Apache Spark

Athena also runs **Apache Spark** serverlessly for exploration in Python:

- Create a workgroup whose **analytics engine is Apache Spark**; the engine of a workgroup can't be changed later. Spark workgroups use the **notebook editor**, not the SQL query editor.
- A notebook (Jupyter-compatible) starts a **session**; each cell runs as a **calculation**. Capacity is counted in **DPUs** (4 vCPUs, 16 GB): coordinator and executor are 1 DPU each, maximum concurrent DPUs default 20 (3 to 60), idle timeout default 20 minutes (1 to 480).
- Closing the notebook tab does not end the session: terminate it, or rely on the idle timeout.
- The in-console notebooks run on **PySpark engine version 3**; the **Apache Spark 3.5** release runs from SageMaker Unified Studio notebooks or Spark Connect clients.
- Tables of the Glue Data Catalog are readable with Spark SQL; results and calculation outputs are written to an S3 location of the workgroup.

```python
sales = spark.read.parquet("s3://example-lake-curated/sales/")
sales.printSchema()
sales.filter(sales.amount < 0).count()
spark.sql("SELECT store_id, SUM(amount) AS total FROM curated.sales GROUP BY store_id").show(10)
```

| Requirement | Answer |
| --- | --- |
| Interactive PySpark exploration of S3 data, no cluster | Athena notebook with a Spark workgroup |
| SQL-only analysis | Athena SQL workgroup |
| Long-running, scheduled Spark ETL | Glue job or EMR Serverless |

> **Exam trap.** Capacity reservations don't apply to Spark workgroups, and a SQL workgroup can't be switched to Spark. Create a new workgroup with the Apache Spark engine.

<!-- section: provisioned-serverless | objectives: 3.2.5 -->
## Provisioned versus serverless services

| Service | Provisioned | Serverless |
| --- | --- | --- |
| Redshift | Clusters of RA3 nodes: reserved nodes for steady use, pause and resume, concurrency scaling | Redshift Serverless: RPUs (16 GB each), base capacity default 128 (from 4), maximum capacity and RPU-hour limits, billed only while queries run, AI-driven scaling |
| EMR | Clusters on EC2: instance choice, Spot, full configuration | EMR Serverless: per-job resources, optional pre-initialized capacity |
| Kinesis Data Streams | Shards you size (1 MB/s or 1,000 records/s write each) | On-demand mode: scales automatically (starts at 4 MB/s write) |
| MSK | Brokers you size and patch windows you plan | MSK Serverless: no brokers to size |
| DynamoDB | Provisioned capacity with auto scaling, reserved capacity | On-demand: pay per request |
| Athena | Capacity reservations (dedicated DPUs) | Per byte scanned |
| OpenSearch Service | Managed domains (instance types, shards) | OpenSearch Serverless collections (OCUs) |

Trade-offs:

- **Serverless** wins for spiky, intermittent or unpredictable workloads, small teams and new projects: no capacity planning, no idle cost (except minimum capacity on some services), automatic scaling. Costs grow linearly with use and some settings are not exposed.
- **Provisioned** wins for steady, high-utilization workloads (with reservations or Savings Plans), for strict control of versions, instance types and configuration, and for predictable monthly cost.
- Start-up latency: serverless resources may need time to scale from zero; pre-initialized capacity (EMR Serverless) or a base capacity (Redshift Serverless) reduces it.

> **Exam tip.** "Queries run a few hours a week at unpredictable times, minimize cost and administration" is Redshift Serverless; "a 24/7 warehouse with constant load and a three-year commitment" is provisioned RA3 with reserved nodes.

<!-- section: aggregation | objectives: 3.2.6 -->
## Aggregation, rolling averages, grouping and pivoting

| Concept | Meaning | SQL |
| --- | --- | --- |
| Aggregation | Reduce many rows to one value | `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`; approximate distinct counts with `approx_distinct` (Athena) or `APPROXIMATE COUNT(DISTINCT ...)` (Redshift) |
| Grouping | One aggregate per group | `GROUP BY`; subtotals with `ROLLUP`, `CUBE`, `GROUPING SETS`; filter groups with `HAVING` |
| Rolling (moving) average | Average over a sliding window of rows, smoothing daily noise | Window function `AVG(...) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` |
| Pivoting | Turn row values into columns (one column per month) | Redshift `PIVOT` and `UNPIVOT`; in Athena, conditional aggregation |

```text
SELECT store_id,
       sale_date,
       total_amount,
       AVG(total_amount) OVER (
         PARTITION BY store_id
         ORDER BY sale_date
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ) AS avg_7_days
FROM daily_sales;

SELECT *
FROM (SELECT region, sale_month, amount FROM monthly_sales)
PIVOT (SUM(amount) FOR sale_month IN ('2026-09', '2026-10', '2026-11'));

SELECT region,
       SUM(CASE WHEN sale_month = '2026-10' THEN amount ELSE 0 END) AS oct_2026,
       SUM(CASE WHEN sale_month = '2026-11' THEN amount ELSE 0 END) AS nov_2026
FROM monthly_sales
GROUP BY region;
```

Redshift `PIVOT` supports `SUM`, `COUNT`, `AVG`, `MIN` and `MAX`, and its `IN` list takes literals, not columns or subqueries.

> **Exam trap.** A window function keeps every row and adds the computed value; `GROUP BY` collapses rows. "Show each day's sales with its 7-day moving average" needs `OVER (... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`, not `GROUP BY`; with gaps in dates, the window covers 7 rows, not 7 calendar days.

<!-- section: key-points -->
## Key points

- Quick Sight in AWS Quick for dashboards; SPICE for speed and lower source cost, direct query for freshness; DataBrew profiles for first-look statistics.
- Verify with Athena SQL (counts, duplicates, nulls), Lambda validation on arrival, notebooks, Data Wrangler (in SageMaker Canvas) and DataBrew.
- Views recompute; Redshift materialized views store results with incremental and auto refresh; late-binding views for Spectrum tables.
- Athena Spark: Spark workgroup, notebook sessions in DPUs, terminate idle sessions; Spark 3.5 through SageMaker Unified Studio or Spark Connect.
- Serverless for spiky and intermittent loads; provisioned with reservations for steady loads and full control.
- Aggregate with `GROUP BY`, `ROLLUP`, `GROUPING SETS`; rolling averages with window frames; pivot with Redshift `PIVOT` or conditional aggregation in Athena.
