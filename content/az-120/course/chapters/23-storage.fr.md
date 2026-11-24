Les questions de stockage reposent sur la prise en charge : un type de disque non pris en charge pour un volume HANA, un Accélérateur d'écriture oublié, un mauvais paramètre de cache, un partage avec le mauvais protocole. Ce chapitre donne la matrice de prise en charge, puis l'entrelacement, la mise en cache, l'Accélérateur d'écriture, le chiffrement, Azure NetApp Files et Azure Files.

<!-- section: storage-types | objectives: 2.3.1 -->
## Choisir un type de stockage

Seuls quatre types de stockage sont certifiés pour `/hana/data` et `/hana/log` de SAP HANA : **SSD Premium (v1), SSD Premium v2, Disque Ultra et Azure NetApp Files (NFS v4.1)**.

| Usage | SSD Standard | SSD Premium | SSD Premium v2 | Disque Ultra | Azure NetApp Files | Azure Files (SSD) |
| --- | --- | --- | --- | --- | --- | --- |
| Disque du système d'exploitation | Hors production uniquement | Recommandé | Impossible | Impossible | Impossible | Impossible |
| `/hana/data` | Non pris en charge | Recommandé | Recommandé | Recommandé | Recommandé | Non pris en charge |
| `/hana/log` sur la famille M | Non pris en charge | Avec l'Accélérateur d'écriture | Recommandé | Recommandé | Recommandé | Non pris en charge |
| `/hana/log` sur la famille E | Non pris en charge | Non pris en charge | Recommandé | Recommandé | Recommandé | Non pris en charge |
| `/hana/shared` | Non pris en charge | Recommandé | Recommandé | Recommandé | Recommandé | Recommandé |
| `/sapmnt` | Hors production uniquement | Recommandé | Recommandé | Recommandé | Recommandé | Fortement recommandé |
| Données et journal d'une base autre que HANA | Hors production uniquement | Recommandé | Recommandé | Recommandé | Limité (versions précises de SGBD) | Non pris en charge |

| Type | Faits clés |
| --- | --- |
| SSD Premium | Performances fixées par le niveau de taille (P10, P15...) ; bursting sur les disques jusqu'à 512 Gio ; mise en cache de l'hôte ; Accélérateur d'écriture sur la famille M |
| SSD Premium v2 | Taille, IOPS et débit définis indépendamment ; 3 000 IOPS et 125 Mo/s inclus par disque ; ni mise en cache de l'hôte, ni bursting, pas de disque du système d'exploitation ; machines virtuelles zonales dans la plupart des régions (groupes à haute disponibilité uniquement dans quelques régions sans zones de disponibilité, après inscription de la fonctionnalité) ; quatre changements de performances par période de 24 heures |
| Disque Ultra | Latence la plus faible ; disques de données uniquement, créés vides ; pas de mise en cache ; machine virtuelle seule ou zones de disponibilité, **pas de groupes à haute disponibilité** ; IOPS et débit modifiables sans redémarrage |
| Azure NetApp Files | Volumes NFS (et SMB) ; moins de 1 ms ; niveaux de service ; instantanés ; réplication entre zones et entre régions |
| Azure Files (SSD) | Partages NFS v4.1 ou SMB ; LRS ou ZRS ; pour les systèmes de fichiers SAP partagés, jamais pour les fichiers de base de données |
| HDD Standard | Sauvegardes et systèmes retirés rarement utilisés uniquement |

Règles qui décident des réponses :

- Les nouvelles machines virtuelles SAP utilisent des **disques managés** ; les déploiements zonaux les exigent.
- Les fichiers de données et de journal des bases de données utilisent **LRS** uniquement : le stockage de blocs Azure conserve déjà trois copies, donc aucune redondance RAID n'est nécessaire.
- Avec HANA System Replication, les deux réplicas utilisent le même type de stockage pour `/hana/data` et le même pour `/hana/log`. Mélanger les types entre volumes d'un même système est pris en charge (par exemple, données sur SSD Premium v2 et journal sur Disque Ultra).

> **Piège d'examen.** « Latence la plus faible pour `/hana/log` dans un groupe à haute disponibilité » ne peut pas être le Disque Ultra : le Disque Ultra ne prend pas en charge les groupes à haute disponibilité.

<!-- section: striping | objectives: 2.3.2 -->
## Entrelacement de disques et volumes simples

Entrelacer plusieurs disques avec LVM (ou mdadm) additionne leurs IOPS et leur débit : trois disques P30 donnent trois fois les IOPS et le débit d'un P30.

| Situation | Choix |
| --- | --- |
| SSD Premium v1 pour `/hana/data` ou `/hana/log` | **Entrelacer** : plusieurs petits disques offrent souvent le meilleur rapport prix/performances (deux P15 entrelacés atteignent 250 Mio/s ; un seul disque exige un P40) |
| SSD Premium v2 ou Disque Ultra | Un **volume simple** suffit, car IOPS et débit sont provisionnés par disque ; entrelacer du SSD Premium v2 est une option pour profiter des 3 000 IOPS et 125 Mo/s inclus avec chaque disque |
| Partages NFS ou SMB (Azure NetApp Files, Azure Files) | Ne peuvent pas être entrelacés ; utilisez le partitionnement du volume de données HANA (HANA 2.0 SPS03 ou ultérieur) sur plusieurs volumes pour plus de débit |
| `/hana/shared`, `/usr/sap`, système d'exploitation | Volume simple |

Règles d'entrelacement : taille de bande **256 Ko pour `/hana/data`** et **64 Ko pour `/hana/log`** ; tous les disques d'un ensemble entrelacé ont la même taille (et les mêmes IOPS et débit pour SSD Premium v2 et Disque Ultra) ; des groupes de volumes séparés pour les données, le journal et shared, jamais le groupe de volumes racine ; ni RAID 1 ni RAID 5.

```bash
sudo pvcreate /dev/disk/azure/scsi1/lun0 /dev/disk/azure/scsi1/lun1 /dev/disk/azure/scsi1/lun2
sudo vgcreate vg_hana_data_HN1 /dev/disk/azure/scsi1/lun0 /dev/disk/azure/scsi1/lun1 /dev/disk/azure/scsi1/lun2
sudo lvcreate --stripes 3 --stripesize 256 --extents 100%FREE --name hana_data vg_hana_data_HN1
sudo mkfs.xfs /dev/vg_hana_data_HN1/hana_data
```

<!-- section: storage-security | objectives: 2.3.3 -->
## Considérations de sécurité du stockage

- **Isolation réseau** : points de terminaison privés pour Azure Files et le Stockage Blob, accès réseau public désactivé ; les volumes Azure NetApp Files ne sont accessibles que depuis le réseau virtuel du sous-réseau délégué et les réseaux connectés par peering.
- **L'autorisation NFS repose sur le réseau** : les partages de fichiers Azure NFS n'ont pas d'authentification basée sur l'identité, l'accès est donc limité par point de terminaison privé ou par règles de réseau virtuel. Azure NetApp Files utilise des **stratégies d'exportation** (adresses IP clientes autorisées, lecture-écriture ou lecture seule, accès root).
- **UID et GID** : les ID de l'utilisateur `<sid>adm` et du groupe `sapsys` doivent être identiques sur chaque machine virtuelle qui monte les volumes NFS, sinon les fichiers apparaissent comme appartenant à `nobody`.
- **Partages SMB pour Windows** : joignez le compte de stockage à AD DS, donnez aux comptes SAP le rôle **Storage File Data SMB Share Elevated Contributor** et définissez les ACL NTFS (`<sid>adm`, `SAPService<SID>`, `SAP_<SID>_GlobalAdmin`, compte d'ordinateur du cluster) **avant** d'exécuter SAPinst.

<!-- section: data-protection | objectives: 2.3.4 -->
## Protection des données

| Mécanisme | Ce qu'il protège | Remarques |
| --- | --- | --- |
| Sauvegarde Azure pour SAP HANA | Bases HANA, en flux via Backint | Certifié Backint ; RPO minimal de 15 minutes ; exige l'exécution du script de préinscription sur la machine virtuelle HANA |
| Instantanés d'instance HANA de Sauvegarde Azure | Disques de données HANA, cohérents pour HANA | Sauvegarde et restauration instantanées ; les instantanés restent sur du stockage HDD Standard, pas dans le coffre |
| Sauvegarde de machine virtuelle Azure | Machine virtuelle entière (serveurs d'applications, services centraux) | Sauvegarde les disques de données avec Accélérateur d'écriture (pas d'instantané d'un disque du système d'exploitation avec Accélérateur d'écriture) ; Disque Ultra et SSD Premium v2 exigent la stratégie Enhanced ; disques partagés non pris en charge |
| Instantanés incrémentiels de disques managés | Disques individuels | Stockés sur HDD Standard, en ZRS là où il est disponible ; jusqu'à 500 par disque ; les instantanés de SSD Premium v2 et de Disque Ultra ne sont utilisables qu'une fois la copie en arrière-plan terminée, sauf si l'accès instantané est activé à la création de l'instantané ; au plus trois instantanés en cours par disque |
| Instantanés Azure NetApp Files | Volumes | Économes en espace ; cohérents avec l'application pour HANA avec **AzAcSnap** (ou SnapCenter) |

Instantané HANA cohérent avec l'application sur Azure NetApp Files :

```text
BACKUP DATA FOR FULL SYSTEM CREATE SNAPSHOT COMMENT 'SNAPSHOT-2026-11-17:02:00';
az netappfiles snapshot create -g RG-SAP-PRD --account-name anf-prd --pool-name pool-ultra --volume-name hn1-data --name snap-20261117
BACKUP DATA FOR FULL SYSTEM CLOSE SNAPSHOT BACKUP_ID <backup id> SUCCESSFUL 'SNAPSHOT-2026-11-17:02:00';
```

L'instantané de stockage est pris sur `/hana/data` uniquement. La fermeture de l'instantané HANA est obligatoire : un instantané HANA resté ouvert fait croître le besoin en mémoire et peut arrêter HANA.

> **Piège d'examen.** Un instantané sur le même volume n'est pas une sauvegarde protégée. Copiez au moins un instantané par jour vers un autre emplacement (un autre environnement, une autre région Azure ou le Stockage Blob).

<!-- section: disk-caching | objectives: 2.3.5 -->
## Mise en cache des disques

La mise en cache de l'hôte n'existe que sur le SSD Premium (v1) et les disques Standard ; le SSD Premium v2 et le Disque Ultra n'en ont pas.

| Volume | Paramètre de cache |
| --- | --- |
| Disque du système d'exploitation | Conserver la valeur par défaut définie par Azure à la création (ReadWrite) |
| `/hana/data` | None ou ReadOnly |
| `/hana/log` | **None** ; sur la famille M, None + Accélérateur d'écriture (obligatoire) |
| `/hana/shared` | ReadOnly |
| Fichiers de données SQL Server | ReadOnly |
| Fichier journal SQL Server | None |
| tempdb SQL Server sur un disque de données | None (ou placez-la sur le lecteur temporaire D:) |
| Ensemble entrelacé contenant données et journal (systèmes économiques) | None |

- **Aucun volume de base de données SAP n'utilise la mise en cache ReadWrite**.
- Sur certaines tailles M(b)v3, le SSD Premium avec cache en lecture peut donner moins d'IOPS et de débit que des disques sans cache.

> **Piège d'examen.** L'Accélérateur d'écriture se définit avec la mise en cache : les combinaisons autorisées sont None + Accélérateur d'écriture et ReadOnly + Accélérateur d'écriture. ReadWrite + Accélérateur d'écriture n'existe pas.

<!-- section: write-accelerator | objectives: 2.3.6 -->
## Configurer l'Accélérateur d'écriture

L'Accélérateur d'écriture (Write Accelerator) réduit la latence d'écriture des journaux de transactions sur les **machines virtuelles de la famille M** avec des **disques managés SSD Premium**.

- Utilisez-le **uniquement pour les volumes de journal** (`/hana/log`, journal SQL Server, redo Oracle, journal Db2), pas pour les volumes de données. Pour HANA sur la famille M avec SSD Premium, il est **obligatoire** sur `/hana/log` : la certification HANA des machines virtuelles de la famille M le suppose.
- Non disponible sur SSD Premium v2 ni sur Disque Ultra (ils n'en ont pas besoin), ni sur les familles autres que M.
- La mise en cache doit être None ou ReadOnly.
- Seules les E/S de 64 Kio ou moins empruntent le chemin accéléré.
- Le nombre de disques avec Accélérateur d'écriture et leurs IOPS sont limités **par machine virtuelle** (partagés par tous les disques accélérés) :

| Taille de machine virtuelle | Nombre max. de disques avec Accélérateur d'écriture | IOPS de l'Accélérateur d'écriture par machine virtuelle |
| --- | --- | --- |
| M32ms, M32ls, M32ts | 4 | 5 000 |
| M64ms, M64s, M64ds_v2 | 8 | 10 000 |
| M128ms, M128s, M416ms_v2 | 16 | 20 000 |
| Standard_M48ds_1_v3 | 4 | 5 000 |
| Standard_M176ds_4_v3 | 16 | 20 000 |

```bash
# Existing disk at LUN 1
az vm update --resource-group RG-SAP-PRD --name hdbprd01 --write-accelerator 1=true
# Attach an existing disk with Write Accelerator
az vm disk attach --resource-group RG-SAP-PRD --vm-name hdbprd01 --name hdbprd01-log2 --enable-write-accelerator
```

```powershell
$vm = Get-AzVM -ResourceGroupName RG-SAP-PRD -Name hdbprd01
Set-AzVMDataDisk -VM $vm -Name hdbprd01-log1 -Caching None -WriteAccelerator:$true
Update-AzVM -ResourceGroupName RG-SAP-PRD -VM $vm
```

Ordre des opérations : arrêtez la base de données qui utilise le disque ; pour un volume entrelacé sur plusieurs disques, **arrêtez la machine virtuelle** et activez l'Accélérateur d'écriture sur **chaque** disque du volume. L'activer sur le disque du système d'exploitation redémarre la machine virtuelle (et n'est pas nécessaire pour SAP).

<!-- section: encryption | objectives: 2.3.7 -->
## Chiffrement du stockage, des disques et des données

| Option | Ce qu'elle chiffre | Clés |
| --- | --- | --- |
| Chiffrement côté serveur (SSE) | Données des disques managés au repos sur les clusters de stockage ; toujours actif | Gérées par la plateforme, ou gérées par le client via un **jeu de chiffrement de disque** (Key Vault ou HSM managé) |
| Chiffrement au niveau de l'hôte (encryption at host) | Ajoute les disques temporaires et les caches de disque, et chiffre les données qui transitent vers le stockage | Comme SSE (disques temporaires : clés gérées par la plateforme uniquement) |
| Azure Disk Encryption (ADE) | Disques du système d'exploitation et de données dans la machine virtuelle (DM-Crypt, BitLocker) | Key Vault, clé de chiffrement de clé facultative ; utilise le processeur de la machine virtuelle |
| Chiffrement de disque confidentiel | Disque du système d'exploitation lié au TPM de la machine virtuelle | Tailles de machines virtuelles confidentielles |
| Chiffrement de la base de données | Chiffrement des volumes de données et de journal HANA, TDE de SQL Server (pris en charge par SAP), TDE d'Oracle | Géré par le SGBD |
| Azure Files et Azure NetApp Files | Chiffrés au repos ; clés gérées par le client prises en charge | Chiffrement en transit : chiffrement SMB 3, ou TLS pour NFS via l'assistant de montage AZNFS |

- **ADE sera mis hors service le 15 septembre 2028** : après cette date, les disques chiffrés par ADE ne se déverrouillent plus au redémarrage. Migrez vers le **chiffrement au niveau de l'hôte**, que Microsoft recommande pour les nouvelles machines virtuelles.
- La migration d'ADE vers le chiffrement au niveau de l'hôte ne se fait pas sur place : elle exige de nouveaux disques et de nouvelles machines virtuelles, et ADE ne peut pas être désactivé sur un disque du système d'exploitation Linux.
- ADE utilise le processeur de la machine virtuelle et ne fonctionne pas avec les images Linux personnalisées ; SSE et le chiffrement au niveau de l'hôte n'ont aucune de ces limites.

> **Conseil d'examen.** « Chiffrer le disque temporaire et le cache d'une machine virtuelle SAP sans surcharge processeur » désigne le chiffrement au niveau de l'hôte, pas ADE.

<!-- section: azure-netapp-files | objectives: 2.3.8 -->
## Volumes avec Azure NetApp Files

Hiérarchie : **compte NetApp** (par région) → **pool de capacité** (niveau de service, 1 Tio minimum, extensible par 1 Tio) → **volumes** (NFS v3, NFS v4.1 ou SMB).

| Niveau de service | Débit par Tio avec la QoS automatique |
| --- | --- |
| Standard | 16 Mio/s |
| Premium | 64 Mio/s |
| Ultra | 128 Mio/s |

Avec la **QoS manuelle**, le débit est attribué par volume indépendamment de sa taille, dans la limite du total du pool : un grand volume de données et un petit volume de journal rapide peuvent partager un pool sans surdimensionnement.

| Volume HANA | Indicateur minimal | Taille en Premium | Taille en Ultra | NFS |
| --- | --- | --- | --- | --- |
| `/hana/log` | 250 Mo/s en écriture | 4 Tio | 2 Tio | v4.1 |
| `/hana/data` | 400 Mo/s en lecture, 250 Mo/s en écriture | 6,3 Tio | 3,2 Tio | v4.1 |
| `/hana/shared` (scale-up) | | Min(1 To, 1 x RAM) | Min(1 To, 1 x RAM) | v3 ou v4.1 |

Règles de conception :

- **NFS v4.1 est obligatoire** pour `/hana/data` et `/hana/log` ; v3 n'est autorisé que pour les volumes shared et de sauvegarde.
- Même région et réseau virtuel identique ou connecté par peering ; sous-réseau délégué (`/25` recommandé).
- La latence depuis la machine virtuelle de base de données doit rester **inférieure à 1 ms** : placez les volumes dans la **même zone de disponibilité** que la machine virtuelle (suffisant dans la plupart des régions), ou utilisez le **groupe de volumes d'application pour SAP HANA**, qui place les volumes de données et de journal sur des contrôleurs de stockage différents. Avec un groupe de placement de proximité, le groupe de volumes d'application exige une demande à Microsoft pour épingler le groupe à haute disponibilité au matériel, ce qui limite les changements ultérieurs de taille et de famille de machine virtuelle : réservez cette méthode aux systèmes qui exigent la latence la plus faible.
- Une session NFS écrit de 1,2 à 1,4 Go/s ; `nconnect` ajoute des sessions.
- Les volumes se redimensionnent en ligne, sans démontage ni arrêt de HANA.
- HANA scale-out avec des **nœuds de secours** exige Azure NetApp Files.
- Le trafic ANF utilise la bande passante **réseau** de la machine virtuelle, pas sa bande passante de stockage.

```text
10.3.1.4:/hn1-data-mnt00001 /hana/data/HN1/mnt00001 nfs rw,nfsvers=4.1,hard,timeo=600,rsize=262144,wsize=262144,noatime,lock,_netdev,sec=sys 0 0
```

<!-- section: azure-files | objectives: 2.3.9 -->
## Volumes avec Azure Files

Azure Files sert les **systèmes de fichiers SAP partagés**, jamais les fichiers de base de données.

| | Partages NFS | Partages SMB |
| --- | --- | --- |
| Clients | Linux uniquement (NFS n'est pas pris en charge pour Windows) | Windows |
| Usage SAP | `/sapmnt/<SID>`, `/usr/sap/trans`, `/usr/sap/<SID>/SYS`, répertoires ASCS/ERS, `/hana/shared` | Partage `sapmnt` pour ASCS/SCS sur un cluster de basculement Windows, répertoire de transport |
| Compte | Partages de fichiers SSD (premium) ; compte FileStorage pour les partages classiques | Premium en production, Standard suffisant hors production |
| Redondance | LRS ou ZRS (pas de GRS) | LRS ou ZRS |
| Authentification | Réseau uniquement (point de terminaison privé ou règles de réseau virtuel) | Compte de stockage joint à AD DS, rôle RBAC et ACL NTFS |
| Taille | 100 Gio minimum ; les performances suivent la taille provisionnée | 256 Gio par SID comme taille de départ |

Règles NFS pour SAP :

- Choisissez **ZRS** quand les machines virtuelles sont réparties sur des zones : les données sont répliquées de façon synchrone sur trois zones, et les clients NFS passent à une zone saine sans remontage.
- Sélectionnez **No root squash**, utilisez un **point de terminaison privé**, et soit utilisez le chiffrement en transit avec l'assistant de montage AZNFS (`fstype aznfs`), soit, pour monter sans TLS, désactivez **Exiger le chiffrement en transit pour NFS** sur le compte de stockage. Ce paramètre est activé par défaut sur les comptes créés dans le portail ; tant qu'il n'est pas sélectionné, **Transfert sécurisé requis** contrôle NFS, et un montage sans TLS expire s'il est activé.
- Un partage `sapmnt` par système SAP, aucun autre usage pour `sapmnt` et `saptrans`, au plus environ cinq systèmes SAP par compte de stockage, production et hors production dans des comptes différents.
- `/usr/sap/<SID>/J<nr>` des systèmes SAP Java n'est pas pris en charge sur Azure Files NFS.
- Azure Files n'a pas de réplication automatique entre régions.

```text
sapnfs.file.core.windows.net:/sapnfs/sapnw1/sapmntNW1 /sapmnt/NW1 nfs noresvport,vers=4,minorversion=1,sec=sys 0 0
```

Règles SMB pour SAP (Windows) : exécutez le script Azure Files qui joint le compte de stockage à AD DS, attribuez **Storage File Data SMB Share Elevated Contributor** à `<sid>adm`, `SAPService<SID>` et `SAP_<SID>_GlobalAdmin`, définissez des ACL de contrôle total sur `sapmnt` avant SAPinst, et utilisez le noyau SAP 7.22 ou ultérieur avec un SWPM récent. Placez `sapmnt` et le répertoire de transport dans des comptes de stockage différents, sauf pour les petits systèmes.

| Exigence | Réponse |
| --- | --- |
| `/sapmnt` partagé pour un cluster ASCS/ERS Linux zonal, managé, sans machines virtuelles de serveur NFS | Azure Files NFS en ZRS |
| `/hana/data` ou `/hana/log` sur un service de fichiers | Azure NetApp Files (NFS v4.1) |
| HANA scale-out avec nœud de secours | Azure NetApp Files |
| Partage de fichiers pour un cluster ASCS/SCS Windows | Azure Files SMB (ou Azure NetApp Files SMB) |

> **Piège d'examen.** Azure Files ZRS est synchrone entre zones, mais ne réplique pas vers une autre région : la reprise d'activité de `sapmnt` entre régions exige un autre mécanisme. Learn indique une réplication personnalisée (comme rsync) pour NFS sur Azure Files, et la réplication entre régions pour Azure NetApp Files.

<!-- section: key-points -->
## Points clés

- Données et journal HANA : SSD Premium, SSD Premium v2, Disque Ultra ou Azure NetApp Files NFS v4.1 uniquement ; jamais Azure Files.
- HANA sur la famille E ne peut pas placer `/hana/log` sur du SSD Premium v1 ; le Disque Ultra ne prend pas en charge les groupes à haute disponibilité ; SSD Premium v2 et Disque Ultra n'ont ni mise en cache ni Accélérateur d'écriture.
- Entrelacez le SSD Premium v1 avec LVM (256 Ko données, 64 Ko journal) ; volumes simples sur SSD Premium v2 et Disque Ultra ; les partages ne s'entrelacent pas.
- Mise en cache : données None ou ReadOnly, journal None, shared ReadOnly, jamais ReadWrite pour les bases de données.
- Accélérateur d'écriture : famille M, SSD Premium, volumes de journal uniquement, cache None ou ReadOnly, limites de disques et d'IOPS par machine virtuelle, tous les disques d'un volume entrelacé.
- Le chiffrement au niveau de l'hôte remplace ADE (mis hors service le 15 septembre 2028).
- Azure NetApp Files : niveau de service × taille = débit (ou QoS manuelle), même zone pour moins de 1 ms, groupe de volumes d'application pour HANA.
- Azure Files : NFS pour les systèmes de fichiers partagés Linux, SMB pour Windows ; ZRS entre zones ; points de terminaison privés.
