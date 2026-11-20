Ce chapitre couvre trois petites familles du guide d'examen : l'intégration d'applications (Amazon SQS, Amazon SNS, Amazon EventBridge), les applications professionnelles (Amazon Connect, Amazon SES) et l'accompagnement des clients (AWS Support et les autres formes d'aide d'AWS). Les questions donnent un besoin en une phrase (« découpler », « notifier », « réagir à un événement », « centre de contact », « envoyer des e-mails », « obtenir de l'aide ») et demandent le service ou l'option qui y répond.

<!-- section: integration-services | objectives: 3.8.1 -->
## Services d'intégration d'applications

Les services d'intégration permettent aux composants d'une application d'échanger des informations sans s'appeler directement. Chaque composant peut alors tomber en panne, évoluer ou changer de son côté : c'est le **couplage faible** (loose coupling).

| Service | Modèle | Ce qu'il fait |
| --- | --- | --- |
| **Amazon SQS** (Simple Queue Service) | File d'attente, **pull** | Stocke les messages jusqu'à ce qu'un consommateur les interroge, les traite et les supprime. Chaque message est traité par un seul consommateur. La file absorbe les pics et conserve le travail quand le consommateur est lent ou hors ligne |
| **Amazon SNS** (Simple Notification Service) | Publication/abonnement, **push** | Un éditeur envoie un message à une **rubrique** (topic) ; SNS pousse une copie à chaque abonné : files d'attente SQS, fonctions AWS Lambda, points de terminaison HTTP ou HTTPS, adresses e-mail, SMS, notifications push mobiles |
| **Amazon EventBridge** | Bus d'événements, **règles** | Reçoit des **événements** des services AWS, de vos applications et des applications SaaS partenaires ; des règles filtrent les événements selon leur contenu et les acheminent vers des cibles (Lambda, SQS, SNS, Step Functions...). EventBridge Scheduler exécute des tâches selon une planification |
| **AWS Step Functions** | Flux de travail | Coordonne plusieurs étapes dans l'ordre, avec branchements, nouvelles tentatives et gestion des erreurs |

Points testés à l'examen :

- **Types de files SQS.** Les files standard livrent au moins une fois, dans un ordre approximatif, avec un débit quasi illimité. Les files **FIFO** respectent l'ordre exact et traitent chaque message exactement une fois.
- **Conservation.** SQS conserve un message 4 jours par défaut, jusqu'à 14 jours. Un message qui échoue de façon répétée peut aller dans une **file d'attente de lettres mortes** (dead-letter queue) pour analyse.
- **Diffusion (fan-out).** Une rubrique SNS et plusieurs files SQS : un message atteint plusieurs systèmes indépendants, chacun avec sa propre mémoire tampon.
- **Sans serveur.** Les quatre services sont entièrement gérés : aucun serveur à provisionner, paiement à l'usage.

> **Piège d'examen.** SQS et SNS relèvent tous deux de la « messagerie », mais SQS **conserve** les messages pour un consommateur qui vient les chercher, alors que SNS **pousse** immédiatement chaque message à tous les abonnés et ne conserve rien. « Mettre les commandes en attente jusqu'à ce que le back-end soit prêt » relève de SQS ; « prévenir plusieurs systèmes à la fois » relève de SNS.

<!-- section: messaging-choice | objectives: 3.8.8 -->
## Choisir un service pour les messages, alertes et notifications

| Exigence | Service |
| --- | --- |
| Découpler un niveau web d'un niveau de traitement lent ; ne jamais perdre une requête | Amazon SQS |
| Traiter les commandes dans l'ordre exact où elles ont été passées | File d'attente FIFO Amazon SQS |
| Envoyer le même message à plusieurs applications à la fois (fan-out) | Rubrique Amazon SNS, avec des files SQS abonnées |
| Envoyer une alerte par SMS ou par e-mail à l'équipe d'exploitation quand une alarme CloudWatch se déclenche | Amazon SNS (l'action de l'alarme publie dans une rubrique) |
| Envoyer des notifications push vers des appareils mobiles | Amazon SNS |
| Démarrer une fonction Lambda quand une instance EC2 change d'état ou qu'un nouvel objet arrive dans S3, en filtrant sur le contenu de l'événement | Règle Amazon EventBridge |
| Recevoir des événements d'une application SaaS (par exemple un CRM ou un prestataire de paiement) | Amazon EventBridge (source d'événements partenaire) |
| Exécuter une tâche chaque nuit à 2 h | Amazon EventBridge Scheduler |
| Enchaîner plusieurs étapes avec nouvelles tentatives et approbation humaine | AWS Step Functions |

> **Conseil d'examen.** La chaîne d'alerte est CloudWatch (métrique et alarme) → SNS (rubrique) → e-mail, SMS ou point de terminaison d'un outil de tickets. CloudWatch détecte ; SNS diffuse.

<!-- section: business-applications | objectives: 3.8.2, 3.8.9 -->
## Applications professionnelles : Amazon Connect et Amazon SES

| Service | Ce que c'est | Usage type |
| --- | --- | --- |
| **Amazon Connect** | **Centre de contact** dans le cloud : téléphone (voix) et chat avec les clients, flux de contacts (serveur vocal interactif), routage vers les agents, enregistrement, analytique. Paiement à l'usage, sans matériel ni engagement long | Mettre en place un service client en quelques minutes ; ajuster le nombre d'agents à la demande saisonnière ; router les appels selon les compétences |
| **Amazon SES** (Simple Email Service) | Service d'**e-mail** dans le cloud pour les applications : envoi par l'API SES ou SMTP, réception d'e-mails, authentification de l'expéditeur (DKIM, SPF, DMARC), tableaux de bord de réputation | E-mails transactionnels (confirmations de commande, réinitialisations de mot de passe), e-mails marketing et en masse, réception d'e-mails dans une application |

Règles de décision :

- « Service client », « centre d'appels », « serveur vocal interactif », « agents qui répondent aux appels et aux chats » : **Amazon Connect**.
- « L'application doit envoyer des e-mails personnalisés aux clients », « lettres d'information », « gros volumes d'e-mails » : **Amazon SES**.
- « Prévenir par e-mail des administrateurs abonnés quand un événement survient » : abonnements e-mail **Amazon SNS**. L'e-mail SNS sert à de simples notifications à des personnes qui ont confirmé leur abonnement ; SES envoie des e-mails entièrement mis en forme depuis votre domaine à n'importe quel destinataire.

> **Piège d'examen.** Amazon Connect n'est pas un service réseau (malgré le nom proche d'AWS Direct Connect) ni un outil de création de chatbots : c'est Amazon Lex qui crée les bots conversationnels qu'un flux de contacts Connect peut utiliser.

<!-- section: customer-enablement | objectives: 3.8.3 -->
## Services d'accompagnement des clients

L'accompagnement des clients (Customer Enablement) regroupe les moyens par lesquels AWS aide ses clients à utiliser le cloud, au-delà des services eux-mêmes :

| Option | Ce qu'elle offre |
| --- | --- |
| Plans **AWS Support** | Basic (inclus dans chaque compte), AWS Business Support+, AWS Enterprise Support, AWS Unified Operations ; aide technique d'ingénieurs AWS, vérifications Trusted Advisor, délais de réponse selon la gravité |
| **Support compte et facturation** | Inclus pour tous les clients, sans frais, dans tous les plans |
| **AWS re:Post** | Site communautaire de questions-réponses, avec des réponses de la communauté et d'experts AWS, plus les articles du Knowledge Center |
| **AWS Professional Services** | Consultants AWS qui travaillent sur votre projet (migration, modernisation) avec votre équipe |
| **Partenaires AWS** | Cabinets de conseil et éditeurs de logiciels tiers validés par AWS |
| **AWS Training and Certification** | Cours (AWS Skill Builder), formations en classe et certifications |

Le chapitre 43 détaille les plans Support et le chapitre 44 les partenaires et l'assistance technique.

<!-- section: support-choice | objectives: 3.8.10 -->
## Choisir la bonne assistance

| Besoin | Option |
| --- | --- |
| Une question sur une facture, un frais ou un compte | Support compte et facturation (gratuit, tous les plans) |
| Une augmentation de quota de service | Demande d'augmentation de quota (possible avec Basic Support) |
| Une question pratique à laquelle la communauté répond, sans frais | AWS re:Post |
| Un accès 24 h/24 et 7 j/7 aux ingénieurs du support cloud par téléphone, chat et web pour des charges de production, au coût le plus bas | AWS Business Support+ |
| Un Technical Account Manager (TAM) désigné et une réponse en 15 minutes pour un système critique en panne | AWS Enterprise Support |
| Une réponse en 5 minutes d'un ingénieur de gestion des incidents, un TAM désigné et des ingénieurs spécialistes du domaine | AWS Unified Operations |
| Des experts pour mener un projet de migration avec votre équipe | AWS Professional Services ou un partenaire AWS |

> **Piège d'examen.** Avec Basic Support, vous pouvez ouvrir des demandes sur le compte, la facturation et les quotas de service, mais **pas de demandes de support technique**. Toute exigence « ouvrir une demande technique auprès d'ingénieurs AWS » impose un plan payant.

<!-- section: key-points -->
## Points clés

- SQS : file d'attente, pull, un consommateur par message, standard ou FIFO, conservation 4 jours par défaut et 14 jours au maximum.
- SNS : rubrique, push vers chaque abonné (SQS, Lambda, HTTP, e-mail, SMS, push mobile) ; fan-out avec SQS.
- EventBridge : bus d'événements et règles qui acheminent les événements des services AWS, de vos applications et des partenaires SaaS ; Scheduler pour les planifications.
- Alarme CloudWatch → rubrique SNS : le chemin d'alerte standard.
- Amazon Connect : centre de contact dans le cloud. Amazon SES : e-mail applicatif à grande échelle.
- Accompagnement des clients : plans Support, support compte et facturation, re:Post, Professional Services, partenaires, formation.
- Basic Support : pas de demande technique. Business Support+ : ingénieurs 24 h/24 et 7 j/7. Enterprise Support : TAM désigné. Unified Operations : réponse critique en 5 minutes.
