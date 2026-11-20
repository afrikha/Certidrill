L'excellence opérationnelle à grande échelle signifie que le système détecte les problèmes, ajoute de la capacité et se rétablit avant qu'une personne ne soit alertée, et que chaque action automatisée est bornée pour ne jamais aggraver un incident. Les énoncés décrivent des flottes réparties sur de nombreux comptes et Régions, des quotas qui bloquent un lancement, une correction qui tourne en boucle, une politique de mise à l'échelle qui réagit trop tard ou une fonction Lambda qui perd des événements, et demandent la conception avec le bon signal d'état, la bonne limite de sécurité ou le bon runbook. Ce chapitre couvre la surveillance de l'état et de la capacité, la correction contrôlée, les politiques de mise à l'échelle, la récupération automatisée et les runbooks pour l'application des correctifs, la correction et la mise à l'échelle.

<!-- section: health-capacity | objectives: 5.4.1 -->
## Surveillance de l'état, planification de la capacité et réponses opérationnelles

Surveillez l'état à chaque couche et reliez chaque signal à une réponse :

| Couche | Signal | Réponse type |
| --- | --- | --- |
| Instance et cible | Vérifications d'état EC2, état des cibles de l'équilibreur de charge | Remplacement par Auto Scaling, récupération automatique EC2 |
| Application | Alarmes CloudWatch sur le taux d'erreur, la latence, l'ancienneté des files d'attente ; canaries ; taux de consommation des SLO | Mettre à l'échelle, restaurer, exécuter un runbook, alerter |
| Services AWS et événements planifiés | Événements AWS Health dans EventBridge (`source` `aws.health`) : problèmes, changements planifiés comme la mise hors service d'une instance, notifications de compte | Runbook Automation, ticket, notification |
| Toute l'organisation | Vue organisationnelle d'AWS Health avec un administrateur délégué, qui agrège les événements de tous les comptes membres | Équipe d'exploitation centrale |
| Limites | Métriques d'utilisation de Service Quotas (`AWS/Usage`) | Augmentation de quota avant que la limite ne bloque un lancement ou un basculement |

```json
{
  "source": ["aws.health"],
  "detail-type": ["AWS Health Event"],
  "detail": {
    "service": ["EC2"],
    "eventTypeCategory": ["scheduledChange"]
  }
}
```

Une règle EventBridge ne voit que les événements Health de son propre compte ; agrégez-les via la vue organisationnelle. Les événements publics peuvent mettre jusqu'à une heure à arriver après la création de la règle.

**Planification de la capacité** :

- **Alarmes de quota** : une alarme CloudWatch sur l'utilisation divisée par `SERVICE_QUOTA(usage)` avertit, par exemple, à 80 % du quota de vCPU On-Demand de la Région de reprise.
- **Service Quotas Automatic Management** : *Notify Only* envoie des notifications à 80 % et 95 % d'utilisation ; *Notify and Auto-Adjust* crée aussi des demandes d'augmentation, uniquement pour les quotas qui prennent en charge l'approbation automatisée. Les notifications arrivent par e-mail, Slack ou l'application mobile de la console, dans le tableau de bord AWS Health et dans EventBridge.
- **Modèles de demande de quota** (Organizations avec toutes les fonctionnalités) : jusqu'à 10 augmentations de quota demandées automatiquement pour chaque **nouveau** compte créé dans l'organisation ; les comptes existants ne sont pas modifiés ; pas dans les Régions à activation manuelle (opt-in).
- Les **réservations de capacité à la demande** (On-Demand Capacity Reservations) garantissent des instances d'un type dans une zone de disponibilité, sans engagement de durée, facturées qu'elles soient utilisées ou non : le moyen d'être sûr que la capacité existe pour un basculement ou un événement.
- **Compute Optimizer** et les prévisions de la mise à l'échelle prédictive montrent les tendances pour le dimensionnement et la marge.

```bash
aws cloudwatch put-metric-alarm --alarm-name dr-region-vcpu-80pct \
  --comparison-operator GreaterThanThreshold --threshold 80 --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-west-2:111122223333:capacity-team \
  --metrics '[{"Id":"usage","ReturnData":false,"MetricStat":{"Metric":{"Namespace":"AWS/Usage","MetricName":"ResourceCount","Dimensions":[{"Name":"Service","Value":"EC2"},{"Name":"Type","Value":"Resource"},{"Name":"Resource","Value":"vCPU"},{"Name":"Class","Value":"Standard/OnDemand"}]},"Period":300,"Stat":"Maximum"}},{"Id":"pct","Expression":"100 * usage / SERVICE_QUOTA(usage)","Label":"vCPU quota used","ReturnData":true}]'
```

> **Piège d'examen.** Une Région de secours en veille active (warm standby) qui n'a jamais porté la production a souvent les quotas par défaut : le basculement échoue alors sur les limites de lancement. Planifiez les quotas par Région (alarmes, gestion automatique ou modèles pour les nouveaux comptes) et réservez la capacité critique ; les politiques de mise à l'échelle ne peuvent pas dépasser un quota.

<!-- section: controlled-remediation | objectives: 5.4.2 -->
## Correction contrôlée avec contraintes de sécurité

Une automatisation sans limites transforme une petite panne en interruption (tempête de nouvelles tentatives, boucle de correction, toutes les instances redémarrées en même temps). Chaque modèle a ses mécanismes AWS :

| Modèle de sécurité | Objectif | Mise en œuvre AWS |
| --- | --- | --- |
| Disjoncteur (circuit breaker) | Cesser d'appeler ou d'agir sur ce qui échoue sans cesse, puis sonder avant de reprendre | Disjoncteur applicatif avec état dans DynamoDB ou ElastiCache ; disjoncteur de déploiement ECS ; la correction automatique AWS Config s'arrête après `MaximumAutomaticAttempts` (1 à 25, 5 par défaut) échecs dans `RetryAttemptSeconds` (60 par défaut) et enregistre une exception de correction |
| Limites de débit | Plafonner la vitesse à laquelle requêtes ou actions atteignent une cible | Limitation d'API Gateway (débit et rafale par étape, méthode ou plan d'utilisation ; les clients reçoivent un 429) ; règles basées sur le débit d'AWS WAF ; seuils de simultanéité et d'erreurs de Systems Manager ; `ConcurrentExecutionRatePercentage` et `ErrorPercentage` de Config ; SQS comme tampon |
| Cloisonnement (bulkhead) | Isoler les pannes pour qu'un consommateur ou un locataire ne puisse pas épuiser la capacité partagée | Simultanéité réservée par fonction Lambda ; files d'attente et pools de consommateurs séparés par priorité ou par locataire ; architecture cellulaire ; comptes séparés |
| Nouvelles tentatives avec backoff exponentiel et gigue (jitter) | Absorber les erreurs transitoires sans vagues de tentatives synchronisées | Mode standard des SDK AWS (3 tentatives par défaut, gigue complète, un quota de tentatives qui stoppe les nouvelles tentatives quand il est épuisé) ; le mode adaptatif ajoute une limitation de débit côté client ; `Retry` de Step Functions |
| Approbation humaine et périodes de gel | Garder une personne dans la boucle pour les étapes risquées | Étape `aws:approve` dans Automation ; Systems Manager Change Calendar bloque les runbooks pendant un gel |
| Conditions d'arrêt | Abandonner automatiquement quand l'état se dégrade | Une alarme CloudWatch associée à une exécution Automation l'annule ; les expériences FIS s'arrêtent sur alarme |

Les mécanismes de nouvelle tentative de Step Functions utilisent par défaut `IntervalSeconds` 1, `MaxAttempts` 3 et `BackoffRate` 2.0 ; `MaxDelaySeconds` plafonne l'attente et `JitterStrategy` `FULL` la rend aléatoire :

```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Parameters": { "FunctionName": "arn:aws:lambda:eu-west-1:111122223333:function:charge-card", "Payload.$": "$" },
  "Retry": [
    {
      "ErrorEquals": ["Lambda.TooManyRequestsException", "States.Timeout"],
      "IntervalSeconds": 2,
      "MaxAttempts": 4,
      "BackoffRate": 2.0,
      "MaxDelaySeconds": 30,
      "JitterStrategy": "FULL"
    }
  ],
  "Catch": [ { "ErrorEquals": ["States.ALL"], "Next": "RefundAndNotify" } ],
  "Next": "ConfirmOrder"
}
```

Ne réessayez qu'à une seule couche : trois couches qui tentent chacune trois fois envoient jusqu'à 27 requêtes à une dépendance déjà en difficulté. Les opérations réessayées doivent être idempotentes (une clé d'idempotence stockée dans DynamoDB, par exemple).

> **Piège d'examen.** « Corriger automatiquement les instances non conformes de 2 000 comptes sans risquer une interruption de toute la flotte » exige à la fois l'automatisation et des limites : un runbook Automation avec des seuils de simultanéité et d'erreurs (ou une correction Config avec des contrôles d'exécution), pas une fonction Lambda qui parcourt toutes les instances d'un coup.

<!-- section: scaling-policies | objectives: 5.4.3 -->
## Mise à l'échelle basée sur les métriques, planifiée et prédictive

| Politique | Mode de décision | À utiliser pour |
| --- | --- | --- |
| Suivi de cible (target tracking) | Maintient une métrique à une valeur cible ; crée et gère ses propres alarmes (ne les modifiez pas) ; augmente vite et réduit progressivement | Le choix par défaut pour la plupart des charges : `ASGAverageCPUUtilization`, `ALBRequestCountPerTarget`, une métrique personnalisée comme l'arriéré de file d'attente par instance |
| Mise à l'échelle par étapes | Ajuste de quantités différentes selon l'ampleur du dépassement de l'alarme | Contrôle fin, plusieurs seuils |
| Mise à l'échelle simple | Un ajustement, puis attente de la période de stabilisation (cooldown) | Hérité ; préférez les étapes ou le suivi de cible |
| Planifiée | Fixe la capacité minimale, maximale ou souhaitée à une heure donnée (ponctuelle ou cron, avec un fuseau horaire) | Événements connus : une vente qui commence à 9 h, arrêt nocturne des flottes de test |
| Prédictive (groupes Auto Scaling) | Prévoit la charge à partir de l'historique et lance la capacité en avance | Profils récurrents quotidiens ou hebdomadaires, applications à initialisation longue |

La **mise à l'échelle prédictive** a besoin d'au moins 24 heures de données de métrique (deux semaines donnent de meilleures prévisions), analyse jusqu'à 14 jours, prévoit les 48 heures suivantes heure par heure et se met à jour toutes les 6 heures. Elle démarre en mode **prévision seule** (forecast only) pour comparer la prévision et la charge réelle ; le mode **prévision et mise à l'échelle** (forecast and scale) lance ensuite la capacité. Elle ne réduit jamais la capacité à partir de la prévision : associez-la à une politique de suivi de cible ; quand plusieurs politiques sont actives, le groupe retient la capacité souhaitée la plus élevée. `SchedulingBufferTime` lance les instances avant l'heure prévue ; `MaxCapacityBreachBehavior` `IncreaseMaxCapacity` avec un `MaxCapacityBuffer` permet de dépasser le maximum du groupe.

```bash
aws autoscaling put-scaling-policy --auto-scaling-group-name web-prod \
  --policy-name cpu-target-50 --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{"PredefinedMetricSpecification":{"PredefinedMetricType":"ASGAverageCPUUtilization"},"TargetValue":50}'
aws autoscaling put-scaling-policy --auto-scaling-group-name web-prod \
  --policy-name cpu-predictive --policy-type PredictiveScaling \
  --predictive-scaling-configuration '{"MetricSpecifications":[{"TargetValue":50,"PredefinedMetricPairSpecification":{"PredefinedMetricType":"ASGCPUUtilization"}}],"Mode":"ForecastAndScale","SchedulingBufferTime":600}'
aws autoscaling put-scheduled-update-group-action --auto-scaling-group-name web-prod \
  --scheduled-action-name black-friday --start-time 2026-11-27T07:00:00Z --min-size 40 --max-size 200
```

Fonctionnalités complémentaires : le **préchauffage d'instance par défaut** (default instance warmup) exclut les nouvelles instances de la métrique jusqu'à ce qu'elles servent du trafic ; les **groupes d'instances préinitialisées** (warm pools) gardent des instances prêtes (arrêtées ou en veille prolongée) pour les applications qui mettent des minutes à démarrer ; les **hooks de cycle de vie** exécutent la configuration avant la mise en service d'une instance.

**Application Auto Scaling** applique le suivi de cible, les étapes et la planification à d'autres ressources : nombre souhaité de tâches d'un service ECS, capacité provisionnée DynamoDB, réplicas Aurora, simultanéité provisionnée Lambda, variantes de points de terminaison SageMaker AI (sur `InvocationsPerInstance`), etc.

> **Conseil d'examen.** « Le trafic augmente chaque jour de semaine à 8 h et les instances mettent 10 minutes à démarrer ; les utilisateurs voient des erreurs pendant les premières minutes » désigne la mise à l'échelle prédictive (prévision et mise à l'échelle avec une marge de planification) avec le suivi de cible, ou des warm pools. Un événement unique à une heure connue relève d'une action planifiée.

<!-- section: failure-recovery | objectives: 5.4.4 -->
## Récupération automatisée après défaillance par vérifications de l'état et remplacement

**EC2 Auto Scaling** considère les instances comme saines jusqu'à preuve du contraire. Les vérifications d'état EC2 s'appliquent toujours ; les vérifications de l'état Elastic Load Balancing, VPC Lattice et EBS sont facultatives ; des systèmes personnalisés signalent l'état avec `SetInstanceHealth`. Les vérifications facultatives démarrent après le délai de grâce de la vérification de l'état. Une instance défaillante est résiliée et remplacée à partir du modèle de lancement actuel ; une politique de maintenance des instances décide si les remplaçantes se lancent avant la résiliation de l'ancienne instance. Une instance autonome qui ne peut pas faire partie d'un groupe utilise la **récupération automatique EC2**, qui la déplace sur un nouveau matériel en cas d'échec de la vérification d'état du système et conserve son ID d'instance, ses adresses IP et ses volumes EBS.

**Amazon ECS** remplace les tâches via le planificateur de service quand un conteneur essentiel s'arrête, qu'une vérification de l'état du conteneur (`command`, `interval`, `timeout`, `retries`, `startPeriod`) le signale défaillant, ou que la vérification de l'état de l'équilibreur de charge échoue après `healthCheckGracePeriodSeconds`. Avec `maximumPercent` supérieur à 100, la tâche de remplacement démarre avant l'arrêt de la tâche défaillante.

La récupération d'**AWS Lambda** dépend du type d'appel :

| Appel | Nouvelles tentatives intégrées | Destination des échecs |
| --- | --- | --- |
| Synchrone (API Gateway, SDK) | Aucune : l'appelant réessaie | Erreur renvoyée à l'appelant |
| Asynchrone (S3, SNS, EventBridge) | 2 nouvelles tentatives par défaut (0 à 2), à environ 1 puis 2 minutes d'intervalle pour les erreurs de fonction ; limitations et erreurs système réessayées avec backoff jusqu'à l'âge maximal de l'événement (60 secondes à 6 heures, 6 heures par défaut) | Destination en cas d'échec (SQS, SNS, Lambda, EventBridge ou S3) avec l'enregistrement complet de l'appel ; ou une file d'attente de lettres mortes (SQS ou SNS) avec l'événement seul |
| Mappage de source d'événements Kinesis et DynamoDB Streams | Jusqu'au succès, à l'expiration de l'enregistrement ou aux limites `MaximumRetryAttempts` et `MaximumRecordAgeInSeconds` ; `BisectBatchOnFunctionError` scinde un lot en échec | Destination en cas d'échec (SQS, SNS, S3 ou une rubrique Kafka) |
| Mappage de source d'événements SQS | Le message réapparaît après le délai de visibilité | Politique de redirection (`maxReceiveCount`) vers une file d'attente de lettres mortes ; `ReportBatchItemFailures` ne réessaie que les messages en échec |

```bash
aws lambda update-function-event-invoke-config --function-name resize-image \
  --maximum-retry-attempts 1 --maximum-event-age-in-seconds 3600 \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:s3:::example-failed-invocations"}}'
aws lambda update-event-source-mapping --uuid a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
  --maximum-retry-attempts 5 --maximum-record-age-in-seconds 3600 --bisect-batch-on-function-error \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:sqs:eu-west-1:111122223333:stream-failures"}}'
```

Avec les paramètres par défaut, un enregistrement défectueux peut bloquer une partition (shard) Kinesis jusqu'à une semaine : fixez des limites de tentatives et d'âge et une destination en cas d'échec. Au-dessus de la couche de calcul, les vérifications de l'état Route 53 avec des enregistrements de basculement et le déplacement de zone (zonal shift) d'Amazon Application Recovery Controller détournent le trafic d'un point de terminaison ou d'une zone de disponibilité dégradés.

> **Piège d'examen.** Un groupe Auto Scaling qui n'utilise que les vérifications d'état EC2 conserve une instance dont l'application a planté, car le système d'exploitation réussit toujours les vérifications. Derrière un équilibreur de charge, activez le type de vérification de l'état ELB (avec un délai de grâce suffisant pour le démarrage).

<!-- section: runbooks-incident-response | objectives: 5.4.5 -->
## Runbooks automatisés et réponse aux incidents

Les runbooks **Systems Manager Automation** sont des documents composés d'étapes : ceux fournis par AWS (`AWS-RestartEC2Instance`, `AWS-DisableS3BucketPublicReadWrite`, runbooks de dépannage `AWSSupport-*`) et des runbooks personnalisés construits à partir d'actions comme `aws:executeAwsApi`, `aws:runCommand`, `aws:executeScript`, `aws:branch`, `aws:approve` et `aws:waitForAwsResourceProperty`.

```yaml
schemaVersion: '0.3'
description: Redeploy the orders service after approval and wait for steady state
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  AutomationAssumeRole:
    type: String
  ClusterName:
    type: String
  ServiceName:
    type: String
  Approvers:
    type: StringList
mainSteps:
  - name: approve
    action: aws:approve
    timeoutSeconds: 3600
    inputs:
      Approvers: '{{ Approvers }}'
      MinRequiredApprovals: 1
      Message: Force a new deployment of the orders service?
  - name: forceNewDeployment
    action: aws:executeAwsApi
    inputs:
      Service: ecs
      Api: UpdateService
      cluster: '{{ ClusterName }}'
      service: '{{ ServiceName }}'
      forceNewDeployment: true
  - name: waitForSteadyState
    action: aws:waitForAwsResourceProperty
    timeoutSeconds: 1800
    inputs:
      Service: ecs
      Api: DescribeServices
      cluster: '{{ ClusterName }}'
      services:
        - '{{ ServiceName }}'
      PropertySelector: '$.services[0].deployments[0].rolloutState'
      DesiredValues:
        - COMPLETED
```

| Déclencheur | Quand l'utiliser |
| --- | --- |
| Règle EventBridge (changement d'état d'alarme, événement AWS Health, résultat GuardDuty) | Réponse pilotée par les événements |
| Une alarme CloudWatch crée un OpsItem ; le runbook s'exécute depuis OpsCenter | Réponse assistée par un opérateur, avec le contexte |
| Règle AWS Config avec correction automatique | Dérive de configuration (compartiment public, chiffrement manquant) |
| Association State Manager | Maintenir un état souhaité selon une planification (agent installé, configuration appliquée) |
| Fenêtre de maintenance | Tâches perturbatrices dans un créneau convenu, avec contrôle du débit |

**Entre comptes et Régions**, exécutez le runbook depuis le compte de gestion ou un administrateur délégué : `AWS-SystemsManager-AutomationAdministrationRole` dans le compte central, `AWS-SystemsManager-AutomationExecutionRole` dans chaque compte cible (déployé avec StackSets), des emplacements cibles sous forme de comptes ou d'unités d'organisation plus des Régions, et deux niveaux de contrôle du débit : `TargetLocationMaxConcurrency` et `TargetLocationMaxErrors` par paire compte-Région, `TargetsMaxConcurrency` et `TargetsMaxErrors` par ressource. Les runbooks personnalisés doivent être partagés avec les comptes cibles.

**Application des correctifs** : une **politique de correctifs** (patch policy) Patch Manager créée avec Quick Setup couvre une organisation, des unités d'organisation ou des comptes choisis, et des Régions ; l'analyse et l'installation ont des planifications distinctes (par exemple analyse quotidienne, installation hebdomadaire), elle exécute `AWS-RunPatchBaseline` avec une base de référence de correctifs par système d'exploitation, et la conformité est signalée par paire compte-Région. Pour les flottes Auto Scaling, une approche immuable est souvent meilleure : EC2 Image Builder produit une AMI corrigée et une actualisation d'instances (instance refresh) remplace les instances par lots.

Les **runbooks de mise à l'échelle** préparent les événements (relever la capacité minimale, préchauffer, demander des quotas) avec une étape d'approbation, puis reviennent en arrière après l'événement.

**Procédure de réponse aux incidents** : détecter (alarme, taux de consommation d'un SLO), créer un OpsItem et notifier via SNS, exécuter les runbooks de diagnostic et d'atténuation, utiliser les investigations CloudWatch pour corréler les signaux, puis tenir une revue post-incident qui transforme chaque action manuelle en runbook. Incident Manager (plans de réponse, engagement de l'astreinte) est réservé aux clients existants depuis le 7 novembre 2025.

> **Conseil d'examen.** « Exécuter la même correction dans tous les comptes de trois unités d'organisation et quatre Régions, depuis un seul endroit, 10 % des comptes à la fois, en s'arrêtant si les erreurs dépassent 5 % » désigne une exécution Automation multicomptes avec `TargetLocationMaxConcurrency` et `TargetLocationMaxErrors`, pas un script qui enchaîne des appels `sts:AssumeRole`.

<!-- section: key-points -->
## Points clés

- Surveillez l'état à chaque couche ; acheminez les événements AWS Health (vue organisationnelle) et les alarmes via EventBridge vers des runbooks.
- Planifiez la capacité par Région : alarmes de quota avec `SERVICE_QUOTA()`, gestion automatique à 80 % et 95 %, modèles de demande de quota pour les nouveaux comptes, réservations de capacité pour la capacité de basculement critique.
- Bornez chaque automatisation : disjoncteurs, limites de débit, cloisonnement, backoff avec gigue, approbations, Change Calendar, conditions d'arrêt sur alarme, opérations idempotentes.
- Suivi de cible par défaut ; planifiée pour les événements connus ; prédictive pour les profils récurrents (pas de réduction, à associer au suivi de cible) ; warm pools pour les démarrages lents.
- Vérifications de l'état ELB pour Auto Scaling derrière un équilibreur de charge ; ECS remplace les tâches défaillantes ; nouvelles tentatives Lambda asynchrones de 0 à 2 avec destinations, les mappages de flux exigent des limites de tentatives et d'âge.
- Runbooks Automation avec contrôle du débit multicomptes ; politiques de correctifs ou actualisation par AMI immuable pour les correctifs ; OpsItems et SNS pour les incidents.
