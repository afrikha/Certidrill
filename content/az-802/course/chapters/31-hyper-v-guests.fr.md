Ce chapitre couvre les paramètres d'un invité Hyper-V : s'y connecter et le gérer depuis l'hôte, la mémoire et les services d'intégration, l'accès direct au matériel (virtualisation imbriquée, attribution discrète d'appareil, partitionnement GPU) et les points de contrôle. Les questions nomment un hôte (HV1), une machine virtuelle (VM1) et une exigence, puis demandent quel paramètre ou quelle cmdlet utiliser, ou quoi faire en premier (souvent : arrêter la machine virtuelle).

<!-- section: enhanced-session | objectives: 3.1.1 -->
## Mode de session amélioré

Connexion à une machine virtuelle (VMConnect, `vmconnect.exe`) ouvre la console d'une machine virtuelle. Le mode **de base** ne donne que l'écran, le clavier et la souris. Le **mode de session amélioré** utilise une session RDP sur le VMBus : il fonctionne donc **sans connectivité réseau** vers la machine virtuelle et ajoute des ressources locales : redimensionnement de l'affichage, audio, Presse-papiers, imprimantes, cartes à puce, périphériques USB, lecteurs locaux et périphériques Plug-and-Play pris en charge.

Exigences :

| Où | Exigence |
| --- | --- |
| Hôte Hyper-V | La **stratégie** de l'hôte l'autorise (Paramètres Hyper-V > Serveur > Stratégie du mode de session amélioré, ou `Set-VMHost -EnableEnhancedSessionMode $true`) **et** le paramètre utilisateur est activé (Paramètres Hyper-V > Utilisateur > Mode de session amélioré) |
| Invité | Windows 10 ou Windows Server 2016 ou ultérieur, **Services Bureau à distance activés dans l'invité** ; la fonctionnalité est documentée pour les machines virtuelles Windows |
| Client qui exécute VMConnect | Windows 10 ou Windows Server 2016 ou ultérieur |

```powershell
Set-VMHost -EnableEnhancedSessionMode $true   # host policy, on HV1
vmconnect.exe HV1 VM1 /edit                   # reopen the connection settings (resources to share)
```

Sur les hôtes Windows Server, la stratégie est désactivée par défaut, contrairement aux hôtes Windows client. Une icône grisée dans la barre d'outils signifie que la machine virtuelle n'est pas prête (Bureau à distance désactivé dans l'invité, invité non pris en charge, système non démarré).

> **Piège d'examen.** Le mode de session amélioré ne demande ni commutateur virtuel ni adresse IP dans la machine virtuelle : copier un fichier dans une machine virtuelle isolée est une réponse typique « activer le mode de session amélioré ». Copy-VMFile et PowerShell Direct sont les alternatives par script.

<!-- section: remote-vm-management | objectives: 3.1.2 -->
## Gérer des machines virtuelles avec PowerShell, PowerShell Direct et SSH Direct

**Gérer l'hôte à distance.** Les cmdlets du module Hyper-V acceptent `-ComputerName` ou `-CimSession` ; le Gestionnaire Hyper-V se connecte aux hôtes distants via WS-Management (Kerberos, NTLM ou CredSSP). L'utilisateur doit être membre de **Hyper-V Administrators** (ou d'Administrators) sur l'hôte.

```powershell
Get-VM -ComputerName HV1, HV2 | Where-Object State -eq Running
```

**PowerShell Direct** exécute PowerShell **dans** un invité depuis son hôte via le VMBus, quelle que soit la configuration réseau, pare-feu ou de gestion à distance de la machine virtuelle :

| Exigence | Détail |
| --- | --- |
| Emplacement | La machine virtuelle s'exécute **sur l'hôte local** ; vous lancez la commande sur cet hôte |
| État | La machine virtuelle est **en cours d'exécution** et son système a fini de démarrer |
| Droits sur l'hôte | Vous êtes connecté à l'hôte en tant qu'administrateur Hyper-V |
| Informations d'identification de l'invité | Vous fournissez des informations d'identification valides **de l'invité** (`-Credential`) ; `-RunAsAdministrator` est inutilisable |
| Système | Hôte et invité Windows 10 / Windows Server 2016 ou ultérieur ; service invité *Hyper-V PowerShell Direct Service* (`vmicvmsession`) en cours d'exécution |

```powershell
Enter-PSSession -VMName VM1 -Credential (Get-Credential)                  # interactive
Invoke-Command -VMName VM1 -Credential $cred -FilePath C:\Scripts\Set-Ip.ps1
$s = New-PSSession -VMName VM1 -Credential $cred                           # persistent session
Copy-Item -ToSession $s -Path C:\Tools\agent.msi -Destination C:\Temp\
Remove-PSSession $s
```

**SSH Direct pour les invités Linux.** Les invités Linux n'ont pas de service PowerShell Direct. Depuis l'hôte, l'outil en ligne de commande `hvc.exe` se connecte à une machine virtuelle par son nom : `hvc ssh user@VM1` ouvre une session SSH vers le serveur SSH de l'invité Linux, sans avoir à chercher son adresse IP. La machine virtuelle Linux doit être en cours d'exécution et son serveur SSH configuré.

> **Piège d'examen.** PowerShell Direct échoue depuis un poste d'administration (la machine virtuelle doit être locale à l'hôte où vous lancez la commande), échoue si la machine virtuelle est arrêtée ou encore en démarrage, et utilise les informations d'identification **de l'invité**, pas celles de l'hôte. « La machine virtuelle n'a pas de carte réseau » ne le bloque pas.

<!-- section: nested-virtualization | objectives: 3.1.3 -->
## Virtualisation imbriquée

La virtualisation imbriquée expose les extensions de virtualisation du processeur à une machine virtuelle pour qu'elle exécute elle-même Hyper-V (labos, conteneurs isolés Hyper-V, WSL2 dans une machine virtuelle).

| Exigence | Intel (VT-x avec EPT) | AMD EPYC / Ryzen |
| --- | --- | --- |
| Hôte | Windows Server 2016 ou ultérieur, Windows 10 ou ultérieur | Windows Server 2022 ou ultérieur, Windows 11 ou ultérieur |
| Version de configuration de la machine virtuelle | 8.0 ou supérieure | 9.3 ou supérieure |

```powershell
Stop-VM -Name VM1                                                     # the VM must be off
Set-VMProcessor -VMName VM1 -ExposeVirtualizationExtensions $true
Get-VMNetworkAdapter -VMName VM1 | Set-VMNetworkAdapter -MacAddressSpoofing On
Start-VM -Name VM1
# Then install the Hyper-V role inside VM1
```

Réseau des machines virtuelles imbriquées :

| Option | Quand |
| --- | --- |
| Usurpation d'adresses MAC sur la carte de la machine virtuelle de premier niveau | Les paquets des machines virtuelles imbriquées doivent traverser deux commutateurs virtuels ; la réponse habituelle en local |
| NAT dans la machine virtuelle de premier niveau (commutateur interne + `New-NetNat`) | L'usurpation d'adresses MAC est impossible, par exemple dans un cloud public |

Limites : tant qu'Hyper-V s'exécute dans la machine virtuelle, sa mémoire ne peut pas changer pendant qu'elle tourne (la mémoire dynamique n'a pas d'effet, le redimensionnement à chaud échoue). Pour une machine virtuelle Azure, choisissez le type de sécurité **Standard**. Les configurations imbriquées sont prises en charge en production mais recommandées surtout pour les labos de test, pas pour le clustering de basculement ni les charges sensibles aux performances.

> **Piège d'examen.** `Set-VMProcessor -ExposeVirtualizationExtensions` échoue sur une machine virtuelle en cours d'exécution, et les machines virtuelles imbriquées n'ont pas de réseau tant que l'usurpation d'adresses MAC (ou le NAT) n'est pas configurée sur la machine virtuelle externe.

<!-- section: memory | objectives: 3.1.4 -->
## Paramètres de mémoire des machines virtuelles

| Paramètre | Mémoire statique | Mémoire dynamique |
| --- | --- | --- |
| RAM de démarrage (`-StartupBytes`) | La quantité fixe dont la machine virtuelle dispose toujours | Quantité allouée au démarrage |
| RAM minimale (`-MinimumBytes`) | n/a | Le plancher jusqu'auquel Hyper-V peut récupérer de la mémoire |
| RAM maximale (`-MaximumBytes`) | n/a | Le plafond jusqu'auquel la machine virtuelle peut monter |
| Mémoire tampon (`-Buffer`) | n/a | Mémoire supplémentaire gardée disponible, en pourcentage de la demande actuelle (5 à 2000 %) |
| Poids de la mémoire (`-Priority`, 0 à 100) | n/a | Quelles machines virtuelles reçoivent la mémoire en priorité quand l'hôte en manque |

```powershell
Set-VMMemory -VMName VM1 -DynamicMemoryEnabled $true -MinimumBytes 1GB -StartupBytes 2GB `
    -MaximumBytes 8GB -Buffer 20 -Priority 80
Set-VMMemory -VMName VM2 -StartupBytes 6GB      # static VM: runtime resize while running
```

Ce qui peut changer pendant que la machine virtuelle s'exécute :

| Modification | Machine virtuelle en cours d'exécution ? |
| --- | --- |
| Activer ou désactiver la mémoire dynamique | Non, arrêtez la machine virtuelle |
| Taille de la mémoire statique (redimensionnement de la mémoire à chaud) | Oui, pour les machines virtuelles de génération 1 et 2 sous Windows Server 2016 / Windows 10 ou ultérieur |
| Mémoire dynamique : augmenter le maximum, diminuer le minimum | Oui |

Autres règles :

- La **pagination intelligente** (Smart Paging) permet à une machine virtuelle de redémarrer quand l'hôte ne peut pas fournir sa mémoire de démarrage mais que son minimum est plus bas : le disque est utilisé temporairement pendant le démarrage (`Set-VM -SmartPagingFilePath`).
- La mémoire dynamique est incompatible avec l'**attribution discrète d'appareil**, et n'a pas d'effet sur une machine virtuelle qui exécute Hyper-V en imbrication.

> **Conseil d'examen.** « VM1 doit utiliser de 2 à 8 Go selon la charge » signifie mémoire dynamique. « VM1 a de la mémoire statique et a besoin de 4 Go de plus tout de suite, sans interruption » signifie redimensionnement de la mémoire à chaud (invité Windows Server 2016 ou ultérieur).

<!-- section: integration-services | objectives: 3.1.5 -->
## Services d'intégration

Les services d'intégration sont des composants hôte-invité qui passent par le VMBus. Chacun doit être activé sur l'hôte **et** s'exécuter dans l'invité. Les invités Windows les mettent à jour par Windows Update ; sous Linux, ils sont intégrés au noyau et mis à jour avec lui.

| Service (nom côté hôte) | Service invité | Rôle | Par défaut |
| --- | --- | --- | --- |
| Heartbeat | `vmicheartbeat` | Signale que le système a démarré et répond (`Status` « Operating normally ») | Activé |
| Shutdown | `vmicshutdown` | Arrêt propre depuis l'hôte ; sans lui, Stop-VM coupe l'alimentation | Activé |
| Time Synchronization | `vmictimesync` | Synchronise l'horloge de l'invité sur celle de l'hôte | Activé |
| Key-Value Pair Exchange | `vmickvpexchange` | Échange de chaînes de métadonnées (service Échange de données) | Activé |
| VSS | `vmicvss` | Sauvegarde d'une machine virtuelle en cours d'exécution et **points de contrôle de production** | Activé |
| Guest Service Interface | `vmicguestinterface` | Copie de fichiers de l'hôte vers l'invité avec **`Copy-VMFile`** | **Désactivé** |
| PowerShell Direct (invité uniquement) | `vmicvmsession` | Sessions PowerShell Direct | Activé (invités Windows) |

```powershell
Get-VMIntegrationService -VMName VM1
Enable-VMIntegrationService -VMName VM1 -Name "Guest Service Interface"
Copy-VMFile -Name VM1 -SourcePath C:\ISO\tool.zip -DestinationPath C:\Temp\tool.zip `
    -FileSource Host -CreateFullPath
Disable-VMIntegrationService -VMName VM1 -Name "Time Synchronization"
```

> **Piège d'examen.** `Copy-VMFile` échoue sur une nouvelle machine virtuelle parce que **Guest Service Interface** est le seul service d'intégration désactivé par défaut. Gérez les services d'intégration depuis l'hôte (Gestionnaire Hyper-V ou les cmdlets ci-dessus), pas en arrêtant les services dans l'invité.

<!-- section: device-assignment | objectives: 3.1.6 -->
## Attribution discrète d'appareil

L'attribution discrète d'appareil (DDA) transmet un appareil PCIe entier à **une seule** machine virtuelle, qui charge le pilote du fabricant et accède directement au matériel. Microsoft prend en charge deux classes : les **GPU** et le **stockage NVMe**. Pris en charge sur les hôtes Windows Server 2016 à 2025 (autonomes ; les machines virtuelles en cluster suivent une procédure distincte), machines virtuelles de génération 1 ou 2, invités Windows Server 2016 / Windows 10 ou ultérieur.

Prérequis : droits d'administrateur sur l'hôte, matériel de classe serveur avec contrôle PCI Express natif et un complexe racine PCIe qui prend en charge Access Control Services (le microprogramme peut l'appeler « Enable SR-IOV »), et le script `SurveyDDA.ps1` pour lister les appareils attribuables, leur **chemin d'emplacement** et leurs besoins MMIO. Tant qu'un appareil est attribué, la machine virtuelle perd l'**enregistrement/restauration**, la **migration dynamique**, la **mémoire dynamique** et l'**ajout à un cluster haute disponibilité**.

```powershell
# 1. Prepare the VM (off)
Set-VM -Name VM1 -AutomaticStopAction TurnOff
Set-VM -Name VM1 -GuestControlledCacheTypes $true -LowMemoryMappedIoSpace 3GB -HighMemoryMappedIoSpace 33280MB

# 2. Remove the device from the host
$dev = Get-PnpDevice -PresentOnly | Where-Object { $_.Class -eq "Display" -and $_.Manufacturer -like "NVIDIA*" }
$path = ($dev | Get-PnpDeviceProperty DEVPKEY_Device_LocationPaths).Data[0]
Disable-PnpDevice -InstanceId $dev.InstanceId -Confirm:$false
Dismount-VMHostAssignableDevice -LocationPath $path -Force

# 3. Assign it, start the VM, install the vendor driver in the guest
Add-VMAssignableDevice -LocationPath $path -VMName VM1

# Give it back to the host (VM off)
Remove-VMAssignableDevice -LocationPath $path -VMName VM1
Mount-VMHostAssignableDevice -LocationPath $path
```

L'espace MMIO est par défaut de 128 Mo en bas et 512 Mo en haut par machine virtuelle ; les GPU demandent en général plus de MMIO haut. `-Force` sur `Dismount-VMHostAssignableDevice` est nécessaire quand le fabricant ne fournit pas de pilote d'atténuation de l'appareil ; cela affaiblit l'isolation, réservez donc DDA aux locataires de confiance.

> **Piège d'examen.** L'ordre compte : réglez `AutomaticStopAction` sur `TurnOff`, désactivez l'appareil sur l'hôte, **démontez-le** de l'hôte, puis ajoutez-le à la machine virtuelle. Ajouter un appareil encore monté sur l'hôte échoue.

<!-- section: gpu-partitioning | objectives: 3.1.7 -->
## Partitionnement GPU

Le partitionnement GPU (GPU-P) partage un GPU physique entre plusieurs machines virtuelles : SR-IOV donne à chacune une **fraction dédiée** du GPU (VRAM, encodeurs, décodeurs, calcul) derrière une frontière de sécurité matérielle.

| | Attribution discrète d'appareil | Partitionnement GPU |
| --- | --- | --- |
| Machines virtuelles par GPU | Une machine virtuelle reçoit tout le GPU | Plusieurs machines virtuelles, une partition chacune |
| Mode du GPU | DDA | Partitionnable (un GPU est l'un ou l'autre, pas les deux) |
| Système de l'hôte | Windows Server 2016 à 2025 | **Windows Server 2025** |
| Migration dynamique | Non | Oui sur Windows Server 2025 avec des processeurs IOMMU à suivi des bits DMA (elle bascule sur TCP/IP avec compression) |
| GPU pris en charge | Davantage de modèles | Une courte liste de GPU de centre de données : NVIDIA séries A et L, NVIDIA RTX Pro 6000 Blackwell Server Edition, AMD Radeon PRO V710 |

Prérequis : SR-IOV et la virtualisation activés dans le BIOS, IOMMU (Intel VT-d ou AMD-Vi), le pilote hôte du fabricant du GPU (logiciel NVIDIA vGPU), le pilote invité dans chaque machine virtuelle. Invités : Windows 10 ou ultérieur, Windows Server 2019 ou ultérieur, Ubuntu 18.04/20.04/22.04 LTS. Les clusters (basculement pour les arrêts non planifiés) demandent **Windows Server 2025 Datacenter** et des GPU identiques (marque, modèle, taille, nombre de partitions) sur chaque nœud.

Limites : **une partition par machine virtuelle** ; la machine virtuelle et sa partition restent sur le même hôte ; les partitions sont attribuées automatiquement (impossible de choisir laquelle).

```powershell
Get-VMHostPartitionableGpu | Select-Object Name
Set-VMHostPartitionableGpu -Name "<gpu-name>" -PartitionCount 4
Add-VMGpuPartitionAdapter -VMName VM1 -InstancePath "<gpu-name>"   # VM off
Get-VMGpuPartitionAdapter -VMName VM1
Remove-VMGpuPartitionAdapter -VMName VM1
```

Windows Admin Center (extension GPUs) est l'outil recommandé : il vérifie l'homogénéité des GPU, définit le nombre de partitions, et arrête puis redémarre la machine virtuelle pour attribuer une partition.

> **Conseil d'examen.** « Dix machines virtuelles VDI ont besoin d'accélération GPU, il y a deux GPU, et les machines virtuelles doivent migrer à chaud entre des hôtes Windows Server 2025 » signifie partitionnement GPU. « Une machine virtuelle a besoin de toute la puissance d'un GPU » signifie DDA.

<!-- section: checkpoints | objectives: 3.1.8 -->
## Points de contrôle de machine virtuelle

Un point de contrôle capture une machine virtuelle à un instant donné. Les modifications de ses disques vont dans un disque de différenciation, un fichier **`.avhdx`** à côté du `.vhdx`.

| Type | Comment | État de la mémoire | Après application |
| --- | --- | --- | --- |
| **Production** (par défaut pour les nouvelles machines virtuelles) | VSS dans les invités Windows, gel du système de fichiers dans les invités Linux : cohérent avec les applications, comme une sauvegarde | Non capturé | La machine virtuelle est **arrêtée** ; démarrez-la |
| Standard | Enregistre les disques **et la mémoire** (état enregistré) | Capturé | La machine virtuelle reprend exactement où elle en était, applications ouvertes |

Valeurs de `Set-VM -CheckpointType` :

| Valeur | Comportement |
| --- | --- |
| `Production` | Point de contrôle de production ; bascule sur un point de contrôle standard si l'invité ne peut pas en créer un |
| `ProductionOnly` | Point de contrôle de production ; l'opération **échoue** si l'invité ne peut pas en créer un |
| `Standard` | Point de contrôle standard |
| `Disabled` | Aucun point de contrôle |

```powershell
Set-VM -Name VM1 -CheckpointType ProductionOnly
Checkpoint-VM -Name VM1 -SnapshotName "Before KB update"
Get-VMSnapshot -VMName VM1
Restore-VMSnapshot -VMName VM1 -Name "Before KB update" -Confirm:$false
Remove-VMSnapshot -VMName VM1 -Name "Before KB update"     # merges the .avhdx into the parent
Set-VM -Name VM1 -AutomaticCheckpointsEnabled $false
```

« Checkpoint » et « snapshot » sont interchangeables dans le module (`Get-VMCheckpoint`, `Restore-VMCheckpoint` sont des alias).

Règles :

- **Appliquer** propose *Créer un point de contrôle et appliquer* (garde l'état actuel comme nouveau point de contrôle) ou *Appliquer* (l'état actuel est perdu).
- **Supprimer** un point de contrôle depuis le Gestionnaire Hyper-V ou PowerShell : Hyper-V fusionne le `.avhdx` dans son parent. Ne supprimez jamais les fichiers `.avhdx` à la main. *Supprimer la sous-arborescence de points de contrôle* supprime un point de contrôle et ses enfants.
- Les points de contrôle ne sont pas des sauvegardes : ils se trouvent sur le stockage de la machine virtuelle, et de longues chaînes de `.avhdx` coûtent en performances et en espace.

> **Piège d'examen.** Les points de contrôle standard peuvent causer des problèmes de cohérence des données avec les systèmes qui répliquent entre nœuds, comme les contrôleurs de domaine Active Directory ; utilisez des points de contrôle de production (ou de vraies sauvegardes). « Appliquer le point de contrôle doit restaurer les applications ouvertes » exige un point de contrôle **standard** ; les points de contrôle de production ne capturent jamais la mémoire.

<!-- section: key-points -->
## Points clés

- Mode de session amélioré : stratégie de l'hôte + paramètre utilisateur + Services Bureau à distance dans l'invité Windows ; aucun réseau nécessaire.
- PowerShell Direct : `-VMName`, hôte local uniquement, machine virtuelle en cours d'exécution, informations d'identification de l'invité ; `hvc ssh` pour les invités Linux.
- Virtualisation imbriquée : machine virtuelle arrêtée, `Set-VMProcessor -ExposeVirtualizationExtensions $true`, usurpation d'adresses MAC ; AMD demande Windows Server 2022 et la version 9.3.
- Mémoire dynamique : démarrage, minimum, maximum, tampon, poids ; activation ou désactivation seulement machine virtuelle arrêtée ; redimensionnement à chaud pour la mémoire statique.
- Guest Service Interface est désactivé par défaut et nécessaire à `Copy-VMFile` ; VSS permet les points de contrôle de production.
- DDA : un GPU ou un appareil NVMe entier pour une machine virtuelle, démonté de l'hôte d'abord, pas de migration dynamique. GPU-P : Windows Server 2025, une partition par machine virtuelle, migration dynamique.
- Points de contrôle de production (par défaut) : VSS, pas de mémoire, machine virtuelle arrêtée après application ; `ProductionOnly` échoue au lieu de basculer.
