Un projet de ML est un cycle, pas une construction ponctuelle : un objectif métier devient un problème de ML, les données sont collectées et préparées, un modèle est entraîné, évalué et déployé, puis surveillé et réentraîné quand ses performances baissent. Ce chapitre présente les étapes du pipeline, l'origine des modèles, leur exécution en production, les services AWS de chaque étape, le MLOps et les métriques qui jugent un modèle, techniques et métier.

<!-- section: ml-pipeline | objectives: 1.3.1 -->
## Les composants d'un pipeline de ML

| Étape | Ce qui se passe |
| --- | --- |
| 1. **Objectif métier** | Définir le problème et la mesure du succès (par exemple, réduire l'attrition de 5 %) |
| 2. **Formulation du problème de ML** | Décider si le ML convient et de quel type : classification, régression, clustering... et quelle est la cible |
| 3. **Collecte des données** | Rassembler les données des bases, fichiers, flux ; les étiqueter en cas d'apprentissage supervisé |
| 4. **Prétraitement des données** | Nettoyer (valeurs manquantes, doublons, valeurs aberrantes), transformer, répartir en jeux d'entraînement, de validation et de test |
| 5. **Ingénierie des caractéristiques** | Sélectionner, créer et transformer les variables d'entrée (caractéristiques, features) utiles au modèle : par exemple « jours depuis le dernier achat » |
| 6. **Entraînement du modèle** | L'algorithme apprend les paramètres à partir du jeu d'entraînement |
| 7. **Réglage des hyperparamètres** | Essayer des réglages qui ne sont pas appris (taux d'apprentissage, profondeur d'arbre, nombre d'époques) pour trouver le meilleur modèle |
| 8. **Évaluation** | Mesurer les performances sur des données que le modèle n'a pas vues, au regard de l'objectif métier |
| 9. **Déploiement** | Rendre le modèle disponible pour l'inférence (point de terminaison, tâche par lots) |
| 10. **Surveillance** | Surveiller la dérive des données, la dérive de la qualité du modèle et la santé opérationnelle |
| 11. **Réentraînement** | Entraîner à nouveau avec de nouvelles données quand les performances se dégradent, puis redéployer |

Les paramètres sont appris pendant l'entraînement (les poids) ; les hyperparamètres sont choisis avant l'entraînement. Le jeu de test ne sert qu'une fois, pour l'évaluation finale ; le jeu de validation guide le réglage.

> **Piège d'examen.** Dans une question de classement, l'ordre est : collecter les données, prétraiter les données, concevoir les caractéristiques, entraîner, régler et évaluer, déployer, surveiller. L'ingénierie des caractéristiques vient après le nettoyage et avant l'entraînement ; l'évaluation vient avant le déploiement.

<!-- section: model-sources | objectives: 1.3.2 -->
## L'origine des modèles

| Source | Ce que c'est | Compromis |
| --- | --- | --- |
| **Modèles de fondation propriétaires par un service géré** | Des modèles d'Amazon (Amazon Nova) et d'autres fournisseurs, appelés par l'API d'Amazon Bedrock | Ni entraînement ni infrastructure ; paiement à l'usage ; personnalisables dans les limites des options du service |
| **Modèles open source préentraînés** | Des poids publics (par exemple issus de hubs de modèles), déployés par SageMaker JumpStart, Amazon Bedrock Marketplace ou votre propre calcul | Vous pouvez les inspecter, les peaufiner et les héberger ; vérifiez la licence ; vous exploitez l'hébergement sauf si le service le gère |
| **Entraînement d'un modèle personnalisé** | Entraîner votre propre modèle sur vos données, à partir de zéro ou en peaufinant un modèle préentraîné | Le plus de contrôle et de différenciation ; demande des données, des compétences en ML, du temps et du calcul ; entraîner un FM à partir de zéro est l'option la plus coûteuse |

<!-- section: production-methods | objectives: 1.3.3 -->
## Utiliser un modèle en production

| Méthode | Fonctionnement | Choisissez-la quand |
| --- | --- | --- |
| **Service d'API géré** | Le fournisseur héberge le modèle et le met à l'échelle ; votre application envoie des requêtes à une API (Amazon Bedrock, les services d'IA d'AWS) | Charge opérationnelle minimale, démarrage rapide, coût à l'usage |
| **Hébergement géré de votre modèle** | Vous apportez ou entraînez un modèle ; SageMaker AI met en service le point de terminaison et le met à l'échelle pour vous | Modèle personnalisé ou open source sans gérer de serveurs |
| **API autohébergée** | Vous déployez le modèle sur votre propre infrastructure (Amazon EC2, conteneurs sur Amazon ECS ou Amazon EKS) et exposez votre propre API | Contrôle complet de la pile, matériel ou logiciel spécifique, plateforme de conteneurs existante ; vous appliquez les correctifs, mettez à l'échelle et sécurisez tout |

> **Conseil d'examen.** Pour utiliser un modèle de fondation avec « LEAST operational overhead », choisissez Amazon Bedrock. « Contrôle complet de la pile de service » ou « exécuter le modèle dans les clusters Kubernetes existants de l'entreprise », c'est l'autohébergement, par exemple sur Amazon EKS.

<!-- section: aws-pipeline-services | objectives: 1.3.4 -->
## Les services AWS de chaque étape

| Étape | Services et fonctionnalités AWS |
| --- | --- |
| Collecte et stockage des données | Amazon S3 (lac de données), AWS Glue (intégration de données et Data Catalog), AWS Lake Formation (lac de données gouverné), Amazon Redshift, bases de données |
| Préparation des données | AWS Glue DataBrew (nettoyage visuel des données, sans code), SageMaker Data Wrangler (préparer les données et créer des caractéristiques dans SageMaker Studio), Amazon EMR (Spark à grande échelle) |
| Ingénierie des caractéristiques | SageMaker Data Wrangler, SageMaker Feature Store (magasin en ligne et hors ligne de caractéristiques réutilisables) |
| Entraînement et réglage | Tâches d'entraînement et réglage automatique des modèles de SageMaker AI, SageMaker Canvas (ML sans code pour les analystes métier), SageMaker JumpStart (modèles préentraînés), SageMaker HyperPod (clusters d'entraînement à grande échelle) |
| Modèles de fondation | Amazon Bedrock : choisir, personnaliser et appeler des FM par une seule API |
| Déploiement | Points de terminaison SageMaker AI (en temps réel, sans serveur, asynchrones), batch transform ; Amazon Bedrock pour les FM |
| Orchestration et gouvernance | SageMaker Pipelines (flux de travail automatisés), SageMaker Model Registry (versions et approbation), SageMaker Model Cards (documentation) |
| Surveillance | Métriques et alarmes Amazon CloudWatch, MLflow géré dans SageMaker AI, solutions de surveillance open source d'AWS |
| Construction de l'application | Kiro, l'environnement de développement agentique, écrit et teste le code qui appelle le modèle |
| Exploitation des résultats | Amazon Quick : tableaux de bord (Quick Sight), recherche et agents d'IA que les utilisateurs métier interrogent en langage naturel |

Amazon SageMaker Model Monitor (détection de dérive sur les points de terminaison) et SageMaker Clarify ne sont plus ouverts aux nouveaux clients. Pour un nouveau projet, AWS recommande des métriques personnalisées CloudWatch avec des alarmes de détection d'anomalies, MLflow géré et ses solutions de surveillance open source.

> **Piège d'examen.** Glue DataBrew et Data Wrangler préparent tous deux les données sans code : DataBrew s'adresse aux analystes de données dans AWS Glue ; Data Wrangler se trouve dans SageMaker Studio, pour le ML. SageMaker Canvas construit des modèles sans code ; ce n'est pas un catalogue de données.

<!-- section: mlops | objectives: 1.3.5 -->
## Les principes du MLOps

Le MLOps applique les pratiques DevOps au machine learning pour que les modèles arrivent en production de façon fiable et restent exacts.

| Concept | Ce que cela signifie | Dans AWS |
| --- | --- | --- |
| **Expérimentation** | Suivre chaque exécution : version des données, code, hyperparamètres, métriques, pour comparer et reproduire | MLflow géré et SageMaker Experiments |
| **Processus reproductibles** | Automatiser les étapes du pipeline au lieu de notebooks manuels | SageMaker Pipelines |
| **Systèmes pouvant être mis à l'échelle** | L'entraînement et l'inférence suivent le volume de données et le trafic | Tâches d'entraînement gérées, mise à l'échelle automatique des points de terminaison |
| **Gestion de la dette technique** | Éviter le code d'assemblage fragile, les dépendances de données non documentées et les modèles non versionnés | Model Registry, données et code versionnés |
| **Préparation à la production** | Tests, sécurité, approbations, retour arrière, contrôle des coûts et de la latence avant la mise en service | Statut d'approbation du Model Registry, CI/CD |
| **Surveillance des modèles** | Détecter la dérive des données (les entrées changent), la dérive conceptuelle (la relation entre entrées et cible change) et les baisses de qualité | CloudWatch, solutions de surveillance |
| **Réentraînement des modèles** | Réentraîner selon un calendrier ou quand une métrique surveillée franchit un seuil, puis redéployer | Pipelines déclenchés automatiquement |

> **Piège d'examen.** Un modèle exact à son lancement qui se dégrade au fil des mois alors que le code n'a pas changé subit une dérive. La solution est la surveillance et le réentraînement sur des données récentes, pas une instance plus grande.

<!-- section: model-metrics | objectives: 1.3.6 -->
## Les métriques de modèle et les métriques métier

Les métriques de classification viennent de la matrice de confusion : vrais positifs (TP), faux positifs (FP), vrais négatifs (TN), faux négatifs (FN).

| Métrique | Formule ou sens | Utilisez-la quand |
| --- | --- | --- |
| **Exactitude (accuracy)** | (TP + TN) / toutes les prédictions | Les classes sont équilibrées |
| **Précision** | TP / (TP + FP) : parmi les éléments signalés positifs, combien le sont vraiment | Les faux positifs coûtent cher : bloquer un paiement légitime, un filtre antispam qui masque de vrais e-mails |
| **Rappel (recall)** | TP / (TP + FN) : parmi les vrais positifs, combien ont été trouvés | Les faux négatifs coûtent cher : manquer une fraude ou une maladie |
| **Score F1** | Moyenne harmonique de la précision et du rappel | Les classes sont déséquilibrées et les deux erreurs comptent |
| **AUC (aire sous la courbe ROC)** | Capacité à classer les positifs avant les négatifs sur tous les seuils ; 0,5 = hasard, 1 = parfait | Comparer des classifieurs indépendamment du seuil |
| **MAE, RMSE, R²** | Erreur moyenne, erreur qui pénalise les grosses erreurs, part de la variance expliquée | Modèles de régression |

Les métriques métier jugent si le modèle en vaut la peine : **coût par utilisateur** ou par prédiction, **coûts de développement**, **commentaires des clients** et satisfaction, **retour sur investissement (ROI)**, ainsi que des résultats comme le chiffre d'affaires gagné ou les pertes de fraude évitées.

> **Piège d'examen.** Sur un jeu de données avec 1 % de fraude, un modèle qui répond toujours « légitime » a une exactitude de 99 % et ne sert à rien. Utilisez le rappel, la précision ou le score F1 pour des classes déséquilibrées.

<!-- section: key-points -->
## Points clés

- Pipeline : objectif métier, formulation, collecte des données, prétraitement, ingénierie des caractéristiques, entraînement, réglage, évaluation, déploiement, surveillance, réentraînement.
- Les modèles viennent de fournisseurs de FM gérés, de modèles open source préentraînés ou d'un entraînement personnalisé ; la production utilise une API gérée, un hébergement géré ou l'autohébergement.
- SageMaker AI couvre la préparation, l'entraînement, le déploiement et la gouvernance ; Bedrock sert les FM ; Kiro construit l'application ; Quick apporte les analyses aux utilisateurs métier.
- MLOps : expériences, automatisation, mise à l'échelle, peu de dette technique, préparation à la production, surveillance, réentraînement.
- La précision quand les faux positifs coûtent cher, le rappel quand les faux négatifs coûtent cher, le score F1 pour des données déséquilibrées ; les métriques métier décident de la valeur.
