La supervision commence par savoir à quoi ressemble la « normale » (une base de référence), puis par choisir la bonne source pour chaque métrique, lire correctement les chiffres et déclencher des alertes. Les questions d'examen nomment un symptôme ou un besoin de supervision et une offre, et demandent quel outil, quelle vue ou quelle métrique y répond avec le moins d'effort : Azure Monitor, les DMV, le Magasin des requêtes, les événements étendus ou l'observateur de base de données.

<!-- section: baseline | objectives: 3.1.1 -->
## Base de référence des performances opérationnelles

Une **base de référence** est un ensemble de mesures capturées pendant que la charge de travail se comporte normalement. Sans elle, « processeur à 70 % » ne veut rien dire : impossible de distinguer une régression d'un pic habituel.

Comment la construire :

1. Choisissez les métriques : processeur, E/S de données, écriture du journal, mémoire, workers et sessions, stockage, statistiques d'attente, principales requêtes par durée et par processeur, requêtes de lots par seconde.
2. Capturez sur une **période représentative** qui couvre les pics d'activité, les traitements de fin de mois, les fenêtres de traitement par lots et les travaux de maintenance : pas un après-midi calme.
3. Conservez les données au-delà de la rétention intégrée de la source (export vers Log Analytics, une table ou un magasin de données).
4. Capturez de nouveau après chaque changement important (nouvelle version, mise à l'échelle, migration, changement de niveau de compatibilité) et comparez.
5. Fixez les seuils d'alerte à partir de la base de référence, pas au hasard.

| Source | Granularité | Rétention | Usage dans une base de référence |
| --- | --- | --- | --- |
| `sys.dm_db_resource_stats` (chaque base) | 15 secondes | Environ 1 heure | Détail à court terme, état actuel |
| `sys.resource_stats` (dans `master` du serveur logique) | 5 minutes | Environ 14 jours | Historique de deux semaines par base |
| `sys.elastic_pool_resource_stats` (dans `master`) | Agrégée | Environ 14 jours | Historique des pools élastiques |
| Métriques de plateforme Azure Monitor | 1 minute | 93 jours | Tendances, alertes, tableaux de bord |
| Magasin des requêtes | Intervalle configurable | Configurable (taille et ancienneté) | Base de référence par requête : comparer plans et durées avant et après un changement |
| Analyseur de performances (SQL Server sur machine virtuelle) | Configurable | Ce que vous conservez | Compteurs du système d'exploitation et de SQL Server |

> **Conseil d'examen.** « Comparer les performances des requêtes avant et après la mise à niveau du niveau de compatibilité » désigne une base de référence du Magasin des requêtes : capturer avec l'ancien niveau, changer, puis comparer (rapport Regressed Queries du Magasin des requêtes). Pour la consommation des ressources des deux dernières semaines, interrogez `sys.resource_stats` ; pour la dernière heure, `sys.dm_db_resource_stats`.

<!-- section: metric-sources | objectives: 3.1.2 -->
## Sources des métriques de performances

| Source | Offres | Ce qu'elle fournit |
| --- | --- | --- |
| Métriques Azure Monitor | Azure SQL Database, pools élastiques, SQL Managed Instance | Métriques de plateforme sans configuration : pourcentage de processeur, pourcentage d'E/S de données, pourcentage d'E/S du journal, pourcentage DTU, pourcentage de workers, pourcentage de sessions, espace de données utilisé, interblocages, connexions ayant échoué, connexions bloquées par le pare-feu |
| Paramètres de diagnostic (journaux de ressources) | Azure SQL Database, SQL Managed Instance | Catégories envoyées vers Log Analytics, le stockage ou Event Hubs : `SQLInsights`, `AutomaticTuning`, `QueryStoreRuntimeStatistics`, `QueryStoreWaitStatistics`, `Errors`, `DatabaseWaitStatistics`, `Timeouts`, `Blocks`, `Deadlocks`, et des groupes de métriques comme `Basic` |
| Vues de gestion dynamique (DMV) | Toutes | État du moteur en temps réel : requêtes, sessions, attentes, mémoire, E/S, utilisation des index |
| Magasin des requêtes | Toutes (activé par défaut dans Azure SQL Database et SQL Managed Instance) | Texte des requêtes, plans, statistiques d'exécution et d'attente dans le temps |
| Événements étendus | Toutes | Capture détaillée d'événements : instructions, erreurs, interblocages, attentes |
| Intelligent Insights | Azure SQL Database, SQL Managed Instance | Détection par IA des dégradations de performances, par le journal `SQLInsights` |
| Observateur de base de données (préversion) | Azure SQL Database, SQL Managed Instance | Données des DMV collectées dans Azure Data Explorer ou Fabric, avec des tableaux de bord |
| Compteurs de l'Analyseur de performances, Azure Monitor Agent | SQL Server sur machine virtuelle Azure | Compteurs du système (`% Processor Time`, `Avg. Disk sec/Read`) et de SQL Server (`Batch Requests/sec`, `Page life expectancy`), envoyés à Log Analytics avec une règle de collecte de données |
| `sys.dm_os_performance_counters` | SQL Server, Managed Instance | Compteurs SQL Server depuis T-SQL |

Choisir selon le besoin :

| Besoin | Source |
| --- | --- |
| Alerter quand le processeur dépasse 80 % pendant 10 minutes | Alerte de métrique Azure Monitor |
| Conserver les données de requêtes et d'attente un an et les interroger en KQL | Paramètres de diagnostic vers un espace de travail Log Analytics |
| Voir les requêtes en cours d'exécution et ce qu'elles attendent | DMV (`sys.dm_exec_requests`) |
| Trouver la requête dont le plan a changé mardi dernier | Magasin des requêtes |
| Capturer chaque erreur 1205 ou chaque instruction de plus de 5 secondes | Événements étendus |
| Superviser le processeur, la mémoire et les disques de la machine virtuelle SQL Server elle-même | Métriques Azure Monitor de la machine virtuelle, VM Insights, Azure Monitor Agent |

> **Piège d'examen.** Les métriques de plateforme sont collectées automatiquement et conservées 93 jours ; les **journaux de ressources** (statistiques de requêtes, attentes, erreurs, Intelligent Insights) n'existent qu'après la création d'un **paramètre de diagnostic** qui les envoie quelque part.

<!-- section: interpret-metrics | objectives: 3.1.3 -->
## Interpréter les métriques de performances

Chaque pourcentage d'Azure SQL Database et des pools élastiques est **relatif à la limite de la taille de calcul** (ou du pool), pas au matériel.

| Observation | Interprétation | Action habituelle |
| --- | --- | --- |
| `avg_cpu_percent` proche de 100 % | Limité par le processeur : plans inefficaces, index manquants ou croissance réelle | Optimiser d'abord les requêtes les plus coûteuses en processeur, puis monter en puissance |
| `avg_data_io_percent` proche de 100 %, attentes `PAGEIOLATCH_*` | Les lectures de données dépassent la limite d'E/S : analyses complètes, mémoire trop petite pour le jeu de travail | Ajouter des index, plus de mémoire (taille de calcul supérieure) |
| `avg_log_write_percent` proche de 100 %, attentes `WRITELOG` ou de gouvernance du débit du journal | Limite de débit d'écriture du journal atteinte : grosses insertions par lots ou reconstructions d'index | Découper les écritures, monter en puissance, envisager Business Critical ou Hyperscale |
| `max_worker_percent` proche de 100 %, erreur 10928 | Limite de workers : souvent due à un **blocage** qui accumule les requêtes | Corriger d'abord le blocage ; monter en puissance seulement si nécessaire |
| Pourcentage DTU élevé | DTU % = la **plus haute** valeur parmi processeur %, E/S de données % et écriture du journal % | Regarder les trois pour trouver la ressource en cause |
| Attentes `LCK_M_*` | Blocage sur des verrous | Trouver le bloqueur principal, raccourcir les transactions |
| Attentes `PAGELATCH_*` avec un `wait_resource` qui commence par `2:` | Contention dans `tempdb` | Réduire la création et suppression d'objets temporaires |
| Attentes `RESOURCE_SEMAPHORE` | Requêtes en attente d'allocation de mémoire | Corriger les mauvaises estimations, ajouter de la mémoire |
| `CXPACKET` / `CXCONSUMER` | Parallélisme | Examiner MAXDOP et les plans parallèles coûteux avant de changer quoi que ce soit |
| `SOS_SCHEDULER_YIELD` | Pression sur le processeur | Comme un processeur élevé |

```text
-- Current hour, one database
SELECT end_time, avg_cpu_percent, avg_data_io_percent,
       avg_log_write_percent, max_worker_percent, max_session_percent
FROM sys.dm_db_resource_stats ORDER BY end_time DESC;

-- Last 14 days, run in master
SELECT start_time, database_name, avg_cpu_percent, avg_data_io_percent
FROM sys.resource_stats
WHERE database_name = 'Sales' ORDER BY start_time DESC;

-- Top waits of the database (Azure SQL Database)
SELECT TOP (10) wait_type, wait_time_ms, waiting_tasks_count
FROM sys.dm_db_wait_stats ORDER BY wait_time_ms DESC;
```

Dans SQL Server et Managed Instance, les attentes cumulées viennent de `sys.dm_os_wait_stats` (depuis le dernier redémarrage). Lire ces vues exige `VIEW DATABASE STATE` (base) ou `VIEW SERVER PERFORMANCE STATE` (serveur, par `##MS_ServerStateReader##` dans Azure SQL Database).

> **Piège d'examen.** Un pic bref de processeur n'est pas une raison de monter en puissance. Comparez à la base de référence : des valeurs soutenues proches de la limite, avec des requêtes qui attendent cette ressource, justifient un changement. Et beaucoup de workers avec un processeur faible indiquent un blocage, pas un manque de calcul.

<!-- section: configure-monitoring | objectives: 3.1.4 -->
## Configurer et superviser l'activité et les performances

**Alertes Azure Monitor** :

| Type d'alerte | Fondée sur | Exemple |
| --- | --- | --- |
| Alerte de métrique | Une métrique de plateforme, seuil statique ou seuils dynamiques | Pourcentage de processeur supérieur à 80 % en moyenne sur 15 minutes |
| Alerte de recherche dans les journaux | Une requête KQL sur un espace de travail Log Analytics | Plus de 5 interblocages dans la table `AzureDiagnostics` en 1 heure |
| Alerte du journal d'activité | Événements du plan de contrôle, Resource Health | Base mise à l'échelle, ou devenue indisponible |

Chaque règle d'alerte appelle un **groupe d'actions** (e-mail, SMS, notification push, webhook, Azure Functions, Logic Apps, runbook, ITSM).

```bash
az monitor metrics alert create --name sql-cpu-high --resource-group RG1 \
  --scopes /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.Sql/servers/sql-contoso/databases/Sales \
  --condition "avg cpu_percent > 80" --window-size 15m --evaluation-frequency 5m \
  --action ag-dba-team

az monitor diagnostic-settings create --name sales-to-law \
  --resource /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.Sql/servers/sql-contoso/databases/Sales \
  --workspace law-contoso \
  --logs '[{"category":"QueryStoreRuntimeStatistics","enabled":true},{"category":"Deadlocks","enabled":true}]' \
  --metrics '[{"category":"Basic","enabled":true}]'
```

Autres outils de supervision :

| Outil | Où | Usage |
| --- | --- | --- |
| Query Performance Insight | Portail Azure, Azure SQL Database | Requêtes les plus consommatrices et les plus longues, à partir du Magasin des requêtes |
| Metrics Explorer | Portail Azure | Graphiques des métriques de plateforme, épinglés aux tableaux de bord |
| Activity Monitor | SSMS | Processus en direct, attentes, E/S des fichiers de données, requêtes coûteuses récentes |
| Rapports du Magasin des requêtes | SSMS | Requêtes régressées, principaux consommateurs de ressources, plans forcés |
| XEvent Profiler | SSMS | Trace rapide en direct avec les événements étendus |

**Activité** (qui est connecté, ce qui s'exécute) :

```text
SELECT s.session_id, s.login_name, s.host_name, r.status, r.command,
       r.wait_type, r.blocking_session_id, r.cpu_time, t.text
FROM sys.dm_exec_sessions AS s
JOIN sys.dm_exec_requests AS r ON r.session_id = s.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE s.is_user_process = 1;
```

<!-- section: database-watcher | objectives: 3.1.5 -->
## Surveiller à l'aide de l'observateur de base de données

L'**observateur de base de données** (database watcher) est une solution de supervision managée pour **Azure SQL Database** (bases uniques, pools élastiques) et **SQL Managed Instance**. Il collecte les données de plus de 70 vues de catalogue et DMV, regroupées en jeux de données, et les stocke dans un magasin de données qui vous appartient. Il ne s'applique pas à SQL Server sur des machines virtuelles Azure.

> **Conseil d'examen.** L'observateur de base de données est en **préversion** et n'atteindra pas la disponibilité générale. Depuis le **9 novembre 2026**, il n'est plus possible de créer ni de modifier des observateurs, et le **30 avril 2027**, les observateurs existants cessent de collecter des données. Microsoft désigne Database Hub dans Microsoft Fabric comme remplaçant. L'objectif d'examen reste en place : sachez comment il fonctionne.

| Composant | Détail |
| --- | --- |
| Observateur | La ressource Azure qui collecte les données ; il ne démarre pas automatiquement après sa création |
| Magasin de données | Un cluster Azure Data Explorer (ou un cluster gratuit), ou Real-Time Analytics dans Microsoft Fabric |
| Cibles SQL | Bases, pools élastiques, instances managées ; jusqu'à **100 cibles par observateur**, 20 observateurs par abonnement ; n'importe quel abonnement du même locataire |
| Tableaux de bord | Azure Workbooks : vue du parc (cartes thermiques du processeur, principales requêtes) et vues par ressource (sessions, attentes, Magasin des requêtes, sauvegardes, travaux SQL Agent, géoréplication) |
| Requêtes | KQL ou T-SQL sur le magasin de données ; Power BI, Grafana, Excel |
| Alertes | Alertes de recherche dans les journaux Azure Monitor ; non disponibles avec Real-Time Analytics ou un cluster gratuit |
| Coût | Observateurs et tableaux de bord gratuits ; vous payez le magasin de données, les alertes et la bande passante entre régions |

Ordre de mise en place :

1. Créez l'observateur et choisissez le magasin de données.
2. Ajoutez les cibles SQL.
3. Accordez à l'**identité managée** de l'observateur l'accès au magasin de données et à chaque cible. Sur un serveur logique, créez-lui une connexion Microsoft Entra et ajoutez-la à `##MS_ServerPerformanceStateReader##`, `##MS_DefinitionReader##` et `##MS_DatabaseConnector##`. Sur une instance managée, accordez `CONNECT SQL`, `CONNECT ANY DATABASE`, `VIEW ANY DATABASE`, `VIEW ANY DEFINITION`, `VIEW SERVER PERFORMANCE STATE`, et `SELECT` sur certaines tables de `msdb`.
4. Pour une connectivité privée, créez des **points de terminaison privés managés** et faites-les approuver par le propriétaire de la ressource ; sinon, autorisez les services Azure sur le serveur logique, ou ouvrez le point de terminaison public de l'instance managée (TCP 3342) à `AzureCloud`.
5. **Démarrez** l'observateur.

L'observateur privilégie l'authentification Microsoft Entra ; l'authentification SQL stocke les identifiants dans Key Vault. Accorder plus d'autorisations que nécessaire déconnecte l'observateur, et un DENY peut arrêter la collecte.

```text
-- In master of the logical server, for the watcher identity wch-contoso
CREATE LOGIN [wch-contoso] FROM EXTERNAL PROVIDER;
ALTER SERVER ROLE ##MS_ServerPerformanceStateReader## ADD MEMBER [wch-contoso];
ALTER SERVER ROLE ##MS_DefinitionReader## ADD MEMBER [wch-contoso];
ALTER SERVER ROLE ##MS_DatabaseConnector## ADD MEMBER [wch-contoso];
```

<!-- section: extended-events | objectives: 3.1.6 -->
## Monitorer à l'aide des événements étendus

Les événements étendus (XEvents) sont le moteur léger de capture d'événements qui remplace SQL Trace et SQL Server Profiler. Une **session** combine des événements, des actions, des prédicats et des cibles.

| Élément | Rôle | Exemples |
| --- | --- | --- |
| Événement | Ce qui s'est produit | `sql_statement_completed`, `rpc_completed`, `sql_batch_completed`, `error_reported`, `xml_deadlock_report`, `blocked_process_report`, `wait_info` |
| Action | Données ajoutées à l'événement | `sql_text`, `session_id`, `client_app_name`, `username`, `query_hash` |
| Prédicat | Filtre évalué avant la collecte | `duration > 5000000` (microsecondes), `database_name = N'Sales'` |
| Cible | Où vont les événements | `event_file` (persistant), `ring_buffer` (mémoire), `histogram` (comptage par compartiment), `event_counter`, `pair_matching` |

| | Azure SQL Database | SQL Managed Instance, SQL Server |
| --- | --- | --- |
| Étendue | `ON DATABASE` uniquement ; événements de cette base | `ON SERVER` (recommandé), Managed Instance accepte aussi `ON DATABASE` |
| Cible `event_file` | Stockage Blob Azure uniquement, avec des **informations d'identification délimitées à la base de données** | Stockage Blob Azure sur Managed Instance (informations d'identification du serveur) ; disque local ou URL sur SQL Server |
| Stockage | Même région, niveau chaud (Hot), sans espace de noms hiérarchique ; informations d'identification avec une SAS (`rwdl`) ou une identité managée avec Storage Blob Data Contributor | Mêmes règles pour les cibles blob |
| Limites | 128 Mo de mémoire de session et 100 sessions démarrées par base | Mémoire de l'instance |
| Sessions en cours | `sys.dm_xe_database_sessions` | `sys.dm_xe_sessions` |

```text
-- Azure SQL Database: credential named after the container URL
CREATE DATABASE SCOPED CREDENTIAL [https://stcontosoxe.blob.core.windows.net/xevents]
WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = 'sv=2025-01-05&sr=c&sp=rwdl&sig=REDACTED';

CREATE EVENT SESSION SlowQueries ON DATABASE
ADD EVENT sqlserver.sql_statement_completed (
    ACTION (sqlserver.sql_text, sqlserver.client_app_name)
    WHERE duration > 5000000)
ADD TARGET package0.event_file (
    SET filename = 'https://stcontosoxe.blob.core.windows.net/xevents/SlowQueries.xel')
WITH (MAX_MEMORY = 4 MB, STARTUP_STATE = ON);

ALTER EVENT SESSION SlowQueries ON DATABASE STATE = START;

SELECT CAST(event_data AS xml)
FROM sys.fn_xe_file_target_read_file(
  'https://stcontosoxe.blob.core.windows.net/xevents/SlowQueries', DEFAULT, DEFAULT, DEFAULT);
```

Utilisez `STARTUP_STATE = ON` pour les sessions qui doivent survivre à un redémarrage ou à un basculement. SQL Server et Managed Instance exécutent la session intégrée **system_health** (interblocages, erreurs graves) ; Azure SQL Database a une session intégrée `dl` pour les interblocages. Dans SSMS, **XEvent Profiler** donne une vue rapide en direct, et **Watch Live Data** diffuse n'importe quelle session en cours.

> **Piège d'examen.** Dans Azure SQL Database, une cible `event_file` ne peut pas écrire dans un chemin local, et les sessions `ON SERVER` échouent : utilisez `ON DATABASE` avec un conteneur blob et des informations d'identification délimitées à la base de données. Pour un aperçu rapide sans stockage, utilisez la cible `ring_buffer`.

<!-- section: key-points -->
## Points clés

- Base de référence = période représentative, conservée au-delà de la rétention par défaut, recapturée après chaque changement ; les seuils d'alerte en découlent.
- `sys.dm_db_resource_stats` : 15 secondes, 1 heure. `sys.resource_stats` : 5 minutes, 14 jours, dans `master`. Métriques Azure Monitor : 93 jours.
- Les journaux de ressources exigent un paramètre de diagnostic ; les métriques de plateforme non.
- Les pourcentages sont relatifs à la limite de la taille de calcul ; DTU % est la plus haute valeur parmi processeur, E/S de données et écriture du journal.
- Beaucoup de workers avec un processeur faible signifie blocage ; `PAGEIOLATCH` signifie E/S de données ; `WRITELOG` signifie débit du journal.
- Alertes de métrique pour les seuils, alertes de recherche dans les journaux pour KQL, groupes d'actions pour les notifications.
- Observateur de base de données : préversion, Azure SQL Database et Managed Instance, données dans Azure Data Explorer ou Fabric, identité managée avec des rôles serveur en lecture seule ; mis hors service le 30 avril 2027.
- Événements étendus : `ON DATABASE` avec une cible `event_file` blob et des informations d'identification délimitées à la base dans Azure SQL Database ; `ON SERVER` ailleurs.
