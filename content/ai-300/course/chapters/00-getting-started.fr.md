L'AI-300 est l'examen de la certification Microsoft Certified: Machine Learning Operations Engineer Associate. Il vise l'ingénieur qui construit et exploite la plateforme autour des modèles, ce que le guide d'étude appelle les opérations d'IA (AIOps) : le MLOps pour le machine learning traditionnel avec Azure Machine Learning, et le GenAIOps pour les applications et agents d'IA générative avec Microsoft Foundry. Il ne teste pas la théorie des algorithmes : il teste ce que vous provisionnez, configurez, automatisez et surveillez, si bien que la plupart des questions montrent une commande `az ml`, un fichier YAML de travail, de composant ou de point de terminaison, une ressource Bicep, un workflow GitHub Actions ou un court extrait Python à choisir ou à compléter.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 120 minutes d'examen |
| Questions | Nombre non publié ; prévoyez environ 40 à 60 |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant l'examen, mais y chercher coûte du temps : servez-vous-en pour confirmer une clé YAML ou un paramètre, pas pour apprendre un sujet |
| Composants interactifs | Annoncés comme possibles par Microsoft (« may have interactive components ») |
| Langue | Anglais ; les versions localisées arrivent en général environ huit semaines après la version anglaise, et vous pouvez demander 30 minutes supplémentaires si votre langue n'est pas disponible |
| Compétences mesurées | Le guide d'étude n'affiche pas de date « skills measured as of » ; sa page est datée du 15 octobre 2026 |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Microsoft propose aussi une évaluation d'entraînement gratuite sur la page de la certification et un bac à sable d'examen (`aka.ms/examdemo`) pour essayer l'interface avant le jour J.

Les cinq domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Concevoir et implémenter une infrastructure MLOps | 15 à 20 % |
| Implémenter le cycle de vie et les opérations des modèles de machine learning | 25 à 30 % |
| Concevoir et implémenter une infrastructure GenAIOps | 20 à 25 % |
| Implémenter l'assurance qualité et l'observabilité de l'IA générative | 10 à 15 % |
| Optimiser les systèmes d'IA générative et les performances des modèles | 10 à 15 % |

Les deux domaines de machine learning (infrastructure MLOps et cycle de vie des modèles) représentent près de la moitié de l'examen ; les trois domaines d'IA générative se partagent l'autre moitié.

Formats attendus : une réponse parmi quatre ou cinq, plusieurs réponses (« chaque réponse correcte présente une partie de la solution »), blocs de code ou de YAML avec deux à quatre listes déroulantes, affirmations Oui/Non, glisser-déposer, et mise en ordre d'étapes. Dans une série « la solution atteint-elle l'objectif ? », le même scénario revient avec une solution différente à chaque fois, et vous ne pouvez pas revenir à une question précédente de la série. Les questions à plusieurs éléments rapportent en général un point par élément correct.

Le profil du candidat dans le guide d'étude suppose Python, une connaissance de base du DevOps (GitHub Actions, interfaces en ligne de commande) et l'infrastructure en tant que code avec Bicep et Azure CLI. Ce cours n'utilise que les outils actuels : l'extension `ml` v2 d'Azure CLI et le SDK Python `azure-ai-ml` v2. Le code Python est présenté dans des blocs de texte brut.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases : une entreprise fictive avec un espace de travail Azure Machine Learning ou un projet Foundry existant, puis une ou deux contraintes qui décident de la réponse : privilège minimum, aucun accès réseau public, aucun secret dans le pipeline, coût le plus bas, aucune interruption. Repérez d'abord la contrainte : elle élimine souvent la moitié des options.

| Mots de la question | Pensez à |
| --- | --- |
| « réutiliser le même chemin de stockage sans répéter l'URI », « référence versionnée et immuable aux données » | Ressource de données (`uri_file`, `uri_folder` ou `mltable`) au-dessus d'un magasin de données |
| « connecter l'espace de travail à un compte de stockage existant » | Magasin de données (il ne crée jamais de stockage) |
| « aucun coût quand aucun travail ne s'exécute » | Cluster de calcul avec `min_instances: 0`, ou calcul serverless |
| « ne gérer aucun calcul » | Calcul serverless : omettez `compute` dans le travail |
| « les data scientists exécutent des travaux mais ne peuvent pas créer de calcul » | Rôle AzureML Data Scientist |
| « utiliser le même composant dans les espaces de travail de dev, de test et de prod » | Registre Azure Machine Learning |
| « le workflow ne doit stocker aucun secret client » | OpenID Connect avec des informations d'identification fédérées, `permissions: id-token: write` |
| « bloquer tout le trafic sortant sauf les destinations approuvées » | Réseau virtuel managé en mode `allow_only_approved_outbound` |
| « l'espace de travail ne doit pas être joignable depuis internet » | Accès réseau public désactivé plus un point de terminaison privé |
| « journaliser paramètres et métriques, comparer les exécutions » | Suivi MLflow |
| « scorer des millions d'enregistrements chaque nuit » | Point de terminaison de traitement par lots (batch) |
| « envoyer 10 % des requêtes au nouveau modèle » | Point de terminaison en ligne managé avec deux déploiements et une répartition du trafic |
| « tester le nouveau modèle sur le trafic réel sans affecter les réponses » | Trafic mis en miroir |
| « payer au jeton, aucune infrastructure à gérer » | Déploiement d'API serverless d'un modèle de base |
| « débit garanti pour un volume élevé et régulier » | Unités de débit approvisionné |
| « la réponse est-elle étayée par les documents récupérés ? » | Évaluateur d'ancrage (groundedness) |
| « la réponse répond-elle à la question ? » | Évaluateur de pertinence (relevance) |

Les questions de code montrent du YAML ou du Python avec des trous : le `type` d'une entrée, l'expression de liaison, le rôle à attribuer, le paramètre qui cible un registre plutôt qu'un espace de travail. Relisez chaque bloc de code de ce cours jusqu'à pouvoir dire ce que fait chaque ligne.

Dans les affirmations Oui/Non, les mots absolus (« toujours », « uniquement », « tous », « jamais ») méritent une seconde lecture : ce sont souvent eux qui rendent une affirmation fausse.

<!-- section: confusing-pairs -->
## Les notions faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Magasin de données (datastore) | Ressource de données (data asset) | Un magasin de données stocke la façon de se connecter à un compte de stockage existant ; une ressource de données est une référence nommée et versionnée à un fichier, un dossier ou une table, en général via un magasin de données |
| `uri_folder` | `mltable` | `uri_folder` pointe vers un dossier que votre code lit ; `mltable` ajoute un schéma et des étapes de chargement dans un fichier `MLTable` (tables, AutoML) |
| Instance de calcul | Cluster de calcul | Une instance est une VM personnelle pour les notebooks et le développement ; un cluster est un pool de nœuds qui se met à l'échelle pour les travaux |
| Cluster de calcul | Calcul serverless | Vous créez et dimensionnez un cluster ; le calcul serverless est demandé par travail et géré par Azure Machine Learning |
| Environnement organisé (curated) | Environnement personnalisé | Les environnements organisés sont maintenus par Microsoft (préfixe `AzureML-` dans la CLI) ; les personnalisés sont construits à partir de votre image, Dockerfile ou fichier conda |
| Actif d'espace de travail | Actif de registre | Un actif d'espace de travail est visible dans un seul espace de travail ; un actif de registre est utilisable par tous les espaces de travail des régions du registre |
| Archiver | Supprimer | Les versions d'une ressource de données ne peuvent pas être supprimées ; l'archivage les masque des listes mais les laisse utilisables |
| Secret de principal de service | OpenID Connect | Un secret est stocké dans GitHub et expire ; OIDC échange un jeton GitHub de courte durée via des informations d'identification fédérées |
| Réseau virtuel propre | Réseau virtuel managé | Vous exploitez le réseau vous-même, ou Azure Machine Learning crée et exploite un réseau isolé avec des règles de trafic sortant |
| Point de terminaison en ligne managé | Point de terminaison de traitement par lots | En ligne, une prédiction est renvoyée par requête avec une faible latence ; par lots, de gros volumes sont traités de façon asynchrone sous forme de travaux |
| Répartition du trafic blue-green | Trafic mis en miroir | Une répartition envoie une part des requêtes au nouveau déploiement et renvoie ses réponses ; le miroir lui copie les requêtes mais ne renvoie jamais ses réponses |
| Dérive des données | Dérive des prédictions | La dérive des données est un changement de distribution des caractéristiques d'entrée ; la dérive des prédictions est un changement de distribution des sorties du modèle |
| Dérive des données | Qualité des données | La dérive compare des distributions à une référence ; la qualité des données vérifie valeurs nulles, types et valeurs hors plage |
| API serverless | Calcul managé | L'API serverless est facturée au jeton sur l'infrastructure de Microsoft ; le calcul managé exécute le modèle sur des VM payées à l'heure |
| Déploiement avec paiement à l'utilisation | Débit approvisionné | Le paiement à l'utilisation facture la consommation ; le débit approvisionné réserve une capacité pour une latence prévisible à fort volume |
| Ancrage (groundedness) | Pertinence (relevance) | L'ancrage vérifie que la réponse est étayée par le contexte fourni ; la pertinence vérifie qu'elle répond à la question |
| Ingénierie d'invite | RAG et réglage précis | L'ingénierie d'invite modifie les instructions ; le RAG ajoute des données récupérées à l'exécution ; le réglage précis modifie les poids du modèle avec des exemples d'entraînement |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le module sur l'infrastructure MLOps donne le vocabulaire (espace de travail, magasin de données, calcul, environnement, composant, registre) que réutilisent les modules sur l'entraînement, le déploiement et le GenAIOps.
2. Dans un abonnement de test, créez un espace de travail avec `az ml workspace create`, un cluster de calcul avec `min_instances: 0`, un magasin de données et une ressource de données, puis exécutez un travail de commande depuis un YAML. Modifiez une clé à la fois et lisez les messages d'erreur.
3. Transformez ce travail en pipeline à deux étapes avec des composants inscrits, puis publiez un environnement et un composant dans un registre et exécutez le pipeline depuis un second espace de travail.
4. Placez les fichiers YAML dans un dépôt GitHub et exécutez-les depuis un workflow GitHub Actions qui se connecte avec OpenID Connect.
5. Déployez un modèle sur un point de terminaison en ligne managé, ajoutez un second déploiement et répartissez le trafic ; puis déployez un modèle de base dans un projet Foundry et lancez une évaluation avec des évaluateurs intégrés.
6. Entraînez-vous à trouver vite une page sur Microsoft Learn (référence des schémas YAML, référence de la CLI, liste des évaluateurs) : pendant l'examen, c'est votre référence.
7. Après chaque module, passez un examen blanc et relisez les sections liées à vos erreurs. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
