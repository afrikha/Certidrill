Les questions d'ingestion décrivent des données qui arrivent quelque part (serveurs de fichiers sur site, appareils, applications SaaS, partenaires, clients web) avec un volume et une fréquence donnés, et demandent comment les faire entrer dans AWS rapidement, de façon sécurisée et avec le moins d'exploitation. Identifiez d'abord trois éléments : le modèle (migration ponctuelle, lot récurrent, flux continu), la taille et la bande passante disponible, puis le protocole que parle la source.

<!-- section: ingestion-patterns | objectives: 3.5.2 -->
## Modèles d'ingestion des données

| Modèle | Fréquence et latence | Services AWS typiques |
| --- | --- | --- |
| Migration massive ponctuelle | Une fois ; quelques jours sont acceptables | AWS DataSync par le réseau, AWS Data Transfer Terminal pour un transfert physique |
| Lot récurrent | Toutes les heures, chaque nuit, chaque semaine | Tâches DataSync planifiées, AWS Transfer Family (les partenaires déposent des fichiers), Amazon AppFlow (SaaS), tâches AWS Glue |
| Micro-lot, quasi temps réel | De quelques secondes à quelques minutes | Amazon Data Firehose (met en mémoire tampon puis livre) |
| Streaming en temps réel | De quelques millisecondes à quelques secondes, relecture possible | Amazon Kinesis Data Streams, Amazon MSK |
| Fichiers pilotés par les événements | Chaque objet à son arrivée | Notifications d'événements S3 ou EventBridge vers Lambda, SQS ou Step Functions |
| Accès hybride continu aux fichiers | En continu, les applications gardent NFS/SMB | AWS Storage Gateway (S3 File Gateway) |
| Jeux de données tiers | Abonnement | AWS Data Exchange |

Amazon AppFlow transfère les données d'applications SaaS (par exemple Salesforce, ServiceNow, Slack) vers S3 ou Redshift selon une planification, sur un événement ou à la demande, sans code. AWS Data Pipeline est fermé aux nouveaux clients : ne le choisissez jamais pour une nouvelle conception.

> **Conseil d'examen.** Le mot décisif est souvent la latence : « en quelques secondes » et « plusieurs consommateurs » désignent Kinesis Data Streams ; « en quasi temps réel vers S3, Redshift ou OpenSearch sans code » désigne Data Firehose ; « chaque nuit » désigne un lot planifié.

<!-- section: transfer-services | objectives: 3.5.3, 3.5.10 -->
## Services et solutions de transfert des données

| Service | Ce qu'il fait | Le choisir quand |
| --- | --- | --- |
| AWS DataSync | Transfert en ligne depuis NFS, SMB, HDFS, un stockage d'objets autogéré et d'autres clouds vers S3 (toute classe de stockage, y compris les classes Glacier), EFS ou tout système de fichiers FSx ; chiffrement en transit et vérification d'intégrité ; planification, filtres, limite de bande passante | Migrer ou répliquer des données de fichiers, déplacer des données froides vers l'archive, copies récurrentes entre systèmes de stockage |
| AWS Storage Gateway, S3 File Gateway | Partage NFS ou SMB sur site, fichiers stockés comme objets dans S3, cache local pour une faible latence | Les applications sur site gardent une interface fichier pendant que les données arrivent dans S3 |
| Storage Gateway, Volume Gateway | Volumes iSCSI ; mode mis en cache (données principales dans S3, données chaudes en cache local) ou stocké (toutes les données sur site, sauvegarde asynchrone vers S3 sous forme d'instantanés EBS) | Extension de stockage en bloc ou sauvegarde de volumes sur site |
| Storage Gateway, Tape Gateway | Bibliothèque de bandes virtuelles pour le logiciel de sauvegarde existant, bandes archivées dans S3 Glacier Flexible Retrieval ou Deep Archive | Remplacer les bandes physiques sans changer l'application de sauvegarde |
| AWS Transfer Family | Points de terminaison SFTP, FTPS, FTP et AS2 gérés, plus des applications web, avec stockage dans S3 ou EFS | Des partenaires échangent des fichiers avec ces protocoles ; ils gardent leurs clients et leurs identifiants |
| AWS Data Transfer Terminal | Sites physiques connectés à AWS à haut débit, où vous apportez vos propres périphériques de stockage | Très grands jeux de données avec une bande passante limitée |
| AWS Direct Connect | Connexion réseau privée dédiée | Grands transferts récurrents avec un débit constant |
| S3 Transfer Acceleration | Les chargements entrent par l'emplacement périphérique CloudFront le plus proche, puis empruntent le réseau AWS | Clients du monde entier qui chargent vers un compartiment central sur de longues distances |

Agents : DataSync a besoin d'un agent (déployé sur site en machine virtuelle, ou sur EC2) pour lire les emplacements NFS, SMB et HDFS ; les transferts entre services de stockage AWS n'en ont pas besoin. DataSync a deux modes de tâche : **Enhanced** (listage, transfert et vérification en parallèle, nombre d'objets pratiquement illimité) et **Basic** ; le mode ne peut pas être changé après la création de la tâche.

Disponibilité en novembre 2026 : AWS Snowball Edge n'est plus proposé aux nouveaux clients (AWS oriente vers DataSync pour les transferts en ligne et Data Transfer Terminal pour les transferts physiques), et Amazon FSx File Gateway n'est plus proposé aux nouveaux clients (accédez directement à FSx for Windows File Server).

> **Piège d'examen.** DataSync déplace les données ; Storage Gateway fournit un accès hybride continu. « Migrer 200 To de partages de fichiers et décommissionner le NAS » : DataSync. « Les utilisateurs sur site doivent continuer d'accéder à des fichiers stockés dans S3 » : S3 File Gateway.

<!-- section: sizes-speeds | objectives: 3.5.6 -->
## Tailles et vitesses

Calculez la durée du transfert avant de choisir entre transfert réseau et transfert physique :

```text
transfer time (s) = data (bytes) x 8 / (bandwidth (bit/s) x utilization)

100 TB over 1 Gbps at 80 % utilization:
  100 x 10^12 x 8 = 8 x 10^14 bits
  8 x 10^14 / (1 x 10^9 x 0.8) = 1,000,000 s = about 11.6 days
same data over 10 Gbps at 80 %: about 1.2 days
```

Limites à connaître :

| Élément | Limite |
| --- | --- |
| `PUT` S3 unique | 5 Go par objet |
| Chargement partitionné S3 (multipart upload) | Jusqu'à 50 To par objet ; parties chargées en parallèle et relancées individuellement |
| Partition (shard) Kinesis Data Streams (provisionné) | Écriture 1 Mo/s ou 1 000 enregistrements/s ; lecture 2 Mo/s partagés entre consommateurs |
| Diffusion améliorée (enhanced fan-out) | 2 Mo/s par partition pour chaque consommateur enregistré, poussés en HTTP/2 |
| Enregistrement Kinesis Data Streams | Charge utile jusqu'à 10 Mio |
| Flux Kinesis à la demande | Démarre à 4 Mo/s en écriture ; s'adapte jusqu'au double du pic des 30 derniers jours |
| Enregistrement Data Firehose | Jusqu'à 1 000 Ko |
| Tunnel Site-to-Site VPN | Jusqu'à 1,25 Gbit/s (standard), 5 Gbit/s (large bande passante) |
| Direct Connect dédiée | 1, 10, 100 ou 400 Gbit/s |

> **Piège d'examen.** Une échéance que le réseau ne peut pas tenir (par exemple 500 To en une semaine sur un lien de 1 Gbit/s déjà à moitié utilisé) exclut DataSync sur ce lien. Les réponses actuelles sont un lien plus rapide (Direct Connect) ou un transfert physique dans un Data Transfer Terminal, pas une commande Snowball pour un nouveau client.

<!-- section: secure-ingestion | objectives: 3.5.5 -->
## Sécuriser les points d'accès d'ingestion

| Point d'accès | Contrôles |
| --- | --- |
| Producteurs sur EC2, conteneurs ou Lambda | Rôle IAM limité à `kinesis:PutRecord(s)`, `firehose:PutRecord(Batch)` ou `s3:PutObject` sur la ressource cible |
| Trafic depuis un VPC | Points de terminaison de VPC d'interface pour Kinesis Data Streams, Data Firehose et DataSync ; point de terminaison de passerelle S3 ; les politiques de point de terminaison limitent les ressources accessibles |
| Compartiment S3 de dépôt | Conditions de la politique de compartiment (`aws:SourceVpce`, `aws:SecureTransport`), S3 Block Public Access, chiffrement par défaut SSE-KMS |
| Transfert de fichiers avec des partenaires | Point de terminaison de VPC Transfer Family accessible depuis internet avec des adresses IP Elastic que les partenaires autorisent, groupes de sécurité limités aux plages IP des partenaires ; FTP uniquement sur un point de terminaison interne |
| Chargements depuis un navigateur ou un mobile | URL présignées, ou groupes d'identités Amazon Cognito qui délivrent des informations d'identification temporaires |
| Liens hybrides | Site-to-Site VPN, ou Direct Connect avec MACsec ou VPN ; agent DataSync activé avec un point de terminaison de VPC pour que le transfert reste privé |

Les données des flux sont chiffrées au repos par chiffrement côté serveur avec une clé AWS KMS, et tous les points de terminaison utilisent TLS.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUploadsOutsideTheIngestionEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::example-ingest-raw/*",
      "Condition": {
        "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f67890" }
      }
    }
  ]
}
```

> **Conseil d'examen.** « Des producteurs dans des sous-réseaux privés doivent envoyer vers Kinesis sans traverser internet » : point de terminaison de VPC d'interface, pas une passerelle NAT. Il supprime le chemin internet et les frais de traitement de données de la passerelle NAT.

<!-- section: streaming-services | objectives: 3.5.7 -->
## Services de données en streaming

| Service | Ce que c'est | Le choisir quand |
| --- | --- | --- |
| Amazon Kinesis Data Streams | Flux durable et ordonné (par partition) ; conservation de 24 heures (par défaut) à 365 jours ; plusieurs consommateurs lisent et relisent | Traitement temps réel personnalisé, plusieurs consommateurs indépendants, relecture |
| Amazon Data Firehose | Livraison entièrement gérée : met en tampon, transforme éventuellement, compresse, convertit et livre vers S3, Redshift, OpenSearch Service, Splunk, des tables Apache Iceberg ou des points de terminaison HTTP | Charger des données en streaming dans une destination sans code et sans gestion de capacité |
| Amazon Managed Service for Apache Flink | Applications Apache Flink gérées (Java, Scala, Python, SQL) qui lisent des flux | Agrégations par fenêtre, détection d'anomalies, jointures de flux en temps réel |
| Amazon MSK | Apache Kafka géré (courtiers provisionnés Standard ou Express, ou MSK Serverless), MSK Connect pour les connecteurs | Applications et outils Kafka existants, sans modifier le code |
| Amazon Kinesis Video Streams | Ingérer, stocker et relire de la vidéo provenant d'appareils | Caméras et analyse vidéo, par exemple avec Amazon Rekognition |

> **Piège d'examen.** Firehose ne stocke pas les données pour une relecture et n'a pas de consommateurs propres : il livre. Quand plusieurs applications doivent lire les mêmes enregistrements indépendamment ou retraiter les données de la veille, placez Kinesis Data Streams en amont.

<!-- section: streaming-architectures | objectives: 3.5.9 -->
## Concevoir des architectures de streaming

```text
producers (apps, agents, IoT) --> Kinesis Data Streams --+--> Lambda (per-record processing)
                                                         +--> Managed Service for Apache Flink --> alerts, DynamoDB
                                                         +--> Data Firehose --> S3 (Parquet) --> Athena
```

Règles de conception :

- L'**ordre** est garanti par partition : les enregistrements qui ont la même clé de partition vont dans la même partition. Choisissez une clé à forte cardinalité (ID d'appareil, ID de client) pour éviter une **partition chaude**.
- **Diffusion** : chaque consommateur en diffusion améliorée reçoit ses propres 2 Mo/s par partition et environ 70 ms de propagation ; les consommateurs à débit partagé se partagent 2 Mo/s par partition.
- **Consommateur Lambda** : mappage de source d'événement avec taille de lot et fenêtre de regroupement ; un lot en échec est relancé, rendez donc le traitement idempotent et envoyez les échecs vers une destination en cas d'échec.
- **Découpler et absorber** : le flux absorbe les pics ; les consommateurs en aval évoluent indépendamment.
- **Archiver les données brutes** : Firehose vers S3 en parallèle du traitement temps réel, pour l'analytique ultérieure.
- **SQS ou Kinesis** : SQS supprime un message une fois traité et n'offre pas de relecture à d'autres consommateurs ; utilisez-le pour des files de travail, Kinesis pour des flux.

<!-- section: ingestion-configuration | objectives: 3.5.13 -->
## Choisir les configurations d'ingestion

Kinesis Data Streams :

| Paramètre | Choix |
| --- | --- |
| Mode de capacité | **À la demande** pour un trafic imprévisible ou nouveau (pas de planification des partitions) ; **provisionné** pour un trafic prévisible, avec un nombre de partitions géré par vous (`UpdateShardCount`) ou des partitions chaudes scindées. Vous pouvez changer de mode deux fois par 24 heures |
| Nombre de partitions (provisionné) | Maximum de Mo/s écrits ÷ 1, enregistrements/s écrits ÷ 1 000 et Mo/s lus ÷ 2 |
| Conservation | 24 heures par défaut, jusqu'à 365 jours pour relire |
| Consommateurs | Diffusion améliorée pour plusieurs consommateurs à faible latence |

Data Firehose :

| Paramètre | Choix |
| --- | --- |
| Indications de mise en mémoire tampon (S3) | Taille 1–128 Mio (5 par défaut), intervalle 0–900 secondes (300 par défaut) ; la première condition atteinte déclenche la livraison. Des tampons plus grands donnent des objets moins nombreux et plus gros |
| Transformation | Fonction Lambda sur chaque lot (nettoyage, enrichissement, CSV vers JSON) |
| Conversion du format des enregistrements | JSON vers Apache Parquet ou ORC, à l'aide d'un schéma du catalogue de données AWS Glue |
| Partitionnement dynamique | Des clés issues des données (par exemple `customer_id`) deviennent des préfixes S3 pour des requêtes plus rapides et moins chères |
| Compression et chiffrement | GZIP ou Snappy avant livraison ; SSE-KMS |

Autres configurations : tâches DataSync avec planification, filtres d'inclusion et d'exclusion, limite de bande passante pendant les heures ouvrées et transfert des seules données modifiées ; seuils de chargement partitionné S3 pour les gros fichiers ; serveur Transfer Family avec un fournisseur d'identité personnalisé quand les partenaires s'authentifient sur un annuaire existant.

> **Piège d'examen.** Firehose ne convertit que du JSON en Parquet ou ORC. Pour une entrée CSV, ajoutez d'abord une transformation Lambda vers JSON, ou convertissez plus tard avec une tâche Glue.

<!-- section: key-points -->
## Points clés

- Le modèle d'abord : migration ponctuelle, lot planifié, quasi temps réel (Firehose), temps réel avec relecture (Kinesis Data Streams ou MSK).
- DataSync migre et réplique ; Storage Gateway fournit un accès hybride continu ; Transfer Family reçoit du SFTP, FTPS, FTP et AS2.
- Snowball Edge et FSx File Gateway sont fermés aux nouveaux clients ; Data Pipeline aussi.
- Partition : 1 Mo/s ou 1 000 enregistrements/s en entrée, 2 Mo/s en sortie ; la diffusion améliorée donne 2 Mo/s par consommateur.
- Sécurisez l'ingestion avec des rôles à privilège minimal, des points de terminaison de VPC, des politiques de compartiment sur `aws:SourceVpce`, le chiffrement KMS, l'autorisation d'adresses IP Elastic pour les partenaires.
- Calculez la durée du transfert : octets x 8 ÷ (bande passante x taux d'utilisation).
