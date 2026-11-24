Ce chapitre couvre le T-SQL que le DP-800 vous demande de lire, compléter et déboguer : expressions de table communes, fonctions de fenêtre, fonctions JSON, d'expressions régulières et de correspondance floue ajoutées dans SQL Server 2022 et 2025, requêtes de graphe, sous-requêtes corrélées et gestion des erreurs. Attendez-vous à du code à trous, à un résultat erroné à expliquer, ou à une plateforme et un niveau de compatibilité à vérifier avant de choisir une fonction. Le T-SQL est présenté dans des blocs de texte brut.

<!-- section: ctes | objectives: 1.3.1 -->
## Expressions de table communes

Une CTE nomme une requête pour l'unique instruction qui la suit. Elle rend lisible une logique en plusieurs étapes et permet de filtrer sur des colonnes calculées, comme le résultat d'une fonction de fenêtre.

```text
WITH OrderTotals AS
(
    SELECT CustomerID, SUM(Amount) AS Total
    FROM Sales.Orders
    GROUP BY CustomerID
),
Ranked AS
(
    SELECT CustomerID, Total,
           DENSE_RANK() OVER (ORDER BY Total DESC) AS Rnk
    FROM OrderTotals
)
SELECT CustomerID, Total
FROM Ranked
WHERE Rnk <= 10;
```

Une **CTE récursive** parcourt des hiérarchies (responsables, nomenclatures, arbres de catégories) : un membre d'ancrage, `UNION ALL`, et un membre récursif qui référence la CTE.

```text
WITH OrgChart AS
(
    SELECT EmployeeID, ManagerID, FullName, 0 AS Depth
    FROM HR.Employee
    WHERE ManagerID IS NULL                      -- anchor
    UNION ALL
    SELECT e.EmployeeID, e.ManagerID, e.FullName, oc.Depth + 1
    FROM HR.Employee AS e
    JOIN OrgChart AS oc ON e.ManagerID = oc.EmployeeID   -- recursive member
)
SELECT EmployeeID, FullName, Depth
FROM OrgChart
OPTION (MAXRECURSION 500);
```

| Règle | Détail |
| --- | --- |
| Portée | Uniquement l'instruction `SELECT`, `INSERT`, `UPDATE`, `DELETE` ou `MERGE` suivante |
| Plusieurs CTE | Un seul `WITH`, séparées par des virgules ; une CTE peut référencer une CTE précédente |
| Instruction précédente | Doit se terminer par un point-virgule |
| Limite de récursivité | 100 niveaux par défaut ; `OPTION (MAXRECURSION n)` jusqu'à 32 767, `0` pour aucune limite |
| Matérialisation | Aucune : une CTE référencée deux fois est évaluée deux fois ; utilisez une table temporaire pour réutiliser un résultat coûteux |

> **Piège d'examen.** L'erreur 530 (« maximum recursion 100 has been exhausted ») sur une hiérarchie profonde mais finie se corrige avec `OPTION (MAXRECURSION ...)` sur l'instruction externe, pas dans la CTE. Sur une hiérarchie cyclique, corrigez les données ou arrêtez la récursivité par une condition de profondeur.

<!-- section: window-functions | objectives: 1.3.2 -->
## Fonctions de fenêtre

Une fonction de fenêtre calcule une valeur sur un ensemble de lignes liées à la ligne courante sans les regrouper, contrairement à `GROUP BY`.

```text
SELECT OrderID, CustomerID, OrderDate, Amount,
       ROW_NUMBER() OVER (PARTITION BY CustomerID ORDER BY OrderDate DESC) AS RecentRank,
       LAG(Amount, 1, 0) OVER (PARTITION BY CustomerID ORDER BY OrderDate) AS PreviousAmount,
       SUM(Amount) OVER (PARTITION BY CustomerID ORDER BY OrderDate
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningTotal,
       AVG(Amount) OVER (ORDER BY OrderDate
                         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS MovingAvg7
FROM Sales.Orders;
```

| Famille | Fonctions | Remarques |
| --- | --- | --- |
| Classement | `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE(n)` | Ex aequo : `ROW_NUMBER` 1,2,3 ; `RANK` 1,1,3 ; `DENSE_RANK` 1,1,2 |
| Décalage | `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE` | `LAG(col, offset, default)` : décalage 1 et NULL par défaut |
| Agrégat | `SUM`, `AVG`, `COUNT`, `MIN`, `MAX` avec `OVER` | Cumuls, moyennes mobiles, part du total |
| Distribution | `PERCENT_RANK`, `CUME_DIST`, `PERCENTILE_CONT`, `PERCENTILE_DISC` | Les centiles utilisent `WITHIN GROUP (ORDER BY ...)` |

Règles du cadre : avec `ORDER BY` et sans cadre, la valeur par défaut est `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, qui inclut tous les **ex aequo** de la ligne courante et déborde plus facilement sur disque ; écrivez `ROWS` explicitement pour un cumul. SQL Server 2022 a ajouté la clause `WINDOW` pour nommer une fenêtre une seule fois, et `IGNORE NULLS` pour `FIRST_VALUE`, `LAST_VALUE`, `LAG` et `LEAD`.

> **Piège d'examen.** `LAST_VALUE(x) OVER (ORDER BY d)` retourne la valeur de la ligne courante, car le cadre par défaut s'arrête à la ligne courante. Ajoutez `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. Et une fonction de fenêtre ne peut pas figurer dans un `WHERE` : calculez-la dans une CTE, puis filtrez.

<!-- section: json-functions | objectives: 1.3.3 -->
## Fonctions JSON

| Fonction | Retourne | Plateforme |
| --- | --- | --- |
| `JSON_OBJECT('k':v, ...)` | Un objet ; `NULL ON NULL` par défaut | SQL Server 2022 et versions ultérieures, Azure SQL, base de données SQL dans Fabric |
| `JSON_ARRAY(v, ...)` | Un tableau ; `ABSENT ON NULL` par défaut | Idem |
| `JSON_ARRAYAGG(v ORDER BY ...)` | Un tableau agrégé sur des lignes ; `ABSENT ON NULL` par défaut | SQL Server 2025, Azure SQL, Fabric |
| `JSON_CONTAINS(doc, value, path)` | 1, 0 ou NULL | SQL Server 2025, Azure SQL, base de données SQL dans Fabric |
| `JSON_VALUE(doc, path)` | Une valeur scalaire, `nvarchar(4000)` | Toutes |
| `JSON_QUERY(doc, path)` | Un objet ou un tableau | Toutes |
| `OPENJSON(doc, path) WITH (...)` | Des lignes et des colonnes typées | Niveau de compatibilité 130 ou supérieur |

Les constructeurs acceptent `RETURNING json` pour retourner le type `json` au lieu de `nvarchar(max)`.

```text
-- Shape relational rows as one JSON document per customer
SELECT c.CustomerID,
       JSON_OBJECT('id': c.CustomerID,
                   'name': c.FullName,
                   'email': c.Email,
                   'orders': (SELECT JSON_ARRAYAGG(o.OrderID ORDER BY o.OrderDate)
                              FROM Sales.Orders AS o
                              WHERE o.CustomerID = c.CustomerID)
                   ABSENT ON NULL) AS Doc   -- omit keys whose value is NULL
FROM Sales.Customer AS c;

-- Shred a JSON array into typed rows
DECLARE @payload nvarchar(max) =
    N'{"order":{"id":981,"lines":[{"sku":"A-12","qty":2},{"sku":"B-07","qty":1}]}}';

SELECT JSON_VALUE(@payload, '$.order.id') AS OrderID, l.Sku, l.Qty
FROM OPENJSON(@payload, '$.order.lines')
     WITH (Sku varchar(20) '$.sku',
           Qty int         '$.qty') AS l;

-- Filter documents that contain a value in an array
SELECT CustomerID
FROM Sales.CustomerProfile
WHERE JSON_CONTAINS(Profile, 'vip', '$.tags[*]') = 1;
```

Règles des chemins : les chemins respectent la casse ; le mode **lax** (par défaut) retourne NULL quand un chemin n'existe pas ou ne désigne pas le bon genre de valeur, le mode **strict** (`'strict $.order.id'`) lève une erreur. En mode lax, `JSON_VALUE` retourne NULL pour les objets, les tableaux et les valeurs de plus de 4 000 caractères ; `JSON_QUERY` retourne les objets et les tableaux. Dans `OPENJSON ... WITH`, une colonne qui retourne un objet imbriqué exige `nvarchar(max) AS JSON`. Dans SQL Server 2025, `JSON_VALUE(doc, path RETURNING int)` retourne une valeur typée. `JSON_CONTAINS` exige actuellement le chemin, avec un caractère générique (`[*]`) quand il cible un tableau.

> **Piège d'examen.** `JSON_VALUE(doc, '$.order.lines')` retourne NULL, pas le tableau : utilisez `JSON_QUERY` ou `OPENJSON`. Et `JSON_OBJECT` conserve par défaut les clés NULL, alors que `JSON_ARRAY` et `JSON_ARRAYAGG` suppriment par défaut les éléments NULL.

<!-- section: regular-expressions | objectives: 1.3.4 -->
## Expressions régulières

Les fonctions `REGEXP_*` (SQL Server 2025, Azure SQL Database, base de données SQL dans Fabric, Azure SQL Managed Instance avec la stratégie de mise à jour SQL Server 2025 ou Always-up-to-date) utilisent la syntaxe RE2. Elles n'existent pas dans SQL Server 2022.

| Fonction | Signature | Retourne |
| --- | --- | --- |
| `REGEXP_LIKE` | `(string, pattern [, flags])` | Booléen, pour `WHERE` et `CHECK` ; exige le niveau de compatibilité 170 |
| `REGEXP_REPLACE` | `(string, pattern [, replacement [, start [, occurrence [, flags]]]])` | Chaîne ; l'occurrence `0` (par défaut) remplace tout ; références arrière `\1` à `\9` |
| `REGEXP_SUBSTR` | `(string, pattern [, start [, occurrence [, flags [, group]]]])` | La nième correspondance ou le groupe de capture, NULL si aucune |
| `REGEXP_INSTR` | `(string, pattern [, start [, occurrence [, return_option [, flags [, group]]]]])` | Position de début (`0`) ou de fin (`1`) ; 0 si aucune |
| `REGEXP_COUNT` | `(string, pattern [, start [, flags]])` | Nombre de correspondances |
| `REGEXP_MATCHES` | Fonction table `(string, pattern [, flags])` | Une ligne par correspondance : `match_id`, `start_position`, `end_position`, `match_value`, `substring_matches` (json) |
| `REGEXP_SPLIT_TO_TABLE` | Fonction table `(string, pattern [, flags])` | `value`, `ordinal` |

```text
ALTER DATABASE CURRENT SET COMPATIBILITY_LEVEL = 170;

CREATE TABLE Sales.Contact
(
    ContactID int PRIMARY KEY,
    Email     varchar(320)
        CHECK (REGEXP_LIKE(Email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
    Phone     varchar(20)
);

SELECT ContactID,
       REGEXP_REPLACE(Phone, '(\d{3})-(\d{3})-(\d{4})', '(\1) \2-\3') AS Formatted,
       REGEXP_SUBSTR(Email, '@(.+)$', 1, 1, 'i', 1) AS EmailDomain
FROM Sales.Contact
WHERE REGEXP_LIKE(Email, '@contoso\.com$', 'i');

SELECT m.match_value
FROM REGEXP_MATCHES('Ticket #A-102 replaces #A-099', '#([A-Z]-\d+)') AS m;
```

Indicateurs : `i` insensible à la casse, `c` sensible à la casse (par défaut), `m` `^` et `$` multilignes, `s` permet à `.` de correspondre à un saut de ligne ; quand des indicateurs se contredisent, le dernier l'emporte. Entrées jusqu'à 2 Mo, modèles jusqu'à 8 000 octets. Les deux fonctions table exigent le niveau de compatibilité 170, sauf si la configuration délimitée à la base de données `ALLOW_BUILTIN_TVF_IN_ALL_COMPAT_LEVELS` est activée (en préversion, Azure SQL Database et base de données SQL dans Fabric uniquement). Les expressions régulières ignorent les règles de classement, et `REGEXP_LIKE` ne peut utiliser une recherche d'index que si le modèle commence par `^`.

> **Piège d'examen.** « `REGEXP_LIKE` n'est pas reconnu » sur Azure SQL Database signifie un niveau de compatibilité inférieur à 170. Les autres fonctions `REGEXP_*` scalaires fonctionnent à tous les niveaux : elles ne prouvent donc pas que le niveau est suffisant.

<!-- section: fuzzy-matching | objectives: 1.3.5 -->
## Correspondance de chaînes floue

Les fonctions floues trouvent les quasi-doublons et les fautes de frappe que `LIKE` et les expressions régulières manquent : « Contoso Ltd » face à « Contosso Ltd. », « Colour » face à « Color ». Elles s'exécutent sur SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance (stratégie de mise à jour SQL Server 2025 ou Always-up-to-date) et base de données SQL dans Fabric. Elles sont **en disponibilité générale depuis SQL Server 2025 CU11** ; sur les builds antérieures de SQL Server 2025, elles sont en préversion et, si elles ne sont pas activées par défaut, exigent `ALTER DATABASE SCOPED CONFIGURATION SET PREVIEW_FEATURES = ON`.

| Fonction | Retourne | Sens |
| --- | --- | --- |
| `EDIT_DISTANCE(a, b [, max])` | `int` | Insertions, suppressions, substitutions et transpositions (Damerau-Levenshtein, alignement optimal de chaînes) ; 0 = identiques ; au-delà de `max`, retourne `max + 1` |
| `EDIT_DISTANCE_SIMILARITY(a, b)` | `int`, de 0 à 100 | `(1 - distance / longueur la plus grande) * 100` ; 100 = identiques |
| `JARO_WINKLER_DISTANCE(a, b)` | `float` | Plus bas = plus proche ; favorise les chaînes qui concordent dès le début |
| `JARO_WINKLER_SIMILARITY(a, b)` | De 0 à 100 | Plus haut = plus proche |

```text
ALTER DATABASE SCOPED CONFIGURATION SET PREVIEW_FEATURES = ON;   -- only on SQL Server 2025 builds before CU11

SELECT s.SupplierID, s.SupplierName, c.CandidateName,
       EDIT_DISTANCE_SIMILARITY(s.SupplierName, c.CandidateName) AS Similarity
FROM Purchasing.Supplier AS s
JOIN Staging.SupplierCandidate AS c
     ON LEFT(s.SupplierName, 1) = LEFT(c.CandidateName, 1)   -- cheap blocking predicate
WHERE EDIT_DISTANCE(s.SupplierName, c.CandidateName, 3) <= 2;
```

Les arguments ne peuvent pas être de type `varchar(max)` ou `nvarchar(max)` ; une entrée NULL retourne NULL ; les classements `SQL_*` non binaires ne sont pas pris en charge (appliquez un classement Windows ou binaire avec `COLLATE`). Chaque comparaison est calculée ligne par ligne : réduisez d'abord les paires candidates ; avec un argument `max`, `EDIT_DISTANCE` peut s'arrêter dès que la distance le dépasse. Choisissez la distance d'édition pour les fautes de frappe dans des codes et des chaînes courtes, Jaro-Winkler pour les noms dont le début compte le plus.

> **Piège d'examen.** Distance et similarité vont en sens inverse : filtrez `EDIT_DISTANCE(...) <= 2` mais `EDIT_DISTANCE_SIMILARITY(...) >= 80`. Une requête qui garde les lignes de distance élevée retourne les chaînes les moins semblables.

<!-- section: graph-match | objectives: 1.3.6 -->
## Requêtes de graphe avec MATCH

`MATCH` parcourt les tables de nœuds et d'arêtes avec un modèle en « art ASCII » dans la clause `WHERE`. Avec les tables `Graph.Person`, `Graph.Product` et `Graph.Bought` du chapitre sur les objets de base de données, plus une arête `Graph.FriendOf` entre personnes :

```text
-- Products bought by the friends of Ana
SELECT DISTINCT p2.FullName AS Friend, pr.ProductName
FROM Graph.Person AS p1, Graph.FriendOf AS f,
     Graph.Person AS p2, Graph.Bought AS b, Graph.Product AS pr
WHERE MATCH(p1-(f)->p2-(b)->pr)
  AND p1.FullName = N'Ana';

-- Shortest friend chain from Ana to everyone up to 3 hops away
SELECT p1.FullName,
       STRING_AGG(p2.FullName, '->') WITHIN GROUP (GRAPH PATH) AS Path,
       LAST_VALUE(p2.FullName) WITHIN GROUP (GRAPH PATH) AS Reached
FROM Graph.Person AS p1,
     Graph.FriendOf FOR PATH AS f,
     Graph.Person FOR PATH AS p2
WHERE MATCH(SHORTEST_PATH(p1(-(f)->p2){1,3}))
  AND p1.FullName = N'Ana';
```

| Règle | Détail |
| --- | --- |
| Tables | Chaque nœud et chaque arête du modèle figure dans le `FROM` (séparés par des virgules, avec alias) |
| Direction | Obligatoire : `a-(e)->b` et `b<-(e)-a` sont la même relation |
| Répétition | Un alias de nœud peut se répéter dans un modèle ; un alias d'arête, non |
| Combinaison | `MATCH` se combine aux autres prédicats par `AND` uniquement ; pas de `OR` ni de `NOT` |
| Deux chemins vers un même nœud | `MATCH(a-(e1)->x AND b-(e2)->x)` ou `MATCH(a-(e1)->x<-(e2)-b)` |
| Longueur arbitraire | `SHORTEST_PATH` avec `+` (1 ou plus) ou `{1,n}` ; les tables répétées sont marquées `FOR PATH` et leurs colonnes ne se lisent que par `STRING_AGG`, `LAST_VALUE`, `COUNT`, `SUM`, `AVG`, `MIN` ou `MAX` `WITHIN GROUP (GRAPH PATH)` |
| `LAST_NODE` | Uniquement dans `SHORTEST_PATH` : fait partir un modèle du dernier nœud d'un chemin, ou fait converger deux modèles sur ce nœud |

> **Piège d'examen.** Joindre à la main `$from_id = $node_id` fonctionne, mais c'est plus lent et moins lisible ; la réponse attendue est `MATCH`. Et un modèle à plusieurs sauts exige un alias par occurrence de la table d'arêtes (`f1`, `f2`).

<!-- section: correlated-queries | objectives: 1.3.7 -->
## Requêtes corrélées

Une sous-requête corrélée référence une colonne de la requête externe et s'évalue logiquement une fois par ligne externe.

```text
-- Customers with at least one order over 1,000
SELECT c.CustomerID, c.FullName
FROM Sales.Customer AS c
WHERE EXISTS (SELECT 1 FROM Sales.Orders AS o
              WHERE o.CustomerID = c.CustomerID AND o.Amount > 1000);

-- Orders above the customer's own average
SELECT o.OrderID, o.CustomerID, o.Amount
FROM Sales.Orders AS o
WHERE o.Amount > (SELECT AVG(o2.Amount) FROM Sales.Orders AS o2
                  WHERE o2.CustomerID = o.CustomerID);

-- Latest three orders per customer
SELECT c.CustomerID, t.OrderID, t.OrderDate
FROM Sales.Customer AS c
CROSS APPLY (SELECT TOP (3) o.OrderID, o.OrderDate
             FROM Sales.Orders AS o
             WHERE o.CustomerID = c.CustomerID
             ORDER BY o.OrderDate DESC) AS t;
```

| Exigence | Modèle |
| --- | --- |
| Lignes qui ont / n'ont pas de correspondance | `EXISTS` / `NOT EXISTS` |
| Comparer à un agrégat par groupe | Sous-requête scalaire corrélée, ou fonction de fenêtre (`AVG(...) OVER (PARTITION BY ...)`) |
| Les n premiers par groupe, plusieurs colonnes | `CROSS APPLY (SELECT TOP (n) ... ORDER BY ...)` |
| Garder les lignes externes sans correspondance | `OUTER APPLY` |

Une sous-requête scalaire dans la liste du `SELECT` doit retourner une seule ligne : davantage lève l'erreur 512. L'optimiseur réécrit généralement les sous-requêtes corrélées en jointures, si bien que les performances dépendent d'un index sur la colonne corrélée (`Sales.Orders (CustomerID)`).

> **Piège d'examen.** `WHERE CustomerID NOT IN (SELECT CustomerID FROM Sales.Blocked)` ne retourne **aucune ligne** si la sous-requête retourne un seul NULL. `NOT EXISTS` avec un prédicat corrélé donne le résultat attendu.

<!-- section: error-handling | objectives: 1.3.8 -->
## Gestion des erreurs

```text
CREATE OR ALTER PROCEDURE Sales.usp_TransferCredit
    @FromID int, @ToID int, @Amount decimal(10, 2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @Amount <= 0
            THROW 50001, N'Amount must be positive.', 1;

        BEGIN TRANSACTION;
            UPDATE Sales.Credit SET Balance -= @Amount WHERE CustomerID = @FromID;
            UPDATE Sales.Credit SET Balance += @Amount WHERE CustomerID = @ToID;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;

        INSERT INTO dbo.ErrorLog (Number, Severity, ProcName, Line, Message)
        VALUES (ERROR_NUMBER(), ERROR_SEVERITY(), ERROR_PROCEDURE(), ERROR_LINE(), ERROR_MESSAGE());

        THROW;   -- re-raise the original error to the caller
    END CATCH;
END;
```

| Élément | Règle |
| --- | --- |
| `TRY...CATCH` | Intercepte les erreurs d'exécution de gravité supérieure à 10 qui ne ferment pas la connexion, y compris dans les procédures et déclencheurs appelés |
| Non interceptées au même niveau | Gravité 10 ou moins (messages), erreurs de compilation et de syntaxe, erreurs de résolution de noms d'objets dans le même lot, erreurs qui ferment la connexion |
| Fonctions `ERROR_*()` | `ERROR_NUMBER`, `ERROR_MESSAGE`, `ERROR_SEVERITY`, `ERROR_STATE`, `ERROR_LINE`, `ERROR_PROCEDURE` ; n'ont de sens que dans le `CATCH` |
| `XACT_STATE()` | `1` validable, `-1` non validable (seule l'annulation est possible), `0` aucune transaction |
| `SET XACT_ABORT ON` | La plupart des erreurs d'exécution annulent toute la transaction ; recommandé dans les procédures avec transactions |
| `THROW n, msg, state` | Numéro d'erreur 50000 ou plus, gravité toujours 16 ; l'instruction précédente doit se terminer par un point-virgule |
| `THROW;` | Uniquement dans un `CATCH` : relance l'erreur d'origine, numéro et message inchangés |
| `RAISERROR` | Plus ancien ; prend en charge les chaînes de format et les gravités ; ne respecte pas `XACT_ABORT` ; le nouveau code doit utiliser `THROW` |

> **Piège d'examen.** Un bloc `CATCH` qui journalise l'erreur sans la relancer fait croire à l'application que l'appel a réussi. Terminez par `THROW;` sauf si l'erreur est vraiment traitée, et annulez la transaction avant d'écrire la ligne de journal, sinon cette insertion est annulée avec la transaction.

<!-- section: key-points -->
## Points clés

- Une CTE vit le temps d'une instruction ; une CTE récursive s'arrête à 100 niveaux sans `OPTION (MAXRECURSION n)` ; les CTE ne sont pas matérialisées.
- Fonctions de fenêtre : `ROWS` pour les cumuls, cadre complet pour `LAST_VALUE`, filtrage des résultats par une CTE ; `RANK` laisse des trous, `DENSE_RANK` non.
- JSON : `JSON_OBJECT` est `NULL ON NULL` par défaut, `JSON_ARRAY` et `JSON_ARRAYAGG` `ABSENT ON NULL` ; `JSON_VALUE` pour les scalaires, `JSON_QUERY` pour les fragments, `OPENJSON ... WITH` pour décomposer, `JSON_CONTAINS` pour rechercher.
- `REGEXP_*` : SQL Server 2025 et Azure SQL uniquement ; `REGEXP_LIKE` et les fonctions table exigent le niveau de compatibilité 170 ; l'occurrence `0` remplace tout.
- La correspondance floue est en disponibilité générale depuis SQL Server 2025 CU11 (préversion avec `PREVIEW_FEATURES = ON` sur les builds antérieures) ; la distance baisse, la similarité monte ; pas de types `max`.
- `MATCH` exige des flèches explicites, `AND` uniquement, des alias d'arêtes distincts ; `SHORTEST_PATH` avec `FOR PATH` et `WITHIN GROUP (GRAPH PATH)`.
- Préférez `NOT EXISTS` à `NOT IN` avec des colonnes NULL possibles ; `CROSS APPLY` avec `TOP` pour les n premiers par groupe.
- `SET XACT_ABORT ON`, `TRY...CATCH`, annulation quand `XACT_STATE() <> 0`, puis `THROW;`.
