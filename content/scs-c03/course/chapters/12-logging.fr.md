Les questions de journalisation demandent quelle source enregistre la preuve, où elle est stockée pour qu'aucun compte de charge de travail ne puisse la modifier, comment elle parvient à un compte central et quel outil l'interroge, la normalise ou la corrèle. Ce chapitre présente les sources de journaux et leurs destinations, les journaux de suivi d'organisation et le compte d'archivage des journaux, la centralisation et les abonnements CloudWatch Logs, Amazon Security Lake et les outils tiers, l'analyse avec Logs Insights, Athena et Security Hub, la normalisation avec Lambda, les transformateurs CloudWatch Logs, OpenSearch Service et Managed Grafana, et les sources de journaux réseau choisies en fonction de la menace.

<!-- section: log-sources | objectives: 1.2.1 -->
## Les sources de journaux et leurs destinations possibles

| Source | Enregistre | Active par défaut ? | Destinations |
| --- | --- | --- | --- |
| Événements de gestion CloudTrail | Appels d'API du plan de contrôle (qui, quoi, quand, IP source) | Historique des événements : 90 jours, vue par Région ; un journal de suivi est nécessaire pour les conserver | S3, CloudWatch Logs |
| Événements de données CloudTrail | Opérations sur les objets S3, invocations Lambda, éléments DynamoDB et autres ressources | Non, sélectionnés par journal de suivi, facturés | S3, CloudWatch Logs |
| Événements d'activité réseau CloudTrail | Appels d'API passant par vos points de terminaison de VPC, y compris ceux refusés par la politique du point de terminaison (`VpceAccessDenied`) | Non, par source d'événements, facturés | S3, CloudWatch Logs |
| Journaux de flux de VPC et de passerelle de transit | Métadonnées des flux IP, acceptés ou rejetés | Non | CloudWatch Logs, S3, Amazon Data Firehose |
| Journaux de requêtes Route 53 Resolver | Requêtes DNS issues des VPC, passant par les points de terminaison Resolver ou traitées par DNS Firewall | Non | CloudWatch Logs, S3, Firehose |
| Journaux AWS WAF | Chaque requête web inspectée et la règle qui a correspondu | Non | CloudWatch Logs, S3, Firehose (noms commençant par `aws-waf-logs-`) |
| Journaux AWS Network Firewall | Journaux d'alertes, de flux et TLS | Non | CloudWatch Logs, S3, Firehose |
| Journaux d'accès ELB | Requêtes vers l'équilibreur de charge | Non | S3 dans la même Région (SSE-S3 uniquement) |
| Journaux standard CloudFront | Requêtes des utilisateurs | Non | CloudWatch Logs, Firehose, S3 |
| Journaux d'accès au serveur S3 | Requêtes vers un compartiment, au mieux (best effort) | Non | Un autre compartiment |
| Journaux du plan de contrôle EKS | `api`, `audit`, `authenticator`, `controllerManager`, `scheduler` | Non | CloudWatch Logs |
| Journaux Lambda, API Gateway, d'invocation Bedrock | Sortie applicative, requêtes d'API, prompts et réponses | Lambda oui (si le rôle le permet) ; les autres non | CloudWatch Logs, S3, Firehose selon le service |
| AWS Config | Historique et instantanés de configuration | Quand l'enregistreur fonctionne | Compartiment S3 du canal de diffusion |

Choisissez le stockage d'après l'exigence :

| Exigence | Stockage |
| --- | --- |
| Alarmes et filtres de métrique en temps réel, requêtes interactives | CloudWatch Logs (classe de journaux Standard) |
| Des années de conservation peu coûteuse et immuable | S3 avec Object Lock, cycle de vie vers des classes de stockage plus froides, SSE-KMS |
| Diffusion vers un SIEM ou un point de terminaison tiers | Firehose (destinations Splunk, points de terminaison HTTP, partenaires) ou un filtre d'abonnement |
| Un seul lac de données de sécurité normalisé et interrogeable, pour tous les comptes | Amazon Security Lake |

> **Piège d'examen.** L'historique des événements n'est pas une archive de journaux : il ne garde que 90 jours d'événements de gestion et ne peut pas être rendu inaltérable. Toute exigence de conservation, d'événements de données ou d'organisation demande un journal de suivi.

<!-- section: organization-logging | objectives: 1.2.2 -->
## Journaux de suivi d'organisation, compte d'archivage et CloudWatch Logs centralisé

Un **journal de suivi d'organisation** se crée dans le compte de gestion ou dans un compte administrateur délégué CloudTrail. Créé depuis la console, il est multi-Régions ; les nouveaux comptes membres y sont ajoutés automatiquement ; les membres le voient mais ne peuvent ni l'arrêter, ni le modifier, ni le supprimer. Stockez les fichiers dans un compartiment d'un **compte d'archivage des journaux** dédié (log archive, l'organisation d'AWS Control Tower), chiffré avec une clé KMS gérée par le client, avec la validation de l'intégrité des fichiers journaux et S3 Object Lock.

```bash
aws cloudtrail create-trail --name org-trail \
  --s3-bucket-name example-org-log-archive \
  --is-organization-trail --is-multi-region-trail \
  --enable-log-file-validation \
  --kms-key-id arn:aws:kms:eu-west-1:999988887777:key/1234abcd-12ab-34cd-56ef-1234567890ab \
  --cloud-watch-logs-log-group-arn arn:aws:logs:eu-west-1:111122223333:log-group:org-trail:* \
  --cloud-watch-logs-role-arn arn:aws:iam::111122223333:role/CloudTrailToCloudWatch
aws cloudtrail start-logging --name org-trail
```

La politique de compartiment autorise `cloudtrail.amazonaws.com` à lire l'ACL du compartiment et à écrire sous `AWSLogs/` suivi de l'ID du compte de gestion et de l'ID de l'organisation, chaque fois avec `s3:x-amz-acl` égal à `bucket-owner-full-control` et `aws:SourceArn` égal à l'ARN du journal de suivi détenu par le compte de gestion :

```json
{
  "Sid": "AWSCloudTrailOrganizationWrite",
  "Effect": "Allow",
  "Principal": { "Service": "cloudtrail.amazonaws.com" },
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::example-org-log-archive/AWSLogs/o-exampleorgid/*",
  "Condition": {
    "StringEquals": {
      "s3:x-amz-acl": "bucket-owner-full-control",
      "aws:SourceArn": "arn:aws:cloudtrail:eu-west-1:111122223333:trail/org-trail"
    }
  }
}
```

La politique de clé KMS doit autoriser `kms:GenerateDataKey*` à `cloudtrail.amazonaws.com` (restreint par la condition `kms:EncryptionContext:aws:cloudtrail:arn`), et les lecteurs ont besoin de `kms:Decrypt`. Ajoutez une SCP qui refuse `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail` et `cloudtrail:PutEventSelectors` en dehors d'un rôle d'urgence (break-glass).

**Un compte de journalisation CloudWatch dédié** reçoit les journaux applicatifs et de services de tous les comptes. Trois mécanismes :

| Mécanisme | Fonctionnement | À choisir quand |
| --- | --- | --- |
| Règles de centralisation CloudWatch Logs | Depuis le compte de gestion ou l'administrateur délégué, des règles copient les nouvelles données de journaux de comptes sources, d'UO ou de toute l'organisation, et de Régions choisies, vers un compte et une Région de destination, avec une Région de sauvegarde facultative | Copie native des groupes de journaux dans toute l'organisation ; accès approuvé (trusted access) pour CloudWatch requis ; l'historique n'est pas copié |
| Abonnement entre comptes | Un filtre d'abonnement (ou une politique d'abonnement au niveau du compte) dans chaque compte source envoie les événements à une **destination** du compte central, adossée à Kinesis Data Streams ou à Firehose ; la politique de la destination peut autoriser l'organisation | Diffusion vers un traitement ou un SIEM ; le groupe de journaux et la destination sont dans la même Région |
| Règles d'activation de la télémétrie CloudWatch | Règles d'organisation, d'UO ou de compte qui activent automatiquement la télémétrie (VPC Flow Logs, journaux du plan de contrôle EKS, journaux WAF, journaux Route 53 Resolver, événements CloudTrail, résultats Security Hub CSPM) | Garantir que les nouvelles ressources journalisent dès le premier jour |

Une politique d'abonnement au niveau du compte utilise `put-account-policy --policy-type SUBSCRIPTION_FILTER_POLICY` ; excluez les groupes de journaux de la chaîne de livraison avec `selection-criteria` (`LogGroupName NOT IN [...]`) pour éviter une boucle récursive.

L'**agent CloudWatch** envoie les journaux du système d'exploitation et des applications des instances EC2 et des serveurs sur site ; sa configuration liste chaque fichier, son groupe et son flux de journaux, et elle est stockée dans Parameter Store pour toute la flotte :

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/secure",
            "log_group_name": "/servers/linux/secure",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 365
          }
        ]
      }
    }
  }
}
```

> **Piège d'examen.** Une règle de centralisation ne copie que les données de journaux arrivées après sa création, et les groupes de journaux sources chiffrés avec une clé gérée par le client sont ignorés tant que vous ne choisissez pas comment les traiter. Pour une exigence de conserver l'historique de chaque compte, prévoyez la règle avant les charges de travail, pas après.

<!-- section: security-lake | objectives: 1.2.3 -->
## Amazon Security Lake et les outils tiers

Security Lake construit un lac de données dans des compartiments S3 dont vous êtes propriétaire, dans le compte administrateur délégué. Il collecte les sources prises en charge nativement par un flux indépendant et dupliqué (votre journalisation existante ne change pas), les convertit au format **Apache Parquet** et au schéma **Open Cybersecurity Schema Framework (OCSF)**, et les catalogue dans AWS Glue, avec une table Lake Formation par source.

- **Sources natives** : événements de gestion CloudTrail et événements de données S3 et Lambda, journaux d'audit Amazon EKS, journaux de requêtes Route 53 Resolver, résultats Security Hub CSPM, VPC Flow Logs et journaux AWS WAF. Les événements de gestion exigent que la journalisation CloudTrail soit configurée.
- Les **Régions de cumul** (rollup Regions) consolident les données des Régions contributrices, ce qui aide à respecter les exigences de résidence des données ; la conservation et les transitions de classes de stockage se règlent par Région.
- **Sources personnalisées** (jusqu'à 50 par compte) : le tiers écrit de l'OCSF (version 1.3 ou antérieure) en Parquet, une seule classe d'événements OCSF par source, sous le préfixe attribué par Security Lake, avec le rôle de fournisseur que Security Lake crée.
- Les **abonnés** consomment les données par source et par Région, jusqu'à 10 sources chacun :

| Accès de l'abonné | Fonctionnement | Abonné typique |
| --- | --- | --- |
| Accès aux données | Notifié des nouveaux objets S3 par une file SQS ou un point de terminaison HTTPS, puis lit les objets | Un SIEM qui ingère tout (Splunk, partenaires) |
| Accès aux requêtes | Interroge les tables Lake Formation sur place avec Athena ou un autre moteur | Analystes, requête directe d'OpenSearch Service, Athena d'un autre compte |

Pour envoyer des journaux vers un outil tiers sans Security Lake : un flux Firehose (destinations natives Splunk et points de terminaison HTTP), un abonnement CloudWatch Logs, ou les notifications d'événements S3 pour un outil qui lit le compartiment.

**CloudTrail Lake** (magasins de données d'événements interrogés en SQL) est fermé aux nouveaux clients depuis le 31 mai 2026 ; les clients existants le conservent, et AWS recommande de migrer vers CloudWatch, qui peut importer l'historique d'un magasin de données d'événements (les données antérieures à 2023 ne sont pas migrées) et ingérer les événements CloudTrail en continu.

> **Conseil d'examen.** « Normaliser les journaux de nombreux comptes et d'un pare-feu tiers dans un schéma ouvert unique, avec le MOINS d'effort pour raccorder un nouveau SIEM » désigne Security Lake avec une source personnalisée OCSF et un abonné. Un compartiment de journaux bruts plus des tâches Glue fonctionne, mais vous laisse tout le travail de normalisation.

<!-- section: log-analysis | objectives: 1.2.4 -->
## Analyser les journaux avec Logs Insights, Athena et Security Hub

**CloudWatch Logs Insights** interroge un ou plusieurs groupes de journaux, entre comptes depuis un compte de surveillance de l'observabilité entre comptes, en Logs Insights QL, OpenSearch PPL ou OpenSearch SQL. La facturation se fait au Go de données non compressées analysées ; les requêtes expirent après 60 minutes ; les résultats sont conservés 7 jours.

```text
fields @timestamp, userIdentity.arn, sourceIPAddress, errorCode
| filter eventSource = "iam.amazonaws.com" and errorCode = "AccessDenied"
| stats count(*) as denied by userIdentity.arn, sourceIPAddress
| sort denied desc
```

**Amazon Athena** interroge en SQL les journaux stockés dans S3 : CloudTrail (la console crée la table), ALB, CloudFront, VPC Flow Logs, journaux WAF et tables Security Lake. Utilisez la projection de partitions sur le compte, la Région et la date, pour que les requêtes n'analysent que les jours nécessaires.

```text
SELECT eventtime, useridentity.arn, eventname, sourceipaddress
FROM cloudtrail_logs
WHERE eventsource = 's3.amazonaws.com'
  AND eventname IN ('PutBucketPolicy', 'DeleteBucketPolicy', 'PutBucketAcl')
  AND timestamp >= '2026/11/01'
ORDER BY eventtime DESC
```

Les **résultats Security Hub** s'analysent dans la console avec des filtres et des regroupements (par ressource, compte, gravité ou type de résultat), dans Security Hub CSPM avec les insights, et par programme via l'API de chaque service. Les résultats Security Hub utilisent OCSF ; ceux de Security Hub CSPM utilisent ASFF.

| Exigence | Outil |
| --- | --- |
| Examiner les erreurs Lambda de la dernière heure ou un pic de connexions | Logs Insights |
| SQL sur des mois de journaux CloudTrail ou de flux dans S3, au coût le plus bas | Athena avec partitions |
| Quelles ressources exposées corriger en premier | Expositions Security Hub |
| Investigation visuelle par entité, graphes de comportement | Amazon Detective (chapitre 22) |

> **Piège d'examen.** Logs Insights ne voit que les groupes de journaux de CloudWatch Logs et facture au Go analysé ; pour sept ans de fichiers de journal de suivi déjà dans S3, Athena est la réponse économique. Aucun des deux n'alerte seul : les alarmes viennent des filtres de métrique, des requêtes planifiées Logs Insights ou d'EventBridge.

<!-- section: log-normalization | objectives: 1.2.5 -->
## Normaliser, analyser syntaxiquement et corréler les journaux

| Besoin | Service | Comment |
| --- | --- | --- |
| Analyser et enrichir à l'ingestion, sans code | Transformateurs CloudWatch Logs | Processeurs par groupe de journaux ou par compte : analyseurs intégrés (`parseVPC`, `parseWAF`, `parseCloudfront`, `parseRoute53`, `parsePostgres`), Grok, modification de JSON et de chaînes, conversion de types, ajout de clés de compte et de Région ; classe de journaux Standard uniquement ; événements d'origine et transformés tous deux conservés |
| Analyse ou masquage personnalisés dans un flux | AWS Lambda | Cible d'un filtre d'abonnement, ou transformation de données Firehose avant la livraison vers S3, OpenSearch Service ou un tiers |
| Recherche, règles de corrélation, détection de menaces sur des journaux indexés | Amazon OpenSearch Service | Pipelines OpenSearch Ingestion, Security Analytics (détecteurs avec règles Sigma associées à MITRE ATT&CK, OpenSearch 2.5 ou ultérieur), requête directe sur place de Security Lake |
| Tableaux de bord partagés sur de nombreuses sources de données | Amazon Managed Grafana | Espaces de travail avec les sources de données CloudWatch, OpenSearch Service, Athena, X-Ray, Timestream et Managed Service for Prometheus ; utilisateurs issus d'IAM Identity Center ou d'un fournisseur d'identité SAML 2.0 |

La corrélation joint les événements par une clé commune : l'ID de clé d'accès ou la session de rôle dans CloudTrail, l'ENI ou l'adresse IP dans les journaux de flux, le nom interrogé dans les journaux Resolver. Dans Security Lake, OCSF donne les mêmes noms de champs à toutes les sources, si bien qu'une seule requête peut joindre l'activité DNS, réseau et d'API.

> **Piège d'examen.** Les transformateurs ne s'appliquent qu'aux événements ingérés après leur création, et seulement aux groupes de la classe de journaux Standard. Un groupe de journaux créé dans la classe Essentials (anciennement Infrequent Access) n'a pas non plus de filtres de métrique, de filtres d'abonnement ni de Live Tail, et sa classe ne peut pas être modifiée : recréez-le en Standard.

<!-- section: network-log-sources | objectives: 1.2.6 -->
## Choisir les sources de journaux réseau selon la conception et la menace

| Menace ou question | Source de journaux |
| --- | --- |
| Balayages de ports, connexions rejetées, flux sortants inattendus | VPC Flow Logs au niveau du VPC, du sous-réseau ou de l'ENI, avec `action` et `tcp-flags` |
| Trafic entre VPC ou vers le site local via un concentrateur | Journaux de flux de passerelle de transit (`tgw-attachment-id`, `packets-lost-no-route`, `packets-lost-blackhole`) |
| Tunnels DNS, requêtes vers des domaines malveillants, exfiltration de données par DNS | Journaux de requêtes Route 53 Resolver, règles DNS Firewall en mode alerte ou blocage |
| Alertes au niveau de la charge utile sur le trafic est-ouest (east/west) ou sortant | Journaux d'alertes Network Firewall |
| Exploits web, robots, blocages fondés sur le débit | Journaux AWS WAF |
| Utilisation de vos points de terminaison de VPC par des principaux extérieurs à l'organisation | Événements d'activité réseau CloudTrail |

**VPC Flow Logs** : le format par défaut est la version 2 (`version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status`). Un format personnalisé ajoute des champs comme `vpc-id`, `subnet-id`, `pkt-srcaddr`, `pkt-dstaddr` (adresses d'origine derrière une passerelle NAT ou un équilibreur de charge), `tcp-flags`, `flow-direction` et `traffic-path`. L'intervalle d'agrégation maximal est de 10 minutes par défaut, ou de 1 minute ; les instances Nitro agrègent sur 1 minute ou moins. Les journaux de flux n'affectent ni le débit ni la latence.

```bash
aws ec2 create-flow-logs --resource-type VPC --resource-ids vpc-0a1b2c3d4e5f67890 \
  --traffic-type ALL --max-aggregation-interval 60 \
  --log-destination-type s3 --log-destination arn:aws:s3:::example-flow-logs \
  --log-format '${version} ${account-id} ${vpc-id} ${interface-id} ${pkt-srcaddr} ${pkt-dstaddr} ${srcport} ${dstport} ${protocol} ${tcp-flags} ${action} ${flow-direction}'
```

Les journaux de flux n'enregistrent pas : le trafic vers le serveur DNS d'Amazon (utilisez les journaux de requêtes Resolver), les métadonnées d'instance (`169.254.169.254`), Amazon Time Sync, DHCP, l'activation de licence Windows, ARP, le trafic vers l'adresse réservée du routeur du VPC, ni le trafic source mis en miroir. Le format et le rôle IAM d'un journal de flux ne peuvent pas être modifiés après sa création : supprimez-le et recréez-le.

Les **journaux de requêtes Route 53 Resolver** (Route 53 VPC Resolver dans la documentation actuelle) n'enregistrent que les requêtes uniques : une requête répétée à laquelle le cache répond pendant la durée de vie (TTL) n'est pas journalisée. Une configuration de journalisation des requêtes est associée à des VPC et peut être partagée avec d'autres comptes via AWS RAM.

> **Piège d'examen.** « Identifier quelle instance a résolu un domaine malveillant connu » ne se résout pas avec les journaux de flux, qui ne montrent jamais les requêtes vers le serveur DNS d'Amazon. Ce sont les journaux de requêtes Resolver, ou GuardDuty, qui analyse déjà les journaux DNS pour ses résultats.

<!-- section: key-points -->
## Points clés

- L'historique des événements couvre 90 jours d'événements de gestion ; les journaux de suivi ajoutent la conservation, les événements de données et les événements d'activité réseau ; ces deux derniers sont facultatifs et facturés.
- Journal de suivi d'organisation depuis le compte de gestion ou l'administrateur délégué, vers un compartiment d'archivage avec SSE-KMS, validation de l'intégrité, Object Lock et une SCP qui protège le journal de suivi.
- Journalisation CloudWatch centrale : règles de centralisation (nouvelles données uniquement), destinations entre comptes avec Kinesis ou Firehose, politiques d'abonnement au niveau du compte, règles d'activation de la télémétrie.
- Security Lake : OCSF et Parquet, sources natives, Régions de cumul, sources personnalisées en OCSF 1.3 ou antérieur, abonnés avec accès aux données ou aux requêtes. CloudTrail Lake est fermé aux nouveaux clients.
- Logs Insights pour les journaux CloudWatch récents, Athena pour l'historique dans S3, Security Hub pour les résultats (OCSF ; CSPM en ASFF).
- Transformateurs, Lambda, OpenSearch Security Analytics et Managed Grafana normalisent, corrèlent et visualisent.
- Les journaux de flux ignorent le DNS vers le résolveur d'Amazon et le trafic des métadonnées ; les journaux Resolver ignorent les réponses en cache ; les journaux de flux de passerelle de transit montrent les pertes par cause.
