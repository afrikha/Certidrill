La gestion des accès décide qui peut se connecter à AWS et ce que chaque identité peut faire. L'examen vous demande de reconnaître les identités et les politiques IAM, le moindre privilège, les tâches réservées à l'utilisateur racine, IAM Identity Center, le stockage des informations d'identification et les types de gestion d'identité.

<!-- section: iam-identities | objectives: 2.3.1, 2.3.7 -->
## Les identités et les politiques IAM

**AWS Identity and Access Management (IAM)** contrôle l'authentification (qui se connecte) et l'autorisation (ce qu'il peut faire) pour les ressources AWS. IAM est mondial (il ne dépend pas d'une Région) et n'entraîne pas de frais supplémentaires.

| Élément | Ce que c'est | Usage |
| --- | --- | --- |
| **Utilisateur IAM** | Une identité avec des informations d'identification à long terme : un mot de passe de console et/ou des clés d'accès | Une personne ou une application qui ne peut pas utiliser d'informations d'identification temporaires ; à éviter si possible |
| **Groupe IAM** | Un ensemble d'utilisateurs IAM ; les autorisations attachées au groupe s'appliquent à chaque membre | Les mêmes autorisations pour une équipe ; un groupe ne peut ni se connecter ni contenir d'autres groupes |
| **Rôle IAM** | Une identité avec des autorisations mais sans informations d'identification à long terme ; celui qui l'assume obtient des **informations d'identification temporaires** | Services AWS (EC2, Lambda), utilisateurs fédérés, autres comptes |
| **Politique** (policy) | Un document JSON qui autorise ou refuse des actions sur des ressources | Attachée à des identités (basée sur l'identité) ou à une ressource comme un compartiment S3 (basée sur les ressources) |

| Type de politique | Gérée par | Réutilisation |
| --- | --- | --- |
| **Politique gérée par AWS** | AWS, qui la met à jour ; vous ne pouvez pas la modifier (par exemple, `ReadOnlyAccess`, politiques de fonction professionnelle) | Plusieurs identités ; démarrage rapide |
| **Politique gérée par le client** | Vous, dans votre compte | Plusieurs identités ; adaptée à vos besoins |
| **Politique en ligne** (inline) | Vous, intégrée à un seul utilisateur, groupe ou rôle | Cette identité uniquement ; supprimée avec elle |

Une politique qui autorise seulement la lecture des objets d'un compartiment :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-reports/*"
    }
  ]
}
```

Tout est **refusé par défaut** ; un `Allow` explicite accorde l'accès, et un `Deny` explicite dans n'importe quelle politique l'emporte toujours sur une autorisation.

<!-- section: least-privilege | objectives: 2.3.3, 2.3.7 -->
## Le principe du moindre privilège

N'accordez que les autorisations nécessaires à une tâche, sur les ressources dont elle a besoin, et rien de plus. En pratique :

1. Placez les utilisateurs dans des **groupes** par fonction plutôt que d'attacher des politiques à chaque utilisateur.
2. Partez des **politiques gérées par AWS**, puis passez à des **politiques gérées par le client** limitées à ce qui est réellement utilisé.
3. Utilisez **IAM Access Analyzer** pour générer une politique à partir de l'activité CloudTrail, et les **informations de dernier accès** pour retirer les autorisations inutilisées.
4. Passez régulièrement en revue et supprimez les utilisateurs, rôles, informations d'identification et politiques inutilisés.
5. Sur plusieurs comptes, les **SCP** d'AWS Organizations fixent des autorisations maximales ; elles n'en accordent jamais.

> **Piège d'examen.** `AdministratorAccess` pour tout le monde « pour gagner du temps » viole le moindre privilège. « Donner à chaque nouveau développeur les mêmes autorisations » se règle avec un **groupe** IAM, pas en copiant une politique en ligne sur chaque utilisateur.

<!-- section: root-user | objectives: 2.3.2, 2.3.8, 2.3.9 -->
## Protéger l'utilisateur racine

L'**utilisateur racine** est l'identité créée avec le compte AWS (son adresse e-mail). Il a un **accès complet et sans restriction** à toutes les ressources et à la facturation, et les politiques IAM ne peuvent pas le limiter : un utilisateur racine compromis signifie un compte compromis.

Parmi les tâches que **seul l'utilisateur racine** peut effectuer :

- modifier l'adresse e-mail ou le mot de passe racine d'un compte autonome, ou le fermer ;
- rétablir les autorisations IAM quand le seul administrateur IAM a révoqué les siennes ;
- activer l'accès IAM à la console Billing and Cost Management ;
- s'inscrire comme vendeur sur la place de marché des instances réservées ;
- activer MFA Delete sur un compartiment S3 ;
- modifier ou supprimer une politique de compartiment S3 ou de file d'attente SQS qui refuse tous les principaux ;
- s'inscrire à AWS GovCloud (US).

| Méthode de protection | Détail |
| --- | --- |
| **Authentification multifacteur (MFA)** | Exigée par AWS pour l'utilisateur racine de chaque compte ; les passkeys et les clés de sécurité résistent le mieux à l'hameçonnage |
| Pas de clés d'accès racine | Ne pas en créer ; supprimer celles qui existent |
| Mot de passe fort et récupération | Mot de passe fort et unique ; adresse e-mail de groupe et téléphone de récupération contrôlés par des personnes de confiance |
| Ne pas l'utiliser au quotidien | Administrer avec un utilisateur d'IAM Identity Center ; l'utilisateur racine seulement pour les tâches ci-dessus |
| Surveiller son utilisation | Alerter à chaque connexion racine (Amazon EventBridge sur l'événement CloudTrail, Amazon GuardDuty) |
| Gestion centralisée de l'accès racine | Dans AWS Organizations, supprimer les informations d'identification racine des comptes membres et effectuer les tâches racine de façon centralisée |

> **Piège d'examen.** Créer des utilisateurs IAM, attacher des politiques et lancer des instances n'exigent **pas** l'utilisateur racine. Les tâches réservées à l'utilisateur racine concernent le compte, certains paramètres de facturation et les politiques qui refusent tout le monde.

<!-- section: authentication | objectives: 2.3.6 -->
## Les méthodes d'authentification

| Méthode | Fonctionnement |
| --- | --- |
| Mot de passe + **MFA** | Un second facteur : passkey ou clé de sécurité FIDO, application d'authentification virtuelle ou jeton TOTP matériel ; jusqu'à huit dispositifs par utilisateur |
| **Clés d'accès** | ID de clé d'accès et clé d'accès secrète pour l'AWS CLI, les SDK et les API ; à long terme, un risque en cas de fuite |
| **IAM Identity Center** | Authentification unique (SSO) aux comptes et applications attribués, avec des informations d'identification temporaires |
| **Rôles IAM**, dont les **rôles IAM inter-comptes** | Assumer un rôle donne des informations d'identification temporaires ; un rôle inter-comptes du compte B fait confiance au compte A, si bien que les identités de A travaillent dans B sans utilisateurs dans B |

<!-- section: identity-center | objectives: 2.3.4 -->
## AWS IAM Identity Center

IAM Identity Center (anciennement AWS Single Sign-On) est la méthode recommandée pour donner au personnel l'accès à **plusieurs comptes AWS** et à des applications.

- **Source d'identité** (une seule à la fois) : l'annuaire Identity Center (par défaut), Active Directory (sur site ou AWS Managed Microsoft AD), ou un fournisseur d'identité externe comme Okta ou Microsoft Entra ID.
- Les **ensembles d'autorisations** (permission sets) définissent ce qu'un utilisateur ou un groupe peut faire ; ils sont attribués par compte et deviennent des rôles IAM dans ces comptes.
- Les utilisateurs se connectent au **portail d'accès AWS** et reçoivent des **informations d'identification temporaires** : aucun utilisateur IAM par compte.
- L'accès aux comptes exige une instance d'organisation, activée dans le compte de gestion AWS Organizations.

> **Conseil d'examen.** « Les employés se connectent à de nombreux comptes AWS avec leurs identifiants d'entreprise existants » désigne IAM Identity Center, pas un utilisateur IAM par employé et par compte.

<!-- section: credentials | objectives: 2.3.5 -->
## Clés d'accès, politiques de mots de passe et stockage des informations d'identification

| Sujet | À retenir |
| --- | --- |
| **Clés d'accès** | Jusqu'à deux par utilisateur IAM (pour la rotation) ; la clé secrète n'est affichée qu'à la création ; jamais dans le code ; préférer les rôles |
| **Politique de mots de passe** | Mots de passe des utilisateurs IAM : longueur minimale, types de caractères, expiration, interdiction de réutilisation ; ne s'applique ni à l'utilisateur racine ni aux clés d'accès |
| **AWS Secrets Manager** | Stocke des secrets (mots de passe de bases de données, clés d'API), les chiffre avec KMS et en effectue la **rotation** automatique ; récupérés à l'exécution |
| **AWS Systems Manager Parameter Store** | Valeurs de configuration et paramètres SecureString chiffrés avec KMS ; niveau standard gratuit ; pas de rotation |

> **Piège d'examen.** « Effectuer automatiquement la rotation des identifiants de base de données » correspond à **Secrets Manager**. « Stocker des valeurs de configuration comme un ID d'AMI, sans coût supplémentaire » correspond à **Parameter Store**.

<!-- section: identity-types | objectives: 2.3.10 -->
## Les types de gestion d'identité

| Type | Où vivent les identités | Convient quand |
| --- | --- | --- |
| **Utilisateurs IAM** dans chaque compte | IAM, avec des informations d'identification à long terme | Usage restreint sur un seul compte, ou application qui exige des clés d'accès |
| **Identité fédérée** | Un fournisseur d'identité externe (annuaire d'entreprise, Okta, Microsoft Entra ID), approuvé par SAML 2.0 ou OpenID Connect | Les employés gardent une seule identité d'entreprise et obtiennent des informations d'identification temporaires |
| **Amazon Cognito** | Groupes d'utilisateurs (user pools) pour l'inscription et la connexion des utilisateurs finaux d'une application, y compris par des fournisseurs d'identité sociaux | Clients d'une application web ou mobile |
| **Rôles IAM** pour les charges de travail | Aucun utilisateur : les services AWS assument un rôle | Instances EC2, fonctions Lambda et autres services qui appellent les API AWS |

La fédération est la pratique recommandée pour les personnes : aucune information d'identification à long terme à distribuer.

<!-- section: key-points -->
## Points clés

- Utilisateurs (informations d'identification à long terme), groupes, rôles (informations d'identification temporaires), politiques (gérées par AWS, gérées par le client, en ligne).
- Moindre privilège : groupes, politiques gérées par le client, IAM Access Analyzer ; refus par défaut, le refus explicite l'emporte.
- Utilisateur racine : MFA exigée, pas de clés d'accès, pas d'usage quotidien.
- IAM Identity Center : authentification unique à de nombreux comptes avec des ensembles d'autorisations et des informations d'identification temporaires.
- Secrets Manager effectue la rotation des secrets ; Parameter Store stocke la configuration.
- Fédération (SAML 2.0, OIDC) pour les employés, Cognito pour les utilisateurs d'applications, rôles pour les charges de travail.
