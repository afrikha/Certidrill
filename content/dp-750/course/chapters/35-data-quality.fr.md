Dans Unity Catalog, la qualité des données s'applique à trois niveaux : les contraintes des tables Delta rejettent les écritures incorrectes, l'application et l'évolution du schéma décident de ce qui se passe quand la forme des données change, et les attentes des pipelines déclaratifs Lakeflow Spark avertissent, suppriment ou échouent pour chaque enregistrement. L'examen demande quel mécanisme répond à une exigence comme « continuer à charger mais compter les lignes incorrectes » ou « arrêter le chargement ».

<!-- section: validation-checks | objectives: 3.4.1 -->
## Vérifications de validation : nullabilité, cardinalité et plages

Les tables Delta prennent en charge deux contraintes **appliquées**. Quand une écriture en viole une, toute la transaction échoue avec une erreur et rien n'est écrit.

| Vérification | Mécanisme | Syntaxe |
| --- | --- | --- |
| Nullabilité | Contrainte de colonne `NOT NULL` | `ALTER TABLE t ALTER COLUMN c SET NOT NULL` (ou `DROP NOT NULL`) |
| Plage, valeurs autorisées, règle entre colonnes | Contrainte `CHECK` | `ALTER TABLE t ADD CONSTRAINT name CHECK (expr)` |
| Unicité d'une clé | `PRIMARY KEY` (en disponibilité générale à partir de Databricks Runtime 15.2) ou `UNIQUE` (préversion publique, Databricks SQL et Databricks Runtime 18.2 et versions ultérieures ; les valeurs null sont considérées comme distinctes) informationnelle : **non appliquée** | Vérifiez par une requête (ci-dessous) |
| Intégrité référentielle | `FOREIGN KEY` informationnelle : **non appliquée** | Vérifiez par une jointure anti gauche |

```text
CREATE TABLE contoso.silver.orders (
  order_id    BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  quantity    INT,
  amount      DECIMAL(12, 2),
  order_day   DATE,
  CONSTRAINT orders_pk PRIMARY KEY (order_id)
);

ALTER TABLE contoso.silver.orders
  ADD CONSTRAINT valid_quantity CHECK (quantity BETWEEN 1 AND 1000);
ALTER TABLE contoso.silver.orders
  ADD CONSTRAINT valid_day CHECK (order_day >= '2020-01-01');
ALTER TABLE contoso.silver.orders DROP CONSTRAINT valid_day;
```

Règles à connaître :

- L'ajout d'une contrainte `NOT NULL` ou `CHECK` vérifie d'abord **toutes les lignes existantes** ; il échoue si l'une d'elles la viole.
- Une expression `CHECK` ne peut utiliser que des fonctions déterministes : ni fonction définie par l'utilisateur, ni fonction d'agrégation ou de fenêtrage, ni sous-requête. Une contrainte ne peut donc pas exprimer « unique » ni « existe dans une autre table ».
- L'ajout d'une contrainte peut mettre à niveau le protocole d'écriture de la table, ce qui compte pour les clients Delta externes. À partir de Databricks Runtime 15.4 LTS, `ALTER TABLE ... DROP FEATURE` supprime les contraintes `CHECK` et rétrograde le protocole.
- CTAS n'accepte pas les clauses `PRIMARY KEY`, `FOREIGN KEY` et `UNIQUE` : créez la table, puis ajoutez les contraintes.
- Les contraintes `CHECK` apparaissent dans `SHOW TBLPROPERTIES` et `DESCRIBE DETAIL` ; les contraintes de clé dans `information_schema`, `DESCRIBE TABLE EXTENDED` ou `SHOW CREATE TABLE`.

Les vérifications de cardinalité et d'intégrité référentielle sont des requêtes qu'un job exécute avant de publier :

```text
-- Cardinality: the key must be unique
SELECT count(*) AS row_count, count(DISTINCT order_id) AS distinct_keys
FROM contoso.silver.orders;

-- Referential: orders without a known customer
SELECT count(*) AS orphans
FROM contoso.silver.orders AS o
LEFT ANTI JOIN contoso.silver.customers AS c ON o.customer_id = c.customer_id;
```

```text
# Fail the task when a check doesn't pass
stats = spark.sql("""SELECT count(*) AS n, count(DISTINCT order_id) AS k
                     FROM contoso.silver.orders""").first()
if stats.n != stats.k:
    raise ValueError(f"{stats.n - stats.k} duplicate order_id values")
```

> **Piège d'examen.** Une `PRIMARY KEY` dans Unity Catalog n'empêche pas les doublons : elle est informationnelle, utilisée par l'optimiseur et par les outils. Pour garantir l'unicité, dédoublonnez pendant le chargement (`MERGE` sur la clé) et testez-la.

<!-- section: type-checks | objectives: 3.4.2 -->
## Vérifications de type de données

Les problèmes de type arrivent dans des chaînes : un `amount` CSV valant `"12,50"`, une date écrite `"31/12/2026"`. Vérifiez avant de convertir.

| Exigence | Technique |
| --- | --- |
| Trouver les valeurs qui ne se convertissent pas | `WHERE amount IS NOT NULL AND try_cast(amount AS DECIMAL(12, 2)) IS NULL` |
| Voir le type d'une expression | `typeof(expr)` |
| Voir le schéma d'une table ou d'un DataFrame | `DESCRIBE TABLE t`, `df.printSchema()`, `df.dtypes` |
| Lire des fichiers dont les types sont connus | Fournissez un schéma : une chaîne DDL ou un `StructType` |
| Laisser Auto Loader déduire les vrais types au lieu de chaînes | `cloudFiles.inferColumnTypes` = `true` |
| Imposer le type de quelques colonnes tout en déduisant les autres | `cloudFiles.schemaHints`, par exemple `"amount decimal(12,2), order_day date"` |
| Conserver les valeurs qui ne correspondent pas au schéma | La colonne de données récupérées `_rescued_data` |

```text
-- Count the rows whose amount isn't a valid decimal
SELECT count(*) AS bad_amounts
FROM contoso.bronze.orders_raw
WHERE amount IS NOT NULL
  AND try_cast(amount AS DECIMAL(12, 2)) IS NULL;
```

```text
orders = (spark.readStream.format("cloudFiles")
    .option("cloudFiles.format", "csv")
    .option("cloudFiles.schemaLocation", "/Volumes/contoso/bronze/_schemas/orders")
    .option("cloudFiles.schemaHints", "amount decimal(12,2), order_day date")
    .load("/Volumes/contoso/landing/orders/"))
```

La **colonne de données récupérées** (rescued data column) capture, sous forme d'objet JSON avec le chemin du fichier source, les valeurs qui ne s'analysent pas selon le schéma : une colonne absente du schéma, un type incompatible ou une différence de casse. Auto Loader ajoute automatiquement `_rescued_data` quand il déduit le schéma ; définissez `rescuedDataColumn` pour la renommer ou pour la conserver avec un schéma que vous fournissez. Une étape silver dirige ensuite les lignes où `_rescued_data IS NOT NULL` vers une table de quarantaine.

Quand une table Delta existe déjà, une écriture dont le type de colonne est incompatible avec la table est rejetée par l'application du schéma (section suivante) : la vérification de type a lieu à l'écriture, même si vous avez oublié de convertir.

> **Piège d'examen.** Par défaut, Auto Loader déduit les colonnes JSON et CSV en `STRING` : une erreur de type ne fait donc pas échouer l'ingestion, elle apparaît plus tard lors d'une conversion. Quand l'exigence est « conserver les valeurs brutes, ne jamais perdre une ligne », c'est le comportement voulu : convertissez dans la couche silver avec `try_cast`.

<!-- section: schema-enforcement-drift | objectives: 3.4.3 -->
## Application du schéma et dérive de schéma

**Application du schéma** (schema enforcement) : une écriture dans une table Delta dont les colonnes ne correspondent pas au schéma de la table échoue, sauf si l'évolution du schéma est activée pour cette écriture. Sans évolution, `UPDATE SET *` et `INSERT *` dans un `MERGE` ne mettent à jour que les colonnes de la cible et ignorent les colonnes supplémentaires de la source.

La **dérive de schéma** (colonnes nouvelles, manquantes ou retypées dans la source) se gère en choisissant où l'évolution est autorisée :

| Exigence | Paramètre |
| --- | --- |
| Ajouter les nouvelles colonnes de la source lors d'un ajout | `.option("mergeSchema", "true")` |
| Ajouter de nouvelles colonnes pendant un merge | `MERGE WITH SCHEMA EVOLUTION INTO` (Databricks Runtime 15.4 LTS et versions ultérieures) |
| Ajouter de nouvelles colonnes pendant un `INSERT` | `INSERT WITH SCHEMA EVOLUTION INTO` (Databricks Runtime 18.1 et versions ultérieures ; `mergeSchema` avant) |
| Remplacer le schéma et le partitionnement lors d'un remplacement | `.option("overwriteSchema", "true")` (pas avec le remplacement dynamique de partitions) |
| Renommer ou supprimer une colonne sans réécrire les fichiers | Activez le mappage de colonnes, puis `RENAME COLUMN` / `DROP COLUMN` |
| Faire évoluer le schéma pour toutes les écritures de la session | `spark.databricks.delta.schema.autoMerge.enabled` : déconseillé en production |

Les modifications de schéma prises en charge sont l'ajout de colonnes, la réorganisation, le renommage et l'élargissement de type. Une mise à jour du schéma entre en conflit avec les écritures simultanées et **arrête les flux qui lisent la table**. La suppression d'une colonne avec le mappage de colonnes ne touche que les métadonnées : pour purger les données, exécutez `REORG TABLE`, puis `VACUUM`.

```text
(new_orders_df.write
   .option("mergeSchema", "true")
   .mode("append")
   .saveAsTable("contoso.silver.orders"))
```

Pour les fichiers, le paramètre `cloudFiles.schemaEvolutionMode` d'Auto Loader décide de l'effet d'une nouvelle colonne :

| Mode | Quand une nouvelle colonne apparaît |
| --- | --- |
| `addNewColumns` (par défaut sans schéma fourni) | Le flux échoue avec `UnknownFieldException` après avoir ajouté la colonne au schéma ; un redémarrage reprend avec le nouveau schéma. Les types des colonnes existantes ne changent pas |
| `addNewColumnsWithTypeWidening` (préversion publique, Databricks Runtime 16.4 et versions ultérieures) | Idem, et les types pris en charge sont élargis (`int` vers `long`) ; les changements non pris en charge vont dans la colonne de données récupérées |
| `rescue` | Le schéma n'évolue jamais et le flux n'échoue pas ; les nouvelles colonnes vont dans la colonne de données récupérées |
| `failOnNewColumns` | Le flux échoue et reste en échec jusqu'à ce que vous mettiez à jour le schéma ou retiriez le fichier |
| `none` (par défaut avec un schéma fourni) | Les nouvelles colonnes sont ignorées ; rien n'est récupéré sauf si `rescuedDataColumn` est défini |

`addNewColumns` n'est pas autorisé quand le schéma du flux est fourni (`.schema(...)`) ; il fonctionne quand les types connus sont donnés par `cloudFiles.schemaHints`, qu'Auto Loader n'utilise que si aucun schéma n'est fourni. L'historique du schéma se trouve dans le dossier `_schemas` de `cloudFiles.schemaLocation`. Exécutez les flux en mode `addNewColumns` dans un job Lakeflow avec des nouvelles tentatives, pour que l'échec attendu redémarre automatiquement.

> **Piège d'examen.** Avec `addNewColumns`, le premier échec est voulu, ce n'est pas un bogue. « Les nouvelles colonnes doivent apparaître dans la table sans intervention manuelle » signifie `addNewColumns` plus un redémarrage automatique ; « le flux ne doit jamais s'arrêter » signifie `rescue` ; « un ingénieur doit examiner chaque changement de schéma » signifie `failOnNewColumns`.

<!-- section: expectations | objectives: 3.4.4 -->
## Attentes dans les pipelines déclaratifs Lakeflow Spark

Une **attente** (expectation) est une contrainte SQL booléenne nommée, appliquée à chaque enregistrement d'une table de diffusion en continu (streaming table), d'une vue matérialisée ou d'une vue temporaire d'un pipeline. L'action décide du sort des enregistrements qui ne la respectent pas.

| Action | SQL | Python | Enregistrements invalides | Métriques |
| --- | --- | --- | --- | --- |
| warn (par défaut) | `EXPECT (expr)` | `@dp.expect` | Écrits dans la cible | Oui |
| drop | `EXPECT (expr) ON VIOLATION DROP ROW` | `@dp.expect_or_drop` | Supprimés avant l'écriture | Oui, nombre de lignes supprimées |
| fail | `EXPECT (expr) ON VIOLATION FAIL UPDATE` | `@dp.expect_or_fail` | La mise à jour échoue ; une mise à jour de table est annulée de façon atomique | Non |

```text
CREATE OR REFRESH STREAMING TABLE contoso.silver.orders (
  CONSTRAINT valid_id     EXPECT (order_id IS NOT NULL) ON VIOLATION FAIL UPDATE,
  CONSTRAINT valid_amount EXPECT (amount >= 0)          ON VIOLATION DROP ROW,
  CONSTRAINT known_store  EXPECT (store_id IS NOT NULL)
)
AS SELECT * FROM STREAM(contoso.bronze.orders);
```

```text
from pyspark import pipelines as dp

rules = {"valid_amount": "amount >= 0", "valid_qty": "quantity BETWEEN 1 AND 1000"}

@dp.table(comment="Orders that pass every rule")
@dp.expect_or_fail("valid_id", "order_id IS NOT NULL")
@dp.expect_all_or_drop(rules)
def orders_silver():
    return spark.readStream.table("contoso.bronze.orders")
```

Règles à connaître :

- La contrainte est une expression SQL booléenne évaluée pour chaque enregistrement : pas de fonction Python, pas d'appel externe, pas de sous-requête sur une autre table. Les noms sont uniques par jeu de données.
- `expect_all`, `expect_all_or_drop` et `expect_all_or_fail` prennent un dictionnaire de règles et n'existent qu'en Python ; SQL déclare plusieurs clauses `CONSTRAINT` mais ne peut pas les regrouper.
- Avec fail, un pipeline déclenché fait échouer ce seul flux (les flux parallèles continuent) ; un pipeline continu arrête le flux et les flux qui en dépendent. Corrigez le code ou les données avant de relancer.
- Les métriques apparaissent dans l'onglet **Data quality** du jeu de données dans l'interface du pipeline et dans le **journal des événements** du pipeline. Il n'y en a aucune pour fail, ni pour les vues tant qu'elles ne sont pas interrogées. Les tables de diffusion en continu et vues matérialisées créées dans Databricks SQL (pipeline autonome) n'ont pas d'onglet Data quality : interrogez le journal des événements.
- Les attentes ne sont pas prises en charge avec `AUTO CDC FROM SNAPSHOT`, ni sur les tables ciblées par des flux `REPLACE WHERE`.
- L'ancien `import dlt` et `@dlt.expect` fonctionnent encore, mais `from pyspark import pipelines as dp` est le module actuel.

Pour conserver les enregistrements incorrects au lieu de les perdre, utilisez un modèle de **quarantaine** : une table avec les règles en attentes drop, et une seconde table qui sélectionne la condition inverse.

```text
@dp.table
def orders_quarantine():
    return (spark.readStream.table("contoso.bronze.orders")
            .where("NOT (amount >= 0 AND quantity BETWEEN 1 AND 1000)"))
```

| Exigence | Choix |
| --- | --- |
| Tout charger, mesurer la qualité | warn |
| Publier uniquement les lignes valides, compter les rejets | drop |
| Une violation signifie une entrée corrompue : arrêter et alerter | fail |
| Publier les lignes valides et garder les rejets pour examen | drop + table de quarantaine |
| Rejeter une écriture incorrecte dans une table hors d'un pipeline | Contrainte `CHECK` / `NOT NULL` |

> **Piège d'examen.** Une attente sans clause `ON VIOLATION` ne filtre rien : les lignes invalides arrivent dans la cible et seules les métriques les montrent. « Les lignes invalides ne doivent pas atteindre la table silver » exige `DROP ROW` (ou fail).

<!-- section: key-points -->
## Points clés

- Seules `NOT NULL` et `CHECK` sont appliquées sur les tables Delta ; les clés primaires, étrangères et uniques sont informationnelles.
- L'ajout d'une contrainte valide les lignes existantes ; une écriture qui la viole fait échouer toute la transaction.
- Détectez les types incorrects avec `try_cast(...) IS NULL` ; fixez les types avec des indications de schéma ou un schéma explicite ; gardez le reste dans `_rescued_data`.
- L'application du schéma rejette les écritures incompatibles ; `mergeSchema` ou `WITH SCHEMA EVOLUTION` autorise les nouvelles colonnes ; `overwriteSchema` remplace le schéma.
- Auto Loader `addNewColumns` échoue une fois puis évolue au redémarrage ; `rescue` n'échoue jamais ; `failOnNewColumns` vous attend.
- Attentes : warn par défaut, `DROP ROW` pour filtrer, `FAIL UPDATE` pour arrêter ; métriques dans l'onglet Data quality et le journal des événements.
