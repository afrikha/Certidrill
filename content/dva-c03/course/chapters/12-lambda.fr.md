AWS Lambda exécute votre code en réponse à des événements sans serveur à gérer, mais presque toutes les questions d'examen à son sujet tiennent à un paramètre : le réseau que rejoint la fonction, sa mémoire, son délai d'expiration ou sa simultanéité, une couche ou une extension, la destination des événements en échec, ou la façon dont une source d'événements est connectée. Ce chapitre traite de l'accès au VPC, de la configuration des fonctions, de la gestion des erreurs avec les destinations et les files d'attente de lettres mortes, et des intégrations par le code, les mappages de source d'événements et les destinations.

<!-- section: vpc-access | objectives: 1.2.1 -->
## Donner à Lambda l'accès à des ressources privées dans un VPC

Par défaut, une fonction s'exécute dans un réseau géré par Lambda, avec accès à Internet mais sans route vers votre VPC. Pour atteindre une base RDS privée, un cluster ElastiCache ou une API interne, ajoutez une **configuration VPC** : des sous-réseaux (choisissez des sous-réseaux privés dans au moins deux zones de disponibilité) et des groupes de sécurité.

```bash
aws lambda update-function-configuration --function-name orders-api \
  --vpc-config SubnetIds=subnet-0a1b2c3d,subnet-4e5f6a7b,SecurityGroupIds=sg-0123abcd
```

- Le rôle d'exécution a besoin d'autorisations pour gérer des interfaces réseau : attachez la politique gérée AWS `AWSLambdaVPCAccessExecutionRole` (elle autorise `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DescribeSubnets`, `ec2:DeleteNetworkInterface`, `ec2:AssignPrivateIpAddresses`, `ec2:UnassignPrivateIpAddresses`).
- Lambda crée une **ENI Hyperplane** par combinaison unique de sous-réseau et de groupe de sécurité, partagée par les fonctions qui ont la même combinaison. Une nouvelle fonction reste à l'état `Pending`, impossible à appeler, pendant la création de l'ENI (plusieurs minutes).
- Le groupe de sécurité de la base de données doit autoriser le trafic entrant depuis le groupe de sécurité de la fonction, sur le port de la base.
- De nombreux appels simultanés qui ouvrent des connexions peuvent épuiser la base de données : placez **RDS Proxy** entre les deux et ouvrez la connexion en dehors du gestionnaire (handler).

Une fois attachée à un VPC, la fonction n'atteint que ce que le VPC peut atteindre :

| Destination | Ce dont le VPC a besoin |
| --- | --- |
| Ressources du VPC (RDS, ElastiCache, équilibreurs de charge internes) | Seulement des règles de groupes de sécurité |
| Internet (une API tierce) | Des sous-réseaux privés avec une route `0.0.0.0/0` vers une passerelle NAT dans un sous-réseau public, dont la table de routage pointe vers une passerelle Internet |
| Services AWS sans Internet (S3, DynamoDB, Secrets Manager, SQS...) | Des points de terminaison de VPC : de passerelle pour S3 et DynamoDB, d'interface pour les autres |
| Internet en IPv6 | Des sous-réseaux double pile, l'option « Allow IPv6 traffic for dual-stack subnets », une route `::/0` vers une passerelle Internet de sortie uniquement |

> **Piège d'examen.** Attacher la fonction à un sous-réseau public ne lui donne pas accès à Internet : ses interfaces réseau ne reçoivent pas d'adresse IP publique. « La fonction expire quand elle appelle une API externe depuis qu'elle a été placée dans le VPC » se corrige avec des sous-réseaux privés routés vers une passerelle NAT, ou avec des points de terminaison de VPC quand la cible est un service AWS.

<!-- section: function-settings | objectives: 1.2.2 -->
## Mémoire, délai d'expiration, environnement d'exécution, gestionnaire et variables d'environnement

| Paramètre | Valeur par défaut | Plage et faits |
| --- | --- | --- |
| Mémoire | 128 Mo | De 128 Mo à 10 240 Mo par pas de 1 Mo ; le processeur croît avec la mémoire (un vCPU à 1 769 Mo) |
| Délai d'expiration (timeout) | 3 secondes | Jusqu'à 30 minutes sur la page actuelle des quotas Lambda (des pages plus anciennes et la FAQ indiquent encore 15 minutes ; 90 minutes pour certains appels de Lambda Managed Instances) |
| Stockage éphémère (`/tmp`) | 512 Mo | De 512 Mo à 10 240 Mo, réutilisé tant que l'environnement d'exécution reste chaud |
| Variables d'environnement | Aucune | 4 Ko au total, chiffrées au repos ; les noms réservés (`AWS_REGION`, `AWS_LAMBDA_FUNCTION_NAME`, `_HANDLER`...) ne peuvent pas être définis |
| Package de déploiement | | 50 Mo compressé pour un chargement direct (davantage par S3), 250 Mo décompressé couches comprises, 10 Go pour une image de conteneur |
| Charge utile | | 6 Mo pour la requête et la réponse d'un appel synchrone, 1 Mo pour un appel asynchrone |

L'**environnement d'exécution** (runtime) est l'environnement du langage (les versions actuelles incluent `python3.14`, `nodejs24.x`, `java25` et .NET 10) ; le **gestionnaire** (handler) nomme le point d'entrée, `fichier.fonction` en Python (`app.lambda_handler`) et `fichier.export` en Node.js (`index.handler`). Le code situé hors du gestionnaire s'exécute une fois par environnement d'exécution : créez-y les clients SDK et les connexions pour que les appels à chaud les réutilisent.

```bash
aws lambda update-function-configuration --function-name orders-api \
  --memory-size 1024 --timeout 30 \
  --environment "Variables={TABLE_NAME=Orders,LOG_LEVEL=INFO}" \
  --kms-key-arn arn:aws:kms:eu-west-3:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
```

`--environment` remplace l'ensemble des variables : incluez celles qui existent déjà. Publier une version fige ses variables et ses paramètres. Une clé gérée par le client (`--kms-key-arn`) contrôle qui peut déchiffrer les variables ; pour les mots de passe de base de données et les clés d'API, AWS recommande Secrets Manager plutôt que des variables d'environnement.

Les **couches** (layers) regroupent des bibliothèques, des environnements d'exécution personnalisés ou de la configuration partagés par plusieurs fonctions : jusqu'à cinq par fonction, extraites dans `/opt` (bibliothèques Python sous `python/`, modules Node.js sous `nodejs/node_modules/`), chaque version immuable avec son propre ARN, et uniquement pour les fonctions .zip ; une image de conteneur inclut plutôt ses dépendances. Les **extensions** s'exécutent à côté de la fonction, depuis une couche (`/opt/extensions/`), comme processus séparé (externe) ou dans le processus de l'environnement d'exécution (interne), avec des phases `Init`, `Invoke` et `Shutdown` ; elles partagent la mémoire de la fonction et leur temps d'exécution est facturé. L'**AWS Parameters and Secrets Lambda Extension** met en cache les valeurs de Parameter Store et de Secrets Manager sur `localhost:2773` (TTL jusqu'à 300 secondes, 300 par défaut) ; les requêtes portent l'en-tête `X-Aws-Parameters-Secrets-Token` avec le jeton de session, et le rôle a besoin de `ssm:GetParameter` ou `secretsmanager:GetSecretValue` plus `kms:Decrypt` pour les valeurs chiffrées.

> **Conseil d'examen.** « Augmenter le processeur disponible pour une fonction limitée par le calcul » signifie plus de mémoire : il n'existe pas de paramètre de processeur distinct. Si la durée baisse plus que le prix n'augmente, le réglage supérieur coûte aussi moins cher.

<!-- section: concurrency | objectives: 1.2.2 -->
## Les paramètres de simultanéité

La simultanéité (concurrency) est le nombre de requêtes qu'une fonction sert au même moment : requêtes par seconde en moyenne × durée moyenne en secondes (100 requêtes par seconde de 500 ms exigent 50 environnements d'exécution). Le compte dispose par défaut de 1 000 exécutions simultanées par Région (ajustable), et chaque fonction monte en charge d'au plus 1 000 environnements d'exécution toutes les 10 secondes. Au-delà de la simultanéité disponible, les appels sont limités (HTTP 429, `TooManyRequestsException`).

| Paramètre | Effet | Coût | Utilisez-le quand |
| --- | --- | --- | --- |
| Simultanéité réservée | Garantit ce nombre d'environnements à la fonction et la plafonne à ce nombre | Sans frais | Protéger une base de données ou une API en aval, ou garantir qu'une fonction critique peut toujours monter en charge ; 0 arrête tous les appels |
| Simultanéité provisionnée | Garde ce nombre d'environnements initialisés, sur une version ou un alias | Facturée tant qu'elle est configurée | Fonctions sensibles à la latence pour lesquelles les démarrages à froid sont inacceptables ; planifiez-la ou ajustez-la avec Application Auto Scaling |
| SnapStart | Restaure un instantané initialisé au lieu d'exécuter le code d'initialisation | Sans surcoût pour Java ; frais de cache et de restauration pour Python et .NET | Initialisation longue en Java 11+, Python 3.12+ ou .NET 8+, sur des versions publiées ; incompatible avec la simultanéité provisionnée |

Lambda garde toujours 100 unités non réservées pour les fonctions sans simultanéité réservée.

```bash
aws lambda put-function-concurrency --function-name orders-api --reserved-concurrent-executions 50
aws lambda put-provisioned-concurrency-config --function-name orders-api \
  --qualifier live --provisioned-concurrent-executions 20
```

> **Piège d'examen.** La simultanéité réservée ne préchauffe rien, et la simultanéité provisionnée ne plafonne rien. « Trop de connexions sur la base de données lors des pics de trafic » désigne la simultanéité réservée (ou RDS Proxy) ; « les premières requêtes après une période d'inactivité sont lentes » désigne la simultanéité provisionnée ou SnapStart.

<!-- section: errors-destinations | objectives: 1.2.3 -->
## Cycle de vie des événements, erreurs, destinations et files d'attente de lettres mortes

Qui retente un événement en échec dépend de la façon dont la fonction a été appelée :

| Appel | Nouvelles tentatives en cas d'erreur | Où peuvent aller les échecs |
| --- | --- | --- |
| Synchrone (API Gateway, `RequestResponse` du kit SDK) | Aucune par Lambda : l'appelant reçoit l'erreur et décide | Nulle part : gérez-la chez l'appelant |
| Asynchrone (S3, SNS, EventBridge, `Event`) | Deux nouvelles tentatives par défaut (de 0 à 2), espacées d'une puis de deux minutes ; les limitations et les erreurs système sont retentées jusqu'à l'âge maximal de l'événement (6 heures par défaut et au maximum) | Destination en cas d'échec ou file d'attente de lettres mortes |
| Mappage de source d'événements, SQS | Le message redevient visible après le délai de visibilité et il est reçu de nouveau | La file d'attente de lettres mortes de la file source après `maxReceiveCount` réceptions |
| Mappage de source d'événements, Kinesis ou DynamoDB Streams | Retenté jusqu'au succès ou à l'expiration de l'enregistrement par défaut, ce qui bloque la partition | Destination en cas d'échec (SQS ou SNS) avec `MaximumRetryAttempts` et `MaximumRecordAgeInSeconds` |

Les **destinations** (appels asynchrones) envoient un enregistrement d'appel, avec la requête, la réponse et les détails de l'erreur, en cas de succès ou d'échec, vers SQS, SNS, Lambda, EventBridge ou, en cas d'échec seulement, un compartiment S3. Une **file d'attente de lettres mortes** (DLQ) ne reçoit que l'événement en échec (avec les attributs `RequestID`, `ErrorCode` et `ErrorMessage`) dans une file SQS ou une rubrique SNS standard, et se configure seulement au niveau de la fonction. Ni l'une ni l'autre ne prend en charge les files ou rubriques FIFO.

```bash
aws lambda put-function-event-invoke-config --function-name resize-image \
  --maximum-retry-attempts 1 --maximum-event-age-in-seconds 3600 \
  --destination-config '{"OnSuccess":{"Destination":"arn:aws:events:eu-west-3:111122223333:event-bus/default"},"OnFailure":{"Destination":"arn:aws:sqs:eu-west-3:111122223333:resize-failures"}}'
```

Pour les lots venant de SQS, de Kinesis ou de DynamoDB Streams, activez `ReportBatchItemFailures` et renvoyez les ID des enregistrements en échec pour que seuls ceux-ci soient retentés (ID de message SQS, ou numéros de séquence des flux) :

```json
{ "batchItemFailures": [ { "itemIdentifier": "059f36b4-87a3-44ab-83d2-661975830a7d" } ] }
```

Une liste vide signifie que tout le lot a réussi ; une exception levée signifie que tout le lot a échoué. Pour les flux, `BisectBatchOnFunctionError` coupe en deux un lot en échec pour isoler l'enregistrement fautif.

> **Piège d'examen.** Une file d'attente de lettres mortes configurée sur une fonction Lambda ne capte que les appels asynchrones. Pour une fonction qui lit une file SQS, configurez la politique de redirection (DLQ et `maxReceiveCount`) sur la file source.

<!-- section: integrations | objectives: 1.2.4 -->
## Intégrer Lambda aux autres services

Les services atteignent une fonction de deux façons, et les autorisations suivent :

| Modèle | Services | Autorisation |
| --- | --- | --- |
| Le service appelle la fonction (push) | API Gateway, S3, SNS, EventBridge, Application Load Balancer | Politique basée sur une ressource sur la fonction : `lambda:InvokeFunction` pour le principal de service, limitée avec `--source-arn` et `--source-account` |
| Lambda interroge la source (mappage de source d'événements) | SQS, Kinesis Data Streams, DynamoDB Streams, Amazon MSK, Kafka autogéré, Amazon MQ | Rôle d'exécution : par exemple `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` |
| Votre code appelle un service | N'importe quelle API AWS par le kit SDK | Rôle d'exécution |

```bash
aws lambda add-permission --function-name make-thumbnail \
  --statement-id s3-uploads --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::anycompany-uploads --source-account 111122223333
```

Paramètres du mappage de source d'événements (event source mapping) :

| Paramètre | SQS | Kinesis / DynamoDB Streams |
| --- | --- | --- |
| Taille de lot | 10 par défaut ; jusqu'à 10 000 (standard) ou 10 (FIFO) | 100 par défaut ; jusqu'à 10 000 (Kinesis) ou 1 000 (DynamoDB Streams) |
| Fenêtre de traitement par lot | Jusqu'à 5 minutes (pas pour FIFO) | Jusqu'à 5 minutes |
| Mise à l'échelle | `ScalingConfig` `MaximumConcurrency` plafonne les appels simultanés ; le mode provisionné fixe un minimum et un maximum de pollers | `ParallelizationFactor` de 1 à 10 lots simultanés par partition, ordre conservé par clé |
| Démarrage | | `StartingPosition` : `TRIM_HORIZON`, `LATEST` ou `AT_TIMESTAMP` |
| Filtrage | Jusqu'à 5 filtres (10 sur demande) ; les messages SQS non retenus sont supprimés | Même syntaxe de filtre sur l'enregistrement |

Réglez le délai de visibilité SQS à au moins six fois le délai d'expiration de la fonction, pour qu'un message ne soit pas livré de nouveau pendant qu'un lot est encore en cours. Le type de vue d'un flux DynamoDB détermine ce que voit la fonction : `NEW_AND_OLD_IMAGES` pour comparer l'avant et l'après.

Un modèle AWS SAM relie les intégrations et les autorisations :

```yaml
Resources:
  # OrdersTable, OrderQueue and StreamFailures are defined in the same template
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: python3.14
      Handler: app.lambda_handler
      MemorySize: 512
      Timeout: 20
      Environment:
        Variables:
          TABLE_NAME: !Ref OrdersTable
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
      Events:
        CreateOrder:
          Type: Api
          Properties:
            Path: /orders
            Method: post
        OrderQueue:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures
        OrderChanges:
          Type: DynamoDB
          Properties:
            Stream: !GetAtt OrdersTable.StreamArn
            StartingPosition: TRIM_HORIZON
            BisectBatchOnFunctionError: true
            MaximumRetryAttempts: 3
            DestinationConfig:
              OnFailure:
                Destination: !GetAtt StreamFailures.Arn
```

> **Conseil d'examen.** « N'appeler la fonction que pour certains messages, avec le LEAST development effort » désigne le filtrage des événements sur le mappage de source d'événements, pas un `if` dans le gestionnaire : les événements écartés n'appellent pas du tout la fonction.

<!-- section: key-points -->
## Points clés

- Accès au VPC : sous-réseaux privés, groupes de sécurité, `AWSLambdaVPCAccessExecutionRole` ; Internet par une passerelle NAT, services AWS par des points de terminaison de VPC ; RDS Proxy pour les connexions.
- La mémoire fixe le processeur ; le délai d'expiration vaut 3 secondes par défaut ; les variables d'environnement font 4 Ko, sont remplacées en bloc et figées dans les versions ; les secrets vont dans Secrets Manager.
- Couches : cinq par fonction, dans `/opt`, .zip seulement ; les extensions s'exécutent à côté de la fonction ; l'extension Parameters and Secrets met les valeurs en cache.
- La simultanéité réservée plafonne et garantit ; la simultanéité provisionnée et SnapStart suppriment les démarrages à froid.
- Asynchrone : deux nouvelles tentatives, six heures, destinations (enregistrement complet, succès ou échec) ou DLQ (événement en échec seulement).
- Sources SQS : DLQ sur la file, délai de visibilité égal à six fois le délai de la fonction, réponses partielles de lot.
- Les services qui poussent ont besoin d'une politique basée sur une ressource ; les mappages de source d'événements utilisent le rôle d'exécution.
