Unity Catalog organise tous les actifs de données d'un compte Azure Databricks dans une seule hiérarchie et les gouverne en un seul endroit. Le DP-750 vous demande de concevoir cette hiérarchie (noms, catalogues par environnement, isolation), d'écrire le DDL qui crée les catalogues, schémas, volumes, tables, vues, vues matérialisées et catalogues étrangers, de prévoir ce qui se passe quand une table managée ou externe est modifiée ou supprimée, et de configurer un Genie Agent pour que les utilisateurs métier trouvent les données en langage naturel.

<!-- section: object-model-naming | objectives: 1.2.1 -->
## Le modèle objet et les conventions d'affectation de noms

Les actifs de données et d'IA utilisent un espace de noms à trois niveaux, `catalog.schema.object`, où l'objet est une table, une vue, une vue matérialisée, un volume, une fonction ou un modèle. Les informations d'identification de stockage, les emplacements externes, les connexions et les partages se trouvent directement sous le **metastore**. Chaque objet est un **objet sécurisable** : on y accorde des privilèges, dont ses enfants héritent.

```text
Metastore (one per region, attached to workspaces)
├── Storage credential, external location, connection, share, recipient
└── Catalog                       dev_sales
    └── Schema                    dev_sales.crm
        ├── Table / view / MV     dev_sales.crm.orders
        ├── Volume                dev_sales.crm.landing
        └── Function              dev_sales.crm.mask_email
```

Les recommandations de Databricks pour la hiérarchie :

- Les catalogues correspondent en général à **une étendue d'environnement, une équipe, une unité commerciale**, ou à une combinaison. L'isolation des données commence au niveau du catalogue, pas du metastore : un seul metastore régional sert le développement, le test et la production.
- Privilégiez le **stockage managé au niveau du catalogue** comme unité principale d'isolation physique.
- Quand un environnement et ses données ont la même exigence d'isolation, **liez le catalogue** à des espaces de travail précis (liaison espace de travail-catalogue), éventuellement en lecture seule.
- Attribuez la propriété des catalogues et schémas de production à des **groupes**, pas à des personnes, et réservez `MODIFY` sur les tables de production aux principaux de service.

Une convention d'affectation de noms rend ces décisions visibles. Un modèle courant :

| Exigence | Convention | Exemple |
| --- | --- | --- |
| Séparer développement, test et production | Préfixe d'environnement sur le catalogue | `dev_finance`, `test_finance`, `prod_finance` |
| Isoler une unité commerciale | Un catalogue par unité, lié à ses espaces de travail | `prod_hr` lié à l'espace de travail RH |
| Couches médaillon dans un environnement | Un schéma par couche ou par domaine | `prod_finance.bronze`, `prod_finance.silver`, `prod_finance.gold` |
| Données partagées hors de l'organisation | Des objets dédiés et préparés, ajoutés à un partage par consommateur | Partage `fabrikam_sales` qui expose `prod_sales.shared.orders_summary` |
| Code promu d'un environnement à l'autre | Mêmes noms de schémas et de tables, seul le catalogue change | Paramétrez le nom du catalogue dans les jobs et les bundles |

Les noms qui contiennent des caractères spéciaux comme le trait d'union doivent être entourés d'accents graves (`` `prod-finance` ``) ; les traits de soulignement n'en ont pas besoin, d'où leur préférence. Le partage externe utilise OpenSharing (le « partage Delta » du guide d'étude) : un partage est un ensemble en lecture seule de tables et d'autres actifs, et les destinataires sont définis par metastore.

> **Piège d'examen.** Un metastore distinct par environnement est la mauvaise réponse : Azure Databricks attache un metastore par région, et l'isolation s'obtient avec des catalogues, du stockage au niveau du catalogue et la liaison espace de travail-catalogue.

<!-- section: catalogs | objectives: 1.2.2 -->
## Créer des catalogues

```text
CREATE CATALOG IF NOT EXISTS prod_finance
  MANAGED LOCATION 'abfss://finance@stcontosoprod.dfs.core.windows.net/uc'
  COMMENT 'Production finance data';
```

- Exige `CREATE CATALOG` sur le metastore, et `CREATE MANAGED STORAGE` sur l'emplacement externe qui couvre le chemin `MANAGED LOCATION` (le chemin de l'emplacement externe ou un sous-chemin).
- `MANAGED LOCATION` est facultatif mais fortement recommandé ; sans lui, les tables managées vont dans le stockage racine du metastore. Si le metastore n'a pas de stockage racine, l'emplacement est **obligatoire**.
- Un nouveau catalogue contient deux schémas : `default` et `information_schema`.
- Par défaut, un catalogue est accessible depuis **tous les espaces de travail** attachés au metastore. Pour le restreindre, décochez **All workspaces have access** et utilisez **Assign to workspaces** (l'espace de travail actuel doit être inclus), puis changez éventuellement le niveau d'accès de Read & Write à Read Only.
- Le calcul doit être en DBR 11.3 ou version ultérieure avec un mode d'accès compatible Unity Catalog (Standard ou Dedicated) ; les entrepôts SQL prennent toujours en charge Unity Catalog.

Les autres types de catalogues utilisent une autre clause :

| Type de catalogue | Clause | Privilège exigé |
| --- | --- | --- |
| Standard | `MANAGED LOCATION` (facultatif) | `CREATE CATALOG` sur le metastore |
| Étranger (Lakehouse Federation) | `CREATE FOREIGN CATALOG ... USING CONNECTION` | En plus, propriétaire de la connexion ou `CREATE FOREIGN CATALOG` sur celle-ci |
| Partagé (côté destinataire OpenSharing) | `USING SHARE provider.share` | En plus, `USE PROVIDER` sur le metastore ou propriété du fournisseur |

<!-- section: schemas | objectives: 1.2.3 -->
## Créer des schémas

```text
CREATE SCHEMA IF NOT EXISTS prod_finance.silver
  MANAGED LOCATION 'abfss://finance@stcontosoprod.dfs.core.windows.net/uc/silver'
  COMMENT 'Cleansed finance data';
```

- `SCHEMA` et `DATABASE` sont synonymes. Dans Unity Catalog, la clause est `MANAGED LOCATION` ; `LOCATION` est la forme du metastore Hive.
- Exige `USE CATALOG` et `CREATE SCHEMA` sur le catalogue parent, accordés par le propriétaire du catalogue ou un administrateur du metastore ; un emplacement managé exige aussi `CREATE MANAGED STORAGE` sur l'emplacement externe.
- Les tables et volumes managés sont stockés dans l'emplacement managé le plus spécifique : schéma, puis catalogue, puis metastore. Un emplacement au niveau du schéma isole une couche ou un jeu de données réglementé dans son propre conteneur.

> **Piège d'examen.** `USE CATALOG` et `USE SCHEMA` ne donnent jamais à eux seuls accès aux données ; ce sont des prérequis. `CREATE SCHEMA` sans `USE CATALOG` échoue.

<!-- section: volumes | objectives: 1.2.4 -->
## Créer des volumes

Les volumes gouvernent les fichiers **non tabulaires** de tout format (fichiers CSV déposés, images, PDF, wheels, points de contrôle). Les tables gouvernent les données tabulaires.

```text
CREATE VOLUME prod_finance.bronze.landing;

CREATE EXTERNAL VOLUME prod_finance.bronze.erp_drop
  LOCATION 'abfss://erp@stcontosoraw.dfs.core.windows.net/exports';

GRANT READ VOLUME ON VOLUME prod_finance.bronze.erp_drop TO `data-engineers`;
-- Service principal, identified by its application ID
GRANT WRITE VOLUME ON VOLUME prod_finance.bronze.landing TO `5f0c1e2a-7b3d-4c8e-9a61-2d4b7e9f0a13`;
```

| | Volume managé | Volume externe |
| --- | --- | --- |
| Stockage | Emplacement de stockage managé du schéma | Un chemin existant sous un emplacement externe |
| Au `DROP VOLUME` | Fichiers marqués pour suppression (rétention de 7 jours) | Les fichiers restent dans le stockage cloud |
| Accès | Uniquement par Unity Catalog | Unity Catalog gouverne, les outils externes peuvent utiliser des URI directs |
| Privilège de création | `CREATE VOLUME` sur le schéma | En plus, `CREATE EXTERNAL VOLUME` sur l'emplacement externe |

Les deux exigent `USE CATALOG` et `USE SCHEMA`. Les fichiers sont adressés sous la forme `/Volumes/catalog/schema/volume/path/file`. `READ VOLUME` lit les fichiers, `WRITE VOLUME` les ajoute, les modifie ou les supprime. Les volumes exigent un calcul Unity Catalog en DBR 13.3 LTS ou version ultérieure.

> **Piège d'examen.** Les fichiers d'un volume ne peuvent pas être inscrits comme table. Pour les interroger comme une table, ingérez-les dans une table managée, ou créez une table externe sur un chemin situé hors de tout volume.

<!-- section: tables-views | objectives: 1.2.5 -->
## Créer des tables, des vues et des vues matérialisées

Les **tables managées** sont le type par défaut et recommandé : Unity Catalog gère le stockage, la disposition et l'optimisation (optimisation prédictive, clustering liquide automatique). Elles sont en Delta par défaut ; ajoutez `USING iceberg` pour Iceberg. Les **tables externes** stockent les données à un chemin que vous indiquez sous un emplacement externe ; Unity Catalog gouverne les métadonnées mais pas le cycle de vie des données. Utilisez-les pour des données existantes dans des formats que les tables managées ne prennent pas en charge (JSON, Avro, CSV...) ou pour un accès direct par des clients non Databricks.

```text
-- Managed Delta table
CREATE TABLE prod_finance.silver.invoices (
  invoice_id BIGINT NOT NULL,
  customer_id BIGINT,
  amount DECIMAL(18,2),
  invoice_date DATE
) COMMENT 'Cleansed invoices';

-- Managed table from a query (CTAS)
CREATE OR REPLACE TABLE prod_finance.gold.revenue_by_day AS
SELECT invoice_date, SUM(amount) AS revenue
FROM prod_finance.silver.invoices GROUP BY invoice_date;

-- External table
CREATE TABLE prod_finance.bronze.erp_invoices_raw
USING CSV OPTIONS (header 'true')
LOCATION 'abfss://erp@stcontosoraw.dfs.core.windows.net/tables/invoices';
```

| Type de table | Privilèges |
| --- | --- |
| Managée | `USE CATALOG`, `USE SCHEMA`, `CREATE TABLE` sur le schéma |
| Externe | Les mêmes, plus `CREATE EXTERNAL TABLE` sur l'emplacement externe |

Les **vues** ne stockent que le texte de la requête. `CREATE TABLE` sur un schéma permet aussi de créer des vues. Pour interroger une vue, un utilisateur a besoin de `SELECT` sur la vue, plus `USE CATALOG` et `USE SCHEMA`. Sur les entrepôts SQL, le calcul Standard et le calcul Dedicated en DBR 15.4 LTS ou version ultérieure, Unity Catalog vérifie les autorisations du **propriétaire de la vue** sur les tables sous-jacentes : les utilisateurs n'ont pas besoin de `SELECT` sur celles-ci. Sur le calcul Dedicated en DBR 15.3 ou antérieur, les utilisateurs ont aussi besoin de `SELECT` sur les tables de base. Les vues temporaires ne sont inscrites dans aucun schéma.

Les **vues matérialisées** stockent des résultats précalculés dans une table Delta et les actualisent de façon incrémentielle quand c'est possible, au moyen d'un pipeline serverless qu'Azure Databricks crée.

```text
CREATE OR REPLACE MATERIALIZED VIEW prod_finance.gold.revenue_by_region
  SCHEDULE EVERY 1 HOUR
AS SELECT region, SUM(amount) AS revenue
   FROM prod_finance.silver.invoices GROUP BY region;

CREATE OR REPLACE MATERIALIZED VIEW prod_finance.gold.open_orders
  TRIGGER ON UPDATE
AS SELECT * FROM prod_finance.silver.orders WHERE status = 'OPEN';

REFRESH MATERIALIZED VIEW prod_finance.gold.revenue_by_region;
REFRESH MATERIALIZED VIEW prod_finance.gold.revenue_by_region FULL ASYNC;
```

- Créées uniquement avec un **entrepôt SQL pro ou serverless** ou dans un pipeline. Le créateur a besoin de `SELECT` sur les tables de base, de `USE CATALOG`, de `USE SCHEMA` et de `CREATE MATERIALIZED VIEW` sur le schéma, et en devient le propriétaire.
- Planifications : `SCHEDULE EVERY n HOURS` (1 à 72), `DAYS` (1 à 31) ou `WEEKS` (1 à 8), ou `SCHEDULE CRON` à six champs avec `AT TIME ZONE`. `TRIGGER ON UPDATE` actualise quand une source change, au plus une fois par minute, avec 10 sources au maximum.
- `REFRESH` est synchrone par défaut ; `ASYNC` rend la main immédiatement ; `FULL` retraite toutes les données sources. Le propriétaire et les principaux qui ont le privilège `REFRESH` peuvent actualiser.
- L'actualisation incrémentielle exige des sources Delta avec le suivi des lignes (row tracking) activé ; Databricks recommande aussi les vecteurs de suppression.
- Pas de voyage dans le temps sur une vue matérialisée ; `CLUSTER BY` est préférable à `PARTITIONED BY`.

| Exigence | Objet |
| --- | --- |
| Requête réutilisable, toujours à jour, sans stockage | Vue |
| Agrégation coûteuse lue par de nombreux tableaux de bord, actualisée selon une planification | Vue matérialisée |
| Résultat intermédiaire limité à la session d'un notebook | Vue temporaire |
| Données détenues et optimisées par Unity Catalog | Table managée |
| Fichiers existants que d'autres moteurs lisent et écrivent directement | Table externe |

<!-- section: foreign-catalogs | objectives: 1.2.6 -->
## Les catalogues étrangers et les connexions

**Lakehouse Federation** interroge des systèmes externes sans copier les données. Avec la **fédération de requêtes**, Unity Catalog pousse les requêtes par JDBC vers des sources comme SQL Server, PostgreSQL, MySQL, Oracle, Snowflake, Amazon Redshift, Google BigQuery ou un autre espace de travail Databricks. Avec la **fédération de catalogues**, Databricks lit directement les tables étrangères dans le stockage d'objets (par exemple un metastore Hive hérité), ce qui est moins coûteux et plus rapide. Les deux sont en **lecture seule**.

Étapes : créez une **connexion** (hôte, port, informations d'identification), créez à partir d'elle un **catalogue étranger**, accordez des privilèges sur ses objets, exécutez les requêtes.

```text
CREATE CONNECTION sqlsrv_erp TYPE sqlserver
OPTIONS (
  host 'erp-sql.contoso.com',
  port '1433',
  user secret ('erp-scope', 'sql-user'),
  password secret ('erp-scope', 'sql-password')
);

CREATE FOREIGN CATALOG IF NOT EXISTS erp_live USING CONNECTION sqlsrv_erp
OPTIONS (database 'ErpDb');

GRANT USE CATALOG ON CATALOG erp_live TO `finance-analysts`;
```

| Besoin | Exigence |
| --- | --- |
| Créer la connexion | Administrateur du metastore ou `CREATE CONNECTION` sur le metastore |
| Créer le catalogue étranger | `CREATE CATALOG` sur le metastore et propriété de la connexion, ou `CREATE FOREIGN CATALOG` sur celle-ci |
| Calcul | DBR 13.3 LTS ou version ultérieure en mode Standard ou Dedicated, ou un entrepôt SQL pro ou serverless, avec un accès réseau à la source |

Stockez les informations d'identification dans une étendue de secrets et référencez-les avec `secret()` plutôt qu'en texte clair. MySQL utilise un espace de noms à deux niveaux : son catalogue étranger n'a pas besoin de l'option `database`. Quand une source prend en charge à la fois la fédération et **Lakeflow Connect**, Databricks recommande Lakeflow Connect pour les gros volumes et la faible latence : la fédération convient aux rapports ad hoc, aux preuves de concept et à l'accès en direct avec un minimum de déplacement de données.

> **Piège d'examen.** On ne peut pas écrire dans un catalogue étranger. « Charger les données toutes les heures dans des tables Delta » est une exigence d'ingestion (Lakeflow Connect, notebook, Azure Data Factory), pas de fédération.

<!-- section: ddl-managed-external | objectives: 1.2.7 -->
## Le DDL sur les tables managées et externes

| Instruction | Table managée | Table externe |
| --- | --- | --- |
| `DROP TABLE` | Récupérable pendant 7 jours par défaut, puis les fichiers de données sont purgés | Métadonnées supprimées, les fichiers de données restent dans le stockage |
| `UNDROP TABLE` | Pendant la période de récupération | Exige aussi `CREATE EXTERNAL TABLE` sur l'emplacement externe |
| `ALTER TABLE ... SET MANAGED` | Sans objet | Convertit une table externe Delta en table managée (DBR 17.3 LTS+ ou serverless) |
| Métadonnées modifiées hors de Databricks | Sans objet | Exécutez `MSCK REPAIR TABLE ... SYNC METADATA` |

```text
ALTER TABLE prod_finance.silver.invoices ADD COLUMN currency STRING COMMENT 'ISO 4217 code';
ALTER TABLE prod_finance.silver.invoices ALTER COLUMN amount COMMENT 'Amount incl. tax';
ALTER TABLE prod_finance.silver.invoices ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE prod_finance.silver.invoices SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name');
ALTER TABLE prod_finance.silver.invoices RENAME COLUMN currency TO currency_code;
ALTER TABLE prod_finance.silver.invoices OWNER TO `finance-engineers`;

SHOW TABLES DROPPED IN prod_finance.silver;
UNDROP TABLE prod_finance.silver.invoices;
UNDROP TABLE WITH ID '6ca7be55-8f58-47a7-85ee-7a59082fd17a';

ALTER TABLE prod_finance.bronze.erp_orders SET MANAGED;
ALTER TABLE prod_finance.bronze.erp_orders UNSET MANAGED;
```

- `ADD COLUMN` exige `MODIFY` ; on ne peut pas définir de `DEFAULT` en ajoutant une colonne à une table Delta (les lignes existantes reçoivent `NULL`).
- `RENAME COLUMN` et `DROP COLUMN` exigent le **mappage de colonnes** (column mapping) sur la table Delta. `SET NOT NULL` valide les données existantes. `ALTER COLUMN ... TYPE` élargit le type (DBR 15.2+).
- Supprimer ou restaurer une table exige d'en être propriétaire ou d'avoir `MANAGE`. `UNDROP` restaure les privilèges, les colonnes et les propriétés, mais pas les contraintes de clé primaire et étrangère. Si une table du même nom existe, renommez-la d'abord ; si plusieurs tables supprimées portent le même nom, utilisez `WITH ID` avec l'ID donné par `SHOW TABLES DROPPED`.
- La période de récupération se définit au niveau du catalogue ou du schéma (0 heure, ou 7 à 30 jours) ; le paramètre du schéma l'emporte.
- `SET MANAGED` copie les données sans interruption, puis bloque les écritures quelques minutes pendant la bascule. Les anciens fichiers sont conservés 14 jours pour que `UNSET MANAGED` puisse revenir en arrière. Exige la propriété ou `MANAGE` ; n'ajoutez pas `MOVE` ni `COPY` pour une table externe.

> **Piège d'examen.** « Supprimer la table mais garder les fichiers pour un autre moteur » désigne une table externe. « Une table managée a été supprimée hier » se règle avec `UNDROP TABLE`, pas avec une restauration depuis le stockage.

<!-- section: genie-instructions | objectives: 1.2.8 -->
## Configurer les instructions Genie pour la découverte de données

AI/BI Genie permet aux utilisateurs métier de poser des questions sur les données en langage naturel. L'environnement configuré s'appelle désormais un **Genie Agent** (anciennement Genie space). Les analystes le configurent avec des données Unity Catalog, des exemples de requêtes SQL, des instructions et des ressources approuvées (trusted assets).

- Les données doivent être inscrites dans Unity Catalog : jusqu'à **50** tables, vues ou vues de métriques.
- Calcul : un **entrepôt SQL pro ou serverless**. L'auteur a besoin du droit Databricks SQL, de CAN USE sur l'entrepôt, de `SELECT` sur les données et d'au moins CAN EDIT sur l'agent ; les créateurs reçoivent CAN MANAGE.
- Les utilisateurs finaux ont besoin de CAN VIEW ou CAN RUN sur l'agent. L'accès à l'entrepôt utilise les informations d'identification intégrées de l'auteur, mais **l'accès aux données est toujours évalué avec l'identité Unity Catalog de l'utilisateur final**.

| Configuration | À utiliser pour |
| --- | --- |
| Commentaires de tables et de colonnes Unity Catalog | Descriptions par défaut que Genie lit ; modifiez-les dans l'agent ou rétablissez la valeur Unity Catalog |
| Exemples de requêtes SQL, statiques ou paramétrées | Enseigner le SQL des questions courantes ; une requête paramétrée utilisée telle quelle donne une réponse vérifiée |
| Fonctions SQL inscrites dans Unity Catalog | Les questions qu'une requête ne peut pas traiter ; les utilisateurs ont besoin de `EXECUTE` |
| Expressions SQL : mesures, filtres, champs | Définitions métier réutilisables avec synonymes, appliquées exactement telles qu'écrites |
| Relations de jointure | Jointures plusieurs-à-un, un-à-plusieurs, un-à-un ; les clés primaires et étrangères sont importées automatiquement |
| Instructions générales (texte) | Uniquement le contexte global qui n'entre dans aucun autre format |
| Correspondance des invites (assistance au format, correspondance d'entités) | Associer les valeurs saisies aux valeurs des colonnes ; la correspondance d'entités couvre jusqu'à 120 colonnes de type chaîne |

Limites : 100 instructions par agent (chaque exemple de requête, chaque fonction et le bloc entier d'instructions générales comptent pour une) et 200 éléments du magasin de connaissances (descriptions de tables, jointures, expressions SQL). Les modifications du magasin de connaissances sont limitées à l'agent et **ne changent pas les métadonnées Unity Catalog**. Les exemples de requêtes et les fonctions sont des **ressources approuvées**. Genie exclut de la correspondance des invites les tables avec filtre de lignes et les colonnes masquées ; désactivez la correspondance d'entités sur les vues qui les référencent.

> **Conseil d'examen.** Pour la logique métier, préférez une expression SQL ou un exemple de requête à une instruction texte : Genie applique le SQL exactement, alors que le texte est interprété. Évitez les instructions contradictoires.

<!-- section: key-points -->
## Points clés

- Un metastore par région ; isolez avec des catalogues par environnement ou par unité, du stockage au niveau du catalogue et la liaison espace de travail-catalogue.
- `CREATE CATALOG` exige le privilège sur le metastore ; `MANAGED LOCATION` exige `CREATE MANAGED STORAGE` sur l'emplacement externe.
- Les volumes et tables managés sont supprimés avec leur objet (après une période de récupération) ; les externes conservent leurs fichiers.
- Les volumes contiennent des fichiers, pas des tables. Les vues stockent des requêtes ; les vues matérialisées stockent des résultats et exigent un entrepôt pro ou serverless.
- La fédération est en lecture seule : connexion, puis catalogue étranger, puis privilèges.
- `RENAME COLUMN` et `DROP COLUMN` exigent le mappage de colonnes ; `UNDROP` fonctionne 7 jours par défaut ; `SET MANAGED` convertit une table externe en table managée.
- Genie Agents : jusqu'à 50 objets de données, entrepôt pro ou serverless, SQL plutôt qu'instructions texte, privilèges propres aux utilisateurs finaux.
