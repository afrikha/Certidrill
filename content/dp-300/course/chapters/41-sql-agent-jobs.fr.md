SQL Server Agent exécute des travaux planifiés sur SQL Server (y compris SQL Server sur machines virtuelles Azure) et Azure SQL Managed Instance ; Azure SQL Database n'a pas de SQL Server Agent et utilise à la place les travaux élastiques (chapitre 43). Les questions d'examen demandent comment planifier la maintenance, comment être averti de l'échec d'un travail et pourquoi un travail ne s'est pas exécuté ou a échoué, avec souvent les différences de Managed Instance comme piège.

<!-- section: agent-platforms | objectives: 4.1.1, 4.1.3 -->
## Où s'exécute SQL Server Agent

| Plateforme | SQL Server Agent |
| --- | --- |
| SQL Server sur machines virtuelles Azure (Windows) | Service Windows ; à configurer en démarrage automatique ; géré dans SSMS sous **SQL Server Agent** |
| SQL Server sur Linux | Inclus depuis SQL Server 2017 CU 4 mais désactivé par défaut : `sudo /opt/mssql/bin/mssql-conf set sqlagent.enabled true`, puis `sudo systemctl restart mssql-server` |
| Azure SQL Managed Instance | Toujours en cours d'exécution ; impossible à activer ou désactiver ; paramètres en lecture seule (`sp_set_agent_properties` n'est pas pris en charge) |
| Azure SQL Database | Non disponible : utilisez les travaux élastiques, ou Azure Automation pour des tâches plus larges |

Limites de Managed Instance à retenir :

| Fonctionnalité | Managed Instance |
| --- | --- |
| Étapes de travail T-SQL et SSIS | Prises en charge (ainsi que les travaux de réplication transactionnelle : lecteur du journal, capture instantanée et distributeur) |
| Étapes d'interpréteur de commandes (CmdExec), réplication de fusion, Queue Reader | Non prises en charge |
| Proxys | Non pris en charge |
| Planification sur processeur inactif | Non prise en charge |
| Alertes | Pas encore prises en charge |
| Notifications par e-mail | Prises en charge via la messagerie de base de données (Database Mail), avec un profil nommé `AzureManagedInstance_dbmail_profile` ; pager, net send et journal des événements ne sont pas pris en charge |
| Administration multiserveur (MSX/TSX) | Non prise en charge |
| Autorisations via un groupe Microsoft Entra | Sans effet : l'utilisateur doit être mappé directement à une connexion serveur Microsoft Entra pour créer, modifier ou exécuter des travaux |

Les définitions de travaux, les planifications, les opérateurs, les alertes et l'historique sont stockés dans `msdb`.

> **Piège d'examen.** « Exécuter chaque nuit un script de maintenance T-SQL sur 40 bases Azure SQL Database » ne peut pas utiliser SQL Server Agent : Azure SQL Database n'en a pas. Sur Managed Instance, c'est possible, mais un travail qui doit exécuter un script `.cmd` ou PowerShell sur l'hôte ne l'est pas.

<!-- section: schedules | objectives: 4.1.1 -->
## Gérer les planifications des travaux de maintenance

Un **travail** comporte une ou plusieurs **étapes** (chacune avec un type, une commande, une base de données et des actions de contrôle du flux) et zéro ou plusieurs **planifications**. Une planification est un objet distinct : une même planification peut être attachée à plusieurs travaux, et un travail peut avoir plusieurs planifications.

| Type de planification | `@freq_type` | Usage |
| --- | --- | --- |
| Une seule fois | 1 | Une exécution unique à une date et une heure |
| Périodique quotidienne / hebdomadaire / mensuelle / mensuelle relative | 4 / 8 / 16 / 32 | Maintenance régulière (par exemple chaque dimanche à 02:00, ou le dernier samedi du mois) |
| Démarrer automatiquement au démarrage de SQL Server Agent | 64 | Tâches nécessaires après chaque redémarrage |
| Démarrer quand les processeurs deviennent inactifs | 128 | Travail peu prioritaire quand le serveur est calme (condition d'inactivité définie dans les propriétés de l'Agent ; pas sur Managed Instance) |

Un travail de maintenance hebdomadaire typique créé en T-SQL :

```text
USE msdb;
EXEC sp_add_job @job_name = N'Weekly index and statistics maintenance',
     @owner_login_name = N'sa';
EXEC sp_add_jobstep @job_name = N'Weekly index and statistics maintenance',
     @step_name = N'Update statistics', @subsystem = N'TSQL',
     @database_name = N'SalesDB', @command = N'EXEC sp_updatestats;',
     @retry_attempts = 2, @retry_interval = 5,
     @on_success_action = 3, @on_fail_action = 2;
EXEC sp_add_jobstep @job_name = N'Weekly index and statistics maintenance',
     @step_name = N'Check integrity', @subsystem = N'TSQL',
     @database_name = N'SalesDB', @command = N'DBCC CHECKDB WITH NO_INFOMSGS;';
EXEC sp_add_schedule @schedule_name = N'Sunday 02:00',
     @freq_type = 8, @freq_interval = 1, @freq_recurrence_factor = 1,
     @active_start_time = 020000;
EXEC sp_attach_schedule @job_name = N'Weekly index and statistics maintenance',
     @schedule_name = N'Sunday 02:00';
EXEC sp_add_jobserver @job_name = N'Weekly index and statistics maintenance';
```

| Élément | Détail |
| --- | --- |
| `@freq_interval` des planifications hebdomadaires | Masque de bits des jours : 1 = dimanche, 2 = lundi, 4 = mardi... 64 = samedi (62 = du lundi au vendredi) |
| `@freq_subday_type`, `@freq_subday_interval` | Répétition dans la journée (toutes les N minutes ou heures) |
| `@on_success_action` / `@on_fail_action` | 1 = quitter en signalant la réussite, 2 = quitter en signalant l'échec, 3 = passer à l'étape suivante, 4 = aller à l'étape `@on_success_step_id` / `@on_fail_step_id` |
| `@retry_attempts`, `@retry_interval` | Nouvelles tentatives automatiques d'une étape en échec, intervalle en minutes |
| `sp_add_jobserver` | Cible le travail sur le serveur local : sans lui, le travail ne s'exécute jamais |

Dans SSMS : **SQL Server Agent > Travaux > Nouveau travail**, pages **Étapes**, **Planifications**, **Alertes**, **Notifications**. L'**Assistant Plan de maintenance** (Gestion > Plans de maintenance) construit les tâches courantes (vérifier l'intégrité, reconstruire ou réorganiser les index, mettre à jour les statistiques, sauvegarder, nettoyer l'historique) et crée les travaux de l'Agent qui les exécutent. Désactivez une planification (`sp_update_schedule @enabled = 0`) pour la suspendre pour tous les travaux qui l'utilisent ; désactivez un travail (`sp_update_job @enabled = 0`) pour l'arrêter quelles que soient ses planifications.

> **Conseil d'examen.** Planifiez la maintenance hors des heures ouvrées et ordonnez-la : vérification d'intégrité, puis maintenance des index, puis mise à jour des statistiques pour ce que la reconstruction n'a pas couvert, et des sauvegardes qui ne chevauchent pas les tâches les plus lourdes.

<!-- section: alerts-notifications | objectives: 4.1.2 -->
## Configurer les alertes et les notifications des travaux

Les notifications vont à des **opérateurs** : un alias avec une adresse e-mail (pager et net send sont dépréciés). L'e-mail exige la **messagerie de base de données** (Database Mail).

Ordre de configuration :

1. Activez et configurez Database Mail (compte SMTP et profil), puis testez-la.
2. Dans **Propriétés de SQL Server Agent > Système d'alerte**, activez le profil de messagerie, puis **redémarrez SQL Server Agent** (sur Managed Instance, nommez le profil `AzureManagedInstance_dbmail_profile`).
3. Créez l'opérateur.
4. Ajoutez une notification au travail (en cas d'échec, de réussite ou à la fin) ou créez une alerte qui avertit l'opérateur.

```text
USE msdb;
EXEC sp_add_operator @name = N'DBA team', @email_address = N'dba@contoso.com';

-- Email the operator when the job fails
EXEC sp_update_job @job_name = N'Weekly index and statistics maintenance',
     @notify_level_email = 2, @notify_email_operator_name = N'DBA team';

-- Alert on severity 17 and above, then on a performance condition
EXEC sp_add_alert @name = N'Severity 17', @severity = 17,
     @include_event_description_in = 1;
EXEC sp_add_notification @alert_name = N'Severity 17',
     @operator_name = N'DBA team', @notification_method = 1;
EXEC sp_add_alert @name = N'Log almost full',
     @performance_condition = N'SQLServer:Databases|Percent Log Used|SalesDB|>|90',
     @job_name = N'Back up SalesDB log';
```

| Mécanisme | Se déclenche sur | Détail |
| --- | --- | --- |
| Notification de travail | Le résultat du travail | `@notify_level_email` : 0 = jamais, 1 = en cas de réussite, 2 = en cas d'échec, 3 = à la fin ; peut aussi écrire dans le journal des événements Windows ou supprimer le travail |
| Alerte d'événement SQL Server | Un numéro d'erreur, ou un niveau de gravité, éventuellement filtré par base de données ou texte du message | L'erreur doit être journalisée : SQL Server Agent lit le journal des applications Windows (les gravités 19 à 25 sont toujours journalisées) |
| Alerte de condition de performances | Un compteur de performances qui franchit un seuil | Exemple : pourcentage du journal utilisé supérieur à 90 |
| Alerte d'événement WMI | Un événement WMI | Par exemple des événements DDL ou serveur |

Une alerte peut avertir des opérateurs, **exécuter un travail** en réponse (par exemple une sauvegarde du journal quand celui-ci se remplit), ou les deux. Un **opérateur de prévention de défaillance** (fail-safe operator, propriétés de l'Agent > Système d'alerte) reçoit les notifications d'alerte quand aucun autre opérateur ne peut être joint, par exemple quand aucun n'est de service pour le pager.

Sur Managed Instance, utilisez les notifications de travaux vers les opérateurs ; les alertes n'étant pas prises en charge, réagissez aux conditions du moteur avec des alertes Azure Monitor. Pour SQL Server sur machines virtuelles Azure, les alertes Azure Monitor sur les métriques de la machine virtuelle complètent les alertes de l'Agent.

> **Piège d'examen.** Si Database Mail fonctionne depuis `sp_send_dbmail` mais que les notifications de travaux ne partent pas, le profil de messagerie n'est pas activé dans la page **Système d'alerte** de SQL Server Agent, ou SQL Server Agent n'a pas été redémarré après son activation.

<!-- section: troubleshoot-jobs | objectives: 4.1.3 -->
## Résoudre les problèmes des travaux SQL Server Agent

Commencez par l'historique du travail : **Afficher l'historique** du travail dans SSMS (messages par étape), le **Moniteur d'activité des travaux** ou les vues de `msdb`.

```text
USE msdb;
EXEC sp_help_jobhistory @job_name = N'Weekly index and statistics maintenance', @mode = N'FULL';

SELECT j.name, h.step_id, h.step_name, h.run_status, h.run_date, h.run_time, h.message
FROM dbo.sysjobhistory AS h
JOIN dbo.sysjobs AS j ON h.job_id = j.job_id
WHERE h.run_status = 0
ORDER BY h.instance_id DESC;
```

`run_status` : 0 = échec, 1 = réussite, 2 = nouvelle tentative, 3 = annulé, 4 = en cours. `sysjobactivity` montre les exécutions en cours et précédentes et la prochaine exécution planifiée.

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| Le travail ne démarre jamais | Service Agent arrêté (machine virtuelle), travail ou planification désactivé, pas de `sp_add_jobserver`, date de fin de planification dépassée | Démarrer le service et le passer en automatique ; activer le travail et la planification ; cibler le serveur |
| SSMS affiche un nœud Agent vide | Option serveur `Agent XPs` désactivée | Démarrer SQL Server Agent depuis SSMS (ce qui active automatiquement `Agent XPs`) ou exécuter `sp_configure 'Agent XPs', 1` |
| Échec avec « impossible de déterminer si le propriétaire a accès au serveur » | La connexion du propriétaire du travail a été désactivée ou supprimée (par exemple le compte de domaine d'un employé parti) | `sp_update_job @owner_login_name` vers une connexion valide, comme une connexion de service dédiée |
| Une étape ne peut pas lire ou écrire dans un partage ou un dossier | Le compte de service SQL Server Agent (ou les informations d'identification du proxy) n'a pas les autorisations | Accorder les droits au compte, ou utiliser un proxy avec des informations d'identification qui les ont |
| Une étape CmdExec, PowerShell ou SSIS échoue pour un propriétaire non `sysadmin` | Aucun proxy pour ce sous-système | Créer des informations d'identification et un proxy, accorder le proxy au propriétaire, le sélectionner dans l'étape (pas sur Managed Instance) |
| Historique absent ou très court | Limites du journal d'historique (1 000 lignes au total et 100 par travail par défaut) | Augmenter les limites dans **Propriétés de SQL Server Agent > Historique** ou archiver l'historique |
| Aucun e-mail après un échec | Notification non définie, opérateur absent, profil Database Mail non activé pour l'Agent | Configurer la chaîne de notification (section précédente) |
| Une étape « réussie » n'a rien fait d'utile | Erreurs interceptées par `TRY...CATCH` et non relancées | Relancer avec `THROW` pour que l'étape échoue ; journaliser la sortie de l'étape dans un fichier ou une table |

Modèle de sécurité :

| Élément | Règle |
| --- | --- |
| Rôles de `msdb` | `SQLAgentUserRole` (ses propres travaux), `SQLAgentReaderRole` (+ voir tous les travaux et l'historique), `SQLAgentOperatorRole` (+ exécuter, activer ou désactiver tout travail local) |
| Étapes T-SQL | S'exécutent sous l'identité du propriétaire du travail ; quand le propriétaire est `sysadmin`, elles s'exécutent sous le compte de service SQL Server Agent et peuvent indiquer un utilisateur de base de données sous lequel s'exécuter |
| Autres sous-systèmes | S'exécutent sous le compte de service de l'Agent pour les propriétaires `sysadmin`, sinon via un **proxy** (des informations d'identification mappées à un compte Windows) |

**Sortie des étapes.** Dans la page **Avancé** de l'étape, écrivez la sortie dans un fichier, journalisez-la dans une table ou incluez-la dans l'historique : le message d'erreur complet dépasse souvent ce que conserve la ligne d'historique.

> **Piège d'examen.** Sur Managed Instance, un utilisateur qui n'obtient les autorisations sur les travaux que par un groupe Microsoft Entra ne peut ni créer, ni modifier, ni exécuter de travaux : créez une connexion Microsoft Entra pour cet utilisateur et mappez-la directement.

<!-- section: key-points -->
## Points clés

- SQL Server Agent : SQL Server (Windows, Linux après `mssql-conf set sqlagent.enabled true`) et Managed Instance ; jamais Azure SQL Database (travaux élastiques).
- Managed Instance : Agent toujours actif, étapes T-SQL et SSIS, pas de proxys, pas de CmdExec, pas d'alertes, pas de planification sur processeur inactif, profil Database Mail `AzureManagedInstance_dbmail_profile`.
- Travail = étapes + planifications (réutilisables, attachées avec `sp_attach_schedule`) + `sp_add_jobserver`.
- Chaîne de notification : Database Mail, profil activé dans le système d'alerte de l'Agent, redémarrage de l'Agent, opérateur, notification de travail ou alerte.
- Les alertes se déclenchent sur des numéros d'erreur, des gravités, des conditions de performances ou des événements WMI, et peuvent démarrer un travail.
- Diagnostiquez avec `sp_help_jobhistory` / `sysjobhistory` ; vérifiez le propriétaire, le compte de service, les proxys et les limites de taille de l'historique.
