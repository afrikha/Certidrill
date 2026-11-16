Les modèles ARM (JSON) et les fichiers Bicep décrivent les ressources voulues ; Azure Resource Manager détermine comment les créer. L'examen vous demande de lire un modèle, de compléter une ligne manquante, de choisir la bonne commande de déploiement et de prévoir le résultat d'un déploiement.

<!-- section: template-structure | objectives: 3.1.1 -->
## Lire un modèle ou un fichier Bicep

Les deux formats sont **déclaratifs** et **idempotents** : déployer deux fois le même fichier donne le même résultat, et les ressources déjà conformes restent inchangées. Bicep est une syntaxe plus simple, compilée en JSON ARM.

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

Le même déploiement en Bicep :

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

| Section | Rôle | Obligatoire en JSON |
| --- | --- | --- |
| `$schema`, `contentVersion` | Format du fichier et votre propre numéro de version | Oui |
| `parameters` | Valeurs fournies au moment du déploiement | Non |
| `variables` | Valeurs calculées une fois et réutilisées | Non |
| `resources` | Ce qu'il faut déployer : `type`, `apiVersion`, `name`, en général `location` et `properties` | Oui |
| `outputs` | Valeurs renvoyées après le déploiement | Non |

En JSON, tout ce qui est entre crochets est une **expression** évaluée au déploiement : `"[parameters('x')]"`. Bicep n'a pas besoin de crochets et utilise `'texte ${expression}'` pour l'interpolation de chaînes.

Fonctions à reconnaître :

| Fonction | Renvoie |
| --- | --- |
| `resourceGroup().location`, `resourceGroup().id` | La région et l'ID du groupe de ressources cible |
| `subscription().subscriptionId` | L'abonnement cible |
| `uniqueString(resourceGroup().id)` | Un hachage déterministe de 13 caractères : même entrée, même valeur. Sert aux noms uniques au monde |
| `concat('a', 'b')`, `format('{0}-{1}', a, b)` | Des chaînes construites |
| `resourceId('Microsoft.Network/virtualNetworks', 'vnet1')` | L'ID d'une ressource. Ne crée pas de dépendance à elle seule |
| `reference(...)` | Les propriétés d'une ressource à l'exécution. Crée une dépendance implicite quand la ressource est dans le même modèle |
| `copyIndex()` | L'index de l'itération en cours, à partir de 0 ; `copyIndex(1)` commence à 1 |

<!-- section: modify-arm | objectives: 3.1.2 -->
## Modifier un modèle ARM

**Paramètres.** Types : `string`, `securestring`, `int`, `bool`, `object`, `secureObject`, `array`. Attributs utiles : `defaultValue`, `allowedValues`, `minValue`, `maxValue`, `minLength`, `maxLength`, `metadata.description`. Un `securestring` n'est ni journalisé ni affiché dans l'historique des déploiements. Un paramètre sans valeur par défaut doit être fourni.

**Dépendances.** Resource Manager déploie les ressources en parallèle, sauf si l'une dépend d'une autre :

```json
{
  "type": "Microsoft.Network/networkInterfaces",
  "name": "nic1",
  "dependsOn": [ "[resourceId('Microsoft.Network/virtualNetworks', 'vnet1')]" ]
}
```

**Boucles.** L'élément `copy` crée plusieurs instances :

```json
{
  "type": "Microsoft.Compute/disks",
  "name": "[concat('disk', copyIndex(1))]",
  "copy": { "name": "diskLoop", "count": "[parameters('diskCount')]",
            "mode": "serial", "batchSize": 2 }
}
```

`count` est le nombre d'itérations. Le mode par défaut est `parallel` ; `serial` avec `batchSize` limite le nombre d'instances déployées en même temps.

**Conditions.** `"condition": "[equals(parameters('env'), 'prod')]"` ne déploie la ressource que si l'expression est vraie.

Les **ressources enfants** se nomment `parent/enfant` avec le type `Microsoft.Network/virtualNetworks/subnets`, ou s'imbriquent dans le tableau `resources` du parent.

<!-- section: modify-bicep | objectives: 3.1.3 -->
## Modifier un fichier Bicep

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

| Élément Bicep | Sens |
| --- | --- |
| `param`, `var`, `resource`, `module`, `output` | Les cinq déclarations |
| Décorateurs | `@description`, `@allowed`, `@secure`, `@minLength`, `@maxLength`, `@minValue`, `@maxValue`, `@batchSize(n)` sur les boucles |
| Nom symbolique (`vnet`) | Nom utilisé dans le fichier ; `vnet.id`, `vnet.name`, `vnet.properties...` |
| `existing` | Référence une ressource déjà déployée ; ajoutez `scope` si elle est dans un autre groupe de ressources |
| `parent: vnet` | Déclare une ressource enfant de `vnet` |
| `[for x in list: {...}]`, `[for i in range(0, n): {...}]` | Boucles ; en parallèle par défaut |
| `= if (condition) {...}` | Déploiement conditionnel |
| `condition ? a : b` | Valeur conditionnelle |

Bicep crée une **dépendance implicite** dès qu'une ressource en référence une autre par son nom symbolique ou par `parent` ; un `dependsOn` explicite est rarement nécessaire. Les groupes de ressources sont des ressources de niveau abonnement : en créer un en Bicep demande `targetScope = 'subscription'`.

<!-- section: deploy-templates | objectives: 3.1.4 -->
## Déployer des modèles et des fichiers Bicep

La commande dépend de l'**étendue** du déploiement :

| Étendue | Azure CLI | Azure PowerShell |
| --- | --- | --- |
| Groupe de ressources | `az deployment group create` | `New-AzResourceGroupDeployment` |
| Abonnement | `az deployment sub create` | `New-AzSubscriptionDeployment` |
| Groupe d'administration | `az deployment mg create` | `New-AzManagementGroupDeployment` |
| Locataire | `az deployment tenant create` | `New-AzTenantDeployment` |

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

- Les mêmes commandes acceptent les fichiers `.json` et `.bicep`. Les étendues abonnement et supérieures exigent `--location` pour les métadonnées du déploiement.
- Les **paramètres** se passent en ligne, dans un fichier de paramètres JSON ou dans un fichier `.bicepparam`. Un fichier `.bicepparam` commence par `using './main.bicep'` : on ne repasse donc pas le fichier de modèle.
- **What-if** montre ce qui serait créé, modifié ou supprimé, sans rien changer.
- **Modes de déploiement** (déploiements sur un groupe de ressources) :

| Mode | Ressources du groupe de ressources absentes du modèle |
| --- | --- |
| **Incrémentiel** (Incremental, par défaut) | Laissées inchangées |
| **Complet** (Complete) | **Supprimées** |

Dans les deux modes, les ressources présentes dans le modèle sont créées ou mises à jour pour lui correspondre. En mode incrémentiel, une propriété omise dans le modèle pour une ressource existante peut revenir à sa valeur par défaut : le modèle décrit l'état voulu complet de chaque ressource qu'il contient. Microsoft recommande désormais les **piles de déploiement** (deployment stacks) plutôt que le mode complet pour supprimer les ressources sorties du modèle. Le mode complet n'existe pas pour les déploiements au niveau de l'abonnement et ne supprime rien dans un groupe de ressources verrouillé.

- Chaque déploiement est enregistré dans l'historique **Déploiements** de son étendue, avec son modèle, ses paramètres et ses sorties.
- Une **spec de modèle** (template spec) stocke un modèle comme une ressource Azure, versionnée et partagée avec Azure RBAC ; déployez-la avec `--template-spec <ID de version>`.
- Dans le portail, **Déployer un modèle personnalisé** accepte un modèle collé, chargé ou choisi parmi les modèles de démarrage rapide.
- La personne qui déploie doit avoir l'écriture sur les ressources et `Microsoft.Resources/deployments/*` (Contributor a les deux).

<!-- section: export-convert | objectives: 3.1.5 -->
## Exporter des modèles et convertir en Bicep

Deux exports qui ne donnent pas la même chose :

| Export depuis | Contenu | Commande |
| --- | --- | --- |
| Le **groupe de ressources** ou une ressource (*Exporter le modèle*) | Un modèle généré à partir de l'**état actuel** des ressources sélectionnées, modifications manuelles comprises | `az group export`, `Export-AzResourceGroup` |
| L'**historique des déploiements** (Déploiements > un déploiement > Modèle) | Le **modèle exact qui a été déployé**, avec ses paramètres ; les changements ultérieurs n'y sont pas | `az deployment group export`, `Save-AzResourceGroupDeploymentTemplate` |

Limites de l'export depuis un groupe de ressources : 200 ressources au plus ; certains types de ressources ne sont pas exportés (un avertissement les liste) ; le modèle contient des valeurs codées en dur et de nombreux paramètres générés, et les secrets comme les mots de passe manquent. Relisez-le avant de le réutiliser.

Conversions :

```bash
az bicep decompile --file azuredeploy.json   # JSON -> Bicep (best effort: fix the warnings)
az bicep build --file main.bicep             # Bicep -> JSON
```

Le portail peut aussi exporter directement en Bicep. Parcours type pour des ressources créées à la main : exporter depuis le groupe de ressources, décompiler en Bicep, nettoyer les noms et les paramètres, puis déployer dans un groupe de ressources de test.

<!-- section: key-points -->
## Points clés

- Déclaratif et idempotent. Les expressions JSON sont entre crochets ; Bicep utilise des noms symboliques et `${}`.
- `uniqueString(resourceGroup().id)` donne la même valeur pour le même groupe de ressources. `copyIndex()` commence à 0.
- Bicep : `existing` référence sans déployer ; conditions `if (...)` ; boucles `[for ...]` ; dépendances implicites.
- `az deployment group | sub | mg | tenant create` ; `what-if` prévisualise.
- Le mode incrémentiel garde les autres ressources ; le mode complet supprime ce qui n'est pas dans le modèle.
- Export depuis le groupe de ressources = état actuel ; depuis l'historique des déploiements = ce qui a été déployé. `az bicep decompile` convertit le JSON en Bicep.
