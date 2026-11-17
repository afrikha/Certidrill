Le DP-600, Implementing Analytics Solutions Using Microsoft Fabric, est l'examen de la certification Microsoft Certified: Fabric Analytics Engineer Associate. Il s'adresse à l'ingénieur analytique qui sécurise et versionne les éléments Fabric, prépare les données dans des lakehouses, des entrepôts et des eventhouses, et crée et optimise des modèles sémantiques. Les questions testent le jugement : vous choisissez un magasin, une méthode d'ingestion, une autorisation ou un mode de stockage selon des contraintes données, et vous lisez et complétez du code T-SQL, KQL, DAX ou PySpark court.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Durée | 100 minutes |
| Questions | Nombre non publié ; prévoyez environ 45 à 58, dont une étude de cas et une série Oui/Non |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est accessible pendant les examens de niveau associé, sur le même temps |
| Laboratoire | Aucun |
| Compétences mesurées | Guide d'étude daté du 19 octobre 2026 |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les trois domaines :

| Domaine | Poids |
| --- | --- |
| Gérer une solution d'analytique des données | 25 à 30 % |
| Préparer des données | 45 à 50 % |
| Implémenter et gérer des modèles sémantiques | 25 à 30 % |

La préparation des données pèse à elle seule près de la moitié du score : obtenir les données, les transformer, et les interroger en SQL, KQL, DAX et avec l'éditeur de requête Visual.

Formats attendus : une réponse parmi quatre ou cinq (le plus fréquent), complétion de code avec listes déroulantes en T-SQL, KQL, DAX et parfois PySpark, plusieurs réponses (« chaque bonne réponse présente une partie de la solution »), affirmations Oui/Non, glisser-déposer, mise en ordre d'étapes, et rarement une zone réactive. Dans une série Oui/Non, le même scénario revient avec une solution différente à chaque fois et vous ne pouvez pas revenir en arrière. Les questions à plusieurs éléments rapportent en général un point par élément correct. La plupart des questions portent sur des fonctionnalités en disponibilité générale ; une fonctionnalité en préversion couramment utilisée peut apparaître.

Si l'examen n'est pas disponible dans votre langue, vous pouvez demander 30 minutes supplémentaires. Microsoft propose une évaluation d'entraînement gratuite et un bac à sable d'examen (`aka.ms/examdemo`) pour essayer l'interface.

> **Conseil d'examen.** Microsoft Learn est ouvert, mais chercher coûte des minutes. Utilisez-le pour confirmer une valeur (un nom de paramètre, une limite, un argument de fonction), jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question

Les énoncés font 3 à 6 phrases avec des éléments nommés : « Vous avez un espace de travail Fabric nommé Workspace1 qui contient un lakehouse nommé Lakehouse1... Vous devez... La solution doit réduire l'effort de développement. » Repérez l'**élément** (lakehouse, entrepôt, eventhouse, modèle sémantique), l'**utilisateur** et son rôle, puis la **contrainte** : c'est elle qui départage plusieurs fonctionnalités qui fonctionnent toutes.

| Mots de la question | Pensez à |
| --- | --- |
| « sans copier les données », « les données restent dans ADLS » | Raccourci OneLake |
| « en quasi-temps réel depuis Azure SQL Database », « sans ETL » | Mise en miroir |
| « l'équipe ne connaît que T-SQL », « transactions multitables » | Entrepôt |
| « utilisateurs PySpark et SQL », « fichiers de tout format » | Lakehouse |
| « télémétrie », « milliards d'événements », « séries chronologiques » | Eventhouse et KQL |
| « privilège minimum », « seulement cette table » | Partager l'élément avec Read seul, puis un `GRANT` T-SQL, ou un rôle de sécurité OneLake |
| « les utilisateurs ne voient dans les rapports que les lignes de leur région » | RLS du modèle sémantique avec `USERPRINCIPALNAME()` |
| « suivre les modifications et fusionner le travail de plusieurs développeurs » | Intégration Git avec des fichiers .pbip |
| « promouvoir en production avec les chaînes de connexion de production » | Pipeline de déploiement avec règles de déploiement |
| « modifier le modèle avec Tabular Editor et le déployer » | Point de terminaison XMLA en Read Write |
| « très gros volume, données fraîches, pas d'actualisation pour les importer » | Direct Lake |

Lisez le code en entier. Dans une question à liste déroulante, les clauses autour du trou (`GROUP BY`, `summarize ... by`, `CALCULATE`, `FILTER`, `VAR ... RETURN`) éliminent souvent la moitié des options.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Rôle d'espace de travail | Autorisation d'élément | Un rôle couvre tous les éléments de l'espace de travail ; une autorisation d'élément couvre un élément partagé |
| ReadData | ReadAll | ReadData lit en T-SQL par le point de terminaison d'analytique SQL ; ReadAll lit les fichiers OneLake avec Spark et les API |
| Sécurité au niveau des lignes SQL | RLS du modèle sémantique | La RLS SQL filtre les requêtes T-SQL et fait basculer Direct Lake en DirectQuery ; la RLS du modèle filtre les lecteurs des rapports en DAX |
| Sécurité au niveau de l'objet | Sécurité au niveau des colonnes | L'OLS masque une table ou une colonne d'un modèle sémantique ; la CLS restreint des colonnes en T-SQL |
| Intégration Git | Pipeline de déploiement | Git versionne les définitions d'un espace de travail ; un pipeline copie le contenu entre les espaces de travail des étapes |
| .pbip | .pbit | Un projet est un dossier de fichiers texte pour le contrôle de code source ; un modèle est un fichier qui démarre de nouveaux rapports, sans données |
| .pbit | .pbids | Un modèle transporte le rapport et le modèle de données ; un fichier de source de données ne transporte qu'une connexion |
| XMLA Read | XMLA Read Write | Read interroge et trace ; Read Write déploie et modifie les modèles, et c'est un paramètre de capacité |
| Raccourci | Mise en miroir | Un raccourci pointe vers les données là où elles sont ; la mise en miroir réplique une base dans OneLake |
| Point de terminaison d'analytique SQL du lakehouse | Entrepôt | Le point de terminaison est du T-SQL en lecture seule sur des tables Delta ; l'entrepôt accepte les écritures T-SQL |
| Direct Lake sur OneLake | Direct Lake sur le point de terminaison d'analytique SQL | Sur OneLake lit directement les tables Delta et ne bascule jamais ; sur SQL peut basculer en DirectQuery par le point de terminaison |
| Groupe de calcul | Paramètre de champ | Un groupe de calcul change la façon dont les mesures sont calculées ; un paramètre de champ laisse l'utilisateur changer les champs d'un visuel |
| Itérateur (SUMX) | Agrégation (SUM) | Un itérateur évalue une expression ligne par ligne ; une agrégation porte sur une colonne |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : sécurité et cycle de vie d'abord, car chaque scénario suivant nomme un espace de travail, un rôle et un élément.
2. Pratiquez sur une capacité d'essai Fabric : créez un espace de travail, un lakehouse avec un raccourci et une table chargée par un notebook, un entrepôt chargé avec `COPY INTO`, un eventhouse avec une table KQL, et un modèle sémantique Direct Lake avec un rapport.
3. Écrivez le code que vous aurez à compléter : vues T-SQL, `GRANT` et stratégies de sécurité ; KQL `where`, `summarize` et `bin()` ; mesures DAX avec `CALCULATE`, variables et itérateurs ; une lecture et une écriture PySpark courtes vers une table Delta.
4. Connectez un espace de travail à Git, enregistrez un rapport en .pbip et déployez-le par un pipeline de déploiement avec une règle.
5. Après chaque domaine, passez un examen blanc, lisez chaque explication et relisez les sections liées à vos erreurs.
6. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
