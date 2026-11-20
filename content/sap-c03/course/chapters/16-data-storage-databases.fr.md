Au niveau professionnel, les questions sur les données combinent plusieurs magasins dans une même conception : un lac sur S3 gouverné par Lake Formation, un entrepôt, des bases opérationnelles répliquées entre Régions, des caches et des systèmes de fichiers, partagés entre comptes et parfois avec des partenaires. Décidez à partir du modèle d'accès (recherches par clé, jointures, analyses complètes, flux, fichiers), des objectifs de cohérence et de reprise, de l'échelle et du modèle d'exploitation, puis confrontez chaque option au qualificatif décisif.

<!-- section: lakehouse | objectives: 1.5.1 -->
## Architectures de lac de données et de lakehouse

Un lac de données (data lake) stocke des données brutes et préparées dans S3 dans des formats ouverts ; un **lakehouse** ajoute des garanties de type entrepôt sur les mêmes fichiers grâce à un format de table ouvert, pour que plusieurs moteurs lisent et écrivent les mêmes tables.

| Couche | Brique AWS |
| --- | --- |
| Stockage | Compartiments S3 à usage général organisés en zones (brute, préparée, consommation), ou compartiments de tables (table buckets) **S3 Tables** |
| Format de table | **Apache Iceberg** : transactions ACID, évolution du schéma et du partitionnement, voyage dans le temps (time travel), mises à jour et suppressions au niveau ligne |
| Métadonnées | AWS Glue Data Catalog (bases de données, tables, partitions), alimenté par des crawlers, des tâches ETL ou les moteurs |
| Gouvernance | AWS Lake Formation : autorisations au niveau base de données, table, colonne, ligne et cellule, LF-Tags, partage entre comptes |
| Moteurs | Athena (SQL sans serveur), Redshift et Redshift Spectrum, EMR et Glue (Spark), Amazon Quick pour les tableaux de bord |

**S3 Tables** stocke les tables au format Iceberg comme sous-ressources d'un compartiment de tables et exécute la maintenance en continu : compactage des petits fichiers, gestion des instantanés et suppression des fichiers non référencés. L'accès se contrôle avec IAM et les SCP dans l'espace de noms `s3tables` (par table, espace de noms ou compartiment), Block Public Access est toujours actif, et l'intégration au Glue Data Catalog rend les tables visibles pour Athena, Redshift et EMR. Les tables Iceberg autogérées dans des compartiments à usage général donnent plus de contrôle, mais vous planifiez vous-même le compactage.

**Redshift Spectrum** interroge les données de S3 par des schémas externes associés au Data Catalog : un entrepôt joint ses tables locales aux données du lac sans les charger ; les autorisations Lake Formation s'appliquent aux requêtes Spectrum. Athena est la réponse pour du SQL ponctuel sur le lac sans infrastructure ; Redshift pour la BI à forte concurrence avec des jointures complexes sur des données préparées.

> **Piège d'examen.** « Mettre à jour et supprimer des enregistrements individuels du lac pour des demandes de confidentialité, avec voyage dans le temps » exige un format de table ouvert comme Iceberg ; de simples fichiers Parquet dans S3 ne se mettent pas à jour ligne par ligne.

<!-- section: analytics-pipelines | objectives: 1.5.2 -->
## Pipelines d'analytique en temps réel et par lots

| Besoin | Service |
| --- | --- |
| Flux ordonné par clé, plusieurs consommateurs, relecture | Kinesis Data Streams (shards à la demande ou provisionnés) |
| Producteurs et consommateurs Kafka existants, API Kafka | Amazon MSK : provisionné avec des brokers Standard ou Express, ou MSK Serverless ; MSK Connect pour les connecteurs |
| Traitement de flux avec état (fenêtres, jointures) | Amazon Managed Service for Apache Flink |
| Livrer un flux vers S3, Redshift ou OpenSearch Service avec mise en mémoire tampon, sans code | Amazon Data Firehose |
| Envoyer un flux directement dans l'entrepôt | Ingestion en streaming Redshift depuis Kinesis Data Streams ou MSK vers des vues matérialisées |
| Grands traitements par lots Spark, Hive, Presto avec contrôle du cluster | Amazon EMR on EC2 (nœuds de tâche Spot), EMR on EKS pour partager une plateforme Kubernetes |
| Traitements par lots Spark ou Hive sans cluster | EMR Serverless ou tâches ETL AWS Glue |
| Répliquer des données opérationnelles vers Redshift sans pipeline | Intégrations zero-ETL (Aurora MySQL et PostgreSQL, RDS for MySQL, PostgreSQL et Oracle, DynamoDB, applications comme Salesforce ou SAP) |
| Données SaaS (Salesforce, ServiceNow, Zendesk) selon une planification ou sur événement | Amazon AppFlow, avec PrivateLink quand il est pris en charge |

Les **brokers Express** de MSK offrent jusqu'à trois fois le débit par broker des brokers Standard, un stockage élastique payé à l'usage sans rien à provisionner, des déplacements de partitions et une mise à l'échelle jusqu'à 20 fois plus rapides, et ne fonctionnent que sur trois zones de disponibilité. MSK Serverless supprime la planification de capacité pour les charges variables.

Une conception combinée type : les producteurs écrivent dans Kinesis Data Streams ; Flink calcule des agrégats en temps réel pour un tableau de bord ; Firehose dépose les événements bruts dans S3 (tables Iceberg) pour un traitement par lots par EMR ou Glue ; Redshift sert les données préparées. Choisissez le moins de services possible pour l'objectif de latence : secondes (flux), minutes (tampon Firehose, micro-lots), heures (lots).

> **Conseil d'examen.** « Kafka » ou « clients Kafka existants » désigne MSK ; « le moins de charge opérationnelle pour déposer des données de streaming dans S3 » désigne Firehose ; « interroger des données opérationnelles dans Redshift en quelques secondes sans code ETL » désigne le zero-ETL.

<!-- section: database-selection | objectives: 1.5.3 -->
## Sélection des services de base de données

| Exigence de la charge de travail | Service |
| --- | --- |
| Relationnel, moteur existant (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2) | Amazon RDS |
| Relationnel avec un débit plus élevé, un basculement rapide, jusqu'à 15 lecteurs, une réplication mondiale, une mise à l'échelle sans serveur | Amazon Aurora (Aurora Serverless v2 pour une charge variable) |
| Clé-valeur ou document à toute échelle, latence de quelques millisecondes, modèles d'accès connus | Amazon DynamoDB (capacité à la demande ou provisionnée) |
| SQL analytique sur des téraoctets à des pétaoctets, en colonnes | Amazon Redshift (RA3 provisionné ou Redshift Serverless) |
| Documents compatibles MongoDB | Amazon DocumentDB |
| Données fortement connectées, parcours de graphes | Amazon Neptune |
| Charges de travail Cassandra (CQL) | Amazon Keyspaces |
| Séries temporelles à fort débit d'ingestion | Amazon Timestream |
| Base de données principale en mémoire durable, compatible Redis OSS ou Valkey | Amazon MemoryDB |

Critères de sélection que l'examen combine :

- **Modèles d'accès** : DynamoDB exige de concevoir clés et index pour des requêtes connues (clé de partition, clé de tri, GSI) ; les jointures ponctuelles et le reporting orientent vers le relationnel ou Redshift.
- **Cohérence** : les lectures DynamoDB sont à cohérence éventuelle par défaut, fortement cohérentes sur demande dans la Région ; les lecteurs Aurora ont un léger retard sur l'écrivain ; les tables globales en mode cohérence forte multi-Régions (MRSC) renvoient la dernière écriture dans chaque Région.
- **Échelle** : les moteurs relationnels font évoluer les écritures verticalement (ou par partitionnement applicatif) ; DynamoDB et Keyspaces évoluent horizontalement jusqu'à des tailles de table pratiquement illimitées.
- **Exploitation** : options sans serveur (DynamoDB, Aurora Serverless v2, Redshift Serverless) pour une charge en pics ou inconnue.

> **Piège d'examen.** Redshift n'est pas une base OLTP : des milliers de petites écritures transactionnelles par seconde vont dans Aurora ou DynamoDB, avec du zero-ETL ou du streaming vers Redshift pour l'analytique.

<!-- section: database-ha-scaling | objectives: 1.5.4 -->
## Mise à l'échelle et haute disponibilité des bases de données

| Fonctionnalité | Réplication | Lisible | Portée et usage |
| --- | --- | --- | --- |
| Instance de base de données Multi-AZ RDS | Synchrone vers une instance de secours | Non | Une Région, basculement automatique |
| Cluster de bases de données Multi-AZ RDS (MySQL, PostgreSQL) | Semi-synchrone vers deux lecteurs sur trois zones de disponibilité (validation après un accusé de réception) | Oui | Latence d'écriture plus faible qu'une instance Multi-AZ, instances de secours lisibles |
| Réplicas en lecture RDS | Asynchrone, même Région ou autre Région | Oui | Mise à l'échelle des lectures (jusqu'à 15 pour MySQL, MariaDB, PostgreSQL), promotion pour la reprise après sinistre |
| Cluster Aurora | Stockage partagé, six copies sur trois zones de disponibilité | Jusqu'à 15 réplicas | Basculement vers un réplica, point de terminaison lecteur, Auto Scaling des réplicas |
| Aurora Global Database | Au niveau du stockage, généralement moins d'une seconde | Clusters secondaires (jusqu'à 16 instances chacun) | Jusqu'à 10 Régions secondaires, permutation (switchover) sans perte de données, basculement en cas de panne, transfert d'écriture (write forwarding) facultatif |
| Tables globales DynamoDB MREC | Asynchrone, généralement moins d'une seconde | Chaque réplica est en lecture-écriture | Le dernier écrivain l'emporte, RPO égal au délai de réplication |
| Tables globales DynamoDB MRSC | Synchrone vers au moins une autre Région | Chaque réplica est en lecture-écriture | Exactement trois Régions (trois réplicas, ou deux plus un témoin), RPO nul, pas de transactions, pas de TTL, pas de LSI |

Règles qui décident des réponses :

- MRSC se choisit à la création (table vide) et ne peut pas être modifié ; des écritures concurrentes en conflit échouent avec `ReplicatedWriteConflictException` au lieu d'être écrasées.
- La permutation et le basculement gérés d'Aurora Global Database exigent les mêmes versions majeure et mineure du moteur entre les clusters. Le transfert d'écriture permet à une application d'une Région secondaire d'envoyer des écritures que le cluster principal applique.
- Les réplicas RDS Oracle et Db2 peuvent fonctionner en mode monté (mounted) ou veille (standby) pour la reprise entre Régions sans servir de lectures ; Oracle, SQL Server et Db2 ne peuvent pas créer de réplica d'un réplica.
- Tempêtes de connexions pendant un basculement : placez **RDS Proxy** devant RDS ou Aurora pour mutualiser les connexions et réduire l'impact du basculement.

> **Piège d'examen.** L'instance de secours d'une instance Multi-AZ ne sert pas de lectures. « Faire évoluer les lectures et survivre à la perte d'une zone de disponibilité » exige un cluster de bases de données Multi-AZ, des réplicas Aurora, ou des réplicas en lecture plus Multi-AZ.

<!-- section: storage-architectures | objectives: 1.5.5 -->
## Architectures de stockage selon le modèle d'accès

| Modèle d'accès | Service et option |
| --- | --- |
| Objets, toute échelle, web et analytique | Classes de stockage S3 ; compartiments de répertoire (directory buckets) S3 Express One Zone pour un accès constant en quelques millisecondes dans une zone de disponibilité |
| Stockage bloc pour une instance, usage général | EBS gp3 : jusqu'à 80 000 IOPS, 2 000 Mio/s et 64 Tio, performances réglées indépendamment de la taille |
| Performances bloc maximales, Multi-Attach, latence inférieure à la milliseconde | EBS io2 Block Express : jusqu'à 256 000 IOPS, 4 000 Mio/s, 64 Tio |
| Débit séquentiel, faible coût | EBS st1 (500 Mio/s), sc1 pour les données froides |
| Système de fichiers POSIX partagé pour Linux, élastique | Amazon EFS : débit Elastic (par défaut), Regional ou One Zone, classes Standard, IA et Archive |
| Partages SMB Windows avec Active Directory | FSx for Windows File Server (Single-AZ ou Multi-AZ) |
| HPC, entraînement de ML, latence inférieure à la milliseconde, données dans S3 | FSx for Lustre lié à S3 par une association de référentiel de données (data repository association) |
| NFS, SMB et iSCSI sur un même système, fonctions NetApp | FSx for NetApp ONTAP (instantanés, SnapMirror, clones, Multi-AZ) |
| NFS avec instantanés et clones ZFS | FSx for OpenZFS |
| Données temporaires à la latence la plus faible | Stockage d'instance (perdu à l'arrêt de l'instance) |

Recommandations EFS : le mode de performance General Purpose est recommandé pour tous les systèmes de fichiers (Max I/O est de génération précédente et indisponible avec le débit Elastic ou One Zone) ; le débit Elastic convient aux charges en pics et facture les données lues et écrites, le débit Provisioned convient à un débit élevé et stable. Le débit par client atteint 1 500 Mio/s seulement avec le débit Elastic sur un système de fichiers Regional et un client EFS récent.

> **Conseil d'examen.** « Migrer à l'identique des serveurs de fichiers Windows qui utilisent les ACL NTFS et DFS » correspond à FSx for Windows File Server ; « migrer des baies NetApp en conservant SnapMirror » à FSx for NetApp ONTAP ; « traiter des jeux de données S3 avec un système de fichiers parallèle » à FSx for Lustre.

<!-- section: caching | objectives: 1.5.6 -->
## Stratégies de mise en cache des données

| Cache | Emplacement | Usage |
| --- | --- | --- |
| DynamoDB Accelerator (DAX) | Devant DynamoDB, compatible avec l'API | Lectures en microsecondes pour des accès majoritairement en lecture, à cohérence éventuelle, avec peu de changements de code |
| ElastiCache (Valkey, Redis OSS, Memcached) | Cache géré par l'application pour toute source de données | Résultats de requêtes, sessions, classements, limitation de débit |
| ElastiCache Serverless | Mêmes moteurs, sans dimensionnement de nœuds | Charge imprévisible, mise à l'échelle automatique |
| CloudFront | Périphérie | Contenu HTTP et réponses d'API |
| Mise en cache API Gateway | Étape (stage) d'une API REST | Appels d'API identiques répétés |

Comportement de DAX : un cache d'éléments pour `GetItem` et `BatchGetItem`, un cache de requêtes distinct pour `Query` et `Scan`. Les lectures fortement cohérentes et transactionnelles passent directement à DynamoDB sans mise en cache. Les écritures traversent DAX jusqu'à DynamoDB et mettent à jour le cache d'éléments, mais pas le cache de requêtes, qui reste périmé jusqu'à l'expiration de son TTL. Utilisez au moins trois nœuds dans plusieurs zones de disponibilité.

Modèles pour ElastiCache :

- **Chargement différé (lazy loading, cache-aside)** : lire le cache, en cas d'absence lire la base et alimenter le cache. Seules les données demandées sont en cache ; une absence coûte trois allers-retours ; les données peuvent être périmées.
- **Écriture immédiate (write-through)** : mettre à jour le cache à chaque écriture en base. Les données sont à jour, mais chaque écriture paie l'étape supplémentaire et des données rarement lues occupent la mémoire.
- **TTL** sur chaque clé pour borner la péremption et la mémoire, avec une variation aléatoire pour éviter les expirations simultanées.
- Valkey ou Redis OSS pour la réplication, le basculement Multi-AZ, la persistance et des types de données riches ; Memcached pour un cache simple multithread. Global Datastore réplique les caches Valkey ou Redis OSS vers d'autres Régions pour des lectures à faible latence.

> **Piège d'examen.** DAX n'aide pas les lectures fortement cohérentes et n'est pas un cache général pour RDS. Mettre en cache des résultats de requêtes relationnelles relève d'ElastiCache.

<!-- section: catalog-sharing | objectives: 1.5.7 -->
## Catalogage des données et partage entre comptes

- **AWS Glue Data Catalog** : un catalogue par compte et par Région ; les crawlers déduisent schémas et partitions ; une politique de ressource du catalogue peut l'ouvrir à d'autres comptes, mais Lake Formation est la méthode de partage recommandée.
- **Partage Lake Formation** : accordez des autorisations à un autre compte, à une organisation, à une OU ou à un principal IAM précis. Le **contrôle d'accès basé sur les LF-Tags** (recommandé) accorde sur des expressions de balises, si bien que les nouvelles tables sont couvertes automatiquement ; la méthode des **ressources nommées** accorde sur des bases de données et des tables précises. Lake Formation utilise AWS RAM ; les octrois au sein de l'organisation s'appliquent immédiatement, les comptes externes acceptent une invitation. Les octrois à une organisation ou à une OU avec des LF-Tags exigent les paramètres de version entre comptes 3 ou ultérieurs. Le consommateur crée des **liens de ressource** (resource links) pour qu'Athena et Redshift Spectrum interrogent les tables partagées. Les filtres de données restreignent lignes, colonnes ou cellules. Le **mode d'accès hybride** active les autorisations Lake Formation pour des tables et des principaux choisis, tandis que les politiques IAM et S3 existantes continuent de fonctionner pour les autres.
- **Partage de données Redshift** : accès en direct en lecture (et en écriture) à des bases de données, schémas, tables et vues entre clusters, groupes de travail, comptes et Régions, sans copier les données.
- **AWS Clean Rooms** : des partenaires analysent des jeux de données combinés sans voir les données brutes des autres. Les membres rejoignent une collaboration et lient des tables configurées (S3 avec le Glue Data Catalog, Athena, Snowflake, Databricks) ; les données restent où elles sont. **Règles d'analyse** : agrégation (statistiques uniquement), liste (recouvrement au niveau ligne) ou personnalisée (modèles d'analyse approuvés). Options : confidentialité différentielle, segments similaires (lookalike) avec Clean Rooms ML, calcul cryptographique pour garder les données chiffrées pendant les requêtes.

```bash
# Producer account: share every table tagged domain=sales and sensitivity=internal
aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=444455556666 \
  --permissions SELECT DESCRIBE \
  --resource '{"LFTagPolicy":{"ResourceType":"TABLE","Expression":[{"TagKey":"domain","TagValues":["sales"]},{"TagKey":"sensitivity","TagValues":["internal"]}]}}'
```

| Exigence | Réponse |
| --- | --- |
| Gouvernance centrale, les comptes consommateurs interrogent des tables préparées avec des restrictions de colonnes | LF-Tags Lake Formation partagés avec les comptes consommateurs, liens de ressource |
| Le compte BI lit l'entrepôt en direct du compte finance | Partage de données Redshift |
| Deux entreprises mesurent le recouvrement de leurs campagnes sans échanger leurs listes de clients | Clean Rooms avec une règle d'analyse d'agrégation |

> **Piège d'examen.** Copier les données dans chaque compte consommateur (réplication S3 ou exports) casse la gouvernance à source unique et multiplie les coûts ; le qualificatif « sans copier les données » désigne le partage Lake Formation, le partage de données Redshift ou Clean Rooms.

<!-- section: key-points -->
## Points clés

- Lakehouse = S3 plus Iceberg (S3 Tables pour la maintenance gérée) plus Glue Data Catalog plus Lake Formation ; Athena pour le ponctuel, Redshift Spectrum pour joindre lac et entrepôt.
- Flux : Kinesis Data Streams, MSK (brokers Express, Serverless), Flink, Firehose ; lots : EMR, EMR Serverless, Glue ; zero-ETL vers Redshift ; AppFlow pour le SaaS.
- Choisissez la base selon le modèle d'accès, la cohérence et l'échelle ; Redshift sert l'analytique, pas l'OLTP.
- L'instance de secours Multi-AZ n'est pas lisible ; le cluster de bases de données Multi-AZ a deux instances de secours lisibles ; Aurora Global Database jusqu'à 10 Régions secondaires ; DynamoDB MRSC = trois Régions, RPO nul, pas de transactions.
- gp3 jusqu'à 80 000 IOPS, io2 Block Express jusqu'à 256 000 ; débit Elastic par défaut pour EFS ; variante FSx selon le protocole et les fonctions.
- DAX pour les lectures DynamoDB à cohérence éventuelle ; ElastiCache avec chargement différé, écriture immédiate et TTL.
- Partager sans copier : Lake Formation (LF-Tags, RAM, liens de ressource), partage de données Redshift, règles d'analyse Clean Rooms.
