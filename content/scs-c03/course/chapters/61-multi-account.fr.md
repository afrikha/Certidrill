Le compte est la frontière d'isolement la plus forte sur AWS, et une organisation transforme des centaines de comptes en un ensemble qu'une seule équipe de sécurité peut gouverner. Les questions décrivent une entreprise qui passe à de nombreux comptes, ou en hérite lors d'une acquisition, et demandent comment structurer l'organisation, déployer Control Tower sans casser les charges de travail, poser des garde-fous que les comptes membres ne peuvent pas retirer, exploiter les services de sécurité depuis un compte dédié et verrouiller l'utilisateur racine.

<!-- section: organizations-setup | objectives: 6.1.1 -->
## Déployer et configurer AWS Organizations

Une organisation comporte un **compte de gestion** (il paie, crée les comptes, attache les politiques) et des **comptes membres** regroupés en unités d'organisation (UO) sous une racine, jusqu'à cinq niveaux d'UO. Les fonctionnalités de sécurité (SCP, RCP, politiques déclaratives, administrateurs délégués) exigent **toutes les fonctionnalités** (all features) ; une organisation créée uniquement pour la facturation consolidée doit être convertie avec `enable-all-features`, ce que chaque compte invité doit approuver.

Règles qui façonnent toute conception :

| Fait | Conséquence pour la sécurité |
| --- | --- |
| Les SCP et les RCP ne s'appliquent jamais au compte de gestion | N'y exécuter aucune charge de travail ; n'y donner accès qu'à très peu de personnes ; protéger son utilisateur racine en premier |
| Les comptes créés par Organizations reçoivent le rôle `OrganizationAccountAccessRole`, approuvé par le compte de gestion | Les comptes invités ne l'ont pas : créer un rôle équivalent, ou les inscrire dans Control Tower |
| L'accès approuvé (trusted access) permet à un service d'agir dans toute l'organisation ; l'administration déléguée permet à un compte membre de le gérer | Activer l'accès approuvé service par service, puis enregistrer le compte d'outillage de sécurité comme administrateur délégué |
| Un compte peut quitter l'organisation sauf si on l'en empêche | Refuser `organizations:LeaveOrganization` avec une SCP |
| Les politiques s'attachent à la racine, aux UO ou aux comptes et sont héritées vers le bas | Construire les UO selon les contrôles dont elles ont besoin, pas selon l'organigramme |

Une structure d'UO orientée sécurité :

| UO | Comptes | Contrôles typiques |
| --- | --- | --- |
| Security | Archive des journaux (log archive), outillage de sécurité (administrateur délégué de GuardDuty, Security Hub, Inspector, Macie, Config) | Refus des modifications des compartiments de journaux et des journaux de suivi, sauf par les rôles d'automatisation |
| Infrastructure | Hub réseau, services partagés | Seule l'équipe réseau peut modifier routes, pare-feu et DNS |
| Workloads (Prod, NonProd) | Un compte par application et par environnement | Restriction de Régions, contrôles de chiffrement et d'accès public ; plus stricts en Prod |
| Sandbox | Comptes d'expérimentation | Aucune connectivité vers la production, limites de dépenses |
| Suspended | Comptes en attente de fermeture | Tout refuser |
| Exceptions ou préproduction des politiques | Comptes qui testent de nouvelles politiques ou ont besoin d'une exception documentée | Politiques testées ici avant un attachement plus large |

```bash
aws organizations enable-all-features
aws organizations enable-aws-service-access --service-principal guardduty.amazonaws.com
aws organizations create-organizational-unit --parent-id r-a1b2 --name Security
aws organizations create-account --email aws-log-archive@example.com --account-name log-archive
```

> **Piège d'examen.** Une entreprise qui « fait tourner la production dans le compte de gestion depuis des années » ne règle pas le problème en attachant une SCP à la racine : les SCP ignorent le compte de gestion. La réponse consiste à déplacer les charges de travail vers des comptes membres et à restreindre l'accès au compte de gestion.

<!-- section: control-tower | objectives: 6.1.2 -->
## Mettre en œuvre AWS Control Tower dans des environnements nouveaux et existants

AWS Control Tower orchestre Organizations, IAM Identity Center, Service Catalog, CloudTrail et Config en une **zone d'atterrissage** (landing zone), et ajoute un catalogue de contrôles, un tableau de bord de conformité et Account Factory.

**La zone d'atterrissage 4.0** (novembre 2025) l'a rendue modulaire : vous choisissez les intégrations à activer (AWS Config, AWS CloudTrail, Security Roles, AWS Backup), avec des compartiments S3 et des rubriques SNS distincts par service ; une UO Security n'est plus obligatoire, mais tous les comptes hub doivent se trouver dans la même UO ; et le manifeste est facultatif. Désactiver l'intégration Config impose aussi de désactiver les intégrations Security Roles, IAM Identity Center et Backup. Une expérience **limitée aux contrôles** (controls-only) crée une zone d'atterrissage minimale avec une intégration Organizations de base et permet d'activer des contrôles sans la référence `AWSControlTowerBaseline` sur les UO.

| Situation | Approche |
| --- | --- |
| Nouvelle organisation | Configurer la zone d'atterrissage dans un nouveau compte de gestion ; Control Tower crée les comptes partagés et la référence de base |
| Organisation existante, comptes déjà utilisés | Configurer la zone d'atterrissage dans le compte de gestion existant, puis enregistrer les UO une par une (la référence de base est appliquée à l'UO) |
| Comptes existants à placer sous gouvernance | Les inscrire dans une UO enregistrée ; chacun a besoin du rôle `AWSControlTowerExecution` approuvé par le compte de gestion ; résoudre d'abord les conflits avec des enregistreurs Config ou des journaux de suivi existants |
| Besoin des seuls garde-fous, pas de la référence complète | Expérience limitée aux contrôles, avec activation directe des contrôles sur les UO |
| Comptes créés avec des personnalisations standard | Account Factory (console ou Service Catalog), plans (blueprints) Account Factory Customization, ou Account Factory for Terraform (AFT) pour un pipeline GitOps ; AFT peut exécuter des personnalisations en mode plan uniquement pour prévisualiser les changements |

**Les contrôles** sont classés par comportement et par recommandation (obligatoire, fortement recommandé, facultatif), et se recherchent dans le **Control Catalog** (nouveau nom de la Controls Library depuis juin 2025).

| Comportement | Mis en œuvre avec | Résultat |
| --- | --- | --- |
| Préventif | SCP, RCP ou politiques déclaratives | L'action est refusée dans tous les comptes de l'UO |
| De détection | Règles AWS Config (règles Config liées au service déployées par Control Tower) | Les ressources non conformes sont signalées sur le tableau de bord |
| Proactif | Hooks CloudFormation | Les ressources non conformes sont rejetées avant que CloudFormation ne les provisionne |

**Contrôles optionnels et personnalisés.** Les contrôles optionnels (fortement recommandés et facultatifs) s'activent par UO depuis le catalogue, dans la console ou avec l'API `EnableControl`. Les exigences que le catalogue ne couvre pas s'ajoutent avec Customizations for AWS Control Tower (CfCT : un manifeste de SCP et de modèles CloudFormation déployés par un pipeline lors d'événements de compte), avec les personnalisations AFT, avec vos propres SCP ou RCP attachées aux UO, ou avec des règles Config et des packs de conformité déployés par StackSets ou par des règles d'organisation. Ne modifiez jamais les SCP que gère Control Tower : modifier des ressources gérées, ou déplacer un compte entre UO hors de Control Tower, crée une **dérive** (drift), que l'on répare en réenregistrant l'UO ou en mettant à jour la zone d'atterrissage.

> **Piège d'examen.** Les contrôles de détection signalent ; ils n'arrêtent rien. Quand l'énoncé exige que l'action « ne doit pas être possible » (par exemple désactiver CloudTrail ou créer des volumes non chiffrés via CloudFormation), choisissez un contrôle préventif ou proactif, pas une règle Config.

<!-- section: organization-policies | objectives: 6.1.3 -->
## Politiques d'organisation pour gérer les autorisations

| | SCP | RCP | Politique déclarative EC2 | Politique de désactivation des services d'IA |
| --- | --- | --- | --- | --- |
| Contrôle | Permissions maximales des utilisateurs et rôles IAM des comptes membres, utilisateur racine compris | Permissions maximales sur les ressources des comptes membres, quel que soit l'appelant, principaux extérieurs et racine compris | Configuration souhaitée de fonctionnalités EC2, VPC et EBS, appliquée par le plan de contrôle du service | Si les services d'IA AWS peuvent stocker et utiliser votre contenu pour améliorer le service |
| Accorde quelque chose | Non | Non | Non (fixe une configuration) | Non |
| Non concerné | Compte de gestion, rôles liés à un service | Compte de gestion, rôles liés à un service, clés KMS gérées par AWS, services hors de la liste prise en charge | S'applique aussi aux rôles liés à un service | S'applique dans toutes les Régions, y compris celles désactivées |
| Quotas | 10 par racine, UO ou compte, 10 240 caractères | 5 par cible, 5 120 caractères | Politique effective par héritage | Politique effective par héritage |

**Évaluation des SCP.** Une action n'est autorisée que si chaque SCP du chemin entre la racine et le compte l'autorise et qu'aucune SCP ne la refuse, et il faut encore qu'une politique d'identité ou de ressource l'accorde. Avec la politique par défaut `FullAWSAccess` conservée à chaque niveau, écrivez des SCP en **liste de refus** (refus explicites avec des exceptions sur `aws:PrincipalArn`). Une stratégie en **liste d'autorisation** remplace `FullAWSAccess` par des autorisations explicites, qui doivent exister à chaque niveau.

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
        "guardduty:DisassociateFromAdministratorAccount",
        "config:StopConfigurationRecorder",
        "config:DeleteConfigurationRecorder",
        "securityhub:DisableSecurityHub",
        "organizations:LeaveOrganization"
      ],
      "Resource": "*",
      "Condition": {
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityAutomation" }
      }
    }
  ]
}
```

**Les RCP** protègent le côté ressource : elles empêchent un principal extérieur de lire un compartiment, une file d'attente, un secret ou une clé, même quand la politique de ressource d'un compte membre accorde l'accès. Les RCP typiques exigent `aws:PrincipalOrgID` (avec une exception pour les principaux de service AWS) ou `aws:SecureTransport`. Utilisez les SCP pour « nos utilisateurs ne doivent pas », les RCP pour « nos ressources ne doivent jamais être atteintes par ».

**Les politiques déclaratives EC2** fixent sept attributs : VPC Block Public Access, VPC Encryption Controls (off, monitor, enforce), accès à la console série, blocage de l'accès public aux AMI, Allowed AMIs, valeurs par défaut des métadonnées d'instance (par exemple IMDSv2 obligatoire) et blocage de l'accès public aux instantanés EBS. La configuration persiste quand le service ajoute de nouvelles API et s'applique aux nouveaux comptes dès leur arrivée ; un message d'erreur personnalisé (sans données personnelles) peut diriger les utilisateurs vers une page interne, et le rapport d'état des comptes montre combien de comptes correspondent déjà avant d'attacher la politique. Détacher la politique ramène l'attribut à son état précédent.

**Les politiques de désactivation des services d'IA (AI services opt-out policies)** empêchent les services d'IA AWS pris en charge de stocker et d'utiliser votre contenu pour améliorer le service ; quand vous vous désinscrivez, les services suppriment le contenu historique conservé à cette fin. Verrouillez le choix pour que les UO enfants ne puissent pas le modifier :

```json
{
  "services": {
    "default": {
      "opt_out_policy": {
        "@@assign": "optOut",
        "@@operators_allowed_for_child_policies": ["@@none"]
      }
    }
  }
}
```

D'autres types de politiques configurent les services plutôt que les autorisations (sauvegarde, balises, applications de chat, Security Hub, Amazon Inspector, Amazon GuardDuty, application des Guardrails d'Amazon Bedrock, Amazon S3, déploiement progressif des mises à niveau) et, contrairement aux SCP et aux RCP, s'appliquent généralement aussi au compte de gestion.

> **Piège d'examen.** Une SCP qui refuse `s3:GetObject` à tous ceux qui sont hors de l'organisation ne fonctionne pas : les SCP ne contraignent que vos propres principaux. Bloquer l'accès externe aux ressources des comptes membres relève d'une RCP (ou d'une politique de ressource sur chaque ressource).

<!-- section: delegated-admin | objectives: 6.1.4 -->
## Gérer les services de sécurité de manière centralisée

Le compte de gestion ne devrait presque rien faire au quotidien. Pour chaque service de sécurité, activez l'accès approuvé et enregistrez un **administrateur délégué**, généralement un compte d'outillage de sécurité dans l'UO Security, et utilisez le même compte pour tous les services, pour une gouvernance cohérente.

| Service | Ce que fait l'administrateur délégué | Points testés |
| --- | --- | --- |
| Amazon GuardDuty | Active les détecteurs et les plans de protection dans les comptes membres, voit tous les résultats | Régional : le désigner dans chaque Région, et ce doit être le même compte partout ; activation automatique `NEW` ou `ALL` ; jusqu'à 50 000 membres ; retirer l'administrateur laisse GuardDuty activé dans les membres |
| AWS Security Hub CSPM et AWS Security Hub | Configuration centrale des normes et des contrôles, résultats agrégés et analyse d'exposition | Le compte de gestion peut être administrateur de CSPM mais pas de Security Hub ; un administrateur délégué CSPM devient automatiquement celui de Security Hub ; le retirer de l'un le retire des deux |
| Amazon Inspector, Amazon Macie, Amazon Detective | Activent l'analyse ou l'investigation pour tous les comptes, activation automatique des nouveaux | Par Région ; les résultats restent visibles par l'administrateur |
| AWS Config | Règles d'organisation, packs de conformité et agrégateurs | L'enregistrement doit rester actif dans chaque compte et chaque Région |
| AWS Firewall Manager | Applique des politiques WAF, Shield Advanced, groupes de sécurité, Network Firewall et DNS Firewall | Un administrateur par défaut plus des administrateurs supplémentaires à portée restreinte (chapitre 62) |
| IAM Access Analyzer, Amazon Security Lake, CloudTrail, IAM Identity Center, CloudFormation StackSets, AWS Backup, IAM (accès racine) | Analyseurs d'organisation, lac de données, journaux de suivi d'organisation, jeux d'autorisations, StackSets, surveillance des sauvegardes, tâches sur les informations d'identification racine | StackSets accepte jusqu'à cinq administrateurs délégués |

```bash
aws guardduty enable-organization-admin-account --admin-account-id 222233334444 --region eu-west-1
aws guardduty update-organization-configuration --detector-id 6ac5b1f0e3d74a1f9d1c2b3a4e5f6071 --auto-enable-organization-members ALL --region eu-west-1
```

Deux fermetures comptent ici : AWS Audit Manager n'accepte plus de nouveaux comptes depuis le 30 avril 2026 (utilisez les packs de conformité Config et Security Hub CSPM pour les preuves), et CloudTrail Lake est fermé aux nouveaux clients depuis le 31 mai 2026 (utilisez des journaux de suivi d'organisation vers le compte d'archive des journaux, interrogés avec Athena ou envoyés vers CloudWatch).

> **Piège d'examen.** Désigner l'administrateur délégué GuardDuty dans la seule Région principale laisse toutes les autres Régions non gérées. « Tous les comptes dans toutes les Régions avec le moins d'effort » signifie le même compte administrateur désigné dans chaque Région, avec l'activation automatique `ALL`.

<!-- section: root-user | objectives: 6.1.5 -->
## Gérer les informations d'identification de l'utilisateur racine

**L'accès racine centralisé** retire les informations d'identification racine à long terme des comptes membres. Activez l'accès approuvé pour IAM dans Organizations, puis deux fonctionnalités : **la gestion des informations d'identification racine** (supprimer ou auditer le mot de passe racine, les clés d'accès, les certificats de signature et la MFA des comptes membres) et **les actions racine privilégiées dans les comptes membres** (de courtes sessions racine pour les rares tâches qui en ont besoin). Enregistrez éventuellement un administrateur délégué pour IAM, comme le compte de sécurité. Les nouveaux comptes créés dans l'organisation n'ont alors plus aucune information d'identification racine, et leur utilisateur racine ne peut ni se connecter ni récupérer son mot de passe.

```bash
aws iam enable-organizations-root-credentials-management
aws iam enable-organizations-root-sessions
aws sts assume-root --target-principal 444455556666 --task-policy-arn arn=arn:aws:iam::aws:policy/root-task/S3UnlockBucketPolicy --duration-seconds 900 --region eu-west-1
```

`sts:AssumeRoot` est appelé par un principal IAM (jamais avec des informations d'identification racine) du compte de gestion ou du compte administrateur délégué, sur un point de terminaison STS régional, pour 900 secondes au plus, et toujours limité par une politique de tâche ; restreignez les tâches qu'une équipe peut exécuter avec la clé de condition `sts:TaskPolicyArn`.

| Politique de tâche | Usage |
| --- | --- |
| `IAMAuditRootUserCredentials` | Vérifier si un compte membre a encore un mot de passe racine, des clés d'accès, des certificats de signature ou une MFA |
| `IAMCreateRootUserPassword` | Autoriser la récupération du mot de passe, uniquement quand le compte n'a pas d'informations d'identification racine |
| `IAMDeleteRootUserCredentials` | Supprimer le mot de passe racine, les clés d'accès et les certificats de signature, et désactiver la MFA |
| `S3UnlockBucketPolicy` | Retirer une politique de compartiment qui refuse tous les principaux |
| `SQSUnlockQueuePolicy` | Retirer une politique de file d'attente qui refuse tous les principaux |

**MFA.** Chaque type de compte (gestion, membre, autonome) doit avoir une MFA sur son utilisateur racine ; les utilisateurs de la console doivent l'enregistrer dans les 14 jours suivant leur première tentative de connexion. AWS recommande les clés d'accès (passkeys) ou les clés de sécurité FIDO, qui résistent à l'hameçonnage ; jusqu'à huit appareils MFA peuvent être enregistrés par utilisateur, ce qui aide des dépositaires situés en des lieux différents.

**Conception de l'accès d'urgence (break-glass)** pour les informations d'identification qui subsistent (la racine du compte de gestion, et l'accès de secours quand IAM Identity Center ou le fournisseur d'identité est indisponible) :

1. Utiliser une liste de diffusion surveillée et un numéro de téléphone de l'entreprise comme coordonnées racine, pas la boîte d'une personne.
2. Enregistrer au moins deux clés de sécurité matérielles détenues par des dépositaires différents ; garder le mot de passe scellé sous double contrôle.
3. Ne créer des principaux IAM d'urgence que là où Identity Center ne peut pas être utilisé, avec la MFA et une exception de SCP étroite.
4. Alerter à chaque usage avec une règle EventBridge sur la connexion racine dans chaque compte.
5. Tester la procédure régulièrement et changer le mot de passe après chaque usage.

```json
{
  "source": ["aws.signin"],
  "detail-type": ["AWS Console Sign In via CloudTrail"],
  "detail": { "userIdentity": { "type": ["Root"] } }
}
```

> **Piège d'examen.** Une politique de compartiment mal configurée qui refuse tout le monde, administrateurs compris, imposait autrefois de se connecter en tant qu'utilisateur racine du compte membre. Avec l'accès racine centralisé, la réponse au moindre privilège est une session `sts:AssumeRoot` avec la politique de tâche `S3UnlockBucketPolicy`, pas la récupération du mot de passe racine.

<!-- section: key-points -->
## Points clés

- Toutes les fonctionnalités (all features) sont requises pour les SCP, les RCP, les politiques déclaratives et les administrateurs délégués ; les SCP et les RCP ne s'appliquent jamais au compte de gestion.
- Les UO reflètent les contrôles : Security, Infrastructure, Workloads, Sandbox, Suspended, plus une UO de préproduction pour tester les politiques.
- Zone d'atterrissage Control Tower 4.0 : intégrations facultatives, plus d'UO Security obligatoire, expérience limitée aux contrôles ; enregistrer les UO et inscrire les comptes (`AWSControlTowerExecution`) dans les environnements existants ; ne pas modifier les SCP gérées.
- Contrôles : préventifs (SCP, RCP, déclaratifs), de détection (Config), proactifs (hooks CloudFormation), consultables dans le Control Catalog.
- Les SCP limitent vos principaux ; les RCP limitent l'accès de quiconque à vos ressources ; aucune n'accorde ; les politiques déclaratives EC2 imposent une configuration, y compris aux rôles liés à un service.
- Les politiques de désactivation des services d'IA verrouillent le choix avec `@@operators_allowed_for_child_policies`.
- Un seul compte d'outillage de sécurité comme administrateur délégué ; GuardDuty est par Région, avec le même compte partout.
- Accès racine centralisé : supprimer les informations d'identification racine des membres, `sts:AssumeRoot` pour 900 secondes avec l'une des cinq politiques de tâche ; MFA racine obligatoire pour tous les types de comptes.
