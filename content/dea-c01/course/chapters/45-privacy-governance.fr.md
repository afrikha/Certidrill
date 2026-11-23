Les questions de gouvernance combinent une demande de partage (« donner au compte finance un accès en direct aux tables de ventes »), une contrainte de confidentialité (« aucune PII hors de la zone restreinte », « les données ne doivent jamais quitter l'UE ») et un besoin d'audit (« montrer ce qui a changé dans cette politique de compartiment »). Ce chapitre couvre les autorisations de partage, la découverte des PII, les restrictions de Régions, AWS Config, la souveraineté, les projets SageMaker Catalog et les cadres de gouvernance.

<!-- section: data-sharing-permissions | objectives: 4.5.1 -->
## Accorder des autorisations pour le partage de données

Le **partage de données Amazon Redshift** (data sharing) donne aux consommateurs un accès en direct et en lecture seule aux données du producteur, sans les copier ni les décharger : une écriture validée chez le producteur est visible dès la transaction suivante du consommateur. Il fonctionne entre clusters provisionnés à nœuds RA3 (ou RG) et groupes de travail Redshift Serverless, dans un même compte, entre comptes et entre Régions. Le producteur paie le stockage ; le consommateur paie le calcul de ses requêtes et tout transfert entre Régions. Le producteur peut aussi accorder INSERT, UPDATE ou CREATE pour des écritures du consommateur.

Étapes d'un partage entre comptes :

```text
-- Producer (account 111122223333)
CREATE DATASHARE sales_share;
ALTER DATASHARE sales_share ADD SCHEMA sales;
ALTER DATASHARE sales_share ADD ALL TABLES IN SCHEMA sales;
ALTER DATASHARE sales_share SET INCLUDENEW = TRUE FOR SCHEMA sales;
GRANT USAGE ON DATASHARE sales_share TO ACCOUNT '444455556666';

-- Consumer (account 444455556666), after authorization and association
CREATE DATABASE sales_db
  FROM DATASHARE sales_share OF ACCOUNT '111122223333' NAMESPACE 'a1b2c3d4-5678-90ab-cdef-EXAMPLE22222';
GRANT USAGE ON DATABASE sales_db TO ROLE finance_analyst;
SELECT region, SUM(amount) FROM sales_db.sales.orders GROUP BY region;
```

```bash
# Producer administrator authorizes the consumer account
aws redshift authorize-data-share \
  --data-share-arn arn:aws:redshift:eu-west-1:111122223333:datashare:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222/sales_share \
  --consumer-identifier 444455556666
# Consumer administrator associates the datashare
aws redshift associate-data-share-consumer \
  --data-share-arn arn:aws:redshift:eu-west-1:111122223333:datashare:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222/sales_share \
  --associate-entire-account
```

Règles utilisées à l'examen :

- Dans un même compte, `GRANT USAGE ... TO NAMESPACE '<guid>'` ; entre comptes, `TO ACCOUNT` plus l'**autorisation** par le producteur et l'**association** par le consommateur. Entre comptes, les deux côtés doivent être chiffrés.
- `SET INCLUDENEW` (false par défaut) ajoute les tables créées plus tard dans le schéma.
- `CREATE DATABASE ... WITH PERMISSIONS` oblige le consommateur à accorder des autorisations au niveau des objets ; sans cette clause, USAGE sur la base ouvre tous les objets partagés.
- Un consommateur ne peut pas repartager les objets reçus.
- `TO ACCOUNT ... VIA DATA CATALOG` crée un **datashare géré par Lake Formation** : c'est alors Lake Formation, et non le SQL Redshift, qui décide quels principaux du consommateur voient quelles tables, colonnes et lignes. Des datashares peuvent aussi être concédés sous licence via **AWS Data Exchange**.

**Lake Formation** partage des bases et des tables du Data Catalog avec d'autres comptes, organisations, unités d'organisation ou principaux IAM, par **ressources nommées** ou, à grande échelle, avec des **LF-tags** (LF-TBAC). Il s'appuie sur AWS RAM : au sein de l'organisation, le partage est immédiat ; en dehors, l'administrateur du lac de données du destinataire accepte l'invitation. Le destinataire accorde l'accès à ses propres principaux et crée un **lien de ressource** (resource link) pour Athena ou Redshift Spectrum.

> **Piège d'examen.** « Donner à une autre équipe un accès en direct à des tables Redshift sans copier les données et sans charger le cluster producteur » désigne un datashare : c'est le calcul du consommateur qui exécute les requêtes. UNLOAD puis COPY crée une copie qui devient obsolète.

<!-- section: pii-identification | objectives: 4.5.2 -->
## Identifier les PII avec Amazon Macie et Lake Formation

**Amazon Macie** découvre les données sensibles dans les compartiments S3 à usage général :

| Fonctionnalité | Comportement |
| --- | --- |
| Découverte automatisée des données sensibles | Évalue chaque jour l'inventaire des compartiments et inspecte des objets échantillonnés ; attribue un score de sensibilité à chaque compartiment |
| Tâche de découverte des données sensibles | Analyse ciblée de compartiments ou de critères choisis, ponctuelle ou planifiée, en profondeur |
| Identificateurs de données gérés | Détection intégrée des PII, des données financières et des informations d'identification (noms, adresses, numéros de passeport, numéros de carte bancaire, clés secrètes AWS) |
| Identificateurs de données personnalisés | Une expression régulière plus des mots-clés et une règle de proximité facultatifs (ID d'employés, numéros de compte client) |
| Listes d'autorisation (allow lists) | Textes ou modèles à ignorer (données de test, noms publics de l'entreprise) |

Macie produit des **résultats de données sensibles** (catégorie `CLASSIFICATION`, avec l'emplacement des occurrences, comme des cellules ou des enregistrements) et des **résultats de politique** (catégorie `POLICY`, posture de sécurité des compartiments). Il les publie automatiquement dans **EventBridge** et, en option, dans Security Hub CSPM. Macie doit avoir accès à la clé KMS des objets chiffrés. Les données de RDS, Aurora ou DynamoDB sont analysées après exportation vers S3.

**Macie avec Lake Formation** : Macie indique où se trouvent les PII ; Lake Formation impose qui peut les lire.

1. Macie analyse la zone organisée (curated).
2. Une règle EventBridge sélectionne les résultats et démarre une fonction Lambda ou un flux de travail Step Functions.
3. Le flux de travail associe l'objet S3 à sa table Glue et applique aux colonnes concernées un LF-tag comme `classification=pii`.
4. Autorisations LF-TBAC : les analystes reçoivent seulement `classification=public`, un rôle restreint reçoit aussi `classification=pii`. Révoquez l'autorisation par défaut `IAMAllowedPrincipals` pour que Lake Formation contrôle réellement les tables.

```json
{
  "source": ["aws.macie"],
  "detail-type": ["Macie Finding"],
  "detail": {
    "category": ["CLASSIFICATION"],
    "resourcesAffected": { "s3Bucket": { "name": ["anycompany-curated"] } }
  }
}
```

```bash
aws lakeformation add-lf-tags-to-resource \
  --resource '{"TableWithColumns": {"DatabaseName": "curated", "Name": "customers", "ColumnNames": ["email", "phone"]}}' \
  --lf-tags '[{"TagKey": "classification", "TagValues": ["pii"]}]'
```

Pour agir **dans le pipeline**, utilisez la transformation AWS Glue **Detect PII** (analyse de chaque cellule ou d'un échantillon de lignes ; masquage, masquage partiel ou remplacement par un hachage SHA-256). Pour les PII dans les journaux, une politique de protection des données CloudWatch Logs les masque à l'ingestion.

> **Conseil d'examen.** « Découvrir en continu les PII dans des centaines de compartiments avec le moins d'effort » désigne la découverte automatisée des données sensibles de Macie. « Masquer les numéros de carte dans la tâche ETL avant d'écrire la table organisée » désigne Glue Detect PII. « Interdire aux analystes les colonnes de PII détectées » désigne des LF-tags sur ces colonnes.

<!-- section: region-restrictions | objectives: 4.5.3 -->
## Empêcher les sauvegardes et les réplications vers des Régions non autorisées

Les copies quittent une Région par S3 Cross-Region Replication, les règles de copie d'AWS Backup, les réplicas et la réplication des sauvegardes RDS entre Régions, la copie d'instantanés Redshift entre Régions, les tables globales DynamoDB, les clés KMS multi-Régions ou un simple `aws s3 cp`. Les contrôles préventifs se placent dans AWS Organizations :

- Une **politique de contrôle des services** (SCP) qui refuse toute action régionale quand `aws:RequestedRegion` n'est pas une Région approuvée empêche d'y créer des compartiments, des coffres, des réplicas et des clusters. Les services globaux (IAM, Organizations, Route 53, CloudFront, STS, Support) sont exemptés par `NotAction`, et un rôle d'urgence (break-glass) peut être exclu.
- Certaines copies se configurent depuis la Région source approuvée (une règle de réplication, une action de copie d'un plan de sauvegarde) : refusez donc aussi les actions de configuration hors d'un rôle de plateforme, ou restreignez leurs cibles. Pour AWS Backup, la clé de condition `backup:CopyTargets` sur `backup:CopyFromBackupVault` limite les coffres de destination.
- **Region deny d'AWS Control Tower** : `AWS-GR_REGION_DENY` pour toute la zone d'atterrissage ou `CT.MULTISERVICE.PV.1` pour les unités d'organisation choisies, mis en œuvre sous forme de SCP ; la Région d'origine ne peut pas être refusée.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "cloudfront:*",
        "iam:*",
        "organizations:*",
        "route53:*",
        "sts:*",
        "support:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] },
        "ArnNotLike": { "aws:PrincipalArn": ["arn:aws:iam::*:role/PlatformBreakGlass"] }
      }
    },
    {
      "Sid": "DenyBackupCopiesOutsideApprovedRegions",
      "Effect": "Deny",
      "Action": "backup:CopyFromBackupVault",
      "Resource": "*",
      "Condition": {
        "ForAnyValue:ArnNotLike": {
          "backup:CopyTargets": [
            "arn:aws:backup:eu-west-1:*:backup-vault:*",
            "arn:aws:backup:eu-central-1:*:backup-vault:*"
          ]
        }
      }
    }
  ]
}
```

La liste `NotAction` est abrégée (l'exemple d'AWS exempte davantage de services globaux). Des contrôles de détection la complètent : requêtes d'agrégateur Config sur les ressources situées dans des Régions non approuvées, CloudTrail pour les tentatives.

> **Piège d'examen.** Une politique IAM ou une politique de compartiment ne peut pas empêcher un administrateur du compte d'activer une réplication ailleurs ; une SCP s'applique à tous les principaux des comptes membres, administrateurs compris (pas au compte de gestion). Une SCP n'accorde jamais d'autorisation.

<!-- section: config-changes | objectives: 4.5.4 -->
## Consulter les modifications de configuration avec AWS Config

AWS Config enregistre des **éléments de configuration** (configuration items : paramètres et relations de chaque ressource prise en charge) à chaque modification (enregistrement continu) ou une fois par jour (enregistrement périodique). Son canal de diffusion écrit des fichiers d'historique dans S3 toutes les six heures, des instantanés à la demande, et des notifications SNS (`ConfigurationItemChangeNotification`, `ComplianceChangeNotification`).

| Question | Outil |
| --- | --- |
| À quoi ressemblait cette politique de compartiment ou ce groupe de sécurité mardi dernier, et qu'est-ce qui a changé ? | Chronologie de la ressource dans Config (`get-resource-config-history`) |
| Qui a fait la modification ? | L'événement CloudTrail lié depuis l'élément de configuration |
| Chaque compartiment est-il chiffré, un cluster Redshift est-il public ? | Règles Config (gérées comme `s3-bucket-server-side-encryption-enabled`, `redshift-cluster-public-access-check`, ou personnalisées avec Lambda ou Guard), évaluées à chaque modification ou périodiquement |
| Les mêmes vérifications dans tous les comptes et toutes les Régions | Un agrégateur, des packs de conformité déployés dans l'organisation |
| Requête d'inventaire sur l'état actuel | Requête avancée (sous-ensemble de SQL `SELECT`, état actuel uniquement, aussi via un agrégateur) |
| Corriger automatiquement | Correction avec des documents Systems Manager Automation |

```bash
aws configservice get-resource-config-history \
  --resource-type AWS::S3::Bucket --resource-id anycompany-curated --limit 5
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name org-aggregator \
  --expression "SELECT accountId, awsRegion, resourceId WHERE resourceType = 'AWS::S3::Bucket' AND awsRegion = 'us-east-1'"
```

> **Piège d'examen.** CloudTrail répond à « qui a appelé quelle API et quand » ; Config répond à « quelle était la configuration de la ressource à un instant donné et est-elle conforme ». Une question sur l'état avant et après une modification, ou sur la conformité continue, attend Config.

<!-- section: data-sovereignty | objectives: 4.5.5 -->
## Maintenir la souveraineté des données

La **résidence des données** (data residency) désigne le lieu où elles sont stockées et traitées ; la **souveraineté des données** y ajoute les lois applicables et qui contrôle l'accès, les clés et les opérations. AWS s'engage à ne pas déplacer ni répliquer le contenu hors des Régions choisies par le client, sauf si nécessaire pour fournir les services que le client a lancés ou pour se conformer à la loi. La part de l'ingénieur des données :

- Choisir les Régions, puis les imposer (SCP de refus de Régions, contrôles sur les copies) et les vérifier (Config, CloudTrail, Macie pour la classification).
- Surveiller les fonctionnalités qui traitent des données dans une autre Région par conception (inférence entre Régions, points de terminaison globaux) : utiliser les options limitées à une zone géographique ou les désactiver.
- Garder le contrôle des clés : clés KMS gérées par le client créées dans la Région approuvée (clés à Région unique plutôt que multi-Régions), politiques de clé restrictives et, quand la réglementation exige des clés hors d'AWS, un **magasin de clés externe** KMS (XKS) : les clés résident dans le gestionnaire de clés du client, AWS ne peut pas déchiffrer sans lui, mais le client assume la disponibilité et la latence (clés symétriques uniquement, pas de rotation automatique, pas de clés multi-Régions). Un magasin de clés CloudHSM conserve les clés dans des HSM à locataire unique que le client gère dans AWS.
- Pour les exigences de souveraineté européenne, l'**AWS European Sovereign Cloud** (disponible depuis le 14 janvier 2026) est une partition distincte (`aws-eusc`, Région `eusc-de-east-1` dans le Brandebourg, en Allemagne) exploitée par des résidents de l'UE, avec ses propres comptes, IAM et facturation.

> **Conseil d'examen.** « Les clés de chiffrement doivent rester sous le contrôle exclusif de l'entreprise, hors d'AWS » désigne un magasin de clés externe. « Les données doivent rester dans deux Régions de l'UE, sauvegardes comprises » désigne une SCP sur `aws:RequestedRegion` plus des restrictions de copie des sauvegardes, pas le chiffrement.

<!-- section: sagemaker-catalog-projects | objectives: 4.5.6 -->
## Gérer l'accès aux données via les projets SageMaker Catalog

Dans **Amazon SageMaker Unified Studio**, un domaine (organisé en unités de domaine) contient des **projets** : le périmètre de travail d'une équipe, dont les membres sont **propriétaires** (owners : gèrent les membres, modifient et suppriment le projet) ou **contributeurs** (contributors), qu'il s'agisse d'utilisateurs ou de groupes IAM Identity Center ou de principaux IAM. Chaque projet a son propre rôle IAM ; l'accès aux données est accordé au projet, pas aux individus.

Le flux **SageMaker Catalog** :

1. Un projet producteur intègre des ressources de données (assets) dans son inventaire (visible de ses seuls membres), ajoute des noms métier, des descriptions, des termes de glossaire et des formulaires de métadonnées, puis les **publie**. Une modification ultérieure doit être publiée de nouveau pour apparaître dans le catalogue.
2. Un projet consommateur trouve la ressource et soumet une **demande d'abonnement** (subscription request) avec une justification.
3. Seuls les membres du **projet propriétaire** approuvent ou rejettent, en accordant un accès complet ou un accès filtré par des filtres de lignes et de colonnes. Les demandes sont approuvées automatiquement si l'éditeur a désactivé l'approbation, ou si le demandeur est propriétaire ou contributeur des deux projets.
4. Le **traitement** (fulfillment) est automatique pour les ressources gérées. Tables Glue : gérées par Lake Formation, le rôle du projet éditeur détient DESCRIBE et SELECT avec possibilité d'octroi ; pas de LF-TBAC, pas d'inter-Régions. Tables et vues Redshift : autorisations, vue ou datashare, pas d'inter-Régions. Ressources non gérées : événements dans EventBridge pour un traitement personnalisé.
5. Le projet propriétaire peut révoquer un abonnement à tout moment.

> **Piège d'examen.** Accorder des autorisations Lake Formation directement au rôle d'un analyste contourne le flux du catalogue. Quand l'exigence est « demander, approuver et auditer l'accès à des produits de données publiés », la réponse est un abonnement entre projets dans SageMaker Catalog.

<!-- section: governance-patterns | objectives: 4.5.7 -->
## Cadres de gouvernance et modèles de partage de données

Un cadre de gouvernance des données définit la **propriété** (une équipe de domaine par produit de données), l'**intendance** (stewardship : métadonnées, glossaire, règles de qualité), la **classification** (public, interne, confidentiel, PII), la **politique d'accès** (qui demande, qui approuve), le **lignage** et l'**audit** (CloudTrail, Config, journaux Redshift). Modèles d'organisation :

| Modèle | Organisation AWS | Adapté à |
| --- | --- | --- |
| Centralisé | Un compte de lac de données détient le stockage, le catalogue et les autorisations | Petites organisations, contrôle central strict |
| Maillage de données (data mesh : propriété décentralisée, gouvernance fédérée) | Les comptes producteurs possèdent S3, les tables Glue et Redshift ; un compte de gouvernance central détient le catalogue partagé, les LF-tags et le domaine SageMaker Catalog ; les comptes consommateurs interrogent via des liens de ressources ou des datashares | Nombreuses équipes de domaine qui publient des produits de données |
| Hub and spoke | Un compte central organise et redistribue les données vers les comptes des unités métier | Données de référence partagées, maturité hétérogène |

Modèles de partage :

| Besoin | Modèle |
| --- | --- |
| Accès en direct à des tables du lac dans un autre compte | Octroi Lake Formation entre comptes (LF-tags), lien de ressource côté consommateur |
| Accès en direct à des tables d'entrepôt, calcul du consommateur | Datashare Redshift |
| Flux de demande et d'approbation avec métadonnées métier | Abonnement SageMaker Catalog entre projets |
| Partager ou vendre des données à des organisations externes | AWS Data Exchange : octrois de données (data grants) ou produits AWS Marketplace, avec fichiers, API, datashares Redshift, accès aux données S3, ou Lake Formation (préversion) |
| Simple accès aux objets pour un autre compte | Politique de compartiment ou point d'accès S3, plus la politique de clé KMS en cas de SSE-KMS |
| L'isolation, une autre Région ou la latence imposent une copie physique | Réplication, UNLOAD ou pipeline, en acceptant le stockage en double et la dérive de la gouvernance |

> **Conseil d'examen.** Préférez le partage sur place (Lake Formation, datashares, abonnements au catalogue) aux copies : une seule copie signifie un seul jeu d'autorisations, une seule piste d'audit et aucune donnée obsolète.

<!-- section: key-points -->
## Points clés

- Datashare Redshift : RA3/RG ou Serverless, en direct, le consommateur paie le calcul ; `GRANT USAGE ON DATASHARE`, autorisation et association entre comptes, `CREATE DATABASE ... FROM DATASHARE`, pas de repartage.
- Partage Lake Formation : ressources nommées ou LF-tags, AWS RAM, liens de ressources pour Athena et Spectrum.
- Macie : découverte automatisée (quotidienne, échantillonnée) ou tâches ; identificateurs gérés et personnalisés, listes d'autorisation ; résultats vers EventBridge ; des LF-tags sur les colonnes de PII imposent l'accès ; Glue Detect PII masque dans le pipeline.
- Contrôle des Régions : SCP sur `aws:RequestedRegion` avec exemptions globales, restrictions sur la configuration des copies (`backup:CopyTargets`), Region deny de Control Tower.
- Config : éléments de configuration et chronologie, règles, agrégateurs, requête avancée, correction SSM ; CloudTrail dit qui.
- Souveraineté : Régions choisies, clés dans la Région, XKS pour des clés hors d'AWS, partition AWS European Sovereign Cloud.
- SageMaker Catalog : publier, s'abonner, le projet propriétaire approuve (accès complet ou filtré), traitement automatique par Lake Formation ou des autorisations Redshift.
