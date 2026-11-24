Windows Server s'administre à distance : depuis Windows Admin Center en local ou dans le portail Azure, depuis PowerShell via WinRM ou SSH, par des points de terminaison JEA, ou avec le Bureau à distance. Les questions d'examen posent une contrainte (aucun port entrant, aucune information d'identification stockée, privilège minimum, un second serveur atteint depuis le premier) et demandent quel outil ou quelle configuration la respecte.

<!-- section: wac-on-premises | objectives: 2.1.1 -->
## Windows Admin Center en local

Windows Admin Center (WAC) est un outil de gestion accessible depuis un navigateur. Sa **passerelle** s'exécute sur une machine Windows et gère les serveurs cibles avec la communication à distance PowerShell et WMI via **WinRM** : rien n'est installé sur les serveurs gérés. La passerelle actuelle est la **passerelle modernisée** (back-end .NET 8, serveur web Kestrel, HTTP/2).

| Type d'installation | Installé sur | Usage |
| --- | --- | --- |
| Client local | Windows 11, ouvert sur `https://localhost:6516` | Démarrage rapide, tests, petite échelle |
| Serveur de passerelle | Windows Server 2016 à 2025 | Accès partagé depuis tout navigateur qui atteint la passerelle ; grande échelle |
| Serveur géré | Le serveur à gérer lui-même | Possible mais déconseillé : gérez-le plutôt à distance |
| Cluster de basculement | Un cluster, en mode actif-passif | Haute disponibilité du service de passerelle |

Règles à connaître :

- Installer WAC sur un **contrôleur de domaine** n'est pas pris en charge.
- Nœuds gérés : Windows Server 2016 à 2025 et leurs clusters de basculement, Windows 11 ; Windows Server 2012 et 2012 R2 demandent WMF 5.1 ou ultérieur.
- Certificat TLS : un certificat existant avec l'EKU Authentification du serveur dans `LocalMachine\My`, ou un certificat **auto-signé** généré par le programme d'installation, valide **60 jours** (tests uniquement).
- Installation : **Express** (accès réseau et port choisis selon le système) ou **Personnalisée** (port, empreinte du certificat, FQDN du point de terminaison, mode des hôtes approuvés, WinRM sur HTTPS).
- Navigateurs pris en charge : Microsoft Edge et Google Chrome.

L'accès comporte deux niveaux :

| Niveau | Rôles | Configuré par |
| --- | --- | --- |
| Accès à la passerelle | **Utilisateurs de la passerelle** (se connecter et gérer des serveurs) et **Administrateurs de la passerelle** (décident aussi qui a accès et comment les utilisateurs s'authentifient) | Groupes Active Directory ou locaux (éventuellement des groupes de carte à puce), ou Microsoft Entra ID (ajoute l'accès conditionnel et la MFA) |
| Serveur cible | Les informations d'identification de l'utilisateur doivent être administrateur de chaque cible, **ou** un rôle de contrôle d'accès en fonction du rôle de WAC | La page **Contrôle d'accès en fonction du rôle** du serveur, ou un script distribué avec DSC sur de nombreux serveurs |

Les rôles RBAC intégrés sont fournis sous forme d'un **point de terminaison JEA** sur chaque serveur géré : **Administrators** (la plupart des outils, mais ni PowerShell ni Bureau à distance : scénario de serveur de rebond), **Readers** (consultation seule), **Hyper-V Administrators** (modifier les machines virtuelles et les commutateurs virtuels, le reste en lecture seule). Impossible de créer des rôles personnalisés.

> **Piège d'examen.** L'accès à la passerelle ne donne jamais de droits sur les serveurs cibles. Un utilisateur de la passerelle sans droits d'administrateur ni rôle RBAC de WAC sur Server2 peut se connecter à la passerelle mais ne peut pas gérer Server2.

<!-- section: wac-azure-portal | objectives: 2.1.1 -->
## Windows Admin Center dans le portail Azure

WAC s'ouvre aussi depuis le portail Azure, sur la page de ressource d'une **machine virtuelle Azure** ou d'un **serveur activé pour Azure Arc** (Paramètres > Windows Admin Center). Il s'installe sous forme de l'extension de machine virtuelle `AdminCenter` (éditeur `Microsoft.AdminCenter`), sur **chaque** machine. L'extension est sans coût, mais sur un serveur activé pour Azure Arc, Windows Admin Center dans Azure est un avantage de Windows Server Management enabled by Azure Arc : il n'est disponible qu'avec une attestation Software Assurance ou le paiement à l'utilisation (pay-as-you-go) de Windows Server.

| | Machine virtuelle Azure | Serveur activé pour Arc |
| --- | --- | --- |
| Système d'exploitation | Windows Server 2016 ou ultérieur (aussi Windows 10/11) | Windows Server 2016 ou ultérieur |
| Mémoire | 3 Gio ou plus | 3 Go ou plus |
| Connectivité entrante | IP privée (recommandée, depuis un réseau relié au réseau virtuel, par exemple un VPN) ou IP publique avec une règle NSG entrante sur le port WAC (**6516** par défaut) depuis les IP d'administration | **Aucune** : le portail atteint la machine par une session de proxy inverse de l'agent Connected Machine (fournisseur de ressources `Microsoft.HybridConnectivity`) |
| Sortante | HTTPS 443 vers les étiquettes de service `WindowsAdminCenter` et `AzureActiveDirectory` | HTTPS 443 vers les points de terminaison du service WAC |
| Rôle pour installer | Owner ou Contributor | Owner, Contributor ou Windows Admin Center Administrator Login |
| Rôle pour se connecter | **Reader** + **Windows Admin Center Administrator Login** sur la machine | **Reader** + **Windows Admin Center Administrator Login** sur la machine |
| Clouds | Cloud public Azure uniquement | Cloud public Azure uniquement, dans les régions prises en charge |

```powershell
# Azure VM: install the extension on port 6516
Set-AzVMExtension -ResourceGroupName RG1 -Location westeurope -VMName VM1 `
    -Name "AdminCenter" -Publisher "Microsoft.AdminCenter" -Type "AdminCenter" `
    -TypeHandlerVersion "0.0" -Settings @{ "port" = "6516" }

# Arc-enabled server: allow the WAC port for incoming reverse proxy connections
azcmagent config set incomingconnections.ports 6516
```

> **Piège d'examen.** Owner ou Contributor sur la machine virtuelle permet d'installer l'extension, pas de se connecter par WAC : la connexion demande le rôle **Windows Admin Center Administrator Login**, qui ne peut pas être attribué à l'étendue d'un groupe d'administration.

Limitations : Azure Bastion et le trafic redirigé par Azure Firewall ne sont pas pris en charge ; les extensions WAC tierces ne sont pas disponibles ; installer l'extension sur une machine qui exécute déjà une passerelle WAC autonome la limite à la gestion d'elle-même.

<!-- section: powershell-remoting | objectives: 2.1.2 -->
## Communication à distance PowerShell et double saut

La communication à distance PowerShell utilise **WinRM** (WS-Management) : TCP **5985** (HTTP, le trafic reste chiffré par Kerberos ou NTLM) et **5986** (HTTPS, demande un écouteur avec certificat). Elle est activée par défaut sur Windows Server ; `Enable-PSRemoting` recrée l'écouteur, les règles de pare-feu et les points de terminaison par défaut. Dans un domaine, l'authentification est Kerberos ; vers un serveur de groupe de travail ou par adresse IP, ajoutez la cible à `TrustedHosts` sur le client (NTLM) ou utilisez HTTPS.

```powershell
Enter-PSSession -ComputerName SRV1                       # interactive, one server
Invoke-Command -ComputerName SRV1, SRV2 -ScriptBlock { Get-Service W32Time }   # fan-out
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "WG-SRV1" -Concatenate
```

Le problème du **double saut** : depuis ServerA, vous ouvrez une session sur ServerB, puis une commande sur ServerB accède à ServerC (un partage, une autre session distante). Kerberos ne transmet pas vos informations d'identification par défaut, et le second saut échoue avec un accès refusé.

| Option | Informations d'identification stockées sur ServerB | Points principaux |
| --- | --- | --- |
| CredSSP | **Oui** (exposées si ServerB est compromis) | `Enable-WSManCredSSP -Role Client -DelegateComputer ServerB` sur A, `-Role Server` sur B. Ne fonctionne pas pour les membres de Protected Users. Seulement dans des cas de très grande confiance |
| Délégation Kerberos non contrainte | Non | Déconseillée : aucun contrôle de la destination des informations d'identification. Ne prend pas en charge le second saut pour WinRM |
| Délégation Kerberos contrainte | Non | Définie sur l'objet AD de ServerB, demande des droits Domain Admins, un seul domaine. Ne prend pas en charge le second saut pour WinRM |
| **Délégation Kerberos contrainte basée sur les ressources** | Non | Définie sur **ServerC** avec `Set-ADComputer`, sans droits Domain Admins, fonctionne entre domaines et forêts, Windows Server 2012 ou ultérieur. Ne prend pas en charge le second saut pour WinRM |
| Point de terminaison JEA sur ServerB | Non | La session s'exécute sous un compte virtuel ou un gMSA qui a l'accès nécessaire |
| Configuration de session avec un compte RunAs sur ServerB | Non | À configurer sur chaque serveur intermédiaire ; un compte RunAs de domaine impose de gérer son mot de passe |
| Informations d'identification explicites dans le script (`$Using:cred`) | Non | Aucune configuration serveur, code peu pratique |

```powershell
# Resource-based constrained delegation: ServerB may delegate to ServerC
$ServerB = Get-ADComputer -Identity ServerB
Set-ADComputer -Identity ServerC -PrincipalsAllowedToDelegateToAccount $ServerB

# Clear ServerB's cached Kerberos tickets (the KDC caches failures for 15 minutes)
Invoke-Command -ComputerName ServerB -ScriptBlock { klist purge -li 0x3e7 }
```

> **Piège d'examen.** La délégation contrainte basée sur les ressources se configure sur la **ressource** (ServerC, le dernier saut), en listant l'ordinateur qui délègue (ServerB). La délégation contrainte classique se configure sur ServerB. Aucune des deux ne stocke d'informations d'identification, contrairement à CredSSP. Aucune des options de délégation Kerberos ne prend en charge le second saut pour WinRM, c'est-à-dire une session distante imbriquée de ServerB vers ServerC.

<!-- section: jea | objectives: 2.1.2 -->
## Just Enough Administration (JEA)

JEA est un point de terminaison de communication à distance PowerShell restreint : les utilisateurs se connectent avec leur propre compte non privilégié, ne voient que les commandes autorisées pour leur rôle, et les commandes s'exécutent sous une identité **run-as** privilégiée. Deux fichiers :

| Fichier | Créé avec | Contient | Emplacement |
| --- | --- | --- | --- |
| Capacité de rôle (`.psrc`) | `New-PSRoleCapabilityFile` | Ce qu'un rôle peut exécuter : `VisibleCmdlets` (avec les paramètres et valeurs autorisés), `VisibleFunctions`, `VisibleExternalCommands`, `VisibleProviders` | Un dossier `RoleCapabilities` dans un module PowerShell de `$env:PSModulePath` |
| Configuration de session (`.pssc`) | `New-PSSessionConfigurationFile` | Qui reçoit quel rôle (`RoleDefinitions`), identité run-as, transcriptions, mode de langage | N'importe quel dossier ; inscrit avec `Register-PSSessionConfiguration` |

Identité run-as :

| Paramètre | Identité | Usage |
| --- | --- | --- |
| `RunAsVirtualAccount = $true` | Un compte temporaire par session, membre du groupe local **Administrators** (sur un contrôleur de domaine : **Domain Admins**) | Choix par défaut, tâches locales |
| `RunAsVirtualAccountGroups` | Compte virtuel placé uniquement dans les groupes locaux listés | Moins de droits qu'un administrateur local |
| `GroupManagedServiceAccount` | Un gMSA, une seule identité de domaine partagée par tous les utilisateurs | Les commandes doivent atteindre des **ressources réseau** (partages, autres serveurs) |

```powershell
New-PSSessionConfigurationFile -Path .\DnsOps.pssc -SessionType RestrictedRemoteServer `
    -RunAsVirtualAccount -TranscriptDirectory "C:\ProgramData\JEA\Transcripts" `
    -RoleDefinitions @{ 'CONTOSO\G-DnsOperators' = @{ RoleCapabilities = 'DnsOperator' } }
Test-PSSessionConfigurationFile -Path .\DnsOps.pssc
Register-PSSessionConfiguration -Name DnsOps -Path .\DnsOps.pssc

# From the operator's computer
Enter-PSSession -ComputerName DNS1 -ConfigurationName DnsOps
```

Les sessions `RestrictedRemoteServer` s'exécutent en mode **NoLanguage** avec quelques commandes par défaut (`Get-Command`, `Get-Help`, `Exit-PSSession`, `Select-Object`, `Measure-Object`...). `RoleCapabilities` utilise le nom de base du fichier `.psrc`. Pour modifier une configuration, désinscrivez-la puis inscrivez le fichier mis à jour. `RequiredGroups` ajoute des conditions, comme l'appartenance à un groupe de carte à puce.

> **Conseil d'examen.** « Les opérateurs du support doivent redémarrer le service DNS sur DNS1 sans être administrateurs, et chaque commande doit être journalisée » signifie JEA avec une capacité de rôle qui expose `Restart-Service -Name DNS` et un dossier de transcriptions. Un gMSA n'est nécessaire que si les commandes doivent accéder à un autre serveur.

<!-- section: ssh | objectives: 2.1.3 -->
## Accès à distance SSH

Windows Server inclut le serveur OpenSSH (service `sshd`). Sur **Windows Server 2025**, il est **installé par défaut**, et **Remote SSH Access** s'active ou se désactive sur la page Serveur local du Gestionnaire de serveur. Sur Windows Server 2019 et 2022, ajoutez d'abord la fonctionnalité facultative OpenSSH Server.

```powershell
# Windows Server 2019/2022: add the feature
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd
# The setup creates the inbound firewall rule OpenSSH-Server-In-TCP (TCP 22)

# Connect from a client
ssh contoso\admin1@srv1.contoso.com
```

La configuration se trouve dans `C:\ProgramData\ssh` (`sshd_config` et les clés d'hôte). Redémarrez `sshd` après une modification.

| Exigence | Configuration |
| --- | --- |
| Seuls certains utilisateurs peuvent se connecter | Ajoutez-les au groupe local **OpenSSH Users** (Windows Server 2025), ou `AllowGroups` / `AllowUsers` dans `sshd_config` |
| Authentification par clé, utilisateur standard | Clé publique dans `C:\Users\<user>\.ssh\authorized_keys` |
| Authentification par clé, **administrateur** | Clé publique dans `C:\ProgramData\ssh\administrators_authorized_keys`, ACL limitée à Administrators et SYSTEM |
| Arriver dans PowerShell au lieu de cmd.exe | Valeur `DefaultShell` sous `HKLM:\SOFTWARE\OpenSSH` |
| Charger les clés privées sur le client | Service `ssh-agent` (désactivé par défaut), puis `ssh-add` |
| Communication à distance PowerShell via SSH | PowerShell 7 des deux côtés, une ligne `Subsystem powershell` dans `sshd_config`, puis `Enter-PSSession -HostName` |

```powershell
icacls.exe "$env:ProgramData\ssh\administrators_authorized_keys" /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F"
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell `
    -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -PropertyType String -Force
```

> **Piège d'examen.** Pour un membre d'Administrators, une clé placée dans son propre `authorized_keys` est ignorée : le `sshd_config` par défaut renvoie les administrateurs vers `administrators_authorized_keys`. Une ACL incorrecte sur ce fichier fait aussi échouer l'authentification par clé.

<!-- section: remote-desktop | objectives: 2.1.4 -->
## Accès Bureau à distance

Le Bureau à distance (RDP, TCP et UDP **3389**) est désactivé par défaut sur Windows Server. Activez-le dans le Gestionnaire de serveur (Serveur local > Bureau à distance), dans `sconfig` ou avec PowerShell, et ouvrez le groupe de pare-feu **Remote Desktop**.

```powershell
Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name fDenyTSConnections -Value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
Add-LocalGroupMember -Group "Remote Desktop Users" -Member "CONTOSO\G-Operators"
```

| Point | Règle |
| --- | --- |
| Qui peut se connecter | Les administrateurs et les membres de **Remote Desktop Users** (tous deux détiennent le droit utilisateur *Allow log on through Remote Desktop Services*) ; un droit *Deny log on through Remote Desktop Services* l'emporte |
| Authentification au niveau du réseau (NLA) | Exigée par défaut : l'utilisateur s'authentifie avant la création d'une session, ce qui protège le serveur d'une consommation de ressources non authentifiée |
| Licences | Sans le rôle Services Bureau à distance, deux sessions administratives simultanées sont autorisées ; davantage d'utilisateurs demandent l'hôte de session Bureau à distance et des CAL RDS |
| Port | Modifiez `PortNumber` sous `HKLM\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp`, puis mettez à jour le pare-feu |
| Configuration centralisée | GPO : Configuration ordinateur > Stratégies > Modèles d'administration > Composants Windows > Services Bureau à distance |

Protéger les informations d'identification des administrateurs sur la cible :

| Mode | Commande | Comportement |
| --- | --- | --- |
| Mode Administration restreinte (Restricted Admin) | `mstsc /restrictedAdmin` | Les informations d'identification ne sont pas envoyées au serveur ; l'utilisateur doit être dans le groupe **Administrators** de la cible ; l'accès réseau depuis la session utilise l'**identité du serveur** (pas d'authentification unique, pas de RDP multisaut) |
| Remote Credential Guard | `mstsc /remoteGuard` | Les informations d'identification restent sur le client ; l'accès réseau depuis la session se fait **en tant qu'utilisateur** (authentification unique, RDP multisaut) ; **Kerberos uniquement** (pas de repli NTLM), cible jointe à AD DS ; pas via RD Gateway ni RD Connection Broker |

Les deux modes demandent que la stratégie *Remote host allows delegation of nonexportable credentials* soit activée sur la cible. Sur les clients, la stratégie *Restrict delegation of credentials to remote servers* (Modèles d'administration > Système > Délégation d'informations d'identification) peut exiger Restricted Admin, exiger Remote Credential Guard, ou exiger l'un des deux (*Restrict credential delegation* : Remote Credential Guard d'abord, Restricted Admin s'il ne peut pas être utilisé). Avec *Restrict credential delegation*, le commutateur `/restrictedAdmin` est ignoré et Remote Credential Guard est utilisé. Pour les connexions du support technique à des clients peut-être compromis, Microsoft recommande le mode Restricted Admin, pas Remote Credential Guard.

> **Conseil d'examen.** « Les administrateurs doivent atteindre des partages de fichiers depuis la session RDP sans que leurs informations d'identification soient stockées sur le serveur » signifie Remote Credential Guard. Le mode Administration restreinte évite aussi de stocker les informations d'identification, mais la session accède au réseau en tant que serveur, pas en tant qu'utilisateur.

Pour les machines virtuelles Azure, évitez tout port RDP public : Azure Bastion ou l'accès juste-à-temps aux machines virtuelles (chapitre sur les machines virtuelles Azure).

<!-- section: key-points -->
## Points clés

- Passerelle WAC : pas sur un contrôleur de domaine ; utilisateurs ou administrateurs de la passerelle ; les droits sur la cible viennent d'informations d'identification d'administrateur ou des rôles RBAC de WAC (JEA).
- WAC dans le portail Azure : extension `AdminCenter` ; une machine virtuelle Azure demande un chemin vers le port 6516, Arc n'a besoin d'aucun port entrant ; connexion avec Reader + Windows Admin Center Administrator Login.
- WinRM 5985/5986 ; double saut : préférez la délégation contrainte basée sur les ressources (définie sur le dernier serveur, pas pour un saut WinRM imbriqué) ou JEA ; CredSSP stocke les informations d'identification.
- JEA : `.psrc` (quoi) dans le dossier `RoleCapabilities` d'un module + `.pssc` (qui, sous quelle identité) inscrit comme point de terminaison ; gMSA pour l'accès réseau.
- OpenSSH : installé par défaut sur Windows Server 2025 ; clés des administrateurs dans `administrators_authorized_keys`.
- RDP : désactivé par défaut, NLA activée, groupe Remote Desktop Users ; Remote Credential Guard garde les informations d'identification sur le client et agit en tant qu'utilisateur.
