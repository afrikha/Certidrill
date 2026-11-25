Dans un pool d'hôtes regroupé, les utilisateurs arrivent sur un hôte de session différent à presque chaque connexion : leur profil ne peut donc pas résider sur la machine virtuelle. FSLogix le stocke dans un conteneur sur un partage SMB et l'attache à l'ouverture de session. Les questions d'examen demandent quel service de stockage répond à une contrainte d'échelle, de latence ou d'identité, et comment configurer dans le bon ordre le compte de stockage, les autorisations du partage et les paramètres FSLogix.

<!-- section: user-data-planning | objectives: 1.2.1 -->
## Planifier le stockage des données utilisateur

Les données utilisateur à placer :

| Données | Où |
| --- | --- |
| Profils utilisateur d'un pool d'hôtes regroupé | Conteneur de profil FSLogix (un VHD ou VHDX par utilisateur) sur un partage SMB |
| Données des Microsoft 365 Apps seules (cache Outlook, Teams, cache OneDrive) | Conteneur ODFC FSLogix, à côté d'une solution de profil tierce (l'usage recommandé d'ODFC) |
| Profils utilisateur d'un pool d'hôtes personnel | Peuvent rester sur le disque du système d'exploitation de l'hôte de session de l'utilisateur ; FSLogix reste utile pour reconstruire ou remplacer l'hôte |
| Packages App attach | Un partage SMB distinct, lu par les hôtes de session |

Les options de stockage comparées :

| Fonctionnalité | Azure Files | Azure NetApp Files | Espaces de stockage direct (Storage Spaces Direct) |
| --- | --- | --- | --- |
| Cas d'usage | Usage général | De l'usage général à l'échelle entreprise | Multiplateforme |
| Service de plateforme | Oui | Oui | Non, machines virtuelles autogérées |
| Régions | Toutes | Certaines régions | Toutes |
| Redondance | LRS, ZRS, GRS, GZRS (partages SSD : LRS et ZRS uniquement) | LRS, ZRS avec réplication interzone, réplication interrégion | LRS, ZRS, GRS |
| Performances | HDD (standard) ou SSD (premium) ; jusqu'à 100 000 IOPS et 10 Go/s par partage, environ 3 ms de latence | Standard, Premium, Ultra ; jusqu'à 460 000 IOPS et 4,5 Go/s par volume, environ 1 ms de latence | Limitées par les disques managés ; disques Premium recommandés |
| Capacité | 100 Tio par partage ; partage minimal de 1 Gio | 100 Tio par volume ; pool de capacité minimal de 1 Tio, volume minimal de 50 Gio | 32 Tio par disque ; deux machines virtuelles et un témoin cloud, ou trois machines virtuelles |
| Identité | AD DS, Microsoft Entra Domain Services, Microsoft Entra Kerberos | AD DS, Microsoft Entra Domain Services | AD DS, Microsoft Entra Domain Services |
| Sauvegarde | Instantanés Sauvegarde Azure | Instantanés et sauvegarde Azure NetApp Files | Sauvegarde Azure |

Choisir :

| Exigence | Réponse |
| --- | --- |
| La plupart des déploiements, administration minimale | Azure Files avec des partages SSD (premium) ; HDD seulement pour des charges légères guidées par le coût |
| Des milliers d'utilisateurs, latence la plus faible, échelle entreprise | Azure NetApp Files |
| Hôtes de session joints à Microsoft Entra, utilisateurs cloud uniquement | Azure Files avec Microsoft Entra Kerberos (cloud public Azure) ; Azure NetApp Files ne prend pas en charge les identités cloud uniquement |
| Résister à la perte d'une zone | Partage ZRS, ou volumes Azure NetApp Files dans plusieurs zones |
| Résister à la perte d'une région | FSLogix Cloud Cache avec un emplacement dans chaque région |

Règles de dimensionnement :

- Placez le stockage **dans la même région que les hôtes de session** : chaque lecture et écriture du profil traverse le réseau, à l'ouverture de session comme pendant la session.
- Les conteneurs FSLogix sont des fichiers VHD dynamiques d'une taille maximale par défaut de 30 000 Mo (`SizeInMBs`) ; la base de dimensionnement de Microsoft est d'au moins 30 Go de stockage de profil par utilisateur.
- Les pics d'ouverture de session sont le moment critique : dimensionnez les IOPS et le débit pour le nombre d'utilisateurs qui se connectent à 9 h, pas pour la moyenne.

> **Piège d'examen.** Le type de jonction des hôtes de session contraint le stockage. Azure NetApp Files exige Kerberos depuis AD DS ou Microsoft Entra Domain Services ; les hôtes joints à Microsoft Entra ne sont pris en charge que si les identités viennent d'AD DS. Des utilisateurs cloud uniquement imposent Azure Files avec Microsoft Entra Kerberos.

<!-- section: fslogix-storage | objectives: 1.2.2 -->
## Le stockage des composants FSLogix

| Composant | Clé de paramètres | Paramètre de stockage |
| --- | --- | --- |
| Conteneur de profil | `HKLM\SOFTWARE\FSLogix\Profiles` | `Enabled` = 1, `VHDLocations` = un ou plusieurs chemins SMB |
| Conteneur ODFC | `HKLM\SOFTWARE\Policies\FSLogix\ODFC` | `Enabled` = 1, `VHDLocations` = chemins SMB. Inutile avec des conteneurs de profils, qui contiennent déjà ces données : une configuration à double conteneur n'est pas recommandée |
| Cloud Cache | Clé Profiles ou ODFC | `CCDLocations` au lieu de `VHDLocations` : plusieurs fournisseurs de stockage |

```powershell
$regPath = "HKLM:\SOFTWARE\FSLogix\profiles"
New-ItemProperty -Path $regPath -Name Enabled -PropertyType DWORD -Value 1 -Force
New-ItemProperty -Path $regPath -Name VHDLocations -PropertyType MultiString -Value \\<storage-account-name>.file.core.windows.net\<share-name> -Force
```

Les valeurs par défaut à connaître :

| Paramètre | Valeur par défaut | Sens |
| --- | --- | --- |
| `VolumeType` | `vhd` | Indiquez `vhdx` explicitement pour des conteneurs VHDX |
| `IsDynamic` | 1 | Le fichier grossit au fil des écritures, jusqu'à `SizeInMBs` |
| `SizeInMBs` | 30000 | Taille maximale ; elle peut être augmentée, jamais réduite |
| `FlipFlopProfileDirectoryName` | 0 | Nom de dossier `%sid%_%username%` ; 1 donne `%username%_%sid%` |
| `DeleteLocalProfileWhenVHDShouldApply` | 0 | 1 supprime définitivement un profil local qui bloquerait le conteneur |
| `AccessNetworkAsComputerObject` | 0 | Le conteneur est attaché en tant qu'utilisateur ; 1 (compte d'ordinateur) est un risque de sécurité |

Déployez ces valeurs dans l'image, par stratégie de groupe ou avec Intune pour que chaque hôte de session les reçoive. FSLogix est préinstallé sur les images Windows Entreprise multisession, mais peut être obsolète.

**Cloud Cache** garde un cache local sur l'hôte de session (`C:\ProgramData\FSLogix\Cache`) et écrit chaque modification vers tous les fournisseurs listés dans `CCDLocations`, par ordre de proximité puis de préférence ; un seul fournisseur est lu. Si un fournisseur est indisponible, les modifications sont mises en file d'attente puis vidées à son retour. Le prix : plus d'espace disque local et plus d'E/S sur l'hôte de session.

> **Conseil d'examen.** Plusieurs chemins dans `VHDLocations` ne sont pas une réplication : FSLogix utilise le premier emplacement qui fonctionne. Des copies synchronisées à plusieurs endroits, c'est Cloud Cache.

<!-- section: storage-accounts | objectives: 1.2.3 -->
## Les comptes de stockage pour Azure Virtual Desktop

Créez le compte dans la région des hôtes de session avec :

- **Performances** : Premium pour des partages de fichiers SSD (LRS ou ZRS) quand les IOPS et la latence comptent, ce qui est le cas habituel des profils ; Standard (HDD) sinon.
- **Accès basé sur l'identité** : une seule source par compte. Le compte ne peut pas utiliser Microsoft Entra Kerberos en même temps qu'AD DS ou Microsoft Entra Domain Services.
- **Réseau** : un point de terminaison privé pour la sous-ressource `file` (zone DNS privée `privatelink.file.core.windows.net`) ou un point de terminaison de service depuis le sous-réseau des hôtes de session. SMB utilise TCP 445, souvent bloqué par les fournisseurs d'accès : une raison de plus de garder l'accès dans Azure.
- **Accès par clé du compte de stockage** : la procédure AD DS exige qu'il reste activé, et la clé permet à un administrateur de monter le partage pour poser les premières ACL.

Source d'identité selon le type d'hôte de session :

| Hôtes de session | Utilisateurs | Source d'identité d'Azure Files |
| --- | --- | --- |
| Joints à AD DS | Hybrides | AD DS : joindre le compte de stockage au domaine |
| Joints à Microsoft Entra Domain Services | Synchronisés depuis Microsoft Entra ID | Microsoft Entra Domain Services : l'activer sur le compte |
| Joints à Microsoft Entra ou à Microsoft Entra hybride | Hybrides | Microsoft Entra Kerberos ; les hôtes n'ont pas besoin de visibilité réseau sur un contrôleur de domaine |
| Joints à Microsoft Entra | Cloud uniquement ou externes | Microsoft Entra Kerberos, cloud public Azure uniquement |

Joignez le compte à AD DS depuis une machine jointe au domaine avec le module AzFilesHybrid ; le compte Azure connecté doit avoir les droits Owner, Contributor ou propriétaire du compte de stockage :

```powershell
Import-Module -Name AzFilesHybrid
Connect-AzAccount
Join-AzStorageAccount `
    -ResourceGroupName "rg-avd-storage" `
    -StorageAccountName "stavdprofiles01" `
    -DomainAccountType "ComputerAccount" `
    -OrganizationalUnitDistinguishedName "OU=AVD,DC=contoso,DC=com"

# Check the result
(Get-AzStorageAccount -ResourceGroupName "rg-avd-storage" -Name "stavdprofiles01").AzureFilesIdentityBasedAuth.DirectoryServiceOptions
```

Le compte est représenté dans AD DS par un compte d'ordinateur. Si la stratégie du domaine fait expirer son mot de passe, renouvelez-le avant l'échéance, sinon les utilisateurs perdent l'accès. À partir de la mise à jour Windows Server d'avril 2026, le type de chiffrement Kerberos par défaut passe de RC4 à AES-SHA1 : migrez les partages FSLogix vers AES avant de l'installer.

> **Piège d'examen.** Un compte de stockage déjà joint à AD DS ne peut pas activer en plus Microsoft Entra Kerberos. Si de nouveaux hôtes de session joints à Microsoft Entra doivent utiliser le partage sans visibilité réseau sur un contrôleur de domaine, prévoyez Microsoft Entra Kerberos sur ce compte, ou sur un nouveau, plutôt que l'ajout d'une seconde source d'identité.

<!-- section: file-shares | objectives: 1.2.4 -->
## Les partages de fichiers et leurs autorisations

L'accès à un partage de profils est vérifié deux fois : les **autorisations au niveau du partage** (Azure RBAC) et les **autorisations NTFS** (ACL Windows). Les deux doivent autoriser l'utilisateur.

| Qui | Niveau du partage | Pourquoi |
| --- | --- | --- |
| Tous les utilisateurs du pool d'hôtes | Storage File Data SMB Share Contributor, comme **autorisation par défaut au niveau du partage** pour toutes les identités authentifiées, ou attribué au groupe des utilisateurs | Lire, écrire et supprimer dans le partage |
| Les administrateurs qui posent les ACL | Storage File Data SMB Share Elevated Contributor | Modifier les autorisations NTFS sans la clé du compte de stockage |

Autorisations NTFS recommandées à la racine du partage :

| Principal | Accès | S'applique à |
| --- | --- | --- |
| CREATOR OWNER | Modification | Sous-dossiers et fichiers uniquement |
| Groupe des administrateurs | Contrôle total | Ce dossier, les sous-dossiers et les fichiers |
| Groupe des utilisateurs | Modification | Ce dossier seulement |

Les utilisateurs peuvent créer leur propre dossier mais pas ouvrir celui des autres. Sans ces ACL, un utilisateur pourrait supprimer le profil d'un autre.

```powershell
# Mount with the storage account key (or use Elevated Contributor), then set ACLs
net use Z: \\stavdprofiles01.file.core.windows.net\profiles /user:Azure\stavdprofiles01 <storage-account-key>
icacls Z: /inheritance:r
icacls Z: /grant:r "CREATOR OWNER:(OI)(CI)(IO)(M)"
icacls Z: /grant:r "CONTOSO\AVD-Admins:(OI)(CI)(F)"
icacls Z: /grant:r "CONTOSO\AVD-Users:(M)"
```

Avec **Microsoft Entra Kerberos**, trois étapes de plus :

1. Accordez le **consentement administrateur** à l'application que crée l'activation de Microsoft Entra Kerberos pour le compte de stockage, et excluez-la de l'authentification multifacteur : les tickets doivent être obtenus silencieusement à l'ouverture de session. Pour les groupes cloud uniquement, ajoutez l'étiquette `kdc_enable_cloud_group_sids` à son manifeste.
2. Sur les hôtes de session, activez la récupération du ticket Kerberos cloud (Intune `Kerberos/CloudKerberosTicketRetrievalEnabled`, ou le registre), et autorisez le chargement des clés d'informations d'identification depuis le profil.
3. Posez les ACL depuis une machine qui voit un contrôleur de domaine ou, pour les identités cloud uniquement, depuis l'onglet **Gérer l'accès** du partage.

```powershell
reg add HKLM\SYSTEM\CurrentControlSet\Control\Lsa\Kerberos\Parameters /v CloudKerberosTicketRetrievalEnabled /t REG_DWORD /d 1
reg add HKLM\Software\Policies\Microsoft\AzureADAccount /v LoadCredKeyFromProfile /t REG_DWORD /d 1
```

Validez : un utilisateur de test se connecte, et le partage affiche un dossier nommé `<user SID>_<username>` qui contient le conteneur. Un profil local existant est prioritaire : supprimez-le, ou utilisez `DeleteLocalProfileWhenVHDShouldApply`.

> **Piège d'examen.** Un utilisateur qui a le rôle Contributor sur le compte de stockage ne peut toujours pas ouvrir le partage en SMB avec son identité : les rôles de gestion ne donnent pas accès aux données. L'accès au partage vient des rôles Storage File Data SMB Share.

<!-- section: netapp-files | objectives: 1.2.5 -->
## Azure NetApp Files

Ordre de mise en œuvre :

1. Inscrivez le fournisseur de ressources `Microsoft.NetApp`, puis créez un **compte NetApp** dans la région des volumes.
2. Créez un **pool de capacité** (1 Tio minimum) et choisissez son niveau de service.
3. Créez la **connexion Active Directory** : une par compte NetApp ; serveur DNS principal (les contrôleurs de domaine, ou les adresses IP de Microsoft Entra Domain Services), nom de domaine DNS AD, site AD, préfixe du serveur SMB, unité d'organisation (par défaut `CN=Computers` ; `OU=AADDC Computers` avec Microsoft Entra Domain Services) et un compte de domaine qui peut créer des comptes d'ordinateur.
4. Déléguez un sous-réseau à `Microsoft.NetApp/volumes` : un seul sous-réseau délégué par réseau virtuel, et sa taille ne peut plus changer ensuite.
5. Créez un **volume SMB** avec la **disponibilité continue** (Continuous Availability) activée.
6. Posez les autorisations NTFS comme pour Azure Files, puis pointez `VHDLocations` vers le chemin SMB du volume.

| Niveau de service | Débit par Tio provisionné |
| --- | --- |
| Standard | Jusqu'à 16 Mio/s |
| Premium | Jusqu'à 64 Mio/s |
| Ultra | Jusqu'à 128 Mio/s |
| Flexible | Défini indépendamment de la capacité, pools de capacité à QoS manuelle uniquement ; au moins 128 Mio/s par pool |

Avec la QoS automatique, le débit d'un volume vaut son quota multiplié par le niveau de service : un volume Premium de 2 Tio obtient 128 Mio/s.

Règles à connaître :

- Ne dépassez pas **3 000 profils actifs simultanés par volume standard** ; au-delà, répartissez les utilisateurs sur des volumes dans différentes zones de disponibilité.
- Avec les fonctionnalités réseau de base (Basic), vous ne pouvez pas associer de NSG au sous-réseau délégué ; passez aux fonctionnalités réseau **Standard**. Le peering de réseaux virtuels global exige aussi Standard.
- Protégez les profils avec les instantanés et la sauvegarde Azure NetApp Files.
- Le mot de passe du compte de la connexion AD ne peut pas dépasser 64 caractères, et ce compte doit prendre en charge AES avec des contrôleurs de domaine Windows Server 2025.

> **Piège d'examen.** Les rôles Storage File Data SMB Share appartiennent à Azure Files. Sur un volume SMB Azure NetApp Files, l'accès est contrôlé par les autorisations Windows : il n'y a donc aucun rôle Azure à attribuer aux utilisateurs pour le partage de profils.

<!-- section: key-points -->
## Points clés

- Les pools d'hôtes regroupés ont besoin de conteneurs FSLogix sur un stockage SMB dans la même région que les hôtes de session.
- Azure Files premium dans la plupart des cas ; Azure NetApp Files pour l'échelle et la latence la plus faible ; Storage Spaces Direct seulement si vous acceptez de gérer des machines virtuelles.
- Identité : jonction à AD DS, Microsoft Entra Domain Services ou Microsoft Entra Kerberos, une seule par compte de stockage ; des utilisateurs cloud uniquement exigent Microsoft Entra Kerberos.
- Deux couches d'autorisations sur Azure Files : les rôles Storage File Data SMB Share, puis NTFS (CREATOR OWNER en modification sur les sous-dossiers, les utilisateurs en modification sur la racine seulement).
- `VHDLocations` liste des alternatives ; `CCDLocations` (Cloud Cache) écrit vers tous les fournisseurs.
- Azure NetApp Files : compte NetApp, pool de capacité de 1 Tio minimum, une connexion AD par compte, un seul sous-réseau délégué par réseau virtuel, disponibilité continue, 3 000 profils actifs par volume.
