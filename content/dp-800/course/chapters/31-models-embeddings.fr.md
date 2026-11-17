Une incorporation (embedding) est un vecteur de nombres qui représente le sens d'un texte ; des textes semblables obtiennent des vecteurs proches les uns des autres. Dans SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance et SQL Database dans Microsoft Fabric, la base de données peut elle-même appeler un modèle d'incorporation, découper les textes longs en blocs et stocker les vecteurs. Les questions d'examen demandent quel modèle répond aux contraintes données, comment le déclarer avec `CREATE EXTERNAL MODEL`, quoi incorporer et comment le découper, comment générer les vecteurs et comment les maintenir à jour quand les données changent.

<!-- section: evaluate-models | objectives: 3.1.1 -->
## Évaluer des modèles externes

Le modèle s'exécute hors de la base de données (Azure OpenAI dans Microsoft Foundry, OpenAI, un serveur Ollama local ou un runtime ONNX local) ; la base de données appelle seulement son point de terminaison. Critères d'évaluation :

| Critère | Ce qu'il faut vérifier | Contrainte d'examen typique |
| --- | --- | --- |
| Modalité | Texte uniquement, ou aussi images et autres entrées (multimodal) | « Rechercher ensemble les photos et les descriptions des produits » exige un modèle multimodal |
| Langues | Prise en charge multilingue | Catalogue en français, allemand et japonais, utilisateurs qui interrogent dans n'importe quelle langue : un modèle d'incorporation multilingue |
| Taille et capacité | Les grands modèles raisonnent mieux et nuancent davantage, mais consomment plus de jetons, ajoutent de la latence et du coût | Générer des incorporations est une tâche ciblée : un modèle plus petit suffit souvent |
| Dimensions de sortie | Longueur du vecteur retourné par le modèle | Doit tenir dans la colonne `VECTOR(n)` ; détermine le stockage |
| Limite d'entrée (jetons) | Nombre maximal de jetons par requête | Les documents longs doivent être découpés en blocs |
| Sortie structurée | Le modèle peut retourner du JSON conforme à un schéma | Résultats de génération analysés en T-SQL avec `JSON_VALUE` / `OPENJSON` |
| Coût | Prix par jeton traité | Moins de jetons incorporés = coût plus faible |

Un **jeton** (token) est un morceau de texte : un mot, une partie de mot ou un signe de ponctuation (« hamburger » peut compter trois jetons, « the » un seul). Les modèles facturent par jeton et limitent le nombre de jetons par requête : c'est pourquoi ce que l'on incorpore et la façon de découper comptent.

Modèles d'incorporation Azure OpenAI :

| Modèle | Dimensions de sortie | Jetons d'entrée max | Paramètre `dimensions` |
| --- | --- | --- | --- |
| `text-embedding-ada-002` (version 2) | 1 536 | 8 192 | Non |
| `text-embedding-3-small` | 1 536 | 8 192 | Oui : demander moins de dimensions |
| `text-embedding-3-large` | 3 072 | 8 192 | Oui : demander moins de dimensions |

Le catalogue de modèles Microsoft Foundry répertorie des modèles pour le texte, les incorporations, le raisonnement et les entrées multimodales, avec leurs capacités, leurs bancs d'essai, leurs versions et leur état de cycle de vie : c'est là que les modèles se comparent et se déploient.

> **Piège d'examen.** La requête et les données stockées doivent être incorporées avec le **même modèle et les mêmes dimensions**. Les vecteurs de deux modèles ne sont pas comparables, même s'ils ont la même longueur. Changer de modèle oblige à régénérer tous les vecteurs stockés.

> **Piège d'examen.** `text-embedding-3-large` retourne 3 072 dimensions, plus qu'une colonne `VECTOR` en float32 n'en accepte (1 998). Passez `"dimensions"` (par exemple 1 536) dans les paramètres du modèle, ou déclarez la colonne `VECTOR(3072, float16)`.

<!-- section: external-models | objectives: 3.1.2 -->
## Créer et gérer des modèles externes

Un **modèle externe** est un objet de base de données qui stocke le point de terminaison, le format d'API, le nom du modèle, les informations d'identification et les paramètres par défaut. Les fonctions T-SQL le référencent ensuite par son nom.

```text
-- 1. Database master key (protects the credential secret), if none exists
IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = N'<strong password>';
GO
-- 2. Credential named after the endpoint URL (no query string)
CREATE DATABASE SCOPED CREDENTIAL [https://contoso-ai.openai.azure.com/]
    WITH IDENTITY = 'Managed Identity',
    SECRET = '{"resourceid":"https://cognitiveservices.azure.com"}';
GO
-- 3. External model
CREATE EXTERNAL MODEL EmbeddingModel
WITH (
    LOCATION = 'https://contoso-ai.openai.azure.com/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-02-01',
    API_FORMAT = 'Azure OpenAI',
    MODEL_TYPE = EMBEDDINGS,
    MODEL = 'text-embedding-3-small',
    CREDENTIAL = [https://contoso-ai.openai.azure.com/],
    PARAMETERS = '{"dimensions": 1536, "sql_rest_options": {"retry_count": 3}}'
);
```

| Argument | Valeurs et règles |
| --- | --- |
| `LOCATION` | Point de terminaison HTTPS uniquement (TLS). Azure OpenAI : `.../openai/deployments/{deployment}/embeddings?api-version=...` ; OpenAI : `.../v1/embeddings` ; Ollama : `.../api/embed` ; ONNX Runtime : un dossier local |
| `API_FORMAT` | `Azure OpenAI`, `OpenAI`, `Ollama`, `ONNX Runtime` |
| `MODEL_TYPE` | `EMBEDDINGS` est la seule valeur |
| `MODEL` | Nom du modèle chez le fournisseur |
| `CREDENTIAL` | Des informations d'identification délimitées à la base de données ; inutiles pour un modèle Ollama ou ONNX local |
| `PARAMETERS` | JSON ajouté à chaque requête : `dimensions`, `sql_rest_options.retry_count` (0 à 10) |
| `AUTHORIZATION` | Propriétaire du modèle (par défaut : l'utilisateur actuel) |

Identités des informations d'identification :

| `IDENTITY` | `SECRET` | Quand |
| --- | --- | --- |
| `'Managed Identity'` | `{"resourceid":"https://cognitiveservices.azure.com"}` | À privilégier : aucune clé à stocker ni à renouveler. L'identité managée de la base de données a besoin d'un rôle Azure OpenAI sur la ressource |
| `'HTTPEndpointHeaders'` | `{"api-key":"..."}` ou `{"Bearer":"..."}` | Points de terminaison à clé, OpenAI |

Le nom des informations d'identification doit être une URL dont le schéma et l'hôte correspondent à l'URL appelée, et dont le chemin est identique ou plus générique. Dans SQL Server 2025, l'identité managée (Azure Arc ou machine virtuelle Azure) nécessite aussi `sp_configure 'allow server scoped db credentials', 1`, et les appels aux points de terminaison REST nécessitent `sp_configure 'external rest endpoint enabled', 1` ; cette option est déjà activée dans Azure SQL Database et SQL Database dans Fabric.

Autorisations :

```text
GRANT CREATE EXTERNAL MODEL TO [ai_admins];                      -- create models
GRANT ALTER ANY EXTERNAL MODEL TO [ai_admins];                   -- alter or drop them
GRANT EXECUTE ON EXTERNAL MODEL::EmbeddingModel TO [app_role];   -- use the model in AI functions
```

Gestion :

```text
ALTER EXTERNAL MODEL EmbeddingModel SET (MODEL = 'text-embedding-3-large');
SELECT * FROM sys.external_models;          -- metadata of the models you can access
DROP EXTERNAL MODEL EmbeddingModel;         -- the credential is NOT dropped
```

> **Piège d'examen.** `MODEL_TYPE` n'accepte que `EMBEDDINGS`. Un modèle externe ne peut pas appeler un modèle de conversation ou de complétion : pour envoyer une invite à un modèle de langage depuis T-SQL, utilisez `sp_invoke_external_rest_endpoint`.

> **Conseil d'examen.** Privilège minimum pour une application qui ne fait que générer des incorporations : `EXECUTE ON EXTERNAL MODEL::<name>`, pas `CREATE EXTERNAL MODEL` ni `ALTER ANY EXTERNAL MODEL`.

<!-- section: embedding-columns | objectives: 3.1.4 -->
## Choisir les colonnes à incorporer

Incorporez le texte porteur de **sens** : noms, titres, descriptions, commentaires, texte libre. Laissez de côté les identifiants, les nombres, les dates, les codes et les métadonnées opérationnelles : ils ajoutent des jetons et du coût sans améliorer la similarité, et se traitent mieux par des filtres `WHERE` ordinaires à côté de la recherche vectorielle.

| Colonne | Incorporer ? | Pourquoi |
| --- | --- | --- |
| `Name`, `Description`, `ReviewText` | Oui | Contenu sémantique recherché par les utilisateurs |
| Nom de la `Category` | Souvent, concaténé avec la description | Ajoute du contexte (« Tente : ... ») |
| `ProductID`, `SKU`, `Price`, `StockQty`, `ModifiedDate` | Non | Valeurs exactes : filtre ou texte intégral, pas incorporation |
| `Status`, `IsActive`, `TenantID` | Non | Filtres appliqués dans `WHERE` |

Plusieurs colonnes peuvent être combinées en une seule entrée pour qu'un vecteur porte tout le contexte :

```text
SELECT p.ProductID,
       CONCAT(p.Name, N'. ', c.CategoryName, N'. ', p.Description) AS text_to_embed
FROM dbo.Products AS p
INNER JOIN dbo.Categories AS c ON c.CategoryID = p.CategoryID;
```

Stockez les vecteurs dans une **table d'incorporations séparée**, dont la clé est celle de la ligne source : l'espace occupé par les vecteurs se mesure facilement, et les incorporations se reconstruisent sans toucher à la table source.

> **Piège d'examen.** Incorporer le prix ou le niveau de stock ne permet pas de rechercher « moins de 50 dollars » : les vecteurs ne comparent pas des nombres. Gardez les contraintes numériques sous forme de prédicats SQL.

<!-- section: chunking | objectives: 3.1.5 -->
## Concevoir les blocs

Les textes longs sont découpés en **blocs** (chunks), incorporés séparément. Des blocs trop grands peuvent dépasser la limite de jetons du modèle et diluer le sens du vecteur ; des blocs trop petits perdent le contexte. Le chevauchement répète la fin d'un bloc au début du suivant, pour qu'une idée coupée à une frontière apparaisse entière dans un bloc.

`AI_GENERATE_CHUNKS` est une fonction table, utilisée avec `CROSS APPLY` :

```text
SELECT d.DocumentID, c.chunk, c.chunk_order, c.chunk_offset, c.chunk_length
FROM dbo.Documents AS d
CROSS APPLY AI_GENERATE_CHUNKS(
    SOURCE = d.Body,
    CHUNK_TYPE = FIXED,
    CHUNK_SIZE = 500,
    OVERLAP = 10
) AS c;
```

| Argument | Règle |
| --- | --- |
| `SOURCE` | Tout type caractère |
| `CHUNK_TYPE` | `FIXED` uniquement, sous forme de littéral |
| `CHUNK_SIZE` | Obligatoire, en **caractères** (pas en jetons), supérieur à 0 |
| `OVERLAP` | Facultatif, 0 par défaut : un **pourcentage** de `CHUNK_SIZE`, de 0 à 50 |
| `ENABLE_CHUNK_SET_ID` | `1` ajoute `chunk_set_id`, une valeur par ligne source |

Colonnes retournées : `chunk`, `chunk_order` (1, 2, 3... par source), `chunk_offset` (position, à partir de 1), `chunk_length` (caractères) et, en option, `chunk_set_id`. La fonction exige le **niveau de compatibilité 170** de la base de données.

Une table de blocs conserve la clé parente et l'ordre, pour qu'un bloc trouvé ramène à son document et à ses voisins :

```text
CREATE TABLE dbo.DocumentChunks
(
    ChunkID     INT IDENTITY PRIMARY KEY,
    DocumentID  INT NOT NULL REFERENCES dbo.Documents (DocumentID),
    ChunkOrder  BIGINT NOT NULL,
    ChunkText   NVARCHAR(MAX) NOT NULL,
    Embedding   VECTOR(1536) NULL
);
```

> **Piège d'examen.** `CHUNK_SIZE = 500` signifie 500 caractères, et `OVERLAP = 10` signifie 10 % de la taille du bloc (50 caractères), pas 10 caractères.

<!-- section: generate-embeddings | objectives: 3.1.6 -->
## Générer des incorporations

`AI_GENERATE_EMBEDDINGS(source USE MODEL model [PARAMETERS json])` envoie le texte au modèle externe et retourne le vecteur sous forme de tableau JSON, converti vers la colonne `vector`.

```text
-- Whole table, from an expression that combines columns
UPDATE e
SET e.Embedding = AI_GENERATE_EMBEDDINGS(CONCAT(p.Name, N'. ', p.Description) USE MODEL EmbeddingModel)
FROM dbo.ProductEmbeddings AS e
INNER JOIN dbo.Products AS p ON p.ProductID = e.ProductID;

-- Chunk, embed and insert in one statement
INSERT INTO dbo.DocumentChunks (DocumentID, ChunkOrder, ChunkText, Embedding)
SELECT d.DocumentID, c.chunk_order, c.chunk,
       AI_GENERATE_EMBEDDINGS(c.chunk USE MODEL EmbeddingModel)
FROM dbo.Documents AS d
CROSS APPLY AI_GENERATE_CHUNKS(SOURCE = d.Body, CHUNK_TYPE = FIXED, CHUNK_SIZE = 500) AS c;

-- Query embedding, with a runtime parameter that overrides the model's PARAMETERS
DECLARE @p JSON = N'{"dimensions": 1536}';
DECLARE @q VECTOR(1536) =
    AI_GENERATE_EMBEDDINGS(N'family tent for heavy rain' USE MODEL EmbeddingModel PARAMETERS @p);
```

| Point | Détail |
| --- | --- |
| Entrée | Tout type caractère |
| Prérequis | Un modèle externe `EMBEDDINGS`, `EXECUTE` sur ce modèle, `external rest endpoint enabled` (SQL Server, Managed Instance) |
| `PARAMETERS` à l'exécution | Remplacent les mêmes clés de la définition du modèle, par exemple `dimensions` ou `sql_rest_options.retry_count` |
| Dépannage | Événements étendus `ai_generate_embeddings_summary` (code d'état, erreurs, modèle) et `external_rest_endpoint_summary` |
| Plateformes | SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance (Always-up-to-date), SQL Database dans Fabric |

Chaque ligne incorporée est un appel au modèle : générez les incorporations par **lots** (par exemple `UPDATE TOP (500) ... WHERE Embedding IS NULL`) plutôt qu'en une seule instruction géante, et ne régénérez que les lignes dont le texte incorporé a changé.

<!-- section: maintenance | objectives: 3.1.3 -->
## Maintenir les incorporations à jour

Quand le texte source change, son incorporation doit être régénérée. La méthode dépend du volume, de la fréquence des mises à jour, de la latence et de l'endroit où la génération doit s'exécuter :

| Méthode | Latence | Convient | Compromis |
| --- | --- | --- | --- |
| Déclencheur sur la table | Immédiate | Les changements doivent être reflétés tout de suite, faible volume d'écriture | Ajoute du travail à chaque écriture ; un appel au modèle dans la transaction ralentit l'écriture et peut la faire échouer |
| Suivi des modifications (Change Tracking) | Quasi temps réel, par lots | Équilibre entre latence et performances ; un travail en arrière-plan traite les clés modifiées | Sait *quelles* lignes ont changé, pas les anciennes valeurs |
| Capture des données modifiées (CDC) | Asynchrone | Charges à fort volume ; les valeurs avant et après montrent si le texte incorporé a vraiment changé | Processus de capture et tables de modifications à gérer |
| Azure Functions avec liaison de déclencheur SQL | Quasi temps réel | Décharger la génération du moteur de base de données, mise à l'échelle indépendante | Repose sur le suivi des modifications ; du code à déployer |
| Azure Logic Apps | Selon la planification du flux de travail | Orchestration low-code avec d'autres services | Intervalle d'interrogation, limites du connecteur |
| Streaming d'événements de modification (CES) | Quasi temps réel | Plusieurs consommateurs du même flux de modifications, aucun travail supplémentaire dans la transaction | Préversion ; les événements vont vers Azure Event Hubs, un consommateur doit appeler le modèle et réécrire |
| Microsoft Foundry | Pas une méthode de détection | Sélection, hébergement et évaluation centralisés des modèles | Un autre processus doit détecter les changements et mettre à jour la base |

Déclencheur qui se contente de **marquer** la ligne, avec un travail par lots qui régénère plus tard (le modèle n'est pas appelé dans la transaction de l'utilisateur) :

```text
CREATE OR ALTER TRIGGER dbo.trg_Products_Description
ON dbo.Products
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(Description)
    BEGIN
        -- Changed descriptions: invalidate the vector
        UPDATE e SET e.Embedding = NULL
        FROM dbo.ProductEmbeddings AS e
        INNER JOIN inserted AS i ON i.ProductID = e.ProductID;
        -- New products: queue a row without a vector
        INSERT INTO dbo.ProductEmbeddings (ProductID, Embedding)
        SELECT i.ProductID, NULL
        FROM inserted AS i
        WHERE NOT EXISTS (SELECT 1 FROM dbo.ProductEmbeddings AS e WHERE e.ProductID = i.ProductID);
    END
END;
GO
-- Scheduled job
UPDATE TOP (500) e
SET e.Embedding = AI_GENERATE_EMBEDDINGS(p.Description USE MODEL EmbeddingModel)
FROM dbo.ProductEmbeddings AS e
INNER JOIN dbo.Products AS p ON p.ProductID = e.ProductID
WHERE e.Embedding IS NULL;
```

Modèle avec le suivi des modifications (les incorporations sont dans leur propre table, donc les écrire ne crée pas de nouvelles modifications sur la table source) :

```text
DECLARE @last BIGINT = (SELECT LastVersion FROM dbo.EmbeddingSync);
DECLARE @now  BIGINT = CHANGE_TRACKING_CURRENT_VERSION();

UPDATE e
SET e.Embedding = AI_GENERATE_EMBEDDINGS(p.Description USE MODEL EmbeddingModel)
FROM dbo.ProductEmbeddings AS e
INNER JOIN CHANGETABLE(CHANGES dbo.Products, @last) AS ct ON ct.ProductID = e.ProductID
INNER JOIN dbo.Products AS p ON p.ProductID = ct.ProductID
WHERE ct.SYS_CHANGE_OPERATION IN ('I', 'U');

UPDATE dbo.EmbeddingSync SET LastVersion = @now;
```

> **Piège d'examen.** Stocker le vecteur dans la table source et suivre cette table fait de chaque mise à jour d'incorporation une nouvelle modification : le travail retraite ses propres écritures. Une table d'incorporations séparée (ou le suivi au niveau des colonnes) évite cette boucle.

> **Conseil d'examen.** « Sans ajouter de latence aux transactions » et « plusieurs consommateurs en aval » orientent vers CES ; « valeurs avant et après » vers CDC ; « léger, seulement quelles lignes ont changé » vers le suivi des modifications ; « code serverless qui se met à l'échelle hors de la base » vers Azure Functions ; « flux de travail low-code » vers Logic Apps.

<!-- section: key-points -->
## Points clés

- Évaluez un modèle selon la modalité, les langues, la taille, les dimensions, la limite de jetons, la sortie structurée et le coût ; la requête et les données doivent utiliser le même modèle et les mêmes dimensions.
- `CREATE EXTERNAL MODEL` : `LOCATION` (HTTPS), `API_FORMAT` (`Azure OpenAI`, `OpenAI`, `Ollama`, `ONNX Runtime`), `MODEL_TYPE = EMBEDDINGS`, `MODEL`, `CREDENTIAL`, `PARAMETERS`.
- Informations d'identification nommées d'après l'URL du point de terminaison ; identité managée à privilégier ; `EXECUTE ON EXTERNAL MODEL` pour l'utiliser ; supprimer un modèle conserve ses informations d'identification.
- Incorporez du texte porteur de sens, pas des identifiants ni des nombres ; stockez les vecteurs dans une table séparée.
- `AI_GENERATE_CHUNKS` : `FIXED` uniquement, taille en caractères, chevauchement en pourcentage (0 à 50), niveau de compatibilité 170.
- `AI_GENERATE_EMBEDDINGS(text USE MODEL m [PARAMETERS j])` dans `SELECT`, `UPDATE` ou `INSERT ... SELECT`.
- Maintenance : déclencheur (immédiat), suivi des modifications (par lots), CDC (anciennes et nouvelles valeurs), Functions (hors du moteur), Logic Apps (low-code), CES (flux vers Event Hubs), Foundry (modèles uniquement).
