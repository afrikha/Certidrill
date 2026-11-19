Les données qui entrent dans AWS depuis Internet sont gratuites, mais presque tous les autres chemins ont un prix : vers Internet, entre zones de disponibilité, entre Régions, à travers une passerelle NAT, un équilibreur de charge ou un point de terminaison d'interface. Les questions d'examen décrivent un chemin de trafic et demandent la modification qui réduit la facture sans perte de disponibilité. Les tarifs cités sont des exemples américains tirés des pages de tarification AWS : l'examen teste l'ordre relatif, pas les centimes.

<!-- section: transfer-rules | objectives: 4.4.10 -->
## Règles du transfert de données et itinéraires moins chers

| Chemin | Facturation |
| --- | --- |
| Internet vers AWS | Gratuit |
| AWS vers Internet | Par Go, par paliers ; 100 Go par mois gratuits, cumulés sur tous les services et toutes les Régions |
| Dans une même zone de disponibilité, adresses IP privées | Gratuit |
| Entre zones de disponibilité d'une Région | Par Go **dans chaque sens** (par exemple 0,01 USD/Go dans chaque sens) |
| Vers une adresse IP publique ou Elastic IP d'une ressource de la même Région | Sort par la passerelle Internet et revient, facturé comme un transfert régional même dans une seule AZ |
| Entre Régions | Par Go sortant de la Région source ; la Région de destination ne facture pas les données entrantes |
| EC2 vers Amazon S3 ou DynamoDB dans la même Région | Gratuit (mais une passerelle NAT sur le chemin facture toujours son traitement) |
| Origine AWS vers Amazon CloudFront | Gratuit (récupérations depuis l'origine) |

Choix de routage qui suppriment des frais :

- **Utilisez des adresses IP privées** entre les composants d'un même VPC ou de VPC appairés plutôt que des points de terminaison publics.
- **Gardez les composants très bavards dans la même zone de disponibilité** quand l'exigence le permet, et évitez d'envoyer le trafic d'une AZ vers la passerelle NAT d'une autre AZ.
- **Les points de terminaison de passerelle** (gateway endpoints) pour Amazon S3 et DynamoDB n'ont **aucun frais horaire ni frais de traitement des données** : ils suppriment le traitement de la passerelle NAT pour ce trafic.
- **Les points de terminaison d'interface** (AWS PrivateLink) gardent le trafic privé pour les autres services, mais coûtent par point de terminaison, par AZ et par heure (environ 0,01 USD) plus par Go traité (0,01 USD/Go pour le premier Po). Ils ne font économiser que s'ils remplacent un chemin NAT qui transporte assez de données, ou si l'accès privé est de toute façon exigé.
- **Servez les utilisateurs depuis CloudFront** plutôt que directement depuis EC2 ou S3.
- **Lisez localement** : un réplica en lecture ou un cache dans la Région consommatrice évite des lectures répétées entre Régions.

**AWS Global Accelerator** améliore les performances, pas le coût : il facture un montant fixe de 0,025 USD par heure d'accélérateur plus un Data Transfer-Premium (DT-Premium) par Go, facturé uniquement dans le sens dominant de chaque heure, **en plus** du transfert de données sortant normal. Choisissez-le pour des adresses IP anycast statiques, un basculement rapide entre Régions ou du trafic non HTTP (TCP/UDP), jamais comme chemin le moins cher.

| Exigence | Conception la moins chère |
| --- | --- |
| Des instances privées lisent et écrivent de gros volumes dans S3 via une passerelle NAT | Point de terminaison de passerelle S3 plus une route dans les tables de routage privées |
| Accès privé à Amazon SQS ou AWS KMS sans Internet | Point de terminaison d'interface (les points de terminaison de passerelle n'existent que pour S3 et DynamoDB) |
| Une tâche d'analyse lit chaque heure des données dans une autre Région | Répliquer les données une fois dans la Région de la tâche, ou déplacer la tâche |

> **Piège d'examen.** Les points de terminaison de passerelle sont gratuits ; les points de terminaison d'interface ne le sont pas. Quand l'énoncé mentionne « S3 » ou « DynamoDB » et « MOST cost-effective », le point de terminaison de passerelle l'emporte à la fois sur la passerelle NAT et sur un point de terminaison d'interface.

<!-- section: load-balancing-costs | objectives: 4.4.3 -->
## Coûts de la répartition de charge

Chaque type d'Elastic Load Balancing facture un montant horaire plus des unités de capacité, et seule la dimension **la plus élevée** de l'heure compte :

| Type | Couche | Dimensions de l'unité de capacité |
| --- | --- | --- |
| Application Load Balancer (ALB) | 7 (HTTP/HTTPS, gRPC) | LCU : nouvelles connexions, connexions actives, octets traités, évaluations de règles (10 premières règles gratuites) |
| Network Load Balancer (NLB) | 4 (TCP, UDP, TLS) | NLCU : nouvelles connexions ou flux, connexions ou flux actifs, octets traités |
| Gateway Load Balancer (GWLB) | 3 (appliances tierces, GENEVE) | GLCU, plus un montant horaire par zone de disponibilité ; chaque point de terminaison Gateway Load Balancer est facturé à l'heure et par Go |

Choix guidés par le coût :

- **Consolider** : un seul ALB avec des règles basées sur l'hôte et sur le chemin peut servir de nombreuses applications, ce qui économise le montant horaire d'équilibreurs de charge séparés.
- **Équilibrage de charge entre zones** (cross-zone) : toujours activé au niveau de l'ALB (il peut être désactivé par groupe cible), et le trafic de l'ALB vers des cibles d'autres AZ n'est pas facturé comme un transfert entre AZ. Sur un NLB, il est **désactivé par défaut** ; si vous l'activez, le trafic vers des cibles d'une autre AZ est facturé environ 0,01 USD/Go dans chaque sens.
- Les clients internes doivent utiliser un équilibreur de charge **interne** : atteindre l'adresse publique d'un NLB depuis le même VPC passe par la passerelle Internet et ajoute des frais de transfert régional.

> **Conseil d'examen.** Choisissez d'abord l'équilibreur de charge selon le protocole (fonctionnalités HTTP → ALB ; IP statique, débit extrême ou UDP → NLB ; appliances en ligne → GWLB), puis optimisez son coût. Un équilibreur de charge moins cher auquel manque une fonctionnalité exigée n'est jamais la réponse.

<!-- section: nat-gateway-costs | objectives: 4.4.4 -->
## Coûts de la passerelle NAT et de l'instance NAT

Une **passerelle NAT** facture à l'heure et **par Go traité** (exemple en US East (Ohio) : 0,045 USD par heure et 0,045 USD par Go), plus le transfert de données normal et l'adresse IPv4 publique (0,005 USD par heure pour chaque adresse IPv4 publique, utilisée ou inactive). Elle démarre à 5 Gbit/s, monte automatiquement jusqu'à 100 Gbit/s et ne demande aucune maintenance.

Une **instance NAT** est une instance EC2 que vous configurez pour la NAT, avec la **vérification source/destination désactivée**. Vous payez l'instance et son transfert de données, sans frais de traitement par Go, mais vous assumez les correctifs, la mise à l'échelle et le basculement.

| Attribut | Passerelle NAT | Instance NAT |
| --- | --- | --- |
| Disponibilité | Redondante dans son AZ, gérée | Scripts de basculement |
| Bande passante | 5 Gbit/s, jusqu'à 100 Gbit/s | Dépend du type d'instance |
| Maintenance | Aucune | Mises à jour et correctifs du système d'exploitation par vous |
| Coût | Heures plus Go traités | Heures d'instance, type et taille |
| Groupes de sécurité | Non pris en charge (utilisez les listes ACL réseau) | Pris en charge |
| Réacheminement de port, usage comme bastion | Non pris en charge | Possible |

Moyens de réduire la facture NAT :

1. Faire passer le trafic S3 et DynamoDB par des **points de terminaison de passerelle**.
2. Utiliser des points de terminaison d'interface pour les autres flux importants vers des services AWS lorsque leur prix horaire et par Go est inférieur au traitement NAT qu'ils suppriment.
3. Supprimer les passerelles NAT inutilisées (AWS Trusted Advisor signale **Idle NAT gateways** et **Inactive NAT Gateways**).
4. Pour le trafic IPv6 sortant, utiliser une **passerelle Internet de sortie uniquement** (egress-only internet gateway) au lieu de la NAT.

> **Piège d'examen.** Une instance NAT peut coûter moins cher pour une petite charge de développement, mais elle échoue à « highly available » et à « LEAST operational overhead ». Dans les énoncés de production, la passerelle NAT est la réponse attendue.

<!-- section: nat-gateway-topology | objectives: 4.4.8 -->
## Choisir la topologie des passerelles NAT

Une passerelle NAT standard (zonale) se trouve dans une seule zone de disponibilité. Si des ressources de plusieurs AZ la partagent et que son AZ tombe en panne, les autres AZ perdent l'accès à Internet. AWS propose aussi une **passerelle NAT régionale** qui couvre les AZ du VPC.

| Topologie | Coût | Disponibilité | À utiliser quand |
| --- | --- | --- | --- |
| Une passerelle NAT zonale partagée | Un seul montant horaire, mais un transfert entre AZ pour chaque AZ qui l'utilise | La panne d'une seule AZ coupe l'accès sortant de toutes | Développement, test, coût avant disponibilité |
| Une passerelle NAT zonale par AZ, chaque AZ routant vers la sienne | Un montant horaire par AZ, aucun trafic NAT entre AZ | Indépendante des zones | Production avec un sous-réseau public par AZ |
| Passerelle NAT régionale | Facturée à l'heure pour chaque AZ où elle est active, plus le traitement | S'étend automatiquement aux AZ qui ont des charges de travail | Production voulant un seul ID NAT, sans sous-réseau public, avec haute disponibilité automatique |

À retenir sur la passerelle NAT régionale :

- Une passerelle NAT par VPC, un seul ID pour les tables de routage privées de toutes les AZ ; AWS crée sa table de routage avec une route vers la passerelle Internet.
- Elle **n'a pas besoin de sous-réseau public** et prend en charge jusqu'à 32 adresses IP par AZ (8 pour une passerelle zonale).
- Elle détecte les interfaces réseau dans une nouvelle AZ et s'y étend, ce qui peut prendre jusqu'à 60 minutes ; entre-temps, le trafic est traité depuis une AZ existante.
- Elle ne prend en charge que la **NAT publique** : la NAT privée (vers d'autres VPC ou des réseaux sur site via une passerelle de transit ou une passerelle réseau privée virtuelle) exige toujours des passerelles NAT zonales.

```bash
# Regional NAT gateway: no subnet, one ID for the whole VPC
aws ec2 create-nat-gateway --vpc-id vpc-0abc1234def567890 --availability-mode regional
```

Recommandation de coût du Well-Architected Framework : si les ressources qui envoient le plus de trafic par une passerelle NAT sont dans une autre AZ, créez une passerelle NAT dans leur AZ.

> **Piège d'examen.** « MOST cost-effective » seul oriente vers une passerelle NAT partagée ; « MOST cost-effective » plus « highly available » ou « must survive an AZ failure » exige une passerelle par AZ ou une passerelle NAT régionale. Lisez toutes les exigences avant le qualificatif.

<!-- section: dns-services | objectives: 4.4.7 -->
## DNS et services réseau

Amazon Route 53 facture chaque zone hébergée par mois et les requêtes par million, avec des tarifs plus élevés pour les requêtes de latence et de géolocalisation. Éléments utiles pour le coût :

| Fonctionnalité | Fait |
| --- | --- |
| Enregistrement d'alias | Requêtes gratuites lorsqu'il pointe vers une ressource AWS (CloudFront, ELB, site web S3, API Gateway, point de terminaison d'interface d'un VPC, Global Accelerator et autres) ; autorisé à l'apex de la zone |
| Enregistrement CNAME | Requêtes facturées ; interdit à l'apex de la zone |
| Vérifications de l'état | Montant mensuel par vérification, plus élevé pour les points de terminaison hors AWS |
| Points de terminaison Route 53 Resolver | Facturés par interface réseau et par heure ; les points de terminaison entrants et sortants résolvent les noms entre un VPC et le DNS sur site |

Les politiques de routage déterminent quelle Région sert, et facture, chaque utilisateur : **simple**, **basculement** (failover), **géolocalisation** (emplacement de l'utilisateur), **géoproximité** (emplacement de la ressource, avec biais), **latence**, **basée sur l'IP**, **réponse multivaleur** (jusqu'à huit enregistrements sains) et **pondérée** (proportions).

| Exigence | Réponse |
| --- | --- |
| Faire pointer l'apex `example.com` vers un ALB sans coût de requête | Enregistrement d'alias |
| Envoyer les utilisateurs vers la Région la plus rapide | Politique de routage par latence |
| Les utilisateurs d'un pays doivent être servis depuis une seule Région | Politique de routage par géolocalisation |
| Des serveurs sur site doivent résoudre les noms d'une zone hébergée privée | Point de terminaison entrant Route 53 Resolver |

> **Conseil d'examen.** Entre un alias et un CNAME vers une cible AWS, l'alias est moins cher (requêtes gratuites), fonctionne à l'apex de la zone et ne demande pas de TTL séparé.

<!-- section: cdn-edge-caching | objectives: 4.4.11 -->
## CDN et mise en cache en périphérie

Amazon CloudFront met le contenu en cache dans des emplacements périphériques proches des spectateurs. Éléments de coût :

- **Les récupérations depuis des origines AWS** (S3, EC2, Elastic Load Balancing) sont **gratuites** : vous cessez de payer le transfert de données sortant de la Région et payez à la place la diffusion CloudFront.
- L'offre toujours gratuite comprend **1 To** de transfert de données sortant et **10 000 000** de requêtes HTTP/HTTPS par mois, plus 2 000 000 d'invocations de CloudFront Functions.
- **Les classes de prix** réduisent le coût en excluant les emplacements périphériques chers : Price Class All, Price Class 200 (exclut l'Amérique du Sud et l'Australie/Nouvelle-Zélande), Price Class 100 (États-Unis, Mexique, Canada, Europe, Israël, Türkiye). Les spectateurs situés ailleurs subissent une latence plus élevée.
- **Origin Shield** ajoute une couche de cache dans une Région devant l'origine, de sorte que chaque objet n'est récupéré qu'une fois depuis l'origine, moyennant des frais de requêtes supplémentaires.
- **Les forfaits à tarif fixe** (Free, Pro, Business, Premium) regroupent CloudFront avec AWS WAF, la protection DDoS, le DNS Route 53 et des crédits de stockage S3 pour un prix mensuel sans frais de dépassement.

Quand un CDN est la bonne stratégie :

| Signal dans l'énoncé | Stratégie |
| --- | --- |
| Ressources statiques ou vidéo pour des utilisateurs de nombreux pays | CloudFront devant S3 (contrôle d'accès à l'origine) |
| Facture élevée de transfert sortant depuis EC2 ou S3 | CloudFront ; les accès servis par le cache ne coûtent aucun transfert depuis l'origine |
| Un trafic en pics sur les mêmes objets surcharge l'origine | CloudFront avec Origin Shield |
| Des appels d'API renvoient sans cesse les mêmes réponses | Mise en cache API Gateway ou ElastiCache devant le backend |
| Trafic de jeu ou VoIP non HTTP, adresses IP statiques | Global Accelerator, pas CloudFront |

> **Piège d'examen.** CloudFront met en cache ; Global Accelerator, non. « Reduce origin load and data transfer costs for HTTP content » désigne CloudFront. « Static IP addresses for a TCP or UDP application » désigne Global Accelerator.

<!-- section: throttling | objectives: 4.4.13 -->
## Stratégies de limitation

La limitation (throttling) protège un backend de la surcharge et empêche un pic de se transformer en facture. Choisissez le contrôle au niveau de la couche qui reçoit le trafic :

| Couche | Contrôle | Faits |
| --- | --- | --- |
| Amazon API Gateway | Limitation au niveau du compte, de l'étape, de la méthode et du client (compartiment à jetons) | Quota de compte par défaut de 10 000 requêtes par seconde par Région avec une rafale de 5 000 (moins dans certaines Régions récentes) ; les requêtes en excès reçoivent `429 Too Many Requests` |
| Plans d'utilisation API Gateway | Débit, rafale et quota par client, identifié par une clé d'API | Pour des niveaux de clientèle ; limitations et quotas sont des cibles appliquées au mieux, pas des plafonds garantis |
| AWS WAF | Règle basée sur le débit | Compte les requêtes par clé d'agrégation (adresse IP, IP transférée, clés personnalisées) sur 1, 2, 5 ou 10 minutes ; limite minimale de 10 |
| AWS Lambda | Simultanéité réservée | Simultanéité maximale et garantie pour une fonction, sans frais supplémentaires ; protège une base de données de trop nombreuses connexions |
| Amazon SQS | File d'attente entre producteur et consommateur | Absorbe les rafales ; les consommateurs traitent à un rythme constant (lissage de charge) |
| Amazon RDS Proxy | Limites de connexions | Met en file d'attente, puis rejette les connexions au-delà de la limite |

API Gateway applique les limites dans cet ordre : limites par client ou par méthode d'un plan d'utilisation, limites par méthode d'une étape, limite du compte par Région, puis limite régionale d'AWS. Un niveau inférieur ne peut pas dépasser celui du dessus. Les clients qui reçoivent des erreurs 429 doivent réessayer avec un backoff exponentiel.

```bash
# Cap a function so that it never opens more than 50 concurrent database sessions
aws lambda put-function-concurrency --function-name order-writer --reserved-concurrent-executions 50
```

> **Piège d'examen.** La simultanéité provisionnée n'est pas une limitation : elle pré-initialise des environnements d'exécution pour réduire les démarrages à froid et elle est facturée. Pour limiter la mise à l'échelle d'une fonction, la réponse est la simultanéité réservée.

<!-- section: key-points -->
## Points clés

- Gratuit : données entrantes, trafic privé dans une même AZ, EC2 vers S3 ou DynamoDB dans la Région, origine AWS vers CloudFront, points de terminaison de passerelle. Facturé : sortie vers Internet, entre AZ (dans chaque sens), entre Régions, traitement NAT, points de terminaison d'interface.
- Le trafic entre zones d'un ALB n'est pas facturé comme un transfert entre AZ ; l'équilibrage entre zones du NLB est désactivé par défaut et facturé quand il est activé.
- Passerelle NAT = heures plus Go traités ; instance NAT = moins chère mais autogérée. Les points de terminaison de passerelle suppriment le traitement NAT pour S3 et DynamoDB.
- Une passerelle NAT partagée pour le développement ; une par AZ ou une passerelle NAT régionale pour la production.
- Les requêtes d'alias Route 53 vers des ressources AWS sont gratuites et fonctionnent à l'apex.
- CloudFront réduit le transfert sortant et la charge de l'origine ; Global Accelerator ajoute un coût pour des IP statiques et la performance TCP/UDP.
- Limitez avec les limites et plans d'utilisation d'API Gateway, les règles WAF basées sur le débit, la simultanéité réservée Lambda et la mise en tampon SQS.
