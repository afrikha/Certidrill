Une application générative dans Microsoft Foundry est du code qui appelle un déploiement de modèle par l'intermédiaire d'un projet Foundry, généralement avec le SDK Foundry pour Python et l'API Responses compatible OpenAI. Autour de cet appel, vous ajoutez la récupération pour l'ancrage, des outils pour les actions, plusieurs étapes pour les tâches complexes et des évaluations pour prouver la qualité. Les questions d'examen montrent un court extrait Python à compléter, demandent quelle option de récupération ou quel évaluateur répond à une exigence, ou comment l'application doit s'authentifier.

<!-- section: deploy-consume | objectives: 2.1.1 -->
## Déployer et consommer des modèles

Vous déployez un modèle du catalogue de modèles Foundry dans une ressource Foundry ; le code du projet appelle ensuite le **nom du déploiement**, qui peut différer du nom du modèle. Commencez par le type de déploiement **Global Standard** (paiement au jeton, nouveaux modèles en premier, quota par défaut le plus élevé) et n'en changez que pour une raison précise : résidence des données (Data Zone ou Standard), débit réservé (provisionné) ou gros traitements asynchrones avec 50 % de remise (Batch).

| Exigence | Type de modèle |
| --- | --- |
| Conversation ouverte, résumé, instructions complexes | Grand modèle de langage (LLM) |
| Coût et latence faibles pour une tâche simple et ciblée, ou modèle à exécuter sur un matériel limité | Petit modèle de langage |
| Analyse en plusieurs étapes, planification, mathématiques, revue de code | Modèle de raisonnement, avec un niveau d'effort `reasoning` |
| Générer, compléter ou expliquer du code | Un modèle orienté code du catalogue |
| Texte et images (ou audio) dans la même requête | Modèle multimodal |
| Un point de terminaison unique qui choisit un modèle par invite selon le coût et la qualité | Model router |

Le même client appelle tous les modèles de conversation déployés dans le projet. Les images se placent dans `input` sous forme de parties de contenu :

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="https://contoso-ai.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),
)
openai = project.get_openai_client()

response = openai.responses.create(
    model="gpt-4.1-mini",            # deployment name
    instructions="You are a claims assistant. Answer in two sentences.",
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "Describe the damage in this photo."},
            {"type": "input_image", "image_url": "https://contoso.com/claims/1234.jpg"},
        ],
    }],
    max_output_tokens=300,
)
print(response.output_text)
```

| Élément | Rôle |
| --- | --- |
| `model` | Le nom du déploiement |
| `instructions` ou un message `system` / `developer` | Les règles de toute la conversation |
| `input` | Une chaîne, ou une liste de messages avec des parties de contenu (`input_text`, `input_image`) |
| `max_output_tokens` | Plafonne les jetons générés (jetons de raisonnement compris pour les modèles de raisonnement) |
| `response.output_text` | Le texte généré |
| `response.usage` | `input_tokens`, `output_tokens`, `total_tokens` |

L'API Chat Completions (`chat.completions.create` avec `messages`) reste disponible ; l'API Responses est celle qu'utilisent les agents Foundry et les exemples actuels. Les modèles Claude déployés dans Foundry utilisent un point de terminaison Anthropic distinct et le client `AnthropicFoundry`.

> **Piège d'examen.** `model=` reçoit le nom du déploiement. Si le déploiement s'appelle `chat-prod` et exécute `gpt-4.1-mini`, le code passe `"chat-prod"`.

<!-- section: rag | objectives: 2.1.2 -->
## La génération augmentée de récupération dans une application

Le RAG ancre les réponses dans vos données : **récupérer** les passages pertinents dans un index, **augmenter** l'invite avec eux, **générer** une réponse qui les cite. Préparer les données consiste à découper les documents en blocs (chunks), à générer des embeddings avec un modèle d'embedding et à les indexer, en général dans Azure AI Search, le magasin d'index recommandé.

| Type de recherche | Point fort |
| --- | --- |
| Mot clé (texte intégral) | Termes exacts : codes produit, noms, numéros d'erreur |
| Vectorielle | Sens, synonymes, questions reformulées ; nécessite des embeddings |
| Hybride | Mot clé et vectorielle dans une même requête, résultats fusionnés : le meilleur choix général par défaut |
| Classement sémantique | Reclasse les meilleurs résultats avec un modèle de compréhension du langage ; s'ajoute à la recherche par mot clé ou hybride |

Options d'implémentation :

| Option | Quand |
| --- | --- |
| Votre code interroge Azure AI Search, puis appelle le modèle | Contrôle total de la requête, des filtres et de l'invite dans une application sans agent |
| Outil Azure AI Search sur un agent | L'agent décide quand interroger un index existant ; `query_type` vaut `vector_semantic_hybrid` par défaut, `top_k` vaut 5 |
| Outil de recherche de fichiers (file search) sur un agent | Fichiers chargés ; le service les découpe (800 jetons, chevauchement de 400), crée les embeddings et les indexe pour vous |
| Base de connaissances Foundry IQ | Plusieurs sources (Stockage Blob, SharePoint, OneLake, web) partagées par de nombreux agents ; la récupération agentique décompose la question en sous-requêtes, reclasse et renvoie des citations, avec les autorisations appliquées au moment de la requête |

Un appel RAG minimal au niveau de l'application, avec recherche hybride et classement sémantique :

```text
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizableTextQuery

search = SearchClient(endpoint=search_endpoint, index_name="policies", credential=DefaultAzureCredential())
results = search.search(
    search_text=question,
    vector_queries=[VectorizableTextQuery(text=question, k_nearest_neighbors=5, fields="contentVector")],
    query_type="semantic",
    semantic_configuration_name="default",
    top=5,
)
sources = "\n".join(f"[{r['title']}] {r['content']}" for r in results)

response = openai.responses.create(
    model="gpt-4.1-mini",
    instructions="Answer only from the sources. Cite the title in brackets. If the answer isn't in the sources, say you don't know.",
    input=f"Sources:\n{sources}\n\nQuestion: {question}",
)
```

Bonnes pratiques : indexez un champ titre et un champ URL pour des citations utiles ; appliquez des filtres de sécurité au moment de la récupération pour qu'un utilisateur n'obtienne que les documents qu'il peut lire ; utilisez Microsoft Entra ID plutôt que des clés pour le service de recherche ; traitez le contenu récupéré comme une entrée non fiable (il peut porter une injection d'invite indirecte).

> **Piège d'examen.** Le RAG ajoute des connaissances ; l'affinage (fine-tuning) modifie le comportement, le style ou la performance sur une tâche. « Les réponses doivent refléter les documents de stratégie mis à jour chaque semaine » relève du RAG, ni de l'affinage ni d'une température plus basse.

> **Conseil d'examen.** De mauvaises réponses avec de bons documents : examinez d'abord la récupération (découpage, modèle d'embedding, mot clé ou hybride, classement sémantique) avant de modifier l'invite ou le modèle.

<!-- section: workflows | objectives: 2.1.3 -->
## Flux de travail, flux augmentés par des outils et pipelines à plusieurs étapes

Une seule invite suffit rarement pour une tâche complexe. Trois briques se combinent :

| Modèle | Fonctionnement | Exemple |
| --- | --- | --- |
| Chaînage d'invites | Décomposer la tâche en étapes ; la sortie d'un appel alimente le suivant | Extraire les affirmations, puis générer des requêtes de recherche, puis vérifier |
| Flux augmenté par des outils | Le modèle demande un outil ; le code ou le service l'exécute ; le résultat revient au modèle | Consulter l'état d'une commande, puis répondre |
| Pipeline de raisonnement à plusieurs étapes | Planifier, récupérer, rédiger, vérifier, finaliser, avec une sortie structurée entre les étapes | Répondre à une question sur un contrat, puis vérifier chaque citation |

La boucle d'appel de fonction, dans l'ordre :

1. Envoyer l'invite avec les définitions d'outils (nom, description, paramètres en JSON Schema).
2. Lire la sortie : les éléments de type `function_call` portent `name`, `arguments` (une chaîne JSON) et `call_id`.
3. Votre code exécute la fonction : le modèle ne l'exécute jamais.
4. Renvoyer un élément `function_call_output` avec le même `call_id` et le résultat sous forme de chaîne.
5. Le modèle produit la réponse finale, ou demande un autre appel.

Une réponse peut contenir plusieurs éléments `function_call` : exécutez-les tous et renvoyez toutes les sorties dans une seule requête de suivi.

Pour orchestrer au-delà de quelques appels, **Microsoft Agent Framework** (SDK open source pour Python et .NET) construit des workflows en code ou en YAML déclaratif : modèles séquentiel, concurrent, handoff, group chat et Magentic, avec des demandes d'intervention humaine et des points de contrôle (checkpoints). Le concepteur visuel **Foundry workflows** (modèles sequential, group chat, human in the loop) est en préversion et sera retiré le 1er décembre 2026 ; Microsoft recommande Agent Framework pour les nouveaux développements.

> **Piège d'examen.** Des étapes dont l'ordre est connu à l'avance relèvent d'une chaîne ou d'un workflow déterministe. Laisser un modèle décider de chaque étape ajoute du coût et de l'imprévisibilité ; réservez l'autonomie d'un agent aux tâches dont le chemin ne peut pas être fixé.

<!-- section: evaluate | objectives: 2.1.4 -->
## Évaluer les modèles et les applications

L'évaluation compare un modèle ou une application à un jeu de données de test avant la mise en production, puis sur le trafic de production. Choisissez l'évaluateur selon la question posée :

| Exigence | Évaluateur |
| --- | --- |
| Détecter les fabrications : des affirmations non étayées par le contexte récupéré | Groundedness (précision par rapport au contexte) |
| Cohérence stricte oui/non avec le contexte, sans déploiement juge | Groundedness Pro (préversion) |
| La réponse traite-t-elle la question ? | Relevance |
| La récupération a-t-elle renvoyé des blocs utiles ? | Retrieval ; Document Retrieval si vous disposez de jugements de pertinence étiquetés |
| La réponse couvre-t-elle tout le contenu de la réponse attendue ? | Response Completeness (rappel par rapport à la vérité terrain) |
| Des réponses lisibles et logiques | Fluency, Coherence |
| Proximité avec une réponse de référence | Similarity, F1 Score, BLEU, ROUGE, METEOR, GLEU |
| Contenu nuisible, vulnérabilité aux jailbreaks | Évaluateurs de risque et de sécurité |

Les évaluateurs de qualité assistés par IA renvoient un score de 1 à 5, une étiquette réussite ou échec par rapport à un seuil (3 par défaut) et une raison. Groundedness a besoin de `response` et `context` ; Relevance de `query` et `response` ; Response Completeness de `ground_truth` et `response`.

Une exécution d'évaluation cloud avec le SDK, avec un déploiement de modèle ou un agent comme cible :

```text
eval_object = openai.evals.create(
    name="support-quality",
    data_source_config=data_source_config,   # schema of the test items
    testing_criteria=testing_criteria,       # builtin.groundedness, builtin.relevance, ...
)
run = openai.evals.runs.create(
    eval_id=eval_object.id,
    name="v2-candidate",
    data_source={
        "type": "azure_ai_target_completions",
        "source": {"type": "file_id", "id": dataset_id},
        "input_messages": input_messages,
        "target": {"type": "azure_ai_agent", "name": "support-agent", "version": "2"},
    },
)
```

Comparez les exécutions de deux versions sur le même jeu de données avant d'en promouvoir une. Les résultats sont visibles dans le portail Foundry et par le SDK.

> **Piège d'examen.** Groundedness et Relevance mesurent des défaillances différentes. Une réponse fluide qui invente un délai de remboursement n'est pas ancrée ; une citation exacte de la stratégie qui ne répond pas à la question n'est pas pertinente.

<!-- section: sdks-connectors | objectives: 2.1.5 -->
## SDK et connecteurs Foundry

| Package ou client | Usage |
| --- | --- |
| `azure-ai-projects` (2.x), `AIProjectClient` | Opérations du projet : agents, connexions, télémétrie, règles d'évaluation |
| `project.get_openai_client()` | Un client compatible OpenAI pour les réponses, les conversations, les fichiers, les magasins de vecteurs et les évaluations |
| `openai` | Le client OpenAI que renvoie le client de projet, ou utilisé directement sur `https://<resource>.openai.azure.com/openai/v1/` |
| `azure-identity` | `DefaultAzureCredential` pour l'authentification sans clé |
| Microsoft Agent Framework | Orchestration multi-agent et workflows ; son client Foundry cible le point de terminaison Responses du projet |
| SDK Foundry Tools | Speech, Language, Translator, Vision, Content Safety, Document Intelligence, Azure AI Search, chacun avec son propre point de terminaison |

Les **connexions** sont des ressources du projet qui décrivent comment joindre un autre service (Azure AI Search, Stockage Blob, Application Insights, un serveur MCP, un point de terminaison OpenAPI, un agent A2A distant) et comment s'y authentifier, pour que les informations d'identification n'apparaissent jamais dans le code. Le code les retrouve par leur nom :

```text
search_connection = project.connections.get("contoso-search")
connection_id = search_connection.id    # passed to a tool as project_connection_id
```

> **Conseil d'examen.** Quand un extrait a besoin de l'ID de ressource d'un outil, la réponse est généralement `project.connections.get(name).id`, pas une clé copiée dans le code.

<!-- section: connect-project | objectives: 2.1.6 -->
## Connecter une application à un projet Foundry

L'application a besoin du **point de terminaison du projet**, affiché sur la page d'accueil du projet :

```text
https://<resource-name>.services.ai.azure.com/api/projects/<project-name>
```

| Point de terminaison | Utilisé pour |
| --- | --- |
| `https://<resource>.services.ai.azure.com/api/projects/<project>` | `AIProjectClient` : agents, connexions, évaluations, modèles via l'API Responses |
| `https://<resource>.openai.azure.com/openai/v1/` | Le client `openai` directement ; le seul qui accepte aussi une clé API |
| `https://<resource>.cognitiveservices.azure.com/` | SDK Foundry Tools |

L'authentification est **sans clé par défaut** : `DefaultAzureCredential` utilise la session `az login` du développeur en local et l'identité managée de l'application App Service, Container Apps ou Functions dans Azure. Avec le client `openai` utilisé directement, passez un fournisseur de jetons pour l'étendue `https://ai.azure.com/.default` :

```text
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import OpenAI

token_provider = get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default")
client = OpenAI(base_url="https://contoso-ai.openai.azure.com/openai/v1/", api_key=token_provider)
```

| Rôle (RBAC Foundry) | Accorde |
| --- | --- |
| Foundry User (anciennement Azure AI User) | Créer et appeler des agents et des modèles dans le projet : développement quotidien et identités des applications |
| Foundry Project Manager | Gérer le projet et ses connexions |
| Foundry Account Owner | Créer des projets et des ressources au niveau du compte |

Étapes pour une application de production : activer une identité managée sur le service d'hébergement, lui attribuer **Foundry User** sur le projet, stocker le point de terminaison dans la configuration (par exemple une variable d'environnement) et créer le client avec `DefaultAzureCredential`. Attribuez les rôles à l'étendue la plus restreinte.

> **Piège d'examen.** Une clé API ne fonctionne que sur le point de terminaison `/openai/v1` et ne fournit aucune identité à auditer. « Aucun secret dans le code ni dans la configuration » signifie une identité managée avec le rôle Foundry User, pas une clé stockée dans un paramètre d'application.

<!-- section: key-points -->
## Points clés

- Le code appelle un nom de déploiement ; Global Standard est le type de déploiement par défaut.
- `AIProjectClient(endpoint, DefaultAzureCredential())`, puis `get_openai_client()` et `responses.create(model=..., input=...)`.
- RAG : récupérer, augmenter, générer avec citations. Hybride plus classement sémantique est la meilleure récupération générale ; le RAG ajoute des connaissances, l'affinage modifie le comportement.
- Appel de fonction : votre code exécute la fonction et renvoie `function_call_output` avec le même `call_id`.
- Agent Framework pour les workflows en code ; le concepteur Foundry workflows est retiré le 1er décembre 2026.
- Fabrications : Groundedness. Pertinence : Relevance. Contenu manquant : Response Completeness. Scores de 1 à 5, seuil 3.
- Les connexions contiennent les informations d'identification ; `project.connections.get(name).id` alimente les outils.
- Sans clé : identité managée plus Foundry User sur le projet ; les clés uniquement sur `/openai/v1`.
