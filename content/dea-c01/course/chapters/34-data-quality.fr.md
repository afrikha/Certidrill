Les questions sur la qualité des données décrivent un pipeline qui laisse passer des enregistrements incorrects (identifiants client vides, commandes en double, montants négatifs, un flux qui livre soudain moitié moins de lignes que d'habitude) ou une tâche qui dure bien plus longtemps que son volume de données ne le justifie. La réponse indique où contrôler (dans la tâche ETL ou sur la table au repos), quel outil écrit les règles (AWS Glue Data Quality avec DQDL, ou les ensembles de règles d'AWS Glue DataBrew), ce que deviennent les lignes en échec, comment examiner une partie représentative d'un grand jeu de données et comment supprimer l'asymétrie des données (data skew). Ce chapitre couvre les contrôles dans le pipeline, la définition des règles, l'examen de la cohérence, l'échantillonnage et l'asymétrie.

<!-- section: checks-in-pipeline | objectives: 3.4.1 -->
## Exécuter des contrôles de qualité pendant le traitement

AWS Glue Data Quality est sans serveur et repose sur le framework open source Deequ. Il a deux points d'entrée que l'examen distingue :

| Capacité | Basé sur le Data Catalog | Basé sur une tâche ETL |
| --- | --- | --- |
| Ce qui est contrôlé | Les tables (et les vues Athena prises en charge) déjà présentes dans le Glue Data Catalog : données au repos | Les données qui traversent une tâche Glue, avant d'atteindre la cible |
| Utilisateur type | Gestionnaires de données (data stewards), analystes, sans code | Ingénieurs de données, dans Glue Studio, des notebooks ou des scripts |
| Recommandations de règles | Oui (Glue profile les données et propose des règles) | Non |
| Identifier les enregistrements en échec | Non | Oui : résultats au niveau des lignes |
| Règles dynamiques et étiquettes | Non | Oui |
| Exécutions incrémentielles | Prédicats pushdown | Signets de tâche Glue (job bookmarks) |

Dans une tâche Glue Studio, la transformation **Evaluate Data Quality** exécute un ensemble de règles et peut produire :

- les **données d'origine** (`rowLevelOutcomes`) avec les colonnes ajoutées `DataQualityRulesPass`, `DataQualityRulesFail`, `DataQualityRulesSkip` et `DataQualityEvaluationResult` (`Passed` ou `Failed` pour chaque ligne) ;
- les **résultats des règles** (`ruleOutcomes`) : chaque règle avec son statut de réussite ou d'échec, à écrire dans S3 ou une base de données.

L'action en cas d'échec de l'ensemble de règles est l'une des suivantes : **None** (par défaut, la tâche continue), **Fail job after loading data to target** ou **Fail job without loading to target data**. Les résultats et les métriques sont publiés dans Amazon CloudWatch et Amazon EventBridge pour les alarmes et les réponses automatisées.

Un modèle courant envoie les lignes où `DataQualityEvaluationResult = 'Failed'` vers un préfixe de quarantaine et les autres vers la zone organisée (curated), pour que les bonnes données continuent d'arriver pendant la correction des mauvaises lignes :

```python
from awsglue.transforms import SelectFromCollection
from awsgluedq.transforms import EvaluateDataQuality

ruleset = """Rules = [
    IsComplete "order_id",
    IsUnique "order_id",
    ColumnValues "amount" > 0
]"""

results = EvaluateDataQuality().process_rows(
    frame=orders,
    ruleset=ruleset,
    publishing_options={
        "dataQualityEvaluationContext": "orders_check",
        "enableDataQualityCloudWatchMetrics": True,
        "enableDataQualityResultsPublishing": True,
    },
)
rows = SelectFromCollection.apply(dfc=results, key="rowLevelOutcomes").toDF()
good = rows.filter(rows.DataQualityEvaluationResult == "Passed")
bad = rows.filter(rows.DataQualityEvaluationResult == "Failed")
```

| Exigence | Choix |
| --- | --- |
| Empêcher les mauvaises données d'atteindre le lac de données, avec le moins de code | Transformation Evaluate Data Quality dans la tâche Glue, faire échouer la tâche ou séparer les lignes en échec |
| Continuer à charger les bonnes lignes, isoler les mauvaises | Résultats au niveau des lignes, filtre sur `DataQualityEvaluationResult` vers un emplacement de quarantaine |
| Surveiller des tables chargées par d'autres équipes, sans modifier leur pipeline | Qualité des données basée sur le Data Catalog, planifiée |
| Alerter l'équipe quand un contrôle échoue | Règle EventBridge sur le résultat de qualité, cible Amazon SNS |
| Contrôle simple d'un petit fichier à son arrivée dans S3 | Notification d'événement S3 vers une fonction Lambda qui valide et déplace l'objet |
| Contrôles dans Spark sur Amazon EMR | La bibliothèque open source Deequ (ou PyDeequ) dans l'application Spark |

> **Piège d'examen.** La qualité des données basée sur le Data Catalog ne sait pas indiquer quels enregistrements ont échoué et ne peut pas bloquer un chargement : elle évalue des données déjà stockées. « Empêcher l'écriture des enregistrements aux champs vides » exige le contrôle dans la tâche ETL.

<!-- section: quality-rules | objectives: 3.4.2 -->
## Définir des règles de qualité des données

**DQDL** (Data Quality Definition Language) est sensible à la casse. Un ensemble de règles est une liste `Rules` ; chaque règle est un type de règle, ses paramètres et, pour la plupart des types, une expression.

```text
Rules = [
    IsComplete "customer_id",
    IsPrimaryKey "order_id",
    Completeness "email" > 0.95,
    ColumnValues "status" in ["NEW", "SHIPPED", "CANCELLED"],
    ColumnValues "country" matches "[A-Z]{2}" with threshold > 0.99,
    ColumnLength "postcode" between 4 and 10,
    DataFreshness "updated_at" <= 24 hours,
    RowCount > avg(last(7)) * 0.8,
    (IsComplete "ship_date") or (ColumnValues "status" = "NEW"),
    Completeness "discount" > 0.9 where "channel = 'web'"
]
Analyzers = [
    DistinctValuesCount "product_id"
]
```

| Famille de règles | Exemples | Ce qui est contrôlé |
| --- | --- | --- |
| Complétude | `IsComplete`, `Completeness` | Aucune valeur nulle, ou un ratio minimal de valeurs non nulles |
| Unicité | `IsUnique`, `IsPrimaryKey`, `Uniqueness`, `UniqueValueRatio` | Doublons dans les clés |
| Validité | `ColumnValues`, `ColumnLength`, `ColumnDataType`, `ColumnExists` | Valeurs autorisées, plages, expressions régulières, types |
| Statistiques | `Mean`, `Sum`, `StandardDeviation`, `Entropy`, `DistinctValuesCount` | Distribution d'une colonne |
| Volume et fraîcheur | `RowCount`, `DataFreshness`, `FileFreshness`, `FileSize` | Chargements manquants, données périmées |
| Entre jeux de données | `ReferentialIntegrity`, `DatasetMatch`, `RowCountMatch`, `AggregateMatch`, `SchemaMatch` | Cohérence avec un autre jeu de données |
| Forme libre | `CustomSql` | Toute condition SQL |

- Les **seuils** (`with threshold > 0.99`) acceptent une part de lignes en échec pour `ColumnValues`, `ColumnDataType` et `CustomSql`.
- **`where`** filtre les lignes évaluées par une règle (prédicat Spark SQL).
- Les **règles dynamiques** comparent avec l'historique : `last(k)` renvoie les k dernières valeurs de la métrique et doit être entouré de `avg`, `min`, `max`, `median`, `sum` ou `std` quand k est supérieur à 1. Elles ne fonctionnent que dans les tâches ETL.
- Les **analyseurs** (Analyzers) collectent des statistiques sans réussite ni échec ; avec eux, la **détection d'anomalies** (apprentissage automatique sur les statistiques dans le temps) signale des observations comme un nombre de lignes inhabituel, et `DetectAnomalies` en fait une règle.
- **Recommandations** : sur une table du Data Catalog, Glue profile les données et propose un ensemble de règles de départ.
- Limites : 2 000 règles et 65 Ko par ensemble de règles ; les colonnes imbriquées ou de type liste doivent d'abord être aplaties.

**AWS Glue DataBrew** définit les règles visuellement. Un **ensemble de règles** (ruleset) appartient à un jeu de données et contient des règles ; chaque règle a un ou plusieurs contrôles combinés par AND ou OR, soit agrégés (maximum, minimum, nombre de doublons), soit au niveau des lignes avec un seuil de réussite (« au moins 95 % des lignes »). Les règles ne s'appliquent qu'aux types de colonnes simples. Les ensembles de règles sont validés quand une **tâche de profil** (profile job) s'exécute ; le rapport de validation est écrit à côté du profil dans S3.

> **Conseil d'examen.** « Des analystes sans compétences en programmation définissent et valident des règles de qualité » désigne les ensembles de règles DataBrew ou la qualité des données Glue basée sur le Data Catalog avec recommandations. « Faire échouer la tâche ETL quand le nombre de lignes quotidien baisse de plus de 20 % par rapport aux dernières exécutions » est une règle dynamique DQDL dans la tâche.

<!-- section: data-consistency | objectives: 3.4.3 -->
## Examiner la cohérence des données

La cohérence signifie qu'un même fait a la même valeur et le même format partout : un seul format de date, une seule liste de codes pays, aucune clé étrangère orpheline, les mêmes totaux dans la source et la cible.

Une **tâche de profil** DataBrew révèle les incohérences avant d'écrire des règles :

| Statistique du profil | Incohérence révélée |
| --- | --- |
| `DUPLICATE_ROWS_COUNT` (jeu de données) | Chargements en double, messages rejoués |
| `CORRELATION` (jeu de données) | Colonnes qui devraient évoluer ensemble mais ne le font pas |
| `MISSING_VALUES_COUNT` (valeurs nulles et chaînes vides) | Sources qui laissent vides les champs facultatifs |
| `DISTINCT_VALUES_COUNT`, `MOST_COMMON_VALUES` | La même valeur écrite de plusieurs façons (« FR », « France », « fr ») |
| `VALUE_DISTRIBUTION`, `OUTLIER_DETECTION` (score z, seuil 3 par défaut) | Mauvaises unités, valeurs hors plage |
| Détection d'entités (`EMAIL`, `CREDIT_CARD`, `PERSON_NAME`...) | Des PII dans des colonnes où elles ne devraient pas être |

La correction est une **recette** DataBrew (uniformiser la casse, changer les formats, compléter ou supprimer les valeurs manquantes, supprimer les doublons) exécutée par une tâche de recette (recipe job), puis un ensemble de règles pour que les données restent cohérentes.

Quand une tâche de profil avec des ensembles de règles se termine, DataBrew émet un événement EventBridge par ensemble de règles (`detail-type` « DataBrew Ruleset Validation Result », `validationState` `SUCCEEDED`, `FAILED` ou `ERROR`) :

```json
{
  "source": ["aws.databrew"],
  "detail-type": ["DataBrew Ruleset Validation Result"],
  "detail": { "validationState": ["FAILED"] }
}
```

La cohérence **entre jeux de données** utilise les règles DQDL qui comparent deux jeux de données :

```text
Rules = [
    ReferentialIntegrity "customer_id" "reference.customer_id" = 1.0,
    RowCountMatch "reference" >= 0.99,
    DatasetMatch "reference" "order_id" >= 0.98
]
```

Après la migration d'une base de données, la **validation des données** d'AWS DMS compare les lignes de la source et de la cible. Pour les fichiers, `SchemaMatch` et les paramètres de changement de schéma des robots d'analyse (crawlers) détectent la dérive des noms et des types de colonnes.

> **Piège d'examen.** Une tâche de profil décrit les données ; elle ne les modifie pas. Le nettoyage exige une tâche de recette (DataBrew) ou une transformation dans la tâche Glue.

<!-- section: data-sampling | objectives: 3.4.4 -->
## Les techniques d'échantillonnage des données

L'échantillonnage lit un sous-ensemble représentatif pour profiler les données, construire des règles ou tester une transformation plus vite et moins cher que sur le jeu complet.

| Technique | Fonctionnement | Risque ou usage |
| --- | --- | --- |
| N premières lignes (head) | Les premières lignes des fichiers | Rapide, mais biaisé quand les fichiers sont triés ou partitionnés par date |
| Aléatoire simple | Chaque ligne a la même probabilité | Représentatif pour des données uniformes |
| Systématique | Une ligne sur k | Simple ; biaisé si les données ont une période de k |
| Stratifié | Aléatoire dans chaque groupe (Région, gamme de produits), proportionnel ou avec un minimum par groupe | Garde visibles les petits groupes |
| Par grappes ou par blocs | Des blocs ou partitions entiers choisis au hasard | Le moins coûteux à lire ; les lignes d'un bloc sont corrélées |

Implémentations AWS :

| Outil | Échantillonnage |
| --- | --- |
| Projet DataBrew | Échantillon des **n premières lignes** ou de **lignes aléatoires** : 500 (par défaut, les 500 premières lignes), 1 000, 2 500 ou une taille personnalisée jusqu'à 5 000 lignes |
| Athena | `TABLESAMPLE BERNOULLI (p)` : chaque ligne avec la probabilité p, tous les blocs sont lus ; `TABLESAMPLE SYSTEM (p)` : des segments entiers gardés ou ignorés, moins coûteux mais pas indépendant |
| Spark sur Glue ou EMR | `df.sample(fraction=0.01)` aléatoire ; `df.sampleBy("region", fractions)` stratifié |
| Glue Detect Sensitive Data | Le mode « Detect fields containing PII » analyse une portion échantillonnée (pourcentage de lignes) avec un seuil de détection |

```text
SELECT region, avg(amount)
FROM sales TABLESAMPLE BERNOULLI (5)
GROUP BY region;
```

> **Piège d'examen.** Un projet DataBrew travaille sur un échantillon (5 000 lignes au plus) ; la tâche de recette applique la recette au jeu de données complet. Une règle qui semble respectée dans la session du projet peut encore échouer sur les données complètes.

<!-- section: data-skew | objectives: 3.4.5 -->
## Gérer l'asymétrie des données

L'asymétrie (skew) est une répartition inégale des données ou du travail : une tâche Spark, une tranche (slice) Redshift, une partition (shard) Kinesis ou une partition DynamoDB reçoit beaucoup plus que les autres, si bien que l'unité la plus lente impose le rythme ou subit une limitation (throttling).

**La détecter**

| Où | Signal |
| --- | --- |
| Tâche Glue (Glue 4.0 ou ultérieur, métriques d'observabilité activées) | `glue.driver.skewness.stage` (tâche la plus longue comparée à la tâche médiane d'une étape ; facteur d'asymétrie 5 par défaut) et `glue.driver.skewness.job` ; longue traîne de tâches dans l'interface Spark |
| Amazon Redshift | `skew_rows` dans `SVV_TABLE_INFO` : lignes de la tranche la plus remplie divisées par celles de la plus vide ; proche de 1.00 signifie équilibré |
| Kinesis Data Streams | Métriques améliorées au niveau des partitions : une partition avec un `IncomingBytes` et un `WriteProvisionedThroughputExceeded` élevés |
| DynamoDB | Limitation sur quelques clés ; CloudWatch Contributor Insights montre les clés les plus sollicitées |

```text
SELECT "table", diststyle, skew_rows
FROM svv_table_info
ORDER BY skew_rows DESC;
```

**La corriger**

| Situation | Mécanisme |
| --- | --- |
| Jointure Spark où quelques clés contiennent la plupart des lignes | Jointure asymétrique de l'Adaptive Query Execution (`spark.sql.adaptive.skewJoin.enabled`, activée par défaut dans les versions récentes de Spark) qui découpe les grandes partitions |
| Un côté de la jointure est petit | Jointure par diffusion (broadcast join) : pas de brassage (shuffle) du grand côté |
| Une clé chaude dans une agrégation ou une jointure | Salage (salting) : ajouter un suffixe aléatoire à la clé, agréger par clé salée, puis agréger à nouveau |
| Partitions d'entrée déséquilibrées ou petits fichiers | `repartition(n)` ou `coalesce`, regrouper les petits fichiers |
| Table Redshift avec une clé de distribution peu sélective ou asymétrique | Choisir une clé à forte cardinalité, bien répartie et utilisée dans les jointures, ou `DISTSTYLE EVEN` ou `AUTO` |
| Partition Kinesis chaude | Clé de partition à plus forte cardinalité ou aléatoire ; scinder la partition ou utiliser le mode à la demande |
| Partition DynamoDB chaude | Clé de partition à forte cardinalité ; partitionnement des écritures (write sharding) avec un suffixe calculé ou aléatoire |

```python
from pyspark.sql import functions as F

SALT = 16
clicks_salted = clicks.withColumn("salt", (F.rand() * SALT).cast("int"))
partial = clicks_salted.groupBy("page_id", "salt").agg(F.count("*").alias("n"))
result = partial.groupBy("page_id").agg(F.sum("n").alias("clicks"))
```

> **Piège d'examen.** Ajouter des workers (DPU ou nœuds EMR) ne corrige pas l'asymétrie : la tâche surchargée s'exécute toujours seule. Redistribuez plutôt les données (salage, AQE, diffusion, meilleure clé).

<!-- section: key-points -->
## Points clés

- Glue Data Quality dans la tâche ETL bloque ou isole les mauvaises lignes (résultats au niveau des lignes) ; les contrôles basés sur le Data Catalog surveillent les données au repos et recommandent des règles, mais n'identifient pas les enregistrements en échec.
- Actions d'Evaluate Data Quality : None, échec après chargement, échec sans chargement ; résultats vers CloudWatch et EventBridge.
- DQDL : `IsComplete`, `IsUnique`, `ColumnValues`, `RowCount`, `ReferentialIntegrity`, `CustomSql` ; seuils, `where`, règles dynamiques avec `last(k)` (ETL uniquement), analyseurs et détection d'anomalies.
- Les ensembles de règles DataBrew sont validés par des tâches de profil ; les résultats vont dans S3 et vers EventBridge ; les recettes nettoient les données.
- Les profils révèlent les doublons, les valeurs manquantes, les valeurs aberrantes, les graphies incohérentes et les PII.
- Échantillonnage : les N premières lignes sont biaisées sur des données triées ; le stratifié garde les petits groupes ; Athena `TABLESAMPLE BERNOULLI` ou `SYSTEM` ; DataBrew échantillonne jusqu'à 5 000 lignes.
- Asymétrie : la détecter avec `glue.driver.skewness.*`, `skew_rows`, les métriques de partition ; la corriger avec l'AQE, les jointures par diffusion, le salage, de meilleures clés. Plus de capacité n'est pas la solution.
