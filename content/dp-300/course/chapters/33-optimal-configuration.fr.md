Ce chapitre couvre les paramètres et les tâches de maintenance qui gardent une base de données rapide dans la durée : maintenance des index et des statistiques, vérifications d'intégrité, réglage automatique, configuration au niveau de l'instance et de la base, Resource Governor, mise à l'échelle et traitement intelligent des requêtes. Les questions d'examen vérifient quelle option existe sur quelle offre, la commande exacte et ce qu'un paramètre change.

<!-- section: index-maintenance | objectives: 3.3.1 -->
## Maintenance des index

Mesurez avant de maintenir. `sys.dm_db_index_physical_stats` renvoie la fragmentation logique (`avg_fragmentation_in_percent`) et la densité des pages (`avg_page_space_used_in_percent`, renseignée en mode `SAMPLED` ou `DETAILED`) :

```text
SELECT OBJECT_NAME(ips.object_id) AS table_name, i.name AS index_name,
       ips.avg_fragmentation_in_percent, ips.avg_page_space_used_in_percent,
       ips.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), DEFAULT, DEFAULT, DEFAULT, 'SAMPLED') AS ips
JOIN sys.indexes AS i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.page_count > 1000;

ALTER INDEX IX_Orders_CustomerID ON dbo.Orders REORGANIZE;
ALTER INDEX PK_Orders ON dbo.Orders REBUILD WITH (ONLINE = ON, RESUMABLE = ON, MAX_DURATION = 60 MINUTES);
ALTER INDEX PK_Orders ON dbo.Orders PAUSE;
ALTER INDEX PK_Orders ON dbo.Orders RESUME;
```

| | `REORGANIZE` | `REBUILD` |
| --- | --- | --- |
| En ligne | Toujours | Seulement avec `ONLINE = ON` (hors connexion, des verrous au niveau de l'objet sont tenus pendant toute l'opération) |
| Ressources | Moins coûteuse : la méthode préférée de Microsoft sauf raison de reconstruire | Plus coûteuse ; exige l'espace de deux copies de l'index |
| Interruption | La progression déjà faite est conservée | Perdue, sauf avec `RESUMABLE = ON` (pause et reprise) |
| Statistiques | Non mises à jour | Statistiques de l'index mises à jour comme avec `FULLSCAN` (pas pour les reconstructions partitionnées ou pouvant être reprises) |

Recommandation actuelle de Microsoft : ne vous fiez ni à des seuils de fragmentation fixes seuls ni à une planification fixe ; surveillez la fragmentation et la densité des pages et maintenez quand les performances l'exigent. Souvent, un `UPDATE STATISTICS` apporte le même bénéfice pour un coût moindre.

Dans Azure SQL Database et Managed Instance, le stockage fait peu de différence entre E/S séquentielles et aléatoires, donc la fragmentation compte moins, et la maintenance consomme les mêmes ressources gouvernées que la charge de travail : ne l'exécutez qu'en cas de besoin démontré. Les reconstructions pouvant être reprises survivent à un basculement. Planifiez la maintenance avec SQL Server Agent (SQL Server, Managed Instance) ou avec les travaux élastiques et Azure Automation (Azure SQL Database). Le compactage automatique des index (`ALTER DATABASE ... SET AUTOMATIC_INDEX_COMPACTION = ON`, désactivé par défaut) est une alternative peu coûteuse dans Azure SQL Database et dans Managed Instance avec la stratégie de mise à jour Always-up-to-date.

> **Piège d'examen.** « Réduire le verrouillage pendant la maintenance d'un grand index » signifie `REORGANIZE` ou `REBUILD WITH (ONLINE = ON)`. « La reconstruction doit continuer après un basculement ou la fin d'une fenêtre de maintenance » signifie `RESUMABLE = ON`.

<!-- section: statistics-maintenance | objectives: 3.3.2 -->
## Maintenance des statistiques

L'optimiseur estime le nombre de lignes à partir des statistiques (histogrammes). Des statistiques obsolètes se voient dans un plan par des lignes estimées très éloignées des lignes réelles.

| Option de base de données | Effet |
| --- | --- |
| `AUTO_CREATE_STATISTICS` | Crée au besoin des statistiques sur une colonne pour les colonnes des prédicats |
| `AUTO_UPDATE_STATISTICS` | Met à jour les statistiques marquées obsolètes avant de compiler la requête (laissez-la à `ON`) |
| `AUTO_UPDATE_STATISTICS_ASYNC` | Désactivée par défaut ; activée, la requête compile avec les anciennes statistiques et la mise à jour s'exécute en arrière-plan : aucune attente de compilation |

Les statistiques sont marquées obsolètes après un certain nombre de modifications : à partir du niveau de compatibilité 130, le seuil est `MIN(500 + 0.20 * n, SQRT(1000 * n))` (44 721 modifications pour une table de 2 millions de lignes) ; en dessous de 130, c'est 500 + 20 % des lignes.

```text
UPDATE STATISTICS dbo.Orders WITH FULLSCAN;
UPDATE STATISTICS dbo.Orders IX_Orders_OrderDate WITH SAMPLE 25 PERCENT, PERSIST_SAMPLE_PERCENT = ON;
EXEC sp_updatestats;

SELECT s.name, sp.last_updated, sp.rows, sp.rows_sampled, sp.modification_counter
FROM sys.stats AS s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) AS sp
WHERE s.object_id = OBJECT_ID(N'dbo.Orders');
```

`sp_updatestats` ne met à jour que les statistiques qui ont des modifications, avec l'échantillon par défaut. Mettez à jour manuellement après de gros chargements ou quand une clé croissante (dates, identités) rend les lignes les plus récentes invisibles pour l'histogramme ; gardez la mise à jour automatique activée en parallèle.

> **Piège d'examen.** `REORGANIZE` ne met pas à jour les statistiques ; un `REBUILD` d'index ne met à jour que les statistiques de cet index, pas les statistiques de colonnes. Mettre à jour les statistiques juste après une reconstruction est redondant pour cet index.

<!-- section: integrity-checks | objectives: 3.3.3 -->
## Vérifications de l'intégrité des bases de données

```text
DBCC CHECKDB (SalesDB) WITH NO_INFOMSGS, ALL_ERRORMSGS;
DBCC CHECKDB (SalesDB) WITH PHYSICAL_ONLY;
DBCC CHECKTABLE ('dbo.Orders') WITH TABLOCK;

ALTER DATABASE SalesDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DBCC CHECKDB (SalesDB, REPAIR_ALLOW_DATA_LOSS);
ALTER DATABASE SalesDB SET MULTI_USER;
```

| Commande ou option | Usage |
| --- | --- |
| `DBCC CHECKDB` | Exécute `CHECKALLOC`, `CHECKTABLE` sur chaque table et vue, et `CHECKCATALOG` ; utilise une capture instantanée interne de la base, donc pas de blocage |
| `PHYSICAL_ONLY` | Structure des pages et des allocations uniquement : beaucoup plus rapide sur les grandes bases ; ignore les vérifications des valeurs de colonnes |
| `NO_INFOMSGS` | N'affiche que les erreurs |
| `TABLOCK` | Prend des verrous au lieu d'une capture instantanée (ignore `CHECKCATALOG`) |
| `REPAIR_REBUILD` | Répare sans perte de données (par exemple les index non cluster) |
| `REPAIR_ALLOW_DATA_LOSS` | Dernier recours quand aucune bonne sauvegarde n'existe ; exige le mode mono-utilisateur |

L'exécution exige `sysadmin` ou `db_owner`.

| Plateforme | Responsabilités d'intégrité |
| --- | --- |
| SQL Server sur machines virtuelles Azure, en local | Les vôtres : planifier `DBCC CHECKDB` (travail SQL Server Agent ou plan de maintenance), garder `PAGE_VERIFY CHECKSUM`, utiliser `BACKUP ... WITH CHECKSUM` |
| Azure SQL Managed Instance | Vous pouvez exécuter `DBCC CHECKDB` ; le stockage doit contenir tout le fichier de capture instantanée interne |
| Azure SQL Database | Le service vérifie les pages pendant les sauvegardes et les restaurations, utilise `CHECKSUM` sur toutes les sauvegardes et alerte ses ingénieurs ; vous pouvez quand même exécuter `DBCC CHECKDB` |
| Azure SQL Database Hyperscale | `DBCC CHECKDB` n'est pas pris en charge : utilisez `DBCC CHECKTABLE ... WITH TABLOCK` |

> **Piège d'examen.** Quand `DBCC CHECKDB` signale une corruption, la correction recommandée est la restauration à partir d'une sauvegarde saine connue. `REPAIR_ALLOW_DATA_LOSS` peut perdre plus de données que la restauration.

<!-- section: automatic-tuning | objectives: 3.3.4 -->
## Réglage automatique

| Option | Action | Azure SQL Database | Managed Instance | SQL Server 2017+ |
| --- | --- | --- | --- | --- |
| `FORCE_LAST_GOOD_PLAN` | Détecte une régression de plan et force le dernier plan correct | Oui | Oui | Oui |
| `CREATE_INDEX` | Crée les index utiles à la charge de travail | Oui | Non | Non |
| `DROP_INDEX` | Supprime les index inutilisés depuis 90 jours et les index en double (jamais les index uniques ni de clé primaire) | Oui | Non | Non |

- La correction des plans repose sur le **Magasin des requêtes**, qui doit être activé et en `READ_WRITE`.
- Valeurs Azure par défaut des nouveaux serveurs : `FORCE_LAST_GOOD_PLAN` activé, `CREATE_INDEX` et `DROP_INDEX` désactivés. Les bases héritent du serveur ; Microsoft recommande de configurer au niveau du serveur et de laisser les bases hériter.
- Chaque modification automatique est validée (de 30 minutes à 72 heures selon la fréquence d'exécution de la requête) et annulée si les performances ne s'améliorent pas. Les recommandations appliquées manuellement en T-SQL ne sont ni validées ni annulées.
- `DROP_INDEX` peut être désactivée automatiquement quand des requêtes utilisent des indicateurs d'index ou que la charge de travail bascule des partitions ; en Premium et Business Critical, elle ne supprime que les index en double. `CREATE_INDEX` ne donne aucune recommandation pour les tables dont l'index cluster ou le segment de mémoire (heap) dépasse 10 Go.
- L'historique des modifications automatiques est conservé 21 jours.

```text
-- Azure SQL Database: inherit from the server, or set options per database
ALTER DATABASE CURRENT SET AUTOMATIC_TUNING = INHERIT;
ALTER DATABASE CURRENT SET AUTOMATIC_TUNING (CREATE_INDEX = ON, DROP_INDEX = ON);

-- SQL Server, Managed Instance
ALTER DATABASE SalesDB SET AUTOMATIC_TUNING (FORCE_LAST_GOOD_PLAN = ON);

SELECT name, desired_state_desc, actual_state_desc, reason_desc
FROM sys.database_automatic_tuning_options;
SELECT name, reason, score, state, details FROM sys.dm_db_tuning_recommendations;
```

Dans le portail : serveur logique ou base de données > **Réglage automatique** ; les recommandations sous **Recommandations de performances**.

> **Piège d'examen.** Une instance managée ou une machine virtuelle SQL Server ne peut pas créer ni supprimer d'index automatiquement : seule la correction des plans y existe. `sys.dm_db_tuning_recommendations` n'est pas conservée après un redémarrage de SQL Server.

<!-- section: server-settings | objectives: 3.3.5 -->
## Paramètres serveur pour les performances

Les options au niveau de l'instance se définissent avec `sp_configure` (SQL Server, Managed Instance) et prennent effet après `RECONFIGURE`. Azure SQL Database n'a pas de paramètres d'instance : utilisez la configuration à l'échelle de la base de données.

```text
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'max server memory (MB)', 57344;
EXEC sp_configure 'max degree of parallelism', 8;
EXEC sp_configure 'cost threshold for parallelism', 50;
EXEC sp_configure 'optimize for ad hoc workloads', 1;
RECONFIGURE;
```

| Paramètre | Recommandation |
| --- | --- |
| `max server memory (MB)` | Laisser assez de mémoire au système d'exploitation |
| `max degree of parallelism` | Un nœud NUMA : au plus le nombre de processeurs logiques, 8 au-delà de 8 ; plusieurs nœuds NUMA : au plus les processeurs par nœud, la moitié (16 maximum) au-delà de 16 par nœud. 8 par défaut dans Azure SQL Database (à l'échelle de la base) et Managed Instance |
| `cost threshold for parallelism` | 5 par défaut ; augmentez-le pour que seules les requêtes coûteuses passent en parallèle |
| `optimize for ad hoc workloads` | Met en cache un stub à la première exécution : moins d'encombrement du cache des plans en OLTP avec beaucoup de requêtes à usage unique |
| Verrouillage des pages en mémoire, initialisation instantanée des fichiers | À activer sur les machines virtuelles SQL Server (privilèges Windows du compte de service) |

Liste de contrôle de SQL Server sur machines virtuelles Azure :

| Domaine | Recommandation |
| --- | --- |
| `tempdb` | Un fichier de données par cœur, jusqu'à huit ; sur le SSD local éphémère (D:) quand il existe, sauf pour les instances de cluster de basculement (stockage partagé) |
| Disposition des disques | Données, journal et `tempdb` sur des lecteurs séparés ; agrégation de disques avec les espaces de stockage pour plus d'IOPS ; unité d'allocation de 64 Ko |
| Mise en cache de l'hôte | Lecture seule pour les disques de données, aucune pour les disques de journal, jamais lecture/écriture ; arrêtez SQL Server avant de la modifier |
| Options de base de données | Compression de page et de sauvegarde, réduction automatique (autoshrink) et fermeture automatique (autoclose) désactivées, croissance automatique limitée, Magasin des requêtes activé |

> **Piège d'examen.** La mise en cache de l'hôte en lecture/écriture sur un disque de journal risque une perte de données et n'est jamais recommandée ; la mise en cache en lecture seule n'aide que les fichiers de données.

<!-- section: resource-governor | objectives: 3.3.6 -->
## Resource Governor

Resource Governor limite le processeur, la mémoire et les E/S de lecture physiques qu'une charge de travail peut utiliser. Il existe dans SQL Server (éditions Enterprise et Developer ; aussi Standard à partir de SQL Server 2025) et Azure SQL Managed Instance ; il ne peut pas être configuré dans Azure SQL Database.

| Composant | Rôle |
| --- | --- |
| Pool de ressources | Limites physiques : `MIN/MAX_CPU_PERCENT`, `CAP_CPU_PERCENT` (plafond strict), `MIN/MAX_MEMORY_PERCENT`, `MIN/MAX_IOPS_PER_VOLUME`. Pools intégrés : `internal`, `default` |
| Groupe de charges de travail | Stratégies des requêtes dans un pool : `REQUEST_MAX_MEMORY_GRANT_PERCENT`, `MAX_DOP`, `GROUP_MAX_REQUESTS` ; limites `tempdb` `GROUP_MAX_TEMPDB_DATA_MB` / `_PERCENT` dans SQL Server 2025 |
| Fonction de classification | Fonction scalaire dans `master`, `WITH SCHEMABINDING`, exécutée pour chaque nouvelle session ; renvoie le nom du groupe de charges de travail |

```text
USE master;
CREATE RESOURCE POOL ReportsPool WITH (MAX_CPU_PERCENT = 20, CAP_CPU_PERCENT = 30);
CREATE WORKLOAD GROUP Reports WITH (REQUEST_MAX_MEMORY_GRANT_PERCENT = 15) USING ReportsPool;
GO
CREATE FUNCTION dbo.rg_classifier() RETURNS sysname WITH SCHEMABINDING
AS
BEGIN
    DECLARE @grp sysname = 'default';
    IF APP_NAME() LIKE 'PowerBI%' SET @grp = 'Reports';
    RETURN @grp;
END;
GO
ALTER RESOURCE GOVERNOR WITH (CLASSIFIER_FUNCTION = dbo.rg_classifier);
ALTER RESOURCE GOVERNOR RECONFIGURE;
```

Si la fonction renvoie `NULL`, un groupe inconnu ou échoue, la session va dans le groupe `default`. Une fonction de classification lente retarde chaque connexion. Surveillez avec `sys.dm_resource_governor_resource_pools` et `sys.dm_resource_governor_workload_groups`.

> **Piège d'examen.** La classification a lieu une seule fois, à la connexion : les sessions existantes gardent leur groupe. Sans `ALTER RESOURCE GOVERNOR RECONFIGURE`, aucune modification ne prend effet. Dans les groupes de disponibilité SQL Server, la configuration n'est pas propagée aux secondaires (elle l'est dans Managed Instance).

<!-- section: database-scoped-configuration | objectives: 3.3.7 -->
## Configuration à l'échelle de la base de données

`ALTER DATABASE SCOPED CONFIGURATION` définit des options pour une seule base, le moyen de régler un comportement de type instance dans Azure SQL Database. Elle exige `ALTER ANY DATABASE SCOPED CONFIGURATION`. Les valeurs figurent dans `sys.database_scoped_configurations` (`value`, `value_for_secondary`).

```text
ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 4;
ALTER DATABASE SCOPED CONFIGURATION FOR SECONDARY SET MAXDOP = 8;
ALTER DATABASE SCOPED CONFIGURATION SET LEGACY_CARDINALITY_ESTIMATION = ON;
ALTER DATABASE SCOPED CONFIGURATION SET LAST_QUERY_PLAN_STATS = ON;
ALTER DATABASE SCOPED CONFIGURATION CLEAR PROCEDURE_CACHE;
```

| Option | Valeur par défaut | Usage |
| --- | --- | --- |
| `MAXDOP` | 0 (utilise le paramètre du serveur) ; 8 pour les nouvelles bases Azure SQL Database | Parallélisme de cette base |
| `LEGACY_CARDINALITY_ESTIMATION` | `OFF` | Ancien modèle d'estimation de cardinalité sans baisser le niveau de compatibilité |
| `PARAMETER_SNIFFING` | `ON` | `OFF` = plans construits pour des valeurs moyennes |
| `QUERY_OPTIMIZER_HOTFIXES` | `OFF` | Active les correctifs de l'optimiseur publiés après le niveau de compatibilité |
| `OPTIMIZE_FOR_AD_HOC_WORKLOADS` | `OFF` | Stub de plan à la première exécution |
| `LAST_QUERY_PLAN_STATS` | `OFF` | Dernier plan réel dans `sys.dm_exec_query_plan_stats` |
| `ELEVATE_ONLINE`, `ELEVATE_RESUMABLE` | `OFF` | Rendre les opérations d'index prises en charge en ligne ou pouvant être reprises par défaut |
| `CLEAR PROCEDURE_CACHE` | Action | Vide le cache des plans de cette base |

`FOR SECONDARY` applique une valeur à tous les secondaires lisibles (géo-réplicas compris) ; `PRIMARY` leur fait hériter de la valeur du principal.

> **Conseil d'examen.** « Utiliser l'ancien estimateur de cardinalité tout en gardant le dernier niveau de compatibilité et ses fonctionnalités » correspond à `LEGACY_CARDINALITY_ESTIMATION = ON`, pas à un `COMPATIBILITY_LEVEL` plus bas.

<!-- section: scaling-resources | objectives: 3.3.8 -->
## Configurer le calcul et le stockage pour la mise à l'échelle

**Azure SQL Database.** Changez l'objectif de service ou la taille maximale ; la base reste en ligne pendant la préparation du nouveau calcul, puis les connexions sont coupées brièvement (en général moins de 30 secondes) : les applications ont besoin d'une logique de nouvelle tentative.

```bash
az sql db update --resource-group rg-sales --server sql-sales --name SalesDB \
  --edition GeneralPurpose --family Gen5 --capacity 8 --max-size 500GB
```

```powershell
Set-AzSqlDatabase -ResourceGroupName rg-sales -ServerName sql-sales -DatabaseName SalesDB `
  -RequestedServiceObjectiveName "GP_Gen5_8"
```

```text
ALTER DATABASE SalesDB MODIFY (SERVICE_OBJECTIVE = 'GP_Gen5_8', MAXSIZE = 500 GB);
-- In master
SELECT * FROM sys.dm_operation_status WHERE major_resource_id = 'SalesDB';
```

| Règle | Détail |
| --- | --- |
| Durée | Constante (quelques minutes) quand le stockage reste en place ; environ 1 minute par Go quand les données doivent être copiées (vers Premium, Business Critical ou Hyperscale) |
| Taille maximale | Non augmentée par un passage à un niveau supérieur sauf si vous la définissez ; une rétrogradation exige un espace utilisé inférieur à la limite cible |
| Géoréplication | Montez d'abord les secondaires ; rétrogradez d'abord le principal |
| Hyperscale | La mise à l'échelle entre tailles Hyperscale est à durée constante ; le retour vers General Purpose est limité aux scénarios pris en charge |
| Serverless | General Purpose et Hyperscale, vCore uniquement ; définissez les vCores minimum et maximum et le délai de pause automatique (General Purpose de 15 minutes à 7 jours, 60 par défaut, -1 le désactive ; la pause automatique Hyperscale est en préversion) |
| Surveillance, annulation | `sys.dm_operation_status`, `az sql db op list` / `cancel`, `Get-AzSqlDatabaseActivity` / `Stop-AzSqlDatabaseActivity` |

Autres leviers : les pools élastiques pour de nombreuses bases aux pics complémentaires, le scale-out en lecture (`ApplicationIntent=ReadOnly`) pour décharger les rapports en Premium, Business Critical et Hyperscale.

**Azure SQL Managed Instance.** La mise à l'échelle des vCores ou du stockage est une opération de gestion qui s'exécute en ligne ; l'instance n'est indisponible qu'au basculement final : jusqu'à 20 secondes en Business Critical, jusqu'à 2 minutes en General Purpose (jusqu'à 10 minutes en Next-gen General Purpose, le temps que les bases se rattachent). Les opérations soumises dans la même minute sont regroupées.

**SQL Server sur machines virtuelles Azure.** Redimensionnez la machine virtuelle (redémarrage), ajoutez ou agrandissez des disques de données et changez les niveaux de performances des disques ; augmentez le débit de stockage avec davantage de disques agrégés ou des SSD Premium v2.

> **Piège d'examen.** La mise à l'échelle d'une base Azure SQL n'est pas sans interruption : une courte déconnexion se produit au basculement. Pour ne plus payer un calcul inactif, choisissez serverless avec pause automatique, pas une taille provisionnée plus petite.

<!-- section: iqp | objectives: 3.3.9 -->
## Traitement intelligent des requêtes

Les fonctionnalités de traitement intelligent des requêtes (IQP) améliorent les plans sans modifier le code. La plupart s'activent avec le **niveau de compatibilité** de la base (`ALTER DATABASE SalesDB SET COMPATIBILITY_LEVEL = 160`) ; plusieurs fonctionnalités de rétroaction exigent le Magasin des requêtes en `READ_WRITE`.

| Problème | Fonctionnalité IQP | Niveau de compatibilité |
| --- | --- | --- |
| Type de jointure inadapté au nombre réel de lignes (mode batch) | Jointures adaptatives | 140 |
| Mauvaise estimation pour une fonction table à instructions multiples | Exécution entrelacée | 140 |
| Débordements ou allocations de mémoire surdimensionnées sur des requêtes répétées | Rétroaction d'allocation de mémoire : mode batch 140, mode ligne 150 ; centile et persistance dans SQL Server 2022 | 140 / 150 |
| Estimation fixe pour les variables de table | Compilation différée des variables de table | 150 |
| UDF scalaires lentes | Incorporation des UDF scalaires | 150 |
| Analytique sur des tables rowstore sans columnstore | Mode batch sur rowstore | 150 |
| `COUNT(DISTINCT)` sur d'énormes volumes quand une approximation suffit | `APPROX_COUNT_DISTINCT` | Tous (SQL Server 2019+) |
| Centiles sur d'énormes volumes | `APPROX_PERCENTILE_CONT` / `_DISC` | 110 (SQL Server 2022+) |
| Un plan en cache mauvais pour certaines valeurs de paramètres | Optimisation du plan sensible aux paramètres | 160 |
| Hypothèses d'estimation de cardinalité erronées sur des requêtes répétées | Rétroaction d'estimation de cardinalité | 160 |
| Parallélisme excessif sur des requêtes répétées | Rétroaction du degré de parallélisme (`DOP_FEEDBACK` est désactivé par défaut) | 160 |
| Coût de compilation des plans forcés | Forçage de plan optimisé | Tous (SQL Server 2022+) |
| Paramètres facultatifs (`@p IS NULL OR col = @p`) | Optimisation du plan des paramètres facultatifs (OPPO) | 170 (SQL Server 2025) |

Dans Azure SQL Managed Instance, les fonctionnalités les plus récentes (rétroaction du degré de parallélisme, forçage de plan optimisé, OPPO) exigent la stratégie de mise à jour SQL Server 2025 ou Always-up-to-date. Désactivez une fonctionnalité sans changer le niveau avec sa configuration à l'échelle de la base (par exemple `BATCH_MODE_ON_ROWSTORE = OFF`, `TSQL_SCALAR_UDF_INLINING = OFF`).

> **Conseil d'examen.** « Améliorer les performances sans modifier le code, après une migration depuis une ancienne version de SQL Server » signifie en général relever le niveau de compatibilité (en laissant d'abord le Magasin des requêtes capturer une base de référence pour pouvoir annuler les régressions).

<!-- section: key-points -->
## Points clés

- `REORGANIZE` est toujours en ligne et conserve sa progression s'il est arrêté ; `REBUILD` exige `ONLINE = ON`, et `RESUMABLE = ON` pour la pause ; ne maintenez pas sur des seuils fixes seuls.
- Gardez la création et la mise à jour automatiques des statistiques ; `AUTO_UPDATE_STATISTICS_ASYNC` évite les attentes de compilation ; `sys.dm_db_stats_properties` montre `modification_counter`.
- `DBCC CHECKDB` sur machines virtuelles relève de vous ; restaurez plutôt que d'utiliser `REPAIR_ALLOW_DATA_LOSS` ; Hyperscale utilise `CHECKTABLE`.
- Réglage automatique : `FORCE_LAST_GOOD_PLAN` partout (exige le Magasin des requêtes) ; `CREATE_INDEX` / `DROP_INDEX` uniquement dans Azure SQL Database.
- Resource Governor : SQL Server et Managed Instance uniquement ; pool + groupe + fonction de classification dans `master` + `RECONFIGURE`.
- La configuration à l'échelle de la base remplace les paramètres d'instance dans Azure SQL Database (`MAXDOP` à 8 par défaut).
- La mise à l'échelle d'Azure SQL Database coupe brièvement les connexions ; montez d'abord les géo-secondaires.
- Les fonctionnalités IQP suivent le niveau de compatibilité : 140, 150, 160, 170.
