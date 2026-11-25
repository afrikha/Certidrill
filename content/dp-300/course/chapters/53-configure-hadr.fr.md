Ce chapitre configure les fonctionnalités HA/DR choisies dans la stratégie : géoréplication active et groupes de basculement pour les offres PaaS, groupes de disponibilité, instances de cluster de basculement et copie des journaux de transaction pour SQL Server, plus le lien Managed Instance. Les questions d'examen montrent des commandes à compléter, des étapes à ordonner et des symptômes à diagnostiquer avec les DMV.

<!-- section: active-geo-replication | objectives: 5.3.1 -->
## Configurer la géoréplication active

La géoréplication active (Azure SQL Database uniquement) crée jusqu'à quatre géosecondaires lisibles d'une base, sur d'autres serveurs logiques de la même région ou d'autres régions, par réplication asynchrone. Un secondaire d'un secondaire (chaînage) est possible, mais uniquement par programmation.

Règles qui décident des réponses :

- Le secondaire doit utiliser le **même niveau de service** ; utilisez aussi la même taille de calcul, le même niveau de calcul et la même redondance du stockage de sauvegarde. Augmentez d'abord la taille du secondaire, puis celle du primaire ; pour réduire, faites l'inverse.
- Un secondaire peut être une base unique ou une base d'un pool élastique, mais deux secondaires du même primaire ne peuvent pas partager un pool.
- Après un basculement, le point de terminaison **change** pour le nouveau serveur : les applications ont besoin d'une nouvelle chaîne de connexion (les groupes de basculement évitent cela).
- Utilisez des règles de pare-feu au niveau de la base de données et des utilisateurs de base de données contenus : ils sont répliqués avec la base. Les règles au niveau du serveur et les connexions doivent être recréées sur le serveur secondaire.
- Un secondaire sans charge de travail peut être désigné comme réplica de secours (standby) sans licence : uniquement des bases uniques vCore provisionnées General Purpose ou Business Critical sur du matériel standard-series ou DC-series (ni Hyperscale, ni serverless, ni DTU, ni pools élastiques), un seul réplica de secours par primaire, pas sur un secondaire chaîné. Seuls les exercices de récupération d'urgence, la supervision (DMV) et la maintenance comme `DBCC CHECKDB` y sont autorisés.
- Une base membre d'un groupe de basculement ne peut pas basculer avec la commande de géoréplication : basculez le groupe, ou retirez d'abord la base du groupe.

Portail : base de données > Réplicas > Créer un réplica. Le T-SQL s'exécute dans `master` :

```text
-- On the primary server (master): create a readable secondary
ALTER DATABASE [SalesDb] ADD SECONDARY ON SERVER [srv-sales-dr] WITH (ALLOW_CONNECTIONS = ALL);

-- On the secondary server (master): planned failover, no data loss
ALTER DATABASE [SalesDb] FAILOVER;

-- On the secondary server (master): forced failover when the primary is unavailable
ALTER DATABASE [SalesDb] FORCE_FAILOVER_ALLOW_DATA_LOSS;

-- On the primary database: wait until committed transactions reach the secondary
EXEC sys.sp_wait_for_database_copy_sync @target_server = N'srv-sales-dr', @target_database = N'SalesDb';
```

```bash
az sql db replica create --resource-group rg-data --server srv-sales --name SalesDb \
  --partner-resource-group rg-dr --partner-server srv-sales-dr
az sql db replica set-primary --resource-group rg-dr --server srv-sales-dr --name SalesDb
```

```powershell
New-AzSqlDatabaseSecondary -ResourceGroupName "rg-data" -ServerName "srv-sales" -DatabaseName "SalesDb" `
  -PartnerResourceGroupName "rg-dr" -PartnerServerName "srv-sales-dr" -AllowConnections "All"
Set-AzSqlDatabaseSecondary -ResourceGroupName "rg-dr" -ServerName "srv-sales-dr" -DatabaseName "SalesDb" `
  -PartnerResourceGroupName "rg-data" -Failover
```

> **Piège d'examen.** Les commandes de basculement s'exécutent toujours sur le **secondaire** qui devient primaire. Ajoutez `-AllowDataLoss` (PowerShell), `--allow-data-loss` (CLI) ou `FORCE_FAILOVER_ALLOW_DATA_LOSS` uniquement quand le primaire est inaccessible.

<!-- section: availability-groups | objectives: 5.3.2 -->
## Configurer des groupes de disponibilité sur des machines virtuelles Azure et SQL Managed Instance

**SQL Server sur des machines virtuelles Azure.** Ordre des opérations :

1. Déployez les machines virtuelles dans des zones de disponibilité différentes (ou dans un groupe à haute disponibilité), idéalement chacune dans son **propre sous-réseau** du même réseau virtuel ; une seule carte réseau par machine virtuelle.
2. Créez le cluster de basculement Windows Server et son quorum : un **témoin cloud** dès que possible (Windows Server 2016 ou ultérieur).
3. Activez la fonctionnalité Groupes de disponibilité Always On dans le Gestionnaire de configuration SQL Server et redémarrez le service.
4. Passez les bases en mode de récupération FULL et prenez une sauvegarde complète.
5. Créez le groupe de disponibilité avec des points de terminaison de mise en miroir de bases de données (port 5022 par défaut), en validation synchrone avec basculement automatique entre les réplicas proches, en validation asynchrone pour un réplica distant de récupération d'urgence.
6. Créez l'écouteur, puis testez un basculement.

```text
CREATE AVAILABILITY GROUP [AG1]
WITH (AUTOMATED_BACKUP_PREFERENCE = SECONDARY)
FOR DATABASE [SalesDb]
REPLICA ON
  N'SQLVM1' WITH (ENDPOINT_URL = N'TCP://sqlvm1.contoso.com:5022',
    AVAILABILITY_MODE = SYNCHRONOUS_COMMIT, FAILOVER_MODE = AUTOMATIC, SEEDING_MODE = AUTOMATIC),
  N'SQLVM2' WITH (ENDPOINT_URL = N'TCP://sqlvm2.contoso.com:5022',
    AVAILABILITY_MODE = SYNCHRONOUS_COMMIT, FAILOVER_MODE = AUTOMATIC, SEEDING_MODE = AUTOMATIC);

-- On SQLVM2
ALTER AVAILABILITY GROUP [AG1] JOIN;
ALTER AVAILABILITY GROUP [AG1] GRANT CREATE ANY DATABASE;

-- Multi-subnet listener: one IP address per subnet
ALTER AVAILABILITY GROUP [AG1] ADD LISTENER N'ag1-listener'
  (WITH IP ((N'10.10.1.10', N'255.255.255.0'), (N'10.10.2.10', N'255.255.255.0')), PORT = 1433);
```

| Connectivité | Quand |
| --- | --- |
| Écouteur multisous-réseau | Recommandé : ni équilibreur de charge ni DNN nécessaire, comme en local |
| Écouteur à nom de réseau distribué (DNN) | Un seul sous-réseau ; basculement plus rapide, pas d'équilibreur de charge à gérer. SQL Server 2016 SP3, 2017 CU25 ou 2019 CU8 et ultérieur sur Windows Server 2016 et ultérieur |
| Nom de réseau virtuel (VNN) avec Azure Load Balancer | Un seul sous-réseau, versions plus anciennes ; activez l'IP flottante (Direct Server Return) et un port de sonde d'intégrité |

Les clients définissent `MultiSubnetFailover=True`, même dans un seul sous-réseau. Un groupe de disponibilité de base (édition Standard) a un seul secondaire, non lisible.

**SQL Managed Instance.** Vous ne créez pas de groupes de disponibilité sur une instance managée : Business Critical en exécute déjà un en interne. Le groupe de disponibilité que vous configurez est le **lien Managed Instance**, un groupe de disponibilité distribué entre SQL Server et l'instance :

1. Sur SQL Server : créez une clé principale de base de données dans `master`, activez la fonctionnalité Groupes de disponibilité Always On (seul SQL Server 2016 exige pour cela des étapes supplémentaires de cluster de basculement Windows Server ; SQL Server 2017 et ultérieur non), ajoutez les indicateurs de trace de démarrage recommandés `-T1800` et `-T9567`, utilisez le mode de récupération FULL, prenez une sauvegarde complète, créez un point de terminaison de mise en miroir de bases de données sécurisé par un certificat.
2. Ouvrez la connectivité réseau entre SQL Server et le sous-réseau de l'instance (VPN, ExpressRoute ou peering pour une machine virtuelle Azure).
3. Dans SSMS, lancez l'assistant du lien (Azure SQL Managed Instance link > Replicate database), ou scriptez-le avec Az.Sql ou Azure CLI.
4. Basculez avec l'assistant de basculement de SSMS ou, à partir de SQL Server 2022 CU13, en T-SQL.

<!-- section: failover-groups | objectives: 5.3.3 -->
## Configurer des groupes de basculement

Un groupe de basculement réplique un ensemble de bases vers un serveur secondaire d'une autre région et les bascule ensemble, derrière des écouteurs qui ne changent pas :

| Offre | Écouteur en lecture-écriture | Écouteur en lecture seule |
| --- | --- | --- |
| SQL Database | `<fog-name>.database.windows.net` | `<fog-name>.secondary.database.windows.net` |
| SQL Managed Instance | `<fog-name>.<zone_id>.database.windows.net` | `<fog-name>.secondary.<zone_id>.database.windows.net` |

| Paramètre | SQL Database | SQL Managed Instance |
| --- | --- | --- |
| Bases | Bases ou pools élastiques choisis ; plusieurs groupes par serveur | Toutes les bases utilisateur (ni `master` ni `msdb`) ; un seul groupe par instance |
| Secondaire | Un serveur d'une autre région, dans le même locataire Microsoft Entra (jusqu'à quatre serveurs secondaires par groupe en préversion ; l'écouteur en lecture seule pointe alors vers l'un d'eux) | Une instance d'une autre région qui partage la **zone DNS** du primaire (définie à la création), même configuration, réseaux reliés par peering mondial (recommandé), VPN ou ExpressRoute |
| Amorçage | Jusqu'à 500 Go par heure | Jusqu'à 360 Go par heure |

Stratégie de basculement : **gérée par le client** (`Manual`, recommandée) ou gérée par Microsoft (`Automatic`, avec une période de grâce d'au moins 1 heure avant un basculement forcé avec perte de données possible). Le basculement de l'écouteur en lecture seule est désactivé par défaut.

```bash
az sql failover-group create --name fog-sales --resource-group rg-data --server srv-sales \
  --partner-server srv-sales-dr --add-db SalesDb OrdersDb --failover-policy Manual
# Planned failover: run against the secondary server
az sql failover-group set-primary --name fog-sales --resource-group rg-data --server srv-sales-dr
```

```powershell
New-AzSqlDatabaseFailoverGroup -ResourceGroupName "rg-data" -ServerName "srv-sales" `
  -PartnerServerName "srv-sales-dr" -FailoverGroupName "fog-sales" -FailoverPolicy Manual
Switch-AzSqlDatabaseFailoverGroup -ResourceGroupName "rg-data" -ServerName "srv-sales-dr" -FailoverGroupName "fog-sales"
```

SQL Server Contributor dispose des autorisations pour créer des groupes de basculement et les faire basculer. Préparez le secondaire : connexions de serveur correspondantes (mêmes SID) et règles de pare-feu pour SQL Database ; connexions et travaux SQL Server Agent recréés sur l'instance secondaire pour SQL Managed Instance.

> **Piège d'examen.** Un groupe de basculement SQL Managed Instance ne peut pas basculer un sous-ensemble de bases, et ses écouteurs ne sont pas accessibles par le point de terminaison public. Pour qu'une base bascule seule, elle doit être dans son propre groupe de basculement SQL Database ou utiliser la géoréplication.

<!-- section: failover-cluster-instances | objectives: 5.3.4 -->
## Configurer des instances de cluster de basculement sur des machines virtuelles Azure

Une instance de cluster de basculement (FCI) protège toute l'instance SQL Server (connexions, travaux, toutes les bases) sur un stockage partagé ; un seul nœud possède l'instance à un instant donné.

| Stockage partagé | Quand l'utiliser | Limites |
| --- | --- | --- |
| Disques partagés Azure (Premium SSD, Premium SSD v2, Ultra Disk) | Choix par défaut ; FILESTREAM et MSDTC pris en charge | Mise en cache Premium SSD non prise en charge ; Premium SSD ZRS pour les zones de disponibilité ; Ultra Disk dans une seule zone |
| Partages de fichiers Premium (SMB) | SQL Server 2012 et ultérieur, groupes à haute disponibilité ou zones | Ni FILESTREAM ni MSDTC |
| Espaces de stockage direct (Storage Spaces Direct) | SAN virtuel logiciel, SQL Server 2016 et ultérieur | Groupes à haute disponibilité uniquement, stockage payé sur chaque nœud, pas de MSDTC |
| Azure Elastic SAN (iSCSI) | SQL Server 2022, zones de disponibilité | Pas de témoin cloud, ni FILESTREAM ni MSDTC |

Étapes : préparez les machines virtuelles (un sous-réseau par machine virtuelle recommandé), attachez le stockage partagé, créez le cluster et son quorum (un **témoin de disque** est préférable avec les disques partagés), installez SQL Server en FCI sur le premier nœud et ajoutez les autres nœuds, puis configurez la connectivité (multisous-réseau, DNN ou VNN avec un équilibreur de charge). Une FCI inscrite auprès de l'extension SQL IaaS Agent ne prend en charge ni la sauvegarde automatisée, ni la mise à jour corrective, ni l'authentification Microsoft Entra.

> **Conseil d'examen.** « Protéger les objets de niveau instance sans les synchroniser » désigne une FCI ; « secondaire lisible » ou « une copie des données dans une autre région » désigne un groupe de disponibilité, car une FCI n'a qu'une seule copie des données.

<!-- section: log-shipping | objectives: 5.3.5 -->
## Configurer la copie des journaux de transaction

La copie des journaux de transaction (log shipping) est une fonctionnalité de SQL Server (sur des machines virtuelles Azure et en local) qui envoie les sauvegardes de journal d'une base primaire vers un ou plusieurs secondaires. SQL Server Agent exécute quatre travaux :

| Travail | Serveur | Rôle |
| --- | --- | --- |
| Sauvegarde | Primaire | Sauvegarde le journal vers un partage (ou un chemin) |
| Copie | Secondaire | Copie les fichiers de sauvegarde vers le secondaire |
| Restauration | Secondaire | Les restaure `WITH NORECOVERY`, ou `WITH STANDBY` pour un accès en lecture entre les restaurations |
| Alerte | Serveur moniteur (facultatif) ou chaque serveur | Déclenche une alerte quand un seuil de sauvegarde ou de restauration est dépassé |

Prérequis : mode de récupération FULL ou BULK_LOGGED, une sauvegarde complète initiale restaurée sur le secondaire avec `NORECOVERY`, un partage accessible par les comptes SQL Server Agent. Dans SSMS : base de données > Propriétés > Copie des journaux de transaction > activer comme base primaire, planifier la sauvegarde, ajouter les secondaires et un moniteur facultatif. Le basculement est manuel : sauvegardez la fin du journal, restaurez les sauvegardes restantes, récupérez le secondaire avec `RESTORE DATABASE SalesDb WITH RECOVERY`, puis redirigez les applications.

> **Piège d'examen.** En mode `STANDBY`, les utilisateurs sont déconnectés pendant la restauration de chaque sauvegarde de journal ; le RPO est l'intervalle de sauvegarde plus celui de copie plus celui de restauration. La copie des journaux de transaction n'a ni basculement automatique ni écouteur.

<!-- section: monitor-hadr | objectives: 5.3.6 -->
## Monitorer une solution HA/DR

| Solution | Où regarder |
| --- | --- |
| Géoréplication active | `sys.dm_geo_replication_link_status` sur la base primaire (`replication_state_desc`, `replication_lag_sec`, `last_replication`) ; `sys.geo_replication_links` dans `master` |
| Groupe de basculement | État dans le portail (Seeding, Synchronizing, Failover in progress) ; les mêmes DMV par base ; les basculements initiés par Microsoft apparaissent dans le journal d'activité |
| Groupe de disponibilité, lien Managed Instance | Tableau de bord des groupes de disponibilité dans SSMS ; `sys.dm_hadr_database_replica_states` (`synchronization_state_desc`, `log_send_queue_size`, `redo_queue_size`) ; `sys.dm_hadr_availability_replica_states` ; la session d'événements étendus `AlwaysOn_health` |
| Instance de cluster de basculement | Gestionnaire du cluster de basculement, journal du cluster, événements Windows |
| Copie des journaux de transaction | Rapport État de la copie des journaux de transaction dans SSMS ; `msdb.dbo.log_shipping_monitor_primary` et `log_shipping_monitor_secondary` ; historique des travaux Agent |
| Événements de la plateforme | Journal d'activité Azure Monitor et Resource Health |

```text
-- Geo-replication lag, on the primary database
SELECT partner_server, partner_database, replication_state_desc, replication_lag_sec, last_replication
FROM sys.dm_geo_replication_link_status;

-- Availability group data loss and recovery exposure, on the primary replica
SELECT DB_NAME(database_id) AS db, synchronization_state_desc,
       log_send_queue_size, log_send_rate, redo_queue_size, redo_rate
FROM sys.dm_hadr_database_replica_states;
```

Un `log_send_queue_size` qui grossit signifie plus de pertes de données possibles (RPO) ; un `redo_queue_size` qui grossit signifie un basculement plus long (RTO).

<!-- section: troubleshoot-hadr | objectives: 5.3.7 -->
## Résoudre les problèmes d'une solution HA/DR

| Symptôme | Cause | Correction |
| --- | --- | --- |
| Les connexions échouent après un géobasculement | Connexions de serveur absentes sur le nouveau primaire, ou créées avec des SID différents | Créez les connexions avec le même SID, ou utilisez des utilisateurs de base de données contenus |
| Clients refusés après le basculement alors que la base est en ligne | Les règles de pare-feu au niveau du serveur ne sont pas répliquées | Utilisez des règles de pare-feu au niveau de la base de données ou définissez les mêmes règles de serveur sur les deux serveurs |
| Les applications se connectent toujours à l'ancien primaire | La chaîne de connexion utilise le nom du serveur | Utilisez l'écouteur du groupe de basculement ou celui du groupe de disponibilité avec `MultiSubnetFailover=True` |
| Le cluster exclut des nœuds (événement 1135), bail expiré (erreurs 19407, 19419) | Seuils de surveillance trop agressifs pour Azure | Surveillance assouplie : SameSubnetThreshold et CrossSubnetThreshold à 40, délai de bail de 40 secondes, délai de vérification d'intégrité de 60 secondes, délai d'expiration de session de 20 secondes, niveau de condition d'échec (Failure-Condition Level) à 2 |
| Le groupe de disponibilité ne bascule plus après plusieurs basculements | Nombre maximal d'échecs dans la période spécifiée (Maximum failures in the specified period) atteint (2 par défaut) | Augmentez-le (valeur assouplie : 6) dans les propriétés de basculement du rôle en cluster |
| Écouteur VNN inaccessible | Équilibreur de charge sans IP flottante, ou port de sonde bloqué | Activez Direct Server Return et ouvrez le port de sonde ; ou passez au DNN ou au multisous-réseau |
| Le journal des transactions du primaire ne cesse de grossir | Un réplica secondaire est déconnecté ou suspendu : le journal ne peut pas être tronqué | Rétablissez la connexion, puis `ALTER DATABASE [SalesDb] SET HADR RESUME;` sur le secondaire, ou retirez le réplica |
| Le retard de réplication augmente | Secondaire sous-dimensionné, ou pic d'écritures | Dimensionnez le secondaire comme le primaire (augmentez-le en premier) |
| Groupe de basculement d'instance managée bloqué en amorçage | Pas de connectivité entre les deux sous-réseaux | Corrigez le peering mondial ou le VPN, et les règles NSG entre les sous-réseaux |

> **Conseil d'examen.** La surveillance assouplie masque les problèmes ; utilisez-la pour réduire les faux basculements dans Azure, pas comme correctif d'un réseau défaillant.

<!-- section: key-points -->
## Points clés

- Géoréplication active : jusqu'à quatre secondaires lisibles par base SQL Database, même niveau de service, point de terminaison qui change au basculement ; les commandes s'exécutent sur le secondaire.
- Groupes de basculement : des écouteurs qui ne changent pas ; SQL Database regroupe les bases choisies, SQL Managed Instance toutes les bases utilisateur, un seul groupe par instance et une zone DNS partagée.
- Groupes de disponibilité sur machines virtuelles : cluster plus témoin cloud, synchrone à proximité et asynchrone à distance, écouteur multisous-réseau ou DNN ; sur SQL Managed Instance, le lien Managed Instance.
- FCI : stockage partagé (disques partagés Azure de préférence, témoin de disque), une seule copie des données, protection au niveau de l'instance.
- Copie des journaux de transaction : travaux de sauvegarde, de copie, de restauration et d'alerte ; `NORECOVERY` ou `STANDBY` ; basculement manuel.
- Surveillez le retard avec `sys.dm_geo_replication_link_status` et `sys.dm_hadr_database_replica_states` ; recréez les connexions, les règles de pare-feu et les travaux sur le secondaire.
