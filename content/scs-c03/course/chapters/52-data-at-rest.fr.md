La plupart des stockages AWS étant désormais chiffrés par défaut, les questions sur les données au repos testent les choix qui entourent le chiffrement : qui contrôle et audite la clé, quelles données ne doivent jamais changer ni disparaître, combien de temps elles sont conservées, et comment les sauvegardes survivent à un attaquant muni d'informations d'identification d'administrateur. Ce chapitre couvre les types de chiffrement et les services de clés, les mécanismes d'intégrité (Object Lock, gestion des versions, signature du code, validation des fichiers), les politiques de cycle de vie et de conservation, et les conceptions de sauvegarde et de réplication qui résistent aux rançongiciels (ransomware).

<!-- section: encryption-choices | objectives: 5.2.1 -->
## Choisir le type de chiffrement et le service de clés

Partez de l'exigence, pas du service. Les mots décisifs sont généralement « l'entreprise doit gérer les clés », « auditer chaque utilisation de la clé », « AWS ne doit jamais voir le texte en clair » ou « deux couches de chiffrement ».

| Exigence de l'énoncé | Type de chiffrement |
| --- | --- |
| Chiffrer au repos, sans gestion de clé ni coût supplémentaire | SSE-S3 (le défaut pour tout nouvel objet S3 depuis janvier 2023) |
| Contrôler la politique de clé, désactiver la clé, voir chaque déchiffrement dans CloudTrail | SSE-KMS avec une clé gérée par le client |
| Règle de conformité exigeant deux couches de chiffrement indépendantes | DSSE-KMS (valeur d'en-tête `aws:kms:dsse`), clé KMS dans la Région du compartiment |
| L'entreprise fournit sa propre clé à chaque requête et S3 ne doit pas la stocker | SSE-C, désormais bloqué par défaut et activé compartiment par compartiment |
| Données chiffrées avant de quitter l'application ; AWS ne manipule jamais le texte en clair | Chiffrement côté client (AWS Encryption SDK, Amazon S3 Encryption Client, AWS Database Encryption SDK) avec des clés encapsulées par KMS |

**SSE-C en 2026.** Depuis avril 2026, SSE-C est désactivé par défaut pour les nouveaux compartiments à usage général (et pour les compartiments existants des comptes sans objet SSE-C) : les écritures qui le demandent échouent avec `403 AccessDenied` tant que le chiffrement par défaut du compartiment ne définit pas `BlockedEncryptionTypes` à `NONE`. SSE-C exige HTTPS, et S3 ne stocke jamais la clé : perdue, elle emporte l'objet.

**Les S3 Bucket Keys** réduisent jusqu'à 99 % le coût des requêtes KMS grâce à une clé de niveau compartiment de courte durée. Effets secondaires : le contexte de chiffrement devient l'ARN du compartiment, si bien que les conditions de politique de clé ou IAM écrites sur des ARN d'objets ne correspondent plus, et CloudTrail journalise moins d'événements KMS, au nom du compartiment. Les Bucket Keys ne fonctionnent pas avec DSSE-KMS.

Pour garantir que seule une clé approuvée est utilisée, combinez le chiffrement par défaut avec une politique de compartiment qui rejette les autres clés :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireApprovedKmsKey",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::example-claims-archive/*",
      "Condition": {
        "StringNotEqualsIfExists": {
          "s3:x-amz-server-side-encryption-aws-kms-key-id": "arn:aws:kms:eu-west-3:111122223333:key/1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
        }
      }
    }
  ]
}
```

**Service de clés.** Les clés gérées par le client du magasin de clés KMS standard, déjà protégées par des HSM validés FIPS 140-3 niveau de sécurité 3, répondent à presque toutes les exigences. N'en sortez que si l'énoncé exige des éléments de clé que vous avez générés (éléments importés), des HSM à locataire unique que vous contrôlez (un magasin de clés AWS CloudHSM, ou un cluster CloudHSM utilisé directement via PKCS #11, JCE ou CNG), ou des clés conservées hors d'AWS (un magasin de clés externe) ; le chapitre 53 compare ces origines.

> **Piège d'examen.** SSE-S3 chiffre en AES-256, mais les clés appartiennent à S3 : il n'y a ni politique de clé à restreindre, ni clé à désactiver, ni événement KMS par déchiffrement dans CloudTrail. « Prouver qui a déchiffré les données » ou « révoquer l'accès en désactivant la clé » signifie toujours SSE-KMS avec une clé gérée par le client.

<!-- section: service-encryption | objectives: 5.2.1 -->
## Chiffrement au repos des services de stockage et de bases de données

Chaque service a sa propre règle : quand le chiffrement peut être choisi, et s'il peut être ajouté ensuite.

| Service | Défaut et options | Quand il peut être modifié |
| --- | --- | --- |
| Amazon EBS | Le chiffrement par défaut est un paramètre de compte par Région, avec une clé KMS par défaut que vous choisissez | Nouveaux volumes uniquement ; un volume existant non chiffré se chiffre en copiant un instantané avec chiffrement puis en créant un nouveau volume |
| Amazon RDS et Aurora | Chiffrement choisi à la création avec une clé gérée par AWS ou gérée par le client ; réplicas et instantanés en héritent | Jamais sur place : instantané, copie de l'instantané avec une clé KMS, restauration vers une nouvelle instance ou un nouveau cluster |
| Amazon DynamoDB | Toujours chiffré ; clé détenue par AWS par défaut, ou clé gérée par AWS, ou clé gérée par le client | Le type de clé peut être changé sur une table existante |
| Amazon EFS | Chiffrement au repos choisi à la création | Jamais sur place : créer un système de fichiers chiffré et copier les données (DataSync) |
| Amazon S3 | SSE-S3 par défaut ; le chiffrement par défaut du compartiment peut être SSE-KMS ou DSSE-KMS | Les nouvelles écritures utilisent le nouveau défaut ; les objets existants gardent leur chiffrement jusqu'à leur copie (S3 Batch Operations) |

```bash
# Make every new EBS volume and snapshot copy in this Region encrypted with a chosen key
aws ec2 enable-ebs-encryption-by-default --region eu-west-3
aws ec2 modify-ebs-default-kms-key-id --kms-key-id alias/ebs-workloads --region eu-west-3
```

**Partager des données chiffrées entre comptes.** Les instantanés et les AMI chiffrés avec une clé gérée par AWS (`aws/ebs`, `aws/rds`) ne peuvent pas être partagés, car la politique de cette clé n'est pas modifiable. Rechiffrez la copie avec une clé gérée par le client, autorisez l'autre compte dans sa politique de clé, puis partagez ; le compte destinataire la recopie sous sa propre clé, pour que ses restaurations ne dépendent pas de la clé source.

> **Piège d'examen.** Activer le chiffrement EBS par défaut ne touche pas les volumes existants et ne s'applique qu'à une seule Région. Un énoncé qui demande de « garantir que tous les volumes existants et futurs sont chiffrés dans toutes les Régions » exige le paramètre dans chaque Région, une migration des volumes existants et un contrôle de détection, comme la règle gérée AWS Config sur les volumes chiffrés.

<!-- section: integrity | objectives: 5.2.2 -->
## Protéger l'intégrité des données

Les contrôles d'intégrité empêchent les modifications et prouvent qu'il n'y en a pas eu.

**La gestion des versions S3 (Versioning)** conserve chaque version ; une suppression simple ajoute seulement un marqueur de suppression, et la gestion des versions peut être suspendue mais jamais retirée. MFA delete, que seul l'utilisateur racine peut activer via la CLI ou l'API, exige un second facteur pour supprimer définitivement une version ou changer l'état de la gestion des versions.

**S3 Object Lock** applique un modèle WORM (une écriture, plusieurs lectures) aux versions d'objets. Il exige la gestion des versions, peut désormais être activé sur des compartiments existants, et ne peut plus jamais être désactivé ensuite ; la gestion des versions ne peut plus être suspendue.

| Contrôle | Ce qu'il empêche | Qui peut encore le contourner |
| --- | --- | --- |
| Conservation en mode gouvernance (governance) | L'écrasement ou la suppression de la version, et la modification de son verrou | Les principaux disposant de `s3:BypassGovernanceRetention` qui envoient l'en-tête `x-amz-bypass-governance-retention:true` (la console l'envoie) |
| Conservation en mode conformité (compliance) | La suppression de la version par tout utilisateur, racine compris ; le mode ne peut pas changer et la période ne peut pas être raccourcie | Personne ; la seule sortie anticipée est la fermeture du compte |
| Conservation légale (legal hold) | La suppression jusqu'au retrait de la conservation, sans date de fin et indépendamment de toute période de conservation | Les principaux disposant de `s3:PutObjectLegalHold` |
| Conservation par défaut du compartiment | Applique un mode et une période (jours ou années) à chaque nouvelle version sans réglage explicite | Une conservation explicite au chargement la remplace |

Un `DELETE` simple sur un objet verrouillé ajoute un marqueur de suppression et laisse intacte la version protégée ; un `DELETE` avec son ID de version renvoie `403`. Plafonnez les durées de verrouillage avec la clé de condition `s3:object-lock-remaining-retention-days` dans la politique de compartiment. Répliquer depuis un compartiment verrouillé exige Object Lock sur la destination ainsi que `s3:GetObjectRetention` et `s3:GetObjectLegalHold` dans le rôle de réplication.

```bash
aws s3api put-object-lock-configuration --bucket example-trade-records --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Years":7}}}'
aws s3api put-object-legal-hold --bucket example-trade-records --key 2026/11/ledger.csv --legal-hold Status=ON
```

**S3 Glacier Vault Lock** appartient au service Amazon Glacier d'origine, fondé sur des coffres (vaults), qui n'accepte plus de nouveaux clients. Sur les coffres existants, on lance la politique de verrouillage (état en cours, avec un ID de verrou) et on doit la finaliser sous 24 heures, sinon elle est supprimée ; une fois finalisée, elle ne peut plus jamais être modifiée ni supprimée. Les nouvelles archives WORM utilisent S3 Object Lock avec les classes de stockage S3 Glacier.

**Signature numérique du code.** AWS Signer gère les profils de signature. Une configuration de signature de code Lambda liste les profils autorisés et l'action en cas d'échec des vérifications d'expiration, de non-correspondance ou de révocation : `Warn` (défaut) déploie et émet la métrique `SignatureValidationErrors`, `Enforce` bloque le déploiement ; l'intégrité est également vérifiée. Cela s'applique aux packages .zip et à leurs couches (layers), et le code déjà déployé continue de s'exécuter jusqu'au déploiement suivant. Signer signe aussi les images Amazon ECR avec la CLI Notation, vérifiées au déploiement sur Amazon EKS.

**Validation des fichiers.**

| Preuve demandée | Mécanisme |
| --- | --- |
| Prouver que les fichiers journaux CloudTrail n'ont été ni modifiés ni supprimés après leur livraison | Validation de l'intégrité des fichiers journaux : fichiers de condensé (digest) horaires de hachages SHA-256, signés en SHA-256 avec RSA ; vérification avec `aws cloudtrail validate-logs` |
| Détecter une corruption pendant le chargement dans S3 | Sommes de contrôle : les SDK en calculent une automatiquement (CRC64NVME par défaut ; CRC32, CRC32C, SHA-1, SHA-256 et d'autres disponibles) et S3 la valide avant de stocker l'objet |
| Prouver qu'une copie DataSync correspond à la source | Mode de vérification `ONLY_FILES_TRANSFERRED` (recommandé) ou `POINT_IN_TIME_CONSISTENT` (indisponible en mode Enhanced) |

> **Piège d'examen.** Le mode gouvernance n'est pas « immuable » : un administrateur disposant de `s3:BypassGovernanceRetention` peut supprimer les données. Quand un régulateur (la SEC 17a-4, par exemple) ou un scénario de rançongiciel exige que personne, utilisateur racine compris, ne puisse supprimer les enregistrements pendant la période, la réponse est le mode conformité.

<!-- section: lifecycle-retention | objectives: 5.2.3 -->
## Gestion du cycle de vie et conservation

La conservation a deux faces : garder les données au moins aussi longtemps que requis, et les supprimer dès qu'elles ne sont plus autorisées ni utiles. Automatisez les deux.

**Les règles S3 Lifecycle**, filtrées par préfixe, balises ou taille, font passer les objets d'une classe de stockage à l'autre, font expirer les versions actuelles et les versions non actuelles (en gardant éventuellement quelques versions plus récentes), suppriment les marqueurs de suppression expirés et abandonnent les chargements partitionnés incomplets. Durées minimales facturées : 30 jours pour Standard-IA et One Zone-IA, 90 pour Glacier Instant Retrieval et Glacier Flexible Retrieval, 180 pour Glacier Deep Archive. Le cycle de vie ne supprime jamais une version encore protégée par Object Lock.

```json
{
  "Rules": [
    {
      "ID": "claims-retention-7y",
      "Filter": { "Prefix": "claims/" },
      "Status": "Enabled",
      "Transitions": [ { "Days": 90, "StorageClass": "GLACIER_IR" }, { "Days": 365, "StorageClass": "DEEP_ARCHIVE" } ],
      "Expiration": { "Days": 2557 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

Une association classique : Object Lock en mode conformité avec une conservation par défaut de sept ans garantit le minimum, et une expiration Lifecycle juste après sept ans garantit le maximum.

**Les politiques de cycle de vie Amazon EFS** déplacent les fichiers selon leur dernier accès, et les opérations sur les métadonnées, comme le listage d'un répertoire, ne comptent pas comme un accès. Par défaut, les fichiers non lus depuis 30 jours passent en Infrequent Access et après 90 jours en Archive, et ils y restent quand ils sont lus, sauf si Transition into Standard vaut On first access (au premier accès). Les métadonnées restent toujours en Standard, et la conservation pour EFS vient d'AWS Backup.

**Les sauvegardes Amazon FSx for Lustre** n'existent que pour les systèmes de fichiers persistants non liés à un référentiel de données S3 ; les systèmes de fichiers scratch et ceux liés à S3 s'appuient sur S3. Les sauvegardes quotidiennes automatiques sont conservées de 0 à 90 jours, et le défaut est 0, c'est-à-dire désactivé. Les sauvegardes lancées par l'utilisateur n'expirent jamais, même après la suppression du système de fichiers. AWS Backup ajoute une conservation plus longue, des planifications horaires et des copies vers d'autres comptes ou Régions.

**La Corbeille (Recycle Bin)** conserve les instantanés EBS et les AMI basées sur EBS supprimés pendant 1 à 365 jours, et les volumes EBS supprimés pendant 1 à 7 jours, via des règles de niveau balise ou de niveau Région (avec des balises d'exclusion facultatives). Une règle verrouillée ne peut être ni modifiée ni supprimée tant qu'elle n'a pas été déverrouillée et que le délai de déverrouillage n'est pas écoulé.

> **Piège d'examen.** Un système de fichiers persistant FSx for Lustre créé sans valeur de conservation n'a aucune sauvegarde automatique. « Des sauvegardes quotidiennes conservées 35 jours avec le moins de charge opérationnelle » signifie régler la conservation des sauvegardes automatiques à 35 jours (ou un plan AWS Backup) ; un système de fichiers scratch se reconstruit plutôt à partir de S3.

<!-- section: backup-replication | objectives: 5.2.4 -->
## Sauvegarde, réplication sécurisées et protection contre les rançongiciels

Supposez que l'attaquant détient des informations d'identification d'administrateur dans le compte de la charge de travail. La conception des sauvegardes doit quand même laisser une copie impossible à supprimer, chiffrée avec une clé que l'attaquant ne peut pas désactiver, dans un compte qu'il ne contrôle pas.

**AWS Backup** centralise les plans (planification, cycle de vie, règles de copie) pour EBS, EC2, RDS, Aurora, DynamoDB, EFS, FSx, S3 et d'autres ; les politiques de sauvegarde d'Organizations les poussent dans chaque compte, et les règles de copie envoient les points de récupération vers une autre Région ou vers un compte de sauvegarde dédié.

| Protection du coffre | Comportement |
| --- | --- |
| Politique d'accès au coffre | Politique de ressource sur le coffre, par exemple un refus de `backup:DeleteRecoveryPoint` pour tous sauf un rôle de récupération |
| Vault Lock, mode gouvernance | Bloque la suppression et la modification du cycle de vie, mais les principaux disposant de permissions IAM suffisantes peuvent retirer le verrou |
| Vault Lock, mode conformité | Après le délai de grâce (au moins 72 heures, `--changeable-for-days`), personne, ni l'utilisateur racine ni AWS, ne peut supprimer des points de récupération non expirés, modifier le verrou ou supprimer un coffre non vide |
| Conservation minimale et maximale | Les tâches de sauvegarde et de copie dont la conservation sort de la plage (1 à 36 500 jours) échouent |
| Coffre isolé logiquement (logically air-gapped vault) | Toujours verrouillé en mode conformité ; clé détenue par AWS par défaut ou clé gérée par le client fixée à la création ; partagé avec des ID de comptes précis via AWS RAM pour des restaurations ailleurs ; avec l'approbation multipartite (multi-party approval), récupérable même si le compte propriétaire est inaccessible |

```bash
aws backup create-logically-air-gapped-backup-vault --backup-vault-name org-recovery-vault --min-retention-days 7 --max-retention-days 120
aws ec2 lock-snapshot --snapshot-id snap-0a1b2c3d4e5f67890 --lock-mode compliance --cool-off-period 24 --lock-duration 90
```

**Amazon Data Lifecycle Manager** automatise les instantanés EBS et les AMI basées sur EBS sans coût supplémentaire (jamais les AMI basées sur le stockage d'instance).

| Fonctionnalité | Politique par défaut | Politique personnalisée |
| --- | --- | --- |
| Cibles | Tous les volumes ou instances de la Région sans instantané récent | Volumes ou instances portant des balises précises |
| Copie entre Régions | Oui, paramètres par défaut | Oui, avec sa propre conservation et sa propre clé KMS |
| Partage entre comptes, restauration rapide d'instantanés (fast snapshot restore), archivage, scripts pré et post | Non | Oui |
| Planifications et conservation | Une planification, fondée sur l'âge | Jusqu'à 4 planifications, fondées sur l'âge ou le nombre |

Une politique d'événement de copie entre comptes (cross-account copy event policy) dans le compte de sauvegarde copie sous sa propre clé les instantanés partagés avec lui. **Le verrouillage d'instantanés EBS (snapshot lock)** ajoute une protection WORM par instantané : mode gouvernance, ou mode conformité avec une période de refroidissement facultative de 1 à 72 heures, pour 1 à 36 500 jours ; après le refroidissement, le verrou ne peut plus qu'être prolongé.

**AWS DataSync** chiffre le trafic entre les emplacements en TLS mutuel 1.3 et vérifie les données par des sommes de contrôle pendant et après le transfert ; utilisez un point de terminaison de VPC pour l'agent et des rôles IAM limités à la destination.

**La réplication S3** exige la gestion des versions sur les deux compartiments ; les objets SSE-KMS ne sont répliqués que si la règle active la réplication des objets chiffrés par KMS et désigne une clé de destination. Pour une copie de sauvegarde, faites du compte de destination le propriétaire des réplicas et laissez désactivée la réplication des marqueurs de suppression : les suppressions de versions précises ne sont jamais répliquées, donc une purge dans la source n'atteint pas la copie.

| Tactique du rançongiciel | Contre-mesure |
| --- | --- |
| Supprimer les sauvegardes avec des informations d'identification d'administrateur volées | Copies dans un compte de sauvegarde distinct, Vault Lock en mode conformité ou coffre isolé logiquement, SCP refusant la suppression |
| Planifier la suppression de la clé KMS qui protège les sauvegardes | Clé gérée par le client détenue par le compte de sauvegarde (ou clé détenue par AWS d'un coffre isolé), SCP refusant `kms:ScheduleKeyDeletion`, alarme sur l'événement |
| Chiffrer ou écraser les objets S3 | Gestion des versions, Object Lock, réplication vers un compartiment verrouillé d'un autre compte |
| Supprimer les instantanés EBS et les AMI | Règles de Corbeille (verrouillées), verrouillage d'instantanés EBS |

> **Piège d'examen.** Copier les sauvegardes dans une autre Région du même compte ne protège pas contre un compte compromis. L'exigence décisive « même si le compte de production est compromis » demande un autre compte, un verrou en mode conformité et une clé que le compte de production ne peut pas supprimer.

<!-- section: key-points -->
## Points clés

- SSE-S3 est le défaut ; SSE-KMS avec une clé gérée par le client est nécessaire pour contrôler et auditer l'usage de la clé ; DSSE-KMS pour deux couches ; SSE-C est bloqué par défaut sur les nouveaux compartiments depuis avril 2026.
- Les Bucket Keys réduisent les appels KMS mais font du contexte de chiffrement l'ARN du compartiment ; indisponibles avec DSSE-KMS.
- Le chiffrement EBS par défaut est par Région et ne concerne que les nouveaux volumes ; le chiffrement RDS et EFS ne s'ajoute pas sur place.
- Object Lock : le mode gouvernance se contourne avec `s3:BypassGovernanceRetention`, le mode conformité non ; les conservations légales n'ont pas de date de fin ; une fois activé, Object Lock ne se désactive pas.
- Glacier Vault Lock ne concerne que les clients existants des coffres ; les nouvelles conceptions utilisent S3 Object Lock.
- Signature de code Lambda : `Warn` par défaut, `Enforce` bloque ; les fichiers de condensé CloudTrail prouvent l'intégrité des journaux.
- La conservation des sauvegardes automatiques FSx for Lustre vaut 0 jour par défaut ; les systèmes de fichiers scratch et liés à S3 n'ont pas de sauvegarde.
- Résilience aux rançongiciels : compte distinct, verrous en mode conformité (Vault Lock, coffre isolé, verrouillage d'instantanés, Object Lock) et une clé que l'attaquant ne peut pas supprimer.
