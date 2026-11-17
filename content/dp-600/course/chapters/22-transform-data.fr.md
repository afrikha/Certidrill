Transformer les données, c'est passer de tables brutes à des schémas en étoile propres et typés, consommés par les modèles sémantiques. L'examen montre du T-SQL dans un entrepôt, du PySpark ou du Spark SQL dans un notebook et du Power Query dans Dataflow Gen2, puis demande quelle instruction, quelle étape ou quel moteur répond à une exigence comme « sans code » ou « accès en lecture seule ».

<!-- section: views-functions-procedures | objectives: 2.2.1 -->
## Vues, fonctions et procédures stockées

Choisissez d'abord le moteur :

| Exigence | Outil |
| --- | --- |
| Transformation sans code ou avec peu de code par un analyste | Dataflow Gen2 (Power Query) |
| Développeurs SQL, transactions sur plusieurs tables, données écrites dans un entrepôt | T-SQL dans un entrepôt |
| Logique complexe ou à grande échelle sur les tables Delta d'un lakehouse, compétences Python | Notebook (PySpark ou Spark SQL) |
| Tables bronze-argent-or déclaratives, actualisées par Fabric dans un lakehouse | Vues matérialisées de lakehouse (materialized lake views) |

Où créer les objets T-SQL :

| Objet | Entrepôt | Point de terminaison d'analytique SQL d'un lakehouse |
| --- | --- | --- |
| Tables, `INSERT`, `UPDATE`, `DELETE`, `MERGE` | Oui | Non : les tables sont en lecture seule, elles viennent des tables Delta du lakehouse |
| Vues, fonctions, procédures stockées | Oui | Oui, au-dessus des tables du lakehouse |
| Vues matérialisées, déclencheurs, synonymes | Non | Non |

```text
-- View: a reusable query, always current, no stored data
CREATE VIEW dbo.vSalesByRegion
AS
SELECT r.RegionName, SUM(s.SalesAmount) AS TotalSales
FROM dbo.FactSales AS s
JOIN dbo.DimRegion AS r ON r.RegionKey = s.RegionKey
GROUP BY r.RegionName;
GO

-- Inline table-valued function: a view with parameters, usable in FROM and JOIN
CREATE FUNCTION dbo.fnSalesSince (@FromDate date)
RETURNS TABLE
AS
RETURN
    SELECT OrderID, OrderDate, SalesAmount
    FROM dbo.FactSales
    WHERE OrderDate >= @FromDate;
GO

-- Stored procedure: parameters, several statements, DML
CREATE PROCEDURE dbo.usp_LoadFactSales @LoadDate date
AS
BEGIN
    DELETE FROM dbo.FactSales WHERE OrderDate = @LoadDate;
    INSERT INTO dbo.FactSales (OrderID, OrderDate, CustomerKey, SalesAmount)
    SELECT OrderID, OrderDate, CustomerKey, Amount
    FROM stg.Orders
    WHERE OrderDate = @LoadDate;
END;
GO

EXEC dbo.usp_LoadFactSales @LoadDate = '2026-11-01';
SELECT * FROM dbo.fnSalesSince('2026-10-01');
```

| Exigence | Objet |
| --- | --- |
| Masquer jointures et colonnes derrière un nom stable, sans paramètre | Vue |
| Idem, mais filtré par une valeur passée par l'appelant, puis joint à d'autres tables | Fonction table inline |
| Recharger une table en plusieurs étapes, appelé par un pipeline | Procédure stockée |
| Stocker un résultat précalculé dans un entrepôt | `CREATE TABLE AS SELECT` (CTAS), actualisé par une procédure |
| Stocker un résultat précalculé dans un lakehouse, dépendances et actualisation gérées par Fabric | Vue matérialisée de lakehouse |

Une vue matérialisée de lakehouse est du Spark SQL dont le résultat est persisté dans une table Delta, avec des contraintes de qualité des données facultatives :

```text
CREATE MATERIALIZED LAKE VIEW silver.orders_clean
(
    CONSTRAINT valid_amount CHECK (amount > 0) ON MISMATCH DROP
)
AS SELECT order_id, region, CAST(amount AS DECIMAL(18,2)) AS amount
FROM bronze.orders;
```

`ON MISMATCH DROP` supprime les lignes en échec ; `FAIL` arrête l'actualisation. Fabric choisit une actualisation incrémentielle, complète ou ignorée ; l'actualisation incrémentielle exige le flux de données modifiées (change data feed) Delta sur les sources.

> **Piège d'examen.** Le point de terminaison d'analytique SQL accepte `CREATE VIEW`, `CREATE FUNCTION` et `CREATE PROCEDURE`, mais aucune instruction qui écrit dans une table du lakehouse. Pour écrire, utilisez Spark, un flux de données, un pipeline ou un entrepôt.

Après une modification des tables sous-jacentes, exécutez `sp_refreshview` pour mettre à jour les métadonnées d'une vue ; `WITH SCHEMABINDING` bloque les modifications qui casseraient la vue. Un modèle Direct Lake sur SQL qui lit une vue bascule en DirectQuery.

<!-- section: enrich-data | objectives: 2.2.2 -->
## Enrichir les données avec de nouvelles colonnes et tables

Règles de l'entrepôt : `ALTER TABLE` permet seulement d'ajouter (`ADD`) des colonnes **acceptant les valeurs Null**, de supprimer une colonne (`DROP COLUMN`) et d'ajouter ou supprimer des contraintes `NOT ENFORCED` (`ALTER COLUMN` est en préversion) ; les colonnes calculées ne sont pas prises en charge ; une colonne se renomme avec `sp_rename`. CTAS crée et remplit une nouvelle table dont les types de colonnes viennent de la requête.

```text
ALTER TABLE dbo.DimCustomer ADD Segment varchar(20) NULL;
UPDATE dbo.DimCustomer
SET Segment = CASE WHEN AnnualRevenue >= 1000000 THEN 'Enterprise' ELSE 'SMB' END;

CREATE TABLE dbo.FactSalesEnriched
AS
SELECT s.*, s.Quantity * s.UnitPrice AS GrossAmount, YEAR(s.OrderDate) AS OrderYear
FROM dbo.FactSales AS s;
```

Dans un notebook, `withColumn` ajoute ou remplace une colonne :

```text
from pyspark.sql import functions as F

orders = spark.read.table("silver_orders")
enriched = (orders
    .withColumn("OrderYear", F.year("OrderDate"))
    .withColumn("SizeBand", F.when(F.col("Quantity") >= 100, "Bulk").otherwise("Standard"))
    .withColumn("NetAmount", F.col("Amount") - F.col("Discount")))
enriched.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable("gold_orders")
```

Dans Dataflow Gen2, l'onglet **Ajouter une colonne** propose Colonne personnalisée (formule M), Colonne conditionnelle (règles si-alors, sans code), Colonne à partir d'exemples et Colonne d'index.

| Exigence | Réponse |
| --- | --- |
| Nouvel attribut sur une table existante de l'entrepôt | `ALTER TABLE ... ADD` d'une colonne acceptant Null, puis `UPDATE` ; ou CTAS vers une nouvelle table |
| Valeur dérivée toujours à jour, rien de stocké | Expression dans une vue (pas de colonnes calculées) |
| Utilisateur métier, tranche définie par des règles, sans code | Colonne conditionnelle de Dataflow Gen2 |
| Attribut provenant d'une autre table | Jointure ou fusion |

> **Conseil d'examen.** Transformez le plus en amont possible : une colonne ajoutée dans l'entrepôt ou le lakehouse est partagée par tous les modèles et rapports, se compresse mieux qu'une colonne calculée du modèle et fonctionne avec Direct Lake.

<!-- section: star-schema | objectives: 2.2.3 -->
## Implémenter un schéma en étoile dans un lakehouse ou un entrepôt

Une **table de faits** contient des événements mesurables à un grain déclaré (une ligne par ligne de commande) et des clés étrangères ; une **table de dimension** contient des attributs descriptifs et une clé par membre. Learn recommande les préfixes `dim` et `fact` (`DimCity`, `FactOrder`) et des tables d'intégration (staging) où les données sont chargées et transformées avant les tables de production.

Dans un entrepôt, les clés de substitution utilisent `IDENTITY` :

```text
CREATE TABLE dbo.DimCustomer
(
    CustomerKey   bigint IDENTITY,       -- bigint only, no seed or increment
    CustomerID    varchar(20) NOT NULL,  -- business key from the source
    CustomerName  varchar(100) NOT NULL,
    City          varchar(50) NULL,
    ValidFrom     date NOT NULL,
    ValidTo       date NULL,
    IsCurrent     bit NOT NULL
);
ALTER TABLE dbo.DimCustomer
    ADD CONSTRAINT PK_DimCustomer PRIMARY KEY NONCLUSTERED (CustomerKey) NOT ENFORCED;

-- Unknown member with an explicit key
SET IDENTITY_INSERT dbo.DimCustomer ON;
INSERT INTO dbo.DimCustomer (CustomerKey, CustomerID, CustomerName, ValidFrom, IsCurrent)
VALUES (-1, 'N/A', 'Unknown', '1900-01-01', 1);
SET IDENTITY_INSERT dbo.DimCustomer OFF;
DBCC CHECKIDENT ('dbo.DimCustomer', RESEED);
```

| Caractéristique d'`IDENTITY` dans un entrepôt | Valeur |
| --- | --- |
| Type de données | `bigint` uniquement |
| Valeur de départ et incrément | Non configurables |
| Valeurs | Uniques mais pas séquentielles : trous et plages non ordonnées sont normaux |
| Ajout à une table existante | Pas avec `ALTER TABLE` : copiez la table avec CTAS ou `SELECT ... INTO` |
| Valeurs explicites | `SET IDENTITY_INSERT ... ON` (liste de colonnes obligatoire, une table par session), puis `DBCC CHECKIDENT ... RESEED` |

`PRIMARY KEY` et `UNIQUE` exigent `NONCLUSTERED` et `NOT ENFORCED` ; `FOREIGN KEY` exige `NOT ENFORCED`. Elles ne sont pas vérifiées : le chargement doit garantir l'unicité. Dans un lakehouse, Spark n'a pas l'`IDENTITY` de l'entrepôt : générez les clés avec `row_number()` sur une fenêtre, plus la clé maximale actuelle.

Dimensions à variation lente :

| Type | Comportement | Implémentation |
| --- | --- | --- |
| Type 1 | Écrasement, pas d'historique | `MERGE ... WHEN MATCHED THEN UPDATE` |
| Type 2 | Nouvelle ligne à chaque changement ; `ValidFrom`, `ValidTo`, `IsCurrent` ; nouvelle clé de substitution | Expirer la ligne courante, insérer la nouvelle version |
| Type 3 | Valeur précédente dans une colonne supplémentaire | `UPDATE` des deux colonnes |

```text
MERGE dbo.DimProduct AS tgt
USING stg.Product AS src
    ON tgt.ProductID = src.ProductID
WHEN MATCHED AND tgt.ListPrice <> src.ListPrice THEN
    UPDATE SET tgt.ListPrice = src.ListPrice
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ProductID, ProductName, ListPrice)
    VALUES (src.ProductID, src.ProductName, src.ListPrice);
```

`MERGE` est en disponibilité générale dans Fabric Data Warehouse. Les faits stockent la clé de **substitution** de la dimension, recherchée au chargement : avec le type 2, chaque vente est rattachée à la version valide à sa date.

> **Piège d'examen.** Les contraintes `NOT ENFORCED` ne rejettent pas les doublons. Une clé en double dans une dimension casse le côté « un » de la relation dans le modèle sémantique (les requêtes Direct Lake échouent sur les doublons).

<!-- section: denormalize | objectives: 2.2.4 -->
## Dénormaliser les données

Un schéma en étoile garde une table par dimension : les tables en flocon (Product, Subcategory, Category) sont aplaties dans `DimProduct`, et les attributs d'en-tête (date de commande, client) descendent dans le fait au niveau de la ligne de commande.

```text
CREATE TABLE dbo.DimProduct
AS
SELECT p.ProductID, p.ProductName, p.ListPrice,
       COALESCE(sc.SubcategoryName, 'None') AS Subcategory,
       COALESCE(c.CategoryName, 'None') AS Category
FROM stg.Product AS p
LEFT JOIN stg.Subcategory AS sc ON sc.SubcategoryID = p.SubcategoryID
LEFT JOIN stg.Category AS c ON c.CategoryID = sc.CategoryID;
```

| Normalisé (flocon) | Dénormalisé (étoile) |
| --- | --- |
| Moins de redondance, tables sources plus petites | Valeurs d'attributs répétées, bien compressées par le stockage en colonnes |
| Plus de jointures et de relations dans chaque requête | Une jointure par dimension, modèles plus simples et plus rapides |
| Hiérarchie répartie sur plusieurs tables | Hiérarchie (Category, Subcategory, Product) dans une seule table |

> **Piège d'examen.** Utilisez `LEFT JOIN` pour aplatir : un `INNER JOIN` supprime sans prévenir les produits sans sous-catégorie.

<!-- section: aggregate-data | objectives: 2.2.5 -->
## Agréger des données

Les tables d'agrégats changent le grain (de la ligne de commande au jour et au magasin) pour une couche or, un modèle Import plus petit ou un rapport de synthèse.

```text
from pyspark.sql import functions as F

daily = (spark.read.table("silver_sales")
    .groupBy("OrderDate", "StoreID")
    .agg(F.sum("Amount").alias("TotalAmount"),
         F.countDistinct("CustomerID").alias("Customers"),
         F.count("*").alias("OrderLines")))
daily.write.mode("overwrite").saveAsTable("gold_daily_sales")
```

T-SQL utilise `GROUP BY` (l'entrepôt accepte aussi `GROUP BY ALL`, qui regroupe par toutes les colonnes non agrégées) et `HAVING`. Le **Regrouper par** de Dataflow Gen2 a un mode De base (une colonne de regroupement) et un mode Avancé (plusieurs colonnes et agrégations), avec des opérations comme Somme, Moyenne, Médiane, Min, Max, Compter les lignes, Compter les lignes distinctes et Toutes les lignes. Une vue matérialisée de lakehouse peut porter un agrégat de la couche or de façon déclarative.

> **Piège d'examen.** Comptages distincts, moyennes et ratios ne sont pas additifs : un chiffre mensuel ne se reconstruit pas à partir de comptages distincts ou de moyennes quotidiens. Stockez le numérateur et le dénominateur (somme et nombre), ou gardez la table de détail.

<!-- section: merge-join | objectives: 2.2.6 -->
## Fusionner ou joindre des données

La **fusion** (jointure) ajoute des colonnes d'une autre table ; l'**ajout** (union) empile les lignes de tables ayant les mêmes colonnes.

| Lignes voulues | Type de jointure Power Query | T-SQL | PySpark `how` |
| --- | --- | --- | --- |
| Seulement les lignes correspondantes | Interne | `INNER JOIN` | `"inner"` |
| Toutes les lignes de gauche, correspondances de droite | Externe gauche | `LEFT OUTER JOIN` | `"left"` |
| Toutes les lignes de droite, correspondances de gauche | Externe droite | `RIGHT OUTER JOIN` | `"right"` |
| Toutes les lignes des deux | Externe entière | `FULL OUTER JOIN` | `"full"` |
| Lignes de gauche sans correspondance | Anti gauche | `NOT EXISTS`, ou `LEFT JOIN` plus `IS NULL` sur la clé de droite | `"left_anti"` |
| Lignes de droite sans correspondance | Anti droite | `NOT EXISTS` depuis l'autre côté | `"left_anti"` en inversant les tables |

```text
orders = spark.read.table("silver_orders")
customers = spark.read.table("silver_customers")
joined = orders.join(customers, on="CustomerID", how="left")
orphans = orders.join(customers, on="CustomerID", how="left_anti")
all_regions = sales_eu.unionByName(sales_us)
```

Dans Power Query, une fusion renvoie une colonne de tables imbriquées à développer pour choisir les colonnes ; **Utiliser la correspondance approximative** joint sur des textes similaires avec un seuil de similarité. En T-SQL, `UNION` supprime les lignes en double, `UNION ALL` les garde ; en PySpark, `unionByName` associe les colonnes par nom, `union` par position. Dans un entrepôt, les noms en trois parties (`Warehouse.schema.table`) joignent un entrepôt à un autre entrepôt ou au point de terminaison d'analytique SQL d'un lakehouse.

> **Piège d'examen.** Joindre sur une clé non unique d'un côté multiplie les lignes (fan-out) et gonfle les sommes. De plus, le classement par défaut de l'entrepôt, `Latin1_General_100_BIN2_UTF8`, respecte la casse : `'abc'` ne correspond pas à `'ABC'`.

<!-- section: data-quality | objectives: 2.2.7 -->
## Résoudre les doublons, les données manquantes et les valeurs Null

| Problème | Power Query | T-SQL | PySpark |
| --- | --- | --- | --- |
| Lignes identiques | Supprimer les doublons sur toutes les colonnes | `SELECT DISTINCT` | `distinct()` |
| Plusieurs lignes par clé, garder la plus récente | Regrouper par la clé avec le Max de la date, puis fusion interne | `ROW_NUMBER() OVER (PARTITION BY key ORDER BY date DESC)` = 1 | `row_number()` sur une fenêtre, garder 1 |
| Lister les doublons | Conserver les doublons | `GROUP BY key HAVING COUNT(*) > 1` | `groupBy(key).count()` puis filtre |
| Null vers une valeur par défaut | Remplacer les valeurs | `COALESCE(col, 0)` ou `ISNULL` | `fillna({"col": 0})` |
| Supprimer les lignes incomplètes | Filtrer les null, Supprimer les lignes vides | `WHERE col IS NOT NULL` | `dropna(subset=[...])` |
| Trous sous une valeur d'en-tête | Remplir vers le bas | Fonction de fenêtre | Fonction de fenêtre |
| Clé de fait absente de la dimension | Fusion anti gauche pour les trouver | `LEFT JOIN` plus `COALESCE(d.CustomerKey, -1)` | Jointure gauche plus `fillna(-1)` |

```text
from pyspark.sql import Window, functions as F

w = Window.partitionBy("CustomerID").orderBy(F.col("ModifiedDate").desc())
latest = (spark.read.table("bronze_customer")
    .withColumn("rn", F.row_number().over(w))
    .filter("rn = 1").drop("rn"))
clean = (latest
    .dropna(subset=["CustomerID"])
    .fillna({"Country": "Unknown", "CreditLimit": 0}))
```

L'entrepôt prend aussi en charge `QUALIFY`, qui filtre sur une fonction de fenêtre sans sous-requête.

> **Piège d'examen.** `dropDuplicates(["CustomerID"])` garde une ligne arbitraire par clé, pas la plus récente : utilisez `row_number()` avec un tri quand l'exigence est « garder la plus récente ». La suppression des doublons de Power Query respecte la casse.

`COUNT(col)` et `AVG(col)` ignorent les Null, `COUNT(*)` non : remplacer les Null par 0 fait baisser une moyenne. `col = NULL` n'est jamais vrai : utilisez `IS NULL`.

<!-- section: data-types | objectives: 2.2.8 -->
## Convertir des types de données de colonne

Les tables de l'entrepôt et du point de terminaison d'analytique SQL acceptent un ensemble restreint de types :

| Non pris en charge dans les tables | À utiliser à la place |
| --- | --- |
| `money`, `smallmoney` | `decimal` |
| `datetime`, `smalldatetime`, `datetimeoffset` | `datetime2` (précision jusqu'à 6 chiffres de fractions de seconde) |
| `nchar`, `nvarchar` | `char`, `varchar` (classement UTF-8) |
| `text`, `ntext`, `json` | `varchar` |
| `tinyint` | `smallint` |
| `image` | `varbinary` |

Les types Delta du lakehouse apparaissent dans le point de terminaison d'analytique SQL sous forme de types SQL : `STRING` en `varchar(8000)`, `TIMESTAMP` en `datetime2`, `TINYINT` en `smallint` ; un type Delta sans correspondance n'apparaît pas comme colonne. `uniqueidentifier` est stocké en binaire et s'affiche en binaire via le point de terminaison d'analytique SQL.

```text
-- T-SQL: CAST fails on a bad value, TRY_CAST returns NULL
SELECT CAST(OrderDateText AS date) AS OrderDate,
       TRY_CAST(AmountText AS decimal(18,2)) AS Amount
FROM stg.Orders;
```

```text
typed = (spark.read.table("bronze_orders")
    .withColumn("Amount", F.col("Amount").cast("decimal(18,2)"))
    .withColumn("OrderDate", F.to_date("OrderDateText", "dd/MM/yyyy")))
```

Dans Power Query, **Modifier le type** définit le type (l'étape automatique Type modifié peut se tromper sur un CSV) ; **Utilisation des paramètres régionaux** lit des valeurs écrites dans une autre culture (`31/12/2026`, virgule décimale) ; les erreurs de conversion se traitent avec Remplacer les erreurs ou Supprimer les erreurs.

> **Piège d'examen.** Direct Lake ne prend pas en charge les colonnes binaires ou GUID et exige des types de données identiques des deux côtés d'une relation : convertissez ces colonnes en chaînes ou en entiers en amont, pas dans le modèle.

<!-- section: filter-data | objectives: 2.2.9 -->
## Filtrer les données

| Clause | Filtre | Évaluée |
| --- | --- | --- |
| `WHERE` | Les lignes | Avant le regroupement ; pas d'agrégats |
| `HAVING` | Les groupes | Après `GROUP BY` |
| `QUALIFY` | Les lignes selon le résultat d'une fonction de fenêtre | Après les fonctions de fenêtre |

```text
SELECT StoreID, SUM(Amount) AS Total
FROM dbo.FactSales
WHERE OrderDate >= '2026-01-01' AND Channel IN ('Web', 'Store')
GROUP BY StoreID
HAVING SUM(Amount) > 100000;
```

```text
recent = (spark.read.table("silver_sales")
    .filter((F.col("OrderDate") >= "2026-01-01") & F.col("Channel").isin("Web", "Store"))
    .where(F.col("CustomerID").isNotNull()))
```

Filtrez le plus tôt possible. Dans Power Query, placez Filtrer les lignes juste après la source pour que l'étape soit **repliée** (query folding : exécutée par la source) ; un filtre placé après une étape non repliable traite toutes les lignes dans le moteur mashup. Filtrer une table Delta sur sa colonne de partition ne lit que les partitions concernées.

> **Piège d'examen.** `WHERE Region <> 'West'` exclut aussi les lignes où Region est NULL. En PySpark, combinez les conditions avec `&` et `|` et des parenthèses, pas avec `and` et `or`.

<!-- section: key-points -->
## Points clés

- Point de terminaison d'analytique SQL : vues, fonctions et procédures oui, écriture dans les tables du lakehouse non. Pas de vues matérialisées dans l'entrepôt : tables CTAS, ou vues matérialisées de lakehouse.
- L'`ALTER TABLE` de l'entrepôt n'ajoute que des colonnes acceptant Null ; pas de colonnes calculées ; CTAS construit de nouvelles tables enrichies.
- `IDENTITY` est un `bigint`, sans valeur de départ ni incrément, unique mais pas séquentiel ; les contraintes sont `NOT ENFORCED`.
- Le type 1 écrase avec `MERGE` ; le type 2 ajoute des lignes avec dates de validité et nouvelles clés de substitution.
- Aplatissez les flocons avec `LEFT JOIN` ; ne pré-agrégez que les valeurs additives.
- Gardez le doublon le plus récent avec `ROW_NUMBER` ou `row_number()`, pas `dropDuplicates`.
- Pas de `nvarchar`, `datetime`, `money` ni `tinyint` dans les tables de l'entrepôt.
- `WHERE` avant le regroupement, `HAVING` après, `QUALIFY` sur les résultats de fenêtre ; filtrez tôt pour que Power Query replie la requête.
