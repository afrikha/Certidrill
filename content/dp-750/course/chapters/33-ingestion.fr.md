Ce chapitre traduit la conception de l'ingestion en code : pipelines Lakeflow Connect pour les sources managées, notebooks avec des DataFrames, commandes SQL (CTAS, `CREATE OR REPLACE TABLE`, `COPY INTO`), flux CDC appliqués avec AUTO CDC, Spark Structured Streaming, Azure Event Hubs par son point de terminaison Kafka, et Lakeflow Spark Declarative Pipelines avec Auto Loader. Les questions d'examen montrent un notebook, une instruction SQL ou un fichier de bundle incomplet et demandent l'option manquante, ou décrivent une exigence et demandent quelle commande convient.

<!-- section: lakeflow-connect | objectives: 3.2.1 -->
## Ingérer avec Lakeflow Connect

Un pipeline d'ingestion Lakeflow Connect comporte trois parties :

| Composant | Rôle |
| --- | --- |
| Connexion | Élément sécurisable Unity Catalog qui contient le point de terminaison et les informations d'identification ; créée une fois, réutilisée par les pipelines (`CREATE CONNECTION` sur le metastore pour en créer une, `USE CONNECTION` pour l'utiliser) |
| Définition d'ingestion | Objets sources (tables, rapports) et leurs catalogue et schéma de destination |
| Planification | Fréquence d'exécution du pipeline ; chaque planification crée un job Lakeflow |

Pour les **connecteurs de base de données** (SQL Server, MySQL, PostgreSQL), créer le pipeline crée aussi une **passerelle d'ingestion** qui extrait les modifications en continu et les écrit dans un stockage intermédiaire ; le pipeline d'ingestion les applique ensuite selon sa planification. Les **connecteurs SaaS** (Salesforce, Workday, ServiceNow...) et les **connecteurs basés sur les requêtes** interrogent directement la source, sans passerelle. Les pipelines s'exécutent sur le calcul serverless et écrivent des **tables de streaming**.

Dans l'interface : **Data Ingestion**, choisissez la source, créez ou sélectionnez la connexion (et, pour une base de données, la passerelle), choisissez les objets, puis le catalogue et le schéma de destination. Les pipelines peuvent aussi être définis dans des Databricks Asset Bundles (désormais nommés Declarative Automation Bundles sur Learn), des notebooks ou la CLI :

```yaml
resources:
  pipelines:
    orders_ingest:
      name: erp-orders-ingest
      catalog: sales
      schema: bronze
      ingestion_definition:
        ingestion_gateway_id: ${resources.pipelines.erp_gateway.id}
        objects:
          - table:
              source_schema: dbo
              source_table: orders
              destination_catalog: sales
              destination_schema: bronze
              table_configuration:
                scd_type: SCD_TYPE_2
                include_columns:
                  - order_id
                  - customer_id
                  - total_amount
```

| Comportement | Détail |
| --- | --- |
| Première exécution | Instantané complet des objets sélectionnés, puis suivi des modifications |
| Exécutions suivantes | Incrémentielles : seulement les lignes modifiées (CDC ou suivi des modifications pour SQL Server, colonne curseur pour les connecteurs basés sur les requêtes et certains connecteurs SaaS) |
| `scd_type` | `SCD_TYPE_1` (écrasement, état courant) ou `SCD_TYPE_2` (historique avec `__START_AT` et `__END_AT`) |
| `include_columns` / `exclude_columns` | Avec `include_columns`, les nouvelles colonnes de la source n'apparaissent pas ; avec `exclude_columns`, elles apparaissent |
| Actualisation complète | Recharge une table de zéro (après une modification de schéma irrécupérable) ; pour les connecteurs de base de données, les données existantes restent interrogeables jusqu'à la fin du nouvel instantané, une fenêtre d'actualisation complète (`start_hour`, `days_of_week`, `time_zone_id`) peut la cantonner aux heures creuses, et une stratégie d'actualisation complète automatique (désactivée par défaut ; `min_interval_hours` à 24 par défaut) la déclenche après une troncature, une modification de schéma incompatible, le renommage d'une colonne ou l'ajout d'une colonne avec une valeur par défaut |
| Échecs | Nouvelles tentatives automatiques avec interruption exponentielle ; reprise au dernier curseur |

Lots ou streaming : chaque exécution planifiée du pipeline d'ingestion charge les modifications depuis l'exécution précédente (lots incrémentiels). Pour les bases de données, la passerelle capture les modifications en continu, si bien qu'une planification fréquente donne des tables en quasi temps réel. Les connecteurs de streaming (bus de messages comme RabbitMQ) ingèrent des flux d'événements dans des tables de streaming.

> **Piège d'examen.** Un connecteur de base de données exige la passerelle et le stockage intermédiaire ; un connecteur SaaS non. « Le pipeline ne capture aucune modification de SQL Server » peut signifier que la passerelle ne tourne pas, ou que la CDC ou le suivi des modifications n'est pas activé à la source.

<!-- section: notebooks | objectives: 3.2.2 -->
## Ingérer avec des notebooks, par lots et en flux

L'ingestion par lots lit un jeu de données borné avec `spark.read` et écrit une table Unity Catalog :

```text
df = (spark.read.format("csv")
        .option("header", "true")
        .option("inferSchema", "true")
        .load("/Volumes/sales/landing/raw/orders/"))

df.write.mode("append").saveAsTable("sales.bronze.orders")

jdbc_df = (spark.read.format("jdbc")
        .option("url", "jdbc:sqlserver://erp.contoso.com:1433;database=erp")
        .option("dbtable", "(SELECT * FROM dbo.customers WHERE active = 1) AS c")
        .option("user", dbutils.secrets.get(scope="erp", key="user"))
        .option("password", dbutils.secrets.get(scope="erp", key="password"))
        .load())
```

| Mode d'écriture | Effet |
| --- | --- |
| `error` (par défaut) | Échoue si la table existe |
| `append` | Ajoute des lignes |
| `overwrite` | Remplace le contenu |
| `ignore` | Ne fait rien si la table existe |

Le XML exige `option("rowTag", ...)` ; une sous-requête dans `dbtable` pousse le filtre vers la base de données ; les informations d'identification viennent d'une étendue de secrets.

L'ingestion en flux utilise `spark.readStream` et `writeStream` avec un point de contrôle :

```text
schema = "order_id BIGINT, customer_id STRING, amount DOUBLE, order_ts TIMESTAMP"

(spark.readStream.format("json")
   .schema(schema)
   .load("/Volumes/sales/landing/raw/orders_stream/")
   .writeStream
   .option("checkpointLocation", "/Volumes/sales/landing/chk/orders")
   .trigger(availableNow=True)
   .toTable("sales.bronze.orders"))
```

> **Piège d'examen.** Une source de streaming de fichiers simple (`format("json")` avec `readStream`) exige un schéma explicite : l'inférence de schéma n'est pas prise en charge. Auto Loader (`format("cloudFiles")`) infère et stocke lui-même le schéma.

<!-- section: sql-methods | objectives: 3.2.3 -->
## Ingérer en SQL : CTAS, CREATE OR REPLACE TABLE, COPY INTO

```text
CREATE TABLE sales.bronze.products AS
SELECT * FROM read_files('/Volumes/sales/landing/raw/products/', format => 'csv', header => true);

CREATE OR REPLACE TABLE sales.silver.daily_revenue AS
SELECT order_date, SUM(amount) AS revenue FROM sales.silver.orders GROUP BY order_date;

CREATE TABLE IF NOT EXISTS sales.bronze.events (event_id STRING, event_ts TIMESTAMP, payload STRING);

COPY INTO sales.bronze.events
FROM '/Volumes/sales/landing/raw/events/'
FILEFORMAT = JSON
PATTERN = 'events_2026*.json'
FORMAT_OPTIONS ('multiLine' = 'true')
COPY_OPTIONS ('mergeSchema' = 'true');
```

| Méthode | Comportement | À utiliser pour |
| --- | --- | --- |
| CTAS | Crée la table à partir d'une requête, schéma issu du résultat ; échoue si la table existe | Chargements initiaux, migrations ponctuelles |
| `CREATE OR REPLACE TABLE ... AS` | Remplace le contenu et le schéma ; conserve l'historique de la table, les autorisations, les filtres de lignes et les masques de colonne | Actualisation complète périodique d'une table interrogée par les utilisateurs |
| `COPY INTO` | Ajoute des fichiers à une table **existante** ; idempotent (les fichiers déjà chargés sont ignorés à la réexécution) | Chargements répétés de nouveaux fichiers, quelques milliers de fichiers |
| Table de streaming avec `read_files` | Auto Loader en SQL | Millions de fichiers, évolution du schéma, recommandé pour l'ingestion SQL incrémentielle |

Options de `COPY INTO` : `FILEFORMAT` (`CSV`, `JSON`, `PARQUET`, `AVRO`, `ORC`, `TEXT`, `BINARYFILE`), `FORMAT_OPTIONS` (par exemple `'header' = 'true'`, `'inferSchema' = 'true'`), `COPY_OPTIONS ('mergeSchema' = 'true')` pour ajouter les nouvelles colonnes, `PATTERN` ou `FILES = (...)` pour sélectionner les fichiers, `VALIDATE ALL` pour vérifier l'analyse et les contraintes sans charger.

> **Piège d'examen.** `DROP TABLE` suivi de `CREATE TABLE ... AS` perd l'historique et les autorisations ; `CREATE OR REPLACE TABLE` les conserve, si bien que les consommateurs gardent leur accès.

<!-- section: cdc-feed | objectives: 3.2.4 -->
## Ingérer un flux de capture des changements de données

Un enregistrement CDC porte les colonnes de données, une **opération** (insertion, mise à jour, suppression) et une **séquence** (horodatage ou numéro) qui ordonne les modifications. AUTO CDC applique un tel flux à une table de streaming, déduplique, ignore les enregistrements tardifs plus anciens que ce qui est déjà appliqué, et gère les suppressions :

```text
from pyspark import pipelines as dp
from pyspark.sql.functions import col, expr

@dp.temporary_view
def customer_changes():
    return spark.readStream.table("sales.bronze.customer_cdc")

dp.create_streaming_table("customers")

dp.create_auto_cdc_flow(
    target="customers",
    source="customer_changes",
    keys=["customer_id"],
    sequence_by=col("change_seq"),
    apply_as_deletes=expr("operation = 'DELETE'"),
    except_column_list=["operation", "change_seq"],
    stored_as_scd_type=1
)
```

| Paramètre (Python / SQL) | Rôle |
| --- | --- |
| `keys` / `KEYS` | Colonnes qui identifient une ligne |
| `sequence_by` / `SEQUENCE BY` | Colonne d'ordonnancement ; doit être triable et non nulle |
| `apply_as_deletes` / `APPLY AS DELETE WHEN` | Condition qui désigne une suppression |
| `except_column_list` / `COLUMNS * EXCEPT` | Colonnes non écrites dans la cible |
| `stored_as_scd_type` / `STORED AS SCD TYPE` | 1 = état courant, 2 = historique |
| `ignore_null_updates` / `IGNORE NULL UPDATES` | Mises à jour partielles : les valeurs nulles conservent la valeur existante de la colonne |

Quand la source fournit des **instantanés complets** au lieu d'enregistrements de modifications, utilisez AUTO CDC FROM SNAPSHOT (`create_auto_cdc_from_snapshot_flow`), qui déduit les modifications en comparant les instantanés successifs.

Quand la source est une table Delta, activez son flux de données modifiées (`delta.enableChangeDataFeed = true`) et lisez les modifications avec `readChangeFeed` ; la première lecture en streaming renvoie l'instantané courant sous forme d'insertions, puis les modifications :

```text
changes = (spark.readStream
    .option("readChangeFeed", "true")
    .table("sales.silver.orders"))
```

Sans pipeline, le même flux s'applique avec `MERGE INTO` dans une fonction `foreachBatch`, mais vous devez dédupliquer et ordonner vous-même les modifications.

> **Piège d'examen.** Ordonner selon l'heure d'arrivée est faux : avec des événements désordonnés, seul `SEQUENCE BY` sur la colonne de séquence de la source garantit l'état final correct.

<!-- section: structured-streaming | objectives: 3.2.5 -->
## Ingérer avec Spark Structured Streaming

Un flux est une table non bornée : `spark.readStream` définit la source, les transformations sont l'API DataFrame habituelle, `writeStream` écrit vers un récepteur avec un point de contrôle.

| Déclencheur | Comportement |
| --- | --- |
| Aucun (par défaut) | Micro-lot suivant dès que le précédent se termine |
| `processingTime="1 minute"` | Micro-lot à intervalle fixe |
| `availableNow=True` | Traite tout ce qui est disponible en plusieurs lots, puis s'arrête |
| `once=True` | Un micro-lot, puis arrêt (déprécié : utilisez `availableNow`) |

| Mode de sortie | Écrit |
| --- | --- |
| `append` | Seulement les nouvelles lignes ; par défaut pour l'ingestion |
| `update` | Les lignes modifiées (agrégations) |
| `complete` | Tout le résultat à chaque fois (agrégations) |

```text
raw = (spark.readStream.format("kafka")
         .option("kafka.bootstrap.servers", "broker1.contoso.com:9092")
         .option("subscribe", "telemetry")
         .option("startingOffsets", "earliest")
         .load())

query = (raw.selectExpr("CAST(key AS STRING) AS device", "CAST(value AS STRING) AS body", "timestamp")
           .writeStream
           .option("checkpointLocation", "/Volumes/iot/raw/chk/telemetry")
           .trigger(processingTime="30 seconds")
           .toTable("iot.bronze.telemetry"))
```

La source Kafka renvoie `key`, `value` (binaires), `topic`, `partition`, `offset` et `timestamp`. `startingOffsets` (`earliest` ou `latest`) ne s'applique qu'à la première exécution : ensuite, le point de contrôle décide où le flux reprend. Surveillez les requêtes dans l'onglet **Structured Streaming** de l'interface Spark, ou avec `query.status` et `query.recentProgress`.

> **Piège d'examen.** Chaque requête de streaming a besoin de son propre emplacement de point de contrôle. Deux requêtes qui partagent un point de contrôle, ou un point de contrôle supprimé par une stratégie de cycle de vie du stockage, corrompent l'état du flux.

<!-- section: event-hubs | objectives: 3.2.6 -->
## Ingérer des données de streaming à partir d'Azure Event Hubs

Event Hubs expose un point de terminaison Apache Kafka dans les niveaux **Standard, Premium et Dedicated** (pas Basic), si bien que le connecteur Kafka intégré à Databricks Runtime le lit :

| Kafka | Event Hubs |
| --- | --- |
| Cluster | Espace de noms |
| Rubrique (topic) | Event Hub |
| Groupe de consommateurs | Groupe de consommateurs |
| Partition, offset | Partition, offset |

```text
from pyspark.sql.functions import col, from_json

conn = dbutils.secrets.get(scope="eventhubs", key="orders-connection-string")

events = (spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "contoso-ns.servicebus.windows.net:9093")
    .option("subscribe", "orders")
    .option("kafka.security.protocol", "SASL_SSL")
    .option("kafka.sasl.mechanism", "PLAIN")
    .option("kafka.sasl.jaas.config",
            'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required '
            f'username="$ConnectionString" password="{conn}";')
    .load())

orders = (events.select(from_json(col("value").cast("string"),
                                  "order_id BIGINT, amount DOUBLE, ts TIMESTAMP").alias("o"))
                .select("o.*"))
```

| Paramètre | Valeur |
| --- | --- |
| Serveur d'amorçage | `<namespace>.servicebus.windows.net:9093` |
| `kafka.security.protocol` | `SASL_SSL` |
| `kafka.sasl.mechanism` | `PLAIN` avec une chaîne de connexion (nom d'utilisateur `$ConnectionString`), ou `OAUTHBEARER` avec Microsoft Entra ID |
| `subscribe` | Le nom de l'Event Hub |
| Préfixe de la classe JAAS sur Databricks | `kafkashaded.` |

Stockez la chaîne de connexion dans une étendue de secrets. Event Hubs recommande Microsoft Entra ID (OAuth) plutôt que les clés d'accès partagé, car il permet le RBAC Azure. À partir de Databricks Runtime 16.1, Databricks recommande des **informations d'identification de service** Unity Catalog quand le streaming Kafka s'exécute en mode d'accès standard ou sur un calcul serverless : définissez `databricks.serviceCredential` sur leur nom et ne définissez ni `kafka.security.protocol` ni les options `kafka.sasl.*` ; le connecteur d'accès associé doit disposer d'autorisations sur Event Hubs. Microsoft Entra ID avec un ID client et un secret (`OAUTHBEARER`) n'est pas pris en charge dans les pipelines Lakeflow configurés avec Unity Catalog. Dans un pipeline Lakeflow, les options Kafka se placent dans une fonction `@dp.table`, et les valeurs non secrètes comme l'espace de noms sont passées en paramètres du pipeline.

> **Piège d'examen.** Port 9093, pas 9092 : le point de terminaison Kafka d'Event Hubs n'accepte que `SASL_SSL` sur le port 9093. Un espace de noms du niveau Basic n'a pas du tout de point de terminaison Kafka.

<!-- section: declarative-pipelines | objectives: 3.2.7 -->
## Ingérer avec Lakeflow Spark Declarative Pipelines et Auto Loader

Une **table de streaming** traite chaque ligne source exactement une fois : la bonne cible pour une ingestion en ajout seul. `STREAM read_files(...)` en SQL, ou `format("cloudFiles")` en Python, c'est **Auto Loader** ; dans un pipeline, les points de contrôle et les emplacements de schéma sont gérés pour vous.

```text
CREATE OR REFRESH STREAMING TABLE orders_bronze
AS SELECT *, _metadata.file_path AS source_file
FROM STREAM read_files(
  '/Volumes/sales/landing/raw/orders/',
  format => 'json',
  schemaHints => 'order_id BIGINT, amount DECIMAL(10,2)'
);
```

```text
from pyspark import pipelines as dp

@dp.table(comment="Raw orders loaded by Auto Loader")
def orders_bronze():
    return (spark.readStream.format("cloudFiles")
              .option("cloudFiles.format", "json")
              .option("cloudFiles.inferColumnTypes", "true")
              .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
              .load("/Volumes/sales/landing/raw/orders/"))
```

Hors pipeline, Auto Loader exige aussi `cloudFiles.schemaLocation` (où le schéma inféré est suivi) et un `checkpointLocation`.

| Option | Rôle |
| --- | --- |
| `cloudFiles.format` | `json`, `csv`, `parquet`, `avro`, `orc`, `xml`, `text`, `binaryFile` |
| `cloudFiles.schemaLocation` | Stocke le schéma inféré et son évolution |
| `cloudFiles.inferColumnTypes` | Inférer les vrais types ; par défaut, les colonnes JSON et CSV sont inférées comme chaînes |
| `cloudFiles.schemaHints` | Imposer le type de colonnes connues |
| `cloudFiles.schemaEvolutionMode` | Ce qui se passe quand de nouvelles colonnes apparaissent (tableau suivant) |
| `cloudFiles.maxFilesPerTrigger`, `cloudFiles.maxBytesPerTrigger` | Limiter la taille de chaque micro-lot |

| Mode d'évolution du schéma | Comportement |
| --- | --- |
| `addNewColumns` (par défaut sans schéma) | Le flux échoue, les nouvelles colonnes sont ajoutées au schéma, et l'exécution suivante continue avec elles |
| `rescue` | Le schéma ne change jamais, le flux n'échoue pas ; les données inattendues vont dans `_rescued_data` |
| `failOnNewColumns` | Le flux échoue jusqu'à la mise à jour du schéma ou le retrait du fichier |
| `none` (par défaut avec un schéma) | Nouvelles colonnes ignorées |

`addNewColumns` ne peut pas être combiné avec un schéma fourni (`.schema(...)`) ; donnez plutôt les types connus en indications de schéma (schema hints), qu'Auto Loader n'applique que si aucun schéma n'est fourni.

Découverte des fichiers : **liste de répertoires** (par défaut, sans configuration) ou **notification de fichiers** ; Databricks recommande la notification de fichiers avec les **événements de fichiers** (file events) activés sur l'emplacement externe Unity Catalog en production, pour réduire la latence et le coût des listes. `cloud_files_state('<checkpoint>')` affiche les fichiers découverts.

Plusieurs sources peuvent alimenter une même table de streaming par des **flux** (flows : `CREATE FLOW ... AS INSERT INTO ... BY NAME`, ou `@dp.append_flow(target=...)` en Python). Kafka et Event Hubs se lisent avec `read_kafka(...)` en SQL ou les options Kafka en Python.

> **Piège d'examen.** Le nom d'un flux identifie son point de contrôle : renommer un flux le fait repartir du début de la source, comme un nouveau flux.

<!-- section: key-points -->
## Points clés

- Lakeflow Connect = connexion + définition d'ingestion + planification ; les connecteurs de base de données ajoutent une passerelle ; la sortie est faite de tables de streaming sur le serverless.
- Notebooks : `spark.read` plus un mode d'écriture pour les lots ; `readStream`, un point de contrôle et un déclencheur pour le streaming ; informations d'identification issues des secrets.
- CTAS crée, `CREATE OR REPLACE` remplace mais conserve autorisations et historique, `COPY INTO` ajoute de façon idempotente les nouveaux fichiers à une table existante.
- AUTO CDC exige des clés, `SEQUENCE BY` et une condition de suppression ; SCD de type 1 ou 2 ; les instantanés utilisent AUTO CDC FROM SNAPSHOT.
- Structured Streaming : un point de contrôle par requête, `availableNow` pour les exécutions incrémentielles planifiées, `append` pour l'ingestion.
- Event Hubs : point de terminaison Kafka sur le port 9093, `SASL_SSL`, `$ConnectionString`, niveau Standard ou supérieur ; des informations d'identification de service Unity Catalog (`databricks.serviceCredential`, DBR 16.1+) en mode d'accès standard ou sur serverless.
- Auto Loader : `cloudFiles` ou `STREAM read_files`, emplacement de schéma, `addNewColumns` par défaut, `_rescued_data` en mode rescue, événements de fichiers en production.
