Chaque sous-réseau a une table de routage qu'Azure construit pour vous. Les questions de routage demandent quelle route l'emporte pour une destination, comment la modifier (itinéraire défini par l'utilisateur, BGP, Azure Route Server), et ce qui change pour le trafic Internet quand on le force à travers une appliance ou une passerelle NAT. Lisez les itinéraires effectifs, appliquez la correspondance de préfixe la plus longue, puis la priorité de la source.

<!-- section: user-defined-routes | objectives: 1.3.4 -->
## Concevoir et implémenter des routes définies par l'utilisateur

Azure crée des **routes système** pour chaque sous-réseau : les plages d'adresses du réseau virtuel (tronçon suivant **Réseau virtuel**), 0.0.0.0/0 (**Internet**), et **Aucun** (None) pour 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 et 100.64.0.0/10, sauf si une plage figure dans l'espace d'adressage. Des routes système facultatives apparaissent quand vous ajoutez un peering (**Peering de réseaux virtuels**), une passerelle (**Passerelle de réseau virtuel**, pour les préfixes des passerelles de réseau local ou appris par BGP) ou un point de terminaison de service (`VirtualNetworkServiceEndpoint`). La table par défaut contient aussi des routes Aucun pour quelques autres plages réservées (127.0.0.0/8, 157.59.0.0/16, 104.146.0.0/17, 104.147.0.0/16). Une route 0.0.0.0/0 de tronçon suivant **Passerelle de réseau virtuel** supprime les routes Aucun par défaut, et dans l'exemple de routage de Learn un itinéraire défini par l'utilisateur 0.0.0.0/0 supprime celles de 10.0.0.0/8, 192.168.0.0/16 et 100.64.0.0/10 : une capture des itinéraires effectifs n'a alors plus ces lignes Aucun.

| Type de tronçon suivant d'une UDR (valeur CLI) | Usage |
| --- | --- |
| Appliance virtuelle (`VirtualAppliance`) | Envoyer le trafic à un NVA : l'adresse IP privée de son interface réseau, ou le front-end d'un équilibreur de charge interne placé devant plusieurs NVA |
| Passerelle de réseau virtuel (`VirtualNetworkGateway`) | Envoyer le trafic à la passerelle VPN. Pris en charge seulement si la passerelle du réseau est une passerelle VPN, pas ExpressRoute, Route Server ni un hub Virtual WAN |
| Réseau virtuel (`VNetLocal`) | Garder le trafic dans le réseau virtuel, en dérogeant à une UDR plus large |
| Internet | Envoyer un préfixe directement vers Internet, par exemple pour soustraire un sous-réseau au tunneling forcé |
| Aucun (None) | Abandonner le trafic |

Impossible de créer une UDR de tronçon suivant **Peering de réseaux virtuels** ou `VirtualNetworkServiceEndpoint`. Le préfixe d'adresse d'une UDR peut être une **étiquette de service** (`Storage`, `AppService.AustraliaCentral`), jusqu'à 25 routes de ce type par table de routage ; un préfixe explicite l'emporte sur une étiquette de service de même préfixe.

**Sélection de la route** pour un paquet sortant :

1. D'abord la **correspondance de préfixe la plus longue** : un /24 bat un /16 quelle que soit sa source.
2. À préfixe égal : **itinéraire défini par l'utilisateur**, puis **itinéraire BGP**, puis **itinéraire système**.
3. Exception : les routes système du réseau virtuel, des peerings et des points de terminaison de service sont préférées aux routes BGP, même plus spécifiques. Une route de point de terminaison de service ne peut pas être remplacée, même par une UDR.

Un NVA qui transfère du trafic doit avoir le **transfert IP** activé sur son interface réseau Azure (et en général dans son système d'exploitation). Déployez-le dans un autre sous-réseau que les charges de travail qui passent par lui, sinon le trafic boucle. L'adresse IP du tronçon suivant doit être joignable directement : pas à travers une passerelle ExpressRoute ni Virtual WAN.

> **Piège d'examen.** Une UDR 10.0.0.0/8 vers le pare-feu n'intercepte pas le trafic vers un spoke appairé 10.2.0.0/16 : la route de peering est plus spécifique et l'emporte. Ajoutez une UDR pour 10.2.0.0/16 (ou les plages exactes des spokes) avec le pare-feu comme tronçon suivant.

<!-- section: route-table-association | objectives: 1.3.5 -->
## Associer une table de routage à un sous-réseau

- Une table de routage est associée à **zéro ou plusieurs sous-réseaux** ; un sous-réseau a **zéro ou une** table de routage. Les tables de routage ne s'associent pas aux réseaux virtuels.
- Le sous-réseau doit appartenir à un réseau virtuel de la **même région et du même abonnement** que la table de routage.
- **Propager les itinéraires de passerelle** (`--disable-bgp-route-propagation`) : mettez Non/true sur un sous-réseau qui ne doit pas recevoir les routes locales de la passerelle VPN ou ExpressRoute (statiques et BGP). Ne le désactivez jamais sur **GatewaySubnet** : la passerelle cesse de fonctionner.
- Une table de routage associée à un sous-réseau ne peut pas être supprimée : dissociez-la d'abord. L'autorisation `Microsoft.Network/routeTables/join/action` est nécessaire pour l'associer.
- Sur **GatewaySubnet**, n'associez pas de table de routage contenant une route 0.0.0.0/0, ni une route qui envoie la plage du sous-réseau de passerelle vers Aucun ou vers un NVA : la passerelle ne joint plus son plan de gestion.

```bash
az network route-table create --resource-group RG1 --name rt-spokes --disable-bgp-route-propagation true
az network route-table route create --resource-group RG1 --route-table-name rt-spokes \
  --name default-to-fw --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
az network vnet subnet update --resource-group RG1 --vnet-name Spoke1 --name workload \
  --route-table rt-spokes
```

<!-- section: forced-tunneling | objectives: 1.3.6 -->
## Configurer le tunneling forcé

Le tunneling forcé envoie le trafic destiné à Internet vers le réseau local (ou vers une appliance) pour inspection, au lieu de le laisser sortir directement.

| Méthode | Comment |
| --- | --- |
| Site par défaut (Default Site) de la passerelle VPN | `Set-AzVirtualNetworkGatewayDefaultSite` sur une passerelle VPN basée sur des routes, en PowerShell uniquement. L'appareil local utilise 0.0.0.0/0 comme sélecteurs de trafic |
| BGP | Le réseau local annonce 0.0.0.0/0 sur une connexion VPN avec BGP ou sur ExpressRoute |
| UDR | 0.0.0.0/0 avec le tronçon suivant **Passerelle de réseau virtuel** (passerelle VPN uniquement) ou **Appliance virtuelle** |

Pour qu'un sous-réseau garde un accès Internet direct, associez-lui seul une table de routage avec 0.0.0.0/0 et le tronçon suivant **Internet**.

```powershell
$lng = Get-AzLocalNetworkGateway -Name DefaultSiteHQ -ResourceGroupName RG1
$gw = Get-AzVirtualNetworkGateway -Name VNet1GW -ResourceGroupName RG1
Set-AzVirtualNetworkGatewayDefaultSite -GatewayDefaultSite $lng -VirtualNetworkGateway $gw
```

Effets de bord d'une route 0.0.0.0/0 vers une passerelle ou une appliance :

- Le trafic vers les adresses IP publiques des services Azure la suit aussi, sauf s'il existe un point de terminaison de service (route plus spécifique).
- Les ressources du sous-réseau ne sont plus joignables directement depuis Internet (RDP ou SSH vers une IP publique échoue) : le trafic entrant doit passer par l'équipement qui traite la route par défaut.
- Une passerelle NAT du sous-réseau est contournée : une UDR vers une appliance ou une passerelle l'emporte sur la passerelle NAT.

Le **Pare-feu Azure** en tunneling forcé exige la **carte réseau de gestion** (Firewall Management NIC) : un sous-réseau nommé **AzureFirewallManagementSubnet** (/26 au minimum) avec sa propre adresse IP publique (même SKU, même niveau et même emplacement que l'adresse IP publique du pare-feu), dont la seule route autorisée est une route par défaut vers Internet, avec **Propager les itinéraires de passerelle** désactivé. Ajoutez ensuite une route par défaut sur **AzureFirewallSubnet** vers l'appareil local ou le NVA (ou activez-y **Propager les itinéraires de passerelle**). Learn indique que le DNAT n'est pas pris en charge avec le tunneling forcé, car les connexions entrantes depuis Internet repartiraient par le chemin forcé (routage asymétrique), et ajoute que les pare-feu dotés d'une carte réseau de gestion prennent toujours en charge le DNAT. Activer la carte réseau de gestion sur un pare-feu Standard ou Premium existant impose de l'arrêter puis de le redémarrer ; les pare-feu Basic en ont toujours une.

<!-- section: diagnose-routing | objectives: 1.3.7 -->
## Diagnostiquer et résoudre les problèmes de routage

| Outil | Ce qu'il indique |
| --- | --- |
| **Itinéraires effectifs** d'une interface réseau (`az network nic show-effective-route-table`) | Toutes les routes appliquées à l'interface : source (Default, User, Virtual network gateway), état (Active ou Invalid), préfixe, tronçon suivant. Uniquement pour une VM en cours d'exécution |
| **Tronçon suivant** de Network Watcher (`az network watcher show-next-hop`) | Type et adresse IP du tronçon suivant pour une destination, et l'ID de la table de routage, ou *System Route* |
| **Résolution des problèmes de connexion** de Network Watcher | Test de bout en bout depuis une VM vers une VM, un FQDN, un URI ou une adresse IP ; signale les problèmes de NSG, d'UDR et de ports |

```bash
az network nic show-effective-route-table --resource-group RG1 --name vm1-nic --output table
az network watcher show-next-hop --resource-group RG1 --vm VM1 --nic vm1-nic \
  --source-ip 10.1.0.4 --dest-ip 10.2.0.4
```

| Symptôme | Cause probable |
| --- | --- |
| Tronçon suivant **Aucun** pour une destination | Une UDR de tronçon suivant None, ou une plage réservée absente de tout espace d'adressage |
| Le tronçon suivant est un NVA, mais les paquets sont perdus | Transfert IP désactivé sur l'interface réseau du NVA, ou le NVA lui-même ne transfère pas |
| Route à l'état **Invalid** | Une route de même préfixe et de source plus prioritaire la remplace |
| Pas de route **Peering de réseaux virtuels** alors que le peering est **Connecté** | Délai de propagation ; réessayez |
| Le spoke ne reçoit pas les routes locales | Propagation des routes de passerelle désactivée sur sa table de routage, ou passerelle distante non utilisée sur son peering |
| VM injoignables depuis Internet après un changement VPN | Une route BGP 0.0.0.0/0 ou un site par défaut force le trafic vers le réseau local |

<!-- section: route-server | objectives: 1.3.8 -->
## Azure Route Server

Route Server échange des routes par **BGP** entre des NVA (SD-WAN, pare-feu, routeur) et le réseau virtuel : les routes apprises des NVA sont programmées dans chaque VM du réseau virtuel et des spokes appairés, et les espaces d'adressage sont annoncés aux NVA. C'est un service du plan de contrôle : **le trafic de données ne le traverse jamais**.

| Exigence | Valeur |
| --- | --- |
| Sous-réseau | Dédié, nommé **RouteServerSubnet**, /26 ou plus grand |
| Adresse IP publique | Standard, pour la connexion de gestion |
| ASN de Route Server | 65515 (fixe) |
| Côté NVA | eBGP multi-saut, un ASN différent de 65515, un peering avec les **deux** instances de Route Server et les mêmes routes annoncées aux deux |
| ASN d'un pair | 16 bits uniquement ; ni 8074, 8075, 12076, 65515, 65517-65520 ni les valeurs réservées par l'IANA |
| Pairs BGP | 16 |
| Routes par pair BGP | 4 000 ; au-delà, la session est coupée |
| Capacité | 2 unités d'infrastructure de routage par défaut (4 000 VM dans le réseau et les réseaux appairés), puis des unités supplémentaires par tranche de 1 000 VM |

Comportements testés :

- Les spokes reçoivent les routes des NVA quand leur peering vers le hub utilise **la passerelle distante ou le serveur de routes**.
- **Branch-to-branch** (`--allow-b2b-traffic true`) est désactivé par défaut ; activez-le pour échanger les routes entre les NVA et la passerelle VPN ou ExpressRoute du même réseau. Le transit vaut pour ExpressRoute et le VPN de site à site, pas pour le point à site.
- Une passerelle VPN utilisée avec Route Server doit être en **mode actif/actif** avec l'ASN 65515 ; BGP n'a pas besoin d'y être activé.
- Créer ou supprimer Route Server dans un réseau qui contient une passerelle provoque environ 10 minutes d'interruption de la passerelle.
- Même préfixe reçu de plusieurs NVA : à longueur de chemin AS égale, ECMP ; un chemin AS plus court l'emporte. Entre chemins ExpressRoute, VPN et NVA, ExpressRoute est préféré par défaut ; la **préférence de routage** peut valoir ExpressRoute, VpnGateway ou ASPath.
- Route Server ne peut pas forcer le trafic entre sous-réseaux d'un même réseau virtuel à travers un NVA : les routes système du réseau virtuel battent BGP. Utilisez des UDR.
- IPv6 n'est pas pris en charge.

```bash
az network routeserver create --resource-group RG1 --name rs-hub \
  --hosted-subnet $subnetId --public-ip-address rs-hub-pip
az network routeserver peering create --resource-group RG1 --routeserver rs-hub \
  --name nva1 --peer-ip 10.0.2.4 --peer-asn 65001
az network routeserver update --resource-group RG1 --name rs-hub --allow-b2b-traffic true
```

<!-- section: nat-gateway-use-cases | objectives: 1.3.9 -->
## Quand utiliser Azure NAT Gateway

NAT Gateway donne à un sous-réseau un accès Internet **sortant** par des adresses IP publiques ou des préfixes statiques, avec des ports SNAT alloués dynamiquement. C'est la méthode sortante recommandée. Depuis le 31 mars 2026, les nouveaux réseaux virtuels utilisent par défaut des sous-réseaux privés : sans méthode sortante explicite, les VM n'ont pas d'accès Internet (activation et mises à jour Windows comprises).

| Exigence | Réponse |
| --- | --- |
| Beaucoup de VM ouvrent beaucoup de connexions sortantes ; épuisement SNAT avec les règles de trafic sortant de l'équilibreur de charge | Passerelle NAT : 64 512 ports SNAT par adresse IP publique, jusqu'à 16 adresses |
| Des partenaires autorisent un petit ensemble prévisible d'adresses sources | Passerelle NAT avec un préfixe d'adresse IP publique |
| Les VM de back-end d'un équilibreur de charge interne Standard ont besoin d'Internet | Passerelle NAT sur le sous-réseau de back-end |
| Connexions entrantes depuis Internet | Pas la passerelle NAT : un équilibreur de charge ou une IP publique au niveau de l'instance. Ils coexistent ; les flux sortants utilisent la passerelle NAT |
| Sortie redondante interzone, sortie IPv6, plus de 50 Gbit/s, ou journaux de flux | Référence SKU **StandardV2** |

Priorité sortante sur un sous-réseau : UDR vers une appliance ou une passerelle de réseau virtuel, puis passerelle NAT, puis IP publique au niveau de l'instance, puis règles de trafic sortant de l'équilibreur de charge, puis route par défaut vers Internet. Une passerelle NAT prend les nouvelles connexions sans couper celles qui existent.

| Caractéristique | Standard | StandardV2 |
| --- | --- | --- |
| Zones | Zonale (une zone) ou sans zone | Redondante interzone |
| IP publique | Standard, IPv4 (16 adresses ou un préfixe /28) | StandardV2 uniquement, 16 IPv4 et 16 IPv6 |
| Débit | 50 Gbit/s (25 par sens) | 100 Gbit/s, 1 Gbit/s par connexion |
| Protocoles | TCP, UDP | TCP, UDP, écho ICMP ; NAT64 |
| Changement de référence SKU | Pas de mise à niveau sur place | En créer une pour remplacer une passerelle NAT Standard |

<!-- section: nat-gateway-implementation | objectives: 1.3.10 -->
## Implémenter Azure NAT Gateway

Ordre : créer (ou réutiliser) une adresse IP publique ou un préfixe de la référence SKU correspondante, créer la passerelle NAT avec, l'associer aux sous-réseaux.

```bash
az network public-ip create --resource-group RG1 --name natgw-pip --sku Standard \
  --allocation-method Static --zone 1 2 3
az network nat gateway create --resource-group RG1 --name natgw1 \
  --public-ip-addresses natgw-pip --idle-timeout 10
az network vnet subnet update --resource-group RG1 --vnet-name VNet1 --name app \
  --nat-gateway natgw1
```

Règles :

- Une passerelle NAT par sous-réseau ; une passerelle NAT peut servir jusqu'à 800 sous-réseaux, tous dans **un seul réseau virtuel**. Aucune modification de table de routage n'est nécessaire.
- Pas sur **GatewaySubnet** ni sur un sous-réseau qui contient SQL Managed Instance. Pas avec des équilibreurs de charge Basic ou des IP publiques Basic dans le sous-réseau.
- Des IP publiques Standard redondantes interzone fonctionnent avec une passerelle NAT Standard zonale ou sans zone ; la zone ne peut plus changer après la création.
- Délai d'inactivité TCP : 4 minutes par défaut, jusqu'à 120. Délai d'inactivité UDP : 4 minutes, fixe.
- Hub-and-spoke : associez la passerelle NAT à **AzureFirewallSubnet** pour multiplier les ports SNAT du pare-feu pour le trafic des spokes.
- Les préfixes d'adresse IP personnalisés (BYOIP) ne s'utilisent pas avec StandardV2.

> **Piège d'examen.** Les VM d'un sous-réseau sortent toujours par le pare-feu après l'ajout d'une passerelle NAT : l'UDR 0.0.0.0/0 vers le pare-feu est prioritaire. Placez plutôt la passerelle NAT sur le sous-réseau du pare-feu.

<!-- section: key-points -->
## Points clés

- Le préfixe le plus long l'emporte ; à égalité, UDR, puis BGP, puis système. Les routes système du réseau virtuel, des peerings et des points de terminaison de service battent BGP.
- Une table de routage par sous-réseau, même région et même abonnement ; désactivez la propagation des routes de passerelle, sauf sur GatewaySubnet.
- Tunneling forcé : site par défaut (PowerShell), BGP 0.0.0.0/0 ou UDR ; exceptions par une UDR vers Internet ; le Pare-feu Azure exige la carte réseau de gestion.
- Diagnostic par les itinéraires effectifs (VM en cours d'exécution), le tronçon suivant et la résolution des problèmes de connexion ; les NVA exigent le transfert IP.
- Route Server : RouteServerSubnet /26, IP publique Standard, ASN 65515, peering avec les deux instances, branch-to-branch pour l'échange avec les passerelles, aucun chemin de données.
- Passerelle NAT : sortant uniquement, par sous-réseau, un seul réseau virtuel, prioritaire sur l'équilibreur de charge et les IP d'instance mais pas sur les UDR ; StandardV2 pour la redondance interzone et IPv6.
