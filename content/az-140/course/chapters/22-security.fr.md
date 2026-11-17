Un hôte de session est un bureau Windows partagé et joignable de partout : il cumule les risques d'un serveur et ceux d'un PC utilisateur. Ce chapitre couvre les contrôles que nomme l'examen : Microsoft Defender pour le cloud et Defender pour serveurs, Microsoft Defender Antivirus réglé pour la VDI et FSLogix, l'intégration à Defender for Endpoint d'hôtes non persistants, le filtrage réseau avec NSG, UDR et Pare-feu Azure, l'accès administratif via Azure Bastion ou JIT, App Control for Business et l'accès contrôlé aux dossiers, ainsi que Trusted launch et les machines virtuelles confidentielles.

<!-- section: defender-for-cloud | objectives: 2.2.1 -->
## Sécuriser les hôtes de session avec Microsoft Defender pour le cloud

Les hôtes de session sont des machines virtuelles Azure : Defender pour le cloud les protège comme n'importe quel serveur.

- **CSPM de base** (gratuit) : le degré de sécurisation (secure score) et les recommandations, avec **Correctif rapide** (Quick Fix) pour certaines d'entre elles.
- **Fonctionnalités de sécurité renforcée** : activez le plan **Defender pour serveurs** sur l'abonnement (ou sur des ressources choisies) pour obtenir la protection contre les menaces, l'évaluation des vulnérabilités et les tableaux de bord de conformité réglementaire (par exemple PCI DSS).

| Besoin | Plan |
| --- | --- |
| Intégration de Microsoft Defender for Endpoint et sa licence pour les serveurs | Defender pour serveurs Plan 1 ou Plan 2 |
| Accès JIT aux machines virtuelles, surveillance de l'intégrité des fichiers | **Defender pour serveurs Plan 2** |
| Recommandations sur Secure Boot, le vTPM et l'extension Guest Attestation, alertes d'échec d'attestation | Machines virtuelles Trusted launch avec Defender pour le cloud |

Recommandations de Microsoft pour Azure Virtual Desktop :

- Traitez les recommandations du **degré de sécurisation** ; corrigez dans l'image quand le constat porte sur le système d'exploitation, sinon le prochain redéploiement le fait réapparaître.
- Installez un produit **EDR** sur chaque hôte de session. Sur les hôtes de session Windows Server avec Defender pour le cloud activé, Defender for Endpoint est déployé par l'intégration ; sur un système d'exploitation Windows client (y compris multisession), déployez Defender for Endpoint (voir plus bas) ou un EDR tiers.
- Utilisez la **gestion des vulnérabilités** de Defender for Endpoint, exposée dans Defender pour le cloud, pour trouver les logiciels vulnérables sur les hôtes et dans l'image.

> **Piège d'examen.** Defender pour le cloud ne corrige pas et ne recrée pas les hôtes de session. Une recommandation sur des mises à jour manquantes se corrige dans l'image de référence et par le redéploiement des hôtes ; Defender pour le cloud ne fait que la signaler.

<!-- section: defender-antivirus | objectives: 2.2.2 -->
## Configurer Microsoft Defender Antivirus sur les hôtes de session

Microsoft Defender Antivirus est intégré à Windows 11 et Windows 10 Entreprise multisession et à Windows Server. Sur des hôtes regroupés avec de nombreux utilisateurs, configurez-le pour la VDI par stratégie de groupe, Intune ou PowerShell :

| Paramètre | Valeur recommandée et raison |
| --- | --- |
| **Définir l'emplacement des informations de sécurité pour les clients VDI** (Define security intelligence location for VDI clients) | Un partage de fichiers qui reçoit une seule fois les mises à jour décompressées, pour que chaque machine virtuelle ne les télécharge et ne les décompresse pas (`Set-MpPreference -SharedSignaturesPath`) |
| Répartir aléatoirement les heures d'analyse planifiée | Activé, pour que tous les hôtes n'analysent pas au même moment |
| Activer l'analyse rapide de rattrapage | Activé pour les hôtes non persistants qui manquent les analyses planifiées |
| Analyse après une mise à jour des informations de sécurité | Ne se désactive que pour des images déjà analysées, au prix de la protection |
| Supprimer les notifications, interface sans affichage | Activé : les utilisateurs ne voient pas les fenêtres de Defender |
| Comportement de fusion des administrateurs locaux | Désactivé : seule la stratégie centrale s'applique |
| Protection cloud, protection contre les falsifications | Activées |

Avant de sceller l'image, exécutez la tâche planifiée **Windows Defender Cache Maintenance**, sinon chaque nouvelle machine virtuelle consomme du processeur pour reconstruire le cache.

Les **exclusions FSLogix** sont obligatoires quand les profils sont des conteneurs VHD(X) : analyser le conteneur pendant qu'il est attaché provoque des connexions lentes et des échecs de profil. Excluez :

| Type | Exclusions |
| --- | --- |
| Conteneurs sur le partage | `\\<server>\<share>\*\*.VHD`, `*.VHDX` et leurs fichiers `.lock`, `.meta`, `.metadata` |
| Disques temporaires locaux | `%TEMP%\*\*.VHD`, `%TEMP%\*\*.VHDX`, `%WINDIR%\TEMP\*\*.VHD`, `%WINDIR%\TEMP\*\*.VHDX` |
| Cloud Cache | `%ProgramData%\FSLogix\Cache\*`, `%ProgramData%\FSLogix\Proxy\*` |
| Processus | `frxsvc.exe`, `frxccds.exe` |

```powershell
Set-MpPreference -SharedSignaturesPath "\\fs01.contoso.com\mdatp$\wdav-update"
Add-MpPreference -ExclusionPath "%TEMP%\*\*.VHDX", "%WINDIR%\TEMP\*\*.VHDX", "\\stprofiles.file.core.windows.net\profiles\*\*.VHDX"
Add-MpPreference -ExclusionProcess "frxsvc.exe", "frxccds.exe"
```

> **Piège d'examen.** La solution à des connexions lentes avec « profile failed to attach » sur des hôtes FSLogix dotés d'un antivirus, ce sont les exclusions FSLogix, pas la désactivation de la protection en temps réel ni le déplacement des profils.

<!-- section: defender-for-endpoint | objectives: 2.2.3 -->
## Configurer Microsoft Defender for Endpoint : intégration et analyse

Defender for Endpoint ajoute l'EDR, la réduction de la surface d'attaque et l'investigation automatisée à Defender Antivirus. Les hôtes de session persistants (bureaux personnels) s'intègrent comme n'importe quel appareil Windows : Intune, stratégie de groupe, Configuration Manager ou script local. Les hôtes regroupés **non persistants** ont besoin des **scripts d'intégration VDI** du portail Microsoft Defender (Paramètres > Points de terminaison > Intégration, méthode de déploiement **Scripts d'intégration VDI pour les points de terminaison non persistants**) :

| Modèle | Fichiers | Résultat |
| --- | --- | --- |
| Entrée unique par appareil | `Onboard-NonPersistentMachine.ps1` (qui appelle `WindowsDefenderATPOnboardingScript.cmd`) | Une entrée d'appareil par nom d'ordinateur, même quand la machine virtuelle est recréée |
| Entrées multiples par appareil | `WindowsDefenderATPOnboardingScript.cmd` | Une nouvelle entrée pour chaque instance provisionnée |

Étapes : copiez les fichiers dans `C:\Windows\System32\GroupPolicy\Machine\Scripts\Startup` dans l'image, puis ajoutez-les comme **script de démarrage de l'ordinateur** (stratégie de groupe locale ou de domaine, onglet Scripts PowerShell pour le modèle à entrée unique). Le script s'exécute au premier démarrage de chaque nouvel hôte, une fois qu'il a son nom définitif. Le premier rapport peut prendre 3 à 4 heures.

Règles pour l'image :

- **N'intégrez jamais l'image de référence** ni la machine virtuelle de build : les clones partageraient le même `senseGuid` et n'apparaîtraient pas comme des appareils distincts.
- Si l'image a été intégrée par erreur, désintégrez-la (offboarding) et supprimez les données d'inscription (le dossier `Cyber` et les valeurs de registre `senseGuid` et `senseId`) avant la capture.
- L'intégration ne configure pas l'antivirus : appliquez séparément les paramètres antivirus VDI de la section précédente.

**Options d'analyse** importantes sur les hôtes multisession : reposez-vous sur la protection en temps réel plus une **analyse rapide** quotidienne à heure de démarrage aléatoire, évitez les analyses complètes pendant les heures de travail, utilisez l'emplacement partagé des informations de sécurité et les analyses rapides de rattrapage pour les hôtes qui étaient éteints.

> **Piège d'examen.** Pour des hôtes regroupés supprimés et recréés à partir de l'image, la réponse est le script d'intégration VDI exécuté au démarrage, avec le modèle à entrée unique si l'inventaire des appareils ne doit pas se remplir de doublons. Intégrer l'image avant Sysprep est toujours faux.

<!-- section: network-security | objectives: 2.2.4 -->
## Sécurité réseau : NSG, UDR et Pare-feu Azure

Les hôtes de session n'ont besoin d'**aucun port entrant** depuis Internet : l'agent et RDP utilisent des connexions sortantes vers le service (connexion inverse). Accès sortant requis depuis le sous-réseau des hôtes de session :

| Destination | Port | Étiquette de service |
| --- | --- | --- |
| `login.microsoftonline.com` | TCP 443 | `AzureActiveDirectory` |
| `*.wvd.microsoft.com` (trafic du service et RDP en TCP) | TCP 443 | `WindowsVirtualDesktop` |
| `*.prod.warm.ingest.monitor.core.windows.net`, `gcs.prod.monitoring.core.windows.net` | TCP 443 | `AzureMonitor` |
| `catalogartifact.azureedge.net` | TCP 443 | `AzureFrontDoor.Frontend` |
| `mrsglobalsteus2prod.blob.core.windows.net` (mises à jour de l'agent) | TCP 443 | `Storage` |
| `azkms.core.windows.net` (activation Windows) | TCP 1688 | `Internet` |
| `169.254.169.254` (IMDS), `168.63.129.16` (plateforme) | TCP 80 et autres | Jamais via un proxy ni intercepté |

Vérifiez l'accès avec l'**outil d'URL de l'agent Azure Virtual Desktop** (Azure Virtual Desktop Agent URL Tool) sur un hôte de session.

**NSG.** Associez un NSG au sous-réseau des hôtes de session : refusez l'entrant depuis Internet (les règles par défaut le font déjà), autorisez RDP 3389 uniquement depuis le sous-réseau Azure Bastion ou un sous-réseau d'administration et, si vous restreignez le sortant, autorisez les étiquettes de service ci-dessus avant une règle de refus. Utilisez des groupes de sécurité d'application pour regrouper les hôtes.

Le **Pare-feu Azure** filtre le trafic sortant dans un hub :

- Utilisez l'**étiquette FQDN `WindowsVirtualDesktop`** dans une règle d'application plus des règles de réseau pour les autres points de terminaison requis ; activez le **proxy DNS** dans la stratégie de pare-feu pour utiliser des FQDN dans les règles de réseau.
- Limitez les règles à un pool d'hôtes avec un **groupe IP** de ses hôtes de session comme source.
- **N'utilisez pas l'inspection TLS** sur le trafic Azure Virtual Desktop.
- Contrôlez la navigation web des utilisateurs avec des règles d'application et des **catégories web**.

**UDR.** Une table de routage avec `0.0.0.0/0` vers le pare-feu fait passer tout le trafic par celui-ci. Comme la réduction d'échelle du pare-feu peut couper des connexions Azure Virtual Desktop, ajoutez sur le sous-réseau des hôtes de session un itinéraire pour l'**étiquette de service `WindowsVirtualDesktop` avec Internet comme tronçon suivant**, pour que le trafic du service contourne le pare-feu.

```bash
az network route-table route create -g rg-avd --route-table-name rt-avd-hosts -n to-firewall \
  --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
az network route-table route create -g rg-avd --route-table-name rt-avd-hosts -n avd-direct \
  --address-prefix WindowsVirtualDesktop --next-hop-type Internet
```

> **Piège d'examen.** Ouvrir TCP 3389 en entrée sur les hôtes de session n'est jamais nécessaire pour les utilisateurs. Si une question propose une adresse IP publique ou une règle NSG entrante pour que les utilisateurs se connectent, elle est fausse : les utilisateurs passent par la passerelle Azure Virtual Desktop.

<!-- section: admin-access | objectives: 2.2.5 -->
## Accès administratif : Azure Bastion ou accès JIT aux machines virtuelles

Les administrateurs ont parfois besoin de RDP vers un hôte de session hors d'Azure Virtual Desktop (agent cassé, hôte en mode drainage). Microsoft recommande d'éviter le RDP direct ; les deux options contrôlées :

| Option | Fonctionnement | Conditions requises |
| --- | --- | --- |
| **Azure Bastion** | RDP sur TLS 443 depuis le portail Azure (ou le client natif) vers l'adresse IP privée de l'hôte ; pas d'adresse IP publique sur la machine virtuelle | `AzureBastionSubnet` dans le réseau virtuel (ou un réseau appairé), une référence SKU Bastion qui prend en charge les fonctions voulues (client natif et connexion par adresse IP exigent Standard ou Premium) ; le NSG des hôtes autorise 3389 depuis le sous-réseau Bastion |
| **Accès JIT aux machines virtuelles** (Defender pour le cloud) | Le port d'administration est fermé par défaut ; un utilisateur autorisé demande l'accès, et une règle temporaire ouvre le port pour l'adresse IP du demandeur pendant une durée limitée | **Defender pour serveurs Plan 2** ; un NSG ou le Pare-feu Azure devant la machine virtuelle ; valeurs par défaut sous Windows : port 3389, 3 heures au maximum |

L'accès JIT s'active depuis Defender pour le cloud (Protections de charge de travail > Accès juste-à-temps aux machines virtuelles) ou depuis la machine virtuelle (Configuration). Demander l'accès exige `Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action` plus des lectures sur la machine virtuelle, les cartes réseau et les adresses IP publiques ; configurer la stratégie exige `jitNetworkAccessPolicies/write` et `Microsoft.Compute/virtualMachines/write`. Chaque demande est journalisée dans le journal d'activité.

> **Conseil d'examen.** « Pas d'adresse IP publique sur les hôtes de session et connexion depuis le navigateur » = Azure Bastion. « Port fermé sauf quand un administrateur le demande, pour quelques heures, depuis son adresse IP » = JIT, qui exige Defender pour serveurs Plan 2.

<!-- section: threat-protection | objectives: 2.2.6 -->
## Protection contre les menaces de Windows : App Control for Business et accès contrôlé aux dossiers

**App Control for Business** (anciennement Windows Defender Application Control) n'autorise que le code approuvé à s'exécuter : applications, pilotes, scripts, programmes d'installation MSI ; PowerShell s'exécute en mode de langage contraint. Il complète l'antivirus, il ne le remplace pas.

| Point | Règle |
| --- | --- |
| Étendue | Les stratégies s'appliquent à l'**appareil** : sur un hôte multisession, une stratégie touche tous les utilisateurs. Ne prévoyez pas de stratégies par utilisateur |
| Déploiement progressif | Commencez en **mode audit**, examinez les événements d'intégrité du code, puis passez en mode **appliqué** |
| Structure | Une stratégie de base, plus des stratégies supplémentaires pour autoriser les applications métier |
| Options d'approbation | Code signé, programme d'installation managé (applications déployées par Intune ou Configuration Manager), réputation Intelligent Security Graph |
| Déploiement | Intune, stratégie de groupe, Configuration Manager ou script (`CiTool.exe`) |
| AppLocker | Plus ancien ; prend en charge des règles par utilisateur ou par groupe, utile quand différents utilisateurs d'un hôte multisession ont besoin de listes d'applications différentes |

Autorisez les composants Azure Virtual Desktop (agent, pile côte à côte, FSLogix, optimisations Teams) avant de passer en mode appliqué, sinon les hôtes de session cessent de fonctionner. Retenez que publier des applications en **RemoteApp n'est pas une frontière de sécurité** : cela n'empêche pas un utilisateur de lancer d'autres applications.

L'**accès contrôlé aux dossiers** (une fonctionnalité de Microsoft Defender Antivirus) protège des dossiers contre les rançongiciels : seules les applications approuvées peuvent modifier les fichiers des dossiers protégés (Documents, Images, Vidéos, Musique, Favoris, dossiers Public, et secteurs de démarrage). Il exige Defender Antivirus comme antivirus actif avec la protection en temps réel activée.

| Mode | Effet |
| --- | --- |
| Désactivé (par défaut) | Inactif |
| Activé (Bloquer) | Les applications non approuvées ne peuvent pas modifier les fichiers protégés |
| Mode audit | Modifications autorisées et journalisées ; commencez par là |
| Bloquer / Auditer la modification du disque uniquement | Ne protège que les secteurs du disque |

```powershell
Set-MpPreference -EnableControlledFolderAccess AuditMode
Add-MpPreference -ControlledFolderAccessProtectedFolders "\\stprofiles.file.core.windows.net\data"
Add-MpPreference -ControlledFolderAccessAllowedApplications "C:\Program Files\Contoso\Ledger\ledger.exe"
```

Quand des dossiers sont redirigés (déplacement des dossiers connus OneDrive), l'emplacement redirigé est protégé. N'ajoutez des applications autorisées que pour des applications métier vérifiées qui sont bloquées.

> **Piège d'examen.** App Control for Business contrôle quel code **s'exécute** ; l'accès contrôlé aux dossiers contrôle quelles applications peuvent **écrire** dans les dossiers protégés. Une exigence liée aux rançongiciels désigne l'accès contrôlé aux dossiers ; une exigence « seules les applications approuvées peuvent s'exécuter » désigne App Control for Business.

<!-- section: trusted-launch-confidential | objectives: 2.2.7 -->
## Trusted launch et machines virtuelles confidentielles Azure

**Trusted launch** (lancement sécurisé) est le type de sécurité par défaut des hôtes de session créés dans le portail et satisfait aux exigences de Windows 11. Il exige des machines virtuelles de **génération 2** et une taille prise en charge, et ne prend pas en charge les images managées (utilisez Azure Compute Gallery).

| Fonctionnalité | Protège contre |
| --- | --- |
| Secure Boot | Rootkits et bootkits : seuls les chargeurs de démarrage, noyaux et pilotes signés démarrent |
| vTPM | Stocke les clés et les mesures ; permet BitLocker et l'attestation à distance |
| Surveillance de l'intégrité du démarrage | L'extension Guest Attestation vérifie la chaîne de démarrage ; Defender pour le cloud alerte en cas d'échec d'attestation |
| Sécurité basée sur la virtualisation | Permet HVCI et Credential Guard dans Windows |

Les **machines virtuelles confidentielles Azure** ajoutent une isolation matérielle vis-à-vis de l'hyperviseur et de l'hôte : la mémoire est chiffrée avec des clés détenues par le processeur sécurisé du CPU (**AMD SEV-SNP** ou **Intel TDX**), avec les tailles DCasv5, ECasv5 et les tailles confidentielles ultérieures. Choisissez le type de sécurité **Machines virtuelles confidentielles** à la création du pool d'hôtes ou à l'ajout d'hôtes ; systèmes d'exploitation d'hôte de session pris en charge : Windows 11 et Windows 10 Entreprise (session unique et multisession), Windows Server 2022 et 2019.

| Option | Détail |
| --- | --- |
| Chiffrement confidentiel du disque du système d'exploitation | Facultatif, défini à la création et non modifiable ; clés liées au vTPM de la machine virtuelle ; clés gérées par la plateforme ou par le client |
| Limitations | Pas d'Azure Site Recovery, pas de mise en réseau accélérée, pas de migration à chaud ; régions et tailles limitées |

| Exigence | Réponse |
| --- | --- |
| Protéger les hôtes contre les logiciels malveillants de démarrage sans coût supplémentaire | Trusted launch (Secure Boot et vTPM) |
| Données en cours d'utilisation chiffrées, isolées même des opérateurs Azure et de l'hyperviseur | Machines virtuelles confidentielles |
| Alerter quand un hôte démarre avec des composants modifiés | Trusted launch avec l'extension Guest Attestation et Defender pour le cloud |

> **Piège d'examen.** Un hôte de session confidentiel ou Trusted launch exige une image dont la définition de galerie prend en charge ce type de sécurité et une taille Gen2. Une image managée Gen1 est inutilisable ; reconstruisez d'abord l'image comme version Gen2 dans Azure Compute Gallery.

<!-- section: key-points -->
## Points clés

- Defender pour le cloud : degré de sécurisation et Defender pour serveurs ; JIT et la surveillance de l'intégrité des fichiers exigent le Plan 2.
- Defender Antivirus pour la VDI : emplacement partagé des informations de sécurité, analyses aléatoires, exclusions FSLogix des VHD(X) et des processus.
- Defender for Endpoint sur des hôtes non persistants : script d'intégration VDI au démarrage ; n'intégrez jamais l'image de référence.
- Aucun port entrant ; NSG sur le sous-réseau ; Pare-feu Azure avec l'étiquette FQDN `WindowsVirtualDesktop`, sans inspection TLS ; routez l'étiquette de service `WindowsVirtualDesktop` vers Internet.
- Accès administratif : Azure Bastion (pas d'adresse IP publique) ou JIT (ouverture temporaire du port).
- App Control for Business = quel code s'exécute, pour tout l'appareil, audit puis application ; accès contrôlé aux dossiers = protection des dossiers contre les rançongiciels.
- Trusted launch (Gen2, Secure Boot, vTPM) est la valeur par défaut ; les machines virtuelles confidentielles ajoutent le chiffrement matériel de la mémoire et le chiffrement confidentiel du disque du système d'exploitation.
