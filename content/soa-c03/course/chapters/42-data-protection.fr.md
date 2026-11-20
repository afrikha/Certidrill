Pour un opérateur, protéger les données signifie savoir quelles données sont sensibles, les chiffrer au repos et en transit, garder les informations d'identification hors du code et des fichiers de configuration, et agir sur les résultats (findings) produits par les services de sécurité. Les questions décrivent en général une panne (une erreur d'accès refusé KMS, un certificat qui expire, un mot de passe codé en dur, un résultat de gravité élevée) et demandent la correction la moins coûteuse en charge opérationnelle. Ce chapitre couvre la classification des données, le chiffrement au repos avec AWS KMS et son dépannage, le chiffrement en transit avec ACM, le stockage des secrets, ainsi que les rapports et les résultats de Security Hub, GuardDuty, Config, Inspector, Macie et AWS Security Agent.

<!-- section: data-classification | objectives: 4.2.1 -->
## Mettre en œuvre un schéma de classification des données

Un schéma de classification définit quelques niveaux (par exemple public, interne, confidentiel, restreint), les contrôles exigés par chaque niveau (clé de chiffrement, accès, conservation, journalisation) et la façon dont chaque ressource reçoit son niveau. Sur AWS, le niveau est le plus souvent une **balise** (`classification=confidential`) que les politiques, les règles et les rapports savent lire.

| Étape | Mécanisme AWS |
| --- | --- |
| Découvrir les données sensibles dans S3 | Amazon Macie : la découverte automatisée des données sensibles échantillonne en continu chaque compartiment ; les tâches de découverte analysent les compartiments choisis une fois ou selon une planification |
| Détecter vos propres types de données (matricules, numéros de contrat) | Identifiants de données personnalisés de Macie (regex, mots-clés, proximité) ; listes d'autorisation pour ignorer des valeurs connues |
| Normaliser clés et valeurs de balises entre comptes | Politiques de balises (tag policies) d'Organizations |
| Refuser les ressources sans balise | SCP avec une condition `Null` sur `aws:RequestTag/classification` pour les actions qui acceptent des balises à la création |
| Signaler les ressources sans la balise | Règle AWS Config `required-tags` |
| Accorder l'accès selon le niveau | Conditions ABAC sur `aws:ResourceTag/classification` et `aws:PrincipalTag` |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireClassificationTagOnVolumes",
      "Effect": "Deny",
      "Action": "ec2:CreateVolume",
      "Resource": "arn:aws:ec2:*:*:volume/*",
      "Condition": {
        "Null": { "aws:RequestTag/classification": "true" }
      }
    }
  ]
}
```

Macie crée des **résultats de données sensibles** (un objet contient par exemple des numéros de carte ou des informations d'identification) et des **résultats de politique** (un compartiment est devenu public, a perdu son chiffrement par défaut ou est partagé hors du compte). Les résultats partent vers EventBridge et, en option, vers Security Hub CSPM : une règle peut alors baliser le compartiment, prévenir le propriétaire des données ou lancer un runbook.

> **Piège d'examen.** Macie n'analyse qu'Amazon S3. « Trouver des données personnelles dans notre lac de données S3 » correspond à Macie ; « trouver les instances RDS non chiffrées » est une règle AWS Config, pas Macie.

<!-- section: encryption-at-rest | objectives: 4.2.2 -->
## Configurer le chiffrement au repos

Les services AWS chiffrent au repos avec des clés **AWS KMS**. Le choix qui compte en exploitation est celui de qui contrôle la clé : une **clé gérée par AWS** (`aws/ebs`, `aws/rds`, `aws/s3`) a une politique de clé figée et ne peut pas être partagée avec un autre compte ; une **clé gérée par le client** a une politique de clé que vous écrivez, une rotation automatique facultative (90 à 2 560 jours), peut être désactivée et peut être partagée.

| Service | Comment l'activer | Données existantes non chiffrées |
| --- | --- | --- |
| Amazon EBS | Chiffrement par défaut, paramètre de compte par Région, avec la clé par défaut de votre choix | Instantané, copie chiffrée de l'instantané, nouveau volume à partir de la copie |
| Amazon RDS, Aurora | Choisir le chiffrement et la clé à la création | Instantané, copie chiffrée de l'instantané, restauration vers une nouvelle instance |
| Amazon S3 | Chiffrement par défaut SSE-S3 de chaque nouvel objet ; définir SSE-KMS comme valeur par défaut du compartiment pour contrôler la clé, avec les S3 Bucket Keys pour réduire les requêtes KMS | Copier les objets sur eux-mêmes avec le nouveau chiffrement (S3 Batch Operations pour de nombreux objets) |
| Amazon EFS | Chiffrement au repos choisi à la création du système de fichiers | Nouveau système de fichiers chiffré, copie des données (DataSync) |
| DynamoDB | Toujours chiffré ; passage à tout moment entre clés détenues par AWS, gérées par AWS et gérées par le client | Inutile |

```bash
aws ec2 enable-ebs-encryption-by-default --region eu-west-1
aws ec2 modify-ebs-default-kms-key-id \
  --kms-key-id alias/ebs-workloads --region eu-west-1
```

La suppression d'une clé est irréversible : `ScheduleKeyDeletion` impose un délai d'attente de 7 à 30 jours (30 par défaut), pendant lequel la clé est **en attente de suppression** (Pending deletion), inutilisable, et la suppression peut être annulée. En cas de doute, **désactivez** plutôt la clé : la réactiver rétablit l'accès.

**Dépannage** du chiffrement au repos :

| Symptôme | Cause et correction |
| --- | --- |
| `AccessDenied` sur `kms:Decrypt` alors que la politique IAM l'autorise | La politique de clé n'autorise pas le principal ou ne délègue pas à IAM ; ajouter le principal ou l'instruction du compte |
| Un autre compte ne peut pas copier un instantané chiffré partagé | Instantané chiffré avec une clé gérée par AWS ; rechiffrer avec une clé gérée par le client et partager la clé |
| Une instance aux volumes chiffrés ne démarre pas | La clé KMS est désactivée ou en attente de suppression (`KMSInvalidStateException`), ou l'appelant n'a pas `kms:CreateGrant` ; réactiver la clé ou corriger la politique de clé |
| Accès refusé uniquement via un service | Une condition `kms:ViaService` limite la clé à d'autres services |
| `ThrottlingException` de KMS sous forte charge S3 | Activer les S3 Bucket Keys, ou demander un quota de requêtes KMS plus élevé |
| Les objets chargés sans en-têtes de chiffrement ne sont pas en SSE-KMS | Définir SSE-KMS comme chiffrement par défaut ; refuser `s3:PutObject` avec une autre valeur de `s3:x-amz-server-side-encryption` si nécessaire |

> **Piège d'examen.** CloudTrail enregistre chaque utilisation d'une clé KMS (`Decrypt`, `GenerateDataKey`) avec l'appelant ; c'est là qu'on audite qui a déchiffré des données. Une clé détenue par AWS ne laisse aucune trace de ce type dans votre compte.

<!-- section: encryption-in-transit | objectives: 4.2.3 -->
## Configurer le chiffrement en transit avec ACM

**AWS Certificate Manager (ACM)** émet des certificats publics, valides 198 jours, après validation du domaine ; la validation DNS est recommandée car elle renouvelle automatiquement. ACM déploie les certificats vers les services intégrés (Elastic Load Balancing, CloudFront, API Gateway) ; un certificat pour CloudFront doit se trouver dans USA Est (Virginie du Nord), celui d'un équilibreur de charge dans la Région de l'équilibreur. ACM ne renouvelle jamais les certificats importés. **AWS Private CA** émet des certificats privés pour les points de terminaison internes.

| Exigence | Configuration |
| --- | --- |
| HTTPS pour les utilisateurs d'une application web | Écouteur HTTPS sur l'ALB avec un certificat ACM et une politique de sécurité TLS actuelle ; écouteur HTTP qui redirige vers HTTPS |
| Chiffrement jusqu'aux instances | Groupe cible HTTPS sur l'ALB, ou écouteur TLS sur un NLB ; un écouteur TCP laisse passer le TLS jusqu'aux cibles |
| CloudFront toujours chiffré | Politique de protocole de l'utilisateur « Redirect HTTP to HTTPS » ou « HTTPS only », politique de protocole d'origine HTTPS |
| Les clients doivent utiliser TLS avec un compartiment S3 | Politique de compartiment qui refuse les requêtes où `aws:SecureTransport` vaut false |
| Imposer TLS vers la base de données | `rds.force_ssl` (PostgreSQL), `require_secure_transport` (MySQL) dans le groupe de paramètres |

Dépannage des certificats :

| Symptôme | Correction |
| --- | --- |
| Le certificat reste en « Pending validation » | Créer dans la zone DNS du domaine l'enregistrement CNAME fourni par ACM |
| Le certificat n'apparaît pas lors de la configuration de CloudFront | Le demander ou l'importer dans us-east-1 |
| Certificat validé par DNS non renouvelé | Le CNAME de validation a été supprimé, ou le certificat n'est utilisé par aucun service intégré ; rétablir l'enregistrement |
| Erreur de navigateur après l'expiration d'un certificat importé | Réimporter un certificat renouvelé ; surveiller les certificats importés avant expiration |

Surveillance : la métrique `DaysToExpiry` (`AWS/CertificateManager`, dimension `CertificateArn`) permet une alarme CloudWatch ; EventBridge reçoit chaque jour **ACM Certificate Approaching Expiration**, par défaut à partir de 30 jours avant l'expiration pour les certificats publics et de 45 jours pour les certificats privés et importés (réglable avec `PutAccountConfiguration`), et **ACM Certificate Renewal Action Required** quand le renouvellement automatique échoue.

> **Piège d'examen.** Un certificat importé qui expire est un problème de surveillance et de réimportation, pas un réglage de renouvellement. « Ne plus gérer les renouvellements » signifie demander un certificat ACM validé par DNS au lieu d'en importer un.

<!-- section: secrets | objectives: 4.2.4 -->
## Stocker les secrets de manière sécurisée

| | AWS Secrets Manager | Systems Manager Parameter Store |
| --- | --- | --- |
| Contenu | Informations d'identification de base de données, clés d'API, tout secret jusqu'à 64 Ko | Valeurs de configuration ; paramètres `SecureString` chiffrés avec KMS |
| Rotation | Intégrée : rotation gérée, ou fonction de rotation Lambda | Aucune rotation intégrée |
| Multirégion | Réplicas d'un secret dans d'autres Régions | Non |
| Intercomptes | Politique de ressource plus clé KMS gérée par le client | Les paramètres avancés peuvent être partagés |
| Coût | Par secret et par mois, et par appel d'API | Niveau standard gratuit ; niveau avancé payant |

Niveaux de Parameter Store : **standard** (10 000 paramètres par compte et par Région, valeurs de 4 Ko, pas de politiques) et **avancé** (100 000 paramètres, valeurs de 8 Ko, politiques de paramètre comme l'expiration, partage). Un paramètre standard peut passer au niveau avancé ; un paramètre avancé ne peut pas revenir au niveau standard.

**Rotation** dans Secrets Manager : de nombreux secrets gérés (par exemple un mot de passe principal RDS avec `--manage-master-user-password`) utilisent la **rotation gérée** sans Lambda ; les autres secrets utilisent une fonction de rotation. Les planifications peuvent aller jusqu'à toutes les quatre heures (`rate(4 hours)`), dans une fenêtre de rotation d'au moins une heure, en UTC. Deux stratégies : **utilisateur unique** (single user : le mot de passe d'un utilisateur change ; la plus simple, adaptée à la plupart des cas) et **utilisateurs alternés** (alternating users : deux utilisateurs, la fonction clone le premier à l'aide d'un secret de superutilisateur ; un jeu d'informations d'identification reste toujours valide, pour la haute disponibilité). Les versions portent les étiquettes intermédiaires `AWSCURRENT` (ce que reçoivent les applications), `AWSPENDING` (pendant la rotation) et `AWSPREVIOUS`.

Récupérez les secrets à l'exécution au lieu de les copier : références dynamiques CloudFormation (`{{resolve:secretsmanager:...}}`, `{{resolve:ssm-secure:...}}`), section `secrets` d'une définition de tâche ECS, extension Lambda Parameters and Secrets. Un secret supprimé reste récupérable pendant une fenêtre de récupération de 7 à 30 jours (30 par défaut).

```bash
aws secretsmanager rotate-secret \
  --secret-id prod/orders/db \
  --rotation-rules '{"ScheduleExpression": "rate(30 days)"}'
```

> **Piège d'examen.** « Faire tourner automatiquement le mot de passe de la base de données tous les 30 jours avec le moins d'effort » correspond à la rotation de Secrets Manager. Un paramètre `SecureString` est chiffré, mais personne ne le fait tourner à votre place.

<!-- section: security-findings | objectives: 4.2.5 -->
## Produire des rapports et corriger les résultats de sécurité

| Service | Ce qu'il détecte | Correction typique |
| --- | --- | --- |
| Amazon GuardDuty | Menaces issues des événements de gestion CloudTrail, des journaux de flux VPC et des journaux DNS, plus les plans de protection (S3, EKS, Runtime Monitoring, Malware Protection pour EC2 et S3, RDS, Lambda) ; Extended Threat Detection corrèle les séquences d'attaque en plusieurs étapes | Isoler l'instance (groupe de sécurité restrictif), révoquer les informations d'identification, prendre un instantané pour l'analyse forensique |
| Amazon Inspector | Vulnérabilités logicielles et exposition réseau des instances EC2, des images ECR et des fonctions Lambda, avec un score Inspector ajusté à votre environnement | Corriger avec Patch Manager, reconstruire l'image, mettre à jour la dépendance |
| AWS Config | Configurations non conformes | Correction automatique par un runbook Automation |
| Amazon Macie | Données sensibles et problèmes de politique des compartiments S3 | Restreindre l'accès, chiffrer, déplacer les données |
| IAM Access Analyzer | Accès externes et inutilisés | Retirer l'autorisation ou la permission inutilisée |
| AWS Security Agent | Risques trouvés par les revues de conception, les revues de code (commentaires sur les pull requests) et les tests d'intrusion à la demande avec résultats validés ; ses tests d'intrusion font désormais partie d'AWS Continuum | Corriger le code ou la configuration, puis retester |

**Deux produits Security Hub** agrègent ces résultats. **AWS Security Hub CSPM** applique des normes de sécurité (AWS Foundational Security Best Practices, CIS, PCI DSS, NIST) sous forme de contrôles, a besoin de l'enregistrement AWS Config pour la plupart des contrôles, utilise le format ASFF, fonctionne par Région avec agrégation entre Régions, et offre des règles d'automatisation (mettre à jour ou supprimer des résultats) et des actions personnalisées. **AWS Security Hub** corrèle les signaux de Security Hub CSPM, GuardDuty, Inspector, Macie et Access Analyzer au format OCSF, produit des **résultats d'exposition** (exposure findings) avec chemins d'attaque, et crée des tickets dans Jira Cloud ou ServiceNow.

Chacun de ces services publie ses résultats dans **EventBridge**, qui est le chemin habituel de la réponse automatisée :

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [{ "numeric": [">=", 7] }]
  }
}
```

Acheminez les résultats de gravité élevée vers SNS pour l'équipe d'astreinte et vers un runbook qui isole la ressource. Réduisez le bruit à la source : **règles de suppression** et listes d'adresses IP approuvées de GuardDuty, règles de suppression d'Inspector, règles d'automatisation de Security Hub CSPM ou désactivation des contrôles qui ne s'appliquent pas.

> **Piège d'examen.** GuardDuty, Inspector et Security Hub CSPM détectent et signalent ; aucun ne corrige la ressource de lui-même. La correction est une règle EventBridge (ou une correction Config) qui lance Lambda ou un runbook Systems Manager Automation.

<!-- section: key-points -->
## Points clés

- Classification : baliser le niveau, Macie pour la découverte dans S3, politiques de balises et SCP pour imposer, `required-tags` pour signaler.
- Les clés gérées par AWS ne peuvent être ni partagées ni modifiées ; les clés gérées par le client le peuvent ; les données EBS et RDS existantes se chiffrent par une copie chiffrée d'instantané.
- Erreurs KMS : politique de clé, état de la clé, octrois (grants), `kms:ViaService`, limitation (S3 Bucket Keys) ; la suppression attend 7 à 30 jours, la désactivation est réversible.
- ACM : certificats publics valides 198 jours, la validation DNS renouvelle automatiquement, certificats CloudFront dans us-east-1, les certificats importés exigent surveillance et réimportation.
- Secrets Manager assure la rotation (gérée ou Lambda, jusqu'à toutes les 4 heures) ; Parameter Store standard 4 Ko, avancé 8 Ko avec politiques.
- Security Hub CSPM applique des normes sur les données de Config ; Security Hub corrèle les résultats en expositions ; EventBridge pilote la correction.
