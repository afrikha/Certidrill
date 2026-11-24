Les questions sur les performances des requêtes partent d'un symptôme (une requête devenue lente, des sessions qui attendent, un processeur à 100 %) et demandent quel outil trouve la cause et quelle modification la corrige. Les outils sont le Magasin des requêtes (Query Store) pour l'historique et les régressions de plan, les vues de gestion dynamique (DMV) pour ce qui se passe maintenant, les plans d'exécution pour comprendre pourquoi une requête est lente, et Intelligent Insights pour la détection automatique dans Azure SQL.

<!-- section: query-store-config | objectives: 3.2.1 -->
## Configurer le Magasin des requêtes

Le Magasin des requêtes enregistre, par base de données, le texte des requêtes, leurs plans et leurs statistiques d'exécution (durée, processeur, lectures, attentes) agrégées par intervalle de temps. Il survit aux redémarrages et aux basculements, contrairement au cache des plans.

| Plateforme | État par défaut d'une nouvelle base de données |
| --- | --- |
| Azure SQL Database, Azure SQL Managed Instance | Activé (`READ_WRITE`) |
| SQL Server 2022 (16.x) et versions ultérieures | Activé (`READ_WRITE`) |
| SQL Server 2016, 2017, 2019 | Désactivé : activez-le base par base |
| `master`, `tempdb` | Impossible à activer |

```text
ALTER DATABASE SalesDB
SET QUERY_STORE = ON (
    OPERATION_MODE = READ_WRITE,
    QUERY_CAPTURE_MODE = AUTO,
    MAX_STORAGE_SIZE_MB = 2048,
    CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
    SIZE_BASED_CLEANUP_MODE = AUTO,
    INTERVAL_LENGTH_MINUTES = 60,
    WAIT_STATS_CAPTURE_MODE = ON
);
```

| Option | Valeur par défaut | Signification |
| --- | --- | --- |
| `OPERATION_MODE` | `READ_WRITE` | `READ_ONLY` garde les données lisibles mais ne capture plus rien |
| `QUERY_CAPTURE_MODE` | `AUTO` (SQL Server 2019+, Azure SQL Database) ; `ALL` avant 2019 | `AUTO` ignore les requêtes peu fréquentes et peu coûteuses ; `NONE` arrête la capture des nouvelles requêtes ; `CUSTOM` fixe vos propres seuils |
| `MAX_STORAGE_SIZE_MB` | 1 000 Mo (SQL Server 2019+) ; 100 Mo (2016–2017) | Taille maximale des données du Magasin des requêtes |
| `STALE_QUERY_THRESHOLD_DAYS` | 30 | Nettoyage selon l'ancienneté |
| `SIZE_BASED_CLEANUP_MODE` | `AUTO` | Le nettoyage démarre à 90 % de la taille maximale et s'arrête vers 80 % |
| `INTERVAL_LENGTH_MINUTES` | 60 | Intervalle d'agrégation des statistiques d'exécution |
| `DATA_FLUSH_INTERVAL_SECONDS` | 900 | Fréquence d'écriture sur disque des données en mémoire |
| `MAX_PLANS_PER_QUERY` | 200 | Plans conservés par requête |
| `WAIT_STATS_CAPTURE_MODE` | `ON` | Statistiques d'attente par requête (SQL Server 2017+, Azure SQL) |

Avec `QUERY_CAPTURE_MODE = CUSTOM`, une `QUERY_CAPTURE_POLICY` fixe `EXECUTION_COUNT` (30 par défaut), `TOTAL_COMPILE_CPU_TIME_MS` (1 000), `TOTAL_EXECUTION_CPU_TIME_MS` (100) et `STALE_CAPTURE_POLICY_THRESHOLD` (1 jour, de 1 heure à 7 jours) : une requête est capturée dès qu'elle atteint un des seuils dans cette fenêtre.

Quand la taille maximale est atteinte, le Magasin des requêtes passe de lui-même en `READ_ONLY`. Vérifiez et corrigez :

```text
SELECT actual_state_desc, desired_state_desc, readonly_reason,
       current_storage_size_mb, max_storage_size_mb
FROM sys.database_query_store_options;

ALTER DATABASE SalesDB SET QUERY_STORE (MAX_STORAGE_SIZE_MB = 4096);
ALTER DATABASE SalesDB SET QUERY_STORE (OPERATION_MODE = READ_WRITE);
-- Or remove all collected data
ALTER DATABASE SalesDB SET QUERY_STORE CLEAR ALL;
```

> **Piège d'examen.** `actual_state_desc = READ_ONLY` alors que `desired_state_desc = READ_WRITE` signifie que le Magasin des requêtes manque d'espace. La correction consiste à augmenter `MAX_STORAGE_SIZE_MB` ou à nettoyer les données, pas à redémarrer la base.

<!-- section: query-store-monitor | objectives: 3.2.2 -->
## Monitorer avec le Magasin des requêtes

SQL Server Management Studio (SSMS) affiche les rapports intégrés sous le nœud **Query Store** de la base de données :

| Rapport | Sert à trouver |
| --- | --- |
| Regressed Queries (requêtes régressées) | Les requêtes dont la durée, le processeur ou les lectures se sont dégradés, en général après un changement de plan |
| Overall Resource Consumption | La consommation totale de la base dans le temps |
| Top Resource Consuming Queries | Les requêtes les plus lourdes pour une métrique et une période |
| Queries With Forced Plans | Tous les plans actuellement forcés |
| Queries With High Variation | Les requêtes aux performances instables (sensibilité aux paramètres) |
| Query Wait Statistics | Les catégories d'attente et les requêtes qui attendent le plus |
| Tracked Queries | L'historique d'une requête que vous choisissez |

Les mêmes données se trouvent dans des vues de catalogue : `sys.query_store_query` et `sys.query_store_query_text` (requêtes), `sys.query_store_plan` (plans, avec `is_forced_plan`), `sys.query_store_runtime_stats` et `sys.query_store_runtime_stats_interval` (statistiques par intervalle), `sys.query_store_wait_stats` (attentes par plan).

```text
-- Top 10 queries by average CPU over the last 24 hours
SELECT TOP 10 q.query_id, p.plan_id, qt.query_sql_text,
       AVG(rs.avg_cpu_time) AS avg_cpu_us, SUM(rs.count_executions) AS executions
FROM sys.query_store_runtime_stats AS rs
JOIN sys.query_store_runtime_stats_interval AS i
     ON rs.runtime_stats_interval_id = i.runtime_stats_interval_id
JOIN sys.query_store_plan AS p ON rs.plan_id = p.plan_id
JOIN sys.query_store_query AS q ON p.query_id = q.query_id
JOIN sys.query_store_query_text AS qt ON q.query_text_id = qt.query_text_id
WHERE i.start_time > DATEADD(hour, -24, SYSUTCDATETIME())
GROUP BY q.query_id, p.plan_id, qt.query_sql_text
ORDER BY avg_cpu_us DESC;
```

Pour corriger une régression de plan sans modifier le code, forcez le plan précédent ; pour changer la compilation d'une requête sans toucher à l'application, ajoutez un indicateur du Magasin des requêtes (Query Store hint) (SQL Server 2022+, Azure SQL Database, Azure SQL Managed Instance) :

```text
EXEC sp_query_store_force_plan @query_id = 48, @plan_id = 49;
EXEC sp_query_store_unforce_plan @query_id = 48, @plan_id = 49;

EXEC sys.sp_query_store_set_hints @query_id = 39,
     @query_hints = N'OPTION(MAX_GRANT_PERCENT = 10)';
EXEC sys.sp_query_store_clear_hints @query_id = 39;
```

Les indicateurs du Magasin des requêtes remplacent les indicateurs codés en dur au niveau de l'instruction et les repères de plan. Un indicateur inapplicable est ignoré, sans jamais bloquer la requête ; la raison de l'échec figure dans `sys.query_store_query_hints`. Les indicateurs ne s'appliquent que sur le réplica principal, sauf dans SQL Server 2025 avec le Magasin des requêtes pour les réplicas secondaires activé : ils peuvent alors s'appliquer aussi aux secondaires d'un groupe de disponibilité (`@replica_group_id` cible un groupe de réplicas).

> **Conseil d'examen.** « Le code de l'application ne peut pas être modifié » oriente vers le forçage de plan ou les indicateurs du Magasin des requêtes. Forcer un plan à la main est la correction ponctuelle ; la correction automatique des plans (`FORCE_LAST_GOOD_PLAN`, chapitre 33) le fait en continu.

<!-- section: blocking | objectives: 3.2.3 -->
## Identifier et résoudre le blocage de session

Le blocage est un verrouillage normal qui dure trop : la session A détient un verrou, la session B l'attend. Un interblocage (deadlock) est différent : deux sessions s'attendent mutuellement et le moteur en termine une (la victime, erreur 1205).

Trouvez les sessions bloquées et le **bloqueur de tête** (head blocker, la session en haut de la chaîne, bloquée par personne) :

```text
SELECT r.session_id, r.blocking_session_id, r.wait_type, r.wait_time,
       r.wait_resource, t.text
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.blocking_session_id <> 0;

-- What the head blocker is doing and whether it has an open transaction
SELECT s.session_id, s.status, s.open_transaction_count, ib.event_info
FROM sys.dm_exec_sessions AS s
CROSS APPLY sys.dm_exec_input_buffer(s.session_id, NULL) AS ib
WHERE s.session_id = 72;
```

| DMV | Montre |
| --- | --- |
| `sys.dm_exec_requests` | Les requêtes en cours ; `blocking_session_id` = 0 signifie non bloquée |
| `sys.dm_exec_sessions` | Toutes les sessions, y compris celles en veille avec `open_transaction_count` |
| `sys.dm_os_waiting_tasks` | Les attentes en cours, avec la session et la ressource bloquantes |
| `sys.dm_tran_locks` | Les verrous détenus et demandés |

| Scénario | Signes | Résolution |
| --- | --- | --- |
| Requête de longue durée | Le bloqueur de tête est en cours d'exécution | Optimiser la requête (index), raccourcir la transaction |
| Session en veille avec une transaction non validée | État sleeping, transactions ouvertes supérieures à 0 | Corriger l'application : `SET XACT_ABORT ON`, restauration (rollback) dans les gestionnaires d'erreurs ; `KILL` de la session en urgence |
| Le client ne lit pas toutes les lignes | Le bloqueur de tête attend le client | Lire tous les résultats ou fermer la connexion |
| Connexion orpheline | En veille, transaction ouverte, client disparu | `KILL 99` |

Réduisez le blocage dès la conception : transactions courtes, bons index (moins de lignes lues, donc moins de verrous) et **contrôle de version de ligne**. L'isolation de capture instantanée read committed (RCSI) est activée par défaut pour les nouvelles bases Azure SQL Database : les lecteurs ne prennent pas de verrous partagés et ne bloquent donc pas les écrivains. Sur SQL Server, activez-la avec `ALTER DATABASE SalesDB SET READ_COMMITTED_SNAPSHOT ON`.

Le **verrouillage optimisé** (verrouillage par ID de transaction et verrouillage après qualification) réduit la mémoire de verrouillage et le nombre de verrous détenus par les écritures. Il est toujours activé dans Azure SQL Database et dans Azure SQL Managed Instance avec la stratégie de mise à jour SQL Server 2025 ou Always-up-to-date (il n'est pas disponible avec la stratégie de mise à jour SQL Server 2022) ; dans SQL Server 2025, il est désactivé par défaut et exige la récupération de base de données accélérée (ADR). Le verrouillage après qualification ne fonctionne qu'avec RCSI. Vérifiez-le avec `DATABASEPROPERTYEX(DB_NAME(), 'IsOptimizedLockingOn')`.

> **Piège d'examen.** Un délai d'attente dépassé ou une annulation termine le lot mais ne restaure pas la transaction ouverte : ses verrous restent jusqu'à ce que l'application valide, restaure ou se déconnecte.

<!-- section: dmvs | objectives: 3.2.4 -->
## Identifier les problèmes de performances avec les DMV

Les DMV montrent l'état actuel du moteur. Les interroger exige `VIEW DATABASE STATE` dans Azure SQL Database (accordée à un utilisateur de base de données) ou `VIEW SERVER STATE` (ou `VIEW SERVER PERFORMANCE STATE`, par exemple via le rôle serveur `##MS_ServerStateReader##`).

| Question | DMV |
| --- | --- |
| Consommation d'une base Azure SQL, dernière heure | `sys.dm_db_resource_stats` (une ligne toutes les 15 secondes, environ 1 heure conservée) |
| Même chose, 14 derniers jours | `sys.resource_stats` dans `master` (intervalles de 5 minutes, environ 14 jours) |
| Consommation d'une instance managée | `sys.server_resource_stats` dans `master` |
| Ce qui s'exécute maintenant | `sys.dm_exec_requests` + `sys.dm_exec_sql_text` |
| Requêtes en cache les plus lourdes | `sys.dm_exec_query_stats` (une ligne par instruction dans le cache des plans ; perdue quand le plan quitte le cache) |
| Un plan en cache | `sys.dm_exec_query_plan(plan_handle)` |
| Attentes depuis le démarrage | `sys.dm_os_wait_stats` (SQL Server, Managed Instance), `sys.dm_db_wait_stats` (Azure SQL Database) |
| Allocations de mémoire | `sys.dm_exec_query_memory_grants` |
| Utilisation et fragmentation des index | `sys.dm_db_index_usage_stats`, `sys.dm_db_index_physical_stats` |
| Index manquants | `sys.dm_db_missing_index_details`, `_groups`, `_group_stats` |

Interprétez le type d'attente dominant :

| Attente | Indique |
| --- | --- |
| `SOS_SCHEDULER_YIELD`, `avg_cpu_percent` élevé | Pression processeur : optimiser les requêtes les plus gourmandes ou monter en puissance |
| `PAGEIOLATCH_*` | Lectures des fichiers de données : index manquants, analyses, mémoire insuffisante |
| `WRITELOG` | Écritures dans le journal des transactions |
| `LCK_M_*` | Blocage |
| `RESOURCE_SEMAPHORE` | Requêtes en attente d'allocation de mémoire |
| `PAGELATCH_*` avec un `wait_resource` commençant par `2:` | Contention d'allocation dans `tempdb` (ID de base 2) |
| `CXPACKET`, `CXCONSUMER` | Parallélisme : revoir MAXDOP et le seuil de coût |

```text
SELECT TOP 10 qs.query_hash,
       SUM(qs.total_worker_time) / SUM(qs.execution_count) AS avg_cpu_us,
       SUM(qs.execution_count) AS executions
FROM sys.dm_exec_query_stats AS qs
GROUP BY qs.query_hash
ORDER BY avg_cpu_us DESC;
```

> **Piège d'examen.** Les données des DMV sont volatiles : le cache des plans et les statistiques d'attente sont réinitialisés par un redémarrage ou un basculement. Pour « la semaine dernière » ou « avant le changement de plan », utilisez le Magasin des requêtes, pas `sys.dm_exec_query_stats`. Les requêtes compilées avec `OPTION (RECOMPILE)` n'apparaissent pas dans `sys.dm_exec_query_stats`.

<!-- section: index-changes | objectives: 3.2.5 -->
## Identifier et implémenter les changements d'index

| Exigence | Index |
| --- | --- |
| Recherches ponctuelles et par plage sur une clé | Index cluster (un par table) sur une clé étroite, unique et toujours croissante |
| Recherche (seek) sur d'autres colonnes | Index non cluster |
| Éviter les recherches de clés pour une requête fréquente | Index couvrant : colonnes clés + `INCLUDE` pour les colonnes sélectionnées |
| Requêtes sur un sous-ensemble bien défini (`WHERE Status = 'Open'`) | Index filtré |
| Grandes analyses et agrégations (analytique, rapports) | Index columnstore (cluster pour une table de faits, non cluster sur une table OLTP) |
| Index inutilisé qui ralentit les écritures | Le supprimer (vérifier `sys.dm_db_index_usage_stats` : beaucoup de `user_updates`, aucune recherche ni analyse) |

La fonctionnalité d'**index manquants** suggère des index quand l'optimiseur compile une requête, dans le plan (texte vert « Missing Index », élément XML `MissingIndexes`) et dans les DMV d'index manquants :

```text
SELECT TOP 10 d.statement, d.equality_columns, d.inequality_columns,
       d.included_columns, s.user_seeks, s.avg_user_impact
FROM sys.dm_db_missing_index_group_stats AS s
JOIN sys.dm_db_missing_index_groups AS g ON s.group_handle = g.index_group_handle
JOIN sys.dm_db_missing_index_details AS d ON g.index_handle = d.index_handle
ORDER BY s.user_seeks * s.avg_user_impact DESC;

CREATE NONCLUSTERED INDEX IX_Orders_CustomerID_OrderDate
ON dbo.Orders (CustomerID, OrderDate)
INCLUDE (TotalDue)
WITH (ONLINE = ON);
```

Construisez la clé avec les colonnes d'égalité d'abord, puis les colonnes d'inégalité ; mettez les autres colonnes dans `INCLUDE` (leur ordre est sans effet). Limites : index rowstore non cluster uniquement (jamais filtrés ni uniques), 600 groupes d'index manquants au maximum, estimations jamais vérifiées après l'exécution, données perdues au redémarrage ou au basculement, aucune vérification du chevauchement avec les index existants. Fusionnez les suggestions avec les index existants, puis mesurez.

Dans Azure SQL Database, le réglage automatique peut créer et supprimer des index lui-même (chapitre 33) ; dans Managed Instance et SQL Server, il ne le peut pas.

> **Piège d'examen.** Une recherche de clé (Key Lookup) coûteuse dans le plan se corrige en ajoutant les colonnes recherchées à l'index non cluster avec `INCLUDE`, pas en ajoutant un second index sur la même clé.

<!-- section: query-constructs | objectives: 3.2.6 -->
## Recommander des modifications de construction des requêtes

Quand une requête consomme l'essentiel du processeur, des lectures ou de la mémoire, la correction se trouve souvent dans le T-SQL lui-même :

| Construction | Problème | Réécriture |
| --- | --- | --- |
| Fonction sur une colonne : `WHERE YEAR(OrderDate) = 2026` | Non SARGable : analyse d'index au lieu d'une recherche | `WHERE OrderDate >= '2026-01-01' AND OrderDate < '2027-01-01'` |
| Conversion implicite : paramètre `nvarchar` comparé à une colonne `varchar` | Avertissement `CONVERT_IMPLICIT`, analyse | Utiliser le type de données de la colonne pour les paramètres |
| Caractère générique en tête `LIKE '%son'` | Recherche impossible | Recherche en texte intégral, ou un autre prédicat |
| `SELECT *` | Plus de lectures, recherches de clés, aucun index couvrant possible | Ne sélectionner que les colonnes utiles |
| Curseur ou boucle `WHILE` ligne par ligne | Processeur et durée élevés | `UPDATE`/`INSERT ... SELECT` ensembliste |
| Un énorme `DELETE` unique | Verrous longs, escalade de verrous, croissance du journal | Supprimer par lots (`DELETE TOP (5000)` dans une boucle) |
| Plan bon pour certaines valeurs de paramètres seulement (détection de paramètres) | Forte variation de durée | `OPTION (RECOMPILE)`, `OPTIMIZE FOR` ou optimisation du plan sensible aux paramètres (niveau de compatibilité 160) |
| Fonction scalaire définie par l'utilisateur appelée par ligne | Exécution en série, ligne par ligne | Incorporation des UDF scalaires (niveau de compatibilité 150) ou fonction table inline |

> **Conseil d'examen.** Les indices de ressources désignent la correction : beaucoup de lectures logiques, ajouter ou modifier un index ou le prédicat ; processeur élevé avec peu de lectures, logique ligne par ligne ou fonctions scalaires ; attente d'allocation de mémoire (`RESOURCE_SEMAPHORE`) ou débordement, mauvaises estimations (statistiques) ou tris et hachages excessifs.

<!-- section: execution-plans | objectives: 3.2.7 -->
## Passer en revue les plans d'exécution

| Plan | Comment | Contenu |
| --- | --- | --- |
| Estimé | SSMS **Display Estimated Execution Plan** (Ctrl+L), `SET SHOWPLAN_XML ON` | Compilé sans exécution : estimations uniquement |
| Réel | SSMS **Include Actual Execution Plan** (Ctrl+M), `SET STATISTICS XML ON` | Après exécution : lignes réelles, avertissements d'exécution |
| En direct | **Include Live Query Statistics**, `sys.dm_exec_query_profiles` | Progression des opérateurs pendant l'exécution |
| Dernier réel (en cache) | `ALTER DATABASE SCOPED CONFIGURATION SET LAST_QUERY_PLAN_STATS = ON` puis `sys.dm_exec_query_plan_stats(plan_handle)` | Dernier plan réel connu, issu du profilage léger |
| Historique | Rapports du Magasin des requêtes, `sys.query_store_plan` | Tous les plans utilisés par une requête |

Afficher un plan exige l'autorisation `SHOWPLAN` sur les bases concernées. `SET STATISTICS IO ON` et `SET STATISTICS TIME ON` ajoutent les lectures et le temps processeur par instruction.

Lisez le plan de droite à gauche, puis cherchez :

| Signe | Signification |
| --- | --- |
| Index Scan ou Table Scan sur une grande table alors que peu de lignes sont retournées | Index manquant ou prédicat non SARGable |
| Key Lookup / RID Lookup exécuté de nombreuses fois | L'index ne couvre pas la requête |
| Lignes estimées très différentes des lignes réelles | Statistiques obsolètes ou absentes, détection de paramètres, variable de table |
| Avertissement : débordement dans `tempdb` sur un Sort ou un Hash Match | Allocation de mémoire trop petite (mauvaise estimation) |
| Avertissement : `CONVERT_IMPLICIT` | Types de données incompatibles |
| Nested Loops sur deux grandes entrées | Mauvaise estimation ; Hash Match convient en général aux grandes entrées non triées, Merge Join à deux entrées triées |

Le profilage léger, activé par défaut dans SQL Server 2019+ et Azure SQL Database, rend peu coûteuse la collecte des données du plan réel. SSMS peut comparer deux plans (**Compare Showplan**), par exemple les plans d'une requête régressée trouvée dans le Magasin des requêtes.

> **Piège d'examen.** Le plan estimé ne peut montrer ni débordements, ni nombres de lignes réels, ni avertissements d'exécution : les questions qui en ont besoin exigent le plan réel.

<!-- section: intelligent-insights | objectives: 3.2.8 -->
## Monitorer avec Intelligent Insights

Intelligent Insights utilise une intelligence intégrée pour comparer la dernière heure de la charge de travail d'une base avec une base de référence de sept jours et détecter les dégradations de performances. Il s'applique à Azure SQL Database et à Azure SQL Managed Instance (pas à SQL Server sur machines virtuelles) et c'est une fonctionnalité en préversion, non disponible dans les régions West Europe, North Europe, West US 1 et East US 1.

Il mesure la durée des requêtes et les délais d'attente dépassés (métriques principales), ainsi que les attentes excessives et les erreurs. Chaque problème détecté est écrit dans le journal de diagnostic **SQLInsights** avec les requêtes touchées, la cause racine et, si possible, une recommandation, puis suivi jusqu'à sa résolution.

Configurez-le avec un paramètre de diagnostic sur la base de données (ou la base de l'instance managée) : sélectionnez la catégorie **SQLInsights** et une destination.

| Destination | Pour |
| --- | --- |
| Espace de travail Log Analytics | Requêtes KQL, classeurs, alertes de journal |
| Azure Event Hubs | Diffusion vers une supervision personnalisée ou des outils tiers |
| Compte de stockage Azure | Archivage et rapports personnalisés |

Ses 15 modèles détectables comprennent l'atteinte des limites de ressources, l'augmentation de la charge de travail, la sollicitation de la mémoire, le verrouillage, l'index manquant, la nouvelle requête, la contention `tempdb`, la régression de plan, la modification d'une valeur de configuration à l'échelle de la base de données et le passage à un niveau tarifaire inférieur ; la pénurie de DTU du pool élastique ne concerne qu'Azure SQL Database.

> **Piège d'examen.** Le journal **SQLInsights** n'est pas la solution Azure Monitor SQL Insights, qui a été mise hors service. Intelligent Insights signale les problèmes, il ne les corrige pas. La correction automatique relève du réglage automatique.

<!-- section: key-points -->
## Points clés

- Le Magasin des requêtes est activé par défaut dans Azure SQL et SQL Server 2022+ ; il passe en `READ_ONLY` quand il est plein ; corrigez avec un `MAX_STORAGE_SIZE_MB` plus grand ou un nettoyage.
- Rapport Regressed Queries + `sp_query_store_force_plan` corrige une régression de plan sans modifier le code ; les indicateurs du Magasin des requêtes changent la compilation sans modifier le code.
- Blocage : trouvez le bloqueur de tête avec `blocking_session_id` ; RCSI (par défaut dans Azure SQL Database) empêche les lecteurs de bloquer les écrivains ; `KILL` est le dernier recours.
- DMV = maintenant (volatile) ; Magasin des requêtes = historique ; `sys.dm_db_resource_stats` = 1 heure, `sys.resource_stats` = 14 jours.
- Suggestions d'index manquants : égalité, inégalité, puis `INCLUDE` ; non cluster uniquement ; vérifiez avant de créer.
- Plan estimé = aucune exécution ; plan réel = lignes réelles et avertissements ; écart estimé/réel = statistiques.
- Intelligent Insights : préversion, Azure SQL Database et Managed Instance, journal SQLInsights vers Log Analytics, Event Hubs ou Stockage Azure.
