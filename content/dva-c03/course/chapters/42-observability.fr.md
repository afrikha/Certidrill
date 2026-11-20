Les questions d'observabilité demandent ce que le code ou la configuration doit émettre pour que les problèmes puissent être trouvés plus tard : des journaux structurés au bon niveau et sans secrets, des métriques personnalisées publiées de la façon la moins coûteuse, des alarmes et des règles d'événements qui préviennent l'équipe, des traces qui suivent une requête à travers les services, et des vérifications de l'état (health checks) qui retirent une cible défaillante avant que les utilisateurs ne s'en aperçoivent.

<!-- section: structured-logging | objectives: 4.2.1 -->
## Journalisation structurée des événements d'application et des actions des utilisateurs

Écrivez les journaux sous forme d'**objets JSON**, un par événement, avec des clés cohérentes : horodatage, niveau, message, service, un **ID de corrélation** (ID de requête, ID de trace, ID de commande) et le contexte métier (action de l'utilisateur, ID de l'entité). CloudWatch Logs Insights découvre automatiquement les clés JSON, qui peuvent être filtrées et agrégées ; un texte libre doit d'abord être analysé.

```json
{
  "timestamp": "2026-11-20T09:15:02.118Z",
  "level": "INFO",
  "message": "order placed",
  "service": "checkout",
  "requestId": "79b4f56e-95b1-4643-9700-2807f4e68189",
  "xrayTraceId": "1-6736a1b2-0f3c5d7e9a1b2c3d4e5f6a7b",
  "userAction": "PlaceOrder",
  "orderId": "o-1234",
  "amount": 59.9
}
```

Les **contrôles de journalisation avancés de Lambda** suppriment l'essentiel du code :

| Paramètre | Valeurs et comportement |
| --- | --- |
| Format des journaux | `Text` (par défaut) ou `JSON` ; en JSON, Lambda écrit ses journaux système et les journaux d'application des environnements d'exécution pris en charge (Python, Node.js, Java, .NET) en JSON avec `timestamp`, `level`, `message` et l'ID de requête, sans modifier le code |
| Niveau des journaux d'application | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL` : les niveaux inférieurs ne sont pas envoyés à CloudWatch Logs |
| Niveau des journaux système | `DEBUG`, `INFO`, `WARN` pour les événements de la plateforme (début, fin, rapport) |
| Groupe de journaux | Un groupe de journaux personnalisé au lieu de `/aws/lambda/<function-name>`, par exemple partagé par les fonctions d'une même application |

Quand vous passez en JSON sans choisir de niveaux, les deux niveaux valent `INFO` par défaut.

```yaml
  CheckoutFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: src/
      LoggingConfig:
        LogFormat: JSON
        ApplicationLogLevel: INFO
        SystemLogLevel: WARN
        LogGroup: /checkout/functions
```

**Powertools for AWS Lambda** (Python, TypeScript, Java, .NET) ajoute un Logger qui écrit du JSON structuré avec le contexte Lambda et un ID de corrélation tiré de l'événement.

Autres pratiques attendues à l'examen :

- Définissez une **période de conservation** sur chaque groupe de journaux (`aws logs put-retention-policy`) ; par défaut, les journaux n'expirent jamais et continuent de coûter.
- Sur les conteneurs, envoyez stdout et stderr vers CloudWatch Logs avec le pilote de journaux `awslogs` (ECS) ou un agent de journaux ; sur EC2, utilisez l'agent CloudWatch.
- **Ne journalisez jamais de secrets, de jetons ni de charges utiles complètes contenant des données personnelles.** En filet de sécurité, une **politique de protection des données** CloudWatch Logs détecte les données sensibles (informations d'identification, données financières, PII, PHI, identifiants d'appareils) avec des identificateurs de données gérés ou personnalisés et les **masque à l'ingestion**, à chaque point de sortie (console, Logs Insights, filtres de métriques et d'abonnement). Seuls les principaux disposant de `logs:Unmask` voient l'original. Une politique peut s'appliquer à un groupe de journaux ou à tout le compte ; les détections produisent la métrique `LogEventsWithFindings` dans l'espace de noms `AWS/Logs`.

> **Piège d'examen.** Une politique de protection des données ne masque que les événements ingérés après sa création, et elle n'empêche pas l'application d'envoyer les données. « Garantir que les numéros de carte bancaire déjà écrits par la fonction ne soient jamais visibles des ingénieurs du support » exige la politique, un code qui cesse de les journaliser, et le traitement des événements existants.

<!-- section: custom-metrics | objectives: 4.2.2 -->
## Mettre en œuvre du code qui émet des métriques personnalisées

Une métrique personnalisée appartient à un **espace de noms** (namespace) que vous choisissez (ne commençant pas par `AWS/`), a un nom, une **unité** facultative et jusqu'à **30 dimensions** (paires nom-valeur). Chaque combinaison unique de valeurs de dimensions est une métrique distincte, facturée : n'utilisez jamais comme dimension une valeur à forte cardinalité comme un ID d'utilisateur ou de requête.

| Méthode | Fonctionnement | À choisir quand |
| --- | --- | --- |
| API `PutMetricData` | Le SDK ou la CLI appelle directement CloudWatch ; valeurs ou jeux de statistiques ; résolution standard (60 s) ou haute résolution (1 s) | Code hors de Lambda, faible volume d'appels, la métrique doit exister immédiatement |
| **Format de métrique intégré** (EMF, embedded metric format) | Le code écrit une ligne de journal JSON avec un bloc `_aws` ; CloudWatch extrait les métriques de façon asynchrone | Lambda et conteneurs : aucun appel d'API supplémentaire, aucune latence ajoutée, le journal garde le contexte à forte cardinalité |
| **Filtre de métriques** | Un motif appliqué à un groupe de journaux existant compte ou extrait des valeurs | Aucune modification de code n'est permise |
| Agent CloudWatch (StatsD, collectd) | L'agent sur EC2 ou sur site publie des métriques système et applicatives | Métriques de mémoire et de disque des instances, code StatsD existant |
| Métriques OpenTelemetry | Un SDK OpenTelemetry exporte les métriques vers CloudWatch | Nouvelle instrumentation (AWS recommande OpenTelemetry pour les nouvelles implémentations) |

```json
{
  "_aws": {
    "Timestamp": 1763630102118,
    "CloudWatchMetrics": [
      {
        "Namespace": "AnyCompany/Checkout",
        "Dimensions": [["Service", "PaymentMethod"]],
        "Metrics": [
          { "Name": "OrderValue", "Unit": "None" },
          { "Name": "PaymentLatency", "Unit": "Milliseconds", "StorageResolution": 1 }
        ]
      }
    ]
  },
  "Service": "checkout",
  "PaymentMethod": "card",
  "OrderValue": 59.9,
  "PaymentLatency": 182,
  "orderId": "o-1234"
}
```

Limites d'EMF : jusqu'à 100 définitions de métriques par événement de journal, jusqu'à 30 clés de dimension par jeu de dimensions, horodatage au plus 14 jours dans le passé ou 2 heures dans le futur. Powertools Metrics écrit l'EMF pour vous.

```bash
aws cloudwatch put-metric-data --namespace AnyCompany/Checkout \
  --metric-name OrdersPlaced --unit Count --value 1 \
  --dimensions Service=checkout,Environment=prod
aws cloudwatch put-metric-data --namespace AnyCompany/Checkout \
  --metric-name PageLoadTime --unit Milliseconds \
  --statistic-values Sum=3120,Minimum=180,Maximum=1430,SampleCount=6
```

- La **haute résolution** (1 seconde) se lit avec des périodes de 1, 5, 10, 30 ou 60 secondes et permet des alarmes sur des périodes de 10 ou 30 secondes, pour un coût plus élevé.
- Un **jeu de statistiques** (statistic set) envoie Sum, Minimum, Maximum et SampleCount en un seul appel, mais les centiles ne sont alors plus disponibles.
- Chaque appel `PutMetricData` est facturé : regroupez les valeurs plutôt que de faire un appel par événement.

> **Conseil d'examen.** « Publier des métriques métier depuis une fonction Lambda sans ajouter de latence ni d'appels d'API » désigne le format de métrique intégré. « Créer une métrique à partir d'un journal existant sans modifier le code » désigne un filtre de métriques.

<!-- section: notification-alerts | objectives: 4.2.3 -->
## Alertes de notification pour les quotas, les déploiements et d'autres actions

Une **alarme CloudWatch** surveille une métrique (ou une expression de calcul de métriques) et passe d'un état à l'autre parmi `OK`, `ALARM` et `INSUFFICIENT_DATA`. Ses paramètres : statistique et **période**, seuil et comparaison, **périodes d'évaluation** et **points de données pour déclencher l'alarme** (« 3 sur 5 » ignore un pic isolé), et **traitement des données manquantes** (`missing`, `notBreaching`, `breaching`, `ignore`). Actions : publier sur une rubrique **Amazon SNS** (e-mail, SMS, Lambda, HTTPS, SQS), mettre à l'échelle un groupe Auto Scaling, arrêter ou récupérer une instance. Une **alarme composite** combine des alarmes avec AND/OR pour qu'un incident n'envoie qu'une notification.

```bash
aws cloudwatch put-metric-alarm --alarm-name checkout-errors \
  --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value=checkout \
  --statistic Sum --period 60 --evaluation-periods 5 --datapoints-to-alarm 3 \
  --threshold 5 --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:oncall
```

| Événement à notifier | Mécanisme |
| --- | --- |
| L'utilisation approche d'un quota de service (simultanéité Lambda, débit d'API) | Une alarme CloudWatch créée depuis la console Service Quotas sur la métrique d'utilisation du quota, qui notifie une rubrique SNS |
| Un déploiement se termine ou échoue | Une **règle EventBridge** sur l'événement de changement d'état de déploiement CodeDeploy, de changement d'état d'exécution CodePipeline ou d'état de pile CloudFormation, ciblant SNS, Lambda ou un webhook de messagerie |
| Un appel d'API précis a lieu (une clé est programmée pour suppression, une politique de compartiment change) | Règle EventBridge sur l'événement CloudTrail « AWS API Call via CloudTrail » |
| Un message d'erreur apparaît dans les journaux | Filtre de métriques + alarme |

```json
{
  "source": ["aws.codedeploy"],
  "detail-type": ["CodeDeploy Deployment State-change Notification"],
  "detail": {
    "state": ["SUCCESS", "FAILURE"],
    "application": ["checkout"]
  }
}
```

> **Piège d'examen.** Une alarme ne notifie qu'à un **changement d'état**. Une métrique qui reste au-dessus du seuil envoie une seule notification, pas une par période ; et une métrique sans données reste en `INSUFFICIENT_DATA`, sauf si les données manquantes sont traitées comme dépassant ou ne dépassant pas le seuil.

<!-- section: tracing | objectives: 4.2.4 -->
## Mettre en œuvre le traçage avec AWS X-Ray et OpenTelemetry

Une trace suit une requête à travers API Gateway, Lambda, les conteneurs et les appels en aval. L'ID de trace circule dans l'en-tête `X-Amzn-Trace-Id` (ou l'en-tête W3C `traceparent` avec OpenTelemetry). Chaque service ajoute un segment, chaque appel en aval un sous-segment ; ajoutez des **annotations** pour les valeurs sur lesquelles vous filtrerez (niveau de client, type de commande) et des **métadonnées** pour le reste.

L'**échantillonnage** (sampling) limite les coûts : la règle par défaut enregistre la première requête de chaque seconde (le réservoir) et 5 % des requêtes supplémentaires. Les règles personnalisées portent sur le service, l'hôte, la méthode ou le chemin d'URL, avec une priorité de 1 à 9999 (la plus basse est évaluée en premier). La décision est prise par le premier service instrumenté et suivie en aval.

Activer le traçage :

| Composant | Comment |
| --- | --- |
| Lambda | **Traçage actif** (`Tracing: Active` dans SAM, `TracingConfig` dans CloudFormation) ; le rôle d'exécution doit pouvoir envoyer des traces (`AWSXRayDaemonWriteAccess`) |
| API REST API Gateway | Activer le traçage X-Ray sur l'étape |
| Code de l'application (appels à DynamoDB, HTTP, SQL) | Un SDK **OpenTelemetry** ou l'**AWS Distro for OpenTelemetry** (ADOT) ; dans Lambda, la couche AWS Lambda Layer for OpenTelemetry ou la couche ADOT gérée par AWS |
| Collecte sur EC2, ECS, EKS | L'**agent CloudWatch** (il collecte les traces OpenTelemetry) ou un **OpenTelemetry Collector** avec l'exportateur X-Ray, en agent ou en side-car |

```yaml
Globals:
  Function:
    Tracing: Active
  Api:
    TracingEnabled: true
```

**Situation en 2026** : les SDK X-Ray et le démon X-Ray sont passés en **mode maintenance le 25 février 2026** (correctifs de sécurité uniquement) et atteignent leur fin de support le 25 février 2027. Le service AWS X-Ray continue ; les applications nouvelles et existantes doivent s'instrumenter avec OpenTelemetry et remplacer le démon par l'agent CloudWatch ou un OpenTelemetry Collector (arrêtez d'abord le démon : ils utilisent le même port).

```json
{
  "name": "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "value": "http://cwagent:4318/v1/traces"
}
```

**CloudWatch Application Signals** s'appuie sur l'instrumentation OpenTelemetry pour montrer les services, leurs dépendances, la latence, les erreurs et les objectifs de niveau de service (SLO) sans tableaux de bord personnalisés.

> **Piège d'examen.** Pour une nouvelle application en 2026, « instrumenter le code avec le SDK X-Ray et exécuter le démon X-Ray » n'est plus la meilleure réponse : utilisez OpenTelemetry (ADOT) avec l'agent CloudWatch ou un collecteur. Des traces absentes pour une fonction Lambda dont le traçage actif est activé signifient généralement que le rôle d'exécution ne peut pas écrire dans X-Ray.

<!-- section: workload-health | objectives: 4.2.5 -->
## Surveiller l'état de santé des charges de travail avec des vérifications et des sondes

| Vérification | Configurée sur | Effet d'un échec |
| --- | --- | --- |
| Vérification de l'état du groupe cible de l'équilibreur de charge | Protocole, port, **chemin** (par exemple `/health`), intervalle, délai d'expiration, seuils sain et non sain, codes de réussite | La cible ne reçoit plus de trafic jusqu'à ce qu'elle réussisse à nouveau |
| Vérification de l'état du groupe Auto Scaling | Type `EC2` (état de l'instance) ou `ELB` (aussi le verdict de l'équilibreur de charge), avec une période de grâce après le lancement | L'instance est résiliée et remplacée |
| `healthCheck` d'un conteneur ECS | Commande (`CMD-SHELL`), intervalle de 5 à 300 s (30 par défaut), délai de 2 à 60 s (5 par défaut), nouvelles tentatives de 1 à 10 (3 par défaut), `startPeriod` de 0 à 300 s | Un conteneur essentiel non sain rend la tâche non saine ; le service la remplace |
| Service ECS avec équilibreur de charge | `healthCheckGracePeriodSeconds` | Ignore les vérifications de l'équilibreur de charge pendant le démarrage d'une nouvelle tâche |
| Sondes Kubernetes sur EKS | `livenessProbe`, `readinessProbe`, `startupProbe` (HTTP, TCP, commande ou gRPC) | Échec de vivacité (liveness) : le conteneur redémarre. Échec de disponibilité (readiness) : le pod est retiré des points de terminaison du Service, sans redémarrage. Démarrage (startup) : les autres sondes attendent sa réussite |
| État de santé amélioré d'Elastic Beanstalk | Agent de santé sur les instances | Couleur et causes de l'état de l'environnement dans la console |
| Canary CloudWatch Synthetics | Un script (Node.js, Python ou Java) exécuté selon une planification, jusqu'à une fois par minute | Métriques dans l'espace de noms `CloudWatchSynthetics` et alarmes, même sans trafic utilisateur |

```json
{
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

```yaml
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

Concevez les points de terminaison avec soin : une vérification de **vivacité** teste uniquement le processus (elle ne doit pas échouer parce qu'une base de données est lente, sinon tous les conteneurs redémarrent en même temps) ; une vérification de **disponibilité** peut tester les dépendances dont l'instance a besoin avant de recevoir du trafic.

> **Conseil d'examen.** « Cesser d'envoyer du trafic à un pod pendant que son cache se remplit, sans le redémarrer » désigne une sonde de disponibilité (readiness probe). « Les instances réussissent les vérifications d'état EC2 mais l'application renvoie des erreurs 500 et Auto Scaling ne les remplace jamais » désigne le passage du groupe Auto Scaling aux vérifications de l'état ELB.

<!-- section: key-points -->
## Points clés

- Journaux JSON avec niveau et ID de corrélation ; journalisation avancée de Lambda (`LogFormat: JSON`, niveaux des journaux d'application et système, groupe de journaux personnalisé) ; conservation définie sur chaque groupe de journaux.
- Les politiques de protection des données masquent les données sensibles à l'ingestion ; `logs:Unmask` les révèle ; seuls les nouveaux événements sont masqués.
- Métriques personnalisées : EMF depuis Lambda et les conteneurs, `PutMetricData` ailleurs, filtres de métriques sans modification de code ; jusqu'à 30 dimensions, jamais à forte cardinalité ; haute résolution à 1 s.
- Alarmes : période, périodes d'évaluation, points de données pour l'alarme, traitement des données manquantes, actions SNS, alarmes composites ; alarmes de quota depuis Service Quotas ; règles EventBridge pour les changements d'état des déploiements.
- Traçage : traçage actif Lambda et traçage d'étape API Gateway ; annotations indexées ; échantillonnage par défaut 1 par seconde + 5 % ; SDK et démon X-Ray en maintenance depuis le 25 février 2026, utilisez OpenTelemetry (ADOT) avec l'agent CloudWatch ou un collecteur.
- Santé : vérifications des groupes cibles, vérifications ELB du groupe Auto Scaling, `healthCheck` ECS, sondes de vivacité (redémarrage) et de disponibilité (plus de trafic), canaries Synthetics.
