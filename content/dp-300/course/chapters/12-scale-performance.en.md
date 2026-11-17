Once the offering is chosen, its resources must match the workload: compute size and tier, replicas that absorb read traffic, storage that delivers the IOPS, and inside the database, partitioned tables and compressed data. Each offering exposes different levers, and exam questions often hinge on which lever exists where.

<!-- section: sql-database-scale | objectives: 1.2.1 -->
## Scaling Azure SQL Database

**Scaling up or down** changes the service objective. The engine process is restarted, if needed on another machine, as an **online** operation: at the end, open connections are terminated and uncommitted transactions are rolled back, a short break that retry logic absorbs.

```text
-- Run in the master database of the logical server
ALTER DATABASE [SalesDb] MODIFY (SERVICE_OBJECTIVE = 'GP_Gen5_8');
ALTER DATABASE [SalesDb] MODIFY (EDITION = 'BusinessCritical', SERVICE_OBJECTIVE = 'BC_Gen5_4');
```

```bash
az sql db update -g RG1 -s sql-contoso-prod -n SalesDb --service-objective GP_Gen5_8
```

```powershell
Set-AzSqlDatabase -ResourceGroupName RG1 -ServerName sql-contoso-prod `
  -DatabaseName SalesDb -RequestedServiceObjectiveName "GP_Gen5_8"
```

In the DTU model, utilization is `MAX(avg_cpu_percent, avg_data_io_percent, avg_log_write_percent)`: the first resource to reach 100 % sets the limit. Basic, S0, S1 and S2 provide less than one vCore; use S3 or above for CPU-intensive work and columnstore.

**Read scale-out** sends read-only connections to a readable replica, at no extra cost in Premium and Business Critical:

| Tier | Read scale-out |
| --- | --- |
| Basic, Standard, General Purpose | Not available |
| Premium, Business Critical | Enabled by default on new databases, one readable replica included |
| Hyperscale | Available when at least one high availability replica exists |

The application opts in with `ApplicationIntent=ReadOnly` in its connection string (the default `ReadWrite` goes to the primary). On the replica, `SELECT DATABASEPROPERTYEX(DB_NAME(), 'Updateability');` returns `READ_ONLY`. Replica latency is usually milliseconds to seconds with no fixed upper bound: a read that must see committed data immediately goes to the primary.

**Hyperscale** separates compute from storage, so scaling compute and backups don't depend on data size:

| Replica type | Count | Use |
| --- | --- | --- |
| High availability replicas | 0 to 4 | Failover targets, readable with `ApplicationIntent=ReadOnly` |
| Named replicas | Up to 30 | Read scale-out with their own name and compute size, isolated from the primary workload |
| Geo-replicas | In other regions | Readable copy for geo-distributed reads and disaster recovery |

Converting a database to Hyperscale is online with a cutover of usually under a minute. Choose **manual cutover** to pick the moment: you then have 24 hours after the database is ready. Reverse migration is possible only to **General Purpose**, within **45 days**, and only for a database that was converted (a database created in Hyperscale can't be moved out).

> **Exam trap.** A database with In-Memory OLTP objects can't move from Business Critical to General Purpose or Standard until those objects are removed.

**Serverless** scales automatically between the configured minimum and maximum vCores; no action is needed. **Elastic pools** are scaled as a whole: size them as `MAX(total databases × average use, concurrently peaking databases × peak use)`, then check the storage need, and optionally set per-database minimum and maximum limits.

<!-- section: managed-instance-scale | objectives: 1.2.2 -->
## Scaling Azure SQL Managed Instance

| | General Purpose | Next-gen General Purpose | Business Critical |
| --- | --- | --- | --- |
| Storage | Remote, 5 to 10 ms, up to 16 TB | Elastic SAN, 3 to 5 ms, up to 32 TB | Local SSD, 1 to 2 ms, up to 4 TB (16 TB with premium-series hardware) |
| Databases per instance | 100 | 500 | 100 |
| IOPS | 500 to 7,500 per file, depending on file size | 3 free IOPS per GB of storage, more can be bought | 4,000 IOPS per vCore |
| In-memory OLTP | No | No | Yes |
| Readable replica | No | No | One, included (read scale-out always on) |
| Failover at the end of a scaling operation | Up to 2 minutes | Instance back after 2 minutes, some databases up to 10 minutes | Up to 20 seconds |

Hardware sets the memory per vCore: standard-series 5.1 GB, premium-series 7 GB, memory optimized premium-series 13.6 GB. Memory-hungry workloads move to memory optimized premium-series rather than to more vCores.

Scaling vCores, storage or the tier is done in the portal (**Compute + storage**), with `az sql mi update` or `Set-AzSqlInstance`. The instance stays available during the operation and is unavailable only during the final failover. Business Critical operations, and any change between General Purpose and Business Critical, **seed** data to new replicas, so their duration grows with data size. Next-gen General Purpose sets IOPS and memory independently:

```bash
az sql mi update -g RG1 -n mi-contoso -e GeneralPurpose --gpv2 true --iops 6000
```

Performance levers specific to Managed Instance:

- **General Purpose file IOPS** depend on the file size: pre-growing a busy data or log file raises its IOPS and throughput limits.
- **Log write throughput** is capped per vCore (4.5 MiB/s per vCore in General Purpose, 16 MiB/s per vCore in Business Critical); a write-heavy load that hits the cap needs more vCores or Business Critical.
- `tempdb` supports up to 128 files; in General Purpose its size is limited to 24 GB per vCore.
- **Instance pools** host several General Purpose instances on shared, pre-provisioned resources: 2-vCore instances exist only in a pool, and an instance is created in about 10 minutes. Good for migrating many small instances; the drawback is a possible noisy neighbor.

> **Exam trap.** Avoid scaling a managed instance while a long-running transaction (data import, index rebuild) or active connections run: the final failover terminates the connections and the open transactions are rolled back.

<!-- section: vm-scale | objectives: 1.2.3 -->
## Scaling SQL Server on Azure Virtual Machines

On a virtual machine you size compute and storage yourself. Microsoft's checklist:

| Area | Recommendation |
| --- | --- |
| Virtual machine size | Memory optimized sizes with 4 or more vCores: Ebdsv5 series for most production workloads, Mbdsv3 for mission-critical OLTP and data warehouses |
| Disks | Premium SSD v2 with Ebdsv5 or Ebsv5; data, log and `tempdb` on separate drives |
| Host caching | Read-only for data disks, none for log disks |
| `tempdb` | On the local temporary disk (`D:\`, ephemeral), except for a failover cluster instance; one data file per core up to eight |
| Formatting | 64 KB allocation unit for data drives (the temporary `D:\` drive keeps 4 KB) |
| Throughput | Stripe several data disks with Storage Spaces, up to the virtual machine IOPS and throughput limits |
| SQL Server settings | Instant file initialization, lock pages in memory, max server memory leaving room for the OS, backup compression, page compression where appropriate |
| Azure features | Register with the SQL IaaS Agent extension; enable Accelerated Networking |

Remember that the virtual machine size also caps disk IOPS and throughput: adding disks beyond that cap doesn't help, a larger size does. Resizing a virtual machine restarts it, unlike scaling PaaS offerings.

> **Exam trap.** Read caching on a log disk is wrong: the log is written sequentially. Data disks use read-only caching, log disks none.

<!-- section: configure-partitioning | objectives: 1.2.4 -->
## Configuring table partitioning

Create the function, the scheme, then the table (or rebuild its clustered index) on the scheme:

```text
-- Monthly partitions; RANGE RIGHT: each boundary starts a partition
CREATE PARTITION FUNCTION pfOrderDate (date)
    AS RANGE RIGHT FOR VALUES ('2026-01-01', '2026-02-01', '2026-03-01');

-- Azure SQL Database: every partition on PRIMARY
CREATE PARTITION SCHEME psOrderDate
    AS PARTITION pfOrderDate ALL TO ([PRIMARY]);

CREATE TABLE dbo.Orders (
    OrderId bigint NOT NULL,
    OrderDate date NOT NULL,
    Amount money NOT NULL,
    CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (OrderDate, OrderId)
) ON psOrderDate (OrderDate);
```

Three boundaries create four partitions: before January, January, February, and March onward. The partitioning column must be part of the clustered index key and of every unique index for those indexes to be aligned.

Sliding window maintenance:

```text
-- Add a partition for April
ALTER PARTITION SCHEME psOrderDate NEXT USED [PRIMARY];
ALTER PARTITION FUNCTION pfOrderDate () SPLIT RANGE ('2026-04-01');

-- Archive the oldest partition: metadata-only switch to an empty table
-- with the same structure, on the same filegroup
ALTER TABLE dbo.Orders SWITCH PARTITION 1 TO dbo.OrdersArchive;

-- Remove the now empty boundary
ALTER PARTITION FUNCTION pfOrderDate () MERGE RANGE ('2026-01-01');

-- Or empty one partition directly
TRUNCATE TABLE dbo.Orders WITH (PARTITIONS (1));
```

Split an **empty** partition at the end of the range: splitting or merging partitions that contain rows moves data and is slow and heavily logged. To check where rows are:

```text
SELECT $PARTITION.pfOrderDate('2026-02-15') AS PartitionNumber;

SELECT partition_number, rows, data_compression_desc
FROM sys.partitions
WHERE object_id = OBJECT_ID('dbo.Orders') AND index_id IN (0, 1);
```

Set `LOCK_ESCALATION = AUTO` with `ALTER TABLE` to let locks escalate to the partition rather than the whole table.

<!-- section: data-compression | objectives: 1.2.5 -->
## Configuring data compression

| Type | Applies to | Effect |
| --- | --- | --- |
| `ROW` | Rowstore tables and indexes | Stores fixed-length values in a variable-length format |
| `PAGE` | Rowstore tables and indexes | Row compression plus prefix and dictionary compression: higher savings, more CPU |
| `COLUMNSTORE` | Columnstore indexes | Always applied to columnstore data |
| `COLUMNSTORE_ARCHIVE` | Columnstore indexes | Extra compression for rarely read data; slower queries |
| `XML_COMPRESSION = ON` | XML columns (SQL Server 2022 and Azure SQL) | Compresses XML data |

Compression saves storage and IO (fewer pages read) at the cost of CPU. It is available in Azure SQL Database, Managed Instance, SQL database in Fabric and SQL Server, and is set per partition.

Estimate first, then apply:

```text
EXEC sp_estimate_data_compression_savings
    @schema_name = 'dbo', @object_name = 'Orders',
    @index_id = NULL, @partition_number = NULL,
    @data_compression = 'PAGE';

ALTER TABLE dbo.Orders REBUILD PARTITION = ALL
    WITH (DATA_COMPRESSION = PAGE ON PARTITIONS (1 TO 3),
          DATA_COMPRESSION = ROW ON PARTITIONS (4));

ALTER INDEX IX_Orders_Amount ON dbo.Orders
    REBUILD WITH (DATA_COMPRESSION = PAGE, ONLINE = ON);
```

Rules the exam checks:

- Nonclustered indexes **don't inherit** the table compression: compress each index explicitly (the default is `NONE`).
- Off-row and large-value data (`varchar(max)`, an XML value over 8,060 bytes) isn't compressed by row or page compression.
- On a heap, new pages added by DML don't use page compression until the heap is rebuilt.
- Tables with sparse columns can't be compressed.
- Compression doesn't change the maximum row size.
- **Backup compression** is a different feature: it compresses the backup file, not the data files.

> **Exam tip.** Choose `PAGE` for large, read-mostly tables where IO dominates, `ROW` for write-heavy tables where CPU matters, and `COLUMNSTORE_ARCHIVE` for cold partitions of a columnstore table.

<!-- section: key-points -->
## Key points

- Scaling Azure SQL Database is online with a short disconnection at the end: `ALTER DATABASE ... MODIFY (SERVICE_OBJECTIVE = ...)` from `master`.
- Read scale-out: Premium, Business Critical (on by default) and Hyperscale with a replica; connect with `ApplicationIntent=ReadOnly`.
- Hyperscale: 0 to 4 high availability replicas, up to 30 named replicas, reverse migration to General Purpose within 45 days for converted databases.
- Managed Instance: Business Critical for latency, in-memory OLTP and a readable replica; Next-gen General Purpose for 32 TB, 500 databases and adjustable IOPS; instance pools for many small instances.
- Virtual machines: Ebdsv5, Premium SSD v2, read-only cache for data, none for log, `tempdb` on `D:\`, 64 KB allocation unit.
- Partitioning: function, scheme, aligned indexes, `SPLIT` empty ranges, `SWITCH` for instant load and archive.
- Compression: estimate with `sp_estimate_data_compression_savings`, set per partition and per index.
