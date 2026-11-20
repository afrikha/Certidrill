Au niveau professionnel, une conception pilotée par les événements se juge sur ses garanties, pas sur ses boîtes. Les scénarios SAP-C03 décrivent des comptes ou des Régions qui échangent des événements, un pipeline qui ne doit ni perdre ni compter deux fois des enregistrements, ou un long processus qui doit survivre aux pannes, et demandent quelle combinaison de service de messagerie, de magasin d'état et d'orchestrateur respecte les contraintes d'ordre, de livraison et de durabilité avec le qualificatif énoncé.

<!-- section: messaging-guarantees | objectives: 1.1.1 -->
## Modèles de messagerie : ordre, livraison et idempotence

Cherchez trois propriétés dans l'énoncé : un message peut-il arriver deux fois, l'ordre doit-il être conservé, et combien de consommateurs ont besoin d'une copie.

| Service | Livraison | Ordre | Consommateurs | Relecture |
| --- | --- | --- | --- | --- |
| File d'attente SQS standard | Au moins une fois, doublons occasionnels | Au mieux | Un groupe de consommateurs par file | Non |
| File d'attente SQS FIFO | Traitement exactement une fois : doublons supprimés dans un intervalle de déduplication de 5 minutes | Strict au sein d'un ID de groupe de messages | Un groupe de consommateurs ; un lot en cours par groupe de messages | Non |
| Rubrique SNS standard | Push vers chaque abonnement, nouvelles tentatives selon le protocole | Aucun | Nombreux (diffusion) | Non |
| Rubrique SNS FIFO | Diffusion dédupliquée et ordonnée vers des files SQS | Strict par groupe de messages | Nombreux | Non |
| Bus d'événements EventBridge | Au moins une fois vers chaque cible correspondante, nouvelles tentatives jusqu'à 24 heures et 185 essais par défaut | Aucun | Jusqu'à 5 cibles par règle, nombreuses règles | Archivage et relecture (archive and replay) |
| Kinesis Data Streams | Au moins une fois (les nouvelles tentatives du producteur et du consommateur peuvent dupliquer) | Strict dans une partition (shard), donc par clé de partition | Nombreux consommateurs indépendants | Oui, pendant la rétention (24 heures par défaut, jusqu'à 365 jours) |

L'ordre a toujours une portée. Dans une file SQS FIFO, l'**ID de groupe de messages** est à la fois l'unité d'ordre et l'unité de parallélisme : utilisez l'ID du client ou du compte, jamais une constante. SQS le hache vers une partition, et chaque partition prend en charge jusqu'à 300 opérations par seconde, ou 3 000 messages par seconde par lots ; le mode haut débit exige donc de nombreux ID de groupe distincts. La déduplication repose sur la déduplication basée sur le contenu (un hachage SHA-256 du corps) ou sur un `MessageDeduplicationId` explicite.

Dans Kinesis Data Streams, la **clé de partition** est hachée en MD5 vers une partition (shard). Une partition accepte jusqu'à 1 Mo ou 1 000 enregistrements par seconde en écriture et sert 2 Mo par seconde de lecture partagés entre les consommateurs standard ; la diffusion améliorée (enhanced fan-out) donne à chaque consommateur enregistré ses propres 2 Mo par seconde et par partition. Une clé à faible cardinalité (code pays) crée une partition chaude ; une clé à forte cardinalité (ID d'appareil, ID de commande) répartit la charge et conserve l'ordre par entité.

L'**idempotence** est indispensable partout où la livraison est au moins une fois : SQS standard, SNS, EventBridge, Kinesis et tout mappage de source d'événement Lambda. Le modèle classique est une clé d'idempotence portée par le message (ID de commande plus type d'événement) et une écriture conditionnelle qui échoue si la clé a déjà été traitée :

```bash
aws dynamodb put-item \
  --table-name processed-events \
  --item '{"eventId": {"S": "order-8841#payment"}, "expiresAt": {"N": "1767225600"}}' \
  --condition-expression "attribute_not_exists(eventId)"
```

Une `ConditionalCheckFailedException` signifie « déjà fait » : acquittez et ignorez ; un attribut TTL purge les anciennes clés. Powertools for AWS Lambda met en œuvre ce modèle avec DynamoDB.

> **Piège d'examen.** Une file SQS FIFO ne rend pas sûr un consommateur non idempotent. Elle supprime les envois en double pendant 5 minutes, mais un consommateur qui expire après avoir débité une carte et avant de supprimer le message le reçoit de nouveau. « Ne jamais débiter deux fois » exige toujours une clé d'idempotence.

<!-- section: externalized-state | objectives: 1.1.2 -->
## Calcul sans état et état externalisé

Un composant sans état (stateless) ne conserve rien dont une autre instance aurait besoin : tout environnement d'exécution, toute tâche ou instance peut servir n'importe quelle requête, être remplacé à tout moment et descendre à zéro. L'état part dans un magasin géré choisi selon le modèle d'accès :

| État | Magasin | Fonctionnalités utiles |
| --- | --- | --- |
| Sessions, paniers, jetons, compteurs de limitation de débit | Amazon ElastiCache (Valkey, Redis OSS) ou DynamoDB avec TTL | Lectures en moins d'une milliseconde, expiration, incréments atomiques ; DynamoDB quand la durabilité et le multi-Régions (tables globales) comptent plus que la latence |
| Entités métier et leurs versions | DynamoDB | Écritures conditionnelles pour le verrouillage optimiste, transactions sur plusieurs éléments, Streams pour émettre les changements comme événements |
| Charges utiles volumineuses, fichiers, résultats intermédiaires | Amazon S3 | Transmettre un pointeur S3 au lieu de la charge utile quand une limite de message ou d'état est atteinte ; les écritures conditionnelles empêchent les écrasements |
| Avancement d'un processus en plusieurs étapes | AWS Step Functions ou fonctions durables Lambda | Le service enregistre un point de contrôle à chaque étape ; aucune table de statut personnalisée |

Conséquences de conception :

- **Ticket de dépôt (claim check).** Step Functions limite l'entrée et la sortie d'état à 256 Kio, SQS les messages à 1 Mio et Lambda les charges utiles asynchrones à 1 Mo : stockez le corps dans S3 et transmettez sa clé.
- **Concurrence optimiste.** Les rédacteurs qui modifient le même enregistrement utilisent un attribut de version et une expression de condition sur cet attribut ; le perdant recommence avec des données fraîches.
- **Le stockage local n'est qu'un cache.** Le `/tmp` de Lambda et le stockage éphémère des conteneurs disparaissent avec l'environnement.
- **Les niveaux sans état multi-Régions** exigent un magasin multi-Régions, comme les tables globales DynamoDB.

> **Piège d'examen.** Les sessions permanentes sur un équilibreur de charge et un cache en mémoire dans chaque instance rendent un niveau avec état. Quand l'énoncé dit que des instances sont remplacées par Auto Scaling ou par des interruptions Spot et que les utilisateurs perdent leur panier, la solution est de déplacer l'état vers ElastiCache ou DynamoDB, pas d'allonger la persistance de session.

<!-- section: serverless-pipelines | objectives: 1.1.3 -->
## Pipelines sans serveur de traitement et d'analyse des données

Chaque étape d'un pipeline d'analyse sans serveur (serverless) a une réponse gérée :

```text
Ingest      Kinesis Data Streams (ordered, replayable)  |  Amazon Data Firehose (buffered delivery)
Process     Lambda event source mapping  |  Firehose transformation  |  AWS Glue streaming or batch ETL
Store       Amazon S3: partitioned Parquet or Apache Iceberg tables
Catalog     AWS Glue Data Catalog (crawlers or table definitions)
Query       Amazon Athena (pay per data scanned)  |  Amazon Quick dashboards
```

**Kinesis Data Streams** a un mode de capacité à la demande (partitions gérées pour vous) et un mode provisionné (vous dimensionnez les partitions). Sa fonctionnalité de livraison des données (data delivery) écrit les enregistrements dans des tables de streaming Apache Iceberg sur Amazon S3 Tables ou dans des compartiments S3, sans application consommatrice.

**Lambda comme consommateur de flux** traite chaque partition dans l'ordre, lot par lot :

| Exigence | Paramètre du mappage de source d'événement |
| --- | --- |
| Suivre un `IteratorAge` croissant sans ajouter de partitions | `ParallelizationFactor` de 1 à 10 lots simultanés par partition ; l'ordre reste garanti par clé de partition |
| Moins d'invocations, plus volumineuses | Fenêtre de traitement par lots jusqu'à 5 minutes (charge utile jusqu'à 6 Mo) |
| Un enregistrement défectueux ne doit pas bloquer la partition | `BisectBatchOnFunctionError`, `MaximumRetryAttempts`, `MaximumRecordAgeInSeconds`, une destination en cas d'échec (SQS ou SNS) et les réponses de lot partielles (`ReportBatchItemFailures`) |
| Le consommateur ne doit pas partager le débit de lecture | Consommateur à diffusion améliorée |
| Agrégations sur une fenêtre de temps | Fenêtres bascules (tumbling windows) |

**Amazon Data Firehose** met les enregistrements en tampon et les livre à S3, Redshift, OpenSearch Service, des tables Iceberg et des points de terminaison HTTP. Il convertit le JSON en Parquet ou ORC à l'aide d'un schéma de table Glue, et le **partitionnement dynamique** écrit les enregistrements dans des préfixes S3 construits à partir de clés présentes dans les données (`customer_id`), si bien qu'Athena analyse moins de données.

**AWS Glue** exécute des tâches ETL Spark et Python sans serveur, des tâches de streaming et des robots d'analyse (crawlers) ; les signets de tâche (job bookmarks) ne traitent que les nouvelles données. Le coût et la vitesse d'**Athena** dépendent des octets analysés : formats en colonnes, compression, partitionnement (projection de partitions pour les tables très partitionnées) et tables Iceberg (mises à jour ACID, voyage dans le temps). Les groupes de travail (workgroups) imposent des limites de données analysées et séparent les coûts par équipe.

> **Conseil d'examen.** « Livraison quasi temps réel vers S3 avec conversion de format et sans code » désigne Firehose. « Plusieurs applications lisent et relisent le même flux ordonné » désigne Kinesis Data Streams. « SQL ad hoc sur S3 avec le LEAST operational overhead » désigne Athena sur le Glue Data Catalog.

<!-- section: durable-workflows | objectives: 1.1.4 -->
## Flux de travail en plusieurs étapes à exécution durable

Un flux de travail durable enregistre son avancement pour qu'un plantage ou un dépassement de délai le reprenne au lieu de le recommencer. AWS propose deux modèles.

**AWS Step Functions** exécute des machines à états définies en Amazon States Language, en dehors de votre code :

| | Flux de travail Standard | Flux de travail Express |
| --- | --- | --- |
| Durée maximale | 1 an | 5 minutes |
| Sémantique d'exécution | Exactement une fois | Au moins une fois (asynchrone), au plus une fois (synchrone) |
| Tarification | Par transition d'état | Par exécution, durée et mémoire |
| `.sync` et `.waitForTaskToken` | Pris en charge | Non pris en charge |
| Distributed Map, activités, redrive | Pris en charge (redrive sous 14 jours) | Non pris en charge |
| Historique d'exécution | Jusqu'à 25 000 événements, conservés 90 jours | CloudWatch Logs uniquement |

Modèles de niveau professionnel :

- **Saga.** Chaque étape a une étape de compensation (remboursement, libération du stock) atteinte par `Catch` ; la machine à états porte l'annulation.
- **Rappel (callback).** `.waitForTaskToken` met en pause une exécution Standard jusqu'à ce que `SendTaskSuccess` ou `SendTaskFailure` renvoie le jeton (approbation humaine, système partenaire).
- **Diffusion à grande échelle.** Distributed Map exécute jusqu'à 10 000 exécutions enfants en parallèle sur des objets S3.
- **Étapes entre comptes.** Un état `Task` endosse un rôle dans un autre compte dont la politique d'approbation nomme la machine à états. Les intégrations SDK entre Régions ne sont pas disponibles : atteignez une autre Région par un bus d'événements ou une API.

Les **fonctions durables Lambda (durable functions)** gardent le flux de travail dans le code de la fonction. Une exécution durable enregistre un point de contrôle pour chaque opération durable (step, wait, callback, invoke, parallel, map) ; après une attente ou une interruption, la fonction est rejouée depuis le début en sautant les étapes terminées et en réutilisant leurs résultats. Les exécutions peuvent durer jusqu'à un an, et les attentes n'entraînent aucun coût de calcul. Règles à retenir :

- L'exécution durable ne s'active qu'à la création de la fonction, avec un délai d'exécution et une période de rétention.
- Invoquez une version publiée ou un alias pour que les relectures exécutent le même code ; l'invocation synchrone convient aux exécutions qui se terminent en 30 minutes.
- Le code hors des étapes s'exécute de nouveau à chaque relecture : gardez-le déterministe et placez les effets de bord dans des étapes.
- Lambda ne relance pas une exécution durable en échec : configurez une DLQ et une alarme sur FAILED, STOPPED et TIMED_OUT.

```bash
aws lambda create-function \
  --function-name order-fulfilment \
  --runtime nodejs22.x \
  --role arn:aws:iam::111122223333:role/order-fulfilment-durable \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --durable-config '{"ExecutionTimeout": 86400, "RetentionPeriodInDays": 14}'
```

| Exigence | Choix |
| --- | --- |
| Flux de travail visuel sur de nombreux services AWS, les auditeurs lisent le graphe d'exécution | Step Functions Standard |
| Très gros volume de transformations d'événements courtes | Step Functions Express |
| Les développeurs veulent le flux de travail en Python, TypeScript ou Java à côté du code métier, avec des attentes de plusieurs jours | Fonctions durables Lambda |
| Traiter des millions d'objets S3 en parallèle | Step Functions Distributed Map |

> **Piège d'examen.** Une seule fonction Lambda, même avec le délai maximal actuel de 30 minutes, n'est pas un flux de travail durable : si elle échoue à la vingtième minute, le travail repart de zéro. « Survivre aux interruptions et attendre des jours » désigne Step Functions Standard ou les fonctions durables.

<!-- section: cross-account-events | objectives: 1.1.5 -->
## Routage d'événements entre comptes et entre Régions

Les organisations centralisent les événements (résultats de sécurité, événements métier) dans un compte pivot, ou les distribuent des producteurs vers des comptes consommateurs. EventBridge propose ces briques.

**De bus à bus.** Le bus récepteur a une politique basée sur les ressources qui autorise `events:PutEvents` depuis des comptes ou depuis l'organisation ; une règle du bus émetteur cible l'ARN du bus récepteur ; des règles du bus récepteur acheminent les événements localement. Les cibles de type bus d'événements créées après le 2 mars 2023 exigent un rôle IAM dans le compte émetteur, qui est aussi le compte facturé.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowOrgAccountsToPutEvents",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "events:PutEvents",
    "Resource": "arn:aws:events:eu-west-1:111122223333:event-bus/central-events",
    "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
  }]
}
```

**Cibles directes entre comptes.** Une règle peut livrer directement à une file SQS, une rubrique SNS, une fonction Lambda, un flux de données Kinesis ou une API API Gateway d'un autre compte **dans la même Région**. Il faut un rôle d'exécution dans le compte du bus (ses SCP s'appliquent) et une politique basée sur les ressources sur la cible.

**Entre Régions.** Une règle peut cibler un bus d'événements d'une autre Région, dans le même compte ou un autre, avec les mêmes autorisations que de bus à bus.

Les **points de terminaison globaux (global endpoints)** ajoutent la tolérance aux pannes régionales pour les producteurs : `PutEvents` s'adresse à un point de terminaison adossé à un bus personnalisé de même nom dans une Région principale et une Région secondaire, et une vérification de l'état Route 53 bascule les événements personnalisés vers la Région secondaire. AWS documente un RTO et un RPO de 360 secondes, 420 secondes au plus, avec son alarme recommandée. La réplication des événements est nécessaire pour revenir automatiquement à la Région principale.

| Exigence | Conception |
| --- | --- |
| Tous les comptes membres envoient les événements GuardDuty et Config à un compte de sécurité | Règle dans chaque compte qui cible un bus central dont la politique utilise `aws:PrincipalOrgID` |
| Livrer les événements de commande d'un compte producteur à une file appartenant à une équipe consommatrice, même Région, le moins de composants | Cible SQS directe entre comptes avec un rôle d'exécution et une politique de file |
| Les producteurs doivent continuer à publier pendant une panne régionale | Point de terminaison global EventBridge avec réplication |

> **Piège d'examen.** Le transfert entre comptes n'est pas transitif. Si le compte B reçoit des événements du compte A et a une règle qui les transmet au compte C, les événements n'atteignent pas C. Envoyez-les directement de A vers C, ou faites cibler par A un bus central que C lit.

<!-- section: websocket-realtime | objectives: 1.1.12 -->
## Mises à jour en temps réel avec WebSocket et publication/abonnement

Quand les clients ont besoin de mises à jour poussées par le serveur (tableaux de bord en direct, discussion, enchères), interroger une API REST gaspille des requêtes et ajoute de la latence. Une **API WebSocket d'API Gateway** maintient une connexion bidirectionnelle persistante et achemine chaque message JSON selon une expression de sélection de route, en général `$request.body.action` :

| Route | Appelée quand |
| --- | --- |
| `$connect` | Un client ouvre une connexion ; l'autorisation (IAM ou mécanisme d'autorisation Lambda) s'exécute ici et protège toutes les autres routes |
| `$disconnect` | La connexion se ferme (au mieux) |
| Route personnalisée (par exemple `subscribe`) | L'expression de sélection de route correspond à sa clé de route |
| `$default` | Aucune route ne correspond, ou le message n'est pas du JSON |

Le back-end reste sans état : l'intégration `$connect` stocke l'ID de connexion (avec l'utilisateur et les sujets) dans DynamoDB, et tout producteur pousse les données avec l'API `@connections`, signée en SigV4 et autorisée par `execute-api:ManageConnections` :

```text
POST   https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/@connections/{connection_id}   send a message
GET    .../@connections/{connection_id}                                                          connection status
DELETE .../@connections/{connection_id}                                                          disconnect the client
```

Une `GoneException` signifie que le client est parti : supprimez son élément de connexion.

Pour une diffusion publication/abonnement, un producteur publie un événement (EventBridge, SNS ou DynamoDB Streams) ; une fonction Lambda recherche dans DynamoDB les ID de connexion abonnés et publie vers chacun. Les producteurs ne connaissent jamais les connexions.

Quotas WebSocket qui orientent la conception :

| Quota | Valeur |
| --- | --- |
| Durée de connexion | 2 heures (les clients doivent se reconnecter) |
| Délai d'inactivité de la connexion | 10 minutes (envoyez des pulsations) |
| Charge utile d'un message | 128 Ko, envoyée en trames de 32 Ko au plus |
| Nouvelles connexions par seconde, par compte et par Région | 500 par défaut (ajustable) ; pas de quota de connexions simultanées |

> **Conseil d'examen.** « Pousser des mises à jour vers des milliers de navigateurs sans gérer de serveurs » désigne une API WebSocket d'API Gateway avec les ID de connexion dans DynamoDB. Un Application Load Balancer laisse aussi passer le trafic WebSocket, mais vous exploitez alors vous-même les serveurs de connexion.

<!-- section: key-points -->
## Points clés

- Connaissez la promesse de chaque service : SQS standard et EventBridge livrent au moins une fois et sans ordre ; SQS FIFO ordonne par groupe de messages avec une déduplication de 5 minutes ; Kinesis ordonne par partition (clé de partition) et permet la relecture.
- Choisissez des ID de groupe de messages et des clés de partition à forte cardinalité ; rendez idempotent tout consommateur « au moins une fois » avec une écriture conditionnelle DynamoDB.
- Le calcul sans état garde les sessions dans ElastiCache ou DynamoDB, les charges utiles dans S3 (ticket de dépôt) et l'avancement des flux de travail dans Step Functions ou les fonctions durables.
- Pipelines : Kinesis ou Firehose vers du Parquet partitionné ou de l'Iceberg sur S3, Glue Data Catalog, Athena ; réglez les consommateurs Lambda de flux avec le facteur de parallélisation, la bissection, les destinations et les réponses de lot partielles.
- Step Functions Standard (1 an, exactement une fois, rappels, Distributed Map) ou Express (5 minutes, gros volume) ; les fonctions durables Lambda enregistrent des points de contrôle et rejouent le code jusqu'à un an.
- EventBridge : de bus à bus avec une politique de ressource et un rôle, cibles directes entre comptes dans la même Région, cibles de bus entre Régions, points de terminaison globaux pour le basculement régional ; le transfert n'est pas transitif.
- API WebSocket : autorisation sur `$connect`, ID de connexion dans DynamoDB, `@connections` pour pousser, connexions de 2 heures et délai d'inactivité de 10 minutes.
