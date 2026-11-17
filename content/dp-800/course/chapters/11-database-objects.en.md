A DP-800 database design starts with tables: data types and sizes, indexes that fit the workload, and constraints that keep data valid. Then come specialized tables (memory-optimized, temporal, ledger, external, graph), JSON storage, sequences and partitioning. Questions show a `CREATE TABLE` to complete, a requirement to map to a table type or a platform limit to respect. T-SQL is shown in plain-text blocks.

<!-- section: tables-data-types | objectives: 1.1.1 -->
## Tables, data types and sizes

Choose the smallest type that holds every valid value: smaller rows mean more rows per 8 KB page, fewer reads and smaller indexes.

| Requirement | Type | Notes |
| --- | --- | --- |
| Whole numbers | `tinyint` (0 to 255), `smallint`, `int`, `bigint` | 1, 2, 4, 8 bytes |
| Money, exact decimals | `decimal(p, s)` | `float` and `real` are approximate |
| Date and time | `date`, `datetime2(n)`, `datetimeoffset(n)` | `datetime2` is more precise than `datetime`; `datetimeoffset` keeps the offset |
| Text in several scripts | `nvarchar(n)` | Up to 4,000 characters, or `nvarchar(max)` up to 2 GB |
| Text in one code page | `varchar(n)` | Up to 8,000 bytes; with a `_UTF8` collation it stores Unicode too |
| Globally unique key | `uniqueidentifier` | `NEWID()` fragments a clustered index; `NEWSEQUENTIALID()` (in a `DEFAULT` only) doesn't |
| JSON document | `json` | See [JSON columns and indexes](#json-columns) |

An in-row record is limited to **8,060 bytes**; `max` values move off-row when they don't fit. A table has up to 1,024 columns. Useful column options: `NOT NULL`, `IDENTITY(seed, increment)`, computed columns (`PERSISTED` stores the value, and a deterministic computed column can be indexed) and `SPARSE` for mostly-NULL columns.

A table has at most one **clustered index** (the table itself, sorted by its key) and up to 999 **nonclustered indexes**. Key size limits: 900 bytes for a clustered key, 1,700 bytes for a nonclustered key, 32 columns.

```text
CREATE TABLE Sales.OrderLine
(
    OrderLineID bigint IDENTITY(1, 1) NOT NULL,
    OrderID     int           NOT NULL,
    ProductID   int           NOT NULL,
    Quantity    smallint      NOT NULL,
    UnitPrice   decimal(10, 2) NOT NULL,
    Status      tinyint       NOT NULL,
    LineTotal   AS (Quantity * UnitPrice) PERSISTED,
    CONSTRAINT PK_OrderLine PRIMARY KEY CLUSTERED (OrderLineID)
);

-- Covering index: seek on ProductID, no lookup for Quantity and UnitPrice
CREATE NONCLUSTERED INDEX IX_OrderLine_Product
    ON Sales.OrderLine (ProductID)
    INCLUDE (Quantity, UnitPrice);

-- Filtered index: only the few open lines
CREATE NONCLUSTERED INDEX IX_OrderLine_Open
    ON Sales.OrderLine (OrderID)
    WHERE Status = 1;
```

The clustered key should be narrow, unique and ever-increasing; nonclustered indexes serve other lookups; `INCLUDE` avoids key lookups; a filtered index covers a small, well-defined subset.

> **Exam trap.** Included columns don't help a seek or a sort: only key columns do. Put filtered and sorted columns in the key and returned columns in `INCLUDE`.

<!-- section: columnstore | objectives: 1.1.1 -->
## Columnstore indexes

A columnstore index stores each column separately, compressed, in **rowgroups** of up to 1,048,576 rows. Scans and aggregates read only the needed columns and run in batch mode.

| Type | Use |
| --- | --- |
| Clustered columnstore (CCI) | The table itself is columnar: facts, logs, history. One per table; rowstore nonclustered indexes can be added for lookups |
| Nonclustered columnstore (NCCI) | Real-time analytics on an OLTP rowstore table; can be filtered |
| Ordered CCI (`ORDER (col)`) | Sorted segments, so range filters skip rowgroups |

```text
CREATE CLUSTERED COLUMNSTORE INDEX CCI_SalesHistory
    ON Sales.SalesHistory
    ORDER (SaleDate);

CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_OrderLine
    ON Sales.OrderLine (ProductID, Quantity, UnitPrice);
```

A bulk load of at least 102,400 rows goes straight to compressed rowgroups; smaller inserts land in a rowstore **delta store** that the tuple mover compresses at 1,048,576 rows. Deletes only mark rows; an update is a delete plus an insert. `ALTER INDEX ... REORGANIZE` merges small rowgroups and purges deleted rows (`COMPRESS_ALL_ROW_GROUPS = ON` also closes delta stores). In Azure SQL Database, columnstore isn't available in Basic or in Standard below S3.

> **Exam trap.** Columnstore answers "aggregate large volumes", not "return one row by key". For singleton lookups on a CCI table, add a nonclustered rowstore index.

<!-- section: memory-optimized-temporal | objectives: 1.1.2 -->
## Memory-optimized and temporal tables

**Memory-optimized tables** (In-Memory OLTP) live in memory with lock-free, latch-free access: high-rate inserts, session state, staging, hot-table contention.

```text
CREATE TABLE dbo.ShoppingCart
(
    CartID    int IDENTITY(1, 1) NOT NULL PRIMARY KEY NONCLUSTERED,
    UserID    int NOT NULL,
    CreatedAt datetime2 NOT NULL,
    INDEX IX_User HASH (UserID) WITH (BUCKET_COUNT = 1000000)
)
WITH (MEMORY_OPTIMIZED = ON, DURABILITY = SCHEMA_AND_DATA);
```

| Option | Behavior |
| --- | --- |
| `SCHEMA_AND_DATA` (default) | Logged, survives a restart; primary key required |
| `SCHEMA_ONLY` | Only the definition survives a restart: no log I/O, for staging and transient data |
| Hash index | Equality lookups; `BUCKET_COUNT` one to two times the distinct keys |
| Nonclustered index | Ranges and ordered scans |
| Natively compiled procedure | `WITH NATIVE_COMPILATION, SCHEMABINDING` and `BEGIN ATOMIC`; accesses only memory-optimized tables |

SQL Server needs a filegroup `CONTAINS MEMORY_OPTIMIZED_DATA`. In Azure SQL Database, In-Memory OLTP exists in **Premium** and **Business Critical**, Hyperscale supports a subset, and General Purpose, Standard and Basic don't support it.

**System-versioned temporal tables** keep every previous row version in a history table managed by the engine.

```text
CREATE TABLE HR.Employee
(
    EmployeeID   int NOT NULL PRIMARY KEY CLUSTERED,
    FullName     nvarchar(100) NOT NULL,
    AnnualSalary decimal(10, 2) NOT NULL,
    ValidFrom    datetime2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    ValidTo      datetime2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = HR.EmployeeHistory,
                              HISTORY_RETENTION_PERIOD = 6 MONTHS));

SELECT EmployeeID, FullName, AnnualSalary
FROM HR.Employee FOR SYSTEM_TIME AS OF '2026-01-01T00:00:00'
WHERE EmployeeID = 1000;
```

| Subclause | Rows returned |
| --- | --- |
| `AS OF t` | Versions valid at `t` |
| `FROM a TO b` | Versions active in the interval, excluding one that started exactly at `b` |
| `BETWEEN a AND b` | Same, including one that started exactly at `b` |
| `CONTAINED IN (a, b)` | Versions opened and closed inside the interval |
| `ALL` | Current and history rows |

Rules: the current table needs a primary key (the history table can't have one); period columns are `datetime2` in **UTC**; `HIDDEN` keeps them out of `SELECT *`; `INSERT` and `UPDATE` can't set them; the history table can't be modified directly; no `TRUNCATE TABLE` while versioning is on; no `INSTEAD OF` triggers.

> **Exam trap.** "Query the data as it was last Monday" or "recover an overwritten row" is temporal. "Prove that nobody, not even an administrator, tampered with the data" is ledger: a temporal history can be rewritten after turning versioning off.

<!-- section: ledger-external-graph | objectives: 1.1.2 -->
## Ledger, external and graph tables

**Ledger tables** (SQL Server 2022 and later, Azure SQL Database, Azure SQL Managed Instance) make changes **tamper-evident**: transactions are hashed (SHA-256) into a blockchain-like chain whose digests are stored outside the database.

```text
-- Updatable ledger table: keeps a history table and a ledger view
CREATE TABLE Account.Balance
(
    CustomerID int NOT NULL PRIMARY KEY CLUSTERED,
    Balance    decimal(10, 2) NOT NULL
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = Account.BalanceHistory),
      LEDGER = ON);

-- Append-only ledger table: INSERT only, no history table
CREATE TABLE Security.SignInEvent
(
    EventID   bigint NOT NULL,
    EventTime datetime2 NOT NULL,
    Detail    nvarchar(400) NULL
)
WITH (LEDGER = ON (APPEND_ONLY = ON));
```

| Fact | Detail |
| --- | --- |
| Updatable vs append-only | Updatable allows `UPDATE`/`DELETE` and adds four generated columns; append-only blocks them and adds two |
| Ledger view | `Account.Balance_Ledger` lists every operation; join `sys.database_ledger_transactions` for user and commit time |
| Conversion | An existing table can't become ledger, and a ledger table can't be reverted: create a new table and migrate |
| Ledger database | Every table is a ledger table; can't be converted back |
| Digests | Automatic storage in immutable Azure Blob Storage (not LRS) or Azure Confidential Ledger |
| Verification | `sys.sp_verify_database_ledger_from_digest_storage` or `sys.sp_verify_database_ledger` |
| Not supported | `TRUNCATE TABLE`, in-memory and graph tables, partition `SWITCH`, `xml`, `sql_variant`, `vector` |

**External tables** query files in place. In Azure SQL Database (data virtualization, labeled preview on Learn) access is read-only, for Parquet and CSV files:

```text
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<strong password>';

CREATE DATABASE SCOPED CREDENTIAL LakeCredential
WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = '<SAS token without ?>';

CREATE EXTERNAL DATA SOURCE SalesLake
WITH (LOCATION = 'abs://sales@contosolake.blob.core.windows.net/',
      CREDENTIAL = LakeCredential);

CREATE EXTERNAL FILE FORMAT ParquetFormat WITH (FORMAT_TYPE = PARQUET);

CREATE EXTERNAL TABLE dbo.SalesArchive
(
    OrderID   int,
    OrderDate datetime2,
    Amount    decimal(10, 2)
)
WITH (LOCATION = 'archive/year=*/*.parquet',
      DATA_SOURCE = SalesLake,
      FILE_FORMAT = ParquetFormat);
```

Use the prefixes `abs://` (Blob Storage) or `adls://` (Data Lake Storage Gen2); the credential can also be a managed identity. `OPENROWSET(BULK ...)` serves ad hoc exploration. In Azure SQL Database, CETAS (`CREATE EXTERNAL TABLE AS SELECT`) isn't available, external tables have no statistics, and Row-Level Security and Dynamic Data Masking can't apply to them.

**Graph tables** model relationships that are traversed (social links, bills of materials, recommendations): `AS NODE` adds `$node_id`; `AS EDGE` adds `$edge_id`, `$from_id`, `$to_id`.

```text
CREATE TABLE Graph.Person (PersonID int PRIMARY KEY, FullName nvarchar(100)) AS NODE;
CREATE TABLE Graph.Product (ProductID int PRIMARY KEY, ProductName nvarchar(100)) AS NODE;

CREATE TABLE Graph.Bought
(
    PurchaseCount int,
    CONSTRAINT EC_Bought CONNECTION (Graph.Person TO Graph.Product) ON DELETE CASCADE
)
AS EDGE;

CREATE INDEX IX_Bought_FromTo ON Graph.Bought ($from_id, $to_id);
```

An edge constraint limits which node tables an edge connects (pairs inside one constraint combine with OR); `ON DELETE CASCADE` deletes the edges of a deleted node, `NO ACTION` makes that delete fail. It creates no index: add one on `($from_id, $to_id)`. `$from_id` and `$to_id` can't be updated. Node and edge tables can't be temporal, memory-optimized or temporary.

<!-- section: json-columns | objectives: 1.1.3 -->
## JSON columns and indexes

The native **`json`** type (SQL Server 2025, Azure SQL Database, SQL database in Microsoft Fabric, and Azure SQL Managed Instance with the SQL Server 2025 or Always-up-to-date update policy) stores documents in a parsed binary format, up to 2 GB. Before it, JSON was stored in `nvarchar(max)` and validated with `ISJSON`.

```text
CREATE TABLE Sales.CustomerProfile
(
    CustomerID int NOT NULL PRIMARY KEY CLUSTERED,
    Profile    json NOT NULL
        CHECK (JSON_PATH_EXISTS(Profile, '$.email') = 1)
);

-- In-place partial update of a json column
UPDATE Sales.CustomerProfile
SET Profile.modify('$.tier', 'gold')
WHERE CustomerID = 42;

-- JSON index on two paths
CREATE JSON INDEX JX_CustomerProfile
    ON Sales.CustomerProfile (Profile)
    FOR ('$.tier', '$.address');
```

| Fact | Value |
| --- | --- |
| Valid content | An object or an array; a scalar such as `'true'` is rejected |
| Regular index | A `json` column can't be a key column, only an included column |
| JSON index prerequisites | A clustered key (up to 31 columns, under 128 bytes); one JSON index per `json` column |
| Paths | `FOR (...)`, default `$`; overlapping paths (`$.a` and `$.a.b`) fail |
| Build | Offline only, single-threaded; not on memory-optimized tables, computed columns or views |
| Predicates served | `JSON_VALUE(...) = value`, `JSON_PATH_EXISTS(...) = 1`, `JSON_CONTAINS`; not `LIKE` or `IS NULL` |
| Arrays | `WITH (OPTIMIZE_FOR_ARRAY_SEARCH = ON)` |

On every platform, one property can be indexed through a computed column:

```text
ALTER TABLE Sales.Orders
    ADD CustomerEmail AS JSON_VALUE(OrderDoc, '$.customer.email');

CREATE NONCLUSTERED INDEX IX_Orders_CustomerEmail
    ON Sales.Orders (CustomerEmail);
```

> **Exam trap.** A JSON index is `CREATE JSON INDEX`, only on a `json` column. For JSON stored in `nvarchar(max)`, index a `JSON_VALUE` computed column.

<!-- section: constraints | objectives: 1.1.4 -->
## Constraints

| Constraint | Enforces | Details to know |
| --- | --- | --- |
| `PRIMARY KEY` | Unique, non-NULL identifier | One per table; clustered by default if no clustered index exists |
| `UNIQUE` | No duplicates | Unique index; allows one NULL |
| `FOREIGN KEY` | Value exists in the parent key | References a `PRIMARY KEY` or `UNIQUE` column; creates no index |
| `CHECK` | A Boolean condition | Rejects FALSE; a NULL result passes |
| `DEFAULT` | Value when none is supplied | Applies when the column is omitted or `DEFAULT` is written, not on an explicit NULL |

```text
CREATE TABLE Sales.Orders
(
    OrderID    int NOT NULL CONSTRAINT PK_Orders PRIMARY KEY,
    OrderRef   varchar(20) NOT NULL CONSTRAINT UQ_Orders_Ref UNIQUE,
    CustomerID int NOT NULL,
    OrderDate  date NOT NULL CONSTRAINT DF_Orders_Date DEFAULT (CAST(SYSUTCDATETIME() AS date)),
    ShipDate   date NULL,
    Amount     decimal(10, 2) NOT NULL CONSTRAINT CK_Orders_Amount CHECK (Amount >= 0),
    CONSTRAINT FK_Orders_Customer FOREIGN KEY (CustomerID)
        REFERENCES Sales.Customer (CustomerID)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT CK_Orders_Dates CHECK (ShipDate IS NULL OR ShipDate >= OrderDate)
);
```

Referential actions: `NO ACTION` (default, the change fails), `CASCADE`, `SET NULL`, `SET DEFAULT`. A rule on several columns is a table-level `CHECK`. A constraint added `WITH NOCHECK` skips existing rows and stays **untrusted** (`is_not_trusted = 1`), so the optimizer ignores it; `ALTER TABLE ... WITH CHECK CHECK CONSTRAINT ...` makes it trusted again.

> **Exam trap.** `CHECK (Amount >= 0)` accepts a NULL amount. A mandatory value also needs `NOT NULL`.

<!-- section: sequences | objectives: 1.1.5 -->
## Sequences

A **sequence** generates numbers independently of any table: one counter shared by several tables, a number needed before the insert, or a reserved range.

```text
CREATE SEQUENCE Sales.OrderNumber
    AS int
    START WITH 100000
    INCREMENT BY 1
    MINVALUE 100000
    NO MAXVALUE
    CACHE 50;

CREATE TABLE Sales.WebOrder
(
    OrderNo int NOT NULL
        CONSTRAINT DF_WebOrder_No DEFAULT (NEXT VALUE FOR Sales.OrderNumber),
    Amount  decimal(10, 2) NOT NULL
);

DECLARE @next int = NEXT VALUE FOR Sales.OrderNumber;
```

| Requirement | Answer |
| --- | --- |
| One numbering across several tables | A sequence in each table's `DEFAULT` |
| Know the number before inserting | `NEXT VALUE FOR` into a variable |
| Reserve a block of numbers | `sp_sequence_get_range` |
| Restart after the maximum | `CYCLE` |
| Fewer metadata writes | `CACHE n` (cached values are lost on an unexpected shutdown) |
| Numbering of one table only | `IDENTITY` |

Defaults: without `AS` the type is `bigint`; without `START WITH`, an ascending sequence starts at the **minimum value of its type**. Values aren't rolled back with a transaction, so gaps are normal. Several references to the same sequence in one statement return the same value for a row. `NEXT VALUE FOR` isn't allowed in views, user-defined functions or computed columns. `ALTER SEQUENCE ... RESTART WITH n` resets it.

> **Exam trap.** Neither `IDENTITY` nor a sequence guarantees gap-free numbers; no cache setting changes that.

<!-- section: partitioning | objectives: 1.1.6 -->
## Partitioning tables and indexes

Partitioning splits a table or index into ranges of one column: queries filtering on it read only some partitions (partition elimination), and whole partitions are loaded, archived or emptied as metadata operations.

```text
CREATE PARTITION FUNCTION PF_OrderYear (date)
AS RANGE RIGHT FOR VALUES ('2025-01-01', '2026-01-01', '2027-01-01');

CREATE PARTITION SCHEME PS_OrderYear
AS PARTITION PF_OrderYear ALL TO ([PRIMARY]);

CREATE TABLE Sales.OrderArchive
(
    OrderID   int NOT NULL,
    OrderDate date NOT NULL,
    Amount    decimal(10, 2) NOT NULL,
    CONSTRAINT PK_OrderArchive PRIMARY KEY CLUSTERED (OrderDate, OrderID)
) ON PS_OrderYear (OrderDate);

-- Remove a year instantly: switch it out, or truncate the partition
ALTER TABLE Sales.OrderArchive SWITCH PARTITION 1 TO Sales.OrderArchive_Old;
TRUNCATE TABLE Sales.OrderArchive WITH (PARTITIONS (1));

-- Add next year's boundary before data arrives
ALTER PARTITION SCHEME PS_OrderYear NEXT USED [PRIMARY];
ALTER PARTITION FUNCTION PF_OrderYear() SPLIT RANGE ('2028-01-01');
```

| Concept | Rule |
| --- | --- |
| `RANGE RIGHT` | A boundary belongs to the partition on its right: natural for dates |
| `RANGE LEFT` | A boundary belongs to the partition on its left |
| Partitions | Boundaries + 1, up to 15,000 |
| Unique indexes | A partitioned unique index (primary key included) has the partitioning column in its key |
| `SWITCH` | Aligned indexes; empty target with the same structure and filegroup |
| `SPLIT` / `MERGE` | Cheap on empty partitions only: split ahead of the data |
| Azure SQL Database | Only the `PRIMARY` filegroup |

> **Exam trap.** A query that doesn't filter on the partitioning column reads every partition. Partitioning helps manageability; it doesn't replace the right index.

<!-- section: key-points -->
## Key points

- Smallest exact type: `decimal` for money, `datetime2` for time, `nvarchar` for multi-script text; 8,060 bytes in-row.
- Key columns serve seeks and sorts, `INCLUDE` avoids lookups; columnstore is for scans and aggregates.
- In-Memory OLTP: `SCHEMA_ONLY` loses data at restart; Premium and Business Critical in Azure SQL Database.
- Temporal = point-in-time history in UTC; ledger = tamper evidence, irreversible, digests in immutable storage.
- External tables in Azure SQL Database: read-only, Parquet or CSV, `abs://` or `adls://`, no CETAS.
- Graph: `AS NODE`, `AS EDGE`, `CONNECTION` constraints, index on `($from_id, $to_id)`.
- `json` plus `CREATE JSON INDEX` (clustered key, no overlapping paths); on `nvarchar`, index a `JSON_VALUE` computed column.
- `CHECK` lets NULL through, `DEFAULT` ignores an explicit NULL, `NOCHECK` leaves a constraint untrusted.
- Sequences are shared and have gaps; default `bigint`, starting at the type's minimum.
- Partitioning: `RANGE RIGHT` for dates, aligned indexes for `SWITCH`, `PRIMARY` only in Azure SQL Database.
