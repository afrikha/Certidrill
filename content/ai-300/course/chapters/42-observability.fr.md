L'évaluation avant la mise en production indique si une application d'IA générative est assez bonne ; l'observabilité indique si elle le reste, rapide et abordable, une fois les vrais utilisateurs arrivés. Dans Microsoft Foundry, l'observabilité repose sur trois fonctionnalités qui partagent un même stockage, la ressource **Application Insights** connectée au projet : l'**évaluation** des sorties (désormais aussi sur le trafic réel), les tableaux de bord et alertes de **surveillance**, et le **traçage** fondé sur OpenTelemetry. Les déploiements de modèles ajoutent leurs propres **métriques Azure Monitor** et **journaux de ressources**, et Cost Management ajoute la facture. Les questions d'examen donnent un symptôme (la latence a doublé, la facture de jetons a bondi, la qualité a baissé depuis la semaine dernière, aucune trace n'apparaît) et demandent quelle métrique, quel journal, quel paramètre ou quel rôle y répond.

<!-- section: continuous-monitoring | objectives: 4.2.1 -->
## Surveillance continue dans Foundry

Après le déploiement, Foundry surveille une application à quatre niveaux :

| Fonctionnalité | Rôle | Données |
| --- | --- | --- |
| Métriques opérationnelles | Consommation de jetons, latence, taux de réussite des exécutions, taux d'erreurs | Trafic réel |
| **Évaluation continue** | Exécute des évaluateurs de qualité et de sécurité sur **un échantillon du trafic de production** | Réponses réelles |
| **Évaluation planifiée** (recurring evaluations, préversion) | Exécute des évaluateurs sur un jeu de données de test fixe selon une planification, pour détecter la **dérive du système** | Jeu de données de test |
| **Red teaming planifié** (red team scans, préversion) | Analyses adverses récurrentes des faiblesses de sûreté et de sécurité | Attaques générées |
| **Alertes** (préversion) | Préviennent quand la latence, la consommation de jetons, les scores d'évaluation ou les résultats de red teaming franchissent un seuil | Tout ce qui précède |

L'onglet **Monitor** d'un agent (Build, Agents, sélection de l'agent, Monitor) est le tableau de bord. Il affiche des cartes de synthèse et des graphiques sur la plage de temps choisie :

| Métrique | À examiner quand |
| --- | --- |
| Consommation de jetons | Consommation élevée : invites ou réponses trop verbeuses |
| Latence | Au-delà de 10 secondes : limitation, appels d'outils complexes ou problèmes réseau |
| Taux de réussite des exécutions | En dessous de 95 % |
| Métriques d'évaluation | Les scores des évaluateurs exécutés sur les sorties échantillonnées baissent |
| Résultats de red teaming | Une analyse planifiée échoue |

Prérequis, dans l'ordre :

1. Connecter une ressource **Application Insights** au projet (Agents, Traces, **Connect**, ou Manage, Project details, Connected resources, Add connection). Les données de surveillance et les traces y sont stockées ; la rétention et la facturation suivent sa configuration.
2. Donner aux lecteurs le rôle **Log Analytics Reader** sur l'espace de travail Log Analytics associé, plus **Privileged Monitoring Data Reader** si ses tables sont protégées.
3. Pour l'évaluation continue, attribuer à l'**identité managée du projet** le rôle **Foundry User** (anciennement Azure AI User) sur le projet : les évaluations s'exécutent sous cette identité.

Une évaluation continue est un objet d'évaluation plus une **règle d'évaluation** qui se déclenche à chaque réponse terminée, dans la limite d'un plafond horaire :

```text
from azure.ai.projects.models import (
    EvaluationRule, ContinuousEvaluationRuleAction,
    EvaluationRuleFilter, EvaluationRuleEventType,
)

eval_object = openai_client.evals.create(
    name="support-agent-continuous",
    data_source_config={"type": "azure_ai_source", "scenario": "responses"},
    testing_criteria=[
        {"type": "azure_ai_evaluator", "name": "violence_detection",
         "evaluator_name": "builtin.violence"},
    ],
)

project_client.evaluation_rules.create_or_update(
    id="support-agent-rule",
    evaluation_rule=EvaluationRule(
        display_name="Support agent continuous evaluation",
        action=ContinuousEvaluationRuleAction(eval_id=eval_object.id, max_hourly_runs=100),
        event_type=EvaluationRuleEventType.RESPONSE_COMPLETED,
        filter=EvaluationRuleFilter(agent_name="support-agent"),
        enabled=True,
    ),
)
```

Le plafond par défaut est de **100 exécutions par heure** ; une fois atteint, les exécutions suivantes sont **ignorées** jusqu'à l'heure suivante : augmentez `max_hourly_runs` si la couverture est trop faible. Les évaluateurs personnalisés s'ajoutent sous Monitor, Settings, Continuous evaluation, Add evaluator(s). Les évaluations planifiées utilisent une planification avec un déclencheur de récurrence (par exemple tous les jours à 9 h) sur les traces de l'agent ou un jeu de données.

Les agents qui ne s'exécutent pas sur Foundry peuvent utiliser le même tableau de bord : inscrivez-les dans le plan de contrôle Foundry, instrumentez-les avec les **conventions sémantiques OpenTelemetry pour l'IA générative** et envoyez la télémétrie vers la **même instance Application Insights** que le projet.

> **Piège d'examen.** L'évaluation continue note les **réponses de production réelles** à un taux échantillonné ; l'évaluation planifiée réexécute un **jeu de données de test fixe** pour détecter la dérive du système dans le temps. « La qualité de ce que reçoivent les utilisateurs aujourd'hui » relève de l'évaluation continue ; « la mise à jour du modèle de la semaine dernière a-t-elle changé les réponses à nos questions de référence » relève de l'évaluation planifiée.

> **Conseil d'examen.** Graphiques vides : aucun trafic dans la plage de temps, ou délai d'ingestion. Erreur d'autorisation : Log Analytics Reader manquant. Résultats d'évaluation continue absents : règle désactivée, ou l'identité managée du projet n'a pas Foundry User. Exécutions ignorées : limite horaire atteinte. Notez aussi que les évaluations du terrain de jeu des agents sont **activées par défaut** et facturées ; désactivez-les sous metrics dans le terrain de jeu.

<!-- section: performance-metrics | objectives: 4.2.2 -->
## Surveiller la latence, le débit et les temps de réponse

La latence d'un appel à un déploiement de modèle se décompose ainsi :

```text
TTLT = TTFT + (TBT x tokens generated)
```

Le temps jusqu'au premier jeton (TTFT) est l'attente de l'utilisateur avant que quelque chose s'affiche, le temps entre les jetons (TBT) est la vitesse de génération, et le temps jusqu'au dernier jeton (TTLT) est le temps de réponse de bout en bout. Comme le TTLT augmente avec la longueur de la sortie, une réponse plus longue est plus lente sans aucun problème de service : lisez toujours une métrique de latence **avec une métrique de nombre de jetons**. Le **débit** se mesure en jetons par minute (TPM) et en requêtes par minute ; sur les déploiements Standard, le quota régit l'admission, pas un débit garanti.

Les métriques des déploiements sont collectées automatiquement dans Azure Monitor (granularité d'une minute). Dans le portail Azure, Monitor, Metrics, définissez le type de ressource sur **Foundry Tools** ; dans le portail Foundry, ouvrez l'onglet **Metrics** du déploiement.

| Métrique (nom affiché) | Nom REST | Mesure |
| --- | --- | --- |
| Time to Response | `AzureOpenAITimeToResponse` | TTFT, la métrique de réactivité recommandée pour le **streaming** ; mesurée à la passerelle d'API, sans la latence côté client |
| Time Between Tokens | `AzureOpenAINormalizedTBTInMS` | TBT, vitesse de génération des requêtes en streaming |
| Time to Last Byte | `AzureOpenAITTLTInMS` | TTLT, durée totale des requêtes sans streaming |
| Normalized Time to First Byte | `AzureOpenAINormalizedTTFTInMS` | Latence du premier octet divisée par le nombre de jetons d'invite : à comparer entre tailles d'invite uniquement |
| Tokens Per Second | `AzureOpenAITokenPerSecond` | Jetons générés par seconde de génération |
| Azure OpenAI Requests | `AzureOpenAIRequests` | Volume de requêtes, ventilé par `StatusCode` (erreurs 429) ou `IsSpillover` |
| Provisioned-managed Utilization V2 | `AzureOpenAIProvisionedManagedUtilizationV2` | PTU consommées divisées par PTU déployées ; à 100 %, les appels renvoient **HTTP 429** |
| Model Availability Rate | `ModelAvailabilityRate` | (appels moins erreurs serveur) divisé par appels ; les erreurs serveur sont les codes HTTP 500 et plus |

Les dimensions utiles sont `ModelDeploymentName`, `ModelName`, `ModelVersion`, `StatusCode` et `StreamType`. Time Between Tokens et Tokens Per Second ne sont pas disponibles pour les déploiements Standard. N'utilisez pas l'ancienne métrique **Latency** de la catégorie Cognitive Services HTTP Requests pour Azure OpenAI.

Ordre de diagnostic :

1. Sans streaming : Time to Last Byte ventilé par déploiement, à côté de Generated Completion Tokens. Les deux qui montent ensemble, c'est normal. Le TTLT qui monte seul : vérifiez Provisioned-managed Utilization V2 (approvisionné) ou Azure OpenAI Requests pour les erreurs 429 et la concurrence.
2. Streaming : Time to Response, Time Between Tokens et Processed Prompt Tokens. Une invite plus longue augmente le TTFT ; un Time Between Tokens qui monte signifie que le déploiement est sous charge.

| Symptôme ou objectif | Action |
| --- | --- |
| Longue attente avant le premier mot dans une interface de chat | Activer le streaming (`stream: true`) : premier jeton plus tôt, durée totale inchangée |
| Durée totale longue | Réduire `max_tokens`, ajouter des séquences d'arrêt, laisser `n` à 1, générer moins de jetons |
| Modèle lent dans l'ensemble | Un modèle plus petit et plus rapide |
| Appels courts ralentis par des appels longs sur un même déploiement | Des déploiements séparés par charge de travail |
| Utilisation à 100 %, erreurs 429 | Ajouter des PTU ou réduire le volume de requêtes ; débordement (spillover) vers un déploiement standard |
| Latence constante à volume élevé et régulier | Déploiement approvisionné dimensionné avec le calculateur de capacité |
| Le filtrage de contenu ajoute de la latence sur une charge à faible risque | Évaluer une stratégie de filtrage de contenu modifiée |

> **Piège d'examen.** Une valeur de `max_tokens` plus élevée ajoute de la latence même quand le nombre de jetons générés est identique, et `max_tokens` ne change que la longueur d'une réponse, jamais sa qualité. Et le streaming améliore le temps jusqu'au premier jeton, pas le temps jusqu'au dernier jeton.

<!-- section: cost-metrics | objectives: 4.2.3 -->
## Suivre et optimiser la consommation de jetons et les coûts

Métriques de jetons dans Azure Monitor :

| Métrique | Nom REST | Contenu |
| --- | --- | --- |
| Processed Prompt Tokens | `ProcessedPromptTokens` | Jetons d'entrée |
| Generated Completion Tokens | `GeneratedTokens` | Jetons de sortie |
| Processed Inference Tokens | `TokenTransaction` | Jetons d'entrée plus jetons de sortie |
| Input Tokens, Output Tokens, Total Tokens | `InputTokens`, `OutputTokens`, `TotalTokens` | Mêmes comptes dans la catégorie Models, pour le standard et l'approvisionné |
| Active Tokens | `ActiveTokens` | Total moins les jetons en cache (approvisionné) |
| Prompt Token Cache Match Rate | `AzureOpenAIContextTokensCacheMatchRate` | Pourcentage de jetons d'invite servis depuis le cache |
| Processed FineTuned Training Hours | `FineTunedTrainingHours` | Heures d'entraînement des travaux de réglage précis |

Chaque réponse renvoie aussi un objet `usage`, la source par requête pour la refacturation par utilisateur ou par fonctionnalité :

```json
"usage": {
  "prompt_tokens": 1566,
  "completion_tokens": 1518,
  "total_tokens": 3084,
  "prompt_tokens_details": { "cached_tokens": 1408 },
  "completion_tokens_details": { "reasoning_tokens": 576 }
}
```

Analyse des coûts dans **Cost Management** :

- Limitez l'étendue au **groupe de ressources** de la ressource Foundry (les compteurs des modèles partenaires et communautaires apparaissent sous le groupe de ressources), puis regroupez par **Meter** (quelles séries de modèles coûtent le plus) ou par **Resource**.
- La consommation Azure OpenAI est classée sous le service **Cognitive Services**. Segmentez avec des étiquettes de déploiement ou personnalisées ; les Models sold by Azure pris en charge reçoivent automatiquement l'étiquette `project` (préversion) pour l'imputation par projet.
- Rôles : **Cost Management Reader** pour consulter les coûts ; un rôle personnalisé avec `Microsoft.Consumption/*/read` et `Microsoft.CostManagement/*/read` pour un lecteur limité aux coûts.
- Les coûts apparaissent dans l'analyse des coûts environ cinq heures après la consommation. Créez des **budgets et des alertes** sur l'abonnement ou le groupe de ressources : Azure OpenAI n'a **aucune limite de dépense stricte**, et les groupes d'actions ne font qu'automatiser une réaction.

Pour mesurer **par consommateur** quand plusieurs applications partagent un déploiement, placez **Azure API Management** devant : `llm-emit-token-metric` émet des métriques de jetons avec des dimensions personnalisées (abonnement, ID utilisateur, API) vers Application Insights, et `llm-token-limit` plafonne les jetons par minute ou par période pour chaque clé de compteur.

| Levier | Effet |
| --- | --- |
| Mise en cache des invites | Activée par défaut pour les modèles pris en charge ; exige des invites d'au moins 1 024 jetons au début identique. Placez le contenu stable (instructions, définitions d'outils) en premier et le contenu variable en dernier ; les jetons d'entrée en cache sont facturés à prix réduit |
| Global Batch ou Data Zone Batch | 50 % moins cher que Global Standard pour les travaux qui peuvent attendre (objectif de 24 heures) |
| Modèle plus petit, invites plus courtes, `max_tokens` plus bas | Moins de jetons, et moins chers |
| Mise en cache sémantique dans API Management | `llm-semantic-cache-lookup` et `llm-semantic-cache-store` réutilisent les réponses aux invites similaires |
| Débit approvisionné | Prix horaire fixe : rentable seulement avec une utilisation élevée et régulière |
| Supprimer les déploiements ajustés inactifs | Les modèles ajustés facturent l'hébergement **à l'heure tant qu'ils sont déployés**, même inutilisés |
| Ne collecter que les catégories de journaux nécessaires | L'ingestion Log Analytics est facturée sous Azure Monitor, pas sous la ressource Foundry |

> **Piège d'examen.** Les graphiques de jetons et le coût estimé peuvent différer temporairement de la facture : utilisez l'estimation pour le suivi en quasi temps réel, et Cost Management plus les factures pour le rapprochement. Les codes d'état HTTP ne déterminent pas la facturation.

<!-- section: logging-tracing | objectives: 4.2.4 -->
## Journalisation, traçage et débogage en production

Les **journaux de ressources** de la ressource Foundry nécessitent un **paramètre de diagnostic** (Monitoring, Diagnostic settings, Add diagnostic setting, choisir les catégories et **AllMetrics**, envoyer vers un espace de travail Log Analytics). Configurez-le sur chaque ressource ; il exige Monitoring Contributor, alors que consulter les métriques exige Monitoring Reader.

| Catégorie | Contenu |
| --- | --- |
| `RequestResponse` | Chaque requête et réponse d'inférence, avec code d'état et latence |
| `Trace` | Journaux détaillés pour déboguer les appels d'inférence |
| `Audit` | Opérations d'administration : déploiements, changements de configuration, événements d'accès |
| `AzureOpenAIRequestUsage` | Journaux de consommation et de jetons (l'exportation est facturée) |

Les journaux arrivent dans **AzureDiagnostics**, les métriques exportées dans **AzureMetrics** ; comptez jusqu'à 15 minutes avant les données :

```kusto
AzureMetrics
| where TimeGenerated > ago(1d)
| summarize Total = sum(Total) by MetricName, bin(TimeGenerated, 1h)
| order by TimeGenerated desc
```

Le **traçage** montre ce qui s'est passé à l'intérieur d'une requête. Chaque opération est une étendue (span) OpenTelemetry avec sa durée, son état, ses jetons et, si c'est activé, ses entrées et sorties.

| Option | Comment | Remarques |
| --- | --- | --- |
| Côté serveur | Automatique pour les agents d'invite, les agents hébergés et les workflows une fois Application Insights connecté | Sans code ; traces dans l'onglet **Traces** pour les **90 derniers jours** ; en disponibilité générale pour les agents d'invite et hébergés |
| Côté client | SDK Foundry et OpenTelemetry dans votre code | Vos propres étendues et fonctions ; préversion |
| Local | Collecteur de Foundry Toolkit pour Visual Studio Code | Pas besoin d'Application Insights |

```text
import os
os.environ["AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING"] = "true"   # before instrument()

from azure.ai.projects import AIProjectClient
from azure.ai.projects.telemetry import AIProjectInstrumentor, trace_function
from azure.monitor.opentelemetry import configure_azure_monitor
from azure.identity import DefaultAzureCredential
from opentelemetry import trace

project = AIProjectClient(endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
                          credential=DefaultAzureCredential())
configure_azure_monitor(
    connection_string=project.telemetry.get_application_insights_connection_string())
AIProjectInstrumentor().instrument(enable_content_recording=False)

@trace_function("lookup-order")
def lookup_order(order_id: str) -> str:
    ...

tracer = trace.get_tracer(__name__)
with tracer.start_as_current_span("support-request"):
    with project.get_openai_client(agent_name="support-agent") as openai:
        response = openai.responses.create(input="Where is order 4512?")
```

| Paramètre | Valeur par défaut | Effet |
| --- | --- | --- |
| `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` | Désactivé | Doit valoir `true` **avant** `instrument()`, sinon rien n'est tracé (un avertissement est journalisé) |
| `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` ou `enable_content_recording` | `False` | Enregistre les invites, les arguments d'outils et les sorties |
| `enable_trace_context_propagation` | `True` | Envoie les ID de trace aux services Azure pour la corrélation de bout en bout |
| `enable_baggage_propagation` | `False` | Envoie l'en-tête `baggage`, qui peut transporter des données personnelles |
| `AZURE_TRACING_GEN_AI_INSTRUMENT_RESPONSES_API` | `true` | Instrumentation automatique de l'API Responses |

`@trace_function` enregistre les paramètres (`code.function.parameter.<name>`) et la valeur de retour (`code.function.return.value`) pour les types de base, toujours, quel que soit l'enregistrement du contenu. Ajoutez vos propres attributs (par exemple `session.id`) avec un processeur d'étendues ; affichez les étendues en local avec `ConsoleSpanExporter`. Un paramètre passé à `instrument()` prévaut sur sa variable d'environnement, et les clients OpenAI obtenus **avant** l'instrumentation ne sont pas corrélés. Les traces mettent environ **2 à 5 minutes** à apparaître. Dans l'onglet Traces, recherchez par **Response ID** ou **Trace ID**, puis ouvrez la conversation pour voir dans l'ordre les jetons, les étapes d'exécution, les appels d'outils, les entrées et les sorties.

| Problème en production | Où regarder |
| --- | --- |
| Quelle étape d'un agent est lente ou échoue | La trace de la requête : durées et états des étendues |
| Tendance du taux d'erreurs ou de la latence, alertes | Métriques et règles d'alerte Azure Monitor |
| Qui a modifié un déploiement | Journaux `Audit` |
| L'échange exact d'un utilisateur | Trace avec enregistrement du contenu, ou journaux `RequestResponse` |
| Aucune trace du tout | Application Insights non connecté, ou variable de traçage non définie avant `instrument()` |

> **Piège d'examen.** L'enregistrement du contenu capture les messages des utilisateurs et les sorties du modèle : laissez-le désactivé en production sauf si la conformité l'autorise, et ne mettez jamais de secrets ou de jetons d'accès dans les invites, les arguments d'outils ou les attributs d'étendues. Le désactiver n'empêche pas `@trace_function` d'enregistrer les paramètres.

<!-- section: key-points -->
## Points clés

- Observabilité Foundry = évaluation, surveillance et traçage, stockés dans la ressource Application Insights connectée au projet.
- L'évaluation continue échantillonne les réponses réelles (règle avec `max_hourly_runs`, 100 par défaut, identité managée du projet avec Foundry User) ; l'évaluation planifiée réexécute un jeu de test pour détecter la dérive.
- Les lecteurs ont besoin de Log Analytics Reader, plus Privileged Monitoring Data Reader pour les tables protégées.
- TTLT = TTFT + TBT x jetons : associez les métriques de latence aux métriques de jetons. Time to Response pour le streaming, Time to Last Byte sans streaming.
- Provisioned-managed Utilization V2 à 100 % signifie des erreurs 429 ; le streaming ne raccourcit que le temps jusqu'au premier jeton.
- Coûts : métriques de jetons et `usage`, Cost Management par compteur, étiquettes et étiquette `project`, budgets (pas de limite stricte), métriques de jetons par consommateur dans API Management, mise en cache des invites et batch pour économiser.
- Les paramètres de diagnostic envoient les journaux `RequestResponse`, `Trace`, `Audit` et `AzureOpenAIRequestUsage` vers AzureDiagnostics.
- Traçage côté client : définir `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` avant `instrument()` ; enregistrement du contenu désactivé par défaut.
