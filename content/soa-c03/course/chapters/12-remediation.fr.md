Les questions de correction commencent là où s'arrête la surveillance : une métrique a franchi un seuil, un événement est arrivé, une ressource a dérivé. Lisez la bonne métrique pour trouver la cause, puis choisissez la correction la moins manuelle et la plus durable : une action d'alarme, une règle EventBridge, une correction AWS Config ou un runbook Systems Manager Automation, avec des agents d'IA pour accélérer l'enquête.

<!-- section: analyze-metrics | objectives: 1.2.1 -->
## Analyser les métriques de performance pour trouver la cause

Partez du symptôme pour aller vers les preuves :

| Question à résoudre | Outil |
| --- | --- |
| Quelle ressource sort du lot parmi des centaines ? | CloudWatch Metrics Insights (requête de type SQL sur toutes les instances, fonctions ou tables) |
| Quel client, quelle IP ou quelle clé produit le plus d'erreurs ou de trafic ? | Règles Contributor Insights sur un groupe de journaux (principaux contributeurs) |
| Cette valeur est-elle anormale pour ce moment de la journée ? | Bande de détection d'anomalies sur la métrique, et une alarme sur la bande |
| Qu'est-ce qui a changé juste avant le problème ? | Historique des événements ou Lake de CloudTrail (appels d'API), chronologie des ressources AWS Config (modifications de configuration) |
| AWS a-t-il lui-même un problème, ou une maintenance est-elle prévue ? | AWS Health Dashboard (événements du compte ; événements `aws.health` dans EventBridge) |
| Que dit le journal de l'application ? | CloudWatch Logs Insights |

```text
SELECT AVG(CPUUtilization) FROM SCHEMA("AWS/EC2", InstanceId)
GROUP BY InstanceId ORDER BY AVG() DESC LIMIT 10
```

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=ModifyDBInstance \
  --start-time 2026-11-19T08:00:00Z --max-results 20
```

Les métriques qui mènent à une correction connue :

| Symptôme et métrique | Cause probable | Correction |
| --- | --- | --- |
| `StatusCheckFailed_System` = 1 | Problème sur l'hôte sous-jacent | Action d'alarme **recover** (même ID d'instance, mêmes adresses IP et volumes EBS), ou arrêt puis démarrage |
| `StatusCheckFailed_Instance` = 1 | Problème du système d'exploitation : noyau, configuration réseau, disque plein | Action de redémarrage, puis réparation du système (`AWSSupport-ExecuteEC2Rescue`) |
| Instance T lente, `CPUCreditBalance` proche de 0 | Crédits de rafale épuisés | Mode illimité (unlimited), ou un type plus grand ou non extensible |
| `HTTPCode_Target_5XX_Count` et `UnHealthyHostCount` augmentent sur un ALB | Les cibles échouent aux vérifications de l'état ou l'application est en erreur | Journaux de l'application, chemin de la vérification de l'état ; vérifications de l'état ELB sur le groupe Auto Scaling |
| `Throttles` Lambda supérieur à 0 | Limite de simultanéité atteinte | Simultanéité réservée, augmentation du quota du compte, moins de nouvelles tentatives en amont |
| `ApproximateAgeOfOldestMessage` SQS en hausse | Consommateurs trop lents ou trop peu nombreux | Mettre à l'échelle les consommateurs sur la profondeur de file par instance |
| `ThrottledRequests` DynamoDB | Capacité provisionnée dépassée ou clé chaude | Mode à la demande, auto scaling, meilleure répartition des clés |

> **Piège d'examen.** Un échec de la vérification du statut du système se corrige en déplaçant l'instance sur du matériel sain (recover, ou arrêt puis démarrage d'une instance basée sur EBS). Un redémarrage la laisse sur le même hôte et ne sert à rien.

<!-- section: automated-remediation | objectives: 1.2.1 -->
## Les stratégies de correction automatisée

| Déclencheur | Chemin de correction | Quand le choisir |
| --- | --- | --- |
| Alarme sur métrique | Action EC2 (récupérer, redémarrer, arrêter), politique Auto Scaling, fonction Lambda | La correction est une seule action intégrée |
| Alarme sur métrique | OpsItem ou incident Incident Manager, avec des runbooks associés | Des personnes doivent suivre ou approuver la réponse |
| Alarme ou événement, via EventBridge | Runbook Systems Manager Automation, Lambda, Step Functions | Correction en plusieurs étapes, appels d'API AWS, ou cible qu'une alarme ne peut pas appeler |
| Une règle AWS Config passe à `NON_COMPLIANT` | **Correction automatique** avec un runbook Automation (par exemple `AWSConfigRemediation-EnforceEC2InstanceIMDSv2`), avec nouvelles tentatives | La configuration doit rester conforme en permanence |
| Événement d'appel d'API CloudTrail | Règle EventBridge vers Lambda ou un runbook qui annule la modification | Défaire une modification interdite (un groupe de sécurité ouvert à `0.0.0.0/0`) |
| Modification planifiée AWS Health | Règle EventBridge vers un runbook (par exemple arrêt puis démarrage avant le retrait d'une instance) | Agir avant une maintenance AWS |

```bash
aws cloudwatch put-metric-alarm --alarm-name web01-system-check \
  --namespace AWS/EC2 --metric-name StatusCheckFailed_System \
  --dimensions Name=InstanceId,Value=i-0abc1234def567890 \
  --statistic Maximum --period 60 --evaluation-periods 2 \
  --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:automate:eu-west-1:ec2:recover
```

**Enquête et correction assistées par l'IA** (dans le guide depuis la version 1.1) :

- **CloudWatch investigations** : une action d'alarme peut démarrer une enquête quand l'alarme passe en `ALARM`, pour que l'analyse soit prête quand l'ingénieur d'astreinte l'ouvre.
- **AWS DevOps Agent** : un agent d'IA toujours disponible qui commence à enquêter dès qu'une alerte ou un ticket de support arrive, met en corrélation télémétrie, code et données de déploiement pour trouver la cause racine, propose des mesures d'atténuation (y compris comment les valider et les annuler) et recommande des améliorations tirées des incidents passés. Il travaille dans des **Agent Spaces** : chaque espace définit les comptes AWS (un compte principal et des comptes d'application secondaires), les intégrations (CloudWatch, Datadog, Dynatrace, New Relic, Splunk, Grafana, GitHub, GitLab, ServiceNow, PagerDuty, Slack, serveurs MCP) et des rôles IAM dédiés ; l'agent ne peut pas atteindre de ressources hors de son espace. Les opérateurs utilisent son application web ; les administrateurs le configurent dans la console.
- **Kiro** : l'environnement de développement agentique d'AWS (IDE, CLI avec un mode sans interface pour la CI, web, mobile), successeur d'Amazon Q Developer. Les specs, les fichiers de pilotage (steering) et les hooks guident l'agent ; des serveurs MCP le relient à des outils externes. Les opérateurs s'en servent pour transformer un diagnostic en code : un runbook, une correction Lambda, une modification de modèle, ou les instructions prêtes pour un agent produites par DevOps Agent.

> **Piège d'examen.** Les agents d'IA accélèrent le diagnostic ; ils ne remplacent ni la détection ni la correction automatique. « Rétablir le service automatiquement en moins d'une minute » reste une action d'alarme ou une règle EventBridge avec un runbook. Amazon Q Developer (inscriptions fermées) et Amazon DevOps Guru (plus de nouveaux clients) ne sont pas des réponses valables pour une nouvelle mise en place.

<!-- section: eventbridge-routing | objectives: 1.2.2 -->
## Acheminer, enrichir et livrer des événements avec EventBridge

Les services AWS envoient leurs événements au **bus d'événements par défaut** du compte, dans chaque Région. Une **règle** sur le bus sélectionne les événements avec un **modèle d'événement** et les envoie à **cinq cibles** au plus. Une règle peut aussi s'exécuter selon une planification, mais **EventBridge Scheduler** est le service le plus récent pour les planifications. Les applications publient avec `PutEvents` sur un bus personnalisé : celui à base de règles s'appelle désormais Custom Event Bus - Classic, et le nouveau **Custom Event Bus** permet aux consommateurs de créer des **abonnés** (subscribers : filtre, transformation facultative, une cible chacun) et conserve les événements, si bien qu'un abonné peut livrer dans l'ordre, repartir d'un point passé et se mettre en pause.

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

Un modèle correspond quand chaque champ listé correspond (ET) ; les valeurs d'un même tableau sont des alternatives (OU). La correspondance est exacte et sensible à la casse, sauf opérateur contraire :

| Opérateur | Exemple |
| --- | --- |
| Préfixe, suffixe | `[{ "prefix": "prod-" }]`, `[{ "suffix": ".png" }]` |
| Tout sauf | `[{ "anything-but": ["running", "pending"] }]` |
| Numérique | `[{ "numeric": [">", 0, "<=", 5] }]` |
| Existence | `[{ "exists": false }]` |
| Insensible à la casse | `[{ "equals-ignore-case": "alarm" }]` |
| Caractère générique | `[{ "wildcard": "arn:aws:s3:::logs-*" }]` |
| Alternatives sur des champs différents | `"$or": [{ "a": ["x"] }, { "b": ["y"] }]` |

Les **cibles** comprennent Lambda, SNS, SQS, Step Functions, Systems Manager Automation et Run Command, les tâches ECS, Kinesis Data Streams, Data Firehose, CloudWatch Logs, les destinations d'API (points de terminaison HTTPS) et un bus d'événements d'un autre compte ou d'une autre Région. Pour Lambda, SNS, SQS et CloudWatch Logs, EventBridge peut s'appuyer sur la politique basée sur les ressources de la cible ; pour les autres, il assume un rôle IAM qui fait confiance à `events.amazonaws.com`.

Ce que la cible reçoit :

- l'événement correspondant entier (par défaut), une partie de celui-ci (`InputPath`, par exemple `$.detail`), ou un JSON constant ;
- un **transformateur d'entrée** (input transformer) : jusqu'à 100 variables extraites de l'événement (`InputPathsMap`) insérées dans un modèle (`InputTemplate`) ; parmi les variables réservées figurent `aws.events.rule-name` et `aws.events.event.json`.

```json
{
  "InputPathsMap": {
    "instance": "$.detail.instance-id",
    "state": "$.detail.state"
  },
  "InputTemplate": "{\"instanceId\": <instance>, \"state\": <state>, \"rule\": <aws.events.rule-name>}"
}
```

L'**enrichissement** se fait dans **EventBridge Pipes**, qui relient une source (SQS, Kinesis, DynamoDB Streams et d'autres flux) à une cible, avec un filtrage facultatif (seuls les événements correspondants sont facturés) et une étape d'enrichissement (Lambda, flux de travail Step Functions Express, API Gateway ou destination d'API) qui ajoute des données avant la livraison, en conservant l'ordre des lots.

**Livraison ailleurs** : pour centraliser les événements, une règle cible le bus d'événements d'un autre compte ou d'une autre Région ; le bus destinataire a besoin d'une politique basée sur les ressources qui autorise `events:PutEvents` depuis l'expéditeur (ou toute l'organisation). Les **archives** conservent les événements d'un bus pendant une période de rétention pour pouvoir les **rejouer** après une correction.

<!-- section: eventbridge-troubleshooting | objectives: 1.2.2 -->
## Dépanner les règles des bus d'événements

Commencez par les métriques de la règle : `TriggeredRules` (le modèle a correspondu), `Invocations`, `FailedInvocations` et, avec une file d'attente de lettres mortes, `InvocationsSentToDLQ`.

| Symptôme | Cause et correction |
| --- | --- |
| `TriggeredRules` reste à 0 | Le modèle ne correspond pas : testez-le avec `TestEventPattern` ou le bac à sable de la console ; vérifiez les valeurs exactes, la casse, le format des ARN et l'existence du champ (les événements CloudTrail ont un champ `resources` vide) |
| Aucun événement « AWS API Call via CloudTrail » | Pas de journal de suivi CloudTrail actif ; les appels en lecture seule (`Describe*`, `Get*`, `List*`) exigent en plus l'état de règle `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` ; les événements des services globaux comme IAM apparaissent dans USA Est (Virginie du Nord) |
| La règle se déclenche, Lambda ne s'exécute jamais | La politique basée sur les ressources de la fonction n'autorise pas `events.amazonaws.com` pour l'ARN de cette règle |
| La cible SNS ou SQS ne reçoit rien | La politique de la rubrique ou de la file n'autorise pas `events.amazonaws.com`, ou la cible est chiffrée avec une clé dont la politique n'autorise pas `kms:Decrypt` et `kms:GenerateDataKey` pour EventBridge |
| Les autres cibles échouent | Le rôle IAM ne fait pas confiance à `events.amazonaws.com` ou n'a pas l'action (pour Automation : `ssm:StartAutomationExecution` plus `iam:PassRole`) |
| Des événements sont perdus après une panne de la cible | La politique de nouvelles tentatives par défaut (24 heures, jusqu'à 185 tentatives, backoff exponentiel avec gigue) a expiré ; ajoutez une file d'attente de lettres mortes (file SQS standard, même Région) |
| Les coûts explosent, la cible s'exécute sans fin | L'action de la cible émet un événement qui correspond à la même règle : resserrez le modèle |

```bash
aws events test-event-pattern \
  --event-pattern file://pattern.json --event file://sample-event.json
```

Les erreurs d'autorisation et de ressource inexistante ne donnent pas lieu à de nouvelles tentatives : ces événements vont directement dans la file d'attente de lettres mortes, avec les attributs `ERROR_CODE`, `ERROR_MESSAGE`, `RULE_ARN` et `TARGET_ARN`. Réglez la politique de nouvelles tentatives par cible avec `MaximumRetryAttempts` et `MaximumEventAgeInSeconds`. Les cibles doivent être idempotentes : une règle peut, rarement, invoquer une cible deux fois.

> **Piège d'examen.** Une règle sur la modification d'un groupe de sécurité qui « ne se déclenche jamais » alors que CloudTrail montre l'appel se trouve en général dans la mauvaise Région ou sur un bus personnalisé. Les événements des services AWS, événements CloudTrail compris, n'arrivent que sur le bus par défaut de la Région où l'appel a été fait.

<!-- section: automation-runbooks | objectives: 1.2.3 -->
## Les runbooks Systems Manager Automation

Un **runbook** est un document SSM de type `Automation` (YAML ou JSON, `schemaVersion: '0.3'`) avec des paramètres et des `mainSteps`. AWS publie des centaines de runbooks prédéfinis (préfixes `AWS-`, `AWSSupport-`, `AWSConfigRemediation-`) ; vous écrivez des runbooks personnalisés pour vos propres procédures.

| Runbook prédéfini | Ce qu'il fait |
| --- | --- |
| `AWS-RestartEC2Instance`, `AWS-StopEC2Instance`, `AWS-StartEC2Instance` | Changent l'état de l'instance |
| `AWS-ResizeInstance` | Change le type d'instance (arrêt, modification, démarrage) |
| `AWS-CreateImage`, `AWS-UpdateLinuxAmi`, `AWS-UpdateWindowsAmi` | Crée une AMI ; applique les correctifs à une AMI source pour en produire une nouvelle |
| `AWS-ASGEnterStandby`, `AWS-ASGExitStandby` | Retirent une instance Auto Scaling du service puis l'y remettent |
| `AWSSupport-ExecuteEC2Rescue`, `AWSSupport-TroubleshootSSH`, `AWSSupport-ResetAccess` | Diagnostiquent et réparent une instance injoignable |
| `AWSConfigRemediation-EnforceEC2InstanceIMDSv2`, `AWSConfigRemediation-ModifyEBSVolumeType` | Corrections utilisées par les règles AWS Config |

Les actions des étapes :

| Action | Usage |
| --- | --- |
| `aws:executeAwsApi` | Appeler n'importe quelle API AWS et lire les sorties avec des sélecteurs |
| `aws:executeScript` | Exécuter du Python (3.10 à 3.12) ou PowerShell 7.4 pendant 600 secondes au plus |
| `aws:runCommand` | Exécuter un document Command (shell, PowerShell) sur des instances gérées |
| `aws:approve` | Attendre des approbateurs, notifiés par SNS |
| `aws:branch`, `aws:loop` | Conditions et boucles |
| `aws:waitForAwsResourceProperty`, `aws:assertAwsResourceProperty` | Attendre ou vérifier l'état d'une ressource |
| `aws:changeInstanceState`, `aws:createImage`, `aws:createStack` | Opérations courantes sans écrire d'appels d'API |
| `aws:invokeLambdaFunction`, `aws:executeStateMachine`, `aws:executeAutomation` | Passer la main à Lambda, Step Functions ou un runbook enfant |

Chaque étape peut définir `onFailure` (`Abort` par défaut, `Continue` ou `step:<name>`), `maxAttempts`, `timeoutSeconds`, `nextStep` et `isEnd`.

```yaml
description: Create an AMI, wait for approval, then stop the instance
schemaVersion: '0.3'
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
  AutomationAssumeRole:
    type: String
    default: ''
mainSteps:
  - name: createImage
    action: aws:createImage
    inputs:
      InstanceId: '{{ InstanceId }}'
      ImageName: 'before-stop-{{ InstanceId }}-{{ global:DATE_TIME }}'
      NoReboot: true
  - name: approve
    action: aws:approve
    inputs:
      Approvers:
        - arn:aws:iam::111122223333:role/OpsLead
      MinRequiredApprovals: 1
      NotificationArn: arn:aws:sns:eu-west-1:111122223333:approvals
  - name: stopInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: stopped
```

Une étape de script personnalisé, quand aucune action intégrée ne convient :

```yaml
  - name: tagVolume
    action: aws:executeScript
    inputs:
      Runtime: python3.11
      Handler: handler
      InputPayload:
        volumeId: '{{ VolumeId }}'
      Script: |-
        import boto3
        def handler(events, context):
            boto3.client('ec2').create_tags(
                Resources=[events['volumeId']],
                Tags=[{'Key': 'reviewed', 'Value': 'false'}])
            return {'tagged': events['volumeId']}
```

`aws:executeScript` ne relance pas pour vous les appels d'API limités (throttling) et renvoie au plus 100 Ko de sortie.

<!-- section: running-automation | objectives: 1.2.3 -->
## Exécuter des runbooks à grande échelle et depuis du code

Les façons de lancer un runbook :

| Lancement | Usage type |
| --- | --- |
| Console, CLI `start-automation-execution`, SDK `StartAutomationExecution` | À la demande, ou depuis vos propres scripts et outils |
| Cible d'une règle EventBridge | Réagir à un événement ou à un changement d'état d'alarme |
| Action de correction AWS Config | Corriger les ressources non conformes, manuellement ou automatiquement |
| Association State Manager, tâche de fenêtre de maintenance | Exécuter selon une planification ou maintenir les ressources dans un état |
| OpsItem d'OpsCenter, plan de réponse Incident Manager | Réponse à un incident lancée par un opérateur |

```text
import boto3
ssm = boto3.client("ssm")
run = ssm.start_automation_execution(
    DocumentName="AWS-RestartEC2Instance",
    Parameters={"InstanceId": ["i-0abc1234def567890"]},
)
print(run["AutomationExecutionId"])
```

Le **contrôle du débit** (rate control) exécute un runbook sur de nombreuses ressources : `--targets` (balises, groupe de ressources, valeurs de paramètre, ou toutes les instances), `--target-parameter-name` (le paramètre qui reçoit chaque cible), `--max-concurrency` et `--max-errors` (nombre ou pourcentage). La simultanéité adaptative, sur option, porte le quota d'automatisations simultanées de 100 jusqu'à 500.

```bash
aws ssm start-automation-execution --document-name AWS-RestartEC2Instance \
  --targets Key=tag:Patch,Values=Group1 --target-parameter-name InstanceId \
  --max-concurrency 10% --max-errors 2
```

**Multicomptes et multirégions** : créez `AWS-SystemsManager-AutomationAdministrationRole` dans le compte central et `AWS-SystemsManager-AutomationExecutionRole` dans chaque compte cible (StackSets est la méthode recommandée), puis passez `--target-locations` avec les comptes ou unités d'organisation, les Régions et leurs propres limites de simultanéité et d'erreurs. Cibler des unités d'organisation exige le compte de gestion ou un administrateur délégué pour Systems Manager. Les runbooks personnalisés doivent être partagés avec les comptes cibles.

```bash
aws ssm modify-document-permission --name Ops-StopWithApproval \
  --permission-type Share --account-ids-to-add 444455556666
```

**Autorisations** : un runbook s'exécute avec le rôle passé dans `AutomationAssumeRole`, un rôle de service qui fait confiance à `ssm.amazonaws.com` (la politique gérée `AmazonSSMAutomationRole` plus ce qu'appellent les étapes) ; l'utilisateur qui le lance a besoin de `iam:PassRole` sur ce rôle. Sans rôle à assumer, Automation utilise les autorisations de l'utilisateur qui l'a lancé, ce qui échoue dès qu'une règle EventBridge ou une correction Config le démarre.

> **Conseil d'examen.** « Appliquer la même correction à 500 instances balisées, 10 % au plus à la fois, et s'arrêter si plus de 5 échouent », c'est le contrôle du débit sur une seule exécution Automation, pas une boucle dans un script. Entre comptes, ajoutez des emplacements cibles plutôt que de vous connecter à chaque compte.

<!-- section: key-points -->
## Points clés

- Valeurs aberrantes : Metrics Insights ; principaux contributeurs : Contributor Insights ; modifications récentes : CloudTrail et AWS Config ; événements côté AWS : AWS Health.
- Échec de la vérification du statut du système : recover ou arrêt puis démarrage ; échec de la vérification du statut de l'instance : redémarrage et réparation du système.
- Corrigez avec les actions d'alarme, les règles EventBridge, la correction automatique Config et les runbooks Automation ; DevOps Agent et CloudWatch investigations accélèrent le diagnostic, Kiro le transforme en code.
- EventBridge : événements AWS sur le bus par défaut de chaque Région, modèles exacts ET/OU avec opérateurs, cinq cibles par règle, transformateurs d'entrée, Pipes pour l'enrichissement, bus entre comptes avec une politique de bus.
- Dépannez avec `TriggeredRules` et `FailedInvocations`, `TestEventPattern`, les politiques de ressource, la confiance des rôles, les politiques de clé KMS, un journal de suivi CloudTrail, une DLQ après 24 heures de nouvelles tentatives.
- Runbooks : `schemaVersion: '0.3'`, étapes comme `aws:executeAwsApi`, `aws:executeScript`, `aws:runCommand`, `aws:approve` ; exécution avec contrôle du débit et emplacements cibles sous `AutomationAssumeRole`.
