AWS facture surtout le calcul, le stockage et le transfert de données sortant. L'examen décrit une charge de travail (stable, courte, interruptible, sous licence par socket, qui exige une capacité garantie) et demande l'option d'achat la moins chère, ou un besoin de stockage et demande la bonne classe, ou un chemin de trafic et demande s'il est facturé.

<!-- section: purchasing-options | objectives: 4.1.1 -->
## Options d'achat de capacités de calcul

| Option | Mode de paiement | Remise par rapport à On-Demand |
| --- | --- | --- |
| **On-Demand Instances** | À la seconde (ou à l'heure), sans engagement ni paiement initial | Aucune : c'est le prix de référence |
| **Savings Plans** | Engagement sur un montant d'utilisation en USD par heure, pendant 1 ou 3 ans | Jusqu'à 72 % (EC2 Instance Savings Plans), jusqu'à 66 % (Compute Savings Plans) |
| **Instances réservées (RI)** | Engagement sur une configuration d'instance (type, plateforme, location, Région ou zone de disponibilité) pendant 1 ou 3 ans | Jusqu'à 72 % |
| **Instances Spot** | Capacité EC2 inutilisée au prix Spot courant ; AWS peut interrompre l'instance avec un **préavis de deux minutes** | Jusqu'à 90 % |
| **Dedicated Hosts** | Un serveur physique entier réservé pour vous ; On-Demand ou réservé | Pas une remise : une option d'isolation et de licences |
| **Dedicated Instances** | Instances sur du matériel dédié à votre compte ; vous ne gérez pas l'hôte | Pas une remise : une option d'isolation |
| **On-Demand Capacity Reservations** | Capacité réservée dans une zone de disponibilité, pour une durée quelconque, facturée au tarif On-Demand qu'elle soit utilisée ou non | Aucune à elle seule ; à combiner avec des Savings Plans ou des RI régionales pour la remise |

Les Savings Plans et les RI ont les mêmes options de paiement : **All Upfront**, **Partial Upfront** et **No Upfront**. Une durée plus longue et un paiement initial plus important donnent la remise la plus forte.

| Savings Plan | S'applique à | Flexibilité |
| --- | --- | --- |
| **Compute Savings Plans** | Amazon EC2, AWS Fargate, AWS Lambda | Toute famille d'instances, taille, Région, système d'exploitation ou location (tenancy) |
| **EC2 Instance Savings Plans** | Amazon EC2 | Une famille d'instances dans une Région ; toute taille, tout système d'exploitation, toute location |

<!-- section: when-to-use | objectives: 4.1.3 -->
## Quand utiliser chaque option

| Charge de travail | Meilleure option |
| --- | --- |
| Charge courte, imprévisible ou nouvelle ; tests ; ne peut pas être interrompue | On-Demand |
| Utilisation stable pendant 1 ou 3 ans, avec un possible changement de famille d'instances, de Région ou un passage à Fargate ou Lambda | Compute Savings Plans |
| Utilisation stable d'une famille d'instances dans une Région, remise maximale | EC2 Instance Savings Plans ou RI Standard |
| Tâches batch, rendu d'images, builds CI, big data : tolérants aux pannes et souples dans le temps | instances Spot |
| Licences logicielles existantes liées au serveur (par socket, par cœur, par VM), ou conformité exigeant de contrôler le placement des instances sur un serveur physique | Dedicated Hosts |
| Conformité exigeant du matériel à locataire unique, sans gérer d'hôtes | Dedicated Instances |
| Capacité garantie dans une zone de disponibilité pour un court événement critique ou pour la reprise après sinistre, sans engagement de 1 ou 3 ans | On-Demand Capacity Reservations |

> **Piège d'examen.** Spot n'est la moins chère que si l'énoncé accepte les interruptions. « La tâche ne peut pas être interrompue » exclut Spot ; « licences BYOL par socket » désigne Dedicated Hosts, pas Dedicated Instances.

<!-- section: ri-flexibility | objectives: 4.1.4 -->
## Flexibilité des instances réservées

| Attribut | RI Standard | RI Convertible |
| --- | --- | --- |
| Remise | Plus forte | Plus faible |
| Échange contre une autre famille d'instances, un autre système d'exploitation ou une autre location | Non | Oui, contre une RI Convertible de valeur égale ou supérieure |
| Modification de la zone de disponibilité, de la portée ou de la taille dans la famille | Oui | Oui |
| Vente sur le Marketplace des instances réservées | Oui | Non |

| Portée | Capacité réservée | La remise s'applique à |
| --- | --- | --- |
| **RI régionale** | Non | Toute zone de disponibilité de la Région, et toute **taille** de la même famille (Linux/Unix, location par défaut) : flexibilité de taille d'instance |
| **RI zonale** | Oui, dans cette zone de disponibilité | Le type d'instance exact dans cette zone de disponibilité uniquement |

La flexibilité de taille utilise un facteur de normalisation : une RI régionale pour une `m5.xlarge` (facteur 8) peut couvrir deux instances `m5.large` (facteur 4 chacune).

<!-- section: ri-organizations | objectives: 4.1.5 -->
## Les instances réservées dans AWS Organizations

Avec la facturation consolidée, les comptes de l'organisation sont traités comme un seul compte pour les remises :

- Une remise RI ou Savings Plan s'applique **d'abord au compte qui l'a achetée**. La remise inutilisée s'applique ensuite à l'utilisation correspondante de **n'importe quel autre compte** de l'organisation.
- Le compte de gestion peut **désactiver le partage des remises** pour certains comptes ; ces comptes ne donnent alors ni ne reçoivent de remises RI et Savings Plans partagées.
- La **réservation de capacité** d'une RI zonale reste au compte acheteur ; seule la remise de facturation est partagée.

> **Conseil d'examen.** « Acheter des RI dans un compte et en faire profiter les autres comptes » relève de la facturation consolidée d'AWS Organizations, sans coût supplémentaire ni configuration autre que de laisser le partage activé.

<!-- section: data-transfer | objectives: 4.1.6 -->
## Coûts de transfert de données

| Trafic | Facturation |
| --- | --- |
| Entrant depuis Internet vers AWS | Gratuit |
| Sortant d'AWS vers Internet | Au Go, avec des tarifs dégressifs selon le volume ; les 100 premiers Go par mois sont gratuits |
| Dans une même zone de disponibilité, avec des adresses IP privées | Gratuit |
| Entre zones de disponibilité d'une même Région | Facturé au Go, dans chaque sens |
| Entre Régions | Facturé au Go, par la Région source |
| D'une origine AWS (S3, EC2) vers Amazon CloudFront | Gratuit |
| D'EC2 vers Amazon S3 dans la même Région | Gratuit |

> **Piège d'examen.** Les données **entrantes** sont gratuites et les données **sortantes** facturées. Servir les utilisateurs depuis CloudFront réduit en général le coût du transfert sortant par rapport à un service direct depuis S3 ou EC2.

<!-- section: storage-pricing | objectives: 4.1.2, 4.1.7 -->
## Options et niveaux de stockage, et leur tarification

| Service | Ce que vous payez |
| --- | --- |
| **Amazon S3** | Go stockés par mois (selon la classe de stockage), requêtes, récupération des données pour certaines classes, transfert de données sortant, fonctionnalités optionnelles (réplication, analytique) |
| **Amazon EBS** | Go **provisionnés** par mois, utilisés ou non ; IOPS et débit supplémentaires pour certains types de volumes ; instantanés au Go stocké (incrémentiels, conservés dans S3) |
| **Stockage d'instance EC2** (instance store) | Inclus dans le prix de l'instance ; les données sont perdues à l'arrêt ou à la résiliation de l'instance |
| **Amazon EFS** | Go réellement stockés par mois (sans provisionnement), prix plus bas dans les classes Infrequent Access et Archive |

| Classe de stockage S3 | Mode d'accès | Durée minimale de stockage | Récupération |
| --- | --- | --- | --- |
| S3 Standard | Fréquent | Aucune | Millisecondes, sans frais de récupération |
| S3 Intelligent-Tiering | Inconnu ou changeant ; déplace les objets automatiquement, frais de surveillance par objet | Aucune | Millisecondes (niveaux automatiques), sans frais de récupération |
| S3 Standard-IA | Peu fréquent, accès rapide nécessaire | 30 jours | Millisecondes, frais au Go |
| S3 One Zone-IA | Peu fréquent, données recréables, une zone de disponibilité | 30 jours | Millisecondes, frais au Go |
| S3 Glacier Instant Retrieval | Archive lue environ une fois par trimestre | 90 jours | Millisecondes, frais au Go |
| S3 Glacier Flexible Retrieval | Archive lue une ou deux fois par an | 90 jours | De quelques minutes à quelques heures |
| S3 Glacier Deep Archive | Archive à long terme (des années), prix le plus bas | 180 jours | Sous 12 heures (Standard) |

Plus la classe est froide, plus le prix de stockage baisse et plus chaque lecture coûte cher et prend du temps. Les règles **S3 Lifecycle** déplacent les objets vers des classes moins chères ou les suppriment selon un calendrier.

> **Piège d'examen.** EBS facture la taille **provisionnée** : un volume vide de 500 Go coûte autant qu'un volume plein. EFS et S3 ne facturent que ce que vous stockez.

<!-- section: key-points -->
## Points clés

- On-Demand : sans engagement. Savings Plans et RI : 1 ou 3 ans, jusqu'à 72 %. Spot : jusqu'à 90 %, interruptible. Dedicated Hosts : licences par socket ou par cœur. Dedicated Instances : matériel à locataire unique. Capacity Reservations : capacité sans durée imposée.
- Les Compute Savings Plans couvrent EC2, Fargate et Lambda dans toute Région ; les EC2 Instance Savings Plans couvrent une famille dans une Région.
- Les RI Convertible s'échangent ; les RI Standard se revendent sur le RI Marketplace. Les RI régionales offrent la flexibilité de taille et de zone ; les RI zonales réservent de la capacité.
- Dans une organisation, les remises sont partagées entre comptes par défaut ; le partage peut être désactivé.
- Données entrantes : gratuites. Données sortantes vers Internet, entre zones et entre Régions : facturées.
- S3 : plus la classe est froide, moins le stockage coûte et plus la lecture coûte. EBS : Go provisionnés. EFS et S3 : Go stockés.
