La reprise après sinistre (DR) prépare une charge de travail à survivre à la perte d'une Région entière, à une base de données corrompue ou à un compartiment supprimé. Les questions SAA-C03 donnent un objectif de point de récupération, un objectif de temps de récupération et un budget, et demandent la stratégie de reprise, le service de réplication, le mécanisme de basculement ou la conception de sauvegarde qui les respecte au moindre coût.

<!-- section: global-infrastructure | objectives: 2.2.1 -->
## Infrastructure mondiale AWS et Route 53

| Composant | Ce que c'est | Usage en conception |
| --- | --- | --- |
| Région | Une zone géographique distincte avec son propre ensemble isolé de services | Choisie selon la résidence des données, la latence vers les utilisateurs, la disponibilité des services et le prix ; une deuxième Région pour la reprise |
| Zone de disponibilité | Un ou plusieurs centres de données d'une Région ; au moins trois par Région | Haute disponibilité au sein d'une Région (chapitre précédent) |
| Zone locale (Local Zone) | Infrastructure AWS dans une agglomération, rattachée à une Région parente | Latence de l'ordre de la milliseconde pour les utilisateurs de cette ville |
| Zone Wavelength | Infrastructure AWS au sein des réseaux 5G des opérateurs télécoms | Latence ultra-faible pour les appareils mobiles |
| AWS Outposts | Racks ou serveurs AWS dans votre centre de données | Faible latence vers les systèmes sur site, traitement local des données |
| Emplacement périphérique | Points de présence CloudFront et Global Accelerator, DNS Route 53 | Mise en cache du contenu et entrée réseau près des utilisateurs |

La plupart des services sont **régionaux** : les données restent dans la Région choisie, sauf si vous les répliquez. Quelques-uns sont mondiaux (IAM, Route 53, CloudFront, Global Accelerator).

Amazon Route 53 est le service DNS qui oriente les utilisateurs entre les Régions :

| Politique de routage | Comportement |
| --- | --- |
| Simple | Un enregistrement, aucun choix selon l'état |
| Basculement (failover) | Actif-passif : l'enregistrement secondaire ne répond que si le principal est défectueux |
| Pondérée (weighted) | Répartition par pourcentage (bleu/vert, migration progressive) |
| Latence (latency) | La Région offrant la latence la plus faible pour l'utilisateur |
| Géolocalisation (geolocation) | Selon le continent, le pays ou l'État américain de l'utilisateur (droits sur le contenu, conformité) |
| Géoproximité (geoproximity) | Selon la distance entre utilisateurs et ressources, avec un biais pour déplacer le trafic |
| Basée sur l'IP (IP-based) | Selon la plage d'adresses IP source de l'utilisateur |
| Réponse à valeurs multiples (multivalue answer) | Jusqu'à huit enregistrements sains choisis au hasard |

Les **vérifications de l'état** surveillent un point de terminaison, d'autres vérifications (vérification calculée) ou une alarme CloudWatch. Pour les enregistrements d'alias vers des ressources AWS (un équilibreur de charge, une distribution CloudFront), activez **Évaluer l'état de la cible** (Evaluate Target Health) au lieu de créer une vérification distincte. Toute politique autre que le basculement donne un routage **actif-actif** entre les enregistrements sains.

> **Piège d'examen.** Le routage par latence envoie les utilisateurs vers la Région la plus rapide mais ne contrôle pas la résidence des données ; « les utilisateurs en Allemagne doivent être servis depuis la Région de Francfort » relève du routage par géolocalisation.

<!-- section: rpo-rto-strategies | objectives: 2.2.4 -->
## RPO, RTO et les quatre stratégies de reprise

- **Objectif de point de récupération (RPO)** : la perte de données maximale acceptable, mesurée en temps (« nous pouvons perdre au plus 5 minutes de commandes »). Il détermine la fréquence des sauvegardes ou de la réplication.
- **Objectif de temps de récupération (RTO)** : la durée maximale acceptable pour rétablir le service après le sinistre. Il détermine ce qui tourne déjà dans la Région de reprise.

| Stratégie | Ce qui tourne dans la Région de reprise | RPO | RTO | Coût |
| --- | --- | --- | --- | --- |
| Sauvegarde et restauration (backup and restore) | Uniquement des sauvegardes (instantanés, AMI, copies AWS Backup, copies S3) ; l'infrastructure est redéployée par IaC au basculement | Le temps écoulé depuis la dernière sauvegarde | Le plus long : restaurer les données et tout déployer | Le plus faible |
| Environnement de veille (pilot light) | Données répliquées en continu (réplica de base de données, réplication S3) ; infrastructure centrale déployée, serveurs d'application arrêtés ou non déployés | Faible (réplication continue) | Démarrer ou déployer les serveurs, monter en charge, basculer le DNS | Faible |
| Secours semi-automatique (warm standby) | Une copie réduite mais entièrement fonctionnelle, capable de prendre du trafic immédiatement | Faible | Court : monter en charge et déplacer le trafic | Plus élevé |
| Basculement actif/actif multisite (multi-site active/active) | La production complète dans deux Régions ou plus, qui servent toutes du trafic | Quasi nul (réplication asynchrone) | Quasi nul | Le plus élevé |

La différence testée à l'examen : l'**environnement de veille ne peut pas servir de requêtes** tant que les serveurs ne sont pas démarrés et mis à l'échelle ; le **secours semi-automatique peut servir à capacité réduite** immédiatement et n'a qu'à monter en charge. Une variante du multisite, la **veille active (hot standby)**, fait tourner la pleine capacité dans la deuxième Région sans lui envoyer de trafic.

> **Piège d'examen.** La réplication seule ne protège ni contre la corruption ni contre la suppression accidentelle : une table supprimée ou un fichier chiffré par un rançongiciel est répliqué aussi. Chaque stratégie a toujours besoin de sauvegardes à un instant donné.

<!-- section: choosing-dr | objectives: 2.2.18 -->
## Sélectionner la stratégie de reprise à partir des exigences

Choisissez la stratégie la moins chère dont le RPO et le RTO respectent tous deux l'exigence :

| Exigence de l'énoncé | Stratégie |
| --- | --- |
| RPO et RTO de quelques heures ou d'une journée, coût le plus faible, outil interne | Sauvegarde et restauration avec copies inter-Régions et modèles CloudFormation |
| RPO de quelques minutes ou moins, RTO de quelques dizaines de minutes, coût contenu | Environnement de veille : Aurora Global Database ou réplica en lecture inter-Régions, réplication S3, AMI, serveurs lancés au basculement |
| RPO de quelques secondes, RTO de quelques minutes, doit accepter du trafic immédiatement | Secours semi-automatique : un petit groupe Auto Scaling déjà en cours d'exécution dans la deuxième Région |
| RPO et RTO quasi nuls, utilisateurs dans plusieurs Régions, budget non contraignant | Actif/actif multisite : tables globales DynamoDB ou Aurora Global Database avec transfert d'écriture, routage par latence |
| Se protéger contre la suppression et les rançongiciels | Sauvegardes dans un compte et une Région distincts avec AWS Backup Vault Lock, en plus de toute réplication |

Vérifiez aussi : l'infrastructure est définie sous forme de code (CloudFormation, StackSets) pour être recréée à l'identique ; les AMI, images de conteneur (réplication ECR), secrets et clés existent dans la Région de reprise ; les quotas y sont déjà augmentés ; le plan est testé par des exercices réguliers.

> **Conseil d'examen.** Quand deux stratégies respectent le RPO et le RTO, le qualificatif « le PLUS rentable » désigne la plus légère. Quand l'énoncé dit « l'application doit continuer à servir les utilisateurs pendant une panne régionale avec un temps d'arrêt minimal », il faut un secours semi-automatique ou de l'actif/actif ; l'environnement de veille demande d'abord de démarrer les serveurs.

<!-- section: failover | objectives: 2.2.6 -->
## Stratégies et mécanismes de basculement

Le basculement déplace le trafic (et le rôle d'écriture des données) vers le site de reprise ; la **restauration automatique** (failback) le ramène une fois le site principal réparé, généralement après une resynchronisation des données en sens inverse.

| Mécanisme | Comment il bascule |
| --- | --- |
| Routage de basculement Route 53 avec vérifications de l'état | Les réponses DNS passent à l'enregistrement secondaire quand le principal est défectueux ; les clients suivent après le TTL de l'enregistrement |
| AWS Global Accelerator | Les IP anycast statiques ne changent pas ; les nouvelles connexions vont vers des points de terminaison sains d'une autre Région, sans problème de cache DNS ; les cadrans de trafic (traffic dials) déplacent un pourcentage par Région |
| Amazon Application Recovery Controller (ARC) | Les contrôles de routage basculent le DNS entre Régions sous votre contrôle ; le déplacement zonal (zonal shift) et le déplacement zonal automatique (zonal autoshift) éloignent le trafic d'une AZ dégradée ; Region switch orchestre des plans de reprise multi-Régions |
| Groupes d'origines CloudFront | Une requête qui échoue sur l'origine principale (codes d'état choisis, délai dépassé) est renvoyée vers la secondaire ; GET, HEAD et OPTIONS uniquement |
| Aurora Global Database | La **permutation** (switchover, planifiée, sans perte de données) ou le **basculement** (failover), en cas de panne imprévue, promeut un cluster d'une Région secondaire en principal |
| Réplica en lecture RDS inter-Régions | Promouvoir le réplica en instance autonome accessible en écriture (manuel), puis rediriger l'application |
| Tables globales DynamoDB | Rien à promouvoir : chaque réplica accepte les écritures ; rediriger le trafic vers une autre Région |

L'actif-passif (une Région sert, l'autre attend) est plus simple et moins cher ; l'actif-actif (toutes les Régions servent) exige des données acceptant les écritures partout (tables globales DynamoDB, transfert d'écriture Aurora) et offre le RTO le plus court.

> **Piège d'examen.** Le basculement Route 53 dépend du respect des TTL DNS par les clients. « Basculer en quelques secondes même pour des clients qui mettent le DNS en cache » ou « des adresses IP fixes » oriente vers Global Accelerator.

<!-- section: multi-region-services | objectives: 2.2.14 -->
## Services AWS pour la résilience multi-AZ et multi-Région

| Couche | Multi-AZ (au sein d'une Région) | Multi-Région |
| --- | --- | --- |
| DNS et point d'entrée | Elastic Load Balancing sur plusieurs AZ | Politiques de routage Route 53, Global Accelerator, CloudFront |
| Calcul | Groupe Auto Scaling sur plusieurs AZ, services ECS et Lambda répartis sur plusieurs AZ | AMI copiées dans l'autre Région, réplication ECR, infrastructure via CloudFormation StackSets |
| Base de données relationnelle | RDS Multi-AZ, réplicas Aurora | Aurora Global Database, réplicas en lecture RDS inter-Régions, sauvegardes automatisées inter-Régions |
| NoSQL | DynamoDB (intégré) | Tables globales DynamoDB |
| Stockage objet | Classes S3 Standard (intégré) | Réplication S3 entre Régions (CRR) |
| Stockage de fichiers | EFS régional, FSx Multi-AZ | Réplication EFS, copies inter-Régions AWS Backup |
| Secrets et clés | Intégré | Secrets réplicas Secrets Manager, clés multi-Régions AWS KMS |

Faits essentiels :

- **Aurora Global Database** : une Région principale et jusqu'à 10 Régions secondaires en lecture seule, répliquées sur une infrastructure dédiée avec une latence généralement inférieure à une seconde ; une Région secondaire peut être promue en moins d'une minute. Le transfert d'écriture (write forwarding) permet aux clusters secondaires d'envoyer les écritures au principal.
- **Tables globales DynamoDB** : actif-actif, chaque réplica est accessible en lecture et en écriture, sans modification de l'application. La cohérence éventuelle multi-Région (par défaut) résout les conflits selon la règle « le dernier rédacteur l'emporte » ; la cohérence forte multi-Région (même compte) offre un RPO nul.
- **Réplication S3** : la gestion des versions est requise sur les deux compartiments ; la réplication s'applique aux nouveaux objets (S3 Batch Replication copie les objets existants). **S3 Replication Time Control** réplique 99,9 % des objets en moins de 15 minutes, avec métriques et notifications.
- **Réplication EFS** : un système de fichiers réplica en lecture seule, avec un RPO de 15 minutes pour la plupart des systèmes de fichiers ; le basculement consiste à rendre le réplica accessible en écriture.

```json
{
  "Role": "arn:aws:iam::111122223333:role/s3-replication-role",
  "Rules": [{
    "ID": "dr-copy",
    "Status": "Enabled",
    "Priority": 1,
    "Filter": {},
    "DeleteMarkerReplication": { "Status": "Disabled" },
    "Destination": {
      "Bucket": "arn:aws:s3:::example-dr-bucket-eu-central-1",
      "ReplicationTime": { "Status": "Enabled", "Time": { "Minutes": 15 } },
      "Metrics": { "Status": "Enabled", "EventThreshold": { "Minutes": 15 } }
    }
  }]
}
```

> **Conseil d'examen.** « Base de données avec un RPO d'environ 1 seconde et un RTO d'environ 1 minute entre Régions, compatible MySQL ou PostgreSQL » désigne Aurora Global Database. « Des utilisateurs de plusieurs Régions écrivent dans la même table avec une latence de l'ordre de la milliseconde » désigne les tables globales DynamoDB.

<!-- section: storage-durability | objectives: 2.2.11 -->
## Durabilité et réplication des options de stockage

| Stockage | Où sont conservées les données | Durabilité et remarques |
| --- | --- | --- |
| S3 Standard, Intelligent-Tiering, Standard-IA, classes Glacier | Au moins trois AZ | Conçu pour 99,999999999 % (11 neuf) ; survit à la perte d'une AZ |
| S3 One Zone-IA | Une AZ | Perdu si cette AZ est détruite ; uniquement pour des données recréables ou des copies secondaires |
| Volume EBS | Répliqué au sein d'une AZ | 99,8 à 99,9 % (gp3, gp2, io1, st1) ; 99,999 % pour io2 Block Express ; à protéger par des instantanés |
| Instantané EBS | Stocké au niveau régional dans S3, incrémentiel | Survit à la perte d'une AZ ; à copier dans une autre Région pour la reprise |
| Stockage d'instance | Les disques locaux de l'hôte | Perdu à l'arrêt ou à la résiliation de l'instance, ou en cas de panne du disque |
| EFS régional / One Zone | Plusieurs AZ / une AZ | Régional pour la production ; One Zone est moins cher mais zonal |
| FSx | Déploiement mono-AZ ou Multi-AZ (Windows File Server, ONTAP, OpenZFS) | Multi-AZ ajoute un serveur de fichiers de secours dans une autre AZ |

> **Piège d'examen.** « Onze neuf » mesure la durabilité (ne pas perdre de données), pas la disponibilité. S3 One Zone-IA a la même conception de durabilité au sein de son AZ mais ne survit pas à la perte de l'AZ.

<!-- section: backups | objectives: 2.2.17 -->
## Sauvegardes pour la durabilité et la disponibilité des données

| Service | Protection native |
| --- | --- |
| Amazon RDS | Sauvegardes automatisées avec restauration à un instant dans le passé, conservation de 0 à 35 jours (0 les désactive ; 7 jours par défaut dans la console) ; instantanés manuels conservés jusqu'à leur suppression ; copie d'instantanés et réplication des sauvegardes automatisées vers une autre Région |
| Aurora | Sauvegardes continues avec restauration à un instant dans le passé, instantanés de cluster |
| DynamoDB | Restauration à un instant dans le passé (PITR, n'importe quelle seconde des 35 derniers jours), sauvegardes à la demande |
| EBS | Instantanés incrémentiels, automatisés par Amazon Data Lifecycle Manager, copiés entre Régions |
| S3 | Gestion des versions (récupérer des objets écrasés ou supprimés), Object Lock (conservation WORM), réplication, suppression MFA (MFA delete) |
| EFS, FSx | Sauvegardes automatiques via AWS Backup, réplication |

**AWS Backup** centralise l'ensemble :

- **Plans de sauvegarde** : fréquence, conservation, cycle de vie vers le stockage à froid, affectés aux ressources par balise.
- **Coffres de sauvegarde** : chiffrés avec une clé KMS, politiques d'accès ; **Vault Lock** impose une écriture unique et des lectures multiples (WORM), si bien que personne, administrateurs compris, ne peut supprimer les sauvegardes ni raccourcir leur conservation.
- **Copies inter-Régions et inter-comptes** dans le plan, avec des politiques de sauvegarde AWS Organizations appliquées à tous les comptes.
- **AWS Backup Audit Manager** rend compte de la conformité aux contrôles de sauvegarde.

> **Conseil d'examen.** « Les sauvegardes doivent survivre à un compte administrateur compromis ou à un rançongiciel » désigne des copies AWS Backup vers un coffre d'un compte distinct avec Vault Lock. « Restaurer la base de données dans l'état où elle était 10 minutes avant un déploiement défectueux » désigne la restauration à un instant dans le passé, pas un réplica en lecture.

<!-- section: quotas-standby | objectives: 2.2.10 -->
## Quotas de service et limitation dans l'environnement de secours

Les quotas sont définis **par compte et par Région** : la Région de reprise démarre avec les valeurs par défaut, quoi que vous ayez augmenté en production. Un basculement qui a besoin de 400 vCPU d'instances à la demande, de 3 000 exécutions Lambda simultanées ou de 20 instances RDS échoue si ces quotas n'y ont pas été augmentés au préalable.

- Augmentez les quotas dans la Région de reprise **avant** le sinistre, au niveau dont la production a besoin, en gardant une marge pour le basculement.
- Utilisez **Service Quotas** pour consulter les quotas et demander des augmentations ; des alarmes CloudWatch sur l'utilisation préviennent avant qu'un quota soit atteint ; Trusted Advisor vérifie les quotas.
- Les **modèles de demande de quota** appliquent automatiquement jusqu'à 10 augmentations de quota à chaque nouveau compte créé dans l'organisation (toutes les fonctionnalités activées).
- Les **réservations de capacité à la demande** (On-Demand Capacity Reservations) réservent de la capacité d'instance dans une AZ précise aussi longtemps que nécessaire, facturées au tarif à la demande qu'elle soit utilisée ou non ; combinez-les avec des Savings Plans ou des instances réservées régionales pour obtenir une remise. Utilisez-les quand le RTO ne tolère pas une erreur de capacité insuffisante.
- La limitation (HTTP 429, `ThrottlingException`) est un quota sur les débits de requêtes : réessayez avec backoff exponentiel et jitter, mettez en tampon avec SQS, mettez en cache, ou demandez un débit plus élevé.

```bash
# Check and raise the On-Demand Standard instances vCPU quota in the DR Region
aws service-quotas get-service-quota --region eu-central-1 \
  --service-code ec2 --quota-code L-1216C47A

aws service-quotas request-service-quota-increase --region eu-central-1 \
  --service-code ec2 --quota-code L-1216C47A --desired-value 512
```

> **Piège d'examen.** Un secours semi-automatique ou un environnement de veille jamais testé à pleine échelle échoue souvent sur les quotas. « Garantir que la Région de reprise peut monter jusqu'à la capacité de production » signifie augmenter ses quotas de service (et, si nécessaire, réserver de la capacité), pas seulement copier les AMI.

<!-- section: key-points -->
## Points clés

- RPO = perte de données acceptable (fréquence de sauvegarde ou de réplication) ; RTO = interruption acceptable (ce qui tourne déjà).
- Sauvegarde et restauration (la moins chère, la plus lente), environnement de veille (données actives, serveurs arrêtés), secours semi-automatique (petite copie qui sert), actif/actif (complet, quasi nul).
- Choisir la stratégie la moins chère qui respecte à la fois le RPO et le RTO ; la réplication ne remplace jamais les sauvegardes à un instant donné.
- Routage de basculement et vérifications de l'état Route 53, Global Accelerator pour un basculement rapide par IP, ARC pour un basculement contrôlé, groupes d'origines CloudFront pour les requêtes GET.
- Aurora Global Database (décalage inférieur à une seconde, jusqu'à 10 Régions secondaires), tables globales DynamoDB (actif-actif), CRR S3 avec RTC (99,9 % en 15 minutes), réplication EFS.
- S3 stocke les données sur au moins trois AZ, sauf One Zone-IA ; EBS réside dans une AZ ; le stockage d'instance est éphémère.
- Plans AWS Backup, copies inter-Régions et inter-comptes, Vault Lock contre la suppression.
- Les quotas sont par Région : les augmenter à l'avance dans la Région de reprise ; les réservations de capacité garantissent les instances.
