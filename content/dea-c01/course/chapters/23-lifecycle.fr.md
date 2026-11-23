Les données ont une vie : elles sont chargées, interrogées, refroidies, archivées, expirées ou supprimées sur demande, et protégées contre la perte tout au long du parcours. Les questions d'examen sur cette tâche demandent les bonnes options de `COPY` ou d'`UNLOAD`, la règle de cycle de vie qui déplace ou fait expirer les données au bon âge, l'effet de la gestion des versions et de la TTL DynamoDB, la manière de supprimer des données sur demande légale, et la fonctionnalité de sauvegarde ou de réplication qui répond à une exigence de reprise.

<!-- section: copy-unload | objectives: 2.3.1 -->
## Charger et décharger entre S3 et Redshift

**`COPY`** ajoute les lignes de fichiers à une table existante, en parallèle sur les tranches (slices) du cluster ou du groupe de travail.

| Besoin | Option ou pratique de `COPY` |
| --- | --- |
| Chargement le plus rapide | Plusieurs fichiers de taille similaire, en nombre multiple du nombre de tranches, de 1 Mo à 1 Go chacun après compression ; les fichiers CSV non compressés, Parquet et ORC de 128 Mo ou plus sont découpés automatiquement, les fichiers CSV ou JSON compressés ne le sont pas |
| Liste exacte de fichiers, ou fichiers sous des préfixes différents | `MANIFEST` pointant vers un manifeste JSON |
| Autorisation | `IAM_ROLE` avec l'ARN d'un rôle attaché, ou `IAM_ROLE default` |
| Formats | `CSV`, `JSON` (avec `'auto'` ou un fichier JSONPaths), `AVRO`, `PARQUET`, `ORC`, largeur fixe ; `GZIP`, `BZIP2`, `ZSTD`, `LZOP` |
| Compartiment dans une autre Région | `REGION` |
| Tolérer quelques lignes erronées, ou tester sans charger | `MAXERROR`, `NOLOAD` ; détails dans `SYS_LOAD_ERROR_DETAIL` (ou `STL_LOAD_ERRORS` sur les clusters provisionnés) |
| Chargements continus à mesure que les fichiers arrivent dans un préfixe | Copie automatique (auto-copy) avec `COPY ... JOB CREATE` |
| Insertion-mise à jour (upsert) au lieu d'un ajout | `COPY` dans une table intermédiaire, puis `MERGE` dans la cible |

**`UNLOAD`** écrit le résultat d'une requête dans S3.

| Comportement | Valeur par défaut et options |
| --- | --- |
| Format | Texte délimité par des barres verticales par défaut ; `CSV`, `JSON`, `PARQUET` (jusqu'à 2 fois plus rapide à décharger et jusqu'à 6 fois moins de stockage que le texte) |
| Fichiers | `PARALLEL ON` (par défaut) : des fichiers par tranche ; `PARALLEL OFF` : sortie en série, ordonnée ; `MAXFILESIZE` de 5 Mo à 6,2 Go (6,2 Go par défaut) |
| Organisation | `PARTITION BY (col, ...)` écrit des dossiers de style Hive, prêts pour Athena ou Spectrum |
| Chiffrement | SSE-S3 par défaut ; `ENCRYPTED` avec `KMS_KEY_ID` pour SSE-KMS (le chiffrement côté client n'est plus disponible) |
| Fichiers existants | Échec par défaut ; `ALLOWOVERWRITE` ou `CLEANPATH` (supprime d'abord les fichiers cibles) |
| Compléments | `MANIFEST`, `HEADER` (pas avec Parquet), `REGION` |

```text
COPY sales_stage
FROM 's3://example-lake/exports/sales/2026-11-20/'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftLoad'
FORMAT AS PARQUET;

MERGE INTO sales USING sales_stage s ON sales.sale_id = s.sale_id
WHEN MATCHED THEN UPDATE SET amount = s.amount
WHEN NOT MATCHED THEN INSERT VALUES (s.sale_id, s.store_id, s.amount, s.sale_date);

UNLOAD ('SELECT * FROM sales WHERE sale_date < ''2025-01-01''')
TO 's3://example-lake/archive/sales/'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftUnload'
FORMAT AS PARQUET
PARTITION BY (sale_date)
ENCRYPTED KMS_KEY_ID '1234abcd-12ab-34cd-56ef-1234567890ab';
```

Un schéma fréquent : décharger les lignes froides en Parquet partitionné dans S3, les supprimer de Redshift et les garder interrogeables par Spectrum.

> **Piège d'examen.** Un seul gros fichier gzip se charge en série sur une seule tranche. « Le COPY nocturne d'un unique fichier .csv.gz de 40 Go est lent » se corrige en le découpant en nombreux fichiers compressés (ou en passant à Parquet), pas en redimensionnant le cluster. Et `UNLOAD` n'accepte pas de `LIMIT` dans le `SELECT` externe.

<!-- section: storage-tiers | objectives: 2.3.2 -->
## Déplacer les données entre classes de stockage S3

Un lac de données vieillit généralement par zones : les données brutes sont très lues pendant quelques jours, les données préparées pendant des mois, et l'historique seulement pour les audits. Les actions `Transition` de S3 Lifecycle déplacent les objets vers le bas, jamais vers Standard.

| Données | Classe typique |
| --- | --- |
| Données brutes d'atterrissage, retraitées les premiers jours | S3 Standard |
| Données préparées à l'accès inconnu ou changeant | S3 Intelligent-Tiering (pas de frais de récupération, frais de surveillance par objet) |
| Données lues quelques fois par mois, qui doivent rester interrogeables | S3 Standard-IA (minimum de 30 jours, taille minimale facturable de 128 Ko) |
| Historique interrogé environ une fois par trimestre, accès en millisecondes | S3 Glacier Instant Retrieval (minimum de 90 jours) |
| Archives rarement restaurées, délai de quelques heures acceptable | S3 Glacier Flexible Retrieval (90 jours) ou Deep Archive (180 jours) |

Conséquences pour l'analytique :

- Athena ignore les objets en Glacier Flexible Retrieval et en Deep Archive. Pour les interroger, restaurez les objets et définissez la propriété de table `read_restored_glacier_objects` à `true` (tables Hive, moteur version 3) ; Athena ne restaure pas les objets lui-même.
- Les transitions sont facturées par objet et les objets de moins de 128 Ko ne sont pas transférés par défaut : compactez les petits fichiers avant de les hiérarchiser.
- Filtrez les règles par préfixe (`raw/`, `curated/`), par balise ou par taille d'objet ; une règle s'applique aux objets existants et nouveaux, et quand plusieurs règles correspondent à un objet, S3 applique l'action la moins coûteuse.

> **Piège d'examen.** Déplacer vers Glacier Flexible Retrieval des données que des tableaux de bord Athena lisent encore fait renvoyer silencieusement moins de lignes aux requêtes. Gardez les données interrogeables dans une classe en millisecondes (Standard-IA, Glacier Instant Retrieval ou Intelligent-Tiering sans les niveaux d'archive facultatifs).

<!-- section: expiration | objectives: 2.3.3 -->
## Faire expirer les données à un âge donné

```json
{
  "Rules": [
    {
      "ID": "expire-raw-after-90-days",
      "Status": "Enabled",
      "Filter": { "Prefix": "raw/" },
      "Expiration": { "Days": 90 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 7, "NewerNoncurrentVersions": 2 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 3 }
    },
    {
      "ID": "expire-athena-results",
      "Status": "Enabled",
      "Filter": { "Prefix": "athena-results/" },
      "Expiration": { "Days": 7 }
    }
  ]
}
```

| État du compartiment | Effet d'`Expiration` |
| --- | --- |
| Sans gestion des versions | Objet mis en file d'attente et supprimé définitivement |
| Gestion des versions activée | Un marqueur de suppression devient la version actuelle ; les données restent en version non actuelle |
| Gestion des versions suspendue | Un marqueur de suppression avec un ID de version null remplace la version null |

- `NoncurrentVersionExpiration` supprime définitivement les anciennes versions ; `NewerNoncurrentVersions` (de 1 à 100) conserve les plus récentes et exige un `Filter`.
- `ExpiredObjectDeleteMarker` supprime les marqueurs de suppression qui n'ont plus aucune version derrière eux.
- La suppression est asynchrone, mais la facturation s'arrête à l'heure d'expiration.
- Faire expirer un objet avant le minimum de sa classe (30, 90 ou 180 jours) est facturé pour le minimum complet.
- Une politique de compartiment ne peut pas bloquer les suppressions du cycle de vie ; les versions protégées par Object Lock ne sont pas supprimées.

> **Conseil d'examen.** L'expiration par cycle de vie ne coûte rien à exécuter et ne demande aucun code. « Supprimer les fichiers 90 jours après leur création avec le moins de charge opérationnelle » désigne une règle `Expiration`, pas une fonction Lambda planifiée.

<!-- section: versioning-ttl | objectives: 2.3.4 -->
## La gestion des versions S3 et la TTL DynamoDB

**La gestion des versions S3 (S3 Versioning)** conserve chaque version de chaque objet. Un compartiment est sans gestion des versions, avec gestion des versions activée ou suspendue ; une fois activée, elle ne peut jamais revenir à l'état sans gestion des versions. Un simple `DELETE` ajoute un marqueur de suppression (récupérable en supprimant le marqueur) ; un `DELETE` avec un ID de version supprime définitivement cette version. La gestion des versions est exigée par S3 Replication et par Object Lock. MFA delete ajoute un second facteur pour les suppressions définitives et les changements d'état de la gestion des versions.

**La durée de vie (TTL) DynamoDB** supprime les éléments dont l'attribut TTL, un **Number** contenant une heure Unix epoch en secondes, est dans le passé.

| Fait sur la TTL | Conséquence |
| --- | --- |
| Suppression dans les quelques jours qui suivent l'expiration, pas à la seconde près | Filtrer les éléments expirés dans les requêtes et analyses (`expires_at` supérieur à maintenant) |
| Aucune capacité d'écriture consommée dans la Région source | Moins cher qu'une tâche de nettoyage avec `DeleteItem` |
| Les éléments supprimés apparaissent dans DynamoDB Streams comme suppressions du service | Une fonction Lambda sur le flux peut archiver les éléments expirés dans S3 |
| Les éléments dont l'attribut TTL n'est pas un Number sont ignorés | Stocker des secondes epoch, pas une date ISO en chaîne |
| Les tables globales répliquent les suppressions TTL | Chaque Région réplica consomme des écritures répliquées |

```bash
aws s3api put-bucket-versioning --bucket example-lake \
  --versioning-configuration Status=Enabled
aws dynamodb update-time-to-live --table-name Sessions \
  --time-to-live-specification "Enabled=true,AttributeName=expires_at"
```

> **Piège d'examen.** La gestion des versions multiplie le stockage : chaque remplacement conserve l'ancienne version. Associez-la à `NoncurrentVersionExpiration`, sinon la facture augmente à chaque réécriture quotidienne des mêmes clés.

<!-- section: deletion | objectives: 2.3.5 -->
## Supprimer des données pour répondre aux exigences métier et légales

Une demande de suppression (par exemple une personne concernée qui exerce son droit à l'effacement) doit atteindre chaque copie : fichiers bruts, tables préparées, tables de l'entrepôt, index, versions, instantanés et sauvegardes.

| Magasin | Comment supprimer définitivement |
| --- | --- |
| S3, avec gestion des versions | Supprimer chaque version et les marqueurs de suppression (ou `NoncurrentVersionExpiration`) ; les objets sous Object Lock ne peuvent pas être supprimés avant la fin de la rétention |
| Tables Iceberg | `DELETE FROM ... WHERE`, puis expiration des instantanés et suppression des fichiers orphelins (`VACUUM` dans Athena) ; d'ici là, les instantanés antérieurs contiennent encore les lignes |
| Fichiers Parquet ou CSV simples | Réécrire les fichiers ou partitions concernés sans les enregistrements |
| Redshift | `DELETE`, puis l'espace est récupéré par le vacuum delete automatique ou par `VACUUM DELETE ONLY` |
| DynamoDB | `DeleteItem`, `BatchWriteItem`, ou TTL pour une suppression liée au temps |
| Sauvegardes et instantanés | Règles de rétention d'AWS Backup, rétention des instantanés Redshift et RDS : les données supprimées disparaissent quand la dernière sauvegarde qui les contient expire |

Trouvez d'abord les données : Amazon Macie découvre les PII dans S3, les balises du catalogue et les métadonnées de SageMaker Catalog localisent les jeux de données. Quand l'exigence est au contraire de **conserver** les données (conservation légale, rétention réglementaire), utilisez les outils inverses : S3 Object Lock en mode conformité (compliance), conservations légales (legal holds), AWS Backup Vault Lock.

Chiffrer les données de chaque locataire avec sa propre clé KMS permet l'effacement cryptographique (crypto-shredding) : planifier la suppression de la clé (période d'attente de 7 à 30 jours) rend illisible chaque copie chiffrée avec elle.

> **Piège d'examen.** Un `DELETE` au niveau des lignes sur une table Iceberg n'est pas une suppression physique : les anciens fichiers de données restent référencés par les instantanés antérieurs. L'effacement légal exige aussi l'expiration des instantanés et la suppression des fichiers orphelins.

<!-- section: resiliency | objectives: 2.3.6 -->
## Protéger les données par la résilience et la disponibilité

| Magasin | Résilience intégrée | Protection ajoutée |
| --- | --- | --- |
| S3 | Plusieurs zones de disponibilité (sauf classes One Zone), durabilité de 11 neuf | Gestion des versions ; réplication entre Régions ou dans la même Région (gestion des versions sur les deux compartiments ; S3 Replication Time Control réplique 99,99 % des objets en 15 minutes) ; Object Lock |
| DynamoDB | Répliqué entre zones de disponibilité | Restauration à un instant dans le passé (PITR), période de 1 à 35 jours (35 par défaut), restauration dans une nouvelle table, y compris dans une autre Région ; sauvegardes à la demande ; tables globales pour un actif-actif multi-Régions |
| Redshift provisionné | Instantanés automatiques environ toutes les 8 heures ou tous les 5 Go de modifications par nœud ; rétention de 1 jour par défaut, de 1 à 35 jours sur RA3 et RG | Instantanés manuels conservés jusqu'à leur suppression ; copie d'instantanés entre Régions ; Multi-AZ (RA3 et RG, deux zones, RPO nul, SLA de 99,99 %) |
| Redshift Serverless | Points de récupération toutes les 30 minutes, conservés 24 heures | Instantanés manuels, AWS Backup |
| RDS et Aurora | Multi-AZ ; stockage Aurora réparti sur trois zones | Sauvegardes automatiques jusqu'à 35 jours, réplicas en lecture entre Régions, Aurora Global Database |
| Kinesis Data Streams | Données répliquées sur trois zones | Conservation jusqu'à 365 jours pour la relecture |
| EMR | HDFS répliqué entre nœuds core, trois nœuds primary pour la haute disponibilité | Garder les données persistantes dans S3 : HDFS est perdu avec le cluster |

AWS Backup centralise les plans de sauvegarde pour S3, DynamoDB, RDS, Aurora, Redshift, EFS et d'autres, avec des copies vers d'autres Régions et comptes et Vault Lock contre la suppression.

> **Conseil d'examen.** Associez la menace à la fonctionnalité : remplacement accidentel → gestion des versions ou PITR ; panne d'une zone → Multi-AZ ; panne d'une Région → réplication entre Régions ou copie d'instantanés ; compte compromis ou rançongiciel → copies dans un autre compte avec Vault Lock ou Object Lock.

<!-- section: key-points -->
## Points clés

- `COPY` : nombreux fichiers similaires (multiple du nombre de tranches, 1 Mo à 1 Go compressés), `MANIFEST`, `IAM_ROLE`, `FORMAT`, table intermédiaire plus `MERGE` pour les upserts ; tâches de copie automatique pour les chargements continus.
- `UNLOAD` : parallèle par défaut, fichiers de 6,2 Go au maximum, `FORMAT PARQUET`, `PARTITION BY`, SSE-S3 par défaut ou `KMS_KEY_ID`.
- Les transitions du cycle de vie ne vont que vers le bas ; Athena ignore les objets Glacier Flexible Retrieval et Deep Archive ; les petits objets ne sont pas transférés par défaut.
- L'expiration dans un compartiment avec gestion des versions ajoute un marqueur de suppression ; ajoutez `NoncurrentVersionExpiration` ; la facturation s'arrête à l'expiration.
- La gestion des versions ne peut pas être désactivée, seulement suspendue. TTL DynamoDB : secondes epoch dans un Number, suppression en quelques jours, aucune WCU, visible dans Streams.
- La suppression légale atteint chaque copie : versions, instantanés Iceberg, tables Redshift, sauvegardes ; les exigences de rétention utilisent au contraire Object Lock et Vault Lock.
- Résilience : réplication S3 et RTC, PITR DynamoDB (1 à 35 jours) et tables globales, instantanés Redshift, copie entre Régions et Multi-AZ, AWS Backup entre comptes.
