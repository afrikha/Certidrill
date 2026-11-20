L'IA générative crée du contenu nouveau à partir d'une invite (prompt). Pour lire les questions de l'examen, vous devez connaître ses briques de base (jetons, vectorisations, transformateurs, modèles de fondation), ses cas d'utilisation typiques, le cycle de vie d'un modèle de fondation, l'effet de la tarification par jeton sur le coût et la rapidité, la façon de concevoir le contexte donné à un modèle et les concepts de base de l'IA agentique.

<!-- section: genai-building-blocks | objectives: 2.1.1 -->
## Les concepts fondamentaux de l'IA générative

| Concept | Définition |
| --- | --- |
| **Jeton (token)** | L'unité de texte qu'un modèle lit et écrit : un mot, une partie de mot ou un signe de ponctuation. Les invites, les réponses, les limites et les prix se comptent en jetons |
| **Fenêtre contextuelle (context window)** | Le nombre maximal de jetons qu'un modèle peut prendre en compte dans une requête, invite et réponse ensemble |
| **Découpage (chunking)** | Diviser les longs documents en morceaux plus petits (chunks) avant de créer les vectorisations, pour ne récupérer que les morceaux pertinents et tenir dans la fenêtre contextuelle |
| **Vectorisation (embedding)** | Une représentation numérique du sens d'un texte, d'une image ou d'un autre élément, produite par un modèle de vectorisation : des éléments de sens proche obtiennent des vecteurs proches |
| **Vecteur** | La liste ordonnée de nombres qui stocke une vectorisation ; une base de données vectorielle trouve les vecteurs les plus proches d'une requête (recherche sémantique) |
| **Ingénierie de requête (prompt engineering)** | Rédiger et structurer l'entrée (instructions, contexte, exemples) pour obtenir une meilleure sortie sans modifier le modèle |
| **Transformateur (transformer)** | L'architecture de réseau neuronal des LLM modernes : son mécanisme d'auto-attention pèse la relation de chaque jeton avec tous les autres et traite la séquence en parallèle |
| **Grand modèle de langage (LLM)** | Un modèle basé sur des transformateurs, entraîné sur d'énormes volumes de texte à prédire le jeton suivant, ce qui lui permet de répondre, résumer, traduire et rédiger |
| **Modèle de fondation (FM)** | Un grand modèle préentraîné sur des données larges, surtout non étiquetées, qui peut être adapté à de nombreuses tâches ; les LLM sont un type de FM |
| **Modèle multimodal** | Un modèle qui accepte ou produit plusieurs types de données, par exemple du texte et des images en entrée, du texte en sortie |
| **Modèle de diffusion** | Un modèle qui génère des images (ou de la vidéo, du son) en partant d'un bruit aléatoire qu'il retire étape par étape, guidé par l'invite ; les modèles Stable Diffusion en sont un exemple dans Amazon Bedrock |

> **Piège d'examen.** Les vectorisations ne sont pas des copies compressées du texte : elles capturent le sens. « Trouver les documents qui veulent dire la même chose que la question, même avec d'autres mots », c'est de la recherche sémantique avec des vectorisations dans un magasin de vecteurs, pas une recherche par mots clés.

<!-- section: genai-use-cases | objectives: 2.1.2 -->
## Les cas d'utilisation de l'IA générative

| Cas d'utilisation | Exemple |
| --- | --- |
| Génération d'images, de vidéos et de sons | Images de produits pour un catalogue, courtes vidéos marketing, voix off |
| Synthèse | Résumés de transcriptions d'appels, de longs rapports ou de contrats |
| Assistants d'IA | Un assistant interne qui répond en langage naturel aux questions des employés |
| Traduction | Traduire et localiser du contenu avec le bon ton |
| Génération de code | Générer, expliquer et tester du code à partir d'une description |
| Agents du service client | Des agents qui répondent, consultent les commandes et résolvent les demandes à toute heure |
| Recherche | Des réponses en langage naturel à partir des documents d'une entreprise, avec citations |
| Moteurs de recommandation | Des descriptions et suggestions de produits personnalisées, générées pour chaque client |

<!-- section: fm-lifecycle | objectives: 2.1.3 -->
## Le cycle de vie d'un FM

| Étape | Ce qui se passe |
| --- | --- |
| 1. **Sélection des données** | Choisir et organiser des données d'entraînement volumineuses, variées et de qualité ; retirer le contenu nuisible, dupliqué ou sans licence |
| 2. **Sélection du modèle** | Choisir l'architecture et la taille ou, pour la plupart des entreprises, un FM existant adapté à la tâche, au coût et à la latence |
| 3. **Préentraînement** | Un entraînement autosupervisé sur d'énormes données non étiquetées donne au modèle des connaissances générales ; très coûteux, réalisé par les fournisseurs de modèles |
| 4. **Réglage précis (fine-tuning)** | Un entraînement supplémentaire sur des données plus petites, propres à une tâche ou à un domaine, souvent étiquetées, adapte le modèle |
| 5. **Évaluation** | Mesurer la qualité, la sûreté et les biais avec des jeux de référence, des métriques et une revue humaine |
| 6. **Déploiement** | Servir le modèle pour l'inférence par une API ou un point de terminaison |
| 7. **Commentaires** | Recueillir les retours des utilisateurs et les résultats de surveillance pour améliorer les invites, les données ou le modèle à l'itération suivante |

> **Piège d'examen.** Le préentraînement vient toujours avant le réglage précis ; l'évaluation vient avant le déploiement, et les commentaires bouclent le cycle. Une entreprise qui utilise Amazon Bedrock commence à la sélection du modèle : le fournisseur a déjà fait la sélection des données et le préentraînement.

<!-- section: token-pricing | objectives: 2.1.4 -->
## La tarification basée sur des jetons

Avec l'inférence à la demande, Amazon Bedrock facture chaque jeton d'entrée et chaque jeton de sortie, à un tarif par million de jetons qui dépend du modèle et de la Région. Les jetons de sortie coûtent en général plus cher que les jetons d'entrée. Les conséquences :

| Facteur | Effet sur le coût | Effet sur les performances |
| --- | --- | --- |
| Longues invites (instructions, documents récupérés, historique de conversation) | Plus de jetons d'entrée facturés à chaque requête | Latence plus élevée avant le premier jeton |
| Longues réponses | Plus de jetons de sortie facturés | Le temps de génération augmente avec le nombre de jetons de sortie |
| Réglage de longueur maximale (`maxTokens`) | Plafonne les jetons de sortie, donc le coût, de chaque réponse | Les réponses courtes arrivent plus vite, mais peuvent être tronquées |
| Modèle plus grand et plus performant | Prix par jeton plus élevé | Souvent plus lent ; meilleur sur les tâches complexes |
| Mise en cache des invites d'un préfixe répété | Les jetons d'entrée en cache sont facturés à un tarif réduit | Latence plus faible pour les requêtes qui réutilisent le préfixe |
| Inférence par lots | Prix inférieur à celui de l'inférence à la demande pour certains modèles | Les résultats arrivent plus tard, de façon asynchrone |

Les images, le son et la vidéo sont aussi convertis en jetons ou facturés à l'unité par les modèles multimodaux. Réduire les jetons (invites concises, uniquement les morceaux pertinents, historique résumé) diminue à la fois le coût et la latence.

<!-- section: context-engineering | objectives: 2.1.5 -->
## L'ingénierie du contexte

Un modèle ne connaît que ses données d'entraînement et ce qui se trouve dans sa fenêtre contextuelle au moment de la requête. L'**ingénierie du contexte (context engineering)** est la conception de tout ce qui est placé dans cette fenêtre à chaque appel, alors que l'ingénierie de requête porte sur la formulation des instructions. Le contexte d'une application de FM peut contenir :

- les instructions système (rôle, règles, format de sortie) et quelques exemples ;
- les connaissances récupérées pour cette requête (morceaux RAG, résultats de base de données) ;
- l'historique de la conversation et la mémoire des sessions précédentes ;
- les définitions des outils et les résultats de leurs appels ;
- l'entrée de l'utilisateur.

Une bonne ingénierie du contexte ne sélectionne que les informations pertinentes, les ordonne et les structure, résume ou réduit l'historique ancien, garde les parties statiques au début pour qu'elles puissent être mises en cache et respecte le budget de jetons. Trop peu de contexte provoque des hallucinations ; trop de contexte augmente le coût et la latence et peut noyer les faits importants. Elle compte surtout pour les agents, dont le contexte grandit à chaque étape.

<!-- section: agentic-concepts | objectives: 2.1.6 -->
## Les concepts de l'IA agentique

Un **agent d'IA** associe un modèle de fondation à des outils, une mémoire et une boucle : il raisonne sur l'objectif, choisit une action, appelle un outil, observe le résultat et recommence jusqu'à ce que la tâche soit terminée.

| Concept | Ce que cela signifie |
| --- | --- |
| **Utilisation des outils** | Le modèle décide d'appeler une fonction ou une API (recherche, base de données, calculatrice, système métier), reçoit le résultat et l'utilise à l'étape suivante |
| **Gestion de la mémoire** | La mémoire à court terme garde la conversation et l'état de la session en cours ; la mémoire à long terme garde des faits et des préférences d'une session à l'autre, souvent résumés et récupérés quand ils sont utiles |
| **Model Context Protocol (MCP)** | Un standard ouvert qui connecte les agents aux systèmes externes d'une façon uniforme : un serveur MCP expose des outils, des ressources de données et des invites, et tout agent compatible MCP (le client) peut les découvrir et les utiliser sans code d'intégration spécifique |
| **Orchestration des flux de travail** | Coordonner les étapes : un flux de travail prédéfini exécute des étapes fixes dans l'ordre ; un agent planifie ses étapes de façon dynamique ; les deux peuvent inclure une approbation humaine pour les actions sensibles |
| **Modèles de systèmes multi-agents** | Plusieurs agents spécialisés résolvent une tâche complexe : un superviseur (orchestrateur) délègue à des agents exécutants, qui peuvent être exposés comme des outils ; un pipeline séquentiel transmet les résultats d'un agent à l'autre ; un graphe définit les chemins entre les agents ; un essaim (swarm) laisse des agents pairs se passer la main |
| **Communication multi-agents** | Hiérarchique (superviseur et exécutants), passages de relais entre pairs, une mémoire ou un état partagé, ou un protocole standard comme Agent2Agent (A2A) entre des agents construits avec des frameworks différents |

> **Piège d'examen.** MCP connecte un agent à des outils et à des sources de données ; A2A connecte des agents à d'autres agents. La mémoire permet à un agent de se souvenir d'un utilisateur d'une session à l'autre ; une fenêtre contextuelle plus grande ne conserve à elle seule rien entre les sessions.

<!-- section: key-points -->
## Points clés

- Les jetons sont l'unité des entrées, des sorties, des limites et du prix ; les vectorisations sont des vecteurs qui capturent le sens ; le découpage divise les documents pour la récupération.
- Les LLM sont des modèles de fondation basés sur des transformateurs ; les modèles multimodaux traitent plusieurs types de données ; les modèles de diffusion génèrent des images à partir du bruit.
- Cycle de vie d'un FM : sélection des données, sélection du modèle, préentraînement, réglage précis, évaluation, déploiement, commentaires.
- Le coût et la latence augmentent avec les jetons d'entrée et de sortie : des invites concises, `maxTokens`, la mise en cache des invites et l'inférence par lots les réduisent.
- L'ingénierie du contexte décide de ce que voit le modèle à chaque appel ; les agents ajoutent outils, mémoire et orchestration, connectés par MCP.
