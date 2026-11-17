A database rarely lives alone: applications reach it through an API, operators watch it through Azure Monitor, and other services react to its changes. This chapter covers Data API builder (DAB), which exposes tables, views and stored procedures as REST, GraphQL and MCP endpoints from a single JSON file, its deployment and monitoring, and the five ways to react to data changes. Exam questions show a configuration excerpt to complete or fix, or a set of constraints to map to a change-handling feature.

<!-- section: dab-config | objectives: 2.4.1 -->
## Creating a Data API builder configuration file

DAB is an open-source engine with no code to write: a configuration file, `dab-config.json` by default, describes the data source, the runtime settings and the entities. The CLI writes the file:

```bash
dab init --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode production \
  --auth.provider EntraID \
  --auth.audience "api://contoso-orders" \
  --auth.issuer "https://login.microsoftonline.com/<tenant-id>/v2.0"

dab add Product --source SalesLT.Product --source.type table --permissions "anonymous:read"
dab update Product --permissions "authenticated:create,read,update,delete"
dab validate
dab start
```

`dab init` **overwrites** an existing file without merging. `dab add` creates an entity, `dab update` changes it (one role per `--permissions`), `dab validate` checks the file and `dab start` runs the engine. Other commands: `dab configure`, `dab export`, `dab add-telemetry`, `dab auto-config`.

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('DATABASE_CONNECTION_STRING')",
    "options": { "set-session-context": true }
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "host": {
      "mode": "production",
      "cors": { "origins": [ "https://shop.contoso.com" ], "allow-credentials": false },
      "authentication": {
        "provider": "EntraId",
        "jwt": {
          "audience": "api://contoso-orders",
          "issuer": "https://login.microsoftonline.com/<tenant-id>/v2.0"
        }
      }
    }
  },
  "entities": {}
}
```

| Section | Content |
| --- | --- |
| `$schema` | JSON schema used for validation |
| `data-source` | `database-type` (`mssql` for SQL Server and Azure SQL; also `postgresql`, `mysql`, `cosmosdb_nosql`, `cosmosdb_postgresql`), `connection-string`, `options` |
| `data-source-files` | Child configuration files (one per database) |
| `runtime` | `rest`, `graphql`, `mcp`, `host`, `cache`, `pagination`, `telemetry`, `health` |
| `entities` | The objects exposed and their permissions |
| `autoentities` | DAB 2.0: rules that expose objects matching a pattern (`dbo.%`), SQL only |
| `azure-key-vault` | Vault endpoint used by `@akv('secret-name')` |

Secrets never appear in clear text: `@env('NAME')` reads an environment variable (or a `.env` file) and `@akv('name')` reads a Key Vault secret. With a managed identity, the connection string has no secret at all: `Authentication=Active Directory Managed Identity;` (add `User Id=<client id>` for a user-assigned identity).

Authentication providers (`runtime.host.authentication.provider`):

| Provider | Use |
| --- | --- |
| `Unauthenticated` (default) | Every request runs as `anonymous` |
| `EntraId` (formerly `AzureAd`) | Validates Microsoft Entra ID tokens; `jwt.audience` and `jwt.issuer` required |
| `AppService` | Trusts the headers set by App Service authentication (Easy Auth) |
| `StaticWebApps` | Behind Azure Static Web Apps authentication |
| `Custom` | JWTs from another identity provider |
| `Simulator` | Local tests only; starts only in `development` mode |

A client picks one of its roles with the `X-MS-API-ROLE` header; without it, an authenticated request uses the `authenticated` role. `set-session-context: true` sends the token claims to SQL in `SESSION_CONTEXT`, where row-level security predicates or procedures can read them.

> **Exam trap.** `development` host mode enables Swagger UI, the Nitro GraphQL client, anonymous health checks and debug logging. It's for local work; production deployments keep `"mode": "production"`.

<!-- section: dab-entities | objectives: 2.4.2 -->
## Configuring entities: permissions, caching, pagination, filtering

```json
"Product": {
  "source": { "object": "SalesLT.Product", "type": "table" },
  "rest": { "enabled": true, "path": "/products" },
  "graphql": { "enabled": true, "type": { "singular": "Product", "plural": "Products" } },
  "permissions": [
    {
      "role": "anonymous",
      "actions": [ { "action": "read", "fields": { "include": [ "*" ], "exclude": [ "StandardCost" ] } } ]
    },
    {
      "role": "authenticated",
      "actions": [
        { "action": "create" },
        { "action": "read" },
        { "action": "update", "policy": { "database": "@item.OwnerId eq @claims.oid" } }
      ]
    }
  ],
  "cache": { "enabled": true, "ttl-seconds": 60 }
}
```

| Setting | Rules |
| --- | --- |
| `permissions[].role` | `anonymous`, `authenticated` or a custom role. A role not configured inherits from the broader one: named role, then `authenticated`, then `anonymous` |
| `actions` | `create`, `read`, `update`, `delete`, `execute` (stored procedures), `*` (CRUD for tables and views, `execute` for procedures) |
| `fields.include` / `fields.exclude` | Column-level restriction per action |
| `policy.database` | OData-style predicate with `@item.<field>` and `@claims.<claim>`, added to the query. Supported for `read`, `update` and `delete`; not for `create` or `execute` |
| `cache` | `enabled`, `ttl-seconds` (default: the runtime value), `level` `L1` (in memory) or `L1L2` (memory plus a distributed Redis cache configured in `runtime.cache.level-2`) |

> **Exam trap.** Entity caching works only when `runtime.cache.enabled` is `true` (default `false`); otherwise the entity's `cache` block has no effect. The runtime default TTL is 5 seconds.

**Pagination** is configured in `runtime.pagination`: `default-page-size` (default 100), `max-page-size` (default 100,000) and `next-link-relative`. Requests ask for more with `$first` (REST) or `first` (GraphQL), `-1` meaning the maximum page size, and continue with the cursor returned in `nextLink` (REST) or `endCursor` / `hasNextPage` (GraphQL).

**Filtering, searching and sorting** need no configuration; they're query options:

| Need | REST | GraphQL |
| --- | --- | --- |
| Filter | `GET /api/products?$filter=ListPrice ge 100 and Color eq 'Red'` | `products(filter: { Color: { eq: "Red" } })` |
| Search in text | `$filter` with OData operators | `filter: { Name: { contains: "bike" } }` |
| Sort | `$orderby=ListPrice desc, Name asc` | `orderBy: { ListPrice: DESC }` |
| Columns | `$select=ProductID,Name` | The fields listed in the query |
| Page | `$first=20&$after=<cursor>` | `first: 20, after: "<cursor>"` |

REST path segments and query parameters are **case sensitive**. A `GET` on a key that doesn't exist returns `200 OK` with an empty `value` array, not `404`.

<!-- section: dab-endpoints | objectives: 2.4.3 -->
## Configuring REST, GraphQL and MCP endpoints

| Setting | Default | Notes |
| --- | --- | --- |
| `runtime.rest.enabled` / `path` | `true` / `/api` | `false` disables REST for every entity, whatever the entity setting. No sub-path such as `/api/data` |
| `runtime.rest.request-body-strict` | | `true`: extra fields in the body return `400 Bad Request`; `false`: ignored |
| `runtime.graphql.enabled` / `path` | `true` / `/graphql` | Same logic |
| `runtime.graphql.allow-introspection` | `true` | `false` hides the schema from clients |
| `runtime.graphql.depth-limit` | `null` (no limit) | Limits nested queries |
| `runtime.graphql.multiple-mutations.create.enabled` | `false` | Create related rows in one mutation |
| `runtime.mcp.enabled` / `path` | `true` / `/mcp` | Model Context Protocol endpoint for AI agents; `dml-tools` enables tools one by one (`describe-entities`, `read-records`, `create-record`...) |
| Entity `rest.path`, `graphql.type` | `/{entity}`, entity name | Rename the route or the GraphQL types |
| Entity `rest.enabled`, `graphql.enabled` | `true` | Expose an entity on only one protocol |

REST URLs: `/api/{entity}` for the collection, `/api/{entity}/{key}/{value}` for one row (`/api/products/ProductID/680`). `POST` creates; `PUT` replaces and `PATCH` updates, both inserting when the key is missing, except on `IDENTITY` keys where a missing key returns `404`. GraphQL generates `products` (list), `product_by_pk`, `createProduct`, `updateProduct` and `deleteProduct`.

| Client need | Endpoint |
| --- | --- |
| Simple CRUD, HTTP caching, any language | REST |
| Fetch related data in one round trip, choose the returned fields | GraphQL |
| An AI agent discovers and calls the data operations as tools | MCP |

> **Exam trap.** To keep REST but remove one entity from it, set the **entity's** `"rest": { "enabled": false }`. Setting `runtime.rest.enabled` to `false` removes REST for all entities.

<!-- section: dab-objects | objectives: 2.4.4 -->
## Exposing tables, views, stored procedures and relationships

| Source `type` | Key | Actions | REST | GraphQL |
| --- | --- | --- | --- | --- |
| `table` | Primary key read from the database | CRUD | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Queries and mutations |
| `view` | **Must be declared**: `fields[].primary-key` (DAB 2.0) or the older `key-fields` | CRUD if the view is updatable | Same as table | Same as table |
| `stored-procedure` | None | `execute` only | `POST` by default; `rest.methods` to allow `GET` | `execute<Entity>`, a mutation by default (`graphql.operation`) |

```json
"ProductSummary": {
  "source": { "object": "dbo.vProductSummary", "type": "view" },
  "fields": [ { "name": "ProductID", "primary-key": true } ],
  "permissions": [ { "role": "anonymous", "actions": [ "read" ] } ]
},
"GetOrdersByDate": {
  "source": {
    "object": "dbo.usp_GetOrdersByDate",
    "type": "stored-procedure",
    "parameters": [
      { "name": "StartDate", "required": true },
      { "name": "EndDate", "required": true }
    ]
  },
  "rest": { "methods": [ "GET" ] },
  "graphql": { "operation": "query" },
  "permissions": [ { "role": "authenticated", "actions": [ "execute" ] } ]
}
```

Parameter names are written without `@`. A read-only procedure exposed as a GraphQL `query` instead of a mutation is the usual exam fix.

**Relationships** let a GraphQL query navigate from one entity to another:

```json
"Category": {
  "source": { "object": "SalesLT.ProductCategory", "type": "table" },
  "relationships": {
    "products": {
      "cardinality": "many",
      "target.entity": "Product",
      "source.fields": [ "ProductCategoryID" ],
      "target.fields": [ "ProductCategoryID" ]
    }
  }
}
```

| Relationship | Configuration |
| --- | --- |
| One-to-many (a category has many products) | `cardinality: many` on the "one" side |
| Many-to-one (a product has one category) | `cardinality: one`, defined on `Product` |
| Many-to-many through a join table not exposed | `cardinality: many` + `linking.object`, `linking.source.fields`, `linking.target.fields` |
| Navigation in both directions | Define a relationship on **each** entity |

`source.fields` and `target.fields` can be inferred when a foreign key exists. Both entities must be in the same configuration file.

> **Exam trap.** Relationships are a GraphQL feature: REST doesn't support them. A requirement to return orders with their lines in one request points to GraphQL.

<!-- section: dab-deploy | objectives: 2.4.5 -->
## Deploying Data API builder

| Target | Notes |
| --- | --- |
| Azure Container Apps | Container image, scale rules, ingress on target port 5000 |
| Azure App Service | Web app; pairs with App Service authentication (`AppService` provider) |
| Azure Container Instances | Single container, simple hosting |
| Azure Kubernetes Service | Existing Kubernetes platform; health checks for probes |
| Local Docker or `dab start` | Development and tests |

The image is `mcr.microsoft.com/azure-databases/data-api-builder`. A common pattern bakes the configuration file into a custom image pushed to Azure Container Registry:

```text
FROM mcr.microsoft.com/azure-databases/data-api-builder:latest
COPY dab-config.json /App/dab-config.json
```

```bash
az acr build --registry contosoacr --image dab:1 .
```

The container app then receives the connection string as an environment variable (`DATABASE_CONNECTION_STRING`, referenced by `@env()`), or better, uses a **managed identity**: the connection string contains no password and the identity is created as a database user with only the permissions the entities need. The application URL returns a health report (`"status": "healthy"`).

Deployment checklist: `dab validate` in the pipeline, `production` host mode, secrets through `@env()` or `@akv()`, an authentication provider other than `Unauthenticated` when writes are exposed, CORS limited to the client origins, and introspection disabled if the schema must stay private.

<!-- section: azure-monitor | objectives: 2.4.6 -->
## Recommending Azure Monitor configurations

DAB sends telemetry through `runtime.telemetry` (or `dab add-telemetry`):

```json
"telemetry": {
  "application-insights": {
    "enabled": true,
    "connection-string": "@env('APPLICATIONINSIGHTS_CONNECTION_STRING')"
  },
  "log-level": { "default": "warning" }
}
```

| Sink | Configuration | Use |
| --- | --- | --- |
| Application Insights | `application-insights.connection-string` | Requests (REST and GraphQL, duration, status), dependencies (each SQL query, duration, success), exceptions, distributed traces |
| OpenTelemetry | `open-telemetry.endpoint`, `service-name`, `exporter-protocol` (`grpc` or `httpprotobuf`) | Any OpenTelemetry collector |
| Azure Log Analytics | `azure-log-analytics` with `auth.custom-table-name`, `dcr-immutable-id`, `dce-endpoint` | DAB logs in a custom table through a data collection rule and endpoint |
| File | `file.path`, `rolling-interval` | Local log files |
| Log level | `log-level` per namespace | The only setting hot-reloaded in production |

```kusto
dependencies
| where timestamp > ago(1h) and type == "SQL"
| summarize calls = count(), avgDuration = avg(duration), failures = countif(success == false) by data
| top 20 by avgDuration desc
```

For the database itself, a **diagnostic setting** (off by default) streams metrics and logs:

| Destination | Use |
| --- | --- |
| Log Analytics workspace | KQL queries, alerts, workbooks, correlation with Application Insights data |
| Azure Event Hubs | Third-party SIEM or custom streaming (same region as the database) |
| Azure Storage | Low-cost archive with a retention policy |

Azure SQL Database categories include Basic metrics, `QueryStoreRuntimeStatistics`, `QueryStoreWaitStatistics`, `Errors`, `DatabaseWaitStatistics`, `Timeouts`, `Blocks`, `Deadlocks`, `AutomaticTuning` and `SQLInsights`. Each database (and each elastic pool) is configured separately.

| Requirement | Recommendation |
| --- | --- |
| Find which API calls are slow and which SQL queries cause it | Application Insights on DAB (requests and dependencies) |
| Alert on deadlocks or timeouts in the database | Diagnostic setting to Log Analytics, log alert rule |
| Keep logs for years at minimum cost | Diagnostic setting to a storage account |
| Container logs of the DAB app | Container Apps environment linked to a Log Analytics workspace |
| Control ingestion cost on a busy API | Sampling in Application Insights, higher `log-level` |

<!-- section: change-handling | objectives: 2.4.7 -->
## Handling changes: CES, CDC, Change Tracking, Functions, Logic Apps

| Feature | What it captures | Delivery | Notes |
| --- | --- | --- | --- |
| Change event streaming (CES) | Each `INSERT`, `UPDATE`, `DELETE` with old and new values, as CloudEvents (JSON or Avro) | **Pushed** in near real time to Azure Event Hubs or Fabric Eventstream | Preview. Full recovery model; not with CDC or transactional replication on the same database |
| Change data capture (CDC) | Every change with before and after values, in change tables | Pulled by queries over an LSN range | History for audit and synchronization |
| Change Tracking | Which rows changed (key and operation), not the values | Pulled with `CHANGETABLE` and a version number | Lightweight; retention set on the database |
| Azure Functions SQL trigger | Batches of changed rows delivered to code | Function polls, built on Change Tracking | Serverless processing that scales outside the database |
| Azure Logic Apps SQL connector | New items ("When an item is created") or other row changes (Standard built-in triggers) | Trigger polls on a schedule | Low-code workflow; Standard built-in triggers need Change Tracking |

```text
-- CES (Azure SQL Database): master key, credential, enable, stream group, tables
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<password>';
CREATE DATABASE SCOPED CREDENTIAL EventHubCredential WITH IDENTITY = 'Managed Identity';
EXEC sys.sp_enable_event_stream;
EXEC sys.sp_create_event_stream_group
    @stream_group_name      = N'OrdersStream',
    @destination_type       = N'AzureEventHubs',
    @destination_location   = N'contoso-ns.servicebus.windows.net:9093/orders',
    @destination_credential = EventHubCredential,
    @max_message_size_kb    = 256,
    @partition_key_scheme   = N'None';
EXEC sys.sp_add_object_to_event_stream_group N'OrdersStream', N'dbo.Orders';

-- CDC
EXEC sys.sp_cdc_enable_db;
EXEC sys.sp_cdc_enable_table @source_schema = N'dbo', @source_name = N'Orders',
     @role_name = NULL, @supports_net_changes = 1;
SELECT * FROM cdc.fn_cdc_get_all_changes_dbo_Orders(
    sys.fn_cdc_get_min_lsn('dbo_Orders'), sys.fn_cdc_get_max_lsn(), 'all');

-- Change Tracking (also required by the Azure Functions SQL trigger)
ALTER DATABASE SalesDB SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
ALTER TABLE dbo.Orders ENABLE CHANGE_TRACKING;
SELECT ct.OrderID, ct.SYS_CHANGE_OPERATION
FROM CHANGETABLE(CHANGES dbo.Orders, @last_sync_version) AS ct;
```

CES details: on Managed Instance and SQL Server 2025 the destination type is `AzureEventHubsApacheKafka` (AMQP is deprecated since August 15, 2026); configuring CES requires `db_owner` or `CONTROL DATABASE`; a table belongs to one stream group; only public Event Hubs endpoints are supported; `vector`, `json`, `xml` and a few other types are skipped; row-level security and dynamic data masking don't filter the stream. Pending events prevent log truncation, so monitor `sys.dm_change_feed_errors` and log size.

The **Azure Functions SQL trigger** creates a leases table in the `az_func` schema and delivers `SqlChange<T>` items (`Insert`, `Update`, `Delete`), oldest first, in batches (`MaxBatchSize` 100 and `PollingIntervalMs` 1,000 by default). Its identity needs `SELECT` and `VIEW CHANGE TRACKING` on the table plus rights to create and use the `az_func` schema; `db_datareader` and `db_datawriter` aren't enough. If the function stops longer than the change retention, older changes are lost.

> **Exam tip.** "Several consumers, no polling, sub-second" → CES. "Before and after values, audit history" → CDC. "Only which rows changed, minimum overhead" → Change Tracking. "Run code on each change, serverless" → Azure Functions SQL trigger. "Low-code workflow that emails or calls another service" → Logic Apps.

> **Exam trap.** The Azure Functions SQL trigger relies on Change Tracking, not CDC: enabling CDC on the table doesn't make the trigger fire.

<!-- section: key-points -->
## Key points

- `dab init` creates (and overwrites) `dab-config.json`; `dab add` / `dab update` manage entities; secrets through `@env()` or `@akv()`, ideally a managed identity.
- Permissions: role + actions + optional fields and database policy (`@item`, `@claims`); `execute` for procedures.
- Cache needs `runtime.cache.enabled`; pagination defaults 100 / 100,000; `$filter`, `$orderby`, `$select`, `$first`, `$after` in REST, `filter`, `orderBy`, `first`, `after` in GraphQL.
- Views need a declared key; procedures default to `POST` and a GraphQL mutation; relationships are GraphQL only.
- Deploy the `data-api-builder` container to Container Apps, App Service, Container Instances or AKS in `production` mode.
- Telemetry: Application Insights for API and SQL dependency timing; diagnostic settings send database logs to Log Analytics, Event Hubs or Storage.
- Changes: CES pushes to Event Hubs; CDC keeps values; Change Tracking keeps keys; Functions and built-in Logic Apps triggers build on Change Tracking.
