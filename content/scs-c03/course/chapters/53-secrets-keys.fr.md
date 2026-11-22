Ce chapitre couvre ce qui déverrouille tout le reste : mots de passe, clés d'API, éléments de clé KMS et certificats. L'examen demande comment faire tourner des informations d'identification sans interruption, comment contrôler des éléments de clé générés hors d'AWS et en quoi ils diffèrent des éléments générés par AWS, comment masquer les valeurs sensibles dans les journaux et les messages, et comment gérer clés et certificats dans plusieurs Régions.

<!-- section: secrets-rotation | objectives: 5.3.1 -->
## Gérer et faire tourner les secrets

Des informations d'identification intégrées au code, aux AMI, aux variables d'environnement ou à des paramètres en clair sont une constatation classique. La correction est un magasin qui chiffre la valeur avec KMS, contrôle l'accès avec des politiques IAM et des politiques de ressource, journalise chaque récupération dans CloudTrail et, si possible, fait tourner la valeur automatiquement.

| Besoin | AWS Secrets Manager | Systems Manager Parameter Store (`SecureString`) |
| --- | --- | --- |
| Rotation automatique | Intégrée : rotation gérée ou fonction Lambda de rotation | Aucune ; à construire soi-même (EventBridge plus Lambda) |
| Accès entre comptes | Politique de ressource sur le secret plus une clé KMS gérée par le client | Seuls les paramètres avancés peuvent être partagés, via AWS RAM |
| Réplication vers d'autres Régions | Secrets réplicas, synchronisés avec le principal | Non |
| Taille et volume | Valeurs jusqu'à 64 Ko, facturation par secret et par appel d'API | Niveau standard : 10 000 paramètres de 4 Ko, gratuit ; niveau avancé : 100 000 paramètres de 8 Ko, politiques de paramètre comme l'expiration |
| Usage typique | Informations d'identification de bases de données, clés d'API tierces, tout ce qui doit tourner | Valeurs de configuration et secrets que fait tourner un autre processus |

**Types de rotation.** La rotation gérée est configurée par le service propriétaire, sans fonction Lambda : informations d'identification de l'utilisateur principal RDS, Aurora et DocumentDB (par exemple `--manage-master-user-password` sur RDS), mots de passe d'administrateur Redshift et certificats TLS Amazon ECS Service Connect issus d'AWS Private CA. La rotation gérée des secrets externes met à jour les secrets détenus par les partenaires de Secrets Manager. Tout le reste utilise une fonction Lambda de rotation qui exécute quatre étapes (`createSecret`, `setSecret`, `testSecret`, `finishSecret`) et déplace les étiquettes intermédiaires (staging labels) : la nouvelle version porte `AWSPENDING` pendant la rotation, puis devient `AWSCURRENT`, et l'ancienne devient `AWSPREVIOUS`.

| Stratégie | Fonctionnement | À choisir quand |
| --- | --- | --- |
| Utilisateur unique (single user) | Change le mot de passe du même utilisateur de base de données | La plupart des cas, utilisateurs ponctuels ou interactifs ; les connexions ouvertes ne sont pas coupées, et une nouvelle tentative avec temporisation couvre le court intervalle |
| Utilisateurs alternés (alternating users) | La première rotation clone l'utilisateur ; chaque rotation suivante change l'utilisateur inactif, de sorte qu'un jeu valide existe toujours | Applications à haute disponibilité ; exige un secret distinct contenant des informations d'identification de superutilisateur capable de créer et modifier des utilisateurs |

La rotation peut s'exécuter jusqu'à toutes les quatre heures, avec une expression de planification et une fenêtre. Une fonction de rotation dans un VPC a besoin d'un chemin vers le point de terminaison Secrets Manager (un point de terminaison de VPC d'interface ou une passerelle NAT) et vers la base de données.

```bash
aws secretsmanager rotate-secret --secret-id prod/orders/db --rotation-lambda-arn arn:aws:lambda:eu-west-1:111122223333:function:orders-db-rotation --rotation-rules '{"ScheduleExpression":"rate(30 days)","Duration":"3h"}'
aws secretsmanager replicate-secret-to-regions --secret-id prod/orders/db --add-replica-regions Region=eu-central-1,KmsKeyId=alias/orders-secrets
```

**L'accès entre comptes** demande trois éléments : une politique de ressource sur le secret qui nomme le rôle externe, une clé KMS gérée par le client dont la politique de clé autorise `kms:Decrypt` à ce rôle, et une politique d'identité dans l'autre compte qui autorise `secretsmanager:GetSecretValue` sur l'ARN du secret et `kms:Decrypt` sur la clé. Utilisez `BlockPublicPolicy` lors de l'appel à `PutResourcePolicy` pour rejeter une politique qui rendrait le secret public, et n'accordez jamais `secretsmanager:PutResourcePolicy` à des principaux extérieurs. Les secrets réplicas sont des copies en lecture seule ; la rotation s'exécute sur le principal et se propage.

Les clés d'accès IAM à long terme sont aussi des informations d'identification : préférez les rôles (profils d'instance, IAM Roles Anywhere, Identity Center), et détectez les clés anciennes avec la règle gérée AWS Config sur la rotation des clés d'accès.

> **Piège d'examen.** Un secret chiffré avec la clé gérée par AWS `aws/secretsmanager` ne peut pas être lu depuis un autre compte, quoi que dise la politique de ressource, car la politique de cette clé n'est pas modifiable. Les secrets entre comptes exigent toujours une clé gérée par le client.

<!-- section: imported-key-material | objectives: 5.3.2 -->
## Utiliser des éléments de clé importés et des magasins de clés externes

Importer des éléments de clé (bring your own key) signifie générer les éléments dans votre propre infrastructure et en confier une copie à KMS. KMS les utilise alors comme n'importe quelle autre clé, mais la durabilité et une partie du cycle de vie deviennent votre affaire.

1. **Créer une clé KMS sans éléments de clé**, origine `EXTERNAL`. Les clés symétriques, asymétriques (sauf ML-DSA et ML-KEM), HMAC et multi-Régions peuvent être créées ainsi ; pas les clés des magasins de clés personnalisés.
2. **Télécharger une clé publique d'encapsulage et un jeton d'importation** avec `get-parameters-for-import` : spécification de clé d'encapsulage `RSA_4096` (recommandée), `RSA_3072` ou `RSA_2048`, et un algorithme tel que `RSAES_OAEP_SHA_256` pour des éléments symétriques ou `RSA_AES_KEY_WRAP_SHA_256` pour des clés privées RSA. Les deux sont valables 24 heures.
3. **Encapsuler les éléments de clé** avec la clé publique, dans votre HSM ou votre gestionnaire de clés.
4. **Les importer**, en choisissant `KEY_MATERIAL_EXPIRES` avec une date `--valid-to` (au plus 365 jours plus tard) ou `KEY_MATERIAL_DOES_NOT_EXPIRE`.
5. **Conserver l'original en sécurité** : AWS ne peut pas le récupérer, et réimporter les mêmes éléments est le seul retour possible après expiration ou suppression.

**Rotation des éléments importés.** La rotation automatique ne s'applique jamais aux clés importées. Pour les clés de chiffrement symétriques, importez de nouveaux éléments avec `--import-type NEW_KEY_MATERIAL` (la clé passe à l'état Pending rotation), puis lancez une rotation à la demande ; les anciens éléments restent associés à la clé, donc les textes chiffrés existants se déchiffrent toujours, et chaque élément peut avoir sa propre expiration. La rotation à la demande est limitée à 25 par clé. Pour les clés asymétriques ou HMAC importées, `ImportType` est rejeté : la rotation consiste à créer une nouvelle clé et à déplacer l'alias.

```bash
aws kms get-parameters-for-import --key-id 0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e --wrapping-algorithm RSAES_OAEP_SHA_256 --wrapping-key-spec RSA_4096
aws kms import-key-material --key-id 0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e --encrypted-key-material fileb://EncryptedKeyMaterial.bin --import-token fileb://ImportToken.bin --expiration-model KEY_MATERIAL_EXPIRES --valid-to 2027-06-30T00:00:00Z --import-type NEW_KEY_MATERIAL --key-material-description "2027 rotation"
aws kms rotate-key-on-demand --key-id 0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e
```

**L'expiration et la suppression comme contrôles.** Quand les éléments expirent ou que vous appelez `delete-imported-key-material`, la clé passe immédiatement à `PendingImport` et devient inutilisable. Les clés de données déjà déchiffrées par un service (par exemple un volume EBS attaché) continuent de fonctionner jusqu'à la prochaine demande de déchiffrement à KMS. Réimporter les mêmes éléments rétablit la clé. C'est un coupe-circuit rapide et réversible ; planifier la suppression de la clé (7 à 30 jours) est le coupe-circuit définitif. Alertez avant l'expiration avec une alarme CloudWatch sur la métrique `SecondsUntilKeyMaterialExpiration`. Pour les clés multi-Régions à éléments importés, vous importez les mêmes éléments séparément dans chaque réplica ; les nouveaux ID d'éléments de clé se propagent depuis la clé principale, pas les éléments eux-mêmes.

**Magasins de clés personnalisés.** Quand les éléments de clé doivent résider dans un matériel que vous contrôlez :

| | Magasin de clés AWS CloudHSM | Magasin de clés externe (XKS) |
| --- | --- | --- |
| Où vit la clé | Votre cluster CloudHSM, au moins deux HSM actifs dans des zones de disponibilité différentes, via l'utilisateur de chiffrement `kmsuser` | Un gestionnaire de clés externe hors d'AWS (HSM ou logiciel), atteint via un proxy XKS que vous exploitez |
| Connectivité | À l'intérieur d'AWS | Point de terminaison public, ou service de point de terminaison de VPC que vous créez (le proxy peut tout de même être hors d'AWS) |
| Chiffrement | Clé KMS adossée à une clé de votre cluster | Double chiffrement : d'abord les éléments KMS, puis votre clé externe ; aucune des deux parties seule ne peut déchiffrer |
| Types de clés | Chiffrement symétrique uniquement | Chiffrement symétrique uniquement ; ni éléments importés, ni clés multi-Régions |
| Rotation | Manuelle : nouvelle clé KMS, déplacement de l'alias | Manuelle dans KMS ; le gestionnaire de clés externe peut faire tourner les éléments derrière l'ID de clé externe |
| Qui assure la disponibilité | Vous (taille du cluster, santé des HSM) | Vous (proxy, réseau, gestionnaire de clés) ; AWS recommande un aller-retour de 35 ms au plus |

Révoquer l'accès d'un magasin de clés externe arrête d'un coup tout usage AWS de la clé, et perdre la clé externe rend les données irrécupérables ; AWS indique que, pour la plupart des charges de travail, la charge et le risque pour la disponibilité l'emportent sur le bénéfice.

> **Piège d'examen.** « L'entreprise doit pouvoir rendre ses données inutilisables dans AWS immédiatement et rétablir l'accès plus tard » renvoie à la suppression des éléments de clé importés (puis à leur réimportation) ou, pour une exigence de type hold your own key, à la révocation d'un magasin de clés externe. Désactiver une clé fonctionne aussi et reste réversible, mais ne retire pas les éléments de clé d'AWS, ce que ces énoncés exigent généralement.

<!-- section: key-material-origins | objectives: 5.3.3 -->
## Éléments de clé importés et éléments générés par AWS

| Propriété | Générés par AWS (`AWS_KMS`) | Importés (`EXTERNAL`) |
| --- | --- | --- |
| Qui génère les éléments | KMS, dans ses HSM FIPS 140-3 niveau 3 | Vous, avec une source d'entropie que vous pouvez prouver |
| Durabilité | Gérée par AWS | Votre responsabilité : garder une copie hors d'AWS |
| Rotation automatique | Oui, clés symétriques, tous les 90 à 2 560 jours | Jamais |
| Rotation à la demande | Oui, clés symétriques | Oui, clés symétriques, après import de nouveaux éléments |
| Expiration | Non | Facultative, jusqu'à 365 jours par import, renouvelable en réimportant |
| Retrait immédiat d'AWS | Non (désactiver, ou planifier la suppression après 7 à 30 jours) | Oui, `delete-imported-key-material`, réversible en réimportant |
| Mêmes éléments dans et hors d'AWS | Non, les éléments ne quittent jamais KMS | Oui pour les clés asymétriques et HMAC (signatures et MAC interopérables) ; un texte chiffré symétrique KMS ne peut toujours pas être déchiffré hors de KMS |
| Clés multi-Régions | Éléments répliqués par KMS | Mêmes éléments importés dans chaque réplica |
| Politique de clé, octrois (grants), CloudTrail, intégrations de services | Identiques | Identiques |

Ne choisissez des éléments importés que si une exigence cite l'une de ces propriétés : preuve de la génération de la clé, copie indépendante pour la reprise après sinistre, expiration ou suppression immédiate sous votre contrôle, ou même clé de signature utilisée hors d'AWS. Les éléments importés n'apportent pas une cryptographie plus forte ; ils vous transfèrent le risque.

> **Piège d'examen.** Une clé à éléments importés ne permet pas de déchiffrer des données S3 ou EBS hors d'AWS avec votre copie des éléments : KMS ne publie pas le format de ses textes chiffrés symétriques. Si les données doivent pouvoir être déchiffrées sans AWS, chiffrez-les côté client avec des clés que vous gérez, avant leur envoi.

<!-- section: data-masking | objectives: 5.3.4 -->
## Masquer les données sensibles dans les journaux et les messages

**Les politiques de protection des données CloudWatch Logs** détectent les valeurs sensibles (informations d'identification, données financières, données personnelles, données de santé, identifiants d'appareils) avec des identifiants de données gérés, dont certains exigent aussi des mots-clés à proximité, et avec des identifiants de données personnalisés (expressions régulières).

| Comportement | Détail |
| --- | --- |
| Portée | Une politique de niveau compte (groupes de journaux existants et futurs) et une politique par groupe de journaux ; les deux s'appliquent quand elles coexistent ; 30 720 caractères par politique |
| Masquage | À chaque point de sortie : console, CloudWatch Logs Insights, filtres de métriques, filtres d'abonnement |
| Voir les originaux | Seuls les principaux disposant de `logs:Unmask` |
| Moment | Appliqué à l'ingestion ; les événements ingérés avant la politique restent non masqués |
| Classes de journaux | Standard et Essentials (anciennement Infrequent Access) |
| Surveillance | Métrique `LogEventsWithFindings` dans `AWS/Logs` ; résultats d'audit envoyés vers CloudWatch Logs, Firehose ou S3 |

```json
{
  "Name": "payments-logs-protection",
  "Version": "2021-06-01",
  "Statement": [
    {
      "Sid": "audit",
      "DataIdentifier": ["arn:aws:dataprotection::aws:data-identifier/CreditCardNumber", "arn:aws:dataprotection::aws:data-identifier/AwsSecretKey"],
      "Operation": { "Audit": { "FindingsDestination": { "S3": { "Bucket": "example-dp-findings" } } } }
    },
    {
      "Sid": "redact",
      "DataIdentifier": ["arn:aws:dataprotection::aws:data-identifier/CreditCardNumber", "arn:aws:dataprotection::aws:data-identifier/AwsSecretKey"],
      "Operation": { "Deidentify": { "MaskConfig": {} } }
    }
  ]
}
```

**La protection des données des messages Amazon SNS** (audit, désidentification ou refus des contenus de messages selon des identifiants de données) n'est plus disponible pour les nouveaux clients depuis le 30 avril 2026 ; les comptes existants la conservent, avec uniquement des mises à jour de sécurité. Le modèle recommandé pour les nouvelles conceptions : les éditeurs publient sur une rubrique d'entrée, une fonction Lambda inspecte chaque message avec Amazon Bedrock Guardrails et journalise, bloque ou expurge les données sensibles, puis publie le résultat sur la rubrique qu'utilisent les abonnés.

Par ailleurs, Amazon Macie trouve les données sensibles dans S3 sans les modifier, les filtres d'informations sensibles de Bedrock Guardrails bloquent ou masquent les données personnelles dans les invites et les réponses, et le meilleur masque consiste à ne pas journaliser la valeur du tout.

> **Piège d'examen.** Une politique de protection des données ne réécrit pas l'historique. Quand un énoncé indique que des mots de passe apparaissent déjà dans un groupe de journaux, la politique ne protège que les nouveaux événements ; les événements existants doivent être traités à part (accès restreint, export puis purge, ou conservation plus courte), et les informations d'identification divulguées doivent être changées.

<!-- section: multi-region-keys-certificates | objectives: 5.3.5 -->
## Clés et certificats dans une ou plusieurs Régions

**Les clés gérées par le client** sont régionales. Leur politique de clé est le contrôle d'accès principal : conservez une déclaration pour le compte (afin que les politiques IAM puissent déléguer), séparez les administrateurs de clés des utilisateurs de clés, et restreignez l'usage avec `kms:ViaService` ou des conditions sur le contexte de chiffrement. Les octrois (grants) donnent des permissions temporaires et étroites, surtout à des services AWS qui agissent pour vous. La suppression est toujours planifiée (7 à 30 jours) ; bloquez-la avec une SCP hors d'un rôle d'accès d'urgence.

**Les clés multi-Régions** (ID de clé commençant par `mrk-`) sont des clés liées dans différentes Régions d'une même partition qui partagent éléments de clé et ID de clé, si bien qu'un texte chiffré dans une Région peut être déchiffré dans une autre sans appel entre Régions.

| Partagé dans l'ensemble (synchronisé depuis la clé principale) | Indépendant pour chaque clé |
| --- | --- |
| ID de clé, éléments de clé et origine, spécification et usage de la clé, rotation (automatique et à la demande, gérée sur la clé principale) | Politique de clé, octrois, alias, balises, description, état activé |

Une clé à Région unique ne peut pas être convertie en clé multi-Régions ; on en crée une avec `--multi-region`, puis on la réplique, une clé par Région au plus. Promouvez un réplica avec `update-primary-region` si la Région principale est perdue. Les clés multi-Régions ne peuvent pas résider dans des magasins de clés personnalisés. Utilisez-les pour la reprise après sinistre, les applications actif-actif, le chiffrement côté client global et la signature distribuée ; sinon, AWS recommande des clés à Région unique pour leur isolement régional.

```bash
aws kms create-key --multi-region --description "Orders client-side encryption" --policy file://orders-key-policy.json
aws kms replicate-key --key-id mrk-4f8e2a1b9c7d4e3f8a2b1c0d9e8f7a6b --replica-region ap-southeast-2 --policy file://orders-key-policy-apse2.json
```

**Certificats.** Les certificats ACM sont régionaux : demandez ou importez le certificat dans chaque Région où un équilibreur de charge ou une API l'utilise, et dans US East (N. Virginia) pour CloudFront. Les certificats publics sont valables 198 jours ; ACM renouvelle automatiquement les certificats en usage validés par DNS, mais jamais les certificats importés. **Les certificats publics exportables** (facturés en supplément) peuvent être installés sur EC2, des conteneurs ou des hôtes sur site ; ACM les renouvelle 45 jours avant l'expiration, mais vous devez redéployer le certificat renouvelé, protéger la clé privée exportée et révoquer le certificat en cas de compromission.

**AWS Private CA** construit des autorités de certification (CA) racines et subordonnées. Les CA sont régionales et ne peuvent pas être copiées entre Régions : une conception multi-Régions crée une CA subordonnée dans chaque Région, toutes chaînées à la même racine, et les partage avec les comptes de charge de travail via AWS RAM.

| Exigence | Conception |
| --- | --- |
| TLS interne sur des équilibreurs de charge, CloudFront ou API Gateway, renouvelé automatiquement | Certificats privés ACM émis par une Private CA (gratuits quand vous ne pouvez pas accéder à la clé privée) |
| Certificats sur des instances, des conteneurs ou des appareils | Certificats privés exportables, ou certificats émis directement par Private CA (votre automatisation les renouvelle) |
| Identité de charge de travail à très courte validité, sans révocation | Mode certificats de courte durée (validité jusqu'à 7 jours) |
| Une seule ancre de confiance, des CA dans plusieurs Régions | CA racine dans un compte dédié, une CA subordonnée par Région, partagées via AWS RAM |

> **Piège d'examen.** Modifier la politique de clé d'une clé principale multi-Régions ne change rien dans les réplicas : politiques, octrois et alias sont indépendants. Un énoncé où le déchiffrement échoue seulement dans la seconde Région après une modification de politique renvoie à la politique de clé propre au réplica.

<!-- section: key-points -->
## Points clés

- Secrets Manager fait tourner (rotation gérée ou Lambda), réplique et partage entre comptes ; le `SecureString` de Parameter Store ne tourne pas.
- Les utilisateurs alternés exigent un secret de superutilisateur ; l'utilisateur unique est le choix par défaut.
- Les secrets entre comptes exigent une clé gérée par le client, jamais `aws/secretsmanager`.
- Le jeton d'importation et la clé d'encapsulage sont valables 24 heures ; les éléments importés peuvent expirer (365 jours au maximum) et être supprimés immédiatement, puis réimportés.
- Les clés symétriques importées tournent à la demande après import de `NEW_KEY_MATERIAL` ; jamais automatiquement.
- Magasins de clés personnalisés : clés symétriques uniquement, rotation manuelle, la disponibilité vous incombe ; XKS chiffre deux fois.
- La protection des données CloudWatch Logs masque à l'ingestion, pour les nouveaux événements ; `logs:Unmask` révèle les valeurs. La protection des données des messages SNS est fermée aux nouveaux clients ; utilisez Lambda avec Bedrock Guardrails.
- Les clés multi-Régions partagent éléments, ID et rotation ; politiques et alias restent propres à chaque Région. Les Private CA et les certificats ACM sont régionaux.
