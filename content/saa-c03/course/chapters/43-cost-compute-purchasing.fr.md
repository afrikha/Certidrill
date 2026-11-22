Une même capacité EC2 peut coûter des montants très différents selon la façon dont elle est achetée et l'endroit où elle s'exécute. Les questions d'examen décrivent une charge de travail (stable, en pics, interruptible, sous licence, en périphérie, sur site) et demandent l'option d'achat, le service de calcul, l'emplacement ou l'outil de coûts qui répond à l'exigence de la façon la plus rentable.

<!-- section: purchasing-options | objectives: 4.2.4 -->
## Les options d'achat EC2

| Option | Mode de paiement | Choisissez-la quand |
| --- | --- | --- |
| On-Demand | À la seconde, sans engagement | Charges courtes, imprévisibles ou nouvelles ; la base tant que l'usage n'est pas connu |
| Savings Plans | Engagement en USD par heure sur 1 ou 3 ans | Usage stable, avec la liberté de changer de famille d'instances, de Région ou de service |
| Instances réservées | Engagement sur une configuration d'instance pendant 1 ou 3 ans | Usage stable d'un type d'instance connu ; les RI zonales réservent aussi de la capacité |
| Instances Spot | Prix Spot courant, jusqu'à 90 % sous On-Demand, interruptibles | Tâches tolérantes aux pannes et flexibles : batch, CI, big data, niveaux web sans état |
| Dedicated Hosts | Un serveur physique entier | Licences existantes par socket, par cœur ou par VM ; visibilité au niveau de l'hôte |
| Dedicated Instances | Instances sur du matériel à locataire unique | Conformité exigeant une isolation matérielle, sans gestion d'hôte |
| Capacity Reservations | Prix On-Demand pour une capacité réservée dans une zone, utilisée ou non | Capacité garantie pour un événement critique ou une reprise après sinistre, sans durée imposée |
| Capacity Blocks | Grappe d'instances GPU réservée pour une période future | Courts entraînements de ML qui exigent beaucoup de GPU à la fois |

Les options de paiement des Savings Plans et des instances réservées sont All Upfront, Partial Upfront et No Upfront : plus vous payez d'avance et plus la durée est longue, plus la remise est importante.

> **Piège d'examen.** Les Savings Plans et les instances réservées régionales donnent une remise, pas de la capacité. « Garantir de la capacité dans une zone de disponibilité précise » exige une instance réservée zonale ou une On-Demand Capacity Reservation ; une Capacity Reservation peut se combiner avec un Savings Plan pour obtenir les deux.

<!-- section: savings-plans-reserved | objectives: 4.2.4 -->
## Savings Plans et instances réservées

| Plan | Remise maximale | S'applique à | Flexibilité |
| --- | --- | --- | --- |
| Compute Savings Plans | Jusqu'à 66 % | EC2, Fargate, Lambda | Toute famille, taille, Région, OS, location (tenancy) |
| EC2 Instance Savings Plans | Jusqu'à 72 % | EC2 | Une famille dans une Région ; toute taille, OS, location |
| SageMaker AI Savings Plans | Jusqu'à 64 % | SageMaker AI | Toute famille, taille, Région, composant |
| Database Savings Plans | Jusqu'à 35 % | Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS, OpenSearch Service | Tout moteur, famille, taille, zone, Région, usage sans serveur ; 1 an, No Upfront |

Instances réservées :

| Attribut | RI Standard | RI Convertible |
| --- | --- | --- |
| Remise | Plus forte | Plus faible |
| Échange contre une autre famille, un autre OS ou une autre location | Non | Oui |
| Modification (zone, portée, taille dans la famille) | Oui | Oui |
| Revente sur la place de marché des instances réservées | Oui | Non |

| Portée | Capacité réservée | Flexibilité de zone | Flexibilité de taille |
| --- | --- | --- | --- |
| RI régionale | Non | Toute zone de la Région | Dans la famille (Linux/Unix, location par défaut) |
| RI zonale | Oui, dans cette zone | Non | Non |

Règles de décision :

- La charge passera d'EC2 à Fargate ou Lambda, ou changera de Région : **Compute Savings Plans**.
- Elle reste sur une famille d'instances dans une Région, remise maximale : **EC2 Instance Savings Plans** (ou RI Standard).
- Le type d'instance peut changer pendant la durée mais vous voulez une RI : **RI Convertible**.
- L'engagement pourrait devenir inutile avant son terme : **RI Standard** (revendable) ou durée d'un an.
- Par défaut, les remises sont partagées entre tous les comptes de la famille de facturation consolidée d'une organisation ; le partage peut être désactivé par compte.

> **Conseil d'examen.** Engagez-vous seulement sur la base stable (l'usage minimal observé dans Cost Explorer) et couvrez les pics avec On-Demand ou Spot. Un engagement excessif fait perdre de l'argent, car l'engagement non utilisé est quand même facturé.

<!-- section: spot-strategies | objectives: 4.2.4 -->
## Utiliser les instances Spot en toute sécurité

- EC2 envoie un **avis d'interruption deux minutes avant**, et plus tôt une **recommandation de rééquilibrage d'instance EC2** quand le risque augmente. Le comportement d'interruption peut être résilier, arrêter ou mettre en veille prolongée.
- Pas d'enchères : vous payez le prix Spot courant, qui évolue progressivement avec l'offre et la demande.
- Diversifiez : demandez plusieurs types et tailles d'instances dans plusieurs zones de disponibilité. Dans les groupes Auto Scaling et EC2 Fleet, utilisez la stratégie d'allocation **`price-capacity-optimized`** (recommandée) ; `lowest-price` présente le risque d'interruption le plus élevé.
- Une **politique d'instances mixtes** (mixed instances policy) dans un groupe Auto Scaling conserve une capacité de base On-Demand (couverte par des Savings Plans) et complète avec du Spot.
- **Fargate Spot** exécute des tâches ECS tolérantes aux interruptions jusqu'à 70 % sous le prix Fargate.

| Charge de travail | Spot ? |
| --- | --- |
| File de rendu d'images, tâches batch avec points de reprise, agents de build CI | Oui |
| Niveau web sans état derrière un équilibreur de charge, avec une base On-Demand | Oui, pour la part au-dessus de la base |
| Base de données principale unique, longue transaction sans point de reprise | Non |
| Tâche qui doit finir à une échéance fixe sans marge pour réessayer | Non |

> **Piège d'examen.** Spot n'est la réponse la moins chère que si l'énoncé accepte les interruptions (« peut être relancée », « sans état », « calendrier flexible »). S'il dit « ne peut pas être interrompue », choisissez On-Demand avec des Savings Plans ou des instances réservées.

<!-- section: compute-services | objectives: 4.2.12 -->
## Choisir un service de calcul rentable

| Service | Facturation | Usage idéal | Limites à retenir |
| --- | --- | --- | --- |
| AWS Lambda | Requêtes plus GB-secondes de durée ; rien au repos | Traitement événementiel, en pics ou à faible volume ; code d'intégration | Délai d'expiration maximal de 30 minutes sur la page actuelle des quotas Lambda (des pages plus anciennes et la FAQ indiquent encore 15 minutes ; 90 minutes pour certains appels de Lambda Managed Instances), mémoire de 128 Mo à 10 240 Mo |
| AWS Fargate (ECS, EKS) | vCPU et mémoire à la seconde (1 minute minimum) | Conteneurs sans gestion de serveurs, charge variable | Vous payez la taille de la tâche même sous-utilisée ; Fargate Spot pour les tâches interruptibles |
| Amazon EC2 | À la seconde d'instance, avec toutes les options d'achat | Usage stable et élevé ; matériel particulier (GPU, NVMe local) ; contrôle de l'OS ; licences | Vous gérez les correctifs et la capacité |
| ECS ou EKS sur EC2 | Instances EC2 qui hébergent les conteneurs | Grandes flottes de conteneurs stables et densément regroupées | Vous payez la capacité inutilisée du cluster |

Règles pratiques :

- Inactif la plupart du temps ou appelé quelques fois par heure : **Lambda** (aucun coût au repos). Une tâche qui dure des heures ne peut pas être une fonction Lambda : utilisez Fargate, AWS Batch ou EC2.
- Conteneurs à charge imprévisible, sans envie de gérer des hôtes : **Fargate**. Une flotte stable et très utilisée coûte moins cher sur EC2 avec des Savings Plans ou du Spot.
- Les instances **Graviton** (Arm), ainsi que Fargate et Lambda sur Arm, offrent en général un meilleur rapport prix/performances pour du code qui s'exécute sur Arm.
- **AWS Batch** planifie des tâches batch sur EC2 (Spot compris) ou Fargate, sans frais supplémentaires pour Batch lui-même.
- Les Compute Savings Plans couvrent les trois services : une migration d'EC2 vers Lambda ou Fargate conserve la remise.

> **Piège d'examen.** « Avec le MOINS de charge opérationnelle » favorise Lambda ou Fargate plutôt qu'EC2, même si EC2 est un peu moins cher ; « le PLUS rentable » pour une charge stable 24 h/24 favorise en général EC2 avec un engagement.

<!-- section: workload-availability | objectives: 4.2.3, 4.2.13 -->
## Disponibilité selon la classe de charge de travail et infrastructure globale

Ne payez la disponibilité que là où l'entreprise en a besoin :

| Aspect | Production | Hors production (dev, test, formation) |
| --- | --- | --- |
| Zones de disponibilité | Au moins deux, groupe Auto Scaling sur plusieurs zones, bases de données Multi-AZ | Souvent une seule zone, instance unique, base de données Single-AZ |
| Achat | Savings Plans ou RI pour la base, On-Demand ou Spot pour les pics | Spot ou On-Demand, sans engagement long |
| Calendrier | Toujours actif | Arrêté hors des heures ouvrées (Instance Scheduler on AWS démarre et arrête les instances EC2 et RDS balisées ; jusqu'à 70 % d'économie pour un usage limité aux heures de bureau) |
| Taille | Dimensionnée pour la pointe avec mise à l'échelle | Plus petite taille qui fonctionne, instances T à performances extensibles |

L'infrastructure globale influe sur le coût :

- **Les prix diffèrent selon les Régions.** Quand aucune exigence de latence, de résidence des données ou de disponibilité du service ne s'applique, une Région moins chère réduit le coût.
- Le **transfert de données** entre zones de disponibilité et entre Régions est facturé ; le trafic dans une même zone sur des adresses IP privées ne l'est pas. Des composants très bavards d'un système non critique peuvent partager une zone.
- Le transfert de données entrant depuis Internet est gratuit ; le transfert sortant vers Internet est facturé.
- Une instance RDS peut être arrêtée jusqu'à 7 jours (elle redémarre ensuite automatiquement) ; les heures d'instance s'arrêtent, le stockage reste facturé.

> **Conseil d'examen.** Des réglages Multi-AZ, multirégions et toujours actifs dans un environnement de développement sont une cible classique des réponses « réduire le coût » : les mauvaises options conservent une disponibilité de niveau production là où l'énoncé dit qu'elle n'est pas requise.

<!-- section: edge-hybrid | objectives: 4.2.5, 4.2.6 -->
## Calcul en périphérie et hybride

| Exigence | Service |
| --- | --- |
| Manipulation légère des requêtes ou réponses dans les emplacements périphériques CloudFront (en-têtes, redirections, réécritures d'URL, validation de JWT) | CloudFront Functions (JavaScript, moins d'une milliseconde, des millions de requêtes par seconde, coût le plus bas) |
| Logique en périphérie qui exige un accès réseau, le corps de la requête, des bibliothèques tierces, ou plus de temps et de mémoire | Lambda@Edge (Node.js, Python ; s'exécute pendant des secondes, jusqu'à 10 240 Mo de mémoire sur les événements d'origine) |
| Faible latence pour les utilisateurs d'une métropole sans Région proche | AWS Local Zones (extension d'une Région parente, prix différents) |
| Latence ultra-faible vers des appareils mobiles sur un réseau 5G d'opérateur | Zones AWS Wavelength (passerelle d'opérateur) |
| Services AWS sur site pour une faible latence vers les systèmes locaux, un traitement local des données ou la résidence des données | AWS Outposts (racks ou serveurs, reliés à la Région parente par un lien de service) |
| Exécuter ECS ou EKS sur vos propres serveurs | Amazon ECS Anywhere, Amazon EKS Anywhere |

- Le traitement en périphérie réduit le coût en répondant près de l'utilisateur (moins de charge sur l'origine et moins de transfert de données depuis l'origine) et en réduisant le volume de données renvoyé vers la Région.
- Outposts se commande avec une durée d'engagement et une option de paiement ; AWS le livre, le maintient et le met à jour. Ce n'est pas la réponse quand le seul objectif est de réduire le coût : on le choisit pour la latence, le traitement local ou la résidence des données.

> **Piège d'examen.** CloudFront Functions ne peut ni appeler le réseau ni lire le corps de la requête. Si le code en périphérie doit appeler une API externe ou une table DynamoDB, choisissez Lambda@Edge.

<!-- section: cost-tools | objectives: 4.2.1, 4.2.2 -->
## Fonctionnalités et outils de gestion des coûts pour le calcul

**Fonctionnalités**

- **Balises de répartition des coûts** (cost allocation tags) : les balises générées par AWS (préfixe `aws:`, par exemple `aws:createdBy`) et les balises définies par l'utilisateur doivent chacune être **activées** dans la console Billing and Cost Management par le compte de gestion (ou un compte autonome) avant d'apparaître dans Cost Explorer et les rapports. L'activation prend jusqu'à 24 heures ; un remplissage rétroactif (backfill) peut appliquer l'activation jusqu'à 12 mois en arrière.
- **Facturation consolidée** (AWS Organizations) : une seule facture pour tous les comptes membres, des paliers de tarification par volume agrégés, et des remises RI et Savings Plans partagées, sans frais supplémentaires.

**Outils**

| Besoin | Outil |
| --- | --- |
| Explorer et représenter les dépenses par service, compte, balise ; prévoir ; recommandations, utilisation et couverture des RI et Savings Plans ; recommandations de dimensionnement | AWS Cost Explorer (jusqu'à 13 mois d'historique, prévision sur 18 mois) |
| Alerter quand le coût réel ou prévu, l'usage, l'utilisation ou la couverture des RI ou Savings Plans franchit un seuil ; agir éventuellement | AWS Budgets (e-mail ou SNS ; les actions de budget appliquent une politique IAM ou une SCP, ou arrêtent des instances EC2 ou RDS) |
| Lignes les plus détaillées (horaires, par ressource, par balise) pour l'analyse dans Athena, Redshift ou Amazon Quick | AWS Cost and Usage Report, livré dans S3 via AWS Data Exports |
| Détecter automatiquement des dépenses inhabituelles par apprentissage automatique | AWS Cost Anomaly Detection |
| Dimensionner correctement instances, groupes Auto Scaling, fonctions Lambda et services Fargate | AWS Compute Optimizer |

```bash
aws ce get-cost-and-usage --time-period Start=2026-10-01,End=2026-11-01 \
  --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=TAG,Key=CostCenter
```

> **Piège d'examen.** AWS Budgets alerte et peut appliquer des contrôles, mais ne montre pas l'historique détaillé. « Prévenir l'équipe financière quand la prévision dépasse le budget » relève de Budgets ; « analyser en SQL les coûts horaires par ressource » relève du Cost and Usage Report avec Athena.

<!-- section: key-points -->
## Points clés

- Base stable : Savings Plans (Compute pour la flexibilité, EC2 Instance pour la remise la plus forte) ou instances réservées ; pics : On-Demand ou Spot.
- Remise n'est pas capacité : les RI zonales et les Capacity Reservations réservent de la capacité ; les Savings Plans et les RI régionales non.
- Spot : jusqu'à 90 % de remise, avis de deux minutes, diversification, `price-capacity-optimized`, uniquement pour des tâches tolérantes aux interruptions.
- Lambda pour un travail inactif ou en pics qui dure des minutes, pas des heures, Fargate pour des conteneurs sans hôtes, EC2 avec engagement pour un usage stable et élevé.
- Hors production : une zone, calendriers, Spot, petites tailles. Les prix varient selon les Régions ; le transfert entre zones et entre Régions est facturé.
- Périphérie : CloudFront Functions pour une logique légère, Lambda@Edge pour l'accès réseau ou au corps de requête ; Local Zones, Wavelength et Outposts pour la latence et les besoins sur site.
- Activez les balises de répartition des coûts ; Cost Explorer pour analyser, Budgets pour alerter, le Cost and Usage Report pour le détail, Cost Anomaly Detection pour les surprises.
