Construire une solution d'IA générative dans Microsoft Foundry suit un seul chemin : écrire des invites, déployer un modèle et le tester dans le terrain de jeu, l'appeler depuis une petite application cliente, puis l'empaqueter sous forme d'agent et appeler l'agent. L'examen demande quelle action du portail intervient à quel moment, et ce que fait chaque ligne d'un court client Python.

<!-- section: prompts | objectives: 2.1.1 -->
## Invites système et utilisateur

| | Invite système | Invite utilisateur |
| --- | --- | --- |
| But | Fixe le comportement du modèle : rôle, ton, périmètre, format, contraintes | Demande une réponse : une question ou une instruction |
| Rédigée par | Le développeur de l'application, une fois | L'utilisateur final, ou l'application en son nom, à chaque tour |
| Dans le terrain de jeu Foundry | La zone **Instructions** | Le message saisi dans le volet de conversation |
| Dans le code | Le message de rôle `system` | Le message de rôle `user` |

```text
System: You are a support assistant for Contoso Bikes. Answer only questions about orders and repairs. Reply in three bullet points at most. If you don't know, say so.
User: My order arrived with a bent wheel. What are my options?
```

Ce qui rend les invites efficaces :

- **Une invite système complète** donne un rôle, limite le périmètre (« ne répondez qu'aux questions sur... »), fixe le format et le ton, et donne au modèle une porte de sortie (« si vous ne savez pas, dites-le ») au lieu de le laisser inventer une réponse.
- **Une invite utilisateur claire et précise** énonce la tâche explicitement, ajoute du contexte (sujet, public), montre un exemple du résultat attendu quand le style compte, et demande une structure comme des puces ou un tableau.
- **L'historique de la conversation** est envoyé avec chaque nouvelle invite : une question de suivi est donc comprise dans son contexte. Démarrer une nouvelle conversation (**New chat** dans le terrain de jeu) l'efface.

> **Piège d'examen.** Les règles qui doivent tenir pendant toute la conversation, comme le rôle, le refus des questions hors sujet ou le format de sortie, vont dans l'invite système, pas dans chaque invite utilisateur. Le modèle répond à l'invite utilisateur en suivant l'invite système.

<!-- section: deploy-and-playground | objectives: 2.1.2 -->
## Déployer un modèle et l'utiliser dans le portail Foundry

Une **ressource Foundry** est la ressource Azure qui héberge les modèles et les services. Un **projet Foundry** est un espace de travail à l'intérieur, où vous déployez des modèles et créez des agents. Une ressource peut contenir de nombreux projets.

1. Connectez-vous au portail Foundry à l'adresse `https://ai.azure.com` et créez un projet. Vous nommez la ressource Foundry et choisissez l'abonnement, le groupe de ressources et la région.
2. Dans la page **Discover**, ouvrez le catalogue de modèles (**Models**), sélectionnez un modèle et lisez sa page.
3. Sélectionnez **Deploy**. Avec les paramètres par défaut, le déploiement prend le nom du modèle.
4. Le terrain de jeu de modèles s'ouvre. Écrivez l'invite système dans **Instructions**, saisissez les invites utilisateur dans le volet de conversation, et réglez les paramètres comme la température et le nombre maximal de jetons de sortie.
5. Ouvrez la vue du code : le portail affiche un code qui appelle le déploiement avec les mêmes instructions et paramètres, comme point de départ de votre client.

La page **Home** du projet affiche le point de terminaison du projet, la clé d'API et le point de terminaison Azure OpenAI.

<!-- section: chat-client | objectives: 2.1.3 -->
## Un client de conversation léger avec le SDK Foundry

Un client léger est une petite application, souvent un seul fichier Python, qui recueille la saisie de l'utilisateur, appelle un modèle distant et affiche le résultat. Le modèle s'exécute dans Foundry, pas dans le client. Le SDK Foundry (package `azure-ai-projects`) fournit un client de projet, `AIProjectClient`, et à partir de lui un client compatible OpenAI qui appelle les modèles via l'**API Responses**.

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="https://<resource>.services.ai.azure.com/api/projects/<project>",
    credential=DefaultAzureCredential(),
)
openai_client = project.get_openai_client()

response = openai_client.responses.create(
    model="gpt-4.1-mini",
    input=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Summarize our release notes in 3 bullets."},
    ],
    temperature=0.7,
    max_output_tokens=300,
)
print(response.output_text)
```

| Élément | Rôle |
| --- | --- |
| `DefaultAzureCredential()` | Authentifie avec Microsoft Entra ID, par exemple après `az login` ; aucune clé dans le code |
| `endpoint` | Le point de terminaison du projet, copié depuis la page **Home** du projet |
| `get_openai_client()` | Renvoie le client compatible OpenAI |
| `responses.create(...)` | Envoie l'invite au modèle via l'API Responses |
| `model` | Le **nom du déploiement**, pas forcément le nom du modèle |
| `input` | L'invite : une simple chaîne, ou une liste de messages avec des rôles |
| `response.output_text` | Le texte généré par le modèle |

Vous pouvez aussi créer directement le client `OpenAI` du package `openai`, avec `base_url` égal au point de terminaison Azure OpenAI (`https://<resource>.openai.azure.com/openai/v1/`) et `api_key` égal à la clé. L'appel à `responses.create` est le même.

<!-- section: single-agent | objectives: 2.1.4 -->
## Créer et tester un agent dans le portail

Un agent est un composant réutilisable qui regroupe trois choses : un **modèle**, des **instructions** (l'invite système) et des **outils**.

| Ajout | Ce qu'il apporte à l'agent | Exemples |
| --- | --- | --- |
| **Outils** | Des actions : le modèle décide quand les appeler | Recherche web, interpréteur de code, fonctions personnalisées, serveurs MCP |
| **Connaissances** | Du contexte : du contenu récupéré pour ancrer les réponses | Fichiers chargés (recherche de fichiers), magasins de documents |

1. Déployez un modèle et ouvrez-le dans le terrain de jeu.
2. Écrivez les **Instructions**.
3. Sous **Tools**, ajoutez un outil comme **Web search**.
4. Ajoutez des connaissances : chargez un fichier ; le portail l'indexe et attache l'index à l'agent.
5. Sélectionnez **Save as agent** et donnez un nom à l'agent.
6. Testez-le dans le terrain de jeu des agents : vérifiez qu'il suit ses instructions, qu'il appelle ses outils quand c'est pertinent et qu'il cite sa source de connaissances.

L'agent enregistré garde ensemble son modèle, ses instructions et ses outils : toute application qui l'appelle obtient donc le même comportement.

> **Piège d'examen.** Les outils sont des actions ; les connaissances sont du contexte. « L'agent doit répondre à partir des manuels produits de l'entreprise » appelle des connaissances. « L'agent doit chercher sur le web ou exécuter du code » appelle un outil. Modifier seulement les instructions ne donne à l'agent ni l'un ni l'autre.

<!-- section: agent-client | objectives: 2.1.5 -->
## Un client léger pour un agent

Le client se connecte au projet avec le même `AIProjectClient`, récupère l'agent par son nom et le référence dans la requête. L'exemple de code est disponible dans la vue du code du terrain de jeu des agents.

```text
agent = project.agents.get(agent_name="support-agent")
openai_client = project.get_openai_client()

response = openai_client.responses.create(
    input=[{"role": "user", "content": "Tell me what you can help with."}],
    extra_body={"agent": {"name": agent.name, "type": "agent_reference"}},
)
print(response.output_text)
```

| | Client de conversation | Client d'un agent |
| --- | --- | --- |
| Cible | Un déploiement de modèle : `model="..."` | Un agent : `extra_body` avec un `agent_reference` |
| Instructions | Envoyées par le client dans la requête | Stockées dans l'agent |
| Outils et connaissances | Aucun, sauf si le client en ajoute | Ceux qui sont configurés dans l'agent |

> **Conseil d'examen.** Dans une question de code, cherchez ce que la requête nomme. Un argument `model` avec un nom de déploiement désigne un client de conversation. Un nom d'agent et `agent_reference` désignent le client d'un agent ; il ne répète pas l'invite système, car l'agent la détient déjà.

<!-- section: key-points -->
## Points clés

- Invite système : rôle et règles pour toute la conversation (**Instructions**). Invite utilisateur : une demande.
- Chemin dans le portail : créer un projet, choisir un modèle dans le catalogue, **Deploy**, tester dans le terrain de jeu, afficher le code.
- Client de conversation : `AIProjectClient` avec le point de terminaison du projet, `get_openai_client()`, `responses.create(model=..., input=...)`, `output_text`.
- Agent : modèle, instructions et outils ; les connaissances ancrent les réponses. **Save as agent**, puis test dans le terrain de jeu des agents.
- Client d'un agent : `agents.get(agent_name=...)`, puis `responses.create` avec un `agent_reference`.
