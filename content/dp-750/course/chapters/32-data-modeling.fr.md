Les décisions de modélisation conditionnent toutes les requêtes qui suivent : comment une dimension conserve (ou oublie) son historique, ce que représente une ligne d'une table, comment les modifications sont enregistrées au fil du temps, comment les fichiers sont organisés pour le saut de données (data skipping) et qui possède les fichiers de données. Les questions d'examen posent une règle métier (« les ventes doivent être présentées selon la région du client au moment de la vente », « les requêtes filtrent sur le client et la date, et les usages changent souvent ») et demandent le type de SCD, la granularité, la conception de l'historique, l'instruction de clustering ou le type de table.

<!-- section: scd-types | objectives: 3.1.6 -->
## Choisir un type de dimension à variation lente

| Type | Comportement lors d'une modification | Historique | La table de faits joint sur | À utiliser quand |
| --- | --- | --- | --- | --- |
| 0 | Jamais de mise à jour après la première insertion | Valeur d'origine uniquement | Clé naturelle | Vraies constantes (date de naissance, date de première inscription), exigence réglementaire « tel qu'enregistré à l'origine » |
| 1 | Écrasement sur place | Aucun | Clé naturelle | Corrections d'erreurs, coordonnées, analyse de l'état actuel uniquement |
| 2 | Fermer la ligne courante, insérer une nouvelle version | Complet | Clé de substitution (une par version) | Rapports selon la valeur au moment de l'événement, audit des changements de territoire ou d'organisation |
| 3 | Conserver la valeur précédente dans une colonne supplémentaire | Une valeur antérieure | Clé naturelle | Comparaisons « actuel contre précédent » uniquement ; rare |

Une dimension de type 2 exige une **clé de substitution** par version (`BIGINT GENERATED ALWAYS AS IDENTITY`), la **clé naturelle** de la source, un **début** et une **fin de validité**, et en général un **indicateur de version courante**. Le type se choisit par attribut : dans une dimension client, la date d'inscription peut être de type 0, l'adresse e-mail de type 1 et la région commerciale de type 2.

> **Piège d'examen.** Le type 1 réécrit l'histoire dans les rapports : après le déménagement d'un client de Seattle à Portland, toutes ses ventes passées apparaissent sous Portland. Si les rapports historiques doivent garder Seattle, la réponse est le type 2, pas le type 1 ni le type 3.

L'implémentation la plus simple dans Azure Databricks est **AUTO CDC** dans Lakeflow Spark Declarative Pipelines (il remplace `APPLY CHANGES`, avec la même syntaxe). La cible est une table de streaming ; `SEQUENCE BY` ordonne les modifications, si bien qu'un enregistrement plus ancien arrivé en retard n'écrase jamais un plus récent.

```text
CREATE OR REFRESH STREAMING TABLE dim_customer;

CREATE FLOW dim_customer_flow AS AUTO CDC INTO dim_customer
FROM STREAM(sales.bronze.customer_changes)
KEYS (customer_id)
APPLY AS DELETE WHEN operation = 'DELETE'
SEQUENCE BY change_seq
COLUMNS * EXCEPT (operation, change_seq)
STORED AS SCD TYPE 2
TRACK HISTORY ON * EXCEPT (last_login);
```

Avec `STORED AS SCD TYPE 2`, la cible reçoit les colonnes `__START_AT` et `__END_AT` (`__END_AT` est nul pour la version courante). `TRACK HISTORY ON * EXCEPT (last_login)` met à jour `last_login` sur place au lieu de créer une version. `STORED AS SCD TYPE 1` ne garde que l'état courant, sans ces colonnes. AUTO CDC exige un pipeline serverless ou l'édition Pro ou Advanced.

Hors pipeline, une dimension de type 2 se maintient avec un seul `MERGE` qui ferme et insère à la fois : les lignes modifiées sont envoyées deux fois, une fois avec leur clé (pour fermer la version courante) et une fois avec une clé nulle (pour qu'elles ne correspondent pas et soient insérées comme nouvelle version).

```text
MERGE INTO sales.gold.dim_customer AS t
USING (
  SELECT s.customer_id AS merge_key, s.* FROM sales.silver.customer_updates AS s
  UNION ALL
  SELECT NULL AS merge_key, s.* FROM sales.silver.customer_updates AS s
  JOIN sales.gold.dim_customer AS c
    ON s.customer_id = c.customer_id AND c.is_current = true
  WHERE s.region <> c.region
) AS u
ON t.customer_id = u.merge_key AND t.is_current = true
WHEN MATCHED AND t.region <> u.region THEN
  UPDATE SET is_current = false, valid_to = u.change_ts
WHEN NOT MATCHED THEN
  INSERT (customer_id, name, region, valid_from, valid_to, is_current)
  VALUES (u.customer_id, u.name, u.region, u.change_ts, NULL, true);
```

<!-- section: granularity | objectives: 3.1.7 -->
## Choisir la granularité d'une table ou d'une colonne

La **granularité** (grain) est ce que représente une ligne. Déclarez-la avant d'ajouter des colonnes : « une ligne par ligne de commande », « une ligne par appareil et par minute ».

- Dans une table de faits, la granularité est la combinaison de ses clés de dimension : date, produit, client et magasin donnent « une ligne par produit, par client, par magasin et par jour ». Ajouter une clé horaire multiplie les lignes.
- La granularité **atomique** (le niveau le plus détaillé de la source) répond à toute question : on peut agréger vers le haut, jamais désagréger vers le bas. La granularité **agrégée** est plus rapide pour les requêtes connues mais limite l'analyse. Gardez les deux : une table atomique plus des agrégats maintenus par des **vues matérialisées**, qui s'actualisent quand les données atomiques changent.
- La granularité d'une dimension doit correspondre aux faits qui la référencent : une ligne par client (type 1), une ligne par version de client (type 2) ou une ligne par client et par période (instantané périodique).
- La conformité peut imposer la granularité : les régulateurs financiers exigent souvent le détail au niveau de la transaction.

| Exigence | Granularité minimale |
| --- | --- |
| Détecter une anomalie de vibration en temps réel | Chaque événement (horodatage à la milliseconde) |
| Tendance de température pour la maintenance prédictive | Agrégat par seconde |
| Consommation d'énergie horaire par appareil | Agrégat par minute |
| Rapport de production quotidien par usine | Agrégat horaire |

La granularité des colonnes suit la même logique : gardez un `TIMESTAMP` quand l'heure de la journée compte (un `DATE` la perd définitivement), et choisissez une échelle `DECIMAL(p,s)` adaptée à la plus petite unité présentée.

> **Conseil d'examen.** Quand les exigences sont incertaines et que le budget le permet, stockez la granularité la plus fine : un détail jamais capturé ne se récupère pas, alors qu'on peut toujours dériver des vues plus grossières.

<!-- section: history-tables | objectives: 3.1.8 -->
## Concevoir une table temporelle (historique)

Trois mécanismes enregistrent les modifications au fil du temps :

| Mécanisme | Ce qu'il apporte | Limite |
| --- | --- | --- |
| Voyage dans le temps Delta (`VERSION AS OF`, `TIMESTAMP AS OF`, `DESCRIBE HISTORY`) | N'importe quel état passé de la table, sans travail de conception | Seulement dans les fenêtres de rétention (7 jours de fichiers, 30 jours de journal par défaut) |
| Flux de données modifiées (change data feed) | Les modifications au niveau des lignes avec `_change_type` (`insert`, `update_preimage`, `update_postimage`, `delete`), `_commit_version`, `_commit_timestamp` | Désactivé par défaut ; n'enregistre que les modifications postérieures à son activation ; suit la rétention de la table |
| Table d'historique explicite | Chaque modification conservée aussi longtemps que vous le décidez | Doit être alimentée par un job ou un pipeline |

Le SCD de type 2 suit les versions **métier** pour les rapports ; une table temporelle enregistre les modifications **techniques** pour le débogage, l'audit et la reproduction d'un rapport tel qu'il était.

```text
ALTER TABLE sales.bronze.orders SET TBLPROPERTIES (delta.enableChangeDataFeed = true);

SELECT order_id, amount, _change_type, _commit_version
FROM table_changes('sales.bronze.orders', 12)
WHERE _change_type IN ('insert', 'update_postimage');

SELECT * FROM sales.bronze.orders TIMESTAMP AS OF '2026-11-01';
SELECT * FROM sales.bronze.orders@v42;
```

Pour conserver l'historique au-delà des fenêtres de rétention, diffusez le flux de modifications vers une table d'historique en ajout seul, planifiée après chaque chargement :

```text
(spark.readStream
   .option("readChangeFeed", "true")
   .table("sales.bronze.orders")
   .writeStream
   .option("checkpointLocation", "/Volumes/sales/audit/chk/orders_history")
   .trigger(availableNow=True)
   .toTable("sales.audit.orders_history"))
```

Les versions de `table_changes` sont inclusives ; `startingVersion` ou `startingTimestamp` font de même en Python. Augmenter `delta.logRetentionDuration` et `delta.deletedFileRetentionDuration` étend le voyage dans le temps, au prix du stockage ; Microsoft Learn déconseille d'utiliser l'historique de la table comme sauvegarde à long terme.

> **Piège d'examen.** Activer le flux de données modifiées aujourd'hui ne révèle pas les modifications d'hier : il ne capture que les validations effectuées après la définition de la propriété. Activez-le avant de charger les données de production.

<!-- section: clustering | objectives: 3.1.9 -->
## Stratégie de clustering : clustering liquide, ordre Z, vecteurs de suppression

Delta collecte par fichier des statistiques de minimum, de maximum et de nombre de valeurs nulles ; un filtre ignore les fichiers qui ne peuvent pas correspondre. Le clustering regroupe les lignes liées dans les mêmes fichiers pour que le **saut de données** fonctionne.

```text
CREATE TABLE sales.silver.orders (
  order_id BIGINT, customer_id STRING, region STRING, order_date DATE, amount DECIMAL(12,2)
) CLUSTER BY (customer_id, order_date);

OPTIMIZE sales.silver.orders;
ALTER TABLE sales.silver.orders CLUSTER BY (region, order_date);
OPTIMIZE sales.silver.orders FULL;
ALTER TABLE sales.silver.orders CLUSTER BY AUTO;

OPTIMIZE sales.legacy.orders ZORDER BY (customer_id, order_date);
```

| Fonctionnalité | Clustering liquide | Ordre Z | Partitionnement |
| --- | --- | --- | --- |
| Statut | Recommandé pour les nouvelles tables | Hérité | Seulement pour les tables de plus de 1 To |
| Clés | Jusqu'à 4, toute cardinalité | Plusieurs colonnes, appliquées au moment de `OPTIMIZE` | Une colonne à faible cardinalité (ou quelques-unes) |
| Changer les clés | `ALTER TABLE ... CLUSTER BY`, sans réécriture (`OPTIMIZE FULL` pour regrouper les données existantes) | Réécriture complète | Réécriture complète |
| Concurrence | Concurrence au niveau des lignes | Au niveau de la transaction | Au niveau de la transaction |
| Combinable avec | Ni le partitionnement ni `ZORDER` | Le partitionnement | L'ordre Z |

Le clustering liquide exige Databricks Runtime 13.3 LTS ou ultérieur et il est incrémentiel : chaque `OPTIMIZE` ne réorganise que ce qui en a besoin (planifiez-le toutes les une ou deux heures sur les tables très actives, ou laissez l'optimisation prédictive l'exécuter sur les tables managées). `CLUSTER BY AUTO` laisse Databricks choisir et réviser les clés d'après l'historique des requêtes ; il exige l'optimisation prédictive. Choisissez les clés parmi les colonnes les plus utilisées dans les filtres ; leur ordre compte peu.

Les **vecteurs de suppression** font que `DELETE`, `UPDATE` et `MERGE` marquent les lignes comme supprimées dans un petit fichier au lieu de réécrire des fichiers Parquet entiers ; les lecteurs les appliquent à la volée. Ils sont activés par défaut pour les nouvelles tables à partir de Databricks Runtime 14.1, appliqués physiquement par `OPTIMIZE`, le compactage automatique ou `REORG TABLE ... APPLY (PURGE)`, et permettent la concurrence au niveau des lignes.

```text
ALTER TABLE sales.silver.orders SET TBLPROPERTIES ('delta.enableDeletionVectors' = true);
REORG TABLE sales.silver.orders APPLY (PURGE);
```

> **Piège d'examen.** Le clustering liquide ne peut pas être activé sur une table partitionnée. Pour passer une table partitionnée au clustering liquide, recréez-la sans partitionnement (par exemple par CTAS avec `CLUSTER BY`), puis exécutez `OPTIMIZE`.

<!-- section: managed-external | objectives: 3.1.10 -->
## Tables managées ou non managées (externes)

| Caractéristique | Table managée | Table externe |
| --- | --- | --- |
| Emplacement des données | Stockage managé du schéma, du catalogue ou du metastore | `LOCATION` dans un emplacement externe inscrit |
| Fichiers de données gérés par | Unity Catalog | Vous |
| Formats | Delta, Iceberg | Delta, CSV, JSON, Avro, Parquet, ORC, texte |
| Optimisation prédictive, clustering liquide automatique | Oui | Non |
| `DROP TABLE` | Fichiers supprimés par Unity Catalog après la période de récupération | Seules les métadonnées sont supprimées ; les fichiers restent dans le stockage |
| `UNDROP TABLE` | Pendant la période de récupération (7 jours par défaut) | Récupère la définition ; exige `CREATE EXTERNAL TABLE` sur l'emplacement |

```text
CREATE TABLE sales.bronze.legacy_orders (order_id BIGINT, amount DECIMAL(12,2))
LOCATION 'abfss://lake@contosodata.dfs.core.windows.net/legacy/orders';
```

Créer une table externe exige `CREATE EXTERNAL TABLE` sur l'emplacement externe, plus `CREATE TABLE` et `USE SCHEMA` sur le schéma et `USE CATALOG` sur le catalogue.

Databricks recommande les tables **managées** dans la plupart des cas : optimisation automatique, requêtes plus rapides, coût réduit, cycle de vie géré par Unity Catalog. Choisissez des tables **externes** quand :

- les données doivent survivre à la définition de la table ou à l'espace de travail ;
- d'autres systèmes lisent ou écrivent directement les fichiers (cela contourne le contrôle d'accès et l'audit d'Unity Catalog) ;
- vous inscrivez des données existantes (par exemple issues du metastore Hive) sans les déplacer ; elles pourront être converties en tables managées plus tard ;
- le format n'est ni Delta ni Iceberg ;
- une stratégie de stockage ou de conformité extérieure à Azure Databricks impose l'emplacement.

> **Conseil d'examen.** « Supprimer la table ne doit pas supprimer les fichiers » désigne une table externe ; « réduire la maintenance, OPTIMIZE et VACUUM automatiques » désigne une table managée.

<!-- section: key-points -->
## Points clés

- Le type 1 écrase, le type 2 crée des versions avec une clé de substitution et des dates de validité, le type 3 garde une valeur précédente, le type 0 ne change jamais.
- AUTO CDC avec `SEQUENCE BY` et `STORED AS SCD TYPE 2` ajoute `__START_AT` et `__END_AT` et gère les enregistrements tardifs.
- Déclarez d'abord la granularité ; gardez les données atomiques et dérivez les agrégats par des vues matérialisées.
- Le voyage dans le temps est borné par la rétention ; le flux de données modifiées n'enregistre qu'après son activation ; une table d'historique alimentée par `readChangeFeed` conserve tout.
- Clustering liquide : jusqu'à 4 clés, changement de clés sans réécriture, `CLUSTER BY AUTO` exige l'optimisation prédictive, incompatible avec le partitionnement et `ZORDER`.
- Les vecteurs de suppression accélèrent suppressions et mises à jour ; `REORG ... APPLY (PURGE)` puis `VACUUM` suppriment physiquement les données.
- Managée par défaut ; externe quand les fichiers doivent survivre à `DROP`, que d'autres moteurs y accèdent ou que le format n'est ni Delta ni Iceberg.
