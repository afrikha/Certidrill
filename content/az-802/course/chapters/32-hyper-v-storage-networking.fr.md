Ce chapitre couvre le côté hôte d'une machine virtuelle Hyper-V : la disponibilité (clustering de basculement, migration dynamique), les disques durs virtuels, le réseau (cartes réseau, commutateurs virtuels, teaming) et la reprise sur un autre site (Hyper-V Réplica). Les questions nomment un hôte, une machine virtuelle et une contrainte, puis demandent quelle fonctionnalité, quel paramètre ou quelle cmdlet y répond.

<!-- section: high-availability | objectives: 3.1.9 -->
## Haute disponibilité des machines virtuelles Hyper-V

Choisissez la technologie d'après la panne à laquelle il faut survivre :

| Exigence | Réponse |
| --- | --- |
| Une machine virtuelle redémarre automatiquement sur un autre hôte quand son hôte tombe en panne | Cluster de basculement d'hôtes Hyper-V, machine virtuelle ajoutée comme rôle en cluster, fichiers sur un stockage partagé (CSV, partage SMB, espaces de stockage direct) |
| Déplacer une machine virtuelle en cours d'exécution vers un autre hôte sans interruption perceptible | Migration dynamique (dans un cluster, ou « shared-nothing » entre hôtes autonomes) |
| Vider un nœud avant une maintenance | Suspendre le nœud avec **Drainer les rôles** : ses machines virtuelles migrent dynamiquement vers les autres nœuds |
| Garder une copie de la machine virtuelle sur un autre site, de façon asynchrone | Hyper-V Réplica (voir la dernière section) |
| L'application elle-même doit basculer à l'intérieur des invités | Cluster invité : un cluster de machines virtuelles qui partagent un fichier VHD Set (`.vhds`) |

L'essentiel du cluster de basculement :

- Lancez la validation avant la création (`Test-Cluster`), puis `New-Cluster`. Les hôtes doivent avoir un matériel équivalent et des processeurs dotés de la virtualisation assistée par matériel et de la DEP ; un cluster d'hôtes Hyper-V avec un stockage SAN ou NAS compte de 1 à 64 nœuds, un cluster hyperconvergé à espaces de stockage direct de 1 à 16.
- Rendez la machine virtuelle hautement disponible avec `Add-ClusterVirtualMachineRole` (ou l'assistant **Configurer un rôle**). Une machine virtuelle créée seulement dans le Gestionnaire Hyper-V n'est pas en cluster et ne bascule pas.
- Placez les machines virtuelles sur des **volumes partagés de cluster** (CSV, formatés en NTFS ou ReFS) pour que chaque nœud lise et écrive le même volume.
- Quorum : chaque nœud dispose d'un vote ; configurez un témoin pour obtenir un nombre impair de votes. Les types de témoins sont le témoin disque, le témoin de partage de fichiers et le témoin cloud (un objet blob dans un compte de stockage Azure, utile sans troisième site).

```powershell
Test-Cluster -Node HV1, HV2
New-Cluster -Name HVCLU1 -Node HV1, HV2 -StaticAddress 10.0.0.50
Add-ClusterSharedVolume -Name "Cluster Disk 1"
Set-ClusterQuorum -CloudWitness -AccountName contosowitness -AccessKey "<storage-account-key>"
Add-ClusterVirtualMachineRole -VirtualMachine VM1
Suspend-ClusterNode -Name HV1 -Drain
Move-ClusterVirtualMachineRole -Name VM1 -Node HV2
```

Paramètres de migration dynamique (par hôte, ou **Paramètres de migration dynamique** des réseaux du cluster) :

| Paramètre | Valeurs |
| --- | --- |
| Authentification | **CredSSP** (par défaut jusqu'à Windows Server 2022 ; vous devez être connecté à l'hôte source) ou **Kerberos** (exige une délégation contrainte sur le compte d'ordinateur de chaque hôte vers les services **cifs** et **Microsoft Virtual System Migration Service**) |
| Option de performances | TCP/IP ; **Compression** (par défaut) ; SMB (utilise SMB Direct quand les cartes disposent de RDMA, et SMB Multichannel) |
| Migrations dynamiques simultanées | 2 par défaut |
| Réseaux pour les migrations entrantes | N'importe quel réseau, ou une liste de sous-réseaux (`Set-VMMigrationNetwork`) |

```powershell
Enable-VMMigration
Set-VMMigrationNetwork 192.168.10.1
Set-VMHost -VirtualMachineMigrationAuthenticationType Kerberos `
  -VirtualMachineMigrationPerformanceOption SMB
```

> **Piège d'examen.** Sous Windows Server 2025, Credential Guard est activé par défaut sur les serveurs joints à un domaine qui ne sont pas contrôleurs de domaine : la migration dynamique basée sur CredSSP échoue après une mise à niveau. La solution est Kerberos avec délégation contrainte, pas la désactivation du pare-feu ni l'ajout de l'utilisateur à un groupe.

Le **mode de compatibilité du processeur** permet de déplacer une machine virtuelle entre hôtes dont les processeurs sont de générations différentes mais du **même fabricant** (jamais d'Intel vers AMD). La machine virtuelle doit être arrêtée pour le modifier. Windows Server 2025 ajoute un mode dynamique qui calcule les fonctionnalités communes à tous les nœuds du cluster (version de configuration 10.0 ou ultérieure).

```powershell
Set-VMProcessor -VMName VM1 -CompatibilityForMigrationEnabled $true `
  -CompatibilityForMigrationMode CommonClusterFeatureSet
```

<!-- section: virtual-hard-disks | objectives: 3.1.10 -->
## Gérer les disques durs virtuels Hyper-V

| Format | Taille maximale | Remarques |
| --- | --- | --- |
| VHD | 2 040 Go | Ancien format, conservé pour la compatibilité |
| VHDX | 64 To | Redimensionnement en ligne, meilleure protection contre l'altération des données, secteurs logiques de 4 Ko. Le choix par défaut |
| VHD Set (`.vhds`) | Comme VHDX | Disque partagé des clusters invités ; prend en charge le redimensionnement en ligne, Hyper-V Réplica et les points de contrôle cohérents avec les applications |

| Type | Comportement |
| --- | --- |
| Taille fixe | Taille complète allouée à la création ; performances prévisibles |
| Dynamiquement extensible | Grossit au fil des écritures ; le type par défaut de `New-VHD` |
| Différenciation | Enfant d'un disque parent ; ne stocke que les modifications, le parent reste inchangé |
| Pass-through | Un disque physique, **hors connexion sur l'hôte**, donné directement à la machine virtuelle (`Add-VMHardDiskDrive -DiskNumber`) |

Contrôleurs : une machine virtuelle de génération 1 démarre sur un disque IDE (2 contrôleurs IDE, 4 périphériques) ; une machine virtuelle de génération 2 démarre sur SCSI et n'a pas d'IDE. Chaque machine virtuelle a jusqu'à 4 contrôleurs SCSI de 64 disques.

```powershell
New-VHD -Path D:\VMs\Data1.vhdx -SizeBytes 200GB -Dynamic
New-VHD -Path D:\VMs\Web2.vhdx -ParentPath D:\VMs\Base.vhdx -Differencing
Add-VMHardDiskDrive -VMName VM1 -ControllerType SCSI -Path D:\VMs\Data1.vhdx
Resize-VHD -Path D:\VMs\Data1.vhdx -SizeBytes 300GB
Optimize-VHD -Path D:\VMs\Data1.vhdx
Convert-VHD -Path D:\VMs\Old.vhd -DestinationPath D:\VMs\Old.vhdx
```

| Opération | Règle |
| --- | --- |
| `Resize-VHD` | Agrandit les VHD et VHDX ; ne réduit que les VHDX, jamais sous leur taille minimale. En ligne seulement si le disque est sur un contrôleur **SCSI** ; sur IDE, la machine virtuelle doit être arrêtée |
| `Optimize-VHD` (compactage) | Récupère les blocs inutilisés des disques dynamiques et de différenciation, pas des disques de taille fixe. Le disque doit être détaché ou attaché en lecture seule |
| `Convert-VHD` | Change le format (d'après l'extension) ou le type. Hors connexion : le disque ne doit pas être attaché |
| `Merge-VHD` | Fusionne une chaîne de différenciation. Hors connexion |
| `Set-VHD -ParentPath` | Reconnecte un disque de différenciation à un parent déplacé |

Après un agrandissement, étendez le volume dans l'invité. Pour réduire, réduisez d'abord le volume dans l'invité : `Resize-VHD` échoue sous la valeur `MinimumSize` du disque.

> **Piège d'examen.** « Réduire la taille du fichier .vhdx sur l'hôte », c'est `Optimize-VHD` ; « réduire la taille du disque vue par l'invité », c'est `Resize-VHD` sur un VHDX. `Resize-VHD` ne supprime jamais les blocs vides.

Le disque partagé d'un cluster invité est un VHD Set attaché à chaque machine virtuelle avec `-SupportPersistentReservations`. Pour migrer un VHDX partagé vers un VHD Set, mettez les machines virtuelles hors connexion, retirez le disque, lancez `Convert-VHD existing.vhdx new.vhds`, puis rattachez-le.

<!-- section: network-adapters | objectives: 3.1.11 -->
## Configurer la carte réseau Hyper-V

| Carte | Usage |
| --- | --- |
| Carte réseau (synthétique) | Générations 1 et 2 ; pilote fourni par les services d'intégration ; meilleures performances. En génération 2, elle permet aussi le démarrage réseau (PXE) |
| Carte réseau héritée | Génération 1 uniquement ; émule une carte Intel 21140 ; nécessaire pour un démarrage PXE en génération 1 ou pour un invité sans services d'intégration |

On ne convertit pas un type en l'autre : ajoutez une nouvelle carte. Une machine virtuelle de génération 1 a jusqu'à 8 cartes synthétiques et 4 cartes héritées ; une machine virtuelle de génération 2 jusqu'à 64 cartes synthétiques, ajoutables et supprimables à chaud.

| Paramètre de `Set-VMNetworkAdapter` | Effet |
| --- | --- |
| `-StaticMacAddress` / `-DynamicMacAddress` | Une adresse MAC fixe, ou une adresse MAC attribuée par Hyper-V |
| `-MacAddressSpoofing On` | Permet à l'invité d'émettre des trames avec une adresse MAC qui ne lui est pas attribuée ; obligatoire sur la carte d'une machine virtuelle qui héberge des machines virtuelles imbriquées |
| `-DhcpGuard On` | Supprime les messages de serveur DHCP émis par cette machine virtuelle |
| `-RouterGuard On` | Supprime les messages d'annonce de routeur et de redirection émis par cette machine virtuelle |
| `-PortMirroring Source` / `Destination` | Copie le trafic d'une carte source vers une carte de destination (une machine virtuelle de supervision) |
| `-MaximumBandwidth` / `-MinimumBandwidthWeight` | Plafonne (bits par seconde) ou garantit une part relative (0 à 100) |
| `-VmqWeight` / `-IovWeight` | 0 désactive VMQ / SR-IOV pour la carte |
| `-DeviceNaming On` | Expose le nom de la carte à l'invité (génération 2) |
| `-AllowTeaming On` | Autorise le teaming dans l'invité |

Les VLAN se définissent par carte. Le mode accès marque tout le trafic avec un seul VLAN ; le mode trunk permet à une machine virtuelle de type appliance de recevoir plusieurs VLAN. La carte et le commutateur physiques doivent prendre en charge 802.1q.

```powershell
Add-VMNetworkAdapter -VMName VM1 -SwitchName External1 -Name Backend
Set-VMNetworkAdapter -VMName VM1 -Name Backend -DhcpGuard On -RouterGuard On
Set-VMNetworkAdapterVlan -VMName VM1 -VMNetworkAdapterName Backend -Access -VlanId 20
Set-VMNetworkAdapterVlan -VMName FW1 -Trunk -AllowedVlanIdList 10-30 -NativeVlanId 10
Set-VMNetworkAdapterVlan -ManagementOS -Access -VlanId 5
```

> **Piège d'examen.** La protection DHCP (DHCP guard) et la protection du routeur (router guard) se configurent sur la carte de la machine virtuelle **non autorisée** (ou de toutes les machines virtuelles sauf le serveur légitime), pas sur la machine virtuelle serveur DHCP.

<!-- section: virtual-switch | objectives: 3.1.13 -->
## Configurer le commutateur virtuel Hyper-V

| Type | Relie les machines virtuelles à | Utilisable par l'hôte | Créé avec |
| --- | --- | --- | --- |
| Externe | Le réseau physique, par une carte physique ou une association | Oui si **Autoriser le système d'exploitation de gestion à partager cette carte réseau** est coché | `-NetAdapterName` (implique Externe) |
| Interne | Les autres machines virtuelles de l'hôte et l'hôte | Oui (une carte virtuelle de l'hôte est créée) | `-SwitchType Internal` |
| Privé | Les autres machines virtuelles du même hôte uniquement | Non | `-SwitchType Private` |

```powershell
Get-NetAdapter
New-VMSwitch -Name External1 -NetAdapterName "Ethernet 2" -AllowManagementOS $true
New-VMSwitch -Name LabNet -SwitchType Private
New-VMSwitch -Name NatSwitch -SwitchType Internal
New-NetIPAddress -IPAddress 192.168.0.1 -PrefixLength 24 -InterfaceAlias "vEthernet (NatSwitch)"
New-NetNat -Name LabNAT -InternalIPInterfaceAddressPrefix 192.168.0.0/24
```

Les points qui décident des réponses :

- Un commutateur externe sur l'unique carte de l'hôte, sans partage avec le système d'exploitation de gestion, coupe l'hôte du réseau.
- **SR-IOV** doit être activé à la création du commutateur (`-EnableIov $true`) ; on ne peut pas l'activer ensuite. La carte de la machine virtuelle doit alors avoir une valeur `IovWeight` non nulle.
- Le mode de bande passante minimale (`-MinimumBandwidthMode Absolute` ou `Weight`) se choisit aussi à la création.
- Un réseau NAT donne aux machines virtuelles internes un accès sortant par l'hôte ; il y a un seul réseau NAT par hôte.

<!-- section: nic-teaming | objectives: 3.1.12 -->
## Teaming de cartes réseau sur l'hôte et dans la machine virtuelle

| | Switch Embedded Teaming (SET) | Association de cartes réseau (LBFO) |
| --- | --- | --- |
| Où | Intégré au commutateur virtuel Hyper-V | Fonctionnalité du système d'exploitation, indépendante d'Hyper-V |
| Commutateur Hyper-V au-dessus | Oui | **Non** depuis Windows Server 2022 : un commutateur Hyper-V ne peut pas être lié à une association LBFO |
| Membres | Jusqu'à 8 cartes identiques (même fabricant, modèle, vitesse, configuration) | Les cartes de vitesses différentes ne sont pas prises en charge |
| Modes d'association | Indépendant du commutateur uniquement | Indépendant du commutateur, Static, LACP |
| Équilibrage de charge | Hyper-V Port ou Dynamic | Hachage d'adresses (TransportPorts, IPAddresses, MacAddresses), Hyper-V Port, Dynamic |
| Association de cartes RDMA, RDMA invité | Oui | Non |

```powershell
# Host: SET switch over two identical adapters
New-VMSwitch -Name SETswitch -NetAdapterName "NIC1","NIC2" -EnableEmbeddedTeaming $true `
  -AllowManagementOS $true
Set-VMSwitchTeam -Name SETswitch -LoadBalancingAlgorithm HyperVPort
Add-VMSwitchTeamMember -VMSwitchName SETswitch -NetAdapterName "NIC3"

# Server without Hyper-V: LBFO team
New-NetLbfoTeam -Name Team1 -TeamMembers "NIC1","NIC2" -TeamingMode Lacp `
  -LoadBalancingAlgorithm Dynamic
```

`Set-VMSwitchTeam` accepte `Dynamic` (par défaut) et `HyperVPort` ; Microsoft recommande Hyper-V Port pour les cartes de 10 Gbit/s ou plus. LACP et Static exigent une configuration sur le commutateur physique ; le mode indépendant du commutateur permet de relier les membres à des commutateurs différents.

**Teaming dans une machine virtuelle** : donnez deux cartes réseau à la machine virtuelle, autorisez le teaming sur ces cartes depuis l'hôte, puis créez une association LBFO dans l'invité.

```powershell
# On the host
Set-VMNetworkAdapter -VMName VM1 -AllowTeaming On
# In the guest
New-NetLbfoTeam -Name GuestTeam -TeamMembers "Ethernet","Ethernet 2"
```

> **Piège d'examen.** « Associer deux cartes sur un hôte Hyper-V et y connecter des machines virtuelles » sous Windows Server 2022 ou 2025 = SET (`New-VMSwitch -EnableEmbeddedTeaming`), et non `New-NetLbfoTeam` suivi d'un commutateur.

<!-- section: hyper-v-replica | objectives: 3.1.14 -->
## Configurer le réplica Hyper-V

Hyper-V Réplica maintient une copie hors connexion, mise à jour de façon asynchrone (machine virtuelle de réplica), d'une machine virtuelle en cours d'exécution (machine virtuelle principale), sur un autre hôte ou cluster, sur le même site ou sur un autre. Il est inclus dans Windows Server, pas dans l'Hyper-V des systèmes clients.

| Paramètre | Valeurs |
| --- | --- |
| Fréquence de réplication | 30 secondes, 5 minutes (par défaut) ou 15 minutes |
| Points de récupération | Le dernier uniquement (par défaut) ou jusqu'à 24 points horaires supplémentaires, éventuellement cohérents avec les applications (fréquence des instantanés VSS) |
| Authentification | Kerberos sur HTTP, port 80 (hôtes du même domaine ou de domaines approuvés, sans chiffrement) ou certificat sur HTTPS, port 443 (hôtes en groupe de travail ou non approuvés, ou chiffrement exigé) |
| Certificat | EKU Authentification du client et Authentification du serveur, clé privée, racine approuvée, sujet ou SAN = FQDN de l'hôte (ou FQDN du courtier de réplicas pour un cluster) |
| Copie initiale | Par le réseau immédiatement ou planifiée (jusqu'à 7 jours), par un support externe, ou depuis une machine virtuelle existante restaurée |
| Disques | Tous ou une partie (excluez les disques de fichier d'échange ou temporaires) |
| Réplication étendue | De l'hôte de réplica vers un troisième hôte ; jamais de la machine principale vers deux réplicas |

Ordre des opérations :

1. Sur l'hôte **récepteur**, activez-le comme serveur de réplica, choisissez l'authentification et l'autorisation (tout serveur authentifié, ou des serveurs précis avec un chemin de stockage et un groupe d'approbation). Pour un cluster récepteur, créez d'abord le rôle **courtier de réplicas Hyper-V** (Hyper-V Replica Broker), un point d'accès client avec son propre nom et sa propre adresse IP.
2. Sur les hôtes récepteurs, activez la règle de pare-feu **Hyper-V Replica HTTP Listener (TCP-In)** ou **Hyper-V Replica HTTPS Listener (TCP-In)** ; Hyper-V les crée désactivées.
3. Depuis la machine principale, testez la connexion, activez la réplication de la machine virtuelle et lancez la réplication initiale.

```powershell
# Replica server
Set-VMReplicationServer -ReplicationEnabled $true -AllowedAuthenticationType Kerberos
Enable-NetFirewallRule -DisplayName "Hyper-V Replica HTTP Listener (TCP-In)"

# Primary server
Test-VMReplicationConnection -ReplicaServerName HV3.contoso.com -ReplicaServerPort 80 `
  -AuthenticationType Kerberos
Enable-VMReplication -VMName VM1 -ReplicaServerName HV3.contoso.com -ReplicaServerPort 80 `
  -AuthenticationType Kerberos
Start-VMInitialReplication -VMName VM1
Get-VMReplication -VMName VM1
Measure-VMReplication -VMName VM1
```

| Basculement | Lancé sur | Étapes | Perte de données |
| --- | --- | --- | --- |
| Test | Hôte de réplica | `Start-VMFailover -AsTest` crée une machine virtuelle de test isolée ; `Stop-VMFailover` la supprime | Aucune ; la réplication continue |
| Planifié | Machine principale, puis réplica | Arrêter la machine virtuelle principale, `Start-VMFailover -Prepare` sur l'hôte principal, `Start-VMFailover` sur le réplica, `Set-VMReplication -Reverse`, `Start-VM` | Aucune |
| Non planifié | Hôte de réplica | `Start-VMFailover`, `Start-VM`, puis `Complete-VMFailover` (fusionne les points de récupération). Ensuite, `Set-VMReplication -AsReplica` sur l'ancienne machine principale et réplication inverse | Possible |

Pour donner une autre adresse IP à la machine virtuelle sur le site de reprise, configurez l'**injection d'adresse IP statique** sur la machine virtuelle de réplica une fois la réplication activée (`Set-VMNetworkAdapterFailoverConfiguration`, exécutée sur l'hôte de réplica), appliquée par le service d'intégration Échange de paires clé-valeur (KVP). Elle exige des cartes réseau synthétiques (pas des cartes réseau héritées) et des services d'intégration à jour dans l'invité.

> **Piège d'examen.** Hyper-V Réplica n'est pas de la haute disponibilité : rien ne bascule automatiquement. Un cluster redémarre automatiquement les machines virtuelles sur le même site ; le réplica exige une action de basculement que vous lancez.

<!-- section: key-points -->
## Points clés

- Redémarrage automatique en cas de panne de l'hôte = cluster de basculement + rôle de machine virtuelle en cluster + stockage partagé ; déplacement sans interruption = migration dynamique.
- Windows Server 2025 bloque la migration dynamique CredSSP (Credential Guard) : utilisez Kerberos avec délégation contrainte (cifs et Microsoft Virtual System Migration Service).
- VHDX : 64 To, redimensionnement en ligne sur SCSI, réduction possible ; `Optimize-VHD` compacte, `Convert-VHD` et `Merge-VHD` sont hors connexion ; disque partagé des clusters invités = VHD Set.
- Carte réseau héritée seulement pour le démarrage PXE en génération 1 ; les protections se règlent sur les machines virtuelles qui ne doivent pas répondre.
- Commutateur externe, interne, privé ; SR-IOV seulement à la création du commutateur.
- Commutateur Hyper-V + teaming sous Windows Server 2022 ou ultérieur = SET (indépendant du commutateur, Hyper-V Port ou Dynamic) ; `-AllowTeaming On` pour le teaming dans un invité.
- Réplica : configurez d'abord le côté récepteur, le courtier pour les clusters, les règles de pare-feu d'écoute, 30 s / 5 min / 15 min, jusqu'à 24 points de récupération ; le basculement planifié exige l'arrêt de la machine principale.
