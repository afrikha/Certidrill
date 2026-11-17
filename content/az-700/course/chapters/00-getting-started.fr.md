L'AZ-700 vérifie que vous savez concevoir, implémenter et dépanner les réseaux Azure : adressage et résolution de noms, routage, connectivité hybride, distribution d'applications, accès privé aux services de plateforme et sécurité réseau. Ce cours suit le guide d'étude officiel, objectif par objectif ; chaque section indique les objectifs qu'elle prépare.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | Microsoft Certified: Azure Network Engineer Associate (niveau intermédiaire) |
| Durée | 100 minutes d'examen |
| Questions | Nombre non publié ; environ 40 à 60 en pratique |
| Score de réussite | 700 sur une échelle de 1 à 1000 |
| Mauvaises réponses | Pas de point négatif : répondez toujours |
| Documentation | Microsoft Learn est consultable pendant l'examen, sans temps supplémentaire |
| Validité | Un an, renouvelable gratuitement par une évaluation en ligne sur Microsoft Learn |

Les cinq domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Concevoir et implémenter une infrastructure réseau principale | 25 à 30 % |
| Concevoir, implémenter et gérer des services de connectivité | 20 à 25 % |
| Concevoir et implémenter des services de distribution d'applications | 15 à 20 % |
| Concevoir et implémenter un accès privé aux services Azure | 10 à 15 % |
| Concevoir et implémenter des services de sécurité réseau Azure | 15 à 20 % |

Le score est étalonné : 700 ne signifie pas 70 % des questions. Les questions composées de plusieurs éléments (listes déroulantes, affirmations Oui/Non, glisser-déposer, étapes à ordonner) rapportent un point par élément correct.

Un examen est composé de sections :

- **Étude de cas.** La description d'une entreprise (environnement existant, changements prévus, exigences techniques), suivie de plusieurs questions. Une fois l'étude de cas quittée, vous ne pouvez plus y revenir.
- **Série Oui/Non.** Le même scénario est répété avec une solution différente à chaque fois ; vous indiquez si la solution atteint l'objectif. Chaque réponse est définitive. Plusieurs solutions peuvent être bonnes, ou aucune.
- **Section principale.** Des questions indépendantes, que vous pouvez marquer et revoir jusqu'à la soumission : une réponse parmi quatre, « sélectionnez deux réponses » ou « trois réponses », trois affirmations Oui/Non sur une topologie, listes déroulantes qui complètent une configuration ou une commande, glisser-déposer et étapes à remettre dans l'ordre.

> **Conseil d'examen.** Microsoft Learn est disponible, mais chercher coûte du temps. Servez-vous-en pour une valeur précise qui vous échappe (une taille de sous-réseau, une limite d'un SKU), jamais pour apprendre un sujet pendant l'examen.

<!-- section: reading-questions -->
## Lire une question

La moitié des questions demande quel service, quel SKU ou quelle topologie répond à un ensemble d'exigences ; l'autre moitié demande quoi configurer, et dans quel ordre. Les énoncés sont moyens à longs : l'environnement est donné sous forme de tableaux (réseaux virtuels et espaces d'adressage, sous-réseaux, peerings, tables de routage, règles de NSG, passerelles) ou d'une illustration, suivis d'un besoin précis (« Vous devez vous assurer que VM1 peut... »).

Procédez en trois temps :

1. Dessinez la topologie : réseaux virtuels, plages d'adresses, peerings et leurs options, passerelles, endroits où les tables de routage et les NSG sont associés.
2. Suivez le paquet ou la requête DNS, saut après saut. La plupart des mauvaises réponses réparent un saut qui n'est pas en panne.
3. Repérez la contrainte qui départage les deux réponses plausibles.

| Mots de l'énoncé | Pensez à |
| --- | --- |
| « réduire les coûts » | Le SKU le plus bas ou le service le plus simple qui respecte encore toutes les exigences |
| « réduire l'effort d'administration » | Le service managé plutôt que des machines virtuelles à maintenir (Azure DNS Private Resolver plutôt que des serveurs DNS, Azure NAT Gateway plutôt qu'une appliance NAT) |
| « ne doit pas passer par internet », « en utilisant une adresse IP privée » | Point de terminaison privé ; peering privé ExpressRoute pour le réseau local |
| « depuis le réseau local », « par son nom » | Un chemin DNS : redirecteur conditionnel, point de terminaison entrant, lien de zone DNS privée |
| « les mêmes adresses IP sortantes », « liste d'autorisation d'un partenaire » | Passerelle NAT avec une adresse IP publique ou un préfixe d'adresse IP publique |
| « HTTP », « chemin d'URL », « en-tête d'hôte », « terminaison TLS », « cookie » | Couche 7 : Application Gateway (régional) ou Azure Front Door (mondial) |
| « TCP ou UDP », « n'importe quel port », « non HTTP » | Couche 4 : Azure Load Balancer |
| « filtrer le trafic sortant par nom de domaine complet (FQDN) », « inspecter » | Pare-feu Azure, avec un itinéraire qui lui envoie le trafic |
| « tous les réseaux virtuels, présents et futurs » | Azure Virtual Network Manager, avec un groupe de réseaux à appartenance dynamique |

Les commandes se lisent, elles s'écrivent rarement : vous complétez une commande Azure CLI ou Azure PowerShell avec une liste déroulante. Retenez les noms (`az network vnet subnet`, `az network private-dns link vnet`, `New-AzVirtualNetworkGatewayConnection`) plus que chaque paramètre.

<!-- section: core-rules -->
## Les règles qui décident de nombreuses réponses

Ces règles reviennent dans tous les domaines. Chacune est détaillée dans son chapitre.

1. **Les espaces d'adressage de réseaux connectés ne peuvent pas se chevaucher.** Cela vaut pour les réseaux virtuels appairés et pour les réseaux locaux joints par une passerelle.
2. **Azure réserve cinq adresses dans chaque sous-réseau** : les quatre premières et la dernière. Un sous-réseau /29 laisse 3 adresses utilisables.
3. **Le peering de réseaux virtuels n'est pas transitif.** Si A est appairé à B et B à C, A n'atteint pas C sans un autre peering, ou sans un routeur dans B et des itinéraires.
4. **Sélection de l'itinéraire** : l'itinéraire dont le préfixe correspondant est le plus long l'emporte. À préfixe égal, un itinéraire défini par l'utilisateur l'emporte sur un itinéraire BGP, qui l'emporte sur un itinéraire système.
5. **Les règles de NSG** sont traitées par priorité, du plus petit numéro au plus grand, et la première correspondance arrête l'évaluation. Le trafic entrant rencontre le NSG du sous-réseau, puis celui de l'interface réseau ; le trafic sortant les rencontre dans l'ordre inverse. Les deux doivent autoriser le flux.
6. **Des serveurs DNS personnalisés définis sur un réseau virtuel remplacent le DNS fourni par Azure.** Les zones DNS privées liées à ce réseau virtuel ne sont alors résolues que si le serveur personnalisé transfère les requêtes à 168.63.129.16.
7. **Les adresses IP publiques et les équilibreurs de charge de SKU Basic sont retirés.** Une adresse IP publique Standard est statique et fermée au trafic entrant tant qu'un NSG ne l'autorise pas.

> **Piège d'examen.** Un service est rarement faux en lui-même : il est faux pour la couche, la portée ou le sens du trafic. Avant de répondre, nommez les trois : couche 4 ou couche 7, régional ou mondial, entrant ou sortant.

<!-- section: confusing-pairs -->
## Les services faciles à confondre

| Ne confondez pas | Avec | Différence |
| --- | --- | --- |
| Point de terminaison de service | Point de terminaison privé | Un point de terminaison de service donne à un sous-réseau un itinéraire optimisé vers le point de terminaison public d'un service et permet au service de reconnaître le sous-réseau ; il est inutilisable depuis le réseau local. Un point de terminaison privé est une interface réseau dotée d'une adresse IP privée dans votre réseau virtuel, joignable depuis les réseaux appairés et locaux, et il a besoin d'enregistrements DNS |
| Point de terminaison privé | Service Private Link | Le point de terminaison privé est le côté consommateur. Un service Private Link est le côté fournisseur : votre propre service, derrière un équilibreur de charge Standard, proposé à des consommateurs |
| Azure Load Balancer | Application Gateway | Load Balancer répartit des flux TCP et UDP (couche 4). Application Gateway est un proxy HTTP et HTTPS régional (couche 7) : routage par URL, terminaison TLS, pare-feu d'applications web |
| Application Gateway | Azure Front Door | Application Gateway réside dans un sous-réseau d'une région. Front Door est un point d'entrée mondial à la périphérie du réseau Microsoft, devant des origines situées dans plusieurs régions |
| Azure Front Door | Traffic Manager | Front Door relaie le trafic HTTP et HTTPS. Traffic Manager ne fait que répondre à des requêtes DNS : il convient à tout protocole, et le trafic ne le traverse jamais |
| NSG | Pare-feu Azure | Un NSG filtre par adresse IP, port et protocole sur un sous-réseau ou une interface réseau. Le Pare-feu Azure est un pare-feu central et managé (filtrage par FQDN, renseignement sur les menaces) que le trafic atteint grâce à des itinéraires |
| Règle de NSG | Règle d'administration de sécurité | Les règles d'administration de sécurité d'Azure Virtual Network Manager s'appliquent de façon centrale à de nombreux réseaux virtuels et sont évaluées avant les règles de NSG |
| Groupe de sécurité d'application | Étiquette de service | Un ASG regroupe vos propres interfaces réseau. Une étiquette de service est un ensemble de préfixes IP d'un service Azure, tenu à jour par Microsoft |
| Passerelle VPN | ExpressRoute | La passerelle VPN établit des tunnels chiffrés sur internet. ExpressRoute est un circuit privé fourni par un fournisseur de connectivité, non chiffré par défaut |
| VPN de site à site | VPN de point à site | Le site à site connecte un réseau entier au moyen d'un périphérique VPN local. Le point à site connecte des postes clients individuels |
| Zone DNS privée | Azure DNS Private Resolver | Une zone privée héberge des enregistrements pour les réseaux virtuels qui lui sont liés. Le résolveur transfère les requêtes entre Azure et d'autres réseaux par des points de terminaison entrants et sortants |
| Passerelle NAT | Règle de trafic sortant d'un équilibreur de charge | Une passerelle NAT fournit la connectivité sortante à des sous-réseaux entiers et elle est prioritaire. Une règle de trafic sortant la fournit au pool principal d'un équilibreur de charge public Standard |
| Azure Route Server | Itinéraire défini par l'utilisateur | Route Server échange des itinéraires en BGP avec des appliances virtuelles réseau ; il ne transfère pas le trafic de données. Un itinéraire défini par l'utilisateur est statique |
| Préfixe d'adresse IP publique | Préfixe d'adresse IP personnalisé | Un préfixe d'adresse IP publique est une plage contiguë appartenant à Microsoft. Un préfixe d'adresse IP personnalisé est une plage qui vous appartient et que vous apportez à Azure |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : le routage, l'accès privé et la sécurité s'appuient tous sur l'adressage et la résolution de noms.
2. Reproduisez les principales topologies dans un abonnement avec paiement à l'utilisation : un hub et deux spokes appairés, une table de routage qui pointe vers une appliance virtuelle, une zone DNS privée, un point de terminaison privé. Les passerelles et les pare-feu sont facturés à l'heure : supprimez le groupe de ressources à la fin de chaque session.
3. Pour chaque topologie, lisez les **itinéraires effectifs** et les **règles de sécurité effectives** d'une interface réseau jusqu'à savoir les prédire avant d'ouvrir la page.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
