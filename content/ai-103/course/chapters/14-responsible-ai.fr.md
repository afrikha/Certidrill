Dans Microsoft Foundry, l'IA responsable est un ensemble de contrôles concrets, pas un principe à citer. Les garde-fous (guardrails) bloquent les entrées et les sorties nuisibles à l'exécution, les évaluateurs notent les sorties avant et après la mise en production, les traces et les métadonnées de provenance laissent une piste d'audit, et les paramètres d'approbation et d'accès aux outils maintiennent un agent dans les limites que vous fixez. Les questions d'examen décrivent un risque et demandent quel mécanisme le traite, ou montrent une configuration et demandent ce qu'elle bloque.

<!-- section: guardrails | objectives: 1.4.1 -->
## Garde-fous et filtrage du contenu

Dans le portail Foundry actuel, un **garde-fou** (guardrail) est une collection nommée de **contrôles**. Chaque contrôle définit trois éléments : le **risque** à détecter, les **points d'intervention** à analyser et l'**action** à effectuer. Les risques sont détectés par des modèles de classification d'Azure AI Content Safety. Les garde-fous s'appliquent aux modèles Foundry vendus par Azure (sauf les modèles de transcription audio) et aux agents créés dans Foundry Agent Service.

| Risque | Ce qu'il détecte | Modèles | Agents (préversion) |
| --- | --- | --- | --- |
| Hate, Sexual, Violence, Self-harm | Contenu nuisible, classé par gravité | Oui | Oui |
| User prompt attacks | Un utilisateur tente de modifier les règles système, de remplacer la persona ou de contourner la sécurité (jailbreak) | Oui | Oui |
| Indirect attacks | Instructions cachées dans des documents, des e-mails ou des résultats d'outils que le modèle traite | Oui | Oui |
| Spotlighting (préversion) | Aide le modèle à distinguer une entrée non fiable des instructions | Oui | Non |
| Protected material for text / for code | Texte protégé connu (paroles, articles) ; code issu de dépôts publics, avec citation et licence | Oui | Oui |
| Groundedness (préversion) | Sortie non étayée par les sources fournies | Oui | Non |
| Personally identifiable information (préversion) | Données personnelles dans le contenu | Oui | Oui |
| Task Adherence (préversion) | Comportement de l'agent qui s'écarte de la tâche assignée | Oui | Oui |

Ensemble, les attaques par invite utilisateur et les attaques indirectes forment les **Prompt Shields**. La détection des attaques indirectes porte sur le contenu transmis comme document : l'application doit donc intégrer le contenu récupéré au format de document décrit dans la documentation et garder ses propres instructions dans le message système.

| Point d'intervention | Analyse | Modèles | Agents (préversion) |
| --- | --- | --- | --- |
| Entrée utilisateur (User input) | L'invite envoyée au modèle ou à l'agent | Oui | Oui |
| Appel d'outil (Tool call, préversion) | L'action et les données que l'agent propose d'envoyer à un outil | Non | Oui |
| Réponse d'outil (Tool response, préversion) | Le contenu qu'un outil renvoie à l'agent | Non | Oui |
| Sortie (Output) | La complétion finale renvoyée à l'utilisateur | Oui | Oui |

Les deux actions sont **Annotate** (modèles uniquement : le résultat est étiqueté, rien n'est bloqué) et **Annotate and block**. Les quatre catégories de préjudice utilisent un niveau de blocage :

| Niveau de blocage | Bloque | Remarque |
| --- | --- | --- |
| Off | Rien (des annotations peuvent encore être renvoyées) | Pour les sorties, uniquement les clients approuvés pour les garde-fous modifiés |
| Low | La gravité élevée seulement | Le moins restrictif |
| Medium | Moyenne et élevée | Niveau du garde-fou par défaut |
| High | Faible, moyenne et élevée | Le plus restrictif, davantage de faux positifs |

Valeurs par défaut et héritage :

- Les déploiements de modèles reçoivent le garde-fou **Microsoft.DefaultV2** : les quatre catégories de préjudice bloquées au niveau moyen sur les invites et les complétions, la détection des attaques par invite utilisateur sur les invites, le contenu protégé texte et code sur les complétions. La détection des attaques indirectes est désactivée par défaut.
- Un agent utilise le garde-fou qui lui est attribué ; sans garde-fou, il hérite de celui de son déploiement de modèle. Le garde-fou d'un agent **remplace** entièrement celui du modèle : s'il ne contient aucun contrôle sur l'appel ou la réponse d'outil, ces points ne sont pas analysés.
- Un même garde-fou peut être attribué à de nombreux modèles et agents. Les garde-fous par défaut ne sont pas modifiables ; créez-en un personnalisé (**Build > Guardrails > Create Guardrail** : ajouter les contrôles, attribuer des agents et des modèles, vérifier et nommer). Il faut pour cela le rôle Foundry Account Owner ou supérieur.
- Derrière le portail, un garde-fou est une stratégie RAI (RAI policy), attribuée à un déploiement par sa propriété `raiPolicyName`. Une requête peut désigner un autre garde-fou avec l'en-tête `x-policy-id`.
- Des **listes de blocage** (une liste personnalisée de termes, ou la liste intégrée de grossièretés) peuvent être ajoutées au filtrage des entrées, des sorties ou des deux.

Ce que voit l'application quand un appel est bloqué :

| Situation | Résultat |
| --- | --- |
| Invite bloquée | HTTP 400, code d'erreur `content_filter` |
| Complétion bloquée | HTTP 200, `finish_reason` à `content_filter` pour ce choix |
| Annotations | Par catégorie : `filtered` et `severity` (safe, low, medium, high) ; Prompt Shields et contenu protégé : `detected` et `filtered` |
| Service de filtrage indisponible | L'annotation contient un objet d'erreur : le contenu n'a pas été vérifié |

> **Piège d'examen.** Un garde-fou agit à l'exécution, sur chaque requête : il bloque ou annote. Un évaluateur mesure un lot de sorties et produit des scores : il ne bloque rien. « Empêcher l'agent de renvoyer du contenu violent » relève d'un garde-fou ; « mesurer la fréquence des réponses violentes avant la mise en production » relève d'un évaluateur.

> **Conseil d'examen.** « Des instructions malveillantes cachées dans un document chargé ou dans une page web renvoyée par un outil » est une attaque indirecte. Pour un agent, analysez le point d'intervention de réponse d'outil ; « un utilisateur tape un jailbreak » est une attaque par invite utilisateur, sur l'entrée utilisateur.

<!-- section: evaluation-instrumentation | objectives: 1.4.2 -->
## Évaluateurs, évaluations de sécurité et explications

Un **évaluateur** note une caractéristique d'une sortie. Certains sont des calculs déterministes ; les évaluateurs **assistés par IA** utilisent un modèle juge, désigné par un déploiement de modèle dans la configuration de l'évaluateur.

| Catégorie | Évaluateurs intégrés | Modèle juge |
| --- | --- | --- |
| Usage général | Coherence, Fluency | Oui |
| Similarité textuelle | Similarity, F1 Score, BLEU, GLEU, ROUGE, METEOR (nécessitent une vérité terrain) | Similarity uniquement |
| RAG | Retrieval, Document Retrieval, Groundedness, Groundedness Pro, Relevance, Response Completeness | Oui, sauf Document Retrieval et Groundedness Pro |
| Risque et sécurité | Hate and Unfairness, Sexual, Violence, Self-Harm, Protected Materials, Indirect Attack, Code Vulnerability, Ungrounded Attributes, Prohibited Actions, Sensitive Data Leakage | Non : hébergés par le service d'évaluation Foundry |
| Agent | Task Adherence, Task Completion, Intent Resolution, Tool Call Accuracy, Tool Selection, Tool Input Accuracy, Tool Output Utilization, Tool Call Success, entre autres | Oui pour la plupart |

Les évaluateurs de sécurité n'ont pas besoin de `deployment_name`. Les quatre évaluateurs de contenu renvoient un **score de gravité de 0 à 7** (très faible 0-1, faible 2-3, moyen 4-5, élevé 6-7) avec un seuil par défaut de 3 : un score inférieur ou égal au seuil réussit. Contenu protégé, vulnérabilité du code, attaque indirecte, actions interdites et fuite de données sensibles renvoient réussite ou échec. Le rapport donne aussi un **taux de défauts** : le pourcentage de réponses au contenu indésirable. Prohibited Actions et Sensitive Data Leakage (préversion) s'appliquent uniquement aux cibles de type agent.

**Outils d'explication.** Les évaluateurs assistés par IA et de sécurité renvoient une raison (`reason`) à côté du score : un relecteur voit pourquoi une réponse a échoué.

```json
{
  "name": "Violence",
  "metric": "violence",
  "score": 0,
  "label": "pass",
  "reason": "The response refuses to provide harmful content.",
  "threshold": 3,
  "passed": true
}
```

Les évaluateurs sont déclarés comme critères de test et reliés aux données par des mappages (`{{item.x}}` pour un champ du jeu de données, `{{sample.output_text}}` pour la réponse générée pendant l'exécution) :

```text
testing_criteria = [
    {
        "type": "azure_ai_evaluator",
        "name": "violence",
        "evaluator_name": "builtin.violence",
        "data_mapping": {"query": "{{item.query}}", "response": "{{sample.output_text}}"},
    },
    {
        "type": "azure_ai_evaluator",
        "name": "groundedness",
        "evaluator_name": "builtin.groundedness",
        "initialization_parameters": {"deployment_name": "gpt-4.1-mini"},
        "data_mapping": {"context": "{{item.context}}", "response": "{{sample.output_text}}"},
    },
]
```

L'**AI Red Teaming Agent** va plus loin : il génère des invites adverses avec le framework open source PyRIT de Microsoft (stratégies d'attaque comme Base64, Flip, CharSwap, ROT13, Crescendo), les envoie au modèle ou à l'agent, note les réponses avec les évaluateurs de sécurité et calcule un **taux de réussite des attaques (Attack Success Rate, ASR)**, le pourcentage d'attaques réussies. Les catégories de risque propres aux agents (Prohibited Actions, Sensitive Data Leakage, Task Adherence) s'exécutent uniquement dans le cloud. Seuls les scénarios texte sont pris en charge.

| Exigence | Solution |
| --- | --- |
| Noter un jeu de données de test pour le contenu nuisible avant la mise en production | Évaluateurs de risque et de sécurité |
| Attaquer activement l'application pour trouver ses faiblesses face aux jailbreaks | AI Red Teaming Agent |
| Comprendre pourquoi une réponse a obtenu un score faible | La raison (`reason`) de l'évaluateur |
| Contrôler la qualité du trafic de production dans le temps | Évaluation continue sur un échantillon du trafic |

> **Piège d'examen.** Le red teaming et les évaluateurs de sécurité ne remplacent pas les garde-fous. Le red teaming trouve les faiblesses avant la mise en production ; les garde-fous imposent des limites à chaque requête après la mise en production.

<!-- section: auditing | objectives: 1.4.3 -->
## Audit : traces, provenance et approbations

**Journalisation des traces.** Le suivi (tracing) de Foundry repose sur OpenTelemetry et stocke les traces dans la ressource **Application Insights** connectée au projet. Une trace enregistre chaque étape d'une exécution dans l'ordre : entrée utilisateur, appels au modèle, appels d'outils avec leurs arguments et leurs résultats, nombres de jetons et durées. Les étendues (spans) suivent les conventions sémantiques GenAI (`invoke_agent`, `execute_tool`, attributs comme `gen_ai.tool.call.arguments`). Le suivi côté serveur des agents d'invite ne demande aucun code une fois Application Insights connecté (**Agents > Traces > Connect**). Lire les traces exige **Log Analytics Reader** sur la ressource, plus Privileged Monitoring Data Reader si les tables sont protégées.

Instrumentation côté client d'une application :

```text
import os
os.environ["AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING"] = "true"
# Records message content: development only, unless compliance allows it
os.environ["OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"] = "true"

from azure.monitor.opentelemetry import configure_azure_monitor

connection_string = project.telemetry.get_application_insights_connection_string()
configure_azure_monitor(connection_string=connection_string)
```

Les traces peuvent contenir des invites, des sorties et des arguments d'outils. Traitez-les comme des journaux de production : restreignez l'accès, appliquez une rétention, ne placez jamais de secrets ni de jetons d'accès dans les invites ou les attributs d'étendue, et masquez les données personnelles avant qu'elles n'atteignent la télémétrie.

Les **métadonnées de provenance** indiquent d'où vient le contenu :

- **Content Credentials.** Les images générées par les séries DALL-E et GPT-image-1 dans Azure OpenAI portent un manifeste C2PA signé cryptographiquement : `description` « AI Generated Image », `softwareAgent` (« Azure OpenAI DALL-E » ou « Azure OpenAI ImageGen ») et `when` (date de création). Ils sont appliqués automatiquement. Chacun peut les vérifier avec le site Content Credentials Verify ou les outils open source de la Content Authenticity Initiative.
- **Citations.** Les outils de récupération renvoient des annotations de citation qui relient chaque réponse à son document source ; le contenu protégé pour le code renvoie le dépôt source et sa licence.
- **Versions.** Les versions d'agent sont des instantanés : une trace peut être rattachée aux instructions et aux outils exacts qui l'ont produite.

**Workflows d'approbation.** Une action à fort impact attend la décision d'une personne, et la demande comme la décision sont journalisées. Pour les outils MCP de Foundry Agent Service, `require_approval` fait émettre à l'agent un élément `mcp_approval_request` au lieu d'appeler l'outil ; l'application montre le nom de l'outil et ses arguments à une personne et renvoie un `mcp_approval_response` (voir [Supervision des agents et accès aux outils](#agent-governance)).

> **Conseil d'examen.** « Prouver plus tard quel outil l'agent a appelé, avec quels arguments, et ce qu'il a renvoyé » relève du suivi dans Application Insights. « Montrer qu'une image a été générée par IA » relève des Content Credentials. « Un responsable doit confirmer avant que l'agent appelle l'API de paiement » relève d'un workflow d'approbation.

<!-- section: agent-governance | objectives: 1.4.4 -->
## Supervision des agents et accès aux outils

Un agent décide seul de l'outil à appeler. La gouvernance maintient cette décision dans des limites à trois niveaux : ce que l'agent peut appeler, quand une personne doit donner son accord, et ce que l'identité de l'agent peut atteindre.

**Modes de supervision** des outils MCP (`require_approval`) :

| Valeur | Comportement |
| --- | --- |
| `"always"` (par défaut) | Chaque appel à ce serveur attend une approbation |
| `"never"` | Les appels s'exécutent sans approbation |
| `{"never": ["tool1"]}` | Pas d'approbation pour les outils listés ; approbation pour les autres |
| `{"always": ["tool1"]}` | Approbation uniquement pour les outils listés |

```text
tool = MCPTool(
    server_label="contoso-erp",
    server_url="https://erp.contoso.com/mcp",
    allowed_tools=["get_order", "update_order"],
    require_approval={"always": ["update_order"]},
    project_connection_id="erp-connection",
)
```

La réponse d'approbation est renvoyée dans la **même conversation**, avec `approval_request_id` égal à l'`id` de l'élément de demande et `approve` à `True` ou `False`.

**Contraintes :**

- `allowed_tools` limite l'agent aux outils listés d'un serveur MCP. Absent ou vide, **tous** les outils du serveur sont disponibles.
- Les **instructions** énoncent la tâche et ses limites ; Task Adherence (un risque de garde-fou et un évaluateur) vérifie que l'agent les respecte.
- Les contrôles de garde-fou sur l'**appel d'outil** et la **réponse d'outil** analysent ce que l'agent envoie aux outils et ce qu'il en reçoit.
- Avec l'appel de fonction, c'est l'application qui exécute la fonction : elle peut refuser ou demander une confirmation avant tout effet de bord.
- Le catalogue d'outils précise que les serveurs MCP et A2A tiers ne sont pas vérifiés par Microsoft : traitez leurs descriptions et leurs résultats comme des entrées non fiables, susceptibles de porter une injection d'invite.

Les **contrôles d'accès aux outils** déterminent ce qu'un appel d'outil peut réellement faire :

| Mécanisme | Rôle |
| --- | --- |
| Connexion de projet | Stocke les informations d'identification de l'outil (clé, OAuth, identité managée) ; aucun secret dans le code ni dans les invites |
| Identité d'agent | Une identité Microsoft Entra par agent (blueprint plus identité d'instance) ; elle démarre **sans** aucune autorisation |
| Identité managée du projet | Utilisée par les connexions configurées pour l'authentification par identité managée du projet |
| Azure RBAC ou rôles du plan de données | Accordés à cette identité sur la cible, à l'étendue la plus restreinte |
| Transmission on-behalf-of (OBO) | L'outil s'exécute avec les autorisations de l'utilisateur connecté, quand l'outil le prend en charge |

> **Piège d'examen.** `require_approval` vaut `"always"` par défaut, et un `allowed_tools` vide signifie tous les outils, pas aucun. Pour laisser un agent lire librement mais confirmer les écritures, listez les outils dans `allowed_tools` et exigez l'approbation uniquement pour l'outil d'écriture.

> **Piège d'examen.** Une nouvelle identité d'agent n'a aucune attribution de rôle, et les attributions existantes ne suivent pas lors de la migration d'un agent hérité. « L'agent reçoit une erreur 403 du compte de stockage » signifie qu'il manque un rôle sur la cible pour l'identité qu'utilise la connexion.

<!-- section: key-points -->
## Points clés

- Garde-fou = contrôles (risque + points d'intervention + action). Microsoft.DefaultV2 par défaut : quatre préjudices au niveau moyen, détection des attaques par invite utilisateur, contenu protégé ; attaques indirectes désactivées.
- Les agents ajoutent les points d'intervention appel d'outil et réponse d'outil ; le garde-fou d'un agent remplace entièrement celui du modèle.
- Invite bloquée : HTTP 400 `content_filter`. Complétion bloquée : `finish_reason` `content_filter`.
- Les évaluateurs notent, les garde-fous bloquent. Évaluateurs de sécurité : 0 à 7, seuil 3, sans déploiement ; la raison (`reason`) explique le score.
- AI Red Teaming Agent : attaques PyRIT, taux de réussite des attaques (ASR).
- Audit : traces OpenTelemetry dans Application Insights (Log Analytics Reader), Content Credentials (C2PA) sur les images générées, approbations journalisées.
- MCP : `require_approval` (par défaut `"always"`), `allowed_tools` (vide = tous). L'identité d'agent démarre sans autorisation : accordez le moindre privilège sur la cible.
