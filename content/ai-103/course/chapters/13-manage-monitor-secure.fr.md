Une fois une solution Foundry en service, vous gérez ce qu'elle peut consommer et ce qu'elle coûte, vous surveillez la qualité du modèle, des agents et du pipeline de récupération, et vous verrouillez les identités et les réseaux. Les questions d'examen décrivent un symptôme (HTTP 429, une facture qui a doublé, des réponses qui dérivent, un indexeur qui ignore des fichiers, une clé trouvée dans le code) et demandent le bon paramètre, la bonne métrique ou le bon rôle.

<!-- section: quotas-cost | objectives: 1.3.1 -->
## Gérer les quotas, la mise à l'échelle, les limites de débit et les coûts

Le **quota** est attribué à un abonnement par région, par modèle et par type de déploiement, en jetons par minute (TPM). Vous le répartissez entre les déploiements : avec 240 000 TPM d'un modèle dans une région, vous pouvez créer un déploiement de 240 000 TPM ou deux de 120 000, tant que le total dans cette région reste dans le quota. Chaque déploiement applique ensuite une **limite de débit** dérivée de son TPM, plus une limite de requêtes par minute (RPM) dont le rapport au TPM dépend du modèle (6 RPM pour 1 000 TPM pour les anciens modèles de conversation, 1 RPM pour 1 000 TPM pour `o3`).

Comment les limites sont évaluées :

- Les jetons comptés sont les jetons réels d'entrée et de sortie générée, pas le maximum de sortie configuré dans la requête : un `max_output_tokens` élevé ne réserve pas de TPM.
- Les requêtes sont contrôlées sur de courtes fenêtres, en général 1 ou 10 secondes : un déploiement à 600 RPM est limité s'il reçoit plus de 10 requêtes en une seconde.
- Une requête au-delà de la limite renvoie **HTTP 429**. La réponse contient `retry-after-ms` ; chaque réponse contient `x-ratelimit-remaining-tokens` et `x-ratelimit-remaining-requests`. Les requêtes en échec comptent quand même dans la limite.
- Sur les déploiements Standard, le service peut abaisser temporairement la limite effective en cas de forte charge ; une valeur de `x-ratelimit-limit-tokens` inférieure à votre TPM le révèle.

Le **débit provisionné** fonctionne autrement. Une unité de débit provisionné (PTU) est une quantité fixe de capacité de traitement du modèle réservée à votre déploiement et facturée par PTU et par heure, quels que soient les jetons consommés. Le quota de PTU est une limite de stratégie par abonnement, région et type de déploiement ; il ne garantit pas que la **capacité** est disponible, et le déploiement échoue si la région en manque. Les réservations Azure (1 mois ou 1 an) réduisent le tarif horaire mais ne garantissent pas non plus la capacité : créez d'abord le déploiement, puis achetez la réservation. Dimensionnez les PTU avec le calculateur de capacité du portail Foundry, à partir des requêtes par minute, du nombre moyen de jetons d'entrée et de sortie et du taux de cache.

Le **débordement** (spillover) envoie les requêtes qu'un déploiement provisionné saturé rejetterait (par exemple avec un 429) vers un déploiement standard de la même ressource Foundry, par déploiement ou par requête avec l'en-tête `x-ms-spillover-deployment`.

| Symptôme ou objectif | Action |
| --- | --- |
| 429 occasionnels sur un déploiement Standard | Nouvelle tentative avec temporisation exponentielle en respectant `retry-after-ms` ; lisser les pics |
| 429 constants, quota pas entièrement alloué | Augmenter le TPM du déploiement |
| 429 constants, quota régional épuisé | Demander une augmentation de quota (portail Foundry : Manage, Quota), ou déployer dans une autre région et répartir la charge |
| Latence constante avec un volume élevé et régulier | Déploiement provisionné, dimensionné avec le calculateur de capacité |
| Pics au-delà de la capacité provisionnée | Débordement vers un déploiement standard |
| Voir le quota disponible | Cognitive Services Usages Reader à l'étendue de l'abonnement |
| Gros travaux hors ligne au coût le plus bas | Global Batch ou Data Zone Batch (50 % de moins) |

Les leviers de coût, du plus efficace au moins efficace :

| Levier | Effet |
| --- | --- |
| Dimensionner le modèle | Un modèle `-mini` ou `-nano`, ou un SLM, coûte une fraction d'un grand modèle pour les tâches simples |
| Déploiements Batch | 50 % de moins que Global Standard pour le travail qui peut attendre 24 heures |
| Invites et sorties plus courtes | Réduire les instructions et les segments récupérés ; plafonner `max_output_tokens` |
| Moins d'étapes d'agent | Limiter les appels d'outils et les boucles de raisonnement ; chaque étape consomme des jetons |
| PTU réservées | Pour une charge régulière seulement : des PTU inactives restent facturées |
| Budgets et Cost Management | Alertes sur les dépenses par groupe de ressources ou par étiquette |

> **Piège d'examen.** Quota et limite de débit ne sont pas la même chose. Si le quota régional est déjà entièrement alloué, augmenter le TPM d'un déploiement échoue : libérez d'abord du quota sur un autre déploiement ou demandez une augmentation. Et disposer d'un quota de PTU ne signifie pas qu'un déploiement provisionné réussira : la capacité doit exister dans la région.

<!-- section: monitor-models | objectives: 1.3.2 -->
## Surveiller les performances du modèle, la dérive, la sécurité et l'ancrage

L'observabilité de Foundry comporte trois parties, toutes intégrées à Azure Monitor Application Insights : l'**évaluation** (scores de qualité, de sécurité et de fiabilité sur des jeux de données, des traces de production ou des conversations simulées), la **surveillance** (tableaux de bord en temps réel des métriques opérationnelles, de la consommation de jetons, de la latence, des taux d'erreur et des scores de qualité, avec des alertes) et le **traçage** (fondé sur OpenTelemetry : chaque appel de modèle, appel d'outil et étape de raisonnement d'une exécution). Connectez une ressource Application Insights au projet pour collecter traces et métriques.

En production, combinez quatre pratiques : les métriques opérationnelles, l'**évaluation continue** du trafic de production à un taux d'échantillonnage, l'**évaluation planifiée** sur des jeux de données de test pour détecter la dérive, et le red teaming planifié ; les alertes Azure Monitor vous préviennent quand des sorties passent sous les seuils de qualité ou produisent du contenu nuisible.

| À surveiller | Signal | Où |
| --- | --- | --- |
| Performances | Latence, jetons par requête, volume de requêtes, taux d'erreur et 429 | Métriques Azure Monitor de la ressource, tableaux de bord Foundry, traces |
| Utilisation du provisionné | Utilisation du déploiement en PTU ; 429 quand il est saturé | Métriques Azure Monitor |
| Événements de sécurité | Invites et réponses bloquées ou annotées par les filtres de contenu, par catégorie et gravité ; sorties signalées par les évaluateurs de sécurité | Résultats des filtres de contenu renvoyés avec les réponses, évaluation continue, alertes |
| Qualité de l'ancrage | Scores d'ancrage (groundedness) et de pertinence ; réponses non étayées par le contexte récupéré | Évaluateurs exécutés sur le trafic ou sur un jeu de test |
| Dérive | Une métrique qui se dégrade dans le temps pour le même type de requête | Évaluation planifiée sur le même jeu de données de test, comparée d'une exécution à l'autre |

La dérive a plusieurs causes, chacune avec son contrôle :

| Cause | Comment la détecter |
| --- | --- |
| La version du modèle a changé (mise à niveau automatique) | Stratégie de mise à niveau de version, historique du déploiement, évaluation avant et après |
| Les questions des utilisateurs ont changé | Scores de pertinence et de résolution d'intention sur le trafic échantillonné |
| Le contenu source a changé ou l'index n'est plus à jour | Scores d'ancrage, état de l'indexeur (section suivante) |
| Les invites ou les outils ont changé | Comparer les versions de l'agent avec le même jeu de données d'évaluation |

Familles d'évaluateurs intégrés : usage général (cohérence, fluidité), RAG (ancrage, pertinence, récupération, exhaustivité de la réponse), agents (respect de la tâche, achèvement de la tâche, résolution d'intention, précision des appels d'outils, sélection des outils) et risques et sécurité (haine et injustice, contenu sexuel, violence, automutilation, contenu protégé, attaque indirecte, vulnérabilité du code, fuite de données sensibles). Plusieurs évaluateurs d'agents sont en préversion.

> **Piège d'examen.** Un filtre de contenu bloque le contenu nuisible à l'exécution mais ne dit rien de l'exactitude d'une réponse. Pour détecter les réponses non étayées par les documents, exécutez un évaluateur d'ancrage. Pour voir pourquoi une exécution a échoué (quel outil a été appelé, avec quels arguments, en combien de temps), ouvrez sa trace.

<!-- section: monitor-search | objectives: 1.3.3 -->
## Surveiller l'ingestion, l'intégrité de l'index et la pertinence

La qualité d'une réponse RAG ne peut pas dépasser celle de la récupération. Surveillez le pipeline de la source à la requête :

| Domaine | Contrôle | Outil |
| --- | --- | --- |
| Ingestion | État de chaque exécution (`success`, `transientFailure`, `persistentFailure`, `Reset`), éléments traités, éléments en échec, erreurs et avertissements par document ; jusqu'à 50 exécutions conservées | Détails d'exécution de l'indexeur dans le portail, API Get Indexer Status |
| Enrichissement | Quelle compétence a échoué, avec quelle entrée ; images ou PDF sans texte | Sessions de débogage, avertissements de l'indexeur, Skill execution invocation count (dimension Failed) |
| Fraîcheur | Planification de l'indexeur et détection des modifications ; heure de la dernière exécution réussie | État de l'indexeur |
| Intégrité de l'index | Nombre de documents par rapport à la source ; stockage et stockage vectoriel par rapport aux limites du niveau tarifaire | Statistiques de l'index, métriques Storage usage et Vector Storage usage |
| Intégrité du service | Search Latency, Search queries per second, Throttled search queries percentage | Métriques Azure Monitor du service de recherche |
| Détail des requêtes | Chaque opération (`Query.Search`, `Indexers.Status`...) avec son résultat | Journaux de ressources (catégorie `OperationLogs`) envoyés à Log Analytics, table `AzureDiagnostics` |
| Pertinence | Scores et ordre des résultats pour un ensemble de requêtes de test | Explorateur de recherche, `@search.score`, `@search.rerankerScore`, évaluateurs |

```json
{
  "status": "running",
  "lastResult": {
    "status": "success",
    "errorMessage": null,
    "itemsProcessed": 1840,
    "itemsFailed": 12,
    "errors": [ { "key": "manuals/x200.pdf", "errorMessage": "..." } ]
  }
}
```

Le `status` de premier niveau à `running` signifie seulement que l'indexeur est disponible pour s'exécuter ; le résultat de chaque exécution se trouve dans `lastResult` et `executionHistory`. Une exécution se termine en `persistentFailure` quand ses erreurs dépassent le paramètre **Max failed items** de l'indexeur ; sous cette limite, une exécution avec des erreurs de documents indique quand même `success`.

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.SEARCH" and Category == "OperationLogs"
| where OperationName == "Query.Search"
| summarize count() by ResultSignature, bin(TimeGenerated, 1h)
```

Les requêtes limitées renvoient « You are sending too many requests » ou HTTP 503 quand les requêtes en cours d'exécution dépassent la capacité du service.

Les scores de pertinence dépendent du type de requête : `@search.score` est le score BM25 pour une requête par mots clés, la similarité pour une requête vectorielle et le score de fusion RRF pour une requête hybride ; `@search.rerankerScore` vient du classeur sémantique, de 0 à 4, et se compare d'une requête à l'autre. Améliorez la pertinence avec des requêtes hybrides, le classeur sémantique, une meilleure taille de segment, des profils de score ou un seuil de score minimal, et mesurez chaque changement sur le même ensemble de requêtes de test.

> **Piège d'examen.** Une exécution d'indexeur qui indique `success` peut quand même avoir ignoré du contenu : des éléments en échec sous la limite Max failed items, des avertissements pour des images ou des PDF sans texte. Vérifiez `itemsFailed`, les erreurs et les avertissements, pas seulement l'état. Et une hausse de Throttled search queries percentage indique un manque de capacité (ajoutez des réplicas), pas un problème de pertinence.

<!-- section: security | objectives: 1.3.4 -->
## Configurer l'identité, l'accès sans clé, le réseau et les rôles

**Informations d'identification sans clé.** Les clés API donnent un accès complet à la ressource sans restriction de rôle, peuvent fuiter et doivent faire l'objet d'une rotation. L'authentification Microsoft Entra ID applique Azure RBAC et garde les secrets hors du code. Dans le code, `DefaultAzureCredential` utilise la connexion du développeur en local et l'identité managée dans Azure :

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="https://contoso-foundry.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),  # no key in code or configuration
)
```

Étapes pour rendre une application sans clé :

1. Activez une identité managée sur le calcul qui exécute l'application (App Service, Container Apps, Functions, machine virtuelle).
2. Attribuez à cette identité le rôle le moins privilégié sur le projet, par exemple **Foundry User**.
3. Utilisez `DefaultAzureCredential` (ou `ManagedIdentityCredential`) dans le code et retirez les clés de la configuration.
4. Désactivez l'authentification par clé sur la ressource Foundry (`disableLocalAuth: true`) ; imposez-la à grande échelle avec la stratégie intégrée *Azure AI Services resources should have key access disabled (disable local authentication)*. Le changement peut mettre de quelques minutes à quelques heures à atteindre la passerelle : les anciennes clés peuvent encore fonctionner pendant ce délai, puis renvoient HTTP 401.

**Rôles** (renommés de Azure AI en Foundry ; identifiants inchangés) :

| Rôle | Pour | Peut | Ne peut pas |
| --- | --- | --- | --- |
| Foundry Agent Consumer | Applications et utilisateurs qui appellent seulement des agents | Interagir avec les points de terminaison des agents | Créer, déployer |
| Foundry User | Développeurs, identités d'application, identité managée du projet | Actions de données : créer des agents, exécuter des évaluations, appeler des modèles | Créer des projets, déployer des modèles, attribuer des rôles |
| Foundry Project Manager | Responsables d'équipe | Ce que peut Foundry User, publier des agents, attribuer uniquement le rôle Foundry User | Gérer les modèles |
| Foundry Account Owner | Administrateurs | Créer des ressources et des projets, gérer les déploiements, attribuer Foundry User | Créer des agents (aucune action de données) |
| Foundry Owner | Administrateurs qui créent aussi | Tout ce qui précède | |
| Cognitive Services Usages Reader | Personnes qui consultent les quotas | Lire les quotas à l'étendue de l'abonnement | |

Les développeurs reçoivent Foundry User sur le projet et Reader sur la ressource Foundry. Évitez Owner et Contributor pour le travail quotidien : Contributor peut déployer des modèles mais n'a aucune action de données. Azure AI Developer s'applique aux hubs et aux espaces de travail Azure Machine Learning, pas aux projets Foundry.

**Identités managées entre services.** La ressource Foundry et ses projets ont des identités managées. Donnez à l'identité managée du projet le rôle Foundry User sur la ressource Foundry ; pour un compte de stockage créé en dehors de Foundry, donnez à l'identité managée de la ressource Foundry le rôle Storage Blob Data Reader ; ajoutez Foundry aux attributions de rôles d'un service Azure AI Search externe.

**Réseau privé.**

| Exigence | Configuration |
| --- | --- |
| Aucun accès à la ressource Foundry depuis internet | Point de terminaison privé dans la même région que le réseau virtuel ; accès réseau public **Disabled** |
| Accès uniquement depuis des réseaux connus | Accès réseau public **Enabled from selected IP addresses** (réseaux sélectionnés) |
| Les agents doivent atteindre des ressources de votre réseau virtuel | Injection réseau : un sous-réseau délégué à `Microsoft.App/environments`, /27 ou plus grand, avec la configuration standard ; à décider au déploiement, elle ne peut pas être ajoutée ensuite |
| Storage, Azure Cosmos DB et Azure AI Search connectés également privés | Un point de terminaison privé sur chacun : ils ne sont pas créés automatiquement |
| Azure AI Search doit atteindre la ressource Foundry derrière son pare-feu | Exception pour les services Azure approuvés, plus un rôle pour l'identité managée du service de recherche |
| Résolution de noms | Zone DNS privée du sous-domaine `privatelink` liée au réseau virtuel |

Certains outils d'agent ne sont pas pris en charge avec l'injection réseau (par exemple l'automatisation du navigateur, l'utilisation de l'ordinateur et la génération d'images), et Grounding with Bing, la recherche web et l'ancrage SharePoint utilisent des points de terminaison publics. Un indexeur qui doit atteindre sa source de données par des points de terminaison privés a besoin de `executionEnvironment` à `"Private"` ; sinon l'indexation peut échouer sans signal et laisser un index vide.

> **Piège d'examen.** Azure RBAC ne s'applique qu'avec l'authentification Microsoft Entra ID. Un appelant muni d'une clé API contourne tous les rôles : « seuls les utilisateurs ayant le rôle X peuvent appeler le modèle » impose de désactiver l'authentification locale. Et le rôle qui permet à une application d'appeler modèles et agents est un rôle de données (Foundry User), pas Contributor ni Owner.

<!-- section: key-points -->
## Points clés

- Quota : TPM par abonnement, région, modèle et type de déploiement ; réparti entre les déploiements. Limite de débit : appliquée par déploiement ; 429 avec `retry-after-ms`.
- Le quota de PTU n'est pas de la capacité ; les réservations réduisent le prix mais ne réservent rien ; le débordement envoie le surplus vers un déploiement standard.
- Coût : modèle plus petit, Batch, invites et sorties plus courtes, moins d'étapes d'agent ; des PTU inactives sont facturées.
- Surveillez avec traces, évaluations et métriques ; l'ancrage pour la qualité de l'ancrage, les résultats des filtres de contenu pour les événements de sécurité, des évaluations répétées pour la dérive.
- Recherche : état de l'indexeur, éléments en échec et avertissements, requêtes limitées, `@search.rerankerScore` de 0 à 4, journaux dans Log Analytics.
- Sans clé : identité managée plus Foundry User plus `DefaultAzureCredential`, puis `disableLocalAuth`. Points de terminaison privés pour la ressource et chaque ressource connectée ; sous-réseau délégué à `Microsoft.App/environments` pour les agents.
