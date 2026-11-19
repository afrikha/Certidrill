Ce chapitre pose le vocabulaire qu'utilisent tous les autres chapitres : ce que sont l'IA, le ML, le deep learning, l'IA générative et l'IA agentique et comment ils s'emboîtent, comment un modèle entraîné est utilisé pour l'inférence, quels types de données les modèles consomment et les trois façons dont un modèle apprend. L'examen donne un court scénario et vous demande de nommer le concept, le type d'inférence ou le type d'apprentissage.

<!-- section: ai-terms | objectives: 1.1.1 -->
## Les termes de base de l'IA

| Terme | Définition |
| --- | --- |
| **Intelligence artificielle (IA)** | Le vaste domaine des systèmes qui effectuent des tâches associées à l'intelligence humaine : percevoir, raisonner, apprendre, décider |
| **Machine learning (ML)** | Une branche de l'IA dans laquelle un système apprend des motifs à partir de données au lieu de suivre des règles écrites à la main |
| **Algorithme** | La procédure qui apprend à partir des données (par exemple régression linéaire, arbre de décision, k-means) |
| **Modèle** | Le résultat de l'entraînement d'un algorithme sur des données : des paramètres appris qui transforment une entrée en prédiction |
| **Entraînement** | Fournir des données à un algorithme pour qu'il ajuste les paramètres du modèle |
| **Inférence** | Utiliser un modèle entraîné pour faire une prédiction ou générer une sortie à partir d'une nouvelle entrée |
| **Réseau neuronal** | Des couches de nœuds connectés (neurones) dont les poids sont ajustés pendant l'entraînement |
| **Deep learning** | Du ML avec des réseaux neuronaux à nombreuses couches ; il apprend seul les caractéristiques des images, du son et du texte |
| **Vision par ordinateur** | L'IA qui interprète les images et les vidéos : classer, détecter des objets, lire du texte, reconnaître des visages |
| **Traitement du langage naturel (NLP)** | L'IA qui comprend et produit le langage humain : sentiment, entités, traduction, synthèses |
| **Grand modèle de langage (LLM)** | Un très grand modèle de deep learning entraîné sur d'énormes quantités de texte, qui comprend et génère du langage |
| **IA générative** | L'IA qui crée du contenu nouveau (texte, images, son, vidéo, code) au lieu de seulement classer ou prédire |
| **IA agentique** | Des systèmes d'IA qui poursuivent un objectif de façon autonome : ils planifient des étapes, appellent des outils et agissent, avec peu d'intervention humaine |

Trois termes décrivent la qualité d'un modèle :

- L'**ajustement (fit)** mesure à quel point le modèle capture le vrai motif. **Surajustement (overfitting)** : excellent sur les données d'entraînement, mauvais sur de nouvelles données (le modèle a mémorisé le bruit ; variance élevée). **Sous-ajustement (underfitting)** : mauvais sur les deux (le modèle est trop simple ou pas assez entraîné ; biais élevé). Un bon ajustement se généralise à des données jamais vues.
- Le **biais** a deux sens. En statistique du ML, c'est une erreur systématique qui provoque le sous-ajustement. En IA responsable, c'est une différence injuste de résultats entre des groupes, souvent causée par des données d'entraînement non représentatives.
- L'**équité** est l'objectif que les résultats d'un modèle ne désavantagent personne en raison d'attributs comme le genre, l'âge ou l'origine ethnique.

> **Piège d'examen.** « L'exactitude est de 99 % sur les données d'entraînement mais de 70 % sur de nouvelles données », c'est du surajustement. Remèdes : des données d'entraînement plus nombreuses et plus variées, un modèle plus simple, la régularisation ou l'arrêt anticipé (early stopping). Entraîner plus longtemps aggrave le surajustement.

<!-- section: ai-ml-genai-differences | objectives: 1.1.2 -->
## Les liens entre IA, ML, deep learning, IA générative et IA agentique

Chaque terme est un sous-ensemble du précédent, sauf l'IA agentique, qui est une façon d'utiliser les modèles :

| Niveau | Ce qu'il ajoute | Exemple |
| --- | --- | --- |
| IA | Toute technique qui imite un comportement intelligent, y compris des règles fixes | Un moteur de règles qui approuve les notes de frais |
| ML | Apprend à partir des données | Un modèle qui prédit l'attrition des clients à partir de l'historique |
| Deep learning | Réseaux neuronaux à nombreuses couches, fonctionne sur des données non structurées | Un modèle qui détecte des défauts sur des photos de produits |
| IA générative | Des modèles de deep learning (modèles de fondation) qui génèrent du contenu nouveau | Un assistant qui rédige des descriptions de produits |
| IA agentique | Un modèle qui raisonne, planifie, utilise des outils et agit vers un objectif | Un agent qui lit un ticket de support, consulte le système de commandes et émet un remboursement |

Similitudes : tous reposent sur des données et des modèles ; le ML, le deep learning et l'IA générative sont entraînés puis utilisés pour l'inférence. Différences : le ML traditionnel prédit ou classe à partir de données surtout structurées et demande en général un modèle par tâche ; l'IA générative utilise un seul grand modèle de fondation préentraîné pour de nombreuses tâches ; l'IA agentique place un modèle dans une boucle de raisonnement, d'appels d'outils et de mémoire pour accomplir des tâches en plusieurs étapes, et pas seulement une réponse.

<!-- section: inference-types | objectives: 1.1.3 -->
## Les types d'inférence

La façon de servir les prédictions dépend de la latence attendue, de la taille des données envoyées et du trafic. Amazon SageMaker AI propose une option pour chaque cas :

| Type | Fonctionnement | Choisissez-le quand | Option de SageMaker AI |
| --- | --- | --- | --- |
| **En temps réel** | Un point de terminaison persistant répond à chaque requête en quelques millisecondes | Usage interactif à faible latence : contrôle de fraude pendant un paiement, recommandations de produits sur une page | Point de terminaison d'inférence en temps réel |
| **Sans serveur** | Le point de terminaison s'adapte automatiquement et descend à zéro quand il est inactif ; vous payez à l'usage | Trafic intermittent ou imprévisible, avec des périodes d'inactivité, qui tolère les démarrages à froid | Serverless Inference |
| **Asynchrone** | Les requêtes sont mises en file d'attente ; l'entrée et la sortie sont dans Amazon S3 ; notification Amazon SNS en option | Charges utiles volumineuses (jusqu'à 1 Go) ou traitement long (jusqu'à une heure) avec un besoin proche du temps réel | Asynchronous Inference (peut descendre à zéro) |
| **Par lots** | Une tâche traite tout un jeu de données d'un coup, sans point de terminaison persistant | Prédictions pour de nombreux enregistrements selon un calendrier, sans besoin immédiat du résultat : notation nocturne de tous les clients | Batch transform |

Serverless Inference ne prend pas en charge les GPU. Amazon Bedrock fait la même distinction pour les modèles de fondation : appels à la demande pour l'usage interactif et tâches d'inférence par lots pour les gros volumes hors ligne, à prix réduit.

> **Piège d'examen.** « Résultat en quelques millisecondes », c'est le temps réel ; « gros fichiers, minutes de traitement, notifier à la fin », c'est l'asynchrone ; « noter tout le jeu de données chaque nuit », c'est le traitement par lots ; « quelques requêtes par jour, coût minimal, démarrages à froid acceptables », c'est le sans serveur.

<!-- section: data-types | objectives: 1.1.4 -->
## Les types de données

| Type | Ce que c'est | Usage typique |
| --- | --- | --- |
| **Étiquetées** | Chaque exemple porte la bonne réponse (l'étiquette ou cible) | Apprentissage supervisé : e-mails marqués comme spam ou non |
| **Non étiquetées** | Des exemples sans réponse | Apprentissage non supervisé, préentraînement des modèles de fondation |
| **Structurées** | Organisées selon un schéma fixe de lignes et de colonnes | Bases de données, feuilles de calcul |
| **Tabulaires** | Données structurées en tableau : chaque ligne un enregistrement, chaque colonne une caractéristique | Fiches clients pour prédire l'attrition |
| **Séries chronologiques** | Valeurs enregistrées dans l'ordre du temps à intervalles réguliers | Ventes par jour pour les prévisions, relevés de capteurs |
| **Non structurées** | Sans schéma prédéfini | Texte libre, images, son, vidéo |
| **Texte** | Données de langage non structurées | Avis, tickets de support, contrats |
| **Images** | Des pixels, non structurés | Photos de produits, imagerie médicale, documents numérisés |

Les données semi-structurées (JSON, journaux) ont des balises mais pas de schéma rigide. L'étiquetage est souvent l'étape la plus coûteuse d'un projet supervisé, car des humains doivent fournir les réponses.

<!-- section: learning-types | objectives: 1.1.5 -->
## Les types d'apprentissage

| Type | Données | Comment il apprend | Exemples |
| --- | --- | --- | --- |
| **Apprentissage supervisé** | Étiquetées | Apprend la correspondance entre des entrées et des sorties connues | Classification (détection de spam, étiquettes d'images), régression (prix des maisons) |
| **Apprentissage non supervisé** | Non étiquetées | Trouve seul une structure | Clustering (segments de clients), détection d'anomalies, réduction de dimension |
| **Apprentissage par renforcement (RL)** | Pas de jeu de données : un environnement | Un agent effectue des actions, reçoit des récompenses ou des pénalités et apprend la stratégie qui maximise la récompense totale | Robotique, jeux, optimisation d'itinéraires, conduite autonome en simulation |

Deux variantes apparaissent autour des modèles de fondation. L'**apprentissage autosupervisé** crée les étiquettes à partir des données elles-mêmes (prédire le mot suivant d'une phrase) : c'est ainsi que les LLM sont préentraînés sur du texte non étiqueté. L'**apprentissage par renforcement à partir des commentaires humains (RLHF)** utilise le classement des réponses du modèle par des humains comme récompense pour aligner un modèle sur les préférences humaines. L'**apprentissage semi-supervisé** combine quelques exemples étiquetés avec de nombreux exemples non étiquetés.

> **Piège d'examen.** « Des transactions historiques marquées frauduleuses ou légitimes », c'est de l'apprentissage supervisé, même si l'objectif est de « détecter la fraude ». « Trouver des transactions inhabituelles sans exemple de fraude », c'est du non supervisé (détection d'anomalies). « Apprend à partir de récompenses par essais et erreurs », c'est l'apprentissage par renforcement, jamais le supervisé.

<!-- section: key-points -->
## Points clés

- L'IA contient le ML, qui contient le deep learning, qui contient l'IA générative ; l'IA agentique utilise des modèles pour planifier et agir avec des outils.
- Un modèle est le résultat de l'entraînement d'un algorithme sur des données ; l'inférence l'utilise sur de nouvelles données.
- Surajustement : très bon sur les données d'entraînement, mauvais sur de nouvelles données. Sous-ajustement : mauvais sur les deux.
- Inférence : en temps réel (millisecondes), sans serveur (intermittente, descend à zéro), asynchrone (charges volumineuses, traitement long, file d'attente), par lots (tout le jeu de données, pas de point de terminaison).
- Le supervisé a besoin d'étiquettes, le non supervisé trouve une structure sans étiquettes, le renforcement apprend à partir de récompenses.
