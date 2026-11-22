Un orchestrateur décide de ce qui s'exécute, dans quel ordre, de ce qui se passe quand une étape échoue et de qui est prévenu. Les questions d'examen donnent un pipeline (exploration, transformation, chargement, validation, notification) et une contrainte : uniquement des composants Glue, des DAG Airflow existants, du sans serveur seulement, une approbation humaine, des milliers de fichiers en parallèle, ou une alerte dans les minutes qui suivent un échec. Ce chapitre compare les services d'orchestration, détaille Step Functions, recense les techniques qui rendent les pipelines résilients et traite des alertes avec Amazon SNS et Amazon SQS.

<!-- section: orchestration-services | objectives: 1.3.1 -->
## Services d'orchestration pour les pipelines ETL

| Service | Modèle | Cas d'usage idéal |
| --- | --- | --- |
| AWS Step Functions | Machine d'état en JSON (Amazon States Language), sans serveur, intégrations optimisées avec Glue, EMR, Athena, Lambda, Batch, ECS, SNS, SQS, DynamoDB, Bedrock et appels SDK vers la plupart des API AWS | Pipelines composés de services AWS, gestion des erreurs par étape, approbations humaines, diffusion parallèle à grande échelle |
| Amazon MWAA | Apache Airflow géré : DAG en Python, planificateurs et workers à mise à l'échelle automatique sur Fargate dans votre VPC, opérateurs pour S3, Redshift, EMR, Glue, Lambda, SageMaker AI | Équipes qui ont déjà des DAG ou des opérateurs Airflow, dépendances complexes, rattrapages, tâches hors d'AWS |
| MWAA Serverless | Flux de travail Airflow en YAML ou DAG Python, sans environnement à gérer, facturés au temps d'exécution des tâches | La sémantique d'Airflow sans dimensionner d'environnement |
| Flux de travail AWS Glue (AWS Glue workflows) | Graphe de tâches, de robots d'analyse et de déclencheurs Glue, avec des propriétés d'exécution partagées | Pipelines composés uniquement de tâches et de robots d'analyse Glue |
| Amazon EventBridge | Règles sur un bus d'événements, Scheduler, Pipes (source, filtre, enrichissement, cible) | Démarrer des flux de travail sur événement ou planification, acheminer ; aucun état de flux de travail |
| AWS Lambda | Du code | Une petite étape isolée, ou la liaison entre services ; pas un moteur de flux de travail |

Un flux de travail Glue démarre par un déclencheur unique : planifié, à la demande, ou sur des événements EventBridge avec une taille de lot et une fenêtre de lot de 900 secondes au plus. Dans le flux, des déclencheurs conditionnels se déclenchent quand les tâches ou robots surveillés atteignent `SUCCEEDED`, `FAILED`, `TIMEOUT` ou `STOPPED` (robots : `SUCCEEDED`, `FAILED`, `CANCELLED`), pour tous ou pour l'un d'eux. Limitez un flux de travail à 100 tâches, robots et déclencheurs au plus.

EventBridge Pipes relie une source (SQS, Kinesis, DynamoDB Streams, MSK, Kafka autogéré, Amazon MQ) à une cible, avec un filtre facultatif et une étape d'enrichissement (Lambda, Step Functions Express, API Gateway ou une destination d'API), en conservant l'ordre de la source.

| Exigence | Réponse |
| --- | --- |
| Explorer les nouvelles données, exécuter trois tâches Glue en séquence, puis explorer la sortie, avec les seules fonctionnalités de Glue | Flux de travail Glue avec déclencheurs conditionnels |
| Migrer 200 DAG Airflow existants avec un minimum de modifications du code | Amazon MWAA |
| Exécuter une tâche Glue, puis une étape EMR, puis une requête Athena, attendre chacune, notifier en cas d'échec, sans serveur | Step Functions Standard |
| Démarrer le pipeline quand un fichier arrive dans S3 | Règle EventBridge sur Object Created qui cible la machine d'état ou le flux de travail Glue |
| Faire passer chaque nouveau message SQS par un filtre et une machine d'état sans code | EventBridge Pipes |

> **Piège d'examen.** AWS Data Pipeline est fermé aux nouveaux clients. Une question qui le propose pour une nouvelle orchestration a une meilleure réponse parmi Step Functions, MWAA et les flux de travail Glue.

<!-- section: step-functions | objectives: 1.3.1, 1.3.3 -->
## Step Functions pour les flux de travail de données

| Propriété | Standard | Express |
| --- | --- | --- |
| Durée maximale | Un an | Cinq minutes |
| Sémantique d'exécution | Exactement une fois | Au moins une fois (asynchrone), au plus une fois (synchrone) |
| Tarification | Par transition d'état | Par exécution, durée et mémoire |
| Historique | 90 jours dans la console et l'API | Uniquement dans CloudWatch Logs, s'il est activé |
| `.sync` et `.waitForTaskToken` | Oui | Non |
| Distributed Map, redrive | Oui | Non (Express peut servir de flux enfants d'un Distributed Map) |

Le modèle d'intégration se choisit par le suffixe de la ressource :

- **Request Response** (sans suffixe) : appeler l'API et continuer.
- **Run a Job** (`.sync`) : démarrer la tâche et attendre sa fin, par exemple `arn:aws:states:::glue:startJobRun.sync`.
- **Wait for Callback** (`.waitForTaskToken`) : transmettre `$$.Task.Token` à un worker externe ou à une personne, qui le renvoie avec `SendTaskSuccess` ou `SendTaskFailure` ; définissez `HeartbeatSeconds` pour faire échouer les tâches bloquées.

```json
{
  "StartAt": "TransformOrders",
  "States": {
    "TransformOrders": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": { "JobName": "orders-to-parquet" },
      "Retry": [{
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 60, "MaxAttempts": 2,
        "BackoffRate": 2, "JitterStrategy": "FULL"
      }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }],
      "Next": "RefreshPartitions"
    },
    "RefreshPartitions": {
      "Type": "Task",
      "Resource": "arn:aws:states:::athena:startQueryExecution.sync",
      "Parameters": {
        "QueryString": "MSCK REPAIR TABLE curated.orders",
        "WorkGroup": "etl"
      },
      "End": true
    },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:eu-west-3:111122223333:etl-alerts",
        "Message.$": "States.Format('Orders pipeline failed: {}', $.Cause)"
      },
      "Next": "Failed"
    },
    "Failed": { "Type": "Fail" }
  }
}
```

Les états **Map** traitent des tableaux. Le mode en ligne (inline) convient aux petites entrées ; le **Distributed Map** lit les éléments dans S3 (par exemple un fichier CSV ou une liste d'objets), exécute jusqu'à 10 000 flux enfants en parallèle, regroupe les éléments par lots, écrit les résultats dans S3 avec `ResultWriter` et s'arrête quand `ToleratedFailurePercentage` ou `ToleratedFailureCount` est dépassé. Choisissez-le quand le jeu de données dépasse 256 Kio, que l'historique dépasserait 25 000 événements ou que vous avez besoin de plus de 40 itérations simultanées.

> **Conseil d'examen.** « Attendre la fin de la tâche Glue avant de charger Redshift, sans code d'interrogation » : `.sync`. « Faire une pause jusqu'à ce qu'un responsable des données approuve le fichier » : `.waitForTaskToken`, que seuls les flux de travail Standard prennent en charge.

<!-- section: resilient-pipelines | objectives: 1.3.2 -->
## Créer des pipelines performants, disponibles et tolérants aux pannes

| Objectif | Technique |
| --- | --- |
| Surmonter les erreurs passagères | `Retry` avec backoff et gigue dans Step Functions, relances du SDK, relances des tâches Glue (0 à 10 ; une tâche expirée n'est pas relancée) |
| Contenir les erreurs permanentes | `Catch` vers un état de nettoyage ou d'alerte ; files d'attente de lettres mortes ; destinations en cas d'échec ; seuils d'échecs tolérés sur un Distributed Map |
| Relancer sans risque | Étapes idempotentes : chemins de sortie déterministes, écrasement d'une partition, upserts, jetons d'idempotence comme le `ClientToken` de Redshift Data API dérivé de l'ID d'exécution |
| Reprendre sans refaire le travail | Redrive d'une exécution Standard en échec à partir de l'étape fautive (dans les 14 jours) ; signets Glue ; points de contrôle Flink et du streaming Glue |
| Absorber les pics | SQS ou Kinesis entre producteurs et traitements ; simultanéité réservée Lambda et `MaxConcurrency` sur les états Map pour protéger les systèmes en aval |
| Monter en charge | Découper le travail (Distributed Map, plus de partitions, plus de workers Glue, Auto Scaling), éviter les étapes monothread |
| Disponibilité | Services gérés régionaux répartis sur plusieurs zones de disponibilité (Step Functions, SQS, SNS, Kinesis, Glue, MWAA) ; EMR avec nœuds primaire et principaux On-Demand, Spot uniquement sur les nœuds de tâche |
| Ne pas perdre de données | Déposer les données brutes dans S3 avant de les transformer ; garder une rétention des flux suffisante pour relire après une panne |
| Tâches bloquées par la capacité | File d'attente des exécutions Glue (job run queuing) plutôt qu'un échec immédiat ; simultanéité maximale dimensionnée selon la charge |

> **Piège d'examen.** Des relances sans idempotence transforment un échec en doublons. Quand un énoncé indique qu'une relance a doublé les lignes dans Redshift, la correction est un chargement idempotent (table intermédiaire et fusion, ou suppression puis insertion dans une même transaction), pas davantage de relances.

<!-- section: serverless-workflows | objectives: 1.3.3 -->
## Mettre en œuvre et maintenir des flux de travail sans serveur

Un pipeline sans serveur enchaîne en général une source d'événements, une machine d'état et des étapes de traitement gérées : S3 Object Created → règle EventBridge → Step Functions → Lambda pour la validation → Glue pour la transformation → Athena ou Redshift Data API → SNS. Rien ne tourne entre deux exécutions et rien n'a besoin de correctifs.

Le maintenir, c'est :

- **Déployer sous forme de code** : modèles AWS SAM ou CloudFormation pour la machine d'état, son rôle, sa planification et ses alarmes.
- **Observer** : métriques CloudWatch comme `ExecutionsFailed` et `ExecutionsTimedOut` avec des alarmes ; CloudWatch Logs pour les flux de travail Express, qui ne gardent aucun historique dans Step Functions.
- **Rétablir** : relancer par redrive les exécutions Standard en échec au lieu de repartir de la première étape.
- **Moindre privilège** : un rôle IAM par machine d'état avec les seules actions appelées par ses tâches ; les tâches Glue `.sync` ont besoin de `glue:StartJobRun`, `glue:GetJobRun`, `glue:GetJobRuns` et `glue:BatchStopJobRun`.

```yaml
OrdersPipeline:
  Type: AWS::Serverless::StateMachine
  Properties:
    Type: STANDARD
    DefinitionUri: statemachine/orders.asl.json
    Policies:
      - Statement:
          - Effect: Allow
            Action:
              - glue:StartJobRun
              - glue:GetJobRun
              - glue:GetJobRuns
              - glue:BatchStopJobRun
            Resource: "*"
          - Effect: Allow
            Action: sns:Publish
            Resource: !Ref EtlAlertsTopic
    Events:
      Nightly:
        Type: ScheduleV2
        Properties:
          ScheduleExpression: cron(0 3 * * ? *)
          ScheduleExpressionTimezone: Europe/Paris
```

Choisissez Express pour un travail volumineux, court et idempotent (par exemple un enrichissement par enregistrement appelé par Pipes ou API Gateway) et Standard pour tout ce qui attend des tâches, des personnes ou des rappels.

<!-- section: notifications | objectives: 1.3.4 -->
## Envoyer des alertes avec Amazon SNS et Amazon SQS

| Service | Rôle dans les alertes |
| --- | --- |
| Amazon SNS | Pousse vers des personnes et des systèmes : e-mail, SMS, HTTP/S, Lambda, SQS, Data Firehose, notifications mobiles ; des politiques de filtrage sur les attributs ou le corps acheminent chaque alerte vers les bons abonnés ; les rubriques FIFO livrent dans l'ordre à des files SQS FIFO |
| Amazon SQS | Met en mémoire tampon des alertes ou des éléments en échec qu'un programme traitera plus tard, avec rétention et file d'attente de lettres mortes ; ne prévient personne par lui-même |
| SNS vers plusieurs files SQS | Diffusion : l'outil d'astreinte, une intégration de tickets et une file d'audit reçoivent chacun toutes les alertes |

Sources d'alertes courantes :

- **Règle EventBridge** sur `Glue Job State Change` (`FAILED`, `TIMEOUT`), `Glue Crawler State Change`, les changements d'état des exécutions Step Functions, les événements EMR ou DMS, avec une rubrique SNS comme cible.
- **Alarme CloudWatch** sur une métrique (`ExecutionsFailed` de Step Functions, `Errors` de Lambda, `IteratorAge` de Kinesis) avec une action SNS.
- **Une étape du flux de travail** : une tâche Step Functions `sns:publish` dans une branche `Catch`.

```json
{
  "source": ["aws.glue"],
  "detail-type": ["Glue Job State Change"],
  "detail": {
    "jobName": ["orders-to-parquet"],
    "state": ["FAILED", "TIMEOUT"]
  }
}
```

La politique d'accès de la rubrique SNS doit autoriser `events.amazonaws.com` (ou `cloudwatch.amazonaws.com`) à publier, et une rubrique chiffrée exige une clé KMS gérée par le client dont la politique permet à ce service de l'utiliser.

> **Conseil d'examen.** « Envoyer un e-mail à l'équipe données dans les minutes qui suivent l'échec de n'importe quelle tâche Glue, avec le moins de charge opérationnelle » : une règle EventBridge sur les changements d'état des tâches Glue qui cible une rubrique SNS avec un abonnement e-mail, pas une fonction Lambda qui interroge les exécutions.

<!-- section: key-points -->
## Points clés

- Step Functions pour les pipelines de services AWS ; MWAA pour les DAG Airflow ; flux de travail Glue pour les chaînes 100 % Glue ; EventBridge pour démarrer et acheminer, pas pour conserver un état.
- Standard : un an, exactement une fois, `.sync`, rappels, redrive, Distributed Map ; Express : cinq minutes, gros volumes, travail idempotent.
- `.sync` attend une tâche ; `.waitForTaskToken` attend un rappel.
- Résilience : relances avec backoff et gigue, `Catch`, files de lettres mortes, écritures idempotentes, points de contrôle, files d'attente pour absorber les pics, Spot uniquement pour les nœuds de tâche EMR.
- Alertes : EventBridge ou alarme CloudWatch vers une rubrique SNS ; SQS sert de tampon aux programmes, pas aux personnes.
- Data Pipeline est fermé aux nouveaux clients.
