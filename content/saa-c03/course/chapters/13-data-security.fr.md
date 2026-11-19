Les questions sur la sécurité des données nomment un type de données (dossiers clients, rapports, journaux, sauvegardes) et une contrainte : qui peut les lire, combien de temps les garder, comment les chiffrer et avec quelle clé, ou comment les récupérer. Ce chapitre couvre l'accès aux données et la gouvernance, la classification et la conservation, le chiffrement au repos, les politiques de clé, le chiffrement en transit, la rotation des clés et le renouvellement des certificats, ainsi que les sauvegardes et la réplication.

<!-- section: data-governance | objectives: 1.3.1, 1.3.5 -->
## Accès aux données, gouvernance et conformité

L'accès à Amazon S3 est décidé par plusieurs couches ; toutes doivent autoriser et tout refus explicite l'emporte :

| Contrôle | Usage |
| --- | --- |
| Politiques IAM | Ce qu'un utilisateur ou un rôle de votre compte peut faire |
| Politique de compartiment | Qui peut accéder au compartiment, depuis d'autres comptes, par quel point de terminaison ou depuis quelle organisation |
| S3 Block Public Access | L'emporte sur toute ACL ou politique publique ; se règle au niveau de l'organisation, du compte, du compartiment ou du point d'accès, le plus restrictif l'emporte |
| Object Ownership : propriétaire du compartiment appliqué (bucket owner enforced) | Valeur par défaut des nouveaux compartiments : ACL désactivées, le propriétaire du compartiment possède chaque objet, l'accès est régi par les seules politiques |
| Points d'accès S3 | Un point d'entrée nommé par application ou par équipe, chacun avec sa politique, éventuellement limité à un VPC |
| URL présignée | Accès temporaire à un objet pour quelqu'un qui n'a pas d'informations d'identification AWS |

Pour un lac de données, **AWS Lake Formation** accorde des autorisations au niveau de la base, de la table, de la colonne et de la ligne sur les données cataloguées dans AWS Glue Data Catalog, de façon centralisée pour Athena, Redshift Spectrum et EMR, au lieu d'écrire des politiques de compartiment par préfixe.

Les exigences de conformité correspondent à des services :

| Exigence | Service |
| --- | --- |
| Télécharger les rapports SOC ou PCI DSS d'AWS, accepter un avenant BAA (business associate addendum) | AWS Artifact |
| Enregistrer chaque changement de configuration et évaluer les ressources par rapport à des règles (chiffrement activé, aucun compartiment public) | Règles AWS Config, packs de conformité |
| Enregistrer qui a fait quoi par l'API, dans chaque compte | AWS CloudTrail, un journal de suivi d'organisation vers un compartiment central d'archive des journaux |
| Vérifier en continu les comptes par rapport aux référentiels PCI DSS ou CIS | Normes d'AWS Security Hub CSPM |
| Empêcher les actions non conformes dans les comptes membres | SCP ou contrôles préventifs de Control Tower |
| Garder les données dans un seul pays | Choisir la Région, refuser les autres avec une SCP |

> **Piège d'examen.** AWS Artifact fournit les rapports de conformité d'AWS lui-même ; il n'évalue pas vos ressources. « Vérifier en continu que chaque volume EBS est chiffré » est une règle AWS Config.

<!-- section: classification-retention | objectives: 1.3.3, 1.3.10 -->
## Classification, conservation et cycle de vie des données

**Classez d'abord** : Amazon Macie découvre les données sensibles (noms, adresses, numéros de carte, identifiants) dans S3 avec des identifiants de données gérés et personnalisés, par découverte automatisée ou par tâches, et signale les compartiments publics ou non chiffrés. Étiquetez les résultats (`classification=confidential`) et utilisez les balises dans les politiques et les règles de cycle de vie.

**Conservez** avec le bon mécanisme :

| Exigence | Réponse |
| --- | --- |
| Personne, utilisateur racine compris, ne peut supprimer ni remplacer les objets pendant 7 ans | S3 Object Lock (verrouillage d'objet) en mode Conformité avec une période de rétention de 7 ans |
| Même protection, mais quelques administrateurs autorisés peuvent la raccourcir | S3 Object Lock en mode Gouvernance ; ils ont besoin de `s3:BypassGovernanceRetention` |
| Conserver indéfiniment certains objets pendant un litige | Conservation légale (legal hold) d'Object Lock, levée par un utilisateur disposant de `s3:PutObjectLegalHold` |
| Les sauvegardes ne peuvent pas être supprimées avant la fin de leur rétention, même par des administrateurs | AWS Backup Vault Lock en mode Conformité |
| Récupérer après des remplacements et suppressions accidentels | Gestion des versions S3, avec MFA Delete pour une protection supplémentaire |
| Supprimer automatiquement les journaux après 400 jours | Règle d'expiration S3 Lifecycle, ou paramètre de rétention de CloudWatch Logs |

Object Lock exige la gestion des versions et s'applique aux versions d'objet ; un compartiment peut avoir un mode et une période de rétention par défaut. Le mode Conformité ne peut être ni raccourci ni retiré ; la seule façon de supprimer une telle version avant sa date est de fermer le compte.

Les règles **S3 Lifecycle** font passer les objets vers des classes moins chères et les font expirer. Les durées minimales de stockage comptent : S3 Standard-IA et S3 One Zone-IA facturent au moins 30 jours, S3 Glacier Instant Retrieval et S3 Glacier Flexible Retrieval au moins 90 jours, S3 Glacier Deep Archive au moins 180 jours ; les objets doivent avoir 30 jours avant une transition de cycle de vie vers Standard-IA ou One Zone-IA. Avec la gestion des versions, ajoutez l'expiration des versions non actuelles, sinon les anciennes versions s'accumulent.

> **Piège d'examen.** Le mode Gouvernance et les conservations légales peuvent être levés par des utilisateurs autorisés ; seul le mode Conformité satisfait « personne, utilisateur racine compris ». Choisissez le mode Gouvernance quand l'énoncé garde une exception pour les administrateurs ou demande d'abord de tester les paramètres de rétention.

<!-- section: encryption-at-rest | objectives: 1.3.4, 1.3.6 -->
## Chiffrement au repos et gestion des clés

AWS KMS utilise le **chiffrement d'enveloppe** : une clé de données chiffre les données, et une clé KMS, qui ne quitte jamais en clair les HSM du service, chiffre la clé de données.

| Clé KMS | Détenue et gérée par | Politique de clé | Rotation | Coût | À choisir quand |
| --- | --- | --- | --- | --- | --- |
| Clé détenue par AWS | Le service, dans un compte AWS | Invisible | Gérée par le service | Aucun | Chiffrement par défaut sans besoin de contrôle |
| Clé gérée par AWS (`aws/s3`, `aws/ebs`) | Le service, dans votre compte | Visible, non modifiable | Chaque année, automatique | À l'utilisation uniquement | Chiffrement visible dans CloudTrail, sans administration de clé |
| Clé gérée par le client | Vous | Rédigée par vous | Facultative, automatique ou à la demande | Frais mensuels plus utilisation | Contrôler qui utilise la clé, partage entre comptes, désactivation ou suppression planifiée, rotation personnalisée |

Le chiffrement selon le service :

| Service | Chiffrement au repos |
| --- | --- |
| Amazon S3 | Chaque nouvel objet est chiffré, SSE-S3 par défaut. Options : SSE-KMS (clé KMS, auditable, avec les **S3 Bucket Keys** pour réduire le coût des requêtes KMS), DSSE-KMS (deux couches), SSE-C (votre clé, envoyée avec chaque requête ; désactivé par défaut pour les nouveaux compartiments depuis avril 2026), ou chiffrement côté client |
| Amazon EBS | Le chiffrement par défaut est un paramètre de compte par Région pour les nouveaux volumes et les copies d'instantanés ; la clé par défaut est `aws/ebs` ou une clé gérée par le client. Un volume existant non chiffré se chiffre par instantané, copie chiffrée, puis nouveau volume |
| Amazon RDS, Aurora | Choisi à la création ; couvre le stockage, les journaux, les sauvegardes automatisées, les instantanés et les réplicas en lecture. Pour chiffrer une instance existante : instantané, copie chiffrée de l'instantané, restauration. Le chiffrement ne peut pas être désactivé |
| DynamoDB | Toujours chiffré ; clé détenue par AWS par défaut, ou clé gérée par AWS ou par le client |
| Amazon EFS | Le chiffrement au repos se choisit à la création du système de fichiers, avec KMS |

Les **clés multi-Régions** partagent le matériel de clé et l'ID de clé entre Régions : des données chiffrées dans une Région se déchiffrent dans une autre sans appel de rechiffrement. **AWS CloudHSM** fournit des HSM à locataire unique validés FIPS 140-2 ou FIPS 140-3 niveau 3 (en mode FIPS), dont vous gérez les utilisateurs et les clés, pour des exigences comme « des clés dans un HSM dédié sous notre contrôle exclusif » ; un magasin de clés personnalisé KMS adossé à CloudHSM conserve les intégrations de KMS.

> **Piège d'examen.** Un instantané EBS ou RDS chiffré partagé avec un autre compte doit utiliser une clé gérée par le client : la politique de clé d'une clé gérée par AWS ne peut pas être modifiée pour autoriser un autre compte.

<!-- section: key-policies | objectives: 1.3.8 -->
## Les politiques d'accès aux clés de chiffrement

Chaque clé KMS a exactement une **politique de clé**, qui est le contrôle principal : les politiques IAM n'accordent des autorisations KMS que si la politique de clé le permet, en général par cette instruction par défaut qui délègue à IAM dans le compte :

```json
{
  "Sid": "Enable IAM User Permissions",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
  "Action": "kms:*",
  "Resource": "*"
}
```

Concevez la politique avec des instructions distinctes pour les **administrateurs de clé** (`kms:Create*`, `kms:Put*`, `kms:Enable*`, `kms:ScheduleKeyDeletion`, mais aucun usage cryptographique) et les **utilisateurs de clé** (`kms:Encrypt`, `kms:Decrypt`, `kms:ReEncrypt*`, `kms:GenerateDataKey*`, `kms:DescribeKey`). Conditions et mécanismes utiles :

| Besoin | Mécanisme |
| --- | --- |
| N'utiliser la clé que par un service (S3 dans eu-west-1) | Condition `kms:ViaService` |
| Laisser un autre compte utiliser la clé | Politique de clé qui nomme ce compte, plus une politique IAM dans ce compte |
| Donner à un service AWS un usage temporaire et limité d'une clé (EBS qui attache un volume chiffré) | Octrois (grants), créés et retirés par programme |
| Empêcher quiconque de supprimer des clés | Refuser `kms:ScheduleKeyDeletion` dans une SCP, sauf pour un rôle d'urgence |
| Trouver les clés partagées hors de l'organisation | Résultats d'accès externe d'IAM Access Analyzer |

> **Conseil d'examen.** « Séparer les tâches entre ceux qui gèrent les clés et ceux qui les utilisent » se règle dans la politique de clé : des administrateurs sans `kms:Decrypt`, des utilisateurs sans `kms:PutKeyPolicy`.

<!-- section: encryption-in-transit | objectives: 1.3.7 -->
## Le chiffrement en transit

Chiffrez avec TLS chaque saut qui franchit une frontière de confiance :

| Chemin | Comment |
| --- | --- |
| Utilisateurs vers CloudFront ou un équilibreur de charge | Écouteur HTTPS avec un certificat ACM ; rediriger HTTP vers HTTPS |
| CloudFront vers l'origine | Politique de protocole d'origine HTTPS uniquement |
| Équilibreur de charge vers les cibles | Groupe cible HTTPS (ALB) ou écouteur TLS (NLB) quand le chiffrement de bout en bout est exigé ; un écouteur TCP sur un NLB laisse passer le TLS jusqu'aux instances |
| Application vers RDS, Aurora, ElastiCache, Redshift | Connexions TLS ; imposez-les avec le paramètre du moteur (par exemple `rds.force_ssl` pour PostgreSQL) |
| Clients vers S3 | Politique de compartiment qui refuse les requêtes où `aws:SecureTransport` vaut false |
| Site local vers AWS | Site-to-Site VPN, MACsec sur Direct Connect |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-corp-records", "arn:aws:s3:::example-corp-records/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

**AWS Certificate Manager (ACM)** émet des certificats publics reconnus par les navigateurs, validés par DNS ou par e-mail, valables 198 jours, et les déploie sur les services intégrés (ELB, CloudFront, API Gateway). Les certificats sont régionaux : un certificat pour CloudFront doit être demandé dans USA Est (Virginie du Nord), un certificat pour un ALB dans la Région de l'ALB. Les certificats publics créés à partir du 17 juin 2025 peuvent être exportés pour un usage hors des services intégrés. **AWS Private CA** émet des certificats privés pour les services internes et le TLS mutuel.

> **Piège d'examen.** Un certificat demandé dans eu-west-1 ne peut pas être choisi pour une distribution CloudFront. Demandez-le ou importez-le dans us-east-1.

<!-- section: rotation-renewal | objectives: 1.3.11 -->
## Rotation des clés et renouvellement des certificats

| Élément | Rotation ou renouvellement |
| --- | --- |
| Clé KMS gérée par le client, symétrique, matériel de clé AWS | Rotation automatique, facultative, tous les 90 à 2 560 jours (365 par défaut) ; rotation à la demande à tout moment |
| Clé KMS gérée par AWS | Rotation automatique chaque année ; non modifiable |
| Matériel de clé importé | Pas de rotation automatique ; rotation à la demande uniquement |
| Clés asymétriques, HMAC et de magasin de clés personnalisé | Pas de rotation automatique : créer une nouvelle clé et déplacer l'alias |
| Certificat ACM validé par DNS, en cours d'utilisation | Renouvelé automatiquement à partir de 45 jours avant l'expiration ; l'ARN ne change pas |
| Certificat importé dans ACM | Non renouvelé par ACM ; surveiller l'expiration (règle AWS Config `acm-certificate-expiration-check`, EventBridge) et réimporter |
| Mot de passe de base de données | Rotation gérée de Secrets Manager |
| Clés d'accès IAM | Les faire tourner ou les supprimer ; trouver les clés inutilisées avec IAM Access Analyzer |

La rotation conserve l'ID de clé, l'ARN et l'ancien matériel de clé : les données plus anciennes se déchiffrent toujours, sans modifier l'application. La rotation ne rechiffre pas les données existantes. Déplacer un alias vers une nouvelle clé est la méthode manuelle : les applications qui utilisent l'alias le suivent.

Si ACM ne peut pas valider un domaine au renouvellement (un enregistrement CNAME DNS supprimé, par exemple), il envoie des événements AWS Health et EventBridge 30, 15, 7, 3 et 1 jours avant l'expiration.

> **Piège d'examen.** « Faire tourner la clé tous les 90 jours avec le moins de charge opérationnelle » est la rotation automatique d'une clé gérée par le client avec une période de 90 jours, pas une nouvelle clé et une fonction Lambda. La rotation annuelle des clés gérées par AWS ne peut pas être raccourcie.

<!-- section: backup-replication | objectives: 1.3.2, 1.3.9 -->
## Sauvegardes, réplication et récupération des données

**AWS Backup** centralise les sauvegardes d'EC2, EBS, RDS, Aurora, DynamoDB, EFS, FSx, S3 et d'autres services : un **plan de sauvegarde** (planification, rétention, passage en stockage à froid, règles de copie) attribué aux ressources par balise, stocké dans des **coffres de sauvegarde**. Les règles de copie envoient les points de récupération vers une autre Région ou un autre compte ; dans une organisation, les politiques de sauvegarde appliquent les plans à tous les comptes.

| Besoin de protection | Fonctionnalité d'AWS Backup |
| --- | --- |
| Sauvegardes immuables pendant leur rétention, contre les administrateurs et les attaquants | Vault Lock en mode Conformité (après un délai de grâce d'au moins 3 jours, le verrou ne peut plus être retiré) |
| Sauvegardes qu'un compte de production compromis ne peut pas toucher | Copie vers un coffre d'un compte de sauvegarde distinct, ou un coffre isolé logiquement (logically air-gapped vault : toujours verrouillé en mode Conformité, partageable pour la restauration avec AWS RAM) |
| Prouver que les sauvegardes ont eu lieu et sont conformes | Rapports d'AWS Backup Audit Manager |

Options propres à chaque service :

| Données | Fonctionnalité de récupération |
| --- | --- |
| Amazon S3 | Gestion des versions ; réplication (exige la gestion des versions sur la source et la destination) : CRR vers une autre Région, SRR dans la même Région ; S3 Replication Time Control réplique la plupart des objets en 15 minutes, avec un SLA ; S3 Batch Replication copie les objets existants |
| Amazon RDS | Sauvegardes automatisées avec restauration à un instant dans la période de rétention (jusqu'à 35 jours), instantanés manuels conservés jusqu'à leur suppression, copies d'instantanés entre Régions ou réplication des sauvegardes automatisées |
| DynamoDB | Restauration à un instant donné, à la seconde près, sur les 1 à 35 derniers jours (35 par défaut), sauvegardes à la demande ; une restauration crée une nouvelle table |
| Amazon EBS | Instantanés incrémentiels, automatisés par Amazon Data Lifecycle Manager ou AWS Backup, copiés entre Régions ; la Corbeille (Recycle Bin) récupère les instantanés supprimés |

| Exigence | Réponse |
| --- | --- |
| Récupérer une table DynamoDB dans son état d'il y a 10 minutes | Restauration à un instant donné (PITR) |
| Copier les objets vers une autre Région en quelques minutes, avec une garantie | CRR avec S3 Replication Time Control |
| Répliquer les objets déjà présents dans le compartiment | S3 Batch Replication |
| Une seule politique pour les sauvegardes de tous les comptes et services, avec copies entre Régions | Plans AWS Backup et politiques de sauvegarde d'organisation |
| Répliquer des objets SSE-KMS vers une autre Région | Règle de réplication avec la réplication SSE-KMS activée et une clé KMS dans la Région de destination |

> **Piège d'examen.** La réplication n'est pas une sauvegarde : une suppression ou un remplacement est répliqué aussi, hormis ce que la gestion des versions conserve. Rançongiciels et suppressions accidentelles appellent la gestion des versions, Object Lock ou des coffres de sauvegarde verrouillés.

<!-- section: key-points -->
## Points clés

- Accès S3 : IAM, politique de compartiment, Block Public Access, ACL désactivées par défaut ; Lake Formation pour les autorisations d'un lac de données.
- Macie classe les données S3 ; Object Lock en mode Conformité : personne ne peut supprimer ; en mode Gouvernance : contournement autorisé.
- Clés détenues par AWS, gérées par AWS, gérées par le client : seules les clés gérées par le client se partagent et s'administrent.
- Le chiffrement RDS se choisit à la création ; on chiffre ensuite par une copie d'instantané chiffrée.
- Les politiques de clé sont obligatoires ; IAM ne fonctionne que si la politique de clé lui délègue ; les octrois servent aux services.
- Les certificats ACM pour CloudFront se trouvent dans us-east-1 ; la validation DNS renouvelle automatiquement, pas les certificats importés.
- La rotation KMS conserve l'ID de clé et l'ancien matériel ; de 90 à 2 560 jours pour les clés gérées par le client.
- Les sauvegardes deviennent immuables avec Vault Lock et sont isolées dans un autre compte ; la réplication seule n'est pas une sauvegarde.
