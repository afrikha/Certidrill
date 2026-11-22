Les questions d'authentification demandent comment un composant de pipeline prouve son identité et atteint ce dont il a besoin : une tâche Glue qui ne parvient pas à se connecter à une base RDS dans un sous-réseau privé, une fonction Lambda qui a besoin d'un mot de passe de base de données, une API qui écrit dans Kinesis, un administrateur qui déploie une pile sans larges autorisations personnelles. La réponse combine les groupes de sécurité, les rôles IAM, les points de terminaison de VPC et leurs politiques, la rotation Secrets Manager et, pour l'analytique gouvernée, les domaines et projets de SageMaker Unified Studio. Ce chapitre compare aussi les services gérés et non gérés.

<!-- section: security-groups | objectives: 4.1.1 -->
## Mettre à jour les groupes de sécurité VPC

Un **groupe de sécurité** est un pare-feu virtuel avec état (stateful) placé sur une interface réseau Elastic : uniquement des règles d'autorisation, trafic de retour autorisé automatiquement, trafic sortant ouvert par défaut. La source d'une règle peut être un bloc CIDR, une liste de préfixes ou **un autre groupe de sécurité**, ce qui est la façon habituelle de dire « seule la couche ETL peut atteindre la base de données ». Les listes ACL réseau, à l'inverse, sont sans état, s'appliquent au sous-réseau et acceptent des règles de refus.

| Composant de données | Règle à ajouter |
| --- | --- |
| Tâche ou robot d'analyse (crawler) Glue avec une connexion (JDBC, ressource de VPC) | Le groupe de sécurité de la connexion a besoin d'une **règle entrante autoréférencée pour tous les ports TCP** ; sortant tout ouvert, ou une règle sortante autoréférencée plus HTTPS 443 vers la liste de préfixes du point de terminaison de passerelle S3 |
| Glue qui atteint la base de données | Entrant sur le port de la base (par exemple 5432 PostgreSQL, 3306 MySQL, 5439 Redshift) depuis le groupe de sécurité de Glue |
| Fonction Lambda dans un VPC | Son groupe de sécurité comme source dans la règle entrante de la base de données |
| Clients Amazon MSK | Entrant depuis le groupe de sécurité des clients sur le port du broker : 9092 texte clair, 9094 TLS, 9096 SASL/SCRAM, 9098 contrôle d'accès IAM |
| Amazon EMR | Groupes de sécurité gérés par EMR pour le nœud primaire et les nœuds principaux et de tâche (plus un groupe d'accès au service dans les sous-réseaux privés) ; ajoutez vos propres groupes pour des accès supplémentaires |

Glue place des interfaces réseau Elastic dans le sous-réseau de la connexion, qui a besoin d'une route vers les données et, pour S3, d'un point de terminaison de passerelle ou d'une passerelle NAT.

```bash
aws ec2 authorize-security-group-ingress --group-id sg-0glue1111 \
  --protocol tcp --port 0-65535 --source-group sg-0glue1111

aws ec2 authorize-security-group-ingress --group-id sg-0db2222 \
  --protocol tcp --port 5432 --source-group sg-0glue1111
```

> **Piège d'examen.** Une connexion Glue qui échoue avec un message sur le groupe de sécurité manque de la règle autoréférencée, pas d'une règle depuis 0.0.0.0/0. Ouvrir la base de données à Internet n'est jamais la réponse.

<!-- section: iam-identities | objectives: 4.1.2 -->
## Groupes IAM, rôles, points de terminaison et services

| Identité | Usage en ingénierie des données |
| --- | --- |
| Utilisateur IAM | Informations d'identification à long terme ; à éviter pour les personnes (préférez IAM Identity Center) et pour le code (préférez les rôles) |
| Groupe IAM | Un ensemble d'utilisateurs qui partagent des politiques ; pas un principal, ne peut pas être nommé dans une politique de ressource, ne peut pas contenir de groupes |
| Rôle IAM | Informations d'identification temporaires via AWS STS ; une **politique d'approbation** (trust policy) indique qui peut l'assumer, les politiques d'autorisation ce qu'il peut faire |
| Rôle de service | Un rôle qu'un service assume en votre nom (rôle de tâche Glue, rôle de service EMR, rôle de livraison Firehose) ; vous gérez ses politiques |
| Rôle lié à un service | Prédéfini par le service, lié à lui, avec des autorisations que vous ne pouvez pas modifier (par exemple le rôle Lake Formation utilisé pour enregistrer des emplacements S3) |

Un rôle est l'identité de chaque composant du pipeline. Sa politique d'approbation nomme le principal de service :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "glue.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```bash
aws iam create-role --role-name GlueOrdersJob \
  --assume-role-policy-document file://glue-trust.json
aws iam attach-role-policy --role-name GlueOrdersJob \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole
aws iam put-role-policy --role-name GlueOrdersJob \
  --policy-name orders-data --policy-document file://orders-s3.json
```

Les **points de terminaison de VPC** gardent le trafic vers les services AWS sur le réseau AWS, sans passerelle Internet ni NAT :

| Type de point de terminaison | Services | Remarques |
| --- | --- | --- |
| Point de terminaison de passerelle | Amazon S3, DynamoDB | Entrée dans la table de routage ; aucun coût horaire ; même Région uniquement |
| Point de terminaison d'interface (AWS PrivateLink) | Glue, Athena, Kinesis Data Streams, Data Firehose, Secrets Manager, KMS, STS, CloudWatch Logs, Redshift et bien d'autres | Interfaces réseau Elastic avec des IP privées dans vos sous-réseaux, un groupe de sécurité, un DNS privé ; coûts horaires et par Go |

> **Conseil d'examen.** « Une fonction Lambda dans un sous-réseau privé sans accès Internet doit lire un secret » désigne un point de terminaison d'interface Secrets Manager (et son groupe de sécurité qui autorise HTTPS depuis la fonction). « Des tâches Glue dans un VPC écrivent dans S3 sans passerelle NAT » désigne un point de terminaison de passerelle S3.

<!-- section: credential-rotation | objectives: 4.1.3 -->
## Créer des informations d'identification et en assurer la rotation

**AWS Secrets Manager** stocke les informations d'identification chiffrées avec KMS et en assure la rotation :

| Type de rotation | Quand |
| --- | --- |
| Rotation gérée | Le service propriétaire du secret en assure la rotation : mot de passe d'utilisateur principal géré d'Amazon RDS et d'Aurora, mot de passe administrateur géré d'Amazon Redshift |
| Rotation par fonction Lambda | Les autres secrets : utilisateurs de base de données, clés d'API ; AWS fournit des modèles pour les bases prises en charge |
| Stratégie à utilisateur unique | Un utilisateur, mot de passe changé sur place ; les clients qui détiennent l'ancien mot de passe peuvent échouer brièvement |
| Stratégie à utilisateurs alternés | Deux utilisateurs se relaient, si bien qu'une information d'identification valide existe toujours ; exige un secret de superutilisateur pour créer le clone |

Les planifications utilisent des expressions `rate()` ou `cron()`, de toutes les quatre heures à 999 jours, dans une fenêtre de rotation d'au moins une heure. Pendant la rotation, la nouvelle version porte l'étiquette `AWSPENDING`, puis devient `AWSCURRENT` ; l'ancienne devient `AWSPREVIOUS`.

```bash
aws secretsmanager create-secret --name prod/warehouse/etl_user \
  --kms-key-id alias/data-secrets \
  --secret-string file://etl-user.json

aws secretsmanager rotate-secret --secret-id prod/warehouse/etl_user \
  --rotation-lambda-arn arn:aws:lambda:eu-west-1:111122223333:function:rotate-redshift \
  --rotation-rules '{"ScheduleExpression": "rate(30 days)"}'

aws redshift create-cluster --cluster-identifier analytics \
  --node-type ra3.xlplus --number-of-nodes 2 \
  --master-username admin --manage-master-password
```

Avec `--manage-master-password`, Redshift génère le mot de passe administrateur, le stocke dans Secrets Manager et en assure la rotation tous les 30 jours par défaut ; vous ne pouvez pas passer en plus un mot de passe d'utilisateur principal. Si le cluster est en pause au moment de la rotation, celle-ci échoue et s'arrête jusqu'à un appel à `RotateSecret`.

Règles propres aux services : les secrets SASL/SCRAM d'Amazon MSK doivent avoir un nom qui commence par le préfixe `AmazonMSK_` et être chiffrés avec une clé KMS gérée par le client (pas la clé par défaut de Secrets Manager). Les connexions Glue peuvent référencer un secret au lieu de stocker un nom d'utilisateur et un mot de passe.

> **Piège d'examen.** « Assurer automatiquement la rotation du mot de passe de la base de données avec le moins de charge opérationnelle » désigne la rotation Secrets Manager (gérée quand le service la propose), pas une fonction Lambda planifiée qui met à jour une valeur Parameter Store. Mieux encore, évitez les mots de passe là où le service prend en charge l'authentification IAM.

<!-- section: roles-for-access | objectives: 4.1.4 -->
## Configurer des rôles IAM pour l'accès

| Appelant | Configuration du rôle |
| --- | --- |
| AWS Lambda | **Rôle d'exécution** approuvé pour `lambda.amazonaws.com` ; lire depuis Kinesis ou SQS par un mappage de source d'événement exige les actions de lecture dans ce rôle ; `AWSLambdaVPCAccessExecutionRole` pour l'accès au VPC |
| Amazon API Gateway | L'**autorisation IAM** (`AWS_IAM`) exige que les appelants signent leurs requêtes avec SigV4 et détiennent `execute-api:Invoke` ; pour une intégration de service AWS (par exemple `PutRecord` vers Kinesis Data Streams), API Gateway assume un **rôle d'informations d'identification** (credentials role) approuvé pour `apigateway.amazonaws.com` |
| AWS CLI | Un profil avec `role_arn` et `source_profile` assume le rôle automatiquement ; `aws configure sso` pour les utilisateurs IAM Identity Center ; `aws sts assume-role` renvoie des clés temporaires |
| AWS CloudFormation | Un **rôle de service** passé avec `--role-arn` : la pile l'utilise pour chaque opération, si bien que l'utilisateur n'a besoin que des autorisations CloudFormation et de `iam:PassRole` sur ce rôle |
| Amazon Redshift | Des rôles IAM associés au cluster ou à l'espace de noms, nommés dans `COPY`, `UNLOAD` et les schémas externes (`IAM_ROLE default` utilise le rôle par défaut) |
| Amazon EMR | Rôle de service pour EMR, profil d'instance EC2 pour les nœuds du cluster, rôles d'exécution (runtime roles) pour un accès par tâche |

```text
# ~/.aws/config
[profile pipeline-deploy]
role_arn = arn:aws:iam::111122223333:role/PipelineDeploy
source_profile = default
region = eu-west-1
```

```bash
aws cloudformation deploy --template-file pipeline.yaml \
  --stack-name orders-pipeline \
  --role-arn arn:aws:iam::111122223333:role/CfnPipelineService \
  --capabilities CAPABILITY_NAMED_IAM
```

`iam:PassRole` est l'autorisation qui permet à un utilisateur de confier un rôle à un service (une tâche Glue, une fonction Lambda, une pile CloudFormation). Limitez-la aux ARN de rôles précis et, avec la condition `iam:PassedToService`, au service prévu.

> **Piège d'examen.** Une méthode API Gateway qui écrit directement dans Kinesis échoue avec une erreur d'autorisation quand le rôle d'informations d'identification manque ou n'a pas `kinesis:PutRecord` ; les autorisations propres à l'appelant ne comptent pas pour l'appel d'intégration.

<!-- section: policies-endpoints | objectives: 4.1.5 -->
## Politiques IAM sur les rôles, les points de terminaison et les services

Les **politiques de point de terminaison** sont des politiques de ressource sur un point de terminaison de VPC : elles limitent ce qui peut être fait à travers lui, en plus de la politique d'identité. Une politique de point de terminaison de passerelle qui n'autorise que les compartiments de l'entreprise bloque l'exfiltration vers d'autres compartiments :

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::example-datalake", "arn:aws:s3:::example-datalake/*"]
    }
  ]
}
```

Côté compartiment, `aws:SourceVpce` (un point de terminaison précis) ou `aws:SourceVpc` (un VPC) dans une instruction `Deny` n'autorise que l'accès privé.

Les **S3 Access Points** donnent à chaque consommateur (une équipe, une application, un VPC) son propre nom d'hôte et sa propre politique sur un compartiment partagé. La politique du point d'accès et la politique de compartiment doivent toutes deux autoriser la requête ; la configuration recommandée délègue le compartiment aux points d'accès du compte :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "*" },
      "Action": "*",
      "Resource": ["arn:aws:s3:::example-datalake", "arn:aws:s3:::example-datalake/*"],
      "Condition": { "StringEquals": { "s3:DataAccessPointAccount": "111122223333" } }
    }
  ]
}
```

| Exigence | Choix |
| --- | --- |
| Nombreuses équipes, préfixes différents d'un même compartiment, politique de compartiment proche de sa taille maximale | Un point d'accès par équipe, chacun avec sa politique |
| Données accessibles uniquement depuis un VPC | Point d'accès avec l'origine réseau `VPC` ; SCP qui refuse `s3:CreateAccessPoint` sauf si `s3:AccessPointNetworkOrigin` vaut `VPC` |
| Limiter un point de terminaison d'interface à un secret ou à un flux | Politique de point de terminaison sur le point de terminaison PrivateLink |

<!-- section: managed-unmanaged | objectives: 4.1.6 -->
## Services gérés et services non gérés

Dans un service **géré** (ou sans serveur), AWS exploite l'infrastructure, le système d'exploitation et le moteur ; vous configurez le service et les accès. Dans un service **non géré** sur EC2, vous installez, corrigez, mettez à l'échelle et sécurisez tout ce qui se trouve au-dessus de l'hyperviseur.

| Sujet | Non géré (sur EC2) | Géré |
| --- | --- | --- |
| Exemples | Kafka, Spark, Airflow ou PostgreSQL sur EC2 | Amazon MSK, EMR Serverless ou AWS Glue, Amazon MWAA, Amazon RDS |
| Correctifs, durcissement du système d'exploitation | Vous | AWS (dans des fenêtres de maintenance que vous choisissez pour certains services) |
| Authentification | Utilisateurs du système, clés SSH, utilisateurs du moteur, Kerberos ou LDAP que vous exploitez | IAM (contrôle d'accès IAM de MSK, rôles de tâche Glue et EMR Serverless, authentification IAM de RDS), plus des utilisateurs du moteur si nécessaire |
| Réseau | Groupes de sécurité, plus tout ce qui est sur l'instance | Groupes de sécurité et points de terminaison du service |
| Informations d'identification | Stockées et renouvelées par vos scripts | Intégrations Secrets Manager, rotation gérée |
| Mise à l'échelle et disponibilité | Vous les concevez | Intégrées ou configurées |

Entre les deux se trouvent des services comme EMR sur EC2 ou MSK provisionné : AWS gère le logiciel du cluster et remplace les nœuds défaillants, mais vous choisissez la taille des instances et pouvez accéder aux nœuds.

> **Conseil d'examen.** « Le moins de charge opérationnelle » avec des exigences de sécurité désigne en général le service géré avec authentification IAM, car il supprime les informations d'identification à stocker, les correctifs du système et la distribution des clés.

<!-- section: unified-studio | objectives: 4.1.7 -->
## Domaines, unités de domaine et projets dans SageMaker Unified Studio

| Concept | Rôle |
| --- | --- |
| Domaine | Entité d'organisation de premier niveau qui relie les ressources, les utilisateurs et leurs projets ; un pour l'entreprise ou un par division |
| Unité de domaine | Subdivision du domaine par division ou par équipe ; organise les ressources et délègue l'autorité |
| Propriétaire d'unité de domaine | Reçoit l'autorité déléguée ; attribue des politiques d'autorisation aux utilisateurs, groupes et projets |
| Projet | Conteneur pour les notebooks, requêtes, tableaux de bord et flux de travail ; un contexte métier, une limite de collaboration et une **limite d'autorisations** |
| Profil de projet | Modèle composé de blueprints qui fixe les outils et ressources d'un projet (par exemple analytique SQL, toutes les capacités) |
| Blueprint | Configuration qui crée des ressources comme l'outillage, une base lakehouse, Redshift Serverless, EMR Serverless ou des flux de travail |
| Membre du projet | Utilisateur ou groupe avec une désignation : **Owner** (gère les membres, modifie ou supprime le projet) ou **Contributor** ; désignations personnalisées possibles |
| Compte associé | Un autre compte AWS lié au domaine pour que les projets utilisent ses données et ressources |

Politiques d'autorisation sur une unité de domaine :

| Attribuées à | Politiques |
| --- | --- |
| Utilisateurs et groupes | Création d'unités de domaine, création de projets, appartenance aux projets, prise de propriété d'unité de domaine, prise de propriété de projet |
| Projets | Création de glossaires, création de formulaires de métadonnées, création de types de ressources personnalisés |

Les utilisateurs se connectent au portail avec IAM Identity Center (fournisseur d'identité de l'entreprise), SAML ou des informations d'identification IAM. Le travail reste dans le projet jusqu'à sa publication dans le catalogue de données métier, où d'autres projets s'y abonnent.

> **Piège d'examen.** Une unité de domaine organise et délègue ; elle ne contient ni données ni calcul. « Laisser le responsable de l'équipe finance décider qui peut créer des projets pour la finance » désigne une unité de domaine finance, son propriétaire et une politique de création de projets sur cette unité.

<!-- section: key-points -->
## Points clés

- Les groupes de sécurité sont avec état et n'ont que des règles d'autorisation ; référencez des groupes de sécurité comme sources ; les connexions Glue exigent une règle entrante autoréférencée sur tous les ports TCP.
- Des rôles, pas des utilisateurs, pour chaque composant du pipeline ; les groupes ne sont pas des principaux ; les rôles liés à un service ne sont pas modifiables.
- Points de terminaison de passerelle pour S3 et DynamoDB ; points de terminaison d'interface (PrivateLink) pour Glue, Kinesis, Secrets Manager, KMS, STS et d'autres.
- Rotation Secrets Manager : gérée pour les mots de passe administrateur de RDS, Aurora et Redshift, par Lambda sinon ; au plus toutes les quatre heures ; les utilisateurs alternés évitent l'interruption. Secrets SCRAM de MSK : préfixe `AmazonMSK_` et clé gérée par le client.
- Rôle d'exécution Lambda, rôle d'informations d'identification API Gateway, profils CLI avec `role_arn`, rôle de service CloudFormation avec `iam:PassRole`.
- Les politiques de point de terminaison et `aws:SourceVpce` restreignent les chemins privés ; les points d'accès délèguent des politiques par consommateur avec `s3:DataAccessPointAccount`.
- Les services gérés transfèrent à AWS les correctifs et la gestion des informations d'identification, et favorisent l'authentification IAM.
- SageMaker Unified Studio : domaine, unités de domaine avec propriétaires et politiques, projets créés à partir de profils de projet et de blueprints, désignations Owner et Contributor.
