AWS propose du calcul à plusieurs niveaux de gestion : des serveurs virtuels que vous contrôlez (Amazon EC2), des conteneurs qu'AWS orchestre et des fonctions sans serveur pour lesquelles vous ne gérez que le code. L'examen vous demande d'associer une charge de travail à une famille d'instances EC2, à une option de conteneur ou à une option sans serveur, et de savoir ce qu'apportent la mise à l'échelle automatique et les équilibreurs de charge.

<!-- section: compute-services | objectives: 3.3.1 -->
## Services de calcul AWS

| Service | Ce que c'est | Choisissez-le quand |
| --- | --- | --- |
| **Amazon EC2** | Des serveurs virtuels (instances) avec un contrôle complet du système d'exploitation | Vous avez besoin d'un système d'exploitation, d'un logiciel ou d'une configuration spécifique ; migration de serveurs telle quelle (lift-and-shift) |
| **Amazon Lightsail** | Des serveurs privés virtuels simples avec des ressources groupées et un prix mensuel prévisible | Sites web simples, blogs, petites applications, utilisateurs débutants dans le cloud |
| **AWS Elastic Beanstalk** | Vous chargez le code ; AWS met en service EC2, l'équilibrage de charge et la mise à l'échelle | Déployer une application web sans gérer l'infrastructure |
| **AWS Batch** | Exécute des tâches de calcul par lots sur du calcul géré, mises en file d'attente et planifiées | Des milliers de tâches, simulations, rendu |
| **AWS Lambda** | Exécute du code en réponse à des événements, sans serveur à gérer | Tâches courtes pilotées par les événements |
| **Amazon ECS, Amazon EKS, AWS Fargate** | Orchestration de conteneurs et calcul sans serveur pour conteneurs | Applications conteneurisées |
| **AWS Outposts** | Calcul et stockage AWS dans votre centre de données | Charges de travail qui doivent s'exécuter sur site |

<!-- section: ec2-instance-types | objectives: 3.3.2 -->
## Choisir un type d'instance EC2

Un type d'instance fixe la capacité de processeur, de mémoire, de stockage et de réseau. Les types sont regroupés selon ce pour quoi ils sont optimisés :

| Catégorie | Familles (exemples) | Utilisation appropriée |
| --- | --- | --- |
| **Usage général** | M, T, Mac | Équilibre entre calcul, mémoire et réseau : serveurs web, référentiels de code, bases de données petites et moyennes, développement et test |
| **Optimisé pour le calcul** | C | Travaux limités par le processeur : traitement par lots, transcodage multimédia, serveurs web hautes performances, modélisation scientifique, serveurs de jeux dédiés |
| **Optimisé pour la mémoire** | R, X, U | Grands jeux de données en mémoire : bases de données et caches en mémoire, analyse de big data en temps réel |
| **Optimisé pour le stockage** | I, D, H | Accès en lecture et écriture élevé et séquentiel à de très grands jeux de données sur stockage local : bases NoSQL, entrepôts de données, systèmes de fichiers distribués |
| **Calcul accéléré** | P, G, Inf, Trn, F | Accélérateurs matériels (GPU, AWS Inferentia, AWS Trainium, FPGA) : machine learning, graphisme, vidéo |
| **Calcul haute performance (HPC)** | Hpc | Grandes simulations étroitement couplées à grande échelle |

Format du nom : dans `c7g.xlarge`, `c` est la famille, `7` la génération, `g` une option (processeur AWS Graviton) et `xlarge` la taille. Les instances T sont **à performances extensibles** (burstable) : elles offrent une base de processeur et peuvent dépasser cette base, ce qui est économique pour des charges inactives la plupart du temps.

> **Piège d'examen.** « Optimisé pour le stockage » concerne l'accès rapide sur disque local à d'énormes jeux de données, pas le stockage bon marché de nombreux fichiers (c'est Amazon S3). « Optimisé pour la mémoire » sert au traitement en mémoire, pas à « plus de stockage ».

<!-- section: containers | objectives: 3.3.3 -->
## Options de conteneur

| Service | Rôle | Choisissez-le quand |
| --- | --- | --- |
| **Amazon Elastic Container Service (Amazon ECS)** | Le service d'orchestration de conteneurs entièrement géré d'AWS | Exécuter des conteneurs sur AWS avec l'outillage natif AWS le plus simple |
| **Amazon Elastic Kubernetes Service (Amazon EKS)** | Plan de contrôle Kubernetes géré | L'entreprise utilise déjà Kubernetes, ou veut son écosystème open source et sa portabilité |
| **Amazon Elastic Container Registry (Amazon ECR)** | Registre géré qui stocke les images de conteneurs | Stocker et partager des images Docker ou OCI en privé |
| **AWS Fargate** | Moteur de calcul sans serveur pour ECS et EKS : aucune instance EC2 à gérer | Des conteneurs sans serveurs ni clusters d'instances à corriger et à mettre à l'échelle |

ECS et EKS exécutent les conteneurs soit sur des instances EC2 que vous gérez (contrôle complet, types d'instance spécifiques, GPU), soit sur Fargate (AWS gère les serveurs).

> **Conseil d'examen.** « Kubernetes » dans l'énoncé mène à EKS. « Exécuter des conteneurs sans gérer de serveurs » mène à Fargate. ECR stocke les images ; il ne les exécute pas.

<!-- section: serverless | objectives: 3.3.4 -->
## Calcul sans serveur

**Sans serveur** (serverless) signifie aucun serveur à mettre en service ou à corriger, une mise à l'échelle automatique, une haute disponibilité intégrée et une tarification à l'usage.

| | AWS Lambda | AWS Fargate |
| --- | --- | --- |
| Unité | Une fonction (votre code) | Un conteneur (tâche ou pod) |
| Déclenché par | Des événements : chargements S3, requêtes API Gateway, messages SQS, planifications, flux DynamoDB | ECS ou EKS, qui démarrent les tâches et les maintiennent en fonctionnement |
| Durée | Jusqu'à 15 minutes par invocation | Services ou tâches de longue durée |
| Facturation | Par requête et par milliseconde de durée, selon la mémoire allouée | Pour les vCPU et la mémoire demandés par les tâches, pendant leur exécution |
| Usage typique | Redimensionner une image après chargement, traiter un message, back-end d'une API | Services web et API empaquetés en conteneurs |

La mémoire Lambda va de 128 Mo à 10 240 Mo ; le processeur est alloué proportionnellement à la mémoire.

> **Piège d'examen.** Une tâche qui dure une heure ne peut pas être une seule invocation Lambda (limite de 15 minutes) : choisissez Fargate, AWS Batch ou EC2.

<!-- section: auto-scaling | objectives: 3.3.5 -->
## La mise à l'échelle automatique apporte l'élasticité

L'**élasticité** est la capacité d'acquérir des ressources quand vous en avez besoin et de les libérer quand vous n'en avez plus besoin : la capacité suit la demande et vous ne payez que ce qui s'exécute.

**Amazon EC2 Auto Scaling** maintient un **groupe Auto Scaling** d'instances :

| Réglage | Signification |
| --- | --- |
| Capacité minimale | Jamais moins d'instances que ce nombre |
| Capacité souhaitée | Le nombre qui doit s'exécuter maintenant |
| Capacité maximale | Jamais plus que ce nombre, pour plafonner le coût |

- **Montée en charge horizontale** (scale out : ajouter des instances) quand la demande augmente, **réduction horizontale** (scale in : en retirer) quand elle baisse, selon des politiques de mise à l'échelle : suivi de cible (par exemple, maintenir le processeur moyen à 50 %), mise à l'échelle planifiée (pics connus), mise à l'échelle prédictive.
- Les vérifications de l'état remplacent automatiquement les instances défectueuses, ce qui améliore aussi la disponibilité.
- Les conteneurs, les tables DynamoDB et les réplicas Aurora peuvent aussi se mettre à l'échelle ; Lambda et Fargate évoluent sans aucune configuration de serveurs.

> **Piège d'examen.** Monter en charge **horizontalement** (scale out) ajoute des instances ; monter en charge **verticalement** (scale up) passe à une instance plus grande. Les groupes Auto Scaling ajoutent et retirent des instances ; l'élasticité, à l'examen, c'est suivre automatiquement la demande.

<!-- section: load-balancers | objectives: 3.3.6 -->
## Objectifs des équilibreurs de charge

**Elastic Load Balancing** répartit le trafic entrant entre plusieurs cibles (instances EC2, conteneurs, adresses IP, fonctions Lambda) dans une ou plusieurs zones de disponibilité.

Objectifs :

- **Répartir la charge** pour qu'aucun serveur ne soit submergé.
- **Vérifications de l'état** : n'envoyer le trafic qu'aux cibles saines.
- **Haute disponibilité** : des cibles dans plusieurs AZ ; si une AZ tombe en panne, le trafic va vers les autres.
- **Point d'entrée unique** : un seul nom DNS pour les clients pendant qu'Auto Scaling ajoute et retire des cibles.
- **Terminaison TLS** avec des certificats d'AWS Certificate Manager.

| Type | Couche | Usage |
| --- | --- | --- |
| **Application Load Balancer** | 7 (HTTP, HTTPS) | Applications web et microservices ; routage selon le chemin de l'URL ou le nom d'hôte |
| **Network Load Balancer** | 4 (TCP, UDP, TLS) | Très hautes performances, adresses IP statiques |
| **Gateway Load Balancer** | 3 (paquets IP) | Appliances virtuelles tierces, comme des pare-feu, insérées de façon transparente |

> **Conseil d'examen.** Un équilibreur de charge plus un groupe Auto Scaling sur deux AZ, c'est la réponse standard à « niveau web évolutif et hautement disponible ».

<!-- section: key-points -->
## Points clés

- EC2 pour un contrôle complet, Lightsail pour des serveurs simples à prix fixe, Elastic Beanstalk pour déployer du code, Batch pour les tâches par lots.
- Familles d'instances : usage général (M, T), calcul (C), mémoire (R, X), stockage (I, D), accéléré (P, G, Inf, Trn), HPC.
- ECS (orchestration AWS), EKS (Kubernetes), ECR (images), Fargate (conteneurs sans serveur).
- Lambda : fonctions pilotées par les événements, 15 minutes au maximum, facturées par requête et par milliseconde.
- Les groupes Auto Scaling (minimum, souhaité, maximum) apportent l'élasticité ; les équilibreurs de charge répartissent le trafic vers les cibles saines sur plusieurs AZ.
