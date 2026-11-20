Le stockage AWS se décline en trois types : stockage d'objets (Amazon S3), stockage en mode bloc (Amazon EBS et stockage d'instance) et stockage de fichiers (Amazon EFS et Amazon FSx), plus des services hybrides et de sauvegarde. L'examen vous demande d'associer un besoin à un type et à un service, de choisir une classe de stockage S3 selon un mode d'accès, et de savoir quand s'appliquent les politiques de cycle de vie et AWS Backup.

<!-- section: storage-services | objectives: 3.6.1 -->
## Services de stockage AWS

| Type | Service | Accès |
| --- | --- | --- |
| Objet | **Amazon S3** (y compris les classes de stockage S3 Glacier) | Des objets entiers dans des compartiments, via des API HTTPS |
| Bloc | **Amazon EBS**, **stockage d'instance EC2** (instance store) | Un disque (volume) attaché à une instance EC2 |
| Fichier | **Amazon EFS**, **Amazon FSx** | Un système de fichiers partagé monté par de nombreux clients |
| Hybride | **AWS Storage Gateway** | Accès sur site à du stockage cloud |
| Protection | **AWS Backup**, **AWS Elastic Disaster Recovery** | Sauvegardes centralisées ; reprise de serveurs dans AWS |

<!-- section: object-storage | objectives: 3.6.2 -->
## Utilisations du stockage d'objets

**Amazon S3** stocke n'importe quelle quantité de données sous forme d'**objets** (un fichier plus ses métadonnées, identifié par une clé) dans des **compartiments** (buckets). Le stockage est pratiquement illimité, conçu pour une durabilité de 99,999999999 % (11 neuf), et accessible en HTTPS depuis n'importe quel endroit que vous autorisez.

Utilisations typiques : contenu de sites web statiques, images et vidéos (souvent diffusés via CloudFront), sauvegardes et archives, lacs de données pour l'analytique (interrogés avec Athena), et journaux qui croissent sans limite.

> **Piège d'examen.** S3 n'est pas un disque pour un système d'exploitation ou un moteur de base de données : un objet est remplacé en entier. Un volume de démarrage ou une base de données sur EC2 a besoin de stockage en mode bloc (EBS).

<!-- section: s3-storage-classes | objectives: 3.6.3 -->
## Classes de stockage Amazon S3

| Classe | Pour des données | Durée minimale de stockage | Récupération |
| --- | --- | --- | --- |
| **S3 Standard** | Consultées fréquemment | Aucune | Millisecondes |
| **S3 Intelligent-Tiering** | Consultées selon un mode inconnu ou changeant ; déplacées automatiquement entre niveaux | Aucune | Millisecondes (les niveaux d'archive facultatifs exigent une restauration) |
| **S3 Standard-IA** | Consultées peu fréquemment mais nécessaires immédiatement | 30 jours | Millisecondes, frais de récupération par Go |
| **S3 One Zone-IA** | Consultées peu fréquemment et recréables ; stockées dans **une** zone de disponibilité | 30 jours | Millisecondes, frais de récupération par Go |
| **S3 Glacier Instant Retrieval** | Archives consultées environ une fois par trimestre | 90 jours | Millisecondes |
| **S3 Glacier Flexible Retrieval** | Archives consultées une ou deux fois par an | 90 jours | Minutes à heures (restauration préalable) |
| **S3 Glacier Deep Archive** | Conservation à long terme, presque jamais lues ; le coût le plus bas | 180 jours | Dans les 12 heures (restauration préalable) |
| **S3 Express One Zone** | Données qui exigent un accès constant en quelques millisecondes, dans une AZ choisie | Aucune | Quelques millisecondes |

Toutes les classes sauf One Zone-IA et Express One Zone stockent les données dans au moins trois zones de disponibilité.

> **Piège d'examen.** « Consultées peu fréquemment mais disponibles immédiatement », c'est Standard-IA (ou Glacier Instant Retrieval), et non Glacier Flexible Retrieval ou Deep Archive, qui exigent une restauration. « Mode d'accès inconnu », c'est Intelligent-Tiering.

<!-- section: block-storage | objectives: 3.6.4 -->
## Stockage en mode bloc : Amazon EBS et stockage d'instance

| | Amazon EBS | Stockage d'instance |
| --- | --- | --- |
| Ce que c'est | Des volumes attachés par le réseau pour EC2 | Des disques physiquement attachés à l'ordinateur hôte |
| Persistance | Persiste indépendamment de la vie de l'instance | **Temporaire** : les données sont perdues quand l'instance s'arrête ou est résiliée, ou si le disque tombe en panne |
| Portée | Une zone de disponibilité ; attaché à des instances de cette AZ | Uniquement l'instance à laquelle il appartient |
| Sauvegardes | **Instantanés** (snapshots) incrémentiels, stockés dans Amazon S3 ; copiables vers d'autres AZ et Régions | Aucune intégrée |
| Usage | Volumes de démarrage, bases de données, toute donnée qui doit survivre | Tampons, caches, données de travail, données répliquées ailleurs |

Les volumes EBS reposent sur des SSD (gp3 par défaut, io2 pour les bases de données critiques) ou des HDD (st1, sc1).

> **Piège d'examen.** « Stockage temporaire aux E/S les plus élevées, données pouvant être perdues », c'est le stockage d'instance. « Les données doivent persister après l'arrêt de l'instance », c'est EBS.

<!-- section: file-storage | objectives: 3.6.5 -->
## Services de fichiers : Amazon EFS et Amazon FSx

| Service | Protocole et clients | Usage |
| --- | --- | --- |
| **Amazon EFS** | NFS, Linux | Système de fichiers sans serveur et élastique, partagé par des milliers d'instances, de conteneurs et de fonctions sur plusieurs AZ |
| **Amazon FSx for Windows File Server** | SMB, Windows, intégration Active Directory | Partages de fichiers Windows, répertoires personnels, migration telle quelle d'applications Windows |
| **Amazon FSx for NetApp ONTAP** | NFS, SMB et iSCSI | Migration de charges NetApp ; clients Linux, Windows et macOS sur les mêmes données |
| **Amazon FSx for OpenZFS** | NFS | Migration de serveurs de fichiers ZFS ou Linux |

> **Conseil d'examen.** Plusieurs instances doivent lire et écrire **les mêmes fichiers** en même temps : stockage de fichiers. Linux mène à EFS ; Windows et SMB mènent à FSx for Windows File Server.

<!-- section: hybrid-storage | objectives: 3.6.6 -->
## Systèmes de fichiers mis en cache : AWS Storage Gateway

**AWS Storage Gateway** donne aux applications sur site l'accès au stockage cloud. Il s'exécute comme machine virtuelle ou appliance matérielle dans votre centre de données et conserve un **cache local** des données récemment utilisées : les applications bénéficient d'un accès à faible latence pendant que les données résident dans AWS.

| Type de passerelle | Interface sur site | Données stockées dans AWS sous forme de |
| --- | --- | --- |
| **S3 File Gateway** | Partages de fichiers NFS ou SMB | Objets dans Amazon S3 |
| **Volume Gateway** | Volumes en mode bloc iSCSI (mis en cache ou stockés) | Volumes sauvegardés en instantanés EBS |
| **Tape Gateway** | Bibliothèque de bandes virtuelles pour le logiciel de sauvegarde existant | Bandes virtuelles dans S3, archivées dans les classes S3 Glacier |

> **Piège d'examen.** Amazon FSx File Gateway n'est plus proposé aux nouveaux clients. Des utilisateurs qui doivent continuer d'accéder aux fichiers depuis le bureau pendant que les données passent dans S3 mènent à S3 File Gateway.

<!-- section: lifecycle | objectives: 3.6.7 -->
## Cas d'utilisation des politiques de cycle de vie

Une configuration **S3 Lifecycle** applique des règles aux objets d'un compartiment (tous les objets, ou un préfixe ou des balises) :

- Les **actions de transition** déplacent les objets vers une classe de stockage moins chère après un certain nombre de jours.
- Les **actions d'expiration** suppriment les objets à la fin de leur période de conservation, y compris les anciennes versions dans un compartiment versionné.

| Exigence | Règle de cycle de vie |
| --- | --- |
| Journaux souvent lus pendant 30 jours, rarement ensuite, conservés 7 ans | Transition vers Standard-IA, puis vers Glacier Flexible Retrieval ou Deep Archive ; expiration après 7 ans |
| Des exports temporaires doivent être supprimés après 90 jours | Expiration après 90 jours |

Amazon EFS dispose aussi d'une gestion du cycle de vie, qui déplace les fichiers non consultés vers des classes de stockage moins coûteuses.

> **Conseil d'examen.** Un mode d'accès connu et prévisible (« après 30 jours, rarement »), c'est une règle de cycle de vie ; un mode inconnu, c'est Intelligent-Tiering.

<!-- section: aws-backup | objectives: 3.6.8 -->
## Cas d'utilisation d'AWS Backup

**AWS Backup** centralise et automatise les sauvegardes des services AWS : EC2, EBS, EFS, FSx, RDS, Aurora, DynamoDB, S3, volumes Storage Gateway et d'autres.

- Les **plans de sauvegarde** définissent la fréquence, la conservation et le cycle de vie des sauvegardes ; les ressources sont affectées par balises ou par ID.
- Les sauvegardes sont stockées dans des **coffres de sauvegarde** (backup vaults) chiffrés ; **Vault Lock** empêche quiconque de les supprimer avant la fin de leur conservation.
- Les **copies interrégionales et intercomptes** protègent contre une panne régionale ou un compte compromis.
- Avec AWS Organizations, les **politiques de sauvegarde** appliquent le même plan à chaque compte.

> **Piège d'examen.** Les instantanés EBS sauvegardent un volume ; AWS Backup est la réponse pour « des sauvegardes centralisées, fondées sur des politiques, de nombreux services et comptes ». AWS Elastic Disaster Recovery réplique des serveurs entiers pour une reprise rapide, ce qui est un autre besoin.

<!-- section: key-points -->
## Points clés

- Objet (S3), bloc (EBS, stockage d'instance), fichier (EFS, FSx), hybride (Storage Gateway), protection (AWS Backup, Elastic Disaster Recovery).
- Classes S3 : Standard, Intelligent-Tiering, Standard-IA et One Zone-IA (30 jours), Glacier Instant et Flexible Retrieval (90 jours), Deep Archive (180 jours, le moins cher).
- EBS persiste dans une AZ avec des instantanés dans S3 ; le stockage d'instance est temporaire.
- EFS pour des fichiers partagés NFS sous Linux ; FSx for Windows File Server pour SMB et Active Directory.
- Storage Gateway : cache local, données dans S3 (File), volumes (Volume), bandes virtuelles (Tape).
- Les règles de cycle de vie font passer les objets d'une classe à l'autre et les font expirer ; AWS Backup centralise plans, coffres et copies interrégionales.
