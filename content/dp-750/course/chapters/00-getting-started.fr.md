Le DP-750, Implementing Data Engineering Solutions Using Azure Databricks, est l'examen de la certification Microsoft Certified: Azure Databricks Data Engineer Associate. Il cible l'ingénieur données qui met en place le calcul et Unity Catalog, sécurise et gouverne les données, les ingère et les transforme, puis déploie et exécute des pipelines avec Lakeflow Jobs et les Databricks Asset Bundles. Les questions sont pratiques : vous lisez et complétez du SQL, du Python (PySpark) ou du YAML de bundle, vous choisissez un type de calcul ou une méthode d'ingestion selon des contraintes données, et vous ordonnez les étapes d'un pipeline ou d'un déploiement.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 120 minutes |
| Questions | Nombre non publié ; prévoyez environ 45 à 58, dont une étude de cas et une série Oui/Non |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant les examens de niveau associé, sur le même temps |
| Composants interactifs | L'examen « peut comporter des composants interactifs » ; aucun laboratoire n'est annoncé |
| Compétences mesurées | Guide d'étude daté du 11 mars 2026 |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les quatre domaines :

| Domaine | Poids |
| --- | --- |
| Mettre en place et configurer un environnement Azure Databricks | 15 à 20 % |
| Sécuriser et gouverner les objets Unity Catalog | 15 à 20 % |
| Préparer et traiter des données | 30 à 35 % |
| Déployer et gérer des pipelines de données et des charges de travail | 30 à 35 % |

Deux domaines pèsent les deux tiers du score : la préparation des données (ingestion, transformation, qualité des données) et les pipelines (Lakeflow Jobs, bundles, supervision et optimisation).

Formats attendus : une réponse parmi quatre ou cinq (le plus fréquent), complétion de code avec des listes déroulantes en SQL, en Python ou en YAML de bundle, plusieurs réponses (« chaque bonne réponse présente une partie de la solution »), affirmations Oui/Non, glisser-déposer et mise en ordre d'étapes. Dans une série Oui/Non, le même scénario revient avec une solution différente à chaque fois, et vous ne pouvez pas revenir en arrière. Les questions à plusieurs éléments rapportent en général un point par élément correct. La plupart des questions portent sur des fonctionnalités en disponibilité générale ; une fonctionnalité en préversion couramment utilisée peut apparaître.

Si l'examen n'est pas proposé dans votre langue, vous pouvez demander 30 minutes supplémentaires. Microsoft propose une évaluation d'entraînement gratuite et un bac à sable d'examen (`aka.ms/examdemo`) pour découvrir l'interface.

> **Conseil d'examen.** Microsoft Learn est ouvert, mais chercher coûte des minutes. Servez-vous-en pour confirmer une valeur (un nom de privilège, une option de `REFRESH`, une clé de bundle), jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases : « Vous avez un espace de travail Azure Databricks qui contient un catalogue Unity Catalog nommé `prod_sales`... Vous devez... La solution doit réduire les coûts. » Repérez l'**objet** (`catalog.schema.table`, un volume, un job), puis la **contrainte** : c'est elle qui départage plusieurs fonctionnalités qui fonctionnent toutes.

| Mots de la question | Pensez à |
| --- | --- |
| « réduire les coûts », « job de production planifié » | Calcul de jobs (serverless ou classique), jamais un cluster universel laissé en marche ; arrêt automatique |
| « aucune infrastructure à gérer », « démarrer immédiatement » | Calcul serverless, entrepôt SQL serverless |
| « R », « notebook Scala », « RDD », « script d'initialisation », « bibliothèque Maven » | Calcul classique (Dedicated pour R) |
| « plusieurs utilisateurs partagent », « calcul partagé » | Mode d'accès Standard |
| « privilège minimum » | Le privilège le plus étroit (`SELECT` sur une table, `READ VOLUME`) sur l'objet le plus étroit, plus `USE CATALOG` et `USE SCHEMA` |
| « sans copier les données », « interroger la base là où elle est » | Lakehouse Federation (catalogue étranger) |
| « ingérer de façon incrémentielle les nouveaux fichiers », « le schéma évolue » | Auto Loader, dans un notebook ou un Lakeflow Spark Declarative Pipeline |
| « conserver les fichiers quand la table est supprimée » | Table externe ou volume externe |
| « uniquement les tâches en échec » | Réparer une exécution de job |
| « aucun secret à faire tourner » | Identité managée (connecteur d'accès) |

Lisez le code en entier. Dans une question à liste déroulante, les mots-clés autour du trou (`USING CONNECTION`, `MANAGED LOCATION`, `readStream`, `cloudFiles`) éliminent souvent la moitié des options.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Calcul de jobs | Calcul universel | Le calcul de jobs existe pour une exécution ; le calcul universel est interactif, partagé et redémarré par les utilisateurs |
| Calcul serverless | Entrepôt SQL | Le serverless exécute des notebooks, des jobs et des pipelines en Python et en SQL ; un entrepôt n'exécute que du SQL, pour les requêtes, les tableaux de bord et les tâches SQL |
| Mode d'accès Standard | Mode d'accès Dedicated | Standard est partagé par plusieurs utilisateurs isolés ; Dedicated est attribué à un utilisateur ou à un groupe et prend en charge R et les runtimes ML |
| Table managée | Table externe | Unity Catalog supprime les données d'une table managée à sa suppression ; les fichiers d'une table externe restent |
| Volume | Table | Un volume gouverne des fichiers de tout format ; une table gouverne des lignes et des colonnes |
| Vue | Vue matérialisée | Une vue stocke la requête ; une vue matérialisée stocke et actualise les résultats |
| Catalogue étranger | Lakeflow Connect | La fédération interroge la source sur place, en lecture seule ; Lakeflow Connect ingère dans des tables Delta |
| COPY INTO | Auto Loader | COPY INTO est un chargement SQL idempotent de fichiers ; Auto Loader traite de façon incrémentielle les nouveaux fichiers comme un flux et passe à l'échelle sur de très nombreux fichiers |
| Partitionnement | Clustering liquide | Les partitions sont des répertoires fixes sur des colonnes à faible cardinalité ; les clés de clustering liquide peuvent changer sans réécrire la table |
| OPTIMIZE | VACUUM | OPTIMIZE compacte et regroupe les fichiers ; VACUUM supprime les fichiers qui ne sont plus référencés |
| Filtre de lignes | Masque de colonne | Un filtre retire des lignes ; un masque change les valeurs d'une colonne |
| Filtre de lignes ou masque | Stratégie ABAC | Les filtres et masques se définissent table par table ; les stratégies ABAC s'appliquent par balise à l'échelle des catalogues et des schémas |
| Réparer une exécution | Relancer | La réparation réexécute uniquement les tâches en échec et leurs dépendantes ; une nouvelle exécution relance tout |
| Principal de service | Identité managée | Un principal de service a un secret et fonctionne hors d'Azure ; une identité managée n'a pas de secret et atteint un stockage protégé par pare-feu |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le calcul et Unity Catalog viennent d'abord, car toutes les réponses suivantes en dépendent.
2. Pratiquez dans un espace de travail avec Unity Catalog : créez un catalogue, des schémas, un volume, des tables managées et externes ; accordez des privilèges à un groupe ; exécutez un notebook sur du serverless et sur un petit cluster classique.
3. Écrivez le code que vous devrez compléter : `CREATE CATALOG`, `GRANT`, `COPY INTO`, Auto Loader avec `readStream.format("cloudFiles")`, `MERGE INTO`, un pipeline déclaratif avec des attentes, un job avec des tâches dépendantes, et un `databricks.yml` déployé avec `databricks bundle deploy`.
4. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
