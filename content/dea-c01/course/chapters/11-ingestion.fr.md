Les questions d'ingestion fournissent une source, un débit et une échéance, et demandent comment faire entrer les données dans AWS de façon fiable avec le moins d'effort. Déterminez d'abord si les données arrivent en flux ou par lots, puis ce qui déclenche chaque chargement (une planification, un événement, un consommateur qui interroge la source), et enfin le comportement en cas d'échec qui compte dans l'énoncé : limitation (throttling), doublons, relecture ou perte d'état.

<!-- section: streaming-sources | objectives: 1.1.1 -->
## Lire à partir de sources de streaming

| Source | Lecture des données | Faits qui décident des réponses |
| --- | --- | --- |
| Amazon Kinesis Data Streams | Des consommateurs (Lambda, Firehose, Managed Service for Apache Flink, tâches Glue de streaming, applications KCL) lisent chaque partition (shard) dans l'ordre | Par partition : écriture 1 Mo/s ou 1 000 enregistrements/s, lecture 2 Mo/s partagés par les consommateurs standard ; conservation de 24 heures à 365 jours ; enregistrements jusqu'à 10 Mio |
| Amazon MSK | Groupes de consommateurs Kafka, mappage de source d'événements Lambda, MSK Connect, Firehose, tâches Glue de streaming | API et décalages (offsets) Kafka ; les clients Kafka existants continuent de fonctionner |
| DynamoDB Streams | Mappage de source d'événements Lambda ou adaptateur Kinesis de DynamoDB Streams | Modifications d'éléments conservées 24 heures, sans doublon, ordonnées par élément, deux lecteurs au plus par partition ; type de vue (`KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, `NEW_AND_OLD_IMAGES`) figé une fois défini |
| Kinesis Data Streams for DynamoDB | Tout consommateur Kinesis | Conservation jusqu'à un an, davantage de consommateurs, doublons possibles |
| AWS DMS | Chargement complet, chargement complet plus CDC, ou CDC seule, vers des cibles comme Kinesis Data Streams, Apache Kafka, S3 ou Redshift | Exige la journalisation binaire au niveau ligne pour MySQL, la journalisation supplémentaire pour Oracle ou la réplication logique pour PostgreSQL ; la CDC n'a pas de SLA de latence |
| ETL de streaming AWS Glue | Spark Structured Streaming sur Kinesis, Kafka ou MSK, avec écriture vers S3 ou des magasins JDBC | Fenêtres de 100 secondes par défaut ; points de contrôle (checkpoints), pas de signets de tâche ; facturé à l'heure pendant l'exécution |
| Ingestion en streaming Amazon Redshift | Une vue matérialisée lit directement Kinesis Data Streams ou MSK | Pas de transit par S3 ; actualisation manuelle ou avec `AUTO REFRESH YES` |

L'ingestion en streaming dans Redshift exige un schéma externe associé au service de flux et une vue matérialisée par flux :

```sql
CREATE EXTERNAL SCHEMA kds
FROM KINESIS
IAM_ROLE 'arn:aws:iam::111122223333:role/redshift-streaming-role';

CREATE MATERIALIZED VIEW clicks_mv AUTO REFRESH YES AS
SELECT approximate_arrival_timestamp,
       partition_key,
       JSON_PARSE(kinesis_data) AS payload
FROM kds."web-clicks"
WHERE CAN_JSON_PARSE(kinesis_data);
```

> **Piège d'examen.** Quand trois équipes doivent consommer les modifications d'une table DynamoDB, ou qu'une équipe doit retraiter celles de la semaine précédente, DynamoDB Streams (deux lecteurs par partition, 24 heures) est faux : activez Kinesis Data Streams for DynamoDB.

<!-- section: batch-sources | objectives: 1.1.2, 1.1.3 -->
## Sources par lots et leur configuration

| Source | Lecteur type | Configuration qui compte |
| --- | --- | --- |
| Fichiers dans Amazon S3 | Tâche Glue sur une table du catalogue de données, étape EMR, Athena, `COPY` Redshift | Préfixes de partition, format et taille des fichiers, signets de tâche |
| Base de données relationnelle | Tâche Glue avec une connexion JDBC, chargement complet DMS | Clés de signet, taille de récupération (fetch size), identifiants dans Secrets Manager |
| Amazon Redshift | `UNLOAD` vers S3, Redshift Data API | Sortie Parquet, rôle IAM associé au cluster |
| Application SaaS | Flux Amazon AppFlow, à la demande, planifié ou sur événement, vers S3 ou Redshift | Connecteur, transfert privé avec AWS PrivateLink quand il est pris en charge |
| Petite source personnalisée | Fonction Lambda lancée par une planification | Limites de charge utile et de durée, écritures idempotentes |

Les paramètres Glue les plus testés :

- Les **signets de tâche** (job bookmarks : `job-bookmark-enable`, `-disable`, la valeur par défaut, ou `-pause`) font traiter à une exécution les seules nouvelles données : objets S3 selon leur date de modification, lignes JDBC selon des clés de signet (par défaut une clé primaire qui ne fait que croître ou décroître, sans trou). Chaque source a besoin d'un `transformation_ctx` et le script doit appeler `job.commit()`. Réinitialiser (`aws glue reset-job-bookmark`) ou revenir en arrière retraite les données mais ne supprime pas la sortie existante.
- **Regroupement de fichiers** : `groupFiles` à `inPartition`, avec un `groupSize` facultatif en octets, regroupe de petits fichiers CSV ou JSON en tâches plus grosses ; automatique au-delà de 50 000 fichiers ; sans effet sur Parquet, ORC ou Avro.
- **Workers** : G.1X a 4 vCPU et 16 Go, G.2X le double, jusqu'à G.16X ; les types R sont optimisés pour la mémoire.

```python
orders = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={"paths": ["s3://example-landing/orders/"],
                        "recurse": True,
                        "groupFiles": "inPartition",
                        "groupSize": "134217728"},
    format="json",
    transformation_ctx="orders_src")
# ... mappings and writes ...
job.commit()
```

Pour le `COPY` Redshift, chargez directement du Parquet ou de l'ORC, ou découpez le CSV et le JSON compressés en fichiers de taille voisine, de 1 Mo à 1 Go après compression, en nombre multiple des tranches (slices) du cluster, chargés par un seul `COPY`.

<!-- section: data-apis | objectives: 1.1.4 -->
## Consommer des API de données

| Exigence | Solution |
| --- | --- |
| Données d'une application SaaS prise en charge (Salesforce, ServiceNow, Zendesk, Slack...) sans code | Flux Amazon AppFlow planifié ou sur événement |
| Une API REST sans connecteur, interrogée toutes les quelques minutes | Lambda lancée par EventBridge Scheduler, qui gère la pagination et les HTTP 429 avec backoff, et écrit dans S3 ou Firehose |
| Une longue extraction depuis une API | Tâche Glue Python shell ou tâche de conteneur, orchestrée par Step Functions |
| Identifiants de l'API | AWS Secrets Manager, lu à l'exécution grâce au rôle IAM |
| Une fonction dans un VPC doit atteindre une API publique | Sous-réseau privé routé vers une passerelle NAT |

Le sens inverse, pousser des événements vers le point de terminaison HTTPS d'un partenaire, est une **destination d'API EventBridge** (API destination) : sa connexion conserve l'autorisation dans Secrets Manager, `--invocation-rate-limit-per-second` plafonne les appels, chaque appel doit répondre en 5 secondes, et les échecs sont relancés pendant 24 heures au plus avant une file d'attente de lettres mortes.

<!-- section: schedulers | objectives: 1.1.5 -->
## Planificateurs pour les tâches et les robots d'analyse

| Planificateur | Usage |
| --- | --- |
| EventBridge Scheduler | Planifications rate, cron ou ponctuelles (`at(...)`) dans n'importe quel fuseau horaire IANA, vers presque toute cible |
| Déclencheur Glue planifié | Tâches et robots d'analyse Glue (deux robots au plus par déclencheur) selon une expression cron |
| Planification d'un robot d'analyse | Relancer un robot pour détecter les nouvelles partitions et les changements de schéma |
| Amazon MWAA | DAG Airflow avec planifications, dépendances, relances et rattrapages (backfills) en Python |

Les expressions cron d'AWS ont six champs : minutes, heures, jour du mois, mois, jour de la semaine, année. Le jour du mois et le jour de la semaine ne peuvent pas valoir `*` tous les deux : l'un d'eux doit être `?`.

```bash
aws scheduler create-schedule --name nightly-orders-load \
  --schedule-expression "cron(30 2 * * ? *)" \
  --schedule-expression-timezone "Europe/Paris" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target '{"Arn": "arn:aws:states:eu-west-3:111122223333:stateMachine:orders-load",
             "RoleArn": "arn:aws:iam::111122223333:role/scheduler-invoke-sfn"}'
```

> **Conseil d'examen.** « S'exécuter à 2 h 30 heure locale toute l'année » est une expression cron avec un fuseau horaire. `rate(1 days)` est un intervalle fixe de 24 heures, et un cron en UTC se décale d'une heure aux changements d'heure.

<!-- section: event-triggers | objectives: 1.1.6 -->
## Déclencheurs d'événements

| Mécanisme | Comportement |
| --- | --- |
| S3 Event Notifications | Types d'événements choisis vers SNS, des files SQS standard ou Lambda, filtrés par préfixe et suffixe de clé ; les filtres d'un même type d'événement ne peuvent pas se chevaucher |
| Événements S3 vers EventBridge | Une fois activé sur le compartiment, chaque événement arrive sur le bus par défaut ; des règles filtrent sur n'importe quel champ et alimentent plusieurs cibles, dont des files SQS FIFO, Step Functions et les flux de travail Glue |
| Déclencheur EventBridge d'un flux de travail Glue | Démarre quand une taille de lot ou une fenêtre de lot (900 secondes au plus) est atteinte, selon la première condition remplie |
| DynamoDB Streams, Kinesis, SQS | Les mappages de source d'événements Lambda interrogent la source et appellent la fonction |

Les notifications arrivent au moins une fois, en général en quelques secondes : les consommateurs doivent tolérer les doublons. Une fonction qui écrit dans le compartiment qui la déclenche tourne en boucle : écrivez ailleurs ou filtrez sur un préfixe d'entrée.

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": { "name": ["example-landing"] },
    "object": { "key": [{ "prefix": "invoices/" }] }
  }
}
```

> **Piège d'examen.** S3 Event Notifications ne peut pas cibler une file SQS FIFO, et deux configurations ne peuvent pas partager un préfixe qui se chevauche pour un même type d'événement. Quand deux pipelines réagissent aux mêmes objets, ou qu'un ordre via FIFO est exigé, passez par EventBridge.

<!-- section: lambda-kinesis | objectives: 1.1.7 -->
## Appeler Lambda à partir de Kinesis

Un **mappage de source d'événements** (event source mapping) interroge chaque partition (une fois par seconde par défaut), forme des lots issus d'une seule partition et appelle la fonction de façon synchrone ; le rôle d'exécution doit pouvoir lire le flux.

| Paramètre | Valeur par défaut et plage | Usage |
| --- | --- | --- |
| `BatchSize` | 100, jusqu'à 10 000 | Plus d'enregistrements par appel ; charge utile d'un lot plafonnée à 6 Mo |
| `MaximumBatchingWindowInSeconds` | 0, jusqu'à 300 | Remplir les lots quand le trafic est faible |
| `StartingPosition` | `TRIM_HORIZON`, `LATEST`, `AT_TIMESTAMP` | Enregistrement le plus ancien, nouveaux enregistrements, ou un instant donné |
| `ParallelizationFactor` | 1 à 10 | Lots simultanés par partition, ordre conservé par clé de partition |
| Consommateur en diffusion améliorée (enhanced fan-out) | Désactivé | 2 Mo/s dédiés par partition en HTTP/2 |
| `BisectBatchOnFunctionError` | false | Scinder un lot en échec pour isoler l'enregistrement fautif |
| `MaximumRetryAttempts` | -1 (jusqu'à expiration), jusqu'à 10 000 | Cesser de relancer un lot empoisonné |
| `MaximumRecordAgeInSeconds` | -1, jusqu'à 604 800 | Ignorer les enregistrements plus anciens |
| Destination en cas d'échec | Aucune | SQS ou SNS reçoivent les métadonnées du lot ; un compartiment S3 reçoit aussi la charge utile |
| `FunctionResponseTypes` | Aucun | `ReportBatchItemFailures` : relancer uniquement à partir du premier enregistrement en échec |

```bash
aws lambda create-event-source-mapping \
  --function-name enrich-clicks \
  --event-source-arn arn:aws:kinesis:eu-west-3:111122223333:stream/web-clicks \
  --starting-position LATEST \
  --batch-size 500 --maximum-batching-window-in-seconds 5 \
  --parallelization-factor 4 \
  --bisect-batch-on-function-error --maximum-retry-attempts 3 \
  --maximum-record-age-in-seconds 3600 \
  --function-response-types ReportBatchItemFailures \
  --destination-config '{"OnFailure": {"Destination": "arn:aws:sqs:eu-west-3:111122223333:clicks-failed"}}'
```

Une erreur de la fonction bloque la partition jusqu'à ce que le lot réussisse ou expire (jusqu'à une semaine avec les valeurs par défaut). La livraison se fait au moins une fois : rendez la fonction idempotente.

> **Piège d'examen.** Un `IteratorAge` qui monte avec une durée de fonction normale signifie que le consommateur est trop lent : augmentez `ParallelizationFactor` ou ajoutez des partitions. Un `IteratorAge` qui monte avec le même lot qui échoue encore et encore signale un enregistrement empoisonné : scission, limite de relances, destination en cas d'échec.

<!-- section: ip-allowlists | objectives: 1.1.8 -->
## Autoriser des adresses IP vers les sources de données

| Connexion | Ce qu'il faut autoriser |
| --- | --- |
| Tâche Glue vers une base de données dans un VPC | Un groupe de sécurité avec une règle entrante autoréférencée (tout TCP depuis lui-même) sur la connexion, l'accès au port de la base, un point de terminaison de passerelle S3 |
| Data Firehose vers Amazon Redshift | Un cluster accessible publiquement dont le groupe de sécurité autorise le bloc CIDR Firehose de la Région (par exemple `52.70.63.192/27` dans us-east-1) |
| Data Firehose vers Splunk | Les blocs CIDR Firehose de la Région pour Splunk, différents de celui de Redshift |
| Data Firehose vers OpenSearch Service dans un VPC | Pas de liste publique : Firehose crée des interfaces réseau dans vos sous-réseaux ; les groupes de sécurité autorisent HTTPS |
| Lambda ou Glue appelle l'API d'un partenaire qui filtre les appelants | L'adresse IP Elastic d'une passerelle NAT |
| Pare-feu sur site qui autorise des services AWS | Plages de `ip-ranges.json` ; dans les groupes de sécurité, listes de préfixes gérées par AWS |

> **Piège d'examen.** Les interfaces réseau de Glue n'ont que des adresses IP privées, même dans un sous-réseau public. Une base de données hors d'AWS doit autoriser l'adresse IP Elastic d'une passerelle NAT, ou être atteinte par VPN ou Direct Connect.

<!-- section: throttling | objectives: 1.1.9 -->
## Limitation et limites de débit

| Service | Symptôme | Corrections |
| --- | --- | --- |
| DynamoDB | `ProvisionedThroughputExceededException`, `WriteThrottleEvents` | Une partition sert au plus 3 000 unités de lecture et 1 000 unités d'écriture par seconde : partitionnement des écritures (write sharding) pour les clés chaudes, mode à la demande ou Auto Scaling, relances du SDK avec backoff |
| Kinesis Data Streams (écriture) | `WriteProvisionedThroughputExceeded` | Clé de partition à forte cardinalité, plus de partitions ou mode à la demande, `PutRecords` (500 enregistrements par appel) ou agrégation KPL, relance des seuls enregistrements en échec |
| Kinesis Data Streams (lecture) | `ReadProvisionedThroughputExceeded` | `GetRecords` accepte 5 appels par seconde et par partition, partagés : diffusion améliorée |
| Amazon RDS | Rafales de connexions depuis Lambda | RDS Proxy mutualise les connexions et met en file ou rejette l'excédent ; réplicas en lecture pour les lectures |
| Lambda | Une fonction submerge une base de données | Simultanéité réservée, simultanéité maximale sur le mappage SQS, une file d'attente en amont |
| API Gateway | HTTP 429 pour les clients | Limitation par étape et par méthode, plans d'utilisation avec clés d'API |
| API tierce | HTTP 429 | Limitation du débit côté client, backoff avec gigue (jitter) |

```python
import boto3
from botocore.config import Config

dynamodb = boto3.client(
    "dynamodb",
    config=Config(retries={"max_attempts": 10, "mode": "adaptive"}))
```

<!-- section: fan-in-fan-out | objectives: 1.1.10 -->
## Convergence et diffusion

La **convergence** (fan-in) réunit de nombreux producteurs dans un seul flux : des appareils écrivent dans un même flux Kinesis ou Firehose, les clés de partition répartissent la charge sur les partitions, et l'agrégation maintient le nombre d'enregistrements sous les limites de partition. La **diffusion** (fan-out) livre les mêmes données à plusieurs consommateurs :

| Besoin | Modèle |
| --- | --- |
| Plusieurs applications à faible latence sur un flux | Diffusion améliorée : jusqu'à 20 consommateurs par flux (50 sur les flux On-demand Advantage), chacun avec 2 Mo/s par partition |
| Quelques consommateurs qui tolèrent un débit partagé | Consommateurs standard qui se partagent 2 Mo/s par partition |
| Un message vers plusieurs files, chacune à son rythme | Rubrique SNS avec abonnements SQS et politiques de filtrage |
| Un événement vers plusieurs services selon son contenu | Règles et cibles EventBridge |
| Une rubrique Kafka, plusieurs applications | Un groupe de consommateurs par application |
| Modifications d'une table vers plus de deux consommateurs | Kinesis Data Streams for DynamoDB |

<!-- section: replayability | objectives: 1.1.11 -->
## Capacité de relecture

Un pipeline est relisible quand des données passées peuvent le traverser à nouveau après la correction d'un bogue ou pour un nouveau consommateur :

| Composant | Capacité de relecture |
| --- | --- |
| Kinesis Data Streams | Conservation jusqu'à 365 jours ; redémarrage à `TRIM_HORIZON` ou `AT_TIMESTAMP` |
| Amazon MSK | Rétention de la rubrique ; les consommateurs réinitialisent leurs décalages |
| Data Firehose | Aucune : conservez les données brutes dans S3 (sauvegarde des enregistrements source quand une transformation est activée) |
| Amazon SQS | Aucune une fois le message supprimé ; la redirection (redrive) depuis la file de lettres mortes ne couvre que les échecs |
| EventBridge | Archive filtrée par un modèle d'événement, conservée indéfiniment par défaut ; relecture d'une plage horaire vers le bus source, pas forcément dans l'ordre, avec un champ `replay-name` |
| Zone brute S3 | Objets bruts immuables avec S3 Versioning, retraités en relançant la tâche |
| Signets de tâche Glue | Réinitialisation ou retour en arrière ; la sortie n'est pas supprimée |
| AWS DMS | Nouvelle tâche CDC à partir d'un horodatage ou d'un point de départ natif (LSN, SCN, position binlog) |

La relecture crée des doublons en aval : écrivez de façon idempotente (clés déterministes, upserts, fusions dans une table Iceberg) ou videz d'abord la partition cible.

<!-- section: stateful-stateless | objectives: 1.1.12 -->
## Transactions avec état et sans état

Une étape **sans état** (stateless) traite chaque enregistrement ou requête isolément (une transformation Firehose, une fonction qui analyse un objet, un appel REST autonome) : elle évolue et se relance n'importe où. Une étape **avec état** (stateful) dépend des données précédentes : comptages par fenêtre, déduplication, sessions, jointures de flux, position atteinte dans une source.

| Besoin | Service et mécanisme d'état |
| --- | --- |
| Agrégations par fenêtre, jointures de flux, résultats exactement une fois | Managed Service for Apache Flink : points de contrôle automatiques (toutes les 60 secondes par défaut), instantanés (snapshots) pour les mises à jour |
| Petits agrégats par partition dans Lambda | Fenêtres bascules (tumbling windows) sur un mappage Kinesis ou DynamoDB Streams : jusqu'à 900 secondes, jusqu'à 1 Mo d'état par partition |
| Progression d'une tâche Spark de streaming | Points de contrôle du streaming Glue |
| Progression d'une tâche par lots | Signets de tâche Glue |
| Déduplication entre appels | Écritures conditionnelles DynamoDB sur un ID d'événement |
| Transaction métier en plusieurs étapes | Flux de travail Step Functions Standard |

```python
def handler(event, context):
    state = event.get("state") or {}
    for record in event["Records"]:
        key = record["kinesis"]["partitionKey"]
        state[key] = state.get(key, 0) + 1
    if event.get("isFinalInvokeForWindow"):
        save_counts(event["window"], state)
        return {"state": {}}
    return {"state": state}
```

> **Conseil d'examen.** « Compter les événements par appareil toutes les 5 minutes avec le moins de charge opérationnelle » : une fenêtre bascule ou Managed Service for Apache Flink, jamais une variable globale dans le gestionnaire d'une fonction Lambda.

<!-- section: key-points -->
## Points clés

- Partition Kinesis : 1 Mo/s ou 1 000 enregistrements/s en entrée, 2 Mo/s en sortie, de 24 heures à 365 jours ; DynamoDB Streams : 24 heures, deux lecteurs par partition.
- Les signets exigent `transformation_ctx` et `job.commit()` ; `groupFiles` règle le problème des nombreux petits fichiers.
- EventBridge Scheduler avec un fuseau horaire ; cron à six champs avec `?`.
- Les événements S3 vers SQS FIFO ou vers plusieurs consommateurs passent par EventBridge.
- Kinesis vers Lambda : parallélisation contre le retard ; scission, limite de relances et destination en cas d'échec contre les enregistrements empoisonnés.
- Firehose vers Redshift : cluster public qui autorise le CIDR Firehose ; Glue : règle de groupe de sécurité autoréférencée.
- La relecture exige une conservation ; Firehose et SQS ne relisent pas.
