Un réseau virtuel est le réseau privé de vos ressources dans Azure. Ce chapitre couvre l'adressage, l'interconnexion des réseaux virtuels, les adresses publiques, le routage et les outils qui montrent pourquoi un paquet n'arrive pas.

<!-- section: vnets-subnets | objectives: 4.1.1 -->
## Réseaux virtuels et sous-réseaux

Un réseau virtuel appartient à **une région et un abonnement**. Il possède une ou plusieurs plages d'adresses (son **espace d'adressage**), découpées en **sous-réseaux**. Les ressources d'un même réseau virtuel communiquent par défaut, d'un sous-réseau à l'autre, avec leurs adresses privées.

- Utilisez des plages privées (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). Les plages ne doivent **pas se chevaucher** avec les réseaux que vous connecterez : réseaux virtuels appairés et sites locaux.
- Plages interdites : 224.0.0.0/4, 255.255.255.255/32, 127.0.0.0/8, 169.254.0.0/16 et 168.63.129.16/32.
- Vous pouvez ajouter des plages d'adresses et des sous-réseaux plus tard ; un sous-réseau qui contient des ressources ne peut pas être réduit en dessous de ce qui est utilisé.

Azure **réserve 5 adresses dans chaque sous-réseau** : les quatre premières et la dernière. Dans 10.0.1.0/24 : `.0` réseau, `.1` passerelle par défaut, `.2` et `.3` DNS Azure, `.255` diffusion. La première adresse attribuable à une ressource est `.4`.

| Préfixe | Adresses | Utilisables (moins 5) |
| --- | --- | --- |
| /29 (le plus petit autorisé) | 8 | 3 |
| /28 | 16 | 11 |
| /27 | 32 | 27 |
| /26 | 64 | 59 |
| /25 | 128 | 123 |
| /24 | 256 | 251 |

Certains services exigent un **sous-réseau dédié**, parfois avec un nom imposé :

| Sous-réseau | Pour | Taille minimale |
| --- | --- | --- |
| `GatewaySubnet` | Passerelle VPN ou ExpressRoute | /27 recommandé |
| `AzureBastionSubnet` | Azure Bastion | /26 |
| `AzureFirewallSubnet` | Pare-feu Azure | /26 |
| Sous-réseau **délégué** | Un service PaaS injecté dans le réseau, par exemple `Microsoft.Web/serverFarms` (intégration App Service) ou `Microsoft.ContainerInstance/containerGroups` | Selon le service |

Les adresses IP privées viennent du sous-réseau, en mode **dynamique** (par défaut : la prochaine adresse libre, conservée tant que l'interface existe) ou **statique** (vous la choisissez). Les machines virtuelles utilisent par défaut le DNS fourni par Azure ; des serveurs DNS personnalisés définis sur le réseau virtuel s'appliquent après le redémarrage des machines.

**Accès sortant à internet.** Historiquement, une machine sans IP publique disposait d'un « accès sortant par défaut » implicite. Pour les réseaux virtuels créés après le 31 mars 2026, les sous-réseaux sont **privés par défaut** : l'accès sortant doit être explicite, par une **passerelle NAT** (recommandée), une règle de trafic sortant d'équilibreur de charge, une IP publique sur la machine, ou un pare-feu.

```bash
az network vnet create -g RG1 -n VNet1 --address-prefixes 10.20.0.0/16 \
  --subnet-name web --subnet-prefixes 10.20.1.0/24
az network vnet subnet create -g RG1 --vnet-name VNet1 -n integration \
  --address-prefixes 10.20.2.0/26 --delegations Microsoft.Web/serverFarms
```

<!-- section: vnet-peering | objectives: 4.1.2 -->
## Peering de réseaux virtuels

Le peering connecte deux réseaux virtuels pour que leurs ressources communiquent avec leurs adresses privées sur le réseau principal de Microsoft, avec une faible latence et sans passerelle.

- Il fonctionne dans la même région et **entre régions** (peering mondial), entre abonnements et même entre locataires.
- Les espaces d'adressage **ne doivent pas se chevaucher**.
- Un peering est fait de **deux liens**, un dans chaque sens. Le portail crée les deux ; avec la CLI ou PowerShell, vous créez chacun. État **Initiated** après le premier lien, **Connected** quand les deux existent.
- Le peering n'est **pas transitif** : si A est appairé avec B et B avec C, A n'atteint pas C.
- Après l'ajout d'une plage d'adresses à un réseau appairé, **synchronisez** le peering ; inutile de le supprimer.

Réglages de chaque lien de peering :

| Réglage | Effet |
| --- | --- |
| Autoriser l'accès au réseau virtuel | Laisse les deux réseaux communiquer (par défaut). L'étiquette de service `VirtualNetwork` inclut alors le pair |
| **Autoriser le trafic transféré** | Accepte le trafic qui ne provient pas du réseau pair, par exemple relayé par une appliance virtuelle réseau du hub |
| **Autoriser le transit par passerelle** | Sur le réseau qui **possède** la passerelle VPN ou ExpressRoute : la partage avec le pair |
| **Utiliser les passerelles distantes** | Sur le réseau **sans** passerelle : utilise la passerelle du pair. Possible seulement si le pair autorise le transit par passerelle et si le réseau local n'a pas de passerelle |

**Hub-and-spoke.** Les spokes sont appairés à un hub qui porte les services partagés. Pour le trafic de spoke à spoke, il faut l'une de ces solutions : un peering direct entre les spokes ; ou une appliance virtuelle réseau ou un Pare-feu Azure dans le hub, avec des **itinéraires définis par l'utilisateur** dans chaque spoke qui pointent vers elle, et *Autoriser le trafic transféré* sur les peerings. Pour l'accès au réseau local depuis les spokes : transit par passerelle sur le hub, passerelles distantes sur les spokes.

```bash
az network vnet peering create -g RG1 -n Hub-to-Spoke1 --vnet-name Hub \
  --remote-vnet Spoke1 --allow-vnet-access --allow-forwarded-traffic --allow-gateway-transit
az network vnet peering create -g RG1 -n Spoke1-to-Hub --vnet-name Spoke1 \
  --remote-vnet Hub --allow-vnet-access --allow-forwarded-traffic --use-remote-gateways
```

<!-- section: public-ip | objectives: 4.1.3 -->
## Adresses IP publiques

Une adresse IP publique est une ressource que l'on associe à une interface réseau, un équilibreur de charge, une passerelle VPN, une passerelle d'application, une passerelle NAT, Azure Bastion ou un Pare-feu Azure.

| Propriété | SKU Standard (le seul SKU actuel) |
| --- | --- |
| Allocation | Toujours **statique** : attribuée à la création, conservée jusqu'à la suppression de la ressource |
| Sécurité | **Fermée au trafic entrant par défaut** : un NSG doit l'autoriser explicitement |
| Zones de disponibilité | **Redondante interzone** (zones 1, 2, 3), **zonale** (une zone) ou sans zone. Non modifiable après la création |
| Niveau | Régional, ou Global pour les équilibreurs de charge interrégionaux |

Le SKU Basic, qui permettait l'allocation dynamique, a été retiré le 30 septembre 2025.

- Une **étiquette de nom DNS** donne à l'adresse le nom `<étiquette>.<région>.cloudapp.azure.com`.
- Un **préfixe d'adresses IP publiques** réserve une plage contiguë d'adresses statiques (par exemple /28 = 16 adresses, toutes utilisables) à partir de laquelle vous créez des IP publiques ; utile pour les listes d'autorisation des pare-feux.
- **Préférence de routage** : *réseau Microsoft* (par défaut : le trafic reste le plus longtemps possible sur le réseau principal de Microsoft) ou *Internet* (remis à internet près de la région, pour un coût de sortie plus bas).
- Une ressource et son IP publique doivent être dans la même région. Un équilibreur de charge Standard exige des IP publiques Standard.

```bash
az network public-ip create -g RG1 -n pip-vm1 --sku Standard --zone 1 2 3 --dns-name vm1contoso
```

<!-- section: user-defined-routes | objectives: 4.1.4 -->
## Itinéraires définis par l'utilisateur

Azure crée des **itinéraires système** pour chaque sous-réseau : vers le réseau virtuel lui-même, vers les réseaux appairés, vers internet (0.0.0.0/0) et, quand une passerelle existe, vers les réseaux locaux (itinéraires BGP). Vous les remplacez par des **itinéraires définis par l'utilisateur** (UDR), regroupés dans une **table de routage** que vous associez à des sous-réseaux.

| Type de tronçon suivant | Envoie le trafic vers |
| --- | --- |
| **Appliance virtuelle** (Virtual appliance) | L'adresse IP privée d'une appliance virtuelle réseau, d'un pare-feu ou d'un équilibreur de charge interne |
| Passerelle de réseau virtuel | La passerelle VPN (pas ExpressRoute) |
| Réseau virtuel | Reste dans le réseau virtuel |
| Internet | Internet |
| **Aucun** (None) | Nulle part : le trafic est abandonné |

Sélection de l'itinéraire :

1. L'itinéraire à la **correspondance de préfixe la plus longue** l'emporte (10.0.1.0/24 bat 10.0.0.0/16).
2. À préfixe égal : **itinéraire défini par l'utilisateur**, puis **itinéraire BGP**, puis **itinéraire système**.

Règles :

- Un sous-réseau a zéro ou une table de routage ; une table de routage peut servir plusieurs sous-réseaux, dans **la même région et le même abonnement**.
- Une table de routage s'applique au trafic qui **quitte** les sous-réseaux auxquels elle est associée.
- Une machine virtuelle qui relaie du trafic (appliance) doit avoir le **transfert IP** (IP forwarding) activé sur son interface réseau, et le routage activé dans son système d'exploitation.
- *Propager les itinéraires de la passerelle* = Non sur une table de routage empêche les itinéraires locaux (BGP) d'atteindre ses sous-réseaux.
- **Tunneling forcé** : un itinéraire 0.0.0.0/0 vers un pare-feu ou vers le réseau local envoie tout le trafic destiné à internet à l'inspection.

```bash
az network route-table create -g RG1 -n rt-web
az network route-table route create -g RG1 --route-table-name rt-web -n to-internet \
  --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.20.0.4
az network vnet subnet update -g RG1 --vnet-name VNet1 -n web --route-table rt-web
```

<!-- section: troubleshoot-connectivity | objectives: 4.1.5 -->
## Résoudre les problèmes de connectivité réseau

Choisissez l'outil d'après la question posée :

| Question | Outil | Résultat |
| --- | --- | --- |
| Ce paquet est-il autorisé ou refusé par les NSG, et par quelle règle ? | **Vérification du flux IP** (IP flow verify, Network Watcher) | Allow ou Deny, avec le nom de la règle. Entrées : sens, protocole, IP et port locaux et distants |
| Quelles règles s'appliquent finalement à cette interface ? | **Règles de sécurité effectives** | Les règles fusionnées du NSG du sous-réseau et du NSG de l'interface |
| Où est envoyé le trafic vers cette destination ? | **Tronçon suivant** (Next hop, Network Watcher) | Type de tronçon suivant, adresse IP et table de routage |
| Quels itinéraires s'appliquent à cette interface ? | **Itinéraires effectifs** | Itinéraires système, BGP et définis par l'utilisateur, combinés |
| Cette machine peut-elle atteindre cette destination, et où cela bloque-t-il ? | **Résolution des problèmes de connexion** (Connection troubleshoot) | Accessibilité, latence, sauts et élément bloquant |
| J'ai besoin de voir les paquets | **Capture de paquets** | Fichier de capture, via l'extension de l'agent Network Watcher |
| La connectivité est-elle stable dans le temps ? | **Moniteur de connexion** (Connection Monitor) | Tests continus, avec alertes |
| Pourquoi le VPN est-il tombé ? | **Résolution des problèmes VPN** | Diagnostic de la passerelle et de ses connexions |

Les itinéraires effectifs et les règles de sécurité effectives ne sont disponibles que pour l'interface d'une machine virtuelle **en cours d'exécution**.

Causes habituelles, dans l'ordre de vérification :

1. Une règle de NSG sur le sous-réseau ou sur l'interface (les deux doivent autoriser).
2. Un itinéraire défini par l'utilisateur qui envoie le trafic vers une appliance qui ne relaie pas, ou vers None.
3. Un lien de peering manquant, un peering qui n'est pas *Connected*, ou l'idée fausse que le peering est transitif.
4. Le pare-feu du système d'exploitation invité.
5. La résolution DNS : le nom se résout vers la mauvaise adresse, ou pas du tout.
6. Aucun chemin sortant vers internet pour une machine d'un sous-réseau privé.

<!-- section: key-points -->
## Points clés

- 5 adresses réservées par sous-réseau ; /29 est le plus petit ; la première adresse utilisable est `.4`.
- Peering : deux liens, non transitif, pas de chevauchement, mondial possible. Transit par passerelle sur le hub, passerelles distantes sur le spoke, trafic transféré pour les appliances.
- Les IP publiques sont Standard : statiques, fermées par défaut, redondantes interzone ou zonales.
- Itinéraires : préfixe le plus long d'abord ; puis défini par l'utilisateur, BGP, système. Le tronçon suivant Appliance virtuelle exige le transfert IP ; None abandonne le trafic.
- Vérification du flux IP = décision des NSG ; Tronçon suivant = décision de routage ; Résolution des problèmes de connexion = test de bout en bout.
