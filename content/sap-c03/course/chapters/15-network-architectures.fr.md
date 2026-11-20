Au niveau professionnel, les questions de conception réseau partent d'un parc, pas d'un VPC isolé : des dizaines ou des centaines de comptes, plusieurs Régions, des sites sur site, des plages d'adresses qui se chevauchent héritées d'acquisitions, une équipe de sécurité centrale et une exigence d'inspection ou de journalisation du trafic. La réponse est en général la construction qui atteint l'échelle et l'isolation demandées avec le moins de composants à exploiter : comparez les options sur la transitivité, la prise en charge des CIDR qui se chevauchent, le sens de l'accès, l'échelle et qui exploite quoi.

<!-- section: multi-vpc-connectivity | objectives: 1.4.1 -->
## Connectivité multi-VPC et multicomptes

| Construction | Modèle | Points forts | Limites |
| --- | --- | --- | --- |
| Appairage de VPC (VPC peering) | Un à un, même compte ou autre compte, même Région ou autre Région | Pas de frais horaires, pas de goulet de bande passante, références de groupes de sécurité entre VPC appairés de la même Région | Non transitif, pas de CIDR qui se chevauchent, maillage en n(n-1)/2 |
| AWS Transit Gateway | Hub régional, attachements VPC et hybrides, tables de routage par segment | Routage transitif, jusqu'à 100 Gbit/s par attachement VPC et par zone de disponibilité, 5 000 attachements par défaut, appairage entre Régions | Routes statiques sur l'appairage, une conception de tables de routage par Région à exploiter |
| AWS Cloud WAN | Réseau central mondial construit à partir d'une politique JSON déclarative | Segments (domaines de routage isolés mondiaux), maillage complet automatique entre les périphéries du réseau central (core network edges), politiques d'attachement basées sur les balises, groupes de fonctions réseau pour l'inspection | Moins de réglages manuels ; facturation des périphéries et des attachements |
| AWS PrivateLink | Point de terminaison d'interface du consommateur vers un service de point de terminaison du fournisseur derrière un NLB | Accès unidirectionnel à un service, CIDR qui se chevauchent acceptés, entre comptes, accès entre Régions quand le fournisseur ajoute des Régions prises en charge | Niveau service uniquement, pas de routage au niveau réseau |
| Amazon VPC Lattice | Réseau de services associant des VPC et des services (instances, IP, Lambda, ALB, tâches ECS, pods Kubernetes) | Routage au niveau application, politiques d'authentification IAM par service ou par réseau, CIDR qui se chevauchent, pas de frais de transfert entre zones de disponibilité, configurations de ressources pour des ressources TCP comme RDS | Pas une structure de routage générale |
| VPC partagé (AWS RAM) | Sous-réseaux détenus par un compte réseau, partagés avec des comptes participants | Un seul VPC à exploiter, les participants lancent leurs ressources dans les sous-réseaux partagés | Les participants ne peuvent modifier ni les routes, ni les listes ACL réseau, ni les sous-réseaux |

Choisir :

| Exigence | Réponse |
| --- | --- |
| Deux ou trois VPC, coût le plus bas, pas besoin de transitivité | Appairage de VPC |
| Des centaines de VPC dans une Région plus Direct Connect et VPN | Transit Gateway avec des tables de routage séparées pour la production, la hors-production et les services partagés |
| Nombreuses Régions, segmentation cohérente, politique centrale avec retour arrière | Cloud WAN |
| Un fournisseur SaaS expose une API à des milliers de VPC clients aux CIDR qui se chevauchent | Service de point de terminaison PrivateLink (NLB), les consommateurs créent des points de terminaison d'interface |
| Des microservices détenus par de nombreux comptes s'appellent en HTTP avec une autorisation IAM | Réseau de services VPC Lattice partagé avec AWS RAM |
| Une équipe centrale détient le réseau, les équipes applicatives seulement les charges de travail | Sous-réseaux de VPC partagé par RAM |
| Des VPC aux CIDR qui se chevauchent doivent échanger du trafic au niveau réseau | Passerelle NAT privée dans un sous-réseau routable, ou refonte ; Transit Gateway et l'appairage exigent des plages uniques |

La segmentation d'une passerelle de transit se fait par les tables de routage : chaque attachement est associé à exactement une table de routage et peut se propager dans plusieurs. Une conception type associe les VPC satellites à une table « spokes » qui ne connaît que les services partagés et le site, et des routes blackhole séparent production et développement. Cloud WAN exprime la même idée avec des segments et des actions de segment (partager des routes entre segments, ou isoler les attachements à l'intérieur d'un segment).

> **Piège d'examen.** PrivateLink et VPC Lattice sont les seules réponses qui fonctionnent avec des CIDR qui se chevauchent sans NAT. L'appairage et Transit Gateway refusent ou routent mal les préfixes qui se chevauchent.

<!-- section: vpc-design-ipam | objectives: 1.4.2 -->
## Stratégie de sous-réseaux, gestion des adresses IP et segmentation

À grande échelle, le plan d'adressage se fait avant la création des comptes, avec **Amazon VPC IP Address Manager (IPAM)** :

- Un IPAM possède par défaut une **portée privée** et une **portée publique** (scopes) ; chaque portée représente l'espace d'adresses d'un réseau, ce qui permet de réutiliser les mêmes plages dans des réseaux non connectés.
- Les **pools** s'imbriquent : un pool de premier niveau (par exemple `10.0.0.0/8`), des pools régionaux par Région, puis des pools par environnement ou par unité métier. Les règles d'allocation d'un pool fixent les longueurs de masque minimale, maximale et par défaut ainsi que les balises obligatoires : un VPC créé à partir du pool reçoit automatiquement un CIDR sans chevauchement.
- Avec AWS Organizations, IPAM est administré depuis un compte administrateur délégué et surveille chaque compte membre : il signale les CIDR non conformes, qui se chevauchent ou non gérés, et conserve l'historique des attributions d'adresses IP.
- IPAM gère aussi l'espace public : apport de vos propres plages IPv4 ou IPv6 (BYOIP), partage entre comptes et Régions, et attribution de blocs IPv6 contigus fournis par Amazon.

```text
IPAM private scope
  top-level pool 10.0.0.0/8
    eu-west-1 pool 10.16.0.0/12
      prod pool    10.16.0.0/13   allocation: /20 to /22, tag env=prod required
      nonprod pool 10.24.0.0/13   allocation: /22 to /24, tag env=nonprod required
    us-east-1 pool 10.32.0.0/12
```

Stratégie de sous-réseaux d'un VPC d'entreprise :

| Niveau | Route | Remarques |
| --- | --- | --- |
| Public | `0.0.0.0/0` et `::/0` vers la passerelle Internet | Uniquement équilibreurs de charge, passerelles NAT et appliances de périphérie |
| Application privée | `0.0.0.0/0` vers la passerelle NAT ou vers la passerelle de transit (sortie centralisée) | Grandes plages : conteneurs, Lambda et points de terminaison consomment des adresses |
| Données | Pas de route par défaut | Bases de données, caches, points de terminaison d'interface |
| Attachement de passerelle de transit | Petit sous-réseau dédié par zone de disponibilité (par exemple `/28`) | Tient les ENI d'attachement à l'écart des listes ACL réseau des charges de travail |

Couches de segmentation, de la plus grossière à la plus fine : comptes et VPC séparés, tables de routage de passerelle de transit ou segments Cloud WAN, sous-réseaux avec listes ACL réseau, groupes de sécurité qui référencent d'autres groupes de sécurité. Quand un VPC manque d'adresses, ajoutez un CIDR secondaire (par exemple dans `100.64.0.0/10` pour les pods) ou passez à IPv6.

> **Conseil d'examen.** « Empêcher automatiquement les CIDR qui se chevauchent sur des centaines de comptes » correspond aux pools IPAM avec règles d'allocation, délégués au compte réseau, pas à un tableur ni à une règle Config.

<!-- section: network-security | objectives: 1.4.3 -->
## Inspection du trafic, filtrage et protection de la couche application

| Contrôle | Couche et état | Portée | Usage |
| --- | --- | --- | --- |
| Groupe de sécurité | 3–4, avec état, règles d'autorisation uniquement | ENI | Micro-segmentation des charges de travail ; référencer d'autres groupes plutôt que des IP (aussi entre VPC appairés de la même Région et, si la fonction est activée, à travers une passerelle de transit pour les règles entrantes) |
| Liste ACL réseau | 3–4, sans état, autorisation et refus, règles numérotées | Sous-réseau | Listes de refus grossières, règles de ports éphémères pour le trafic retour |
| AWS Network Firewall | 3–7, sans état et avec état (règles compatibles Suricata), listes de domaines, inspection TLS | VPC ou passerelle de transit | Filtrage sortant par domaine, IPS, inspection est-ouest et nord-sud |
| Gateway Load Balancer | 3, GENEVE vers des appliances tierces | VPC, points de terminaison GWLB comme cibles de routes | Conserver un pare-feu d'éditeur, faire évoluer les appliances horizontalement |
| AWS WAF | 7, listes ACL web avec règles gérées et personnalisées, règles basées sur le débit | CloudFront (global, créée dans `us-east-1`), ALB, API REST API Gateway, AppSync, groupes d'utilisateurs Cognito, Verified Access, Bedrock AgentCore Gateway | Injection SQL, XSS, bots, réputation IP, limitation de débit |
| AWS Shield Advanced | Protection DDoS 3–7 avec l'appui de l'équipe de réponse | CloudFront, Route 53, Global Accelerator, ALB, adresses IP Elastic (EC2, NLB) | Forte exposition DDoS, protection des coûts |
| AWS Firewall Manager | Gestion des politiques | Organisation | Imposer les politiques WAF, Shield Advanced, groupes de sécurité et Network Firewall à tous les comptes |

Architectures d'inspection :

- **Distribuée** : un point de terminaison Network Firewall dans chaque VPC (routez la passerelle Internet et les sous-réseaux de charge de travail à travers lui). Isolation par VPC, plus de points de terminaison à payer.
- **Centralisée avec Transit Gateway** : le trafic des VPC satellites passe par un point d'inspection avant d'atteindre les autres VPC, le site ou internet (sortie centralisée par des passerelles NAT après le pare-feu). Network Firewall peut désormais s'attacher **directement à une passerelle de transit** comme attachement de fonction réseau, ce qui évite de construire et de router un VPC d'inspection ; le mode appliance est activé automatiquement sur ces attachements. Avec votre propre VPC d'inspection (appliances tierces derrière un GWLB), activez le **mode appliance** sur son attachement VPC pour que les deux sens d'un flux passent par la même zone de disponibilité et la même appliance.
- **Cloud WAN** : les groupes de fonctions réseau font passer le trafic entre les segments choisis par des attachements d'inspection, dans une Région et entre Régions.

Les **VPC Flow Logs** enregistrent les flux acceptés et rejetés (métadonnées, sans contenu) au niveau du VPC, du sous-réseau ou de l'ENI, vers CloudWatch Logs, S3 ou Data Firehose ; les journaux de flux de passerelle de transit couvrent le hub. Utilisez-les pour dépanner les groupes de sécurité, détecter des anomalies et alimenter Security Lake. La mise en miroir du trafic (Traffic Mirroring) est la réponse quand le contenu des paquets est nécessaire.

> **Piège d'examen.** Les groupes de sécurité ne savent pas refuser, et les listes ACL réseau sont sans état : bloquer une plage d'IP malveillante passe par une règle de refus de liste ACL réseau ou un ensemble d'IP WAF, pas par un groupe de sécurité. Filtrer le trafic sortant par nom de domaine (liste d'autorisation FQDN) exige Network Firewall, pas des groupes de sécurité.

<!-- section: ipv6-dual-stack | objectives: 1.4.4 -->
## Adoption d'IPv6 et migration vers la double pile

Motivations : les adresses IPv4 publiques sont facturées à l'heure, l'espace IPv4 privé s'épuise dans les grands parcs de conteneurs, et certains clients imposent IPv6. Faits sur IPv6 :

- Un VPC reçoit un `/56` fourni par Amazon (ou un bloc BYOIPv6 ou alloué par IPAM), chaque sous-réseau un `/64`. Les adresses IPv6 sont uniques au niveau mondial ; l'accessibilité est contrôlée par le routage et la sécurité, pas par la NAT.
- IPv4 ne peut pas être retiré d'un VPC. Les sous-réseaux sont IPv4 uniquement, double pile ou **IPv6 uniquement** (instances Nitro) ; un sous-réseau IPv4 uniquement ne peut pas être converti en IPv6 uniquement : créez de nouveaux sous-réseaux.
- Accès internet sortant uniquement en IPv6 : **passerelle Internet de sortie uniquement** (egress-only internet gateway, route `::/0`). Les passerelles NAT servent à IPv4.
- Les charges de travail IPv6 uniquement atteignent les services IPv4 uniquement grâce à **DNS64** (activé par sous-réseau ; Resolver synthétise des adresses `64:ff9b::/96`) et à **NAT64** sur une passerelle NAT (toujours actif) : routez `64:ff9b::/96` vers la passerelle NAT.

Séquence de migration :

| Étape | Action |
| --- | --- |
| 1 | Planifier les pools IPv6 dans IPAM ; associer des CIDR IPv6 aux VPC et aux sous-réseaux |
| 2 | Ajouter les routes `::/0` (passerelle Internet ou passerelle Internet de sortie uniquement) et les routes IPv6 vers les passerelles de transit ; activer IPv6 sur les attachements VPC des passerelles de transit |
| 3 | Ajouter des règles IPv6 aux groupes de sécurité et aux listes ACL réseau : les règles IPv4 ne correspondent pas au trafic IPv6 |
| 4 | Passer les frontaux en double pile : ALB et NLB `dualstack`, IPv6 sur CloudFront, Global Accelerator double pile (deux adresses IPv4 plus deux IPv6), enregistrements `AAAA` dans Route 53 |
| 5 | Activer IPv6 sur les instances, les conteneurs et les points de terminaison ; les points de terminaison PrivateLink double pile exigent des sous-réseaux et des NLB double pile |
| 6 | Créer des sous-réseaux IPv6 uniquement pour les nouvelles charges de travail, avec DNS64 et NAT64 pour les dépendances IPv4 restantes |

Les sous-réseaux d'attachement de passerelle de transit doivent garder IPv4 (ils ne peuvent pas être IPv6 uniquement). Direct Connect et Site-to-Site VPN transportent IPv6 avec leurs propres sessions BGP ou dans les tunnels.

> **Piège d'examen.** Une passerelle NAT ne donne pas aux instances IPv6 un accès internet sortant ; c'est le rôle de la passerelle Internet de sortie uniquement. Une passerelle NAT n'apparaît dans une conception IPv6 que pour NAT64, avec DNS64.

<!-- section: global-routing | objectives: 1.4.5 -->
## Routage global du trafic des applications multi-Régions

Politiques de routage Route 53 :

| Politique | Décide selon | Usage multi-Régions |
| --- | --- | --- |
| Basculement (failover) | État de l'enregistrement principal | Régions actif-passif |
| Latence | Latence mesurée entre le résolveur et chaque Région | Actif-actif, Région la plus proche |
| Pondérée (weighted) | Pourcentages | Migration progressive de Région, bleu/vert, canary |
| Géolocalisation | Continent, pays ou État de l'utilisateur | Résidence des données, contenu localisé |
| Géoproximité | Distance aux ressources, avec un biais qui agrandit ou réduit les zones | Déplacer la charge entre Régions sans changer la géographie des utilisateurs |
| Basée sur l'IP | Blocs CIDR du client | Router des plages connues de FAI ou d'entreprise |
| Réponse à valeurs multiples | Jusqu'à huit enregistrements sains | Répartition simple côté client |

Les vérifications de l'état surveillent des points de terminaison, d'autres vérifications (calculées) ou des alarmes CloudWatch (utiles pour les ressources privées). Les enregistrements d'alias vers ELB, CloudFront ou Global Accelerator peuvent évaluer l'état de la cible. Les enregistrements s'imbriquent : des enregistrements de latence dont les cibles sont des ensembles de basculement ou pondérés.

**Amazon Application Recovery Controller (ARC)** ajoute le contrôle de l'évacuation d'une Région : contrôles de routage (interrupteurs qui pilotent des vérifications de l'état, avec des règles de sécurité comme « au moins une Région active »), plans Region switch qui orchestrent la reprise multi-Régions entre comptes, et décalage de zone (zonal shift) ou décalage de zone automatique (zonal autoshift) pour les incidents de zone de disponibilité.

**AWS Global Accelerator** fournit deux adresses IPv4 anycast statiques (ou quatre en double pile) sur la périphérie AWS, des groupes de points de terminaison par Région avec un cadran de trafic (traffic dial, 0–100 %) et des pondérations de points de terminaison. Le basculement ne dépend pas des caches DNS, car les IP des clients ne changent jamais.

| Exigence | Réponse |
| --- | --- |
| Basculement régional le plus rapide pour des clients TCP ou UDP qui mettent le DNS en cache ou ne peuvent pas l'utiliser | Global Accelerator |
| Les utilisateurs d'un pays doivent toujours joindre la Région de ce pays | Géolocalisation Route 53, avec un enregistrement par défaut pour les autres |
| Envoyer 10 % du trafic vers une nouvelle Région, puis augmenter | Enregistrements pondérés Route 53, ou cadrans de trafic Global Accelerator |
| Évacuation de Région contrôlée et auditée, indépendante du plan de contrôle de la Région en panne | Contrôles de routage ARC ou Region switch |
| Contenu HTTP pouvant être mis en cache dans le monde entier, avec basculement d'origine | CloudFront avec un groupe d'origines |

> **Conseil d'examen.** Le basculement par DNS est limité par les TTL et la mise en cache des résolveurs. Quand l'énoncé insiste sur « les clients mettent le DNS en cache » ou « adresses IP statiques pour les listes d'autorisation de pare-feu », choisissez Global Accelerator.

<!-- section: key-points -->
## Points clés

- Appairage pour quelques VPC, Transit Gateway pour un hub régional, Cloud WAN pour des segments mondiaux pilotés par politique, PrivateLink pour un service malgré des CIDR qui se chevauchent, VPC Lattice pour le service à service avec authentification IAM, VPC partagé pour une propriété centrale.
- IPAM : portées, pools imbriqués, règles d'allocation et intégration à Organizations empêchent les chevauchements avant la création des VPC.
- Groupes de sécurité = listes d'autorisation avec état, listes ACL réseau = sans état avec refus ; Network Firewall filtre par domaine et peut s'attacher directement à une passerelle de transit ; GWLB conserve les appliances tierces ; le mode appliance garde les flux symétriques.
- IPv6 : `/56` par VPC, `/64` par sous-réseau, passerelle Internet de sortie uniquement pour la sortie, DNS64 plus NAT64 pour les dépendances IPv4, règles de groupe de sécurité IPv6 distinctes.
- Routage global : politiques et vérifications de l'état Route 53, ARC pour l'évacuation contrôlée d'une Région, Global Accelerator quand le cache DNS ou les IP statiques comptent.
