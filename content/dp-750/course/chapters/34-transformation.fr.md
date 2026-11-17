Entre les tables bronze d'atterrissage et les tables gold organisées se trouve le travail de la couche silver : profiler ce qui est arrivé, donner à chaque colonne le bon type, supprimer les doublons et les valeurs null, remodeler les données, puis les charger dans la table cible sans casser les réexécutions. L'examen montre des fragments SQL ou PySpark et demande quelle clause, quelle fonction ou quel mode d'écriture produit le résultat attendu.

<!-- section: profiling | objectives: 3.3.1 -->
## Profiler les données

Profilez avant de nettoyer : les statistiques indiquent quelles colonnes contiennent des valeurs null, des valeurs aberrantes, des valeurs inattendues ou des distributions déséquilibrées.

| Outil | Comment | Ce que vous obtenez |
| --- | --- | --- |
| Onglet Data Profile | Exécutez `display(df)`, puis cliquez sur **+ > Data Profile** à côté de **Table** dans la sortie (Databricks Runtime 9.1 LTS et versions ultérieures) | Des statistiques récapitulatives pour les colonnes numériques, de chaîne et de date, et un histogramme de la distribution des valeurs de chaque colonne |
| `dbutils.data.summarize(df)` | Le même profil, généré par du code (Python, Scala, R) | Analyse la totalité du DataFrame : coûteux sur de très gros volumes |
| Détails de la sélection | Sélectionnez des en-têtes de colonnes dans un tableau de résultats, puis **Open selection details** | Les statistiques de profilage des colonnes sélectionnées |
| `df.describe()` / `df.summary()` | Méthodes PySpark | `count`, `mean`, `stddev`, `min`, `max` ; `summary()` ajoute les centiles 25 %, 50 % et 75 % |
| Agrégats SQL | `count(*)`, `count(col)`, `count_if(col IS NULL)`, `approx_count_distinct(col)`, `percentile_approx(col, 0.5)`, `min`, `max` | Exactement les statistiques que vous nommez, utilisables dans un job ou une vérification |

`dbutils.data.summarize(df, precise=False)` est le comportement par défaut : certaines statistiques sont approximatives pour réduire la durée d'exécution (le nombre de valeurs distinctes d'une colonne catégorielle à forte cardinalité peut avoir une erreur relative d'environ 5 % ; histogrammes et centiles jusqu'à 0,01 % du nombre de lignes). Avec `precise=True` (Databricks Runtime 10.4 LTS et versions ultérieures), toutes les statistiques sont exactes, sauf les histogrammes et les centiles des colonnes numériques.

```text
# Python: profile a bronze table
df = spark.read.table("contoso.bronze.orders")
dbutils.data.summarize(df, precise=True)

-- SQL: null rate, cardinality and distribution of key columns
SELECT count(*)                          AS row_count,
       count_if(customer_id IS NULL)     AS null_customers,
       approx_count_distinct(customer_id) AS distinct_customers,
       min(order_ts)                     AS first_order,
       max(order_ts)                     AS last_order,
       percentile_approx(amount, 0.5)    AS median_amount
FROM contoso.bronze.orders;
```

> **Piège d'examen.** `count(col)` ignore les valeurs null, `count(*)` non. Le nombre de null d'une colonne vaut `count(*) - count(col)` ou `count_if(col IS NULL)`.

<!-- section: data-types | objectives: 3.3.2 -->
## Choisir les types de données des colonnes

Auto Loader déduit par défaut les colonnes JSON et CSV en `STRING` : c'est donc dans la couche silver que les types sont fixés volontairement.

| Exigence | Type |
| --- | --- |
| Montants, quantités dont la somme doit être exacte | `DECIMAL(p, s)` : précision de 1 à 38, `DECIMAL(10, 0)` par défaut |
| Mesures scientifiques où de minuscules erreurs d'arrondi sont acceptables | `DOUBLE` (8 octets) ou `FLOAT` (4 octets) |
| Identifiants pouvant dépasser 2 147 483 647 | `BIGINT` (8 octets) plutôt que `INT` (4 octets) |
| Petits codes (0 à 100) | `TINYINT` (1 octet) ou `SMALLINT` (2 octets) |
| Un jour calendaire | `DATE` |
| Un instant, affiché dans le fuseau horaire de la session | `TIMESTAMP` |
| Une heure murale sans fuseau horaire (heures d'ouverture locales, relevé enregistré tel qu'écrit) | `TIMESTAMP_NTZ` |
| Indicateurs | `BOOLEAN` |
| Texte | `STRING` |
| JSON semi-structuré dont la forme varie | `VARIANT` |
| Structure imbriquée fixe, liste, paires clé-valeur | `STRUCT`, `ARRAY`, `MAP` |

Convertissez avec `cast(col AS type)` ou `col::type`. En mode SQL ANSI, une valeur invalide fait échouer `cast` ; `try_cast` renvoie `NULL` à la place, ce qui permet de charger la ligne et de compter les échecs.

```text
SELECT try_cast(order_id AS BIGINT)          AS order_id,
       try_cast(amount   AS DECIMAL(12, 2))  AS amount,
       to_date(order_day, 'yyyy-MM-dd')      AS order_day,
       try_cast(order_ts AS TIMESTAMP)       AS order_ts
FROM contoso.bronze.orders;
```

> **Piège d'examen.** `DOUBLE` pour des montants est la mauvaise réponse classique : la virgule flottante binaire ne représente pas exactement 0,1, et les totaux dérivent. Utilisez `DECIMAL`. Et `CAST(5.345 AS DECIMAL)` donne `5`, car l'échelle par défaut est 0.

<!-- section: duplicates-nulls | objectives: 3.3.3 -->
## Résoudre les doublons, les valeurs manquantes et les null

Trouvez les doublons en regroupant sur la clé métier :

```text
SELECT order_id, count(*) AS copies
FROM contoso.bronze.orders
GROUP BY order_id
HAVING count(*) > 1;
```

| Exigence | SQL | PySpark |
| --- | --- | --- |
| Supprimer les lignes identiques dans toutes les colonnes | `SELECT DISTINCT *` | `df.distinct()` ou `df.dropDuplicates()` |
| Garder une ligne par clé, n'importe laquelle | (utilisez la fenêtre ci-dessous) | `df.dropDuplicates(["order_id"])` |
| Garder la ligne **la plus récente** par clé | `row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC)` puis `QUALIFY rn = 1` | La même fenêtre avec `F.row_number()`, puis un filtre `rn == 1` |
| Supprimer les lignes dont une colonne clé est null | `WHERE customer_id IS NOT NULL` | `df.dropna(subset=["customer_id"])` |
| Supprimer les lignes dont toutes les colonnes sont null | | `df.dropna(how="all")` |
| Remplacer les null par une valeur par défaut | `coalesce(country, 'Unknown')`, `ifnull`, `nvl` | `df.fillna({"country": "Unknown", "qty": 0})` |
| Traiter les chaînes vides comme manquantes | `nullif(trim(email), '')` | `F.when(F.trim("email") == "", None)` |

```text
-- Keep the most recent version of each order
SELECT *
FROM contoso.bronze.orders
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1;
```

Règles qui décident des réponses d'examen :

- `col = NULL` n'est jamais vrai ; utilisez `IS NULL`. Utilisez l'opérateur null-safe `<=>` pour comparer deux colonnes qui peuvent toutes deux être null.
- Les jointures d'égalité ne font jamais correspondre des clés null : les lignes à clé null disparaissent d'une jointure interne.
- `dropDuplicates` sans tri garde une ligne arbitraire : quand l'exigence dit « la plus récente », une fenêtre avec `ORDER BY` est nécessaire.
- Supprimer, remplacer ou garder un null dépend de la colonne : une clé null est généralement mise en quarantaine, un attribut facultatif null est conservé ou remplacé par une valeur par défaut.

> **Piège d'examen.** `DISTINCT` et `dropDuplicates()` sans liste de colonnes ne suppriment que les lignes identiques dans **toutes** les colonnes. Deux versions de la même commande avec des `updated_at` différents survivent toutes les deux.

<!-- section: filter-aggregate | objectives: 3.3.4 -->
## Filtrer, regrouper et agréger

| Clause | Filtre | Peut référencer des agrégats |
| --- | --- | --- |
| `WHERE` | Les lignes, avant le regroupement | Non |
| `HAVING` | Les groupes, après le regroupement | Oui |
| `QUALIFY` | Les lignes, après les fonctions de fenêtrage | Les résultats des fonctions de fenêtrage |
| `FILTER (WHERE ...)` sur un agrégat | Les lignes fournies à ce seul agrégat | Sans objet |

```text
SELECT region,
       date_trunc('MONTH', order_ts)                 AS order_month,
       count(*)                                      AS orders,
       count(DISTINCT customer_id)                   AS customers,
       sum(amount)                                   AS revenue,
       sum(amount) FILTER (WHERE channel = 'web')    AS web_revenue
FROM contoso.silver.orders
WHERE status <> 'cancelled'
GROUP BY region, date_trunc('MONTH', order_ts)
HAVING sum(amount) > 10000;
```

L'équivalent PySpark :

```text
from pyspark.sql import functions as F

monthly = (spark.read.table("contoso.silver.orders")
    .filter(F.col("status") != "cancelled")
    .groupBy("region", F.date_trunc("MONTH", "order_ts").alias("order_month"))
    .agg(F.count("*").alias("orders"),
         F.countDistinct("customer_id").alias("customers"),
         F.sum("amount").alias("revenue"))
    .filter(F.col("revenue") > 10000))
```

Pour obtenir des sous-totaux en une passe, `GROUP BY ROLLUP (region, country)` ajoute un sous-total par région et un total général, `CUBE` ajoute toutes les combinaisons, et `GROUPING SETS` liste exactement les combinaisons voulues. Les fonctions de fenêtrage (`sum(amount) OVER (PARTITION BY customer_id ORDER BY order_ts)`) calculent des cumuls ou des rangs **sans** réduire le nombre de lignes.

> **Conseil d'examen.** Un filtre sur une valeur agrégée (`sum(amount) > 10000`) va dans `HAVING` ; un filtre sur une colonne de la ligne va dans `WHERE`, où il réduit aussi les données avant le shuffle.

<!-- section: joins-set-operators | objectives: 3.3.5 -->
## Jointures et opérateurs ensemblistes

| Exigence | Jointure | `how` en PySpark |
| --- | --- | --- |
| Uniquement les lignes qui ont une correspondance des deux côtés | `INNER JOIN` | `"inner"` |
| Toutes les lignes de gauche, avec les colonnes correspondantes ou des null | `LEFT [OUTER] JOIN` | `"left"` |
| Toutes les lignes des deux côtés | `FULL [OUTER] JOIN` | `"full"` |
| Les lignes de gauche **qui ont** une correspondance, colonnes de gauche seulement, sans duplication | `LEFT SEMI JOIN` | `"left_semi"` |
| Les lignes de gauche **sans** correspondance (orphelins, nouvelles clés) | `LEFT ANTI JOIN` | `"left_anti"` |
| Toutes les combinaisons | `CROSS JOIN` | `"cross"` |

```text
-- Orders whose customer doesn't exist in the dimension
SELECT o.*
FROM contoso.silver.orders AS o
LEFT ANTI JOIN contoso.silver.customers AS c
  ON o.customer_id = c.customer_id;
```

Les opérateurs ensemblistes combinent les lignes de deux requêtes qui ont le même nombre de colonnes, associées **par position**, avec des types compatibles.

| Opérateur | Résultat | Par défaut |
| --- | --- | --- |
| `UNION` | Les lignes des deux requêtes | `DISTINCT` : doublons supprimés. `UNION ALL` les garde et coûte moins cher |
| `INTERSECT` | Les lignes présentes dans les deux | `DISTINCT` |
| `EXCEPT` (alias `MINUS`) | Les lignes de la première requête absentes de la seconde | `DISTINCT` |

Quand des opérations ensemblistes sont enchaînées, `INTERSECT` est évalué avant `UNION` et `EXCEPT`.

| Méthode PySpark | Équivalent SQL |
| --- | --- |
| `df1.union(df2)` / `unionAll` | `UNION ALL`, par position |
| `df1.unionByName(df2, allowMissingColumns=True)` | Union par nom de colonne ; les colonnes manquantes deviennent null |
| `df1.intersect(df2)` / `intersectAll` | `INTERSECT` / `INTERSECT ALL` |
| `df1.subtract(df2)` / `exceptAll` | `EXCEPT` / `EXCEPT ALL` |

> **Piège d'examen.** En PySpark, `union()` ne supprime **pas** les doublons et n'associe **pas** les colonnes par nom. Deux extractions mensuelles avec les mêmes colonnes dans un ordre différent demandent `unionByName`, suivi de `distinct()` si les doublons doivent disparaître.

<!-- section: denormalize-pivot | objectives: 3.3.6 -->
## Dénormaliser, pivoter et dépivoter

**Dénormaliser** consiste à joindre les dimensions au fait pour produire une seule table large, afin que les rapports évitent des jointures répétées. Cela convient aux tables gold lues souvent ; le coût est un stockage redondant et une reconstruction quand un attribut de dimension change. Gardez les tables silver normalisées et dénormalisez dans la couche gold, souvent sous forme de vue matérialisée.

```text
CREATE OR REPLACE TABLE contoso.gold.sales_wide AS
SELECT o.order_id, o.order_ts, o.amount,
       c.customer_name, c.segment, p.product_name, p.category
FROM contoso.silver.orders   AS o
JOIN contoso.silver.customers AS c ON o.customer_id = c.customer_id
JOIN contoso.silver.products  AS p ON o.product_id  = p.product_id;
```

**PIVOT** transforme des valeurs de lignes en colonnes. Chaque colonne qui n'est citée ni dans l'agrégat ni dans la liste `FOR` devient une colonne de regroupement.

```text
SELECT *
FROM (SELECT region, year, quarter, amount FROM contoso.silver.sales)
PIVOT (sum(amount) AS sales FOR quarter IN (1 AS q1, 2 AS q2, 3 AS q3, 4 AS q4));
```

**UNPIVOT** (Databricks SQL et Databricks Runtime 12.2 LTS et versions ultérieures) transforme des colonnes en lignes. Sa valeur par défaut est `EXCLUDE NULLS` : une valeur null ne produit aucune ligne, sauf si vous écrivez `INCLUDE NULLS`.

```text
SELECT *
FROM contoso.silver.quarterly_sales
UNPIVOT INCLUDE NULLS (sales FOR quarter IN (q1, q2, q3, q4));
```

En PySpark, `df.groupBy("region", "year").pivot("quarter", [1, 2, 3, 4]).sum("amount")` pivote ; fournir la liste des valeurs évite une passe supplémentaire pour calculer les valeurs distinctes. `df.unpivot(["region", "year"], ["q1", "q2", "q3", "q4"], "quarter", "sales")` (alias `melt`) dépivote.

> **Piège d'examen.** Le pivot conserve les colonnes de regroupement qui restent dans l'entrée. Sélectionnez d'abord uniquement les colonnes utiles dans une sous-requête, sinon une colonne en trop (un `order_id`, par exemple) crée une ligne par valeur et le pivot semble cassé.

<!-- section: load-operations | objectives: 3.3.7 -->
## Charger avec insert, append et merge

| Exigence | SQL | DataFrame |
| --- | --- | --- |
| Ajouter de nouvelles lignes aux lignes existantes | `INSERT INTO t SELECT ...` | `df.write.mode("append").saveAsTable("t")` |
| Remplacer tout le contenu | `INSERT OVERWRITE t SELECT ...` ou `CREATE OR REPLACE TABLE ... AS` | `df.write.mode("overwrite").saveAsTable("t")` |
| Remplacer seulement une tranche (un jour, une région) | `INSERT INTO t REPLACE WHERE order_day = '2026-11-01' SELECT ...` | `.mode("overwrite").option("replaceWhere", "order_day = '2026-11-01'")` |
| Remplacer les lignes dont les valeurs de clé figurent dans les nouvelles données | `INSERT INTO t REPLACE USING (country) SELECT ...` | |
| Insérer par nom de colonne plutôt que par position | `INSERT INTO t BY NAME SELECT ...` | `saveAsTable` en mode append associe par nom |
| Mettre à jour les lignes existantes et insérer les nouvelles (upsert), supprimer | `MERGE INTO` | `DeltaTable.merge` |

`REPLACE WHERE` échoue et n'écrit rien si une ligne renvoyée sort du prédicat. `REPLACE USING` considère les clés null comme différentes de tout : les lignes à clé null ne sont pas supprimées.

```text
MERGE INTO contoso.silver.customers AS t
USING (
  SELECT * FROM contoso.bronze.customer_changes
  QUALIFY row_number() OVER (PARTITION BY customer_id ORDER BY change_ts DESC) = 1
) AS s
ON t.customer_id = s.customer_id
WHEN MATCHED AND s.op = 'DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'DELETE' THEN INSERT *
WHEN NOT MATCHED BY SOURCE AND t.is_active = false THEN DELETE;
```

Règles de `MERGE` :

- Les clauses de chaque type sont évaluées dans l'ordre d'écriture ; chaque clause `WHEN MATCHED` sauf la dernière doit avoir une condition (même règle pour `WHEN NOT MATCHED` et `WHEN NOT MATCHED BY SOURCE`).
- Si plusieurs lignes sources correspondent à une même ligne cible, le merge échoue avec `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE` (un `DELETE` sans condition fait exception). Dédoublonnez d'abord la source, comme ci-dessus.
- `UPDATE SET *` et `INSERT *` exigent que la source ait les colonnes de la cible. Une nouvelle colonne de la source est ignorée, sauf si vous écrivez `MERGE WITH SCHEMA EVOLUTION INTO` (Databricks Runtime 15.4 LTS et versions ultérieures).
- `WHEN NOT MATCHED BY SOURCE` agit sur les lignes cibles absentes de la source : utilisez-la pour supprimer ou marquer les enregistrements retirés en amont lors d'un chargement par instantané complet.

```text
from delta.tables import DeltaTable

target = DeltaTable.forName(spark, "contoso.silver.customers")
(target.alias("t")
   .merge(updates_df.alias("s"), "t.customer_id = s.customer_id")
   .whenMatchedUpdateAll()
   .whenNotMatchedInsertAll()
   .execute())
```

En Structured Streaming, exécutez le merge dans `foreachBatch` pour appliquer un upsert à chaque micro-lot.

> **Piège d'examen.** `INSERT INTO` et le mode append ne sont pas idempotents : réexécuter un job en échec duplique les lignes. Quand un chargement doit pouvoir être réexécuté sans risque, utilisez `MERGE`, `REPLACE WHERE` ou un remplacement de la tranche.

<!-- section: key-points -->
## Points clés

- Profilez avec l'onglet Data Profile ou `dbutils.data.summarize` (approximatif par défaut, `precise=True` pour des comptages exacts) ; `count(col)` ignore les null.
- `DECIMAL` pour les montants, `BIGINT` pour les grands identifiants, `TIMESTAMP_NTZ` pour les heures sans fuseau, `try_cast` pour convertir sans échouer.
- Ligne la plus récente par clé : fenêtre `row_number()` avec `QUALIFY` ; `DISTINCT` ne supprime que les lignes entièrement identiques.
- `WHERE` avant le regroupement, `HAVING` après ; la jointure anti gauche trouve les orphelins, la jointure semi gauche filtre sans dupliquer.
- `UNION`, `INTERSECT`, `EXCEPT` sont `DISTINCT` par défaut en SQL ; `union()` en PySpark garde les doublons et associe par position.
- `UNPIVOT` exclut les null par défaut ; `PIVOT` regroupe par toutes les colonnes restantes.
- Append pour les nouvelles lignes, `REPLACE WHERE` pour une tranche, `MERGE` pour les upserts, avec une source dédoublonnée.
