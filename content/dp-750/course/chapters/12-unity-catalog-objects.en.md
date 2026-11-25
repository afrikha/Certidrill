Unity Catalog organizes every data asset of an Azure Databricks account in one hierarchy and governs it in one place. DP-750 asks you to design that hierarchy (names, catalogs per environment, isolation), write the DDL that creates catalogs, schemas, volumes, tables, views, materialized views and foreign catalogs, predict what happens when a managed or an external table is altered or dropped, and configure a Genie Agent so business users can find data in natural language.

<!-- section: object-model-naming | objectives: 1.2.1 -->
## Object model and naming conventions

Data and AI assets use a three-level namespace, `catalog.schema.object`, where the object is a table, view, materialized view, volume, function or model. Storage credentials, external locations, connections and shares sit directly under the **metastore**. Every object is a **securable**: privileges are granted on it and inherited by its children.

```text
Metastore (one per region, attached to workspaces)
├── Storage credential, external location, connection, share, recipient
└── Catalog                       dev_sales
    └── Schema                    dev_sales.crm
        ├── Table / view / MV     dev_sales.crm.orders
        ├── Volume                dev_sales.crm.landing
        └── Function              dev_sales.crm.mask_email
```

Databricks guidance for the hierarchy:

- Catalogs usually correspond to an **environment scope, a team, a business unit**, or a combination. Data isolation starts at the catalog level, not the metastore: one regional metastore serves dev, test and prod.
- Prefer **catalog-level managed storage** as the primary unit of physical isolation.
- When an environment and its data have the same isolation requirement, **bind the catalog** to specific workspaces (workspace-catalog binding), optionally read-only.
- Assign ownership of production catalogs and schemas to **groups**, not individuals, and reserve `MODIFY` on production tables to service principals.

A naming convention makes those decisions visible. A common pattern:

| Requirement | Convention | Example |
| --- | --- | --- |
| Separate development, test and production | Environment prefix on the catalog | `dev_finance`, `test_finance`, `prod_finance` |
| Isolate a business unit | One catalog per unit, bound to its workspaces | `prod_hr` bound to the HR workspace |
| Medallion layers inside an environment | Schema per layer or per domain | `prod_finance.bronze`, `prod_finance.silver`, `prod_finance.gold` |
| Data shared outside the organization | Dedicated, curated objects added to a share for each consumer | Share `fabrikam_sales` exposing `prod_sales.shared.orders_summary` |
| Code promoted across environments | Same schema and table names, only the catalog changes | Parameterize the catalog name in jobs and bundles |

Names with special characters such as hyphens must be enclosed in backticks (`` `prod-finance` ``); underscores don't need them, which is why underscores are preferred. External sharing uses OpenSharing (the study guide's "Delta Sharing"): a share is a read-only collection of tables and other assets, and recipients are defined per metastore.

> **Exam trap.** A separate metastore per environment is the wrong answer: Azure Databricks attaches one metastore per region, and isolation is achieved with catalogs, catalog-level storage and workspace-catalog binding.

<!-- section: catalogs | objectives: 1.2.2 -->
## Creating catalogs

```text
CREATE CATALOG IF NOT EXISTS prod_finance
  MANAGED LOCATION 'abfss://finance@stcontosoprod.dfs.core.windows.net/uc'
  COMMENT 'Production finance data';
```

- Requires `CREATE CATALOG` on the metastore, and `CREATE MANAGED STORAGE` on the external location that covers the `MANAGED LOCATION` path (the external location's path or a subpath).
- `MANAGED LOCATION` is optional but strongly recommended; without it, managed tables go to the metastore root storage. If the metastore has no root storage, the location is **mandatory**.
- A new catalog contains two schemas: `default` and `information_schema`.
- By default a catalog is accessible from **all workspaces** attached to the metastore. To restrict it, clear **All workspaces have access** and use **Assign to workspaces** (the current workspace must be included), then optionally change the access level from Read & Write to Read Only.
- Compute must be DBR 11.3 or above with a Unity Catalog access mode (standard or dedicated); SQL warehouses always support Unity Catalog.

Other catalog types use a different clause:

| Catalog type | Clause | Privilege required |
| --- | --- | --- |
| Standard | `MANAGED LOCATION` (optional) | `CREATE CATALOG` on the metastore |
| Foreign (Lakehouse Federation) | `CREATE FOREIGN CATALOG ... USING CONNECTION` | Plus owner of, or `CREATE FOREIGN CATALOG` on, the connection |
| Shared (OpenSharing recipient side) | `USING SHARE provider.share` | Plus `USE PROVIDER` on the metastore or ownership of the provider |

<!-- section: schemas | objectives: 1.2.3 -->
## Creating schemas

```text
CREATE SCHEMA IF NOT EXISTS prod_finance.silver
  MANAGED LOCATION 'abfss://finance@stcontosoprod.dfs.core.windows.net/uc/silver'
  COMMENT 'Cleansed finance data';
```

- `SCHEMA` and `DATABASE` are synonyms. In Unity Catalog the clause is `MANAGED LOCATION`; `LOCATION` is the Hive metastore form.
- Requires `USE CATALOG` and `CREATE SCHEMA` on the parent catalog, granted by the catalog owner or a metastore admin; a managed location also requires `CREATE MANAGED STORAGE` on the external location.
- Managed tables and volumes are stored in the most specific managed location: schema, then catalog, then metastore. A schema-level location isolates one layer or one regulated dataset in its own container.

> **Exam trap.** `USE CATALOG` and `USE SCHEMA` never give access to data by themselves; they are prerequisites. `CREATE SCHEMA` without `USE CATALOG` fails.

<!-- section: volumes | objectives: 1.2.4 -->
## Creating volumes

Volumes govern **non-tabular** files of any format (CSV landing files, images, PDFs, wheels, checkpoints). Tables govern tabular data.

```text
CREATE VOLUME prod_finance.bronze.landing;

CREATE EXTERNAL VOLUME prod_finance.bronze.erp_drop
  LOCATION 'abfss://erp@stcontosoraw.dfs.core.windows.net/exports';

GRANT READ VOLUME ON VOLUME prod_finance.bronze.erp_drop TO `data-engineers`;
-- Service principal, identified by its application ID
GRANT WRITE VOLUME ON VOLUME prod_finance.bronze.landing TO `5f0c1e2a-7b3d-4c8e-9a61-2d4b7e9f0a13`;
```

| | Managed volume | External volume |
| --- | --- | --- |
| Storage | Schema's managed storage location | An existing path under an external location |
| On `DROP VOLUME` | Files marked for deletion (7-day retention) | Files stay in cloud storage |
| Access | Only through Unity Catalog | Unity Catalog governs, external tools can use direct URIs |
| Create privilege | `CREATE VOLUME` on the schema | Plus `CREATE EXTERNAL VOLUME` on the external location |

Both need `USE CATALOG` and `USE SCHEMA`. Files are addressed as `/Volumes/catalog/schema/volume/path/file`. `READ VOLUME` reads files, `WRITE VOLUME` adds, modifies or deletes them. Volumes require Unity Catalog compute on DBR 13.3 LTS and above.

> **Exam trap.** Files in a volume can't be registered as a table. To query them as a table, ingest them into a managed table, or create an external table on a path outside any volume.

<!-- section: tables-views | objectives: 1.2.5 -->
## Creating tables, views and materialized views

**Managed tables** are the default and recommended type: Unity Catalog manages storage, layout and optimization (predictive optimization, automatic liquid clustering). They are Delta by default; add `USING iceberg` for Iceberg. **External tables** store data at a path you specify under an external location; Unity Catalog governs metadata but not the data lifecycle. Use them for existing data in formats that managed tables don't support (JSON, Avro, CSV...) or for direct access by non-Databricks clients.

```text
-- Managed Delta table
CREATE TABLE prod_finance.silver.invoices (
  invoice_id BIGINT NOT NULL,
  customer_id BIGINT,
  amount DECIMAL(18,2),
  invoice_date DATE
) COMMENT 'Cleansed invoices';

-- Managed table from a query (CTAS)
CREATE OR REPLACE TABLE prod_finance.gold.revenue_by_day AS
SELECT invoice_date, SUM(amount) AS revenue
FROM prod_finance.silver.invoices GROUP BY invoice_date;

-- External table
CREATE TABLE prod_finance.bronze.erp_invoices_raw
USING CSV OPTIONS (header 'true')
LOCATION 'abfss://erp@stcontosoraw.dfs.core.windows.net/tables/invoices';
```

| Table type | Privileges |
| --- | --- |
| Managed | `USE CATALOG`, `USE SCHEMA`, `CREATE TABLE` on the schema |
| External | Same, plus `CREATE EXTERNAL TABLE` on the external location |

**Views** store only query text. `CREATE TABLE` on a schema also allows creating views. To query a view, a user needs `SELECT` on the view plus `USE CATALOG` and `USE SCHEMA`. On SQL warehouses, standard compute, and dedicated compute on DBR 15.4 LTS and above, Unity Catalog checks the **view owner's** permissions on the underlying tables, so users don't need `SELECT` on them. On dedicated compute on DBR 15.3 and below, users need `SELECT` on the base tables too. Temporary views aren't registered in any schema.

**Materialized views** store precomputed results in a Delta table and refresh them incrementally when possible, through a serverless pipeline that Azure Databricks creates.

```text
CREATE OR REPLACE MATERIALIZED VIEW prod_finance.gold.revenue_by_region
  SCHEDULE EVERY 1 HOUR
AS SELECT region, SUM(amount) AS revenue
   FROM prod_finance.silver.invoices GROUP BY region;

CREATE OR REPLACE MATERIALIZED VIEW prod_finance.gold.open_orders
  TRIGGER ON UPDATE
AS SELECT * FROM prod_finance.silver.orders WHERE status = 'OPEN';

REFRESH MATERIALIZED VIEW prod_finance.gold.revenue_by_region;
REFRESH MATERIALIZED VIEW prod_finance.gold.revenue_by_region FULL ASYNC;
```

- Created only with a **pro or serverless SQL warehouse**, a notebook on serverless compute, or within a pipeline. The creator needs `SELECT` on the base tables, `USE CATALOG`, `USE SCHEMA` and `CREATE MATERIALIZED VIEW` on the schema, and becomes the owner.
- Schedules: `SCHEDULE EVERY n HOURS` (1 to 72), `DAYS` (1 to 31) or `WEEKS` (1 to 8), or `SCHEDULE CRON` with six fields and `AT TIME ZONE`. `TRIGGER ON UPDATE` refreshes when a source changes, at most once a minute, up to 10 sources.
- `REFRESH` is synchronous by default; `ASYNC` returns at once; `FULL` reprocesses all source data. The owner and principals with the `REFRESH` privilege can refresh.
- Incremental refresh needs Delta sources with row tracking enabled; Databricks also recommends deletion vectors.
- No time travel on a materialized view; `CLUSTER BY` is preferred to `PARTITIONED BY`.

| Requirement | Object |
| --- | --- |
| Reusable query, always current, no storage | View |
| Expensive aggregation read by many dashboards, refreshed on a schedule | Materialized view |
| Session-only intermediate result in a notebook | Temporary view |
| Data owned and optimized by Unity Catalog | Managed table |
| Existing files that other engines read and write directly | External table |

<!-- section: foreign-catalogs | objectives: 1.2.6 -->
## Foreign catalogs and connections

**Lakehouse Federation** queries external systems without copying data. With **query federation**, Unity Catalog pushes queries down over JDBC to sources such as SQL Server, PostgreSQL, MySQL, Oracle, Snowflake, Amazon Redshift, Google BigQuery or another Databricks workspace. With **catalog federation**, Databricks reads the foreign tables directly in object storage (for example a legacy Hive metastore), which is cheaper and faster. Both are **read-only**, with one exception: a federated internal (legacy workspace) Hive metastore allows reads and writes, and updates both the Hive metastore and Unity Catalog metadata; an external Hive metastore stays read-only.

Steps: create a **connection** (host, port, credentials), create a **foreign catalog** from it, grant privileges on its objects, run queries.

```text
CREATE CONNECTION sqlsrv_erp TYPE sqlserver
OPTIONS (
  host 'erp-sql.contoso.com',
  port '1433',
  user secret ('erp-scope', 'sql-user'),
  password secret ('erp-scope', 'sql-password')
);

CREATE FOREIGN CATALOG IF NOT EXISTS erp_live USING CONNECTION sqlsrv_erp
OPTIONS (database 'ErpDb');

GRANT USE CATALOG ON CATALOG erp_live TO `finance-analysts`;
```

| Need | Requirement |
| --- | --- |
| Create the connection | Metastore admin or `CREATE CONNECTION` on the metastore |
| Create the foreign catalog | `CREATE CATALOG` on the metastore and ownership of, or `CREATE FOREIGN CATALOG` on, the connection |
| Compute | DBR 13.3 LTS or above in standard or dedicated mode, or a pro or serverless SQL warehouse, with network access to the source |

Store credentials in a secret scope and reference them with `secret()` rather than in plain text. MySQL uses a two-level namespace, so its foreign catalog needs no `database` option. When a source supports both federation and **Lakeflow Connect**, Databricks recommends Lakeflow Connect for high volumes and low latency: federation suits ad hoc reporting, proofs of concept and live access with minimal data movement.

> **Exam trap.** A foreign catalog on an external database can't be written to. "Load the data every hour into Delta tables" is an ingestion requirement (Lakeflow Connect, notebook, Azure Data Factory), not federation.

<!-- section: ddl-managed-external | objectives: 1.2.7 -->
## DDL on managed and external tables

| Statement | Managed table | External table |
| --- | --- | --- |
| `DROP TABLE` | Recoverable for 7 days by default, then data files are purged | Metadata removed, data files stay in storage |
| `UNDROP TABLE` | Within the recovery period | Also needs `CREATE EXTERNAL TABLE` on the external location |
| `ALTER TABLE ... SET MANAGED` | Not applicable | Converts a Delta external table to managed (DBR 17.3 LTS+ or serverless) |
| Metadata changed outside Databricks | Not applicable | Run `MSCK REPAIR TABLE ... SYNC METADATA` |

```text
ALTER TABLE prod_finance.silver.invoices ADD COLUMN currency STRING COMMENT 'ISO 4217 code';
ALTER TABLE prod_finance.silver.invoices ALTER COLUMN amount COMMENT 'Amount incl. tax';
ALTER TABLE prod_finance.silver.invoices ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE prod_finance.silver.invoices SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name');
ALTER TABLE prod_finance.silver.invoices RENAME COLUMN currency TO currency_code;
ALTER TABLE prod_finance.silver.invoices OWNER TO `finance-engineers`;

SHOW TABLES DROPPED IN prod_finance.silver;
UNDROP TABLE prod_finance.silver.invoices;
UNDROP TABLE WITH ID '6ca7be55-8f58-47a7-85ee-7a59082fd17a';

ALTER TABLE prod_finance.bronze.erp_orders SET MANAGED;
ALTER TABLE prod_finance.bronze.erp_orders UNSET MANAGED;
```

- `ADD COLUMN` requires `MODIFY`; a `DEFAULT` can't be set when adding a column to a Delta table (existing rows get `NULL`).
- `RENAME COLUMN` and `DROP COLUMN` require **column mapping** on the Delta table. `SET NOT NULL` validates existing data. `ALTER COLUMN ... TYPE` performs type widening (DBR 15.4 LTS+; such tables can then be read only by DBR 15.4 LTS and above).
- Dropping or undropping requires ownership or `MANAGE`. `UNDROP` restores privileges, columns and properties, but not primary and foreign key constraints. If a table with the same name exists, rename it first; if several dropped tables share a name, use `WITH ID` from `SHOW TABLES DROPPED`.
- The recovery period can be set at catalog or schema level (0 hours, or 7 to 30 days); the schema setting wins.
- `SET MANAGED` copies data with no downtime, then blocks writes for a few minutes during the switch. Old files are kept 14 days so that `UNSET MANAGED` can roll back. Requires ownership or `MANAGE`; don't add `MOVE` or `COPY` for an external table.

> **Exam trap.** "Drop the table but keep the files for another engine" is an external table. "A managed table was dropped yesterday" is `UNDROP TABLE`, not a restore from storage.

<!-- section: genie-instructions | objectives: 1.2.8 -->
## Configuring Genie instructions for data discovery

AI/BI Genie lets business users ask questions about data in natural language. The configured environment is now called a **Genie Agent** (formerly Genie space). Analysts configure it with Unity Catalog data, example SQL queries, instructions and trusted assets.

- Data must be registered in Unity Catalog: up to **50** tables, views or metric views.
- Compute: a **pro or serverless SQL warehouse**. The author needs the Databricks SQL entitlement, CAN USE on the warehouse, `SELECT` on the data and at least CAN EDIT on the agent; creators get CAN MANAGE.
- End users need the consumer access or Databricks SQL entitlement and CAN VIEW or CAN RUN on the agent. Warehouse access uses the author's embedded credentials, but **data access is always evaluated with the end user's Unity Catalog identity**.

| Configuration | Use it for |
| --- | --- |
| Unity Catalog table and column comments | Default descriptions Genie reads; edit them in the agent or reset to the Unity Catalog value |
| Example SQL queries, static or parameterized | Teach the SQL for common questions; a parameterized query used as written gives a verified answer |
| SQL functions registered in Unity Catalog | Questions that a query can't answer; users need `EXECUTE` |
| SQL expressions: measures, filters, fields | Reusable business definitions with synonyms, applied exactly as written |
| Join relationships | Many-to-one, one-to-many, one-to-one joins; primary and foreign keys are imported automatically |
| General (text) instructions | Only global context that fits no other format |
| Prompt matching (format assistance, entity matching) | Map user values to column values; entity matching covers up to 120 string columns |

Limits: 100 instructions per agent (each example query, each function and the whole general instructions block count as one) and 200 knowledge store snippets (table descriptions, joins, SQL expressions). Knowledge store edits are scoped to the agent and **don't change Unity Catalog metadata**. Example queries and functions are **trusted assets**. Genie excludes tables with row filters, and masked columns, from prompt matching; disable entity matching on views that reference them.

> **Exam tip.** Prefer a SQL expression or an example query to a text instruction for business logic: Genie applies SQL exactly, while text is interpreted. Keep instructions free of conflicts.

<!-- section: key-points -->
## Key points

- One metastore per region; isolate with catalogs per environment or unit, catalog-level storage and workspace-catalog binding.
- `CREATE CATALOG` needs the metastore privilege; `MANAGED LOCATION` needs `CREATE MANAGED STORAGE` on the external location.
- Managed volumes and tables are deleted with their object (after a recovery period); external ones keep their files.
- Volumes hold files, not tables. Views store queries; materialized views store results and need a pro or serverless warehouse (or serverless compute).
- Federation is read-only (except a federated internal Hive metastore): connection, then foreign catalog, then grants.
- `RENAME COLUMN` and `DROP COLUMN` need column mapping; `UNDROP` works for 7 days by default; `SET MANAGED` converts external to managed.
- Genie Agents: up to 50 data objects, pro or serverless warehouse, SQL over text instructions, end users' own privileges.
