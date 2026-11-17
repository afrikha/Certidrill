Dans Foundry Agent Service, un agent est une définition enregistrée et versionnée (un modèle, des instructions et des outils) qui décide seule de l'outil à appeler pour atteindre un objectif. Vous l'appelez par l'API Responses, conservez la conversation côté service, le connectez aux données et aux API, combinez plusieurs agents quand un seul ne suffit pas, placez des personnes dans la boucle pour les actions risquées et le surveillez en production. Les questions d'examen demandent quel outil ou quel modèle d'orchestration convient, comment compléter le code qui crée ou appelle un agent, et comment lire ses traces et ses résultats d'évaluation.

<!-- section: agent-design | objectives: 2.2.1 -->
## Rôles, objectifs, suivi des conversations et schémas d'outil

Les **instructions** définissent le rôle et l'objectif de l'agent. Rédigez-les comme un contrat : qui est l'agent, ce qu'il doit accomplir, ce qui est hors périmètre, quand utiliser chaque outil, que faire quand une information manque, et le format de sortie.

```text
from azure.ai.projects.models import PromptAgentDefinition

agent = project.agents.create_version(
    agent_name="returns-agent",
    definition=PromptAgentDefinition(
        model="gpt-4.1-mini",
        instructions=(
            "You are the returns assistant of Adatum Retail. Goal: resolve return requests. "
            "Use get_order before answering any question about an order. "
            "Never promise a refund above 500 USD: hand off to a human instead. "
            "Answer in at most five sentences."
        ),
        tools=[order_tool],
    ),
)
```

Types d'agents :

| Type | Ce que vous fournissez | Convient à |
| --- | --- | --- |
| Agent d'invite (prompt agent) | Modèle, instructions, outils ; Foundry l'exécute | La plupart des agents métier, sans infrastructure à gérer |
| Agent hébergé (hosted agent) | Votre code (Agent Framework, LangGraph, OpenAI Agents SDK ou autre) sous forme d'image conteneur ou de package .zip | Orchestration personnalisée, systèmes multi-agents, protocoles personnalisés |

Chaque appel à `create_version` crée une nouvelle **version** : vous pouvez comparer les versions et revenir en arrière.

Le **suivi des conversations** détermine où vit l'historique :

| Approche | Comment | Usage |
| --- | --- | --- |
| Objet conversation | `conversation = openai.conversations.create()`, puis `responses.create(conversation=conversation.id, ...)` | Échanges à plusieurs tours avec un agent ; le service stocke les éléments |
| Chaînage des réponses | `previous_response_id=` la dernière réponse | Uniquement là où le runtime le prend en charge ; certains runtimes d'agent le refusent |
| Sans état | L'application renvoie tout l'historique | Contrôle total, mais davantage de jetons d'entrée à chaque tour |
| Mémoire à long terme | Un magasin de mémoire, entre les sessions | Se souvenir des préférences d'une conversation à l'autre, pas au sein d'une même conversation |

**Schémas d'outil.** Un outil de fonction est décrit par un nom, une description qui indique au modèle quand l'utiliser, et des paramètres en JSON Schema :

```json
{
  "type": "function",
  "name": "get_order",
  "description": "Get the status, items and total of an order by its order number.",
  "parameters": {
    "type": "object",
    "properties": {
      "order_id": { "type": "string", "description": "Order number, for example SO-10023" }
    },
    "required": ["order_id"],
    "additionalProperties": false
  },
  "strict": true
}
```

`required` liste les arguments que le modèle doit fournir, `additionalProperties: false` interdit les autres, et `strict: true` impose le schéma là où le runtime le prend en charge. Des noms et des descriptions clairs sont ce qui fait choisir au modèle le bon outil.

> **Piège d'examen.** L'objet conversation conserve le contexte d'une conversation. Il ne se souvient pas de l'utilisateur la semaine suivante : c'est la mémoire à long terme. Et la mémoire n'est pas un moyen de donner à l'agent les documents de l'entreprise : c'est la récupération.

<!-- section: retrieval-functions-memory | objectives: 2.2.2 -->
## Des agents avec récupération, appel de fonction et mémoire

**Récupération.** Attachez un outil de connaissances : la recherche de fichiers (`FileSearchTool(vector_store_ids=[...])`, un magasin de vecteurs par agent), l'outil Azure AI Search sur un index existant, ou une base de connaissances Foundry IQ. Demandez des citations dans les instructions, sinon la réponse risque de ne pas en contenir.

**Appel de fonction** avec un agent. C'est l'application, et non le service, qui exécute la fonction :

```text
with project.get_openai_client(agent_name=agent.name) as openai:
    conversation = openai.conversations.create()
    response = openai.responses.create(conversation=conversation.id, input="Where is order SO-10023?")

    outputs = []
    for item in response.output:
        if item.type == "function_call" and item.name == "get_order":
            result = get_order(**json.loads(item.arguments))
            outputs.append(FunctionCallOutput(
                type="function_call_output",
                call_id=item.call_id,
                output=json.dumps(result),
            ))

    response = openai.responses.create(conversation=conversation.id, input=outputs)
    print(response.output_text)
```

Les exécutions expirent 10 minutes après leur création : renvoyez les sorties d'outil avant, et pour un traitement lent, renvoyez un statut et interrogez-le séparément. Le portail peut exécuter un agent doté d'outils de fonction, mais il n'exécute pas les fonctions et ne modifie pas leurs définitions ; utilisez le SDK ou l'API REST.

La **mémoire** (préversion) est un magasin à long terme managé, attaché à un agent avec l'outil de recherche de mémoire (recommandé) ou géré par les API du magasin de mémoire.

| Type de mémoire | Stocke |
| --- | --- |
| Profil utilisateur (user profile) | Préférences durables : langue, valeurs par défaut, besoins d'accessibilité |
| Résumé de conversation (chat summary) | Résumés condensés des conversations précédentes |
| Procédurale (procedural) | Routines réutilisables déduites des interactions précédentes |

Le service extrait, consolide (fusionne les doublons, résout les conflits) et récupère les mémoires. Les mémoires sont partitionnées par **étendue** (scope) ; avec l'outil de recherche de mémoire, l'étendue `{{$userId}}` la déduit de l'identité de l'appelant. La mémoire nécessite un déploiement de modèle de conversation et un déploiement de modèle d'embedding, accepte jusqu'à 100 étendues par magasin et 10 000 mémoires par étendue, et ne prend pas en charge l'intégration à un réseau virtuel. Comme c'est un LLM qui écrit les mémoires, elles peuvent porter une injection d'invite : validez le contenu avec Azure AI Content Safety.

> **Conseil d'examen.** « Se souvenir d'une session à l'autre que ce client préfère le français » relève de la mémoire. « Répondre à partir du catalogue produits » relève de la récupération. « Vérifier le niveau de stock en temps réel » relève d'un outil de fonction ou d'API.

<!-- section: agent-tools | objectives: 2.2.3 -->
## Intégrer des outils d'agent

| Outil | Apporte à l'agent | Qui exécute |
| --- | --- | --- |
| Appel de fonction | Votre propre code | Votre application |
| OpenAPI | Une API REST décrite par une spécification OpenAPI 3.0 ou 3.1 | Le service appelle l'API |
| Model Context Protocol (MCP) | Les outils d'un serveur MCP distant | Le serveur MCP |
| Azure Functions | Une application de fonction comme outil | Azure Functions |
| Azure AI Search, recherche de fichiers, Foundry IQ | Magasins de connaissances et recherche | Le service |
| Recherche web, Grounding with Bing | Informations publiques actuelles du web | Le service |
| Interpréteur de code (code interpreter) | Python dans un bac à sable, pour les calculs, les graphiques et le traitement de fichiers | Le service |
| Agent-to-agent (A2A) | Délégation à un autre agent | L'agent distant |
| Content Understanding Tool | Fichiers multimodaux transformés en Markdown ou en champs de schéma | Content Understanding |

Règles de l'outil OpenAPI : chaque opération doit avoir un `operationId` (lettres, `-` et `_`), les corps de requête sont en `application/json`, un seul schéma de clé API par outil. L'authentification passe par une connexion de projet : anonyme, clé API, jeton du porteur dans une connexion de clés personnalisées, ou identité managée du projet avec l'**audience** de l'API cible (par exemple `https://storage.azure.com`).

```text
weather_tool = OpenApiTool(
    openapi=OpenApiFunctionDefinition(
        name="get_weather",
        spec=openapi_spec,
        description="Retrieve weather information for a location.",
        auth=OpenApiAnonymousAuthDetails(),
    )
)
```

MCP : `server_label` (unique par agent), `server_url`, `project_connection_id` pour les informations d'identification, `allowed_tools`, `require_approval`. Les appels MCP non diffusés en continu expirent au bout de 100 secondes. Un serveur MCP privé exige la configuration d'agent standard avec votre propre réseau virtuel.

Outil Azure AI Search : cible un seul index par l'intermédiaire d'une connexion ; l'identité managée du compte Foundry a besoin de Search Index Data Contributor et de Search Service Contributor pour un accès sans clé. Les **toolboxes** regroupent des outils derrière un point de terminaison MCP managé unique, pour que plusieurs agents les réutilisent avec leurs informations d'identification.

| Exigence | Outil |
| --- | --- |
| Appeler une API REST interne dotée d'une spécification publiée, sans code client | OpenAPI |
| Exécuter une logique qui doit rester dans l'application (base de données locale, session utilisateur) | Appel de fonction |
| Réutiliser les outils d'un éditeur exposés par un serveur MCP | MCP |
| Calculer un agrégat à partir d'un fichier CSV chargé | Interpréteur de code |
| Lire des factures et des contrats de tout format sous forme de champs pour l'agent | Content Understanding |

> **Piège d'examen.** Avec l'appel de fonction, la réponse s'arrête sur un élément `function_call` jusqu'à ce que votre code renvoie la sortie. Avec OpenAPI ou MCP, le service effectue lui-même l'appel. « L'agent doit appeler l'API sans que l'application cliente exécute de code » exclut l'appel de fonction.

<!-- section: multi-agent | objectives: 2.2.4 -->
## Solutions multi-agents orchestrées

Utilisez plusieurs agents quand un seul aurait besoin de trop d'outils ou d'instructions contradictoires, quand les tâches demandent des modèles ou des autorisations différents, ou quand des étapes peuvent s'exécuter en parallèle. Sinon, un seul agent est plus simple et moins coûteux.

| Modèle (Agent Framework) | Comportement | Convient à |
| --- | --- | --- |
| Sequential | Les agents s'exécutent l'un après l'autre ; chaque sortie alimente le suivant | Rédiger, relire, peaufiner |
| Concurrent | Les agents s'exécutent en parallèle ; les résultats sont combinés | Analyses indépendantes, latence réduite |
| Handoff | Le contrôle passe à l'agent le plus adapté au contexte | Tri et routage vers des spécialistes |
| Group chat | Les agents collaborent dans une conversation partagée | Débat, critique, affinement |
| Magentic | Un agent gestionnaire planifie et appelle des spécialistes dynamiquement | Tâches ouvertes sans plan fixe |

Façons de les construire dans Foundry :

| Option | Usage |
| --- | --- |
| **Outil A2A** (A2A 1.0, en disponibilité générale) | Un agent Foundry appelle un agent distant et garde le contrôle de la conversation ; la cible doit avoir l'A2A entrant activé et l'appelant le rôle Foundry Agent Consumer sur son projet |
| Workflows **Microsoft Agent Framework**, déployés comme agent hébergé | Orchestration en code ou en YAML déclaratif avec les modèles ci-dessus ; la voie recommandée |
| **Foundry workflows** (préversion) | Concepteur visuel avec les modèles sequential, group chat et human in the loop ; retiré le 1er décembre 2026 (exportez le YAML) |

L'outil classique **connected agents** n'est pas disponible dans le nouveau Foundry Agent Service : migrez vers l'outil A2A ou vers les workflows.

> **Piège d'examen.** Le multi-agent n'est pas la réponse à « l'agent a besoin d'une source de données de plus » : ajoutez un outil. Choisissez le multi-agent pour séparer des responsabilités, des autorisations ou des modèles.

<!-- section: safeguards-approval | objectives: 2.2.5 -->
## Workflows autonomes et semi-autonomes avec mesures de protection

| Mode | Comportement de l'agent | Usage type |
| --- | --- | --- |
| Autonome | Appelle les outils et termine la tâche sans attendre | Consultations en lecture seule, actions réversibles à faible risque |
| Semi-autonome | Propose l'action, attend la décision d'une personne sur des étapes définies | Paiements, suppressions, messages externes, modifications d'enregistrements |

Mesures de protection à combiner :

- **Flux d'approbation sur les outils** : `require_approval` de MCP renvoie un `mcp_approval_request` ; votre application recueille la décision et envoie un `mcp_approval_response` dans la même conversation. Dans les workflows Agent Framework, un outil qui exige une approbation met le workflow en pause avec un `function_approval_request`.
- **Étapes de saisie humaine** : dans Agent Framework, un exécuteur appelle `ctx.request_info(...)` ; le workflow émet un événement `request_info`, attend, puis reprend dans la méthode `@response_handler` à l'arrivée de la réponse. Les **points de contrôle** (checkpoints) enregistrent les demandes en attente pour qu'un workflow puisse reprendre plus tard.
- **Outils de fonction** : votre code peut valider les arguments et refuser ou confirmer les effets de bord avant toute exécution.
- **Limites dans les instructions et les outils** : seuils de montant, `allowed_tools`, identités au moindre privilège.
- **Garde-fous** sur l'appel et la réponse d'outil, et Task Adherence.
- **Journalisation** : chaque approbation et chaque appel d'outil tracés.

Ordre d'un flux de remboursement semi-autonome :

1. L'agent rassemble les faits avec des outils en lecture seule (sans approbation).
2. Il propose l'appel de remboursement ; l'outil exige une approbation.
3. L'application montre le nom de l'outil et ses arguments à un approbateur.
4. L'approbateur accepte ou refuse ; la décision est renvoyée avec l'ID de la demande.
5. L'agent termine ou explique le refus ; la trace enregistre toute la séquence.

> **Piège d'examen.** Écrire « toujours demander avant de rembourser » dans les instructions est une demande au modèle, pas un contrôle. Une approbation humaine garantie vient de la configuration de l'outil ou du workflow, en dehors de la décision du modèle.

<!-- section: monitor-agents | objectives: 2.2.6 -->
## Surveiller, évaluer et déboguer les agents

**Surveillance.** Une fois Application Insights connecté, l'onglet **Monitor** de l'agent (préversion) affiche l'utilisation des jetons, la latence, le taux de réussite des exécutions, les scores d'évaluation et les résultats du red teaming, et des alertes peuvent y être définies. Repères de Learn : une latence supérieure à 10 secondes suggère une limitation (throttling) ou des outils lents ; un taux de réussite inférieur à 95 % mérite une investigation.

L'**évaluation continue** note un échantillon des réponses de production avec les évaluateurs choisis ; l'**évaluation planifiée** s'exécute selon un calendrier sur des données de test ou des traces pour détecter la dérive :

```text
rule = project.evaluation_rules.create_or_update(
    id="returns-agent-safety",
    evaluation_rule=EvaluationRule(
        display_name="Returns agent safety",
        action=ContinuousEvaluationRuleAction(eval_id=eval_object.id, max_hourly_runs=100),
        event_type=EvaluationRuleEventType.RESPONSE_COMPLETED,
        filter=EvaluationRuleFilter(agent_name="returns-agent"),
        enabled=True,
    ),
)
```

`max_hourly_runs` (100 par défaut) plafonne les exécutions d'évaluation par heure ; celles qui dépassent sont ignorées. L'identité managée du projet a besoin du rôle Foundry User pour l'évaluation continue.

**Évaluateurs d'agent** :

| Question | Évaluateur |
| --- | --- |
| L'agent a-t-il compris ce que voulait l'utilisateur ? | Intent Resolution |
| A-t-il respecté ses instructions et ses contraintes ? | Task Adherence |
| A-t-il terminé la tâche avec un résultat exploitable ? | Task Completion |
| Les bons outils, les bons paramètres, sans appels redondants ? | Tool Call Accuracy |
| Les outils nécessaires choisis, sans outils inutiles ? | Tool Selection |
| Des arguments valides selon le schéma et ancrés ? | Tool Input Accuracy |
| Les résultats d'outil réellement utilisés dans la réponse ? | Tool Output Utilization |
| Des appels d'outil exécutés sans erreur technique ? | Tool Call Success |
| La séquence d'étapes attendue ? | Task Navigation Efficiency |

Les évaluateurs d'outil et de tâche lisent la sortie structurée de l'agent (`{{sample.output_items}}`), qui contient les appels d'outil. Learn conseille d'éviter les évaluateurs d'outil quand la conversation appelle Azure AI Search, Grounding with Bing, l'interpréteur de code ou la recherche web.

L'**analyse des erreurs** lit la trace d'une exécution en échec : l'étendue `execute_tool` montre les arguments et le résultat de chaque appel, et les durées montrent d'où vient la latence.

| Symptôme dans la trace | Cause probable | Correction |
| --- | --- | --- |
| Aucun appel d'outil, réponse inventée | Description d'outil floue, ou instructions qui n'exigent pas l'outil | Améliorer la description ou les instructions |
| Outil appelé avec un argument au mauvais format | Schéma trop faible | Ajouter des descriptions, `required`, `strict` |
| Erreur d'outil, puis l'agent abandonne | Échec de l'API ou rôle manquant pour l'identité | Corriger les autorisations, ajouter une nouvelle tentative |
| Résultat d'outil correct ignoré dans la réponse | Tool Output Utilization faible | Revoir les instructions |

Regroupez ensuite les échecs, changez un seul élément, réévaluez et comparez les versions.

> **Conseil d'examen.** « Quelle étape a ralenti l'agent ? » est une question de trace. « À quelle fréquence l'agent choisit-il le mauvais outil sur 500 conversations ? » est une question d'évaluation.

<!-- section: key-points -->
## Points clés

- Agent d'invite = modèle + instructions + outils, créé avec `agents.create_version` ; agent hébergé = votre propre code, exécuté par Foundry.
- Les conversations conservent l'historique d'une session ; la mémoire (préversion) conserve profil utilisateur, résumés de conversation et mémoires procédurales d'une session à l'autre.
- Appel de fonction : votre application exécute la fonction ; OpenAPI et MCP : le service les appelle. Les exécutions expirent au bout de 10 minutes.
- OpenAPI exige `operationId` ; les appels MCP expirent à 100 secondes ; l'outil Azure AI Search cible un seul index.
- Multi-agent : outil A2A pour la délégation, Agent Framework pour les modèles d'orchestration ; le concepteur Foundry workflows est retiré le 1er décembre 2026 ; connected agents n'est pas disponible.
- Une approbation humaine garantie vient de la configuration de l'outil ou du workflow, pas des instructions.
- Onglet Monitor : jetons, latence, taux de réussite, évaluations. Règle d'évaluation continue : `max_hourly_runs` à 100.
- Évaluateurs d'agent : Intent Resolution, Task Adherence, Task Completion, Tool Call Accuracy et les autres évaluateurs d'outil.
