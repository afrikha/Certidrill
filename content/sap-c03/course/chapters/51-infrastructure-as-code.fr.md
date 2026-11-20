L'infrastructure en tant que code (IaC) est le moyen, pour un architecte de niveau professionnel, de garder des centaines de comptes et plusieurs Régions identiques, révisables et récupérables. Les questions SAP-C03 comparent les modèles déclaratifs au code impératif, placent les garde-fous à la bonne étape (écriture, déploiement, exécution), tiennent les secrets hors des modèles et choisissent un mécanisme pour déployer la même base de référence dans tous les comptes d'une organisation.

<!-- section: declarative-imperative | objectives: 5.1.1 -->
## Infrastructure en tant que code déclarative et impérative

**AWS CloudFormation** est déclaratif : un modèle JSON ou YAML décrit les ressources souhaitées et CloudFormation calcule les opérations de création, de mise à jour et de suppression d'une **pile (stack)**. **AWS CDK** est impératif au moment de l'écriture : du code TypeScript, Python, Java, C# ou Go avec boucles, conditions et classes, qui **synthétise** un modèle CloudFormation ; le déploiement reste une pile CloudFormation.

| Exigence | Choix |
| --- | --- |
| Modèles lisibles par les auditeurs, équipe sans compétences en programmation | CloudFormation (YAML), avec des modules ou des piles imbriquées pour la réutilisation |
| Abstractions réutilisables et testées, partagées par de nombreuses équipes | Constructions CDK (constructs) : L1 (`Cfn*`, correspondance un pour un avec CloudFormation), L2 (valeurs par défaut sensées, méthodes utilitaires), modèles L3 (plusieurs ressources reliées entre elles) |
| Prévisualiser la modification exacte avant la production | Jeux de modifications (change sets) CloudFormation ; `cdk diff` |
| Placer sous IaC des ressources créées à la main | Générateur IaC (IaC generator : modèle à partir de ressources existantes), importation de ressources dans une pile |
| Syntaxe abrégée pour une application sans serveur | Transformation AWS SAM (`AWS::Serverless`) |
| Protéger les données en cas de remplacement ou de suppression | `DeletionPolicy` et `UpdateReplacePolicy` (`Retain` ou `Snapshot`), politiques de pile (stack policies), protection contre la résiliation |
| Détecter les modifications manuelles | Détection de dérive (drift detection) sur les piles et les StackSets |

CDK exige que chaque compte et chaque Région cible soient **amorcés (bootstrapped)** (la pile `CDKToolkit` : un compartiment S3 et un référentiel ECR pour les ressources, plus des rôles de déploiement). Pour des pipelines qui déploient dans d'autres comptes, amorcez les cibles avec une approbation (trust) du compte d'outillage :

```bash
cdk bootstrap aws://444455556666/eu-west-1 \
  --trust 111122223333 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
cdk synth
cdk diff
cdk deploy --all --require-approval broadening
```

```yaml
Resources:
  OrdersTable:
    Type: AWS::DynamoDB::Table
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
```

> **Piège d'examen.** CDK n'est pas un moteur de provisionnement distinct : la dérive, les restaurations, les jeux de modifications et les quotas de piles sont ceux de CloudFormation. « Utiliser un langage généraliste ET conserver la restauration et la détection de dérive de CloudFormation » est satisfait par CDK ; restreignez la politique d'exécution au lieu de l'`AdministratorAccess` par défaut quand l'énoncé exige le moindre privilège pour les déploiements.

<!-- section: policy-as-code | objectives: 5.1.2 -->
## Politiques en tant que code : valider, appliquer, corriger

Les garde-fous fonctionnent mieux en couches, du poste du développeur au compte en production :

| Étape | Outil | Effet |
| --- | --- | --- |
| Écriture et CI | Règles AWS CloudFormation Guard exécutées sur les modèles ; `cfn-lint` ; aspects CDK | Faire échouer la build avant tout déploiement |
| Synthèse (CDK) | Les aspects visitent chaque construction pendant la phase de préparation ; une annotation d'erreur fait échouer `cdk synth` | Modifier (ajouter des balises, imposer le chiffrement) ou valider |
| Déploiement | CloudFormation Hooks | Inspecter ressources, piles, jeux de modifications ou opérations Cloud Control API avant le provisionnement ; `FAIL` arrête l'opération, `WARN` la laisse continuer avec un avertissement |
| Exécution, préventif | SCP et RCP (autorisations maximales), limites d'autorisations (permissions boundaries) | Refuser l'appel d'API, quel que soit l'outil utilisé |
| Exécution, détectif | Règles AWS Config, packs de conformité, règles d'organisation | Signaler les ressources non conformes après le déploiement |
| Correction | Correction AWS Config avec des documents Systems Manager Automation (manuelle ou automatique) ; détection de dérive des piles | Rétablir la configuration conforme |

Les **CloudFormation Hooks** ciblent `RESOURCE`, `STACK`, `CHANGE_SET` ou `CLOUD_CONTROL`, pour les actions `CREATE`, `UPDATE` ou `DELETE` (jeux de modifications : `CREATE` seulement), par des gestionnaires `preCreate`, `preUpdate` et `preDelete`. Un hook peut reposer sur des **contrôles proactifs** AWS Control Tower (sans code), des règles Guard, une fonction Lambda dans n'importe quel runtime pris en charge ou un hook personnalisé publié dans le registre CloudFormation. Démarrez les nouveaux hooks en mode `WARN` pour observer leur effet sans bloquer les piles.

AWS Control Tower regroupe les mêmes idées : contrôles **préventifs** (SCP, RCP), **détectifs** (règles Config) et **proactifs** (Hooks).

```text
# CloudFormation Guard rule: every S3 bucket must block public access
let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]

rule s3_block_public_access when %buckets !empty {
  %buckets.Properties.PublicAccessBlockConfiguration.BlockPublicAcls == true
  %buckets.Properties.PublicAccessBlockConfiguration.RestrictPublicBuckets == true
}
```

Une règle AWS Config en mode d'évaluation **proactif** peut évaluer les propriétés d'une ressource avant son déploiement, mais elle ne corrige ni ne bloque ; pour bloquer un déploiement non conforme, utilisez un Hook.

> **Piège d'examen.** Une SCP bloque l'appel d'API mais renvoie au développeur un `AccessDenied` tardif et générique au milieu d'une opération de pile ; une règle Config ne détecte qu'après coup. « Empêcher le provisionnement de ressources non conformes par CloudFormation, avec un message clair, dans tous les comptes » désigne CloudFormation Hooks (par exemple les contrôles proactifs de Control Tower), les SCP restant le dernier rempart pour les autres chemins.

<!-- section: secrets-in-iac | objectives: 5.1.3 -->
## Gérer les secrets dans le code d'infrastructure

Les secrets n'apparaissent jamais dans un modèle, un fichier de paramètres ou un dépôt Git. Options :

| Besoin | Mécanisme |
| --- | --- |
| Mot de passe principal de base de données qu'aucun humain ne voit jamais | `ManageMasterUserPassword: true` sur RDS ou Aurora : RDS génère le mot de passe, le stocke dans Secrets Manager et le fait pivoter (tous les 7 jours par défaut) ; clé gérée par le client en option |
| Un nouveau secret aléatoire créé par la pile | `AWS::SecretsManager::Secret` avec `GenerateSecretString`, puis un calendrier de rotation |
| Référencer un secret existant dans n'importe quelle propriété | `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` ; ARN complet pour un secret d'un autre compte |
| Référencer un paramètre SecureString | `{{resolve:ssm-secure:name:version}}` : seulement sur les propriétés prises en charge (mots de passe principaux RDS et Redshift, `AuthToken` ElastiCache, mot de passe de connexion d'un utilisateur IAM, mots de passe Directory Service...) |
| Configuration non secrète (ID d'AMI, ID de VPC) | `{{resolve:ssm:name}}` ou un type de paramètre SSM dans `Parameters` |
| Le même secret dans plusieurs Régions | Secrets répliqués de Secrets Manager |

Règles des références dynamiques :

- 60 au maximum par modèle ; résolues pendant les opérations sur les piles et les jeux de modifications.
- Non prises en charge pour les valeurs sécurisées dans les ressources personnalisées, ni dans les métadonnées `AWS::CloudFormation::Init` ou le `UserData` EC2 ; ne les placez pas dans les propriétés qui forment l'identifiant principal d'une ressource.
- CloudFormation ne stocke que la référence, jamais la valeur SecureString résolue.
- Modifier seulement le secret ne met pas à jour la ressource : CloudFormation lit la valeur quand la ressource est créée ou mise à jour. Utilisez des références **sans version** avec la rotation de Secrets Manager plutôt que de figer une version.

Les paramètres `NoEcho` masquent seulement les valeurs dans la console et les réponses d'API ; une valeur saisie comme paramètre transite quand même par l'outillage de déploiement. Préférez les références dynamiques. Dans CDK, lisez les secrets avec `SecretValue` ou `Secret.fromSecretNameV2` pour que le modèle synthétisé contienne une référence, pas la valeur.

```yaml
Resources:
  AppDatabase:
    Type: AWS::RDS::DBCluster
    Properties:
      Engine: aurora-postgresql
      MasterUsername: dbadmin
      ManageMasterUserPassword: true
  PartnerApiKey:
    Type: AWS::SecretsManager::Secret
    Properties:
      GenerateSecretString:
        SecretStringTemplate: '{"client":"partner-a"}'
        GenerateStringKey: apikey
        PasswordLength: 40
        ExcludePunctuation: true
```

> **Piège d'examen.** Secrets Manager fournit la rotation gérée et les réplicas inter-Régions ; le SecureString de Parameter Store n'offre ni l'une ni les autres, mais coûte moins cher pour des valeurs de configuration. « Les identifiants doivent pivoter automatiquement tous les 30 jours sans redéployer la pile » désigne Secrets Manager avec une référence dynamique sans version, pas une référence `ssm-secure`.

<!-- section: multi-account-region | objectives: 5.1.4 -->
## Déploiements multicomptes et multi-Régions avec StackSets

Un **StackSet** déploie un modèle depuis un **compte administrateur** vers des **instances de pile (stack instances)** dans des comptes et Régions cibles ; mettre à jour le StackSet met à jour chaque instance.

| | Autorisations autogérées (self-managed) | Autorisations gérées par le service (service-managed) |
| --- | --- | --- |
| Cibles | N'importe quels comptes, listés par ID | Comptes d'AWS Organizations : organisation entière ou OU (OU enfants comprises) |
| Rôles IAM | Vous créez `AWSCloudFormationStackSetAdministrationRole` dans le compte administrateur et `AWSCloudFormationStackSetExecutionRole` (nom exact) dans chaque cible | Créés par StackSets |
| Prérequis | Aucun au-delà des rôles | Toutes les fonctionnalités activées, accès approuvé (trusted access) activé |
| Nouveaux comptes | À ajouter manuellement | **Déploiement automatique** quand un compte rejoint une OU cible ou y est déplacé ; au retrait, suppression ou conservation des piles |
| Qui administre | Le compte administrateur | Le compte de gestion ou un **administrateur délégué** (`--call-as DELEGATED_ADMIN`) |

Les StackSets gérés par le service **ne déploient jamais dans le compte de gestion**, même s'il se trouve dans une OU ciblée : déployez-y avec une pile ordinaire. Les filtres de comptes affinent les cibles d'OU : `INTERSECTION` (seulement les comptes listés dans les OU), `DIFFERENCE` (tous sauf les comptes listés), `UNION` (les OU plus des comptes supplémentaires). Un administrateur délégué peut déployer dans n'importe quel compte de l'organisation ; le compte de gestion ne peut pas le limiter à certaines OU.

Les préférences d'opération pilotent le déploiement : **nombre maximal de comptes simultanés**, **tolérance aux échecs** par Région (au-delà, l'opération s'arrête), **simultanéité des Régions** séquentielle (dans l'ordre de Régions choisi) ou parallèle, et le mode de simultanéité (avec la tolérance stricte aux échecs, la simultanéité vaut au plus la tolérance aux échecs plus un).

```bash
aws cloudformation create-stack-set --stack-set-name security-baseline \
  --template-body file://baseline.yaml --capabilities CAPABILITY_NAMED_IAM \
  --permission-model SERVICE_MANAGED \
  --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false

aws cloudformation create-stack-instances --stack-set-name security-baseline \
  --deployment-targets OrganizationalUnitIds=ou-ab12-11111111 \
  --regions eu-west-1 eu-central-1 \
  --operation-preferences RegionConcurrencyType=SEQUENTIAL,MaxConcurrentPercentage=25,FailureTolerancePercentage=10
```

Autres modèles : un pipeline CDK ou CodePipeline avec des étapes entre comptes pour les piles applicatives qui exigent une promotion ordonnée (comptes de test, puis de production), et Control Tower pour la zone d'atterrissage elle-même. Supprimer des piles d'un StackSet avec l'option de **conservation des piles (retain stacks)** les laisse tourner de façon indépendante.

> **Piège d'examen.** « Chaque nouveau compte ajouté à l'OU Production doit recevoir automatiquement la base de référence de journalisation et de sécurité, sans étape manuelle » correspond à un StackSet géré par le service avec déploiement automatique ciblant l'OU. Les StackSets autogérés exigent d'abord le rôle d'exécution dans chaque compte, et rien ne se déploie de lui-même dans les comptes nouvellement créés.

<!-- section: key-points -->
## Points clés

- CloudFormation est déclaratif ; le code CDK synthétise du CloudFormation ; constructions L1, L2, L3 ; amorcez chaque compte et Région, avec `--trust` pour les pipelines entre comptes.
- Jeux de modifications et `cdk diff` pour prévisualiser ; DeletionPolicy, UpdateReplacePolicy, politiques de pile et protection contre la résiliation protègent les données ; la détection de dérive repère les modifications manuelles.
- Politiques en tant que code en couches : Guard et aspects en CI, CloudFormation Hooks au déploiement (FAIL ou WARN), SCP et RCP en dernier rempart, règles Config pour détecter, Systems Manager Automation pour corriger.
- Contrôles Control Tower : préventifs (SCP, RCP), détectifs (Config), proactifs (Hooks).
- Secrets : ManageMasterUserPassword, GenerateSecretString, références `secretsmanager` sans version, `ssm-secure` seulement sur les propriétés prises en charge, 60 références par modèle, aucune dans le UserData ni les ressources personnalisées.
- StackSets : rôles autogérés ou gestion par le service avec Organizations, déploiement automatique sur les OU, administrateur délégué, aucun déploiement dans le compte de gestion, simultanéité et tolérance aux échecs.
