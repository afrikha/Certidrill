Une fois le moteur choisi, le coût d'exploitation d'une base de données dépend du nombre de lectures qu'un cache lui épargne, de la façon dont les connexions l'atteignent, du nombre de copies et de leur emplacement, et de la durée de conservation des sauvegardes et des anciennes données. Les questions de migration ajoutent une décision : quel outil déplace le schéma et les données avec le moins d'effort.

<!-- section: caching-strategies | objectives: 4.3.3 -->
## Stratégies de mise en cache

Un cache fait économiser de l'argent quand il permet d'exécuter une instance plus petite, moins de réplicas en lecture ou moins d'unités de capacité de lecture. Choisissez la couche la plus proche de l'utilisateur capable de servir la donnée :

| Couche | Met en cache | Exigence typique |
| --- | --- | --- |
| Amazon CloudFront | Réponses HTTP dans les emplacements périphériques | Contenu statique ou cachable pour des utilisateurs du monde entier |
| Mise en cache API Gateway (API REST) | Réponses d'une étape d'API, TTL par défaut de 300 secondes, maximum 3 600 | Mêmes appels d'API répétés, moins d'invocations du backend |
| Amazon ElastiCache (Valkey, Redis OSS, Memcached) | Résultats de requêtes, sessions, objets calculés | Base relationnelle surchargée par des lectures répétées, latence inférieure à la milliseconde |
| DynamoDB Accelerator (DAX) | Éléments DynamoDB et résultats de requêtes | Lectures en microsecondes sur DynamoDB avec un minimum de modifications du code |
| Réplicas en lecture | Une copie complète lisible | Nombreuses requêtes différentes qu'un cache clé-valeur ne peut pas servir |

La manière dont l'application remplit le cache détermine la fraîcheur des données et le coût :

| Stratégie | Fonctionnement | Avantage | Inconvénient |
| --- | --- | --- | --- |
| Chargement différé (lazy loading, cache-aside) | Lire le cache ; en cas d'échec, lire la base et écrire le résultat dans le cache | Seules les données demandées sont en cache ; un nœud défaillant n'ajoute que de la latence | Chaque échec coûte trois allers-retours ; les données peuvent être périmées |
| Écriture simultanée (write-through) | Chaque écriture en base met aussi à jour le cache | Les données en cache ne sont jamais périmées | Données absentes tant qu'elles ne sont pas écrites ; cache encombré de données jamais lues |
| TTL sur chaque clé | La clé expire après une durée fixée, puis est rechargée | Limite la péremption et libère la mémoire | L'expiration provoque une rafale d'échecs |

Combinez-les : chargement différé pour les échecs, écriture simultanée pour les données qui changent souvent, et un TTL sur chaque écriture pour que les données non lues ne remplissent pas le cache.

Leviers de coût d'ElastiCache :

- **Valkey** est moins cher que les autres moteurs : 33 % de moins sur ElastiCache Serverless et 20 % de moins sur les clusters basés sur des nœuds. Valkey en mode sans serveur a aussi un stockage minimal facturé de 100 Mo par cache au lieu de 1 Go.
- **ElastiCache Serverless** facture les données stockées (Go-heures) et les ElastiCache Processing Units (ECPU), sans planification de capacité. Il convient à un trafic en pics ou inconnu.
- **Les clusters basés sur des nœuds** conviennent à un trafic stable : les **nœuds réservés** (1 ou 3 ans, flexibles en taille) réduisent le prix horaire, et la **hiérarchisation des données** (data tiering) sur les nœuds r6gd déplace les éléments peu utilisés vers le SSD pour les grands jeux de données. Ni les nœuds réservés ni la hiérarchisation ne s'appliquent à Serverless.

DAX est compatible avec l'API DynamoDB et sert des lectures **à cohérence éventuelle** en microsecondes : c'est la réponse économique pour les charges de lecture intensives sur des clés très demandées, qui exigeraient sinon plus de capacité de lecture. Il ne convient pas aux lectures fortement cohérentes, aux tables à forte écriture ni aux lectures peu répétées (il est le plus efficace au-delà de 90 % de succès dans le cache).

> **Piège d'examen.** Un cache n'aide ni une charge dominée par les écritures ni une charge qui exige des lectures fortement cohérentes. Quand l'énoncé dit « reads must always return the latest data », éliminez DAX et les caches à chargement différé sans écriture simultanée.

<!-- section: connections-proxies | objectives: 4.3.6 -->
## Connexions aux bases de données et proxies

Chaque connexion ouverte consomme de la mémoire et du CPU sur l'instance de base de données. Les applications qui ouvrent beaucoup de connexions courtes, typiquement des fonctions AWS Lambda qui montent en charge, peuvent épuiser la limite de connexions. **Amazon RDS Proxy** règle ce problème sans instance plus grande :

- Il maintient un **groupe de connexions** (connection pool) et réutilise les connexions, met en file d'attente ou limite les requêtes qu'il ne peut pas servir immédiatement, et rejette les connexions au-delà des limites fixées (délestage).
- Il se reconnecte automatiquement à l'instance de secours lors d'un basculement tout en préservant les connexions de l'application.
- Les clients peuvent être obligés d'utiliser l'**authentification IAM** ; le proxy atteint la base avec des informations d'identification stockées dans **AWS Secrets Manager** ou avec l'authentification de base de données IAM. La plupart des applications ne nécessitent aucune modification du code : seul le point de terminaison change.
- Il s'exécute dans le même VPC que la base de données et **ne peut pas être accessible publiquement**. Dans une configuration de réplication RDS, il est associé à l'instance de base de données d'écriture, pas à un réplica en lecture.
- Pris en charge avec Aurora et avec RDS for MySQL, PostgreSQL, MariaDB et SQL Server.
- Prix : par vCPU-heure de l'instance provisionnée sous-jacente, ou par Aurora Capacity Unit (ACU) pour Aurora Serverless.

L'**épinglage** (pinning, par exemple après une instruction de plus de 16 Ko) lie une session à une seule connexion de base de données et réduit le bénéfice.

Aurora route aussi les connexions sans proxy : le **point de terminaison de cluster** atteint l'instance d'écriture, le **point de terminaison de lecteur** répartit les connexions en lecture seule entre les Aurora Replicas.

| Exigence | Réponse |
| --- | --- |
| Des fonctions Lambda épuisent les connexions à la base | RDS Proxy devant l'instance de base de données ou le cluster Aurora |
| Les informations d'identification ne doivent pas figurer dans le code | RDS Proxy avec Secrets Manager, authentification IAM pour les clients |
| Répartir les lectures entre les Aurora Replicas | Point de terminaison de lecteur Aurora |

> **Conseil d'examen.** Des erreurs « Too many connections » avec une faible utilisation du CPU désignent RDS Proxy. Augmenter la taille de l'instance fonctionne, mais coûte plus cher et constitue rarement l'option la plus rentable (MOST cost-effective).

<!-- section: read-replicas | objectives: 4.3.8 -->
## Les réplicas en lecture et leur coût

Un **réplica en lecture** RDS reçoit les modifications de façon **asynchrone** et accepte les connexions en lecture seule. Il est facturé comme une instance de base de données standard de sa propre classe : chaque réplica doit faire économiser plus qu'il ne coûte.

| Élément | Détail |
| --- | --- |
| Quota | 15 réplicas en lecture par instance de base de données principale (RDS for Oracle : jusqu'à 15, 5 recommandés pour limiter le décalage) |
| Réplication dans la même Région | Aucun frais pour les données transférées entre la source et le réplica |
| Réplication entre Régions | Le transfert de données sortant de la Région source est facturé, pour l'instantané initial et chaque modification |
| Réplica d'un réplica | RDS for MySQL, MariaDB et certaines versions de PostgreSQL ; pas Oracle, SQL Server ni Db2 |
| Promotion | Un réplica peut être promu en instance de base de données autonome (reprise après sinistre entre Régions) |
| Instance de secours Multi-AZ | Synchrone, ne sert **aucune** lecture ; elle sert la disponibilité, pas la montée en charge des lectures |

Pour réduire les frais entre Régions avec MySQL et MariaDB, créez **un seul** réplica dans la Région distante à partir de la source, et les autres à partir de ce réplica : seul le premier transfert traverse les Régions.

Les **Aurora Replicas** (jusqu'à 15 par cluster) partagent le volume du cluster : un réplica ajoute du calcul mais aucune copie du stockage, et le décalage reste en général bien inférieur à 100 ms. Pour d'autres Régions, Aurora propose Aurora Global Database et, pour Aurora MySQL, des réplicas entre Régions basés sur le binlog.

| Exigence | Réponse |
| --- | --- |
| Les requêtes de reporting ralentissent la base de production | Un réplica en lecture pour l'outil de reporting |
| Survivre à la défaillance d'une zone de disponibilité | Multi-AZ (pas un réplica en lecture) |
| Copie lisible dans une autre Région au coût de transfert le plus bas (MySQL) | Un réplica entre Régions, les autres réplicas chaînés à partir de lui |
| Nombreux réplicas sans payer de copies de stockage supplémentaires | Aurora Replicas |

> **Piège d'examen.** Les réplicas en lecture sont asynchrones : une application qui doit lire immédiatement ses propres écritures doit lire sur l'instance principale. Et l'instance de secours Multi-AZ n'est pas un réplica en lecture gratuit : elle ne peut pas servir de trafic de lecture.

<!-- section: retention-policies | objectives: 4.3.4 -->
## Politiques de conservation des données

Garder d'anciennes lignes dans une base provisionnée est l'option la plus chère : déplacez-les vers un stockage moins coûteux ou laissez-les expirer.

| Exigence | Conception |
| --- | --- |
| Supprimer des éléments DynamoDB (sessions, événements) après une durée, sans coût d'écriture | **Durée de vie (TTL)** DynamoDB |
| Conserver les éléments DynamoDB expirés pour l'audit | TTL plus DynamoDB Streams et une fonction Lambda qui écrit les éléments supprimés dans Amazon S3 |
| Conserver des années de données RDS ou Aurora pour l'analyse, rarement interrogées | Exporter l'instantané vers Amazon S3 (Parquet) et l'interroger avec Amazon Athena |
| Table dont le stockage est le coût principal (historique de commandes, journaux) | Classe de table DynamoDB Standard-IA |
| Garder une copie de la base au-delà de la fenêtre des sauvegardes automatiques | Instantané manuel, qui n'expire jamais |
| Sauvegardes que personne ne doit supprimer avant la fin de la rétention | AWS Backup Vault Lock |

À retenir sur le **TTL DynamoDB** : l'attribut est de type Number et contient une heure epoch Unix en secondes ; les éléments expirés sont supprimés **en quelques jours**, pas à la seconde près ; d'ici là, ils apparaissent encore dans les lectures (filtrez-les) ; les suppressions TTL ne consomment aucun débit d'écriture. Dans les tables globales, les suppressions sur les réplicas consomment de la capacité d'écriture répliquée.

L'**export d'instantané RDS vers S3** écrit des fichiers Apache Parquet compressés sans affecter la base, à partir d'instantanés manuels, automatiques ou AWS Backup. Les données exportées ne peuvent pas être restaurées dans une instance de base de données : elles servent à l'analyse et à l'archivage. Une fois dans S3, une règle S3 Lifecycle peut les déplacer vers une classe de stockage S3 Glacier.

> **Piège d'examen.** Le TTL n'est pas un planificateur. Si les éléments doivent disparaître à une heure exacte, le TTL seul ne répond pas à l'exigence ; si « en quelques jours » est acceptable, le TTL est la réponse la moins chère et la plus simple à exploiter.

<!-- section: backup-policies | objectives: 4.3.10 -->
## Fréquence et conservation des sauvegardes

La fréquence des sauvegardes découle de l'objectif de point de reprise (RPO) ; la conservation découle de l'exigence légale ou métier.

| Service | Sauvegardes automatiques | Conservation | Remarques |
| --- | --- | --- | --- |
| Amazon RDS (instance de base de données) | Instantané quotidien pendant la fenêtre de sauvegarde plus journaux de transactions, restauration à un instant dans le passé | 0 à 35 jours ; 7 par défaut dans la console, 1 avec l'API ou la CLI | 0 désactive les sauvegardes automatiques (et passer à 0 ou quitter 0 provoque une interruption) |
| Amazon Aurora | Continues et incrémentielles, sans impact sur les performances | 1 à 35 jours, 1 par défaut | Les sauvegardes automatiques ne peuvent pas être désactivées |
| Amazon DynamoDB | Restauration à un instant dans le passé (PITR), à la seconde près | Période de récupération de 1 à 35 jours, 35 par défaut | Prix fondé sur la taille de la table ; raccourcir la période ne le réduit pas |
| Tous | Instantané manuel ou sauvegarde à la demande | Jusqu'à sa suppression | 100 instantanés manuels de base de données par Région par défaut pour RDS |

RDS offre un **stockage de sauvegarde gratuit égal à 100 % du stockage de base de données provisionné** dans chaque Région ; au-delà, le stockage de sauvegarde est facturé. Les sauvegardes automatiques sont supprimées avec l'instance de base de données, sauf si vous choisissez **Retain automated backups** ; les instantanés finaux et manuels sont indépendants.

**AWS Backup** centralise la politique de nombreux services dans des **plans de sauvegarde** :

- Fréquence : toutes les heures, toutes les 12 heures, quotidienne, hebdomadaire, mensuelle ou expression cron. Les **sauvegardes continues** (PITR) des ressources prises en charge, comme RDS, Aurora et S3, sont conservées de 1 à 35 jours.
- Conservation des instantanés : de 1 jour à 100 ans, ou indéfinie.
- Cycle de vie vers le **stockage à froid** (cold storage) pour les types pris en charge uniquement (EBS, EFS, DynamoDB avec fonctionnalités avancées, Timestream, entre autres, mais pas RDS ni Aurora) : une sauvegarde doit rester au moins **90 jours** en stockage à froid, la conservation doit donc dépasser d'au moins 90 jours le délai de transition.
- Copies vers une autre Région ou un autre compte pour la reprise après sinistre.
- **Vault Lock** pour des sauvegardes WORM (écriture unique, lectures multiples) : le mode gouvernance peut être modifié avec des autorisations IAM suffisantes ; le mode conformité devient immuable, même pour l'utilisateur racine et pour AWS, après un délai de grâce d'au moins 3 jours.

Aurora MySQL propose aussi **Backtrack**, qui rembobine un cluster à un instant d'une fenêtre allant jusqu'à 72 heures, sans restauration. Il doit être activé à la création ou à la restauration du cluster, est facturé pour les enregistrements de modifications conservés et ne remplace pas les sauvegardes.

> **Piège d'examen.** Une exigence de conservation des sauvegardes pendant 7 ans ne signifie pas 7 ans de sauvegardes automatiques : la conservation automatique s'arrête à 35 jours. Utilisez AWS Backup avec une longue conservation (et le stockage à froid lorsqu'il est pris en charge), des instantanés manuels ou l'export d'instantanés vers S3.

<!-- section: migration | objectives: 4.3.14 -->
## Migrer les schémas et les données

Une migration **homogène** conserve le moteur (Oracle vers RDS for Oracle, PostgreSQL vers Aurora PostgreSQL) ; une migration **hétérogène** le change (Oracle vers Aurora PostgreSQL, SQL Server vers Aurora MySQL) et exige d'abord une conversion de schéma.

| Outil | Rôle |
| --- | --- |
| AWS Database Migration Service (AWS DMS) | Déplace les données : chargement complet, réplication continue (capture des données modifiées, CDC), ou chargement complet plus réplication continue, pendant que la source reste en service |
| Migrations de données homogènes DMS | Migrations à l'identique vers RDS ou Aurora avec les outils natifs du moteur, sans serveur |
| DMS Schema Conversion | Évaluation et conversion de schéma gérées et gratuites (tables, index, vues, déclencheurs) vers le nouveau moteur ; vous ne payez que le stockage S3 utilisé |
| AWS Schema Conversion Tool (AWS SCT) | L'alternative à télécharger pour convertir le schéma sur votre propre ordinateur |
| AWS DMS Serverless | La capacité s'ajuste automatiquement de 1 à 384 unités de capacité DMS (DCU), sans instance de réplication à dimensionner |

Ordre des opérations d'une migration hétérogène : évaluer et convertir le schéma (DMS Schema Conversion ou AWS SCT), l'appliquer à la cible, lancer un chargement complet DMS avec CDC, puis basculer quand la réplication a rattrapé son retard.

Autres chemins peu coûteux en effort : un réplica en lecture Aurora d'une instance RDS for MySQL ou PostgreSQL, puis promu ; ou un instantané copié dans une autre Région puis restauré. Le transfert de données vers AWS DMS est gratuit, de même que le transfert entre DMS et une instance RDS ou EC2 dans la même zone de disponibilité ; entre zones de disponibilité ou entre Régions, les tarifs standard s'appliquent.

| Exigence | Réponse |
| --- | --- |
| Oracle vers Aurora PostgreSQL avec un temps d'arrêt minimal | DMS Schema Conversion, puis chargement complet DMS plus CDC |
| PostgreSQL sur site vers Aurora PostgreSQL, avec le moins d'effort | Migration de données homogène DMS |
| RDS for MySQL vers Aurora MySQL, temps d'arrêt minimal | Réplica en lecture Aurora, puis promotion |
| Volume de migration imprévisible, pas de dimensionnement d'instance | AWS DMS Serverless |

> **Piège d'examen.** AWS DMS ne convertit pas à lui seul le schéma d'une migration hétérogène. « Different engine » dans l'énoncé implique une étape de conversion de schéma (DMS Schema Conversion ou AWS SCT) avant la migration des données.

<!-- section: key-points -->
## Points clés

- Mettre en cache pour réduire la base : chargement différé plus écriture simultanée plus TTL ; Valkey est le moteur ElastiCache le moins cher ; DAX uniquement pour les lectures DynamoDB à cohérence éventuelle.
- RDS Proxy regroupe les connexions des applications riches en fonctions Lambda sans instance plus grande ; il est privé et s'attache à l'instance d'écriture.
- Le trafic des réplicas en lecture dans la même Région est gratuit, entre Régions il est facturé ; chaînez les réplicas MySQL et MariaDB dans la Région distante. Les instances de secours Multi-AZ ne servent aucune lecture.
- Le TTL DynamoDB supprime gratuitement en quelques jours ; l'export d'instantané vers S3 en Parquet garde les anciennes données pour Athena.
- Les sauvegardes automatiques s'arrêtent à 35 jours ; une longue conservation exige AWS Backup, des instantanés manuels ou S3. Stockage à froid : 90 jours minimum, pas pour RDS ni Aurora.
- Migration hétérogène = conversion du schéma, puis chargement complet DMS plus CDC.
