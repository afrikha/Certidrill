Les questions sur les données en transit combinent trois exigences : chaque connexion client doit utiliser TLS (et parfois une version précise, FIPS ou un échange de clés post-quantique), le trafic vers les services AWS et les applications internes doit rester sur des chemins privés, et le trafic entre les nœuds d'un cluster doit lui aussi être chiffré. Les réponses sont surtout des paramètres de configuration et des conditions de politiques ; les pièges sont des valeurs par défaut qui diffèrent entre la console et l'API, et des paramètres impossibles à modifier après la création.

<!-- section: require-encryption | objectives: 5.1.1 -->
## Exiger le chiffrement des connexions aux ressources

| Ressource | Comment exiger TLS |
| --- | --- |
| Application Load Balancer | Écouteur HTTPS avec une politique de sécurité TLS ; écouteur HTTP qui ne fait que rediriger vers HTTPS |
| Network Load Balancer | Écouteur TLS (termine TLS avec une politique de sécurité), ou écouteur TCP sur 443 pour transmettre le trafic chiffré aux cibles |
| CloudFront | Politique de protocole de l'utilisateur `redirect-to-https` ou `https-only`, une politique de sécurité côté utilisateur (par exemple `TLSv1.2_2021`, `TLSv1.2_2025`, `TLSv1.3_2025`), politique de protocole d'origine `https-only` |
| API REST API Gateway | Politique de sécurité sur le nom de domaine personnalisé ou l'API (`TLS_1_2`, ou une politique améliorée `SecurityPolicy_*` avec un mode d'accès au point de terminaison) ; désactiver le point de terminaison `execute-api` par défaut pour que les clients passent par le domaine personnalisé |
| API HTTP et WebSocket API Gateway | `TLS_1_2` uniquement |
| Amazon S3, SQS, SNS | Politique de ressource qui refuse les requêtes où `aws:SecureTransport` vaut `false` ; pour S3, `s3:TlsVersion` pour une version minimale |
| RDS for PostgreSQL | `rds.force_ssl` = 1 dans un groupe de paramètres personnalisé (1 par défaut à partir de PostgreSQL 15), `ssl_min_protocol_version` |
| RDS for MySQL | `require_secure_transport` = ON |
| OpenSearch Service | Exiger HTTPS sur le point de terminaison du domaine, avec une politique de sécurité TLS |
| Amazon MSK | Chiffrement client-courtier `TLS` (par défaut), pas `TLS_PLAINTEXT` ni `PLAINTEXT` |

Les **politiques de sécurité Elastic Load Balancing** choisissent les protocoles et les chiffrements entre les clients et l'équilibreur de charge :

- La valeur par défaut de la console pour les nouveaux écouteurs HTTPS est `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` (TLS 1.2 et 1.3, chiffrements restreints, échange de clés hybride post-quantique). La valeur par défaut par l'API, la CLI, CloudFormation et le CDK reste `ELBSecurityPolicy-2016-08`, qui accepte TLS 1.0 et 1.1.
- TLS 1.3 uniquement : `ELBSecurityPolicy-TLS13-1-3-2021-06`, ou `ELBSecurityPolicy-TLS13-1-3-PQ-2025-09` avec échange de clés post-quantique.
- Points de terminaison FIPS 140 : politiques dont le nom contient `FIPS` (par exemple `ELBSecurityPolicy-TLS13-1-2-FIPS-PQ-2025-09`).

```bash
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:eu-west-3:111122223333:listener/app/portal/0123456789abcdef/fedcba9876543210 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09
```

Le **TLS mutuel** (mTLS) authentifie les clients par certificat : sur un ALB, le mode *vérification* (verify) contrôle les certificats clients par rapport à un magasin d'approbations (trust store : groupe de certificats d'autorité dans S3, listes de révocation facultatives) et le mode *transmission* (passthrough) transmet la chaîne de certificats aux cibles dans des en-têtes HTTP ; les domaines personnalisés API Gateway prennent aussi en charge le mTLS avec un magasin d'approbations dans S3.

**De bout en bout** : un ALB termine TLS et rechiffre vers des cibles HTTPS, ce qui lui permet d'inspecter et d'appliquer AWS WAF ; quand aucun intermédiaire ne doit déchiffrer le trafic, utilisez un écouteur TCP de NLB et terminez TLS sur les cibles.

Une politique de compartiment qui refuse les requêtes en clair et les anciennes versions de TLS :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-claims", "arn:aws:s3:::example-claims/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyTlsBelow12",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-claims", "arn:aws:s3:::example-claims/*"],
      "Condition": { "NumericLessThan": { "s3:TlsVersion": "1.2" } }
    }
  ]
}
```

Contrôles de détection : règles AWS Config comme `s3-bucket-ssl-requests-only` et `alb-http-to-https-redirection-check`, et enregistrements CloudTrail sans `tlsDetails` pour repérer les tentatives en HTTP.

> **Piège d'examen.** Un écouteur HTTPS créé avec la CLI ou CloudFormation sans `SslPolicy` explicite reçoit `ELBSecurityPolicy-2016-08` et négocie toujours TLS 1.0. Quand l'exigence est « TLS 1.2 ou version ultérieure », définissez la politique explicitement dans le modèle.

> **Piège d'examen.** `rds.force_ssl` ne peut pas être modifié dans un groupe de paramètres par défaut : créez un groupe de paramètres personnalisé, définissez la valeur et associez-le (redémarrage si l'instance est en cours d'exécution).

<!-- section: private-access | objectives: 5.1.2 -->
## Accès sécurisé et privé aux ressources

| Mécanisme | Fournit | Points clés |
| --- | --- | --- |
| Point de terminaison de VPC de passerelle | Accès privé à S3 et DynamoDB depuis un VPC | Entrées de table de routage avec une liste de préfixes, pas de groupe de sécurité, sans frais, inutilisable depuis un site sur site ou un VPC appairé |
| Point de terminaison de VPC d'interface (PrivateLink) | Adresses IP privées dans vos sous-réseaux pour un service AWS, un service partenaire ou votre propre service de point de terminaison | Groupes de sécurité, DNS privé (nécessite les noms d'hôte DNS et la résolution DNS sur le VPC), accessible par Direct Connect, VPN ou appairage |
| Service de point de terminaison | Exposer votre application derrière un Network Load Balancer ou un Gateway Load Balancer à d'autres VPC et comptes | Principaux autorisés, acceptation des demandes de connexion, sens unique (les consommateurs initient), CIDR qui se chevauchent acceptés |
| Point de terminaison de ressource | Accès privé à une seule ressource (base de données, adresse IP, nom de domaine) dans un autre VPC ou sur site, sans équilibreur de charge | Configuration de ressource attachée à une passerelle de ressources, partagée avec AWS RAM ; TCP uniquement |
| AWS Client VPN | Utilisateurs distants vers les réseaux VPC et sur site | Point de terminaison géré basé sur OpenVPN, règles d'autorisation par CIDR de destination |
| AWS Verified Access | Utilisateurs distants vers des applications précises, sans VPN | Politiques Cedar par requête sur l'identité et l'appareil (voir le chapitre 33) |
| Systems Manager Session Manager | Shell ou redirection de port vers les instances | Aucun port entrant, autorisation IAM, TLS 1.2, sessions journalisées |

Les **politiques de point de terminaison** accordent par défaut un accès complet. Restreignez-les aux principaux et ressources de l'organisation (`aws:PrincipalOrgID`, `aws:ResourceOrgID`) et associez-les à des politiques de ressources qui exigent le point de terminaison (`aws:SourceVpce`) ou le VPC (`aws:SourceVpc`).

**Client VPN** :

- Authentification : Active Directory, authentification mutuelle (par certificat) ou authentification fédérée SAML ; l'authentification mutuelle peut être combinée avec AD ou SAML, et les deux doivent alors réussir. Un certificat de serveur dans ACM est toujours nécessaire. La MFA vient de l'annuaire ou de l'IdP SAML.
- Les **règles d'autorisation** accordent l'accès à un CIDR de destination pour tous les utilisateurs ou pour un groupe (SID du groupe AD ou attribut de groupe SAML). L'accès est refusé par défaut, les règles ne peuvent qu'accorder, la correspondance du préfixe le plus long l'emporte et `0.0.0.0/0` est évalué en dernier.
- Groupes de sécurité sur les associations de réseau cible, tunnel partagé (split tunnel) pour n'envoyer que les routes du VPC dans le tunnel, journaux de connexion dans CloudWatch Logs, et un gestionnaire de connexion client (client connect handler, Lambda) pour des contrôles supplémentaires à la connexion.

> **Piège d'examen.** `aws:SourceIp` ne correspond jamais aux requêtes qui arrivent par un point de terminaison de VPC, car elles portent des adresses privées. Une politique de compartiment qui n'autorise que la plage publique de l'entreprise ne fonctionne plus après le passage du trafic par un point de terminaison ; utilisez `aws:SourceVpce` ou `aws:VpcSourceIp`.

> **Conseil d'examen.** Les points de terminaison de passerelle ne sont pas accessibles depuis un site sur site. « Des serveurs sur site doivent atteindre S3 de façon privée par Direct Connect » exige un point de terminaison d'interface S3.

<!-- section: inter-node-encryption | objectives: 5.1.3 -->
## Chiffrement entre ressources et nœuds de cluster

**Chiffrement Nitro.** Certains types d'instances basés sur Nitro (par exemple C6i, M6i, R6i, C7g, M7i et les générations plus récentes) chiffrent automatiquement le trafic entre instances en AEAD 256 bits, sans impact sur les performances, quand **toutes** ces conditions sont réunies : les deux instances sont d'un type pris en charge, elles sont dans la même Région, dans le même VPC ou des VPC appairés, et le trafic ne passe par aucun appareil ou service réseau virtuel comme un équilibreur de charge ou une passerelle de transit. Indépendamment, AWS chiffre au niveau de la couche physique le trafic entre zones de disponibilité et entre Régions, et le trafic d'appairage entre Régions est chiffré en bloc.

```bash
aws ec2 describe-instance-types \
  --filters Name=network-info.encryption-in-transit-supported,Values=true \
  --query "InstanceTypes[].InstanceType" --output text
```

| Service | Chiffrement entre nœuds |
| --- | --- |
| Amazon EMR | Configuration de sécurité avec chiffrement en transit : TLS pour les points de terminaison open source qui le prennent en charge ; certificats gérés par EMR, fichier zip PEM dans S3, ou classe de fournisseur de certificats personnalisée ; certains points de terminaison utilisent SASL et nécessitent Kerberos ; le trafic EMRFS vers S3 utilise toujours TLS |
| Amazon EKS | Types d'instances Nitro pris en charge pour le trafic entre nœuds ; mTLS entre pods avec un maillage de services (par exemple Istio ou Linkerd) et des certificats d'AWS Private CA via cert-manager ; TLS sur l'ALB ou le NLB avec des certificats ACM à l'entrée |
| SageMaker AI | `EnableInterContainerTrafficEncryption` sur les tâches d'entraînement et de réglage des hyperparamètres, avec des règles de groupe de sécurité autoréférencées pour UDP 500 et ESP (protocole 50) ; peut allonger les tâches d'apprentissage profond distribuées, sans effet sur les tâches à une seule instance |
| OpenSearch Service | Chiffrement de nœud à nœud (TLS 1.2), obligatoire pour le contrôle d'accès précis (fine-grained access control) ; activable sur des domaines existants, jamais désactivable |
| Amazon MSK | Chiffrement entre courtiers activé par défaut, choisi à la création du cluster |

Configuration de sécurité EMR avec des certificats PEM :

```json
{
  "EncryptionConfiguration": {
    "EnableInTransitEncryption": true,
    "EnableAtRestEncryption": false,
    "InTransitEncryptionConfiguration": {
      "TLSCertificateConfiguration": {
        "CertificateProviderType": "PEM",
        "S3Object": "s3://example-emr-config/certs/cluster-certs.zip"
      }
    }
  }
}
```

Pour EKS, AWS Private CA en mode certificats de courte durée convient à l'émission fréquente de certificats mTLS, avec une validité alignée sur la durée de vie des pods. Les politiques réseau Kubernetes et les groupes de sécurité pour les pods contrôlent quels pods communiquent entre eux, mais ils ne chiffrent pas.

> **Piège d'examen.** Le chiffrement Nitro s'arrête au premier équilibreur de charge ou à la première passerelle de transit. Quand le trafic entre instances prises en charge traverse une passerelle de transit, ou quand les types d'instances sont plus anciens, un TLS applicatif ou un maillage de services reste nécessaire.

> **Conseil d'examen.** « Chiffrer les données échangées entre les instances d'entraînement d'une tâche SageMaker AI distribuée » correspond à `EnableInterContainerTrafficEncryption`, pas à une clé KMS sur le volume d'entraînement ou le compartiment de sortie.

<!-- section: key-points -->
## Points clés

- ELB : valeur par défaut de la console `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`, valeur par défaut de l'API et de l'IaC `ELBSecurityPolicy-2016-08` ; des politiques TLS 1.3, FIPS et post-quantiques existent ; mTLS de l'ALB en mode vérification ou transmission.
- Politiques de protocole de l'utilisateur et d'origine de CloudFront ; politiques de sécurité améliorées d'API Gateway pour les API REST, `TLS_1_2` uniquement pour les API HTTP et WebSocket.
- Politiques de ressources avec `aws:SecureTransport` et `s3:TlsVersion` ; `rds.force_ssl` dans un groupe de paramètres personnalisé.
- Accès privé : points de terminaison de passerelle (S3, DynamoDB, VPC uniquement), points de terminaison d'interface et services de point de terminaison (PrivateLink), points de terminaison de ressource, politiques de point de terminaison, `aws:SourceVpce`.
- Client VPN : authentification AD, par certificat ou SAML, règles d'autorisation avec refus par défaut et correspondance du préfixe le plus long ; Verified Access par application.
- Entre nœuds : chiffrement Nitro dans le même VPC ou des VPC appairés sans appareil intermédiaire ; configurations de sécurité EMR ; maillage de services EKS avec Private CA ; chiffrement entre conteneurs de SageMaker AI ; chiffrement de nœud à nœud d'OpenSearch.
