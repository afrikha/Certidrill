L'authentification répond à « qui appelle ? » avant qu'une politique ne soit évaluée. Les questions Specialty mélangent trois populations, chacune avec sa réponse : les personnes de l'entreprise (personnel), les utilisateurs des applications de l'entreprise (clients) et le code (applications, pipelines, serveurs). La conception sécurisée garde une source d'identité par population, ajoute une MFA forte là où des humains se connectent et ne distribue que des informations d'identification de courte durée. La dernière partie du chapitre est celle que les candidats sous-estiment : lire CloudTrail et les erreurs des services pour trouver pourquoi une connexion ou une prise de rôle a échoué.

<!-- section: identity-solutions | objectives: 4.1.1 -->
## Solutions d'identité pour les humains, les applications et les systèmes

| Qui s'authentifie | Mécanisme recommandé |
| --- | --- |
| Les employés, vers de nombreux comptes AWS et applications métier | Instance d'organisation IAM Identity Center, source d'identités = IdP externe (connexion SAML 2.0, provisionnement SCIM) ou Active Directory (AWS Managed Microsoft AD, ou AD Connector vers un AD autogéré) |
| Les clients d'une application web ou mobile | Groupe d'utilisateurs (user pool) Amazon Cognito (inscription, connexion, MFA, fédération sociale ou d'entreprise), plus un groupe d'identités (identity pool) si le client appelle directement les services AWS |
| Le code qui s'exécute sur AWS | Rôles IAM fournis par la plateforme : profil d'instance EC2, rôle de tâche ECS, rôle d'exécution Lambda, EKS Pod Identity |
| Appels d'API de machine à machine | Octroi client credentials de Cognito avec des portées (scopes) sur un serveur de ressources, ou SigV4 avec un rôle IAM |
| Charges de travail hors d'AWS | IAM Roles Anywhere (certificats X.509) ou fédération OIDC IAM |
| Accès d'urgence (break-glass) si l'IdP est indisponible | Un petit nombre d'utilisateurs IAM avec une MFA matérielle, informations d'identification conservées hors ligne, alarmes sur les connexions |

**MFA d'IAM Identity Center** (quand la source d'identités est l'annuaire Identity Center ou Active Directory) :

- Mode d'invite : **à chaque connexion** (par défaut, toujours active), **uniquement quand le contexte de connexion change** (sensible au contexte : appareil, navigateur, emplacement) ou **jamais** (déconseillé).
- Si un utilisateur n'a aucun appareil enregistré : **exiger l'enregistrement d'un appareil MFA à la connexion** (par défaut), envoyer un mot de passe à usage unique par e-mail (mieux qu'un mot de passe seul, mais pas une MFA conforme aux standards du secteur), **bloquer la connexion**, ou autoriser la connexion.
- Types : authentificateurs FIDO2 (clés de sécurité, authentificateurs intégrés comme les clés d'accès [passkeys]) et applications d'authentification ; une MFA RADIUS existante sur Directory Service peut être conservée en laissant la MFA d'Identity Center désactivée.
- Avec un **IdP externe**, les paramètres MFA ne sont pas disponibles dans Identity Center : la MFA est imposée par l'IdP.

**Les utilisateurs IAM et l'utilisateur root** prennent en charge les clés d'accès (passkeys) et clés de sécurité, les applications d'authentification virtuelles et les jetons TOTP matériels, jusqu'à 8 appareils MFA par utilisateur. Dans une organisation, l'**accès root centralisé** permet au compte de gestion ou à un administrateur délégué de supprimer les informations d'identification root des comptes membres et d'exécuter à la demande des tâches root privilégiées.

Exiger la MFA pour les appels d'API des utilisateurs IAM passe par une condition sur `aws:MultiFactorAuthPresent` :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyWithoutMfa",
      "Effect": "Deny",
      "NotAction": ["iam:ListMFADevices", "iam:EnableMFADevice", "iam:ResyncMFADevice", "sts:GetSessionToken"],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" }
      }
    }
  ]
}
```

> **Piège d'examen.** Avec `Bool` au lieu de `BoolIfExists`, le refus ne s'applique jamais aux appels signés avec des clés d'accès à long terme, car la clé est absente de ces requêtes. `BoolIfExists` traite une clé absente comme `false` et refuse.

<!-- section: customer-identity | objectives: 4.1.1 -->
## Amazon Cognito pour les utilisateurs d'applications

| Composant | Rôle |
| --- | --- |
| Groupe d'utilisateurs (user pool) | Annuaire d'utilisateurs et serveur d'autorisation OAuth 2.0 / OIDC ; émet des jetons d'ID, d'accès et d'actualisation (JWT) ; fédère des IdP SAML, OIDC et sociaux |
| Client d'application (app client) | Un par application ; les clients confidentiels (côté serveur) ont un secret client, les clients publics (mobile, application monopage) n'en ont pas et utilisent PKCE |
| Groupe d'identités (identity pool) | Échange un jeton (groupe d'utilisateurs, SAML, OIDC, social) ou une identité invitée contre des informations d'identification AWS temporaires d'un rôle IAM |
| Serveur de ressources et portées | Portées personnalisées vérifiées par API Gateway ou le backend ; utilisées avec l'octroi client credentials |

La **MFA** d'un groupe d'utilisateurs est désactivée, facultative ou obligatoire. Facteurs : **SMS**, **e-mail** (nécessite le plan de fonctionnalités Essentials ou Plus et votre propre configuration Amazon SES) et applications d'authentification **TOTP** ; chaque utilisateur a une seule méthode MFA active. Les **clés d'accès (passkeys)** avec vérification de l'utilisateur peuvent satisfaire la MFA comme premier facteur, mais une clé d'accès ne peut pas être le second facteur après un mot de passe. Les **utilisateurs fédérés** n'ont pas de MFA Cognito : leur IdP les authentifie. La protection contre les menaces (authentification adaptative contre les connexions risquées ou avec des informations d'identification compromises) fait partie du plan **Plus** et nécessite une MFA facultative, pour pouvoir exiger la MFA seulement pour les connexions risquées.

Les rôles d'un groupe d'identités doivent approuver `cognito-identity.amazonaws.com` avec des conditions sur `cognito-identity.amazonaws.com:aud` (l'ID du groupe d'identités) et `cognito-identity.amazonaws.com:amr` (`authenticated` ou `unauthenticated`) ; sans elles, n'importe quel groupe d'identités pourrait utiliser le rôle.

> **Piège d'examen.** Un groupe d'utilisateurs authentifie et émet des JWT ; il ne renvoie jamais d'informations d'identification AWS. Quand une application mobile doit charger directement dans S3, la réponse ajoute un groupe d'identités (ou un backend qui émet des URL présignées), pas d'autres paramètres du groupe d'utilisateurs.

<!-- section: temporary-credentials | objectives: 4.1.2 -->
## Émission d'informations d'identification temporaires

| Opération AWS STS | Appelant | Durée | Remarques |
| --- | --- | --- | --- |
| `AssumeRole` | Utilisateur IAM ou session de rôle | De 15 minutes à la durée de session maximale du rôle (1 à 12 heures), 1 heure par défaut | MFA (`SerialNumber`, `TokenCode`), politiques de session, balises de session, ID externe, identité source |
| `AssumeRoleWithSAML` | Quiconque possède une assertion SAML d'un IdP approuvé (appel non signé) | Comme `AssumeRole` | Pas de paramètre MFA : la MFA a lieu chez l'IdP |
| `AssumeRoleWithWebIdentity` | Quiconque possède un jeton OIDC d'un fournisseur approuvé (appel non signé) | Comme `AssumeRole` | CI/CD, autres clouds, IRSA ; approbation restreinte sur `aud` et `sub` |
| `GetSessionToken` | Utilisateur IAM ou utilisateur root | Utilisateur IAM de 15 minutes à 36 heures (12 heures par défaut), root 1 heure au maximum | Usage principal : appels d'API protégés par MFA ; pas de politique de session |
| `GetFederationToken` | Utilisateur IAM ou utilisateur root | Comme `GetSessionToken` | Politique de session nécessaire en pratique ; ne peut pas appeler IAM par l'API |
| `AssumeRoot` | Principal du compte de gestion ou d'un administrateur délégué disposant de `sts:AssumeRoot` | Session privilégiée courte | Politique de tâche obligatoire (`IAMDeleteRootUserCredentials`, `S3UnlockBucketPolicy`, `SQSUnlockQueuePolicy`, `IAMAuditRootUserCredentials`, `IAMCreateRootUserPassword`) ; point de terminaison STS régional uniquement |

Le **chaînage de rôles** (utiliser une session de rôle pour prendre un autre rôle) limite la nouvelle session à 1 heure, quelle que soit la durée maximale du rôle. Les informations d'identification ne peuvent pas être révoquées une par une ; pour couper les sessions après une fuite de clé, utilisez **Révoquer les sessions actives** sur le rôle, qui ajoute un refus pour les jetons émis avant cet instant (`aws:TokenIssueTime`), puis corrigez la cause.

Sur EC2, exigez **IMDSv2** (`HttpTokens` défini sur `required`) pour que les informations d'identification du profil d'instance ne puissent être lues qu'avec un jeton de session, ce qui bloque la plupart des vols par SSRF.

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::444455556666:role/audit/SecurityAudit \
  --role-session-name analyst-jdoe \
  --serial-number arn:aws:iam::111122223333:mfa/jdoe \
  --token-code 123456 \
  --duration-seconds 3600

aws s3 presign s3://example-reports/2026/q3.pdf --expires-in 900
```

Les **URL présignées Amazon S3** sont des jetons au porteur : quiconque en détient une peut effectuer l'opération signée jusqu'à son expiration, avec les autorisations du signataire.

| Signée avec | Validité maximale |
| --- | --- |
| Clés d'accès d'un utilisateur IAM (SigV4, CLI ou SDK) | 7 jours |
| Console S3 | De 1 minute à 12 heures |
| Informations d'identification temporaires (session de rôle, profil d'instance, rôle de tâche) | Jusqu'à l'expiration des informations d'identification, même si une expiration plus longue est demandée |

Une URL cesse de fonctionner quand les informations d'identification de signature sont révoquées ou désactivées. Les politiques de compartiment peuvent limiter l'usage présigné : `s3:signatureAge` (âge maximal de la signature), `s3:authType` (`REST-QUERY-STRING` identifie les requêtes présignées), et `aws:SourceIp`, `aws:SourceVpc` ou `aws:SourceVpce` pour le réseau.

> **Piège d'examen.** Une URL présignée générée par une fonction Lambda dure au plus aussi longtemps que la session du rôle de la fonction, donc une expiration demandée de 7 jours échoue plus tôt. Pour des URL de longue durée, signez avec les clés d'un utilisateur IAM dédié (stockées dans Secrets Manager et renouvelées) ou, mieux, raccourcissez l'exigence.

<!-- section: authn-troubleshooting | objectives: 4.1.3 -->
## Dépannage de l'authentification

Les preuves viennent de **CloudTrail** : événements de connexion (`ConsoleLogin` avec `responseElements.ConsoleLogin` = `Failure` et `errorMessage` « Failed authentication », `additionalEventData.MFAUsed`), événements STS (`AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity` avec un `errorCode`) et événements IAM Identity Center (`CredentialVerification`, `ExternalIdPDirectoryLogin`). CloudTrail Lake est fermé aux nouveaux clients depuis le 31 mai 2026 ; les nouvelles conceptions interrogent les journaux de suivi dans S3 avec Amazon Athena ou les envoient à CloudWatch Logs (Logs Insights).

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| `AccessDenied` sur `sts:AssumeRole` « because no role trust policy allows » | La politique d'approbation ne nomme pas l'appelant, ou une condition échoue (`sts:ExternalId`, MFA, `aws:PrincipalOrgID`) | Corriger la politique d'approbation ; l'appelant a aussi besoin de `sts:AssumeRole` dans sa propre politique |
| « An unexpected error has occurred » dans Identity Center après la connexion à l'IdP | Le `NameID` SAML ne correspond à aucun nom d'utilisateur Identity Center existant (pas de création juste à temps), URL ACS erronée, assertion chiffrée | Provisionner d'abord les utilisateurs avec SCIM, aligner le `NameID`, vérifier les échecs `CredentialVerification` dans CloudTrail |
| L'utilisateur ne voit aucun compte alors qu'il est attribué | Utilisateur ou groupe supprimé puis recréé dans l'IdP (nouvel ID interne) | Retirer puis rajouter l'attribution |
| La modification d'un ensemble d'autorisations n'a aucun effet | Modification non poussée vers les comptes | Reprovisionner l'ensemble d'autorisations (`provision-permission-set`) |
| L'attribution d'un ensemble d'autorisations échoue dans un compte | Une politique gérée par le client ou une limite référencée par nom et chemin n'existe pas dans ce compte | La créer dans chaque compte cible (StackSets) |
| La modification d'un rôle `AWSReservedSSO_` échoue | Rôle protégé géré par Identity Center | Modifier plutôt l'ensemble d'autorisations |
| Cognito `NotAuthorizedException` | Mot de passe erroné, jeton d'actualisation révoqué ou expiré, hachage du secret client absent pour un client confidentiel | Vérifier les paramètres du client d'application et la validité des jetons |
| Cognito `UserNotConfirmedException` | Inscription non confirmée | Confirmer l'utilisateur (code ou confirmation par un administrateur) |
| Cognito `redirect_mismatch` | URL de rappel absente de la liste autorisée du client d'application | Ajouter l'URL exacte |
| La connexion par AD Connector échoue | Compte de service sans droits de lecture ou expiré, ports TCP/UDP 53, 88, 389 fermés vers les contrôleurs de domaine, pré-authentification Kerberos désactivée, décalage d'horloge | Corriger le compte de service, le pare-feu et NTP ; la MFA RADIUS nécessite UDP 1812 |

Pour les annuaires, AWS Managed Microsoft AD prend en charge les approbations avec les domaines sur site, AD Connector ne fait que relayer les requêtes vers un annuaire existant, et **Simple AD est fermé aux nouveaux clients** depuis le 30 juillet 2026 : ce n'est donc pas une réponse valable pour un nouveau déploiement.

> **Conseil d'examen.** « Les utilisateurs s'authentifient chez l'IdP mais arrivent sur une page d'erreur dans Identity Center » est un problème d'attribut SAML ou de provisionnement. « Les utilisateurs atteignent le portail mais reçoivent un refus d'accès dans le compte » est un problème d'autorisation (ensemble d'autorisations ou SCP), traité au chapitre 42.

<!-- section: key-points -->
## Points clés

- Une source d'identités par population : Identity Center pour le personnel, Cognito pour les clients, rôles IAM pour le code, Roles Anywhere ou OIDC hors d'AWS.
- MFA d'Identity Center : toujours active par défaut, sensible au contexte en option ; les IdP externes imposent leur propre MFA.
- `BoolIfExists` sur `aws:MultiFactorAuthPresent` pour refuser les clés à long terme sans MFA.
- Cognito : les groupes d'utilisateurs émettent des JWT, les groupes d'identités émettent des informations d'identification AWS ; la MFA par e-mail nécessite Essentials ou Plus ; la protection contre les menaces fait partie de Plus ; les utilisateurs fédérés reçoivent la MFA de leur IdP.
- STS : sessions de rôle de 15 minutes à 12 heures, chaînage de rôles limité à 1 heure, `GetSessionToken` jusqu'à 36 heures, `AssumeRoot` avec des politiques de tâche ; révocation des sessions avec `aws:TokenIssueTime` ; IMDSv2.
- URL présignées : 7 jours avec les clés d'un utilisateur IAM, jamais plus longtemps que les informations d'identification temporaires ; restriction avec `s3:signatureAge`, `s3:authType` et les clés réseau.
- Dépannage à partir de CloudTrail : erreurs de politique d'approbation, `NameID` SAML, reprovisionnement des ensembles d'autorisations, politiques gérées par le client manquantes, ports et comptes de service de Directory Service.
