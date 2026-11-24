Une conception de base de données DP-800 commence par les tables : types de données et tailles, index adaptés à la charge de travail, contraintes qui garantissent des données valides. Viennent ensuite les tables spécialisées (optimisées en mémoire, temporelles, de registre, externes, de graphe), le stockage JSON, les séquences et le partitionnement. Les questions montrent un `CREATE TABLE` à compléter, une exigence à associer à un type de table ou une limite de plateforme à respecter. Le T-SQL est présenté dans des blocs de texte brut.

<!-- section: tables-data-types | objectives: 1.1.1 -->
## Tables, types de données et tailles

Choisissez le plus petit type qui contient toutes les valeurs valides : des lignes plus petites signifient plus de lignes par page de 8 Ko, moins de lectures et des index plus petits.

| Exigence | Type | Remarques |
| --- | --- | --- |
| Nombres entiers | `tinyint` (0 à 255), `smallint`, `int`, `bigint` | 1, 2, 4, 8 octets |
| Montants, décimales exactes | `decimal(p, s)` | `float` et `real` sont approximatifs |
| Date et heure | `date`, `datetime2(n)`, `datetimeoffset(n)` | `datetime2` est plus précis que `datetime` ; `datetimeoffset` conserve le décalage horaire |
| Texte dans plusieurs alphabets | `nvarchar(n)` | Jusqu'à 4 000 caractères, ou `nvarchar(max)` jusqu'à 2 Go |
| Texte dans une seule page de codes | `varchar(n)` | Jusqu'à 8 000 octets ; avec un classement `_UTF8`, il stocke aussi l'Unicode |
| Clé unique globale | `uniqueidentifier` | `NEWID()` fragmente un index cluster ; `NEWSEQUENTIALID()` (uniquement dans un `DEFAULT`) non |
| Document JSON | `json` | Voir [Colonnes et index JSON](#json-columns) |

Un enregistrement dans la ligne est limité à **8 060 octets** ; les valeurs `max` sortent de la ligne quand elles n'y tiennent pas. Une table compte jusqu'à 1 024 colonnes. Options de colonne utiles : `NOT NULL`, `IDENTITY(seed, increment)`, colonnes calculées (`PERSISTED` stocke la valeur, et une colonne calculée déterministe peut être indexée) et `SPARSE` pour les colonnes presque toujours NULL.

Une table a au plus un **index cluster** (la table elle-même, triée sur sa clé) et jusqu'à 999 **index non cluster**. Limites de taille de clé : 900 octets pour une clé d'index cluster, 1 700 octets pour une clé d'index non cluster, 32 colonnes.

```text
CREATE TABLE Sales.OrderLine
(
    OrderLineID bigint IDENTITY(1, 1) NOT NULL,
    OrderID     int           NOT NULL,
    ProductID   int           NOT NULL,
    Quantity    smallint      NOT NULL,
    UnitPrice   decimal(10, 2) NOT NULL,
    Status      tinyint       NOT NULL,
    LineTotal   AS (Quantity * UnitPrice) PERSISTED,
    CONSTRAINT PK_OrderLine PRIMARY KEY CLUSTERED (OrderLineID)
);

-- Covering index: seek on ProductID, no lookup for Quantity and UnitPrice
CREATE NONCLUSTERED INDEX IX_OrderLine_Product
    ON Sales.OrderLine (ProductID)
    INCLUDE (Quantity, UnitPrice);

-- Filtered index: only the few open lines
CREATE NONCLUSTERED INDEX IX_OrderLine_Open
    ON Sales.OrderLine (OrderID)
    WHERE Status = 1;
```

La clé de l'index cluster doit être étroite, unique et toujours croissante ; les index non cluster servent les autres recherches ; `INCLUDE` évite les recherches de clés (key lookups) ; un index filtré couvre un sous-ensemble petit et bien défini.

> **Piège d'examen.** Les colonnes incluses n'aident ni une recherche (seek) ni un tri : seules les colonnes clés le font. Mettez les colonnes filtrées et triées dans la clé, et les colonnes retournées dans `INCLUDE`.

<!-- section: columnstore | objectives: 1.1.1 -->
## Index columnstore

Un index columnstore stocke chaque colonne séparément, compressée, dans des **groupes de lignes** (rowgroups) de 1 048 576 lignes au plus. Les analyses et agrégations ne lisent que les colonnes nécessaires et s'exécutent en mode batch.

| Type | Usage |
| --- | --- |
| Columnstore cluster (CCI) | La table elle-même est en colonnes : faits, journaux, historique. Un seul par table ; des index rowstore non cluster peuvent être ajoutés pour les recherches |
| Columnstore non cluster (NCCI) | Analytique en temps réel sur une table OLTP rowstore ; peut être filtré |
| CCI ordonné (`ORDER (col)`) | Segments triés : les filtres de plage ignorent des groupes de lignes |

```text
CREATE CLUSTERED COLUMNSTORE INDEX CCI_SalesHistory
    ON Sales.SalesHistory
    ORDER (SaleDate);

CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_OrderLine
    ON Sales.OrderLine (ProductID, Quantity, UnitPrice);
```

Un chargement en bloc d'au moins 102 400 lignes va directement dans des groupes de lignes compressés ; les insertions plus petites arrivent dans un **deltastore** rowstore que le moteur de tuples compresse à 1 048 576 lignes. Les suppressions ne font que marquer les lignes ; une mise à jour est une suppression plus une insertion. `ALTER INDEX ... REORGANIZE` fusionne les petits groupes de lignes et purge les lignes supprimées (`COMPRESS_ALL_ROW_GROUPS = ON` ferme aussi les deltastores). Dans Azure SQL Database, le columnstore n'est disponible ni en Basic ni en Standard en dessous de S3.

> **Piège d'examen.** Le columnstore répond à « agréger de gros volumes », pas à « retourner une ligne par sa clé ». Pour les recherches ponctuelles sur une table CCI, ajoutez un index rowstore non cluster.

<!-- section: memory-optimized-temporal | objectives: 1.1.2 -->
## Tables optimisées en mémoire et tables temporelles

Les **tables optimisées en mémoire** (OLTP en mémoire) résident en mémoire, avec un accès sans verrou ni latch : insertions à haut débit, état de session, préparation (staging), contention sur une table très sollicitée.

```text
CREATE TABLE dbo.ShoppingCart
(
    CartID    int IDENTITY(1, 1) NOT NULL PRIMARY KEY NONCLUSTERED,
    UserID    int NOT NULL,
    CreatedAt datetime2 NOT NULL,
    INDEX IX_User HASH (UserID) WITH (BUCKET_COUNT = 1000000)
)
WITH (MEMORY_OPTIMIZED = ON, DURABILITY = SCHEMA_AND_DATA);
```

| Option | Comportement |
| --- | --- |
| `SCHEMA_AND_DATA` (par défaut) | Journalisée, survit à un redémarrage ; clé primaire obligatoire |
| `SCHEMA_ONLY` | Seule la définition survit à un redémarrage : aucune E/S de journal, pour les données de préparation et transitoires |
| Index de hachage | Recherches d'égalité ; `BUCKET_COUNT` d'une à deux fois le nombre de clés distinctes (deux à trois fois quand les recherches d'égalité comptent plus que la mémoire) |
| Index non cluster | Plages et analyses ordonnées |
| Procédure compilée en mode natif | `WITH NATIVE_COMPILATION, SCHEMABINDING` et `BEGIN ATOMIC` ; n'accède qu'aux tables optimisées en mémoire |

SQL Server exige un groupe de fichiers `CONTAINS MEMORY_OPTIMIZED_DATA`. Dans Azure SQL Database, l'OLTP en mémoire existe dans les niveaux **Premium** et **Critique pour l'entreprise** (Business Critical), Hyperscale en prend en charge une partie, et Usage général (General Purpose), Standard et Basic ne le prennent pas en charge.

Les **tables temporelles versionnées par le système** conservent toutes les versions précédentes des lignes dans une table d'historique gérée par le moteur.

```text
CREATE TABLE HR.Employee
(
    EmployeeID   int NOT NULL PRIMARY KEY CLUSTERED,
    FullName     nvarchar(100) NOT NULL,
    AnnualSalary decimal(10, 2) NOT NULL,
    ValidFrom    datetime2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    ValidTo      datetime2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = HR.EmployeeHistory,
                              HISTORY_RETENTION_PERIOD = 6 MONTHS));

SELECT EmployeeID, FullName, AnnualSalary
FROM HR.Employee FOR SYSTEM_TIME AS OF '2026-01-01T00:00:00'
WHERE EmployeeID = 1000;
```

| Sous-clause | Lignes retournées |
| --- | --- |
| `AS OF t` | Versions valides à l'instant `t` |
| `FROM a TO b` | Versions actives dans l'intervalle, sauf celle qui commence exactement à `b` |
| `BETWEEN a AND b` | Idem, y compris celle qui commence exactement à `b` |
| `CONTAINED IN (a, b)` | Versions ouvertes et fermées à l'intérieur de l'intervalle |
| `ALL` | Lignes actuelles et lignes d'historique |

Règles : la table actuelle doit avoir une clé primaire (la table d'historique ne peut pas en avoir) ; les colonnes de période sont en `datetime2` et en **UTC** ; `HIDDEN` les exclut de `SELECT *` ; `INSERT` et `UPDATE` ne peuvent pas les renseigner ; la table d'historique ne peut pas être modifiée directement ; pas de `TRUNCATE TABLE` tant que le versioning est actif ; pas de déclencheur `INSTEAD OF`.

> **Piège d'examen.** « Interroger les données telles qu'elles étaient lundi dernier » ou « récupérer une ligne écrasée » relève d'une table temporelle. « Prouver que personne, pas même un administrateur, n'a falsifié les données » relève du registre : un historique temporel peut être réécrit après désactivation du versioning.

<!-- section: ledger-external-graph | objectives: 1.1.2 -->
## Tables de registre, externes et de graphe

Les **tables de registre** (ledger ; SQL Server 2022 et versions ultérieures, Azure SQL Database, Azure SQL Managed Instance) rendent toute falsification des données **détectable** : les transactions sont hachées (SHA-256) dans une chaîne de type blockchain dont les condensés (digests) sont stockés hors de la base.

```text
-- Updatable ledger table: keeps a history table and a ledger view
CREATE TABLE Account.Balance
(
    CustomerID int NOT NULL PRIMARY KEY CLUSTERED,
    Balance    decimal(10, 2) NOT NULL
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = Account.BalanceHistory),
      LEDGER = ON);

-- Append-only ledger table: INSERT only, no history table
CREATE TABLE Security.SignInEvent
(
    EventID   bigint NOT NULL,
    EventTime datetime2 NOT NULL,
    Detail    nvarchar(400) NULL
)
WITH (LEDGER = ON (APPEND_ONLY = ON));
```

| Fait | Détail |
| --- | --- |
| Modifiable ou ajout uniquement | La table modifiable autorise `UPDATE`/`DELETE` et ajoute quatre colonnes générées ; la table d'ajout uniquement les bloque et en ajoute deux |
| Vue de registre | `Account.Balance_Ledger` liste chaque opération ; joignez `sys.database_ledger_transactions` pour l'utilisateur et l'heure de validation |
| Conversion | Une table existante ne peut pas devenir une table de registre, et une table de registre ne peut pas revenir en arrière : créez une nouvelle table et migrez |
| Base de données de registre | Toutes les tables sont des tables de registre ; impossible de revenir à une base normale |
| Condensés | Stockage automatique dans Stockage Blob Azure immuable (pas en LRS) ou dans Azure Confidential Ledger |
| Vérification | `sys.sp_verify_database_ledger_from_digest_storage` ou `sys.sp_verify_database_ledger` |
| Non pris en charge | `TRUNCATE TABLE`, tables en mémoire et de graphe, `SWITCH` de partition, `xml`, `sql_variant`, `vector` |

Les **tables externes** interrogent des fichiers sur place. Dans Azure SQL Database (virtualisation des données, indiquée en préversion sur Learn), l'accès est en lecture seule, pour des fichiers Parquet et CSV :

```text
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<strong password>';

CREATE DATABASE SCOPED CREDENTIAL LakeCredential
WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = '<SAS token without ?>';

CREATE EXTERNAL DATA SOURCE SalesLake
WITH (LOCATION = 'abs://sales@contosolake.blob.core.windows.net/',
      CREDENTIAL = LakeCredential);

CREATE EXTERNAL FILE FORMAT ParquetFormat WITH (FORMAT_TYPE = PARQUET);

CREATE EXTERNAL TABLE dbo.SalesArchive
(
    OrderID   int,
    OrderDate datetime2,
    Amount    decimal(10, 2)
)
WITH (LOCATION = 'archive/year=*/*.parquet',
      DATA_SOURCE = SalesLake,
      FILE_FORMAT = ParquetFormat);
```

Utilisez les préfixes `abs://` (Stockage Blob) ou `adls://` (Data Lake Storage Gen2) ; les informations d'identification peuvent aussi reposer sur une identité managée. `OPENROWSET(BULK ...)` sert à l'exploration ponctuelle. Dans Azure SQL Database, CETAS (`CREATE EXTERNAL TABLE AS SELECT`) n'est pas disponible, les tables externes n'ont pas de statistiques, et Row-Level Security et le masquage dynamique des données ne s'y appliquent pas. Dans Azure SQL Managed Instance, la virtualisation des données n'est pas indiquée en préversion : les mêmes préfixes `abs://` et `adls://` s'appliquent (le préfixe générique `https://` est désactivé), et CETAS existe mais est désactivé par défaut.

Les **tables de graphe** modélisent des relations que l'on parcourt (liens sociaux, nomenclatures, recommandations) : `AS NODE` ajoute `$node_id` ; `AS EDGE` ajoute `$edge_id`, `$from_id`, `$to_id`.

```text
CREATE TABLE Graph.Person (PersonID int PRIMARY KEY, FullName nvarchar(100)) AS NODE;
CREATE TABLE Graph.Product (ProductID int PRIMARY KEY, ProductName nvarchar(100)) AS NODE;

CREATE TABLE Graph.Bought
(
    PurchaseCount int,
    CONSTRAINT EC_Bought CONNECTION (Graph.Person TO Graph.Product) ON DELETE CASCADE
)
AS EDGE;

CREATE INDEX IX_Bought_FromTo ON Graph.Bought ($from_id, $to_id);
```

Une contrainte d'arête limite les tables de nœuds qu'une arête relie (les paires d'une même contrainte se combinent par OR) ; `ON DELETE CASCADE` supprime les arêtes d'un nœud supprimé, `NO ACTION` fait échouer cette suppression. Elle ne crée aucun index : ajoutez-en un sur `($from_id, $to_id)`. `$from_id` et `$to_id` ne peuvent pas être mis à jour. Les tables de nœuds et d'arêtes ne peuvent être ni temporelles, ni optimisées en mémoire, ni temporaires.

<!-- section: json-columns | objectives: 1.1.3 -->
## Colonnes et index JSON

Le type natif **`json`** (SQL Server 2025, Azure SQL Database, base de données SQL dans Microsoft Fabric, et Azure SQL Managed Instance avec la stratégie de mise à jour SQL Server 2025 ou Always-up-to-date) stocke les documents dans un format binaire déjà analysé, jusqu'à 2 Go. Auparavant, le JSON était stocké en `nvarchar(max)` et validé avec `ISJSON`.

```text
CREATE TABLE Sales.CustomerProfile
(
    CustomerID int NOT NULL PRIMARY KEY CLUSTERED,
    Profile    json NOT NULL
        CHECK (JSON_PATH_EXISTS(Profile, '$.email') = 1)
);

-- In-place partial update of a json column
UPDATE Sales.CustomerProfile
SET Profile.modify('$.tier', 'gold')
WHERE CustomerID = 42;

-- JSON index on two paths
CREATE JSON INDEX JX_CustomerProfile
    ON Sales.CustomerProfile (Profile)
    FOR ('$.tier', '$.address');
```

| Fait | Valeur |
| --- | --- |
| Contenu valide | Un objet ou un tableau ; une valeur scalaire comme `'true'` est refusée |
| Index classique | Une colonne `json` ne peut pas être une colonne clé, seulement une colonne incluse |
| Prérequis de l'index JSON | Une clé de cluster (31 colonnes au plus, moins de 128 octets) ; un seul index JSON par colonne `json` |
| Chemins | `FOR (...)`, `$` par défaut ; des chemins qui se chevauchent (`$.a` et `$.a.b`) échouent |
| Création | Hors connexion uniquement, sur un seul thread ; pas sur les tables optimisées en mémoire, les colonnes calculées ou les vues |
| Prédicats pris en charge | `JSON_VALUE(...) = valeur`, `JSON_PATH_EXISTS(...) = 1`, `JSON_CONTAINS` ; pas `LIKE` ni `IS NULL` |
| Tableaux | `WITH (OPTIMIZE_FOR_ARRAY_SEARCH = ON)` |

Sur toutes les plateformes, une propriété peut être indexée au moyen d'une colonne calculée :

```text
ALTER TABLE Sales.Orders
    ADD CustomerEmail AS JSON_VALUE(OrderDoc, '$.customer.email');

CREATE NONCLUSTERED INDEX IX_Orders_CustomerEmail
    ON Sales.Orders (CustomerEmail);
```

> **Piège d'examen.** Un index JSON se crée avec `CREATE JSON INDEX`, uniquement sur une colonne `json`. Pour du JSON stocké en `nvarchar(max)`, indexez une colonne calculée `JSON_VALUE`.

<!-- section: constraints | objectives: 1.1.4 -->
## Contraintes

| Contrainte | Garantit | Détails à connaître |
| --- | --- | --- |
| `PRIMARY KEY` | Identifiant unique et non NULL | Une par table ; cluster par défaut si aucun index cluster n'existe |
| `UNIQUE` | Aucun doublon | Index unique ; autorise un NULL |
| `FOREIGN KEY` | La valeur existe dans la clé parente | Référence une colonne `PRIMARY KEY` ou `UNIQUE` ; ne crée aucun index |
| `CHECK` | Une condition booléenne | Rejette FALSE ; un résultat NULL passe |
| `DEFAULT` | Valeur quand aucune n'est fournie | S'applique quand la colonne est omise ou que `DEFAULT` est écrit, pas sur un NULL explicite |

```text
CREATE TABLE Sales.Orders
(
    OrderID    int NOT NULL CONSTRAINT PK_Orders PRIMARY KEY,
    OrderRef   varchar(20) NOT NULL CONSTRAINT UQ_Orders_Ref UNIQUE,
    CustomerID int NOT NULL,
    OrderDate  date NOT NULL CONSTRAINT DF_Orders_Date DEFAULT (CAST(SYSUTCDATETIME() AS date)),
    ShipDate   date NULL,
    Amount     decimal(10, 2) NOT NULL CONSTRAINT CK_Orders_Amount CHECK (Amount >= 0),
    CONSTRAINT FK_Orders_Customer FOREIGN KEY (CustomerID)
        REFERENCES Sales.Customer (CustomerID)
        ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT CK_Orders_Dates CHECK (ShipDate IS NULL OR ShipDate >= OrderDate)
);
```

Actions référentielles : `NO ACTION` (par défaut, la modification échoue), `CASCADE`, `SET NULL`, `SET DEFAULT`. Une règle sur plusieurs colonnes est un `CHECK` au niveau de la table. Une contrainte ajoutée `WITH NOCHECK` ignore les lignes existantes et reste **non approuvée** (`is_not_trusted = 1`), si bien que l'optimiseur l'ignore ; `ALTER TABLE ... WITH CHECK CHECK CONSTRAINT ...` la rend de nouveau approuvée.

> **Piège d'examen.** `CHECK (Amount >= 0)` accepte un montant NULL. Une valeur obligatoire exige aussi `NOT NULL`.

<!-- section: sequences | objectives: 1.1.5 -->
## Séquences

Une **séquence** génère des nombres indépendamment de toute table : un compteur partagé par plusieurs tables, un numéro nécessaire avant l'insertion ou une plage réservée.

```text
CREATE SEQUENCE Sales.OrderNumber
    AS int
    START WITH 100000
    INCREMENT BY 1
    MINVALUE 100000
    NO MAXVALUE
    CACHE 50;

CREATE TABLE Sales.WebOrder
(
    OrderNo int NOT NULL
        CONSTRAINT DF_WebOrder_No DEFAULT (NEXT VALUE FOR Sales.OrderNumber),
    Amount  decimal(10, 2) NOT NULL
);

DECLARE @next int = NEXT VALUE FOR Sales.OrderNumber;
```

| Exigence | Réponse |
| --- | --- |
| Une numérotation commune à plusieurs tables | Une séquence dans le `DEFAULT` de chaque table |
| Connaître le numéro avant l'insertion | `NEXT VALUE FOR` dans une variable |
| Réserver un bloc de numéros | `sp_sequence_get_range` |
| Recommencer après le maximum | `CYCLE` |
| Moins d'écritures de métadonnées | `CACHE n` (les valeurs en cache sont perdues lors d'un arrêt inattendu) |
| Numérotation d'une seule table | `IDENTITY` |

Valeurs par défaut : sans `AS`, le type est `bigint` ; sans `START WITH`, une séquence croissante commence à la **valeur minimale de son type**. Les valeurs ne sont pas annulées avec une transaction : les trous sont normaux. Plusieurs références à la même séquence dans une instruction retournent la même valeur pour une ligne. `NEXT VALUE FOR` n'est pas autorisé dans les vues, les fonctions définies par l'utilisateur ni les colonnes calculées. `ALTER SEQUENCE ... RESTART WITH n` la réinitialise.

> **Piège d'examen.** Ni `IDENTITY` ni une séquence ne garantissent une numérotation sans trou ; aucun réglage du cache n'y change rien.

<!-- section: partitioning | objectives: 1.1.6 -->
## Partitionnement des tables et des index

Le partitionnement découpe une table ou un index en plages d'une colonne : les requêtes qui filtrent sur cette colonne ne lisent que certaines partitions (élimination de partition), et des partitions entières sont chargées, archivées ou vidées par de simples opérations de métadonnées.

```text
CREATE PARTITION FUNCTION PF_OrderYear (date)
AS RANGE RIGHT FOR VALUES ('2025-01-01', '2026-01-01', '2027-01-01');

CREATE PARTITION SCHEME PS_OrderYear
AS PARTITION PF_OrderYear ALL TO ([PRIMARY]);

CREATE TABLE Sales.OrderArchive
(
    OrderID   int NOT NULL,
    OrderDate date NOT NULL,
    Amount    decimal(10, 2) NOT NULL,
    CONSTRAINT PK_OrderArchive PRIMARY KEY CLUSTERED (OrderDate, OrderID)
) ON PS_OrderYear (OrderDate);

-- Remove a year instantly: switch it out, or truncate the partition
ALTER TABLE Sales.OrderArchive SWITCH PARTITION 1 TO Sales.OrderArchive_Old;
TRUNCATE TABLE Sales.OrderArchive WITH (PARTITIONS (1));

-- Add next year's boundary before data arrives
ALTER PARTITION SCHEME PS_OrderYear NEXT USED [PRIMARY];
ALTER PARTITION FUNCTION PF_OrderYear() SPLIT RANGE ('2028-01-01');
```

| Concept | Règle |
| --- | --- |
| `RANGE RIGHT` | Une limite appartient à la partition située à sa droite : naturel pour les dates |
| `RANGE LEFT` | Une limite appartient à la partition située à sa gauche |
| Partitions | Nombre de limites + 1, jusqu'à 15 000 |
| Index uniques | Un index unique partitionné (clé primaire comprise) contient la colonne de partitionnement dans sa clé |
| `SWITCH` | Index alignés ; cible vide avec la même structure et le même groupe de fichiers |
| `SPLIT` / `MERGE` | Peu coûteux uniquement sur des partitions vides : créez la limite avant l'arrivée des données |
| Azure SQL Database | Uniquement le groupe de fichiers `PRIMARY` |

> **Piège d'examen.** Une requête qui ne filtre pas sur la colonne de partitionnement lit toutes les partitions. Le partitionnement facilite la gestion ; il ne remplace pas le bon index.

<!-- section: key-points -->
## Points clés

- Le plus petit type exact : `decimal` pour les montants, `datetime2` pour le temps, `nvarchar` pour le texte multi-alphabet ; 8 060 octets dans la ligne.
- Les colonnes clés servent les recherches et les tris, `INCLUDE` évite les recherches de clés ; le columnstore sert les analyses et agrégations.
- OLTP en mémoire : `SCHEMA_ONLY` perd les données au redémarrage ; Premium et Business Critical dans Azure SQL Database.
- Temporelle = historique à un instant donné en UTC ; registre = falsification détectable, irréversible, condensés en stockage immuable.
- Tables externes dans Azure SQL Database : lecture seule, Parquet ou CSV, `abs://` ou `adls://`, pas de CETAS.
- Graphe : `AS NODE`, `AS EDGE`, contraintes `CONNECTION`, index sur `($from_id, $to_id)`.
- `json` plus `CREATE JSON INDEX` (clé de cluster, chemins sans chevauchement) ; sur du `nvarchar`, indexez une colonne calculée `JSON_VALUE`.
- `CHECK` laisse passer NULL, `DEFAULT` ignore un NULL explicite, `NOCHECK` laisse une contrainte non approuvée.
- Les séquences sont partagées et ont des trous ; `bigint` par défaut, départ à la valeur minimale du type.
- Partitionnement : `RANGE RIGHT` pour les dates, index alignés pour `SWITCH`, `PRIMARY` seul dans Azure SQL Database.
