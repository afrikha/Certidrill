Avant d'écrire le moindre code d'ingestion, l'ingénieur données décide comment les données sont extraites de chaque source, quel outil les déplace, si elles se chargent par lots ou en flux, dans quel format elles arrivent et comment la table obtenue est organisée physiquement. Les questions d'examen décrivent une source (une base de données ERP, une application SaaS, des fichiers déposés dans ADLS, un Event Hub), des contraintes de fraîcheur, de coût et de maintenance, et demandent le type d'extraction, l'outil, la méthode de chargement, le format ou la colonne de partitionnement.

<!-- section: ingestion-logic | objectives: 3.1.1 -->
## Logique d'ingestion, configuration des sources et types de fichiers

Quatre types d'extraction :

| Type d'extraction | Ce qu'il lit | Prérequis | Cas typique |
| --- | --- | --- | --- |
| Complète | Tout le jeu de données à chaque exécution | Aucun | Petites tables (environ 100 000 lignes ou moins), pas de suivi des modifications à la source, reconstruction simple acceptable |
| Incrémentielle | Uniquement les lignes nouvelles ou modifiées depuis la dernière exécution | Un indicateur de modification fiable (horodatage, numéro de séquence, colonne de version) et l'état mémorisé de la dernière position | Grandes tables, fraîcheur horaire ou quotidienne |
| Streaming | Les événements en continu, à leur arrivée | La source publie vers un bus de messages ou un flux de modifications ; calcul toujours actif | Fraîcheur de quelques secondes ou minutes |
| CDC | Les insertions, mises à jour **et suppressions** au niveau des lignes, avec le type d'opération | CDC sur le journal des transactions, flux de données modifiées ou instantanés comparables ; colonne de séquencement | Les suppressions doivent se propager, piste d'audit exigée |

> **Piège d'examen.** Une extraction incrémentielle sur une colonne `last_modified` ne voit jamais les lignes supprimées à la source. Si les suppressions doivent atteindre le lakehouse, la réponse est la CDC (ou une comparaison complète périodique d'instantanés).

Configuration des sources par famille :

- **Stockage d'objets cloud** (ADLS) : gouvernez les chemins avec des **emplacements externes** Unity Catalog (une information d'identification de stockage, en général une identité managée Azure via un connecteur d'accès, plus un chemin), ou déposez les fichiers dans un **volume**. Organisez les dossiers pour le traitement incrémentiel : un dossier par source et par entité (`/landing/erp/orders/`), des dossiers de partition de style Hive (`year=2026/month=11/`), dont Spark lit les valeurs comme des colonnes sans ouvrir les fichiers.
- **Bases de données** : chemin réseau vers le serveur, informations d'identification dans des **secrets** (`dbutils.secrets.get`) ou dans une **connexion** Unity Catalog, jamais dans le notebook ; poussez les filtres vers la source pour limiter sa charge.
- **Bus de messages** : point de terminaison du broker, authentification, groupe de consommateurs, gestion des offsets.
- **API SaaS** : limites de débit, pagination, OAuth ou clés API.

Types de fichiers :

| Format | Nature | Points forts | Points faibles |
| --- | --- | --- | --- |
| CSV | Texte, orienté lignes | Universel, lisible | Pas de types, problèmes d'en-tête et de délimiteur, analyse lente, pas de gain de compression |
| JSON | Texte, semi-structuré | Données imbriquées, charges utiles d'API | Même coût d'analyse que le CSV, schéma variable d'un enregistrement à l'autre |
| XML | Texte, hiérarchique | Échanges hérités | Exige `rowTag` pour associer les éléments aux lignes |
| Parquet, ORC | Binaire en colonnes | Compression, élagage des colonnes, schéma intégré | Non lisible |
| Avro | Binaire orienté lignes avec schéma | Streaming avec évolution du schéma et registre de schémas | Moins efficace pour l'analytique |

Quand vous maîtrisez l'export, demandez aux systèmes amont un format en colonnes ; n'acceptez le CSV ou le JSON que si la source ne peut rien produire d'autre ou si les volumes sont faibles.

<!-- section: ingestion-tools | objectives: 3.1.2 -->
## Choisir un outil d'ingestion

La recommandation de Microsoft Learn : commencez par l'option **la plus managée** qui répond aux exigences, et ne passez à une option plus personnalisable que lorsqu'une exigence ne peut pas être satisfaite.

| Source et exigence | Outil |
| --- | --- |
| Application SaaS dotée d'un connecteur managé (Salesforce, ServiceNow, Workday, SharePoint, Dynamics 365...) | Connecteur SaaS Lakeflow Connect |
| SQL Server, MySQL ou PostgreSQL, capture continue des modifications y compris les suppressions | Connecteur de base de données Lakeflow Connect (CDC, avec une passerelle d'ingestion et un stockage intermédiaire) |
| Base prise en charge, CDC impossible, colonne curseur fiable | Connecteur Lakeflow Connect basé sur les requêtes (sans passerelle, plus de charge sur la source) |
| Base sans connecteur managé, logique d'extraction personnalisée | Notebook avec une lecture JDBC |
| Fichiers arrivant en continu dans le stockage cloud | Auto Loader (dans Lakeflow Spark Declarative Pipelines ou Structured Streaming) |
| Chargement de fichiers ponctuel ou planifié simple, équipe orientée SQL | `COPY INTO` |
| Flux Kafka ou Event Hubs | Connecteur standard dans un pipeline, ou Structured Streaming pour un contrôle total (le connecteur managé Kafka de Lakeflow Connect est en bêta) |
| Source locale inaccessible depuis Databricks, standard d'entreprise sur ADF, orchestration entre services Azure | Azure Data Factory (runtime d'intégration auto-hébergé) dépose les données dans ADLS, puis Databricks les transforme |

Les connecteurs managés Lakeflow Connect s'exécutent sur le calcul **serverless**, stockent les informations d'identification dans une **connexion** Unity Catalog (aucun secret dans le pipeline), écrivent dans des **tables de streaming**, ingèrent de façon incrémentielle après le premier chargement complet et réessaient automatiquement. Chaque planification crée un job Lakeflow. Pour les connecteurs de base de données, la passerelle d'ingestion s'exécute en continu dans son propre job. Le connecteur SQL Server propose aussi la **CDC intégrée** : un seul pipeline qui référence une connexion Unity Catalog et intègre l'extraction à chaque mise à jour, le volume intermédiaire (staging) étant défini par `data_staging_options`.

Les **notebooks** offrent le plus de contrôle (toute source JDBC, analyse personnalisée, logique complexe) au prix d'un code à écrire, tester et maintenir.

**Azure Data Factory** déplace les données ; gardez la logique de transformation dans Azure Databricks plutôt que dans les flux de données ADF. ADF peut aussi orchestrer des notebooks ou des jobs Databricks comme activités.

> **Piège d'examen.** « Réduire l'effort de développement et de maintenance » pour une source SaaS prise en charge désigne un connecteur managé Lakeflow Connect, pas un notebook qui appelle l'API, ni ADF.

<!-- section: loading-method | objectives: 3.1.3 -->
## Chargement par lots ou en streaming

| Méthode | Fonctionnement | À choisir quand |
| --- | --- | --- |
| Lots | Lit un jeu de données borné selon une planification (`spark.read`, CTAS, `COPY INTO`) | Fraîcheur quotidienne ou horaire, rechargements complets, petites sources |
| Lots incrémentiels | Code de streaming qui traite tout ce qui est nouveau puis s'arrête : `trigger(availableNow=True)`, ou un pipeline déclenché | Fraîcheur horaire ou quotidienne avec traitement exactement une fois, incrémentiel, sans coût de calcul permanent |
| Streaming | Requête toujours active qui traite des micro-lots à l'arrivée des données (déclencheur par défaut, environ 3 à 5 secondes de latence, ou `processingTime`), ou pipeline continu | Latence de quelques secondes à quelques minutes (fraude, alertes IoT) |

Dans Lakeflow Spark Declarative Pipelines, le même code s'exécute en mode **déclenché** (traiter les données disponibles, puis s'arrêter : planifications de type lots) ou **continu** (rester actif). Changer de mode ne change pas le code.

Une source de streaming (Auto Loader, Kafka, table Delta lue avec `readStream`) mémorise ce qu'elle a traité dans un **point de contrôle** (checkpoint), si bien que chaque enregistrement est traité une seule fois, même après un redémarrage. Un job par lots relancé doit calculer lui-même ce qui est nouveau, ou utiliser une commande idempotente comme `COPY INTO`.

> **Conseil d'examen.** « Données nécessaires chaque matin, coût minimal, nouveaux fichiers seulement » se résout par des lots incrémentiels : Auto Loader avec `availableNow` (ou un pipeline déclenché) planifié par un job. Le streaming continu respecte la latence mais paie le calcul toute la journée.

<!-- section: table-formats | objectives: 3.1.4 -->
## Choisir un format de table

Un **format de fichier** (Parquet, CSV, JSON) définit comment les octets sont stockés. Un **format de table** (Delta Lake, Apache Iceberg) ajoute une couche de métadonnées au-dessus de fichiers Parquet : transactions, application du schéma, historique.

| Exigence | Format |
| --- | --- |
| Valeur par défaut de toute table dans Azure Databricks ; ACID, voyage dans le temps, `MERGE`, flux de données modifiées, source et récepteur de streaming | Delta Lake |
| Tables lues et écrites par d'autres moteurs via un catalogue Iceberg (Spark, Flink, Trino, Snowflake) | Table Apache Iceberg managée dans Unity Catalog |
| Tables Iceberg détenues par un autre catalogue (AWS Glue, Snowflake Horizon Catalog) | Table Iceberg étrangère (lecture seule, via Lakehouse Federation) |
| Fichiers bruts d'atterrissage, échanges avec des systèmes qui ne produisent que du texte | CSV ou JSON, puis conversion en Delta |
| Fichiers analytiques hors format de table | Parquet |

Delta Lake est la valeur par défaut : `CREATE TABLE` sans `USING` crée une table Delta. Les tables **managées** Unity Catalog sont uniquement Delta ou Iceberg ; CSV, JSON, Parquet, Avro, ORC et texte ne sont pris en charge que comme tables **externes**.

```text
CREATE TABLE sales.gold.orders_ice (order_id BIGINT, amount DECIMAL(12,2))
USING ICEBERG;
```

Les tables Iceberg managées exigent Databricks Runtime 16.4 LTS ou ultérieur, le calcul serverless activé et l'optimisation prédictive activée. Les moteurs externes y accèdent par l'API Iceberg REST Catalog avec distribution d'informations d'identification (credential vending). Le clustering liquide et l'optimisation prédictive s'appliquent aux tables Delta comme aux tables Iceberg managées.

> **Piège d'examen.** Le flux de données modifiées repose sur le journal des transactions Delta : le flux de données modifiées hérité ne prend pas en charge les tables Iceberg. Une exigence de consommer en aval les modifications au niveau des lignes désigne Delta.

<!-- section: partitioning | objectives: 3.1.5 -->
## Concevoir un schéma de partitionnement

Le partitionnement découpe une table en répertoires selon les valeurs d'une colonne ; les requêtes qui filtrent sur cette colonne ne lisent que les partitions correspondantes (**élagage de partitions**). Les règles de Microsoft Learn :

| Règle | Valeur |
| --- | --- |
| Ne pas partitionner les tables de moins de | 1 To |
| Volume minimal par partition | 1 Go |
| Cardinalité de la colonne de partition | Faible (date, région, catégorie, statut), jamais un identifiant ni un horodatage à la seconde |
| Choix de la colonne de partition | La colonne sur laquelle filtrent la plupart des requêtes |
| Nombre de schémas par table | Un |

En dessous de 1 To, les tables Delta non partitionnées bénéficient déjà du **clustering au moment de l'ingestion**, et le clustering liquide est l'organisation recommandée pour les nouvelles tables. Partitionnement et clustering liquide ne peuvent pas être combinés sur une même table. À partir de Databricks Runtime 18.1, `ALTER TABLE ... REPLACE PARTITIONED BY WITH CLUSTER BY (...)` convertit sur place une table Delta partitionnée en clustering liquide ; exécutez ensuite `OPTIMIZE ... FULL`.

```text
CREATE TABLE sales.silver.transactions (
  transaction_id STRING,
  amount DECIMAL(12,2),
  transaction_ts TIMESTAMP,
  transaction_date DATE GENERATED ALWAYS AS (CAST(transaction_ts AS DATE))
)
PARTITIONED BY (transaction_date);
```

```text
(df.write.format("delta")
   .mode("append")
   .partitionBy("transaction_date")
   .saveAsTable("sales.silver.transactions"))
```

Une **colonne générée** dérive la valeur de partition d'un horodatage ; une requête qui filtre sur `transaction_ts` bénéficie quand même de l'élagage de partitions, car Delta génère le filtre de partition.

Le surpartitionnement (trop de petites partitions) produit des petits fichiers et des requêtes lentes : choisissez une granularité plus grossière (le mois plutôt que le jour). Changer de colonne de partition impose de réécrire toute la table.

> **Piège d'examen.** Partitionner une table de 200 Go par `customer_id` est doublement faux : la table fait moins de 1 To et la colonne a une cardinalité élevée. Utilisez plutôt le clustering liquide sur `customer_id`.

<!-- section: key-points -->
## Points clés

- Complète pour les petites tables, incrémentielle avec une colonne de modification, streaming pour une latence de quelques secondes, CDC quand les suppressions et les types d'opération comptent.
- Les informations d'identification vont dans des secrets ou des connexions Unity Catalog ; l'accès au stockage passe par des emplacements externes ou des volumes.
- Le plus managé d'abord : Lakeflow Connect pour les SaaS et bases prises en charge, Auto Loader pour les fichiers, `COPY INTO` pour des chargements SQL simples par lots, notebooks pour les sources non prises en charge, ADF pour l'atterrissage et l'orchestration entre services.
- `availableNow` = sémantique de streaming au coût d'un lot ; continu = latence minimale, coût permanent.
- Delta par défaut ; Iceberg managé pour l'accès multimoteur ; CSV et JSON seulement pour l'atterrissage.
- Partitionner seulement au-delà de 1 To, avec au moins 1 Go par partition, sur une colonne de filtre à faible cardinalité ; sinon clustering liquide.
