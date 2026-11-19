Une architecture évolutive conserve ses performances quand la charge augmente, et son coût quand la charge diminue. Les questions SAA-C03 donnent une charge de travail (une application web aux pics brutaux, une base de données très sollicitée en lecture, une audience mondiale, une application héritée à moderniser) et demandent comment la mettre à l'échelle : quelle méthode de mise à l'échelle, quel cache, quel service périphérique, conteneurs ou sans serveur, et quels types de stockage et de base de données conviennent.

<!-- section: scaling-models | objectives: 2.1.6, 2.1.18 -->
## Mise à l'échelle horizontale et verticale

| | Mise à l'échelle verticale (scale up) | Mise à l'échelle horizontale (scale out) |
| --- | --- | --- |
| Comment | Type d'instance ou classe de base de données plus grand | Plus d'instances, de tâches, de fonctions ou de partitions |
| Limite | La plus grande taille disponible | Pratiquement aucune si le composant est sans état |
| Interruption | Généralement un redémarrage (arrêt, changement de type, démarrage) | Aucune : ajout ou retrait de nœuds derrière un équilibreur de charge ou une file d'attente |
| Disponibilité | Toujours un seul nœud | Nœuds répartis sur plusieurs zones de disponibilité |
| Usage type | Instance principale d'une base relationnelle, application héritée non distribuable | Niveaux web et application, consommateurs de files d'attente, conteneurs |

Amazon EC2 Auto Scaling maintient un groupe entre un minimum et un maximum, remplace les instances défectueuses et redimensionne le groupe :

| Méthode | À utiliser quand |
| --- | --- |
| Suivi de cible (target tracking) | Maintenir une métrique proche d'une valeur (CPU moyen à 50 %, 1 000 requêtes par cible). La valeur par défaut recommandée |
| Mise à l'échelle par étapes (step) | Ajouter d'autant plus de capacité que l'alarme CloudWatch est dépassée |
| Mise à l'échelle simple (simple) | Un seul ajustement par alarme, puis un temps de stabilisation (comportement hérité) |
| Planifiée (scheduled) | Rythmes calendaires connus (heures ouvrées, traitement de fin de mois) |
| Prédictive (predictive) | Rythmes quotidiens ou hebdomadaires récurrents : la capacité est lancée en avance sur la prévision ; à combiner avec la mise à l'échelle dynamique |

```yaml
WebScalingPolicy:
  Type: AWS::AutoScaling::ScalingPolicy
  Properties:
    AutoScalingGroupName: !Ref WebAsg
    PolicyType: TargetTrackingScaling
    TargetTrackingConfiguration:
      PredefinedMetricSpecification:
        PredefinedMetricType: ALBRequestCountPerTarget
        ResourceLabel: !Join ["/", [!GetAtt Alb.LoadBalancerFullName, !GetAtt WebTg.TargetGroupFullName]]
      TargetValue: 1000
```

Stratégie de mise à l'échelle par composant :

| Composant | Comment il se met à l'échelle |
| --- | --- |
| Niveau web ou application sur EC2 | Groupe Auto Scaling sur plusieurs AZ derrière un équilibreur de charge |
| Consommateurs de file d'attente | Auto Scaling selon le backlog par instance (profondeur de la file divisée par le nombre d'instances), pas selon le CPU |
| Service Amazon ECS | Service Auto Scaling sur le nombre de tâches ; fournisseurs de capacité ou Fargate pour les hôtes |
| AWS Lambda | Automatique, par requête, dans la limite du quota de simultanéité du compte |
| Amazon DynamoDB | Mode de capacité à la demande (aucune planification) ou capacité provisionnée avec auto scaling |
| Amazon Aurora | Réplicas Aurora avec Aurora Auto Scaling pour les lectures ; Aurora Serverless v2 ajuste la capacité en ACU |
| Amazon RDS | Verticale (classe d'instance), réplicas en lecture pour les lectures, mise à l'échelle automatique du stockage pour le disque |
| Kinesis Data Streams | Mode de capacité à la demande, ou plus de partitions en mode provisionné |

> **Piège d'examen.** Une flotte de consommateurs qui traite une file d'attente SQS doit se mettre à l'échelle selon le nombre de messages en attente par instance. Le CPU reste stable quand les consommateurs attendent des E/S alors que le backlog grossit.

<!-- section: caching | objectives: 2.1.3 -->
## Stratégies de mise en cache

Un cache sert les lectures répétées depuis un stockage rapide proche du consommateur, ce qui réduit la latence et la charge sur l'origine. Choisissez la couche selon l'endroit où se produisent les lectures répétées :

| Couche | Service | Met en cache |
| --- | --- | --- |
| Périphérie, près des utilisateurs | Amazon CloudFront | Réponses HTTP statiques et dynamiques, avec des TTL par comportement de cache |
| API | Cache d'étape API Gateway (API REST) | Réponses d'une méthode d'API |
| Application et base de données | Amazon ElastiCache (Valkey, Redis OSS, Memcached), à nœuds ou sans serveur | Résultats de requêtes, objets calculés, données de session, classements |
| DynamoDB | DynamoDB Accelerator (DAX) | Lectures à cohérence éventuelle, en microsecondes |

Deux stratégies de remplissage, généralement combinées avec une durée de vie (TTL) :

| | Chargement différé (lazy loading, cache-aside) | Écriture simultanée (write-through) |
| --- | --- | --- |
| Comment | Lire le cache ; en cas d'échec (miss), lire la base de données et écrire le résultat dans le cache | Chaque écriture en base met aussi à jour le cache |
| Avantages | Seules les données demandées sont en cache ; un nœud défaillant ne provoque que des échecs de cache | Les données en cache ne sont jamais obsolètes |
| Inconvénients | Pénalité d'échec (trois allers-retours) ; données potentiellement obsolètes | Pénalité d'écriture ; met en cache des données jamais lues ; un nouveau nœud démarre vide |
| Ajouter un TTL | Limite l'obsolescence | Limite le renouvellement de données inutilisées |

Choix ElastiCache : Valkey ou Redis OSS pour la réplication, le basculement automatique Multi-AZ, la persistance, les types de données riches (ensembles triés, pub/sub) et le mode cluster pour la mise à l'échelle horizontale ; Memcached pour un cache simple multithread sans réplication. ElastiCache Serverless supprime le dimensionnement des nœuds.

> **Piège d'examen.** DAX est compatible avec l'API DynamoDB et ne demande que des modifications de code minimes, mais il sert des lectures à cohérence éventuelle ; il n'aide ni les lectures fortement cohérentes ni les tables à forte écriture. ElastiCache devant une base relationnelle exige du code applicatif pour lire et remplir le cache.

<!-- section: edge-accelerators | objectives: 2.1.7 -->
## Accélérateurs périphériques : CloudFront et Global Accelerator

| | Amazon CloudFront | AWS Global Accelerator | S3 Transfer Acceleration |
| --- | --- | --- | --- |
| Ce que c'est | Réseau de diffusion de contenu qui met en cache dans des emplacements périphériques | Deux adresses IP anycast statiques qui font entrer le trafic sur le réseau AWS à l'emplacement périphérique le plus proche | Chargements plus rapides vers un compartiment S3 sur de longues distances |
| Protocoles | HTTP et HTTPS (y compris WebSocket) | TCP et UDP | HTTPS vers S3 |
| Mise en cache | Oui | Non | Non |
| Origines ou points de terminaison | S3, ALB, EC2, tout serveur HTTP | ALB, NLB, instances EC2, adresses IP Elastic, dans une ou plusieurs Régions | Un compartiment S3 |
| Basculement | Groupes d'origines (principale et secondaire) | Les vérifications de l'état déplacent les nouvelles connexions vers des points de terminaison ou des Régions sains | Aucun |
| Énoncé type | Ressources statiques, vidéo, site web mondial, protection d'une origine S3 | Jeux, VoIP, IoT en UDP, clients exigeant des IP fixes, basculement multi-Région rapide | Des utilisateurs du monde entier chargent de gros fichiers vers un compartiment central |

Détails CloudFront : un **contrôle d'accès d'origine** (OAC, origin access control) permet à la seule distribution de lire un compartiment S3 privé ; les comportements de cache routent les chemins vers différentes origines avec leurs propres TTL ; CloudFront Functions (manipulation légère d'en-têtes et d'URL) et Lambda@Edge (logique plus lourde dans les caches périphériques régionaux) exécutent du code en périphérie ; AWS WAF et AWS Shield la protègent.

> **Conseil d'examen.** « Améliorer les performances d'une application TCP ou UDP mondiale » ou « des adresses IP statiques que les clients peuvent autoriser » désigne Global Accelerator. « Mettre en cache le contenu près des utilisateurs et réduire la charge de l'origine » désigne CloudFront. Global Accelerator ne met jamais en cache.

<!-- section: read-replicas | objectives: 2.1.15, 2.1.18 -->
## Quand utiliser des réplicas en lecture

Un **réplica en lecture** est une copie en lecture seule d'une base de données, mise à jour de façon asynchrone. Il met à l'échelle les **lectures**, pas les écritures.

| | Réplica en lecture RDS | RDS Multi-AZ | Réplica Aurora |
| --- | --- | --- | --- |
| Objectif | Mise à l'échelle des lectures, rapports, reprise après sinistre inter-Régions | Haute disponibilité | Mise à l'échelle des lectures et cible de basculement |
| Réplication | Asynchrone | Synchrone (instance de base de données) | Stockage partagé du cluster, décalage généralement inférieur à 100 ms |
| Lisible | Oui, point de terminaison propre | L'instance de secours n'est pas lisible (instance de base de données Multi-AZ) | Oui, via le point de terminaison de lecteur |
| Combien | Jusqu'à 15 par source | Une instance de secours | Jusqu'à 15 par cluster |
| Autre Région | Oui | Non | Aurora Global Database pour les autres Régions |
| Basculement | Promotion manuelle en instance autonome | Automatique | Promotion automatique |

Utilisez des réplicas en lecture quand :

- Les lectures dominent (catalogues, tableaux de bord) et le CPU ou les E/S de l'instance principale sont saturés par des requêtes SELECT.
- Les requêtes de rapport ou d'analyse ne doivent pas ralentir la production.
- Une copie doit exister dans une autre Région pour des lectures locales ou la reprise après sinistre (promue si la Région source tombe en panne).

> **Piège d'examen.** Un réplica en lecture ne corrige pas un goulot d'étranglement en écriture et n'apporte pas de basculement automatique. L'application doit aussi envoyer ses lectures au point de terminaison du réplica (ou au point de terminaison de lecteur Aurora), ce qui est une modification de configuration ou de code.

<!-- section: storage-types | objectives: 2.1.13, 2.1.22 -->
## Types de stockage : objet, fichier et bloc

| | Objet | Fichier | Bloc |
| --- | --- | --- | --- |
| Service | Amazon S3 | Amazon EFS, Amazon FSx | Amazon EBS, stockage d'instance |
| Accès | API HTTPS, objets entiers par clé | Système de fichiers partagé (NFS, SMB) monté par de nombreux clients | Volume brut attaché à une instance, formaté par son système d'exploitation |
| Échelle | Pratiquement illimitée | EFS s'agrandit et se réduit automatiquement ; FSx est provisionné | Taille fixe par volume, redimensionnable |
| Données types | Contenu web statique, sauvegardes, lacs de données, médias | Contenu partagé, répertoires personnels, partages de fichiers migrés tels quels | Volumes de démarrage, bases de données, données transactionnelles à faible latence |

Choisir parmi les stockages fichier et bloc :

| Exigence | Service |
| --- | --- |
| Système de fichiers POSIX partagé pour des instances Linux, des conteneurs ou Lambda sur plusieurs AZ | Amazon EFS |
| Partages SMB Windows intégrés à Active Directory | Amazon FSx for Windows File Server |
| Calcul haute performance ou entraînement ML, latence inférieure à la milliseconde, lié à S3 | Amazon FSx for Lustre |
| Multiprotocole (NFS, SMB, iSCSI), fonctionnalités NetApp comme les instantanés et SnapMirror | Amazon FSx for NetApp ONTAP |
| Migrer des serveurs de fichiers ZFS | Amazon FSx for OpenZFS |
| Stockage en mode bloc persistant pour une instance | Amazon EBS (gp3 à usage général, io2 Block Express pour les IOPS et la durabilité les plus élevées, st1/sc1 HDD pour le débit ou les données froides) |
| Espace temporaire très rapide, perdu à l'arrêt de l'instance | Stockage d'instance (instance store) |

> **Piège d'examen.** Un volume EBS réside dans une seule zone de disponibilité et s'attache à des instances de cette AZ (Multi-Attach pour io1/io2 uniquement, dans la même AZ). Des instances réparties sur plusieurs AZ qui doivent partager des fichiers ont besoin d'EFS ou de FSx, pas d'EBS.

<!-- section: containers | objectives: 2.1.8, 2.1.14, 2.1.20 -->
## Conteneurs : quand les utiliser et comment les orchestrer

Utilisez des conteneurs quand une application doit s'exécuter de façon identique partout, être empaquetée avec ses dépendances, démarrer en quelques secondes, être regroupée densément sur des hôtes partagés, ou être découpée en microservices déployés indépendamment. Ils conviennent aussi aux processus de longue durée et aux charges qui dépassent les limites de Lambda.

Migrer une application vers des conteneurs :

1. La rendre sans état : sessions vers ElastiCache ou DynamoDB, fichiers vers S3 ou EFS, configuration et secrets vers Parameter Store ou Secrets Manager, journaux vers la sortie standard (CloudWatch Logs).
2. Écrire un Dockerfile et construire une image ; la stocker dans **Amazon ECR** (registre privé avec analyse et réplication des images).
3. Décrire son exécution : une définition de tâche ECS ou un manifeste Kubernetes (CPU, mémoire, ports, rôle IAM, environnement).
4. L'exécuter comme service derrière un ALB, avec vérifications de l'état et mise à l'échelle automatique.

| | Amazon ECS | Amazon EKS |
| --- | --- | --- |
| Orchestrateur | Natif AWS, simple, profondément intégré à IAM, ALB, CloudWatch | Plan de contrôle Kubernetes géré, API Kubernetes standard |
| À choisir quand | Aucune exigence Kubernetes, le moins de charge opérationnelle | L'équipe utilise déjà Kubernetes, a besoin de son écosystème (Helm, opérateurs) ou de portabilité entre clouds et sur site |
| Briques de base | Cluster, définition de tâche, tâche, service | Cluster, pods, déploiements, nœuds |
| Options de calcul | AWS Fargate, Amazon EC2, ECS Managed Instances, ECS Anywhere (serveurs sur site) | EKS Auto Mode (AWS gère les nœuds), nœuds EC2, AWS Fargate, EKS Hybrid Nodes, EKS Anywhere |
| Mise à l'échelle | Service Auto Scaling (tâches) et mise à l'échelle automatique du cluster (instances) | Horizontal Pod Autoscaler, plus la mise à l'échelle des nœuds (Auto Mode ou votre propre autoscaler) |

> **Conseil d'examen.** « Exécuter des conteneurs sans gérer de serveurs ni de clusters d'instances » désigne Fargate (avec ECS ou EKS). « Des types d'instances précis ou des GPU, avec AWS qui gère les hôtes » oriente vers ECS Managed Instances ou EKS Auto Mode ; « un contrôle total des hôtes » oriente vers l'option de capacité EC2.

<!-- section: serverless | objectives: 2.1.12, 2.1.21 -->
## Technologies et modèles sans serveur

Sans serveur signifie aucun serveur à provisionner ni à corriger, une mise à l'échelle automatique, une disponibilité intégrée sur plusieurs AZ et un paiement à l'usage. Les principaux services de calcul sont **AWS Lambda** (des fonctions exécutées à chaque événement) et **AWS Fargate** (des conteneurs sans hôtes) ; les briques sans serveur qui les entourent incluent API Gateway, SQS, SNS, EventBridge, Step Functions, DynamoDB, S3 et Aurora Serverless v2.

Les limites Lambda qui décident de la réponse :

| Quota | Valeur |
| --- | --- |
| Délai d'expiration maximal | 15 minutes |
| Mémoire | De 128 Mo à 10 240 Mo (le CPU augmente avec la mémoire) |
| Stockage éphémère `/tmp` | De 512 Mo à 10 240 Mo |
| Charge utile | 6 Mo en requête et réponse synchrones, 1 Mo en asynchrone |
| Simultanéité | 1 000 exécutions simultanées par Région par défaut (ajustable) |
| Package | 50 Mo zippé en chargement direct, 250 Mo décompressé avec les couches, image de conteneur de 10 Go |

La **simultanéité réservée** garantit et plafonne la simultanéité d'une fonction (elle protège aussi une base de données en aval d'un excès de connexions) ; la **simultanéité provisionnée** garde des environnements initialisés pour supprimer la latence de démarrage à froid.

Modèles sans serveur courants : API Gateway + Lambda + DynamoDB pour une API web ; événement S3 vers Lambda pour le traitement de fichiers ; SQS vers Lambda pour un travail mis en tampon ; EventBridge Scheduler vers Lambda au lieu d'un serveur cron ; Step Functions pour enchaîner des fonctions.

| Exigence | Choix de calcul |
| --- | --- |
| Court, piloté par les événements, imprévisible ou inactif une grande partie du temps | Lambda |
| Dure plus de 15 minutes, ou nécessite un processus de longue durée, en conteneurs sans gérer d'hôtes | Fargate |
| Conteneurs tolérants aux interruptions à moindre coût | Fargate Spot (avertissement d'interruption deux minutes avant) |
| Nécessite un système d'exploitation précis, des logiciels sous licence sur hôtes dédiés, des GPU ou un contrôle total | Amazon EC2 |

> **Piège d'examen.** Une tâche qui dure 30 minutes ne peut pas s'exécuter en un seul appel Lambda. Découpez-la avec Step Functions, ou exécutez-la sur Fargate ou AWS Batch.

<!-- section: purpose-built | objectives: 2.1.22, 2.1.23 -->
## Recommander des services sur mesure

AWS privilégie un service sur mesure par modèle d'accès plutôt qu'un système généraliste unique :

| Exigence | Service |
| --- | --- |
| Relationnel, jointures et transactions, compatible MySQL ou PostgreSQL, haute disponibilité | Amazon Aurora ou Amazon RDS |
| Accès clé-valeur ou document à toute échelle avec une latence de l'ordre de la milliseconde | Amazon DynamoDB |
| Base de données de documents compatible MongoDB | Amazon DocumentDB |
| Colonnes larges compatible Apache Cassandra | Amazon Keyspaces |
| Relations en graphe (réseaux sociaux, réseaux de fraude, recommandations) | Amazon Neptune |
| Recherche en texte intégral et analyse de journaux | Amazon OpenSearch Service |
| Entrepôt de données et analyses SQL complexes sur de grands jeux de données | Amazon Redshift |
| Cache en mémoire ou magasin de sessions | Amazon ElastiCache |
| Tâches par lots qui demandent de nombreuses instances pendant des heures | AWS Batch |
| Site web statique avec des utilisateurs dans le monde entier | S3 + CloudFront |
| De nombreux VPC et réseaux sur site connectés par un hub | AWS Transit Gateway |

Lisez le qualificatif : « le MOINS de charge opérationnelle » favorise l'option gérée ou sans serveur (Fargate plutôt qu'EC2, DynamoDB plutôt qu'un cluster NoSQL autogéré) ; « sans modifier le code de l'application » favorise un service compatible (Aurora pour MySQL, DocumentDB pour MongoDB, Amazon MQ pour ActiveMQ, EFS pour un partage NFS).

<!-- section: key-points -->
## Points clés

- Mettre à l'échelle horizontalement les niveaux sans état avec des groupes Auto Scaling sur plusieurs AZ ; le suivi de cible est la politique par défaut, la prédictive pour les rythmes récurrents, la planifiée pour les dates connues ; les consommateurs de file se mettent à l'échelle selon le backlog par instance.
- Mettre en cache à la bonne couche : CloudFront en périphérie, API Gateway pour les réponses d'API, ElastiCache pour l'application, DAX pour les lectures à cohérence éventuelle de DynamoDB.
- Le chargement différé ne met en cache que ce qui est lu ; l'écriture simultanée garde le cache à jour ; ajouter un TTL aux deux.
- CloudFront met en cache le HTTP ; Global Accelerator fournit des IP anycast statiques pour TCP/UDP et un basculement rapide.
- Les réplicas en lecture mettent à l'échelle les lectures (jusqu'à 15, asynchrones, inter-Régions possibles) ; Multi-AZ sert la disponibilité.
- Objet (S3), fichier (EFS pour Linux, famille FSx pour Windows, Lustre, ONTAP, OpenZFS), bloc (EBS dans une AZ, stockage d'instance éphémère).
- ECS pour le moins de charge, EKS pour Kubernetes ; Fargate supprime les hôtes ; ECR stocke les images.
- Lambda pour du code court piloté par les événements (15 minutes au maximum) ; Fargate pour des conteneurs plus longs ; EC2 pour un contrôle total.
