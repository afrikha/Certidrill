Les questions d'authentification et d'autorisation décrivent qui appelle (l'utilisateur final d'une application mobile, un employé, une tâche CI/CD, une fonction Lambda, un autre compte) et ce que le code doit atteindre (une API, un objet S3, un élément DynamoDB). La réponse est un mécanisme qui émet des informations d'identification temporaires ou un jeton, plus une politique qui limite ce qu'ils autorisent. Ce chapitre couvre la fédération d'identités, le contrôle d'accès par jetons et MFA, l'accès par programmation, les URL présignées, les requêtes signées, les autorisations IAM et l'assomption de rôle.

<!-- section: identity-federation | objectives: 2.1.1 -->
## La fédération d'identités

La fédération permet à une identité gérée ailleurs (un annuaire d'utilisateurs, un fournisseur social, un IdP d'entreprise, une plateforme CI/CD) d'utiliser AWS sans utilisateur IAM. Associez l'appelant au mécanisme :

| Qui se connecte | Mécanisme |
| --- | --- |
| Utilisateurs finaux d'une application web ou mobile : inscription, connexion, connexion sociale ou SAML/OIDC, MFA | Groupe d'utilisateurs (user pool) Amazon Cognito (renvoie des JWT) |
| Ces mêmes utilisateurs doivent appeler directement les services AWS (charger dans S3, lire DynamoDB) | Groupe d'identités (identity pool) Amazon Cognito, qui échange le jeton du groupe d'utilisateurs (ou un jeton social, SAML ou OIDC) contre des informations d'identification AWS temporaires |
| Invités qui ne se sont pas connectés | Groupe d'identités avec accès non authentifié (invité) et un rôle non authentifié minimal |
| Employés qui se connectent à la console et à la CLI dans plusieurs comptes | AWS IAM Identity Center |
| Un IdP SAML 2.0 d'entreprise associé à des rôles IAM d'un compte | Fournisseur d'identité SAML IAM et `AssumeRoleWithSAML` |
| Une plateforme CI/CD qui émet des jetons OIDC (GitHub Actions, GitLab) | Fournisseur d'identité OIDC IAM et `AssumeRoleWithWebIdentity` ; aucune clé d'accès stockée |
| Serveurs hors d'AWS dotés de certificats X.509 | IAM Roles Anywhere |

Un groupe d'identités fournit des informations d'identification selon deux flux :

| | Flux amélioré (simplifié) | Flux de base (classique) |
| --- | --- | --- |
| Appels d'API | `GetId`, puis `GetCredentialsForIdentity` | `GetId`, `GetOpenIdToken`, puis `AssumeRoleWithWebIdentity` de STS |
| Qui choisit le rôle IAM | Le groupe d'identités : rôle par défaut, règles ou revendications du jeton | L'application cliente |
| Durée de vie des informations d'identification | Une heure | Durée de session personnalisable |
| Mappages de rôles | Pris en charge | Non pris en charge |
| Recommandation | Recommandé par AWS | Désactivé par défaut pour les nouveaux groupes |

Un groupe d'utilisateurs émet trois jetons. Le **jeton d'identification (ID token)** porte les revendications d'identité (`email`, `cognito:groups`) ; le **jeton d'accès** porte la revendication OAuth `scope` et autorise les appels d'API ; le **jeton d'actualisation (refresh token)** (30 jours par défaut, de 60 minutes à 10 ans) obtient de nouveaux jetons d'identification et d'accès. Avec la rotation des jetons d'actualisation, chaque actualisation renvoie un nouveau jeton d'actualisation et invalide l'ancien. Vérifiez toujours la signature d'un jeton avec le jeu de clés web JSON (JWKS) du groupe d'utilisateurs avant de faire confiance à ses revendications.

> **Piège d'examen.** Un groupe d'utilisateurs authentifie les utilisateurs mais ne renvoie jamais d'informations d'identification AWS. « Les utilisateurs doivent charger directement dans leur propre préfixe S3 depuis l'application mobile » exige un groupe d'identités derrière le groupe d'utilisateurs.

<!-- section: access-control | objectives: 2.1.2 -->
## Le contrôle d'accès par jetons, autorisations détaillées et MFA

API Gateway propose plusieurs façons d'autoriser un appelant :

| Exigence | Mécanisme d'API Gateway |
| --- | --- |
| Les appelants sont des utilisateurs Cognito connectés | Mécanisme d'autorisation de groupe d'utilisateurs Cognito (API REST) : envoyer le jeton d'identification, ou le jeton d'accès quand les méthodes exigent des portées OAuth |
| Valider sans code des JWT de n'importe quel fournisseur OIDC | Mécanisme d'autorisation JWT (API HTTP ; documenté aussi pour les API REST) avec émetteur, audience et portées |
| Logique personnalisée : un jeton tiers, un en-tête plus une chaîne de requête, une recherche en base | Mécanisme d'autorisation Lambda, de type `TOKEN` (un jeton porteur) ou `REQUEST` (en-têtes, chaînes de requête, variables d'étape, contexte ; recommandé) |
| Les appelants sont des principaux AWS (autres services, rôles d'autres comptes) | Autorisation IAM : l'appelant signe avec SigV4 et a besoin de `execute-api:Invoke` |
| N'autoriser que certaines IP sources, certains points de terminaison de VPC ou comptes | Politique de ressource sur l'API REST |
| Mesurer et limiter chaque client | Plans d'utilisation et clés d'API, jamais pour l'autorisation |

Un mécanisme d'autorisation Lambda renvoie un `principalId`, un document de politique qui autorise ou refuse `execute-api:Invoke`, et une table `context` facultative transmise au backend. Un refus renvoie 403 ; une source d'identité absente ou une erreur `Unauthorized` renvoie 401. La politique est mise en cache par source d'identité quand le cache est activé : une politique en cache doit donc couvrir toutes les méthodes que l'appelant peut utiliser, sinon l'appelant reçoit 403 sur les autres méthodes jusqu'à l'expiration de l'entrée en cache.

Les **autorisations détaillées** utilisent des variables de politique et des clés de condition pour qu'un seul rôle serve tous les utilisateurs. Avec un groupe d'identités, chaque utilisateur n'atteint que les éléments DynamoDB dont la clé de partition est son propre ID d'identité :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:111122223333:table/UserNotes",
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
        }
      }
    }
  ]
}
```

Le même modèle limite l'accès S3 à un préfixe (`arn:aws:s3:::example-bucket/${cognito-identity.amazonaws.com:sub}/*`). `dynamodb:Attributes` limite les attributs qui peuvent être lus ou écrits.

**MFA** : dans les politiques IAM, exigez-la avec la condition `aws:MultiFactorAuthPresent` (et `aws:MultiFactorAuthAge` pour limiter son ancienneté). Un développeur qui utilise des clés à long terme appelle `sts get-session-token` avec `--serial-number` et `--token-code` pour obtenir des informations d'identification temporaires authentifiées par MFA ; un profil de rôle de la CLI avec `mfa_serial` demande le code. Dans les groupes d'utilisateurs Cognito, la MFA (SMS, application d'authentification TOTP, e-mail) est désactivée, facultative ou obligatoire.

> **Piège d'examen.** Les clés d'API identifient et limitent les clients ; elles ne les authentifient pas. Une clé valide pour une API d'un plan d'utilisation fonctionne pour toutes les API de ce plan. Utilisez IAM, un mécanisme d'autorisation Cognito ou Lambda pour contrôler l'accès.

<!-- section: programmatic-access | objectives: 2.1.3 -->
## L'accès par programmation à AWS

Les SDK et la CLI cherchent les informations d'identification dans une chaîne et s'arrêtent à la première source qui répond : informations définies dans le code, variables d'environnement (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`), identité web, connexion console (`aws login`), IAM Identity Center, profil de rôle, informations d'identification de conteneur (ECS, EKS), `credential_process`, puis le service de métadonnées d'instance EC2.

| Où le code s'exécute | Informations d'identification à utiliser |
| --- | --- |
| Poste du développeur, personnel dans IAM Identity Center | `aws configure sso`, puis `aws sso login` |
| Poste du développeur, utilisateurs de la console (utilisateurs IAM, racine, fédération IAM) | `aws login` (CLI 2.32.0 ou ultérieure, politique gérée `SignInLocalDevelopmentAccess`) : informations temporaires actualisées jusqu'à 12 heures |
| Instance EC2 | Profil d'instance (rôle) ; IMDSv2 |
| Fonction Lambda | Rôle d'exécution |
| Tâche ECS | Rôle de tâche pour les appels de l'application ; le rôle d'exécution de tâche sert seulement à extraire l'image et à écrire les journaux |
| Projet CodeBuild | Rôle de service |
| Hors d'AWS, sans OIDC | IAM Roles Anywhere, ou des clés d'accès à long terme en dernier recours, avec rotation |

Un fichier de configuration partagé définit des profils :

```text
[profile dev]
sso_session = corp
sso_account_id = 111122223333
sso_role_name = DeveloperAccess

[sso-session corp]
sso_region = us-east-1
sso_start_url = https://example-corp.awsapps.com/start

[profile deploy]
role_arn = arn:aws:iam::444455556666:role/DeployRole
source_profile = dev
mfa_serial = arn:aws:iam::111122223333:mfa/dev-user
```

Choisissez un profil avec `--profile` ou `AWS_PROFILE`. `aws sts get-caller-identity` montre l'identité réellement retenue par la chaîne.

> **Piège d'examen.** Les variables d'environnement passent avant les fichiers de configuration et le profil d'instance. Quand une application EC2 « ignore son rôle d'instance », cherchez des variables `AWS_ACCESS_KEY_ID` oubliées ou un fichier d'informations d'identification. N'intégrez jamais de clés d'accès dans le code, une AMI ou une image de conteneur.

<!-- section: presigned-urls | objectives: 2.1.4 -->
## Les URL présignées et les URL signées CloudFront

Une **URL présignée S3** donne un accès limité dans le temps à un objet à quelqu'un qui n'a pas d'informations d'identification AWS. Elle porte les autorisations du principal qui l'a signée et sert au `GET` (téléchargement) ou au `PUT` (chargement ; une clé existante est remplacée).

```bash
aws s3 presign s3://example-reports/2026/q3.pdf --expires-in 900
```

```python
# Python (boto3): upload URL for a browser client, valid 10 minutes
s3 = boto3.client("s3")
url = s3.generate_presigned_url(
    "put_object",
    Params={"Bucket": "example-uploads", "Key": "user-42/photo.jpg", "ContentType": "image/jpeg"},
    ExpiresIn=600,
)
```

| Informations d'identification qui signent | Validité maximale |
| --- | --- |
| Clés d'accès d'un utilisateur IAM (SigV4, CLI ou SDK) | 7 jours |
| Informations temporaires d'un rôle ou de STS (Lambda, EC2, ECS) | Jusqu'à l'expiration des informations de session, quelle que soit la valeur de `ExpiresIn` |
| Console S3 | De 1 minute à 12 heures |

S3 vérifie l'expiration à l'arrivée de la requête. Une URL cesse de fonctionner plus tôt si les informations d'identification qui l'ont signée sont révoquées ou supprimées, ou si le signataire perd l'autorisation. Une politique de compartiment peut rejeter les signatures anciennes avec `s3:signatureAge` ou restreindre les appelants avec `aws:SourceIp`.

Pour un contenu distribué par **CloudFront**, utilisez des URL signées ou des cookies signés CloudFront, et un contrôle d'accès d'origine (OAC) pour que le compartiment S3 ne puisse pas être lu directement :

| Exigence | Réponse |
| --- | --- |
| Un seul fichier (un programme d'installation), ou un client qui ne gère pas les cookies | URL signée |
| De nombreux fichiers (tous les segments HLS d'une vidéo, un espace abonnés) sans changer les URL | Cookies signés |
| Seulement une date d'expiration | Politique prédéfinie (canned policy) |
| Date de début, plage d'IP ou ressource avec caractère générique | Politique personnalisée (custom policy) |
| Qui peut signer | Un groupe de clés approuvé (clés publiques chargées dans CloudFront, gérées avec IAM) ; les paires de clés CloudFront exigent l'utilisateur racine et ne sont pas recommandées |

> **Piège d'examen.** Une URL présignée générée par une fonction Lambda avec un `ExpiresIn` de 24 heures échoue au bout de quelques heures : elle est signée avec les informations temporaires du rôle d'exécution. Pour une longue validité, signez avec des informations d'identification durables, ou utilisez des URL signées CloudFront.

<!-- section: signed-requests | objectives: 2.1.5 -->
## Effectuer des appels authentifiés

Chaque appel d'API AWS est signé avec **Signature Version 4** (SigV4) : une signature dérivée de la clé secrète, limitée à une Région, un service et un jour, placée dans l'en-tête `Authorization` ou dans la chaîne de requête. Avec des informations d'identification temporaires, le jeton de session est aussi envoyé (`X-Amz-Security-Token`). Les SDK et la CLI signent automatiquement ; signez vous-même seulement depuis du code HTTP personnalisé, par exemple pour appeler une méthode d'API Gateway avec autorisation IAM ou une URL de fonction Lambda en authentification `AWS_IAM`. **SigV4a** utilise des signatures asymétriques valables dans plusieurs Régions, pour les points d'accès multi-Régions S3 ; les SDK y passent automatiquement.

| Symptôme | Cause probable |
| --- | --- |
| Requête rejetée car la signature a expiré ou l'heure est décalée | L'horloge du client est fausse : une requête doit parvenir à AWS dans les 5 minutes qui suivent son horodatage |
| `SignatureDoesNotMatch` | Mauvaise clé secrète, Région ou service dans la signature, ou requête modifiée après signature |
| `ExpiredToken` | Les informations temporaires ont expiré et le code les a mises en cache au lieu d'utiliser le fournisseur |
| `InvalidClientTokenId` | Clé d'accès supprimée, mauvais compte, ou jeton de session absent |
| `AccessDenied` / 403 | L'authentification a réussi ; une politique n'autorise pas l'action |

Les **URL de fonction Lambda** ont deux types d'authentification : `AWS_IAM` (les appelants signent avec SigV4 ; un appelant du même compte a besoin d'une autorisation basée sur l'identité ou sur la ressource, un appelant d'un autre compte des deux) et `NONE` (public, mais la politique basée sur les ressources doit quand même l'autoriser). Depuis octobre 2025, les nouvelles URL de fonction exigent à la fois `lambda:InvokeFunctionUrl` et `lambda:InvokeFunction`.

> **Conseil d'examen.** « Appeler une API protégée par IAM depuis un script Python » signifie SigV4 avec des informations temporaires issues de la chaîne de fournisseurs, pas une clé d'API ni un secret codé en dur.

<!-- section: iam-permissions | objectives: 2.1.6 -->
## Les autorisations des principaux et des ressources

| Type de politique | Attachée à | Usage |
| --- | --- | --- |
| Politique basée sur l'identité | Utilisateur, groupe ou rôle | Ce que ce principal peut faire |
| Politique basée sur les ressources | Compartiment S3, file d'attente SQS, rubrique SNS, clé KMS, fonction Lambda, secret Secrets Manager, API d'API Gateway | Qui peut accéder à cette ressource, y compris d'autres comptes et des services AWS |
| Politique d'approbation (trust policy) | Rôle | Qui peut assumer le rôle |
| Limite d'autorisations (permissions boundary) | Utilisateur ou rôle | Le maximum que les politiques basées sur l'identité peuvent accorder |
| Politique de session | Une session de rôle assumé | Limite davantage une session |

Évaluation : tout est refusé au départ, un refus explicite l'emporte toujours, et une autorisation doit venir d'une politique basée sur l'identité ou sur les ressources. Dans un même compte, l'une ou l'autre suffit en général (une clé KMS fait exception : sa politique de clé doit autoriser) ; entre comptes, la politique d'identité de l'appelant et la politique de la ressource doivent toutes deux autoriser.

Les intégrations de services montrent les deux côtés :

| Intégration | Autorisation nécessaire |
| --- | --- |
| S3, SNS ou API Gateway invoque une fonction Lambda (push) | Politique basée sur les ressources de la fonction (`aws lambda add-permission --principal s3.amazonaws.com --source-arn ...`) |
| Lambda lit depuis SQS, Kinesis ou DynamoDB Streams (mappage de source d'événements, interrogation) | Rôle d'exécution : `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` (ou les équivalents pour les flux) |
| Le code transmet un rôle à un service (créer une fonction Lambda, une tâche ECS, une pile CloudFormation) | `iam:PassRole` sur ce rôle |

```json
{
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::111122223333:role/app-lambda-execution",
  "Condition": { "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" } }
}
```

Accordez le moindre privilège : actions et ARN de ressources précis, conditions (`aws:SourceArn`, `aws:PrincipalTag`, `aws:ResourceTag` pour le contrôle d'accès basé sur les attributs). IAM Access Analyzer génère une politique à partir de l'activité CloudTrail et valide les politiques ; le simulateur de politiques IAM teste si une action est autorisée.

> **Piège d'examen.** « La fonction n'arrive pas à lire SQS » ou « le mappage de source d'événements ne se crée pas » relève du rôle d'exécution, pas de la politique basée sur les ressources de la fonction. Les sources push exigent la politique basée sur les ressources ; les sources interrogées exigent le rôle d'exécution.

<!-- section: assume-role | objectives: 2.1.7 -->
## Assumer un rôle IAM

Pour assumer un rôle, deux conditions doivent être vraies : la **politique d'approbation** du rôle nomme l'appelant comme principal, et les autorisations propres de l'appelant permettent `sts:AssumeRole` sur l'ARN du rôle.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/ci-runner" },
      "Action": "sts:AssumeRole",
      "Condition": { "StringEquals": { "sts:ExternalId": "anycompany-7731" } }
    }
  ]
}
```

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::444455556666:role/DeployRole \
  --role-session-name build-1287 \
  --duration-seconds 3600
```

La réponse contient `AccessKeyId`, `SecretAccessKey`, `SessionToken` et `Expiration` ; les trois valeurs doivent être utilisées ensemble.

| Élément | Valeur ou règle |
| --- | --- |
| Durée de session par défaut | 1 heure |
| Durée de session maximale | Le paramètre du rôle, de 1 à 12 heures |
| Chaînage de rôles (une session de rôle assume un autre rôle) | Limité à 1 heure |
| `GetSessionToken` (utilisateur IAM, MFA) | De 15 minutes à 36 heures, 12 heures par défaut |
| Un tiers assume un rôle dans votre compte | Exiger un ID externe (`sts:ExternalId`) |
| Tracer qui a fait quoi | `--role-session-name`, balises de session, identité source, visibles dans CloudTrail |

`AssumeRoleWithWebIdentity` et `AssumeRoleWithSAML` n'exigent aucune information d'identification AWS de l'appelant : le jeton OIDC ou SAML sert de preuve, et la politique d'approbation nomme le fournisseur d'identité avec des conditions sur les champs `aud` et `sub` du jeton.

> **Piège d'examen.** Une erreur « is not authorized to perform `sts:AssumeRole` » peut venir de l'un ou l'autre côté. Entre comptes, vérifiez la politique d'approbation dans le compte cible et la politique de l'appelant dans le compte source. Demander `--duration-seconds 14400` échoue si la durée de session maximale du rôle est de 1 heure ou s'il s'agit d'un chaînage de rôles.

<!-- section: key-points -->
## Points clés

- Les groupes d'utilisateurs authentifient et émettent des JWT ; les groupes d'identités échangent des jetons contre des informations AWS temporaires ; le flux amélioré est recommandé.
- Personnel : IAM Identity Center ; CI/CD : fournisseur OIDC et `AssumeRoleWithWebIdentity` ; serveurs hors d'AWS : IAM Roles Anywhere.
- API Gateway : mécanismes d'autorisation Cognito, JWT, Lambda ou IAM ; politiques de ressource pour les IP et les points de terminaison ; les clés d'API ne font que mesurer.
- `dynamodb:LeadingKeys` et les variables de politique donnent un accès par utilisateur avec un seul rôle ; `aws:MultiFactorAuthPresent` exige la MFA.
- Des rôles partout dans AWS (profil d'instance, rôle d'exécution, rôle de tâche) ; `aws login` ou `aws sso login` sur les postes ; aucune clé intégrée.
- Les URL présignées portent les autorisations du signataire et meurent avec les informations temporaires ; URL signées CloudFront pour un fichier, cookies pour plusieurs.
- SigV4 est automatique dans les SDK ; une requête doit arriver dans les 5 minutes qui suivent son horodatage.
- Les intégrations push exigent des politiques basées sur les ressources, les intégrations par interrogation le rôle d'exécution, la transmission d'un rôle `iam:PassRole`.
- AssumeRole exige la politique d'approbation et l'autorisation de l'appelant ; 1 heure par défaut, jusqu'à 12 heures, 1 heure en chaînage.
