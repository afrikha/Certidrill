Les questions de surveillance décrivent un pipeline qui a échoué pendant la nuit, une tâche devenue plus lente, ou un auditeur qui demande qui a modifié une table, et demandent ce qui aurait dû être journalisé, où, et comment l'équipe aurait dû être prévenue. Les outils sont peu nombreux (CloudTrail, journaux et métriques CloudWatch, EventBridge, SNS, les journaux propres aux services), mais l'examen s'intéresse aux valeurs par défaut : ce qui n'est pas journalisé tant que vous ne l'activez pas, où va chaque journal, et combien de temps il est conservé.

<!-- section: cloudtrail | objectives: 3.3.5 -->
## Suivre les appels d'API avec AWS CloudTrail

CloudTrail enregistre les appels d'API effectués dans le compte (console, CLI, SDK, autres services) : qui, quand, d'où et avec quels paramètres.

| Type d'événement | Contenu | Journalisé par défaut |
| --- | --- | --- |
| Événements de gestion | Plan de contrôle : `CreateTable`, `StartJobRun`, `PutBucketPolicy`, `ConsoleLogin` | Oui |
| Événements de données | Plan de données, gros volume : `GetObject` et `PutObject` de S3, `Invoke` de Lambda, opérations sur les éléments DynamoDB | Non : les ajouter à un journal de suivi (trail), avec des sélecteurs pour limiter le coût |
| Événements d'activité réseau | Appels d'API passant par vos points de terminaison d'un VPC | Non |
| Événements Insights | Taux d'appels d'API ou d'erreurs inhabituels | Non |

- **Historique des événements** : les 90 derniers jours d'événements de gestion par Région, consultables et recherchables gratuitement, sans configuration.
- Un **journal de suivi (trail)** livre les événements sous forme de fichiers dans un compartiment S3, et en option dans CloudWatch Logs et EventBridge. Les journaux de suivi créés dans la console sont multi-Régions ; un **journal de suivi d'organisation** créé depuis le compte de gestion couvre tous les comptes membres, qui ne peuvent ni le modifier ni l'arrêter.
- La **validation de l'intégrité des fichiers journaux** écrit chaque heure des fichiers de condensat (SHA-256) qui prouvent que les fichiers livrés n'ont été ni modifiés ni supprimés.
- **CloudTrail Lake** (SQL sur des magasins de données d'événements) est **fermé aux nouveaux clients depuis le 31 mai 2026** ; les clients existants continuent à l'utiliser, avec uniquement des correctifs critiques. AWS recommande **Amazon CloudWatch** pour des capacités similaires, et les magasins de données d'événements existants peuvent être exportés vers un groupe de journaux CloudWatch (`aws logs create-import-task`).

> **Piège d'examen.** « Trouver qui a téléchargé des objets du compartiment la semaine dernière » échoue si les événements de données S3 n'étaient pas activés sur un journal de suivi avant les téléchargements : l'historique des événements et les journaux de suivi par défaut ne contiennent que les événements de gestion.

<!-- section: audit-log-extraction | objectives: 3.3.1 -->
## Extraire des journaux pour les audits

Les auditeurs veulent des journaux complets, infalsifiables, conservés pendant la durée requise et interrogeables.

| Besoin | Solution |
| --- | --- |
| Historique des API de tous les comptes, conservé des années | Journal de suivi d'organisation vers un compartiment S3 central dans un compte d'archive de journaux, S3 Object Lock ou une politique de compartiment restrictive, S3 Lifecycle vers les classes d'archivage |
| SQL sur les fichiers CloudTrail | Table Athena sur le préfixe S3 du journal de suivi, avec projection de partitions (la console CloudTrail peut la créer) |
| Recherche interactive dans les événements CloudTrail | Livraison du journal de suivi vers CloudWatch Logs, interrogée avec Logs Insights |
| Copie ponctuelle d'un groupe de journaux CloudWatch vers S3 | Tâche d'exportation (`create-export-task`) : les données peuvent mettre jusqu'à 12 heures à devenir exportables, une tâche expire après 24 heures ; compartiments SSE-S3 et SSE-KMS pris en charge |
| Copie continue de CloudWatch Logs vers S3 ou un autre compte | Filtre d'abonnement vers Amazon Data Firehose (AWS recommande les abonnements plutôt que des exportations répétées) |
| Activité des bases de données | Journaux d'audit Redshift, journaux RDS et Aurora publiés dans CloudWatch Logs, journaux des tâches DMS |

```sql
SELECT eventtime, useridentity.arn, eventname, requestparameters
FROM cloudtrail_logs
WHERE eventsource = 'glue.amazonaws.com'
  AND eventname IN ('DeleteTable', 'UpdateTable')
  AND timestamp >= '2026/11/01'
ORDER BY eventtime DESC;
```

> **Conseil d'examen.** L'exportation de CloudWatch Logs vers S3 est une opération par lots pour des extractions ponctuelles. « Envoyer en continu tous les journaux d'application vers S3, en quasi temps réel, pour les auditeurs » : filtre d'abonnement vers Data Firehose.

<!-- section: logging-deployment | objectives: 3.3.2 -->
## Déployer la journalisation et la surveillance pour la traçabilité

La plupart des services de données journalisent peu par défaut. Activez ce que chacun propose :

| Service | Ce qu'il faut activer |
| --- | --- |
| AWS Glue | Journalisation continue vers CloudWatch (`--enable-continuous-cloudwatch-log`, sinon les journaux n'arrivent qu'à la fin de la tâche), métriques de tâche et métriques d'observabilité, journaux d'événements de l'interface Spark (Spark UI) vers S3, job run insights |
| Amazon EMR | URI des journaux dans S3 à la création du cluster (les journaux des étapes, des applications et des nœuds y sont archivés), agent CloudWatch pour les métriques |
| Amazon MWAA | Chaque type de journal Airflow et son niveau |
| Amazon Redshift | Journalisation d'audit (journaux de connexion, des utilisateurs et d'activité des utilisateurs) vers S3 ou CloudWatch ; le journal d'activité des utilisateurs exige aussi le paramètre `enable_user_activity_logging` ; Serverless n'envoie ses journaux d'audit que vers CloudWatch |
| Amazon S3 | Événements de données CloudTrail (qui a accédé à quel objet), ou journaux d'accès au serveur S3 (au mieux) |
| Lambda | Format de journal JSON et niveaux de journalisation, un groupe de journaux par application |
| Kinesis, Firehose, DMS | Métriques CloudWatch ; journalisation des erreurs de Firehose ; journaux des tâches DMS |
| Historique de configuration | AWS Config enregistre les modifications de configuration des ressources et évalue des règles |

Les journaux d'audit Redshift dans S3 exigent une politique de compartiment qui autorise le service Redshift à écrire, un **chiffrement SSE-S3** (SSE-KMS n'est pas pris en charge pour ces fichiers) et S3 Object Lock désactivé. Redshift conserve aussi ces informations dans des tables système (vues `SYS_` et `STL_`), pour une durée limitée.

> **Piège d'examen.** Activer seule la journalisation d'audit Redshift n'enregistre pas les requêtes : sans `enable_user_activity_logging=true` dans le groupe de paramètres, seuls les journaux de connexion et des utilisateurs sont écrits.

<!-- section: cloudwatch-logs | objectives: 3.3.7 -->
## Configurer et automatiser CloudWatch Logs

Les données d'application sont écrites dans des **groupes de journaux** (un par application ou fonction) composés de **flux de journaux** (un par instance, conteneur ou environnement de fonction).

- **Conservation** : par défaut, les journaux n'expirent jamais ; définissez de 1 jour à 10 ans par groupe (`put-retention-policy`), ou dans l'infrastructure en tant que code.
- **Classe de journaux**, choisie à la création et non modifiable : **Standard** (toutes les fonctionnalités), **Essentials** (anciennement Infrequent Access : prix d'ingestion plus bas, requêtes Logs Insights, ni filtres de métrique, ni filtres d'abonnement, ni Live Tail), **Delivery** (journaux Lambda livrés vers S3 ou Firehose, conservation fixe de 2 jours).
- **Agent CloudWatch** sur EC2 ou sur site : une configuration JSON liste les fichiers à collecter, les noms de leur groupe et de leur flux de journaux et la conservation ; distribuez-la avec Systems Manager Parameter Store.
- Les **filtres de métrique** transforment les lignes de journal correspondantes en métriques (nombre de `ERROR`), base des alarmes.
- Les **filtres d'abonnement** envoient les événements en continu vers Kinesis Data Streams, Data Firehose ou Lambda (OpenSearch Service via une fonction Lambda) ; une politique au niveau du compte peut couvrir tous les groupes de journaux.
- Les **politiques de protection des données** masquent les données sensibles à l'ingestion.

```yaml
  PipelineLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /anycompany/ingestion
      RetentionInDays: 90
      LogGroupClass: STANDARD
  IngestionErrors:
    Type: AWS::Logs::MetricFilter
    Properties:
      LogGroupName: !Ref PipelineLogGroup
      FilterPattern: '{ $.level = "ERROR" }'
      MetricTransformations:
        - MetricName: IngestionErrors
          MetricNamespace: AnyCompany/Pipeline
          MetricValue: "1"
  IngestionErrorsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      Namespace: AnyCompany/Pipeline
      MetricName: IngestionErrors
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertsTopic
```

> **Piège d'examen.** Un groupe de journaux de classe Essentials ne peut porter ni filtres de métrique ni filtres d'abonnement, et sa classe ne peut pas être modifiée. Si des alarmes sur des motifs de journaux sont exigées, créez le groupe en classe Standard.

<!-- section: notifications | objectives: 3.3.3 -->
## Envoyer des alertes avec des notifications

| Signal | Chemin jusqu'à l'équipe |
| --- | --- |
| Une métrique franchit un seuil (`GetRecords.IteratorAgeMilliseconds` de Kinesis, `Errors` de Lambda, CPU de Redshift, nombre issu d'un filtre de métrique) | Alarme CloudWatch, action vers une rubrique SNS |
| Une tâche ou un flux de travail change d'état (tâche Glue `FAILED` ou `TIMEOUT`, exécution Step Functions en échec, étape EMR en échec, robot d'analyse en échec) | Règle EventBridge vers SNS, Lambda ou un outil de tickets |
| Une tâche Glue dure plus longtemps que prévu | Seuil de notification de retard de la tâche : Glue émet un événement « Glue Job Run Status » |
| Événements de service (événements de cluster Redshift, échecs de tâches de réplication DMS) | Notifications ou abonnements aux événements du service vers SNS, ou EventBridge |
| Plusieurs alarmes décrivent un même incident | Alarme composite, une seule notification |

SNS livre vers l'e-mail, les SMS, des points de terminaison HTTPS, Lambda et SQS. Chiffrez les rubriques avec KMS et limitez qui peut publier par une politique de rubrique (EventBridge et CloudWatch doivent être autorisés à utiliser la clé d'une rubrique chiffrée pour y publier).

```json
{
  "source": ["aws.glue"],
  "detail-type": ["Glue Job State Change"],
  "detail": {
    "jobName": ["sales-to-parquet"],
    "state": ["FAILED", "TIMEOUT"]
  }
}
```

> **Conseil d'examen.** « Prévenir l'équipe quand une tâche Glue échoue, sans modifier les scripts des tâches » : règle EventBridge sur Glue Job State Change avec une cible SNS, pas du code dans la tâche.

<!-- section: performance | objectives: 3.3.4 -->
## Dépanner les problèmes de performance

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| `WriteProvisionedThroughputExceeded` sur Kinesis | Shard surchargé (clé de partition asymétrique) ou trop peu de shards | Meilleure clé de partition, plus de shards, ou mode à la demande |
| `IteratorAge` du consommateur Lambda en hausse | Fonction trop lente ou en échec sur un enregistrement | Facteur de parallélisation, lots plus grands, corriger les erreurs avec division du lot et destination en cas d'échec |
| Limitation DynamoDB sur une clé | Partition surchargée | Partitionnement des écritures, meilleure clé ; CloudWatch Contributor Insights montre les clés les plus sollicitées |
| Requête Athena lente ou coûteuse | Analyses complètes de CSV, nombreux petits fichiers, pas de filtre de partition | Parquet, partitionnement ou projection, compactage ; vérifier avec `EXPLAIN` |
| Requête Redshift lente | Distribution asymétrique, lignes non triées, statistiques obsolètes, mise en file d'attente | Examiner `SVV_TABLE_INFO` (asymétrie, lignes non triées, statistiques), `EXPLAIN`, Redshift Advisor, files de gestion de la charge de travail (WLM), concurrency scaling |
| Tâche Glue lente | Asymétrie des données, petits fichiers, trop peu de workers, un gros fichier non fractionnable | Repartitionner, regrouper les petits fichiers, workers plus gros ou plus nombreux, Auto Scaling ; lire l'interface Spark et les métriques d'observabilité |
| Livraison Firehose retardée | Paramètres de tampon élevés ou fonction Lambda de transformation en échec | Réduire la taille et l'intervalle du tampon, corriger la fonction |

> **Piège d'examen.** Ajouter des workers Glue n'aide pas quand une seule tâche Spark traite la plupart des données : la cause est l'asymétrie des données. Repartitionnez ou salez (salting) la clé asymétrique ; l'interface Spark montre une tâche longue parmi de nombreuses tâches courtes.

<!-- section: pipeline-maintenance | objectives: 3.3.6 -->
## Dépanner et maintenir des pipelines Glue et EMR

**AWS Glue.**

| Erreur | Cause et correction |
| --- | --- |
| Mémoire insuffisante sur le pilote (driver) | Trop de petits fichiers listés par le pilote : regrouper les fichiers d'entrée, type de worker plus grand |
| Mémoire insuffisante sur un exécuteur | Transformations larges sur de grosses partitions : workers R optimisés pour la mémoire, plus de partitions |
| Exécutions simultanées dépassées | Une exécution démarre alors que la précédente est active : augmenter le maximum d'exécutions simultanées ou sérialiser |
| La tâche retraite ou saute des données | Signets de tâche désactivés, ou script sans `transformation_ctx` ni `job.commit()` ; réinitialiser ou rembobiner le signet pour retraiter |
| La tâche expire | Délai trop court (480 minutes par défaut depuis Glue 5.0) ou tâche bloquée : examiner les métriques avant de l'augmenter |
| La connexion à une base de données échoue | Sous-réseau et groupe de sécurité de la connexion Glue (règle autoréférencée), route ou point de terminaison d'un VPC vers S3 |

**Job run insights** (`--enable-job-insights`) indique la ligne du script en échec et une action recommandée ; la journalisation continue montre la progression pendant l'exécution.

**Amazon EMR.** Lisez les journaux des étapes (`stderr`, `syslog`, `controller`) sous l'URI des journaux S3 du cluster ou dans `/mnt/var/log/` sur les nœuds ; vérifiez le motif du changement d'état du cluster. Causes courantes : capacité EC2 ou adresses IP insuffisantes dans le sous-réseau, autorisations manquantes sur les rôles EMR, HDFS ou disque plein, conteneurs YARN arrêtés pour manque de mémoire. Maintenance : garder les données dans S3 (EMRFS) pour pouvoir remplacer les clusters transitoires, utiliser la mise à l'échelle gérée, figer les versions de publication et tester les mises à niveau, et se rappeler qu'EMR conserve les détails des clusters arrêtés pendant deux mois.

> **Conseil d'examen.** « Une tâche Glue retraite les mêmes fichiers chaque nuit alors que les signets sont activés » : il manque `job.commit()` ou `transformation_ctx` dans le script.

<!-- section: log-analysis | objectives: 3.3.8 -->
## Analyser les journaux avec les services AWS

| Outil | Le choisir quand |
| --- | --- |
| **CloudWatch Logs Insights** | Requêtes interactives sur les groupes de journaux (aussi en SQL et PPL), champs découverts pour les journaux JSON, requêtes enregistrées et planifiées ; aucune infrastructure |
| **Athena** | Journaux déjà dans S3 (CloudTrail, ALB, journaux de flux VPC, journaux d'accès S3, journaux exportés) : SQL, jointures avec d'autres données, long historique à faible coût |
| **Amazon OpenSearch Service** | Recherche en texte intégral, tableaux de bord en quasi temps réel (OpenSearch Dashboards) et détection d'anomalies sur de gros volumes de journaux |
| **Amazon EMR** | Très gros volumes de journaux d'applications big data traités avec Spark ou Hive |

```text
fields @timestamp, level, jobName, message
| filter level = "ERROR"
| stats count(*) as errors by jobName, bin(1h)
| sort errors desc
| limit 20
```

> **Piège d'examen.** Logs Insights n'interroge que des groupes de journaux de CloudWatch Logs. « Interroger en SQL cinq ans de fichiers CloudTrail dans S3 au coût le plus bas » : Athena.

<!-- section: key-points -->
## Points clés

- CloudTrail journalise par défaut les événements de gestion ; les événements de données, d'activité réseau et Insights doivent être activés ; l'historique des événements couvre 90 jours ; journaux de suivi d'organisation et validation de l'intégrité pour les audits.
- CloudTrail Lake est fermé aux nouveaux clients (31 mai 2026) : pour une nouvelle conception, journaux de suivi avec S3 et Athena, ou CloudWatch.
- Les exportations vers S3 sont ponctuelles (jusqu'à 12 heures de délai) ; les abonnements avec Data Firehose sont continus.
- Activer la journalisation continue de Glue, l'URI des journaux EMR, les types de journaux MWAA, la journalisation d'audit Redshift plus `enable_user_activity_logging`.
- Groupes de journaux : définir la conservation, choisir la classe à la création (Essentials n'a ni filtres de métrique ni filtres d'abonnement), automatiser avec l'agent et CloudFormation.
- Alertes : alarmes CloudWatch sur les métriques, règles EventBridge sur les changements d'état, SNS pour la livraison.
- Performance : shards et clés surchargés, petits fichiers, asymétrie, statistiques Redshift obsolètes.
- Glue : mémoire, signets, concurrence, job run insights ; EMR : journaux des étapes dans l'URI des journaux S3.
- Logs Insights pour les groupes de journaux, Athena pour les journaux dans S3, OpenSearch pour la recherche et les tableaux de bord, EMR pour les volumes énormes.
