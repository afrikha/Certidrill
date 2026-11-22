Les questions de conformité vérifient qu'un objectif de contrôle fonctionne seul : une règle signale la ressource qui dérive, un runbook la corrige, la bonne équipe est prévenue et les preuves satisfont l'auditeur. Elles vérifient aussi quel service prouve quoi, et quels services ont fermé aux nouveaux clients en 2026. Ce chapitre couvre AWS Config, Security Hub CSPM et Security Hub, AWS Artifact, AWS Audit Manager et l'outil AWS Well-Architected Tool.

<!-- section: config-rules | objectives: 6.3.1 -->
## Détecter les ressources non conformes avec AWS Config

AWS Config n'évalue que ce que son **enregistreur de configuration** (configuration recorder) enregistre : activez l'enregistrement dans chaque compte et chaque Région concernés (types de ressources globaux dans une seule Région). Une règle renvoie `COMPLIANT`, `NON_COMPLIANT`, `NOT_APPLICABLE` ou `ERROR` (paramètre non valide).

| Type de règle | Ce que vous écrivez | Usage type |
| --- | --- | --- |
| Règle gérée par AWS | Rien, seulement des paramètres | `s3-bucket-public-read-prohibited`, `cloudtrail-enabled`, `encrypted-volumes`, `cmk-backing-key-rotation-enabled` |
| Règle de politique personnalisée | Une politique CloudFormation Guard | Vérifications de propriétés sans code à maintenir |
| Règle Lambda personnalisée | Une fonction Lambda qui appelle `PutEvaluations` | Logique qui a besoin d'appels d'API ou de données externes |
| Règle liée à un service (service-linked rule) | Créée par un autre service, par exemple Security Hub CSPM | En lecture seule dans votre compte ; impossible de la modifier ou d'y associer une correction |

**Déclencheurs** : modifications de configuration (portée par type de ressource, ID de ressource, ou clé et valeur de balise), périodique (par exemple toutes les 24 heures) ou hybride. **Modes d'évaluation** : détection (ressources déployées) et proactif (propriétés de la ressource avant déploiement, soumises avec `StartResourceEvaluation`, par exemple depuis un pipeline). L'évaluation proactive renvoie un résultat ; elle ne bloque pas le déploiement et ne corrige rien.

Pour déployer les mêmes règles partout :

| Besoin | Mécanisme |
| --- | --- |
| Une règle dans chaque compte membre, non modifiable par eux | Règle Config d'organisation (`PutOrganizationConfigRule`), par API ou CLI uniquement, depuis le compte de gestion ou un administrateur délégué |
| Un ensemble de règles et leurs corrections en une seule unité | Pack de conformité (conformance pack) : géré par AWS, ou personnalisé à partir d'un modèle YAML |
| Le même pack dans chaque compte, certains comptes exclus | Pack de conformité d'organisation avec `--excluded-accounts` |
| Un point de départ aligné sur un référentiel | Exemples de modèles (Operational Best Practices for PCI DSS, NIST...) |
| Contrôles attachés aux OU d'une zone d'atterrissage (landing zone) | Contrôles de détection d'AWS Control Tower (déployés comme règles Config) |

Les règles et packs de conformité d'organisation sont régionaux (appelez l'API dans chaque Région) ; les comptes qui rejoignent l'organisation les reçoivent, si un enregistreur existe dans les 7 heures. Leur administrateur délégué utilise le principal de service `config-multiaccountsetup.amazonaws.com`.

```bash
aws organizations register-delegated-administrator \
  --account-id 444455556666 \
  --service-principal config-multiaccountsetup.amazonaws.com

aws configservice put-organization-conformance-pack \
  --organization-conformance-pack-name data-protection-baseline \
  --template-s3-uri s3://anycompany-config-templates/data-protection.yaml \
  --delivery-s3-bucket awsconfigconforms-anycompany \
  --excluded-accounts "777788889999"
```

Un compartiment de livraison, si vous en indiquez un, doit commencer par `awsconfigconforms`.

> **Piège d'examen.** Une règle Config n'empêche jamais rien, en mode détection comme en mode proactif. « Garantir que personne ne peut créer » appelle une SCP, une RCP ou une politique déclarative ; « détecter et corriger en quelques minutes » appelle une règle Config avec correction automatique.

<!-- section: remediation-notifications | objectives: 6.3.1 -->
## Correction, agrégation et notifications

La **correction** (remediation) associe à une règle un runbook Systems Manager Automation (`TargetType: SSM_DOCUMENT`, fourni par AWS ou le vôtre). La correction manuelle attend un opérateur ; la correction automatique s'exécute à chaque évaluation non conforme.

| Paramètre | Comportement |
| --- | --- |
| `MaximumAutomaticAttempts` | 1 à 25, 5 par défaut |
| `RetryAttemptSeconds` | 60 par défaut ; après la dernière tentative échouée dans cette fenêtre, Config enregistre une exception de correction |
| Paramètre d'ID de ressource | Remplacé à l'exécution par l'ID de la ressource non conforme |
| `AutomationAssumeRole` | Rôle qu'assume le runbook ; ne lui donnez que les autorisations nécessaires à la correction |
| Activation de la correction automatique | Lance la correction de toutes les ressources déjà non conformes |

La correction s'appuie sur des instantanés de conformité : une ressource modifiée récemment peut parfois être corrigée alors qu'elle est conforme ; chaque nouvelle tentative est une exécution Automation facturée.

Un pack de conformité porte la règle et sa correction dans le même modèle :

```yaml
Resources:
  BucketPublicReadProhibited:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: s3-bucket-public-read-prohibited
      Scope:
        ComplianceResourceTypes:
          - AWS::S3::Bucket
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_PUBLIC_READ_PROHIBITED
  BucketPublicReadRemediation:
    Type: AWS::Config::RemediationConfiguration
    DependsOn: BucketPublicReadProhibited
    Properties:
      ConfigRuleName: s3-bucket-public-read-prohibited
      TargetType: SSM_DOCUMENT
      TargetId: AWS-DisableS3BucketPublicReadWrite
      Automatic: true
      MaximumAutomaticAttempts: 3
      RetryAttemptSeconds: 120
      Parameters:
        S3BucketName:
          ResourceValue:
            Value: RESOURCE_ID
        AutomationAssumeRole:
          StaticValue:
            Values:
              - arn:aws:iam::111122223333:role/ConfigS3Remediation
```

Un **agrégateur** (aggregator) réplique les données de configuration et de conformité de nombreux comptes et Régions dans un seul compte, sans frais supplémentaires. Sa source est une liste de comptes (chacun doit autoriser le compte et la Région de l'agrégateur) ou l'organisation (aucune autorisation ; un rôle avec `AWSConfigRoleForOrganizations` ; administrateur délégué enregistré avec `config.amazonaws.com`). Il est en lecture seule : ni déploiement de règles, ni correction.

Les **notifications** suivent deux chemins :

| Chemin | Contenu | Quand le choisir |
| --- | --- | --- |
| Rubrique SNS du canal de livraison | Tous les messages Config : modifications d'éléments de configuration, instantanés, changements de conformité, début d'évaluation, échecs de livraison | Rarement pour l'alerte : très bruyant |
| Règle EventBridge sur `aws.config` | Uniquement les événements filtrés, par exemple les passages à `NON_COMPLIANT` | Alertes et correction pilotée par les événements (SNS, Lambda, Automation, AWS User Notifications) |

```json
{
  "source": ["aws.config"],
  "detail-type": ["Config Rules Compliance Change"],
  "detail": {
    "messageType": ["ComplianceChangeNotification"],
    "configRuleName": ["s3-bucket-public-read-prohibited"],
    "newEvaluationResult": {
      "complianceType": ["NON_COMPLIANT"]
    }
  }
}
```

AWS User Notifications s'appuie sur EventBridge et livre au Console Notification Center, par e-mail, sur des canaux de discussion et dans l'AWS Console Mobile App.

> **Conseil d'examen.** Un compte de sécurité qui doit voir la conformité de tous les comptes utilise un agrégateur d'organisation ; les corrections s'exécutent depuis la configuration de correction de chaque compte, déployée par un pack de conformité d'organisation.

<!-- section: security-hub-compliance | objectives: 6.3.1 -->
## Normes de conformité dans Security Hub CSPM et Security Hub

**AWS Security Hub CSPM** (le service anciennement nommé Security Hub) exécute des normes de sécurité sous forme de contrôles et produit des résultats (findings) avec un statut de conformité (`PASSED`, `FAILED`, `WARNING`, `NOT_AVAILABLE`) :

| Norme | Usage |
| --- | --- |
| AWS Foundational Security Best Practices | Référentiel d'AWS pour l'ensemble des services, le choix par défaut |
| CIS AWS Foundations Benchmark v1.2.0, v1.4.0, v3.0.0, v5.0.0 | Alignement CIS ; v5.0.0 recommandée, à activer avant de désactiver une version plus ancienne |
| NIST SP 800-53 Rev. 5, NIST SP 800-171 Rev. 2, PCI DSS, CRI Profile | Référentiels réglementaires |
| AWS Resource Tagging, AI Security Best Practices | Gouvernance des balises, charges de travail d'IA |
| Norme gérée par un service : AWS Control Tower | Contrôles gérés depuis Control Tower |

La plupart des contrôles reposent sur AWS Config. Security Hub CSPM crée des **règles Config liées au service** préfixées `securityhub-`, hors du quota de règles Config, dont les résultats n'apparaissent que dans Security Hub. Sans enregistrement, le contrôle `Config.1` échoue et les contrôles dépendants renvoient `WARNING` ; quand le nouveau Security Hub est aussi activé, un enregistreur lié au service (`AWSConfigurationRecorderForSecurityHubCSPM`) est géré pour vous. Pour arrêter une vérification sans objet, **désactivez le contrôle** : les évaluations et leurs frais s'arrêtent.

**À l'échelle d'une organisation**, un administrateur délégué configure Security Hub CSPM. AWS recommande désormais les **politiques déclaratives de Security Hub CSPM** (declarative policies), attachées via AWS Organizations avec une configuration par défaut et des surcharges par Région. Elles excluent la **configuration centrale** (central configuration : Région d'origine, Régions liées, jusqu'à 20 politiques de configuration) : la première politique déclarative qui régit un compte la désactive pour toute l'organisation. Le nouveau Security Hub utilise les **politiques Security Hub** (`enable_in_regions`, `disable_in_regions`).

**Agir sur les résultats** :

| Exigence | Mécanisme |
| --- | --- |
| Relever la gravité des résultats des comptes de production, supprimer les résultats informatifs | Règles d'automatisation de Security Hub CSPM (critères ASFF, jusqu'à 100 par compte administrateur, par Région) |
| Ouvrir un ticket Jira Cloud ou ServiceNow ITSM pour les résultats critiques | Règles d'automatisation du nouveau Security Hub (critères OCSF, mise à jour de `SeverityId`, `StatusId`, `Comment`, ou création de ticket) |
| Corriger automatiquement chaque nouveau résultat en échec d'un contrôle | Règle EventBridge sur `Security Hub Findings - Imported` filtrée sur le contrôle, cible Lambda ou un runbook Automation |
| Permettre à un analyste de déclencher une correction sur des résultats choisis | Action personnalisée (custom action, jusqu'à 50), règle EventBridge sur `Security Hub Findings - Custom Action` correspondant à son ARN |

Avec l'agrégation entre Régions, les règles d'automatisation du nouveau Security Hub se créent dans la Région d'origine et s'appliquent aux Régions liées ; celles de Security Hub CSPM ne s'appliquent que dans leur propre Région.

> **Piège d'examen.** Les règles d'automatisation ne font que modifier des champs de résultats ou ouvrir des tickets. La correction vient de la correction Config ou d'une règle EventBridge qui lance Lambda ou Systems Manager Automation.

<!-- section: audit-evidence | objectives: 6.3.2 -->
## Collecter des preuves d'audit avec AWS Artifact et AWS Audit Manager

**AWS Artifact** est gratuit et couvre la part d'AWS dans le modèle de responsabilité partagée :

| Besoin | Fonctionnalité d'Artifact |
| --- | --- |
| Rapports SOC, ISO et PCI DSS et certifications d'AWS pour un auditeur | Rapports, téléchargés à la demande après acceptation de leurs conditions |
| Rapports de logiciels d'éditeurs (ISV) achetés via AWS Marketplace | Rapports tiers, pour les clients qui ont reçu l'accès dans AWS Marketplace Vendor Insights |
| Un avenant d'associé commercial (BAA) pour des charges de travail HIPAA dans un compte | Accord de compte (account agreement) |
| Le même accord pour tous les comptes actuels et futurs | Accord d'organisation, accepté ou résilié uniquement depuis le compte de gestion, toutes fonctionnalités activées |
| Un e-mail à la publication de nouveaux rapports SOC | Notifications d'Artifact (filtre par catégorie et série, jusqu'à 20 adresses vérifiées) |

Donnez à chaque auditeur des informations d'identification distinctes, limitées aux rapports dont il a besoin :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AuditorReadSocPciIsoReports",
      "Effect": "Allow",
      "Action": [
        "artifact:ListReports",
        "artifact:GetReportMetadata",
        "artifact:GetReport",
        "artifact:GetTermForReport"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "artifact:ReportSeries": ["SOC", "PCI", "ISO"],
          "artifact:ReportCategory": ["Certifications and Attestations"]
        }
      }
    }
  ]
}
```

**AWS Audit Manager** associe vos propres preuves à des référentiels (frameworks). Il est en maintenance depuis le **30 avril 2026** : il ne peut plus être configuré dans de nouveaux comptes, de nouvelles Régions ou de nouvelles organisations, et ne reçoit plus de nouvelles fonctionnalités ni de nouveaux référentiels. Les clients existants continuent de l'utiliser, créent des évaluations et ajoutent des comptes de leur organisation.

| Source de données | Type de preuve | Collecte |
| --- | --- | --- |
| Règles AWS Config | Vérification de conformité (compliance check) | À chaque évaluation de la règle |
| Contrôles Security Hub CSPM | Vérification de conformité (compliance check) | Selon la planification du contrôle |
| CloudTrail | Activité utilisateur (user activity) | En continu |
| Appels d'API AWS | Données de configuration (configuration data) | Quotidienne, hebdomadaire ou mensuelle |
| Fichiers chargés (politiques, procédures, sur site) | Preuve manuelle | Au chargement |

Une **évaluation** (assessment) applique un référentiel (standard, comme PCI DSS, HIPAA, SOC 2 ou RGPD, ou personnalisé) aux comptes concernés et collecte des preuves jusqu'à ce qu'elle soit rendue inactive. Les **délégations** confient des ensembles de contrôles à des experts. Un **rapport d'évaluation** ne contient que les preuves sélectionnées, plus une somme de contrôle `digest.txt` vérifiée avec `ValidateAssessmentReportIntegrity`. L'**evidence finder** stocke les preuves dans un magasin de données d'événements CloudTrail Lake. Audit Manager collecte des preuves ; il ne certifie jamais la conformité.

Pour une nouvelle organisation, AWS oriente vers les packs de conformité Config (preuves exportées avec les requêtes avancées ou `get-resource-config-history`), les normes Security Hub CSPM et les contrôles Control Tower. Les packs de conformité ne couvrent que les contrôles techniques qu'une règle Config peut évaluer ; SOC 2 et le RGPD n'ont pas d'équivalent en pack de conformité.

> **Piège d'examen.** Artifact prouve ce que fait AWS, jamais que vos compartiments sont chiffrés. « L'attestation PCI DSS d'AWS » relève d'Artifact ; « prouver que nos ressources ont respecté PCI DSS toute l'année » relève des preuves Config et Security Hub CSPM (Audit Manager seulement là où il est déjà configuré).

<!-- section: well-architected-review | objectives: 6.3.3 -->
## Évaluer les architectures avec l'outil AWS Well-Architected Tool

L'**AWS Well-Architected Tool** (gratuit) enregistre la revue d'une **charge de travail** (workload) selon les six piliers. Le pilier Sécurité compte sept domaines : fondations de la sécurité, gestion des identités et des accès, détection, protection de l'infrastructure, protection des données, réponse aux incidents, sécurité des applications.

| Élément | Rôle |
| --- | --- |
| Charge de travail | Nom, responsable de la revue, environnement (production ou préproduction), Régions, jusqu'à 100 ID de compte, application AppRegistry facultative |
| Lenses | Lens AWS Well-Architected Framework appliqué automatiquement ; d'autres depuis le Lens Catalog ou des lenses personnalisés ; jusqu'à 20 par charge de travail |
| Lens personnalisé (custom lens) | Vos propres piliers, questions et bonnes pratiques, partageables avec des comptes ou l'organisation |
| Profil (profile) | Contexte métier qui priorise les questions et les risques du plan d'amélioration |
| Modèle de revue (review template) | Réponses préremplies réutilisées entre charges de travail, partageables dans la même Région |
| Risques élevés et moyens (HRI, MRI) | Résultat de vos réponses ; un risque accepté exige une justification métier documentée |
| Plan d'amélioration | Bonnes pratiques à mettre en œuvre, par priorité |
| Jalon (milestone) | Instantané de l'état de la charge de travail pour mesurer les progrès |

L'**intégration Trusted Advisor** (Business et Enterprise Support) s'active par charge de travail : l'outil lit les vérifications des comptes et Régions de la charge de travail, ou de ses ressources AppRegistry, et les affiche à côté des bonnes pratiques correspondantes du lens Framework ; les autres comptes de la charge de travail ont besoin d'un rôle IAM pour cela. Une intégration **Jira** synchronise les éléments d'amélioration.

| Exigence | Réponse |
| --- | --- |
| Revoir la conception d'une charge de travail selon les bonnes pratiques de sécurité AWS, avec risques et plan | Well-Architected Tool, lens Framework |
| Même revue selon les normes de sécurité internes de l'entreprise | Lens personnalisé partagé via Organizations |
| Vérification technique continue des ressources déployées | Security Hub CSPM AWS Foundational Security Best Practices |
| Règles Config associées au pilier Sécurité | Pack de conformité Operational Best Practices for AWS Well-Architected Framework Security Pillar |
| Vérifications rapides du compte (instantanés publics, MFA racine, ports ouverts) | Vérifications de sécurité de Trusted Advisor |

> **Conseil d'examen.** Le Well-Architected Tool est un questionnaire, pas un scanner. « Évaluer en continu » des ressources renvoie à Security Hub CSPM ou à Config ; décisions de conception, suivi des risques et progrès dans le temps renvoient à l'outil avec ses jalons.

<!-- section: key-points -->
## Points clés

- Les règles Config détectent ce que l'enregistreur enregistre ; le mode proactif ne bloque rien.
- Règles et packs de conformité d'organisation : régionaux et verrouillés pour les comptes membres.
- Correction : runbook Automation, 1 à 25 tentatives (5 par défaut) ; aucune sur les règles liées à un service ni via un agrégateur.
- Alertez avec EventBridge filtré sur `NON_COMPLIANT`, pas avec la rubrique SNS du canal de livraison.
- Security Hub CSPM exécute ses normes sur les données Config ; les politiques déclaratives remplacent la configuration centrale.
- Artifact prouve les contrôles d'AWS ; Audit Manager est fermé aux nouveaux comptes depuis le 30 avril 2026.
- Well-Architected Tool : lenses, profils, modèles, risques, jalons ; Trusted Advisor sur le seul lens Framework.
