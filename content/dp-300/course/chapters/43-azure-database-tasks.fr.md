Azure SQL Database n'a pas de SQL Server Agent : le travail T-SQL récurrent est exécuté par les travaux élastiques, et les opérations plus larges (mise à l'échelle, exportations, démarrage et arrêt de ressources) par Azure Automation ou d'autres services Azure. Les questions d'examen demandent quel outil convient à un ensemble de cibles, comment l'authentifier, comment être averti de ses échecs et comment lire son historique d'exécution.

<!-- section: elastic-jobs | objectives: 4.3.1 -->
## Travaux élastiques

Un travail élastique (elastic job) exécute des scripts T-SQL selon une planification ou à la demande sur une ou plusieurs bases de données Azure SQL Database, à travers des serveurs logiques, des pools élastiques, des abonnements et des régions.

| Composant | Ce que c'est | Règles à retenir |
| --- | --- | --- |
| Agent de travail élastique (elastic job agent) | La ressource Azure qui crée, exécute et gère les travaux | Un niveau d'agent : JA100 (par défaut), JA200, JA400 ou JA800 = 100, 200, 400 ou 800 connexions simultanées aux cibles |
| Base de données de travail (job database) | Une base Azure SQL Database qui stocke les définitions, l'état et l'historique des travaux | Une base nouvelle et vide ; S1 ou supérieur recommandé. Ni Hyperscale, ni serverless avec mise en pause automatique |
| Groupe cible (target group) | L'ensemble des bases sur lesquelles une étape s'exécute | Membres : serveur logique, pool élastique ou base unique ; inclusion ou exclusion |
| Travail / étape de travail | Un travail contient des étapes ordonnées ; chaque étape a une commande T-SQL, un groupe cible, un délai d'expiration et une stratégie de nouvelle tentative | Sortie facultative du jeu de résultats d'une étape vers une table |

Les serveurs et les pools élastiques d'un groupe cible sont **énumérés au moment de l'exécution** : une base ajoutée au pool ou au serveur après la création du travail est incluse à l'exécution suivante. Cette énumération dynamique est la principale raison de préférer les travaux élastiques pour les parcs SaaS où les bases apparaissent et disparaissent.

> **Piège d'examen.** Si 110 cibles démarrent sur un agent JA100, 10 cibles attendent que d'autres se terminent : le travail n'échoue pas. Augmentez le niveau de l'agent pour obtenir plus de connexions simultanées.

**Authentification.** Une seule méthode par agent, pour toutes les cibles :

| Méthode | Mise en place |
| --- | --- |
| Microsoft Entra ID avec une identité managée affectée par l'utilisateur (recommandé) | Affectez une UMI à l'agent ; créez un utilisateur pour elle dans chaque base cible (et une connexion plus un utilisateur dans `master` des serveurs ou pools à énumérer). L'identité affectée par le système n'est pas prise en charge |
| Informations d'identification délimitées à la base de données (database-scoped credentials) | Créez les informations d'identification dans la base de travail ; créez une connexion et un utilisateur correspondants, avec le même nom et le même mot de passe, sur chaque cible ; passez `@credential_name` aux étapes |

La définition du travail s'écrit dans la base de travail avec les procédures stockées du schéma `jobs` :

```text
-- Target group: every database of a server except one
EXEC jobs.sp_add_target_group @target_group_name = N'AllTenants';
EXEC jobs.sp_add_target_group_member @target_group_name = N'AllTenants',
     @target_type = N'SqlServer', @server_name = N'srv-tenants.database.windows.net';
EXEC jobs.sp_add_target_group_member @target_group_name = N'AllTenants',
     @membership_type = N'Exclude', @target_type = N'SqlDatabase',
     @server_name = N'srv-tenants.database.windows.net', @database_name = N'TenantCatalog';

-- Job, step and schedule (all times are UTC)
EXEC jobs.sp_add_job @job_name = N'RebuildStats', @description = N'Nightly statistics update';
EXEC jobs.sp_add_jobstep @job_name = N'RebuildStats',
     @command = N'EXEC sp_updatestats;', @target_group_name = N'AllTenants',
     @retry_attempts = 3, @step_timeout_seconds = 3600;
EXEC jobs.sp_update_job @job_name = N'RebuildStats', @enabled = 1,
     @schedule_interval_type = N'Days', @schedule_interval_count = 1,
     @schedule_start_time = N'2026-12-01 02:00:00';

-- Run now
EXEC jobs.sp_start_job @job_name = N'RebuildStats';
```

Valeurs par défaut utiles : un nouveau travail est **désactivé** (`@enabled = 0`) et s'exécute `Once` tant que vous ne définissez pas `@schedule_interval_type` (`Once`, `Minutes`, `Hours`, `Days`, `Weeks`, `Months`). Une étape fait 10 nouvelles tentatives par défaut avec une temporisation exponentielle (intervalle initial de 1 seconde, multiplicateur 2.0, 120 secondes au plus) et expire après 43 200 secondes (12 heures).

Les mêmes objets se gèrent depuis le portail (Elastic Job agents > Créer), PowerShell ou l'API REST :

```powershell
$agent = $jobDatabase | New-AzSqlElasticJobAgent -Name "agent-ops"
$group = $agent | New-AzSqlElasticJobTargetGroup -Name "AllTenants"
$group | Add-AzSqlElasticJobTarget -ServerName "srv-tenants"
$job = $agent | New-AzSqlElasticJob -Name "RebuildStats"
$job | Add-AzSqlElasticJobStep -Name "step1" -TargetGroupName "AllTenants" -CommandText "EXEC sp_updatestats;"
$job | Set-AzSqlElasticJob -IntervalType Day -IntervalCount 1 -StartTime (Get-Date).AddDays(1) -Enable
```

> **Conseil d'examen.** Les scripts doivent être **idempotents** (`IF NOT EXISTS ... CREATE`) : une nouvelle tentative, ou une réexécution sur une cible où l'étape a réussi à moitié, ne doit ni échouer ni dupliquer le travail.

<!-- section: automation-options | objectives: 4.3.2 -->
## Choisir un outil d'automatisation

| Exigence | Outil |
| --- | --- |
| Exécuter du T-SQL sur de nombreuses bases Azure SQL, y compris les bases ajoutées plus tard | Travaux élastiques |
| Exécuter des étapes T-SQL, SSIS, PowerShell ou de commande du système d'exploitation dans une instance managée SQL | SQL Server Agent (toujours en cours d'exécution sur SQL Managed Instance) |
| Travaux planifiés sur SQL Server sur des machines virtuelles Azure | SQL Server Agent sur la machine virtuelle |
| Tâches du plan de contrôle : mettre à l'échelle une base, exporter un BACPAC, modifier un paramètre, démarrer ou arrêter des ressources | Runbook Azure Automation (PowerShell avec les modules Az) |
| Workflow déclenché par un événement ou low-code qui appelle SQL et d'autres services | Azure Logic Apps ou Azure Functions |
| Orchestrer des tâches T-SQL pour une base de données SQL dans Microsoft Fabric (ni SQL Server Agent ni travaux élastiques) | Pipelines Data Factory planifiés ou travaux Apache Airflow |

> **Piège d'examen.** SQL Server Agent n'existe pas dans Azure SQL Database, et l'administration multiserveur (MSX/TSX) n'est pas disponible sur SQL Managed Instance. « Exécuter le même script sur toutes les bases de trois serveurs logiques » = travaux élastiques.

**Azure Automation** exécute des runbooks selon une planification, depuis un webhook ou depuis une alerte. Un runbook peut appeler des cmdlets Az PowerShell pour les opérations de gestion, et peut aussi se connecter à la base pour envoyer du T-SQL. Authentifiez-vous avec l'**identité managée** du compte Automation (les comptes d'identification Run As sont retirés) : accordez-lui un rôle Azure pour le plan de contrôle, et un utilisateur de base de données créé `FROM EXTERNAL PROVIDER` pour le plan de données.

```powershell
# Runbook: scale a database to a larger service objective
Connect-AzAccount -Identity
Set-AzSqlDatabase -ResourceGroupName "rg-data" -ServerName "srv-sales" `
  -DatabaseName "SalesDb" -RequestedServiceObjectiveName "S3"
```

Moindre privilège pour ce runbook : SQL DB Contributor sur la base ou le serveur plutôt que Contributor sur le groupe de ressources.

<!-- section: alerts-notifications | objectives: 4.3.3 -->
## Alertes et notifications

Chaque outil expose ses échecs différemment :

| Outil | Signal | Comment être averti |
| --- | --- | --- |
| Travaux élastiques | Métriques de l'agent : Elastic Jobs Executions Failed / Successful / Timed Out | Règle d'alerte de métrique sur l'agent (seuil supérieur à 0) avec un groupe d'actions |
| Azure Automation | Métrique **Total Jobs** avec les dimensions Runbook Name et Status | Alerte de métrique où Status = Failed, avec un groupe d'actions |
| Azure Automation (historique et corrélation) | Job Logs et Job Streams envoyés par un paramètre de diagnostic vers Log Analytics (table `AzureDiagnostics`) | Alerte de recherche dans les journaux sur une requête KQL |
| SQL Server Agent sur SQL Managed Instance | Résultat du travail | Database Mail plus un opérateur ; notification du travail en cas d'échec |

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.AUTOMATION" and Category == "JobLogs"
| where ResultType in ("Failed", "Stopped", "Suspended")
| project TimeGenerated, RunbookName_s, ResultType, JobId_g
```

Sur SQL Managed Instance, SQL Server Agent n'envoie d'e-mails que par un profil Database Mail nommé exactement `AzureManagedInstance_dbmail_profile` :

```text
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'Database Mail XPs', 1; RECONFIGURE;
-- create the Database Mail account and the profile AzureManagedInstance_dbmail_profile, then:
EXEC msdb.dbo.sp_add_operator @name = N'DbaTeam', @enabled = 1,
     @email_address = N'dba-team@contoso.com';
EXEC msdb.dbo.sp_update_job @job_name = N'NightlyLoad',
     @notify_level_email = 2,            -- 1 = on success, 2 = on failure, 3 = on completion
     @notify_email_operator_name = N'DbaTeam';
```

> **Piège d'examen.** Les **alertes** SQL Server Agent et les notifications par pager et net send ne sont pas prises en charge sur SQL Managed Instance : seulement les notifications par e-mail aux opérateurs. Pour un seuil de métrique, utilisez une alerte Azure Monitor.

Utilisez une liste de distribution comme opérateur ou dans le groupe d'actions, pour que les notifications survivent aux changements d'équipe.

<!-- section: troubleshoot-tasks | objectives: 4.3.4 -->
## Résoudre les problèmes des tâches automatisées

L'historique des travaux élastiques se trouve dans la base de travail, dans `jobs.job_executions` : une ligne parente par exécution de travail (`step_id IS NULL`) et des lignes enfants par étape et par cible, avec `lifecycle`, `current_attempts`, `last_message` et les noms des cibles. L'historique de plus de 45 jours est purgé automatiquement ; `jobs.sp_purge_jobhistory` le purge à la demande.

```text
SELECT job_name, step_id, target_server_name, target_database_name,
       lifecycle, current_attempts, last_message
FROM jobs.job_executions
WHERE is_active = 0 AND lifecycle IN (N'Failed', N'TimedOut')
ORDER BY start_time DESC;
```

| `lifecycle` | Sens |
| --- | --- |
| WaitingForRetry | L'étape a échoué sur une cible et attend sa prochaine tentative |
| Failed | L'étape a échoué et a épuisé ses nouvelles tentatives |
| TimedOut | L'étape a dépassé `step_timeout_seconds` |
| Skipped | Une autre exécution de la même étape était encore en cours sur cette cible |
| SucceededWithSkipped | Le travail a réussi mais certaines exécutions enfants ont été ignorées |

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| Échec de connexion sur certaines cibles | Pas d'utilisateur pour l'UMI ou les informations d'identification dans ces bases | Créez l'utilisateur (`CREATE USER [umi-jobs] FROM EXTERNAL PROVIDER`) et accordez les autorisations nécessaires |
| Une cible serveur ou pool ne s'exécute sur aucune base | L'agent ne peut pas énumérer les bases | Créez la connexion et l'utilisateur dans `master` de ce serveur (ou définissez les informations d'identification d'actualisation) |
| Connexions refusées | Le pare-feu bloque l'agent | Autorisez les services Azure sur le serveur cible, ou créez et **approuvez** des points de terminaison privés gérés par le service |
| Exécutions Skipped | La planification est plus courte que la durée de l'étape | Allongez l'intervalle ou accélérez le script |
| Un travail s'exécute dès son activation | Heure de début de planification dans le passé : les événements manqués s'exécutent tout de suite | Définissez une heure de début future (UTC) |
| Les travaux s'arrêtent après un basculement régional | L'agent reste dans l'ancienne région | Recréez et démarrez l'agent dans la nouvelle région |

Pour Azure Automation, ouvrez le travail et lisez ses flux (Output, Warning, Error, Verbose) ou interrogez `AzureDiagnostics`. Échecs typiques : l'identité managée n'a pas le rôle Azure ou l'utilisateur de base de données, l'appel du module Az vise le mauvais abonnement, ou le pare-feu du serveur rejette le runbook (il peut s'exécuter depuis une plage d'adresses IP des centres de données de la région). Pour SQL Server Agent sur SQL Managed Instance, lisez l'historique du travail dans SSMS ou `msdb.dbo.sysjobhistory` ; l'historique est fixé à 1 000 lignes au total et 100 par travail.

<!-- section: key-points -->
## Points clés

- Travaux élastiques = T-SQL planifié sur de nombreuses bases Azure SQL, avec des cibles énumérées à l'exécution ; SQL Server Agent couvre SQL Managed Instance et SQL Server sur des machines virtuelles.
- Les niveaux d'agent JA100 à JA800 fixent les connexions simultanées aux cibles ; la base de travail est une base vide S1 ou supérieure, ni Hyperscale ni serverless avec mise en pause automatique.
- Préférez une identité managée affectée par l'utilisateur ; une seule méthode d'authentification par agent ; des utilisateurs dans chaque cible, et dans `master` pour les cibles serveur ou pool.
- Les nouveaux travaux sont désactivés ; les planifications sont en UTC ; par défaut, les étapes font 10 nouvelles tentatives et expirent après 12 heures ; les scripts doivent être idempotents.
- Alertez sur les métriques de l'agent ou sur la métrique Automation Total Jobs avec Status = Failed ; SQL Managed Instance n'envoie d'e-mails que par `AzureManagedInstance_dbmail_profile`.
- Diagnostiquez les travaux élastiques avec `jobs.job_executions` (`lifecycle`, `last_message`), historique conservé 45 jours.
