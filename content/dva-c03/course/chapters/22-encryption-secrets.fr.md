Les questions de chiffrement nomment la donnée (un objet S3, un message de file d'attente, un mot de passe de base de données, une ligne de journal avec des données client) et une contrainte : qui contrôle la clé, où le chiffrement a lieu, quelle est la taille de la charge utile, ou comment un secret parvient au code sans être codé en dur. Ce chapitre couvre le chiffrement au repos et en transit, les certificats, le chiffrement côté client et côté serveur, les opérations KMS dans le code, les clés et certificats de développement, les données sensibles et la gestion des secrets.

<!-- section: encryption-at-rest-transit | objectives: 2.2.1 -->
## Le chiffrement au repos et en transit

La plupart des services chiffrent au repos par défaut ; l'examen demande quelle clé et comment l'imposer.

| Service | Chiffrement au repos |
| --- | --- |
| Amazon S3 | Chaque nouvel objet est chiffré, SSE-S3 par défaut. SSE-KMS (clé KMS, auditée dans CloudTrail ; les S3 Bucket Keys réduisent les requêtes KMS), DSSE-KMS (deux couches), SSE-C (clé envoyée avec chaque requête ; désactivé par défaut pour les nouveaux compartiments depuis avril 2026) |
| DynamoDB | Toujours chiffré : clé détenue par AWS par défaut, ou clé gérée par AWS ou par le client |
| Amazon SQS | SSE-SQS (clés gérées par SQS) ou SSE-KMS ; le corps du message est chiffré, pas les métadonnées ni les attributs ; les clés de données sont réutilisées 5 minutes par défaut (`KmsDataKeyReusePeriodSeconds`, de 1 minute à 24 heures) |
| Variables d'environnement Lambda | Toujours chiffrées avec une clé gérée par AWS, ou une clé gérée par le client ; des assistants de chiffrement facultatifs chiffrent les valeurs côté client |
| CloudWatch Logs | Toujours chiffré ; associez une clé KMS gérée par le client à un groupe de journaux pour contrôler l'accès |
| EBS, RDS, Aurora, EFS | Choisi à la création, avec KMS |

Avec SSE-KMS sur une file d'attente ou un compartiment, le producteur a besoin de `kms:GenerateDataKey` et le consommateur de `kms:Decrypt` sur la clé, dans la politique de clé ou par IAM si la politique de clé délègue à IAM.

**En transit**, chaque point de terminaison AWS utilise TLS (Bedrock, par exemple, exige TLS 1.2). Imposez-le dans les politiques de ressource :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyHttp",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-invoices", "arn:aws:s3:::example-invoices/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyUploadsWithoutKms",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::example-invoices/*",
      "Condition": { "StringNotEquals": { "s3:x-amz-server-side-encryption": "aws:kms" } }
    }
  ]
}
```

Pour vos propres points de terminaison, terminez HTTPS sur CloudFront, un Application Load Balancer ou API Gateway avec un certificat ACM, et utilisez TLS entre l'application et la base de données.

> **Piège d'examen.** Le chiffrement par défaut ne change rien pour les objets déjà présents dans un compartiment, et le SSE de SQS ne s'applique qu'aux messages envoyés après son activation. Pour rechiffrer des objets S3 existants avec une nouvelle clé, copiez-les (S3 Batch Operations pour un grand nombre d'objets).

<!-- section: certificates | objectives: 2.2.2 -->
## La gestion des certificats

**AWS Certificate Manager (ACM)** émet des certificats publics reconnus par les navigateurs et les déploie sur les services intégrés : Elastic Load Balancing, CloudFront, noms de domaine personnalisés d'API Gateway et d'autres.

| Règle | Détail |
| --- | --- |
| Validité d'un certificat public | 198 jours |
| Validation | DNS (recommandée, nécessaire au renouvellement automatique), e-mail ; HTTP uniquement pour les locataires de distribution CloudFront |
| Renouvellement | Automatique pour les certificats validés par DNS en cours d'utilisation, à partir de 45 jours avant l'expiration ; l'ARN ne change pas |
| Région | Les certificats sont régionaux : CloudFront et les domaines personnalisés d'API Gateway optimisés pour la périphérie exigent le certificat dans USA Est (Virginie du Nord) ; une API régionale ou un équilibreur de charge l'exige dans sa propre Région |
| Certificats importés | N'importe quelle autorité, format PEM ; pas de renouvellement géré : surveillez l'expiration avec EventBridge et réimportez (même ARN) |
| Exportation | Les certificats publics créés à partir du 17 juin 2025 peuvent être demandés exportables, pour des serveurs EC2 ou sur site |

**AWS Private CA** crée une autorité racine et des autorités subordonnées privées pour les noms internes, le TLS mutuel, les appareils IoT et la signature de code. Demandez un certificat privé par ACM (`aws acm request-certificate --certificate-authority-arn ...`) pour le déployer sur les services intégrés avec renouvellement géré, ou appelez `acm-pca issue-certificate` avec votre CSR pour l'installer n'importe où.

| Mode de l'autorité | Usage |
| --- | --- |
| Usage général (par défaut) | Toute durée de validité, en général avec révocation (CRL ou OCSP) |
| Certificats de courte durée (short-lived) | Certificats valables 7 jours au plus, donc sans révocation ; moins cher ; ACM ne peut pas émettre depuis une telle autorité |

Les autorités privées sont régionales et facturées par mois et par autorité, plus par certificat.

> **Piège d'examen.** « Les navigateurs doivent faire confiance au certificat d'un site web public » désigne un certificat public ACM. Les certificats de Private CA ne sont approuvés que par les clients qui font confiance à votre racine, ce qui convient aux services internes et au TLS mutuel.

<!-- section: client-server-encryption | objectives: 2.2.3 -->
## Chiffrement côté client ou côté serveur

| Exigence | Choix |
| --- | --- |
| Chiffrer au repos avec le moins d'effort ; AWS gère les clés | Côté serveur, SSE-S3 ou le chiffrement par défaut du service |
| Contrôler et auditer l'usage de la clé, révoquer l'accès en désactivant une clé | Côté serveur avec SSE-KMS et une clé gérée par le client |
| Les données ne doivent jamais arriver en clair chez AWS ; seule l'application voit le texte en clair | Chiffrement côté client |
| Chiffrer certains attributs DynamoDB avant leur écriture | AWS Database Encryption SDK pour DynamoDB (anciennement DynamoDB Encryption Client) |
| Chiffrer des objets S3 dans l'application | Amazon S3 Encryption Client |
| Chiffrer n'importe quelle donnée ou fichier dans le code, avec plusieurs clés ou Régions | AWS Encryption SDK (chiffrement d'enveloppe, trousseaux de clés KMS) |

Avec le chiffrement côté serveur, S3 déchiffre l'objet pour tout principal disposant de `s3:GetObject` (et de `kms:Decrypt` pour SSE-KMS). Avec le chiffrement côté client, AWS stocke du texte chiffré et le lecteur doit détenir la clé ; les services qui lisent le contenu, comme les requêtes Athena, ne voient que du texte chiffré.

> **Conseil d'examen.** « Chiffrer avant l'envoi vers S3 » ou « AWS ne doit pas pouvoir lire les données » signifie chiffrement côté client. « Séparer qui peut lire les données de qui peut lire le compartiment » relève de SSE-KMS avec une politique de clé.

<!-- section: kms-operations | objectives: 2.2.4 -->
## Chiffrer et déchiffrer avec des clés KMS

| Opération | Usage |
| --- | --- |
| `Encrypt` | Petites données uniquement : jusqu'à 4 096 octets avec une clé symétrique (un mot de passe, un jeton) |
| `GenerateDataKey` | Renvoie une clé de données en clair et la même clé chiffrée sous la clé KMS, pour le chiffrement d'enveloppe |
| `GenerateDataKeyWithoutPlaintext` | Seulement la clé de données chiffrée, pour un composant qui la déchiffrera plus tard |
| `Decrypt` | Un texte chiffré symétrique contient l'ID de clé, donc `KeyId` est facultatif |
| `ReEncrypt` | Changer la clé KMS d'un texte chiffré sans exposer le texte en clair |

**Chiffrement d'enveloppe** : appelez `GenerateDataKey`, chiffrez les données localement avec la clé en clair, effacez la clé en clair de la mémoire, et stockez la clé de données chiffrée à côté des données. Pour lire, appelez `Decrypt` sur la clé de données chiffrée, puis déchiffrez localement. Seule la petite clé de données transite vers KMS, donc toute taille de données convient.

```bash
aws kms encrypt --key-id alias/app-secrets \
  --plaintext fileb://token.txt \
  --encryption-context purpose=api-token \
  --query CiphertextBlob --output text | base64 --decode > token.enc

aws kms decrypt --ciphertext-blob fileb://token.enc \
  --encryption-context purpose=api-token \
  --query Plaintext --output text | base64 --decode
```

```text
# Python (boto3): envelope encryption
kms = boto3.client("kms")
key = kms.generate_data_key(KeyId="alias/app-data", KeySpec="AES_256",
                            EncryptionContext={"tenant": "t-81"})
# encrypt the file locally with key["Plaintext"], then discard it
# store key["CiphertextBlob"] with the encrypted file
```

Le **contexte de chiffrement** est une donnée authentifiée non secrète : le déchiffrement échoue avec `InvalidCiphertextException` si le même contexte, casse comprise, n'est pas fourni. Il apparaît dans CloudTrail : il identifie ce qui a été déchiffré mais ne doit contenir aucune donnée sensible.

Les opérations cryptographiques symétriques partagent un quota de requêtes par compte et par Région (10 000, 20 000 ou 100 000 requêtes par seconde selon la Région), y compris les requêtes faites par les services pour vous. Sur `ThrottlingException`, réessayez avec backoff, mettez en cache les clés de données avec l'AWS Encryption SDK, ou activez les S3 Bucket Keys.

> **Piège d'examen.** « Chiffrer un fichier de 2 Mo avec KMS » n'est pas `Encrypt` (limite de 4 Ko) : utilisez `GenerateDataKey` et chiffrez localement, ou l'AWS Encryption SDK.

<!-- section: dev-certificates-ssh | objectives: 2.2.5 -->
## Certificats et clés SSH pour le développement

**Paires de clés EC2** : EC2 stocke la clé publique ; vous gardez la clé privée, téléchargée une seule fois à la création.

```bash
aws ec2 create-key-pair --key-name dev-key --key-type ed25519 \
  --key-format pem --query KeyMaterial --output text > dev-key.pem
chmod 400 dev-key.pem

ssh-keygen -m PEM -t rsa -b 4096 -f ~/.ssh/dev-rsa
aws ec2 import-key-pair --key-name dev-rsa \
  --public-key-material fileb://~/.ssh/dev-rsa.pub
```

| Règle | Détail |
| --- | --- |
| Types de clés | RSA (Linux et Windows), ED25519 (Linux uniquement) ; DSA n'est pas accepté |
| Formats de clé privée | `.pem` pour OpenSSH, `.ppk` pour PuTTY |
| Longueurs RSA importées | 1 024, 2 048 ou 4 096 bits (2 048 ou 4 096 pour EC2 Instance Connect) |
| Paire de clés créée par CloudFormation | Clé privée stockée dans Parameter Store sous `/ec2/keypair/<key-pair-id>` |
| Aucune clé à gérer | Systems Manager Session Manager, ou EC2 Instance Connect (clés temporaires poussées pour 60 secondes) |

**Certificats de développement** : pour du HTTPS local ou un équilibreur de charge de test, générez un certificat autosigné avec OpenSSL et importez-le dans ACM ; il fonctionne, mais les clients ne lui font pas confiance et ACM ne le renouvelle jamais. Pour des services de test internes qui exigent la confiance, émettez depuis une Private CA (le mode de courte durée limite le coût). Les URL signées CloudFront exigent une paire de clés RSA 2048 ou ECDSA P-256 générée avec OpenSSL, dont la clé publique est chargée dans un groupe de clés.

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout dev.key -out dev.crt -subj "/CN=dev.example.internal"
aws acm import-certificate --certificate fileb://dev.crt --private-key fileb://dev.key
```

> **Piège d'examen.** Une clé privée EC2 perdue ne peut pas être téléchargée à nouveau : AWS ne l'a jamais conservée. Créez une nouvelle paire de clés, ou connectez-vous avec Session Manager ou EC2 Instance Connect pour remplacer la clé publique.

<!-- section: sensitive-data | objectives: 2.2.6 -->
## Identifier et masquer les données sensibles, et en limiter l'accès

| Exigence | Service ou fonctionnalité |
| --- | --- |
| Trouver des PII, des données financières ou des identifiants stockés dans des compartiments S3 | Amazon Macie : découverte automatisée des données sensibles ou tâches de découverte, identifiants de données gérés et personnalisés ; résultats vers EventBridge et Security Hub CSPM |
| Masquer les PII et PHI écrites dans les journaux d'application | Politique de protection des données de CloudWatch Logs (compte ou groupe de journaux) : identifiants de données gérés pour les identifiants de connexion, les données financières, les PII, les PHI et les identifiants d'appareil, plus des identifiants personnalisés |
| Voir les données de journal non masquées | Seulement les principaux disposant de `logs:Unmask` |
| Déclencher une alarme quand les journaux contiennent des données sensibles | Métrique `LogEventsWithFindings` dans l'espace de noms `AWS/Logs` |
| Détecter ou masquer des PII dans du texte au sein de l'application | Détection des PII d'Amazon Comprehend (temps réel ou tâches de masquage par lots) |
| Bloquer ou masquer des PII dans les invites et réponses d'IA générative | Filtres d'informations sensibles d'Amazon Bedrock Guardrails (chapitre sur la sécurité de l'IA) |
| Limiter qui lit les attributs ou éléments sensibles | Conditions IAM (`dynamodb:Attributes`, `dynamodb:LeadingKeys`), tables ou compartiments séparés, politiques de clé KMS, balises ABAC |

CloudWatch Logs masque à l'ingestion : les événements ingérés avant la création de la politique restent non masqués. Le masquage s'applique à chaque point de sortie (console, Logs Insights, filtres de métriques, filtres d'abonnement). Le traitement de PHI exige aussi un service éligible HIPAA et un avenant BAA (business associate addendum), mais les contrôles techniques restent les mêmes : chiffrer, restreindre, masquer, auditer.

> **Piège d'examen.** La protection des données des messages Amazon SNS et S3 Object Lambda ne sont plus disponibles pour les nouveaux clients : ne les choisissez pas pour une nouvelle application. Masquez dans le code, avec la protection des données de CloudWatch Logs, ou avec Comprehend avant la publication.

<!-- section: secrets-management | objectives: 2.2.7 -->
## Les services de gestion des secrets

| Besoin | Secrets Manager | Parameter Store |
| --- | --- | --- |
| Type de valeur | Secrets (identifiants, clés d'API), en général JSON | Configuration et secrets : `String`, `StringList`, `SecureString` (KMS) |
| Taille maximale | 64 Ko | 4 Ko en standard, 8 Ko en avancé |
| Rotation automatique | Rotation gérée (RDS, Aurora, Redshift et d'autres), ou une fonction Lambda de rotation ; planification à partir de toutes les 4 heures | Aucune intégrée |
| Accès entre comptes | Politique de ressource sur le secret plus une clé KMS gérée par le client | Les paramètres avancés peuvent être partagés |
| Coût | Par secret et par mois, et par appel d'API | Niveau standard gratuit (10 000 paramètres) ; niveau avancé payant (100 000 paramètres, politiques de paramètre) |

Une fonction de rotation exécute quatre étapes : `createSecret` (nouvelle version étiquetée `AWSPENDING`), `setSecret` (changer le mot de passe dans la base de données), `testSecret`, `finishSecret` (déplacer `AWSCURRENT` vers la nouvelle version ; l'ancienne devient `AWSPREVIOUS`). La rotation à utilisateur unique change le mot de passe d'un utilisateur ; la rotation à utilisateurs alternés garde deux utilisateurs pour qu'un identifiant soit toujours valide. Pour RDS et Aurora, un **mot de passe d'utilisateur principal géré** laisse la base de données stocker et faire pivoter son propre secret.

Récupérer des secrets sans appeler l'API à chaque invocation :

| Méthode | Détail |
| --- | --- |
| AWS Parameters and Secrets Lambda Extension | Couche qui sert `http://localhost:2773` ; en-tête `X-Aws-Parameters-Secrets-Token` égal au jeton de session ; cache de 300 secondes par défaut (`SECRETS_MANAGER_TTL`, `SSM_PARAMETER_STORE_TTL`) |
| Bibliothèques de mise en cache côté client | Cache en mémoire dans du code de longue durée |
| Références dynamiques CloudFormation | `{{resolve:secretsmanager:prod/db:SecretString:password}}`, `{{resolve:ssm-secure:/app/prod/key}}` résolues au déploiement, jamais affichées dans le modèle |
| CodeBuild | `env: secrets-manager:` et `env: parameter-store:` dans le buildspec |
| ECS | `secrets` dans la définition de conteneur, lus avec le rôle d'exécution de tâche |

```bash
aws secretsmanager get-secret-value --secret-id prod/orders/db \
  --query SecretString --output text
aws ssm get-parameters-by-path --path /orders/prod --recursive --with-decryption
```

Le rôle d'exécution a besoin de `secretsmanager:GetSecretValue` (ou `ssm:GetParameter*`) et de `kms:Decrypt` quand une clé gérée par le client chiffre le secret. Une fonction Lambda dans un VPC sans NAT a besoin d'un point de terminaison d'interface Secrets Manager (ou Systems Manager).

> **Piège d'examen.** « Faire pivoter automatiquement le mot de passe de la base avec le moins de charge opérationnelle » désigne la rotation gérée de Secrets Manager, pas un paramètre `SecureString` avec une fonction Lambda planifiée. Choisissez Parameter Store quand l'exigence porte sur des valeurs de configuration ou le coût le plus bas sans rotation.

<!-- section: key-points -->
## Points clés

- S3 chiffre chaque nouvel objet (SSE-S3 par défaut) ; imposez SSE-KMS et TLS par des refus de politique de compartiment sur `s3:x-amz-server-side-encryption` et `aws:SecureTransport`.
- Avec SSE-KMS, les producteurs ont besoin de `kms:GenerateDataKey`, les consommateurs de `kms:Decrypt` ; le chiffrement ne s'applique qu'aux données écrites ensuite.
- Certificats publics ACM : 198 jours, la validation DNS renouvelle automatiquement, us-east-1 pour CloudFront et les API optimisées pour la périphérie ; les certificats importés ne sont pas renouvelés.
- Private CA pour la confiance interne et le TLS mutuel ; mode de courte durée pour les certificats de 7 jours ou moins.
- Chiffrement côté client quand AWS ne doit jamais voir le texte en clair : AWS Encryption SDK, S3 Encryption Client, Database Encryption SDK.
- `Encrypt` traite 4 Ko ; les données plus grandes passent par `GenerateDataKey` et le chiffrement d'enveloppe ; le contexte de chiffrement doit correspondre.
- Les clés privées EC2 se téléchargent une seule fois ; ED25519 est réservé à Linux ; Session Manager évite les clés SSH.
- Macie pour S3, protection des données de CloudWatch Logs avec `logs:Unmask`, Bedrock Guardrails pour les invites ; la protection des données des messages SNS et S3 Object Lambda sont fermées aux nouveaux clients.
- Secrets Manager fait la rotation et coûte plus cher ; Parameter Store stocke la configuration et les `SecureString` à moindre coût ; mettez en cache avec l'extension Lambda sur le port 2773.
