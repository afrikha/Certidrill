Operational analytics means reporting and data science on live Cosmos DB data without slowing the application and without ETL pipelines. On DP-420 this is done with Microsoft Fabric: either the database lives in Fabric (Cosmos DB in Microsoft Fabric, mirrored to OneLake automatically), or an Azure Cosmos DB for NoSQL account is mirrored into Fabric. Questions ask which to choose, how to set up and monitor mirroring, how to query the mirrored JSON with T-SQL or Spark, and how to read and write the operational containers with the Spark connector.

<!-- section: azure-or-fabric | objectives: 3.3.1 -->
## Azure Cosmos DB or Cosmos DB in Microsoft Fabric

Both run the same Cosmos DB for NoSQL engine: same query language, SDKs, indexing (vector and full-text included) and transactional batch. They differ in provisioning, security, billing and analytics.

| Aspect | Azure Cosmos DB for NoSQL | Cosmos DB in Microsoft Fabric |
| --- | --- | --- |
| Where it lives | Azure subscription, Azure Resource Manager resource | Fabric workspace item, licensed by Fabric capacity, Power BI Premium or trial capacity |
| Throughput | Manual, autoscale or serverless | **Autoscale only**: portal default 5,000 RU/s maximum, SDK 1,000 to 50,000 RU/s; more through a support ticket |
| Billing | Request units and storage on the Azure bill | Fabric capacity units (CU): 100 RU/s = 0.067 CU per hour, about 1,500 RU/s per CU; the highest autoscale throughput of each hour is billed |
| Authentication | Account keys or Microsoft Entra ID data plane RBAC | **Microsoft Entra ID only**, no primary or secondary keys; Fabric item permissions apply to every Cosmos DB item of the workspace |
| SDK connection | Direct or gateway mode | **Gateway mode only**: set it explicitly in .NET and Java |
| Regions | Single or multiple regions, multi-region writes | Region of the workspace capacity, no multi-region (availability zones where available) |
| Network and keys | Private endpoints, customer-managed keys | No Private Link on the item (tenant-level Fabric private links only), no customer-managed keys |
| Server-side code | Stored procedures, triggers, UDFs | Not supported |
| Limits | Account and container limits of Azure Cosmos DB | 25 containers per database by default, 2 MB per item |
| Analytics | Optional mirroring into Fabric (needs continuous backup) | Always mirrored to OneLake in Delta Parquet, can't be turned off |

| Requirement | Choice |
| --- | --- |
| New NoSQL or AI app built by a team that already works in Fabric, with data analyzed in OneLake and Power BI, and no Azure infrastructure to manage | Cosmos DB in Microsoft Fabric |
| Multi-region writes, a global distribution SLA, serverless or manual throughput | Azure Cosmos DB |
| Private endpoint on the database, customer-managed keys, account keys for a legacy client | Azure Cosmos DB |
| Stored procedures or triggers already used by the application | Azure Cosmos DB |
| Existing Azure Cosmos DB production account that needs near real-time analytics | Keep it and mirror it into Fabric |
| One bill and one capacity for the database and its analytics | Cosmos DB in Microsoft Fabric |

Moving to Cosmos DB in Fabric is a data migration (Data Factory, SDK bulk import, Spark or the Desktop Data Migration Tool), with the code switched to Microsoft Entra authentication and gateway mode.

> **Exam trap.** A container created with the SDK in Cosmos DB in Fabric must be given autoscale throughput. Code that creates it with manual throughput fails with `Offer Type is restricted to Autoscale for your account.`

<!-- section: configure-mirroring | objectives: 3.3.2 -->
## Configure mirroring from Azure Cosmos DB

Mirroring replicates a whole Azure Cosmos DB for NoSQL database, or selected containers, into OneLake as Delta tables. The first copy is read from the account's **continuous backup**; afterwards inserts, updates and deletes are read from the live containers in near real time (usually a few minutes for the initial load, longer for large volumes). It uses neither the analytical store nor the change feed and consumes none of the application's request units; Azure Synapse Link and change feed consumers keep working beside it.

Prerequisites and limits to know:

- **API for NoSQL only**: not MongoDB, Cassandra, Gremlin, Table or DocumentDB (vCore). Not in Azure Government or Azure China.
- **Continuous backup, 7-day or 30-day**. The 7-day tier is free and is enough for mirroring. Switching an account to continuous backup can't be undone.
- **No multi-region write accounts**. With one write region and read regions, mirroring reads from the write region, also after a failover.
- **Authentication**: a read-write account key, or Microsoft Entra ID (*Organizational account*) with a data plane role that grants `Microsoft.DocumentDB/databaseAccounts/readMetadata` and `Microsoft.DocumentDB/databaseAccounts/readAnalytics`. Read-only keys and managed identities aren't supported.
- **Workspace role** Admin or Member to create the mirrored database.
- Not supported: customer-managed keys on OneLake, soft delete through TTL (an item that expires is deleted from the mirror like any delete), custom partitioning.

Portal steps: in the workspace, **Create** > **Mirrored Azure Cosmos DB**, name the item, create a connection (**Azure Cosmos DB for NoSQL**, endpoint, authentication kind **Account key** or **Organizational account**), select the database and optionally the containers, then **Mirror database**. Containers added later are picked up automatically, and the container selection can be changed at any time.

Custom data plane role for Microsoft Entra authentication:

```bash
az cosmosdb sql role definition create -a cosmos-litware -g rg-litware --body '{
  "RoleName": "Fabric Mirroring Metadata Reader",
  "Type": "CustomRole",
  "AssignableScopes": ["/"],
  "Permissions": [{ "DataActions": [
    "Microsoft.DocumentDB/databaseAccounts/readMetadata",
    "Microsoft.DocumentDB/databaseAccounts/readAnalytics"
  ]}]
}'
```

An account with public network access disabled behind a private endpoint can be mirrored: add the capability `EnableFabricNetworkAclBypass`, authorize the Fabric workspace with `--network-acl-bypass-resource-ids`, create a virtual network data gateway and an OAuth 2.0 connection, then create the mirrored database with the Fabric REST API. The workspace must be in the account's region. Ongoing replication travels over the Microsoft network, not through the private endpoint.

Cost: replication compute is free, mirror storage in OneLake is free up to a limit tied to the capacity size, queries consume Fabric capacity, and a capacity in another region than the account adds egress cost and latency.

> **Exam trap.** Mirroring is "zero RU" only for replication. Browsing the source with the mirrored database's data explorer (**View** > **Source database**) runs real queries on the account and consumes RUs. Writes to the source are never possible from the mirrored item.

<!-- section: monitor-mirroring | objectives: 3.3.2 -->
## Monitor and manage replication

**Monitor replication** in the mirrored database shows a status for the database and for each table:

| Status | Meaning |
| --- | --- |
| Running | Snapshot and changes are being replicated |
| Running with warning | Replication continues with transient (database) or nonfatal (table) errors to fix |
| Stopping / Stopped | Replication stopped |
| Failed | Fatal error, intervention required |
| Paused | Database level only: the Fabric capacity was paused and resumed |

The table list shows **Rows replicated** (cumulative inserts, updates and deletes applied) and **Last completed** (last refresh from the source). Status is also available through the mirroring REST API.

For history and alerting, enable **workspace monitoring**: execution logs land in the `MirroredDatabaseTableExecution` table of the monitoring KQL database, with `OperationName` (`AddTable`, `Snapshotting`, `Replicating`, `StartReseeding`, `FailTable`...), `SourceTableName`, `ProcessedRows`, `ProcessedBytes`, `ReplicatorBatchLatency` (seconds), `ErrorType` (`UserError` or `SystemError`) and `ErrorMessage`.

```kusto
MirroredDatabaseTableExecution
| where Timestamp > ago(24h) and ItemName == "orders-mirror"
| where OperationName == "Replicating"
| summarize maxLatencySec = max(ReplicatorBatchLatency), rows = sum(ProcessedRows)
    by SourceTableName, bin(Timestamp, 1h)
```

```kusto
MirroredDatabaseTableExecution
| where isnotempty(ErrorType)
| project Timestamp, SourceTableName, OperationName, ErrorType, ErrorMessage
| order by Timestamp desc
```

Management actions:

| Event or action | Effect |
| --- | --- |
| Account keys rotated | Mirroring fails: stop replication, update the connection credentials, start again |
| Stop replication | Mirroring is fully stopped; OneLake data already replicated stays. There is no pause |
| Start again after a stop | All tables are reseeded from scratch, not resumed incrementally |
| Container deleted and recreated with the same name | The table holds only the new container's data |
| Source database deleted | Replication fails; OneLake data stays until you delete the mirror |

> **Exam tip.** To confirm that the mirror is current, compare **Last completed** and **Rows replicated** with the live source (read-only **Source database** view), and look at `ReplicatorBatchLatency` in the workspace monitoring logs.

<!-- section: query-tsql | objectives: 3.3.3 -->
## Query mirrored JSON with T-SQL

Every mirrored database has a read-only **SQL analytics endpoint**: each container is a table, queried with T-SQL from the Fabric query editor, SSMS, Visual Studio Code or any ODBC/JDBC client. You can create views, join with other mirrored databases, warehouses and lakehouses of the workspace, build Direct Lake Power BI reports, and apply row-level security, column-level security and dynamic data masking. Queries cost Fabric capacity, not RUs.

How the JSON lands in Delta:

| Source change | Result in the table |
| --- | --- |
| Top-level property | A column |
| Nested object or array | A JSON string column |
| New property | A new column; older rows are null |
| Property missing in an item | Null |
| Property renamed | Both columns are kept; the old one is null for new items |
| Incompatible type change (array to string) | Upcast when possible, otherwise null |
| `addressName` and `AddressName` | `addressName` and `AddressName_1` |

Nested data is expanded with `OPENJSON`. `CROSS APPLY` keeps only the rows whose array has elements; `OUTER APPLY` also keeps the items without the array (like a left join). A column declared `nvarchar(max) AS JSON` returns a nested fragment that a second `OPENJSON` can expand.

```text
SELECT o.id, o.customerId, l.sku, l.quantity, l.unitPrice
FROM dbo.orders AS o
OUTER APPLY OPENJSON(o.lines) WITH (
    sku        varchar(50) '$.sku',
    quantity   int         '$.quantity',
    unitPrice  float       '$.unitPrice',
    discounts  nvarchar(max) AS JSON
) AS l
WHERE o.status = 'shipped';
```

Without a `WITH` clause, `OPENJSON` infers the schema and returns key/value rows. In the `WITH` clause, prefer `varchar(n)` to `varchar(max)` for string columns: smaller types perform better.

String size: tables created after November 18, 2025 use `varchar(max)`, up to 2 MB (the maximum item size). Tables created before only support `varchar(8000)` and must be recreated. For very long JSON strings, read the data with Spark instead.

> **Exam trap.** The SQL analytics endpoint is read-only: `INSERT`, `UPDATE` or `DELETE` can't change the mirrored tables or the source container. Writing back to Cosmos DB goes through the SDK or the Spark connector.

> **Exam tip.** Workspace Viewers can't query the SQL analytics endpoint. To give analysts the data without the live source explorer, share only the SQL analytics endpoint.

<!-- section: query-spark | objectives: 3.3.3 -->
## Query mirrored data with Spark

Spark reads the mirror through a **Lakehouse**: **Get Data** > **New shortcut** > **Microsoft OneLake**, then select the mirrored database and its tables. The shortcut points to the mirror's Delta tables, so nothing is copied and no RU is consumed; **New or existing notebook** on a table opens a notebook. Cosmos DB in Microsoft Fabric has the same OneLake mirror without any setup.

Nested properties arrive as JSON strings: parse them with `from_json` and `explode`.

```text
from pyspark.sql.functions import col, explode, from_json
from pyspark.sql.types import ArrayType, StructType, StructField, StringType, IntegerType, DoubleType

lines_schema = ArrayType(StructType([
    StructField("sku", StringType()),
    StructField("quantity", IntegerType()),
    StructField("unitPrice", DoubleType())
]))

orders = spark.sql("SELECT id, customerId, lines FROM lh_sales.orders")
order_lines = (orders
    .withColumn("line", explode(from_json(col("lines"), lines_schema)))
    .select("id", "customerId", "line.sku", "line.quantity", "line.unitPrice"))
display(order_lines)
```

| Requirement | Tool |
| --- | --- |
| Ad hoc SQL, views, Power BI reports | SQL analytics endpoint (T-SQL) |
| Data engineering, machine learning, very long JSON strings | Lakehouse shortcut + Spark notebook |
| Freshest data or a point lookup on the source | The operational container (SDK or Spark connector, consumes RUs) |

<!-- section: spark-connector | objectives: 3.3.4 -->
## Read and write Cosmos DB from Fabric with the Spark connector

The Azure Cosmos DB Spark OLTP connector (Maven group `com.azure.cosmos.spark`, format `cosmos.oltp`) reads and writes the **operational** containers directly: every read and write consumes RUs. Use it for **reverse ETL**: computing results in Fabric (recommendations, aggregates) and serving them to the application from Cosmos DB with low latency. In Fabric, create an environment on Runtime 1.3 (Spark 3.5), upload `azure-cosmos-spark_3-5_2-12` as a custom library, publish it and attach it to the notebook.

For an **Azure Cosmos DB account**, configure the endpoint with an account key (or a service principal, `spark.cosmos.auth.type` = `ServicePrincipal`):

```text
azure_config = {
    "spark.cosmos.accountEndpoint": "https://cosmos-litware.documents.azure.com:443/",
    "spark.cosmos.accountKey": "<account-key>",
    "spark.cosmos.database": "retail",
    "spark.cosmos.container": "recommendations"
}
```

For **Cosmos DB in Microsoft Fabric**, which accepts only Microsoft Entra ID, also add the `fabric-cosmos-spark-auth_3` library and use the notebook user's token:

```text
config = {
    "spark.cosmos.accountEndpoint": "https://<endpoint>.cosmos.fabric.microsoft.com:443/",
    "spark.cosmos.database": "retail",
    "spark.cosmos.container": "products",
    "spark.cosmos.accountDataResolverServiceName": "com.azure.cosmos.spark.fabric.FabricAccountDataResolver",
    "spark.cosmos.auth.type": "AccessToken",
    "spark.cosmos.useGatewayMode": "true",
    "spark.cosmos.auth.aad.audience": "https://cosmos.azure.com/"
}

products = (spark.read.format("cosmos.oltp").options(**config)
    .option("spark.cosmos.read.inferSchema.enabled", "true")
    .load())
```

Write with the same format. Every row needs an `id` column and the partition key property:

```text
spark.sql("CREATE TABLE IF NOT EXISTS cosmosCatalog.retail.minPrices USING cosmos.oltp "
          "TBLPROPERTIES(partitionKeyPath = '/id', autoScaleMaxThroughput = '1000')")

write_config = dict(config)
write_config["spark.cosmos.container"] = "minPrices"
write_config["spark.cosmos.write.strategy"] = "ItemOverwrite"
write_config["spark.cosmos.throughputControl.enabled"] = "true"
write_config["spark.cosmos.throughputControl.name"] = "ReverseEtlControl"
write_config["spark.cosmos.throughputControl.targetThroughputThreshold"] = "0.30"
write_config["spark.cosmos.throughputControl.globalControl.useDedicatedContainer"] = "false"

min_prices.withColumn("id", col("productId")) \
    .write.format("cosmos.oltp").options(**write_config).mode("APPEND").save()
```

`CREATE TABLE` uses the catalog `com.azure.cosmos.spark.CosmosCatalog`, registered as `spark.sql.catalog.cosmosCatalog` with the same endpoint and authentication settings; Spark SQL can then query `cosmosCatalog.retail.products`.

| `spark.cosmos.write.strategy` | Behavior |
| --- | --- |
| `ItemOverwrite` (default) | Upsert: creates or replaces the item with the same `id` and partition key |
| `ItemAppend` | Creates items, ignores those that already exist |
| `ItemOverwriteIfNotModified` | Replaces only if the ETag still matches, skips changed items |
| `ItemDelete` / `ItemDeleteIfNotModified` | Deletes the matching items, optionally only if unchanged |
| `ItemPatch` / `ItemPatchIfExists` | Partial update; fails on a missing item / skips it |

Other settings: bulk writes are on by default (`spark.cosmos.write.bulk.enabled`); `spark.cosmos.read.customQuery` pushes a NoSQL query (aggregates included) to Cosmos DB; the `cosmos.oltp.changeFeed` format streams the change feed, with `spark.cosmos.changeFeed.startFrom` (`Beginning`, `Now` or a timestamp).

> **Exam trap.** To analyze data, don't read the operational container with `cosmos.oltp`: that spends RUs that the application needs. Read the OneLake mirror (shortcut or SQL analytics endpoint) and use the connector only to write results back, with throughput control to cap the RUs the job may use.

<!-- section: key-points -->
## Key points

- Cosmos DB in Fabric: same engine, autoscale only, billed in CUs, Microsoft Entra ID only, gateway mode, single region, always mirrored to OneLake.
- Azure Cosmos DB: multi-region writes, serverless or manual throughput, private endpoints, customer-managed keys; mirror it for analytics.
- Mirroring needs API for NoSQL, continuous backup and no multi-region writes; authentication is a read-write key or Entra with `readMetadata` + `readAnalytics`; replication consumes no RU.
- Monitor with the replication statuses and `MirroredDatabaseTableExecution`. A restart reseeds everything.
- T-SQL on the read-only SQL analytics endpoint, nested JSON expanded with `OPENJSON`.
- Spark reads the mirror through a Lakehouse shortcut; the `cosmos.oltp` connector writes results back (RUs, write strategy, throughput control).
