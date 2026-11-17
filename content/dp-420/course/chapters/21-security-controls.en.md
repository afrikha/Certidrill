Securing an Azure Cosmos DB for NoSQL account means deciding how clients prove who they are (keys or Microsoft Entra ID), what each identity may do on the control plane and on the data plane, which networks can reach the account, and which users see sensitive values in clear. Exam questions hinge on the difference between Azure RBAC and Cosmos DB's native data plane RBAC, and on the exact effect of each network setting.

<!-- section: authentication | objectives: 2.1.1 -->
## Authentication mechanisms

| Mechanism | What it is | Use it when |
| --- | --- | --- |
| Account keys | Primary and secondary read-write keys, primary and secondary read-only keys (HMAC). A read-write key gives full access to all the account's data, a read-only key reads all of it | Legacy code; avoid for new workloads |
| Microsoft Entra ID | OAuth tokens for a user, service principal or **managed identity**, authorized by data plane role assignments | The recommended default, required for keyless and least-privilege access |
| Resource tokens | Tokens generated from a **permission** (mode `All` or `Read`) attached to a **user** of a database, for one resource. Valid one hour by default, up to five hours | Handing temporary, scoped access to an untrusted client through a trusted middle tier |

Keyless connection with the SDK, using `DefaultAzureCredential` (managed identity in Azure, developer credentials locally):

```text
// C#
using Azure.Identity;
using Microsoft.Azure.Cosmos;

CosmosClient client = new CosmosClient(
    "https://cosmos-contoso.documents.azure.com:443/",
    new DefaultAzureCredential());

# Python
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

client = CosmosClient("https://cosmos-contoso.documents.azure.com:443/",
                      credential=DefaultAzureCredential())
```

**Disabling key-based authentication** forces every client to use Microsoft Entra ID. It sets the account property `disableLocalAuth` (portal option when creating the account, Bicep `disableLocalAuth: true`, or CLI):

```bash
az resource update --resource-group rg-contoso \
  --name cosmos-contoso \
  --resource-type "Microsoft.DocumentDB/databaseAccounts" \
  --set properties.disableLocalAuth=true
```

After that, key-based requests fail. Changing the account requires an Azure role with `Microsoft.DocumentDb/databaseAccounts/*/write`.

**Rotating keys without downtime.** If the application uses the primary key: regenerate the secondary key, validate it, switch the application to the secondary key, then regenerate the primary key (and the reverse when it uses the secondary key). Regeneration can take from one minute to several hours on large accounts.

```bash
az cosmosdb keys list --resource-group rg-contoso --name cosmos-contoso --type read-only-keys
az cosmosdb keys regenerate --resource-group rg-contoso --name cosmos-contoso --key-kind secondary
```

`--key-kind` accepts `primary`, `secondary`, `primaryReadonly` and `secondaryReadonly`. The **safe key rotation** feature (capabilities `EnableAccountKeysLastUsageCheckInDisableLocalAuth` and `EnableKeyCheckBeforeRegenerationPreview`) blocks a key regeneration, or the disabling of local authentication, when the key was used in the last 12 hours.

> **Exam trap.** Read-only keys still read **all** data in the account. For "read only this container" or "no secrets in the configuration", the answer is Microsoft Entra ID with a data plane role scoped to the container, not a read-only key.

<!-- section: authorization | objectives: 2.1.2 -->
## Authorization: control plane and data plane

Azure Cosmos DB has two separate permission systems:

| | Control plane | Data plane |
| --- | --- | --- |
| Covers | Account settings, keys and connection strings, databases and containers, throughput, backup and restore, data transfer jobs, role definitions and assignments | Item create, read, replace, upsert, patch, delete; queries; change feed; stored procedures; conflict feed |
| System | **Azure RBAC** (`Microsoft.Authorization` role assignments) | **Native Cosmos DB RBAC** (`sqlRoleDefinitions`, `sqlRoleAssignments` stored in the account) |
| Managed with | Portal Access control (IAM), `az role assignment create` | CLI, PowerShell, Bicep, ARM. **Not the portal** |

Built-in **control plane** roles:

| Role | Allows |
| --- | --- |
| DocumentDB Account Contributor | Manage Azure Cosmos DB accounts |
| Cosmos DB Operator | Manage accounts, databases and containers, but **no** keys, connection strings or data access, and no data plane role management |
| Cosmos DB Account Reader Role | Read account metadata and the **read-only keys** |
| CosmosBackupOperator | Submit a restore request (periodic mode) and change backup retention |
| CosmosRestoreOperator | Perform a restore for an account in continuous backup mode |

Built-in **data plane** roles:

| Role | ID | Data actions |
| --- | --- | --- |
| Cosmos DB Built-in Data Reader | `00000000-0000-0000-0000-000000000001` | `readMetadata`, `items/read`, `executeQuery`, `readChangeFeed` |
| Cosmos DB Built-in Data Contributor | `00000000-0000-0000-0000-000000000002` | `readMetadata`, `containers/*`, `containers/items/*` |

Individual data actions all start with `Microsoft.DocumentDB/databaseAccounts/`: `readMetadata`, then under `sqlDatabases/containers/`: `items/create`, `items/read` (point read), `items/replace`, `items/upsert`, `items/delete`, `items/unmask`, `executeQuery`, `readChangeFeed`, `executeStoredProcedure`, `manageConflicts`. Rules to remember:

- `readMetadata` is required for **any** SDK access (the SDK reads account regions, partition key definitions and partition addresses at startup). It doesn't allow managing throughput.
- Running queries through the SDK needs both `executeQuery` and `readChangeFeed`.
- `notDataActions` isn't supported: anything not listed is denied.
- Scopes: the account (`/`), a database (`/dbs/<database>`) or a container (`/dbs/<database>/colls/<container>`).
- Creating role definitions and assignments needs control plane permissions (`sqlRoleDefinitions/write`, `sqlRoleAssignments/write`).

Custom role for a reporting service that reads one container by point reads and queries:

```json
{
  "RoleName": "Orders Reader",
  "Type": "CustomRole",
  "AssignableScopes": [ "/" ],
  "Permissions": [
    {
      "DataActions": [
        "Microsoft.DocumentDB/databaseAccounts/readMetadata",
        "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/read",
        "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/executeQuery",
        "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/readChangeFeed"
      ]
    }
  ]
}
```

```bash
az cosmosdb sql role definition create --resource-group rg-contoso \
  --account-name cosmos-contoso --body "@orders-reader.json"

az cosmosdb sql role assignment create --resource-group rg-contoso \
  --account-name cosmos-contoso \
  --role-definition-id "<role-definition-id>" \
  --principal-id "<managed-identity-object-id>" \
  --scope "/dbs/sales/colls/orders"
```

Microsoft recommends separate identities for control plane and data plane work, so that an application that reads data can't also change the account.

> **Exam trap.** Azure RBAC roles such as Owner, Contributor or DocumentDB Account Contributor give **no** Microsoft Entra data access; what they can do is list the keys (which bypass data plane roles unless local authentication is disabled). An application using `DefaultAzureCredential` that gets 403 on reads is missing a **data plane** role assignment, made with `az cosmosdb sql role assignment create`.

<!-- section: network-security | objectives: 2.1.3 -->
## Network security

Every request needs a valid authorization token. Network rules add a second check: once any IP or virtual network rule exists, only allowed sources get an answer; others receive **403 Forbidden** (the connection itself isn't refused). Changes can take up to **15 minutes** to propagate.

| Control | How it works | Key facts |
| --- | --- | --- |
| IP firewall | Allowed public IPs or CIDR ranges (`ipRules`; CLI `--ip-range-filter`) | Private IPs are rejected in the list. **Accept connections from within Azure datacenters** adds `0.0.0.0`: every Azure IP, including other customers' subscriptions. **Add Azure Portal Middleware IPs** keeps portal features working |
| Virtual network service endpoint | Enable `Microsoft.AzureCosmosDB` on the subnet, then add the subnet as a virtual network rule | Traffic arrives with the subnet identity, no longer a public IP, so existing IP rules for those machines stop matching. Up to 256 subnets. Peered networks aren't included automatically. Same Microsoft Entra tenant |
| Private endpoint (Private Link) | Private IPs in your subnet; target subresource `Sql`; private DNS zone `privatelink.documents.azure.com` | One IP for the global endpoint plus **one per region**. Works from peered networks and on-premises over VPN or ExpressRoute. Up to 200 per account |
| `publicNetworkAccess: Disabled` | Blocks all public and service endpoint traffic | Takes precedence over every IP and virtual network rule, including the Azure datacenters option. Only private endpoints remain |
| Network security perimeter | Defines a network boundary around the account | Isolates it from public internet access |

Rules for combining them:

- No firewall rules at all: any network can reach the account.
- With private endpoints and no public rules, the account is reachable only through the private endpoints. If all private endpoints are later deleted and `publicNetworkAccess` isn't `Disabled`, the account is open again: set `Disabled` at account creation to avoid any public window.
- With a private DNS zone group, the zone is updated automatically when regions are added or removed; with custom DNS, you add and remove the records yourself. DNS resolution decides whether traffic uses the private endpoint.
- Direct mode ports: TCP 10000 to 20000 with service endpoints, the full range 0 to 65535 with private endpoints.
- Adding a private endpoint to an existing account causes about five minutes of downtime, unless you first add IP or virtual network rules for the clients, wait 10 minutes, create the endpoint, then remove those rules.
- Data Explorer in the portal needs your client IP in the firewall.

```bash
az network vnet subnet update --resource-group rg-contoso \
  --vnet-name vnet-app --name snet-api \
  --service-endpoints Microsoft.AzureCosmosDB

az cosmosdb network-rule add --resource-group rg-contoso \
  --name cosmos-contoso --virtual-network vnet-app --subnet snet-api
```

Transport and storage: enforce a minimum TLS version on the account, data at rest is encrypted with service-managed keys or customer-managed keys in Azure Key Vault, and Always Encrypted encrypts chosen properties on the client side.

> **Exam trap.** "Only the App Service in the integrated subnet may connect, and the account must have no public endpoint" means a private endpoint plus `publicNetworkAccess` set to `Disabled`. A service endpoint still uses the account's public endpoint, and the datacenters option opens the account to all of Azure.

<!-- section: dynamic-data-masking | objectives: 2.1.4 -->
## Dynamic data masking

Dynamic data masking (DDM) is a server-side, policy-based feature: values are masked **at query time** for identities without the unmask permission, while the stored data stays unchanged.

Setup order:

1. Enable **Dynamic Data Masking** on the account (**Settings** > **Features**). It can take up to 15 minutes, and it **can't be turned off** afterward (removing all paths from the policy stops masking).
2. Grant data plane roles. Privileged readers need the `items/unmask` data action (Cosmos DB Built-in Data Contributor includes it through `items/*`; Built-in Data Reader doesn't). DDM requires Microsoft Entra ID: **account keys aren't supported**.
3. Define the container's masking policy (container **Settings** > **Masking Policy**).

| Strategy | Effect | Example |
| --- | --- | --- |
| `Default` | Strings become `XXXX`, numbers `0`, booleans `false` | `Redmond` becomes `XXXX` |
| `MaskSubstring` | Masks `length` characters from `startPosition` | Start 3, length 5: `Washington` becomes `WasXXXXXon` |
| `Email` | Keeps the first letter and the domain ending | `alpha@microsoft.com` becomes `aXXXX@XXXXXXXXX.com` |

```json
{
  "dataMaskingPolicy": {
    "includedPaths": [
      { "path": "/" },
      { "path": "/contact/email", "strategy": "Email" },
      { "path": "/card/number", "strategy": "MaskSubstring", "startPosition": 0, "length": 12 }
    ],
    "excludedPaths": [
      { "path": "/id" },
      { "path": "/customerId" },
      { "path": "/orders/[]/status" }
    ]
  }
}
```

Behavior and limits:

- A path without a strategy uses `Default`. Excluded paths are allowed only when `/` is included. Array elements use `[]`; a path can't end with `[]` or target an index such as `[1]`. `MaskSubstring` supports only positive start positions.
- Masking applies to **read and query responses** only. Create, replace, upsert and patch work on the real data and can return unmasked values in their responses.
- Users without unmask can't read the **change feed** (either mode).
- Backups, materialized views and the stored data are unmasked. Fabric mirroring and the analytical store aren't supported by default on DDM accounts.
- If `id` or the partition key is masked, the Data Explorer document view isn't available.
- Queries on masked paths cost slightly more RUs. Enabling the feature is free until a policy is applied.
- Complex queries can still let a user infer values: DDM limits exposure, it doesn't replace access control.

> **Exam trap.** DDM isn't encryption and doesn't protect against a key holder: it needs Microsoft Entra ID and data plane roles. To let support agents see masked emails while auditors see clear values, give auditors a role with `items/unmask` and support agents a role without it.

<!-- section: key-points -->
## Key points

- Prefer Microsoft Entra ID with managed identities; `disableLocalAuth=true` blocks keys; rotate keys by switching to the other key first; read-only keys still read everything.
- Control plane = Azure RBAC (Cosmos DB Operator manages without keys or data). Data plane = native roles Built-in Data Reader (`...001`) and Data Contributor (`...002`), assigned with `az cosmosdb sql role assignment create` at `/`, database or container scope, never in the portal.
- `readMetadata` is always needed; queries need `executeQuery` and `readChangeFeed`; no `notDataActions`.
- Network: IP firewall (`0.0.0.0` = all of Azure), service endpoints (subnet identity, public endpoint), private endpoints (`Sql`, `privatelink.documents.azure.com`, one IP per region plus global), `publicNetworkAccess: Disabled` overrides all rules; blocked requests get 403.
- DDM: enable once (irreversible), Entra ID only, `items/unmask` to see clear values, strategies Default, MaskSubstring, Email; reads and queries only.
