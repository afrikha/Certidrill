Les questions de calcul décrivent une charge de travail (un niveau web avec des pics quotidiens, un traitement par lots nocturne, une API conteneurisée, une simulation HPC, une fonction pilotée par les événements) et demandent le service de calcul, la famille d'instances, la politique de mise à l'échelle ou la taille qui répond à l'exigence de performance avec le qualificatif indiqué. La démarche est toujours la même : choisir d'abord le modèle d'exécution, puis découpler et mettre à l'échelle sur la bonne métrique, enfin dimensionner la ressource.

<!-- section: compute-services | objectives: 3.2.1 -->
## Les services de calcul AWS et leurs cas d'utilisation

| Exigence | Service |
| --- | --- |
| Contrôle total du système d'exploitation, des licences, des GPU, serveurs de longue durée | Amazon EC2 (avec EC2 Auto Scaling) |
| Code court piloté par les événements, sans serveur, mise à l'échelle jusqu'à zéro, des minutes (pas des heures) par invocation | AWS Lambda |
| Conteneurs sans gérer de serveurs ni de clusters d'instances | AWS Fargate (avec Amazon ECS ou Amazon EKS) |
| Conteneurs avec une orchestration native AWS | Amazon ECS |
| Kubernetes, portabilité, outillage Kubernetes | Amazon EKS |
| Des milliers de tâches par lots mises en file, planifiées et exécutées sur un calcul géré (EC2, Spot, Fargate) | AWS Batch |
| Frameworks big data (Apache Spark, Hadoop, Hive, Presto) sur des clusters | Amazon EMR (sur EC2, sur EKS ou EMR Serverless) |
| Déployer une application web en chargeant le code ; AWS provisionne EC2, l'équilibreur de charge et la mise à l'échelle | AWS Elastic Beanstalk |
| Exécuter le calcul AWS dans votre propre centre de données | AWS Outposts ; ECS Anywhere ou EKS Anywhere pour des conteneurs sur vos propres serveurs |

- **AWS Batch** est fait pour des tâches qui s'exécutent jusqu'à leur fin : il gère les files de tâches, les priorités et les environnements de calcul, et choisit les instances (Spot comprises) à votre place. Il ne convient pas aux API pilotées par les requêtes.
- **Amazon EMR** est la réponse quand l'énoncé nomme un framework big data ; AWS Glue est la réponse ETL sans serveur, traitée ailleurs.
- **Fargate** supprime la gestion des instances : vous choisissez le processeur et la mémoire de la tâche (de 0,25 vCPU / 512 Mio à 32 vCPU / 244 Go pour Linux) et payez ce que les tâches demandent.

> **Piège d'examen.** Une tâche qui dure plusieurs heures ne peut pas être une seule invocation Lambda (le délai d'expiration maximal se compte en minutes). Choisissez Fargate, AWS Batch ou EC2, ou découpez le travail avec AWS Step Functions.

<!-- section: distributed-computing | objectives: 3.2.2 -->
## Informatique distribuée avec l'infrastructure mondiale et les services périphériques

| Emplacement | Ce qui s'y exécute | Usage |
| --- | --- | --- |
| Région, plusieurs zones de disponibilité | Tous les services | Répartir un groupe Auto Scaling sur plusieurs AZ pour la disponibilité et la capacité |
| Local Zone | EC2, EBS et quelques autres services près d'une grande ville | Latence de quelques millisecondes pour les utilisateurs de cette agglomération (rendu média, jeux, applications temps réel) |
| Wavelength Zone | EC2 à l'intérieur du réseau 5G d'un opérateur télécom | Latence ultra-faible vers les appareils mobiles |
| AWS Outposts | Infrastructure AWS sur site | Faible latence vers les systèmes sur site, traitement local des données |
| Emplacement périphérique CloudFront | Mise en cache, CloudFront Functions, Lambda@Edge | Distribuer et calculer en périphérie, au plus près des utilisateurs |
| AWS Global Accelerator | Adresses IP statiques anycast, trafic acheminé sur le réseau principal AWS | Améliorer les performances TCP/UDP vers des points de terminaison régionaux dans le monde entier |

Les groupes de placement contrôlent la manière dont les instances sont placées dans une AZ :

| Stratégie | Placement | Usage |
| --- | --- | --- |
| Cluster | Proches les unes des autres dans une AZ, bande passante élevée et faible latence | HPC, charges fortement couplées dont la majorité du trafic circule entre les instances |
| Partition | Groupes d'instances sur des racks distincts, jusqu'à 7 partitions par AZ | Grandes charges distribuées et répliquées : HDFS, HBase, Cassandra |
| Spread (répartition) | Chaque instance sur un matériel distinct, jusqu'à 7 instances en cours d'exécution par AZ et par groupe | Un petit nombre d'instances critiques qui ne doivent pas tomber en panne ensemble |

Pour le HPC fortement couplé, combinez un groupe de placement cluster avec des instances qui prennent en charge **Elastic Fabric Adapter (EFA)** ; la mise en réseau améliorée (ENA) fournit une bande passante élevée sur les types d'instances actuels.

> **Conseil d'examen.** « La latence la plus faible entre les nœuds », c'est un groupe de placement cluster ; « survivre à la panne d'un rack » avec de nombreuses instances, c'est partition ; « quelques instances critiques isolées les unes des autres », c'est spread.

<!-- section: serverless | objectives: 3.2.5 -->
## Technologies et modèles sans serveur

Chiffres clés d'**AWS Lambda** : mémoire de 128 Mo à 10 240 Mo par pas de 1 Mo, processeur alloué proportionnellement à la mémoire (l'équivalent d'un vCPU à 1 769 Mo), délai d'expiration jusqu'à 30 minutes sur la page actuelle des quotas Lambda (des pages plus anciennes et la FAQ indiquent encore 15 minutes ; 90 minutes pour certains appels de Lambda Managed Instances), stockage `/tmp` de 512 Mo à 10 240 Mo, 1 000 exécutions simultanées par Région par défaut (augmentable), et chaque fonction peut monter de 1 000 environnements d'exécution toutes les 10 secondes.

| Besoin | Fonctionnalité Lambda |
| --- | --- |
| Garantir une capacité à une fonction et la plafonner | Simultanéité réservée (reserved concurrency, sans frais supplémentaires) |
| Supprimer les démarrages à froid des fonctions sensibles à la latence | Simultanéité provisionnée (provisioned concurrency) sur une version ou un alias (facturée tant qu'elle est configurée), mise à l'échelle avec Application Auto Scaling |
| Protéger une base de données contre un excès de connexions | Simultanéité réservée comme plafond, plus RDS Proxy |
| Processus longs ou en plusieurs étapes | AWS Step Functions pour orchestrer les fonctions |

Modèles sans serveur courants : API Gateway plus Lambda pour les API ; un événement S3, SQS, SNS ou EventBridge qui déclenche Lambda ; Kinesis ou DynamoDB Streams traités par Lambda par lots ; Fargate quand le code est un conteneur, dure plus longtemps ou exige plus de mémoire que Lambda.

> **Piège d'examen.** La simultanéité réservée ne rend pas les fonctions plus rapides : elle réserve et limite. La latence de démarrage à froid se résout avec la simultanéité provisionnée.

<!-- section: containers | objectives: 3.2.6 -->
## Orchestration des conteneurs

| Choix | ECS | EKS |
| --- | --- | --- |
| Orchestrateur | Natif AWS, plus simple | Kubernetes (compatible avec la version open source) |
| Plan de données | Instances EC2 (fournisseurs de capacité) ou Fargate | Groupes de nœuds gérés, nœuds autogérés, Fargate ou EKS Auto Mode |
| Mise à l'échelle des tâches ou pods | ECS Service Auto Scaling (suivi de cible sur le CPU, la mémoire ou les requêtes ALB par cible) | Horizontal Pod Autoscaler |
| Mise à l'échelle des nœuds | Fournisseur de capacité avec un groupe Auto Scaling (mise à l'échelle gérée) | Cluster Autoscaler ou Karpenter ; EKS Auto Mode gère les nœuds avec Karpenter |
| Sur site | ECS Anywhere | EKS Anywhere |

Choisissez **ECS sur Fargate** pour la charge opérationnelle la plus faible avec des conteneurs ; **EKS** quand l'entreprise utilise déjà Kubernetes ou a besoin de son écosystème ; le **type de lancement EC2** quand vous avez besoin de GPU, de types d'instances précis ou d'une capacité réservée sous votre contrôle.

> **Conseil d'examen.** « Migrer des manifestes Kubernetes existants avec un minimum de modifications » mène à EKS, pas à ECS. « Aucun serveur ni cluster à gérer » mène à Fargate.

<!-- section: decoupling | objectives: 3.2.3, 3.2.7 -->
## Files d'attente, messagerie et découplage pour une mise à l'échelle indépendante

Une chaîne synchrone ne s'adapte qu'au rythme de son composant le plus lent. Placez un tampon entre producteurs et consommateurs pour que chaque niveau évolue seul :

| Service | Modèle | À choisir pour |
| --- | --- | --- |
| Amazon SQS standard | File d'attente, un consommateur par message, au moins une livraison, ordre au mieux, débit quasi illimité | Mettre du travail en tampon pour une flotte de workers |
| Amazon SQS FIFO | Ordre garanti dans un groupe de messages, traitement exactement une fois, débit limité (le mode haut débit l'augmente) | L'ordre compte (paiements, mises à jour séquentielles) |
| Amazon SNS | Publication/abonnement, envoi à de nombreux abonnés (SQS, Lambda, HTTP, e-mail) | Diffusion (fan-out) d'un événement vers plusieurs systèmes |
| Amazon EventBridge | Bus d'événements avec règles basées sur le contenu, sources SaaS et AWS | Router les événements selon leur contenu vers des cibles |
| Amazon Kinesis Data Streams | Flux ordonné par partition (shard), plusieurs consommateurs relisent les données | Streaming temps réel, plusieurs lecteurs des mêmes enregistrements |

Les réglages SQS testés à l'examen : **délai de visibilité** (30 secondes par défaut, 12 heures au maximum ; il doit dépasser la durée de traitement, sinon les messages sont traités deux fois), **interrogation longue** (attente jusqu'à 20 secondes, moins de réponses vides), **file d'attente de lettres mortes** après un nombre maximal de réceptions, conservation des messages de 4 jours par défaut et jusqu'à 14 jours, taille maximale de message de 1 Mio.

**SNS vers plusieurs files SQS** (fan-out) permet à chaque service consommateur d'évoluer et de tomber en panne indépendamment.

> **Piège d'examen.** Si des commandes se perdent quand le niveau de traitement est surchargé, la solution est une file SQS entre les niveaux, pas une instance plus grosse : la file absorbe le pic et les workers évoluent selon sa profondeur.

<!-- section: auto-scaling | objectives: 3.2.4 -->
## Capacités de mise à l'échelle : EC2 Auto Scaling et AWS Auto Scaling

**Amazon EC2 Auto Scaling** maintient un groupe d'instances entre un minimum et un maximum, à partir d'un **modèle de lancement**, sur plusieurs AZ, et remplace les instances défectueuses (vérifications de l'état EC2 ou ELB).

| Politique | Comportement | Usage |
| --- | --- | --- |
| Suivi de cible (target tracking) | Maintient une métrique à une valeur cible, crée et gère les alarmes CloudWatch | Choix par défaut recommandé |
| Mise à l'échelle par étapes (step) | Ajoute ou retire de la capacité par paliers selon l'ampleur du dépassement de l'alarme | Réactions personnalisées aux forts dépassements |
| Mise à l'échelle simple (simple) | Un ajustement, puis un temps de stabilisation | Héritage |
| Mise à l'échelle planifiée (scheduled) | Modifie la capacité à des heures fixées | Événements connus du calendrier |
| Mise à l'échelle prédictive (predictive) | Prévoit la charge à partir de 14 jours d'historique au plus (24 heures au moins) et lance la capacité à l'avance ; ne réduit pas | Cycles quotidiens ou hebdomadaires récurrents, initialisation longue |

- Avec plusieurs politiques, le groupe s'étend si l'une d'elles l'exige et la capacité souhaitée la plus élevée l'emporte.
- La **période de préchauffage des instances** (instance warmup) exclut une nouvelle instance des métriques du groupe jusqu'à ce qu'elle soit prête ; les **groupes d'instances préchauffées** (warm pools) conservent des instances pré-initialisées (arrêtées, en veille prolongée ou en cours d'exécution) pour les applications au démarrage très long.
- **Application Auto Scaling** met à l'échelle d'autres ressources : services ECS, capacité DynamoDB, réplicas Aurora, simultanéité provisionnée Lambda, Spot Fleet et d'autres.
- Les **plans de mise à l'échelle AWS Auto Scaling** configurent la mise à l'échelle de plusieurs de ces ressources à la fois ; pour la seule mise à l'échelle prédictive, AWS recommande des politiques prédictives définies directement sur les ressources.

> **Conseil d'examen.** Un trafic qui monte chaque jour ouvré à 8 h et des instances qui mettent 10 minutes à démarrer : mise à l'échelle prédictive (avec prélancement) ou planifiée, plus un suivi de cible pour l'imprévu.

<!-- section: scaling-metrics | objectives: 3.2.8 -->
## Choisir les métriques et les conditions de mise à l'échelle

Choisissez une métrique inversement proportionnelle à la capacité : si les instances doublent, la métrique diminue de moitié.

| Charge de travail | Métrique de mise à l'échelle |
| --- | --- |
| Niveau web ou applicatif limité par le CPU | `ASGAverageCPUUtilization` |
| Niveau web derrière un Application Load Balancer | `ALBRequestCountPerTarget` |
| Niveau limité par le réseau (streaming, proxies) | `ASGAverageNetworkIn` ou `ASGAverageNetworkOut` |
| Workers qui lisent une file SQS | Backlog par instance : `ApproximateNumberOfMessagesVisible` divisé par le nombre d'instances, cible = latence acceptable divisée par le temps de traitement d'un message |
| Application limitée par la mémoire | Métrique CloudWatch personnalisée publiée par l'agent CloudWatch (la mémoire n'est pas une métrique EC2 par défaut) |
| Service ECS | Utilisation moyenne du CPU ou de la mémoire du service, ou requêtes ALB par cible |

Les conditions à bien régler : capacité minimale pour la charge de base et le nombre d'AZ, capacité maximale comme garde-fou des coûts, préchauffage égal au temps de démarrage plus l'initialisation, et protection contre la réduction (scale-in protection) pour les instances qui exécutent un travail long.

> **Piège d'examen.** Mettre les workers à l'échelle sur le nombre brut de messages de la file ne reflète pas la charge par instance ; AWS recommande la métrique de backlog par instance avec un suivi de cible.

<!-- section: instance-selection | objectives: 3.2.9 -->
## Choisir les types et fonctionnalités d'instances EC2

| Famille | Optimisée pour | Exemples d'usage |
| --- | --- | --- |
| M, T (à performances extensibles) | Usage général, CPU et mémoire équilibrés ; T accumule des crédits CPU pour une faible utilisation moyenne | Serveurs web, petites bases de données, dev/test |
| C | Calcul | Traitement par lots, transcodage média, serveurs web hautes performances, modélisation scientifique, jeux |
| R, X, U, z | Mémoire | Bases de données et caches en mémoire, analytique big data en temps réel, SAP HANA |
| P, G, Trn, Inf, F | Calcul accéléré (GPU, Trainium, Inferentia, FPGA) | Entraînement et inférence ML, graphisme, vidéo |
| I, D, H | Stockage, E/S et densité de disque local élevées | Bases NoSQL, entrepôts de données, systèmes de fichiers distribués |
| Hpc | Calcul haute performance | Simulations fortement couplées |

Format du nom : `c7gn.xlarge` = famille `c`, génération `7`, options `g` (AWS Graviton) et `n` (optimisée réseau et EBS), taille `xlarge`. Autres options : `a` AMD, `i` Intel, `d` stockage d'instance NVMe local, `e` mémoire ou stockage supplémentaire, `flex` instance Flex.

- Les instances **Graviton** (Arm) offrent un meilleur rapport prix/performances quand le logiciel fonctionne sur Arm.
- Une instance **T** dont le CPU reste élevé épuise ses crédits (mode standard) ou paie les crédits excédentaires (mode illimité) : passez à M ou C.

> **Conseil d'examen.** Faites correspondre le goulet d'étranglement de l'énoncé à la lettre : CPU vers C, mémoire vers R, E/S locales vers I, GPU vers P ou G, latence entre nœuds vers Hpc ou un groupe de placement cluster.

<!-- section: right-sizing | objectives: 3.2.10 -->
## Choisir le type et la taille des ressources

- La **mémoire Lambda** est le seul levier de performance : plus de mémoire donne aussi plus de CPU, si bien qu'une fonction limitée par le CPU s'exécute souvent plus vite, sans coûter plus cher, avec un réglage plus élevé. Mesurez avec les métriques CloudWatch de durée et de mémoire, AWS Lambda Power Tuning ou les recommandations d'AWS Compute Optimizer.
- **AWS Compute Optimizer** analyse l'utilisation et recommande des tailles pour les instances EC2, les groupes Auto Scaling, les volumes EBS, les fonctions Lambda et les services ECS sur Fargate.
- **Fargate** : dimensionnez le CPU et la mémoire de la tâche d'après l'utilisation mesurée du conteneur ; augmentez le nombre de tâches plutôt que de créer une tâche énorme.
- **EC2** : mise à l'échelle horizontale (plus d'instances) pour les niveaux sans état ; verticale (instance plus grande) quand le logiciel ne peut pas être distribué, comme un unique nœud d'écriture de base de données.

```bash
# Give a CPU-bound function more memory, which also gives it more CPU
aws lambda update-function-configuration \
  --function-name image-resize \
  --memory-size 3008
```

> **Piège d'examen.** Lambda n'a pas de réglage CPU séparé. « La fonction est limitée par le CPU et lente » se résout en augmentant sa mémoire.

<!-- section: key-points -->
## Points clés

- Lambda pour des événements courts (des minutes, pas des heures), Fargate pour des conteneurs sans serveur, ECS ou EKS pour l'orchestration, Batch pour des tâches en file, EMR pour Spark et Hadoop.
- Local Zones et Wavelength rapprochent le calcul des utilisateurs ; groupes de placement : cluster pour la latence, partition pour les racks, spread pour quelques instances critiques.
- Découplez avec SQS (tampon), SNS (fan-out), EventBridge (routage), Kinesis (flux) pour que chaque niveau évolue seul.
- Suivi de cible par défaut ; prédictive ou planifiée pour les cycles connus ; warm pools pour les démarrages lents ; Application Auto Scaling pour les ressources hors EC2.
- Mettez à l'échelle sur une métrique qui baisse quand la capacité augmente : CPU, requêtes par cible, backlog par instance.
- Choisissez la famille d'instances d'après le goulet d'étranglement ; dimensionnez Lambda par la mémoire ; utilisez Compute Optimizer.
