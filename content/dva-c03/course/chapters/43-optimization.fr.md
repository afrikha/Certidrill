Les questions d'optimisation décrivent une application qui fonctionne mais qui est lente, limitée (throttling) ou coûteuse, et demandent le réglage, l'appel d'API ou le service qui la corrige avec le qualificatif indiqué. Lisez le symptôme (démarrages à froid, limitations, file qui grossit, clé très sollicitée), trouvez la métrique qui le prouve, puis choisissez le plus petit changement qui supprime le goulet d'étranglement.

<!-- section: lambda-concurrency | objectives: 4.3.1 -->
## Simultanéité Lambda : réservée, provisionnée et SnapStart

Un environnement d'exécution traite une requête à la fois, donc la simultanéité est le nombre d'environnements utilisés : **simultanéité = nombre moyen de requêtes par seconde × durée moyenne en secondes** (100 requêtes par seconde × 0,5 s = 50).

- **1 000 exécutions simultanées** par Région par défaut, partagées par toutes les fonctions (augmentation de quota possible) ; **100 unités restent toujours non réservées**.
- Chaque fonction peut ajouter **1 000 environnements d'exécution toutes les 10 secondes** ; au-delà de la simultanéité disponible, les requêtes sont limitées (`TooManyRequestsException`).

| Exigence | Réglage |
| --- | --- |
| Garantir une capacité à une fonction, ou la plafonner pour protéger un système en aval | Simultanéité réservée (reserved concurrency, sans frais) ; 0 arrête toutes les invocations |
| Supprimer la latence de démarrage à froid pour une charge de base prévisible | Simultanéité provisionnée (provisioned concurrency) sur une version publiée ou un alias (facturée tant qu'elle est configurée) |
| Une capacité provisionnée qui suit un calendrier ou la charge | Application Auto Scaling sur l'alias : mise à l'échelle planifiée ou suivi de cible sur `LambdaProvisionedConcurrencyUtilization` |
| Des démarrages à froid plus rapides sans coût supplémentaire pour une fonction Java | SnapStart sur une version publiée (Java 11 et versions ultérieures ; aussi Python 3.12+ et .NET 8+, avec des frais de mise en cache et de restauration) |

- La simultanéité provisionnée ne peut pas être définie sur `$LATEST` ni dépasser la simultanéité réservée. Lambda exécute le code situé hors du gestionnaire (handler) au moment de l'allocation : placez-y les clients SDK et les importations lourdes.
- Dimensionnez-la avec la formule ou le pic de `ConcurrentExecutions`, plus environ **10 %** ; les requêtes en trop débordent (`ProvisionedConcurrencySpilloverInvocations`).
- SnapStart ne peut pas être combiné avec la simultanéité provisionnée, Amazon EFS ou un stockage éphémère supérieur à 512 Mo.

```bash
# Keep 50 pre-initialized environments behind the "live" alias, then scale them at 70% utilization
aws lambda put-provisioned-concurrency-config \
  --function-name orders-api --qualifier live \
  --provisioned-concurrent-executions 50

aws application-autoscaling register-scalable-target \
  --service-namespace lambda \
  --resource-id function:orders-api:live \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 50 --max-capacity 200

aws application-autoscaling put-scaling-policy \
  --service-namespace lambda \
  --resource-id function:orders-api:live \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --policy-name pc-70 --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue": 0.7, "PredefinedMetricSpecification": {"PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"}}'
```

> **Piège d'examen.** La simultanéité réservée réserve et limite ; elle ne préchauffe rien. « Des pics de latence P99 sur les premières requêtes après une période d'inactivité » se résolvent avec la simultanéité provisionnée (ou SnapStart), jamais en augmentant la simultanéité réservée.

<!-- section: pools-scaling | objectives: 4.3.1 -->
## Pools de connexions, pools de threads et mise à l'échelle des serveurs

**Connexions de base de données depuis Lambda.** Chaque environnement d'exécution ouvre sa propre connexion, si bien qu'un pic peut épuiser une base de données relationnelle :

1. Ouvrez la connexion (et les clients SDK) **hors du gestionnaire** pour que les invocations à chaud la réutilisent.
2. Ajoutez **Amazon RDS Proxy** : il regroupe et partage les connexions à la base de données, met en file d'attente ou rejette ce qu'il ne peut pas servir, et conserve les connexions de l'application pendant un basculement. Il se trouve dans le VPC de la base de données, n'est jamais public et utilise des informations d'identification Secrets Manager ou l'authentification IAM.
3. Plafonnez la fonction avec la simultanéité réservée si la base de données ne supporte toujours pas le pic.

**Pools de connexions du SDK et pools de threads.** Dans une application multithread, le pool HTTP du SDK doit correspondre aux threads qui partagent un client :

| SDK | Réglage du pool | Valeur par défaut |
| --- | --- | --- |
| Python (boto3 / botocore) | `max_pool_connections` dans `botocore.config.Config` | 10 connexions |
| JavaScript v3 (Node.js) | `maxSockets` de l'`https.Agent` transmis au gestionnaire de requêtes | 50 sockets ; les connexions sont réutilisées (keep-alive) par défaut |

Plus de threads que de connexions dans le pool fait attendre les threads : dimensionnez le pool du SDK selon les threads et réutilisez un seul client par processus.

```text
# Python: one client per process, pool sized for 32 worker threads
from botocore.config import Config
import boto3
from concurrent.futures import ThreadPoolExecutor

s3 = boto3.client("s3", config=Config(max_pool_connections=32))
with ThreadPoolExecutor(max_workers=32) as pool:
    pool.map(lambda key: s3.head_object(Bucket="media-bucket", Key=key), keys)
```

**Serveurs et conteneurs.** Sur EC2, la simultanéité vient du nombre d'instances : un groupe **EC2 Auto Scaling** avec suivi de cible (CPU moyen, `ALBRequestCountPerTarget` ou backlog SQS par instance), une période de préchauffage égale au temps de démarrage, et une mise à l'échelle planifiée ou prédictive pour les pics connus. Les services ECS mettent leurs tâches à l'échelle avec Service Auto Scaling.

> **Conseil d'examen.** Des erreurs « too many connections » sur Amazon RDS ou Aurora après un pic de trafic Lambda, avec le MOINS de modifications du code : RDS Proxy. Une instance de base de données plus grande ne fait que déplacer la limite.

<!-- section: memory-compute | objectives: 4.3.2 -->
## Optimiser la mémoire et la puissance de calcul

**Lambda.** La mémoire est le seul réglage de dimensionnement : de 128 Mo (par défaut) à 10 240 Mo par pas de 1 Mo, et **le processeur est alloué proportionnellement à la mémoire** (l'équivalent d'un vCPU à 1 769 Mo). Une fonction limitée par le CPU, le réseau ou la mémoire s'exécute souvent beaucoup plus vite avec plus de mémoire, et la durée plus courte compense le prix plus élevé par Go-seconde.

| Signal | Action |
| --- | --- |
| `Max Memory Used` de la ligne de journal `REPORT` proche de `Memory Size` | Augmenter la mémoire (risque d'erreurs de mémoire insuffisante) |
| `Max Memory Used` très inférieur à `Memory Size` et durée stable quand la mémoire baisse | Réduire la mémoire |
| Code limité par le CPU, durée longue | Augmenter la mémoire pour obtenir plus de CPU ; tester avec AWS Lambda Power Tuning |
| Code intensif en calcul dont toutes les dépendances existent en arm64 | Passer à l'architecture `arm64` (AWS Graviton) pour un meilleur rapport prix/performances ; reconstruire le package, les couches et les images de conteneur |
| Gros fichiers temporaires | Augmenter le stockage éphémère (`/tmp`, de 512 Mo à 10 240 Mo) |

- **AWS Lambda Power Tuning** (open source, sur Step Functions dans votre compte) exécute la fonction avec plusieurs réglages de mémoire et compare coût et vitesse.
- **AWS Compute Optimizer** (sur inscription) recommande la mémoire Lambda (fonctions x86_64) et les tailles pour EC2, les groupes Auto Scaling, EBS et ECS sur Fargate, à partir de 14 jours de métriques CloudWatch (93 jours avec les métriques d'infrastructure améliorées, payantes).

**EC2 et conteneurs.** Choisissez la famille selon le goulet d'étranglement (C pour le CPU, R pour la mémoire, I pour les E/S locales) ; publiez la mémoire avec l'agent CloudWatch (ce n'est pas une métrique EC2 par défaut). Dans une définition de tâche ECS, `memory` est la limite stricte du conteneur et `memoryReservation` sa limite souple.

```bash
# Raise memory (and therefore CPU) for a CPU-bound function
aws lambda update-function-configuration \
  --function-name thumbnailer \
  --memory-size 2048
```

> **Piège d'examen.** Une fonction Lambda n'a pas de réglage CPU. « La fonction est limitée par le CPU » se résout en augmentant la mémoire, pas avec la simultanéité provisionnée ni un délai d'expiration plus long.

<!-- section: messaging | objectives: 4.3.3 -->
## Optimiser la messagerie avec SQS et SNS

**Producteurs et consommateurs Amazon SQS.**

| Objectif | Réglage |
| --- | --- |
| Moins de réponses vides et d'appels d'API | Interrogation longue (long polling) : `WaitTimeSeconds` ou l'attribut de file `ReceiveMessageWaitTimeSeconds` supérieur à 0, jusqu'à 20 s |
| Moins de requêtes par message | `SendMessageBatch`, `DeleteMessageBatch`, `ReceiveMessage` avec jusqu'à 10 messages par appel |
| Charge utile supérieure à 1 Mio (maximum SQS) | Charge utile dans S3, pointeur dans le message (Extended Client Library) |
| Pas de double traitement | Délai de visibilité supérieur à la durée de traitement |

**Mappage de source d'événement Lambda pour SQS** (Lambda effectue l'interrogation longue et supprime les messages des lots réussis) :

- **Taille de lot** : jusqu'à 10 000 (file standard ; au-delà de 10, une fenêtre de traitement par lots d'au moins 1 seconde est requise), 10 (FIFO). La fenêtre de traitement par lots (jusqu'à 5 minutes) donne des invocations moins nombreuses et plus grosses.
- **Délai de visibilité** de la file : au moins **6 fois le délai d'expiration de la fonction** (plus la fenêtre de traitement par lots) ; `maxReceiveCount` de la politique de redirection (redrive policy) d'au moins 5.
- **Réponse de lot partielle** : activez `ReportBatchItemFailures` et renvoyez les valeurs `itemIdentifier` en échec, pour que seuls ces messages reviennent dans la file.
- **Mise à l'échelle** : 5 invocations simultanées au départ, jusqu'à 300 de plus par minute, jusqu'à 1 250 par mappage. La **simultanéité maximale** (maximum concurrency, de 2 à 1 000) plafonne les consommateurs d'une file ; gardez une simultanéité réservée au moins égale. Le **mode provisionné** (pollers, coût supplémentaire) monte en charge 3 fois plus vite et exclut la simultanéité maximale.
- **FIFO** : la simultanéité est limitée par le nombre d'ID de groupe de messages.

```bash
aws lambda update-event-source-mapping \
  --uuid a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 5 \
  --function-response-types ReportBatchItemFailures \
  --scaling-config '{"MaximumConcurrency": 50}'
```

**Diffusion (fan-out) Amazon SNS.** Publiez une fois dans une rubrique et abonnez une file SQS par consommateur : chaque consommateur reçoit sa copie, évolue et tombe en panne indépendamment. Optimisez-la avec :

- Des **politiques de filtre** sur les abonnements (attributs de message, ou corps JSON avec `FilterPolicyScope` = `MessageBody`) : chaque file ne reçoit que ce qu'elle traite.
- La **livraison de messages bruts** (raw message delivery : SQS, HTTP/S, Firehose) pour supprimer l'enveloppe JSON de SNS.
- **`PublishBatch`** (10 messages par appel). Taille maximale de message de 256 Kio par défaut, jusqu'à 1 Mio avec l'attribut `MaximumMessageSize` de la rubrique ; les charges utiles plus grandes passent par S3 avec les Extended Client Libraries.

```json
{
  "eventType": ["order_shipped"],
  "country": ["FR", "BE"]
}
```

> **Piège d'examen.** Un consommateur qui reçoit tous les messages d'une rubrique et en ignore 90 % a besoin d'une politique de filtre SNS sur son abonnement, pas de modifications du code ni d'une rubrique par type de message.

<!-- section: caching | objectives: 4.3.4 -->
## Mettre en œuvre la mise en cache

| Où se trouve le travail répété | Cache |
| --- | --- |
| Lectures DynamoDB à cohérence éventuelle répétées, latence de l'ordre de la microseconde | DynamoDB Accelerator (DAX) |
| Résultats SQL, objets calculés, sessions, classements | Amazon ElastiCache (Valkey, Redis OSS, Memcached) |
| Contenu statique et contenu dynamique pouvant être mis en cache, pour des utilisateurs du monde entier | Amazon CloudFront |
| Réponses d'une étape d'API REST | Mise en cache API Gateway |
| Configuration et secrets lus à chaque invocation | Variables hors du gestionnaire, ou AWS Parameters and Secrets Lambda Extension (cache local, TTL de 300 s par défaut) |

**Stratégies ElastiCache.**

| Stratégie | Principe | Point fort | Point faible |
| --- | --- | --- | --- |
| Chargement différé (lazy loading, cache-aside) | Lire le cache ; en cas d'échec, lire la base de données et écrire le résultat dans le cache | Seules les données demandées sont mises en cache ; la panne d'un nœud n'est pas fatale | Pénalité d'échec de 3 allers-retours ; données parfois obsolètes |
| Écriture directe (write-through) | Écrire dans le cache à chaque écriture dans la base de données | Les données du cache ne sont jamais obsolètes | Pénalité en écriture ; met en cache des données jamais lues (churn) ; les nouveaux nœuds manquent de données |
| TTL sur chaque clé | Les clés expirent après un nombre de secondes | Borne l'obsolescence et l'espace gaspillé | Les clés expirées provoquent des échecs de cache |

Combinez-les avec un TTL. Valkey ou Redis OSS pour la réplication, le basculement, les ensembles triés et les hachages, la publication/abonnement, les sauvegardes ; Memcached pour un cache clé-valeur simple et multithread.

**DAX.** Compatible avec l'API DynamoDB (remplacez le client par le client DAX, dans un VPC). Le **cache d'éléments** (item cache) contient les résultats `GetItem`/`BatchGetItem`, le **cache de requêtes** (query cache) les résultats `Query`/`Scan`, TTL de 5 minutes par défaut. Les écritures vont dans DynamoDB puis dans DAX (écriture directe). **Les lectures à cohérence forte sont transmises à DynamoDB et ne sont pas mises en cache** ; DAX ne convient pas aux tables à forte intensité d'écriture.

**CloudFront.** Un `Cache-Control: max-age` long (ou `s-maxage` pour CloudFront seul) à l'origine ; dans la clé de cache, uniquement les chaînes de requête, en-têtes et cookies qui changent la réponse ; des comportements distincts pour les chemins statiques et dynamiques ; Origin Shield devant l'origine. TTL par défaut sans politique de cache : 24 heures. Pour des mises à jour fréquentes, préférez les **noms de fichiers versionnés** aux invalidations.

**API Gateway (REST).** Cache d'étape facturé à l'heure, TTL de 300 s par défaut, 3 600 au maximum, 0 le désactive ; seul `GET` est mis en cache par défaut ; clés issues des paramètres de méthode. `Cache-Control: max-age=0` actualise une entrée pour les clients autorisés à `execute-api:InvalidateCache`.

> **Piège d'examen.** DAX n'accélère pas une charge qui utilise `ConsistentRead=True` : ces lectures contournent le cache. Acceptez des lectures à cohérence éventuelle ou choisissez une autre solution.

<!-- section: bottlenecks | objectives: 4.3.5 -->
## Détecter les goulets d'étranglement de performance avec CloudWatch

| Symptôme | Métrique ou outil | Correction type |
| --- | --- | --- |
| Requêtes Lambda rejetées | `Throttles`, `ConcurrentExecutions` | Augmentation de quota, simultanéité réservée, tampon SQS |
| Latence sur les premières requêtes | `Init Duration` des lignes `REPORT`, `ProvisionedConcurrencySpilloverInvocations` | Simultanéité provisionnée, SnapStart, initialisation allégée |
| Consommateur de flux en retard | `IteratorAge` (Kinesis, DynamoDB Streams) | Lot plus grand, facteur de parallélisation, plus de partitions (shards) |
| Backlog de file qui grossit | `ApproximateNumberOfMessagesVisible`, `ApproximateAgeOfOldestMessage` | Plus de consommateurs, lots plus grands, simultanéité maximale |
| API lente | `Latency` d'API Gateway comparée à `IntegrationLatency` | Écart = surcharge d'API Gateway ; `IntegrationLatency` élevée = backend |
| Limitation DynamoDB sur quelques clés | `ThrottledRequests`, CloudWatch Contributor Insights for DynamoDB (clés les plus consultées et les plus limitées) | Meilleure clé de partition, partitionnement des écritures (write sharding), DAX pour les lectures |
| SQL lent | CloudWatch Database Insights (charge de la base par attentes, instructions SQL, hôtes, utilisateurs) | Indexer ou réécrire l'instruction principale, réplicas en lecture |

Outils :

- **CloudWatch Logs Insights** sur les lignes `REPORT` de Lambda (`@duration`, `@maxMemoryUsed`, `@memorySize`).
- **Lambda Insights** (couche d'extension) : CPU, mémoire, disque, réseau, démarrages à froid.
- **CloudWatch Application Signals** : latence, erreurs et SLO par service, carte de topologie, instrumentation OpenTelemetry (ADOT).
- **Traces X-Ray** : le segment lent (appel en aval, requête SQL). Instrumentez avec OpenTelemetry (ADOT) : SDK et démon X-Ray en mode maintenance depuis le 25 février 2026, fin du support le 25 février 2027.
- Les **centiles** (`p99`) et les alarmes de **détection d'anomalies** révèlent la latence de queue que les moyennes masquent.

```text
filter @type = "REPORT"
| stats avg(@duration), pct(@duration, 99), max(@maxMemoryUsed / 1000 / 1000) as maxMemoryMB by bin(5m)
```

> **Conseil d'examen.** Une `Latency` élevée avec une `IntegrationLatency` faible signifie que le temps est passé dans API Gateway (par exemple un mécanisme d'autorisation Lambda sans mise en cache des résultats), pas dans le backend.

<!-- section: ai-tools | objectives: 4.3.6 -->
## Utiliser les outils d'IA d'AWS pour trouver des opportunités d'optimisation

| Besoin | Outil |
| --- | --- |
| Revoir le code pour trouver les inefficacités, proposer une version optimisée et ses tests | Kiro (IDE, CLI) : agent sur le code, specs pour une refactorisation, fichiers de steering avec les règles de performance, hooks sur les modifications de fichiers, serveurs MCP pour la télémétrie |
| La même revue par IA dans un pipeline | Kiro CLI en mode headless dans une étape CodeBuild, ou un appel Amazon Bedrock depuis le build |
| Lignes de code les plus coûteuses à l'exécution | Amazon CodeGuru Profiler : machine learning sur les profils d'applications Java/JVM et Python en production (Lambda compris) |
| Investigation d'incidents et recommandations sur l'observabilité, l'infrastructure, les pipelines, la résilience | AWS DevOps Agent (disponible pour tous depuis le 31 mars 2026) ; transmet les améliorations de code à Kiro |
| Hypothèses de cause racine pendant un incident | CloudWatch investigations (IA générative sur les métriques, journaux, traces, déploiements) |
| Redimensionnement d'après l'utilisation | AWS Compute Optimizer |

Constats typiques d'une revue de code par IA : un client SDK créé dans le gestionnaire, un `Scan` avec filtre là où un `Query` sur une clé ou un GSI suffit, des appels séquentiels qui peuvent être regroupés (`BatchGetItem`, `SendMessageBatch`) ou parallélisés, des lectures répétées sans cache. Traitez le résultat comme une proposition : un développeur la relit et une mesure (Power Tuning, test de charge, métriques avant et après) confirme le gain.

Novembre 2026 : Amazon Q Developer fermé aux nouvelles inscriptions le 15 mai 2026 (successeur Kiro) ; Amazon DevOps Guru fermé aux nouveaux clients le 29 octobre 2026 (utilisez la détection d'anomalies CloudWatch et AWS DevOps Agent) ; CodeGuru Reviewer fermé aux nouveaux clients le 7 novembre 2025.

> **Piège d'examen.** Pour une nouvelle équipe, un outil fermé aux nouveaux clients n'est jamais la bonne réponse : choisissez Kiro pour l'optimisation du code assistée par IA, pas Amazon Q Developer, et la détection d'anomalies CloudWatch ou AWS DevOps Agent, pas DevOps Guru.

<!-- section: key-points -->
## Points clés

- Simultanéité = requêtes par seconde × durée ; la simultanéité réservée limite, la simultanéité provisionnée pré-initialise (pas sur `$LATEST`), SnapStart accélère les démarrages à froid.
- Clients et connexions hors du gestionnaire ; RDS Proxy pour les connexions de base de données ; pools du SDK dimensionnés selon les threads.
- Le CPU de Lambda suit la mémoire : `Max Memory Used`, Power Tuning, Compute Optimizer ; arm64 pour le rapport prix/performances.
- SQS : interrogation longue, lots, délai de visibilité de 6 fois le délai d'expiration de la fonction, réponses de lot partielles, simultanéité maximale ; diffusion SNS avec politiques de filtre.
- ElastiCache : chargement différé, écriture directe, TTL ; DAX ne met en cache que les lectures à cohérence éventuelle ; clés de cache et TTL CloudFront ; cache API Gateway.
- Prouvez le goulet d'étranglement par une métrique : `Throttles`, `IteratorAge`, `ApproximateAgeOfOldestMessage`, `IntegrationLatency`, Contributor Insights, traces.
- Outils d'IA : Kiro, CodeGuru Profiler, AWS DevOps Agent, CloudWatch investigations ; jamais un service fermé aux nouveaux clients.
