Les questions sur le chiffrement et le masquage combinent une réglementation ou une politique d'entreprise avec un pipeline : les numéros de carte doivent être illisibles pour les analystes mais permettre les jointures, un auditeur a besoin de données agrégées sans identités, le compte d'un partenaire doit lire des objets chiffrés, chaque connexion à l'entrepôt doit utiliser TLS. La réponse choisit la technique (masquage, hachage, tokenisation, chiffrement), le service qui l'applique (Macie, Glue, DataBrew, masquage dynamique des données de Redshift), le bon type de clé KMS et sa politique, et le paramètre qui impose le chiffrement en transit. Ce chapitre couvre le masquage et l'anonymisation, le chiffrement KMS, le chiffrement entre comptes et le chiffrement en transit ou avant le transit.

<!-- section: masking-anonymization | objectives: 4.3.1 -->
## Masquage et anonymisation des données

| Technique | Résultat | Réversible | Permet les jointures |
| --- | --- | --- | --- |
| Caviardage ou masquage complet | Valeur remplacée (`****`) | Non | Non |
| Masquage partiel | Une partie conservée (quatre derniers chiffres) | Non | Non |
| Hachage (SHA-256) | Même entrée, même empreinte : pseudonymisation | Non (mais devinable pour de petits ensembles de valeurs) | Oui |
| Chiffrement déterministe | Même entrée, même texte chiffré | Oui, avec la clé | Oui |
| Chiffrement probabiliste | Texte chiffré différent à chaque fois | Oui, avec la clé | Non |
| Tokenisation | Valeur remplacée par un jeton conservé dans une table de correspondance sécurisée | Via la table de correspondance | Oui |
| Généralisation, agrégation | Tranches d'âge, région au lieu de l'adresse, comptages | Non | Pas au niveau des lignes |
| Substitution aléatoire, mélange | Valeurs fictives réalistes, valeurs déplacées entre les lignes | Non | Non |

Les données pseudonymisées (hachées, chiffrées, tokenisées) restent des données personnelles au sens de nombreuses lois ; l'anonymisation doit rendre la réidentification impossible, ce qui suppose en général de généraliser ou d'agréger aussi.

**Trouver d'abord les données sensibles.** Amazon Macie analyse S3 avec des identificateurs de données gérés et personnalisés (découverte automatisée des données sensibles, ou tâches de découverte) et envoie ses résultats à EventBridge et à Security Hub. Un profil DataBrew avec détection d'entités ou la transformation Glue Detect Sensitive Data trouvent les PII dans les jeux de données.

**Les masquer dans le pipeline :**

| Outil | Capacités |
| --- | --- |
| Transformation Glue **Detect Sensitive Data** | Détecter les PII dans chaque cellule, ou détecter les champs contenant des PII sur une portion échantillonnée avec un seuil de détection ; catégories d'entités gérées (universelles, HIPAA, réseau, propres à un pays) et entités personnalisées par expression régulière ; actions : caviarder (texte de remplacement, `*******` par défaut), caviarder partiellement, hacher en SHA-256, ou enrichir avec les résultats de détection |
| Étapes de recette PII de DataBrew | `MASK_CUSTOM`, `MASK_DATE`, `MASK_DELIMITER`, `MASK_RANGE`, `CRYPTOGRAPHIC_HASH`, `ENCRYPT` et `DECRYPT` (AWS Encryption SDK avec une clé KMS, déchiffrable hors de DataBrew), `DETERMINISTIC_ENCRYPT` et `DETERMINISTIC_DECRYPT` (AES-GCM-SIV avec une clé stockée dans Secrets Manager, déchiffrable uniquement dans DataBrew), `REPLACE_WITH_RANDOM_BETWEEN`, `REPLACE_WITH_RANDOM_DATE_BETWEEN`, `SHUFFLE_ROWS` |
| Lake Formation | Exclure les colonnes sensibles, ou un filtre de données au niveau des cellules |
| Protection des données de CloudWatch Logs | Masque les données sensibles dans les événements de journal ; `logs:Unmask` pour les voir |

**Les masquer au moment de la requête** avec le **masquage dynamique des données** (dynamic data masking) de Redshift : les données stockées ne changent pas ; une politique de masquage réécrit la colonne pour les utilisateurs ou rôles auxquels elle est attachée.

```sql
CREATE MASKING POLICY mask_card
WITH (card_number VARCHAR(19))
USING ('XXXX-XXXX-XXXX-' || RIGHT(card_number, 4));

CREATE MASKING POLICY show_card
WITH (card_number VARCHAR(19))
USING (card_number);

ATTACH MASKING POLICY mask_card ON payments (card_number) TO PUBLIC;
ATTACH MASKING POLICY show_card ON payments (card_number) TO ROLE fraud_team PRIORITY 10;
```

- Les superutilisateurs et `sys:secadmin` créent et attachent les politiques.
- Quand plusieurs politiques s'appliquent, la **priorité la plus élevée** l'emporte ; priorité 0 par défaut ; une politique pour un utilisateur ou un rôle doit avoir une priorité supérieure à celle de `PUBLIC`.
- Le masquage conditionnel utilise d'autres colonnes de la ligne dans l'expression (masquage au niveau des cellules).
- Les expressions de masquage peuvent appeler des UDF SQL ou Lambda ; les UDF Python ne sont plus prises en charge après le 30 juin 2026.

> **Piège d'examen.** « Les analystes doivent faire des jointures sur l'identifiant client sans le voir » exclut le caviardage et le chiffrement probabiliste : utilisez le hachage ou le chiffrement déterministe (ou la tokenisation). « Les enquêteurs antifraude doivent voir la valeur réelle » exclut le hachage : utilisez le masquage dynamique avec une politique de priorité supérieure pour leur rôle, ou un chiffrement réversible.

<!-- section: kms-encryption | objectives: 4.3.2 -->
## Chiffrer et déchiffrer avec AWS KMS

| Type de clé | Politique de clé | Rotation | Entre comptes | Usage type |
| --- | --- | --- | --- | --- |
| Clé détenue par AWS | Non visible | Gérée par le service | Non | Chiffrement par défaut que vous ne gérez jamais (DynamoDB par défaut, Redshift par défaut depuis 2025) |
| Clé gérée par AWS (`aws/s3`, `aws/glue`...) | Visible, non modifiable | Annuelle, automatique | Non | Chiffrement avec audit CloudTrail mais sans contrôle |
| Clé gérée par le client | La vôtre | Automatique facultative (365 jours par défaut, de 90 à 2 560 jours) et à la demande | Oui | Contrôle, séparation des tâches, entre comptes, désactivation ou suppression |

Les services utilisent le **chiffrement d'enveloppe** : KMS génère une clé de données (`GenerateDataKey`), le service chiffre les données localement avec elle et stocke la clé de données chiffrée à côté des données ; la lecture appelle `Decrypt` sur la clé de données. Les principaux ont donc besoin de `kms:GenerateDataKey` pour écrire et de `kms:Decrypt` pour lire. La rotation automatique s'applique aux clés symétriques dont le matériel est généré par KMS ; l'ancien matériel est conservé, si bien que les données existantes restent lisibles.

| Service | Chiffrement au repos |
| --- | --- |
| Amazon S3 | SSE-S3 par défaut sur chaque nouvel objet ; SSE-KMS (les S3 Bucket Keys réduisent les requêtes KMS et le coût), DSSE-KMS (deux couches), SSE-C |
| Amazon Redshift | Toujours chiffré pour les nouveaux clusters (clé détenue par AWS sauf si vous choisissez une clé KMS) |
| AWS Glue | **Configuration de sécurité** sur les tâches et les robots d'analyse : cibles S3, CloudWatch Logs, signets de tâche ; **chiffrement du Data Catalog** : métadonnées (bases, tables, partitions...) avec une clé KMS symétrique, et mots de passe des connexions |
| Amazon Athena | Résultats de requête : SSE-S3, SSE-KMS ou CSE-KMS ; le paramètre « Override client-side settings » du groupe de travail l'impose |
| Amazon EMR | **Configuration de sécurité** : EMRFS sur S3 (SSE-S3, SSE-KMS, CSE-KMS, CSE-C), disque local (chiffrement EBS avec KMS, LUKS) |
| Kinesis Data Streams, Data Firehose | Chiffrement côté serveur avec une clé KMS |
| Amazon MSK, DynamoDB | Toujours chiffrés ; choisissez une clé gérée par le client pour la contrôler |

```bash
aws kms create-key --description "Data lake curated zone"
aws kms create-alias --alias-name alias/datalake-curated --target-key-id 1234abcd-12ab-34cd-56ef-1234567890ab
aws kms enable-key-rotation --key-id 1234abcd-12ab-34cd-56ef-1234567890ab --rotation-period-in-days 180

aws s3api put-bucket-encryption --bucket example-datalake \
  --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault":
    {"SSEAlgorithm": "aws:kms", "KMSMasterKeyID": "alias/datalake-curated"}, "BucketKeyEnabled": true}]}'
```

> **Piège d'examen.** Modifier le chiffrement par défaut d'un compartiment ne rechiffre pas les objets existants ; copiez-les (S3 Batch Operations pour un grand nombre). Pour une charge Athena ou Glue intense sur des données SSE-KMS qui atteint les quotas de requêtes KMS, activez les S3 Bucket Keys.

<!-- section: cross-account-encryption | objectives: 4.3.3 -->
## Le chiffrement au-delà des limites des comptes AWS

L'utilisation d'une clé KMS depuis un autre compte exige **deux** autorisations :

1. La **politique de clé** du compte propriétaire autorise l'autre compte (ou un rôle de celui-ci).
2. Une **politique IAM** de l'autre compte délègue cette autorisation à ses utilisateurs ou rôles.

Seules les opérations cryptographiques, `DescribeKey`, `CreateGrant` et quelques opérations d'octroi et de lecture fonctionnent entre comptes. Référencez la clé par son ARN de clé (ou l'ARN d'alias) ; un simple ID de clé ou nom d'alias est recherché dans le compte de l'appelant.

```json
{
  "Sid": "AllowAnalyticsAccountToDecrypt",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::444455556666:role/AthenaAnalysts" },
  "Action": ["kms:Decrypt", "kms:DescribeKey"],
  "Resource": "*"
}
```

```json
{
  "Effect": "Allow",
  "Action": "kms:Decrypt",
  "Resource": "arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"
}
```

| Scénario | Ce qu'il faut configurer |
| --- | --- |
| Un autre compte lit des objets SSE-KMS | Politique de compartiment pour le lecteur, politique de clé pour le lecteur, politique IAM dans le compte du lecteur pour `s3:GetObject` et `kms:Decrypt` |
| Des données chiffrées avec `aws/s3` doivent être partagées | Impossible : rechiffrer avec une clé gérée par le client |
| Répliquer des objets SSE-KMS vers un autre compte | Règle de réplication avec les objets SSE-KMS sélectionnés et une clé KMS de réplica dans la destination ; le rôle de réplication a besoin de `kms:Decrypt` sur la clé source et de `kms:Encrypt` sur la clé de destination |
| Emplacement Lake Formation chiffré, dans un autre compte | Enregistrer avec un rôle défini par l'utilisateur que la politique de clé autorise |
| Un service d'un autre compte utilise la clé temporairement | Octroi KMS (`CreateGrant`), retiré quand il n'est plus nécessaire |

> **Piège d'examen.** Les clés gérées par AWS ne peuvent pas être utilisées entre comptes, car leur politique de clé n'est pas modifiable. Quand un lecteur d'un autre compte reçoit `AccessDenied` sur des objets qu'il est autorisé à lire, vérifiez la clé : une clé gérée par le client et les deux politiques sont nécessaires.

<!-- section: encryption-in-transit | objectives: 4.3.4 -->
## Le chiffrement en transit et avant le transit

Les points de terminaison des services AWS utilisent TLS ; le travail consiste à **refuser** les connexions non chiffrées et à vérifier les certificats.

| Composant | Imposer TLS |
| --- | --- |
| Amazon S3 | Politique de compartiment `Deny` quand `aws:SecureTransport` vaut `false` ; `s3:TlsVersion` pour exiger une version minimale |
| Amazon Redshift | `require_ssl` défini à `true` dans le groupe de paramètres (valeur par défaut pour les nouveaux clusters et groupes de travail sans serveur depuis 2025 avec `default.redshift-2.0`) ; les clients utilisent `sslmode=verify-full` |
| RDS et Aurora | `rds.force_ssl` (PostgreSQL), `require_secure_transport` (MySQL) |
| Amazon MSK | Client-broker : TLS uniquement (par défaut), TLS et texte clair, ou texte clair ; au sein du cluster : chiffré par défaut |
| Amazon EMR | Chiffrement en transit dans la configuration de sécurité, avec des certificats gérés par EMR, un fichier zip dans S3 ou un fournisseur personnalisé |
| Connexions JDBC Glue | Option Require SSL connection sur la connexion |
| Site local vers AWS | Site-to-Site VPN (IPsec), ou Direct Connect avec MACsec ou un VPN par-dessus |

```json
{
  "Sid": "DenyInsecureTransport",
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": ["arn:aws:s3:::example-datalake", "arn:aws:s3:::example-datalake/*"],
  "Condition": { "Bool": { "aws:SecureTransport": "false" } }
}
```

Le **chiffrement avant le transit** (côté client) signifie que les données quittent le producteur déjà chiffrées, si bien que ni le réseau ni le service de stockage ne voient le texte clair :

| Besoin | Outil |
| --- | --- |
| Chiffrer des enregistrements ou des fichiers dans n'importe quelle application | AWS Encryption SDK avec un keyring KMS |
| Chiffrer des objets avant leur chargement dans S3 | Amazon S3 Encryption Client |
| Chiffrer des attributs DynamoDB avant l'écriture | AWS Database Encryption SDK |
| Spark sur EMR écrit des objets chiffrés | EMRFS CSE-KMS |
| Résultats Athena illisibles par S3 seul | CSE-KMS pour les résultats de requête |
| Masquer des champs avant que les données quittent une source | Étape `ENCRYPT` de DataBrew, Glue Detect Sensitive Data |

> **Conseil d'examen.** « Les données doivent être chiffrées avant d'être envoyées à AWS » ou « le service de stockage ne doit jamais voir le texte clair » désigne le chiffrement côté client. « Toutes les connexions à l'entrepôt doivent être chiffrées » désigne `require_ssl` (Redshift) ou `aws:SecureTransport` (S3), pas un paramètre KMS.

<!-- section: key-points -->
## Points clés

- Le hachage et le chiffrement déterministe permettent les jointures ; le caviardage et le chiffrement probabiliste non ; l'anonymisation exige en général généralisation ou agrégation.
- Macie trouve les PII dans S3 ; Glue Detect Sensitive Data caviarde ou hache dans les tâches ; les étapes PII de DataBrew masquent, hachent, chiffrent, substituent ou mélangent.
- Masquage dynamique des données de Redshift : politiques de masquage attachées à des utilisateurs, des rôles ou `PUBLIC`, la priorité la plus élevée l'emporte, gérées par `sys:secadmin` ; données stockées inchangées.
- KMS : clés détenues par AWS, gérées par AWS (rotation annuelle, non partageables) et gérées par le client (rotation de 90 à 2 560 jours, à la demande, partageables) ; chiffrement d'enveloppe avec `GenerateDataKey` et `Decrypt`.
- Configurations de sécurité Glue et chiffrement du Data Catalog, chiffrement des résultats Athena imposé par le groupe de travail, configurations de sécurité EMR, S3 Bucket Keys.
- Entre comptes : clé gérée par le client, politique de clé plus politique IAM, ARN de clé, octrois ; la réplication exige une clé de réplica.
- En transit : `aws:SecureTransport`, `require_ssl` de Redshift, `rds.force_ssl`, TLS de MSK ; avant le transit : Encryption SDK, S3 Encryption Client, CSE-KMS.
