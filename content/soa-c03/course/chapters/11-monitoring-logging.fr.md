Les questions de surveillance vérifient que le bon signal existe : la métrique ou le journal est-il collecté, une alarme le surveille-t-elle, l'action peut-elle atteindre sa cible, l'équipe voit-elle tous les comptes et toutes les Régions sur un seul écran. Ce chapitre présente les services qui collectent les métriques, les journaux et l'activité des API pour les charges de travail sans serveur, de calcul, de conteneurs et d'IA, l'agent CloudWatch, les alarmes et les alarmes composites, les tableaux de bord entre comptes et les notifications envoyées à Amazon SNS.

<!-- section: telemetry-services | objectives: 1.1.1 -->
## CloudWatch, CloudTrail et Managed Service for Prometheus

| Service | Ce qu'il enregistre | Rétention et points de coût |
| --- | --- | --- |
| Métriques CloudWatch | Des séries temporelles dans des espaces de noms (`AWS/EC2`, `AWS/Lambda`, `CWAgent`, les vôtres), chacune identifiée par un nom et des dimensions | Les données à résolution 1 minute sont conservées 15 jours, à 5 minutes 63 jours, à 1 heure 455 jours (15 mois) ; les métriques personnalisées sont facturées |
| CloudWatch Logs | Des événements de journal dans des groupes et des flux de journaux | Les journaux n'expirent jamais tant que vous ne définissez pas de période de rétention sur le groupe de journaux |
| AWS CloudTrail | Les appels d'API : identité, heure, IP source, requête et réponse | L'historique des événements montre gratuitement 90 jours d'événements de gestion ; un journal de suivi (trail) est nécessaire pour une conservation plus longue, les événements de données et l'analyse |
| Amazon Managed Service for Prometheus | Des métriques Prometheus, interrogées en PromQL | Données de l'espace de travail répliquées sur trois AZ, conservées 150 jours par défaut, jusqu'à 1 095 jours sur configuration |

Les **fonctionnalités de CloudWatch Logs** à savoir situer :

- **Filtre de métrique** : un modèle sur un groupe de journaux qui compte les correspondances ou extrait une valeur dans une métrique. Il ne s'applique qu'aux événements ingérés après sa création.
- **Filtre d'abonnement** : diffuse quasi en temps réel les événements correspondants vers Kinesis Data Streams, Amazon Data Firehose, Lambda ou OpenSearch Service (deux par groupe de journaux).
- **Logs Insights** : un langage de requête interactif sur un ou plusieurs groupes de journaux ; **Live Tail** affiche les événements à leur arrivée.
- **Alarme de journal** : exécute une requête Logs Insights selon une planification et compare le résultat agrégé à un seuil, avec une évaluation M sur N ; l'alternative au couple filtre de métrique plus alarme sur métrique.

```text
fields @timestamp, @message
| filter @message like /ERROR/
| stats count(*) as errors by bin(5m)
```

Les journaux de suivi **CloudTrail** livrent les fichiers journaux dans un compartiment S3 et, en option, dans un groupe de journaux CloudWatch Logs (pour que filtres de métrique et alarmes réagissent aux appels d'API). Les événements de gestion sont journalisés par défaut ; les **événements de données** (appels S3 au niveau objet, invocations Lambda, appels DynamoDB sur les éléments) doivent être sélectionnés et sont facturés. Un **journal de suivi d'organisation** (compte de gestion ou administrateur délégué) journalise tous les comptes membres. Activez la **validation de l'intégrité des fichiers journaux** pour prouver qu'ils n'ont pas été modifiés (`aws cloudtrail validate-logs`). **CloudTrail Insights** signale des taux inhabituels d'appels d'API ou d'erreurs ; **CloudTrail Lake** stocke les événements dans des magasins de données d'événements interrogés en SQL.

**Managed Service for Prometheus** ingère par un collecteur géré par AWS (un scraper sans agent pour Amazon EKS, sur nœuds EC2 ou Fargate, qui envoie via un point de terminaison de VPC), un collecteur OpenTelemetry (ADOT), un serveur Prometheus autogéré avec `remote_write`, ou l'agent CloudWatch (destination `amp`). Les règles d'alerte s'exécutent dans l'espace de travail et le gestionnaire d'alertes envoie vers une rubrique SNS. Amazon Managed Grafana assure la visualisation.

<!-- section: workload-monitoring | objectives: 1.1.1 -->
## Surveiller les charges de travail sans serveur, de calcul, de conteneurs et d'IA

| Charge de travail | Collecté sans configuration | Ce que vous configurez |
| --- | --- | --- |
| Lambda | `Invocations`, `Errors`, `Throttles`, `Duration`, `ConcurrentExecutions` ; journaux dans `/aws/lambda/<function-name>` si le rôle d'exécution peut écrire des journaux | Rétention des journaux, format de journal JSON, Lambda Insights pour les métriques système, traçage avec OpenTelemetry |
| EC2 | CPU, réseau et E/S disque du stockage d'instance toutes les 5 minutes (surveillance de base), vérifications du statut chaque minute | Surveillance détaillée (1 minute, facturée) ; l'agent CloudWatch pour la mémoire, l'espace disque, les processus et les fichiers journaux |
| ECS et EKS | Utilisation du CPU et de la mémoire par cluster et par service (ECS) | Container Insights, avec observabilité améliorée, pour les métriques et journaux des clusters, nœuds, pods, tâches et conteneurs |
| Amazon Bedrock | Métriques `AWS/Bedrock` par `ModelId` : `Invocations`, `InvocationLatency`, `InvocationClientErrors`, `InvocationServerErrors`, `InvocationThrottles`, `InputTokenCount`, `OutputTokenCount`, `TimeToFirstToken` | Journalisation des invocations de modèles (désactivée par défaut) vers CloudWatch Logs, S3 ou les deux ; CloudTrail pour l'activité des API |

La **journalisation des invocations de modèles** Bedrock enregistre les requêtes, les réponses et les métadonnées des appels `Converse`, `ConverseStream`, `InvokeModel` et `InvokeModelWithResponseStream`, vers une destination du même compte et de la même Région. La livraison dans CloudWatch Logs utilise un rôle IAM qui fait confiance à `bedrock.amazonaws.com` ; la livraison dans S3 exige une politique de compartiment pour le même principal. Les corps de plus de 100 Ko et les données binaires ne vont que dans S3.

> **Piège d'examen.** « Suivre la consommation de jetons et la limitation d'un modèle Bedrock », ce sont les métriques `AWS/Bedrock`, disponibles immédiatement. « Conserver les invites et les réponses pour l'audit » exige la journalisation des invocations de modèles, désactivée tant que vous ne la configurez pas. CloudTrail enregistre qui a appelé l'API, pas le contenu de l'invite.

<!-- section: cloudwatch-agent | objectives: 1.1.2 -->
## L'agent CloudWatch sur EC2, ECS et EKS

L'agent collecte les métriques système (mémoire, disque, swap, processus `procstat`, réseau), les métriques StatsD et collectd, les fichiers journaux et les traces des instances EC2 et des serveurs sur site. Les métriques vont dans l'espace de noms `CWAgent`, sont facturées comme des métriques personnalisées et peuvent aussi aller dans Managed Service for Prometheus.

L'installation avec Systems Manager, la réponse habituelle à l'examen :

1. Attachez un profil d'instance avec `CloudWatchAgentServerPolicy` (plus les autorisations de base de Systems Manager). Seule l'instance qui écrit la configuration dans Parameter Store a besoin du rôle d'administration `CloudWatchAgentAdminRole`.
2. Installez avec Run Command : document `AWS-ConfigureAWSPackage`, action `Install`, nom `AmazonCloudWatchAgent`.
3. Créez la configuration (assistant ou JSON) et stockez-la dans **Parameter Store**, pour que toutes les instances chargent le même fichier.
4. Démarrez l'agent avec le document `AmazonCloudWatch-ManageAgent` (action `configure`, source `ssm`, nom du paramètre), ou avec une association State Manager pour que les nouvelles instances restent configurées.

```json
{
  "agent": { "metrics_collection_interval": 60 },
  "metrics": {
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}",
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
    },
    "aggregation_dimensions": [["AutoScalingGroupName"]],
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/web/nginx/error",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
```

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c ssm:AmazonCloudWatch-web-config
```

Les métriques obtenues sont `mem_used_percent` et `disk_used_percent`. `aggregation_dimensions` ajoute une métrique par groupe Auto Scaling, si bien qu'une seule alarme peut surveiller tout le groupe.

**Conteneurs** :

- **Amazon ECS** : activez Container Insights par le paramètre de compte ou cluster par cluster. Les instances de conteneur EC2 doivent avoir l'agent ECS 1.29 ou ultérieur.

```bash
aws ecs put-account-setting --name containerInsights --value enhanced \
  --principal-arn arn:aws:iam::111122223333:root
aws ecs update-cluster-settings --cluster orders \
  --settings name=containerInsights,value=enhanced
```

- **Amazon EKS** : installez le module complémentaire **Amazon CloudWatch Observability**. Il déploie l'agent CloudWatch et Fluent Bit (journaux des conteneurs), et active Container Insights avec observabilité améliorée ainsi qu'Application Signals. Donnez `CloudWatchAgentServerPolicy` à l'agent par EKS Pod Identity (recommandé), par les rôles IAM pour les comptes de service ou par le rôle des nœuds.

```bash
aws eks create-addon --cluster-name orders \
  --addon-name amazon-cloudwatch-observability \
  --pod-identity-associations serviceAccount=cloudwatch-agent,roleArn=arn:aws:iam::111122223333:role/cw-agent
```

| Symptôme | Cause probable |
| --- | --- |
| Aucune métrique `CWAgent` | Le rôle de l'instance n'a pas `CloudWatchAgentServerPolicy`, l'agent n'est pas démarré, ou aucune route vers les points de terminaison CloudWatch depuis un sous-réseau privé (ajoutez une passerelle NAT ou des points de terminaison d'interface) |
| Les journaux arrivent mais pas la métrique de mémoire | La section `mem` manque dans la configuration utilisée |
| Les nouvelles instances Auto Scaling n'envoient rien | Agent installé à la main au lieu de l'être dans l'AMI, les données utilisateur ou une association State Manager |

> **Piège d'examen.** L'utilisation de la mémoire et de l'espace disque n'est jamais dans `AWS/EC2`. Toute question qui en a besoin, y compris les recommandations de Compute Optimizer fondées sur la mémoire, exige l'agent CloudWatch.

<!-- section: alarms | objectives: 1.1.3 -->
## Les alarmes CloudWatch, les alarmes composites et leurs actions

Une **alarme sur métrique** surveille une métrique ou une expression mathématique de métriques (ou une bande de détection d'anomalies). Elle se définit par la statistique, la **période**, le seuil, les **périodes d'évaluation** et les **points de données pour déclencher l'alarme** (3 sur 5 tolère les pics isolés), et le **traitement des données manquantes** : `missing`, `notBreaching`, `breaching` ou `ignore`. Les états sont `OK`, `ALARM` et `INSUFFICIENT_DATA`. Les actions ne s'exécutent que sur un **changement d'état**, sauf les actions Auto Scaling, répétées chaque minute tant que l'alarme reste dans l'état.

| Action | Alarme sur métrique | Alarme composite |
| --- | --- | --- |
| Notifier une rubrique SNS | Oui | Oui |
| Invoquer une fonction Lambda (de façon asynchrone) | Oui | Oui |
| Action EC2 : arrêter, résilier, redémarrer, récupérer | Oui, sur des métriques EC2 | Non |
| Politique Auto Scaling ou Application Auto Scaling | Oui | Non |
| Créer un OpsItem Systems Manager ou un incident Incident Manager | Oui (en `ALARM` uniquement) | Oui |
| Démarrer une enquête CloudWatch investigations | Oui | Non |

Une action Lambda exige une politique basée sur les ressources sur la fonction pour `lambda.alarms.cloudwatch.amazonaws.com`, restreinte avec `AWS:SourceAccount` et `AWS:SourceArn` ; la fonction peut se trouver dans un autre compte.

```bash
aws cloudwatch put-metric-alarm --alarm-name web-mem-high \
  --namespace CWAgent --metric-name mem_used_percent \
  --dimensions Name=AutoScalingGroupName,Value=web-asg \
  --statistic Average --period 300 --evaluation-periods 3 --datapoints-to-alarm 2 \
  --threshold 85 --comparison-operator GreaterThanThreshold \
  --treat-missing-data missing \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:ops-alerts
```

Une **alarme composite** évalue une règle sur d'autres alarmes avec `ALARM()`, `OK()`, `INSUFFICIENT_DATA()`, `AND`, `OR`, `NOT` et `AT_LEAST(M, state, (alarms))`. Elle réduit le bruit : une seule notification quand des symptômes coïncident, aucune pendant une maintenance. Elle peut surveiller jusqu'à 100 alarmes sous-jacentes, toutes dans son compte et sa Région (dans un compte de surveillance de l'observabilité entre comptes, celles-ci peuvent surveiller des métriques des comptes sources). Une alarme de **suppression des actions** (actions suppressor), avec des périodes d'attente et d'extension, la fait taire tant qu'une autre alarme est en `ALARM`.

```bash
aws cloudwatch put-composite-alarm --alarm-name checkout-degraded \
  --alarm-rule 'AT_LEAST(2, ALARM, (alb-5xx-high, p99-latency-high, db-cpu-high)) AND NOT ALARM(deploy-in-progress)' \
  --alarm-actions arn:aws:sns:eu-west-1:111122223333:oncall
```

**Par EventBridge** : chaque changement d'état émet un événement de source `aws.cloudwatch` et de type `CloudWatch Alarm State Change`. Une règle peut alors atteindre des cibles qu'une alarme ne peut pas appeler directement (Step Functions, Systems Manager Automation, SQS, un bus d'événements d'un autre compte).

```json
{
  "source": ["aws.cloudwatch"],
  "detail-type": ["CloudWatch Alarm State Change"],
  "detail": {
    "alarmName": ["web-mem-high"],
    "state": { "value": ["ALARM"] }
  }
}
```

| Symptôme | Correction |
| --- | --- |
| L'alarme reste en `INSUFFICIENT_DATA` | Mauvais espace de noms ou mauvaises dimensions (les métriques de l'agent portent les dimensions que vous avez ajoutées), métrique non publiée, ou période plus courte que la résolution de la métrique |
| L'alarme est en `ALARM` mais personne n'est notifié | Abonnement e-mail non confirmé, actions de l'alarme désactivées, ou rubrique chiffrée dont la politique de clé n'autorise pas CloudWatch |
| Une alarme sur une métrique d'erreurs clairsemée bascule en `INSUFFICIENT_DATA` | Traitez les données manquantes comme `notBreaching` |
| Une action EC2 ou Auto Scaling est refusée sur une alarme composite | Les alarmes composites ne prennent pas en charge ces actions ; placez-les sur l'alarme sur métrique |

Testez la chaîne avec `aws cloudwatch set-alarm-state`, qui ne maintient l'état que jusqu'à la prochaine évaluation.

> **Conseil d'examen.** Une politique de mise à l'échelle avec suivi de cible crée et gère ses propres alarmes. Ne les modifiez pas et ne les supprimez pas ; modifiez plutôt la politique.

<!-- section: dashboards | objectives: 1.1.4 -->
## Les tableaux de bord entre comptes et Régions

Un tableau de bord CloudWatch est global : un même tableau de bord peut contenir des widgets de plusieurs Régions. Les widgets comprennent des graphiques en ligne, nombre, jauge et barres, l'état des alarmes, du texte, des tableaux Logs Insights et des widgets personnalisés alimentés par Lambda ; des variables permettent à un tableau de bord de basculer entre instances ou environnements. Les tableaux de bord sont définis en JSON : on peut les créer avec `put-dashboard` ou CloudFormation (`AWS::CloudWatch::Dashboard`) et les réutiliser.

```bash
aws cloudwatch put-dashboard --dashboard-name ops-overview \
  --dashboard-body file://ops-overview.json
```

Deux façons de voir d'autres comptes :

| Méthode | Fonctionnement | Quand la choisir |
| --- | --- | --- |
| **Observabilité entre comptes CloudWatch** (cross-account observability) | Chaque Région du **compte de surveillance** possède un **récepteur** (sink) ; chaque **compte source** crée un **lien** (link) vers lui et choisit les données partagées : métriques, groupes de journaux, traces, services et SLO d'Application Signals, applications d'Application Insights, moniteurs d'Internet Monitor. Intégrez les comptes par AWS Organizations pour que les nouveaux comptes se lient automatiquement | Équipes centrales qui doivent aussi rechercher dans les journaux, interroger les métriques et créer des alarmes sur les données des comptes sources ; sans frais supplémentaires pour les journaux et les métriques |
| **Console entre comptes et entre Régions** (cross-account cross-Region) | Les comptes de partage autorisent un compte de surveillance à lire leurs données CloudWatch ; la console change de compte et de Région widget par widget | Un tableau de bord de graphiques, d'alarmes et de widgets Logs Insights provenant de nombreux comptes et Régions |

L'observabilité entre comptes fonctionne **au sein d'une Région** : créez un récepteur dans chaque Région surveillée. Un compte de surveillance peut lier jusqu'à 100 000 comptes sources ; un compte source peut partager avec cinq comptes de surveillance au plus.

**Partager un tableau de bord** avec des personnes sans compte AWS :

- Jusqu'à **cinq adresses e-mail** par tableau de bord ; chaque personne définit un mot de passe.
- Un **lien public** : toute personne disposant du lien peut le consulter.
- Un **fournisseur SSO** (SAML via Amazon Cognito) : chaque utilisateur du fournisseur voit tous les tableaux de bord du compte.

CloudWatch crée des ressources Amazon Cognito dans la Région USA Est (Virginie du Nord) et un rôle IAM pour les lecteurs, qui autorise `cloudwatch:GetMetricData` et `ec2:DescribeTags` sur tout le compte ; les widgets d'alarme composite, Logs Insights et personnalisés restent masqués tant que vous n'élargissez pas ce rôle.

> **Piège d'examen.** Un tableau de bord partagé n'est pas limité à ses widgets : les lecteurs peuvent interroger toutes les métriques du compte. Pour des partenaires qui ne doivent voir qu'une application, utilisez un compte distinct ou partagez des captures d'écran, pas un tableau de bord du compte de production.

<!-- section: sns-notifications | objectives: 1.1.5 -->
## Envoyer des notifications à Amazon SNS

| Source | Comment elle publie dans SNS |
| --- | --- |
| Alarmes CloudWatch | Action d'alarme sur n'importe quel état |
| Amazon S3 | Event Notifications (objet créé, supprimé, restauré...) vers une rubrique standard, pas une rubrique FIFO |
| EC2 Auto Scaling | `put-notification-configuration` pour le lancement, la résiliation et leurs erreurs |
| CloudFormation | Notifications des événements de pile (`--notification-arns`) |
| Amazon RDS | Abonnements aux événements par type de source (instance, instantané, groupe de paramètres) et par catégorie (basculement, maintenance) |
| AWS Backup, AWS Config, CloudTrail | Notifications du coffre de sauvegarde ; notifications du canal de livraison ; notifications de livraison des fichiers journaux |
| Tout le reste (AWS Health, résultats GuardDuty, changements d'état EC2, déploiements) | Une règle EventBridge avec la rubrique comme cible |

```bash
aws autoscaling put-notification-configuration --auto-scaling-group-name web-asg \
  --topic-arn arn:aws:sns:eu-west-1:111122223333:ops-alerts \
  --notification-types autoscaling:EC2_INSTANCE_LAUNCH_ERROR autoscaling:EC2_INSTANCE_TERMINATE
```

La **politique d'accès de la rubrique** doit autoriser le principal de service à publier, en se limitant à la source :

```json
{
  "Sid": "AllowS3Publish",
  "Effect": "Allow",
  "Principal": { "Service": "s3.amazonaws.com" },
  "Action": "SNS:Publish",
  "Resource": "arn:aws:sns:eu-west-1:111122223333:uploads",
  "Condition": {
    "ArnLike": { "aws:SourceArn": "arn:aws:s3:::example-uploads" },
    "StringEquals": { "aws:SourceAccount": "111122223333" }
  }
}
```

Pour une rubrique chiffrée avec SSE-KMS, le service qui publie doit aussi être autorisé à `kms:GenerateDataKey*` et `kms:Decrypt` dans la **politique de clé**. La clé gérée par AWS `aws/sns` ne peut pas être modifiée : utilisez une clé gérée par le client quand CloudWatch, S3 ou EventBridge publient dans une rubrique chiffrée. Les abonnés filtrent ensuite avec des **politiques de filtre d'abonnement** (une rubrique, plusieurs files d'attente ou équipes).

> **Piège d'examen.** « L'alarme se déclenche mais aucun e-mail n'arrive » après l'activation du chiffrement, c'est la politique de clé, pas la politique de la rubrique. « La notification du compartiment ne peut pas être enregistrée », c'est une politique de rubrique qui n'autorise pas `s3.amazonaws.com`.

<!-- section: key-points -->
## Points clés

- Métriques conservées 15 mois avec une résolution décroissante ; journaux sans expiration par défaut ; historique CloudTrail de 90 jours, journaux de suivi au-delà, événements de données sur option.
- Les filtres de métrique ne voient que les nouveaux événements ; les alarmes de journal exécutent des requêtes Logs Insights planifiées ; les filtres d'abonnement diffusent les journaux.
- Managed Service for Prometheus : collecteur géré pour EKS, `remote_write`, PromQL, gestionnaire d'alertes vers SNS. Bedrock : métriques `AWS/Bedrock` ; journalisation des invocations désactivée par défaut.
- Agent CloudWatch : `CloudWatchAgentServerPolicy`, `AWS-ConfigureAWSPackage`, configuration dans Parameter Store, `mem_used_percent` dans `CWAgent` ; Container Insights pour ECS et EKS (module complémentaire CloudWatch Observability).
- Les alarmes agissent sur les changements d'état ; les alarmes composites ne font que notifier, invoquer Lambda ou ouvrir des OpsItems et des incidents.
- Les tableaux de bord sont globaux ; l'observabilité entre comptes est régionale ; un tableau de bord partagé expose toutes les métriques.
- SNS : politique de rubrique pour le principal de service, clé gérée par le client pour les rubriques chiffrées, EventBridge pour le reste.
