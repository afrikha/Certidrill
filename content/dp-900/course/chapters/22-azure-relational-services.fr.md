Azure exécute les bases de données relationnelles de deux façons : la famille Azure SQL, construite sur le moteur de base de données SQL Server, et des services managés pour les moteurs open source. L'examen décrit un besoin (compatibilité, contrôle, effort d'administration) et demande quel service y répond.

<!-- section: azure-sql-family | objectives: 2.2.1 -->
## La famille Azure SQL

| | SQL Server sur Machines Virtuelles Azure | Azure SQL Managed Instance | Azure SQL Database |
| --- | --- | --- | --- |
| Type de service cloud | IaaS | PaaS | PaaS |
| Ce que c'est | Une machine virtuelle dans Azure avec SQL Server installé | Une instance SQL Server managée qui héberge plusieurs bases de données | Un service de base de données entièrement managé, conçu pour le cloud |
| Compatibilité avec SQL Server | Totale : le même produit qu'en local | Proche de 100 % | La plupart des fonctionnalités de base au niveau de la base de données ; certaines fonctionnalités manquent |
| Qui gère le système d'exploitation, les mises à jour et les sauvegardes | Vous | Azure, automatiquement | Azure, automatiquement |
| Idéal pour | Migrer sans aucune modification (« lift-and-shift »), contrôle total du serveur et du système d'exploitation | La plupart des migrations vers le cloud, avec un minimum de modifications | Les nouvelles applications cloud, le moins d'administration possible |

Les trois options exécutent le même moteur de base de données et utilisent Transact-SQL. Ce qui change, c'est la part du travail qu'Azure fait à votre place : plus on va vers la droite du tableau, moins on administre et moins on contrôle.

> **Piège d'examen.** Une instance managée et une machine virtuelle vous donnent toutes deux « une instance SQL Server », mais Azure SQL Managed Instance est **PaaS** : vous n'avez pas accès au système d'exploitation et vous n'appliquez aucun correctif. Seul SQL Server sur Machines Virtuelles Azure est IaaS.

<!-- section: azure-sql-database | objectives: 2.2.1 -->
## Azure SQL Database

Azure SQL Database exécute toujours la dernière version stable du moteur de base de données ; Azure le met à jour et y applique les correctifs. Les bases de données sont rattachées à un **serveur logique**, un point d'administration central pour les connexions, les règles de pare-feu et les règles d'audit, et non une machine que vous gérez.

| Option | Ce que c'est | Quand la choisir |
| --- | --- | --- |
| **Base de données unique** | Une base de données avec ses propres ressources, que vous augmentez ou réduisez | Une application dont la charge est prévisible |
| **Pool élastique** | Plusieurs bases de données partagent un pool de ressources (mémoire, stockage, puissance de traitement) | De nombreuses bases de données dont les pics d'activité n'arrivent pas en même temps : le coût est plus bas que si chacune était dimensionnée pour son pic |
| Calcul **serverless** | Le calcul se met à l'échelle automatiquement dans une plage et est facturé selon ce que la base de données utilise ; dans le niveau de service General Purpose, la base de données peut se mettre en pause quand elle est inactive | Usage intermittent ou imprévisible |
| Niveau de service **Hyperscale** | Très grandes bases de données, jusqu'à 128 To, avec une mise à l'échelle, une sauvegarde et une restauration rapides | Les bases de données trop grandes pour les autres niveaux |

Fonctionnalités intégrées à retenir : sauvegardes automatisées avec **restauration à un point dans le temps**, réplication des bases de données vers d'autres régions, un contrat SLA de disponibilité qui augmente avec la redondance de zone, chiffrement des données au repos et en transit, audit, et protection contre les menaces avec Microsoft Defender pour SQL.

Comme le service n'est pas entièrement compatible avec un SQL Server local, des fonctionnalités dont dépend une application existante peuvent manquer : SQL Server Agent, les requêtes entre bases de données et le Common Language Runtime (CLR), par exemple, ne sont pas disponibles dans Azure SQL Database.

<!-- section: managed-instance-and-vms | objectives: 2.2.1 -->
## Managed Instance et SQL Server sur Machines Virtuelles Azure

**Azure SQL Managed Instance** est une instance SQL Server complète fournie comme un service. Vous conservez les fonctionnalités de niveau instance comme SQL Server Agent, les requêtes entre bases de données, le CLR, Service Broker et Database Mail, tandis qu'Azure automatise les sauvegardes, l'application des correctifs logiciels et la surveillance. Sa stratégie de mise à jour fixe le moteur qu'elle suit (Always-up-to-date, SQL Server 2022 ou SQL Server 2025) ; dans tous les cas, Azure installe les mises à jour. L'instance est déployée dans votre réseau virtuel.

**SQL Server sur Machines Virtuelles Azure** est le même SQL Server qu'en local, dans une machine virtuelle. Vous choisissez la version et l'édition, vous avez tous les droits d'administration sur le système de base de données et sur le système d'exploitation, et en contrepartie vous prenez en charge les mises à jour, la configuration, les sauvegardes et la haute disponibilité. Cette option convient aux applications qui ont besoin de fonctionnalités du système d'exploitation indisponibles en PaaS, et aux déploiements hybrides dans lesquels une partie du système reste en local.

| Besoin dans la question | Réponse |
| --- | --- |
| Nouvelle application, administration minimale, coût le plus bas | Azure SQL Database |
| Plusieurs bases de données à l'usage variable et imprévisible, un seul budget | Pool élastique Azure SQL Database |
| Base de données utilisée quelques heures par jour, ne payer que ce qui est utilisé | Azure SQL Database serverless |
| Migrer une instance qui utilise SQL Server Agent ou des requêtes entre bases de données, avec des correctifs et des sauvegardes automatisés | Azure SQL Managed Instance |
| Accès au système d'exploitation, ou logiciel installé à côté de SQL Server | SQL Server sur Machines Virtuelles Azure |
| Une version précise de SQL Server, mise à niveau uniquement quand vous le décidez | SQL Server sur Machines Virtuelles Azure |

> **Conseil d'examen.** Classez les trois par contrôle : machine virtuelle (tout), instance managée (l'instance), SQL Database (la base de données). L'effort d'administration suit le même ordre, du plus grand au plus petit.

<!-- section: open-source-databases | objectives: 2.2.2 -->
## Les services Azure pour les bases de données open source

| Moteur | À savoir | Service Azure |
| --- | --- | --- |
| **MySQL** | Base de données relationnelle open source simple à utiliser, courante dans les applications de la pile LAMP (Linux, Apache, MySQL, PHP) | **Azure Database pour MySQL** |
| **PostgreSQL** | Base de données objet-relationnelle : tables relationnelles plus types de données personnalisés, extensions, données géométriques ; son langage procédural est PL/pgSQL | **Azure Database pour PostgreSQL** |

Les deux sont des services **PaaS**, déployés sous la forme d'un **Serveur flexible** (Flexible Server) : un serveur entièrement managé sur lequel vous gardez le contrôle de la configuration et des coûts. Azure Database pour MySQL est basé sur MySQL Community Edition.

- Vous ne gérez ni le matériel, ni les serveurs virtuels, ni les correctifs logiciels.
- La haute disponibilité est intégrée, avec un basculement automatique.
- Les sauvegardes sont automatiques, avec restauration à un point dans le temps (pour Azure Database pour MySQL : 7 jours par défaut, jusqu'à 35 jours).
- La mise à l'échelle est rapide, la tarification est un paiement à l'utilisation, et les données sont protégées au repos et en transit.
- Les applications et les outils écrits pour le moteur open source continuent de fonctionner (pgAdmin pour PostgreSQL, par exemple).
- En contrepartie, certaines opérations d'administration et de sécurité ne sont pas disponibles, car Azure les effectue ; Azure Database pour PostgreSQL prend en charge une liste définie d'extensions.

> **Piège d'examen.** Une application écrite pour MySQL ou PostgreSQL ne se déplace pas vers Azure SQL Database : le moteur et le dialecte SQL diffèrent. La réponse qui n'exige aucune modification de l'application est le service Azure Database du même moteur.

<!-- section: key-points -->
## Points clés

- SQL Server sur Machines Virtuelles Azure : IaaS, compatibilité totale et contrôle total, vous gérez tout.
- Azure SQL Managed Instance : PaaS, compatibilité proche de 100 %, fonctionnalités de niveau instance, le choix habituel pour les migrations.
- Azure SQL Database : PaaS, entièrement managé, pour les nouvelles applications cloud ; base de données unique, pool élastique, serverless, Hyperscale jusqu'à 128 To.
- Pool élastique : plusieurs bases de données partagent des ressources. Serverless : mise à l'échelle automatique, facturation à l'usage, mise en pause automatique dans le niveau General Purpose.
- Azure Database pour MySQL et Azure Database pour PostgreSQL : PaaS, Serveur flexible, pour les applications construites sur ces moteurs open source.
