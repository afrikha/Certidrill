L'IA générative est flexible et rapide à adopter, mais elle peut se tromper avec assurance et ne donne pas toujours deux fois la même réponse. L'examen vous demande de reconnaître ces forces et ces faiblesses, les facteurs qui décident du choix d'un modèle et les métriques qui montrent si une application d'IA générative crée de la valeur métier.

<!-- section: genai-advantages | objectives: 2.2.1 -->
## Les avantages de l'IA générative

| Avantage | Ce que cela signifie | Exemple |
| --- | --- | --- |
| **Adaptabilité** | Un seul modèle de fondation traite de nombreuses tâches et domaines par des invites, sans un modèle par tâche | Le même modèle résume des contrats, rédige des e-mails et classe des tickets |
| **Réactivité** | Répond en quelques secondes, à toute heure, à grande échelle | Un assistant de support qui répond immédiatement à des milliers de clients |
| **Capacités conversationnelles** | Comprend le langage naturel, suit un dialogue et garde le contexte | Les clients décrivent un problème avec leurs mots au lieu de parcourir des menus |
| **Capacité à générer du contenu** | Crée du texte, des images, du son, de la vidéo et du code | Descriptions de produits en dix langues, premières versions de textes marketing |
| **Faible barrière à l'entrée** | Utilisable avec des invites et peu ou pas de données étiquetées | Un pilote construit en quelques jours au lieu de mois de collecte de données |
| **Personnalisation** | Adapte la sortie à chaque utilisateur | Messages adaptés à l'historique d'un client |

<!-- section: genai-disadvantages | objectives: 2.2.2 -->
## Les inconvénients de l'IA générative

| Inconvénient | Ce que cela signifie | Atténuation |
| --- | --- | --- |
| **Hallucinations** | Une sortie fluide et assurée, mais fausse ou inventée (une fausse citation, une politique qui n'existe pas) | Ancrer les réponses dans les données de l'entreprise avec le RAG, contrôles d'ancrage contextuel (contextual grounding checks) d'Amazon Bedrock Guardrails, revue humaine des réponses critiques |
| **Interprétabilité** | Il est difficile d'expliquer pourquoi le modèle a produit une réponse donnée | Demander des sources et des citations, garder des humains dans les décisions à justifier, utiliser un modèle interprétable quand la réglementation l'exige |
| **Inexactitude** | Erreurs sur les faits, les calculs ou les connaissances postérieures à la date de fin d'entraînement | RAG avec des données à jour, outils pour les calculs, évaluation avant la mise en service |
| **Non-déterminisme** | La même invite peut renvoyer des réponses différentes | Température plus basse pour une sortie plus constante, modèles d'invites fixes, validation du format de sortie |
| **Biais et toxicité** | La sortie peut refléter des biais ou du contenu nuisible des données d'entraînement | Guardrails, évaluation sur des jeux de test variés, audits humains |
| **Coût et latence** | Les grands modèles sont plus lents et plus chers par requête | Modèles plus petits, invites plus courtes, mise en cache, inférence par lots |
| **Sécurité des données et propriété intellectuelle** | Risque d'exposer des données sensibles ou de générer un contenu trop proche d'œuvres protégées | Contrôles d'accès, protection des données, filtres d'informations sensibles, revue juridique |

> **Piège d'examen.** Un modèle qui invente une source ou un fait hallucine ; la principale solution est l'ancrage par le RAG, pas une température plus élevée ni une fenêtre de contexte plus grande. Baisser la température rend les réponses plus constantes, pas forcément plus vraies.

<!-- section: model-selection-factors | objectives: 2.2.3 -->
## Les facteurs de sélection d'un modèle d'IA générative

| Facteur | Questions à se poser |
| --- | --- |
| **Type de modèle** | Génération de texte, conversation, génération d'images, intégrations, multimodal ? |
| **Exigences de performance** | Quelle qualité faut-il atteindre sur les invites de test et les jeux de référence de l'entreprise ? |
| **Capacités** | Langues, raisonnement, utilisation d'outils, taille de la fenêtre de contexte, modalités d'entrée et de sortie |
| **Contraintes** | Fenêtre de contexte, longueur maximale de sortie, disponibilité dans la Région, options de personnalisation |
| **Conformité** | Résidence des données, exigences réglementaires, conditions de licence, documentation d'IA responsable du fournisseur |
| **Coût** | Prix par jeton d'entrée et de sortie, Provisioned Throughput, coût de la personnalisation |
| **Latence** | Délai avant le premier jeton et temps de réponse total acceptables pour l'expérience utilisateur |
| **Complexité et taille du modèle** | Les grands modèles sont plus performants sur les tâches complexes, mais plus lents et plus chers ; les petits modèles suffisent souvent pour des tâches simples à gros volume |

Choisissez le plus petit modèle qui atteint le niveau de qualité : c'est en général le plus rapide et le moins cher. Amazon Bedrock Model Evaluation compare les modèles candidats sur vos propres invites avant de vous engager.

> **Conseil d'examen.** « Conversation en temps réel avec la latence la plus faible pour des questions simples » désigne un petit modèle rapide. « Analyser des graphiques et des photos avec du texte » désigne un modèle multimodal. « Garder les données dans un pays donné » est un facteur de conformité et de disponibilité dans la Région.

<!-- section: business-value-metrics | objectives: 2.2.4 -->
## La valeur métier et les métriques de l'IA générative

La valeur d'une application d'IA générative se mesure en termes métier, pas seulement par la qualité du modèle :

| Métrique | Ce qu'elle montre | Exemple |
| --- | --- | --- |
| **Performances interdomaines** | La qualité d'un même modèle sur des tâches ou des domaines métier différents | Le même assistant répond aux questions RH, finance et informatique avec une qualité acceptable |
| **Retour sur investissement (ROI)** | La valeur obtenue par rapport au coût total (développement, inférence, exploitation) | Heures d'agents économisées face aux coûts mensuels de Bedrock et de développement |
| **Efficacité** | Temps ou effort économisé par tâche | Durée moyenne de traitement d'un dossier de support passée de 12 à 7 minutes |
| **Taux de conversion** | Part des utilisateurs qui accomplissent l'action souhaitée | Plus de visiteurs achètent après avoir lu des descriptions de produits générées |
| **Revenu moyen par utilisateur (ARPU)** | Le chiffre d'affaires divisé par le nombre d'utilisateurs | Des recommandations personnalisées augmentent la dépense par client |
| **Exactitude** | Part des réponses correctes ou acceptables | Pourcentage des réponses de l'assistant validées par des experts |
| **Valeur du cycle de vie du client (CLV)** | Le chiffre d'affaires total attendu d'un client sur toute la relation | Un meilleur service augmente la fidélisation et la valeur du cycle de vie |

Mesurez une référence avant le lancement, puis comparez : un test A/B face au processus existant est la preuve de valeur la plus claire.

> **Piège d'examen.** « L'assistant d'achat a-t-il augmenté les ventes ? » se mesure par le taux de conversion ou l'ARPU, pas par une métrique technique comme ROUGE ou la latence. Les métriques techniques jugent le modèle ; les métriques métier jugent l'application.

<!-- section: key-points -->
## Points clés

- Avantages : adaptabilité, réactivité, conversation, génération de contenu, faible barrière à l'entrée.
- Inconvénients : hallucinations, faible interprétabilité, inexactitude, non-déterminisme, biais, coût et latence.
- Ancrez les réponses avec le RAG contre les hallucinations ; baissez la température pour la constance.
- Choisissez un modèle selon le type, la performance, les capacités, les contraintes, la conformité, le coût, la latence et la complexité : le plus petit modèle qui atteint le niveau.
- Valeur métier : ROI, efficacité, taux de conversion, ARPU, exactitude, valeur du cycle de vie du client, performances interdomaines.
