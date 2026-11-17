Le DP-700, Implementing Data Engineering Solutions Using Microsoft Fabric, est l'examen de la certification Microsoft Certified: Fabric Data Engineer Associate. Il s'adresse à l'ingénieur données qui sécurise et déploie des espaces de travail Fabric, orchestre et charge des données par lots et en diffusion en continu, puis surveille et optimise lakehouses, entrepôts, eventhouses et Spark. Les questions évaluent le jugement et la pratique : vous choisissez un moteur, un magasin de données, un paramètre ou une autorisation selon des contraintes données, et vous lisez et complétez du code PySpark, T-SQL et KQL.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 100 minutes |
| Questions | Nombre non publié ; prévoyez environ 45 à 58, dont une étude de cas et une série Oui/Non |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant les examens de niveau associé, sur le même chronomètre |
| Laboratoire | Aucun |
| Compétences évaluées | Guide d'étude daté du 19 octobre 2026 |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les trois domaines ont le même poids :

| Domaine | Poids |
| --- | --- |
| Implémenter et gérer une solution d'analytique | 30 à 35 % |
| Ingérer et transformer des données | 30 à 35 % |
| Surveiller et optimiser une solution d'analytique | 30 à 35 % |

La surveillance et l'optimisation pèsent un tiers du score : lire le hub de surveillance, corriger les erreurs de pipeline, de notebook, de flux d'événements et de T-SQL, et optimiser les tables Delta, Spark et les requêtes sont autant évalués que le chargement des données.

Formats attendus : une réponse parmi quatre ou cinq (le plus fréquent), code à compléter avec des listes déroulantes en PySpark, T-SQL ou KQL, plusieurs réponses (« chaque bonne réponse présente une partie de la solution »), affirmations Oui/Non, glisser-déposer, mise en ordre d'étapes et, rarement, une zone réactive. Dans une série Oui/Non, le même scénario revient avec une solution différente à chaque fois et vous ne pouvez pas revenir en arrière. Les questions à plusieurs éléments rapportent en général un point par élément correct. La plupart des questions portent sur des fonctionnalités en disponibilité générale ; une fonctionnalité en préversion peut apparaître si elle est couramment utilisée.

Si l'examen n'est pas disponible dans votre langue, vous pouvez demander 30 minutes supplémentaires ; les versions localisées sont mises à jour environ huit semaines après la version anglaise. Microsoft propose une évaluation d'entraînement gratuite et un bac à sable d'examen (`aka.ms/examdemo`) pour découvrir l'interface.

> **Conseil d'examen.** Microsoft Learn est ouvert, mais chercher coûte des minutes. Utilisez-le pour confirmer une valeur (un nom de paramètre, un argument de fonction, une limite), jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases avec des éléments nommés : « Vous disposez d'un espace de travail Fabric nommé Workspace1 qui contient un lakehouse nommé Lakehouse1 et un entrepôt nommé DW1... Vous devez... La solution doit réduire l'effort de développement. » Repérez l'**élément** (lakehouse, entrepôt, eventhouse, pipeline, notebook), l'**utilisateur** et son rôle, puis la **contrainte** : c'est elle qui départage plusieurs fonctionnalités qui fonctionnent toutes.

| Mots de la question | Pensez à |
| --- | --- |
| « réduire l'effort de développement », « low-code », « Power Query » | Dataflow Gen2 ou un travail de copie |
| « orchestrer », « exécuter en séquence », « en cas d'échec, envoyer un e-mail » | Pipeline |
| « transformations complexes », « PySpark », « bibliothèques de machine learning » | Notebook |
| « sans copier les données », « les données restent dans ADLS ou S3 » | Raccourci OneLake |
| « quasi temps réel depuis Azure SQL Database », « sans ETL » | Mise en miroir |
| « transactions multitables », « l'équipe ne connaît que le T-SQL » | Entrepôt |
| « fichiers de tout format », « utilisateurs Spark et SQL » | Lakehouse |
| « télémétrie », « milliards d'événements », « séries chronologiques », « KQL » | Eventhouse |
| « uniquement les lignes nouvelles ou modifiées depuis la dernière exécution » | Chargement incrémentiel avec un filigrane (watermark) |
| « moindre privilège », « uniquement ce dossier » | Autorisation d'élément ou rôle de sécurité OneLake, pas un rôle d'espace de travail |
| « beaucoup de petits fichiers », « les requêtes ralentissent avec le temps » | `OPTIMIZE` (et V-Order) sur la table Delta |

Lisez le code en entier. Dans une question à liste déroulante, les clauses autour du trou (`groupBy`, `writeStream`, `MERGE ... WHEN MATCHED`, `summarize ... by bin()`) éliminent souvent la moitié des options. Vérifiez aussi le langage : une méthode PySpark ne complète jamais une requête KQL.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Lakehouse | Entrepôt | Un lakehouse stocke des tables Delta et des fichiers, écrits avec Spark, et expose un point de terminaison d'analytique SQL en lecture seule ; un entrepôt accepte les écritures T-SQL et les transactions multitables |
| Entrepôt | Eventhouse | Un entrepôt sert l'analytique relationnelle en T-SQL ; un eventhouse stocke des événements horodatés en grand volume, interrogés en KQL |
| Dataflow Gen2 | Pipeline | Un dataflow transforme les données avec Power Query ; un pipeline orchestre des activités (copie, notebook, dataflow, conditions, boucles) |
| Pipeline | Notebook | Un pipeline coordonne et copie avec peu de code ; un notebook transforme avec du code PySpark ou Spark SQL |
| Raccourci | Mise en miroir | Un raccourci pointe vers les données là où elles sont ; la mise en miroir réplique une base de données dans OneLake en continu |
| Mise en miroir | Activité de copie | La mise en miroir garde une réplique synchronisée automatiquement ; une activité ou un travail de copie déplace les données quand il s'exécute |
| Flux d'événements (eventstream) | Streaming structuré Spark | Un flux d'événements ingère, transforme et achemine des événements sans code ; le streaming structuré traite les flux avec du code dans un notebook |
| Fenêtre bascule (tumbling) | Fenêtre récurrente (hopping) | Les fenêtres bascules sont fixes et ne se chevauchent pas ; les fenêtres récurrentes sont fixes et se chevauchent |
| Fenêtre de session | Fenêtre glissante (sliding) | Une fenêtre de session se ferme après un intervalle sans événement ; une fenêtre glissante est évaluée quand des événements y entrent ou en sortent |
| Rôle d'espace de travail | Autorisation d'élément | Un rôle couvre tous les éléments de l'espace de travail ; une autorisation d'élément couvre un élément partagé |
| Autorisation d'élément | Sécurité OneLake | Une autorisation d'élément ouvre tout l'élément ; un rôle de sécurité OneLake limite tables, dossiers, lignes ou colonnes pour tous les moteurs |
| Sécurité au niveau des colonnes | Masquage dynamique des données | La sécurité au niveau des colonnes refuse la colonne ; le masquage renvoie la colonne avec des valeurs cachées |
| Intégration Git | Pipeline de déploiement | Git versionne les définitions des éléments ; un pipeline fait passer des éléments entre les espaces de travail des phases |
| Pipeline de déploiement | Projet de base de données | Un pipeline copie des éléments Fabric ; un projet de base de données génère et publie le schéma d'un entrepôt sous forme de .dacpac |
| `OPTIMIZE` | `VACUUM` | OPTIMIZE compacte les petits fichiers en fichiers plus gros ; VACUUM supprime les anciens fichiers que la table ne référence plus |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : paramètres de l'espace de travail, cycle de vie et sécurité d'abord, car chaque scénario ultérieur nomme un espace de travail, un rôle et un élément.
2. Pratiquez dans une capacité d'essai Fabric : créez un espace de travail, un lakehouse avec un raccourci, un notebook qui charge une table Delta avec `MERGE`, un entrepôt chargé avec `COPY INTO`, un pipeline qui exécute les deux avec des paramètres, un flux d'événements vers un eventhouse, et une requête KQL avec `summarize` et `bin()`.
3. Écrivez le code que vous aurez à compléter : lectures, jointures, `groupBy` et `writeStream` en PySpark ; `MERGE`, `GRANT` et stratégies de sécurité en T-SQL ; `where`, `summarize`, `join` et fonctions de fenêtrage en KQL.
4. Provoquez des pannes exprès : faites échouer une activité de pipeline, un notebook sur une colonne manquante, un raccourci qui perd sa cible, et lisez l'erreur dans le hub de surveillance.
5. Connectez l'espace de travail à Git, créez une branche dans un nouvel espace de travail (branch out) et déployez avec un pipeline de déploiement et une règle de lakehouse par défaut.
6. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
7. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
