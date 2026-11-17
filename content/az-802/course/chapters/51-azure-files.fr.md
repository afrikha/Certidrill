Azure Files fournit des partages de fichiers SMB dans Azure, et Azure File Sync transforme un serveur de fichiers Windows en cache d'un tel partage. Les questions d'examen demandent quel compte et quel partage créer, comment donner l'accès à des utilisateurs AD DS, comment construire une topologie de synchronisation et comment déplacer un serveur de fichiers ou un déploiement de réplication DFS vers Azure.

<!-- section: azure-file-shares | objectives: 5.1.1 -->
## Créer et gérer des partages de fichiers Azure

Azure Files propose désormais deux modèles de gestion :

| Modèle | Fournisseur de ressources | Protocoles | Remarques |
| --- | --- | --- | --- |
| Partage de fichiers classique | `Microsoft.Storage` (dans un compte de stockage) | SMB et NFS | SSD ou HDD ; prend en charge Azure File Sync et l'accès basé sur l'identité |
| Partage de fichiers | `Microsoft.FileShares` (sans compte de stockage) | NFS uniquement | SSD, provisionné v2, LRS ou ZRS ; pas d'Azure File Sync |

Les scénarios Windows Server utilisent donc un **partage de fichiers classique dans un compte de stockage**, dont le type et la référence SKU déterminent la facturation, le niveau de média et la redondance :

| Niveau de média et facturation | Type de compte | Références SKU |
| --- | --- | --- |
| SSD ou HDD, provisionné v2 (recommandé pour les nouveaux déploiements) | `FileStorage` | `PremiumV2_LRS`, `PremiumV2_ZRS`, `StandardV2_LRS`, `StandardV2_ZRS`, `StandardV2_GRS`, `StandardV2_GZRS` |
| SSD, provisionné v1 | `FileStorage` | `Premium_LRS`, `Premium_ZRS` |
| HDD, paiement à l'utilisation | `StorageV2` | `Standard_LRS`, `Standard_ZRS`, `Standard_GRS`, `Standard_GZRS` |

- **Provisionné v2** : le stockage (32 Gio à 256 Tio), les IOPS et le débit sont provisionnés et facturés séparément ; 50 partages classiques par compte.
- **Provisionné v1** : stockage seul (100 Gio à 100 Tio) ; les IOPS et le débit suivent la taille.
- **Paiement à l'utilisation** : stockage utilisé et transactions ; niveau d'accès *optimisé pour les transactions* (par défaut), *chaud* ou *froid* ; jusqu'à 100 Tio par partage.
- La géoredondance n'existe que sur HDD. Le compte est une limite de confiance : les règles réseau et la source d'identité s'appliquent à tous ses partages.

```powershell
# SSD provisioned v2 account, then a 1 TiB SMB share (recommended IOPS and throughput)
New-AzStorageAccount -ResourceGroupName RG-Files -Name contosofiles01 -Location westeurope `
  -Kind FileStorage -SkuName PremiumV2_ZRS -EnableHttpsTrafficOnly $true -MinimumTlsVersion TLS1_2
New-AzRmStorageShare -ResourceGroupName RG-Files -StorageAccountName contosofiles01 `
  -Name projects -QuotaGiB 1024 -EnabledProtocol SMB
```

**Montage depuis Windows.** SMB utilise le **port TCP 445**. Testez-le, puis montez le partage avec une identité ou avec la clé du compte (utilisateur `localhost\<storage-account-name>`) :

```powershell
Test-NetConnection -ComputerName contosofiles01.file.core.windows.net -Port 445
net use Z: \\contosofiles01.file.core.windows.net\projects
```

> **Piège d'examen.** Si un FAI ou un pare-feu bloque le port TCP 445, le montage échoue depuis le site local, quelle que soit la configuration du partage. Utilisez un VPN ou ExpressRoute (en général avec un point de terminaison privé), ou un serveur Azure File Sync intermédiaire.

**Paramètres de protection** (service de fichiers du compte) :

| Fonctionnalité | Protège contre | Détails |
| --- | --- | --- |
| Suppression réversible | La suppression d'un partage | Activée par défaut, 7 jours ; 1 à 365 jours |
| Instantanés de partage | Les fichiers modifiés ou supprimés | Lecture seule, incrémentiels, 200 par partage ; **Versions précédentes** dans Windows. Supprimés avec le partage |
| Require Encryption in Transit for SMB | Le SMB non chiffré | Sélectionné par défaut dans le portail |
| Accès par clé du compte de stockage | L'accès par clé | Doit rester activé pour Azure File Sync |

<!-- section: share-permissions | objectives: 5.1.2 -->
## Gérer les autorisations des partages de fichiers Azure

L'accès comporte trois couches : l'**authentification** par une source d'identité, les **autorisations au niveau du partage** (Azure RBAC) et les **ACL Windows** (autorisations NTFS). Une seule source d'identité par compte de stockage :

| Source d'identité | Quand l'utiliser | Exigences |
| --- | --- | --- |
| AD DS local | AD DS existant, clients qui joignent les contrôleurs de domaine | Compte de stockage joint à AD DS ; identités synchronisées avec Microsoft Entra ID pour des autorisations de partage par utilisateur ou par groupe |
| Microsoft Entra Domain Services | Domaine managé dans Azure | Clients joints au domaine managé |
| Microsoft Entra Kerberos | Clients joints à Microsoft Entra ou hybrides, sans accès aux contrôleurs de domaine | Identités hybrides synchronisées depuis AD DS, ou identités cloud uniquement |

**Joindre le compte à AD DS** avec `Join-AzStorageAccount` (module AzFilesHybrid, Windows PowerShell 5.1, machine jointe au domaine). La cmdlet crée un compte d'ordinateur (par défaut) ou un compte d'ouverture de session de service avec le SPN `cifs/<storage-account-name>.file.core.windows.net` et Kerberos AES-256. Il faut le droit de le créer dans l'unité d'organisation, le rôle Contributor sur le compte et Reader sur son groupe de ressources. Changez son mot de passe avant l'âge maximal du mot de passe si l'unité d'organisation impose une expiration.

```powershell
Import-Module -Name AzFilesHybrid
Join-AzStorageAccount -ResourceGroupName RG-Files -StorageAccountName contosofiles01 `
  -SamAccountName contosofiles01 -DomainAccountType ComputerAccount `
  -OrganizationalUnitDistinguishedName "OU=StorageAccounts,DC=contoso,DC=com"
Debug-AzStorageAccountAuth -StorageAccountName contosofiles01 -ResourceGroupName RG-Files -Verbose
```

Les **autorisations au niveau du partage** sont des attributions de rôles Azure sur le partage (étendue `.../fileServices/default/fileshares/<share-name>`) à des utilisateurs ou groupes Microsoft Entra :

| Rôle | Accorde |
| --- | --- |
| Storage File Data SMB Share Reader | Lecture |
| Storage File Data SMB Share Contributor | Lecture, écriture, suppression |
| Storage File Data SMB Share Elevated Contributor | Lecture, écriture, suppression, modification des ACL (comme l'autorisation de partage *Modifier*) |
| Storage File Data SMB Admin | Accès administrateur via SMB, y compris la prise de possession de tout fichier |
| Storage File Data Privileged Reader / Privileged Contributor | Lecture / lecture, écriture et modification des ACL, en passant outre les ACL existantes |

Une **autorisation par défaut au niveau du partage** (`Set-AzStorageAccount -DefaultSharePermission StorageFileDataSmbShareContributor`) donne un même rôle à toute identité authentifiée sur tous les partages du compte : utilisez-la pour les identités non synchronisées avec Microsoft Entra ID (comptes d'ordinateur, gMSA), pour un AD DS synchronisé avec un autre locataire, ou pour laisser les seules ACL décider. Elle vaut **None** au départ. Quand les deux existent, l'autorisation la plus élevée s'applique. Les modifications prennent jusqu'à 30 minutes environ.

> **Piège d'examen.** Les rôles au niveau du partage s'attribuent à l'identité **Microsoft Entra** d'un utilisateur ou d'un groupe synchronisé. Un utilisateur ou un compte d'ordinateur qui n'existe que dans AD DS ne peut pas recevoir de rôle RBAC : donnez-lui l'accès par l'autorisation par défaut au niveau du partage.

**ACL Windows.** Le niveau partage et l'ACL se combinent et le **plus restrictif** l'emporte : Contributor avec une ACL en lecture donne la lecture. Pour modifier les ACL, montez le partage avec `net use` depuis une machine qui joint un contrôleur de domaine, en tant que titulaire de **Storage File Data SMB Admin** (recommandé) ou avec la clé du compte, puis utilisez l'Explorateur de fichiers ou `icacls`.

> **Conseil d'examen.** Ordre de configuration : activer la source d'identité, attribuer les autorisations au niveau du partage, configurer les ACL Windows, puis configurer le réseau et le DNS, et monter le partage.

<!-- section: azure-file-sync | objectives: 5.1.3 -->
## Configurer et gérer Azure File Sync

| Composant | Rôle | Limites |
| --- | --- | --- |
| Service de synchronisation de stockage | Ressource Azure qui approuve les serveurs inscrits | Un serveur s'inscrit auprès d'**un seul** service ; des serveurs de services différents ne se synchronisent pas entre eux ; 100 serveurs inscrits par service |
| Groupe de synchronisation | Une topologie de synchronisation | Exactement **un point de terminaison cloud** ; jusqu'à 100 points de terminaison de serveur |
| Point de terminaison cloud | Pointeur vers un partage de fichiers Azure SMB classique | Compte de stockage dans la **même région** que le service de synchronisation de stockage |
| Point de terminaison de serveur | Un chemin (racine de volume, dossier ou point de montage) sur un serveur inscrit | Un point de terminaison de serveur par serveur dans un groupe de synchronisation donné ; 30 par serveur ; volume NTFS local uniquement, ni NAS ni partage mappé |

Prérequis : Windows Server 2016 à 2025 (installation complète ou Server Core), .NET Framework 4.7.2, 2 Gio de mémoire, un volume **NTFS** local (pas ReFS), et sur un cluster le rôle **Serveur de fichiers pour une utilisation générale** avec des disques en cluster (ni serveur de fichiers avec montée en puissance parallèle ni CSV) et l'agent sur chaque nœud. Le compte doit autoriser SMB 3.1.1, NTLMv2 et AES-128-GCM. L'administrateur doit avoir Azure File Sync Administrator, Owner ou Contributor sur le service, plus `listKeys` sur le compte (Reader and Data Access ou Storage Account Contributor).

Ordre de déploiement :

1. Créer le compte de stockage et le partage SMB classique, puis le **service de synchronisation de stockage** dans la même région.
2. Sur le serveur, désactiver la configuration de sécurité renforcée d'Internet Explorer, puis installer l'agent (MSI, ou l'extension **Azure File Sync Agent for Windows** sur un serveur compatible Azure Arc).
3. **Inscrire** le serveur (`ServerRegistration.exe` ou `Register-AzStorageSyncServer`, exécuté sur le serveur lui-même).
4. Créer le **groupe de synchronisation** avec son **point de terminaison cloud**.
5. Ajouter les **points de terminaison de serveur**, avec ou sans hiérarchisation cloud.

```powershell
$sss = New-AzStorageSyncService -ResourceGroupName RG-Files -Name sss-contoso -Location westeurope
$server = Register-AzStorageSyncServer -ParentObject $sss
$account = Get-AzStorageAccount -ResourceGroupName RG-Files -Name contosofiles01
$group = New-AzStorageSyncGroup -ParentObject $sss -Name projects
New-AzStorageSyncCloudEndpoint -Name projects -ParentObject $group `
  -StorageAccountResourceId $account.Id -AzureFileShareName projects
New-AzStorageSyncServerEndpoint -Name FS1 -SyncGroup $group -ServerResourceId $server.ResourceId `
  -ServerLocalPath "D:\Projects" -CloudTiering -VolumeFreeSpacePercent 20
```

La **hiérarchisation cloud** garde l'espace de noms en local et ne laisse qu'un point d'analyse pour les fichiers froids ; ouvrir un tel fichier le rappelle.

| Stratégie | Effet |
| --- | --- |
| Espace libre sur le volume | Garder au moins X % du **volume** libre ; s'applique par volume, donc mettez la même valeur sur tous les points de terminaison de serveur d'un volume |
| Délai | Hiérarchiser les fichiers ni lus ni écrits depuis X jours |

Pas de hiérarchisation cloud sur le **volume système**. Le premier point de terminaison de serveur *fusionne* par défaut avec le partage (*le serveur fait autorité* après un préamorçage) ; les suivants téléchargent d'abord l'espace de noms, l'espace de noms seul, ou évitent les fichiers hiérarchisés.

| Besoin | Solution |
| --- | --- |
| Les modifications faites directement dans le partage de fichiers Azure apparaissent tard (détection toutes les 24 heures) | `Invoke-AzStorageSyncChangeDetection` |
| Un serveur de succursale doit avoir les fichiers nouveaux et modifiés avant l'arrivée des utilisateurs | Rappel proactif : `-LocalCacheMode DownloadNewAndModifiedFiles` |
| Rappeler des fichiers avant de désactiver la hiérarchisation ou pour les performances | `Invoke-StorageSyncFileRecall -Path D:\Projects` |
| Les utilisateurs restaurent des versions antérieures sur un volume hiérarchisé | `Enable-StorageSyncSelfServiceRestore` sur chaque volume qui porte un point de terminaison hiérarchisé |

> **Piège d'examen.** Un groupe de synchronisation a exactement un point de terminaison cloud et au plus un point de terminaison de serveur par serveur inscrit. Deux dossiers d'un même serveur à synchroniser vont dans deux groupes de synchronisation, chacun avec son propre partage de fichiers Azure.

<!-- section: monitor-file-sync | objectives: 5.1.4 -->
## Superviser Azure File Sync

Le **service de synchronisation de stockage** affiche l'intégrité des serveurs inscrits et, par point de terminaison de serveur, les erreurs de synchronisation, l'activité de synchronisation, l'espace économisé par la hiérarchisation et les erreurs de rappel. Les métriques arrivent dans Azure Monitor toutes les 15 minutes. Un serveur à l'état **Appears Offline** ne joint pas le service : vérifiez que **AzureStorageSyncMonitor.exe** s'exécute. **Set up recommended alerts** crée ces règles :

| Scénario | Métrique |
| --- | --- |
| Le point de terminaison de serveur affiche une erreur | Sync session result |
| Des fichiers ne se synchronisent pas | Files not syncing |
| Le serveur ne communique pas avec le service | Server online status |
| Point de terminaison de serveur en mode espace disque faible | Cloud tiering low disk space mode |
| Plus de 500 Gio rappelés en un jour | Cloud tiering recall size |
| Version de l'agent proche de l'expiration | Agent version expiration information |

Sur le serveur, le journal Telemetry se trouve dans l'Observateur d'événements sous `Applications and Services\Microsoft\FileSync\Agent` :

| ID d'événement | Signification |
| --- | --- |
| 9102 | Session de synchronisation terminée : `HResult = 0` indique un succès, `PerItemErrorCount` compte les fichiers en échec |
| 9121 | Une erreur par élément |
| 9302 | Progression d'une session active |
| 9301 | Interrogation du service par le serveur toutes les 30 secondes |
| 9003 / 9006 | Erreurs de hiérarchisation / erreurs de rappel |

L'Analyseur de performances propose les objets **AFS Bytes Transferred** et **AFS Sync Operations**.

<!-- section: migrate-dfsr | objectives: 5.1.5 -->
## Migrer DFS vers Azure File Sync

Azure File Sync remplace la réplication DFS (DFS-R) dans la plupart des cas : la copie complète réside dans le partage, les serveurs gardent un cache, et les espaces de noms DFS continuent de fonctionner devant eux.

Ordre de migration :

1. Créer un groupe de synchronisation qui représente la topologie DFS-R.
2. Sur le serveur qui détient le **jeu de données complet**, installer l'agent, inscrire le serveur et créer un point de terminaison de serveur **sans hiérarchisation cloud**.
3. Laisser toutes les données se charger vers le point de terminaison cloud.
4. Installer et inscrire l'agent sur chacun des autres serveurs DFS-R.
5. **Désactiver DFS-R**.
6. Créer un point de terminaison de serveur sur chacun des autres serveurs, toujours sans hiérarchisation cloud.
7. Vérifier que la synchronisation se termine, puis mettre DFS-R hors service.
8. Activer la hiérarchisation cloud là où c'est utile.

Gardez les deux côte à côte uniquement si certains serveurs n'ont pas accès à internet ou si des succursales se consolident sur un hub : alors pas de hiérarchisation cloud sur les volumes DFS-R, pas de point de terminaison de serveur sur un dossier répliqué en lecture seule, et un seul point de terminaison de serveur au plus qui chevauche un emplacement DFS-R.

> **Piège d'examen.** Créer des points de terminaison de serveur sur les autres membres avant de désactiver DFS-R, ou activer la hiérarchisation pendant la migration, laisse deux moteurs modifier les mêmes fichiers. La hiérarchisation vient en dernier.

<!-- section: migrate-shares | objectives: 5.1.6 -->
## Migrer des partages de fichiers vers Azure Files

Choisissez la cible, **cloud uniquement** ou **hybride** (cache Azure File Sync), puis l'outil :

| Source | Cible hybride | Cible cloud uniquement |
| --- | --- | --- |
| Windows Server 2016 ou ultérieur | Installer Azure File Sync sur le serveur (éventuellement Azure Data Box pour le volume principal) | Azure File Sync puis suppression du point de terminaison de serveur, Robocopy vers le partage monté, ou Azure Storage Mover |
| Windows Server 2012 R2 ou antérieur | Nouveau serveur Windows Server 2016 ou ultérieur avec Azure File Sync, copie avec Robocopy ; ou Storage Migration Service vers Windows Server 2019 ou ultérieur, puis Azure File Sync | Azure Storage Mover, ou Robocopy vers le partage monté |
| NAS | Chargement par Azure Storage Mover ou Data Box, puis Azure File Sync | Azure Storage Mover, Data Box, ou Robocopy vers le partage monté |

| Outil | Fidélité des fichiers |
| --- | --- |
| Azure File Sync, Robocopy, Azure Storage Mover, Azure Data Box | Complète (ACL, horodatages, attributs) |
| AzCopy | Une partie de la fidélité peut être perdue (API REST) ; jusqu'à 10 millions de fichiers par tâche de synchronisation |
| Explorateur Stockage Azure | Perd l'essentiel de la fidélité, comme les ACL |
| Azure Data Factory | Ne copie pas les métadonnées |

- Définissez l'**ACL racine** du partage avant de copier beaucoup de fichiers ; la modifier ensuite se propage lentement.
- Migrez vers le niveau **optimisé pour les transactions**, puis passez à un niveau plus froid.
- Relancez Robocopy avec `/MIR` : les passes suivantes ne copient que les changements, la bascule est donc courte.
- Conservez les chemins des utilisateurs avec les **espaces de noms DFS** qui pointent vers le nouvel emplacement.
- Pour préamorcer un partage destiné à Azure File Sync, montez-le avec la **clé du compte** et gelez les modifications jusqu'à la fin du rapprochement.

```text
robocopy <SourcePath> <Dest.Path> /MT:20 /R:2 /W:1 /B /MIR /IT /COPY:DATSO /DCOPY:DAT /NP /NFL /NDL /XD "System Volume Information" /UNILOG:<FilePathAndName>
```

`/COPY:DATSO` copie les données, les attributs, les horodatages, les ACL et le propriétaire ; `/B` lit en mode sauvegarde ; `/MIR` supprime aussi dans la cible ce qui a quitté la source.

<!-- section: key-points -->
## Points clés

- Les scénarios Windows Server et Azure File Sync utilisent des partages SMB classiques dans un compte de stockage ; `Microsoft.FileShares` ne fait que du NFS.
- Le modèle provisionné v2 est recommandé ; le SSD n'offre que LRS et ZRS ; SMB exige le port TCP 445.
- Accès = source d'identité + rôle RBAC au niveau du partage (ou autorisation par défaut) + ACL Windows ; le plus restrictif l'emporte.
- Un service de synchronisation de stockage par serveur, un point de terminaison cloud par groupe de synchronisation, même région, NTFS uniquement, pas de hiérarchisation sur le volume système.
- Les modifications directes dans le partage sont détectées toutes les 24 heures, sauf si vous exécutez `Invoke-AzStorageSyncChangeDetection`.
- Migration DFS-R : d'abord le serveur qui a toutes les données, sans hiérarchisation, désactivation de DFS-R avant d'ajouter les autres serveurs, hiérarchisation en dernier.
