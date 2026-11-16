La résolution de noms indique aux clients où se trouve un service ; l'équilibrage de charge répartit leurs connexions sur les instances saines. Ce chapitre couvre Azure DNS, public et privé, et Azure Load Balancer.

<!-- section: azure-dns-public | objectives: 4.3.1 -->
## Azure DNS : zones publiques

Azure DNS **héberge** des zones DNS sur les serveurs de noms de Microsoft. Il ne vend pas de noms de domaine : vous achetez le domaine chez un bureau d'enregistrement, puis vous le déléguez.

**Déléguer un domaine à Azure DNS :**

1. Créez la zone DNS `contoso.com` dans un groupe de ressources. Azure lui attribue **quatre serveurs de noms** (affichés dans la page Vue d'ensemble et dans le jeu d'enregistrements NS à la racine).
2. Créez les enregistrements dont le domaine a besoin (copiez d'abord les enregistrements existants si le domaine est en service).
3. Chez le **bureau d'enregistrement**, remplacez les enregistrements NS du domaine par les quatre serveurs de noms Azure. La zone ne fait autorité sur internet qu'après cette étape.
4. Vérifiez avec `nslookup -type=SOA contoso.com`.

Pour déléguer un **sous-domaine** à une autre zone (`partners.contoso.com`) : créez la zone enfant, relevez ses serveurs de noms, puis ajoutez un **jeu d'enregistrements NS nommé `partners`** dans la zone parente.

Les enregistrements se gèrent par **jeux d'enregistrements** : tous les enregistrements de même nom et de même type, avec une seule durée de vie (TTL).

| Type | Associe | Exemple d'usage |
| --- | --- | --- |
| A / AAAA | Un nom à une adresse IPv4 / IPv6 | `www` → 20.50.1.10 |
| CNAME | Un nom à un autre nom. Interdit à la racine de la zone, et ne peut pas coexister avec d'autres enregistrements du même nom | `shop` → `app1.azurewebsites.net` |
| MX | Le domaine à ses serveurs de messagerie, avec une priorité | Messagerie |
| TXT | Du texte libre | Vérification de domaine (`asuid`), stratégies SPF |
| NS | Une zone ou une zone enfant à ses serveurs de noms | Délégation |
| SOA | Les paramètres de la zone ; un par zone, créé automatiquement | |
| SRV, CAA, PTR | Services, autorités de certification autorisées, recherche inversée | |

La racine (apex) de la zone s'écrit `@`. Azure DNS n'a pas de type d'enregistrement SPF : les stratégies SPF sont des enregistrements TXT.

Les **enregistrements d'alias** (jeux d'enregistrements A, AAAA ou CNAME) pointent vers une **ressource Azure** au lieu d'une valeur fixe : une adresse IP publique, un profil Traffic Manager, un point de terminaison Azure Front Door ou CDN, ou un autre jeu d'enregistrements de la zone. L'enregistrement suit la ressource si son adresse change et devient vide si la ressource est supprimée (pas d'enregistrement orphelin). Un enregistrement d'alias A est le moyen de faire pointer la **racine** d'une zone vers une application à charge équilibrée.

```bash
az network dns zone create -g RG1 -n contoso.com
az network dns record-set a add-record -g RG1 -z contoso.com -n www -a 20.50.1.10 --ttl 3600
az network dns record-set cname set-record -g RG1 -z contoso.com -n shop -c app1.azurewebsites.net
az network dns record-set ns show -g RG1 -z contoso.com -n @
```

<!-- section: azure-dns-private | objectives: 4.3.1 -->
## Zones DNS privées

Par défaut, les machines d'un réseau virtuel résolvent leurs noms entre elles grâce au DNS fourni par Azure, mais seulement à l'intérieur de ce réseau virtuel. Une **zone DNS privée Azure** (`corp.contoso.internal`) fournit des noms personnalisés, résolubles depuis plusieurs réseaux virtuels, sans serveur DNS à exploiter.

Une zone privée ne répond qu'aux réseaux virtuels qui lui sont **liés**. Deux sortes de **lien de réseau virtuel** :

| Lien | Effet |
| --- | --- |
| Lien de **résolution** (inscription automatique désactivée) | Les machines du réseau peuvent résoudre les enregistrements de la zone |
| Lien d'**inscription** (inscription automatique activée) | En plus, Azure crée, met à jour et supprime automatiquement les enregistrements A des **machines virtuelles** du réseau |

Règles :

- Un réseau virtuel ne peut être réseau d'**inscription** que pour **une seule** zone privée, mais réseau de résolution pour de nombreuses zones.
- Une zone peut avoir de nombreux réseaux liés. Tous les réseaux liés résolvent tous les enregistrements de la zone, y compris ceux inscrits par d'autres réseaux ; **le peering n'est pas nécessaire à la résolution**, seulement au trafic lui-même.
- L'inscription automatique ne couvre que les machines virtuelles (interface principale). Les enregistrements d'autres ressources, comme un équilibreur de charge interne, se créent à la main.
- Les points de terminaison privés utilisent le même mécanisme avec les zones `privatelink.*`.
- Si des serveurs DNS personnalisés sont définis sur le réseau virtuel, les machines les utilisent à la place : ces serveurs doivent transférer vers le DNS Azure (168.63.129.16) pour que les zones privées fonctionnent. **Azure DNS Private Resolver** fournit des points de terminaison entrants et sortants pour la résolution hybride avec le réseau local.

```bash
az network private-dns zone create -g RG1 -n corp.contoso.internal
az network private-dns link vnet create -g RG1 -n link-app --zone-name corp.contoso.internal \
  --virtual-network VNet-App --registration-enabled true
```

<!-- section: load-balancer | objectives: 4.3.2 -->
## Azure Load Balancer

Azure Load Balancer répartit des flux **TCP et UDP** (couche 4) sur les instances saines d'un pool principal. Il ne regarde ni les URL, ni les cookies, ni les certificats.

| Service | Couche | Portée | À choisir pour |
| --- | --- | --- | --- |
| **Azure Load Balancer** | 4 (TCP, UDP) | Régionale (niveau global disponible) | Tout protocole, interne ou public, hautes performances |
| Application Gateway | 7 (HTTP, HTTPS) | Régionale | Routage par URL, terminaison TLS, pare-feu d'applications web |
| Azure Front Door | 7 | Mondiale | Applications web mondiales, accélération |
| Traffic Manager | DNS | Mondiale | Routage par DNS entre régions |

| Type | Frontend | Usage |
| --- | --- | --- |
| Équilibreur de charge **public** | Adresse IP publique | Applications exposées sur internet ; connectivité sortante du pool principal |
| Équilibreur de charge **interne** | Adresse IP privée d'un sous-réseau | Niveaux internes (bases de données, niveau applicatif), trafic venant de réseaux appairés ou locaux |

Le SKU utilisé est **Standard** (Basic a été retiré le 30 septembre 2025) : frontends redondants interzone, pools principaux composés de n'importe quelles machines d'un même réseau virtuel, et **sécurisé par défaut** : le trafic entrant doit être autorisé par un NSG sur le pool principal.

Composants :

| Composant | Rôle |
| --- | --- |
| **Configuration IP frontend** | L'adresse à laquelle les clients se connectent |
| **Pool principal** (backend pool) | Les machines virtuelles ou instances de groupe identique qui reçoivent le trafic, toutes dans le **même réseau virtuel**. Elles n'ont pas besoin d'adresse IP publique |
| **Sonde d'intégrité** | Teste chaque instance ; une instance défaillante ne reçoit plus de nouveaux flux |
| **Règle d'équilibrage de charge** | Associe une IP et un port frontend à un port du pool principal, avec une sonde |
| **Règle NAT entrante** | Transfère un port frontend vers **une seule** instance (par exemple port 50001 → RDP de VM1). Pas de sonde nécessaire |
| **Règle de trafic sortant** | Définit la traduction d'adresses source (SNAT) des connexions sortantes du pool par un frontend public |

Réglages d'une règle d'équilibrage de charge :

- **Persistance de session** (mode de distribution) : **Aucune** = hachage à cinq tuples (IP source, port source, IP de destination, port de destination, protocole ; valeur par défaut : chaque nouvelle connexion peut arriver sur une autre instance) ; **IP client** = deux tuples (le même client va sur la même instance) ; **IP client et protocole** = trois tuples.
- **IP flottante** (retour direct du serveur) pour les écouteurs SQL Server Always On et certaines appliances.
- **Délai d'inactivité** (4 minutes par défaut) et réinitialisation TCP.
- **Ports haute disponibilité** (HA ports) : protocole *Tous*, port 0, sur un équilibreur de charge Standard **interne** uniquement. Une seule règle équilibre tous les ports et protocoles ; utilisé devant des appliances virtuelles réseau.

```bash
az network lb create -g RG1 -n lb-web --sku Standard --public-ip-address pip-lb \
  --frontend-ip-name fe --backend-pool-name pool-web
az network lb probe create -g RG1 --lb-name lb-web -n probe-http --protocol Http --port 80 --path /health
az network lb rule create -g RG1 --lb-name lb-web -n rule-http --protocol Tcp \
  --frontend-port 80 --backend-port 80 --frontend-ip-name fe --backend-pool-name pool-web \
  --probe-name probe-http --disable-outbound-snat true
```

<!-- section: troubleshoot-load-balancer | objectives: 4.3.3 -->
## Résoudre les problèmes d'équilibrage de charge

Les **sondes d'intégrité** sont le premier suspect.

| Type de sonde | L'instance est saine quand |
| --- | --- |
| TCP | La négociation TCP sur le port de la sonde réussit |
| HTTP / HTTPS | Le chemin répond **HTTP 200** dans le délai imparti. Tout autre code (404, 401, 500, une redirection) la marque comme défaillante |

- Les sondes viennent de **168.63.129.16** (étiquette de service `AzureLoadBalancer`). Elles doivent être autorisées par les NSG et par le **pare-feu du système d'exploitation invité**. La règle par défaut AllowAzureLoadBalancerInBound les autorise, sauf si une règle de refus personnalisée de numéro inférieur correspond d'abord.
- Il n'existe pas de sonde UDP : pour un service UDP, sondez un point de terminaison TCP ou HTTP de la même instance.
- Quand **toutes** les instances sont défaillantes, un équilibreur de charge Standard n'envoie plus de nouveaux flux ; les flux TCP établis continuent.

Symptômes et causes :

| Symptôme | Cause probable |
| --- | --- |
| Aucune instance ne reçoit de trafic | Sonde en échec partout : mauvais port ou chemin, application arrêtée, NSG ou pare-feu invité bloquant 168.63.129.16 ; ou aucune règle de NSG n'autorise le trafic des clients (Standard est fermé par défaut) |
| Une instance ne reçoit rien | Sa sonde échoue : vérifiez l'application et le pare-feu de cette machine |
| Un client n'est pas toujours envoyé vers la même instance | La persistance de session est Aucune : réglez IP client |
| Les connexions sortantes du pool principal échouent par intermittence | **Épuisement des ports SNAT** : ajoutez une **passerelle NAT** sur le sous-réseau (recommandé), ou des règles de trafic sortant avec plus d'adresses IP frontend |
| Les machines du pool principal n'ont pas d'accès internet | Derrière un équilibreur de charge interne, ou avec la SNAT sortante désactivée, il n'y a pas de chemin sortant : ajoutez une passerelle NAT |
| Une machine du pool principal n'atteint pas le frontend de son propre équilibreur de charge interne | Le flux peut lui être renvoyé à elle-même et échouer : limitation attendue |

Où regarder :

| Outil | Montre |
| --- | --- |
| Métrique **Health Probe Status** | La part de sondes réussies ; fractionnez par adresse IP du pool principal pour trouver l'instance défaillante |
| Métrique **Data Path Availability** | Si le chemin Azure, du frontend jusqu'aux hôtes, est sain (côté plateforme) |
| Métriques **SNAT Connection Count**, **Used / Allocated SNAT Ports** | Les connexions sortantes en échec et la consommation de ports |
| **Insights** de l'équilibreur de charge | La topologie et un tableau de bord de ces métriques |
| Intégrité des ressources (Resource health) | Les événements de plateforme qui touchent l'équilibreur de charge |
| Network Watcher (vérification du flux IP, résolution des problèmes de connexion) | Les problèmes de NSG et de chemin vers une instance |

<!-- section: key-points -->
## Points clés

- Délégation = enregistrements NS chez le bureau d'enregistrement, pointant vers les quatre serveurs de noms Azure. Zone enfant = jeu d'enregistrements NS dans la zone parente.
- Pas de CNAME à la racine ; utilisez un enregistrement A ou un enregistrement d'**alias**. SPF va dans un TXT.
- Zones privées : les réseaux virtuels liés résolvent ; une seule zone d'inscription par réseau ; inscription automatique pour les machines virtuelles uniquement.
- Load Balancer est de couche 4 ; Standard est fermé tant qu'un NSG n'autorise pas ; pool principal dans un seul réseau virtuel.
- La distribution par défaut est à cinq tuples ; IP client donne l'affinité. Ports haute disponibilité seulement sur les équilibreurs de charge internes.
- Les sondes viennent de 168.63.129.16 et les sondes HTTP exigent un 200. Épuisement SNAT : passerelle NAT.
