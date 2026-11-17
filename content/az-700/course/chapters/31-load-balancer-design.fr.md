Azure Load Balancer répartit les flux TCP et UDP au niveau de la couche 4. Les questions de conception décrivent une charge de travail (protocole, exposée à internet ou privée, une région ou plusieurs, appliances à insérer) et demandent quel équilibreur de charge, quel SKU, quel niveau et quel type d'adresse frontale répondent aux exigences, souvent avec Application Gateway, Front Door et Traffic Manager comme distracteurs.

<!-- section: lb-capabilities | objectives: 3.1.1 -->
## Fonctionnalités et capacités

Load Balancer est un service **pass-through** : il ne termine pas les connexions, ne lit pas le HTTP et ne modifie pas l'adresse IP du client que voit le back-end. Il hache chaque nouveau flux vers une instance saine du back-end et maintient le flux sur cette instance. Il monte jusqu'à des millions de flux et n'a pas de limite de débit propre (les limites des machines virtuelles s'appliquent).

| Composant | Rôle |
| --- | --- |
| Configuration IP frontale | L'adresse à laquelle les clients se connectent. Une adresse IP publique crée un équilibreur de charge **public**, une adresse IP privée un équilibreur de charge **interne**. Un équilibreur de charge peut avoir plusieurs adresses frontales |
| Pool principal | Les machines virtuelles ou instances de groupe identique qui reçoivent le trafic, ajoutées par carte réseau ou par adresse IP, toutes dans **un seul réseau virtuel** |
| Sonde d'intégrité | Décide quelles instances reçoivent les nouveaux flux (TCP, HTTP ou HTTPS) |
| Règle d'équilibrage de charge | Associe une adresse IP et un port frontaux à un port sur **toutes** les instances saines d'un pool principal |
| Règle Ports HA | Une règle d'équilibrage de charge avec le protocole `All` et le port `0` : tous les flux TCP et UDP sur tous les ports. Équilibreur de charge interne uniquement |
| Règle NAT entrante | Associe une adresse IP et un port frontaux à **une seule** instance du back-end (réacheminement de port) |
| Règle de trafic sortant | Définit la traduction d'adresses réseau sources (SNAT) du pool principal vers les adresses IP publiques frontales |

Faites correspondre l'exigence à la fonctionnalité :

| Exigence | Fonctionnalité |
| --- | --- |
| Répartir du trafic TCP ou UDP entre des machines virtuelles | Règle d'équilibrage de charge |
| Garder un client sur la même instance | Persistance de session **Client IP** (2-tuple) ou **Client IP and protocol** (3-tuple) |
| Atteindre le port RDP ou SSH d'une VM précise via l'adresse frontale | Règle NAT entrante |
| Équilibrer tous les ports pour une paire de pare-feu | Règle Ports HA sur un équilibreur de charge interne |
| Réutiliser le même port de back-end dans plusieurs règles (écouteur SQL Server Always On, clustering) | IP flottante |
| Sortir une instance pour la mise à jour alors que sa sonde est encore saine | État administratif (admin state) **Down** |
| Prévenir le client et le serveur qu'un flux inactif a été abandonné | Réinitialisation TCP (TCP reset) à l'inactivité |
| Contrôler quelles adresses IP publiques et combien de ports SNAT les back-ends utilisent en sortie | Règle de trafic sortant |
| Insérer de manière transparente des appliances tierces devant un point de terminaison public | Gateway Load Balancer |
| Une seule adresse IP anycast statique devant plusieurs régions | Niveau Global (équilibreur de charge interrégions) |

Les modes de distribution, définis par règle (`loadDistribution`), se changent sans interruption de service :

| Portail : Persistance de session | Valeur d'API | Hachage | Effet |
| --- | --- | --- | --- |
| None | `Default` | 5-tuple : IP source, port source, IP de destination, port de destination, protocole | Une nouvelle connexion du même client peut atteindre une autre instance |
| Client IP | `SourceIP` | 2-tuple : IP source, IP de destination | Même IP client, même instance |
| Client IP and protocol | `SourceIPProtocol` | 3-tuple : ajoute le protocole | Un canal de contrôle TCP et un flux de données UDP d'un même client atteignent la même instance ; corrige Passerelle des services Bureau à distance (RD Gateway) |

L'état administratif remplace la sonde, par instance du pool principal : **Up** toujours éligible, **Down** aucune nouvelle connexion (les flux TCP établis continuent), **None** suit la sonde. Il exige une règle d'équilibrage de charge avec sonde et n'est pas pris en charge avec les règles NAT entrantes.

Limites qui orientent une conception (Standard) : 1 500 règles (équilibrage de charge plus NAT entrantes) par équilibreur de charge, 600 configurations IP frontales, 600 règles de trafic sortant, 5 000 instances par pool principal, 300 règles par carte réseau, une règle Ports HA par adresse frontale interne.

> **Piège d'examen.** Load Balancer ne peut pas terminer le TLS, router selon le chemin d'URL ou le nom d'hôte, réécrire des en-têtes ni héberger un WAF. Toute exigence de couche 7 désigne Application Gateway (régional) ou Front Door (global). Les règles d'équilibrage de charge et les règles NAT entrantes ne transportent que TCP et UDP ; l'ICMP ne passe que par une règle Ports HA sur un équilibreur de charge interne.

<!-- section: lb-use-cases | objectives: 3.1.2 -->
## Cas d'usage et alternatives

Les quatre services d'équilibrage de charge diffèrent par la couche et la portée :

| Service | Couche | Portée | Usage type |
| --- | --- | --- | --- |
| Azure Load Balancer | 4 (TCP, UDP) | Régionale, ou globale avec le niveau Global | Toute charge TCP ou UDP sur des VM et des groupes identiques, niveaux internes, haute disponibilité des NVA, SNAT sortant |
| Application Gateway | 7 (HTTP, HTTPS, plus proxy TCP/TLS) | Régionale | Applications web qui ont besoin d'un routage par chemin ou par hôte, du déchargement TLS, d'un WAF, de l'affinité par cookie |
| Front Door | 7 (HTTP, HTTPS) | Globale | Point d'entrée web global avec accélération, mise en cache et WAF |
| Traffic Manager | DNS | Globale | Orienter les clients vers des points de terminaison régionaux, y compris hors Azure, par priorité, poids, latence, géographie ou sous-réseau |

Choisissez Load Balancer quand :

- Le protocole n'est pas HTTP : SQL Server, SMTP, un service TCP personnalisé, DNS ou syslog sur UDP, jeu ou média sur UDP.
- Un niveau doit être joignable uniquement en privé : depuis d'autres sous-réseaux, des réseaux virtuels appairés, ou l'environnement local via VPN ou ExpressRoute.
- Des appliances virtuelles réseau (pare-feu, SD-WAN) ont besoin d'une haute disponibilité actif-actif : équilibreur de charge interne avec une règle Ports HA comme tronçon suivant des itinéraires définis par l'utilisateur.
- La latence la plus faible compte : pas de proxy, l'adresse IP du client est conservée.
- Les VM du back-end ont besoin d'un accès internet sortant explicite via des adresses IP publiques partagées (règles de trafic sortant), quand une passerelle NAT n'est pas utilisée.

Les services se combinent : Front Door ou Traffic Manager entre les régions, puis Application Gateway ou Load Balancer dans chaque région.

Limites de conception :

- Toutes les adresses frontales et instances du back-end d'un équilibreur de charge sont dans **un seul réseau virtuel** ; une règle ne peut pas couvrir deux réseaux virtuels.
- Un pool principal ne peut pas contenir de point de terminaison privé, d'autre équilibreur de charge ni d'Application Gateway. Les pools basés sur l'adresse IP n'acceptent que des machines virtuelles et des instances de groupe identique.
- Une VM du back-end ne peut pas joindre l'adresse frontale de l'équilibreur de charge interne qui la sert : le flux échoue.
- Les fragments IP ne sont pas transférés.
- Avec des pools basés sur la carte réseau, un groupe à haute disponibilité ne peut être derrière qu'un équilibreur de charge public et un équilibreur de charge interne.

> **Conseil d'examen.** « Équilibrer RDP vers une VM », « SQL Server », « UDP », « tous les ports » ou « conserver l'adresse IP du client » désignent Load Balancer. « Chemin d'URL », « en-tête d'hôte », « déchargement SSL », « cookie » ou « WAF » désignent Application Gateway.

<!-- section: lb-sku | objectives: 3.1.3 -->
## SKU et niveaux

Basic Load Balancer a été **retiré le 30 septembre 2025**. Deux SKU restent, chacun pour son scénario :

| SKU | Objectif |
| --- | --- |
| Standard | Équilibrage de charge de couche 4 général, public ou interne, régional ou global |
| Gateway | Insertion transparente d'appliances virtuelles réseau tierces, chaînée à une adresse frontale publique Standard ou à la configuration IP publique d'une VM |

Standard comparé au SKU Basic retiré, puisque l'examen les oppose encore :

| Capacité | Standard | Basic (retiré) |
| --- | --- | --- |
| Pool principal | Toutes VM ou groupes identiques d'un réseau virtuel, par carte réseau ou par adresse IP | VM d'un groupe à haute disponibilité ou d'un groupe identique, par carte réseau |
| Sondes d'intégrité | TCP, HTTP, HTTPS | TCP, HTTP |
| Toutes les sondes en échec | Les flux TCP établis continuent | Tous les flux TCP se terminent |
| Zones de disponibilité | Adresses frontales redondantes interzone ou zonales | Non |
| Accès entrant | **Fermé par défaut** : un NSG doit l'autoriser | Ouvert |
| Ports HA, règles de trafic sortant, TCP reset à l'inactivité | Oui | Non |
| SKU de l'adresse IP publique frontale | Standard | Basic |
| SLA | 99,99 % | Aucun |
| Niveau Global, passerelle NAT, service Private Link, accès par peering global | Oui | Non |

Une machine virtuelle, un groupe à haute disponibilité ou un groupe identique ne peut référencer qu'un seul SKU d'équilibreur de charge. Un équilibreur de charge Standard peut être déplacé vers un autre groupe de ressources mais pas vers un autre abonnement. Les équilibreurs de charge Basic existants se migrent avec le module PowerShell `AzureBasicLoadBalancerUpgrade` :

```powershell
Install-Module -Name AzureBasicLoadBalancerUpgrade -Scope CurrentUser -Repository PSGallery -Force
Start-AzBasicLoadBalancerUpgrade -ResourceGroupName RG1 -BasicLoadBalancerName lb-basic -validateScenarioOnly:$true
Start-AzBasicLoadBalancerUpgrade -ResourceGroupName RG1 -BasicLoadBalancerName lb-basic
```

Le **niveau** est le second choix. **Regional** (par défaut) sert des back-ends dans une région. **Global** est un équilibreur de charge public dont le pool principal contient des équilibreurs de charge régionaux (voir la dernière section).

Les zones se choisissent sur chaque adresse frontale : **redondante interzone** (servie depuis toutes les zones, survit à la panne d'une zone), **zonale** (attachée à une zone, tombe avec elle) ou sans zone dans les régions qui n'en ont pas. Pour une adresse frontale publique, c'est l'adresse IP publique qui le décide.

> **Piège d'examen.** Des VM placées derrière un nouvel équilibreur de charge Standard ne répondent pas tant qu'un NSG sur leur sous-réseau ou leur carte réseau n'autorise pas le trafic des clients. La règle par défaut `AllowAzureLoadBalancerInBound` laisse entrer la sonde d'intégrité, pas les clients.

<!-- section: lb-public-internal | objectives: 3.1.4 -->
## Équilibreur de charge public ou interne

Le type d'adresse frontale fixe le type d'équilibreur de charge :

| | Équilibreur de charge public | Équilibreur de charge interne |
| --- | --- | --- |
| Adresse frontale | Adresse IP publique Standard (un préfixe d'adresses IP publiques uniquement pour les règles de trafic sortant) | Adresse IP privée d'un sous-réseau du réseau virtuel |
| Joignable depuis | Internet (sous réserve des NSG) | Le réseau virtuel, les réseaux virtuels appairés (y compris en peering global), l'environnement local via VPN ou ExpressRoute. Jamais depuis internet |
| Usage type | Service exposé à internet, réacheminement de port, SNAT sortant pour les back-ends | Niveau application ou données, application métier utilisée depuis l'environnement local, haute disponibilité des NVA avec Ports HA |
| Ports HA | Non | Oui |
| Connectivité sortante des back-ends | Par les règles de trafic sortant | Aucune : ajoutez une passerelle NAT, des adresses IP publiques au niveau de l'instance ou un équilibreur de charge public sortant uniquement |
| Service Private Link | Non | Oui (pool principal basé sur la carte réseau) |

Une conception multiniveau utilise les deux : un équilibreur de charge public devant le niveau web, un équilibreur de charge interne devant le niveau application. Les mêmes VM peuvent être dans le pool principal d'un équilibreur de charge public et d'un interne, par exemple un équilibreur de charge interne avec Ports HA pour le trafic est-ouest à travers des NVA et un public pour le trafic entrant d'internet.

```bash
# Internal load balancer: frontend in a subnet, no public IP address
az network lb create --resource-group RG1 --name lb-app --sku Standard \
  --vnet-name vnet-hub --subnet snet-app --private-ip-address 10.1.2.10 \
  --frontend-ip-name fe-app --backend-pool-name pool-app
```

> **Piège d'examen.** Le trafic de l'environnement local atteint un équilibreur de charge **interne** via la passerelle VPN ou ExpressRoute ; un équilibreur de charge public est inutile et exposerait le service. À l'inverse, un équilibreur de charge interne ne peut rien publier sur internet.

<!-- section: lb-regional-global | objectives: 3.1.5 -->
## Équilibreur de charge régional ou global (interrégions)

Learn appelle désormais l'équilibreur de charge interrégions **équilibreur de charge global** : un équilibreur de charge Standard du niveau **Global**.

| | Régional | Global (interrégions) |
| --- | --- | --- |
| Adresse frontale | Publique ou privée | Publique uniquement : une adresse IP publique Standard **anycast** statique du niveau Global, IPv4 ou IPv6 |
| Pool principal | VM et instances de groupe identique | Adresses frontales d'équilibreurs de charge **régionaux Standard publics**, jusqu'à 300 |
| Routage | Hachage vers une instance saine | Géoproximité : le client entre par la région participante la plus proche, puis atteint l'équilibreur de charge régional sain le plus proche via le réseau principal de Microsoft |
| Intégrité | Sondes d'intégrité sur les instances | Intégrité de chaque équilibreur de charge régional vérifiée toutes les 5 secondes ; une région à 0 % de disponibilité sort de la rotation |
| Règles de trafic sortant | Oui | Non : utilisez l'équilibreur de charge régional ou une passerelle NAT |

L'équilibreur de charge global conserve l'adresse IP du client (pass-through de couche 4) et prend en charge l'IP flottante. Il est déployé dans une **région d'origine** (home region, par exemple West Europe, North Europe, UK South, East US 2, Central US, West US, Southeast Asia, East Asia) ; la région d'origine n'influe pas sur le routage et sa panne n'arrête pas le trafic. Les équilibreurs de charge régionaux du back-end peuvent être dans n'importe quelle région publique.

Limitations :

- Pas d'adresse frontale interne, et pas d'équilibreur de charge interne dans le pool principal.
- L'adresse frontale et les back-ends utilisent la même version IP (pas de NAT64).
- Un équilibreur de charge régional ne peut pas être mis à niveau vers le niveau Global : créez-en un nouveau.
- Pas d'ICMP, pas d'UDP sur le port 3, pas de chaînage de Gateway Load Balancer.
- Le port de back-end de la règle globale doit correspondre au port frontal de la règle de chaque équilibreur de charge régional.

```bash
az network public-ip create --resource-group RG-Global --name pip-global \
  --sku Standard --tier Global --location westeurope
az network cross-region-lb create --resource-group RG-Global --name lb-global \
  --location westeurope --public-ip-address pip-global \
  --frontend-ip-name fe-global --backend-pool-name pool-regions
```

Choisir parmi les options globales :

| Exigence | Réponse |
| --- | --- |
| Application TCP ou UDP non HTTP dans plusieurs régions derrière une adresse IP statique, basculement instantané | Équilibreur de charge global |
| Orienter les utilisateurs par DNS vers des points de terminaison dans Azure et ailleurs, par priorité, poids, géographie ou sous-réseau | Traffic Manager |
| Point d'entrée HTTP(S) global avec WAF, mise en cache et routage par chemin | Front Door |

> **Piège d'examen.** Le basculement de Traffic Manager dépend de la mise en cache DNS (durée de vie, TTL) ; l'équilibreur de charge global garde une seule adresse IP anycast, donc les clients n'ont pas à résoudre une nouvelle adresse quand une région tombe.

<!-- section: key-points -->
## Points clés

- Load Balancer est un pass-through de couche 4 : TCP et UDP, IP du client conservée, pas de TLS, pas de routage par URL.
- Basic retiré le 30 septembre 2025 : les conceptions utilisent Standard (général) ou Gateway (insertion de NVA).
- Standard est fermé au trafic entrant tant qu'un NSG ne l'autorise pas.
- Adresse frontale publique pour les clients internet ; adresse frontale interne pour les niveaux privés, les clients locaux et les Ports HA.
- Les back-ends d'un équilibreur de charge interne n'ont pas d'accès internet sortant sauf si vous l'ajoutez.
- Niveau Global : adresse frontale anycast publique, pool principal d'équilibreurs de charge régionaux publics, pas de règles de trafic sortant, pas d'adresse frontale interne.
