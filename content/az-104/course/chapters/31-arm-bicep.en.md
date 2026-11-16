ARM templates (JSON) and Bicep files describe the resources you want; Azure Resource Manager works out how to create them. The exam asks you to read a template, complete a missing line, pick the right deployment command and predict the result of a deployment.

<!-- section: template-structure | objectives: 3.1.1 -->
## Reading a template or a Bicep file

Both formats are **declarative** and **idempotent**: deploying the same file twice gives the same result, and resources that already match are left unchanged. Bicep is a simpler syntax that is compiled to ARM JSON.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageSku": { "type": "string", "defaultValue": "Standard_LRS",
                    "allowedValues": [ "Standard_LRS", "Standard_ZRS" ] }
  },
  "variables": {
    "storageName": "[concat('st', uniqueString(resourceGroup().id))]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-05-01",
      "name": "[variables('storageName')]",
      "location": "[resourceGroup().location]",
      "sku": { "name": "[parameters('storageSku')]" },
      "kind": "StorageV2",
      "properties": { "supportsHttpsTrafficOnly": true }
    }
  ],
  "outputs": {
    "blobEndpoint": { "type": "string",
      "value": "[reference(variables('storageName')).primaryEndpoints.blob]" }
  }
}
```

The same deployment in Bicep:

```bicep
@allowed([ 'Standard_LRS', 'Standard_ZRS' ])
param storageSku string = 'Standard_LRS'

var storageName = 'st${uniqueString(resourceGroup().id)}'

resource st 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: resourceGroup().location
  sku: { name: storageSku }
  kind: 'StorageV2'
  properties: { supportsHttpsTrafficOnly: true }
}

output blobEndpoint string = st.properties.primaryEndpoints.blob
```

| Section | Role | Required in JSON |
| --- | --- | --- |
| `$schema`, `contentVersion` | File format and your own version number | Yes |
| `parameters` | Values supplied at deployment time | No |
| `variables` | Values computed once and reused | No |
| `resources` | What to deploy: `type`, `apiVersion`, `name`, usually `location` and `properties` | Yes |
| `outputs` | Values returned after the deployment | No |

In JSON, anything between square brackets is an **expression** evaluated at deployment: `"[parameters('x')]"`. Bicep needs no brackets, and uses `'text ${expression}'` for string interpolation.

Functions you must recognize:

| Function | Returns |
| --- | --- |
| `resourceGroup().location`, `resourceGroup().id` | Region and ID of the target resource group |
| `subscription().subscriptionId` | The target subscription |
| `uniqueString(resourceGroup().id)` | A deterministic 13-character hash: same input, same value. Used for globally unique names |
| `concat('a', 'b')`, `format('{0}-{1}', a, b)` | Built strings |
| `resourceId('Microsoft.Network/virtualNetworks', 'vnet1')` | The ID of a resource. Doesn't create a dependency by itself |
| `reference(...)` | The runtime properties of a resource. Creates an implicit dependency when the resource is in the same template |
| `copyIndex()` | The index of the current loop iteration, starting at 0; `copyIndex(1)` starts at 1 |

<!-- section: modify-arm | objectives: 3.1.2 -->
## Modifying an ARM template

**Parameters.** Types: `string`, `securestring`, `int`, `bool`, `object`, `secureObject`, `array`. Useful attributes: `defaultValue`, `allowedValues`, `minValue`, `maxValue`, `minLength`, `maxLength`, `metadata.description`. A `securestring` isn't logged or shown in the deployment history. A parameter without default value must be supplied.

**Dependencies.** Resource Manager deploys resources in parallel unless one depends on another:

```json
{
  "type": "Microsoft.Network/networkInterfaces",
  "name": "nic1",
  "dependsOn": [ "[resourceId('Microsoft.Network/virtualNetworks', 'vnet1')]" ]
}
```

**Loops.** The `copy` element creates several instances:

```json
{
  "type": "Microsoft.Compute/disks",
  "name": "[concat('disk', copyIndex(1))]",
  "copy": { "name": "diskLoop", "count": "[parameters('diskCount')]",
            "mode": "serial", "batchSize": 2 }
}
```

`count` is the number of iterations. The default mode is `parallel`; `serial` with `batchSize` limits how many instances are deployed at a time.

**Conditions.** `"condition": "[equals(parameters('env'), 'prod')]"` deploys the resource only when the expression is true.

**Child resources** are named `parent/child` and typed `Microsoft.Network/virtualNetworks/subnets`, or nested in the parent's `resources` array.

<!-- section: modify-bicep | objectives: 3.1.3 -->
## Modifying a Bicep file

```bicep
targetScope = 'resourceGroup'          // default; also subscription, managementGroup, tenant

@description('Environment name')
@allowed([ 'dev', 'prod' ])
param env string = 'dev'

@secure()
param adminPassword string

@minValue(1)
@maxValue(5)
param vmCount int = 2

param subnetNames array = [ 'web', 'app' ]

// Existing resource in another resource group: referenced, not deployed
resource hub 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: 'vnet-hub'
  scope: resourceGroup('RG-Network')
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: 'vnet-${env}'
  location: resourceGroup().location
  properties: {
    addressSpace: { addressPrefixes: [ '10.20.0.0/16' ] }
    subnets: [for (name, i) in subnetNames: {
      name: name
      properties: { addressPrefix: '10.20.${i}.0/24' }
    }]
  }
}

// Conditional resource
resource pip 'Microsoft.Network/publicIPAddresses@2024-05-01' = if (env == 'prod') {
  name: 'pip-${env}'
  location: resourceGroup().location
  sku: { name: 'Standard' }
  properties: { publicIPAllocationMethod: 'Static' }
}

// Module: another Bicep file deployed as a unit
module storage 'storage.bicep' = {
  name: 'storageDeploy'
  params: { env: env }
}

output vnetId string = vnet.id
output pipId string = env == 'prod' ? pip.id : ''
```

| Bicep element | Meaning |
| --- | --- |
| `param`, `var`, `resource`, `module`, `output` | The five declarations |
| Decorators | `@description`, `@allowed`, `@secure`, `@minLength`, `@maxLength`, `@minValue`, `@maxValue`, `@batchSize(n)` on loops |
| Symbolic name (`vnet`) | Name used inside the file; `vnet.id`, `vnet.name`, `vnet.properties...` |
| `existing` | References a resource that is already deployed; add `scope` if it is in another resource group |
| `parent: vnet` | Declares a child resource of `vnet` |
| `[for x in list: {...}]`, `[for i in range(0, n): {...}]` | Loops; parallel by default |
| `= if (condition) {...}` | Conditional deployment |
| `condition ? a : b` | Conditional value |

Bicep creates an **implicit dependency** whenever a resource references another one through its symbolic name or `parent`; an explicit `dependsOn` is rarely needed. Resource groups are subscription-level resources: creating one in Bicep requires `targetScope = 'subscription'`.

<!-- section: deploy-templates | objectives: 3.1.4 -->
## Deploying templates and Bicep files

The command depends on the **scope** of the deployment:

| Scope | Azure CLI | Azure PowerShell |
| --- | --- | --- |
| Resource group | `az deployment group create` | `New-AzResourceGroupDeployment` |
| Subscription | `az deployment sub create` | `New-AzSubscriptionDeployment` |
| Management group | `az deployment mg create` | `New-AzManagementGroupDeployment` |
| Tenant | `az deployment tenant create` | `New-AzTenantDeployment` |

```bash
az deployment group create --resource-group RG1 --template-file main.bicep \
  --parameters env=prod vmCount=3
az deployment group create --resource-group RG1 --parameters main.bicepparam
az deployment group what-if --resource-group RG1 --template-file main.bicep
az deployment group create --resource-group RG1 --template-file main.bicep --confirm-with-what-if
```

```powershell
New-AzResourceGroupDeployment -ResourceGroupName RG1 -TemplateFile main.bicep `
  -TemplateParameterFile main.parameters.json -WhatIf
```

- The same commands accept `.json` and `.bicep` files. Subscription and higher scopes require `--location` for the deployment metadata.
- **Parameters** come inline, from a JSON parameters file, or from a `.bicepparam` file. A `.bicepparam` file starts with `using './main.bicep'`, so the template file isn't passed again.
- **What-if** shows what would be created, modified or deleted, without changing anything.
- **Deployment modes** (resource group deployments):

| Mode | Resources in the resource group that aren't in the template |
| --- | --- |
| **Incremental** (default) | Left unchanged |
| **Complete** | **Deleted** |

In both modes, resources that are in the template are created or updated to match it. In incremental mode, a property omitted from the template for an existing resource may be reset to its default: the template describes the full desired state of each resource it contains. Microsoft now recommends **deployment stacks** over complete mode to remove resources that left the template. Complete mode isn't available for subscription-level deployments and deletes nothing in a locked resource group.

- Each deployment is recorded in the **Deployments** history of its scope, with its template, parameters and outputs.
- A **template spec** stores a template as an Azure resource, versioned and shared with Azure RBAC; deploy it with `--template-spec <version ID>`.
- In the portal, **Deploy a custom template** accepts a template that you paste, load or pick from quickstart templates.
- The person who deploys needs write permission on the resources and `Microsoft.Resources/deployments/*` (Contributor has both).

<!-- section: export-convert | objectives: 3.1.5 -->
## Exporting templates and converting to Bicep

Two exports that don't give the same thing:

| Export from | Content | Command |
| --- | --- | --- |
| The **resource group** or a resource (*Export template*) | A template generated from the **current state** of the selected resources, including manual changes | `az group export`, `Export-AzResourceGroup` |
| The **deployment history** (Deployments > a deployment > Template) | The **exact template that was deployed**, with its parameters; later changes aren't in it | `az deployment group export`, `Save-AzResourceGroupDeploymentTemplate` |

Limits of the export from a resource group: 200 resources at most; some resource types aren't exported (a warning lists them); the template contains hard-coded values and many generated parameters, and secrets such as passwords are missing. Review it before reuse.

Conversions:

```bash
az bicep decompile --file azuredeploy.json   # JSON -> Bicep (best effort: fix the warnings)
az bicep build --file main.bicep             # Bicep -> JSON
```

The portal can also export directly in Bicep. Typical path for resources created by hand: export from the resource group, decompile to Bicep, clean up names and parameters, then deploy to a test resource group.

<!-- section: key-points -->
## Key points

- Declarative and idempotent. JSON expressions are in square brackets; Bicep uses symbolic names and `${}`.
- `uniqueString(resourceGroup().id)` gives the same value for the same resource group. `copyIndex()` starts at 0.
- Bicep: `existing` references without deploying; `if (...)` conditions; `[for ...]` loops; implicit dependencies.
- `az deployment group | sub | mg | tenant create`; `what-if` previews.
- Incremental keeps other resources; Complete deletes what isn't in the template.
- Export from the resource group = current state; from the deployment history = what was deployed. `az bicep decompile` converts JSON to Bicep.
