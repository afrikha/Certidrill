Les ressources Azure SQL se déploient de façon reproductible avec des modèles déclaratifs (JSON ARM ou Bicep) ou des scripts impératifs (Azure PowerShell, Azure CLI). Les questions d'examen montrent un fragment à compléter (un type de ressource, une SKU, un paramètre, une cmdlet), demandent l'ordre des commandes ou demandent où trouver la raison de l'échec d'un déploiement.

<!-- section: templates | objectives: 4.2.1 -->
## Déployer avec des modèles ARM et Bicep

Les modèles sont **déclaratifs** : vous décrivez l'état final et Azure Resource Manager crée ou met à jour les ressources pour y correspondre, en parallèle quand les dépendances le permettent. Redéployer le même modèle est sans risque (idempotent). Bicep se compile en JSON ARM (`az bicep build`) ; un JSON existant se convertit avec `az bicep decompile`.

| Ressource | Type |
| --- | --- |
| Serveur logique | `Microsoft.Sql/servers` |
| Base de données | `Microsoft.Sql/servers/databases` (enfant : `parent: sqlServer`) |
| Pool élastique | `Microsoft.Sql/servers/elasticPools` |
| Règle de pare-feu du serveur | `Microsoft.Sql/servers/firewallRules` |
| Instance managée | `Microsoft.Sql/managedInstances` (exige un sous-réseau délégué) |
| Inscription de SQL Server sur machine virtuelle Azure | `Microsoft.SqlVirtualMachine/sqlVirtualMachines` (à côté de `Microsoft.Compute/virtualMachines`) |

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

| Élément | Règle |
| --- | --- |
| `sku.name` | `GP_Gen5` (General Purpose provisionné), `GP_S_Gen5` (serverless), `BC_Gen5`, `HS_Gen5`, ou les noms DTU (`Basic`, `S0`, `P1`) ; `capacity` = vCores ou DTU |
| `autoPauseDelay`, `minCapacity` | Serverless uniquement ; `autoPauseDelay: -1` désactive la pause automatique |
| `requestedBackupStorageRedundancy` | `Local`, `Zone`, `Geo`, `GeoZone` |
| `@secure()` | La valeur n'est ni journalisée ni affichée dans l'historique des déploiements |
| `parent` / noms enfants | Une ressource enfant a besoin de son parent : parent absent = `ParentResourceNotFound` |
| `dependsOn` | Implicite en Bicep quand une ressource en référence une autre (nom symbolique) ; explicite en JSON |

La même base de données en JSON ARM (fragment de `resources`) :

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

Pour garder un mot de passe hors du modèle et du pipeline, référencez un secret Key Vault depuis le fichier de paramètres (le coffre doit autoriser **Azure Resource Manager pour le déploiement de modèles**, `enabledForTemplateDeployment`), ou préférez l'**authentification Microsoft Entra uniquement** avec un bloc `administrators` (`azureADOnlyAuthentication: true`, `administratorType: 'ActiveDirectory'`, `login`, `sid`, `principalType`).

```bash
az deployment group create --resource-group rg-sales \
  --template-file main.bicep --parameters main.bicepparam
az deployment group what-if --resource-group rg-sales \
  --template-file main.bicep --parameters main.bicepparam
```

| Mode | Effet sur les ressources du groupe absentes du modèle |
| --- | --- |
| Incrémentiel (Incremental, par défaut) | Laissées inchangées |
| Complet (Complete) | Supprimées |

> **Piège d'examen.** Changer la SKU dans le modèle puis redéployer met à l'échelle la base existante (le mode incrémentiel la met à jour) ; cela ne crée pas une seconde base. Utiliser `--mode Complete` sur un groupe de ressources partagé peut supprimer des ressources déployées par d'autres équipes.

<!-- section: powershell | objectives: 4.2.2 -->
## Déployer avec Azure PowerShell

Le module Az.Sql crée les ressources de façon impérative, une cmdlet par ressource, dans l'ordre des dépendances : groupe de ressources, serveur, règle de pare-feu, base de données.

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

| Cmdlet | Usage |
| --- | --- |
| `New-AzSqlServer`, `Set-AzSqlServer` | Créer ou modifier un serveur logique |
| `New-AzSqlDatabase`, `Set-AzSqlDatabase` | Créer ou mettre à l'échelle une base (`-Edition`, `-VCore`, `-ComputeGeneration`, `-ComputeModel`, `-RequestedServiceObjectiveName`, `-MaxSizeBytes`, `-ElasticPoolName`, `-ZoneRedundant`) |
| `New-AzSqlElasticPool` | Créer un pool élastique |
| `New-AzSqlServerFirewallRule` | Règle de pare-feu IP au niveau du serveur |
| `New-AzSqlInstance` | Créer une instance managée (`-SubnetId`, `-VCore`, `-StorageSizeInGB`, `-LicenseType`, `-AdministratorCredential`) |
| `New-AzSqlVM` | Inscrire une machine virtuelle SQL Server auprès de l'extension SQL IaaS Agent (`-LicenseType PAYG`, `AHUB` ou `DR`) |
| `New-AzResourceGroupDeployment` | Déployer un modèle ARM ou Bicep (`-TemplateFile`, `-TemplateParameterFile`, `-WhatIf`, `-Mode Complete`) |
| `Test-AzResourceGroupDeployment` | Valider un modèle sans le déployer |

> **Conseil d'examen.** `-SqlAdministratorCredentials` attend un `PSCredential` (issu de `Get-Credential`), pas un mot de passe en clair. Les opérations longues (création d'une instance managée) acceptent `-AsJob` pour rendre la main immédiatement.

<!-- section: cli | objectives: 4.2.3 -->
## Déployer avec Azure CLI

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

| Commande | Usage |
| --- | --- |
| `az sql server create` | Serveur logique (`--admin-user`/`--admin-password`, ou `--enable-ad-only-auth` avec `--external-admin-principal-type`, `--external-admin-name`, `--external-admin-sid`) |
| `az sql db create` / `az sql db update` | Base de données : `--edition` (`-e`), `--family` (`-f`), `--capacity` (`-c`) ou `--service-objective` (par exemple `GP_S_Gen5_8`, `S0`), `--compute-model`, `--auto-pause-delay`, `--min-capacity`, `--max-size`, `--elastic-pool`, `--zone-redundant`, `--backup-storage-redundancy` |
| `az sql elastic-pool create` | Pool élastique |
| `az sql server firewall-rule create` | Règle IP au niveau du serveur (`0.0.0.0` à `0.0.0.0` = autoriser les services Azure) |
| `az sql mi create` | Instance managée (`--subnet`, `--capacity`, `--storage`, `--edition`, `--license-type`) ; ajoutez `--no-wait` pour les opérations longues |
| `az sql vm create` | Inscrire une machine virtuelle SQL Server auprès de l'extension SQL IaaS Agent (`--license-type PAYG`, `AHUB` ou `DR`) |
| `az deployment group create` / `what-if` / `validate` | Déployer, prévisualiser ou valider un modèle |
| `az sql db list-editions --location westeurope -o table` | SKU disponibles dans une région |

> **Piège d'examen.** Sans unité, `--max-size` est lu en octets : écrivez `--max-size 32GB`. `--edition GeneralPurpose` seul ne suffit pas pour une base vCore : indiquez `--family` et `--capacity`, ou un `--service-objective` complet.

<!-- section: monitor-troubleshoot | objectives: 4.2.4 -->
## Monitorer les déploiements et résoudre les problèmes

Un déploiement de modèle est vérifié deux fois : la **validation** (préalable : syntaxe du modèle, valeurs des paramètres et contrôles des fournisseurs de ressources, avant toute création), puis le **déploiement** de chaque ressource. Les erreurs de validation ne créent rien ; les erreurs de déploiement peuvent laisser certaines ressources créées. Corrigez la cause et redéployez : le mode incrémentiel ne crée que ce qui manque.

Où regarder :

| Outil | Montre |
| --- | --- |
| Portail : groupe de ressources > **Paramètres > Déploiements** | Chaque déploiement, son état, ses entrées, ses sorties, les opérations en échec et le détail des erreurs ; **Redéployer** |
| Journal d'activité | Les opérations du plan de contrôle avec l'appelant et l'état, y compris les déploiements et les échecs |
| `az deployment group show` / `list` | L'état du déploiement et `properties.error` |
| `az deployment operation group list` | Chaque opération de ressource d'un déploiement, avec les codes d'état (et la requête et la réponse si la journalisation de débogage était activée) |
| `Get-AzResourceGroupDeployment`, `Get-AzResourceGroupDeploymentOperation` | Même chose en PowerShell (sans le contenu de la requête et de la réponse) |
| `az deployment group what-if`, `-WhatIf` | Les modifications qu'un déploiement apporterait, avant de l'exécuter |

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

La journalisation de débogage ne s'active que depuis PowerShell (`-DeploymentDebugLogLevel All`, `RequestContent` ou `ResponseContent`) ; Azure CLI ne peut pas l'activer mais lit la requête et la réponse journalisées. Elle peut enregistrer des secrets : supprimez ensuite le déploiement de l'historique (`Remove-AzResourceGroupDeployment`).

| Erreur | Cause | Correction |
| --- | --- | --- |
| `DeploymentFailed` | Erreur générique d'enveloppe | Lire le code d'erreur interne |
| `InvalidTemplate` | Syntaxe, type ou valeur de paramètre incorrects | Valider, vérifier le modèle |
| `ParentResourceNotFound` / `NotFound` | Base déployée avant son serveur | `parent` ou `dependsOn` |
| `SkuNotAvailable`, `OperationNotAllowed` | SKU non proposée dans la région ou non autorisée (quota, règles de SKU) | Choisir une autre SKU ou région (`az sql db list-editions`), demander du quota |
| `ResourceQuotaExceeded` | Quota de l'abonnement ou de la région (par exemple les vCores) | Demander une augmentation de quota |
| `AuthorizationFailed` | Rôle manquant (par exemple SQL Server Contributor) ou fournisseur de ressources non inscrit | Attribuer le rôle, inscrire `Microsoft.Sql` |
| `RequestDisallowedByPolicy` | Une attribution Azure Policy refuse la ressource (par exemple l'accès réseau public, la région) | Se conformer à la stratégie ou obtenir une exemption |
| `Conflict` | Opération non autorisée dans l'état actuel de la ressource (une autre opération en cours) | Attendre et réessayer |
| `DeploymentQuotaExceeded` | 800 déploiements dans l'historique du groupe | Le nettoyage de l'historique est automatique à partir de 700 entrées (jusqu'à 600) sauf s'il est bloqué par un verrou `CanNotDelete` ou l'absence de l'autorisation `Microsoft.Resources/deployments/delete` ; supprimez les anciens déploiements |

Un nom de serveur doit être unique au niveau mondial (il devient `name.database.windows.net`) : un nom déjà pris fait échouer le déploiement, et `uniqueString()` l'évite.

> **Piège d'examen.** `DeploymentFailed` n'explique jamais le problème à lui seul : ouvrez les opérations en échec du déploiement (Déploiements dans le portail, `az deployment operation group list`) pour trouver le vrai code d'erreur.

<!-- section: key-points -->
## Points clés

- Les modèles Bicep et ARM sont déclaratifs et idempotents ; redéployer avec une nouvelle SKU met la base à l'échelle ; le mode incrémentiel est le mode par défaut, le mode complet supprime ce qui n'est pas dans le modèle.
- Types : `Microsoft.Sql/servers`, `servers/databases`, `servers/elasticPools`, `servers/firewallRules`, `managedInstances`, `Microsoft.SqlVirtualMachine/sqlVirtualMachines` ; serverless = `GP_S_Gen5` + `autoPauseDelay` + `minCapacity`.
- Secrets : paramètres `@secure()`, références Key Vault ou authentification Microsoft Entra uniquement.
- PowerShell : `New-AzSqlServer` (PSCredential), `New-AzSqlDatabase`, `New-AzSqlInstance`, `New-AzSqlVM`, `New-AzResourceGroupDeployment`.
- CLI : `az sql server create`, `az sql db create` (`-e -f -c` ou `--service-objective`), `az sql mi create --no-wait`, `az deployment group create | what-if | validate`.
- Diagnostiquez à partir des opérations en échec du déploiement et du journal d'activité ; journalisation de débogage depuis PowerShell uniquement ; limite de 800 déploiements dans l'historique, nettoyée automatiquement.
