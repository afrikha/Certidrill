Ce chapitre couvre le filtrage du trafic par les groupes de sécurité réseau, l'accès des administrateurs avec Azure Bastion, et les deux façons d'atteindre les services PaaS en privé : les points de terminaison de service et les points de terminaison privés.

<!-- section: nsg-asg | objectives: 4.2.1 -->
## Groupes de sécurité réseau et groupes de sécurité d'application

Un **groupe de sécurité réseau** (NSG) est une liste de règles qui autorisent ou refusent du trafic. Il s'associe à un **sous-réseau**, à une **interface réseau**, ou aux deux ; le même NSG peut être réutilisé sur plusieurs d'entre eux, dans la même région.

Une règle est définie par :

| Propriété | Valeurs |
| --- | --- |
| Priorité | **100 à 4096** ; le plus petit numéro est traité en premier |
| Sens | Entrant ou sortant |
| Source et destination | Any, adresse IP ou plage CIDR, **étiquette de service**, ou **groupe de sécurité d'application** |
| Protocole et ports | TCP, UDP, ICMP ou Any ; un port, une plage ou `*` |
| Action | Allow ou Deny |

Chaque NSG contient des **règles par défaut** impossibles à supprimer, que l'on ne peut que devancer par des règles de numéro inférieur :

| Sens | Priorité | Nom | Effet |
| --- | --- | --- | --- |
| Entrant | 65000 | AllowVNetInBound | Autorise de `VirtualNetwork` vers `VirtualNetwork` |
| Entrant | 65001 | AllowAzureLoadBalancerInBound | Autorise les sondes d'intégrité de l'équilibreur de charge |
| Entrant | 65500 | DenyAllInBound | Refuse tout le reste |
| Sortant | 65000 | AllowVnetOutBound | Autorise vers `VirtualNetwork` |
| Sortant | 65001 | AllowInternetOutBound | Autorise vers `Internet` |
| Sortant | 65500 | DenyAllOutBound | Refuse tout le reste |

Donc, sans aucune règle personnalisée : le trafic entrant depuis internet est refusé, le trafic interne au réseau virtuel et le trafic sortant vers internet sont autorisés.

Les **étiquettes de service** sont des groupes de préfixes d'adresses tenus à jour par Microsoft :

| Étiquette | Représente |
| --- | --- |
| `VirtualNetwork` | L'espace d'adressage du réseau virtuel, des réseaux **appairés** et des réseaux **locaux** connectés par une passerelle |
| `Internet` | Les adresses publiques extérieures au réseau virtuel, y compris les adresses publiques d'Azure |
| `AzureLoadBalancer` | La source des sondes d'intégrité (168.63.129.16) |
| `Storage`, `Sql`, `AzureKeyVault`... | Les adresses d'un service ; limitables à une région : `Storage.WestEurope` |

Un **groupe de sécurité d'application** (ASG) regroupe des interfaces réseau par rôle (web, base de données). Les règles nomment le groupe au lieu d'adresses IP ; ajouter un serveur revient à ajouter son interface au groupe. Toutes les interfaces d'un ASG doivent être dans le **même réseau virtuel** ; une interface peut appartenir à plusieurs ASG.

```bash
az network asg create -g RG1 -n asg-web
az network nsg create -g RG1 -n nsg-app
az network nsg rule create -g RG1 --nsg-name nsg-app -n Allow-HTTPS-Web --priority 200 \
  --direction Inbound --access Allow --protocol Tcp --source-address-prefixes Internet \
  --destination-asgs asg-web --destination-port-ranges 443
az network vnet subnet update -g RG1 --vnet-name VNet1 -n app --network-security-group nsg-app
```

<!-- section: effective-rules | objectives: 4.2.2 -->
## Évaluer les règles de sécurité effectives

Quatre règles résolvent toutes les questions du type « ce trafic est-il autorisé ? » :

1. Dans un NSG, les règles sont traitées **par priorité, le plus petit numéro d'abord, et le traitement s'arrête à la première correspondance**. Une règle plus précise située plus bas n'est jamais atteinte.
2. Quand un NSG est sur le sous-réseau et un autre sur l'interface, **les deux doivent autoriser** le trafic. **Entrant** : NSG du sous-réseau d'abord, puis NSG de l'interface. **Sortant** : NSG de l'interface d'abord, puis NSG du sous-réseau.
3. Les NSG sont **avec état** (stateful) : la réponse à un flux autorisé est autorisée automatiquement. Aucune règle n'est jamais nécessaire pour le trafic de retour.
4. Un changement de règle ne touche que les **nouvelles connexions** ; les flux établis continuent.

Méthode : prenez le flux (source, destination, port, protocole), descendez le premier NSG jusqu'à la première règle qui correspond et, si elle autorise, faites de même dans le second NSG. N'oubliez pas les règles par défaut en fin de liste.

Exemple commenté. NSG du sous-réseau : `100 Allow TCP 443 depuis Internet`, `200 Deny TCP 3389 depuis Any`. NSG de l'interface : `100 Allow TCP 3389 depuis 10.0.9.0/24`, aucune règle pour 443.

| Flux | Résultat | Pourquoi |
| --- | --- | --- |
| HTTPS depuis internet | **Refusé** | Autorisé par le NSG du sous-réseau, mais dans le NSG de l'interface rien ne correspond avant DenyAllInBound |
| RDP depuis 10.0.9.4 (même réseau virtuel) | **Refusé** | La règle 200 du NSG du sous-réseau correspond d'abord ; le NSG de l'interface n'est jamais évalué |
| TCP 1433 depuis 10.0.9.4 | **Autorisé** | Aucune règle personnalisée ne correspond ; AllowVNetInBound l'autorise dans les deux NSG |

Pièges :

- Un NSG de sous-réseau filtre aussi le trafic **entre machines du même sous-réseau**.
- Une règle de refus personnalisée couvrant la source `Any` bloque aussi les **sondes d'intégrité de l'équilibreur de charge** et Azure Bastion, car elle est évaluée avant les règles d'autorisation par défaut.
- Le point de terminaison public d'un service Azure d'une autre région appartient à `Internet`, pas à l'étiquette régionale que vous avez autorisée.

Pour voir le résultat sans calcul : **Règles de sécurité effectives** sur l'interface réseau (machine en marche), `az network nic list-effective-nsg`, `Get-AzEffectiveNetworkSecurityGroup`, ou la **vérification du flux IP** pour un flux précis.

<!-- section: bastion | objectives: 4.2.3 -->
## Azure Bastion

Azure Bastion donne un accès RDP et SSH aux machines virtuelles **depuis le portail Azure, en TLS (443)**, en utilisant leurs adresses IP **privées**. Les machines n'ont besoin ni d'adresse IP publique ni de port RDP ou SSH ouvert sur internet.

Prérequis d'un déploiement dédié (Basic et supérieurs) :

- Un sous-réseau nommé exactement **`AzureBastionSubnet`**, en **/26 ou plus grand**, dans le réseau virtuel.
- Une **adresse IP publique Standard statique** pour l'hôte bastion (sauf déploiement Premium privé uniquement).
- Un seul Bastion dessert les machines de son réseau virtuel et des réseaux virtuels **appairés**.

| SKU | Ce qu'il ajoute |
| --- | --- |
| **Developer** | Gratuit, infrastructure partagée, **ni sous-réseau dédié ni IP publique**, une connexion à la fois, pas de prise en charge du peering |
| **Basic** | Hôte dédié (2 instances), connexions par le portail, réseaux appairés, clés SSH Linux depuis Key Vault |
| **Standard** | Mise à l'échelle de l'hôte (2 à 50 instances), **client natif** (`az network bastion rdp` / `ssh` / `tunnel`), **transfert de fichiers**, **connexion basée sur IP** (machines locales), **liens partageables**, ports personnalisés, RDP vers Linux et SSH vers Windows |
| **Premium** | **Enregistrement des sessions**, déploiement **privé uniquement** |

Un SKU peut être mis à niveau sur place, pas rétrogradé.

Si un NSG est associé à `AzureBastionSubnet`, il doit autoriser en entrée le port 443 depuis `Internet` et `GatewayManager` ainsi que depuis `AzureLoadBalancer`, plus les ports internes de Bastion et les règles sortantes requises. Sur les sous-réseaux cibles, autorisez 3389 et 22 **depuis la plage d'AzureBastionSubnet**.

Pour se connecter, un utilisateur a besoin du rôle Reader sur la machine virtuelle, sur son interface réseau et sur la ressource Bastion.

> **Piège d'examen.** Une machine de rebond avec IP publique, une règle NAT d'équilibreur de charge public ou une règle de NSG limitée à l'IP d'un bureau exposent toutes un port sur internet. Quand l'exigence dit « aucune adresse IP publique sur les machines virtuelles » et « depuis le portail Azure », la réponse est Azure Bastion.

<!-- section: service-endpoints | objectives: 4.2.4 -->
## Points de terminaison de service

Un **point de terminaison de service** s'active sur un **sous-réseau** pour un service (`Microsoft.Storage`, `Microsoft.Sql`, `Microsoft.KeyVault`, `Microsoft.Web`...). Le trafic de ce sous-réseau vers le service reste alors sur le réseau principal d'Azure et arrive **avec l'identité du sous-réseau**, ce qui permet au pare-feu du service de n'accepter que ce sous-réseau.

Deux étapes :

1. Sur le sous-réseau : activer le point de terminaison de service pour le service.
2. Sur la ressource (compte de stockage, serveur SQL, coffre de clés) : ajouter une **règle de réseau virtuel** pour le sous-réseau et régler l'action par défaut sur Deny.

Ce qu'un point de terminaison de service est, et n'est pas :

- Le service garde son **adresse IP publique** et son nom DNS public ; rien ne change dans le DNS.
- L'adresse source vue par le service devient l'adresse **privée** de la machine : les règles IP existantes fondées sur l'ancienne adresse publique ne correspondent plus.
- Il ne fonctionne que depuis le sous-réseau : **pas depuis le réseau local**, ni depuis les réseaux appairés (activez-le aussi sur leurs sous-réseaux).
- **Aucun coût supplémentaire.**
- Pour Azure SQL Database (`Microsoft.Sql`), le réseau virtuel doit être dans la même région que le serveur ; la plupart des autres services acceptent des sous-réseaux de toute région.
- Une **stratégie de point de terminaison de service** (Stockage Azure) limite le sous-réseau aux seuls comptes de stockage listés, pour empêcher l'exfiltration de données vers d'autres comptes.

```bash
az network vnet subnet update -g RG1 --vnet-name VNet1 -n app \
  --service-endpoints Microsoft.Storage Microsoft.KeyVault
```

<!-- section: private-endpoints | objectives: 4.2.5 -->
## Points de terminaison privés

Un **point de terminaison privé** est une interface réseau dotée d'une **adresse IP privée de votre sous-réseau**, connectée par Azure Private Link à une ressource précise. La ressource devient joignable à l'intérieur de votre réseau, et son accès public peut être désactivé.

| | Point de terminaison de service | Point de terminaison privé |
| --- | --- | --- |
| Adresse du service | Publique | **Privée**, dans votre sous-réseau |
| Portée | Tout le service ; filtré par le pare-feu de la ressource | **Une ressource**, une sous-ressource |
| Depuis le réseau local (VPN, ExpressRoute) et les réseaux appairés | Non | **Oui** |
| Changement DNS | Aucun | **Obligatoire** (zone DNS privée) |
| Accès public désactivable | Non | Oui |
| Coût | Gratuit | Facturé à l'heure et au Go |

Points testés :

- Un point de terminaison privé par **sous-ressource** : `blob`, `file`, `dfs`, `web` pour le stockage ; `vault` pour Key Vault ; `sqlServer` pour Azure SQL ; `sites` pour App Service.
- **DNS.** Le nom public devient un CNAME vers un nom `privatelink` : `stor1.blob.core.windows.net` → `stor1.privatelink.blob.core.windows.net`. Une **zone DNS privée** `privatelink.blob.core.windows.net`, **liée à chaque réseau virtuel qui doit résoudre le nom**, renvoie l'adresse IP privée. Les clients gardent la même URL et la même chaîne de connexion. Depuis le réseau local, le DNS local doit transférer ces noms vers Azure (redirecteur DNS ou Azure DNS Private Resolver).
- Zones courantes : `privatelink.blob.core.windows.net`, `privatelink.file.core.windows.net`, `privatelink.vaultcore.azure.net`, `privatelink.database.windows.net`, `privatelink.azurewebsites.net`, `privatelink.azurecr.io`.
- **Approbation.** *Automatique* si vous avez des autorisations sur la ressource ; sinon *manuelle* : la connexion reste **Pending** jusqu'à l'approbation du propriétaire de la ressource.
- Les NSG et les tables de routage ne s'appliquent aux points de terminaison privés que si les **stratégies réseau** sont activées sur le sous-réseau.
- Un point de terminaison privé ne ferme pas à lui seul le point de terminaison public : réglez aussi l'accès réseau public sur Désactivé.
- Votre propre service, derrière un équilibreur de charge Standard, peut être publié avec un **service Private Link**.

```bash
az network private-endpoint create -g RG1 -n pe-stor1-blob --vnet-name VNet1 --subnet data \
  --private-connection-resource-id <storage account ID> --group-id blob --connection-name stor1-blob
az network private-dns zone create -g RG1 -n privatelink.blob.core.windows.net
az network private-dns link vnet create -g RG1 -n link-vnet1 \
  --zone-name privatelink.blob.core.windows.net --virtual-network VNet1 --registration-enabled false
```

<!-- section: key-points -->
## Points clés

- Règles de NSG : priorité de 100 à 4096, la première correspondance l'emporte, avec état. Par défaut : refus de l'entrant depuis internet, autorisation à l'intérieur du réseau virtuel et en sortie.
- Entrant : NSG du sous-réseau puis NSG de l'interface ; sortant : l'inverse ; les deux doivent autoriser.
- `VirtualNetwork` inclut les plages appairées et locales. Les membres d'un ASG doivent être dans un seul réseau virtuel.
- Bastion : `AzureBastionSubnet` en /26, IP publique Standard ; client natif, connexion basée sur IP et liens partageables demandent Standard ; l'enregistrement des sessions demande Premium.
- Point de terminaison de service : identité du sous-réseau, adresse publique inchangée, gratuit, pas depuis le réseau local.
- Point de terminaison privé : adresse privée, une sous-ressource, zone DNS privée `privatelink.*` liée aux réseaux virtuels, fonctionne depuis le réseau local.
