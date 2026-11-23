Les questions d'audit décrivent un pipeline et une demande d'auditeur (« qui a supprimé ces objets », « conserver les journaux d'application un an », « interroger trois ans d'activité d'API dans tous les comptes ») et demandent quelle source de journaux, quel stockage et quel moteur de requête y répondent au coût indiqué. Ce chapitre couvre CloudTrail, CloudWatch Logs, CloudTrail Lake et son statut en 2026, les moteurs d'analyse des journaux et les pipelines de journalisation pour de grands volumes.

<!-- section: cloudtrail-api-calls | objectives: 4.4.1 -->
## Suivre les appels d'API avec AWS CloudTrail

CloudTrail enregistre un événement pour chaque appel d'API (console, CLI, SDK, autres services AWS) et pour certains événements hors API comme `ConsoleLogin`. Il existe quatre types d'événements :

| Type d'événement | Exemples | Journalisé par défaut |
| --- | --- | --- |
| Événements de gestion (plan de contrôle) | `CreateTable`, `PutBucketPolicy`, `AttachRolePolicy`, `ConsoleLogin` | Oui |
| Événements de données (plan de données, gros volume) | S3 `GetObject`, `PutObject`, `DeleteObject` ; Lambda `Invoke` ; opérations sur les éléments DynamoDB | Non, à activer et payants |
| Événements d'activité réseau | Appels d'API passés par un point de terminaison de VPC, enregistrés pour le propriétaire du point de terminaison | Non |
| Événements Insights | Taux d'appels ou taux d'erreurs inhabituels des API de gestion | Non |

Où vont les événements :

- L'**historique des événements** : les **90 derniers jours** d'événements de gestion d'une Région, recherchables sans frais. Pas d'événements de données, pas de conservation plus longue.
- Un **journal de suivi** (trail) remet les événements dans un compartiment S3 (des fichiers journaux environ toutes les 5 minutes, du JSON gzip avec un tableau `Records`) et, en option, dans un groupe de journaux CloudWatch Logs et dans EventBridge. Les journaux de suivi créés dans la console sont **multi-Régions** ; une Région accepte cinq journaux de suivi. La première copie des événements de gestion est gratuite ; les événements de données et les copies supplémentaires sont facturés.
- Un **journal de suivi d'organisation**, créé dans le compte de gestion ou par un administrateur délégué, journalise tous les comptes membres dans un même compartiment ; les membres le voient mais ne peuvent ni le modifier ni le supprimer.
- Les services globaux (IAM, STS, CloudFront) sont enregistrés dans `us-east-1` ; un journal de suivi multi-Régions les inclut.

Protéger les preuves :

- Les fichiers journaux sont chiffrés par défaut avec le chiffrement côté serveur S3 ; définissez une clé **SSE-KMS** sur le journal de suivi pour contrôler et auditer l'accès au niveau de la clé (la politique de clé doit permettre à CloudTrail de l'utiliser).
- La **validation de l'intégrité des fichiers journaux** fait calculer à CloudTrail un hachage de chaque fichier (SHA-256) et remettre chaque heure un **fichier de synthèse** (digest file), signé avec RSA, chaîné au fichier de synthèse précédent. `aws cloudtrail validate-logs` prouve ensuite si un fichier a été modifié, supprimé ou jamais remis.
- Utilisez un compte d'archive des journaux dédié, avec S3 Object Lock si les journaux doivent être immuables.

```bash
aws cloudtrail create-trail --name org-audit \
  --s3-bucket-name anycompany-audit-logs \
  --is-multi-region-trail --is-organization-trail \
  --enable-log-file-validation \
  --kms-key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
aws cloudtrail start-logging --name org-audit
```

Les **sélecteurs d'événements avancés** (advanced event selectors) gardent les événements de données abordables : ne journaliser que les écritures, qu'un préfixe d'un compartiment, que certaines fonctions.

```json
[
  {
    "Name": "Writes and deletes in the raw zone",
    "FieldSelectors": [
      { "Field": "eventCategory", "Equals": ["Data"] },
      { "Field": "resources.type", "Equals": ["AWS::S3::Object"] },
      { "Field": "readOnly", "Equals": ["false"] },
      { "Field": "resources.ARN", "StartsWith": ["arn:aws:s3:::anycompany-raw/landing/"] }
    ]
  }
]
```

> **Piège d'examen.** « Trouver qui a supprimé des objets d'un compartiment la semaine dernière » échoue si seuls les événements de gestion étaient journalisés : `DeleteObject` est un événement de données et ne figure jamais dans l'historique des événements de 90 jours. Activez les événements de données S3 sur un journal de suivi (ou un magasin de données d'événements) avant d'en avoir besoin ; rien ne peut être récupéré après coup.

<!-- section: cloudwatch-logs-storage | objectives: 4.4.2 -->
## Stocker les journaux d'application dans Amazon CloudWatch Logs

Un **événement de journal** (horodatage et message) appartient à un **flux de journaux** (une source : un environnement d'exécution Lambda, une instance, un conteneur), et les flux appartiennent à un **groupe de journaux**, qui porte les paramètres de conservation, de chiffrement, d'accès et de classe.

Comment les journaux arrivent : Lambda écrit dans `/aws/lambda/<function-name>` (ou un groupe personnalisé) ; Glue, MWAA, Step Functions et Redshift peuvent envoyer leurs journaux dans des groupes de journaux ; les serveurs EC2 et sur site utilisent l'agent CloudWatch ; le code personnalisé appelle `PutLogEvents`.

Paramètres testés à l'examen :

- **Conservation** : par défaut, les journaux **n'expirent jamais**. Définissez de 1 jour à 10 ans (3 653 jours) par groupe de journaux ; des politiques de conservation au niveau du compte (minimum 30 jours) peuvent l'imposer à des groupes selon un préfixe de nom. Les événements expirés sont supprimés sous 72 heures environ.
- **Chiffrement** : les données de journaux sont toujours chiffrées ; associez une **clé KMS gérée par le client** à un groupe de journaux quand la clé doit être contrôlée ou auditée (la politique de clé doit autoriser le principal de service CloudWatch Logs de la Région).
- **Classe de journaux**, choisie à la création et jamais modifiée :

| Classe de journaux | Usage | Non disponible |
| --- | --- | --- |
| Standard | Journaux qui alimentent des alarmes, des filtres de métriques, des abonnements ou Live Tail | Rien |
| Infrequent Access (renommée Essentials) | Journaux conservés pour l'audit ou des requêtes Logs Insights occasionnelles ; prix d'ingestion plus bas, même prix de stockage et de requête | Filtres d'abonnement, filtres de métriques, Live Tail, détection d'anomalies, format de métrique intégré (EMF), `GetLogEvents` et `FilterLogEvents` |

- Les **filtres de métriques** transforment les événements de journal correspondants en métriques CloudWatch pour des alarmes (par exemple un nombre de lignes `ERROR` d'une tâche Glue).
- Les **filtres d'abonnement** diffusent les événements, compressés en gzip et au moins une fois, généralement en moins de trois minutes, vers Kinesis Data Streams, Amazon Data Firehose, Lambda ou OpenSearch Service. Jusqu'à cinq par groupe de journaux (classe Standard uniquement), plus un filtre d'abonnement au niveau du compte par Région ; la remise intercompte utilise une destination dans le compte récepteur.
- L'**exportation vers S3** (`CreateExportTask`) est une copie par lots ponctuelle : les données peuvent mettre jusqu'à 12 heures à devenir exportables et une tâche expire au bout de 24 heures. Le compartiment peut utiliser SSE-S3 ou SSE-KMS (pas DSSE-KMS). AWS recommande les abonnements, et non des exportations répétées, pour un archivage continu.

```bash
aws logs create-log-group --log-group-name /anycompany/ingest/orders \
  --log-group-class STANDARD \
  --kms-key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
aws logs put-retention-policy --log-group-name /anycompany/ingest/orders \
  --retention-in-days 400
aws logs put-subscription-filter --log-group-name /anycompany/ingest/orders \
  --filter-name archive-to-s3 --filter-pattern "" \
  --destination-arn arn:aws:firehose:eu-west-1:111122223333:deliverystream/logs-archive \
  --role-arn arn:aws:iam::111122223333:role/CWLtoFirehoseRole
```

> **Conseil d'examen.** « Archiver en continu chaque journal d'application dans S3 avec le moins de charge opérationnelle » correspond à un filtre d'abonnement vers Firehose (qui peut aussi convertir en Parquet), et non à un `CreateExportTask` planifié. « Réduire le coût de journaux d'audit interrogés quelques fois par an » correspond à la classe Infrequent Access, mais seulement pour un nouveau groupe de journaux.

<!-- section: cloudtrail-lake | objectives: 4.4.3 -->
## AWS CloudTrail Lake pour des requêtes SQL centralisées

**Statut en 2026** : CloudTrail Lake est **fermé aux nouveaux clients depuis le 31 mai 2026**. Les clients existants continuent de l'utiliser, avec uniquement des correctifs de bogues critiques et des mises à jour de sécurité. Les magasins de données d'événements d'organisation continuent de couvrir les nouveaux comptes membres et les nouvelles Régions ; les magasins de données d'événements au niveau du compte n'ingèrent pas les comptes ajoutés plus tard à l'organisation. CloudTrail lui-même (journaux de suivi, Insights) n'est pas concerné. AWS recommande de migrer vers **Amazon CloudWatch**.

Ce que fait CloudTrail Lake pour les clients existants :

- Un **magasin de données d'événements** (event data store) est un stockage immuable d'événements sélectionnés par des sélecteurs d'événements avancés, convertis en Apache ORC. Il ne nécessite ni journal de suivi ni compartiment S3. Un magasin contient une seule catégorie : événements CloudTrail (gestion, données, activité réseau), événements Insights, éléments de configuration AWS Config, preuves AWS Audit Manager, ou événements extérieurs à AWS envoyés avec `PutAuditEvents` par un canal.
- Un **magasin de données d'événements d'organisation** collecte tous les comptes et toutes les Régions de l'organisation.
- La conservation dépend de l'option tarifaire : conservation d'un an prolongeable (jusqu'à 3 653 jours) ou conservation de sept ans (jusqu'à 2 557 jours).
- Les requêtes sont en SQL (`SELECT` Trino), facturées selon les données analysées, avec des jointures entre magasins de données d'événements ; les résultats sont conservés sept jours et peuvent être enregistrés dans S3. Un magasin peut être fédéré dans le Glue Data Catalog et interrogé avec Athena.

```sql
SELECT eventSource, eventName, userIdentity.arn, COUNT(*) AS calls
FROM a1b2c3d4-5678-90ab-cdef-EXAMPLE11111
WHERE eventTime > '2026-11-01 00:00:00'
  AND errorCode = 'AccessDenied'
GROUP BY eventSource, eventName, userIdentity.arn
ORDER BY calls DESC
```

La voie de remplacement :

- Depuis décembre 2025, les événements CloudTrail peuvent être collectés **directement dans CloudWatch** par un canal lié à un service (service-linked channel), sans journal de suivi, et activés de façon centralisée pour l'organisation. CloudWatch normalise les sources en OCSF et OpenTelemetry, propose une analytique reposant sur OpenSearch et un accès Apache Iceberg, et s'interroge avec Logs Insights.
- L'historique se déplace avec **Export to CloudWatch** dans la console CloudTrail ou `aws logs create-import-task` ; les événements antérieurs à 2023 ne sont pas migrés (continuez à les interroger dans CloudTrail Lake ou copiez-les dans S3).

```bash
aws logs create-import-task \
  --import-source-arn arn:aws:cloudtrail:eu-west-1:111122223333:eventdatastore/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
  --import-role-arn arn:aws:iam::111122223333:role/CloudTrailLakeExportRole
```

> **Piège d'examen.** Le guide de l'examen cite toujours CloudTrail Lake pour les « requêtes de journalisation centralisées ». Sachez ce qu'il fait (SQL sur plusieurs comptes et Régions, sans journal de suivi, conservation jusqu'à 10 ans environ), mais une entreprise qui n'est pas déjà cliente ne peut pas l'adopter fin 2026 : choisissez les événements CloudTrail dans CloudWatch, ou un journal de suivi d'organisation vers S3 interrogé avec Athena.

<!-- section: log-analysis | objectives: 4.4.4 -->
## Analyser les journaux avec Logs Insights, Athena et OpenSearch Service

| Exigence | Service |
| --- | --- |
| Dépannage interactif de journaux déjà dans CloudWatch Logs, sans infrastructure | CloudWatch Logs Insights |
| SQL sur des mois ou des années de journaux CloudTrail, VPC Flow Logs, d'équilibreur de charge ou d'accès S3 stockés dans S3, paiement à la requête | Amazon Athena |
| Recherche en texte intégral, tableaux de bord et alertes en quasi temps réel sur des journaux en flux | Amazon OpenSearch Service avec OpenSearch Dashboards |
| Transformation ou enrichissement lourd de très grands volumes de journaux | Amazon EMR (Spark), voir la section suivante |

**CloudWatch Logs Insights** interroge un ou plusieurs groupes de journaux (y compris d'autres comptes depuis un compte de surveillance) en Logs Insights QL, OpenSearch PPL ou OpenSearch SQL. Les champs des journaux JSON et des sources AWS (Lambda, CloudTrail, VPC Flow Logs, Route 53) sont découverts automatiquement. La facturation se fait par Go de données non compressées analysées : réduisez la plage horaire et utilisez des **index de champs** (field indexes) pour ignorer des événements. Les requêtes expirent au bout de 60 minutes ; les résultats restent disponibles sept jours.

```text
fields @timestamp, jobName, rowsRejected, @message
| filter level = "ERROR" and jobName like /orders/
| stats count(*) as errors, sum(rowsRejected) as rejected by jobName, bin(1h)
| sort errors desc
| limit 20
```

**Athena** lit les journaux là où ils arrivent dans S3. Pour CloudTrail, créez la table depuis la console CloudTrail, ou avec un DDL qui utilise la **projection de partitions** (partition projection) pour que les nouveaux jours soient interrogeables sans `ALTER TABLE ADD PARTITION` ni robot d'analyse (extrait) :

```sql
CREATE EXTERNAL TABLE cloudtrail_logs (
  eventtime STRING, eventsource STRING, eventname STRING, awsregion STRING,
  sourceipaddress STRING, errorcode STRING, requestparameters STRING,
  useridentity STRUCT<type: STRING, arn: STRING, accountid: STRING>)
PARTITIONED BY (`timestamp` STRING)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://anycompany-audit-logs/AWSLogs/111122223333/CloudTrail/eu-west-1/'
TBLPROPERTIES (
  'projection.enabled'='true',
  'projection.timestamp.type'='date',
  'projection.timestamp.format'='yyyy/MM/dd',
  'projection.timestamp.range'='2024/01/01,NOW',
  'projection.timestamp.interval'='1',
  'projection.timestamp.interval.unit'='DAYS',
  'storage.location.template'='s3://anycompany-audit-logs/AWSLogs/111122223333/CloudTrail/eu-west-1/${timestamp}');

SELECT useridentity.arn, eventname, COUNT(*) AS calls
FROM cloudtrail_logs
WHERE "timestamp" BETWEEN '2026/11/01' AND '2026/11/07'
  AND eventsource = 's3.amazonaws.com' AND eventname LIKE 'Delete%'
GROUP BY useridentity.arn, eventname;
```

Filtrez toujours sur la colonne de partition ; pour des requêtes répétées, convertissez le JSON en Parquet partitionné (CTAS Athena, Glue ou EMR).

**OpenSearch Service** indexe les événements de journal pour une recherche rapide, des visualisations et la détection d'anomalies. Alimentez-le avec **OpenSearch Ingestion** (pipelines Data Prepper sans serveur facturés en OCU, qui filtrent et transforment les données), Firehose ou un abonnement CloudWatch Logs. Le stockage d'index coûte plus cher que S3 : gardez les journaux récents interrogeables et l'historique dans S3 pour Athena.

> **Piège d'examen.** Logs Insights ne peut pas interroger des fichiers dans S3, et Athena ne peut pas interroger CloudWatch Logs sans connecteur fédéré. Choisissez le moteur là où se trouvent déjà les journaux, sauf si l'exigence justifie de les déplacer.

<!-- section: logging-integration | objectives: 4.4.5 -->
## Intégrer les services AWS dans un pipeline de journalisation

Chaque service de données a son propre journal :

| Source | Destination de ses journaux | À retenir |
| --- | --- | --- |
| Amazon Redshift | Journalisation d'audit vers S3 ou CloudWatch Logs : journal des connexions, journal des utilisateurs, journal d'activité des utilisateurs | Désactivée par défaut ; le journal d'activité des utilisateurs (chaque requête) exige aussi `enable_user_activity_logging = true` dans le groupe de paramètres ; la remise dans S3 exige SSE-S3 et pas d'Object Lock ; Redshift Serverless envoie ses journaux d'audit uniquement vers CloudWatch Logs |
| Amazon S3 | Événements de données CloudTrail, ou journaux d'accès au serveur | Journaux d'accès au serveur : remise gratuite, au mieux en quelques heures, avec les échecs d'authentification et les actions de cycle de vie. Événements de données CloudTrail : en quelques minutes, validation d'intégrité, filtres par préfixe |
| Amazon EMR | `/mnt/var/log` sur chaque nœud, archivé dans l'URI de journaux S3 définie à la création du cluster | Les journaux d'étapes, d'applications (Spark, Hive, conteneurs YARN), d'actions d'amorçage et système ne survivent à l'arrêt du cluster que dans S3 |
| AWS Glue, Lambda, MWAA, Step Functions | CloudWatch Logs | Réglez les niveaux (composants Airflow, Step Functions `ALL`, `ERROR`, `FATAL`, `OFF`) et la conservation de chaque groupe |
| VPC Flow Logs | CloudWatch Logs, S3 (texte ou Parquet, partitions compatibles Hive) ou Firehose | S3 en Parquet est la base la moins chère pour Athena |
| Appels d'API de tous les services | CloudTrail | Un journal de suivi d'organisation ou une collecte CloudWatch pour tous les comptes |

Pour de **grands volumes**, séparez la collecte, le stockage et le traitement :

1. Collecter : filtres d'abonnement CloudWatch Logs ou remise directe dans **Amazon Data Firehose**, qui met en mémoire tampon, compresse, convertit le JSON en Parquet à partir du schéma d'une table Glue et peut partitionner dynamiquement selon une clé comme le compte ou la date.
2. Stocker : S3 comme lac de journaux, catalogué dans le Glue Data Catalog, avec des règles S3 Lifecycle qui déplacent les anciens journaux vers des classes de stockage moins chères.
3. Traiter : **Amazon EMR** (ou EMR Serverless) exécute Spark sur de nombreux nœuds pour les traitements hors de portée d'un moteur de requête : reconstituer les sessions de milliards de lignes de parcours de navigation, joindre des journaux à des données de référence, compacter des millions de petits fichiers. Les tâches Glue conviennent aux volumes plus faibles, avec moins de gestion.
4. Servir : Athena pour le SQL ad hoc, Redshift pour des tableaux de bord croisés avec les données métier, OpenSearch Service pour la recherche.

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, explode, to_date

spark = SparkSession.builder.appName("cloudtrail-compaction").getOrCreate()

raw = (spark.read.option("multiLine", "true")
       .json("s3://anycompany-audit-logs/AWSLogs/*/CloudTrail/*/2026/11/*/"))

events = raw.select(explode("Records").alias("r")).select(
    col("r.eventTime").alias("event_time"),
    col("r.eventSource").alias("event_source"),
    col("r.eventName").alias("event_name"),
    col("r.awsRegion").alias("aws_region"),
    col("r.recipientAccountId").alias("account_id"),
    col("r.userIdentity.arn").alias("principal_arn"),
    col("r.errorCode").alias("error_code"),
)

(events.withColumn("event_date", to_date("event_time"))
    .write.mode("append")
    .partitionBy("event_date")
    .parquet("s3://anycompany-audit-curated/cloudtrail/"))
```

> **Conseil d'examen.** « Traiter plusieurs téraoctets de journaux par jour avec du code Spark personnalisé au coût par téraoctet le plus bas » désigne EMR (capacité Spot pour les nœuds de tâches, ou EMR Serverless). « Interroger les mêmes journaux quelques fois par mois » désigne Athena sur du Parquet, sans aucun cluster.

<!-- section: key-points -->
## Points clés

- CloudTrail : événements de gestion par défaut, événements de données (objets S3, Lambda `Invoke`, éléments DynamoDB) à activer et payants ; historique des événements de 90 jours, événements de gestion uniquement ; journal de suivi d'organisation multi-Régions vers un compartiment d'archive des journaux.
- Intégrité : validation des fichiers journaux (hachages SHA-256, fichiers de synthèse signés chaque heure, `validate-logs`) ; SSE-KMS sur le journal de suivi pour contrôler la clé.
- CloudWatch Logs : par défaut, les journaux n'expirent jamais ; une clé KMS par groupe de journaux ; la classe Infrequent Access (Essentials) n'a ni abonnements ni filtres de métriques et ne peut pas être changée ensuite ; abonnements vers Firehose pour l'archivage continu, tâches d'exportation pour les copies ponctuelles.
- CloudTrail Lake : fermé aux nouveaux clients depuis le 31 mai 2026 ; magasins de données d'événements, SQL, jusqu'à 3 653 jours ; migrer vers CloudWatch (canal lié à un service, `create-import-task`).
- Logs Insights pour les journaux dans CloudWatch, Athena avec projection de partitions et Parquet pour les journaux dans S3, OpenSearch Service pour la recherche et les tableaux de bord en direct.
- La journalisation d'audit Redshift est désactivée par défaut et exige `enable_user_activity_logging` pour les requêtes ; les journaux EMR ne persistent que dans l'URI de journaux S3 ; EMR ou EMR Serverless pour le traitement lourd des journaux.
