Une architecture à faible couplage permet à chaque composant de tomber en panne, d'évoluer et de changer sans casser les autres. Les questions SAA-C03 décrivent une conception fortement couplée (un niveau web qui appelle directement un back-end lent, un monolithe qui perd des commandes sous la charge) et demandent quel service AWS placer entre les parties comme tampon, contrat ou orchestrateur : API, équilibreurs de charge, files d'attente, rubriques, événements ou flux de travail.

<!-- section: coupling-principles | objectives: 2.1.4, 2.1.19 -->
## Couplage faible et microservices sans état

Des composants sont **fortement couplés** quand l'un doit être disponible, rapide et inchangé pour que l'autre fonctionne (un appel synchrone qui expire, une adresse IP codée en dur, un schéma partagé), et **faiblement couplés** quand un intermédiaire absorbe les différences :

| Problème de couplage | Réponse à faible couplage |
| --- | --- |
| Le consommateur est plus lent que le producteur, ou se déconnecte | Une file d'attente (Amazon SQS) met le travail en tampon |
| Un événement doit atteindre plusieurs consommateurs indépendants | Publication/abonnement (Amazon SNS) ou bus d'événements (Amazon EventBridge) |
| Les clients ne doivent pas savoir quels serveurs répondent | Un équilibreur de charge ou une API (ALB, API Gateway) avec un nom DNS |
| Plusieurs étapes doivent s'exécuter dans l'ordre, avec nouvelles tentatives et gestion des erreurs | Un flux de travail (AWS Step Functions) |

Un **microservice** est un petit service qui possède une capacité métier, ses données et son API, et qui se déploie indépendamment. Concevez-le **sans état** chaque fois que possible :

| | Sans état | Avec état |
| --- | --- | --- |
| Où se trouve l'état | Hors du calcul : Amazon DynamoDB, Amazon ElastiCache, Amazon S3, une base de données | En mémoire ou sur le disque local d'une instance ou d'un conteneur |
| Mise à l'échelle | Ajouter ou retirer n'importe quelle instance ; toute instance peut servir toute requête | Les nouvelles instances n'ont pas l'état ; en retirer une le perd |
| Panne | Une autre instance prend le relais de façon transparente | Les sessions ou le travail en cours sont perdus |

> **Piège d'examen.** « Les utilisateurs sont déconnectés quand Auto Scaling résilie une instance » se résout en déplaçant les données de session vers ElastiCache ou DynamoDB, pas en activant les sessions permanentes. Les sessions permanentes gardent l'utilisateur sur une instance, mais il perd sa session quand cette instance disparaît.

<!-- section: multi-tier | objectives: 2.1.9, 2.1.10, 2.1.17 -->
## Architectures à plusieurs niveaux et répartition de charge

La conception classique à trois niveaux sépare présentation, logique et données, chacune dans ses propres sous-réseaux et groupes de sécurité, chacune évolutive séparément :

```text
Internet
  -> internet-facing Application Load Balancer   (public subnets, 2+ AZs)
  -> web tier: Auto Scaling group                 (private subnets)
  -> internal Application Load Balancer          (private subnets)
  -> application tier: Auto Scaling group         (private subnets)
  -> data tier: Amazon RDS Multi-AZ or Aurora     (private subnets)
```

- Le groupe de sécurité de chaque niveau n'autorise que le trafic provenant du groupe de sécurité du niveau situé devant lui (référencement de groupe de sécurité), pas des plages CIDR.
- Un équilibreur de charge **accessible sur Internet** (internet-facing) a des adresses IP publiques pour ses nœuds ; un équilibreur **interne** n'a que des adresses privées et n'est joignable que depuis le VPC (ou les réseaux connectés). Les deux joignent leurs cibles par adresses IP privées : les cibles n'ont pas besoin d'IP publiques.
- Quand aucune réponse immédiate n'est nécessaire (passage de commande, traitement d'images), remplacez l'équilibreur interne par une file d'attente SQS : le niveau application se met à l'échelle selon la profondeur de la file et rien n'est perdu s'il est lent.

Elastic Load Balancing propose trois types d'équilibreurs de charge actuels :

| | Application Load Balancer | Network Load Balancer | Gateway Load Balancer |
| --- | --- | --- | --- |
| Couche OSI | 7 (HTTP, HTTPS, gRPC) | 4 (TCP, UDP, TLS, QUIC) | 3 (paquets IP, GENEVE) |
| Routage | Chemin, hôte, en-têtes HTTP, méthode, chaîne de requête, IP source | Hachage de flux ; une connexion TCP reste sur une cible | Hachage de flux à 5 éléments vers une flotte d'appliances virtuelles |
| Cibles | Instances, adresses IP, fonctions Lambda, conteneurs | Instances, adresses IP, un ALB | Instances d'appliance ou adresses IP |
| IP statique | Non (utiliser un nom DNS) | Une IP statique par AZ, adresse IP Elastic facultative | Non |
| Équilibrage de charge entre zones par défaut | Activé (désactivable par groupe cible) | Désactivé | Désactivé |

> **Conseil d'examen.** « Router /api vers un service et /images vers un autre derrière un seul point de terminaison » ou « authentifier les utilisateurs avant qu'ils n'atteignent l'application » désigne l'ALB. « Les clients doivent autoriser des adresses IP fixes » ou « UDP » désigne le NLB. « Insérer de façon transparente des appliances de pare-feu tierces » désigne le GWLB.

Les clients utilisent un seul nom DNS ; les vérifications de l'état retirent les cibles défaillantes et le groupe Auto Scaling les remplace sans aucun changement côté client. Un ALB exige au moins deux zones de disponibilité.

<!-- section: api-gateway | objectives: 2.1.1 -->
## Créer et gérer des API avec Amazon API Gateway

Amazon API Gateway est une porte d'entrée gérée pour les API (autorisation, limitation, surveillance, gestion des versions) placée devant des fonctions Lambda, des points de terminaison HTTP, des services AWS ou des ressources privées via un lien VPC (VPC link). Il existe trois types d'API :

| Besoin | Type d'API |
| --- | --- |
| Ensemble complet de fonctionnalités : clés d'API et plans d'utilisation, limitation par client, mise en cache, AWS WAF, validation des requêtes, politiques de ressources, points de terminaison privés ou optimisés pour la périphérie | API REST |
| Proxy simple vers Lambda ou des back-ends HTTP, à prix et latence plus faibles, autorisateurs JWT (OIDC/OAuth 2.0) | API HTTP |
| Connexions bidirectionnelles persistantes (chat, tableaux de bord en direct) | API WebSocket |

Types de points de terminaison d'une API REST :

| Type de point de terminaison | À utiliser quand |
| --- | --- |
| Optimisé pour la périphérie (edge-optimized) | Les clients sont répartis dans le monde ; les requêtes entrent par le réseau CloudFront |
| Régional | Les clients sont dans la même Région, ou vous placez votre propre distribution CloudFront devant |
| Privé | L'API ne doit être joignable que depuis des VPC, par un point de terminaison VPC d'interface |

Les faits sur lesquels l'examen s'appuie :

- **Limitation** : par défaut 10 000 requêtes par seconde par compte et par Région (régime permanent, ajustable) avec une rafale de 5 000 requêtes (valeurs par défaut plus faibles dans certaines Régions récentes). Les plans d'utilisation avec clés d'API fixent des limites de débit et des quotas par client.
- **Mise en cache** (REST uniquement) : un cache au niveau de l'étape (stage), avec une durée de vie (TTL) par défaut de 300 secondes, de 0 à 3 600 secondes, réduit les appels au back-end.
- **Autorisation** : IAM (SigV4), groupes d'utilisateurs Amazon Cognito, autorisateurs Lambda (jetons personnalisés), autorisateurs JWT (API HTTP), politiques de ressources (REST).
- **Délai d'intégration** : de 50 ms à 29 secondes par défaut ; il peut être augmenté pour les API REST régionales et privées, pas pour les API optimisées pour la périphérie. Taille de charge utile : 10 Mo. Un travail plus long relève d'un modèle asynchrone : API Gateway s'intègre directement à SQS ou à Step Functions, sans fonction Lambda intermédiaire, et répond immédiatement.

> **Piège d'examen.** Les clés d'API identifient les clients pour les plans d'utilisation ; ce n'est pas un mécanisme d'autorisation. Utilisez IAM, Cognito ou un autorisateur Lambda pour contrôler l'accès.

<!-- section: queues-messaging | objectives: 2.1.2, 2.1.11 -->
## Files d'attente et publication/abonnement : Amazon SQS, Amazon SNS, Amazon MQ

**Point à point (file d'attente)** : un producteur envoie un message, un consommateur le traite et le supprime. **Publication/abonnement (rubrique)** : un éditeur envoie un message une fois et chaque abonné reçoit sa propre copie.

Amazon SQS est un service de file d'attente entièrement géré, sans broker à exploiter :

| | File d'attente standard | File d'attente FIFO |
| --- | --- | --- |
| Remise | Au moins une fois (doublons occasionnels) | Traitement exactement une fois (déduplication sur un intervalle de 5 minutes) |
| Ordre | Au mieux (best effort) | Strict, au sein de chaque ID de groupe de messages |
| Débit | Quasi illimité | 300 appels d'API par seconde et par action, 3 000 messages par seconde avec traitement par lots ; le mode haut débit augmente ces valeurs |

Les paramètres SQS à connaître : taille de message jusqu'à 1 Mio ; conservation de 1 minute à 14 jours (4 jours par défaut) ; **délai de visibilité** de 30 secondes par défaut, 12 heures au maximum (un message reçu est masqué aux autres consommateurs jusqu'à sa suppression ou l'expiration du délai) ; **files d'attente de délai** et minuteurs de message jusqu'à 15 minutes ; l'**interrogation longue** (long polling), avec un temps d'attente jusqu'à 20 secondes, réduit les réponses vides et le coût ; une **file d'attente de lettres mortes** (DLQ) reçoit les messages qui ont échoué `maxReceiveCount` fois.

```json
{
  "RedrivePolicy": {
    "deadLetterTargetArn": "arn:aws:sqs:eu-west-1:111122223333:orders-dlq",
    "maxReceiveCount": "5"
  }
}
```

Avec Lambda comme consommateur, fixez le délai de visibilité de la file à au moins six fois le délai d'expiration de la fonction, utilisez un `maxReceiveCount` d'au moins 5 et signalez les échecs d'éléments du lot pour que seuls les messages en échec reviennent dans la file. Rendez les consommateurs idempotents : la remise se fait au moins une fois.

Amazon SNS est un service géré de publication/abonnement. Une **rubrique** (topic) pousse chaque message vers ses abonnements : files d'attente SQS, fonctions Lambda, points de terminaison HTTP/S, e-mail, SMS, notifications push mobiles et Amazon Data Firehose. Une **politique de filtre d'abonnement** ne remet à un abonné que les messages correspondants, si bien que les consommateurs n'ont pas à écarter ce dont ils n'ont pas besoin. Les rubriques SNS FIFO conservent l'ordre et la déduplication et remettent les messages à des files d'attente SQS.

Le modèle de **diffusion (fan-out)** combine les deux : publier une fois dans une rubrique SNS, abonner une file d'attente SQS par consommateur. Chaque consommateur reçoit une copie durable, la traite à son rythme, et peut être ajouté sans toucher au producteur.

```json
{
  "eventType": ["order_placed"],
  "amount": [{ "numeric": [">=", 1000] }]
}
```

Amazon MQ est un broker de messages géré pour **Apache ActiveMQ Classic et RabbitMQ**. Choisissez-le pour migrer des applications existantes qui utilisent des protocoles et API standard (JMS, AMQP, MQTT, STOMP, OpenWire) **sans réécrire le code de messagerie**.

> **Piège d'examen.** SQS ne pousse pas les messages ; les consommateurs les interrogent. SNS ne stocke pas les messages pour plus tard ; un abonné arrêté les manque, sauf si une file d'attente SQS (ou une politique de nouvelles tentatives et une DLQ) est abonnée. « Chaque système en aval doit recevoir la commande, même si l'un est hors ligne » correspond à une diffusion SNS vers des files d'attente SQS, pas à SNS seul.

<!-- section: event-driven | objectives: 2.1.5, 2.1.17 -->
## Architectures basées sur les événements

Les producteurs émettent des **événements** (des faits : « objet créé », « commande passée ») sans savoir qui les consomme ; des routeurs les acheminent ; les consommateurs réagissent. On ajoute de nouveaux consommateurs sans modifier les producteurs.

| Service | Modèle | À choisir quand |
| --- | --- | --- |
| Bus d'événements Amazon EventBridge | Routeur : des règles avec des modèles d'événements envoient les événements correspondants à des cibles | Routage selon le contenu de l'événement vers de nombreuses cibles AWS, événements des services AWS et des partenaires SaaS, archivage et relecture des événements |
| Amazon SNS | Publication/abonnement en mode push | Forte diffusion vers de nombreux abonnés avec un filtrage simple par attributs, SMS, e-mail, push mobile |
| Amazon SQS | File d'attente (pull) | Mise en tampon du travail pour un groupe de consommateurs, lissage de charge |
| Amazon Kinesis Data Streams | Flux ordonné et relisible (partitions, ou shards) | Streaming en temps réel de gros volumes d'enregistrements, ordre par clé de partition, plusieurs consommateurs lisant les mêmes données, relecture |
| Notifications d'événements Amazon S3 | Source d'événements native | Réagir à la création ou à la suppression d'objets (vers Lambda, SQS, SNS ou EventBridge) |

Détails EventBridge : une règle sélectionne les événements par modèle (source, type de détail, n'importe quel champ de l'événement) et les envoie à 5 cibles au maximum (Lambda, SQS, SNS, Step Functions, Kinesis, destinations d'API, etc.). **EventBridge Scheduler** exécute des tâches planifiées (cron ou ponctuelles) à grande échelle.

Kinesis Data Streams conserve les enregistrements 24 heures par défaut, jusqu'à 365 jours.

Lambda est le consommateur habituel. Il est appelé de trois façons : **de manière synchrone** (API Gateway, ALB), **de manière asynchrone** (S3, SNS, EventBridge : Lambda met l'événement en file, fait deux nouvelles tentatives, puis l'envoie à une **destination** en cas d'échec ou à une DLQ) et par un **mappage de source d'événements** (SQS, Kinesis, DynamoDB Streams : Lambda interroge la source et envoie des lots).

> **Conseil d'examen.** « Traiter les événements de nombreux services AWS et applications SaaS et les router selon leur contenu » désigne EventBridge. « Plusieurs applications doivent lire le même flux de clics dans l'ordre et relire les dernières 24 heures » désigne Kinesis Data Streams. « Découpler et mettre en tampon » désigne SQS.

<!-- section: workflow-orchestration | objectives: 2.1.16 -->
## Orchestration de flux de travail avec AWS Step Functions

AWS Step Functions exécute des **machines d'état** définies en Amazon States Language (JSON). Chaque état est une étape : `Task` (appeler directement une fonction Lambda ou l'API d'un autre service AWS), `Choice` (branchement), `Parallel`, `Map` (itération ; Distributed Map pour les grands jeux de données dans S3), `Wait`, `Pass`, `Succeed`, `Fail`. Les nouvelles tentatives avec backoff exponentiel et l'interception des erreurs se déclarent sur chaque état : le code métier n'a pas à les implémenter.

```json
{
  "StartAt": "ChargeCard",
  "States": {
    "ChargeCard": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "charge-card", "Payload.$": "$" },
      "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }],
      "Next": "ShipOrder"
    },
    "ShipOrder": { "Type": "Task", "Resource": "arn:aws:states:::sqs:sendMessage", "Parameters": { "QueueUrl": "https://sqs.eu-west-1.amazonaws.com/111122223333/shipping", "MessageBody.$": "$" }, "End": true },
    "NotifyFailure": { "Type": "Task", "Resource": "arn:aws:states:::sns:publish", "Parameters": { "TopicArn": "arn:aws:sns:eu-west-1:111122223333:alerts", "Message.$": "$" }, "End": true }
  }
}
```

| | Flux de travail Standard | Flux de travail Express |
| --- | --- | --- |
| Durée maximale | 1 an | 5 minutes |
| Sémantique d'exécution | Exactement une fois | Au moins une fois (asynchrone), au plus une fois (synchrone) |
| Facturé selon | Les transitions d'état | Le nombre d'exécutions, la durée et la mémoire |
| `.sync` (exécuter une tâche et attendre) et `.waitForTaskToken` (rappel) | Pris en charge | Non pris en charge |
| Usage type | Processus métier longs, approbation humaine, étapes non idempotentes (paiements) | Traitement d'événements courts à fort volume, transformation de données en streaming |

Le type de flux de travail ne peut pas être modifié après la création.

> **Conseil d'examen.** « Coordonner plusieurs fonctions Lambda avec branchements, nouvelles tentatives et une étape d'approbation manuelle, avec le MOINS de charge opérationnelle » désigne un flux de travail Step Functions Standard avec un jeton de tâche de rappel, pas des fonctions Lambda qui s'appellent entre elles ni une table d'état personnalisée dans DynamoDB.

<!-- section: managed-services | objectives: 2.1.2, 2.1.19 -->
## Services gérés pour les besoins d'intégration courants

Remplacez les composants autogérés par un service géré :

| Exigence | Service géré |
| --- | --- |
| Des partenaires déposent des fichiers en SFTP, FTPS, FTP ou AS2, stockés dans S3 ou EFS, sans exploiter de serveurs SFTP | AWS Transfer Family (avec des flux de travail gérés pour traiter les fichiers déposés ; applications web pour les transferts depuis un navigateur) |
| Stocker les identifiants de base de données et les clés d'API, les faire tourner automatiquement, jamais dans le code | AWS Secrets Manager |
| Stocker des valeurs de configuration et des paramètres de façon hiérarchique, à faible coût | AWS Systems Manager Parameter Store |

AWS Secrets Manager chiffre les secrets avec AWS KMS, les fait tourner selon une planification (rotation gérée pour les services pris en charge, ou fonction Lambda de rotation) et peut **répliquer un secret dans d'autres Régions** ; la rotation a lieu dans la Région principale et se propage aux réplicas, qui peuvent être promus en secrets autonomes pour la reprise après sinistre.

> **Piège d'examen.** Les paramètres `SecureString` de Parameter Store sont chiffrés mais n'ont pas de rotation automatique intégrée. « Faire tourner automatiquement le mot de passe de la base de données tous les 30 jours » désigne Secrets Manager.

<!-- section: choosing-integration | objectives: 2.1.17, 2.1.19 -->
## Choisir le service de découplage à partir de l'exigence

| Exigence de l'énoncé | Réponse |
| --- | --- |
| Des commandes sont perdues quand le niveau de traitement est surchargé | File d'attente SQS entre les niveaux ; mise à l'échelle des consommateurs selon la profondeur de la file |
| Traiter chaque commande exactement une fois et dans l'ordre par client | File d'attente SQS FIFO, ID de groupe de messages = ID client |
| Un dépôt de fichier doit déclencher une miniature, une analyse antivirus et une mise à jour d'index, indépendamment | Rubrique SNS (ou règle EventBridge) diffusant vers une file d'attente SQS ou une fonction Lambda par tâche |
| Réagir aux événements des services AWS (changement d'état EC2, résultat GuardDuty) ou à des événements SaaS | Règle EventBridge |
| Ingestion en temps réel de milliers d'enregistrements par seconde, ordonnés, relisibles par plusieurs consommateurs | Kinesis Data Streams |
| Processus en plusieurs étapes avec nouvelles tentatives, branchements et longues attentes | Step Functions Standard |
| Migrer telle quelle une application ActiveMQ sur site | Amazon MQ |
| Requête longue (plusieurs minutes) derrière une API | Asynchrone : API Gateway vers SQS ou Step Functions, le client interroge ou est notifié |

<!-- section: key-points -->
## Points clés

- Calcul sans état + état dans DynamoDB, ElastiCache ou S3 ; les sessions permanentes ne corrigent pas la perte de sessions.
- ALB pour le routage HTTP et l'authentification, NLB pour TCP/UDP et les IP statiques, GWLB pour les appliances en ligne ; équilibreurs internes entre les niveaux.
- API Gateway : API REST pour l'ensemble complet (plans d'utilisation, cache, WAF, privé), API HTTP pour le simple et moins cher, WebSocket pour le bidirectionnel.
- SQS met en tampon (standard : au moins une fois, FIFO : ordonné et traitement exactement une fois) ; SNS pousse vers de nombreux abonnés ; diffusion SNS vers SQS pour une remise durable à plusieurs consommateurs ; DLQ pour les messages empoisonnés.
- EventBridge route les événements selon leur contenu depuis les services AWS et le SaaS ; Kinesis Data Streams pour les flux ordonnés et relisibles ; Amazon MQ pour les protocoles de broker existants.
- Step Functions Standard (1 an, exactement une fois, rappels) contre Express (5 minutes, fort volume).
- Transfer Family pour le SFTP/FTPS/FTP/AS2 géré ; Secrets Manager pour des secrets en rotation.
