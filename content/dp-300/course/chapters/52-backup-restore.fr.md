Qui prend les sauvegardes dépend de l'offre : Azure les prend pour Azure SQL Database et SQL Managed Instance, tandis que sur SQL Server sur des machines virtuelles Azure vous choisissez entre un service géré par Azure et vos propres travaux T-SQL. Les questions d'examen testent les limites de rétention, l'option de restauration qui répond à une exigence et la syntaxe exacte de `BACKUP` et `RESTORE`, y compris les sauvegardes vers le Stockage Blob Azure.

<!-- section: backup-strategy | objectives: 5.2.1 -->
## Choisir une stratégie de sauvegarde

**Azure SQL Database et SQL Managed Instance : sauvegardes automatisées.**

| Paramètre | Valeur |
| --- | --- |
| Planification | Complète chaque semaine, différentielle toutes les 12 heures (par défaut en vCore) ou 24 heures (par défaut en DTU), journal des transactions environ toutes les 10 minutes |
| Rétention de la restauration à un point dans le temps (PITR) | 1 à 35 jours, 7 par défaut ; Basic : 1 à 7 jours |
| Redondance du stockage de sauvegarde | LRS, ZRS, GRS ou GZRS ; géoredondant par défaut. Un changement ne s'applique qu'aux sauvegardes futures ; pour Hyperscale, il ne se définit qu'à la création |
| Rétention à long terme (LTR) | Sauvegardes complètes hebdomadaires, mensuelles et annuelles conservées jusqu'à 10 ans |
| Coût | Le stockage de sauvegarde n'est pas facturé jusqu'à la taille maximale des données de la base |

Hyperscale prend des instantanés de stockage au lieu de sauvegardes complètes, différentielles et de journal : la sauvegarde et la restauration sont rapides quelle que soit la taille.

> **Piège d'examen.** La géorestauration exige un stockage de sauvegarde **géoredondant** (GRS ou GZRS). Une base passée en LRS ou ZRS pour la résidence des données perd la géorestauration.

**SQL Server sur des machines virtuelles Azure : trois options.**

| Exigence | Option |
| --- | --- |
| Tableau de bord central, stratégies, rétention de plusieurs mois ou années, préférence de sauvegarde du groupe de disponibilité respectée, alertes par e-mail en cas d'échec | Sauvegarde Azure pour SQL Server dans des machines virtuelles Azure (coffre Recovery Services, sauvegardes de journal jusqu'à toutes les 15 minutes, restauration à un point dans le temps depuis le portail) |
| Simple, par machine virtuelle, vers un compte de stockage, gérée par l'extension SQL IaaS Agent | Automated Backup : rétention de 1 à 90 jours, sauvegardes de journal toutes les 5 à 60 minutes, chiffrement et bases système facultatifs ; les bases utilisateur doivent utiliser le mode de récupération complète |
| Contrôle total (planifications personnalisées, outil tiers, sauvegarde vers une URL depuis vos propres travaux) | Instructions `BACKUP` manuelles dans des travaux SQL Server Agent ou des plans de maintenance |

Automated Backup et Sauvegarde Azure s'excluent mutuellement sur une machine virtuelle.

Les **modes de récupération** déterminent ce que vous pouvez sauvegarder et restaurer sur SQL Server :

| Mode | Sauvegardes de journal | Restauration à un point dans le temps |
| --- | --- | --- |
| FULL | Oui | Oui |
| BULK_LOGGED | Oui | Pas à l'intérieur d'une sauvegarde de journal qui contient des opérations journalisées de façon minimale |
| SIMPLE | Non | Non : seulement jusqu'à la dernière sauvegarde complète ou différentielle |

Le RPO d'une stratégie SQL Server est l'intervalle des sauvegardes de journal ; le RTO est le temps de restaurer la sauvegarde complète, la dernière différentielle et toutes les sauvegardes de journal qui suivent.

<!-- section: native-backup | objectives: 5.2.2, 5.2.6 -->
## Sauvegarder avec les outils natifs et T-SQL

Les outils natifs sont SQL Server Management Studio (Tâches > Sauvegarder), les plans de maintenance, les travaux SQL Server Agent et T-SQL :

```text
-- Full, differential and log backups with integrity checks and compression
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_full.bak'
    WITH CHECKSUM, COMPRESSION, STATS = 10;
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_diff.bak'
    WITH DIFFERENTIAL, CHECKSUM, COMPRESSION;
BACKUP LOG SalesDb TO DISK = N'F:\Backup\SalesDb_log_1015.trn'
    WITH CHECKSUM, COMPRESSION;

-- Ad hoc full backup that doesn't reset the differential base
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_copy.bak' WITH COPY_ONLY;

-- Encrypted backup (certificate in master, back it up with its private key)
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_enc.bak'
    WITH COMPRESSION, ENCRYPTION (ALGORITHM = AES_256, SERVER CERTIFICATE = BackupCert);

-- Tail-log backup before restoring a damaged database
BACKUP LOG SalesDb TO DISK = N'F:\Backup\SalesDb_tail.trn' WITH NO_TRUNCATE, NORECOVERY;
```

| Option | Usage |
| --- | --- |
| `COPY_ONLY` | Une sauvegarde complète hors planification (pour rafraîchir une copie de test) sans changer la base de la prochaine différentielle |
| `CHECKSUM` | Vérifie les sommes de contrôle des pages à la lecture et écrit une somme de contrôle de la sauvegarde |
| `COMPRESSION` | Sauvegardes plus petites et généralement plus rapides |
| `ENCRYPTION` | Chiffre le fichier de sauvegarde avec un certificat ou une clé asymétrique ; sans ce certificat, la sauvegarde ne peut pas être restaurée |
| `NORECOVERY` (sauvegarde de journal) | Prend la fin du journal et laisse la base dans l'état RESTORING |

> **Piège d'examen.** Sur Azure SQL Database, vous ne pouvez pas exécuter `BACKUP` du tout. Sur SQL Managed Instance, une sauvegarde utilisateur doit être `COPY_ONLY` et `TO URL`, et elle échoue sur une base chiffrée par un TDE **géré par le service** : utilisez un TDE géré par le client (ou désactivez TDE) pour en prendre une.

<!-- section: native-restore | objectives: 5.2.3, 5.2.6 -->
## Restaurer avec les outils natifs et T-SQL

Une séquence de restauration applique la sauvegarde complète, la différentielle la plus récente, puis chaque sauvegarde de journal dans l'ordre. Chaque étape sauf la dernière utilise `NORECOVERY` :

```text
-- Inspect a backup file before restoring
RESTORE HEADERONLY FROM DISK = N'F:\Backup\SalesDb_full.bak';
RESTORE FILELISTONLY FROM DISK = N'F:\Backup\SalesDb_full.bak';
RESTORE VERIFYONLY FROM DISK = N'F:\Backup\SalesDb_full.bak' WITH CHECKSUM;

-- Restore under a new name, moving the files
RESTORE DATABASE SalesDb_Test FROM DISK = N'F:\Backup\SalesDb_full.bak'
    WITH MOVE N'SalesDb' TO N'G:\Data\SalesDb_Test.mdf',
         MOVE N'SalesDb_log' TO N'H:\Log\SalesDb_Test.ldf',
         NORECOVERY;
RESTORE DATABASE SalesDb_Test FROM DISK = N'F:\Backup\SalesDb_diff.bak' WITH NORECOVERY;
RESTORE LOG SalesDb_Test FROM DISK = N'F:\Backup\SalesDb_log_1015.trn' WITH NORECOVERY;
RESTORE DATABASE SalesDb_Test WITH RECOVERY;
```

| Option | Effet |
| --- | --- |
| `NORECOVERY` | Laisse la base en cours de restauration, prête pour la sauvegarde suivante |
| `RECOVERY` | Annule les transactions non validées et met la base en ligne ; aucune autre sauvegarde ne peut être appliquée |
| `STANDBY = 'file'` | Lecture seule entre les restaurations de journal (utilisé par la copie des journaux de transaction) |
| `REPLACE` | Remplace une base existante par une autre, en ignorant le contrôle de sécurité |
| `MOVE` | Déplace les fichiers de données et de journal (autres lettres de lecteur sur la machine virtuelle cible) |

Dans SSMS, Bases de données > Restaurer la base de données construit la même séquence à partir de l'historique des sauvegardes et propose une sauvegarde de la fin du journal. Sur SQL Managed Instance, `RESTORE DATABASE ... FROM URL` restaure une sauvegarde complète sans aucune option `WITH` (ni `MOVE`, ni `REPLACE`, ni `NORECOVERY`, ni `STATS`) ; la restauration s'exécute de façon asynchrone et se suit dans `sys.dm_operation_status`.

> **Conseil d'examen.** « La base doit être lisible entre les restaurations » = `STANDBY`. « Appliquer d'autres sauvegardes de journal plus tard » = `NORECOVERY`. Oublier le `WITH RECOVERY` final laisse la base dans l'état RESTORING.

<!-- section: point-in-time | objectives: 5.2.4 -->
## Restaurer à un point dans le temps

**SQL Server (machine virtuelle ou local) :** restaurez les sauvegardes complète et différentielle avec `NORECOVERY`, puis les sauvegardes de journal avec `STOPAT` :

```text
RESTORE DATABASE SalesDb FROM DISK = N'F:\Backup\SalesDb_full.bak' WITH NORECOVERY, REPLACE;
RESTORE LOG SalesDb FROM DISK = N'F:\Backup\SalesDb_log_1015.trn' WITH NORECOVERY;
RESTORE LOG SalesDb FROM DISK = N'F:\Backup\SalesDb_log_1030.trn'
    WITH STOPAT = N'2026-11-10T10:24:00', RECOVERY;
```

`STOPATMARK` s'arrête à une transaction nommée (`BEGIN TRANSACTION Release42 WITH MARK`). La restauration à un point dans le temps exige le mode de récupération FULL et une chaîne de journaux ininterrompue.

**Azure SQL Database et SQL Managed Instance :** PITR depuis le portail (base de données > Restaurer), Azure CLI, PowerShell ou REST, jamais en T-SQL. Elle crée toujours une **nouvelle** base ; vous ne pouvez pas remplacer une base existante. Dans SQL Database, la PITR ne s'exécute que sur une base primaire, jamais sur une base géosecondaire, et une restauration entre Hyperscale et les autres niveaux de service n'est pas prise en charge.

```bash
az sql db restore --resource-group rg-data --server srv-sales --name SalesDb \
  --dest-name SalesDb_1024 --time "2026-11-10T10:24:00"
```

```powershell
Restore-AzSqlDatabase -FromPointInTimeBackup -PointInTime "2026-11-10T10:24:00" `
  -ResourceGroupName "rg-data" -ServerName "srv-sales" -TargetDatabaseName "SalesDb_1024" `
  -ResourceId (Get-AzSqlDatabase -ResourceGroupName "rg-data" -ServerName "srv-sales" -DatabaseName "SalesDb").ResourceId
```

| Exigence | Option de restauration (Azure SQL Database) |
| --- | --- |
| Annuler une erreur commise il y a 2 heures | PITR vers une nouvelle base sur le **même serveur**, puis recopier les lignes ou échanger les noms |
| Base supprimée hier | Restauration d'une base supprimée (portail : serveur > Bases de données supprimées ; `Restore-AzSqlDatabase -FromDeletedDatabaseBackup`), même serveur |
| Région indisponible | Géorestauration vers n'importe quel serveur de n'importe quelle région (`Restore-AzSqlDatabase -FromGeoBackup`) |
| Sauvegarde plus ancienne que la rétention PITR | Restauration à partir d'une sauvegarde LTR |

Pour remplacer l'original, restaurez avec le même niveau de service et la même taille de calcul, puis renommez les bases avec `ALTER DATABASE SalesDb MODIFY NAME = SalesDb_old`. La restauration exige Contributor ou SQL Server Contributor sur l'étendue du serveur.

> **Piège d'examen.** La PITR de SQL Database est limitée au **même serveur** : la PITR entre serveurs, entre abonnements et entre régions n'est pas prise en charge. Un **serveur** supprimé emporte ses sauvegardes PITR ; seules les sauvegardes LTR survivent.

<!-- section: long-term-retention | objectives: 5.2.5 -->
## Configurer la rétention des sauvegardes à long terme

Une stratégie LTR copie des sauvegardes complètes automatisées vers un stockage distinct, avec quatre paramètres : rétention hebdomadaire (W), rétention mensuelle (M, la première sauvegarde de chaque mois), rétention annuelle (Y) et la semaine de l'année (WeekOfYear) dont la sauvegarde est gardée comme sauvegarde annuelle. Les durées suivent la norme ISO 8601 : `P12W`, `P12M`, `P5Y`.

| Exigence | Stratégie |
| --- | --- |
| Garder chaque sauvegarde hebdomadaire 12 semaines | W = `P12W` |
| Garder une sauvegarde par mois pendant un an | M = `P12M` |
| Garder la sauvegarde de la semaine 16 pendant 7 ans | Y = `P7Y`, WeekOfYear = 16 |

```bash
az sql db ltr-policy set --resource-group rg-data --server srv-sales --name SalesDb \
  --weekly-retention "P12W" --monthly-retention "P12M" --yearly-retention "P7Y" --week-of-year 16
```

```powershell
Set-AzSqlDatabaseBackupLongTermRetentionPolicy -ResourceGroupName "rg-data" -ServerName "srv-sales" `
  -DatabaseName "SalesDb" -WeeklyRetention P12W -MonthlyRetention P12M -YearlyRetention P7Y -WeekOfYear 16
```

Règles : vous ne pouvez ni déclencher une sauvegarde LTR ni choisir son heure ; la première peut mettre jusqu'à 7 jours à apparaître (la sauvegarde complète PITR la plus récente est copiée à la première activation de la stratégie). La LTR existe pour SQL Database, y compris Hyperscale, et pour SQL Managed Instance. Une restauration crée une nouvelle base sur n'importe quel serveur ou instance **du même abonnement** (`az sql db ltr-backup restore`, `Restore-AzSqlDatabase -FromLongTermRetentionBackup`). Avec la géoréplication ou les groupes de basculement, configurez la même stratégie sur le secondaire : elle ne prend effet que lorsque cette base devient primaire. SQL Server Contributor peut restaurer les sauvegardes LTR mais pas les supprimer. Les sauvegardes LTR peuvent être rendues immuables (en préversion pour SQL Managed Instance) ; des sauvegardes LTR immuables bloquent aussi la suppression du serveur logique.

> **Conseil d'examen.** « Conserver les sauvegardes 7 ans pour la conformité » = LTR, jamais une rétention PITR (35 jours au maximum). Sur les machines virtuelles SQL Server, l'équivalent est la stratégie de rétention de Sauvegarde Azure.

<!-- section: cloud-storage | objectives: 5.2.7 -->
## Sauvegarder vers le stockage cloud et restaurer à partir de celui-ci

SQL Server sauvegarde directement vers le Stockage Blob Azure avec `BACKUP ... TO URL`. Les informations d'identification déterminent le type d'objet blob :

| Informations d'identification | Type d'objet blob | Limites |
| --- | --- | --- |
| Signature d'accès partagé (recommandée), informations d'identification nommées d'après l'URL du conteneur | Objet blob de blocs | Environ 195 Go par objet blob (50 000 blocs de 4 Mo) ; répartition sur jusqu'à 64 URL, environ 12,8 To |
| Clé d'accès du compte de stockage, informations d'identification de nom quelconque, `WITH CREDENTIAL` | Objet blob de pages | 1 To, sans répartition |

```text
CREATE CREDENTIAL [https://stcontosobackup.blob.core.windows.net/sql]
    WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = '<SAS token without the leading ?>';

BACKUP DATABASE SalesDb
TO URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_1.bak',
   URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_2.bak'
WITH COMPRESSION, CHECKSUM, MAXTRANSFERSIZE = 4194304, BLOCKSIZE = 65536, FORMAT;

RESTORE DATABASE SalesDb
FROM URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_1.bak',
     URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_2.bak'
WITH RECOVERY;
```

Règles à retenir :

- L'ajout à un objet blob existant n'est pas pris en charge ; remplacez-le avec `WITH FORMAT`. `INIT`, `SKIP`, `RETAINDAYS` et les options de bande ne sont pas pris en charge.
- La sauvegarde vers une URL en HTTP et vers un stockage premium n'est pas prise en charge.
- Utilisez `MAXTRANSFERSIZE = 4194304` et `BLOCKSIZE = 65536` pour les grosses sauvegardes, et répartissez-les pour rester sous la limite de blocs.
- À partir de SQL Server 2025, la sauvegarde vers une URL peut s'authentifier avec une identité managée (préversion, SQL Server activé par Azure Arc).
- Le stockage immuable est pris en charge à partir de SQL Server 2025, avec l'immuabilité au niveau du conteneur uniquement (pas au niveau de la version) ; sur un conteneur immuable, `WITH FORMAT` échoue si une sauvegarde du même nom existe déjà.

Sur **SQL Managed Instance**, les informations d'identification utilisent une SAS ou l'identité managée de l'instance (les clés d'accès ne sont pas prises en charge), une sauvegarde peut utiliser jusqu'à 32 bandes de 195 Go au plus chacune (assez pour des bases jusqu'à 4 To avec la compression de sauvegarde), et seul `BACKUP ... TO URL WITH COPY_ONLY` est autorisé. La restauration native depuis une URL est la façon d'amener un `.bak` de SQL Server dans une instance managée, et une sauvegarde en copie seule prise sur une instance managée se restaure sur SQL Server selon la stratégie de mise à jour de l'instance : stratégie SQL Server 2022 vers SQL Server 2022, stratégie SQL Server 2025 (la valeur par défaut des nouvelles instances déployées depuis le portail) vers SQL Server 2025, Always-up-to-date vers aucune version de SQL Server.

> **Piège d'examen.** Restaurer une sauvegarde SQL Server dans SQL Managed Instance utilise `RESTORE ... FROM URL`, pas `FROM DISK` : chargez d'abord le `.bak` dans le Stockage Blob. Dans Azure SQL Database, un `.bak` ne peut pas être restauré du tout ; utilisez un BACPAC ou un outil de migration.

<!-- section: key-points -->
## Points clés

- Les sauvegardes PaaS sont automatiques : complète hebdomadaire, différentielle toutes les 12 ou 24 heures, journal environ toutes les 10 minutes ; PITR de 1 à 35 jours (7 par défaut, 7 au maximum en Basic) ; LTR jusqu'à 10 ans.
- Toute restauration PaaS crée une nouvelle base ; la PITR reste sur le même serveur ; la géorestauration exige un stockage de sauvegarde géoredondant ; la LTR restaure au sein de l'abonnement.
- Machines virtuelles SQL Server : Sauvegarde Azure pour la gestion centralisée et la longue rétention, Automated Backup pour des sauvegardes simples par machine virtuelle, T-SQL pour le contrôle total.
- Chaîne de restauration : complète, dernière différentielle, journaux, chacune en `NORECOVERY` sauf la dernière ; `STOPAT` pour un point dans le temps ; `STANDBY` pour lire entre les restaurations.
- Sauvegarde vers une URL : une SAS donne des objets blob de blocs et une répartition sur jusqu'à 64 URL ; une clé d'accès donne un seul objet blob de pages de 1 To au plus.
- Sauvegardes utilisateur sur SQL Managed Instance : `COPY_ONLY`, `TO URL`, impossible avec un TDE géré par le service ; restaurations `FROM URL` sans options `WITH`.
