L'AI-200 est l'examen de la certification Microsoft Certified: Azure AI Cloud Developer Associate. Il s'adresse à un développeur back-end qui écrit du Python et construit la partie cloud des applications d'IA sur Azure : les conteneurs qui hébergent les services, les bases de données qui stockent documents et incorporations, la messagerie et les fonctions serverless qui relient les composants, ainsi que la sécurité et la supervision qui les entourent. Il ne teste ni l'entraînement de modèles ni la conception d'agents (c'est l'AI-103) : il teste ce que vous codez et configurez, si bien que la plupart des questions montrent un extrait Python, une commande `az`, un manifeste YAML, une requête ou un paramètre à choisir ou à compléter.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 120 minutes d'examen |
| Questions | Nombre non publié ; prévoyez environ 45 à 58, dont une étude de cas et une série « la solution atteint-elle l'objectif ? » |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant l'examen, mais y chercher prend du temps : servez-vous-en pour confirmer un paramètre, pas pour apprendre un sujet |
| Composants interactifs | Annoncés comme possibles par Microsoft (« you may have interactive components ») |
| Compétences évaluées | Le guide d'étude n'indique aucune date « compétences évaluées à partir du » ; sa page est datée du 15 avril 2026 |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les quatre domaines ont à peu près le même poids :

| Domaine | Poids |
| --- | --- |
| Développer des solutions conteneurisées sur Azure | 20 à 25 % |
| Développer des solutions IA à l'aide des services de gestion des données Azure | 25 à 30 % |
| Se connecter aux services Azure et les consommer | 20 à 25 % |
| Sécuriser, surveiller et dépanner les solutions Azure | 20 à 25 % |

Formats attendus : une réponse parmi quatre ou cinq, plusieurs réponses (« chaque bonne réponse présente une partie de la solution »), blocs de code avec deux à quatre listes déroulantes, affirmations Oui/Non, glisser-déposer et mise en ordre d'étapes. Dans une série « la solution atteint-elle l'objectif ? », le même scénario revient avec une solution différente à chaque fois, et vous ne pouvez pas revenir à une question précédente de la série. Les questions à plusieurs éléments rapportent généralement un point par élément correct.

Si l'examen n'est pas disponible dans votre langue, vous pouvez demander 30 minutes supplémentaires. Une tentative échouée peut être repassée après 24 heures.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases : une entreprise fictive avec une charge de travail d'IA (une API de récupération, un pipeline d'incorporations, un stockage d'historique de conversations), puis une ou deux contraintes qui décident de la réponse : latence, coût en RU, mise à l'échelle sur des événements, nouvelles tentatives, aucun secret dans le code. Repérez d'abord la contrainte ; elle élimine souvent la moitié des options.

| Mots de la question | Pensez à |
| --- | --- |
| « sans stocker d'informations d'identification », « aucun secret dans le code », « sans clé » | Identité managée et `DefaultAzureCredential`, plus le rôle de données du service (AcrPull, rôle de plan de données Cosmos DB, Key Vault Secrets User) |
| « chaque réplica doit exécuter le même build » | Étiquette d'image unique ou synthèse (digest), pas `latest` |
| « les agents de build n'ont pas Docker » | `az acr build` (tâche rapide ACR Tasks) |
| « regénérer quand l'image de base est corrigée » | Tâche ACR avec son déclencheur de mise à jour de l'image de base |
| « mettre à l'échelle selon la longueur de la file », « aucun coût au repos » | Règle KEDA personnalisée de Container Apps avec `minReplicas` à 0 |
| « envoyer 10 % du trafic vers la nouvelle version » | Mode de révision Multiple de Container Apps et pondérations du trafic |
| « le pod redémarre encore et encore » | `CrashLoopBackOff` : `kubectl logs --previous` |
| « les utilisateurs doivent voir leurs propres écritures, au coût le plus bas » | Cohérence Session de Cosmos DB |
| « trier sur deux propriétés » | Index composite Cosmos DB |
| « traiter chaque élément nouveau ou mis à jour » | Flux de modification Cosmos DB (déclencheur Azure Functions en Python) |
| « trouver les segments les plus similaires » | Index vectoriel plus `VectorDistance` (Cosmos DB) ou pgvector (PostgreSQL), avec `TOP N` / `LIMIT` |
| « chaque message traité par plusieurs consommateurs indépendants » | Rubrique Service Bus avec abonnements, pas une file d'attente |
| « messages qui échouent de façon répétée » | File d'attente de lettres mortes |
| « réagir à un événement ponctuel, comme un blob créé » | Event Grid |
| « indicateurs de fonctionnalités », « paramètres partagés par plusieurs applications » | App Configuration ; les secrets restent dans Key Vault |
| « suivre une requête à travers les services » | Traçage distribué avec OpenTelemetry |

Les questions de code montrent du Python avec des trous : le client à créer, la méthode à appeler, le paramètre qui porte la clé de partition ou les informations d'identification. Relisez chaque extrait de ce cours jusqu'à pouvoir dire ce que fait chaque ligne. Le code Python de ce cours est présenté dans des blocs de texte brut.

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| App Service | Container Apps | App Service héberge le conteneur d'une application web ou d'une API sur un plan ; Container Apps ajoute les révisions, la répartition du trafic et la mise à l'échelle KEDA jusqu'à zéro |
| Container Apps | AKS | Container Apps masque Kubernetes ; AKS donne l'API Kubernetes complète, des manifestes et des pools de nœuds à gérer |
| Tâche rapide (`az acr build`) | Tâche déclenchée (`az acr task create`) | Une tâche rapide génère une fois, à la demande ; une tâche s'exécute de nouveau sur un commit, une mise à jour de l'image de base ou une planification |
| Modification d'étendue révision | Modification d'étendue application | Les modifications du modèle (image, variables d'environnement, règles de mise à l'échelle) créent une révision ; les secrets, l'entrée et le trafic non |
| Journaux de console | Journaux système | Les journaux de console sont ce qu'affiche votre code ; les journaux système sont les événements de la plateforme comme le tirage des images et les échecs de sondes |
| Rôle Azure RBAC sur Cosmos DB | Rôle de plan de données Cosmos DB | Contributor gère le compte ; lire des éléments avec Microsoft Entra ID exige Built-in Data Reader ou Data Contributor |
| Cohérence Session | Cohérence Strong | Session garantit la lecture de ses propres écritures pour un client, au coût d'un seul réplica ; Strong garantit la dernière écriture à tous, pour deux fois les RU de lecture |
| Index vectoriel `flat` | Index vectoriel `diskANN` | `flat` est exact, jusqu'à 505 dimensions ; `diskANN` est approximatif, jusqu'à 4 096 dimensions, idéal pour les grands ensembles |
| Processeur de flux de modification | Modèle d'extraction du flux de modification | Le processeur gère des baux et répartit le travail entre instances (.NET, Java, Functions) ; le modèle d'extraction laisse la position et l'interrogation à votre code |
| File d'attente Service Bus | Rubrique Service Bus | Une file remet chaque message à un seul consommateur ; une rubrique le copie dans chaque abonnement |
| Service Bus | Event Grid | Service Bus transporte des messages métier à traiter de façon fiable ; Event Grid distribue des événements qui signalent que quelque chose s'est produit |
| Déclencheur | Liaison | Une fonction a exactement un déclencheur qui la démarre ; les liaisons la connectent à des données d'entrée et de sortie sans code client |
| Key Vault | App Configuration | Key Vault protège les secrets, les clés et les certificats ; App Configuration contient des paramètres et des indicateurs de fonctionnalités et peut référencer des secrets Key Vault |
| Traces | Journaux et métriques | Une trace suit une requête à travers les services ; les journaux sont des enregistrements individuels ; les métriques sont des agrégats numériques dans le temps |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le module sur les conteneurs donne le vocabulaire de déploiement que réutilisent les modules données, intégration et supervision.
2. Dans un abonnement de test, générez une image avec `az acr build`, déployez-la sur Container Apps avec une identité managée, puis ajoutez une règle de mise à l'échelle sur une file d'attente et observez l'évolution des réplicas.
3. Créez un conteneur Cosmos DB for NoSQL avec une stratégie vectorielle, chargez quelques centaines de segments avec le SDK Python et exécutez une requête `VectorDistance` ; comparez le coût en RU avant et après une modification de la stratégie d'indexation.
4. Exécutez chaque extrait Python de ce cours avec `DefaultAzureCredential` et changez un paramètre à la fois pour en voir l'effet.
5. Entraînez-vous à trouver rapidement une page sur Microsoft Learn (référence de l'interface CLI, référence du SDK, limites) : pendant l'examen, c'est votre référence.
6. Après chaque module, passez un examen blanc et relisez les sections liées à vos erreurs. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
