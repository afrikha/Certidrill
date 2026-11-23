Le DEA-C01 vérifie que vous savez construire et exploiter des pipelines de données sur AWS. Une question type décrit les sources d'une entreprise (bases de données, fichiers déposés dans Amazon S3, un flux de clics, une application SaaS), leur volume et leur rythme d'arrivée, ce que les données doivent subir et qui les interrogera, puis demande le service, le paramètre ou la correction qui atteint un objectif de coût, de latence ou d'effort. Vous n'écrivez jamais de programme complet, mais vous lirez de courts extraits SQL, PySpark, JSON et AWS CLI. Ce chapitre présente le format, une méthode de lecture, la façon d'aborder le code dans un énoncé, les services dont le nom ou le statut a changé, les familles d'options à distinguer et un plan de travail.

<!-- section: exam-format -->
## Format et notation

| Élément | Valeur |
| --- | --- |
| Certification | AWS Certified Data Engineer – Associate |
| Guide d'examen | DEA-C01, version 1.1 du 12 décembre 2025 ; aucun successeur annoncé en novembre 2026 |
| Durée | 130 minutes |
| Questions | 65, dont 15 non notées et non signalées |
| Score | Échelle de 100 à 1 000 ; 720 pour réussir |
| Modèle de notation | Compensatoire : un domaine faible peut être compensé par un domaine fort |
| Réponses au hasard | Une question sans réponse est fausse et une mauvaise réponse ne coûte rien de plus : répondez à tout |
| Langues | Anglais, japonais, coréen et chinois simplifié ; il n'existe pas de version française |
| Prix | 150 USD |

| Domaine | Poids | Module du cours |
| --- | --- | --- |
| Ingestion et transformation des données | 34 % | Chapitres 11 à 14 |
| Gestion des magasins de données | 26 % | Chapitres 21 à 24 |
| Opérations et support des données | 22 % | Chapitres 31 à 34 |
| Sécurité et gouvernance des données | 18 % | Chapitres 41 à 45 |

Il existe deux formats. Une question à **choix multiple** a quatre options et une seule réponse ; c'est la majorité de l'examen. Une question à **réponse multiple** se termine par « Choose two. » (cinq options) ou « Choose three. » (six options) et ne rapporte le point que si toute la sélection est juste. Il n'y a ni laboratoire, ni étude de cas, ni glisser-déposer, ni série Oui/Non.

Le guide exclut du périmètre l'entraînement et l'inférence de modèles de machine learning, la syntaxe propre à un langage et les conclusions métier tirées des données : on vous demande de déplacer, mettre en forme, stocker, sécuriser et surveiller les données, pas de les interpréter.

> **Conseil d'examen.** Les examens blancs Certidrill notent les 65 questions, car vous ne pouvez pas savoir lesquelles l'examen réel ignore. Comptez deux minutes par question et marquez les longues questions de code pour un second passage.

<!-- section: reading-questions -->
## Une méthode pour les questions de pipeline

Les énoncés comptent deux à cinq phrases. Avant de lire les options, relevez cinq faits :

1. **Source et format** : une base RDS, des fichiers CSV, des événements JSON, une rubrique (topic) Kafka, une API SaaS.
2. **Volume et débit** : « 2 To chaque nuit », « 50 000 événements par seconde », « quelques fichiers par jour ».
3. **Latence** : chaque nuit, toutes les heures, « en quelques minutes », « en quasi temps réel », « en moins d'une seconde ».
4. **Consommateur** : des analystes dans Amazon Athena, un tableau de bord Redshift, une application en aval, une alerte.
5. **Qualificatif** : la formule qui classe deux réponses valables.

Barrez ensuite chaque option qui manque un fait, puis appliquez le qualificatif à ce qui reste.

| Qualificatif | Ce qu'il désigne en général |
| --- | --- |
| « LEAST operational overhead » (le moins de charge opérationnelle) | Un service géré ou sans serveur doté d'une fonctionnalité intégrée : Amazon Data Firehose plutôt qu'une flotte de consommateurs, AWS Glue plutôt qu'un cluster Spark autogéré, EventBridge Scheduler plutôt qu'un cron sur EC2 |
| « MOST cost-effective » (le plus rentable) | Formats en colonnes, partitionnement, tâches Glue flex, capacité Spot pour un travail interruptible, classes de stockage S3, traitement par lots plutôt que streaming quand la latence le permet |
| « near real time » (quasi temps réel) | Mise en mémoire tampon de Firehose, Kinesis Data Streams avec Lambda, ingestion en streaming Redshift ; jamais une tâche nocturne |
| « without managing servers » (sans gérer de serveurs) | Lambda, Glue, Athena, Redshift Serverless, EMR Serverless, Step Functions, MWAA Serverless |
| « reprocess » ou « replay » (retraiter, relire) | Un stockage qui conserve les données : rétention Kinesis, rétention Kafka, archive EventBridge, objets bruts dans S3 |
| « minimal code changes » (modifications minimales du code) | La configuration d'un service existant, ou la version gérée de l'outil déjà utilisé (Amazon MSK pour Kafka, Amazon MWAA pour Airflow) |
| « least privilege » ou « only approved users » (moindre privilège, utilisateurs approuvés) | Rôles IAM limités aux ressources, autorisations Lake Formation, politiques de clé KMS |

> **Piège d'examen.** Deux options ne diffèrent souvent que par la latence. « Charger les données de flux de clics dans Amazon S3 en moins de 5 minutes » est satisfait par Firehose avec un intervalle de mise en mémoire tampon court ; une tâche Glue exécutée toutes les heures manque l'exigence, même si elle coûte moins cher.

<!-- section: code-in-questions -->
## Lire le code d'une question

Le code apparaît dans l'énoncé ou dans les options. Cherchez-y un détail décisif plutôt que de le lire ligne à ligne :

| Extrait | Ce qu'il faut chercher |
| --- | --- |
| SQL Athena ou Redshift | La clause `WHERE` sur une colonne de partition, `format` et `partitioned_by` dans un `CREATE TABLE AS`, `IAM_ROLE` et `FORMAT AS PARQUET` dans un `COPY`, `AUTO REFRESH` sur une vue matérialisée |
| Script PySpark ou Glue | `transformation_ctx` et `job.commit()` (signets de tâche), `groupFiles` (petits fichiers), `repartition` ou `coalesce` (nombre de fichiers en sortie), un `collect()` qui ramène les données sur le pilote (driver) |
| Politique JSON | `Effect`, `Action`, `Resource` et `Condition` ; un `Deny` l'emporte toujours sur un `Allow` |
| Définition Step Functions | Le suffixe de ressource `.sync` ou `.waitForTaskToken`, les blocs `Retry` et `Catch` |
| AWS CLI | Le paramètre qui change le comportement, par exemple `--parallelization-factor` ou `--schedule-expression` |

Un énoncé type montre un court script et demande pourquoi chaque exécution retraite tous les fichiers :

```python
source = glueContext.create_dynamic_frame.from_catalog(
    database="sales_raw", table_name="orders")
# ... transformations ...
glueContext.write_dynamic_frame.from_options(
    frame=source, connection_type="s3",
    connection_options={"path": "s3://example-curated/orders/"},
    format="parquet")
```

La source n'a pas de `transformation_ctx` et le script n'appelle jamais `job.commit()` : un signet de tâche (job bookmark) ne peut donc pas enregistrer la progression, quel que soit le paramètre de la tâche.

<!-- section: service-status -->
## Noms et services qui ont changé

Le guide emploie encore d'anciens noms, et plusieurs services du périmètre ont été fermés ou retirés avant novembre 2026. Certidrill ne fait jamais d'un service fermé la bonne réponse pour une nouvelle conception :

| Service | Statut en novembre 2026 |
| --- | --- |
| Amazon Kinesis Data Firehose | Désormais **Amazon Data Firehose** ; même service |
| Kinesis Data Analytics for SQL | Arrêté le 27 janvier 2026 ; utilisez **Amazon Managed Service for Apache Flink** |
| Amazon QuickSight | Intégré à **AWS Quick**, dont la fonctionnalité de BI est Quick Sight |
| AWS CloudTrail Lake | Fermé aux nouveaux clients depuis le 31 mai 2026 ; AWS recommande Amazon CloudWatch |
| AWS Data Pipeline | Fermé aux nouveaux clients, en maintenance ; utilisez Step Functions, MWAA ou les flux de travail Glue |
| Tâches AWS Glue Ray | En maintenance, pas de nouveaux clients ; utilisez des tâches Glue Spark ou Python shell |
| Amazon S3 Select et S3 Glacier Select | En maintenance, pas de nouveaux clients ; interrogez avec Athena |
| Amazon Kendra, Amazon Q Business, Timestream for LiveAnalytics, coffres S3 Glacier | En maintenance, pas de nouveaux clients |
| AWS Snowball Edge, Lake Formation Governed Tables, Amazon QLDB | Arrêtés |
| Amazon Q Developer | Inscriptions fermées le 15 mai 2026 ; le successeur est Kiro |
| SageMaker Data Wrangler | Désormais intégré à SageMaker Canvas |

<!-- section: confusing-pairs -->
## Les familles d'options à distinguer

| Famille | Options | Différence décisive |
| --- | --- | --- |
| Streaming | Kinesis Data Streams, Data Firehose, Amazon MSK, Amazon SQS | Un flux conservé et relisible, lu par vos consommateurs ; une livraison gérée vers une destination avec mise en mémoire tampon et conversion de format ; la compatibilité Apache Kafka ; une file de travail dont les messages disparaissent une fois traités |
| Transformation | Lambda, Glue, EMR, SQL Redshift | Travail court par événement ou par fichier ; Spark sans serveur avec le catalogue de données ; contrôle complet des frameworks open source à grande échelle ; SQL sur des données déjà dans l'entrepôt |
| Orchestration | Step Functions, MWAA, flux de travail Glue, EventBridge | Machine d'état sans serveur pour les services AWS ; DAG Apache Airflow ; chaînes de tâches et de robots d'analyse Glue uniquement ; routage d'événements et planifications, sans état de flux de travail |
| Interroger S3 | Athena, Redshift Spectrum, S3 Select | SQL sans serveur facturé aux données analysées ; données S3 jointes aux tables de l'entrepôt depuis Redshift ; fermé aux nouveaux clients |
| Capture des modifications (CDC) | AWS DMS, intégrations zero-ETL, DynamoDB Streams | Réplication depuis de nombreux moteurs avec chargement complet et CDC ; réplication gérée de sources prises en charge vers Redshift sans pipeline ; modifications d'éléments d'une table DynamoDB pendant 24 heures |
| Contrôle d'accès | Politiques IAM, politiques de compartiment S3, Lake Formation | Qui peut appeler quelle API ; qui peut atteindre un compartiment ; autorisations sur tables, colonnes, lignes et LF-tags du lac de données |
| Qualité et préparation des données | Glue Data Quality, Glue DataBrew | Règles évaluées dans les pipelines et sur les tables du catalogue ; recettes de nettoyage visuelles, sans code |
| Données sensibles | Amazon Macie, filtres de données Lake Formation | Découvre les données personnelles dans S3 ; restreint ce que voit un utilisateur autorisé |

<!-- section: study-plan -->
## Comment se préparer

1. Suivez les chapitres dans l'ordre : l'ingestion et la transformation pèsent un tiers de l'examen et donnent le vocabulaire des autres domaines.
2. Construisez un pipeline de bout en bout dans un compte de test : des fichiers arrivent dans S3, un événement S3 lance une tâche Glue qui écrit du Parquet, un robot d'analyse met à jour le catalogue de données, Athena interroge le résultat, et Step Functions avec une alerte SNS orchestre l'ensemble.
3. Apprenez les chiffres qui décident des réponses : débit et rétention d'une partition Kinesis, paramètres du mappage de source d'événements Lambda, mise en mémoire tampon de Firehose, rétention de DynamoDB Streams, dimensionnement des fichiers pour le COPY Redshift.
4. Passez un examen blanc après chaque module et relisez les sections liées à chaque erreur, y compris la raison pour laquelle chaque distracteur échoue.
5. Réservez l'examen quand trois examens blancs consécutifs, sur des questions jamais vues, atteignent 800 ou plus.
