L'infrastructure mondiale AWS se compose de Régions, des zones de disponibilité qu'elles contiennent et d'emplacements périphériques répartis dans beaucoup plus de villes. L'examen vous demande ce qu'est chacun, comment ils sont liés, comment utiliser plusieurs zones de disponibilité pour la haute disponibilité, et quand une charge de travail a besoin de plus d'une Région.

<!-- section: building-blocks | objectives: 3.2.1, 3.2.5 -->
## Régions, zones de disponibilité et emplacements périphériques

| Composant | Ce que c'est | Utilisé pour |
| --- | --- | --- |
| **Région** | Une zone géographique distincte, conçue pour être isolée des autres Régions afin d'obtenir la meilleure tolérance aux pannes et la meilleure stabilité | L'endroit où vous créez la plupart des ressources ; choisie selon la conformité, la latence, la disponibilité des services et le prix |
| **Zone de disponibilité (AZ)** | Un ou plusieurs centres de données distincts, avec alimentation, réseau et connectivité redondants, dans des installations séparées ; chaque Région compte plusieurs AZ | Exécuter des copies d'une charge de travail dans des lieux physiquement séparés |
| **Emplacement périphérique** | Un site dans une grande ville, bien plus nombreux que les Régions, intégré au réseau mondial AWS | Mise en cache Amazon CloudFront, réponses DNS Amazon Route 53, points d'entrée AWS Global Accelerator, AWS Shield et AWS WAF en périphérie |
| **Local Zone** | Une extension d'une Région qui place le calcul et le stockage plus près des utilisateurs d'une zone métropolitaine | Applications à faible latence pour les utilisateurs d'une ville éloignée d'une Région |
| **AWS Outposts** | L'infrastructure AWS installée dans votre propre centre de données | Faible latence vers les systèmes sur site, traitement local des données |

Comment ils sont liés :

- Une Région **contient** plusieurs AZ ; les AZ d'une Région sont reliées par un réseau redondant à faible latence et à haut débit, sur de la fibre métropolitaine dédiée.
- Une AZ appartient à **une seule** Région. Un sous-réseau, une instance EC2 et un volume EBS résident dans **une** AZ.
- Les emplacements périphériques ne sont **pas** à l'intérieur des Régions : ce sont des points de présence distincts reliés aux Régions par le réseau AWS.
- Les ressources sont régionales par défaut et ne sont **pas répliquées automatiquement** vers d'autres Régions : c'est vous qui choisissez de les copier. Quelques services sont mondiaux (IAM, Route 53, CloudFront).

Quatre critères pour choisir une Région :

| Critère | Question |
| --- | --- |
| Conformité et souveraineté des données | Les données doivent-elles rester dans un pays ou une juridiction ? |
| Latence | Où sont les utilisateurs ? |
| Disponibilité des services | Les services et fonctionnalités nécessaires sont-ils proposés dans cette Région ? |
| Tarification | Les prix varient d'une Région à l'autre |

> **Piège d'examen.** Une zone de disponibilité n'est ni un centre de données unique ni une Région. « Zone géographique distincte », c'est une Région ; « un ou plusieurs centres de données distincts avec alimentation et réseau redondants », c'est une AZ ; « met en cache le contenu près des utilisateurs », c'est un emplacement périphérique.

<!-- section: high-availability | objectives: 3.2.2, 3.2.6, 3.2.7 -->
## Haute disponibilité avec plusieurs zones de disponibilité

La **haute disponibilité** signifie qu'une charge de travail continue de fonctionner quand un composant tombe en panne. Les AZ sont physiquement séparées, avec leur propre alimentation, leur refroidissement et leur réseau : elles **ne partagent pas de points d'échec uniques**. Un incendie, une inondation ou une coupure de courant touche au plus une AZ. AWS recommande de déployer les applications dans plusieurs AZ pour qu'elles restent disponibles si une AZ tombe en panne.

| Couche | Comment utiliser plusieurs AZ |
| --- | --- |
| Serveurs web et d'application | Instances EC2 dans un groupe Auto Scaling réparti sur au moins deux AZ, derrière un équilibreur de charge Elastic Load Balancing qui n'envoie le trafic qu'aux cibles saines |
| Base de données relationnelle | Amazon RDS Multi-AZ : une instance de secours dans une autre AZ, basculement automatique |
| Stockage d'objets | Amazon S3 stocke automatiquement les données dans au moins trois AZ (sauf les classes One Zone) |
| Stockage de fichiers | Les systèmes de fichiers régionaux Amazon EFS stockent les données dans plusieurs AZ |
| Sans serveur | AWS Lambda, Amazon DynamoDB et Amazon SQS s'exécutent automatiquement dans plusieurs AZ de la Région |

> **Conseil d'examen.** « Hautement disponible » avec « une seule Région » signifie plusieurs zones de disponibilité. Une deuxième Région n'est nécessaire que si l'énoncé parle d'une panne régionale, d'utilisateurs sur un autre continent ou de résidence des données.

<!-- section: multiple-regions | objectives: 3.2.3, 3.2.8 -->
## Quand utiliser plusieurs Régions

| Raison | Exemple |
| --- | --- |
| **Reprise après sinistre** | Des copies des données et de l'infrastructure dans une deuxième Région, prêtes si la Région principale devient indisponible |
| **Continuité d'activité** | L'entreprise doit continuer de fonctionner pendant un événement régional |
| **Faible latence pour les utilisateurs finaux** | Des utilisateurs sur plusieurs continents sont servis depuis la Région la plus proche |
| **Souveraineté des données** | Les données clients d'un pays doivent être stockées dans une Région de ce pays |

Stratégies de reprise après sinistre, de la moins chère et la plus lente à la plus chère et la plus rapide :

| Stratégie | La deuxième Région contient |
| --- | --- |
| Sauvegarde et restauration (backup and restore) | Uniquement des sauvegardes ; l'infrastructure est redéployée en cas de besoin |
| Veilleuse (pilot light) | Les données répliquées et l'infrastructure de base ; les serveurs sont démarrés au basculement |
| Secours semi-actif (warm standby) | Une copie réduite en fonctionnement, qui peut recevoir du trafic immédiatement |
| Multisite actif/actif | Des copies complètes qui servent les utilisateurs dans chaque Région |

Services utiles : Amazon S3 Cross-Region Replication, tables globales DynamoDB, Aurora Global Database, copies interrégionales d'AWS Backup, AWS Elastic Disaster Recovery, routage par basculement de Route 53.

> **Piège d'examen.** Plusieurs Régions ajoutent du coût et de la complexité. Ne les choisissez pas pour la seule disponibilité : plusieurs AZ dans une Région protègent déjà contre la panne d'un centre de données.

<!-- section: edge-benefits | objectives: 3.2.4 -->
## Avantages des emplacements périphériques

- **Latence plus faible** : le contenu est servi depuis un emplacement proche de l'utilisateur plutôt que depuis la Région.
- **Moins de charge sur l'origine** : Amazon CloudFront met en cache le contenu statique et dynamique en périphérie.
- **Chemins plus rapides et plus fiables** : AWS Global Accelerator et S3 Transfer Acceleration font entrer le trafic sur le réseau mondial AWS à l'emplacement périphérique le plus proche.
- **Protection en périphérie** : Shield et WAF filtrent les attaques avant qu'elles n'atteignent l'application.
- **DNS rapide** : Route 53 répond aux requêtes depuis les emplacements périphériques.

> **Conseil d'examen.** « Diffuser des vidéos ou un site web aux utilisateurs du monde entier avec une faible latence », c'est CloudFront avec les emplacements périphériques, et non une copie de l'application dans chaque Région.

<!-- section: key-points -->
## Points clés

- Région : zone géographique distincte, isolée. AZ : un ou plusieurs centres de données, alimentation et réseau indépendants, plusieurs par Région. Emplacement périphérique : cache et point d'entrée réseau dans de nombreuses villes.
- Les AZ ne partagent pas de points d'échec uniques : répartissez instances, équilibreurs de charge et bases de données sur au moins deux AZ pour la haute disponibilité.
- Choisissez une Région selon la conformité, la latence, la disponibilité des services et le prix ; les données ne quittent pas une Région sauf si vous les copiez.
- Plusieurs Régions : reprise après sinistre, continuité d'activité, faible latence mondiale, souveraineté des données.
- Emplacements périphériques : CloudFront, Route 53, Global Accelerator, Shield et WAF près des utilisateurs.
