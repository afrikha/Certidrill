L'espace de travail Azure Machine Learning est la ressource de plus haut niveau du MLOps sur Azure : chaque travail, ressource de données, modèle, point de terminaison et cible de calcul appartient à un espace de travail. Les questions d'examen demandent comment le créer avec ses ressources associées, comment le relier au stockage par des magasins de données, quelle cible de calcul convient à une charge de travail au coût le plus bas, et quel rôle ou quelle identité managée donne exactement l'accès requis.

<!-- section: workspace | objectives: 1.1.1 -->
## Créer et gérer un espace de travail

Un espace de travail conserve l'historique de toutes les exécutions d'entraînement (journaux, métriques, sorties, traçabilité, instantané des scripts) et regroupe travaux, pipelines, ressources de données, modèles, composants, environnements, points de terminaison, cibles de calcul et magasins de données. Il s'appuie sur quatre **ressources associées** ; Azure Machine Learning crée celles que vous ne fournissez pas :

| Ressource associée | Sert à | Règles à connaître |
| --- | --- | --- |
| Compte de stockage | Stockage par défaut : journaux des travaux, données chargées, instantanés de code, notebooks | Pas de compte BlobStorage, pas de compte premium (`Premium_LRS`, `Premium_GRS`), pas d'espace de noms hiérarchique ; Blob et File activés tous les deux. Ajoutez les autres comptes, y compris Data Lake Storage Gen2, comme magasins de données |
| Coffre de clés | Secrets : informations d'identification des magasins de données, secrets des calculs | |
| Application Insights | Supervision des points de terminaison d'inférence | S'il est supprimé, le seul moyen de le retrouver est de recréer l'espace de travail |
| Registre de conteneurs | Images Docker construites à partir des environnements personnalisés | Créé seulement à la construction de la première image personnalisée. Le supprimer rend l'espace de travail inutilisable |

Le compte de stockage et le coffre de clés ne peuvent pas être changés après la création. Supprimer un espace de travail ne supprime pas ses ressources associées ; supprimer le groupe de ressources, si.

Vous pouvez créer un espace de travail depuis le studio, le portail, Azure CLI, le SDK Python, Bicep, ARM, Terraform ou REST. Avec la CLI v2 :

```bash
az extension add -n ml
az group create --name rg-ml-prod --location westeurope
az ml workspace create -n mlw-contoso-prod -g rg-ml-prod

# Avoid repeating the workspace and resource group on every command
az configure --defaults workspace=mlw-contoso-prod group=rg-ml-prod
```

Pour réutiliser des ressources que l'équipe informatique a déjà créées et sécurisées, donnez leurs ID de ressource dans un fichier YAML (chacune peut être omise et sera alors créée) :

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/workspace.schema.json
name: mlw-contoso-prod
location: westeurope
display_name: Contoso production workspace
storage_account: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.Storage/storageAccounts/stcontosoml
key_vault: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.KeyVault/vaults/kv-contoso-ml
application_insights: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.insights/components/appi-contoso-ml
container_registry: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.ContainerRegistry/registries/crcontosoml
tags:
  costcenter: ml-platform
```

```bash
az ml workspace create -g rg-ml-prod --file workspace.yml
az ml workspace update -n mlw-contoso-prod -g rg-ml-prod --public-network-access enabled
az ml workspace sync-keys -n mlw-contoso-prod -g rg-ml-prod
```

Autres paramètres de création : `customer_managed_key` (une clé de votre coffre, pour le chiffrement avec des clés gérées par le client) et `hbi_workspace: true` (impact métier élevé : moins de données de diagnostic collectées), qui ne peut être défini qu'à la création.

Microsoft recommande un espace de travail par projet, un accès par groupes Microsoft Entra et des registres pour partager les actifs. Un **espace de travail hub** regroupe des espaces de travail de projet sous des paramètres de sécurité, des connexions et des calculs partagés. Un espace de travail ne peut pas être déplacé vers un autre abonnement.

**Suppression réversible.** Supprimer un espace de travail le place par défaut en suppression réversible pendant 14 jours ; il est ensuite supprimé définitivement. Pendant ce délai, vous pouvez seulement le récupérer (portail : Azure Machine Learning > **Recently deleted** > **Recover**) ou le supprimer définitivement, et son nom ne peut pas être réutilisé.

| Récupéré avec l'espace de travail | Perdu définitivement |
| --- | --- |
| Historique des exécutions, modèles, données, environnements, composants, notebooks, pipelines, travaux AutoML, projets d'étiquetage, magasins de données, attributions de rôles de l'identité de l'espace de travail (recréation tentée, non garantie) | Travaux en file d'attente ou en cours, instances et clusters de calcul, points de terminaison d'inférence, attributions de rôles que vous aviez ajoutées, cache interne |

Récupérez d'abord les dépendances : le coffre de clés et le compte de stockage ; pour un Application Insights supprimé, récupérez son espace de travail Log Analytics, puis recréez Application Insights avec son nom d'origine. Le registre de conteneurs n'est pas exigé : les images des environnements personnalisés sont reconstruites. Pour éviter la suppression réversible, choisissez **Delete the workspace permanently** dans le portail ou passez `permanently_delete=True` dans le SDK :

```text
ml_client.workspaces.begin_delete(
    name="mlw-contoso-dev",
    permanently_delete=True,
    delete_dependent_resources=False
).result()
```

> **Piège d'examen.** Un espace de travail en suppression réversible conserve son nom. « Créer un nouvel espace de travail du même nom juste après avoir supprimé l'ancien » échoue, sauf si l'ancien a été supprimé définitivement. La suppression réversible n'est pas prise en charge quand l'espace de travail utilise uniquement une identité managée affectée par l'utilisateur.

<!-- section: datastores | objectives: 1.1.2 -->
## Créer et gérer des magasins de données

Un **magasin de données** (datastore) est une référence à un service de stockage Azure existant : il conserve les informations de connexion (et, pour l'accès basé sur des informations d'identification, le secret). Un magasin de données ne crée jamais de stockage.

Chaque espace de travail possède quatre magasins de données par défaut :

| Magasin de données | Type | Contient |
| --- | --- | --- |
| `workspaceblobstore` | Conteneur blob | Données chargées, instantanés du code des travaux, cache de données des pipelines (le magasin par défaut) |
| `workspaceworkingdirectory` | Partage de fichiers | Notebooks et fichiers des instances de calcul |
| `workspacefilestore` | Partage de fichiers | Emplacement alternatif pour les données chargées |
| `workspaceartifactstore` | Conteneur blob | Métriques, modèles, composants |

Types de magasins de données et authentification acceptée :

| Stockage | `type` YAML | Basé sur l'identité | Basé sur des informations d'identification |
| --- | --- | --- | --- |
| Stockage Blob Azure | `azure_blob` | Oui | Clé de compte ou jeton SAS |
| Azure Data Lake Storage Gen2 | `azure_data_lake_gen2` | Oui | Principal de service |
| Azure Files | `azure_file` | Non | Clé de compte ou jeton SAS |
| OneLake (lakehouse Microsoft Fabric, préversion) | `one_lake` | Oui | Principal de service |

Azure Data Lake Storage Gen1 a été mis hors service le 29 février 2024 : utilisez Gen2.

Un magasin de données sans bloc `credentials` est **basé sur l'identité** (sans informations d'identification) : aucun secret n'est stocké et l'accès est vérifié avec Microsoft Entra ID par rapport aux rôles du stockage.

```yaml
# blob-identity.yml: no credentials block, Microsoft Entra ID is used
$schema: https://azuremlschemas.azureedge.net/latest/azureBlob.schema.json
name: sales_raw
type: azure_blob
account_name: stcontososales
container_name: raw
```

```yaml
# adls-sp.yml: service principal credentials, cached in the workspace key vault
$schema: https://azuremlschemas.azureedge.net/latest/azureDataLakeGen2.schema.json
name: lake_curated
type: azure_data_lake_gen2
account_name: stcontosolake
filesystem: curated
credentials:
  tenant_id: <tenant-id>
  client_id: <client-id>
  client_secret: <client-secret>
```

```bash
az ml datastore create --file blob-identity.yml
az ml datastore list --output table
az ml datastore show --name sales_raw
```

Les travaux et les ressources de données pointent vers un chemin du magasin avec l'URI `azureml://datastores/<datastore-name>/paths/<path>`.

Quelle identité lit les données d'un magasin basé sur l'identité :

| Contexte | Identité utilisée |
| --- | --- |
| Studio, notebooks sur une instance de calcul | Le jeton Microsoft Entra de l'utilisateur connecté |
| Travail avec `identity: type: user_identity` | L'utilisateur qui a soumis le travail |
| Travail sans paramètre `identity` | L'identité managée du calcul |
| Aperçu des données dans le studio quand le pare-feu du stockage n'autorise que les services Azure approuvés | L'identité managée de l'espace de travail, une fois activé le paramètre du magasin de données **Use workspace managed identity for data preview and profiling in Azure Machine Learning studio**. Elle a besoin de Storage Blob Data Reader, plus Reader sur le point de terminaison privé du stockage s'il en utilise un |

L'identité qui lit a besoin au minimum de **Storage Blob Data Reader** sur le compte de stockage. Pour ne pas attribuer un rôle de stockage à chaque data scientist, attribuez-le à l'identité managée du cluster de calcul et laissez les travaux s'exécuter avec elle.

> **Piège d'examen.** Les magasins de données basés sur des informations d'identification conservent clés, jetons SAS ou secrets clients dans le coffre de clés de l'espace de travail, et un utilisateur qui a le rôle **Reader** sur l'espace de travail peut voir ces informations d'identification. Quand l'exigence est « aucun secret stocké dans l'espace de travail », choisissez un magasin de données basé sur l'identité avec un rôle de données sur le stockage, pas un jeton SAS.

<!-- section: compute | objectives: 1.1.3 -->
## Créer et gérer des cibles de calcul

Une cible de calcul est l'endroit où s'exécute un travail ou un déploiement ; en changer ne demande pas de modifier le code.

| Calcul | Type | Usage typique | Comportement clé |
| --- | --- | --- | --- |
| Instance de calcul | Managé, un seul nœud | Notebooks, VS Code, développement, petits travaux de test | Personnelle : ne peut pas être partagée avec les autres utilisateurs de l'espace de travail |
| Cluster de calcul (`amlcompute`) | Managé, un ou plusieurs nœuds | Travaux d'entraînement, pipelines, balayages (sweep), entraînement distribué | Se met à l'échelle entre `min_instances` et `max_instances` à chaque soumission de travail |
| Calcul serverless | Géré par le service | Travaux quand vous ne voulez ni créer ni dimensionner de calcul | Demandé par travail ; même facturation et même quota que les clusters de calcul |
| Kubernetes | Attaché (non managé) | Entraînement et inférence sur un cluster AKS ou Arc que vous exploitez | Vous maintenez le cluster |
| VM distante, Azure Databricks, HDInsight et autres | Attaché (non managé) | Calcul existant | Créé hors d'Azure Machine Learning, puis attaché |

Les clusters de calcul, le calcul serverless et les instances de calcul sont les seuls calculs managés. Pour l'inférence, les points de terminaison en ligne managés et les points de terminaison de traitement par lots s'exécutent sur un calcul entièrement managé (voir le chapitre sur le déploiement).

**Cluster de calcul.** Les valeurs par défaut du schéma YAML méritent d'être retenues :

| Clé | Par défaut | Remarques |
| --- | --- | --- |
| `size` | `Standard_DS3_v2` | Listez les tailles d'une région avec `az ml compute list-sizes` |
| `tier` | `dedicated` | `low_priority` : moins cher, préemptible, sans SLA ; un travail préempté doit être relancé |
| `min_instances` | `0` | Toute valeur supérieure à 0 garde ce nombre de nœuds en marche (et facturés) au repos |
| `max_instances` | `1` | Plafond de mise à l'échelle |
| `idle_time_before_scale_down` | `120` | Secondes avant la libération d'un nœud inactif |
| `ssh_public_access_enabled` | `false` | |
| `identity.type` | aucune | `system_assigned` ou `user_assigned` : une identité affectée par le système ou plusieurs affectées par l'utilisateur, pas les deux |

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/amlCompute.schema.json
name: cpu-cluster
type: amlcompute
size: STANDARD_DS3_v2
min_instances: 0
max_instances: 4
idle_time_before_scale_down: 120
tier: low_priority
identity:
  type: system_assigned
```

```bash
az ml compute create --file cpu-cluster.yml
az ml compute create -n gpu-cluster --type AmlCompute --min-instances 0 --max-instances 2
az ml compute list --output table
```

Un cluster peut être créé dans une autre région que l'espace de travail (latence et coûts de transfert de données accrus ; non pris en charge avec un réseau virtuel managé) ; une instance de calcul ne le peut pas. Le quota est compté par région et par famille de VM et partagé entre clusters et instances. Ne placez pas de verrou Suppression ou Lecture seule sur le groupe de ressources de l'espace de travail : ils bloquent la mise à l'échelle.

**Instance de calcul.** Les faits qui reviennent dans les questions :

- Le nom doit être unique dans la région. La taille de VM ne peut pas être changée après la création.
- **Arrêt en cas d'inactivité** : l'instance s'arrête après une période d'inactivité comprise entre 15 minutes et 3 jours (aucun noyau, terminal, travail ni session VS Code). Une instance dotée d'une identité managée ne s'arrête pas pour inactivité tant que cette identité n'a pas Contributor sur l'espace de travail. Jusqu'à quatre **planifications** de démarrage et d'arrêt par instance.
- L'arrêt stoppe la facturation du calcul, mais vous payez toujours le disque, l'IP publique et l'équilibreur de charge, et le quota n'est pas libéré.
- **Créer pour le compte** d'un utilisateur (`create_on_behalf_of` avec le locataire et l'ID d'objet de l'utilisateur) : un administrateur prépare l'instance ; seul l'utilisateur affecté l'utilise.
- L'accès SSH est désactivé par défaut et ne peut être ni activé ni désactivé après la création.
- Le compte de stockage de l'espace de travail doit autoriser l'accès par clé de compte de stockage pour que la création de l'instance réussisse.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/computeInstance.schema.json
name: ci-ana-dev
type: computeinstance
size: STANDARD_DS3_v2
create_on_behalf_of:
  user_tenant_id: <tenant-id>
  user_object_id: <object-id-of-ana>
```

**Calcul serverless.** Omettez `compute` dans un travail de commande, de balayage, AutoML ou de pipeline et le service provisionne les nœuds. Paramètres facultatifs : `resources.instance_type` et `resources.instance_count` (par défaut : un nœud CPU choisi selon votre quota), et `queue_settings.job_tier` (`Standard`, la valeur par défaut, ou `Spot`). Dans un pipeline, utilisez `default_compute: azureml:serverless`. Les travaux serverless s'exécutent avec l'identité de l'utilisateur ou une identité managée affectée par l'utilisateur de l'espace de travail ; l'identité affectée par le système n'est pas prise en charge.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json
type: command
command: python train.py --data ${{inputs.training_data}}
code: ./src
environment: azureml://registries/azureml/environments/sklearn-1.5/labels/latest
inputs:
  training_data:
    type: uri_folder
    path: azureml://datastores/sales_raw/paths/2026/
resources:
  instance_type: Standard_E4s_v3
  instance_count: 1
queue_settings:
  job_tier: Spot
```

| Exigence | Réponse |
| --- | --- |
| Aucun coût quand aucun travail ne tourne, pool fixe d'une taille de VM choisie | Cluster avec `min_instances: 0` |
| Aucun calcul à créer, dimensionner ou maintenir | Calcul serverless |
| Prix le plus bas, interruptions acceptables | `tier: low_priority` (cluster) ou `job_tier: Spot` (serverless) |
| Les travaux doivent démarrer immédiatement, sans attente d'allocation de nœuds | Cluster avec `min_instances` supérieur à 0 (facturé au repos) |
| Notebooks pour un data scientist, arrêt quand ils ne servent pas | Instance de calcul avec arrêt en cas d'inactivité ou planification |

> **Piège d'examen.** Une instance de calcul n'est pas une ressource d'équipe partagée : « cinq data scientists partagent une instance de calcul » n'est jamais la bonne réponse. Donnez une instance à chaque utilisateur, et envoyez les travaux d'entraînement sur un cluster ou sur du calcul serverless.

<!-- section: identity-access | objectives: 1.1.4 -->
## Configurer la gestion des identités et des accès

L'accès à un espace de travail passe par Azure RBAC. Les rôles intégrés :

| Rôle | Peut | Ne peut pas |
| --- | --- | --- |
| Owner | Tout, y compris les attributions de rôles | |
| Contributor | Créer, modifier et supprimer des actifs, créer ou attacher du calcul, soumettre des travaux, déployer | Attribuer des rôles |
| Reader | Lister et consulter les actifs, **y compris les informations d'identification des magasins de données** | Créer ou mettre à jour quoi que ce soit |
| AzureML Data Scientist | Toutes les actions dans l'espace de travail : travaux, données, modèles, points de terminaison | Créer ou supprimer du calcul, modifier ou supprimer l'espace de travail |
| AzureML Compute Operator | Créer, gérer, supprimer et utiliser du calcul | Exécuter des expériences |
| AzureML Registry User | Lire les registres ; lire, écrire et supprimer les actifs qu'ils contiennent | Créer ou supprimer des registres |

Les rôles s'additionnent : AzureML Data Scientist plus AzureML Compute Operator permet à un utilisateur d'exécuter des expériences et de créer du calcul en libre-service.

Autres faits sur les autorisations :

- Créer un espace de travail demande Owner, Contributor ou un rôle personnalisé avec `Microsoft.MachineLearningServices/workspaces/write`, `Microsoft.Resources/deployments/*` et l'écriture sur les ressources dépendantes. Le créateur ne devient pas Owner : il garde le rôle hérité de l'étendue supérieure.
- Les opérations de quota demandent des autorisations à l'étendue de l'**abonnement** ; l'étendue du groupe de ressources ou de l'espace de travail ne suffit pas.

Rôle personnalisé qui laisse les data scientists travailler sans créer de calcul ni modifier l'espace de travail :

```json
{
  "Name": "Data Scientist Custom",
  "IsCustom": true,
  "Description": "Can run experiments but can't create or delete compute.",
  "Actions": ["*"],
  "NotActions": [
    "Microsoft.MachineLearningServices/workspaces/*/delete",
    "Microsoft.MachineLearningServices/workspaces/write",
    "Microsoft.MachineLearningServices/workspaces/computes/*/write",
    "Microsoft.MachineLearningServices/workspaces/computes/*/delete",
    "Microsoft.Authorization/*/write"
  ],
  "AssignableScopes": [
    "/subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.MachineLearningServices/workspaces/mlw-contoso-prod"
  ]
}
```

```bash
az role definition create --role-definition data-scientist-custom.json

az role assignment create --assignee-object-id <group-object-id> \
  --assignee-principal-type Group \
  --role "AzureML Data Scientist" \
  --scope /subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.MachineLearningServices/workspaces/mlw-contoso-prod
```

**Identité managée de l'espace de travail.** L'espace de travail utilise une identité managée pour atteindre son compte de stockage, son coffre de clés, son registre de conteneurs et Application Insights.

| Option | Attributions de rôles sur les ressources associées | Remarques |
| --- | --- | --- |
| Affectée par le système | Créées automatiquement : Azure AI Administrator pour les espaces de travail créés après le 19 novembre 2024 (avant : Contributor sur le groupe de ressources) | Le plus simple ; cycle de vie lié à l'espace de travail |
| Affectée par l'utilisateur (avec `primary_user_assigned_identity`) | Créées par vous | Cycle de vie indépendant, réutilisable, contrôle du privilège minimum |

Vous pouvez passer d'une identité affectée par le système à système plus utilisateur, pas revenir en arrière. Avec une identité affectée par l'utilisateur, attribuez-lui Contributor sur l'espace de travail et sur chaque ressource associée, plus, en option, Storage Blob Data Contributor (nécessaire seulement pour l'aperçu des données dans le studio) et, pour un coffre de clés qui utilise le modèle Azure RBAC, Key Vault Administrator.

```yaml
location: westeurope
identity:
  type: user_assigned
  user_assigned_identities:
    '/subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-mlw-prod': {}
primary_user_assigned_identity: /subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-mlw-prod
storage_account: <storage-account-resource-id>
key_vault: <key-vault-resource-id>
```

**Identité managée du calcul.** L'identité d'un cluster lit les secrets des magasins de données dans le coffre de clés, tire les images du registre de conteneurs et, dans les travaux sans `identity`, lit les magasins basés sur l'identité. Son nom dans Microsoft Entra est `/workspace-name/computes/compute-name`. Un cluster avec une identité affectée par le système reçoit automatiquement AcrPull sur le registre de l'espace de travail quand l'utilisateur administrateur du registre est désactivé. Dans un travail, l'ID client de l'identité par défaut se trouve dans la variable d'environnement `DEFAULT_IDENTITY_CLIENT_ID` :

```text
import os
from azure.identity import ManagedIdentityCredential

credential = ManagedIdentityCredential(client_id=os.environ.get("DEFAULT_IDENTITY_CLIENT_ID"))
token = credential.get_token("https://storage.azure.com/")
```

| Exigence | Réponse |
| --- | --- |
| Les data scientists exécutent des travaux et déploient des modèles, sans créer de calcul | AzureML Data Scientist sur l'espace de travail |
| Une équipe plateforme gère uniquement les clusters | AzureML Compute Operator |
| Des équipes publient et consomment des actifs partagés, sans pouvoir créer de registre | AzureML Registry User sur le registre |
| Les travaux lisent un compte de stockage sans rôle de stockage par utilisateur | Magasin basé sur l'identité, Storage Blob Data Reader pour l'identité managée du cluster |
| Un travail doit accéder aux données en tant que la personne qui l'a soumis | `identity: type: user_identity` dans le travail |

> **Piège d'examen.** AzureML Data Scientist ne peut pas créer de cluster de calcul, et Contributor ne peut pas attribuer de rôles. Quand un utilisateur doit « exécuter des travaux et créer son propre calcul », combinez AzureML Data Scientist et AzureML Compute Operator plutôt que de donner Contributor ou Owner.

<!-- section: key-points -->
## Points clés

- Un espace de travail a besoin d'un compte de stockage, d'un coffre de clés, d'Application Insights et (à la première image personnalisée) d'un registre de conteneurs ; le stockage et le coffre ne peuvent pas être changés ensuite.
- La suppression réversible garde un espace de travail et son nom pendant 14 jours ; calculs, points de terminaison, travaux en cours et attributions de rôles ajoutées ne sont pas récupérés.
- Un magasin de données référence un stockage existant ; sans informations d'identification il est basé sur l'identité et le lecteur a besoin de Storage Blob Data Reader. Les Readers voient les informations d'identification des magasins qui en ont.
- Les clusters ont par défaut `min_instances: 0`, `max_instances: 1`, 120 s d'inactivité, le niveau `dedicated` ; le calcul serverless demande seulement d'omettre `compute`.
- AzureML Data Scientist fait tout sauf le calcul et les modifications de l'espace de travail ; AzureML Compute Operator gère le calcul ; les rôles s'additionnent.
