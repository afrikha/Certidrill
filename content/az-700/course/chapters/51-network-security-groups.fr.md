Un groupe de sécurité réseau (NSG) est un filtre avec état des couches 3 et 4, composé de règles d'autorisation et de refus, associé à des sous-réseaux et à des interfaces réseau. Les groupes de sécurité d'application (ASG) permettent à ces règles de cibler des groupes de machines virtuelles par rôle plutôt que par adresse IP. Les questions d'examen donnent un tableau de règles NSG et d'associations, puis demandent si un flux est autorisé, quelle règle décide, ou quelle règle, priorité ou association ajouter.

<!-- section: create-nsg | objectives: 5.1.1 -->
## Créer un groupe de sécurité réseau

Un NSG est une ressource régionale. Outre vos propres règles, il contient six **règles de sécurité par défaut** que vous ne pouvez pas supprimer mais que vous pouvez remplacer, car elles ont les priorités les plus basses :

| Sens | Nom | Priorité | Source | Destination | Accès |
| --- | --- | --- | --- | --- | --- |
| Entrant | AllowVNetInBound | 65000 | VirtualNetwork | VirtualNetwork | Allow |
| Entrant | AllowAzureLoadBalancerInBound | 65001 | AzureLoadBalancer | Any | Allow |
| Entrant | DenyAllInbound | 65500 | Any | Any | Deny |
| Sortant | AllowVnetOutBound | 65000 | VirtualNetwork | VirtualNetwork | Allow |
| Sortant | AllowInternetOutBound | 65001 | Any | Internet | Allow |
| Sortant | DenyAllOutBound | 65500 | Any | Any | Deny |

Conséquences : sans règle personnalisée, tout ce qui se trouve dans le réseau virtuel (y compris les réseaux reliés par peering et les plages locales connectées, qui font partie de l'étiquette **VirtualNetwork**) peut communiquer, les sondes d'intégrité d'Azure Load Balancer entrent, tout autre trafic entrant est refusé et le trafic sortant vers internet est autorisé.

Un NSG est **avec état** : un enregistrement de flux est conservé pour chaque connexion, de sorte que le trafic de retour d'un flux autorisé passe sans règle dans l'autre sens. Les règles ne s'appliquent qu'aux **nouvelles** connexions : supprimer la règle qui autorisait une session SSH ne coupe pas la session ouverte.

```bash
az network nsg create \
  --resource-group RG-Network \
  --name nsg-web \
  --location westeurope
```

```powershell
New-AzNetworkSecurityGroup -Name nsg-web -ResourceGroupName RG-Network -Location westeurope
```

> **Piège d'examen.** L'adresse IP virtuelle de l'hôte, **168.63.129.16**, et 169.254.169.254 (DHCP, DNS, métadonnées d'instance, supervision de l'intégrité) ne sont pas filtrées par vos règles NSG, sauf si vous les ciblez avec les étiquettes de service dédiées (`AzurePlatformDNS`, `AzurePlatformIMDS`, `AzurePlatformLKM`). Une règle « tout refuser » ne casse pas la résolution DNS par Azure DNS. Les sondes d'intégrité d'Azure Load Balancer, qui viennent aussi de 168.63.129.16, font exception : les NSG doivent les autoriser (étiquette `AzureLoadBalancer`, règle par défaut 65001), si bien qu'avec une règle personnalisée qui refuse tout le trafic entrant, les instances du pool principal sont marquées comme indisponibles.

<!-- section: nsg-rules | objectives: 5.1.5 -->
## Créer des règles de sécurité entrantes et sortantes

Chaque règle a ces propriétés :

| Propriété | Valeurs |
| --- | --- |
| Priorité | 100 à 4096 ; le plus petit nombre est évalué en premier ; le traitement s'arrête à la première correspondance. Deux règles ne peuvent pas avoir la même priorité et le même sens |
| Source / destination | Any, une adresse IP, une plage CIDR, plusieurs adresses et plages (règle augmentée), une étiquette de service ou un groupe de sécurité d'application |
| Port source / de destination | Any, un port, une plage (`10000-10005`) ou une liste (`80,443,8080`) |
| Protocole | Any, TCP, UDP, ICMP (ESP et AH ne sont pas disponibles dans le portail) |
| Sens | Entrant ou sortant |
| Action | Allow ou Deny |

Ce que l'examen vérifie :

- Les **règles de sécurité augmentées** combinent plusieurs adresses IP, plages et ports dans une même règle, mais une règle ne peut pas citer plusieurs étiquettes de service.
- Pour le trafic **entrant** venant d'internet, le NSG voit la destination **après** la NAT : écrivez les règles avec l'adresse IP **privée** de la machine virtuelle, pas son adresse IP publique. Pour le trafic sortant, les règles sont évaluées avant la traduction vers l'adresse publique.
- Derrière un équilibreur de charge, la source est le client d'origine et la destination est la machine virtuelle, pas la configuration frontale de l'équilibreur.
- Les **étiquettes de service** remplacent des listes d'adresses Microsoft que Microsoft tient à jour pour vous :

| Étiquette de service | Représente |
| --- | --- |
| `VirtualNetwork` | L'espace d'adressage du réseau virtuel, les réseaux reliés par peering, les plages locales connectées par une passerelle, et 168.63.129.16 |
| `Internet` | Les adresses hors du réseau virtuel joignables sur internet, adresses publiques d'Azure comprises |
| `AzureLoadBalancer` | Les sondes d'intégrité de l'infrastructure Azure (168.63.129.16), pas le trafic des clients |
| `Storage`, `Sql`, `AzureCloud` | Les adresses publiques d'un service ; des variantes régionales comme `Storage.WestEurope` existent |
| `AzureFrontDoor.Backend` | Les adresses qu'Azure Front Door utilise pour joindre les origines |
| `GatewayManager` | Le trafic de gestion de VPN Gateway et d'Application Gateway |

```bash
# Allow HTTPS from the internet to the web subnet's servers
az network nsg rule create \
  --resource-group RG-Network \
  --nsg-name nsg-web \
  --name Allow-HTTPS-Internet \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges "*" \
  --destination-address-prefixes 10.1.1.0/24 \
  --destination-port-ranges 443

# Block outbound internet access except Azure Storage
az network nsg rule create --resource-group RG-Network --nsg-name nsg-web \
  --name Allow-Storage-Out --priority 200 --direction Outbound --access Allow \
  --protocol "*" --destination-address-prefixes Storage --destination-port-ranges "*"
az network nsg rule create --resource-group RG-Network --nsg-name nsg-web \
  --name Deny-Internet-Out --priority 300 --direction Outbound --access Deny \
  --protocol "*" --destination-address-prefixes Internet --destination-port-ranges "*"
```

Exemple. NSG1 sur Subnet1 (10.1.1.0/24) contient : 100 Allow TCP 3389 depuis 203.0.113.0/24 ; 200 Deny TCP 3389 depuis Any ; 300 Allow TCP 443 depuis Internet.

| Flux vers VM1 (10.1.1.4) | Résultat | Règle décisive |
| --- | --- | --- |
| RDP depuis 203.0.113.10 | Autorisé | 100 |
| RDP depuis VM2 dans un réseau virtuel relié par peering | Refusé | 200 (évaluée avant AllowVNetInBound à 65000) |
| HTTPS depuis un client sur internet | Autorisé | 300 |
| HTTP (80) depuis un client sur internet | Refusé | DenyAllInbound |
| SQL (1433) depuis VM3 dans le même réseau virtuel | Autorisé | AllowVNetInBound |

> **Piège d'examen.** Pour bloquer le trafic entre les sous-réseaux d'un même réseau virtuel, une règle de refus est nécessaire : **AllowVNetInBound** l'autorise par défaut. Sa priorité, 65000, fait que toute règle personnalisée de 100 à 4096 l'emporte sur elle.

<!-- section: associate-nsg | objectives: 5.1.2 -->
## Associer un NSG à un sous-réseau ou à une interface réseau

Un NSG peut être associé à des **sous-réseaux** et à des **interfaces réseau**. Un sous-réseau ou une interface réseau a au plus un NSG, mais un même NSG peut être réutilisé par de nombreux sous-réseaux et interfaces. Un NSG associé à un sous-réseau doit se trouver dans le même abonnement et la même région que le réseau virtuel.

Quand les deux niveaux ont un NSG, le trafic doit être autorisé par **les deux** :

| Sens | Ordre d'évaluation |
| --- | --- |
| Entrant | NSG du sous-réseau, puis NSG de l'interface réseau |
| Sortant | NSG de l'interface réseau, puis NSG du sous-réseau |

Si le premier NSG refuse le trafic, le second ne le voit jamais. Le trafic entre deux machines virtuelles du **même sous-réseau** est filtré de la même façon : un NSG de sous-réseau qui refuse tout les isole l'une de l'autre.

| Situation | Résultat pour le trafic entrant d'internet sur TCP 80 |
| --- | --- |
| Le NSG du sous-réseau autorise 80, le NSG de la carte réseau n'a que les règles par défaut | Refusé par DenyAllInbound du NSG de la carte réseau |
| Le NSG du sous-réseau autorise 80, la carte réseau n'a pas de NSG | Autorisé |
| Le sous-réseau n'a pas de NSG, le NSG de la carte réseau autorise 80 | Autorisé |
| Aucun NSG, machine virtuelle avec une adresse IP publique Standard | Refusé : les adresses IP publiques Standard sont sécurisées par défaut |

```bash
# Associate with a subnet
az network vnet subnet update \
  --resource-group RG-Network \
  --vnet-name VNet-App \
  --name snet-web \
  --network-security-group nsg-web

# Associate with a network interface
az network nic update \
  --resource-group RG-App \
  --name vm-web1-nic \
  --network-security-group nsg-web
```

Pour dissocier, sélectionnez **Aucun** dans le paramètre de NSG de l'interface ou du sous-réseau, ou passez `--network-security-group null` à `az network vnet subnet update`. Avant d'associer un NSG à un sous-réseau qui héberge un service de plateforme (Application Gateway, Azure Bastion, SQL Managed Instance, App Service Environment), vérifiez les ports exigés par ce service.

Pour vérifier le résultat, utilisez les **règles de sécurité effectives** d'une interface réseau : elles fusionnent les règles des NSG du sous-réseau et de l'interface. La **vérification du flux IP** de Network Watcher teste un flux et nomme la règle décisive.

> **Conseil d'examen.** Microsoft recommande d'associer un NSG au sous-réseau **ou** à l'interface réseau, pas aux deux, pour éviter les conflits. Les NSG au niveau du sous-réseau passent mieux à l'échelle ; ceux au niveau de l'interface conviennent aux exceptions pour une seule machine virtuelle.

<!-- section: application-security-groups | objectives: 5.1.3, 5.1.4 -->
## Créer et associer des groupes de sécurité d'application

Un **groupe de sécurité d'application** est un groupe nommé de configurations IP d'interfaces réseau, comme `asg-web`, `asg-app` et `asg-db`. Les règles NSG l'utilisent comme source ou destination : un nouveau serveur web est protégé dès que son interface réseau rejoint `asg-web`, sans modifier de règle ni d'adresse IP.

Créez l'ASG, puis ajoutez-y la configuration IP de chaque interface réseau :

```bash
az network asg create \
  --resource-group RG-App \
  --name asg-web \
  --location westeurope

az network nic ip-config update \
  --resource-group RG-App \
  --nic-name vm-web1-nic \
  --name ipconfig1 \
  --application-security-groups asg-web

az network nsg rule create \
  --resource-group RG-Network \
  --nsg-name nsg-app \
  --name Allow-HTTPS-to-Web \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --destination-asgs asg-web \
  --destination-port-ranges 443
```

Dans le portail, une interface réseau s'ajoute à un ASG depuis la page **Mise en réseau** de la machine virtuelle (onglet **Groupes de sécurité d'application**) ; cela ne fonctionne que pour une interface attachée à une machine virtuelle. Azure CLI et PowerShell peuvent aussi attribuer des ASG à la création de l'interface.

Contraintes :

- Toutes les interfaces réseau d'un ASG doivent se trouver dans le **même réseau virtuel** que la première interface qui y a été ajoutée.
- Un ASG doit se trouver dans la même région que les interfaces réseau qu'il contient.
- Quand une règle utilise des ASG comme source et comme destination, les deux ASG doivent contenir des interfaces du même réseau virtuel.
- Une configuration IP d'interface réseau peut appartenir à 20 ASG au maximum.
- Une règle qui fait référence à un ASG ne s'applique qu'aux membres de cet ASG, même si le NSG est associé à tout le sous-réseau.
- Les points de terminaison privés peuvent aussi être membres d'un ASG ; les règles ne s'appliquent alors que si la stratégie réseau des points de terminaison privés de leur sous-réseau est activée.

Exemple de stratégie à trois niveaux dans un seul NSG associé aux deux sous-réseaux :

| Priorité | Source | Destination | Port | Accès |
| --- | --- | --- | --- | --- |
| 100 | Internet | asg-web | TCP 443 | Allow |
| 110 | asg-app | asg-db | TCP 1433 | Allow |
| 120 | Any | asg-db | 1433, tout protocole | Deny |

La règle 120 est nécessaire, car **AllowVNetInBound** laisserait sinon toute machine virtuelle du réseau virtuel atteindre les serveurs de base de données.

> **Piège d'examen.** Les ASG ne s'étendent pas sur plusieurs réseaux virtuels. Si les serveurs web sont dans VNet1 et les serveurs de base de données dans un VNet2 relié par peering, une règle de `asg-web` vers `asg-db` est impossible : utilisez des plages IP ou des étiquettes de service pour la règle entre réseaux.

<!-- section: key-points -->
## Points clés

- Six règles par défaut (65000, 65001, 65500 dans chaque sens) : trafic du réseau virtuel autorisé, sondes de l'équilibreur de charge autorisées, sortie vers internet autorisée, tout le reste refusé.
- Priorité de 100 à 4096, le plus petit nombre d'abord, la première correspondance l'emporte ; les NSG sont avec état et n'affectent que les nouvelles connexions.
- En entrée : NSG du sous-réseau, puis NSG de la carte réseau ; en sortie : NSG de la carte réseau, puis NSG du sous-réseau ; les deux doivent autoriser.
- Les règles entrantes utilisent les adresses IP privées (après NAT) ; les étiquettes de service remplacent les listes d'adresses Microsoft.
- Les ASG regroupent des configurations IP de cartes réseau d'un même réseau virtuel ; les règles qui y font référence suivent automatiquement les membres.
