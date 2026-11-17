L'ingestion et la transformation par lots sont le cœur de l'examen : choisir le magasin, décider s'il faut référencer, répliquer ou copier les données, puis écrire le PySpark, le T-SQL ou le KQL qui les nettoie, les joint, les agrège et les déduplique. Les questions combinent des compétences (« l'équipe connaît T-SQL »), une contrainte (« sans copier les données », « réduire l'effort de développement ») et un problème de données (doublons, valeurs nulles, lignes qui arrivent en retard).

<!-- section: choose-store | objectives: 2.2.1 -->
## Choisir un magasin de données

| Critère | Lakehouse | Entrepôt | Eventhouse |
| --- | --- | --- | --- |
| Données | Fichiers de tout format plus tables Delta | Tables structurées, schémas en étoile | Événements, journaux, télémétrie, séries chronologiques, JSON |
| Écriture avec | Spark, Dataflow Gen2, pipelines, flux d'événements | T-SQL (`INSERT`, `UPDATE`, `DELETE`, `MERGE`, `COPY INTO`, CTAS), pipelines, Dataflow Gen2 | Flux d'événements, ingestion KQL, stratégies de mise à jour |
| Lecture avec | Spark ; T-SQL en **lecture seule** via le point de terminaison d'analytique SQL | T-SQL | KQL (et T-SQL) |
| Transactions | Par table Delta | Transactions T-SQL multitables | Ingestion optimisée pour l'ajout |
| Équipe type | Ingénieurs données, PySpark | Développeurs SQL | Analystes en temps réel |

Les trois gardent leurs données dans OneLake (l'eventhouse via la disponibilité OneLake) : un lakehouse peut donc lire une table d'entrepôt par un raccourci, et T-SQL peut joindre des éléments avec des noms en trois parties (`Warehouse.schema.table`).

| Exigence | Magasin |
| --- | --- |
| JSON bruts et images plus tables Delta organisées, équipe PySpark | Lakehouse |
| L'équipe SQL doit mettre à jour et supprimer des lignes, transactions multitables | Entrepôt |
| Des milliards de lignes de télémétrie, requêtes sur des données vieilles de quelques secondes | Eventhouse |
| Architecture en médaillon : bronze et argent dans Spark, or servi aux analystes SQL | Lakehouses pour le bronze et l'argent, entrepôt (ou lakehouse) pour l'or |

> **Piège d'examen.** Le point de terminaison d'analytique SQL d'un lakehouse est en lecture seule : vues et fonctions oui, `UPDATE` non. Si T-SQL doit modifier des lignes, la réponse est un entrepôt.

<!-- section: choose-transform | objectives: 2.2.2 -->
## Choisir entre Dataflow Gen2, les notebooks, KQL et T-SQL

| Outil | Langage | Idéal pour | Écrit dans |
| --- | --- | --- | --- |
| Dataflow Gen2 | Power Query (M), visuel | Nettoyage sans code, plus de 150 connecteurs, utilisateurs métier | Lakehouse, entrepôt, Azure SQL Database et autres |
| Notebook | PySpark, Spark SQL, Scala, R | Gros volumes, logique complexe, données semi-structurées, bibliothèques, `MERGE` Delta | Tables Delta de lakehouse (et fichiers) |
| T-SQL | SQL dans un entrepôt | Transformations ensemblistes par des développeurs SQL, procédures stockées appelées par des pipelines | Tables d'entrepôt |
| KQL | Langage de requête Kusto | Séries chronologiques, journaux, analyse à l'ingestion (stratégies de mise à jour), agrégats en quasi-temps réel | Tables d'eventhouse |

> **Conseil d'examen.** Associez l'outil au magasin et aux compétences : des données dans un entrepôt et une équipe SQL donnent des procédures stockées T-SQL ; des données dans un eventhouse donnent KQL ; des tables Delta dans un lakehouse et des compétences Python donnent un notebook ; « analystes, sans code » donne Dataflow Gen2.

<!-- section: shortcuts | objectives: 2.2.3 -->
## Créer et gérer des raccourcis OneLake

Un raccourci est un pointeur : les données restent dans la cible et sont lues sur place, sans copie ni planification.

- Créez-le dans un **lakehouse** (Tables ou Files) ou une **base de données KQL** : **Nouveau raccourci**, choisissez la source, puis le dossier ou la table.
- Cibles internes : lakehouses, entrepôts, bases de données KQL, bases de données mises en miroir et autres éléments Fabric. Cibles externes : ADLS Gen2, Stockage Blob Azure, Amazon S3 et compatible S3, Google Cloud Storage, Dataverse, et sources locales via une passerelle.
- Dans **Tables**, un raccourci doit se trouver au **niveau supérieur** et pointer vers des données **Delta** pour être reconnu comme table. Dans **Files**, n'importe quel dossier et format.
- **Authentification** : un raccourci interne utilise l'**identité de l'appelant** (qui doit avoir accès à la cible) ; un raccourci externe utilise les informations d'identification de sa **connexion cloud**.
- **Supprimer un raccourci** ne supprime jamais la cible. **Supprimer un fichier ou un dossier via le raccourci** le supprime dans la cible.
- La mise en cache des raccourcis S3, compatibles S3, Google Cloud Storage et locaux réduit les coûts de sortie : rétention de 1 à 28 jours, les fichiers de plus de 1 Go ne sont pas mis en cache.

Dans une base de données KQL, un raccourci s'interroge comme une table externe, un dossier ou une table par raccourci, et il ne peut pas être renommé :

```kusto
external_table('SalesOrders')
| where OrderDate > ago(7d)
| summarize Revenue = sum(Amount) by Region
```

| Exigence | Réponse |
| --- | --- |
| Utiliser les tables Delta du lakehouse d'un autre espace de travail, sans copie | Raccourci dans Tables |
| Analyser des fichiers Parquet d'un compartiment S3 sans les déplacer | Raccourci vers Amazon S3 (avec mise en cache pour réduire les sorties) |
| Les utilisateurs ne doivent pas lire la cible directement | Un raccourci interne vérifie l'appelant : il lui faut une autorisation sur la cible |
| Une copie qui survit à la suppression de la source | Pas un raccourci : copiez les données |

> **Piège d'examen.** Un raccourci placé dans un sous-dossier de Tables, ou pointant vers des fichiers CSV, n'apparaît pas comme une table. Placez les raccourcis CSV dans Files et chargez-les en Delta avec un notebook ou un pipeline.

<!-- section: mirroring | objectives: 2.2.4 -->
## Implémenter la mise en miroir

La mise en miroir réplique une base de données externe dans OneLake sous forme de tables Delta et la garde synchronisée, sans ETL à construire.

| Type | Ce qui se passe | Exemples |
| --- | --- | --- |
| Mise en miroir de base de données | Tables et changements répliqués, changements publiés jusqu'à toutes les 15 secondes | Azure SQL Database, Azure SQL Managed Instance, SQL Server, Azure Cosmos DB, Azure Database pour PostgreSQL, Snowflake, Oracle, Google BigQuery, SAP |
| Mise en miroir des métadonnées | Seul le catalogue est synchronisé ; les données sont lues sur place via des raccourcis | Azure Databricks Unity Catalog |
| Mise en miroir ouverte | Votre application écrit des fichiers de changements dans une zone d'atterrissage via des API publiques | Toute source |

- Créer un miroir produit un élément **base de données mise en miroir** avec un **point de terminaison d'analytique SQL** ; interrogez-le en T-SQL (noms en trois parties entre entrepôts et lakehouses), Spark, Power BI Direct Lake ou par des raccourcis.
- **Coût** : le calcul de réplication est gratuit ; le stockage est gratuit jusqu'à **1 To par unité de capacité** (64 To sur une F64). Les requêtes sont facturées normalement. Une capacité suspendue arrête la réplication (état **Paused**).
- **Monitor replication** affiche l'état de la base de données (Running, Running with warning, Stopping/Stopped, Failed, Paused) et, par table, l'état, les **lignes répliquées** (Rows replicated) et l'heure de **dernière exécution** (Last completed). La supervision de l'espace de travail ajoute des journaux dans la table `MirroredDatabaseTableExecution`.
- La base de données SQL Fabric est mise en miroir automatiquement.

| Exigence | Méthode |
| --- | --- |
| Copie en quasi-temps réel d'une base Azure SQL pour l'analytique, sans pipeline | Mise en miroir |
| Lire les tables d'Azure Databricks Unity Catalog sans copie | Mise en miroir des métadonnées (ou raccourcis) |
| Copie nocturne planifiée avec transformations | Pipeline ou travail de copie |
| Les données restent uniquement à la source | Raccourci |

> **Piège d'examen.** La mise en miroir copie les données (dans OneLake) en continu ; un raccourci ne copie rien. « Réplica à faible latence d'une base de données opérationnelle » relève de la mise en miroir ; « aucun déplacement de données » relève d'un raccourci.

<!-- section: pipeline-ingestion | objectives: 2.2.5 -->
## Ingérer des données en utilisant des pipelines

L'activité **Copy data** déplace des données depuis plus de 50 connecteurs sources vers plus de 40 destinations, à l'échelle du pétaoctet, avec des transformations légères uniquement (conversion de type, mappage de colonnes, fusion ou fractionnement de fichiers, aplatissement de hiérarchie). L'**Assistant Copie** la construit pas à pas.

- Les sources derrière un pare-feu ou locales passent par une **passerelle de données locale** ou une **passerelle de données de réseau virtuel** ; l'activité se lie à une **connexion** qui détient les informations d'identification.
- Les destinations de table de lakehouse sont écrites comme des tables Delta (ajout ou remplacement).
- Autres activités d'un pipeline d'ingestion : **Lookup** (table de contrôle ou filigrane), **Get metadata** (lister des fichiers), **ForEach**, **Delete data**, **Copy job** (exécute un travail de copie), **Dataflow Gen2**, **Notebook**, **Stored procedure**, **SQL script**, **Refresh SQL analytics endpoint** et **Lakehouse maintenance**.

Une ingestion pilotée par les métadonnées garde un seul pipeline pour de nombreuses tables :

```text
Lookup "GetTables"     : SELECT SchemaName, TableName, LoadType FROM ctl.IngestList WHERE Enabled = 1
ForEach "EachTable"    : Items = @activity('GetTables').output.value
  Copy data "CopyOne"  : source table = @{item().SchemaName}.@{item().TableName}
                         destination table = @{toLower(item().TableName)}
```

> **Conseil d'examen.** Un pipeline ingère et orchestre ; pour une copie incrémentielle avec CDC depuis un Assistant, sans logique d'orchestration, le travail de copie demande moins d'effort qu'un pipeline construit à la main.

<!-- section: transform-code | objectives: 2.2.6 -->
## Transformer des données en utilisant PySpark, SQL et KQL

PySpark dans un notebook (lakehouse) :

```text
from pyspark.sql import functions as F

orders = (spark.read.table("bronze_orders")
    .filter(F.col("Status") != "Test")
    .withColumn("OrderDate", F.to_date("OrderTs"))
    .withColumn("Amount", F.col("Amount").cast("decimal(18,2)")))

items = spark.read.json("Files/raw/items/")
flat = items.select("OrderID", F.explode("lines").alias("line")) \
            .select("OrderID", "line.sku", "line.qty")

orders.write.mode("overwrite").format("delta").saveAsTable("silver_orders")
```

T-SQL dans un entrepôt :

```text
-- Load files into a warehouse table
COPY INTO stg.Orders
FROM 'https://contosolake.blob.core.windows.net/raw/orders/*.parquet'
WITH (FILE_TYPE = 'PARQUET');

-- Create and fill a table from a query (CTAS)
CREATE TABLE dbo.FactOrders AS
SELECT o.OrderID, o.OrderDate, c.CustomerKey, o.Amount
FROM stg.Orders AS o
JOIN dbo.DimCustomer AS c ON c.CustomerID = o.CustomerID AND c.IsCurrent = 1;

-- Read a lakehouse table through its SQL analytics endpoint
INSERT INTO dbo.FactReturns (OrderID, ReturnDate, Amount)
SELECT OrderID, ReturnDate, Amount FROM SalesLakehouse.dbo.returns;
```

KQL dans un eventhouse :

```kusto
// Query-time transformation
RawLogs
| extend d = parse_json(Payload)
| project Timestamp, DeviceId = tostring(d.deviceId), Temp = todouble(d.temp)
| where isnotnull(Temp)

// Store the result of a query in another table
.set-or-append CleanLogs <|
    RawLogs
    | extend d = parse_json(Payload)
    | project Timestamp, DeviceId = tostring(d.deviceId), Temp = todouble(d.temp)
```

| Besoin | PySpark | T-SQL | KQL |
| --- | --- | --- | --- |
| Filtrer | `filter()` / `where()` | `WHERE` | `where` |
| Nouvelle colonne | `withColumn()` | expression dans `SELECT` | `extend` |
| Choisir des colonnes | `select()` | liste du `SELECT` | `project` |
| Aplatir des tableaux | `explode()` | `OPENJSON` | `mv-expand` |
| Analyser du JSON | `from_json()` | `JSON_VALUE` | `parse_json()` |

<!-- section: denormalize-aggregate | objectives: 2.2.7, 2.2.8 -->
## Dénormaliser, grouper et agréger des données

**Dénormalisez** une source en flocon en une seule table de dimension, et descendez les attributs d'en-tête dans le fait :

```text
CREATE TABLE dbo.DimProduct AS
SELECT p.ProductID, p.ProductName,
       COALESCE(s.SubcategoryName, 'Unknown') AS Subcategory,
       COALESCE(c.CategoryName, 'Unknown') AS Category
FROM stg.Product AS p
LEFT JOIN stg.Subcategory AS s ON s.SubcategoryID = p.SubcategoryID
LEFT JOIN stg.Category AS c ON c.CategoryID = s.CategoryID;
```

En PySpark, la même opération utilise `join(..., how="left")` ; une petite dimension peut être marquée avec `F.broadcast()` pour éviter une lecture aléatoire (shuffle).

**Groupez et agrégez** pour changer le grain (de la ligne de commande au jour et au magasin) :

```text
daily = (spark.read.table("silver_sales")
    .groupBy("OrderDate", "StoreID")
    .agg(F.sum("Amount").alias("Revenue"),
         F.countDistinct("CustomerID").alias("Customers"),
         F.count("*").alias("Lines")))
daily.write.mode("overwrite").saveAsTable("gold_daily_sales")
```

```kusto
Sales
| summarize Revenue = sum(Amount), Customers = dcount(CustomerId) by StoreId, Day = bin(Timestamp, 1d)
```

T-SQL utilise `GROUP BY` avec `HAVING` pour filtrer les groupes ; Dataflow Gen2 propose **Regrouper par** (De base ou Avancé).

> **Piège d'examen.** Un `INNER JOIN` lors de l'aplatissement supprime les produits sans sous-catégorie ; utilisez `LEFT JOIN` plus `COALESCE`. Les moyennes et les comptages distincts ne sont pas additifs : stockez des sommes et des comptages si un niveau supérieur doit être recalculé.

<!-- section: data-quality | objectives: 2.2.9 -->
## Gérer des données en double, manquantes ou tardives

| Problème | PySpark | T-SQL | KQL |
| --- | --- | --- | --- |
| Lignes strictement identiques | `dropDuplicates()` | `SELECT DISTINCT` | `distinct *` |
| Garder la dernière ligne par clé | `row_number()` sur une fenêtre triée par date décroissante, garder 1 | `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... DESC)` | `summarize arg_max(Timestamp, *) by Key` |
| Remplacer les valeurs nulles | `fillna()`, `coalesce()` | `COALESCE()`, `ISNULL()` | `coalesce()` |
| Écarter les lignes incomplètes | `dropna(subset=[...])` | `WHERE col IS NOT NULL` | `where isnotempty(col)` |
| Clé de fait absente de la dimension | Jointure gauche, puis clé `-1` | `COALESCE(d.Key, -1)` | `join kind=leftouter` |

```text
from pyspark.sql import Window

w = Window.partitionBy("OrderID").orderBy(F.col("ModifiedAt").desc())
latest = (spark.read.table("bronze_orders")
    .withColumn("rn", F.row_number().over(w))
    .filter("rn = 1").drop("rn"))
```

Dans un eventhouse, une vue matérialisée garde à jour les données dédupliquées ou les plus récentes à mesure que les événements arrivent :

```kusto
.create materialized-view with (backfill=true) DeviceLatest on table Telemetry
{
    Telemetry
    | summarize arg_max(Timestamp, *) by DeviceId
}
```

**Données tardives** (lignes dont la date métier précède le dernier chargement) :

- **Faits tardifs** : rechargez à chaque exécution une **fenêtre de rattrapage** glissante (par exemple les 3 derniers jours) et faites un upsert avec `MERGE` sur la clé métier, pour que relire les mêmes lignes ne crée pas de doublons. Filtrez sur l'horodatage de chargement ou de modification, pas sur la date métier.
- **Membres de dimension tardifs** : chargez le fait avec un membre déduit ou Unknown, puis mettez à jour ce membre quand ses détails arrivent.
- **Nouvelles tentatives** : rendez chaque chargement idempotent (fusion ou remplacement d'une partition), pour qu'une réexécution donne le même résultat.

> **Piège d'examen.** `dropDuplicates(["OrderID"])` garde une ligne arbitraire, pas la plus récente. « Garder la dernière version » demande `row_number()` avec un tri (ou `arg_max` en KQL). Ajouter une fenêtre de rattrapage sans fusion duplique les lignes retraitées.

<!-- section: key-points -->
## Points clés

- Lakehouse pour Spark et les fichiers, entrepôt pour les écritures T-SQL, eventhouse pour les événements et KQL.
- Dataflow Gen2 = sans code ; notebook = Spark à grande échelle ; T-SQL = entrepôt ; KQL = eventhouse.
- Raccourci = aucune copie ; les raccourcis de Tables doivent être Delta au niveau supérieur ; les raccourcis internes utilisent l'identité de l'appelant ; supprimer via un raccourci supprime dans la cible.
- Mise en miroir = réplica continu en Delta, calcul gratuit, 1 To par CU, Monitor replication pour l'état et les lignes.
- Pipelines : Copy data à grande échelle, passerelles, Lookup et ForEach pour les chargements pilotés par les métadonnées.
- Dédupliquer avec `row_number()` ou `arg_max`, remplacer les valeurs nulles avec `COALESCE` ou `fillna`, gérer les données tardives avec une fenêtre de rattrapage et `MERGE`.
