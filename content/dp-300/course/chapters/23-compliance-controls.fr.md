Les fonctionnalités de conformité répondent à quatre questions sur les données sensibles : où sont-elles (classification des données), qui y a touché (audit, suivi des modifications, capture des changements de données), qui peut les voir (masquage dynamique des données, sécurité au niveau des lignes) et peut-on prouver qu'elles n'ont pas été modifiées (registre). L'examen donne une exigence et attend la fonctionnalité qui la satisfait, souvent face à des distracteurs proches.

| Exigence | Fonctionnalité |
| --- | --- |
| Étiqueter les colonnes qui contiennent des données personnelles et en faire un rapport | Découverte et classification des données |
| Enregistrer qui a exécuté quelles requêtes et connexions, pour un auditeur | Audit |
| Une application doit savoir quelles lignes ont changé depuis sa dernière synchronisation | Suivi des modifications |
| Conserver chaque valeur modifiée (avant et après) pour l'ETL | Capture des changements de données (CDC) |
| Les agents du support ne voient que les quatre derniers chiffres d'un numéro de carte | Masquage dynamique des données |
| Chaque commercial ne lit que les lignes de sa région | Sécurité au niveau des lignes |
| Prouver à un auditeur que personne, même un DBA, n'a modifié des lignes historiques | Registre |

<!-- section: data-classification | objectives: 2.3.1 -->
## Classification des données

**Découverte et classification des données** (Data Discovery & Classification) est intégré à Azure SQL Database et SQL Managed Instance (portail : base de données > Sécurité > **Découverte et classification des données**). Il analyse les colonnes, **recommande** des classifications, stocke celles qui sont acceptées comme métadonnées sur les colonnes, et affiche un tableau de bord exportable vers Excel.

Chaque classification comporte :

| Attribut | Sens | Exemple |
| --- | --- | --- |
| Étiquette | Niveau de sensibilité, l'attribut principal | Public, General, Confidential, Confidential - GDPR, Highly Confidential |
| Type d'informations | Nature des données | Contact Info, Name, National ID, Credit Card, Financial, Health |
| Rang | Ordre de sensibilité | NONE, LOW, MEDIUM, HIGH, CRITICAL |

Deux modes de stratégie s'appliquent à **toutes les bases du locataire** :

| Mode | Étiquettes | Recommandations automatiques |
| --- | --- | --- |
| Stratégie SQL Information Protection | Étiquettes et types d'informations intégrés, personnalisables de façon centralisée dans Microsoft Defender pour le cloud | Oui |
| Stratégie Microsoft Purview Information Protection | Étiquettes de sensibilité Microsoft 365 du portail Microsoft Purview ; le type d'informations affiche `[n/a]` | Non |

```text
ADD SENSITIVITY CLASSIFICATION TO Sales.Customer.Email, Sales.Customer.Phone
WITH (LABEL = 'Confidential', INFORMATION_TYPE = 'Contact Info', RANK = MEDIUM);

SELECT * FROM sys.sensitivity_classifications;

DROP SENSITIVITY CLASSIFICATION FROM Sales.Customer.Phone;
```

T-SQL ne vérifie pas que l'étiquette existe dans la stratégie. Pour SQL Server, classifiez avec T-SQL ou SSMS (base de données > Tasks > **Data Discovery and Classification**). Owner, Contributor et **SQL Security Manager** peuvent modifier les classifications ; Reader peut les consulter.

La classification prend sa valeur avec l'audit : le journal d'audit remplit le champ **`data_sensitivity_information`** avec les étiquettes des colonnes renvoyées par une requête, ce qui permet de rapporter qui a accédé à des données confidentielles.

> **Piège d'examen.** La classification se contente d'étiqueter et de rapporter. Elle ne masque, ne chiffre et ne bloque rien : associez-la au masquage dynamique des données, à Always Encrypted ou à la sécurité au niveau des lignes pour protéger.

<!-- section: auditing | objectives: 2.3.2 -->
## Audits de serveur et de base de données

L'**audit Azure SQL Database** suit les événements de la base et les écrit vers une ou plusieurs destinations :

| Destination | À choisir quand |
| --- | --- |
| Compte de stockage Azure (fichiers `.xel`, objets blob d'ajout) | Rétention longue, stockage immuable pour la conformité, lecture avec `sys.fn_get_audit_file` ou SSMS |
| Espace de travail Log Analytics | Requêtes KQL, tableaux de bord, alertes, Microsoft Sentinel |
| Event Hubs | Diffusion en continu vers un SIEM tiers |

| Stratégie | Effet |
| --- | --- |
| Audit au niveau du serveur | S'applique à **toutes les bases** du serveur logique, existantes et nouvelles |
| Audit au niveau de la base | S'applique à une base, en plus de la stratégie du serveur, jamais à sa place |

Activez l'audit au niveau du serveur dans le cas général ; ajoutez un audit au niveau de la base seulement quand une base a besoin d'autres groupes d'actions ou d'une autre destination. Les groupes d'actions par défaut sont `BATCH_COMPLETED_GROUP`, `SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP` et `FAILED_DATABASE_AUTHENTICATION_GROUP`. Une option distincte du serveur audite les **opérations du support Microsoft** sur votre serveur.

```powershell
Set-AzSqlServerAudit -ResourceGroupName RG1 -ServerName sql-contoso `
  -LogAnalyticsTargetState Enabled `
  -WorkspaceResourceId "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.OperationalInsights/workspaces/law-contoso"
```

```text
SELECT event_time, server_principal_name, statement, data_sensitivity_information
FROM sys.fn_get_audit_file(
  'https://stcontosoaudit.blob.core.windows.net/sqldbauditlogs/sql-contoso/', DEFAULT, DEFAULT);
```

Remarques sur le stockage : un compte de stockage derrière un pare-feu ou un réseau virtuel doit être v2 universel, et le serveur peut s'authentifier avec son identité managée. Pour le stockage immuable, la stratégie doit autoriser les écritures d'ajout protégées. Les échecs de connexion Microsoft Entra n'apparaissent pas dans le journal d'audit SQL (voir les journaux de connexion Microsoft Entra), et `tempdb` n'est pas audité.

**SQL Server et SQL Managed Instance** utilisent les objets SQL Server Audit :

| Objet | Niveau | Capture |
| --- | --- | --- |
| Audit du serveur | Instance | La cible : fichier, journal Application ou Sécurité de Windows (SQL Server) ; **URL** (Stockage Blob Azure) ou **EXTERNAL_MONITOR** (Log Analytics ou Event Hubs par les paramètres de diagnostic) sur Managed Instance |
| Spécification d'audit du serveur | Instance | Groupes d'actions du serveur, comme `FAILED_LOGIN_GROUP` |
| Spécification d'audit de la base de données | Base de données | Actions de la base, comme `SELECT` sur un schéma par un principal |

```text
-- SQL Managed Instance, run in master
CREATE SERVER AUDIT MiAudit
TO URL (PATH = 'https://stcontosoaudit.blob.core.windows.net/miaudit', RETENTION_DAYS = 90);
ALTER SERVER AUDIT MiAudit WITH (STATE = ON);

CREATE SERVER AUDIT SPECIFICATION MiLogins FOR SERVER AUDIT MiAudit
ADD (FAILED_LOGIN_GROUP), ADD (SUCCESSFUL_LOGIN_GROUP) WITH (STATE = ON);

-- In the user database
CREATE DATABASE AUDIT SPECIFICATION HrReads FOR SERVER AUDIT MiAudit
ADD (SELECT ON SCHEMA::HR BY public) WITH (STATE = ON);
```

Sur Managed Instance, la cible URL exige des informations d'identification (SAS ou identité managée) dont le nom est l'URL du conteneur.

<!-- section: change-tracking | objectives: 2.3.3 -->
## Suivi des modifications et capture des changements de données

| | Suivi des modifications | Capture des changements de données (CDC) |
| --- | --- | --- |
| Enregistre | Qu'une ligne a changé (clé, opération, version), éventuellement quelles colonnes | Chaque changement avec les **valeurs des colonnes** avant et après |
| Mécanisme | Synchrone, dans la transaction | Asynchrone, lit le journal des transactions |
| Usage type | Synchronisation bidirectionnelle de clients mobiles ou de caches | ETL, chargement d'entrepôt de données, diffusion d'événements |
| Exigence | Clé primaire sur la table | `db_owner` pour l'activer ; en DTU, S3 ou supérieur dans Azure SQL Database |
| Rétention par défaut | 2 jours | 3 jours |
| Travaux | Aucun | SQL Server Agent (SQL Server, Managed Instance) ; un **planificateur CDC** intégré dans Azure SQL Database |

```text
-- Change tracking
ALTER DATABASE Sales SET CHANGE_TRACKING = ON
  (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
ALTER TABLE Sales.Orders ENABLE CHANGE_TRACKING WITH (TRACK_COLUMNS_UPDATED = ON);
SELECT * FROM CHANGETABLE(CHANGES Sales.Orders, 125) AS ct;   -- since version 125
SELECT CHANGE_TRACKING_CURRENT_VERSION();

-- Change data capture
EXEC sys.sp_cdc_enable_db;
EXEC sys.sp_cdc_enable_table @source_schema = N'Sales', @source_name = N'Orders',
  @role_name = NULL, @supports_net_changes = 1;
```

Faits CDC pour Azure SQL Database : pris en charge sur tous les niveaux vCore et en DTU à partir de S3 (pas Basic, S0, S1, S2) ; le planificateur exécute la capture toutes les 20 secondes et le nettoyage toutes les heures, sans personnalisation possible ; une base serverless en pause ne capture rien. `@supports_net_changes = 1` exige une clé primaire ou un index unique. Vérifiez avec `sys.databases.is_cdc_enabled` et `sys.tables.is_tracked_by_cdc`.

Les **tables temporelles** (`SYSTEM_VERSIONING = ON`) sont l'autre façon de conserver l'historique des lignes : elles stockent chaque version précédente avec sa période de validité et répondent aux requêtes `FOR SYSTEM_TIME AS OF`.

> **Piège d'examen.** « Quelles lignes ont changé, avec une surcharge minimale, sans historique des valeurs » désigne le suivi des modifications. « L'ancienne et la nouvelle valeur de chaque colonne » désigne CDC. « Interroger la table telle qu'elle était le 1er mars » désigne une table temporelle.

<!-- section: dynamic-data-masking | objectives: 2.3.4 -->
## Masquage dynamique des données

Le masquage dynamique des données (DDM) masque les valeurs **dans les résultats des requêtes** pour les utilisateurs qui n'ont pas l'autorisation `UNMASK`. Les données stockées ne changent pas.

| Fonction | Résultat | T-SQL |
| --- | --- | --- |
| Par défaut | `xxxx` pour les chaînes, 0 pour les nombres, 1900-01-01 pour les dates | `default()` |
| E-mail | `aXXX@XXXX.com` | `email()` |
| Aléatoire | Nombre aléatoire dans une plage | `random(1, 100)` |
| Chaîne personnalisée | Préfixe, remplissage, suffixe | `partial(0, "XXXX-XXXX-XXXX-", 4)` |
| Date/heure | Masque une partie d'une date (`Y`, `M`, `D`, `h`, `m`, `s`) | `datetime("Y")` |
| Carte de crédit (portail) | `XXXX-XXXX-XXXX-1234` | Masque du portail ; en T-SQL, utilisez `partial` |

```text
ALTER TABLE Sales.Customer ALTER COLUMN Email
  ADD MASKED WITH (FUNCTION = 'email()');
ALTER TABLE Sales.Customer ALTER COLUMN CardNumber
  ADD MASKED WITH (FUNCTION = 'partial(0, "XXXX-XXXX-XXXX-", 4)');

GRANT UNMASK ON Sales.Customer (Email) TO SupportLead;   -- column
GRANT UNMASK ON SCHEMA::Sales TO Finance;                -- schema
GRANT UNMASK TO Auditors;                                -- database

ALTER TABLE Sales.Customer ALTER COLUMN Email DROP MASKED;
SELECT * FROM sys.masked_columns;
```

Qui voit les vraies valeurs : l'administrateur du serveur, l'administrateur Microsoft Entra, les membres de `db_owner` (et `sysadmin` dans SQL Server), les utilisateurs exclus du masquage dans la stratégie du portail, et les principaux qui ont reçu `UNMASK` au niveau de la base, du schéma, de la table ou de la colonne. Dans Azure SQL Database, configurez-le dans le portail (base de données > Sécurité > **Masquage dynamique des données**, avec des recommandations) ; sur Managed Instance, utilisez T-SQL.

> **Piège d'examen.** DDM n'est pas un chiffrement et n'arrête pas un utilisateur déterminé : quelqu'un qui peut exécuter des requêtes ad hoc peut déduire les valeurs avec `WHERE Salary > 100000`. Il convient pour limiter l'exposition dans les applications et les rapports ; contre les DBA, utilisez Always Encrypted.

<!-- section: ledger | objectives: 2.3.5 -->
## Registre

La fonctionnalité **registre** (ledger) rend toute falsification des données **détectable** : chaque transaction sur une table de registre est hachée (SHA-256) dans des blocs chaînés, et la **synthèse de base de données** (le hachage du dernier bloc) est stockée hors de la base. Une vérification ultérieure recalcule les hachages et signale toute falsification, même par un DBA ou quelqu'un qui a accès aux fichiers. Le registre est disponible dans Azure SQL Database, SQL Managed Instance et SQL Server 2022 et versions ultérieures.

| Type | Opérations | Historique | Usage |
| --- | --- | --- | --- |
| Table de registre modifiable | Insertion, mise à jour, suppression | Table d'historique créée automatiquement, plus une vue de registre | Système d'enregistrement (soldes, stocks) |
| Table de registre d'ajout uniquement | **Insertion seulement** : mises à jour et suppressions bloquées | Inutile | Journaux, événements de sécurité, reçus |
| Base de données de registre | Toutes les tables sont des tables de registre (modifiables par défaut) | | Définie **à la création**, ne peut pas être désactivée |

```text
CREATE TABLE Finance.Account (
  AccountID int NOT NULL PRIMARY KEY,
  Balance decimal(18, 2) NOT NULL
) WITH (SYSTEM_VERSIONING = ON, LEDGER = ON);

CREATE TABLE Security.AccessLog (
  EventTime datetime2 NOT NULL,
  UserName sysname NOT NULL,
  Action nvarchar(200) NOT NULL
) WITH (LEDGER = ON (APPEND_ONLY = ON));

EXECUTE sp_generate_database_ledger_digest;   -- manual digest

DECLARE @locations nvarchar(max) =
  (SELECT * FROM sys.database_ledger_digest_locations FOR JSON AUTO, INCLUDE_NULL_VALUES);
EXECUTE sys.sp_verify_database_ledger_from_digest_storage @locations;   -- verify
```

Gestion des synthèses :

- **Stockage automatique des synthèses** : les synthèses sont générées toutes les 30 secondes (s'il y a eu des transactions) et chargées dans le **Stockage Blob Azure avec une stratégie d'immuabilité** (verrouillée, autorisant les écritures d'ajout protégées) ou dans **Azure Confidential Ledger**. L'identité du serveur ou de l'instance a besoin de Storage Blob Data Contributor sur le compte.
- **Manuel** : `sp_generate_database_ledger_digest` renvoie une synthèse JSON à stocker dans un stockage approuvé (WORM) ; il exige l'autorisation `GENERATE LEDGER DIGEST`.

Dans Azure SQL Database, l'onglet **Sécurité** de la création de la base permet d'en faire une base de données de registre et de configurer le stockage automatique des synthèses.

> **Piège d'examen.** Le registre détecte la falsification ; il ne l'empêche pas et ne masque pas les données. Une table ordinaire existante ne peut pas être transformée en table de registre : créez une nouvelle table de registre et copiez les données. « Les lignes ne doivent jamais être mises à jour ni supprimées » désigne une table de registre d'ajout uniquement.

<!-- section: row-level-security | objectives: 2.3.6 -->
## Sécurité au niveau des lignes

La sécurité au niveau des lignes (RLS) restreint **les lignes** qu'un utilisateur peut lire ou écrire, par une **stratégie de sécurité** qui applique à une table une **fonction de prédicat** table inline. Elle fonctionne dans SQL Server, Azure SQL Database et SQL Managed Instance, sans modification de l'application.

| Prédicat | Effet |
| --- | --- |
| Prédicat de filtre | Retire silencieusement les lignes des `SELECT`, `UPDATE` et `DELETE` : l'utilisateur ne sait pas qu'elles existent |
| Prédicat de blocage | Lève une erreur sur les écritures qui violent le prédicat : `AFTER INSERT`, `AFTER UPDATE`, `BEFORE UPDATE`, `BEFORE DELETE` |

```text
CREATE SCHEMA Security;
GO
CREATE FUNCTION Security.fn_RegionPredicate(@Region nvarchar(20))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS allowed
WHERE @Region = CAST(SESSION_CONTEXT(N'Region') AS nvarchar(20))
   OR IS_MEMBER('SalesManagers') = 1;
GO
CREATE SECURITY POLICY Security.RegionPolicy
ADD FILTER PREDICATE Security.fn_RegionPredicate(Region) ON Sales.Orders,
ADD BLOCK PREDICATE Security.fn_RegionPredicate(Region) ON Sales.Orders AFTER INSERT
WITH (STATE = ON);
```

Règles de conception :

- La fonction doit être une fonction table **inline**, créée `WITH SCHEMABINDING` (la valeur par défaut de la stratégie), de préférence dans un schéma distinct que les utilisateurs de l'application ne peuvent pas modifier.
- Identifiez l'utilisateur avec `USER_NAME()`, `IS_MEMBER()` ou, pour les applications de niveau intermédiaire qui partagent une connexion, **`SESSION_CONTEXT`** défini par `sp_set_session_context`.
- RLS s'applique à tous les utilisateurs, y compris `db_owner`, sauf si le prédicat les exempte.
- Désactivez la stratégie avec `ALTER SECURITY POLICY Security.RegionPolicy WITH (STATE = OFF)`.
- Indexez les colonnes utilisées par le prédicat : il s'exécute pour chaque ligne lue.

> **Piège d'examen.** RLS filtre des lignes ; elle ne masque pas de colonnes. « Les utilisateurs ne doivent pas voir la colonne du salaire » relève d'une autorisation de colonne ou du masquage. « Les utilisateurs ne voient que leurs propres clients » désigne RLS avec un prédicat de filtre ; « les utilisateurs ne peuvent pas insérer de lignes pour une autre région » exige en plus un prédicat de blocage.

<!-- section: key-points -->
## Points clés

- La classification étiquette les colonnes (étiquette, type d'informations, rang) ; l'audit rapporte les accès par `data_sensitivity_information`.
- Audit Azure SQL : stockage, Log Analytics ou Event Hubs ; la stratégie du serveur couvre toutes les bases, une stratégie de base ne fait que s'y ajouter.
- Managed Instance et SQL Server : audit du serveur, spécification d'audit du serveur, spécification d'audit de la base ; Managed Instance écrit vers URL ou EXTERNAL_MONITOR.
- Suivi des modifications : quelles lignes ont changé, synchrone, clé primaire. CDC : valeurs avant et après lues dans le journal, planificateur dans Azure SQL Database, S3 ou supérieur en DTU.
- DDM masque les résultats pour les utilisateurs sans UNMASK ; les administrateurs et `db_owner` voient toujours les vraies données.
- Registre : falsification détectable, tables modifiables ou d'ajout uniquement, synthèses en stockage immuable ou dans Azure Confidential Ledger.
- RLS : fonction de prédicat inline et stratégie de sécurité ; les prédicats de filtre masquent les lignes, les prédicats de blocage rejettent les écritures.
