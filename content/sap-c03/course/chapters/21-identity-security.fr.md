Au niveau professionnel, les questions d'identité font intervenir de nombreux comptes, plusieurs types de principaux et au moins une partie externe : des employés qui se connectent depuis le fournisseur d'identité de l'entreprise, des clients d'une application web, des pods, des pipelines CI/CD, des partenaires et des serveurs hors d'AWS. La réponse sécurisée donne toujours à chaque principal des **informations d'identification temporaires** limitées à son besoin, conserve une source unique d'identités et ajoute des garde-fous grossiers (périmètres de données) au-dessus des politiques fines.

<!-- section: workforce-federation | objectives: 2.1.1 -->
## Fédération des identités du personnel avec des protocoles standard

**AWS IAM Identity Center** est le point d'entrée recommandé pour les employés de toute une organisation :

- L'**instance d'organisation**, activée depuis le compte de gestion AWS Organizations, est la seule qui gère l'accès aux comptes AWS ; une instance de compte ne sert que certaines applications gérées par AWS dans un compte. L'administration peut être déléguée à un compte membre (les attributions propres au compte de gestion restent gérées depuis celui-ci).
- **Source d'identités** : l'annuaire Identity Center, Active Directory (AWS Managed Microsoft AD ou un annuaire autogéré par AD Connector) ou un fournisseur d'identité externe. Avec un IdP externe, **SAML 2.0** gère la connexion et **SCIM 2.0** provisionne automatiquement utilisateurs et groupes (jeton porteur valable un an, à renouveler avant expiration). Le `NameID` SAML doit correspondre au nom d'utilisateur SCIM.
- Les **jeux d'autorisations** (permission sets) définissent les autorisations par fonction (politiques gérées par AWS, gérées par le client, en ligne et une limite d'autorisations) et une durée de session jusqu'à 12 heures ; attribuer un jeu d'autorisations à un groupe dans un compte crée le rôle IAM correspondant dans ce compte.
- Les **attributs pour le contrôle d'accès** transmettent des attributs de l'IdP (service, centre de coûts) comme balises de session pour l'ABAC.
- La **propagation d'identité approuvée** (trusted identity propagation) transmet l'identité de l'utilisateur à des services comme Redshift ou S3 Access Grants : les journaux d'audit montrent la personne, pas un rôle partagé. La réplication de l'instance vers d'autres Régions garde le portail d'accès disponible dans chaque Région activée.

Autres modèles de fédération :

| Principal | Mécanisme |
| --- | --- |
| Employés, fédération IAM SAML existante par compte | Fournisseur d'identité SAML IAM et `AssumeRoleWithSAML` (toujours pris en charge ; plus difficile à faire évoluer qu'Identity Center) |
| Système CI/CD qui émet des jetons OIDC (par exemple GitHub Actions) | Fournisseur d'identité OIDC IAM et `AssumeRoleWithWebIdentity`, politique d'approbation restreinte sur les revendications `sub` et `aud` du jeton |
| SaaS tiers qui agit dans vos comptes | Rôle entre comptes avec un ID externe |

> **Piège d'examen.** SCIM n'authentifie personne : il synchronise seulement utilisateurs et groupes. La connexion passe toujours par SAML 2.0. Avec SCIM activé, les utilisateurs ne se modifient plus dans la console Identity Center ; les changements viennent de l'IdP.

<!-- section: app-authn-authz | objectives: 2.1.2 -->
## Authentification et autorisation des applications

| Composant | Fournit | Usage |
| --- | --- | --- |
| Groupe d'utilisateurs Amazon Cognito (user pool) | Un annuaire d'utilisateurs et un serveur d'autorisation OAuth 2.0 et OIDC qui émet des JWT (jetons d'identité, d'accès, d'actualisation) | Inscription, connexion, MFA, fédération sociale, SAML ou OIDC pour les applications destinées aux clients |
| Groupe d'identités Amazon Cognito (identity pool) | Des informations d'identification AWS temporaires en échange d'un jeton (groupe d'utilisateurs, social, SAML, OIDC) ou pour des invités | Clients mobiles ou navigateurs qui appellent directement des services AWS (téléversements S3, DynamoDB) |
| Amazon Verified Permissions | Décisions d'autorisation fines avec des politiques Cedar, hors du code de l'application | Autorisations par ressource (« seul le propriétaire ou le responsable peut approuver ») |
| Mécanismes d'autorisation (authorizers) d'API Gateway | Groupe d'utilisateurs Cognito ou mécanisme JWT, mécanisme Lambda, IAM (SigV4) | Valider les appelants avant l'exécution du backend |
| Authentification ALB | Actions d'écouteur `authenticate-cognito` ou `authenticate-oidc` | Ajouter une connexion devant des applications web sans code |

Octrois (grants) OAuth 2.0 dans Cognito : **code d'autorisation avec PKCE** pour les applications web et mobiles (le choix par défaut), **informations d'identification du client** (client credentials) pour les appels de machine à machine avec des portées personnalisées définies sur un serveur de ressources, octroi implicite seulement pour des cas hérités. Plans de fonctionnalités : **Lite** (connexion de base, interface hébergée classique), **Essentials** (par défaut : connexion gérée, sans mot de passe et clés d'accès (passkeys), personnalisation du jeton d'accès), **Plus** (protection contre les informations d'identification compromises et les connexions malveillantes, journaux d'activité des utilisateurs).

Les groupes d'identités associent les utilisateurs à des rôles IAM par des règles sur les revendications ou par le rôle indiqué dans le jeton, et peuvent transmettre des revendications comme balises de principal pour l'ABAC (par exemple chaque utilisateur n'écrit que sous un préfixe S3 balisé avec son identifiant).

**Charges de travail Kubernetes sur EKS** :

| | EKS Pod Identity | Rôles IAM pour les comptes de service (IRSA) |
| --- | --- | --- |
| Mise en place | Module complémentaire Pod Identity Agent plus une association (cluster, espace de noms, compte de service, rôle) | Un fournisseur OIDC IAM par cluster, approbation du rôle par fournisseur |
| Principal de la politique d'approbation | `pods.eks.amazonaws.com` pour tous les clusters | Le fournisseur OIDC du cluster |
| Réutiliser un rôle dans plusieurs clusters | Même politique d'approbation, nouvelle association | Politique d'approbation modifiée pour chaque cluster |
| Entre comptes | Association avec un rôle cible : l'agent enchaîne du rôle Pod Identity vers le rôle de l'autre compte | Approuver le fournisseur OIDC du cluster dans l'autre compte |
| ABAC | Balises de session comme `eks-cluster-arn`, `kubernetes-namespace`, `kubernetes-service-account` | Pas automatique |
| Calcul pris en charge | Pas sur les pods Fargate ni sur les nœuds EC2 Windows | Fonctionne sur Fargate |

> **Piège d'examen.** Les groupes d'utilisateurs authentifient les utilisateurs et émettent des JWT ; ils ne donnent pas d'informations d'identification AWS. Quand le client doit appeler directement S3 ou DynamoDB, ajoutez un groupe d'identités. Quand une API doit seulement valider l'utilisateur, un mécanisme d'autorisation par groupe d'utilisateurs suffit.

<!-- section: least-privilege | objectives: 2.1.3 -->
## Accès selon le moindre privilège et informations d'identification temporaires

Évaluation des politiques pour une requête : un refus explicite l'emporte partout ; sinon, la requête doit être autorisée par chaque garde-fou applicable (SCP du compte du principal, RCP du compte de la ressource, limite d'autorisations, politique de session) et par une politique basée sur l'identité ou sur la ressource.

| Outil | Limite | Usage type |
| --- | --- | --- |
| Politique basée sur l'identité | Accorde à un utilisateur, un groupe ou un rôle | Autorisations normales |
| Politique basée sur la ressource | Accorde sur la ressource, peut nommer d'autres comptes | Accès entre comptes à S3, KMS, SQS, Lambda sans changer de rôle |
| Limite d'autorisations (permissions boundary) | Maximum des politiques basées sur l'identité d'un utilisateur ou d'un rôle | Laisser des développeurs créer des rôles qui ne dépassent jamais une limite |
| Politique de session | Maximum d'une session, transmise dans `AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity` (une politique en ligne plus jusqu'à 10 politiques gérées) | Un intermédiaire restreint un rôle partagé par requête ou par locataire |
| SCP / RCP | Maximum pour les principaux / ressources des comptes membres | Garde-fous de l'organisation (pas sur le compte de gestion) |

Accès entre comptes : avec l'**endossement de rôle**, l'appelant abandonne ses propres autorisations pour celles du rôle (il faut la politique d'approbation et l'autorisation `sts:AssumeRole` de l'appelant). Avec une **politique basée sur la ressource**, l'appelant garde ses autorisations et a aussi besoin d'une autorisation dans sa politique d'identité. Les sessions de rôle durent 1 heure par défaut et au plus la durée de session maximale du rôle (12 heures au plus) ; le **chaînage de rôles** limite une session à 1 heure.

L'**ID externe** empêche le problème de l'adjoint confus (confused deputy) quand un tiers endosse des rôles pour de nombreux clients : le tiers génère une valeur unique par client, le client l'exige avec `sts:ExternalId` dans la politique d'approbation. Ce n'est pas un secret, seulement un discriminant.

L'**ABAC** fait évoluer les autorisations avec des balises au lieu de politiques par projet : autoriser des actions quand `aws:ResourceTag/project` est égal à `aws:PrincipalTag/project`, contrôler le balisage avec `aws:RequestTag` et `aws:TagKeys`, et recevoir les balises de principal depuis les attributs Identity Center ou les balises de session SAML ou OIDC. `sts:SourceIdentity` garde l'utilisateur d'origine visible à travers les chaînes de rôles.

Création de rôles déléguée avec une limite obligatoire :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CreateRolesOnlyWithBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:AttachRolePolicy", "iam:PutRolePolicy"],
      "Resource": "arn:aws:iam::111122223333:role/app/*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::111122223333:policy/AppBoundary"
        }
      }
    },
    {
      "Sid": "ProtectBoundary",
      "Effect": "Deny",
      "Action": ["iam:DeleteRolePermissionsBoundary", "iam:CreatePolicyVersion", "iam:DeletePolicy"],
      "Resource": [
        "arn:aws:iam::111122223333:role/app/*",
        "arn:aws:iam::111122223333:policy/AppBoundary"
      ]
    }
  ]
}
```

> **Piège d'examen.** Une limite d'autorisations n'accorde jamais rien et ne limite pas une politique basée sur la ressource qui nomme l'utilisateur ou la session de rôle. Pour plafonner ce que peut faire tout un compte, utilisez une SCP ; pour plafonner une identité déléguée, une limite d'autorisations.

<!-- section: data-perimeter | objectives: 2.1.4 -->
## Périmètres de données et validation des accès externes

Un périmètre de données garantit que **seules des identités de confiance accèdent à des ressources de confiance depuis des réseaux attendus**, sous forme de garde-fous grossiers toujours actifs :

| Périmètre | Objectif | Contrôle et clé |
| --- | --- | --- |
| Identité | Seules mes identités atteignent mes ressources | RCP ou politique de ressource avec `aws:PrincipalOrgID` (et `aws:PrincipalIsAWSService` avec `aws:SourceOrgID` pour les principaux de service) |
| Identité | Seules mes identités utilisent mon réseau | Politique de point de terminaison de VPC avec `aws:PrincipalOrgID` |
| Ressource | Mes identités n'atteignent que mes ressources | SCP avec `aws:ResourceOrgID` |
| Ressource | Mon réseau n'atteint que mes ressources | Politique de point de terminaison de VPC avec `aws:ResourceOrgID` |
| Réseau | Mes identités n'agissent que depuis mes réseaux | SCP avec `aws:SourceIp`, `aws:SourceVpc`, `aws:SourceVpce`, en excluant les appels `aws:ViaAWSService` |
| Réseau | Mes ressources ne sont atteintes que depuis mes réseaux | RCP ou politique de ressource avec les mêmes clés |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceOrgIdentities",
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:*", "sqs:*", "kms:*", "secretsmanager:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEqualsIfExists": { "aws:PrincipalOrgID": "o-exampleorg" },
        "BoolIfExists": { "aws:PrincipalIsAWSService": "false" }
      }
    }
  ]
}
```

Cette RCP bloque, pour les services listés dans les comptes membres, tout principal extérieur à l'organisation, tout en laissant agir les services AWS. Les exceptions pour des partenaires de confiance s'ajoutent comme conditions supplémentaires. Les RCP ne s'appliquent ni au compte de gestion, ni aux rôles liés à un service, ni aux clés KMS gérées par AWS, et ne couvrent que les services qui les prennent en charge ; protégez les autres ressources par leurs propres politiques de ressource.

**IAM Access Analyzer** valide le périmètre :

- Les **analyseurs d'accès externe**, avec une zone de confiance (compte ou organisation), signalent les ressources partagées hors de celle-ci (compartiments S3, rôles IAM, clés KMS, Lambda, SQS, SNS, Secrets Manager, instantanés, ECR, EFS, DynamoDB).
- Les **analyseurs d'accès interne** montrent quels principaux de l'organisation peuvent atteindre des ressources critiques ; les **analyseurs d'accès inutilisé** listent les rôles, clés, mots de passe, services et actions inutilisés (les deux sont facturés).
- La **validation des politiques**, les **vérifications de politiques personnalisées** (pas de nouvel accès par rapport à une référence, actions précises non accordées) dans les pipelines CI/CD, et la **génération de politiques** à partir de l'activité CloudTrail.

**AWS Verified Access** remplace l'accès VPN aux applications internes par une évaluation Zero Trust à chaque requête : un fournisseur de confiance d'identité (instance d'organisation IAM Identity Center ou fournisseur OIDC) et des fournisseurs de confiance d'appareils (par exemple CrowdStrike, Jamf, JumpCloud) alimentent des politiques Cedar sur des groupes et des points de terminaison (équilibreur de charge, interface réseau, CIDR réseau, RDS). Les applications non HTTP (SSH, RDP, bases de données en TCP) passent par le Connectivity Client. Chaque tentative d'accès est journalisée ; les requêtes sont refusées tant qu'aucune politique ne les autorise.

> **Conseil d'examen.** « Empêcher tout principal extérieur à l'organisation d'accéder aux compartiments S3 de tous les comptes membres, y compris ceux dont la politique est mal configurée » correspond à une RCP, pas à une SCP : les SCP ne restreignent que les principaux de l'organisation.

<!-- section: workload-identity | objectives: 2.1.5 -->
## Identités de charge de travail pour les environnements hybrides et multicloud

L'objectif est de supprimer les clés d'accès à long terme des serveurs, conteneurs et pipelines hors d'AWS :

| Charge de travail | Mécanisme d'identité |
| --- | --- |
| Serveurs ou VM sur site avec des certificats X.509 d'une PKI d'entreprise | **IAM Roles Anywhere** |
| Charges de travail dans un autre cloud avec un jeton d'identité OIDC (identité managée, compte de service) | Fournisseur d'identité OIDC IAM et `AssumeRoleWithWebIdentity` |
| Serveurs sur site gérés par Systems Manager | Activation hybride : SSM Agent reçoit des informations d'identification renouvelées pour le rôle de l'instance |
| Nœuds Kubernetes sur site joints à EKS | EKS Hybrid Nodes avec les activations hybrides de Systems Manager ou IAM Roles Anywhere |
| Instances externes ECS Anywhere | Informations d'identification de SSM Agent, rôles IAM de tâche |

Composants d'IAM Roles Anywhere :

- **Ancre d'approbation** (trust anchor) : AWS Private CA ou un ensemble de certificats d'autorité de certification externe qui émet les certificats des charges de travail. Importez des CRL pour révoquer des certificats.
- **Profil** : les rôles qui peuvent être endossés et une politique de session facultative.
- **Politique d'approbation du rôle** : approuve `rolesanywhere.amazonaws.com`, limitée par `aws:SourceArn` à l'ancre d'approbation ; les attributs du certificat deviennent des balises de principal (par exemple `aws:PrincipalTag/x509Subject/CN`) pour restreindre quels certificats correspondent à quel rôle.
- L'**assistant d'informations d'identification** (credential helper) signe avec la clé privée et renvoie des informations d'identification temporaires par le paramètre `credential_process` des SDK : les applications n'ont pas besoin de changer de code.

```text
[profile onprem-batch]
credential_process = aws_signing_helper credential-process --certificate /etc/pki/batch.pem --private-key /etc/pki/batch.key --trust-anchor-arn arn:aws:rolesanywhere:eu-west-1:111122223333:trust-anchor/example --profile-arn arn:aws:rolesanywhere:eu-west-1:111122223333:profile/example --role-arn arn:aws:iam::111122223333:role/onprem-batch
```

Les ressources Roles Anywhere sont régionales et la limite de confiance est le compte : toute ancre d'approbation du compte peut servir pour tout rôle qui approuve le service, sauf si la politique d'approbation ajoute des conditions. Conservez si possible les clés privées dans un TPM ou un HSM.

> **Piège d'examen.** Stocker les clés d'accès d'un utilisateur IAM dans Secrets Manager pour des serveurs sur site reste une utilisation d'informations d'identification à long terme. Quand les serveurs ont déjà des certificats d'une autorité de certification d'entreprise, la réponse avec des informations d'identification temporaires et sans rotation de clés est IAM Roles Anywhere.

<!-- section: key-points -->
## Points clés

- Personnel : instance d'organisation Identity Center, SAML 2.0 pour la connexion, SCIM pour le provisionnement, jeux d'autorisations par compte, attributs pour l'ABAC ; fédération OIDC pour le CI/CD.
- Applications : les groupes d'utilisateurs émettent des JWT, les groupes d'identités des informations d'identification AWS, Verified Permissions décide avec Cedar ; code d'autorisation avec PKCE pour les utilisateurs, informations d'identification du client pour les machines.
- EKS Pod Identity : pas de fournisseur OIDC, un seul principal de service, rôles cibles pour l'accès entre comptes, balises de session pour l'ABAC ; pas sur Fargate.
- Moindre privilège : les limites d'autorisations plafonnent les identités déléguées, les politiques de session plafonnent les sessions, les SCP et RCP plafonnent les comptes ; ID externe contre l'adjoint confus ; le chaînage de rôles limite les sessions à 1 heure.
- Périmètre de données : périmètres d'identité, de ressource et de réseau avec `aws:PrincipalOrgID`, `aws:ResourceOrgID` et les clés réseau ; les RCP restreignent les principaux externes ; Access Analyzer valide ; Verified Access remplace les VPN.
- Hors d'AWS : IAM Roles Anywhere avec des certificats X.509, fédération OIDC pour les autres clouds, activations hybrides SSM ; jamais de clés d'accès à long terme.
