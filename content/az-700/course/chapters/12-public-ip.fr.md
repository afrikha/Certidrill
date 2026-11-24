Une adresse IP publique est une ressource à part entière : elle a un SKU, une région et des zones, et elle est associée à une seule ressource à la fois. L'examen demande de quel type d'adresse une conception a besoin (une adresse isolée, un préfixe, votre propre plage) et ce qui doit concorder pour qu'une association réussisse.

<!-- section: public-ip-create | objectives: 1.1.9 -->
## Créer une adresse IP publique

Les adresses IP publiques de SKU Basic ont été retirées le 30 septembre 2025. Une conception choisit désormais entre deux SKU :

| Propriété | Standard | Standard v2 |
| --- | --- | --- |
| Allocation | Statique uniquement | Statique uniquement |
| Zones de disponibilité | Redondante interzone ou zonale (une seule zone) | Redondante interzone uniquement |
| Trafic entrant | Fermé tant qu'un NSG ne l'autorise pas | Fermé tant qu'un NSG ne l'autorise pas |
| Préférence de routage Internet | Prise en charge | Non prise en charge |
| Niveau global | Pris en charge | Non pris en charge |
| Association | Tout type de ressource qui accepte une adresse IP publique | Uniquement une passerelle NAT StandardV2 |

Paramètres choisis à la création :

| Paramètre | Valeurs et règles |
| --- | --- |
| Version IP | IPv4 ou IPv6. Une ressource par version : une adresse frontale à double pile utilise deux ressources d'adresse IP publique |
| SKU | Non modifiable après la création |
| Niveau (tier) | **Régional** (par défaut) ou **Global**. Une adresse de niveau global est une adresse anycast utilisée par un équilibreur de charge inter-régions ; elle n'a pas de zones de disponibilité |
| Attribution | Statique : l'adresse est allouée à la création de la ressource et n'est libérée qu'à sa suppression. Vous ne choisissez pas l'adresse, sauf à l'intérieur d'un préfixe |
| Zone de disponibilité | Redondante interzone (par défaut dans les régions dotées de zones ; seulement dans les régions qui ont trois zones actives) ou une zone. Dans une région sans zones de disponibilité, les adresses sont non zonales. Non modifiable après la création |
| Préférence de routage | **Réseau Microsoft** (par défaut) : le trafic reste le plus longtemps possible sur le réseau principal de Microsoft. **Internet** : le trafic passe le moins de temps possible sur le réseau Microsoft et emprunte les réseaux des FAI de transit, pour un coût de transfert de données plus bas. Non modifiable après la création |
| Délai d'inactivité | 4 à 30 minutes pour les flux d'origine entrante (4 par défaut) ; fixé à 4 minutes pour les flux sortants |
| Étiquette de nom DNS | Crée `<label>.<region>.cloudapp.azure.com` ; l'étiquette doit être unique dans la région |

L'adresse IP publique doit se trouver dans la même **région** et le même **abonnement** que la ressource à laquelle elle sera associée ; le groupe de ressources peut être différent.

```bash
az network public-ip create --resource-group RG1 --name pip-web --location westeurope \
  --sku Standard --version IPv4 --zone 1 2 3 --dns-name contoso-web

# Anycast address for a cross-region load balancer
az network public-ip create --resource-group RG1 --name pip-global \
  --sku Standard --tier Global --version IPv4

# Lower-cost egress through the transit ISP
az network public-ip create --resource-group RG1 --name pip-batch \
  --sku Standard --version IPv4 --zone 1 2 3 --ip-tags 'RoutingPreference=Internet'
```

```powershell
New-AzPublicIpAddress -ResourceGroupName RG1 -Name pip-web -Location westeurope `
  -Sku Standard -AllocationMethod Static -IpAddressVersion IPv4 -Zone 1,2,3 `
  -DomainNameLabel contoso-web
```

La préférence de routage Internet a ses propres limites : IPv4 uniquement, adresses Standard redondantes interzone uniquement, et seulement pour les machines virtuelles, les groupes de machines virtuelles identiques, AKS, les équilibreurs de charge publics dont le pool principal est basé sur des interfaces réseau, Application Gateway et le Pare-feu Azure. Elle est inutilisable avec une passerelle NAT.

> **Piège d'examen.** Une machine virtuelle qui reçoit une adresse IP publique Standard n'est pas encore joignable. L'adresse est sécurisée par défaut : un NSG sur le sous-réseau ou sur l'interface réseau doit autoriser le flux entrant.

<!-- section: public-ip-associate | objectives: 1.1.10 -->
## Associer des adresses IP publiques à des ressources

| Ressource | Où l'adresse est attachée | Règles |
| --- | --- | --- |
| Machine virtuelle | Une configuration IP d'une interface réseau | Une adresse IP publique par configuration IP ; ajoutez des configurations IP pour en avoir davantage |
| Équilibreur de charge public | Une configuration IP frontale | Une adresse isolée, ou un préfixe pour les règles de trafic sortant uniquement |
| Passerelle NAT | Adresses IP sortantes | Adresses et préfixes dans n'importe quelle combinaison, 16 adresses au maximum ; une passerelle NAT StandardV2 n'accepte que des adresses et des préfixes StandardV2 |
| Pare-feu Azure | Une configuration IP | Au moins une adresse ; jusqu'à 250 dans un réseau virtuel. Un préfixe ne peut pas être attaché, mais des adresses créées à partir d'un préfixe le peuvent |
| Application Gateway | Une configuration IP frontale | Une adresse Standard statique |
| Passerelle VPN | Une configuration IP de passerelle | Une adresse Standard statique, redondante interzone (les nouvelles passerelles de tous les SKU sauf Basic sont redondantes interzone), et une seconde en mode actif-actif ; un préfixe ne peut pas être attaché |
| Azure Bastion | La configuration IP publique de l'hôte | Non modifiable après la création. Inutilisée par le SKU Developer et par un déploiement en mode privé uniquement (private-only) |
| Azure Route Server | Une configuration IP frontale | Une adresse Standard statique |

Règles valables pour toute association :

- Même région et même abonnement pour l'adresse et la ressource.
- Déplacer une adresse Standard : vers un autre groupe de ressources même quand elle est attachée (sauf à une passerelle de réseau virtuel), vers un autre abonnement seulement une fois détachée de toute ressource, jamais vers une autre région.
- Une adresse est associée à une seule ressource à la fois. Dissociez-la avant de la réutiliser ou de la supprimer ; une adresse supprimée ne se récupère pas.
- Une adresse zonale partage le sort de sa zone. Donnez une adresse redondante interzone à une ressource redondante interzone.

```bash
# Associate an existing address with the IP configuration of a network interface
az network nic ip-config update --resource-group RG1 --nic-name vm1-nic --name ipconfig1 \
  --public-ip-address pip-web

# Dissociate it
az network nic ip-config update --resource-group RG1 --nic-name vm1-nic --name ipconfig1 \
  --public-ip-address null
```

Une adresse IP publique sur une interface réseau est aussi une méthode de sortie explicite pour cette machine virtuelle. Quand le sous-réseau a une passerelle NAT, celle-ci est prioritaire pour les connexions sortantes, devant les adresses IP publiques de niveau instance et devant les règles de trafic sortant d'un équilibreur de charge. Une passerelle NAT ne fournit jamais de connexions entrantes initiées depuis internet.

<!-- section: prefix-when | objectives: 1.1.7 -->
## Quand utiliser un préfixe d'adresse IP publique

Un **préfixe d'adresse IP publique** est une plage contiguë d'adresses IP publiques Standard qu'Azure vous réserve dans une région. Vous créez des adresses IP publiques statiques à partir de lui ; quand vous en supprimez une, l'adresse revient dans votre plage au lieu de retourner à Azure.

| Exigence | Réponse |
| --- | --- |
| Un partenaire doit autoriser vos adresses sortantes, et d'autres adresses s'ajouteront plus tard | Un préfixe : une seule règle de pare-feu couvre les adresses présentes et futures |
| Une passerelle NAT manque de ports SNAT | Attachez un préfixe : toute la plage sert aux connexions sortantes (16 adresses au maximum, donc /28) |
| Les règles de trafic sortant d'un équilibreur de charge Standard ont besoin de plusieurs adresses | Un préfixe comme adresse frontale, utilisé pour le trafic sortant uniquement |
| Chaque instance d'un groupe de machines virtuelles identiques a besoin de sa propre adresse publique | Un préfixe référencé par le groupe de machines virtuelles identiques |
| Le Pare-feu Azure a besoin de plusieurs adresses connues | Des adresses individuelles créées à partir d'un préfixe |
| Une adresse frontale, une adresse, aucune croissance | Une adresse IP publique isolée suffit |
| Des clients font déjà confiance à des adresses qui appartiennent à votre entreprise | Un préfixe d'adresse IP personnalisé |

Limites à retenir :

- Vous choisissez la taille, pas les adresses : c'est Azure qui choisit la plage.
- La taille ne peut pas être modifiée après la création. Prévoyez la croissance ou créez un autre préfixe.
- Les adresses issues du préfixe sont des adresses Standard statiques, dans la même région et le même abonnement que le préfixe.
- Le préfixe entier est décompté du quota d'adresses IP publiques de l'abonnement, avant même qu'une adresse en soit créée.
- Un préfixe ne peut pas être supprimé tant qu'une de ses adresses est associée à une ressource.

<!-- section: prefix-create | objectives: 1.1.6 -->
## Créer un préfixe d'adresse IP publique

| Taille du préfixe | Adresses |
| --- | --- |
| /28 (IPv4) ou /124 (IPv6) | 16 |
| /29 (IPv4) ou /125 (IPv6) | 8 |
| /30 (IPv4) ou /126 (IPv6) | 4 |
| /31 (IPv4) ou /127 (IPv6) | 2 |

/28 est la plus grande taille pour les plages appartenant à Microsoft, sauf si le support relève la limite. Paramètres : nom, région, version IP, SKU (Standard, ou Standard v2 pour une passerelle NAT StandardV2), propriété du préfixe (Microsoft ou personnalisé), taille et zones : dans une région dotée de zones de disponibilité, un préfixe est redondant interzone ou lié à une zone.

```bash
az network public-ip prefix create --resource-group RG1 --name ippre-nat --location westeurope \
  --length 28 --version IPv4 --sku Standard --zone 1 2 3

# A static address taken from the prefix
az network public-ip create --resource-group RG1 --name pip-nat-01 \
  --sku Standard --public-ip-prefix ippre-nat
```

```powershell
$prefix = New-AzPublicIpPrefix -ResourceGroupName RG1 -Name ippre-nat -Location westeurope `
  -PrefixLength 28 -Sku Standard -IpAddressVersion IPv4 -Zone 1,2,3
New-AzPublicIpAddress -ResourceGroupName RG1 -Name pip-nat-01 -Location westeurope `
  -Sku Standard -AllocationMethod Static -PublicIpPrefix $prefix
```

Azure ne distribue pas les adresses d'un préfixe dans l'ordre. Pour obtenir une adresse précise de la plage, ajoutez `--ip-address` (Azure CLI) ou `-IpAddress` (PowerShell) à la création de l'adresse IP publique.

> **Conseil d'examen.** Vous ne pouvez ni choisir la plage d'un préfixe ni le redimensionner. Si une conception a besoin d'adresses contiguës, créez d'abord le préfixe, à sa taille définitive, puis créez les adresses à partir de lui.

<!-- section: custom-prefix | objectives: 1.1.8 -->
## Les préfixes d'adresses IP personnalisés (BYOIP)

Un **préfixe d'adresse IP personnalisé** est une plage qui appartient à votre organisation et que vous autorisez Microsoft à publier. Il conserve la réputation de vos adresses et les listes d'autorisation qui les contiennent déjà. Il n'est jamais attaché à une ressource : vous en dérivez des préfixes d'adresses IP publiques, puis des adresses IP publiques.

Prérequis, en dehors d'Azure :

- La plage est inscrite à votre nom auprès d'un registre Internet régional (ARIN, RIPE NCC, APNIC, LACNIC ou AFRINIC) et n'est pas plus petite qu'un /24.
- Une **autorisation d'origine de route (ROA)** créée auprès du registre autorise l'AS d'origine **8075** (cloud public Microsoft) pour exactement le préfixe que vous apportez. Comptez 24 heures pour qu'elle soit visible par Microsoft.
- Un certificat auto-signé dont la partie publique est publiée dans les commentaires de l'enregistrement du registre. Avec sa clé privée, vous signez le message d'autorisation `subscriptionId|prefix|expirationDate`.

| Phase | Ce qui se passe | État |
| --- | --- | --- |
| Validation | Microsoft vérifie la ROA et le message signé par rapport à l'enregistrement du registre | - |
| Provisionnement | La ressource de préfixe d'adresse IP personnalisé est créée dans une région (environ 30 minutes). Des préfixes et des adresses IP publiques peuvent en être dérivés et attachés, mais ils ne sont pas publiés, donc pas joignables | `Provisioning`, puis `Provisioned` |
| Mise en service | La plage est publiée depuis la région Azure, puis par le WAN de Microsoft vers internet (3 à 4 heures) | `Commissioning`, puis `Commissioned` |

```bash
az network custom-ip prefix create --resource-group RG1 --name cip-contoso --location westeurope \
  --cidr 198.51.100.0/24 --zone 1 2 3 \
  --authorization-message "$byoipauth" --signed-message "$byoipauthsigned"

# Once the state is Provisioned: derive a public IP prefix
az network public-ip prefix create --resource-group RG1 --name ippre-byoip --location westeurope \
  --length 26 --custom-ip-prefix-name cip-contoso

# Start advertising the range
az network custom-ip prefix update --resource-group RG1 --name cip-contoso --state commission
```

Deux modèles d'intégration existent pour IPv4, et une plage ne passe pas de l'un à l'autre sans être entièrement déprovisionnée :

| Modèle | Plages | Usage |
| --- | --- | --- |
| Unifié | Une plage de /21 à /24, publiée par la région et par le WAN de Microsoft | Une plage utilisée dans une seule région |
| Global/régional | Une plage globale (parent) de /21 à /24, publiée par le WAN ; des plages régionales (enfants) de /22 à /26, plus petites d'au moins un niveau, publiées par leurs régions | Une plage répartie entre régions ou entre équipes. Seul le parent est validé ; les enfants peuvent être dans d'autres abonnements du même locataire |

Autres règles :

- Un préfixe d'adresse IP publique dérivé peut être aussi grand que le préfixe personnalisé, et peut se trouver dans un autre abonnement.
- Dans une région dotée de zones de disponibilité, le préfixe personnalisé est redondant interzone ou zonal ; il ne peut pas être créé sans zone.
- Les adresses dérivées d'un préfixe personnalisé ne prennent en charge ni la préférence de routage Internet ni le niveau global, et ne sont pas publiées sur le peering Microsoft d'ExpressRoute. Des préfixes Standard v2 ne peuvent pas en être dérivés.
- Pour migrer une plage active ailleurs, la **mise en service régionale** la publie uniquement à l'intérieur de la région Azure (état `CommissionedNoInternetAdvertise`) jusqu'à ce que vous soyez prêt à déplacer la publication vers internet.
- Le retrait se fait dans l'ordre inverse : supprimez les préfixes d'adresses IP publiques dérivés, mettez hors service (retour à `Provisioned`), déprovisionnez, puis supprimez. Mettez hors service avant de retirer la ROA.

> **Piège d'examen.** Une plage `Provisioned` n'est pas en service. Les adresses qui en sont dérivées peuvent déjà être attachées à des ressources, mais aucun trafic ne les atteint tant que le préfixe personnalisé n'est pas mis en service. Publier la même plage depuis votre propre réseau au même moment peut provoquer une instabilité du routage BGP ou une perte de trafic.

<!-- section: key-points -->
## Points clés

- Il ne reste que des SKU Standard : statiques, compatibles avec les zones, fermés au trafic entrant tant qu'un NSG ne l'autorise pas. Standard v2 n'existe que pour les passerelles NAT StandardV2.
- Adresse et ressource : même région, même abonnement ; le SKU, les zones, le niveau et la préférence de routage sont fixés à la création.
- Niveau global = équilibreur de charge inter-régions ; préférence de routage Internet = sortie moins chère, IPv4, pas avec une passerelle NAT.
- Tailles de préfixe de /28 à /31 (16 à 2 adresses) ; la taille et la plage ne se modifient pas ; le préfixe d'abord, les adresses ensuite.
- Passerelle NAT : 16 adresses au maximum, adresses et préfixes cumulés. Pare-feu Azure : jusqu'à 250 adresses, jamais un préfixe directement.
- BYOIP : ROA pour l'AS 8075, message signé, provisionnement (non publié), mise en service (publié). Modèle unifié pour une région, global/régional pour plusieurs.
