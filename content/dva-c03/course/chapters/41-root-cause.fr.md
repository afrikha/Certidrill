Les questions de dépannage donnent un symptôme (un message d'erreur, une métrique qui a bougé, un déploiement en échec, une trace lente) et demandent ce qui l'a causé ou comment trouver la cause avec le moins d'effort. Vous devez reconnaître les erreurs d'intégration classiques, lire les métriques de Lambda, d'API Gateway, de SQS et de DynamoDB, interroger CloudWatch Logs, remonter d'un échec de déploiement jusqu'au journal qui l'explique, et utiliser les outils d'IA d'AWS qui analysent les erreurs pour vous.

<!-- section: debugging-defects | objectives: 4.1.1 -->
## Déboguer le code d'application et les problèmes d'intégration de services

La plupart des défauts des applications AWS sont des défauts d'intégration : autorisations, délais d'expiration, formats de charge utile, limitation (throttling) et réseau.

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| `AccessDeniedException` quand la fonction appelle DynamoDB, S3 ou SQS | Il manque l'action ou l'ARN de la ressource au **rôle d'exécution** de la fonction | Ajouter l'action sur le bon ARN au rôle d'exécution |
| S3, SNS ou EventBridge n'invoque jamais la fonction, rien dans ses journaux | La **politique basée sur les ressources** de la fonction n'autorise pas le service | `aws lambda add-permission` pour ce principal de service et l'ARN source |
| `Task timed out after 3.00 seconds` | Délai par défaut de 3 secondes, appel en aval lent, ou fonction dans un VPC sans route vers le service | Augmenter le délai d'expiration, ajouter une passerelle NAT ou un point de terminaison de VPC, régler les délais du SDK sous celui de la fonction |
| `Runtime exited` ou processus tué, Max Memory Used égal à Memory Size | Mémoire insuffisante | Augmenter le paramètre de mémoire |
| `TooManyRequestsException` (429), `Rate exceeded`, `ThrottlingException` | Limite de simultanéité ou de débit d'API atteinte | Nouvelles tentatives avec backoff exponentiel et gigue (jitter), simultanéité réservée, augmentation de quota |
| `ProvisionedThroughputExceededException` de DynamoDB | Capacité dépassée ou clé de partition chaude | Backoff (le SDK réessaie), capacité supérieure ou mode à la demande, clé à plus forte cardinalité |
| `502` d'API Gateway avec l'intégration de proxy Lambda | La fonction a renvoyé une réponse mal formée (pas de `statusCode`, `body` qui n'est pas une chaîne) ou a levé une erreur | Renvoyer `statusCode`, `headers`, et `body` sous forme de chaîne |
| `504` d'API Gateway | L'intégration a dépassé le délai d'intégration (29 secondes par défaut) | Rendre le traitement asynchrone ou plus rapide |
| `403 Missing Authentication Token` d'API Gateway | Mauvais chemin ou mauvaise étape, ou méthode non déployée | Appeler la bonne ressource et la bonne étape, redéployer l'API |
| Le navigateur bloque la réponse (CORS) | Pas d'en-tête `Access-Control-Allow-Origin` ; avec l'intégration de proxy, c'est la fonction qui doit le renvoyer | Activer CORS et renvoyer les en-têtes depuis la fonction |
| Messages SQS traités deux fois | Délai de visibilité plus court que la durée de traitement | Augmenter le délai de visibilité (au moins six fois le délai de la fonction pour Lambda), rendre le traitement idempotent |
| `KMS AccessDeniedException` à la lecture d'un objet ou d'un secret chiffré | La politique de clé ou le rôle n'accorde pas `kms:Decrypt` | Accorder `kms:Decrypt` sur cette clé |

Outils qui identifient vite le défaut :

```bash
aws sts get-caller-identity
aws sts decode-authorization-message --encoded-message "<encoded-message>"
aws lambda get-policy --function-name orders
sam local invoke OrdersFunction --event events/order.json --debug-port 5858
```

- `get-caller-identity` montre quel principal le code utilise vraiment (un mauvais profil ou rôle est une cause fréquente).
- `decode-authorization-message` décode le message encodé de certaines erreurs `UnauthorizedOperation` (EC2) pour montrer l'action refusée et le contexte de la politique.
- Le **simulateur de politiques IAM** (IAM policy simulator) vérifie si les politiques d'un principal autorisent une action sur une ressource.
- L'historique des événements **CloudTrail** (90 jours d'événements de gestion) montre l'appel d'API en échec avec son `errorCode` et l'identité appelante.
- `sam local invoke --debug-port` attache le débogueur d'un IDE à la fonction exécutée en local.

Les clients des SDK réessaient eux-mêmes après une limitation ou une erreur transitoire. Réglez-les plutôt que d'écrire des boucles :

```python
# Python (boto3)
from botocore.config import Config
import boto3

config = Config(retries={"max_attempts": 5, "mode": "adaptive"},
                connect_timeout=2, read_timeout=5)
dynamodb = boto3.client("dynamodb", config=config)
```

> **Piège d'examen.** « La fonction marche quand on l'invoque depuis la console mais les événements S3 ne la déclenchent jamais » relève de la politique basée sur les ressources (ou de la configuration de notification d'événements), pas du rôle d'exécution. « La fonction dans un sous-réseau privé expire en appelant une API AWS » relève d'un accès réseau manquant (passerelle NAT ou point de terminaison de VPC), pas d'une autorisation manquante.

<!-- section: metrics-logs-traces | objectives: 4.1.2 -->
## Interpréter les métriques, les journaux et les traces d'application

Chaque invocation Lambda se termine par une ligne **REPORT** dans CloudWatch Logs :

```text
REPORT RequestId: 3f0c7a7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b Duration: 2875.12 ms Billed Duration: 2876 ms Memory Size: 512 MB Max Memory Used: 498 MB Init Duration: 812.40 ms
```

`Init Duration` n'apparaît que lors d'un démarrage à froid ; un `Max Memory Used` proche de `Memory Size` annonce un échec par manque de mémoire ; une `Duration` proche du délai d'expiration annonce des expirations.

| Service | Métrique | Ce qu'elle indique |
| --- | --- | --- |
| Lambda | `Errors`, `Throttles`, `Duration`, `ConcurrentExecutions` | Erreurs de fonction, invocations limitées (non comptées dans `Errors`), durée d'exécution, simultanéité utilisée |
| Lambda (sources de flux) | `IteratorAge` | Âge du dernier enregistrement lu : s'il augmente, la fonction prend du retard sur le flux Kinesis ou DynamoDB |
| API Gateway | `4XXError`, `5XXError`, `Count` | Erreurs client (authentification, validation, limitation 429) ou erreurs serveur et d'intégration |
| API Gateway | `Latency` et `IntegrationLatency` | Temps total et temps du back-end ; un grand écart est du temps passé dans API Gateway (mécanisme d'autorisation, mappage) |
| Amazon SQS | `ApproximateNumberOfMessagesVisible`, `ApproximateAgeOfOldestMessage` | Arriéré et temps d'attente des messages : consommateurs trop lents ou en échec |
| DynamoDB | `ThrottledRequests`, `ReadThrottleEvents`, `WriteThrottleEvents`, `ConsumedReadCapacityUnits` | Problèmes de capacité, souvent une seule clé de partition chaude |
| Application Load Balancer | `HTTPCode_ELB_5XX_Count` et `HTTPCode_Target_5XX_Count`, `TargetResponseTime`, `UnHealthyHostCount` | Erreurs de l'équilibreur de charge lui-même ou de l'application |

Lisez les statistiques à dessein : une moyenne masque les valeurs extrêmes, donc la latence se juge en centiles (p95, p99) et les nombres d'erreurs avec `Sum`.

Dans les traces **AWS X-Ray**, une trace se compose de **segments** (un par service) et de **sous-segments** (appels en aval, requêtes SQL, blocs de code personnalisés). La carte des traces colore les nœuds selon leur état : **error** pour les réponses 4xx, **fault** pour les réponses 5xx, **throttle** pour les 429. Le sous-segment le plus long localise la dépendance lente. Les **annotations** sont des paires clé-valeur indexées sur lesquelles on peut filtrer (`annotation.customerTier = "gold"`) ; les **métadonnées** ne sont pas indexées.

> **Piège d'examen.** Une hausse de `Latency` dans API Gateway avec une `IntegrationLatency` stable désigne API Gateway (un mécanisme d'autorisation Lambda, des modèles de mappage), pas le back-end. Les limitations Lambda apparaissent dans `Throttles`, jamais dans `Errors`.

<!-- section: query-logs | objectives: 4.1.3 -->
## Interroger les journaux pour trouver les données pertinentes

**CloudWatch Logs Insights** interroge un ou plusieurs groupes de journaux de façon interactive. Le langage Logs Insights QL enchaîne des commandes avec des barres verticales :

| Commande | Usage |
| --- | --- |
| `fields` | Choisir les champs à afficher |
| `filter` | Garder les événements correspondants (`like`, `=`, `in`, expressions régulières) |
| `stats` | Agréger : `count()`, `avg()`, `max()`, `pct()`, regroupés `by` un champ ou `bin(5m)` |
| `sort`, `limit` | Trier et plafonner les résultats |
| `parse` | Extraire des champs d'un texte non structuré avec un motif glob ou une expression régulière |

Les champs découverts comprennent `@timestamp`, `@message`, `@logStream`, `@log` et, pour les lignes REPORT de Lambda, `@type`, `@requestId`, `@duration`, `@billedDuration`, `@memorySize` et `@maxMemoryUsed`. Les journaux JSON sont analysés automatiquement : leurs clés se filtrent directement.

```text
fields @timestamp, @message
| filter level = "ERROR" and service = "checkout"
| stats count(*) as errors by bin(5m)
| sort errors desc

filter @type = "REPORT"
| stats max(@maxMemoryUsed / 1000 / 1000) as maxMemoryMB, pct(@duration, 99) as p99Duration by bin(1h)

parse @message "orderId=* status=*" as orderId, status
| filter status = "FAILED"
| limit 50
```

À retenir : Logs Insights accepte aussi **OpenSearch PPL** et **OpenSearch SQL** ; il peut **générer une requête à partir d'une description en langage naturel** (Logs Insights QL) ; les requêtes expirent au bout de 60 minutes ; les résultats sont conservés 7 jours ; vous payez par Go de données de journaux analysées, donc restreignez la plage de temps et les groupes de journaux.

Autres moyens de chercher dans les journaux :

| Besoin | Outil |
| --- | --- |
| Suivre en direct les journaux d'une fonction depuis un terminal | `aws logs tail /aws/lambda/orders --follow --filter-pattern ERROR` |
| Compter des occurrences en continu et déclencher une alarme | Un **filtre de métriques** (metric filter) sur le groupe de journaux |
| Traiter les événements de journaux ailleurs en quasi temps réel | Un **filtre d'abonnement** (subscription filter) vers Lambda, Kinesis Data Streams ou Amazon Data Firehose |
| Interroger des journaux stockés dans Amazon S3 (journaux d'accès ALB, journaux CloudTrail) | Amazon Athena |
| Savoir qui a modifié une ressource et quand | L'historique des événements CloudTrail ou un journal de suivi (trail) CloudTrail |

```bash
aws logs start-query --log-group-name /aws/lambda/orders \
  --start-time 1763600000 --end-time 1763603600 \
  --query-string 'filter level = "ERROR" | stats count(*) by errorType'
aws logs get-query-results --query-id 12ab3456-12ab-123a-789e-1234567890ab
```

> **Conseil d'examen.** « Trouver les 10 requêtes les plus lentes de la dernière heure sur trois groupes de journaux, sans infrastructure supplémentaire » désigne CloudWatch Logs Insights. « Alerter quand le mot TIMEOUT apparaît plus de 5 fois en 1 minute » désigne un filtre de métriques et une alarme, pas une requête planifiée.

<!-- section: deployment-failures | objectives: 4.1.4 -->
## Dépanner les échecs de déploiement à l'aide des journaux de sortie

| Service | Où la cause est écrite | Causes fréquentes |
| --- | --- | --- |
| CloudFormation, AWS SAM, AWS CDK | Les **événements** de la pile : le premier événement `CREATE_FAILED` ou `UPDATE_FAILED` et son motif d'état | Autorisation IAM manquante, propriété invalide, nom déjà utilisé, quota atteint, ressource qui n'envoie jamais de signal |
| AWS CodeBuild | Journaux de build dans CloudWatch Logs ou S3, et détails des phases (quelle phase a échoué, avec le code de sortie) | `buildspec.yml` introuvable ou YAML invalide, commande au code de sortie non nul, rôle de service sans autorisations ECR ou S3, builds Docker sans mode privilégié |
| AWS CodeDeploy (EC2/sur site) | Détails des événements du cycle de vie dans la console ; sur l'instance, le journal de l'agent et `scripts.log` | Agent non installé ou arrêté, profil d'instance incapable de lire la révision dans S3, script de hook en échec ou qui expire |
| Amazon ECS | Événements du service et **motif d'arrêt** (stopped reason) des tâches arrêtées | `CannotPullContainerError` (rôle d'exécution, balise d'image, pas de route vers ECR), conteneur essentiel terminé, vérifications de l'état en échec qui déclenchent le disjoncteur |
| Elastic Beanstalk | Événements de l'environnement, les 100 dernières lignes ou l'archive complète des journaux, état de santé amélioré (enhanced health) | Application qui n'écoute pas sur le port attendu, hooks de plateforme en échec, URL de vérification de l'état qui renvoie des erreurs |
| CodePipeline | L'action en échec renvoie vers ses détails CodeBuild, CodeDeploy ou CloudFormation | Corriger dans le service sous-jacent, puis relancer l'étape |

Fichiers de l'agent CodeDeploy sur Amazon Linux, RHEL et Ubuntu : `/var/log/aws/codedeploy-agent/codedeploy-agent.log` (agent), `/opt/codedeploy-agent/deployment-root/deployment-logs/codedeploy-agent-deployments.log` (déploiements) et `scripts.log` dans le dossier de chaque déploiement. Envoyez-les vers CloudWatch avec l'agent CloudWatch au lieu de vous connecter à chaque instance.

```bash
aws cloudformation describe-stack-events --stack-name orders-prod \
  --query "StackEvents[?contains(ResourceStatus, 'FAILED')].[LogicalResourceId,ResourceStatusReason]" \
  --output table
aws ecs describe-tasks --cluster prod --tasks arn:aws:ecs:eu-west-1:111122223333:task/prod/8f2c1d0e \
  --query "tasks[].[stoppedReason,containers[].reason]"
```

- Une pile dont la première création a échoué est en `ROLLBACK_COMPLETE` : lisez les événements, supprimez-la, recréez-la.
- Pour inspecter les ressources d'une création en échec (par exemple le fichier `/var/log/cloud-init-output.log` de l'instance), créez la pile avec la restauration désactivée.
- Les événements suivants d'une pile en échec sont souvent des conséquences (`Resource creation cancelled`) ; le premier échec est la cause.

> **Piège d'examen.** Un déploiement CodeDeploy qui échoue dans `ApplicationStop` à chaque nouvelle révision vient souvent du script de la révision précédente, défectueuse, qui s'exécute pendant `ApplicationStop`. Redéployez avec l'option qui ignore les échecs d'`ApplicationStop`, puis corrigez le script.

<!-- section: ai-troubleshooting | objectives: 4.1.5 -->
## Utiliser les outils d'IA d'AWS pour analyser les erreurs et proposer des corrections

| Outil | Ce qu'il fait | Point de départ |
| --- | --- | --- |
| **CloudWatch investigations** | Assistant d'IA générative qui analyse la télémétrie (métriques, journaux, événements de déploiement, événements AWS Health, événements de modification CloudTrail, traces X-Ray) et propose des observations, des hypothèses et une cause racine expliquée en langage naturel, puis un rapport d'investigation | Une alarme CloudWatch, une métrique ou une requête Logs Insights |
| **Génération de requêtes Logs Insights** | Transforme une question en langage naturel en requête Logs Insights QL, expliquée ligne par ligne | L'éditeur de requêtes de Logs Insights |
| **AWS DevOps Agent** (disponible en général depuis le 31 mars 2026) | Trie les incidents en mettant en corrélation télémétrie, code et données de déploiement, puis propose un plan d'atténuation et des mesures de prévention | Une alarme ou un incident venant de vos outils d'observabilité |
| **Kiro** (IDE et CLI) | Explique une trace de pile (stack trace) ou un build en échec dans le contexte de votre code et propose une correction ; le mode headless le fait dans un pipeline | Le développeur, ou une étape de CI avec le journal sur l'entrée standard |

À retenir sur CloudWatch investigations : il utilise les autorisations de la personne qui le lance, ne crée aucune ressource, journalise ses actions dans CloudTrail, et un compte dispose d'un groupe d'investigation avec jusqu'à 2 investigations actives simultanées et jusqu'à 150 investigations enrichies par l'IA par mois.

```bash
{
  printf '%s\n\n' "Explain this build failure and suggest a fix:"
  cat build-error.log
} | kiro-cli chat --v3 --no-interactive --trust-tools=read_file
```

Traitez les suggestions de l'IA comme des **hypothèses** : confirmez-les dans les métriques, les journaux ou les traces avant de changer quoi que ce soit, et appliquez la correction par le pipeline habituel. Ne collez ni secrets ni données client dans les invites ; masquez d'abord les données sensibles dans les journaux (voir le chapitre sur l'observabilité). Amazon Q Developer, qui offrait une aide similaire, a fermé les nouvelles inscriptions le 15 mai 2026.

> **Conseil d'examen.** « Une alarme s'est déclenchée ; trouver la cause racine probable parmi les métriques, les journaux, les traces et les modifications récentes avec le MOINS d'effort » désigne le lancement d'une CloudWatch investigation depuis l'alarme. « Écrire la requête Logs Insights à partir d'une question en langage courant » désigne la génération de requêtes dans Logs Insights.

<!-- section: key-points -->
## Points clés

- `AccessDenied` depuis le code = rôle d'exécution ; un service ne peut pas invoquer la fonction = politique basée sur les ressources ; expiration dans un VPC = chemin réseau (NAT ou point de terminaison de VPC).
- API Gateway 502 = réponse de proxy mal formée, 504 = délai d'intégration dépassé, 403 Missing Authentication Token = mauvais chemin ou mauvaise étape.
- Limitation (429, `ProvisionedThroughputExceededException`) : nouvelles tentatives du SDK avec backoff, mode de nouvelle tentative adaptive, plus de capacité.
- Ligne REPORT : Duration, Max Memory Used, Init Duration lors des démarrages à froid. `Throttles` n'est pas `Errors` ; `Latency` moins `IntegrationLatency` = temps d'API Gateway ; `IteratorAge` mesure le retard sur un flux.
- X-Ray : error 4xx, fault 5xx, throttle 429 ; les annotations sont indexées, pas les métadonnées.
- Logs Insights : `fields | filter | stats | sort | limit | parse` ; aussi PPL et SQL ; génération en langage naturel ; facturé par Go analysé.
- Échecs de déploiement : premier événement de pile en échec, détails des phases CodeBuild, journal de l'agent CodeDeploy et `scripts.log`, motif d'arrêt ECS, événements et journaux Beanstalk.
- CloudWatch investigations, la génération de requêtes Logs Insights, AWS DevOps Agent et Kiro analysent les erreurs ; vérifiez leurs hypothèses avant d'agir.
