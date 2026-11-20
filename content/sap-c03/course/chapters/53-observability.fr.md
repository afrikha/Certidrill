Au niveau professionnel, les questions d'observabilité combinent plusieurs comptes et Régions, des conteneurs et du sans serveur, des charges de travail d'IA et des utilisateurs réels. Elles demandent quel standard d'instrumentation adopter maintenant que les SDK X-Ray sont en maintenance, comment une équipe centrale voit les journaux de tous les comptes sans les copier à la main, comment alerter sans bruit, quelle métrique prouve qu'un modèle ou un agent est sain, et comment traduire un objectif métier en SLO avec des alarmes de taux de consommation (burn rate). Ce chapitre traite chacun de ces points, dans l'ordre du guide d'examen.

<!-- section: standardized-instrumentation | objectives: 5.3.1 -->
## Instrumentation standardisée des métriques, journaux et traces

Le standard est **OpenTelemetry (OTel)** : une API et un SDK neutres par langage, un collecteur, un protocole (OTLP). **AWS Distro for OpenTelemetry (ADOT)** est la distribution prise en charge par AWS, avec des agents d'instrumentation automatique pour Java, Python, .NET et Node.js et une couche Lambda.

| Signal | Collecte sur AWS | Remarques |
| --- | --- | --- |
| Métriques d'infrastructure | Métriques fournies (EC2, ELB, RDS...) ; agent CloudWatch pour la mémoire, le disque, les processus | L'utilisation de la mémoire et du disque d'EC2 n'est pas fournie : elle exige l'agent |
| Métriques applicatives | Format de métrique intégrée (EMF) dans des journaux structurés, `PutMetricData`, métriques OTel | L'EMF transforme des lignes de journal en métriques sans appel d'API, idéal pour Lambda et les dimensions à forte cardinalité |
| Journaux | Agent CloudWatch, pilotes de journalisation Lambda et ECS, Fluent Bit | Logs Insights pour interroger ; filtres de métriques pour dériver des métriques |
| Traces | SDK ADOT ou OTel, puis l'agent CloudWatch ou un OTel Collector avec l'exportateur X-Ray | Les SDK et le démon X-Ray sont en mode maintenance depuis le 25 février 2026 (correctifs de sécurité uniquement) |

Deux fonctionnalités s'appuient sur ces traces :

- **Transaction Search** ingère 100 % des spans sous forme de journaux structurés dans le groupe de journaux `aws/spans` (traces jusqu'à 10 000 spans, recherche sur n'importe quel attribut) et en indexe un pourcentage sous forme de résumés de traces X-Ray (1 % est gratuit). C'est un prérequis d'AgentCore Observability.
- **CloudWatch Application Signals** instrumente automatiquement les services (EKS, ECS, EC2, Lambda) avec ADOT et publie des métriques standard par service et par opération (latence, pannes = 5xx, erreurs = 4xx), une carte des dépendances de l'application et des SLO. Sur EKS, il est fourni avec le module complémentaire Amazon CloudWatch Observability.

```json
{
  "agent": { "metrics_collection_interval": 60 },
  "metrics": {
    "namespace": "Orders/Host",
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  },
  "logs": {
    "logs_collected": {
      "files": { "collect_list": [ { "file_path": "/var/log/orders/app.log", "log_group_name": "/orders/app", "log_stream_name": "{instance_id}" } ] }
    }
  },
  "traces": {
    "traces_collected": {
      "otlp": { "grpc_endpoint": "0.0.0.0:4317", "http_endpoint": "0.0.0.0:4318" }
    }
  }
}
```

Un seul agent CloudWatch (version 1.300025.0 ou ultérieure) collecte ainsi les métriques, les journaux et les traces OTel, ce qui réduit le nombre d'agents à gérer.

> **Piège d'examen.** « Standardiser l'instrumentation entre les équipes et éviter la dépendance à un fournisseur » désigne OpenTelemetry avec ADOT, pas l'ajout du SDK X-Ray à chaque service. Et « ne tracer qu'un échantillon mais retrouver n'importe quelle transaction par son ID de commande » désigne Transaction Search (tous les spans stockés comme journaux), pas un taux d'échantillonnage X-Ray porté à 100 %.

<!-- section: container-monitoring | objectives: 5.3.2 -->
## Surveiller les applications conteneurisées

**CloudWatch Container Insights** collecte les métriques et les journaux d'ECS, d'EKS (y compris Fargate pour les deux) et de Kubernetes autogéré sur EC2. Les données sont écrites sous forme d'événements de journal de performance au format EMF, à partir desquels CloudWatch dérive des métriques agrégées au niveau du cluster, du nœud, du service, de la tâche et du pod ; un niveau de détail plus fin s'obtient avec des requêtes Logs Insights sur ces événements. Il n'est pas activé par défaut.

| Plateforme | Activation | Apport de l'observabilité améliorée |
| --- | --- | --- |
| Amazon ECS | Paramètre de compte ou de cluster `containerInsights` = `enhanced` (ou `enabled` pour la version d'origine) | Métriques au niveau de la tâche et du conteneur, tableaux de bord pour descendre du cluster au conteneur |
| Amazon EKS | Module complémentaire EKS Amazon CloudWatch Observability (`amazon-cloudwatch-observability`), qui exécute l'agent CloudWatch et Fluent Bit | Détail des conteneurs, pods, nœuds et plan de contrôle, avec une tarification à l'observation au lieu d'une tarification par métrique ; peut aussi activer Application Signals |

```bash
aws ecs put-account-setting-default --name containerInsights --value enhanced
aws ecs update-cluster-settings --cluster orders-prod --settings name=containerInsights,value=enhanced
aws eks create-addon --cluster-name payments-prod --addon-name amazon-cloudwatch-observability
```

Autres signaux des conteneurs :

- **Journaux** : le pilote `awslogs` envoie la sortie des conteneurs ECS à CloudWatch Logs ; **FireLens** (side-car Fluent Bit) l'achemine vers CloudWatch, Firehose, S3 ou OpenSearch avec filtrage. Sur EKS, Fluent Bit s'exécute en DaemonSet ; les journaux du plan de contrôle EKS (serveur d'API, audit, authentificateur, gestionnaire de contrôleurs, planificateur) s'activent par cluster et sont envoyés à CloudWatch Logs.
- **Traces** : un collecteur ADOT en side-car (ECS) ou en DaemonSet ou déploiement (EKS) reçoit l'OTLP de l'application.
- **Métriques Prometheus** : pour EKS, OTel Container Insights accepte les métriques via OTLP et prend en charge les requêtes PromQL.
- **Événements** : ECS publie les changements d'état des tâches et des services dans EventBridge, y compris la raison de l'arrêt d'une tâche, ce qui alimente les alertes sur les redémarrages en boucle.

> **Conseil d'examen.** « Le CPU et la mémoire de chaque conteneur d'une tâche ECS, avec le MOINS de charge opérationnelle » désigne Container Insights avec observabilité améliorée, pas un serveur Prometheus autogéré ni un side-car personnalisé qui appelle `PutMetricData`.

<!-- section: log-aggregation | objectives: 5.3.3 -->
## Agrégation multicomptes des journaux et archives

Quatre mécanismes, souvent combinés :

| Mécanisme | Déplacement des données | Portée | Idéal pour |
| --- | --- | --- | --- |
| Observabilité entre comptes CloudWatch (Observability Access Manager : récepteur [sink] dans le compte de surveillance, liens depuis les comptes sources) | Aucun, les données sont consultées sur place | Même Région ; jusqu'à 100 000 comptes sources par compte de surveillance, cinq comptes de surveillance par compte source ; métriques, journaux, traces, services et SLO Application Signals | Dépannage par l'équipe d'exploitation entre comptes, tableaux de bord et alarmes entre comptes |
| Règles de centralisation des journaux (compte de gestion ou administrateur délégué, AWS Organizations) | Copie des nouveaux événements vers un compte et une Région de destination, Région de sauvegarde facultative | Comptes, unités d'organisation ou toute l'organisation, plusieurs Régions sources | Une copie centrale entre Régions ; première copie gratuite, copie de sauvegarde payante ; l'historique n'est pas copié |
| Filtres d'abonnement vers une destination entre comptes | Flux en temps réel des événements correspondants | Une destination (dans la même Région que les groupes de journaux) en façade de Kinesis Data Streams ou Firehose ; les filtres au niveau du compte couvrent tous les groupes de journaux d'un compte | Alimenter un SIEM, transformer, archiver dans S3 via Firehose |
| Tâche d'exportation vers S3 | Copie par lots | Une tâche d'exportation active par compte | Exportations ponctuelles, pas d'archivage continu |

Un groupe de journaux accepte jusqu'à cinq filtres d'abonnement. La politique d'accès de la destination contrôle qui peut s'abonner ; une politique pour toute l'organisation utilise `aws:PrincipalOrgID` :

```bash
aws logs put-destination --destination-name org-logs \
  --target-arn arn:aws:kinesis:eu-west-1:999988887777:stream/org-logs \
  --role-arn arn:aws:iam::999988887777:role/CWLtoKinesisRole
aws logs put-destination-policy --destination-name org-logs --access-policy file://org-policy.json
```

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "*" },
    "Action": "logs:PutSubscriptionFilter",
    "Resource": "arn:aws:logs:eu-west-1:999988887777:destination:org-logs",
    "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
  }]
}
```

**Archive centralisée dans S3**, généralement dans le **compte Log Archive** que crée AWS Control Tower (il reçoit aussi le journal de suivi CloudTrail de l'organisation et l'historique AWS Config) :

- Firehose met en mémoire tampon, compresse, peut convertir en Parquet et partitionner par compte ou par date, et écrit dans S3 avec SSE-KMS.
- S3 Lifecycle déplace les objets vers les classes d'archivage : **S3 Glacier Instant Retrieval** (accès en millisecondes, 90 jours minimum), **S3 Glacier Flexible Retrieval** (de quelques minutes à quelques heures, 90 jours minimum), **S3 Glacier Deep Archive** (sous 12 heures, 180 jours minimum, coût le plus bas), puis les fait expirer à la fin de la période de conservation.
- **S3 Object Lock** en mode conformité rend l'archive immuable (WORM), même pour l'utilisateur root, pour les régulateurs.
- Athena interroge l'archive sur place. Les journaux de sécurité peuvent aussi aller dans **Amazon Security Lake** (format OCSF).

> **Piège d'examen.** « Un compte de sécurité central doit recevoir tous les journaux de tous les comptes et Régions quasiment en temps réel, avec le MOINS de charge opérationnelle » n'exige plus un filtre d'abonnement par groupe de journaux et par compte : utilisez les règles de centralisation (copie) ou les filtres d'abonnement au niveau du compte (flux). L'observabilité entre comptes seule ne satisfait pas une exigence de conservation, car les données restent dans les comptes sources.

<!-- section: alerting | objectives: 5.3.4 -->
## Alertes avec les alarmes CloudWatch, SNS et Systems Manager

Une alarme évalue une métrique (ou une expression mathématique de métriques, ou une requête Metrics Insights sur de nombreuses ressources) par période : elle passe à `ALARM` quand **M des N derniers points de données** dépassent le seuil. Les données manquantes peuvent être traitées comme `missing`, `notBreaching`, `breaching` ou `ignore`. Choix de seuil :

- **Seuil statique** pour des limites connues (taux d'erreur supérieur à 1 %, ancienneté de file d'attente supérieure à 300 secondes).
- **Détection des anomalies** pour les métriques saisonnières, avec une bande apprise à partir de l'historique.
- Les **alarmes composites** combinent des alarmes avec `AND`, `OR`, `NOT`, pour envoyer une alerte au lieu de vingt ; un **suppresseur d'actions** met en sourdine une alarme composite pendant qu'une condition parente (par exemple un déploiement ou la panne d'une dépendance) est en `ALARM`.
- Les **règles de mise en sourdine des alarmes** suspendent les actions pendant une maintenance planifiée tandis que l'évaluation continue ; `DisableAlarmActions` les arrête jusqu'à leur réactivation.

| Action d'alarme | Usage type |
| --- | --- |
| Rubrique Amazon SNS | Abonnés e-mail, SMS, webhook HTTPS, Lambda ou SQS ; diffusion vers les outils de messagerie et d'astreinte |
| Fonction AWS Lambda | Réponse automatisée personnalisée |
| Action EC2 (arrêt, résiliation, redémarrage, récupération) | Récupération d'une instance unique (alarmes de métrique standard uniquement) |
| Politique Auto Scaling ou Application Auto Scaling | Augmenter ou réduire la capacité (pas depuis une alarme composite) |
| OpsItem Systems Manager | Élément de travail opérationnel dans OpsCenter, avec les ressources concernées et les runbooks |
| Incident Systems Manager Incident Manager | Uniquement pour les clients existants d'Incident Manager : il est fermé aux nouveaux clients depuis le 7 novembre 2025 |
| Investigation CloudWatch | Lancer une investigation assistée par IA de l'alarme |

Chaque changement d'état est aussi un événement EventBridge (`CloudWatch Alarm State Change`), qui peut démarrer un runbook Systems Manager Automation, un flux de travail Step Functions, ou être transféré vers un bus d'événements central dans un autre compte. Avec l'observabilité entre comptes, le compte de surveillance peut créer directement des alarmes sur les métriques des comptes sources.

```bash
aws cloudwatch put-composite-alarm --alarm-name orders-user-impact \
  --alarm-rule "ALARM(orders-5xx-rate) AND ALARM(orders-p99-latency)" \
  --actions-suppressor orders-deployment-in-progress \
  --actions-suppressor-wait-period 120 --actions-suppressor-extension-period 300 \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:orders-oncall
```

> **Piège d'examen.** Une nouvelle conception qui demande un suivi des incidents ne doit pas répondre par Incident Manager (fermé aux nouveaux clients). Utilisez des alarmes qui créent des OpsItems et notifient via SNS, avec des runbooks Automation associés.

<!-- section: ai-ml-monitoring | objectives: 5.3.5 -->
## Surveiller les charges de travail d'IA et de ML

| Ce qu'il faut surveiller | Où |
| --- | --- |
| Latence d'un modèle de fondation | `AWS/Bedrock` `InvocationLatency` (millisecondes) et, pour un chat en streaming, `TimeToFirstToken`, par `ModelId` |
| Erreurs et limitation (throttling) | `InvocationClientErrors`, `InvocationServerErrors`, `InvocationThrottles` ; les requêtes qui échouent avant l'identification du modèle n'ont pas de dimension `ModelId`, donc créez aussi une alarme sur la métrique sans dimension |
| Usage et facteurs de coût | `InputTokenCount`, `OutputTokenCount`, nombre de jetons lus et écrits en cache, `EstimatedTPMQuotaUsage` face au quota de jetons par minute |
| Prompts et réponses pour l'audit ou le débogage | Journalisation des appels de modèle (désactivée par défaut) vers CloudWatch Logs et/ou S3, avec des métriques de réussite et d'échec de livraison |
| Contrôles de sécurité | `AWS/Bedrock/Guardrails` : `InvocationsIntervened`, latence, par `GuardrailPolicyType` et par source entrée ou sortie |
| Performances d'un agent | AgentCore Observability : sessions, traces et spans de chaque étape, avec nombre de sessions, latence, durée, consommation de jetons et taux d'erreur dans l'espace de noms `bedrock-agentcore` et la page d'observabilité GenAI de CloudWatch ; AgentCore Evaluations en ligne pour les scores de qualité |
| Inférence d'un point de terminaison en temps réel | `AWS/SageMaker` `ModelLatency` et `OverheadLatency` (microsecondes), `Invocation4XXErrors`, `Invocation5XXErrors`, `InvocationsPerInstance` (la métrique de mise à l'échelle habituelle), `ModelSetupTime` pour les points de terminaison sans serveur |
| Dérive d'un modèle (ML prédictif) | Capture des données du point de terminaison vers S3, puis une tâche planifiée de détection de dérive qui compare les données et prédictions de production à la référence d'entraînement et publie une métrique personnalisée ; les étiquettes de vérité terrain jointes plus tard donnent la qualité du modèle |

AgentCore Observability exige que Transaction Search soit activé une fois par compte. Les agents hébergés dans AgentCore Runtime sont instrumentés automatiquement ; les agents hébergés ailleurs (EKS, ECS, Lambda) utilisent le SDK ADOT ou la couche Lambda ADOT et envoient l'OTLP à CloudWatch.

SageMaker Model Monitor (qualité des données, qualité du modèle, dérive des biais, dérive de l'attribution des caractéristiques) n'est plus ouvert aux nouveaux clients ; les utilisateurs existants le conservent. AWS oriente les nouvelles conceptions vers des solutions de surveillance open source qu'il publie (Evidently, MLflow), exécutées dans le compte, avec CloudWatch pour les métriques système et SNS pour les alertes.

> **Conseil d'examen.** Une hausse d'`InvocationThrottles` à trafic stable est un problème de quota (demander un quota de jetons par minute plus élevé, utiliser l'inférence entre Régions ou le débit provisionné), pas un problème de qualité du modèle. Une baisse de la qualité des réponses avec une latence normale relève des évaluations, pas des alarmes de latence.

<!-- section: user-experience | objectives: 5.3.6 -->
## Surveiller l'expérience utilisateur : transactions synthétiques et RUM

| | CloudWatch Synthetics (transactions synthétiques) | CloudWatch RUM (surveillance des utilisateurs réels) |
| --- | --- | --- |
| Source des données | Canaries scriptés exécutés selon une planification | Sessions d'utilisateurs réels dans les navigateurs et les applications mobiles |
| Fonctionne sans trafic | Oui (nuits, avant le lancement) | Non |
| Mesures | Disponibilité et latence des parcours et des API, liens rompus, changements visuels | Temps de chargement des pages, Core Web Vitals, erreurs JavaScript et HTTP, sessions par navigateur, appareil et géolocalisation |
| Mise en place | Canary (une fonction Lambda utilisant l'environnement d'exécution Synthetics) à partir d'un plan (blueprint) ou d'un script | Moniteur d'application, un extrait de code dans l'application, un taux d'échantillonnage des sessions |
| Signaux clés | `CloudWatchSynthetics` `SuccessPercent`, `Duration` (avec `Location`), `2xx`, `4xx`, `5xx` | Événements de performance et d'erreur ; données conservées 30 jours sauf envoi supplémentaire vers CloudWatch Logs |

**Détails de Synthetics** : les environnements d'exécution Node.js et Python pilotent Playwright, Puppeteer ou Selenium (Chrome uniquement pour Selenium) ; les canaries Java n'ont pas de navigateur. Plans : heartbeat monitoring, API canary, broken link checker, visual monitoring, canary recorder, GUI workflow builder, multi checks. Un canary peut s'exécuter une seule fois ou jusqu'à chaque minute, dans un VPC pour tester des points de terminaison internes, et stocke captures d'écran, fichiers HAR et journaux dans S3. Déployez des canaries dans plusieurs Régions pour mesurer l'expérience depuis différentes zones géographiques ; créez une alarme sur `SuccessPercent`.

**Détails de RUM** : le client web est autorisé via un groupe d'identités Amazon Cognito (ou votre authentification existante) ; un taux d'échantillonnage des sessions maîtrise le coût. Les applications mobiles (iOS et Android) utilisent des SDK basés sur ADOT et remontent les temps de chargement des écrans et de lancement, les plantages, les ANR Android et les blocages d'application iOS.

Avec le **traçage actif X-Ray** sur les canaries et les moniteurs d'application, tous deux apparaissent sur la carte Application Signals, reliés aux services back-end qu'ils appellent, si bien qu'une page lente peut être suivie jusqu'à la dépendance lente.

> **Piège d'examen.** « Détecter que le paiement est cassé avant que les clients ne le signalent, y compris à 3 heures du matin quand personne n'achète » désigne un canary Synthetics. « Comprendre quels navigateurs et quels pays subissent des chargements de page lents » désigne RUM. Chacun est faux pour l'autre exigence.

<!-- section: slos | objectives: 5.3.7 -->
## Objectifs de niveau de service avec Application Signals

Un **SLI** est un indicateur mesuré (latence de `POST /orders`, disponibilité d'un service), un **SLO** est l'objectif de cet indicateur sur un intervalle, et un SLA est l'engagement contractuel, généralement moins strict que le SLO. **CloudWatch Application Signals** gère des SLO sur ses services et opérations (`Latency` et `Availability`, où disponibilité = 1 − taux de pannes, les 4xx comptant comme bons), sur les dépendances, ou sur n'importe quelle métrique CloudWatch ou expression mathématique de métriques à série unique.

| Choix | Options |
| --- | --- |
| Calcul | **Basé sur les périodes** : bonnes périodes / total des périodes (chaque mauvaise minute consomme une minute entière de budget). **Basé sur les requêtes** : bonnes requêtes / total des requêtes (le budget suit le trafic) |
| Objectif d'atteinte | Par exemple 99,9 % |
| Intervalle | **Glissant** (fenêtre récente, reflète l'expérience actuelle) ou **calendaire** (aligné sur le mois d'un SLA) |
| SLO composite | Disponibilité sur 2 à 20 opérations (pas la latence) |
| Fenêtres d'exclusion | Jusqu'à 10 par SLO, ponctuelles ou récurrentes, pour exclure la maintenance planifiée |
| Alarmes | Alarme sur le SLI, seuil d'avertissement sur le budget d'erreur restant, alarmes de taux de consommation ; modifier les paramètres principaux réinitialise l'historique ; les alarmes ne sont pas supprimées avec le SLO |

```text
Error budget, period-based: 30 days x 1,440 one-minute periods = 43,200 periods
Goal 99 %  -> budget = 1 % = 432 bad minutes
Burn rate  = error rate in look-back window / (100 % - goal)
Burn rate 1  = budget lasts exactly the interval; above 1 = goal at risk
Threshold to page when 2 % of a 30-day budget burns in 1 hour = 2 % x 720 h / 1 h = 14.4
Multi-window pairs: 1 h with 5 min (2 %), 6 h with 30 min (5 %), 3 days with 6 h (10 %)
Composite rule: ALARM(burn-1h) AND ALARM(burn-5m)
```

La fenêtre courte arrête l'alerte rapidement une fois le problème corrigé ; la fenêtre longue évite d'alerter pour un bref pic. Les canaries alimentent des SLO basés sur les périodes (chaque exécution est une période) ; les moniteurs d'application RUM alimentent des SLO basés sur les requêtes.

> **Conseil d'examen.** « N'alerter l'astreinte que lorsque l'objectif mensuel de disponibilité est réellement menacé, sans lassitude face aux alertes » désigne un SLO avec des alarmes de taux de consommation multifenêtres combinées dans une alarme composite, pas une alarme statique sur chaque pic de 5xx.

<!-- section: key-points -->
## Points clés

- Instrumentez avec OpenTelemetry (ADOT) ; l'agent CloudWatch collecte métriques, journaux et traces OTLP ; les SDK et le démon X-Ray sont en mode maintenance.
- Transaction Search stocke tous les spans dans `aws/spans` ; Application Signals fournit les métriques de service, une carte de l'application et des SLO.
- Container Insights doit être activé ; l'observabilité améliorée ajoute le détail des tâches et conteneurs sur ECS et le module complémentaire pour EKS.
- L'observabilité entre comptes consulte les données sur place (une Région) ; les règles de centralisation copient les journaux entre comptes et Régions ; les filtres d'abonnement diffusent vers Kinesis ou Firehose ; archivez dans le compte Log Archive avec les classes Glacier et Object Lock.
- Alarmes : M sur N points de données, traitement des données manquantes, détection des anomalies, alarmes composites avec suppresseurs ; OpsItems et SNS plutôt qu'Incident Manager pour les nouvelles conceptions.
- Métriques d'IA : latence Bedrock, délai du premier jeton, limitations et jetons ; interventions des garde-fous ; AgentCore Observability pour les agents ; `ModelLatency` SageMaker ; dérive via la capture des données et des métriques personnalisées.
- Synthetics pour les parcours proactifs, RUM pour les utilisateurs réels ; SLO avec budgets d'erreur et alarmes de taux de consommation.
