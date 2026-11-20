Les questions hybrides décrivent une organisation qui conserve des centres de données, des sites distants ou des plateformes héritées pendant qu'elle construit sur AWS. Elles vérifient que la conception survit à une panne, déplace les données au bon rythme, résout les noms dans les deux sens et exécute le calcul là où il doit s'exécuter. Cherchez la contrainte décisive : un objectif de disponibilité, une règle de chiffrement, un nombre de routes, un protocole qui ne peut pas changer ou un site qui peut perdre son lien avec la Région.

<!-- section: hybrid-connectivity | objectives: 1.3.1 -->
## Connectivité hybride redondante

Les briques se combinent plus qu'elles ne s'opposent :

| Composant | Rôle dans une conception hybride |
| --- | --- |
| Connexion AWS Direct Connect | Port physique dans un emplacement Direct Connect, dédiée (1, 10, 100 ou 400 Gbit/s) ou hébergée par un partenaire |
| Interface virtuelle (VIF) | VIF privée vers une passerelle réseau privé virtuel ou une passerelle Direct Connect, VIF de transit vers une passerelle Direct Connect associée à des passerelles de transit, VIF publique vers les points de terminaison publics AWS |
| Passerelle Direct Connect | Ressource globale qui joue le rôle d'un ensemble de réflecteurs de routes BGP hors du chemin des données ; s'associe à 6 passerelles de transit au plus ou à 20 passerelles réseau privé virtuel au plus, ou à un réseau central (core network) AWS Cloud WAN |
| AWS Transit Gateway | Routeur régional qui relie des attachements VPC, Site-to-Site VPN, passerelle Direct Connect, Connect et d'appairage, avec des tables de routage pour la segmentation |
| AWS Site-to-Site VPN | Deux tunnels IPsec par connexion, chacun jusqu'à 1,25 Gbit/s (standard) ou 5 Gbit/s (tunnel à large bande passante) |

**Modèles de résilience Direct Connect** (termes du Resiliency Toolkit ; SLA seulement si les exigences du SLA sont respectées) :

| Modèle | Topologie | Résiste à | Objectif de SLA |
| --- | --- | --- | --- |
| Résilience maximale (Maximum resiliency) | Connexions distinctes terminées sur des équipements distincts dans plus d'un emplacement Direct Connect | Panne d'équipement, de connexion et perte complète d'un emplacement | 99,99 % |
| Haute résilience (High resiliency) | Une connexion dans chacun d'au moins deux emplacements | Coupure de fibre, panne d'équipement, perte d'un emplacement | 99,9 % |
| Développement et test | Connexions distinctes sur des équipements distincts dans un seul emplacement | Panne d'équipement uniquement | Aucun indiqué |

Le Resiliency Toolkit impose des débits identiques, refuse deux connexions dédiées sur le même équipement et exécute des tests de basculement qui coupent volontairement une session BGP pour prouver le chemin de secours.

**Sélection des routes.** Sur une passerelle de transit, le préfixe le plus long l'emporte d'abord. Pour un même préfixe, les routes statiques l'emportent sur les routes propagées, et parmi les routes propagées l'ordre est : VPC, puis passerelle Direct Connect, puis Connect, puis Site-to-Site VPN sur Direct Connect privé, puis Site-to-Site VPN. Un VPN qui annonce les mêmes préfixes que Direct Connect est donc par défaut un secours passif : ses routes n'apparaissent que lorsque les routes Direct Connect sont retirées. Pour un même type d'attachement, les attributs BGP décident (AS path le plus court, puis MED la plus basse ; MED par défaut 0 sur Direct Connect, 100 sur VPN). Pour orienter le trafic sortant d'AWS vers l'un de deux chemins Direct Connect, annoncez un préfixe plus spécifique, allongez l'AS path du secours (prepending) ou marquez les routes avec les communautés de préférence locale `7224:7100` (basse), `7224:7200` (moyenne) et `7224:7300` (haute).

L'ECMP agrège des tunnels VPN sur une passerelle de transit uniquement avec BGP, jamais entre types d'attachement différents. Un Direct Connect à 10 Gbit/s secouru par un seul VPN perd l'essentiel de sa bande passante au basculement : « même débit pendant le basculement » exige une deuxième connexion Direct Connect.

**Chiffrement et nombre de routes.**

- Direct Connect n'est pas chiffré par défaut. Utilisez MACsec sur les connexions dédiées compatibles, ou un **Site-to-Site VPN à adresses IP privées** (private IP VPN) : IPsec sur une VIF de transit vers une passerelle de transit, avec des adresses de tunnel privées, sans appliance tierce, et 5 000 routes vers la passerelle client et 1 000 depuis celle-ci.
- Quotas qui orientent la conception : 100 routes par session BGP depuis le site sur une VIF privée ou de transit par défaut (jusqu'à 1 000 avec les contrôles de préfixes) ; 200 préfixes par passerelle de transit d'AWS vers le site sur une VIF de transit ; jusqu'à 5 000 préfixes annoncés quand la passerelle Direct Connect est attachée à un réseau central Cloud WAN. Dépasser l'allocation configurée fait tomber la session BGP : résumez les routes.

| Exigence | Conception |
| --- | --- |
| Disponibilité de 99,99 % pour le trafic hybride | Deux emplacements Direct Connect, deux équipements, connexions distinctes (résilience maximale) |
| Secours le moins coûteux, bande passante dégradée acceptée | Direct Connect plus Site-to-Site VPN sur la même passerelle de transit |
| Chiffrement sur Direct Connect sans adresse IP publique | VPN à adresses IP privées sur une VIF de transit vers la passerelle de transit |
| Nombreux VPC dans plusieurs Régions sur un seul Direct Connect | VIF de transit, passerelle Direct Connect, une passerelle de transit par Région (ou Cloud WAN) |

> **Piège d'examen.** Deux connexions dans le même emplacement Direct Connect, même sur des équipements distincts, correspondent au modèle développement et test. Tout énoncé qui exige de survivre à la perte d'un emplacement nécessite un deuxième emplacement.

<!-- section: data-synchronization | objectives: 1.3.2 -->
## Synchronisation des données des charges de travail hybrides

Choisissez selon le sens du transfert, le protocole et le fait que les utilisateurs sur site continuent ou non de travailler sur les données :

| Service | Ce qu'il fait | Usage |
| --- | --- | --- |
| AWS DataSync | Tâches de copie planifiées ou à la demande entre NFS, SMB, HDFS ou stockage objet et S3, EFS ou FSx ; aussi entre services de stockage AWS et depuis d'autres clouds | Migrations, réplication récurrente, archivage vers les classes de stockage S3 Glacier, alimentation de traitements dans le cloud |
| Amazon S3 File Gateway | Partage NFS ou SMB sur site, fichiers stockés comme objets S3, cache local pour les données récentes | Applications sur site qui écrivent des fichiers que des services cloud doivent lire dans S3 |
| Volume Gateway | Volumes bloc iSCSI ; le mode mis en cache (cached) garde les données principales dans AWS, le mode stocké (stored) les garde sur site avec des sauvegardes asynchrones sous forme d'instantanés EBS | Sauvegarde et reprise après sinistre du stockage bloc |
| Tape Gateway | Bibliothèque de bandes virtuelles pour le logiciel de sauvegarde existant, bandes archivées dans AWS | Remplacer les bandes physiques sans changer l'application de sauvegarde |
| AWS Transfer Family | Points de terminaison SFTP, FTPS, FTP et AS2 gérés devant S3 ou EFS, applications web pour l'accès par navigateur, flux de travail gérés après téléversement | Partenaires et flux B2B qui doivent garder leur protocole et leurs clients |
| AWS Data Transfer Terminal | Site physique où vous apportez vos propres périphériques de stockage et téléversez par son réseau | Grands volumes collectés sur le terrain quand le réseau est trop lent |

Détails de DataSync qui décident des réponses :

- Un agent (VM ou instance EC2) est nécessaire pour NFS, SMB, HDFS et le stockage objet sur site ; il peut utiliser un point de terminaison de VPC via Direct Connect ou VPN.
- Le **mode Enhanced** liste, transfère et vérifie en parallèle, avec un nombre d'objets pratiquement illimité par exécution ; le **mode Basic** a des quotas de fichiers et est obligatoire pour S3 on Outposts. Le mode est fixé à la création de la tâche.
- Les tâches ne copient que les données modifiées, vérifient l'intégrité, chiffrent en transit et peuvent être bridées.

Amazon FSx File Gateway n'est plus proposé aux nouveaux clients : les utilisateurs sur site accèdent directement à FSx for Windows File Server via Direct Connect ou VPN. Les appareils Snow Family ne sont plus proposés aux nouveaux clients : pour un transfert hors ligne, utilisez Data Transfer Terminal. Les baies NetApp se répliquent vers FSx for NetApp ONTAP avec SnapMirror.

> **Piège d'examen.** DataSync déplace des données ; il ne présente pas de partage. Si des applications sur site doivent continuer d'écrire en NFS ou SMB pendant que le cloud lit les mêmes données dans S3, la réponse est S3 File Gateway. Si les fichiers doivent seulement arriver dans AWS selon une planification, DataSync est plus simple.

<!-- section: legacy-integration | objectives: 1.3.3 -->
## Modèles d'intégration pour moderniser les systèmes hérités

Les systèmes hérités changent rarement d'interface : la couche d'intégration adapte donc les données.

| Contrainte héritée | Modèle |
| --- | --- |
| Backend SOAP ou XML, consommateurs qui veulent du REST JSON | API REST API Gateway avec des modèles de mappage (mapping templates, VTL, jusqu'à 300 Ko) qui transforment requête et réponse, ou fonction Lambda qui convertit les formats |
| Backend joignable uniquement par le réseau privé | Intégration privée d'API REST par un lien VPC (VPC link) vers un NLB, qui atteint le site via Direct Connect ou VPN |
| Applications qui parlent JMS, AMQP, MQTT, STOMP ou OpenWire | Amazon MQ (ActiveMQ Classic ou RabbitMQ) : migrer le broker sans réécrire le code de messagerie |
| Consommateurs cloud natifs qui doivent réagir aux messages du broker | EventBridge Pipes avec Amazon MQ comme source, filtrage, enrichissement et transformation d'entrée facultatifs, puis une cible comme Step Functions ou un bus d'événements |
| La base de données héritée est la seule source d'événements de changement | Capture des données modifiées (CDC) AWS DMS vers Kinesis Data Streams, consommée par Lambda |
| Remplacer un monolithe progressivement | Strangler fig : API Gateway ou un ALB route les chemins migrés vers les nouveaux services, le reste vers le système hérité |
| Le code mainframe ou .NET Framework lui-même doit être modernisé | AWS Transform (transformations mainframe, VMware, .NET) |

Limites d'API Gateway : délai d'intégration de 50 ms à 29 secondes, relevable par Service Quotas pour les API REST régionales et privées (pas pour les API optimisées pour la périphérie) ; charge utile de 10 Mo. Pour un appel hérité qui dure plusieurs minutes, renvoyez `202 Accepted`, placez la requête dans une file SQS et laissez un worker appeler le backend pendant que le client interroge le résultat.

Amazon MQ propose des brokers ActiveMQ actif/veille sur deux zones de disponibilité, des clusters RabbitMQ avec files de quorum (quorum queues) et la réplication des données entre Régions pour ActiveMQ. Pour une nouvelle conception sans protocole de broker, préférez SQS, SNS ou EventBridge : sans serveur, sans dimensionnement de broker.

> **Conseil d'examen.** « Sans modifier le code de l'application » avec une application JMS ou AMQP existante désigne Amazon MQ, pas SQS. « Transformer la charge utile entre XML et JSON avec le moins de code » désigne les modèles de mappage d'API Gateway.

<!-- section: hybrid-dns | objectives: 1.3.4 -->
## DNS pour les environnements hybrides

Route 53 Resolver, documenté aujourd'hui sous le nom **Route 53 VPC Resolver**, répond à l'adresse de base du VPC +2 pour les noms du VPC, les zones hébergées privées et les noms publics. La résolution hybride ajoute des points de terminaison et des règles :

| Besoin | Composant |
| --- | --- |
| Les clients sur site résolvent des zones hébergées privées | **Point de terminaison entrant** : les serveurs DNS sur site transfèrent conditionnellement la zone AWS vers les adresses IP du point de terminaison |
| Les charges de travail du VPC résolvent des noms sur site | **Point de terminaison sortant** plus une **règle de transfert** pour le domaine sur site, associée à chaque VPC |
| Un domaine sous un parent transféré doit rester résolu dans AWS | **Règle système** pour le sous-domaine (la règle la plus spécifique l'emporte) |
| De nombreux comptes réutilisent les mêmes règles | Partage des règles avec AWS RAM ; chaque compte les associe à ses VPC de la même Région |
| Mêmes zones hébergées privées, règles et groupes de règles DNS Firewall pour des centaines de VPC | **Route 53 Profiles** partagés par RAM (jusqu'à 1 000 VPC par profil, 2 profils par VPC) |
| Un même nom répond différemment à l'intérieur et à l'extérieur | **Horizon partagé (split-horizon)** : zones hébergées publique et privée de même nom de domaine |

Règles de conception :

- Les points de terminaison sont régionaux, exigent au moins deux adresses IP (placez-les dans des zones de disponibilité différentes) et en acceptent jusqu'à 6. Chaque adresse IP traite jusqu'à 10 000 requêtes UDP par seconde, beaucoup moins quand les groupes de sécurité suivent les connexions ; ajoutez des adresses quand le volume de requêtes augmente.
- Centralisez : points de terminaison dans un VPC réseau partagé, règles partagées avec l'organisation, VPC de charge de travail reliés au hub par une passerelle de transit.
- Une zone hébergée privée s'associe à 300 VPC au plus, y compris des VPC d'autres comptes (autorisation dans le compte de la zone, puis association depuis le compte du VPC) ; au-delà, utilisez les profils.
- Comportement de l'horizon partagé : dans un VPC associé, la zone privée répond. Un nom absent de la zone privée renvoie NXDOMAIN ; VPC Resolver ne se replie pas sur la zone publique.

```bash
# Network account: share the outbound forwarding rule with the organization
aws ram create-resource-share \
  --name corp-dns-forwarding \
  --resource-arns arn:aws:route53resolver:eu-west-1:111122223333:resolver-rule/rslvr-rr-0example \
  --principals arn:aws:organizations::111122223333:organization/o-exampleorg

# Workload account: attach the shared rule to a local VPC
aws route53resolver associate-resolver-rule \
  --resolver-rule-id rslvr-rr-0example \
  --vpc-id vpc-0workload
```

> **Piège d'examen.** Une passerelle de transit transporte les paquets DNS mais ne résout pas les noms des zones hébergées privées pour les VPC attachés. La résolution entre VPC vient des associations de zones, des règles Resolver partagées ou des profils, jamais de la passerelle de transit elle-même.

<!-- section: hybrid-compute | objectives: 1.3.5 -->
## Modèles de calcul hybride

| Option | Où il s'exécute | Plan de contrôle | Usage |
| --- | --- | --- | --- |
| Racks AWS Outposts | Racks 42U installés et maintenus par AWS sur site | Région parente, par la liaison de service (service link) | Traitement local, résidence des données, faible latence vers les systèmes sur site (EC2, EBS, S3 on Outposts, RDS, ECS, EKS, ALB) |
| Serveurs AWS Outposts | Serveurs 1U ou 2U installés par le client | Région parente | Magasins, sites distants, petite capacité (EC2, ECS) |
| AWS Local Zones | Zones exploitées par AWS dans des métropoles, rattachées à une Région parente | Région parente | Latence de l'ordre de quelques millisecondes pour les utilisateurs d'une ville sans Région |
| Amazon EKS Hybrid Nodes | Vos serveurs ou VM rejoignent un cluster EKS | Plan de contrôle EKS géré par AWS | Connectivité fiable vers AWS, un seul modèle d'exploitation Kubernetes ; pas pour les sites déconnectés |
| Amazon EKS Anywhere | vSphere, serveurs physiques (bare metal), Nutanix | Autogéré, sur site | Sites déconnectés ou isolés (air-gapped) ; abonnement entreprise facultatif pour le support |
| Amazon ECS Anywhere | Instances externes enregistrées avec SSM Agent et l'agent ECS, type de lancement `EXTERNAL` | Plan de contrôle ECS dans la Région | Exécuter des tâches ECS sur des serveurs existants |

Contraintes vérifiées par l'examen :

- Un Outpost prolonge une zone de disponibilité de sa Région et est géré par la liaison de service : prévoyez une connectivité redondante vers la Région.
- EKS Hybrid Nodes exige une connexion fiable (Site-to-Site VPN, Direct Connect ou votre propre VPN), des CIDR de nœuds et de pods distants routables (15 au plus pour chacun), et utilise les activations hybrides de Systems Manager ou IAM Roles Anywhere pour les informations d'identification des nœuds. La facturation se fait par heure de vCPU ; l'exécution sur AWS ou sur d'autres clouds n'est pas prise en charge.
- ECS Anywhere ne prend en charge que les modes réseau `bridge`, `host` et `none` : pas d'`awsvpc`, pas d'intégration Elastic Load Balancing, pas de découverte de services, pas de volumes EFS, pas de fournisseurs de capacité. Placez votre propre équilibreur de charge devant les instances externes.

> **Piège d'examen.** « Kubernetes sur site avec un plan de contrôle géré par AWS » correspond à EKS Hybrid Nodes ; « doit continuer de fonctionner sans connexion à AWS » correspond à EKS Anywhere. Un service ECS Anywhere ne peut pas enregistrer ses tâches auprès d'un équilibreur de charge.

<!-- section: key-points -->
## Points clés

- 99,99 % = connexions et équipements distincts dans au moins deux emplacements Direct Connect ; un seul emplacement correspond au modèle développement et test.
- Ordre de la passerelle de transit : préfixe le plus long, statique, VPC, passerelle Direct Connect, Connect, VPN sur Direct Connect, VPN. Un VPN de secours ne transporte du trafic qu'après le retrait des routes Direct Connect.
- Chiffrez Direct Connect avec MACsec ou un VPN à adresses IP privées ; attention au défaut de 100 routes par session BGP.
- DataSync copie, S3 File Gateway partage, Transfer Family conserve les protocoles des partenaires ; FSx File Gateway et les appareils Snow sont fermés aux nouveaux clients.
- Héritage : modèles de mappage ou Lambda, Amazon MQ, EventBridge Pipes, strangler fig, appels asynchrones au-delà de 29 secondes.
- DNS : point de terminaison entrant (du site vers AWS), point de terminaison sortant et règles (d'AWS vers le site), RAM ou profils pour passer à l'échelle.
- EKS Hybrid Nodes exige la connectivité, EKS Anywhere fonctionne déconnecté ; ECS Anywhere n'a ni `awsvpc` ni intégration d'équilibreur de charge.
