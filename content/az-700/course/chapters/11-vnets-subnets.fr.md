Un réseau virtuel est l'espace d'adressage privé dans lequel presque tout le reste de cet examen est déployé. Les questions donnent des plages d'adresses et une liste de services, puis demandent quels réseaux virtuels et quels sous-réseaux créer, avec quelle taille, quel nom et quels paramètres.

<!-- section: address-space | objectives: 1.1.1 -->
## Planifier les espaces d'adressage et la segmentation

Un réseau virtuel (VNet) appartient à **une seule région et un seul abonnement** ; il couvre toutes les zones de disponibilité de sa région. Son espace d'adressage se compose d'une ou plusieurs plages CIDR qui ne se chevauchent pas.

| Règle | Détail |
| --- | --- |
| Plages recommandées | RFC 1918 : 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. La plage partagée 100.64.0.0/10 (RFC 6598) est elle aussi traitée comme privée. Une plage publique appartenant à votre organisation est autorisée : elle n'est joignable que depuis le réseau virtuel et les réseaux qui lui sont connectés |
| Plages impossibles à ajouter | 224.0.0.0/4 (multidiffusion), 255.255.255.255/32 (diffusion), 127.0.0.0/8 (bouclage), 169.254.0.0/16 (lien-local), 168.63.129.16/32 (DNS Azure, DHCP et sondes d'intégrité) |
| Chevauchement | Deux réseaux virtuels dont les espaces d'adressage se chevauchent ne peuvent pas être appairés ; il en va de même pour un réseau local joint par une passerelle |
| IPv6 | S'ajoute à IPv4 (double pile). Un sous-réseau IPv6 doit être exactement un /64 |
| Limites | 1 000 réseaux virtuels par abonnement et par région, 3 000 sous-réseaux et 65 536 adresses IP privées par réseau virtuel |

Vous pouvez ajouter, supprimer ou redimensionner des plages après la création. Une plage ne peut être réduite que si elle contient encore ses sous-réseaux, et elle ne peut être supprimée que si aucun sous-réseau ne l'utilise. Quand le réseau virtuel est appairé, le changement ne provoque aucune interruption, mais la nouvelle plage ne doit pas chevaucher l'espace d'adressage du pair et vous devez ensuite sélectionner **Synchroniser** (Sync) sur chaque peering : d'ici là, le pair conserve l'ancien espace d'adressage.

Segmenter, c'est choisir entre plusieurs réseaux virtuels et plusieurs sous-réseaux :

| Exigence | Conception |
| --- | --- |
| Isolation entre environnements, équipes, abonnements ou régions | Des réseaux virtuels distincts, reliés par peering uniquement là où c'est nécessaire |
| Filtrage, routage, adresse IP sortante ou accès aux services différents pour un groupe de ressources | Des sous-réseaux distincts : le NSG, la table de routage, la passerelle NAT, les points de terminaison de service et la délégation sont tous des paramètres de sous-réseau |
| Le trafic entre deux niveaux doit traverser un pare-feu ou une appliance virtuelle | Placez les niveaux dans des sous-réseaux différents et routez entre eux |
| Un service qui exige son propre sous-réseau (passerelle, pare-feu, Bastion...) | Un sous-réseau dédié, prévu dès le départ |
| De nombreux réseaux virtuels, plusieurs équipes, aucun chevauchement toléré avec les plages locales | La gestion des adresses IP (IPAM) d'Azure Virtual Network Manager : un pool racine, des pools enfants et des plages sans chevauchement allouées automatiquement aux nouveaux réseaux virtuels |

Gardez de la marge : n'allouez pas tout l'espace d'adressage aux sous-réseaux. Un sous-réseau a zéro ou un NSG et zéro ou une table de routage, chacun dans le même abonnement et la même région que le réseau virtuel.

> **Piège d'examen.** Les sous-réseaux ne sont pas, à eux seuls, une frontière de sécurité. Par défaut, Azure route le trafic entre tous les sous-réseaux d'un réseau virtuel ; seul un NSG, ou un itinéraire vers un pare-feu, le restreint.

<!-- section: create-vnet | objectives: 1.1.2 -->
## Créer un réseau virtuel

Dans le portail, l'onglet **Informations de base** demande l'abonnement, le groupe de ressources, le nom et la région ; l'onglet **Adresses IP** demande l'espace d'adressage et les sous-réseaux. Les faits sur lesquels s'appuient les questions :

- Le nom est unique dans le groupe de ressources et **ne peut pas être modifié** ; le nom d'un sous-réseau non plus.
- Toute ressource connectée au réseau virtuel doit se trouver dans **la même région et le même abonnement** que lui. Elle peut être dans un autre groupe de ressources.
- Autorisation requise : le rôle Network Contributor, ou un rôle personnalisé avec les actions `Microsoft.Network/virtualNetworks` correspondantes.

```bash
az network vnet create --resource-group RG1 --name VNet1 --location westeurope \
  --address-prefixes 10.10.0.0/16 \
  --subnet-name Subnet1 --subnet-prefixes 10.10.1.0/24

# The list replaces the whole address space: repeat the existing ranges
az network vnet update --resource-group RG1 --name VNet1 \
  --address-prefixes 10.10.0.0/16 10.20.0.0/16
```

```powershell
$subnet = New-AzVirtualNetworkSubnetConfig -Name Subnet1 -AddressPrefix 10.10.1.0/24
New-AzVirtualNetwork -ResourceGroupName RG1 -Name VNet1 -Location westeurope `
  -AddressPrefix 10.10.0.0/16 -Subnet $subnet

# Changes are made on the local object, then written with Set-AzVirtualNetwork
$vnet = Get-AzVirtualNetwork -ResourceGroupName RG1 -Name VNet1
Add-AzVirtualNetworkSubnetConfig -Name Subnet2 -AddressPrefix 10.10.2.0/24 -VirtualNetwork $vnet
$vnet | Set-AzVirtualNetwork
```

Sans préfixe d'adresse, `az network vnet create` utilise 10.0.0.0/16. Dans `az network vnet update`, la liste remplace tout l'espace d'adressage : répétez les plages existantes. En PowerShell, les modifications se font sur l'objet local, puis s'écrivent avec `Set-AzVirtualNetwork`.

**Accès sortant par défaut.** Pour les versions d'API publiées après le 31 mars 2026, les sous-réseaux d'un nouveau réseau virtuel sont **privés** par défaut (`defaultOutboundAccess` vaut `false`), et le portail crée déjà des sous-réseaux privés. Une machine virtuelle d'un sous-réseau privé n'atteint internet que par une méthode explicite : une passerelle NAT sur le sous-réseau, une adresse IP publique sur son interface réseau, ou les règles de trafic sortant d'un équilibreur de charge public Standard. Les réseaux virtuels existants ne sont pas modifiés. Quand vous rendez privé un sous-réseau existant (`az network vnet subnet update --default-outbound false`), les machines virtuelles doivent être arrêtées et libérées pour que le changement atteigne leurs interfaces réseau.

<!-- section: subnet-sizing | objectives: 1.1.1, 1.1.3 -->
## Dimensionner et configurer les sous-réseaux

Azure réserve **cinq adresses** dans chaque sous-réseau. Dans 10.10.1.0/24 : 10.10.1.0 (adresse réseau), 10.10.1.1 (passerelle par défaut), 10.10.1.2 et 10.10.1.3 (mappage des adresses du DNS Azure) et 10.10.1.255 (diffusion). La première adresse qu'une ressource peut recevoir est 10.10.1.4.

| Taille du sous-réseau | Adresses | Utilisables |
| --- | --- | --- |
| /29 (plus petit sous-réseau IPv4) | 8 | 3 |
| /28 | 16 | 11 |
| /27 | 32 | 27 |
| /26 | 64 | 59 |
| /25 | 128 | 123 |
| /24 | 256 | 251 |

Pour dimensionner un sous-réseau, comptez une adresse par configuration IP d'interface réseau, par adresse frontale d'équilibreur de charge interne et par point de terminaison privé, puis ajoutez les cinq adresses réservées. Pour les services qui montent en charge (groupes de machines virtuelles identiques, Application Gateway, intégration au réseau virtuel d'App Service), comptez le nombre maximal d'instances, pas le nombre actuel.

| Paramètre du sous-réseau | Effet |
| --- | --- |
| Plage d'adresses | Modifiable uniquement tant que le sous-réseau est vide ; sinon, déplacez ou supprimez d'abord les ressources |
| Sous-réseau privé (accès sortant par défaut) | Supprime l'adresse IP publique sortante implicite des machines virtuelles |
| Passerelle NAT | Connectivité sortante pour tout le sous-réseau |
| Groupe de sécurité réseau, table de routage | Filtrage et routage du sous-réseau |
| Points de terminaison de service | Itinéraire direct vers les services sélectionnés ; aucune adresse consommée |
| Délégation de sous-réseau | Réserve le sous-réseau à un service Azure |
| Stratégie réseau pour les points de terminaison privés | Fait appliquer les NSG et les itinéraires définis par l'utilisateur aux points de terminaison privés du sous-réseau |

Un sous-réseau plein ne peut pas être étendu tant qu'il contient des ressources. L'exception est la fonctionnalité de **préfixes d'adresses multiples** : un sous-réseau reçoit une seconde plage pour que les machines virtuelles et les groupes de machines virtuelles identiques continuent à monter en charge. Elle se configure avec Azure CLI, PowerShell ou un modèle, et ne s'applique pas aux sous-réseaux délégués.

<!-- section: service-subnets | objectives: 1.1.3 -->
## Les sous-réseaux exigés par les services réseau

Plusieurs services ne se déploient que dans un sous-réseau portant un nom exact.

| Service | Nom du sous-réseau | Taille | Règles |
| --- | --- | --- | --- |
| Passerelle VPN, passerelle ExpressRoute | `GatewaySubnet` | /27 ou plus grand ; /26 ou plus grand pour connecter 16 circuits ExpressRoute | Partagé par les deux types de passerelles quand elles coexistent ; rien d'autre à l'intérieur. Pas de NSG, pas d'itinéraire défini par l'utilisateur pour 0.0.0.0/0, propagation des itinéraires de passerelle laissée activée |
| Azure Bastion | `AzureBastionSubnet` | /26 ou plus grand | Dans le réseau virtuel et le groupe de ressources de l'hôte Bastion ; aucune autre ressource ; itinéraires définis par l'utilisateur non pris en charge. Le SKU Developer n'a pas besoin de sous-réseau |
| Pare-feu Azure | `AzureFirewallSubnet` | /26 | Les NSG de niveau sous-réseau y sont désactivés. Un /26 suffit pour tous les scénarios de mise à l'échelle |
| Interface de gestion du Pare-feu Azure | `AzureFirewallManagementSubnet` | /26 | Requise pour le tunneling forcé et toujours présente avec le SKU Basic ; possède sa propre adresse IP publique ; uniquement un itinéraire par défaut vers internet, propagation des itinéraires de passerelle désactivée |
| Azure Route Server | `RouteServerSubnet` | /26 ou plus grand | Ni NSG ni itinéraire défini par l'utilisateur ; un seul Route Server par réseau virtuel |
| Application Gateway | Nom libre | /24 recommandé | Uniquement des passerelles d'application. Une adresse par instance (jusqu'à 125), plus une pour une adresse frontale privée |
| Point de terminaison d'Azure DNS Private Resolver | Nom libre | /28 à /24 | Un sous-réseau par point de terminaison, délégué à `Microsoft.Network/dnsResolvers` |

Un réseau virtuel hub qui héberge tous ces services tient dans un /22 :

```text
Hub VNet 10.10.0.0/22            (10.10.0.0 - 10.10.3.255)
  GatewaySubnet                  10.10.0.0/27     VPN and ExpressRoute gateways
  AzureFirewallSubnet            10.10.0.64/26    Azure Firewall
  AzureFirewallManagementSubnet  10.10.0.128/26   Forced tunneling
  AzureBastionSubnet             10.10.0.192/26   Azure Bastion
  RouteServerSubnet              10.10.1.0/26     Azure Route Server
  snet-appgw                     10.10.2.0/24     Application Gateway v2
  Free                           10.10.0.32/27, 10.10.1.64/26, 10.10.1.128/25, 10.10.3.0/24
```

Les services de plateforme injectés dans un réseau virtuel (Azure SQL Managed Instance, intégration d'App Service, environnements Container Apps...) ont besoin d'un sous-réseau à eux, en général délégué : voir [Délégation de sous-réseau](#delegation). L'accès privé aux services de plateforme qui restent hors du réseau virtuel repose sur deux fonctionnalités de sous-réseau sans nom réservé :

| Fonctionnalité | Ce qu'elle prend dans le sous-réseau | À retenir |
| --- | --- | --- |
| Point de terminaison privé | Une adresse IP privée, sur une interface réseau en lecture seule créée avec le point de terminaison | N'importe quel sous-réseau, partagé avec d'autres ressources. Le point de terminaison est dans la région et l'abonnement de son réseau virtuel ; la ressource cible peut être dans une autre région. Les NSG et les itinéraires définis par l'utilisateur ignorent les points de terminaison privés, sauf si `privateEndpointNetworkPolicies` vaut `Enabled`, `NetworkSecurityGroupEnabled` ou `RouteTableEnabled` (par défaut : `Disabled`) |
| Point de terminaison de service | Rien : c'est un paramètre du sous-réseau, par service (`Microsoft.Storage`, `Microsoft.Sql`, `Microsoft.KeyVault`...) | L'adresse source vue par le service passe d'une adresse publique à une adresse privée : les règles de pare-feu IP du service qui listaient les anciennes adresses publiques ne correspondent plus, et les connexions TCP ouvertes vers le service sont fermées pendant la bascule. Inutilisable depuis le réseau local |

> **Piège d'examen.** `GatewaySubnet` ne doit pas avoir de NSG, et une table de routage qui y envoie 0.0.0.0/0 ailleurs bloque la création de la passerelle. Les itinéraires qui forcent le trafic internet vers une passerelle ou une appliance se placent sur les sous-réseaux de charges de travail.

<!-- section: delegation | objectives: 1.1.3, 1.1.4 -->
## La délégation de sous-réseau

Les services de plateforme **injectés** dans un réseau virtuel placent leurs instances, avec des adresses IP privées, dans l'un de vos sous-réseaux. La délégation désigne ce sous-réseau pour un service : le service reçoit l'autorisation d'y créer ses ressources et d'y appliquer les stratégies d'intention de réseau dont il a besoin, et Azure refuse ensuite les modifications qui le casseraient.

| Service | Délégation | Sous-réseau |
| --- | --- | --- |
| Azure SQL Managed Instance | `Microsoft.Sql/managedInstances` | Dédié ; au moins /27 (32 adresses) |
| Intégration au réseau virtuel d'App Service | `Microsoft.Web/serverFarms` | Dédié ; /28 au minimum, /27 quand le portail le crée, /26 pour couvrir l'échelle maximale d'un plan ou pour joindre plusieurs plans |
| Azure DNS Private Resolver | `Microsoft.Network/dnsResolvers` | Dédié à un point de terminaison ; /28 à /24 |
| Déploiement Application Gateway privé | `Microsoft.Network/applicationGateways` | Le sous-réseau de la passerelle d'application |

```bash
# Services that accept a delegation in a region
az network vnet subnet list-available-delegations --location westeurope --output table

az network vnet subnet update --resource-group RG1 --vnet-name VNet1 --name snet-sqlmi \
  --delegations Microsoft.Sql/managedInstances

az network vnet subnet show --resource-group RG1 --vnet-name VNet1 --name snet-sqlmi \
  --query delegations
```

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName RG1 -Name VNet1
$subnet = Get-AzVirtualNetworkSubnetConfig -Name snet-sqlmi -VirtualNetwork $vnet
$subnet = Add-AzDelegation -Name sqlmi -ServiceName Microsoft.Sql/managedInstances -Subnet $subnet
Set-AzVirtualNetwork -VirtualNetwork $vnet
```

Dans le portail, ouvrez le sous-réseau et choisissez le service sous **Délégation de sous-réseau** ; choisissez **Aucun** pour la retirer. Déléguer demande `Microsoft.Network/virtualNetworks/subnets/write` (inclus dans Network Contributor).

Règles à retenir :

- La délégation ne peut être ni ajoutée ni retirée tant que des ressources du service sont déployées dans le sous-réseau, et elle doit être retirée avant la suppression du sous-réseau ou du réseau virtuel.
- Un sous-réseau délégué ne peut pas héberger de point de terminaison privé.
- Le service impose la taille minimale du sous-réseau et peut exiger un espace d'adressage privé (RFC 1918).
- Vous gardez la main sur le sous-réseau : vous lui associez toujours un NSG et une table de routage, dans les limites de ce que le service accepte.

> **Conseil d'examen.** Ordre des opérations pour un service injecté : créez le sous-réseau à la bonne taille, déléguez-le, puis déployez le service. La taille d'un sous-réseau d'intégration ne se corrige plus une fois que le service l'utilise.

<!-- section: shared-dedicated | objectives: 1.1.5 -->
## Sous-réseaux partagés ou dédiés

Un sous-réseau **dédié** n'accepte que les ressources d'un seul service. Un sous-réseau **partagé** mélange les types de ressources.

| Ressource | Sous-réseau |
| --- | --- |
| Machines virtuelles, groupes de machines virtuelles identiques, appliances virtuelles réseau, équilibreurs de charge internes, points de terminaison privés | Partagé : ils peuvent cohabiter dans le même sous-réseau |
| AKS, Azure Batch, HDInsight, Azure Databricks | Le partage est permis ; un sous-réseau dédié est la pratique recommandée |
| Passerelles VPN et ExpressRoute, Pare-feu Azure, Azure Bastion, Azure Route Server, Application Gateway | Dédié |
| Azure SQL Managed Instance, intégration d'App Service, environnements Container Apps, Azure Container Instances, Gestion des API, Azure NetApp Files, serveurs flexibles Azure Database pour MySQL et PostgreSQL | Dédié |

Raisons de donner à une charge de travail son propre sous-réseau même quand le partage est permis :

- Les NSG, les tables de routage, les passerelles NAT et les points de terminaison de service s'appliquent à tout le sous-réseau. Une règle pensée pour une charge de travail s'applique alors à ses voisines.
- Une charge de travail qui monte en charge peut épuiser les adresses dont ses voisines ont besoin.
- La plage d'un sous-réseau ne se modifie que tant qu'il est vide.

Raisons de partager : moins de sous-réseaux à gérer et moins d'espace d'adressage perdu en adresses réservées ; les groupes de sécurité d'application permettent quand même de séparer les niveaux d'un même sous-réseau dans les règles de NSG.

> **Piège d'examen.** Dédié et délégué ne sont pas synonymes. `GatewaySubnet` et `AzureFirewallSubnet` sont dédiés par leur nom, sans délégation ; un sous-réseau délégué à `Microsoft.Web/serverFarms` est dédié par délégation.

<!-- section: key-points -->
## Points clés

- Un réseau virtuel = une région, un abonnement ; les espaces d'adressage de réseaux connectés ne se chevauchent jamais ; après avoir modifié l'espace d'adressage d'un réseau virtuel appairé, synchronisez les peerings.
- Cinq adresses réservées par sous-réseau ; /29 est le plus petit sous-réseau et laisse 3 adresses ; les sous-réseaux IPv6 sont des /64.
- Noms réservés : `GatewaySubnet` (/27 ou plus grand), `AzureBastionSubnet` (/26 ou plus grand), `AzureFirewallSubnet` et `AzureFirewallManagementSubnet` (/26), `RouteServerSubnet` (/26 ou plus grand). Application Gateway : nom libre, dédié, /24 recommandé.
- Ni NSG ni remplacement de l'itinéraire par défaut sur `GatewaySubnet`.
- Les points de terminaison privés consomment une adresse et ignorent les NSG et les itinéraires tant que les stratégies réseau du sous-réseau ne sont pas activées ; les points de terminaison de service ne consomment rien et changent l'adresse source vue par le service.
- Les nouveaux réseaux virtuels ont des sous-réseaux privés : prévoyez une méthode de sortie explicite.
- La délégation réserve un sous-réseau à un service injecté ; dimensionnez-le d'abord, et n'y placez jamais de points de terminaison privés.
