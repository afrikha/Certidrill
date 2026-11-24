Les questions de streaming demandent quel moteur traite les événements (flux d'événements, streaming structuré Spark ou KQL dans un eventhouse), où vivent les données (tables natives d'eventhouse ou raccourcis OneLake, accélérés ou non), et comment écrire la transformation et la fenêtre de temps. Attendez-vous à du code à compléter en KQL, en PySpark ou dans l'opérateur SQL du flux d'événements, et à des questions sur les types de fenêtres où un mot (« chevauchement », « inactivité », « chaque événement ») décide de la réponse.

<!-- section: choose-engine | objectives: 2.3.1 -->
## Choisir un moteur de diffusion en continu

| | Flux d'événements | Streaming structuré Spark | KQL dans un eventhouse |
| --- | --- | --- | --- |
| Création | Canevas sans code, ou opérateur SQL | Code PySpark ou Scala dans un notebook ou une définition de travail Spark | Requêtes KQL, stratégies de mise à jour, vues matérialisées |
| Rôle | Capture, transformation légère et **routage** des événements | Traitement de flux complexe, bibliothèques, jointures avec des tables Delta | Stocker et analyser les événements, transformer à l'ingestion, interroger les données fraîches |
| Sources | Event Hubs, IoT Hub, Service Bus, Kafka et Confluent Cloud, Amazon Kinesis, Google Pub/Sub, CDC depuis Azure SQL Database, SQL Server, PostgreSQL, MySQL et Cosmos DB, point de terminaison personnalisé, événements Fabric et Azure | Event Hubs, Kafka et autres connecteurs Spark, tables Delta | Flux d'événements, autres méthodes d'ingestion |
| Sortie | Eventhouse, lakehouse, Activator, point de terminaison personnalisé, flux dérivé | Tables Delta | Tables d'eventhouse, tableaux de bord, alertes |
| Latence | Secondes | Micro-lot (intervalle du déclencheur) | Secondes de l'ingestion à la requête |

| Exigence | Moteur |
| --- | --- |
| Router des événements d'Event Hubs vers un eventhouse et vers Activator, sans code | Flux d'événements |
| Filtrer et agréger des événements avant leur stockage, compétences SQL | Flux d'événements (opérateurs sans code ou opérateur SQL) |
| Analyser des événements, appeler une bibliothèque Python, fusionner dans des tables Delta | Streaming structuré Spark |
| Analyse interactive de journaux et de séries chronologiques quelques secondes après leur arrivée | Eventhouse avec KQL |
| Transformer automatiquement du JSON brut en colonnes typées à l'arrivée des données dans KQL | Stratégie de mise à jour |

> **Piège d'examen.** Un flux d'événements ne stocke pas de données pour l'analyse : il traite et route. « Interroger les 30 derniers jours de télémétrie avec une latence inférieure à la seconde » demande une destination eventhouse (ou Spark qui écrit du Delta), pas le flux d'événements seul.

<!-- section: native-or-shortcut | objectives: 2.3.2 -->
## Tables natives ou raccourcis OneLake dans Real-Time Intelligence

Un eventhouse peut **ingérer** des données dans des tables KQL natives, ou **référencer** des données de OneLake ou d'un stockage externe par un raccourci (interrogé avec `external_table()`).

| | Table native | Raccourci OneLake (standard) |
| --- | --- | --- |
| Données | Ingérées et stockées dans l'eventhouse, indexées | Restent dans la source (lakehouse, entrepôt, base de données KQL, ADLS, S3, Google Cloud Storage) |
| Requête | `TableName` | `external_table('ShortcutName')` |
| Performances | Les plus rapides | Plus lentes : appels réseau vers le stockage, pas d'index |
| Stratégies de mise à jour, vues matérialisées | Oui | Non |
| Fraîcheur | Dès l'ingestion | Ce que contient la source au moment de la requête |
| Duplication | Une copie des données | Aucune copie |
| Limites | | Un dossier ou une table par raccourci, un seul raccourci créé à la fois, pas de renommage, pas de `*` dans les noms de colonnes |

Les types Delta se mappent vers des types KQL (`string` vers `string`, `long` vers `long`, `integer` vers `int`, `decimal` vers `decimal`, `date` et `timestamp_ntz` vers `datetime`, `struct`, `array` et `map` vers `dynamic`). Les changements de schéma de la source sont synchronisés par défaut pour un raccourci standard (un raccourci accéléré demande un `.alter`, voir plus bas).

| Exigence | Choix |
| --- | --- |
| Événements de streaming interrogés en permanence par des tableaux de bord | Table native |
| Joindre la télémétrie à une table de produits qui vit dans un lakehouse, rarement interrogée | Raccourci |
| Transformer les données à l'ingestion avec une stratégie de mise à jour | Table native |
| Éviter de stocker une seconde copie de tables Delta organisées | Raccourci |

> **Conseil d'examen.** Les événements qui arrivent en continu vont dans des tables natives ; les données de référence qui changent lentement et se trouvent déjà dans OneLake s'atteignent mieux par un raccourci que par une copie.

<!-- section: query-acceleration | objectives: 2.3.3 -->
## Accélération des requêtes pour les raccourcis OneLake

L'**accélération des requêtes** applique une stratégie à la table Delta externe derrière un raccourci : l'eventhouse indexe et met en cache les données à mesure qu'elles arrivent dans OneLake, avec des performances de requête comparables à celles des données ingérées.

- Activez-la à la création du raccourci (**Accelerate** sur On) ou plus tard : **Manage > Data policies > Query acceleration**. Il faut le rôle Admin, Member ou Contributor dans l'espace de travail.
- La **période de mise en cache** (nombre de jours, propriété **Hot** de la stratégie) se compte à partir de l'heure de modification du fichier dans le journal Delta ; par défaut, c'est la période de mise en cache de la base de données.
- Facturation : les données accélérées sont facturées sur le compteur **OneLake Premium cache**, comme les tables natives, et l'indexation consomme des unités de capacité.
- Limites : au plus **900 colonnes** ; les fichiers Parquet de plus de **6 Go** compressés ne sont pas mis en cache ; les performances peuvent baisser au-delà de 2,5 millions de fichiers de données ; pas d'élagage par index pour les partitions. Un changement de schéma de la table Delta doit être suivi d'un `.alter` du schéma de la table delta externe, et un changement cassant peut faire repartir l'accélération de zéro. Les raccourcis accélérés se comportent comme des tables externes, sans vues matérialisées (et les stratégies de mise à jour sur eux sont limitées à une préversion).
- Suivez la progression :

```kusto
.show external table operations query_acceleration statistics
```

| Exigence | Choix |
| --- | --- |
| Requêtes ad hoc occasionnelles sur une grande table de lakehouse, coût minimal | Raccourci standard |
| Des tableaux de bord interrogent chaque minute les 30 derniers jours d'une table Delta, sans pipeline de copie | Raccourci accéléré avec une période de mise en cache de 30 jours |
| Les données doivent être transformées par une stratégie de mise à jour et conservées dans une vue matérialisée | Table native (ingérez-les) |

> **Piège d'examen.** L'accélération des requêtes ne copie pas les données dans une table native et n'est pas gratuite : le cache est facturé comme le stockage d'un eventhouse. Si l'exigence est « aucun coût de stockage supplémentaire », gardez un raccourci standard.

<!-- section: eventstream | objectives: 2.3.4 -->
## Traiter des données en utilisant des flux d'événements

Un flux d'événements a un **flux par défaut** alimenté par ses sources ; les opérateurs créent des flux traités, et un **flux dérivé** publie un flux traité dans le hub Real-Time pour que d'autres flux d'événements et destinations le réutilisent.

| Opérateur | Rôle |
| --- | --- |
| Filter | Garde les événements qui remplissent une condition (température `> 80`, état = erreur) |
| Manage fields | Ajoute, supprime, renomme des champs ou change leur type ; fonctions intégrées de chaîne, de date et d'heure, et mathématiques |
| Aggregate | Sum, Minimum, Maximum ou Average recalculé à chaque nouvel événement sur une période |
| Group by | Agrégations sur des **fenêtres de temps** (par exemple bascule ou glissante), groupées par colonnes |
| Union | Fusionne des flux ; seuls les champs de même nom et de même type sont conservés |
| Join | Combine deux flux sur une condition de correspondance |
| Expand | Une ligne par valeur d'un tableau |
| SQL | Logique personnalisée dans le langage de requête Stream Analytics |

L'**opérateur SQL** écrit une ou plusieurs instructions `SELECT ... INTO output FROM input` (une clause `WITH` lit l'entrée une seule fois pour plusieurs sorties), utilise l'**heure d'arrivée** sauf si `TIMESTAMP BY` définit l'heure de l'événement, et propose des seuils d'arrivée tardive et de désordre dans ses paramètres avancés. Il ne peut pas être combiné à d'autres opérateurs sur le même chemin, ne peut pas être chaîné, et demande de nouveaux nœuds de destination. Les flux d'événements dont le nom contient `_` ou `.` ne sont pas compatibles avec l'opérateur SQL.

```text
SELECT System.Timestamp() AS WindowEnd, roomId, AVG(temperature) AS AvgTemp
INTO HotRooms
FROM SensorInput TIMESTAMP BY eventTime
GROUP BY roomId, TumblingWindow(minute, 1)
HAVING AVG(temperature) > 75
```

Destinations : **Eventhouse** (Ingestion directe, ou Traitement des événements avant l'ingestion), **Lakehouse**, **Activator**, **point de terminaison personnalisé**, **flux dérivé**. Lakehouse, Eventhouse (traitement des événements), flux dérivé et Activator acceptent des données traitées ; toute autre destination les reçoit via un flux dérivé. Créer ou modifier un flux d'événements demande Contributor ou plus sur l'espace de travail ; testez les opérateurs avec **Actualiser** en mode Édition, puis **Publier**.

> **Piège d'examen.** Union écarte les champs qui ne correspondent pas par le nom **et** par le type. Deux flux avec `temp` en `double` dans l'un et en `string` dans l'autre perdent ce champ : alignez d'abord les types avec Manage fields.

<!-- section: spark-streaming | objectives: 2.3.5 -->
## Traiter des données en utilisant le streaming structuré Spark

Une requête de streaming structuré lit une source sans fin comme une table qui grandit sans cesse, et écrit chaque micro-lot dans un récepteur :

```text
from pyspark.sql import functions as F

raw = (spark.readStream
    .format("eventhubs")
    .options(**ehConf)
    .load())

events = (raw
    .withColumn("body", F.col("body").cast("string"))
    .select(F.from_json("body", schema).alias("e"))
    .select("e.*"))

(events.writeStream
    .format("delta")
    .option("checkpointLocation", "Files/checkpoints/events")
    .outputMode("append")
    .partitionBy("EventDate")
    .trigger(processingTime="1 minute")
    .toTable("bronze_events"))
```

| Élément | Rôle |
| --- | --- |
| `readStream` / `writeStream` | Lecture et écriture en streaming (au lieu de `read` / `write` pour le traitement par lots) |
| `checkpointLocation` | Progression et état, pour qu'une requête redémarrée reprenne sans perte ni doublon ; un par requête |
| `outputMode("append")` | N'écrit que les nouvelles lignes (`update` et `complete` pour les agrégations) |
| `trigger(processingTime=...)` | Intervalle des micro-lots ; des lots plus grands donnent moins de fichiers Delta, plus gros |
| `partitionBy()` | Dossiers par colonne ; choisissez une colonne qui donne des fichiers de bonne taille |
| Écriture optimisée | `spark.databricks.delta.optimizeWrite.enabled` fusionne ou fractionne les partitions avant l'écriture, au lieu de `repartition()` |

En production, exécutez le flux comme une **définition de travail Spark** avec une **stratégie de nouvelle tentative** (nombre de redémarrages et intervalle, jusqu'à l'infini) plutôt qu'un notebook interactif, et surveillez le débit d'entrée, le débit de traitement et la durée des lots dans l'onglet **Structured Streaming** du hub de supervision. Les scénarios Event Hubs à haut débit utilisent couramment 32 partitions ou plus.

> **Piège d'examen.** Sans `checkpointLocation`, une requête redémarrée ne peut pas savoir quels événements elle a déjà écrits. Deux requêtes ne doivent jamais partager un point de contrôle.

<!-- section: kql-processing | objectives: 2.3.6 -->
## Traiter des données en utilisant KQL

KQL transforme à trois moments : au moment de la **requête**, au moment de l'**ingestion** (stratégie de mise à jour) et **en continu** en arrière-plan (vue matérialisée).

Une **stratégie de mise à jour** exécute une requête sur chaque lot ingéré dans une table source et écrit le résultat dans une table cible :

```kusto
.create function ParseTelemetry() {
    RawTelemetry
    | extend d = parse_json(Payload)
    | project Timestamp = todatetime(d.ts), DeviceId = tostring(d.deviceId), Temp = todouble(d.temp)
}

.alter table Telemetry policy update
@'[{"IsEnabled": true, "Source": "RawTelemetry", "Query": "ParseTelemetry()", "IsTransactional": true}]'
```

- `IsTransactional` vaut `false` par défaut : si la stratégie échoue, la source garde les données et la cible les manque. `true` fait échouer les deux ensemble (recommandé en production).
- La sortie de la fonction doit correspondre au schéma de la cible (types et ordre des colonnes). Source et cible sont dans la même base de données. La requête ne peut lire des tables d'autres bases de données que si la stratégie a une `ManagedIdentity` qui a le rôle `viewer` sur ces bases ; pas de requête entre eventhouses, de table externe (sauf une table accélérée) ni d'appel de plug-in.
- Pour ne garder que les données transformées, définissez la période de suppression réversible de la rétention de la source à `0s` avec une stratégie transactionnelle.
- Les stratégies peuvent s'enchaîner (A vers B vers C). Vérifiez les échecs avec `.show ingestion failures`.

Une **vue matérialisée** garde une agrégation à jour : déduplication (`take_any`), dernier enregistrement par clé (`arg_max`), ou sous-échantillonnage avec `bin()` :

```kusto
.create materialized-view with (backfill=true) TelemetryHourly on table Telemetry
{
    Telemetry
    | summarize AvgTemp = avg(Temp), Readings = count() by DeviceId, bin(Timestamp, 1h)
}

materialized_view('TelemetryHourly')
| where Timestamp > ago(1d)
```

> **Piège d'examen.** Une stratégie de mise à jour transforme chaque nouveau lot une fois, à l'ingestion ; elle ne recalcule pas l'historique. Une vue matérialisée agrège en continu sur toute la table (`backfill=true` inclut les données existantes). « Dernier état de chaque appareil » est une vue matérialisée avec `arg_max`, pas une stratégie de mise à jour.

<!-- section: windowing | objectives: 2.3.7 -->
## Créer des fonctions de fenêtrage

| Fenêtre | Comportement | Événement dans plusieurs fenêtres | Stream Analytics (opérateur SQL) |
| --- | --- | --- | --- |
| Bascule (tumbling) | Taille fixe, contiguës, sans chevauchement | Non | `TumblingWindow(minute, 5)` |
| Récurrente (hopping) | Taille fixe, avance d'un saut plus petit que la taille | Oui | `HoppingWindow(minute, 10, 5)` (taille 10, saut 5) |
| Glissante (sliding) | Sortie seulement quand un événement entre dans la fenêtre ou en sort | Oui | `SlidingWindow(minute, 10)` |
| Session | S'étend tant que des événements arrivent dans un délai, se ferme après une inactivité ou à une durée maximale | Non | `SessionWindow(minute, 5, 60)` (délai 5, maximum 60) |
| Instantané (snapshot) | Groupe les événements de même horodatage | Non | `GROUP BY System.Timestamp()` |

Une fenêtre bascule est une fenêtre récurrente dont le saut est égal à la taille. Les résultats sont émis à la **fin** de la fenêtre, horodatés avec l'heure de fin de la fenêtre.

Le streaming structuré Spark utilise `window()` et `session_window()` avec un **filigrane** (watermark) qui indique à Spark combien de temps attendre les événements tardifs avant de fermer une fenêtre et d'abandonner son état :

```text
counts = (events
    .withWatermark("EventTime", "10 minutes")
    .groupBy(F.window("EventTime", "5 minutes"), "DeviceId")
    .agg(F.avg("Temp").alias("AvgTemp")))

hopping = events.groupBy(F.window("EventTime", "10 minutes", "5 minutes"), "DeviceId").count()
sessions = events.groupBy(F.session_window("EventTime", "15 minutes"), "UserId").count()
```

En KQL, `bin()` construit des fenêtres bascules ; `row_window_session()` attribue des sessions sur des lignes triées ; les fonctions de fenêtre comme `prev()` demandent une entrée sérialisée (ordonnée) :

```kusto
Telemetry
| where Timestamp > ago(1h)
| summarize AvgTemp = avg(Temp) by DeviceId, bin(Timestamp, 5m)

Clicks
| order by UserId asc, Timestamp asc
| extend SessionStart = row_window_session(Timestamp, 1h, 15m, UserId != prev(UserId))
```

Le SQL par lots a aussi des fonctions de fenêtrage sur les lignes : `ROW_NUMBER()`, `LAG()`, et `SUM(...) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` pour un total cumulé ou mobile.

> **Piège d'examen.** « Des fenêtres qui se chevauchent toutes les 5 minutes, couvrant les 10 dernières minutes » est une fenêtre récurrente, pas glissante. « Regrouper les clics d'un utilisateur jusqu'à 15 minutes d'inactivité » est une fenêtre de session. « Compter par heure sans chevauchement » est une fenêtre bascule, soit `bin(Timestamp, 1h)` en KQL.

<!-- section: key-points -->
## Points clés

- Le flux d'événements route et transforme légèrement ; le streaming structuré Spark gère les traitements par le code vers Delta ; l'eventhouse stocke et analyse avec KQL.
- Tables natives : les plus rapides, stratégies de mise à jour et vues matérialisées. Raccourcis : aucune copie, `external_table()`, plus lents.
- L'accélération des requêtes met en cache les données du raccourci pendant un nombre de jours (Hot), facturé comme le stockage d'un eventhouse ; 900 colonnes au maximum, pas de vues matérialisées.
- Opérateurs du flux d'événements : Filter, Manage fields, Aggregate, Group by, Union, Join, Expand, SQL ; les flux dérivés transportent les données traitées vers d'autres destinations.
- Streaming Spark : point de contrôle, mode append, intervalle du déclencheur, définition de travail Spark avec stratégie de nouvelle tentative en production.
- Fenêtres : bascule (sans chevauchement), récurrente (chevauchement par saut), glissante (à chaque changement), session (délai d'inactivité), instantané (même horodatage) ; les filigranes bornent les données tardives.
