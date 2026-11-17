Les utilisateurs ne se connectent pas aux hôtes de session : ils se connectent à ce que publie un **groupe d'applications**, un bureau complet ou des applications RemoteApp individuelles, et les applications elles-mêmes viennent de l'image ou sont attachées dynamiquement avec **App attach**. Les questions testent la méthode de distribution adaptée à une exigence, le type de groupe d'applications, le rôle qui donne l'accès et les étapes pour empaqueter et attacher une application.

<!-- section: app-deployment-methods | objectives: 3.3.1 -->
## Choisir une méthode pour déployer une application

Deux décisions distinctes : **comment l'application arrive sur l'hôte de session**, et **comment les utilisateurs la voient** (dans un bureau complet ou dans une fenêtre RemoteApp).

| Méthode | Fonctionnement | À choisir quand |
| --- | --- | --- |
| Installation dans l'image | L'application est installée dans l'image de référence (golden image) qui sert à créer les hôtes de session | Applications utilisées par tous, applications impossibles à empaqueter (pilotes, services), le moins de pièces mobiles possible. Chaque mise à jour impose une nouvelle image et un redéploiement |
| App attach | L'application, empaquetée en MSIX/Appx dans une image disque ou en App-V, est montée depuis un partage SMB à la connexion et inscrite uniquement pour les utilisateurs affectés | Applications différentes pour des utilisateurs différents sur les mêmes hôtes partagés, une seule image pour tous, mises à jour sans reconstruire l'image, plusieurs versions côte à côte |
| Intune (Win32, MSI, applications du Store) sur Windows Entreprise multisession | Installation par appareil dans le contexte système, intention **Obligatoire** ou **Désinstaller** uniquement | Hôtes déjà gérés par Intune qui ont besoin d'une application sur chaque hôte |
| Masquage d'application FSLogix | L'application est dans l'image mais masquée aux utilisateurs qui n'y ont pas droit | Une seule image, quelques applications à masquer à certains utilisateurs (licences) |

| Présentation | Type de groupe d'applications | À choisir quand |
| --- | --- | --- |
| Bureau complet | Bureau (Desktop) | Les utilisateurs travaillent toute la journée dans la session, bureaux personnels |
| RemoteApp | RemoteApp | Les utilisateurs ont besoin d'une ou deux applications métier intégrées à leur bureau local ; RemoteApp est disponible pour les pools d'hôtes partagés |

> **Piège d'examen.** App attach ne remplace pas le groupe d'applications : un utilisateur reçoit une application App attach seulement si le package est affecté au pool d'hôtes **et** à l'utilisateur (ou à son groupe), **et** si l'utilisateur est dans un groupe d'applications de ce pool d'hôtes.

> **Conseil d'examen.** « Certains utilisateurs du même pool d'hôtes partagé ont besoin d'App1, d'autres d'App2, et l'image doit rester générique » = App attach (ou le masquage si les applications sont déjà dans l'image). « Réduire le nombre d'images et mettre à jour les applications sans redéployer les hôtes de session » = App attach.

<!-- section: application-groups | objectives: 3.3.2, 3.3.3 -->
## Créer des groupes d'applications et y affecter des utilisateurs

Un groupe d'applications appartient à **un seul** pool d'hôtes ; un pool d'hôtes peut avoir **un seul** groupe d'applications de bureau et autant de groupes d'applications RemoteApp que nécessaire. Pour apparaître dans le flux des utilisateurs, un groupe d'applications doit être **inscrit dans un espace de travail**.

| Règle | Détail |
| --- | --- |
| Groupe d'applications de bureau | Pools d'hôtes partagés ou personnels. Le portail en crée un automatiquement avec chaque pool d'hôtes, nommé `<hostpool>-DAG` ; supprimez-le si vous ne voulez que RemoteApp |
| Groupe d'applications RemoteApp | Pools d'hôtes partagés. Les utilisateurs de plusieurs groupes RemoteApp du même pool d'hôtes voient toutes leurs applications |
| Utilisateur dans un groupe de bureau et un groupe RemoteApp du même pool d'hôtes partagé | Ne voit que le type défini par le **type de groupe d'applications préféré** du pool d'hôtes (Desktop ou RemoteApp ; Desktop est la valeur par défaut du portail et s'impose quand aucune valeur n'est définie) |
| Même utilisateur, groupe de bureau sur hp01 et groupe RemoteApp sur hp02 | Voit les deux : la préférence s'applique au sein d'un seul pool d'hôtes |

L'accès est une attribution de rôle Azure RBAC **Desktop Virtualization User** sur le groupe d'applications, à des utilisateurs ou (de préférence) à des groupes. L'attribuer exige `Microsoft.Authorization/roleAssignments/write` (Owner, User Access Administrator ou Role Based Access Control Administrator) ; créer des groupes d'applications et publier des applications exige **Desktop Virtualization Application Group Contributor** ou **Desktop Virtualization Contributor**.

```powershell
$hp = Get-AzWvdHostPool -Name hp-sales -ResourceGroupName rg-avd

New-AzWvdApplicationGroup -Name ag-sales-apps -ResourceGroupName rg-avd -Location westeurope `
  -ApplicationGroupType RemoteApp -HostPoolArmPath $hp.Id

$ag = Get-AzWvdApplicationGroup -Name ag-sales-apps -ResourceGroupName rg-avd
Register-AzWvdApplicationGroup -WorkspaceName ws-sales -ResourceGroupName rg-avd `
  -ApplicationGroupPath $ag.Id

New-AzRoleAssignment -ObjectId <group object ID> -RoleDefinitionName "Desktop Virtualization User" `
  -Scope $ag.Id
```

Dans le portail : **Groupes d'applications > + Créer** (De base : pool d'hôtes et type ; Applications ; Affectations ; Espace de travail : **Inscrire le groupe d'applications** = Oui), ou plus tard **Affectations > + Ajouter** sur le groupe d'applications.

> **Piège d'examen.** Les utilisateurs affectés à un groupe d'applications qui n'est inscrit dans aucun espace de travail ne voient rien dans Windows App. L'inscription dans un espace de travail et le rôle Desktop Virtualization User sont tous deux nécessaires.

> **Piège d'examen.** Le rôle Desktop Virtualization User donne accès aux ressources publiées, pas aux ressources Azure : il permet de se connecter, pas de gérer. Les administrateurs qui gèrent le pool d'hôtes ont besoin d'un rôle de type Desktop Virtualization Contributor.

<!-- section: remoteapp | objectives: 3.3.4 -->
## Publier une application en tant que RemoteApp

Prérequis : un groupe d'applications RemoteApp, au moins un hôte de session **démarré**, et l'application installée sur chaque hôte de session du pool d'hôtes (ou un package App attach affecté au pool d'hôtes).

Sources d'application dans **Groupes d'applications > (groupe) > Applications > + Ajouter** :

| Source | Ce que vous fournissez |
| --- | --- |
| Menu Démarrer | Choisir une application trouvée dans le menu Démarrer des hôtes de session ; le chemin est renseigné |
| Chemin d'accès au fichier | Le chemin du `.exe` sur les hôtes de session, un identificateur d'application, un nom d'affichage |
| App attach | Un package déjà ajouté et affecté au pool d'hôtes, et l'application qu'il contient |

Options : description, **Ligne de commande requise** avec les arguments à passer (`CommandLineSetting` : `DoNotAllow`, `Allow` ou `Require`), chemin et index de l'icône (chemin local pour Menu Démarrer et Chemin d'accès au fichier, chemin UNC possible pour App attach), et **Afficher dans le portail**.

```powershell
# Start menu application
Get-AzWvdStartMenuItem -ApplicationGroupName ag-sales-apps -ResourceGroupName rg-avd |
  Select-Object Name, AppAlias
New-AzWvdApplication -Name WordPad -AppAlias wordpad -GroupName ag-sales-apps `
  -ResourceGroupName rg-avd -CommandLineSetting DoNotAllow

# File path application with a required argument
New-AzWvdApplication -Name "Excel Finance" -GroupName ag-sales-apps -ResourceGroupName rg-avd `
  -FilePath "C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE" `
  -IconPath "C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE" -IconIndex 1 `
  -CommandLineSetting Require -CommandLineArgument "/t \\fs01\templates\finance.xltx" -ShowInPortal:$true
```

- Les applications du Microsoft Store changent de dossier à chaque mise à jour : publiez-les avec `shell:appsFolder\<PackageFamilyName>!<AppId>` comme chemin et un fichier d'icône local.
- Les applications ne peuvent pas être publiées avec Azure CLI.
- Les utilisateurs reçoivent toutes les applications des groupes RemoteApp auxquels ils sont affectés ; pour donner des applications différentes à des utilisateurs différents, utilisez plusieurs groupes RemoteApp (ou des affectations App attach).

> **Piège d'examen.** Une RemoteApp ne démarre pas pour les utilisateurs de certains hôtes de session : l'application n'est installée que sur certains hôtes. Chaque hôte de session du pool doit l'avoir (ou utilisez App attach).

<!-- section: app-attach | objectives: 3.3.9 -->
## Configurer la distribution dynamique d'applications à l'aide d'App attach

App attach monte des images d'applications depuis un partage SMB dans la session de l'utilisateur à la connexion, sans rien installer sur l'hôte de session. Par rapport à l'ancien MSIX app attach, l'actuel **App attach** crée une ressource de package que vous affectez à **plusieurs pools d'hôtes** et **directement à des utilisateurs et des groupes**, et il accepte aussi les packages App-V.

| Élément | Détail |
| --- | --- |
| Formats de package | MSIX et bundle MSIX, Appx et bundle Appx, App-V (`.appv`) |
| Images disque (MSIX/Appx) | **CimFS** (montage et démontage les plus rapides, moins de processeur et de mémoire, recommandé avec des hôtes Windows 11), VHDX, VHD (non recommandé) |
| Hôtes de session | Windows client et versions de Windows Server prises en charge, joints à Microsoft Entra ID ou à AD DS (Microsoft Entra Domain Services n'est pas pris en charge) |
| Stockage | Partage SMB dans la **même région** que les hôtes de session ; Azure Files recommandé, Azure NetApp Files exige des hôtes joints à AD DS ; ne le partagez pas avec les profils FSLogix ; excluez les images de l'antivirus |
| Autorisations du partage | Les **comptes d'ordinateur** des hôtes de session ont besoin d'un accès en lecture. Azure Files avec AD DS : Storage File Data SMB Share Reader comme autorisation par défaut au niveau du partage + lecture NTFS. Azure Files avec des hôtes joints à Entra : **Reader and Data Access** aux principaux de service Azure Virtual Desktop et Azure Virtual Desktop ARM Provider |
| Certificats | Chaque package MSIX/Appx est signé : toute la chaîne doit être approuvée sur les hôtes de session |
| Inscription | **À la demande** (par défaut, recommandé : inscription complète au démarrage de l'application) ou **Bloquante à l'ouverture de session** (inscription à la connexion, connexion plus lente) |
| État | Actif ou Inactif (les packages inactifs sont ignorés à la connexion) |
| Intégrité | **État du contrôle d'intégrité en cas d'échec** définit le résultat `AppAttachHealthCheck` (par exemple NeedsAssistance) quand la préparation échoue |

Étapes dans le portail : **Azure Virtual Desktop > App attach > + Créer** : De base (abonnement, groupe de ressources, un pool d'hôtes, emplacement), Chemin de l'image (compte de stockage ou UNC, package dans l'image, nom d'affichage, version, type d'inscription, état, contrôle d'intégrité), Affectations (pools d'hôtes, utilisateurs ou groupes), Vérifier + créer. Avec PowerShell :

```powershell
$app = Import-AzWvdAppAttachPackageInfo -HostPoolName hp-sales -ResourceGroupName rg-avd `
  -Path "\\stappattach.file.core.windows.net\apps\Contoso\Contoso.cim"

New-AzWvdAppAttachPackage -AppAttachPackage $app -Name contoso-crm -ResourceGroupName rg-avd `
  -Location westeurope -ImageDisplayName "Contoso CRM" -ImageIsActive:$true `
  -ImageIsRegularRegistration:$false -FailHealthCheckOnStagingFailure NeedsAssistance

$pkg = Get-AzWvdAppAttachPackage -Name contoso-crm -ResourceGroupName rg-avd
Update-AzWvdAppAttachPackage -Name contoso-crm -ResourceGroupName rg-avd -Location westeurope `
  -HostPoolReference @((Get-AzWvdHostPool -Name hp-sales -ResourceGroupName rg-avd).Id)
New-AzRoleAssignment -ObjectId <group object ID> -RoleDefinitionName "Desktop Virtualization User" -Scope $pkg.Id
```

- Un package affecté à un pool d'hôtes et à des utilisateurs apparaît automatiquement dans leurs sessions de **bureau**. Pour RemoteApp, ajoutez-le aussi à un groupe d'applications RemoteApp (source **App attach**) ; les applications MSIX ne peuvent pas être ajoutées à un groupe d'applications de bureau.
- `-HostPoolReference` **remplace** la liste des pools d'hôtes ; un tableau vide les retire tous.
- Nouvelle version : **côte à côte** (un nouveau package affecté aux mêmes utilisateurs) ou **sur place** (mise à jour du package avec la nouvelle image ; la version doit être différente ; gardez l'ancienne image tant que quelqu'un l'utilise). Les utilisateurs reçoivent la nouvelle version à la connexion suivante.
- Ajouter des packages exige **Desktop Virtualization Contributor** sur le groupe de ressources ; App attach ne se gère pas avec Azure CLI.
- Désactivez les mises à jour automatiques du Microsoft Store sur les hôtes de session (`AutoDownload = 2` sous `HKLM\Software\Policies\Microsoft\WindowsStore`) pour que les applications attachées ne soient pas mises à jour en dehors de vos images.

> **Piège d'examen.** Hôtes de session joints à Entra avec Azure Files : le rôle n'est pas Storage File Data SMB Share Reader pour les utilisateurs, c'est **Reader and Data Access** pour les deux principaux de service Azure Virtual Desktop. Avec AD DS, ce sont l'autorisation au niveau du partage plus la lecture NTFS pour les comptes d'ordinateur.

<!-- section: app-attach-package | objectives: 3.3.10 -->
## Créer un package d'application pour App attach

| Étape | Outil | Détail |
| --- | --- | --- |
| 1. Empaqueter l'application | **MSIX Packaging Tool** | Convertit un programme d'installation MSI, EXE, ClickOnce ou App-V en `.msix` ; ou obtenez le MSIX auprès de l'éditeur |
| 2. Le signer | Certificat de signature de code (EKU `1.3.6.1.5.5.7.3.3`) | Autorité de certification publique, interne (AD CS) ou auto-signée (test uniquement) ; **horodatez** le package pour qu'il reste valide après l'expiration du certificat |
| 3. Faire approuver la chaîne par les hôtes de session | Stratégie de groupe (AD DS) ou profil de certificat approuvé Intune (joints à Entra) | Autorité publique : approuvée par défaut ; auto-signé : magasin Autorités de certification racines de confiance de chaque hôte |
| 4. Créer l'image disque | **MSIXMGR** (`msixmgr.exe`), en administrateur sur Windows 10 ou 11 | Développe le package dans une image CimFS, VHDX ou VHD |
| 5. Charger | Partage SMB | Chaque image CimFS est un fichier `.cim` plus des fichiers `objectid_` et `region_` : copiez-les tous, un dossier par image |
| 6. Ajouter | App attach | Ajoutez le package, affectez les pools d'hôtes et les utilisateurs |

```text
msixmgr.exe -Unpack -packagePath "C:\msix\ContosoCRM.msix" -destination "C:\msix\ContosoCRM\ContosoCRM.cim" -applyACLs -create -fileType cim -rootDirectory apps

msixmgr.exe -Unpack -packagePath "C:\msix\ContosoCRM.msix" -destination "C:\msix\ContosoCRM.vhdx" -applyACLs -create -fileType vhdx -rootDirectory apps
```

- Créez le dossier de destination avant d'exécuter MSIXMGR.
- Générez les images CIM sur une version de Windows **inférieure ou égale** à celle des hôtes de session (une image CIM créée sous Windows 11 peut ne pas fonctionner sous Windows 10).
- Les packages App-V n'ont pas besoin d'image disque : le fichier `.appv` est stocké tel quel sur le partage, éventuellement avec ses fichiers de configuration dynamique `_UserConfig.xml` et `_DeploymentConfig.xml`.

> **Piège d'examen.** L'ordre compte : empaqueter (MSIX Packaging Tool), **signer**, puis développer dans une image (MSIXMGR). Un package non signé ou non approuvé échoue à la préparation sur les hôtes de session.

<!-- section: key-points -->
## Points clés

- Distribution (image, App attach, Intune, masquage) et présentation (bureau ou RemoteApp) sont des choix distincts.
- Un groupe d'applications de bureau par pool d'hôtes, plusieurs groupes RemoteApp ; inscription dans un espace de travail ; Desktop Virtualization User sur le groupe d'applications.
- Le type de groupe d'applications préféré décide de ce que voit un utilisateur présent dans les deux types de groupes d'un même pool d'hôtes partagé.
- Sources RemoteApp : menu Démarrer, chemin d'accès au fichier, App attach ; l'application doit être sur chaque hôte de session ; au moins un hôte démarré.
- App attach : ressource de package, plusieurs pools d'hôtes, affectation directe aux utilisateurs et aux groupes, CimFS pour Windows 11, inscription à la demande par défaut, les comptes d'ordinateur lisent le partage.
- Création du package : MSIX Packaging Tool, signature et horodatage, MSIXMGR vers CimFS ou VHDX, chaîne de certificats approuvée sur les hôtes.
