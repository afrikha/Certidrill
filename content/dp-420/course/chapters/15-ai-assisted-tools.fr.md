Azure Cosmos DB Agent Kit apporte les bonnes pratiques Azure Cosmos DB de Microsoft dans les assistants de codage IA comme GitHub Copilot, Claude Code ou Cursor. L'examen vérifie ce qu'est le kit et ce qu'il n'est pas (des recommandations, pas un accès à la base de données), comment l'installer et vérifier qu'il est chargé, quel contexte lui fournir pour revoir une clé de partition, une requête ou du code SDK, et comment il s'intègre au développement d'une application IA à côté des serveurs MCP.

<!-- section: agent-kit-overview | objectives: 1.5.1 -->
## Ce qu'est Agent Kit

Agent Kit est une collection open source de **compétences d'agent (Agent Skills)** au format agentskills.io, publiée dans le dépôt GitHub `AzureCosmosDB/cosmosdb-agent-kit`. Sa compétence principale, **`cosmosdb-best-practices`**, est un fichier `SKILL.md` (instructions et index) accompagné d'un dossier `rules/` de fichiers de règles individuels. Un assistant compatible charge les règles pertinentes **à la demande**, quand la tâche en a besoin, au lieu d'ajouter toutes les règles à chaque prompt.

Le kit cible les décisions qui pilotent les performances, la scalabilité et le coût :

| Domaine | Exemples de ce que couvrent les recommandations |
| --- | --- |
| Modélisation des données et choix de la clé de partition | Incorporation ou référence, cardinalité de la clé, prévention des partitions chaudes, croissance des partitions logiques |
| Optimisation des requêtes et indexation | Requêtes sur une seule partition, projections, stratégie d'indexation pour les charges courantes et vectorielles |
| Utilisation du SDK | Réutilisation du client, appels asynchrones, requêtes paramétrées, pagination, nouvelles tentatives, diagnostics |
| Sécurité et accès | Authentification Microsoft Entra ID plutôt que par clés, modèles d'accès |
| Débit, mise à l'échelle et distribution mondiale | Mise à l'échelle automatique, options de mise à l'échelle, paramètres de cohérence et de régions |
| Charges de travail IA | Recherche vectorielle, recherche en texte intégral, recherche hybride, modèles de conception |
| Exploitation | Outils de développement, supervision et diagnostics |

Le dépôt classe la modélisation des données et le choix de la clé de partition comme les catégories les plus critiques.

Ce que le kit **n'est pas** :

- Il n'authentifie pas l'assistant auprès d'Azure et ne lui donne pas accès à une base de données. L'assistant travaille uniquement à partir du code, des documents et des diagnostics que vous lui donnez.
- Ses recommandations sont des suggestions. Une réponse générée ne prouve pas qu'une requête a été exécutée ni que la consommation de RU a baissé : vous validez et vous mesurez.
- Ce n'est ni le serveur MCP Microsoft Learn, qui recherche dans la documentation officielle, ni un serveur MCP de base de données.

| Capacité | Ce qu'il faut |
| --- | --- |
| Appliquer les recommandations d'Agent Kit à du code ou à un modèle de données | Un hôte compatible où la compétence est installée et détectable |
| Rechercher dans la documentation Microsoft actuelle | Un client MCP connecté au serveur MCP Microsoft Learn |
| Interroger ou gérer une ressource Azure Cosmos DB | Des outils de base de données configurés séparément, avec leur authentification et leurs autorisations |

> **Piège d'examen.** « Le développeur a installé Agent Kit, l'assistant peut donc lire le conteneur de production » est faux. L'installation de compétences n'accorde aucun accès aux données ; les opérations de base de données exigent un outil séparé (par exemple un serveur MCP) avec sa propre identité et sa propre attribution de rôle.

<!-- section: install-verify | objectives: 1.5.1 -->
## Installer le kit et vérifier la détection de la compétence

Prérequis : un assistant qui prend en charge les Agent Skills (ou l'un des formats de plug-in du kit), **Node.js avec npm et npx** pour l'interface CLI des compétences, et un accès à GitHub et au registre de packages. Aucun abonnement Azure n'est nécessaire pour installer les compétences ou revoir du code.

La méthode générique sélectionne les compétences et les assistants cibles de façon interactive :

```bash
npx skills add AzureCosmosDB/cosmosdb-agent-kit
```

Méthodes propres à chaque hôte :

| Hôte | Installation |
| --- | --- |
| GitHub Copilot dans Visual Studio Code, Cursor, autres hôtes Agent Skills | CLI des compétences (`npx skills add`) |
| GitHub Copilot CLI | `/plugin marketplace add AzureCosmosDB/cosmosdb-agent-kit`, puis `/plugin install cosmosdb@cosmosdb-agent-kit` |
| Claude Code | `/plugin install cosmosdb@claude-plugins-official` |
| Gemini CLI | `gemini extensions install https://github.com/AzureCosmosDB/cosmosdb-agent-kit` |
| Agent Package Manager (APM) | `apm install AzureCosmosDB/cosmosdb-agent-kit` |
| OpenAI Codex | `codex plugin marketplace add AzureCosmosDB/cosmosdb-agent-kit`, puis installer depuis le Plugins Directory de l'application de bureau ChatGPT |
| Grok Build | `grok plugin marketplace add AzureCosmosDB/cosmosdb-agent-kit`, puis `grok plugin install cosmosdb --trust` |
| Kimi Code CLI | `/plugins install https://github.com/AzureCosmosDB/cosmosdb-agent-kit`, puis `/reload` |

Choisissez l'étendue d'installation (projet ou utilisateur) documentée par votre hôte, et n'installez pas la même compétence par deux méthodes dans le même hôte.

Pour vérifier la détection : rechargez l'hôte ou ouvrez une nouvelle session s'il l'exige, ouvrez le projet (ou vérifiez que l'hôte lit l'étendue utilisateur), cherchez **`cosmosdb-best-practices`** dans la vue des compétences ou plug-ins installés de l'hôte, puis posez une question de test sur du code anonymisé et consultez les indicateurs ou journaux de chargement des compétences de l'hôte.

```text
Use the installed cosmosdb-best-practices skill to review my Azure Cosmos DB code.
Identify the relevant guidance, explain your recommendations, and state what
information you need before suggesting changes.
```

| Symptôme | Ce qu'il faut vérifier |
| --- | --- |
| `npx` est introuvable | Installer Node.js avec npm, puis rouvrir le terminal |
| Commande de plug-in non reconnue | L'hôte et sa version prennent en charge cette méthode de plug-in ; sinon utiliser la CLI des compétences |
| Installé mais non détecté | Assistant sélectionné, étendue d'installation, espace de travail, paramètres d'approbation de l'hôte ; recharger |
| L'assistant charge trop de contexte | Utiliser le chargement à la demande, ne sélectionner que la compétence utile ; si l'hôte exige un `AGENTS.md` compilé, vérifier son budget de contexte |
| Le téléchargement échoue | Accès réseau, proxy et registre |

> **Piège d'examen.** Une réponse qui mentionne simplement Azure Cosmos DB ne prouve pas que la compétence a été chargée. La preuve, c'est la liste des compétences installées de l'hôte et ses indicateurs de chargement.

<!-- section: best-practice-reviews | objectives: 1.5.1 -->
## Suivre les pratiques recommandées avec les recettes de tâches

Le kit donne de meilleurs résultats quand vous fournissez le contexte qu'un relecteur humain demanderait, sans secrets. Ne collez jamais d'informations d'identification, de jetons d'accès, de chaînes de connexion ou de valeurs de documents sensibles : remplacez-les en conservant la structure.

| Tâche | Contexte à fournir | Comment valider la réponse |
| --- | --- | --- |
| Revoir une clé de partition | Clé proposée, formes de documents représentatives, filtres de requête courants, débits d'écriture, croissance prévue des données, écarts de taille entre locataires | Tester avec des données et un trafic représentatifs ; une clé proposée n'est pas un résultat de scalabilité mesuré |
| Optimiser une requête | La requête, la clé de partition, la stratégie d'indexation, les formes de documents, les champs de résultat requis, les frais en RU et les diagnostics de requête | Exécuter la requête d'origine et la requête révisée sur le même jeu de données et le même état d'indexation ; confirmer des résultats identiques ; comparer frais en RU et latence |
| Revoir du code SDK | Langage et version du package SDK, initialisation du client, opérations, méthode d'authentification, diagnostics d'erreur anonymisés | Générer et exécuter les tests ; vérifier le comportement en cas d'erreur et de limitation (429) ; valider les autorisations dans un environnement hors production |

Un prompt de revue de clé de partition dans le style des recettes du kit :

```text
Use the Azure Cosmos DB Agent Kit to review my proposed partition key /tenantId.
Evaluate it against my query patterns, write distribution, cardinality,
and expected data growth. Identify hot-partition and storage risks.
Ask for missing workload information before recommending a key.
Explain the trade-offs between suitable alternatives.
```

Ce que vérifie une bonne revue de code SDK, et ce que vous devez vous attendre à voir recommandé :

- **Un seul `CosmosClient` par application**, réutilisé (pas de client par requête).
- Opérations asynchrones, **requêtes paramétrées**, pagination correcte avec les jetons de continuation.
- Respect des nouvelles tentatives intégrées au SDK au lieu de boucles de nouvelles tentatives personnalisées par-dessus.
- Authentification **Microsoft Entra ID** (`DefaultAzureCredential` plus un rôle du plan de données) quand le déploiement le permet.
- Diagnostics journalisés pour les requêtes lentes ou en échec.

> **Conseil d'examen.** Dans une question de scénario, l'étape suivante correcte après une recommandation d'Agent Kit est presque toujours de la valider : même jeu de données, même état d'indexation, frais en RU et latence mesurés avant et après. L'appliquer directement en production, ou considérer la réponse comme une preuve, est le distracteur.

<!-- section: ai-app-acceleration | objectives: 1.5.2 -->
## Accélérer le développement d'applications IA

Pour une application IA (génération augmentée par récupération, agents, recherche sémantique), les recommandations du kit couvrent les choix Azure Cosmos DB faciles à rater au début :

- **Recherche vectorielle** : stratégie d'incorporation vectorielle et index vectoriel du conteneur, choix de l'index selon la charge, requêtes triées par distance vectorielle.
- **Recherche en texte intégral et hybride** : stratégie et index de texte intégral, combinaison du classement en texte intégral et vectoriel.
- **Modèles de conception** pour les flux agentiques, le traitement du flux de modification et les vues matérialisées (par exemple garder un conteneur d'incorporations synchronisé avec les documents sources grâce au flux de modification).
- Les mêmes règles de clé de partition, d'indexation et de SDK que pour toute charge, appliquées aux segments, aux incorporations, à l'historique de conversation et à la mémoire des agents.

Un flux de travail accéléré typique :

1. Installer le kit et connecter l'assistant au **serveur MCP Microsoft Learn**, pour qu'il récupère aussi la documentation officielle actuelle.
2. Décrire les données (formes de documents, dimensions des incorporations, volume prévu) et les modèles d'accès (filtres, similarité top-k, isolation par locataire).
3. Demander à l'assistant de proposer le modèle de données, la clé de partition, les stratégies vectorielle et de texte intégral et le code SDK, en demandant d'abord les informations manquantes.
4. Générer le code et l'infrastructure, puis tester : résultats des requêtes, frais en RU, latence.
5. Si l'agent lui-même doit lire des données à l'exécution, lui donner un outil de base de données **configuré séparément**.

**Azure Cosmos DB MCP Toolkit** (open source, `AzureCosmosDB/MCPToolKit`) est un tel outil : un serveur MCP, hébergé dans Azure Container Apps, qui permet à des agents (par exemple dans Microsoft Foundry, ou GitHub Copilot dans Visual Studio Code) d'interroger Azure Cosmos DB.

| Aspect | MCP Toolkit |
| --- | --- |
| Outils | `list_databases`, `list_collections`, `get_recent_documents`, `find_document_by_id`, `text_search`, `vector_search`, `get_approximate_schema` |
| Opérations | **Lecture seule** : requête et recherche |
| Authentification de l'appelant | Jetons Microsoft Entra ID (JWT) avec validation de l'audience et rôle `Mcp.Tool.Executor` |
| Accès à Azure Cosmos DB | Identité managée de l'application Container App avec un rôle de lecteur de données ; aucune information d'identification stockée |
| Recherche vectorielle | Exige un déploiement d'incorporation Azure OpenAI, des incorporations stockées et une stratégie d'indexation vectorielle |
| Intégration à Foundry | Ajouté à un projet Foundry comme outil personnalisé avec authentification Microsoft Entra |

| Exigence | Outil |
| --- | --- |
| L'assistant de codage doit suivre les bonnes pratiques Azure Cosmos DB en écrivant le code | Agent Kit |
| L'assistant doit citer la documentation Microsoft actuelle | Serveur MCP Microsoft Learn |
| Un agent Foundry doit rechercher des documents produits stockés dans un conteneur, en lecture seule, sans clés | Azure Cosmos DB MCP Toolkit |

> **Piège d'examen.** Agent Kit et MCP Toolkit répondent à des problèmes différents. Le kit améliore le code et la conception que votre assistant écrit ; il n'exécute jamais de requête. MCP Toolkit exécute des requêtes en lecture seule pour un agent ; il ne revoit pas votre conception.

<!-- section: key-points -->
## Points clés

- Agent Kit = collection d'Agent Skills (`cosmosdb-best-practices`) chargée à la demande par les assistants de codage IA compatibles ; recommandations sur la modélisation, les clés de partition, les requêtes, le SDK, la sécurité, le débit, la distribution mondiale, la recherche vectorielle, en texte intégral et hybride.
- Installation avec `npx skills add AzureCosmosDB/cosmosdb-agent-kit` (exige Node.js, npm, npx) ou un plug-in propre à l'hôte ; vérifier que `cosmosdb-best-practices` est détectée et chargée.
- Aucun abonnement Azure nécessaire et aucun accès aux données accordé ; ne jamais coller de secrets ; valider chaque recommandation en mesurant les résultats, les frais en RU et la latence.
- Fournir le contexte de la tâche : charge et croissance pour une clé de partition, requête plus stratégie d'indexation plus diagnostics pour une requête, version du SDK plus initialisation plus authentification pour du code.
- Pour les applications IA : le kit guide les conceptions vectorielles, en texte intégral et hybrides ; le serveur MCP Microsoft Learn fournit la documentation ; un serveur MCP de base de données (comme MCP Toolkit, en lecture seule) fournit l'accès aux données à l'exécution.
