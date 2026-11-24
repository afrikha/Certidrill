Une plateforme MLOps se reconstruit à partir de code, pas de clics dans le portail : Bicep ou des YAML de la CLI décrivent l'espace de travail et son calcul, un workflow GitHub Actions les déploie et exécute les travaux, Git place chaque définition sous contrôle de version, et les paramètres réseau tiennent l'espace de travail à l'écart de l'internet public. Les questions d'examen montrent un workflow, une ressource Bicep ou un fichier YAML d'espace de travail à compléter, demandent comment GitHub doit s'authentifier sans secret, et quel mode d'isolation ou quel point de terminaison privé répond à une exigence réseau.

<!-- section: github-access | objectives: 1.3.1 -->
## Configurer un accès sécurisé depuis GitHub

Un workflow qui exécute des commandes `az` doit se connecter à Azure avec une identité qui possède un rôle Azure. Microsoft Learn décrit deux options :

| Option | Ce que GitHub stocke | Appréciation |
| --- | --- | --- |
| OpenID Connect (OIDC) avec des informations d'identification fédérées, sur une application Microsoft Entra ou une identité managée affectée par l'utilisateur | ID client, ID de locataire, ID d'abonnement (des identifiants, pas des secrets) | Recommandé : le jeton de courte durée de GitHub est échangé contre un jeton Azure, rien n'expire ni ne fuit |
| Principal de service avec un secret client | Tout le JSON d'informations d'identification dans un secret nommé `AZURE_CREDENTIALS` | Moins sûr, déconseillé : le secret doit être stocké et renouvelé |

Mise en place d'OIDC :

1. Créez une application Microsoft Entra (avec son principal de service) ou une identité managée affectée par l'utilisateur.
2. Attribuez-lui un rôle Azure à l'étendue la plus étroite qui fonctionne (voir le tableau plus bas).
3. Ajoutez des informations d'identification fédérées qui font confiance aux jetons émis par GitHub pour ce dépôt.
4. Stockez l'ID client, l'ID de locataire et l'ID d'abonnement comme secrets GitHub (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`).
5. Dans le workflow, accordez `permissions: id-token: write` et connectez-vous avec `azure/login`.

```json
{
  "name": "ml-platform-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:contoso/ml-platform:environment:production",
  "description": "GitHub Actions, production environment",
  "audiences": ["api://AzureADTokenExchange"]
}
```

```bash
az ad app federated-credential create --id <application-object-id> --parameters credential.json
```

| Entité des informations d'identification fédérées | Sujet |
| --- | --- |
| Environnement | `repo:<org>/<repo>:environment:<name>` |
| Branche | `repo:<org>/<repo>:ref:refs/heads/<branch>` |
| Étiquette (tag) | `repo:<org>/<repo>:ref:refs/tags/<tag>` |

Règles : le sujet doit correspondre exactement au workflow (une erreur est acceptée à la création et n'échoue qu'à la connexion), les caractères génériques ne sont pas pris en charge, l'audience est `api://AzureADTokenExchange`, et une application ou une identité managée contient au maximum 20 informations d'identification fédérées.

Quel rôle donner à l'identité du workflow :

| Le workflow... | Rôle et étendue |
| --- | --- |
| Soumet seulement des travaux et inscrit des modèles dans un espace de travail existant | AzureML Data Scientist sur l'espace de travail |
| Déploie l'espace de travail, ses ressources associées et le calcul avec Bicep | Contributor sur le groupe de ressources |
| Crée aussi des attributions de rôles dans le fichier Bicep | Ajouter Role Based Access Control Administrator ou User Access Administrator sur cette étendue |

Utilisez des **secrets d'environnement** GitHub pour la production : quand l'environnement exige des réviseurs, un travail ne peut pas lire ses secrets avant qu'un réviseur approuve.

> **Piège d'examen.** Quand un travail déclare `environment: production`, le jeton de GitHub porte le sujet de l'environnement (`...:environment:production`), pas celui de la branche. Des informations d'identification fédérées créées pour `ref:refs/heads/main` échouent alors à la connexion : créez-les pour l'entité Environnement.

<!-- section: bicep-cli | objectives: 1.3.2 -->
## Déployer des espaces de travail et des ressources avec Bicep et Azure CLI

Le type de ressource de l'espace de travail est `Microsoft.MachineLearningServices/workspaces` ; les cibles de calcul sont son enfant `workspaces/computes`. La dernière version d'API en disponibilité générale des deux est `2026-09-01` ; les exemples utilisent `2026-05-01`, qui reste valide.

```bicep
param location string = resourceGroup().location
param storageAccountId string
param keyVaultId string
param appInsightsId string
param containerRegistryId string

resource workspace 'Microsoft.MachineLearningServices/workspaces@2026-05-01' = {
  name: 'mlw-contoso-prod'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    friendlyName: 'Contoso production workspace'
    storageAccount: storageAccountId
    keyVault: keyVaultId
    applicationInsights: appInsightsId
    containerRegistry: containerRegistryId
    publicNetworkAccess: 'Disabled'
    systemDatastoresAuthMode: 'Identity'
    managedNetwork: {
      isolationMode: 'AllowOnlyApprovedOutbound'
    }
  }
}

resource cluster 'Microsoft.MachineLearningServices/workspaces/computes@2026-05-01' = {
  parent: workspace
  name: 'cpu-cluster'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    computeType: 'AmlCompute'
    properties: {
      vmSize: 'STANDARD_DS3_V2'
      vmPriority: 'LowPriority'
      enableNodePublicIp: false
      scaleSettings: {
        minNodeCount: 0
        maxNodeCount: 4
        nodeIdleTimeBeforeScaleDown: 'PT120S'
      }
    }
  }
}
```

```bash
az deployment group what-if --resource-group rg-ml-prod --template-file main.bicep --parameters main.bicepparam
az deployment group create --resource-group rg-ml-prod --template-file main.bicep --parameters main.bicepparam
```

Les mêmes paramètres existent en Bicep (noms de propriétés ARM, valeurs en PascalCase) et dans le YAML d'espace de travail de la CLI (clés et valeurs en snake_case) :

| Paramètre | Bicep | YAML de la CLI |
| --- | --- | --- |
| Ressources associées (ID) | `storageAccount`, `keyVault`, `applicationInsights`, `containerRegistry` | `storage_account`, `key_vault`, `application_insights`, `container_registry` |
| Accès public | `publicNetworkAccess: 'Disabled'` | `public_network_access: Disabled` |
| Réseau managé | `managedNetwork.isolationMode: 'AllowOnlyApprovedOutbound'` | `managed_network.isolation_mode: allow_only_approved_outbound` |
| Impact métier élevé | `hbiWorkspace: true` | `hbi_workspace: true` |
| Calcul de construction d'images | `imageBuildCompute` | `image_build_compute` |
| Identité affectée par l'utilisateur | `primaryUserAssignedIdentity` | `primary_user_assigned_identity` |
| Authentification aux magasins de données par défaut | `systemDatastoresAuthMode` : `'AccessKey'`, `'Identity'` ou `'UserDelegationSAS'` | |

Propriétés de calcul en Bicep : `computeType` (`'AmlCompute'`, `'ComputeInstance'`, `'Kubernetes'`, `'VirtualMachine'` et d'autres), `vmPriority` (`'Dedicated'` ou `'LowPriority'`), `scaleSettings` (`maxNodeCount` obligatoire, `minNodeCount`, `nodeIdleTimeBeforeScaleDown`), `enableNodePublicIp: false` (nœuds sans IP publique), `subnet`. Une instance de calcul prend `idleTimeBeforeShutdown` au format ISO 8601 (de 15 minutes à 3 jours) et `personalComputeInstanceSettings.assignedUser` (ID d'objet et ID de locataire).

`keyVault` et `storageAccount` ne peuvent pas être changés après la création, si bien qu'un redéploiement avec d'autres ID échoue : prévoyez-les dès le premier déploiement.

Avec Azure CLI, chaque ressource et chaque actif a un fichier YAML et une commande `az ml`, ce qui fait de la CLI l'outil naturel pour ce que Bicep ne décrit pas (actifs et travaux) :

| Ressource ou actif | Commande |
| --- | --- |
| Espace de travail | `az ml workspace create --file workspace.yml` |
| Calcul | `az ml compute create --file cluster.yml` |
| Magasin de données | `az ml datastore create --file datastore.yml` |
| Environnement, composant, données, modèle | `az ml environment create`, `az ml component create`, `az ml data create`, `az ml model create` |
| Travail ou pipeline | `az ml job create --file pipeline.yml` |
| Registre | `az ml registry create --file registry.yml` |

> **Piège d'examen.** Bicep et YAML écrivent la même valeur différemment. `isolationMode: 'AllowOnlyApprovedOutbound'` va dans un fichier Bicep, `isolation_mode: allow_only_approved_outbound` dans un fichier YAML de la CLI ; une liste déroulante qui mélange les deux n'a qu'une bonne réponse par type de fichier.

<!-- section: github-actions | objectives: 1.3.3 -->
## Automatiser l'approvisionnement avec des workflows GitHub Actions

Un workflow est un fichier YAML dans `.github/workflows/`. Il comporte des déclencheurs (`on`), des autorisations, et des travaux faits d'étapes qui s'exécutent sur un exécuteur (runner). Un workflow d'approvisionnement typique : connexion avec OIDC, déploiement Bicep, installation de l'extension `ml`, création des actifs, soumission du pipeline d'entraînement.

```yaml
name: ml-platform-deploy
on:
  push:
    branches: [main]
    paths:
      - infra/**
      - ml/**
  workflow_dispatch:
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Azure login with OpenID Connect
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Deploy workspace and compute
        run: az deployment group create -g rg-ml-prod --template-file infra/main.bicep --parameters infra/main.bicepparam
      - name: Install the ml extension
        run: az extension add -n ml -y
      - name: Register assets and run the pipeline
        run: |
          az configure --defaults workspace=mlw-contoso-prod group=rg-ml-prod
          az ml environment create --file ml/env/churn-train-env.yml
          az ml component create --file ml/components/train.yml
          az ml job create --file ml/pipelines/churn-training.yml
```

| Élément | Rôle |
| --- | --- |
| `on.push` avec `branches` et `paths` | Exécuter seulement quand des fichiers d'infrastructure ou de ML changent sur `main` |
| `on.pull_request` | Valider une modification avant la fusion (par exemple `what-if`, ou un court entraînement sur un espace de travail de dev) |
| `on.schedule` avec `cron` | Exécutions périodiques, comme un réentraînement hebdomadaire |
| `on.workflow_dispatch` | Exécution manuelle depuis l'onglet Actions |
| `permissions: id-token: write` | Permet au travail de demander le jeton OIDC ; sans elle, `azure/login` échoue en OIDC |
| `contents: read` | Nécessaire à `actions/checkout` dès que les autorisations sont définies explicitement, car celles qui ne sont pas listées passent à aucune |
| `environment: production` | Applique les règles de protection (réviseurs requis) et les secrets de l'environnement |
| `azure/login@v2` avec `client-id`, `tenant-id`, `subscription-id` | Connexion OIDC ; avec un secret de principal de service, `creds: ${{ secrets.AZURE_CREDENTIALS }}` à la place |

Ordre typique d'un pipeline de promotion : espace de travail de dev (entraîner et évaluer sur pull request) → registre (partager le modèle validé et son environnement) → espaces de travail de test et de prod (déployer depuis le registre, chacun derrière son propre environnement GitHub et ses réviseurs). Chaque étape se connecte avec ses propres informations d'identification fédérées et un rôle de privilège minimum.

> **Piège d'examen.** Le « pipeline » de machine learning (YAML de travail `type: pipeline` soumis avec `az ml job create`) et le workflow GitHub Actions sont deux choses différentes : le workflow s'exécute sur un exécuteur GitHub et se contente de soumettre le pipeline, qui s'exécute sur le calcul Azure Machine Learning.

<!-- section: network-isolation | objectives: 1.3.4 -->
## Restreindre l'accès réseau aux espaces de travail Machine Learning

Deux paramètres indépendants : l'accès **entrant** à l'espace de travail (accès réseau public et points de terminaison privés) et le trafic **sortant** du calcul managé (réseau virtuel managé).

**Entrant.** Définissez `public_network_access: Disabled` et créez un point de terminaison privé pour l'espace de travail dans votre réseau virtuel, avec l'ID de groupe `amlworkspace` et les zones DNS privées `privatelink.api.azureml.ms` et `privatelink.notebooks.azure.net`.

```bash
az ml workspace update -n mlw-contoso-prod -g rg-ml-prod --public-network-access disabled

az network private-endpoint create --name pe-mlw-prod \
  --vnet-name vnet-hub --subnet snet-private-endpoints \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.MachineLearningServices/workspaces/mlw-contoso-prod" \
  --group-id amlworkspace --connection-name workspace -l westeurope
```

**Sortant : réseau virtuel managé.** Azure Machine Learning crée et exploite un réseau isolé pour son calcul managé :

| Mode d'isolation | Trafic sortant | À utiliser quand |
| --- | --- | --- |
| `disabled` (par défaut) | Non restreint, ou géré par votre propre réseau virtuel | Vous exploitez votre propre réseau, ou n'avez pas besoin d'isolation |
| `allow_internet_outbound` | Tout le trafic sortant vers internet autorisé | Accès sans restriction aux packages et aux modèles préentraînés |
| `allow_only_approved_outbound` | Seulement les destinations requises et vos règles de trafic sortant | Réduire le risque d'exfiltration de données |

```yaml
name: mlw-contoso-prod
managed_network:
  isolation_mode: allow_only_approved_outbound
  firewall_sku: basic
  outbound_rules:
    - name: pypi
      type: fqdn
      destination: 'pypi.org'
    - name: sales-storage
      type: private_endpoint
      destination:
        service_resource_id: /subscriptions/<sub-id>/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stcontososales
        subresource_target: blob
        spark_enabled: false
    - name: datafactory
      type: service_tag
      destination:
        service_tag: DataFactory
        protocol: TCP
        port_ranges: 443
```

```bash
az ml workspace create --name mlw-contoso-dev --resource-group rg-ml-dev --managed-network allow_internet_outbound
az ml workspace update --file workspace.yml --resource-group rg-ml-prod --name mlw-contoso-prod
az ml workspace provision-network -g rg-ml-prod -n mlw-contoso-prod
az ml workspace show -n mlw-contoso-prod -g rg-ml-prod --query managed_network
```

Règles du réseau virtuel managé :

- Types de règles de trafic sortant : `private_endpoint` (vers une ressource Azure), `service_tag` et `fqdn`. Les règles d'étiquette de service et FQDN ne sont valides qu'en `allow_only_approved_outbound`.
- Les règles FQDN sont implémentées avec un Pare-feu Azure facturé : Standard par défaut, Basic avec `firewall_sku: basic` ; Premium n'est pas pris en charge. Les règles FQDN n'autorisent que les ports 80 et 443, et ne peuvent pas servir à atteindre un compte de stockage en mode approuvé uniquement : utilisez une règle de point de terminaison privé.
- Les points de terminaison privés requis vers le stockage, le coffre de clés, le registre de conteneurs et l'espace de travail sont créés automatiquement au provisionnement du réseau, pas avant (en mode internet sortant, seulement pour les ressources dont l'accès public est désactivé).
- Le réseau est provisionné à la création du premier calcul (cela peut prendre environ 30 minutes), ou à la demande avec `az ml workspace provision-network` ou `--provision-network-now` à la création. Provisionnez-le avant de créer un déploiement en ligne. Pour les travaux Spark serverless, provisionnez-le manuellement avec `az ml workspace provision-network --include-spark`, après avoir désactivé l'accès réseau public de l'espace de travail.
- Une fois activée, l'isolation par réseau managé ne peut plus être désactivée, et le mode ne peut changer dans aucun sens : le mode approuvé uniquement ne peut pas devenir internet sortant, et le mode internet sortant ne peut pas devenir approuvé uniquement. Le calcul existant n'est pas migré : recréez clusters, instances et points de terminaison en ligne managés.
- Dans un réseau managé, le calcul ne peut pas être placé dans votre propre réseau virtuel ; Kubernetes et les VM attachées ne sont pas pris en charge, et un cluster ne peut pas être créé dans une autre région.
- Prérequis : le fournisseur de ressources `Microsoft.Network` inscrit, et le rôle Azure AI Enterprise Network Connection Approver pour que l'identité de l'espace de travail approuve les connexions de points de terminaison privés vers vos ressources.

Alternative sans réseau managé : gardez `disabled` et placez le calcul dans votre propre sous-réseau (`network_settings.subnet` dans le YAML du calcul, `enableNodePublicIp: false` pour des clusters sans IP publique). Quand le compte de stockage ou le registre de conteneurs utilise des points de terminaison privés, la construction d'images par défaut sur calcul serverless ne fonctionne pas : définissez `image_build_compute` avec un cluster de calcul CPU du réseau virtuel.

| Exigence | Réponse |
| --- | --- |
| Les utilisateurs n'atteignent le studio que depuis le réseau de l'entreprise | Accès réseau public désactivé plus un point de terminaison privé de l'espace de travail |
| L'entraînement ne doit atteindre que des destinations approuvées | `allow_only_approved_outbound` |
| L'entraînement a besoin de `pypi.org` en mode approuvé uniquement | Règle de trafic sortant `fqdn` (coût du Pare-feu Azure) |
| L'entraînement lit un compte de stockage en mode approuvé uniquement | Règle de trafic sortant `private_endpoint` avec `subresource_target: blob` |
| Packages venant d'internet, aucune gestion du réseau | `allow_internet_outbound` |

> **Piège d'examen.** Désactiver l'accès réseau public ne protège que l'accès entrant ; cela n'empêche pas un travail d'entraînement d'envoyer des données vers internet. La protection contre l'exfiltration de données vient de `allow_only_approved_outbound`.

<!-- section: git-source-control | objectives: 1.3.5 -->
## Gérer le contrôle de code source avec Git

Tout ce qui définit la plateforme appartient à un dépôt Git : fichiers Bicep, YAML d'espace de travail et de calcul, définitions d'environnements, de composants et de pipelines, code d'entraînement et de scoring, et workflows GitHub. Jamais les secrets : gardez-les dans les secrets GitHub ou Azure Key Vault, et préférez l'accès basé sur l'identité.

```text
ml-platform/
├── .github/workflows/      deploy and training workflows
├── infra/                  main.bicep, main.bicepparam
└── ml/
    ├── env/                environment YAML and conda files
    ├── components/         component YAML and their src folders
    ├── pipelines/          pipeline job YAML
    └── data/               data asset YAML
```

**Git sur une instance de calcul.** Ouvrez un terminal sur l'instance de calcul (elle dispose d'un client Git complet) et clonez dans votre propre dossier utilisateur pour que les branches de vos collègues n'entrent pas en conflit. Les fichiers sous `~/cloudfiles/code/` se trouvent sur le partage de fichiers de l'espace de travail et survivent à la suppression de l'instance ; un clone sur le disque local de l'instance est plus rapide mais perdu quand l'instance est supprimée. Authentifiez-vous avec une clé SSH générée dans le terminal (seul le propriétaire de l'instance y a accès) ou avec un jeton d'accès personnel en HTTPS :

```bash
ssh-keygen -t ed25519 -C "ana@contoso.com"
cat ~/.ssh/id_ed25519.pub        # add this public key to GitHub
git clone git@github.com:contoso/ml-platform.git
git checkout -b feature/churn-lr
```

**Suivi Git des travaux.** Quand un travail est soumis depuis la CLI ou le SDK à l'intérieur d'un dépôt Git (et que `git` est installé), Azure Machine Learning enregistre des propriétés Git sur le travail :

| Propriété | Contenu |
| --- | --- |
| `azureml.git.repository_uri` ou `mlflow.source.git.repoURL` | Dépôt d'où le code a été cloné |
| `azureml.git.branch` ou `mlflow.source.git.branch` | Branche active |
| `azureml.git.commit` ou `mlflow.source.git.commit` | Hash du commit du code soumis |
| `azureml.git.dirty` | `True` quand il y avait des modifications non validées |

Dans le studio : **Overview** du travail > **Properties** > **See all properties** > **Raw JSON**. Depuis la CLI :

```bash
az ml job show --name <job-name> --query "{GitCommit:properties.\"azureml.git.commit\"}"
```

Un travail dont `azureml.git.dirty` vaut `True` ne peut pas être reproduit à partir du seul commit enregistré : validez (commit) avant de soumettre les travaux dont les résultats comptent.

Pratique des branches : travaillez sur des branches de fonctionnalité, ouvrez une pull request qui déclenche un workflow de validation, protégez `main`, et ne laissez que les fusions dans `main` (ou les étiquettes) déclencher les déploiements en test et en prod.

> **Piège d'examen.** Si les propriétés Git manquent sur un travail, vérifiez que `git --version` fonctionne sur la machine qui a soumis le travail et que le dossier de code se trouve dans le dépôt cloné ; ce n'est pas un paramètre de l'espace de travail à activer.

<!-- section: key-points -->
## Points clés

- GitHub se connecte avec OIDC : informations d'identification fédérées (émetteur `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`, sujet exact), `permissions: id-token: write`, `azure/login@v2` avec les ID client, de locataire et d'abonnement.
- Le sujet dépend du contexte du déclencheur : environnement, branche ou étiquette ; un travail avec `environment:` utilise le sujet de l'environnement.
- Bicep : `Microsoft.MachineLearningServices/workspaces` (dernière version d'API en disponibilité générale `2026-09-01`) et l'enfant `workspaces/computes` ; valeurs en PascalCase en Bicep, en snake_case dans le YAML de la CLI.
- Protection entrante : accès réseau public désactivé plus un point de terminaison privé (`amlworkspace`) ; protection sortante : réseau managé `allow_only_approved_outbound`.
- Les règles de trafic sortant FQDN ajoutent un Pare-feu Azure facturé et n'autorisent que les ports 80 et 443 ; l'isolation par réseau managé ne peut plus être désactivée une fois activée, et son mode ne peut pas être changé.
- Les travaux enregistrent le dépôt, la branche, le commit et l'indicateur « dirty » quand ils sont soumis depuis un dossier de travail Git.
