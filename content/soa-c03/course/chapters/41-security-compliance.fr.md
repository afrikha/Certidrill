Les questions de sécurité pour les opérateurs demandent rarement de concevoir un modèle de politiques ; elles décrivent un symptôme (une erreur d'accès refusé, un instantané public, une vérification Trusted Advisor en rouge, une ressource non conforme) ou un contrôle à mettre en place (MFA, restriction des Régions, connexion centralisée), et demandent la correction la moins coûteuse en efforts. Ce chapitre couvre les informations d'identification IAM et la MFA, les rôles, la fédération et les conditions de politique, les outils de dépannage des accès, les contrôles multicomptes, les vérifications de sécurité de Trusted Advisor et la conformité continue avec AWS Config.

<!-- section: iam-credentials | objectives: 4.1.1 -->
## Utilisateur racine, politique de mot de passe et MFA

L'**utilisateur racine** (root user) a un accès illimité à son compte. AWS impose la MFA à l'utilisateur racine de tous les types de comptes ; supprimez aussi toute clé d'accès racine (Trusted Advisor les signale) et réservez l'utilisateur racine aux rares tâches qui l'exigent.

La **politique de mot de passe du compte** s'applique uniquement aux mots de passe de console des utilisateurs IAM, jamais à l'utilisateur racine ni aux clés d'accès :

| Paramètre | Plage |
| --- | --- |
| Longueur minimale | 6 à 128 caractères |
| Types de caractères | Majuscule, minuscule, chiffre, caractère non alphanumérique, chacun facultatif |
| Expiration | 1 à 1 095 jours |
| Empêcher la réutilisation | 1 à 24 mots de passe précédents |
| Expiration stricte (hard expiry) | Après expiration, seul un administrateur peut réinitialiser le mot de passe |
| Autoriser les utilisateurs à changer leur mot de passe | Activé ou désactivé |

Sans politique personnalisée, la politique par défaut exige 8 à 128 caractères avec trois des quatre types de caractères, et les mots de passe n'expirent jamais. Un utilisateur dont le mot de passe a expiré ne peut plus se connecter à la console mais peut toujours utiliser ses clés d'accès.

**Options de MFA** : clés d'accès (passkeys) et clés de sécurité FIDO (résistantes à l'hameçonnage, recommandées), applications d'authentification virtuelles (TOTP) et jetons TOTP matériels. Un utilisateur ou l'utilisateur racine peut enregistrer jusqu'à huit dispositifs MFA. Les clés de sécurité et les passkeys s'activent uniquement dans la console ; pour les sessions de CLI, un dispositif TOTP fonctionne avec `aws sts get-session-token --serial-number ... --token-code ...`, et les passkeys avec `aws login`.

Exigez la MFA pour les actions sensibles avec une condition :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyStopTerminateWithoutMFA",
      "Effect": "Deny",
      "Action": ["ec2:StopInstances", "ec2:TerminateInstances"],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" }
      }
    }
  ]
}
```

> **Piège d'examen.** Les requêtes signées avec des clés d'accès à long terme ne portent pas du tout `aws:MultiFactorAuthPresent`. Avec `Bool`, le refus ne s'applique pas à elles ; `BoolIfExists` refuse quand la clé est absente ou vaut false.

<!-- section: roles-policies | objectives: 4.1.1 -->
## Rôles, fédération, politiques de ressources et conditions

Les rôles fournissent des informations d'identification temporaires et remplacent les clés d'accès stockées :

| Besoin | Mécanisme |
| --- | --- |
| Une application sur EC2 appelle des API AWS | Rôle dans un profil d'instance ; les informations d'identification viennent des métadonnées de l'instance |
| Les opérateurs du compte A travaillent dans le compte B | Rôle dans B dont la politique d'approbation (trust policy) nomme le compte A ; les utilisateurs de A ont besoin de `sts:AssumeRole` sur l'ARN du rôle |
| Un fournisseur tiers accède à votre compte | Rôle intercomptes avec une condition `sts:ExternalId` dans la politique d'approbation |
| Un service AWS agit en votre nom | Rôle de service, ou rôle lié à un service créé et géré par le service |
| Connexion du personnel avec les identités de l'entreprise | IAM Identity Center (recommandé), ou un fournisseur d'identité IAM SAML 2.0 ou OIDC pour une fédération directe |
| Laisser une équipe créer des rôles sans accorder plus que ses propres droits | Limite d'autorisations (permissions boundary) imposée par `iam:PermissionsBoundary` dans la politique de l'équipe |

Les **politiques basées sur les ressources** s'attachent à la ressource (politique de compartiment S3, politique de clé KMS, SQS, SNS, Lambda, Secrets Manager) et nomment un `Principal`. Dans un même compte, une autorisation dans la politique d'identité ou dans la politique de ressource suffit ; entre comptes, la politique d'identité de l'appelant et la politique de ressource doivent toutes deux autoriser l'action. Une clé KMS exige toujours que sa politique de clé autorise l'accès.

Clés de condition globales qui apparaissent dans les questions d'exploitation :

| Exigence | Clé de condition |
| --- | --- |
| Uniquement depuis la plage d'adresses IP publiques de l'entreprise | `aws:SourceIp` |
| Uniquement par un point de terminaison de VPC ou un VPC donné | `aws:SourceVpce`, `aws:SourceVpc` |
| Uniquement les principaux de notre organisation | `aws:PrincipalOrgID` |
| Uniquement dans les Régions approuvées | `aws:RequestedRegion` |
| Uniquement via TLS | `aws:SecureTransport` |
| Uniquement après MFA | `aws:MultiFactorAuthPresent` |
| Accès quand la balise project du principal égale celle de la ressource (ABAC) | `aws:PrincipalTag/project` avec `aws:ResourceTag/project` |

> **Piège d'examen.** Une requête qui atteint S3 par un point de terminaison de VPC porte une adresse source privée : une politique de compartiment fondée sur `aws:SourceIp` avec des plages publiques la refuse. Utilisez `aws:SourceVpce` ou `aws:SourceVpc` pour le trafic issu du VPC.

<!-- section: access-troubleshooting | objectives: 4.1.2 -->
## Dépanner et auditer les accès

Une requête n'est autorisée que si rien ne la refuse explicitement et si chaque couche applicable l'autorise : SCP et RCP de l'organisation, politique de ressource, limite d'autorisations, politique de session et politique d'identité. De nombreux messages d'accès refusé nomment désormais le type de politique responsable (« with an explicit deny in a service control policy », « because no identity-based policy allows »), ce qui désigne la couche à corriger.

| Question | Outil |
| --- | --- |
| Qui a modifié ou supprimé une ressource au cours des 90 derniers jours | Historique des événements (Event history) de CloudTrail (événements de gestion, par Région) |
| Conserver et interroger l'activité d'API pendant des mois, sur plusieurs comptes | Journal de suivi d'organisation vers S3, interrogé avec Athena, ou envoyé vers CloudWatch Logs avec des filtres de métriques sur `errorCode` |
| Lectures et écritures d'objets S3, appels de fonctions Lambda | Événements de données CloudTrail, que les journaux de suivi n'enregistrent pas par défaut |
| Décoder un « encoded authorization failure message » d'EC2 | `aws sts decode-authorization-message`, avec `sts:DecodeAuthorizationMessage` |
| Cette politique autoriserait-elle `s3:PutObject` avant de l'attacher | Simulateur de politiques IAM |
| Quels compartiments, clés ou rôles sont partagés hors de l'organisation | Analyseur d'accès externe d'IAM Access Analyzer avec l'organisation comme zone de confiance |
| Quels rôles, clés et autorisations sont inutilisés | Analyseur d'accès inutilisés d'IAM Access Analyzer, informations de dernier accès |
| Politique de moindre privilège tirée de l'activité réelle | Génération de politique d'IAM Access Analyzer à partir de CloudTrail |
| Bloquer un déploiement si une politique accorde un nouvel accès | Validation de politique et vérifications de politique personnalisées d'IAM Access Analyzer |

```bash
aws sts decode-authorization-message \
  --encoded-message "$ENCODED_MESSAGE" \
  --query DecodedMessage --output text
```

Le **simulateur de politiques** évalue les politiques d'identité, une limite d'autorisations à la fois, les SCP et les politiques de ressource que vous fournissez ; il n'évalue pas les RCP, n'envoie aucune requête réelle et a besoin de valeurs pour les clés de condition testées par vos politiques. Les **analyseurs d'accès externe** sont régionaux (créez-en un par Région) ; les résultats d'accès inutilisés ne dépendent pas de la Région.

> **Piège d'examen.** CloudTrail Lake est fermé aux nouveaux clients depuis le 31 mai 2026 ; AWS recommande CloudWatch pour ses fonctionnalités. Les journaux de suivi, CloudTrail Insights et l'historique des événements ne sont pas concernés.

<!-- section: multi-account | objectives: 4.1.3 -->
## Sécuriser plusieurs comptes

**AWS Organizations** regroupe les comptes sous un compte de gestion, dans des unités d'organisation (OU). Avec toutes les fonctionnalités activées, deux types de politiques d'autorisation posent des garde-fous :

| | Politique de contrôle des services (SCP) | Politique de contrôle des ressources (RCP) |
| --- | --- | --- |
| Limite | Ce que les principaux des comptes membres peuvent faire | Ce qui peut être fait sur les ressources des comptes membres, y compris par des principaux extérieurs à l'organisation |
| Accorde des autorisations | Jamais | Jamais |
| Compte de gestion | Non concerné | Non concerné |
| Rôles liés à un service | Non concernés | Non concernés |
| Utilisateur racine d'un compte membre | Concerné | Concerné |

Les SCP s'héritent dans la hiérarchie : un compte n'a que ce que chaque parent autorise. La SCP par défaut `FullAWSAccess` doit rester attachée sauf si elle est remplacée par une liste d'autorisation, sinon toutes les actions échouent. Testez les SCP sur une OU de test avant de les attacher à la racine.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProtectSecurityServices",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "guardduty:DeleteDetector",
        "config:StopConfigurationRecorder",
        "organizations:LeaveOrganization"
      ],
      "Resource": "*",
      "Condition": {
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityBreakGlass" }
      }
    }
  ]
}
```

**IAM Identity Center** est le point d'entrée du personnel : utilisateurs et groupes viennent de son propre annuaire, d'Active Directory ou d'un fournisseur d'identité externe (SAML 2.0, avec provisionnement SCIM). Un **jeu d'autorisations** (permission set) attribué à un groupe dans un compte devient dans ce compte un rôle IAM nommé `AWSReservedSSO_...` ; les utilisateurs obtiennent des informations d'identification temporaires dans le portail d'accès ou avec `aws sso login`.

Autres contrôles multicomptes : **AWS Control Tower** met en place une zone d'atterrissage (landing zone, avec les comptes Log Archive et Audit) et applique des contrôles préventifs (SCP et RCP), de détection (règles AWS Config) et proactifs (hooks CloudFormation) ; des comptes **administrateurs délégués** exploitent GuardDuty, Security Hub, Config ou Access Analyzer pour l'organisation ; l'**accès racine centralisé** permet au compte de gestion de supprimer les informations d'identification racine des comptes membres et d'exécuter de façon centralisée les tâches racine privilégiées.

> **Piège d'examen.** Une SCP attachée à la racine n'arrête pas les utilisateurs du compte de gestion, et une SCP qui autorise une action ne permet pas à un utilisateur sans politique IAM de l'effectuer. Exécutez les charges de travail dans des comptes membres et accordez les autorisations avec IAM.

<!-- section: trusted-advisor | objectives: 4.1.4 -->
## Corriger les résultats des vérifications de sécurité de Trusted Advisor

Avec **Basic Support** (et Developer Support, qu'AWS arrête le 1er janvier 2027), Trusted Advisor affiche toutes les vérifications Service limits et six autres, dont cinq de sécurité : Amazon EBS Public Snapshots, Amazon RDS Public Snapshots, Amazon S3 Bucket Permissions, MFA on root account, Security Groups – Specific Ports Unrestricted. Sur ce plan, les vérifications de sécurité s'actualisent manuellement. **Business Support+, Enterprise Support et Unified Operations** débloquent toutes les vérifications, l'API, la CLI et les événements EventBridge. États : ERROR (action recommandée), WARN (à examiner), OK, INFO (état non déterminé). Les résultats des contrôles de Security Hub CSPM apparaissent aussi dans la console Trusted Advisor.

| Vérification | Correction |
| --- | --- |
| Amazon S3 Bucket Permissions | Activer S3 Block Public Access au niveau du compte ; supprimer les ACL et les instructions de politique publiques |
| Security Groups – Specific Ports Unrestricted, Unrestricted Access | Remplacer `0.0.0.0/0` par des CIDR connus ou des références de groupe de sécurité ; utiliser Session Manager au lieu de SSH ou RDP ; runbook `AWS-DisablePublicAccessForSecurityGroup` |
| MFA on root account, Root User Access Key | Enregistrer la MFA, supprimer les clés d'accès racine ; pour les comptes membres, accès racine centralisé |
| Amazon EBS Public Snapshots, Amazon RDS Public Snapshots | Retirer l'autorisation publique, partager uniquement avec des comptes nommés |
| Exposed Access Keys | Désactiver puis supprimer la clé, examiner son utilisation dans CloudTrail, passer la charge de travail sur un rôle |
| IAM Access Key Rotation | Créer une seconde clé, mettre à jour l'application, désactiver puis supprimer l'ancienne clé |
| IAM Password Policy | Définir une politique conforme à la norme |
| AWS CloudTrail Management Event Logging | Créer un journal de suivi multirégion ou d'organisation |
| ELB Listener Security | Écouteur HTTPS ou TLS avec une politique de sécurité actuelle |
| Amazon RDS storage encryption is turned off | Copier un instantané avec chiffrement et restaurer à partir de cette copie |

```bash
aws ec2 modify-snapshot-attribute \
  --snapshot-id snap-0abcd1234example \
  --attribute createVolumePermission \
  --operation-type remove \
  --group-names all
```

Pour automatiser, créez une règle EventBridge dans **USA Est (Virginie du Nord)**, où tous les événements de Trusted Advisor sont émis, filtrez sur l'état qui vous intéresse et ciblez Lambda ou un runbook Automation :

```json
{
  "source": ["aws.trustedadvisor"],
  "detail-type": ["Trusted Advisor Check Item Refresh Notification"]
}
```

> **Piège d'examen.** Avec Basic Support, il n'y a ni règle EventBridge ni appel d'API pour Trusted Advisor. Pour des alertes automatisées sans plan de support supérieur, utilisez plutôt des règles AWS Config ou des contrôles Security Hub CSPM.

<!-- section: config-compliance | objectives: 4.1.5 -->
## Conformité continue avec AWS Config

AWS Config enregistre la configuration des ressources (enregistreur de configuration, canal de livraison vers S3 et SNS) et l'évalue avec des **règles** : règles gérées par AWS (`encrypted-volumes`, `restricted-ssh`, `s3-bucket-public-read-prohibited`, `required-tags`, `cloudtrail-enabled`, `root-account-mfa-enabled`, `access-keys-rotated`) ou règles personnalisées en Lambda ou en AWS CloudFormation Guard. Les règles se déclenchent sur les modifications de configuration ou périodiquement, en mode détection (ressources déployées) ou en mode proactif (avant le provisionnement).

La **correction** (remediation) exécute un runbook Systems Manager Automation sur les ressources non conformes, manuellement ou automatiquement, avec des nouvelles tentatives dans une fenêtre de temps (par exemple 5 tentatives en 300 secondes) ; le **paramètre d'ID de ressource** transmet au runbook l'ID de la ressource non conforme. Les **packs de conformité** (conformance packs) déploient règles et corrections comme un seul ensemble à partir d'un modèle YAML, dans un compte et une Région ou dans toute l'organisation ; AWS fournit des exemples de packs (bonnes pratiques opérationnelles pour CIS, PCI DSS, NIST). Un **agrégateur** donne une vue de conformité en lecture seule, multicompte et multirégion.

```yaml
Resources:
  SshRestricted:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: restricted-ssh
      Source:
        Owner: AWS
        SourceIdentifier: INCOMING_SSH_DISABLED
  SshRestrictedRemediation:
    Type: AWS::Config::RemediationConfiguration
    DependsOn: SshRestricted
    Properties:
      ConfigRuleName: restricted-ssh
      TargetType: SSM_DOCUMENT
      TargetId: AWS-DisablePublicAccessForSecurityGroup
      Automatic: true
      MaximumAutomaticAttempts: 5
      RetryAttemptSeconds: 60
      Parameters:
        GroupId:
          ResourceValue:
            Value: RESOURCE_ID
        AutomationAssumeRole:
          StaticValue:
            Values:
              - arn:aws:iam::111122223333:role/ConfigRemediationRole
```

La **sélection des Régions et des services** s'impose par la prévention, pas par la détection : une SCP qui refuse les requêtes hors des Régions approuvées (services globaux exclus avec `NotAction`), un contrôle de refus de Région de Control Tower, ou une SCP en liste d'autorisation des services approuvés.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "organizations:*",
        "sts:*",
        "support:*",
        "cloudfront:*",
        "route53:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["eu-west-1", "eu-central-1"]
        }
      }
    }
  ]
}
```

| Exigence | Réponse |
| --- | --- |
| Détecter les volumes EBS non chiffrés et garder un historique de conformité | Règle AWS Config `encrypted-volumes` |
| Corriger automatiquement les règles SSH ouvertes | Règle Config avec correction automatique par un runbook Automation |
| Même ensemble de règles PCI DSS dans chaque compte | Pack de conformité d'organisation |
| Personne ne doit créer de ressources hors de deux Régions | SCP sur `aws:RequestedRegion` |
| Noter en continu les comptes par rapport à AWS Foundational Security Best Practices | Norme de Security Hub CSPM (elle s'appuie sur l'enregistrement AWS Config) |

> **Conseil d'examen.** Les contrôles de détection (règles Config, packs de conformité) signalent et corrigent après coup ; les contrôles préventifs (SCP, RCP) bloquent l'appel. « Garantir que personne ne peut » appelle la prévention ; « détecter et corriger » appelle Config.

<!-- section: key-points -->
## Points clés

- Politique de mot de passe : mots de passe de console des utilisateurs IAM uniquement ; MFA racine imposée ; jusqu'à huit dispositifs MFA ; `BoolIfExists` pour les conditions MFA.
- Des rôles plutôt que des clés d'accès ; `sts:ExternalId` pour les tiers ; l'accès intercomptes exige politiques d'identité et de ressource.
- `aws:SourceVpce` pour le trafic des points de terminaison de VPC, `aws:PrincipalOrgID` pour l'organisation, `aws:RequestedRegion` pour les Régions.
- CloudTrail pour savoir qui a fait quoi (événements de données désactivés par défaut) ; Access Analyzer pour les accès externes et inutilisés ; simulateur pour tester les politiques ; CloudTrail Lake fermé aux nouveaux clients.
- SCP et RCP n'accordent rien et ignorent le compte de gestion et les rôles liés à un service ; les jeux d'autorisations d'Identity Center deviennent des rôles.
- Trusted Advisor : Basic a six vérifications hors limites ; ses règles EventBridge vivent dans us-east-1 et exigent Business Support+ ou mieux.
- Les règles Config détectent, les runbooks Automation corrigent, les packs de conformité regroupent les deux ; les SCP empêchent l'usage de Régions et de services.
