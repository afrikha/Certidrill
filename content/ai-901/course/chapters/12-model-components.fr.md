Une solution d'IA générative commence par trois choix : un modèle, un déploiement et quelques paramètres. L'examen vérifie que vous comprenez ce qu'un modèle fait d'une invite, que vous savez associer un type de modèle à un besoin, et que vous savez ce que change chaque option de déploiement et chaque paramètre.

<!-- section: how-generative-models-work | objectives: 1.2.1 -->
## Le fonctionnement des modèles IA génératifs

Un grand modèle de langage (LLM) est entraîné sur d'énormes volumes de texte pour générer une **complétion** à partir d'une **invite** (prompt). Il fonctionne comme la saisie prédictive : il prédit le jeton suivant le plus probable, l'ajoute à la séquence et recommence jusqu'à prédire que la séquence est terminée.

| Étape | Ce qui se passe |
| --- | --- |
| **Tokenisation** | Le texte est découpé en jetons (tokens) : mots entiers, fragments de mots, ponctuation. Chaque jeton a un identificateur numérique |
| **Embeddings** | Chaque jeton est représenté par un vecteur, un tableau de nombres qui encode son sens. Les jetons employés dans des contextes similaires ont des vecteurs de directions voisines : « dog » est proche de « puppy » et loin de « skateboard » |
| **Attention** | L'architecture transformer pondère l'influence de chaque jeton de la séquence sur les autres. Dans « I heard a dog bark », « heard » et « dog » comptent plus que « I » ou « a » pour prédire « bark » |
| **Prédiction** | À partir des jetons déjà présents, le modèle calcule le jeton suivant le plus probable |

Ce qui en découle :

- **Le jeton est l'unité de travail.** Les limites, les limites de débit et la consommation se comptent en jetons, pour l'invite comme pour la réponse.
- **La génération est probabiliste.** La même invite peut produire une formulation légèrement différente d'un appel à l'autre.
- **Le modèle prédit un texte plausible ; il ne consulte pas des faits.** Il peut se tromper, et il ne connaît que ses données d'entraînement, sauf si l'invite apporte du contexte. Récupérer des documents et les ajouter à l'invite s'appelle la génération augmentée par récupération (RAG) : la réponse est alors **ancrée** dans ces informations.
- **L'entraînement et l'inférence sont deux moments différents.** L'entraînement ajuste le modèle sur des données ; l'inférence consiste à utiliser le modèle entraîné pour générer une réponse.

Les petits modèles de langage (SLM) comme Phi-4 fonctionnent de la même façon avec moins de ressources. Un **modèle de base** (foundation model) est un grand modèle préentraîné aux capacités générales, utilisable dès qu'il est déployé.

<!-- section: choosing-a-model | objectives: 1.2.2 -->
## Choisir un modèle selon ses fonctionnalités

Le **catalogue de modèles** de Foundry répertorie des modèles de Microsoft, d'OpenAI et de nombreux autres fournisseurs. Chaque entrée donne les fonctionnalités du modèle, des résultats de benchmarks et une carte de modèle. Les classements de modèles ordonnent les modèles par qualité, sécurité et débit, et vous pouvez tester un candidat dans un terrain de jeu.

| Besoin | Type de modèle | Exemples cités par Microsoft Learn |
| --- | --- | --- |
| Conversation, réponse aux questions, rédaction et résumé de texte | Modèle de conversation (génération de texte) | GPT-4.1, Claude, Mistral Large |
| Raisonnement en plusieurs étapes, planification, agents qui enchaînent des outils | Modèle de raisonnement | Famille GPT-5 |
| Gros volume, faible latence ou faible coût ; applications légères | Modèle plus petit ou SLM | Variantes « mini » et « nano », Phi-4 |
| Recherche sémantique, comparaison du sens de textes | Modèle d'embedding | text-embedding-3-small |
| Invites contenant des images ou de l'audio en plus du texte | Modèle multimodal | GPT-4.1, Phi-4-multimodal-instruct |
| Créer une image à partir d'une description | Modèle de génération d'images | Famille GPT-Image-1 (GPT-Image-1.5, GPT-Image-1-Mini), FLUX |
| Créer une vidéo | Modèle de génération de vidéos | Sora 2 (préversion) |
| Une tâche bien définie avec une sortie prévisible et structurée | Un outil Foundry (Foundry Tools) plutôt qu'un modèle du catalogue | Azure Language, Azure Speech, Azure Content Understanding |

> **Piège d'examen.** Un modèle d'embedding renvoie des vecteurs, pas du texte : il ne peut pas tenir une conversation. Un modèle de conversation qui n'accepte que du texte ne peut pas décrire une image ; il faut un modèle multimodal. Lisez la fonctionnalité exigée par la question avant de regarder les noms de modèles.

<!-- section: deployment-options | objectives: 1.2.3 -->
## Options de déploiement

Un modèle doit être déployé avant qu'une application puisse l'appeler. Le déploiement alloue du calcul, crée un point de terminaison d'API, fige la configuration (version du modèle, paramètres de sécurité) et démarre la surveillance de l'utilisation, de la latence, des erreurs et du coût. Au déploiement, vous choisissez :

- le **nom du déploiement**, que le code passe comme modèle à appeler (par défaut, le nom du modèle) ;
- la **version du modèle** ;
- le **type de déploiement** ;
- la limite de débit en **jetons par minute (TPM)**.

Le type de déploiement décide où les requêtes sont traitées et comment vous payez :

| Type de déploiement | Où les données sont traitées | Facturation | À choisir pour |
| --- | --- | --- | --- |
| **Global Standard** | N'importe quelle région Azure | Paiement au jeton | Le choix par défaut : quota le plus élevé, disponibilité la plus large |
| **Data Zone Standard** | Dans la zone de données (États-Unis, UE ou APAC) | Paiement au jeton | Une exigence de zone de données |
| **Standard** | Dans la zone géographique Azure de la ressource | Paiement au jeton | Une exigence régionale, volume faible à moyen |
| **Provisioned** (global, zone de données ou régional) | Les trois mêmes choix | Unités de débit approvisionné (PTU) réservées | Un gros volume prévisible et une latence régulière |
| **Batch** (global ou zone de données) | Les mêmes choix | Environ 50 % moins cher, résultats visés sous 24 heures | De gros traitements qui n'ont pas besoin d'une réponse immédiate |

Un déploiement qui reçoit plus de jetons ou de requêtes que sa limite ne le permet subit une **limitation** (throttling) : l'application reçoit des erreurs de limite de débit. La limite compte les jetons réellement envoyés et générés, pas le nombre maximal de jetons de sortie fixé dans la requête : un plafond plus élevé ne réserve rien. Les remèdes : raccourcir les invites, limiter la sortie générée à ce dont le scénario a besoin, envoyer moins de requêtes simultanées ou les étaler dans le temps, réessayer avec un délai d'attente croissant (backoff), relever le TPM attribué au déploiement, ou passer en batch le travail qui peut attendre.

> **Piège d'examen.** Batch est moins cher mais pas en temps réel : ne le choisissez jamais pour une application de conversation. « Garder le traitement dans l'UE » désigne un déploiement de zone de données, pas Global Standard.

<!-- section: model-parameters | objectives: 1.2.3 -->
## Paramètres de configuration

Les paramètres se règlent dans le terrain de jeu ou se passent dans la requête. Ils changent le comportement, le coût et la vitesse du modèle, pas le modèle lui-même.

| Paramètre | Effet | Usage type |
| --- | --- | --- |
| **Instructions système** | Fixent le rôle, le ton et les règles du modèle pour toute la conversation | « Vous êtes un assistant de support. Répondez en trois puces. » |
| **Température** | Contrôle le caractère aléatoire. Une valeur basse donne des réponses ciblées et reproductibles ; une valeur haute des réponses variées et créatives | Basse pour les faits et l'extraction ; plus haute pour un remue-méninges ou de la fiction |
| **Top P** | Une autre façon de contrôler le caractère aléatoire | Modifiez la température ou Top P, pas les deux à la fois |
| **Nombre maximal de jetons de sortie** | Plafonne la longueur de la réponse ; seuls les jetons réellement générés comptent dans la limite TPM | Maîtriser les coûts et le temps de réponse |

> **Piège d'examen.** Baisser la température rend les réponses plus régulières ; cela ne les raccourcit pas et ne garantit pas qu'elles soient vraies. Le nombre maximal de jetons de sortie coupe la réponse quand le plafond est atteint ; il ne demande pas au modèle d'être concis. Pour obtenir une réponse courte, dites-le dans les instructions.

<!-- section: key-points -->
## Points clés

- Une invite en entrée, une complétion en sortie : jetons, embeddings (vecteurs de sens), attention, prédiction du jeton suivant.
- La génération est probabiliste ; ancrer l'invite dans des données (RAG) réduit les réponses fausses.
- Associez la fonctionnalité : conversation, raisonnement, petit et rapide, embeddings, multimodal, génération d'images ou de vidéos, ou un outil Foundry pour une tâche fixe.
- Un déploiement a un nom, une version, un type et une limite TPM ; le code appelle le nom du déploiement.
- Global Standard par défaut ; Data Zone ou Standard pour la résidence des données ; Provisioned pour un débit réservé ; Batch pour de gros traitements asynchrones.
- Température : variété. Nombre maximal de jetons de sortie : longueur. Instructions système : rôle et règles.
