Les questions de dépannage décrivent une chaîne de détection qui reste muette : une fonction sans journaux, une API dont les requêtes ne peuvent pas être tracées, une vérification de l'état qui échoue toujours, une distribution CloudFront qui n'écrit rien, un agent qui n'envoie aucune donnée, un journal de suivi ou une règle qui manque des événements. La réponse tient presque toujours à une autorisation, une politique de ressource, une Région ou un paramètre qui ne s'applique qu'aux nouvelles données. Ce chapitre donne les vérifications dans l'ordre où les mener.

<!-- section: lambda-api-logging | objectives: 1.3.1 -->
## Journalisation de Lambda et d'API Gateway

**Lambda** écrit dans CloudWatch Logs grâce à son **rôle d'exécution** : il lui faut `logs:CreateLogGroup`, `logs:CreateLogStream` et `logs:PutLogEvents` (la politique gérée `AWSLambdaBasicExecutionRole`). Sans elles, la fonction s'exécute quand même, mais aucun journal n'apparaît. Le groupe de journaux par défaut est `/aws/lambda/<function-name>`.

Les contrôles de journalisation avancés modifient ce qui parvient au groupe de journaux :

- **Format des journaux** : texte brut ou JSON. En JSON, un **niveau de journalisation de l'application** et un **niveau de journalisation du système** (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`) filtrent les événements avant leur envoi : les lignes `DEBUG` disparaissent quand le niveau est `INFO`.
- **Groupe de journaux** : un groupe personnalisé (par exemple partagé par plusieurs fonctions, avec une longue rétention) ; le rôle d'exécution doit autoriser l'écriture dans ce groupe.
- **Destination** : CloudWatch Logs par défaut, ou Amazon S3 ou Firehose via un groupe de journaux de la classe `Delivery`, qui ne conserve les événements que deux jours et ne prend pas en charge Logs Insights.

```bash
aws lambda update-function-configuration --function-name orders-api \
  --logging-config LogFormat=JSON,ApplicationLogLevel=INFO,SystemLogLevel=WARN,LogGroup=/security/lambda/orders
```

Les **API REST d'API Gateway** ont deux types de journaux indépendants :

| | Journaux d'exécution | Journaux d'accès |
| --- | --- | --- |
| Contenu | Comment API Gateway a traité chaque requête : résultat de l'autorisateur, erreurs d'intégration, traces | Qui a appelé et comment, dans un format que vous composez avec les variables `$context` |
| Niveaux | `ERROR` ou `INFO` ; le suivi des données (data tracing), facultatif, journalise les requêtes et réponses complètes (données sensibles, à proscrire en production) | Une ligne par requête |
| Destination | Groupe de journaux `API-Gateway-Execution-Logs_{rest-api-id}/{stage_name}`, géré par API Gateway ; ou une livraison CloudWatch Logs vers vos propres groupes de journaux, compartiments S3 ou flux Firehose | Un groupe de journaux que vous créez, ou un flux Firehose dont le nom commence par `amazon-apigateway-` |
| API HTTP | Non disponibles | Disponibles |

Pour écrire dans CloudWatch Logs, API Gateway a besoin d'un rôle IAM qui approuve `apigateway.amazonaws.com`, doté de la politique `AmazonAPIGatewayPushToCloudWatchLogs` et défini comme `cloudWatchRoleArn` dans les **paramètres du compte** API Gateway, séparément dans **chaque Région**.

```bash
aws apigateway update-account --patch-operations \
  op=replace,path=/cloudwatchRoleArn,value=arn:aws:iam::111122223333:role/ApiGatewayCloudWatchLogs
aws apigateway update-stage --rest-api-id a1b2c3d4e5 --stage-name prod --patch-operations \
  op=replace,path=/*/*/logging/loglevel,value=ERROR
```

```text
{ "requestId":"$context.requestId", "ip":"$context.identity.sourceIp", "caller":"$context.identity.caller", "method":"$context.httpMethod", "path":"$context.resourcePath", "status":"$context.status" }
```

| Symptôme | Cause |
| --- | --- |
| Lambda s'exécute, sans groupe de journaux ni événements | Le rôle d'exécution n'a pas les actions logs, une SCP ou une limite d'autorisations les refuse, ou le groupe de journaux personnalisé n'est pas accessible en écriture |
| Seules certaines lignes de journal Lambda apparaissent | Le niveau de journalisation JSON les filtre |
| L'activation de la journalisation de l'étape échoue | Pas de `cloudWatchRoleArn` dans les paramètres du compte de cette Région |
| Besoin de l'IP du client de chaque requête | Journaux d'accès avec `$context.identity.sourceIp`, pas les journaux d'exécution |

> **Piège d'examen.** « Journaliser l'identité de l'appelant et l'IP source de chaque requête d'API sans exposer les contenus » désigne les journaux d'accès. Les journaux d'exécution au niveau `INFO` avec le suivi des données enregistrent les corps complets des requêtes et des réponses, ce qui crée un risque d'exposition des données.

<!-- section: health-checks-cloudfront | objectives: 1.3.1 -->
## Vérifications de l'état et journalisation CloudFront

**Vérifications de l'état Route 53** :

- Une vérification publique d'un point de terminaison dont le groupe de sécurité ou la liste ACL réseau bloque les plages des vérificateurs Route 53 indique toujours un état défaillant.
- Une IP privée ne peut pas être vérifiée par les vérificateurs publics : utilisez une vérification de point de terminaison privé (sa source de vérification et les groupes de sécurité du point de terminaison doivent autoriser le trafic ; même compte et même Région que la source) ou une vérification fondée sur une alarme CloudWatch.
- Avec la correspondance de chaîne, la chaîne doit figurer dans les 5 120 premiers octets du corps de la réponse, en respectant la casse.
- Les notifications d'alarme des vérifications publiques utilisent une rubrique SNS dans US East (N. Virginia).

**État des cibles ELB** : une cible reste défaillante quand son groupe de sécurité n'autorise pas le groupe de sécurité de l'équilibreur de charge sur le port de vérification, quand le chemin de vérification renvoie un code hors du matcher, ou quand la vérification expire ; le motif d'état de la cible (`Target.Timeout`, `Target.ResponseCodeMismatch`, `Target.FailedHealthChecks`) indique lequel.

**Journalisation CloudFront** :

| Méthode | Destinations | Exigences et pièges |
| --- | --- | --- |
| Journalisation standard (v2) | CloudWatch Logs, Firehose, S3 | Configurée via les journaux fournis (vended logs) de CloudWatch, appels d'API dans US East (N. Virginia) ; le flux Firehose doit être dans `us-east-1` ; les compartiments S3 des Régions à activer (opt-in) sont pris en charge ; formats JSON, plain, w3c, raw, Parquet (S3 uniquement), figés à la création ; les politiques de compartiment et de clé autorisent `delivery.logs.amazonaws.com` |
| Journalisation standard (héritée) | S3 | Compartiment avec les **ACL activées** (pas de propriété des objets « bucket owner enforced ») ; CloudFront accorde `FULL_CONTROL` au compte `awslogsdelivery`, donc l'utilisateur qui active la journalisation a besoin de `s3:GetBucketAcl` et `s3:PutBucketAcl` ; pas de Régions à activer ; SSE-KMS seulement avec une clé gérée par le client dont la politique autorise `delivery.logs.amazonaws.com` |
| Journaux en temps réel | Kinesis Data Streams | Champs choisis et taux d'échantillonnage, livrés en quelques secondes |

Les modifications des paramètres de journalisation standard prennent effet sous 12 heures : un compartiment vide juste après l'activation n'est pas encore une erreur de configuration.

> **Piège d'examen.** Des journaux CloudFront hérités qui s'arrêtent après le passage d'un compartiment en « bucket owner enforced » ou son chiffrement avec la clé gérée par AWS `aws/s3` révèlent un problème de compartiment, pas de distribution : réactivez les ACL ou utilisez une clé gérée par le client, ou passez à la journalisation standard (v2).

<!-- section: cloudwatch-agent | objectives: 1.3.2 -->
## Dépanner l'agent CloudWatch

Examinez l'agent dans cet ordre :

1. **S'exécute-t-il ?** `amazon-cloudwatch-agent-ctl -a status` renvoie `running` et la version.
2. **Que dit son journal ?** `/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log` sous Linux, `C:\ProgramData\Amazon\AmazonCloudWatchAgent\Logs\amazon-cloudwatch-agent.log` sous Windows.
3. **La configuration a-t-elle été acceptée ?** Si l'agent ne démarre pas, lisez `configuration-validation.log` dans le même dossier de journaux ; les fichiers `.toml` et `.yaml` générés montrent la traduction du JSON. Les modifications ne s'appliquent qu'après `fetch-config`.
4. **La cible est-elle celle que vous consultez ?** Vérifiez `region`, `log_group_name` et l'espace de noms des métriques `namespace` (`CWAgent` par défaut).
5. **Peut-il s'authentifier et joindre les points de terminaison ?** Profil d'instance EC2 avec `CloudWatchAgentServerPolicy` ; les serveurs sur site utilisent un profil nommé défini dans `common-config.toml`. Dans un sous-réseau privé, `dial tcp ...:443: i/o timeout` signifie qu'il n'y a pas de route : ajoutez des points de terminaison d'interface pour CloudWatch et CloudWatch Logs avec DNS privé, autorisez TCP 443 dans leurs groupes de sécurité, ou fournissez une passerelle NAT.

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a fetch-config -s \
  -c ssm:AmazonCloudWatch-linux-security
curl -v https://logs.eu-west-1.amazonaws.com
```

| Symptôme | Cause et correction |
| --- | --- |
| L'agent ne démarre plus après une modification | JSON rejeté : lisez le journal de validation |
| Les métriques arrivent mais pas le fichier journal | `file_path` erroné, ou l'utilisateur de l'agent (`run_as_user`) ne peut pas lire le fichier |
| Un agent dans un conteneur reçoit 401 des métadonnées d'instance | Limite de sauts IMDSv2 à 1 : passez-la à 2 |
| Les anciennes lignes ne sont jamais renvoyées après un redémarrage | Normal : le fichier d'état de `logs/state/` garde la position de lecture ; seul un changement d'inode fait relire un fichier depuis le début |
| `Received signal from OS: terminated` | Quelque chose a arrêté l'agent (Systems Manager, `systemctl`, une fenêtre de maintenance) |
| `append_dimensions` absentes derrière un proxy | L'agent doit joindre le point de terminaison EC2 pour lire les métadonnées de l'instance |

Pour déboguer, définissez `"debug": true` dans la section `agent`, puis relancez `fetch-config`.

> **Piège d'examen.** L'absence de données des instances d'un sous-réseau privé sans passerelle NAT est un problème réseau, pas IAM : l'erreur est un délai dépassé, pas `AccessDenied`. La correction consiste à ajouter des points de terminaison de VPC d'interface pour `monitoring` et `logs`, pas à élargir le rôle de l'instance.

<!-- section: missing-logs | objectives: 1.3.2 -->
## Retrouver les journaux et les événements manquants

| Ce qui manque | Vérification |
| --- | --- |
| Fichiers CloudTrail dans S3 | `get-trail-status` montre `IsLogging` et la dernière erreur de livraison ; le chemin de ressource de la politique de compartiment correspond au préfixe (et à `AWSLogs/o-...` pour un journal de suivi d'organisation) avec le bon `aws:SourceArn` ; la politique de clé KMS autorise `cloudtrail.amazonaws.com` ; le compartiment n'est pas en Requester Pays |
| Un `GetObject` S3 ou une invocation Lambda dans le journal de suivi | Les événements de données ne sont pas journalisés par défaut : ajoutez un sélecteur d'événements |
| Événements IAM ou d'autres services globaux | Cherchez dans US East (N. Virginia) : les événements des services globaux y sont livrés |
| Événements CloudTrail dans CloudWatch Logs | Le rôle CloudWatch Logs du journal de suivi autorise `logs:CreateLogStream` et `logs:PutLogEvents` sur le groupe |
| Une règle EventBridge ne se déclenche jamais sur un appel d'API | Un journal de suivi avec journalisation active doit exister ; les événements en lecture seule (`Get*`, `List*`, `Describe*`) ne correspondent qu'à une règle dans l'état `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` ; la règle doit être dans la Région de l'événement |
| Un filtre de métrique ou une alarme reste à zéro | Filtre ajouté après les événements (les filtres ne voient que les nouveaux événements), modèle qui ne correspond pas, ou groupe de journaux dans la classe Essentials (pas de filtres de métrique) |
| Les écritures d'un groupe de journaux échouent après son chiffrement | La politique de clé doit autoriser `logs.<region>.amazonaws.com`, restreinte par `kms:EncryptionContext:aws:logs:arn` |
| Journaux de flux de VPC | Rôle approuvant `vpc-flow-logs.amazonaws.com` avec les autorisations logs (destination CloudWatch Logs) ou politique de compartiment pour `delivery.logs.amazonaws.com` (S3) ; pas encore de trafic ; `log-status` à `NODATA` ou `SKIPDATA` ; la configuration ne peut pas être modifiée, seulement recréée |
| Journaux d'accès ELB | Compartiment dans la même Région, SSE-S3 uniquement, politique de compartiment pour `logdelivery.elasticloadbalancing.amazonaws.com`, préfixe sans `AWSLogs` |
| Résultats absents dans une Région | GuardDuty, Security Hub CSPM ou Config non activé dans cette Région |

```bash
aws cloudtrail get-trail-status --name org-trail
aws cloudtrail get-event-selectors --trail-name org-trail
aws events put-rule --name iam-read-activity --region us-east-1 \
  --state ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS \
  --event-pattern '{"source":["aws.iam"],"detail-type":["AWS API Call via CloudTrail"]}'
```

Rendez la correction durable : règles Config comme `cloudtrail-enabled`, `vpc-flow-logs-enabled` et `cloudwatch-log-group-encrypted`, règles d'activation de la télémétrie CloudWatch pour les nouvelles ressources, et une SCP qui refuse l'arrêt ou la suppression du journal de suivi.

> **Piège d'examen.** Après un `StopLogging`, réactiver le journal de suivi ne comble pas le trou : ces événements ne figurent que dans l'historique des événements de 90 jours de chaque Région. Prévenez-le avec une SCP et détectez-le avec une règle EventBridge sur `StopLogging`.

<!-- section: key-points -->
## Points clés

- Les journaux Lambda exigent les actions logs dans le rôle d'exécution ; les niveaux de journalisation JSON filtrent des lignes ; les groupes personnalisés doivent être accessibles en écriture ; les groupes de classe `Delivery` gardent deux jours.
- API Gateway : `cloudWatchRoleArn` par Région ; journaux d'exécution pour le détail du traitement, journaux d'accès pour savoir qui et d'où ; le suivi des données expose les contenus ; les API HTTP n'ont que les journaux d'accès.
- Les vérifications de l'état Route 53 échouent quand les plages des vérificateurs sont bloquées ; les ressources privées demandent une vérification de point de terminaison privé ou fondée sur une alarme.
- Les journaux CloudFront hérités exigent les ACL activées et une clé gérée par le client en SSE-KMS ; la journalisation standard (v2) ajoute CloudWatch Logs et Firehose (dans `us-east-1`) ; les journaux en temps réel vont vers Kinesis Data Streams.
- Agent CloudWatch : statut, journal de l'agent, journal de validation, noms des cibles, identifiants, points de terminaison depuis les sous-réseaux privés, limite de sauts IMDSv2.
- Événements manquants : statut du journal de suivi, politiques de compartiment et de clé, sélecteurs d'événements de données, `us-east-1` pour les événements globaux, état de la règle EventBridge pour les événements en lecture seule, filtres de métrique sur les nouvelles données seulement.
