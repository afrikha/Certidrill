Sur AWS, le code d'application appelle d'autres services par les kits SDK, reçoit des événements, publie des messages et dépend d'API qui peuvent échouer ou ralentir. Les questions du DVA-C03 montrent ce code et demandent quel modèle d'intégration, quel paramètre du kit SDK, quelle fonctionnalité d'API Gateway, quelle correction de sérialisation ou quel service d'IA géré le rend correct, résilient et faiblement couplé.

<!-- section: coupling | objectives: 1.1.1 -->
## Composants fortement et faiblement couplés

Des composants sont **fortement couplés** quand l'un doit être disponible, rapide et inchangé pour que l'autre fonctionne : un appel synchrone à un back-end lent, un point de terminaison codé en dur, un schéma partagé, un producteur qui échoue quand le consommateur est arrêté. Ils sont **faiblement couplés** quand un intermédiaire absorbe les différences.

| Problème de couplage dans l'énoncé | Service de découplage |
| --- | --- |
| Le producteur perd du travail quand le consommateur est lent, arrêté ou en cours de déploiement | Une file d'attente Amazon SQS ; le consommateur l'interroge à son rythme |
| Un événement doit atteindre plusieurs consommateurs indépendants, et d'autres viendront s'ajouter | Une rubrique Amazon SNS (souvent en diffusion vers une file SQS par consommateur) ou une règle Amazon EventBridge par consommateur |
| Des événements de services AWS ou d'applications SaaS doivent être acheminés selon leur contenu | Un bus d'événements Amazon EventBridge avec des règles |
| Plusieurs consommateurs doivent lire les mêmes enregistrements ordonnés et les relire | Amazon Kinesis Data Streams |
| Un processus en plusieurs étapes avec nouvelles tentatives et branches | Une machine d'état AWS Step Functions |
| Les clients ne doivent pas savoir quels serveurs ou quelles fonctions répondent | Amazon API Gateway ou un Application Load Balancer |

> **Piège d'examen.** Une fonction Lambda qui en appelle une autre de façon synchrone (`RequestResponse`) reste fortement couplée : elle paie l'attente et échoue quand l'appelée échoue. Placez une file d'attente, une rubrique, un bus d'événements ou un flux Step Functions entre les deux.

<!-- section: sync-async | objectives: 1.1.2 -->
## Modèles synchrones et asynchrones

Dans un modèle **synchrone**, l'appelant attend le résultat et gère lui-même les erreurs ; dans un modèle **asynchrone**, un service stocke le travail, accuse réception aussitôt, et le travail s'exécute plus tard.

| Modèle | Comment l'appelant reçoit la réponse | Choisissez-le quand |
| --- | --- | --- |
| API Gateway qui appelle Lambda | Il attend la réponse, dans la limite du délai d'intégration (29 secondes par défaut) | Un utilisateur attend un résultat calculé en quelques millisecondes à quelques secondes |
| File d'attente SQS | `SendMessage` renvoie un ID de message ; un consommateur traite plus tard | Le travail peut attendre, la charge est irrégulière, le consommateur doit être protégé |
| Rubrique SNS ou bus EventBridge | `Publish` ou `PutEvents` rend la main aussitôt ; le service pousse vers les abonnés ou les cibles des règles | Le même événement va à plusieurs consommateurs |
| Appel asynchrone de Lambda | Lambda met l'événement en file et renvoie HTTP 202 | « Lancer et oublier » avec les nouvelles tentatives et les destinations de Lambda |
| Flux de travail Step Functions Standard | `StartExecution` renvoie l'ARN d'une exécution | Processus longs en plusieurs étapes |

```bash
aws lambda invoke --function-name process-order \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload '{"orderId":"o-1001"}' response.json
```

`RequestResponse` (la valeur par défaut) est synchrone, `Event` asynchrone, `DryRun` vérifie seulement les autorisations.

> **Conseil d'examen.** « La requête prend plusieurs minutes et les clients expirent » signifie : mettre le travail en file ou lancer une exécution Step Functions, renvoyer aussitôt un ID (HTTP 202), et laisser le client interroger ou être notifié.

<!-- section: resilience | objectives: 1.1.3 -->
## Tolérance aux pannes : nouvelles tentatives, idempotence et dégradation progressive

Les kits SDK AWS retentent automatiquement les erreurs transitoires (limitation, HTTP 5xx, délais d'expiration, connexions réinitialisées). Le mode de nouvelle tentative **standard**, par défaut, utilise un backoff exponentiel avec gigue (jitter) et `max_attempts` à 3 (requête initiale comprise) ; le mode **adaptive** ajoute une limitation de débit côté client pour une ressource souvent limitée ; le mode **legacy** existe pour la compatibilité. Réglez-les avec `AWS_RETRY_MODE` et `AWS_MAX_ATTEMPTS` ou dans le code. `AccessDeniedException`, `ValidationException` et `ResourceNotFoundException` ne sont jamais retentées.

```text
# Python (boto3)
from botocore.config import Config
dynamodb = boto3.client("dynamodb", config=Config(retries={"mode": "standard", "max_attempts": 5}))

// JavaScript (SDK v3)
const client = new DynamoDBClient({ maxAttempts: 5, retryMode: "adaptive" });
```

Vos propres boucles de nouvelles tentatives (pour les éléments qu'un appel par lot n'a pas traités) doivent attendre plus longtemps après chaque tentative, ajouter une gigue aléatoire pour que les clients ne retentent pas tous au même moment, et plafonner les tentatives. Une nouvelle tentative n'est sûre que si l'opération est **idempotente** : utilisez une clé d'idempotence (un ID de commande vérifié par une écriture conditionnelle DynamoDB, `ClientRequestToken` sur les transactions DynamoDB, les ID de déduplication SQS FIFO) et faites en sorte que les consommateurs de SQS, SNS, EventBridge et Kinesis tolèrent les doublons, car la livraison se fait au moins une fois.

Step Functions déclare les nouvelles tentatives et les solutions de repli pour chaque état (valeurs par défaut : `IntervalSeconds` 1, `MaxAttempts` 3, `BackoffRate` 2.0) :

```json
"ChargeCard": {
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Parameters": { "FunctionName": "charge-card", "Payload.$": "$" },
  "Retry": [
    { "ErrorEquals": ["States.Timeout", "Lambda.TooManyRequestsException"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0, "JitterStrategy": "FULL" }
  ],
  "Catch": [
    { "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "QueueForLater" }
  ],
  "Next": "SendReceipt"
}
```

La **dégradation progressive** (graceful degradation) garde l'application utile quand une dépendance échoue : servir des données en cache ou par défaut, désactiver une fonctionnalité non essentielle avec un indicateur de fonctionnalité (feature flag) AWS AppConfig, et cesser d'appeler une dépendance défaillante pendant un moment (disjoncteur, circuit breaker).

> **Piège d'examen.** Une boucle qui retente immédiatement transforme une limitation en panne. « Les appels échouent avec `ProvisionedThroughputExceededException` pendant les pics » se résout par des nouvelles tentatives avec backoff exponentiel et gigue (plus une correction de capacité ou de clé), jamais en retentant plus vite.

<!-- section: apis | objectives: 1.1.4 -->
## Créer, étendre et maintenir des API

Seules les **API REST** d'API Gateway offrent la validation des requêtes, la transformation du corps avec des modèles de mappage, le cache, les clés d'API et les plans d'utilisation, AWS WAF, les points de terminaison privés et les intégrations fictives (mock). Les **API HTTP** sont moins chères ; leur mappage de paramètres modifie les en-têtes, les chaînes de requête, les chemins et les codes d'état (`append:header.name`, `overwrite:path`, `overwrite:statuscode`), mais pas le corps.

| Intégration | Qui façonne la réponse |
| --- | --- |
| Proxy Lambda (`AWS_PROXY`) : toute la requête devient l'événement | La fonction, dans un format imposé |
| Lambda personnalisée (sans proxy) | Les modèles de mappage de la requête et de la réponse |
| Service AWS (SQS `SendMessage`, Step Functions `StartExecution`) sans Lambda | Les modèles de mappage |
| Mock | Le modèle de la réponse d'intégration, sans back-end |

Une intégration proxy attend cette sortie, avec `body` sous forme de chaîne ; toute autre sortie donne au client une erreur 502 :

```json
{
  "statusCode": 201,
  "headers": { "Content-Type": "application/json", "Access-Control-Allow-Origin": "https://app.example.com" },
  "body": "{\"orderId\":\"o-1001\",\"status\":\"CREATED\"}",
  "isBase64Encoded": false
}
```

Un **validateur de requête** vérifie le corps par rapport à un **modèle** (JSON Schema draft 4) et/ou la présence des chaînes de requête, en-têtes et paramètres de chemin obligatoires. Un échec renvoie HTTP 400 sans appeler l'intégration, si bien que la fonction n'est pas facturée pour des entrées invalides ; les réponses de passerelle (`BAD_REQUEST_BODY`, `BAD_REQUEST_PARAMETERS`) personnalisent l'erreur.

Les **modèles de mappage** (Velocity Template Language) remodèlent les requêtes et les réponses des intégrations sans proxy :

```text
#set($root = $input.path('$'))
{
  "customerId": "$root.customer.id",
  "items": $input.json('$.cart.items'),
  "requestId": "$context.requestId"
}
```

Quand aucun modèle ne correspond au `Content-Type`, `WHEN_NO_MATCH` (par défaut) transmet le corps, `WHEN_NO_TEMPLATES` ne le transmet que si la méthode n'a aucun modèle, `NEVER` renvoie 415. Une modification d'API REST n'atteint les clients qu'après un **déploiement** sur une étape (stage). Ajoutez des versions sans casser les clients avec un nouveau chemin (`/v2/orders`) ou une nouvelle étape, et faites pointer chaque étape vers son alias Lambda avec des variables d'étape.

> **Piège d'examen.** Les modèles de mappage sont ignorés avec une intégration proxy Lambda. « Transformer le corps de la requête sans modifier la fonction » désigne une intégration personnalisée (sans proxy) sur une API REST ; les API HTTP ne transforment pas le corps.

<!-- section: sdk | objectives: 1.1.5 -->
## Appeler les services AWS avec les API et les kits SDK

Chaque appel d'API est une requête HTTPS signée avec Signature Version 4 ; les kits SDK (boto3, le SDK JavaScript v3 modulaire...) les construisent, les signent, les retentent et les analysent.

| Symptôme ou exigence | Correction |
| --- | --- |
| Aucune clé d'accès dans le code | La chaîne d'informations d'identification par défaut du kit SDK trouve un rôle : rôle d'exécution Lambda, rôle de tâche ECS, profil d'instance EC2, IAM Identity Center pour les développeurs |
| Un appel de liste ne renvoie qu'une partie des résultats | Suivre le jeton de pagination ou utiliser un paginateur |
| Attendre qu'une ressource soit prête | Un waiter, pas une boucle avec pause |
| Un appel par lot signale des échecs partiels | Ne retenter que les entrées de `UnprocessedItems` (DynamoDB) ou signalées par `FailedRecordCount` (Kinesis), avec backoff |
| Chaque appel recrée les clients et les connexions | Créer les clients en dehors du gestionnaire (handler) Lambda |
| L'appel échoue avec un code d'erreur | Intercepter l'exception du service et brancher sur son code (`ConditionalCheckFailedException`, `ThrottlingException`) |

```text
# Python (boto3): paginator and waiter
s3 = boto3.client("s3")
for page in s3.get_paginator("list_objects_v2").paginate(Bucket="anycompany-invoices", Prefix="2026/"):
    for obj in page.get("Contents", []):
        print(obj["Key"])
s3.get_waiter("object_exists").wait(Bucket="anycompany-invoices", Key="2026/11/summary.csv")

// JavaScript (SDK v3): one client per service, commands sent with send()
import { S3Client, paginateListObjectsV2 } from "@aws-sdk/client-s3";
const s3 = new S3Client({});
for await (const page of paginateListObjectsV2({ client: s3 }, { Bucket: "anycompany-invoices" })) {
  console.log(page.Contents?.length);
}
```

> **Conseil d'examen.** Un `client` boto3 correspond exactement à l'API (valeurs DynamoDB typées comme `{"S": "..."}`) ; la ressource `Table` convertit les types Python. Dans l'AWS CLI, `--query` filtre avec JMESPath et `--debug` affiche les requêtes signées.

<!-- section: streaming | objectives: 1.1.6 -->
## Gérer les données de streaming

**Amazon Kinesis Data Streams** conserve les enregistrements dans des partitions (shards) pendant 24 heures par défaut, jusqu'à 365 jours. Une partition provisionnée accepte 1 Mo/s ou 1 000 enregistrements/s en écriture et sert 2 Mo/s en lecture, partagés entre ses consommateurs ; le mode à la demande s'adapte automatiquement. La **clé de partition** est hachée pour choisir la partition : même clé, même partition, même ordre ; choisissez donc une clé aux nombreuses valeurs distinctes.

- `PutRecords` envoie jusqu'à 500 enregistrements et peut échouer partiellement : renvoyez seulement les enregistrements dont le résultat porte un `ErrorCode`.
- `ProvisionedThroughputExceededException` : retentez avec backoff, répartissez les clés, ajoutez des partitions ou passez en mode à la demande.
- La **Kinesis Client Library** garde un bail (lease) par partition dans une table DynamoDB et enregistre la progression (checkpoint) ; plus de workers que de partitions n'apporte rien. La KCL 1.x a atteint sa fin de prise en charge le 30 janvier 2026.
- La **diffusion améliorée (enhanced fan-out)** donne à chaque consommateur enregistré ses propres 2 Mo/s par partition.

```text
# Python (boto3): resend only the failed records
response = kinesis.put_records(StreamName="clickstream", Records=records)
if response["FailedRecordCount"] > 0:
    retry = [rec for rec, res in zip(records, response["Records"]) if "ErrorCode" in res]
    # wait with exponential backoff and jitter, then put_records(Records=retry)
```

**Amazon Data Firehose** met les enregistrements en mémoire tampon selon une taille ou une durée, peut les transformer avec Lambda et les livre vers S3, Amazon OpenSearch Service, Amazon Redshift ou des points de terminaison HTTP, sans relecture possible. **DynamoDB Streams** conserve les modifications d'éléments pendant 24 heures, chaque modification une fois et dans l'ordre pour un même élément ; au plus deux processus devraient lire une partition. Amazon Athena interroge en SQL les fichiers livrés dans S3.

> **Piège d'examen.** SQS n'est pas un flux : un message traité est supprimé, donc une deuxième application ne peut pas le lire et rien ne peut être relu. « Plusieurs applications traitent les mêmes événements » ou « retraiter la dernière journée » désigne Kinesis Data Streams.

<!-- section: serialization | objectives: 1.1.7 -->
## Sérialiser et désérialiser les données

| Où | Format à gérer |
| --- | --- |
| Événement proxy API Gateway | `body` est une chaîne : analysez-la (`json.loads`, `JSON.parse`) et renvoyez `body` sous forme de chaîne |
| Enregistrement Kinesis dans un événement Lambda | `kinesis.data` est en base64 : décodez, puis analysez |
| SNS livré à SQS | Le corps SQS est l'enveloppe JSON de SNS (`Type`, `TopicArn`, `Message`...) sauf si la remise de messages bruts (raw message delivery) est activée |
| Événement EventBridge | `detail` est déjà un objet JSON |
| API DynamoDB de bas niveau | Valeurs typées (`S`, `N`, `B`, `BOOL`, `NULL`, `M`, `L`, `SS`, `NS`, `BS`) ; les nombres circulent sous forme de chaînes, jusqu'à 38 chiffres |

```text
# Python: DynamoDB Table resource and JSON
from decimal import Decimal
table.put_item(Item={"orderId": "o-1001", "total": Decimal("19.99")})   # a float raises TypeError
item = table.get_item(Key={"orderId": "o-1001"})["Item"]
json.dumps(item, default=str)                                            # Decimal isn't JSON serializable by default

// JavaScript (SDK v3): document client or marshall/unmarshall
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
const doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
await doc.send(new PutCommand({ TableName: "Orders", Item: { orderId: "o-1001", total: 19.99 } }));
const plain = unmarshall(record.dynamodb.NewImage);   // DynamoDB Streams images use the typed format
```

Envoyez les grosses charges utiles dans S3 et transmettez la clé de l'objet dans le message.

> **Piège d'examen.** Un consommateur SQS abonné à SNS qui ne trouve pas ses champs lit l'enveloppe SNS : analysez le `Message` interne ou activez la remise de messages bruts sur l'abonnement. Ne modifiez pas le producteur.

<!-- section: event-driven | objectives: 1.1.8 -->
## Modèles pilotés par les événements

Une **règle EventBridge** reconnaît les événements d'un bus grâce à un modèle (pattern) qui a la forme des événements (les valeurs d'un tableau sont des alternatives) et les envoie à des cibles comme Lambda, SQS, SNS, Step Functions ou des destinations d'API. Évitez les règles dont la cible écrit l'événement qui les redéclenche.

```json
{
  "source": ["com.anycompany.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": {
    "country": ["FR", "BE"],
    "total": [{ "numeric": [">=", 500] }]
  }
}
```

**Amazon S3 Event Notifications** publie les événements d'objets (création, suppression, restauration, réplication, cycle de vie...) vers une rubrique SNS, une file d'attente SQS, une fonction Lambda ou EventBridge, filtrés par préfixe et suffixe. La livraison se fait au moins une fois, en général en quelques secondes ; la politique de ressource de la destination doit autoriser S3. Une fonction qui réécrit dans le préfixe déclencheur tourne en boucle.

```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:eu-west-3:111122223333:function:make-thumbnail",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": { "Key": { "FilterRules": [ { "Name": "prefix", "Value": "uploads/" }, { "Name": "suffix", "Value": ".jpg" } ] } }
    }
  ]
}
```

| Besoin | Réponse pilotée par les événements |
| --- | --- |
| Plusieurs actions indépendantes sur un même chargement | S3 vers SNS en diffusion vers des files SQS, ou S3 vers EventBridge avec une règle par action |
| Réagir à un événement d'un service AWS (un déploiement CodeDeploy, un changement d'état EC2) | Règle EventBridge sur le bus d'événements par défaut |
| Les abonnés ne reçoivent qu'une partie des messages d'une rubrique | Politique de filtre d'abonnement SNS |
| Exécuter une tâche chaque nuit | EventBridge Scheduler |

> **Piège d'examen.** Les files d'attente SQS FIFO ne sont pas prises en charge comme destination des notifications d'événements S3. Envoyez les événements du compartiment à EventBridge et ciblez la file FIFO depuis une règle.

<!-- section: ai-assisted-development | objectives: 1.1.9 -->
## Les outils de développement assistés par l'IA

**Kiro**, l'IDE et la CLI agentiques d'AWS, succède à Amazon Q Developer (inscriptions fermées le 15 mai 2026). Il propose un chat avec suggestions en ligne et génération de code, et le **développement piloté par les spécifications** (spec-driven) : une demande de fonctionnalité devient trois fichiers que vous relisez avant que le code soit écrit.

| Fichier de spec | Contenu |
| --- | --- |
| `requirements.md` (ou `bugfix.md`) | Exigences testables en notation EARS |
| `design.md` | Architecture, diagrammes de séquence, considérations de mise en œuvre |
| `tasks.md` | Tâches de mise en œuvre suivies, exécutées une par une ou par vagues selon leurs dépendances |

```text
WHEN a customer submits an order with an unknown product ID
THE SYSTEM SHALL reject the order with HTTP 400 and the message "Unknown product"
```

| Tâche de l'énoncé | Outil |
| --- | --- |
| Appliquer les conventions de l'équipe à chaque modification générée | Les fichiers de pilotage (steering) Kiro (`.kiro/steering/` : `product.md`, `tech.md`, `structure.md` ; aussi `AGENTS.md`) |
| Analyser, tester, documenter ou relire automatiquement à l'enregistrement d'un fichier ou à l'arrêt de l'agent | Les hooks Kiro (`.kiro/hooks/`) |
| Refactoriser ou expliquer du code, compléter le code pendant la frappe | Le chat et les suggestions en ligne de Kiro |
| Relier l'agent à des outils externes ; l'exécuter sans interface dans la CI | Serveurs MCP ; Kiro CLI |
| Analyser le code (SAST), les dépendances (SCA) et l'IaC de référentiels GitHub ou GitLab, avec des pull requests de correction | Amazon Inspector code security |

Amazon CodeGuru Reviewer n'accepte plus de nouvelle association de référentiel depuis le 7 novembre 2025.

> **Piège d'examen.** Le code généré par l'IA est relu et testé comme tout autre code avant la fusion. Ne mettez jamais de secrets dans les fichiers de pilotage ou les invites, et gardez une approbation humaine sur les modifications de l'agent en production.

<!-- section: ai-services | objectives: 1.1.10 -->
## Intégrer des services d'IA gérés

**Amazon Bedrock** sert les modèles sur le point de terminaison `bedrock-runtime`. `Converse` et `ConverseStream` utilisent un seul format de message (`messages`, `system`, `inferenceConfig`, `toolConfig`, `guardrailConfig`) pour tous les modèles qui prennent en charge les messages ; `InvokeModel` prend un corps propre à chaque modèle. `Converse` exige `bedrock:InvokeModel`, `ConverseStream` exige `bedrock:InvokeModelWithResponseStream`. Le streaming affiche les premiers jetons plus tôt ; renvoyez les messages précédents avec chaque requête pour conserver une conversation.

```text
# Python (boto3)
brt = boto3.client("bedrock-runtime")
response = brt.converse(
    modelId=MODEL_ID,                                   # from configuration, not hard-coded
    system=[{"text": "Answer as AnyCompany's support assistant."}],
    messages=[{"role": "user", "content": [{"text": question}]}],
    inferenceConfig={"maxTokens": 512, "temperature": 0.2},
)
answer = response["output"]["message"]["content"][0]["text"]
```

La plupart des modèles sans serveur ne demandent aucune demande d'accès dans les Régions commerciales ; les modèles tiers lancent un abonnement AWS Marketplace au premier appel, ce qui exige les autorisations Marketplace. Une `AccessDeniedException` au premier appel signale en général un prérequis manquant ; retentez une `ThrottlingException` avec backoff.

| Exigence | Service |
| --- | --- |
| Prendre en charge plusieurs modèles avec le moins de code | Bedrock `Converse` |
| Afficher la réponse pendant qu'elle est générée | Bedrock `ConverseStream` |
| Laisser le modèle appeler vos fonctions | L'utilisation d'outils de Bedrock (`toolConfig`), ou Amazon Bedrock AgentCore Gateway pour exposer des API et des fonctions Lambda comme outils MCP |
| Héberger un agent construit avec n'importe quel framework, avec isolation des sessions, mémoire et politiques d'outils | AgentCore Runtime, Memory et Policy |
| Les utilisateurs métier obtiennent tableaux de bord, recherches et automatisations sur les données de l'entreprise | Amazon Quick (AWS Quick dans sa documentation : Quick Sight, Quick Flows, Quick Research...) |

> **Piège d'examen.** Changer de modèle avec `InvokeModel` impose de réécrire le corps de la requête pour chaque fournisseur. « Prendre en charge plusieurs modèles avec le LEAST development effort » désigne `Converse`, qui transmet les paramètres propres au modèle dans `additionalModelRequestFields`.

<!-- section: key-points -->
## Points clés

- Découplez avec SQS, SNS, EventBridge, Kinesis ou Step Functions ; un travail long derrière une API renvoie 202 et un ID.
- Nouvelles tentatives du kit SDK : mode `standard`, backoff avec gigue, erreurs transitoires seulement ; les clés d'idempotence rendent les nouvelles tentatives sûres.
- Les intégrations proxy ignorent les modèles de mappage et exigent `statusCode` et un `body` sous forme de chaîne ; les API REST valident les requêtes.
- Paginateurs, waiters, clients hors du gestionnaire, rôles ; ne retenter que les entrées en échec des appels par lot.
- Analysez les corps API Gateway, décodez le base64 de Kinesis, déballez l'enveloppe SNS, utilisez `Decimal` avec boto3.
- Les notifications S3 n'atteignent les files FIFO que par EventBridge.
- Specs, fichiers de pilotage et hooks Kiro ; Amazon Inspector pour l'analyse du code ; Bedrock `Converse` pour un code indépendant du modèle.
