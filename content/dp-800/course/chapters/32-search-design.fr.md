Le moteur de base de données SQL offre deux moteurs de recherche dans la base de données : la recherche en texte intégral, qui fait correspondre des mots, et la recherche vectorielle, qui fait correspondre un sens. Les questions d'examen décrivent ce que tapent les utilisateurs et ce qu'ils attendent en retour, puis demandent quelle approche choisir, comment déclarer la colonne vectorielle et son index, quelle fonction vectorielle appeler, et si une recherche exacte ou approximative convient au volume de données.

<!-- section: choose-search | objectives: 3.2.1 -->
## Choisir entre texte intégral, recherche vectorielle et recherche hybride

| Approche | Fait correspondre | Classement | Nécessite |
| --- | --- | --- | --- |
| Recherche en texte intégral | Des mots et leurs formes : termes, expressions, préfixes, flexions, proximité | Colonne `RANK` de `CONTAINSTABLE` / `FREETEXTTABLE` (pertinence de type BM25) | Un catalogue de texte intégral et un index de recherche en texte intégral |
| Recherche vectorielle sémantique | Le sens : « chaussures de trail » trouve « chaussures de randonnée » sans mot commun | Distance entre le vecteur de la requête et chaque vecteur stocké | Un modèle d'incorporation (embedding), une colonne `vector`, éventuellement un index vectoriel |
| Recherche hybride | Les deux : termes exacts et sens | Les deux listes classées fusionnées, en général par fusion de classement réciproque (RRF) | Les deux éléments ci-dessus |

Table de décision :

| Exigence de la question | Réponse |
| --- | --- |
| Codes produits, références, noms, expressions exactes, « mots commençant par » | Recherche en texte intégral (ou un simple `LIKE` / une recherche d'index pour des codes exacts) |
| Questions en langage naturel, paraphrases et synonymes absents d'un dictionnaire des synonymes, requêtes dans d'autres langues avec un modèle multilingue | Recherche vectorielle |
| Les utilisateurs mélangent des termes exacts (« SKU X200 ») et une description (« silencieux la nuit »), meilleure pertinence globale | Recherche hybride |
| Aucun appel à un modèle d'IA autorisé au moment de la requête, aucun coût d'incorporation | Recherche en texte intégral |
| Fournir à un modèle de langage les lignes les plus pertinentes (RAG) | Recherche vectorielle ou hybride |

> **Piège d'examen.** La recherche en texte intégral fait correspondre des mots, pas des concepts. Sans dictionnaire des synonymes configuré, une requête sur « VTT » ne trouve pas « vélo tout-terrain ». Quand l'énoncé dit que les utilisateurs décrivent ce qu'ils veulent avec leurs propres mots, la réponse est la recherche vectorielle ou hybride, pas une nouvelle liste de mots vides.

La recherche vectorielle coûte un appel d'incorporation par requête (le texte de la requête doit être transformé en vecteur avec le même modèle que les vecteurs stockés) et le stockage des vecteurs. La recherche en texte intégral ne coûte que l'index.

<!-- section: full-text | objectives: 3.2.2 -->
## Implémenter la recherche en texte intégral

Un index de recherche en texte intégral nécessite trois éléments : un **catalogue de texte intégral** (ou un catalogue par défaut), un **index unique, sur une seule colonne non nullable** de la table, utilisé comme `KEY INDEX` (une clé entière est la plus performante), et les colonnes de texte à indexer. La recherche en texte intégral est disponible dans SQL Server, Azure SQL Database et Azure SQL Managed Instance.

```text
CREATE FULLTEXT CATALOG ProductCatalog AS DEFAULT;
GO
-- The KEY INDEX is the unique index behind the primary key
CREATE FULLTEXT INDEX ON dbo.Products
(
    Name LANGUAGE 1033,
    Description LANGUAGE 1033
)
KEY INDEX PK_Products
ON ProductCatalog
WITH CHANGE_TRACKING = AUTO, STOPLIST = SYSTEM;
GO
```

| Option | Valeurs |
| --- | --- |
| `LANGUAGE` | Par colonne : un LCID comme `1033`, un LCID hexadécimal comme `0x409` ou un nom de `sys.syslanguages`. Par défaut : la langue de texte intégral par défaut de l'instance |
| `CHANGE_TRACKING` | `AUTO` (par défaut) : les modifications sont propagées automatiquement. `MANUAL` : exécutez vous-même `ALTER FULLTEXT INDEX ... START UPDATE POPULATION`. `OFF` : pas de suivi ; `OFF, NO POPULATION` crée l'index vide |
| `STOPLIST` | `SYSTEM` (par défaut), `OFF` ou une liste de mots vides personnalisée |
| `TYPE COLUMN` | Uniquement pour les colonnes `varbinary(max)` ou `image` : désigne la colonne qui contient l'extension du fichier (`.pdf`, `.docx`) |

Règles à retenir : **un seul index de recherche en texte intégral par table** (jusqu'à 1 024 colonnes), les types indexables sont `char`, `varchar`, `nchar`, `nvarchar`, `text`, `ntext`, `image`, `xml` et `varbinary(max)`, et `CREATE FULLTEXT INDEX` ne peut pas s'exécuter dans une transaction utilisateur. Le créer nécessite `REFERENCES` sur le catalogue et `ALTER` sur la table.

Prédicats et fonctions de requête :

| Construction | Retourne | Usage |
| --- | --- | --- |
| `CONTAINS(column, 'condition')` | Booléen, dans `WHERE` | Conditions précises : terme, expression, préfixe, flexion, proximité |
| `FREETEXT(column, 'text')` | Booléen, dans `WHERE` | Texte libre : les mots sont séparés, réduits à leur racine et associés à leurs formes fléchies |
| `CONTAINSTABLE(table, column, 'condition')` | Table avec `[KEY]` et `RANK` | Comme `CONTAINS`, avec un classement par pertinence |
| `FREETEXTTABLE(table, column, 'text')` | Table avec `[KEY]` et `RANK` | Comme `FREETEXT`, avec un classement par pertinence |

```text
-- Condition syntax of CONTAINS / CONTAINSTABLE
WHERE CONTAINS(Description, 'aluminum')                          -- term
WHERE CONTAINS(Description, '"mountain bike"')                   -- phrase
WHERE CONTAINS(Description, '"light*"')                          -- prefix
WHERE CONTAINS(Description, 'FORMSOF(INFLECTIONAL, "ride")')     -- ride, rides, riding
WHERE CONTAINS(Description, 'NEAR((light, aluminum))')           -- proximity

-- Ranked results: join on [KEY], sort on RANK
SELECT p.ProductID, p.Name, ft.[RANK]
FROM dbo.Products AS p
INNER JOIN FREETEXTTABLE(dbo.Products, Description, 'quiet tent for windy nights') AS ft
    ON p.ProductID = ft.[KEY]
ORDER BY ft.[RANK] DESC;
```

> **Piège d'examen.** `CONTAINS` et `FREETEXT` ne font que filtrer : ils ne retournent aucun score. Pour trier par pertinence ou alimenter une recherche hybride, utilisez `CONTAINSTABLE` ou `FREETEXTTABLE` et joignez leur colonne `[KEY]` à la clé de la table.

<!-- section: vector-data | objectives: 3.2.3 -->
## Concevoir pour les données vectorielles

Le type `vector` stocke une incorporation dans un format binaire optimisé et l'expose sous forme de tableau JSON.

```text
CREATE TABLE dbo.ProductEmbeddings
(
    ProductID   INT NOT NULL PRIMARY KEY,
    Embedding   VECTOR(1536) NOT NULL,          -- float32 by default
    EmbeddingHp VECTOR(3072, float16) NULL      -- half precision
);

INSERT INTO dbo.ProductEmbeddings (ProductID, Embedding)
VALUES (1, '[0.012, -0.034, ...]');             -- a JSON array with exactly 1536 numbers
```

| Type de base | Dimensions max | Stockage par élément | Statut |
| --- | --- | --- | --- |
| `float32` (par défaut) | 1 998 | 4 octets | En disponibilité générale (GA) sur toutes les plateformes |
| `float16` | 3 996 | Demi-précision : moins de stockage, moins de précision | GA dans Azure SQL Database, SQL Database dans Fabric, Azure SQL Managed Instance (Always-up-to-date) ; préversion dans SQL Server 2025 (`PREVIEW_FEATURES = ON`) |

La **taille** guide la conception. Un `VECTOR(1536)` en float32 contient 6 144 octets de valeurs par ligne : un million de lignes représente environ 6 Go avant tout index. Le nombre de dimensions est fixé par le modèle d'incorporation (ou par son paramètre `dimensions`), et chaque vecteur de la colonne doit avoir exactement ce nombre : une différence lève l'erreur 42204.

Limitations d'une colonne `vector` :

- Uniquement `NULL` / `NOT NULL` : aucune contrainte `DEFAULT`, `CHECK`, `PRIMARY KEY`, `FOREIGN KEY` ou `UNIQUE`.
- Aucun index B-tree ou columnstore sur la colonne ; elle peut être une colonne **incluse** d'un index.
- Aucun opérateur de comparaison ou arithmétique ; utilisez les fonctions vectorielles.
- Interdite dans les tables à mémoire optimisée, avec Always Encrypted, dans `sql_variant` ou comme type d'alias.
- Conversion implicite depuis et vers `varchar`, `nvarchar` et `json` (tableau JSON) ; vers rien d'autre.
- Les clients qui ne prennent pas en charge le format natif (TDS 7.4 avec des pilotes récents, comme Microsoft.Data.SqlClient 6.1) reçoivent le vecteur sous forme de chaîne JSON.

Un **index vectoriel** (`CREATE VECTOR INDEX`) construit une structure de plus proche voisin approximatif (ANN) avec l'algorithme DiskANN :

| Règle | Détail |
| --- | --- |
| Objet | Une table de base : ni vue, ni table temporaire |
| Données | Au moins 100 lignes avec un vecteur non NULL, sinon erreur 42266 |
| Métrique | Une par index : `cosine`, `euclidean` ou `dot` |
| DML | Dernière version de l'index : `INSERT`, `UPDATE`, `DELETE`, `MERGE` maintenus automatiquement |
| Non pris en charge | Partitionnement de l'index, réplication vers les abonnés, `TRUNCATE TABLE` sur la table, déploiement dans un DACPAC |
| Statut | GA dans Azure SQL Database, SQL Database dans Fabric et Managed Instance (Always-up-to-date) ; préversion dans SQL Server 2025 |

Modèle de conception : conservez les vecteurs dans une **table d'incorporations dédiée** (clé de la ligne source, texte du bloc, vecteur). Elle isole l'espace qu'ils occupent, et les incorporations peuvent être reconstruites sans toucher aux lignes sources.

> **Piège d'examen.** Un modèle d'incorporation qui retourne 3 072 dimensions ne tient pas dans une colonne `VECTOR` en float32 (1 998 au maximum). Demandez moins de dimensions au modèle (paramètre `"dimensions"`) ou utilisez `VECTOR(3072, float16)`.

<!-- section: vector-functions | objectives: 3.2.4 -->
## Fonctions vectorielles pour la recherche sémantique

| Fonction | Retourne | Quand l'utiliser |
| --- | --- | --- |
| `VECTOR_DISTANCE(metric, v1, v2)` | Distance de type `float` | Recherche exacte : calcule la distance pour chaque ligne candidate, **n'utilise jamais un index vectoriel** |
| `VECTOR_SEARCH(TABLE, COLUMN, SIMILAR_TO, METRIC)` | Lignes de la table plus une colonne `distance` | Recherche approximative par un index vectoriel (repli sur un kNN exact sans index correspondant) |
| `VECTOR_NORMALIZE(v, norm_type)` | Vecteur de longueur 1 | Mettre les vecteurs à l'échelle avant une comparaison `dot` ou quand le modèle ne retourne pas de vecteurs normalisés |
| `VECTORPROPERTY(v, property)` | `Dimensions` (int) ou `BaseType` (sysname) | Vérifier la forme d'un vecteur : validation, diagnostic des différences de dimensions |

Métriques de distance, avec **plus petit = plus similaire** pour les trois :

| Métrique | Plage | Signification |
| --- | --- | --- |
| `cosine` | 0 à 2 | 0 = même direction, 2 = direction opposée. Le choix habituel pour les incorporations de texte |
| `euclidean` | 0 à l'infini | Distance en ligne droite ; 0 = identiques |
| `dot` | moins l'infini à plus l'infini | Produit scalaire **négatif**, pour que plus petit signifie toujours plus similaire |

`VECTOR_NORMALIZE` accepte `norm1` (somme des valeurs absolues), `norm2` (longueur euclidienne, le choix courant) et `norminf` (plus grande valeur absolue). Après une normalisation `norm2`, le produit scalaire et le cosinus donnent le même ordre. Les modèles d'incorporation Azure OpenAI retournent déjà des vecteurs normalisés.

```text
DECLARE @q VECTOR(1536) = AI_GENERATE_EMBEDDINGS(N'waterproof jacket for kids' USE MODEL EmbeddingModel);

-- Exact: top 10 by cosine distance
SELECT TOP (10) e.ProductID,
       VECTOR_DISTANCE('cosine', @q, e.Embedding) AS distance
FROM dbo.ProductEmbeddings AS e
ORDER BY distance;

-- Threshold instead of top N
SELECT e.ProductID
FROM dbo.ProductEmbeddings AS e
WHERE VECTOR_DISTANCE('cosine', @q, e.Embedding) < 0.3;

-- Shape of a vector
SELECT VECTORPROPERTY(@q, 'Dimensions') AS dims,
       VECTORPROPERTY(@q, 'BaseType') AS base_type;

-- Normalize before storing
UPDATE dbo.ProductEmbeddings SET Embedding = VECTOR_NORMALIZE(Embedding, 'norm2');
```

> **Piège d'examen.** Créer un index vectoriel n'accélère pas une requête écrite avec `VECTOR_DISTANCE` : cette fonction calcule toujours des distances exactes. Pour utiliser l'index, réécrivez la requête avec `VECTOR_SEARCH`.

<!-- section: ann-enn | objectives: 3.2.5 -->
## ANN ou ENN

| | Plus proche voisin exact (ENN, aussi appelé kNN) | Plus proche voisin approximatif (ANN) |
| --- | --- | --- |
| Fonctionnement | Distance à chaque vecteur candidat, puis tri | Parcours d'un graphe DiskANN construit par l'index vectoriel |
| Résultat | Top N exact, rappel = 1 | Top N approximatif ; rappel proche de 1 |
| T-SQL | `VECTOR_DISTANCE` avec `ORDER BY ... TOP (N)` | `VECTOR_SEARCH` avec `SELECT TOP (N) WITH APPROXIMATE` |
| Index | Aucun | Un index vectoriel sur la colonne, avec la même métrique |
| Convient | Moins d'environ **50 000 vecteurs** à comparer, ou des filtres qui réduisent les candidats à ce nombre | Grandes tables où parcourir chaque vecteur est trop lent ou trop coûteux |

Le **rappel** (recall) est la proportion des vrais plus proches voisins (ceux que retourne une recherche exacte) que la recherche approximative retourne aussi ; 1 signifie aucune approximation. Comme les incorporations sont elles-mêmes des approximations du sens, une recherche ANN dont le rappel est proche de 1 change très peu les réponses, pour beaucoup moins de processeur et de latence.

Le repère des 50 000 compte les vecteurs réellement comparés, pas la taille de la table : une table de dix millions de lignes interrogée pour un seul locataire dont le filtre laisse 20 000 lignes convient toujours à une recherche exacte.

Comment `VECTOR_SEARCH` décide :

| Requête | Recherche effectuée |
| --- | --- |
| `SELECT TOP (N) WITH APPROXIMATE ... ORDER BY distance`, index correspondant | ANN (l'optimiseur peut encore choisir une analyse kNN si elle est moins coûteuse) |
| `SELECT TOP (N) ... ORDER BY distance` sans `APPROXIMATE` | kNN exact |
| Aucun index avec la même métrique sur la colonne | kNN exact, avec un avertissement |
| Indicateur de table `FORCE_ANN_ONLY` | ANN uniquement ; nécessite l'index et `TOP (N) WITH APPROXIMATE` |

> **Conseil d'examen.** « Les résultats doivent être exactement les lignes les plus proches » ou « quelques milliers de lignes » orientent vers ENN avec `VECTOR_DISTANCE`. « Des millions de lignes », « la latence la plus faible » et « une petite perte de précision est acceptable » orientent vers ANN avec un index vectoriel et `VECTOR_SEARCH`.

<!-- section: key-points -->
## Points clés

- Mots et codes : texte intégral. Sens : vecteur. Les deux, meilleure pertinence : hybride.
- Index de recherche en texte intégral : catalogue + `KEY INDEX` unique, non nullable, sur une seule colonne ; un par table ; `CHANGE_TRACKING = AUTO` par défaut ; le classement nécessite `CONTAINSTABLE` / `FREETEXTTABLE`.
- `VECTOR(n)` : float32 jusqu'à 1 998 dimensions (4 octets chacune), float16 jusqu'à 3 996 ; les dimensions doivent correspondre au modèle ; ni contrainte ni index B-tree sur la colonne.
- Index vectoriel : DiskANN, une métrique, table de base avec au moins 100 vecteurs, pas de partitionnement, pas de `TRUNCATE`.
- `VECTOR_DISTANCE` = exact, ignore les index ; `VECTOR_SEARCH` = approximatif par l'index ; `VECTOR_NORMALIZE` = longueur unitaire ; `VECTORPROPERTY` = dimensions et type de base.
- ENN sous environ 50 000 vecteurs comparés ou quand l'exactitude est exigée ; ANN pour les gros volumes, mesuré par le rappel.
