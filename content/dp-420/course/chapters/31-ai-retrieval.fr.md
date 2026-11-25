Azure Cosmos DB for NoSQL stocke les données opérationnelles, leur texte et leurs incorporations vectorielles (embeddings) dans les mêmes éléments, et les retrouve par recherche en texte intégral (BM25), par recherche de similarité vectorielle et par recherche hybride, qui fusionne les deux. Les questions d'examen donnent une définition de conteneur ou une requête et demandent quelle stratégie, quel index, quelle fonction ou quelle option répond à une exigence de pertinence, de latence, de coût en RU ou d'isolation des locataires.

<!-- section: full-text | objectives: 3.1.1 -->
## Recherche en texte intégral

La recherche en texte intégral segmente le texte en jetons, réduit les mots à leur racine et supprime les mots vides des propriétés de texte, puis classe les correspondances avec **BM25** (fréquence du terme, fréquence inverse dans les documents, longueur du document). Elle exige deux définitions sur le conteneur, ainsi que la fonctionnalité de recherche en texte intégral et hybride activée sur le compte (Paramètres > Fonctionnalités) :

```json
{
  "defaultLanguage": "en-US",
  "fullTextPaths": [
    { "path": "/description", "language": "en-US" },
    { "path": "/reviews/[]/text", "language": "en-US" }
  ]
}
```

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [ { "path": "/*" } ],
  "excludedPaths": [ { "path": "/\"_etag\"/?" } ],
  "fullTextIndexes": [
    { "path": "/description" },
    { "path": "/reviews/[]/text" }
  ]
}
```

La première est la **stratégie de texte intégral** du conteneur (chemins et langue, notation de tableau autorisée) ; la seconde est la stratégie d'indexation avec `fullTextIndexes`, dont les chemins doivent correspondre à la stratégie. Sans elles, les fonctions s'exécutent quand même, mais sans l'index : plus de RU et plus de latence.

| Fonction | Renvoie | Clause |
| --- | --- | --- |
| `FullTextContains(c.p, "red bicycle")` | true si l'expression est présente | `WHERE` |
| `FullTextContainsAll(c.p, "red", "bicycle")` | true si chaque terme est présent, n'importe où | `WHERE` |
| `FullTextContainsAny(c.p, "bicycle", "skateboard")` | true si au moins un terme est présent | `WHERE` |
| `FullTextScore(c.p, "mountain", "bicycle")` | Score de pertinence BM25 | `ORDER BY RANK` uniquement |

```text
SELECT TOP 10 c.id, c.name
FROM c
WHERE FullTextContains(c.description, "waterproof")
  AND FullTextContains(c.description, {"term": "jaket", "distance": 1})
ORDER BY RANK FullTextScore(c.description, "hiking", "jacket")
```

La forme objet `{"term": ..., "distance": n}` est la **recherche approximative** (fuzzy) : elle tolère des fautes de frappe jusqu'à une distance d'édition de 2. Les facettes n'ont pas d'opérateur dédié : utilisez `GROUP BY` avec `COUNT(1)`, ou `COUNTIF` pour des plages, sur l'ensemble filtré.

Langues : `en-US` ; `de-DE`, `es-ES`, `fr-FR`, `it-IT`, `pt-PT` et `pt-BR` sont en préversion (inscription aux nouvelles fonctionnalités de recherche en texte intégral du compte). La suppression des mots vides ne s'applique qu'à l'anglais.

> **Piège d'examen.** `FullTextScore` ne peut être ni projeté dans `SELECT` ni utilisé dans `WHERE` : il n'apparaît qu'après `ORDER BY RANK`. Pour filtrer sur des termes, utilisez `FullTextContains`, `FullTextContainsAll` ou `FullTextContainsAny`.

<!-- section: vector-design | objectives: 3.1.2 -->
## Concevoir pour les données vectorielles

L'indexation et la recherche vectorielles sont activées par défaut : aucune inscription à une fonctionnalité ni aucune fonctionnalité de compte n'est nécessaire. D'anciennes pages Learn demandent encore d'activer la fonctionnalité `EnableNoSQLVectorSearch` (Paramètres > Fonctionnalités), dont les comptes actuels n'ont pas besoin.

La **stratégie d'incorporation vectorielle** du conteneur décrit chaque chemin vectoriel :

```json
{
  "vectorEmbeddings": [
    { "path": "/contentVector", "dataType": "float32", "distanceFunction": "cosine", "dimensions": 1536 },
    { "path": "/imageVector", "dataType": "float16", "distanceFunction": "dotproduct", "dimensions": 512 }
  ]
}
```

| Propriété | Valeurs | Remarques |
| --- | --- | --- |
| `path` | Un chemin de propriété | Une stratégie par chemin ; plusieurs chemins vectoriels par conteneur autorisés |
| `dataType` | `float32`, `float16`, `int8`, `uint8` | `float16` divise par deux le stockage des vecteurs, avec une légère perte de précision possible |
| `dimensions` | Longueur du vecteur (1536 par défaut) | Chaque vecteur du chemin a cette longueur ; elle doit correspondre au modèle d'incorporation |
| `distanceFunction` | `cosine` (par défaut), `dotproduct`, `euclidean` | Cosinus : -1 à +1, plus élevé = plus proche ; produit scalaire : plus élevé = plus proche ; euclidienne : 0 = le plus proche |

La stratégie d'indexation déclare ensuite un **index vectoriel** par chemin, de l'un des trois types :

| Type | Dimensions max | Recherche | Quand |
| --- | --- | --- | --- |
| `flat` | 505 | Force brute, exacte (rappel de 100 %) | Recherches petites et filtrées ; petites incorporations |
| `quantizedFlat` | 4 096 | Force brute sur des vecteurs compressés, rappel légèrement inférieur à 100 % ; moins cher et plus rapide que `flat` | Environ 50 000 vecteurs ou moins par partition physique, ou filtres étroits |
| `diskANN` | 4 096 | Plus proches voisins approximatifs (DiskANN), rappel élevé, latence et RU les plus faibles | Plus d'environ 50 000 vecteurs par partition physique |

`quantizedFlat` et `diskANN` exigent au moins 1 000 vecteurs ; en dessous, la requête effectue une analyse complète. Les deux acceptent `quantizerType` : `product` (par défaut) ou `spherical`, qui peut raccourcir la quantification et donner un rappel plus élevé et plus stable sur des incorporations de très grande dimension.

Taille : un vecteur coûte le nombre de dimensions multiplié par 4 octets en `float32`, 2 en `float16`, 1 en `int8` ou `uint8`. Une incorporation de 3 072 dimensions ne peut pas utiliser `flat` (505 au maximum) mais tient dans `quantizedFlat` ou `diskANN`. Dans l'élément, le vecteur est stocké comme un tableau JSON, bien plus volumineux que sa taille binaire, qui compte dans la limite de 2 Mo par élément.

Règles et limites :

- Les chemins vectoriels ne peuvent pas utiliser de caractères génériques (`*`, `[]`) ni se trouver dans des tableaux.
- La recherche vectorielle n'est pas prise en charge avec le **débit partagé** (débit provisionné sur la base de données).
- Une définition d'incorporation vectorielle ou d'index vectoriel existante ne peut pas être modifiée sur place : planifiez le modèle, les dimensions et la distance avant de créer le conteneur (un changement impose de retirer puis de rajouter le chemin, ou un nouveau conteneur). Une fois activée sur un conteneur, la recherche vectorielle ne peut pas être désactivée.
- Les conteneurs à clés de partition hiérarchiques exigent que le compte soit configuré par l'équipe produit (contact indiqué sur Learn).

> **Piège d'examen.** La valeur `dimensions` est fixée par le modèle d'incorporation, pas choisie pour le coût. Changer de modèle ou de taille de sortie impose de recalculer l'incorporation de chaque élément et une nouvelle définition vectorielle.

<!-- section: vector-partitioning | objectives: 3.1.3 -->
## Partitionnement vectoriel et DiskANN partitionné (sharded)

Un index DiskANN est construit **par partition physique**. Une requête vectorielle sans filtre sur la clé de partition est diffusée vers chaque partition physique, interroge chaque index et fusionne les résultats ; une requête qui filtre sur la clé de partition n'interroge qu'une partition. Dans les conceptions multilocataires, cela détermine à la fois le coût et l'isolation :

| Modèle | Isolation | Requête vectorielle | Quand |
| --- | --- | --- | --- |
| Clé de partition = locataire | Logique | Une seule partition avec `WHERE c.tenantId = @t` | Beaucoup de locataires de taille similaire ; moins de 20 Go chacun |
| Clé de partition hiérarchique (locataire, puis un ID à forte cardinalité) | Logique, plus fine | Cible les partitions du locataire | Locataires au-delà de 20 Go |
| Conteneur ou base de données par locataire | Performances, pas sécurité | Limitée au conteneur | Nombre moyen de locataires avec un débit séparé |
| Compte par locataire | Physique | Limitée au compte | Quelques locataires importants ou réglementés (régions, clés, restauration propres) |

Le **DiskANN partitionné** (sharded DiskANN) découpe davantage un index DiskANN, selon n'importe quelle propriété de l'élément, avec `vectorIndexShardKey`. Le conteneur obtient un index DiskANN par valeur de cette propriété :

```json
{
  "vectorIndexes": [
    { "path": "/contentVector", "type": "diskANN", "vectorIndexShardKey": ["/tenantId"] }
  ]
}
```

Une requête est concentrée sur un shard par un filtre d'égalité sur la clé de shard :

```text
SELECT TOP 10 c.id, c.title
FROM c
WHERE c.tenantId = @tenantId
ORDER BY VectorDistance(c.contentVector, @queryVector)
```

Des index plus petits donnent une latence et des RU plus faibles, un meilleur rappel dans le shard et l'isolation des vecteurs de chaque locataire ou catégorie. La clé de shard peut être n'importe quelle propriété, y compris la clé de partition ; pour les applications multilocataires, utilisez la clé de partition ou son premier niveau. Sans `vectorIndexShardKey`, l'index reste un index DiskANN global par partition physique, toujours filtrable avec `WHERE`.

> **Conseil d'examen.** « Rechercher uniquement dans un locataire (ou une catégorie) parmi des millions de vecteurs, avec le moins de RU et le meilleur rappel » désigne `vectorIndexShardKey` sur cette propriété plus un filtre d'égalité sur elle. Un filtre `WHERE` sur un index DiskANN non partitionné filtre, mais ne réduit pas l'index parcouru.

<!-- section: vector-search | objectives: 3.1.4 -->
## Implémenter la recherche vectorielle

```text
VectorDistance(<vector_expr_1>, <vector_expr_2>, [<bool_expr>], [<obj_expr>])
```

| Argument | Signification |
| --- | --- |
| `vector_expr_1`, `vector_expr_2` | La propriété vectorielle stockée et le vecteur de la requête (tableaux à une dimension) |
| `bool_expr` | `true` = force brute ; `false` (par défaut) = utiliser l'index vectoriel s'il existe |
| `obj_expr` | Options : `distanceFunction`, `dataType`, `searchListSizeMultiplier`, `quantizedVectorListMultiplier`, `filterPriority` |

Utilisez toujours **`TOP N`** avec `ORDER BY VectorDistance(...)` : sans lui, la requête renvoie bien plus de résultats que nécessaire, avec un coût en RU et une latence plus élevés. Le tri place les éléments les plus similaires en premier quelle que soit la fonction de distance. Passez le vecteur de la requête en paramètre, calculé avec le **même modèle** que les vecteurs stockés.

C# (SDK .NET 3.45.0 ou ultérieur), création du conteneur et requête :

```text
var embeddings = new Collection<Embedding>
{
    new Embedding { Path = "/contentVector", DataType = VectorDataType.Float32,
                    DistanceFunction = DistanceFunction.Cosine, Dimensions = 1536 }
};
var props = new ContainerProperties("products", "/categoryId")
{
    VectorEmbeddingPolicy = new VectorEmbeddingPolicy(embeddings),
    IndexingPolicy = new IndexingPolicy
    {
        VectorIndexes = new() { new VectorIndexPath { Path = "/contentVector", Type = VectorIndexType.DiskANN } }
    }
};
props.IndexingPolicy.IncludedPaths.Add(new IncludedPath { Path = "/*" });
props.IndexingPolicy.ExcludedPaths.Add(new ExcludedPath { Path = "/contentVector/*" });
Container container = await database.CreateContainerIfNotExistsAsync(props);

var q = new QueryDefinition(
    "SELECT TOP 5 c.id, c.name, VectorDistance(c.contentVector, @v) AS score " +
    "FROM c ORDER BY VectorDistance(c.contentVector, @v)").WithParameter("@v", queryVector);
```

Python (`azure-cosmos`) :

```text
container = db.create_container_if_not_exists(
    id="products", partition_key=PartitionKey(path="/categoryId"),
    indexing_policy=indexing_policy, vector_embedding_policy=vector_embedding_policy)

items = container.query_items(
    query="SELECT TOP 5 c.id, c.name, VectorDistance(c.contentVector, @v) AS score "
          "FROM c WHERE c.categoryId = @cat ORDER BY VectorDistance(c.contentVector, @v)",
    parameters=[{"name": "@v", "value": query_vector}, {"name": "@cat", "value": "tents"}],
    partition_key="tents")
```

La recherche vectorielle se combine avec n'importe quel filtre `WHERE` (prix, date, locataire). Projetez le score et les champs utiles, pas l'incorporation elle-même.

> **Piège d'examen.** Un tableau multidimensionnel passé à `VectorDistance` ne renvoie ni score ni erreur : la requête ne renvoie silencieusement rien d'utile. Le vecteur de la requête doit être un tableau plat ayant les dimensions de la stratégie.

<!-- section: hybrid-search | objectives: 3.1.5 -->
## Recherche hybride

La recherche hybride fusionne un classement vectoriel et un classement BM25 avec la **fusion de rangs réciproques** (Reciprocal Rank Fusion, `RRF`). Prérequis : recherche en texte intégral activée sur le compte (la recherche vectorielle l'est par défaut), et un conteneur doté d'une stratégie vectorielle, d'une stratégie de texte intégral, d'un index vectoriel et d'un index de texte intégral.

```text
SELECT TOP 10 c.id, c.name
FROM c
WHERE c.categoryId = @cat
ORDER BY RANK RRF(VectorDistance(c.contentVector, @v),
                  FullTextScore(c.description, "waterproof", "jacket"),
                  [2, 1])
```

| Élément | Règle |
| --- | --- |
| `RRF(f1, f2, ...)` | Deux fonctions de score ou plus : `VectorDistance` et `FullTextScore`, deux `FullTextScore` ou deux `VectorDistance` |
| Pondérations | Tableau facultatif en **dernier** argument, une pondération par fonction ; `[2, 1]` rend le premier classement deux fois plus important |
| Clause | Uniquement dans `ORDER BY RANK` ; ne peut pas être combiné avec un `ORDER BY` sur d'autres propriétés ; ne peut pas être projeté |
| Index | Un index de texte intégral est obligatoire |

| Exigence | Requête |
| --- | --- |
| Codes produit exacts, messages d'erreur, noms | Texte intégral (`FullTextContains`, `FullTextScore`) |
| Sens, paraphrases, autres langues | Vectorielle (`VectorDistance`) |
| Les deux types de questions dans une même zone de recherche | Hybride (`RRF`) |
| Classer les candidats finaux par pertinence approfondie | Semantic Reranker après la récupération |

**Semantic Reranker** (préversion) réordonne jusqu'à 50 documents candidats par appel avec le modèle de classement sémantique de Microsoft et renvoie un score de pertinence de 0 à 1 (.NET : `container.SemanticRerankAsync(context, documents, options)`). Il exige d'activer la fonctionnalité et le rôle **Semantic Reranker User** pour l'identité appelante ; il ajoute de la latence et est facturé par appel.

<!-- section: retrieval-performance | objectives: 3.1.6 -->
## Optimiser les performances de texte intégral et de vecteur

| Levier | Effet |
| --- | --- |
| Exclure le chemin vectoriel de l'index de plage (`/contentVector/*` dans `excludedPaths`) | Moins de RU et de latence à l'insertion ; sinon chaque nombre est aussi indexé en plage |
| Type d'index adapté au nombre de vecteurs par partition physique | `quantizedFlat` jusqu'à environ 50 000, `diskANN` au-delà |
| Filtrer sur la clé de partition, ou sur la `vectorIndexShardKey` | Parcourt une partition ou un shard au lieu de tous |
| `TOP N` avec un petit N ; projeter seulement les champs utiles | Moins de résultats lus et renvoyés |
| `searchListSizeMultiplier` (requête, DiskANN) | Plus élevé = meilleur rappel, plus de latence et de RU |
| `quantizedVectorListMultiplier` (requête) | Plus élevé = plus de candidats quantifiés revérifiés : meilleur rappel, plus de latence et de RU |
| `filterPriority` (requête) | Poids du filtre `WHERE` par rapport à la recherche DiskANN |
| `quantizationByteSize` (index, `quantizedFlat` et `diskANN` ; 1 à 512, valeur par défaut dynamique) | Plus grand = meilleure précision, plus de RU et de latence |
| `indexingSearchListSize` (index, `diskANN` ; 10 à 500, 100 par défaut) | Plus grand = meilleure précision, construction d'index plus longue et latence d'ingestion plus élevée |
| Type de données `float16` ou `int8` | Vecteurs plus petits, précision éventuellement moindre |
| Index de texte intégral sur chaque chemin de texte recherché | Les fonctions de texte intégral utilisent l'index au lieu de charger les éléments |

```text
SELECT TOP 10 c.id, c.title
FROM c
WHERE c.publishedAt >= @since
ORDER BY VectorDistance(c.contentVector, @v, false,
         {"searchListSizeMultiplier": 10, "filterPriority": 0.5})
```

Les résultats DiskANN sont approximatifs et peuvent varier légèrement d'une exécution à l'autre. Testez le rappel avec de vraies incorporations (des vecteurs aléatoires sont un mauvais test) et limitez le rythme de l'ingestion en masse : charger plus de 5 millions de vecteurs en peu de temps peut exiger un temps de construction d'index supplémentaire.

> **Piège d'examen.** Augmenter `searchListSizeMultiplier` ou `quantizationByteSize` améliore le rappel mais augmente les RU et la latence. Quand l'exigence est « le moins de RU », baissez-les, filtrez sur la clé de shard ou réduisez `TOP N` ; quand elle est « un meilleur rappel avec le même index », augmentez le multiplicateur de requête plutôt que de reconstruire l'index.

<!-- section: rag | objectives: 3.1.7 -->
## Génération augmentée par récupération (RAG)

La RAG ancre un grand modèle de langage dans vos données : récupérer les éléments les plus pertinents, les ajouter au prompt et laisser le modèle répondre à partir d'eux. Azure Cosmos DB conserve ensemble les données opérationnelles et les vecteurs : aucun index séparé à synchroniser.

| Étape | Implémentation avec Azure Cosmos DB |
| --- | --- |
| Ingérer | Découper les documents longs en segments (chunks), un élément par segment avec sa source, sa page et son locataire |
| Incorporer | Générer l'incorporation de chaque segment avec un modèle d'incorporation Microsoft Foundry (Azure OpenAI) ; la stocker dans le chemin vectoriel |
| Maintenir à jour | Utiliser le flux de modification pour recalculer l'incorporation des éléments dont le texte change |
| Récupérer | Incorporer la question avec le même modèle ; requête vectorielle ou hybride avec `TOP N`, filtrée sur le locataire ou la clé de partition |
| Reclasser (facultatif) | Semantic Reranker sur les candidats |
| Augmenter et générer | Mettre les segments récupérés (le texte, pas les vecteurs) dans le prompt avec leurs sources ; appeler le modèle de conversation |
| Mettre en cache (facultatif) | Cache sémantique : stocker les incorporations des questions et les réponses, réutiliser une réponse quand une nouvelle question est assez similaire |

Points de conception :

- La **taille des segments** arbitre entre précision (petits segments) et contexte (grands segments) ; un segment par élément garde des éléments petits et permet à chaque segment de porter sa propre incorporation et ses filtres.
- **Même modèle, mêmes dimensions** à l'ingestion et à la requête ; les `dimensions` de la stratégie doivent égaler la sortie du modèle (par exemple 1 536 pour text-embedding-3-small, 3 072 pour text-embedding-3-large).
- **Filtrage de sécurité** : filtrez la récupération sur le locataire ou l'utilisateur (clé de partition, `vectorIndexShardKey`) ; ne comptez jamais sur le prompt pour masquer des données.
- **Cache sémantique** : le seuil de similarité est un compromis (trop élevé : des échecs répétés remplissent le cache ; trop bas : de mauvaises réponses). Incluez le contexte de la conversation dans la clé du cache, pas seulement la dernière question, et faites expirer les entrées avec la durée de vie (TTL).

> **Conseil d'examen.** « Les réponses doivent refléter des données mises à jour il y a quelques secondes » favorise la RAG sur le conteneur opérationnel (avec le flux de modification qui recalcule les incorporations modifiées) plutôt qu'un modèle affiné sur un export.

<!-- section: key-points -->
## Points clés

- Texte intégral : stratégie de texte intégral + `fullTextIndexes` ; `FullTextContains`/`All`/`Any` dans `WHERE`, `FullTextScore` uniquement dans `ORDER BY RANK` ; distance approximative jusqu'à 2.
- Vecteur : activé par défaut, sans fonctionnalité de compte ; stratégie d'incorporation (chemin, `dataType`, `dimensions`, `distanceFunction`) ; `flat` jusqu'à 505 dimensions, `quantizedFlat` et `diskANN` jusqu'à 4 096 ; au moins 1 000 vecteurs ; pas de débit partagé.
- `diskANN` au-delà d'environ 50 000 vecteurs par partition physique ; `vectorIndexShardKey` construit un index DiskANN par valeur de propriété.
- Toujours `TOP N` avec `ORDER BY VectorDistance` ; exclure le chemin vectoriel de l'index de plage.
- Hybride : `ORDER BY RANK RRF(...)`, tableau de pondérations facultatif en dernier.
- Rappel contre coût : `searchListSizeMultiplier`, `quantizedVectorListMultiplier`, `quantizationByteSize`, `indexingSearchListSize`.
- RAG : découper, incorporer avec un seul modèle, récupérer en filtrant par locataire, ancrer le prompt ; cache sémantique avec TTL.
