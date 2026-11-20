Une question de migration de niveau professionnel décrit un portefeuille, pas un serveur : des centaines d'applications réparties entre centres de données et unités métier, une échéance contractuelle et des équipes peu formées au cloud. SAP-C03 demande comment découvrir et regrouper ce portefeuille, lequel des 7 R convient à chaque charge de travail, quel service AWS déplace les serveurs, les bases de données et les fichiers, et comment moderniser un monolithe ou un mainframe sans « big bang » risqué. AWS Transform est désormais le point d'entrée de la découverte, de la planification et de la modernisation.

<!-- section: discovery-waves | objectives: 4.1.1 -->
## Découverte, évaluation et planification des vagues

La découverte répond à trois questions : ce qui tourne où, ce qui dépend de quoi, et ce que cela devrait coûter sur AWS. Chaque source fournit une partie de la réponse :

| Source | Ce qu'elle fournit | Ce qui lui manque |
| --- | --- | --- |
| Export RVTools, export pour vCenter | Inventaire des VM, dimensionnement, business case indicatif rapide | Connexions réseau, moteurs et éditions de base de données |
| Outil de découverte AWS Transform (discovery tool) | Inventaire depuis VMware vCenter, Microsoft Hyper-V ou des serveurs importés ; serveurs, bases de données et connexions réseau ; détails Oracle par SQL si des identifiants sont fournis | Connexions des serveurs qu'il ne peut pas joindre avec des identifiants de système d'exploitation |
| Extraits de CMDB, feuilles de calcul | Définitions des applications, propriétaires | Utilisation réelle et connexions |
| Questionnaire aux propriétaires d'applications | Fonction métier, criticité, emplacement, objectifs de récupération | Données techniques |

L'**outil de découverte AWS Transform** tourne sous Amazon Linux 2023, sous forme d'appliance OVA sur vCenter, de VHD sur Hyper-V ou d'installateur autonome sur un serveur Linux existant. Il joint les serveurs Windows par WinRM et les serveurs Linux par SSH, et exporte des fichiers Migration Portfolio Assessment (MPA).

L'**évaluation de migration AWS Transform (migration assessment)** transforme un inventaire (RVTools, export de l'outil de découverte, CMDB, fichiers Migration Evaluator ou MPA) en business case de coût total de possession (TCO) : instances EC2 les mieux adaptées (Graviton, Dedicated Hosts, plusieurs modèles de tarification), SQL Server sur RDS ou EC2 avec analyse des licences, stockage EBS, S3 ou FSx for NetApp ONTAP, et MSK Express pour Kafka autogéré. Elle ne cartographie **pas** les dépendances : AWS Transform regroupe les applications dépendantes pendant la **planification de la migration (migration planning)**.

Règles de planification des vagues attendues à l'examen :

- Constituez des **groupes de déplacement (move groups)** d'applications qui partagent une base de données, une file d'attente de messages, un niveau de criticité, un emplacement ou un propriétaire ; gardez chaque groupe dans une seule vague.
- Migrez les environnements hors production avant la production.
- Sans données de connexion, chaque application est planifiée seule : confirmez les dépendances avec les propriétaires avant de séparer deux systèmes qui communiquent.
- Relevez le RTO et le RPO cibles de chaque application pendant la découverte : ils orientent ensuite la conception de la reprise après sinistre.

> **Piège d'examen.** AWS Migration Hub et AWS Application Discovery Service n'acceptent plus de nouveaux clients (depuis le 7 novembre 2025). Pour un nouveau chantier de découverte et de planification, la réponse est AWS Transform, pas l'agent de découverte ni la planification des vagues de Migration Hub.

<!-- section: seven-rs | objectives: 4.1.1, 4.1.4, 4.1.5 -->
## Les 7 R comme décisions de portefeuille

| Stratégie | Ce qui change | Déclencheur typique dans l'énoncé |
| --- | --- | --- |
| Retirer (retire) | Application décommissionnée ou archivée | Système en double ou inutilisé découvert pendant l'inventaire |
| Conserver (retain) | Reste dans l'environnement source pour l'instant | Matériel récent, dépendance non résolue, contrainte réglementaire |
| Réhéberger (rehost, lift and shift) | Rien dans l'application | Échéance de sortie du centre de données, grand nombre de serveurs |
| Déplacer (relocate) | Transfert vers une version cloud de la même plateforme, de nombreux serveurs à la fois | Même hyperviseur ou plateforme sur AWS, instance RDS déplacée vers un autre VPC ou compte |
| Racheter (repurchase, drop and shop) | Remplacée par un autre produit ou un SaaS | CRM ou SIRH disposant d'un équivalent SaaS |
| Changer de plateforme (replatform, lift, tinker and shift) | Quelques optimisations, même architecture de base | Base de données autogérée vers RDS, VM vers conteneurs |
| Refactoriser ou réarchitecturer (refactor, re-architect) | Architecture repensée avec des fonctionnalités natives du cloud | Mise à l'échelle ou agilité inaccessible avec la conception actuelle |

Les recommandations AWS pour les grandes migrations privilégient le réhébergement, le déplacement, le changement de plateforme et le retrait, et ne refactorisent que si les autres options sont inacceptables : modernisez **après** la migration, une fois le centre de données fermé.

> **Conseil d'examen.** Une échéance fixe (« le contrat d'hébergement se termine dans 6 mois ») associée à « modifications minimales » désigne un réhébergement immédiat et une modernisation ultérieure. « Réduire la charge opérationnelle de la base de données » sans toucher au code de l'application désigne un changement de plateforme.

<!-- section: rehost | objectives: 4.1.2 -->
## Réhébergement avec AWS Transform MGN

**AWS Transform MGN** (MGN, anciennement AWS Application Migration Service) migre des serveurs physiques, virtuels et cloud, Windows et Linux, vers EC2 dans une Région, une zone locale (Local Zone) ou un Outpost. Le cycle de vie :

1. Installez l'**AWS Replication Agent** sur chaque serveur source (le connecteur MGN peut vérifier les prérequis et installer l'agent sur de nombreux serveurs).
2. MGN lance des **serveurs de réplication** légers dans un **sous-réseau de zone intermédiaire (staging area subnet)** du compte cible. L'agent lit chaque volume au niveau bloc, puis réplique chaque écriture en continu.
3. **Modèle de réplication (replication template)** : type d'instance du serveur de réplication, sous-réseau intermédiaire, stockage cible. **Modèle de lancement (launch template)** (valeur par défaut du compte, modifiable par serveur) : type d'instance, sous-réseau, groupes de sécurité. **Actions post-lancement (post-launch actions)** : conversion du système d'exploitation, changements de licences et d'abonnements, configuration de la reprise après sinistre.
4. Lancez une **instance de test**, validez, puis marquez le serveur prêt pour la bascule. Chaque nouveau test remplace le précédent.
5. Lancez l'**instance de bascule (cutover instance)** dans une fenêtre courte, arrêtez la source, finalisez la bascule et archivez le serveur source.
6. Regroupez les serveurs en **applications** et les applications en **vagues** pour lancer, basculer et archiver en masse.

```bash
aws mgn create-wave --name wave-03-finance
aws mgn start-test --source-server-ids s-1234567890abcdef0 s-0fedcba0987654321
aws mgn start-cutover --source-server-ids s-1234567890abcdef0 s-0fedcba0987654321
aws mgn finalize-cutover --source-server-id s-1234567890abcdef0
```

**AWS Transform** se place au-dessus de MGN pour les grands programmes VMware, Hyper-V ou bare metal : des agents d'IA réalisent la découverte, la planification de la migration, la **migration réseau** (traduire la configuration réseau source en architecture VPC et la déployer), la création de la **zone d'atterrissage (landing zone)** (socle multicompte avec contrôles de gouvernance) et le **réhébergement des serveurs** avec des flux guidés de réplication, de test et de bascule. AWS Transform n'entraîne aucun coût supplémentaire.

> **Piège d'examen.** La réplication sans agent de MGN par instantanés, via le MGN vCenter Client, n'est plus disponible pour les nouveaux déploiements ; la réponse est la réplication avec agent, qui offre la protection continue des données et la fenêtre de bascule la plus courte. Une instance de bascule ne reçoit pas les modifications faites sur la source après son lancement : arrêtez d'abord les écritures sur la source.

<!-- section: data-migration | objectives: 4.1.3 -->
## Migration des bases de données et des données

**AWS DMS** copie les données entre moteurs (homogènes ou entièrement hétérogènes) avec trois types de tâches : **chargement complet (full load)**, **chargement complet plus CDC** (données existantes, puis modifications continues) et **CDC seule** (cible déjà chargée, par exemple depuis une sauvegarde native). La CDC lit les journaux de la source par les API natives ; les prérequis varient selon le moteur : journalisation supplémentaire Oracle, journalisation binaire au niveau ligne MySQL, emplacements de réplication logique PostgreSQL, sauvegardes activées sur les sources RDS avec des journaux conservés assez longtemps (24 heures suffisent généralement). Un point de départ CDC est un horodatage ou une position native (SCN, LSN, fichier et position binlog) et ne peut plus être modifié après la création de la tâche. La CDC n'a pas de SLA de latence.

| Besoin | Option DMS |
| --- | --- |
| Aucune instance de réplication à dimensionner ou à corriger | DMS Serverless : capacité calculée à partir des métadonnées de la source, paiement à l'usage |
| Même moteur vers RDS ou Aurora avec les outils natifs (dump et restauration) | Migrations de données homogènes (homogeneous data migrations) : sans serveur, projet de migration avec fournisseurs de données et profil d'instance ; aucune validation des données intégrée |
| Moteur différent (Oracle vers Aurora PostgreSQL, SQL Server vers Aurora MySQL) | DMS Schema Conversion (géré) ou AWS Schema Conversion Tool (poste de travail) pour le schéma et le code, puis DMS pour les données |
| Inventaire des serveurs de bases de données sur site | DMS Fleet Advisor |
| Faire tourner les deux systèmes pendant une période de coexistence | Tâches bidirectionnelles avec prévention des boucles ; pas de détection des conflits, donc attribuez la propriété des écritures par table |

Données de fichiers et d'objets :

| Exigence | Service |
| --- | --- |
| Copie ponctuelle ou planifiée de NFS, SMB, HDFS ou stockage objet (y compris d'autres clouds) vers S3, EFS ou FSx, avec chiffrement et validation de l'intégrité | AWS DataSync (agent sur site ; mode Enhanced pour un nombre d'objets quasi illimité, listage et transfert en parallèle) |
| Des partenaires continuent d'envoyer des fichiers en SFTP, FTPS, FTP ou AS2 vers S3 ou EFS | AWS Transfer Family |
| Des applications sur site continuent d'utiliser des protocoles de fichiers, de volumes ou de bandes avec un stockage cloud derrière | AWS Storage Gateway (S3 File Gateway, Volume Gateway, Tape Gateway) |
| Réseau trop lent pour le volume et l'échéance | AWS Data Transfer Terminal : apportez vos propres appareils dans un site AWS raccordé au réseau |

DataSync sur Direct Connect avec un point de terminaison de VPC garde le transfert hors de l'internet public. Le mode de tâche (Enhanced ou Basic) ne peut plus être modifié après la création de la tâche.

> **Piège d'examen.** Les appareils AWS Snow Family ne sont plus proposés aux nouveaux clients. « Des pétaoctets, une bande passante limitée, 6 semaines » désigne désormais Data Transfer Terminal ou une connexion Direct Connect dédiée avec DataSync, pas Snowball Edge.

<!-- section: replatform | objectives: 4.1.4 -->
## Changement de plateforme vers des services gérés

Le changement de plateforme conserve la conception de l'application mais confie à AWS le travail indifférencié (correctifs, sauvegardes, basculement, mise à l'échelle) :

| Charge de travail source | Cible gérée | Travail opérationnel supprimé |
| --- | --- | --- |
| Oracle ou SQL Server sur des VM, licence conservée | Amazon RDS for Oracle ou SQL Server | Correctifs du système et du moteur, sauvegardes, basculement Multi-AZ |
| Clusters MySQL ou PostgreSQL | Amazon Aurora (provisionné ou Serverless v2) | Gestion du stockage, basculement des réplicas, réplication inter-Régions avec Global Database |
| Applications Java ou .NET sur des VM | Conteneurs sur Amazon ECS avec AWS Fargate | Flotte d'hôtes, correctifs des AMI, planification de capacité |
| Scripts planifiés sur une VM | AWS Lambda déclenché par EventBridge Scheduler | Serveurs inactifs entre deux exécutions |
| Kafka autogéré | Amazon MSK | Exploitation des brokers |
| Brokers ActiveMQ ou RabbitMQ | Amazon MQ | Correctifs des brokers, brokers de secours |
| Serveurs de fichiers Windows | Amazon FSx for Windows File Server | Système d'exploitation des serveurs de fichiers, réplicas DFS |
| Applications web sur une plateforme prise en charge | AWS Elastic Beanstalk | Câblage de l'équilibreur de charge, de la mise à l'échelle et du déploiement |

**AWS Transform** aide aussi : il conteneurise des applications à partir du code source et les déploie sur ECS ou EKS, et il porte les applications .NET Framework vers le .NET multiplateforme qui tourne sous Linux, ce qui supprime le coût des licences Windows.

> **Conseil d'examen.** Quand deux options répondent toutes deux au besoin fonctionnel, « la MOINDRE charge opérationnelle » préfère Fargate au type de lancement EC2, Aurora à un cluster autogéré sur EC2 et Lambda à un serveur cron, sauf si l'énoncé impose une contrainte qu'ils ne respectent pas (un module noyau, un processus avec état de longue durée, une licence liée aux cœurs physiques).

<!-- section: refactor | objectives: 4.1.5 -->
## Refactorisation avec le modèle strangler fig

Réécrire d'un coup un grand monolithe est risqué et retarde les fonctionnalités métier. Le modèle **strangler fig** extrait les fonctionnalités une par une pendant que le monolithe continue de tourner :

1. Placez une **couche proxy** devant le monolithe ; au début, elle lui envoie tout le trafic. Amazon API Gateway est sans serveur et Multi-AZ, il ne devient donc pas le point de défaillance unique qu'un proxy autogéré représenterait ; un Application Load Balancer avec des règles par chemin convient aussi.
2. Développez les nouvelles fonctionnalités en microservices ; gardez les corrections de bogues dans le monolithe.
3. Extrayez un contexte délimité (bounded context : utilisateurs, panier, compte...) à la fois et redirigez la route du proxy vers le nouveau service. Utilisez la conception pilotée par le domaine (DDD) pour trouver d'abord les frontières.
4. Chaque microservice **possède ses données** (persistance polyglotte : DynamoDB, Aurora, ElastiCache). Si le monolithe a encore besoin de ces données, le service publie des événements de modification dans une file d'attente et un agent de synchronisation met à jour la base du monolithe : cohérence à terme, solution tactique, supprimée plus tard.
5. Là où le code du monolithe appelle une capacité extraite, une **couche anticorruption (anti-corruption layer)** (adaptateur ou façade) traduit l'appel vers la nouvelle interface, si bien que les appelants ignorent la migration.
6. Décommissionnez le monolithe quand plus rien ne lui est routé.

L'adoption du sans serveur suit généralement : services extraits sur Lambda derrière API Gateway, intégrés par EventBridge ou SQS plutôt que par des appels synchrones.

N'utilisez pas ce modèle pour une petite application moins chère à réécrire, ni quand vous ne pouvez pas intercepter les appels (pas d'accès au code source).

> **Piège d'examen.** AWS Migration Hub Refactor Spaces, qui automatisait le routage strangler fig entre comptes, n'accepte plus de nouveaux clients (depuis le 7 novembre 2025). Construisez vous-même la façade avec API Gateway ou un ALB ; AWS propose AWS Transform comme alternative.

<!-- section: legacy-modernization | objectives: 4.1.6 -->
## Moderniser les mainframes et les charges de travail héritées

**AWS Transform for mainframe** prend en charge les applications z/OS en COBOL et PL/I avec JCL, transactions CICS, écrans BMS, bases Db2 et fichiers VSAM, ainsi que les applications Fujitsu GS21. Ses agents :

- analysent le code et génèrent la documentation d'un code que plus personne ne connaît ;
- extraient la logique métier et décomposent le monolithe en domaines ;
- planifient les vagues de migration, avec approbation humaine de la décomposition et des vagues ;
- refactorisent les charges de travail COBOL en applications **Java** optimisées pour le cloud ;
- fournissent des modèles IaC pour l'environnement cible.

| Situation héritée | Chemin de modernisation |
| --- | --- |
| Batch COBOL et transactionnel CICS sur z/OS, compétences qui partent à la retraite | AWS Transform for mainframe : analyse, décomposition, refactorisation en Java sur le calcul AWS |
| Base Oracle avec PL/SQL, coût des licences | DMS Schema Conversion vers Aurora PostgreSQL, puis DMS chargement complet plus CDC, bascule après validation |
| .NET Framework sur Windows Server | Modernisation .NET d'AWS Transform vers un .NET compatible Linux, puis conteneurs |
| Système d'exploitation non pris en charge, l'application doit d'abord déménager | Réhébergement avec MGN pour gagner du temps, puis modernisation sur AWS |

Les données VSAM et Db2 se déplacent avec les programmes refactorisés ; des exécutions en parallèle comparent les résultats avant la bascule.

> **Piège d'examen.** L'environnement d'exécution géré d'AWS Mainframe Modernization n'accepte plus de nouveaux clients, et son expérience autogérée est aussi fermée aux nouveaux clients. Pour un nouveau programme mainframe, la réponse est AWS Transform for mainframe.

<!-- section: key-points -->
## Points clés

- AWS Transform : outil de découverte (inventaire, connexions réseau), évaluation de migration (TCO, sans cartographie des dépendances), planification de la migration (groupes de déplacement, vagues). Migration Hub et Application Discovery Service sont fermés aux nouveaux clients.
- 7 R : retirer, conserver, réhéberger, déplacer, racheter, changer de plateforme, refactoriser ; pour les grands programmes, migrer d'abord, moderniser ensuite.
- MGN : agent, sous-réseau intermédiaire, réplication continue au niveau bloc, instances de test puis de bascule, applications et vagues ; réplication sans agent plus disponible pour les nouveaux déploiements.
- DMS : chargement complet, chargement complet plus CDC, CDC seule ; Serverless ; migrations de données homogènes avec outils natifs ; Schema Conversion ou SCT pour changer de moteur.
- DataSync pour les copies en masse et planifiées, Transfer Family pour les protocoles des partenaires, Storage Gateway pour l'accès hybride, Data Transfer Terminal pour les volumes hors ligne ; pas d'appareils Snow pour les nouveaux clients.
- Changer de plateforme vers RDS, Aurora, ECS sur Fargate, Lambda, MSK, Amazon MQ, FSx.
- Strangler fig : proxy, extraction par contexte délimité, propriété des données, couche anticorruption ; Refactor Spaces est fermé aux nouveaux clients.
- Mainframes : AWS Transform for mainframe (COBOL et PL/I vers Java).
