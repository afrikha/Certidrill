Windows Server construit sa propre pile de stockage : disques et volumes, espaces de stockage sur un serveur, espaces de stockage direct sur un cluster, réplica de stockage entre sites, SMB Direct pour les réseaux rapides et qualité de service du stockage pour Hyper-V. Les questions d'examen donnent un nombre de disques ou de serveurs et une panne à supporter, et demandent quelle résilience, quelle commande ou quel scénario de réplication convient.

<!-- section: disks-volumes | objectives: 5.3.1 -->
## Configurer des disques et des volumes

Un nouveau disque est **hors connexion ou non initialisé** : mettez-le en ligne, initialisez-le avec un style de partition, puis créez et formatez un volume.

| Style de partition | Usage |
| --- | --- |
| GPT (par défaut dans la Gestion des disques) | Disques et volumes de plus de 2 To, démarrage UEFI ; exigé par le réplica de stockage pour les disques de données et de journal |
| MBR | Systèmes anciens, démarrage BIOS, supports amovibles |

```powershell
Get-Disk | Where-Object PartitionStyle -eq RAW
Set-Disk -Number 2 -IsOffline $false
Initialize-Disk -Number 2 -PartitionStyle GPT
New-Partition -DiskNumber 2 -UseMaximumSize -DriveLetter E |
  Format-Volume -FileSystem NTFS -NewFileSystemLabel Data
```

Règles de redimensionnement :

- **Étendre** un volume uniquement dans l'espace non alloué **situé juste après lui sur le même disque**, et seulement s'il est en NTFS ou ReFS (`Resize-Partition -DriveLetter E -Size (Get-PartitionSupportedSize -DriveLetter E).SizeMax`).
- **Réduire** uniquement des volumes de base NTFS ou bruts, jamais ReFS. Les fichiers non déplaçables (fichier d'échange, zone de stockage des clichés instantanés) limitent la réduction ; l'événement 259 nomme le fichier bloquant. `diskpart` : `select volume 3`, puis `shrink desired=10240`.
- Un volume peut être monté dans un dossier NTFS vide au lieu d'une lettre de lecteur.

**Disques durs virtuels.** La Gestion des disques (Action > Créer un disque dur virtuel / Attacher un disque dur virtuel) ou les cmdlets Hyper-V créent des fichiers `.vhd` ou `.vhdx` (recommandé), de **taille fixe** ou à **expansion dynamique**. Un VHDX attaché se comporte comme un disque physique ; le détacher conserve le fichier et ses données.

```powershell
New-VHD -Path D:\VHD\Data1.vhdx -SizeBytes 200GB -Dynamic
Mount-VHD -Path D:\VHD\Data1.vhdx
```

<!-- section: storage-spaces | objectives: 5.3.2 -->
## Configurer et gérer des espaces de stockage

Les espaces de stockage regroupent des disques physiques dans un **pool de stockage**, y découpent des **disques virtuels** (espaces de stockage) avec un type de résilience, sur lesquels vous créez des volumes. Les disques disponibles apparaissent d'abord dans le **pool primordial**.

Prérequis des disques : SAS, SATA, NVMe (USB possible mais déconseillé) ; au moins **4 Go**, vierges et non formatés ; HBA en mode direct, sans RAID. Les disques iSCSI ou Fibre Channel ne prennent en charge que des espaces non résilients (simples).

| Résilience | Copies ou parité | Disques minimum | Tolère | Usage |
| --- | --- | --- | --- | --- |
| Simple | Entrelacement, sans redondance | 1 | Rien | Données temporaires ou faciles à recréer |
| Miroir bidirectionnel | 2 copies | 2 | 1 disque | La plupart des charges, partages de fichiers, bibliothèques de VHD |
| Miroir tridirectionnel | 3 copies | 5 | 2 disques | Données critiques qui doivent supporter deux pannes |
| Parité | Données et parité (journalisées) | 3 | 1 disque | Archives, sauvegardes, charges séquentielles |

- **Provisionnement** : **fixe** prend toute la taille dans le pool à la création ; **dynamique** (thin) alloue à la demande et permet la surallocation, donc surveillez l'espace libre du pool. Les deux peuvent coexister dans un même pool.
- Un disque virtuel résilient consomme plus d'espace du pool que sa taille : choisissez *Créer le plus grand disque virtuel possible* pour éviter les erreurs de taille.
- Les disques de **secours** (hot spare) attendent de remplacer un disque défaillant (`Add-PhysicalDisk -Usage HotSpare`). Sans disque de secours, ajoutez un disque, marquez le disque défaillant comme retiré (`Set-PhysicalDisk -Usage Retired`), exécutez `Repair-VirtualDisk`, puis supprimez le disque défaillant.

```powershell
Get-StoragePool -IsPrimordial $true | Get-PhysicalDisk -CanPool $true
New-StoragePool -FriendlyName Pool1 -StorageSubSystemFriendlyName "Windows Storage*" `
  -PhysicalDisks (Get-PhysicalDisk -CanPool $true)
New-VirtualDisk -StoragePoolFriendlyName Pool1 -FriendlyName VDisk1 `
  -ResiliencySettingName Mirror -NumberOfDataCopies 3 -Size 2TB -ProvisioningType Thin
Get-VirtualDisk -FriendlyName VDisk1 | Get-Disk | Initialize-Disk -PassThru |
  New-Partition -AssignDriveLetter -UseMaximumSize | Format-Volume -FileSystem ReFS
```

> **Piège d'examen.** Si `Get-PhysicalDisk -CanPool $true` ne renvoie rien, les disques ne sont pas éligibles : ils ont déjà des partitions, se trouvent derrière un contrôleur RAID qui les masque, ou sont trop petits. Videz le disque (`Clear-Disk -RemoveData`) ou changez le mode du contrôleur.

<!-- section: storage-spaces-direct | objectives: 5.3.3 -->
## Implémenter et gérer des espaces de stockage direct

Les espaces de stockage direct (S2D) regroupent les **lecteurs locaux de 2 à 16 serveurs** d'un cluster de basculement dans un pool défini par logiciel. Les volumes sont des **volumes partagés de cluster** (CSV), en général ReFS. Le bus de stockage logiciel permet à chaque nœud de voir chaque lecteur ; les lecteurs les plus rapides deviennent automatiquement un **cache** en lecture et écriture.

Exigences :

- Édition **Windows Server Datacenter** sur chaque nœud.
- Lecteurs attachés directement à un seul serveur chacun (SATA, SAS, NVMe, mémoire persistante), derrière un HBA simple, sans RAID ; au moins 4 lecteurs de capacité par serveur (tout flash), ou 2 lecteurs de cache et 4 lecteurs de capacité quand un cache est utilisé. Lecteurs de cache de 32 Go ou plus.
- Réseau : 10 Gbit/s ou plus pour 2 ou 3 nœuds, 25 Gbit/s et RDMA (iWARP ou RoCE) recommandés ; SMB Direct et SMB Multichannel portent le trafic est-ouest.
- 4 Go de RAM par To de capacité de lecteurs de cache sur chaque serveur, pour les métadonnées.
- Un témoin de cluster ; un cluster à deux nœuds en a besoin.

Ordre de déploiement :

1. Installer `Failover-Clustering`, `Hyper-V` (hyperconvergé), `Data-Center-Bridging` (RoCE) et `FS-FileServer` sur chaque nœud.
2. Nettoyer les lecteurs (`Clear-Disk -RemoveData -RemoveOEM`).
3. Valider : `Test-Cluster -Node N1,N2,N3,N4 -Include "Storage Spaces Direct","Inventory","Network","System Configuration"`.
4. Créer le cluster **sans stockage** : `New-Cluster -Name S2D1 -Node N1,N2,N3,N4 -NoStorage`, puis configurer un témoin.
5. `Enable-ClusterStorageSpacesDirect` : crée le pool (nommé par exemple « S2D on S2D1 »), configure le cache et les niveaux par défaut.
6. Créer les volumes avec `New-Volume`, qui crée en une étape le disque virtuel, la partition, le système de fichiers et le CSV.

```powershell
New-Volume -FriendlyName Volume1 -FileSystem CSVFS_ReFS -StoragePoolFriendlyName S2D* `
  -Size 2TB -ResiliencySettingName Mirror
```

| Résilience | Serveurs minimum | Pannes tolérées | Efficacité |
| --- | --- | --- | --- |
| Miroir bidirectionnel | 2 | 1 | 50 % |
| Miroir tridirectionnel | 3 | 2 | 33,3 % |
| Parité unique (déconseillée) | 3 | 1 | Supérieure au miroir tridirectionnel |
| Parité double | 4 | 2 | 50 % à 80 % |
| Parité accélérée par miroir | 4 | 2 | Entre miroir et parité |
| Miroir bidirectionnel imbriqué (deux serveurs uniquement) | 2 | Panne d'un lecteur et d'un serveur en même temps | 25 % |
| Parité accélérée par miroir imbriquée (deux serveurs uniquement) | 2 | Panne d'un lecteur et d'un serveur en même temps | Environ 35 % à 40 % |

> **Piège d'examen.** Un cluster à deux serveurs qui doit continuer à fonctionner quand un serveur est arrêté **et** qu'un lecteur tombe en panne dans l'autre exige la **résilience imbriquée** (Windows Server 2019 ou ultérieur) ; un miroir bidirectionnel classique ne supporte qu'une panne.

**Modèles de déploiement** : l'**hyperconvergé** exécute les VM Hyper-V sur les nœuds de stockage ; le **convergé** (désagrégé) ajoute un serveur de fichiers avec montée en puissance parallèle au-dessus de S2D et sert des partages SMB 3 à des hôtes de calcul distincts. Avant une maintenance sur un nœud, suspendez-le en drainant ses rôles (`Suspend-ClusterNode -Drain`), puis laissez la resynchronisation du stockage se terminer avant de passer au nœud suivant (`Get-StorageJob`).

<!-- section: storage-replica | objectives: 5.3.4 -->
## Configurer et gérer un réplica de stockage

Le réplica de stockage réplique des **volumes au niveau bloc** via SMB 3, de façon synchrone (aucune perte de données, latence aller-retour d'environ 5 ms ou moins) ou asynchrone (plus longues distances, RPO supérieur à zéro).

| Scénario | Stockage | Basculement |
| --- | --- | --- |
| Cluster étendu | Deux ensembles de stockage partagé asymétrique dans un cluster (SAS, SAN, iSCSI) | Automatique |
| Cluster à cluster | S2D, SAS partagé, SAN, iSCSI | Manuel |
| Serveur à serveur | Lecteurs locaux, SAN, iSCSI, espaces de stockage | Manuel |

Exigences :

- Une forêt AD DS ; au moins 2 Go de RAM et 2 cœurs par serveur ; TCP 445 (ou 5445 avec RDMA) entre les partenaires.
- Fonctionnalité `Storage-Replica` (plus `FS-FileServer` pour `Test-SRTopology`), puis redémarrage.
- De chaque côté, un **volume de données** et un **volume de journal** ; disques initialisés en **GPT** ; volumes de données de taille identique ; même taille de secteur pour tous les disques de données et pour tous les disques de journal ; volume de journal sur un stockage rapide (SSD), d'au moins 10 Go, réservé à cet usage ; la taille du journal vaut 8 Go par défaut (`-LogSizeInBytes`).
- Édition **Standard** (Windows Server 2019 ou ultérieur) : un seul volume répliqué, de 2 To au plus. **Datacenter** : illimité.

```powershell
Test-SRTopology -SourceComputerName SR-SRV01 -SourceVolumeName F: -SourceLogVolumeName G: `
  -DestinationComputerName SR-SRV02 -DestinationVolumeName F: -DestinationLogVolumeName G: `
  -DurationInMinutes 30 -ResultPath C:\Temp
New-SRPartnership -SourceComputerName SR-SRV01 -SourceRGName RG01 -SourceVolumeName F: `
  -SourceLogVolumeName G: -DestinationComputerName SR-SRV02 -DestinationRGName RG02 `
  -DestinationVolumeName F: -DestinationLogVolumeName G:
Get-SRGroup; (Get-SRGroup).Replicas | Select-Object NumOfBytesRemaining
# Reverse the direction (planned failover to SR-SRV02)
Set-SRPartnership -NewSourceComputerName SR-SRV02 -SourceRGName RG02 `
  -DestinationComputerName SR-SRV01 -DestinationRGName RG01
```

- Le **volume de destination est démonté** pendant la réplication ; un test de basculement (Windows Server 2019 et ultérieur) en monte temporairement un instantané accessible en écriture pour des tests ou des sauvegardes.
- Pour supprimer la réplication, exécutez `Remove-SRPartnership` sur la **source** uniquement et `Remove-SRGroup` sur les deux serveurs.
- Le réplica de stockage **n'est pas une sauvegarde** : une suppression est répliquée immédiatement. Il réplique aussi les clichés instantanés VSS, puisqu'il travaille sous le système de fichiers.

> **Piège d'examen.** Aucune perte de données pour un volume aux fichiers ouverts entre deux bâtiments : réplica de stockage (synchrone). La réplication DFS réplique les fichiers fermés avec des heures de latence, et le réplica Hyper-V protège des VM, pas des volumes.

<!-- section: smb-direct | objectives: 5.3.6 -->
## Configurer SMB Direct

SMB Direct est SMB sur des cartes réseau **RDMA** (iWARP, RoCE, InfiniBand) : débit élevé, faible latence et faible consommation de processeur, utilisé par Hyper-V sur SMB, le serveur de fichiers avec montée en puissance parallèle, S2D et le réplica de stockage.

- Exige des cartes compatibles RDMA sur les deux ordinateurs ; il est activé par défaut.
- **SMB Multichannel** détecte la capacité RDMA : désactiver Multichannel désactive SMB Direct.
- Les cartes RDMA peuvent être associées avec **SET** (Switch Embedded Teaming). La carte virtuelle d'une VM ne bénéficie pas de RDMA.
- Depuis Windows Server 2022, le chiffrement SMB fonctionne avec SMB Direct (les données sont chiffrées avant placement) au lieu de retomber à des performances proches de TCP.
- RoCE exige Data Center Bridging et des commutateurs correctement configurés ; pas iWARP.

```powershell
Get-NetAdapterRdma                      # RDMA enabled per adapter
Get-SmbServerNetworkInterface           # RDMA Capable column on the server
Get-SmbClientNetworkInterface           # same on the client
Get-SmbMultichannelConnection           # connections actually in use
Enable-NetAdapterRdma -Name "SLOT 2"
Set-NetOffloadGlobalSetting -NetworkDirect Enabled
```

<!-- section: storage-qos | objectives: 5.3.7 -->
## Configurer la qualité de service (QoS) du stockage

La QoS du stockage gère de façon centralisée les performances de stockage des **disques virtuels Hyper-V**, dans deux scénarios : des hôtes Hyper-V qui utilisent un **serveur de fichiers avec montée en puissance parallèle**, ou un cluster Hyper-V qui utilise des **volumes partagés de cluster**. La **Storage QoS Resource** (gestionnaire de stratégies) est créée automatiquement comme ressource principale du cluster ; Hyper-V la prend en charge par défaut. Sans stratégie, elle empêche déjà une VM d'affamer les autres.

- Les performances se mesurent en **IOPS normalisées** : chaque E/S de 8 Ko ou moins compte pour une ; une E/S de 256 Ko compte pour 32.
- Une stratégie a **MinimumIops** (réservation), **MaximumIops** (limite) et éventuellement **MaximumIOBandwidth** (octets par seconde) ; la première limite atteinte s'applique.

| Type de stratégie | S'applique |
| --- | --- |
| Dedicated (anciennement multi-instance) | Le minimum et le maximum à **chaque** disque virtuel attribué |
| Aggregated (anciennement single-instance) | Un minimum et un maximum partagés par **tous** les disques virtuels attribués ensemble (20 au plus) |

```powershell
# On the storage cluster
$policy = New-StorageQosPolicy -Name Desktop -PolicyType Dedicated -MinimumIops 100 -MaximumIops 200
# On the Hyper-V host
Get-VM -Name Build* | Get-VMHardDiskDrive | Set-VMHardDiskDrive -QoSPolicyID $policy.PolicyId
Get-StorageQosFlow | Sort-Object StorageNodeIOPS -Descending
Get-StorageQosPolicy -Name Desktop | Set-StorageQosPolicy -MaximumIops 300
```

> **Piège d'examen.** « Cinq VM SQL Server doivent se partager 5 000 IOPS au total » correspond à une stratégie **Aggregated** ; « chaque VM de bureau obtient au moins 100 et au plus 200 IOPS » correspond à une stratégie **Dedicated**.

<!-- section: key-points -->
## Points clés

- Initialisez les disques en GPT pour les volumes de plus de 2 To et pour le réplica de stockage ; on n'étend que dans l'espace adjacent ; ReFS ne se réduit pas.
- Minimums des espaces de stockage : miroir bidirectionnel 2 disques, miroir tridirectionnel 5, parité 3 ; disques vierges, d'au moins 4 Go, sans RAID.
- S2D : édition Datacenter, 2 à 16 serveurs, `New-Cluster -NoStorage`, `Enable-ClusterStorageSpacesDirect`, `New-Volume` ; le miroir tridirectionnel exige 3 serveurs, la parité double 4 ; résilience imbriquée pour deux serveurs.
- Réplica de stockage : niveau bloc, GPT, volumes de données et de journal, `Test-SRTopology` d'abord ; l'édition Standard se limite à un volume de 2 To.
- SMB Direct exige des cartes RDMA et SMB Multichannel ; association avec SET.
- QoS du stockage : IOPS normalisées de 8 Ko ; Dedicated par disque, Aggregated partagée.
