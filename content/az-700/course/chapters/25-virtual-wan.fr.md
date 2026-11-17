Azure Virtual WAN est un service réseau managé par Microsoft qui réunit le VPN de site à site, le VPN de point à site, ExpressRoute, le transit entre réseaux virtuels, Pare-feu Azure et les appliances de partenaires dans des **hubs virtuels** régionaux. Au lieu de construire et de router vous-même un réseau virtuel hub, vous créez des hubs, vous y branchez des connexions et vous dirigez le trafic avec les tables de routage du hub. Ce chapitre couvre le type à choisir, l'architecture, le hub et sa capacité, les unités d'échelle des passerelles, le routage du hub et les appliances virtuelles réseau (NVA) tierces.

<!-- section: virtual-wan-type | objectives: 2.4.1 -->
## Choisir le type de Virtual WAN

Le type se définit sur la ressource **Virtual WAN**, et chaque hub de ce WAN reçoit le type de hub correspondant.

| Type de Virtual WAN | Type de hub | Configurations disponibles |
| --- | --- | --- |
| Basic | Basic | VPN de site à site uniquement |
| Standard | Standard | ExpressRoute, VPN utilisateur (point à site), VPN de site à site, transit entre hubs et de réseau virtuel à réseau virtuel par le hub, Pare-feu Azure, NVA dans le hub |

Ce qui les distingue encore :

| Fonctionnalité | Basic | Standard |
| --- | --- | --- |
| Hubs maillés entre eux | Non | Oui, maillage complet sur le réseau principal Microsoft, automatiquement |
| Routeur de hub, tables de routage personnalisées, intention de routage | Non | Oui |
| Modifier les unités d'échelle des passerelles | Non | Oui |
| Peering BGP avec une NVA dans un spoke | Non | Oui |

Vous pouvez **mettre à niveau** un WAN Basic vers Standard (supprimez d'abord les routes de hub préexistantes) ; vous **ne pouvez pas revenir** de Standard à Basic. Un hub est facturé dès qu'il existe, même sans passerelle.

> **Piège d'examen.** Une exigence qui mentionne ExpressRoute, des utilisateurs distants, Pare-feu Azure dans le hub ou du trafic entre deux réseaux virtuels par le hub exige toujours Standard. Basic ne sert qu'aux succursales connectées en VPN de site à site.

<!-- section: architecture | objectives: 2.4.2 -->
## Concevoir une architecture Virtual WAN

Les briques :

| Ressource | Rôle |
| --- | --- |
| Virtual WAN | Ressource de superposition qui regroupe les hubs ; les WAN sont isolés les uns des autres et ne peuvent pas partager un hub |
| Hub virtuel | Réseau virtuel managé par Microsoft dans une région, qui héberge les passerelles, le routeur de hub et, en option, Pare-feu Azure ou des NVA de partenaires |
| Connexion entre hub et réseau virtuel | Connecte un réseau virtuel spoke à un hub |
| Site VPN | Représente un périphérique VPN local (site à site uniquement), avec jusqu'à quatre liens |
| Configuration de VPN utilisateur | Type de tunnel et authentification des utilisateurs point à site, définis au niveau du WAN |
| Table de routage du hub | Routes, associations et propagations qui pilotent le routeur de hub |

Un WAN Standard offre un transit **universel** (any-to-any), l'« architecture de réseau de transit global » : branche vers réseau virtuel, branche vers branche, utilisateur distant vers réseau virtuel et vers branche, réseau virtuel vers réseau virtuel, dans la même région ou entre régions par les hubs maillés. Le transit de passerelle est automatique ; vous ne configurez pas « utiliser les passerelles distantes » comme avec le peering.

Règles de conception que l'examen teste :

- Un réseau virtuel se connecte à **un seul** hub. Plusieurs hubs peuvent exister dans la même région.
- Un spoke connecté à un hub **ne peut pas avoir sa propre passerelle de réseau virtuel** (VPN ou ExpressRoute) ni un Azure Route Server : supprimez-les avant de le connecter.
- Les spokes connectés à un hub de la même région sont facturés comme du peering de réseaux virtuels ; à un hub d'une autre région, comme du peering global.
- Le routeur de hub traite jusqu'à **50 Gbit/s** de trafic de réseau virtuel à réseau virtuel et accepte au plus **10 000 routes** de l'ensemble des ressources connectées.
- Les passerelles sont toujours **actif-actif** et réparties sur les zones de disponibilité quand la région les prend en charge. Pare-feu Azure dans un hub n'est pas redondant interzone si vous ne le déployez pas avec des zones.
- Pour la résilience multirégion, connectez les sites et les utilisateurs à plusieurs hubs.

Choisir les services à placer dans chaque hub :

| Exigence | Service du hub |
| --- | --- |
| Nombreuses succursales avec des périphériques VPN ou un SD-WAN | Passerelle VPN de site à site, ou NVA SD-WAN d'un partenaire dans le hub |
| Utilisateurs distants avec Azure VPN Client ou un client natif | Passerelle point à site (VPN utilisateur) |
| Circuits privés depuis les centres de données | Passerelle ExpressRoute |
| Inspecter le trafic entre spokes, branches, hubs ou vers Internet | **Hub virtuel sécurisé** : Pare-feu Azure, une NVA NGFW prise en charge ou un pare-feu SaaS, avec l'intention de routage |

**Virtual WAN ou un réseau virtuel hub que vous gérez ?** Virtual WAN convient à de nombreuses succursales, de nombreuses régions, une connectivité universelle et un routeur managé. Un réseau virtuel hub géré par le client convient quand vous avez besoin d'un contrôle total du hub : vos propres UDR sur les sous-réseaux du hub, Azure Route Server, une passerelle VPN dans un spoke, ou des services qui doivent résider dans le réseau virtuel hub lui-même.

> **Piège d'examen.** Le trafic ExpressRoute vers ExpressRoute entre deux sites locaux ne transite pas par le hub par défaut : activez **Global Reach** entre les circuits, ou faites-le passer par un pare-feu du hub avec une stratégie de routage du trafic privé.

<!-- section: create-hub | objectives: 2.4.3 -->
## Créer un hub virtuel

Ordre des opérations : créer le **Virtual WAN** (choisir Standard), créer le **hub**, connecter les **réseaux virtuels**, ajouter les **passerelles** (à la création ou plus tard), puis les sites, les circuits et les utilisateurs.

Paramètres de l'onglet **De base** du hub :

| Paramètre | À savoir |
| --- | --- |
| Région | Un hub par région en général ; davantage est autorisé |
| Espace d'adressage privé du hub | **/24** au minimum, **/23 ou plus** recommandé, **/22** pour que Pare-feu Azure puisse monter en charge ; non modifiable après la création ; ne doit chevaucher ni les autres hubs, ni les réseaux virtuels connectés, ni les plages locales |
| Capacité du hub virtuel | Unités d'infrastructure de routage du routeur de hub (voir la section suivante) |
| Préférence de routage de hub | ExpressRoute (par défaut), VPN ou AS Path |

L'espace d'adressage alimente des sous-réseaux qu'Azure attribue automatiquement au routeur, aux passerelles, à Pare-feu Azure et aux NVA : vous ne créez jamais de `GatewaySubnet` dans un hub. La création d'un hub seul prend quelques minutes ; avec une passerelle, environ 30 minutes. Attendez que l'**état du routage** indique **Provisioned** avant de configurer le routage. Si le hub est provisionné mais que l'état du routage est **Failed**, utilisez **Réinitialiser le routeur**.

```bash
az network vwan create --name vwan-contoso --resource-group rg-net --type Standard --location westeurope

az network vhub create --name hub-weu --resource-group rg-net --vwan vwan-contoso \
  --address-prefix 10.100.0.0/23 --location westeurope --sku Standard \
  --hub-routing-preference ExpressRoute

az network vhub connection create --name conn-spoke1 --resource-group rg-net \
  --vhub-name hub-weu --remote-vnet vnet-spoke1
```

> **Conseil d'examen.** « Le hub hébergera plus tard Pare-feu Azure » décide de la longueur du préfixe : /22 au moins. Un hub en /24 fonctionne mais ne laisse aucune marge, et l'espace d'adressage ne peut pas être agrandi ensuite.

<!-- section: scale-units | objectives: 2.4.4 -->
## Choisir les unités d'échelle

Deux paramètres différents sont souvent confondus :

- Les **unités d'infrastructure de routage** (capacité du hub virtuel) dimensionnent le **routeur de hub** : débit de réseau virtuel à réseau virtuel et nombre de machines virtuelles dans les spokes connectés.
- Les **unités d'échelle de passerelle** dimensionnent chaque **passerelle** : débit agrégé du site à site, du point à site ou d'ExpressRoute.

Routeur de hub : la valeur par défaut et minimale est de **2 unités = 3 Gbit/s et 2 000 VM**. Au-delà, chaque unité ajoute environ 1 Gbit/s et 1 000 VM, jusqu'à 50 unités (50 Gbit/s, 50 000 VM). Le scale-out peut prendre jusqu'à 25 minutes ; le routeur se met aussi à l'échelle automatiquement mais jamais en dessous du minimum que vous définissez, donc réglez ce minimum sur la charge attendue. Un flux TCP unique au-delà de 1,5 Gbit/s peut se dégrader quelle que soit la capacité.

Passerelles :

| Passerelle | Une unité d'échelle | Plage | Maximum |
| --- | --- | --- | --- |
| VPN de site à site | 500 Mbit/s | 1 à 20 unités | 20 Gbit/s agrégés par hub ; 1 000 connexions VPN ou 2 000 tunnels |
| ExpressRoute | 2 Gbit/s | 1 à 10 unités | 20 Gbit/s |
| Point à site (VPN utilisateur) | 500 Mbit/s | 1 à 200 unités | 100 000 utilisateurs, 100 Gbit/s |

Unités point à site et connexions simultanées :

| Unités d'échelle | Connexions simultanées | Débit agrégé |
| --- | --- | --- |
| 1 | 500 | 0,5 Gbit/s |
| 4 | 1 000 | 2 Gbit/s |
| 7 | 5 000 | 3,5 Gbit/s |
| 11 | 10 000 | 5,5 Gbit/s |
| 40 | 20 000 | 20 Gbit/s |
| 200 | 100 000 | 100 Gbit/s |

Dimensionnez une passerelle de site à site sur l'**agrégat** de toutes les succursales : 40 succursales à 50 Mbit/s demandent 2 Gbit/s, donc 4 unités. Dimensionnez une passerelle point à site d'abord sur les **utilisateurs simultanés** : 3 000 utilisateurs demandent 7 unités même s'ils consomment peu de bande passante. À partir de 40 unités, planifiez le pool d'adresses des clients en conséquence.

> **Piège d'examen.** Ajouter des unités d'échelle de passerelle n'aide pas quand des spokes comptant des milliers de VM saturent le trafic de réseau virtuel à réseau virtuel : c'est la capacité du hub (unités d'infrastructure de routage). L'inverse est vrai aussi.

<!-- section: hub-gateways | objectives: 2.4.5 -->
## Déployer des passerelles dans un hub virtuel

Une passerelle de hub n'est pas une passerelle de réseau virtuel : elle réside dans le hub, évolue par unités d'échelle et est toujours actif-actif. Créez-la dans les onglets du hub (**Site à site**, **Point à site**, **ExpressRoute**) à la création, ou plus tard avec **Modifier le hub virtuel**. Chaque opération prend environ 30 minutes.

**VPN de site à site.**

1. Créer la passerelle (unités d'échelle, paramètres BGP facultatifs).
2. Créer un **site VPN** par bureau : fournisseur du périphérique, jusqu'à quatre **liens** (un par FAI), adresse IP publique ou FQDN de chaque lien, BGP ou les espaces d'adressage privés.
3. **Connecter** les sites VPN au hub : clé partagée, stratégie IPsec, BGP.

**Point à site (VPN utilisateur).**

1. Créer une **configuration de VPN utilisateur** sur le WAN : type de tunnel (OpenVPN, IKEv2 ou les deux) et authentification (certificat Azure, RADIUS, Microsoft Entra ID ; Entra ID exige OpenVPN).
2. Créer la passerelle point à site dans le hub : unités d'échelle, la configuration de VPN utilisateur, un **pool d'adresses des clients** qui ne chevauche rien, jusqu'à cinq serveurs DNS personnalisés.
3. Télécharger le **profil global** (depuis le WAN, connecte les utilisateurs au hub disponible le plus proche) ou un **profil de hub** (un seul hub). Avec RADIUS et le profil global, activez **Use Remote/On-premises RADIUS server** et autorisez les adresses IP du proxy RADIUS sur le serveur.

**ExpressRoute.**

1. Créer la passerelle ExpressRoute (unités d'échelle). Les circuits Local, Standard et Premium sont pris en charge.
2. Vérifier que le peering privé du circuit est **Provisioned**.
3. Dans **Connectivité > ExpressRoute**, sélectionner le circuit puis **Connecter le(s) circuit(s)**, ou **Utiliser la clé d'autorisation** pour un circuit d'un autre abonnement.
4. Activer **Propager la route par défaut** sur la connexion si une route `0.0.0.0/0` apprise par le hub (par exemple depuis Pare-feu Azure) doit être publiée vers le réseau local.

```bash
az network vpn-gateway create --name vpngw-weu --resource-group rg-net --vhub hub-weu --scale-unit 2

az network express-route gateway create --name ergw-weu --resource-group rg-net \
  --virtual-hub hub-weu --min-val 2
```

Le trafic de branche à branche (sites VPN, circuits et utilisateurs qui se joignent par le hub) est **activé par défaut** dans la configuration du WAN. Pour supprimer une passerelle de site à site : déconnecter les sites VPN, supprimer les connexions, puis la passerelle.

> **Piège d'examen.** « Connecter au hub le spoke existant VNet1, qui possède une passerelle VPN » échoue tant que la passerelle n'est pas supprimée : le spoke utilise les passerelles du hub.

<!-- section: hub-routing | objectives: 2.4.6 -->
## Configurer le routage du hub virtuel

Le routage d'un hub est piloté par les **tables de routage** et par la configuration de routage de chaque **connexion** (VPN, ExpressRoute, point à site, connexion entre hub et réseau virtuel) :

| Concept | Signification |
| --- | --- |
| Association | La seule table de routage dont la connexion utilise les routes pour acheminer le trafic ; plusieurs connexions peuvent partager une table |
| Propagation | Les tables de routage dans lesquelles la connexion publie ses préfixes ; il peut y en avoir plusieurs |
| Étiquette | Regroupe des tables de routage ; propager vers l'étiquette **Default** atteint la table de routage par défaut de **chaque** hub du WAN |
| Table de routage par défaut | Existe dans chaque hub ; par défaut, chaque connexion s'y associe et s'y propage, donc tout atteint tout |
| Table de routage None | Propager vers None signifie que la connexion ne publie rien |
| Route statique | Des préfixes avec un tronçon suivant (une connexion de réseau virtuel ou une adresse IP) ; prime sur une route dynamique pour le même préfixe |

Règles à retenir :

- Toutes les connexions de branche (site à site, point à site, ExpressRoute) doivent être **associées à la table de routage par défaut** et se propager vers le même ensemble de tables.
- `0.0.0.0/0` reste dans le hub local : elle n'est pas propagée aux autres hubs, et une connexion ne l'apprend que si **Propager la route par défaut** (ou **Activer la sécurité Internet**) est activé.
- Virtual WAN ne peut pas injecter une route égale au préfixe d'un spoke ou plus spécifique : il ne peut pas rediriger le trafic entre sous-réseaux d'un même spoke.

Scénario classique, des **réseaux virtuels isolés** qui atteignent quand même les branches :

| Connexions | Table de routage associée | Propagation vers |
| --- | --- | --- |
| Réseaux virtuels | RT_VNet (personnalisée) | Default |
| Branches (VPN, ExpressRoute, point à site) | Default | RT_VNet et Default |

RT_VNet ne contient que les préfixes des branches, donc les réseaux virtuels ne s'apprennent pas entre eux.

La **préférence de routage de hub** départage plusieurs routes vers le même préfixe local, après la **correspondance du préfixe le plus long** et **statique avant BGP** :

| Paramètre | Comportement |
| --- | --- |
| ExpressRoute (par défaut) | Hub local avant les hubs distants ; ExpressRoute avant VPN pour les routes locales ; puis chemin d'AS le plus court |
| VPN | Hub local avant les hubs distants ; VPN avant ExpressRoute ; puis chemin d'AS le plus court |
| AS Path | Chemin d'AS le plus court d'abord, quelle que soit la source (les routes ExpressRoute distantes toujours en dernier) ; puis hub local et la règle ExpressRoute |

L'**intention de routage** remplace les tables de routage personnalisées quand le trafic doit être inspecté. Chaque hub a au plus une stratégie **Internet** (le trafic Internet des branches et des spokes va vers la solution de sécurité) et une stratégie **Privé** (le trafic des branches, des réseaux virtuels et **entre hubs** y va). Les préfixes privés sont par défaut les plages RFC 1918 ; ajoutez les autres plages comme préfixes supplémentaires sur chaque hub. Prérequis : aucune table de routage personnalisée et aucune route statique vers une connexion de réseau virtuel. Activez-la sur **tous** les hubs pour éviter le routage asymétrique.

> **Piège d'examen.** Les tables de routage personnalisées ne peuvent pas faire passer le trafic entre deux hubs par un pare-feu : seule une stratégie de routage du trafic privé inspecte le trafic entre hubs.

<!-- section: third-party-nva | objectives: 2.4.7 -->
## Intégrer une NVA tierce

Trois façons d'intégrer l'appliance d'un partenaire à Virtual WAN :

| Modèle | Comment | À utiliser pour |
| --- | --- | --- |
| NVA **dans le hub** | Application managée de la Place de marché Azure, gérée conjointement par Microsoft et le fournisseur | Terminaison SD-WAN des succursales, ou pare-feu nouvelle génération comme tronçon suivant de l'intention de routage |
| NVA **dans un spoke** | Spoke connecté au hub ; peering BGP avec le routeur de hub ou routes statiques | N'importe quelle appliance, contrôle total de la VM, spokes indirects derrière la NVA |
| Sécurité **SaaS** | Palo Alto Networks Cloud NGFW, choisi comme tronçon suivant de l'intention de routage | Un service de pare-feu sans appliance à gérer |

**NVA dans le hub.** Exige un hub Standard, /23 ou plus recommandé. Les partenaires pris en charge incluent des fournisseurs SD-WAN (Barracuda, Cisco Catalyst 8000V, Arista VeloCloud, Versa, HPE Aruba EdgeConnect) et des pare-feu (Check Point, Fortinet, Cisco Secure Firewall Threat Defense). La capacité se règle en **unités d'infrastructure NVA** (environ 500 Mbit/s chacune, de 2 à 80 selon le fournisseur). Les licences sont à apporter (BYOL). Vous la configurez depuis le portail de gestion du fournisseur : vous ne pouvez ni vous connecter aux VM ni modifier le groupe de ressources managé. Une NVA SD-WAN établit un peering avec le routeur de hub, donc les préfixes des succursales apparaissent dans le routage du hub comme ceux d'une passerelle Microsoft.

**NVA dans un spoke avec BGP.** Dans le hub, ajoutez un **pair BGP** (nom, ASN, adresse IP de la NVA, connexion de réseau virtuel). Établissez le peering avec les **deux** adresses de `virtualRouterIps` et publiez les mêmes routes vers les deux. Limites : 8 pairs BGP par hub, uniquement des NVA dans des spokes directement connectés, des ASN 16 bits différents de celui du hub et non réservés (65515, 65517 à 65520, 8074, 8075, 12076...). La connexion de la NVA est traitée comme une branche : associez-la à la table de routage par défaut.

**NVA dans un spoke avec des routes statiques.** Pour des spokes indirects appairés au réseau virtuel de la NVA : une route statique dans la table de routage par défaut du hub (préfixes des spokes indirects, tronçon suivant = la connexion du réseau virtuel de la NVA), une route statique sur cette connexion de réseau virtuel avec l'adresse IP de tronçon suivant = la NVA, et une UDR `0.0.0.0/0` vers la NVA dans les spokes indirects.

> **Conseil d'examen.** « Utiliser le SD-WAN existant des succursales sans déployer de VM à gérer » désigne une NVA de partenaire dans le hub. « Inspecter le trafic avec un pare-feu que l'équipe exploite déjà sur ses propres VM » désigne une NVA dans un spoke.

<!-- section: key-points -->
## Points clés

- Basic : VPN de site à site uniquement, pas de hubs maillés ; Standard : tout le reste. Basic se met à niveau vers Standard, jamais l'inverse.
- Un réseau virtuel se connecte à un seul hub, sans sa propre passerelle ni Route Server.
- Espace d'adressage du hub : /24 au minimum, /23 recommandé, /22 pour Pare-feu Azure, non modifiable.
- Capacité du hub : 2 unités d'infrastructure de routage par défaut (3 Gbit/s, 2 000 VM), jusqu'à 50.
- Unités d'échelle : site à site 500 Mbit/s, ExpressRoute 2 Gbit/s, point à site dimensionné sur les utilisateurs simultanés.
- Association = une table utilisée pour acheminer ; propagation = les tables qui apprennent les routes ; étiquette Default = chaque hub.
- Préférence de routage de hub : ExpressRoute par défaut, sinon VPN ou AS Path.
- Intention de routage : une stratégie Internet et une stratégie Privé par hub, seul moyen d'inspecter le trafic entre hubs.
- NVA de partenaire dans le hub (application managée), NVA dans un spoke (peering BGP ou routes statiques) ou pare-feu SaaS.
