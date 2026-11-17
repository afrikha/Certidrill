Le système de fichiers détermine les fonctionnalités d'un volume, la déduplication des données récupère de l'espace sur les serveurs de fichiers et les hôtes VDI, le serveur cible iSCSI partage du stockage en mode bloc sur Ethernet, et BitLocker chiffre les volumes au repos. Les questions d'examen demandent quel système de fichiers exige une fonctionnalité, quel type d'utilisation de la déduplication convient à une charge, comment présenter un LUN à un cluster, et comment déverrouiller ou récupérer un volume chiffré.

<!-- section: ntfs-refs | objectives: 5.3.8 -->
## Sélectionner et configurer NTFS et ReFS

**NTFS** est le système de fichiers généraliste et le seul choix possible pour de nombreuses fonctionnalités ; **ReFS** (Resilient File System) vise l'intégrité et l'échelle, en particulier pour Hyper-V et les espaces de stockage direct.

| Fonctionnalité | NTFS | ReFS |
| --- | --- | --- |
| BitLocker, ACL, déduplication des données, CSV, clustering de basculement | Oui | Oui (déduplication depuis Windows Server 2019) |
| Volume de démarrage, supports amovibles | Oui | Non (le démarrage sur ReFS n'existe qu'en préversion) |
| Réduire un volume | Oui | Non |
| Quotas de disque, ID d'objet, transactions, noms courts | Oui | Non |
| Chiffrement du système de fichiers (EFS) | Oui | Windows Server 2025 uniquement |
| Transfert de données déchargé (ODX) | Oui | Non |
| Clonage de blocs, sparse VDL (création rapide de VHDX, fusion de points de contrôle) | Non | Oui |
| Flux d'intégrité (sommes de contrôle), réparation en ligne avec les copies des espaces de stockage | Non | Oui |
| Parité accélérée par miroir | Non | Oui, sur les espaces de stockage direct |
| Taille maximale de volume | 8 Po (Windows Server 2019 et ultérieur, clusters de 2 Mo) | 35 Po |

Fonctionnalités qui exigent **NTFS** : FSRM, la réplication DFS, les points de terminaison de serveur Azure File Sync, et les volumes SAN qui ont besoin du provisionnement dynamique, de TRIM/UNMAP ou d'ODX.

| Charge de travail | Système de fichiers |
| --- | --- |
| VHDX Hyper-V sur des CSV d'espaces de stockage direct | ReFS (`CSVFS_ReFS`) |
| Serveur de fichiers général avec quotas FSRM et DFS-R | NTFS |
| Cible de sauvegarde, archives sur des espaces de stockage | ReFS |
| CSV sur un SAN qui doit utiliser les E/S directes | NTFS |

La taille de cluster NTFS fixe la taille maximale du volume et des fichiers : 4 Ko (par défaut) permet 16 To, 64 Ko permet 256 To, 2 048 Ko permet 8 Po. ReFS prend en charge des clusters de 4 Ko (recommandé) et de 64 Ko. Pour les volumes dédupliqués ou ceux qui hébergent des fichiers VHDX de plus de 1 To, formatez en NTFS avec des clusters de 64 Ko et des segments d'enregistrement de fichier volumineux :

```powershell
Format-Volume -DriveLetter F -FileSystem NTFS -AllocationUnitSize 65536 -UseLargeFRS
Format-Volume -DriveLetter G -FileSystem ReFS -SetIntegrityStreams $true
```

> **Piège d'examen.** « Le volume doit prendre en charge les quotas FSRM », « doit héberger un dossier répliqué DFS-R » ou « devra être réduit plus tard » excluent tous ReFS. « Création de VHDX et fusion de points de contrôle les plus rapides » désigne ReFS.

<!-- section: data-deduplication | objectives: 5.3.5 -->
## Configurer la déduplication des données

La déduplication des données (`FS-Data-Deduplication`) repère des blocs identiques de taille variable dans les fichiers d'un volume, stocke chaque bloc une seule fois (éventuellement compressé) dans le **magasin de blocs** sous System Volume Information, et remplace les fichiers par des points d'analyse. Elle fonctionne en **post-traitement** : les données sont écrites normalement, puis optimisées par des travaux planifiés. Elle s'active par volume, sur NTFS, ou sur ReFS depuis Windows Server 2019.

```powershell
Install-WindowsFeature -Name FS-Data-Deduplication
C:\Windows\System32\DDPEval.exe E:\Shares     # estimate savings before enabling
Enable-DedupVolume -Volume E: -UsageType Default
Set-DedupVolume -Volume E: -MinimumFileAgeDays 5
Start-DedupJob -Volume E: -Type Optimization
Get-DedupStatus -Volume E:
```

| Type d'utilisation | Charge de travail | Stratégie |
| --- | --- | --- |
| Default | Serveurs de fichiers généraux : partages d'équipe, dossiers personnels, Dossiers de travail | Fichiers de plus de 3 jours ; ni fichiers en cours d'utilisation ni fichiers partiels |
| Hyper-V | Serveurs VDI | Fichiers de plus de 3 jours ; optimise les fichiers en cours d'utilisation et partiels |
| Backup | Applications de sauvegarde virtualisées comme DPM | Fichiers de plus de 0 jour ; optimisation prioritaire |

| Travail | Rôle | Planification par défaut |
| --- | --- | --- |
| Optimization | Découpe, compresse et stocke les données | Toutes les heures |
| Garbage Collection | Libère les blocs qui ne sont plus référencés après des suppressions ou des modifications | Samedi à 2 h 35 |
| Integrity Scrubbing | Détecte la corruption du magasin de blocs et répare à partir des copies miroir ou de parité | Samedi à 3 h 35 |
| Unoptimization | Annule la déduplication et la désactive sur le volume | Manuel uniquement |

L'espace libéré par la suppression de fichiers n'apparaît qu'après l'exécution du **Garbage Collection**. Économies typiques : documents utilisateurs 30 à 50 %, partages de déploiement 70 à 80 %, bibliothèques de virtualisation 80 à 95 %.

Interopérabilité :

- Clusters de basculement : installez la fonctionnalité sur **chaque nœud** ; lancez les travaux manuels sur le nœud propriétaire du CSV.
- Réplica de stockage : pris en charge ; n'exécutez pas la déduplication sur la copie de destination.
- Quotas : **pas de quota inconditionnel à la racine** d'un volume dédupliqué (les quotas conditionnels et les quotas de sous-dossiers fonctionnent ; les quotas comptent la taille logique).
- Non pris en charge : la virtualisation imbriquée, Windows client, les volumes à plusieurs niveaux de stockage sur S2D. Windows Search ignore les fichiers dédupliqués, et Robocopy peut corrompre le magasin de blocs.
- Mémoire : au moins 300 Mo plus 50 Mo par To de données logiques ; idéalement 1 Go par To.

> **Piège d'examen.** Un utilisateur supprime 2 To d'un volume dédupliqué et l'espace libre ne change pas : les blocs partagés sont libérés par le Garbage Collection, pas à la suppression. Exécutez `Start-DedupJob -Type GarbageCollection` au lieu de désactiver la déduplication.

Windows Server 2025 ajoute aussi la **déduplication et la compression natives de ReFS** pour les charges actives, distinctes de cette fonctionnalité.

<!-- section: iscsi | objectives: 5.3.9 -->
## Configurer et gérer iSCSI

Le **serveur cible iSCSI** (service de rôle `FS-iSCSITarget-Server`) fait de Windows Server un stockage en mode bloc sur Ethernet : il publie des **disques virtuels iSCSI** (fichiers `.vhdx`) au travers de **cibles**, et chaque cible liste les **initiateurs** autorisés à se connecter. Usages : stockage partagé pour des clusters de test ou invités, démarrage sans disque, applications qui exigent du stockage en mode bloc.

```powershell
# Target server
Install-WindowsFeature FS-iSCSITarget-Server
New-IscsiVirtualDisk -Path E:\iSCSI\LUN1.vhdx -SizeBytes 500GB          # dynamic unless -UseFixed
New-IscsiServerTarget -TargetName ClusterDisks `
  -InitiatorIds "IQN:iqn.1991-05.com.microsoft:node1.contoso.com","IQN:iqn.1991-05.com.microsoft:node2.contoso.com"
Add-IscsiVirtualDiskTargetMapping -TargetName ClusterDisks -Path E:\iSCSI\LUN1.vhdx
# Each initiator
Set-Service -Name MSiSCSI -StartupType Automatic; Start-Service MSiSCSI
New-IscsiTargetPortal -TargetPortalAddress 10.0.10.5
Connect-IscsiTarget -NodeAddress (Get-IscsiTarget).NodeAddress -IsPersistent $true
```

- Les ID d'initiateur ont le format `IdType:Value` avec `IQN`, `IPAddress`, `IPv6Address`, `DNSName` ou `MACAddress`. L'IQN de l'initiateur figure dans l'onglet **Configuration** de l'outil Initiateur iSCSI.
- **CHAP** : le CHAP unidirectionnel permet à la cible d'authentifier l'initiateur ; le CHAP mutuel authentifie aussi la cible (`-AuthenticationType ONEWAYCHAP` ou `MUTUALCHAP`).
- `-IsPersistent $true` rétablit la session après chaque redémarrage. Après la connexion, le disque apparaît hors connexion : mettez-le en ligne et initialisez-le une seule fois, depuis un seul nœud.
- **MPIO** pour des chemins redondants : installez `Multipath-IO` sur l'initiateur, revendiquez les périphériques iSCSI (`Enable-MSDSMAutomaticClaim -BusType iSCSI`), connectez-vous avec `-IsMultipathEnabled $true` sur chaque chemin.

| Limite | Valeur |
| --- | --- |
| Cibles par serveur cible iSCSI | 256 |
| Disques virtuels par serveur cible / par cible | 512 / 256 |
| Sessions par cible | 544 |
| Chemins MPIO | 4 |
| Nœuds de cluster de basculement pour un serveur cible en cluster | 8 |
| Taille maximale d'un VHDX (fixe, dynamique ou de différenciation) | 64 To |

> **Piège d'examen.** Un nouveau nœud ne voit pas le LUN du cluster alors qu'il s'est connecté au portail : son IQN ne figure pas dans la liste des initiateurs de la cible. Ajoutez-le avec `Set-IscsiServerTarget -InitiatorIds` sur le serveur cible.

<!-- section: bitlocker | objectives: 5.3.10 -->
## Gérer le chiffrement de lecteur BitLocker

BitLocker n'est pas installé par défaut sur Windows Server : installez la fonctionnalité `BitLocker` et redémarrez (`Install-WindowsFeature BitLocker -IncludeAllSubFeature -IncludeManagementTools -Restart`). Les disques durs chiffrés exigent aussi la fonctionnalité **Stockage étendu** (Enhanced Storage), que PowerShell n'ajoute pas.

| Protecteur | Usage |
| --- | --- |
| TPM | Le volume du système d'exploitation se déverrouille sans intervention si les composants de démarrage n'ont pas changé |
| TPM + code PIN / TPM + clé de démarrage | Authentification avant démarrage pour le volume du système d'exploitation |
| Mot de passe | Volumes de données |
| Mot de passe de récupération (48 chiffres) / clé de récupération (fichier `.bek`) | Récupération |
| Compte ou groupe AD (SID) | Volumes de données et disques de cluster ; ne déverrouille pas un volume du système d'exploitation avant démarrage |
| Réseau (basé sur un certificat) | Déverrouillage réseau du volume du système d'exploitation au redémarrage |

```powershell
Enable-BitLocker -MountPoint C: -EncryptionMethod XtsAes256 -UsedSpaceOnly -TpmProtector
Add-BitLockerKeyProtector -MountPoint C: -RecoveryPasswordProtector
$id = ((Get-BitLockerVolume C:).KeyProtector | Where-Object KeyProtectorType -eq RecoveryPassword).KeyProtectorId
Backup-BitLockerKeyProtector -MountPoint C: -KeyProtectorId $id     # to AD DS
Enable-BitLocker -MountPoint D: -PasswordProtector -Password (Read-Host -AsSecureString)
Enable-BitLockerAutoUnlock -MountPoint D:
Suspend-BitLocker -MountPoint C: -RebootCount 1                     # before a firmware update
```

- `-UsedSpaceOnly` ne chiffre que l'espace utilisé (rapide sur un nouveau volume) ; le chiffrement complet couvre aussi l'espace libre.
- **Suspendez** BitLocker avant une modification du microprogramme ou du démarrage, puis reprenez-le : la suspension laisse les données chiffrées mais arrête la vérification des protecteurs. `Disable-BitLocker` déchiffre le volume.
- Sauvegarde dans AD DS : les stratégies *Choisir comment les lecteurs du système d'exploitation protégés par BitLocker peuvent être récupérés* (et leur équivalent pour les lecteurs de données fixes) peuvent stocker les informations de récupération dans AD DS et refuser d'activer BitLocker tant qu'elles n'y sont pas stockées. Les données de récupération deviennent des objets enfants `ms-FVE-RecoveryInformation` de l'objet ordinateur.
- **Disques de cluster et CSV** : mettez le disque en mode maintenance (`Suspend-ClusterResource`), activez BitLocker avec un **protecteur de compte AD pour l'objet nom de cluster** (`-AdAccountOrGroupProtector -AdAccountOrGroup CLUSTER1$`), puis reprenez la ressource. Volume NTFS avec une lettre de lecteur pour l'étape initiale ; exige un contrôleur de domaine Windows Server 2012 ou ultérieur.

Le **déverrouillage réseau** redémarre des serveurs joints au domaine sans saisie de code PIN quand ils sont sur le réseau de l'entreprise : microprogramme UEFI avec DHCP sur la première carte réseau, protecteurs TPM et code PIN, un serveur **WDS** avec la fonctionnalité **BitLocker Network Unlock** (`BitLocker-NetworkUnlock`), un serveur DHCP distinct, un certificat RSA de 2 048 bits, et la stratégie *Autoriser le déverrouillage réseau au démarrage*. Hors du réseau, le serveur revient à l'invite TPM + code PIN.

> **Piège d'examen.** Un protecteur de compte AD seul ne déverrouille pas un volume du système d'exploitation au démarrage ; ce volume a aussi besoin d'un protecteur basé sur le TPM. Pour des serveurs qui doivent redémarrer sans intervention avec TPM + code PIN, la réponse est le déverrouillage réseau.

<!-- section: bitlocker-recovery | objectives: 5.3.11 -->
## Gérer et récupérer des volumes chiffrés

Un volume passe en **mode de récupération** quand BitLocker ne peut pas le déverrouiller normalement, par exemple après l'effacement ou la panne du TPM, une modification du microprogramme ou du gestionnaire de démarrage, le remplacement de la carte mère, trop de codes PIN erronés, un démarrage prioritaire sur DVD ou PXE, ou le déplacement du disque dans un autre ordinateur.

| Option de récupération | Détails |
| --- | --- |
| Mot de passe de récupération | 48 chiffres (huit blocs de six) ; stocké dans AD DS, Microsoft Entra ID, un fichier ou une impression |
| Clé de récupération | Fichier `.bek` sur un support amovible |
| Package de clés | Reconstruit les parties critiques d'un volume endommagé avec `repair-bde` ; stocké dans AD DS ou un fichier, jamais dans Microsoft Entra ID |
| Agent de récupération de données | Certificat dont la clé publique protège les lecteurs ; déverrouille un lecteur de données (un lecteur du système d'exploitation doit être attaché comme lecteur de données à un autre ordinateur) |

**Trouver le mot de passe de récupération dans AD DS.** L'écran de récupération affiche l'**ID du mot de passe**. Dans Utilisateurs et ordinateurs Active Directory avec la **visionneuse de mots de passe de récupération BitLocker** (une extension RSAT), ouvrez l'onglet **Récupération BitLocker** de l'objet ordinateur, ou faites un clic droit sur le domaine et utilisez **Rechercher le mot de passe de récupération BitLocker** avec les **huit premiers caractères** de l'ID du mot de passe (la recherche couvre la forêt). Par défaut, seuls les **Admins du domaine** lisent les informations de récupération ; déléguez l'accès en lecture au support technique.

```powershell
Unlock-BitLocker -MountPoint E: -RecoveryPassword 111111-222222-333333-444444-555555-666666-777777-888888
```

```text
manage-bde -status
manage-bde -unlock E: -RecoveryPassword 111111-222222-333333-444444-555555-666666-777777-888888
manage-bde -protectors -get C:
manage-bde -KeyPackage C: -id {GUID} -path F:\Packages
repair-bde C: D: -rp 111111-222222-333333-444444-555555-666666-777777-888888
repair-bde C: D: -kp F:\RecoveryKeyPackage -rk F:\RecoveryKey.bek -f
```

- `repair-bde` copie le contenu déchiffré du volume endommagé vers un **volume de sortie qu'il écrase entièrement**. Si les métadonnées BitLocker sont corrompues, il faut le **package de clés** en plus du mot de passe ou de la clé de récupération. Il ne répare pas un lecteur tombé en panne pendant le chiffrement ou le déchiffrement.
- Après la récupération, trouvez la cause (`manage-bde -status`, journal des événements) et corrigez-la : un code PIN oublié se réinitialise après le déverrouillage ; avant une mise à jour planifiée du microprogramme, suspendez BitLocker. Le déverrouillage par mot de passe de récupération réinitialise les mesures de validation du TPM selon la configuration actuelle.
- Les anciens mots de passe de récupération restent dans AD DS jusqu'à la suppression de l'objet ordinateur. Générez un nouveau mot de passe de récupération après la divulgation d'un mot de passe (supprimez l'ancien protecteur, ajoutez-en un nouveau, sauvegardez-le).

> **Piège d'examen.** Le support technique ne voit aucun mot de passe dans l'onglet Récupération BitLocker : soit les informations de récupération n'ont jamais été sauvegardées dans AD DS, soit le compte n'a pas les droits de lecture délégués. La visionneuse ne distingue pas les deux cas.

<!-- section: key-points -->
## Points clés

- ReFS : clonage de blocs, flux d'intégrité, 35 Po, pas de réduction, pas de démarrage, ni FSRM ni DFS-R ; NTFS pour tout le reste.
- Déduplication : post-traitement, types d'utilisation Default, Hyper-V, Backup ; l'espace revient après le Garbage Collection ; pas de quota inconditionnel à la racine du volume.
- iSCSI : disque virtuel, cible avec ID d'initiateur, mappage ; portail côté initiateur, connexion persistante, CHAP, MPIO.
- BitLocker : installer la fonctionnalité ; protecteurs basés sur le TPM pour les volumes du système d'exploitation ; sauvegarder les mots de passe de récupération dans AD DS ; protecteur CNO pour les disques de cluster ; le déverrouillage réseau exige WDS et DHCP UEFI.
- Récupération : ID du mot de passe, 8 premiers caractères, Admins du domaine par défaut ; package de clés et `repair-bde` pour les volumes endommagés.
