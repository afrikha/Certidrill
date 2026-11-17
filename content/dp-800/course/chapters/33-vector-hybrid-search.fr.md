Ce chapitre transforme la conception du précédent en requêtes : choisir la métrique de l'index, écrire `VECTOR_SEARCH` avec la syntaxe actuelle `TOP (N) WITH APPROXIMATE`, combiner une recherche en texte intégral et une recherche vectorielle, fusionner les deux classements par fusion de classement réciproque (RRF) et mesurer si le résultat est assez bon et assez rapide. Les questions d'examen montrent une requête incomplète ou erronée et demandent comment la compléter ou la corriger.

<!-- section: index-metrics | objectives: 3.2.6 -->
## Types et métriques d'index vectoriels

```text
CREATE VECTOR INDEX vix_ProductEmbeddings_Embedding
ON dbo.ProductEmbeddings (Embedding)
WITH (METRIC = 'cosine', TYPE = 'DiskANN', MAXDOP = 4);
```

| Option | Valeurs | Remarques |
| --- | --- | --- |
| `TYPE` | `DiskANN` uniquement (par défaut) | Index ANN à base de graphe qui travaille depuis le SSD avec peu de mémoire, un grand nombre de requêtes par seconde et une faible latence |
| `METRIC` | `cosine`, `euclidean`, `dot` | Fixée à la création : une métrique par index |
| `MAXDOP` | `0` (par défaut), `1`, `n` | Parallélisme de la construction |
| `ON filegroup` | Un groupe de fichiers ou `"default"` | Emplacement de stockage de l'index |

Choisir la métrique :

| Situation | Métrique |
| --- | --- |
| Incorporations de texte, la documentation du modèle recommande la similarité cosinus | `cosine` |
| Vecteurs déjà normalisés à la longueur 1 (incorporations Azure OpenAI, ou `VECTOR_NORMALIZE(v, 'norm2')`) | `cosine` ou `dot` : même ordre des résultats |
| La norme porte une information (vecteurs non normalisés), la position absolue dans l'espace compte | `euclidean` |

La métrique de la requête doit être égale à celle de l'index. Quand `VECTOR_SEARCH` demande `METRIC = 'euclidean'` sur une colonne indexée avec `cosine`, l'index n'est pas utilisé : le moteur lève un avertissement et exécute une analyse kNN exacte.

> **Piège d'examen.** Pour interroger la même colonne avec deux métriques en ANN, il faut deux index vectoriels. Changer seulement l'argument `METRIC` de la requête transforme silencieusement la recherche en analyse complète.

Versions d'index et métadonnées :

- `sys.vector_indexes` expose `build_parameters` ; `JSON_VALUE(build_parameters, '$.Version')` retourne `3` pour la dernière version.
- `sys.dm_db_vector_indexes` montre l'intégrité de l'index et sa maintenance en arrière-plan.
- Les index des versions antérieures rendaient la table **en lecture seule** (sauf si `ALLOW_STALE_VECTOR_INDEX` acceptait des résultats obsolètes), ne filtraient les résultats qu'après coup et exigeaient `TOP_N`. Ils ne peuvent pas être mis à niveau sur place : supprimez puis recréez l'index.

<!-- section: vector-search | objectives: 3.2.7 -->
## Implémenter la recherche vectorielle

Le vecteur de la requête doit provenir du **même modèle, avec les mêmes dimensions**, que les vecteurs stockés.

```text
DECLARE @q VECTOR(1536) =
    AI_GENERATE_EMBEDDINGS(N'quiet tent for windy nights' USE MODEL EmbeddingModel);

SELECT TOP (10) WITH APPROXIMATE
    p.ProductID, p.Name, r.distance
FROM VECTOR_SEARCH(
        TABLE = dbo.Products AS p,
        COLUMN = DescriptionVector,
        SIMILAR_TO = @q,
        METRIC = 'cosine'
    ) AS r
WHERE p.Category = 'Camping'
  AND p.IsActive = 1
ORDER BY r.distance;
```

| Élément | Règle |
| --- | --- |
| `TABLE` | Une table de base (ni vue, ni table temporaire) ; donnez-lui un alias et référencez ses colonnes par cet alias |
| `COLUMN` | Une colonne `vector` |
| `SIMILAR_TO` | Une variable ou une colonne `vector` |
| `METRIC` | `cosine`, `dot` ou `euclidean` ; doit correspondre à l'index |
| `distance` | Colonne ajoutée au résultat. Si la table a déjà une colonne `distance`, les alias sont obligatoires |
| `ORDER BY` | Obligatoire avec `APPROXIMATE` : uniquement `distance`, uniquement croissant |

Avec la dernière version de l'index, les prédicats `WHERE` sont appliqués **pendant** la recherche (filtrage itératif) : le moteur continue de chercher jusqu'à obtenir `N` lignes qualifiées ou épuiser les candidats, il est donc inutile de demander plus de lignes que nécessaire.

> **Piège d'examen.** La syntaxe dépréciée `VECTOR_SEARCH(..., TOP_N = 10)` échoue sur un index de dernière version (Msg 42274). Elle filtrait aussi *après* avoir récupéré les `TOP_N` lignes, si bien qu'un `WHERE` sélectif pouvait retourner moins de lignes que demandé, voire aucune. Utilisez `SELECT TOP (N) WITH APPROXIMATE`.

Erreurs à reconnaître :

| Message | Cause | Correction |
| --- | --- | --- |
| 42274 | `TOP_N` utilisé avec un index de version 3 | Supprimer `TOP_N`, utiliser `TOP (N) WITH APPROXIMATE` |
| 42248 | `APPROXIMATE` sans `ORDER BY` | Ajouter `ORDER BY distance` |
| 42271 | `ORDER BY` sur une autre colonne que `distance`, ou `DESC` | Trier uniquement sur `distance` croissant ; trier autrement dans une requête externe |

Autres limitations : `VECTOR_SEARCH` ne peut pas être utilisé dans une vue, `CROSS APPLY` / `OUTER APPLY` ne peuvent pas figurer dans le même `FROM` que `TOP (N) WITH APPROXIMATE`, et `GROUP BY`, les agrégats, les fonctions de fenêtre, `DISTINCT` ou les opérateurs ensemblistes nécessitent une **sous-requête** :

```text
-- Join to another table, then aggregate the ANN result in an outer query
SELECT c.CategoryName, COUNT(*) AS hits, AVG(v.distance) AS avg_distance
FROM (
    SELECT TOP (100) WITH APPROXIMATE p.ProductID, p.CategoryID, r.distance
    FROM VECTOR_SEARCH(
            TABLE = dbo.Products AS p,
            COLUMN = DescriptionVector,
            SIMILAR_TO = @q,
            METRIC = 'cosine'
        ) AS r
    ORDER BY r.distance
) AS v
INNER JOIN dbo.Categories AS c ON c.CategoryID = v.CategoryID
GROUP BY c.CategoryName
ORDER BY avg_distance;
```

Alternative exacte, pour de petits ensembles de candidats ou quand des résultats exacts sont exigés :

```text
SELECT TOP (10) p.ProductID, p.Name,
       VECTOR_DISTANCE('cosine', @q, p.DescriptionVector) AS distance
FROM dbo.Products AS p
WHERE p.Category = 'Camping'
ORDER BY distance;
```

<!-- section: hybrid-search | objectives: 3.2.8 -->
## Implémenter la recherche hybride

Une recherche hybride exécute **deux recherches sur les mêmes données** et les fusionne :

1. Une recherche en texte intégral avec `FREETEXTTABLE` ou `CONTAINSTABLE`, classée par `RANK` décroissant.
2. Une recherche vectorielle avec `VECTOR_SEARCH` (grandes tables) ou `VECTOR_DISTANCE` (petites tables), classée par `distance` croissante.
3. Une jointure `FULL OUTER JOIN` des deux listes sur la clé, pour conserver une ligne trouvée par une seule des deux recherches.
4. Un score fusionné, en général RRF (section suivante), puis un tri final sur ce score.

Les deux scores ne s'additionnent pas directement : `RANK` est une valeur de pertinence non bornée où plus grand est meilleur, `distance` est comprise entre 0 et 2 pour le cosinus et plus petite est meilleure. Seules les **positions** dans chaque liste sont comparables, et c'est ce qu'utilise RRF.

```text
DECLARE @text NVARCHAR(400) = N'lightweight hiking boots';
DECLARE @q VECTOR(1536) = AI_GENERATE_EMBEDDINGS(@text USE MODEL EmbeddingModel);

WITH keyword AS (
    SELECT TOP (50) ft.[KEY] AS ProductID,
           RANK() OVER (ORDER BY ft.[RANK] DESC) AS kw_rank
    FROM FREETEXTTABLE(dbo.Products, Description, @text) AS ft
    ORDER BY ft.[RANK] DESC
),
semantic AS (
    SELECT v.ProductID,
           RANK() OVER (ORDER BY v.distance) AS vec_rank
    FROM (
        SELECT TOP (50) WITH APPROXIMATE p.ProductID, r.distance
        FROM VECTOR_SEARCH(
                TABLE = dbo.Products AS p,
                COLUMN = DescriptionVector,
                SIMILAR_TO = @q,
                METRIC = 'cosine'
            ) AS r
        ORDER BY r.distance
    ) AS v
)
SELECT COALESCE(k.ProductID, s.ProductID) AS ProductID,
       k.kw_rank, s.vec_rank
FROM keyword AS k
FULL OUTER JOIN semantic AS s ON s.ProductID = k.ProductID;
```

Notez la sous-requête autour de `VECTOR_SEARCH` : la fonction de fenêtre `RANK()` n'est pas autorisée dans le même bloc de requête que `TOP (N) WITH APPROXIMATE`.

> **Piège d'examen.** Un `INNER JOIN` entre la liste par mots-clés et la liste vectorielle ne garde que les lignes trouvées par les deux recherches et perd le principal avantage de la recherche hybride. La jointure est un `FULL OUTER JOIN`, avec `COALESCE` sur la clé.

Appliquez les filtres métier (catégorie, locataire, disponibilité) **à l'intérieur** de chaque recherche plutôt qu'après la fusion : filtrer après RRF peut éliminer des lignes bien classées et laisser trop peu de résultats.

<!-- section: rrf | objectives: 3.2.9 -->
## Fusion de classement réciproque (RRF)

Pour chaque ligne, RRF additionne un terme par liste dans laquelle la ligne apparaît :

```text
rrf_score = 1 / (k + rank_in_list_1) + 1 / (k + rank_in_list_2)
```

| Élément | Valeur et effet |
| --- | --- |
| `k` | Constante, **60** par convention (issue de la recherche RRF d'origine). Un `k` plus grand lisse les écarts entre rangs ; un `k` plus petit favorise les premières positions |
| Rang | Position dans chaque liste, à partir de 1 (`RANK()` ou `ROW_NUMBER()`) |
| Ligne absente | Une ligne absente d'une liste contribue 0 pour cette liste : `COALESCE(1.0 / (@k + rank), 0.0)` |
| Pondération | Multipliez un terme pour favoriser une source, par exemple `2.0 / (@k + vec_rank)` |
| Tri | `ORDER BY rrf_score DESC` : plus grand est meilleur |

Fin de la requête hybride de la section précédente :

```text
DECLARE @k INT = 60;
-- keyword and semantic CTEs as above, then:
SELECT TOP (10)
       COALESCE(k.ProductID, s.ProductID) AS ProductID,
       COALESCE(1.0 / (@k + k.kw_rank), 0.0)
     + COALESCE(1.0 / (@k + s.vec_rank), 0.0) AS rrf_score
FROM keyword AS k
FULL OUTER JOIN semantic AS s ON s.ProductID = k.ProductID
ORDER BY rrf_score DESC;
```

Exemple chiffré avec `k = 60` : un produit classé 1er par mots-clés et 3e par vecteurs obtient `1/61 + 1/63 ≈ 0.0323` ; un produit classé 1er par vecteurs uniquement obtient `1/61 ≈ 0.0164`. Figurer dans les deux listes compte plus qu'être premier dans une seule.

> **Piège d'examen.** La division entière retourne silencieusement 0 : `1 / (60 + rank)` avec des opérandes entiers vaut toujours 0 en T-SQL. Écrivez `1.0 / (...)` pour obtenir un résultat décimal.

RRF ne nécessite aucune normalisation des scores, fonctionne quelles que soient les échelles des deux recherches et empêche une source de dominer. Ses entrées sont les `TOP (N)` de chaque liste : commencez autour de 50 candidats par liste ; davantage de candidats donnent plus de matière à RRF mais coûtent du temps.

<!-- section: evaluate | objectives: 3.2.10 -->
## Évaluer la recherche vectorielle et hybride

La **qualité** se mesure sur un jeu de requêtes de test dont les lignes pertinentes sont connues :

| Métrique | Question à laquelle elle répond |
| --- | --- |
| Précision | Parmi les lignes retournées, quelle part est pertinente ? |
| Rappel | Parmi toutes les lignes pertinentes, quelle part a été retournée ? |
| Rang réciproque moyen (MRR) | À quelle position apparaît, en moyenne, la première ligne pertinente ? |
| Rappel de l'index ANN | Parmi les lignes que retourne une recherche exacte, quelle part la recherche approximative retourne-t-elle ? 1 = aucune approximation |

Exécutez les mêmes requêtes de test en texte intégral seul, en vectoriel seul et en hybride, puis comparez. La recherche hybride améliore généralement le rappel par rapport à chaque approche seule, avec peu de perte de précision.

Pour mesurer le **rappel ANN** d'un index vectoriel, comparez `VECTOR_SEARCH ... WITH APPROXIMATE` avec la requête exacte `VECTOR_DISTANCE` pour le même vecteur et le même `N` :

```text
WITH ann AS (
    SELECT TOP (10) WITH APPROXIMATE p.ProductID
    FROM VECTOR_SEARCH(TABLE = dbo.Products AS p, COLUMN = DescriptionVector,
                       SIMILAR_TO = @q, METRIC = 'cosine') AS r
    ORDER BY r.distance
),
exact AS (
    SELECT TOP (10) ProductID
    FROM dbo.Products
    ORDER BY VECTOR_DISTANCE('cosine', @q, DescriptionVector)
)
SELECT COUNT(*) / 10.0 AS recall_at_10
FROM ann INNER JOIN exact ON exact.ProductID = ann.ProductID;
```

Liste de contrôle des **performances** :

| Symptôme | Vérification | Correction |
| --- | --- | --- |
| Requête vectorielle lente sur une grande table | La requête utilise-t-elle `VECTOR_DISTANCE` ? Le plan montre-t-il une analyse ? | Créer un index vectoriel et utiliser `VECTOR_SEARCH` avec `TOP (N) WITH APPROXIMATE` |
| L'index existe mais n'est pas utilisé | Avertissement sur la métrique ; métrique de la requête comparée à `sys.vector_indexes` | Même métrique dans la requête et dans l'index |
| Une requête ANN filtrée retourne trop peu de lignes | Index de version antérieure avec `TOP_N` (filtrage après coup) | Recréer l'index (dernière version), utiliser `TOP (N) WITH APPROXIMATE` |
| Requête hybride lente | Taille du `TOP (N)` par liste, coût de l'appel d'incorporation | Réduire les candidats par liste, mettre en cache ou précalculer les incorporations des requêtes |
| Pertinence médiocre | Précision, rappel et MRR sur le jeu de test | Modifier le découpage en blocs, les colonnes incorporées, le modèle, les poids RRF ou `k` |

Mesurez avec les outils habituels : le plan d'exécution réel, `SET STATISTICS TIME ON` et `SET STATISTICS IO ON`, et le Magasin des requêtes (Query Store) pour les régressions dans le temps.

<!-- section: key-points -->
## Points clés

- Index vectoriel : `TYPE = 'DiskANN'` uniquement, une `METRIC` par index ; la métrique de la requête doit correspondre, sinon la recherche se replie sur kNN avec un avertissement.
- Syntaxe ANN actuelle : `SELECT TOP (N) WITH APPROXIMATE ... FROM VECTOR_SEARCH(...) ORDER BY distance` (croissant, seul) ; `TOP_N` est déprécié (Msg 42274).
- Les filtres `WHERE` sont appliqués pendant la recherche sur les index de dernière version ; les agrégats et les fonctions de fenêtre nécessitent une sous-requête.
- Hybride = liste texte intégral + liste vectorielle + `FULL OUTER JOIN` + score fusionné.
- RRF = somme de `1.0 / (k + rank)`, `k = 60`, rang absent = 0, score le plus élevé en premier.
- Évaluez la qualité par la précision, le rappel et le MRR sur un jeu de test ; l'ANN par le rappel face à une requête exacte ; la vitesse par les plans et les statistiques.
