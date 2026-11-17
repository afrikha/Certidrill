Planifier une solution IA sur Microsoft Foundry revient à faire quatre choix : quel modèle pour chaque tâche, quel service Foundry pour chaque fonctionnalité, quelle méthode de récupération et d'indexation pour l'ancrage, et quels mémoire, outils et sources de connaissances donner à un agent. Les questions d'examen décrivent un scénario avec une ou deux contraintes décisives (coût, latence, sortie structurée, fraîcheur des données, actions à effectuer) et demandent quoi utiliser.

<!-- section: model-choice | objectives: 1.1.1 -->
## Choisir un modèle pour chaque tâche

Le catalogue Foundry Models liste des modèles de Microsoft, d'OpenAI et d'autres fournisseurs. Les **modèles vendus directement par Azure** (tous les modèles Azure OpenAI et une sélection de modèles d'autres fournisseurs) sont hébergés par Azure, facturés via votre abonnement Azure, couverts par les contrats de niveau de service Azure et pris en charge par Microsoft. Les **modèles des partenaires et de la communauté** sont listés à part et n'acceptent pas tous les augmentations de quota.

| Catégorie de modèle | Point fort | Tâches typiques | Exemples sur Learn |
| --- | --- | --- | --- |
| Grand modèle de langage (LLM) | Connaissances étendues, instructions complexes, contexte long | Assistants conversationnels, résumé, extraction par invite libre, agents | `gpt-4.1`, famille GPT-5 |
| Modèle de raisonnement | Planifie et vérifie avant de répondre ; plus lent et plus de jetons par réponse | Problèmes en plusieurs étapes, mathématiques, code, planification complexe | Série o (`o3`, `o4-mini`), famille GPT-5 |
| Petit modèle de langage (SLM) | Faible latence, faible coût, peut s'exécuter là où les ressources sont limitées | Classification, routage, extraction courte, tâches simples à fort volume | Variantes `-mini` et `-nano`, famille Phi |
| Modèle multimodal | Texte plus image (et pour certains, audio) en entrée | Décrire une image, répondre sur un graphique, lire une capture d'écran | `gpt-4.1`, `gpt-4o` |
| Modèle audio et temps réel | Parole en entrée et en sortie avec une faible latence | Assistants vocaux, centres d'appels | `gpt-realtime`, `gpt-audio` |
| Modèle de code | Génération et modification de code via l'API Responses | Agents de codage, revue de code | Modèles Codex |
| Modèle d'embedding | Transforme le texte en vecteurs ; ne génère pas de texte | Recherche vectorielle, RAG, similarité, regroupement | `text-embedding-3-small`, `text-embedding-3-large` |
| Génération d'images et de vidéos | Crée des médias à partir d'une invite et de médias de référence | Visuels marketing, vidéos produit | `gpt-image-1`, `sora-2` (préversion) |

**Foundry Tools** (anciennement Azure AI services) regroupe des services spécialisés : Azure Speech, Azure Language, Azure Translator, Azure Vision, Azure Content Understanding, Azure Document Intelligence et Azure Content Safety. Ils renvoient un résultat prévisible et structuré pour une tâche, sans invite à rédiger.

| Exigence | Choix |
| --- | --- |
| Raisonnement ouvert, rédaction, conversation multitour | LLM |
| La même tâche simple des millions de fois par jour, coût et latence d'abord | SLM |
| Problème difficile en plusieurs étapes où la précision compte plus que la latence | Modèle de raisonnement |
| Question sur le contenu d'une photo ou d'un schéma | Modèle multimodal |
| Reconnaissance ou synthèse vocale en temps réel dans une application | Azure Speech (ou un modèle audio temps réel dans un agent vocal) |
| Traduire des documents ou du texte à grande échelle avec des résultats cohérents | Azure Translator |
| Champs fixes de factures, de formulaires, d'audio ou de vidéo, avec scores de confiance | Azure Content Understanding |
| Détecter du texte ou des images nuisibles | Azure Content Safety |
| Représenter des documents pour la récupération sémantique | Modèle d'embedding |

> **Piège d'examen.** Un modèle plus gros n'est pas la réponse à toutes les exigences. Si l'énoncé dit « coût le plus bas » ou « latence la plus faible » et que la tâche est simple (classer, router, extraire quelques champs), on attend un SLM ou un outil Foundry Tools. S'il dit « sortie structurée cohérente pour un type de document connu », Content Understanding l'emporte sur une invite libre adressée à un modèle multimodal.

> **Piège d'examen.** Le vecteur de la requête et les vecteurs indexés doivent venir du même modèle d'embedding. Les modèles d'embedding ne peuvent pas être mis à niveau sur place : changer de modèle d'embedding impose de recalculer les embeddings de tout l'index.

<!-- section: foundry-services | objectives: 1.1.2 -->
## Associer les fonctionnalités aux services Foundry

Une **ressource Foundry** (type de ressource Azure `Microsoft.CognitiveServices/accounts`, kind `AIServices`) donne accès dans une seule ressource aux agents, aux évaluations, à Azure OpenAI, Speech, Vision, Language et Content Understanding. Les **projets Foundry** en sont des sous-ressources, où les équipes créent agents et évaluations.

| Besoin | Service Foundry | Remarques |
| --- | --- | --- |
| Générer du texte, du code, des images ou des vidéos | Foundry Models (déploiements de modèles) | Appelés via l'API Responses ou Chat Completions |
| Ancrer les réponses dans le contenu de l'entreprise | Base de connaissances Foundry IQ, ou un index Azure AI Search | Récupération avec citations ; RAG |
| Recherche vectorielle, par mots clés et hybride | Azure AI Search | Index avec champs vectoriels, classeur sémantique |
| Créer un agent avec des instructions, un modèle et des outils | Foundry Agent Service, agent d'invite (prompt agent) | Runtime managé, aucune infrastructure |
| Agent vocal en temps réel | Foundry Agent Service, agent d'invite vocal | Interaction audio à faible latence |
| Agent avec votre propre code, framework ou orchestration personnalisée | Foundry Agent Service, agent hébergé (hosted agent) | Votre conteneur, point de terminaison, mise à l'échelle et identité managés |
| Appel ponctuel avec des outils, sans agent persistant | API Responses | La définition vit dans le code de votre application |
| Documents, images, audio, vidéo vers des données structurées | Azure Content Understanding | Analyseurs, sortie Markdown ou champs |
| Parole, traduction, analyse de texte, analyse d'images | Foundry Tools (Speech, Translator, Language, Vision) | API spécialisées |
| Bloquer le contenu nuisible | Filtres de contenu (garde-fous) sur les déploiements, Azure Content Safety | Appliqués à l'exécution |

Types d'agents de Foundry Agent Service :

| Type d'agent | Idéal pour |
| --- | --- |
| Agent d'invite (prompt agent) | Le chemin le plus rapide : définir instructions, modèle et outils ; Foundry exécute l'agent |
| Agent d'invite vocal | Voix face aux clients, centres d'appels, audio à faible latence |
| Agent hébergé (hosted agent) | Agents qui appellent votre propre code ; orchestration personnalisée, systèmes multi-agents, protocoles personnalisés |

> **Conseil d'examen.** Certaines fonctionnalités n'existent qu'au niveau de la ressource Foundry, pas dans un projet : l'API Translator est l'exemple que donne Learn. La plupart des nouvelles API, comme les agents et les évaluations, sont limitées au projet.

<!-- section: retrieval-indexing | objectives: 1.1.3 -->
## Choisir une méthode de récupération et d'indexation

Azure AI Search fournit l'indexation et la récupération derrière le RAG et derrière Foundry IQ. Choisissez d'abord comment la requête trouve le contenu :

| Méthode | Comment elle trouve | À choisir quand | Faiblesse |
| --- | --- | --- | --- |
| Mots clés (texte intégral) | Termes de la requête, score BM25 | Termes exacts, codes, noms, filtres | Manque les documents qui emploient d'autres mots |
| Vectorielle | Similarité entre embeddings | Sens et paraphrases, multilingue, images | Faible sur les identifiants exacts et les termes rares |
| Hybride | Requêtes par mots clés et vectorielle en parallèle, résultats fusionnés par Reciprocal Rank Fusion (RRF) | Requêtes mixtes ; rappel maximal pour le RAG | Un peu plus de coût et de latence |
| Classeur sémantique | Recalcule le score des premiers résultats d'une requête avec un modèle de langage | Les meilleurs résultats en premier ; ajoute légendes et réponses | Reclasse seulement ; ne récupère pas de nouveaux documents |

Learn recommande les requêtes hybrides pour un rappel maximal, et de les combiner au classeur sémantique pour les résultats les plus pertinents. Une requête hybride avec classement sémantique ressemble à ceci (REST, `POST /indexes/{index}/docs/search`) :

```json
{
  "search": "warranty for model X200 batteries",
  "vectorQueries": [
    { "kind": "text", "text": "warranty for model X200 batteries", "fields": "contentVector", "k": 50 }
  ],
  "queryType": "semantic",
  "semanticConfiguration": "default",
  "select": "title, chunk",
  "top": 5
}
```

`"kind": "text"` exige un **vectoriseur** sur le champ vectoriel : le service calcule l'embedding de la requête avec le même modèle qu'à l'indexation.

Choisissez ensuite le modèle de récupération :

| Modèle | Fonctionnement | À choisir quand |
| --- | --- | --- |
| RAG classique | Votre code envoie une requête et passe les résultats au LLM | Fonctionnalités en disponibilité générale uniquement ; simplicité et rapidité ; code d'orchestration existant ; contrôle fin de la requête |
| Récupération agentique (base de connaissances) | Un LLM planifie plusieurs sous-requêtes, les exécute en parallèle et renvoie des résultats structurés avec citations | Le client est un agent ou un chatbot ; questions complexes ou conversationnelles ; pertinence maximale |

Choisissez enfin comment le contenu entre dans l'index :

| Méthode d'indexation | À utiliser quand |
| --- | --- |
| Indexeur (extraction) | Le contenu se trouve dans une source de données Azure prise en charge (Stockage Blob, bases de données, SharePoint et d'autres) ; indexation planifiée et incrémentielle |
| API push | Le contenu est prétraité ailleurs ou vient d'une source non prise en charge |
| Ensemble de compétences (skillset) | Segmenter, vectoriser, exécuter l'OCR, analyser ou verbaliser des images pendant l'indexation |
| Vectorisation intégrée | Embeddings créés pendant l'indexation (Azure OpenAI, Azure Vision ou un vectoriseur personnalisé) et au moment de la requête |
| Segmentation (chunking) | Documents volumineux : les découper pour que chaque partie puisse être trouvée seule |

> **Piège d'examen.** Si l'énoncé dit que le modèle « invente des réponses » ou « ne connaît pas nos produits », la solution est la récupération (ancrage), pas la baisse de la température. S'il dit que les utilisateurs cherchent avec des références exactes de pièces et aussi avec des questions en langage naturel, la recherche vectorielle seule ne suffit pas : choisissez l'hybride.

<!-- section: agent-integration | objectives: 1.1.4 -->
## Choisir mémoire, outils et connaissances pour les agents

Un agent associe un modèle, des instructions et des outils. Foundry propose des outils intégrés (recherche web, recherche de fichiers, interpréteur de code, mémoire) et des outils personnalisés (fonctions, spécifications OpenAPI, serveurs MCP). Classez-les selon ce qu'ils apportent à l'agent.

Les **outils de connaissances** apportent du contenu pour ancrer les réponses :

| Outil | À utiliser quand |
| --- | --- |
| Recherche de fichiers (file search) | Des utilisateurs ou des développeurs chargent des documents pour l'agent ; le service les segmente et les indexe dans un magasin de vecteurs |
| Azure AI Search | Un index de recherche existant et organisé doit ancrer l'agent |
| Base de connaissances Foundry IQ | Plusieurs sources (Stockage Blob, SharePoint, OneLake, web) partagées par plusieurs agents, avec récupération agentique, citations et autorisations appliquées au moment de la requête |
| Recherche web ou Grounding with Bing | Informations publiques récentes |
| SharePoint, agent de données Fabric | Contenu Microsoft 365 ou données Microsoft Fabric |

Les **outils d'action** permettent à l'agent de faire quelque chose :

| Outil | À utiliser quand |
| --- | --- |
| Appel de fonction (function calling) | L'agent doit appeler votre code ; le modèle renvoie le nom de la fonction et ses arguments, votre application l'exécute et renvoie le résultat |
| OpenAPI | Appeler une API REST existante décrite par une spécification OpenAPI |
| MCP | Appeler des outils exposés par un serveur Model Context Protocol distant |
| Azure Functions | Exécuter du code serverless comme outil |
| Interpréteur de code | Exécuter du Python dans un bac à sable : calculs, graphiques, traitement de fichiers |
| Automatisation du navigateur, utilisation de l'ordinateur | Manipuler des pages web ou une interface d'ordinateur |
| Agent à agent (A2A) | Déléguer une tâche à un autre agent |

Une **boîte à outils** (toolbox) définit une fois un ensemble d'outils choisis et l'expose par un point de terminaison unique compatible MCP, partagé par plusieurs agents, avec authentification et gestion de versions centralisées. L'appel de fonction s'exécute côté client et ne peut pas faire partie d'une boîte à outils.

La **mémoire** conserve le contexte :

| Besoin | Choix |
| --- | --- |
| Questions de suivi dans la même conversation | Historique de conversation (mémoire à court terme), géré par le runtime |
| Se souvenir de préférences ou de faits d'une session et d'un appareil à l'autre | Mémoire de l'agent (à long terme, préversion) : un magasin de mémoire lu et écrit par l'outil de recherche en mémoire |
| Contenu organisationnel organisé | Base de connaissances Foundry IQ, pas la mémoire |
| Un document fourni par un utilisateur pendant l'interaction | Recherche de fichiers, pas la mémoire |

La mémoire à long terme contient la mémoire du profil utilisateur (préférences comme la langue), la mémoire de résumé des conversations (résumés des sujets précédents) et la mémoire procédurale (routines récurrentes). Elle exige un déploiement de modèle de conversation et un déploiement de modèle d'embedding. L'outil de recherche en mémoire peut déduire l'étendue de l'identité de l'appelant quand `scope` vaut `{{$userId}}`, si bien que chaque utilisateur n'obtient que ses propres souvenirs. Un magasin de mémoire contient jusqu'à 100 étendues et 10 000 souvenirs par étendue, et ne prend pas en charge l'intégration à un réseau virtuel.

> **Piège d'examen.** Les outils sont des actions, les connaissances sont du contexte, la mémoire est ce que l'agent a appris de l'utilisateur. « Répondre à partir des politiques RH » appelle un outil de connaissances ; « créer un ticket dans notre système » appelle une fonction, un outil OpenAPI ou MCP ; « retenir que ce client préfère le français » appelle la mémoire.

<!-- section: key-points -->
## Points clés

- Le choix du modèle suit la tâche et la contrainte : LLM pour les tâches ouvertes, SLM pour les tâches simples bon marché et rapides, modèle de raisonnement pour les problèmes difficiles en plusieurs étapes, multimodal pour les images, embeddings pour les vecteurs, Foundry Tools pour une tâche prévisible.
- Une ressource Foundry (kind `AIServices`) donne modèles, agents, Speech, Vision, Language et Content Understanding ; les projets isolent les équipes.
- Agent d'invite pour un agent managé, agent hébergé pour votre propre code, API Responses pour un agent défini dans le code.
- La recherche hybride donne le rappel maximal ; le classeur sémantique réordonne les premiers résultats ; la récupération agentique planifie des sous-requêtes pour les agents.
- Même modèle d'embedding à l'indexation et à la requête ; en changer impose de réindexer.
- Les outils de connaissances ancrent, les outils d'action agissent, la mémoire persiste d'une session à l'autre (préversion, étendue par utilisateur).
