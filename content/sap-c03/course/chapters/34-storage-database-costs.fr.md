Les factures de stockage et de bases de données augmentent sans bruit : des objets que personne ne lit restent dans S3 Standard, des volumes gp2 sont dimensionnés pour leurs IOPS plutôt que pour les données, une base de données provisionnée tourne à 10 % d'utilisation, des sauvegardes restent indéfiniment dans le stockage chaud, et des journaux de débogage sont ingérés au plein tarif. Les questions SAP-C03 donnent des profils d'accès, des règles de conservation et des objectifs de performance ou de reprise, et demandent la conception qui y répond au coût le plus bas.

<!-- section: storage-tiering | objectives: 3.4.1 -->
## Hiérarchisation intelligente et politiques de cycle de vie

**S3 Intelligent-Tiering** déplace chaque objet entre des niveaux d'accès selon son propre historique d'accès, sans frais de récupération, pour de faibles frais mensuels de surveillance et d'automatisation par objet.

| Niveau | Atteint après | Remarques |
| --- | --- | --- |
| Frequent Access | Chargement ou transition | Niveau par défaut |
| Infrequent Access | 30 jours consécutifs sans accès | Automatique |
| Archive Instant Access | 90 jours consécutifs sans accès | Automatique, accès en millisecondes |
| Archive Access (facultatif) | 90 à 730 jours, configurable | Restauration nécessaire, récupération standard en 3 à 5 heures |
| Deep Archive Access (facultatif) | 180 à 730 jours, configurable | Restauration nécessaire, récupération standard en 12 heures au plus |

Les objets de moins de 128 Ko ne sont pas surveillés et restent toujours en Frequent Access. Lire un objet (GET, PUT, copie, restauration) le ramène en Frequent Access ; les opérations HEAD, de balisage et de liste, non.

**S3 Lifecycle** applique des règles d'âge que vous définissez :

- Les transitions descendent la cascade dans un seul sens : de Standard vers Standard-IA, Intelligent-Tiering, One Zone-IA, Glacier Instant Retrieval, Glacier Flexible Retrieval ou Glacier Deep Archive ; rien ne sort de Glacier Deep Archive par transition.
- Frais de durée minimale de stockage : 30 jours (Standard-IA, One Zone-IA), 90 jours (Glacier Instant Retrieval, Glacier Flexible Retrieval), 180 jours (Glacier Deep Archive). Depuis juillet 2026, une règle peut passer en Standard-IA ou One Zone-IA dès le jour 0 (d'anciens supports citent encore une attente de 30 jours), mais les frais minimaux de 30 jours s'appliquent toujours.
- Par défaut, Lifecycle ne fait pas passer les objets de moins de 128 Ko ; ajoutez un filtre de taille d'objet pour changer cela.
- Chaque objet déplacé vers Glacier Flexible Retrieval ou Deep Archive est une requête de transition facturée et ajoute 40 Ko de surcharge (8 Ko au tarif S3 Standard, 32 Ko au tarif d'archive). Des millions de petits fichiers coûtent plus cher à archiver qu'ils ne font économiser : regroupez-les d'abord (par exemple en archives quotidiennes).
- Faites expirer les versions non actuelles et abandonnez les chargements partitionnés incomplets : des coûts cachés fréquents dans les compartiments versionnés.

```json
{
  "Rules": [
    {
      "ID": "claims-scans-tiering",
      "Status": "Enabled",
      "Filter": { "And": { "Prefix": "scans/", "ObjectSizeGreaterThan": 131072 } },
      "Transitions": [
        { "Days": 30, "StorageClass": "GLACIER_IR" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 3650 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    },
    {
      "ID": "abort-stale-uploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

| Profil d'accès | Choix |
| --- | --- |
| Accès inconnu ou changeant, objets de 128 Ko ou plus | Intelligent-Tiering |
| Vieillissement prévisible (chaud pendant un mois, puis rarement lu, conservé 10 ans) | Transitions Lifecycle vers les classes Glacier |
| Rarement lu, mais doit être accessible en millisecondes quand il l'est | Glacier Instant Retrieval |
| Archive de conformité lue une fois par an, quelques heures acceptables | Glacier Deep Archive |
| Nombreux objets minuscules | Regrouper avant d'archiver, ou garder en Standard |

**La gestion du cycle de vie d'Amazon EFS** déplace les fichiers entre Standard, Infrequent Access (IA) et Archive. Par défaut : les fichiers sans accès depuis 30 jours passent en IA, depuis 90 jours en Archive. Par défaut, un fichier reste en IA ou en Archive quand il est lu ; réglez « transition vers Standard » sur **On first access** pour les fichiers sensibles à la latence. Les métadonnées restent toujours en Standard, et les nouvelles écritures arrivent en Standard et deviennent éligibles après 24 heures.

> **Piège d'examen.** Intelligent-Tiering n'est pas la réponse la moins chère pour des compartiments de très petits objets (ils ne quittent jamais Frequent Access) ni pour des données au vieillissement entièrement prévisible (une règle Lifecycle évite les frais de surveillance par objet).

<!-- section: block-storage | objectives: 3.4.2 -->
## Types de volumes en mode bloc et IOPS

| Attribut | gp3 | gp2 | io2 Block Express | io1 |
| --- | --- | --- | --- | --- |
| Taille | 1 Gio à 64 Tio | 1 Gio à 16 Tio | Jusqu'à 64 Tio | 4 Gio à 16 Tio |
| IOPS | 3 000 incluses ; jusqu'à 80 000 à raison de 500 IOPS par Gio | 3 par Gio (minimum 100, maximum 16 000 à 5 334 Gio) ; rafale à 3 000 sous 1 Tio | Jusqu'à 256 000 à raison de 1 000 IOPS par Gio | Jusqu'à 64 000 à raison de 50 IOPS par Gio |
| Débit | 125 Mio/s inclus ; jusqu'à 2 000 Mio/s à raison de 0,25 Mio/s par IOPS provisionnée | Jusqu'à 250 Mio/s | Jusqu'à 4 000 Mio/s | Jusqu'à 1 000 Mio/s |
| Modèle de performance | Provisionnée indépendamment de la taille | Liée à la taille, crédits de rafale | Provisionnée, latence moyenne inférieure à la milliseconde | Provisionnée |
| Durabilité | EBS standard | EBS standard | 99,999 % | 99,8 % à 99,9 % |

Décisions de coût :

- **De gp2 à gp3** : gp3 coûte jusqu'à 20 % de moins par Gio et découple les IOPS de la taille. Un volume gp2 de 2 Tio acheté pour ses 6 000 IOPS devient un volume gp3 plus petit avec 6 000 IOPS provisionnées, ou un gp3 de même taille avec moins d'IOPS si les métriques montrent qu'elles sont inutilisées. Elastic Volumes change le type sur place, sans détacher le volume.
- **io2 Block Express** seulement quand un volume unique a besoin de plus que ce que gp3 peut offrir, ou d'une latence constante inférieure à la milliseconde et d'une durabilité de 99,999 % (gros Oracle, SAP HANA, SQL Server).
- **Ajustez les IOPS provisionnées** avec les métriques CloudWatch et les recommandations EBS de Compute Optimizer ; des IOPS provisionnées inutilisées sont facturées chaque heure.
- Les charges séquentielles limitées par le débit (journaux, analyses big data) peuvent utiliser des volumes HDD (st1, sc1) à un prix par Gio plus bas quand la latence n'est pas critique.

```bash
aws ec2 modify-volume --volume-id vol-0a1b2c3d4e5f60718 --volume-type gp3 --iops 6000 --throughput 250
```

> **Conseil d'examen.** « Le volume le plus rentable qui soutient 10 000 IOPS sur 500 Gio » est un gp3 avec IOPS provisionnées : gp2 aurait besoin d'environ 3 334 Gio pour atteindre 10 000 IOPS, et io2 est tarifé pour une latence et une durabilité que l'énoncé ne demande pas.

<!-- section: database-capacity | objectives: 3.4.3 -->
## Modes de capacité des bases de données et capacité réservée

**Amazon DynamoDB.**

| Mode | Facturation | À choisir quand |
| --- | --- | --- |
| À la demande (par défaut, recommandé pour la plupart des charges) | Par requête de lecture et d'écriture | Trafic nouveau, en pics ou imprévisible ; tables souvent inactives |
| Provisionné avec auto scaling | Par heure de RCU et WCU provisionnées, utilisées ou non | Trafic stable avec une croissance prévisible et une forte utilisation |
| Provisionné plus capacité réservée | Paiement initial plus tarif horaire réduit sur 1 ou 3 ans | Socle stable à long terme ; pas pour la classe de table Standard-IA ni pour les WCU répliquées |

La classe de table Standard-IA réduit le prix du stockage pour les tables dont le coût est dominé par le stockage (anciennes commandes, journaux) ; Standard convient aux tables dominées par le débit. Les Database Savings Plans couvrent aussi DynamoDB.

**Les instances de base de données réservées Amazon RDS** sont une remise de facturation sur 1 ou 3 ans (No Upfront uniquement pour 1 an ; Partial et All Upfront pour les deux). Elles ne peuvent pas être annulées, s'appliquent aux déploiements Single-AZ et Multi-AZ, sont liées à la Région et au moteur, et sont partagées dans la famille de facturation consolidée. La flexibilité de taille au sein d'un type de classe d'instance s'applique à RDS for MySQL, MariaDB, PostgreSQL, Db2 et Oracle BYOL, pas à RDS for SQL Server ni à Oracle License Included.

**Amazon Aurora.**

| Choix | Faits |
| --- | --- |
| Aurora Standard | Paiement des instances, du stockage et des E/S par million de requêtes ; généralement moins cher quand les E/S représentent moins de 25 % des dépenses Aurora |
| Aurora I/O-Optimized | Aucuns frais d'E/S, prix des instances (environ 30 %) et du stockage plus élevés ; moins cher quand les E/S représentent 25 % ou plus des dépenses Aurora (jusqu'à 40 % d'économie). Passage vers ce mode une fois tous les 30 jours, retour à Standard à tout moment |
| Aurora Serverless v2 | Facturé à la seconde d'ACU (environ 2 Gio de mémoire par ACU) ; évolue par pas de 0,5 ACU et peut se mettre en pause à 0 ACU au repos ; pour une charge variable ou intermittente |
| Instances réservées Aurora | Jusqu'à 45 % (1 an) et 66 % (3 ans) ; flexibles en taille dans une famille ; achetez environ 30 % de RI en plus pour couvrir entièrement des instances I/O-Optimized |
| Stockage des sauvegardes | Gratuit jusqu'à 100 % de la taille de stockage du cluster pendant la période de conservation |

**Les Database Savings Plans** (jusqu'à 35 %, durée d'un an) couvrent les dernières générations provisionnées et l'usage sans serveur d'Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS et OpenSearch Service, quels que soient le moteur, la famille, la taille, la zone ou la Région. Préférez-les aux RI quand les moteurs ou les Régions vont changer, ou quand l'usage sans serveur doit être couvert.

| Exigence | Réponse |
| --- | --- |
| Cluster Aurora dont les E/S représentent 40 % de la facture | I/O-Optimized |
| Base de développement utilisée quelques heures par jour | Aurora Serverless v2 avec pause automatique |
| Parc RDS for PostgreSQL stable pendant trois ans, sans changement de moteur | Instances de base de données réservées sur 3 ans |
| Portefeuille qui passe de RDS à Aurora Serverless et DynamoDB cette année | Database Savings Plans |
| Table DynamoDB avec 5 000 écritures par seconde constantes pendant des années | Provisionné avec capacité réservée |

> **Piège d'examen.** La capacité réservée et les instances réservées ne suivent pas une charge vers un autre moteur, un autre mode ou une option sans serveur ; les Database Savings Plans, si. À l'inverse, une RI sur 3 ans offre la remise la plus forte pour un parc qui ne changera pas.

<!-- section: backup-retention | objectives: 3.4.4 -->
## Conservation des sauvegardes et de la reprise au coût le plus bas

**AWS Backup** centralise les politiques entre services, comptes (politiques de sauvegarde de l'organisation) et Régions.

- Conservation : de 1 jour à 100 ans pour les sauvegardes par instantané (ou indéfiniment) ; les sauvegardes continues pour la restauration à un instant donné conservent de 1 à 35 jours.
- Stockage à froid pour CloudFormation, DynamoDB avec fonctionnalités avancées, EBS (via EBS Snapshots Archive, uniquement pour des sauvegardes mensuelles ou moins fréquentes), EFS, SAP HANA sur EC2, Timestream et VMware. Les sauvegardes doivent rester au moins 90 jours dans le stockage à froid, donc l'expiration doit intervenir au moins 90 jours après la transition ; AWS recommande au moins 8 jours en stockage chaud.
- Les actions de copie envoient les sauvegardes vers une autre Région ou un autre compte avec leur propre cycle de vie, donc la copie de reprise peut passer au froid plus tôt que la sauvegarde principale.

```yaml
Resources:
  TieredBackupPlan:
    Type: AWS::Backup::BackupPlan
    Properties:
      BackupPlan:
        BackupPlanName: tiered-retention
        BackupPlanRule:
          - RuleName: daily-35-days
            TargetBackupVault: prod-vault
            ScheduleExpression: cron(0 3 * * ? *)
            Lifecycle:
              DeleteAfterDays: 35
          - RuleName: monthly-7-years
            TargetBackupVault: prod-vault
            ScheduleExpression: cron(0 4 1 * ? *)
            Lifecycle:
              MoveToColdStorageAfterDays: 30
              DeleteAfterDays: 2555
            CopyActions:
              - DestinationBackupVaultArn: arn:aws:backup:eu-central-1:444455556666:backup-vault:dr-vault
                Lifecycle:
                  MoveToColdStorageAfterDays: 30
                  DeleteAfterDays: 2555
```

**Amazon Data Lifecycle Manager (DLM)** automatise les instantanés EBS et les AMI basées sur EBS sans frais supplémentaires (vous payez les instantanés).

- Jusqu'à 4 planifications par politique ; conservation par nombre (1 à 1 000) ou par âge (1 jour à 100 ans).
- Archivage vers EBS Snapshots Archive (stockage jusqu'à 75 % moins cher) pour les politiques qui ciblent des volumes, une planification par politique, mensuelle ou annuelle (ou un cron d'au moins 28 jours) ; les instantanés archivés sont des instantanés complets conservés au moins 90 jours.
- Copie entre Régions vers jusqu'à trois Régions, chacune avec sa propre conservation ; le partage entre comptes exige des instantanés chiffrés avec une clé gérée par le client.
- La restauration rapide d'instantanés (fast snapshot restore, instantanés jusqu'à 16 Tio) est facturée à la minute et par zone : ne l'activez que pour les volumes dont le délai de restauration le justifie.

| Exigence | Outil |
| --- | --- |
| Une politique pour RDS, DynamoDB, EFS et EBS dans tous les comptes, avec verrouillage de coffre | AWS Backup avec des politiques de sauvegarde de l'organisation |
| Instantanés EBS horaires des volumes balisés, en garder 24, sans frais de service supplémentaires | Politique d'instantanés DLM |
| Garder des instantanés EBS mensuels pendant 7 ans au coût le plus bas | Planification mensuelle avec archivage vers EBS Snapshots Archive |
| Conservation de sept ans, restauration en quelques heures acceptable | Niveau de stockage à froid d'AWS Backup |

> **Piège d'examen.** Passer une sauvegarde au stockage à froid après 10 jours et la supprimer au jour 60 est invalide : le stockage à froid impose 90 jours minimum. Les sauvegardes quotidiennes conservées quelques semaines restent au chaud ; seules les sauvegardes mensuelles ou annuelles à longue conservation profitent du stockage à froid.

<!-- section: observability-costs | objectives: 3.4.5 -->
## Une observabilité rentable

**Les journaux** dominent généralement la facture. Faits (exemples USA Est) :

| Levier | Effet |
| --- | --- |
| Classe de journaux Essentials (anciennement Infrequent Access) | Ingestion à 0,25 USD par Go au lieu de 0,50 USD en Standard ; mêmes prix de stockage et de Logs Insights ; pas de filtres de métriques, de filtres d'abonnement, de Live Tail, de détection d'anomalies, de format de métriques intégrées ni de `GetLogEvents` ; classe fixée à la création du groupe de journaux |
| Politique de conservation | Par défaut, les groupes de journaux n'expirent jamais ; fixez une conservation par groupe (par exemple 30 jours à chaud) |
| Filtrer à la source | Niveaux de journalisation par environnement, échantillonnage des journaux de débogage, JSON structuré avec seulement les champs utiles |
| Journaux vendus (vended logs, par exemple VPC Flow Logs) | Prix de livraison par paliers qui descend de 0,50 USD à 0,05 USD par Go avec le volume ; livrez directement dans S3 quand seuls l'archivage et des requêtes Athena sont nécessaires |
| Archiver hors de CloudWatch | Exporter ou diffuser vers S3 (Firehose), puis S3 Lifecycle vers les classes Glacier |

**Métriques.** Les métriques personnalisées coûtent 0,30 USD par métrique et par mois pour les 10 000 premières, moins au-delà. Chaque combinaison unique de dimensions est une métrique distincte : une dimension comme l'identifiant de requête ou de client multiplie la facture. Agrégez plutôt :

- Publiez par groupe Auto Scaling ou par service, pas par instance ni par requête ; utilisez `aggregation_dimensions` de l'agent CloudWatch et un `metrics_collection_interval` plus long pour les hôtes non critiques.
- Utilisez Contributor Insights (0,50 USD par règle et par mois, première règle gratuite) pour les questions de type top N à forte cardinalité au lieu d'une métrique par clé.
- Le format de métriques intégrées (embedded metric format) transforme des lignes de journal en métriques mais facture à la fois l'ingestion des journaux et les métriques ; réservez-le aux métriques sur lesquelles vous déclenchez des alarmes.
- Les appels `GetMetricData` sont toujours facturés ; des outils tiers qui interrogent chaque métrique peuvent coûter plus que des flux de métriques (metric streams, 0,003 USD par tranche de 1 000 mises à jour) alimentant Firehose.

```json
{
  "agent": { "metrics_collection_interval": 300 },
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": { "AutoScalingGroupName": "${aws:AutoScalingGroupName}" },
    "aggregation_dimensions": [["AutoScalingGroupName"]],
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  }
}
```

**Conception multicomptes.** L'observabilité entre comptes partage métriques et journaux avec un compte de surveillance sans les copier, sans frais supplémentaires pour les journaux et les métriques ; les archives centrales utilisent des filtres d'abonnement vers Firehose et S3 au lieu de dupliquer les groupes de journaux dans chaque compte.

> **Conseil d'examen.** « Conserver des journaux d'audit pendant 7 ans au coût le plus bas, rarement interrogés » correspond à S3 avec Lifecycle vers Glacier Deep Archive et Athena, pas à la conservation de CloudWatch Logs. « Réduire le coût d'ingestion de journaux applicatifs verbeux consultés seulement pendant les incidents » correspond à la classe de journaux Essentials (quand aucun filtre de métriques ni abonnement n'est nécessaire) plus une conservation plus courte.

<!-- section: key-points -->
## Points clés

- Intelligent-Tiering pour un accès inconnu (objets de 128 Ko ou plus) ; Lifecycle pour un vieillissement prévisible ; durées minimales de 30, 90 et 180 jours ; les petits objets coûtent cher à archiver.
- EFS : IA après 30 jours, Archive après 90 par défaut ; les fichiers restent froids à la lecture sauf si On first access est réglé.
- gp3 : 3 000 IOPS et 125 Mio/s inclus, jusqu'à 80 000 IOPS et 2 000 Mio/s, jusqu'à 20 % moins cher que gp2 ; io2 Block Express pour 256 000 IOPS, une latence inférieure à la milliseconde et une durabilité de 99,999 %.
- DynamoDB à la demande par défaut ; provisionné plus capacité réservée pour les socles stables. RI RDS : flexibilité de taille sauf SQL Server et Oracle License Included.
- Aurora I/O-Optimized quand les E/S représentent 25 % ou plus des dépenses ; Serverless v2 peut se mettre en pause à 0 ACU ; les Database Savings Plans suivent l'usage entre moteurs et sans serveur.
- Le stockage à froid d'AWS Backup exige 90 jours ; DLM est gratuit, archive les instantanés mensuels, copie vers trois Régions.
- Observabilité : classe de journaux Essentials, conservation sur chaque groupe de journaux, S3 pour les longues archives, dimensions à faible cardinalité, agrégation, Contributor Insights.
