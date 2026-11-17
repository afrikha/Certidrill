Une requête vers un back-end IA traverse plusieurs composants : une API dans Container Apps, un appel à un point de terminaison de modèle, une recherche vectorielle dans Cosmos DB ou PostgreSQL, un message Service Bus, une fonction. Pour savoir pourquoi elle a été lente ou a échoué, chaque composant émet de la télémétrie avec OpenTelemetry, Application Insights la stocke dans un espace de travail Log Analytics, et vous l'interrogez avec le langage de requête Kusto (KQL). L'examen demande quel appel SDK ou quel paramètre produit la télémétrie attendue, dans quelle table arrive une étendue (span), et quelle requête répond à une question.

<!-- section: otel-model | objectives: 4.2.1 -->
## Signaux OpenTelemetry et traces distribuées

OpenTelemetry est une norme indépendante des fournisseurs (API, SDK, exportateurs) pour trois **signaux** :

| Signal | Ce que c'est | Où il arrive dans Application Insights (table de l'espace de travail) |
| --- | --- | --- |
| Traces | Un arbre d'**étendues** (spans) qui partagent un même ID de trace ; chaque étendue est une opération chronométrée avec des attributs | `AppRequests` (opérations entrantes) et `AppDependencies` (appels sortants et travail interne) |
| Métriques | Mesures numériques agrégées dans le temps (compteurs, histogrammes, jauges) | `AppMetrics` (métriques personnalisées) et Metrics Explorer |
| Journaux | Enregistrements horodatés issus du framework de journalisation | `AppTraces` (et `AppExceptions` pour les exceptions) |

> **Piège d'examen.** Dans Application Insights, la table des journaux s'appelle **traces** (`AppTraces`). Une trace distribuée n'y est pas stockée : c'est l'ensemble des lignes `AppRequests` et `AppDependencies` qui partagent un même ID d'opération.

Une étendue porte un nom, une heure de début et une durée, un **type d'étendue** (span kind), un statut, des **attributs** (paires clé-valeur) et des événements (les exceptions sont enregistrées comme événements). Le type d'étendue décide de la table Application Insights :

| Type d'étendue | Usage | Table |
| --- | --- | --- |
| `SERVER` | Traite une requête entrante (point de terminaison HTTP) | `AppRequests` |
| `CONSUMER` | Traite un message reçu d'une file d'attente ou d'une rubrique | `AppRequests` |
| `CLIENT` | Appel sortant synchrone (HTTP, base de données, point de terminaison de modèle) | `AppDependencies` |
| `PRODUCER` | Envoie un message | `AppDependencies` |
| `INTERNAL` (par défaut) | Travail dans le processus | `AppDependencies`, type de dépendance `InProc` |

La **propagation du contexte** relie les étendues entre processus. L'appelant envoie l'en-tête W3C Trace Context `traceparent`, et l'appelé poursuit la même trace :

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             version-trace id (32 hex)-parent span id (16 hex)-flags (01 = sampled)
```

Dans les tables, l'ID de trace devient `OperationId`, l'ID d'étendue `Id` et l'ID de l'étendue parente `ParentId`. Les clients et serveurs HTTP instrumentés injectent et extraient cet en-tête automatiquement ; pour un transport personnalisé, faites-le vous-même (voir plus bas). L'attribut de **ressource** OpenTelemetry `service.name` (préfixé par `service.namespace` s'il est défini) devient le nom du rôle cloud (`AppRoleName`), le nœud de la cartographie d'application ; `service.instance.id` devient `AppRoleInstance`.

<!-- section: otel-python | objectives: 4.2.1 -->
## Activer la distribution Azure Monitor OpenTelemetry en Python

La distribution Azure Monitor OpenTelemetry regroupe le SDK OpenTelemetry, l'exportateur Azure Monitor et les bibliothèques d'instrumentation courantes. Un seul appel au démarrage, avant que l'application crée ses clients, configure les traces, les métriques et les journaux :

```bash
pip install azure-monitor-opentelemetry
export APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=..."
export OTEL_SERVICE_NAME="rag-api"
```

```text
import logging
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    # connection_string read from APPLICATIONINSIGHTS_CONNECTION_STRING when omitted
    logger_name="contoso.rag",                       # only this logger is exported
    instrumentation_options={"flask": {"enabled": False}},
)

logger = logging.getLogger("contoso.rag")
logger.warning("Index not warmed up", extra={"index": "products"})  # AppTraces, Properties.index
```

| Paramètre | Comportement |
| --- | --- |
| `connection_string` / `APPLICATIONINSIGHTS_CONNECTION_STRING` | Ressource Application Insights cible ; la variable d'environnement est recommandée en production. Les paramètres passés dans le code sont prioritaires sur les variables d'environnement |
| `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` ou `resource=` | Nom du rôle cloud et autres attributs de ressource ; `OTEL_SERVICE_NAME` l'emporte sur `service.name` dans `OTEL_RESOURCE_ATTRIBUTES` |
| `logger_name` | Logger Python dont les enregistrements sont collectés ; définissez-le pour que les journaux du SDK lui-même ne soient pas suivis |
| `instrumentation_options` / `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS` | Activer ou désactiver les instrumentations incluses |
| `sampling_ratio` (0 à 1) ou `traces_per_second` | Échantillonneur Application Insights à pourcentage fixe ou échantillonneur à débit limité |
| `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` | Échantillonneur défini par l'environnement ; prioritaire sur les options du code. Par défaut : débit limité, 5 traces par seconde |
| `enable_live_metrics` | Métriques temps réel, `True` par défaut |
| `span_processors` | Processeurs qui enrichissent ou filtrent les étendues avant l'exportation |
| `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER` = `None` | Désactiver un signal |

Instrumentations incluses, activées par défaut : `azure_sdk` (étendues pour les appels du SDK Azure comme Cosmos DB, Service Bus, Key Vault), `django`, `fastapi`, `flask`, `httpx`, `psycopg2`, `requests`, `urllib`, `urllib3`. Elles créent les étendues serveur du framework web et les étendues client des appels sortants, avec la propagation du contexte, sans aucun code.

Les métriques ne sont jamais échantillonnées. Avec l'échantillonnage des traces, chaque élément stocké a une colonne `ItemCount` qui indique combien d'éléments il représente. La télémétrie qui ne peut pas être envoyée est mise en cache et renvoyée pendant 48 heures au maximum.

> **Conseil d'examen.** Microsoft Learn recommande désormais la distribution Microsoft OpenTelemetry (`pip install microsoft-opentelemetry`, `use_microsoft_opentelemetry(...)`) pour les nouvelles applications ; les applications déjà sur la distribution Azure Monitor n'ont rien à changer. N'initialisez jamais les deux distributions dans la même application. Le code d'API OpenTelemetry ci-dessous est le même avec l'une ou l'autre.

<!-- section: otel-custom | objectives: 4.2.1 -->
## Étendues, attributs, métriques personnalisés et propagation

Utilisez l'API indépendante `opentelemetry` pour tout ce que les instrumentations ne capturent pas, comme une étape de récupération ou un appel de modèle fait par un client personnalisé :

```text
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter("contoso.rag")
tokens = meter.create_counter("rag.tokens", unit="token")
latency = meter.create_histogram("rag.retrieval.duration", unit="ms")

def answer(question, user_id):
    with tracer.start_as_current_span("retrieve-chunks") as span:   # INTERNAL: AppDependencies
        span.set_attribute("rag.top_k", 5)                           # Properties["rag.top_k"]
        span.set_attribute("enduser.id", user_id)
        try:
            chunks = search(question)
        except TimeoutError as ex:
            span.record_exception(ex)
            span.set_status(Status(StatusCode.ERROR))
            raise
    tokens.add(812, {"model": "gpt-4.1-mini"})
    latency.record(48.0, {"store": "cosmos"})

def send_job(payload):
    headers = {}
    inject(headers)                      # adds traceparent to a custom message
    queue_send(payload, headers)

def process_job(payload, headers):
    ctx = extract(headers)               # continue the caller's trace
    with tracer.start_as_current_span("process-job", context=ctx, kind=SpanKind.CONSUMER):
        ...                              # CONSUMER: AppRequests
```

- `start_as_current_span` utilisé comme gestionnaire de contexte démarre l'étendue, en fait la parente de toutes les étendues créées à l'intérieur, puis la termine. Une exception qui sort du bloc est enregistrée automatiquement (passez `record_exception=False` pour la gérer vous-même).
- Les attributs d'étendue sont exportés comme propriétés personnalisées : `customDimensions` dans les requêtes classiques, `Properties` dans les tables de l'espace de travail.
- Un travail en arrière-plan qui n'est pas déclenché par une requête instrumentée doit utiliser `kind=SpanKind.SERVER` (ou `CONSUMER` pour un message) afin d'apparaître dans `AppRequests` comme une opération avec ses propres échecs et durées.
- Ajoutez des propriétés personnalisées à chaque étendue avec un processeur d'étendues (`on_start` appelle `span.set_attribute`), passé dans `span_processors`.

Comment Azure Monitor agrège les instruments de métriques personnalisées :

| Instrument | Agrégation |
| --- | --- |
| Counter, UpDownCounter (et leurs versions asynchrones) | Somme |
| Histogram | Min, Max, Moyenne, Somme et Nombre |
| Jauge asynchrone | Moyenne |

> **Piège d'examen.** Un compteur ne fait qu'additionner : utilisez-le pour les jetons consommés ou les documents indexés. Pour analyser une distribution (latence p95), utilisez un histogramme. Une valeur qui monte et descend (longueur de file d'attente) est un UpDownCounter ou une jauge asynchrone.

<!-- section: kql-basics | objectives: 4.2.2 -->
## L'essentiel de KQL et les tables de télémétrie

Une requête KQL part d'une table et fait passer les lignes dans des opérateurs reliés par des barres verticales. Les noms de colonnes et de tables **respectent la casse**.

| Besoin | Opérateur ou fonction |
| --- | --- |
| Filtrer des lignes | `where TimeGenerated > ago(1h)`, `==` (sensible à la casse), `=~` (insensible à la casse), `has` (terme entier, utilise l'index), `contains` (sous-chaîne, plus lent), `in (...)`, `between (a .. b)` |
| Choisir ou calculer des colonnes | `project`, `project-away`, `extend Seconds = DurationMs / 1000` |
| Agréger | `summarize count(), avg(DurationMs), percentile(DurationMs, 95), dcount(UserId) by Name` |
| Intervalles de temps | `summarize ... by bin(TimeGenerated, 5m)` |
| Trier et limiter | `order by` (`sort by`), `top 10 by DurationMs desc`, `take 100` |
| Lire une propriété dynamique | `tostring(Properties["rag.model"])`, `toint(...)`, `parse_json(...)` |
| Combiner des tables | `join kind=inner (...) on OperationId`, `union AppRequests, AppDependencies` |
| Graphique | `render timechart`, `render barchart` |

La télémétrie Application Insights a deux jeux de noms : les noms classiques (hérités), encore présents dans d'anciennes requêtes lancées depuis la ressource Application Insights, et les tables `App*` de l'espace de travail Log Analytics dans lequel écrit une ressource basée sur un espace de travail. La plupart des colonnes ne diffèrent que par la casse, et KQL respecte la casse : une requête classique doit être réécrite.

| Table classique | Table de l'espace de travail | Contenu |
| --- | --- | --- |
| `requests` | `AppRequests` | Requêtes reçues par l'application |
| `dependencies` | `AppDependencies` | Appels vers d'autres composants |
| `traces` | `AppTraces` | Journaux |
| `exceptions` | `AppExceptions` | Exceptions |
| `customMetrics` | `AppMetrics` | Métriques personnalisées |
| `customEvents` | `AppEvents` | Événements personnalisés |

| Colonne classique | Colonne de l'espace de travail |
| --- | --- |
| `timestamp` | `TimeGenerated` |
| `duration` | `DurationMs` |
| `operation_Id` | `OperationId` |
| `cloud_RoleName` | `AppRoleName` |
| `customDimensions` | `Properties` |
| `valueSum` / `valueCount` (métriques) | `Sum` / `ItemCount` |

Colonnes utiles : `AppRequests` a `Name`, `Url`, `ResultCode`, `Success`, `DurationMs` ; `AppDependencies` ajoute `Target`, `DependencyType` (HTTP, SQL, InProc) et `Data` (URL complète ou instruction) ; `AppTraces` a `Message` et `SeverityLevel` ; `AppExceptions` a `ExceptionType`, `OuterMessage`, `InnermostMessage` et `ProblemId`.

Autres tables des scénarios AI-200 :

| Table | Contenu | Colonnes clés |
| --- | --- | --- |
| `ContainerAppConsoleLogs_CL` / `ContainerAppSystemLogs_CL` | stdout et stderr de Container Apps / événements de la plateforme (destination Log Analytics) | `ContainerAppName_s`, `RevisionName_s`, `Log_s` |
| `ContainerAppHTTPLogs` | Requêtes d'entrée (ingress) de Container Apps (journalisation HTTP par les paramètres de diagnostic) | `StatusCode`, `Path`, `RequestDuration`, `RevisionName` |
| `ContainerLogV2` | Journaux de conteneurs AKS (Container insights) | `PodNamespace`, `PodName`, `ContainerName`, `LogLevel`, `LogMessage` (dynamique) |
| `AzureMetrics` | Métriques de plateforme exportées par un paramètre de diagnostic | `MetricName`, `Average`, `Maximum`, `Minimum`, `Total`, `Count`, `Resource` |

> **Piège d'examen.** Avec l'échantillonnage, une ligne stockée peut représenter plusieurs requêtes. Pour compter les requêtes, utilisez `sum(ItemCount)`, pas `count()`.

<!-- section: kql-queries | objectives: 4.2.2 -->
## Écrire des requêtes KQL pour les questions courantes

Taux d'échec et latence p95 de chaque opération de l'API sur le dernier jour :

```kusto
AppRequests
| where TimeGenerated > ago(1d)
| summarize Requests = sum(ItemCount),
            Failed = sumif(ItemCount, Success == false),
            P95 = percentile(DurationMs, 95)
    by Name
| extend FailureRate = round(100.0 * Failed / Requests, 2)
| order by FailureRate desc
```

Latence des appels au point de terminaison du modèle, par intervalle de 5 minutes, sous forme de graphique :

```kusto
AppDependencies
| where TimeGenerated > ago(6h) and Target has "openai.azure.com"
| summarize avg(DurationMs), percentile(DurationMs, 95) by bin(TimeGenerated, 5m)
| render timechart
```

Vue de bout en bout d'une transaction en échec à travers les services :

```kusto
union AppRequests, AppDependencies, AppTraces, AppExceptions
| where OperationId == "4bf92f3577b34da6a3ce929d0e0e4736"
| project TimeGenerated, Type, AppRoleName, Name, DurationMs, Success, Message, OuterMessage
| order by TimeGenerated asc
```

Requêtes en échec avec l'exception qui les a causées :

```kusto
AppRequests
| where TimeGenerated > ago(1h) and Success == false
| join kind=inner (AppExceptions | project OperationId, ExceptionType, OuterMessage) on OperationId
| summarize Failures = count() by Name, ExceptionType
```

Attribut personnalisé et métrique personnalisée :

```kusto
AppDependencies
| where Name == "retrieve-chunks"
| summarize avg(DurationMs) by TopK = toint(Properties["rag.top_k"])

AppMetrics
| where Name == "rag.tokens"
| summarize Tokens = sum(Sum) by Model = tostring(Properties["model"]), bin(TimeGenerated, 1h)
```

Journaux de conteneurs :

```kusto
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "rag-api" and Log_s has "Timeout"
| project TimeGenerated, RevisionName_s, Log_s
| take 100

ContainerLogV2
| where TimeGenerated > ago(1h) and PodNamespace == "rag" and LogLevel == "ERROR"
| project TimeGenerated, PodName, ContainerName, LogMessage
```

| Question | Forme de la réponse |
| --- | --- |
| « Nombre par intervalle » ou « tendance » | `summarize ... by bin(TimeGenerated, ...)` puis `render timechart` |
| « Les plus lents », « top N » | `top N by DurationMs desc`, ou `summarize` suivi de `top` |
| « Latence de queue » | `percentile()` ou `percentiles(DurationMs, 50, 95, 99)`, pas `avg()` |
| « Utilisateurs distincts » | `dcount(UserId)` |
| « Corréler une requête avec ses journaux » | Même `OperationId` dans `AppTraces` |
| « Filtrer sur un attribut personnalisé » | `Properties["name"]` avec `tostring()` ou `toint()` |

> **Piège d'examen.** `where` avant `summarize` filtre les lignes ; une condition sur un agrégat (`where FailureRate > 5`) doit venir après `summarize` ou `extend`. `project` supprime toutes les colonnes qu'il ne cite pas : un opérateur suivant ne peut plus les utiliser.

<!-- section: key-points -->
## Points clés

- Trois signaux : traces (étendues), métriques, journaux ; Application Insights stocke les journaux dans `AppTraces`, les traces dans `AppRequests` et `AppDependencies`.
- Les étendues `SERVER` et `CONSUMER` deviennent des requêtes ; les étendues `CLIENT`, `PRODUCER` et `INTERNAL` deviennent des dépendances.
- `traceparent` transporte l'ID de trace (`OperationId`) et l'ID de l'étendue parente (`ParentId`) entre les services ; `inject`/`extract` pour les transports personnalisés.
- `configure_azure_monitor()` lit `APPLICATIONINSIGHTS_CONNECTION_STRING` ; `OTEL_SERVICE_NAME` définit le nom du rôle cloud.
- Les attributs d'étendue deviennent `Properties` ; les exceptions dans un bloc d'étendue sont enregistrées automatiquement.
- KQL : `where`, `summarize ... by bin()`, `percentile`, `join ... on OperationId`, `render timechart` ; comptez avec `sum(ItemCount)` quand l'échantillonnage est actif.
- Les tables de l'espace de travail utilisent `TimeGenerated`, `DurationMs`, `OperationId`, `AppRoleName`, `Properties`.
