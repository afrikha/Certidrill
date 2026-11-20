Les questions de test du DVA-C03 décrivent une application sans serveur ou conteneurisée et demandent quelle commande, quel événement de test, quelle API fictive ou quel environnement permet de la tester avec le moins d'effort : valider et tester unitairement le code d'infrastructure, invoquer une fonction en local ou dans le cloud avec un événement JSON réaliste, remplacer une dépendance absente par une API fictive (mock), isoler le trafic de test avec des alias, des étapes (stages), des balises ou des branches, et automatiser la partie répétitive avec les outils d'IA d'AWS.

<!-- section: iac-tests | objectives: 3.2.1 -->
## Développer et valider des tests avec AWS SAM, AWS CDK et CloudFormation

Trois niveaux de tests s'appliquent à une application définie en infrastructure en tant que code :

| Niveau | Ce qu'il prouve | Outils AWS |
| --- | --- | --- |
| Validation du modèle | Le modèle est bien formé, ses ressources et propriétés sont valides | `sam validate --lint` (exécute cfn-lint), `aws cloudformation validate-template`, `cdk synth` |
| Tests unitaires | La logique du gestionnaire (handler) et le modèle synthétisé se comportent comme prévu, sans appel AWS | Un framework de test (pytest, Jest, JUnit) avec des clients SDK simulés ; le module `assertions` du CDK |
| Tests d'intégration et de bout en bout | Les ressources déployées fonctionnent ensemble (autorisations, événements, délais d'expiration) | `sam remote invoke`, des tests qui appellent l'API ou la fonction déployée, `sam sync --watch` pour une pile de développement |

Commandes de l'AWS SAM CLI attendues à l'examen :

| Commande | Usage |
| --- | --- |
| `sam build` | Construit les fonctions et leurs dépendances dans `.aws-sam/build` |
| `sam local invoke` | Exécute une fois une fonction dans un conteneur local qui émule l'environnement d'exécution Lambda (Docker ou un environnement de conteneurs compatible requis) |
| `sam local start-api` | Sert les routes API Gateway du modèle sur un point de terminaison HTTP local |
| `sam local start-lambda` | Expose un point de terminaison local qui émule l'API Invoke de Lambda, pour que des tests automatisés utilisant un SDK AWS appellent les fonctions locales |
| `sam remote invoke` | Invoque une fonction Lambda déployée, ou envoie vers un flux Kinesis, une file d'attente SQS ou une machine d'état Step Functions déployés |
| `sam sync --watch` | Pousse les modifications de code vers une pile de développement dans le cloud à chaque enregistrement ; pas pour la production |

```bash
sam validate --lint
sam build
sam local invoke OrdersFunction --event events/order-created.json
sam local start-api
sam remote invoke OrdersFunction --stack-name orders-dev --event-file events/order-created.json
```

**CloudFormation** : `validate-template` vérifie seulement que le modèle est un JSON ou un YAML valide à la structure correcte ; cfn-lint vérifie en plus les types de ressources, les noms et les valeurs des propriétés par rapport à la spécification des ressources. Un **jeu de modifications** (change set) montre ce qu'une mise à jour va ajouter, modifier ou remplacer avant de l'exécuter.

**AWS CDK** : le module `assertions` teste le modèle CloudFormation synthétisé à partir d'une pile, avec Jest (TypeScript, JavaScript) ou pytest (Python). Les **assertions détaillées** (fine-grained assertions) vérifient des ressources et des propriétés précises ; les **tests d'instantané** (snapshot tests) comparent le modèle entier à une référence enregistrée et détectent tout changement involontaire, mais peuvent échouer après une mise à niveau du CDK.

```python
# Python (pytest) - fine-grained assertions on a CDK stack
import aws_cdk as cdk
from aws_cdk.assertions import Template, Match
from app.orders_stack import OrdersStack

def test_orders_function():
    app = cdk.App()
    template = Template.from_stack(OrdersStack(app, "OrdersStack"))
    template.has_resource_properties("AWS::Lambda::Function", {
        "Runtime": "python3.12",
        "Timeout": 30,
    })
    template.resource_count_is("AWS::SQS::Queue", 2)
    template.has_resource_properties("AWS::SQS::Queue", {
        "RedrivePolicy": Match.object_like({"maxReceiveCount": 5}),
    })
```

`has_resource_properties` effectue une correspondance partielle : d'autres propriétés peuvent exister. `Match.object_equals` la rend stricte, `Match.absent` vérifie qu'une propriété est absente.

> **Piège d'examen.** Un `aws cloudformation validate-template` réussi ne garantit pas que le déploiement réussira : il ne vérifie ni les valeurs des propriétés, ni les quotas, ni les autorisations. « Détecter les valeurs de propriétés invalides avant le déploiement, avec le MOINS d'effort » désigne cfn-lint (`sam validate --lint`) ; « vérifier que la pile définit une file d'attente de lettres mortes » désigne une assertion détaillée du CDK, pas un test d'instantané.

<!-- section: mock-apis | objectives: 3.2.2 -->
## API fictives pour les dépendances externes

Quand une équipe front-end ou partenaire a besoin d'une API qui n'existe pas encore, ou quand les tests ne doivent pas appeler un service tiers payant ou instable, renvoyez une réponse préparée à la place du vrai back-end.

Une **intégration fictive** (mock integration) d'une API REST API Gateway renvoie une réponse générée par API Gateway lui-même, sans back-end ni fonction Lambda :

1. Créez la méthode et choisissez le type d'intégration `MOCK`.
2. Dans la **requête d'intégration**, un modèle de mappage choisit le code d'état.
3. Dans la **réponse d'intégration**, un modèle de mappage pour ce code renvoie le corps ; les réponses de méthode déclarent les codes d'état et les en-têtes.

```bash
aws apigateway put-integration --rest-api-id a1b2c3d4e5 --resource-id r2d2c3 \
  --http-method GET --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}'
```

```json
{
  "statusCode": 200,
  "orderId": "1234",
  "status": "SHIPPED"
}
```

Le modèle de requête peut contenir de la logique (Velocity Template Language) pour renvoyer 200 ou 500 selon un paramètre de chaîne de requête, ce qui permet aux tests de couvrir les chemins d'erreur. Les intégrations fictives ne sont pas faites pour de gros modèles de réponse ; utilisez une fonction Lambda si la fausse réponse exige une vraie logique. La méthode `OPTIONS` de pré-vérification CORS que crée la console est elle aussi une intégration fictive.

| Besoin | Solution |
| --- | --- |
| Une équipe front-end doit commencer avant que le back-end n'existe | Intégration fictive API Gateway sur les ressources et méthodes prévues |
| Les fausses réponses demandent du calcul ou un état | Une fonction Lambda bouchon (stub) derrière la même API |
| Les tests unitaires ne doivent pas appeler AWS | Simuler le client SDK dans le test (par exemple le `Stubber` de botocore pour boto3) |
| Remplacer plus tard le faux par le vrai back-end | Garder la même ressource, la même méthode et le même modèle ; remplacer seulement l'intégration et redéployer l'étape |

> **Conseil d'examen.** « Renvoyer une réponse d'exemple statique pour qu'une autre équipe développe sur l'API, avec le MOINS de charge opérationnelle et sans coût de calcul » désigne une intégration fictive API Gateway, pas une fonction Lambda ni un serveur bouchon sur EC2.

<!-- section: test-events | objectives: 3.2.3 -->
## Événements de test pour Lambda et API Gateway

Une fonction Lambda reçoit un événement JSON dont la forme dépend de la source. Les tests doivent utiliser exactement cette forme :

| Source | Forme de l'événement |
| --- | --- |
| API REST API Gateway, intégration de proxy Lambda | `httpMethod`, `path`, `pathParameters`, `queryStringParameters`, `headers`, `requestContext`, et `body` **sous forme de chaîne** (le JSON doit être analysé) |
| Amazon SQS | Tableau `Records` ; chaque enregistrement a `messageId`, `receiptHandle` et `body` sous forme de chaîne |
| Amazon S3 | Tableau `Records` ; `s3.bucket.name` et `s3.object.key` (encodé URL) |
| Amazon EventBridge | `source`, `detail-type` et la charge utile dans `detail` |

Moyens de créer et d'exécuter des événements de test :

| Outil | Détail |
| --- | --- |
| Événement de test **privé** de la console Lambda | Visible seulement par son créateur, aucune autorisation supplémentaire, jusqu'à 10 par fonction |
| Événement de test **partageable** de la console Lambda | Visible par les utilisateurs du même compte ; stocké comme schéma dans le registre de schémas EventBridge `lambda-testevent-schemas`, ce qui exige des autorisations EventBridge schemas |
| `sam local generate-event` | Affiche un événement d'exemple pour un service (`s3 put`, `sqs receive-message`, `apigateway aws-proxy`...), avec des options comme `--bucket` |
| `sam remote invoke --test-event-name` | Invoque la fonction déployée avec un événement de test partageable |
| `aws lambda invoke` | Invoque une fonction ou un alias déployés avec un fichier de charge utile |
| **Test** dans la console API Gateway | Appelle la méthode avec un chemin, une chaîne de requête, des en-têtes et un corps, et affiche la requête, la réponse et le journal d'exécution |

```bash
sam local generate-event s3 put --bucket uploads-dev --key photos/cat.jpg > events/s3-put.json
sam local invoke ThumbnailFunction --event events/s3-put.json

aws lambda invoke --function-name orders:dev \
  --cli-binary-format raw-in-base64-out \
  --payload file://events/order-created.json response.json
```

```json
{
  "httpMethod": "POST",
  "path": "/orders",
  "pathParameters": null,
  "queryStringParameters": { "dryRun": "true" },
  "headers": { "Content-Type": "application/json" },
  "body": "{\"customerId\": \"c-42\", \"items\": [{\"sku\": \"A1\", \"qty\": 2}]}"
}
```

> **Piège d'examen.** Avec la version 2 de l'AWS CLI, une charge utile JSON brute échoue ou est mal lue sans `--cli-binary-format raw-in-base64-out` (le format attendu par défaut est base64). Et dans un événement proxy, `body` est une chaîne : `event["body"]["customerId"]` échoue, le gestionnaire doit d'abord l'analyser.

Supprimer une fonction ne supprime pas les schémas de ses événements de test partageables ; il faut les retirer du registre de schémas.

<!-- section: test-environments | objectives: 3.2.4 -->
## Créer et configurer des environnements d'application

Chaque environnement (développement, test, préproduction, production) doit recevoir sa propre version de code et sa propre configuration sans copier toute l'application.

**Versions et alias Lambda.** Publier une version fige le code et la configuration (immuable, avec son propre ARN se terminant par `:3`) ; `$LATEST` reste modifiable. Un **alias** (`dev`, `test`, `prod`) est un pointeur nommé vers une version, utilisé par les appelants et les sources d'événements ; déplacer l'alias change la version sans modifier aucun appelant. Un **alias pondéré** (weighted alias) envoie un pourcentage du trafic vers une seconde version publiée.

```bash
aws lambda publish-version --function-name orders --description "commit 9f3c2e1"
aws lambda update-alias --function-name orders --name prod --function-version 7 \
  --routing-config '{"AdditionalVersionWeights": {"8": 0.1}}'
```

**Étapes et variables d'étape API Gateway.** Une étape (`dev`, `prod`) est un instantané de déploiement nommé, avec sa propre URL (`https://a1b2c3d4e5.execute-api.eu-west-1.amazonaws.com/prod`), ses paramètres (limitation, mise en cache, journalisation) et ses **variables d'étape** (stage variables). Faire pointer l'intégration Lambda vers un alias au moyen d'une variable d'étape permet à chaque étape d'appeler son propre alias ; chaque alias a alors besoin d'une autorisation basée sur les ressources qui permet à API Gateway de l'invoquer.

```text
arn:aws:lambda:eu-west-1:111122223333:function:orders:${stageVariables.lambdaAlias}
```

**Balises d'image de conteneur.** Balisez chaque build avec un identifiant immuable (SHA du commit Git, version sémantique) et déployez cette balise ou le condensé (digest) de l'image dans chaque environnement ; promouvez la même image du test vers la production au lieu de la reconstruire. Activez l'**immuabilité des balises** dans le référentiel Amazon ECR pour qu'une balise comme `1.4.0` ne puisse jamais être écrasée ; une balise `latest` modifiable fait diverger les environnements.

**Branches AWS Amplify.** Chaque branche Git connectée d'une application Amplify est déployée comme un environnement distinct, avec sa propre URL (par exemple `main` pour la production, `dev` pour les tests). Les **aperçus de demandes d'extraction** (pull request previews) déploient chaque demande d'extraction sur une URL d'aperçu unique et, pour les applications full-stack avec des référentiels privés, un back-end temporaire supprimé à la fermeture de la demande. Les aperçus comptent dans le quota de 50 branches par application et sont restreints sur les référentiels publics, pour des raisons de sécurité.

**Environnements AWS Copilot.** Copilot CLI regroupait les ressources partagées d'un environnement (VPC, cluster, équilibreur de charge) pour des services ECS. **AWS Copilot CLI a atteint sa fin de support le 12 juin 2026** : plus de nouvelles fonctionnalités ni de mises à jour de sécurité. Ne le choisissez jamais pour un nouveau projet ; migrez vers Amazon ECS Express Mode, les constructions L3 de l'AWS CDK (`ApplicationLoadBalancedFargateService`) ou les piles CloudFormation générées par Copilot.

| Exigence | Réponse |
| --- | --- |
| Les appelants ne doivent pas changer quand une nouvelle version de fonction passe en production | Invoquer via un alias et déplacer l'alias |
| Chaque étape d'API doit appeler une version de fonction différente | Variable d'étape dans l'ARN d'intégration + alias + autorisation d'invocation par alias |
| L'image testée doit être exactement celle déployée en production | Balises ECR immuables ou condensé d'image, promus d'un environnement à l'autre |
| Des relecteurs doivent voir chaque demande d'extraction d'une application web avant la fusion | Aperçus de demandes d'extraction Amplify |

> **Piège d'examen.** Un alias ne peut pas pointer vers `$LATEST` pour un routage pondéré, et une version publiée n'est pas modifiable : pour changer le code ou la configuration, mettez à jour `$LATEST`, publiez une nouvelle version et déplacez l'alias.

<!-- section: ai-testing | objectives: 3.2.5 -->
## Utiliser les outils d'IA d'AWS pour générer et automatiser les tests

**Kiro** est l'outil de développement agentique d'AWS (IDE et CLI), construit sur Amazon Bedrock. **Amazon Q Developer a fermé les nouvelles inscriptions le 15 mai 2026, et Kiro lui succède** : ne choisissez pas Q Developer pour une nouvelle équipe.

| Tâche de test | Fonctionnalité de Kiro |
| --- | --- |
| Générer des tests à partir des exigences | Une **spec** : `requirements.md` (récits utilisateur et critères d'acceptation), `design.md`, `tasks.md` ; les tests découlent des critères d'acceptation |
| Appliquer à chaque fois les conventions de test de l'équipe | Fichiers de **pilotage** (steering) dans `.kiro/steering/` (framework, nommage, objectif de couverture, règles de simulation) |
| Écrire ou mettre à jour les tests automatiquement quand le code change | **Hooks d'agent** dans `.kiro/hooks/` : des déclencheurs comme File Create, File Save, File Delete ou Post Task Execution exécutent une commande shell ou une invite à l'agent |
| Exécuter les tests et analyser les résultats en CI/CD sans intervention humaine | **Mode headless de Kiro CLI** : `kiro-cli chat --no-interactive` avec une clé d'API dans `KIRO_API_KEY` |

Automatisez le flux de travail répétitif dans AWS CodeBuild : exécutez les tests unitaires et de régression à chaque commit, publiez les résultats sous forme de **rapports de test** (JUnit XML, NUnit, TestNG, Cucumber JSON, Visual Studio TRX) et de **rapports de couverture de code**, et laissez l'IA résumer les échecs. Les rapports de test expirent au bout de 30 jours, sauf s'ils sont exportés vers Amazon S3.

```yaml
version: 0.2
env:
  secrets-manager:
    KIRO_API_KEY: ci/kiro:api-key
phases:
  install:
    commands:
      - pip install -r requirements-dev.txt
      - curl -fsSL https://cli.kiro.dev/install | bash
  build:
    commands:
      - pytest --junitxml=reports/junit.xml --cov=src --cov-report=xml:reports/coverage.xml
  post_build:
    commands:
      - kiro-cli chat --v3 --no-interactive --trust-tools=read_file,grep_search "Summarize the failed tests in reports/junit.xml and list the untested functions in src/"
reports:
  unit-tests:
    files:
      - junit.xml
    base-directory: reports
    file-format: JUNITXML
  coverage:
    files:
      - coverage.xml
    base-directory: reports
    file-format: COBERTURAXML
```

Bonnes pratiques que l'examen récompense :

- Les tests générés par l'IA sont du code : relisez-les, exécutez-les et gardez une barrière de réussite/échec **déterministe** (le code de sortie de l'exécution des tests), pas l'avis de l'IA.
- Stockez la clé d'API dans AWS Secrets Manager et n'accordez que les outils nécessaires (`--trust-tools=...`) plutôt que `--trust-all-tools`.
- Générez des données de test synthétiques (par exemple avec un modèle Amazon Bedrock) au lieu de copier des données de production contenant des PII.

> **Conseil d'examen.** « Générer automatiquement des tests unitaires chaque fois qu'un développeur crée un fichier source » désigne un hook d'agent Kiro avec un déclencheur File Create. « Exécuter l'analyse des tests par l'IA dans le pipeline sans session interactive » désigne le mode headless de Kiro CLI dans une étape CodeBuild.

<!-- section: key-points -->
## Points clés

- `sam validate --lint` (cfn-lint) détecte les propriétés invalides ; `validate-template` ne vérifie que la syntaxe ; les jeux de modifications prévisualisent les mises à jour.
- `sam local invoke` et `start-api` testent en local dans un conteneur ; `sam remote invoke` teste la fonction déployée ; `sam sync --watch` est réservé aux piles de développement.
- `assertions` du CDK : assertions détaillées pour des ressources précises, tests d'instantané pour les changements involontaires.
- Intégration fictive API Gateway : réponses préparées sans back-end, code d'état choisi par le modèle de mappage de la requête.
- Les événements de test suivent la forme de la source ; le `body` proxy est une chaîne ; les événements partageables résident dans le registre `lambda-testevent-schemas` ; la CLI v2 exige `--cli-binary-format raw-in-base64-out`.
- Environnements : alias et versions Lambda, étapes et variables d'étape API Gateway, balises ECR immuables, branches et aperçus de demandes d'extraction Amplify. Copilot CLI n'est plus supporté depuis le 12 juin 2026.
- Kiro (successeur d'Amazon Q Developer) : specs, pilotage, hooks d'agent, CLI headless dans CodeBuild ; les rapports de test et de couverture CodeBuild gardent la barrière déterministe.
