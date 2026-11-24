Configurer une solution IA dans Microsoft Foundry, c'est concevoir les ressources Azure qui l'entourent, choisir comment chaque modèle est déployé, configurer les déploiements de modèles et d'agents, puis automatiser le tout dans un pipeline CI/CD. Les questions d'examen portent sur l'ordre des opérations, le type de déploiement adapté à une contrainte, les paramètres d'un déploiement et l'identité utilisée par un pipeline.

<!-- section: infrastructure | objectives: 1.2.1 -->
## Concevoir l'infrastructure Azure

Foundry est organisé en couches :

| Couche | Ressource Azure | Contient |
| --- | --- | --- |
| Ressource Foundry | `Microsoft.CognitiveServices/accounts`, kind `AIServices` | Gouvernance : réseau, sécurité, déploiements de modèles, connexions |
| Projet Foundry | `Microsoft.CognitiveServices/accounts/projects` | Périmètre de développement d'une équipe : agents, fichiers, évaluations, contrôle d'accès |
| Ressources connectées | Compte de stockage, Azure Key Vault, Azure AI Search, Application Insights | Vos données, secrets, index et télémétrie, chacun avec ses propres règles réseau et d'accès |

Les projets réutilisent les déploiements et les connexions de leur ressource Foundry : une nouvelle équipe peut démarrer sans reconfiguration par l'équipe informatique. Le schéma habituel est une ressource par environnement (développement, test, production) et un projet par équipe ou par cas d'usage. L'ancien modèle (un hub avec des ressources Azure OpenAI et Azure AI services, et des projets basés sur un hub) reste visible dans le portail Foundry (classic) ; les nouveaux investissements portent sur les projets Foundry.

Le point de terminaison d'un projet a ce format :

```text
https://<resource-name>.services.ai.azure.com/api/projects/<project-name>
```

Les choix de conception à faire avant de déployer :

| Décision | Options | Critère |
| --- | --- | --- |
| Région | Une région où les modèles et fonctionnalités nécessaires sont disponibles | Disponibilité des modèles, résidence des données, quota |
| Données des agents | **Configuration de base** : threads, messages et fichiers dans un stockage multilocataire managé par Microsoft. **Configuration standard** : vos propres Azure Cosmos DB for NoSQL (conversations et état des agents), Stockage Azure (fichiers) et Azure AI Search (magasins de vecteurs) | Isolation des données, conformité, clés gérées par le client |
| Secrets des connexions | Key Vault managé par Microsoft (par défaut), ou votre propre Azure Key Vault connecté une fois pour la ressource et tous ses projets | Maîtrise des secrets |
| Réseau | Accès public, points de terminaison privés, et pour les agents un réseau virtuel : votre propre sous-réseau délégué à `Microsoft.App/environments`, ou un réseau virtuel managé | Isolation |
| Chiffrement | Clés managées par Microsoft (par défaut) ou clés gérées par le client dans Key Vault | Conformité |

Pour une configuration standard des agents, le compte Cosmos DB doit offrir un débit total d'au moins 3 000 RU/s ; la configuration crée trois à cinq conteneurs par projet, chacun demandant 1 000 RU/s (deux projets avec des agents de l'API Responses demandent 10 000 RU/s), et une capacité insuffisante fait échouer le provisionnement. La personne qui la crée a besoin du rôle Foundry Account Owner à l'étendue de l'abonnement, plus du droit d'attribuer des rôles sur Cosmos DB, Search et Storage (Owner ou Role Based Access Control Administrator). Gardez la ressource Azure OpenAI, la ressource Foundry et le projet dans la même région. Les ressources qu'un projet utilise pour l'état des agents, les fichiers et les vecteurs ne peuvent pas être changées sur un projet existant : il faut supprimer et recréer le projet.

Votre propre Key Vault est relié par une connexion Key Vault : une seule par ressource Foundry, créée en premier, quand la ressource et ses projets n'ont encore aucune autre connexion. L'identité managée de la ressource Foundry doit disposer au minimum du rôle **Key Vault Secrets Officer** sur le coffre, et les secrets existants ne sont pas migrés : vous recréez les connexions.

Pour les clés gérées par le client, le coffre de clés doit être dans la même région que la ressource Foundry, avec la suppression réversible et la protection contre le vidage activées, et l'identité managée doit disposer des autorisations sur les clés, par exemple le rôle **Key Vault Crypto User**.

> **Piège d'examen.** L'injection de réseau virtuel sortante ne peut pas être ajoutée à une ressource Foundry existante, et ses paramètres sortants ne peuvent pas être modifiés : vous redéployez la ressource. Et les points de terminaison privés de la ressource Foundry ne couvrent pas les ressources connectées : le stockage, Key Vault et Azure AI Search ont chacun besoin de leurs propres paramètres réseau.

<!-- section: deployment-options | objectives: 1.2.2 -->
## Choisir les options de déploiement

Les modèles se déploient de deux façons. Les déploiements **API serverless** (Foundry Models vendus directement par Azure, et de nombreux modèles de partenaires) sont payés au jeton ou en débit réservé, avec les types de déploiement ci-dessous. Le **calcul managé** (managed compute) héberge des modèles open source ou personnalisés sur des machines virtuelles dédiées et n'utilise pas ces types de déploiement.

| Type de déploiement | Nom de SKU | Données traitées | Facturation | Idéal pour |
| --- | --- | --- | --- | --- |
| Global Standard | `GlobalStandard` | N'importe quelle région Azure | Au jeton | Par défaut : prix le plus bas, quota le plus élevé, premier à recevoir les nouveaux modèles |
| Data Zone Standard | `DataZoneStandard` | Dans une zone de données (US, UE ou APAC) | Au jeton | Conformité à une zone de données |
| Standard | `Standard` | Dans la zone géographique Azure | Au jeton | Conformité à une zone géographique, volume faible ou irrégulier |
| Global Provisioned | `GlobalProvisionedManaged` | N'importe quelle région Azure | PTU réservées, à l'heure | Débit élevé et prévisible |
| Data Zone Provisioned | `DataZoneProvisionedManaged` | Dans une zone de données | PTU réservées, à l'heure | Zone de données plus débit prévisible |
| Regional Provisioned | `ProvisionedManaged` | Dans la zone géographique Azure | PTU réservées, à l'heure | Zone géographique plus débit prévisible |
| Global Batch | `GlobalBatch` | N'importe quelle région Azure | 50 % de moins que Global Standard | Gros travaux asynchrones, objectif de 24 heures |
| Data Zone Batch | `DataZoneBatch` | Dans une zone de données | 50 % de moins que Global Standard | Gros travaux asynchrones avec conformité à une zone de données |
| Developer | `DeveloperTier` | N'importe quelle région Azure | Au jeton | Évaluer des modèles affinés uniquement ; sans SLA, supprimé après 24 heures |

Les types Standard fonctionnent au mieux ; les types provisionnés garantissent le débit et réduisent la variabilité de la latence. Les requêtes Batch n'ont pas de SLA temps réel : leur exécution vise 24 heures et peut durer plus longtemps.

| Exigence | Type de déploiement |
| --- | --- |
| Nouveau projet, aucune contrainte de résidence | Global Standard |
| Les invites ne doivent être traitées que dans l'UE | Data Zone Standard |
| Les données doivent rester dans une zone géographique | Standard ou Regional Provisioned |
| Trafic élevé et régulier, latence constante, application critique | Provisionné (Global, Data Zone ou Regional) |
| Classer 5 millions de documents archivés, sans échéance aujourd'hui | Global Batch |
| Tester à moindre coût un modèle affiné avant la production | Developer |

> **Piège d'examen.** « Global » signifie que la requête peut être traitée dans n'importe quelle région Azure, mais les données au repos restent dans la zone géographique de la ressource. Si l'énoncé exige que les invites ne soient traitées que dans l'UE, Global Standard est faux et Data Zone Standard est juste.

<!-- section: configure-deployments | objectives: 1.2.3 -->
## Configurer les déploiements de modèles et d'agents

Un déploiement de modèle a un **nom de déploiement** (la valeur que votre code passe dans `model`), un modèle et sa version, un type de déploiement (SKU), une capacité, un filtre de contenu et une stratégie de mise à niveau de version.

```bash
az cognitiveservices account deployment create \
  --name contoso-foundry --resource-group rg-ai \
  --deployment-name chat-prod \
  --model-name gpt-4.1-mini --model-version "2025-04-14" --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 100
```

Le même déploiement en Bicep, avec la stratégie de version et un filtre de contenu personnalisé :

```bicep
resource chat 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: foundry
  name: 'chat-prod'
  sku: { name: 'GlobalStandard', capacity: 100 }
  properties: {
    model: { format: 'OpenAI', name: 'gpt-4.1-mini', version: '2025-04-14' }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
    raiPolicyName: 'contoso-strict-filter'
  }
}
```

| Paramètre | Valeurs et effet |
| --- | --- |
| `versionUpgradeOption` | `OnceNewDefaultVersionAvailable` : mise à niveau dans les deux semaines qui suivent la désignation d'une nouvelle version par défaut. `OnceCurrentVersionExpired` (également le comportement quand la valeur est `null`) : mise à niveau vers la version par défaut actuelle quand la version fixée est mise hors service. `NoAutoUpgrade` : jamais de mise à niveau ; le déploiement cesse de fonctionner à la mise hors service |
| `sku.capacity` | Unités de débit prises sur le quota de l'abonnement (TPM pour les types Standard, PTU pour les types provisionnés) |
| `raiPolicyName` | Le filtre de contenu (garde-fou) appliqué aux invites et aux réponses de ce déploiement |
| Nom du déploiement | Choisissez un nom stable lié au rôle (`chat-prod`) pour que le code ne change pas quand le modèle change |

Les mises à niveau automatiques de version ne s'appliquent qu'aux types de déploiement Standard ; les déploiements provisionnés migrent sur place ou vers un nouveau déploiement. L'interface Azure CLI peut lire `versionUpgradeOption` mais ne peut pas encore le définir : utilisez REST, Azure PowerShell ou l'infrastructure en tant que code.

Les **agents** sont des ressources versionnées d'un projet. Créer un agent, ou le modifier, crée une nouvelle version ; les versions précédentes restent, ce qui permet de comparer ou de revenir en arrière. La publication promeut un agent en ressource managée avec un point de terminaison stable qui hérite de l'identité et des contrôles d'accès du projet.

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

project = AIProjectClient(
    endpoint="https://contoso-foundry.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),
)

agent = project.agents.create_version(
    agent_name="support-agent",
    definition=PromptAgentDefinition(
        model="chat-prod",  # deployment name
        instructions="Answer questions about Contoso orders. Be concise.",
    ),
)
print(agent.name, agent.version)

openai = project.get_openai_client(agent_name="support-agent")
conversation = openai.conversations.create()
response = openai.responses.create(
    conversation=conversation.id,
    input="Where is my order 4512?",
)
print(response.output_text)
```

| Élément | Rôle |
| --- | --- |
| `azure-ai-projects` 2.x | Le SDK Foundry pour les projets Foundry ; la version 1.x cible Foundry (classic) et n'est pas compatible |
| `create_version(agent_name=..., definition=...)` | Crée l'agent, ou une nouvelle version s'il existe déjà |
| `PromptAgentDefinition(model=..., instructions=..., tools=[...])` | Le déploiement de modèle, les instructions et les outils d'un agent d'invite |
| `get_openai_client(agent_name=...)` | Un client compatible OpenAI lié à l'agent |
| `conversations.create()` puis `conversation=` | Conserve le contexte multitour côté service |

> **Conseil d'examen.** Le `model` d'une définition d'agent est un nom de déploiement de la ressource Foundry du projet. Déployez d'abord le modèle, puis créez l'agent qui le nomme ; pour passer à un autre modèle, déployez-le et créez une nouvelle version de l'agent qui pointe vers lui.

<!-- section: cicd | objectives: 1.2.4 -->
## Intégrer les projets Foundry aux pipelines CI/CD

Une solution Foundry traverse les environnements comme n'importe quelle application : infrastructure en tant que code pour les ressources, déploiements, connexions et attributions de rôles ; définitions d'agents et invites dans le contrôle de code source ; évaluation automatisée comme barrière de qualité avant la promotion.

| Étape | Ce qu'elle fait | Outils |
| --- | --- | --- |
| Provisionner | Créer la ressource Foundry, les projets, les déploiements de modèles, les connexions, les attributions de rôles | Bicep, ARM, Terraform, Azure CLI, `azd` |
| Construire | Créer la nouvelle version de l'agent à partir de la définition du référentiel | SDK Foundry dans un script |
| Évaluer | Exécuter l'agent sur un jeu de données de test et le noter avec des évaluateurs ; comparer avec la version de référence | Action GitHub `microsoft/ai-agent-evals` (préversion), extension Azure DevOps |
| Contrôler et promouvoir | Promouvoir seulement si les scores atteignent les seuils ; publier ensuite dans l'environnement suivant | Approbations du pipeline, environnements |

Les pipelines s'authentifient avec **Microsoft Entra ID et la fédération d'identité de charge de travail** (OpenID Connect) : l'action `azure/login` échange un jeton GitHub contre un jeton Entra, si bien qu'aucun secret n'est stocké. Donnez à l'identité du pipeline le privilège minimal nécessaire : **Foundry User** sur le projet pour créer des versions d'agents et exécuter des évaluations, et Contributor sur un groupe de ressources dédié uniquement si le pipeline provisionne aussi des ressources, jamais sur l'abonnement. Contributor peut déployer des modèles mais ne peut ni attribuer des rôles ni publier des agents ; la publication demande au moins Foundry Project Manager sur la ressource Foundry.

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: microsoft/ai-agent-evals@v3-beta
        with:
          azure-ai-project-endpoint: ${{ vars.FOUNDRY_PROJECT_ENDPOINT }}
          deployment-name: eval-judge
          agent-ids: "support-agent:3,support-agent:4"
          data-path: ${{ github.workspace }}/evals/support.json
```

| Entrée | Signification |
| --- | --- |
| `azure-ai-project-endpoint` | Le point de terminaison du projet |
| `deployment-name` | Le déploiement de modèle utilisé par les évaluateurs assistés par IA |
| `agent-ids` | Les agents à évaluer, au format `name:version` ; le premier sert de référence sauf si `baseline-agent-id` est défini |
| `data-path` | Fichier JSON qui liste les évaluateurs et les requêtes de test |

Le résumé de l'exécution affiche le score de chaque métrique avec des intervalles de confiance et, quand plusieurs versions sont évaluées, une comparaison statistique qui indique si une différence est significative. Les évaluations consomment des jetons de modèle : exécutez-les sur les demandes de tirage ou avant une promotion plutôt qu'à chaque commit.

> **Piège d'examen.** `permissions: id-token: write` est ce qui permet au workflow de demander le jeton OIDC. Sans lui, `azure/login` avec des informations d'identification fédérées échoue. Stocker un secret client ou une clé API dans le référentiel n'est jamais la réponse attendue.

<!-- section: key-points -->
## Points clés

- La ressource Foundry (gouvernance, déploiements, réseau) contient les projets (agents, fichiers, évaluations) ; les ressources connectées gardent leurs propres paramètres réseau et d'accès.
- Configuration standard des agents = votre Cosmos DB (au moins 3 000 RU/s), Storage et Azure AI Search ; configuration de base = stockage managé par Microsoft.
- Global Standard par défaut ; Data Zone ou Standard pour la résidence ; provisionné pour un débit garanti ; Batch pour du travail asynchrone 50 % moins cher ; Developer pour tester des modèles affinés.
- Un déploiement = nom, modèle et version, SKU, capacité, filtre de contenu, stratégie de mise à niveau de version.
- Les agents sont versionnés avec `create_version` ; la publication donne un point de terminaison stable.
- CI/CD : infrastructure en tant que code, fédération OIDC, Foundry User pour le pipeline, barrière d'évaluation avec `ai-agent-evals` qui compare les versions.
