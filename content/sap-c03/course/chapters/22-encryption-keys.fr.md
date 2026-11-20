Au niveau professionnel, les questions de chiffrement demandent rarement s'il faut chiffrer : elles demandent où vivent les clés, qui peut les utiliser depuis quel compte et quelle Région, comment elles tournent sans toucher aux applications, quel matériel un régulateur accepte et comment se préparer aux attaquants dotés d'ordinateurs quantiques. Ce chapitre couvre les clés KMS gérées par le client et leur rotation dans les conceptions multicomptes et multi-Régions, la gestion de TLS et des certificats avec ACM et AWS Private CA, les HSM dédiés avec AWS CloudHSM, et les stratégies post-quantiques avec ML-KEM et ML-DSA.

<!-- section: kms-customer-managed | objectives: 2.2.1 -->
## Clés gérées par le client et rotation automatique

Une clé gérée par le client est le choix par défaut dès qu'un énoncé parle de contrôle : qui peut utiliser la clé, séparation des tâches, accès entre comptes, possibilité de désactiver la clé, ou calendrier de rotation fixé par l'équipe sécurité. Les clés gérées par AWS (`aws/<service>`) tournent environ tous les 365 jours selon un calendrier fixe et leur politique de clé n'est pas modifiable : elles ne peuvent donc pas être partagées avec un autre compte.

**Options de rotation des clés KMS**

| Clé | Rotation automatique | Rotation à la demande | Sinon |
| --- | --- | --- | --- |
| Symétrique, origine `AWS_KMS` | Oui, tous les 90 à 2 560 jours (365 par défaut) | Oui, jusqu'à 25 par clé | Rien |
| Symétrique, matériel importé (`EXTERNAL`) | Non | Oui, après import du nouveau matériel | Suivre l'expiration du matériel |
| Clé multi-Régions, origine `AWS_KMS` | Oui, réglée sur la clé principale seulement, synchronisée vers les réplicas | Oui, lancée sur la clé principale | Rien |
| Asymétrique, HMAC, ou clé dans un magasin de clés personnalisé | Non | Non | Créer une nouvelle clé, déplacer l'alias |

La rotation ne change que le matériel de clé actuel : l'ID de clé, l'ARN, l'alias et la politique restent, les anciens textes chiffrés se déchiffrent toujours avec la version qui les a chiffrés, et aucune modification d'application n'est nécessaire. La rotation ne rechiffre pas les données existantes et ne fait pas tourner les clés de données déjà émises. La rotation à la demande ne décale pas le calendrier automatique. Les frais mensuels de la clé n'augmentent que pour la première et la deuxième rotation.

```bash
# Rotate every 180 days, and restrict the allowed periods with kms:RotationPeriodInDays in policies
aws kms enable-key-rotation --key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab --rotation-period-in-days 180
aws kms rotate-key-on-demand --key-id arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
```

**Propriété des clés dans une organisation**

| Conception | Force | Faiblesse |
| --- | --- | --- |
| Une clé par compte de charge de travail, créée par le pipeline | Rayon d'impact d'un seul compte, quotas par compte, l'équipe de la charge de travail possède sa clé | L'équipe sécurité a besoin d'un chemin d'audit entre comptes (CloudTrail, Config) |
| Compte de clés central, clés utilisées entre comptes | Un seul endroit pour l'administration des clés et la protection contre la suppression | Chaque consommateur a besoin de la politique de clé et d'une politique IAM ; les quotas de requêtes KMS sont partagés par le compte de la clé |
| Clés multi-Régions (principale plus réplicas) | Même ID de clé et même matériel dans plusieurs Régions : un texte chiffré dans une Région se déchiffre dans une autre sans appel entre Régions | Chaque réplica a sa propre politique de clé, à garder cohérente ; une compromission touche toutes les Régions |

Une clé utilisée par un autre compte exige deux niveaux de confiance : la politique de clé nomme l'autre compte (ou son rôle), et une politique IAM dans ce compte autorise les actions KMS sur l'ARN de la clé. Utilisez des conditions pour restreindre l'usage :

```json
{
  "Sid": "AllowUseThroughS3FromWorkloadAccount",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::444455556666:role/app-data-writer" },
  "Action": ["kms:GenerateDataKey", "kms:Decrypt"],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "kms:ViaService": "s3.eu-west-1.amazonaws.com",
      "kms:CallerAccount": "444455556666"
    }
  }
}
```

Protégez les clés contre la destruction : la suppression est toujours planifiée (7 à 30 jours, 30 par défaut), donc alertez sur `ScheduleKeyDeletion` avec EventBridge et refusez-la dans une SCP sauf pour un rôle d'urgence (break-glass). Un contexte de chiffrement passé à chaque appel lie le texte chiffré à son locataire ou à son enregistrement et apparaît dans CloudTrail, ce qui sert à la fois l'autorisation (clés de condition `kms:EncryptionContext:`) et l'audit.

> **Piège d'examen.** « Faire tourner le matériel de clé et rechiffrer tous les objets existants » n'est pas ce que fait la rotation KMS. La rotation ne protège que les nouveaux chiffrements ; rechiffrer les données exige une tâche de copie (S3 Batch Operations, copie d'instantané) avec la nouvelle clé.

<!-- section: tls-certificates | objectives: 2.2.2 -->
## Chiffrement en transit et gestion des certificats

Terminez TLS là où l'énoncé exige de l'inspection ou du routage, et rechiffrez vers la cible quand il exige un chiffrement de bout en bout. Choisissez la politique TLS délibérément : un écouteur HTTPS ou TLS d'Application Load Balancer ou de Network Load Balancer créé dans la console utilise `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` par défaut, mais un écouteur créé avec l'AWS CLI, CloudFormation ou le CDK reçoit `ELBSecurityPolicy-2016-08` si vous ne fixez pas la politique explicitement.

| Exigence | Politique de sécurité de l'écouteur |
| --- | --- |
| TLS 1.3 uniquement | `ELBSecurityPolicy-TLS13-1-3-2021-06` ou `ELBSecurityPolicy-TLS13-1-3-PQ-2025-09` |
| TLS 1.2 et 1.3 avec des chiffrements forts, échange de clés hybride post-quantique pour les clients compatibles | `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` (recommandée) |
| Module cryptographique validé FIPS sur l'équilibreur de charge | Une politique `FIPS`, par exemple `ELBSecurityPolicy-TLS13-1-2-Res-FIPS-PQ-2025-09` |
| Les clients s'authentifient par certificat | TLS mutuel (mTLS) sur l'ALB avec un magasin d'approbation (trust store) de vos certificats d'autorité, ou mTLS sur un nom de domaine personnalisé API Gateway |
| Les clients doivent utiliser TLS 1.2 ou plus pour joindre S3 | Politique de compartiment qui refuse les requêtes où `s3:TlsVersion` est inférieur à 1.2, et refuse `aws:SecureTransport` à false |

**AWS Certificate Manager** émet des certificats publics, validés par DNS ou par e-mail, valables 198 jours, renouvelés automatiquement quand ils sont utilisés et que la validation DNS fonctionne toujours ; l'ARN ne change pas. Les certificats importés ne sont jamais renouvelés par ACM : surveillez leur expiration. Les certificats ACM sont régionaux, et un certificat pour CloudFront doit se trouver dans USA Est (Virginie du Nord).

**AWS Private CA** construit une hiérarchie privée (racine, subordonnées) pour le TLS interne, le mTLS entre services et l'identité des appareils :

| Besoin | Conception |
| --- | --- |
| Points de terminaison internes sur ELB, CloudFront ou API Gateway avec renouvellement automatique | Certificats privés demandés par ACM auprès d'une Private CA ; leur clé privée n'est pas accessible et ils sont gratuits |
| Certificats installés sur des instances ou des conteneurs | Certificats privés ACM exportables, ou certificats émis directement par Private CA (`IssueCertificate`, non renouvelés par ACM) |
| Certificats de très courte durée, sans infrastructure de révocation | Une autorité en mode certificats de courte durée (validité de 7 jours au plus, prix inférieur, dernière autorité de la hiérarchie ; ACM ne peut pas émettre à partir d'elle) |
| Une seule autorité pour tous les comptes de l'organisation | Autorité racine dans un compte sécurité, autorité subordonnée partagée avec AWS RAM |
| Révocation des certificats d'usage général | Liste de révocation (CRL) dans S3 ou OCSP |

Les autorités sont régionales et ne peuvent pas être copiées vers une autre Région : une conception multi-Régions crée une autorité subordonnée par Région sous la même racine.

> **Conseil d'examen.** « Le moins de charge opérationnelle pour les certificats TLS des ALB internes de 40 comptes » se résout par une Private CA partagée plus des certificats privés ACM, qu'ACM renouvelle et déploie ; des scripts qui appellent `IssueCertificate` et réimportent les certificats sont la charge que le qualificatif rejette.

<!-- section: cloudhsm | objectives: 2.2.3 -->
## Modules de sécurité matériels dédiés

KMS génère et protège déjà le matériel de clé dans des HSM validés FIPS 140-3 niveau de sécurité 3, dans une flotte mutualisée exploitée par AWS. Ne choisissez AWS CloudHSM que si l'exigence nomme explicitement des HSM à locataire unique, un contrôle exclusif des utilisateurs du HSM par le client, ou une interface comme PKCS #11, JCE ou CNG/KSP.

| Fait | AWS CloudHSM |
| --- | --- |
| Location et contrôle | HSM à locataire unique dans un cluster de votre VPC ; vous créez les utilisateurs cryptographiques et gérez les clés ; AWS n'a aucun accès au matériel de clé |
| Types de HSM | `hsm2m.medium` (FIPS 140-3, mode FIPS ou non-FIPS) ; `hsm1.medium` (FIPS 140-2) n'accepte plus de nouveaux clusters |
| Mode du cluster | Le mode FIPS n'autorise que les clés et algorithmes validés FIPS ; le mode non-FIPS autorise tous les algorithmes pris en charge |
| Disponibilité | Répartir au moins deux HSM entre zones de disponibilité ; le service automatise le provisionnement, les sauvegardes et la maintenance |
| Usages typiques | Déchargement TLS pour des serveurs web, Oracle TDE, signature de documents ou de code avec PKCS #11, magasin de clés personnalisé KMS |

**Choisir un magasin de clés**

| Exigence | Réponse |
| --- | --- |
| Charge de travail réglementée standard, intégrations des services AWS, débit le plus élevé | Magasin de clés standard KMS avec des clés gérées par le client |
| Prouver que vous avez généré vous-même le matériel de clé | Matériel de clé importé (BYOK) dans le magasin standard ; vous contrôlez l'expiration et la suppression du matériel |
| Matériel de clé dans des HSM à locataire unique que vous contrôlez, toujours utilisé par S3, EBS, RDS via KMS | Clé KMS dans un magasin de clés AWS CloudHSM (clés symétriques uniquement, pas de rotation automatique, pas de clés multi-Régions, débit inférieur) |
| Le matériel de clé doit rester hors d'AWS, dans un gestionnaire de clés externe | Magasin de clés externe (XKS) via un proxy XKS ; latence la plus élevée, la disponibilité vous incombe |
| L'application appelle directement les API du HSM (PKCS #11, JCE) | Cluster CloudHSM avec le Client SDK |
| Fonctions de HSM de paiement (PIN, clés de carte) | AWS Payment Cryptography, pas CloudHSM |

AWS indique que les magasins de clés personnalisés ne sont pas plus sûrs que le magasin standard ; ils échangent les performances, le SLA de 99,999 % et la simplicité d'exploitation contre une exigence de conformité. Si un magasin personnalisé est nécessaire, préférez CloudHSM à XKS, car sa connexion avec KMS reste dans le réseau AWS.

> **Piège d'examen.** « Stockage des clés validé FIPS 140-3 niveau 3 » seul n'exige pas CloudHSM : le magasin de clés standard KMS le satisfait. Les mots décisifs sont locataire unique, contrôle exclusif du HSM, ou API directe du HSM.

<!-- section: post-quantum | objectives: 2.2.4 -->
## Stratégie de cryptographie post-quantique

Un futur ordinateur quantique capable de casser la cryptographie menace les algorithmes à clé publique (RSA, ECDH, ECDSA), pas un chiffrement symétrique bien dimensionné : les données chiffrées sous des clés KMS avec AES-256-GCM sont déjà considérées comme résistantes au quantique. Le risque urgent est « récolter maintenant, déchiffrer plus tard » (harvest now, decrypt later) : des sessions TLS enregistrées dont l'échange de clés classique pourra être cassé plus tard. Le second risque concerne les signatures de longue durée (micrologiciels, code, documents, autorités racines) qui doivent rester vérifiables pendant des décennies.

| Risque | Mécanisme AWS |
| --- | --- |
| Trafic enregistré vers les API AWS, déchiffré plus tard | TLS hybride post-quantique (ECDH plus ML-KEM, FIPS 203) sur les points de terminaison d'AWS KMS, d'ACM et de Secrets Manager, servi par s2n-tls ; activez-le dans les paramètres du client HTTP des AWS SDK |
| Trafic enregistré vers vos applications | Politiques de sécurité `PQ` d'ALB ou de NLB (`X25519MLKEM768`, `SecP256r1MLKEM768`, `SecP384r1MLKEM1024`) ; les clients doivent prendre en charge ML-KEM |
| Signatures numériques de longue durée | Clés KMS asymétriques `ML_DSA_44`, `ML_DSA_65`, `ML_DSA_87` (FIPS 204), algorithme `ML_DSA_SHAKE_256` |
| Certificats résistants au quantique pour la PKI interne | Clés et algorithmes de signature AWS Private CA `ML_DSA_44`, `ML_DSA_65`, `ML_DSA_87` |
| Établissement de clés au niveau de l'application | Clés KMS `ML_KEM_512`, `ML_KEM_768`, `ML_KEM_1024` avec `Encapsulate` et `Decapsulate` (secret partagé de 32 octets, non disponible dans les Régions de Chine) |

La signature ML-DSA dans KMS accepte des messages jusqu'à 4 Ko avec le type de message `RAW` ; pour des messages plus grands, calculez localement la représentation μ de 64 octets et signez-la avec `EXTERNAL_MU`. Les clés post-quantiques ne peuvent pas utiliser de matériel de clé importé.

```bash
aws kms create-key --key-spec ML_DSA_65 --key-usage SIGN_VERIFY --description "Firmware signing, post-quantum"
aws kms sign --key-id alias/firmware-signing-pq --message fileb://firmware-digest.bin --message-type RAW --signing-algorithm ML_DSA_SHAKE_256
```

Un plan de migration suit l'ordre des risques :

1. **Inventorier** les usages de la cryptographie à clé publique : points de terminaison TLS, VPN, SSH, certificats, clés de signature, et les clients qui s'y connectent.
2. **Protéger d'abord l'échange de clés** : politiques TLS `PQ` sur les équilibreurs de charge, TLS hybride dans les clients SDK qui appellent KMS, ACM et Secrets Manager.
3. **Vérifier** : les événements CloudTrail de KMS enregistrent `tlsDetails.keyExchange` (par exemple `X25519MLKEM768`) ; un filtre de métriques sur les événements sans `MLKEM` repère les clients restés sur l'échange de clés classique.
4. **Planifier les signatures** : nouvelles clés de signature ML-DSA et hiérarchie d'autorités post-quantique pour les artefacts qui doivent rester approuvés pendant des années, en gardant des signatures classiques pour les clients qui ne savent pas encore vérifier ML-DSA.
5. **Rester agile sur la cryptographie** : alias et configuration, pas d'algorithmes codés en dur, pour qu'une spécification de clé puisse changer sans redéployer le code.

> **Piège d'examen.** Faire tourner les clés symétriques KMS ou passer à CloudHSM ne traite pas la menace quantique sur les données en transit. « Protéger le trafic d'API d'aujourd'hui contre un déchiffrement futur » correspond à l'échange de clés hybride ML-KEM dans TLS.

<!-- section: key-points -->
## Points clés

- Clés gérées par le client : rotation automatique tous les 90 à 2 560 jours, rotation à la demande jusqu'à 25 fois ; la rotation ne rechiffre jamais les données.
- L'usage entre comptes exige la politique de clé et une politique IAM ; restreignez-le avec `kms:ViaService`, `kms:CallerAccount` et le contexte de chiffrement.
- Les clés multi-Régions partagent matériel et ID entre Régions ; la rotation se gère sur la clé principale.
- Fixez explicitement les politiques TLS des écouteurs dans l'IaC ; les politiques `PQ` ajoutent l'échange de clés hybride ML-KEM.
- ACM renouvelle les certificats utilisés et validés par DNS ; les certificats importés et ceux émis par `IssueCertificate` ne sont pas renouvelés par ACM.
- Partagez une seule hiérarchie Private CA avec AWS RAM ; le mode de courte durée plafonne la validité à 7 jours.
- CloudHSM pour des HSM à locataire unique contrôlés par le client (`hsm2m.medium`, FIPS 140-3) ; le magasin standard KMS utilise déjà des HSM FIPS 140-3 niveau 3.
- Post-quantique : ML-KEM d'abord pour l'échange de clés, ML-DSA pour les signatures de longue durée ; les données au repos en AES-256 sont déjà résistantes au quantique.
