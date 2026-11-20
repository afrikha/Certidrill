Les questions de performance sur le stockage décrivent une charge de travail (une base de données, un système de fichiers partagé, un lac de données, un serveur de fichiers sur site) et une contrainte (IOPS, débit, latence, accès simultané, croissance, protocole), puis demandent quel service et quelle configuration y répondent. Partez du type de stockage, choisissez le service, puis réglez la configuration : type de volume, classe de stockage, mode de débit ou type de déploiement.

<!-- section: storage-types | objectives: 3.1.3 -->
## Stockage en mode bloc, fichier et objet

| Type | Unité d'accès | Partagé par | Services AWS | Charge de travail typique |
| --- | --- | --- | --- | --- |
| Bloc | Blocs de taille fixe sur un volume, formaté par le système d'exploitation | Une instance (Multi-Attach io1/io2 : jusqu'à 16 instances Nitro dans une même AZ) | Amazon EBS, stockage d'instance EC2 (instance store) | Volumes de démarrage, bases de données relationnelles et NoSQL sur EC2, applications transactionnelles |
| Fichier | Fichiers et répertoires via NFS ou SMB, avec verrouillage | Des milliers de clients à la fois | Amazon EFS, Amazon FSx (Windows File Server, Lustre, NetApp ONTAP, OpenZFS) | Contenu partagé, répertoires personnels, applications migrées telles quelles, HPC |
| Objet | Objets entiers adressés par clé via HTTPS (API) | Un nombre quelconque de clients, depuis n'importe quel réseau | Amazon S3 | Lacs de données, médias, sauvegardes, contenu web statique, journaux |

Les caractéristiques qui décident des réponses d'examen :

- Le **bloc** offre la latence la plus faible et c'est le seul type qu'un moteur de base de données ou un disque de démarrage utilise directement. Un volume EBS réside dans **une seule zone de disponibilité** et s'attache à des instances de cette AZ. Les instantanés (snapshots) sont stockés dans S3 et peuvent être copiés vers d'autres AZ et Régions.
- Le **stockage d'instance** est physiquement attaché à l'hôte : le plus d'IOPS pour le prix, mais **temporaire**. Utilisez-le pour des tampons, des caches, des données de travail et des données répliquées sur une flotte, jamais pour l'unique copie.
- Le **fichier** est la réponse dès que plusieurs instances (ou conteneurs, ou serveurs sur site) doivent lire et écrire **les mêmes fichiers** simultanément avec une interface de fichiers POSIX ou Windows.
- Le stockage **objet** s'étend sans limite, s'utilise par API (il n'est pas monté comme un disque par défaut) et remplace un objet dans son intégralité : pas de mise à jour partielle sur place.

> **Piège d'examen.** « Plusieurs instances EC2 dans différentes zones de disponibilité doivent partager les mêmes fichiers » n'est jamais EBS : Multi-Attach ne fonctionne que dans une AZ et exige un système de fichiers en cluster. La réponse est EFS (Linux, NFS) ou FSx for Windows File Server (SMB).

<!-- section: storage-services | objectives: 3.1.2 -->
## Choisir un service de stockage

| Exigence | Service |
| --- | --- |
| Disque persistant à faible latence pour une instance EC2, base de données sur EC2 | Amazon EBS |
| E/S aléatoires maximales pour des données temporaires, perdues à l'arrêt de l'instance | Stockage d'instance EC2 |
| Système de fichiers Linux partagé (NFS), élastique, multi-AZ, sans capacité à gérer | Amazon EFS |
| Partages de fichiers Windows (SMB), Active Directory, ACL Windows | Amazon FSx for Windows File Server |
| HPC, entraînement ML, système de fichiers parallèle inférieur à la milliseconde lié à S3 | Amazon FSx for Lustre |
| Migrer des charges NetApp ; NFS, SMB et iSCSI sur les mêmes données ; SnapMirror, FlexClone | Amazon FSx for NetApp ONTAP |
| Migrer un serveur de fichiers ZFS ou NFS Linux, instantanés et clones | Amazon FSx for OpenZFS |
| Stockage objet illimité, lac de données, origine de site web statique, cible de sauvegarde | Amazon S3 |
| Accès objet en quelques millisecondes, au plus près du calcul | S3 Express One Zone (compartiment de répertoires) |

Les notes que l'examen exploite :

- **EFS** est réservé à Linux (NFSv4). Les systèmes de fichiers régionaux stockent les données sur plusieurs AZ ; les systèmes de fichiers One Zone les stockent dans une AZ pour un coût plus faible. Classes de stockage : EFS Standard (SSD), EFS Infrequent Access et EFS Archive, avec une gestion du cycle de vie entre elles.
- **FSx for Windows File Server** rejoint un Active Directory (AWS Managed Microsoft AD ou autogéré), propose Single-AZ ou Multi-AZ (serveur de fichiers de secours dans une autre AZ) et un stockage SSD ou HDD.
- **FSx for NetApp ONTAP** est la réponse multiprotocole (clients Linux, Windows et macOS sur le même volume) et déplace automatiquement les données froides vers un niveau de pool de capacité (capacity pool).

> **Conseil d'examen.** Le protocole est le filtre le plus rapide : SMB plus Active Directory, c'est FSx for Windows File Server ; NFS pour Linux sans administration, c'est EFS ; « parallèle », « HPC » ou « traiter des données S3 comme des fichiers », c'est FSx for Lustre ; « NetApp » ou iSCSI plus NFS plus SMB, c'est FSx for NetApp ONTAP.

<!-- section: ebs-performance | objectives: 3.1.4 -->
## Types de volumes Amazon EBS et performances

| Type de volume | Support | Taille | IOPS max. par volume | Débit max. par volume | Usage |
| --- | --- | --- | --- | --- | --- |
| gp3 | SSD | 1 Gio–64 Tio | 80 000 | 2 000 Mio/s | Choix par défaut : démarrage, dev/test, la plupart des bases de données |
| gp2 | SSD | 1 Gio–16 Tio | 16 000 | 250 Mio/s | Ancien type à usage général ; performances liées à la taille |
| io2 Block Express | SSD | 4 Gio–64 Tio | 256 000 | 4 000 Mio/s | Bases de données critiques, latence inférieure à la milliseconde, durabilité de 99,999 % |
| io1 | SSD | 4 Gio–16 Tio | 64 000 | 1 000 Mio/s | Ancien type à IOPS provisionnées |
| st1 | HDD | 125 Gio–16 Tio | 500 | 500 Mio/s | Grosses lectures et écritures séquentielles : big data, traitement de journaux, entrepôts de données |
| sc1 | HDD | 125 Gio–16 Tio | 250 | 250 Mio/s | Données séquentielles froides, rarement lues, au coût le plus bas |

Comment obtenir les performances :

- **gp3** : une base de **3 000 IOPS et 125 Mio/s** est incluse quelle que soit la taille. Les IOPS supplémentaires (jusqu'à 500 par Gio) et le débit supplémentaire (jusqu'à 0,25 Mio/s par IOPS provisionnée) se provisionnent et se facturent **indépendamment de la capacité**. Pas de crédits de rafale.
- **gp2** : 3 IOPS par Gio (minimum 100, maximum 16 000 atteint à 5 334 Gio) ; les volumes de moins de 1 Tio montent en rafale à 3 000 IOPS grâce aux crédits d'E/S. Migrer de gp2 vers gp3 donne en général plus de performances pour moins cher.
- **io2 Block Express** : jusqu'à 1 000 IOPS par Gio ; les 256 000 IOPS complètes uniquement sur des instances basées sur Nitro. io1 et io2 prennent en charge **Multi-Attach** (jusqu'à 16 instances Nitro dans la même AZ).
- **st1 et sc1** se mesurent en Mio/s pour des E/S séquentielles de grande taille (1 Mio) ; ils **ne peuvent pas servir de volume de démarrage** et sont mauvais en petites E/S aléatoires.
- L'instance limite le volume : choisissez un type d'instance **optimisé pour EBS** avec une bande passante EBS suffisante, sinon le volume n'atteint jamais ses valeurs provisionnées.

| Exigence | Réponse |
| --- | --- |
| Une base de données exige 20 000 IOPS sur un volume de 200 Gio, au meilleur coût | gp3 avec 20 000 IOPS provisionnées |
| Plus de 80 000 IOPS, ou latence inférieure à la milliseconde pour une base critique | io2 Block Express sur une instance Nitro |
| Débit séquentiel pour une charge Hadoop ou de journaux, coût par Gio le plus bas | st1 |
| Données d'archive lues quelques fois par an sur un volume en mode bloc | sc1 |
| Des millions d'IOPS aléatoires pour un cache temporaire | Stockage d'instance (NVMe) sur une instance optimisée pour le stockage |

> **Piège d'examen.** Sur gp2, le seul moyen d'obtenir plus d'IOPS est un volume plus grand ; sur gp3, vous augmentez les IOPS sans payer de capacité inutile. Une question qui dit « le volume est surdimensionné uniquement pour obtenir des IOPS » mène à gp3.

<!-- section: s3-performance | objectives: 3.1.4 -->
## Performances d'Amazon S3

- Taux de requêtes : au moins **3 500 requêtes PUT/COPY/POST/DELETE et 5 500 GET/HEAD par seconde et par préfixe partitionné**, sans limite du nombre de préfixes. Répartissez les clés sur plusieurs préfixes et parallélisez pour multiplier le taux (10 préfixes permettent environ 55 000 lectures par seconde). Pendant que S3 monte en charge, les clients peuvent recevoir des erreurs **503 Slow Down** : réessayez avec un délai exponentiel.
- **Chargement partitionné (multipart upload)** : bonne pratique pour les objets de 100 Mo ou plus ; les parties se chargent en parallèle et une partie en échec est renvoyée seule (jusqu'à 10 000 parties).
- **Récupérations par plage d'octets (byte-range fetches)** : téléchargez en parallèle des parties d'un gros objet, ou seulement la partie utile.
- **S3 Transfer Acceleration** : fait passer les chargements et téléchargements par les emplacements périphériques CloudFront puis par le réseau AWS ; pour des clients éloignés de la Région du compartiment.
- **Amazon CloudFront** ou **ElastiCache** devant S3 : pour de nombreuses lectures répétées, un débit supérieur par connexion ou une latence de quelques millisecondes.
- **S3 Express One Zone** : compartiments de répertoires dans **une AZ** que vous choisissez, accès constant en quelques millisecondes, accès aux données jusqu'à 10 fois plus rapide et coûts de requêtes inférieurs de 80 % par rapport à S3 Standard ; placez-le dans l'AZ du calcul EC2, ECS ou EKS. Pas pour des données qui doivent survivre à la perte d'une AZ.

> **Piège d'examen.** Transfer Acceleration accélère les transferts longue distance vers un compartiment ; il ne met rien en cache. Des téléchargements répétés par des utilisateurs du monde entier appellent CloudFront.

<!-- section: file-performance | objectives: 3.1.2, 3.1.4 -->
## Réglages de performances d'EFS et FSx

**Amazon EFS**

| Réglage | Options | Choix |
| --- | --- | --- |
| Mode de performance | General Purpose (par défaut, latence la plus faible), Max I/O (génération précédente) | General Purpose pour tous les systèmes de fichiers ; Max I/O n'est pris en charge ni avec le débit Elastic ni en One Zone |
| Mode de débit | Elastic, Provisioned, Bursting | Elastic pour des charges en pics ou imprévisibles (paiement à l'usage) ; Provisioned quand le besoin de débit est connu et supérieur à ce que permet la taille ; Bursting évolue avec les données stockées (base de 50 Kio/s par Gio) |

Un système de fichiers en mode Bursting qui épuise ses crédits de rafale ralentit : passez-le en Elastic, ou en Provisioned pour un débit stable et connu. Après un passage en Provisioned ou une modification de la valeur, vous devez attendre 24 heures avant de la diminuer ou de revenir en arrière.

**Amazon FSx for Lustre**

| Type de déploiement | Comportement | Usage |
| --- | --- | --- |
| Scratch | Données non répliquées, perdues si un serveur de fichiers tombe en panne | Traitement à court terme, le moins cher par tâche |
| Persistent | Données répliquées, serveurs de fichiers remplacés en cas de panne | Charges de longue durée, stockage à plus long terme |

FSx for Lustre offre une latence inférieure à la milliseconde, jusqu'à plusieurs To/s et des millions d'IOPS. Une **association de référentiel de données** avec un compartiment S3 présente les objets comme des fichiers, les charge au premier accès et peut exporter les résultats vers S3. Classes de stockage : SSD (petites E/S aléatoires, latence constante), HDD (charges axées sur le débit, cache de lecture SSD facultatif) et Intelligent-Tiering (élastique, avec cache de lecture SSD facultatif).

**FSx for Windows File Server et FSx for NetApp ONTAP** permettent de dimensionner séparément la capacité de stockage, les IOPS SSD et la capacité de débit, puis de les modifier.

> **Conseil d'examen.** « Traiter des millions de fichiers d'un lac de données S3 avec un cluster HPC, puis réécrire les résultats dans S3 », c'est FSx for Lustre lié au compartiment, en général en déploiement Scratch quand les données sont déjà protégées dans S3.

<!-- section: hybrid-storage | objectives: 3.1.1 -->
## Solutions de stockage hybride

| Exigence | Service |
| --- | --- |
| Des applications sur site écrivent des fichiers via NFS ou SMB, données stockées comme objets S3, cache local pour les données récentes | AWS Storage Gateway, S3 File Gateway |
| Des applications sur site utilisent des volumes en mode bloc iSCSI, données principales dans AWS, données fréquentes en cache local | Volume Gateway, volumes mis en cache |
| Volumes iSCSI conservés entièrement sur site avec sauvegarde asynchrone vers AWS sous forme d'instantanés EBS | Volume Gateway, volumes stockés |
| Remplacer des bandes physiques sans changer le logiciel de sauvegarde | Tape Gateway (bibliothèque de bandes virtuelles, bandes archivées dans les classes S3 Glacier) |
| Transfert en ligne, ponctuel ou planifié, de gros jeux de données entre le site (NFS, SMB, HDFS, objet), d'autres clouds et S3, EFS ou FSx | AWS DataSync |
| Des partenaires échangent des fichiers en SFTP, FTPS ou FTP vers S3 ou EFS | AWS Transfer Family |
| Accès aux fichiers à faible latence depuis des agences Windows vers FSx for Windows File Server | FSx for Windows File Server directement via Direct Connect ou Site-to-Site VPN |
| Les données doivent rester sur site pour la latence ou la résidence, mais utiliser des services AWS | AWS Outposts (EBS et S3 on Outposts) |
| NetApp sur site répliqué vers AWS | FSx for NetApp ONTAP avec SnapMirror |

- Storage Gateway s'exécute comme machine virtuelle (VMware ESXi, Hyper-V, KVM, Nutanix), appliance matérielle ou instance EC2. Le **cache local** donne une faible latence aux applications sur site pendant que les données résident dans AWS.
- **DataSync** déplace les données (un agent sur site lit la source, les transferts sont chiffrés, vérifiés et parallèles, via Internet ou Direct Connect) ; **Storage Gateway** continue d'offrir un accès local. Une question qui dit « migrer, puis retirer le NAS », c'est DataSync ; « continuer à utiliser le partage depuis le bureau », c'est Storage Gateway.

> **Piège d'examen.** Amazon FSx File Gateway n'est plus proposé aux nouveaux clients, et les appareils AWS Snow Family ne peuvent plus être commandés. Ne les choisissez pas pour une nouvelle conception : accédez directement à FSx for Windows File Server et transférez en ligne avec DataSync.

<!-- section: storage-scaling | objectives: 3.1.5 -->
## Un stockage qui suit l'évolution des besoins

| Service | Comment il grandit | Ce que vous gérez |
| --- | --- | --- |
| Amazon S3 | Objets et capacité illimités ; le taux de requêtes évolue par préfixe | Rien ; la conception des clés pour des taux très élevés |
| Amazon EFS | S'agrandit et se réduit automatiquement à mesure que des fichiers sont ajoutés et supprimés, jusqu'aux pétaoctets | Le mode de débit seulement |
| Amazon EBS | Elastic Volumes : augmenter la taille, changer le type, les IOPS et le débit pendant que le volume est attaché | Étendre la partition et le système de fichiers après une augmentation ; la taille ne peut pas être réduite |
| Systèmes de fichiers FSx | Augmenter la capacité de stockage et la capacité de débit d'un système existant | Planifier les augmentations ; FSx for Lustre Intelligent-Tiering et le pool de capacité ONTAP sont élastiques |
| Stockage Aurora | Le volume de cluster grandit automatiquement | Rien |

```bash
# Change an attached gp2 volume to gp3 with more IOPS and throughput (Elastic Volumes)
aws ec2 modify-volume --volume-id vol-0abc1234def567890 \
  --volume-type gp3 --iops 6000 --throughput 500
```

- Pour une **croissance imprévisible** sans planification de capacité, préférez les services élastiques : S3, EFS, FSx for Lustre Intelligent-Tiering.
- Pour un **débit imprévisible**, le débit Elastic d'EFS et S3 évoluent sans provisionnement ; gp3 et io2 exigent de provisionner de nouvelles valeurs.
- Au-delà des limites d'un volume EBS, agrégez plusieurs volumes en RAID 0 sur l'instance, ou déplacez les données vers un service évolutif.

> **Conseil d'examen.** « Sans interruption » pour un volume EBS qui grandit signifie Elastic Volumes (modify-volume), et non instantané puis restauration sur un volume plus grand.

<!-- section: key-points -->
## Points clés

- Bloc pour une instance et les bases de données, fichier pour l'accès partagé, objet pour une échelle illimitée et l'accès par API.
- gp3 est le choix par défaut : 3 000 IOPS et 125 Mio/s inclus, IOPS et débit provisionnés indépendamment de la taille. io2 Block Express pour des IOPS et une latence extrêmes ; st1/sc1 pour du HDD séquentiel, jamais en démarrage.
- S3 évolue par préfixe (3 500 écritures / 5 500 lectures par seconde) ; chargement partitionné, récupérations par plage d'octets, Transfer Acceleration, CloudFront, S3 Express One Zone.
- EFS : General Purpose plus débit Elastic dans la plupart des cas. FSx for Lustre pour le HPC sur des données S3.
- Hybride : Storage Gateway pour un accès local continu, DataSync pour les transferts, Transfer Family pour les partenaires SFTP, Outposts pour les données qui restent sur site.
