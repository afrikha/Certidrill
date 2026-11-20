Les liaisons hybrides et la topologie entre VPC sont des coûts mensuels fixes faciles à surdimensionner : un port Direct Connect que personne ne remplit, un attachement de passerelle de transit pour deux VPC qu'une connexion d'appairage servirait, un VPN incapable de porter le débit exigé. Ce chapitre présente les outils qui montrent où part l'argent du réseau, les options de connectivité et de topologie avec leur tarification, le dimensionnement de la bande passante et l'analyse des charges de travail.

<!-- section: cost-management-features | objectives: 4.4.1 -->
## Répartition des coûts des ressources réseau

Les coûts réseau sont souvent partagés : une passerelle NAT, une passerelle de transit ou une connexion Direct Connect sert de nombreuses équipes. Deux fonctionnalités permettent de les attribuer :

**Balises de répartition des coûts**

| Type | Créées par | Exemple |
| --- | --- | --- |
| Générées par AWS | AWS, avec le préfixe `aws:` | `aws:createdBy` |
| Définies par l'utilisateur | Vous | `CostCenter`, `Application`, `Environment` |

- Les deux types doivent être **activés** dans la console Billing and Cost Management avant d'apparaître dans Cost Explorer ou dans les rapports de répartition des coûts, et seul le **compte de gestion** d'une organisation (ou un compte autonome) peut les activer.
- Après l'activation, les balises peuvent mettre jusqu'à 24 heures à apparaître.
- Balisez les ressources qui portent des frais réseau horaires : passerelles NAT, attachements de passerelle de transit, points de terminaison d'un VPC, équilibreurs de charge, adresses Elastic IP.

**Facturation consolidée** (AWS Organizations)

- Une seule facture pour les comptes de l'organisation, avec des données de coût et d'utilisation combinées.
- **Utilisation combinée** : les paliers de tarification par volume (le transfert de données sortant est par paliers), les remises des instances réservées et les Savings Plans sont partagés entre les comptes.
- Aucun coût supplémentaire.

Règles de propriété utiles pour la refacturation : le **propriétaire du VPC** paie le montant horaire de son attachement de VPC à la passerelle de transit, et le propriétaire du VPC qui **envoie** le trafic vers la passerelle de transit paie son traitement des données.

> **Piège d'examen.** Appliquer une balise ne suffit pas. Un énoncé où l'équipe financière « ne voit pas les coûts par projet dans Cost Explorer alors que les ressources sont balisées » se résout en activant les balises comme balises de répartition des coûts dans le compte de gestion.

<!-- section: cost-management-tools | objectives: 4.4.2 -->
## Outils de gestion des coûts pour les dépenses réseau

| Exigence | Outil |
| --- | --- |
| Visualiser et filtrer les coûts par service, compte, balise ou **type d'utilisation** dans le temps, avec une prévision | AWS Cost Explorer |
| Alerter quand le coût ou l'utilisation dépasse, ou devrait dépasser, un seuil, et agir automatiquement | AWS Budgets |
| Les données ligne par ligne les plus détaillées, interrogées en SQL | AWS Cost and Usage Report (CUR 2.0) via AWS Data Exports, livré dans Amazon S3 |
| Détecter des dépenses inhabituelles sans fixer de seuils | AWS Cost Anomaly Detection |

**AWS Budgets** prend en charge les budgets de coût, d'utilisation, et d'utilisation ou de couverture des instances réservées et des Savings Plans. Les alertes partent par e-mail ou vers une rubrique Amazon SNS. Les **actions budgétaires** s'exécutent automatiquement ou après approbation : appliquer une politique IAM, appliquer une SCP ou cibler des instances EC2 ou RDS précises. Les données budgétaires sont mises à jour jusqu'à trois fois par jour : ce n'est pas un plafond en temps réel.

**CUR 2.0** est l'export recommandé d'AWS Data Exports (l'ancien CUR reste disponible comme export hérité). Analysez-le avec Amazon Athena ou un tableau de bord. Le transfert de données apparaît sous des types d'utilisation reconnaissables :

| Modèle de type d'utilisation | Signification |
| --- | --- |
| `USE2-DataTransfer-Regional-Bytes` | Entre zones de disponibilité d'une Région (deux lignes, une par sens) |
| `USE2-DataTransfer-Out-Bytes` | Sortie vers Internet depuis la Région |
| `APS3-USE2-AWS-Out-Bytes` | Sortie d'une Région vers une autre |
| Se terminant par `DataXfer-Out` | Sortie par Direct Connect |

**AWS Cost Anomaly Detection** applique l'apprentissage automatique aux services AWS, aux comptes membres, aux balises de répartition des coûts ou aux catégories de coûts, s'exécute environ trois fois par jour, classe les causes par service, compte, Région et type d'utilisation, et alerte par e-mail ou SNS. Il lui faut un historique avant de détecter des anomalies sur un nouveau service.

> **Conseil d'examen.** « Trouver quelle ressource provoque les frais de transfert entre AZ » exige le détail ligne par ligne : CUR 2.0 interrogé avec Athena, plus VPC Flow Logs pour identifier les flux. Cost Explorer montre la tendance ; il ne nomme pas les flux.

<!-- section: connectivity-options | objectives: 4.4.5 -->
## Options de connectivité réseau et leur tarification

| Option | Ce que c'est | Modèle de tarification |
| --- | --- | --- |
| AWS Site-to-Site VPN | Deux tunnels IPsec sur Internet entre une passerelle client et une passerelle réseau privée virtuelle, une passerelle de transit ou Cloud WAN | Par heure de connexion VPN (exemple standard : 0,05 USD par heure) plus le transfert de données sortant |
| Site-to-Site VPN accéléré | Tunnels VPN qui entrent dans le réseau mondial AWS à l'emplacement périphérique le plus proche via Global Accelerator ; attachements de passerelle de transit uniquement | Frais VPN plus deux accélérateurs par connexion et DT-Premium |
| AWS Client VPN | Accès géré basé sur OpenVPN pour des utilisateurs distants individuels | Par heure d'association de point de terminaison plus par heure de connexion active |
| AWS Direct Connect, connexion dédiée | Un port Ethernet physique pour un seul client dans un emplacement Direct Connect : 1, 10, 100 ou 400 Gbit/s | Heures de port (par exemple 0,30 USD/h à 1 Gbit/s, 2,25 USD/h à 10 Gbit/s) plus le transfert sortant aux tarifs Direct Connect ; données entrantes gratuites |
| AWS Direct Connect, connexion hébergée | Capacité fournie par un AWS Direct Connect Partner : de 50 Mbit/s à 25 Gbit/s | Heures de port (un peu plus chères qu'en dédié à vitesse égale) plus le transfert sortant, plus les frais du partenaire |

Le trafic Direct Connect passe par des **interfaces virtuelles** (VIF) : une VIF privée vers une passerelle réseau privée virtuelle ou une passerelle Direct Connect, une VIF de transit vers une passerelle de transit via une passerelle Direct Connect, une VIF publique vers les points de terminaison publics d'AWS. Une **passerelle Direct Connect** est une ressource mondiale qui permet à une connexion d'atteindre des VPC dans de nombreuses Régions et de nombreux comptes (sauf les Régions de Chine).

Les heures de port sont facturées que des données circulent ou non. Une liaison Direct Connect est rentable quand le volume de transfert sortant est assez élevé pour que le tarif par Go plus bas couvre le port, ou quand l'exigence porte sur une latence constante et une connectivité privée.

> **Piège d'examen.** Direct Connect est privé mais pas chiffré par défaut. Quand l'énoncé exige le chiffrement en transit sur Direct Connect, ajoutez MACsec sur les connexions dédiées compatibles ou faites passer un Site-to-Site VPN sur la liaison Direct Connect.

<!-- section: choose-connection | objectives: 4.4.9 -->
## Choisir Direct Connect, un VPN ou Internet

| Exigence | Réponse |
| --- | --- |
| Relier un bureau à un VPC cette semaine, à faible coût, quelques centaines de Mbit/s | Site-to-Site VPN |
| Gros transfert régulier d'AWS vers le site, latence constante | Direct Connect |
| Des employés distants accèdent à des ressources privées depuis leur ordinateur portable | AWS Client VPN |
| Les performances du VPN souffrent de la distance Internet jusqu'à la Région | Site-to-Site VPN accéléré sur une passerelle de transit |
| Chemin de secours le moins cher pour une connexion Direct Connect unique | Site-to-Site VPN en secours |
| Charge critique, survivre à la perte d'un emplacement Direct Connect | Résilience maximale Direct Connect : connexions séparées sur des appareils séparés dans plus d'un emplacement |

Modèles de résilience Direct Connect du Direct Connect Resiliency Toolkit :

| Modèle | Conception | SLA |
| --- | --- | --- |
| Résilience maximale (Maximum resiliency) | Connexions séparées sur des appareils séparés dans plus d'un emplacement | 99,99 % si toutes les exigences du SLA sont remplies |
| Haute résilience (High resiliency) | Connexions uniques vers plusieurs emplacements | 99,9 % si toutes les exigences du SLA sont remplies |
| Développement et test | Connexions séparées sur des appareils séparés dans un seul emplacement | Protège uniquement contre la panne d'un appareil |

> **Conseil d'examen.** Une nouvelle connexion Direct Connect prend du temps à mettre en service, souvent des semaines. « Immediately » ou « within days » oriente vers un VPN, éventuellement comme solution temporaire en attendant Direct Connect.

<!-- section: topology-peering | objectives: 4.4.6 -->
## Routage, topologie et appairage

| Élément | Appairage de VPC | AWS Transit Gateway |
| --- | --- | --- |
| Topologie | Point à point ; un maillage complet exige n(n−1)/2 connexions | En étoile : chaque VPC, VPN ou passerelle Direct Connect s'attache une fois |
| Routage transitif | Non ; pas de routage de bout en bout via la passerelle Internet, l'appareil NAT, le VPN ou le point de terminaison de passerelle du pair | Oui, contrôlé par les tables de routage de la passerelle de transit (segmentation par tables de routage séparées) |
| Blocs CIDR qui se chevauchent | Interdits | Non routables entre attachements |
| Coût fixe | Aucun : la création d'une connexion d'appairage est gratuite | Par heure d'attachement (exemple en US East (Ohio) : 0,05 USD par heure d'attachement de VPC) |
| Coût du trafic | Gratuit dans une même zone de disponibilité ; sinon tarifs entre AZ et entre Régions | Traitement des données par Go envoyé à la passerelle de transit (exemple : 0,02 USD/Go) plus le transfert de données standard |
| Entre Régions | Pris en charge | Appairage de passerelles de transit (routes statiques) ; pas de frais de traitement sur les données reçues d'un attachement d'appairage |

Choisir selon le coût :

- **Quelques VPC qui échangent beaucoup de données** : l'appairage de VPC, car il n'a ni frais horaire ni frais de traitement.
- **De nombreux VPC, réseaux sur site et services partagés** : Transit Gateway, car le nombre de connexions d'appairage et d'entrées de tables de routage croît de façon quadratique et un seul attachement par VPC est plus simple à exploiter.
- **Exposer un service à de nombreux VPC consommateurs, même avec des CIDR qui se chevauchent** : AWS PrivateLink (un service de point de terminaison derrière un NLB), qui évite de router des réseaux entiers.
- **Plusieurs comptes partageant un même réseau** : partagez les sous-réseaux d'un VPC central avec AWS RAM afin que les charges de travail n'aient besoin d'aucun trafic entre VPC.
- **Accès hybride à de nombreuses Régions par une seule connexion Direct Connect** : passerelle Direct Connect, associée à des passerelles de transit ou à des passerelles réseau privées virtuelles.

> **Piège d'examen.** L'appairage de VPC n'est pas transitif. Si les VPC B et C sont tous deux appairés au VPC A, B ne peut pas atteindre C en passant par A, et B ne peut pas utiliser la passerelle NAT ni le VPN de A. La réponse est une connexion d'appairage directe ou une passerelle de transit.

<!-- section: bandwidth-allocation | objectives: 4.4.14 -->
## Dimensionner la bande passante du VPN et de Direct Connect

**Site-to-Site VPN**

| Type de tunnel | Maximum par tunnel | Attachements | Exemple de prix |
| --- | --- | --- | --- |
| Standard | Jusqu'à 1,25 Gbit/s et 140 000 paquets par seconde | Passerelle réseau privée virtuelle, passerelle de transit, Cloud WAN | 0,05 USD par heure de connexion |
| Large Bandwidth Tunnel | Jusqu'à 5 Gbit/s et 400 000 paquets par seconde | Passerelle de transit ou Cloud WAN uniquement ; pas de passerelle réseau privée virtuelle, pas de VPN accéléré | 0,60 USD par heure de connexion |

- Chaque connexion a deux tunnels dans des zones de disponibilité différentes pour la redondance ; les deux tunnels d'une connexion utilisent la même option de bande passante.
- Pour dépasser la limite d'un tunnel, attachez **plusieurs connexions VPN à une passerelle de transit avec ECMP** (routage multichemin à coût égal), ce qui exige le **routage dynamique (BGP)**. Par exemple, deux connexions Large Bandwidth Tunnel donnent 20 Gbit/s sur quatre tunnels. Une passerelle réseau privée virtuelle n'agrège pas les tunnels avec ECMP.
- Le débit réel dépend de la taille des paquets, de la combinaison de trafic et du chemin Internet.

**Direct Connect**

- Choisissez la vitesse du port pour le besoin soutenu plus la croissance : dédiée à 1, 10, 100 ou 400 Gbit/s ; hébergée de 50 Mbit/s à 25 Gbit/s quand il faut moins de 1 Gbit/s ou qu'un partenaire fournit le circuit.
- La vitesse d'une connexion dédiée ne peut pas être modifiée après la demande : il faut une nouvelle connexion. La vitesse d'une connexion hébergée est modifiée par le partenaire, s'il le prend en charge.
- Un **groupe d'agrégation de liens (LAG)** regroupe des connexions dédiées de même vitesse dans le même emplacement en une seule connexion logique.

| Exigence | Réponse |
| --- | --- |
| 3 Gbit/s chiffrés sur Internet vers un seul VPC derrière une passerelle réseau privée virtuelle | Déplacer le VPN sur une passerelle de transit : plusieurs connexions standard avec ECMP, ou une connexion Large Bandwidth Tunnel |
| 500 Mbit/s de trafic privé régulier | Connexion Direct Connect hébergée à 500 Mbit/s |
| 20 Gbit/s aujourd'hui, avec une marge de croissance dans le même emplacement | Deux connexions dédiées de 10 Gbit/s dans un LAG, ou une connexion de 100 Gbit/s |

> **Piège d'examen.** Ajouter une deuxième connexion VPN à une passerelle réseau privée virtuelle ne double pas le débit. L'agrégation ECMP exige une passerelle de transit (ou Cloud WAN) et BGP.

<!-- section: network-review | objectives: 4.4.12 -->
## Examiner les charges de travail existantes pour optimiser le réseau

Une analyse des coûts réseau va de la facture aux flux, puis à la correction :

1. **Trouver la catégorie de coût** dans Cost Explorer ou CUR 2.0 : heures et octets des passerelles NAT, `DataTransfer-Regional-Bytes`, transfert entre Régions, traitement de la passerelle de transit, adresses IPv4 publiques.
2. **Trouver les flux** avec les **VPC Flow Logs** (VPC, sous-réseau ou interface réseau ; publiés dans CloudWatch Logs, S3 ou Data Firehose ; collectés hors du chemin du trafic, donc sans impact sur le débit ni la latence, mais l'ingestion et le stockage des journaux sont facturés). Les champs personnalisés comme `az-id`, `flow-direction`, `traffic-path` (passerelle Internet, point de terminaison de passerelle, appairage, passerelle réseau privée virtuelle) et `pkt-dst-aws-service` (par exemple `S3`, `DYNAMODB`) montrent quelle AZ envoie du trafic vers où.
3. **Trouver les ressources inutilisées** avec les vérifications de coût d'AWS Trusted Advisor : Idle NAT gateways, Inactive NAT Gateways, Inactive VPC interface endpoints, Inactive Gateway Load Balancer endpoints, Unassociated Elastic IP Addresses, Idle Load Balancers (Classic Load Balancers uniquement).
4. **Appliquer la correction** et vérifier la baisse sur la facture suivante.

| Constat | Optimisation |
| --- | --- |
| La plupart des octets de la passerelle NAT vont vers S3 ou DynamoDB | Points de terminaison de passerelle |
| Les instances de l'AZ b utilisent la passerelle NAT de l'AZ a | Passerelle NAT dans l'AZ b, ou passerelle NAT régionale |
| Le frontal appelle le backend par une adresse publique | Équilibreur de charge interne et adresses IP privées |
| Fort trafic entre AZ entre une application et les cibles de son NLB | Désactiver l'équilibrage entre zones du NLB si la capacité des cibles le permet, ou garder les couches bavardes dans une AZ |
| Mêmes objets téléchargés de nombreuses fois depuis S3 | CloudFront devant le compartiment |
| Nombreuses adresses IPv4 publiques inutilisées | Les libérer ; chaque adresse IPv4 publique est facturée à l'heure |
| Nombreuses connexions d'appairage et entrées de routage à maintenir | Transit Gateway, après comparaison de ses frais d'attachement et de traitement |
| Port Direct Connect presque inutilisé | Connexion hébergée à une vitesse inférieure, ou VPN si les besoins de latence le permettent |

> **Conseil d'examen.** Les journaux de flux n'affectent pas les performances réseau : « analyser le trafic sans impact sur l'application » se résout avec VPC Flow Logs, pas avec une capture de paquets sur les instances.

<!-- section: key-points -->
## Points clés

- Activez les balises de répartition des coûts dans le compte de gestion ; la facturation consolidée partage gratuitement les paliers de volume et les remises.
- Cost Explorer pour les tendances, Budgets pour les seuils et les actions, CUR 2.0 pour le détail ligne par ligne, Cost Anomaly Detection pour les surprises.
- VPN : rapide et peu cher, 1,25 Gbit/s par tunnel standard, 5 Gbit/s par Large Bandwidth Tunnel (passerelle de transit ou Cloud WAN). Direct Connect : heures de port plus transfert sortant moins cher, pas chiffré par défaut.
- Appairage : aucun coût fixe, pas transitif. Transit Gateway : attachements horaires et traitement par Go, mais passe à l'échelle pour de nombreux VPC et liaisons hybrides.
- Plus de bande passante VPN = plusieurs connexions avec ECMP sur une passerelle de transit avec BGP. La vitesse d'une connexion Direct Connect dédiée est fixe.
- Analyse : facture (Cost Explorer, CUR 2.0) → flux (VPC Flow Logs) → ressources inutilisées (Trusted Advisor) → correction.
