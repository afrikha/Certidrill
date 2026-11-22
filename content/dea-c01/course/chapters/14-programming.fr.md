L'examen ne teste pas la syntaxe des langages, mais il teste les choix d'ingénierie autour du code : quel paramètre fait finir plus vite une tâche Glue ou une fonction Lambda, où une fonction garde ses fichiers, comment un pipeline est décrit sous forme de code, empaqueté avec AWS SAM et promu par CI/CD, et quelle conception distribuée ou quelle structure de données convient à un problème.

<!-- section: code-optimization | objectives: 1.4.1 -->
## Optimiser le code pour réduire le temps d'exécution

L'essentiel du temps d'exécution d'une tâche sert à lire les données, à les déplacer entre nœuds et à les écrire. Un code plus rapide lit moins, redistribue moins et écrit des fichiers moins nombreux et plus gros.

| Symptôme | Correction |
| --- | --- |
| La tâche lit toute la table pour traiter une journée | Filtrer sur les colonnes de partition avant la lecture : `push_down_predicate` sur un DynamicFrame Glue, `WHERE` sur les colonnes de partition en Spark SQL ou Athena |
| L'énumération de millions de partitions est lente | Index de partition Glue et `catalogPartitionPredicate` (élagage dans le Data Catalog) |
| Chaque exécution retraite les anciens fichiers | Signets de tâche (job bookmarks) Glue (`transformation_ctx` sur les sources, `job.commit()` à la fin) |
| Des milliers de petits fichiers | Regrouper les fichiers à la lecture (`groupFiles`, `groupSize`), écrire moins de fichiers de 128 Mo ou plus |
| Les requêtes analysent du CSV ou du JSON | Parquet ou ORC compressé, uniquement les colonnes utiles |
| UDF Python, boucles sur les lignes, `collect()` sur de gros volumes | Fonctions Spark intégrées sur les exécuteurs ; garder les données hors du pilote (driver) |
| Grande table jointe à une petite table de correspondance | Jointure par diffusion (broadcast join) : aucune redistribution de la grande table |
| Une tâche Spark dure bien plus que les autres | Asymétrie des données (data skew) : saler ou scinder la clé chaude, laisser l'exécution adaptative des requêtes scinder les jointures asymétriques |
| Un enregistrement par appel d'API | API par lots : Kinesis `PutRecords` (jusqu'à 500 enregistrements), DynamoDB `BatchWriteItem` (jusqu'à 25 éléments) |
| Insertions ligne par ligne dans Redshift | `COPY` depuis des fichiers S3, chargés en parallèle par toutes les tranches (slices) |

```python
orders = glue_context.create_dynamic_frame.from_catalog(
    database="sales_raw",
    table_name="orders_csv",
    push_down_predicate=f"dt = '{args['run_date']}'",
    transformation_ctx="orders_src",
)
df = orders.toDF().select("order_id", "customer_id", "amount", "dt")
df.repartition("dt").write.mode("append").partitionBy("dt").parquet(
    "s3://example-curated/orders/"
)
job.commit()
```

Capacité Glue : une DPU vaut 4 vCPU et 16 Go. Les types de nœuds de travail (workers) vont de G.025X (0,25 DPU) à G.1X, G.2X, G.4X et G.8X, puis G.12X, G.16X et les types R optimisés pour la mémoire (Glue 4.0 ou ultérieur). La mise à l'échelle automatique (`--enable-auto-scaling`) ajuste le nombre de workers pendant l'exécution. La classe d'exécution **Flex** exécute les tâches non urgentes (tests, chargements ponctuels) à moindre prix sur des workers G.1X ou G.2X. Les nouvelles tâches utilisent par défaut Glue 6.0 et, à partir de Glue 5.0, un délai d'expiration de 480 minutes.

> **Piège d'examen.** Ajouter des workers ne corrige pas une tâche ralentie par l'asymétrie ou par de minuscules fichiers : les workers supplémentaires attendent. Corrigez d'abord l'organisation des données (salage des clés, regroupement des fichiers, compactage).

<!-- section: lambda-performance | objectives: 1.4.2 -->
## Paramètres de simultanéité et de performance de Lambda

Simultanéité = requêtes par seconde × durée moyenne en secondes (100 par seconde à 0,5 s = 50). Le quota par défaut est de 1 000 exécutions simultanées par compte et par Région.

| Paramètre | Effet |
| --- | --- |
| Mémoire, de 128 Mo à 10 240 Mo | Le processeur croît avec la mémoire : une analyse limitée par le processeur devient souvent plus rapide et moins chère avec plus de mémoire |
| Délai d'expiration, 3 s par défaut, 1 800 s au maximum sur la page actuelle des quotas | Les traitements par lots plus longs relèvent de Glue, AWS Batch, ECS ou d'une boucle Step Functions |
| Simultanéité réservée | Garantit et plafonne la simultanéité de la fonction, gratuite ; 100 unités restent toujours non réservées ; 0 arrête la fonction |
| Simultanéité provisionnée | Environnements pré-initialisés sur une version ou un alias, facturée en plus, planifiable avec Application Auto Scaling : pas de démarrage à froid |
| SnapStart | Restaure un instantané mis en cache de l'environnement initialisé pour réduire les démarrages à froid (Java, entre autres) ; non combinable avec la simultanéité provisionnée sur une même version |

Créez les clients SDK et les connexions aux bases de données en dehors du gestionnaire (handler), et placez RDS Proxy devant une base de données relationnelle.

| Mappage de source d'événements | Simultanéité et réglages |
| --- | --- |
| Kinesis Data Streams | Un lot à la fois par partition (shard), `ParallelizationFactor` de 1 à 10 (100 shards × 2 = 200 appels, ordre conservé par clé de partition) ; `BatchSize` 100 par défaut, 10 000 au maximum ; fenêtre de regroupement jusqu'à 5 minutes ; `BisectBatchOnFunctionError`, `MaximumRetryAttempts`, `MaximumRecordAgeInSeconds`, destination en cas d'échec, `ReportBatchItemFailures` |
| Amazon SQS | Jusqu'à 1 250 appels simultanés par défaut ; `MaximumConcurrency` de 2 à 1 000 par file d'attente, ou mode provisionné (pollers, coût supplémentaire), pas les deux ; gardez une simultanéité réservée au moins égale à la somme des simultanéités maximales |

Un `IteratorAge` croissant signifie que le consommateur Kinesis prend du retard : augmentez `ParallelizationFactor` ou `BatchSize`, ajoutez des shards, ou utilisez la diffusion améliorée (enhanced fan-out) quand plusieurs consommateurs se partagent le débit de lecture.

> **Piège d'examen.** La simultanéité réservée limite ; la simultanéité provisionnée supprime les démarrages à froid. « Ne jamais ouvrir plus de 50 connexions à la base de données » se règle par la simultanéité réservée ou la simultanéité maximale SQS.

<!-- section: lambda-storage | objectives: 1.4.7 -->
## Stockage et volumes montés dans Lambda

| Option | Caractéristiques |
| --- | --- |
| `/tmp` | De 512 Mo à 10 240 Mo, propre à un environnement d'exécution, peut survivre entre appels à chaud : espace de travail temporaire |
| Amazon EFS | Partagé par tous les environnements simultanés, persistant : gros fichiers de référence partagés |
| Amazon S3 Files | Un compartiment S3 monté comme système de fichiers : code orienté fichiers sur des objets S3 |
| Couches (layers) | Jusqu'à 5, en lecture seule sous `/opt`, 250 Mo décompressés avec le code : bibliothèques |
| Image de conteneur | Jusqu'à 10 Go : grosses dépendances |

EFS et S3 Files exigent une **fonction connectée à un VPC**, une cible de montage accessible dans chaque zone de disponibilité utilisée (S3 Files : dans chaque sous-réseau), des groupes de sécurité qui autorisent NFS sur le port TCP 2049, un chemin de montage commençant par `/mnt/`, un point d'accès, et les autorisations `ClientMount` (plus `ClientWrite` pour écrire) dans le rôle d'exécution. Une fonction utilise l'un des deux, pas les deux.

```bash
aws lambda update-function-configuration --function-name enrich-events \
  --vpc-config SubnetIds=subnet-0a1b2c3d,subnet-4e5f6a7b,SecurityGroupIds=sg-0123abcd \
  --file-system-configs Arn=arn:aws:elasticfilesystem:eu-west-1:111122223333:access-point/fsap-0abc1234def567890,LocalMountPath=/mnt/reference
```

> **Conseil d'examen.** « Des appels simultanés lisent les mêmes 20 Go de fichiers de référence » désigne EFS. « Chaque appel a besoin de 5 Go d'espace temporaire » désigne un `/tmp` agrandi : ni VPC ni rien à gérer.

<!-- section: languages-frameworks | objectives: 1.4.3 -->
## Langages et frameworks pour l'ingénierie des données

| Langage | Usage typique sur AWS |
| --- | --- |
| Python | Tâches PySpark et Python shell dans Glue, Lambda, DAG Airflow sur MWAA, Boto3 |
| SQL | Athena, Redshift, Spark SQL, Flink SQL, RDS et Aurora |
| Scala et Java | Tâches Spark sur Glue ou EMR ; applications Flink, clients Kafka |
| R | SparkR sur EMR, blocs-notes SageMaker AI |
| Bash et PowerShell | Actions d'amorçage (bootstrap actions) EMR, commandes CodeBuild, scripts AWS CLI ou AWS Tools for PowerShell |

Types de tâches Glue : **Spark** (`glueetl`) pour l'ETL distribué, **Spark Streaming** (`gluestreaming`) pour Kinesis ou Kafka, **Python shell** (`pythonshell`) pour les petites tâches sans Spark. Les tâches Glue Ray sont en maintenance et fermées aux nouveaux clients. Frameworks : Spark (Glue, EMR, Athena), Flink (Managed Service for Apache Flink), Hive et Trino (EMR), Airflow (MWAA).

> **Conseil d'examen.** Une petite transformation coûte moins cher en tâche Python shell ou en fonction Lambda qu'en tâche Spark ; Spark devient rentable quand les données ne tiennent plus sur une seule machine.

<!-- section: engineering-practices | objectives: 1.4.4 -->
## Bonnes pratiques du génie logiciel pour les pipelines

| Pratique | Mise en œuvre |
| --- | --- |
| Contrôle de version | Scripts, DAG, SQL et modèles dans Git, revus par demandes de tirage (pull requests) |
| Configuration | Arguments de tâche, Parameter Store, Secrets Manager : rien en dur dans le code |
| Tests | `pytest` sur les fonctions de transformation ; scripts Glue dans l'image Docker Glue (`public.ecr.aws/glue/aws-glue-libs:6.0`) ; exécutions sur données d'échantillon dans un compte de test ; règles Glue Data Quality |
| Journalisation | Glue 5.0 et ultérieur : journaux en temps réel dans `/aws-glue/jobs/error` et `/aws-glue/jobs/output` ; journaux JSON de Lambda ; journaux Step Functions dans CloudWatch Logs |
| Surveillance | Alarmes CloudWatch sur les métriques des tâches Glue et sur `Errors`, `Throttles`, `IteratorAge` de Lambda ; règle EventBridge sur les changements d'état des tâches Glue vers SNS |
| Idempotence | Remplacer des partitions ou faire un `MERGE` sur des clés pour qu'une nouvelle tentative ne duplique pas les lignes |

L'image Glue locale ne prend en charge ni les signets de tâche, ni Glue Data Quality, ni la fourniture d'informations d'identification par Lake Formation : testez-les dans AWS.

> **Piège d'examen.** Une tâche qui charge des doublons après une nouvelle tentative a un problème d'idempotence. Rendez l'écriture idempotente plutôt que d'ajouter des alarmes.

<!-- section: infrastructure-as-code | objectives: 1.4.5, 1.4.8 -->
## L'infrastructure en tant que code avec CloudFormation et le CDK

| Exigence | Fonctionnalité |
| --- | --- |
| Même pipeline en dev et en prod | Un seul modèle avec des `Parameters` |
| Prévisualiser une modification | Jeux de modifications (change sets) (`cdk diff`) |
| Détecter les modifications manuelles | Détection de dérive (drift detection) |
| Plusieurs comptes et Régions | StackSets |
| Conserver les données à la suppression de la pile | `DeletionPolicy: Retain` |
| Aucun secret dans les modèles | `{{resolve:ssm:...}}`, `{{resolve:secretsmanager:...}}` |

```yaml
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]
  GlueRoleArn:
    Type: String
Resources:
  OrdersJob:
    Type: AWS::Glue::Job
    Properties:
      Name: !Sub "orders-curate-${Env}"
      Role: !Ref GlueRoleArn
      GlueVersion: "5.0"
      WorkerType: G.1X
      NumberOfWorkers: 10
      Command:
        Name: glueetl
        ScriptLocation: !Sub "s3://example-artifacts-${Env}/jobs/orders_curate.py"
      DefaultArguments:
        "--job-bookmark-option": job-bookmark-enable
```

Le **AWS CDK** (TypeScript, Python, Java, C#, Go) génère du CloudFormation à partir de code. Les constructions (constructs) L1 (`Cfn*`) correspondent une à une aux ressources, les L2 ajoutent des valeurs par défaut sécurisées et des méthodes utilitaires comme `bucket.grantRead(role)`, les L3 sont des modèles multi-ressources. `cdk bootstrap` prépare une fois chaque compte et Région, `cdk synth` produit le modèle, `cdk deploy` le déploie.

> **Conseil d'examen.** Le CDK et SAM produisent tous deux des piles CloudFormation. Choisissez le CDK pour les boucles, les classes et les tests unitaires dans un langage généraliste, SAM pour des modèles sans serveur compacts.

<!-- section: sam | objectives: 1.4.6 -->
## Empaqueter et déployer des pipelines sans serveur avec AWS SAM

Un modèle SAM est un modèle CloudFormation avec `Transform: AWS::Serverless-2016-10-31`. Des types abrégés sont développés au déploiement : `AWS::Serverless::Function` (fonction, rôle, sources d'événements), `AWS::Serverless::StateMachine`, `AWS::Serverless::SimpleTable` (table DynamoDB avec une clé à un seul attribut ; utilisez `AWS::DynamoDB::Table` pour une clé de tri ou des index), `AWS::Serverless::LayerVersion`. Les modèles de politique (`S3ReadPolicy`, `DynamoDBCrudPolicy`, `SQSPollerPolicy`) accordent le moindre privilège en une ligne.

```yaml
Transform: AWS::Serverless-2016-10-31
Resources:
  LandingBucket:
    Type: AWS::S3::Bucket
  OrdersTable:
    Type: AWS::Serverless::SimpleTable
  IngestFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: python3.13
      Handler: app.handler
      CodeUri: src/ingest/
      AutoPublishAlias: live
      DeploymentPreference:
        Type: Canary10Percent5Minutes
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
      Events:
        NewFile:
          Type: S3
          Properties:
            Bucket: !Ref LandingBucket
            Events: s3:ObjectCreated:*
```

| Commande | Rôle |
| --- | --- |
| `sam build` | Construit le code et ses dépendances |
| `sam local invoke` | Exécute une fonction en local dans un conteneur |
| `sam deploy --guided` | Charge les artefacts dans S3, déploie par un jeu de modifications |
| `sam package` | Charge les artefacts et écrit le modèle pour un pipeline |
| `sam sync` | Synchronisation rapide vers une pile de développement |

`AutoPublishAlias` avec `DeploymentPreference` crée un déploiement CodeDeploy qui bascule le trafic progressivement (`Canary10Percent5Minutes`, `Linear10PercentEvery1Minute`, `AllAtOnce`), avec des hooks `PreTraffic` et `PostTraffic` et des alarmes qui déclenchent la restauration.

> **Piège d'examen.** Un événement SAM `S3` exige que le compartiment soit déclaré dans le même modèle. Pour un compartiment existant, configurez séparément S3 Event Notifications ou une règle EventBridge.

<!-- section: cicd | objectives: 1.4.9 -->
## CI/CD pour les pipelines de données

L'intégration continue construit et teste chaque modification ; la livraison continue promeut le même artefact testé d'un environnement à l'autre :

1. **Source** : un push dans le dépôt Git (GitHub, GitLab ou Bitbucket via AWS CodeConnections) démarre AWS CodePipeline.
2. **Build et tests unitaires** dans CodeBuild (phases `install`, `pre_build`, `build`, `post_build` du `buildspec.yml`), artefacts dans S3.
3. **Déploiement en test** par une action de jeu de modifications CloudFormation.
4. **Tests d'intégration et de données** sur des données d'échantillon : nombres de lignes, schémas, règles de qualité des données.
5. Action d'**approbation manuelle**.
6. **Déploiement en production** : même artefact, paramètres de production ; trafic Lambda basculé par CodeDeploy.

```yaml
version: 0.2
phases:
  install:
    commands:
      - pip install -r requirements-dev.txt
  pre_build:
    commands:
      - python -m pytest tests/unit --junitxml=reports/unit.xml
  build:
    commands:
      - sam build
      - sam package --s3-bucket "$ARTIFACT_BUCKET" --output-template-file packaged.yaml
artifacts:
  files:
    - packaged.yaml
```

> **Conseil d'examen.** Construire une fois, déployer partout. Reconstruire pour la production reviendrait à livrer du code jamais testé.

<!-- section: distributed-computing | objectives: 1.4.10 -->
## L'informatique distribuée

L'informatique distribuée découpe les données en partitions traitées en parallèle par de nombreux nœuds, avec un coordinateur qui planifie le travail. Elle évolue **horizontalement** (plus de nœuds) plutôt que **verticalement** (une plus grosse machine) et survit aux pannes de nœuds en relançant les tâches.

| Concept | Exemple AWS |
| --- | --- |
| Coordinateur et nœuds de travail | Pilote et exécuteurs Spark (Glue, EMR) ; nœud principal (leader) et nœuds de calcul Redshift |
| Partition, l'unité de parallélisme | Partitions Spark, shards Kinesis, partitions Kafka, tranches Redshift, partitions DynamoDB |
| Redistribution (shuffle) | Données redistribuées par clé pour les jointures et les agrégations |
| Asymétrie | Une partition surdimensionnée (clé chaude, clé de jointure nulle) |
| MPP | Chaque nœud analyse sa part : Redshift, Athena |

Sur EMR, le nœud **primary** coordonne, les nœuds **core** exécutent des tâches et portent HDFS, les nœuds **task** ne font que calculer (bons candidats pour les instances Spot). HDFS disparaît avec le cluster ; EMRFS garde les données dans S3, ce qui permet des clusters éphémères. Le parallélisme est plafonné par les partitions : un consommateur Lambda Kinesis obtient shards × facteur de parallélisation lots, une étape Spark une tâche par partition.

> **Piège d'examen.** L'ordre n'est garanti qu'à l'intérieur d'une partition : shard Kinesis, partition Kafka, groupe de messages SQS FIFO. Un ordre strict par client impose l'ID client comme clé de partition.

<!-- section: data-structures | objectives: 1.4.11 -->
## Structures de données et algorithmes

| Structure | Point fort | Où |
| --- | --- | --- |
| Graphe | Parcours à plusieurs sauts entre sommets et arêtes | Amazon Neptune (Gremlin ou openCypher sur des graphes de propriétés, SPARQL sur RDF), Neptune Analytics |
| Arbre | Hiérarchie triée, recherches et plages en O(log n) | Index B-tree dans RDS et Aurora, JSON imbriqué dans DocumentDB |
| Table de hachage | Recherche par clé en O(1) | Clé de partition DynamoDB, MemoryDB, jointures par hachage Spark |
| File d'attente | Premier entré, premier sorti | SQS (FIFO par groupe de messages) |
| Journal en ajout seul | Décalages ordonnés et relisibles | Numéros de séquence Kinesis, offsets Kafka |
| Blocs avec statistiques min/max | Ignorer les blocs hors du filtre | Groupes de lignes Parquet, zone maps Redshift avec clés de tri |

Une analyse complète est en O(n) : un `Query` DynamoDB sur une clé bat un `Scan` ; le tri est en O(n log n) : les clés et ordres de tri sont maintenus à l'écriture, pas à chaque requête.

> **Piège d'examen.** « Trouver les comptes liés à un fraudeur à moins de trois sauts par des appareils partagés » est un parcours de graphe dans Neptune, pas une suite d'auto-jointures récursives dans une base relationnelle.

<!-- section: key-points -->
## Points clés

- Lire moins (élagage, signets, formats en colonnes), redistribuer moins (diffusion, correction de l'asymétrie) et écrire de plus gros fichiers avant d'ajouter des workers Glue.
- Lambda : la mémoire augmente le processeur ; la simultanéité réservée plafonne, la simultanéité provisionnée pré-initialise ; simultanéité Kinesis = shards × `ParallelizationFactor` (1–10) ; `MaximumConcurrency` SQS de 2 à 1 000.
- Stockage Lambda : `/tmp` jusqu'à 10 240 Mo, EFS ou S3 Files partagés par un montage VPC sous `/mnt/`, couches sous `/opt`, images jusqu'à 10 Go.
- Types de tâches Glue : Spark, Spark Streaming, Python shell ; tâches Ray fermées aux nouveaux clients.
- Git, tests, journaux et alarmes CloudWatch, écritures idempotentes.
- CloudFormation, le CDK et SAM déploient tous des piles CloudFormation ; SAM ajoute les types `AWS::Serverless::*`, les modèles de politique et les déploiements progressifs CodeDeploy.
- CI/CD : étapes CodePipeline, `buildspec.yml` CodeBuild, approbation, même artefact dans chaque environnement.
- Le parallélisme suit les partitions et l'ordre n'est garanti qu'à l'intérieur de l'une d'elles ; graphes pour les relations, clés de hachage pour les recherches directes.
