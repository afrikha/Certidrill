Fabric offre quatre façons de sélectionner, filtrer et agréger des données : l'éditeur de requête visuel et T-SQL sur les entrepôts et les points de terminaison d'analytique SQL, KQL sur les eventhouses, et DAX sur les modèles sémantiques. Les questions d'examen montrent une courte requête à compléter, ou demandent quel outil ou quel langage convient à un utilisateur et à un magasin de données.

<!-- section: choose-language | objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4 -->
## Choisir un outil de requête

| Données et utilisateur | Outil |
| --- | --- |
| Entrepôt ou point de terminaison d'analytique SQL, analyste qui n'écrit pas de SQL | Éditeur de requête visuel |
| Entrepôt ou point de terminaison d'analytique SQL, compétences SQL, fonctions de fenêtre, jointures entre bases | Éditeur de requête SQL (T-SQL), ou SSMS et Visual Studio Code via la chaîne de connexion |
| Base de données KQL d'un eventhouse : journaux, télémétrie, séries chronologiques | Ensemble de requêtes KQL (KQL ; un sous-ensemble de T-SQL est aussi accepté) |
| Modèle sémantique : mesures, relations, sécurité au niveau des lignes déjà définies | Vue de requête DAX |

> **Conseil d'examen.** Une requête DAX utilise les mesures et la sécurité du modèle ; une requête T-SQL sur le point de terminaison d'analytique SQL lit les tables Delta et ignore le modèle sémantique. Quand une exigence dit « utiliser les mesures existantes », la réponse est DAX.

<!-- section: visual-query-editor | objectives: 2.3.1 -->
## L'éditeur de requête visuel

Disponible dans un entrepôt, un point de terminaison d'analytique SQL et une base de données mise en miroir : **Nouvelle requête visuelle** dans le ruban ouvre un canevas qui utilise la vue de diagramme de Power Query.

1. Faites glisser des tables de l'**Explorateur** vers le canevas (ou **Insérer dans le canevas**).
2. Ajoutez des étapes : chaque étape est un opérateur sur le canevas. Seules les opérations Power Query repliables en SQL sont proposées, par exemple choisir des colonnes, filtrer des lignes, regrouper et fusionner.
3. Pour joindre, sélectionnez **Fusionner des requêtes comme nouvelles** sur une table, choisissez la clé dans chaque table et un **Type de jointure** (Interne, Externe gauche...).
4. Exploitez les résultats : **Télécharger le fichier Excel**, **Visualiser les résultats**, **Enregistrer en tant que vue** ou **Enregistrer en tant que table**.

| Action | Résultat |
| --- | --- |
| Enregistrer en tant que vue | Une vue dans un schéma où vous pouvez créer des objets ; elle apparaît dans l'Explorateur |
| Enregistrer en tant que table | Une table créée avec `CREATE TABLE AS SELECT` (CTAS) |
| Afficher le SQL, puis Modifier le script SQL | Le T-SQL généré, ouvert dans l'éditeur de requête SQL |
| Faire glisser des tables de plusieurs entrepôts | Une requête entre entrepôts |

Limites à retenir :

- Lecture seule : `SELECT` uniquement, ni DDL ni DML.
- **Visualiser les résultats** ne prend pas en charge le SQL avec `ORDER BY`.
- Si une étape ne peut pas être traduite en SQL, une bannière indique que la requête n'est pas prise en charge en tant que vue d'entrepôt.
- Pour des requêtes fusionnées, seule la table avec **Activer le chargement** apparaît dans le script SQL.
- Les requêtes s'enregistrent automatiquement dans **Mes requêtes** ; les utilisateurs du rôle d'espace de travail Viewer et ceux avec qui l'entrepôt a été partagé ne peuvent pas les déplacer dans **Requêtes partagées**.

> **Piège d'examen.** L'éditeur de requête visuel n'écrit jamais de données, sauf via Enregistrer en tant que table. Insérer, mettre à jour ou supprimer des lignes exige l'éditeur de requête SQL dans un entrepôt, ni l'éditeur visuel ni un point de terminaison d'analytique SQL.

<!-- section: sql-queries | objectives: 2.3.2 -->
## Interroger avec SQL

**Nouvelle requête SQL** ouvre l'éditeur ; **Sélectionner les 100 premières lignes** sur une table génère un script de départ. Les requêtes entre bases utilisent des noms en trois parties (`item.schema.table`) sur les entrepôts et points de terminaison d'analytique SQL de l'espace de travail actif, après les avoir ajoutés à l'Explorateur avec **+ Entrepôts**.

```text
WITH Sales2026 AS
(
    SELECT s.CustomerKey, s.OrderDate, s.SalesAmount, c.Country
    FROM SalesWarehouse.dbo.FactSales AS s
    INNER JOIN CrmLakehouse.dbo.Customer AS c ON c.CustomerKey = s.CustomerKey
    WHERE s.OrderDate >= '2026-01-01'
)
SELECT TOP (10)
       Country,
       COUNT(*) AS Orders,
       COUNT(DISTINCT CustomerKey) AS Customers,
       SUM(SalesAmount) AS Revenue,
       RANK() OVER (ORDER BY SUM(SalesAmount) DESC) AS RevenueRank
FROM Sales2026
GROUP BY Country
HAVING SUM(SalesAmount) > 50000
ORDER BY Revenue DESC;
```

Ordre logique d'évaluation, qui explique la plupart des erreurs :

| Étape | Clause | Conséquence |
| --- | --- | --- |
| 1 | `FROM`, `JOIN` | Tables combinées |
| 2 | `WHERE` | Lignes filtrées ; ni agrégats ni alias du `SELECT` |
| 3 | `GROUP BY` | Lignes regroupées |
| 4 | `HAVING` | Groupes filtrés avec des agrégats |
| 5 | `SELECT` (fonctions de fenêtre comprises) | Alias définis |
| 6 | `ORDER BY`, puis `TOP` | Alias utilisables ici |

Les fonctions de fenêtre ajoutent une valeur par ligne sans regrouper les lignes :

| Fonction | Ex aequo (deux lignes à 100) | Usage typique |
| --- | --- | --- |
| `ROW_NUMBER()` | 1, 2 | Garder une ligne par clé |
| `RANK()` | 1, 1, puis 3 | Classement avec trous |
| `DENSE_RANK()` | 1, 1, puis 2 | Classement sans trous |
| `SUM(x) OVER (PARTITION BY p ORDER BY d)` | Sans objet | Cumul par partition |
| `LAG(x)` / `LEAD(x)` | Sans objet | Valeur de la ligne précédente ou suivante |

```text
SELECT OrderDate, StoreID, SalesAmount,
       SUM(SalesAmount) OVER (PARTITION BY StoreID ORDER BY OrderDate) AS RunningTotal,
       LAG(SalesAmount) OVER (PARTITION BY StoreID ORDER BY OrderDate) AS PreviousDay
FROM dbo.DailyStoreSales;
```

> **Piège d'examen.** `COUNT(*)` compte les lignes, `COUNT(col)` ignore les Null et `COUNT(DISTINCT col)` compte les valeurs uniques non Null. « Nombre de clients ayant commandé » s'écrit `COUNT(DISTINCT CustomerKey)`, pas `COUNT(CustomerKey)`.

Sur un point de terminaison d'analytique SQL, la même syntaxe `SELECT` fonctionne, mais les tables sont en lecture seule ; un `INSERT ... SELECT` entre éléments n'est possible que si la cible est un entrepôt.

<!-- section: kql-queries | objectives: 2.3.3 -->
## Interroger avec KQL

Un ensemble de requêtes KQL exécute des requêtes sur une base de données KQL d'un eventhouse. Une requête est un nom de table suivi d'opérateurs enchaînés par `|`, chacun travaillant sur la sortie du précédent.

```kusto
SensorReadings
| where Timestamp > ago(7d) and DeviceType == "Freezer"
| extend TempF = Temperature * 9 / 5 + 32
| summarize AvgTemp = avg(Temperature), MaxTemp = max(Temperature), Readings = count()
    by DeviceId, bin(Timestamp, 1h)
| where MaxTemp > -10
| top 10 by AvgTemp desc
```

```kusto
Orders
| where OrderDate between (datetime(2026-10-01) .. datetime(2026-10-31))
| summarize Orders = count(), Customers = dcount(CustomerId), Late = countif(IsLate == true)
    by Region
| render columnchart
```

```kusto
// Latest reading of each device
SensorReadings
| summarize arg_max(Timestamp, *) by DeviceId
```

| T-SQL | KQL |
| --- | --- |
| `SELECT col1, col2` | `project col1, col2` (`project-away` retire des colonnes) |
| `WHERE` | `where` |
| Colonne calculée `AS` | `extend` |
| `GROUP BY` avec agrégats | `summarize agg() by col` |
| `HAVING` | `where` après `summarize` |
| `ORDER BY` | `order by` ou `sort by` (décroissant par défaut) |
| `TOP (n) ... ORDER BY` | `top n by col` |
| `COUNT(DISTINCT col)` | `dcount(col)` (estimation) ou `count_distinct(col)` (exact) |
| `SELECT DISTINCT` | `distinct col1, col2` |

Opérateurs de chaînes et de temps :

| Opérateur | Sens |
| --- | --- |
| `==` / `=~` | Égal, sensible / insensible à la casse |
| `has` | Contient un terme entier ; utilise l'index de termes, plus rapide |
| `contains` | Contient une sous-chaîne quelconque, plus lent |
| `in`, `!in` | Dans une liste |
| `ago(1h)`, `between (a .. b)` | Temps relatif, plage incluse |
| `bin(Timestamp, 5m)` | Arrondit à l'intervalle inférieur pour les séries chronologiques |

> **Piège d'examen.** `take 10` renvoie 10 lignes quelconques, sans ordre ; « les 10 plus élevées » s'écrit `top 10 by col desc`. Et `order by` sans `asc` trie en ordre décroissant, l'inverse de SQL.

Un ensemble de requêtes KQL accepte aussi un sous-ensemble de T-SQL ; préfixez une requête SQL par `explain` pour voir sa traduction en KQL. `join` utilise par défaut `kind=innerunique`, qui dédoublonne les clés du côté gauche : précisez `kind=inner` ou `kind=leftouter` quand chaque ligne de gauche compte.

<!-- section: dax-queries | objectives: 2.3.4 -->
## Interroger avec DAX

La **vue de requête DAX** exécute des requêtes DAX sur un modèle sémantique : dans Power BI Desktop (icône du volet gauche) ou dans le portail Fabric (**Écrire des requêtes DAX** sur le modèle sémantique). Une requête renvoie une table et ne crée rien dans le modèle.

```text
DEFINE
    MEASURE Sales[Total Sales] = SUM ( Sales[SalesAmount] )
EVALUATE
    SUMMARIZECOLUMNS (
        'Product'[Category],
        'Date'[Month],
        TREATAS ( { 2026 }, 'Date'[Year] ),
        "Total Sales", [Total Sales],
        "Orders", COUNTROWS ( Sales )
    )
ORDER BY 'Product'[Category], 'Date'[Month]

EVALUATE
    TOPN (
        5,
        SUMMARIZECOLUMNS ( 'Product'[Product], "Sales", [Total Sales] ),
        [Sales], DESC
    )

EVALUATE
    CALCULATETABLE (
        SELECTCOLUMNS ( Customer, "Name", Customer[Name], "City", Customer[City] ),
        Customer[Country] = "France"
    )
```

| Idée SQL | Requête DAX |
| --- | --- |
| `SELECT * FROM T` | `EVALUATE T` |
| `WHERE` | `FILTER ( T, condition )` ou `CALCULATETABLE ( expression, filter )` |
| `GROUP BY` avec agrégats | `SUMMARIZECOLUMNS ( group columns, filters, "Name", expression )` |
| `TOP (n)` | `TOPN ( n, table, order expression, DESC )` |
| `ORDER BY` | Clause `ORDER BY` après `EVALUATE` |
| Calcul temporaire | `DEFINE MEASURE` ou `DEFINE VAR` |

Fonctionnalités utiles :

- **Requêtes rapides** depuis le volet Données : Afficher les 100 premières lignes, Afficher les statistiques de colonne, Définir toutes les mesures du modèle, Évaluer une mesure.
- **CodeLens** au-dessus d'un `DEFINE MEASURE` : Mettre à jour le modèle : ajouter une nouvelle mesure, ou Mettre à jour le modèle : remplacer la mesure ; **Mettre à jour le modèle avec les modifications** les applique toutes. Un commentaire `///` devient la description de la mesure.
- L'Analyseur de performances copie la requête DAX d'un visuel, ou **Exécuter** l'ouvre dans la vue de requête DAX.

| Limite ou prérequis | Valeur |
| --- | --- |
| Desktop | 15 Mo de données et 1 000 000 de valeurs par requête |
| Web | 99 999 lignes par requête |
| Autorisation sur le web | Autorisation d'écriture (Write) sur le modèle sémantique, et le paramètre d'espace de travail qui permet de modifier les modèles de données dans le service |
| Viewer avec l'autorisation Build | Utiliser plutôt Power BI Desktop avec une connexion active |

> **Piège d'examen.** `SUMMARIZECOLUMNS` regroupe et agrège en un seul appel, et ses arguments de filtre (comme `TREATAS`) restreignent le résultat. `SUMMARIZE` avec des colonnes d'extension est l'ancien modèle ; `FILTER` sur une table de faits entière est le modèle lent.

<!-- section: key-points -->
## Points clés

- Éditeur de requête visuel : diagramme Power Query sur un entrepôt ou un point de terminaison d'analytique SQL, étapes repliables seulement, lecture seule ; Enregistrer en tant que vue ou en tant que table (CTAS).
- T-SQL : `WHERE` avant le regroupement, `HAVING` après ; alias utilisables seulement dans `ORDER BY` ; noms en trois parties pour les requêtes entre bases dans l'espace de travail actif.
- `ROW_NUMBER`, `RANK` et `DENSE_RANK` ne diffèrent que sur les ex aequo.
- KQL : `where`, `project`, `extend`, `summarize ... by bin()`, `top n by` ; `take` est sans ordre ; `has` est plus rapide que `contains` ; `=~` ignore la casse.
- Requête DAX : `EVALUATE` renvoie une table, `DEFINE MEASURE` ajoute des mesures temporaires, `SUMMARIZECOLUMNS` regroupe et agrège.
- Les requêtes DAX utilisent les mesures et la sécurité du modèle ; le SQL sur le point de terminaison, non.
