Les questions réseau de l'AZ-305 donnent des exigences (privé ou par Internet, chiffré ou non, couche 4 ou couche 7, une région ou plusieurs, coût le plus bas) et demandent quel service, quelle référence SKU ou quelle topologie recommander. Ce chapitre donne les règles de décision.

<!-- section: internet-connectivity | objectives: 4.4.1 -->
## Connecter les ressources Azure à Internet

Traitez la connectivité sortante et la connectivité entrante comme deux conceptions distinctes.

**Sortant.** Une machine virtuelle a besoin d'une méthode sortante explicite :

| Méthode | À recommander quand | À retenir |
| --- | --- | --- |
| Azure NAT Gateway sur le sous-réseau | Réponse par défaut : adresses IP sortantes prévisibles et pas d'épuisement des ports SNAT | Jusqu'à 16 adresses IPv4 publiques ; sortant uniquement ; une seule par sous-réseau ; ne s'étend pas sur plusieurs réseaux virtuels ; prioritaire sur les règles de trafic sortant d'un équilibreur de charge et sur les adresses IP publiques d'instance |
| Règles de trafic sortant d'un équilibreur de charge public Standard | Les machines sont déjà derrière cet équilibreur de charge | Vous dimensionnez vous-même les ports SNAT |
| Adresse IP publique Standard sur l'interface réseau | Une machine a besoin de sa propre adresse, en entrée et en sortie | Expose la machine ; ne passe pas à l'échelle |
| Pare-feu Azure ou appliance virtuelle réseau (NVA), atteints par un itinéraire défini par l'utilisateur `0.0.0.0/0` | Le trafic sortant doit être inspecté, filtré par FQDN ou journalisé de façon centralisée | Associez une passerelle NAT au sous-réseau du pare-feu quand celui-ci a besoin de plus de ports SNAT |

La référence SKU Standard de la passerelle NAT est zonale (une seule zone de disponibilité). **StandardV2** est redondante interzone et exige des adresses IP publiques StandardV2.

L'**accès sortant par défaut** (une adresse IP implicite, détenue par Microsoft, qui peut changer sans préavis) n'est plus une option de conception : avec les versions d'API publiées après le 31 mars 2026, les sous-réseaux des nouveaux réseaux virtuels sont **privés** par défaut. Les réseaux virtuels existants ne sont pas modifiés.

> **Piège d'examen.** Une passerelle NAT n'accepte jamais de connexion entrante non sollicitée. Pour publier un service, il faut toujours une adresse IP publique, un équilibreur de charge, Application Gateway, Azure Front Door ou une règle DNAT du Pare-feu Azure.

**Entrant.**

| Exigence | À recommander |
| --- | --- |
| Publier une application web hébergée dans une seule région | Application Gateway (WAF_v2 si un pare-feu d'applications web est exigé) |
| Publier une application web hébergée dans plusieurs régions | Azure Front Door |
| Publier un service TCP ou UDP | Équilibreur de charge public Standard |
| Inspecter de façon centralisée le trafic entrant non HTTP | Règle DNAT du Pare-feu Azure |
| Administrer des machines virtuelles en RDP ou SSH sans leur donner d'adresse IP publique | Azure Bastion |

Références SKU d'Azure Bastion : **Developer** (partagé, une connexion à la fois, pas de réseaux virtuels en peering, pas pour la production), **Basic** (dédié, atteint les réseaux virtuels en peering), **Standard** (client natif, liens partageables, mise à l'échelle des hôtes) et **Premium** (enregistrement de session, indisponible avec le client natif ; déploiement privé uniquement, choisi au déploiement, sans adresse IP publique : les clients locaux ont besoin d'ExpressRoute ou d'un VPN et de la connexion basée sur l'IP). Learn désigne Premium comme le choix recommandé pour les déploiements de production.

<!-- section: on-premises-connectivity | objectives: 4.4.2 -->
## Connecter Azure aux réseaux locaux

| Option | Chemin | À recommander quand |
| --- | --- | --- |
| VPN de site à site (passerelle VPN) | Tunnel IPsec/IKE sur l'Internet public | Il faut une liaison chiffrée à faible coût, rapide à déployer ; la latence d'Internet est acceptable |
| VPN de point à site | OpenVPN, IKEv2 ou SSTP depuis des appareils individuels | Utilisateurs distants. L'authentification Microsoft Entra ID, avec accès conditionnel et authentification multifacteur (MFA), exige OpenVPN |
| ExpressRoute | Connexion privée par un fournisseur de connectivité ; ne passe jamais par l'Internet public | Latence constante, de 50 Mbit/s à 10 Gbit/s, gros transferts de données, ou règle interdisant le transit par Internet |
| ExpressRoute Direct | Ports dédiés de 10, 100 ou 400 Gbit/s sur le réseau Microsoft (400 Gbit/s : emplacements de peering limités, inscription obligatoire) | Ingestion massive, chiffrement MACsec, isolation physique |
| Azure Virtual WAN | Hubs gérés par Microsoft qui réunissent VPN, ExpressRoute et réseaux virtuels | Nombreux sites ou régions, transit entre tous, effort d'administration minimal |

Ce qu'il faut savoir pour concevoir avec ExpressRoute :

- Le **peering privé** atteint les réseaux virtuels. Le **peering Microsoft** atteint les points de terminaison publics des services Microsoft (Microsoft 365, adresses IP publiques Azure).
- Références SKU : **Local** (une ou deux régions proches de l'emplacement de peering, sortie de données incluse dans le prix), **Standard** (toutes les régions de la zone géopolitique), **Premium** (toutes les régions du monde, 10 000 itinéraires de peering privé au lieu de 4 000, davantage de liens de réseaux virtuels, exigé pour Microsoft 365).
- **Global Reach** relie deux sites locaux entre eux à travers leurs circuits, sur le réseau Microsoft.
- **FastPath** envoie le trafic directement aux machines virtuelles, sans passer par la passerelle. Il exige une passerelle Ultra Performance, ErGw3AZ ou ErGwScale.
- Un circuit comporte deux connexions dans un même emplacement de peering. Pour une résilience maximale, utilisez deux circuits dans deux emplacements de peering. La solution de secours à faible coût est un VPN de site à site : quand les deux chemins annoncent le même itinéraire, Azure préfère ExpressRoute.

> **Piège d'examen.** ExpressRoute est privé mais **n'est pas chiffré** par défaut. « Chiffrer le trafic » signifie MACsec (ExpressRoute Direct uniquement, clé stockée dans Key Vault) ou un tunnel VPN IPsec sur le peering privé.

Ce qu'il faut savoir pour concevoir avec la passerelle VPN : recommandez les références SKU redondantes interzone **VpnGw1AZ à VpnGw5AZ** (de 650 Mbit/s à 10 Gbit/s au total ; 30 tunnels de site à site, 100 à partir de VpnGw4AZ) en mode actif-actif. La référence SKU Basic (100 Mbit/s, 10 tunnels, pas de BGP, pas de mode actif-actif, pas de redondance de zone) est réservée au développement et aux tests. Au-delà de 100 tunnels, recommandez Virtual WAN.

Hub-and-spoke est la topologie de référence :

```text
On-premises --- ExpressRoute / VPN ---+
                                      |
              Hub VNet: gateway, Azure Firewall, Azure Bastion, DNS
                |-- peering -- Spoke VNet A (workload)
                |-- peering -- Spoke VNet B (workload)

A to B: through the hub firewall (UDR) or a direct peering
```

Le peering n'est pas transitif. Les spokes atteignent le réseau local par la passerelle du hub (*Autoriser le transit par passerelle* sur le hub, *Utiliser des passerelles distantes* sur le spoke). Ils se joignent entre eux par le pare-feu du hub, avec des itinéraires définis par l'utilisateur, quand le trafic doit être inspecté, ou par un peering direct quand la latence compte le plus.

Un WAN virtuel de type **Basic** ne prend en charge que le VPN de site à site. Le type **Standard** ajoute ExpressRoute, le VPN utilisateur et le transit entre hubs et entre réseaux virtuels. **Azure Route Server** échange des itinéraires en BGP entre les NVA et le réseau virtuel, à la place d'itinéraires définis par l'utilisateur tenus à la main.

> **Conseil d'examen.** Pour connecter deux réseaux virtuels Azure, le peering (régional ou mondial) est la réponse par défaut : réseau principal Microsoft, pas de passerelle, latence la plus faible. Ne faites pas passer le trafic entre réseaux virtuels par ExpressRoute.

<!-- section: network-performance | objectives: 4.4.3 -->
## Optimiser les performances réseau

| Exigence | À recommander |
| --- | --- |
| Réduire la latence, la gigue et l'utilisation du processeur des machines virtuelles | Mise en réseau accélérée (SR-IOV : le trafic contourne l'hôte et son commutateur virtuel) |
| Latence la plus faible entre les niveaux d'une application | Groupe de placement de proximité (même centre de données), avec la mise en réseau accélérée |
| Débit plus élevé entre le réseau local et les machines virtuelles Azure | ExpressRoute FastPath |
| Application web plus rapide pour des utilisateurs du monde entier | Azure Front Door : entrée par l'emplacement de périphérie le plus proche, connexions TCP séparées (split TCP), mise en cache, WAN privé de Microsoft |
| Envoyer les utilisateurs d'un service non HTTP vers la région la plus proche | Traffic Manager avec le routage Performance, ou le niveau global d'Azure Load Balancer |
| Des connexions sortantes échouent sous la charge | Passerelle NAT (épuisement des ports SNAT) |
| Réduire le coût de sortie vers Internet, les performances étant secondaires | Préférence de routage **Internet** sur l'adresse IP publique |

La **préférence de routage** a deux valeurs. **Microsoft network** (par défaut, « patate froide ») garde le trafic sur le réseau mondial Microsoft le plus longtemps possible et le fait sortir près de l'utilisateur : meilleures performances. **Internet** (« patate chaude ») remet le trafic aux fournisseurs de transit dans la région du service : prix de sortie plus bas.

> **Piège d'examen.** Un groupe de placement de proximité ne peut pas s'étendre sur plusieurs zones de disponibilité. « Latence la plus faible entre les niveaux » et « survivre à la défaillance d'une zone » sont des exigences opposées : lisez laquelle la question place en premier.

Pour la distribution de contenu, recommandez Azure Front Door Standard ou Premium : Front Door (classique) sera retiré le 31 mars 2027 et Azure CDN Standard de Microsoft (classique) le 30 septembre 2027.

<!-- section: network-security | objectives: 4.4.4 -->
## Optimiser la sécurité du réseau

Chaque contrôle répond à une exigence différente :

| Contrôle | Niveau d'action | À recommander quand |
| --- | --- | --- |
| NSG avec groupes de sécurité d'application | Couches 3-4, sur un sous-réseau ou une interface réseau | Segmenter le trafic entre sous-réseaux et niveaux applicatifs |
| Règles d'administration de sécurité (Azure Virtual Network Manager) | Couches 3-4, évaluées avant les NSG, sur de nombreux réseaux virtuels | Garde-fous centraux que les équipes applicatives ne peuvent pas contourner (Deny, Always Allow) |
| Pare-feu Azure | Couches 3-7, avec état, central | Inspecter et journaliser dans le hub le trafic sortant et le trafic entre spokes ; filtrage FQDN, DNAT, renseignement sur les menaces |
| Pare-feu d'applications web (WAF) | Couche 7, sur Application Gateway ou Azure Front Door | Protéger les applications web contre l'injection SQL et le scripting intersite |
| Azure DDoS Protection | Couches 3-4, sur les adresses IP publiques | Atténuation ajustée à votre trafic, télémétrie des attaques |
| Point de terminaison privé | Adresse IP privée pour une ressource PaaS | Supprimer l'exposition publique des comptes de stockage, bases de données, coffres |

Références SKU du Pare-feu Azure. Recommandez la plus basse qui satisfait les exigences :

| SKU | Débit | Fonctionnalités distinctives |
| --- | --- | --- |
| Basic | Jusqu'à 250 Mbit/s | Renseignement sur les menaces en mode alerte uniquement ; pas de proxy DNS, pas de catégories web |
| Standard | Jusqu'à 30 Gbit/s | Filtrage basé sur le renseignement sur les menaces, proxy DNS, catégories web, filtrage FQDN dans les règles de réseau |
| Premium | Jusqu'à 100 Gbit/s | Inspection TLS, IDPS, filtrage d'URL sur le chemin complet |

Pour forcer tout le trafic des spokes à passer par le pare-feu, associez aux sous-réseaux des spokes une table de routage contenant `0.0.0.0/0` avec le tronçon suivant *Appliance virtuelle* (l'adresse IP privée du pare-feu). Le **tunneling forcé** va plus loin : le trafic à destination d'Internet est envoyé à un pare-feu local avant de sortir.

Accès privé aux services PaaS :

| Critère | Point de terminaison de service | Point de terminaison privé |
| --- | --- | --- |
| Adresse du service | Son adresse IP publique | Une adresse IP privée de votre réseau virtuel |
| Accès depuis le réseau local par VPN ou ExpressRoute | Non | Oui |
| Étendue | Tout le service, autorisé par sous-réseau | Une instance de ressource |
| Protection contre l'exfiltration de données | Non | Oui |
| Modifications DNS | Aucune | Requises (zone DNS privée) |
| Coût | Gratuit | Facturé |

Un point de terminaison privé ne ferme pas à lui seul le point de terminaison public : désactivez aussi l'accès réseau public sur la ressource.

Niveaux DDoS : **protection de l'infrastructure** (gratuite, toujours active, tous les services Azure), **DDoS IP Protection** (Protection IP DDoS, facturée par adresse IP publique protégée) et **DDoS Network Protection** (Protection réseau DDoS, facturée par groupe de 100 adresses IP protégées ; ajoute le support de réponse rapide, la protection contre les coûts et une remise sur WAF).

> **Piège d'examen.** Les NSG filtrent sur les adresses IP, les ports et les étiquettes de service, pas sur les FQDN ni les URL. « Autoriser le trafic sortant uniquement vers `*.contoso.com` » désigne le Pare-feu Azure. « Bloquer l'injection SQL » désigne le WAF, pas le Pare-feu Azure. DDoS Protection couvre les couches 3-4 ; les attaques de couche 7 demandent un WAF.

<!-- section: load-balancing | objectives: 4.4.5 -->
## Choisir une solution d'équilibrage de charge et de routage

Deux questions décident : le trafic est-il HTTP(S), et l'application est-elle dans une région ou dans plusieurs ?

| Étendue | HTTP(S), couche 7 | Non-HTTP(S), couche 4 ou DNS |
| --- | --- | --- |
| Global | Azure Front Door | Traffic Manager, ou le niveau global d'Azure Load Balancer |
| Régional | Application Gateway | Azure Load Balancer |

| Service | Fonctionnement | Capacités | Limites |
| --- | --- | --- | --- |
| Azure Load Balancer (Standard) | Couche 4, sans terminaison des connexions (pass-through), TCP et UDP | Public ou interne, configuration IP frontale redondante interzone, SLA de 99,99 %, ports haute disponibilité (HA ports) sur un équilibreur de charge interne pour les NVA | Pas de terminaison TLS, pas de routage par URL |
| Azure Load Balancer, niveau global | Adresse IP publique anycast statique devant des équilibreurs de charge publics Standard régionaux | Basculement instantané entre régions, région la plus proche d'abord, adresse IP du client préservée | Configuration frontale publique uniquement |
| Application Gateway v2 | Proxy régional de couche 7 dans un réseau virtuel | Terminaison TLS et TLS de bout en bout, routage basé sur le chemin d'URL, hébergement de plusieurs sites, affinité par cookie, mise à l'échelle automatique, redondance de zone, WAF avec WAF_v2 | Une seule région |
| Azure Front Door | Proxy global de couche 7 à la périphérie du réseau Microsoft | Déchargement TLS, routage basé sur le chemin, mise en cache, WAF, basculement rapide ; origines choisies par latence, priorité ou poids | HTTP(S) uniquement |
| Traffic Manager | Réponses DNS ; les clients se connectent ensuite directement au point de terminaison | Tout protocole ; points de terminaison Azure, externes et imbriqués | Hors du chemin de données : pas de terminaison TLS, pas de WAF ; basculement retardé par la mise en cache DNS |

Méthodes de routage de Traffic Manager (une par profil ; combinez-les avec des profils imbriqués) :

| Méthode | À recommander quand |
| --- | --- |
| Priority | Basculement actif/passif vers une région secondaire |
| Weighted | Migration progressive ou répartition du trafic |
| Performance | Chaque utilisateur va vers le point de terminaison à la latence la plus faible, mesurée depuis son résolveur DNS récursif et non depuis le client |
| Geographic | Souveraineté des données : le point de terminaison dépend de l'origine de la requête DNS |
| MultiValue | Renvoyer plusieurs points de terminaison sains dans une même réponse DNS ; chaque point de terminaison doit être de type External et indiqué par une adresse IPv4 ou IPv6 |
| Subnet | Associer des plages d'adresses IP clientes à des points de terminaison précis |

Azure Front Door **Premium** ajoute ce qui manque à Standard : Private Link vers les origines, ensembles de règles WAF gérés par Microsoft et protection contre les bots.

Les services se combinent : Azure Front Door devant Application Gateway donne une entrée globale et un traitement par requête à l'intérieur du réseau virtuel. Un **équilibreur de charge de passerelle** (Gateway Load Balancer) insère de façon transparente des NVA tierces dans le chemin du trafic. **Application Gateway pour conteneurs** est le choix de couche 7 pour les charges de travail Kubernetes.

> **Piège d'examen.** Traffic Manager n'est pas un proxy. « Basculement rapide d'une application web », « déchargement TLS », « WAF » ou « mise en cache » à l'échelle mondiale désignent Azure Front Door. Global, non HTTP, avec « une seule adresse IP statique » ou « préserver l'adresse IP du client » : c'est le niveau global d'Azure Load Balancer.

> **Conseil d'examen.** Application Gateway v1 a été retiré le 28 avril 2026 et l'équilibreur de charge Basic le 30 septembre 2025. Les réponses valides utilisent Standard_v2 ou WAF_v2, et l'équilibreur de charge Standard.

<!-- section: key-points -->
## Points clés

- Sortant : passerelle NAT par défaut ; Pare-feu Azure quand le trafic doit être inspecté. Les nouveaux réseaux virtuels ont des sous-réseaux privés, sans accès sortant par défaut.
- Hybride : le VPN est chiffré et passe par Internet ; ExpressRoute est privé, prévisible et non chiffré par défaut ; Virtual WAN pour de nombreux sites ; VPN de site à site comme secours à faible coût d'ExpressRoute.
- Performances : mise en réseau accélérée, groupes de placement de proximité (une seule zone), FastPath, Azure Front Door.
- Sécurité : NSG pour la segmentation, Pare-feu Azure pour l'inspection centrale avec filtrage FQDN (Premium pour l'inspection TLS et l'IDPS), WAF pour la couche 7, DDoS Protection pour les couches 3-4, points de terminaison privés pour le PaaS.
- Équilibrage de charge : HTTP(S) global = Azure Front Door, HTTP(S) régional = Application Gateway, couche 4 régionale = Azure Load Balancer, global par DNS = Traffic Manager.
