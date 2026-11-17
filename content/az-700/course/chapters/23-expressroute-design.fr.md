Azure ExpressRoute est une connexion privée entre un réseau local et le réseau Microsoft, qui ne passe pas par Internet. Ce chapitre couvre les décisions de conception : comment atteindre la périphérie Microsoft, quelle référence SKU de circuit et quelle bande passante acheter, comment survivre à la perte d'un site, quelles options ajouter et quels peerings activer.

<!-- section: connectivity-models | objectives: 2.3.1 -->
## Sélectionner un modèle de connectivité

Un **circuit** ExpressRoute est une connexion logique, identifiée par une **clé de service** (s-key), entre votre réseau et Microsoft à travers un **emplacement de peering** (un site de colocalisation comme Amsterdam ou Silicon Valley, pas une région Azure). Chaque circuit se compose de deux connexions vers deux routeurs Microsoft Enterprise Edge (MSEE), et les routes s'échangent en BGP. Quatre modèles vous amènent aux MSEE :

| Modèle | Ce que fournit le fournisseur | Qui gère BGP avec Microsoft | À choisir quand |
| --- | --- | --- | --- |
| Colocalisation dans un échange cloud | Une interconnexion virtuelle dans un site où vous avez déjà des équipements ; couche 2 ou couche 3 managée | Vous (couche 2) ou le fournisseur (couche 3 managée) | Vos routeurs sont colocalisés avec un échange cloud |
| Ethernet point à point | Une liaison de couche 2 entre votre centre de données et l'emplacement de peering | Vous | Un ou deux centres de données, vous voulez maîtriser le routage |
| Universelle (IPVPN) | Azure apparaît comme un site de plus de votre WAN MPLS ; couche 3 managée | Le fournisseur | De nombreuses succursales déjà sur un IPVPN |
| ExpressRoute Direct | Une paire de ports physiques directement sur les MSEE, sans fournisseur | Vous | 10, 100 ou 400 Gbit/s, isolation physique, nombreux circuits |

Avec un service de couche 3 managé, le fournisseur configure les peerings pour vous ; avec un service de couche 2, vous les configurez vous-même (voir le chapitre suivant).

> **Conseil d'examen.** « Azure doit apparaître comme une succursale du réseau MPLS existant » désigne le modèle universel (IPVPN). « Sans fournisseur de services » ou « 100 Gbit/s » désigne ExpressRoute Direct.

<!-- section: sku-and-tier | objectives: 2.3.2 -->
## Sélectionner la référence SKU et le niveau du circuit

Une référence SKU de circuit combine un **niveau** (Local, Standard, Premium) et un **modèle de facturation** (données limitées ou illimitées).

| | Local | Standard | Premium |
| --- | --- | --- | --- |
| Régions Azure accessibles | Une ou deux régions dans la métropole de l'emplacement de peering ou à proximité | Toutes les régions de la zone géopolitique | Toutes les régions du monde (hors clouds nationaux) |
| Routes IPv4 acceptées sur le peering privé | 4 000 | 4 000 | 10 000 |
| Réseaux virtuels liés par circuit | 10 | 10 | 20 à 100, selon la bande passante |
| Global Reach | Non disponible | Oui | Oui |
| Transfert de données sortant | Inclus | Au Go (données limitées) ou inclus (illimitées) | Au Go (données limitées) ou inclus (illimitées) |
| Microsoft 365 par le peering Microsoft | Non | Non | Obligatoire |

Limites Premium de réseaux virtuels liés : 20 à 50 Mbit/s, 25 à 100 et 200 Mbit/s, 40 à 500 Mbit/s, 50 à 1 Gbit/s, 60 à 2 Gbit/s, 75 à 5 Gbit/s, 100 à 10 Gbit/s et au-delà.

Modèles de facturation :

- **Données limitées** (metered) : forfait mensuel, transfert entrant gratuit, transfert sortant facturé au Go.
- **Données illimitées** (unlimited) : forfait mensuel plus élevé, transferts entrant et sortant inclus.
- **Local** : le transfert de données sortant est inclus dans le prix ; le moyen le moins cher de déplacer beaucoup de données vers la région voisine de l'emplacement de peering. Non disponible dans tous les emplacements de peering.

Bande passante par un fournisseur : 50, 100, 200 et 500 Mbit/s, 1, 2, 5 et 10 Gbit/s. ExpressRoute Direct ajoute des circuits de 40, 100, 200 et 400 Gbit/s, selon la paire de ports.

Modifications autorisées sans recréer le circuit :

| Modification | Autorisée |
| --- | --- |
| Augmenter la bande passante | Oui, si le port du fournisseur a la capacité |
| Diminuer la bande passante | Non : créer un nouveau circuit |
| Standard vers Premium, Premium vers Standard | Oui |
| Local vers Standard ou Premium | Oui, avec Azure CLI ou PowerShell |
| Données limitées vers illimitées | Oui |
| Données illimitées vers limitées | Non |

Avant de passer de Premium à Standard, le circuit doit de nouveau respecter les limites Standard : au plus 10 réseaux virtuels liés, tous dans la zone géopolitique, et pas plus de 4 000 routes.

> **Piège d'examen.** L'emplacement de peering et la région Azure sont deux choses différentes. Un circuit Standard à Amsterdam atteint toutes les régions d'Europe, mais un réseau virtuel dans East US exige Premium. Un circuit Local à Amsterdam n'atteint que la région Azure locale de cet emplacement.

<!-- section: resiliency | objectives: 2.3.3 -->
## Concevoir la redondance, la connectivité inter-régions et la reprise d'activité

Un seul circuit possède déjà deux connexions, chacune avec sa session BGP, vers deux MSEE ; Microsoft recommande de faire fonctionner les deux en mode **actif-actif**, et le contrat SLA exige les deux sessions. Ce qu'un seul circuit ne couvre pas, c'est la perte de l'emplacement de peering. Le portail nomme trois architectures :

| Résilience | Conception | Protège contre | Usage |
| --- | --- | --- | --- |
| Standard | Un circuit, deux connexions dans un seul emplacement de peering | La panne d'une liaison ou d'un équipement | Charges de travail hors production et non critiques |
| Élevée | Un circuit **ExpressRoute Metro**, ses deux connexions dans deux sites de la même zone métropolitaine | La perte d'un site de périphérie | Charges de travail critiques confinées à une région |
| Maximale | Deux circuits dans deux emplacements de peering différents, tous deux liés au réseau virtuel | La perte de tout un emplacement de peering | Charges de travail critiques pour l'entreprise ou la mission |

Côté Azure, déployez la passerelle de réseau virtuel ExpressRoute en **redondance interzone** (références SKU `ErGw1Az`, `ErGw2Az`, `ErGw3Az`) pour qu'une panne de zone ne coupe pas la connectivité.

**Reprise d'activité avec deux circuits.** Le choix du second emplacement de peering est un compromis : la même métropole conserve la latence mais partage le risque d'une catastrophe naturelle ; une autre métropole de la même zone géopolitique réduit ce risque ; une autre zone géopolitique le réduit davantage mais exige **Premium sur les deux circuits**. Quand les deux circuits publient les mêmes routes, Azure équilibre la charge par flux (ECMP). Pour rendre un circuit principal et l'autre de secours, orientez les deux sens :

| Sens | Méthode | Où |
| --- | --- | --- |
| Azure vers le réseau local | Publier des préfixes plus spécifiques sur le circuit préféré | Routeurs locaux |
| Azure vers le réseau local | **Poids de connexion** plus élevé sur la connexion préférée | Azure, sur la connexion de la passerelle |
| Azure vers le réseau local | Préfixage du chemin d'AS (AS path prepending) sur le circuit le moins préféré | Routeurs locaux |
| Réseau local vers Azure | Préférence locale BGP plus élevée pour les routes reçues sur le circuit préféré | Routeurs locaux |

Orientez les deux sens de façon cohérente, sinon les flux sont asymétriques.

**Connectivité inter-régions.** Avec deux régions et deux sites, liez chaque réseau virtuel aux deux circuits (« nœud papillon ») : chaque région utilise son circuit local et se replie sur le circuit distant. Un circuit Standard suffit quand les deux régions sont dans la même zone géopolitique ; sinon les circuits doivent être Premium. Des réseaux virtuels liés au même circuit pourraient communiquer entre eux par les MSEE, mais ce n'est pas recommandé : utilisez le peering de réseaux virtuels pour le trafic entre réseaux virtuels.

**VPN en secours.** Une connexion VPN de site à site peut secourir le **peering privé** ExpressRoute : la passerelle VPN et la passerelle ExpressRoute coexistent dans le même `GatewaySubnet` (/27 ou plus grand), la passerelle VPN doit être basée sur des routes et ne peut pas être de référence SKU Basic. Quand le même préfixe est appris des deux, Azure préfère ExpressRoute. Il n'existe pas de basculement VPN pour le peering Microsoft.

> **Piège d'examen.** Deux circuits dans le même emplacement de peering ne constituent pas une conception de reprise d'activité : tous deux aboutissent au même site. La résilience maximale suppose deux emplacements de peering différents.

<!-- section: expressroute-options | objectives: 2.3.4 -->
## Concevoir Global Reach, FastPath et ExpressRoute Direct

| Option | Problème résolu | Exigences principales |
| --- | --- | --- |
| Global Reach | Deux sites locaux, chacun sur son circuit, doivent échanger du trafic par le réseau Microsoft | Peering privé sur les deux circuits ; circuits dans des emplacements de peering différents ; pays/régions pris en charge ; Premium uniquement si les circuits sont dans des zones géopolitiques différentes |
| FastPath | Le trafic du réseau local vers les machines virtuelles doit éviter la passerelle pour réduire la latence | Référence SKU de passerelle `UltraPerformance`, `ErGw3AZ`, ou `ErGwScale` avec au moins 10 unités d'échelle |
| ExpressRoute Direct | Très haut débit, isolation physique, ou nombreux circuits sous votre contrôle | Une paire de ports de 10, 100 ou 400 Gbit/s dans un emplacement de peering ; vous fournissez les interconnexions |

**Global Reach.** Sans lui, deux sites connectés à Azure par deux circuits atteignent chacun les réseaux virtuels mais pas l'autre site. Global Reach relie les peerings privés des deux circuits ; il demande un sous-réseau **/29** dédié, inutilisé en local comme dans Azure. Il se configure sur l'un des deux circuits. Il n'est pas transitif : avec les circuits A, B et C, relier A à B et B à C ne connecte pas A à C. Il est facturé comme un module complémentaire, et il n'est pas disponible sur les circuits Local.

**FastPath.** La passerelle reste obligatoire : elle échange les routes. Seul le chemin des données change, du MSEE directement aux machines virtuelles. Tous les flux ne sont pas éligibles :

| Capacité | Circuit ExpressRoute Direct | Circuit de fournisseur |
| --- | --- | --- |
| FastPath vers le réseau virtuel hub, IPv4 | Oui | Oui |
| Peering de réseaux virtuels sur FastPath (même région) | Oui | Non |
| Routes définies par l'utilisateur sur FastPath | Oui | Non |
| Points de terminaison privés sur FastPath | Oui, disponibilité limitée | Non |

Le trafic non éligible continue de passer par la passerelle, par exemple vers un spoke joint par un peering mondial de réseaux virtuels ou vers un équilibreur de charge interne situé dans un spoke.

**ExpressRoute Direct.** Vous possédez les deux ports et y créez vous-même les circuits :

| Paire de ports | Bandes passantes de circuit |
| --- | --- |
| 10 Gbit/s | 1, 2, 5, 10 Gbit/s |
| 100 Gbit/s | 5, 10, 40, 100 Gbit/s |
| 400 Gbit/s | 5, 10, 40, 100, 200, 400 Gbit/s |

Les ports utilisent de la fibre monomode et acceptent l'encapsulation QinQ ou Dot1Q. ExpressRoute Direct est le seul modèle qui prend en charge le chiffrement **MACsec** des liaisons physiques, et il donne accès à l'ensemble des fonctionnalités FastPath. Déclencheurs typiques : ingestion massive de données dans Stockage Azure ou Azure Cosmos DB, secteurs réglementés qui exigent des ports dédiés, un circuit par unité commerciale.

> **Piège d'examen.** FastPath ne supprime pas la passerelle et ne fonctionne pas avec les références SKU `Standard`/`ErGw1Az` ou `HighPerformance`/`ErGw2Az`. « Réduire la latence entre le réseau local et les machines virtuelles Azure » avec une passerelle `ErGw1Az` impose d'abord de changer la référence SKU de la passerelle.

<!-- section: peering-choice | objectives: 2.3.5 -->
## Choisir le peering privé, le peering Microsoft ou les deux

Un circuit porte jusqu'à deux peerings, chacun constitué d'une paire de sessions BGP. Ils partagent la bande passante du circuit.

| | Peering privé Azure | Peering Microsoft |
| --- | --- | --- |
| Donne accès à | Les ressources des réseaux virtuels, par leurs adresses IP privées | Microsoft 365 et les points de terminaison publics des services PaaS Azure |
| Adresses que vous publiez | Toute adresse valide de votre WAN, privée ou publique | Des adresses publiques qui appartiennent à vous ou à votre fournisseur, vérifiées dans un registre de routage |
| Côté Azure | Une passerelle de réseau virtuel ExpressRoute et une connexion | Un filtre de routage ; pas de passerelle |
| Préfixes acceptés | 4 000 IPv4 (10 000 avec Premium) | 200 par session BGP |
| NAT | Inutile | Les adresses privées doivent être traduites en adresses publiques avant d'entrer dans le réseau Microsoft |

Table de décision :

| Besoin | Peering |
| --- | --- |
| Atteindre des machines virtuelles, des équilibreurs de charge internes, des points de terminaison privés | Privé uniquement |
| Atteindre les points de terminaison publics de Stockage Azure ou d'Azure SQL Database par ExpressRoute | Microsoft |
| Atteindre des services PaaS en privé, sans adresses publiques | Privé uniquement, avec des points de terminaison privés |
| Microsoft 365 par ExpressRoute | Microsoft, avec Premium et l'autorisation de Microsoft |
| Tunnel IPsec vers l'adresse IP publique d'une passerelle VPN à travers le circuit | Microsoft |
| Réseaux virtuels et points de terminaison publics PaaS | Les deux |

Microsoft recommande de raccorder le peering privé à votre réseau principal et le peering Microsoft à votre réseau de périmètre (DMZ), puisque ce dernier échange des adresses publiques.

> **Piège d'examen.** Le peering privé ne donne pas accès au point de terminaison public d'un compte de stockage, et le peering Microsoft ne donne pas accès à un réseau virtuel. Un point de terminaison de service n'aide pas non plus les clients locaux : utilisez un point de terminaison privé sur le peering privé, ou le peering Microsoft.

<!-- section: key-points -->
## Points clés

- Modèles : échange cloud, Ethernet point à point (couche 2, vous gérez BGP), IPVPN universel (couche 3 managée), ExpressRoute Direct (sans fournisseur).
- Local : région voisine uniquement, données incluses, pas de Global Reach. Standard : la zone géopolitique. Premium : le monde entier, 10 000 routes, davantage de réseaux virtuels, Microsoft 365.
- La bande passante peut augmenter, pas diminuer ; les données illimitées ne reviennent pas aux données limitées.
- Résilience : standard (un emplacement), élevée (ExpressRoute Metro), maximale (deux circuits dans deux emplacements de peering). Passerelle redondante interzone côté Azure.
- Circuits principal et de secours : préfixes plus spécifiques, poids de connexion ou préfixage du chemin d'AS vers le réseau local ; préférence locale vers Azure.
- Global Reach relie des sites locaux par deux circuits et demande un /29 ; FastPath demande `UltraPerformance`, `ErGw3AZ` ou `ErGwScale` avec 10 unités d'échelle ; ExpressRoute Direct fournit des ports de 10, 100 ou 400 Gbit/s et MACsec.
- Le peering privé atteint les réseaux virtuels ; le peering Microsoft atteint les points de terminaison publics et demande des adresses publiques et un filtre de routage.
