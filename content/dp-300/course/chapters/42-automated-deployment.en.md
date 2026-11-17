Azure SQL resources are deployed repeatably with declarative templates (ARM JSON or Bicep) or with imperative scripts (Azure PowerShell, Azure CLI). Exam questions show a fragment to complete (a resource type, a SKU, a parameter, a cmdlet), ask for the order of commands, or ask where to find why a deployment failed.

<!-- section: templates | objectives: 4.2.1 -->
## Deploying with ARM and Bicep templates

Templates are **declarative**: you describe the end state and Azure Resource Manager creates or updates resources to match it, in parallel where dependencies allow. Deploying the same template again is safe (idempotent). Bicep compiles to ARM JSON (`az bicep build`); existing JSON converts with `az bicep decompile`.

| Resource | Type |
| --- | --- |
| Logical server | `Microsoft.Sql/servers` |
| Database | `Microsoft.Sql/servers/databases` (child: `parent: sqlServer`) |
| Elastic pool | `Microsoft.Sql/servers/elasticPools` |
| Server firewall rule | `Microsoft.Sql/servers/firewallRules` |
| Managed instance | `Microsoft.Sql/managedInstances` (needs a delegated subnet) |
| SQL Server on Azure VM registration | `Microsoft.SqlVirtualMachine/sqlVirtualMachines` (alongside `Microsoft.Compute/virtualMachines`) |

```bicep
@description('Location for all resources.')
param location string = resourceGroup().location
param serverName string = 'sql-${uniqueString(resourceGroup().id)}'
param administratorLogin string
@secure()
param administratorLoginPassword string

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: serverName
  location: location
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
  }
}

resource salesDb 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: 'SalesDB'
  location: location
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 4
  }
  properties: {
    autoPauseDelay: 60
    minCapacity: json('0.5')
    maxSizeBytes: 34359738368
    zoneRedundant: false
    requestedBackupStorageRedundancy: 'Zone'
  }
}

output serverFqdn string = sqlServer.properties.fullyQualifiedDomainName
```

| Element | Rule |
| --- | --- |
| `sku.name` | `GP_Gen5` (provisioned General Purpose), `GP_S_Gen5` (serverless), `BC_Gen5`, `HS_Gen5`, or DTU names (`Basic`, `S0`, `P1`); `capacity` = vCores or DTUs |
| `autoPauseDelay`, `minCapacity` | Serverless only; `autoPauseDelay: -1` disables auto-pause |
| `requestedBackupStorageRedundancy` | `Local`, `Zone`, `Geo`, `GeoZone` |
| `@secure()` | The value isn't logged or shown in the deployment history |
| `parent` / child names | A child resource needs its parent: missing parent = `ParentResourceNotFound` |
| `dependsOn` | Implicit in Bicep when a resource references another (symbolic name); explicit in JSON |

The same database in ARM JSON (fragment of `resources`):

```json
{
  "type": "Microsoft.Sql/servers/databases",
  "apiVersion": "2023-08-01",
  "name": "[format('{0}/{1}', parameters('serverName'), 'SalesDB')]",
  "location": "[parameters('location')]",
  "sku": { "name": "GP_Gen5", "tier": "GeneralPurpose", "family": "Gen5", "capacity": 2 },
  "dependsOn": [ "[resourceId('Microsoft.Sql/servers', parameters('serverName'))]" ]
}
```

To keep a password out of the template and the pipeline, reference a Key Vault secret from the parameter file (the vault must allow **Azure Resource Manager for template deployment**, `enabledForTemplateDeployment`), or prefer **Microsoft Entra-only authentication** with an `administrators` block (`azureADOnlyAuthentication: true`, `administratorType: 'ActiveDirectory'`, `login`, `sid`, `principalType`).

```bash
az deployment group create --resource-group rg-sales \
  --template-file main.bicep --parameters main.bicepparam
az deployment group what-if --resource-group rg-sales \
  --template-file main.bicep --parameters main.bicepparam
```

| Mode | Effect on resources of the group that aren't in the template |
| --- | --- |
| Incremental (default) | Left unchanged |
| Complete | Deleted |

> **Exam trap.** Changing the SKU in the template and redeploying scales the existing database (incremental mode updates it); it doesn't create a second one. Using `--mode Complete` on a shared resource group can delete resources other teams deployed.

<!-- section: powershell | objectives: 4.2.2 -->
## Deploying with Azure PowerShell

The Az.Sql module creates resources imperatively, one cmdlet per resource, in dependency order: resource group, server, firewall rule, database.

```powershell
$cred = Get-Credential   # server admin login and password
New-AzResourceGroup -Name rg-sales -Location westeurope
New-AzSqlServer -ResourceGroupName rg-sales -ServerName sql-sales-01 `
  -Location westeurope -SqlAdministratorCredentials $cred
New-AzSqlServerFirewallRule -ResourceGroupName rg-sales -ServerName sql-sales-01 `
  -FirewallRuleName AllowOffice -StartIpAddress 203.0.113.10 -EndIpAddress 203.0.113.10
New-AzSqlDatabase -ResourceGroupName rg-sales -ServerName sql-sales-01 -DatabaseName SalesDB `
  -Edition GeneralPurpose -VCore 2 -ComputeGeneration Gen5 -ComputeModel Serverless `
  -AutoPauseDelayInMinutes 60 -MinimumCapacity 0.5 -BackupStorageRedundancy Zone
```

| Cmdlet | Use |
| --- | --- |
| `New-AzSqlServer`, `Set-AzSqlServer` | Create or change a logical server |
| `New-AzSqlDatabase`, `Set-AzSqlDatabase` | Create or scale a database (`-Edition`, `-VCore`, `-ComputeGeneration`, `-ComputeModel`, `-RequestedServiceObjectiveName`, `-MaxSizeBytes`, `-ElasticPoolName`, `-ZoneRedundant`) |
| `New-AzSqlElasticPool` | Create an elastic pool |
| `New-AzSqlServerFirewallRule` | Server-level IP firewall rule |
| `New-AzSqlInstance` | Create a managed instance (`-SubnetId`, `-VCore`, `-StorageSizeInGB`, `-LicenseType`, `-AdministratorCredential`) |
| `New-AzSqlVM` | Register a SQL Server VM with the SQL IaaS Agent extension (`-LicenseType PAYG`, `AHUB` or `DR`) |
| `New-AzResourceGroupDeployment` | Deploy an ARM or Bicep template (`-TemplateFile`, `-TemplateParameterFile`, `-WhatIf`, `-Mode Complete`) |
| `Test-AzResourceGroupDeployment` | Validate a template without deploying |

> **Exam tip.** `-SqlAdministratorCredentials` takes a `PSCredential` (from `Get-Credential`), not a plain-text password. Long operations (managed instance creation) accept `-AsJob` to return immediately.

<!-- section: cli | objectives: 4.2.3 -->
## Deploying with Azure CLI

```bash
az group create --name rg-sales --location westeurope
az sql server create --resource-group rg-sales --name sql-sales-01 \
  --location westeurope --admin-user sqladmin --admin-password "$SQL_ADMIN_PASSWORD"
az sql server firewall-rule create --resource-group rg-sales --server sql-sales-01 \
  --name AllowOffice --start-ip-address 203.0.113.10 --end-ip-address 203.0.113.10
az sql db create --resource-group rg-sales --server sql-sales-01 --name SalesDB \
  --edition GeneralPurpose --family Gen5 --capacity 2 \
  --compute-model Serverless --auto-pause-delay 60 --min-capacity 0.5 \
  --backup-storage-redundancy Zone
```

| Command | Use |
| --- | --- |
| `az sql server create` | Logical server (`--admin-user`/`--admin-password`, or `--enable-ad-only-auth` with `--external-admin-principal-type`, `--external-admin-name`, `--external-admin-sid`) |
| `az sql db create` / `az sql db update` | Database: `--edition` (`-e`), `--family` (`-f`), `--capacity` (`-c`) or `--service-objective` (for example `GP_S_Gen5_8`, `S0`), `--compute-model`, `--auto-pause-delay`, `--min-capacity`, `--max-size`, `--elastic-pool`, `--zone-redundant`, `--backup-storage-redundancy` |
| `az sql elastic-pool create` | Elastic pool |
| `az sql server firewall-rule create` | Server-level IP rule (`0.0.0.0` to `0.0.0.0` = allow Azure services) |
| `az sql mi create` | Managed instance (`--subnet`, `--capacity`, `--storage`, `--edition`, `--license-type`); add `--no-wait` for long operations |
| `az sql vm create` | Register a SQL Server VM with the SQL IaaS Agent extension (`--license-type PAYG`, `AHUB` or `DR`) |
| `az deployment group create` / `what-if` / `validate` | Deploy, preview or validate a template |
| `az sql db list-editions --location westeurope -o table` | SKUs available in a region |

> **Exam trap.** Without a unit, `--max-size` is read in bytes: write `--max-size 32GB`. `--edition GeneralPurpose` alone isn't enough for a vCore database: give `--family` and `--capacity`, or a full `--service-objective`.

<!-- section: monitor-troubleshoot | objectives: 4.2.4 -->
## Monitoring and troubleshooting deployments

A template deployment is checked twice: **validation** (preflight: template syntax, parameter values and resource provider checks, before anything is created) and then **deployment** of each resource. Validation errors create nothing; deployment errors can leave some resources created. Fix the cause and redeploy: incremental mode creates only what's missing.

Where to look:

| Tool | Shows |
| --- | --- |
| Portal: resource group > **Settings > Deployments** | Every deployment, its status, inputs, outputs, failed operations and error details; **Redeploy** |
| Activity log | Control-plane operations with caller and status, including deployments and failures |
| `az deployment group show` / `list` | Deployment status and `properties.error` |
| `az deployment operation group list` | Each resource operation of a deployment, with status codes (and request/response when debug logging was on) |
| `Get-AzResourceGroupDeployment`, `Get-AzResourceGroupDeploymentOperation` | Same in PowerShell (without request and response content) |
| `az deployment group what-if`, `-WhatIf` | Changes a deployment would make, before you run it |

```bash
az deployment group show --resource-group rg-sales --name main \
  --query properties.error
az deployment operation group list --resource-group rg-sales --name main \
  --query "[?properties.provisioningState=='Failed'].properties.statusMessage"
```

```powershell
New-AzResourceGroupDeployment -Name main -ResourceGroupName rg-sales `
  -TemplateFile main.bicep -DeploymentDebugLogLevel All
Get-AzResourceGroupDeploymentOperation -DeploymentName main -ResourceGroupName rg-sales
```

Debug logging is enabled only from PowerShell (`-DeploymentDebugLogLevel All`, `RequestContent` or `ResponseContent`); Azure CLI can't enable it but reads the logged request and response. It can record secrets: delete the deployment from history afterward (`Remove-AzResourceGroupDeployment`).

| Error | Cause | Fix |
| --- | --- | --- |
| `DeploymentFailed` | Generic wrapper | Read the inner error code |
| `InvalidTemplate` | Syntax, wrong type or parameter value | Validate, check the template |
| `ParentResourceNotFound` / `NotFound` | Database deployed before its server | `parent` or `dependsOn` |
| `SkuNotAvailable`, `OperationNotAllowed` | SKU not offered in the region or not allowed (quota, SKU rules) | Pick another SKU or region (`az sql db list-editions`), request quota |
| `ResourceQuotaExceeded` | Subscription or regional quota (for example vCores) | Request a quota increase |
| `AuthorizationFailed` | Missing role (for example SQL Server Contributor) or unregistered resource provider | Assign the role, register `Microsoft.Sql` |
| `RequestDisallowedByPolicy` | An Azure Policy assignment denies the resource (for example public network access, region) | Comply with or get an exemption from the policy |
| `Conflict` | Operation not allowed in the resource's current state (another operation running) | Wait and retry |
| `DeploymentQuotaExceeded` | 800 deployments in the group's history | History cleanup is automatic from 700 entries (down to 600) unless blocked by a `CanNotDelete` lock or missing `Microsoft.Resources/deployments/delete` permission; delete old deployments |

A server name must be globally unique (it becomes `name.database.windows.net`): a name already taken fails the deployment, and `uniqueString()` avoids it.

> **Exam trap.** `DeploymentFailed` never explains the problem by itself: open the deployment's failed operations (portal Deployments, `az deployment operation group list`) to find the real error code.

<!-- section: key-points -->
## Key points

- Bicep and ARM templates are declarative and idempotent; redeploying with a new SKU scales the database; incremental mode is the default, complete mode deletes what isn't in the template.
- Types: `Microsoft.Sql/servers`, `servers/databases`, `servers/elasticPools`, `servers/firewallRules`, `managedInstances`, `Microsoft.SqlVirtualMachine/sqlVirtualMachines`; serverless = `GP_S_Gen5` + `autoPauseDelay` + `minCapacity`.
- Secrets: `@secure()` parameters, Key Vault references, or Microsoft Entra-only authentication.
- PowerShell: `New-AzSqlServer` (PSCredential), `New-AzSqlDatabase`, `New-AzSqlInstance`, `New-AzSqlVM`, `New-AzResourceGroupDeployment`.
- CLI: `az sql server create`, `az sql db create` (`-e -f -c` or `--service-objective`), `az sql mi create --no-wait`, `az deployment group create | what-if | validate`.
- Troubleshoot from the deployment's failed operations and the activity log; debug logging from PowerShell only; 800-deployment history limit, cleaned automatically.
