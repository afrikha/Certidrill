Les questions de transformation décrivent des données brutes et une forme cible (nettoyée, jointe, en colonnes, partitionnée, enrichie) et demandent quel moteur doit faire le travail, comment il se connecte aux sources, comment le rendre moins cher ou plus rapide, et pourquoi une exécution a échoué. Partez des données : quelle quantité, quelle vitesse, quel degré de structure. Choisissez ensuite le plus petit moteur qui convient, et cherchez le paramètre qui règle le coût ou la performance avant de changer de service.

<!-- section: data-characteristics | objectives: 1.2.9 -->
## Volume, vélocité et variété

| Dimension | Question à poser | Conséquence |
| --- | --- | --- |
| Volume | Mégaoctets, téraoctets ou pétaoctets par exécution ? | Lambda pour les petits fichiers ; Glue ou EMR (Spark distribué) pour les grands jeux de données ; Redshift pour les grandes transformations SQL sur des données chargées |
| Vélocité | Chaque nuit, chaque heure, en minutes, en secondes ? | Tâches par lots ; micro-lots (Firehose, streaming Glue) ; traitement continu (Managed Service for Apache Flink, Lambda sur Kinesis) |
| Variété | Structurées, semi-structurées ou non structurées ? | Schéma à l'écriture dans un entrepôt, schéma à la lecture avec le catalogue de données Glue et Athena, ou extraction par un modèle |

| Type | Exemples | Traitement typique |
| --- | --- | --- |
| Structurées | Tables relationnelles, CSV à schéma fixe | SQL, lectures JDBC, tables Redshift |
| Semi-structurées | JSON, Avro, XML, journaux | Les robots d'analyse déduisent les schémas, `SUPER` Redshift avec `JSON_PARSE`, `Relationalize` de Glue pour aplatir l'imbrication |
| Non structurées | PDF, images, e-mails, texte libre | Stockées comme objets dans S3 ; métadonnées ou texte extraits par des services d'IA ou des grands modèles de langage |

<!-- section: transformation-services | objectives: 1.2.5 -->
## Choisir un service de transformation

| Service | Points forts | Limites à retenir |
| --- | --- | --- |
| AWS Lambda | Travail par événement ou par fichier, sans serveur, mise à l'échelle à la requête | Délai d'expiration maximal de 30 minutes sur la page actuelle des quotas Lambda (des pages plus anciennes et la FAQ indiquent encore 15 minutes ; 90 minutes pour certains appels de Lambda Managed Instances) ; jusqu'à 10 240 Mo de mémoire et de `/tmp` |
| Tâche Spark AWS Glue | Spark sans serveur avec DynamicFrames, catalogue de données, signets et connexions | Temps de démarrage ; facturé par DPU-heure |
| Tâche Glue Python shell | Tâches Python légères (appels, petits fichiers) sans Spark | Un seul nœud |
| Tâche Glue de streaming | Spark en continu sur Kinesis ou Kafka | S'exécute et se facture tant qu'elle est active |
| AWS Glue DataBrew | Recettes visuelles pour les analystes, sans code | Préparation et profilage, pas de pipelines complexes |
| Amazon EMR sur EC2 | Contrôle complet de Spark, Hive, Trino, HBase et de la configuration du cluster ; capacité Spot | Vous dimensionnez et gérez les clusters |
| EMR Serverless | Applications Spark ou Hive sans cluster ; capacité pré-initialisée pour des démarrages rapides | Moins de contrôle de configuration qu'EMR sur EC2 |
| EMR on EKS | Tâches Spark sur un cluster Amazon EKS existant | Exige Kubernetes |
| Amazon Redshift | ELT en SQL : `INSERT ... SELECT`, vues matérialisées, procédures stockées | Les données doivent être chargées ou accessibles par Spectrum |
| CTAS et `INSERT INTO` Athena | Transformation SQL de données S3, sans serveur, facturée aux données analysées | 100 partitions écrites par requête |
| Managed Service for Apache Flink | Traitement de flux avec état en Java, Python ou SQL | Streaming uniquement |

Les tâches Glue Ray sont en maintenance, sans nouveaux clients : ne les choisissez jamais pour une nouvelle conception.

| Exigence | Réponse |
| --- | --- |
| Convertir chaque fichier chargé de quelques mégaoctets dès son arrivée | Lambda déclenchée par l'événement S3 |
| Transformation Spark nocturne de 5 To, le moins de charge opérationnelle | Tâche Spark Glue (ou EMR Serverless) |
| Tâches Spark existantes qui exigent des bibliothèques personnalisées et un réglage du cluster | EMR sur EC2 |
| Des analystes nettoient des données sans code | Glue DataBrew |
| Données déjà dans Redshift, résultats attendus dans Redshift | SQL dans Redshift (ELT) |

> **Piège d'examen.** Une transformation qui dure plusieurs heures exclut Lambda, quelle que soit sa mémoire. La solution est Glue, EMR, AWS Batch ou une tâche ECS, pas un délai d'expiration Lambda plus long.

<!-- section: containers | objectives: 1.2.1 -->
## Conteneurs pour le traitement des données

| Choix | Quand |
| --- | --- |
| Amazon ECS | Orchestration de conteneurs native AWS, la plus simple à apprendre |
| Amazon EKS | Compétences ou outils Kubernetes déjà en place, portabilité, EMR on EKS |
| AWS Fargate | Aucune instance à gérer ; tâches jusqu'à 32 vCPU et 244 Go de mémoire sous Linux ; pas de GPU |
| Type de lancement EC2 ou nœuds gérés | GPU, familles d'instances précises, charges très grosses ou de longue durée |
| AWS Batch | Files de tâches par lots avec priorités, relances et Spot sur ECS, EKS ou Fargate |

Leviers de performance et de coût : dimensionnez le processeur et la mémoire de chaque tâche d'après les métriques plutôt que par défaut ; montez en charge avec davantage de tâches plutôt qu'une seule énorme ; utilisez des images ARM64 (Graviton) quand les bibliothèques le permettent (`runtimePlatform` avec `cpuArchitecture: ARM64`) ; exécutez le travail interruptible sur Spot ; gardez des images légères dans Amazon ECR, dans la même Région, pour réduire le temps de démarrage.

<!-- section: source-connections | objectives: 1.2.2 -->
## Se connecter aux sources de données avec JDBC et ODBC

| Client | Mode de connexion |
| --- | --- |
| Tâche ou robot d'analyse Glue | Connexion Glue (de type JDBC, Kafka, MongoDB ou Network) avec un sous-réseau, un groupe de sécurité et des identifiants issus de Secrets Manager |
| Outil de BI ou client SQL vers Redshift | Pilote JDBC ou ODBC Redshift, ou Redshift Data API sans pilote |
| Outil de BI vers Athena | Pilote JDBC ou ODBC Athena |
| Athena vers RDS, DynamoDB, Redshift, CloudWatch Logs, Snowflake... | Connecteurs de requête fédérée |
| Redshift vers Aurora ou RDS PostgreSQL et MySQL | Requêtes fédérées Redshift |

Les lectures JDBC sont monothread par défaut. Les DynamicFrames Glue récupèrent 1 000 lignes à la fois ; avec Spark JDBC simple, définissez `fetchsize`, sinon un seul exécuteur peut mettre toute la table en cache et échouer par manque de mémoire. Glue peut découper une lecture JDBC avec les options `hashfield` ou `hashpartitions`.

> **Conseil d'examen.** « Une fonction Lambda doit exécuter du SQL sur Redshift sans gérer de connexions ni de pilotes » : Redshift Data API avec un secret ou des informations d'identification temporaires.

<!-- section: multi-source-integration | objectives: 1.2.3 -->
## Intégrer des données de plusieurs sources

| Besoin | Solution |
| --- | --- |
| Joindre chaque jour des données S3 à une table RDS | Tâche Glue qui lit les deux via le catalogue de données et une connexion JDBC, et écrit le résultat joint dans S3 |
| SQL ponctuel sur S3, DynamoDB et une base relationnelle, sans copie | Requête fédérée Athena (lecture seule : pas d'`INSERT INTO` sur les sources fédérées) |
| Tables de l'entrepôt jointes aux fichiers du lac de données | Tables externes Redshift Spectrum |
| Réplication continue de bases opérationnelles vers Redshift sans pipeline | Intégration zero-ETL depuis Aurora MySQL ou PostgreSQL, RDS for MySQL, PostgreSQL ou Oracle, DynamoDB, ou des applications comme Salesforce, SAP, ServiceNow et Zendesk |
| Données SaaS vers S3 ou Redshift | Amazon AppFlow |
| Une vue unique des schémas de toutes les sources | Tables du catalogue de données Glue alimentées par des robots d'analyse |

Les clés et les types correspondent rarement d'une source à l'autre : normalisez-les (`ApplyMapping`, `ResolveChoice` de Glue) avant la jointure, et diffusez (broadcast) le petit côté d'une jointure pour éviter de redistribuer le grand.

<!-- section: format-conversion | objectives: 1.2.6 -->
## Transformer les données d'un format à un autre

Les formats en colonnes (Apache Parquet, ORC) ne lisent que les colonnes utiles, se compressent bien et stockent des statistiques : Athena, Redshift Spectrum et Spark analysent donc moins de données. Snappy est le codec Parquet habituel ; les fichiers CSV ou JSON compressés en GZIP ne peuvent pas être découpés, si bien qu'un gros fichier est lu par une seule tâche.

| Voie | Usage |
| --- | --- |
| Tâche Glue | N'importe quel format d'entrée vers Parquet avec des clés de partition, sur planification ou événement |
| CTAS Athena | Conversion ponctuelle ou périodique en SQL, jusqu'à 100 partitions par requête, puis des lots d'`INSERT INTO` |
| Conversion du format des enregistrements Data Firehose | JSON en streaming vers Parquet ou ORC avec un schéma du catalogue de données Glue ; le CSV exige d'abord une transformation Lambda vers JSON |
| EMR ou EMR Serverless | Très grosses conversions avec un Spark réglé |

```python
raw = glueContext.create_dynamic_frame.from_catalog(
    database="sales_raw", table_name="orders_csv",
    transformation_ctx="raw")
glueContext.write_dynamic_frame.from_options(
    frame=raw, connection_type="s3",
    connection_options={"path": "s3://example-curated/orders/",
                        "partitionKeys": ["order_date"]},
    format="glueparquet",
    format_options={"compression": "snappy"},
    transformation_ctx="curated")
```

```text
CREATE TABLE curated.orders_parquet
WITH (format = 'PARQUET',
      write_compression = 'SNAPPY',
      external_location = 's3://example-curated/orders_ctas/',
      partitioned_by = ARRAY['order_date'])
AS SELECT order_id, customer_id, amount, order_date
FROM raw.orders_csv
WHERE order_date >= DATE '2026-11-01';
```

Dans un CTAS, les colonnes de partition viennent en dernier dans le `SELECT`, dans l'ordre de `partitioned_by`. Au-delà de 100 partitions, la requête échoue avec `HIVE_TOO_MANY_OPEN_PARTITIONS`.

<!-- section: cost-optimization | objectives: 1.2.4 -->
## Optimiser les coûts de traitement

| Levier | Détail |
| --- | --- |
| Exécution flex de Glue | Capacité disponible pour les tâches non urgentes (tests, chargements ponctuels, exécutions nocturnes avec de la marge) ; workers G.1X ou G.2X, Glue 3.0 ou ultérieur |
| Auto Scaling de Glue et bon type de worker | Payer les seuls workers nécessaires ; types R uniquement pour les tâches limitées par la mémoire |
| Traitement incrémentiel | Signets de tâche, prédicats de partition, CDC plutôt que des rechargements complets |
| Délai d'expiration d'une tâche Glue | 480 minutes par défaut à partir de Glue 5.0 (2 880 auparavant), 7 jours au maximum : abaissez-le pour arrêter les tâches qui s'emballent |
| Achat de capacité EMR | Spot pour les nœuds de tâche ; nœuds primaire et principaux On-Demand pour les clusters de longue durée ou aux données critiques ; tout en Spot seulement si la perte du cluster est acceptable |
| Clusters éphémères, sans serveur | Arrêtez les clusters EMR après leurs étapes, ou utilisez EMR Serverless |
| Moins de données analysées | Parquet, partitionnement, compression, pas de `SELECT *` |
| Architecture | Graviton quand c'est possible, lots plutôt que streaming quand la latence le permet |
| Appels de modèles | Inférence par lots Amazon Bedrock, 50 % moins chère que l'inférence à la demande pour les modèles pris en charge |

> **Piège d'examen.** Flex convient au travail qui peut démarrer en retard. Une tâche qui doit se terminer chaque matin dans un SLA serré reste sur la classe d'exécution standard.

<!-- section: troubleshooting | objectives: 1.2.7 -->
## Dépanner les échecs et les problèmes de performance des transformations

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| Pilote à court de mémoire, `glue.driver.jvm.heap.usage` qui grimpe, exécuteurs inactifs | Des centaines de milliers de petits fichiers listés et suivis par le pilote, ou un `collect()` | `groupFiles`, compactage des petits fichiers, travail maintenu distribué |
| Exécuteur à court de mémoire, « Container killed by YARN for exceeding memory limits » | Grosse lecture JDBC dans un seul exécuteur, clé déséquilibrée | Lectures JDBC par DynamicFrame ou `fetchsize`, lectures parallèles, workers R |
| Une tâche tourne des heures pendant que les autres finissent | Asymétrie des données (data skew) sur une clé de jointure ou de regroupement | Saler la clé chaude, repartitionner, diffuser la petite table |
| Des milliers de minuscules fichiers en sortie | Trop de partitions écrites | `coalesce` ou `repartition` avant l'écriture |
| La tâche retraite d'anciennes données | Signet non activé, pas de `transformation_ctx`, `job.commit()` absent | Corriger le script et l'option de la tâche |
| Une requête Athena échoue sur une nouvelle partition | Le schéma des nouveaux fichiers diffère de celui de la table | Aligner les types, mettre à jour la table, relancer le robot d'analyse |
| Délai d'expiration dépassé | Tâche sous-dimensionnée ou entrée non bornée | Workers plus nombreux ou plus gros, entrée incrémentielle, délai adapté au SLA |

Consultez d'abord les métriques CloudWatch et les journaux de la tâche, puis l'interface Spark UI pour les étapes, les volumes de redistribution (shuffle) et les tâches retardataires.

<!-- section: data-apis | objectives: 1.2.8 -->
## Créer des API de données

| Besoin | Conception |
| --- | --- |
| API REST à faible latence sur des données préparées | API Gateway avec Lambda qui lit DynamoDB, ou RDS via RDS Proxy |
| Résultats SQL pour une application, sans pilote | Redshift Data API : asynchrone, requêtes jusqu'à 24 heures, résultats jusqu'à 500 Mo conservés 24 heures |
| Requêtes ponctuelles sur S3 depuis une application | API Athena (`StartQueryExecution`, puis interrogation de l'état et lecture des résultats dans S3) |
| Lectures et écritures simples sur une table | Intégration de service directe d'API Gateway avec DynamoDB, sans Lambda |
| Protéger le back-end et mesurer les clients | Limitation, plans d'utilisation et clés d'API d'API Gateway, cache |

```bash
aws redshift-data execute-statement \
  --workgroup-name analytics \
  --database sales \
  --secret-arn arn:aws:secretsmanager:eu-west-3:111122223333:secret:sales-api \
  --sql "SELECT region, SUM(amount) FROM orders GROUP BY region"
aws redshift-data describe-statement --id "$STATEMENT_ID"
aws redshift-data get-statement-result --id "$STATEMENT_ID"
```

<!-- section: llm-processing | objectives: 1.2.10 -->
## Intégrer des grands modèles de langage au traitement des données

Les grands modèles de langage d'Amazon Bedrock transforment une entrée non structurée ou désordonnée en champs structurés : classer des tickets de support, extraire des entités de contrats, normaliser des adresses en texte libre, résumer des documents, générer des embeddings. Le rôle de l'ingénieur de données est d'appeler le modèle au bon endroit du pipeline, à un coût raisonnable, et de vérifier ce qui revient.

| Modèle | Quand |
| --- | --- |
| `InvokeModel` ou `Converse` depuis Lambda ou une tâche Glue | Par enregistrement ou par fichier, à l'arrivée des données |
| Intégration optimisée Step Functions `bedrock:invokeModel` | Une étape de flux de travail ; `Body` en ligne jusqu'à 256 Kio, ou emplacements `Input` et `Output` dans S3 pour des charges plus grosses |
| Distributed Map sur des objets S3 avec un appel de modèle par élément | Des milliers de documents traités en parallèle |
| Inférence par lots Bedrock | Gros arriérés sans contrainte de latence : enregistrements d'entrée dans S3, tâche asynchrone, résultats écrits dans S3, prix réduit ; pas pour les modèles provisionnés |

```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::bedrock:invokeModel",
  "Parameters": {
    "ModelId": "amazon.nova-lite-v1:0",
    "Input": { "S3Uri.$": "$.requestUri" },
    "Output": { "S3Uri": "s3://example-enriched/tickets/" }
  },
  "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "MaxAttempts": 3, "BackoffRate": 2 }],
  "Next": "LoadResults"
}
```

Demandez une structure de sortie fixe (sorties structurées ou schéma JSON dans l'invite), validez-la avant le chargement, conservez l'entrée brute pour la retraiter avec une meilleure invite, et relancez les appels limités avec backoff.

> **Conseil d'examen.** « Classer 20 millions d'avis archivés d'ici la semaine prochaine, de la façon la plus rentable » : inférence par lots. Appeler le modèle de façon synchrone pour chaque enregistrement dans une boucle est plus lent, plus cher et limité.

<!-- section: key-points -->
## Points clés

- Choisissez selon le volume, la vélocité et la variété : Lambda pour les petits événements, Glue ou EMR pour les gros traitements Spark, Redshift pour le SQL sur des données chargées, Flink pour les flux avec état.
- Les tâches de plusieurs heures excluent Lambda.
- Fargate : jusqu'à 32 vCPU et 244 Go, pas de GPU ; ECS pour la simplicité, EKS pour Kubernetes.
- Le JDBC Glue exige une connexion avec ses paramètres réseau et Secrets Manager ; Redshift Data API n'exige aucun pilote.
- Les requêtes fédérées Athena lisent sur place ; le zero-ETL réplique vers Redshift.
- Parquet et Snappy ; Firehose ne convertit que du JSON ; un CTAS écrit au plus 100 partitions.
- Coûts : flex, Auto Scaling, signets, nœuds de tâche Spot, moins de données analysées, inférence par lots Bedrock.
- Pilote à court de mémoire : beaucoup de petits fichiers ; tâche retardataire : asymétrie des données.
