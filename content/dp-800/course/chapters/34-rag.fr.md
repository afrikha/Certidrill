La génération augmentée par récupération (RAG) permet à un modèle de langage de répondre à partir de vos propres données : la base de données récupère les lignes pertinentes, T-SQL les convertit en JSON, les ajoute à une invite, envoie l'invite à un point de terminaison de modèle avec `sp_invoke_external_rest_endpoint` et lit la réponse dans le JSON retourné. Les questions d'examen montrent un script ou une procédure incomplète et demandent de compléter la charge utile, l'appel ou le chemin JSON, de choisir RAG plutôt qu'une autre approche, ou de trouver pourquoi la réponse revient à `NULL`.

<!-- section: rag-use-cases | objectives: 3.3.1 -->
## Cas d'usage et architecture RAG

Une requête RAG enchaîne trois étapes :

| Étape | Ce qui se passe | Où elle s'exécute |
| --- | --- | --- |
| Récupérer (Retrieve) | Trouver les lignes utiles à la question : recherche en texte intégral, vectorielle ou hybride, jointures, filtres | Dans la base de données (T-SQL) |
| Augmenter (Augment) | Mettre les lignes au format JSON et les ajouter à l'invite, à côté des instructions et de la question | Dans la base de données (T-SQL) |
| Générer (Generate) | Le modèle rédige une réponse ancrée dans le contexte fourni | Hors de la base de données, par exemple un déploiement Azure OpenAI dans Microsoft Foundry |

La base de données stocke les données et les incorporations et orchestre les appels ; elle n'héberge pas le modèle de langage. Le même modèle fonctionne dans SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance et SQL Database dans Microsoft Fabric, les quatre plateformes de `sp_invoke_external_rest_endpoint`.

Choisissez RAG quand :

| Exigence | Réponse |
| --- | --- |
| Les réponses doivent refléter des données qui changent chaque jour (stock, prix, commandes) | RAG : le contexte est lu au moment de la question, sans réentraînement |
| Vous devez savoir de quels enregistrements vient une réponse | RAG : vous contrôlez la récupération, vous pouvez donc tracer et journaliser les lignes envoyées |
| Les données ne doivent pas servir à entraîner un modèle | RAG : seul le contexte de chaque requête quitte la base de données |
| Les questions portent sur vos produits, clients, règles ou historique | RAG : un modèle généraliste ne les connaît pas |
| Modifier durablement le style ou le comportement du modèle sur un corpus fixe | Réglage précis (fine-tuning), pas RAG |
| Retourner une liste de lignes correspondantes, sans texte généré | Une simple requête ou une recherche (texte intégral, vectorielle, hybride) ; aucun appel de modèle n'est nécessaire |
| Des chiffres exacts, comme un total ou un nombre | Calculez-les en SQL ; au plus, passez le résultat au modèle pour le formuler |

Cas d'usage types : support client (historique des commandes plus la politique de retour), configuration de produits (pièces compatibles, stock et prix dans un budget), base de connaissances interne (documents de règles stockés dans la base, résumés en étapes), aide à la vente (historique des commandes et tickets transformés en e-mail de relance personnalisé), documentation technique (scripts générés à partir des vraies définitions de tables).

> **Piège d'examen.** RAG n'entraîne ni ne modifie le modèle, et le modèle n'interroge jamais lui-même la base de données : seules les lignes que votre T-SQL place dans la charge utile lui parviennent. Si de nouveaux produits doivent apparaître immédiatement dans les réponses, la réponse est RAG, pas le réglage précis.

<!-- section: json-context | objectives: 3.3.3 -->
## Convertir des données structurées en JSON

JSON garde chaque nom de colonne à côté de sa valeur et les objets imbriqués montrent les relations : le modèle peut ainsi citer correctement `"ProductName":"Trail-400"`.

| Construction | Sortie | À utiliser pour |
| --- | --- | --- |
| `FOR JSON AUTO` | Tableau d'objets, structure déduite de la requête et de ses jointures | Une mise en forme rapide |
| `FOR JSON PATH` | Tableau d'objets, imbrication définie par des alias à points comme `[product.price]` | Le contrôle complet des noms et de l'imbrication (la plupart du code RAG) |
| `WITHOUT_ARRAY_WRAPPER` | Supprime les `[ ]` | Un résultat d'une seule ligne (un client, une commande) |
| `ROOT('products')` | Encapsule la sortie dans une propriété racine nommée | Indiquer au modèle de quelles données il s'agit |
| `INCLUDE_NULL_VALUES` | Garde les propriétés dont la valeur est `NULL` (omises par défaut) | Quand une valeur absente a un sens |
| `JSON_OBJECT('k':v, ...)` | Un objet par appel | Construire un objet à partir de variables ou par ligne |
| `JSON_ARRAY(v1, v2, ...)` | Un tableau | De petites listes fixes, le tableau `messages` |
| `JSON_ARRAYAGG(expr ORDER BY ...)` | Un tableau agrégé sur les lignes, par groupe `GROUP BY` | Une liste de valeurs enfants, par exemple les références d'un modèle |

La récupération et la mise en forme se font en général dans une seule instruction affectée à une variable :

```text
DECLARE @question NVARCHAR(1000) = N'Which helmets fit a child under 10?';
DECLARE @questionVector VECTOR(1536);
DECLARE @context NVARCHAR(MAX);

SELECT @questionVector = AI_GENERATE_EMBEDDINGS(@question USE MODEL ProductEmbeddingModel);

SET @context = (
    SELECT TOP (5)
        p.Name        AS [product.name],
        p.ListPrice   AS [product.price],
        p.SizeRange   AS [product.size],
        c.Name        AS [product.category],
        p.Description AS [product.description]
    FROM dbo.Product AS p
    JOIN dbo.Category AS c ON c.CategoryID = p.CategoryID
    WHERE p.IsActive = 1
    ORDER BY VECTOR_DISTANCE('cosine', p.DescriptionVector, @questionVector)
    FOR JSON PATH, ROOT('products')
);
```

Règles qui gardent le contexte utile et peu coûteux :

- N'envoyez que les colonnes qui aident à répondre : noms, descriptions, caractéristiques, prix. Laissez de côté les ID internes, `rowguid`, les dates d'audit et la colonne d'incorporation elle-même. Chaque jeton coûte de l'argent et compte dans la fenêtre de contexte du modèle, et un contexte ciblé donne de meilleures réponses.
- Limitez les lignes avec `TOP (n)` après un tri par pertinence.
- Appliquez les filtres de sécurité (locataire, client, sécurité au niveau des lignes) dans la requête de récupération : ce que vous placez dans `@context` est envoyé hors de la base de données.
- Laissez les fonctions JSON échapper les valeurs. Concaténer des chaînes comme `'{"name":"' + @name + '"}'` casse dès qu'une valeur contient un guillemet ou un saut de ligne ; `FOR JSON` et `JSON_OBJECT` échappent les caractères spéciaux.

Les valeurs par défaut pour `NULL` diffèrent selon la fonction :

| Fonction | Comportement par défaut quand une valeur est `NULL` |
| --- | --- |
| `JSON_OBJECT` | `NULL ON NULL` : la clé est conservée avec la valeur JSON `null` |
| `JSON_ARRAY` | `ABSENT ON NULL` : l'élément est supprimé |
| `JSON_ARRAYAGG` | `ABSENT ON NULL` : l'élément est supprimé |
| `FOR JSON` | La propriété est omise, sauf si `INCLUDE_NULL_VALUES` est spécifié |

> **Piège d'examen.** `JSON_ARRAY` demande SQL Server 2022 ou une version ultérieure, et `JSON_ARRAYAGG` SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance ou SQL Database dans Fabric. `FOR JSON` existe depuis SQL Server 2016 et reste le choix sûr quand un SQL Server plus ancien figure dans le scénario.

<!-- section: invoke-rest-endpoint | objectives: 3.3.2 -->
## Appeler un modèle avec sp_invoke_external_rest_endpoint

`sys.sp_invoke_external_rest_endpoint` appelle un point de terminaison REST HTTPS depuis T-SQL.

| Plateforme | Disponibilité |
| --- | --- |
| Azure SQL Database, SQL Database dans Microsoft Fabric | Activée par défaut |
| SQL Server 2025, Azure SQL Managed Instance (stratégie de mise à jour SQL Server 2025 ou Always-up-to-date) | Désactivée par défaut : `sp_configure 'external rest endpoint enabled', 1` puis `RECONFIGURE WITH OVERRIDE` (requiert `ALTER SETTINGS`) |

| Paramètre | Type et valeur par défaut | Remarques |
| --- | --- | --- |
| `@url` | `nvarchar(4000)`, obligatoire | HTTPS uniquement. Longueur maximale de l'URL 8 Ko, chaîne de requête 4 Ko |
| `@payload` | `nvarchar(max)` | JSON valide, XML bien formé ou texte. Jusqu'à 100 Mo envoyés et reçus |
| `@headers` | `nvarchar(4000)` | JSON **plat** (sans objets imbriqués). En-têtes : 8 Ko au total |
| `@method` | `POST` par défaut | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` |
| `@timeout` | `smallint`, 30 par défaut | 1 à 230 secondes ; délai d'expiration cumulé sur les nouvelles tentatives |
| `@credential` | `sysname` | Des informations d'identification délimitées à la base de données qui injectent l'authentification |
| `@response` | `nvarchar(max) OUTPUT` | La réponse, encapsulée dans une enveloppe JSON |
| `@retry_count` | `tinyint`, 0 par défaut | 0 à 10 ; nouvelles tentatives sur 408, 429, 500, 502, 503, 504, en respectant `Retry-After` |

Configuration de la sécurité, dans l'ordre :

```text
-- 1. Credential named after the endpoint URL (no query string).
--    Managed Identity: no key stored; the identity needs the
--    Cognitive Services OpenAI User role on the Azure OpenAI resource.
CREATE DATABASE SCOPED CREDENTIAL [https://contoso-ai.openai.azure.com]
    WITH IDENTITY = 'Managed Identity',
    SECRET = '{"resourceid":"https://cognitiveservices.azure.com"}';

-- Alternative: API key sent as a header
-- CREATE DATABASE SCOPED CREDENTIAL [https://contoso-ai.openai.azure.com]
--     WITH IDENTITY = 'HTTPEndpointHeaders', SECRET = '{"api-key":"<key>"}';

-- 2. Permissions for the application user
GRANT EXECUTE ANY EXTERNAL ENDPOINT TO [app_rag];
GRANT REFERENCES ON DATABASE SCOPED CREDENTIAL::[https://contoso-ai.openai.azure.com] TO [app_rag];
```

| `IDENTITY` des informations d'identification | Envoie |
| --- | --- |
| `Managed Identity` | Un jeton de l'identité managée affectée par le système ; `SECRET` contient le `resourceid` |
| `HTTPEndpointHeaders` | Les paires clé-valeur de `SECRET` comme en-têtes de requête (JSON plat) |
| `HTTPEndpointQueryString` | Les valeurs de `SECRET` dans la chaîne de requête |
| `SHARED ACCESS SIGNATURE` | Un jeton SAS (stockage) |

Créer les informations d'identification demande l'autorisation `CONTROL` sur la base de données et une clé principale de base de données ; Azure SQL Database crée cette clé automatiquement. Le nom des informations d'identification doit être une URL de la liste autorisée, avec le même schéma et le même hôte que `@url`, et son chemin doit être égal au chemin appelé ou plus générique : `[https://contoso-ai.openai.azure.com]` convient pour tous les déploiements de cette ressource.

Dans Azure SQL Database et Managed Instance, seuls les domaines autorisés peuvent être appelés ; Azure OpenAI (`*.openai.azure.com`), Azure AI services (`*.cognitiveservices.azure.com`), Azure AI Search, Azure Functions, API Management (`*.azure-api.net`) et d'autres figurent dans la liste. Placez tout autre point de terminaison derrière API Management.

> **Piège d'examen.** Ne mettez pas la clé API dans `@headers` ni dans l'URL d'une procédure stockée : stockez-la dans des informations d'identification (`HTTPEndpointHeaders`) ou, mieux, utilisez `Managed Identity` pour qu'aucun secret n'existe. L'appelant a besoin de deux autorisations : `EXECUTE ANY EXTERNAL ENDPOINT` sur la base de données et `REFERENCES` sur les informations d'identification.

<!-- section: prompt-payload | objectives: 3.3.2 -->
## Construire la charge utile de l'invite

Une requête de saisie semi-automatique de conversation (chat completions) prend un tableau `messages` ; chaque message a un `role` et un `content` :

| Rôle | Contenu |
| --- | --- |
| `system` | Les règles : périmètre, ton, format, conduite à tenir quand les données manquent |
| `user` | Le contexte récupéré plus la question de l'utilisateur |
| `assistant` | Les réponses précédentes, pour poursuivre une conversation à plusieurs tours |

Les instructions d'ancrage du message système maintiennent le modèle dans vos données : répondre uniquement à partir des produits fournis, ne pas inventer de caractéristiques, le dire quand l'information manque, rester bref. Deux paramètres contrôlent la sortie : `max_tokens` limite la longueur de la réponse (les modèles récents utilisent `max_completion_tokens`), et une `temperature` basse (autour de 0,3 à 0,5 dans les exemples de Learn) favorise des réponses cohérentes et factuelles.

```text
DECLARE @system NVARCHAR(MAX) = N'You are the Contoso Outdoors assistant. Answer only from the products in the JSON. If the answer is not in the data, say that you do not know.';
DECLARE @user NVARCHAR(MAX) = CONCAT(N'Products: ', @context, N' Question: ', @question);

DECLARE @payload NVARCHAR(MAX) = JSON_OBJECT(
    'messages': JSON_ARRAY(
        JSON_OBJECT('role': 'system', 'content': @system),
        JSON_OBJECT('role': 'user', 'content': @user)
    ),
    'max_tokens': 500,
    'temperature': 0.3
);
```

L'URL de déploiement a la forme `https://contoso-ai.openai.azure.com/openai/deployments/chat-model/chat/completions?api-version=2024-10-21` : le nom du déploiement est dans le chemin, le corps n'a donc pas de propriété `model`. La route v1, plus récente, `https://contoso-ai.openai.azure.com/openai/v1/chat/completions` prend au contraire le déploiement dans une propriété `model` du corps. Un déploiement d'incorporations s'appelle sur `/embeddings` avec une charge utile comme `JSON_OBJECT('input': @text)`.

> **Piège d'examen.** Avec `+`, un seul `NULL` rend toute la chaîne `NULL` : si la récupération ne trouve rien, `N'Products: ' + @context + ...` devient `NULL` et le modèle reçoit un message utilisateur vide. Utilisez `CONCAT` (qui traite `NULL` comme une chaîne vide) ou `ISNULL(@context, N'[]')`, et traitez explicitement le cas d'une récupération vide.

<!-- section: send-to-model | objectives: 3.3.4 -->
## Envoyer les résultats au modèle

Une procédure stockée RAG enchaîne les quatre étapes : incorporer la question, récupérer en JSON, construire la charge utile, appeler le modèle.

```text
CREATE OR ALTER PROCEDURE dbo.AskProductQuestion
    @Question NVARCHAR(1000),
    @Answer NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @v VECTOR(1536), @context NVARCHAR(MAX), @payload NVARCHAR(MAX),
            @response NVARCHAR(MAX), @rc INT;

    SELECT @v = AI_GENERATE_EMBEDDINGS(@Question USE MODEL ProductEmbeddingModel);

    SET @context = (
        SELECT TOP (3) p.Name AS ProductName, p.Color, p.SizeRange, p.ListPrice
        FROM dbo.Product AS p
        ORDER BY VECTOR_DISTANCE('cosine', p.DescriptionVector, @v)
        FOR JSON PATH);

    SET @payload = JSON_OBJECT(
        'messages': JSON_ARRAY(
            JSON_OBJECT('role': 'system', 'content': N'Answer only from the provided products.'),
            JSON_OBJECT('role': 'user', 'content': CONCAT(N'Products: ', @context, N' Question: ', @Question))),
        'max_tokens': 500, 'temperature': 0.3);

    EXECUTE @rc = sp_invoke_external_rest_endpoint
        @url = N'https://contoso-ai.openai.azure.com/openai/deployments/chat-model/chat/completions?api-version=2024-10-21',
        @method = 'POST',
        @payload = @payload,
        @credential = [https://contoso-ai.openai.azure.com],
        @timeout = 60,
        @retry_count = 3,
        @response = @response OUTPUT;

    IF @rc = 0
        SELECT @Answer = content
        FROM OPENJSON(@response, '$.result.choices')
             WITH (content NVARCHAR(MAX) '$.message.content');
    ELSE
        THROW 50001, 'The language model call failed.', 1;
END;
```

Ce qu'il faut savoir sur l'appel lui-même :

- La procédure est synchrone : la session attend (type d'attente `HTTP_EXTERNAL_CONNECTION`) que la réponse arrive ou que `@timeout` expire. Gardez un contexte réduit et un `@timeout` entre 1 et 230 secondes.
- `@retry_count` gère les échecs temporaires (limitation 429, 503) ; il ne dispense pas de tester la valeur de retour.
- Les connexions sortantes sont limitées : environ 15 % des threads de travail, 175 au maximum. Au-delà, l'erreur 10928 (base de données) ou 10936 (pool élastique) est levée.
- Seul HTTPS est pris en charge et les redirections HTTP ne sont pas suivies.

> **Conseil d'examen.** Les données envoyées avec `sp_invoke_external_rest_endpoint` quittent la base de données. Quand un énoncé exige que des colonnes sensibles n'atteignent pas le modèle, la correction se fait dans la requête de récupération (retirer la colonne, filtrer les lignes), pas dans l'appel.

<!-- section: extract-response | objectives: 3.3.5 -->
## Extraire la réponse du modèle

`@response` est une enveloppe : les métadonnées HTTP sous `response`, le corps retourné par le modèle sous `result`.

```json
{
  "response": {
    "status": { "http": { "code": 200, "description": "OK" } },
    "headers": { "Content-Type": "application/json" }
  },
  "result": {
    "choices": [
      {
        "index": 0,
        "finish_reason": "stop",
        "message": { "role": "assistant", "content": "The Junior Trail helmet fits head sizes 48-54 cm..." }
      }
    ],
    "usage": { "prompt_tokens": 812, "completion_tokens": 96, "total_tokens": 908 }
  }
}
```

| Besoin | Expression |
| --- | --- |
| La réponse, courte | `JSON_VALUE(@response, '$.result.choices[0].message.content')` |
| La réponse, de toute longueur | `OPENJSON(@response, '$.result.choices') WITH (content NVARCHAR(MAX) '$.message.content')` |
| Pourquoi la génération s'est arrêtée | `JSON_VALUE(@response, '$.result.choices[0].finish_reason')` : `stop`, `length` (coupée par `max_tokens`), `content_filter`, `tool_calls` |
| Jetons consommés (suivi des coûts) | `JSON_VALUE(@response, '$.result.usage.total_tokens')` |
| Statut HTTP | La valeur de retour de la procédure, ou `$.response.status.http.code` |
| Une incorporation (tableau) | `JSON_QUERY(@response, '$.result.data[0].embedding')` |

La valeur de retour est `0` quand le statut HTTP est 2xx, sinon le code de statut HTTP lui-même (429, 401, 403...) ; une exception n'est levée que si l'appel ne peut pas être effectué du tout. Une réponse 204 n'a pas de `result`.

```text
IF @rc = 0
    SET @answer = JSON_VALUE(@response, '$.result.choices[0].message.content');
ELSE IF @rc = 429
    THROW 50002, 'The model is busy. Try again later.', 1;
ELSE IF @rc IN (401, 403)
    THROW 50003, 'Authentication failed. Check the credential and the role assignment.', 1;
ELSE
    SELECT @rc AS HttpStatus,
           JSON_VALUE(@response, '$.response.status.http.description') AS Description;
```

Quand on demande au modèle une sortie structurée (`response_format` de type `json_schema`, ou `json_object`), `content` est une chaîne JSON que vous analysez une seconde fois, par exemple avec `OPENJSON(@content) WITH (...)` pour insérer les valeurs extraites dans une table.

> **Piège d'examen.** Sans `RETURNING`, `JSON_VALUE` retourne un `nvarchar(4000)` : une réponse plus longue retourne `NULL` en mode lax (le mode par défaut) et une erreur en mode `strict`. Utilisez `OPENJSON ... WITH (... NVARCHAR(MAX))` pour un texte long. `JSON_VALUE` retourne aussi `NULL` pour un objet ou un tableau (utilisez `JSON_QUERY`), et un chemin qui oublie l'enveloppe `$.result` (`$.choices[0]...`) retourne lui aussi `NULL`.

<!-- section: key-points -->
## Points clés

- RAG = récupérer en SQL, augmenter l'invite avec un contexte JSON, générer avec un modèle externe ; rien n'est réentraîné et les données restent à jour.
- `FOR JSON PATH` avec des alias à points, `WITHOUT_ARRAY_WRAPPER` pour une ligne, `TOP (n)` et uniquement les colonnes utiles.
- `JSON_OBJECT` utilise `NULL ON NULL` par défaut ; `JSON_ARRAY` et `JSON_ARRAYAGG` utilisent `ABSENT ON NULL` par défaut.
- `sp_invoke_external_rest_endpoint` : activée par défaut dans Azure SQL Database et Fabric, `sp_configure` dans SQL Server 2025 et Managed Instance ; requiert `EXECUTE ANY EXTERNAL ENDPOINT` plus `REFERENCES` sur les informations d'identification.
- Informations d'identification nommées d'après l'URL du point de terminaison, de préférence `Managed Identity` avec le rôle Cognitive Services OpenAI User.
- Charge utile : `messages` avec les règles en `system` et le contexte plus la question en `user` ; `temperature` basse, `max_tokens`.
- Valeur de retour `0` = 2xx, sinon le statut HTTP ; réponse à `$.result.choices[0].message.content` ; `OPENJSON` pour les réponses de plus de 4 000 caractères.
