Les questions d'automatisation partent d'un pipeline que quelqu'un lance à la main ou qui échoue sans prévenir, et demandent quel service l'exécute à l'heure, relance ce qui échoue et appelle la bonne API : un orchestrateur, une règle d'événement ou une planification, une fonction Lambda, un appel SDK, ou une fonctionnalité intégrée de Glue, EMR, Redshift ou Athena. La réponse est en général l'option gérée qui demande le moins de code tout en respectant la contrainte énoncée.

<!-- section: orchestration | objectives: 3.1.1 -->
## Orchestrer des pipelines de données

| Orchestrateur | Ce que c'est | Le choisir quand |
| --- | --- | --- |
| **AWS Step Functions** Standard | Machine d'état sans serveur en Amazon States Language (JSON) ; jusqu'à un an, exactement une fois, facturée par transition d'état ; modèles `.sync` (attendre une tâche) et `.waitForTaskToken` (rappel), Distributed Map pour des millions d'objets S3 | Pipelines natifs AWS avec branchements, nouvelles tentatives et gestion des erreurs, sans serveurs |
| Step Functions Express | Jusqu'à cinq minutes, au moins une fois (asynchrone), facturée par exécution et par durée ; ni `.sync` ni rappel | Traitement d'événements courts en gros volume |
| **Amazon MWAA** | Environnement Apache Airflow géré : DAG Python dans un compartiment S3, `requirements.txt` et plugins, planificateurs et workers à mise à l'échelle automatique sur Fargate dans votre VPC | DAG Airflow existants, portabilité open source, nombreux opérateurs tiers |
| **MWAA Serverless** | Flux de travail Airflow définis en YAML dans S3, calcul provisionné à chaque exécution, planifiés par EventBridge Scheduler, un rôle IAM par flux de travail | Flux de travail de style Airflow sans environnement permanent |
| **Flux de travail AWS Glue (workflows)** | Déclencheurs qui enchaînent robots d'analyse (crawlers) et tâches Glue | Pipelines composés uniquement d'éléments Glue |
| **Amazon EventBridge** | Règles d'événements et planifications | Démarrer un pipeline sur un événement ou à une heure, sans gérer ses étapes |

```json
{
  "StartAt": "TransformSales",
  "States": {
    "TransformSales": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": { "JobName": "sales-to-parquet" },
      "Retry": [
        { "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 60, "MaxAttempts": 2, "BackoffRate": 2.0 }
      ],
      "Catch": [
        { "ErrorEquals": ["States.ALL"], "Next": "NotifyFailure" }
      ],
      "Next": "BuildDailyTotals"
    },
    "BuildDailyTotals": {
      "Type": "Task",
      "Resource": "arn:aws:states:::athena:startQueryExecution.sync",
      "Parameters": {
        "QueryString": "INSERT INTO curated.daily_sales SELECT store_id, sale_date, SUM(amount) FROM curated.sales GROUP BY store_id, sale_date",
        "WorkGroup": "etl"
      },
      "End": true
    },
    "NotifyFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:eu-west-1:111122223333:pipeline-alerts",
        "Message.$": "$.Cause"
      },
      "End": true
    }
  }
}
```

> **Piège d'examen.** Sans `.sync`, `glue:startJobRun` rend la main dès le démarrage de la tâche, et l'état suivant s'exécute sur des données incomplètes. « Attendre la fin de la tâche Glue avant d'interroger » : intégration `.sync`, pas un état Wait d'une durée estimée.

<!-- section: troubleshoot-workflows | objectives: 3.1.2 -->
## Dépanner les flux de travail gérés

**Step Functions.** L'historique d'exécution (90 jours pour Standard) montre l'entrée, la sortie et l'erreur de chaque état. Les erreurs ont un nom : `States.ALL` (toutes), `States.TaskFailed`, `States.Timeout` (`TimeoutSeconds` dépassé ou `HeartbeatSeconds` manqué), `States.Permissions`, ou l'erreur du service. Un bloc `Retry` définit `ErrorEquals`, `IntervalSeconds`, `MaxAttempts` et `BackoffRate` ; `Catch` envoie l'erreur vers un état de repli ; `ResultPath` conserve l'entrée d'origine à côté de l'erreur. Les flux de travail Express ne gardent leur historique que dans CloudWatch Logs : activez-y la journalisation.

**Amazon MWAA.** Activez les types de journaux Airflow (traitement des DAG, planificateur, tâche, serveur web, worker), chacun avec un niveau, dans des groupes de journaux CloudWatch Logs nommés `airflow-<environment>-<type>`.

| Symptôme | Cause habituelle |
| --- | --- |
| DAG absent de l'interface | Fichier hors de `dags/` dans le compartiment, ou erreur d'import Python (journaux de traitement des DAG) |
| Mise à jour de l'environnement en échec ou très longue | Conflit dans `requirements.txt` : figer les versions avec le fichier de contraintes Airflow ; lire le journal d'installation des dépendances |
| Une tâche échoue en appelant un service | Autorisation absente du rôle d'exécution, ou sous-réseaux privés sans passerelle NAT ni points de terminaison d'un VPC pour S3, CloudWatch Logs, SQS et KMS |
| Tâches longtemps en file d'attente | Nombre maximal de workers trop bas ou limites de concurrence ; augmenter le maximum de workers ou la classe d'environnement |
| Interface Airflow inaccessible | Serveur web privé : accès uniquement depuis le VPC (VPN, bastion) |

> **Conseil d'examen.** L'échec d'une tâche Glue dans un flux de travail s'examine dans les journaux et métriques de la tâche elle-même ; l'orchestrateur indique seulement que l'étape a échoué et son message d'erreur.

<!-- section: sdk-calls | objectives: 3.1.3 -->
## Appeler les kits SDK AWS depuis le code

Le code de données appelle AWS par un SDK (boto3 en Python, AWS SDK for Java...). L'examen teste les modèles, pas la syntaxe :

- Les **informations d'identification** viennent du rôle du calcul (rôle d'exécution Lambda, rôle de la tâche Glue, profil d'instance EC2), jamais de clés dans le code.
- Les **API asynchrones** renvoient un ID et demandent une interrogation périodique ou un waiter : `StartQueryExecution` d'Athena, `StartJobRun` de Glue, `ExecuteStatement` de la Redshift Data API, `AddJobFlowSteps` d'EMR.
- Les **paginateurs** lisent toutes les pages d'une liste ou d'un résultat (`NextToken`) ; un seul appel ne renvoie que la première page.
- Les **nouvelles tentatives avec backoff exponentiel** gèrent la limitation (throttling) (`ThrottlingException`, `ProvisionedThroughputExceededException`) ; modes de nouvelle tentative du SDK `standard` et `adaptive`.

```python
import time
import boto3
from botocore.config import Config

athena = boto3.client("athena", config=Config(retries={"mode": "adaptive", "max_attempts": 10}))

run = athena.start_query_execution(
    QueryString="SELECT store_id, SUM(amount) FROM curated.sales WHERE sale_date = ? GROUP BY store_id",
    ExecutionParameters=["'2026-11-21'"],
    WorkGroup="analysts",
)
query_id = run["QueryExecutionId"]

while True:
    status = athena.get_query_execution(QueryExecutionId=query_id)["QueryExecution"]["Status"]["State"]
    if status in ("SUCCEEDED", "FAILED", "CANCELLED"):
        break
    time.sleep(2)

for page in athena.get_paginator("get_query_results").paginate(QueryExecutionId=query_id):
    for row in page["ResultSet"]["Rows"]:
        print([col.get("VarCharValue") for col in row["Data"]])
```

La **Redshift Data API** exécute du SQL en HTTPS sans pilote ni connexion persistante, avec Secrets Manager ou des informations d'identification IAM temporaires, sur les clusters provisionnés et les groupes de travail Serverless ; les résultats sont conservés 24 heures.

```bash
aws redshift-data execute-statement \
  --workgroup-name analytics \
  --database dev \
  --sql "CALL refresh_daily_sales()" \
  --with-event
```

> **Conseil d'examen.** « Une fonction Lambda doit exécuter du SQL Redshift sans gérer de connexions ni de pilotes » : Redshift Data API.

<!-- section: service-features | objectives: 3.1.4 -->
## Utiliser les fonctionnalités des services pour traiter les données

| Service | Fonctionnalités utilisées à l'examen |
| --- | --- |
| **AWS Glue** | Tâches Spark, streaming et Python shell ; types de workers G.1X à G.16X et R.1X à R.8X optimisés pour la mémoire (DPU = 4 vCPU, 16 Go) ; exécution **Flex** pour les tâches non urgentes (Glue 3.0+, G.1X ou G.2X) à moindre coût ; signets de tâche (job bookmarks) pour les exécutions incrémentielles ; Auto Scaling ; délai d'expiration (480 minutes par défaut depuis Glue 5.0, 2 880 avant), nouvelles tentatives de 0 à 10, exécutions simultanées maximales (1 par défaut) |
| **Amazon EMR** | Étapes (steps) sur clusters EC2 (clusters transitoires qui s'arrêtent après leurs étapes), mise à l'échelle gérée, nœuds de tâche Spot, applications EMR Serverless, EMR on EKS |
| **Amazon Redshift** | `COPY` parallèle depuis S3, `UNLOAD` vers S3 en Parquet, procédures stockées, vues matérialisées à actualisation automatique, requêtes planifiées, ingestion en streaming depuis Kinesis ou MSK, intégrations zero-ETL |
| **Amazon Athena** | CTAS et `INSERT INTO` pour transformer en SQL, `MERGE` sur Iceberg, `UNLOAD` |

> **Piège d'examen.** Une tâche Glue qui échoue quand l'exécution précédente est encore active lève une erreur de dépassement des exécutions simultanées : augmentez la concurrence maximale de la tâche ou sérialisez les exécutions, n'ajoutez pas de workers.

<!-- section: data-apis | objectives: 3.1.5 -->
## Consommer et maintenir des API de données

**Consommer** une API externe (SaaS, partenaire, service interne) dans un pipeline :

- Respecter les limites de débit : backoff sur HTTP 429, suivre les jetons de pagination, demander des fenêtres incrémentielles (`updated_since`) plutôt que des extractions complètes.
- Stocker les clés d'API et les secrets OAuth dans Secrets Manager et les faire tourner.
- Pour les sources SaaS prises en charge (Salesforce, ServiceNow, Zendesk, SAP OData...), **Amazon AppFlow** copie les données vers S3 ou Redshift selon une planification, sur un événement ou à la demande, sans code.

**Maintenir** une API qui expose des données :

- **API Gateway** devant Lambda ou des intégrations directes de services (DynamoDB, Step Functions) ; limitation et plans d'utilisation avec une clé d'API par consommateur ; cache pour les lectures répétées ; étapes (stages) et versions pour que les changements ne cassent pas les clients ; validation des requêtes.
- Renvoyer des résultats paginés et limiter la taille des pages ; servir les grosses extractions par des URL présignées S3, pas dans le corps de la réponse.
- La Redshift Data API et l'API Athena exposent déjà le SQL sous forme d'API pour les consommateurs internes.

> **Conseil d'examen.** « Ingérer chaque jour des objets Salesforce dans S3 avec le moins de développement » : Amazon AppFlow, pas une fonction Lambda qui appelle l'API Salesforce.

<!-- section: data-preparation | objectives: 3.1.6 -->
## Préparer les données pour la transformation

**AWS Glue DataBrew** est la préparation visuelle sans code destinée aux analystes : un **jeu de données (dataset)** pointe vers les données (S3, catalogue de données, bases de données), un **projet** en ouvre un échantillon dans une grille, les transformations (plus de 250 : fractionner, pivoter, remplacer les valeurs manquantes, normaliser les formats, masquer les PII) sont enregistrées dans une **recette (recipe)** réutilisable, et une **tâche de recette (recipe job)** applique la recette au jeu de données complet et écrit dans S3 selon une planification. Une **tâche de profil (profile job)** calcule statistiques de colonnes, distributions, corrélations et contrôles de qualité des données.

**Amazon SageMaker Unified Studio** réunit les outils de données et d'IA dans des **projets** au sein d'un **domaine** : flux Visual ETL (Glue Spark), blocs-notes JupyterLab sur calcul Glue, EMR ou Athena Spark, éditeur de requêtes SQL pour Athena et Redshift, et flux de travail, le tout sur des données du catalogue gouvernées par SageMaker Catalog.

| Exigence | Réponse |
| --- | --- |
| Des analystes nettoient visuellement des fichiers CSV et rejouent les mêmes étapes chaque jour | Recette DataBrew et tâche de recette planifiée |
| Ingénieurs de données et data scientists partagent données, blocs-notes et ETL dans un espace gouverné unique | Projet SageMaker Unified Studio |
| Transformation complexe, en code, à grande échelle | Tâche Spark Glue ou EMR |

> **Piège d'examen.** Les projets DataBrew travaillent sur un échantillon ; seule une tâche de recette traite les données complètes. « Le résultat ne contient que 500 lignes » : la recette n'a jamais été exécutée par une tâche.

<!-- section: athena-queries | objectives: 3.1.7 -->
## Interroger les données avec Amazon Athena

Athena est un moteur SQL sans serveur (Trino) sur des données décrites dans le catalogue de données Glue, facturé à l'octet analysé avec un minimum de 10 Mo par requête, ou par **réservations de capacité** (DPU dédiées, 4 au minimum, jusqu'à 20 groupes de travail par réservation).

| Fonctionnalité | Usage |
| --- | --- |
| **Groupes de travail (workgroups)** | Séparer les équipes : emplacement et chiffrement des résultats, limite de données analysées par requête, alarmes d'utilisation de données du groupe, « remplacer les paramètres côté client » |
| **Réutilisation des résultats de requête** | Renvoyer le résultat précédent d'une requête identique (60 minutes par défaut, jusqu'à 7 jours) ; pas pour les tables à autorisations fines Lake Formation |
| **Requêtes paramétrées** | Espaces réservés `?` avec `ExecutionParameters`, ou instructions préparées : réutiliser une requête en sécurité |
| CTAS, `INSERT INTO`, `UNLOAD` | Écrire les résultats en Parquet ou ORC dans S3, partitionnés |
| **Requêtes fédérées** | Des connecteurs de sources de données (fonctions Lambda) interrogent DynamoDB, RDS, Redshift et d'autres sur place |
| DML Iceberg | `UPDATE`, `DELETE`, `MERGE INTO`, `OPTIMIZE`, `VACUUM` |

> **Conseil d'examen.** « Empêcher qu'une requête d'analyste analyse plus de 1 To » : contrôle d'utilisation des données par requête sur le groupe de travail, imposé en remplaçant les paramètres côté client.

<!-- section: lambda-processing | objectives: 3.1.8 -->
## Automatiser le traitement avec AWS Lambda

Lambda exécute du code sur des événements : 128 Mo à 10 240 Mo de mémoire, `/tmp` jusqu'à 10 240 Mo, délai d'expiration jusqu'à 30 minutes (1 800 secondes), charges utiles de 6 Mo en synchrone et 1 Mo en asynchrone. Elle convient au travail par fichier et par lot ; les transformations longues ou lourdes relèvent de Glue ou d'EMR.

| Déclencheur | Mécanisme |
| --- | --- |
| Objet S3 créé | S3 Event Notifications ou EventBridge appellent la fonction de façon asynchrone |
| Kinesis, DynamoDB Streams, MSK, SQS | Un **mappage de source d'événements** interroge la source et appelle la fonction par lots |
| Planification | EventBridge Scheduler |
| Step Functions ou API Gateway | Appel direct |

Mappages Kinesis et DynamoDB Streams : taille de lot (100 par défaut, jusqu'à 10 000), fenêtre de traitement par lots jusqu'à 5 minutes, facteur de parallélisation de 1 à 10 par shard (ordre conservé par clé de partition), position de départ `TRIM_HORIZON`, `LATEST` ou `AT_TIMESTAMP`, et gestion des erreurs par division du lot en cas d'erreur (bisect), nombre maximal de nouvelles tentatives, âge maximal des enregistrements, destination en cas d'échec (SQS ou SNS) et `ReportBatchItemFailures`.

```yaml
  ClickProcessor:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: python3.13
      Timeout: 120
      Events:
        Clicks:
          Type: Kinesis
          Properties:
            Stream: !GetAtt ClickStream.Arn
            StartingPosition: LATEST
            BatchSize: 500
            MaximumBatchingWindowInSeconds: 10
            ParallelizationFactor: 2
            BisectBatchOnFunctionError: true
            MaximumRetryAttempts: 3
            FunctionResponseTypes:
              - ReportBatchItemFailures
            DestinationConfig:
              OnFailure:
                Destination: !GetAtt FailedClicksQueue.Arn
```

> **Piège d'examen.** Avec les valeurs par défaut (nouvelles tentatives infinies, pas d'âge maximal), un enregistrement défectueux bloque son shard jusqu'à son expiration, et `IteratorAge` ne cesse d'augmenter. Définissez les nouvelles tentatives, la division du lot, un âge maximal et une destination en cas d'échec.

<!-- section: events-schedulers | objectives: 3.1.9 -->
## Gérer les événements et les planificateurs avec EventBridge

Les **règles d'événements** filtrent les événements d'un bus d'événements et les envoient à des cibles (Step Functions, Lambda, SNS, SQS, flux de travail Glue...). Les services AWS publient leurs changements d'état : changement d'état d'une tâche Glue (`SUCCEEDED`, `FAILED`, `TIMEOUT`, `STOPPED`), d'un robot d'analyse Glue, d'une exécution Step Functions, des étapes et clusters EMR, et événements d'objets S3 une fois **EventBridge activé sur le compartiment** (tous les événements S3 sont alors envoyés, filtrés par des règles sur le compartiment, le préfixe ou la taille).

**EventBridge Scheduler** exécute des millions de planifications ponctuelles, à intervalle (rate) ou cron, avec un **fuseau horaire**, une **fenêtre horaire flexible**, des nouvelles tentatives et une file d'attente de lettres mortes, vers plus de 270 services grâce aux cibles universelles. C'est le remplaçant recommandé des règles planifiées.

```bash
aws scheduler create-schedule \
  --name nightly-sales-pipeline \
  --schedule-expression "cron(30 2 * * ? *)" \
  --schedule-expression-timezone "Europe/Paris" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{"Arn": "arn:aws:states:eu-west-1:111122223333:stateMachine:sales-pipeline", "RoleArn": "arn:aws:iam::111122223333:role/scheduler-start-pipeline"}'
```

| Exigence | Réponse |
| --- | --- |
| Démarrer le pipeline à l'arrivée d'un fichier, avec filtre sur le suffixe et plusieurs cibles | S3 vers une règle EventBridge |
| Exécuter à 2 h 30 heure locale, heure d'été comprise | EventBridge Scheduler avec un fuseau horaire |
| Lancer un robot d'analyse après le succès d'une tâche Glue, uniquement dans Glue | Déclencheur conditionnel d'un flux de travail Glue |
| Archiver des événements et les rejouer après une correction | Archive et relecture (replay) EventBridge |

> **Conseil d'examen.** Les expressions cron d'EventBridge ont six champs et utilisent `?` pour le jour du mois ou le jour de la semaine : `cron(30 2 * * ? *)`.

<!-- section: key-points -->
## Points clés

- Step Functions Standard pour les pipelines natifs AWS (`.sync`, Retry, Catch) ; Express pour le travail court en gros volume ; MWAA pour les DAG Airflow ; MWAA Serverless pour Airflow sans environnement.
- Dépanner Step Functions avec l'historique d'exécution et les noms d'erreur ; MWAA avec ses types de journaux CloudWatch, `requirements.txt`, le rôle d'exécution et les points de terminaison d'un VPC.
- Code SDK : informations d'identification du rôle, interrogation ou waiters pour les API asynchrones, paginateurs, backoff ; Redshift Data API plutôt que des pilotes.
- Glue Flex pour les tâches non urgentes, signets pour les exécutions incrémentielles ; clusters EMR transitoires ; `COPY`, `UNLOAD` et vues matérialisées Redshift.
- AppFlow pour l'ingestion SaaS ; limitation, plans d'utilisation et cache d'API Gateway pour servir les données.
- Recettes et tâches DataBrew pour la préparation visuelle ; SageMaker Unified Studio pour les projets partagés.
- Groupes de travail Athena, réutilisation des résultats, requêtes paramétrées, CTAS et requêtes fédérées.
- Lambda jusqu'à 30 minutes ; mappages de source d'événements avec division du lot, nouvelles tentatives et destinations en cas d'échec.
- Règles EventBridge pour les événements, EventBridge Scheduler pour les fuseaux horaires et les fenêtres flexibles.
