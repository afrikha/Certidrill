Le SAP-C03 est l'examen d'architecte pour les organisations complexes. Chaque question décrit une entreprise avec plusieurs comptes, Régions ou unités métier, son patrimoine existant et un ensemble de contraintes, puis demande la conception qui les satisfait toutes. La connaissance de niveau associé de chaque service est supposée acquise ; ce qui est évalué, c'est l'arbitrage entre plusieurs conceptions qui fonctionneraient toutes, tranché par un qualificatif ou par une contrainte enfouie dans l'énoncé. Ce chapitre présente le format, une méthode de lecture des énoncés longs, les principes qui départagent les options, les pièges liés au statut des services en novembre 2026 et les paires d'options que l'examen oppose.

<!-- section: exam-format -->
## Le format de l'examen

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified Solutions Architect – Professional |
| Version de l'examen | SAP-C03, en service depuis le 17 novembre 2026 (le SAP-C02 était utilisé jusqu'au 16 novembre 2026) |
| Durée | 180 minutes |
| Questions | 75 : 65 notées et 10 non notées, qui ne sont pas signalées |
| Score | Échelle de 100 à 1 000 ; 720 pour réussir |
| Modèle de notation | Compensatoire : seul le score global compte, aucun minimum par domaine |
| Prix et passage | 300 USD ; centre de test Pearson VUE ou en ligne sous surveillance |
| Langues | Anglais, japonais, coréen, portugais (Brésil), chinois simplifié, espagnol (Amérique latine) ; pas de version française |

Les cinq domaines ont été reconstruits pour le SAP-C03 :

| Domaine | Poids | Module du cours |
| --- | --- | --- |
| Conception et mise en œuvre d'architectures conçues pour le cloud | 25 % | Chapitres 11 à 16 |
| Sécurité, conformité et gouvernance | 25 % | Chapitres 21 à 25 |
| Conception d'architectures optimisées en coûts | 15 % | Chapitres 31 à 34 |
| Résilience, migration et continuité des activités | 15 % | Chapitres 41 à 43 |
| Excellence opérationnelle et automatisation | 20 % | Chapitres 51 à 54 |

Par rapport au SAP-C02, le guide ajoute l'IA générative (Amazon Bedrock, AgentCore, RAG, garde-fous), la cryptographie post-quantique, la résidence des données, IPv6, le lakehouse, le maillage de services, la mutualisation (multi-tenancy), le DevSecOps, les SLO et l'ingénierie du chaos avec AWS Fault Injection Service. Il retire l'IoT, l'informatique pour l'utilisateur final, les services multimédias, Lightsail, Amazon SES, Amplify, App Runner, AWS Batch, AWS Proton et Service Catalog.

Il existe deux types de questions. Le **choix multiple** propose quatre options et une seule bonne réponse. La **réponse multiple** se termine par « Choose two. » ou « Choose three. » et propose cinq ou six options ; toutes les réponses choisies doivent être correctes pour obtenir le point. Il n'y a ni étude de cas, ni glisser-déposer, ni laboratoire.

> **Conseil d'examen.** Vous disposez d'environ 2 minutes 24 secondes par question, et les énoncés sont longs. Répondez à toutes les questions au premier passage, marquez celles qui vous font douter et gardez 20 minutes pour y revenir ; une réponse vide compte autant qu'une réponse fausse. Les examens blancs Certidrill notent les 75 questions.

<!-- section: reading-questions -->
## Lire un scénario de niveau professionnel

Un énoncé compte cinq à dix phrases : une organisation (« AnyCompany ») avec des comptes, des Régions ou des filiales, ce qu'elle exécute aujourd'hui, le changement voulu, des contraintes (conformité, budget, compétences de l'équipe, échéance), puis un qualificatif et « Which solution will meet these requirements? ». Les quatre options sont des conceptions complètes à plusieurs services ; chaque mauvaise option manque exactement une contrainte, souvent mineure.

1. Lisez d'abord la question finale et le qualificatif.
2. Relevez les contraintes fermes : nombre de comptes et de Régions, résidence des données, maîtrise des clés de chiffrement, RPO et RTO, interruption tolérée, « aucune modification du code », compétences existantes.
3. Pour chaque option, trouvez la contrainte qu'elle viole ; éliminez-la même si elle est élégante par ailleurs.
4. Entre les options restantes, appliquez le qualificatif.
5. Pour « Choose two » ou « Choose three », vérifiez que les options choisies fonctionnent ensemble et que chacune est nécessaire.

| Mots de l'énoncé | Ce qu'ils sélectionnent en général |
| --- | --- |
| « LEAST operational overhead » (le moins de charge opérationnelle) | Services gérés ou sans serveur, fonctionnalités intégrées, contrôles appliqués une fois pour toute l'organisation, plutôt que des scripts, des flottes EC2 ou une configuration par compte |
| « MOST cost-effective » (le plus rentable) | La conception la moins chère qui respecte encore toutes les exigences : Savings Plans pour l'usage régulier, Spot pour le travail interruptible, niveaux de stockage, suppression des transferts de données |
| « lowest RPO » ou « lowest RTO » (RPO ou RTO le plus faible) | Réplication continue et environnement de secours en marche (warm standby, actif-actif) plutôt que des sauvegardes |
| « without changing the application code » (sans modifier le code) | Un changement autour de l'application : proxy, équilibreur de charge, DNS, moteur géré du même type, réhébergement |
| « across all accounts », « including future accounts » (tous les comptes, y compris les futurs) | Contrôles au niveau d'Organizations : SCP, RCP, administrateurs délégués, contrôles Control Tower, StackSets avec déploiement automatique |
| « must not leave the Region » ou « the EU » (ne doit pas quitter la Région ou l'UE) | Ressources régionales, profils géographiques, SCP qui refusent les autres Régions |
| « the team has no experience with X » (l'équipe ne connaît pas X) | Éviter X même s'il convient techniquement (par exemple EKS pour une équipe sans compétences Kubernetes) |
| « minimal downtime » pendant une migration (interruption minimale) | Réplication puis basculement (AWS Transform MGN, AWS DMS avec réplication continue, blue/green) |

> **Piège d'examen.** Au niveau professionnel, les distracteurs sont rarement de mauvais services ; ce sont de bons services configurés à la mauvaise portée. Une SCP attachée au compte de gestion, un garde-fou créé dans une seule Région pour une charge de travail multi-Régions ou une politique qui couvre les comptes existants mais pas les nouveaux violent tous une contrainte énoncée.

<!-- section: design-principles -->
## Les principes qui départagent des conceptions valides

L'AWS Well-Architected Framework reste la référence, lue à l'échelle de l'organisation :

| Pilier | Question de niveau professionnel | Réponse type |
| --- | --- | --- |
| Excellence opérationnelle | Peut-on gouverner et modifier des centaines de comptes de façon cohérente ? | Infrastructure as code, StackSets, Control Tower, runbooks automatisés, observabilité avec des SLO |
| Sécurité | L'accès respecte-t-il partout le moindre privilège, y compris pour les tiers et les nouveaux comptes ? | IAM Identity Center, SCP et RCP, administrateurs délégués, chiffrement avec des clés gérées par le client, journalisation centralisée |
| Fiabilité | Qu'est-ce qui survit à la panne d'une zone de disponibilité ou d'une Région, et à quelle vitesse la reprise a-t-elle lieu ? | Multi-AZ par défaut, multi-Régions quand le RTO et le RPO l'exigent, basculement testé, expériences de chaos |
| Efficacité des performances | Chaque charge de travail est-elle sur le bon moteur et près de ses utilisateurs ? | Bases de données spécialisées, cache, services en périphérie, conteneurs ou sans serveur |
| Optimisation des coûts | Les dépenses sont-elles visibles par équipe et réduites sans casser les exigences ? | Balisage et catégories de coûts, Savings Plans, bon dimensionnement avec Compute Optimizer, conception des transferts de données |
| Durabilité | Peut-on obtenir le résultat avec moins de ressources ? | Services gérés, Graviton, meilleur taux d'utilisation |

Les critères de départage que l'examen applique de façon constante : un contrôle appliqué une fois à l'organisation l'emporte sur le même contrôle répété par compte ; un service géré l'emporte sur un logiciel autogéré ; des informations d'identification temporaires issues de rôles l'emportent sur des clés à long terme ; la connectivité privée l'emporte sur les chemins par Internet ; l'automatisation l'emporte sur les runbooks manuels ; et une conception qui répond exactement à l'exigence l'emporte sur une conception qui en fait plus pour plus cher.

AWS fait aussi évoluer son catalogue. En novembre 2026, Certidrill n'en fait jamais une bonne réponse :

| Service | Statut | À utiliser à la place |
| --- | --- | --- |
| AWS Migration Hub, AWS Application Discovery Service | Fermés aux nouveaux clients depuis le 7 novembre 2025 | AWS Transform pour la découverte, l'évaluation et la planification |
| Appareils AWS Snow Family | Plus proposés aux nouveaux clients | AWS DataSync, AWS Data Transfer Terminal, AWS Outposts |
| AWS OpsWorks | Fin de vie | Systems Manager, CloudFormation, gestion de configuration sur EC2 |
| AWS App Mesh | Arrêté le 30 septembre 2026 | Amazon ECS Service Connect, Amazon VPC Lattice |
| Amazon Q Developer | Nouvelles inscriptions fermées le 15 mai 2026 | Kiro |

Des noms ont aussi changé : AWS Application Migration Service s'appelle désormais **AWS Transform MGN** ; Amazon QuickSight (que le guide écrit encore) s'appelle désormais **Amazon Quick**. AWS CodeCommit a rouvert aux nouveaux clients le 25 novembre 2025 et constitue une réponse valide. Le délai maximal d'une fonction Lambda est désormais de 30 minutes (1 800 secondes), et les fonctions durables s'exécutent jusqu'à un an.

<!-- section: confusing-pairs -->
## Les familles d'options que l'examen oppose

| Famille | Options | Ce qui les distingue |
| --- | --- | --- |
| Garde-fous d'organisation | SCP, RCP, limites d'autorisations (permissions boundaries), politiques IAM | Les SCP plafonnent ce que peuvent faire les principaux des comptes membres ; les RCP plafonnent ce qui peut être fait aux ressources des comptes membres, y compris par des principaux externes ; aucune ne s'applique au compte de gestion et aucune n'accorde quoi que ce soit ; une limite d'autorisations plafonne un rôle ou un utilisateur ; seules les politiques IAM et de ressources accordent |
| Accès aux comptes | IAM Identity Center, rôles entre comptes avec ID externe | Identity Center donne aux utilisateurs de l'entreprise l'authentification unique sur de nombreux comptes ; un tiers endosse un rôle dans votre compte avec un ID externe pour éviter le problème de l'adjoint confus (confused deputy) |
| Connectivité entre VPC | Appairage de VPC, Transit Gateway, PrivateLink, VPC Lattice, Cloud WAN | Appairage : un à un, non transitif, pas de CIDR qui se chevauchent ; Transit Gateway : hub régional avec tables de routage pour la segmentation ; PrivateLink : expose un service, CIDR qui se chevauchent acceptés ; VPC Lattice : service à service avec authentification IAM entre comptes ; Cloud WAN : réseau mondial géré par une politique de réseau central |
| Connectivité hybride | Direct Connect, Site-to-Site VPN | Direct Connect : privé, bande passante régulière, non chiffré par défaut ; VPN : chiffré sur Internet, rapide à mettre en place, souvent utilisé en secours de Direct Connect |
| DNS hybride | Points de terminaison entrants et sortants de Route 53 Resolver | Entrants : les résolveurs locaux interrogent les zones privées AWS ; sortants avec règles de transfert : les VPC résolvent les domaines locaux |
| Reprise après sinistre | Sauvegarde et restauration, pilot light, warm standby, multisite actif-actif | De la moins chère au RTO et RPO les plus longs à la plus chère au RTO et RPO quasi nuls ; AWS Elastic Disaster Recovery réplique les serveurs en continu et les lance à la demande |
| Données multi-Régions | Aurora Global Database, tables globales DynamoDB, S3 Replication | Une Région d'écriture avec basculement rapide entre Régions ; écritures multi-actives dans chaque Région ; copies d'objets asynchrones, avec Replication Time Control pour un objectif de 15 minutes |
| Migration | AWS Transform MGN, AWS DMS avec AWS SCT, AWS Transform | Réhéberger des serveurs par réplication au niveau des blocs ; migrer des bases de données en convertissant les schémas entre moteurs ; découverte, évaluation et modernisation |
| Transfert de données | DataSync, Transfer Family, Storage Gateway | Copies planifiées ou ponctuelles entre systèmes de stockage ; points de terminaison SFTP, FTPS, FTP et AS2 gérés pour les partenaires ; applications locales qui utilisent le stockage AWS par un cache local |
| Achat | Compute Savings Plans, EC2 Instance Savings Plans, instances réservées, Spot | Engagement de dépense souple sur EC2, Fargate et Lambda ; remise plus forte liée à une famille d'instances dans une Région ; engagement pour les services sans couverture Savings Plans ou avec un besoin de réservation de capacité ; capacité inutilisée pour le travail interruptible |
| Flux de travail et conteneurs | Step Functions ou fonctions durables Lambda ; ECS ou EKS | Flux de travail sous forme de machine à états gérée ou de code avec points de contrôle ; orchestration propre à AWS avec le moins de charge, ou Kubernetes pour les compétences existantes et la portabilité |

<!-- section: study-plan -->
## Plan de travail

1. Lisez les modules dans l'ordre : l'architecture construit le vocabulaire, que la sécurité, les coûts, la résilience et l'exploitation réutilisent à l'échelle de l'organisation.
2. Construisez un petit environnement multicomptes : AWS Organizations avec quelques OU, IAM Identity Center, une SCP, une règle EventBridge entre comptes et un réseau de services VPC Lattice partagé. Supprimez tout ensuite.
3. Pour chaque chapitre, réécrivez de mémoire ses tableaux de décision sous la forme « exigence, puis conception » ; l'examen pose la même décision avec d'autres mots.
4. Passez un examen blanc après chaque module ; pour chaque question, y compris celles que vous avez réussies, expliquez quelle contrainte précise chaque mauvaise option viole.
5. Réservez l'examen quand trois examens blancs complets de 75 questions de suite atteignent 800 ou plus en 180 minutes, sur des questions que vous n'aviez jamais vues.
