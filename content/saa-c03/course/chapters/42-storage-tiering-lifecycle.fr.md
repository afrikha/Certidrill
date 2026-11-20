Sur AWS, le coût du stockage dépend moins du service que de l'endroit où chaque octet se trouve au fil du temps. Les questions d'examen décrivent la fréquence de lecture des données, le délai dans lequel elles doivent revenir et leur durée de conservation, puis demandent la classe de stockage, la règle de cycle de vie, l'option d'accès ou la conception de sauvegarde qui répond à l'exigence au moindre coût.

<!-- section: access-patterns | objectives: 4.1.9 -->
## Lire les modèles d'accès au stockage

Relevez quatre faits dans le scénario :

| Question | Formulation typique | Ce que cela décide |
| --- | --- | --- |
| À quelle fréquence les données sont-elles lues ? | « consultées souvent pendant 30 jours, puis rarement », « une fois par trimestre », « inconnue » | Classe fréquente, peu fréquente ou d'archive, ou Intelligent-Tiering |
| En combien de temps une lecture doit-elle aboutir ? | « immédiatement », « en quelques minutes », « sous 12 heures » | Classe en millisecondes (Standard-IA, Glacier Instant Retrieval) ou classe à restauration (Glacier Flexible Retrieval, Deep Archive) |
| Combien de temps les données sont-elles conservées ? | « pendant 7 ans », « supprimées après 90 jours » | Adéquation à la durée minimale de stockage, règle d'expiration |
| Les données peuvent-elles être recréées ? | « régénérables depuis la source », « seule copie » | Possibilité d'une classe à zone unique (One Zone-IA) |

Notez aussi la taille des objets (les petits objets rendent les frais par objet prépondérants) et le caractère **prévisible** du modèle (règles de cycle de vie) ou **imprévisible** (Intelligent-Tiering).

> **Conseil d'examen.** « Rarement consultées mais disponibles immédiatement » désigne une classe en millisecondes (Standard-IA, One Zone-IA, Glacier Instant Retrieval), jamais Glacier Flexible Retrieval ni Deep Archive, qui exigent d'abord une restauration.

<!-- section: s3-storage-classes | objectives: 4.1.10, 4.1.19 -->
## Les classes de stockage S3 et leurs frais

Toutes les classes sauf One Zone-IA et Express One Zone stockent les données dans au moins trois zones de disponibilité et sont conçues pour une durabilité de 99,999999999 %.

| Classe | Durée minimale de stockage | Taille minimale facturable | Frais de récupération | Zones | Accès |
| --- | --- | --- | --- | --- | --- |
| S3 Standard | Aucune | Aucune | Non | 3 ou plus | Millisecondes |
| S3 Express One Zone | Aucune | Aucune | Non | 1 (choisie) | Quelques millisecondes |
| S3 Intelligent-Tiering | Aucune | Aucune (objets de moins de 128 Ko non hiérarchisés) | Non | 3 ou plus | Millisecondes pour les niveaux automatiques |
| S3 Standard-IA | 30 jours | 128 Ko | Par Go | 3 ou plus | Millisecondes |
| S3 One Zone-IA | 30 jours | 128 Ko | Par Go | 1 | Millisecondes |
| S3 Glacier Instant Retrieval | 90 jours | 128 Ko | Par Go | 3 ou plus | Millisecondes |
| S3 Glacier Flexible Retrieval | 90 jours | Surcoût de 40 Ko par objet | Par Go (Bulk gratuit) | 3 ou plus | Minutes à heures, après restauration |
| S3 Glacier Deep Archive | 180 jours | Surcoût de 40 Ko par objet | Par Go | 3 ou plus | Heures, après restauration |

Délais de restauration des deux classes d'archive :

| Niveau | Glacier Flexible Retrieval | Glacier Deep Archive |
| --- | --- | --- |
| Expedited | 1 à 5 minutes (objets de moins de 250 Mo) | Non disponible |
| Standard (par défaut) | 3 à 5 heures | Sous 12 heures |
| Bulk | 5 à 12 heures, sans frais de récupération | Sous 48 heures |

Points testés à l'examen :

- **Durée minimale de stockage** : un objet supprimé, remplacé ou transféré avant ce minimum est facturé pour les jours restants. Des données qui vivent 10 jours coûtent moins cher en S3 Standard qu'en Standard-IA.
- **Taille minimale facturable** : un objet de 20 Ko en Standard-IA est facturé 128 Ko. Les très petits objets restent en S3 Standard, ou sont d'abord regroupés en objets plus gros.
- **Surcoût d'archive** : chaque objet en Glacier Flexible Retrieval ou Deep Archive ajoute 40 Ko de métadonnées (8 Ko facturés au tarif S3 Standard, 32 Ko au tarif de l'archive).
- **One Zone-IA** coûte moins cher que Standard-IA mais perd les données si sa zone de disponibilité est détruite : uniquement pour des données recréables, comme des copies de sauvegarde secondaires ou des miniatures régénérées.
- **Glacier Instant Retrieval** est la classe la moins chère avec lecture en millisecondes pour des données lues environ une fois par trimestre. **Deep Archive** est la classe la moins chère de toutes, pour des données conservées des années et presque jamais lues.

> **Piège d'examen.** Les classes d'archive de S3 ne sont pas l'ancien service Amazon Glacier. Les coffres (vaults) Amazon Glacier n'acceptent plus de nouveaux clients ; une nouvelle conception utilise les classes de stockage S3 Glacier dans un compartiment S3.

<!-- section: intelligent-tiering | objectives: 4.1.10, 4.1.19 -->
## S3 Intelligent-Tiering pour les modèles d'accès inconnus

Intelligent-Tiering déplace chaque objet entre des niveaux d'accès selon son propre historique d'accès, moyennant de faibles frais mensuels de surveillance et d'automatisation par objet. Il n'y a ni frais de récupération ni durée minimale de stockage, et un objet consulté revient au niveau Frequent Access.

| Niveau | Atteint après | Accès |
| --- | --- | --- |
| Frequent Access | Chargement, ou tout accès | Millisecondes |
| Infrequent Access | 30 jours consécutifs sans accès | Millisecondes |
| Archive Instant Access | 90 jours consécutifs sans accès | Millisecondes |
| Archive Access (facultatif) | 90 jours minimum, configurable jusqu'à 730 jours | Restauration : 3 à 5 heures (Standard) |
| Deep Archive Access (facultatif) | 180 jours minimum, configurable jusqu'à 730 jours | Restauration : sous 12 heures (Standard) |

- Les trois niveaux automatiques ne demandent aucune configuration. Les deux niveaux facultatifs s'activent par compartiment, préfixe ou balise, et seulement si l'application peut attendre une restauration.
- Les objets de moins de 128 Ko ne sont pas surveillés et restent toujours en Frequent Access.
- Choisissez-le quand l'accès est **inconnu ou changeant**. Quand le modèle est connu (« lu pendant 30 jours, puis jamais »), une règle de cycle de vie vers une classe fixe coûte moins cher, car elle évite les frais de surveillance par objet.

> **Piège d'examen.** « Accès imprévisible, lectures en millisecondes exigées, coût et effort d'exploitation minimaux » correspond à Intelligent-Tiering sans les niveaux d'archive facultatifs. Activer Archive Access casserait l'exigence de lecture en millisecondes.

<!-- section: lifecycle-rules | objectives: 4.1.7, 4.1.16, 4.1.20 -->
## Les règles de cycle de vie S3

Un compartiment a une seule configuration de cycle de vie, avec jusqu'à 1 000 règles. Chaque règle a un filtre (préfixe, balises, taille d'objet, ou une combinaison avec AND ; filtre vide = tout le compartiment) et des actions :

| Action | Effet |
| --- | --- |
| `Transition` | Déplace les versions actuelles vers une autre classe N jours après leur création (ou à une date) |
| `Expiration` | Supprime les versions actuelles ; dans un compartiment versionné, ajoute plutôt un marqueur de suppression |
| `NoncurrentVersionTransition` | Déplace les versions précédentes N jours après qu'elles sont devenues non actuelles |
| `NoncurrentVersionExpiration` | Supprime définitivement les versions précédentes ; `NewerNoncurrentVersions` conserve les 1 à 100 plus récentes |
| `AbortIncompleteMultipartUpload` | Supprime les parties des chargements non terminés après N jours |
| `ExpiredObjectDeleteMarker` | Supprime les marqueurs de suppression qui n'ont plus aucune version derrière eux |

Les transitions ne font que « descendre » la cascade : Standard → Standard-IA → Intelligent-Tiering → One Zone-IA → Glacier Instant Retrieval → Glacier Flexible Retrieval → Deep Archive (sauter des étapes est permis ; One Zone-IA ne peut aller que vers Glacier Flexible Retrieval ou Deep Archive). Une règle de cycle de vie ne ramène jamais un objet en S3 Standard : il faut une restauration puis une copie.

```json
{
  "Rules": [
    {
      "ID": "logs-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 120, "StorageClass": "GLACIER" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 2555 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration --bucket example-logs \
  --lifecycle-configuration file://lifecycle.json
```

Règles et contraintes :

- Depuis septembre 2024, les objets **de moins de 128 Ko ne sont pas transférés** par défaut ; un filtre `ObjectSizeGreaterThan` / `ObjectSizeLessThan` change ce comportement. Chaque transition est une requête facturée : transférer des millions de petits objets peut coûter plus que ce qu'on économise.
- Depuis juillet 2026, une règle peut transférer des objets vers Standard-IA ou One Zone-IA dès le jour 0. Des supports plus anciens indiquent un minimum de 30 jours en S3 Standard ; la **facturation** minimale de 30 jours de ces classes s'applique toujours.
- Une même règle ne peut pas laisser un objet dans une classe moins longtemps que le minimum de cette classe : Glacier Instant Retrieval au jour 4 puis Deep Archive au jour 20 est refusé (Deep Archive doit venir au jour 94 ou plus tard).
- La gestion des versions protège contre la suppression mais multiplie les données stockées : associez-la à `NoncurrentVersionExpiration` ou `NoncurrentVersionTransition`.
- **S3 Storage Class Analysis** observe un compartiment, un préfixe ou une balise pendant 30 jours ou plus et recommande quand passer les objets Standard en Standard-IA ; elle exporte un fichier CSV quotidien.

Dans un scénario, le cycle de vie des données se traduit le plus souvent ainsi : chaud (Standard, jours à semaines), tiède (Standard-IA ou Glacier Instant Retrieval, mois), froid (Glacier Flexible Retrieval ou Deep Archive, années), puis expiration à la fin de la durée de conservation légale.

> **Piège d'examen.** Dans un compartiment versionné, l'expiration par cycle de vie ne libère pas d'espace : elle ajoute seulement un marqueur de suppression. Ajoutez `NoncurrentVersionExpiration` pour supprimer les anciennes versions.

<!-- section: requester-pays | objectives: 4.1.1 -->
## Options d'accès : Requester Pays (paiement par le demandeur)

Par défaut, le propriétaire du compartiment paie le stockage, les requêtes et le transfert de données sortant. Avec **Requester Pays** activé sur un compartiment :

| Frais | Payés par |
| --- | --- |
| Stockage | Propriétaire du compartiment (toujours) |
| Requêtes et données téléchargées | Compte du demandeur |
| Demandeur ayant assumé un rôle IAM d'un autre compte | Compte propriétaire du rôle |
| Restauration d'un objet archivé | Le demandeur paie la requête ; le propriétaire paie la récupération |

- Chaque requête doit être **authentifiée** et porter `x-amz-request-payer: requester` (`--request-payer requester` dans la CLI). L'accès anonyme n'est plus possible.
- Usage typique : partager de gros jeux de données (génomique, imagerie, données de référence) avec des partenaires d'autres comptes AWS sans payer leurs téléchargements.

```bash
aws s3api put-bucket-request-payment --bucket example-datasets \
  --request-payment-configuration Payer=Requester
aws s3api get-object --bucket example-datasets --key 2026/data.parquet \
  data.parquet --request-payer requester
```

> **Piège d'examen.** Requester Pays ne fonctionne pas pour des utilisateurs publics ou anonymes. Si les consommateurs sont des internautes anonymes, servez plutôt les données via CloudFront.

<!-- section: backup-archive | objectives: 4.1.5, 4.1.7, 4.1.17 -->
## Solutions de sauvegarde et d'archivage

Une stratégie de sauvegarde précise ce qui est copié, à quelle fréquence (RPO), où (autre zone, Région ou compte), pour combien de temps, et comment la copie est protégée contre la suppression.

| Exigence | Solution |
| --- | --- |
| Politique de sauvegarde centrale pour EC2, EBS, EFS, FSx, RDS, Aurora, DynamoDB, S3 sur plusieurs comptes | Plans de sauvegarde AWS Backup, avec les politiques de sauvegarde d'AWS Organizations |
| Copier les sauvegardes dans une autre Région ou un autre compte pour la reprise après sinistre | Action de copie dans la règle AWS Backup (ou copie d'instantané entre Régions) |
| Restauration à un instant donné d'une base de données ou d'un compartiment | Sauvegardes continues AWS Backup (conservation de 1 à 35 jours) |
| Sauvegardes que personne ne peut supprimer, utilisateur racine compris | AWS Backup Vault Lock en mode conformité (compliance) |
| Objets WORM pour une conservation réglementaire | S3 Object Lock (mode conformité, gestion des versions requise) |
| Instantanés EBS et AMI automatisés sans frais supplémentaires | Amazon Data Lifecycle Manager |
| Instantanés EBS conservés 90 jours ou plus, rarement restaurés | EBS Snapshots Archive (coût de stockage jusqu'à 75 % inférieur) |
| Copies d'objets dans une autre Région | S3 Cross-Region Replication (gestion des versions sur les deux compartiments) |

Détails d'AWS Backup :

- Un **plan de sauvegarde** contient des règles : fréquence (de toutes les heures à mensuelle, ou cron), fenêtre de sauvegarde, cycle de vie (passage en stockage à froid, suppression après), copie vers d'autres Régions ou comptes. Les ressources sont affectées par balise ou par ID. Les sauvegardes sont stockées dans un **coffre de sauvegarde** (backup vault) chiffré par une clé KMS.
- Le **stockage à froid** impose au moins 90 jours en stockage à froid (`DeleteAfterDays` supérieur d'au moins 90 à `MoveToColdStorageAfterDays`) et est pris en charge pour EBS (via Snapshots Archive), EFS, DynamoDB avec les fonctionnalités avancées, Timestream, CloudFormation, SAP HANA sur EC2 et les sauvegardes VMware. Les instantanés RDS et Aurora ne passent pas en stockage à froid.
- **Vault Lock** : le mode gouvernance (governance) peut être retiré par des utilisateurs disposant des autorisations IAM ; le mode conformité devient immuable après un délai de grâce d'au moins 3 jours, et ensuite même AWS ne peut plus le retirer.

Les instantanés EBS sont incrémentiels et stockés dans S3 par AWS. Archiver un instantané le convertit en instantané complet et le déplace vers le niveau d'archive, qui impose un minimum de 90 jours et doit être restauré vers le niveau standard avant usage.

> **Piège d'examen.** Un instantané dans la même Région et le même compte protège contre la suppression accidentelle d'un volume, pas contre une panne régionale ni un compte compromis. « Survivre à la perte d'une Région » exige une copie dans une autre Région ; « se protéger d'un administrateur compromis » exige un autre compte plus Vault Lock ou Object Lock.

<!-- section: key-points -->
## Points clés

- Relevez quatre faits : fréquence d'accès, latence de lecture, durée de conservation, et possibilité de recréer les données.
- Durées minimales : Standard-IA et One Zone-IA 30 jours, Glacier Instant et Flexible Retrieval 90 jours, Deep Archive 180 jours. Taille minimale facturable de 128 Ko pour les classes IA et Glacier Instant Retrieval.
- Des lectures en millisecondes excluent Glacier Flexible Retrieval et Deep Archive ; Glacier Instant Retrieval est la classe en millisecondes la moins chère pour des données rarement lues.
- Accès inconnu ou changeant : Intelligent-Tiering (sans frais de récupération, frais de surveillance par objet, objets de moins de 128 Ko maintenus en Frequent Access).
- Les règles de cycle de vie ne font que descendre ; les objets de moins de 128 Ko ne sont pas transférés par défaut ; dans un compartiment versionné, ajoutez des actions sur les versions non actuelles.
- Requester Pays : le propriétaire paie le stockage, les demandeurs authentifiés paient requêtes et téléchargements ; pas d'accès anonyme.
- AWS Backup centralise les plans, les copies entre Régions et entre comptes et Vault Lock ; EBS Snapshots Archive et Data Lifecycle Manager réduisent le coût des instantanés.
