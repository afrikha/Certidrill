Les équipes d'exploitation automatisent deux sortes de travail : des tâches récurrentes exécutées sur un parc (scripts, configuration, correctifs, maintenance) et des réactions à ce qui vient de se produire (un objet arrive, un appel d'API modifie un groupe de sécurité, une alarme se déclenche). AWS Systems Manager prend en charge la première ; Amazon EventBridge, les notifications d'événements Amazon S3 (S3 Event Notifications) et AWS Lambda la seconde, et AWS DevOps Agent enquête sur les incidents à l'arrivée des alertes. Ce chapitre couvre les nœuds gérés, Run Command et State Manager, les runbooks Automation, les correctifs, les fenêtres de maintenance et Session Manager, puis les architectures pilotées par les événements et l'exploitation assistée par l'IA.

<!-- section: managed-nodes | objectives: 3.2.1 -->
## Nœuds gérés et outils de Systems Manager

Chaque outil de Systems Manager n'agit que sur des **nœuds gérés** (managed nodes). Une instance EC2 en devient un quand trois conditions sont réunies :

| Condition | Ce qu'il faut vérifier |
| --- | --- |
| SSM Agent installé et en cours d'exécution | Préinstallé sur de nombreuses AMI fournies par AWS (Amazon Linux 2023, Windows Server) ; à installer vous-même sur les images personnalisées |
| Autorisations | Un profil d'instance avec la politique gérée par AWS `AmazonSSMManagedInstanceCore`, ou **Default Host Management Configuration** |
| Chemin réseau | HTTPS sortant (443) vers les points de terminaison `ssm`, `ssmmessages` et `ec2messages`, via une passerelle NAT ou des points de terminaison de VPC d'interface ; S3 accessible pour les mises à jour de l'agent et les correctifs |

**Default Host Management Configuration** (DHMC) est un paramètre de compte, activé Région par Région, qui donne à chaque instance le rôle `AWSSystemsManagerDefaultEC2InstanceManagementRole` sans profil d'instance. Il exige IMDSv2 et SSM Agent 3.2.582.0 ou ultérieur ; les instances peuvent mettre jusqu'à 30 minutes à utiliser le rôle. Si un profil d'instance attaché autorise déjà `ssm:UpdateInstanceInformation`, l'instance utilise ce profil. Les serveurs et machines virtuelles sur site rejoignent le service par une **activation hybride** (code et ID d'activation, plus un rôle de service IAM).

Choisissez l'outil d'après l'exigence :

| Exigence | Outil |
| --- | --- |
| Exécuter une fois un script sur des centaines d'instances sélectionnées par balise, quelques-unes à la fois | Run Command |
| Garder une configuration appliquée sur les instances actuelles et futures, et corriger la dérive | Association State Manager |
| Flux de travail en plusieurs étapes qui appelle des API AWS (arrêter, créer un instantané, créer une AMI, attendre une approbation, redémarrer) | Runbook Automation |
| Installer les correctifs du système d'exploitation selon des règles d'approbation et rendre compte de la conformité | Patch Manager |
| Exécuter des tâches uniquement dans une plage hebdomadaire convenue | Maintenance Windows |
| Shell interactif sans clé SSH, hôte bastion ni port entrant | Session Manager |
| Lister les logiciels installés et la configuration du parc | Inventory |
| Activer les paramètres recommandés pour de nombreux comptes et Régions | Quick Setup |

> **Piège d'examen.** Systems Manager Change Manager et Incident Manager sont fermés aux nouveaux clients depuis le 7 novembre 2025. Pour une nouvelle mise en place, ils ne sont jamais la réponse : les approbations se font dans une étape de runbook Automation (`aws:approve`), la réponse aux incidents dans votre outil de tickets ou d'astreinte.

<!-- section: run-command-state-manager | objectives: 3.2.1 -->
## Run Command et State Manager

**Run Command** envoie un document SSM de type Command (`AWS-RunShellScript`, `AWS-RunPowerShellScript`, `AWS-ConfigureAWSPackage`, `AWS-UpdateSSMAgent`) à des cibles choisies par ID d'instance, balise ou groupe de ressources. Deux contrôles de débit protègent le parc : la **simultanéité** (concurrency : un nombre ou un pourcentage de cibles traitées en même temps) et le **seuil d'erreurs** (error threshold : arrêt de l'envoi à de nouvelles cibles après ce nombre d'échecs). La console n'affiche qu'une partie de la sortie : envoyez-la vers un compartiment S3 ou CloudWatch Logs pour le texte complet, et vers SNS pour les notifications d'état.

```bash
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=tag:Environment,Values=Production" \
  --parameters 'commands=["systemctl restart nginx"]' \
  --max-concurrency "10%" \
  --max-errors "2" \
  --output-s3-bucket-name "example-ops-command-output" \
  --cloud-watch-output-config "CloudWatchOutputEnabled=true"
```

**State Manager** maintient un état souhaité. Une **association** lie un document (Command ou Automation), des cibles, des paramètres et une planification (cron ou rate). Elle s'exécute à sa création, puis selon la planification, et s'applique automatiquement aux nouvelles instances qui portent les balises ciblées : les instances lancées par un groupe Auto Scaling reçoivent donc la même configuration. Associations typiques : installer et configurer l'agent CloudWatch avec `AWS-ConfigureAWSPackage`, garder SSM Agent à jour, collecter l'inventaire avec `AWS-GatherSoftwareInventory`, appliquer des playbooks Ansible. La conformité des associations apparaît dans la vue Compliance.

| Besoin | Run Command | State Manager |
| --- | --- | --- |
| Exécution | Une fois, à la demande | À la création, puis selon une planification |
| Nouvelles instances portant les balises | Non couvertes | Couvertes automatiquement |
| Signale la dérive comme non-conformité | Non | Oui |

> **Conseil d'examen.** « Chaque instance, y compris celles lancées plus tard, doit toujours avoir l'agent configuré, avec le moins de charge opérationnelle » correspond à une association State Manager ciblant une balise. Run Command seul ne corrige que les instances du jour.

<!-- section: automation-runbooks | objectives: 3.2.1 -->
## Runbooks Automation

Un **runbook Automation** (document SSM de type Automation, schéma 0.3) enchaîne des étapes qui appellent des API AWS et des scripts. AWS en fournit des centaines (`AWS-RestartEC2Instance`, `AWS-StopEC2Instance`, `AWS-CreateImage`, `AWS-UpdateLinuxAmi`, `AWS-DisablePublicAccessForSecurityGroup`) ; vous écrivez les vôtres en YAML ou en JSON. Actions courantes : `aws:executeAwsApi`, `aws:changeInstanceState`, `aws:createImage`, `aws:runCommand` (exécuter un document Command sur des instances), `aws:executeScript` (Python ou PowerShell), `aws:waitForAwsResourceProperty`, `aws:branch` et `aws:approve` (pause jusqu'à l'approbation de principaux désignés).

```yaml
description: Stop an instance, create an AMI, then start the instance again
schemaVersion: '0.3'
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
  AutomationAssumeRole:
    type: String
mainSteps:
  - name: stopInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: stopped
  - name: createImage
    action: aws:createImage
    inputs:
      InstanceId: '{{ InstanceId }}'
      ImageName: 'backup-{{ InstanceId }}-{{ global:DATE_TIME }}'
      NoReboot: true
  - name: startInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: running
```

Un runbook s'exécute avec les autorisations de l'utilisateur qui le lance, ou avec le rôle **AutomationAssumeRole** passé en paramètre. Ce rôle est obligatoire quand un service lance le runbook à votre place, et l'appelant a besoin de `iam:PassRole` sur ce rôle. Le contrôle de débit (simultanéité, seuil d'erreurs) s'applique aux runbooks qui ciblent de nombreuses ressources, et un compte central peut lancer une même exécution sur plusieurs comptes et Régions avec les rôles `AWS-SystemsManager-AutomationAdministrationRole` et `AWS-SystemsManager-AutomationExecutionRole`.

Moyens de lancer un runbook : la console ou `aws ssm start-automation-execution`, une cible de règle EventBridge, une action de correction AWS Config, une association State Manager, une tâche de fenêtre de maintenance. L'écriture et le débogage de runbooks personnalisés sont détaillés avec la correction dans le domaine de la surveillance.

> **Piège d'examen.** Un runbook lancé par EventBridge ou AWS Config échoue avec une erreur d'accès quand aucun AutomationAssumeRole n'est défini ou quand ce rôle n'a pas les autorisations d'API de ses étapes. La correction porte sur le rôle, pas sur la règle.

<!-- section: patching-sessions | objectives: 3.2.1 -->
## Correctifs, fenêtres de maintenance et Session Manager

**Patch Manager** compare les nœuds gérés à un **référentiel de correctifs** (patch baseline) : des règles qui approuvent automatiquement les correctifs par classification et gravité un certain nombre de jours après leur publication, plus des listes explicites de correctifs approuvés et rejetés. Les référentiels prédéfinis d'AWS sont des exemples ; AWS recommande des référentiels personnalisés pour garder le contrôle. Un nœud est conforme quand chaque correctif approuvé par le référentiel et disponible est installé.

| Opération ou méthode | Comportement |
| --- | --- |
| `Scan` | Signale les correctifs manquants, n'installe rien |
| `Scan and install` | Installe les correctifs approuvés manquants, redémarre si nécessaire |
| Politique de correctifs (patch policy, Quick Setup) | Méthode recommandée ; une configuration pour toute l'organisation, des unités d'organisation, comptes et Régions choisis, ou un couple compte-Région |
| Tâche de fenêtre de maintenance | Exécute `AWS-RunPatchBaseline` avec Run Command selon une planification que vous maîtrisez |
| Patch now | Application de correctifs à la demande depuis la console |

La conformité des correctifs peut être exportée en rapports CSV dans un compartiment S3 ; elle est un instantané de la dernière opération réussie.

Les **fenêtres de maintenance** (Maintenance Windows) définissent une planification (cron ou rate, avec fuseau horaire), une durée en heures et un **délai de coupure** (cutoff : aucune nouvelle tâche ne démarre pendant les dernières heures), des cibles enregistrées et des tâches de quatre types : Run Command, Automation, Lambda et Step Functions. Chaque tâche cible les nœuds d'un seul couple compte-Région.

**Session Manager** ouvre des sessions shell ou de redirection de port via SSM Agent : aucune règle entrante de groupe de sécurité, aucune clé SSH, aucun hôte bastion. L'accès est une décision IAM (`ssm:StartSession`, restreint par balises de ressource), les sessions peuvent être chiffrées avec une clé KMS, et les préférences de session envoient la sortie complète des sessions vers S3 ou CloudWatch Logs. CloudTrail enregistre qui a ouvert et fermé une session, pas ce qui a été saisi.

> **Piège d'examen.** « Les auditeurs ont besoin de chaque commande saisie pendant les sessions interactives » correspond à la journalisation de Session Manager vers S3 ou CloudWatch Logs. CloudTrail seul n'enregistre que `StartSession` et `TerminateSession`.

<!-- section: eventbridge-automation | objectives: 3.2.2 -->
## Automatisation pilotée par les événements avec EventBridge

Un événement est un JSON avec `source`, `detail-type` et `detail`. Les services AWS publient sur le **bus d'événements par défaut** de chaque Région ; les applications publient sur des bus personnalisés. Une **règle** compare les événements à un **modèle d'événement** (event pattern) et envoie l'événement à au plus cinq cibles. Dans un modèle, les tableaux valent OU, les champs valent ET, et des filtres comme `prefix`, `numeric`, `anything-but` et `exists` affinent la correspondance.

Cette règle réagit à toute ouverture d'un groupe de sécurité :

```json
{
  "source": ["aws.ec2"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["ec2.amazonaws.com"],
    "eventName": ["AuthorizeSecurityGroupIngress"]
  }
}
```

Les événements de detail-type `AWS API Call via CloudTrail` exigent un journal de suivi (trail) CloudTrail avec la journalisation activée. Une règle dans l'état par défaut `ENABLED` ne correspond qu'aux événements de gestion en écriture ; les appels en lecture seule exigent l'état `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`.

| Cible | Autorisation nécessaire à EventBridge |
| --- | --- |
| Fonction Lambda, rubrique SNS, file d'attente SQS | Politique basée sur les ressources sur la cible autorisant `events.amazonaws.com` |
| Systems Manager Automation, Run Command, Step Functions, tâche ECS, bus d'événements d'un autre compte ou d'une autre Région | Rôle IAM qu'EventBridge endosse |
| Destination d'API (point de terminaison HTTP) | Connexion avec les informations d'identification du point de terminaison |

Fonctions de livraison : un **transformateur d'entrée** (input transformer) remet en forme l'événement pour la cible ; une livraison en échec est retentée pendant 24 heures et jusqu'à 185 fois par défaut, puis abandonnée sauf si la cible a une **file d'attente de lettres mortes** (SQS) ; une **archive** conserve les événements pour les **rejouer**. Pour l'automatisation planifiée, AWS recommande **EventBridge Scheduler** (planifications ponctuelles, rate ou cron, avec fuseau horaire) ; les règles planifiées sont une fonctionnalité héritée.

> **Piège d'examen.** Les règles sont régionales. Les événements de Trusted Advisor n'arrivent que dans USA Est (Virginie du Nord) : une règle créée pour eux dans eu-west-1 ne correspond jamais. Créez la règle là où les événements sont émis et transférez-les vers un autre bus si nécessaire.

<!-- section: s3-lambda-events | objectives: 3.2.2 -->
## Notifications d'événements S3 et Lambda

Les notifications d'événements S3 envoient les événements d'un compartiment (bucket) — objet créé, supprimé, restauré, répliqué, transition ou expiration de cycle de vie, balisage, modification d'ACL — vers quatre destinations : une rubrique SNS, une file d'attente SQS standard, une fonction Lambda ou **Amazon EventBridge**. Avec EventBridge activé sur le compartiment, chaque événement va sur le bus par défaut, où les règles ajoutent des filtres plus riches et davantage de cibles. La livraison a lieu au moins une fois et prend généralement quelques secondes : les consommateurs doivent être idempotents. Chaque configuration peut filtrer sur le préfixe et le suffixe de la clé ; deux configurations pour le même type d'événement ne peuvent pas avoir de filtres qui se chevauchent. La destination a besoin d'une politique de ressource qui autorise `s3.amazonaws.com`, limitée au compartiment par `aws:SourceArn`.

| Exigence | Réponse |
| --- | --- |
| Traiter chaque fichier `.csv` chargé sous `incoming/` | Notification sur `s3:ObjectCreated:*` avec filtres de préfixe et de suffixe, vers Lambda |
| Livrer les événements d'objet à une file d'attente SQS FIFO | EventBridge (les files FIFO ne sont pas une destination S3 directe) |
| Plusieurs consommateurs indépendants pour le même événement | Rubrique SNS diffusant vers des files d'attente, ou EventBridge avec plusieurs règles |
| Arrêter les instances de développement à 19 h, heure locale, chaque jour ouvré | Planification EventBridge Scheduler avec fuseau horaire, cible `AWS-StopEC2Instance` ou l'API `StopInstances` |
| Lancer une correction quand AWS Health annonce un événement planifié EC2 | Règle EventBridge sur `aws.health`, cible un runbook Automation |

Lambda sert de liant pour la logique personnalisée. Donnez à son rôle d'exécution les seules actions qu'elle effectue. S3, SNS et EventBridge appellent les fonctions de façon asynchrone : Lambda retente deux fois par défaut un appel asynchrone en échec, puis envoie l'événement vers une destination en cas d'échec (on-failure destination) ou une file d'attente de lettres mortes si elle est configurée. La simultanéité réservée plafonne une fonction afin qu'une rafale d'événements ne surcharge pas un système en aval.

> **Piège d'examen.** Une fonction qui écrit sa sortie dans le compartiment qui la déclenche lance une boucle. Écrivez dans un second compartiment, ou filtrez le déclencheur sur un préfixe d'entrée où la fonction n'écrit jamais.

<!-- section: ai-operations | objectives: 3.2.2 -->
## AWS DevOps Agent et exploitation assistée par l'IA

**AWS DevOps Agent** (disponible en général depuis le 31 mars 2026) est un agent d'IA de réponse aux incidents. Les administrateurs créent des **Agent Spaces** qui définissent les comptes AWS, les outils tiers et les autorisations que l'agent peut utiliser. Les enquêtes démarrent automatiquement depuis les sources d'alertes et de tickets connectées (CloudWatch, Datadog, PagerDuty, ServiceNow et d'autres), par des **webhooks** pour l'automatisation pilotée par les événements, ou manuellement depuis l'application web de l'agent. L'agent construit une topologie de l'application, corrèle la télémétrie, le code et l'historique des déploiements pour trouver la cause racine, propose des étapes d'atténuation et, à partir des incidents passés, des recommandations de prévention ; il peut confier des modifications de code à Kiro sous forme d'instructions prêtes pour un agent.

| Besoin | Réponse |
| --- | --- |
| Même action corrective chaque fois qu'une condition connue survient | Automatisation déterministe : règle EventBridge ou alarme CloudWatch, puis runbook Automation ou Lambda |
| Trouver pourquoi un service s'est dégradé à partir des métriques, journaux, traces et déploiements récents | Enquête AWS DevOps Agent, déclenchée par l'alerte |
| Détection d'anomalies sur les métriques | Détection d'anomalies CloudWatch |
| Aide de l'IA pour écrire des runbooks ou du code d'infrastructure | Kiro |

Relisez le plan d'atténuation de l'agent avant de l'appliquer ; gardez un accès au moindre privilège dans l'Agent Space.

> **Piège d'examen.** Amazon DevOps Guru est fermé aux nouveaux clients depuis le 29 octobre 2026 (fin de support le 30 septembre 2027) : AWS oriente vers CloudWatch pour la détection d'anomalies et vers AWS DevOps Agent pour les enquêtes. Amazon Q Developer est fermé aux nouvelles inscriptions depuis le 15 mai 2026, avec Kiro pour successeur. Aucun des deux n'est une réponse pour une nouvelle mise en place.

<!-- section: key-points -->
## Points clés

- Nœud géré = SSM Agent + autorisations (profil d'instance ou DHMC avec IMDSv2) + chemin HTTPS vers `ssm`, `ssmmessages`, `ec2messages`.
- Run Command s'exécute une fois avec simultanéité et seuil d'erreurs ; State Manager impose un état aux instances actuelles et futures.
- Les runbooks Automation enchaînent des étapes d'API ; les services qui les lancent ont besoin d'un AutomationAssumeRole.
- Les politiques de correctifs de Quick Setup sont la méthode recommandée ; `Scan` signale, `Scan and install` corrige.
- Session Manager : ni port entrant ni clés ; journaux de session vers S3 ou CloudWatch Logs pour auditer les commandes.
- Les règles EventBridge comparent des modèles par Région ; les événements d'API CloudTrail exigent un journal de suivi ; nouvelles tentatives pendant 24 heures, DLQ, archive et relecture ; Scheduler pour les planifications.
- Les notifications S3 vont vers SNS, SQS standard, Lambda ou EventBridge ; EventBridge pour les files FIFO et le filtrage avancé.
- DevOps Agent enquête sur les alertes ; les corrections déterministes restent dans EventBridge et Systems Manager ; DevOps Guru, Change Manager, Incident Manager et Q Developer sont fermés aux nouveaux clients.
