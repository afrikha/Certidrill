Une machine virtuelle Windows Server dans Azure se gère par Azure Resource Manager, pas seulement depuis l'invité : disques, taille, placement, accès d'administration et adresses IP sont des propriétés de ressources Azure. Les questions tiennent souvent à un détail : la machine virtuelle doit-elle être libérée, quelle référence SKU ou quelle option faut-il, où faut-il faire le réglage (dans Azure ou dans le système d'exploitation invité) ?

<!-- section: vm-storage | objectives: 3.2.1 -->
## Gérer le stockage des machines virtuelles Windows Server dans Azure

Une machine virtuelle a trois sortes de disques :

| Disque | Rôle | Persistance |
| --- | --- | --- |
| Disque du système d'exploitation (C:) | Volume de démarrage, disque managé. 4 095 Gio au maximum, mais une partition MBR n'en utilise que 2 Tio | Persistant |
| Disques de données | Disques managés présentés comme lecteurs SCSI, avec un LUN ; leur nombre dépend de la taille de la machine virtuelle | Persistant |
| Disque temporaire (D: par défaut) | Local, pas un disque managé : fichier d'échange, tempdb | Perdu lors d'une maintenance, d'un redéploiement ou d'un arrêt (libération) ; conservé lors d'un redémarrage normal |

| Type | Taille max. | IOPS max. | Disque du système d'exploitation |
| --- | --- | --- | --- |
| Disque Ultra | 65 536 Gio | 400 000 | Non |
| SSD Premium v2 | 65 536 Gio | 80 000 | Non |
| SSD Premium | 32 767 Gio | 20 000 | Oui |
| SSD Standard | 32 767 Gio | 6 000 | Oui |
| HDD Standard | 32 767 Gio | 2 000 ou 3 000 | Oui, mise hors service le 8 septembre 2028 |

Le SSD Premium exige une taille de machine virtuelle qui prend en charge le stockage Premium. Les disques Ultra et SSD Premium v2 permettent de modifier les IOPS et le débit indépendamment de la taille ; un SSD Premium tire ses performances de sa taille, ou d'un **niveau de performance** que vous relevez temporairement.

```powershell
# Create an empty data disk and attach it at LUN 1
$diskConfig = New-AzDiskConfig -SkuName Premium_LRS -Location westeurope `
  -CreateOption Empty -DiskSizeGB 128
$disk = New-AzDisk -ResourceGroupName RG1 -DiskName VM1-data1 -Disk $diskConfig
$vm = Get-AzVM -ResourceGroupName RG1 -Name VM1
$vm = Add-AzVMDataDisk -VM $vm -Name VM1-data1 -CreateOption Attach `
  -ManagedDiskId $disk.Id -Lun 1
Update-AzVM -ResourceGroupName RG1 -VM $vm
```

Initialisez ensuite le disque dans l'invité (Gestion des disques ou `Initialize-Disk`) : GPT est obligatoire à partir de 2 Tio.

| Opération | État requis de la machine virtuelle |
| --- | --- |
| Attacher ou détacher un disque de données | En cours d'exécution, c'est possible |
| Agrandir un disque du système d'exploitation | Libérée |
| Agrandir un disque de données | En cours d'exécution pour les disques de données éligibles ; libérée sinon. Un HDD Standard, SSD Standard ou SSD Premium de 4 Tio ou moins doit être libéré et **détaché** pour dépasser 4 Tio (ne s'applique pas aux disques Ultra et SSD Premium v2) |
| Réduire un disque | Non pris en charge |
| Changer le type (HDD Standard, SSD Standard, SSD Premium) | Libérée ; deux fois par jour au maximum |

```powershell
Stop-AzVM -ResourceGroupName RG1 -Name VM1 -Force
$disk = Get-AzDisk -ResourceGroupName RG1 -DiskName VM1-os
$disk.DiskSizeGB = 256
Update-AzDisk -ResourceGroupName RG1 -DiskName VM1-os -Disk $disk
Start-AzVM -ResourceGroupName RG1 -Name VM1
```

Après l'opération dans Azure, étendez le volume dans Windows : **Gestion des disques > Étendre le volume**, ou DiskPart (`select volume`, `extend`).

> **Piège d'examen.** Agrandir le disque managé ne modifie pas le volume C: ou F:. La dernière étape a toujours lieu dans l'invité. Et un disque du système d'exploitation de plus de 2 Tio n'offre toujours que 2 Tio utilisables s'il est en MBR.

Autres options de stockage : les **disques partagés** (plusieurs machines virtuelles attachent un même disque managé ; il faut un gestionnaire de cluster comme le clustering de basculement Windows Server, qui arbitre l'accès par réservations persistantes SCSI), les **instantanés** (copie en lecture seule, cohérente en cas d'incident, d'un disque) et les **images** (tous les disques d'une machine virtuelle généralisée).

<!-- section: capacity | objectives: 3.2.2 -->
## Gérer la capacité : redimensionnement et groupes de machines virtuelles identiques

Le redimensionnement change la taille de la machine virtuelle (processeurs virtuels, mémoire, nombre maximal de disques et de cartes réseau).

- Une machine virtuelle en cours d'exécution **redémarre** quand on la redimensionne. Si la taille cible n'est pas disponible sur le cluster matériel qui l'héberge, il faut d'abord la libérer.
- Dans un **groupe à haute disponibilité**, si la nouvelle taille n'est pas disponible sur le cluster actuel, libérez **toutes** les machines virtuelles du groupe, redimensionnez, puis démarrez-les.
- Machines virtuelles Windows : redimensionnez seulement entre tailles qui ont toutes deux un disque temporaire local, ou n'en ont aucune. Une machine virtuelle basée sur SCSI ne peut pas passer directement à une taille dotée d'un contrôleur de disque NVMe distant.

```powershell
Get-AzVMSize -ResourceGroupName RG1 -VMName VM1
$vm = Get-AzVM -ResourceGroupName RG1 -Name VM1
$vm.HardwareProfile.VmSize = "Standard_D4s_v5"
Update-AzVM -ResourceGroupName RG1 -VM $vm
```

```bash
az vm list-vm-resize-options --resource-group RG1 --name VM1 --output table
az vm resize --resource-group RG1 --name VM1 --size Standard_D4s_v5
```

Les **groupes de machines virtuelles identiques** (Virtual Machine Scale Sets) gèrent un ensemble de machines virtuelles à charge équilibrée dont le nombre varie selon la demande ou un calendrier.

| | Orchestration flexible | Orchestration uniforme |
| --- | --- | --- |
| Instances | Machines virtuelles standard avec contrôle complet des machines, cartes réseau et disques ; Windows et Linux mélangeables | Instances identiques issues d'un même modèle |
| Nombre maximal d'instances (avec garanties de domaines d'erreur) | 1 000 | 100 |
| Ajouter une machine virtuelle existante au groupe | Oui | Non |
| Instances Spot et standard mélangées | Oui | Non |
| Placer une machine virtuelle dans une zone ou un domaine d'erreur précis | Oui | Non |
| Recommandé pour | Les nouveaux déploiements ; le remplaçant des groupes à haute disponibilité | Les grands parcs sans état, Service Fabric, AKS |

La mise à l'échelle automatique (Azure Monitor) repose sur un profil et des règles :

| Élément | Signification |
| --- | --- |
| Minimum / maximum / par défaut | Bornes du nombre d'instances, et nombre par défaut |
| Règle de scale-out | Exemple : Percentage CPU supérieur à 70 % en moyenne, augmenter le nombre |
| Règle de scale-in | Exemple : Percentage CPU inférieur à 30 %, diminuer le nombre. Toujours l'associer à une règle de scale-out |
| Durée | Période sur laquelle la métrique est moyennée (10 minutes dans la règle par défaut du portail) |
| Refroidissement | Attente avant l'action de mise à l'échelle suivante (5 minutes par défaut) |
| Stratégie de scale-in | Quelles instances sont supprimées : Default (équilibre entre zones, puis domaines d'erreur, puis ID d'instance le plus élevé), NewestVM ou OldestVM |

```bash
az vmss scale --resource-group RG1 --name VMSS1 --new-capacity 5
az monitor autoscale create --resource-group RG1 --resource VMSS1 \
  --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name autoscale1 --min-count 2 --max-count 10 --count 2
az monitor autoscale rule create --resource-group RG1 --autoscale-name autoscale1 \
  --condition "Percentage CPU > 70 avg 5m" --scale out 2
az monitor autoscale rule create --resource-group RG1 --autoscale-name autoscale1 \
  --condition "Percentage CPU < 30 avg 5m" --scale in 1
```

> **Piège d'examen.** Le redimensionnement (scale-up) change la taille d'une machine virtuelle et la redémarre ; un groupe identique ajoute ou retire des instances (scale-out) sans changer leur taille. « Absorber plus d'utilisateurs aux heures ouvrées sans interruption » désigne un groupe identique avec mise à l'échelle automatique, pas une taille plus grande.

<!-- section: availability | objectives: 3.2.3 -->
## Gérer les groupes à haute disponibilité et les zones de disponibilité

| | Groupe à haute disponibilité | Zones de disponibilité |
| --- | --- | --- |
| Protège contre | Une panne de matériel, de rack, d'alimentation ou de commutateur réseau dans un centre de données | La perte d'un centre de données entier (alimentation, refroidissement, réseau) dans la région |
| Comment | Domaines d'erreur (jusqu'à 3) et domaines de mise à jour (jusqu'à 20, 5 par défaut) | Machines virtuelles placées dans les zones 1, 2 ou 3 (zonales), avec des ressources redondantes interzone ou zonales |
| SLA pour deux machines virtuelles ou plus | 99,95 % | 99,99 % |
| Latence entre machines virtuelles | Plus faible | Plus élevée |
| Choix | À la création uniquement | À la création (zone d'une machine virtuelle) |

Règles à retenir :

- Une machine virtuelle n'est ajoutée à un groupe à haute disponibilité qu'**à sa création**. Pour en changer, supprimez la machine virtuelle (avec ses disques en mode détacher) et recréez-la à partir des disques existants.
- Les nombres de domaines d'erreur et de mise à jour ne changent plus après la création du groupe. Avec cinq domaines de mise à jour, la sixième machine virtuelle partage le domaine de mise à jour de la première. Pendant une maintenance planifiée, un seul domaine de mise à jour redémarre à la fois, avec 30 minutes pour se rétablir.
- Les disques managés d'une machine virtuelle sont alignés sur son domaine d'erreur ; une région compte deux ou trois domaines d'erreur de disques managés. Seules les machines virtuelles à disques managés peuvent rejoindre un groupe à haute disponibilité managé.
- Groupe à haute disponibilité et zones s'excluent pour une machine virtuelle. Les groupes à haute disponibilité ne prennent pas en charge les disques Ultra.
- Microsoft recommande les groupes de machines virtuelles identiques en orchestration flexible pour les nouveaux déploiements : ils répartissent les instances entre domaines d'erreur ou zones.
- Un groupe à haute disponibilité ne protège pas contre une panne du système d'exploitation ou de l'application ; il faut toujours deux machines virtuelles ou plus derrière un équilibreur de charge.

```powershell
New-AzAvailabilitySet -ResourceGroupName RG1 -Name AS-Web -Location westeurope `
  -Sku Aligned -PlatformFaultDomainCount 2 -PlatformUpdateDomainCount 5
```

> **Piège d'examen.** « Se protéger contre la panne d'un centre de données » = zones de disponibilité. « La région n'a pas de zones de disponibilité » ou « latence la plus faible entre les machines virtuelles » = groupe à haute disponibilité. Aucun des deux ne se choisit une fois la machine virtuelle créée.

<!-- section: jit-bastion | objectives: 3.2.4 -->
## Gérer l'accès juste-à-temps aux machines virtuelles et Azure Bastion

L'**accès juste-à-temps (JIT) aux machines virtuelles** garde les ports d'administration fermés jusqu'à ce qu'une demande approuvée les ouvre pour une adresse IP source et une durée limitée.

| Élément | Détail |
| --- | --- |
| Prérequis | Microsoft Defender pour les serveurs **Plan 2** sur l'abonnement ; un groupe de sécurité réseau ou un Pare-feu Azure (règles classiques, pas de stratégies Firewall Manager) devant la machine virtuelle ; machines virtuelles Azure Resource Manager |
| À l'activation | Defender pour le cloud ajoute des règles *refuser tout le trafic entrant* pour les ports choisis (par défaut 3389 pour Windows, 22 pour Linux ; 5985 et 5986 pour WinRM sont suggérés) |
| Par port | Protocole, adresses IP sources autorisées (par défaut toutes), durée maximale de la demande (3 heures par défaut) |
| À la demande | Règles d'autorisation pour l'adresse IP du demandeur et les ports demandés, pendant la durée demandée ; les règles sont ensuite restaurées. Les connexions établies ne sont pas coupées |
| Où | Defender pour le cloud > **Protections de charge de travail** > **Accès juste-à-temps aux machines virtuelles**, ou la page **Configuration** de la machine virtuelle ; la demande se fait depuis la page **Se connecter** de la machine virtuelle |
| Autorisations pour demander | `Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action` plus la lecture de la machine virtuelle et des ressources réseau |

```powershell
$JitPolicy = (@{
    id="/subscriptions/<sub-id>/resourceGroups/RG1/providers/Microsoft.Compute/virtualMachines/VM1";
    ports=(@{ number=3389; protocol="*"; allowedSourceAddressPrefix=@("*"); maxRequestAccessDuration="PT3H"})})
Set-AzJitNetworkAccessPolicy -Kind "Basic" -Location "westeurope" -Name "default" `
  -ResourceGroupName "RG1" -VirtualMachine @($JitPolicy)
```

**Azure Bastion** fournit RDP et SSH sur TLS depuis le portail ou un client natif, sans adresse IP publique sur la machine virtuelle.

| Fonctionnalité | Developer | Basic | Standard | Premium |
| --- | --- | --- | --- | --- |
| Sous-réseau AzureBastionSubnet dédié et adresse IP publique | Non | Oui | Oui | Sous-réseau oui ; pas d'adresse IP publique en déploiement privé uniquement |
| Machines virtuelles de réseaux virtuels appairés | Non | Oui | Oui | Oui |
| Client natif (`az network bastion rdp`), transfert de fichiers | Non | Non | Oui | Oui |
| Lien partageable, connexion par adresse IP, port personnalisé | Non | Non | Oui | Oui |
| Mise à l'échelle de l'hôte | Non | Non (2 instances) | 2 à 50 instances | 2 à 50 instances |
| Enregistrement de session, déploiement privé uniquement | Non | Non | Non | Oui |

- Le sous-réseau doit s'appeler **AzureBastionSubnet**, en /26 ou plus grand, dans le réseau virtuel de l'hôte. L'adresse IP publique est de référence SKU Standard, statique.
- On peut passer à une référence SKU supérieure, jamais revenir à une inférieure.
- Pour se connecter, un utilisateur a besoin du rôle Reader sur la machine virtuelle, sur sa carte réseau et sur la ressource Bastion (plus le réseau virtuel de la machine quand Bastion est dans un réseau appairé), et du droit d'ouvrir une session Windows (Utilisateurs du Bureau à distance ou Administrateurs). La machine virtuelle n'a besoin d'aucune adresse IP publique.

```bash
az network bastion rdp --name Bastion1 --resource-group RG1 \
  --target-resource-id "/subscriptions/<sub-id>/resourceGroups/RG1/providers/Microsoft.Compute/virtualMachines/VM1"
```

> **Piège d'examen.** « Se connecter avec le client Bureau à distance local via Bastion » exige Standard ou Premium (client natif), et « garder l'hôte Bastion sans aucune adresse IP publique » exige Premium (déploiement privé uniquement).

<!-- section: vm-network | objectives: 3.2.5 -->
## Gérer la configuration réseau des machines virtuelles Azure

Une machine virtuelle se connecte par une ou plusieurs **interfaces réseau** (NIC). Chaque interface a une configuration IP principale (IPv4 privée, adresse IP publique facultative) et des configurations IP secondaires facultatives.

| Tâche | Règle |
| --- | --- |
| Donner une adresse IP privée fixe à une machine virtuelle | Passez la configuration IP de l'interface réseau en **Statique** dans Azure. Ne définissez jamais l'adresse à la main dans Windows, sauf les adresses secondaires que vous ajoutez dans l'invité |
| Plage d'adresses | Toute adresse du sous-réseau sauf les cinq réservées par Azure (réseau, passerelle `.1`, mappage DNS `.2` et `.3`, diffusion) |
| Ajouter une deuxième interface réseau | Libérez la machine virtuelle, ajoutez l'interface, démarrez la machine virtuelle. Toutes les interfaces sont dans le **même réseau virtuel** (sous-réseaux différents possibles) ; la taille de la machine virtuelle limite leur nombre ; une interface est principale |
| Déplacer une interface réseau | Elle peut changer de sous-réseau, jamais de réseau virtuel ; interface, réseau virtuel et machine virtuelle partagent abonnement et région |
| Supprimer une interface réseau | Seulement si elle n'est attachée à aucune machine virtuelle |
| Mise en réseau accélérée (SR-IOV) | Tailles et images prises en charge ; activez-la seulement quand la machine virtuelle est arrêtée (libérée) |
| Filtrer le trafic | Groupe de sécurité réseau sur l'interface et/ou le sous-réseau ; vérifiez les **Règles de sécurité effectives** de l'interface |
| Serveurs DNS | Hérités du réseau virtuel ou personnalisés par interface (remplacent ceux du réseau virtuel). Lancez `ipconfig /renew` ou redémarrez la machine virtuelle après un changement |
| Servir de routeur ou de pare-feu | Activez le **transfert IP** sur l'interface, et le routage dans l'invité |

```bash
# Static private IP and custom DNS on a NIC
az network nic ip-config update --resource-group RG1 --nic-name vm1-nic \
  --name ipconfig1 --private-ip-address 10.0.1.10
az network nic update --resource-group RG1 --name vm1-nic --dns-servers 10.0.1.4 10.0.1.5
az network nic update --resource-group RG1 --name nva1-nic --ip-forwarding true

# Add a second NIC to a deallocated VM
az vm deallocate --resource-group RG1 --name VM1
az vm nic add --resource-group RG1 --vm-name VM1 --nics vm1-nic2
az vm start --resource-group RG1 --name VM1
```

Avec plusieurs interfaces réseau, Windows ne reçoit une passerelle par défaut que sur l'interface principale : ajoutez des itinéraires dans l'invité pour le trafic qui doit sortir par une interface secondaire.

> **Piège d'examen.** Une adresse IP statique saisie dans les paramètres réseau de Windows d'une machine virtuelle Azure coupe la connectivité si elle ne correspond pas à l'interface réseau. Configurez l'allocation statique sur l'interface Azure et laissez Windows en DHCP.

<!-- section: key-points -->
## Points clés

- Le disque temporaire D: est perdu quand la machine virtuelle est libérée ou redéployée ; disque du système d'exploitation jusqu'à 4 095 Gio mais 2 Tio utilisables en MBR.
- Agrandir un disque du système d'exploitation machine libérée, puis étendre le volume dans Windows ; pas de réduction ; changement de type machine libérée, deux fois par jour.
- Le redimensionnement redémarre la machine virtuelle ; libérez-la si la taille n'est pas disponible sur le cluster (toutes les machines d'un groupe à haute disponibilité).
- Groupes identiques flexibles : instances mixtes, machines existantes, zones ; mise à l'échelle automatique = min/max/par défaut + règles appariées + refroidissement.
- Groupe à haute disponibilité 99,95 % (domaines d'erreur, domaines de mise à jour) contre zones 99,99 % ; choisis à la création.
- JIT = Defender pour les serveurs Plan 2 + groupe de sécurité réseau ou Pare-feu Azure ; Bastion = AzureBastionSubnet /26, client natif à partir de Standard, déploiement privé uniquement en Premium.
- Adresse IP statique, interfaces supplémentaires, mise en réseau accélérée et serveurs DNS se configurent sur l'interface réseau Azure, pas dans l'invité.
