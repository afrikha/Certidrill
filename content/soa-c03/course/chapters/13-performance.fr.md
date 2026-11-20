Les questions de performance montrent une ressource trop lente, trop grosse ou trop chère, avec ses métriques, et demandent la modification la moins risquée : un type d'instance ou de volume, une méthode de transfert, une classe de stockage, un paramètre de système de fichiers, une fonctionnalité de base de données ou un placement. Ce chapitre associe chaque symptôme visible dans les métriques à son optimisation.

<!-- section: compute-rightsizing | objectives: 1.3.1 -->
## Redimensionner le calcul avec les métriques, les balises et les outils AWS

**AWS Compute Optimizer** analyse l'utilisation mesurée par CloudWatch et recommande de meilleures configurations pour les instances EC2, les groupes Auto Scaling, les volumes EBS, les fonctions Lambda, les services ECS sur Fargate, les bases de données RDS et Aurora, les passerelles NAT et les licences de logiciels commerciaux, et repère les ressources inactives.

- Rien n'est analysé tant que vous n'avez pas **choisi d'y adhérer** (opt in), pour un compte ou, depuis le compte de gestion, pour toute l'organisation.
- Il examine **14 jours** de métriques par défaut ; l'option payante **enhanced infrastructure metrics** porte cette durée à **93 jours** (utile pour les cycles mensuels).
- Résultats EC2 : **Under-provisioned** (au moins un élément parmi CPU, mémoire, réseau, EBS ou disque ne couvre pas le besoin), **Over-provisioned** (peut être réduit, rien n'est sous-dimensionné), **Optimized**. Chaque option affiche un **risque de performance** de très faible à très élevé et l'écart de prix ; une préférence peut inclure les types Graviton (arm64).
- La **mémoire** n'est analysée que sur les instances qui exécutent l'agent CloudWatch ; sans lui, une instance limitée par la mémoire peut être déclarée surdimensionnée.

```bash
aws compute-optimizer update-enrollment-status --status Active --include-member-accounts
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=Overprovisioned
```

**Trusted Advisor** signale aussi les instances EC2 peu utilisées et les volumes EBS sous-utilisés (toutes les vérifications exigent Business, Enterprise On-Ramp ou Enterprise Support).

Les **balises** relient les ressources à leurs responsables et aux actions : les balises de répartition des coûts ventilent le coût par application dans Cost Explorer, Tag Editor retrouve les ressources d'une application, les balises ciblent Run Command et Automation (redimensionner toutes les instances `Env=dev`), et la règle AWS Config `required-tags` les impose.

Appliquer une recommandation :

| Ressource | Comment la modifier |
| --- | --- |
| Instance unique basée sur EBS | Arrêter, changer le type, démarrer (ou `AWS-ResizeInstance`) ; les données du stockage d'instance sont perdues ; prévoyez l'interruption |
| Groupe Auto Scaling | Nouvelle version du modèle de lancement avec le nouveau type, puis une **actualisation d'instances** (instance refresh, remplacement progressif) |
| Passage à Graviton | Une nouvelle AMI arm64 et des logiciels compilés pour arm64 ; changer seulement le type échoue avec une AMI x86 |
| Instance T toujours à court de crédits | Un type à performances fixes, ou le mode illimité si les rafales sont courtes |
| Lambda | Ajuster la mémoire (le CPU suit) comme le suggère Compute Optimizer |

```bash
aws ec2 stop-instances --instance-ids i-0abc1234def567890
aws ec2 modify-instance-attribute --instance-id i-0abc1234def567890 \
  --instance-type "{\"Value\": \"m7i.large\"}"
aws ec2 start-instances --instance-ids i-0abc1234def567890
```

> **Piège d'examen.** « Réduire la taille d'après le seul CPU » est un piège quand l'application est limitée par la mémoire. Installez d'abord l'agent CloudWatch pour que Compute Optimizer et vos alarmes voient la mémoire.

<!-- section: ebs-performance | objectives: 1.3.2 -->
## Analyser et optimiser les performances d'EBS

EBS envoie gratuitement les métriques des volumes à `AWS/EBS` chaque minute tant que le volume est attaché :

| Métrique | Comment la lire |
| --- | --- |
| `VolumeReadOps`, `VolumeWriteOps` (Sum) | IOPS = (opérations de lecture + d'écriture) ÷ période en secondes |
| `VolumeReadBytes`, `VolumeWriteBytes` | Débit ; octets ÷ opérations donne la taille des E/S |
| `VolumeTotalReadTime` ÷ `VolumeReadOps` | Latence moyenne par lecture (idem pour les écritures) |
| `VolumeQueueLength` | Requêtes en attente ; durablement élevée avec une latence élevée, le volume est le goulot d'étranglement |
| `VolumeIdleTime` | Secondes sans E/S ; un volume toujours inactif est candidat à la suppression |
| `BurstBalance` | Crédits restants de gp2 (E/S) et de st1/sc1 (débit) ; à 0, les performances retombent au niveau de base |
| `VolumeThroughputPercentage`, `VolumeConsumedReadWriteOps` | Volumes à IOPS provisionnées uniquement : part des IOPS provisionnées livrée et consommée |
| `VolumeAvgIOPS`, `VolumeAvgThroughput`, `VolumeAvgReadLatency`, `VolumeAvgWriteLatency` | Moyennes par minute, sur les instances Nitro |
| `VolumeIOPSExceededCheck`, `VolumeThroughputExceededCheck` | 1 quand l'application a tenté de dépasser les IOPS ou le débit provisionnés du volume |

L'instance a ses propres limites EBS, dans `AWS/EC2` : `InstanceEBSIOPSExceededCheck` et `InstanceEBSThroughputExceededCheck` (Nitro), et `EBSIOBalance%`, `EBSByteBalance%` pour les petites tailles dont la bande passante EBS fonctionne en rafale.

| Diagnostic | Correction |
| --- | --- |
| Volume gp2, `BurstBalance` tombe à 0 en pointe | Passez en **gp3** et provisionnez les IOPS nécessaires (gp3 inclut 3 000 IOPS et 125 Mio/s quelle que soit la taille, jusqu'à 80 000 IOPS et 2 000 Mio/s), en général moins cher |
| `VolumeIOPSExceededCheck` = 1 | Augmentez les IOPS ou le débit provisionnés du volume, ou passez à io2 Block Express |
| `InstanceEBSIOPSExceededCheck` = 1 alors que le volume a de la marge | L'instance est la limite : choisissez un type avec plus de bande passante EBS |
| Premières lectures lentes sur un volume restauré depuis un instantané | Les blocs sont chargés depuis S3 au premier accès : activez la restauration rapide d'instantanés (fast snapshot restore), définissez un débit d'initialisation du volume (100 à 300 Mio/s) à la création, ou lisez tous les blocs avec `fio` ou `dd` |
| Volume io1/io2 avec un `VolumeConsumedReadWriteOps` faible | Surdimensionné : baissez les IOPS ou passez à gp3 |
| st1 utilisé pour de petites E/S aléatoires | Mauvais support : SSD (gp3) |

**Elastic Volumes** modifie la taille, le type, les IOPS et le débit pendant que le volume est utilisé. Vous pouvez modifier un volume jusqu'à **quatre fois sur une période glissante de 24 heures**, chaque modification doit atteindre `completed` avant la suivante, la taille ne peut qu'augmenter, une augmentation de taille est utilisable dès l'état `optimizing`, et vous devez ensuite étendre la partition et le système de fichiers.

```bash
aws ec2 modify-volume --volume-id vol-0abc1234def567890 \
  --volume-type gp3 --iops 8000 --throughput 400
aws ec2 describe-volumes-modifications --volume-ids vol-0abc1234def567890
sudo growpart /dev/nvme1n1 1 && sudo xfs_growfs -d /data
```

> **Piège d'examen.** Aucune métrique ne révèle un volume réductible : un volume EBS ne peut pas être rétréci. Réduire un volume surdimensionné, c'est en créer un plus petit et copier les données avec `rsync` ou `robocopy`.

<!-- section: s3-performance | objectives: 1.3.3 -->
## Performances de transfert et de stockage S3

- **Taux de requêtes** : au moins 3 500 écritures et 5 500 lectures par seconde et par préfixe. Des erreurs `503 Slow Down` signalent trop de requêtes sur un préfixe : relancez avec backoff et répartissez les clés sur plus de préfixes.
- **Chargement partitionné** (multipart upload) : recommandé à partir de 100 Mo, parties de 5 Mio à 5 Gio, jusqu'à 10 000 parties, objets jusqu'à 48,8 Tio. Les parties se chargent en parallèle et une partie en échec est relancée seule. L'AWS CLI bascule automatiquement au-delà de `multipart_threshold`.
- Les **récupérations par plage d'octets** (byte-range fetches) téléchargent des parties d'un objet en parallèle.

```bash
aws configure set default.s3.max_concurrent_requests 20
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB
```

| Exigence | Réponse |
| --- | --- |
| Des utilisateurs sur plusieurs continents chargent lentement de gros fichiers dans un compartiment | **S3 Transfer Acceleration** : emplacements périphériques, puis réseau AWS |
| Migrer ou synchroniser des données NFS, SMB, HDFS ou objet vers S3, EFS ou FSx avec vérification de l'intégrité des données | Tâche **AWS DataSync** (agent sur site), planifiée, à bande passante limitée, vérifiée |
| De nombreux téléchargements répétés dans le monde entier | CloudFront devant le compartiment (Transfer Acceleration ne met rien en cache) |
| Des objets qui refroidissent après un âge connu | Transitions et expirations **S3 Lifecycle** |
| Un modèle d'accès inconnu ou changeant | S3 Intelligent-Tiering |
| Vue de l'utilisation et de l'activité par compartiment à l'échelle de l'organisation | S3 Storage Lens |

Transfer Acceleration exige un nom de compartiment conforme au DNS **sans point**, le point de terminaison `bucket-name.s3-accelerate.amazonaws.com` et des requêtes de type hébergement virtuel ; le gain peut mettre 20 minutes à apparaître après `put-bucket-accelerate-configuration`.

```json
{
  "Rules": [
    {
      "ID": "logs-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 180, "StorageClass": "GLACIER_IR" }
      ],
      "Expiration": { "Days": 730 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

Règles de cycle de vie à retenir : les objets doivent rester 30 jours dans S3 Standard avant de passer en Standard-IA ou One Zone-IA ; les objets de moins de 128 Ko ne sont pas transférés par défaut ; **AbortIncompleteMultipartUpload** supprime les parties invisibles des chargements échoués, qui sont facturées.

> **Piège d'examen.** Transfer Acceleration échoue pour un compartiment nommé `media.example.com` : le nom contient des points. La correction est un nouveau compartiment au nom conforme, pas un autre point de terminaison.

<!-- section: shared-storage | objectives: 1.3.4 -->
## Choisir et optimiser le stockage partagé

| Exigence | Service |
| --- | --- |
| Des clients Linux partagent des fichiers en NFS, la capacité s'ajuste seule, régional ou One Zone | Amazon EFS |
| Des clients Windows en SMB, Active Directory, ACL Windows, DFS | Amazon FSx for Windows File Server |
| HPC ou entraînement ML avec un débit parallèle massif, latence inférieure à la milliseconde, lié à un compartiment S3 | Amazon FSx for Lustre |
| NFS, SMB et iSCSI sur les mêmes données, instantanés NetApp, SnapMirror, clonage | Amazon FSx for NetApp ONTAP |
| Un accès fichier à des données déjà stockées dans un compartiment S3, sans les copier ailleurs | Amazon S3 Files |

**Amazon S3 Files** est un système de fichiers partagé bâti sur EFS et lié à un compartiment S3 ou à un préfixe. EC2, Lambda, EKS et ECS le montent en NFS 4.1 ou 4.2 (cohérence lecture après écriture, verrouillage, autorisations POSIX). Seul le jeu de travail actif est copié sur le stockage hautes performances (fichiers de moins de 128 Kio par défaut, expulsés après 30 jours sans lecture, réglable de 1 à 365) ; les grandes lectures sont servies directement depuis S3. Les modifications se synchronisent dans les deux sens avec le compartiment. Créez une cible de montage par AZ.

**Performances et coût d'EFS** :

| Paramètre ou métrique | Ce qu'il faut savoir |
| --- | --- |
| Mode de débit | **Elastic** (automatique, paiement à l'usage, charges en pics), **Provisioned** (fixe, indépendant de la taille), **Bursting** (croît avec les données stockées, crédits de rafale) |
| `BurstCreditBalance` qui tombe à 0 et `PermittedThroughput` qui baisse | Mode Bursting épuisé : passez en Elastic, ou en Provisioned pour un besoin stable et connu |
| `MeteredIOBytes` proche de `PermittedThroughput` | Le système de fichiers utilise tout le débit autorisé |
| `PercentIOLimit` | À quel point un système de fichiers General Purpose est proche de sa limite d'E/S |
| `ClientConnections` | Une par instance montée avec le client standard |
| Gestion du cycle de vie | Par défaut, les fichiers non lus depuis 30 jours passent en **Infrequent Access**, après 90 jours en **Archive** ; **au premier accès** (on first access) les ramène en Standard pour les charges sensibles à la latence ; une seule politique par système de fichiers |

```bash
aws efs put-lifecycle-configuration --file-system-id fs-0abc1234def567890 \
  --lifecycle-policies TransitionToIA=AFTER_30_DAYS TransitionToArchive=AFTER_90_DAYS \
  TransitionToPrimaryStorageClass=AFTER_1_ACCESS
```

Les systèmes de fichiers FSx se dimensionnent explicitement : augmentez le stockage et la **capacité de débit** (Windows File Server, ONTAP) quand les métriques montrent la limite ; FSx for Lustre propose des déploiements scratch (non répliqués) et persistants.

> **Conseil d'examen.** « La plupart des fichiers sont rarement lus mais certains sont rouverts souvent et doivent être rapides » mène à la gestion du cycle de vie EFS avec retour en Standard au premier accès, pas à un second système de fichiers.

<!-- section: rds-performance | objectives: 1.3.5 -->
## Surveiller et ajuster les performances d'Amazon RDS

| Métrique CloudWatch | Une valeur haute ou basse signifie |
| --- | --- |
| `CPUUtilization` | Requêtes limitées par le calcul, ou classe d'instance trop petite |
| `FreeableMemory`, `SwapUsage` | Pression mémoire : une classe avec plus de mémoire, moins de connexions |
| `DatabaseConnections` | Rafales de connexions venant de Lambda ou de nombreux serveurs d'applications : RDS Proxy |
| `ReadIOPS`, `WriteIOPS`, `ReadLatency`, `WriteLatency`, `DiskQueueDepth` | Limité par le stockage : provisionnez plus d'IOPS (gp3 ou io2) |
| `FreeStorageSpace` | Mise à l'échelle automatique du stockage avec un seuil maximal, ou une augmentation |
| `ReplicaLag` | Le réplica ne suit pas : classe de réplica plus grande, moins d'écritures longues |
| `BurstBalance` | Stockage gp2 à court de crédits : passez en gp3 |

**Enhanced Monitoring** ajoute les métriques du système d'exploitation et la liste des processus toutes les 1 à 60 secondes (un rôle IAM de surveillance est nécessaire). **Performance Insights**, désormais documenté comme **CloudWatch Database Insights** pour RDS, mesure la **charge de base de données** (DB load) en **sessions actives moyennes** (AAS), collectée chaque seconde et ventilée par **événements d'attente**, **principales requêtes SQL**, hôtes et utilisateurs. Une charge au-dessus de la ligne **Max vCPU** signifie que des sessions attendent le CPU. Sept jours d'historique sont inclus ; une rétention plus longue (1 à 24 mois) est payante. Les **recommandations proactives**, sur la page **Recommendations** de RDS, apparaissent quand les métriques franchissent des seuils appris à partir du comportement de référence de la base ; elles exigent les métriques détaillées par requête et les compteurs avec une rétention de niveau payant.

**RDS Proxy** maintient un pool de connexions à la base et les réutilise, met en file d'attente ou limite les connexions clientes qu'il ne peut pas servir, et conserve les connexions des applications pendant un basculement Multi-AZ. Les faits que l'examen utilise :

- Même VPC que la base, **jamais accessible publiquement** ; point de terminaison par défaut dans deux AZ.
- L'authentification IAM peut être imposée aux clients ; le proxy utilise des secrets Secrets Manager ou l'authentification de base de données IAM.
- Sur des instances de base de données RDS, il sert l'instance d'écriture, pas un réplica en lecture.
- L'**épinglage** (pinning : état de session, instructions de plus de 16 Ko) lie un client à une connexion : surveillez `DatabaseConnectionsCurrentlySessionPinned`.

```bash
aws rds create-db-proxy --db-proxy-name orders-proxy --engine-family MYSQL \
  --auth AuthScheme=SECRETS,SecretArn=arn:aws:secretsmanager:eu-west-1:111122223333:secret:orders-db,IAMAuth=REQUIRED \
  --role-arn arn:aws:iam::111122223333:role/orders-proxy-secrets \
  --vpc-subnet-ids subnet-0aaa1111bbbb2222c subnet-0ddd3333eeee4444f --require-tls
aws rds register-db-proxy-targets --db-proxy-name orders-proxy \
  --db-instance-identifiers orders-db
```

> **Piège d'examen.** « Les fonctions Lambda épuisent les connexions à la base en pointe », c'est RDS Proxy, pas un réplica en lecture (il ajoute de la capacité de lecture, pas des connexions à l'instance d'écriture) ni une classe d'instance plus grande.

<!-- section: ec2-optimization | objectives: 1.3.6 -->
## Optimiser les instances EC2, leur stockage et leur réseau

| Groupe de placement | Disposition | Usage et limites |
| --- | --- | --- |
| **Cluster** | Instances regroupées au plus près dans une AZ | Latence minimale et débit par flux maximal pour le HPC et les tâches fortement couplées ; une panne matérielle peut toutes les toucher |
| **Partition** | Groupes d'instances sur des racks distincts, jusqu'à 7 partitions par AZ | Grands systèmes distribués (HDFS, Cassandra, Kafka) qui placent leurs réplicas par partition |
| **Spread** (répartition) | Chaque instance sur du matériel distinct, jusqu'à 7 instances en cours d'exécution par AZ et par groupe | Quelques instances critiques qui ne doivent pas tomber ensemble |

- **Capacité insuffisante** dans un groupe de placement cluster : lancez toutes les instances en une seule requête avec un seul type, ou arrêtez puis démarrez toutes les instances du groupe.
- Pour placer une instance existante dans un groupe : arrêtez-la, `modify-instance-placement`, démarrez-la.
- **Mise en réseau améliorée** avec le pilote ENA (EFA pour le HPC et le ML qui contournent le système d'exploitation), **trames jumbo** (MTU 9001) à l'intérieur du VPC, et une taille supérieure pour plus de bande passante et de paquets par seconde.
- La bande passante **optimisée pour EBS** est dédiée sur les types de génération actuelle ; le **stockage d'instance** NVMe offre la latence la plus faible pour des données temporaires, perdues à l'arrêt de l'instance.

Quand le réseau est suspect, lisez les compteurs du pilote ENA avec `ethtool -S` et publiez-les avec l'agent CloudWatch :

| Compteur | Signification |
| --- | --- |
| `bw_in_allowance_exceeded`, `bw_out_allowance_exceeded` | Paquets mis en file ou abandonnés : la bande passante globale de l'instance a été dépassée |
| `pps_allowance_exceeded` | Limite de paquets par seconde dépassée |
| `conntrack_allowance_exceeded` | Trop de connexions suivies (suivi des groupes de sécurité) : les nouvelles connexions échouent |
| `linklocal_allowance_exceeded` | Trop de paquets vers Amazon DNS, le service de métadonnées d'instance ou Time Sync |

```bash
aws ec2 create-placement-group --group-name hpc-cluster --strategy cluster
aws ec2 stop-instances --instance-ids i-0abc1234def567890
aws ec2 modify-instance-placement --instance-id i-0abc1234def567890 --group-name hpc-cluster
aws ec2 start-instances --instance-ids i-0abc1234def567890
ethtool -S eth0 | grep allowance
```

> **Conseil d'examen.** Un `bw_out_allowance_exceeded` en hausse avec un CPU normal signifie que la taille de l'instance plafonne la bande passante : choisissez un type plus grand ou optimisé pour le réseau.

<!-- section: key-points -->
## Points clés

- Compute Optimizer : adhésion préalable, 14 jours (93 avec enhanced infrastructure metrics), la mémoire exige l'agent CloudWatch ; appliquez par arrêt-modification-démarrage ou par actualisation d'instances.
- EBS : IOPS à partir de `VolumeReadOps` + `VolumeWriteOps` ; `BurstBalance` à 0 sur gp2 mène à gp3 ; les vérifications de dépassement distinguent la limite du volume de celle de l'instance ; Elastic Volumes jusqu'à quatre modifications par 24 heures, jamais plus petit.
- S3 : 3 500 écritures / 5 500 lectures par seconde et par préfixe ; chargement partitionné dès 100 Mo ; Transfer Acceleration exige un nom sans point ; DataSync pour les migrations ; abandon des chargements incomplets.
- Stockage partagé : EFS, FSx for Windows, FSx for Lustre, FSx for ONTAP, S3 Files ; débit Elastic d'EFS, cycle de vie vers IA et Archive.
- RDS : Enhanced Monitoring pour le système, Database Insights pour la charge par attentes et requêtes SQL, recommandations proactives avec rétention payante, RDS Proxy contre les rafales de connexions.
- EC2 : groupes de placement cluster, partition et spread ; ENA, trames jumbo ; compteurs d'allocation ENA pour les limites réseau.
