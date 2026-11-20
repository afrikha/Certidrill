Évaluer un modèle de fondation (FM) répond à deux questions : la sortie est-elle bonne, et l'application apporte-t-elle une valeur métier ? L'examen vous demande de choisir une approche d'évaluation (des personnes, des jeux de référence, des métriques automatiques, un modèle juge), d'associer une métrique à une tâche (ROUGE pour les synthèses, BLEU pour la traduction, BERTScore pour le sens) et de choisir la bonne mesure pour les applications RAG, les agents et les objectifs métier.

<!-- section: evaluation-approaches | objectives: 3.4.1 -->
## Approches pour évaluer les performances d'un FM

| Approche | Fonctionnement | Forces et limites |
| --- | --- | --- |
| **Évaluation avec intervention humaine (human-in-the-loop)** | Des personnes notent ou comparent les réponses selon des critères (utilité, ton, exactitude) | Saisit la nuance, le style et l'exactitude métier ; lente et coûteuse ; exige des consignes claires |
| **Jeux de données de référence (benchmarks)** | Jeux standard avec réponses attendues, notés automatiquement | Comparaison objective et reproductible des modèles ; peut ne pas refléter votre cas d'usage |
| **Jeu d'invites personnalisé** | Vos propres invites et réponses de référence | Mesure votre tâche réelle |
| **LLM-as-a-judge** | Un second modèle note chaque réponse et justifie la note | S'étend comme l'automatisation avec un jugement proche de la revue humaine ; le juge peut être biaisé |

Les **évaluations Amazon Bedrock** (la fonctionnalité Model Evaluation) proposent plusieurs types de tâches :

- **Évaluation de modèle programmatique (automatique)** : jeux de données intégrés ou personnalisés, métriques d'**exactitude** (accuracy), de **robustesse** (la sortie reste-t-elle correcte quand l'entrée change légèrement) et de **toxicité**, pour des types de tâches comme la génération de texte générale, la synthèse de texte, les questions-réponses et la classification de texte. Les jeux intégrés comprennent TriviaQA, BoolQ, Gigaword et RealToxicityPrompts.
- **Évaluation humaine** : votre propre équipe de travail (employés ou experts métier) note jusqu'à deux modèles ou jeux de réponses avec des méthodes comme le pouce levé ou baissé, une échelle de Likert, des boutons de choix ou un classement ordinal, sur des métriques que vous définissez. Un jeu d'invites personnalisé peut contenir jusqu'à 1 000 invites.
- **LLM-as-a-judge** : un modèle générateur répond, un modèle évaluateur note des métriques intégrées comme l'exactitude (correctness), l'exhaustivité (completeness), la fidélité (faithfulness), l'utilité (helpfulness), la cohérence logique, la pertinence, le respect des instructions, le style et le ton professionnels, la nocivité (harmfulness), les stéréotypes et le refus, ou des métriques personnalisées.
- **Évaluation RAG** des bases de connaissances (sections suivantes).

Vous pouvez aussi évaluer des réponses produites en dehors d'Amazon Bedrock en apportant vos propres réponses d'inférence. Les rapports sont stockés dans le compartiment Amazon S3 que vous indiquez.

> **Conseil d'examen.** « Comparer des modèles sur notre propre tâche avec des critères subjectifs comme le ton de la marque » = évaluation humaine. « Comparaison rapide et reproductible avec des métriques standard » = évaluation automatique. « Un jugement de type humain à grande échelle sans équipe » = LLM-as-a-judge.

<!-- section: evaluation-metrics | objectives: 3.4.2 -->
## Métriques pour évaluer la sortie d'un FM

| Métrique | Ce qu'elle mesure | Tâche typique |
| --- | --- | --- |
| **ROUGE** (Recall-Oriented Understudy for Gisting Evaluation) | Recouvrement de mots et de n-grammes entre le texte généré et une référence, orienté rappel (quelle part de la référence est couverte) ; ROUGE-N pour les n-grammes, ROUGE-L pour la plus longue sous-séquence commune | **Synthèse** |
| **BLEU** (Bilingual Evaluation Understudy) | Précision des n-grammes de la sortie par rapport à un ou plusieurs textes de référence, avec une pénalité pour les sorties trop courtes | **Traduction automatique** |
| **BERTScore** | Similarité de sens, calculée en comparant les vectorisations contextuelles de la sortie et de la référence ; valorise les paraphrases qui emploient d'autres mots | **Similarité sémantique**, synthèses et réponses formulées autrement que la référence |
| **F1, correspondance exacte** | Recouvrement de mots entre la réponse et la réponse attendue | Questions-réponses |
| **Exactitude (accuracy)** | Part de prédictions correctes | Classification |
| **LLM-as-a-judge** | Un modèle applique une grille pour noter des qualités que les métriques de n-grammes ne voient pas | Réponses ouvertes : utilité, fidélité, nocivité |

> **Piège d'examen.** ROUGE et BLEU comptent les mots identiques : une paraphrase correcte peut obtenir un score faible. Quand l'exigence est « même sens malgré une formulation différente », choisissez BERTScore. L'exactitude, la précision, le rappel et le score F1 des modèles de ML classiques ne sont pas les métriques de la génération de texte libre.

<!-- section: business-objectives | objectives: 3.4.3 -->
## Le FM répond-il aux objectifs métier ?

Un modèle qui obtient de bons scores sur les benchmarks peut quand même échouer côté métier. Évaluez-le par rapport à l'objectif du projet :

- **Productivité** : temps gagné par tâche, documents traités par heure, part des brouillons acceptés sans modification importante.
- **Engagement des utilisateurs** : utilisateurs actifs, taux de retour, durée des sessions, utilisation des suggestions.
- **Ingénierie des tâches (task engineering)** : la tâche a-t-elle été conçue pour que le FM puisse réussir : définition claire de la tâche, bon découpage en étapes, bonnes entrées et critères de réussite convenus avant le lancement.

Comparez la solution à base de FM avec le processus actuel ou une référence, et avec des options moins chères comme un modèle plus petit ou une meilleure invite. Menez des pilotes ou des tests A/B avec de vrais utilisateurs avant un déploiement complet.

<!-- section: application-evaluation | objectives: 3.4.4 -->
## Évaluer les applications créées avec des FM

Une application ajoute des composants autour du modèle (récupération, outils, étapes), et chacun peut échouer.

| Application | Ce qu'il faut évaluer | Prise en charge AWS |
| --- | --- | --- |
| **RAG** | Récupération : les passages récupérés sont-ils pertinents et complets ? Génération : la réponse est-elle correcte, complète et fidèle aux passages, avec des citations exactes ? | Évaluation RAG d'Amazon Bedrock : tâches **retrieve-only** (pertinence du contexte, couverture du contexte) et **retrieve-and-generate** (exactitude, exhaustivité, utilité, cohérence logique, fidélité, précision des citations, couverture des citations, nocivité, stéréotypes, refus) ; fonctionne avec Amazon Bedrock Knowledge Bases ou vos propres réponses RAG |
| **Agents** | L'agent a-t-il atteint l'objectif de l'utilisateur ? A-t-il choisi le bon outil avec les bons paramètres à chaque étape ? | **Amazon Bedrock AgentCore Evaluations** : évaluateurs par session (goal success rate, taux de réussite de l'objectif), par trace (exactitude, utilité, fidélité) et par appel d'outil (tool selection accuracy, tool parameter accuracy) |
| **Flux de travail** | Résultat de bout en bout et chaque étape : erreurs, latence et coût par étape | Évaluez chaque étape d'invite ou de modèle, puis le flux complet sur des cas de test |

> **Piège d'examen.** Une mauvaise réponse RAG a deux causes possibles. Une pertinence ou une couverture du contexte faible signifie que la **récupération** est en cause (découpage, vectorisations, source de données) ; un bon contexte avec une fidélité faible signifie que la **génération** est en cause (modèle ou invite).

<!-- section: alignment-metrics | objectives: 3.4.5 -->
## Métriques d'alignement sur les objectifs métier

| Métrique | Ce qu'elle montre |
| --- | --- |
| **Taux d'achèvement des tâches** | Part des requêtes ou des sessions où la tâche de l'utilisateur a été accomplie, sans transfert à une personne |
| **Satisfaction des utilisateurs** | Notes, pouce levé ou baissé, enquêtes de satisfaction, réclamations |
| **Coût par interaction** | Coût des jetons et de l'infrastructure divisé par le nombre d'interactions ; à comparer avec le coût de la même interaction traitée par une personne |
| **Taux de résolution autonome ou d'escalade** | Part des conversations résolues par l'assistant par rapport à celles transférées à un agent |
| **Taux de conversion, revenu par utilisateur** | Effet commercial des recommandations ou des assistants d'IA |

> **Conseil d'examen.** « Le chatbot réduit-il la charge des agents humains ? » = taux d'achèvement des tâches ou de résolution autonome. « La solution est-elle économique ? » = coût par interaction. « Les clients l'apprécient-ils ? » = satisfaction des utilisateurs.

<!-- section: key-points -->
## Points clés

- Approches : évaluation humaine, jeux de référence, jeux personnalisés, LLM-as-a-judge.
- Évaluations Amazon Bedrock : automatique (exactitude, robustesse, toxicité), humaine (votre équipe, jusqu'à deux modèles), LLM-as-a-judge, évaluation RAG.
- ROUGE = synthèses (rappel), BLEU = traduction (précision), BERTScore = sens, LLM-as-a-judge = qualité des réponses ouvertes.
- RAG : évaluez séparément la récupération et la génération ; agents : réussite de l'objectif et utilisation des outils (AgentCore Evaluations).
- Métier : productivité, engagement, taux d'achèvement des tâches, satisfaction des utilisateurs, coût par interaction.
