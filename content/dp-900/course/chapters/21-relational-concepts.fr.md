Une base de données relationnelle stocke des données structurées dans des tables qui se référencent les unes les autres. L'examen vérifie quatre choses : le vocabulaire des tables, l'utilité de la normalisation, la famille et l'effet d'une instruction SQL, et le rôle des vues, des procédures stockées et des index.

<!-- section: relational-data | objectives: 2.1.1 -->
## Les caractéristiques des données relationnelles

- Chaque **table** modélise une collection d'**entités** : clients, produits, commandes.
- Chaque **ligne** est une instance de l'entité (un client, une commande).
- Toutes les lignes d'une table ont les mêmes **colonnes** ; chaque colonne stocke des valeurs d'un seul **type de données** (texte, entier, décimal, date et heure). Les types disponibles dépendent du système de base de données, autour d'un ensemble commun défini par la norme ANSI.
- Une colonne n'a pas forcément de valeur dans chaque ligne : une valeur vide est **NULL** (un deuxième prénom inconnu ou absent, par exemple).
- Les tables sont liées par des **clés**, et c'est ce qui rend le modèle relationnel.

<!-- section: normalization | objectives: 2.1.2 -->
## La normalisation et pourquoi elle est utilisée

La **normalisation** est le processus de conception de schéma qui **réduit au minimum la duplication des données et impose l'intégrité des données**. Ses règles pratiques :

1. Séparer chaque **entité** dans sa propre table.
2. Séparer chaque **attribut** distinct dans sa propre colonne.
3. Identifier chaque ligne de façon unique par une **clé primaire**.
4. Utiliser des colonnes de **clé étrangère** pour lier les entités associées.

Avant la normalisation, une seule table répète le client et le produit sur chaque ligne et mélange plusieurs attributs dans une cellule :

| OrderNo | Customer | Product | Qty |
| --- | --- | --- | --- |
| 1001 | Ana Ruiz, 4 Harbor St, Lisbon | Kettle (24.50) | 1 |
| 1001 | Ana Ruiz, 4 Harbor St, Lisbon | Toaster (31.00) | 2 |
| 1002 | Kenji Sato, 9 Hill Rd, Osaka | Kettle (24.50) | 3 |

Après la normalisation :

| Table | Clé primaire | Clés étrangères |
| --- | --- | --- |
| Customer | CustomerID | Aucune |
| Product | ProductID | Aucune |
| SalesOrder | OrderNo | CustomerID (vers Customer) |
| LineItem | OrderNo + ItemNo (clé composite) | OrderNo (vers SalesOrder), ProductID (vers Product) |

- Une **clé primaire** identifie chaque ligne de façon unique. Une **clé composite** est une clé formée de plusieurs colonnes.
- Une **clé étrangère** contient la clé primaire de la ligne associée dans une autre table. La base de données peut imposer l'**intégrité référentielle** : pas de commande pour un client qui n'existe pas.
- Avantages : chaque fait est stocké une seule fois (changer une adresse modifie une seule ligne), chaque colonne a un type de données imposé, et les requêtes peuvent filtrer sur des attributs individuels comme la ville.

> **Piège d'examen.** La normalisation réduit les données dupliquées ; elle n'accélère pas les requêtes de lecture. Lire des données normalisées exige des jointures entre tables, et c'est pourquoi les magasins analytiques dénormalisent souvent.

<!-- section: sql-statements | objectives: 2.1.3 -->
## Les instructions SQL courantes

SQL est normalisé par l'ANSI et l'ISO, et chaque éditeur y ajoute son dialecte : **Transact-SQL (T-SQL)** pour SQL Server et les services Azure SQL, **PL/pgSQL** pour PostgreSQL, **PL/SQL** pour Oracle.

| Famille | But | Instructions |
| --- | --- | --- |
| **DDL**, langage de définition de données | Créer, modifier et supprimer des objets (tables, vues, procédures stockées) | `CREATE`, `ALTER`, `DROP`, `RENAME` |
| **DCL**, langage de contrôle des données | Gérer les autorisations ; surtout utilisé par les administrateurs de base de données | `GRANT`, `DENY`, `REVOKE` |
| **DML**, langage de manipulation de données | Interroger et modifier les lignes des tables | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

```text
CREATE TABLE Customer
(
    CustomerID INT PRIMARY KEY,
    Email VARCHAR(100) NOT NULL,
    City VARCHAR(50) NULL
);

GRANT SELECT, INSERT
ON Customer
TO analyst1;

INSERT INTO Customer (CustomerID, Email, City)
VALUES (4, 'omar@contoso.com', 'Rabat');

UPDATE Customer
SET City = 'Porto'
WHERE CustomerID = 1;

DELETE FROM Customer
WHERE CustomerID = 4;

SELECT c.Email, o.OrderDate
FROM SalesOrder AS o
JOIN Customer AS c
    ON o.CustomerID = c.CustomerID
WHERE c.City = 'Lyon'
ORDER BY o.OrderDate;
```

- `WHERE` filtre les lignes. Sans cette clause, `UPDATE` modifie **toutes** les lignes et `DELETE` supprime **toutes** les lignes de la table.
- `JOIN ... ON` combine les lignes de deux tables, en général en faisant correspondre une clé étrangère avec sa clé primaire.
- `ORDER BY` trie le résultat ; sans cette clause, l'ordre des lignes n'est pas garanti.
- `GRANT` accorde une autorisation, `DENY` la refuse, `REVOKE` supprime une autorisation précédemment accordée.

> **Piège d'examen.** `DELETE` (DML) supprime des lignes et conserve la table ; `DROP` (DDL) supprime la table avec toutes ses lignes. Microsoft Learn classe `SELECT` dans le DML ; certaines sources rangent les requêtes dans une famille à part appelée DQL.

<!-- section: database-objects | objectives: 2.1.4 -->
## Les objets de base de données courants

```text
CREATE VIEW LyonCustomers
AS
SELECT CustomerID, Email
FROM Customer
WHERE City = 'Lyon';

CREATE PROCEDURE ChangeCity
    @CustomerID INT,
    @City VARCHAR(50)
AS
UPDATE Customer
SET City = @City
WHERE CustomerID = @CustomerID;

EXEC ChangeCity 1, 'Porto';

CREATE INDEX idx_Customer_City
ON Customer(City);
```

| Objet | Ce que c'est | Usage |
| --- | --- | --- |
| **Table** | Des lignes et des colonnes qui stockent les données | Contenir les entités |
| **Vue** | Une table virtuelle basée sur le résultat d'une requête `SELECT` ; elle s'interroge comme une table | Réutiliser une requête, par exemple une jointure, et n'exposer que certaines lignes ou colonnes |
| **Procédure stockée** | Des instructions SQL enregistrées dans la base de données et exécutées à la demande, avec des paramètres facultatifs | Encapsuler la logique d'une action que les applications effectuent |
| **Index** | Une copie triée des valeurs d'une colonne, avec des pointeurs vers les lignes | Trouver les lignes plus vite quand la colonne est utilisée dans une clause `WHERE` |

Un index a un coût : il consomme du stockage, et il doit être tenu à jour à chaque insertion, mise à jour et suppression, ce qui ralentit ces opérations. Une table peut avoir plusieurs index ; ils sont surtout utiles sur les tables qui comptent beaucoup de lignes.

> **Conseil d'examen.** « Simplifier une requête complexe » ou « table virtuelle » : vue. « Exécuter la même logique avec des paramètres » : procédure stockée. « Accélérer les recherches » : index.

<!-- section: key-points -->
## Points clés

- Table : entité. Ligne : instance. Colonne : attribut avec un type de données. NULL : pas de valeur.
- La normalisation réduit la duplication et impose l'intégrité : une table par entité, des clés primaires, des clés étrangères.
- Clé composite : plusieurs colonnes. Intégrité référentielle : une clé étrangère doit correspondre à une clé primaire existante.
- DDL : `CREATE`, `ALTER`, `DROP`, `RENAME`. DCL : `GRANT`, `DENY`, `REVOKE`. DML : `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- Vue : table virtuelle. Procédure stockée : instructions enregistrées avec des paramètres. Index : recherches plus rapides, écritures plus lentes.
