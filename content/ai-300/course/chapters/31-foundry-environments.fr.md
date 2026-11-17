Une plateforme GenAIOps dans Microsoft Foundry commence par les ressources Azure : une ressource Foundry par environnement, des projets pour les équipes, des identités qui appellent les modèles sans clé, une mise en réseau privée et des modèles (templates) qui reconstruisent le tout à l'identique en développement, en test et en production. Les questions d'examen donnent une contrainte (privilège minimum, aucun accès réseau public, déploiement reproductible) et demandent la propriété de ressource, le rôle, le paramètre réseau ou la commande qui y répond.

<!-- section: foundry-resources | objectives: 3.1.1 -->
## Ressources Foundry et environnements de projet

Microsoft Foundry s'organise en deux types de ressources Azure, plus les ressources que vous connectez :

| Couche | Type de ressource Azure | Contient |
| --- | --- | --- |
| Ressource Foundry | `Microsoft.CognitiveServices/accounts`, kind `AIServices` | Limite d'administration, de sécurité et de supervision : mise en réseau, déploiements de modèles, connexions, consommation du quota |
| Projet Foundry | `Microsoft.CognitiveServices/accounts/projects` | Travail d'une équipe ou d'un cas d'usage : agents, évaluations, fichiers, jeux de données ; son propre contrôle d'accès |
| Ressources connectées | Compte de stockage, Azure Key Vault, Azure AI Search, Azure Cosmos DB, Application Insights | Vos données, secrets, index, état des agents et télémétrie, chacun avec ses propres paramètres réseau et d'accès |

Les projets sont des ressources enfants : ils ont leurs propres attributions de rôles mais **partagent** la sécurité réseau, les déploiements de modèles et les connexions de leur ressource Foundry parente. Le point de terminaison du projet est :

```text
https://<resource-name>.services.ai.azure.com/api/projects/<project-name>
```

Le modèle précédent, un **hub** avec des projets basés sur un hub (construits sur des espaces de travail Azure Machine Learning), reste servi par le portail Foundry (classique). Certaines fonctionnalités couvertes par cet examen n'existent que là, comme les déploiements `az ml serverless-endpoint`, le calcul managé sur des points de terminaison en ligne managés et prompt flow. Les nouveaux travaux ciblent les projets Foundry.

| Exigence | Conception |
| --- | --- |
| Séparer développement, test et production | Une ressource Foundry par environnement (souvent un groupe de ressources ou un abonnement chacun), avec le même modèle |
| Plusieurs équipes partagent déploiements et paramètres réseau | Une ressource Foundry, un projet par équipe |
| Une équipe ne doit pas voir les agents et évaluations d'une autre | Projets distincts, attributions de rôles à l'étendue du projet |
| Isolement réseau ou autre région pour une charge de travail | Une ressource Foundry distincte (réseau et déploiements sont au niveau de la ressource) |
| Exploration en libre-service dans un abonnement verrouillé | Les administrateurs créent la ressource ; les utilisateurs y ajoutent des projets |

Le **projet par défaut** compte. Le premier projet d'une ressource Foundry est marqué par défaut (`is_default` dans le code). Seul le projet par défaut prend en charge OpenAI Batch, le réglage précis (fine-tuning), les complétions stockées et le réglage précis Speech ; les autres projets prennent en charge Responses, Files et Conversations de l'API OpenAI. Si vous supprimez le projet par défaut, le prochain projet créé devient le projet par défaut. Un projet supprimé ne peut pas être récupéré.

Les **paramètres de capacité des agents** (où sont stockés l'état des agents, les vecteurs et les fichiers) peuvent être définis sur la ressource Foundry comme valeurs par défaut. Les projets en héritent, sauf s'ils les remplacent par `capabilitySettings` (`blobStore`, `documentStore`, `vectorStore`), qui ne peut être défini qu'à la création du projet. Modifier ensuite les valeurs par défaut de la ressource ne met pas à jour les projets existants. L'identité qui les définit a besoin de Storage Blob Data Contributor sur le compte de stockage et de Cosmos DB Operator sur le compte Azure Cosmos DB ; l'accès à l'exécution de l'identité managée du projet se configure séparément.

Les **connexions** relient une ressource ou un projet à des services externes (par exemple Azure AI Search ou un compte de stockage). Les connexions définies sur la ressource sont partagées avec ses projets ; `az cognitiveservices account connection` et `az cognitiveservices account project connection` les gèrent en ligne de commande.

Pour créer une ressource Foundry, il faut un rôle comme **Foundry Account Owner** ou **Foundry Owner** sur l'abonnement ou le groupe de ressources ; pour la créer pour une équipe et donner l'accès aux membres, il faut aussi un rôle qui peut attribuer des rôles, comme **Owner**.

> **Piège d'examen.** Le réglage précis et les travaux Batch échouent dans un deuxième projet de la même ressource Foundry : ces fonctionnalités ne sont disponibles que dans le projet par défaut. Et les points de terminaison privés ou les déploiements ne se définissent pas par projet : ils appartiennent à la ressource Foundry.

<!-- section: identity-rbac | objectives: 3.1.2 -->
## Gestion des identités et des accès

Foundry utilise Azure RBAC avec des rôles intégrés qui séparent le plan de contrôle (gérer ressources, projets, déploiements) et le plan de données (créer et exécuter des agents, des évaluations, des appels de modèles) :

| Rôle | Créer ressources et projets | Créer et développer (actions de données) | Attribuer des rôles | Gérer les modèles | Publier des agents | Appeler les points de terminaison d'agents |
| --- | --- | --- | --- | --- | --- | --- |
| Foundry Agent Consumer | Non | Non | Non | Non | Non | Oui |
| Foundry User | Non | Oui | Non | Non | Non | Oui |
| Foundry Project Manager | Voir la remarque | Oui | Foundry User uniquement | Non | Oui | Oui |
| Foundry Account Owner | Oui | Non | Foundry User, rôles ACR et de supervision | Oui | Non | Non |
| Foundry Owner | Oui | Oui | Foundry User, rôles ACR et de supervision | Oui | Oui | Oui |
| Contributor (Azure) | Oui | Non | Non | Oui | Non | Non |

Les quatre rôles Foundry s'appelaient auparavant Azure AI User, Azure AI Owner, Azure AI Account Owner et Azure AI Project Manager ; les ID de rôle et les autorisations n'ont pas changé. La matrice d'autorisations de Learn et ses exemples par profil se contredisent sur la création de projets par Foundry Project Manager : ne fondez pas une réponse sur ce seul point.

Attributions recommandées :

| Principal | Rôle et étendue |
| --- | --- |
| Développeurs d'une équipe | Foundry User sur le projet, Reader sur la ressource Foundry |
| Responsable d'équipe qui publie des agents et intègre les membres | Foundry Project Manager sur la ressource Foundry |
| Administrateurs de la plateforme | Foundry Account Owner sur la ressource Foundry |
| Application ou utilisateur qui n'appelle qu'un agent | Foundry Agent Consumer sur le projet, ou sur l'étendue de l'agent `.../accounts/<account>/projects/<project>/agents/<agent>` (CLI uniquement ; le portail l'attribue à l'étendue de la ressource) |
| Toute personne qui doit voir le quota ou vérifier l'éligibilité d'un déploiement | Cognitive Services Usages Reader sur l'**abonnement** (les étendues groupe de ressources et ressource n'autorisent pas l'API Usages) |
| Pipeline qui crée ou supprime des déploiements de calcul managé | Cognitive Services Contributor sur la ressource Foundry |

Les rôles qui commencent par « Cognitive Services » (sauf Usages Reader) ciblent directement les ressources AI Services et ne sont pas prévus pour les scénarios Foundry. **Azure AI Developer** s'applique aux espaces de travail Azure Machine Learning et aux hubs, pas aux projets Foundry.

**Identités managées.** La ressource Foundry et chaque projet peuvent avoir une identité managée, affectée par le système ou par l'utilisateur (`identity.type` vaut `SystemAssigned`, `UserAssigned`, `SystemAssigned, UserAssigned` ou `None`). Utilisez-les pour l'accès de service à service :

- Donnez à l'**identité managée du projet** Foundry User sur la ressource Foundry.
- Pour un compte de stockage créé hors de Foundry, donnez à l'**identité managée de la ressource Foundry** Storage Blob Data Reader sur ce compte ; pour un service Azure AI Search externe, ajoutez Foundry à ses attributions de rôles.
- Une identité affectée par l'utilisateur est une ressource distincte : créez-la, attribuez-lui ses rôles, puis référencez son ID de ressource (`--user-assigned-identity` sur `az cognitiveservices account project create`). Son cycle de vie ne dépend pas de la ressource Foundry.

**Accès sans clé.** RBAC ne s'applique qu'avec l'authentification Microsoft Entra ID. Une clé API donne un accès complet sans restriction de rôle. Les applications utilisent leur identité managée et `DefaultAzureCredential` ; définissez ensuite `disableLocalAuth: true` sur la ressource Foundry pour que les clés cessent de fonctionner.

Quand un utilisateur qui a le droit d'attribuer des rôles crée une ressource Foundry dans le portail Azure ou le portail Foundry, Foundry User lui est attribué automatiquement. Ce n'est pas le cas quand la ressource est déployée avec le SDK, la CLI ou un modèle : ajoutez l'attribution à votre modèle ou à votre script.

```bash
# Least privilege for an application that calls one agent only
az role assignment create \
  --assignee-object-id "<principal-id>" \
  --assignee-principal-type ServicePrincipal \
  --role "Foundry Agent Consumer" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-ai-prod/providers/Microsoft.CognitiveServices/accounts/contoso-ai-prod/projects/support/agents/order-agent"
```

> **Piège d'examen.** « Seules les identités qui ont le rôle X peuvent appeler le modèle » n'est pas appliqué tant que l'authentification par clé est activée : désactivez l'authentification locale. Et le rôle qui permet au code d'appeler des modèles et d'exécuter des évaluations est un rôle de données (Foundry User) ; Contributor et Owner peuvent déployer des modèles mais n'ont aucune action de données.

<!-- section: network-security | objectives: 3.1.3 -->
## Sécurité réseau et mise en réseau privée

Le trafic entrant et le trafic sortant se configurent séparément.

**Entrant** (les clients qui atteignent la ressource Foundry) :

| Exigence | Configuration |
| --- | --- |
| Aucun accès depuis Internet | Point de terminaison privé (sous-ressource cible « account ») dans la même région et le même abonnement que le réseau virtuel ; `publicNetworkAccess: 'Disabled'` |
| Accès uniquement depuis des plages IP ou des sous-réseaux connus | Accès réseau public activé depuis les réseaux sélectionnés : `networkAcls.defaultAction: 'Deny'` avec `ipRules` et `virtualNetworkRules` |
| Azure AI Search ou Azure Machine Learning doit atteindre une ressource restreinte | Exception pour les services approuvés (`networkAcls.bypass: 'AzureServices'`) plus un rôle pour l'identité managée de ce service |
| Résolution de noms depuis le réseau virtuel | Zone DNS privée pour le sous-domaine `privatelink`, liée au réseau virtuel (créée par défaut avec le point de terminaison privé) |
| Des utilisateurs locaux doivent passer par le point de terminaison privé | Passerelle VPN, ExpressRoute ou Azure Bastion vers le réseau virtuel ; un DNS personnalisé redirige vers la zone privée |

Seuls les points de terminaison privés à l'état **Approved** (approuvé) transportent du trafic ; en créer un demande Network Contributor sur le réseau virtuel, et approuver la connexion demande Contributor ou Owner sur la ressource Foundry. Validez avec `nslookup` depuis le réseau virtuel : le nom du point de terminaison doit se résoudre en adresse IP privée. Depuis l'extérieur, il se résout en point de terminaison public. Supprimer tous les points de terminaison privés ne rend pas la ressource publique, et activer l'accès public ne supprime pas les points de terminaison privés existants.

Le trafic **sortant** (les agents qui atteignent vos ressources) utilise l'**injection de réseau virtuel** : le client d'agent s'exécute dans votre sous-réseau, qui doit être délégué à `Microsoft.App/environments` et faire /27 ou plus. Utilisez la configuration d'agent standard (vos propres Storage, Azure AI Search et Azure Cosmos DB) pour que les données des agents restent dans votre locataire, et créez un point de terminaison privé sur chacune de ces ressources : ils ne sont pas créés automatiquement. Un réseau managé par Microsoft pour la délégation de sous-réseau existe aussi (`networkInjections.useMicrosoftManagedNetwork`, commandes `az cognitiveservices account managed-network` en préversion).

Les décisions sortantes se prennent au déploiement : vous ne pouvez ni changer le sous-réseau délégué ni ajouter l'injection de réseau à une ressource existante ; vous redéployez. N'utilisez pas `172.17.0.0/16` pour le réseau virtuel (réservé au réseau pont Docker).

| Outil d'agent | Comportement avec l'injection de réseau |
| --- | --- |
| MCP privé, OpenAPI, Azure Functions, agent à agent | Par votre sous-réseau |
| Azure AI Search, recherche de fichiers | Par des points de terminaison privés |
| Interpréteur de code, appel de fonction | Réseau principal Microsoft |
| Ancrage avec Bing, recherche web, ancrage SharePoint | Points de terminaison publics |
| Automatisation du navigateur, utilisation de l'ordinateur, génération d'images, Logic Apps | Non pris en charge |

> **Piège d'examen.** Un point de terminaison privé sur la ressource Foundry ne protège ni le compte de stockage, ni le service de recherche, ni le compte Cosmos DB utilisés par les agents : chacun a besoin de son propre point de terminaison privé et de son propre paramètre d'accès réseau public. Et le sous-réseau d'injection ne peut pas être ajouté plus tard : prévoyez-le dès le premier déploiement.

<!-- section: iac-bicep-cli | objectives: 3.1.4 -->
## Déployer avec Bicep et Azure CLI

Un modèle Bicep déclare la ressource Foundry, ses projets, les déploiements de modèles et les attributions de rôles, pour que chaque environnement soit identique :

```bicep
param location string = resourceGroup().location
param foundryName string
param projectName string = 'support'

resource foundry 'Microsoft.CognitiveServices/accounts@2026-05-01' = {
  name: foundryName
  location: location
  kind: 'AIServices'
  sku: { name: 'S0' }
  identity: { type: 'SystemAssigned' }
  properties: {
    allowProjectManagement: true
    customSubDomainName: foundryName
    publicNetworkAccess: 'Disabled'
    disableLocalAuth: true
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2026-05-01' = {
  parent: foundry
  name: projectName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    displayName: 'Customer support'
    description: 'Support agents and evaluations'
  }
}

resource chat 'Microsoft.CognitiveServices/accounts/deployments@2026-05-01' = {
  parent: foundry
  name: 'chat'
  sku: { name: 'GlobalStandard', capacity: 50 }
  properties: {
    model: { format: 'OpenAI', name: 'gpt-4.1-mini', version: '2025-04-14' }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}
```

| Propriété | Pourquoi elle compte |
| --- | --- |
| `kind: 'AIServices'` | Le type (kind) de la ressource Foundry |
| `allowProjectManagement: true` | Autorise les ressources enfants `projects` ; sans elle, la ressource ne peut pas contenir de projets Foundry |
| `customSubDomainName` | Sous-domaine utilisé pour l'authentification par jeton Microsoft Entra et le point de terminaison `services.ai.azure.com` |
| `identity` | Identité managée de la ressource ; les projets ont leur propre bloc `identity` |
| `publicNetworkAccess`, `networkAcls` | Règles réseau entrantes |
| `disableLocalAuth` | Désactive les clés API |
| Les déploiements sont des enfants de `accounts` | Les projets consomment les déploiements de leur ressource parente |

Les mêmes étapes avec Azure CLI :

```bash
az group create --name rg-ai-dev --location eastus2

az cognitiveservices account create \
  --name contoso-ai-dev --resource-group rg-ai-dev --location eastus2 \
  --kind AIServices --sku S0 \
  --custom-domain contoso-ai-dev \
  --assign-identity --allow-project-management true --yes

az cognitiveservices account project create \
  --name contoso-ai-dev --resource-group rg-ai-dev --location eastus2 \
  --project-name support --assign-identity

az cognitiveservices account deployment create \
  --name contoso-ai-dev --resource-group rg-ai-dev \
  --deployment-name chat \
  --model-name gpt-4.1-mini --model-version "2025-04-14" --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 50

# Deploy the Bicep template per environment
az deployment group create --resource-group rg-ai-dev \
  --template-file main.bicep --parameters foundryName=contoso-ai-dev
```

Dans `az cognitiveservices account`, `--name` désigne toujours la ressource Foundry ; le projet est `--project-name` et le déploiement `--deployment-name`. Autres groupes utiles : `account identity`, `account network-rule`, `account keys`, `account connection`, `account list-deleted`, `recover` et `purge` (une ressource supprimée est conservée et peut être récupérée ou purgée ; voir et purger les comptes supprimés demande Contributor à l'étendue de l'abonnement).

Remarques pratiques tirées des modèles Learn : le nom de la ressource doit être globalement unique (2 à 64 lettres minuscules, chiffres et traits d'union dans l'exemple) ; une erreur `ServiceModelDeprecating` signifie qu'une version de modèle référencée dans le fichier Bicep est retirée ; pour partir d'une ressource existante, utilisez **Exporter le modèle** dans le portail Azure. Les modèles qui définissent les paramètres de capacité des agents demandent Storage Blob Data Contributor et Cosmos DB Operator pour l'identité de déploiement.

> **Conseil d'examen.** En infrastructure en tant que code, un modèle qui déploie la ressource ne donne accès à personne : déclarez des `Microsoft.Authorization/roleAssignments` pour les utilisateurs, l'identité managée du projet et les identités des applications, car l'attribution automatique de Foundry User n'a lieu que dans les portails.

<!-- section: key-points -->
## Points clés

- Ressource Foundry (`accounts`, kind `AIServices`) = réseau, déploiements, connexions ; projets (`accounts/projects`) = agents, évaluations, fichiers, contrôle d'accès.
- Une ressource par environnement ; un projet par équipe. Batch, réglage précis et complétions stockées uniquement dans le projet par défaut.
- Foundry User pour ceux qui créent et pour les identités managées des projets ; Agent Consumer pour ceux qui appellent ; Account Owner pour les administrateurs ; Usages Reader à l'étendue de l'abonnement pour le quota.
- Les clés contournent RBAC : identité managée, `DefaultAzureCredential`, puis `disableLocalAuth: true`.
- Entrant : point de terminaison privé plus `publicNetworkAccess: 'Disabled'` ; sortant : sous-réseau délégué à `Microsoft.App/environments`, /27 ou plus, décidé au déploiement. Les ressources connectées ont besoin de leurs propres points de terminaison privés.
- Bicep : `allowProjectManagement: true`, `customSubDomainName`, `identity` ; CLI : `az cognitiveservices account create`, `account project create`, `account deployment create`.
