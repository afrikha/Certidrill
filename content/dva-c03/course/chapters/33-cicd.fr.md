Les questions de déploiement demandent la méthode de packaging, le paramètre de modèle ou d'appspec, la fonctionnalité de pipeline, la stratégie de déploiement ou le mécanisme de restauration (rollback) qui répond à une exigence comme « sans interruption », « basculer d'abord 10 % du trafic » ou « revenir en arrière automatiquement quand les erreurs augmentent ». La conception de l'architecture du pipeline elle-même est hors périmètre.

<!-- section: lambda-packaging | objectives: 3.3.1 -->
## Packages de déploiement Lambda : archives .zip, images de conteneur et couches

| | Archive .zip | Image de conteneur | Couche (layer) |
| --- | --- | --- | --- |
| Limite de taille | 50 Mo compressés pour un chargement direct (au-delà, via Amazon S3) ; 250 Mo décompressés, couches comprises | Image de 10 Go non compressée | Compte dans la limite de 250 Mo décompressés |
| Emplacement | Chargée dans Lambda ou lue depuis un compartiment S3 | Un référentiel Amazon ECR | Une couche versionnée (`LayerVersion` immuable) |
| Environnement d'exécution | Un environnement d'exécution géré ou personnalisé | Une image de base AWS, ou toute image avec le client d'interface d'exécution (runtime interface client) | Extraite sous `/opt` pour les fonctions .zip |
| À choisir quand | Code léger, itération la plus rapide, correctifs gérés de l'environnement d'exécution | Grosses dépendances (bibliothèques de ML), outillage et analyse de conteneurs existants | Plusieurs fonctions .zip partagent des bibliothèques, un environnement d'exécution personnalisé ou une extension |

Une fonction peut utiliser jusqu'à **5 couches** ; elles gardent le package léger, ce qui accélère le déploiement des modifications de code seul. Une couche doit correspondre à l'environnement d'exécution et à l'architecture de la fonction (x86_64 ou arm64).

```bash
aws lambda publish-layer-version --layer-name shared-libs \
  --zip-file fileb://layer.zip --compatible-runtimes python3.12 --compatible-architectures arm64
aws lambda update-function-configuration --function-name orders \
  --layers arn:aws:lambda:eu-west-1:111122223333:layer:shared-libs:4
aws lambda update-function-code --function-name thumbnails \
  --image-uri 111122223333.dkr.ecr.eu-west-1.amazonaws.com/thumbnails:1.4.0
```

> **Piège d'examen.** Les fonctions à image de conteneur ne prennent pas en charge les couches : mettez toutes les dépendances dans l'image. « Le package dépasse 250 Mo décompressés » se résout avec une image de conteneur, pas avec davantage de couches (elles comptent dans la même limite). « Le chargement échoue à 50 Mo » se résout en chargeant d'abord le .zip dans S3.

<!-- section: containers | objectives: 3.3.2 -->
## Déployer des conteneurs avec Amazon ECS, Amazon EKS et AWS Fargate

Une **définition de tâche ECS** est un document JSON versionné (`family:revision` ; chaque enregistrement crée une nouvelle révision immuable) qui décrit les conteneurs : image, CPU, mémoire, ports, variables d'environnement, secrets, configuration des journaux et vérification de l'état. Déployer du nouveau code consiste à enregistrer une nouvelle révision et à mettre à jour le service pour qu'il l'utilise.

```json
{
  "family": "orders-api",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::111122223333:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::111122223333:role/orders-api-task",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:1.4.0",
      "portMappings": [{ "containerPort": 8080 }],
      "secrets": [{ "name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:eu-west-1:111122223333:secret:orders-db" }],
      "logConfiguration": { "logDriver": "awslogs", "options": { "awslogs-group": "/ecs/orders-api", "awslogs-region": "eu-west-1", "awslogs-stream-prefix": "api" } }
    }
  ]
}
```

- **Rôle d'exécution de tâche** (task execution role) : utilisé par l'agent ECS pour extraire l'image d'ECR, récupérer les secrets et écrire les journaux. **Rôle de tâche** (task role) : utilisé par le code de l'application pour appeler les API AWS.
- **Fargate** exige le mode réseau `awsvpc` et des valeurs `cpu` et `memory` au niveau de la tâche.

Les types de déploiement ECS sont la **mise à jour propagée** (rolling update), le **bleu/vert** (blue/green) et le déploiement **externe** ; le contrôleur de déploiement ECS propose aussi des stratégies **linéaire** et **canary** intégrées, et les services peuvent toujours utiliser le contrôleur CodeDeploy pour le bleu/vert. Une mise à jour propagée est bornée par deux valeurs du service :

| Paramètre | Signification | Exemple (nombre souhaité 4) |
| --- | --- | --- |
| `minimumHealthyPercent` | Limite basse des tâches en cours d'exécution et saines pendant le déploiement (arrondie au supérieur) | 50 : deux anciennes tâches peuvent s'arrêter avant que les nouvelles démarrent |
| `maximumPercent` | Limite haute des tâches en cours d'exécution (arrondie à l'inférieur) | 200 : quatre nouvelles tâches peuvent démarrer avant l'arrêt des anciennes |

Le **disjoncteur de déploiement** (deployment circuit breaker : les tâches n'atteignent jamais un état stable) et les **alarmes CloudWatch** (des métriques franchissent un seuil) arrêtent un déploiement et peuvent revenir à la dernière révision réussie. Le bleu/vert ECS exécute la révision verte à côté de la bleue, exécute des **hooks de cycle de vie** Lambda ou de pause, et garde la bleue pendant un **temps de stabilisation** (bake time) pour une restauration instantanée.

Sur **Amazon EKS**, un manifeste Kubernetes `Deployment` déclare l'image et la mise à jour propagée ; `kubectl apply -f` le déploie, `kubectl rollout status` le suit et `kubectl rollout undo` revient au ReplicaSet précédent.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
        - name: api
          image: 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:1.4.0
          ports:
            - containerPort: 8080
```

> **Piège d'examen.** Un `AccessDenied` au démarrage de la tâche, lors de l'extraction de l'image ou de la lecture d'un secret, relève du rôle d'**exécution** ; un `AccessDenied` quand l'application appelle DynamoDB relève du rôle de **tâche**. Une mise à jour propagée avec `minimumHealthyPercent` à 100 et `maximumPercent` à 100 ne peut ni démarrer ni arrêter de tâche et reste bloquée.

<!-- section: iac-templates | objectives: 3.3.3 -->
## Infrastructure en tant que code avec CloudFormation, AWS SAM et AWS CDK

Un modèle CloudFormation a une seule section obligatoire, `Resources`, et des sections facultatives `Parameters`, `Mappings`, `Conditions`, `Outputs` et `Transform`. Les fonctions intrinsèques relient les ressources : `!Ref` (nom ou ID), `!GetAtt` (un attribut comme un ARN), `!Sub` (substitution de chaîne), `!ImportValue` (une sortie exportée par une autre pile). À retenir :

- Les **jeux de modifications** (change sets) prévisualisent une mise à jour ; les **piles imbriquées** (nested stacks) réutilisent des modèles dans une pile parente ; les **références entre piles** (`Export` puis `!ImportValue`) partagent des valeurs entre piles indépendantes, et une valeur exportée ne peut pas être supprimée tant qu'elle est importée.
- `DeletionPolicy: Retain` ou `Snapshot` conserve les données quand une ressource ou la pile est supprimée.
- `aws cloudformation package` charge le code local dans S3 et réécrit les chemins ; `aws cloudformation deploy` crée et exécute un jeu de modifications.

AWS SAM est une extension de CloudFormation déclarée par `Transform: AWS::Serverless-2016-10-31`. Des types de ressources abrégés (`AWS::Serverless::Function`, `Api`, `HttpApi`, `SimpleTable`, `LayerVersion`, `StateMachine`) se développent en CloudFormation complet, `Globals` définit des propriétés partagées, et les modèles de politiques (`DynamoDBCrudPolicy`, `SQSPollerPolicy`) accordent des autorisations de moindre privilège.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: python3.12
    Timeout: 30
Resources:
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: src/
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
      Events:
        CreateOrder:
          Type: Api
          Properties:
            Path: /orders
            Method: post
  OrdersTable:
    Type: AWS::Serverless::SimpleTable
Outputs:
  OrdersTableName:
    Value: !Ref OrdersTable
    Export:
      Name: orders-table-name
```

`sam build` puis `sam deploy --guided` (qui enregistre les réponses dans `samconfig.toml`) déploie via CloudFormation. Avec l'**AWS CDK**, `cdk bootstrap` prépare une fois chaque compte et chaque Région (la pile `CDKToolkit`, avec un compartiment S3 et un référentiel ECR pour les ressources), `cdk synth` produit le modèle, `cdk diff` le compare à la pile déployée et `cdk deploy` le déploie.

> **Conseil d'examen.** « Déployer le même modèle dans plusieurs environnements » désigne des paramètres (ou des environnements `samconfig.toml` de SAM) et une pile par environnement, pas des modèles copiés. « `cdk deploy` échoue car les ressources n'ont nulle part où aller dans un nouveau compte » désigne l'exécution de `cdk bootstrap`.

<!-- section: codedeploy | objectives: 3.3.4 -->
## Déployer des révisions avec AWS CodeDeploy

CodeDeploy déploie une **révision** d'application vers un **groupe de déploiement** sur l'une de trois plateformes de calcul. Le fichier `appspec.yml` (ou JSON) décrit la révision :

| Plateforme | Contenu de l'appspec | Hooks de cycle de vie que vous implémentez |
| --- | --- | --- |
| EC2/sur site | `files` (source vers destination), `permissions`, `hooks` qui exécutent des scripts | `ApplicationStop`, `BeforeInstall`, `AfterInstall`, `ApplicationStart`, `ValidateService` (plus des hooks de trafic derrière un équilibreur de charge) |
| AWS Lambda | La fonction, l'alias, `CurrentVersion` et `TargetVersion` | `BeforeAllowTraffic`, `AfterAllowTraffic` (fonctions Lambda de validation) |
| Amazon ECS | ARN de la définition de tâche, nom et port du conteneur | `BeforeInstall`, `AfterInstall`, `AfterAllowTestTraffic`, `BeforeAllowTraffic`, `AfterAllowTraffic` (fonctions Lambda) |

L'ordre EC2/sur site est `ApplicationStop` → `DownloadBundle` → `BeforeInstall` → `Install` → `AfterInstall` → `ApplicationStart` → `ValidateService` ; `DownloadBundle` et `Install` sont réservés à l'agent CodeDeploy.

```yaml
version: 0.0
os: linux
files:
  - source: /build
    destination: /var/www/orders
hooks:
  ApplicationStop:
    - location: scripts/stop.sh
      timeout: 60
  AfterInstall:
    - location: scripts/install_dependencies.sh
      timeout: 300
      runas: root
  ApplicationStart:
    - location: scripts/start.sh
  ValidateService:
    - location: scripts/health_check.sh
      timeout: 120
```

- Les cibles EC2 et sur site exigent l'**agent CodeDeploy** en cours d'exécution, et un profil d'instance (ou des informations d'identification IAM sur site) capable de lire la révision dans S3.
- Un groupe de déploiement sélectionne les cibles par balises ou groupes Auto Scaling.
- Un script de hook expire par défaut au bout de 3 600 secondes ; un hook Lambda de validation doit signaler sa réussite ou son échec à CodeDeploy (`PutLifecycleEventHookExecutionStatus`) dans un délai d'une heure.
- Configurations prédéfinies : `CodeDeployDefault.OneAtATime` (par défaut), `HalfAtATime`, `AllAtOnce` pour EC2 ; `LambdaCanary10Percent5Minutes`, `LambdaLinear10PercentEvery1Minute`, `LambdaAllAtOnce` et leurs variantes pour Lambda ; `ECSCanary10Percent5Minutes`, `ECSLinear10PercentEvery1Minutes`, `ECSAllAtOnce` et leurs variantes pour ECS.

<!-- section: codepipeline | objectives: 3.3.5 -->
## Orchestrer des pipelines avec AWS CodePipeline

Un pipeline est une suite d'**étapes** (Source, Build, Test, Deploy) composées d'**actions** ; les actions se transmettent des **artefacts** via un magasin d'artefacts S3. Les fournisseurs de source comprennent AWS CodeCommit, les connexions (AWS CodeConnections) à GitHub, GitLab et Bitbucket, Amazon S3 et Amazon ECR. Les actions de build et de test exécutent généralement AWS CodeBuild avec un `buildspec.yml`.

Les pipelines V2 ajoutent des fonctionnalités absentes de V1 :

| Fonctionnalité V2 | Usage |
| --- | --- |
| Déclencheurs avec filtres | Démarrer seulement sur un push vers certaines branches, sur des balises Git, sur des chemins de fichiers modifiés ou sur des événements de demande d'extraction (ouverte, mise à jour, fermée) |
| Variables au niveau du pipeline | Transmettre des valeurs (environnement cible, version) au démarrage de l'exécution |
| Modes d'exécution QUEUED et PARALLEL | QUEUED : les exécutions attendent dans l'ordre ; PARALLEL : exécutions indépendantes (branches de fonctionnalité). SUPERSEDED, le mode par défaut, laisse une exécution plus récente dépasser une exécution en attente |
| Conditions d'étape et restauration | Conditions d'entrée et d'échec sur les étapes ; restaurer une étape à la dernière exécution réussie (pas en mode PARALLEL) |

```json
{
  "triggers": [
    {
      "providerType": "CodeStarSourceConnection",
      "gitConfiguration": {
        "sourceActionName": "Source",
        "push": [{ "tags": { "includes": ["v*"] } }]
      }
    }
  ]
}
```

**Progression entre environnements** : une livraison typique exécute le build, déploie en test, exécute les tests automatisés, attend une action d'**approbation manuelle** (les approbateurs sont prévenus par Amazon SNS et approuvent dans la console ou avec l'API `PutApprovalResult` ; une approbation sans réponse au bout de 7 jours échoue), puis déploie en production. Les actions de déploiement peuvent s'exécuter dans d'autres Régions (actions entre Régions) et dans d'autres comptes en y assumant un rôle.

> **Piège d'examen.** « Démarrer le pipeline de production seulement quand une balise de version est poussée, pas à chaque commit » désigne un pipeline V2 avec un filtre de déclencheur sur les balises Git. Une action d'approbation manuelle met le pipeline en pause ; elle ne déploie rien elle-même.

<!-- section: source-control | objectives: 3.3.8 -->
## Branches et balises du contrôle de code source pour les versions et les livraisons

| Fonctionnalité Git | Usage dans les livraisons |
| --- | --- |
| Branches | `main` pour le code prêt pour la production, des branches de fonctionnalité pour le travail en cours, des branches de livraison pour stabiliser une version |
| Demandes d'extraction | Revue et approbation avant la fusion ; les modèles de règles d'approbation CodeCommit exigent un nombre d'approbateurs |
| Balises (étiquettes) | Marquent le commit exact d'une livraison (`v1.4.0`) ; les balises annotées portent un message et un auteur |
| SHA du commit | Identifiant immuable réutilisé comme balise d'image, description de version Lambda ou nom d'artefact, pour savoir ce qui s'exécute où |

```bash
git switch -c release/1.4
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
```

AWS CodeCommit, fermé aux nouveaux clients en 2024, **a rouvert aux nouveaux clients le 25 novembre 2025** : c'est de nouveau une réponse valable, à côté de GitHub, GitLab ou Bitbucket via les connexions.

<!-- section: deployment-strategies | objectives: 3.3.6 -->
## Stratégies de déploiement : tout à la fois, propagé, bleu/vert, canary, linéaire

| Stratégie | Fonctionnement | Interruption et capacité | Restauration |
| --- | --- | --- | --- |
| Tout à la fois (sur place) | Toutes les cibles mises à jour en même temps | Courte interruption | Redéployer l'ancienne version |
| Propagé (rolling) | Lots mis à jour l'un après l'autre | Capacité réduite d'un lot | Redéployer ; versions mélangées entre-temps |
| Propagé avec lot supplémentaire | Lance d'abord un lot de plus, puis propage | Capacité complète conservée | Redéployer |
| Immuable | Nouvelles instances dans un nouveau groupe, substituées quand elles sont saines | Capacité complète, coût doublé pendant le déploiement | Résilier les nouvelles instances |
| Bleu/vert | Un nouvel environnement complet ; trafic basculé après validation | Aucune | Rebasculer le trafic |
| Canary | Une petite part (par exemple 10 %) d'abord, le reste après une attente | Aucune | Ramener le trafic vers l'ancienne version |
| Linéaire | Incréments égaux à intervalle fixe | Aucune | Ramener le trafic |

Où chacune se configure :

- **Elastic Beanstalk**, politiques de déploiement : All at once, Rolling, Rolling with additional batch, Immutable, Traffic splitting (test de type canary sur de nouvelles instances). Bleu/vert : cloner l'environnement, y déployer, puis **permuter les URL des environnements** (swap environment URLs).
- **CodeDeploy** : sur place ou bleu/vert pour EC2 ; basculement de trafic canary, linéaire ou tout à la fois pour Lambda et ECS.
- **Lambda avec SAM** : `AutoPublishAlias` plus `DeploymentPreference` (voir la section suivante).
- **API Gateway** : une **version canary** (canary release) sur une étape d'API REST envoie un pourcentage des requêtes (`percentTraffic`) vers un nouveau déploiement, avec ses propres journaux et métriques, jusqu'à sa promotion.

> **Conseil d'examen.** « Aucune interruption, capacité complète et restauration la plus rapide si la nouvelle version échoue » oriente vers le bleu/vert (ou Elastic Beanstalk immuable / traffic splitting). « Une capacité réduite est acceptable et l'option la moins chère est exigée » oriente vers le propagé. « Exposer d'abord la nouvelle version à 10 % des utilisateurs » oriente vers le canary.

<!-- section: rollback | objectives: 3.3.7 -->
## Restauration automatique et manuelle

**CloudFormation** restaure automatiquement une pile quand une création ou une mise à jour échoue. Options :

| Besoin | Paramètre |
| --- | --- |
| Garder les ressources en échec pour déboguer une création ratée | `--disable-rollback` (ou `--on-failure DO_NOTHING`) |
| Revenir en arrière quand une alarme se déclenche pendant ou juste après la mise à jour | Déclencheurs de restauration (rollback triggers) : jusqu'à 5 alarmes CloudWatch, durée de surveillance de 0 à 180 minutes |
| La restauration elle-même échoue (`UPDATE_ROLLBACK_FAILED`) | Corriger la cause, puis `continue-update-rollback`, éventuellement avec `--resources-to-skip` |
| Une première création a échoué (`ROLLBACK_COMPLETE`) | Supprimer la pile et la recréer ; elle ne peut pas être mise à jour |

**CodeDeploy** revient en arrière automatiquement quand un déploiement échoue ou quand une alarme CloudWatch du groupe de déploiement passe à `ALARM`. Une restauration est un **nouveau déploiement** de la dernière révision correcte connue, avec un nouvel ID de déploiement. Restauration manuelle : arrêter le déploiement ou redéployer la révision précédente.

**Lambda avec SAM** : CodeDeploy surveille les alarmes listées pendant le basculement du trafic et ramène l'alias vers l'ancienne version si l'une se déclenche ; les hooks `PreTraffic` et `PostTraffic` sont des fonctions de validation qui peuvent faire échouer le déploiement.

```yaml
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: src/
      AutoPublishAlias: live
      DeploymentPreference:
        Type: Canary10Percent5Minutes
        Alarms:
          - !Ref OrdersErrorsAlarm
        Hooks:
          PreTraffic: !Ref PreTrafficCheckFunction
          PostTraffic: !Ref PostTrafficCheckFunction
```

**ECS** : disjoncteur ou alarmes de déploiement avec `rollback: true`. **CodePipeline V2** : restauration d'étape, manuelle ou en condition d'échec. **Elastic Beanstalk** propagé : redéployer une version correcte connue.

> **Piège d'examen.** Le premier déploiement progressif SAM ne peut pas basculer de trafic : CodeDeploy a besoin d'une version existante. Déployez une fois avec `AutoPublishAlias`, puis ajoutez `DeploymentPreference`.

<!-- section: ai-cicd | objectives: 3.3.9 -->
## Utiliser les outils d'IA d'AWS pour les flux de travail CI/CD

| Tâche CI/CD | Outil d'IA d'AWS et utilisation |
| --- | --- |
| Provisionnement d'environnements | Kiro génère du code CDK, SAM ou CloudFormation à partir d'une spec ; le pipeline le valide quand même (cfn-lint, `cdk diff`, jeu de modifications) avant le déploiement |
| Aide à la revue et à l'approbation automatisées | Kiro CLI en mode headless (`kiro-cli chat --no-interactive`) dans une étape CodeBuild examine la modification ou résume le jeu de modifications et les rapports de test pour les approbateurs ; une fonction Lambda peut appeler un modèle dans Amazon Bedrock pour faire de même |
| Validation post-déploiement | Un hook CodeDeploy `AfterAllowTraffic` / SAM `PostTraffic`, un hook de cycle de vie ECS ou un canary CloudWatch Synthetics vérifie la livraison ; l'IA résume les résultats |
| Relier les incidents aux livraisons | AWS DevOps Agent (disponible en général depuis le 31 mars 2026) met en corrélation télémétrie, code et données de déploiement pour trouver la modification à l'origine d'un incident |

Règles appliquées par l'examen :

- Gardez une **barrière déterministe** (tests, alarmes, approbation manuelle pour la production) ; l'IA éclaire la décision.
- Une approbation automatisée n'appelle `PutApprovalResult` que depuis un rôle limité à cette action du pipeline ; les modifications sensibles de la production gardent une intervention humaine (human-in-the-loop).
- Les outils d'IA reçoivent des rôles de moindre privilège ; leurs clés viennent d'AWS Secrets Manager, jamais du buildspec.

```bash
aws codepipeline put-approval-result --pipeline-name orders-release \
  --stage-name ApproveProd --action-name ReviewChange \
  --result summary="Tests passed and change set adds 1 alarm",status=Approved \
  --token 3f6a1c2e-0000-4b2d-9e8f-EXAMPLE
```

> **Piège d'examen.** « Laisser l'agent d'IA déployer directement en production avec des informations d'identification d'administrateur pour gagner du temps » n'est jamais la réponse : limitez les autorisations de l'agent et conservez l'approbation et la restauration basée sur les alarmes.

<!-- section: key-points -->
## Points clés

- Lambda : .zip de 50 Mo en direct (S3 au-delà) et 250 Mo décompressés avec les couches ; image de conteneur de 10 Go, sans couches ; jusqu'à 5 couches par fonction.
- ECS : révisions de définition de tâche ; rôle d'exécution et rôle de tâche ; Fargate exige `awsvpc` ; mise à jour propagée bornée par `minimumHealthyPercent` et `maximumPercent` ; le disjoncteur et les alarmes restaurent ; bleu/vert, linéaire et canary natifs.
- CloudFormation : `Resources` obligatoire, jeux de modifications, exports ; SAM : transformation, `sam build` et `sam deploy --guided` ; CDK : `bootstrap`, `synth`, `diff`, `deploy`.
- Hooks d'appspec CodeDeploy par plateforme ; agent sur EC2 ; configurations prédéfinies canary, linéaire et tout à la fois ; une restauration est un nouveau déploiement.
- CodePipeline V2 : filtres de déclencheurs sur balises, branches, chemins et demandes d'extraction ; modes QUEUED et PARALLEL ; restauration d'étape ; approbation manuelle via SNS et `PutApprovalResult`.
- Les outils d'IA (Kiro, Bedrock, AWS DevOps Agent) aident au provisionnement, à la revue et à la validation ; les barrières déterministes et le moindre privilège demeurent.
