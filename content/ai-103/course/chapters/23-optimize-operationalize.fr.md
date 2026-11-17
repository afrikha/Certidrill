Une fois qu'une solution générative fonctionne, vous la rendez meilleure, moins coûteuse et observable. Vous ajustez les invites et les paramètres de génération, ajoutez des boucles de réflexion là où la qualité compte plus que la latence, instrumentez chaque appel pour analyser les jetons, les signaux de sécurité et la latence, et combinez modèles et règles déterministes pour que chaque requête aille au composant le moins coûteux capable de la traiter. Les questions d'examen demandent quel paramètre ou quelle technique corrige un symptôme, comment lire une trace ou un objet d'utilisation, et comment répartir le travail entre modèles, règles et flux.

<!-- section: tune-generation | objectives: 2.3.1 -->
## Paramétrer la génération : invites et paramètres

Techniques d'ingénierie d'invite documentées pour les modèles Foundry (Learn précise qu'elles ne sont pas recommandées pour les modèles de raisonnement) :

| Technique | Effet | Corrige |
| --- | --- | --- |
| Message système | Fixe le rôle, les règles, le périmètre et le ton pour toute la conversation | Réponses hors sujet ou incohérentes |
| Instructions claires en premier | Énonce la tâche avant le contexte et les exemples | Le modèle passe à côté de la tâche réelle |
| Apprentissage few-shot | Ajoute des paires d'exemples entrée/sortie après le message système | Format ou style incorrect ; le modèle n'est pas modifié durablement |
| Décomposer la tâche | Divise une tâche complexe en étapes ou en appels plus petits | Erreurs sur les tâches complexes en plusieurs parties |
| Chaîne de pensée (chain of thought) | Demande au modèle de procéder étape par étape et de montrer les étapes | Erreurs de raisonnement des modèles sans raisonnement ; vérification plus facile |
| Spécifier la structure de sortie | Impose un format (JSON, tableau) et des citations en ligne | Sortie impossible à analyser, citations manquantes |
| Contexte d'ancrage | Fournit les données sources à partir desquelles répondre | Fabrications |
| Répéter les instructions à la fin | Exploite le biais de récence | Instructions ignorées dans les longues invites |
| Amorcer la sortie | Termine l'invite par le début de la réponse attendue | Mauvaise forme de réponse |

Paramètres de génération :

| Paramètre | Effet | Recommandation |
| --- | --- | --- |
| `temperature` | Caractère aléatoire, de 0 à 2 | Bas (environ 0,2) pour les tâches factuelles, juridiques ou d'extraction ; plus élevé (environ 0,7) pour un texte créatif |
| `top_p` | Contrôle aussi le caractère aléatoire, en limitant la masse de probabilité des jetons | Modifiez temperature **ou** top_p, pas les deux |
| `max_output_tokens` (Responses) / `max_completion_tokens` (Chat Completions) | Plafonne les jetons générés, jetons de raisonnement compris | Trop bas, la réponse est tronquée |
| Effort de `reasoning` | Quantité de réflexion d'un modèle de raisonnement : `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` (selon le modèle) | Commencer à `medium` ; augmenter pour les problèmes difficiles, baisser pour la latence et le coût |
| `presence_penalty`, `frequency_penalty` (Chat Completions) | Découragent la répétition de jetons ou de sujets | Sortie répétitive |

La plupart des modèles de raisonnement refusent `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, `logprobs`, `top_logprobs`, `logit_bias` et `max_tokens`. Donnez-leur plutôt un objectif clair, des contraintes fermes et un contrat de sortie explicite, sans prescrire chaque étape intermédiaire. Un message `developer` fonctionne comme un message système.

```json
{
  "model": "o4-mini",
  "reasoning": { "effort": "low" },
  "max_output_tokens": 4000,
  "input": "Classify this ticket as billing, technical or account. Return only the label."
}
```

Une réponse qui renvoie `status: "incomplete"` avec le motif `max_output_tokens` peut avoir consommé tout le budget en raisonnement avant toute sortie visible, et ces jetons sont tout de même facturés. Learn suggère de réserver au moins 25 000 jetons pour le raisonnement et la sortie sur une nouvelle charge de travail, puis d'ajuster.

| Symptôme | Première correction |
| --- | --- |
| Les réponses varient trop entre des requêtes identiques | Baisser temperature |
| Des faits inventés sur les données de l'entreprise | Ancrer avec le RAG, pas modifier un paramètre |
| JSON parfois invalide | Spécifier la structure (schéma de sortie structurée), baisser temperature |
| Longues réponses coupées | Augmenter `max_output_tokens` |
| Modèle de raisonnement trop lent ou trop coûteux sur des tâches simples | Baisser l'effort de raisonnement, ou router vers un modèle plus petit |

> **Piège d'examen.** La température n'ajoute aucune connaissance. Quand les réponses sont fausses sur des faits que le modèle ne peut pas connaître, la correction est l'ancrage ; quand leur forme est incohérente, la correction porte sur l'invite et les paramètres.

<!-- section: reflection | objectives: 2.3.2 -->
## Réflexion, évaluation de la chaîne de pensée et boucles d'autocritique

La **réflexion** fait relire au modèle sa propre sortie avant qu'elle soit renvoyée. Une boucle d'autocritique comporte trois rôles, qui peuvent être trois appels au même modèle ou à des modèles différents :

1. **Générer** un brouillon de réponse.
2. **Critiquer** ce brouillon selon des critères explicites : ancré dans les sources, répond à la question, respecte le format et la stratégie. Demandez un verdict structuré (réussite ou échec, liste des problèmes).
3. **Réviser** à partir de la critique, puis s'arrêter quand le verdict est positif ou après un nombre fixe d'itérations.

```text
draft = generate(question, sources)
for attempt in range(2):                       # bounded: cost and latency grow with each loop
    review = critique(draft, sources, rubric)  # structured verdict: {"passed": ..., "issues": [...]}
    if review["passed"]:
        break
    draft = revise(draft, review["issues"], sources)
```

**Évaluation de la chaîne de pensée.** Pour les modèles sans raisonnement, demandez explicitement les étapes pour qu'un relecteur, un appel de critique ou un évaluateur puisse les vérifier ; cela réduit aussi les inexactitudes. Pour les modèles de raisonnement, ne demandez pas et n'extrayez pas le raisonnement caché : Learn indique que l'extraction du raisonnement brut par d'autres moyens n'est pas prise en charge. Utilisez l'option `reasoning.summary` de l'API Responses pour obtenir des résumés (non garantis à chaque requête) et jugez la réponse finale.

Utilisez les évaluateurs comme critique ou comme contrôle après la boucle :

| Besoin | Outil |
| --- | --- |
| Le brouillon est-il étayé par les sources ? | Évaluateur Groundedness, ou une invite de critique avec les sources |
| Respecte-t-il les règles système ? | Task Adherence |
| Score pondéré sur plusieurs critères personnalisés, avec un raisonnement par critère | Évaluateur Rubric (préversion) |
| Pourquoi une réponse a-t-elle échoué ? | La raison (`reason`) renvoyée avec chaque score d'évaluateur |

> **Piège d'examen.** Chaque passe de réflexion multiplie les jetons et la latence. Utilisez une boucle bornée pour les sorties à fort enjeu (contrats, synthèses médicales ou financières), pas pour chaque tour de conversation, et prévoyez une condition d'arrêt.

> **Conseil d'examen.** « Le modèle doit vérifier son travail avant de répondre » avec un modèle de raisonnement : indiquez dans l'invite ce que signifie « terminé » et comment vérifier, plutôt que d'ajouter « réfléchis étape par étape ».

<!-- section: observability | objectives: 2.3.3 -->
## Observabilité : suivi, analytique des jetons, signaux de sécurité et latence

Le **suivi** (tracing) enregistre chaque opération sous forme d'étendues (spans) OpenTelemetry dans la ressource Application Insights connectée au projet : appels au modèle, exécutions d'outils (`execute_tool`), invocations d'agents (`invoke_agent`), opérations de mémoire, avec les durées, les nombres de jetons et, quand l'enregistrement du contenu est activé, les entrées et les sorties. Le suivi côté serveur fonctionne pour les agents d'invite dès qu'Application Insights est connecté ; l'instrumentation côté client ajoute les étendues propres à votre application :

```text
os.environ["AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING"] = "true"
from azure.ai.projects.telemetry import AIProjectInstrumentor
from opentelemetry import trace

AIProjectInstrumentor().instrument()
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("claim-triage"):   # parent span groups the whole request
    response = openai.responses.create(model="gpt-4.1-mini", input=claim_text)
```

La variable `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` doit valoir `true` avant l'appel à `instrument()`, sinon le suivi n'est pas activé. Un `ConsoleSpanExporter` affiche les étendues en local pour le débogage ; `configure_azure_monitor` les envoie à Application Insights.

**Analytique des jetons.** Chaque réponse contient un objet `usage` ; les jetons de raisonnement sont facturés comme des jetons de sortie :

```json
"usage": {
  "input_tokens": 75,
  "output_tokens": 1186,
  "output_tokens_details": { "reasoning_tokens": 1024 },
  "total_tokens": 1261
}
```

Suivez les jetons d'entrée (taille de l'invite, passages récupérés, historique de conversation), les jetons de sortie et les jetons de raisonnement par déploiement, par agent ou par fonctionnalité. L'onglet **Monitor** de l'agent affiche l'utilisation des jetons ; un nombre élevé révèle des invites verbeuses, trop de blocs récupérés ou de longs historiques.

**Signaux de sécurité** à collecter et à surveiller par des alertes :

| Signal | Source |
| --- | --- |
| Invites bloquées | HTTP 400 avec le code `content_filter` |
| Complétions bloquées ou filtrées | `finish_reason` `content_filter` |
| Détections en mode annotation | Annotations du filtre de contenu (`filtered`, `severity`, `detected`) |
| Le filtre ne s'est pas exécuté | Objet d'erreur dans les annotations |
| Taux de contenu nuisible sur le trafic réel | Évaluation continue avec les évaluateurs de sécurité |
| Faiblesses exploitables | Résultats du red teaming planifié |

**Répartition de la latence.** La trace montre la durée de chaque étendue : la latence totale se décompose en récupération, chaque appel au modèle, chaque appel d'outil et votre propre code.

| Partie lente dans la trace | Correction type |
| --- | --- |
| Appel au modèle avec une longue sortie | Baisser `max_output_tokens`, un modèle plus petit ou un effort de raisonnement plus faible |
| Appel au modèle avec une entrée énorme | Moins de blocs récupérés ou des blocs plus courts, résumer l'historique |
| Une étendue d'outil | Optimiser ou mettre en cache l'API, exécuter en parallèle les appels indépendants |
| Latence variable sous charge | Débit provisionné pour une latence régulière |
| Attente perçue dans une interface de conversation | Diffuser la réponse en continu (streaming) |

> **Piège d'examen.** Les métriques de surveillance indiquent que la latence a augmenté ; la trace d'une requête indique quelle étape en est la cause. Choisissez le suivi pour « trouver l'étape », l'onglet Monitor ou les alertes Azure Monitor pour « être prévenu quand ».

<!-- section: orchestrate-models | objectives: 2.3.4 -->
## Orchestrer plusieurs modèles, des flux et des moteurs hybrides LLM et règles

| Approche | Fonctionnement | Convient à |
| --- | --- | --- |
| Model router | Un déploiement unique qui route chaque invite vers un modèle sous-jacent | Trafic mixte, sans logique de routage à maintenir |
| Cascade | Un petit modèle répond d'abord ; escalade vers un modèle plus grand quand la confiance ou un contrôle échoue | Requêtes surtout simples avec quelques cas difficiles |
| Pipeline spécialisé | Un modèle différent par étape : modèle d'embedding pour la récupération, petit modèle pour la classification, LLM pour la génération, modèle multimodal pour les images | Des étapes aux besoins de coût et de qualité différents |
| Hybride LLM et règles | Le LLM interprète l'entrée non structurée ; des règles déterministes prennent ou valident la décision | Décisions réglementées, seuils fixes, auditabilité |
| Workflow | Agent Framework enchaîne, branche et exécute des étapes en parallèle | Processus connus en plusieurs étapes |

Ce qu'il faut savoir du **model router** :

- Modes de routage : **Balanced** (par défaut : le modèle le plus économique à environ 1-2 % de la meilleure qualité pour l'invite), **Cost** (une marge plus large, environ 5-6 %), **Quality** (le meilleur modèle, sans tenir compte du coût).
- Un **sous-ensemble de modèles** (model subset) limite les modèles qu'il peut choisir ; c'est aussi l'ensemble de basculement, incluez donc au moins deux modèles. Les nouveaux modèles ne sont ajoutés que si vous les ajoutez.
- Basculement automatique vers le modèle suivant en cas de problème transitoire, activé par défaut.
- Types de déploiement pris en charge : Global Standard et Data Zone Standard.
- La fenêtre de contexte est celle du **plus petit** modèle de l'ensemble ; les décisions de routage se fondent uniquement sur l'entrée texte ; l'audio n'est pas traité.
- Les modèles Claude doivent être déployés séparément avant que le router puisse les utiliser.

**Exemple hybride.** Litware Insurance doit approuver automatiquement les sinistres de moins de 1 000 USD et transmettre les plus importants à un expert. Le LLM extrait en JSON le montant, le numéro de police et le type d'incident de l'e-mail de déclaration ; un moteur de règles applique le seuil et la couverture de la police ; seule la lettre d'explication est à nouveau générée par le LLM. La décision est reproductible et auditable, et le modèle ne décide jamais de l'indemnisation.

| Exigence | Choix |
| --- | --- |
| Seuil légal fixe qui doit toujours s'appliquer | Règle dans le code, pas une instruction au modèle |
| Réduire le coût d'un trafic surtout simple, sans écrire de code de routage | Model router en mode Cost ou Balanced |
| La meilleure qualité de réponse quel que soit le coût | Model router en mode Quality, ou un grand modèle fixe |
| Des milliers de documents à résumer pendant la nuit | Déploiement Batch, 50 % moins cher, objectif de 24 heures |
| Résumer un texte, extraire des champs d'une image, puis classer | Pipeline avec un modèle multimodal et un petit classifieur |

> **Piège d'examen.** La fenêtre de contexte du model router est la plus petite parmi ses modèles. Une invite qui ne tient que dans un modèle à grand contexte peut échouer via le router : restreignez le sous-ensemble ou raccourcissez l'invite.

<!-- section: key-points -->
## Points clés

- Techniques d'invite : message système, few-shot, décomposition, chaîne de pensée (modèles sans raisonnement), structure de sortie, ancrage, répétition à la fin, amorçage.
- Modifiez temperature ou top_p, pas les deux. Modèles de raisonnement : effort de `reasoning` et `max_output_tokens` ; ni temperature ni top_p.
- Réflexion : générer, critiquer selon des critères, réviser, avec un nombre borné de boucles. N'extrayez pas le raisonnement brut ; utilisez les résumés de raisonnement.
- Suivi : étendues OpenTelemetry dans Application Insights ; définissez `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` avant `instrument()`.
- Jetons : `usage.input_tokens`, `output_tokens`, `output_tokens_details.reasoning_tokens` (facturés comme sortie).
- Signaux de sécurité : HTTP 400 `content_filter`, `finish_reason` `content_filter`, annotations, évaluation continue de la sécurité.
- Model router : Balanced (par défaut), Cost, Quality ; sous-ensemble de modèles = ensemble de basculement ; la plus petite fenêtre de contexte s'applique.
- Les règles décident de ce qui doit être déterministe ; le LLM traite l'entrée non structurée et le langage.
