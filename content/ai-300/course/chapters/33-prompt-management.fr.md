Dans une application d'IA générative, l'invite (prompt) est le composant qui change le plus souvent, et un seul mot modifié peut changer l'exactitude, le ton, la sécurité et le coût pour tous les utilisateurs à la fois. Le GenAIOps traite les invites comme du code : conçues avec des techniques éprouvées, comparées comme variantes sur les mêmes données de test, stockées dans Git, revues, étiquetées et promues d'un environnement à l'autre. Les questions d'examen demandent quelle technique corrige un problème d'invite, comment comparer équitablement deux invites et comment organiser et publier les versions d'invite.

<!-- section: prompt-design | objectives: 3.3.1 -->
## Concevoir et développer des invites

Avec les modèles de conversation, une invite se compose d'un **message système** (instructions qui fixent le comportement, le périmètre, le ton et le format), d'**exemples few-shot** facultatifs (paires de messages user et assistant), de **données d'ancrage** (documents récupérés ou faits) et de l'entrée de l'utilisateur. Dans les agents Foundry, le message système correspond aux `instructions` de l'agent, associées à un déploiement de modèle et à des outils facultatifs.

| Technique | Quand elle aide | Remarque |
| --- | --- | --- |
| Instructions claires au début | Toujours : énoncez la tâche avant le contexte et les exemples | Les modèles de conversation récents sont moins sensibles à l'ordre que les anciens |
| Répéter les instructions à la fin | Le modèle ignore une règle donnée tôt dans une longue invite | Les modèles présentent un **biais de récence** : la fin de l'invite pèse davantage |
| Exemples few-shot | La sortie doit suivre un format ou un style que le modèle ne devine pas | Conditionne uniquement l'inférence en cours ; le modèle n'est pas modifié. L'ordre des exemples compte |
| Décomposer la tâche | Les demandes en plusieurs parties produisent des réponses incomplètes | Demandez les étapes séparément (par exemple extraire les faits, puis répondre) |
| Chaîne de pensée (chain of thought) | Les modèles sans raisonnement se trompent sur les problèmes en plusieurs étapes | Demandez au modèle de procéder étape par étape. **Uniquement pour les modèles sans raisonnement** |
| Spécifier la structure de sortie | Les réponses doivent être analysées ou citer leurs sources | Demandez des citations ou une structure fixe ; les citations rendent les affirmations inventées moins probables |
| Syntaxe claire et délimiteurs | Instructions et données se mélangent | Séparez les sections avec des titres Markdown ou des balises XML |
| Amorcer la sortie | La réponse doit commencer sous une forme donnée | Terminez l'invite par les premiers mots de la réponse attendue |
| Contexte d'ancrage | Les réponses doivent être factuelles et à jour | Fournissez les données sources ; plus elles sont proches de la réponse finale, moins il y a d'erreurs |

Learn précise que ces techniques d'ingénierie d'invite ne sont pas recommandées pour les **modèles de raisonnement** (gpt-5 et série o), et que certaines techniques donnent des résultats différents avec les modèles récents : testez-les par une évaluation plutôt que de supposer qu'elles aident. Extraire le raisonnement d'un modèle de raisonnement par une autre méthode que son paramètre de résumé du raisonnement n'est pas pris en charge.

Les paramètres de génération complètent la conception. `temperature` va de 0 à 2 : des valeurs basses donnent une sortie ciblée et reproductible ; des valeurs hautes une sortie plus variée. Modifiez `temperature` ou `top_p`, pas les deux. Plafonnez la longueur de sortie pour maîtriser le coût.

Une structure de message système qui fonctionne bien et se versionne proprement :

```text
# Role
You are the order-support assistant for Contoso Outdoor.

# Rules
- Answer only from the documents in the Sources section.
- If the answer isn't in the sources, say that you don't know.
- Never ask for payment card numbers.

# Output
Two to four sentences, then the cited source titles in brackets.

# Sources
{retrieved_documents}
```

Dans un projet Foundry, une invite fait partie d'une **version d'agent** : créer ou mettre à jour un agent crée une nouvelle version. Un script de déploiement lit l'invite dans un fichier du dépôt, pour que le texte de l'invite ne vive jamais uniquement dans le portail :

```text
from pathlib import Path
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

project = AIProjectClient(
    endpoint="https://contoso-ai-dev.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),
)

instructions = Path("src/agents/order_agent/prompts/v3_instructions.txt").read_text()

agent = project.agents.create_version(
    agent_name="order-agent",
    definition=PromptAgentDefinition(model="chat", instructions=instructions),
)
print(agent.name, agent.version)
```

> **Piège d'examen.** Ajouter « think step by step » à l'invite est la mauvaise correction pour un modèle de raisonnement : la chaîne de pensée par invite ne s'applique qu'aux modèles sans raisonnement. Et les exemples few-shot n'entraînent pas le modèle : ils n'influencent que les requêtes qui les contiennent, et ils coûtent des jetons d'entrée à chaque appel.

<!-- section: prompt-variants | objectives: 3.3.2 -->
## Créer des variantes d'invite et comparer les performances

Une **variante** est une autre version d'une invite ou de ses paramètres (instructions, exemples, température, déploiement de modèle). Comparer des variantes est une expérience contrôlée :

1. Changez **une seule chose à la fois**, gardez tout le reste identique.
2. Exécutez chaque variante sur le **même jeu de données d'évaluation**, représentatif du trafic réel (cas limites et demandes dangereuses compris).
3. Notez chaque exécution avec les **mêmes évaluateurs** (par exemple ancrage, pertinence, respect de la tâche, un évaluateur de sécurité) et relevez la latence et le coût en jetons.
4. Comparez à une **référence** (baseline) et vérifiez que la différence est statistiquement significative avant de promouvoir.

**Dans les projets Foundry**, chaque variante est en général une version d'agent ou un fichier d'invite déployé dans un projet de développement. Deux façons de comparer :

| Outil | Comment il compare |
| --- | --- |
| Exécutions d'évaluation dans le portail | Sélectionnez deux exécutions ou plus, puis **Compare** ; définissez une **exécution de référence**. Les cellules sont colorées d'après des tests t statistiques (par exemple ImprovedStrong pour p au plus 0,001 dans le sens souhaité, Inconclusive quand il y a trop peu d'exemples ou que p vaut 0,05 ou plus). La vue de comparaison n'est pas enregistrée |
| Action GitHub `microsoft/ai-agent-evals` (préversion) | `agent-ids: "order-agent:3,order-agent:4"` évalue plusieurs versions sur le fichier de données ; la première est la référence sauf si `baseline-agent-id` est défini ; le résumé montre des intervalles de confiance et un test de significativité par paire |

Pour les exécutions sur une cible de modèle, le détail de l'exécution montre aussi la latence de bout en bout p50 et p95 et un coût estimé d'après l'utilisation des jetons (hors utilisation du modèle évaluateur).

**Dans prompt flow de Foundry (classique)**, les variantes sont une fonctionnalité intégrée du nœud **outil LLM** : le nœud d'origine est `variant_0` (la variante par défaut) ; **Clone** crée `variant_1` avec un autre texte d'invite ou d'autres paramètres. Une exécution simple teste les variantes d'un seul nœud LLM à la fois, les autres nœuds utilisant leur variante par défaut. Pour comparer à grande échelle, lancez une exécution par lots avec une méthode d'évaluation sur un jeu de données, sélectionnez ensemble les exécutions des variantes et choisissez **Visualize outputs** ; définissez enfin la meilleure variante comme variante par défaut du nœud. Prompt flow sera retiré le **20 avril 2027**, n'est plus recommandé pour les nouveaux développements, et son remplaçant est Microsoft Agent Framework (les flux d'évaluation correspondent aux évaluateurs du SDK Azure AI Evaluation).

| Exigence | Réponse |
| --- | --- |
| Savoir si la version 4 de l'invite est vraiment meilleure que la version 3 | Évaluer les deux sur le même jeu de données avec les mêmes évaluateurs ; comparer les exécutions avec la version 3 comme référence et vérifier la significativité |
| Isoler l'effet d'un nouvel exemple few-shot | Une variante qui ne diffère que par cet exemple |
| Choisir entre deux températures pour un nœud LLM prompt flow existant | Deux variantes du nœud, une exécution par lots avec évaluation, Visualize outputs |
| Bloquer une modification d'invite qui baisse la qualité | Évaluation dans le pipeline de la demande de tirage (pull request) avec un seuil de taux de réussite |
| Qualité égale, choisir la variante la moins chère | Comparer l'utilisation des jetons et la latence des exécutions |

> **Piège d'examen.** Comparer une nouvelle invite sur un nouveau jeu de données avec les scores d'une ancienne invite du mois dernier mesure deux changements à la fois. La comparaison équitable exécute les deux variantes sur le même jeu de données, avec les mêmes évaluateurs et le même déploiement de modèle juge.

<!-- section: prompt-git | objectives: 3.3.3 -->
## Contrôle de version des invites avec Git

Modifier une invite directement dans le portail mène à des échecs prévisibles : dégradation silencieuse de la qualité, environnements qui divergent, impossibilité de restaurer la version qui fonctionnait, et instructions de sécurité supprimées par quelqu'un qui les croyait inutiles. Stocker les invites dans un dépôt Git apporte l'historique, la revue, la séparation des environnements et la restauration.

Une organisation de dépôt recommandée pour les agents Foundry place les invites dans des fichiers séparés, à côté du script qui les déploie :

```text
project-root/
├── .env                          # local settings, not committed
├── .gitignore
├── requirements.txt
├── src/
│   └── agents/
│       └── order_agent/
│           ├── order_agent.py    # deployment script
│           └── prompts/
│               ├── v1_instructions.txt
│               ├── v2_instructions.txt
│               └── v3_instructions.txt
├── tests/
│   └── test_order_agent.py
├── infra/
│   └── main.bicep
└── .github/
    └── workflows/
        ├── test-agents.yml
        └── deploy-agents.yml
```

Conventions :

| Sujet | Pratique |
| --- | --- |
| Format | Texte brut (`.txt`) pour les instructions d'agent, Markdown pour la documentation, YAML ou JSON pour la configuration et les métadonnées, modèles (`.jinja2`) pour les invites dynamiques |
| Nommage | Minuscules, traits de soulignement, version dans le nom du fichier d'invite (`v2_instructions.txt`), invites dans un dossier `prompts/` par agent, hiérarchie peu profonde |
| Alignement des versions | Foundry numérote les versions d'agent de façon incrémentielle ; numérotez les fichiers d'invite de la même façon pour que fichier, balise Git et version d'agent correspondent |
| Publications | Une **balise Git** (tag) par version déployée (`v1`, `v2`...) indique quel commit a produit quelle version d'agent |
| Secrets | Points de terminaison et clés dans `.env` en local (jamais commité) et dans les variables ou secrets du pipeline ; préférez Microsoft Entra ID avec OIDC |

Le workflow d'une modification :

```bash
git checkout main
git pull origin main
git checkout -b feature/improve-order-greeting

# edit src/agents/order_agent/prompts/v4_instructions.txt, update the script
git add src/agents/order_agent/
git commit -m "Order agent v4: shorter greeting, explicit refusal rule"
git push origin feature/improve-order-greeting

# after review, evaluation and merge to main
git checkout main
git pull origin main
git tag v4
git push origin v4
```

1. Travaillez sur une **branche** (`feature/...`, `hotfix/...`, `experiment/...`).
2. Ouvrez une **demande de tirage** (pull request) avec les résultats des tests et la comparaison avec la version actuelle ; les relecteurs vérifient exactitude, sécurité et ton.
3. Un **pipeline** sur la demande de tirage déploie la candidate dans un projet de développement et exécute l'évaluation ; un seuil bloque la fusion si la qualité baisse.
4. Après approbation, **fusionnez** dans `main` et **étiquetez** (tag) la publication.
5. Un pipeline de déploiement promeut les mêmes fichiers d'invite en test et en production ; surveillez après la publication.
6. Pour restaurer, redéployez les fichiers d'invite de la balise précédente ; Foundry enregistre une nouvelle version d'agent avec les instructions antérieures.

```yaml
on:
  pull_request:
    branches: [ main ]
    paths: [ "src/agents/**" ]

permissions:
  id-token: write
  contents: read

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - name: Create the candidate agent version
        run: |
          pip install -r requirements.txt
          python src/agents/order_agent/order_agent.py
      - uses: microsoft/ai-agent-evals@v3-beta
        with:
          azure-ai-project-endpoint: ${{ vars.FOUNDRY_PROJECT_ENDPOINT }}
          deployment-name: eval-judge
          agent-ids: "order-agent:3,order-agent:4"
          data-path: ${{ github.workspace }}/evals/order-agent.json
```

L'identité du pipeline s'authentifie par fédération d'identité de charge de travail (aucun secret stocké) et a besoin de Foundry User sur le projet. Les évaluations coûtent des jetons : exécutez-les sur les demandes de tirage qui touchent aux invites, pas à chaque commit.

> **Conseil d'examen.** Quand une question demande comment savoir quelle invite tourne en production et restaurer rapidement la précédente, la réponse combine des invites stockées comme fichiers dans Git, une balise par publication et un script ou un pipeline de déploiement qui crée la version d'agent à partir de ces fichiers, pas des modifications dans le portail.

<!-- section: key-points -->
## Points clés

- Invite = message système + exemples few-shot + données d'ancrage + entrée utilisateur ; dans les agents Foundry, le message système est l'ensemble des instructions de l'agent, et chaque création ou mise à jour crée une nouvelle version d'agent.
- Techniques : instructions en premier et répétées à la fin, few-shot, décomposition de la tâche, chaîne de pensée (modèles sans raisonnement uniquement), structure de sortie et citations, délimiteurs Markdown ou XML, ancrage. Modifiez `temperature` ou `top_p`, pas les deux.
- Variantes : un changement à la fois, même jeu de données, mêmes évaluateurs, référence, significativité statistique (Compare dans le portail, `ai-agent-evals` avec plusieurs `agent-ids`).
- Variantes prompt flow : nœud LLM uniquement, `variant_0` par défaut, exécution par lots plus Visualize outputs ; prompt flow est retiré le 20 avril 2027.
- Git : invites dans des fichiers versionnés, branche, demande de tirage avec contrôle d'évaluation, fusion, balise, promotion ; restaurer en redéployant la balise précédente.
