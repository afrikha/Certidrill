L'AI-103 est l'examen de la certification Microsoft Certified: Azure AI Apps and Agents Developer Associate. Il s'adresse à un ingénieur IA Azure qui crée, gère et déploie des agents et des solutions IA sur Microsoft Foundry, et qui écrit du Python. La plupart des questions vous font choisir (un modèle, un service Foundry, une méthode de récupération, un type de déploiement, un outil d'agent, un évaluateur, un garde-fou) ; les autres vous font implémenter : compléter un court extrait Python ou une définition JSON, ordonner les étapes d'une configuration, ou lire une trace ou un résultat d'évaluation.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 120 minutes d'examen |
| Questions | Nombre non publié ; prévoyez environ 45 à 58 questions, dont une étude de cas et une série « la solution atteint-elle l'objectif ? » |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant l'examen, mais y chercher prend du temps : servez-vous-en pour confirmer un détail, pas pour apprendre un sujet |
| Composants interactifs | Annoncés comme possibles par Microsoft (« you may have interactive components ») |
| Prérequis | Aucun formellement ; Microsoft attend une expérience du développement en Python et une familiarité avec l'IA générative et les services Azure |
| Compétences mesurées | Version du 16 avril 2026 |
| Fonctionnalités en préversion | La plupart des questions portent sur des fonctionnalités en disponibilité générale ; des fonctionnalités en préversion couramment utilisées peuvent apparaître |

Les cinq domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Planifier et gérer une solution IA Azure | 25 à 30 % |
| Implémenter des solutions d'IA et d'agent génératives | 30 à 35 % |
| Implémenter des solutions de vision par ordinateur | 10 à 15 % |
| Implémenter des solutions d'analyse de texte | 10 à 15 % |
| Implémenter des solutions d'extraction d'informations | 10 à 15 % |

Formats attendus : une réponse parmi quatre ou cinq, plusieurs réponses (« chaque réponse correcte présente une partie de la solution »), affirmations Oui/Non, code ou phrases à compléter avec des listes déroulantes, glisser-déposer et mise en ordre d'étapes. Dans une série « la solution atteint-elle l'objectif ? », le même scénario revient avec une solution différente à chaque fois, et vous ne pouvez pas revenir à une question précédente de la série. Les questions à plusieurs éléments rapportent en général un point par élément correct.

Si l'examen n'est pas proposé dans votre langue, vous pouvez demander 30 minutes supplémentaires. Une tentative échouée peut être repassée après 24 heures.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases : une entreprise fictive, une application ou un agent, puis une ou deux contraintes qui décident de la réponse. Repérez d'abord la contrainte ; elle élimine en général la moitié des options.

| Mots de la question | Pensez à |
| --- | --- |
| « sans stocker de clés », « sans clé », « aucun secret dans le code » | Identité managée ou `DefaultAzureCredential` avec Microsoft Entra ID et un rôle RBAC |
| « aucun trafic sur internet public » | Points de terminaison privés, accès réseau public désactivé |
| « coût le plus bas », « résultats sous 24 heures », « des millions de documents pendant la nuit » | Déploiement Batch (50 % moins cher que Global Standard) |
| « débit garanti », « latence constante » | Débit provisionné (PTU) |
| « les données doivent rester dans l'UE » | Déploiement Data Zone (ou Standard pour une seule zone géographique) |
| « HTTP 429 » | Limite de débit ou quota atteint : nouvelle tentative avec temporisation, plus de TPM, plus de capacité |
| « répondre à partir des documents de l'entreprise », « citer les sources » | Génération augmentée par récupération (ancrage), pas un changement de paramètre |
| « codes produit exacts et questions en langage naturel » | Recherche hybride (mots clés plus vecteurs) |
| « les meilleurs résultats en premier », « reclasser » | Classeur sémantique |
| « se souvenir des préférences de l'utilisateur d'une session à l'autre » | Mémoire de l'agent, pas l'historique de conversation |
| « appeler notre API de commandes » | Appel de fonction, outil OpenAPI ou outil MCP |
| « une personne approuve avant que l'action s'exécute » | Approbation d'outil, humain dans la boucle |
| « mesurer l'ancrage », « détecter les fabrications » | Évaluateur, pas un filtre de contenu |
| « voir chaque étape de l'exécution de l'agent » | Traçage (OpenTelemetry, Application Insights) |
| « des champs de factures ou de formulaires » | Analyseur Azure Content Understanding |
| « changer uniquement le ciel de cette image » | Modification par masque (inpainting), pas une nouvelle génération |

Les questions de code montrent du Python avec un ou plusieurs trous : le client à créer, la méthode à appeler, le paramètre qui porte le nom du déploiement, la définition d'outil ou les informations d'identification. Lisez chaque extrait de ce cours jusqu'à pouvoir dire ce que fait chaque ligne. Le code Python de ce cours est présenté dans des blocs de texte brut.

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Quota | Limite de débit | Le quota est le TPM qu'un abonnement peut allouer par région, modèle et type de déploiement ; la limite de débit est ce qu'un déploiement applique à l'exécution à partir du TPM qui lui est attribué |
| Débit provisionné | Déploiement Standard | Le provisionné réserve de la capacité facturée par PTU et par heure ; Standard est payé au jeton, au mieux |
| Recherche vectorielle | Recherche hybride | La recherche vectorielle compare uniquement le sens ; l'hybride exécute en parallèle une requête par mots clés et une requête vectorielle, puis fusionne les résultats |
| Recherche hybride | Classeur sémantique | L'hybride récupère ; le classeur sémantique recalcule le score des premiers résultats d'une requête |
| RAG | Paramètres de génération | Le RAG apporte la connaissance manquante ; la température ou top_p changent seulement la façon dont le modèle écrit |
| Appel de fonction | Outil de connaissances | L'appel de fonction exécute une action dans votre code ; un outil de connaissances récupère du contenu pour ancrer la réponse |
| Historique de conversation | Mémoire de l'agent | L'historique est la conversation en cours ; la mémoire conserve des faits condensés d'une session à l'autre |
| Filtre de contenu | Évaluateur | Un filtre bloque les entrées ou sorties nuisibles à l'exécution ; un évaluateur note la qualité ou la sécurité sur un jeu de données ou sur le trafic |
| Évaluateur | Traçage | Un évaluateur donne un score ; une trace montre les étapes, appels, jetons et latences d'une exécution |
| Agent unique | Orchestration multi-agent | Un agent avec plusieurs outils est plus simple ; plusieurs agents conviennent à des rôles, autorisations ou modèles distincts |
| Analyseur Content Understanding | Invite multimodale | Un analyseur renvoie un schéma fixe avec confiance et ancrage ; une invite renvoie du texte libre |
| Modification par masque | Nouvelle génération | Un masque ne change que la zone sélectionnée ; une nouvelle invite régénère toute l'image |
| Ressource Foundry | Projet Foundry | La ressource porte la gouvernance, le réseau et les déploiements de modèles ; un projet isole le travail d'une équipe |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le module de planification (services, configuration, surveillance, sécurité, IA responsable) donne le vocabulaire que les autres modules supposent acquis.
2. Créez un projet Foundry dans un abonnement de test, déployez un modèle de conversation et un modèle d'embedding, et créez un agent avec un outil de connaissances et une fonction. Le faire une fois rend faciles les questions de configuration et de mise en ordre.
3. Exécutez chaque extrait Python de ce cours avec `DefaultAzureCredential`, et changez un paramètre à la fois pour voir son effet.
4. Entraînez-vous à trouver vite une page sur Microsoft Learn (types de déploiement, quotas, rôles intégrés, outils d'agent) : pendant l'examen, c'est votre référence.
5. Après chaque module, passez un examen blanc et relisez les sections liées à vos erreurs.
6. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
