Une question de migration donne une source (version de SQL Server, taille, fonctionnalités utilisées), une cible et un budget de temps d'arrêt, puis demande l'outil, l'ordre des étapes ou la cause d'un échec. Le budget de temps d'arrêt départage en général une méthode hors connexion (fichiers de sauvegarde, BACPAC) et une méthode en ligne (réplication continue avec un court basculement).

<!-- section: migration-requirements | objectives: 1.3.1 -->
## Évaluer les exigences

Rassemblez ces informations avant de choisir une cible et une méthode :

| Exigence | Pourquoi elle compte |
| --- | --- |
| Version, édition et système d'exploitation de la source | Le lien Managed Instance exige SQL Server 2016 ou ultérieur ; la migration via Azure Arc exige SQL Server 2014 ou ultérieur |
| Taille de la base et volume de modifications | Détermine la durée d'une copie complète et la nécessité d'un rattrapage du journal |
| Temps d'arrêt autorisé | Quelques minutes : méthode en ligne ; quelques heures : sauvegarde et restauration ou BACPAC |
| Dépendances au niveau de l'instance | Travaux SQL Server Agent, requêtes entre bases, CLR, serveurs liés, Database Mail orientent vers Managed Instance |
| Non pris en charge en PaaS | FILESTREAM et FileTable, PolyBase, transactions entre instances, accès au système orientent vers une machine virtuelle |
| Réseau | Bande passante vers Azure, VPN ou ExpressRoute pour des cibles privées, ports à ouvrir |
| Sécurité | Connexions Windows (utilisez Microsoft Entra ID dans Azure SQL Database), certificats TDE, clés |

Outils d'évaluation :

| Outil | Fournit |
| --- | --- |
| Azure Migrate | Découverte et évaluation du parc SQL à grande échelle, recommandations de cibles Azure SQL, dimensionnement et estimations de coût mensuel |
| Évaluation de migration de SQL Server activé par Azure Arc | Préparation, risques et atténuations, cible et niveau de service recommandés, estimations de prix ; exécutée chaque semaine par défaut, gratuite pour toutes les éditions |
| Référence de performances (compteurs Perfmon collectés avec Logman) | Données de processeur, de mémoire et d'E/S pour dimensionner la cible |

Éléments qu'une migration au niveau de la base ne transporte pas et que vous devez prévoir : les **connexions**, les **travaux SQL Server Agent**, les autres objets de niveau serveur (serveurs liés, informations d'identification, audits de serveur) et les chaînes de connexion des applications.

<!-- section: online-offline | objectives: 1.3.2 -->
## En ligne ou hors connexion

**Hors connexion** : l'application s'arrête pendant toute la copie des données. **En ligne** : les données sont copiées pendant que la source reste utilisée, les modifications sont répliquées, et l'application ne s'arrête que pour un court **basculement** (cutover).

| Méthode | Mode | Cibles |
| --- | --- | --- |
| Lien Managed Instance (groupe de disponibilité distribué) | En ligne, le moins de temps d'arrêt ; cible lisible pendant la réplication | Managed Instance |
| Log Replay Service, mode continu | Quasi en ligne : sauvegardes complètes, différentielles et de journal restaurées en continu ; cible en état de restauration jusqu'au basculement | Managed Instance |
| Azure Database Migration Service | En ligne ou hors connexion vers Managed Instance et SQL Server sur les machines virtuelles Azure ; hors connexion vers Azure SQL Database | Les trois |
| Migration de bases depuis SQL Server activé par Azure Arc | Pilotée depuis le portail Azure (lien Managed Instance ou LRS) ; cible Azure SQL Database en préversion | Managed Instance, machines virtuelles, SQL Database |
| Réplication transactionnelle | En ligne ; complexe à configurer | SQL Database (comme abonné), Managed Instance |
| Sauvegarde et restauration natives (`BACKUP ... TO URL`, `RESTORE ... FROM URL`) | Hors connexion : le temps d'arrêt couvre une sauvegarde et une restauration complètes | Managed Instance, machines virtuelles |
| BACPAC (SqlPackage, Import/Export) | Hors connexion : exportation à la source, importation à la cible | SQL Database, Managed Instance |
| bcp, Azure Data Factory | Copie de données hors connexion ; schéma créé séparément | Toutes |

> **Piège d'examen.** Azure SQL Database n'a pas de `RESTORE` natif d'un fichier `.bak`. Pour l'atteindre, utilisez Database Migration Service (hors connexion), un BACPAC ou la réplication transactionnelle pour un temps d'arrêt minimal.

<!-- section: online-migration | objectives: 1.3.3 -->
## Implémenter une migration en ligne

Le **lien Managed Instance** réplique une base par lien, quasiment en temps réel, depuis SQL Server 2016 ou ultérieur (Enterprise, Developer ou Standard). Pendant la réplication, la base sur l'instance managée est en **lecture seule**, ce qui permet aussi des tests et du reporting avant le basculement. Prérequis sur SQL Server : la fonctionnalité des groupes de disponibilité Always On activée (un redémarrage du service est nécessaire) et le mode de lien multibase activé ; une clé principale de base de données dans `master`, qui protège les certificats de l'approbation entre les deux côtés ; un point de terminaison de mise en miroir de bases de données (port 5022 par défaut) ; chaque base répliquée en mode de récupération complète avec au moins une sauvegarde complète. Réseau : port 5022 ouvert dans les deux sens et plage 11000-11999 ouverte de SQL Server vers le sous-réseau de l'instance managée, sans plages IP qui se chevauchent. Les indicateurs de trace `-T1800` et `-T9567` sont recommandés. Seules les bases utilisateur sont répliquées, pas les connexions, les travaux ni les objets de serveur. Basculement : arrêtez l'application, basculez le lien vers l'instance managée, redirigez les chaînes de connexion. Avec SQL Server 2022 ou ultérieur, le lien permet aussi de revenir en arrière.

**Log Replay Service (LRS)** en mode **continu** :

1. Sauvegardez la base avec `CHECKSUM` (complète, puis différentielles et journaux) et chargez les fichiers dans un conteneur du Stockage Blob, un dossier plat par base.
2. Démarrez LRS sans l'option d'achèvement automatique, avec un jeton SAS sur le conteneur qui a uniquement les autorisations **Read et List**, ou une identité managée (pas les deux).
3. Continuez à charger les sauvegardes de journal ; LRS les restaure dans l'ordre.
4. Au basculement : arrêtez l'application, faites une sauvegarde de la fin du journal, chargez-la, vérifiez qu'elle est restaurée, exécutez la commande d'achèvement, redirigez l'application.

```bash
az sql midb log-replay start -g RG1 --mi mi-contoso -n SalesDb \
  --storage-uri "https://stcontoso.blob.core.windows.net/migration/SalesDb" \
  --storage-sas "<SAS token with Read and List only, without the leading ?>"

az sql midb log-replay show -g RG1 --mi mi-contoso -n SalesDb

az sql midb log-replay complete -g RG1 --mi mi-contoso -n SalesDb \
  --last-backup-name "SalesDb_tail.trn"
```

En mode **achèvement automatique** (autocomplete, `-a --last-bn <file>`), toute la chaîne est chargée à l'avance et LRS met la base en ligne après le dernier fichier : adapté à une base passive qui n'a pas besoin de rattrapage. Un travail LRS dure au plus **30 jours**. LRS est aussi le seul moyen d'appliquer des sauvegardes **différentielles** à une instance managée.

**Réplication transactionnelle** vers Azure SQL Database : le SQL Server local est éditeur et distributeur, la base Azure SQL est un abonné **par envoi de données (push)**. Après l'instantané initial, les modifications arrivent en continu ; au basculement, arrêtez les écritures, laissez arriver les dernières modifications, puis redirigez l'application.

> **Conseil d'examen.** « Temps d'arrêt minimal » plus « tester la cible avec des requêtes en lecture seule avant le basculement » plus Managed Instance comme cible : le lien Managed Instance.

<!-- section: offline-migration | objectives: 1.3.4 -->
## Implémenter une migration hors connexion

**Sauvegarde et restauration natives** vers une instance managée ou une machine virtuelle :

```text
-- On SQL Server and on the managed instance: a credential for the container
CREATE CREDENTIAL [https://stcontoso.blob.core.windows.net/migration]
    WITH IDENTITY = 'SHARED ACCESS SIGNATURE',
    SECRET = '<SAS token without the leading ?>';

-- On SQL Server
BACKUP DATABASE [SalesDb]
    TO URL = 'https://stcontoso.blob.core.windows.net/migration/SalesDb_full.bak'
    WITH COPY_ONLY, COMPRESSION, CHECKSUM;

-- On the managed instance
RESTORE DATABASE [SalesDb]
    FROM URL = 'https://stcontoso.blob.core.windows.net/migration/SalesDb_full.bak';
```

**BACPAC** avec SqlPackage, recommandé plutôt que le portail pour la production et les grandes bases :

```text
SqlPackage /a:Export /ssn:sqlsrv01 /sdn:SalesDb /tf:SalesDb.bacpac

SqlPackage /a:Import /tsn:sql-contoso-prod.database.windows.net /tdn:SalesDb /sf:SalesDb.bacpac /ua:True /tid:"contoso.onmicrosoft.com"
```

Contraintes d'importation : le portail ne crée qu'une base Azure SQL unique, à partir d'un BACPAC du Stockage Blob ; un BACPAC vers une instance managée exige SqlPackage ou SSMS ; l'importation dans un pool élastique n'est prise en charge ni par le portail, ni par PowerShell, ni par Azure CLI ; le service Import/Export ne fonctionne pas avec un stockage derrière un pare-feu, quand « Autoriser l'accès aux services Azure » est désactivé, ni avec l'authentification Microsoft Entra quand l'authentification multifacteur (MFA) est exigée.

**Database Migration Service hors connexion** vers Azure SQL Database migre le schéma et les données ; il ne migre ni les connexions ni les bases chiffrées par TDE.

<!-- section: migrate-to-azure | objectives: 1.3.5 -->
## Mener une migration vers Azure

Quel que soit l'outil, la procédure suit le même ordre :

1. **Évaluer** : Azure Migrate ou l'évaluation de migration Arc ; corriger les problèmes bloquants.
2. **Choisir et dimensionner la cible**, d'après l'évaluation et la référence de performances.
3. **Préparer la cible** : réseau (sous-réseau, VPN ou ExpressRoute, point de terminaison privé), règles de pare-feu, administrateur Microsoft Entra, connexions ou utilisateurs Microsoft Entra, clés et certificats.
4. **Migrer le schéma et les données** avec la méthode en ligne ou hors connexion choisie.
5. **Basculer** : arrêter les écritures sur la source, attendre les dernières modifications, mettre la cible en ligne.
6. **Après la migration** : recréer les travaux SQL Server Agent (ou des travaux élastiques sur SQL Database), associer les utilisateurs de base aux connexions, mettre à jour les statistiques, rediriger les chaînes de connexion, exécuter les tests de l'application.

Gardez d'abord le **niveau de compatibilité** de la base source et relevez-le après les tests, avec le Magasin des requêtes qui capture les plans avant et après, pour détecter les régressions.

Pour une cible **SQL Server sur les machines virtuelles Azure**, les choix courants sont la sauvegarde et restauration via le Stockage Blob (hors connexion), Database Migration Service en ligne ou hors connexion, ou un **groupe de disponibilité distribué** quand un groupe de disponibilité est déjà configuré en local (temps d'arrêt minimal). Azure Migrate déplace un serveur entier tel quel (lift and shift).

<!-- section: between-azure-sql | objectives: 1.3.6 -->
## Migrer entre services Azure SQL

| De | Vers | Méthode |
| --- | --- | --- |
| Azure SQL Database | Un autre serveur logique ou le même | Copie de base : `CREATE DATABASE ... AS COPY OF` ou `az sql db copy` (cohérente sur le plan transactionnel ; même édition, modifiable ensuite) |
| Azure SQL Database, tout niveau | Hyperscale | Changer l'objectif de service ; en ligne, basculement manuel possible dans les 24 heures |
| Hyperscale (base convertie) | General Purpose | Migration inverse dans les 45 jours |
| Azure SQL Database | Managed Instance | Exportation et importation BACPAC avec SqlPackage (SQL Database n'a pas de sauvegarde native) |
| Managed Instance | Azure SQL Database | BACPAC, ou réplication transactionnelle avec l'instance managée comme éditeur |
| Managed Instance | Managed Instance, même région | Copie ou déplacement de base |
| Managed Instance | SQL Server 2022 ou SQL Server 2025 | Sauvegarde `COPY_ONLY` vers une URL et restauration `WITH MOVE` (chemins de fichiers explicites), si la stratégie de mise à jour correspond à la version cible. Une base chiffrée par une clé TDE gérée par le service (le cas par défaut) ne peut pas être restaurée : il faut une clé gérée par le client, que SQL Server atteint via le connecteur SQL Server pour Azure Key Vault |
| SQL Server sur les machines virtuelles Azure | Managed Instance | Les mêmes outils que depuis le site local : lien Managed Instance, LRS, Database Migration Service |

```text
-- Run in the master database of the destination server
CREATE DATABASE [SalesDb_Test] AS COPY OF [sql-contoso-prod].[SalesDb];
```

```bash
az sql db copy -g RG1 -s sql-contoso-prod -n SalesDb \
  --dest-name SalesDb_Test --dest-server sql-contoso-test --service-objective S0
```

<!-- section: mi-copy-move | objectives: 1.3.7 -->
## Copier et déplacer des bases Managed Instance

La **copie** et le **déplacement** de base répliquent une base utilisateur **en ligne** d'une instance managée vers une autre avec la technologie des groupes de disponibilité Always On :

| | Copie | Déplacement |
| --- | --- | --- |
| Source après l'achèvement | Reste en ligne | Supprimée |
| Perte de données | Vous ne contrôlez pas le moment exact où la réplication s'arrête | Aucune, garantie par conception |

1. Dans le portail : l'instance source, **Gestion des données > Bases de données**, sélectionnez les bases, puis **Copier** ou **Déplacer** ; renseignez la source et la destination, **Vérifier + démarrer**. Avec PowerShell : `Copy-AzSqlInstanceDatabase` ou `Move-AzSqlInstanceDatabase` ; avec Azure CLI : `az sql midb copy` ou `az sql midb move`.
2. La base est amorcée (seeding) vers la destination (jusqu'à 360 Go par heure dans des conditions optimales) ; les modifications continuent d'être répliquées.
3. Quand l'état est **Prêt pour l'achèvement**, sélectionnez **Terminer** dans les **24 heures**, sinon l'opération est annulée et la base de destination supprimée.
4. La base de destination est mise en ligne en lecture et en écriture.

Règles :

- La source et la destination sont des instances différentes dans la **même région Azure** ; des abonnements différents sont permis dans le même locataire Microsoft Entra.
- Des réseaux virtuels différents exigent une connectivité (par exemple un peering) et les ports TCP **5022** et **11000-11999** ouverts dans les deux sens.
- Bases utilisateur uniquement, une opération à la fois par base, jusqu'à huit opérations simultanées par instance source ; pas de renommage pendant l'opération.
- Les bases d'un groupe de basculement ou d'un lien Managed Instance ne peuvent être ni copiées ni déplacées, et ni l'instance source ni l'instance de destination ne doivent être configurées avec un groupe de basculement.
- Les sauvegardes de restauration à un point dans le temps ne suivent pas : une nouvelle chaîne de sauvegarde commence sur la destination. Les étiquettes ne sont pas copiées ; la réplication transactionnelle, la capture des données modifiées et les transactions distribuées sont à reconfigurer après un déplacement.
- La destination exige une **stratégie de mise à jour** identique ou plus récente, et l'accès à la même clé Key Vault pour un protecteur TDE géré par le client.

Progression de l'amorçage :

```text
SELECT role_desc, transfer_rate_bytes_per_second, transferred_size_bytes,
       database_size_bytes, estimate_time_complete_utc
FROM sys.dm_hadr_physical_seeding_stats;
```

> **Piège d'examen.** La copie et le déplacement ne traversent pas les régions. Pour amener une base d'instance managée dans une autre région, utilisez plutôt un groupe de basculement, la géorestauration ou une sauvegarde et restauration.

<!-- section: troubleshoot | objectives: 1.3.8 -->
## Résoudre les problèmes de migration

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| LRS ne démarre pas | Une base du même nom existe déjà sur l'instance | Renommer ou supprimer l'une des bases |
| LRS ne démarre pas avec un SAS d'apparence valide | Le jeton a plus que Read et List (par exemple Write), a été copié avec le `?`, ou est hors de sa fenêtre de validité (fuseaux horaires) | Régénérer un jeton Read et List, copié après le `?`, avec une fenêtre de validité plus large |
| LRS ne trouve pas les sauvegardes | Conteneur ou dossier nommé `backup` ou `backups` (réservés), dossiers imbriqués, ou mauvais nom du dernier fichier en mode achèvement automatique | Renommer le dossier, un dossier plat par base, vérifier le nom de fichier |
| La restauration LRS est lente | Sauvegardes prises sans `CHECKSUM` : l'instance vérifie l'intégrité | Sauvegarder `WITH CHECKSUM` |
| Travail LRS annulé | Maximum de 30 jours dépassé | Redémarrer, planifier le basculement dans les 30 jours |
| Les utilisateurs ne peuvent pas se connecter après une migration par sauvegarde et restauration | Connexions non migrées ; utilisateurs de base orphelins | Créer les connexions (ou les utilisateurs Microsoft Entra), puis `ALTER USER [u] WITH LOGIN = [u];` |
| Les tâches planifiées se sont arrêtées après la migration | Les travaux SQL Server Agent ne sont pas migrés avec la base | Générer le script des travaux et les recréer (travaux élastiques sur SQL Database) |
| Un BACPAC de plus de 150 Go échoue à l'importation depuis le portail (« File contains corrupted data ») ou « not enough space on the disk » | Limites du service Import/Export (450 Go de disque local) | Importer avec SqlPackage |
| La requête Import/Export échoue | Stockage derrière un pare-feu, ou « Autoriser l'accès aux services Azure » désactivé | Exécuter SqlPackage depuis une machine virtuelle Azure |
| Database Migration Service ne peut pas migrer une base | Base chiffrée par TDE | Utiliser une autre méthode (lien, LRS, sauvegarde et restauration avec le certificat) |
| La copie ou le déplacement ne démarre pas ou stagne | Ports 5022 et 11000-11999 bloqués, autre région, stratégie de mise à jour inférieure, groupe de basculement sur la base ou sur l'une des instances | Ouvrir les ports, choisir une destination valide |
| Requêtes plus lentes après la migration | Nouveau niveau de compatibilité ou statistiques obsolètes | Comparer les plans dans le Magasin des requêtes, forcer le bon plan ou abaisser le niveau de compatibilité, mettre à jour les statistiques |

<!-- section: key-points -->
## Points clés

- Évaluez avec Azure Migrate ou l'évaluation de migration Azure Arc ; les connexions et les travaux Agent restent toujours à migrer par vous.
- En ligne vers Managed Instance : lien Managed Instance (cible lisible, le moins de temps d'arrêt) ou LRS en mode continu ; en ligne vers SQL Database : réplication transactionnelle.
- Hors connexion : sauvegarde vers une URL et restauration (Managed Instance, machines virtuelles), BACPAC avec SqlPackage (SQL Database, Managed Instance), DMS hors connexion vers SQL Database.
- LRS : SAS Read et List uniquement, un dossier plat par base, `CHECKSUM`, 30 jours au plus, commande d'achèvement pour le basculement.
- Copie de base pour SQL Database ; copie et déplacement pour Managed Instance dans la même région, à terminer dans les 24 heures.
- La plupart des échecs de migration viennent des autorisations, des noms, des ports réseau et des objets situés hors de la base.
