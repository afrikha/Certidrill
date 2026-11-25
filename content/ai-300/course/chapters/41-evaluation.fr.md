L'évaluation mesure si une application ou un agent d'IA générative donne des réponses correctes, ancrées, pertinentes, bien rédigées et sûres, avant la mise en production et après chaque modification. Dans Microsoft Foundry, vous préparez un jeu de données de test, mappez ses champs aux évaluateurs, exécutez les évaluateurs intégrés de qualité et de sécurité (plus les vôtres) et automatisez l'exécution dans un pipeline qui bloque une régression. Les questions d'examen demandent quel évaluateur mesure un problème donné, de quels champs il a besoin, comment lire son score et comment intégrer l'évaluation dans un workflow.

<!-- section: test-datasets | objectives: 4.1.1 -->
## Jeux de données de test et mappage des données

Un jeu de données d'évaluation est un fichier JSONL ou CSV (ou des éléments en ligne) dont les champs alimentent les évaluateurs. Trois formes existent :

| Jeu de données | Contient | Utilisation |
| --- | --- | --- |
| Requête et réponse | `query`, `response` et, en option, `context`, `ground_truth` | Évaluer des sorties déjà produites (journaux, exécution précédente) |
| Requête seule, avec une cible | `query` (et `ground_truth` si nécessaire) ; le modèle ou l'agent génère la réponse pendant l'exécution | Évaluer directement un déploiement de modèle ou une version d'agent |
| Messages | Un tableau `messages` au format de message OpenAI, éventuellement avec des appels d'outils | Conversations multitours ; obligatoire pour l'évaluation au niveau de la conversation. Pour une cible (modèle ou agent), le tableau se termine par un message `user` |

```json
{"query": "What is the return window?", "context": "Returns are accepted within 30 days of delivery.", "response": "You can return items within 30 days of delivery.", "ground_truth": "30 days after delivery."}
```

Champs exigés par les évaluateurs courants :

| Évaluateur | Champs obligatoires |
| --- | --- |
| Cohérence (Coherence) | `query`, `response` (ou `messages`) |
| Fluidité (Fluency) | `response` (ou `messages`) |
| Ancrage (Groundedness) | `response` et `context` (`context` est facultatif mais recommandé, et nécessaire quand `query` et `response` sont des chaînes ; une réponse d'agent avec des appels d'outils peut le fournir) ; `query` facultatif mais améliore la précision |
| Pertinence (Relevance) | `query`, `response` |
| Récupération (Retrieval) | `query`, `context` |
| Exhaustivité de la réponse (Response completeness) | `response`, `ground_truth` |
| F1, BLEU, ROUGE, GLEU, METEOR, similarité | `response`, `ground_truth` |
| Sécurité du contenu (violence, contenu sexuel, automutilation, haine et injustice) | `query`, `response` (ou `messages`) |

Le **mappage des données** relie les champs du jeu de données aux entrées des évaluateurs. Dans les évaluations cloud (SDK Foundry et portail) :

| Expression | Désigne |
| --- | --- |
| `{{item.query}}` | Le champ `query` de la ligne du jeu de données ; si votre fichier utilise `question`, mappez `{{item.question}}` |
| `{{sample.output_text}}` | La réponse en texte brut générée par la cible (modèle ou agent) pendant l'exécution |
| `{{sample.output_items}}` | La sortie structurée d'un agent, appels d'outils compris (nécessaire aux évaluateurs d'agents comme le respect de la tâche) |

Les champs `sample` ne sont disponibles que si la configuration de la source de données définit `include_sample_schema=True`. Le SDK local Azure AI Evaluation utilise une autre syntaxe dans `column_mapping` : `${data.query}` pour les champs du jeu de données et `${outputs.response}` pour les sorties d'une cible appelable.

Construire le jeu de données :

| Source | Comment | Remarques |
| --- | --- | --- |
| Fichier préparé | `project_client.datasets.upload_file(name=..., version=..., file_path=...)` inscrit un jeu de données versionné | Recommandé pour la production et la CI/CD ; les petits jeux peuvent être passés en ligne (`file_content`) |
| Génération synthétique (préversion) | **Simple QnA** produit des paires `query` et `ground_truth` ; **Simulation seed** produit des descriptions de scénarios pour une simulation multitour. Sources : une définition d'agent, une invite ou un fichier de référence | `max_samples` de 15 à 1 000 ; le générateur est un déploiement Azure OpenAI qui prend en charge l'API Responses ; commencez par 15 et relisez |
| Traces de production | **Data Generation**, Create dataset, From traces, ou Add to dataset depuis la vue des traces | `max_samples` de 1 à 1 000 ; contenu privé masqué par défaut ; l'identité managée du projet a besoin de Reader sur la ressource Application Insights connectée ; attendez l'ingestion des traces (30 à 90 secondes) |

Un bon jeu de données couvre les questions typiques, les cas limites, les questions dont la réponse n'est pas dans les sources (le comportement attendu est un refus) et les entrées malveillantes. Figez la version d'agent quand vous construisez un jeu de données à partir de traces, régénérez les données synthétiques quand les instructions changent beaucoup, et combinez lignes synthétiques et lignes issues des traces.

> **Piège d'examen.** Si un évaluateur renvoie une erreur d'entrée manquante, ce n'est pas forcément le jeu de données qui est faux : c'est le mappage. Un fichier avec une colonne `question` a besoin de `"query": "{{item.question}}"`. Et une exécution sur une cible a besoin de `include_sample_schema=True` avant de pouvoir mapper `{{sample.output_text}}`.

<!-- section: quality-metrics | objectives: 4.1.2 -->
## Métriques de qualité : ancrage, pertinence, cohérence et fluidité

Les évaluateurs de qualité assistés par IA utilisent un LLM comme juge : vous passez un déploiement de modèle (Learn recommande `gpt-5-mini` pour l'équilibre entre performances et coût) et chaque appel consomme des jetons.

| Évaluateur | Identificateur | Question à laquelle il répond | Sortie |
| --- | --- | --- | --- |
| Ancrage (Groundedness) | `builtin.groundedness` | Chaque affirmation de la réponse est-elle étayée par le contexte fourni ? | 1 à 5, réussite à 3 ou plus par défaut |
| Pertinence (Relevance) | `builtin.relevance` | La réponse traite-t-elle la requête ? | 1 à 5, seuil par défaut 3 |
| Cohérence (Coherence) | `builtin.coherence` | Les idées sont-elles organisées et reliées logiquement ? | 1 à 5, seuil par défaut 3 |
| Fluidité (Fluency) | `builtin.fluency` | La langue est-elle grammaticale et lisible ? | 1 à 5, seuil par défaut 3 |
| Récupération (Retrieval) | `builtin.retrieval` | Le contexte récupéré contenait-il ce dont la requête avait besoin ? | 1 à 5, seuil par défaut 3 |
| Exhaustivité de la réponse (préversion) | | La réponse inclut-elle les informations essentielles de la vérité terrain ? | 1 à 5, seuil par défaut 3 |
| Groundedness Pro (préversion) | | La réponse est-elle ancrée, selon Azure AI Content Safety, sans déploiement de modèle ? | Réussite ou échec |
| Récupération de documents (Document retrieval) | `builtin.document_retrieval` | Les documents récupérés sont-ils les bons, par rapport à une pertinence étiquetée ? | Plusieurs métriques de classement |
| Similarité | `builtin.similarity` | Proximité avec la vérité terrain, assistée par IA (exige un déploiement juge) | 1 à 5, seuil par défaut 3 |
| F1, BLEU, GLEU, ROUGE, METEOR | `builtin.f1_score`... | Recouvrement de jetons ou de n-grammes avec la vérité terrain, calculé sans modèle juge | 0 à 1, seuil par défaut 0,5 |

Chaque résultat contient un score, une étiquette, la justification et le seuil :

```json
{
  "type": "azure_ai_evaluator",
  "name": "Coherence",
  "metric": "coherence",
  "score": 4,
  "label": "pass",
  "reason": "The response directly addresses the question with clear, logical connections between ideas.",
  "threshold": 3,
  "passed": true
}
```

| Symptôme | Métrique qui le détecte |
| --- | --- |
| La réponse contient des faits absents des documents récupérés (hallucination) | Ancrage |
| La réponse est exacte mais ne répond pas à la question posée | Pertinence |
| Le récupérateur renvoie les mauvais blocs | Récupération, récupération de documents |
| La réponse saute d'une idée à l'autre, se contredit | Cohérence |
| Grammaire et lisibilité médiocres | Fluidité |
| La réponse omet des faits clés de la réponse attendue | Exhaustivité de la réponse, similarité, F1 |

La cohérence et la fluidité ne prennent actuellement en charge que les réponses en anglais, et les scores sont moins fiables pour les réponses très courtes. La cohérence peut aussi s'évaluer au niveau de la **conversation** (`evaluation_level="conversation"`), ce qui exige le format `messages` ; le niveau par défaut est `turn`.

> **Piège d'examen.** L'ancrage et la pertinence mesurent des choses différentes. Une réponse copiée du contexte est parfaitement ancrée même si elle ne répond pas à la question (pertinence faible) ; une réponse correcte tirée des connaissances générales du modèle est pertinente mais non ancrée si le contexte ne la contient pas. L'ancrage juge la réponse par rapport à `context` ; la pertinence ne l'utilise pas.

<!-- section: safety-evaluations | objectives: 4.1.3 -->
## Évaluations des risques et de la sécurité

Les évaluateurs de risques et de sécurité s'exécutent sur le service d'évaluation hébergé de Foundry, pas sur votre déploiement de modèle : ils n'ont **pas besoin de `deployment_name`**, mais ont besoin de votre projet Foundry, dans une région qui les prend en charge.

| Évaluateur | Détecte | Entrées |
| --- | --- | --- |
| `builtin.violence`, `builtin.sexual`, `builtin.self_harm`, `builtin.hate_unfairness` | Contenu nuisible, avec un score de gravité | `query`, `response` ou `messages` |
| `builtin.protected_material` | Texte protégé par le droit d'auteur, classé par le service de matériel protégé d'Azure AI Content Safety | `query`, `response` ou `messages` |
| `builtin.indirect_attack` | La réponse a suivi des instructions injectées par du contenu récupéré (XPIA) : contenu manipulé, intrusion, collecte d'informations | `query`, `response` ou `messages` ; modèles uniquement, pas les agents |
| `builtin.code_vulnerability` | Failles de sécurité dans le code généré (injection SQL, informations d'identification codées en dur, chiffrement faible...) pour Python, Java, C++, C#, Go, JavaScript et SQL | `query`, `response` ou `messages` |
| `builtin.ungrounded_attributes` | État émotionnel ou attributs de classe protégée déduits sur une personne et non ancrés dans le contexte | `query`, `response`, `context` |
| `builtin.prohibited_actions`, `builtin.sensitive_data_leakage` (préversion) | Un agent qui effectue des actions interdites ou expose des données sensibles | `query`, `response`, `tool_calls` ; cibles d'agent uniquement |

Les quatre évaluateurs de sécurité du contenu notent la gravité de 0 à 7 :

| Gravité | Score |
| --- | --- |
| Très faible | 0 à 1 |
| Faible | 2 à 3 |
| Moyenne | 4 à 5 |
| Élevée | 6 à 7 |

Avec le seuil par défaut de 3, un résultat **réussit quand le score est au plus égal au seuil** et échoue au-dessus. Les autres évaluateurs de risques renvoient directement réussite ou échec (les attributs non ancrés renvoient une étiquette vraie ou fausse : vraie quand un attribut est détecté et non ancré). Sur une exécution, regardez la part des lignes en échec.

```text
testing_criteria = [
    {
        "type": "azure_ai_evaluator",
        "name": "violence",
        "evaluator_name": "builtin.violence",
        "data_mapping": {"query": "{{item.query}}", "response": "{{item.response}}"},
    },
    {
        "type": "azure_ai_evaluator",
        "name": "indirect_attack",
        "evaluator_name": "builtin.indirect_attack",
        "data_mapping": {"query": "{{item.query}}", "response": "{{item.response}}"},
    },
]
```

Les évaluations de sécurité ont besoin d'entrées qui tentent de provoquer un préjudice : incluez des requêtes malveillantes dans le jeu de données, utilisez des conversations simulées ou exécutez une **équipe rouge d'IA** (AI red teaming) pour des tests adversariaux automatisés.

> **Piège d'examen.** Les garde-fous (filtres de contenu) bloquent le contenu nuisible à l'exécution ; les évaluateurs de sécurité mesurent la fréquence à laquelle l'application en produit sur un jeu de test. Et le sens est inversé par rapport aux métriques de qualité : un score de qualité élevé est bon, un score de gravité élevé est mauvais, et réussir signifie que la gravité est inférieure ou égale au seuil.

<!-- section: automated-evaluation | objectives: 4.1.4 -->
## Workflows d'évaluation automatisés avec des évaluateurs intégrés et personnalisés

Une **évaluation cloud** avec le SDK Foundry (`azure-ai-projects`) comporte trois étapes : définir le schéma des données et les critères de test, créer l'évaluation, lancer une exécution sur un jeu de données ou une cible. Les résultats restent dans le projet, s'affichent dans le portail et peuvent être envoyés vers Application Insights.

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project_client = AIProjectClient(endpoint=endpoint, credential=DefaultAzureCredential())
openai_client = project_client.get_openai_client()

data_id = project_client.datasets.upload_file(
    name="support-eval", version="3", file_path="./evals/support.jsonl"
).id

eval_object = openai_client.evals.create(
    name="support-quality",
    data_source_config={
        "type": "custom",
        "item_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}, "context": {"type": "string"}},
            "required": ["query"],
        },
        "include_sample_schema": True,
    },
    testing_criteria=[
        {
            "type": "azure_ai_evaluator",
            "name": "groundedness",
            "evaluator_name": "builtin.groundedness",
            "initialization_parameters": {"deployment_name": "eval-judge"},
            "data_mapping": {"context": "{{item.context}}", "response": "{{sample.output_text}}"},
        },
        {
            "type": "azure_ai_evaluator",
            "name": "violence",
            "evaluator_name": "builtin.violence",
            "data_mapping": {"query": "{{item.query}}", "response": "{{sample.output_text}}"},
        },
    ],
)

run = openai_client.evals.runs.create(
    eval_id=eval_object.id,
    name="support-agent-v4",
    data_source={
        "type": "azure_ai_target_completions",
        "source": {"type": "file_id", "id": data_id},
        "input_messages": {
            "type": "template",
            "template": [
                {"type": "message", "role": "user",
                 "content": {"type": "input_text", "text": "{{item.query}}"}}
            ],
        },
        "target": {"type": "azure_ai_agent", "name": "support-agent", "version": "4"},
    },
)
```

| Élément | Signification |
| --- | --- |
| `data_source` de type `jsonl` ou `csv` avec `file_id` | Évaluer des lignes qui contiennent déjà les réponses |
| `azure_ai_target_completions` | Générer les réponses pendant l'exécution à partir de `input_messages`, pour une cible de type `azure_ai_model` ou `azure_ai_agent` (version facultative ; la dernière si elle est omise) |
| `initialization_parameters` | Déploiement juge pour les évaluateurs assistés par IA, seuils pour les évaluateurs personnalisés |
| Rôle | Foundry User sur le projet, et à l'étendue de la ressource Foundry (compte) quand l'exécution appelle un déploiement de modèle comme le juge (une attribution sur le seul projet n'autorise pas l'inférence) ; avec un stockage personnel (bring-your-own storage), l'identité managée du projet a besoin de Storage Blob Data Contributor sur le compte de stockage |

Les **évaluateurs personnalisés** (préversion) s'inscrivent dans le catalogue d'évaluateurs du projet et s'utilisent dans `testing_criteria` comme les évaluateurs intégrés :

| Type | Définition | Score |
| --- | --- | --- |
| Basé sur du code | Une fonction Python `grade(sample, item)` qui renvoie un nombre flottant ; exige `pass_threshold` | 0,0 à 1,0, plus haut = meilleur |
| Basé sur une invite (LLM juge) | Une invite de juge avec des variables de type `{{response}}` qui renvoie un JSON avec `result` et `reason` ; exige `threshold` | Ordinal (par exemple 1 à 5), continu ou binaire |
| Basé sur un point de terminaison | Votre point de terminaison HTTP reçoit les données et renvoie les scores en 30 secondes maximum | Défini par le point de terminaison |

```text
def grade(sample: dict, item: dict) -> float:
    response = item.get("response", "")
    if not response:
        return 0.0
    return 1.0 if "order number" in response.lower() else 0.0
```

Les évaluateurs basés sur du code s'exécutent dans un bac à sable : code de moins de 256 Ko, 2 minutes par appel de notation, **aucun accès réseau**, packages préinstallés uniquement (numpy, pandas, scikit-learn, rapidfuzz, nltk, rouge-score...). Une exception ou un dépassement de délai enregistre 0,0 pour la ligne et la signale comme erreur. Inscrivez-les avec `project_client.beta.evaluators.create_version(...)`.

L'**évaluation locale** avec le SDK Azure AI Evaluation (`pip install azure-ai-evaluation`, documenté pour Foundry classique et en préversion) exécute des classes d'évaluateurs comme `GroundednessEvaluator(model_config)` ou `ContentSafetyEvaluator(credential=..., azure_ai_project=...)` par `evaluate(data="data.jsonl", evaluators={...}, evaluator_config={...}, azure_ai_project=..., output_path=...)` ; passer `azure_ai_project` journalise les résultats dans le projet.

**Automatiser** l'évaluation :

| Déclencheur | Outil |
| --- | --- |
| Demande de tirage qui modifie une invite ou un agent | Action GitHub `microsoft/ai-agent-evals@v3-beta` (préversion) : entrées `azure-ai-project-endpoint`, `deployment-name` (juge), `agent-ids` (`name:version`, séparés par des virgules), `data-path` (fichier JSON avec `name`, `evaluators`, `data`) ; résultats avec intervalles de confiance dans le résumé de l'exécution |
| Contrôle de qualité bloquant | L'extension d'évaluation azd (préversion) avec un seuil d'échec comme `--fail-on pass-rate=0.8` |
| Avant la promotion vers l'environnement suivant | Une étape de pipeline qui exécute l'évaluation cloud et compare avec l'exécution de référence |
| Après la mise en production | Évaluation continue d'un échantillon du trafic de production et exécutions planifiées sur le même jeu de données (voir le chapitre sur l'observabilité) |

Le workflow s'authentifie par OIDC (`permissions: id-token: write`, `azure/login`) et a besoin de Foundry User sur le projet, ou sur la ressource Foundry quand l'exécution appelle un déploiement juge. Les évaluations coûtent des jetons de juge : ne les exécutez pas à chaque commit.

> **Piège d'examen.** Un évaluateur personnalisé basé sur du code ne peut appeler ni une API externe ni un modèle : le bac à sable n'a pas de réseau. Pour juger avec un modèle, écrivez un évaluateur basé sur une invite ; pour atteindre votre propre service, utilisez un évaluateur basé sur un point de terminaison.

<!-- section: key-points -->
## Points clés

- Jeu de données : JSONL ou CSV avec `query`, `response`, `context`, `ground_truth`, ou `messages` ; versionné avec `datasets.upload_file` ; synthétique (15 à 1 000 échantillons, préversion) ou issu des traces.
- Mappage : `{{item.field}}` pour les champs du jeu de données, `{{sample.output_text}}` et `{{sample.output_items}}` pour les sorties de la cible (avec `include_sample_schema=True`) ; le SDK local utilise `${data.field}` et `${outputs.field}`.
- Qualité : ancrage (jugé par rapport au contexte), pertinence, cohérence, fluidité, récupération ; 1 à 5, réussite à 3 ou plus, déploiement de modèle juge obligatoire.
- Sécurité : service hébergé, pas de nom de déploiement, projet obligatoire ; gravité de 0 à 7, réussite à 3 ou moins ; matériel protégé, attaque indirecte et vulnérabilité du code donnent réussite ou échec.
- Automatisation : `evals.create` plus `evals.runs.create`, évaluateurs personnalisés par code (sans réseau) ou par invite, action GitHub `ai-agent-evals` avec comparaison à la référence, contrôles sur le taux de réussite.
