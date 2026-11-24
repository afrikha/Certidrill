Ancrer un agent, c'est lui donner, au moment de répondre, les bons passages de votre propre contenu. Dans Foundry, le moteur de récupération est Azure AI Search : un indexeur extrait le contenu, un ensemble de compétences l'enrichit et le découpe en blocs, un index stocke le texte et les vecteurs, et une requête (par mots clés, vectorielle, hybride, sémantique) renvoie les passages. L'examen demande de choisir la méthode de récupération, de remettre dans l'ordre les étapes d'ingestion, de choisir la compétence adaptée à un type de contenu et de connecter l'index à un agent ou à un flux de travail. Learn intitule désormais le service **Foundry IQ (Azure AI Search)** ; les classes du SDK et les URL conservent les noms Azure AI Search.

<!-- section: ingest-index | objectives: 5.1.1 -->
## Ingérer et indexer du contenu

Quatre objets forment un pipeline d'ingestion Azure AI Search :

| Objet | Rôle |
| --- | --- |
| **Source de données** | La connexion au contenu : Stockage Blob Azure, Azure Data Lake Storage Gen2, Azure Cosmos DB, Azure SQL Database, entre autres |
| **Index** | Le schéma des documents interrogeables : champs, attributs, paramètres vectoriels, configuration sémantique |
| **Ensemble de compétences (skillset)** | Les étapes d'enrichissement appliquées à chaque document : OCR, disposition, découpage en blocs, embeddings, code personnalisé |
| **Indexeur** | Le robot qui lit la source de données, craque les fichiers, exécute l'ensemble de compétences et écrit dans l'index, à la demande ou selon une planification, avec détection des modifications |

Deux façons de remplir un index : le **modèle pull** (un indexeur sur une source de données prise en charge, aucun code à maintenir) et le **modèle push** (votre code charge les documents par l'API REST ou le SDK, pour n'importe quelle source ou quand vous maîtrisez le moment de l'envoi).

Les attributs d'un champ décident de ce qu'il peut faire : `key` (ID unique, chaîne), `searchable` (texte intégral), `filterable`, `sortable`, `facetable`, `retrievable` (renvoyé dans les résultats). Un champ vectoriel est un `Collection(Edm.Single)` avec `dimensions` égal à la taille de sortie du modèle d'embedding et un `vectorSearchProfile`.

```json
{
  "name": "contentVector",
  "type": "Collection(Edm.Single)",
  "searchable": true,
  "retrievable": false,
  "dimensions": 1536,
  "vectorSearchProfile": "hnsw-openai"
}
```

Les types de contenu et la façon dont ils deviennent interrogeables :

| Contenu | Chemin vers l'index |
| --- | --- |
| PDF numériques, fichiers Office, HTML | Le craquage de documents extrait le texte ; découpez-le en blocs ; calculez l'embedding de chaque bloc |
| PDF numérisés, photos de formulaires | Extraire les images pendant le craquage, puis OCR ou compétence Document Layout |
| Images contenant peu de texte | Légendes et étiquettes d'Image Analysis, ou embeddings multimodaux de l'image elle-même (compétences en préversion) |
| Audio et vidéo | Transcrire et décrire d'abord (Content Understanding `prebuilt-audioSearch`, `prebuilt-videoSearch`, ou Azure Speech), puis indexer le texte |

Dans le portail Azure, l'assistant **Import data** crée en une seule passe la source de données, l'ensemble de compétences, l'index et l'indexeur, découpage en blocs et vectorisation compris.

> **Piège d'examen.** Un indexeur ne lit pas le contenu audio ou vidéo. Les enregistrements n'arrivent dans l'index que sous forme de texte produit en amont : une transcription, un résumé, des descriptions de segments.

<!-- section: search-types | objectives: 5.1.2 -->
## Recherche par mots clés, vectorielle, hybride et sémantique

| Méthode | Classement | Gagne quand |
| --- | --- | --- |
| Texte intégral (mots clés) | BM25 sur les termes des champs `searchable` | Termes exacts : références produit, numéros d'erreur, noms |
| Vectorielle | Similarité entre l'embedding de la requête et ceux des blocs | Paraphrases et concepts, contenu multilingue ou multimodal |
| Hybride | Requêtes texte intégral et vectorielle dans une seule demande, fusionnées par **Reciprocal Rank Fusion (RRF)** | Ancrage général : les termes exacts et le sens comptent tous les deux |
| Classeur sémantique (semantic ranker) | Reclasse les premiers résultats (50) d'une requête texte ou hybride avec un modèle de langage ; ajoute légendes et réponses | La pertinence des premiers résultats compte avant tout, comme en RAG |

Les paramètres de la recherche vectorielle se trouvent dans l'index :

| Paramètre | Options |
| --- | --- |
| Algorithme | `hnsw` (plus proches voisins approximatifs, rapide, le choix habituel) ou `exhaustiveKnn` (parcourt tous les vecteurs : exact, lent, pour de petits ensembles ou pour mesurer le rappel) |
| Métrique | `cosine` (la valeur par défaut et celle qu'attendent les embeddings Azure OpenAI), `euclidean`, `dotProduct` |
| Vectoriseur | Convertit le texte de la requête en vecteur au moment de la requête, avec le même modèle qu'à l'indexation (Azure OpenAI, Azure Vision, API web personnalisée) |
| Compression | Quantification scalaire ou binaire pour réduire la taille de l'index vectoriel (mémoire et disque) ; HNSW uniquement dans l'API stable |

Une requête hybride avec classement sémantique :

```json
{
  "search": "refund policy for cancelled flights",
  "vectorQueries": [
    { "kind": "text", "text": "refund policy for cancelled flights", "fields": "contentVector", "k": 50 }
  ],
  "queryType": "semantic",
  "semanticConfiguration": "default",
  "captions": "extractive",
  "filter": "category eq 'policy'",
  "select": "title,chunk",
  "top": 5
}
```

- `"kind": "text"` exige un vectoriseur sur le profil du champ ; `"kind": "vector"` signifie que le client envoie lui-même le vecteur.
- `k` est le nombre de plus proches voisins ; `top` est le nombre de résultats renvoyés après la fusion.
- La configuration sémantique désigne un champ de titre, des champs de contenu et des champs de mots clés, par ordre de priorité (les documents longs sont tronqués). Le classeur lit ces champs texte et reclasse les résultats BM25 ou RRF ; les légendes et les réponses sont du texte repris tel quel de l'index, pas généré.
- Un filtre sur une requête vectorielle s'applique par défaut avant la recherche vectorielle (`preFilter`).

> **Piège d'examen.** Modifier la température ou top-p ne corrige pas un modèle qui répond à partir des mauvais passages : c'est un problème de récupération. Passez à la recherche hybride avec classement sémantique avant d'ajuster la génération.

<!-- section: enrichment-skills | objectives: 5.1.3 -->
## Enrichissement avec des compétences intégrées et personnalisées

Une compétence prend ses entrées dans l'arborescence du document enrichi (`/document/content`, `/document/normalized_images/*`, `/document/pages/*`) et y ajoute ses sorties.

| Besoin | Compétence |
| --- | --- |
| Lire le texte des images et des pages numérisées | Compétence **OCR** |
| Légendes, étiquettes, objets dans les images | Compétence **Image Analysis** |
| Texte avec sa structure (titres, tableaux, sections) en Markdown, découpé selon les titres | Compétence **Document Layout** (modèle de disposition de Document Intelligence) |
| Remettre le texte OCR à sa place dans le texte du document | Compétence **Text Merge** |
| Découper un texte long en blocs, avec chevauchement | Compétence **Text Split** (`textSplitMode: pages`, `maximumPageLength`, `pageOverlapLength`) |
| Calculer l'embedding des blocs de texte | Compétence **Azure OpenAI Embedding** |
| Placer images et texte dans un même espace vectoriel | Compétence **Azure Vision multimodal embeddings** (préversion) |
| Langue, entités, expressions clés, données personnelles (PII), traduction | Compétences Language (détection de langue, reconnaissance d'entités, extraction d'expressions clés, détection des PII, traduction de texte) |
| Une logique qu'aucune compétence intégrée ne fournit | Compétence **Custom Web API** : un point de terminaison HTTPS, souvent une fonction Azure Functions |

Une compétence Custom Web API reçoit et renvoie un lot d'enregistrements, associés par `recordId` :

```json
{
  "values": [
    { "recordId": "0", "data": { "text": "Order 4471 shipped to Lisbon." } }
  ]
}
```

La réponse contient les mêmes valeurs `recordId`, chacune avec `data` (les sorties déclarées dans la compétence) et, éventuellement, `errors` et `warnings`.

La compétence Document Layout lit le fichier lui-même (`/document/file_data`, que l'indexeur fournit quand `allowSkillsetToReadFileData` vaut true), renvoie des sections `markdown_document` jusqu'au niveau `markdownHeaderDepth` (`h1` à `h6`), ou des blocs de texte avec `outputFormat: text`. Au-delà de 20 documents par indexeur et par jour, les compétences intégrées comme OCR, Image Analysis et Document Layout demandent une ressource Foundry facturable attachée à l'ensemble de compétences ; la compétence Azure OpenAI Embedding appelle votre déploiement d'embedding. Les compétences utilitaires qui n'appellent pas Foundry Tools (Conditional, Document Extraction, Shaper, Text Merge, Text Split) ne sont pas facturables.

> **Conseil d'examen.** « Extraire uniquement le texte » de pages numérisées : OCR plus Text Merge. « Conserver titres et tableaux pour que les blocs suivent les sections du document » : Document Layout. « Notre propre service de classification doit étiqueter chaque bloc » : compétence Custom Web API.

<!-- section: rag-ingestion | objectives: 5.1.4 -->
## Le flux d'ingestion RAG avec OCR

Ordre des opérations pour un pipeline pull :

1. Créer la **source de données** (conteneur, connexion, de préférence via l'identité managée du service de recherche).
2. Créer l'**index** : clé, texte du bloc, champ vectoriel avec son profil et son vectoriseur, clé du parent, configuration sémantique.
3. Créer l'**ensemble de compétences** : OCR ou Document Layout, Text Merge, Text Split, Azure OpenAI Embedding, et des **projections d'index** qui écrivent un document de recherche par bloc.
4. Créer l'**indexeur**, qui relie source de données, ensemble de compétences et index, avec les paramètres d'image quand l'OCR est nécessaire.
5. L'exécuter, puis vérifier l'historique d'exécution pour les erreurs et les avertissements.

Une exécution ultérieure utilise la détection des modifications : les objets blob inchangés ne sont pas retraités, si bien qu'une simple exécution ne leur applique pas une nouvelle compétence ou un nouveau champ. **Réinitialisez** l'indexeur (réindexation complète de tous les documents), puis exécutez-le. Reset Skills, Reset Documents et Resync sont des API en préversion.

L'OCR ne travaille que sur les images extraites par l'indexeur. Pour des PDF numérisés, la configuration de l'indexeur doit les demander :

```json
{
  "name": "manuals-indexer",
  "dataSourceName": "manuals-blob",
  "skillsetName": "manuals-skillset",
  "targetIndexName": "manuals-index",
  "parameters": {
    "configuration": {
      "dataToExtract": "contentAndMetadata",
      "imageAction": "generateNormalizedImages"
    }
  }
}
```

Les compétences s'exécutent alors dans cet ordre logique : OCR sur `/document/normalized_images/*`, Text Merge de `/document/content` avec le texte OCR dans `merged_content`, Text Split de `merged_content` en `/document/pages/*`, embedding de chaque page. Les projections d'index associent chaque page à un document enfant (bloc, vecteur, ID du parent) ; le document parent peut ne pas être indexé.

L'accès sans clé tout au long du flux :

| Appel | Identité et rôle |
| --- | --- |
| L'indexeur lit les objets blob | Identité managée du service de recherche, Storage Blob Data Reader |
| La compétence d'embedding et le vectoriseur appellent Azure OpenAI | Identité managée du service de recherche, Cognitive Services OpenAI User |
| L'application interroge l'index | Son identité, Search Index Data Reader |
| L'outil Azure AI Search de l'agent, sans clé | Identité managée Foundry, Search Index Data Contributor et Search Service Contributor |

> **Piège d'examen.** Un ensemble de compétences dont la compétence OCR ne renvoie rien sur des PDF numérisés signifie en général que `imageAction` est resté à sa valeur par défaut (`none`) : aucune image n'a été extraite, l'OCR n'avait donc rien à lire.

<!-- section: connect-agents | objectives: 5.1.5 -->
## Connecter la récupération aux agents et aux flux de travail

| Besoin | Connecter la récupération avec |
| --- | --- |
| Un agent ancre ses réponses sur un index Azure AI Search existant, avec des citations | L'**outil Azure AI Search** de Foundry Agent Service, via une connexion du projet au service de recherche |
| Un agent répond à partir de quelques fichiers chargés par les utilisateurs, sans index à gérer | L'outil **file search** (un magasin de vecteurs managé) |
| Plusieurs sources, des questions complexes découpées en sous-requêtes, une couche de récupération partagée par de nombreux agents | Une **base de connaissances Foundry IQ** (récupération agentique dans Azure AI Search), exposée aux agents comme outil MCP. La connexion de projet `RemoteTool` et le point de terminaison MCP de la base de connaissances sont en préversion |
| Une étape déterministe d'un flux de travail ou d'une application, avec un contrôle total de la requête et de l'invite | Votre code appelle Azure AI Search (`SearchClient`), ou l'API retrieve d'une base de connaissances (GA en `2026-10-01`), puis transmet les passages au modèle |

L'outil Azure AI Search cible **un seul index** via une connexion du projet :

```text
from azure.ai.projects.models import (AzureAISearchTool, AzureAISearchToolResource,
    AISearchIndexResource, AzureAISearchQueryType, PromptAgentDefinition)

connection_id = project.connections.get("contoso-search").id
agent = project.agents.create_version(
    agent_name="manuals-agent",
    definition=PromptAgentDefinition(
        model="gpt-4.1-mini",
        instructions="Answer from the manuals only and always cite your sources.",
        tools=[AzureAISearchTool(azure_ai_search=AzureAISearchToolResource(indexes=[
            AISearchIndexResource(project_connection_id=connection_id,
                                  index_name="manuals-index",
                                  query_type=AzureAISearchQueryType.VECTOR_SEMANTIC_HYBRID)]))],
    ),
)
```

| Paramètre | Valeur par défaut et valeurs possibles |
| --- | --- |
| `query_type` | `vector_semantic_hybrid` (par défaut), `vector_simple_hybrid`, `vector`, `semantic`, `simple` |
| Nombre de résultats (`top_k`) | 5 |
| Filtre | Facultatif, appliqué à chaque requête que l'agent envoie à l'index |

L'index doit être configuré pour la recherche vectorielle : des champs `Edm.String` interrogeables et récupérables, des champs vectoriels interrogeables, un champ texte récupérable contenant le contenu à citer, et un champ d'URL source récupérable (éventuellement un titre) pour que les citations pointent vers les documents. Les citations n'apparaissent que si les instructions les demandent ; dans une réponse en flux, elles arrivent sous forme d'annotations `url_citation`. Sur un réseau virtuel privé, l'outil doit utiliser l'authentification sans clé. Learn suggère d'ajouter l'outil via une **boîte à outils** (toolbox), attachée aux agents comme outil MCP, pour le réutiliser et gérer ses informations d'identification en un seul endroit.

Le chemin par le code garde l'ancrage explicite :

```text
from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizableTextQuery

search = SearchClient(endpoint=search_endpoint, index_name="manuals-index",
                      credential=DefaultAzureCredential())
question = "How do I reset the thermostat?"
results = search.search(
    search_text=question,
    vector_queries=[VectorizableTextQuery(text=question, k_nearest_neighbors=50,
                                          fields="contentVector")],
    query_type="semantic", semantic_configuration_name="default", top=5)
sources = "\n".join(f"[{r['title']}] {r['chunk']}" for r in results)
# The prompt: answer only from the sources, cite the titles
```

> **Piège d'examen.** La mémoire conserve ce que l'utilisateur a dit lors de conversations précédentes ; ce n'est pas une méthode de récupération de documents. L'appel de fonction exécute votre code ; il n'ancre rien sur un index, sauf si ce code en interroge un. « Répondre à partir des manuels de l'entreprise, avec des citations » désigne un outil de connaissances : outil Azure AI Search, file search ou base de connaissances.

<!-- section: key-points -->
## Points clés

- Source de données, index, ensemble de compétences, indexeur ; pull avec un indexeur, push avec l'API.
- Mots clés pour les termes exacts, vectorielle pour le sens, hybride (RRF) pour les deux, classeur sémantique pour reclasser les premiers résultats.
- Les requêtes vectorielles `kind: text` exigent un vectoriseur avec le modèle d'indexation ; HNSW pour la vitesse, KNN exhaustif pour des résultats exacts.
- Documents numérisés : `imageAction: generateNormalizedImages`, OCR, Text Merge, Text Split, embedding, projections d'index.
- Document Layout pour des blocs Markdown qui suivent la structure ; compétence Custom Web API pour votre propre logique.
- Les agents s'ancrent via l'outil Azure AI Search, file search ou une base de connaissances Foundry IQ (connexion de l'agent en préversion) ; les flux de travail interrogent eux-mêmes `SearchClient` ou l'API retrieve de la base de connaissances.
- Après une modification de l'ensemble de compétences ou de l'index, réinitialisez l'indexeur avant de l'exécuter : sinon les documents inchangés ne sont pas retraités.
