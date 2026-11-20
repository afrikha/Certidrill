Les questions de performance réseau décrivent des utilisateurs, des sites ou des VPC qui doivent joindre une application avec une faible latence, un débit élevé ou une haute disponibilité, et demandent quel service périphérique, quel équilibreur de charge, quelle connexion ou quelle topologie utiliser. Décidez dans cet ordre : où sont les utilisateurs (internet, sur site, autres VPC), quel protocole ils utilisent (HTTP ou TCP/UDP simple), puis quel service transporte le trafic avec le moins de composants.

<!-- section: edge-services | objectives: 3.4.1 -->
## Réseau périphérique : CloudFront et Global Accelerator

Les deux services font entrer les utilisateurs sur le réseau mondial AWS par l'emplacement périphérique (edge location) le plus proche. Ils résolvent des problèmes différents :

| | Amazon CloudFront | AWS Global Accelerator |
| --- | --- | --- |
| Couche | HTTP et HTTPS (réseau de diffusion de contenu) | TCP et UDP (accélérateur de couche réseau) |
| Mise en cache | Oui : contenu statique et dynamique mis en cache dans les emplacements périphériques | Aucune : chaque paquet va jusqu'au point de terminaison |
| Point d'entrée | Un nom DNS (`d111111abcdef8.cloudfront.net` ou un autre nom de domaine) | Deux adresses IPv4 anycast statiques (quatre en double pile : deux IPv4, deux IPv6), ou votre propre plage (BYOIP) |
| Origines ou points de terminaison | Compartiment S3, ALB, EC2, tout serveur HTTP, groupes d'origines | NLB, ALB, instances EC2, adresses IP Elastic, dans une ou plusieurs Régions |
| Basculement | Groupe d'origines : origine principale puis secondaire | Vérifications de l'état : le trafic passe immédiatement aux points de terminaison sains |
| Usage type | Sites web, API, vidéo, téléchargements de logiciels | Jeux, VoIP et IoT en UDP, IP statiques à autoriser, basculement rapide multi-Région |

Fonctionnalités de CloudFront présentes dans les questions :

- Le **contrôle d'accès à l'origine (OAC)** garde un compartiment S3 privé : seule la distribution peut le lire, les utilisateurs ne peuvent pas contourner CloudFront.
- Les **groupes d'origines** basculent vers l'origine secondaire quand l'origine principale renvoie un code d'état configuré (400, 403, 404, 416, 429, 500, 502, 503, 504) ou ne répond pas. Le basculement ne s'applique qu'aux requêtes `GET`, `HEAD` et `OPTIONS`.
- Les comportements de cache (cache behaviors) dirigent des modèles de chemin (`/api/*`, `/static/*`) vers des origines différentes avec des règles de cache différentes.
- Code en périphérie :

| | CloudFront Functions | Lambda@Edge |
| --- | --- | --- |
| Environnement d'exécution | JavaScript | Node.js et Python |
| Événements | Requête et réponse utilisateur (viewer) | Utilisateur et origine, requête et réponse |
| Durée et échelle | Inférieure à la milliseconde, des millions de requêtes par seconde | Jusqu'à 30 secondes, jusqu'à 10 000 requêtes par seconde par Région |
| Accès réseau, corps de la requête | Non | Oui |
| Usage | Réécriture d'en-têtes, redirections, normalisation de la clé de cache, validation de JWT | Appels à d'autres services, bibliothèques tierces, inspection du corps |

Fonctionnalités de Global Accelerator : des groupes de points de terminaison (un par Région) avec un **cadran de trafic** (traffic dial, pourcentage du trafic accepté par le groupe, pour un déploiement bleu/vert ou pour vider une Région) et des **pondérations de point de terminaison** (128 par défaut, 255 au maximum) dans un groupe. Un accélérateur de routage personnalisé (custom routing) associe des utilisateurs à des destinations EC2 précises dans des sous-réseaux, par exemple des serveurs de sessions de jeu.

> **Piège d'examen.** « Adresses IP statiques » avec « UDP » ou « non HTTP » désigne Global Accelerator ; « cache » ou « réduire la charge sur l'origine » désigne CloudFront. Global Accelerator ne met rien en cache, et CloudFront n'offre pas d'adresses IP fixes que les clients peuvent autoriser.

<!-- section: vpc-design | objectives: 3.4.2 -->
## Conception du VPC : niveaux de sous-réseau, routage et adressage IP

Un VPC appartient à une Région ; un sous-réseau appartient à une zone de disponibilité. Règles IPv4 :

- Les blocs CIDR du VPC et des sous-réseaux vont de `/16` à `/28`. Utilisez des plages privées (RFC 1918) et planifiez-les pour qu'elles **ne chevauchent jamais** celles des autres VPC ou des réseaux sur site que vous connecterez.
- Chaque sous-réseau perd **5 adresses** : adresse réseau, routeur du VPC (+1), DNS (+2), réservée pour un usage futur (+3) et la dernière adresse. Un `/28` compte 16 adresses, donc 11 utilisables ; un `/24` en offre 251.
- Vous pouvez ajouter plus tard des blocs CIDR secondaires à un VPC ; vous ne pouvez pas redimensionner un sous-réseau existant. Les blocs IPv6 sont facultatifs, les sous-réseaux reçoivent un `/64`.

Les niveaux de sous-réseau sont définis par leur table de routage :

| Niveau | Route par défaut (`0.0.0.0/0`) | Contient |
| --- | --- | --- |
| Public | Passerelle Internet | Nœuds d'ALB ou de NLB, passerelles NAT, bastions |
| Privé (application) | Passerelle NAT de la **même zone de disponibilité** | Instances d'application, conteneurs, Lambda dans un VPC |
| Isolé (données) | Aucune ; points de terminaison de VPC pour les services AWS | Bases de données, caches |

```text
VPC 10.20.0.0/16 (3 AZs)
  public-a 10.20.0.0/24    public-b 10.20.1.0/24    public-c 10.20.2.0/24
  app-a    10.20.16.0/20   app-b    10.20.32.0/20   app-c    10.20.48.0/20
  data-a   10.20.64.0/24   data-b   10.20.65.0/24   data-c   10.20.66.0/24
```

Règles de routage : chaque table de routage a une route `local` pour le CIDR du VPC, et le préfixe le plus spécifique l'emporte. Un sous-réseau sans association explicite utilise la table de routage principale. Pour un accès internet IPv6 sortant uniquement, utilisez une **passerelle Internet de sortie uniquement** ; les passerelles NAT servent à l'IPv4. Dimensionnez largement les sous-réseaux d'application : conteneurs (réseau awsvpc), fonctions Lambda dans un VPC et nœuds d'équilibreur de charge consomment tous des adresses IP.

> **Conseil d'examen.** Une passerelle NAT par zone de disponibilité, chaque sous-réseau privé routant vers la passerelle NAT de sa propre zone, est la conception hautement disponible. Une passerelle NAT unique coûte moins cher mais crée une dépendance à une seule zone et ajoute du transfert de données entre zones.

<!-- section: load-balancing | objectives: 3.4.3, 3.4.8 -->
## Concepts et stratégie de répartition de charge

| | Application Load Balancer | Network Load Balancer | Gateway Load Balancer |
| --- | --- | --- | --- |
| Couche | 7 (HTTP, HTTPS, gRPC, WebSocket) | 4 (TCP, UDP, TLS, TCP_UDP, QUIC) | 3 (tous les paquets IP, GENEVE port 6081 vers les appliances) |
| Routage | Règles sur l'hôte, le chemin, les en-têtes, la chaîne de requête, la méthode, l'IP source | Hachage de flux ; une connexion reste sur une cible | Hachage de flux à 5 éléments |
| Cibles | Instances, adresses IP, fonctions Lambda | Instances, adresses IP, un ALB | Appliances virtuelles (instances, adresses IP) |
| IP statique | Non (nom DNS seulement) | Une IP statique par zone, adresse IP Elastic facultative par sous-réseau | Atteint par des points de terminaison Gateway Load Balancer |
| Équilibrage de charge entre zones (cross-zone) | Toujours actif au niveau de l'équilibreur ; désactivable par groupe cible | Désactivé par défaut | Désactivé par défaut |
| Usage type | Applications web, microservices, conteneurs | Performances extrêmes, hors HTTP, IP statiques, services de point de terminaison PrivateLink | Pare-feu en ligne, IDS/IPS, inspection approfondie des paquets |

Paramètres du groupe cible d'un ALB :

- Algorithme de routage : **round robin** (par défaut), **least outstanding requests** (coût des requêtes ou capacité des cibles inégaux) ou **weighted random**, le seul compatible avec l'atténuation d'anomalies Automatic Target Weights (il détourne le trafic des cibles qui renvoient des erreurs).
- **Sessions persistantes** (sticky sessions) : basées sur une durée (cookie `AWSALB`) ou sur l'application (votre propre cookie). Meilleure conception : conserver les sessions dans ElastiCache ou DynamoDB pour que n'importe quelle cible traite n'importe quelle requête.
- Le **démarrage lent** (slow start) augmente linéairement le trafic vers les nouvelles cibles (round robin uniquement). Le **délai d'annulation de l'enregistrement** (300 secondes par défaut) laisse les requêtes en cours se terminer.

Choisir la stratégie :

| Exigence | Réponse |
| --- | --- |
| Diriger `/api` et `/images` vers des services différents, ou plusieurs domaines sur un écouteur | ALB avec des règles basées sur le chemin ou l'hôte |
| Des millions de requêtes par seconde, TCP ou UDP, conserver l'IP du client | NLB |
| Les clients doivent autoriser des IP fixes pour une application HTTP | NLB avec adresses IP Elastic et un ALB comme cible, ou Global Accelerator devant l'ALB |
| Inspecter tout le trafic avec des appliances tierces, de façon transparente | GWLB avec des points de terminaison Gateway Load Balancer comme prochain saut des tables de routage |
| Exposer un service en privé à d'autres VPC ou comptes | NLB derrière un service de point de terminaison PrivateLink |
| Répartir le trafic entre Régions | Politiques de routage Route 53 ou Global Accelerator (un équilibreur de charge est régional) |

> **Piège d'examen.** Une charge inégale entre zones sur un NLB signifie en général que l'équilibrage de charge entre zones est désactivé (sa valeur par défaut). L'activer répartit le trafic sur toutes les cibles enregistrées, au prix d'un transfert de données entre zones.

<!-- section: connection-options | objectives: 3.4.4 -->
## Options de connexion réseau

| Option | Chemin | Bande passante | Mise en place | Usage |
| --- | --- | --- | --- | --- |
| AWS Site-to-Site VPN | IPsec sur internet, deux tunnels par connexion | Jusqu'à 1,25 Gbit/s par tunnel standard, jusqu'à 5 Gbit/s par tunnel à large bande passante | Quelques minutes ; nécessite un équipement de passerelle client | Lien hybride chiffré et rapide à créer ; secours de Direct Connect |
| AWS Direct Connect, dédiée | Fibre privée depuis un emplacement Direct Connect | 1, 10, 100 ou 400 Gbit/s | Interconnexion physique ; délai le plus long | Latence constante, débit élevé, tarifs de transfert sortant plus bas |
| AWS Direct Connect, hébergée | Par un partenaire Direct Connect | 50 Mbit/s à 25 Gbit/s | Commandée auprès du partenaire | Capacités petites ou intermédiaires |
| AWS Client VPN | TLS depuis les appareils des utilisateurs | Par utilisateur | Point de terminaison géré | Employés distants qui accèdent aux VPC |
| AWS PrivateLink | Point de terminaison d'interface (IP privées) dans le VPC consommateur | Au sein d'AWS | Le fournisseur expose un service de point de terminaison derrière un NLB | Accès privé aux services AWS, à un SaaS ou à un service d'un autre VPC |

Détails sur lesquels l'examen s'appuie :

- Le **Site-to-Site VPN accéléré** fait passer les tunnels par l'emplacement périphérique le plus proche grâce à Global Accelerator ; il exige une **passerelle de transit** (pas une passerelle réseau privé virtuel) et ne peut pas être activé sur une connexion existante.
- Direct Connect n'est pas chiffré par IPsec. Pour chiffrer en transit, utilisez **MACsec** (connexions dédiées à 10, 100 et 400 Gbit/s dans certains emplacements ; pas les connexions hébergées) ou faites passer un Site-to-Site VPN sur la connexion Direct Connect.
- Interfaces virtuelles : **VIF privée** (un VPC par une passerelle réseau privé virtuel, ou plusieurs par une passerelle Direct Connect), **VIF de transit** (passerelles de transit par une passerelle Direct Connect), **VIF publique** (points de terminaison publics AWS comme S3).
- Résilience : deux connexions dans deux emplacements Direct Connect pour une résilience maximale ; un Site-to-Site VPN comme secours moins coûteux.
- PrivateLink est unidirectionnel (le consommateur initie les connexions), traverse les comptes et fonctionne même quand les CIDR des VPC se chevauchent, car aucun routage entre les VPC n'intervient. Les points de terminaison de passerelle (S3 et DynamoDB uniquement) sont des entrées de table de routage, pas du PrivateLink.

> **Piège d'examen.** « Connexion chiffrée en quelques jours » correspond au Site-to-Site VPN ; « performances constantes, bande passante dédiée » correspond à Direct Connect, et Direct Connect seul ne satisfait pas une exigence de chiffrement.

<!-- section: topologies | objectives: 3.4.5, 3.4.6 -->
## Topologies réseau et croissance

| Topologie | Conception |
| --- | --- |
| À plusieurs niveaux | Sous-réseaux publics (équilibreur de charge), privés (application), isolés (base de données), dans au moins deux zones ; groupes de sécurité qui se référencent entre niveaux |
| Quelques VPC, simple | Appairage de VPC (VPC peering) : pas de CIDR qui se chevauchent, non transitif, pas de routage de périphérie à périphérie (un pair ne peut pas utiliser votre passerelle Internet, passerelle NAT, VPN ou point de terminaison de passerelle), fonctionne entre Régions et comptes |
| Nombreux VPC et sur site (hub and spoke) | AWS Transit Gateway : routeur régional avec attachements de VPC, de VPN, de passerelle Direct Connect et d'appairage ; ses tables de routage isolent des segments (prod, dev, services partagés) |
| Multi-Région | Appairage de passerelles de transit entre Régions (routes statiques), plus Route 53 ou Global Accelerator pour les utilisateurs |
| Hybride | Passerelle Direct Connect avec VIF de transit vers les passerelles de transit, Site-to-Site VPN en secours |
| Nombreux comptes, une équipe réseau | VPC partagé : sous-réseaux partagés par AWS RAM ; les participants y lancent leurs ressources |
| Inspection centralisée | VPC d'inspection avec AWS Network Firewall ou un GWLB, passerelle de transit en **mode appliance** pour garder des flux symétriques |

Concevoir pour les besoins futurs :

- Un maillage complet de n VPC exige n(n-1)/2 connexions d'appairage : 10 VPC en exigent 45. Une passerelle de transit demande un attachement par VPC.
- Attribuez les CIDR sans chevauchement de façon centralisée (Amazon VPC IP Address Manager) avant de créer comptes et VPC ; des plages qui se chevauchent bloquent l'appairage et le routage par la passerelle de transit.
- Gardez de la marge : grandes plages de VPC, sous-réseaux de réserve, blocs CIDR secondaires quand un VPC manque d'adresses, IPv6 pour les très grands parcs.
- Préférez des composants gérés et élastiques (passerelle NAT, passerelle de transit, équilibreurs de charge, points de terminaison de VPC) aux instances autogérées, qui deviennent des goulets d'étranglement.

> **Conseil d'examen.** « Des dizaines de VPC qui doivent tous communiquer, plus un accès sur site, avec le moins de charge opérationnelle » : passerelle de transit. « Deux VPC, coût le plus bas » : appairage, qui n'a pas de frais horaires.

<!-- section: resource-placement | objectives: 3.4.7 -->
## Placer les ressources selon les exigences métier

| Exigence | Emplacement |
| --- | --- |
| Les données doivent rester dans un pays, ou les utilisateurs sont concentrés dans une zone géographique | La Région qui respecte la résidence des données et la plus proche des utilisateurs |
| Résister à la panne d'un centre de données | Plusieurs zones de disponibilité d'une Région |
| Faible latence pour les utilisateurs d'une métropole éloignée d'une Région | AWS Local Zones (calcul et stockage près des grands centres de population, rattachés à une Région parente) |
| Latence ultra-faible vers des appareils mobiles 5G | Zones AWS Wavelength dans le réseau de l'opérateur télécom |
| La charge de travail doit tourner sur site (traitement local, résidence des données) avec les API AWS | AWS Outposts |
| Latence la plus faible et débit le plus élevé entre instances (HPC, fortement couplé) | Groupe de placement de cluster (une zone ; jusqu'à 10 Gbit/s par flux dans le groupe) |
| Grands systèmes distribués (HDFS, Cassandra, Kafka) isolés par baie | Groupe de placement de partition (jusqu'à 7 partitions par zone) |
| Quelques instances critiques qui ne doivent pas partager de matériel | Groupe de placement réparti (jusqu'à 7 instances en cours d'exécution par zone et par groupe) |

Le choix de la Région dépend aussi de la disponibilité des services et fonctionnalités, et du prix, qui varie selon la Région. Sur les instances, la mise en réseau améliorée (ENA) est nécessaire pour une bande passante élevée, et Elastic Fabric Adapter (EFA) ajoute un réseau qui contourne le système d'exploitation pour le HPC et l'apprentissage automatique.

> **Piège d'examen.** Un groupe de placement de cluster ne peut pas couvrir plusieurs zones : il apporte la performance, pas la disponibilité. Pour la « disponibilité la plus élevée », choisissez un groupe de placement réparti ou plusieurs zones.

<!-- section: key-points -->
## Points clés

- CloudFront : HTTP, mise en cache, OAC, groupes d'origines. Global Accelerator : TCP/UDP, deux IP anycast statiques, basculement immédiat, pas de cache.
- Les niveaux de sous-réseau sont définis par les tables de routage ; 5 adresses réservées par sous-réseau ; CIDR de `/16` à `/28`, sans chevauchement.
- ALB = règles de couche 7 ; NLB = couche 4, IP statiques, PrivateLink ; GWLB = appliances. L'équilibrage entre zones du NLB est désactivé par défaut.
- VPN : deux tunnels, quelques minutes, chiffré. Direct Connect : bande passante dédiée, pas chiffré par IPsec ; MACsec ou VPN par-dessus pour chiffrer. Le VPN accéléré exige une passerelle de transit.
- L'appairage n'est pas transitif ; la passerelle de transit est le hub pour de nombreux VPC et liens hybrides.
- Placement : Région pour la résidence et la latence, zones de disponibilité pour la disponibilité, Local Zones, Wavelength, Outposts pour les cas en périphérie ; groupes de placement de cluster, de partition ou répartis.
