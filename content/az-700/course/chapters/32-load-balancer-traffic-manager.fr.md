Ce chapitre construit ce que le précédent a conçu : un équilibreur de charge Standard avec sa sonde et ses règles, les règles NAT entrantes et les règles de trafic sortant avec leur arithmétique SNAT, une chaîne Gateway Load Balancer et un profil Traffic Manager. Les questions d'examen montrent une règle ou un profil et demandent ce qui se passe, ou quel paramètre modifier.

<!-- section: lb-create | objectives: 3.1.6 -->
## Créer et configurer un équilibreur de charge

Ordre des opérations pour un équilibreur de charge public :

1. Créer une adresse IP publique **Standard** (redondante interzone sauf si une zone est exigée).
2. Créer l'équilibreur de charge avec une configuration IP frontale et un pool principal.
3. Créer une sonde d'intégrité.
4. Créer la règle d'équilibrage de charge qui relie adresse frontale, pool principal et sonde.
5. Autoriser le trafic des clients avec un NSG sur le sous-réseau ou les cartes réseau du back-end.
6. Ajouter les cartes réseau des VM (ou les adresses IP) au pool principal.
7. Donner aux back-ends un accès sortant explicite : passerelle NAT sur le sous-réseau, ou règle de trafic sortant.

```bash
az network public-ip create --resource-group RG1 --name pip-web --sku Standard --zone 1 2 3
az network lb create --resource-group RG1 --name lb-web --sku Standard \
  --public-ip-address pip-web --frontend-ip-name fe-web --backend-pool-name pool-web
az network lb probe create --resource-group RG1 --lb-name lb-web --name probe-http \
  --protocol Http --port 80 --path /health
az network lb rule create --resource-group RG1 --lb-name lb-web --name rule-http \
  --protocol Tcp --frontend-port 80 --backend-port 80 --frontend-ip-name fe-web \
  --backend-pool-name pool-web --probe-name probe-http \
  --disable-outbound-snat true --idle-timeout 15 --enable-tcp-reset true
az network nic ip-config address-pool add --resource-group RG1 --nic-name vm1-nic \
  --ip-config-name ipconfig1 --lb-name lb-web --address-pool pool-web
```

Les pools principaux se configurent par carte réseau ou par adresse IP :

| | Par carte réseau | Par adresse IP |
| --- | --- | --- |
| Membres | Configurations IP des cartes réseau de VM ou de groupes identiques | Adresses IP plus l'ID du réseau virtuel ; peuvent être préremplies avant que les VM existent |
| Restrictions | Un équilibreur de charge public et un interne basés sur la carte réseau par groupe à haute disponibilité | Même réseau virtuel ; VM et groupes identiques uniquement ; ne peut pas servir de service Private Link ; les règles NAT entrantes ne peuvent pas cibler une adresse IP ; l'accès sortant par défaut reste activé |

Les deux types peuvent coexister sur un équilibreur de charge, mais pas mélangés dans le même pool.

Sondes d'intégrité :

| Paramètre | Valeurs |
| --- | --- |
| Protocole | TCP (la négociation réussit), HTTP ou HTTPS (seule une réponse **200** est saine ; HTTPS exige une chaîne de certificats SHA256 et ne fait pas d'authentification par certificat client) |
| Intervalle | 5 secondes par défaut dans le portail, 15 secondes via ARM, CLI et PowerShell ; minimum 5 |
| Seuil | Succès ou échecs consécutifs pour changer d'état ; en HTTP, une réponse explicite change l'état immédiatement |
| Délai d'expiration HTTP/HTTPS | 30 secondes |
| Source | `168.63.129.16` (IPv4), étiquette de service `AzureLoadBalancer` |

Quand une instance échoue à sa sonde, les flux TCP établis vers elle continuent et ses flux UDP sont déplacés. Quand toutes les instances échouent, Standard n'envoie plus de nouveaux flux mais laisse continuer les flux TCP établis. Une VM arrêtée n'est pas sondée. Les sondes HTTP ne peuvent pas utiliser les ports 19, 21, 25, 70, 110, 119, 143, 220 et 993.

> **Piège d'examen.** Une règle NSG personnalisée qui refuse `AzureLoadBalancer` (ou un pare-feu invité qui bloque `168.63.129.16`) marque toutes les instances comme défaillantes. Pour sortir volontairement une instance, passez son état administratif à Down plutôt que de bloquer la sonde.

<!-- section: lb-rules | objectives: 3.1.9 -->
## Règles d'équilibrage de charge

| Paramètre | Remarques |
| --- | --- |
| Adresse IP frontale, protocole (`Tcp`, `Udp`, `All`), port frontal | Où et comment les clients se connectent |
| Pool principal, port de back-end | Le trafic va à chaque membre sain |
| Sonde d'intégrité | Sélectionne les instances saines ; le portail en exige une, et l'état administratif ne fonctionne que sur les règles avec sonde |
| Persistance de session | None, Client IP, Client IP and protocol |
| Délai d'inactivité | 4 à 100 minutes pour les règles d'équilibrage de charge et NAT entrantes, 4 par défaut ; non utilisé pour UDP |
| TCP reset | Envoie un RST aux deux extrémités à l'expiration du délai d'inactivité au lieu d'un abandon silencieux |
| IP flottante | Livre les paquets avec l'adresse IP frontale toujours en destination ; non modifiable après la création |
| SNAT sortant | Utiliser l'adresse frontale pour le SNAT sortant, ou le désactiver (recommandé, utilisez une règle de trafic sortant) |

**Ports HA** : protocole `All`, port frontal et de back-end `0`, équilibreur de charge interne uniquement. Une seule règle équilibre tous les flux TCP et UDP (et l'ICMP) vers les NVA ; la symétrie par flux est garantie pour un seul équilibreur de charge interne et un seul pool. Une règle Ports HA ne peut pas coexister avec une autre règle sur les mêmes configurations IP du back-end, sauf si les deux utilisent l'IP flottante.

```bash
az network lb rule create --resource-group RG-Hub --lb-name lb-nva --name rule-ha \
  --protocol All --frontend-port 0 --backend-port 0 --frontend-ip-name fe-nva \
  --backend-pool-name pool-nva --probe-name probe-nva
```

L'**IP flottante** est nécessaire quand deux règles (deux adresses frontales) ciblent le même port de back-end, par exemple plusieurs écouteurs SQL Server Always On. Sans elle, la VM ne peut pas savoir à quelle adresse frontale un paquet était destiné. Avec elle, configurez le système d'exploitation invité de chaque VM : une interface de bouclage portant l'adresse IP frontale, le modèle « weak host » sous Windows et une règle de pare-feu de l'hôte pour le port.

Le délai d'inactivité défini sur l'adresse IP frontale l'emporte sur une valeur différente d'une règle d'équilibrage de charge ou NAT entrante qui la référence.

> **Piège d'examen.** La persistance Client IP garde les clients sur une instance mais déséquilibre la répartition : tous les utilisateurs derrière un même proxy ou équipement SNAT atteignent la même VM. Ajouter ou retirer un membre du pool recalcule le hachage, donc l'affinité n'est pas garantie lors d'une mise à l'échelle.

<!-- section: inbound-nat | objectives: 3.1.10 -->
## Règles NAT entrantes

Une règle NAT entrante transfère un port frontal vers une instance du back-end. Elle n'a pas besoin de sonde d'intégrité et ne prend pas en charge l'état administratif.

| Type | Comportement | Usage |
| --- | --- | --- |
| V1, une seule VM | Correspondance 1:1, port frontal vers une configuration IP de carte réseau | SSH ou RDP vers une VM |
| V2, pool principal | **Frontend port range start** et **Maximum number of machines in the backend pool** préallouent une plage de ports ; les correspondances sont créées et conservées automatiquement quand le pool évolue | Un port par instance pour les groupes identiques et les groupes de VM (recommandé) |
| Pools NAT entrants (V1 pour les groupes identiques) | Retrait le 30 septembre 2027 ; plus aucun pool ne peut être créé depuis le 15 novembre 2026 | Migrer vers V2 |

```bash
# V1: frontend port 50001 to port 3389 of one VM
az network lb inbound-nat-rule create --resource-group RG1 --lb-name lb-web \
  --name nat-vm1-rdp --protocol Tcp --frontend-ip-name fe-web \
  --frontend-port 50001 --backend-port 3389
az network nic ip-config inbound-nat-rule add --resource-group RG1 --nic-name vm1-nic \
  --ip-config-name ipconfig1 --lb-name lb-web --inbound-nat-rule nat-vm1-rdp

# V2: ports 50000-50099 mapped to port 22 of each pool member
az network lb inbound-nat-rule create --resource-group RG1 --lb-name lb-web \
  --name nat-pool-ssh --protocol Tcp --frontend-ip-name fe-web --backend-pool-name pool-web \
  --frontend-port-range-start 50000 --frontend-port-range-end 50099 --backend-port 22
```

Chaque port utilisé par une règle d'équilibrage de charge ou NAT entrante consomme un bloc de huit ports SNAT sur cette adresse IP frontale. Si une plage V2 est trop petite, le scale-out est bloqué pour les nouvelles instances. Le NSG doit toujours autoriser le port de back-end (3389, 22). Pour un accès d'administration sans exposer de ports, Azure Bastion est l'alternative habituelle.

<!-- section: outbound-snat | objectives: 3.1.11 -->
## Règles de trafic sortant et SNAT

Quand plusieurs méthodes s'appliquent, Azure utilise la première dans cet ordre :

| Priorité | Méthode | Usage en production |
| --- | --- | --- |
| 1 | Passerelle NAT sur le sous-réseau | La meilleure : SNAT dynamique, évolutive |
| 2 | Adresse IP publique au niveau de l'instance sur la carte réseau | Oui ; pas de SNAT, tous les ports pour cette VM |
| 3 | Adresse frontale de l'équilibreur de charge via des **règles de trafic sortant** | Oui, mais pas à grande échelle |
| 4 | Adresse frontale de l'équilibreur de charge sans règle de trafic sortant (implicite, allocation par défaut) | Non |
| 5 | Accès sortant par défaut | Non ; les nouveaux réseaux virtuels utilisent des sous-réseaux privés par défaut depuis le 31 mars 2026 |

Les règles de trafic sortant ne s'appliquent qu'à un équilibreur de charge Standard **public** et qu'aux VM sans adresse IP publique au niveau de l'instance. Un équilibreur de charge interne ne donne aucun accès sortant.

Arithmétique SNAT :

- Chaque adresse IP publique frontale fournit **64 000** ports SNAT. Un préfixe en fournit 64 000 par adresse.
- Les ports sont alloués par **multiples de 8** ; une demande supérieure aux ports des adresses frontales est rejetée.
- Allocation manuelle en ports par instance : nombre d'adresses IP frontales × 64 000 ÷ nombre d'instances du back-end. Exemple : 2 adresses IP et 50 VM donnent au plus 2 560 ports par VM.
- Une valeur de 0 ports alloués revient au tableau par défaut : 1 024 ports par VM jusqu'à 50 instances, 512 jusqu'à 100, 256 jusqu'à 200, 128 jusqu'à 400, 64 jusqu'à 800, 32 jusqu'à 1 000.
- TCP réutilise un port SNAT pour une adresse IP ou un port de destination différents ; UDP utilise un port par adresse IP de destination.

Paramètres d'une règle de trafic sortant : configurations IP frontales, pool principal, protocole (`All`, `Tcp`, `Udp`), ports sortants alloués, délai d'inactivité de 4 à 120 minutes (4 par défaut), TCP reset.

```bash
az network lb outbound-rule create --resource-group RG1 --lb-name lb-web \
  --name out-all --frontend-ip-configs fe-out --address-pool pool-web \
  --protocol All --outbound-ports 10000 --idle-timeout 15 --enable-tcp-reset true
```

Règles à retenir :

- Pour utiliser une adresse IP frontale qui sert aussi des règles entrantes, définissez d'abord `disableOutboundSnat` sur ces règles d'équilibrage de charge ; sinon la règle de trafic sortant échoue.
- Avec `disableOutboundSnat` et sans règle de trafic sortant, les back-ends perdent la connectivité sortante.
- Les règles de trafic sortant s'appliquent à la configuration IPv4 principale d'une carte réseau (configurations secondaires : IPv6 uniquement), ne transportent pas d'ICMP, et exigent que toutes les VM du groupe à haute disponibilité ou du groupe identique soient dans le pool.
- Une passerelle NAT sur le sous-réseau l'emporte sur les règles de trafic sortant.

> **Piège d'examen.** Des échecs intermittents de nouvelles connexions sortantes sous charge signalent un épuisement des ports SNAT. Corrigez avec une passerelle NAT, davantage d'adresses IP frontales ou une allocation manuelle plus grande, la réutilisation des connexions dans l'application, ou Private Link pour les destinations PaaS Azure.

<!-- section: gateway-lb | objectives: 3.1.8 -->
## Équilibreur de charge de passerelle

L'équilibreur de charge de passerelle (Gateway Load Balancer, SKU `Gateway`) insère des appliances tierces (pare-feu, IDS/IPS, analyse de paquets, DDoS) sur le chemin d'un point de terminaison public sans itinéraire défini par l'utilisateur.

| Composant | Règle |
| --- | --- |
| Adresse frontale | Adresse IP privée uniquement |
| Règle | Ports HA uniquement (`All`, port 0) ; jusqu'à deux pools principaux par règle |
| Pool principal | Instances de NVA, avec jusqu'à deux **interfaces de tunnel** : interne (port 10800, identificateur 800 par défaut) et externe (10801, 801), protocole VXLAN |
| Chaîne | Une adresse frontale d'équilibreur de charge public Standard, ou la configuration IP publique Standard de la carte réseau d'une VM, référence l'adresse frontale Gateway ; jusqu'à 100 ressources par adresse frontale Gateway |

Le trafic vers le consommateur et depuis lui est encapsulé en VXLAN, envoyé à travers les appliances, puis livré avec l'adresse IP source conservée ; l'adhérence des flux garde les deux sens sur la même appliance. Pour inspecter le trafic sortant, chaînez l'équilibreur de charge de passerelle aux adresses frontales utilisées par les règles de trafic sortant. La MTU des NVA doit être d'au moins 1 550 octets.

```bash
az network lb create --resource-group RG-Sec --name gwlb-nva --sku Gateway \
  --vnet-name vnet-sec --subnet snet-nva --frontend-ip-name fe-gw --backend-pool-name pool-nva
az network lb address-pool tunnel-interface add --resource-group RG-Sec --lb-name gwlb-nva \
  --address-pool pool-nva --type External --protocol VXLAN --identifier 901 --port 10801
feid=$(az network lb frontend-ip show --resource-group RG-Sec --lb-name gwlb-nva \
  --name fe-gw --query id --output tsv)
az network lb frontend-ip update --resource-group RG-Web --lb-name lb-web \
  --name fe-web --public-ip-address pip-web --gateway-lb $feid
```

Consommateur et fournisseur peuvent être dans des abonnements ou des locataires différents. Le chaînage entre locataires exige `Microsoft.Network/loadBalancers/frontendIPConfigurations/join/action` et un accès invité à l'abonnement du fournisseur, et n'est pas disponible dans le portail. Gateway Load Balancer ne fonctionne pas avec le niveau Global.

> **Piège d'examen.** L'adresse frontale d'un équilibreur de charge de passerelle ne peut pas être le tronçon suivant d'un itinéraire défini par l'utilisateur. Des NVA placées entre un équilibreur de charge public et un interne n'ont pas de symétrie des flux : cette exigence désigne Gateway Load Balancer.

<!-- section: traffic-manager | objectives: 3.1.7 -->
## Azure Traffic Manager

Traffic Manager est un service global **basé sur le DNS** : il répond aux requêtes DNS pour `<name>.trafficmanager.net` avec le point de terminaison choisi par la méthode de routage et l'intégrité des points de terminaison. Les clients se connectent ensuite **directement** au point de terminaison ; Traffic Manager n'est pas un proxy, ne voit aucun trafic, ne peut pas faire de sessions persistantes et fonctionne pour tout protocole.

| Méthode de routage | Renvoie | Usage |
| --- | --- | --- |
| Priority | Le point de terminaison disponible de plus petite valeur de priorité (1 à 1000) | Basculement actif-passif |
| Weighted | Un point de terminaison choisi au hasard selon son poids (1 à 1000, 1 par défaut) | Déploiement progressif, migration, débordement vers le cloud |
| Performance | Le point de terminaison de la région à la plus faible latence depuis le résolveur DNS | Utilisateurs mondiaux, région la plus proche |
| Geographic | Le point de terminaison associé à la région de la requête (Monde, regroupement régional, pays/région, État/province) | Souveraineté des données, contenu localisé |
| Multivalue | Tous les points de terminaison sains, jusqu'au nombre maximal de retours (10 au plus) ; points de terminaison externes IPv4/IPv6 uniquement | Nouvelles tentatives côté client |
| Subnet | Le point de terminaison associé à la plage d'adresses IP source | Utilisateurs de l'entreprise ou d'un FAI vers un point de terminaison précis |

Règles par méthode : une région ne peut être associée qu'à un seul point de terminaison dans un profil Geographic, et une région non associée reçoit NODATA (associez **World** à un point de terminaison imbriqué comme solution de repli). En routage Subnet, un point de terminaison sans plage sert de repli. Les points de terminaison externes et imbriqués ont besoin d'un emplacement pour le routage Performance.

Les points de terminaison sont **Azure** (App Service de niveau Standard ou supérieur, une seule application web par région et par profil ; adresses IP publiques dotées d'un nom DNS), **externes** (FQDN ou adresse IPv4/IPv6, en local ou dans d'autres clouds) ou **imbriqués** (un profil enfant). L'imbrication combine des méthodes, par exemple Performance au parent et Weighted à l'intérieur d'une région. **MinChildEndpoints** (1 par défaut) fixe combien de points de terminaison enfants sains maintiennent le profil enfant disponible.

Paramètres de supervision, communs à tous les points de terminaison d'un profil :

| Paramètre | Valeurs |
| --- | --- |
| Protocole, port, chemin | HTTP, HTTPS (présence du certificat uniquement, pas sa validité) ou TCP ; chemin obligatoire en HTTP/HTTPS |
| Codes d'état attendus | 200 par défaut ; jusqu'à huit plages comme `200-299` |
| Intervalle de sondage | 30 secondes (par défaut) ou 10 secondes (rapide, coût supplémentaire) |
| Nombre d'échecs tolérés | 0 à 9, 3 par défaut |
| Délai d'expiration de la sonde | 5 à 10 secondes (10 par défaut) avec l'intervalle de 30 secondes ; 5 à 9 (9 par défaut) avec 10 secondes |
| Durée de vie (TTL) DNS | 0 à 2 147 483 647 secondes par profil |

```bash
az network traffic-manager profile create --resource-group RG-Global --name tm-contoso \
  --routing-method Priority --unique-dns-name contoso-app --ttl 30 \
  --protocol HTTPS --port 443 --path /health
az network traffic-manager endpoint create --resource-group RG-Global --profile-name tm-contoso \
  --name ep-weu --type azureEndpoints --target-resource-id $webAppWeuId --priority 1
az network traffic-manager endpoint create --resource-group RG-Global --profile-name tm-contoso \
  --name ep-onprem --type externalEndpoints --target app.fabrikam.com --priority 2
```

Un point de terminaison désactivé n'est ni sondé ni renvoyé ; un profil désactivé, ou dont tous les points de terminaison sont désactivés, renvoie NXDOMAIN. Si tous les points de terminaison sont Degraded, Traffic Manager les renvoie tous. Associez un nom personnalisé au profil par un CNAME ; pour l'apex de la zone, utilisez un enregistrement lié Traffic Manager (Traffic Manager Linked Record) ou un enregistrement d'alias Azure DNS. Limites : 200 profils par abonnement, 200 points de terminaison par profil.

> **Piège d'examen.** Après une panne, les clients continuent d'utiliser la réponse en cache jusqu'à l'expiration du TTL : réduisez le TTL et l'intervalle de sondage pour un basculement plus rapide. Traffic Manager route aussi selon l'adresse IP du résolveur (ou l'EDNS Client Subnet), pas forcément celle de l'utilisateur.

<!-- section: key-points -->
## Points clés

- Ordre de création : IP publique Standard, équilibreur de charge, sonde, règle, NSG, membres du back-end, accès sortant explicite.
- Les sondes viennent de `168.63.129.16` (`AzureLoadBalancer`) ; les sondes HTTP exigent un 200.
- Ports HA : `All`/0, interne uniquement ; IP flottante pour réutiliser un port de back-end.
- NAT entrante V2 cible un pool avec une plage de ports frontaux ; les pools NAT sont retirés en 2027.
- SNAT : 64 000 ports par adresse IP, multiples de 8 ; passerelle NAT d'abord, puis IP publique de l'instance, puis règles de trafic sortant.
- Gateway Load Balancer : chaînage depuis une adresse frontale publique, tunnels VXLAN, pas d'UDR.
- Traffic Manager : DNS uniquement, six méthodes de routage, le TTL fixe la durée du basculement.
