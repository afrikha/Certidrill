Governing Unity Catalog objects means making data findable (comments, tags), protecting it at row and column level (row filters, column masks, ABAC policies), keeping it no longer than needed (retention), and proving who did what (lineage, audit logs), including when the data leaves the account through Delta Sharing. Exam questions give a requirement such as "every new table tagged as PII must be masked automatically" or "a partner without Databricks must read one partition" and ask which feature, statement or privilege fits.

<!-- section: descriptions-discovery | objectives: 2.2.1 -->
## Table and column descriptions for discovery

Comments are the descriptions that Catalog Explorer, search and AI/BI Genie show. Three ways to write them:

| Moment | Statement |
| --- | --- |
| At creation | `COMMENT` option of `CREATE TABLE`, and `COMMENT` after a column definition |
| Existing object (catalog, schema, table, volume...) | `COMMENT ON <object> IS '...'`, or the `COMMENT` option of `ALTER <object>` |
| Existing column | `ALTER TABLE ... ALTER COLUMN ... COMMENT '...'` |

```text
CREATE TABLE sales.bronze.orders (
  order_id BIGINT COMMENT 'Unique order identifier',
  order_ts TIMESTAMP COMMENT 'Order time, UTC'
) COMMENT 'Raw orders from the ERP, one row per order';

COMMENT ON TABLE sales.bronze.orders IS 'Raw ERP orders, loaded hourly';
ALTER TABLE sales.bronze.orders ALTER COLUMN order_ts COMMENT 'Order time, UTC';
```

In Catalog Explorer, **AI generate** proposes comments for a table and its columns (the workspace must allow AI-assistive features). Suggestions are never saved automatically: you **Accept** or **Edit** each one. AI-generated comments exist for tables and columns only.

Privileges to set a comment:

| Object | Required |
| --- | --- |
| Table or column | Owner, or `MODIFY` and `SELECT` on the table, plus `USE CATALOG` and `USE SCHEMA` |
| View or materialized view | Owner only (`MANAGE` isn't enough) |
| Catalog, schema, volume, share, connection... | Owner or `MANAGE` |

Anyone with `BROWSE` can read comments. Basic Markdown renders in Catalog Explorer (not in `DESCRIBE` output). Saving a comment runs an `ALTER` statement and is recorded in the table history.

> **Exam trap.** `COMMENT ON` doesn't target columns. For a column of an existing table, the answer is `ALTER TABLE ... ALTER COLUMN ... COMMENT`.

Tags complement comments for discovery and governance: key-value pairs on catalogs, schemas, tables, columns and volumes, queryable in `INFORMATION_SCHEMA.TABLE_TAGS`, `COLUMN_TAGS`, `SCHEMA_TAGS`, `CATALOG_TAGS` and `VOLUME_TAGS`.

<!-- section: abac | objectives: 2.2.2 -->
## Attribute-based access control with tags and policies

ABAC evaluates **governed tags** on objects to decide which data a **policy** protects. A single policy attached high in the hierarchy protects every current and future table that carries the tag.

**Governed tags** are defined at the account level with a list of allowed values (up to 500 values per tag, 1,000 governed tags per account). Only principals with the **ASSIGN** permission on a governed tag can apply it. System tags such as `class.*` (applied by data classification) and `system.certification_status` are predefined. To tag an object you also need `APPLY TAG` on it (or ownership) plus `USE SCHEMA` and `USE CATALOG`. Limits: 50 tags per object, 1,000 column tags per table, one column per `ALTER TABLE` statement.

```text
ALTER TABLE hr.core.employees ALTER COLUMN ssn SET TAGS ('pii' = 'ssn');
ALTER TABLE hr.core.employees SET TAGS ('sensitivity' = 'high');
SET TAG ON CATALOG hr `cost_center` = `finance`;
```

A **policy** names a UDF, the principals it applies to, and tag conditions:

```text
CREATE FUNCTION hr.gov.ssn_last4(ssn STRING, nr INT) RETURNS STRING
  RETURN right(ssn, nr);

CREATE POLICY mask_ssn
ON SCHEMA hr.core
COLUMN MASK hr.gov.ssn_last4
TO `analysts` EXCEPT `hr_admins`
FOR TABLES
MATCH COLUMNS has_tag_value('pii', 'ssn') AS ssn
ON COLUMN ssn
USING COLUMNS (4);

CREATE POLICY hide_eu
ON CATALOG hr
ROW FILTER hr.gov.non_eu
TO `analysts`
FOR TABLES
WHEN has_tag_value('sensitivity', 'high')
MATCH COLUMNS has_tag('geo_region') AS region
USING COLUMNS (region);
```

| Clause | Role |
| --- | --- |
| `ON METASTORE / CATALOG / SCHEMA / TABLE` | Attachment point; applies to all descendant tables (metastore level is Beta, metastore admin only) |
| `TO` / `EXCEPT` | Principals subject to / exempt from the policy (20 principals max) |
| `WHEN` | Table condition on tags; omitted means all tables in scope |
| `MATCH COLUMNS` | Column conditions with aliases (6 max for a row filter, 3 for a mask) |
| `ON COLUMN` | The matched column a mask applies to |
| `USING COLUMNS` | Arguments passed to the UDF: aliases or literals |

Requirements: `MANAGE` on the securable (or ownership) and `EXECUTE` on the UDF; compute on serverless, or standard or dedicated compute on Databricks Runtime 16.4 or above. Quotas: 50 policies per table, 100 per schema, 100 per catalog. Tag changes take a few minutes to apply.

Only one distinct row filter can resolve for a user and a table, and one distinct mask per column. If two policies resolve to different UDFs, the query fails with an error, even if the results would be identical.

> **Exam trap.** A materialized view or streaming table is refreshed as the pipeline owner or run-as identity. If that identity is subject to a policy, filtered or masked data is stored permanently. Put that identity in `EXCEPT`.

<!-- section: row-filters-masks | objectives: 2.2.3 -->
## Row filters and column masks

A table-level **row filter** is a SQL UDF that returns `BOOLEAN`; a **column mask** is a UDF that returns the column's type. Both run for every query, whatever the compute or the tool.

```text
CREATE FUNCTION sales.gov.us_only(region STRING) RETURNS BOOLEAN
  RETURN is_account_group_member('admins') OR region = 'US';

ALTER TABLE sales.silver.orders SET ROW FILTER sales.gov.us_only ON (region);
ALTER TABLE sales.silver.orders DROP ROW FILTER;

CREATE FUNCTION sales.gov.email_mask(email STRING) RETURNS STRING
  RETURN CASE WHEN is_account_group_member('support') THEN email ELSE '***' END;

ALTER TABLE sales.silver.customers ALTER COLUMN email SET MASK sales.gov.email_mask;
ALTER TABLE sales.silver.customers ALTER COLUMN email DROP MASK;

CREATE TABLE sales.silver.leads (region STRING, id INT)
  WITH ROW FILTER sales.gov.us_only ON (region);
```

A mask can take other columns as inputs with `USING COLUMNS (...)`. Identity functions (`is_account_group_member()`, `current_user()`, `session_user()`) run as the invoker; the rest of the function runs with the definer's rights.

Privileges: `EXECUTE` on the function, `USE SCHEMA`, `USE CATALOG`; on an existing table, ownership or `MANAGE` plus `SELECT`; `CREATE TABLE` when the filter is set at creation.

Limitations to know:

- Not on views (use a dynamic view or ABAC instead). One mask per column.
- Databricks Runtime below 12.2 LTS fails securely and returns no data. Dedicated access mode needs 15.4 LTS or above with serverless enabled in the workspace (filtering runs on serverless).
- No time travel and no deep or shallow clone on tables with table-level filters or masks.
- Tables with table-level filters or masks can't be added to a share (schemas that contain them are filtered out of a schema share).

| Requirement | Choose |
| --- | --- |
| Same rule on many tables, new tagged tables covered automatically | ABAC policy |
| Table owners must not be able to remove the rule | ABAC policy |
| Exempt an ETL principal so it can clone or share | ABAC policy with `EXCEPT` |
| One-off logic for a single table, managed by its owner | Table-level row filter or mask |
| Share a curated, transformed subset | Dynamic view |

> **Exam tip.** Audit table-level rules in `INFORMATION_SCHEMA.ROW_FILTERS` and `INFORMATION_SCHEMA.COLUMN_MASKS`; audit ABAC with `SHOW POLICIES`, `DESCRIBE POLICY` and `SHOW EFFECTIVE POLICIES`.

<!-- section: retention | objectives: 2.2.4 -->
## Data retention policies

Delta (and managed Iceberg) tables keep old data files and history for time travel. Two table properties set the windows:

| Property | Default | Controls |
| --- | --- | --- |
| `delta.deletedFileRetentionDuration` | `interval 7 days` | How old unreferenced files must be before `VACUUM` deletes them, so how far back time travel works |
| `delta.logRetentionDuration` | `interval 30 days` | How long the transaction log (table history) is kept |

From Databricks Runtime 18.0, `logRetentionDuration` must be greater than or equal to `deletedFileRetentionDuration`.

```text
ALTER TABLE finance.gold.ledger SET TBLPROPERTIES (
  'delta.logRetentionDuration' = 'interval 90 days',
  'delta.deletedFileRetentionDuration' = 'interval 90 days'
);

VACUUM finance.gold.ledger DRY RUN;
VACUUM finance.gold.ledger;
```

`VACUUM` permanently removes files older than the threshold: time travel to versions before it is lost. Databricks strongly recommends at least 7 days; going lower requires turning off `spark.databricks.delta.retentionDurationCheck.enabled`. On Unity Catalog managed tables, **predictive optimization** runs `VACUUM` automatically.

To expire **rows** by age, use **auto time-to-live** on managed tables (Databricks Runtime 17.3 and above, predictive optimization on, `MODIFY` on the table):

```text
ALTER TABLE web.bronze.clicks DELETE ROWS 30 DAYS AFTER event_ts;
ALTER TABLE web.bronze.clicks DROP ROW DELETION;
```

Predictive optimization then runs `DELETE`, `PURGE` (when deletion vectors are on) and `VACUUM` in the background; timing isn't guaranteed. Auto time-to-live isn't supported on materialized views, and streaming readers of such a table must set `skipChangeCommits`.

For a "right to be forgotten" request on a table with deletion vectors: `DELETE` the rows, `REORG TABLE ... APPLY (PURGE)` to rewrite the files, then `VACUUM` after the retention period.

> **Exam trap.** `DELETE` alone doesn't erase data from storage: the old files stay readable through time travel until `VACUUM` removes them.

<!-- section: lineage | objectives: 2.2.5 -->
## Owner, history, dependencies and lineage in Catalog Explorer

Catalog Explorer (**Catalog** in the sidebar) shows for a table:

| Item | Where | SQL equivalent |
| --- | --- | --- |
| Owner | Overview, owner edit | `ALTER TABLE ... SET OWNER TO <principal>` |
| History of operations | **History** tab | `DESCRIBE HISTORY <table>` |
| Frequent queries and users (last 30 days) | Table insights | |
| Upstream and downstream tables, notebooks, jobs, pipelines, dashboards | **Lineage** tab, **See Lineage Graph** | `system.access.table_lineage`, `system.access.column_lineage` |

Make a group the owner so that ownership survives staff changes. The owner has all privileges on the object and can grant them.

Unity Catalog captures lineage **automatically**, down to the column level, for queries run through DataFrames or Databricks SQL on Unity Catalog tables, aggregated across all workspaces of the metastore. Nothing has to be enabled. In the graph, one level is shown by default; expand nodes with the plus icon, click an edge to see the notebooks, jobs and queries behind it, click a column to see column lineage.

To view lineage you need at least `BROWSE` on the parent catalog; neighbors you can't access appear as masked nodes. Lineage in Catalog Explorer is kept indefinitely (captured since September 1, 2024); the lineage system tables keep 395 days.

Lineage is not captured or preserved for renamed objects, RDDs, global temp views, or path-based references (column lineage). UDFs give table-level lineage only.

> **Exam trap.** Renaming a table, schema, catalog or column (`ALTER TABLE ... RENAME TO`) doesn't carry its lineage over: plan names before production, because lineage isn't preserved through renames.

<!-- section: audit-logging | objectives: 2.2.6 -->
## Audit logging

Two ways to get audit events (both need the **Premium** plan):

| Option | Content | Setup |
| --- | --- | --- |
| System table `system.access.audit` (recommended) | All services, including account-level events (`workspace_id` = 0); kept 395 days; regional | Grant `USE CATALOG` on `system`, `USE SCHEMA` and `SELECT` on `system.access` |
| Azure diagnostic settings | Workspace services only, no account-level events | Azure portal: workspace, **Diagnostic settings**, **Turn on diagnostics**; destination Log Analytics, storage account or event hub |

Configuring diagnostic settings requires Owner, Contributor or a custom role with `Microsoft.Databricks/workspaces/assignWorkspaceAdmin/action`. Logs usually appear within 15 minutes (no guarantee). If the portal reports that the subscription isn't registered to use `microsoft.insights`, register that resource provider.

```text
SELECT event_time, user_identity.email, action_name, request_params
FROM system.access.audit
WHERE service_name = 'unityCatalog' AND event_date >= current_date() - 7
ORDER BY event_time DESC;
```

**Verbose audit logs** add the text of every notebook command and Databricks SQL query (`runCommand`, `commandSubmit`, `commandFinish`). They are off by default; a workspace admin turns on **Verbose Audit Logs** in the **Advanced** tab of the workspace admin settings.

> **Exam trap.** A requirement to log "the SQL text run by each user" needs verbose audit logs; standard audit logs record the action, not the command text.

<!-- section: delta-sharing | objectives: 2.2.7 -->
## A secure strategy for Delta Sharing

Delta Sharing (documented on Microsoft Learn under the name **OpenSharing**) shares read-only data without copying it. Objects: a **share** (collection of assets), a **recipient** (who receives), a **provider** (who shares). All three are Unity Catalog securables.

| Recipient | Protocol | Authentication | Shareable |
| --- | --- | --- | --- |
| Databricks workspace with Unity Catalog, any cloud or account | Databricks-to-Databricks | Sharing identifier of the recipient metastore, no token | Tables, views, materialized views, streaming tables, volumes, notebooks, models |
| Any tool outside Databricks (Spark, pandas, Power BI) | Databricks-to-Open | Bearer token (activation link) or OIDC federation | Tabular data only |

Within the same metastore, don't share: grant privileges in Unity Catalog.

```text
CREATE SHARE fabrikam_sales COMMENT 'Monthly sales for Fabrikam';

ALTER SHARE fabrikam_sales ADD TABLE sales.gold.orders
  PARTITION (country = 'FR') AS fabrikam.orders WITHOUT HISTORY;

CREATE RECIPIENT fabrikam USING ID 'azure:westeurope:<metastore-uuid>';
CREATE RECIPIENT tailspin;  -- open sharing: TOKEN authentication

GRANT SELECT ON SHARE fabrikam_sales TO RECIPIENT fabrikam;
REVOKE SELECT ON SHARE fabrikam_sales FROM RECIPIENT fabrikam;
```

Security levers:

- **Least data**: share a partition (`PARTITION (...)`), a view, or a dynamic view filtered with `CURRENT_RECIPIENT('country')` on recipient properties, instead of the full table. `AS` hides the real table name.
- **History**: `WITH HISTORY` (default from Databricks Runtime 16.2) enables time travel and streaming reads by the recipient; `WITHOUT HISTORY` limits the recipient to the current version. Querying the change data feed requires CDF enabled on the table before sharing it with history.
- **Tokens** (open sharing): the activation link lets the recipient download the credential file **once**. Tokens last at most one year; the metastore default lifetime applies to new tokens, and existing recipients get a new lifetime only when their token is rotated (`databricks recipients rotate-token`, `0` seconds expires the old token immediately). Prefer OIDC federation (short-lived tokens) when the recipient's identity provider supports it. Restrict a token recipient to known IP addresses with an IP access list.
- **Governed tables**: a table under ABAC policies can be shared only if the share owner is in the policy's `EXCEPT`; recipients then see the shared data unfiltered. Tables with table-level row filters or masks can't be shared at all.
- **Privileges**: `CREATE SHARE` and `CREATE RECIPIENT` on the metastore; share owner with `SELECT` on each table (keep it, or recipients lose access); granting a share to a recipient requires metastore admin, or share ownership (or `USE SHARE` + `SET SHARE PERMISSION`) and recipient ownership (or `USE RECIPIENT`). Make a group the share owner.

> **Exam tip.** Microsoft Learn states that all Databricks-to-Open recipient tokens issued before December 8, 2025 with an expiration after December 8, 2026, or without expiration, expire automatically on December 8, 2026: rotate them before then.

<!-- section: key-points -->
## Key points

- Column descriptions on an existing table: `ALTER TABLE ... ALTER COLUMN ... COMMENT`; AI-generated comments must be accepted.
- ABAC = governed tags + `CREATE POLICY` at catalog or schema level; needs `MANAGE` and `EXECUTE`, serverless or Databricks Runtime 16.4+; owners can't override it.
- Table-level filters and masks: `SET ROW FILTER ... ON (...)`, `ALTER COLUMN ... SET MASK`; not on views, no time travel or clone.
- Retention: 7 days for files, 30 days for the log; `VACUUM` ends time travel; auto time-to-live deletes rows by age.
- Lineage is automatic, column level, needs `BROWSE`; renames break it.
- Audit: `system.access.audit` first, diagnostic settings for Azure Monitor; verbose audit logs for command text.
- Delta Sharing: Databricks-to-Databricks needs no token; open sharing uses one-time activation links, rotation, IP access lists; share partitions or views, not whole tables.
