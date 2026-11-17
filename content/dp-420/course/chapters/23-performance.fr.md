Une charge de travail Azure Cosmos DB lente ou coûteuse se diagnostique avec trois outils : les métriques de requête et d'index renvoyées par le SDK, les métriques et alertes Azure Monitor, et les journaux de ressources dans Log Analytics. Les questions d'examen montrent une requête, une valeur de métrique ou un résultat KQL et demandent la cause et la correction la moins chère, ou demandent quel signal et quel type d'alerte détectent une situation donnée.

<!-- section: query-optimization | objectives: 2.3.1 -->
## Optimiser les requêtes

L'échelle des coûts de lecture, de la moins chère à la plus chère :

| Accès | Coût typique | Quand |
| --- | --- | --- |
| Lecture ponctuelle (`id` + clé de partition) | Environ 1 RU pour un élément de 1 Ko | Vous connaissez les deux valeurs |
| Requête avec un filtre d'égalité sur la clé de partition | Une partition, une recherche dans l'index | La plupart des requêtes applicatives |
| Requête avec `IN` sur la clé de partition | Seulement les partitions listées | Quelques locataires ou catégories connus |
| Requête sans filtre sur la clé de partition, ou avec un filtre de plage sur elle | Diffusion (fan-out) vers chaque partition physique | Rapports, écrans d'administration ; à éviter sur les chemins critiques |

Chaque partition physique a son propre index : une requête diffusée paie donc une recherche d'index par partition. Le gain d'un filtre sur la clé de partition devient sensible au-delà d'environ 30 000 RU/s provisionnées ou d'environ 100 Go de données.

Corrections des cas classiques :

| Symptôme dans la requête | Pourquoi c'est lent | Correction |
| --- | --- | --- |
| `WHERE UPPER(c.name) = 'BOB'` ou `LOWER(...)` | La fonction ne peut pas utiliser l'index : chaque élément est chargé (analyse complète) | Stocker une valeur normalisée à l'écriture, ou indexer une propriété calculée |
| `WHERE c.ts > GetCurrentTimestamp() - 3600` | `GetCurrentDateTime`, `GetCurrentTimestamp`, `GetCurrentTicks` n'utilisent pas l'index | Calculer la valeur dans le client et passer un paramètre |
| Un chemin listé dans `excludedPaths` est filtré | Aucun index sur le chemin : analyse complète | Inclure le chemin (les chemins respectent la casse) |
| Filtre plus `ORDER BY` sur une autre propriété | Servi par l'index de plage seulement | Index composite ; mettre chaque propriété du composite dans `ORDER BY` |
| Plusieurs filtres, dont un de plage | Intersection d'index de plage | Index composite : propriétés d'égalité d'abord, l'unique propriété de plage en dernier |
| `CONTAINS`, `EndsWith`, `RegexMatch`, `StartsWith` insensible à la casse | Le coût croît avec la cardinalité de la propriété | Ajouter `ORDER BY` sur cette propriété (et sur la propriété d'égalité, avec un index composite) |
| Plusieurs `JOIN` sur des tableaux, filtres dans `WHERE` | Produit cartésien construit avant le filtrage | Déplacer chaque filtre dans une sous-requête `JOIN (SELECT VALUE t FROM t IN c.tags WHERE ...)` |
| `SELECT *` sur de gros éléments | Temps de chargement et de sérialisation | Projeter seulement les propriétés utiles |
| `GROUP BY` | Chaque élément correspondant est chargé ; le coût croît avec la cardinalité de la propriété groupée | Ajouter des filtres d'égalité sélectifs, ou maintenir une vue matérialisée à partir du flux de modification |

Les fonctions de chaîne qui **utilisent** l'index : `StartsWith`, `Contains`, `RegexMatch`, `Left`, et `Substring` quand la position de départ vaut 0. Les fonctions système dans `SELECT` n'ont pas d'effet sur l'utilisation de l'index. Les agrégats appliquent d'abord les filtres d'égalité et de plage, puis évaluent les autres filtres sur le reste : un filtre d'égalité supplémentaire rend donc `CONTAINS` dans un agrégat bien moins cher.

Index composite pour `WHERE c.foodGroup = @g ORDER BY c.foodGroup, c._ts` :

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [ { "path": "/*" } ],
  "excludedPaths": [],
  "compositeIndexes": [
    [
      { "path": "/foodGroup", "order": "ascending" },
      { "path": "/_ts", "order": "ascending" }
    ]
  ]
}
```

Règles des index composites : deux chemins ou plus, sans caractère générique ; l'ordre des chemins compte ; l'`ORDER BY` doit lister les chemins dans le même ordre avec les mêmes sens (ou tous inversés) ; au plus un filtre de plage par index composite, placé en dernier. Une requête qui ne filtre ou ne trie pas sur tous les chemins, dans l'ordre, ne l'utilise pas.

Les **propriétés calculées** indexent le résultat d'une expression que l'index ne peut pas servir directement :

```json
{
  "computedProperties": [
    { "name": "cp_lowerName", "query": "SELECT VALUE LOWER(c.name) FROM c" }
  ]
}
```

Jusqu'à 20 par conteneur, au premier niveau uniquement, `VALUE` obligatoire, sans `WHERE`, `JOIN`, agrégat, UDF ni fonction non déterministe. Elles ne sont **pas** couvertes par le chemin `/*` : ajoutez `/cp_lowerName/?` dans `includedPaths`. `SELECT *` ne les renvoie pas ; un `ORDER BY` sur l'une d'elles exige qu'elle soit indexée. Les définir ne coûte aucune RU ; celles qui sont indexées ajoutent un peu de RU en écriture.

Paramètres du SDK qui changent la latence d'une requête, pas les RU :

| Option (.NET `QueryRequestOptions`) | Effet | Recommandation |
| --- | --- | --- |
| `MaxConcurrency` | Partitions interrogées en parallèle | Nombre de partitions, ou une valeur élevée ; `-1` laisse le SDK décider |
| `MaxBufferedItemCount` | Éléments prérécupérés pendant que le client traite la page courante | Nombre de résultats attendu ou plus ; `-1` laisse le SDK décider |
| `MaxItemCount` | Éléments par aller-retour (taille de page) | Des pages plus grandes signifient moins d'allers-retours |

> **Piège d'examen.** Une page vide ne signifie pas que la requête est terminée. Toute requête peut renvoyer un jeton de continuation ; continuez à lire tant que `HasMoreResults` vaut true et videz entièrement la requête.

Côté client également : un seul `CosmosClient` (singleton) par compte, l'application dans la même région que le compte (`ApplicationRegion` ou `ApplicationPreferredRegions`), le mode direct, et aucun appel de métadonnées `Create...IfNotExistsAsync` ou `Read...Async` avant chaque opération sur un élément (les appels de métadonnées n'ont pas de SLA et sont limités séparément).

<!-- section: query-metrics | objectives: 2.3.2 -->
## Analyser les métriques de requête

Chaque page d'une requête renvoie des métriques côté serveur dans ses diagnostics :

| Métrique | Signification |
| --- | --- |
| `RetrievedDocumentCount` / `RetrievedDocumentSize` | Éléments chargés par le moteur |
| `OutputDocumentCount` / `OutputDocumentSize` | Éléments renvoyés |
| `IndexHitRatio` | Éléments correspondant au filtre divisés par les éléments chargés (0 à 1) |
| `IndexLookupTime` | Temps passé dans l'index |
| `DocumentLoadTime` | Temps de chargement des éléments |
| `DocumentWriteTime` | Temps de sérialisation de la sortie |
| `RuntimeExecutionTime` | Temps dans le runtime de requête (fonctions système, UDF) |
| `TotalTime` | Temps d'exécution total sur le serveur |

Avec le SDK .NET v3 (3.36.0 ou ultérieur) :

```text
FeedIterator<Product> it = container.GetItemQueryIterator<Product>(query);
while (it.HasMoreResults)
{
    FeedResponse<Product> page = await it.ReadNextAsync();
    ServerSideCumulativeMetrics m = page.Diagnostics.GetQueryMetrics();
    TimeSpan serverTime = m.CumulativeMetrics.TotalTime;
    double charge = m.TotalRequestCharge;
    foreach (ServerSidePartitionedMetrics p in m.PartitionedMetrics)
        Console.WriteLine($"{p.PartitionKeyRangeId}: {p.RequestCharge} RU");
}
```

`CumulativeMetrics` additionne un aller-retour sur toutes les partitions ; `PartitionedMetrics` donne chaque plage de clés de partition avec son `RequestCharge`. Une requête s'étend sur plusieurs allers-retours : agrégez les métriques de chaque page pour obtenir son coût réel. Les autres SDK exposent les mêmes données dans les diagnostics.

Comment les lire :

| Observation | Diagnostic | Solution |
| --- | --- | --- |
| Éléments chargés très supérieurs aux éléments renvoyés (60 951 contre 7), utilisation de l'index à 0 % | Analyse complète | Rendre le filtre compatible avec l'index (voir plus haut) |
| Chargés = renvoyés + 1 avec `TOP` | Normal | Rien |
| `DocumentLoadTime` représente l'essentiel de `TotalTime` | Trop d'éléments chargés | Réduire les éléments chargés, pas le runtime |
| `RuntimeExecutionTime` élevé | Fonctions système ou UDF coûteuses | Précalculer ou utiliser une propriété calculée |
| Une plage de clés de partition porte l'essentiel des frais | Partition chaude ou déséquilibrée | Revoir la clé de partition |
| `TotalTime` faible mais lenteur pour l'utilisateur | Temps passé hors du moteur | Réseau, région, client (voir la latence) |

> **Piège d'examen.** `TotalTime` mesure uniquement l'exécution sur le serveur. Il n'inclut jamais le transit réseau : ce n'est donc pas la latence de bout en bout vue par l'utilisateur.

Le dimensionnement du débit découle des frais : une requête de 5 RU sur 1 000 RU/s s'exécute environ 200 fois par seconde avant les réponses 429.

<!-- section: index-metrics | objectives: 2.3.3 -->
## Analyser les métriques d'index

Les métriques d'index indiquent quels chemins indexés une requête a utilisés et quels chemins ou index composites pourraient l'aider. Activez-les par requête ; elles sont désactivées par défaut :

```text
var options = new QueryRequestOptions { PopulateIndexMetrics = true };
FeedIterator<Item> it = container.GetItemQueryIterator<Item>(
    new QueryDefinition("SELECT TOP 10 c.id FROM c WHERE c.Item = @i AND c.Price > 2")
        .WithParameter("@i", "value1234"),
    requestOptions: options);
FeedResponse<Item> page = await it.ReadNextAsync();
Console.WriteLine(page.IndexMetrics);
```

Versions minimales : SDK .NET 3.21.0, SDK Java 4.19.0, SDK Python 4.6.0. La sortie comporte quatre sections :

```text
Index Utilization Information
  Utilized Single Indexes
    Index Spec: /Item/?
    Index Impact Score: High
    ---
    Index Spec: /Price/?
    Index Impact Score: High
    ---
  Potential Single Indexes
  Utilized Composite Indexes
  Potential Composite Indexes
    Index Spec: /Item ASC, /Price ASC
    Index Impact Score: High
    ---
```

| Section | Usage |
| --- | --- |
| Utilized Single Indexes / Utilized Composite Indexes | Chemins réellement utilisés par la requête. Un chemin jamais listé pour aucune requête peut être exclu pour économiser des RU en écriture et du stockage |
| Potential Single Indexes / Potential Composite Indexes | Suggestions, pas des preuves, et non exhaustives : ajoutez-les, puis mesurez à nouveau les frais en RU |
| Index Impact Score (`High`, `Low`) | Probabilité que le chemin réduise nettement les frais, estimée à partir de la seule forme de la requête |

Les métriques d'index ajoutent une surcharge : activez-les pendant le dépannage et utilisez les journaux de diagnostic pour suivre les requêtes coûteuses dans la durée.

Modifier la stratégie d'indexation n'affecte pas la disponibilité en lecture ni en écriture ; la transformation s'exécute en arrière-plan et sa progression se lit avec le SDK. Tant qu'un nouvel index composite n'est pas construit, le moteur continue d'utiliser les index de plage existants. Pour remplacer un index, ajoutez le nouveau, attendez la fin de la transformation, puis supprimez l'ancien.

> **Conseil d'examen.** Le stockage raconte la même histoire : l'onglet Storage d'Insights compare la taille des données à celle de l'index. Un index proche de la taille des données révèle une stratégie d'indexation qui indexe des chemins qu'aucune requête n'utilise.

<!-- section: latency | objectives: 2.3.4 -->
## Surveiller la latence de bout en bout par rapport aux objectifs de service

Le SLA d'Azure Cosmos DB couvre **moins de 10 ms pour les lectures et écritures ponctuelles en connectivité directe**. Mesurez séparément les deux moitiés d'une requête :

| Mesure | Où | Ce qu'elle couvre |
| --- | --- | --- |
| Server Side Latency Direct (`ServerSideLatencyDirect`) | Métriques Azure Monitor | Temps du back-end, mode direct (NoSQL, Table) |
| Server Side Latency Gateway (`ServerSideLatencyGateway`) | Métriques Azure Monitor | Temps du back-end, mode passerelle (toutes les API) |
| `Diagnostics.GetClientElapsedTime()` | Réponse du SDK | Temps complet vu par l'application, nouvelles tentatives comprises |
| `BELatencyInMs` dans le `StoreResult` des diagnostics | Diagnostics du SDK | Temps du back-end pour un appel direct |

L'ancienne métrique Server Side Latency est dépréciée. Les métriques de latence sont collectées sans configuration, se fractionnent par `DatabaseName`, `CollectionName`, `OperationType`, `Region` ou `PublicAPIType`, et restent consultables 30 jours dans la vue des métriques.

Journalisez les diagnostics quand une requête dépasse votre objectif ou échoue :

```text
ItemResponse<Order> r = await container.ReadItemAsync<Order>(id, new PartitionKey(customerId));
if (r.Diagnostics.GetClientElapsedTime() > sloThreshold)
{
    logger.LogWarning(r.Diagnostics.ToString());
}
// in catch (CosmosException ex): log ex.ToString(), which includes the diagnostics
```

Journalisez la chaîne de diagnostics telle quelle ; son format change entre les versions du SDK, ne l'analysez donc pas.

| Ce que montrent les diagnostics | Cause probable | Correction |
| --- | --- | --- |
| Latence côté serveur faible, temps écoulé côté client élevé | Client ou réseau | Même région, client singleton, mode direct |
| `BELatencyInMs` faible, `Transit Time` élevé | Réseau | Mise en réseau accélérée, VM plus grande, même région |
| `ChannelAcquisitionStarted` long | Création de connexions : clients non singleton, délais d'inactivité | Réutiliser un seul client |
| `Received` long, `isThreadStarving: True` | Famine de threads due à du code asynchrone bloqué (`.Result`, `.Wait()`) | Utiliser `await` |
| Processeur au-delà d'environ 40 % (la latence augmente), au-delà de 70 % (épuisement) | Processeur du client | Faire monter le client en charge ; surveiller le maximum, pas la moyenne |
| Statut 429 avec `RetryAfterInMs` | Limitation de débit ; le SDK réessaie, ce qui ajoute de la latence | Plus de RU/s ou une meilleure clé de partition |
| `TransportException`, beaucoup de connexions ouvertes | Épuisement des ports SNAT | Client singleton, moins de connexions |

> **Piège d'examen.** Une latence élevée avec une latence côté serveur faible ne se corrige jamais en ajoutant des RU/s : le temps est perdu entre le client et le service.

Insights (compte > Supervision > Insights) montre les requêtes par code d'état et la consommation de RU normalisée (Normalized RU Consumption) par plage de clés de partition, pour trouver les partitions chaudes.

<!-- section: alerts | objectives: 2.3.5 -->
## Configurer des alertes Azure Monitor

| Type d'alerte | Se déclenche sur | Exemple Cosmos DB |
| --- | --- | --- |
| Métrique | Une métrique qui franchit un seuil statique ou dynamique | Réponses 429, Normalized RU Consumption, basculement de région |
| Recherche dans les journaux | Le résultat d'une requête KQL sur les journaux de ressources | Une clé de partition logique qui approche 20 Go |
| Journal d'activité | Un événement du plan de contrôle | Clés du compte listées ou régénérées |

Créez une règle depuis le compte (Supervision > Alertes) ou depuis Azure Monitor : étendue, condition (signal, dimensions, seuil), groupe d'actions, détails. La règle devient active dans les 10 minutes.

| Exigence | Signal | Paramètres |
| --- | --- | --- |
| Trop de requêtes limitées | Total Requests | Dimension `StatusCode` = 429, agrégation Count, Greater than |
| Une partition proche de sa limite de RU/s | Normalized RU Consumption | Maximum, Greater than 90 %, éventuellement fractionné par `CollectionName` |
| Latence du back-end au-dessus de l'objectif | Server Side Latency Direct | Average ou Maximum, filtre sur `OperationType` |
| Une région a basculé | Region Failed Over (`RegionFailover`) | Count, Greater than 0 |
| Disponibilité sous la cible | Service Availability | Minimum, granularité horaire |
| Partition logique proche de 20 Go | Recherche dans les journaux sur `CDBPartitionKeyStatistics` | `SizeKb` au-dessus d'un seuil |
| Clés du compte régénérées | Journal d'activité | Opération sur les clés du compte |

Paramètres à connaître : seuil **statique** (valeur fixe) ou seuil **dynamique** (apprentissage automatique sur l'historique de la métrique) ; type d'agrégation, granularité d'agrégation et fréquence d'évaluation ; les dimensions filtrent la métrique (code d'état, base de données, conteneur). Un **groupe d'actions** (nom unique dans le groupe de ressources, nom court utilisé dans les notifications) envoie des notifications par e-mail, SMS, push ou appel vocal, ou exécute une fonction Azure ou une autre action.

> **Piège d'examen.** Quelques 429 ne sont pas une panne : 1 à 5 % de requêtes limitées alors que la latence respecte l'objectif signifient que les RU/s provisionnées sont bien utilisées. Alertez sur un seuil qui compte pour la charge de travail, et sur Normalized RU Consumption pour repérer une partition chaude.

<!-- section: diagnostic-logs | objectives: 2.3.6 -->
## Analyser les journaux de diagnostic dans Log Analytics

Les journaux de ressources enregistrent chaque requête du plan de données. Ils ne sont collectés qu'après l'ajout d'un **paramètre de diagnostic** (compte > Supervision > Paramètres de diagnostic) : choisissez les catégories, envoyez-les vers un espace de travail Log Analytics et sélectionnez **Spécifique à la ressource** comme mode de table de destination. Le mode spécifique à la ressource (recommandé pour toutes les API sauf Table) écrit dans des tables `CDB...` dédiées aux colonnes typées ; l'ancien mode Diagnostics Azure écrit tout dans `AzureDiagnostics` avec des colonnes suffixées comme `requestCharge_s`.

| Catégorie | Table | Usage |
| --- | --- | --- |
| DataPlaneRequests | `CDBDataPlaneRequests` | Chaque opération sur les données : `OperationName`, `StatusCode`, `RequestCharge`, `DurationMs`, `ActivityId`, `RegionName`, `UserAgent` |
| QueryRuntimeStatistics | `CDBQueryRuntimeStatistics` | Texte de la requête (`QueryText`), joint aux requêtes sur `ActivityId` |
| PartitionKeyRUConsumption | `CDBPartitionKeyRUConsumption` | RU par clé de partition logique (`PartitionKey`, `PartitionKeyRangeId`) : clés chaudes |
| PartitionKeyStatistics | `CDBPartitionKeyStatistics` | Plus grandes clés de partition logiques (`SizeKb`) ; échantillonné, les clés de moins d'environ 1 Go peuvent ne pas apparaître |
| ControlPlaneRequests | `CDBControlPlaneRequests` | Modifications du compte : basculement, stratégie d'indexation, pare-feu, attributions de rôles |

Le texte des requêtes et leurs paramètres sont **masqués** par défaut. Pour les voir, activez **Diagnostics full-text query** (compte > Paramètres > Fonctionnalités) ; cela augmente le volume et le coût des journaux, désactivez-le donc après le dépannage.

Opérations les plus coûteuses de la dernière heure :

```kusto
CDBDataPlaneRequests
| where TimeGenerated > ago(1h)
| summarize TotalRU = sum(RequestCharge), P99Ms = percentile(DurationMs, 99), Calls = count()
    by OperationName, CollectionName
| order by TotalRU desc
```

Requêtes coûteuses avec leur texte :

```kusto
CDBDataPlaneRequests
| where TimeGenerated > ago(1d) and RequestCharge > 50
| project ActivityId, RequestCharge, DurationMs
| join kind=inner (CDBQueryRuntimeStatistics | project ActivityId, QueryText) on ActivityId
| order by RequestCharge desc
| take 20
```

Limitation de débit dans le temps, et clés de partition logiques chaudes :

```kusto
CDBDataPlaneRequests
| where StatusCode == 429
| summarize Throttled = count() by bin(TimeGenerated, 5m), CollectionName

CDBPartitionKeyRUConsumption
| where TimeGenerated > ago(1h)
| summarize TotalRU = sum(RequestCharge) by PartitionKey, PartitionKeyRangeId
| top 10 by TotalRU desc
```

| Question | Table et colonne |
| --- | --- |
| Quelle requête consomme le plus de RU ? | `CDBDataPlaneRequests.RequestCharge` joint à `CDBQueryRuntimeStatistics.QueryText` |
| Quel locataire (valeur de clé de partition) provoque des 429 ? | `CDBPartitionKeyRUConsumption.PartitionKey` |
| Quelle partition logique approche 20 Go ? | `CDBPartitionKeyStatistics.SizeKb` |
| Qui a modifié la stratégie d'indexation ? | `CDBControlPlaneRequests` |

> **Conseil d'examen.** Les métriques sont gratuites, préagrégées et conservées 90 jours ; les journaux coûtent en ingestion et en stockage mais détaillent chaque requête. Choisissez les journaux quand la question exige une valeur de clé de partition, un texte de requête ou l'`ActivityId` d'une requête précise.

<!-- section: key-points -->
## Points clés

- Lecture ponctuelle, puis requête sur une seule partition, puis diffusion : filtrez sur la clé de partition chaque fois que possible.
- Des fonctions comme `UPPER`, `LOWER` et `GetCurrentTimestamp` dans `WHERE` provoquent des analyses complètes ; normalisez à l'écriture ou utilisez une propriété calculée indexée (non couverte par `/*`).
- Filtre plus `ORDER BY` : index composite, chemins d'égalité d'abord, un seul chemin de plage en dernier, chaque chemin dans `ORDER BY`.
- Chargés très supérieurs aux renvoyés = analyse complète ; une partition qui porte l'essentiel des frais = partition chaude ; `TotalTime` exclut le réseau.
- `PopulateIndexMetrics` liste les index utilisés et potentiels ; pour le dépannage uniquement.
- SLA : moins de 10 ms pour les lectures et écritures ponctuelles en mode direct ; comparez la latence côté serveur avec `GetClientElapsedTime()`.
- Alertes de métrique pour les 429 et Normalized RU Consumption, alertes de recherche dans les journaux pour la taille des partitions, alertes du journal d'activité pour les clés.
- Paramètres de diagnostic spécifiques à la ressource ; jointure de `CDBDataPlaneRequests` et `CDBQueryRuntimeStatistics` sur `ActivityId` ; requête en texte intégral (full-text query) seulement pendant le dépannage.
