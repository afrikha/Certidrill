Fleets organize many Azure Cosmos DB for NoSQL accounts, across subscriptions and resource groups, as one manageable unit. They target independent software vendors (ISVs) that give each tenant of a multitenant B2B application its own account: strong performance and security isolation per tenant, with shared RU/s and fleet-wide monitoring to keep cost and management under control. Fleets are in preview. Exam questions test the hierarchy, the pooling rules and limits, and which monitoring tool answers which question.

<!-- section: fleet-model | objectives: 2.4.1 -->
## Fleets, fleetspaces and fleetspace accounts

| Resource | Role | Rules |
| --- | --- | --- |
| Fleet (`Microsoft.DocumentDB/fleets`) | Top-level entity; one fleet = one multitenant application | Its region doesn't decide the regions of its accounts |
| Fleetspace (`.../fleets/fleetspaces`) | Logical group of accounts inside a fleet; optionally shares a throughput pool | Every account of a fleet belongs to a fleetspace |
| Fleetspace account (`.../fleetspaces/fleetspaceAccounts`) | Link to an existing NoSQL account (one account = one tenant) | An account belongs to one fleetspace and one fleet only; remove it before adding it elsewhere |

Accounts can come from any subscription or resource group. The creation order is always **fleet, then fleetspace, then fleetspace account**. In the portal: search for Azure Cosmos DB Fleets, Create; then Fleet resources > Fleetspaces; then Fleet resources > Database accounts > Browse accounts to add to this fleetspace > Add to fleetspace.

With the Azure CLI, fleets are generic resources and need the preview API versions:

```bash
az resource create --resource-group rg-saas --name fleet-contoso \
  --resource-type "Microsoft.DocumentDB/fleets" --location westeurope \
  --latest-include-preview --properties "{}"

# Add an existing account (tenant) to fleetspace fs-eu
accountId=$(az resource show --resource-group rg-tenant-042 --name cosmos-tenant-042 \
  --resource-type "Microsoft.DocumentDB/databaseAccounts" --query id --output tsv)
az resource create --resource-group rg-saas \
  --name "fleet-contoso/fleetspaces/fs-eu/fleetspaceAccounts/tenant-042" \
  --resource-type "Microsoft.DocumentDB/fleets/fleetspaces/fleetspaceAccounts" \
  --location westeurope --latest-include-preview \
  --properties "{\"accountLocation\":\"westeurope\",\"accountResourceIdentifier\":\"$accountId\"}"
```

```bicep
resource fleet 'Microsoft.DocumentDB/fleets@2025-10-25' = {
  name: 'fleet-contoso'
  location: 'westeurope'
  properties: {}
}
```

Default limits (raised through a support request):

| Limit | Value |
| --- | --- |
| Database accounts per fleetspace | 3,000 |
| Maximum pool RU/s | 1,000,000 RU/s |
| Pool RU/s one physical partition can consume | 5,000 RU/s |

<!-- section: throughput-pooling | objectives: 2.4.1 -->
## Fleet-level throughput pooling

Without a pool, a container that exceeds its provisioned RU/s is throttled (429). The classic workaround for spiky tenants is to provision every tenant for its peak, which wastes RU/s while tenants are idle. A **pool** is a fleetspace-level reserve of RU/s that any database or container in the fleetspace's accounts can draw from:

| Throughput | Where | Behavior |
| --- | --- | --- |
| Dedicated RU/s | Database or container, as usual | Guaranteed, always consumed **first**. Entry point: autoscale 100 to 1,000 RU/s; with autoscale, dedicated RU/s = the autoscale maximum |
| Pool RU/s | Fleetspace | Used only once a resource exceeds its dedicated RU/s, on top of it |

Example: 1,000 tenants, one account and one container each, autoscale 100 to 1,000 RU/s, with peaks at 5,000 RU/s for the few tenants active at a time. Rather than 5,000 RU/s per container, keep the small dedicated throughput and add a pool of, for example, 100,000 to 500,000 RU/s that absorbs the peaks.

Pool settings:

| Setting | Rule |
| --- | --- |
| Scaling | Autoscale by default, between a minimum and a maximum |
| Minimum and maximum RU/s | Whole numbers, at least 100,000, multiples of 1,000; maximum at least the minimum and at most **10 times** the minimum |
| Service tier | `GeneralPurpose` (single-region writes) or `BusinessCritical` (multi-region writes) |
| Data regions | The regions of the accounts that share the pool |
| Changes | Minimum and maximum can change at any time; service tier and regions **can't** change after the fleetspace is created |

All the accounts of a pooled fleetspace must have the **same regional and service tier configuration**. Pool RU/s aren't shared across regions: each region has its own pool capacity.

| Accounts in the fleetspace | Can share a pool? |
| --- | --- |
| Two single-region-write accounts, both in the same two regions | Yes |
| Two multi-region-write accounts, both in the same two regions | Yes |
| One single-region-write account in two regions, one in a single other region | No: different regions |
| Two accounts replicated to two different sets of regions | No |
| One multi-region-write account, one single-region-write account | No: different service tier |

Pooling doesn't remove physical partition limits. A physical partition can draw at most 5,000 extra RU/s from the pool, and its total (dedicated plus pool) can't exceed 10,000 RU/s:

```text
max RU/s of a physical partition = min(5000 + dedicated RU/s of the partition, 10000)

dedicated 1,000 RU/s  -> up to  6,000 RU/s
dedicated 6,000 RU/s  -> up to 10,000 RU/s (only 4,000 from the pool)
```

> **Exam trap.** A pool doesn't fix a hot partition. A single logical partition key that needs more than the per-partition limit is still throttled, whatever the free capacity of the pool: the fix is the partition key, not the pool size.

Billing: each hour, the pool is billed at the **highest RU/s it scaled to** during that hour, in each of its regions. An idle pool is billed at its minimum RU/s per region. Pooling pays off with many tenants whose peaks don't coincide; with few tenants, or tenants that are all always busy or all always idle, it brings little.

Monitoring the pool:

| Question | Metric |
| --- | --- |
| How far did the pool scale? | `FleetspaceAutoscaledThroughput` (fleet level) |
| Did requests use the pool or dedicated RU/s? | Total Requests split by **Capacity Type** (account level) |
| How much did a container consume compared with its dedicated RU/s? | Total Request Units, filtered on the database and container |
| How many dedicated RU/s does each physical partition have? | `PhysicalPartitionThroughput` |

> **Exam tip.** "Thousands of tenants, one account each, unpredictable peaks, minimize cost without throttling" points to a fleet with a throughput pool. "A few large tenants with constant load" doesn't: provision their own throughput.

<!-- section: fleet-analytics | objectives: 2.4.2 -->
## Fleet monitoring with fleet analytics

**Fleet analytics** (preview, NoSQL accounts in a fleet only) consolidates cost, usage and configuration data of every account of the fleet into one place, preaggregated at a **one-hour grain**, as open-source **Delta Lake** tables (Parquet files) in a **star schema**: fact tables for usage, performance and cost, dimension tables for context.

| | Azure Monitor metrics | Azure Monitor logs | Fleet analytics |
| --- | --- | --- | --- |
| Scope | Account | Account | Whole fleet |
| Aggregation | 1 minute, preaggregated | Each request | 1 hour, preaggregated |
| Retention | 90 days | You decide | You decide |
| Cost | None | Log storage | Fabric or storage |
| Tools | Metrics explorer, Grafana | Log Analytics, workbooks | Fabric SQL endpoint or KQL, Spark, Power BI |

Choose fleet analytics for trends, cost allocation and configuration audits across many accounts; metrics for near-real-time checks and alerts; logs for request-level troubleshooting.

Destinations and setup (fleet > Monitoring > Fleet analytics > Add destination):

| Destination | Prerequisite | Permission to grant |
| --- | --- | --- |
| Microsoft Fabric workspace | Fabric capacity (licensed or trial), an existing OneLake lakehouse; a dedicated workspace is recommended | In the Fabric portal (workspace > Manage), the **Cosmos DB Fleet Analytics** service principal as **Contributor** of the workspace |
| Azure Storage account | Azure Data Lake Storage Gen2: **hierarchical namespace** enabled at account creation, an existing container | On the storage account (Access control (IAM)), **Storage Blob Data Contributor** for the **Cosmos DB Fleet Analytics** service principal |

> **Exam trap.** Without the role assignment for the Cosmos DB Fleet Analytics service principal, the destination is saved but no data is written. A dedicated Fabric workspace is advised because the principal gets Contributor on the whole workspace.

Tables:

| Table | Content |
| --- | --- |
| `FactAccountHourly` | Account settings per hour: default consistency level, free tier, burst capacity, backup mode and retention, `TotalRUPerSecLimit`, key settings and last key rotation |
| `FactRequestHourly` | `TotalRequestCount` per resource and hour |
| `FactResourceUsageHourly` | `MaxDataStorageInKB`, `MaxIndexStorageInKB` |
| `FactMeterUsageHourly` | `ConsumedUnits` per billing meter (`MeterId`) |
| `DimResource` | `ResourceId` with `SubscriptionId`, `AccountName`, `ResourceGroup` |
| `DimMeter` | Billing meters |

Facts join to `DimResource` on `ResourceId`. Top 100 accounts by data plane requests over 7 days, from the Fabric SQL endpoint:

```text
SELECT TOP 100 DR.[SubscriptionId], DR.[AccountName], DR.[ResourceGroup],
       SUM(FRH.[TotalRequestCount]) AS sum_total_requests
FROM [FactRequestHourly] FRH
JOIN [DimResource] DR ON FRH.[ResourceId] = DR.[ResourceId]
WHERE FRH.[Timestamp] >= DATEADD(DAY, -7, GETDATE())
  AND FRH.[ResourceName] IN ('Document', 'StoredProcedure')
GROUP BY DR.[AccountName], DR.[SubscriptionId], DR.[ResourceGroup]
ORDER BY sum_total_requests DESC;
```

Saved views appear in the SQL endpoint's Views folder and can be visualized in Power BI (for example, the share of the fleet that uses autoscale). With ADLS Gen2, a Spark notebook creates Delta tables over the `abfss://<container>@<account>.dfs.core.windows.net/<table>` folders and queries them the same way. Storage and query compute are billed by Fabric or Azure Storage as usual.

| Requirement | Tool |
| --- | --- |
| Which tenants grew most in storage this quarter? | Fleet analytics, `FactResourceUsageHourly` |
| Which accounts still use periodic backup or never rotated keys? | Fleet analytics, `FactAccountHourly` |
| Cost per tenant for chargeback | Fleet analytics, `FactMeterUsageHourly` |
| Be alerted within minutes when a tenant is throttled | Azure Monitor metric alert |
| Find the query that consumed 4,000 RU at 10:42 | Resource logs in Log Analytics |

<!-- section: key-points -->
## Key points

- Fleet (one application) > fleetspace (group of accounts, optional pool) > fleetspace account (one tenant); an account belongs to one fleetspace only.
- Dedicated RU/s are consumed first; the pool adds capacity on top, autoscaling between a minimum (at least 100,000 RU/s) and a maximum (at most 10 times the minimum).
- Pooled accounts share the same regions and service tier (`GeneralPurpose` single-region writes or `BusinessCritical` multi-region writes), both fixed at creation; pools aren't shared across regions.
- A physical partition takes at most 5,000 RU/s from the pool and 10,000 RU/s in total.
- Billing: highest pool RU/s reached each hour, per region; the minimum when idle.
- Fleet analytics: hourly Delta Lake star schema in Fabric OneLake or ADLS Gen2; grant the Cosmos DB Fleet Analytics service principal access, or nothing is written.
