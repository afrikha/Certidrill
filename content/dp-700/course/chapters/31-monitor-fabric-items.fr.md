Fabric offre plusieurs endroits pour suivre ce qui s'exécute, du hub de surveillance (Monitor hub) aux journaux interrogeables et aux alertes. Les questions d'examen décrivent un symptôme ou une exigence (voir toutes les actualisations en échec de la semaine, recevoir un e-mail quand un pipeline planifié échoue, interroger les journaux d'exécution en KQL) et demandent quel outil ou quel paramètre y répond.

<!-- section: monitoring-tools | objectives: 3.1.1, 3.1.2, 3.1.3 -->
## Choisir un outil de supervision

| Exigence | Outil |
| --- | --- |
| Voir dans une seule liste les exécutions de pipelines, dataflows, notebooks, définitions de tâche Spark, tâches de copie (Copy job) et modèles sémantiques, filtrées par type d'élément, statut et espace de travail | Hub de surveillance (Monitoring hub, filtres Status, Item Type, Start Time, Submitter, Location), ou page **Job runs** du nouveau hub de surveillance (préversion) |
| Voir les exécutions récentes d'un élément, avec l'auteur, le statut et la durée | **Recent runs** de l'élément (menu de l'élément dans l'espace de travail) |
| Examiner les activités d'une exécution de pipeline, avec un diagramme de Gantt | La page de détail de l'exécution du pipeline |
| Examiner les travaux Spark, les exécuteurs et les journaux du pilote d'un notebook | Page de détail de l'application Spark, puis l'interface Spark UI |
| Suivre les événements qui traversent un flux d'événements (eventstream), et ses erreurs | Onglets **Data insights** et **Runtime logs** de l'eventstream |
| Conserver les journaux d'exécution de nombreux éléments, les interroger en KQL, créer des tableaux de bord | Supervision de l'espace de travail, préversion (les journaux arrivent dans un eventhouse) |
| Trouver quel élément consomme la capacité, les pics de demande | Application Microsoft Fabric Capacity Metrics |
| Analyser les requêtes T-SQL terminées d'un entrepôt | Vues `queryinsights` |
| Être prévenu quand une tâche échoue ou réussit | Alertes (notifications d'échec dans la planification de l'élément, règles Activator sur les événements de tâche, alertes du hub de surveillance en préversion) |

Tout utilisateur de Fabric peut ouvrir le hub de surveillance, mais il ne voit que les éléments qu'il a le droit de consulter. Le nouveau hub de surveillance (préversion) comporte des pages comme **Job runs**, **Capacity and cost** et **Alerts**, et ses alertes de tâche sont aussi en préversion ; l'ancien hub de surveillance (Monitoring hub) reste disponible et n'est pas en préversion.

> **Piège d'examen.** Le hub de surveillance montre des exécutions, pas des données. Pour savoir pourquoi des lignes manquent dans une table, ouvrez le détail de l'exécution (sortie de l'activité, détails de l'actualisation) ; pour conserver des semaines de journaux et les interroger, activez la supervision de l'espace de travail.

<!-- section: monitor-ingestion | objectives: 3.1.1 -->
## Monitorer l'ingestion des données

**Page Job runs (nouveau hub de surveillance, préversion).** Chaque ligne montre le statut de la dernière exécution d'un élément, sa durée moyenne et un résumé de ses cinq dernières exécutions. Filtres : une plage de temps, **Item type**, **Status** et **Workspace** ; la zone de recherche par mot-clé ne porte que sur les éléments chargés dans la page courante. La page ne s'actualise pas en continu : sélectionnez l'icône **Reload** (appelée **Refresh** dans la liste des tâches de la page). Sélectionner une ligne ouvre les détails de la dernière exécution (auteur, ce qui a déclenché l'exécution) et l'historique des exécutions. Sélectionner une exécution ouvre **Run details**, avec les activités sous forme de tableau ou de diagramme de Gantt. Pour une exécution de pipeline en échec, **Investigate** (préversion) lance une investigation en lecture seule par l'agent Operations, qui propose les causes probables sans modifier le pipeline.

Les types d'éléments pris en charge comprennent les pipelines, les tâches de copie, Dataflow Gen2, les notebooks, les définitions de tâche Spark, les lakehouses, les modèles sémantiques et les fonctions de données utilisateur, mais pas Dataflow Gen1. Une exécution qui reste **Queued** attend des ressources : vérifiez la capacité.

**Ancien hub de surveillance.** Filtrez par **Status**, **Item Type**, **Start Time**, **Submitter** et **Location**. Dans **Column Options**, activer **Upstream run** et **Downstream runs** retrace la hiérarchie des tâches (un pipeline qui a appelé un notebook, par exemple). Survolez une ligne pour ouvrir **View detail**, ou sélectionnez le nom du pipeline pour ouvrir la page de détail de l'exécution avec ses exécutions d'activités. Pour une exécution terminée, l'icône **Retry** la relance ; dans la vue de détail, vous pouvez relancer **à partir d'une activité en échec** ou **à partir d'une activité sélectionnée**, de sorte que les activités amont réussies ne sont pas réexécutées.

**Dans l'éditeur de pipeline.** L'onglet **Output** sous le canevas montre la dernière exécution activité par activité, avec l'entrée, la sortie et l'erreur de chacune. La sortie d'une activité Copy montre ce qui a réellement été utilisé, comme `usedDataIntegrationUnits` et les copies parallèles.

**Eventstreams.** Sélectionnez un nœud sur le canevas, puis l'onglet **Data insights**. Le nœud de l'eventstream trace **IncomingMessages**, **OutgoingMessages**, **IncomingBytes** et **OutgoingBytes**. Les nœuds Azure Event Hubs, Azure IoT Hub, lakehouse, eventhouse (mode *Event processing before ingestion*), flux dérivé (derived stream) et Activator offrent des métriques plus riches :

| Métrique | À surveiller pour |
| --- | --- |
| Input events / Output events | Le volume qui entre dans le nœud et qui en sort |
| Backlogged input events | Le moteur qui prend du retard sur l'entrée |
| Runtime errors | Les erreurs pendant le traitement des événements |
| Data conversion errors | Les événements de sortie qui ne correspondent pas au schéma de sortie attendu |
| Deserialization errors | Les événements d'entrée illisibles (mauvais format) |
| Watermark delay | Le retard du traitement sur le temps réel, en secondes |

Les sources de connecteur de streaming (Apache Kafka, Amazon Kinesis, Google Cloud Pub/Sub, sources CDC et autres) offrent un troisième ensemble : Source Outgoing Events, Source Incoming Events, Connector Errors Logged, Connector Processing Errors, Connector Processing Failures et Connector Events Skipped.

L'onglet **Runtime logs** affiche les journaux du moteur à trois niveaux (avertissement, erreur, information). Les deux onglets demandent au moins le rôle Viewer.

**Eventhouses.** Les résultats d'ingestion sont collectés par la supervision de l'espace de travail (voir plus bas), et la commande KQL `.show ingestion failures` liste les échecs des commandes d'ingestion, conservés 14 jours.

<!-- section: monitor-transformation | objectives: 3.1.2 -->
## Monitorer la transformation des données

**Dataflow Gen2.** Dans l'espace de travail, le menu du dataflow > **Recent runs** ouvre l'historique des actualisations : heure de début, statut, durée et type de chaque actualisation. Il affiche jusqu'à 50 actualisations ou six mois, selon la première limite atteinte (OneLake conserve jusqu'à 250 actualisations ou six mois). Sélectionnez une heure de début pour ouvrir les détails de l'actualisation :

| Niveau | Affiche |
| --- | --- |
| Actualisation | Statut, type d'actualisation, heure de début et de fin, durée, Request ID, Session ID, Dataflow ID |
| Tables | Les requêtes dont le chargement est activé, placées en zone de transit (staging) par le dataflow, chacune avec ses détails |
| Activités | Les actions comme le chargement vers une destination de sortie, avec des statistiques : octets et lignes lus et écrits |

Depuis une exécution, **Download detailed logs** fournit un ZIP des journaux du moteur mashup Power Query ; ils apparaissent quelques minutes après l'actualisation, restent disponibles 28 jours et demandent au moins le rôle Viewer. Plusieurs exécutions peuvent aussi être exportées en CSV. Dans la liste de l'espace de travail, un point d'exclamation rouge dans la colonne **Status** signale l'échec de la dernière actualisation, du dernier enregistrement ou de la dernière validation : pour une actualisation, ouvrez l'historique ; pour un enregistrement ou une validation, ouvrez l'éditeur et validez.

**Notebooks et définitions de tâche Spark.** Les exécutions Spark apparaissent dans le hub de surveillance (y compris celles lancées par des pipelines), dans le notebook lui-même (progression des travaux, exécuteurs et journaux par cellule, avec les recommandations du conseiller Spark) et dans l'activité notebook du pipeline (liens vers l'exécution, l'instantané et l'erreur en ligne). La **page de détail de l'application Spark** comporte ces onglets : **Jobs** (ID du travail, statut, étapes, tâches, durée, données lues et écrites, extrait de code ; la description d'un travail ouvre Spark UI), **Resources** (graphique d'utilisation des exécuteurs), **Logs** (journaux Livy, Prelaunch et Driver, avec recherche et téléchargement), **Data** (fichiers d'entrée et de sortie), **Item snapshots** (le notebook, la définition de tâche Spark ou le pipeline tels qu'exécutés) et **Diagnostics** (conseiller Spark et analyse des erreurs).

**Entrepôts.** Les requêtes T-SQL terminées sont conservées 30 jours dans les vues `queryinsights`, disponibles dans les entrepôts et les points de terminaison d'analytique SQL. Une requête terminée peut mettre jusqu'à 15 minutes à apparaître.

```text
-- Top CPU consumers among completed requests
SELECT TOP 100 distributed_statement_id, query_hash, allocated_cpu_time_ms, label, command
FROM queryinsights.exec_requests_history
ORDER BY allocated_cpu_time_ms DESC;
```

Autres vues : `exec_sessions_history`, `long_running_queries` (par durée écoulée médiane), `frequently_run_queries` et `sql_pool_insights` (pression sur les ressources). `query_hash` regroupe les requêtes de même forme. Les consulter demande le rôle Contributor ou supérieur.

<!-- section: monitor-semantic-refresh | objectives: 3.1.3 -->
## Monitorer l'actualisation du modèle sémantique

Pour un modèle sémantique en mode import, ouvrez le modèle > **Refresh** > **Refresh history** : statut, heure de début, durée et message d'erreur de chaque tentative. Power BI relance automatiquement une actualisation en échec, et chaque tentative en échec apparaît avec un lien **Show** vers ses détails. Chaque tentative comporte deux phases, **Data** et **Query Cache** ; la phase de cache de requêtes ne s'exécute que si la phase de données réussit.

| Fait | Valeur |
| --- | --- |
| Actualisations planifiées par jour | 8 en Pro (capacité partagée) ; 48 en Premium, PPU ou capacité Fabric |
| Durée maximale d'une actualisation | 2 heures en capacité partagée, 5 heures en Premium (le point de terminaison XMLA permet de la dépasser) |
| Planification désactivée | Après quatre échecs consécutifs ou une erreur irrécupérable (informations d'identification expirées) ; le seuil n'est pas modifiable |
| Planification suspendue | Après deux mois sans consultation d'un rapport ou d'un tableau de bord dépendant |
| Notification d'échec | E-mail au propriétaire par défaut, plus les contacts de **Email these contacts when the refresh fails** |

Les e-mails d'échec ne sont envoyés que pour les actualisations planifiées, pas pour les actualisations à la demande ou programmatiques (API REST, Power Automate).

**Direct Lake.** L'actualisation d'un modèle Direct Lake est un **framing** (cadrage) : elle ne copie que des métadonnées et fait pointer le modèle vers la dernière version des tables Delta, en quelques secondes et à faible coût. Si une table dépasse les garde-fous de la SKU (fichiers Parquet, groupes de lignes ou lignes par table), l'actualisation d'un modèle Direct Lake sur OneLake échoue jusqu'à ce que les tables Delta soient optimisées ; un modèle Direct Lake sur SQL bascule en DirectQuery si le repli est autorisé, et l'actualisation réussit avec un avertissement.

**Depuis un pipeline.** L'activité **Semantic model refresh** actualise un modèle après le chargement qui l'alimente. Paramètres : connexion, espace de travail, modèle sémantique, puis dans **Advanced** : **Wait on completion** (activé par défaut : l'activité se termine quand l'actualisation se termine, donc une actualisation en échec fait échouer l'activité), **Max parallelism**, **Retry Count**, un délai d'expiration de l'actualisation, une validation **Transactional** ou **Partial Batch**, et les tables ou partitions à actualiser. Sans sélection, elle lance une actualisation complète.

> **Conseil d'examen.** « Actualiser le modèle seulement après la réussite du chargement du lakehouse, et voir l'échec dans l'exécution du pipeline » désigne l'activité Semantic model refresh avec **Wait on completion**, sur le chemin Upon Success du chargement, et non une planification d'actualisation séparée.

<!-- section: workspace-monitoring | objectives: 3.1.1, 3.1.2, 3.1.3 -->
## La supervision de l'espace de travail

La supervision de l'espace de travail (workspace monitoring, préversion) collecte les journaux et les métriques des éléments d'un espace de travail dans un eventhouse, où vous les interrogez en KQL, enregistrez des requêtes dans un ensemble de requêtes KQL, créez des tableaux de bord en temps réel ou des rapports Power BI, et créez des alertes sur les résultats.

- Elle se gère par un **élément de supervision** (monitoring item), qui contient un eventhouse, un activator et un agent Operations. Les journaux peuvent aller dans l'eventhouse de cet élément ou dans celui d'un autre élément de supervision, pour centraliser plusieurs espaces de travail (chaque espace de travail source y obtient sa propre base de données KQL ; les deux espaces de travail doivent être dans la même région Azure). Ce choix n'est plus modifiable ensuite.
- La collecte est **désactivée** à la création de l'élément. Une fois activée, l'activité antérieure n'est pas récupérée.
- Un seul élément de supervision collecte la télémétrie d'un espace de travail.
- La base de données de supervision est en lecture seule ; les utilisateurs de l'espace de travail ayant au moins le rôle Contributor peuvent l'interroger.
- La rétention est de **30 jours** par défaut, modifiable dans la base de données KQL avec **Manage** > **Data policies** ; la période de mise en cache doit être inférieure ou égale à la période de rétention.

| Charge de travail | Télémétrie |
| --- | --- |
| Data Factory | Exécutions d'activités de pipeline, tâches de copie, Dataflow Gen2 |
| Data Warehouse | Journaux d'exécution des requêtes des entrepôts, des points de terminaison d'analytique SQL et des instantanés d'entrepôt |
| Mirroring | Journaux d'exécution des bases de données mises en miroir |
| Databases, Data Engineering | Métriques des bases de données SQL ; métriques et journaux d'opérations des API GraphQL |
| Power BI | Journaux d'opérations des modèles sémantiques |
| Real-Time hub | Journaux des événements de tâche |
| Real-Time Intelligence | Requêtes, commandes et résultats d'ingestion des eventhouses ; statut et métriques d'erreur des eventstreams ; notifications des règles Activator ; journaux d'opérations des tableaux de bord en temps réel et des ensembles de requêtes KQL |

> **Piège d'examen.** La supervision de l'espace de travail démarre vide : elle ne peut pas expliquer un échec survenu avant son activation. Pour les exécutions passées, utilisez le hub de surveillance et l'historique d'exécution de l'élément.

<!-- section: alerts | objectives: 3.1.4 -->
## Configurer des alertes

| Exigence | Alerte |
| --- | --- |
| E-mail gratuit quand une exécution **planifiée** d'un pipeline, d'un notebook ou d'un dataflow échoue | **Schedule** > **Failure notifications** de l'élément (aussi présentées comme **Schedule failure emails** dans hub de surveillance > **Alerts**, préversion) |
| Alerte sur d'autres événements de tâche (Started, Succeeded), avec messages Teams ou action automatisée | Règle Activator sur les événements de tâche dans Real-Time hub, ou règle d'alerte basée sur Activator (payante, préversion) créée depuis **Job runs** > **Create and manage alerts** > **Alerts (paid)** |
| E-mail quand une actualisation planifiée d'un modèle sémantique échoue | Les paramètres de notification d'échec d'actualisation du modèle |
| Message dans le flux du pipeline, avec les détails de l'exécution | Activité Teams sur le chemin Upon Failure |
| Alerte quand une valeur d'un flux franchit un seuil, par appareil ou par client | Règle Activator sur un eventstream |
| Alerte sur un visuel Power BI ou un tableau de bord en temps réel | Règle Activator créée depuis le visuel |
| Réagir à un élément créé ou supprimé, à un fichier arrivé dans OneLake, à une tâche en échec | Événements Fabric dans Real-Time hub, avec une règle Activator |

Les **notifications d'échec** (Failure notifications) se définissent par élément, s'appliquent à toutes ses planifications et ne couvrent que les exécutions planifiées ; le hub de surveillance et le planificateur de tâches utilisent les mêmes paramètres. Les destinataires sont des utilisateurs ou des groupes du locataire Microsoft Entra (invités B2B compris), pas des adresses externes. Selon la page des alertes du hub de surveillance, les configurer demande au moins le rôle Contributor sur l'espace de travail ou l'autorisation Write sur l'élément. Les modèles sémantiques ne sont pas encore pris en charge dans la page **Schedule failures**.

Les **alertes de tâche basées sur Activator** (préversion) prennent en charge les pipelines, les tâches Spark, les notebooks, les fonctions de données utilisateur, les entrepôts, les lakehouses, les bases de données mises en miroir, les bases de données SQL et les bases de données KQL. Elles demandent l'activation de la supervision de l'espace de travail (**Workspace settings** > **Monitoring**), au moins le rôle Contributor pour créer les éléments de supervision et Activator, et elles sont facturées comme consommation de capacité Activator.

**Fabric Activator** est un moteur de détection sans code alimenté par des eventstreams, des événements Fabric et Azure, des rapports Power BI et des tableaux de bord en temps réel. Les événements sont regroupés en **objets** par une colonne d'ID (`device_id`), chacun avec des **propriétés**. Les règles sont sans état (chaque événement seul, par exemple une valeur inférieure à 50) ou avec état par objet (`BECOMES`, `INCREASES`, `DECREASES`, `EXIT RANGE`, et absence de données pour les contrôles de pulsation). Une règle se déclenche quand l'objet entre dans le nouvel état, de sorte qu'une condition qui reste vraie ne répète pas l'alerte. Actions : e-mail, message Teams, flux Power Automate, ou exécution d'un élément Fabric (pipeline, notebook, définition de tâche Spark, dataflow, tâche de copie, fonction de données utilisateur).

> **Piège d'examen.** Un e-mail d'échec planifié ne se déclenche jamais pour un pipeline lancé avec **Run** ou par un autre pipeline. Quand l'exigence couvre toutes les exécutions, ou un événement de réussite, utilisez une règle Activator sur les événements de tâche, ou une activité Teams sur le chemin d'échec.

<!-- section: key-points -->
## Points clés

- Hub de surveillance = exécutions de tous les éléments que vous pouvez voir ; détail d'exécution = activités, Gantt, erreurs ; relancez à partir de l'activité en échec pour éviter de refaire ce qui a réussi.
- Historique Dataflow Gen2 : 50 actualisations ou six mois à l'écran ; journaux détaillés conservés 28 jours.
- `queryinsights` conserve 30 jours de requêtes terminées, avec jusqu'à 15 minutes de délai.
- Modèle sémantique : 8 ou 48 actualisations planifiées par jour ; planification désactivée après quatre échecs consécutifs ; e-mails d'échec seulement pour les actualisations planifiées ; actualisation Direct Lake = framing.
- Supervision de l'espace de travail (préversion) : journaux dans un eventhouse, désactivée par défaut, sans rattrapage, rétention de 30 jours, Contributor pour l'interroger.
- Alertes : notifications d'échec gratuites dans la planification de l'élément (exécutions planifiées seulement) contre règles Activator sur les événements de tâche (toute exécution, toute action) ; les pages d'alertes du hub de surveillance sont en préversion.
