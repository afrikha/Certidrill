Compliance features answer four questions about sensitive data: where is it (data classification), who touched it (auditing, change tracking, change data capture), who may see it (dynamic data masking, row-level security) and can we prove it wasn't altered (ledger). The exam gives a requirement and expects the feature that meets it, often against close distractors.

| Requirement | Feature |
| --- | --- |
| Label columns that contain personal data and report on them | Data Discovery & Classification |
| Record who ran which queries and logins, for an auditor | Auditing |
| An application must know which rows changed since its last sync | Change tracking |
| Keep every changed value (before and after) for ETL | Change data capture (CDC) |
| Support agents see only the last four digits of a card number | Dynamic data masking |
| Each sales rep reads only the rows of their region | Row-level security |
| Prove to an auditor that nobody, even a DBA, modified historical rows | Ledger |

<!-- section: data-classification | objectives: 2.3.1 -->
## Data classification

**Data Discovery & Classification** is built into Azure SQL Database and SQL Managed Instance (portal: database > Security > **Data Discovery & Classification**). It scans columns, **recommends** classifications, stores the accepted ones as metadata on the columns, and shows a dashboard that can be exported to Excel.

Each classification has:

| Attribute | Meaning | Example |
| --- | --- | --- |
| Label | Sensitivity level, the main attribute | Public, General, Confidential, Confidential - GDPR, Highly Confidential |
| Information type | What the data is | Contact Info, Name, National ID, Credit Card, Financial, Health |
| Rank | Order of sensitivity | NONE, LOW, MEDIUM, HIGH, CRITICAL |

Two policy modes apply to **all databases of the tenant**:

| Mode | Labels | Automatic recommendations |
| --- | --- | --- |
| SQL Information Protection policy | Built-in labels and information types, customizable centrally in Microsoft Defender for Cloud | Yes |
| Microsoft Purview Information Protection policy | Microsoft 365 sensitivity labels from the Microsoft Purview portal; information type shows `[n/a]` | No |

Switching between the two modes needs tenant-wide Security Admin permission. Label-based access control through Microsoft Purview Information Protection access policies is retired: existing access policies on sensitive columns are no longer enforced.

```text
ADD SENSITIVITY CLASSIFICATION TO Sales.Customer.Email, Sales.Customer.Phone
WITH (LABEL = 'Confidential', INFORMATION_TYPE = 'Contact Info', RANK = MEDIUM);

SELECT * FROM sys.sensitivity_classifications;

DROP SENSITIVITY CLASSIFICATION FROM Sales.Customer.Phone;
```

T-SQL doesn't validate that a label exists in the policy. For SQL Server, classify with T-SQL or SSMS (database > Tasks > **Data Discovery and Classification**). Owner, Contributor and **SQL Security Manager** can change classifications; Reader and User Access Administrator can only view them.

The value of classification comes with auditing: the audit log fills the **`data_sensitivity_information`** field with the labels of the columns a query returned, so you can report who accessed confidential data.

> **Exam trap.** Classification only labels and reports. It doesn't mask, encrypt or block anything: pair it with dynamic data masking, Always Encrypted or row-level security for protection.

<!-- section: auditing | objectives: 2.3.2 -->
## Server and database audits

**Azure SQL Database auditing** tracks database events and writes them to one or more destinations:

| Destination | Choose it when |
| --- | --- |
| Azure Storage account (`.xel` files, append blobs) | Long-term retention, immutable storage for compliance, reading with `sys.fn_get_audit_file` or SSMS |
| Log Analytics workspace | Querying with KQL, dashboards, alerts, Microsoft Sentinel |
| Event Hubs | Streaming to a third-party SIEM |

| Policy | Effect |
| --- | --- |
| Server-level auditing | Applies to **every database** of the logical server, existing and new |
| Database-level auditing | Applies to one database, in addition to the server policy, never instead of it |

Enable server-level auditing for the general case; add database-level auditing only when one database needs other action groups or another destination. The default action groups are `BATCH_COMPLETED_GROUP`, `SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP` and `FAILED_DATABASE_AUTHENTICATION_GROUP`. A separate server option audits **Microsoft support operations** on your server.

Since July 2025, server-level auditing runs one extended event session for all the databases of the server, and every server audit log, read-only replicas included, goes to a single `master` folder (filter replica events on `is_secondary_replica_true`). Reading the logs needs `VIEW DATABASE SECURITY AUDIT` in the user database. Database-level auditing is unchanged and writes each database to its own folder: Learn recommends it for many databases with heavy OLTP workloads.

```powershell
Set-AzSqlServerAudit -ResourceGroupName RG1 -ServerName sql-contoso `
  -LogAnalyticsTargetState Enabled `
  -WorkspaceResourceId "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.OperationalInsights/workspaces/law-contoso"
```

```text
SELECT event_time, server_principal_name, statement, data_sensitivity_information
FROM sys.fn_get_audit_file(
  'https://stcontosoaudit.blob.core.windows.net/sqldbauditlogs/sql-contoso/master/', DEFAULT, DEFAULT);
```

Storage notes: a storage account behind a firewall or virtual network must be general-purpose v2, and the server can authenticate with its managed identity. For immutable storage, **Allow protected append writes** must be *Append blobs* or *Block and append blobs* (*None* isn't supported); with a time-based retention policy, the storage retention interval must be shorter than the auditing retention, and an auditing retention of 0 isn't supported. Failed Microsoft Entra sign-ins don't appear in the SQL audit log (look in Microsoft Entra sign-in logs), and `tempdb` isn't audited.

**SQL Server and SQL Managed Instance** use SQL Server Audit objects:

| Object | Level | Captures |
| --- | --- | --- |
| Server audit | Instance | The target: file, Windows Application or Security log (SQL Server); **URL** (Azure Blob Storage) or **EXTERNAL_MONITOR** (Log Analytics or Event Hubs through diagnostic settings) on Managed Instance |
| Server audit specification | Instance | Server action groups, such as `FAILED_LOGIN_GROUP` |
| Database audit specification | Database | Database actions, such as `SELECT` on a schema by a principal |

```text
-- SQL Managed Instance, run in master
CREATE SERVER AUDIT MiAudit
TO URL (PATH = 'https://stcontosoaudit.blob.core.windows.net/miaudit', RETENTION_DAYS = 90);
ALTER SERVER AUDIT MiAudit WITH (STATE = ON);

CREATE SERVER AUDIT SPECIFICATION MiLogins FOR SERVER AUDIT MiAudit
ADD (FAILED_LOGIN_GROUP), ADD (SUCCESSFUL_LOGIN_GROUP) WITH (STATE = ON);

-- In the user database
CREATE DATABASE AUDIT SPECIFICATION HrReads FOR SERVER AUDIT MiAudit
ADD (SELECT ON SCHEMA::HR BY public) WITH (STATE = ON);
```

On Managed Instance the URL target needs a credential (SAS or managed identity) whose name is the container URL.

<!-- section: change-tracking | objectives: 2.3.3 -->
## Change tracking and change data capture

| | Change tracking | Change data capture (CDC) |
| --- | --- | --- |
| Records | That a row changed (key, operation, version), optionally which columns | Every change with the **column values** before and after |
| Mechanism | Synchronous, as part of the transaction | Asynchronous, reads the transaction log |
| Typical use | Two-way sync of mobile or cache clients | ETL, data warehouse loads, event streaming |
| Requirement | Primary key on the table | `db_owner` to enable; on DTU, S3 or higher in Azure SQL Database |
| Default retention | 2 days | 3 days |
| Jobs | None | SQL Server Agent (SQL Server, Managed Instance); a built-in **CDC scheduler** in Azure SQL Database |

```text
-- Change tracking
ALTER DATABASE Sales SET CHANGE_TRACKING = ON
  (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
ALTER TABLE Sales.Orders ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
SELECT * FROM CHANGETABLE(CHANGES Sales.Orders, 125) AS ct;   -- since version 125
SELECT CHANGE_TRACKING_CURRENT_VERSION();

-- Change data capture
EXEC sys.sp_cdc_enable_db;
EXEC sys.sp_cdc_enable_table @source_schema = N'Sales', @source_name = N'Orders',
  @role_name = NULL, @supports_net_changes = 1;
```

CDC facts for Azure SQL Database: supported on every vCore tier and on DTU S3 and higher (not Basic, S0, S1, S2); the scheduler runs capture every 20 seconds and cleanup every hour, not customizable; a paused serverless database doesn't capture. `@supports_net_changes = 1` needs a primary key or unique index. Check with `sys.databases.is_cdc_enabled` and `sys.tables.is_tracked_by_cdc`. `sp_cdc_change_job` can still change `maxtrans` and `maxscans`. While CDC is enabled, online index operations aren't supported (error 18773) and ADR aggressive log truncation is disabled, so log use grows; there is no SLA and no sub-second latency for changes to appear.

**Temporal tables** (`SYSTEM_VERSIONING = ON`) are the other way to keep row history: they store every previous version with its validity period and answer `FOR SYSTEM_TIME AS OF` queries.

> **Exam trap.** "Which rows changed, with minimal overhead, no history of values" is change tracking. "The previous and new value of every column" is CDC. "Query the table as it was on March 1" is a temporal table.

<!-- section: dynamic-data-masking | objectives: 2.3.4 -->
## Dynamic data masking

Dynamic data masking (DDM) hides values **in query results** for users without the `UNMASK` permission. The stored data doesn't change.

| Function | Result | T-SQL |
| --- | --- | --- |
| Default | `xxxx` for strings, 0 for numbers, 1900-01-01 for dates | `default()` |
| Email | `aXXX@XXXX.com` | `email()` |
| Random | Random number in a range | `random(1, 100)` |
| Custom string | Prefix, padding, suffix | `partial(0, "XXXX-XXXX-XXXX-", 4)` |
| Datetime | Masks one part of a date (`Y`, `M`, `D`, `h`, `m`, `s`) | `datetime("Y")` |
| Credit card (portal) | `XXXX-XXXX-XXXX-1234` | Portal mask; in T-SQL use `partial` |

```text
ALTER TABLE Sales.Customer ALTER COLUMN Email
  ADD MASKED WITH (FUNCTION = 'email()');
ALTER TABLE Sales.Customer ALTER COLUMN CardNumber
  ADD MASKED WITH (FUNCTION = 'partial(0, "XXXX-XXXX-XXXX-", 4)');

GRANT UNMASK ON Sales.Customer (Email) TO SupportLead;   -- column
GRANT UNMASK ON SCHEMA::Sales TO Finance;                -- schema
GRANT UNMASK TO Auditors;                                -- database

ALTER TABLE Sales.Customer ALTER COLUMN Email DROP MASKED;
SELECT * FROM sys.masked_columns;
```

Who sees real values: the server admin, the Microsoft Entra admin, `db_owner` members (and `sysadmin` in SQL Server), users excluded from masking in the portal policy, and principals granted `UNMASK` at the database, schema, table or column level. In Azure SQL Database, configure it in the portal (database > Security > **Dynamic Data Masking**, with recommendations); on Managed Instance use T-SQL.

> **Exam trap.** DDM isn't encryption and doesn't stop a determined user: someone who can run ad hoc queries can infer values with `WHERE Salary > 100000`. It suits limiting exposure in applications and reports; against DBAs use Always Encrypted.

<!-- section: ledger | objectives: 2.3.5 -->
## Ledger

The **ledger** feature makes data **tamper-evident**: each transaction on a ledger table is hashed (SHA-256) into blocks chained together, and the **database digest** (the hash of the latest block) is stored outside the database. Verifying later recomputes the hashes and reports any tampering, even by a DBA or someone with access to the files. Ledger is available in Azure SQL Database, SQL Managed Instance and SQL Server 2022 and later.

| Type | Operations | History | Use |
| --- | --- | --- | --- |
| Updatable ledger table | Insert, update, delete | History table created automatically, plus a ledger view | System of record (balances, inventory) |
| Append-only ledger table | **Insert only**: updates and deletes are blocked | None needed | Logs, security events, receipts |
| Ledger database | Every table is a ledger table (updatable by default) | | Set **at creation**, can't be turned off |

```text
CREATE TABLE Finance.Account (
  AccountID int NOT NULL PRIMARY KEY,
  Balance decimal(18, 2) NOT NULL
) WITH (SYSTEM_VERSIONING = ON, LEDGER = ON);

CREATE TABLE Security.AccessLog (
  EventTime datetime2 NOT NULL,
  UserName sysname NOT NULL,
  Action nvarchar(200) NOT NULL
) WITH (LEDGER = ON (APPEND_ONLY = ON));

EXECUTE sp_generate_database_ledger_digest;   -- manual digest

DECLARE @locations nvarchar(max) =
  (SELECT * FROM sys.database_ledger_digest_locations FOR JSON AUTO, INCLUDE_NULL_VALUES);
EXECUTE sys.sp_verify_database_ledger_from_digest_storage @locations;   -- verify
```

Digest management:

- **Automatic digest storage**: digests are generated every 30 seconds (when there were transactions) and uploaded to **Azure Blob Storage with an immutability policy** (locked, allowing protected append writes) or to **Azure Confidential Ledger**. The server or instance identity needs Storage Blob Data Contributor on the storage account, or Contributor on the Azure Confidential Ledger.
- **Manual**: `sp_generate_database_ledger_digest` returns a JSON digest that you store in trusted (WORM) storage; it needs the `GENERATE LEDGER DIGEST` permission.
- **Verification** with `sys.sp_verify_database_ledger` needs the `VIEW LEDGER CONTENT` permission.

In Azure SQL Database, the portal's **Security** tab of database creation can make it a ledger database and configure automatic digest storage.

> **Exam trap.** Ledger blocks changes to append-only tables, history tables and ledger views through SQL, but someone who controls the database files can still tamper with the data: ledger then detects it at verification, it can't prevent it. It doesn't hide data either. An existing regular table can't be switched to a ledger table: create a new ledger table and copy the data. "Rows must never be updated or deleted" is an append-only ledger table.

<!-- section: row-level-security | objectives: 2.3.6 -->
## Row-level security

Row-level security (RLS) restricts **which rows** a user can read or write, through a **security policy** that applies an inline table-valued **predicate function** to a table. It works in SQL Server, Azure SQL Database and SQL Managed Instance, and no application change is needed.

| Predicate | Effect |
| --- | --- |
| Filter predicate | Silently removes rows from `SELECT`, `UPDATE` and `DELETE`: the user doesn't know they exist |
| Block predicate | Raises an error on writes that violate the predicate: `AFTER INSERT`, `AFTER UPDATE`, `BEFORE UPDATE`, `BEFORE DELETE` |

```text
CREATE SCHEMA Security;
GO
CREATE FUNCTION Security.fn_RegionPredicate(@Region nvarchar(20))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS allowed
WHERE @Region = CAST(SESSION_CONTEXT(N'Region') AS nvarchar(20))
   OR IS_MEMBER('SalesManagers') = 1;
GO
CREATE SECURITY POLICY Security.RegionPolicy
ADD FILTER PREDICATE Security.fn_RegionPredicate(Region) ON Sales.Orders,
ADD BLOCK PREDICATE Security.fn_RegionPredicate(Region) ON Sales.Orders AFTER INSERT
WITH (STATE = ON);
```

Design rules:

- The function must be an **inline** table-valued function, created `WITH SCHEMABINDING` (the policy default), ideally in a separate schema that application users can't change.
- Identify the user with `USER_NAME()`, `IS_MEMBER()` or, for middle-tier applications sharing one connection, **`SESSION_CONTEXT`** set by `sp_set_session_context`.
- RLS applies to every user, including `db_owner`, unless the predicate exempts them.
- Turn the policy off with `ALTER SECURITY POLICY Security.RegionPolicy WITH (STATE = OFF)`.
- Index the columns used by the predicate: it runs for every row read.

> **Exam trap.** RLS filters rows; it doesn't hide columns. "Users must not see the salary column" is a column permission or masking. "Users see only their own customers" is RLS with a filter predicate; "users can't insert rows for another region" needs a block predicate as well.

<!-- section: key-points -->
## Key points

- Classification labels columns (label, information type, rank); auditing reports access to them through `data_sensitivity_information`.
- Azure SQL auditing: storage, Log Analytics or Event Hubs; the server policy covers all databases, a database policy only adds to it.
- Managed Instance and SQL Server: server audit, server audit specification, database audit specification; Managed Instance writes to URL or EXTERNAL_MONITOR.
- Change tracking: which rows changed, synchronous, primary key. CDC: before and after values from the log, scheduler in Azure SQL Database, S3 or higher on DTU.
- DDM masks results for users without UNMASK; administrators and `db_owner` always see real data.
- Ledger: tamper-evidence, updatable or append-only tables, digests in immutable storage or Azure Confidential Ledger.
- RLS: inline predicate function plus security policy; filter predicates hide rows, block predicates reject writes.
