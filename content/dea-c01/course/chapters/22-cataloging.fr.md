Un catalogue de données stocke ce dont les moteurs ont besoin pour lire les données là où elles se trouvent : emplacement, format, schéma et partitions. Les questions d'examen demandent comment créer et référencer l'AWS Glue Data Catalog, quand un robot d'analyse (crawler) est le bon outil et comment le régler, pourquoi une requête ne voit pas les nouvelles partitions, comment une tâche atteint une base de données dans un VPC, et comment un catalogue métier permet aux équipes de trouver et de demander des données.

<!-- section: catalog-consumption | objectives: 2.2.1 -->
## Consommer des données par un catalogue

Le catalogue ne contient que des métadonnées ; les données restent dans leur source (S3, une base de données, un compartiment de tables). Un moteur consulte la table, puis lit directement les fichiers ou les lignes.

| Consommateur | Utilisation du Glue Data Catalog |
| --- | --- |
| Amazon Athena | Chaque base de données et table du catalogue est interrogeable en SQL ; les autorisations Lake Formation s'appliquent |
| Redshift Spectrum | `CREATE EXTERNAL SCHEMA ... FROM DATA CATALOG` expose les tables du catalogue au SQL Redshift |
| Amazon EMR | Hive, Spark et Trino utilisent le Data Catalog comme metastore |
| Tâches AWS Glue | `create_dynamic_frame.from_catalog` lit une table par son nom, avec élagage des partitions |
| SageMaker Unified Studio | Les tables du catalogue sont importées comme ressources (assets) du catalogue métier |

D'autres comptes consomment les tables du catalogue grâce aux autorisations entre comptes de Lake Formation et aux liens de ressources (resource links). Les S3 Tables intégrées au Data Catalog et les connecteurs de sources de données Athena (fonctions Lambda pour DynamoDB, des bases JDBC et d'autres) apparaissent comme des catalogues supplémentaires que les mêmes moteurs interrogent.

> **Conseil d'examen.** « Interroger les fichiers sur place, sans les charger ni les copier » désigne une table du catalogue lue par Athena ou Redshift Spectrum. Définir la table une seule fois dans le Data Catalog la rend disponible pour les deux.

<!-- section: technical-catalog | objectives: 2.2.2 -->
## Créer un catalogue technique : Glue Data Catalog et metastore Hive

Il existe un Glue Data Catalog par compte et par Région. Il contient des **bases de données** (regroupements logiques), des **tables** (emplacement, format, SerDe, colonnes, clés de partition), des **partitions** et des **connexions**. Il est compatible avec le metastore Apache Hive.

| Méthode de création d'une table | Quand |
| --- | --- |
| Robot d'analyse Glue | Schémas inconnus ou changeants, nombreux jeux de données |
| DDL Athena (`CREATE EXTERNAL TABLE`, `CREATE TABLE AS SELECT`) | Schéma connu, contrôle total des types et des propriétés |
| CloudFormation (`AWS::Glue::Table`), CDK ou API Glue | Tables déployées sous forme de code avec le pipeline |
| Tâche ETL Glue avec `enableUpdateCatalog` | La tâche qui écrit les données enregistre la table et ses partitions |

```text
CREATE EXTERNAL TABLE raw.clicks (
  user_id string,
  url string,
  event_time timestamp
)
PARTITIONED BY (dt string)
STORED AS PARQUET
LOCATION 's3://example-lake/raw/clicks/';
```

EMR peut utiliser le Glue Data Catalog comme metastore Hive grâce à la classification `hive-site`, ce qui donne un metastore persistant partagé par les clusters, Athena et Glue (et par d'autres comptes avec `hive.metastore.glue.catalogid`) :

```json
[
  {
    "Classification": "hive-site",
    "Properties": {
      "hive.metastore.client.factory.class": "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory"
    }
  }
]
```

L'autre option est un metastore Hive externe dans une base Amazon RDS ou Aurora MySQL, exploitée par l'équipe. Le metastore par défaut du cluster disparaît avec un cluster éphémère.

> **Piège d'examen.** Un metastore Hive sur le nœud primary d'EMR est perdu à l'arrêt du cluster. « Des clusters éphémères doivent partager les définitions de tables avec Athena » impose le Glue Data Catalog comme metastore.

<!-- section: crawlers | objectives: 2.2.3 -->
## Découvrir les schémas avec les robots d'analyse Glue

Un robot d'analyse se connecte à un magasin de données, exécute des **classificateurs** (intégrés pour CSV, JSON, Parquet, ORC, Avro, XML et d'autres, ou personnalisés grok, JSON, XML et CSV) pour déduire le format et le schéma, regroupe les fichiers compatibles en tables et écrit tables et partitions dans le Data Catalog. Sources : S3, bases de données JDBC, DynamoDB, MongoDB et DocumentDB, tables Delta Lake, Iceberg et Hudi, tables existantes du catalogue. Il s'exécute à la demande, selon une planification cron ou depuis un déclencheur de flux de travail Glue, avec un rôle IAM qui peut lire la source et mettre à jour le catalogue.

| Paramètre | Options |
| --- | --- |
| Chemin d'inclusion et exclusions | Chemin S3 ou chemin JDBC `database/schema/table` (`%` comme caractère générique) ; modèles glob d'exclusion comme `**.tmp` |
| Taille d'échantillon (S3) | De 1 à 249 fichiers par dossier feuille au lieu de tous les fichiers, pour raccourcir l'analyse de dossiers au schéma uniforme |
| Exécutions suivantes (`RecrawlPolicy`) | `CRAWL_EVERYTHING`, `CRAWL_NEW_FOLDERS_ONLY` (incrémentiel), `CRAWL_EVENT_MODE` (les notifications d'événements S3 identifient les dossiers modifiés) |
| Politique de modification du schéma | `UpdateBehavior` : `UPDATE_IN_DATABASE` ou `LOG` ; `DeleteBehavior` : `LOG`, `DELETE_FROM_DATABASE` ou `DEPRECATE_IN_DATABASE` |
| Configuration de sortie | Ajouter seulement les nouvelles colonnes (`MergeNewColumns`) ; partitions qui héritent du schéma de la table (`InheritFromTable`) ; schéma unique pour chaque chemin S3 (`CombineCompatibleSchemas`) ; niveau de table ; nombre maximal de tables |
| Informations d'identification Lake Formation | Analyser avec les autorisations Lake Formation, dans le même compte ou un autre |

Les robots d'analyse créent par défaut des index de partition pour les cibles S3 et Delta Lake.

```bash
aws glue create-crawler --name clicks-raw \
  --role arn:aws:iam::111122223333:role/GlueCrawlerRole \
  --database-name raw \
  --targets '{"S3Targets":[{"Path":"s3://example-lake/raw/clicks/","Exclusions":["**.tmp"]}]}' \
  --recrawl-policy RecrawlBehavior=CRAWL_NEW_FOLDERS_ONLY \
  --schema-change-policy UpdateBehavior=LOG,DeleteBehavior=LOG \
  --schedule "cron(15 * * * ? *)"
```

> **Piège d'examen.** Un robot d'analyse qui crée une table par dossier au lieu d'une table partitionnée a généralement trouvé des schémas ou des formats incompatibles (un CSV égaré parmi des fichiers Parquet, des en-têtes différents). Supprimez ou excluez les fichiers parasites, activez « Create a single schema for each S3 path » ou définissez le niveau de table.

<!-- section: partition-sync | objectives: 2.2.4 -->
## Synchroniser les partitions avec le catalogue

Les nouveaux dossiers S3 restent invisibles pour Athena et Spectrum tant que leurs partitions n'existent pas dans le catalogue (ou ne sont pas projetées).

| Méthode | Usage |
| --- | --- |
| Tâche Glue avec `enableUpdateCatalog` et `partitionKeys` | La tâche qui écrit ajoute les partitions au fil de l'écriture (cibles S3 ; JSON, CSV, Avro, Parquet) |
| Robot d'analyse, incrémentiel ou en mode événements | Producteurs multiples, changements de schéma à détecter |
| `MSCK REPAIR TABLE` dans Athena | Dossiers de style Hive (`dt=2026-11-20/`) au premier chargement ou pour resynchroniser ; ajoute seulement, peut expirer sur de grandes tables |
| `ALTER TABLE ADD PARTITION ... LOCATION` | Ajouts quotidiens, ou dossiers qui ne sont pas au format `key=value` ; `DROP PARTITION` retire les partitions obsolètes |
| API Glue `BatchCreatePartition` | Une fonction Lambda déclenchée par des événements S3 enregistre chaque nouveau dossier |
| Projection de partitions Athena | Valeurs prévisibles (dates, entiers, énumérations, chaînes injectées) : partitions calculées à l'exécution, rien à enregistrer |

```text
ALTER TABLE raw.clicks ADD IF NOT EXISTS
PARTITION (dt = '2026-11-20') LOCATION 's3://example-lake/raw/clicks/dt=2026-11-20/';

ALTER TABLE raw.device_logs SET TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.dt.type' = 'date',
  'projection.dt.format' = 'yyyy/MM/dd',
  'projection.dt.range' = '2024/01/01,NOW',
  'storage.location.template' = 's3://example-lake/raw/device_logs/${dt}/'
);
```

Quand une table compte des millions de partitions, les **index de partition** (jusqu'à 3 par table) permettent à `GetPartitions` de ne renvoyer que les partitions correspondantes. Redshift Spectrum, EMR et les DataFrames Spark de Glue les utilisent automatiquement ; Athena a besoin de la propriété de table `partition_filtering.enabled` à `true`. La première clé de l'index doit figurer dans le filtre, combinée uniquement par `AND`.

> **Piège d'examen.** La projection de partitions ne fonctionne que dans Athena : Redshift Spectrum, EMR et Athena for Spark lisent toujours les partitions dans le catalogue. Quand plusieurs moteurs partagent la table, enregistrez plutôt les partitions.

<!-- section: connections | objectives: 2.2.5 -->
## Créer des connexions source et cible

Une **connexion Glue** est un objet du Data Catalog qui stocke une URL, des informations d'identification et des paramètres de VPC pour un magasin de données. Les robots d'analyse et les tâches la réutilisent pour les sources et les cibles, et le même schéma de connexion sert à Glue, Athena et SageMaker Unified Studio.

| Type | Détails |
| --- | --- |
| JDBC | `jdbc:postgresql://host:5432/db`, `jdbc:mysql://host:3306/db`, `jdbc:redshift://host:5439/dev`, `jdbc:sqlserver://host:1433;databaseName=db` |
| Connecteurs natifs | Redshift, MySQL, PostgreSQL, Oracle, SQL Server, DocumentDB, OpenSearch Service, Snowflake, BigQuery, SAP HANA, Teradata, Salesforce et d'autres |
| Kafka | Serveurs d'amorçage (MSK ou autogéré) ; authentification SASL/SCRAM, SASL/GSSAPI, SASL/PLAIN ou TLS client |
| MongoDB | URL MongoDB ou MongoDB Atlas |
| Network | Uniquement VPC, sous-réseau et groupe de sécurité, pour atteindre un point de terminaison privé |
| Connecteurs Marketplace ou personnalisés | Magasins de données sans prise en charge native |

Stockez les informations d'identification dans **Secrets Manager** et référencez le secret ; évitez les noms d'utilisateur et mots de passe dans la connexion. Pour une source dans un VPC, Glue place des interfaces réseau Elastic dans le sous-réseau de la connexion :

| Symptôme | Correction |
| --- | --- |
| Le test de connexion ou le robot d'analyse expire | Groupe de sécurité avec une règle entrante autoréférencée pour tous les ports TCP ; le groupe de sécurité de la base autorise le groupe de sécurité de Glue sur le port de la base |
| La tâche atteint la base mais ne peut ni lire ni écrire dans S3 | Point de terminaison de passerelle S3 dans le VPC (HTTPS 443 vers sa liste de préfixes si le trafic sortant est restreint) ou passerelle NAT |
| Échec d'authentification | Contenu du secret et autorisation du rôle IAM à lire le secret |

> **Conseil d'examen.** La règle de groupe de sécurité autoréférencée est la réponse classique à « la tâche Glue ne peut pas se connecter à la base RDS dans un sous-réseau privé » : les workers de Glue doivent pouvoir communiquer entre eux.

<!-- section: business-catalog | objectives: 2.2.6 -->
## Catalogues de données métier avec Amazon SageMaker Catalog

Un catalogue technique indique aux moteurs comment lire les données. Un **catalogue métier** indique aux personnes ce que signifient les données, à qui elles appartiennent et comment y accéder.

| | Catalogue technique | Catalogue métier |
| --- | --- | --- |
| Exemple | Glue Data Catalog, metastore Hive | Amazon SageMaker Catalog |
| Contenu | Emplacement, format, colonnes, partitions | Noms métier, descriptions, termes du glossaire, propriétaires, formulaires de métadonnées |
| Utilisateurs | Moteurs et ingénieurs des données | Analystes, data scientists, responsables des données (data stewards) |
| Accès | Autorisations IAM et Lake Formation | Demandes d'abonnement approuvées par le propriétaire |

Amazon SageMaker Catalog fait partie d'Amazon SageMaker Unified Studio (il utilise les API d'Amazon DataZone) :

- Un **domaine** organise les ressources, les utilisateurs et les projets ; les **unités de domaine** correspondent aux unités métier. La portée du catalogue est le domaine.
- Un **projet** est l'espace de travail de l'équipe. Les **sources de données** (Glue Data Catalog, Redshift) importent les métadonnées techniques comme **ressources d'inventaire**, visibles uniquement par le projet.
- Les propriétaires enrichissent les ressources : noms métier, descriptions, README, termes du **glossaire métier**, **formulaires de métadonnées** obligatoires. Les recommandations d'IA (modèles Amazon Bedrock) suggèrent noms, descriptions et termes du glossaire ; les suggestions non revues ne sont pas publiées.
- La **publication** rend la dernière version d'une ressource visible par tous les projets du domaine. Les ressources peuvent être regroupées en **produits de données**.
- Un projet consommateur envoie une **demande d'abonnement** avec une justification ; le propriétaire l'approuve ou la rejette. Pour les ressources gérées, l'approbation déclenche l'attribution : autorisations Lake Formation sur les tables Glue (la table doit être gérée par Lake Formation ; le contrôle d'accès par LF-tags n'est pas pris en charge ici), autorisations sur les tables et vues Redshift. Pour les ressources non gérées, des événements publiés dans EventBridge déclenchent une attribution personnalisée.

> **Piège d'examen.** Un catalogue métier ne remplace pas Lake Formation : SageMaker Catalog enregistre la demande et l'approbation, puis Lake Formation (ou Redshift) applique l'accès. « Découverte en libre-service avec un flux d'approbation et un glossaire métier » désigne SageMaker Catalog ; « autorisations au niveau des colonnes d'une table » désigne Lake Formation.

<!-- section: key-points -->
## Points clés

- Un catalogue contient des métadonnées ; les données restent en place. Athena, Redshift Spectrum, EMR et les tâches Glue lisent tous le Glue Data Catalog.
- Un Glue Data Catalog par compte et par Région : bases de données, tables, partitions, connexions ; compatible avec le metastore Hive et utilisable comme metastore EMR par `hive-site`.
- Robots d'analyse : classificateurs, chemins d'inclusion et d'exclusion, taille d'échantillon, `CRAWL_NEW_FOLDERS_ONLY` ou `CRAWL_EVENT_MODE`, politique de modification du schéma, schéma unique par chemin S3.
- Enregistrer les partitions depuis la tâche qui écrit, un robot d'analyse, `MSCK REPAIR TABLE` (style Hive, ajoute seulement) ou `ALTER TABLE ADD PARTITION` ; la projection de partitions est propre à Athena ; les index de partition accélèrent les très grandes tables.
- Les connexions Glue contiennent l'URL, le secret et les paramètres de VPC ; une règle de groupe de sécurité autoréférencée et un point de terminaison S3 sont nécessaires dans un VPC.
- SageMaker Catalog : domaines, projets, sources de données, glossaire, formulaires de métadonnées, publication, abonnements attribués par Lake Formation ou Redshift.
