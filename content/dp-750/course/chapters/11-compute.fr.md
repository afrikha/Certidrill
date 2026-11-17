Chaque notebook, job, pipeline et requête SQL d'Azure Databricks s'exécute sur du calcul. Le DP-750 vous demande de choisir le type de calcul adapté à une charge de travail et à ses contraintes (coût, latence de démarrage, isolation, langage), puis de le dimensionner, de choisir son runtime et ses fonctionnalités, d'installer des bibliothèques et de contrôler qui peut l'utiliser. La plupart des mauvaises réponses de l'examen sont de vrais types de calcul utilisés pour la mauvaise charge de travail.

<!-- section: compute-types | objectives: 1.1.1 -->
## Les types de calcul et leur usage

Azure Databricks propose trois familles : le calcul serverless géré par Databricks, le calcul classique qui s'exécute dans votre abonnement Azure, et les entrepôts SQL pour le SQL et la BI.

| Type de calcul | Ce que c'est | Usage typique |
| --- | --- | --- |
| Calcul serverless pour notebooks | Python et SQL interactifs dans les notebooks, mise à l'échelle automatique, aucune infrastructure à gérer | Développement interactif sans attendre un cluster |
| Calcul serverless pour jobs | Exécute les tâches Lakeflow Jobs sans configurer d'infrastructure | Par défaut pour les tâches notebook, script Python, wheel Python, JAR et dbt CLI |
| Pipelines serverless | Exécute les Lakeflow Spark Declarative Pipelines sans configurer d'infrastructure | ETL déclaratif sans cluster à régler |
| Calcul universel (all-purpose) classique | Un cluster que vous créez, partagez et redémarrez ; mode d'accès Standard ou Dedicated | Travail interactif que le serverless ne prend pas en charge (notebooks R ou Scala, code RDD, scripts d'initialisation, bibliothèques Maven) |
| Calcul de jobs classique | Un cluster créé pour l'exécution d'un job, avec les mêmes paramètres que le calcul universel | Jobs de production qui exigent des fonctionnalités classiques, et tâches Spark Submit |
| Entrepôt SQL | Calcul optimisé pour les requêtes SQL, l'analytique et la BI, de type serverless, pro ou classique | Tâches SQL, tableaux de bord, outils de BI, Genie Agents |
| Pool d'instances | Un ensemble de VM inactives prêtes à l'emploi dans lequel puisent les clusters | Réduire le temps de démarrage et de mise à l'échelle automatique du calcul classique |

Le calcul serverless exige un espace de travail activé pour Unity Catalog dans une région prise en charge. Il est disponible par défaut dans la plupart des espaces de travail. Ses principales limites :

- Python et SQL uniquement dans les notebooks : les notebooks Scala et R ne sont pas pris en charge (les tâches JAR des jobs le sont).
- Uniquement les API Spark Connect : les API RDD ne sont pas prises en charge.
- Pas de bibliothèques à l'étendue du calcul, pas de coordonnées Maven, pas de scripts d'initialisation à l'étendue du calcul : utilisez un environnement de base ou des bibliothèques à l'étendue du notebook.
- Pas d'interface utilisateur Spark : utilisez le profil de requête. Seul un ensemble limité de propriétés Spark peut être défini, au niveau de la session.
- `CACHE TABLE`, `df.checkpoint()` et `spark.catalog.cacheTable()` lèvent une exception ; `df.cache()` et `df.persist()` fonctionnent.

Pour les jobs, le serverless dispose du paramètre **Performance optimized**. Désactivé (mode standard), il consomme moins de DBU et accepte une latence de démarrage de 4 à 6 minutes ; activé, le job démarre et s'exécute plus vite, pour les charges de travail sensibles au temps. Les deux modes utilisent la même SKU.

Calcul recommandé par type de tâche de job :

| Type de tâche | Recommandé | Également pris en charge |
| --- | --- | --- |
| Notebook, script Python, wheel Python, JAR | Jobs serverless | Jobs classiques, calcul universel classique |
| SQL, dbt | Entrepôt SQL serverless | Entrepôt SQL pro |
| Pipeline Lakeflow | Pipeline serverless | Pipeline classique |
| Spark Submit | Jobs classiques | Aucun |

Un cluster de job classique démarre quand la première tâche qui l'utilise commence et s'arrête après la dernière. Un cluster de job partagé par plusieurs tâches est limité à une exécution du job : les autres jobs et les autres exécutions du même job ne peuvent pas l'utiliser.

> **Piège d'examen.** Le calcul universel peut exécuter une tâche de job, mais Databricks ne le recommande pas pour les jobs de production. Quand l'énoncé dit « job de production planifié » et « réduire les coûts », la réponse est le calcul de jobs (serverless ou classique), jamais un cluster universel laissé en marche.

Les types d'entrepôts SQL :

| Type | Photon | Predictive IO | Gestion intelligente des charges de travail | Démarrage |
| --- | --- | --- | --- | --- |
| Serverless | Oui | Oui | Oui | En général 2 à 6 secondes |
| Pro | Oui | Oui | Non | Plusieurs minutes (environ 4) |
| Classique | Oui | Non | Non | Plusieurs minutes (environ 4) |

Choisissez serverless pour le meilleur démarrage et une mise à l'échelle rapide quand des requêtes sont en file d'attente. Choisissez pro quand le serverless n'est pas disponible dans la région ou quand l'entrepôt doit joindre des bases de données par votre propre réseau (fédération, architecture hybride). Dans l'interface, le type par défaut est serverless là où il est pris en charge ; l'API des entrepôts SQL crée un entrepôt classique sauf si vous définissez `enable_serverless_compute` à `true` avec `warehouse_type` à `pro`.

> **Piège d'examen.** Les vues matérialisées, les requêtes Lakehouse Federation et les Genie Agents exigent un entrepôt SQL **pro ou serverless**. Un entrepôt classique est le distracteur.

<!-- section: access-modes | objectives: 1.1.1 -->
## Les modes d'accès : Standard et Dedicated

Le calcul classique a un mode d'accès qui détermine qui peut le partager et comment Unity Catalog isole les utilisateurs.

| Mode d'accès | Ancien nom | Utilisateurs | Langages |
| --- | --- | --- | --- |
| Standard | Shared (partagé) | Plusieurs utilisateurs, isolés les uns des autres par Lakeguard | Python, SQL, Scala |
| Dedicated (dédié) | Single user (utilisateur unique) | Un utilisateur ou un groupe | Python, SQL, Scala, R |
| No isolation shared | Identique | Hérité, non recommandé, sans Unity Catalog | À ne pas choisir |

Le mode d'accès est **Auto** par défaut : il devient Standard, sauf si vous sélectionnez un runtime de machine learning, un type d'instance GPU ou un Databricks Runtime antérieur à 14.3, auquel cas il devient Dedicated. Databricks recommande le mode d'accès Standard, sauf si une fonctionnalité dont vous avez besoin n'y est pas prise en charge.

| Exigence | Réponse |
| --- | --- |
| Plusieurs analystes partagent un cluster, avec l'isolation Unity Catalog | Mode d'accès Standard (« calcul partagé » dans le guide d'étude) |
| Notebooks R, ou Databricks Runtime ML avec des données Unity Catalog | Mode d'accès Dedicated |
| Une équipe partage un cluster qui exige des fonctionnalités réservées au mode dédié | Mode d'accès Dedicated attribué à un groupe |
| Aucun cluster à gérer, Python et SQL uniquement | Calcul serverless |

<!-- section: performance-settings | objectives: 1.1.2 -->
## Les paramètres de performances : nœuds, mise à l'échelle, arrêt, pools

Une ressource de calcul a un nœud **pilote** (driver) et zéro ou plusieurs nœuds **worker** ; Azure Databricks exécute un exécuteur par worker. Le type du pilote est par défaut celui des workers (Auto) ; choisissez un pilote plus grand quand le code rapatrie de gros résultats vers le pilote avec `collect()`.

- Le **type de nœud** (type de worker) fixe les cœurs de processeur et la mémoire par nœud ; les types GPU servent au deep learning.
- **Nœud unique** (Single node) : le pilote joue le rôle de maître et de worker, Spark s'exécute en local avec un thread d'exécuteur par cœur moins un. Il ne peut pas être converti en multinœud, et un cluster multinœud ne peut pas descendre à 0 worker : utilisez un nœud unique pour de petits volumes ou des tests de bibliothèques.
- **Workers** : un nombre fixe, ou **Enable autoscaling** avec un **Min** et un **Max** de workers. La mise à l'échelle automatique n'est pas disponible pour les jobs `spark-submit`.
- **Instances spot** (case Use spot instances) : le pilote est toujours à la demande ; les workers spot évincés sont remplacés par des instances spot ou à la demande. N'utilisez pas un pool d'instances spot pour le pilote.
- **Stockage local** : les disques s'agrandissent automatiquement, jusqu'à 5 To par VM.
- **Étiquettes** (tags) : appliquées aux VM, aux disques et aux journaux d'utilisation, pour attribuer les coûts. Avec un pool, les étiquettes personnalisées n'atteignent que les rapports d'utilisation des DBU.

| Mise à l'échelle automatique | Plan | Comportement |
| --- | --- | --- |
| Optimisée | Premium | Passe du min au max en 2 étapes au plus ; réduit après 40 secondes de sous-utilisation sur le calcul de jobs, 150 secondes sur le calcul universel |
| Standard | Standard | Ajoute d'abord 8 nœuds, puis augmente de façon exponentielle ; réduit quand 90 % des nœuds sont inactifs pendant 10 minutes |

Pour les charges de travail de streaming, Databricks recommande les Lakeflow Spark Declarative Pipelines avec la mise à l'échelle automatique améliorée plutôt que la mise à l'échelle automatique du cluster.

L'**arrêt automatique** arrête le calcul universel après une période d'inactivité comprise entre 10 et 10 000 minutes ; décochez la case ou indiquez `0` pour le désactiver. Le calcul est inactif quand toutes les commandes, tous les jobs Spark, toutes les requêtes Structured Streaming et tous les appels JDBC sont terminés. Un cluster arrêté conserve sa configuration 30 jours, puis il est supprimé, sauf si un administrateur l'**épingle** (100 au maximum). Modifier un calcul en cours d'exécution (hors taille et autorisations) exige un redémarrage.

Les **pools d'instances** gardent des VM inactives prêtes : les clusters attachés au pool démarrent et s'agrandissent plus vite, et les instances libérées retournent au pool. Azure Databricks ne facture aucun DBU pour les instances inactives du pool, mais le coût des VM Azure s'applique. Créer un pool exige le droit **Allow pool creation** (administrateurs de l'espace de travail par défaut). Le pilote et les workers peuvent utiliser le même pool ou des pools différents (`driver_instance_pool_id`, `instance_pool_id`). Avec la mise à l'échelle automatique, le minimum du cluster ne doit pas dépasser le minimum d'instances inactives du pool, et un maximum supérieur à la capacité du pool fait échouer la création du cluster. Si la charge de travail prend en charge le serverless, Databricks recommande le serverless plutôt que les pools.

```json
{
  "cluster_name": "etl-nightly",
  "spark_version": "<lts-runtime-version>",
  "autoscale": { "min_workers": 2, "max_workers": 8 },
  "autotermination_minutes": 30,
  "runtime_engine": "PHOTON",
  "instance_pool_id": "<worker-pool-id>",
  "driver_instance_pool_id": "<driver-pool-id>",
  "custom_tags": { "costcenter": "finance" }
}
```

Les **stratégies de calcul** (policies) limitent ce que les utilisateurs peuvent configurer. Sans le droit **Unrestricted cluster creation**, un utilisateur ne crée du calcul qu'au moyen des stratégies qui lui sont accordées ; chaque utilisateur dispose par défaut de la stratégie **Personal Compute** (calcul à une seule machine).

> **Piège d'examen.** Les pools réduisent le temps de démarrage, pas le coût des nœuds en marche : les VM inactives du pool restent facturées par Azure. Pour réduire le coût des clusters interactifs inactifs, raccourcissez la période d'arrêt automatique.

<!-- section: feature-settings | objectives: 1.1.3 -->
## Les paramètres de fonctionnalités : runtime, Photon, machine learning

Toutes les versions de **Databricks Runtime** (DBR) incluent Apache Spark ; la version fixe les versions de Spark et des bibliothèques. Recommandations :

| Charge de travail | Runtime |
| --- | --- |
| Calcul universel | La version la plus récente |
| Calcul de jobs opérationnels | Une version Long Term Support (LTS) |
| Science des données et machine learning | Databricks Runtime ML |

**Databricks Runtime ML** : cochez la case **Machine learning** dans l'interface de création du calcul. Il ajoute les bibliothèques courantes de ML et de deep learning et fixe le mode d'accès à **Dedicated** avec votre compte comme utilisateur : les données Unity Catalog sur un runtime ML exigent le mode d'accès Dedicated. Pour du calcul GPU, sélectionnez un type d'instance GPU comme type de worker.

**Photon** est le moteur vectorisé natif en C++ qui remplace l'exécution Spark SQL basée sur la JVM pour les opérations prises en charge.

- Toujours actif sur le calcul serverless, les entrepôts SQL et les pipelines serverless ; activé par défaut sur le calcul classique (case **Use Photon Acceleration** sous **Performance**).
- Les API Clusters et Jobs exigent `"runtime_engine": "PHOTON"` explicitement ; l'API Pipelines utilise `"photon": true`.
- Gains : charges SQL et DataFrame avec de grands scans, des jointures, des agrégations et des écritures Delta, Iceberg ou Parquet (`MERGE`, `INSERT`, CTAS) ; il remplace les jointures sort-merge par des jointures de hachage. Predictive I/O et l'élagage dynamique de fichiers dans `MERGE`, `UPDATE` et `DELETE` exigent Photon.
- Aucun gain : les requêtes qui s'exécutent en moins de deux secondes. Non pris en charge : les UDF, les API RDD et Dataset, le streaming avec état. Les opérations non prises en charge basculent sur Spark de façon transparente.
- Les types d'instances Photon consomment des DBU à un tarif différent de celui de la même instance sans Photon.

> **Conseil d'examen.** « Accélérer l'ETL SQL et DataFrame sur de grandes tables » désigne Photon. « Le job est surtout composé d'UDF Python » ou « du code RDD » signifie que Photon n'aidera pas.

<!-- section: libraries | objectives: 1.1.4 -->
## L'installation de bibliothèques

| Étendue | Comment | Visible par |
| --- | --- | --- |
| À l'étendue du calcul | Calcul > onglet Libraries > Install new (ou API, CLI) | Tous les notebooks et jobs du calcul |
| À l'étendue du notebook (Python, R) | `%pip install` dans le notebook | Cette session de notebook uniquement ; à réinstaller à chaque session |
| Serverless | Panneau latéral Environment (environnement de base, dépendances) | Le notebook ou la tâche de job |
| Tâche de job | Bibliothèques dépendantes de la tâche, ou environnement du job | Cette tâche |

Sources des bibliothèques à l'étendue du calcul : fichiers de l'espace de travail (Workspace), volumes Unity Catalog, chemin de fichier ou URI ADLS (`abfss://...`), PyPI, Maven, CRAN, et DBFS (non recommandé : tout utilisateur peut modifier les fichiers DBFS ; le stockage de bibliothèques à la racine DBFS est désactivé par défaut à partir de DBR 15.1).

```text
%pip install /Volumes/prod_shared/tools/wheels/contoso_utils-1.2.0-py3-none-any.whl
```

Les règles qu'utilise l'examen :

- Avec Unity Catalog sur DBR 13.3 LTS et versions ultérieures, installez depuis des **volumes** sur un calcul en mode d'accès Standard et accordez aux utilisateurs l'accès en lecture au volume.
- En mode d'accès Standard, un administrateur doit ajouter les **coordonnées Maven et les chemins des JAR** à la **liste d'autorisation** (allowlist).
- L'identité qui installe doit pouvoir lire le fichier : l'utilisateur qui installe en mode Standard, le principal dédié en mode Dedicated.
- Les JAR ne peuvent pas être installés à l'étendue du notebook. Les bibliothèques à l'étendue du notebook n'affectent pas les autres notebooks du même calcul.
- Un notebook déjà attaché ne voit une nouvelle bibliothèque du calcul qu'après le démarrage d'une nouvelle session.
- Une désinstallation affiche **Uninstall pending restart** jusqu'au redémarrage du calcul. Pour mettre à jour, désinstallez l'ancienne version et installez la nouvelle (un `requirements.txt` réinstallé n'en a pas besoin).
- Une stratégie qui impose des bibliothèques les installe automatiquement et bloque toute autre installation ou désinstallation.
- Priorité Python : l'étendue du notebook (`%pip`) l'emporte sur l'étendue du calcul, qui l'emporte sur les bibliothèques intégrées au runtime.

> **Piège d'examen.** Le calcul serverless n'a pas d'onglet Libraries : les bibliothèques à l'étendue du calcul, Maven et les scripts d'initialisation ne sont pas pris en charge. Utilisez l'environnement ou `%pip`.

<!-- section: compute-permissions | objectives: 1.1.5 -->
## Les autorisations d'accès au calcul

| Capacité | CAN ATTACH TO | CAN RESTART | CAN MANAGE |
| --- | --- | --- | --- |
| Attacher un notebook, voir l'interface Spark et les métriques | Oui | Oui | Oui |
| Démarrer, redémarrer, arrêter | Non | Oui | Oui |
| Modifier, redimensionner, attacher des bibliothèques | Non | Non | Oui |
| Voir les journaux du pilote | Non | Non | Oui |
| Modifier les autorisations | Non | Non | Oui |

CAN VIEW est un niveau en bêta. Il faut CAN MANAGE sur un calcul pour en modifier les autorisations. Pour permettre aux utilisateurs CAN ATTACH TO ou CAN RESTART de lire les journaux du pilote, définissez `spark.databricks.acl.needAdminPermissionToViewLogs false` dans la configuration Spark. Les pools ont NO PERMISSIONS, CAN ATTACH TO (attacher un cluster au pool) et CAN MANAGE (modifier, supprimer, autorisations).

| Niveau sur un entrepôt SQL | Permet |
| --- | --- |
| CAN VIEW | Voir les détails, les requêtes et la supervision ; aucune exécution de requête |
| CAN USE | Démarrer l'entrepôt et exécuter des requêtes |
| CAN MONITOR | CAN USE, plus voir toutes les requêtes de l'entrepôt et l'onglet de supervision |
| IS OWNER / CAN MANAGE | En plus arrêter, modifier, supprimer et modifier les autorisations |

Les autorisations sur le calcul et les privilèges Unity Catalog sont distincts : CAN ATTACH TO permet d'exécuter du code, mais chaque requête reste vérifiée par rapport aux privilèges Unity Catalog de l'utilisateur en mode d'accès Standard.

> **Piège d'examen.** « L'utilisateur doit redémarrer le cluster sans en modifier la configuration » correspond à CAN RESTART ; « installer une bibliothèque » exige CAN MANAGE, pas CAN RESTART.

<!-- section: key-points -->
## Points clés

- Le serverless d'abord (notebooks, jobs, pipelines) ; le classique quand il faut des notebooks R ou Scala, des RDD, des scripts d'initialisation, Maven ou une VM précise.
- Les jobs de production s'exécutent sur du calcul de jobs, pas sur du calcul universel ; les tâches SQL et dbt sur un entrepôt SQL serverless ou pro.
- Le « calcul partagé » est le mode d'accès Standard ; le runtime ML et R exigent le mode d'accès Dedicated.
- Les pools accélèrent les démarrages et ne facturent aucun DBU à l'inactivité, mais les VM restent facturées ; l'arrêt automatique va de 10 à 10 000 minutes.
- Photon est actif par défaut, aide les gros traitements SQL et DataFrame, pas les UDF, les RDD ni les requêtes courtes.
- Installez les bibliothèques depuis des volumes ; Maven et les JAR exigent la liste d'autorisation en mode Standard ; une désinstallation exige un redémarrage.
- CAN ATTACH TO exécute du code, CAN RESTART contrôle l'état, CAN MANAGE configure.
