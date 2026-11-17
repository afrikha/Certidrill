FSLogix fait suivre le profil utilisateur Windows d'un hôte de session à l'autre dans un pool partagé : à la connexion, il attache un disque virtuel (VHD ou VHDX) stocké sur un partage SMB. Les questions d'examen donnent un pool d'hôtes, une conception du stockage et une exigence (haute disponibilité, solution de profils tierce, masquer une application à certains utilisateurs) et demandent quel conteneur, quelle valeur de Registre ou quelle fonctionnalité FSLogix configurer.

<!-- section: recommend-fslogix | objectives: 3.1.1 -->
## Recommander une configuration FSLogix

FSLogix comporte deux familles de fonctionnalités :

| Fonctionnalité | Rôle | Se configure dans |
| --- | --- | --- |
| Conteneur de profil (Profile Container) | Redirige **tout** le profil utilisateur dans un seul VHD(x) | `HKLM\SOFTWARE\FSLogix\Profiles` |
| Conteneur ODFC (Office Data File Containers) | Redirige uniquement les données des applications Microsoft 365 (Outlook, OneDrive, Teams, activation d'Office...) dans un VHD(x) | `HKLM\SOFTWARE\Policies\FSLogix\ODFC` |
| Cloud Cache | Conserve un cache local du conteneur et l'écrit vers quatre fournisseurs de stockage au maximum | `CCDLocations` à la place de `VHDLocations`, dans l'une des clés ci-dessus |
| Masquage d'application (Rule Sets) | Masque, redirige ou définit des valeurs pour des fichiers, des clés de Registre, des applications, des imprimantes et des polices, par utilisateur ou par groupe | Fichiers Rule Set dans `C:\Program Files\FSLogix\Apps\Rules` |

Microsoft recommande la conception la plus simple qui répond à l'exigence :

| Exigence | Configuration recommandée |
| --- | --- |
| Pool d'hôtes partagé (pooled), les utilisateurs doivent retrouver leurs paramètres sur n'importe quel hôte de session | Conteneur de profil seul (**conteneur unique**), `VHDLocations` avec un seul partage SMB |
| L'organisation garde une solution de profils itinérants tierce et n'a besoin de faire suivre que les données Office | Conteneur ODFC seul, en excluant les chemins ODFC de la solution tierce |
| Emplacement, taille ou isolation distincts pour les données Office (par exemple un profil de 10 Go et un conteneur ODFC de 50 Go) | Conteneur de profil plus conteneur ODFC (double conteneur) |
| Le profil doit rester disponible si un fournisseur de stockage tombe, dans la même région | Cloud Cache avec au moins deux fournisseurs dans la région des hôtes de session |
| Reprise d'activité dans une deuxième région avec les données de profil | Cloud Cache avec un fournisseur dans chaque région, le plus proche en premier |
| Reprise d'activité, option la plus simple, les utilisateurs acceptent de nouveaux profils | Infrastructure dupliquée dans l'autre région, `VHDLocations` standard, aucune récupération de profil |
| Certains utilisateurs ne doivent pas voir une application installée | Règle de masquage (hiding) attribuée à ces utilisateurs ou groupes |

Recommandations générales valables pour toutes les conceptions :

- Utilisez **VHDX** (`VolumeType = vhdx`) : taille prise en charge plus grande et moins de cas de corruption que la valeur par défaut `vhd`.
- Gardez `ProfileType = 0` : une seule connexion en lecture-écriture par profil. Azure Virtual Desktop ne prend pas en charge plusieurs connexions au même profil dans un même pool d'hôtes.
- Placez le stockage dans la **même région** que les hôtes de session. Azure Files (Premium pour les pools de production) ou Azure NetApp Files sont les fournisseurs SMB habituels ; les autorisations au niveau du partage et NTFS doivent être définies avant la première connexion.
- Configurez les paramètres une seule fois pour tous les hôtes de session : valeurs de Registre dans l'image, stratégie de groupe (les modèles ADMX/ADML FSLogix ajoutent un nœud **FSLogix** sous Modèles d'administration) ou catalogue de paramètres Intune.
- Ajoutez les exclusions antivirus FSLogix (fichiers VHD et VHDX, dossiers de Cloud Cache).

> **Piège d'examen.** Plusieurs entrées dans `VHDLocations` ne constituent pas une conception à haute disponibilité. FSLogix utilise le premier emplacement que l'utilisateur peut atteindre et y crée un nouveau profil vide si l'emplacement habituel est indisponible. La résilience exige Cloud Cache.

<!-- section: profile-container | objectives: 3.1.2 -->
## Configurer des conteneurs de profils FSLogix

FSLogix ne crée aucune valeur de configuration à l'installation : tout paramètre absent prend sa valeur par défaut. Un conteneur de profil n'a besoin que de deux valeurs, `Enabled` et `VHDLocations` ; les autres ci-dessous sont celles que Microsoft recommande.

| Valeur | Type | Données | Rôle |
| --- | --- | --- | --- |
| `Enabled` | DWORD | 1 | Obligatoire. Valeur par défaut 0 (désactivé) |
| `VHDLocations` | MULTI_SZ ou REG_SZ | `\\<storage-account>.file.core.windows.net\<share>` | Obligatoire. Chemins SMB parcourus dans l'ordre ; un nouveau conteneur est créé dans le premier. Séparez les entrées REG_SZ par `;` |
| `VolumeType` | REG_SZ | vhdx | Recommandé (valeur par défaut `vhd`) |
| `SizeInMBs` | DWORD | 30000 | Par défaut. Taille maximale d'un nouveau conteneur ; peut être augmentée, jamais réduite |
| `IsDynamic` | DWORD | 1 | Par défaut. Le disque n'occupe que l'espace utilisé |
| `DeleteLocalProfileWhenVHDShouldApply` | DWORD | 1 | Recommandé. Supprime un profil local qui serait sinon utilisé à la place du conteneur |
| `FlipFlopProfileDirectoryName` | DWORD | 1 | Recommandé pour les nouveaux déploiements. Dossier nommé `%username%_%sid%` au lieu de `%sid%_%username%` |
| `LockedRetryCount` / `LockedRetryInterval` | DWORD | 3 / 15 | Recommandé (valeurs par défaut 12 / 5) : échouer plus vite quand le VHD est verrouillé |
| `ReAttachRetryCount` / `ReAttachIntervalSeconds` | DWORD | 3 / 15 | Recommandé (valeurs par défaut 60 / 10) |
| `ProfileType` | DWORD | 0 | Par défaut. 1 lecture-écriture uniquement, 2 lecture seule uniquement, 3 tente la lecture-écriture puis se replie sur la lecture seule |

```powershell
$VHDLocations = "\\stcontosoprofiles.file.core.windows.net\profiles"
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name Enabled -PropertyType dword -Value 1 -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name VHDLocations -PropertyType string -Value $VHDLocations -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name VolumeType -PropertyType string -Value vhdx -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name DeleteLocalProfileWhenVHDShouldApply -PropertyType dword -Value 1 -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name FlipFlopProfileDirectoryName -PropertyType dword -Value 1 -Force
```

Autres paramètres qui apparaissent dans les questions :

| Besoin | Paramètre |
| --- | --- |
| N'utiliser FSLogix que pour les sessions Azure Virtual Desktop de l'hôte | `IgnoreNonWVD = 1` |
| Bloquer la connexion (message FRXShell) au lieu de donner un profil temporaire ou local | `PreventLoginWithFailure = 1`, `PreventLoginWithTempProfile = 1` |
| Envoyer certains utilisateurs ou groupes vers un autre partage | `HKLM\SOFTWARE\FSLogix\Profiles\ObjectSpecific\<SID>` avec son propre `VHDLocations` |
| Garder des dossiers hors du conteneur (caches, données temporaires) | Un fichier `redirections.xml` dans le dossier désigné par `RedirXMLSourceFolder` |
| Attacher le disque avec le compte d'ordinateur au lieu de l'utilisateur | `AccessNetworkAsComputerObject = 1` (risque de sécurité, seulement si nécessaire) |

**Qui reçoit un conteneur** dépend de quatre groupes locaux créés sur chaque hôte de session : *FSLogix Profile Include List*, *FSLogix Profile Exclude List*, *FSLogix ODFC Include List* et *FSLogix ODFC Exclude List*. Everyone est membre des listes d'inclusion par défaut ; l'appartenance à une liste d'exclusion l'emporte sur la liste d'inclusion. Pour tester FSLogix avec un seul groupe, retirez Everyone de *FSLogix Profile Include List* et ajoutez-y ce groupe.

Vérifiez sur l'hôte de session, connecté en tant qu'utilisateur standard : `frx.exe list-redirects` dans `C:\Program Files\FSLogix\Apps` affiche les redirections, le conteneur apparaît dans le dossier de l'utilisateur sur le partage, et les journaux se trouvent dans `%ProgramData%\FSLogix\Logs` et dans l'Observateur d'événements sous **Journaux des applications et des services > Microsoft > FSLogix**.

> **Piège d'examen.** Modifier `FlipFlopProfileDirectoryName`, `SIDDirNamePattern` ou `VHDNamePattern` sur un déploiement existant fait chercher FSLogix dans un nouveau dossier : les utilisateurs reçoivent de nouveaux profils vides. Définissez les valeurs de nommage avant la première connexion.

<!-- section: odfc-container | objectives: 3.1.3 -->
## Configurer les conteneurs ODFC de FSLogix

Le conteneur ODFC contient les données des applications Microsoft 365 qui peuvent être reconstruites depuis le cloud : fichiers OST d'Outlook, cache OneDrive, cache Teams, activation d'Office. Ses valeurs se trouvent sous `HKLM\SOFTWARE\Policies\FSLogix\ODFC` et reprennent celles du profil (`Enabled`, `VHDLocations`, `VolumeType`, `SizeInMBs`, nombres de tentatives), plus les valeurs **Include** qui choisissent les applications :

| Valeur | Par défaut | Redirige |
| --- | --- | --- |
| `IncludeOfficeActivation` | 1 | Les données d'activation (licences) d'Office |
| `IncludeOneDrive` | 1 | Le cache OneDrive |
| `IncludeOutlook` | 1 | Les données Outlook (Outlook classique et nouvel Outlook pour Windows) |
| `IncludeOutlookPersonalization` | 1 | La personnalisation d'Outlook (Outlook classique uniquement) |
| `IncludeSharepoint` | 1 | Les données SharePoint |
| `IncludeSkype` | 1 | La liste d'adresses globale de Skype Entreprise |
| `IncludeTeams` | **0** | Les données Teams (Teams classique et nouveau Teams) ; enregistre aussi le package du nouveau Teams à la connexion |
| `IncludeOneNote` / `IncludeOneNote_UWP` | 0 | Les fichiers de blocs-notes OneNote |

Quand l'utiliser :

- **Conteneur unique (recommandé)** : le conteneur de profil inclut déjà toutes les données Office. N'ajoutez pas de conteneur ODFC.
- **ODFC seul** : avec une solution de profils itinérants tierce (profils itinérants, Citrix UPM, VMware DEM). Excluez les chemins ODFC de cette solution, par exemple `%userprofile%\AppData\Local\Microsoft\Outlook` et `%userprofile%\AppData\Local\Microsoft\OneDrive`.
- **Profil + ODFC (double conteneur)** : facultatif, quand les données Office ont besoin de leur propre emplacement, de leur propre taille ou d'une isolation. Les valeurs Include n'ont d'effet que dans ce mode ou avec ODFC seul.

`VHDAccessMode` (ODFC uniquement) autorise les sessions simultanées avec des disques de différenciation (1, 2) ou un VHD par session (3) ; avec le mode mis en cache d'Outlook, seuls 0 et 3 sont pris en charge. OneDrive ne prend jamais en charge les connexions simultanées au même profil.

> **Piège d'examen.** `IncludeTeams` est la seule charge de travail Microsoft 365 désactivée par défaut. Si les données Teams doivent être dans le conteneur ODFC, définissez-la à 1.

<!-- section: cloud-cache | objectives: 3.1.4 -->
## Configurer FSLogix Cloud Cache

Cloud Cache monte un **cache local** du conteneur sur l'hôte de session (`C:\ProgramData\FSLogix\Cache` par défaut) et écrit les modifications de façon asynchrone vers chaque fournisseur de stockage listé dans `CCDLocations`. Les lectures proviennent du premier fournisseur tant qu'il est sain ; les écritures vont vers tous. Il protège les utilisateurs des courtes pannes de stockage et, avec des fournisseurs dans deux régions, permet la reprise d'activité.

| Règle | Détail |
| --- | --- |
| Paramètre | `CCDLocations` remplace `VHDLocations`. Les deux ne doivent jamais être présents dans la même clé |
| Fournisseurs | Quatre au maximum, `smb` (Azure Files, Azure NetApp Files, serveur de fichiers) ou `azure` (objet blob de pages) |
| Ordre | Le fournisseur le plus proche d'abord, puis par préférence. Un site de basculement liste son propre fournisseur en premier |
| Objet blob de pages Azure | La chaîne de connexion est stockée comme clé protégée avec l'utilitaire `frx`, jamais en texte clair |
| Types de conteneurs | Fonctionne pour les conteneurs de profil et ODFC |
| Hôte de session | IOPS et espace disque supplémentaires : placez le cache sur un stockage de classe SSD ou NVMe. `CacheDirectory` se définit dans `HKLM\SYSTEM\CurrentControlSet\Services\frxccd\Parameters` et ne peut pas reposer sur la stratégie de groupe |

```text
CCDLocations (REG_SZ) in HKLM\SOFTWARE\FSLogix\Profiles
type=smb,name="FILES WEST",connectionString=\\stwestprofiles.file.core.windows.net\profiles;type=smb,name="FILES EAST",connectionString=\\steastprofiles.file.core.windows.net\profiles
```

Les paramètres respectent la casse (`type=smb`, `connectionString=`) et n'acceptent pas d'espace autour des délimiteurs.

Les paramètres d'inscription décident de ce qui se passe quand des fournisseurs sont indisponibles :

| Valeur | Par défaut | Recommandation / sens |
| --- | --- | --- |
| `ClearCacheOnLogoff` | 0 | 1 sur les hôtes partagés : supprime le cache local à la déconnexion pour économiser l'espace disque |
| `HealthyProvidersRequiredForRegister` | 0 | 1 : bloque la connexion quand aucun fournisseur n'est sain (à combiner avec `PreventLoginWithFailure`) |
| `HealthyProvidersRequiredForUnregister` | 1 | Nombre de fournisseurs sains nécessaires pour se déconnecter ; 0 n'est pas recommandé (risque de perte de données) |
| `CcdUnregisterTimeout` | 0 | Secondes pendant lesquelles la déconnexion attend les fournisseurs ; 0 attend indéfiniment |
| `ClearCacheOnForcedUnregister` | 0 | 1 supprime le cache local à l'expiration du délai (les données non écrites sont perdues) |

> **Conseil d'examen.** « Région principale Europe Ouest, basculement Europe Nord, les profils doivent survivre à une panne régionale » désigne Cloud Cache : les hôtes d'Europe Ouest listent d'abord le partage d'Europe Ouest puis celui d'Europe Nord ; les hôtes d'Europe Nord utilisent l'ordre inverse.

> **Piège d'examen.** Cloud Cache n'accélère pas la connexion et consomme du disque local et des IOPS. Si l'exigence est seulement « faire suivre les profils au moindre coût », gardez `VHDLocations` avec un seul partage.

<!-- section: app-masking | objectives: 3.1.5 -->
## Implémenter le masquage d'application FSLogix

Le masquage d'application permet à une seule image de servir des utilisateurs aux droits différents : l'application est installée sur tous les hôtes de session, et un **Rule Set** FSLogix la masque aux utilisateurs qui ne doivent pas l'utiliser. Le service `frxsvc` applique les règles.

1. Installez **FSLogix Apps RuleEditor** (inclus dans le téléchargement FSLogix) sur une machine de référence où l'application est installée.
2. Créez un Rule Set (**File > New**), choisissez l'application parmi les programmes installés et sélectionnez **Scan** : l'éditeur crée des règles de masquage pour ses fichiers, dossiers et clés de Registre.
3. Testez avec **Apply Rules to System** (éditeur exécuté en tant qu'administrateur), puis sélectionnez-le de nouveau pour retirer le test.
4. Sélectionnez **Manage Assignments** et définissez à qui les règles s'appliquent.
5. Copiez les deux fichiers dans `C:\Program Files\FSLogix\Apps\Rules` sur chaque hôte de session. Ils s'appliquent **immédiatement**.

| Fichier | Contient |
| --- | --- |
| `.fxr` | Les règles |
| `.fxa` | Les attributions |

Types de règles :

| Règle | Effet |
| --- | --- |
| Masquage (Hiding) | Masque des fichiers, des dossiers, des clés ou valeurs de Registre, des imprimantes ou des polices |
| Redirection | Redirige un chemin ou une clé vers un autre emplacement, par exemple des données hors profil vers le conteneur de profil |
| Valeur spécifiée (Specify value) | Définit une valeur de Registre à la connexion pour les utilisateurs concernés |
| App container (VHD) | Mis hors service le 11 février 2025 |

Les attributions peuvent cibler un utilisateur, un groupe, un processus, un emplacement réseau (adresse IP), un ordinateur, un conteneur d'annuaire (nom unique) ou une variable d'environnement. Un nouveau Rule Set commence avec `Everyone, Applies: No`. Les attributions sont traitées **de haut en bas** et la dernière correspondance décide : avec `Everyone: No` en haut et `CONTOSO\Sales: Yes` en dessous, les règles s'appliquent à Sales uniquement ; avec Everyone en bas, elles ne s'appliquent à personne.

> **Piège d'examen.** Les attributions de Rule Set exigent des utilisateurs et groupes Active Directory synchronisés avec Microsoft Entra ID et une visibilité réseau vers un contrôleur de domaine pour résoudre les SID. Les comptes cloud uniquement Microsoft Entra ID ne sont pas pris en charge.

> **Conseil d'examen.** « Masquer App1 à tous les utilisateurs sauf au groupe Finance, sans maintenir deux images » correspond au masquage d'application : une règle de masquage attribuée à Everyone (`Applies: Yes`) avec Finance (`Applies: No`) en dessous.

<!-- section: key-points -->
## Points clés

- Conteneur de profil unique en VHDX, `ProfileType = 0`, un seul partage SMB dans la région des hôtes de session : c'est la réponse par défaut.
- `Enabled` et `VHDLocations` sont les seules valeurs de profil obligatoires ; FSLogix ne crée aucune valeur à l'installation.
- Les groupes locaux d'inclusion et d'exclusion décident qui reçoit un conteneur ; l'exclusion l'emporte.
- ODFC seul va avec une solution de profils tierce ; `IncludeTeams` est désactivé par défaut.
- Cloud Cache utilise `CCDLocations` (quatre fournisseurs au maximum, jamais avec `VHDLocations`) pour la haute disponibilité ou la reprise entre régions ; plusieurs `VHDLocations` ne sont pas de la résilience.
- Masquage d'application : RuleEditor, fichiers `.fxr` + `.fxa` dans `C:\Program Files\FSLogix\Apps\Rules`, attributions ordonnées, identités synchronisées depuis AD uniquement.
