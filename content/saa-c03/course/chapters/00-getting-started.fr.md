Le SAA-C03 est un examen de conception. Presque chaque question décrit une entreprise, son architecture actuelle et ses exigences, puis demande quelle solution AWS y répond. Vous ne tapez jamais de commande et ne suivez aucun chemin dans la console : vous choisissez le service, la fonctionnalité, la classe de stockage, la famille d'instances, l'option d'achat ou la topologie qui satisfait toutes les exigences énoncées. Ce chapitre présente le format, une méthode pour lire les questions à scénario, les principes qui départagent deux conceptions valides et les paires de services que l'examen vous demande de distinguer.

<!-- section: exam-format -->
## Le déroulement de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified Solutions Architect – Associate |
| Guide d'examen | Version 1.1 du 29 octobre 2026 |
| Durée | 130 minutes |
| Questions | 65 : 50 notées et 15 non notées, qui ne sont pas signalées |
| Score | Échelle de 100 à 1 000 ; 720 pour réussir |
| Modèle de notation | Compensatoire : seul le score total compte, il n'y a pas de seuil par domaine |
| Réponses fausses ou vides | Une question sans réponse compte comme fausse et il n'y a pas de pénalité pour une réponse au hasard : répondez toujours |
| Candidat visé | Environ un an d'expérience pratique de la conception de solutions sur AWS |

Les quatre domaines n'ont pas le même poids :

| Domaine | Poids |
| --- | --- |
| Conception d'architectures sécurisées | 30 % |
| Conception d'architectures résilientes | 26 % |
| Conception d'architectures hautement performantes | 24 % |
| Conception d'architectures optimisées en termes de coûts | 20 % |

Il n'existe que deux types de questions. Le **choix multiple** a une seule bonne réponse parmi quatre options (environ 80 % des questions). La **réponse multiple** se termine par « Choose two. » ou « Choose three. » et compte deux bonnes réponses parmi cinq options, ou trois parmi six ; elle ne rapporte le point que si toutes les réponses choisies sont correctes. Il n'y a ni étude de cas, ni série Oui/Non, ni liste déroulante, ni glisser-déposer, ni laboratoire.

> **Conseil d'examen.** Comme vous ne pouvez pas savoir quelles sont les 15 questions non notées, traitez chaque question comme si elle comptait. Les examens blancs Certidrill notent les 65 questions.

<!-- section: reading-questions -->
## Lire une question à scénario

Un énoncé compte deux à cinq phrases : une entreprise (« A media company », « AnyCompany »), ce qu'elle exécute aujourd'hui, ce dont elle a besoin, puis un qualificatif décisif et la question « Which solution will meet these requirements? ». Les quatre options sont des conceptions complètes, et deux ou trois d'entre elles fonctionneraient en général. Le qualificatif les départage. Procédez dans cet ordre :

1. Lisez d'abord les deux dernières phrases : le qualificatif et ce que vous devez choisir.
2. Relevez chaque exigence, y compris celles cachées dans le contexte (« l'application ne peut pas être modifiée », « les données doivent rester privées »).
3. Éliminez chaque option qui manque une exigence, même mineure.
4. Appliquez le qualificatif aux options restantes.

| Mots de l'énoncé | Ce qu'ils sélectionnent |
| --- | --- |
| « LEAST operational overhead » (le moins de charge opérationnelle) | Un service géré ou sans serveur, ou une fonctionnalité intégrée, plutôt que des instances EC2, des scripts ou du code personnalisé |
| « MOST cost-effective » (le plus rentable) | L'option la moins chère qui répond encore à toutes les exigences fonctionnelles : classe de stockage, option d'achat, bonne taille |
| « highest availability » (la plus haute disponibilité) | Plusieurs zones de disponibilité ; une deuxième Région seulement si l'énoncé évoque une panne régionale |
| « without changing the application code » (sans modifier le code) | Un service placé devant ou sous l'application : un proxy, un équilibreur de charge, un moteur géré du même type |
| « MOST secure » (le plus sécurisé) | Connectivité privée, rôles IAM au lieu de clés, chiffrement avec une clé gérée par le client, moindre privilège |
| « minimal downtime » (interruption minimale) | Réplication et basculement (migration gérée, blue/green, Multi-AZ) plutôt que sauvegarde et restauration |
| « least latency » pour des utilisateurs dans le monde entier | Services en périphérie : Amazon CloudFront pour le contenu HTTP, AWS Global Accelerator pour TCP ou UDP |
| « unpredictable » ou « unknown access pattern » (accès imprévisible ou inconnu) | Capacité à la demande ou à mise à l'échelle automatique, S3 Intelligent-Tiering, sans serveur |
| « decouple », « absorb spikes » (découpler, absorber les pics) | Une file d'attente (Amazon SQS) ou un bus d'événements entre les composants |
| RPO et RTO en minutes ou en heures | La stratégie de reprise après sinistre : sauvegarde et restauration, environnement de veille (pilot light), secours semi-automatique (warm standby) ou multisite actif/actif |

> **Piège d'examen.** « MOST cost-effective » ne l'emporte jamais sur une exigence fonctionnelle. Si la charge de travail exige une récupération en millisecondes, S3 Glacier Deep Archive est faux, aussi bon marché soit-il : c'est le distracteur prévu.

<!-- section: design-principles -->
## Les principes de conception que l'examen récompense

L'examen s'appuie sur l'AWS Well-Architected Framework. Ses six piliers expliquent la plupart des arbitrages entre deux conceptions qui fonctionnent :

| Pilier | Question posée | Réponse type |
| --- | --- | --- |
| Excellence opérationnelle | Peut-on déployer, observer et modifier sans étape manuelle ? | Infrastructure as code (AWS CloudFormation), services gérés, automatisation |
| Sécurité | Qui peut atteindre quoi, et les données sont-elles protégées ? | Rôles IAM, moindre privilège, sous-réseaux privés, chiffrement, journalisation |
| Fiabilité | Que se passe-t-il si une instance, une zone de disponibilité ou une Région tombe ? | Multi-AZ, groupes Auto Scaling, sauvegardes, basculement testé |
| Efficacité des performances | Chaque composant utilise-t-il le bon type et la bonne taille de ressource ? | Bases de données spécialisées, cache, services en périphérie, bonne famille d'instances |
| Optimisation des coûts | Paie-t-on quelque chose d'inutile ? | Bon dimensionnement, Savings Plans, Spot Instances, classes de stockage, règles de cycle de vie |
| Durabilité | Peut-on obtenir le même résultat avec moins de ressources ? | Services gérés, meilleur taux d'utilisation, instances basées sur Graviton |

Quand plusieurs options répondent à toutes les exigences, l'examen préfère en général, dans cet ordre : un service géré plutôt qu'un logiciel autogéré sur EC2, une fonctionnalité intégrée plutôt que du code personnalisé, un rôle IAM plutôt que des informations d'identification stockées, la mise à l'échelle horizontale plutôt qu'une instance unique plus grosse, et une conception sur plusieurs zones de disponibilité plutôt que sur une seule.

Certains services du périmètre sont fermés aux nouveaux clients ou ne sont plus pris en charge en novembre 2026 : AWS Data Pipeline, AWS Proton, les appareils AWS Snow Family (utilisez AWS DataSync ou AWS Data Transfer Terminal), les coffres Amazon Glacier (les classes de stockage S3 Glacier d'Amazon S3 ne sont pas concernées) et AWS Application Discovery Service. Certidrill n'en fait jamais une bonne réponse.

<!-- section: confusing-pairs -->
## Les services faciles à confondre

Les options d'une question viennent de la même famille. Retenez la différence en une ligne :

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Résilience des bases de données | RDS Multi-AZ, réplicas en lecture, Aurora Global Database | Multi-AZ sert la disponibilité (instance de secours, basculement automatique) ; les réplicas en lecture répartissent les lectures et peuvent se trouver dans une autre Région ; Aurora Global Database réplique vers d'autres Régions avec un basculement régional rapide |
| Messagerie | Amazon SQS, Amazon SNS, Amazon EventBridge, Amazon Kinesis Data Streams | Une file d'attente qu'un consommateur interroge ; une diffusion publication/abonnement en mode push ; un bus d'événements dont les règles acheminent les événements ; un flux ordonné que plusieurs consommateurs peuvent relire |
| Périphérie | Amazon CloudFront, AWS Global Accelerator | CloudFront met en cache le contenu HTTP et HTTPS dans les emplacements périphériques ; Global Accelerator fournit deux adresses IP anycast statiques et achemine TCP ou UDP sur le réseau AWS sans cache |
| Équilibreurs de charge | Application Load Balancer, Network Load Balancer, Gateway Load Balancer | Routage de couche 7 par chemin ou par hôte ; couche 4 à très haut débit avec adresses IP statiques ; insertion transparente d'appliances tierces |
| Filtrage réseau | Groupes de sécurité, listes ACL réseau | Les groupes de sécurité sont avec état, n'ont que des règles d'autorisation et s'attachent aux interfaces réseau ; les ACL réseau sont sans état, ont des règles d'autorisation et de refus et s'appliquent à un sous-réseau |
| Points de terminaison de VPC | Points de terminaison de passerelle, points de terminaison d'interface | Les points de terminaison de passerelle n'existent que pour Amazon S3 et DynamoDB, sont gratuits et passent par les tables de routage ; les points de terminaison d'interface (AWS PrivateLink) sont des interfaces réseau avec des adresses IP privées, facturées à l'heure |
| Garde-fous multicomptes | Politiques de contrôle des services, politiques IAM | Une SCP limite seulement les autorisations maximales des comptes membres ; seules les politiques IAM et les politiques de ressources accordent des autorisations |
| Options d'achat | On-Demand, Savings Plans, Reserved Instances, Spot Instances | Aucun engagement ; un engagement de dépense sur un ou trois ans ; un engagement sur une configuration d'instance ; de la capacité inutilisée à forte remise qui peut être interrompue |
| Stockage en mode bloc | EBS gp3, io2 Block Express, st1, sc1 | SSD à usage général dont les IOPS se règlent indépendamment de la taille ; IOPS et durabilité maximales pour les bases critiques ; HDD optimisé pour le débit des grandes lectures séquentielles ; HDD à froid, le moins cher |
| Stockage de fichiers | Amazon EFS, FSx for Windows File Server, FSx for Lustre, FSx for NetApp ONTAP | NFS pour Linux ; SMB avec Active Directory pour Windows ; système de fichiers pour le calcul haute performance ; fonctionnalités NetApp multiprotocoles |
| Transfert de données | AWS DataSync, AWS Storage Gateway, AWS Transfer Family | Tâches de copie et de migration en ligne ; accès hybride qui laisse les applications locales travailler sur le stockage AWS ; points de terminaison SFTP, FTPS et FTP gérés |
| Secrets | AWS Secrets Manager, Systems Manager Parameter Store | Secrets Manager effectue la rotation automatique des secrets ; Parameter Store stocke la configuration et des valeurs SecureString sans rotation |

<!-- section: study-plan -->
## Un plan de travail efficace

1. Lisez les chapitres dans l'ordre : les décisions de sécurité du premier module reviennent dans toutes les conceptions suivantes.
2. Ouvrez un compte AWS avec l'offre gratuite et construisez une petite application à trois niveaux sur deux zones de disponibilité : VPC, sous-réseaux, Application Load Balancer, groupe Auto Scaling et base RDS Multi-AZ rendent le vocabulaire concret.
3. Pour chaque famille de services, écrivez votre propre tableau « exigence, réponse » et comparez-le à celui du chapitre.
4. Après chaque domaine, passez un examen blanc, lisez chaque explication, y compris les raisons pour lesquelles les mauvaises options échouent, et relisez les sections liées à vos erreurs.
5. Réservez l'examen quand trois examens blancs de suite atteignent 800 ou plus, sur des questions que vous n'aviez jamais vues.
