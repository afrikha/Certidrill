Un serveur de fichiers Windows Server combine les autorisations de partage et NTFS, les stratégies du Gestionnaire de ressources du serveur de fichiers (FSRM), les espaces de noms DFS et la réplication DFS, et des paramètres SMB que Windows Server 2025 a renforcés. Les questions d'examen décrivent un utilisateur qui ne peut pas ouvrir ou enregistrer un fichier, une succursale qui a besoin d'un seul chemin vers plusieurs serveurs, ou une exigence de sécurité sur le trafic SMB, et demandent quel paramètre ou quelle cmdlet y répond.

<!-- section: share-access | objectives: 5.2.1 -->
## Configurer l'accès aux partages de fichiers

Deux ensembles d'autorisations s'appliquent à un fichier ouvert par le réseau, et le **plus restrictif** des deux résultats effectifs l'emporte :

| Couche | Où | Valeurs | S'applique à |
| --- | --- | --- | --- |
| Autorisations de partage | Propriétés du partage, `New-SmbShare`, `Grant-SmbShareAccess` | Contrôle total, Modifier, Lire (et refus) | L'accès réseau uniquement |
| Autorisations NTFS | Onglet Sécurité du dossier, `icacls` | Contrôle total, Modification, Lecture et exécution, Affichage du contenu du dossier, Lecture, Écriture, spéciales | L'accès local et réseau |

Dans chaque couche, les autorisations de tous les groupes de l'utilisateur s'additionnent et un refus explicite l'emporte. Une conception courante donne **Contrôle total à Tout le monde ou aux Utilisateurs authentifiés** sur le partage et contrôle tout par NTFS.

```powershell
New-SmbShare -Name Finance -Path D:\Shares\Finance `
  -FullAccess "CONTOSO\File Admins" -ChangeAccess "CONTOSO\Finance Users" `
  -FolderEnumerationMode AccessBased -CachingMode None
Grant-SmbShareAccess -Name Finance -AccountName "CONTOSO\Auditors" -AccessRight Read -Force
Get-SmbShareAccess -Name Finance
```

| Exigence | Paramètre |
| --- | --- |
| Les utilisateurs ne voient que les dossiers qu'ils peuvent ouvrir | Énumération basée sur l'accès : `-FolderEnumerationMode AccessBased` (Gestionnaire de serveur : *Activer l'énumération basée sur l'accès*) |
| Pas de copies hors connexion du partage sur les clients | `-CachingMode None` (autres valeurs : Manual, Documents, Programs, BranchCache) |
| Le partage survit sans interruption au basculement d'un nœud (Hyper-V, SQL Server) | `-ContinuouslyAvailable` sur un serveur de fichiers en cluster ou un serveur de fichiers avec montée en puissance parallèle |
| Limiter les connexions simultanées | `-ConcurrentUserLimit` (0 = illimité, la valeur par défaut) |
| Chiffrer le trafic de ce seul partage | `-EncryptData $true` |

> **Piège d'examen.** Un utilisateur qui a Modification en NTFS mais Lire sur le partage peut seulement lire par le réseau ; le même utilisateur connecté localement sur le serveur peut modifier. Quand « l'accès fonctionne en local mais pas depuis le réseau », vérifiez les autorisations de partage.

Depuis Windows Server 2025, la création d'un partage active le groupe de pare-feu **File and Printer Sharing (Restrictive)**, qui n'ouvre plus les ports NetBIOS 137 à 139.

<!-- section: fsrm | objectives: 5.2.2 -->
## Configurer le Gestionnaire de ressources du serveur de fichiers (FSRM)

FSRM est un service de rôle des Services de fichiers et de stockage (`Install-WindowsFeature FS-Resource-Manager -IncludeManagementTools`). Il fonctionne sur les **volumes NTFS uniquement**, pas sur ReFS.

| Fonctionnalité | Rôle | Exemple |
| --- | --- | --- |
| Gestion des quotas | Limite l'espace d'un volume ou d'un dossier, avec des seuils de notification | 200 Mo par dossier personnel, avertissement à 180 Mo |
| Gestion du filtrage des fichiers | Contrôle les types de fichiers (par groupe de fichiers) qu'on peut enregistrer | Bloquer les fichiers audio et vidéo dans les partages utilisateurs |
| Infrastructure de classification des fichiers | Définit des propriétés de classification sur les fichiers, par dossier ou par règles de contenu | Marquer les fichiers qui contiennent des données clients |
| Tâches de gestion des fichiers | Agissent sur des fichiers choisis par emplacement, classification ou dates | Expirer les fichiers non modifiés depuis 10 ans |
| Rapports de stockage | Rendent compte de l'usage, des groupes de fichiers, des propriétaires, des doublons, des quotas et du filtrage | Rapport hebdomadaire des fichiers volumineux |

**Quotas.** Un **quota inconditionnel** (hard) empêche d'enregistrer au-delà de la limite ; un **quota conditionnel** (soft) envoie seulement des notifications (surveillance). Un **quota automatique** applique un modèle à chaque sous-dossier existant et futur d'un chemin (un quota par dossier d'utilisateur). Créez les quotas à partir de **modèles** : mettre à jour un modèle peut mettre à jour tous les quotas qui en dérivent. Les quotas FSRM s'appliquent à un dossier ou à un volume pour tous les utilisateurs, contrairement aux quotas de disque NTFS, définis par utilisateur et par volume.

**Filtres de fichiers.** Un filtre **actif** bloque l'enregistrement des fichiers des **groupes de fichiers** choisis (modèles comme `*.mp3`) ; un filtre **passif** autorise l'enregistrement mais notifie (audit). Une **exception de filtre de fichiers** sur un sous-dossier autorise des groupes de fichiers bloqués par un filtre sur un dossier parent. Les filtres ne suppriment pas les fichiers enregistrés avant leur création.

Les notifications peuvent envoyer un e-mail, écrire dans le journal des événements, exécuter une commande ou générer un rapport. L'e-mail exige d'abord le serveur SMTP défini dans les options de FSRM.

```powershell
New-FsrmQuota -Path "D:\Shares\Projects" -Size 10GB -Description "Hard limit"
New-FsrmQuota -Path "D:\Shares\Temp" -Size 2GB -SoftLimit
New-FsrmFileScreen -Path "D:\Shares\Users" -IncludeGroup "Audio and Video Files" -Active
New-FsrmFileScreen -Path "D:\Shares\Public" -IncludeGroup "Executable Files" -Active:$false
```

> **Piège d'examen.** « Avertir quand les utilisateurs dépassent 5 Go sans les bloquer » est un quota conditionnel ; « journaliser les tentatives d'enregistrer des exécutables sans les bloquer » est un filtre passif. Le quota inconditionnel et le filtre actif sont les variantes bloquantes.

Les outils en ligne de commande sont `dirquota.exe` (quotas), `filescrn.exe` (filtres) et `storrept.exe` (rapports).

<!-- section: dfs | objectives: 5.2.3 -->
## Implémenter et configurer DFS

Les **espaces de noms DFS** (`FS-DFS-Namespace`) regroupent des dossiers partagés de plusieurs serveurs sous un seul chemin. Un espace de noms a une racine, des dossiers et des **cibles de dossier** (chemins UNC vers de vrais partages) ; le client reçoit une référence vers une cible, classée par défaut selon le coût des sites AD DS.

| Caractéristique | Autonome | Basé sur un domaine, mode Windows Server 2008 |
| --- | --- | --- |
| Chemin | `\\ServerName\RootName` | `\\contoso.com\RootName` |
| Métadonnées stockées dans | Le Registre du serveur d'espaces de noms | AD DS et le cache de chaque serveur d'espaces de noms |
| Haute disponibilité | Cluster de basculement | Plusieurs serveurs d'espaces de noms dans le même domaine |
| Énumération basée sur l'accès | Oui | Oui |
| Exigences | Aucune (AD DS non requis) | Niveau fonctionnel de forêt Windows Server 2003, de domaine Windows Server 2008 |

L'ancien **mode Windows 2000 Server** basé sur un domaine ne prend pas en charge l'énumération basée sur l'accès et se limite à environ 5 000 dossiers avec cibles ; le mode Windows Server 2008 en recommande jusqu'à 50 000.

```powershell
Install-WindowsFeature FS-DFS-Namespace, RSAT-DFS-Mgmt-Con
New-DfsnRoot -Path "\\contoso.com\Public" -TargetPath "\\FS1\Public" -Type DomainV2
New-DfsnFolder -Path "\\contoso.com\Public\Tools" -TargetPath "\\LDN-FS1\Tools"
New-DfsnFolderTarget -Path "\\contoso.com\Public\Tools" -TargetPath "\\NYC-FS1\Tools"
```

L'énumération basée sur l'accès sur un espace de noms masque les dossiers DFS aux utilisateurs sans autorisation (`dfsutil property abe enable \\contoso.com\Public`), mais elle ne bloque pas l'accès à un chemin connu : seules les autorisations de partage et NTFS de la cible le font.

La **réplication DFS** (`FS-DFS-Replication`) synchronise des dossiers entre les membres d'un **groupe de réplication**, en multimaître, avec la **compression différentielle à distance** (RDC) qui n'envoie que les blocs modifiés (fichiers de 64 Ko ou plus).

- Volumes NTFS uniquement (ni ReFS, ni FAT, ni volumes partagés de cluster).
- **Réplication initiale** : le **membre principal** fait autorité ; ses fichiers l'emportent dans les conflits avec les autres membres. Préamorcez les gros volumes de données avec Robocopy pour réduire le trafic initial.
- Pas de verrouillage de fichiers distribué : quand deux utilisateurs modifient le même fichier sur deux membres, la dernière écriture gagne et l'autre version part dans `DfsrPrivate\ConflictandDeleted` (récupération avec `Restore-DfsrPreservedFiles`).
- Un dossier répliqué peut être en **lecture seule** sur un membre (par exemple une copie de succursale).
- À travers un pare-feu, DFS-R a besoin du mappeur de points de terminaison RPC (TCP 135) et d'un port RPC dynamique, que `Set-DfsrMachineConfiguration` peut rendre statique.
- Depuis le niveau fonctionnel de domaine Windows Server 2008, DFS-R réplique aussi **SYSVOL**.

> **Piège d'examen.** Les espaces de noms DFS donnent un chemin ; la réplication DFS copie les données. Deux cibles de dossier sans réplication affichent un contenu différent selon la référence. Et DFS-R n'est pas un outil de reprise d'activité pour les fichiers ouverts : c'est le rôle du réplica de stockage.

<!-- section: smb-over-quic | objectives: 5.2.4 -->
## Configurer SMB sur QUIC

SMB sur QUIC transporte SMB dans un tunnel **TLS 1.3** sur le **port UDP 443** au lieu du port TCP 445 : les utilisateurs distants joignent un serveur de fichiers de périphérie par internet, sans VPN.

Exigences :

- Serveur : **n'importe quelle édition de Windows Server 2025**, ou Windows Server 2022 Datacenter: Azure Edition. Client : Windows 11 (ou Windows Server 2025).
- Un certificat d'une autorité de certification approuvée : EKU Authentification du serveur, un objet, et un **autre nom de l'objet (SAN)** pour chaque nom DNS utilisé par les clients (pas d'adresse IP), clé privée incluse.
- Pare-feu : autoriser UDP 443 en entrée ; ne pas ouvrir TCP 445 en entrée.
- Serveur et client joints au domaine (recommandé ; un groupe de travail avec comptes locaux et NTLM est possible). Le serveur a besoin d'un contrôleur de domaine ; pas les clients.

```powershell
# On the file server (Windows Server 2025: use PowerShell, not Windows Admin Center)
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Subject -Match "fsedge1" }
New-SmbServerCertificateMapping -Name fsedge1.contoso.com -Thumbprint $cert.Thumbprint -StoreName My
# On the client: force QUIC (by default the client tries TCP first, then QUIC)
New-SmbMapping -LocalPath Z: -RemotePath \\fsedge1.contoso.com\sales -TransportType QUIC
```

| Besoin | Configuration |
| --- | --- |
| Kerberos au lieu de NTLMv2 pour les clients externes | Proxy KDC sur le serveur de fichiers (HTTPS 443) et la stratégie *Spécifier les serveurs proxy KDC pour les clients Kerberos* |
| Seuls des appareils approuvés peuvent se connecter | Contrôle d'accès client : `Set-SmbServerCertificateMapping -RequireClientAuthentication $true`, puis `Grant-SmbClientAccessToServer` ou `Block-SmbClientAccessToServer` (certificats clients) |
| Désactiver QUIC sur un serveur ou un client | `Set-SmbServerConfiguration -EnableSMBQUIC $false` / `Set-SmbClientConfiguration -EnableSMBQUIC $false`, ou la stratégie *Enable SMB over QUIC* (Lanman Server ou Lanman Workstation) |
| Certificat renouvelé | Mapper de nouveau la nouvelle empreinte |

> **Piège d'examen.** SMB sur QUIC sous Windows Server 2022 exige l'**Azure Edition** ; sous Windows Server 2025, Standard et Datacenter le prennent en charge. Dans le contrôle d'accès client, une entrée de refus n'importe où dans la chaîne de certificats l'emporte sur une entrée d'autorisation.

<!-- section: smb-settings | objectives: 5.2.5 -->
## Configurer les paramètres et la gestion SMB

Les paramètres côté serveur passent par `Set-SmbServerConfiguration`, ceux côté client par `Set-SmbClientConfiguration` ; la stratégie de groupe propose les mêmes paramètres sous **Network\Lanman Server** et **Network\Lanman Workstation**.

| Exigence | Paramètre |
| --- | --- |
| Chiffrer un partage / tout le serveur | `Set-SmbShare -Name Data -EncryptData $true` / `Set-SmbServerConfiguration -EncryptData $true` |
| Laisser des clients sans SMB 3 lire un partage chiffré pendant une transition | `Set-SmbServerConfiguration -RejectUnencryptedAccess $false` (par défaut `$true`) |
| Un client doit chiffrer toutes ses connexions sortantes (Windows Server 2025) | `Set-SmbClientConfiguration -RequireEncryption $true` |
| Chiffrer un seul mappage | `New-SmbMapping -RequirePrivacy $true` ou `net use /REQUIREPRIVACY` |
| Exiger la signature | `-RequireSecuritySignature $true` sur le serveur ou le client (stratégie *Serveur réseau Microsoft / Client réseau Microsoft : communications signées numériquement (toujours)*) |
| N'accepter que SMB 3.1.1 (Windows Server 2025) | `Set-SmbServerConfiguration -Smb2DialectMin SMB311` |
| Bloquer NTLM pour le SMB sortant (Windows Server 2025) | `Set-SmbClientConfiguration -BlockNTLM $true`, exceptions dans la stratégie *Block NTLM Server Exception List* |
| Ralentir les tentatives de mot de passe par SMB | Limiteur de débit d'authentification : `-InvalidAuthenticationDelayTimeInMs` (2000 par défaut, actif par défaut dans Windows Server 2025 ; 0 le désactive) |
| Repérer les appareils tiers sans signature ni chiffrement | `-AuditClientDoesNotSupportSigning` et les paramètres d'audit associés |
| Se connecter à un serveur sur un port non standard | `New-SmbMapping -TcpPort` ou `-QuicPort` (Windows Server 2025) |

Valeurs par défaut à connaître :

- **SMB 1.0** n'est plus installé par défaut depuis Windows Server version 1709 ; supprimez-le là où il reste, car il contourne l'intégrité de pré-authentification de SMB 3.1.1.
- Windows Server 2025 **exige par défaut la signature des connexions sortantes**. Les contrôleurs de domaine exigent la signature de leurs clients (SYSVOL, NETLOGON).
- SMB 3.1.1 négocie par défaut le chiffrement **AES-128-GCM** ; AES-256-GCM et AES-256-CCM sont disponibles depuis Windows Server 2022.
- Quand le chiffrement est exigé, un client SMB 3 incapable de chiffrer est rejeté avec **Accès refusé** et l'événement 1003 dans `Microsoft-Windows-SmbServer/Operational`.
- **SMB Multichannel** utilise automatiquement plusieurs chemins réseau et il est indispensable à SMB Direct (voir le chapitre sur le stockage).

> **Piège d'examen.** Le chiffrement SMB ne protège que les données en transit. Les données au repos relèvent de BitLocker, et le chiffrement SMB ne dépend ni d'EFS ni de BitLocker.

<!-- section: key-points -->
## Points clés

- Par le réseau, le plus restrictif des autorisations de partage et NTFS s'applique.
- L'énumération basée sur l'accès masque des dossiers ; elle n'accorde ni ne bloque l'accès.
- FSRM : le quota inconditionnel et le filtre actif bloquent, le quota conditionnel et le filtre passif ne font que notifier ; NTFS uniquement.
- Espaces de noms DFS = un chemin, réplication DFS = des copies avec RDC ; le membre principal l'emporte lors de la réplication initiale.
- SMB sur QUIC : UDP 443, certificat TLS 1.3 avec SAN, toute édition de Windows Server 2025.
- Windows Server 2025 : signature sortante exigée, chiffrement imposable côté client, blocage de NTLM, contrôle des dialectes, limiteur de débit d'authentification.
