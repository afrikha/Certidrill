Les questions de dépannage donnent un symptôme sur un serveur nommé (une application n'atteint pas SQL1, `nslookup` fonctionne mais pas le navigateur, les mises à jour échouent avec un code d'erreur, Kerberos échoue après un changement d'horloge, une extension est bloquée) et demandent quelle commande montre la cause ou quelle correction vient en premier. Travaillez de bas en haut : interface et IP, routage et pare-feu, résolution de noms, puis le service lui-même.

<!-- section: connectivity | objectives: 7.2.1 -->
## Résoudre les problèmes de connectivité

| Question | Outil |
| --- | --- |
| Quelles adresse IP, passerelle et serveurs DNS le serveur utilise-t-il ? | `Get-NetIPConfiguration`, `ipconfig /all` |
| Un port TCP est-il joignable sur l'hôte distant ? | `Test-NetConnection SQL1 -Port 1433` |
| Où le chemin s'arrête-t-il ? | `Test-NetConnection SQL1 -TraceRoute`, `tracert`, `pathping` (pertes par tronçon) |
| Quelles connexions et quels ports en écoute existent ? | `Get-NetTCPConnection -State Listen`, `netstat -ano` |
| Quel itinéraire est utilisé ? | `Get-NetRoute`, `Find-NetRoute -RemoteIPAddress 10.1.2.3` |
| Le pare-feu local bloque-t-il ? | `Get-NetFirewallRule`, journal du pare-feu, `Get-NetFirewallProfile` |
| Que passe-t-il réellement sur le réseau ? | `pktmon start --capture`, `netsh trace start capture=yes` |

Une adresse en **169.254.0.0/16** (APIPA) signifie que DHCP a échoué. `ping` peut échouer alors que le service fonctionne (ICMP est souvent bloqué) : testez le port.

Pour les **machines virtuelles Azure** :

- Ne définissez jamais d'adresse IP statique dans l'invité : gardez DHCP et définissez l'adresse IP privée sur l'interface réseau dans Azure. Une mauvaise configuration IP dans l'invité rend la machine virtuelle injoignable.
- L'invité doit atteindre **168.63.129.16** (plateforme Azure : DHCP, DNS, sondes d'intégrité, agent de machine virtuelle).
- Utilisez **Network Watcher** : **Vérification du flux IP** (quelle règle NSG autorise ou refuse un 5-tuple), **Tronçon suivant** (quel itinéraire, par exemple un itinéraire défini par l'utilisateur vers une appliance), **Résolution des problèmes de connexion**, ainsi que les **règles de sécurité effectives** et les **itinéraires effectifs** de l'interface réseau.
- Sans accès réseau à l'invité : **Console série**, **Exécuter la commande**, ou l'extension d'accès à la machine virtuelle (**Réinitialiser la configuration uniquement** réinitialise les paramètres RDP et du pare-feu).

> **Piège d'examen.** Si `Test-NetConnection` réussit sur le port 3389 depuis une autre machine virtuelle mais échoue depuis Internet, c'est un NSG ou un chemin public manquant qui est en cause, pas le pare-feu de l'invité. Vérifiez avec la vérification du flux IP avant de toucher à l'invité.

<!-- section: name-resolution | objectives: 7.2.2 -->
## Résoudre les problèmes de résolution de noms

Windows résout les noms dans cet ordre : cache du client DNS (qui contient les entrées du fichier **hosts**), puis les serveurs DNS, avec la liste de recherche de suffixes, puis LLMNR et NetBIOS pour les noms en une seule partie.

```powershell
Resolve-DnsName app1.contoso.com -Server 10.0.0.4      # ask a specific server
Resolve-DnsName app1.contoso.com -DnsOnly               # skip hosts, LLMNR and NetBIOS
Resolve-DnsName _ldap._tcp.dc._msdcs.contoso.com -Type SRV
Get-DnsClientCache; Clear-DnsClientCache                # ipconfig /displaydns, /flushdns
Register-DnsClient                                      # ipconfig /registerdns
Get-DnsClientServerAddress; Get-DnsClientNrptPolicy
```

| Symptôme | Cause probable |
| --- | --- |
| `nslookup` renvoie la bonne adresse mais les applications en obtiennent une autre | Une entrée du fichier **hosts** ou un cache client obsolète (`nslookup` contourne les deux) |
| Fonctionne avec le FQDN, échoue avec le nom court | Liste de recherche de suffixes DNS |
| Fonctionne sur un serveur DNS, pas sur un autre | Réplication de zone ou redirecteur conditionnel manquant |
| Les clients ne trouvent pas de contrôleur de domaine | Enregistrements SRV manquants : vérifiez avec `nltest /dsgetdc:contoso.com` et `dcdiag /test:dns` ; redémarrez **Netlogon** sur le contrôleur de domaine pour les réinscrire |
| Une réponse négative persiste après la création de l'enregistrement | Mise en cache négative : videz le cache du client (et celui du serveur, `Clear-DnsServerCache`) |

Cas hybrides : un réseau virtuel Azure qui utilise des **serveurs DNS personnalisés** les transmet aux machines virtuelles par DHCP ; une machine virtuelle ne prend donc en compte un changement qu'après le renouvellement de son bail ou un redémarrage. Les serveurs locaux ne peuvent pas interroger 168.63.129.16 ; ils résolvent les zones DNS privées Azure par un redirecteur conditionnel vers un **point de terminaison entrant d'Azure DNS Private Resolver**. Une zone DNS privée ne répond qu'aux réseaux virtuels qui lui sont **liés**.

> **Piège d'examen.** `nslookup` n'utilise ni le fichier hosts ni le cache du client DNS. Si `nslookup` donne la bonne réponse et `ping` par nom une mauvaise, examinez le fichier hosts et le cache, pas le serveur DNS.

<!-- section: windows-update | objectives: 7.2.3 -->
## Résoudre les problèmes liés à Windows Update

Ordre des vérifications :

1. Service **Windows Update** (`wuauserv`) démarré et non désactivé (erreurs `0x8024002E`, `0x80070422`).
2. Réseau ou source des mises à jour : `0x8024402C`, `0x8024401C`, `0x8024402F` (connectivité) ; `0x80072EE2` (WSUS injoignable). Vérifiez `WUServer` et `WUStatusServer` sous `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate` (définis par le GPO *Specify intranet Microsoft update service location*).
3. `0x80070005` (accès refusé) : autorisations sur `%WinDir%\SoftwareDistribution`, espace disque sur C:.
4. Corruption du magasin de composants : `DISM /Online /Cleanup-Image /RestoreHealth`, puis `sfc /scannow` (journal `%WinDir%\Logs\CBS\CBS.log`).

```powershell
Get-WindowsUpdateLog                      # merges the ETW traces into WindowsUpdate.log on the desktop
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
```

Particularités du **Gestionnaire de mise à jour Azure** (Azure Update Manager) :

| Symptôme | Correction |
| --- | --- |
| Serveur activé pour Arc non évalué | Inscrivez l'abonnement auprès de **Microsoft.Compute** ; vérifiez que l'extension de mise à jour du système est à l'état **Succeeded**, sinon supprimez-la et lancez une opération à la demande |
| La mise à jour planifiée ne s'exécute pas sur une machine virtuelle Azure | L'orchestration des correctifs doit être **Customer Managed Schedules** (`AutomaticByPlatform` avec `ByPassPlatformSafetyChecksOnUserSchedule`) et la machine virtuelle doit être allumée au moins 15 minutes avant la fenêtre |
| « Maintenance window exceeded » | Fenêtre trop courte : l'installation exige du temps restant (10 minutes sont toujours réservées au redémarrage) |
| La vérification de l'extension échoue | `AllowExtensionOperations` doit valoir true ; TLS 1.2 et HTTPS vers les points de terminaison |

Journaux sur une machine virtuelle Azure : `C:\WindowsAzure\Logs\Plugins\Microsoft.CPlat.Core.WindowsPatchExtension<version>\WindowsUpdateExtension.log`.

> **Conseil d'examen.** Si les mises à jour échouent de la même façon lancées localement, le problème vient de l'agent Windows Update ou de sa source (service, WSUS, proxy), pas du Gestionnaire de mise à jour. Corrigez d'abord localement.

<!-- section: time-service | objectives: 7.2.4 -->
## Résoudre les problèmes liés au service de temps

Kerberos tolère par défaut un écart d'horloge de **5 minutes** (stratégie Kerberos *Maximum tolerance for computer clock synchronization*). Au-delà, l'authentification échoue.

Hiérarchie du domaine : les membres se synchronisent sur un contrôleur de domaine de leur domaine, les contrôleurs de domaine sur l'émulateur PDC de leur domaine ou d'un domaine parent, et l'**émulateur PDC du domaine racine de la forêt** sur une source externe fiable.

```powershell
w32tm /query /status            # source, stratum, last sync
w32tm /query /source
w32tm /query /configuration
w32tm /stripchart /computer:dc1.contoso.com /samples:5 /dataonly
w32tm /resync /rediscover

# Forest root PDC emulator: external source
w32tm /config /manualpeerlist:"time.windows.com,0x8" /syncfromflags:manual /reliable:yes /update

# Any other domain computer: back to the domain hierarchy
w32tm /config /syncfromflags:domhier /update
```

| `/query /source` affiche | Signification |
| --- | --- |
| Un contrôleur de domaine | Hiérarchie du domaine (attendu sur les membres) |
| `VM IC Time Synchronization Provider` | Heure fournie par l'hôte Hyper-V ou Azure |
| `Local CMOS Clock` | Non synchronisé (aucune source joignable, ou service tout juste démarré) |
| `time.windows.com` | Source NTP par défaut d'une machine hors domaine |

Machines virtuelles : par défaut, les images Windows de la Place de marché Azure utilisent à la fois l'hôte (**VMICTimeProvider**) et time.windows.com. Un contrôleur de domaine virtualisé, et en particulier l'émulateur PDC, ne doit pas suivre son hôte : désactivez le VMICTimeProvider (`HKLM\SYSTEM\CurrentControlSet\Services\w32time\TimeProviders\VMICTimeProvider`, `Enabled` = 0) pour qu'il utilise la hiérarchie du domaine ou la source NTP configurée.

> **Piège d'examen.** Après le transfert du rôle d'émulateur PDC, le nouvel émulateur PDC doit recevoir la configuration NTP externe, et l'ancien doit revenir à `/syncfromflags:domhier` ; sinon, la forêt a deux sources « fiables » ou aucune.

<!-- section: performance | objectives: 7.2.5 -->
## Résoudre les problèmes de performances

Méthode : confirmer le symptôme, trouver la ressource saturée, puis le processus, puis la cause.

| Outil | Usage |
| --- | --- |
| Gestionnaire des tâches | Vue rapide du processeur, de la mémoire, du disque et du réseau par processus |
| Moniteur de ressources (`resmon`) | Quel processus utilise quel fichier, quel port ou quelle file d'attente disque |
| Analyseur de performances et jeux de collecteurs de données | Compteurs dans la durée, comparaison avec une base de référence |
| `Get-Process` et `Get-Counter` | Vérifications par script, serveurs distants |
| Diagnostics de performances (PerfInsights) | Machines virtuelles Azure : diagnostics continus ou analyse à la demande (Quick performance analysis, Performance analysis, Benchmarking, Azure Files analysis, Advanced performance analysis) ; résultats dans un compte de stockage |

```powershell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, Id, CPU, WorkingSet64
```

Un processus dont les **Private Bytes** augmentent sans limite évoque une fuite de mémoire. Dans Azure, un disque lent alors que l'invité montre peu de charge est souvent **limité (throttling)** : la taille de machine virtuelle a ses propres limites d'IOPS et de débit, en plus des limites de chaque disque. Corrections : redimensionner la machine virtuelle, utiliser un type ou un niveau de disque plus rapide, activer la mise en cache de l'hôte quand c'est possible, ou répartir les données sur plusieurs disques. Une machine virtuelle de série B qui épuise ses crédits processeur est plafonnée à sa performance de base.

> **Piège d'examen.** Ajouter un disque plus rapide n'aide pas si la limite de la taille de machine virtuelle est le goulot d'étranglement : comparez les limites sans cache de la machine virtuelle à celles des disques avant de choisir entre redimensionner la machine virtuelle et changer le disque.

<!-- section: extensions | objectives: 7.2.6 -->
## Résoudre les problèmes d'extension de machine virtuelle et d'Azure Arc

Les **machines virtuelles Azure** reposent sur l'**agent de machine virtuelle Azure** : services **WindowsAzureGuestAgent** et **RdAgent**. Le portail affiche l'agent **Ready** ou **Not ready**.

| Vérification | Détail |
| --- | --- |
| Agent à l'état Not ready | Services absents, arrêtés ou pas en démarrage automatique ; réinstallez le MSI de l'agent ou redémarrez les services |
| Connectivité à la plateforme | TCP 80 et 32526 vers **168.63.129.16** (WireServer) non bloqués par un pare-feu ou un proxy |
| Journaux de l'agent | `C:\WindowsAzure\Logs\WaAppAgent.log`, `TransparentInstaller.log` |
| Journaux des extensions | `C:\WindowsAzure\Logs\Plugins\<extension>\` ; paramètres et état dans `C:\Packages\Plugins\<extension>\` |

```powershell
Get-AzVMExtension -ResourceGroupName RG1 -VMName VM1 -Name AzureMonitorWindowsAgent -Status
Remove-AzVMExtension -ResourceGroupName RG1 -VMName VM1 -Name AzureMonitorWindowsAgent
```

Les **serveurs activés pour Azure Arc** utilisent l'**agent Connected Machine** et son gestionnaire d'extensions :

```powershell
azcmagent show                     # connection status and dependent services
azcmagent check                    # tests the network endpoints
azcmagent config list              # mode, allowlist, blocklist
azcmagent logs                     # collects the logs in a zip file
Remove-AzConnectedMachineExtension -Name AzureMonitorWindowsAgent -ResourceGroupName RG1 -MachineName SRV1
```

- Une extension qui n'est pas à l'état **Succeeded** : supprimez-la, puis réinstallez-la. Bloquée à l'état **Deleting** : supprimez-la avec `az connectedmachine extension delete`, puis retirez son dossier sous `C:\Packages\Plugins\` si nécessaire.
- Journaux du gestionnaire d'extensions : `%SystemDrive%\ProgramData\GuestConfig\ext_mgr_logs` (`gc_ext.log` montre les erreurs de téléchargement et de vérification) ; journaux par extension sous `C:\ProgramData\GuestConfig`.
- Des contrôles de sécurité locaux refusent les installations et signalent un échec à Azure : une **liste d'autorisation** (seules les extensions listées), une **liste de blocage**, `extensions.enabled false` (gestionnaire d'extensions désactivé) ou le **mode supervision** (monitor). Ils ne se modifient que sur le serveur lui-même, et en mode supervision les listes ne peuvent pas changer avant `azcmagent config set config.mode full`.

```powershell
azcmagent config set extensions.allowlist "Microsoft.Azure.Monitor/AzureMonitorWindowsAgent"
azcmagent config set config.mode full
```

> **Piège d'examen.** Si le déploiement d'une extension Arc échoue sur un seul serveur alors que la stratégie est correcte, exécutez `azcmagent config list` sur ce serveur : une liste d'autorisation ou de blocage locale ne peut être ni vue ni contournée depuis Azure.

<!-- section: disk-encryption | objectives: 7.2.7 -->
## Résoudre les problèmes de chiffrement de disque

**BitLocker sur Windows Server** :

| Symptôme | Cause et correction |
| --- | --- |
| Le serveur démarre en récupération BitLocker après une modification du microprogramme ou du démarrage | Les mesures du TPM ont changé : saisissez le mot de passe de récupération ; la prochaine fois, exécutez `Suspend-BitLocker -RebootCount 1` avant la modification |
| Mot de passe de récupération introuvable dans AD DS | Non sauvegardé : GPO *Choose how BitLocker-protected operating system drives can be recovered* avec sauvegarde dans AD DS ; pour les volumes existants, `Backup-BitLockerKeyProtector` |
| Impossible de voir les mots de passe de récupération dans ADUC | Installez la fonctionnalité **BitLocker Recovery Password Viewer** ; l'utilisateur doit avoir l'accès en lecture aux objets de récupération |
| Volume de données verrouillé à chaque redémarrage | Activez le déverrouillage automatique : `Enable-BitLockerAutoUnlock` |

```powershell
manage-bde -status
manage-bde -protectors -get C:
manage-bde -unlock D: -RecoveryPassword 123456-123456-123456-123456-123456-123456-123456-123456
$kp = (Get-BitLockerVolume -MountPoint C:).KeyProtector | Where-Object KeyProtectorType -eq "RecoveryPassword"
Backup-BitLockerKeyProtector -MountPoint C: -KeyProtectorId $kp.KeyProtectorId
```

**Azure Disk Encryption (ADE)** utilise BitLocker avec des clés dans Azure Key Vault. ADE est **mis hors service le 15 septembre 2028** : utilisez le **chiffrement sur l'hôte** (encryption at host) pour les nouvelles machines virtuelles et migrez les existantes. Échecs ADE courants :

- Coffre de clés dans une autre **région ou un autre abonnement** que la machine virtuelle, ou non activé pour le chiffrement de disque.
- Un GPO de domaine qui **impose des protecteurs TPM** (ADE utilise un protecteur de clé externe) ou bloque AES-CBC.
- La machine virtuelle n'atteint pas les points de terminaison du dépôt d'extensions, du stockage ou de Key Vault.
- Machine virtuelle non prise en charge : séries Basic ou A, moins de 2 Go de mémoire, séries v6 ou ultérieures.

ADE ne stocke pas les clés de récupération à votre place, et vous ne devez jamais déchiffrer un disque ADE directement avec BitLocker.

```powershell
Get-AzVMDiskEncryptionStatus -ResourceGroupName RG1 -VMName VM1
```

> **Piège d'examen.** Une mise à jour planifiée du BIOS déclenche la récupération BitLocker si la protection n'est pas **suspendue** au préalable. Suspendre n'est pas déchiffrer : le volume reste chiffré et la protection reprend après le nombre de redémarrages défini.

<!-- section: storage | objectives: 7.2.8 -->
## Résoudre les problèmes de stockage

| Symptôme | Vérification et correction |
| --- | --- |
| Nouveau disque invisible dans l'Explorateur de fichiers | Disque hors connexion (stratégie SAN) ou non initialisé : `Set-Disk -Number 2 -IsOffline $false`, `-IsReadOnly $false`, puis `Initialize-Disk` et création d'un volume |
| Erreurs du système de fichiers (événement NTFS 55) | `Repair-Volume -DriveLetter E -Scan`, puis `-SpotFix` (courte réparation hors connexion) ou `chkdsk E: /f` |
| Disque virtuel des espaces de stockage Degraded ou Unhealthy | `Get-PhysicalDisk` (HealthStatus, OperationalStatus), remplacez le disque, `Repair-VirtualDisk`, suivez avec `Get-StorageJob` |
| Disque défaillant encore dans un pool | `Set-PhysicalDisk -FriendlyName PD3 -Usage Retired`, réparez, puis `Remove-PhysicalDisk` |
| Avertissements d'un cluster d'espaces de stockage direct | `Debug-StorageSubSystem` sur le sous-système de stockage du cluster liste les défaillances du service d'intégrité (Health Service) |
| Disque iSCSI disparu après un redémarrage | Session non persistante : `Connect-IscsiTarget -IsPersistent $true` ; vérifiez les chemins MPIO |
| Un partage de fichiers Azure ne se monte pas | **TCP 445** sortant bloqué : `Test-NetConnection storacct.file.core.windows.net -Port 445` |
| Disque de données Azure lent | Limitation du disque ou de la taille de machine virtuelle (voir les performances) |

```powershell
Get-Disk | Select-Object Number, FriendlyName, OperationalStatus, IsOffline, IsReadOnly, PartitionStyle
Get-PhysicalDisk | Select-Object FriendlyName, HealthStatus, OperationalStatus, Usage
Get-VirtualDisk | Select-Object FriendlyName, HealthStatus, OperationalStatus
Repair-VirtualDisk -FriendlyName Data1
Get-StorageJob
```

> **Piège d'examen.** Mettez hors service (Retired) un disque physique défaillant **avant** de le retirer : le pool reconstruit alors les données sur les disques restants tant que l'ancien est encore lisible. Le retirer d'abord laisse le disque virtuel dégradé pendant toute la reconstruction.

<!-- section: key-points -->
## Points clés

- Testez le port, pas ping ; APIPA signifie que DHCP a échoué ; dans Azure, gardez DHCP dans l'invité et utilisez Network Watcher.
- `nslookup` ignore le fichier hosts et le cache ; Netlogon inscrit les enregistrements SRV.
- Windows Update : service, source, autorisations, puis DISM et sfc ; le Gestionnaire de mise à jour exige Customer Managed Schedules.
- Kerberos échoue au-delà de 5 minutes d'écart ; seul l'émulateur PDC de la racine de la forêt utilise une source externe.
- Performances : ressource, processus, cause ; dans Azure, vérifiez la limitation de la machine virtuelle et des disques.
- Extensions : agent de machine virtuelle Ready et 168.63.129.16 ; Arc : `azcmagent show`, `check`, liste d'autorisation locale.
- BitLocker : suspendre avant une modification du microprogramme ; ADE est mis hors service en 2028, utilisez le chiffrement sur l'hôte.
- Stockage : mettre en ligne et initialiser les disques ; mettre hors service, puis retirer, les disques défaillants d'un pool.
