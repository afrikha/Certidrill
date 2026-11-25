Le Pare-feu Azure (Azure Firewall) est un pare-feu réseau managé et avec état qui filtre le trafic est-ouest et sortant et publie des services en entrée par DNAT. Azure Firewall Manager centralise ses stratégies et transforme les hubs Virtual WAN en hubs sécurisés. Les questions d'examen font correspondre une liste d'exigences à une référence SKU et à des fonctionnalités, placent le pare-feu dans une topologie et testent l'ordre de traitement des règles.

<!-- section: firewall-capabilities | objectives: 5.2.1 -->
## Faire correspondre les exigences aux fonctionnalités du Pare-feu Azure

| Exigence | Fonctionnalité |
| --- | --- |
| Autoriser le HTTP/HTTPS ou Azure SQL sortant uniquement vers des noms de domaine listés, caractères génériques admis | Règle d'application avec FQDN cibles (correspondance sur l'en-tête Host ou le SNI TLS, sans terminaison TLS) |
| Filtrer par IP, port et protocole (TCP, UDP, ICMP, Any) entre spokes, vers le réseau local ou vers Internet | Règle de réseau |
| Filtrer des protocoles non HTTP (SSH, NTP, RDP) par FQDN | Règle de réseau avec FQDN de destination, qui exige le **proxy DNS** |
| Publier un serveur interne via l'IP publique du pare-feu | Règle DNAT (adresse et port traduits) |
| Masquer les adresses privées derrière une ou plusieurs IP publiques pour la sortie Internet | SNAT automatique (jusqu'à 250 IP publiques, ou une passerelle NAT) |
| Autoriser des services Microsoft connus, réutiliser des listes d'adresses | Balises FQDN (règles d'application), étiquettes de service (règles de réseau), groupes IP |
| Bloquer les IP et domaines malveillants connus | Renseignement sur les menaces en mode **Alerte et refus** |
| Bloquer des catégories comme les jeux d'argent ou les réseaux sociaux | Catégories web (sur le FQDN en Standard, sur l'URL complète en Premium) |
| Filtrer sur le chemin complet de l'URL, inspecter le contenu HTTPS | Inspection TLS et filtrage d'URL (Premium) |
| Détecter et bloquer des attaques par signatures | IDPS (Premium) |

> **Piège d'examen.** Le Pare-feu Azure n'applique pas les règles d'application aux connexions entrantes. Pour filtrer les requêtes HTTP/HTTPS entrantes contre l'injection SQL ou le cross-site scripting, utilisez un WAF (Application Gateway ou Front Door), éventuellement devant le pare-feu ou à côté.

<!-- section: firewall-skus | objectives: 5.2.2 -->
## Sélectionner une référence SKU de Pare-feu Azure

| Capacité | Basic | Standard | Premium |
| --- | --- | --- | --- |
| Débit | Jusqu'à 250 Mbit/s | Jusqu'à 30 Gbit/s (mise à l'échelle automatique) | Jusqu'à 100 Gbit/s (mise à l'échelle automatique) |
| Flux massif (une seule connexion) | N/A | 1 Gbit/s | 10 Gbit/s |
| Filtrage FQDN d'application, règles de réseau, SNAT/DNAT, zones de disponibilité | Oui | Oui | Oui |
| Filtrage FQDN au niveau réseau, proxy DNS, DNS personnalisé | Non | Oui | Oui |
| Renseignement sur les menaces | Alerte seulement | Alerte et refus | Alerte et refus |
| Catégories web | Non | FQDN seulement | URL complète |
| Inspection TLS, IDPS, filtrage d'URL | Non | Non | Oui |
| Déploiement sans IP publique de données en mode tunneling forcé | Non | Oui | Oui |
| Carte réseau de gestion | Toujours | Facultative (nécessaire au tunneling forcé) | Facultative (nécessaire au tunneling forcé) |

Choisissez la référence SKU la plus basse qui répond aux exigences : **Basic** pour les petits environnements (pas de proxy DNS, donc pas de FQDN dans les règles de réseau, et le renseignement sur les menaces ne peut pas refuser), **Standard** pour le filtrage d'entreprise, **Premium** pour les charges de travail réglementées (paiement, santé) qui exigent l'inspection TLS, l'IDPS (plus de 67 000 signatures) ou le filtrage d'URL.

La stratégie de pare-feu a un niveau correspondant : une stratégie **Basic** pour les pare-feu Basic, une stratégie **Standard** pour les pare-feu Standard ou Premium, une stratégie **Premium** (inspection TLS, IDPS, filtrage d'URL) pour les pare-feu Premium uniquement. Vous pouvez passer de Standard à Premium et inversement sans interruption (changement de SKU simplifié dans le portail ou PowerShell).

> **Conseil d'examen.** « Inspecter le trafic sortant chiffré », « IDPS » ou « filtrer `www.contoso.com/finance` mais pas le reste du site » exigent tous Premium. « Autoriser SSH vers `sftp.fabrikam.com` par son nom » exige Standard ou Premium avec le proxy DNS.

<!-- section: firewall-design | objectives: 5.2.3 -->
## Concevoir un déploiement de Pare-feu Azure

Conception type : un pare-feu par région dans le réseau virtuel **hub** d'une topologie hub-and-spoke. Les spokes sont reliés au hub par peering, et chaque sous-réseau de spoke reçoit une table de routage avec `0.0.0.0/0` (et les préfixes des autres spokes si besoin) vers **Appliance virtuelle** = l'IP privée du pare-feu.

| Élément de conception | Règle |
| --- | --- |
| Sous-réseau de données | **AzureFirewallSubnet**, **/26** |
| Sous-réseau de gestion | **AzureFirewallManagementSubnet**, **/26**, avec sa propre IP publique ; nécessaire au tunneling forcé ; toujours présent pour les pare-feu Basic et ceux des hubs sécurisés. La seule route autorisée sur ce sous-réseau est une route par défaut vers Internet, avec **Propager les routes de passerelle** désactivé |
| Pare-feu par réseau virtuel | Un |
| Zones de disponibilité | Pour un nouveau déploiement, ne spécifiez pas de zones : Azure répartit les instances entre les zones dans les régions compatibles avec la redondance de zone, sans surcoût |
| Adresses IP publiques | Référence SKU Standard, jusqu'à **250** par pare-feu dans un réseau virtuel (80 dans un hub sécurisé) ; un préfixe d'IP publique ne peut pas être attaché en tant que tel, mais les adresses créées à partir de lui le peuvent |
| Mise à l'échelle | Démarre avec deux instances et monte en charge automatiquement (5 à 7 minutes) ; la mise à l'échelle préalable (prescaling) fixe de 2 à 50 unités de capacité |

**SNAT.** Le trafic sortant vers des adresses publiques est traduit vers une IP publique du pare-feu ; le trafic vers les plages privées (IANA RFC 1918 et RFC 6598) n'est pas traduit ; si votre organisation utilise des plages publiques en interne, ajoutez-les au paramètre **plages d'adresses IP privées**. Le trafic accepté par des **règles d'application est toujours traduit (SNAT)** (utilisez des règles de réseau avec FQDN pour conserver la source d'origine dans les journaux). Chaque IP publique apporte **2 496 ports SNAT par instance** ; au-delà, associez une **passerelle NAT** à AzureFirewallSubnet (64 512 ports par IP publique de la passerelle NAT, sans itinéraire défini par l'utilisateur supplémentaire, passerelle NAT StandardV2 pour un pare-feu redondant interzone). Une passerelle NAT n'est pas prise en charge dans un hub virtuel sécurisé.

**Tunneling forcé.** Pour envoyer le trafic Internet vers un pare-feu local ou une NVA, déployez le pare-feu avec la **carte réseau de gestion** activée, puis ajoutez une route `0.0.0.0/0` (itinéraire défini par l'utilisateur, ou BGP avec **Propager les routes de passerelle**) sur AzureFirewallSubnet. Le trafic Internet est alors traduit vers une IP privée du pare-feu ; pour conserver les sources d'origine, définissez les plages d'adresses IP privées sur `0.0.0.0/0`. Un pare-feu configuré en tunneling forcé ne peut pas servir de DNAT entrant depuis Internet (routage asymétrique). Sinon, le pare-feu a besoin d'un accès Internet direct : si AzureFirewallSubnet apprend une route par défaut par BGP, remplacez-la par un itinéraire défini par l'utilisateur `0.0.0.0/0` vers **Internet**.

> **Piège d'examen.** L'itinéraire vers le pare-feu se place sur les sous-réseaux de charge de travail, avec **Propager les routes de passerelle** désactivé (ou avec des routes spécifiques qui priment sur les préfixes locaux appris par BGP). Pour que le trafic local vers les spokes traverse aussi le pare-feu, le **GatewaySubnet** a besoin de sa propre table de routage qui envoie les préfixes des spokes vers le pare-feu.

<!-- section: firewall-deploy | objectives: 5.2.4 -->
## Créer et implémenter un déploiement de Pare-feu Azure

Ordre des opérations :

1. Créer (ou réutiliser) le réseau virtuel hub avec **AzureFirewallSubnet** /26 (et **AzureFirewallManagementSubnet** /26 pour Basic ou le tunneling forcé).
2. Créer une IP publique statique de référence SKU Standard (et une IP publique de gestion si nécessaire).
3. Créer la **stratégie de pare-feu** (niveau correspondant au pare-feu) avec ses groupes de collections de règles.
4. Déployer le pare-feu : SKU `AZFW_VNet` (réseau virtuel) ou `AZFW_Hub` (hub Virtual WAN), niveau, réseau virtuel, IP publique, stratégie. Noter son **IP privée**.
5. Créer une table de routage (propagation des routes de passerelle désactivée quand les routes locales ne doivent pas contourner le pare-feu) avec `0.0.0.0/0` vers **VirtualAppliance** = IP privée du pare-feu, et l'associer aux sous-réseaux de charge de travail.
6. Faire pointer le DNS des machines virtuelles vers le pare-feu si le proxy DNS sert aux règles de réseau avec FQDN.
7. Activer les paramètres de diagnostic et tester.

```bash
az network firewall policy create -g RG-Hub -n FWP-Hub \
  --sku Standard --threat-intel-mode Deny --enable-dns-proxy true

az network firewall create -g RG-Hub -n FW-Hub \
  --sku AZFW_VNet --tier Standard --firewall-policy FWP-Hub

az network firewall ip-config create -g RG-Hub --firewall-name FW-Hub \
  --name FW-config --public-ip-address pip-fw-hub --vnet-name VNet-Hub

az network route-table create -g RG-Spoke1 -n RT-Spoke1 \
  --disable-bgp-route-propagation true
az network route-table route create -g RG-Spoke1 --route-table-name RT-Spoke1 \
  -n Default-to-FW --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
```

> **Piège d'examen.** Créer le pare-feu n'y route rien. Sans l'itinéraire défini par l'utilisateur sur les sous-réseaux de charge de travail, les machines virtuelles continuent d'utiliser la route système vers Internet et le pare-feu ne voit aucun trafic.

<!-- section: firewall-rules | objectives: 5.2.5 -->
## Configurer les règles du Pare-feu Azure

Avec une stratégie de pare-feu, les règles s'organisent en **groupes de collections de règles** (RCG) qui contiennent des **collections de règles** (DNAT, réseau ou application, avec une seule action : Autoriser ou Refuser pour les collections de filtrage, DNAT pour les collections NAT) qui contiennent des **règles**. Les priorités vont de **100 (en premier) à 65 000 (en dernier)**. Groupes par défaut : DNAT (100), réseau (200), application (300). Dans une collection, la première règle qui correspond s'applique. Les règles sont **finales** (le traitement s'arrête à la première correspondance), et tout ce qui n'est pas autorisé est **refusé par défaut**.

Ordre de traitement :

1. Le **renseignement sur les menaces** (s'il est activé) avant toute règle.
2. Les règles **DNAT**, puis les règles de **réseau**, puis les règles d'**application**, quelles que soient les priorités des groupes ou des collections. Pour chaque type : les groupes de collections de règles par priorité, puis les collections par priorité. Les collections de règles de réseau et d'application héritées d'une **stratégie parente** passent toujours avant celles de l'enfant.
3. Si aucune règle d'application ne correspond, la **collection de règles d'infrastructure** intégrée (FQDN de la plateforme), puis le refus.
4. L'**IDPS** (Premium) : en mode Alerte, il s'exécute en parallèle ; en mode Alerte et refus, il s'exécute après le traitement des règles et peut abandonner un flux qu'une règle a autorisé.

| Type de règle | Correspondance sur | Remarques |
| --- | --- | --- |
| DNAT | IP publique (ou privée) et port du pare-feu, source | Une correspondance traduit et **autorise implicitement** le trafic : aucune règle de réseau n'est nécessaire. Restreignez la source au lieu d'utiliser `*` |
| Réseau | Source, IP de destination, étiquette de service, groupe IP ou FQDN, port, protocole | Entrant, sortant et est-ouest |
| Application | Source, protocole:port (HTTP, HTTPS, MSSQL), FQDN cible, balise FQDN, catégorie web (URL avec l'inspection TLS de Premium) | Sortant et est-ouest uniquement ; HTTP correspond sur l'en-tête Host, HTTPS sur le SNI |

Exemple : une règle de réseau autorise TCP 443 vers `*` dans une collection de priorité 200, et une collection de règles d'application refuse `*.games.example` en priorité 100. Un utilisateur ouvre `https://play.games.example` : la **règle de réseau correspond en premier** (réseau avant application), donc la connexion est autorisée.

Dans les FQDN cibles, les caractères génériques ne fonctionnent qu'à gauche. `*.contoso.com` ne correspond pas au domaine `contoso.com` lui-même : ajoutez-le séparément à la règle. `*contoso.com` correspond à `contoso.com` lui-même, mais aussi à des noms indésirables comme `badcontoso.com`.

```bash
az network firewall policy rule-collection-group create -g RG-Hub \
  --policy-name FWP-Hub --name RCG-Spokes --priority 500

az network firewall policy rule-collection-group collection add-filter-collection \
  -g RG-Hub --policy-name FWP-Hub --rule-collection-group-name RCG-Spokes \
  --name Allow-Web --collection-priority 510 --action Allow \
  --rule-name Allow-Contoso --rule-type ApplicationRule \
  --source-addresses 10.1.0.0/16 --protocols Https=443 \
  --target-fqdns "*.contoso.com"
```

Le pare-feu est avec état : le trafic de retour d'une connexion autorisée passe même si une règle de refus existe dans le sens inverse.

> **Piège d'examen.** La priorité d'une collection ne fait jamais passer une règle d'application avant une règle de réseau. Si une question montre un refus d'application en priorité 100 et une autorisation réseau en priorité 300 pour le même trafic, l'autorisation réseau l'emporte.

<!-- section: firewall-manager-policies | objectives: 5.2.6 -->
## Créer des stratégies Azure Firewall Manager

**Azure Firewall Manager** gère de façon centralisée les pare-feu de plusieurs régions et abonnements dans deux architectures : **réseau virtuel hub** et **hub virtuel sécurisé** (un hub Virtual WAN).

| | Stratégie de pare-feu | Règles classiques |
| --- | --- | --- |
| Ressource | Ressource globale distincte, réutilisable par plusieurs pare-feu dans n'importe quelle région | Partie d'un seul pare-feu |
| Contenu | Règles NAT, de réseau et d'application, paramètres DNS, groupes IP, renseignement sur les menaces, plus IDPS, inspection TLS, catégories web, filtrage d'URL | Règles NAT, de réseau et d'application, DNS, groupes IP, renseignement sur les menaces |
| Protège | Réseaux virtuels et hubs Virtual WAN | Réseaux virtuels uniquement |
| Coût | Gratuite avec zéro ou une association de pare-feu, tarif fixe avec plusieurs | Gratuites |

**Hiérarchie.** Une stratégie enfant (locale) se crée avec une **stratégie parente** (de base) : elle hérite de ses collections de règles de réseau et d'application. **Les collections de règles NAT ne sont pas héritées**, car elles sont propres à chaque pare-feu : définissez les règles DNAT dans la stratégie enfant. La stratégie parente et la stratégie enfant doivent être dans la **même région**, mais la stratégie peut être associée à des pare-feu de n'importe quelle région. Les collections de règles de réseau et d'application héritées sont toujours traitées avant celles de l'enfant, quelles que soient les priorités ; les modifications de la stratégie parente se propagent automatiquement. Le mode du renseignement sur les menaces est hérité et ne peut être que durci dans l'enfant (Alerte seulement peut devenir Alerte et refus, jamais Désactivé) ; la liste d'autorisation ne peut qu'être étendue.

> **Conseil d'examen.** « L'équipe informatique centrale doit imposer des règles que les équipes d'application ne peuvent pas contourner, tandis que les équipes gèrent leurs propres règles » se traite par une stratégie parente et des stratégies enfants, pas par deux pare-feu ni par le seul RBAC.

<!-- section: secured-hub | objectives: 5.2.7 -->
## Créer un hub virtuel sécurisé

Un **hub virtuel sécurisé** est un hub Virtual WAN Standard doté du Pare-feu Azure (SKU `AZFW_Hub`) et de stratégies de sécurité et de routage définies par Firewall Manager. Il inspecte le trafic des spokes, des branches et vers Internet **sans itinéraires définis par l'utilisateur** : le hub pousse les routes.

| | Réseau virtuel hub | Hub virtuel sécurisé |
| --- | --- | --- |
| Ressource sous-jacente | Réseau virtuel que vous gérez | Hub Virtual WAN géré par Microsoft |
| Connectivité des spokes | Peering plus itinéraires définis par l'utilisateur | Connexions de réseau virtuel au hub, routes par BGP |
| IP publiques du pare-feu | Jusqu'à 250, fournies par le client | Jusqu'à 80, générées automatiquement (fournies par le client en préversion) |
| Fournisseurs SECaaS (Security as a service) tiers | Manuel | Fournisseurs partenaires de sécurité intégrés pour le trafic Internet |

Étapes (portail : **Sécurité réseau > Hubs virtuels > Créer un hub virtuel sécurisé**, ou convertir un hub existant) :

1. Créer ou sélectionner le Virtual WAN et le hub, activer le **Pare-feu Azure** (niveau, zones de disponibilité, nombre d'IP publiques, stratégie) et éventuellement un **fournisseur partenaire de sécurité**.
2. Connecter les réseaux virtuels spokes au hub.
3. Associer la stratégie de pare-feu au hub (**Gérer les associations > Associer des hubs**).
4. Dans la **Configuration de la sécurité** du hub, envoyer le **Trafic Internet** et le **Trafic privé** via le Pare-feu Azure, et régler **Inter-hub** sur Activé pour activer l'**intention de routage**.

L'**intention de routage** (routing intent) définit au plus une stratégie de **trafic Internet** (le hub annonce `0.0.0.0/0` aux spokes et aux branches) et une stratégie de **trafic privé** (trafic des branches, des réseaux virtuels et inter-hub) par hub, chacune avec un seul tronçon suivant (Pare-feu Azure, une NVA prise en charge ou une solution SaaS). Le trafic privé couvre par défaut les plages RFC 1918 ; ajoutez les autres plages internes dans **Préfixes de trafic privé**. L'intention de routage exige l'absence de tables de routage personnalisées, et c'est le seul moyen d'inspecter le trafic inter-hub et de branche à branche. La route par défaut ne traverse pas les hubs : le trafic Internet de chaque hub sort par son propre pare-feu.

> **Piège d'examen.** Sécuriser le trafic entre deux hubs, ou entre deux branches du même hub, exige l'intention de routage (stratégie de trafic privé). Déployer le pare-feu dans les deux hubs sans elle laisse ce trafic sans inspection.

<!-- section: key-points -->
## Points clés

- Basic 250 Mbit/s (renseignement sur les menaces en alerte seulement, pas de proxy DNS), Standard 30 Gbit/s (proxy DNS, catégories web, refus par le renseignement sur les menaces), Premium 100 Gbit/s (inspection TLS, IDPS, filtrage d'URL).
- AzureFirewallSubnet /26, AzureFirewallManagementSubnet /26 pour le tunneling forcé et Basic ; un pare-feu par réseau virtuel ; jusqu'à 250 IP publiques (80 dans un hub sécurisé).
- Les sous-réseaux de charge de travail ont besoin d'un itinéraire défini par l'utilisateur `0.0.0.0/0` vers l'IP privée du pare-feu ; sans lui, rien n'est filtré.
- Traitement : renseignement sur les menaces, DNAT, réseau, application, collection d'infrastructure, refus ; stratégie parente avant l'enfant ; priorités de 100 à 65 000.
- Le DNAT autorise implicitement ; les règles d'application ne valent que pour le sortant et l'est-ouest et appliquent toujours le SNAT ; les FQDN dans les règles de réseau exigent le proxy DNS ; les ports SNAT augmentent avec des IP publiques ou une passerelle NAT.
- Les stratégies Firewall Manager sont globales, réutilisables et hiérarchiques (parente et enfant dans la même région ; les collections de règles NAT ne sont pas héritées) ; les hubs sécurisés utilisent l'intention de routage pour le trafic Internet, privé et inter-hub.
