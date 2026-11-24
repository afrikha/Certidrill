Le réglage précis (fine-tuning) modifie les poids d'un modèle en le réentraînant sur des exemples propres à une tâche, au lieu d'ajouter des exemples à chaque invite. Dans Microsoft Foundry, il peut améliorer la précision au-delà de ce qui tient dans une invite, raccourcir les invites (moins de coût en jetons et de latence), imposer un style ou un schéma, améliorer le choix des outils et de leurs arguments, apprendre à un modèle à exploiter le contexte récupéré, et spécialiser un modèle plus petit avec des exemples générés par un plus grand. Il ne remplace ni la récupération pour les informations à jour, ni les contrôles de sécurité au niveau de l'application, et ses bénéfices ne sont pas garantis : comparez toujours le résultat à la référence sur des données mises de côté. Les questions d'examen demandent quelle méthode répond à une exigence, comment produire des données d'entraînement, comment lire les métriques d'entraînement et quel type de déploiement utiliser à chaque étape.

<!-- section: fine-tuning-methods | objectives: 5.2.1 -->
## Concevoir et implémenter des méthodes de réglage précis

Foundry propose le **Managed Training** (vous fournissez les données et les paramètres, Foundry exécute le travail ; recommandé pour commencer) et le **Programmed Training** (préversion, sur approbation : vous écrivez la boucle d'entraînement en Python et contrôlez pertes, récompenses et points de contrôle). Le Managed Training propose trois méthodes, et un modèle pris en charge pour une méthode ne l'est pas automatiquement pour une autre :

| Méthode | Signal d'entraînement | À choisir quand | Exemples de modèles pris en charge |
| --- | --- | --- | --- |
| **SFT** (réglage précis supervisé) | Des invites avec les réponses souhaitées | Vous pouvez montrer le comportement attendu : format, style, réponses métier, appels d'outils | `gpt-4o-mini`, `gpt-4o`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, et des modèles ouverts comme `Llama-3.3-70B-Instruct`, `Qwen3-32B`, `gpt-oss-20b`, `Ministral-3B` |
| **DPO** (optimisation directe des préférences) | Une réponse préférée et une réponse rejetée pour la même entrée | La qualité est affaire de préférence : ton, complétude, utilité | `gpt-4o`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano` |
| **RFT** (réglage précis par renforcement) | Des invites plus un **évaluateur (grader)** qui note les réponses générées | Plusieurs bonnes réponses existent et vous savez les noter de façon fiable (tâches de raisonnement) | `o4-mini` (`gpt-5` sur invitation) ; plusieurs modèles ouverts en préversion |

Les données d'entraînement SFT sont au format JSON Lines, avec le format `messages` de Chat Completions ; les lignes DPO contiennent `input`, `preferred_output` et `non_preferred_output` :

```json
{"messages": [{"role": "system", "content": "You classify Contoso insurance claims."}, {"role": "user", "content": "Water damage in the kitchen after a pipe burst."}, {"role": "assistant", "content": "{\"category\": \"property\", \"priority\": \"high\"}"}]}
{"input": {"messages": [{"role": "user", "content": "Summarize policy P-118 for a customer."}]}, "preferred_output": [{"role": "assistant", "content": "Your policy covers water damage up to 10,000 USD after a 250 USD deductible."}], "non_preferred_output": [{"role": "assistant", "content": "See the policy document."}]}
```

Les enregistrements RFT se terminent par un message `user` et portent les champs que lit l'évaluateur (par exemple `reference_answer`). Types d'évaluateurs :

| Évaluateur | Usage |
| --- | --- |
| `string_check` | Étiquettes exactes ou sous-chaînes (`eq`, `ne`, `like`, `ilike`) |
| `text_similarity` | Similarité avec une référence (`fuzzy_match`, `bleu`, `gleu`, `meteor`, `rouge_1` à `rouge_5`, `rouge_l`) ; `cosine` sert aux évaluations, pas au RFT |
| `score_model` | Un modèle évaluateur applique une grille dans une plage `range` |
| `python` | Une fonction `grade(sample, item)` renvoie un score ; s'exécute sans accès réseau |
| `multi` | Combine des évaluateurs enfants avec une formule `calculate_output` |

```json
{
  "name": "claim_category_grader",
  "type": "string_check",
  "input": "{{item.reference_answer}}",
  "reference": "{{sample.output_text}}",
  "operation": "eq"
}
```

Les types d'entraînement arbitrent entre coût et résidence des données :

| Type d'entraînement | Caractéristiques |
| --- | --- |
| Standard | Entraînement dans la région de la ressource, résidence des données garantie |
| Data zone | Dans une zone de données (US uniquement) |
| Global | Moins cher, files d'attente plus courtes, données et poids copiés hors de votre région : aucune garantie de résidence |
| Developer | Coût minimal sur de la capacité inutilisée, préemptible (les travaux en pause reprennent, sans facturation pendant la pause), sans SLA ni résidence : pour les expériences |

Créez un travail avec le client OpenAI du projet (l'entraînement exige **Foundry User** ; le déploiement exige **Foundry Owner**) :

```text
training_file = client.files.create(file=open("train.jsonl", "rb"), purpose="fine-tune")
validation_file = client.files.create(file=open("valid.jsonl", "rb"), purpose="fine-tune")
client.files.wait_for_processing(training_file.id)
client.files.wait_for_processing(validation_file.id)

job = client.fine_tuning.jobs.create(
    model="gpt-4.1-mini",
    training_file=training_file.id,
    validation_file=validation_file.id,
    suffix="claims-v1",
    method={
        "type": "supervised",
        "supervised": {"hyperparameters": {
            "n_epochs": "auto", "batch_size": "auto", "learning_rate_multiplier": "auto"}},
    },
    extra_body={"trainingType": "GlobalStandard"},
)
```

Les hyperparamètres acceptent un nombre ou `auto` ; gardez les valeurs par défaut du modèle pour le premier travail et ne les changez qu'après avoir comparé les résultats de validation. DPO utilise `method={"type": "dpo"}` et RFT `method.reinforcement`. Les méthodes s'enchaînent : pour appliquer DPO à un résultat SFT, passez l'**identifiant du modèle ajusté**, pas le nom de son déploiement. La **distillation** est un SFT sur des réponses générées par un modèle enseignant plus grand, pour qu'un modèle plus petit atteigne l'objectif de qualité à moindre coût et latence.

> **Piège d'examen.** Faites correspondre les données à la méthode : des démonstrations → SFT, des paires de réponses meilleure et moins bonne → DPO, une fonction de notation → RFT. Et si les réponses doivent refléter des documents qui changent chaque semaine, le réglage précis n'est pas le bon outil : utilisez RAG, que le modèle ajusté peut d'ailleurs exploiter.

<!-- section: synthetic-data | objectives: 5.2.2 -->
## Créer et gérer des données synthétiques pour le réglage précis

Quand les exemples réels sont rares ou sensibles, la **génération de données synthétiques** (préversion) transforme un fichier de référence en données d'entraînement, dans le portail Foundry sous Data, **Data Generation (preview)**, Create dataset, Generate synthetic data.

| Générateur | Fichier de référence | Produit | Paramètre |
| --- | --- | --- | --- |
| **Simple Q&A** | PDF, Markdown ou texte, moins de 20 Mo | Des paires question-réponse issues d'un document métier | Type de question : Long answer (analytique) ou Short answer (factuelle) |
| **Tool use** | Spécification OpenAPI 3.0.x ou 3.1.x en JSON, moins de 20 Mo | Des conversations multitours avec `tool_calls` et messages `tool`, plus un tableau `tools` | Aucun |

Choix de l'assistant : type de tâche, paramètres, fichier de référence (**un seul fichier** : fusionnez d'abord plusieurs documents), nombre d'échantillons (**50 à 1 000**), le **modèle générateur** (déployé automatiquement si nécessaire), une **répartition 80/20 entraînement et validation** facultative, et un suffixe de nom. Le panneau d'aperçu du travail montre des exemples de sortie et le coût ; la sortie est au format **JSONL** avec `messages`, téléchargeable ou utilisable directement avec **Use this dataset**. Prérequis : Foundry User (ou Foundry Project Manager) et une région prise en charge ; déployer un modèle générateur exige Foundry Owner.

Règles de qualité :

- Nettoyez la référence : supprimez le contenu répétitif comme les menus de navigation, ainsi que les données personnelles et sensibles.
- Pour Tool use, décrivez clairement chaque chemin et paramètre d'API, et placez les règles métier dans la description des chemins.
- **Commencez petit** : générez un échantillon, relisez-le (les conversations générées peuvent contenir des incohérences, comme des montants qui ne s'additionnent pas), ajustez, puis augmentez le volume.
- **Mélangez** données synthétiques et une part de données réelles pour mieux généraliser ; un taux d'apprentissage plus faible limite le surajustement sur les données synthétiques, et un point de contrôle antérieur peut aider si le modèle régresse.
- Gardez les **données de validation et de test séparées** des données d'entraînement, et auditez le modèle ajusté pour détecter les biais introduits par les données synthétiques.

La production alimente aussi les jeux de données : **traces to dataset** construit un jeu de données d'**évaluation** versionné à partir des traces d'un agent (Data Generation, Create dataset, From traces). `max_samples` (1 à 1 000) active un échantillonnage intelligent qui écarte les traces peu informatives et retient des traces variées ; `redact_private_content` est activé par défaut ; épinglez `agent_version` ; mode d'écriture `OVERWRITE` (par défaut, version suivante avec seulement les nouvelles lignes) ou `MERGE`. L'identité managée du projet a besoin de **Reader** sur la ressource Application Insights.

```text
job = EvaluationDataGenerationJobInputs(
    name="claims-agent-eval",
    sources=[TracesDataGenerationJobSource(
        agent_name="claims-agent", agent_version="4",
        start_time=end_time - timedelta(days=7), end_time=end_time)],
    generation_configuration=TracesDataGenerationJobConfiguration(
        max_samples=200, redact_private_content=True),
    output_configuration=EvaluationDataGenerationJobOutputConfiguration(
        name="claims-agent-eval", write_mode=DataGenerationJobOutputWriteMode.MERGE),
)
poller = project_client.datasets.begin_create_generation_job(job=job)
```

> **Piège d'examen.** Des données synthétiques issues d'un document ne couvrent que ce document : elles multiplient les exemples, elles n'ajoutent pas de connaissances absentes de la référence. Les lignes générées doivent être relues avant l'entraînement, et un jeu de test généré à partir du même fichier que le jeu d'entraînement gonfle les scores (fuite d'évaluation).

<!-- section: monitor-optimize | objectives: 5.2.3 -->
## Surveiller et optimiser les performances des modèles ajustés

Pendant l'entraînement, un travail publie des métriques par étape et peut renvoyer un fichier de résultats CSV :

| Méthode | Métriques |
| --- | --- |
| SFT | `train_loss`, `full_valid_loss`, `train_mean_token_accuracy`, `full_valid_mean_token_accuracy` |
| RFT | `train_reward_mean`, `valid_reward_mean`, scores par évaluateur, moyennes de jetons de raisonnement, erreurs des évaluateurs |
| DPO | Validation sur des exemples de préférence mis de côté ; la précision par jeton ne mesure pas l'alignement sur les préférences |

| Tendance | Signification | Action |
| --- | --- | --- |
| La perte d'entraînement baisse, la perte de validation monte | Surajustement | Examiner les exemples de validation en échec ; choisir un point de contrôle antérieur, moins d'époques, un taux d'apprentissage plus faible, des données plus variées |
| Les deux pertes restent élevées | La tâche n'est pas apprise | Vérifier les données : exemples exacts, cohérents et représentatifs, sans scénarios manquants ni doublons |
| La récompense monte, la qualité sur les données mises de côté non | **Détournement de la récompense** (reward hacking) : le modèle exploite l'évaluateur | Tester l'évaluateur sur des réponses correctes, fausses, mal formées et adverses, et vérifier que des réponses superficielles ne peuvent pas obtenir un score élevé ; combiner des évaluateurs |
| Récompense combinée élevée, un critère faible | Un évaluateur `multi` masque une composante faible | Lire les scores par évaluateur |

Les **points de contrôle** apparaissent au fil de l'entraînement. Ne supposez pas que le dernier est le meilleur : comparez les candidats sur des tâches mises de côté, jamais sur la seule perte d'entraînement. Évaluez ensuite le modèle retenu par rapport à la **référence** (le modèle de base avec votre meilleure invite) avec le même jeu de données et les mêmes évaluateurs, et comparez les exécutions. Un modèle ajusté qui ne bat pas la référence ne vaut pas son coût d'hébergement.

En production, un déploiement ajusté a les mêmes métriques Azure Monitor que n'importe quel déploiement (latence, jetons, requêtes) et peut être couvert par l'évaluation continue. Réévaluez-le quand les données changent ou que le modèle de base approche de sa mise hors service.

Coût de l'entraînement :

| Méthode | Facturation |
| --- | --- |
| SFT | Jetons d'entraînement x époques x prix par jeton |
| DPO | Jetons d'entraînement x époques x prix par jeton |
| RFT | Heures d'entraînement plus jetons d'inférence de l'évaluateur (si un modèle évaluateur est utilisé) |

Non facturés : le temps d'attente en file, les travaux en échec, les travaux annulés avant le début de l'entraînement, les vérifications de sécurité des données, et le travail RFT perdu à cause d'une erreur du service. Une exécution annulée après son démarrage est facturée pour le travail effectué jusqu'à l'annulation, et les jetons de l'évaluateur RFT sont facturés à part, aux tarifs de zone de données, une fois l'entraînement terminé. Un travail RFT a une **limite de dépense** : une fois atteinte, l'entraînement se met en pause et crée un point de contrôle déployable ; la reprise continue sans nouvelle limite. Pour réduire les coûts : premières exécutions courtes, moins d'échantillons de validation, le plus petit évaluateur suffisant, entraînement Global quand la résidence n'est pas exigée, annulation précoce des exécutions qui n'améliorent pas la métrique cible, et alertes budgétaires dans Cost Management. La métrique `FineTunedTrainingHours` suit les heures d'entraînement.

> **Piège d'examen.** Une perte d'entraînement plus faible ne prouve pas un meilleur modèle. La bonne réponse à « quel point de contrôle déployer » est celui qui obtient le meilleur score sur la **validation ou l'évaluation mise de côté**, souvent pas le dernier.

<!-- section: lifecycle | objectives: 5.2.4 -->
## Gérer un modèle ajusté du développement à la production

1. **Préparer** des jeux d'entraînement, de validation et de test séparés.
2. **Entraîner** avec la bonne méthode et le bon type d'entraînement ; choisir un `suffix` qui identifie la version.
3. **Sélectionner un point de contrôle** sur les résultats de validation.
4. **Évaluer** sur un déploiement **Developer** : tester dans le Playground (en sélectionnant le déploiement ajusté, pas le modèle de base) et exécuter des évaluations cloud par rapport à la référence.
5. **Déployer en production** sur un déploiement serverless Standard, Data Zone Standard, Global Standard ou approvisionné, dans les limites du quota.
6. **Surveiller** les métriques et l'évaluation continue ; **itérer** (par exemple DPO sur le modèle SFT) et **retirer** : supprimer les déploiements devenus inutiles.

| Type de déploiement | Facturation | Usage |
| --- | --- | --- |
| Developer | Jetons aux tarifs Global Standard, **sans frais d'hébergement horaires** | Évaluation uniquement : **supprimé après 24 heures**, sans SLA ni résidence |
| Standard | Jetons plus des **frais d'hébergement horaires** | Production régionale avec résidence |
| Global Standard | Jetons plus frais d'hébergement horaires | Production sur capacité globale (les poids peuvent être stockés hors de votre zone géographique) |
| Provisioned Throughput | Heures de PTU, sans frais par jeton | Volume élevé et régulier |
| Data Zone Standard | Facturation au jeton | Inférence dans une zone de données (États-Unis uniquement) |

| Option de déploiement | État | Remarques |
| --- | --- | --- |
| Serverless | Disponibilité générale | Foundry héberge le modèle ; déployez depuis les détails du travail, Deploy, Serverless |
| Managed compute | Préversion | Des GPU dédiés exécutent un déploiement de base compatible LoRA avec un ou plusieurs **adaptateurs LoRA** correspondants ; facturé à l'heure GPU, même sans requêtes |
| Fireworks on Foundry | Préversion | Un adaptateur fusionné dans une copie complète du modèle de base ; un Subscription Owner ou Contributor l'active |

Le déploiement exige **Foundry Owner** ou un rôle avec `Microsoft.CognitiveServices/accounts/deployments/write`. Les déploiements serverless Standard de modèles ajustés n'existent que dans certaines régions (East US 2, North Central US, Sweden Central selon le modèle). Un adaptateur ne convient qu'au modèle de base et à la version exacts sur lesquels il a été entraîné.

Pour une nouvelle version, déployez-la dans un déploiement distinct, basculez le trafic depuis l'application ou une passerelle, gardez le déploiement précédent jusqu'à la validation du nouveau, puis supprimez l'ancien. Annuler ou terminer un travail d'entraînement ne supprime jamais les déploiements et n'arrête pas leurs frais.

> **Piège d'examen.** L'hébergement d'un modèle ajusté est facturé à l'heure **tant qu'il est déployé**, même sans trafic. « Évaluer à moindre coût pendant une journée » → déploiement Developer. « Production, les données doivent rester dans la région » → Standard. « Ne plus payer pour une ancienne version » → supprimer son déploiement.

<!-- section: key-points -->
## Points clés

- Le réglage précis modifie les poids ; il ne remplace ni RAG pour les données à jour ni les contrôles de sécurité ; comparez à la référence.
- SFT = démonstrations, DPO = paires préférée et rejetée, RFT = évaluateur (`string_check`, `text_similarity`, `score_model`, `python`, `multi`).
- Types d'entraînement : Standard (résidence), Data zone (US), Global (moins cher, sans résidence), Developer (préemptible, le moins cher).
- Foundry User entraîne, Foundry Owner déploie ; DPO après SFT utilise l'identifiant du modèle ajusté.
- Données synthétiques (préversion) : Simple Q&A ou Tool use, un fichier de moins de 20 Mo, 50 à 1 000 échantillons, répartition 80/20 facultative, sortie JSONL ; relire et mélanger avec des données réelles.
- Surajustement = perte d'entraînement en baisse, perte de validation en hausse : point de contrôle antérieur, moins d'époques ; attention au détournement de la récompense en RFT.
- SFT et DPO facturent jetons x époques (une exécution annulée paie le travail effectué) ; RFT facture les heures plus les jetons de l'évaluateur, avec une limite de dépense qui met le travail en pause.
- Déploiement Developer : 24 heures, sans frais d'hébergement ; les déploiements de production facturent l'hébergement à l'heure jusqu'à leur suppression.
