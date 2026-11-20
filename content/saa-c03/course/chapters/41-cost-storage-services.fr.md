Les questions de coût sur le stockage décrivent une charge de travail et demandent le service, le type de volume, la taille ou la méthode de transfert LE PLUS rentable qui respecte encore les exigences de performance, de durabilité et d'accès. La méthode : choisir le type de stockage dont la charge de travail a besoin, puis le service et la configuration les moins chers de ce type, puis vérifier comment les données y arrivent et comment les dépenses sont suivies.

<!-- section: storage-types-services | objectives: 4.1.11, 4.1.4 -->
## Types de stockage et mode de facturation

| Type | Services | Modèle de facturation | Caractéristiques |
| --- | --- | --- | --- |
| Objet | Amazon S3 | Par Go-mois réellement stocké (selon la classe de stockage), plus les requêtes, les récupérations et le transfert de données sortant | Illimité, accès par API, conçu pour une durabilité de 11 neuf, cycle de vie vers des classes moins chères |
| Bloc | Amazon EBS | Par Go-mois **provisionné**, plus les IOPS et le débit provisionnés au-delà de la base (gp3, io1, io2) | Une zone de disponibilité, attaché aux instances, latence la plus faible |
| Bloc, temporaire | Stockage d'instance EC2 | Inclus dans le prix de l'instance | Perdu à l'arrêt ou à la résiliation ; caches, tampons, données de travail |
| Fichier, Linux (NFS) | Amazon EFS | Par Go-mois utilisé, selon la classe de stockage ; le débit dépend du mode | Élastique : grandit et rétrécit automatiquement ; nombreux clients dans plusieurs zones |
| Fichier, systèmes de fichiers tiers gérés | Amazon FSx for Windows File Server, Lustre, NetApp ONTAP, OpenZFS | Surtout stockage et capacité de débit provisionnés ; classe Intelligent-Tiering (Lustre, OpenZFS) facturée selon les données stockées | Protocoles et fonctionnalités natifs (SMB et Active Directory, Lustre, ONTAP, ZFS) |

> **Piège d'examen.** Un volume EBS coûte autant plein que vide : vous payez la taille provisionnée. Un volume de 2 Tio qui contient 200 Gio gaspille 90 % de son coût, alors qu'EFS ou S3 ne facturent que ce qui est stocké.

<!-- section: block-storage | objectives: 4.1.6 -->
## Options de stockage en bloc : types de volume SSD et HDD

| Type de volume | Taille | IOPS maximales | Débit maximal | Volume de démarrage | Le choisir pour |
| --- | --- | --- | --- | --- | --- |
| gp3 (SSD à usage général) | 1 Gio – 64 Tio | 80 000 | 2 000 Mio/s | Oui | Choix par défaut de la plupart des charges : 3 000 IOPS et 125 Mio/s inclus quelle que soit la taille, davantage provisionné indépendamment de la taille |
| gp2 (SSD à usage général, génération précédente) | 1 Gio – 16 Tio | 16 000 | 250 Mio/s | Oui | Héritage : 3 IOPS par Gio, rafales jusqu'à 3 000 IOPS grâce à des crédits |
| io2 Block Express (SSD IOPS provisionnées) | 4 Gio – 64 Tio | 256 000 | 4 000 Mio/s | Oui | Bases de données critiques qui exigent des IOPS soutenues, une latence inférieure à la milliseconde, une durabilité de 99,999 % |
| io1 (SSD IOPS provisionnées, génération précédente) | 4 Gio – 16 Tio | 64 000 | 1 000 Mio/s | Oui | Bases de données existantes à forte intensité d'E/S |
| st1 (HDD à débit optimisé) | 125 Gio – 16 Tio | 500 | 500 Mio/s | Non | Grandes E/S séquentielles : big data, entrepôts de données, traitement de journaux |
| sc1 (HDD à froid) | 125 Gio – 16 Tio | 250 | 250 Mio/s | Non | Données séquentielles rarement consultées, coût par Gio le plus bas |

Règles de coût :

- **gp3 coûte moins cher que gp2** par Gio et dissocie la performance de la taille. Avec gp2, obtenir 9 000 IOPS impose de provisionner 3 000 Gio ; avec gp3, un petit volume plus 9 000 IOPS provisionnées suffit.
- Ne payez io2 que si les limites ou la durabilité de gp3 ne suffisent pas.
- Les volumes HDD sont bon marché mais ne peuvent pas servir de volume de démarrage et donnent de mauvaises performances sur de petites E/S aléatoires.
- **Elastic Volumes** change le type, la taille, les IOPS et le débit d'un volume attaché sans interruption (jusqu'à quatre modifications par volume sur 24 heures glissantes). La taille ne peut qu'augmenter : pour réduire, créez un volume plus petit et copiez les données. Après une augmentation de taille, étendez le système de fichiers.

```bash
# Convert a gp2 volume to gp3 in place, keeping the gp3 baseline performance
aws ec2 modify-volume --volume-id vol-0abc1234def567890 \
  --volume-type gp3 --iops 3000 --throughput 125
```

> **Conseil d'examen.** « Réduire le coût d'EBS sans interruption et sans changer les performances » pour des volumes gp2 : modification en gp3 avec Elastic Volumes. « Débit séquentiel, coût le plus bas, pas un volume de démarrage » : st1 ; « rarement consulté » : sc1.

<!-- section: cost-effective-service | objectives: 4.1.4, 4.1.21 -->
## Choisir le service de stockage le plus rentable

| Exigence | Réponse la plus rentable |
| --- | --- |
| Stocker de grands volumes de données non structurées auxquels les applications accèdent en HTTPS | S3, avec la classe de stockage adaptée au modèle d'accès (S3 Intelligent-Tiering quand il est inconnu) |
| Système de fichiers Linux partagé, taille imprévisible, nombreuses instances | EFS avec débit Elastic et une politique de cycle de vie vers EFS Infrequent Access et Archive |
| Système de fichiers partagé pour une charge non critique dans une seule zone (dev, test) | EFS One Zone, ou déploiement FSx dans une seule zone |
| Partages de fichiers Windows avec Active Directory, DFS, SMB | FSx for Windows File Server ; stockage HDD pour les répertoires personnels et partages courants, SSD pour les charges sensibles à la latence ; Single-AZ quand Multi-AZ n'est pas exigé |
| Espace de travail HPC ou ML sur des données de S3 | FSx for Lustre en déploiement scratch lié au compartiment S3 (données non répliquées, le moins cher) |
| Migrer un système NetApp sur site, NFS, SMB et iSCSI ensemble | FSx for NetApp ONTAP : hiérarchisation automatique vers un pool de capacité moins coûteux, déduplication et compression |
| Migrer des serveurs ZFS ou NFS Linux qui exigent une faible latence | FSx for OpenZFS |
| Base de données sur EC2 aux besoins d'IOPS modérés | EBS gp3 |
| Données temporaires que l'application peut régénérer | Stockage d'instance (sans frais supplémentaires) |

Classes de stockage EFS : Standard, **Infrequent Access** (coût jusqu'à 95 % inférieur à Standard, sans durée minimale de stockage) et **Archive** (encore moins cher, durée minimale de stockage de 90 jours, frais d'accès plus élevés). Les fichiers de moins de 128 Kio sont facturés comme 128 Kio dans IA et Archive. Les systèmes de fichiers One Zone stockent les données dans une seule zone de disponibilité : moins chers, mais non résilients à la perte d'une zone.

> **Piège d'examen.** EFS ne prend pas en charge les clients Windows en SMB. « Des serveurs Windows ont besoin d'un système de fichiers partagé » : FSx for Windows File Server, même si EFS coûterait moins cher.

<!-- section: storage-sizing | objectives: 4.1.13, 4.1.15 -->
## Taille du stockage et mise à l'échelle automatique du stockage

| Service | Comportement de la capacité | Ce que vous faites |
| --- | --- | --- |
| S3, EFS | Élastique, paiement de ce qui est stocké | Rien à dimensionner ; maîtrisez la croissance avec des règles de cycle de vie |
| Aurora | Le volume de cluster grandit automatiquement (jusqu'à 256 Tio sur certaines versions de moteur) et libère l'espace quand des données sont supprimées ; facturé selon l'espace utilisé | Rien à dimensionner |
| RDS (MySQL, MariaDB, PostgreSQL, Oracle, SQL Server) | Stockage alloué, payé tel que provisionné | Activer la **mise à l'échelle automatique du stockage** avec un seuil de stockage maximal |
| EBS | Taille provisionnée, aucune croissance automatique | Surveiller l'utilisation (métriques de disque de l'agent CloudWatch) et augmenter avec Elastic Volumes |
| FSx (classes de stockage SSD) | Capacité de stockage provisionnée | Augmenter la capacité au besoin ; Intelligent-Tiering (Lustre, OpenZFS) est élastique |

La mise à l'échelle automatique du stockage RDS ajoute du stockage quand l'espace libre est au plus 10 % du stockage alloué pendant au moins cinq minutes, que l'optimisation du stockage de la modification précédente est terminée et qu'il y a eu moins de quatre modifications au cours des 24 dernières heures. L'incrément est le plus grand de 10 Gio, 10 % du stockage alloué, ou la croissance prévue pour les 7 heures suivantes. Le stockage alloué **ne diminue jamais** : commencez petit et laissez-le grandir.

```bash
# Turn on RDS storage autoscaling with a ceiling of 2,000 GiB
aws rds modify-db-instance --db-instance-identifier orders-db \
  --max-allocated-storage 2000 --apply-immediately
```

Règles de dimensionnement : provisionnez pour le besoin actuel plus la croissance jusqu'à la prochaine revue, pas pour le maximum à cinq ans ; utilisez un stockage qui évolue automatiquement quand la croissance est imprévisible ; réduisez un EBS surdimensionné en migrant vers un volume plus petit.

> **Conseil d'examen.** « Le stockage de la base de données croît de façon imprévisible ; éviter les pannes dues à un stockage plein et ne pas payer de capacité inutilisée » : mise à l'échelle automatique du stockage RDS (ou Aurora), pas une grosse allocation initiale.

<!-- section: upload-strategies | objectives: 4.1.12 -->
## Stratégies de stockage : chargements par lots ou individuels

S3 facture chaque requête (`PUT`, `COPY`, `POST`, `LIST`, transitions de cycle de vie) en plus du stockage. De nombreux petits objets multiplient les coûts par requête et par objet :

| Situation | Stratégie rentable |
| --- | --- |
| Des millions de petits fichiers (relevés de capteurs, journaux) à stocker dans S3 | Regrouper avant le chargement : Data Firehose agrège les enregistrements en objets plus gros, ou regroupez les fichiers (tar, zip, Parquet) par lot |
| Petits objets à archiver | Le cycle de vie ne fait pas passer par défaut les objets de moins de 128 Ko ; chaque transition est une requête ; Glacier Flexible Retrieval et Deep Archive ajoutent 40 Ko de métadonnées par objet (dont 8 Ko au tarif S3 Standard). Regroupez d'abord les petits objets en archives plus grandes |
| Standard-IA, One Zone-IA, Glacier Instant Retrieval | Taille d'objet minimale facturable de 128 Ko : y stocker des objets de 10 Ko coûte plus que prévu |
| Gros fichiers (Go) | Chargement partitionné (multipart upload) : parties en parallèle, seules les parties en échec sont relancées ; un `PUT` unique est limité à 5 Go, un objet à 50 To |
| Action de masse sur des objets existants (copie, balisage, restauration, changement de classe) | S3 Batch Operations plutôt que des scripts qui émettent des appels individuels |
| Chargements massifs récurrents de fichiers depuis le site | Tâche DataSync planifiée plutôt qu'un script personnalisé de chargement fichier par fichier |

> **Piège d'examen.** Déplacer des milliards de minuscules objets vers S3 Glacier Deep Archive peut coûter plus cher que de les laisser dans S3 Standard, à cause des requêtes de transition par objet et des 40 Ko de surcoût par objet. Regroupez-les d'abord.

<!-- section: hybrid-transfer | objectives: 4.1.8, 4.1.14, 4.1.18 -->
## Stockage hybride, services de migration et transfert le moins coûteux

| Besoin | Service |
| --- | --- |
| Copie ponctuelle ou récurrente de données de fichiers ou d'objets vers S3, EFS ou FSx | AWS DataSync (facturé par Go transféré) |
| Les applications sur site gardent NFS ou SMB pendant que les données sont stockées dans S3 | Storage Gateway S3 File Gateway |
| Remplacer une bibliothèque de bandes physique | Storage Gateway Tape Gateway, bandes archivées dans S3 Glacier Flexible Retrieval ou Deep Archive |
| Sauvegarder ou étendre des volumes iSCSI sur site | Storage Gateway Volume Gateway (mis en cache ou stocké) |
| Des partenaires envoient des fichiers en SFTP, FTPS, FTP ou AS2 | AWS Transfer Family (facturé à l'heure tant que chaque point de terminaison de protocole est activé, plus par Go) |
| Migrer des bases de données | AWS DMS (pas un service de transfert de stockage) |
| Migrer des serveurs entiers | AWS Application Migration Service |
| Très grand jeu de données, peu de bande passante | AWS Data Transfer Terminal (apportez vos propres périphériques) ; Snowball Edge n'est plus proposé aux nouveaux clients |

Méthode de transfert la moins coûteuse :

1. Le transfert de données **vers** AWS par internet n'entraîne pas de frais de transfert de données. Si le lien internet existant peut transférer les données avant l'échéance, utilisez-le (avec DataSync pour les contrôles d'intégrité et la planification, ou l'AWS CLI pour une simple copie vers S3).
2. Si le lien est trop lent, comparez la durée et le coût d'une connexion Direct Connect (heures de port plus une interconnexion physique au délai de mise en place long ; rentable pour des transferts continus) avec un transfert physique dans un Data Transfer Terminal.
3. Ne payez pas une fonctionnalité inutile : S3 Transfer Acceleration ajoute des frais et n'aide que les chargements sur de longues distances.
4. Limitez la bande passante de DataSync pendant les heures ouvrées plutôt que d'acheter plus de bande passante.

> **Piège d'examen.** « Le moyen le moins cher de copier 5 To une seule fois sur un lien de 1 Gbit/s peu utilisé » : un transfert réseau (environ une demi-journée à pleine vitesse), pas Direct Connect, dont la mise en place prend plus de temps que le transfert lui-même.

<!-- section: cost-management | objectives: 4.1.2, 4.1.3 -->
## Fonctionnalités et outils de gestion des coûts

Fonctionnalités :

- **Balises de répartition des coûts** (cost allocation tags) : les balises générées par AWS (préfixe `aws:`, comme `aws:createdBy`) et celles définies par l'utilisateur doivent être **activées** dans la console Billing and Cost Management avant d'apparaître dans Cost Explorer et les rapports de coûts. Dans une organisation, seul le compte de gestion les active ; elles peuvent mettre jusqu'à 24 heures à apparaître. Normalisez les clés et valeurs de balises avec les politiques de balises d'AWS Organizations.
- **Facturation consolidée** (AWS Organizations) : une seule facture pour tous les comptes membres, payée par le compte de gestion ; l'utilisation est cumulée pour les paliers de tarification par volume ; les remises des instances réservées et des Savings Plans sont partagées entre comptes.
- **Cost Categories** : règles qui regroupent les coûts (par compte, balise, service) en unités métier.

Outils :

| Outil | La question à laquelle il répond | Faits clés |
| --- | --- | --- |
| AWS Cost Explorer | « Où est passé l'argent, et quelle est la tendance ? » | Graphiques et filtres interactifs (service, compte, balise) ; jusqu'à 13 mois d'historique ; prévisions jusqu'à 18 mois ; rapports et recommandations d'instances réservées ; actualisé au moins toutes les 24 heures |
| AWS Budgets | « Avertir ou agir avant de dépasser X » | Budgets de coût, d'utilisation, d'utilisation ou de couverture des RI et des Savings Plans ; alertes sur les valeurs réelles ou prévues par e-mail ou SNS ; les actions budgétaires appliquent une politique IAM ou une SCP ou ciblent des instances EC2 et RDS, automatiquement ou après approbation ; données mises à jour jusqu'à trois fois par jour |
| AWS Cost and Usage Report (CUR 2.0 via AWS Data Exports) | « Chaque poste de facturation, pour notre propre analyse » | Données les plus détaillées, par heure, jour ou mois, livrées dans S3 ; à interroger avec Athena, charger dans Redshift ou visualiser dans Quick |
| AWS Cost Anomaly Detection | « Signalez-nous les dépenses inhabituelles » | Moniteurs par apprentissage automatique par service, compte lié, balise de répartition des coûts ou catégorie de coûts ; alertes individuelles par SNS ou résumés quotidiens et hebdomadaires par e-mail ; analyse des causes premières |

> **Conseil d'examen.** « Prévenir l'équipe financière quand la dépense mensuelle prévue dépassera le budget » : AWS Budgets avec une alerte sur les prévisions. « Refacturation par service avec du SQL sur les postes de facturation » : balises de répartition des coûts plus CUR 2.0 interrogé avec Athena.

<!-- section: key-points -->
## Points clés

- S3 et EFS facturent ce qui est stocké ; EBS et la plupart des configurations FSx facturent ce qui est provisionné.
- gp3 est le choix par défaut et coûte moins cher que gp2 ; io2 seulement pour des IOPS ou une durabilité extrêmes ; st1 et sc1 pour des données séquentielles, hors démarrage. Un volume EBS peut grandir, jamais rétrécir.
- Stockage de fichiers le moins cher : EFS IA ou Archive avec cycle de vie, One Zone pour les données non critiques, FSx HDD ou Single-AZ quand c'est permis, Lustre scratch pour les données HPC temporaires.
- Mise à l'échelle automatique du stockage RDS pour une croissance imprévisible ; Aurora, S3 et EFS grandissent seuls.
- Regroupez les petits objets avant chargement ou archivage ; chargement partitionné pour les gros ; S3 Batch Operations pour les modifications de masse.
- Le transfert entrant est gratuit : utilisez le réseau existant quand le délai le permet ; DataSync pour migrer, Storage Gateway pour l'accès hybride, Transfer Family pour le SFTP ; Data Transfer Terminal pour les énormes jeux de données.
- Les balises doivent être activées ; Cost Explorer explore, Budgets alerte et agit, CUR 2.0 donne les postes de facturation, Cost Anomaly Detection détecte les surprises.
