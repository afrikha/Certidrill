Sécuriser Unity Catalog, c'est accorder les bons privilèges aux bons principaux, restreindre les tables, les colonnes et les lignes, garder les informations d'identification hors du code, et permettre à Azure Databricks d'atteindre le stockage et les services sans mot de passe. Les questions d'examen donnent un principal, un chemin `catalog.schema.table` et une contrainte de privilège minimum, puis demandent l'instruction `GRANT`, le filtre ou le masque à appliquer, ou l'identité à configurer.

<!-- section: privileges | objectives: 2.1.1 -->
## Accorder des privilèges aux principaux

Un **principal** est un utilisateur (adresse e-mail), un groupe ou un principal de service (son **ID d'application**). Les noms qui contiennent des caractères spéciaux comme `@` ou `-` s'écrivent entre accents graves. Accordez aux groupes chaque fois que possible : l'appartenance pilote alors l'accès.

Les privilèges sont **hérités** vers le bas : un privilège accordé sur un catalogue s'applique à tous ses schémas et objets actuels et futurs. Lire une table exige toujours trois privilèges :

```text
GRANT USE CATALOG ON CATALOG prod_sales TO `sales-analysts`;
GRANT USE SCHEMA ON SCHEMA prod_sales.gold TO `sales-analysts`;
GRANT SELECT ON TABLE prod_sales.gold.orders TO `sales-analysts`;

-- Every current and future table of the schema
GRANT SELECT ON SCHEMA prod_sales.gold TO `sales-analysts`;

-- Service principal, identified by its application ID
GRANT MODIFY ON TABLE prod_sales.silver.orders TO `0b6f3c1d-8e2a-4f7b-9c5d-3a1e6b8f2c47`;

REVOKE SELECT ON TABLE prod_sales.gold.orders FROM `sales-analysts`;
SHOW GRANTS ON SCHEMA prod_sales.gold;
SHOW GRANTS `sales-analysts` ON CATALOG prod_sales;
ALTER SCHEMA prod_sales.gold OWNER TO `sales-data-owners`;
```

| Privilège | Permet | Accordé sur |
| --- | --- | --- |
| `USE CATALOG`, `USE SCHEMA` | Interagir avec les objets contenus ; aucun accès aux données à lui seul | Catalogue, schéma |
| `SELECT` | Interroger une table, une vue ou une vue matérialisée | Table, vue, ou un conteneur |
| `MODIFY` | Insérer, mettre à jour, supprimer (exige aussi `SELECT`) | Table, ou un conteneur |
| `CREATE SCHEMA` / `CREATE TABLE` / `CREATE VOLUME` / `CREATE FUNCTION` / `CREATE MATERIALIZED VIEW` | Créer des objets enfants (`CREATE TABLE` crée aussi des vues) | Catalogue ou schéma |
| `READ VOLUME` / `WRITE VOLUME` | Lire / ajouter, modifier, supprimer des fichiers d'un volume | Volume, ou un conteneur |
| `EXECUTE` | Appeler une fonction ou charger un modèle | Fonction, ou un conteneur |
| `REFRESH` | Actualiser une vue matérialisée | Vue matérialisée |
| `BROWSE` | Voir les métadonnées et demander l'accès sans accès aux données | Catalogue |
| `APPLY TAG` | Ajouter et modifier des balises | Tout objet |
| `MANAGE` | Accorder et révoquer, transférer la propriété, renommer, supprimer | Tout objet ; hérité par les enfants |
| `ALL PRIVILEGES` | Tous les privilèges sur l'objet et ses enfants, sauf `MANAGE` et `EXTERNAL USE SCHEMA` | Tout objet |
| `READ FILES` / `WRITE FILES` / `CREATE EXTERNAL TABLE` / `CREATE MANAGED STORAGE` | Accès au niveau du chemin et création de tables ou de stockage | Emplacement externe |

Peuvent accorder sur un objet : son **propriétaire**, le propriétaire de son catalogue ou de son schéma, un utilisateur qui a **`MANAGE`** sur lui, ou un **administrateur du metastore**. Chaque objet a un seul propriétaire, qui détient tous les privilèges sur lui ; attribuez la propriété en production à des groupes. `MANAGE` ne donne pas à lui seul accès aux données : un utilisateur qui a `MANAGE` peut s'accorder `SELECT`. `REVOKE` réussit même si le privilège n'a jamais été accordé. Les administrateurs de l'espace de travail sont propriétaires du catalogue de l'espace de travail ; tous les utilisateurs de l'espace de travail y reçoivent `USE CATALOG`.

> **Piège d'examen.** Révoquer `SELECT` sur une table ne supprime pas l'accès hérité d'un `SELECT` accordé sur le schéma ou le catalogue. Révoquez au niveau où il a été accordé.

> **Piège d'examen.** `ALL PRIVILEGES` n'inclut pas `MANAGE` : un principal qui a `ALL PRIVILEGES` peut lire et écrire, mais ne peut pas accorder de privilèges à d'autres.

<!-- section: table-column-row-security | objectives: 2.1.2 -->
## La sécurité au niveau des tables, des colonnes et des lignes

| Exigence | Mécanisme |
| --- | --- |
| Autoriser ou refuser une table entière | `GRANT` / `REVOKE SELECT` sur la table |
| Masquer certaines colonnes à tout le monde | Une vue qui ne sélectionne que les colonnes autorisées ; accordez `SELECT` sur la vue, pas sur la table |
| Montrer la valeur d'une colonne à certains groupes seulement | Masque de colonne (une UDF SQL attachée à la colonne) |
| Montrer à chaque groupe seulement certaines lignes | Filtre de lignes (une UDF SQL qui renvoie `BOOLEAN`) |
| Un sous-ensemble préparé ou transformé pour un consommateur | Vue dynamique utilisant `is_account_group_member()` |
| La même règle sur de nombreuses tables, pilotée par des balises | Stratégie ABAC (chapitre « Gouverner les objets Unity Catalog ») |

```text
-- Row filter: admins see everything, others only their region's rows
CREATE FUNCTION prod_sales.sec.region_filter(region STRING)
RETURN is_account_group_member('sales-admins') OR is_account_group_member(region || '-sales');

ALTER TABLE prod_sales.gold.orders SET ROW FILTER prod_sales.sec.region_filter ON (region);
ALTER TABLE prod_sales.gold.orders DROP ROW FILTER;

-- Column mask: only HR sees the full email
CREATE FUNCTION prod_sales.sec.email_mask(email STRING)
RETURN CASE WHEN is_account_group_member('hr') THEN email ELSE '***@***' END;

ALTER TABLE prod_sales.gold.customers ALTER COLUMN email SET MASK prod_sales.sec.email_mask;
ALTER TABLE prod_sales.gold.customers ALTER COLUMN email DROP MASK;

-- Mask that depends on another column
CREATE TABLE prod_hr.core.persons (
  name STRING,
  address STRING MASK prod_hr.sec.mask_pii_regional USING COLUMNS (region),
  region STRING
);
```

Les règles à connaître :

- Une fonction de filtre de lignes renvoie `BOOLEAN` ; les lignes pour lesquelles elle renvoie `FALSE` ou `NULL` sont exclues. Une fonction de masque reçoit la valeur de la colonne comme premier paramètre et doit renvoyer un type convertible dans le type de la colonne ; les autres entrées viennent de `USING COLUMNS`. Chaque colonne a au plus un masque.
- Les appliquer exige `EXECUTE` sur la fonction, `USE SCHEMA` et `USE CATALOG`, et d'être propriétaire de la table ou d'avoir `MANAGE` (plus `SELECT` pour les masques).
- `is_account_group_member()` vérifie l'appartenance de l'utilisateur qui exécute la requête à un groupe de niveau compte.
- Les filtres et masques ne s'appliquent pas à une vue, empêchent le voyage dans le temps et les clones sur la table, et ne peuvent pas référencer des tables qui ont elles-mêmes des filtres ou des masques. Préférez des expressions `CASE` simples aux tables de correspondance pour les performances.
- Calcul : DBR 12.2 LTS ou version ultérieure (les runtimes plus anciens ne renvoient aucune donnée) ; le mode d'accès Dedicated exige DBR 15.4 LTS ou version ultérieure avec le serverless activé pour l'espace de travail, car le filtrage s'exécute sur du calcul serverless.
- Databricks recommande les **stratégies ABAC** quand le même filtre ou le même masque doit s'appliquer de façon cohérente à de nombreuses tables ; les propriétaires de tables ne peuvent pas les contourner.

> **Piège d'examen.** Les masques de colonne changent les valeurs renvoyées, pas la liste des colonnes ; pour retirer complètement une colonne de la vue des utilisateurs, exposez une vue qui ne la contient pas. Un filtre de lignes s'attache avec `ALTER TABLE ... SET ROW FILTER`, jamais avec `GRANT`.

<!-- section: key-vault-secrets | objectives: 2.1.3 -->
## Accéder aux secrets Azure Key Vault

Les secrets sont regroupés dans des **étendues de secrets**. Une étendue **adossée à Azure Key Vault** est une interface en lecture seule vers un coffre de clés : vous gérez les secrets dans Azure. Une étendue adossée à Databricks est stockée dans une base de données chiffrée gérée par Azure Databricks.

Créer une étendue adossée à Key Vault :

1. Le coffre de clés doit utiliser le modèle d'autorisation **Vault access policy** (stratégie d'accès du coffre) : Azure RBAC n'est pas pris en charge pour les étendues adossées à Key Vault.
2. Vous avez besoin du rôle Key Vault Contributor, Contributor ou Owner sur le coffre de clés.
3. Ouvrez `https://<databricks-instance>#secrets/createScope` (sensible à la casse), saisissez le nom de l'étendue, le **Manage Principal** (Creator, qui exige le plan Premium, ou All workspace users), le **DNS Name** et le **Resource ID** du coffre. Azure Databricks reçoit les autorisations de secret **Get** et **List** par une stratégie d'accès.
4. Vérifiez avec `databricks secrets list-scopes`.

```bash
databricks secrets list-scopes
databricks secrets put-acl kv-finance data-engineers READ
```

```text
# Python in a notebook or job
jdbc_password = dbutils.secrets.get(scope="kv-finance", key="erp-sql-password")

# Compute Spark config (Advanced > Spark)
spark.password {{secrets/kv-finance/erp-sql-password}}

-- SQL, for example in a connection
password secret('kv-finance', 'erp-sql-password')
```

| ACL de secret | Lire et lister | Écrire | Modifier les autorisations |
| --- | --- | --- | --- |
| READ | Oui | Non | Non |
| WRITE | Oui | Oui | Non |
| MANAGE | Oui | Oui | Oui |

Les ACL s'appliquent à **toute une étendue** : les utilisateurs qui ont accès à une étendue adossée à Key Vault peuvent lire tous les secrets de ce coffre. Pour séparer des secrets, utilisez des coffres de clés et des étendues distincts. Les valeurs lues avec `dbutils.secrets.get()` ou référencées dans la configuration Spark s'affichent `[REDACTED]` dans les sorties ; la rédaction est faite au mieux, donc n'accordez les étendues qu'à ceux qui en ont besoin. Les étendues adossées à Key Vault sont en lecture seule depuis Azure Databricks : créez et mettez à jour leurs secrets dans Azure.

> **Piège d'examen.** « Le coffre de clés utilise Azure RBAC et la création de l'étendue échoue » se corrige en passant le coffre au modèle de stratégie d'accès, pas en attribuant Key Vault Secrets User.

<!-- section: service-principals | objectives: 2.1.4 -->
## Authentifier l'accès aux données avec des principaux de service

Un principal de service est une identité réservée aux API, pour l'automatisation : jobs, CI/CD, scripts. Il reçoit des privilèges Unity Catalog, des appartenances à des groupes et des rôles d'espace de travail comme un utilisateur.

| Type | Géré dans | S'authentifie avec | Recommandé pour |
| --- | --- | --- | --- |
| Géré par Azure Databricks | Le compte Azure Databricks | OAuth Databricks, jetons d'accès personnels | L'automatisation Databricks |
| Géré par Microsoft Entra ID | Microsoft Entra ID (une inscription d'application) | OAuth Databricks, jetons Microsoft Entra ID | Accéder à Azure Databricks et à d'autres ressources Azure avec la même identité |

- Rôle **Service principal user** : permet à un utilisateur d'exécuter des jobs en tant que principal de service, pour que les jobs de production ne cassent pas quand le propriétaire part. Le rôle **Service principal manager** gère les rôles du principal et n'inclut pas le rôle utilisateur.
- **OAuth machine à machine (M2M)** : générez un secret OAuth pour le principal de service (durée de vie jusqu'à 730 jours, cinq secrets au maximum, affiché une seule fois). Les jetons d'accès durent une heure et sont renouvelés automatiquement par l'authentification unifiée.
- Écritures en production : Databricks recommande d'exécuter les jobs en tant que principaux de service et de leur réserver `MODIFY` sur les tables de production.

```bash
export DATABRICKS_HOST=https://adb-1234567890123456.7.azuredatabricks.net
export DATABRICKS_CLIENT_ID=<service-principal-application-id>
export DATABRICKS_CLIENT_SECRET=<oauth-secret>
databricks bundle deploy -t prod
```

Pour le stockage, des **informations d'identification de stockage** Unity Catalog peuvent contenir un principal de service Microsoft Entra ID ou une identité managée ; l'identité managée est préférable. L'alternative héritée définit des propriétés OAuth par compte de stockage, avec le secret client lu dans une étendue de secrets ; le principal de service a besoin de **Storage Blob Data Contributor** sur le compte :

```text
service_credential = dbutils.secrets.get(scope="kv-finance", key="sp-client-secret")
spark.conf.set("fs.azure.account.auth.type.stcontosoraw.dfs.core.windows.net", "OAuth")
spark.conf.set("fs.azure.account.oauth.provider.type.stcontosoraw.dfs.core.windows.net", "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider")
spark.conf.set("fs.azure.account.oauth2.client.id.stcontosoraw.dfs.core.windows.net", "<application-id>")
spark.conf.set("fs.azure.account.oauth2.client.secret.stcontosoraw.dfs.core.windows.net", service_credential)
spark.conf.set("fs.azure.account.oauth2.client.endpoint.stcontosoraw.dfs.core.windows.net", "https://login.microsoftonline.com/<directory-id>/oauth2/token")
```

Ce modèle hérité n'est pas gouverné par Unity Catalog, et le client du metastore Hive ignore les paramètres définis au niveau de la session. Databricks recommande plutôt les emplacements externes et les volumes ; les montages et le passthrough des informations d'identification sont dépréciés.

> **Piège d'examen.** Le jeton d'accès personnel d'un utilisateur dans un job de production est la mauvaise réponse : utilisez un principal de service avec OAuth M2M, et exécutez le job en tant que ce principal de service.

<!-- section: managed-identities | objectives: 2.1.5 -->
## Authentifier l'accès aux ressources avec des identités managées

L'**Access Connector for Azure Databricks** est une ressource Azure qui relie des identités managées au compte Azure Databricks. Il est déployé par défaut avec une identité affectée par le système et peut aussi contenir une ou plusieurs identités affectées par l'utilisateur. Unity Catalog l'utilise pour atteindre ADLS Gen2.

1. Créez le connecteur d'accès (Contributor ou Owner sur le groupe de ressources), dans la même région que le compte de stockage. Notez son ID de ressource : `/subscriptions/<id>/resourceGroups/<rg>/providers/Microsoft.Databricks/accessConnectors/<name>`.
2. Sur le compte de stockage (Owner ou User Access Administrator), attribuez **Storage Blob Data Contributor** à l'identité du connecteur, sur le compte ou, avec **Storage Blob Delegator** sur le compte, sur un seul conteneur.
3. Créez des **informations d'identification de stockage** qui référencent le connecteur (et l'identité affectée par l'utilisateur, le cas échéant).
4. Créez un **emplacement externe** pour le chemin, puis accordez des privilèges dessus.

```bash
databricks storage-credentials create --json '{
  "name": "cred_finance",
  "azure_managed_identity": {
    "access_connector_id": "/subscriptions/<id>/resourceGroups/rg-data/providers/Microsoft.Databricks/accessConnectors/ac-finance"
  }
}'
```

```text
CREATE EXTERNAL LOCATION finance_raw
  URL 'abfss://finance@stcontosoraw.dfs.core.windows.net/raw'
  WITH (STORAGE CREDENTIAL cred_finance)
  COMMENT 'Raw finance files';

GRANT READ FILES ON EXTERNAL LOCATION finance_raw TO `data-engineers`;
GRANT CREATE EXTERNAL TABLE ON EXTERNAL LOCATION finance_raw TO `data-engineers`;
```

Créer un emplacement externe exige d'être administrateur du metastore ou d'avoir `CREATE EXTERNAL LOCATION` sur le metastore, plus `CREATE EXTERNAL LOCATION` sur les informations d'identification de stockage.

| Exigence | Réponse |
| --- | --- |
| Aucun secret à stocker ni à faire tourner | Identité managée |
| Compte de stockage protégé par un pare-feu ou des règles réseau | Identité managée (un principal de service ne peut pas l'atteindre par Unity Catalog) |
| Événements de fichiers pour Auto Loader | Ajoutez Storage Queue Data Contributor, plus Storage Account Contributor et EventGrid EventSubscription Contributor pour une configuration automatique |
| La même identité doit aussi appeler les API Azure Databricks depuis l'extérieur | Principal de service géré par Microsoft Entra ID |

> **Conseil d'examen.** L'identité managée est la réponse par défaut pour l'accès de Unity Catalog au stockage sur Azure. On choisit un principal de service quand l'énoncé exige une identité extérieure à Azure Databricks, comme un pipeline CI/CD.

<!-- section: key-points -->
## Points clés

- Lire une table exige `USE CATALOG` + `USE SCHEMA` + `SELECT` ; les privilèges sont hérités vers le bas ; accordez aux groupes ; les principaux de service par ID d'application.
- Les propriétaires, les propriétaires des conteneurs, les détenteurs de `MANAGE` et les administrateurs du metastore peuvent accorder ; `ALL PRIVILEGES` exclut `MANAGE`.
- Colonnes : vues ou masques ; lignes : filtres de lignes ou vues dynamiques ; nombreuses tables : ABAC.
- Les étendues adossées à Key Vault exigent le modèle de stratégie d'accès du coffre, sont en lecture seule et valent pour toute l'étendue ; lisez avec `dbutils.secrets.get()` ou `{{secrets/scope/key}}`.
- L'automatisation s'exécute en tant que principal de service avec OAuth M2M ; `MODIFY` en production revient aux principaux de service.
- Accès au stockage : identité managée du connecteur d'accès, informations d'identification de stockage, emplacement externe, privilèges.
