Une fois un principal authentifié, chaque requête est décidée par des politiques, et le domaine identité est le plus lourd de l'examen (20 %). Les questions donnent une politique ou un ensemble de politiques et demandent si une requête réussit, pourquoi elle échoue, ou quelle modification accorde exactement ce qui est nécessaire. Il faut connaître par cœur la logique d'évaluation, les garde-fous qui plafonnent les autorisations sans jamais en accorder, les modèles fondés sur les balises qui passent à l'échelle et les outils qui trouvent et suppriment les accès que personne n'a voulus.

<!-- section: authorization-design | objectives: 4.2.1 -->
## Contrôles d'autorisation pour les humains, les applications et les systèmes

| Exigence | Contrôle |
| --- | --- |
| Autorisations fines dans une application personnalisée (« seul le propriétaire ou un approbateur de ce dossier ») | Amazon Verified Permissions avec des politiques Cedar |
| Un autre compte lit un compartiment, une file d'attente, une clé ou un secret | Politique basée sur les ressources qui nomme le compte ou le rôle, plus une autorisation dans la politique d'identité de l'appelant |
| Un autre compte exploite de nombreuses ressources | Rôle IAM dans le compte des ressources ; sa politique d'approbation nomme l'appelant, qui a besoin de `sts:AssumeRole` |
| Un tiers prend des rôles pour de nombreux clients | Condition de la politique d'approbation sur `sts:ExternalId` (protection contre le problème de l'adjoint confus) |
| Un service AWS écrit dans votre ressource | Principal de service dans la politique de la ressource, limité par `aws:SourceArn` ou `aws:SourceAccount` |
| Des serveurs hors d'AWS ont besoin d'informations d'identification | IAM Roles Anywhere |
| Regrouper rôles et utilisateurs par équipe dans les politiques | Chemins IAM, par exemple `role/payments/` |

**Amazon Verified Permissions** externalise l'autorisation des applications. Un **magasin de politiques** (policy store) contient des politiques Cedar, un **schéma** facultatif (types d'entités, actions, attributs, servant à valider les politiques) et des **modèles de politiques** (une politique avec des espaces réservés, instanciée par principal ou par ressource, par exemple « partager ce document avec cet utilisateur »). Une **source d'identités** (groupe d'utilisateurs Cognito ou fournisseur OIDC) permet à l'application de transmettre un jeton : `IsAuthorizedWithToken` associe ses revendications au principal ; `IsAuthorized` prend un principal, une action, une ressource et un contexte explicites ; `BatchIsAuthorized` évalue plusieurs requêtes à la fois. Les décisions sont refusées par défaut, et tout `forbid` applicable l'emporte sur chaque `permit`. Un magasin de politiques peut être construit à partir d'un groupe d'utilisateurs Cognito et d'une API API Gateway, avec un mécanisme d'autorisation Lambda qui appelle Verified Permissions.

Les **chemins IAM** apparaissent dans les ARN (`arn:aws:iam::111122223333:role/payments/batch-runner`). Les politiques peuvent accorder `iam:PassRole` ou `sts:AssumeRole` sur `role/payments/*`, et les SCP ou les politiques basées sur les ressources peuvent exempter les rôles d'administration avec des modèles `aws:PrincipalArn`. Le chemin d'un rôle est fixé à sa création. Les rôles créés par IAM Identity Center se trouvent sous `/aws-reserved/sso.amazonaws.com/`.

Les **politiques d'approbation** sont les politiques basées sur les ressources des rôles : elles décident qui peut prendre le rôle, et les politiques d'autorisations décident de ce que la session peut faire. Exemple Roles Anywhere, restreint à une ancre d'approbation et à un sujet de certificat :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "rolesanywhere.amazonaws.com" },
      "Action": ["sts:AssumeRole", "sts:TagSession", "sts:SetSourceIdentity"],
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "arn:aws:rolesanywhere:eu-west-3:111122223333:trust-anchor/2f6a1c3e-0b4d-4e8f-9a1b-3c5d7e9f1a2b"
        },
        "StringEquals": {
          "aws:PrincipalTag/x509Subject/CN": "billing-batch-01.corp.example.com"
        }
      }
    }
  ]
}
```

> **Piège d'examen.** Une politique d'approbation dont le principal est `arn:aws:iam::444455556666:root` ne permet pas à tout le monde dans ce compte de prendre le rôle : elle délègue la décision à ce compte, dont les principaux ont toujours besoin de `sts:AssumeRole` dans leurs propres politiques. Pour la restreindre à des rôles précis, nommez leurs ARN ou ajoutez `aws:PrincipalArn`.

<!-- section: abac-rbac | objectives: 4.2.2 -->
## Stratégies ABAC et RBAC

| | RBAC | ABAC |
| --- | --- | --- |
| Unité | Un rôle ou un ensemble d'autorisations par fonction | Balises sur les principaux et les ressources |
| Nouveau projet ou nouvelle équipe | Nouvelles politiques ou nouveaux rôles | Baliser les nouvelles ressources et les principaux, sans modifier les politiques |
| Granularité | Grossière, sauf avec beaucoup de rôles | Par projet, centre de coûts, environnement, classification des données |
| Risque principal | Explosion du nombre de rôles, rôles trop larges | Des utilisateurs qui modifient des balises pour s'accorder un accès |
| Source habituelle | Groupes Identity Center attribués à des ensembles d'autorisations | Attributs pour le contrôle d'accès d'Identity Center, balises de session SAML ou OIDC, balises des utilisateurs ou rôles IAM |

Clés de condition :

- `aws:PrincipalTag/key` : balise de l'utilisateur, du rôle ou de la session appelante.
- `aws:ResourceTag/key` : balise de la ressource cible (prise en charge par de nombreuses actions, pas toutes).
- `aws:RequestTag/key` et `aws:TagKeys` : balises envoyées dans une requête de création ou de balisage ; elles servent à exiger des balises à la création et à limiter les clés qui peuvent être définies.

Les **balises de session** viennent de l'IdP (attribut SAML `https://aws.amazon.com/SAML/Attributes/PrincipalTag:CostCenter`, revendications OIDC) ou sont transmises dans `AssumeRole` (`sts:TagSession` doit être autorisé dans la politique d'approbation). Les balises de session **transitives** persistent dans le chaînage de rôles. Dans Identity Center, les **attributs pour le contrôle d'accès** associent des attributs de l'IdP ou de l'annuaire à des balises de session pour chaque ensemble d'autorisations.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OperateOwnProject",
      "Effect": "Allow",
      "Action": ["ec2:StartInstances", "ec2:StopInstances", "ec2:RebootInstances"],
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": { "aws:ResourceTag/project": "${aws:PrincipalTag/project}" }
      }
    },
    {
      "Sid": "ProtectProjectTag",
      "Effect": "Deny",
      "Action": ["ec2:CreateTags", "ec2:DeleteTags"],
      "Resource": "*",
      "Condition": {
        "ForAnyValue:StringEquals": { "aws:TagKeys": ["project"] }
      }
    }
  ]
}
```

> **Piège d'examen.** Un ABAC sans refus sur le balisage des clés d'autorisation permet à tout utilisateur capable de baliser une ressource de la faire passer dans son projet. Protégez ces clés par un refus (ou une SCP) et normalisez les valeurs avec des politiques de balises.

<!-- section: least-privilege-policies | objectives: 4.2.3 -->
## Politiques IAM de moindre privilège

Évaluation d'une requête :

1. Un `Deny` explicite dans une politique applicable met fin à l'évaluation : refus.
2. Les SCP (sur le compte du principal) et les RCP (sur le compte de la ressource) doivent l'autoriser ; elles n'accordent jamais rien.
3. Une politique basée sur les ressources ou une politique basée sur l'identité doit l'autoriser. Dans un même compte, l'une ou l'autre suffit ; entre comptes, les deux côtés sont nécessaires (la politique de la ressource et la politique d'identité de l'appelant, ou la politique d'approbation et `sts:AssumeRole`).
4. Une limite d'autorisations et une politique de session, quand elles existent, doivent aussi autoriser les autorisations basées sur l'identité : le résultat est l'intersection.

Détails d'un même compte testés au niveau Specialty : une politique basée sur les ressources qui nomme l'**ARN d'un utilisateur IAM** ou l'**ARN d'une session de rôle** accorde directement et n'est pas limitée par un refus implicite de la limite d'autorisations ou de la politique de session ; une politique qui nomme l'**ARN du rôle** est limitée par celles-ci. Les clés KMS et l'approbation des rôles sont des exceptions à « l'une ou l'autre suffit » : la politique de clé (ou la politique d'approbation) doit autoriser, directement ou en déléguant au compte.

| Garde-fou | S'applique à | Usage |
| --- | --- | --- |
| Limite d'autorisations | Un utilisateur ou un rôle IAM | Les développeurs créent des rôles qui ne peuvent jamais dépasser la limite (condition `iam:PermissionsBoundary` sur `iam:CreateRole`) |
| Politique de session | Une session issue de `AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity` ou `GetFederationToken` | Un courtier réduit un rôle partagé au préfixe d'un locataire à chaque requête |
| SCP | Principaux des comptes membres (pas le compte de gestion, pas les rôles liés à un service) | Refuser des Régions, protéger les services de sécurité, exiger le chiffrement |
| RCP | Ressources des comptes membres, pour les services pris en charge | Refuser l'accès aux principaux extérieurs à l'organisation |

Écrire des instructions de moindre privilège : nommer les actions au lieu de `*`, limiter `Resource` à des ARN, ajouter des conditions (`aws:ResourceAccount`, `aws:SourceVpce`, `aws:CalledVia`, `aws:RequestedRegion`, `kms:ViaService`), et se méfier de `NotAction` et `NotResource` dans les instructions `Allow`, qui accordent tout ce qui n'est pas listé. Partez de l'activité CloudTrail avec la **génération de politiques** d'IAM Access Analyzer, puis retirez les services indiqués comme inutilisés dans les informations de dernier accès.

Une politique de session transmise par un courtier, limitée au préfixe d'un client :

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::111122223333:role/tenant-broker/TenantData \
  --role-session-name tenant-4711 \
  --policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject"],"Resource":"arn:aws:s3:::example-tenant-data/tenant-4711/*"}]}'
```

> **Piège d'examen.** Une limite d'autorisations qui autorise `s3:*` ne donne aucun accès S3 : la politique basée sur l'identité doit aussi l'accorder. À l'inverse, attacher `AdministratorAccess` à un rôle dont la limite n'autorise que DynamoDB ne donne accès qu'à DynamoDB.

<!-- section: authorization-failures | objectives: 4.2.4 -->
## Analyse des échecs d'autorisation

Les messages de refus d'accès nomment le type de politique responsable :

| Le message se termine par | Signification |
| --- | --- |
| « with an explicit deny in a service control policy » | Un `Deny` de SCP correspond ; corriger la SCP ou la requête, pas la politique IAM |
| « with an explicit deny in a resource control policy » | Une RCP du compte de la ressource a refusé |
| « because no identity-based policy allows the ... action » | Refus implicite : ajouter une autorisation à la politique de l'appelant |
| « because no permissions boundary allows the ... action » | La limite d'autorisations ne contient pas l'action |
| « because no session policy allows the ... action » | La session a été réduite à sa création |
| « with an explicit deny in a VPC endpoint policy » | La requête est passée par un point de terminaison dont la politique la refuse |
| « because no resource-based policy allows the ... action » | Appel entre comptes sans politique de ressource correspondante |

Quand plusieurs types de politiques refusent, le message n'en nomme qu'un. Certains services (par exemple EC2) renvoient un **message d'autorisation encodé** : décodez-le avec `aws sts decode-authorization-message` (nécessite `sts:DecodeAuthorizationMessage`) pour voir les instructions correspondantes et le contexte.

Le **simulateur de politiques IAM** (IAM Policy Simulator) évalue les politiques basées sur l'identité, une limite d'autorisations, les SCP (quand le compte fait partie d'une organisation, décision seulement) et les politiques basées sur les ressources que vous fournissez, sans appeler le service. Il n'évalue **pas** les RCP, et ses résultats peuvent différer pour les politiques de point de terminaison de VPC, le chaînage de rôles et plusieurs politiques basées sur les ressources ; les clés de contexte autres que les clés de principal et d'organisation doivent être saisies à la main.

La **validation de politiques d'IAM Access Analyzer** signale les erreurs, les avertissements de sécurité (par exemple `iam:PassRole` avec `*`), les avertissements généraux et les suggestions pendant l'édition, et les **vérifications de politiques personnalisées** (`check-no-new-access`, `check-access-not-granted`, `check-no-public-access`) bloquent les modifications risquées dans les pipelines CI/CD.

Causes courantes à vérifier dans l'ordre : refus explicites (SCP, RCP, limite, politique de point de terminaison), autorisation manquante d'un côté d'un appel entre comptes, politique de clé KMS pour les objets chiffrés, S3 Block Public Access ou paramètres « propriétaire du compartiment appliqué » (bucket owner enforced), conditions qui échouent (`aws:SourceVpce` erroné, balise absente, MFA absente), mauvaise Région ou mauvais ARN de ressource.

> **Piège d'examen.** Un rôle du compte A peut lire un compartiment du compte B (la politique de compartiment l'autorise) mais reçoit `AccessDenied` sur les objets chiffrés avec une clé KMS gérée par le client dans le compte B. La politique de clé dans B doit autoriser le rôle, et le rôle a besoin de `kms:Decrypt` dans sa propre politique.

<!-- section: unintended-access | objectives: 4.2.5 -->
## Examen et correction des accès non souhaités

Les analyseurs **IAM Access Analyzer** sont régionaux, avec une zone de confiance qui est un compte ou l'organisation (depuis le compte de gestion ou un administrateur délégué) :

| Analyseur | Trouve | Ressources | Facturation |
| --- | --- | --- | --- |
| Accès externe | Les ressources partagées avec des principaux extérieurs à la zone de confiance (publiques ou entre comptes), prouvées par raisonnement automatisé | Compartiments S3 et compartiments de répertoire, rôles IAM, clés KMS, Lambda, SQS, SNS, Secrets Manager, EBS, instantanés RDS et de cluster, ECR, EFS, tables et flux DynamoDB | Gratuit |
| Accès interne | Les principaux de l'organisation ou du compte qui peuvent atteindre des ressources critiques choisies | Compartiments S3 et compartiments de répertoire, instantanés RDS, tables et flux DynamoDB | Par ressource surveillée |
| Accès inutilisé | Rôles, clés d'accès et mots de passe inutilisés, et services et actions inutilisés des rôles et utilisateurs actifs, sur une période de suivi | Utilisateurs et rôles IAM | Par rôle ou utilisateur analysé |

L'analyse s'exécute dans les 30 minutes environ qui suivent une modification de politique ; une **nouvelle analyse** (Rescan, `StartResourceScan`) confirme une correction. Les résultats sont **actifs** (Active), **archivés** (Archived : accès voulu, souvent via des **règles d'archivage** comme « compte partenaire approuvé 777788889999 ») ou **résolus** (Resolved : accès supprimé).

Démarche pour une autorisation non souhaitée :

1. Détecter : résultats d'Access Analyzer, envoyés à EventBridge et à Security Hub CSPM ou au nouveau Security Hub ; informations de dernier accès IAM ; CloudTrail.
2. Décider : voulu (règle d'archivage avec une raison documentée) ou non.
3. Contenir et corriger : supprimer l'instruction ou le principal, activer S3 Block Public Access, supprimer les rôles et clés d'accès inutilisés, remplacer les caractères génériques en ligne par des politiques générées ; en cas de compromission active, révoquer d'abord les sessions de rôle.
4. Vérifier : nouvelle analyse, nouvelle exécution du simulateur ou des vérifications de politiques personnalisées.
5. Prévenir : SCP et RCP pour le périmètre de données, limites d'autorisations pour l'administration déléguée, vérifications de politiques personnalisées dans les pipelines.

```bash
aws accessanalyzer check-no-public-access \
  --policy-document file://bucket-policy.json \
  --resource-type AWS::S3::Bucket
```

> **Conseil d'examen.** « Trouver quels compartiments S3 sont partagés avec des comptes extérieurs à l'organisation » est un analyseur d'accès externe avec l'organisation comme zone de confiance. « Trouver quels rôles de l'organisation peuvent lire ce compartiment sensible » est un analyseur d'accès interne. « Trouver les autorisations accordées mais inutilisées depuis 90 jours » est un analyseur d'accès inutilisé.

<!-- section: key-points -->
## Points clés

- Verified Permissions : Cedar, magasins de politiques, schémas, modèles, sources d'identités Cognito ou OIDC, refus par défaut, `forbid` l'emporte.
- Entre comptes : politique de ressource plus autorisation de l'appelant, ou approbation du rôle plus `sts:AssumeRole` ; ID externe pour les tiers ; `aws:SourceArn` pour les principaux de service.
- ABAC : `aws:PrincipalTag` comparé à `aws:ResourceTag`, `aws:RequestTag` et `aws:TagKeys` à la création, refus des modifications des balises d'autorisation.
- Évaluation : refus explicite, plafonds des SCP et RCP, une autorisation du bon côté, intersection avec les limites d'autorisations et les politiques de session ; les politiques de clé KMS doivent autoriser.
- Les messages d'erreur nomment le type de politique ; décoder les messages encodés avec STS ; le simulateur ignore les RCP.
- Access Analyzer : analyseurs d'accès externe (gratuit), interne et inutilisé, validation de politiques, vérifications personnalisées, génération de politiques ; archiver les résultats voulus, relancer l'analyse après correction.
