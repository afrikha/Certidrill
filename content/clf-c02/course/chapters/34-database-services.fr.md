AWS suit une approche de bases de données spécialisées (purpose-built) : une base de données gérée pour chaque type de données et chaque mode d'accès, plutôt qu'une seule base pour tout. L'examen vous demande de reconnaître les bases de données relationnelles, NoSQL et en mémoire, de choisir entre une base de données exécutée sur Amazon EC2 et une base de données gérée par AWS, et de nommer les outils qui migrent une base de données vers AWS.

<!-- section: database-services | objectives: 3.4.1 -->
## Services de base de données AWS

| Données et mode d'accès | Service | Exemples d'utilisation |
| --- | --- | --- |
| Relationnel (SQL, tables, jointures, transactions) | **Amazon RDS**, **Amazon Aurora** | Commandes, comptabilité, applications ERP et CRM |
| Clé-valeur et document, à toute échelle | **Amazon DynamoDB** | Paniers d'achat, sessions utilisateur, jeux, IoT |
| Cache ou magasin de données en mémoire | **Amazon ElastiCache** | Mise en cache des résultats de requêtes, magasins de sessions, classements |
| Documents JSON, compatibilité MongoDB | **Amazon DocumentDB (with MongoDB compatibility)** | Catalogues de contenu, profils utilisateur |
| Graphe (nœuds et relations) | **Amazon Neptune** | Réseaux sociaux, détection de fraude, recommandations |
| Entrepôt de données (analytique sur de grands jeux de données) | **Amazon Redshift** | Informatique décisionnelle et rapports sur des téraoctets |

> **Conseil d'examen.** Lisez d'abord la forme des données : « relationnel » ou « SQL » signifie RDS ou Aurora ; « clé-valeur », « schéma flexible » ou « des millions de requêtes par seconde » signifie DynamoDB ; « relations » signifie Neptune ; « analytique sur des données historiques » signifie Redshift.

<!-- section: ec2-or-managed | objectives: 3.4.3 -->
## Bases de données hébergées sur EC2 ou bases de données gérées par AWS

| | Base de données sur Amazon EC2 | Base de données gérée par AWS (RDS, Aurora, DynamoDB...) |
| --- | --- | --- |
| Système d'exploitation, installation, correctifs | Client | AWS |
| Sauvegardes, haute disponibilité, mise à l'échelle | Le client les configure et les exploite | Options intégrées (sauvegardes automatiques, Multi-AZ, réplicas en lecture) |
| Accès au système d'exploitation et configuration complète | Oui | Pas d'accès au système d'exploitation |
| Données, schéma, contrôle d'accès, optimisation des requêtes | Client | Client |

Choisissez **EC2** quand vous avez besoin d'un contrôle complet du système d'exploitation ou du logiciel de base de données, d'un moteur ou d'une version que les services gérés ne proposent pas, ou d'une configuration qu'ils n'autorisent pas. Choisissez une **base de données gérée** pour réduire la charge opérationnelle : AWS s'occupe du matériel, des correctifs du système d'exploitation et du logiciel de base de données, des sauvegardes, du basculement et des options de mise à l'échelle, et l'équipe se concentre sur l'application.

> **Piège d'examen.** « Avec la charge opérationnelle la plus FAIBLE » ou « sans gérer de serveurs » ne mène jamais à une base de données installée sur EC2. « Exige l'accès au système d'exploitation sous-jacent » exclut RDS.

<!-- section: relational | objectives: 3.4.4 -->
## Bases de données relationnelles : Amazon RDS et Amazon Aurora

**Amazon RDS** est un service de base de données relationnelle géré. Moteurs pris en charge : **IBM Db2, MariaDB, Microsoft SQL Server, MySQL, Oracle Database et PostgreSQL**. AWS gère la mise en service, les correctifs du système d'exploitation et de la base de données, les sauvegardes automatiques et le matériel ; vous êtes responsable de l'optimisation des requêtes et de vos données.

| Fonctionnalité | Objectif |
| --- | --- |
| **Déploiement Multi-AZ** | Une instance de secours dans une autre zone de disponibilité avec basculement automatique : haute disponibilité |
| **Réplicas en lecture** | Des copies qui servent le trafic de lecture : mise à l'échelle des lectures ; peuvent se trouver dans une autre Région |
| Sauvegardes automatiques et instantanés | Restaurer la base de données à un instant donné |

**Amazon Aurora** fait partie d'Amazon RDS : un moteur relationnel entièrement géré **compatible avec MySQL et PostgreSQL**, avec une couche de stockage distribuée qui s'agrandit automatiquement selon les besoins (jusqu'à 256 Tio par volume de cluster). C'est le choix pour des performances et une disponibilité élevées avec des applications MySQL ou PostgreSQL, sans modifier leur code.

> **Piège d'examen.** Aurora n'est pas une famille de moteurs distincte comme Oracle ou SQL Server : il ne propose que la compatibilité MySQL et PostgreSQL. Une base Oracle va vers RDS for Oracle (même moteur) ou est convertie vers Aurora PostgreSQL (moteur différent).

<!-- section: nosql | objectives: 3.4.5 -->
## Bases de données NoSQL : Amazon DynamoDB

**Amazon DynamoDB** est une base de données NoSQL sans serveur et entièrement gérée, pour des données clé-valeur et document :

- Des performances de l'ordre de quelques millisecondes à toute échelle ; aucun serveur, aucun correctif, aucune planification de capacité (mode de capacité à la demande).
- Données répliquées automatiquement dans plusieurs zones de disponibilité de la Région.
- Schéma flexible : chaque élément peut avoir des attributs différents ; les éléments se lisent par leur clé.
- Les **tables globales** répliquent une table dans plusieurs Régions, lisible et modifiable dans chacune.
- **DynamoDB Accelerator (DAX)** : un cache en mémoire pour DynamoDB qui sert les lectures en quelques microsecondes.

Autres services NoSQL : Amazon DocumentDB pour les documents JSON avec compatibilité MongoDB, Amazon Neptune pour les graphes.

> **Conseil d'examen.** « Base de données sans serveur », « trafic imprévisible à très grande échelle » ou « clé-valeur » mène à DynamoDB ; des jointures complexes et des transactions SQL entre tables mènent à une base de données relationnelle.

<!-- section: in-memory | objectives: 3.4.6 -->
## Bases de données en mémoire : Amazon ElastiCache

**Amazon ElastiCache** est un magasin de données et un cache **en mémoire**, distribués et gérés, compatible avec **Valkey, Memcached et Redis OSS**. Il est disponible en **ElastiCache Serverless** (aucun nœud à mettre en service, mise à l'échelle automatique) ou sous forme de clusters basés sur des nœuds répartis sur plusieurs zones de disponibilité.

- Placez-le devant une base de données pour servir les lectures répétées depuis la mémoire, bien plus vite que depuis le disque, et réduire la charge de la base.
- Stockez-y les sessions utilisateur, les classements et d'autres données qui exigent un accès très rapide.

> **Piège d'examen.** Un cache accélère les lectures répétées ; ce n'est pas le système de référence. « Améliorer les performances de lecture d'une base relationnelle pour des données souvent demandées », c'est ElastiCache (ou des réplicas en lecture), pas une deuxième base RDS.

<!-- section: migration | objectives: 3.4.2, 3.4.7 -->
## Outils de migration de bases de données

| Migration | Exemple | Outils |
| --- | --- | --- |
| **Homogène** (même moteur) | MySQL sur site vers RDS for MySQL ou Aurora MySQL | AWS DMS (ou les outils natifs du moteur) |
| **Hétérogène** (moteur différent) | Oracle vers Aurora PostgreSQL ; SQL Server vers Aurora MySQL | AWS SCT ou DMS Schema Conversion pour convertir le schéma et le code, puis AWS DMS pour déplacer les données |

- **AWS Database Migration Service (AWS DMS)** migre les données vers des bases de données AWS. La **base source reste entièrement opérationnelle** pendant la migration, ce qui réduit l'interruption ; la réplication continue (capture des données modifiées, CDC) maintient la cible synchronisée jusqu'à la bascule. Sources et cibles peuvent être sur site, sur EC2 ou dans RDS.
- **AWS Schema Conversion Tool (AWS SCT)** convertit un schéma de base de données (tables, vues, procédures stockées, fonctions) d'un moteur vers un autre, évalue la migration et signale ce qui demande un travail manuel. Ses cibles comprennent les moteurs RDS, Aurora et Redshift. **DMS Schema Conversion** propose une conversion de schéma gérée dans la console DMS.

> **Piège d'examen.** DMS déplace les données ; il ne convertit pas un schéma entre moteurs différents. « Migrer Oracle vers Aurora PostgreSQL » exige SCT (ou DMS Schema Conversion) plus DMS. « MySQL vers Aurora MySQL » n'exige aucune conversion de schéma.

<!-- section: key-points -->
## Points clés

- Bases spécialisées : RDS et Aurora (relationnel), DynamoDB (clé-valeur, document), ElastiCache (en mémoire), DocumentDB (compatible MongoDB), Neptune (graphe), Redshift (entrepôt).
- Les bases gérées suppriment le travail de correctifs du système d'exploitation et de la base, de sauvegarde et de basculement ; EC2 sert pour un contrôle complet ou des moteurs non pris en charge.
- Moteurs RDS : Db2, MariaDB, SQL Server, MySQL, Oracle, PostgreSQL. Aurora : compatible MySQL et PostgreSQL, stockage qui s'agrandit automatiquement.
- DynamoDB : sans serveur, quelques millisecondes, tables globales, DAX pour les microsecondes.
- DMS migre les données avec la source en ligne ; SCT convertit le schéma pour les migrations hétérogènes.
