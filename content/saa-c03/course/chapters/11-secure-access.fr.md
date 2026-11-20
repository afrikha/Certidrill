Les questions sur l'accès sécurisé décrivent qui doit atteindre quelles ressources, dans combien de comptes et avec quelles identités : des employés d'un annuaire d'entreprise, une application sur EC2, le compte AWS d'un partenaire. La réponse combine des rôles IAM, des politiques, AWS IAM Identity Center et les garde-fous d'AWS Organizations. Ce chapitre couvre l'infrastructure mondiale, le modèle de responsabilité partagée, la protection de l'utilisateur racine et des utilisateurs IAM, les types de politiques, les rôles et l'accès intercompte, la stratégie multicompte, les politiques basées sur les ressources et la fédération d'annuaires.

<!-- section: global-infrastructure | objectives: 1.1.3 -->
## L'infrastructure mondiale AWS

| Composant | Ce que c'est | Usage en conception |
| --- | --- | --- |
| Région | Une zone géographique distincte avec ses propres points de terminaison, isolée des autres Régions | Résidence des données, latence vers les utilisateurs, reprise après sinistre dans une deuxième Région |
| Zone de disponibilité | Un ou plusieurs centres de données avec alimentation, refroidissement et réseau indépendants, reliés aux autres zones de la Région ; la plupart des Régions en ont trois ou plus | Haute disponibilité : répartir sous-réseaux, instances et bases de données sur deux zones ou plus |
| Local Zone | Une extension d'une Région près d'une grande ville | Latence de quelques millisecondes pour cette agglomération |
| Wavelength Zone | Du calcul et du stockage AWS dans le réseau 5G d'un opérateur | Latence ultra-faible pour les appareils mobiles |
| Emplacement périphérique | Points de présence de CloudFront, Route 53 et Global Accelerator | Cache et points d'entrée proches des utilisateurs |

- Les données restent dans leur Région tant que vous ne les copiez ou ne les répliquez pas. « Les données ne doivent pas quitter le pays » revient à choisir la Région, puis à refuser les autres avec une SCP.
- Les Régions lancées après le 20 mars 2019 sont **à activer (opt-in)** : désactivées tant qu'un administrateur ne les a pas activées.
- Les noms de zones (`us-east-1a`) correspondent à des zones physiques différentes selon le compte ; les **ID de zone** (`use1-az1`) sont les mêmes partout. Utilisez les ID de zone pour aligner des ressources entre comptes.
- IAM, Organizations et IAM Identity Center sont mondiaux : une politique s'applique dans toutes les Régions, sauf si une condition comme `aws:RequestedRegion` la restreint.

<!-- section: shared-responsibility | objectives: 1.1.5 -->
## Le modèle de responsabilité partagée

AWS est responsable de la sécurité **du** cloud : installations, matériel, réseau, virtualisation et logiciel des services gérés. Le client est responsable de la sécurité **dans** le cloud : données, identités et autorisations, configuration réseau, choix de chiffrement, et tout ce qu'AWS ne gère pas pour le service choisi.

| Tâche | Amazon EC2 | Amazon RDS | AWS Lambda, Amazon S3, DynamoDB |
| --- | --- | --- | --- |
| Sécurité physique, hôtes, hyperviseur | AWS | AWS | AWS |
| Correctifs du système d'exploitation invité | Client | AWS | AWS |
| Correctifs du moteur de base de données | Client, s'il est installé sur l'instance | AWS, dans la fenêtre de maintenance que vous choisissez | Sans objet |
| Groupes de sécurité, listes ACL réseau | Client | Client | Client, pour les fonctions connectées à un VPC |
| Autorisations IAM, classification des données, paramètres de chiffrement | Client | Client | Client |

> **Piège d'examen.** Passer d'EC2 à un service géré transfère à AWS les correctifs du système d'exploitation et du moteur, jamais les données, les autorisations IAM ni les décisions de chiffrement. S3 et DynamoDB chiffrent automatiquement les données au repos, mais choisir une clé gérée par le client et contrôler qui peut l'utiliser reste le travail du client.

<!-- section: root-and-users | objectives: 1.1.4, 1.1.6 -->
## Protéger l'utilisateur racine et les utilisateurs IAM

L'**utilisateur racine** a un accès sans restriction à son compte et ne peut pas être limité par des politiques IAM :

- Ne l'utilisez pas au quotidien : créez un utilisateur administratif dans IAM Identity Center.
- Ne créez pas de clés d'accès racine ; supprimez celles qui existent.
- La MFA est imposée aux utilisateurs racine ; préférez une clé d'accès (passkey) ou une clé de sécurité résistante à l'hameçonnage. L'utilisateur racine et chaque utilisateur IAM peuvent enregistrer jusqu'à huit dispositifs MFA.
- Déclenchez une alerte à chaque connexion racine (règle EventBridge sur l'événement de connexion CloudTrail).
- Réservez-le aux tâches qui l'exigent : activer MFA Delete sur un compartiment S3, modifier une politique de compartiment ou de file d'attente qui refuse tous les principaux, changer l'e-mail racine d'un compte autonome.

Dans une organisation, la **gestion centralisée de l'accès racine** permet au compte de gestion (ou à un administrateur délégué pour IAM) de supprimer les informations d'identification racine des comptes membres et d'exécuter pour eux les tâches racine privilégiées. Les comptes créés par Organizations n'ont alors aucune information d'identification racine.

Les **utilisateurs IAM** ont des informations d'identification à long terme (mot de passe, clés d'accès). Évitez-les : les personnes se connectent par IAM Identity Center ou un fournisseur d'identité fédéré et reçoivent des informations d'identification temporaires ; les charges de travail utilisent des rôles. Quand un utilisateur IAM est inévitable (un outil qui n'accepte que des clés d'accès), imposez la MFA, définissez une politique de mots de passe, faites tourner les clés et n'accordez que les actions nécessaires.

| Besoin de moindre privilège | Outil |
| --- | --- |
| Générer une politique à partir des actions qu'un rôle a réellement appelées | Génération de politique d'IAM Access Analyzer (à partir de CloudTrail) |
| Trouver les rôles, clés d'accès et autorisations inutilisés | Analyseur d'accès inutilisés d'IAM Access Analyzer, informations de dernier accès |
| Trouver les ressources partagées hors du compte ou de l'organisation | Analyseur d'accès externe d'IAM Access Analyzer |
| Vérifier une politique avant de la déployer | Validation de politique d'IAM Access Analyzer |

<!-- section: authorization-model | objectives: 1.1.7, 1.1.4 -->
## Un modèle d'autorisation flexible

| Élément | À retenir pour l'examen |
| --- | --- |
| Utilisateur IAM | Informations d'identification à long terme ; à éviter pour les personnes et les charges de travail |
| Groupe IAM | Partage des politiques entre utilisateurs ; n'est pas un principal (ne peut ni être nommé dans une politique de ressource ni endosser un rôle) ; pas d'imbrication |
| Rôle IAM | Des autorisations sans informations d'identification à long terme, endossées par des principaux approuvés : services, applications, utilisateurs fédérés, autres comptes |
| Politique basée sur l'identité | Gérée par AWS, gérée par le client (réutilisable, versionnée) ou en ligne (liée à une seule identité) |
| Politique basée sur les ressources | Attachée à une ressource, nomme un `Principal` ; peut accorder l'accès à d'autres comptes |
| Limite des autorisations | Fixe les autorisations maximales d'un utilisateur ou d'un rôle ; permet aux développeurs de créer des rôles sous un plafond ; n'accorde rien |
| SCP, RCP | Plafonds d'organisation sur les principaux ou les ressources des comptes membres ; n'accordent rien |
| Politique de session | Transmise en endossant un rôle ; restreint cette session |

Évaluation dans un compte : un **refus explicite** dans n'importe quelle politique l'emporte ; sinon une **autorisation** venant d'une politique basée sur l'identité ou sur les ressources suffit, à condition que chaque plafond applicable (SCP, RCP, limite des autorisations, politique de session) l'autorise aussi ; sinon la demande est **refusée implicitement**.

Les conditions permettent à une seule politique de servir plusieurs équipes. Cette politique de contrôle d'accès basé sur les attributs (ABAC) permet à un utilisateur de gérer uniquement les instances étiquetées avec sa propre équipe, sans modification quand une équipe est ajoutée :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ec2:StartInstances", "ec2:StopInstances", "ec2:RebootInstances"],
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": { "aws:ResourceTag/team": "${aws:PrincipalTag/team}" }
      }
    }
  ]
}
```

> **Conseil d'examen.** « Donner accès à de nombreux utilisateurs avec le moins d'effort d'administration » désigne des groupes (IAM) ou des ensembles d'autorisations attribués à des groupes (IAM Identity Center), jamais des politiques attachées utilisateur par utilisateur.

<!-- section: roles-sts | objectives: 1.1.8 -->
## Rôles, AWS STS et accès intercompte

Un rôle a une **politique d'approbation** (qui peut l'endosser) et une **politique d'autorisation** (ce que la session peut faire). L'endosser appelle AWS Security Token Service (AWS STS) : `AssumeRole` pour un utilisateur ou un rôle IAM, `AssumeRoleWithSAML` pour un utilisateur fédéré par SAML 2.0, `AssumeRoleWithWebIdentity` pour un utilisateur OpenID Connect. La durée maximale de session d'un rôle va de 1 à 12 heures ; une demande peut réclamer de 15 minutes jusqu'à ce maximum (1 heure par défaut). Le **chaînage de rôles**, endosser un rôle avec les informations d'identification d'un autre rôle, est limité à 1 heure.

**Accès intercompte** : le compte propriétaire des ressources crée un rôle dont la politique d'approbation nomme l'autre compte ou l'un de ses rôles ; cet autre compte accorde `sts:AssumeRole` sur l'ARN du rôle à ses utilisateurs ou rôles. Dans la console, c'est le **changement de rôle** : l'utilisateur n'a alors que les autorisations du rôle.

Pour un **tiers** (éditeur SaaS, auditeur), exigez un **ID externe** dans la politique d'approbation. Il évite le problème de l'adjoint confus (confused deputy), où un autre client de l'éditeur lui fait utiliser votre rôle :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
      "Action": "sts:AssumeRole",
      "Condition": { "StringEquals": { "sts:ExternalId": "anycompany-7f3a91" } }
    }
  ]
}
```

| Exigence | Réponse |
| --- | --- |
| Une application sur EC2 appelle S3 sans clés stockées | Rôle IAM par un profil d'instance |
| Des conteneurs ou des fonctions ont besoin d'autorisations AWS | Rôle de tâche ECS, rôle d'exécution Lambda |
| Des développeurs du compte A administrent les ressources du compte B | Rôle dans B qui approuve A, plus `sts:AssumeRole` accordé dans A |
| Le compte d'un éditeur a besoin d'un accès en lecture | Rôle qui approuve le compte de l'éditeur, avec un ID externe |
| Un service AWS agit en votre nom | Rôle de service, ou rôle lié à un service géré par ce service |

> **Piège d'examen.** Une politique basée sur les ressources (politique de compartiment, politique de file d'attente) permet à un principal d'un autre compte d'atteindre la ressource en conservant ses propres autorisations ; endosser un rôle les remplace. Copier en un seul appel des objets d'un compartiment du compte B vers un compartiment du compte A exige donc une politique de compartiment dans B, pas un rôle dans B.

<!-- section: multi-account | objectives: 1.1.1, 1.1.9 -->
## Stratégie de sécurité multicompte

Le compte est la frontière d'isolement la plus forte : charges de travail, environnements et équipes ont leurs propres comptes, regroupés en **unités d'organisation (OU)**. Le **compte de gestion** paie et gouverne et ne doit exécuter aucune charge de travail.

Les **politiques de contrôle des services (SCP)** plafonnent les autorisations de chaque utilisateur et rôle IAM, utilisateur racine compris, dans les comptes membres situés sous le point où elles sont attachées :

- Elles n'accordent rien : une politique IAM ou de ressource doit toujours autoriser l'action.
- Elles n'affectent ni le compte de gestion ni les rôles liés à un service.
- La politique par défaut `FullAWSAccess` est attachée partout ; la retirer sans la remplacer bloque toutes les actions.
- Une instruction Allow accepte des conditions mais seulement `"Resource": "*"` ; les instructions Deny peuvent nommer des ARN. Une liste de refus (garder `FullAWSAccess`, ajouter des refus) est plus simple à maintenir.

Cette SCP maintient les comptes membres dans deux Régions tout en autorisant les services mondiaux :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "sts:*", "support:*", "cloudfront:*", "route53:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] }
      }
    }
  ]
}
```

Les **politiques de contrôle des ressources (RCP)** plafonnent ce que tout principal, dans l'organisation ou hors d'elle, peut faire sur les ressources des services pris en charge (S3, KMS, SQS, Secrets Manager, AWS STS et d'autres) dans les comptes membres, par exemple refuser l'accès aux compartiments aux identités extérieures à l'organisation. Elles n'accordent rien et ignorent le compte de gestion.

**AWS Control Tower** construit une **zone d'atterrissage (landing zone)** gouvernée sur Organizations et IAM Identity Center : une OU Security avec des comptes d'archive des journaux et d'audit, **Account Factory** pour provisionner des comptes conformes à partir d'un modèle, et des contrôles obligatoires, fortement recommandés ou facultatifs :

| Comportement du contrôle | Mis en œuvre avec | Effet |
| --- | --- | --- |
| Préventif | SCP, RCP, politiques déclaratives | Interdit l'action |
| De détection | Règles AWS Config | Signale les ressources non conformes |
| Proactif | Hooks AWS CloudFormation | Bloque les ressources non conformes avant leur provisionnement |

| Exigence | Réponse |
| --- | --- |
| Aucun compte d'une OU ne doit arrêter CloudTrail ni quitter l'organisation | SCP qui refuse ces actions, attachée à l'OU |
| Nouvel environnement multicompte avec garde-fous de bonnes pratiques, le moins d'effort | AWS Control Tower |
| Un compte de sécurité exploite GuardDuty pour tous les comptes | Administrateur délégué pour GuardDuty |
| Bloquer les compartiments de l'entreprise aux identités extérieures à l'organisation | RCP, ou politiques de compartiment avec `aws:PrincipalOrgID` |

<!-- section: resource-policies | objectives: 1.1.10 -->
## Les politiques basées sur les ressources

Amazon S3 (politiques de compartiment), AWS KMS (politiques de clé, obligatoires sur chaque clé), Amazon SQS, Amazon SNS, AWS Lambda, AWS Secrets Manager, Amazon ECR, les API REST d'API Gateway et les coffres AWS Backup acceptent une politique sur la ressource elle-même ; les politiques d'approbation des rôles sont aussi basées sur les ressources.

| Situation | Politique |
| --- | --- |
| Un autre compte lit des objets sans changer de rôle | Politique de compartiment qui nomme ce compte ou ce rôle |
| Un service livre vers votre ressource (SNS vers SQS, S3 vers Lambda, CloudFront vers S3) | Politique de ressource avec le principal du service et `aws:SourceArn` ou `aws:SourceAccount` |
| Uniquement les identités de votre organisation | Condition `aws:PrincipalOrgID` |
| Uniquement par un point de terminaison de VPC donné | Condition `aws:SourceVpce` |
| Une clé utilisée depuis un autre compte | Politique de clé KMS, plus une politique IAM dans ce compte |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOrganizationReadOnly",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::example-corp-reports/*",
      "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
    }
  ]
}
```

Une demande intercompte exige deux autorisations : la politique basée sur l'identité dans le compte de l'appelant et la politique basée sur les ressources dans le compte de la ressource. Un refus explicite de l'une ou l'autre l'emporte.

> **Piège d'examen.** `"Principal": "*"` sans condition restrictive rend une politique de compartiment publique, et S3 Block Public Access, actif par défaut, la rejette. Une valeur fixe de `aws:PrincipalOrgID` ou de `aws:SourceVpce` la garde non publique.

<!-- section: federation | objectives: 1.1.2, 1.1.11 -->
## Fédération et services d'annuaire

La fédération d'identité permet aux utilisateurs de garder une seule identité dans un annuaire existant et de recevoir des informations d'identification AWS temporaires au lieu d'utilisateurs IAM.

**IAM Identity Center** est l'accès recommandé du personnel à de nombreux comptes et applications. Son **instance d'organisation**, dans le compte de gestion, est la seule qui gère l'accès aux comptes AWS. Les administrateurs attribuent des **ensembles d'autorisations** (les politiques d'une fonction) à des utilisateurs ou des groupes pour les comptes choisis ; Identity Center crée les rôles correspondants, et les utilisateurs se connectent une seule fois au **portail d'accès AWS**. Source d'identité : l'annuaire Identity Center, Active Directory (par AWS Managed Microsoft AD ou AD Connector), ou un fournisseur d'identité SAML 2.0 externe (Okta, Microsoft Entra ID) avec provisionnement SCIM.

La **fédération SAML 2.0 d'IAM** (`AssumeRoleWithSAML`) fonctionne toujours mais doit être configurée dans chaque compte ; Identity Center la centralise.

| Option d'AWS Directory Service | Ce que c'est | À choisir quand |
| --- | --- | --- |
| AWS Managed Microsoft AD | Un véritable Microsoft AD exploité par AWS | Charges de travail compatibles AD dans AWS (Windows, RDS for SQL Server, FSx for Windows File Server), approbation avec la forêt locale, extensions de schéma |
| AD Connector | Passerelle qui redirige les demandes vers les contrôleurs de domaine locaux sans mettre aucune information en cache dans le cloud | Les utilisateurs se connectent aux applications AWS compatibles avec leurs informations d'identification locales existantes |
| Simple AD | Annuaire compatible AD basé sur Samba 4 | Petit annuaire à faible coût ; ni approbation ni MFA |

| Exigence | Réponse |
| --- | --- |
| Les employés atteignent chaque compte avec leurs identifiants d'entreprise, gérés de façon centralisée | IAM Identity Center avec l'IdP ou l'AD de l'entreprise comme source d'identité |
| Les utilisateurs restent dans l'AD local, sans copie de l'annuaire dans AWS | AD Connector |
| Des charges de travail Windows ont besoin d'un domaine qui approuve la forêt de l'entreprise | AWS Managed Microsoft AD avec une approbation |
| Les clients d'une application web ou mobile s'inscrivent et se connectent | Groupes d'utilisateurs Amazon Cognito, pas IAM |
| Un système CI/CD hors d'AWS déploie sans clés à long terme | Fournisseur d'identité OIDC dans IAM, rôle endossé par identité web |

Fédérez un annuaire avec des rôles IAM quand les utilisateurs y existent déjà et doivent garder sa politique de mots de passe, sa MFA et son cycle de vie : désactiver un partant dans l'annuaire supprime alors son accès AWS partout.

<!-- section: key-points -->
## Points clés

- Les Régions isolent les données et les pannes ; les zones de disponibilité apportent la haute disponibilité ; les ID de zone alignent les zones entre comptes.
- AWS sécurise le cloud, vous sécurisez ce que vous y mettez ; vos données et IAM restent toujours à votre charge.
- Pas de clés racine, MFA, accès racine centralisé ; les personnes utilisent IAM Identity Center, les charges de travail des rôles.
- Le refus explicite l'emporte ; une autorisation est nécessaire ; SCP, RCP et limites des autorisations ne font que plafonner.
- Intercompte : politique d'approbation plus `sts:AssumeRole`, ID externe pour les tiers ; les politiques de ressources conservent les autorisations de l'appelant.
- Control Tower = zone d'atterrissage, Account Factory, contrôles préventifs, de détection et proactifs.
- AD Connector relaie vers l'AD local ; Managed Microsoft AD est un vrai AD ; Cognito sert les clients des applications.
