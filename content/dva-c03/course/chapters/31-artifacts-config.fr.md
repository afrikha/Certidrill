Avant tout déploiement, le code doit être empaqueté avec ses dépendances, construit sous forme d'artefact ou d'image de conteneur, stocké dans un référentiel, et doté de la configuration de l'environnement où il arrive. Les questions décrivent une génération qui échoue, une image qui a changé sous la même balise, une fonction qui a besoin d'une bibliothèque ou d'un package privé, ou une même base de code qui doit lire des paramètres différents en dev et en prod. Ce chapitre couvre les dépendances, les images de conteneur avec Amazon ECR, les référentiels de code, la configuration propre à chaque environnement, ainsi que les étapes (stages) et points de terminaison d'API Gateway.

<!-- section: package-dependencies | objectives: 3.1.1 -->
## Gérer les dépendances dans les packages

| Artefact | Où vont les dépendances |
| --- | --- |
| Package .zip Lambda | Dans l'archive, à côté du gestionnaire (`pip install -r requirements.txt -t package/`, `npm ci --omit=dev`) ; 50 Mo compressé pour un chargement direct (plus via S3), 250 Mo décompressé couches comprises |
| Couche (layer) Lambda | Bibliothèques partagées ou environnement d'exécution personnalisé, extraits dans `/opt` (`/opt/python`, `/opt/nodejs/node_modules`) ; jusqu'à 5 couches par fonction ; versionnées, référencées par ARN de version |
| Image de conteneur Lambda | Installées dans l'image ; jusqu'à 10 Go non compressés |
| Conteneur pour ECS ou EKS | Installées à la génération dans le Dockerfile, figées par un fichier de verrouillage |
| Elastic Beanstalk | `requirements.txt`, `package.json` ou `pom.xml` dans le bundle source ; options dans `.ebextensions/*.config` ; propriétés d'environnement pour les paramètres |
| AWS SAM | `sam build` résout le manifeste de chaque fonction et génère dans un conteneur identique à l'environnement d'exécution (`--use-container`) quand il y a des bibliothèques natives |

Les bibliothèques à code natif doivent être compilées pour la cible : Amazon Linux et l'architecture de la fonction (`x86_64` ou `arm64`).

Les **packages privés** viennent d'**AWS CodeArtifact** : un domaine contient des référentiels ; un référentiel peut avoir des référentiels en amont (upstream) et une connexion externe vers un registre public (npmjs, PyPI, Maven Central, NuGet Gallery), qui récupère et met en cache les packages publics à la demande. Les packages ne sont jamais publics.

```bash
aws codeartifact login --tool pip --domain anycompany \
  --domain-owner 111122223333 --repository shared-libs
```

La commande obtient un jeton d'autorisation (12 heures par défaut et au maximum) et configure pip, npm ou twine. L'appelant a besoin de `codeartifact:GetAuthorizationToken` et `sts:GetServiceBearerToken` ; dans CodeBuild, exécutez-la dans la phase `pre_build` avec le rôle de service.

La **configuration** reste hors du package quand elle varie selon l'environnement : variables d'environnement Lambda (4 Ko au total par fonction, chiffrées au repos, pas pour les secrets), Parameter Store, AppConfig. Les fichiers de configuration intégrés au package conviennent aux valeurs identiques partout.

> **Piège d'examen.** « Plusieurs fonctions partagent la même bibliothèque de 30 Mo et chaque déploiement la charge à nouveau » désigne une couche Lambda. Une couche ne relève pas la limite de 250 Mo décompressés : au-delà, utilisez une image de conteneur.

<!-- section: container-images | objectives: 3.1.2 -->
## Créer et gérer des images de conteneur

Un Dockerfile construit l'image ; une génération en plusieurs étapes (multi-stage) garde les compilateurs hors de l'image finale (présenté en texte) :

```text
FROM public.ecr.aws/docker/library/node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

Poussez-la vers un référentiel privé **Amazon ECR**. L'URI du registre est `aws_account_id.dkr.ecr.region.amazonaws.com` ; le jeton de connexion est valable 12 heures.

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS \
  --password-stdin 111122223333.dkr.ecr.eu-west-1.amazonaws.com
docker build -t orders-api:3f9c2a1 .
docker tag orders-api:3f9c2a1 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:3f9c2a1
docker push 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:3f9c2a1
```

Le rôle qui pousse a besoin de `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload` et `ecr:PutImage`.

| Exigence | Fonctionnalité d'ECR |
| --- | --- |
| Une balise doit toujours désigner la même image | Immuabilité des balises `IMMUTABLE` : pousser une balise existante échoue avec `ImageTagAlreadyExistsException` ; `IMMUTABLE_WITH_EXCLUSION` garde certaines balises (comme `latest`) modifiables |
| Versions traçables | Baliser avec le SHA du commit ou un numéro de version ; déployer par balise ou par condensé (`@sha256:...`), jamais par `latest` |
| Supprimer automatiquement les images anciennes ou sans balise | Politique de cycle de vie (appliquée sous 24 heures ; à prévisualiser d'abord) |
| Trouver les vulnérabilités | Analyse de base (packages du système d'exploitation, au push ou manuelle) ou analyse améliorée avec Amazon Inspector (packages du système et des langages, continue, événements vers EventBridge) |
| Images pour Graviton et x86 | Image multi-architecture (liste de manifestes) générée avec `docker buildx --platform linux/amd64,linux/arm64` |
| Utiliser des images de Docker Hub ou d'ECR Public via ECR | Règles de cache d'extraction (pull through cache) |
| Les mêmes images dans une autre Région ou un autre compte | Règles de réplication |

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Expire untagged images after 7 days",
      "selection": { "tagStatus": "untagged", "countType": "sinceImagePushed", "countUnit": "days", "countNumber": 7 },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Keep the last 20 release images",
      "selection": { "tagStatus": "tagged", "tagPrefixList": ["release-"], "countType": "imageCountMoreThan", "countNumber": 20 },
      "action": { "type": "expire" }
    }
  ]
}
```

Une fonction Lambda déployée comme image de conteneur l'extrait d'ECR ; les images de base AWS contiennent le client d'interface d'exécution (runtime interface client), les autres images de base doivent l'ajouter.

> **Piège d'examen.** « La production a récupéré une image non testée après qu'on a poussé sur la même balise » se corrige avec des balises immuables et une balise unique par génération (ou un déploiement par condensé), pas avec une politique de cycle de vie. Les règles de cycle de vie ne font que supprimer ou archiver des images.

<!-- section: code-repositories | objectives: 3.1.3 -->
## Utiliser des référentiels de code dans les environnements de déploiement

| Référentiel | Comment les services AWS l'atteignent |
| --- | --- |
| AWS CodeCommit (de nouveau ouvert aux nouveaux clients depuis le 25 novembre 2025) | IAM : informations d'identification Git HTTPS, ou `git-remote-codecommit` avec la chaîne d'informations d'identification et des rôles ; source native de CodePipeline et CodeBuild |
| GitHub, GitHub Enterprise Server, GitLab, GitLab autogéré, Bitbucket | AWS CodeConnections (anciennement CodeStar Connections) : une ressource de connexion, référencée par ARN dans CodePipeline, CodeBuild et CloudFormation, sans jeton stocké |
| Tout fournisseur Git, pour des applications front-end | AWS Amplify Hosting connecte une branche ; chaque branche connectée a sa propre génération et sa propre URL |

Une connexion créée par la CLI ou CloudFormation reste au statut `PENDING` jusqu'à ce que quelqu'un termine l'établissement de l'autorisation dans la console ; les pipelines qui l'utilisent échouent tant qu'elle n'est pas `AVAILABLE`. Les ressources créées dans l'ancien espace de noms `codestar-connections` continuent de fonctionner.

Comment les modifications déclenchent un déploiement :

| Exigence | Configuration |
| --- | --- |
| Exécuter le pipeline à chaque push sur `main` | Action source CodePipeline sur la branche (les pipelines V2 ajoutent des déclencheurs avec filtres de branche, de chemin de fichier et de balise) |
| N'exécuter qu'au push d'une balise de version | Déclencheur de pipeline V2 filtré sur les balises Git |
| Générer chaque pull request | Webhook CodeBuild avec filtres d'événements (`PULL_REQUEST_CREATED`, `PULL_REQUEST_UPDATED`) |
| Besoin de tout l'historique Git dans la génération (balises, `git describe`) | Action source réglée en clone complet au lieu du zip par défaut du dernier commit |

Gardez les secrets hors des référentiels : `.gitignore` pour les fichiers d'identifiants locaux, lecture des secrets à la génération ou à l'exécution depuis Secrets Manager ou Parameter Store, et analyse des commits à la recherche de clés.

> **Piège d'examen.** « Le pipeline avec une nouvelle connexion GitHub échoue à l'étape source » signifie en général que la connexion est encore `PENDING`. Mettre à jour la connexion dans la console règle le problème ; créer un jeton d'accès personnel dans un secret est l'approche héritée.

<!-- section: environment-config | objectives: 3.1.4 -->
## La configuration propre à chaque environnement

| Exigence | Service |
| --- | --- |
| Changer le comportement de l'application sans redéployer, avec validation, déploiement progressif et restauration automatique | AWS AppConfig |
| Paramètres en clair ou chiffrés par environnement dans une hiérarchie (`/orders/prod/db-host`) | Systems Manager Parameter Store ; lire tout un environnement avec `GetParametersByPath` |
| Identifiants qui changent par rotation | Secrets Manager |
| Fonction Lambda, URL ou paramètre différent par étape d'API | Variables d'étape d'API Gateway |
| Paramètres par version d'une fonction | Variables d'environnement Lambda, figées dans chaque version publiée ; des alias (`dev`, `prod`) pointent vers les versions |
| Valeurs au moment de la génération | `env` du buildspec CodeBuild (`variables`, `parameter-store`, `secrets-manager`) |
| Valeurs au moment du déploiement | Paramètres, mappages et références dynamiques CloudFormation ; environnements de `samconfig.toml` avec `sam deploy --config-env prod` |

**AppConfig** organise une application en environnements et profils de configuration (indicateurs de fonctionnalité ou données libres provenant du magasin hébergé, de S3, de Parameter Store, de Secrets Manager ou de CodePipeline). Un déploiement valide les données (JSON Schema ou un validateur Lambda), puis suit une stratégie de déploiement (`AppConfig.AllAtOnce`, `AppConfig.Linear50PercentEvery30Seconds`, `AppConfig.Canary10Percent20Minutes` ou la vôtre) avec un temps de stabilisation (bake time) ; une alarme CloudWatch sur l'environnement déclenche la restauration automatique. Les applications la lisent par l'AppConfig Agent ou son extension Lambda (`http://localhost:2772/applications/.../environments/.../configurations/...`, mise en cache et interrogée toutes les 45 secondes par défaut), ou avec `StartConfigurationSession` et `GetLatestConfiguration` ; `GetConfiguration` est l'API héritée.

```yaml
version: 0.2
env:
  variables:
    STAGE: prod
  parameter-store:
    DB_HOST: /orders/prod/db-host
  secrets-manager:
    DB_PASSWORD: prod/orders/db:password
phases:
  build:
    commands:
      - ./scripts/build.sh "$STAGE"
```

> **Piège d'examen.** Les variables d'environnement Lambda ne peuvent pas différer entre les alias d'une même version : elles font partie de la version. Pour donner des valeurs différentes à `dev` et `prod` à partir d'un même artefact, publiez des versions avec des variables différentes, ou lisez des chemins Parameter Store ou AppConfig nommés d'après l'alias ou l'étape.

<!-- section: api-gateway-stages | objectives: 3.1.5 -->
## Les étapes, URL et points de terminaison d'API Gateway

Une modification d'**API REST** n'atteint les clients qu'après un déploiement sur une étape ; chaque étape a sa propre URL, `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`, et ses propres paramètres : limitation (throttling), mise en cache, journalisation et traçage, variables d'étape, et paramètres canary qui envoient un pourcentage du trafic vers un nouveau déploiement. Une **API HTTP** peut utiliser l'étape `$default` avec déploiement automatique, servie à l'URL racine.

| Type de point de terminaison | Usage |
| --- | --- |
| Optimisé pour la périphérie (edge-optimized, par défaut pour les API REST) | Clients répartis dans le monde, via les points de présence CloudFront ; certificat du domaine personnalisé dans us-east-1 |
| Régional | Clients dans la même Région, ou votre propre distribution CloudFront en amont ; certificat dans la Région de l'API |
| Privé | Uniquement depuis des VPC via un point de terminaison d'interface pour `execute-api` ; exige une politique de ressource qui autorise le point de terminaison ou le VPC |

Les API HTTP sont uniquement régionales. Un **nom de domaine personnalisé** (`api.example.com`) avec un certificat ACM associe des chemins de base à des API et à des étapes (`/v1` vers l'étape `prod`), exige un enregistrement DNS qui pointe vers le nom cible du domaine, et permet de désactiver le point de terminaison `execute-api` par défaut (les appelants reçoivent alors 403).

Les variables d'étape dirigent chaque étape vers un alias Lambda :

```bash
# Integration URI: arn:aws:lambda:eu-west-1:111122223333:function:orders:${stageVariables.lambdaAlias}
aws apigateway update-stage --rest-api-id a1b2c3d4e5 --stage-name prod \
  --patch-operations op=replace,path=/variables/lambdaAlias,value=prod
aws lambda add-permission --function-name "orders:prod" \
  --statement-id apigw-prod --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-1:111122223333:a1b2c3d4e5/*/GET/orders"
```

Les variables d'étape ne peuvent pas changer le type d'intégration et ne doivent pas contenir de secrets.

> **Piège d'examen.** « La modification fonctionne dans le test de la console mais les clients ont toujours l'ancien comportement » sur une API REST signifie qu'elle n'a pas été déployée sur l'étape. Et une variable d'étape qui nomme un nouvel alias renvoie 500 tant qu'API Gateway n'a pas l'autorisation `lambda:InvokeFunction` sur cet alias.

<!-- section: key-points -->
## Points clés

- .zip Lambda : 50 Mo compressé en direct, 250 Mo décompressé avec les couches ; jusqu'à 5 couches dans `/opt` ; images de conteneur jusqu'à 10 Go ; compilez les bibliothèques natives pour Amazon Linux et la bonne architecture.
- CodeArtifact : domaines, référentiels, référentiels en amont, une connexion externe ; `aws codeartifact login`, jeton de 12 heures.
- ECR : jeton de connexion de 12 heures ; balises immuables et balises au SHA du commit ; les politiques de cycle de vie font expirer les images sans balise ou anciennes sous 24 heures ; analyse de base ou améliorée (Inspector).
- CodeCommit est de nouveau ouvert ; GitHub, GitLab et Bitbucket via CodeConnections, qui doit quitter `PENDING` ; les déclencheurs de pipeline V2 filtrent branches, chemins et balises.
- AppConfig : validateurs, stratégies de déploiement, temps de stabilisation, restauration sur alarme, agent sur le port 2772 ; hiérarchies Parameter Store avec `GetParametersByPath` ; Secrets Manager pour les identifiants en rotation.
- Les variables d'environnement Lambda appartiennent à une version, pas à un alias ; l'`env` du buildspec lit Parameter Store et Secrets Manager.
- Les API REST exigent un déploiement par étape ; les URL d'étape se terminent par le nom de l'étape ; les API HTTP proposent `$default` avec déploiement automatique.
- Optimisé pour la périphérie (par défaut), régional, privé (point de terminaison de VPC plus politique de ressource) ; domaines personnalisés avec mappages de chemins de base ; variables d'étape plus une autorisation par alias Lambda.
