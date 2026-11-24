Les machines virtuelles sont le service de calcul le plus configurable d'Azure, et les questions d'examen entrent dans le détail : tailles, disques, chiffrement, disponibilité et groupes identiques.

<!-- section: create-vm | objectives: 3.2.1 -->
## Créer une machine virtuelle

Une machine virtuelle est un ensemble de ressources : la machine elle-même, un **disque de système d'exploitation**, une **interface réseau** dans un sous-réseau d'un réseau virtuel et, en option, une adresse IP publique, un groupe de sécurité réseau et des disques de données. La machine et son réseau virtuel doivent être dans la **même région et le même abonnement** ; le réseau peut être dans un autre groupe de ressources.

Choix à la création : région et option de disponibilité, **image** (Marketplace ou la vôtre, depuis une galerie Azure Compute Gallery), **taille**, compte administrateur (mot de passe, ou clé publique SSH pour Linux), disques, réseau, options de gestion (identité managée, arrêt automatique, sauvegarde, diagnostics de démarrage).

```bash
az vm create -g RG1 -n VM1 --image Ubuntu2204 --size Standard_D2s_v5 \
  --admin-username azureuser --generate-ssh-keys \
  --vnet-name VNet1 --subnet Subnet1 --zone 2 --public-ip-sku Standard
```

```powershell
New-AzVM -ResourceGroupName RG1 -Name VM1 -Location westeurope -Image Win2022Datacenter `
  -Size Standard_D2s_v5 -VirtualNetworkName VNet1 -SubnetName Subnet1 -Credential (Get-Credential)
```

**États d'alimentation et facturation :**

| État | Comment on y arrive | Calcul facturé |
| --- | --- | --- |
| En cours d'exécution | Démarrer | Oui |
| Arrêtée | Arrêt depuis le système d'exploitation | **Oui** : le matériel reste alloué |
| Arrêtée (libérée) | *Arrêter* dans le portail, `az vm deallocate`, `Stop-AzVM` | Non. Les disques restent facturés. Le contenu du disque temporaire est perdu |

**Connexion :** RDP (TCP 3389) pour Windows, SSH (TCP 22) pour Linux, par une adresse IP publique, un VPN ou **Azure Bastion** (aucune IP publique sur la machine). Se connecter avec Microsoft Entra ID demande le rôle *Virtual Machine Administrator Login* ou *Virtual Machine User Login*.

**Configuration après la création :**

| Mécanisme | Usage |
| --- | --- |
| **Extension de script personnalisé** (Custom Script Extension) | Télécharge et exécute un script (depuis un compte de stockage ou GitHub) pendant ou après le déploiement. Une exécution de 90 minutes au plus ; les secrets vont dans les *paramètres protégés* ; elle peut lire des objets blob privés avec l'identité managée de la machine |
| **cloud-init** | Configuration au premier démarrage des machines Linux (`--custom-data`) |
| Extension **Desired State Configuration** | Maintient une configuration Windows dans l'état voulu |
| **Exécuter la commande** (Run Command) | Exécute un script sur une machine en marche par l'agent Azure, même sans accès réseau à celle-ci |

Les **machines virtuelles Spot** utilisent la capacité inutilisée avec une forte remise, sans contrat SLA : Azure peut les évincer à tout moment avec un préavis de 30 secondes. Stratégie d'éviction **Deallocate** (par défaut : la machine est arrêtée, les disques sont conservés et facturés) ou **Delete** (machine et disques supprimés).

Autres points : les **diagnostics de démarrage** montrent une capture d'écran et le journal série d'une machine qui ne démarre pas ; le **redéploiement** déplace la machine vers un autre hôte (corrige les problèmes d'hôte ; le disque temporaire est perdu) ; **Azure Hybrid Benefit** réutilise des licences Windows Server.

<!-- section: disk-encryption | objectives: 3.2.2 -->
## Chiffrement des disques

| Option | Où se fait le chiffrement | Couvre | Clé |
| --- | --- | --- | --- |
| **Chiffrement côté serveur** (SSE) avec clés gérées par la plateforme | Service de stockage | Disques de système d'exploitation et de données au repos. **Toujours actif** | Microsoft |
| SSE avec **clés gérées par le client** | Service de stockage | Idem | Votre clé dans Key Vault, par un **jeu de chiffrement de disque** (disk encryption set) |
| **Chiffrement sur l'hôte** (encryption at host) | Le serveur hôte de la machine | Aussi le **disque temporaire et les caches de disque**, et le flux de données vers le stockage | Plateforme ou client |
| **Azure Disk Encryption** (ADE) | Dans l'invité : **BitLocker** (Windows) ou **DM-Crypt** (Linux) | Volumes de système d'exploitation et de données | Secrets dans **Azure Key Vault** |
| Chiffrement de disque confidentiel | Lié au TPM de la machine | Machines virtuelles confidentielles | Plateforme ou client |

Exigences d'Azure Disk Encryption, le classique de l'examen :

- Un coffre de clés dans la **même région et le même abonnement** que la machine virtuelle, avec la stratégie d'accès **Azure Disk Encryption pour le chiffrement de volume** activée (`EnabledForDiskEncryption`).
- Une taille prise en charge : pas Basic ni série A, pas les tailles de série v6 avec disque temporaire (Ddsv6, Edsv6...), pas les tailles de série v7 ou plus récentes, pas la famille L, et au moins 2 Go de mémoire. Les disques Ultra et les disques SSD Premium v2 ne peuvent pas être chiffrés par ADE.
- La machine doit être **en cours d'exécution** : l'extension chiffre les volumes depuis l'intérieur de l'invité.
- Sous Windows, chiffrez le disque de système d'exploitation avant les disques de données, ou en même temps.

```powershell
Set-AzVMDiskEncryptionExtension -ResourceGroupName RG1 -VMName VM1 `
  -DiskEncryptionKeyVaultUrl $kv.VaultUri -DiskEncryptionKeyVaultId $kv.ResourceId
```

```bash
az vm encryption enable -g RG1 -n VM1 --disk-encryption-keyvault kv1 --volume-type All
```

Le disque temporaire est chiffré automatiquement sur les tailles de version 5 et ultérieures (Dsv5, Dsv6...) ; sur les tailles plus anciennes, seuls le chiffrement sur l'hôte, ou ADE avec le type de volume `All` (`EncryptFormatAll` sous Linux), le chiffrent.

Chiffrement sur l'hôte : inscrivez la fonctionnalité `EncryptionAtHost` sur l'abonnement, puis activez-la à la création, ou sur une machine existante après l'avoir **libérée**. Il ne se combine pas avec Azure Disk Encryption sur la même machine.

> **Piège d'examen.** Le retrait d'Azure Disk Encryption est prévu le 15 septembre 2028, et Microsoft recommande le chiffrement sur l'hôte pour les nouveaux déploiements. Il reste dans les objectifs de l'examen : connaissez les deux.

<!-- section: move-vm | objectives: 3.2.3 -->
## Déplacer une machine virtuelle

| Déplacement vers | Comment | Remarques |
| --- | --- | --- |
| Un autre **groupe de ressources** | Opération de déplacement (portail, `az resource move`, `Move-AzResource`) | Sans interruption ; l'ID de ressource change ; déplacez la machine avec ses disques et son interface réseau |
| Un autre **abonnement** | Même opération | Même locataire ; toutes les ressources dépendantes dans un seul groupe de ressources et déplacées ensemble ; le réseau virtuel doit suivre, avec tout ce qui y est attaché. Impossible tant qu'Azure Disk Encryption est activé ; les machines avec plans Marketplace et quelques autres ont des restrictions |
| Une autre **région** | **Azure Resource Mover** (ou Azure Site Recovery) | La machine est répliquée, puis recréée dans la région cible |
| Une autre **zone de disponibilité** | Déplacement depuis le portail (de régional à zonal), ou recréation à partir d'instantanés | |

Étapes d'Azure Resource Mover : ajouter les ressources à une **collection de déplacement** pour un couple région source et région de destination ; **résoudre les dépendances** ; **préparer** (la réplication démarre) ; **lancer le déplacement** (les ressources sont créées dans la région cible) ; **valider** (commit), ou **abandonner** avant de valider ; enfin **supprimer vous-même les ressources sources**.

Un déplacement de groupe de ressources ne change jamais la région d'une ressource.

<!-- section: vm-sizes | objectives: 3.2.4 -->
## Tailles des machines virtuelles

| Famille | Type | Charge type |
| --- | --- | --- |
| B | Burstable (à pics) | Faible usage moyen du processeur : serveurs de test, petits sites web |
| D | Usage général | La plupart des applications, processeur et mémoire équilibrés |
| F | Optimisée pour le calcul | Rapport processeur/mémoire élevé : traitements par lots, serveurs d'applications |
| E, M | Optimisée pour la mémoire | Bases de données, caches en mémoire |
| L | Optimisée pour le stockage | Débit disque et IOPS élevés |
| N | GPU | Rendu, apprentissage automatique |
| H | Calcul haute performance | Simulation |

Lire un nom de taille, par exemple `Standard_E16ads_v5` : famille **E**, **16** processeurs virtuels, **a** = processeur AMD, **d** = disque temporaire local, **s** = prend en charge le **stockage Premium**, **v5** = génération. Sans le `s`, on ne peut pas attacher de disques SSD Premium.

Redimensionnement :

- Changer de taille **redémarre** la machine.
- Une machine en marche ne peut prendre qu'une taille disponible sur son cluster matériel actuel. Si la taille n'est pas proposée, **libérez** d'abord la machine : toutes les tailles de la région deviennent disponibles.
- Dans un **groupe à haute disponibilité**, quand la nouvelle taille n'est pas disponible sur le cluster, **toutes les machines du groupe** doivent être libérées avant le redimensionnement.
- Les quotas (processeurs virtuels par famille et total régional) peuvent bloquer un redimensionnement. Ils comptent aussi les machines **libérées** : libérer une machine ne libère aucun quota.
- Sous Windows, une taille avec disque temporaire local ne peut passer qu'à une autre taille avec disque temporaire, et une taille sans disque temporaire qu'à une taille sans. Les machines Linux peuvent passer de l'une à l'autre.

```bash
az vm list-vm-resize-options -g RG1 -n VM1 --output table
az vm deallocate -g RG1 -n VM1
az vm resize -g RG1 -n VM1 --size Standard_E4s_v5
az vm start -g RG1 -n VM1
```

```powershell
Get-AzVMSize -ResourceGroupName RG1 -VMName VM1
$vm = Get-AzVM -ResourceGroupName RG1 -Name VM1
$vm.HardwareProfile.VmSize = "Standard_E4s_v5"
Update-AzVM -ResourceGroupName RG1 -VM $vm
```

<!-- section: vm-disks | objectives: 3.2.5 -->
## Disques des machines virtuelles

| Rôle du disque | Contenu | Persistance |
| --- | --- | --- |
| Disque de système d'exploitation | Le système (`C:` ou `/`) | Disque managé, persistant |
| **Disque temporaire** | Fichier d'échange, données de travail (`D:` sous Windows, `/dev/sdb1` sous Linux) | **Perdu** à la libération, au redéploiement, au redimensionnement ou lors d'une maintenance de l'hôte. N'y stockez jamais de données |
| Disques de données | Données applicatives | Disques managés, persistants. Leur nombre maximal dépend de la taille |

| Type de disque | Performances | Disque de système | Usage |
| --- | --- | --- | --- |
| HDD Standard | Les plus basses | Oui | Sauvegardes, données rarement lues |
| SSD Standard | Régulières, modérées | Oui | Serveurs web, test et développement |
| SSD Premium | Élevées | Oui | Production ; exige une taille en `s` |
| **SSD Premium v2** | Supérieures ; IOPS et débit réglés indépendamment de la taille, **modifiables sans interruption** | **Non** | Bases de données exigeantes, moins cher qu'Ultra |
| **Disque Ultra** | Les plus élevées, latence inférieure à la milliseconde | **Non** | Les charges les plus exigeantes |

Opérations :

- **Étendre** un disque à tout moment (disques de données en ligne, avec des limites autour de 4 Tio pour les types anciens) ; étendez ensuite le volume dans le système d'exploitation. Un disque ne peut **jamais être réduit**.
- **Changer de type** entre HDD Standard, SSD Standard et SSD Premium ; la procédure habituelle consiste à libérer la machine, changer le type, puis la démarrer.
- **Attacher et détacher** des disques de données pendant que la machine tourne.
- **Mise en cache de l'hôte** : None, ReadOnly ou ReadWrite.
- **Instantané** : copie en lecture seule d'un disque à un instant donné. *Complet* ou **incrémentiel** (seulement les changements depuis le précédent, facturé à la taille utilisée, stocké sur HDD Standard). Un instantané permet de créer un nouveau disque.
- **Image** : copie généralisée d'une machine entière (`sysprep` sous Windows, `waagent -deprovision` sous Linux), stockée dans une galerie Azure Compute Gallery pour créer des machines identiques.
- Redondance des disques : LRS, ou ZRS pour les SSD Premium et SSD Standard.

```bash
az disk update -g RG1 -n VM1-data1 --size-gb 512
az vm disk attach -g RG1 --vm-name VM1 --name VM1-data2 --new --size-gb 128 --sku Premium_LRS
az snapshot create -g RG1 -n snap1 --source VM1-data1 --incremental true
```

<!-- section: vm-availability | objectives: 3.2.6 -->
## Zones de disponibilité et groupes à haute disponibilité

| Option | Protège contre | SLA | Comment |
| --- | --- | --- | --- |
| Machine seule avec disques SSD Premium ou Ultra | Rien au-delà de la durabilité des disques | 99,9 % | |
| **Groupe à haute disponibilité** (availability set) | La panne d'un rack (**domaine d'erreur**) et la maintenance planifiée (**domaine de mise à jour**) dans un centre de données | 99,95 % | Jusqu'à 3 domaines d'erreur et 20 domaines de mise à jour (5 par défaut) |
| **Zones de disponibilité** | La panne de tout un **centre de données** | 99,99 % | Deux machines ou plus dans deux zones ou plus de la région |
| Groupes de machines virtuelles identiques | Selon leur configuration (zones ou domaines d'erreur) | | Ajoutent l'élasticité |

- Un **domaine d'erreur** partage une alimentation et un commutateur réseau. Un **domaine de mise à jour** est un groupe redémarré ensemble lors d'une maintenance planifiée ; un seul domaine de mise à jour est redémarré à la fois.
- Les machines sont réparties dans les domaines de mise à jour à tour de rôle : avec 5 domaines de mise à jour et 7 machines, deux domaines contiennent 2 machines. C'est le nombre maximal de machines redémarrées ensemble.
- Une machine ne peut rejoindre un groupe à haute disponibilité **qu'à sa création**. Pour en changer, supprimez la machine en gardant ses disques et son interface réseau, puis recréez-la.
- Une machine est dans un groupe à haute disponibilité **ou** dans une zone, pas les deux. Les groupes à haute disponibilité restent utiles dans les régions sans zones.
- Toutes les machines d'un groupe à haute disponibilité devraient exécuter le même niveau applicatif, derrière un équilibreur de charge. Entre zones, utilisez un équilibreur de charge Standard et une adresse IP publique Standard **redondants interzone**.
- Un **groupe de placement de proximité** rapproche les machines pour réduire la latence ; il joue contre la résilience, pas pour elle.

```bash
az vm availability-set create -g RG1 -n AS1 \
  --platform-fault-domain-count 2 --platform-update-domain-count 5
az vm create -g RG1 -n VM1 --image Ubuntu2204 --availability-set AS1
```

<!-- section: vmss | objectives: 3.2.7 -->
## Groupes de machines virtuelles identiques

Un groupe identique (Virtual Machine Scale Set) gère un ensemble de machines à charge équilibrée, créées à partir de la même configuration, et fait varier leur nombre à la main, selon un calendrier ou automatiquement.

| Mode d'orchestration | Caractéristiques |
| --- | --- |
| **Flexible** (par défaut, recommandé) | Machines virtuelles standard ; on peut mélanger tailles et systèmes d'exploitation ; des machines existantes peuvent être ajoutées ; répartition sur des domaines d'erreur ou des zones |
| **Uniform** | Instances identiques issues du modèle du groupe ; gérées par les API du groupe identique |

La **mise à l'échelle automatique** (autoscale d'Azure Monitor) est définie par :

- Des **limites d'instances** : minimum, maximum et valeur par défaut. Aucune règle ne sort jamais des limites.
- Des **règles** : une métrique (par exemple *Percentage CPU*, métrique d'hôte qui ne demande aucun agent), une agrégation sur une fenêtre de temps, un seuil, une action (augmenter ou diminuer le nombre de N, ou le fixer à N) et une période de **refroidissement** (cool down).
- Associez toujours une règle de **scale-out** à une règle de **scale-in** ; sinon le groupe ne se réduit jamais.
- Des **profils** : par défaut, planification récurrente (jours de semaine) ou dates fixes, chacun avec ses limites et ses règles.

```bash
az monitor autoscale create -g RG1 --name as-vmss1 --resource vmss1 \
  --resource-type Microsoft.Compute/virtualMachineScaleSets --min-count 2 --max-count 10 --count 2
az monitor autoscale rule create -g RG1 --autoscale-name as-vmss1 \
  --condition "Percentage CPU > 70 avg 10m" --scale out 2
az monitor autoscale rule create -g RG1 --autoscale-name as-vmss1 \
  --condition "Percentage CPU < 30 avg 10m" --scale in 1
```

Autres réglages :

| Réglage | Valeurs |
| --- | --- |
| **Stratégie de mise à niveau** (comment les instances reçoivent un changement du modèle) | **Manual** (vous mettez chaque instance à niveau), **Automatic** (toutes d'un coup, dans un ordre aléatoire), **Rolling** (par lots, avec contrôles d'intégrité ; recommandée en production) |
| **Stratégie de scale-in** (quelle instance est retirée) | **Default** (équilibre les zones et les domaines d'erreur, puis l'ID d'instance le plus élevé), **NewestVM** ou **OldestVM** (eux aussi après l'équilibrage des zones dans un groupe identique réparti sur plusieurs zones) |
| Protection d'instance | *Protéger contre le scale-in* bloque le scale-in de la mise à l'échelle automatique ; *protéger contre les actions du groupe identique* bloque aussi la mise à niveau, la réinitialisation (reimage) ou la libération lancées sur le groupe identique. Un utilisateur peut toujours supprimer l'instance |
| Réparations automatiques d'instances | Remplacer les instances défaillantes (demande l'extension Application Health ou une sonde d'équilibreur de charge) |
| Zones | Répartir les instances entre zones pour la résilience |
| Spot | Utiliser des instances Spot pour les charges interruptibles |

Un groupe identique prend en charge jusqu'à 1 000 instances. Mise à l'échelle manuelle : `az vmss scale -g RG1 -n vmss1 --new-capacity 5`.

<!-- section: key-points -->
## Points clés

- Arrêtée depuis le système = toujours facturée ; libérée = calcul non facturé, disque temporaire perdu.
- SSE est toujours actif ; le chiffrement sur l'hôte ajoute le disque temporaire et les caches ; Azure Disk Encryption agit dans l'invité et exige un coffre de clés de la même région, activé pour le chiffrement de disque.
- Les déplacements entre groupes de ressources et abonnements gardent la région ; les déplacements entre régions passent par Azure Resource Mover.
- `s` dans une taille = stockage Premium. Redimensionner redémarre ; libérez la machine quand la taille n'est pas disponible (tout le groupe à haute disponibilité si nécessaire).
- Disque Ultra et SSD Premium v2 ne peuvent pas être des disques de système ; un disque s'étend mais ne se réduit jamais ; les instantanés incrémentiels sont les moins chers.
- Groupe à haute disponibilité : domaines d'erreur et de mise à jour, 99,95 %, à la création seulement. Zones : 99,99 %.
- Groupes identiques : Flexible ou Uniform ; les limites de l'autoscale bornent toutes les règles ; stratégie de mise à niveau Manual, Automatic ou Rolling.
