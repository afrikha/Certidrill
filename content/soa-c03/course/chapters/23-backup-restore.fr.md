Une sauvegarde ne vaut que par la restauration qu'elle permet. SOA-C03 vérifie que vous savez automatiser les sauvegardes de chaque type de ressource, choisir la méthode de restauration qui respecte un objectif de temps de reprise (RTO, la durée d'interruption acceptable) et un objectif de point de reprise (RPO, la quantité de données que l'on peut perdre), récupérer un fichier ou un objet écrasé grâce à la gestion des versions, et dérouler une procédure de reprise après sinistre dans le bon ordre.

<!-- section: aws-backup | objectives: 2.3.1 -->
## Centraliser les sauvegardes avec AWS Backup

AWS Backup applique une même politique aux instances EC2, volumes EBS, bases de données RDS et Aurora, tables DynamoDB, systèmes de fichiers EFS et FSx, compartiments (buckets) S3 et autres.

| Élément | Ce que vous configurez |
| --- | --- |
| Plan de sauvegarde et règles | Fréquence (toutes les heures, toutes les 12 heures, quotidienne, hebdomadaire, mensuelle ou expression cron), fenêtre de sauvegarde (par défaut dans la console : démarrage sous 8 heures, fin sous 7 jours), rétention de 1 jour à 100 ans ou illimitée, transition facultative vers le stockage à froid, actions de copie |
| Affectation des ressources | Types de ressources, ARN ou balises (par exemple `backup=daily`), avec des conditions ; le service doit être **activé** (opt-in) pour la Région dans les paramètres d'AWS Backup |
| Coffre de sauvegarde (backup vault) | Emplacement des points de récupération, chiffré avec une clé KMS, doté d'une politique d'accès |
| Sauvegarde continue | Restauration à un instant dans le passé pour S3, RDS, Aurora et SAP HANA sur EC2, rétention de 1 à 35 jours, sans planification |
| Actions de copie | Copies vers un coffre d'une autre Région et/ou d'un autre compte |

Le stockage à froid conserve un point de récupération au moins 90 jours après la transition ; `DeleteAfterDays` doit donc dépasser d'au moins 90 la valeur de `MoveToColdStorageAfterDays` :

```json
{
  "RuleName": "daily-35d",
  "TargetBackupVaultName": "prod-vault",
  "ScheduleExpression": "cron(0 3 * * ? *)",
  "StartWindowMinutes": 60,
  "Lifecycle": { "MoveToColdStorageAfterDays": 30, "DeleteAfterDays": 120 },
  "CopyActions": [{
    "DestinationBackupVaultArn": "arn:aws:backup:eu-central-1:444455556666:backup-vault:dr-vault",
    "Lifecycle": { "DeleteAfterDays": 120 }
  }]
}
```

**AWS Backup Vault Lock** rend les points de récupération immuables : personne, pas même l'utilisateur racine, ne peut les supprimer ni raccourcir leur cycle de vie.

| Mode | Comportement |
| --- | --- |
| Gouvernance (governance) | Les utilisateurs disposant des autorisations IAM suffisantes peuvent retirer le verrou |
| Conformité (compliance) | Après un délai de grâce d'au moins 3 jours (72 heures), le verrou ne peut plus être modifié ni retiré par personne, AWS compris, tant que le coffre contient des points de récupération |

Les paramètres de rétention minimale et maximale du verrou font échouer les tâches dont la rétention est plus courte ou plus longue. À l'échelle d'une organisation, les **politiques de sauvegarde** (backup policies) d'AWS Organizations déploient des plans dans les comptes membres, et **AWS Backup Audit Manager** indique si les ressources respectent des contrôles tels que la fréquence, la rétention ou la copie inter-Régions.

> **Piège d'examen.** Un plan de sauvegarde qui sélectionne les ressources par balise ne sauvegarde rien pour un service qui n'est pas activé dans la Région. Vérifiez les paramètres d'activation des services avant de soupçonner la balise.

<!-- section: native-backups | objectives: 2.3.1 -->
## Fonctionnalités natives d'instantané et de sauvegarde par service

| Service | Mécanisme natif | Faits à retenir |
| --- | --- | --- |
| Volumes EBS et AMI basées sur EBS | Instantanés (incrémentiels, régionaux) automatisés par des politiques **Amazon Data Lifecycle Manager** ciblées par balises | DLM ne gère que les instantanés et AMI qu'il a créés ; copie entre Régions et entre comptes |
| Conservation longue des instantanés EBS | **EBS Snapshots Archive** | Jusqu'à 75 % moins cher pour des instantanés conservés 90 jours ou plus ; un instantané archivé devient complet et doit être restauré dans le niveau standard avant usage |
| Suppression accidentelle | Règles de rétention de la **Corbeille** (Recycle Bin) | Récupérer des instantanés EBS, des volumes EBS et des AMI basées sur EBS supprimés pendant la durée fixée par la règle |
| RDS | Sauvegardes automatiques et journaux de transactions | Rétention de 0 à 35 jours (0 les désactive, et passer à 0 ou en sortir provoque une interruption) ; 7 jours par défaut dans la console, 1 jour avec la CLI ; instantanés manuels conservés jusqu'à leur suppression |
| DynamoDB | Restauration à un instant dans le passé (PITR) et sauvegardes à la demande | Période de récupération PITR de 1 à 35 jours, dernier instant restaurable environ 5 minutes avant l'heure actuelle |
| EFS | AWS Backup | Les systèmes de fichiers créés dans la console reçoivent une sauvegarde quotidienne conservée 35 jours |
| FSx for Windows File Server | Sauvegardes quotidiennes automatiques | Rétention de 0 à 90 jours (30 par défaut dans la console) ; sauvegardes incrémentielles et cohérentes au niveau du système de fichiers |
| S3 | AWS Backup (périodique ou continue) | La gestion des versions doit être activée sur le compartiment ; ajoutez une règle de cycle de vie qui fait expirer les versions non actuelles pour limiter la taille des sauvegardes |

> **Conseil d'examen.** « Sauvegarder EC2, RDS, DynamoDB et EFS avec un même calendrier, copier vers une autre Région et empêcher la suppression » correspond à AWS Backup avec un plan, une action de copie et Vault Lock. « Garder les sept derniers instantanés quotidiens des volumes EBS balisés avec le moins d'effort opérationnel » correspond à une politique Data Lifecycle Manager.

<!-- section: database-restore | objectives: 2.3.2 -->
## Restaurer des bases de données pour respecter RTO, RPO et coût

| Méthode | RPO | RTO et comportement | Remarque sur le coût |
| --- | --- | --- | --- |
| Restauration RDS à un instant dans le passé | Environ 5 minutes (journaux envoyés vers S3 toutes les 5 minutes ; consultez `LatestRestorableTime`) | Crée une **nouvelle instance de base de données** ; repointez l'application | Compris dans le stockage des sauvegardes |
| Restauration d'instantané RDS ou Aurora | Heure de l'instantané | Nouvelle instance ou nouveau cluster | Instantanés manuels facturés jusqu'à leur suppression |
| Retour arrière Aurora (backtrack, Aurora MySQL uniquement) | N'importe quel instant de la fenêtre, jusqu'à 72 heures | **Rembobine le même cluster en quelques minutes** ; mettez d'abord l'application en pause | Enregistrements de modifications facturés ; à activer à la création ou à la restauration |
| Clone Aurora | Maintenant | Cluster rapide en copie sur écriture (copy-on-write) pour enquêter, aucune donnée copiée à la création | Seules les pages modifiées sont facturées |
| PITR DynamoDB | À la seconde, au plus tard environ 5 minutes avant l'heure actuelle | Toujours une **nouvelle table**, dans la même Région ou une autre | Facturé au Go de table |
| Sauvegardes automatiques RDS inter-Régions | Instantanés et journaux de transactions répliqués | PITR dans la deuxième Région | Frais de copie et de stockage |
| Promotion d'un réplica en lecture | Retard du réplica | Quelques minutes ; le réplica devient une instance autonome accessible en écriture | Réplica déjà en fonctionnement |

Liste de contrôle d'une restauration :

- Les restaurations RDS utilisent le groupe de paramètres et le groupe d'options par défaut sauf indication contraire, et ont besoin du bon groupe de sécurité de VPC : définissez-les pendant la restauration ou juste après.
- Une restauration DynamoDB rétablit les données, les index, la capacité provisionnée et les paramètres de chiffrement, mais **pas** les politiques de mise à l'échelle automatique, les politiques IAM, les alarmes CloudWatch, les balises, Streams, le TTL ni les paramètres PITR : réappliquez-les.
- Les volumes EBS et le stockage RDS restaurés chargent leurs blocs depuis S3 de manière différée, si bien que les premières lectures sont plus lentes ; la **restauration rapide d'instantané EBS** (fast snapshot restore, par instantané et par zone, facturée à l'heure) offre immédiatement toutes les performances.
- Les tests de restauration prouvent le RTO : les **tests de restauration d'AWS Backup** (restore testing) exécutent des restaurations planifiées (dernier point de récupération ou point aléatoire), conservent le résultat de 1 à 168 heures pour validation puis le suppriment, et Audit Manager peut comparer la durée de restauration à une cible.

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier orders-db \
  --target-db-instance-identifier orders-db-0915 \
  --restore-time 2026-11-12T09:15:00Z

aws dynamodb restore-table-to-point-in-time \
  --source-table-name Orders --target-table-name Orders-0915 \
  --restore-date-time 2026-11-12T09:15:00Z
```

> **Piège d'examen.** « Annuler en quelques minutes une mise à jour par lots erronée sur un cluster Aurora MySQL sans changer de point de terminaison » correspond au retour arrière (backtrack). Pour RDS et pour Aurora PostgreSQL, il n'existe pas de rembobinage sur place : la restauration à un instant dans le passé crée une nouvelle instance ou un nouveau cluster avec un nouveau point de terminaison.

<!-- section: storage-versioning | objectives: 2.3.3 -->
## Gestion des versions pour Amazon S3 et Amazon FSx

La **gestion des versions S3** (S3 Versioning) conserve chaque version de chaque objet. Un compartiment est sans gestion des versions (par défaut), avec gestion des versions activée ou suspendue ; une fois activée, elle ne peut jamais revenir à l'état sans gestion des versions. Les objets stockés avant l'activation ont l'ID de version `null`.

| Action sur un compartiment versionné | Résultat |
| --- | --- |
| PUT d'une clé existante | Nouvelle version actuelle ; l'ancienne devient non actuelle |
| DELETE sans ID de version | Un **marqueur de suppression** (delete marker) devient la version actuelle ; les données restent |
| Récupérer un objet supprimé | Supprimer le marqueur de suppression (ou copier une version antérieure par-dessus la version actuelle) |
| DELETE avec un ID de version | Supprime définitivement cette version |

Règles d'exploitation :

- Chaque version est facturée comme un objet complet : ajoutez des règles de cycle de vie avec **expiration des versions non actuelles** (et suppression des marqueurs de suppression expirés).
- **MFA delete** exige un code MFA pour modifier l'état de la gestion des versions ou supprimer définitivement une version ; seul l'utilisateur racine peut l'activer, avec la CLI ou l'API, et il est incompatible avec les configurations de cycle de vie.
- S3 Object Lock, S3 Replication et AWS Backup pour S3 exigent tous la gestion des versions.

```bash
aws s3api put-bucket-versioning --bucket example-reports \
  --versioning-configuration Status=Enabled

aws s3api list-object-versions --bucket example-reports --prefix q3/summary.csv
```

Pour **Amazon FSx**, la gestion des versions fonctionne au niveau du système de fichiers :

| Système de fichiers | Fonctionnalité de versions | Récupération par les utilisateurs |
| --- | --- | --- |
| FSx for Windows File Server | **Clichés instantanés** (shadow copies, service VSS de Windows), non activés par défaut, configurés avec les commandes PowerShell de FSx ; limite de stockage par défaut 10 % du système de fichiers, 20 copies par défaut, limite absolue 500 | Clic droit sur un fichier ou un dossier, **Restaurer les versions précédentes** |
| FSx for NetApp ONTAP | **Instantanés** (snapshots) avec une politique d'instantanés (`default` : 6 horaires, 2 quotidiens, 2 hebdomadaires) ; réserve d'instantanés de 5 % ; jusqu'à 1 023 par volume | Parcourir le répertoire `.snapshot` du volume |

Les clichés instantanés et les instantanés ne remplacent pas les sauvegardes : ils résident sur le même système de fichiers.

> **Conseil d'examen.** « Les utilisateurs doivent restaurer eux-mêmes la version d'hier d'un fichier sur un partage FSx for Windows, sans administrateur » signifie activer les clichés instantanés. « Protéger les objets contre l'écrasement et la suppression accidentels » signifie la gestion des versions S3 (plus MFA delete ou Object Lock si la suppression doit être bloquée).

<!-- section: dr-procedures | objectives: 2.3.4 -->
## Dérouler les procédures de reprise après sinistre

| Stratégie | Préparé dans la Région de reprise | Procédure au basculement |
| --- | --- | --- |
| Sauvegarde et restauration (backup and restore) | Copies de sauvegarde (actions de copie AWS Backup, AMI, instantanés), infrastructure en tant que code | Restaurer les données à partir des copies, déployer la pile avec CloudFormation ou le CDK, puis basculer le DNS |
| Veilleuse (pilot light) | Données répliquées en continu (réplica en lecture inter-Régions, Aurora Global Database, réplication S3) ; infrastructure de base déployée, serveurs d'application arrêtés | Promouvoir la base de données, démarrer ou déployer les serveurs et les mettre à l'échelle, basculer le trafic |
| Secours semi-actif (warm standby) | Une copie réduite mais fonctionnelle, qui sert déjà du trafic ou des tests | Monter à la taille de la production (augmenter la capacité souhaitée Auto Scaling), basculer le trafic |
| Actif/actif (active/active) | Charge de travail complète dans plusieurs Régions, qui servent toutes du trafic | Pas de basculement à proprement parler : détourner le trafic de la Région en panne et s'assurer que les autres l'absorbent |

Bonnes pratiques que les questions transforment en réponses :

- **Automatisez le runbook** même quand la décision de basculer est manuelle, pour que le basculement tienne en une action (Systems Manager Automation, plans ARC Region switch ou contrôles de routage).
- Pendant l'incident, préférez les actions du **plan de données** (vérifications de l'état Route 53, contrôles de routage ARC) aux modifications du plan de contrôle comme l'édition d'enregistrements ou la création de ressources.
- Pour Aurora Global Database, utilisez la **permutation** (switchover) pour les déplacements planifiés (sans perte de données, en général moins de 30 secondes sur les versions récentes) et le **basculement** (failover) avec `--allow-data-loss` en cas de panne régionale (RPO de quelques secondes) ; revenez ensuite par une permutation.
- La réplication copie aussi la corruption et les suppressions : conservez des sauvegardes à un instant dans le passé et la gestion des versions à côté de toute réplication.
- **Testez** régulièrement : journées de simulation (game days), tests de restauration AWS Backup, exercices ARC. Augmentez les quotas de service et gardez les AMI, les secrets et les images de conteneur dans la Région de reprise à l'avance.

> **Piège d'examen.** Le secours semi-actif repose sur une montée en charge pendant le sinistre, et la mise à l'échelle est une action du plan de contrôle. Si l'exigence est de servir toute la charge immédiatement après une panne régionale, provisionnez la pleine capacité à l'avance (secours actif, hot standby) ou fonctionnez en actif/actif.

<!-- section: key-points -->
## Points clés

- AWS Backup : plans avec règles (fréquence, fenêtre, rétention, stockage à froid d'au moins 90 jours), sélection par balise après activation du service, coffres, copies inter-Régions et intercomptes, sauvegarde continue jusqu'à 35 jours.
- Vault Lock : gouvernance (retirable avec des autorisations IAM) ou conformité (immuable après un délai de grâce d'au moins 72 heures).
- DLM pour les instantanés EBS et les AMI, Snapshots Archive au-delà de 90 jours, Corbeille contre la suppression accidentelle, restauration rapide d'instantané contre la latence des premières lectures.
- Les restaurations RDS à un instant dans le passé et à partir d'un instantané créent une nouvelle instance ; le retour arrière d'Aurora MySQL rembobine sur place (jusqu'à 72 heures) ; le PITR DynamoDB restaure vers une nouvelle table sans mise à l'échelle automatique, alarmes, balises, Streams ni TTL.
- Gestion des versions S3 (jamais de retour à l'état sans versions), marqueurs de suppression, expiration des versions non actuelles, MFA delete par l'utilisateur racine uniquement ; clichés instantanés FSx for Windows et instantanés ONTAP pour la récupération par les utilisateurs.
- Reprise après sinistre : sauvegarde et restauration, veilleuse, secours semi-actif, actif/actif ; runbooks automatisés, basculement par le plan de données, permutation ou basculement d'Aurora Global Database, tests réguliers.
