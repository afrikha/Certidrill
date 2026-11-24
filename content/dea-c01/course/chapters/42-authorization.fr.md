Les questions d'autorisation partent d'une règle métier (les analystes de chaque Région ne voient que les lignes de leur Région, l'équipe finance ne doit pas lire les numéros de carte, une tâche Glue ne peut écrire que dans le préfixe organisé) et demandent quelle couche l'applique avec le moins d'effort : une politique IAM, une autorisation de base de données dans Amazon Redshift, une autorisation AWS Lake Formation, ou un modèle fondé sur les balises qui passe à l'échelle sans réécrire les politiques. Ce chapitre couvre les politiques IAM personnalisées, le stockage des informations d'identification, les autorisations de base de données, Lake Formation, l'autorisation basée sur les rôles, les balises et les attributs, et le moindre privilège.

<!-- section: custom-policies | objectives: 4.2.1 -->
## Politiques IAM personnalisées

| Type de politique | Propriétaire | Usage |
| --- | --- | --- |
| Politique gérée par AWS | AWS, mise à jour par AWS | Démarrage rapide, fonctions métier (`AWSGlueServiceRole`, `AmazonAthenaFullAccess`) ; souvent plus large que nécessaire et jamais limitée à vos ressources |
| Politique gérée par le client | Vous, versionnée, attachable à de nombreuses identités | Le choix normal quand une politique gérée accorde trop ou les mauvaises ressources |
| Politique en ligne | Intégrée à une identité, supprimée avec elle | Une autorisation strictement un-à-un qui ne doit pas être réutilisée |

Une politique gérée ne répond pas au besoin quand elle accorde `*` sur les ressources (tous les compartiments, toutes les tables), qu'il lui manque une action dont le pipeline a besoin (par exemple `kms:Decrypt` sur une clé précise) ou qu'elle ne peut pas exprimer une condition. Écrivez une politique gérée par le client :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadRaw",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-datalake/raw/orders/*"
    },
    {
      "Sid": "WriteCurated",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::example-datalake/curated/orders/*"
    },
    {
      "Sid": "ListOwnPrefixes",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::example-datalake",
      "Condition": { "StringLike": { "s3:prefix": ["raw/orders/*", "curated/orders/*"] } }
    },
    {
      "Sid": "CatalogOrders",
      "Effect": "Allow",
      "Action": ["glue:GetTable", "glue:GetPartitions", "glue:BatchCreatePartition"],
      "Resource": [
        "arn:aws:glue:eu-west-1:111122223333:catalog",
        "arn:aws:glue:eu-west-1:111122223333:database/sales",
        "arn:aws:glue:eu-west-1:111122223333:table/sales/orders"
      ]
    }
  ]
}
```

Règles d'évaluation : tout est refusé par défaut ; un `Deny` explicite dans n'importe quelle politique applicable l'emporte sur tous les `Allow` ; les SCP et les limites d'autorisations (permissions boundaries) fixent un maximum que les politiques d'identité ne peuvent pas dépasser ; une requête intercompte exige une autorisation des deux côtés (politique d'identité dans le compte de l'appelant, politique de ressource dans celui du propriétaire).

> **Piège d'examen.** `s3:ListBucket` s'applique à l'ARN du compartiment, `s3:GetObject` et `s3:PutObject` aux ARN des objets (`bucket/*`). Une politique qui place `ListBucket` sur `example-datalake/*` échoue silencieusement à lister.

<!-- section: credential-storage | objectives: 4.2.2 -->
## Stocker les informations d'identification des applications et des bases de données

| Critère | AWS Secrets Manager | Systems Manager Parameter Store |
| --- | --- | --- |
| Conçu pour | Informations d'identification de bases de données, clés d'API, jetons | Valeurs de configuration, plus des secrets `SecureString` chiffrés avec KMS |
| Rotation | Intégrée (gérée ou par Lambda) | Aucune |
| Intégrations aux bases de données | Mots de passe gérés de RDS, Aurora et Redshift ; connexions Glue ; Redshift Data API ; SCRAM de MSK | Référencé par son nom depuis le code et les modèles |
| Partage intercompte | Politique de ressource sur le secret, clé KMS gérée par le client | Paramètres avancés uniquement |
| Coût | Par secret et par appel d'API | Paramètres standard gratuits ; paramètres avancés payants |

Façons d'utiliser un secret sans l'exposer :

- **Redshift Data API** : `aws redshift-data execute-statement --secret-arn ...` exécute du SQL avec les informations d'identification du secret, sans pilote JDBC ni pool de connexions.
- **Connexions Glue** : référencez le secret ; le rôle de la tâche a besoin de `secretsmanager:GetSecretValue` sur celui-ci.
- **Lambda** : l'extension AWS Parameters and Secrets Lambda Extension met les valeurs en cache localement.
- **CloudFormation** : les références dynamiques (`{{resolve:secretsmanager:...}}`, `{{resolve:ssm-secure:...}}`) sont résolues au déploiement.
- **Amazon MWAA** : Secrets Manager peut servir de backend de secrets pour les connexions et variables Airflow.

```bash
aws redshift-data execute-statement \
  --cluster-identifier analytics --database sales \
  --secret-arn arn:aws:secretsmanager:eu-west-1:111122223333:secret:prod/warehouse/etl_user-AbCdEf \
  --sql "SELECT count(*) FROM orders WHERE order_date = current_date"
```

> **Conseil d'examen.** Quand un secret est chiffré avec une clé gérée par le client, le lecteur a besoin de `kms:Decrypt` sur cette clé en plus de `secretsmanager:GetSecretValue`. Une autorisation KMS manquante est la cause habituelle d'un `AccessDenied` sur un secret que la politique semble autoriser.

<!-- section: database-access | objectives: 4.2.3 -->
## Utilisateurs, groupes et rôles de base de données dans Amazon Redshift

| Objet | Comportement |
| --- | --- |
| Utilisateur | Identité de base de données ; mot de passe local, ou informations d'identification temporaires issues d'IAM |
| Groupe | Ensemble d'utilisateurs qui reçoivent les mêmes autorisations sur les objets ; les autorisations système ne vont qu'aux rôles |
| Rôle (RBAC) | Ensemble d'autorisations sur les objets et d'autorisations système ; attribué à des utilisateurs ou à d'autres rôles ; le modèle recommandé |
| Rôles système | `sys:monitor` (catalogue et tables système), `sys:operator` (plus `ANALYZE`, `VACUUM`, annulation de requêtes), `sys:dba` (création et suppression de schémas, tables, vues, procédures), `sys:secadmin` (utilisateurs, rôles, politiques RLS et de masquage, aucun accès aux données par défaut), `sys:superuser` |

```sql
CREATE ROLE sales_analyst;
GRANT USAGE ON SCHEMA sales TO ROLE sales_analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA sales TO ROLE sales_analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO ROLE sales_analyst;
GRANT SELECT (order_id, order_date, amount) ON sales.customers_orders TO ROLE sales_analyst;
GRANT ROLE sales_analyst TO alice;

CREATE RLS POLICY region_filter
WITH (region VARCHAR(10))
USING (region IN (SELECT region FROM sales.analyst_regions WHERE user_name = current_user));
GRANT SELECT ON TABLE sales.analyst_regions TO RLS POLICY region_filter;
ATTACH RLS POLICY region_filter ON sales.orders TO ROLE sales_analyst;
ALTER TABLE sales.orders ROW LEVEL SECURITY ON;
```

- `USAGE` sur le schéma est nécessaire en plus des autorisations sur les tables ; `ALTER DEFAULT PRIVILEGES` couvre les tables créées plus tard.
- Les autorisations **au niveau des colonnes** limitent `SELECT` ou `UPDATE` aux colonnes listées.
- **Sécurité au niveau des lignes** (RLS) : le prédicat `USING` d'une politique est ajouté à chaque requête des utilisateurs ou rôles rattachés, une fois `ROW LEVEL SECURITY ON` défini sur la table. Les superutilisateurs et `sys:secadmin` gèrent les politiques.

Une politique qui lit une table de correspondance (ici l'association analyste-Région) a besoin que `SELECT` sur cette table soit accordé à la politique elle-même.

L'**accès basé sur IAM** évite les mots de passe de base de données : `GetClusterCredentials` renvoie un mot de passe temporaire pour un utilisateur de base nommé (avec `DbGroups` et `AutoCreate`), `GetClusterCredentialsWithIAM` associe un à un l'identité IAM à un utilisateur de base (15 à 60 minutes), et Redshift Serverless utilise `GetCredentials`. Les pilotes JDBC et ODBC les appellent pour vous ; les politiques IAM limitent les clusters, bases et utilisateurs qu'un principal peut obtenir.

Pour Amazon RDS et Aurora, l'authentification de base de données IAM délivre des jetons de 15 minutes au lieu de mots de passe (`GRANT rds_iam TO etl_user;` sur PostgreSQL).

> **Piège d'examen.** Accorder à un rôle ou à un groupe l'accès à un schéma ne donne pas accès à ses tables, et accorder les tables ne donne pas `USAGE` sur le schéma : les deux sont nécessaires. Les tables créées après l'autorisation exigent `ALTER DEFAULT PRIVILEGES`.

<!-- section: lake-formation | objectives: 4.2.4 -->
## Gérer les autorisations avec AWS Lake Formation

Lake Formation ajoute des autorisations de type base de données sur les ressources du Data Catalog et les données S3 qu'elles décrivent. Les moteurs intégrés (Athena, Redshift Spectrum, Amazon EMR, Glue ETL) demandent à Lake Formation des informations d'identification temporaires limitées à ce que le principal peut lire : la **distribution d'informations d'identification** (credential vending).

**État par défaut** : par compatibilité avec Glue, le groupe `IAMAllowedPrincipals` détient `Super` sur les ressources existantes et « Use only IAM access control » est activé pour les nouvelles, si bien que seules les politiques IAM s'appliquent. Pour imposer Lake Formation, désactivez ces valeurs par défaut pour les nouvelles ressources, révoquez `IAMAllowedPrincipals` sur les ressources existantes après avoir accordé les autorisations aux principaux, ou utilisez le **mode d'accès hybride** pour inscrire les principaux progressivement pendant que les autres gardent l'accès IAM.

**Enregistrer un emplacement** : enregistrez le chemin S3 (il inclut tous les sous-dossiers) avec le rôle lié à un service, ou avec un rôle défini par l'utilisateur quand l'emplacement se trouve dans un autre compte, est chiffré avec la clé gérée par AWS `aws/s3` ou est lu par Amazon EMR. L'administrateur qui enregistre a besoin de `iam:PassRole` sur un rôle défini par l'utilisateur.

| Autorisation | Sur | Permet |
| --- | --- | --- |
| `CREATE_DATABASE`, `CREATE_TABLE` | Catalogue, base de données | Créer des métadonnées |
| `DATA_LOCATION_ACCESS` | Emplacement S3 enregistré | Créer des tables qui y pointent (pas lire les données) |
| `SELECT` | Table, vue | Interroger les données ; peut être limité à des colonnes incluses ou exclues, ou à un filtre de données |
| `INSERT`, `DELETE` | Table | Écrire ou supprimer les données S3 via la table |
| `DESCRIBE`, `ALTER`, `DROP` | Base de données, table | Afficher, modifier ou supprimer les métadonnées |
| `Super` (`ALL`) | Base de données, table | Toutes les opérations |
| Option d'octroi (grant option) | Toutes | Accorder à son tour à d'autres (pas avec un filtrage de colonnes) |

Les **filtres de données** donnent un accès précis avec `SELECT` : au niveau des colonnes (colonnes incluses ou exclues), des lignes (une expression de style `WHERE` PartiQL) ou des cellules (les deux). Les filtres ne s'appliquent qu'aux lectures.

```bash
aws lakeformation create-data-cells-filter --table-data '{
  "TableCatalogId": "111122223333", "DatabaseName": "sales", "TableName": "orders",
  "Name": "emea_no_email",
  "RowFilter": {"FilterExpression": "region = '\''EMEA'\''"},
  "ColumnWildcard": {"ExcludedColumnNames": ["customer_email"]}
}'

aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=arn:aws:iam::111122223333:role/EmeaAnalysts \
  --permissions SELECT \
  --resource '{"DataCellsFilter": {"TableCatalogId": "111122223333",
    "DatabaseName": "sales", "TableName": "orders", "Name": "emea_no_email"}}'
```

| Moteur | Application de Lake Formation |
| --- | --- |
| Athena | Native, filtres de données compris |
| Redshift Spectrum | Schéma externe sur la base du Data Catalog ; les autorisations Lake Formation sont accordées au rôle IAM du schéma |
| Amazon EMR | Intégration Lake Formation avec des rôles d'exécution ; l'emplacement doit être enregistré avec un rôle défini par l'utilisateur |
| Glue ETL | Les tâches lisent avec les autorisations Lake Formation du rôle de la tâche |

Le partage intercompte accorde des autorisations à un autre compte (ou à une organisation) via AWS RAM ; l'administrateur du lac de données consommateur les accorde à nouveau localement et crée des liens de ressource (resource links).

> **Piège d'examen.** Accorder `SELECT` dans Lake Formation ne change rien tant que `IAMAllowedPrincipals` détient encore `Super` sur la table : tout principal qui a un accès IAM garde un accès complet. Révoquez cette valeur par défaut sur les ressources protégées.

<!-- section: authorization-models | objectives: 4.2.5 -->
## Autorisation basée sur les rôles, les balises et les attributs

| Modèle | Fonctionnement sur AWS | Adapté à |
| --- | --- | --- |
| Basé sur les rôles (RBAC) | Autorisations attachées aux rôles IAM, aux rôles Redshift ou aux autorisations nommées de Lake Formation ; les utilisateurs reçoivent des rôles | Peu de fonctions métier stables |
| Basé sur les balises (LF-TBAC) | Des LF-Tags (clé avec des valeurs autorisées) attribués aux bases, tables et colonnes ; autorisations sur des expressions de balises | Nombreuses tables et nombreux principaux ; nouvelles tables gouvernées dès qu'elles sont balisées |
| Basé sur les attributs (ABAC) | Les politiques IAM comparent les balises du principal avec celles de la ressource ou de la requête | Nombreuses équipes et nombreux projets ; les autorisations suivent les balises sans modifier les politiques |

Les **LF-Tags** sont hérités (de la base vers les tables, des tables vers les colonnes) et peuvent être remplacés. Donner à chaque principal l'accès à chaque ressource demande principaux × ressources autorisations nommées, mais principaux + ressources opérations avec une seule balise. Les balises IAM et les LF-Tags sont des objets différents.

```text
# LF-TBAC pseudo-code: tag the resources, then grant on a tag expression
ASSIGN TAGS domain=finance         TO DATABASE finance_db
ASSIGN TAGS sensitivity=public     TO TABLE finance_db.payments
ASSIGN TAGS sensitivity=restricted TO COLUMN finance_db.payments.card_number
GRANT (SELECT ON TABLES) ON TAGS domain=finance AND sensitivity=public TO FinanceAnalysts
# card_number overrides the inherited value, so FinanceAnalysts cannot read it
```

L'**ABAC** avec IAM : une balise de session issue du fournisseur d'identité (ou une balise sur le rôle) est comparée à la balise de la ressource, ici des tâches Glue balisées par projet :

```json
{
  "Effect": "Allow",
  "Action": ["glue:StartJobRun", "glue:GetJobRun", "glue:GetJobRuns"],
  "Resource": "arn:aws:glue:eu-west-1:111122223333:job/*",
  "Condition": {
    "StringEquals": { "aws:ResourceTag/project": "${aws:PrincipalTag/project}" }
  }
}
```

> **Conseil d'examen.** « Des centaines de tables, de nouvelles chaque semaine, un accès par domaine de données et par sensibilité, un minimum d'administration » désigne LF-TBAC. « Les ingénieurs accèdent aux ressources du projet auquel ils appartiennent, sans modifier les politiques quand des projets sont ajoutés » désigne l'ABAC avec `aws:PrincipalTag` et `aws:ResourceTag`.

<!-- section: least-privilege | objectives: 4.2.6 -->
## Élaborer des politiques de moindre privilège

1. **Partir de ce qui est utilisé.** La **génération de politiques** d'IAM Access Analyzer lit CloudTrail (un journal de suivi est requis) pour un utilisateur ou un rôle sur 90 jours au plus et rédige une politique ; elle ne liste ni les actions des événements de données S3 ni `iam:PassRole`, que vous ajoutez à la main.
2. **Nommer les actions**, pas `service:*` ; **nommer les ressources** jusqu'à l'ARN du préfixe, de la table ou de la clé.
3. **Ajouter des conditions** : `aws:SourceVpce`, `aws:RequestedRegion`, `aws:PrincipalOrgID`, `kms:ViaService` (clé utilisée uniquement via S3 ou Glue), `s3:prefix`, `iam:PassedToService`.
4. **Plafonner avec des garde-fous** : limites d'autorisations pour les rôles créés par les développeurs, SCP pour les comptes.
5. **Réviser** : validation des politiques d'Access Analyzer (erreurs, avertissements, suggestions), résultats sur les accès inutilisés, informations de dernier accès pour retirer des autorisations.

```json
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
  "Resource": "arn:aws:kms:eu-west-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
  "Condition": {
    "StringEquals": { "kms:ViaService": "s3.eu-west-1.amazonaws.com" }
  }
}
```

> **Piège d'examen.** Le moindre privilège ne consiste pas à « attacher la politique gérée par AWS en lecture seule » : `AmazonS3ReadOnlyAccess` lit tous les compartiments du compte. Limitez les actions et les ressources aux préfixes du pipeline.

<!-- section: key-points -->
## Points clés

- Des politiques gérées par le client quand celles gérées par AWS sont trop larges ; le refus explicite l'emporte ; les SCP et les limites plafonnent les autorisations ; `ListBucket` sur l'ARN du compartiment, les actions sur les objets sur `bucket/*`.
- Secrets Manager pour les informations d'identification de base de données avec rotation (connexions Glue, `--secret-arn` de la Redshift Data API), Parameter Store pour la configuration ; `kms:Decrypt` sur la clé gérée par le client aussi.
- Redshift : rôles (RBAC) et rôles système, `USAGE` sur le schéma plus les autorisations sur les tables, `ALTER DEFAULT PRIVILEGES`, autorisations sur les colonnes, politiques RLS ; informations d'identification temporaires IAM au lieu de mots de passe.
- Lake Formation : révoquer `IAMAllowedPrincipals` ou utiliser le mode hybride, enregistrer les emplacements (rôle défini par l'utilisateur pour EMR, `aws/s3` ou l'intercompte), accorder `SELECT` avec des listes de colonnes ou des filtres de données (lignes, cellules), partager via AWS RAM.
- RBAC pour des fonctions métier stables, LF-TBAC pour de nombreuses ressources du catalogue, ABAC avec les balises du principal et de la ressource pour de nombreux projets.
- Moindre privilège : génération de politiques d'Access Analyzer (90 jours, journal de suivi requis), actions et ressources nommées, conditions, limites, revue des accès inutilisés.
