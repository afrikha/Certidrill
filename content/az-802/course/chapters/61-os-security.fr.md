Sécuriser Windows Server consiste à empiler plusieurs couches : des atténuations contre les attaques, une liste d'autorisation du code, l'isolation des informations d'identification, des contrôles de réputation, une base de référence qui résiste à la dérive, des mots de passe d'administrateur local renouvelés, une protection cloud contre les menaces et un pare-feu sur l'hôte. Les questions nomment un serveur et un objectif, puis demandent quelle fonctionnalité, quel paramètre ou quelle cmdlet l'atteint.

<!-- section: exploit-protection | objectives: 6.1.1 -->
## Protection contre les attaques (exploit protection)

La protection contre les attaques applique des atténuations mémoire et processus à tout le système ou à des programmes précis. Elle se configure dans **Sécurité Windows > Contrôle des applications et du navigateur > Paramètres de protection contre les attaques**, avec deux onglets : **Paramètres système** et **Paramètres du programme**.

| Atténuation | Portée | Mode audit |
| --- | --- | --- |
| Control flow guard (CFG) | Système et application | Non |
| Prévention de l'exécution des données (DEP) | Système et application | Non |
| Force randomization for images (ASLR obligatoire) | Système et application | Non |
| Randomize memory allocations (ASLR ascendant) | Système et application | Non |
| Validate exception chains (SEHOP) | Système et application | Non |
| Validate heap integrity | Système et application | Non |
| Arbitrary code guard (ACG), Code integrity guard, Don't allow child processes, Block untrusted fonts | Application uniquement | Oui |

Les paramètres du programme remplacent les paramètres système pour cet exécutable ; `NOTSET` signifie que la valeur système s'applique.

```powershell
# System level
Get-ProcessMitigation -System
Set-ProcessMitigation -System -Enable DEP

# One program
Set-ProcessMitigation -Name C:\Apps\Lob\app.exe -Enable DEP,DisallowChildProcessCreation
Set-ProcessMitigation -Name C:\Apps\Lob\app.exe -Enable AuditDynamicCode
```

Pour déployer une même configuration sur de nombreux serveurs, **exportez-la dans un fichier XML** depuis une machine de référence, puis déployez ce fichier :

- Stratégie de groupe : **Configuration ordinateur > Modèles d'administration > Composants Windows > Microsoft Defender Exploit Guard > Exploit Protection > Use a common set of exploit protection settings**, activé, avec le chemin local, le chemin UNC ou l'URL du fichier XML.
- Les modifications au niveau système exigent un redémarrage ; celles au niveau programme, non.

> **Piège d'examen.** Les atténuations au niveau système (DEP, ASLR, CFG, SEHOP, intégrité du tas) n'ont pas de mode audit. Si l'exigence est « évaluer l'impact avant de bloquer », utilisez une atténuation au niveau application qui prend en charge l'audit, comme ACG ou Don't allow child processes.

<!-- section: app-control | objectives: 6.1.2 -->
## Contrôle d'application pour Windows

Microsoft Learn intitule la fonctionnalité **Application Control for Windows** et l'appelle **App Control for Business** dans le texte (anciennement Windows Defender Application Control). Prise en charge de Windows Server 2016 à 2025, elle décide quels pilotes et quelles applications peuvent s'exécuter sur **tout l'appareil**, mode noyau compris.

| Exigence | Réponse |
| --- | --- |
| Liste d'autorisation de tout le code d'un serveur, pilotes noyau compris | App Control for Business |
| Règles différentes selon les utilisateurs ou les groupes sur le même serveur | AppLocker |
| Tester une stratégie sans rien bloquer | Stratégie en **mode audit** : événement 3076 |
| Fichier bloqué en mode application (enforcement) | Événement 3077 |
| Autoriser une application de plus sans réécrire la stratégie principale | Stratégie **supplémentaire** liée à la stratégie de base |

Les événements se trouvent dans **Journaux des applications et des services\Microsoft\Windows\CodeIntegrity\Operational**.

Sur **Windows Server 2025**, OSConfig fournit des stratégies App Control prêtes à l'emploi :

```powershell
# Audit first, then enforce
Set-OSConfigDesiredConfiguration -Scenario AppControl\WS2025\DefaultPolicy\Audit -Default
Set-OSConfigDesiredConfiguration -Scenario AppControl\WS2025\DefaultPolicy\Enforce -Default
```

Pour autoriser une application vue dans les événements d'audit, convertissez le fichier `.evtx` en stratégie dans **App Control Wizard** (Policy Editor > Convert Event Logs to a Policy) sur un poste client, puis appliquez-la sur le serveur comme stratégie supplémentaire :

```powershell
$policyPath = "C:\Policies\App1.xml"
Set-CIPolicyIdInfo -FilePath $policyPath -ResetPolicyID
Set-CIPolicyVersion -FilePath $policyPath -Version "1.0.0.1"
Set-CIPolicyIdInfo -FilePath $policyPath -SupplementsBasePolicyID "{9214D8EE-9B0F-4972-9073-A04E917D7989}"
Set-OSConfigDesiredConfiguration -Scenario AppControl -Name Policies -Value $policyPath
```

> **Piège d'examen.** Passer en mode application sans période d'audit bloque des applications métier légitimes. L'ordre attendu est : déployer en mode audit, collecter les événements 3076, créer des stratégies supplémentaires, puis appliquer.

<!-- section: credential-guard | objectives: 6.1.3 -->
## Credential Guard

Credential Guard utilise la **sécurité basée sur la virtualisation (VBS)** pour isoler les hachages de mots de passe NTLM, les tickets TGT (ticket-granting tickets) Kerberos et les informations d'identification de domaine stockées dans un processus isolé (`LsaIso.exe`). Il bloque les attaques pass-the-hash et pass-the-ticket.

- **Par défaut** : activé sur Windows Server 2025 quand le serveur remplit les conditions, est **joint à un domaine** et **n'est pas un contrôleur de domaine**. L'activation par défaut se fait **sans verrou UEFI**, donc on peut la désactiver à distance.
- **Prérequis** : VBS et démarrage sécurisé (Secure Boot) ; TPM 1.2 ou 2.0 et verrou UEFI recommandés. Dans une machine virtuelle Hyper-V : machine virtuelle de **génération 2** et hôte doté d'un IOMMU.
- **Déconseillé sur les contrôleurs de domaine** (aucun gain de sécurité, problèmes de compatibilité) ; non pris en charge sur Exchange Server.
- **Ce qui cesse de fonctionner** : Kerberos DES, la **délégation non contrainte** Kerberos, NTLMv1 ; Digest, MS-CHAPv2 et CredSSP ne peuvent pas utiliser les informations d'identification protégées.
- **Ne protège pas** la base de données AD DS ni la SAM, ni une machine virtuelle contre une attaque venant de son hôte.

Configuration : stratégie de groupe **Configuration ordinateur > Modèles d'administration > Système > Device Guard > Turn On Virtualization Based Security**, option **Credential Guard Configuration** : **Enabled with UEFI lock**, **Enabled without lock** ou **Disabled**. Redémarrez après l'application de la stratégie.

```powershell
# 1 = Credential Guard running
(Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard).SecurityServicesRunning
```

> **Piège d'examen.** Avec **Enabled with UEFI lock**, passer la stratégie à Disabled ne suffit pas : le paramètre est stocké dans des variables du microprogramme, et le retrait exige une procédure au démarrage avec confirmation physique. Choisissez **Enabled without lock** quand la désactivation à distance doit rester possible.

<!-- section: smartscreen | objectives: 6.1.4 -->
## Microsoft Defender SmartScreen

SmartScreen vérifie la réputation des téléchargements, des applications et des sites web. Paramètres de stratégie de groupe :

| Paramètre | Chemin | Effet |
| --- | --- | --- |
| Configure Windows Defender SmartScreen | Windows Components > Windows Defender SmartScreen > Explorer | Vérifie les applications et fichiers lancés depuis l'Explorateur de fichiers ; option d'avertissement ou **Warn and prevent bypass** |
| Configure Microsoft Defender SmartScreen | Microsoft Edge > SmartScreen settings | Active SmartScreen dans Edge |
| Prevent bypassing Windows Defender SmartScreen prompts for sites | Microsoft Edge > SmartScreen settings | L'utilisateur ne peut pas poursuivre vers un site signalé |
| Prevent bypassing of Microsoft Defender SmartScreen warnings about downloads | Microsoft Edge > SmartScreen settings | L'utilisateur ne peut pas conserver un téléchargement non vérifié |

Tous les chemins commencent sous **Configuration ordinateur > Modèles d'administration** ; les paramètres Edge exigent les modèles d'administration d'Edge.

> **Conseil d'examen.** « Les utilisateurs ne doivent pas pouvoir ignorer l'avertissement » ne se règle jamais en activant seulement SmartScreen : ajoutez **Warn and prevent bypass** (Explorer) ou les paramètres **Prevent bypassing** (Edge).

<!-- section: security-gpo | objectives: 6.1.5 -->
## Sécurité du système d'exploitation par stratégie de groupe

Les paramètres de sécurité se trouvent sous **Configuration ordinateur > Stratégies > Paramètres Windows > Paramètres de sécurité** :

| Nœud | Usage typique |
| --- | --- |
| Stratégies de comptes | Stratégie de mot de passe, de verrouillage et Kerberos (comptes de domaine : uniquement depuis un GPO lié au **domaine**) |
| Stratégies locales > Attribution des droits utilisateur | Autoriser ou interdire l'ouverture de session locale, par les services Bureau à distance, en tant que service, depuis le réseau |
| Stratégies locales > Options de sécurité | Messages d'ouverture de session, renommage d'Administrator, niveau d'authentification LAN Manager, signature SMB, restrictions NTLM |
| Groupes restreints | Imposer l'appartenance de groupes locaux comme Administrators |
| Pare-feu Windows avec fonctions avancées de sécurité | Profils, règles de pare-feu et règles de sécurité de connexion |
| Configuration avancée de la stratégie d'audit | Audit par sous-catégorie (préférable aux neuf catégories d'audit héritées) |

Outils : les **modèles de sécurité** (`.inf`) importés dans un GPO ou comparés avec `secedit` ; le **Security Compliance Toolkit** (bases de référence Microsoft sous forme de sauvegardes de GPO, Policy Analyzer, LGPO pour les serveurs hors domaine) ; `gpresult /h report.html` pour vérifier ce qui s'est appliqué.

> **Piège d'examen.** Une stratégie de mot de passe dans un GPO lié à une unité d'organisation ne change pas la stratégie de mot de passe des utilisateurs du domaine de cette UO : elle ne s'applique qu'aux comptes **locaux** des ordinateurs de l'UO. Utilisez une stratégie de mot de passe affinée pour des groupes d'utilisateurs du domaine.

<!-- section: osconfig | objectives: 6.1.6 -->
## Bases de référence de sécurité avec OSConfig

**OSConfig** est une pile de configuration de sécurité réservée à **Windows Server 2025**. Elle applique la base de référence de sécurité Microsoft (plus de 300 paramètres par rôle) et protège les paramètres contre la **dérive** : si un paramètre est modifié par un autre moyen, OSConfig le rétablit.

```powershell
Install-Module -Name Microsoft.OSConfig -Scope AllUsers -Force

# One role-based baseline per server
Set-OSConfigDesiredConfiguration -Scenario SecurityBaseline/WindowsServer/2025/MemberServer -Default

# Customize one value while drift control stays on
Set-OSConfigDesiredConfiguration -Scenario SecurityBaseline/WindowsServer/2025/MemberServer -Setting AuditDetailedFileShare -Value 3
Get-OSConfigDesiredConfiguration -Scenario SecurityBaseline/WindowsServer/2025/MemberServer -Setting AuditDetailedFileShare
```

| Serveur | Scénario |
| --- | --- |
| Contrôleur de domaine | `SecurityBaseline/WindowsServer/2025/DomainController` |
| Serveur membre du domaine | `SecurityBaseline/WindowsServer/2025/MemberServer` |
| Serveur de groupe de travail | `SecurityBaseline/WindowsServer/2025/WorkgroupMember` |
| Windows LAPS (serveurs membres) | `LAPS/WindowsServer/2025/MemberServer` |

Règles à retenir : PowerShell avec élévation ; **redémarrage** après l'application ou le retrait d'une base de référence ; sur les serveurs membres et de groupe de travail, changez ensuite le mot de passe de l'administrateur local (14 caractères minimum). La base de référence impose SMB 3.0 et TLS 1.2 (des pairs anciens peuvent ne plus se connecter). À grande échelle et pour les serveurs activés pour Azure Arc, utilisez la **configuration de machine Azure Policy** pour l'appliquer et suivre la conformité.

> **Piège d'examen.** Si une stratégie de groupe et OSConfig définissent la même valeur différemment, ils s'affrontent. Gérez chaque paramètre depuis une seule source. Et OSConfig ne s'applique pas à Windows Server 2022 ni aux versions antérieures.

<!-- section: windows-laps | objectives: 6.1.7 -->
## Windows Local Administrator Password Solution

**Windows LAPS** est intégré à Windows Server 2019 et 2022 (mise à jour du 11 avril 2023 ou ultérieure) et à Windows Server 2025. Il renouvelle le mot de passe d'un compte d'administrateur local et le sauvegarde dans **Active Directory** ou dans **Microsoft Entra ID** (pas les deux). Sur les contrôleurs de domaine, il peut sauvegarder le mot de passe **DSRM**.

Déploiement avec sauvegarde dans AD :

```powershell
Update-LapsADSchema
Set-LapsADComputerSelfPermission -Identity "OU=Servers,DC=contoso,DC=com"
Set-LapsADReadPasswordPermission -Identity "OU=Servers,DC=contoso,DC=com" -AllowedPrincipals "contoso\LAPS-Readers"
Set-LapsADResetPasswordPermission -Identity "OU=Servers,DC=contoso,DC=com" -AllowedPrincipals "contoso\LAPS-Rotators"
```

Configurez ensuite le GPO **Configuration ordinateur > Stratégies > Modèles d'administration > Système > LAPS** (copiez `LAPS.admx` manuellement dans le magasin central).

| Paramètre | Valeurs | Défaut |
| --- | --- | --- |
| BackupDirectory | 0 désactivé, 1 Microsoft Entra ID, 2 Active Directory | 0 : rien ne se passe tant qu'il n'est pas défini |
| PasswordAgeDays | 1–365 (minimum 7 pour Entra ID) | 30 |
| PasswordLength | 8–64 | 14 |
| PasswordComplexity | 1–4 jeux de caractères, 5 lisibilité, 6–8 phrases secrètes | 4 |
| ADPasswordEncryptionEnabled | Exige le niveau fonctionnel de domaine 2016 ou ultérieur | True |
| ADPasswordEncryptionPrincipal | Groupe autorisé à déchiffrer | Domain Admins |
| ADBackupDSRMPassword | Contrôleurs de domaine | False |
| PostAuthenticationActions | 1 réinitialiser, 3 réinitialiser et déconnecter, 5 réinitialiser et redémarrer, 11 terminer aussi les processus | 3, après 24 heures |

Windows Server 2025 ajoute les **phrases secrètes** (passphrases), la **gestion automatique du compte** (LAPS crée son propre compte, éventuellement avec un nom aléatoire) et la **détection de restauration d'image** (exige la dernière version de `Update-LapsADSchema`).

```powershell
Get-LapsADPassword -Identity SRV1 -AsPlainText
Set-LapsADPasswordExpirationTime -Identity SRV1   # rotate at next processing
Invoke-LapsPolicyProcessing                       # process now (default: hourly)
Reset-LapsPassword                                # rotate locally on the device
```

> **Piège d'examen.** L'autorisation de lecture n'est pas l'autorisation de déchiffrement : un utilisateur qui a reçu `Set-LapsADReadPasswordPermission` ne voit toujours pas un mot de passe chiffré s'il n'appartient pas à `ADPasswordEncryptionPrincipal` (Domain Admins par défaut).

<!-- section: defender-for-servers | objectives: 6.1.8 -->
## Microsoft Defender pour serveurs

Defender for Servers est un plan de **Microsoft Defender pour le cloud**. Il protège les machines virtuelles Azure et, via **Azure Arc**, les serveurs locaux et ceux d'autres clouds. Defender pour point de terminaison est installé automatiquement sur les machines prises en charge.

| Fonctionnalité | Plan 1 | Plan 2 |
| --- | --- | --- |
| Defender pour point de terminaison (EDR), alertes et incidents | Oui | Oui |
| Analyse des vulnérabilités avec agent, inventaire logiciel | Oui | Oui |
| Analyse sans agent (vulnérabilités, programmes malveillants, secrets) | Non | Oui |
| Supervision de l'intégrité des fichiers (FIM) | Non | Oui |
| Accès juste-à-temps (JIT) aux machines virtuelles | Non | Oui |
| 500 Mo d'ingestion de données gratuite par jour | Non | Oui |
| Activation sur une seule ressource | Oui | Non (abonnement uniquement) |

Activez-le dans **Defender pour le cloud > Paramètres d'environnement > abonnement > Plans Defender > Serveurs**, puis choisissez le plan. Le Plan 2 peut être désactivé, mais pas activé, par ressource. Une période d'essai de 30 jours commence à l'activation d'un plan.

> **Piège d'examen.** Des exigences comme « supervision de l'intégrité des fichiers », « accès JIT » ou « analyse sans agent des programmes malveillants » désignent le **Plan 2**. « Coût le plus bas avec EDR seulement » désigne le Plan 1.

<!-- section: windows-firewall | objectives: 6.1.9 -->
## Pare-feu Windows et règles de sécurité de connexion

Le Pare-feu Windows a trois **profils** : Domaine, Privé et Public. Le trafic entrant est bloqué par défaut et exige une règle d'autorisation explicite ; le trafic sortant est autorisé par défaut. Évaluation des règles :

1. Les règles d'autorisation explicites l'emportent sur le blocage par défaut.
2. Les **règles de blocage explicites l'emportent sur les règles d'autorisation**.
3. Les règles plus spécifiques l'emportent sur les moins spécifiques (sauf la règle 2). Il n'existe pas d'ordre manuel des règles.

La seule exception à la règle 2 est une règle de **contournement authentifié** (`-OverrideBlockRules`), qui laisse passer les ordinateurs ou utilisateurs authentifiés par IPsec.

```powershell
New-NetFirewallRule -DisplayName "Allow SQL 1433" -Direction Inbound -Protocol TCP -LocalPort 1433 -RemoteAddress 10.0.1.0/24 -Profile Domain -Action Allow
```

Les **règles de sécurité de connexion** utilisent IPsec pour authentifier (et éventuellement chiffrer) le trafic entre ordinateurs :

| Type | Usage |
| --- | --- |
| Isolation | Limiter les connexions aux membres du domaine (isolation de domaine) ou à un groupe d'ordinateurs |
| Dispense d'authentification | Ordinateurs qui doivent se connecter sans authentification (DHCP, DNS, contrôleurs de domaine) |
| Serveur à serveur | Authentifier entre deux ordinateurs ou sous-réseaux précis |
| Tunnel | Tunnel IPsec entre deux passerelles |
| Personnalisée | Toute autre combinaison |

Modes d'authentification : **demander** en entrée et en sortie (supervision, aucun blocage), **exiger en entrée et demander en sortie** (le réglage habituel de l'isolation de domaine), **exiger** en entrée et en sortie.

```powershell
$kerb = New-NetIPsecAuthProposal -Machine -Kerberos
$p1 = New-NetIPsecPhase1AuthSet -DisplayName "Kerberos" -Proposal $kerb -PolicyStore contoso.com\Isolation
New-NetIPsecRule -DisplayName "Domain isolation" -Profile Domain -Phase1AuthSet $p1.Name -InboundSecurity Require -OutboundSecurity Request -PolicyStore contoso.com\Isolation

# Firewall rule that admits only authenticated and encrypted traffic
New-NetFirewallRule -DisplayName "Secure 1433" -Direction Inbound -Protocol TCP -LocalPort 1433 -Authentication Required -Encryption Required -Action Allow
```

Dans un GPO : **Paramètres de sécurité > Pare-feu Windows avec fonctions avancées de sécurité**. Vérifiez les associations de sécurité actives avec `Get-NetIPsecMainModeSA`.

> **Piège d'examen.** Une règle de sécurité de connexion ne fait qu'authentifier le trafic ; elle n'ouvre aucun port. Le serveur a toujours besoin d'une règle de pare-feu entrante, en général avec **Autoriser la connexion si elle est sécurisée** (`-Authentication Required`).

<!-- section: key-points -->
## Points clés

- Protection contre les attaques : pas d'audit pour les atténuations au niveau système ; déployez un fichier XML unique par stratégie de groupe.
- App Control : liste d'autorisation pour tout l'appareil ; audit (3076) avant application (3077) ; les stratégies supplémentaires étendent une stratégie de base.
- Credential Guard : VBS, activé par défaut sur les serveurs membres Windows Server 2025 joints à un domaine, pas pour les contrôleurs de domaine ; le verrou UEFI bloque la désactivation à distance.
- SmartScreen : empêcher le contournement est un paramètre distinct. La stratégie de mot de passe du domaine vient uniquement d'un GPO lié au domaine.
- OSConfig : Windows Server 2025 uniquement, un scénario par rôle, contrôle de la dérive, redémarrage.
- Windows LAPS : définissez `BackupDirectory` ; le chiffrement exige le niveau fonctionnel 2016 ; lire n'est pas déchiffrer.
- Defender for Servers : Plan 2 pour FIM, JIT, analyse sans agent ; Arc pour les serveurs locaux.
- Pare-feu : le blocage l'emporte sur l'autorisation ; les règles de sécurité de connexion n'ouvrent aucun port.
