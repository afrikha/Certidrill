Une question sur les magasins de données donne un modèle d'accès (recherches par clé, analyses, flux, fichiers, recherche par similarité), un volume, une latence et un budget, puis demande le magasin, le paramètre ou la méthode d'accès qui y répond. Ce chapitre traite du choix et de la configuration des magasins, des outils de migration et d'accès à distance, des verrous, des formats de table ouverts et des index vectoriels.

<!-- section: store-selection | objectives: 2.1.1 -->
## Choisir le stockage selon le coût et la performance

| Exigence | Magasin |
| --- | --- |
| SQL complexe sur des téraoctets à pétaoctets, jointures et agrégations, tableaux de bord BI | Amazon Redshift |
| Transactions, intégrité relationnelle, volume modéré | Amazon RDS ou Aurora |
| Accès clé/valeur ou mono-table en quelques millisecondes à toute échelle | Amazon DynamoDB |
| Flux ordonné conservé pour relecture par plusieurs consommateurs | Kinesis Data Streams (24 heures par défaut, jusqu'à 365 jours) ou Amazon MSK |
| Stockage durable et bon marché de fichiers bruts et préparés interrogés par de nombreux moteurs | Lac de données Amazon S3, gouverné par Lake Formation |
| Traitement Spark ou Hadoop avec des données de travail temporaires | Amazon EMR avec HDFS pour les données intermédiaires, S3 (EMRFS) pour les données persistantes |

Leviers de coût et de performance :

| Service | Levier |
| --- | --- |
| Redshift | Nœuds RA3 ou RG provisionnés pour les charges régulières (stockage géré facturé séparément du calcul) ; Redshift Serverless (RPU-heures pendant l'exécution des requêtes) pour les charges intermittentes ou imprévisibles |
| DynamoDB | À la demande pour un trafic inconnu ou en pics ; capacité provisionnée avec mise à l'échelle automatique pour un trafic régulier |
| Kinesis Data Streams | À la demande (démarre à 4 Mo/s en écriture, s'adapte automatiquement) ou shards provisionnés (1 Mo/s ou 1 000 enregistrements/s en entrée, 2 Mo/s en sortie par shard) ; une conservation plus longue coûte plus cher |
| MSK | Brokers provisionnés ou MSK Serverless ; le stockage hiérarchisé (tiered storage) conserve longtemps à bas coût sans ajouter de brokers |
| EMR | Clusters éphémères lisant S3, instances Spot sur les nœuds task, EMR Serverless pour ne gérer aucun cluster |

> **Piège d'examen.** AWS Lake Formation n'est pas un service de stockage. Il enregistre des emplacements S3 et gère les autorisations sur les tables du Data Catalog ; les données restent dans S3.

<!-- section: access-patterns | objectives: 2.1.2 -->
## Configurer les magasins selon les modèles d'accès

| Magasin | Modèle d'accès → configuration |
| --- | --- |
| Redshift | Jointures sur une grande table de faits → clé de distribution sur la colonne de jointure, petites dimensions en `DISTSTYLE ALL` ; filtres de plage sur des dates → clé de tri sur la date ; pics de requêtes simultanées → mise à l'échelle de la simultanéité (concurrency scaling) ; charges mixtes → files de gestion de la charge de travail (WLM) |
| DynamoDB | Clé de partition à forte cardinalité pour répartir le trafic ; clé de tri pour les requêtes de plage dans une partition ; index secondaire global pour une autre clé d'accès (lectures à cohérence éventuelle) ; index secondaire local (même clé de partition, autre clé de tri, défini à la création de la table) ; DAX pour des lectures en cache en microsecondes |
| RDS et Aurora | Réplicas en lecture ou lecteurs Aurora (jusqu'à 15, point de terminaison lecteur) pour monter en charge en lecture ; Multi-AZ pour la disponibilité ; RDS Proxy pour le regroupement de connexions depuis Lambda |
| EMR | HDFS sur les nœuds core pour les traitements itératifs à forte redistribution ; S3 pour les données qui doivent survivre au cluster |
| Lake Formation | Enregistrer l'emplacement S3, accorder des autorisations sur les tables, colonnes ou lignes aux consommateurs |

> **Conseil d'examen.** L'exigence DynamoDB « interroger par un attribut qui n'est pas une clé » se résout par un index secondaire global, pas par un `Scan` avec filtre : un filtre lit, et facture, quand même chaque élément.

<!-- section: purpose-built-stores | objectives: 2.1.3 -->
## Des magasins spécialisés pour des cas d'utilisation précis

| Cas d'utilisation | Magasin |
| --- | --- |
| Base de données principale durable, lectures en microsecondes et écritures en quelques millisecondes, API Valkey ou Redis OSS | Amazon MemoryDB (journal transactionnel Multi-AZ) |
| Cache devant une autre base de données, perte de données acceptable | Amazon ElastiCache |
| Recherche sémantique à côté de données relationnelles, jointures SQL avec les métadonnées | Aurora PostgreSQL avec `pgvector` et un index HNSW |
| Recherche plein texte, analyse de journaux, recherche vectorielle à fort débit de requêtes | Amazon OpenSearch Service |
| Stockage à bas coût de grands ensembles de vecteurs rarement interrogés | Amazon S3 Vectors (compartiments et index vectoriels) |
| Relations parcourues sur plusieurs sauts | Amazon Neptune |
| Documents JSON, API MongoDB | Amazon DocumentDB |
| Colonnes larges, Cassandra Query Language | Amazon Keyspaces |
| Séries temporelles | Amazon Timestream for InfluxDB (Timestream for LiveAnalytics est en maintenance, fermé aux nouveaux clients) |

> **Piège d'examen.** MemoryDB et ElastiCache partagent les API Valkey et Redis OSS, mais seul MemoryDB est un système d'enregistrement durable. « Accès clé/valeur rapide sans perte de données en cas de panne d'un nœud » désigne MemoryDB.

<!-- section: migration-tools | objectives: 2.1.4 -->
## Intégrer les outils de migration et de transfert

| Exigence | Outil |
| --- | --- |
| Des partenaires envoient des fichiers en SFTP, FTPS, FTP ou AS2 ; aucun serveur à gérer | AWS Transfer Family, avec stockage dans S3 ou EFS |
| Copier des partages de fichiers (NFS, SMB), HDFS, des stockages d'objets ou d'autres clouds vers S3, EFS ou FSx, selon une planification, avec vérification | AWS DataSync (agent pour les sources sur site) |
| Migrer une base de données avec réplication continue (chargement complet plus CDC) | AWS DMS |
| Extraire des données d'applications SaaS (Salesforce, ServiceNow...) | Amazon AppFlow |
| Réhéberger des serveurs | AWS Application Migration Service |

Transfer Family s'intègre à un pipeline par S3 : un chargement crée un objet, une notification S3 Event Notifications ou une règle EventBridge démarre une fonction Lambda, un flux de travail Step Functions ou une tâche Glue. Les flux de travail gérés (managed workflows) de Transfer Family peuvent copier, baliser, déchiffrer ou analyser un fichier juste après son chargement. Les utilisateurs sont gérés par le service (SFTP), par AWS Directory Service ou par un fournisseur d'identité personnalisé (Lambda ou API Gateway). FTP (non chiffré) n'est autorisé que sur un point de terminaison de VPC.

DataSync ne copie que les données modifiées lors des exécutions suivantes, chiffre en transit et vérifie l'intégrité. AWS Snowball Edge et Snowmobile sont arrêtés : les gros transferts hors ligne ne sont plus une réponse Snow.

> **Conseil d'examen.** « Les partenaires gardent leurs clients et scripts SFTP existants » désigne Transfer Family. « Déplacer 200 To d'un NAS sur site vers S3 par Direct Connect, puis synchroniser chaque semaine » désigne DataSync.

<!-- section: remote-access | objectives: 2.1.5 -->
## Accès à distance et migration avec Redshift

| Exigence | Fonctionnalité |
| --- | --- |
| Joindre les lignes opérationnelles en direct de RDS ou Aurora (PostgreSQL, MySQL) aux tables de l'entrepôt, sans pipeline | Requête fédérée : schéma externe avec un secret Secrets Manager, prédicats poussés vers la source |
| Interroger des fichiers S3 sans les charger | Redshift Spectrum : schéma externe sur le Glue Data Catalog, tables externes en lecture seule, élagage des partitions |
| Requête coûteuse ou tableau de bord répétés | Vue matérialisée, actualisée manuellement ou avec `AUTO REFRESH YES` ; la réécriture automatique des requêtes l'utilise |
| Répliquer en continu une base opérationnelle dans Redshift sans code ETL | Intégration zéro ETL (Aurora MySQL et PostgreSQL, RDS for MySQL, PostgreSQL et Oracle, DynamoDB, certaines applications SaaS) |
| D'autres clusters ou comptes lisent les mêmes données sans copie | Partage de données (data sharing) Redshift |
| Migrer les données une fois dans Redshift | `COPY` depuis S3 (ou DMS pour une base de données source) |

```sql
CREATE EXTERNAL SCHEMA ops
FROM POSTGRES DATABASE 'orders' SCHEMA 'public'
URI 'orders-db.cluster-abc123.eu-west-1.rds.amazonaws.com'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftFederated'
SECRET_ARN 'arn:aws:secretsmanager:eu-west-1:111122223333:secret:orders-ro';

CREATE EXTERNAL SCHEMA lake
FROM DATA CATALOG DATABASE 'curated'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftSpectrum';

CREATE MATERIALIZED VIEW daily_sales AUTO REFRESH YES AS
SELECT sale_date, store_id, SUM(amount) AS revenue
FROM lake.sales
GROUP BY sale_date, store_id;
```

Sur les nœuds RA3, Spectrum s'exécute sur une flotte séparée ; les nœuds RG et Redshift Serverless exécutent les requêtes sur le lac de données avec leur propre capacité de calcul.

> **Piège d'examen.** Une requête fédérée lit la source à chaque exécution. Pour des tableaux de bord qui répètent la même agrégation toute la journée, une vue matérialisée (ou une réplication zéro ETL) évite de solliciter la base opérationnelle à chaque fois.

<!-- section: locks | objectives: 2.1.6 -->
## Gérer les verrous

**Redshift.** Les transactions s'exécutent par défaut en isolation **SNAPSHOT** sur les clusters provisionnés et les groupes de travail sans serveur ; **SERIALIZABLE** est plus strict et annule une transaction en conflit avec l'erreur 1023. Les `INSERT` et `COPY` simultanés partagent un verrou de table ; `UPDATE`, `DELETE`, `MERGE` et le DDL exigent un verrou exclusif. `LOCK` prend un verrou `ACCESS EXCLUSIVE` qui fait attendre les autres lectures et écritures jusqu'à la fin de la transaction.

```sql
BEGIN;
LOCK sales;
DELETE FROM sales USING sales_stage WHERE sales.sale_id = sales_stage.sale_id;
INSERT INTO sales SELECT * FROM sales_stage;
COMMIT;

SELECT pid, xid, lock_mode, granted, relation FROM svv_transactions;
SELECT PG_TERMINATE_BACKEND(22378);
```

- Éviter les interblocages (deadlocks) : mettre à jour et verrouiller les tables dans le même ordre dans chaque transaction, séparer les instructions exclusives des chargements simultanés, ajouter une logique de nouvelle tentative.
- Trouver les sessions bloquantes dans `SVV_TRANSACTIONS` (`granted` à false = en attente) ; terminer une session bloquante avec `PG_TERMINATE_BACKEND`, qui annule son travail. Les conflits sont enregistrés dans `STL_TR_CONFLICT`.

**RDS et Aurora.** Les moteurs verrouillent des lignes. `SELECT ... FOR UPDATE` verrouille les lignes qu'une transaction va modifier ; `LOCK TABLE` (PostgreSQL) ou `LOCK TABLES` (MySQL) verrouille des tables entières. Les transactions longues et les index manquants provoquent des attentes de verrou : repérez-les dans `pg_locks` et `pg_stat_activity` (PostgreSQL) ou dans le Performance Schema (MySQL), et dans les événements d'attente de CloudWatch Database Insights.

**Sans verrou.** DynamoDB utilise le verrouillage optimiste : un attribut de version vérifié par une expression de condition. Les tables Iceberg dans Athena utilisent la simultanéité optimiste par le Glue Data Catalog.

> **Piège d'examen.** En isolation SNAPSHOT, les lecteurs travaillent sur leur instantané et ne retardent pas un `COPY` ; une transaction ouverte qui détient un verrou exclusif, si. « Les chargements bloquent chaque nuit après la session d'un analyste » signifie une transaction inactive qui détient encore un verrou : trouvez-la et terminez-la.

<!-- section: open-table-formats | objectives: 2.1.7 -->
## Formats de table ouverts : Apache Iceberg

Apache Iceberg ajoute une couche de métadonnées (fichiers de métadonnées, listes de manifestes, manifestes) au-dessus de fichiers de données Parquet, ORC ou Avro dans S3. Chaque validation crée un **instantané (snapshot)**, ce qui apporte :

| Capacité | Avantage |
| --- | --- |
| Transactions ACID avec simultanéité optimiste | Les lecteurs ne voient jamais d'écriture partielle |
| `UPDATE`, `DELETE`, `MERGE INTO` au niveau des lignes | Insertions-mises à jour (upserts) et suppression d'enregistrements dans un lac de données |
| Voyage dans le temps et par version (time travel) | Reproduire un rapport, auditer ou revenir en arrière |
| Évolution du schéma | Ajouter, renommer ou supprimer des colonnes sans réécrire les fichiers |
| Partitionnement masqué et évolution des partitions | Partitionner par `day(ts)` ou `bucket(n, id)` sans colonne de partition dans les requêtes ; changer de schéma de partitionnement plus tard |

Apache Hudi et Delta Lake offrent des fonctionnalités similaires. Les Governed Tables de Lake Formation sont arrêtées : Iceberg est la réponse pour les tables transactionnelles sur AWS.

```sql
CREATE TABLE curated.orders (order_id string, customer_id string, amount double, ts timestamp)
PARTITIONED BY (day(ts))
LOCATION 's3://example-lake/curated/orders/'
TBLPROPERTIES ('table_type' = 'ICEBERG');

MERGE INTO curated.orders t USING staging.orders s ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET amount = s.amount
WHEN NOT MATCHED THEN INSERT VALUES (s.order_id, s.customer_id, s.amount, s.ts);

SELECT * FROM curated.orders FOR TIMESTAMP AS OF (current_timestamp - interval '1' day);
OPTIMIZE curated.orders REWRITE DATA USING BIN_PACK;
VACUUM curated.orders;
```

Moteurs : Athena (tables Iceberg du Glue Data Catalog), tâches Glue (`--datalake-formats iceberg`), EMR, Redshift, SageMaker Unified Studio. Maintenance :

| Problème | Maintenance | Sur AWS |
| --- | --- | --- |
| Nombreux petits fichiers dus au streaming ou à des validations fréquentes | Compactage | `OPTIMIZE` d'Athena, optimiseurs de table du Glue Data Catalog, automatique dans S3 Tables (cible de 512 Mo par défaut) |
| Les anciens instantanés conservent fichiers et métadonnées | Expiration des instantanés | `VACUUM` d'Athena (instantanés de plus de 5 jours par défaut), rétention des instantanés Glue, gestion des instantanés de S3 Tables (120 heures, 1 instantané minimum par défaut) |
| Fichiers qui ne sont plus référencés | Suppression des fichiers orphelins | `VACUUM`, suppression des fichiers orphelins Glue, suppression des fichiers non référencés de S3 Tables |

**Amazon S3 Tables** stocke des tables Iceberg dans des **compartiments de tables (table buckets)**, avec des espaces de noms, et exécute automatiquement le compactage, la gestion des instantanés et la suppression des fichiers non référencés ; l'intégration au Glue Data Catalog les rend visibles par Athena, Redshift, EMR et Spark.

> **Piège d'examen.** Faire expirer des instantanés supprime la possibilité d'y revenir dans le temps. « Conserver 30 jours de voyage dans le temps » impose une rétention des instantanés d'au moins 30 jours, pas la valeur par défaut.

<!-- section: vector-indexes | objectives: 2.1.8 -->
## Types d'index vectoriels : HNSW et IVF

Une vectorisation (embedding) est un vecteur de nombres qui représente le sens d'un texte, d'une image ou d'un enregistrement. La recherche par similarité trouve les vecteurs les plus proches selon la similarité cosinus, la distance euclidienne (L2) ou le produit scalaire. Une recherche k-NN exacte compare la requête à chaque vecteur ; les index de plus proches voisins approximatifs (ANN) sacrifient un peu de rappel pour une latence bien plus faible.

| | HNSW (Hierarchical Navigable Small Worlds) | IVF (fichier inversé) |
| --- | --- | --- |
| Structure | Graphe multicouche reliant les vecteurs proches ; la recherche descend des couches hautes clairsemées vers la couche basse dense | Vecteurs regroupés en clusters autour de centroïdes ; une requête n'analyse que les clusters les plus proches |
| Entraînement | Aucun | Entraînement k-means sur des données représentatives avant l'indexation |
| Paramètres de construction | `m` (arêtes par vecteur), `ef_construction` | `nlist` (`lists` dans pgvector) |
| Paramètre de requête | `ef_search` : plus élevé = meilleur rappel, plus lent | `nprobes` (`probes`) : plus de clusters = meilleur rappel, plus lent |
| Mémoire | Plus élevée (arêtes stockées pour chaque vecteur) | Plus faible ; encore plus faible avec la quantification par produit (PQ) |
| Vitesse de construction | Plus lente | Plus rapide |
| Rappel et latence | Rappel élevé à faible latence | Rappel plus faible pour une même latence ; baisse quand les nouvelles données ne correspondent plus aux centroïdes (reconstruire) |

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON docs USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 256);
SET hnsw.ef_search = 100;

CREATE INDEX ON docs_archive USING ivfflat (embedding vector_l2_ops) WITH (lists = 1000);
SET ivfflat.probes = 20;
```

Où ils s'exécutent : Aurora PostgreSQL et RDS for PostgreSQL avec `pgvector` (HNSW et IVFFlat), k-NN d'OpenSearch Service, S3 Vectors ; les bases de connaissances Amazon Bedrock peuvent utiliser ces magasins.

> **Conseil d'examen.** « Meilleur rappel à faible latence, la mémoire n'est pas une contrainte » désigne HNSW. « Des milliards de vecteurs, minimiser la mémoire et le coût, une perte de rappel est acceptable » désigne IVF, généralement avec la quantification par produit.

<!-- section: key-points -->
## Points clés

- Redshift pour le SQL analytique, RDS ou Aurora pour les transactions, DynamoDB pour l'accès par clé à grande échelle, Kinesis ou MSK pour des flux relisibles, S3 pour le lac ; Lake Formation gouverne, il ne stocke pas.
- Adapter la configuration à l'accès : clés de distribution et de tri, GSI et LSI, réplicas en lecture et RDS Proxy, HDFS uniquement pour les données temporaires d'EMR.
- MemoryDB est une base de données en mémoire durable ; pgvector avec HNSW sur Aurora PostgreSQL garde les vecteurs à côté des données relationnelles.
- Transfer Family pour les partenaires SFTP, FTPS, FTP et AS2 ; DataSync pour les copies de fichiers et d'objets ; DMS pour les bases de données ; Snowball Edge est arrêté.
- Redshift : requêtes fédérées pour les données RDS ou Aurora en direct, Spectrum pour S3, vues matérialisées pour les requêtes répétées, zéro ETL pour la réplication continue, partage de données pour un accès sans copie.
- Redshift utilise par défaut l'isolation SNAPSHOT ; `LOCK` est exclusif jusqu'à la validation ; trouvez les blocages dans `SVV_TRANSACTIONS`, terminez-les avec `PG_TERMINATE_BACKEND`.
- Iceberg : ACID, modifications au niveau des lignes, voyage dans le temps, évolution du schéma et des partitions ; maintenance par compactage, expiration des instantanés et suppression des fichiers orphelins (automatique dans S3 Tables).
- HNSW : graphe, sans entraînement, meilleur rappel, plus de mémoire. IVF : clusters, entraînement, moins de mémoire, rappel plus faible.
