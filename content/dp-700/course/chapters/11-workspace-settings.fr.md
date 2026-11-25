Un espace de travail Fabric porte des paramètres qui changent la façon dont chacun de ses éléments s'exécute : le pool Spark et l'environnement sur lesquels démarrent les notebooks, le domaine auquel appartient l'espace de travail, les options OneLake comme le cache des raccourcis et les diagnostics, et le pool qui exécute les travaux Apache Airflow. Les questions d'examen décrivent un symptôme (démarrage de session lent, travail qui bloque la capacité, coûts de sortie élevés, exigence d'audit) ou une contrainte (réduire les coûts, DAG de production qui doivent toujours tourner) et demandent quel paramètre modifier, à quel niveau et qui peut le modifier.

<!-- section: spark-pools | objectives: 1.1.1 -->
## Les pools Spark de l'espace de travail

Les paramètres Spark se trouvent dans **Workspace settings > Data Engineering/Science > Spark settings**, et seul un **Admin** de l'espace de travail peut les modifier. La section **Pool** définit le **Default pool for workspace** (pool par défaut de l'espace de travail), utilisé par chaque notebook et chaque définition de travail Spark qui n'en choisit pas un autre.

| | Pool de démarrage (Starter pool) | Pool Spark personnalisé |
| --- | --- | --- |
| Création | Automatique, avec chaque espace de travail (c'est le pool par défaut) | Par un Admin de l'espace de travail, avec **New Pool** |
| Démarrage de session | Environ 5 à 10 secondes : clusters actifs préhydratés de nœuds moyens | Environ 3 minutes, car les nœuds sont provisionnés à la demande |
| Dimensionnement | Géré par Fabric, dépend de la référence SKU de la capacité ; l'Admin peut ajuster le nombre maximal de nœuds et d'exécuteurs | Famille de nœuds, taille de nœud, mise à l'échelle automatique et bornes d'exécuteurs choisies par l'Admin |
| Prérequis | Aucun | Le paramètre de capacité **Customized workspace pools** (Capacity settings > Spark Compute) doit être activé ; il l'est par défaut |
| Usage type | Développement interactif, travaux courts | Charges qui ont besoin de nœuds plus gros ou optimisés pour la mémoire, ou d'un nombre de nœuds fixe |

Tailles de nœuds d'un pool personnalisé :

| Taille de nœud | vCores | Mémoire |
| --- | --- | --- |
| Small | 4 | 32 Go |
| Medium | 8 | 64 Go |
| Large | 16 | 128 Go |
| X-Large | 32 | 256 Go |
| XX-Large | 64 | 512 Go |

Options d'un pool personnalisé :

- **Autoscale** (mise à l'échelle automatique) : le pool grandit jusqu'au nombre maximal de nœuds pendant les travaux et libère les nœuds ensuite. Un pool personnalisé peut avoir jusqu'à **200 nœuds**.
- **Dynamically allocate executors** (allocation dynamique des exécuteurs) : Spark choisit le nombre d'exécuteurs, dans les bornes fixées, selon le volume de données.
- **Nœud unique** : fixez le nombre minimal de nœuds à 1 pour que le pilote et l'exécuteur tournent sur le même nœud.
- Une session sur un pool personnalisé se **met en pause automatiquement** après 2 minutes d'inactivité une fois son travail terminé ; vous ne payez que pendant l'utilisation du calcul.

> **Piège d'examen.** Remplacer le pool de démarrage par un pool personnalisé comme pool par défaut de l'espace de travail fait passer chaque démarrage de session de quelques secondes à quelques minutes. Si l'exigence est « réduire le temps de démarrage des sessions » pour des notebooks interactifs, gardez le pool de démarrage.

<!-- section: spark-environment-jobs | objectives: 1.1.1 -->
## Environnement, travaux et haute concurrence

**Environnement.** Un élément **Environment** regroupe la version du runtime Spark, les propriétés Spark, les propriétés de calcul et les bibliothèques. Choisissez-en un comme **environnement par défaut** de l'espace de travail pour donner à tous les notebooks les mêmes bibliothèques et le même runtime ; sans environnement par défaut, choisissez la **Runtime version** dans une liste déroulante. Le bouton **Customize compute configurations for items** permet aux utilisateurs de modifier les cœurs et la mémoire du pilote et des exécuteurs par élément (via un environnement ou une session). Quand il est désactivé, la section **Compute** des éléments Environment est désactivée (pas d'**Environment pool**, pas de tailles de pilote ni d'exécuteurs) et tous les travaux Spark utilisent le pool par défaut de l'espace de travail : choisir un pool dans un environnement exige que ce bouton soit activé.

**Travaux (Jobs).** Ces paramètres contrôlent l'admission des travaux Spark sur la capacité :

| Paramètre | Valeur par défaut | Effet |
| --- | --- | --- |
| Admission optimiste des travaux | Activée | Un travail démarre avec ses cœurs minimaux et grandit si la capacité est libre |
| **Reserve maximum cores for active Spark jobs** | Désactivé | Désactive l'admission optimiste : chaque travail réserve ses cœurs maximaux, donc moins de travaux tournent à la fois mais aucun ne manque de cœurs |
| **Spark session timeout** | 20 minutes | Les sessions interactives de notebook expirent après ce délai d'inactivité |
| **Set maximum job lifetime** | Désactivé | Fabric annule les travaux utilisateur (notebooks, y compris lancés par des pipelines, définitions de travail Spark, sessions Livy) qui dépassent la limite ; les travaux système comme la maintenance des tables ne sont pas concernés |

**Haute concurrence.** Le mode haute concurrence permet à plusieurs notebooks de **partager une même session Spark** : le deuxième notebook démarre instantanément, et seul le notebook qui a démarré la session est facturé. Chaque notebook garde son propre REPL, donc les variables n'entrent pas en conflit.

| Paramètre | S'applique à | Utilisation |
| --- | --- | --- |
| **For notebooks** | Notebooks interactifs ; activé par défaut | Dans le notebook, onglet **Run** > type de session **New high concurrency session**, puis attachez d'autres notebooks à cette session |
| **For pipeline running multiple notebooks** | Activités Notebook des pipelines | Les activités Notebook qui ont la même **balise de session** (session tag, dans Advanced settings) partagent une session |

Des notebooks ne partagent une session que s'ils sont exécutés par le **même utilisateur**, dans le même espace de travail, avec le **même lakehouse par défaut** (ou aucun), la **même configuration de calcul Spark** et les **mêmes packages de bibliothèques**. Une session accueille **5 notebooks** par défaut ; définissez la propriété Spark `spark.highConcurrency.max` (2 à 50) dans l'environnement pour changer cette limite. Un sixième notebook avec la même balise de session obtient une nouvelle session.

La **journalisation automatique** des modèles et expériences de machine learning (autologging MLflow) est aussi un paramètre de l'espace de travail.

| Exigence | Paramètre |
| --- | --- |
| Mêmes bibliothèques dans tous les notebooks de l'espace de travail | Environnement par défaut |
| Arrêter les travaux incontrôlés qui consomment la capacité pendant des heures | Set maximum job lifetime |
| Garantir qu'un travail en cours ne manque jamais de cœurs | Reserve maximum cores for active Spark jobs |
| Dix notebooks d'un pipeline démarrent trop lentement | Haute concurrence pour les pipelines, avec une balise de session |
| Les utilisateurs ne doivent pas dimensionner eux-mêmes pilotes et exécuteurs | Désactiver Customize compute configurations for items |

> **Piège d'examen.** Des notebooks exécutés par deux utilisateurs différents, ou attachés à deux lakehouses par défaut différents, ne partagent jamais une session haute concurrence, quelle que soit la balise de session.

<!-- section: domains | objectives: 1.1.2 -->
## Les domaines

Un **domaine** regroupe des espaces de travail par secteur d'activité (Finance, Ventes, RH). Chaque élément d'un espace de travail appartient au domaine de son espace de travail. Les domaines servent à la découverte (le filtre de domaine du catalogue OneLake) et à la **gouvernance fédérée** : certains paramètres du locataire peuvent être délégués au domaine. Les **sous-domaines** affinent un domaine ; ils n'ont pas d'administrateurs propres (ceux du domaine parent s'appliquent) et n'ont que des paramètres généraux.

| Rôle | Attribué par | Peut |
| --- | --- | --- |
| Administrateur Fabric | Rôle Fabric Administrator dans Microsoft Entra ID | Créer, renommer et supprimer des domaines, nommer les administrateurs et contributeurs de domaine, attribuer n'importe quel espace de travail |
| Administrateur de domaine | Administrateur Fabric | Modifier la description, l'image et les contributeurs de son domaine, attribuer des espaces de travail, remplacer les paramètres délégués ; ne peut ni renommer ni supprimer le domaine, ni ajouter d'autres administrateurs de domaine |
| Contributeur de domaine | Administrateur Fabric ou administrateur de domaine (tout le monde par défaut) | Attribuer au domaine un espace de travail **dont il est administrateur**, depuis les paramètres de l'espace de travail |

Façons d'attribuer des espaces de travail :

| Méthode | Qui | Effet |
| --- | --- | --- |
| Par nom d'espace de travail | Administrateur Fabric ou de domaine, dans le portail d'administration | Les espaces de travail sélectionnés |
| Par administrateur d'espace de travail | Administrateur Fabric ou de domaine | Tous les espaces de travail que les utilisateurs ou groupes choisis administrent aujourd'hui (pas les espaces Mon espace de travail, pas les futurs) |
| Par capacité | Administrateur Fabric ou de domaine | Tous les espaces de travail présents aujourd'hui sur les capacités choisies (pas ceux ajoutés plus tard) |
| Depuis les paramètres de l'espace de travail | Admin de l'espace de travail qui est contributeur de domaine | Cet espace de travail |
| Domaine par défaut | Utilisateurs ou groupes listés dans le paramètre de domaine par défaut du domaine | Leurs espaces de travail non attribués et tous ceux qu'ils créeront ensuite rejoignent le domaine |

Les **paramètres délégués** d'un domaine remplacent le paramètre du locataire pour les espaces de travail du domaine : une **étiquette de confidentialité par défaut** pour le domaine, et la **certification** (l'activer, nommer les certificateurs du domaine et l'URL de documentation).

> **Piège d'examen.** Un domaine n'accorde ni ne restreint aucun accès. Un utilisateur qui voit un élément dans un domaine a toujours besoin d'un rôle d'espace de travail ou d'une autorisation sur l'élément pour l'ouvrir.

<!-- section: onelake-settings | objectives: 1.1.3 -->
## Les paramètres OneLake

L'onglet **OneLake** des paramètres de l'espace de travail contient deux fonctionnalités que les questions d'examen confondent avec la sécurité.

**Cache des raccourcis.** Quand OneLake lit des fichiers via un raccourci externe, il peut les conserver dans un cache de l'espace de travail, ce qui réduit les **coûts de sortie (egress) entre clouds**.

- Pris en charge pour les raccourcis **Amazon S3, compatibles S3, Google Cloud Storage et passerelle de données locale** ; les raccourcis ADLS Gen2 ne figurent pas dans la liste.
- Passez le cache sur **On** et définissez la **Retention Period** (période de rétention), de **1 à 28 jours**. Chaque lecture d'un fichier remet sa période de rétention à zéro.
- Les fichiers de plus de **1 Go** ne sont pas mis en cache.
- **Reset cache** supprime d'un coup tous les fichiers en cache de l'espace de travail.

**Diagnostics OneLake.** Le bouton **Add diagnostic events to a lakehouse** envoie les **événements d'accès aux données** sous forme de fichiers JSON dans un lakehouse que vous choisissez. Chaque opération via le portail Fabric et les API Blob ou ADLS est journalisée, y compris via des raccourcis ; pour l'accès par les moteurs Fabric (Spark, SQL), seul un événement `FabricWorkloadAccess` indique qu'un accès temporaire a été accordé, et le détail se trouve dans les journaux propres au moteur.

- Il faut le rôle **Admin** sur l'espace de travail surveillé et **Contributor** sur le lakehouse de destination.
- Le lakehouse de destination doit être sur la **même capacité** que l'espace de travail surveillé. Déplacer l'espace de travail vers une autre capacité, ou supprimer le lakehouse de destination, désactive les diagnostics (pour tous les espaces de travail qui pointent vers ce lakehouse) ; les événements déjà écrits ne sont pas supprimés.
- Les événements commencent à arriver en une heure environ, sous `Files/DiagnosticLogs/OneLake/Workspaces/...`.
- L'**immuabilité** peut être appliquée à l'espace de travail qui contient le lakehouse de diagnostic : personne ne peut alors modifier ni supprimer les fichiers pendant la période de rétention ; ce choix ne peut plus être modifié une fois défini.

| Exigence | Paramètre |
| --- | --- |
| Réduire le coût de lecture quotidienne d'un compartiment S3 depuis des notebooks | Cache des raccourcis activé, rétention assez longue pour couvrir l'intervalle entre lectures |
| Prouver qui a accédé aux fichiers d'un lakehouse, avec des enregistrements infalsifiables | Diagnostics OneLake vers un lakehouse, avec immuabilité |
| Vider immédiatement le cache des raccourcis de l'espace de travail | Reset cache |

> **Conseil d'examen.** Les diagnostics OneLake enregistrent les accès aux données dans OneLake. Les activités comme créer, partager ou supprimer un élément figurent dans le journal d'audit Fabric (voir le chapitre sur la sécurité).

<!-- section: airflow-settings | objectives: 1.1.4 -->
## Les paramètres des travaux Apache Airflow

Un **travail Apache Airflow** (Apache Airflow job) exécute des DAG Airflow sur un calcul géré par Fabric. Ses paramètres d'espace de travail se trouvent dans **Workspace settings > Data Factory > Apache Airflow Runtime Settings**, où **Default Data Workflow Setting** choisit le pool. Quand le paramètre de personnalisation des configurations de calcul par élément est désactivé, le pool de démarrage est utilisé pour tous les environnements de l'espace de travail.

| | Pool de démarrage (Starter pool) | Pool personnalisé |
| --- | --- | --- |
| Par défaut | Oui | Non : choisissez **New Pool** |
| Disponibilité | Démarre instantanément, reprend en 5 minutes au plus ; **s'arrête après 20 minutes d'inactivité** | Créé à l'arrêt ; **toujours actif** jusqu'à une pause manuelle ; reprend en 5 minutes au plus |
| Taille de nœud | Large (fixe) | **Small** (DAG simples) ou **Large** (DAG complexes ou de production) |
| Mise à l'échelle | Aucune | **Enable autoscale**, et **Extra nodes** : chaque nœud ajoute la capacité d'environ trois workers de plus, donc plus de tâches de DAG en parallèle |
| Usage conseillé | Développement et exécutions occasionnelles | DAG de production qui doivent s'exécuter à l'heure, sans délai de démarrage |

- Un pool personnalisé démarre avec trois nœuds de base (planificateur, serveur web, worker) et consomme des unités de capacité tant qu'il tourne, même sans activité de DAG : mettez-le en pause, ou suspendez la capacité, pour arrêter le coût.
- Microsoft recommande au moins une capacité **F8** pour un petit pool et **F16** pour un grand.
- Les réseaux privés et les réseaux virtuels ne sont pas pris en charge avec les travaux Apache Airflow.

> **Piège d'examen.** Un DAG planifié toutes les heures sur le pool de démarrage attend la reprise de l'environnement après chaque période d'inactivité de 20 minutes. Pour des planifications de production sans délai, utilisez un pool personnalisé ; pour le développement, le pool de démarrage coûte moins cher.

<!-- section: key-points -->
## Points clés

- Les paramètres Spark sont réservés à l'Admin. Pool de démarrage = quelques secondes, dimensionné par Fabric ; pool personnalisé = vos nœuds, environ 3 minutes de démarrage, nécessite Customized workspace pools sur la capacité.
- Travaux : admission optimiste par défaut, réserver les cœurs maximaux pour éviter la pénurie, expiration de session à 20 minutes, durée de vie maximale pour arrêter les travaux incontrôlés.
- Haute concurrence : même utilisateur, même lakehouse par défaut, même calcul et mêmes bibliothèques ; 5 notebooks par session par défaut ; les pipelines regroupent les notebooks par balise de session ; seul le premier notebook est facturé.
- Les domaines organisent et délèguent la gouvernance (étiquette par défaut, certification) mais n'accordent jamais d'accès ; les contributeurs doivent être Admin de l'espace de travail.
- Onglet OneLake : cache des raccourcis S3, GCS, compatibles S3 et passerelle (1 à 28 jours, 1 Go par fichier) ; diagnostics vers un lakehouse de la même capacité.
- Airflow : le pool de démarrage s'arrête après 20 minutes d'inactivité ; le pool personnalisé est toujours actif, Small ou Large, avec mise à l'échelle automatique et nœuds supplémentaires.
