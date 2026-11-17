L'AZ-400 est l'examen de l'ingénieur DevOps : il vérifie comment vous planifiez le travail, organisez le contrôle de code source, générez et mettez en production des logiciels, sécurisez la chaîne d'approvisionnement et instrumentez les applications, toujours avec **deux chaînes d'outils**, GitHub et Azure DevOps. De nombreuses questions montrent un pipeline YAML, un workflow GitHub Actions, des commandes Git ou une requête à compléter. Ce chapitre présente le format, une méthode pour lire les questions et les paires de fonctionnalités que l'examen vous demande de distinguer.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | Microsoft Certified: DevOps Engineer Expert |
| Prérequis | La certification Azure Administrator Associate (AZ-104) ou Azure Developer Associate (AZ-204) est exigée pour obtenir la certification |
| Durée | 120 minutes d'examen (valeur donnée par Microsoft pour les examens de niveau associé et expert pouvant contenir des laboratoires) |
| Questions | Nombre non publié ; environ 45 à 58 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn peut être ouvert pendant l'examen, sur le même chronomètre |
| Langues | Anglais, français, allemand, espagnol, japonais, coréen, chinois, portugais (Brésil), italien |
| Validité | Un an, renouvelée gratuitement par une évaluation en ligne sur Microsoft Learn |

Les cinq domaines du guide d'étude (compétences mesurées au 27 juillet 2026) n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Concevoir et implémenter des processus et des communications | 10 à 15 % |
| Concevoir et implémenter une stratégie de contrôle de code source | 10 à 15 % |
| Concevoir et implémenter des pipelines de build et de mise en production | 50 à 55 % |
| Développer un plan de sécurité et de conformité | 10 à 15 % |
| Implémenter une stratégie d'instrumentation | 5 à 10 % |

Les pipelines représentent la moitié de l'examen : gestion des packages, stratégie de test, agents et exécuteurs, stratégies de déploiement, infrastructure as code et maintenance des pipelines. Répartissez votre temps en conséquence.

Formats de questions, du plus fréquent au plus rare : une réponse parmi quatre, listes déroulantes qui complètent un fichier YAML, un workflow ou une commande, « sélectionnez deux réponses », glisser-déposer (associations ou mise en ordre d'étapes), affirmations Oui/Non, et plus rarement une zone réactive. Les questions composées de plusieurs éléments rapportent un point par élément correct. Un examen comporte aussi des sections qui ont leurs propres règles :

- **Étude de cas.** Une entreprise décrite en onglets (vue d'ensemble, environnement existant, exigences), suivie de plusieurs questions. Une fois l'étude de cas quittée, vous ne pouvez plus y revenir.
- **Série Oui/Non.** Le même objectif est répété avec une solution différente à chaque fois ; vous dites si la solution atteint l'objectif. Chaque réponse est définitive.
- **Section principale.** Des questions indépendantes que vous pouvez marquer et revoir jusqu'à la validation.

> **Conseil d'examen.** Microsoft Learn est accessible, mais le chronomètre continue de tourner. Servez-vous-en pour vérifier une clé YAML, un nom de tâche ou une limite, jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question DevOps

Un énoncé type nomme une équipe, sa chaîne d'outils (GitHub, Azure DevOps ou les deux), un objectif et une contrainte décisive. Procédez dans cet ordre :

1. Lisez la dernière phrase : que devez-vous choisir, configurer ou faire en premier ?
2. Repérez la plateforme. Une réponse GitHub (règle de protection de branche, `GITHUB_TOKEN`, exécuteur) est fausse dans un scénario Azure DevOps, et inversement.
3. Trouvez la contrainte qui élimine les distracteurs plausibles.
4. Dans une question de code, lisez tout le fichier : l'indentation, la phase ou le travail auquel appartient une clé et le déclencheur décident souvent de la réponse.

| Mots de l'énoncé | Ce qu'ils désignent |
| --- | --- |
| « réduire au minimum l'effort d'administration » | L'option managée : agents hébergés par Microsoft ou exécuteurs hébergés par GitHub, une intégration intégrée, une stratégie plutôt qu'un script |
| « sans stocker de secrets », « aucune information d'identification stockée » | La fédération d'identité de charge de travail (OpenID Connect) ou une identité managée |
| « l'agent doit atteindre un réseau privé », « logiciel spécifique sur l'agent » | Un agent ou un exécuteur auto-hébergé (ou un agent Managed DevOps Pools dans votre réseau virtuel) |
| « empêcher la fusion tant que », « exiger une revue » | Les stratégies de branche (Azure Repos) ou les règles de protection de branche et ensembles de règles (GitHub) |
| « approbation avant le déploiement en production » | Approbations et vérifications sur un environnement (Azure Pipelines) ou réviseurs requis sur un environnement (GitHub Actions) |
| « sans interruption de service », « revenir en arrière rapidement » | Déploiement bleu-vert ou permutation d'emplacements |
| « exposer d'abord à un faible pourcentage d'utilisateurs » | Mise en production canary, déploiement par anneaux, indicateurs de fonctionnalité |
| « consommer les packages de nuget.org via un seul flux » | Un flux Azure Artifacts avec une source en amont |
| « relier un commit à l'élément de travail », « lier la pull request » | Les mentions `AB#` et l'application Azure Boards pour GitHub |
| « d'abord », « ensuite », « avant » | Une question de mise en ordre déguisée : identifiez le prérequis |

> **Piège d'examen.** « Réduire les coûts » ne l'emporte jamais sur une exigence fonctionnelle. Un agent hébergé par Microsoft coûte moins cher à exploiter, mais si le build doit atteindre une base de données dans un réseau virtuel privé, il ne peut pas être la réponse.

Dans une série Oui/Non, jugez chaque solution pour elle-même et acceptez celle qui atteint l'objectif, même si vous en auriez conçu une meilleure.

<!-- section: confusing-pairs -->
## Les fonctionnalités faciles à confondre

L'examen construit ses distracteurs à partir de fonctionnalités voisines. Retenez la différence en une ligne :

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Stratégies de branche | Règles de protection de branche | Azure Repos définit des stratégies sur une branche ; GitHub définit des règles de protection ou des ensembles de règles sur des modèles de noms de branches |
| Agent hébergé par Microsoft | Agent auto-hébergé | Une machine virtuelle neuve gérée par Microsoft pour chaque travail ; votre machine, vos outils et votre réseau, que vous maintenez |
| Travail parallèle | Agent | Un travail parallèle est la licence d'exécuter un travail à la fois ; l'agent est la machine qui l'exécute |
| Principal de service | Identité managée | Un principal de service a un secret ou un certificat, sauf s'il utilise la fédération ; une identité managée est liée à une ressource Azure et n'a aucun secret à gérer |
| Identité managée affectée par le système | Identité managée affectée par l'utilisateur | Cycle de vie d'une seule ressource ; ressource autonome partagée par plusieurs ressources |
| Fédération d'identité de charge de travail | Secret stocké | Des jetons de courte durée échangés via OpenID Connect ; un secret qui expire, fuit et doit être renouvelé |
| Jeton d'accès personnel | `GITHUB_TOKEN` et GitHub App | Le jeton de longue durée d'un utilisateur ; un jeton créé pour une exécution de workflow et limité à son dépôt ; une identité d'application aux autorisations fines et aux jetons d'installation de courte durée |
| Vue de flux | Source en amont | Une vue (`@Local`, `@Prerelease`, `@Release`) partage un sous-ensemble promu d'un flux ; une source en amont récupère les packages d'un autre flux ou d'un registre public |
| Bleu-vert | Canary | Deux environnements complets et une bascule ; une petite part du trafic d'abord, puis une augmentation progressive |
| Déploiement par anneaux | Indicateur de fonctionnalité | Déploie vers des groupes d'utilisateurs successifs ; active ou désactive du code déjà déployé |
| Niveau d'accès Stakeholder | Collaborateur externe | Niveau d'accès Azure DevOps gratuit aux fonctionnalités Boards limitées ; une personne extérieure à une organisation GitHub à qui l'on donne accès à certains dépôts |
| `git revert` | `git reset` | Un nouveau commit qui annule un commit, sans risque sur une branche partagée ; déplace le pointeur de branche et réécrit l'historique local |
| Git LFS | Scalar | Stocke les gros fichiers binaires hors du dépôt ; accélère Git sur les très grands dépôts |
| Délai de livraison (lead time) | Temps de cycle (cycle time) | De la création de l'élément de travail à son achèvement ; du début du travail à l'achèvement |

<!-- section: scope -->
## Ce que l'examen ne teste pas

Le guide d'étude de juillet 2026 ne mentionne ni Team Foundation Version Control (TFVC), ni les serveurs d'intégration continue tiers, ni l'administration de Kubernetes, ni le développement d'applications. Les pipelines de mise en production classiques n'apparaissent qu'à travers leur migration vers YAML : sachez par quoi un pipeline YAML les remplace (phases, environnements, approbations et vérifications), pas comment les créer.

Les deux chaînes d'outils évoluent chaque mois. Quand un nom de tâche, une clé YAML ou une limite compte, le cours donne la valeur actuelle telle que Microsoft Learn la documente : fiez-vous à elle plutôt qu'à des supports plus anciens.

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre. Les chapitres sur les processus et le contrôle de code source sont courts ; les chapitres sur les pipelines sont longs et méritent l'essentiel de votre temps.
2. Créez une organisation Azure DevOps gratuite et un compte GitHub. Écrivez un petit pipeline YAML et un workflow GitHub Actions qui génèrent, testent et déploient la même application : la plupart des questions à listes déroulantes deviennent faciles une fois que vous avez écrit les clés vous-même.
3. Pour chaque paire du tableau ci-dessus, écrivez une phrase qui dit quand vous choisiriez chaque option.
4. Après chaque domaine, passez un examen blanc, lisez toutes les explications et relisez les sections liées à vos erreurs.
5. Réservez l'examen réel quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
