Un plan de réponse aux incidents se juge le jour où l'on en a besoin : l'examen demande donc ce qui doit exister avant la première alerte. Des playbooks écrits, des runbooks exécutables, des rôles d'intervenants dans chaque compte, des outils de sécurité déployés de façon centralisée, un compte d'investigation numérique (forensic), des protections DDoS avec une équipe de réponse capable d'agir, des tests qui prouvent que tout fonctionne et une automatisation qui confine les cas courants sans attendre un humain. Ce chapitre suit cet ordre : planifier, préparer, tester, automatiser.

<!-- section: plans-runbooks | objectives: 2.1.1 -->
## Plans de réponse, playbooks et runbooks

AWS aligne ses recommandations de réponse aux incidents sur le cycle de vie NIST SP 800-61 : **préparation**, **détection et analyse**, **confinement, éradication et restauration**, et **activités post-incident**. Un plan comporte trois niveaux :

| Niveau | Contenu | Forme sur AWS |
| --- | --- | --- |
| Plan | Périmètre, rôles (responsable de l'incident, intervenants, juridique, communication), niveaux de gravité, chemins d'escalade, listes de contacts, règles de gestion des preuves | Document conservé hors des comptes affectés, revu après chaque exercice |
| Playbook | Les étapes d'investigation et de décision pour un scénario : clé d'accès exposée, compartiment S3 public, instance EC2 compromise, minage de cryptomonnaie, rançongiciel contre les données | Document accompagné de requêtes, souvent un bloc-notes |
| Runbook | Les actions exactes et reproductibles d'une étape (isoler une instance, désactiver une clé, créer des instantanés des volumes) | Runbook Systems Manager Automation, fonction Lambda, machine d'état Step Functions |

Les outils cités par le guide, et leur place :

| Outil | Rôle dans la réponse aux incidents |
| --- | --- |
| **Systems Manager Automation** | Runbooks écrits en YAML ou JSON (`schemaVersion: '0.3'`) avec des étapes comme `aws:executeAwsApi`, `aws:executeScript`, `aws:runCommand` et `aws:approve` (une étape d'approbation manuelle). S'exécute sous un rôle assumé, avec contrôle du débit et exécution multicomptes et multirégions |
| **Systems Manager OpsCenter** | Les OpsItems regroupent le travail sur un problème : créés par des règles EventBridge (par exemple sur des résultats Security Hub CSPM) ou par des alarmes CloudWatch à l'état `ALARM`, avec les ressources liées (jusqu'à 100 ARN), les runbooks Automation associés lancés par **Run automation** et un historique de 30 jours des exécutions |
| **Blocs-notes Amazon SageMaker AI** | Des blocs-notes Jupyter comme playbooks interactifs : l'explication, les requêtes Athena ou SDK et leurs résultats tiennent dans un seul document que les intervenants exécutent et conservent comme trace |
| **AWS Security Incident Response** | Service géré : trie les résultats de menace de GuardDuty et de Security Hub CSPM, ouvre des dossiers proactifs, donne un accès 24 h/24 et 7 j/7 aux intervenants AWS et, avec une autorisation préalable, exécute le confinement d'instances EC2, de compartiments S3 et de principaux IAM |
| **Systems Manager Incident Manager** | Plans de réponse, contacts, escalade et astreinte. **Fermé aux nouveaux clients depuis le 7 novembre 2025** (les clients existants continuent) ; ne bâtissez pas une nouvelle solution autour de lui |

Un runbook de confinement minimal, prêt à être lancé depuis un OpsItem ou par une règle EventBridge :

```yaml
description: Quarantine a suspected compromised EC2 instance and snapshot its volumes
schemaVersion: '0.3'
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
  QuarantineSecurityGroupId:
    type: String
  AutomationAssumeRole:
    type: String
mainSteps:
  - name: tagForInvestigation
    action: aws:createTags
    inputs:
      ResourceType: EC2
      ResourceIds:
        - '{{ InstanceId }}'
      Tags:
        - Key: ir-status
          Value: quarantined
  - name: replaceSecurityGroups
    action: aws:executeAwsApi
    inputs:
      Service: ec2
      Api: ModifyInstanceAttribute
      InstanceId: '{{ InstanceId }}'
      Groups:
        - '{{ QuarantineSecurityGroupId }}'
  - name: snapshotAllVolumes
    action: aws:executeAwsApi
    inputs:
      Service: ec2
      Api: CreateSnapshots
      InstanceSpecification:
        InstanceId: '{{ InstanceId }}'
      CopyTagsFromSource: volume
```

> **Conseil d'examen.** « Les intervenants ont besoin d'une procédure documentée et reproductible qu'un humain peut approuver avant qu'elle ne modifie la production » désigne un runbook Systems Manager Automation avec une étape `aws:approve`, lancé depuis OpsCenter. « Une investigation interactive où requêtes et résultats restent ensemble » désigne les blocs-notes.

<!-- section: preparation | objectives: 2.1.2 -->
## Préparer les comptes et les services aux incidents

**Provisionner les accès avant d'en avoir besoin.**

- Déployez à l'avance des **rôles de réponse aux incidents** dans chaque compte (CloudFormation StackSets ou personnalisations Control Tower) : un rôle d'investigation en lecture seule et un rôle de confinement distinct, limité aux actions qu'utilisent les runbooks. Les intervenants y accèdent par des jeux d'autorisations IAM Identity Center ou par assumption de rôle depuis le compte de sécurité.
- Conservez un accès **bris de glace** (break-glass) qui ne dépend pas du fournisseur d'identité (par exemple un utilisateur ou un rôle IAM étroitement surveillé dans le compte de gestion, avec MFA), qui déclenche une alarme lorsqu'il est utilisé.
- Vérifiez que les intervenants peuvent réellement assumer les rôles ; un rôle jamais testé se révèle cassé pendant l'incident.

**Déployer les outils de sécurité de façon centralisée.** Utilisez un compte d'outillage de sécurité comme **administrateur délégué** de GuardDuty, Security Hub, Detective, Inspector et Macie, un **journal de suivi d'organisation** (organization trail) livré dans un compte d'archivage des journaux, AWS Config dans chaque compte et chaque Région, et les journaux de flux VPC et les journaux de requêtes Route 53 Resolver sur les VPC critiques. Des journaux jamais collectés ne peuvent pas être analysés.

**Construire un compte forensic à l'avance** : un VPC isolé sans accès à Internet, des AMI forensic avec les outils préinstallés (créées avec EC2 Image Builder), un compartiment de preuves avec la gestion des versions et S3 Object Lock, et des clés KMS dont les politiques permettent au compte forensic d'utiliser les instantanés partagés.

**Réduire le rayon d'impact (blast radius)** : un compte par charge de travail et par environnement, des SCP et des RCP comme garde-fous, des rôles au moindre privilège avec des sessions courtes, une segmentation réseau, et l'archive des journaux dans un compte distinct que les administrateurs des charges de travail ne peuvent pas modifier.

**Configurer les protections AWS Shield Advanced avant une attaque :**

| Paramètre | À savoir |
| --- | --- |
| Ressources protégées | Distributions CloudFront, zones hébergées Route 53, accélérateurs standard Global Accelerator, adresses IP Elastic (donc les instances EC2 et NLB associés), ALB et Classic Load Balancers. Rien n'est protégé tant que vous ne l'ajoutez pas, directement ou par une politique Shield Advanced de Firewall Manager |
| Détection basée sur l'état | Associez une vérification de l'état Route 53 à chaque protection (tous les types sauf les zones hébergées) : la détection devient plus rapide et plus sensible quand l'application est défaillante |
| Accès de la Shield Response Team (SRT) | Un rôle IAM approuvant `drt.shield.amazonaws.com` avec la politique gérée `AWSShieldDRTAccessPolicy` ; en option jusqu'à 10 compartiments S3 de journaux dans la console. Exige Business Support ou Enterprise Support |
| Engagement proactif | La SRT vous contacte quand un événement détecté par Shield Advanced affecte les vérifications de l'état : exige des vérifications de l'état, au moins un contact (jusqu'à 10) et une ACL web WAF (v2) sur la ressource protégée |
| Couche application | ACL web sur CloudFront et les ALB. Depuis le 26 mars 2026, le groupe de règles géré **Anti-DDoS** (`AWSManagedRulesAntiDDoSRuleSet`, inclus dans l'abonnement) est la protection par défaut contre les inondations HTTP ; l'ancienne atténuation automatique de la couche application reste disponible pour les utilisateurs existants |
| Facturation | Un abonnement pour la famille de facturation consolidée ; les frais WAF des ressources protégées sont inclus (Bot Control, CAPTCHA et quelques options exclus) |

> **Piège d'examen.** La SRT ne peut pas lire les journaux de compartiments chiffrés avec des clés AWS KMS : les journaux que vous comptez partager avec la SRT doivent être en clair ou dans des compartiments SSE-S3 du même compte. Et l'engagement proactif ne fonctionne pas sans vérifications de l'état Route 53 associées.

<!-- section: plan-testing | objectives: 2.1.3 -->
## Tester et valider le plan

| Méthode | Ce qu'elle prouve |
| --- | --- |
| Exercice sur table (tabletop) | Les rôles, décisions, communications et escalades sont clairs ; les lacunes des playbooks apparaissent |
| Simulation avec des exemples de résultats | Les chaînes de détection, règles EventBridge, notifications et runbooks se déclenchent de bout en bout |
| Game day ou exercice red team | Détection et réponse face à une activité réaliste, y compris l'accès aux comptes et aux outils |
| AWS Fault Injection Service (FIS) | La charge de travail et ses alarmes se comportent comme prévu quand de vraies pannes sont injectées |
| AWS Resilience Hub | L'application atteint ses objectifs de RTO et de RPO et dispose des alarmes, SOP et tests nécessaires |

Les exemples de résultats GuardDuty testent une chaîne de réponse sans menace réelle :

```bash
aws guardduty create-sample-findings \
  --detector-id 12abc34d567e8fa901bc2d34e56789f0 \
  --finding-types UnauthorizedAccess:EC2/SSHBruteForce Recon:EC2/PortProbeUnprotectedPort
```

**AWS FIS** : un **modèle d'expérience** définit des **actions** (par exemple `aws:network:disrupt-connectivity` avec un `scope` comme `all` ou `s3`, `aws:ec2:stop-instances`, `aws:ssm:send-command`, `aws:ssm:start-automation-execution`, `aws:fis:inject-api-internal-error`), des **cibles** sélectionnées par ID, balise ou état, et des **conditions d'arrêt**, qui sont des alarmes CloudWatch interrompant l'expérience. FIS agit par un rôle IAM que vous fournissez, peut cibler d'autres comptes dans des expériences multicomptes et exécute de vraies actions sur de vraies ressources : commencez en préproduction.

```json
{
  "description": "Cut network access of tagged app instances for 5 minutes",
  "roleArn": "arn:aws:iam::111122223333:role/fis-experiments",
  "targets": {
    "appSubnets": {
      "resourceType": "aws:ec2:subnet",
      "resourceTags": { "ir-test": "true" },
      "selectionMode": "ALL"
    }
  },
  "actions": {
    "isolateSubnets": {
      "actionId": "aws:network:disrupt-connectivity",
      "parameters": { "duration": "PT5M", "scope": "all" },
      "targets": { "Subnets": "appSubnets" }
    }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:eu-west-1:111122223333:alarm:orders-error-rate" }
  ]
}
```

**AWS Resilience Hub** importe une application (CloudFormation, Terraform, EKS ou myApplications), l'évalue par rapport à une **politique de résilience** (RTO et RPO pour les perturbations de l'application, de l'infrastructure, d'une zone de disponibilité et d'une Région), calcule un score de résilience, recommande des alarmes CloudWatch, des procédures d'exploitation standard (SOP) et des expériences FIS, et détecte la dérive par rapport à la configuration évaluée.

Mesurez chaque test : délai de détection, délai de confinement, contact des bonnes personnes, runbook conforme à ce qu'il promet. Mettez ensuite le plan à jour ; la revue post-incident fait partie du cycle de vie, ce n'est pas une option.

> **Piège d'examen.** FIS injecte des pannes ; il n'évalue pas une application par rapport au RTO et au RPO. Resilience Hub évalue et recommande, et exécute des expériences FIS pour les tests. Une condition d'arrêt FIS est toujours une alarme CloudWatch.

<!-- section: auto-remediation | objectives: 2.1.4 -->
## Correction automatique

Le schéma courant est **résultat, puis règle EventBridge, puis cible**. GuardDuty, Security Hub CSPM, Inspector, Macie, Config et CloudTrail publient tous des événements. Une règle pour les résultats GuardDuty de gravité élevée et critique sur des instances EC2 :

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [{ "numeric": [">=", 7] }],
    "resource": { "resourceType": ["Instance"] }
  }
}
```

| Exigence | Cible |
| --- | --- |
| Une action d'API rapide (désactiver une clé, bloquer l'accès public) | Fonction Lambda (15 minutes au maximum) |
| Plusieurs étapes, branches, nouvelles tentatives, collecte de preuves en parallèle, attentes ou approbation humaine par un jeton de tâche | AWS Step Functions |
| Runbook réutilisable avec approbations, contrôle du débit et exécution multicomptes | Systems Manager Automation |
| La configuration d'une ressource s'écarte d'une règle (volume non chiffré, port ouvert) | Règle AWS Config avec correction automatique (un runbook Automation, avec nouvelles tentatives) |
| Un analyste choisit d'agir sur un résultat dans la console | Action personnalisée Security Hub CSPM, qui émet un événement EventBridge |
| Collecter automatiquement les preuves mémoire et disque d'EC2 | Automated Forensics Orchestrator for Amazon EC2 |
| Rétablir la disponibilité en éloignant le trafic d'une zone ou d'une Région dégradée | Amazon Application Recovery Controller (ARC) |

**Automated Forensics Orchestrator for Amazon EC2** (une AWS Solution, dont la documentation s'intitule désormais « for Amazon EC2 and EKS ») : les résultats Security Hub arrivent dans EventBridge, qui lance un flux de tri Step Functions (détails de l'instance, isolation décidée par l'action Security Hub, acquisition décidée par les balises de l'instance). Les acquisitions mémoire et disque s'exécutent en parallèle : la mémoire part dans S3 puis l'instance est isolée par un nouveau groupe de sécurité ; les instantanés EBS sont partagés avec le compte forensic. Un flux d'investigation lance ensuite une instance à partir de l'**AMI forensic** (agent SSM et outils), y attache les preuves, exécute les outils avec Run Command et rend compte par SNS. DynamoDB suit l'état.

Capacités d'**ARC** : **zonal shift** (éloigner le trafic d'une zone de disponibilité pendant trois jours au plus, prolongeables), **zonal autoshift** (AWS déplace le trafic pour vous d'après sa télémétrie), **routing control** (basculement DNS entre Régions, avec des règles de sécurité) et **Region switch** (plans de reprise multirégions orchestrés). Le **readiness check** d'ARC est en maintenance (fermé aux nouveaux clients depuis le 30 avril 2026).

> **Piège d'examen.** La correction Config traite la dérive de configuration ; ce n'est pas un moteur de réponse aux menaces. Un résultat GuardDuty passe par EventBridge. Et une action personnalisée Security Hub CSPM doit être déclenchée par un analyste : « sans intervention humaine » signifie une règle EventBridge sur les résultats eux-mêmes.

<!-- section: key-points -->
## Points clés

- Plan, playbook, runbook : les décisions sur papier, les étapes d'un scénario dans des documents ou des blocs-notes, les actions dans des runbooks Automation, Lambda ou Step Functions. Incident Manager est fermé aux nouveaux clients.
- Préparer : rôles d'intervenants prédéployés, accès bris de glace, administrateurs délégués dans un compte de sécurité, journal de suivi d'organisation, compte forensic avec AMI forensic et Object Lock, rayon d'impact réduit.
- Shield Advanced : ajouter explicitement les ressources, vérifications de l'état Route 53 pour la détection basée sur l'état et l'engagement proactif, rôle SRT avec `AWSShieldDRTAccessPolicy`, Business ou Enterprise Support, groupe de règles Anti-DDoS contre les inondations HTTP.
- Tester : exercices sur table, exemples de résultats, game days, expériences FIS avec des alarmes comme conditions d'arrêt, évaluations Resilience Hub par rapport au RTO et au RPO.
- Automatiser : règles EventBridge vers Lambda, Step Functions ou Automation ; correction Config pour la dérive ; l'orchestrateur forensic pour les preuves ; ARC pour rétablir la disponibilité.
