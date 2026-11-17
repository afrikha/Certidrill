Les objets de programmabilité regroupent du T-SQL dans la base de données : des vues pour exposer une forme stable des données, des fonctions pour calculer des valeurs ou retourner des ensembles de lignes, des procédures stockées pour exécuter des opérations métier, et des déclencheurs pour réagir aux modifications. Les questions d'examen montrent une définition à compléter ou à corriger, puis demandent quel type d'objet répond à une exigence : « réutilisable dans un `SELECT` », « retourne plusieurs jeux de résultats », « modifier les lignes de deux tables », « s'exécute automatiquement après chaque insertion ». Le T-SQL est présenté dans des blocs de texte brut.

<!-- section: views | objectives: 1.2.1 -->
## Vues

Une vue est un `SELECT` stocké qui se comporte comme une table. Elle masque des jointures et des colonnes, donne aux applications un contrat stable pendant que les tables évoluent, et peut recevoir des autorisations sans accorder l'accès aux tables (chaînage des propriétés quand les propriétaires sont identiques).

```text
CREATE OR ALTER VIEW Sales.vActiveCustomer
WITH SCHEMABINDING
AS
SELECT c.CustomerID, c.FullName, c.Email, c.Region
FROM Sales.Customer AS c
WHERE c.IsActive = 1
WITH CHECK OPTION;
```

| Option | Effet |
| --- | --- |
| `WITH SCHEMABINDING` | Les tables et colonnes utilisées par la vue ne peuvent être ni supprimées ni modifiées ; exige des noms en deux parties et interdit `SELECT *` |
| `WITH CHECK OPTION` | Un `INSERT` ou un `UPDATE` effectué par la vue doit produire des lignes que la vue retourne encore |
| `WITH ENCRYPTION` | Masque la définition dans `sys.sql_modules` |
| `WITH VIEW_METADATA` | Les API clientes voient les métadonnées de la vue au lieu de celles des tables de base |

Règles testées à l'examen :

- `ORDER BY` n'est pas autorisé dans une vue sans `TOP`, `OFFSET` ou `FOR JSON`, et même alors l'ordre de la requête externe n'est pas garanti : triez dans la requête qui lit la vue.
- Une vue est **modifiable** quand la modification ne touche que les colonnes d'une seule table de base et que ces colonnes ne sont ni calculées ni agrégées. Pour modifier plusieurs tables par une même vue, écrivez un déclencheur `INSTEAD OF` sur la vue.
- Une vue définie avec `SELECT *` garde sa liste de colonnes d'origine ; après une modification de table, exécutez `sp_refreshview` (ou utilisez la liaison au schéma et des colonnes explicites).

Les **vues indexées** stockent le résultat de la vue : un index cluster unique la matérialise, et le moteur la maintient à chaque modification des tables de base. Elles accélèrent les jointures et agrégations répétées, au prix d'écritures plus lentes.

```text
CREATE VIEW Sales.vSalesByProduct
WITH SCHEMABINDING
AS
SELECT ol.ProductID,
       SUM(ol.Quantity * ol.UnitPrice) AS Revenue,
       COUNT_BIG(*) AS LineCount
FROM Sales.OrderLine AS ol
GROUP BY ol.ProductID;
GO
CREATE UNIQUE CLUSTERED INDEX UCX_vSalesByProduct
    ON Sales.vSalesByProduct (ProductID);
```

Exigences : `WITH SCHEMABINDING`, noms en deux parties, expressions déterministes, `COUNT_BIG(*)` en présence d'un `GROUP BY`, pas de jointure externe, pas de `TOP`, pas de sous-requête, et le premier index doit être **cluster unique**. L'indicateur de table `NOEXPAND` force l'optimiseur à utiliser l'index de la vue.

> **Piège d'examen.** Une vue simple ne stocke aucune donnée et ne rend pas une requête plus rapide à elle seule. « Précalculer un agrégat réutilisé par de nombreuses requêtes » est une vue indexée ; « masquer des colonnes à un utilisateur » est une vue simple avec des autorisations sur la vue uniquement.

<!-- section: scalar-functions | objectives: 1.2.2 -->
## Fonctions scalaires

Une fonction scalaire définie par l'utilisateur (UDF) retourne une seule valeur et s'utilise partout où une expression est autorisée : liste du `SELECT`, `WHERE`, colonne calculée, contrainte `CHECK` ou `DEFAULT`.

```text
CREATE OR ALTER FUNCTION Sales.ufn_NetPrice
(
    @UnitPrice decimal(10, 2),
    @Discount  decimal(4, 3)
)
RETURNS decimal(10, 2)
WITH SCHEMABINDING, RETURNS NULL ON NULL INPUT
AS
BEGIN
    RETURN @UnitPrice * (1 - @Discount);
END;
GO
SELECT OrderLineID, Sales.ufn_NetPrice(UnitPrice, 0.1) AS NetPrice
FROM Sales.OrderLine;
```

| Règle | Détail |
| --- | --- |
| Corps | `BEGIN ... END` terminé par un `RETURN` du type déclaré |
| Appel | Toujours avec le nom du schéma : `Sales.ufn_NetPrice(...)` |
| Effets de bord | Interdits : pas d'`INSERT`, `UPDATE` ou `DELETE` sur des tables, pas de `TRY...CATCH`, pas de SQL dynamique, pas de `NEWID()` |
| `RETURNS NULL ON NULL INPUT` | Retourne NULL sans exécuter le corps quand un argument est NULL |
| `WITH SCHEMABINDING` | Protège les objets référencés et permet au moteur de traiter la fonction comme déterministe quand elle l'est |
| Arguments par défaut | Doivent être passés explicitement avec le mot clé `DEFAULT` |

**Performances.** Historiquement, une UDF scalaire s'exécutait une fois par ligne, en série, et cachait son coût à l'optimiseur. L'**incorporation des UDF scalaires** (scalar UDF inlining, niveau de compatibilité de base de données 150 ou supérieur) transforme une fonction éligible en expression de la requête appelante. Vérifiez `is_inlineable` dans `sys.sql_modules` ; désactivez-la pour une fonction avec `WITH INLINE = OFF`, ou pour une base avec la configuration délimitée à la base de données `TSQL_SCALAR_UDF_INLINING`. Une fonction qui appelle une fonction intrinsèque dépendante du temps, comme `GETDATE()`, n'est pas incorporée.

> **Piège d'examen.** Une fonction scalaire appliquée à une colonne dans un `WHERE` (`WHERE Sales.ufn_NetPrice(UnitPrice, 0.1) > 100`) n'est pas SARGable : l'index sur `UnitPrice` ne peut pas servir à une recherche. Réécrivez le prédicat sur la colonne elle-même, ou utilisez une fonction table inline.

<!-- section: table-valued-functions | objectives: 1.2.3 -->
## Fonctions table

Une fonction table (TVF) retourne un ensemble de lignes et s'utilise dans une clause `FROM`, comme une vue paramétrée.

```text
-- Inline TVF: a single SELECT, expanded into the calling query
CREATE OR ALTER FUNCTION Sales.ufn_OrdersByCustomer (@CustomerID int)
RETURNS TABLE
AS
RETURN
(
    SELECT o.OrderID, o.OrderDate, o.Amount
    FROM Sales.Orders AS o
    WHERE o.CustomerID = @CustomerID
);
GO
-- Multi-statement TVF: fills a declared table variable
CREATE OR ALTER FUNCTION Sales.ufn_TopProducts (@Year int, @Top int)
RETURNS @result TABLE (ProductID int PRIMARY KEY, Revenue decimal(14, 2))
AS
BEGIN
    INSERT INTO @result (ProductID, Revenue)
    SELECT TOP (@Top) ol.ProductID, SUM(ol.Quantity * ol.UnitPrice)
    FROM Sales.OrderLine AS ol
    JOIN Sales.Orders AS o ON o.OrderID = ol.OrderID
    WHERE YEAR(o.OrderDate) = @Year
    GROUP BY ol.ProductID
    ORDER BY SUM(ol.Quantity * ol.UnitPrice) DESC;
    RETURN;
END;
```

| | TVF inline | TVF à instructions multiples |
| --- | --- | --- |
| En-tête | `RETURNS TABLE` | `RETURNS @t TABLE (...)` |
| Corps | `RETURN (SELECT ...)` uniquement | `BEGIN ... END` avec plusieurs instructions et un `RETURN` seul |
| Optimisation | Développée dans la requête appelante : vraies statistiques, recherches d'index, parallélisme | Variable de table opaque avec une estimation fixe du nombre de lignes (améliorée par l'exécution entrelacée à partir du niveau de compatibilité 140) |
| Modifiable | Oui, comme une vue, si les règles des vues modifiables sont respectées | Non |
| À choisir quand | Une seule requête exprime la logique (la plupart des cas) | Une logique procédurale est nécessaire : boucles, étapes conditionnelles |

Pour appeler une TVF **pour chaque ligne** d'une autre table, utilisez `APPLY` :

```text
SELECT c.CustomerID, c.FullName, o.OrderID, o.Amount
FROM Sales.Customer AS c
CROSS APPLY Sales.ufn_OrdersByCustomer(c.CustomerID) AS o;  -- customers with orders

SELECT c.CustomerID, c.FullName, o.OrderID, o.Amount
FROM Sales.Customer AS c
OUTER APPLY Sales.ufn_OrdersByCustomer(c.CustomerID) AS o;  -- all customers
```

> **Piège d'examen.** Une TVF dont l'argument vient de l'autre table ne peut pas être jointe par `JOIN ... ON` : il faut `CROSS APPLY` (sémantique interne) ou `OUTER APPLY` (conserve les lignes sans correspondance, avec des NULL).

<!-- section: stored-procedures | objectives: 1.2.4 -->
## Procédures stockées

Une procédure stockée exécute une ou plusieurs instructions comme une unité : elle peut modifier des données, gérer des transactions, appeler du SQL dynamique, retourner plusieurs jeux de résultats, des paramètres de sortie et un code de retour entier. Elle ne s'utilise pas dans un `SELECT` ; on l'appelle avec `EXECUTE`.

```text
CREATE OR ALTER PROCEDURE Sales.usp_PlaceOrder
    @CustomerID int,
    @Lines      Sales.OrderLineType READONLY,   -- table-valued parameter
    @Channel    varchar(10) = 'web',            -- default value
    @OrderID    int OUTPUT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM Sales.Customer WHERE CustomerID = @CustomerID)
        RETURN 1;                               -- business error code

    BEGIN TRANSACTION;
        INSERT INTO Sales.Orders (CustomerID, Channel)
        VALUES (@CustomerID, @Channel);
        SET @OrderID = SCOPE_IDENTITY();

        INSERT INTO Sales.OrderLine (OrderID, ProductID, Quantity, UnitPrice)
        SELECT @OrderID, ProductID, Quantity, UnitPrice FROM @Lines;
    COMMIT TRANSACTION;
    RETURN 0;
END;
GO
DECLARE @id int, @rc int, @lines Sales.OrderLineType;
INSERT INTO @lines VALUES (7, 2, 19.90);
EXECUTE @rc = Sales.usp_PlaceOrder @CustomerID = 42, @Lines = @lines, @OrderID = @id OUTPUT;
```

| Élément | Règle |
| --- | --- |
| `OUTPUT` | Obligatoire dans la définition et dans l'appel ; sans lui dans l'appel, la variable n'est pas renseignée |
| `RETURN n` | Code d'état entier uniquement (0 = succès par convention) ; les données passent par des jeux de résultats ou `OUTPUT` |
| Paramètre table | Déclaré avec un type de table défini par l'utilisateur, toujours `READONLY` |
| `SET NOCOUNT ON` | Supprime les messages « n lignes affectées » : moins de trafic réseau |
| `EXECUTE AS OWNER` | Le corps s'exécute avec les autorisations du propriétaire : les appelants n'ont besoin que d'`EXECUTE` |
| `SCOPE_IDENTITY()` | Dernière valeur d'identité de l'étendue courante ; `@@IDENTITY` peut retourner une valeur générée par un déclencheur |
| `WITH RECOMPILE` / `OPTION (RECOMPILE)` | Nouveau plan à chaque appel (toute la procédure / une instruction) : un remède à la sensibilité aux paramètres |

Les procédures stockées sont l'unité du **privilège minimum** : accordez `EXECUTE` sur la procédure (ou le schéma) et aucune autorisation sur les tables ; le chaînage des propriétés couvre les tables quand les propriétaires sont identiques, mais pas le SQL dynamique, qui s'exécute avec les autorisations de l'appelant sauf avec `EXECUTE AS`. Passez les valeurs au SQL dynamique par les paramètres de `sp_executesql`, jamais par concaténation (injection SQL).

> **Piège d'examen.** Une procédure retourne des lignes par des jeux de résultats `SELECT`, pas par `RETURN`. « Retourner l'ID de la nouvelle commande à l'appelant » est un paramètre `OUTPUT` (ou un jeu de résultats) ; `RETURN` ne porte qu'un code d'état.

<!-- section: triggers | objectives: 1.2.5 -->
## Déclencheurs

Un déclencheur est une procédure spéciale qui s'exécute automatiquement. Les déclencheurs DML réagissent à `INSERT`, `UPDATE` et `DELETE` ; les déclencheurs DDL aux événements de schéma (`CREATE_TABLE`, `ALTER_TABLE`, ... sur la base ou le serveur, détails dans `EVENTDATA()`) ; les déclencheurs d'ouverture de session aux connexions.

```text
CREATE OR ALTER TRIGGER Sales.trg_Orders_Audit
ON Sales.Orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(Amount) RETURN;

    INSERT INTO Audit.OrderAmountChange (OrderID, OldAmount, NewAmount, ChangedBy, ChangedAt)
    SELECT d.OrderID, d.Amount, i.Amount, SUSER_SNAME(), SYSUTCDATETIME()
    FROM inserted AS i
    JOIN deleted  AS d ON d.OrderID = i.OrderID
    WHERE i.Amount <> d.Amount;
END;
```

| Fait | Détail |
| --- | --- |
| `inserted` / `deleted` | Pseudo-tables : nouvelles lignes (`INSERT`, `UPDATE`) et anciennes lignes (`DELETE`, `UPDATE`) |
| Déclenchement | Une fois par instruction, quel que soit le nombre de lignes (y compris 0) |
| `AFTER` | Sur les tables uniquement ; s'exécute après la modification et la vérification des contraintes ; plusieurs par action, premier et dernier fixés avec `sp_settriggerorder` |
| `INSTEAD OF` | Sur les tables ou les vues, un par action ; remplace l'instruction : rend modifiables les vues multitables |
| `UPDATE(col)` | Vrai si la colonne figure dans la liste `SET`, même si la valeur n'a pas changé |
| Transaction | Le déclencheur s'exécute dans la transaction de l'instruction ; un `ROLLBACK` ou un `THROW` l'annule |
| Imbrication | Les déclencheurs peuvent en déclencher d'autres jusqu'à 32 niveaux ; la récursivité directe exige l'option de base `RECURSIVE_TRIGGERS` (désactivée par défaut) |

Quand utiliser un déclencheur, et quand l'éviter :

| Exigence | Réponse |
| --- | --- |
| Valider une valeur de la même ligne | Contrainte `CHECK`, pas un déclencheur |
| Conserver l'historique complet de chaque version de ligne | Table temporelle, pas un déclencheur |
| Écrire une ligne d'audit personnalisée avec un contexte métier | Déclencheur `AFTER` |
| Modifier deux tables de base par une même vue | Déclencheur `INSTEAD OF` sur la vue |
| Bloquer `DROP TABLE` en production | Déclencheur DDL `ON DATABASE FOR DROP_TABLE` avec `ROLLBACK` |
| Actualiser un embedding ou notifier un autre système après une modification | Un déclencheur fonctionne mais ajoute de la latence à chaque écriture ; préférez le suivi des modifications, CDC ou le streaming d'événements de modification (voir les chapitres d'intégration) |

> **Piège d'examen.** Un déclencheur qui lit `inserted` dans des variables (`SELECT @id = OrderID FROM inserted`) ne traite qu'une ligne : un `INSERT` de plusieurs lignes n'en traite silencieusement qu'une seule, au hasard. Écrivez toujours des déclencheurs ensemblistes qui joignent `inserted` et `deleted`.

<!-- section: key-points -->
## Points clés

- Vues : `SCHEMABINDING` protège les dépendances, `CHECK OPTION` garde visibles les lignes modifiées, pas d'`ORDER BY` garanti ; les vues indexées exigent la liaison au schéma, `COUNT_BIG(*)` et d'abord un index cluster unique.
- Les UDF scalaires retournent une valeur, sans effet de bord ; l'incorporation (niveau 150+) supprime le coût ligne par ligne ; une UDF sur une colonne dans un `WHERE` n'est pas SARGable.
- La TVF inline (`RETURNS TABLE`, un seul `SELECT`) s'optimise comme une vue ; la TVF à instructions multiples est opaque ; `CROSS APPLY` / `OUTER APPLY` appellent une TVF par ligne.
- Procédures : `OUTPUT` dans la définition et l'appel, `RETURN` pour l'état uniquement, paramètres table en `READONLY`, autorisation `EXECUTE` pour le privilège minimum, `sp_executesql` avec paramètres.
- Les déclencheurs s'exécutent une fois par instruction ; utilisez `inserted` et `deleted` de façon ensembliste ; `INSTEAD OF` pour les vues ; préférez contraintes et tables temporelles quand elles suffisent.
