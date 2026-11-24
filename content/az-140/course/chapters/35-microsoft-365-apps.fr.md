Sur un hôte de session multisession, les applications de productivité qu'attendent les utilisateurs (Microsoft 365 Apps, OneDrive, Teams et un navigateur) doivent être installées **par ordinateur**, licenciées pour un **usage partagé**, mises à jour **par l'image** et réglées pour que leurs caches suivent l'utilisateur avec FSLogix sans le faire grossir. Les questions d'examen donnent un pool d'hôtes regroupé et demandent quel paramètre, quelle valeur de Registre ou quel commutateur d'installation manque.

<!-- section: m365-apps | objectives: 3.3.5 -->
## Microsoft 365 Apps sur les hôtes de session

**Éditions prises en charge.** Windows 11 et Windows 10 Entreprise multisession prennent en charge uniquement :

| Édition | Prise en charge en multisession |
| --- | --- |
| Microsoft 365 Apps for enterprise | Oui |
| Microsoft 365 Apps for business incluse dans **Microsoft 365 Business Premium** | Oui |
| Autres éditions d'Office (Office en licence en volume, offres grand public) | Non |

Deux façons d'obtenir les applications sur un hôte de session :

| Exigence | Réponse |
| --- | --- |
| Démarrage le plus rapide, sans image personnalisée | Image de la Place de marché **Windows 11 Enterprise multi-session + Microsoft 365 Apps**, proposée à la création du pool d'hôtes |
| Maîtrise des langues, du canal, des applications exclues | Installation avec l'**Outil de déploiement d'Office (ODT)** dans une image personnalisée, puis capture |

L'**activation d'ordinateurs partagés** (shared computer activation) est obligatoire quand plusieurs utilisateurs partagent la même machine : chaque utilisateur reçoit un jeton de licence au lancement d'une application, au lieu que la machine soit activée pour un seul utilisateur. Activez-la avec la propriété ODT `SharedComputerLicensing`, par stratégie de groupe (*Computer Configuration\Policies\Administrative Templates\Microsoft Office 2016 (Machine)\Licensing Settings*) ou par le Registre.

Exemple de `configuration.xml` utilisé par la documentation Azure Virtual Desktop :

```text
<Configuration>
  <Add OfficeClientEdition="64" Channel="MonthlyEnterprise">
    <Product ID="O365ProPlusRetail">
      <Language ID="en-US" />
      <Language ID="MatchOS" />
      <ExcludeApp ID="Groove" />
      <ExcludeApp ID="Lync" />
      <ExcludeApp ID="OneDrive" />
      <ExcludeApp ID="Teams" />
    </Product>
  </Add>
  <RemoveMSI/>
  <Updates Enabled="FALSE"/>
  <Display Level="None" AcceptEULA="TRUE" />
  <Logging Level="Standard" Path="%temp%\WVDOfficeInstall" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE"/>
  <Property Name="SharedComputerLicensing" Value="1"/>
</Configuration>
```

| Élément | Pourquoi |
| --- | --- |
| `OfficeClientEdition="64"` | 64 bits, l'édition recommandée par l'équipe Office |
| `Channel="MonthlyEnterprise"` | Canal Entreprise mensuel : des mises à jour mensuelles prévisibles |
| `ExcludeApp ID="OneDrive"` et `"Teams"` | Les deux s'installent à part, par ordinateur (sections suivantes) |
| `ExcludeApp ID="Lync"` | Skype Entreprise n'est pas pris en charge sur Azure Virtual Desktop |
| `RemoveMSI` | Supprime les installations MSI d'Office existantes |
| `Updates Enabled="FALSE"` | Pas de mises à jour automatiques sur les hôtes de session : les mises à jour passent par l'image |
| `SharedComputerLicensing` = `1` | Activation d'ordinateurs partagés |

Lancez `setup.exe /configure configuration.xml` depuis une invite élevée.

Après l'installation, la documentation applique ces paramètres, dont certains dans la **ruche de l'utilisateur par défaut** pour que chaque nouveau profil en hérite :

```powershell
# Default user hive: settings inherited by every new profile
reg load HKU\TempDefault C:\Users\Default\NTUSER.DAT
reg add HKU\TempDefault\SOFTWARE\Policies\Microsoft\office\16.0\common /v InsiderSlabBehavior /t REG_DWORD /d 2 /f
reg add "HKU\TempDefault\software\policies\microsoft\office\16.0\outlook\cached mode" /v enable /t REG_DWORD /d 1 /f
reg add "HKU\TempDefault\software\policies\microsoft\office\16.0\outlook\cached mode" /v syncwindowsetting /t REG_DWORD /d 1 /f
reg add "HKU\TempDefault\software\policies\microsoft\office\16.0\outlook\cached mode" /v CalendarSyncWindowSetting /t REG_DWORD /d 1 /f
reg add "HKU\TempDefault\software\policies\microsoft\office\16.0\outlook\cached mode" /v CalendarSyncWindowSettingMonths /t REG_DWORD /d 1 /f
reg unload HKU\TempDefault
# Machine: hide the update UI from users
reg add HKLM\SOFTWARE\Policies\Microsoft\office\16.0\common\officeupdate /v hideupdatenotifications /t REG_DWORD /d 1 /f
reg add HKLM\SOFTWARE\Policies\Microsoft\office\16.0\common\officeupdate /v hideenabledisableupdates /t REG_DWORD /d 1 /f
```

`InsiderSlabBehavior` = 2 masque l'option Office Insider ; les valeurs *cached mode* activent le mode Exchange mis en cache d'Outlook et limitent la fenêtre de synchronisation du courrier, ce qui garde le fichier OST petit ; la documentation règle aussi `CalendarSyncWindowSetting` et `CalendarSyncWindowSettingMonths` sur 1 dans la même clé.

**Mises à jour.** Avec les mises à jour automatiques désactivées, ajoutez les mises à jour à l'image personnalisée et redéployez régulièrement les hôtes de session, ou mettez à jour les hôtes manuellement quand aucun utilisateur n'est connecté, pour qu'aucune application Office ne soit en cours d'utilisation. Installez les applications métier après Microsoft 365 Apps.

**Où résident les données Office.** Le jeton de licence, le fichier OST d'Outlook et les caches Office sont propres à chaque utilisateur : dans un pool d'hôtes regroupé, ils suivent l'utilisateur dans le conteneur de profil FSLogix, ou dans un **conteneur ODFC** séparé dont le contenu par défaut comprend l'activation d'Office et les données Outlook, OneDrive et SharePoint (chapitre 31).

> **Piège d'examen.** Un pool d'hôtes regroupé où les utilisateurs doivent activer Office à chaque connexion n'a pas l'**activation d'ordinateurs partagés** (`SharedComputerLicensing` = `1`). Si l'activation fonctionne mais doit être refaite sur chaque nouvel hôte, le jeton de licence ne suit pas l'utilisateur : vérifiez le conteneur FSLogix (l'activation d'Office fait partie du contenu par défaut d'ODFC).

<!-- section: onedrive | objectives: 3.3.6 -->
## OneDrive dans les environnements multisession

Par défaut, l'application de synchronisation OneDrive s'installe **par utilisateur** dans `%localappdata%`. Sur un hôte multisession ou non persistant, elle doit être installée **par ordinateur** (dans `C:\Program Files\Microsoft OneDrive`), comme l'exigent les environnements non persistants. C'est pourquoi l'exemple ODT exclut OneDrive.

La séquence documentée, depuis une invite élevée (`C:\Staging` désigne votre emplacement intermédiaire) :

```powershell
# 1. Remove a per-user OneDrive installed with Office, if any
C:\Staging\OneDriveSetup.exe /uninstall
# 2. Mark the machine for an all-users installation
REG ADD "HKLM\Software\Microsoft\OneDrive" /v "AllUsersInstall" /t REG_DWORD /d 1 /reg:64
# 3. Install per machine
C:\Staging\OneDriveSetup.exe /allusers
# 4. Start OneDrive at sign-in for every user
REG ADD "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v OneDrive /t REG_SZ /d "C:\Program Files\Microsoft OneDrive\OneDrive.exe /background" /f
# 5. Sign users in silently with their Windows credentials
REG ADD "HKLM\SOFTWARE\Policies\Microsoft\OneDrive" /v "SilentAccountConfig" /t REG_DWORD /d 1 /f
# 6. Move Desktop, Documents and Pictures to OneDrive without prompting
REG ADD "HKLM\SOFTWARE\Policies\Microsoft\OneDrive" /v "KFMSilentOptIn" /t REG_SZ /d "<tenant-id>" /f
```

| Exigence | Paramètre |
| --- | --- |
| Les utilisateurs ne doivent pas avoir à se connecter à OneDrive | `SilentAccountConfig` = 1 (exige une machine connectée à Microsoft Entra ID ; la connexion silencieuse peut prendre quelques secondes) |
| Rediriger les dossiers connus sans interaction de l'utilisateur | `KFMSilentOptIn` = l'**ID du locataire** Microsoft Entra (une chaîne, pas 1) |
| OneDrive doit démarrer dans chaque session | Clé `Run` dans HKLM avec `/background` |
| Une seule installation pour tous les utilisateurs, mise à jour de façon centralisée | `AllUsersInstall` = 1 et `OneDriveSetup.exe /allusers` |

OneDrive sur des bureaux non persistants est pris en charge avec Azure Virtual Desktop, et avec FSLogix (dernière version) pour le conteneur de profil ou le conteneur Office sous Windows 11 ou Windows Server 2025 et versions ultérieures. Le cache OneDrive est propre à chaque utilisateur : avec un conteneur ODFC, les données OneDrive sont incluses par défaut et peuvent être dimensionnées à part, par exemple un conteneur de profil de 10 Go et un conteneur ODFC de 50 Go pour les gros utilisateurs de OneDrive. FSLogix ne prend pas en charge l'exécution simultanée de plusieurs instances du même conteneur.

> **Piège d'examen.** `KFMSilentOptIn` attend l'**ID du locataire**, alors que `SilentAccountConfig` est un DWORD à 1. Et `OneDriveSetup.exe /allusers` sans la valeur `AllUsersInstall`, ou en laissant une copie par utilisateur en place, n'est pas l'installation par ordinateur documentée.

<!-- section: teams | objectives: 3.3.7 -->
## Microsoft Teams et l'optimisation des médias

Sans optimisation, l'audio et la vidéo de Teams sont encodés sur l'hôte de session et envoyés par RDP, ce qui charge le processeur de l'hôte et ajoute de la latence. L'**optimisation des médias** déporte les appels et les réunions vers l'appareil local ; la conversation et la collaboration fonctionnent partout.

| Composant | Utilisé par | Où il s'exécute |
| --- | --- | --- |
| **SlimCore** (nouvelle architecture d'optimisation VDI) | Le nouveau Teams, par défaut | Moteur multimédia `MsTeamsVdi.exe` sur le **client** ; son plug-in est fourni avec Windows App et télécharge automatiquement SlimCore (un package MSIX) depuis le CDN de Microsoft |
| **Service redirecteur WebRTC Bureau à distance** (Remote Desktop WebRTC Redirector Service) | Teams classique ; **solution de secours** pour le nouveau Teams quand le client ne peut pas utiliser SlimCore | Installé sur l'**hôte de session** (MSI) |

Microsoft recommande d'installer le service redirecteur WebRTC à côté du nouveau Teams, pour qu'un utilisateur qui passe sur un appareil sans prise en charge de SlimCore reste optimisé. Teams essaie d'abord SlimCore, puis WebRTC, puis revient au rendu côté serveur, non optimisé.

**Teams classique** a atteint la fin du support le 1er octobre 2026 sur les bureaux virtuels, et sa fin de disponibilité est fixée au 1er avril 2027 : déployez le **nouveau Teams**. Les mêmes dates retirent l'**optimisation basée sur WebRTC** des points de terminaison Windows : depuis le 1er octobre 2026, elle fonctionne encore mais n'est plus prise en charge, et à partir du 1er avril 2027 elle cesse de fonctionner ; un client du nouveau Teams qui ne peut pas utiliser SlimCore revient alors au rendu côté serveur. Les points de terminaison macOS suivent (fin du support le 1er avril 2027, fin de disponibilité le 1er septembre 2027) ; les clients légers Linux pris en charge ne sont pas concernés.

Configuration d'un hôte de session :

| Étape | Comment |
| --- | --- |
| 1. Prérequis | Windows 11 ou Windows 10 Entreprise (multisession ou mono-session ; éditions N et KN non prises en charge) ; dernière version de Microsoft Visual C++ Redistributable sur les hôtes de session et les clients ; WebView2 en multisession |
| 2. Déclarer l'environnement | `HKLM\SOFTWARE\Microsoft\Teams`, `IsWVDEnvironment` (DWORD) = 1 |
| 3. Service redirecteur WebRTC | Installez le MSI (`https://aka.ms/msrdcwebrtcsvc/msi`) |
| 4. Installer le nouveau Teams par ordinateur | `teamsbootstrapper.exe -p` (requis pour les pools d'hôtes regroupés) |
| 5. FSLogix | FSLogix 2210 hotfix 4 ou ultérieur (recommandé par la documentation Teams ; la page Azure Virtual Desktop indique le hotfix 3 comme minimum) ; avec un conteneur ODFC, réglez `IncludeTeams` = 1 (désactivé par défaut) pour conserver le cache Teams |

```powershell
New-Item -Path "HKLM:\SOFTWARE\Microsoft\Teams" -Force
New-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Teams" -Name IsWVDEnvironment -PropertyType DWORD -Value 1 -Force
# Provision new Teams for all users (online, latest version)
.\teamsbootstrapper.exe -p
# Offline: provision from a local MSIX package (full path required)
.\teamsbootstrapper.exe -p -o "C:\Staging\MSTeams-x64.msix"
# Remove Teams for all users
.\teamsbootstrapper.exe -x
```

Le nouveau Teams est un package MSIX installé dans `C:\Program Files\WindowsApps` qui **se met à jour automatiquement**. Dans un pool non persistant, réglez `disableAutoUpdate` (DWORD) = 1 sous `HKLM\SOFTWARE\Microsoft\Teams` et mettez Teams à jour par l'image. Cette valeur n'est prise en compte que par les builds de Teams supérieurs à 23306.3314.2555.9628, et quand elle est définie, le programme d'installation MSIX n'installe ni ne met à niveau le complément Teams Meeting (Teams Meeting Add-in) : approvisionnez-le avec `teamsbootstrapper.exe -p --installTMA` (ou `--installTMA` seul si Teams est déjà approvisionné). Pour l'installation hors connexion, copiez le MSIX dans un dossier local : un chemin UNC peut échouer avec l'erreur `0x80070032`. Pour publier le nouveau Teams en tant que RemoteApp, utilisez le chemin stable `shell:appsFolder\MSTeams_8wekyb3d8bbwe!MSTeams`, car le dossier du package change à chaque version.

**Clients.** L'optimisation exige un client pris en charge : Windows App sur Windows, macOS (version hors Store pour le nouveau Teams), iOS/iPadOS et Android. Le client web ne figure pas dans la liste, et la documentation Teams ne prend plus en charge le client Bureau à distance pour le nouveau Teams. SlimCore exige aussi une version récente de Windows App, et les administrateurs Teams peuvent le désactiver par utilisateur avec le paramètre `VDI2Optimization` de `Set-CsTeamsVdiPolicy`.

**Vérifier.** Dans Teams, *Paramètres > À propos de Teams* affiche **AVD SlimCore Media Optimized** (SlimCore) ou **AVD Media Optimized** (WebRTC). *AVD Media not connected*, ou une liste de périphériques qui affiche *Remote audio*, signifie que l'optimisation ne s'est pas chargée : redémarrez Teams, puis vérifiez la version du client et la valeur de Registre.

**Teams non optimisé.** Si l'optimisation des médias est impossible, redirigez les périphériques par les propriétés RDP du pool d'hôtes : `audiocapturemode:i:1` (microphone), `audiomode:i:0` (lire l'audio localement) et `camerastoredirect:s:*` (toutes les caméras). Avec l'optimisation, cette redirection est inutile pour Teams.

> **Piège d'examen.** Le service redirecteur WebRTC s'installe sur l'**hôte de session**, pas sur l'appareil de l'utilisateur, et `IsWVDEnvironment` se règle aussi sur l'hôte de session. Un pool d'hôtes regroupé exige une installation de Teams **par ordinateur** (`teamsbootstrapper.exe -p`) ; un programme d'installation par utilisateur est la mauvaise réponse.

<!-- section: browsers | objectives: 3.3.8 -->
## Les navigateurs dans les sessions Azure Virtual Desktop

Microsoft Edge est inclus dans Windows 10 et Windows 11. Installez un autre canal ou une autre version en mode silencieux à partir du MSI Microsoft Edge for Business : `msiexec /i <path_to_msi> /qn /norestart`. Les mêmes règles que pour les autres applications s'appliquent :

| Sujet | Recommandation pour les pools d'hôtes regroupés |
| --- | --- |
| Mises à jour | Désactivez les mises à jour automatiques et mettez Edge à jour dans l'**image de référence**, pour que tous les hôtes du pool exécutent la même version |
| Favoris, historique, paramètres | **Synchronisation Microsoft Entra ID** (synchronisation Entreprise) : prend en charge plusieurs sessions simultanées et des versions différentes. La synchronisation locale ne prend pas en charge les sessions simultanées |
| Itinérance du dossier de données utilisateur | Ne redirigez pas tout le dossier `User Data` ; si vous en redirigez une partie, excluez les caches (`Default\Cache`, `Default\Code Cache`, dossiers d'icônes des listes de raccourcis) |
| Dimensionnement | Recommandation Edge pour les bureaux virtuels : 2 à 4 cœurs vCPU et 1 Go de RAM par utilisateur au minimum ; les applications web volumineuses et les extensions demandent plus |
| Paramètres | Stratégies Edge par stratégie de groupe (ADMX Edge) ou par le **catalogue de paramètres** Intune, ou par le service de gestion Microsoft Edge |

La **redirection multimédia** (chapitre 32) passe par une extension de navigateur pour **Microsoft Edge et Google Chrome**. L'extension est fournie avec le MSI de l'hôte et peut être imposée par une stratégie du navigateur, par exemple dans le catalogue de paramètres Intune (*Microsoft Edge > Extensions > Configure extension management settings*) :

```json
{
  "joeclbldhdmoijbaagobkhlpfjglcihd": {
    "installation_mode": "force_installed",
    "runtime_blocked_hosts": [ "*://*.contoso.com" ],
    "update_url": "https://edge.microsoft.com/extensionwebstorebase/v1/crx",
    "toolbar_state": "default_shown"
  }
}
```

`runtime_blocked_hosts` bloque l'extension sur les sites listés ; `runtime_allowed_hosts` crée seulement des exceptions et n'active pas la redirection sur un site absent des listes prises en charge. Redémarrez les hôtes de session après l'application de la stratégie. Le service de l'hôte ne se met pas à jour seul (réinstallez le MSI plus récent) ; l'extension, si.

> **Conseil d'examen.** « Les utilisateurs d'un pool d'hôtes regroupé perdent leurs favoris Edge quand ils se connectent à un autre hôte et ont parfois deux sessions à la fois » désigne la **synchronisation Microsoft Entra ID**, pas la redirection du dossier de profil Edge.

<!-- section: key-points -->
## Points clés

- Microsoft 365 Apps en multisession : Microsoft 365 Apps for enterprise, ou for business avec Business Premium, avec `SharedComputerLicensing` = 1, en 64 bits, mises à jour automatiques désactivées et mises à jour par l'image.
- Excluez OneDrive et Teams de l'installation ODT et installez-les tous deux **par ordinateur**.
- OneDrive : `AllUsersInstall` = 1, `OneDriveSetup.exe /allusers`, `SilentAccountConfig` = 1, `KFMSilentOptIn` = ID du locataire.
- Teams : nouveau Teams par `teamsbootstrapper.exe -p`, `IsWVDEnvironment` = 1, service redirecteur WebRTC sur l'hôte en secours (retiré sur les points de terminaison Windows : fin de disponibilité le 1er avril 2027), SlimCore sur le client ; vérifiez l'état optimisé dans *À propos de Teams*.
- FSLogix : 2210 hotfix 4 ou ultérieur pour le nouveau Teams ; ODFC inclut par défaut l'activation d'Office, Outlook et OneDrive, Teams seulement avec `IncludeTeams` = 1.
- Edge : mise à jour dans l'image, synchronisation Microsoft Entra ID pour l'itinérance, extension de redirection multimédia pour Edge et Chrome.
