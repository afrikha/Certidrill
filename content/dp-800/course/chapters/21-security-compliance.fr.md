Une solution de base de données se sécurise par couches : le chiffrement décide qui peut lire les octets stockés, le masquage et Row-Level Security décident ce qu'une requête renvoie, les autorisations décident ce qu'un principal peut exécuter, l'authentification sans mot de passe supprime les secrets, l'audit enregistre ce qui s'est passé, et les points de terminaison d'IA et d'API placés devant la base reçoivent leurs propres identités et rôles. Les questions d'examen indiquent qui ne doit pas voir quoi (un administrateur, un agent du support, un autre locataire, un appelant anonyme) et attendent la seule fonctionnalité qui convient, souvent avec le T-SQL ou le JSON à compléter.

<!-- section: encryption | objectives: 2.1.1 -->
## Chiffrement des données : Always Encrypted et chiffrement au niveau des colonnes

| Exigence | Fonctionnalité |
| --- | --- |
| Chiffrer au repos les fichiers de données, le journal et les sauvegardes, sans modifier le code | Chiffrement transparent des données (TDE), activé par défaut dans Azure SQL et dans la base de données SQL dans Fabric |
| Les administrateurs de base de données et les opérateurs cloud ne doivent jamais voir le texte en clair | **Always Encrypted** : les clés restent hors du moteur, le pilote client chiffre et déchiffre |
| Chiffrer quelques valeurs avec des clés stockées dans la base, déchiffrées en T-SQL par les utilisateurs autorisés | **Chiffrement au niveau des colonnes** (`ENCRYPTBYKEY` / `DECRYPTBYKEY`) |
| Recherche d'égalité, jointure ou `GROUP BY` sur une colonne chiffrée | Always Encrypted, **déterministe** |
| Protection la plus forte, aucune recherche sur la colonne | Always Encrypted, **aléatoire** |

**Always Encrypted** utilise deux clés : la **clé principale de colonne (CMK)**, stockée dans un magasin de clés hors de la base (Azure Key Vault, magasin de certificats Windows, HSM), et la **clé de chiffrement de colonne (CEK)**, stockée dans la base, chiffrée par la CMK.

```text
CREATE COLUMN MASTER KEY CMK_Vault
WITH (KEY_STORE_PROVIDER_NAME = 'AZURE_KEY_VAULT',
      KEY_PATH = 'https://kv-contoso.vault.azure.net/keys/AlwaysEncrypted/1a2b3c');

CREATE COLUMN ENCRYPTION KEY CEK_Patient
WITH VALUES (COLUMN_MASTER_KEY = CMK_Vault, ALGORITHM = 'RSA_OAEP',
             ENCRYPTED_VALUE = 0x01700000016C006F00...);

CREATE TABLE dbo.Patient (
    PatientID int PRIMARY KEY,
    NationalID char(11) COLLATE Latin1_General_BIN2
        ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK_Patient,
                        ENCRYPTION_TYPE = DETERMINISTIC,
                        ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'),
    Diagnosis nvarchar(400)
        ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK_Patient,
                        ENCRYPTION_TYPE = RANDOMIZED,
                        ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'));
```

L'application se connecte avec `Column Encryption Setting=Enabled` et transmet les valeurs sous forme de **paramètres** ; le pilote doit avoir accès à la CMK (par exemple un rôle ou une autorisation Key Vault pour son identité). Les colonnes de chaînes en chiffrement déterministe exigent un classement `_BIN2`. Avec les **enclaves sécurisées**, les colonnes en chiffrement aléatoire acceptent aussi les comparaisons de plage et `LIKE`, et les colonnes existantes peuvent être chiffrées sur place.

Le **chiffrement au niveau des colonnes** garde la hiérarchie de clés dans la base (clé principale de base de données > certificat > clé symétrique) ; la colonne est de type `varbinary` :

```text
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<strong password>';
CREATE CERTIFICATE CertCards WITH SUBJECT = 'Card numbers';
CREATE SYMMETRIC KEY KeyCards WITH ALGORITHM = AES_256 ENCRYPTION BY CERTIFICATE CertCards;

OPEN SYMMETRIC KEY KeyCards DECRYPTION BY CERTIFICATE CertCards;
UPDATE dbo.Payment SET CardEnc = ENCRYPTBYKEY(KEY_GUID('KeyCards'), CardNumber);
SELECT PaymentID, CONVERT(varchar(19), DECRYPTBYKEY(CardEnc)) AS CardNumber FROM dbo.Payment;
CLOSE SYMMETRIC KEY KeyCards;
```

Qui peut déchiffrer dépend des autorisations sur la clé et le certificat (`CONTROL` sur le certificat, `VIEW DEFINITION` sur la clé symétrique) : un `db_owner` peut donc toujours déchiffrer.

> **Piège d'examen.** « Même le DBA ne doit pas lire les numéros de carte » élimine TDE, le masquage dynamique des données et le chiffrement au niveau des colonnes : seul Always Encrypted garde les clés hors du serveur. Et Always Encrypted n'exige aucune modification des procédures stockées, mais exige un pilote client qui le prend en charge.

<!-- section: dynamic-data-masking | objectives: 2.1.2 -->
## Masquage dynamique des données

Le masquage dynamique des données (DDM) masque les valeurs des colonnes dans les résultats des requêtes pour les utilisateurs qui n'ont pas l'autorisation `UNMASK`. Les données stockées ne changent pas et aucune modification de l'application n'est nécessaire.

| Fonction | Résultat |
| --- | --- |
| `default()` | Valeur entière remplacée : `XXXX` pour les chaînes, 0 pour les nombres, 1900-01-01 pour les dates |
| `email()` | Première lettre, puis `XXX@XXXX.com` |
| `partial(prefix, "padding", suffix)` | Conserve les premiers et derniers caractères choisis |
| `random(start, end)` | Un nombre aléatoire dans la plage, pour les colonnes numériques |
| `datetime("Y")` | Masque une partie d'une date ou d'une heure (SQL Server 2022 et versions ultérieures, Azure SQL) |

```text
ALTER TABLE dbo.Customer ALTER COLUMN Phone
    ADD MASKED WITH (FUNCTION = 'partial(0,"XXX-XXX-",4)');
ALTER TABLE dbo.Customer ALTER COLUMN Email
    ADD MASKED WITH (FUNCTION = 'email()');

GRANT UNMASK TO ComplianceOfficer;                          -- every masked column
GRANT UNMASK ON SCHEMA::Sales TO SalesManager;              -- one schema
GRANT UNMASK ON dbo.Customer(Phone) TO TelesalesTeam;       -- one column

ALTER TABLE dbo.Customer ALTER COLUMN Email DROP MASKED;
```

L'`UNMASK` granulaire (schéma, table, colonne) est disponible dans SQL Server 2022 et versions ultérieures et dans Azure SQL. Les administrateurs et les principaux qui ont `CONTROL` sur la base voient toujours les valeurs réelles. Le masquage ne s'applique qu'aux résultats : les clauses `WHERE` utilisent toujours les vraies valeurs, si bien qu'un utilisateur peut déduire les données en filtrant, et un utilisateur qui a `ALTER` sur la table peut supprimer le masque.

> **Piège d'examen.** Le DDM n'est pas un chiffrement et ne protège ni contre un utilisateur privilégié ni contre une requête ad hoc qui devine les valeurs. « Les agents du support ne voient que les quatre derniers chiffres » relève du DDM avec `partial` ; « personne d'autre que l'application ne peut jamais lire la valeur » relève d'Always Encrypted.

<!-- section: row-level-security | objectives: 2.1.3 -->
## Row-Level Security

Row-Level Security (RLS) filtre les lignes selon l'utilisateur qui exécute la requête, de façon transparente pour tous les chemins d'accès (requêtes, vues, procédures, API). Elle comprend deux éléments : une **fonction de prédicat** table inline, et une **stratégie de sécurité** qui la lie aux tables.

| Prédicat | Effet | Opérations |
| --- | --- | --- |
| Filtre (filter) | Les lignes qui ne respectent pas le prédicat sont exclues sans erreur | `SELECT`, `UPDATE`, `DELETE` |
| Blocage (block) | Une erreur est levée quand une écriture viole le prédicat | `AFTER INSERT`, `AFTER UPDATE`, `BEFORE UPDATE`, `BEFORE DELETE` |

Modèle multilocataire avec `SESSION_CONTEXT`, défini par une couche intermédiaire qui se connecte avec une identité partagée :

```text
CREATE SCHEMA Security;
GO
CREATE FUNCTION Security.fn_TenantPredicate(@TenantID int)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS result
       WHERE @TenantID = CAST(SESSION_CONTEXT(N'TenantID') AS int);
GO
CREATE SECURITY POLICY Security.TenantPolicy
    ADD FILTER PREDICATE Security.fn_TenantPredicate(TenantID) ON dbo.Orders,
    ADD BLOCK PREDICATE Security.fn_TenantPredicate(TenantID) ON dbo.Orders AFTER INSERT,
    ADD BLOCK PREDICATE Security.fn_TenantPredicate(TenantID) ON dbo.Orders AFTER UPDATE
WITH (STATE = ON);
GO
-- In the application, after sign-in
EXEC sp_set_session_context @key = N'TenantID', @value = 42, @read_only = 1;
```

- Utilisez `USER_NAME()`, `IS_MEMBER()` ou `DATABASE_PRINCIPAL_ID()` dans le prédicat quand chaque utilisateur se connecte avec sa propre identité.
- `@read_only = 1` empêche le code exécuté ensuite dans la session de modifier la valeur.
- `WITH SCHEMABINDING` sur la fonction empêche les modifications de schéma de casser le prédicat ; gardez les fonctions de prédicat dans un schéma dédié.
- Indexez la colonne du prédicat : le prédicat est ajouté à chaque requête.
- `ALTER SECURITY POLICY ... WITH (STATE = OFF)` désactive la stratégie pour le dépannage ; `sys.security_policies` et `sys.security_predicates` les listent.

> **Piège d'examen.** Un prédicat de filtre seul permet à un utilisateur d'insérer une ligne pour un autre locataire (puis de ne plus la voir). « Les utilisateurs ne doivent pas insérer ni déplacer de lignes hors de leur locataire » exige des prédicats de **blocage** `AFTER INSERT` et `AFTER UPDATE`. RLS s'applique à tous les utilisateurs, `db_owner` compris, sauf si le prédicat les exempte (même si un `db_owner` peut modifier ou désactiver la stratégie).

<!-- section: object-permissions | objectives: 2.1.4 -->
## Autorisations au niveau de l'objet

| Instruction | Effet |
| --- | --- |
| `GRANT` | Accorde une autorisation |
| `DENY` | Bloque une autorisation, en l'emportant sur tout `GRANT` venant d'un rôle ou d'une étendue supérieure |
| `REVOKE` | Retire un `GRANT` ou un `DENY` antérieur ; l'accès peut encore venir d'une autre autorisation |

Les autorisations s'accordent au niveau du serveur, de la base, du schéma, de l'objet ou de la colonne et sont héritées vers le bas : `GRANT SELECT ON SCHEMA::Sales` couvre les tables et vues créées plus tard dans ce schéma.

```text
CREATE ROLE SalesReader;
GRANT SELECT ON SCHEMA::Sales TO SalesReader;
GRANT EXECUTE ON SCHEMA::Api TO AppRole;
GRANT SELECT ON dbo.Employee (EmployeeID, FullName, Department) TO Directory;  -- columns
DENY SELECT ON dbo.EmployeeSalary TO HRAssistant;
ALTER ROLE SalesReader ADD MEMBER [analysts@contoso.com];
SELECT * FROM fn_my_permissions('Sales.Orders', 'OBJECT');
```

**Chaînage des propriétés** : quand une procédure ou une vue et les tables qu'elle utilise ont le même propriétaire, le moteur ne vérifie que l'autorisation sur la procédure ou la vue. Accorder `EXECUTE` sur `Api.usp_GetOrders` suffit pour lire `Sales.Orders` à travers elle, sans `SELECT` sur la table. Le chaînage ne couvre pas le **SQL dynamique** exécuté dans le module : accordez l'autorisation à l'appelant, utilisez `EXECUTE AS` dans la définition du module, ou signez le module avec un certificat.

Conception au moindre privilège : attribuez les autorisations à des rôles qui correspondent aux fonctions métier, accordez au niveau du schéma pour les schémas d'API, préférez `EXECUTE` sur des procédures aux autorisations sur les tables, et évitez les rôles fixes `db_datareader`, `db_datawriter` et `db_owner` quand une autorisation plus étroite suffit.

> **Conseil d'examen.** « Les utilisateurs peuvent exécuter les procédures de reporting mais ne doivent pas interroger directement les tables » = `GRANT EXECUTE` sur les procédures (ou leur schéma) et aucune autorisation sur les tables ; le chaînage des propriétés fait le reste, sauf si les procédures utilisent du SQL dynamique.

<!-- section: passwordless-access | objectives: 2.1.5 -->
## Accès sécurisé et sans mot de passe à la base

L'**authentification Microsoft Entra** fonctionne avec Azure SQL Database, Azure SQL Managed Instance, la base de données SQL dans Fabric (qui n'accepte que l'authentification Microsoft Entra) et SQL Server 2022 et versions ultérieures (par Azure Arc). Le serveur logique a besoin d'un administrateur Microsoft Entra ; les utilisateurs de base de données sont créés par un principal Microsoft Entra qui dispose de `ALTER ANY USER` :

```text
CREATE USER [app-orders-prod] FROM EXTERNAL PROVIDER;        -- managed identity (its name)
CREATE USER [sql-developers] FROM EXTERNAL PROVIDER;         -- Microsoft Entra group
CREATE USER [maria@contoso.com] FROM EXTERNAL PROVIDER;      -- user
ALTER ROLE db_datareader ADD MEMBER [app-orders-prod];
```

```text
Server=tcp:sql-contoso.database.windows.net,1433;Database=Orders;Authentication=Active Directory Managed Identity;Encrypt=True;
Server=tcp:sql-contoso.database.windows.net,1433;Database=Orders;Authentication=Active Directory Managed Identity;User Id=<client-id-of-user-assigned-identity>;Encrypt=True;
Server=tcp:sql-contoso.database.windows.net,1433;Database=Orders;Authentication=Active Directory Default;Encrypt=True;
```

| Appelant | Choix |
| --- | --- |
| Application sur App Service, Functions, Container Apps ou une machine virtuelle | **Identité managée** : aucun secret n'existe. Affectée par l'utilisateur quand plusieurs applications partagent les mêmes autorisations sur la base |
| Poste du développeur et même code dans Azure | `Active Directory Default` (connexion du développeur en local, identité managée dans Azure) |
| Pipeline hors d'Azure | Principal de service avec des informations d'identification fédérées ou un certificat plutôt qu'un secret client |
| Interdire complètement les connexions SQL | **Authentification Microsoft Entra uniquement** sur le serveur |

Les secrets restants (s'il y en a) vont dans Azure Key Vault ou des variables d'environnement, jamais dans le code. L'accès réseau est limité par des règles de pare-feu et des points de terminaison privés.

> **Piège d'examen.** Un rôle Azure RBAC comme SQL DB Contributor gère la ressource ; il ne donne aucun accès aux données. Une identité managée ne peut lire des tables qu'après `CREATE USER ... FROM EXTERNAL PROVIDER` et un rôle de base de données ou un `GRANT`.

<!-- section: auditing | objectives: 2.1.6 -->
## Audit

L'**audit d'Azure SQL Database** écrit les journaux d'audit dans un compte Stockage Azure, un espace de travail Log Analytics ou Event Hubs, dans n'importe quelle combinaison.

| Point | Détail |
| --- | --- |
| Stratégie au niveau du serveur | S'applique à toutes les bases du serveur logique, existantes et nouvelles ; elle s'applique toujours, quel que soit le paramètre de la base |
| Stratégie au niveau de la base | Pour une seule base ; activer les deux crée deux audits distincts |
| Groupes d'actions par défaut | `BATCH_COMPLETED_GROUP`, `SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP`, `FAILED_DATABASE_AUTHENTICATION_GROUP` |
| Lecture des journaux | Stockage : `sys.fn_get_audit_file` ou le portail ; Log Analytics : KQL sur `AzureDiagnostics`, catégorie `SQLSecurityAuditEvents` |
| Protection | Stocker les journaux hors de la base auditée, utiliser un stockage blob immuable, fixer la rétention à la durée réglementaire. Avec un stockage immuable : **Allow protected append writes** défini sur Append blobs ou Block and append blobs (pas None), un intervalle de rétention du stockage plus court que la rétention de l'audit, et une rétention de l'audit différente de 0 |

```kusto
AzureDiagnostics
| where Category == "SQLSecurityAuditEvents"
| where TimeGenerated > ago(7d)
| where action_name_s == "SELECT"
| summarize Queries = count() by server_principal_name_s, client_ip_s
| order by Queries desc
```

**SQL Server Audit** (SQL Server) utilise un audit de serveur (la cible : fichier, journal de sécurité ou journal des applications Windows) et des spécifications d'audit :

```text
CREATE SERVER AUDIT AuditHR
TO FILE (FILEPATH = 'D:\Audit\', MAXSIZE = 100 MB, MAX_ROLLOVER_FILES = 10)
WITH (QUEUE_DELAY = 1000, ON_FAILURE = CONTINUE);
ALTER SERVER AUDIT AuditHR WITH (STATE = ON);
GO
USE HR;
CREATE DATABASE AUDIT SPECIFICATION AuditSalary
FOR SERVER AUDIT AuditHR
ADD (SELECT, UPDATE ON dbo.EmployeeSalary BY public),
ADD (DATABASE_ROLE_MEMBER_CHANGE_GROUP)
WITH (STATE = ON);
```

`ON_FAILURE = SHUTDOWN` arrête l'instance quand l'audit ne peut pas être écrit, pour une conformité stricte. Auditez des groupes d'actions ciblés : `BATCH_COMPLETED_GROUP` enregistre chaque lot et produit de gros volumes.

> **Conseil d'examen.** « Analyser les événements d'audit en KQL et déclencher des alertes » = destination Log Analytics. « Diffuser les événements d'audit vers un SIEM » = Event Hubs. « Rétention longue au moindre coût » = compte de stockage.

<!-- section: model-endpoints | objectives: 2.1.7 -->
## Sécuriser les points de terminaison de modèle avec une identité managée

Les appels de la base vers des modèles d'IA passent par `sp_invoke_external_rest_endpoint` ou par un **modèle externe** utilisé par `AI_GENERATE_EMBEDDINGS`. Les deux s'authentifient avec des **informations d'identification délimitées à la base de données** (database scoped credential) dont le nom est l'URL du point de terminaison (le protocole et l'hôte doivent correspondre à l'URL appelée, sans chaîne de requête). Les deux sont disponibles dans SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance et la base de données SQL dans Fabric.

```text
-- 1. Enable the server's system-assigned managed identity, then grant it the
--    Cognitive Services OpenAI User role on the Azure OpenAI resource.
-- 2. Credential named after the endpoint, using the managed identity
CREATE DATABASE SCOPED CREDENTIAL [https://aoai-contoso.openai.azure.com]
WITH IDENTITY = 'Managed Identity',
     SECRET = '{"resourceid":"https://cognitiveservices.azure.com"}';
GO
-- 3. External model that uses it
CREATE EXTERNAL MODEL EmbeddingModel
WITH (LOCATION = 'https://aoai-contoso.openai.azure.com/openai/deployments/text-embedding-3-small/embeddings?api-version=2024-02-01',
      API_FORMAT = 'Azure OpenAI',
      MODEL_TYPE = EMBEDDINGS,
      MODEL = 'text-embedding-3-small',
      CREDENTIAL = [https://aoai-contoso.openai.azure.com]);
GO
-- 4. Least privilege for callers
GRANT EXECUTE ON EXTERNAL MODEL::EmbeddingModel TO AppRole;
-- For direct calls with sp_invoke_external_rest_endpoint
GRANT EXECUTE ANY EXTERNAL ENDPOINT TO AppRole;
GRANT REFERENCES ON DATABASE SCOPED CREDENTIAL::[https://aoai-contoso.openai.azure.com] TO AppRole;
```

| `IDENTITY` des informations d'identification | Envoie |
| --- | --- |
| `Managed Identity` | Un jeton pour l'identité managée du serveur ; aucun secret stocké |
| `HTTPEndpointHeaders` | Une clé dans un en-tête, par exemple `{"api-key":"..."}` |
| `HTTPEndpointQueryString` | Une clé dans la chaîne de requête |
| `Shared Access Signature` | Un jeton SAS |

Autres contrôles : Azure SQL Database et Managed Instance n'appellent que des points de terminaison figurant sur une **liste d'autorisation** de domaines Azure (dont `*.openai.azure.com` ; placez les autres services derrière API Management) ; `sp_invoke_external_rest_endpoint` est activée par défaut dans Azure SQL Database et dans Fabric, et doit être activée avec `sp_configure 'external rest endpoint enabled'` dans SQL Server 2025 et Managed Instance. Dans SQL Server 2025, l'identité managée exige Azure Arc et `sp_configure 'allow server scoped db credentials', 1`. Encapsulez les appels d'IA dans des procédures, accordez `EXECUTE` à un rôle dédié et journalisez les appelants, car chaque appel coûte de l'argent et envoie des données à l'extérieur.

> **Piège d'examen.** Une clé API dans `HTTPEndpointHeaders` fonctionne, mais c'est un secret stocké à faire pivoter. « Aucun secret stocké dans la base » = `IDENTITY = 'Managed Identity'` plus un rôle Azure sur la ressource du modèle pour cette identité ; oublier cette attribution de rôle fait rejeter l'appel par le point de terminaison (HTTP 401 ou 403 dans la réponse), quelles que soient les autorisations SQL.

<!-- section: api-endpoints | objectives: 2.1.8 -->
## Sécuriser les points de terminaison GraphQL, REST et MCP

Le générateur d'API de données (Data API builder, DAB) publie les mêmes entités en REST, GraphQL et MCP, avec un seul modèle de sécurité.

**Authentification** (`runtime.host.authentication.provider`) : `EntraId` (valide les JWT Microsoft Entra, avec `jwt.audience` et `jwt.issuer`), `AppService` (en-têtes de l'authentification App Service), `Custom` (JWT d'un autre fournisseur d'identité), `Simulator` (développement uniquement, chaque requête est authentifiée). DAB ne prend pas en charge les clés API : placez Azure API Management devant pour les clients à clé.

**L'autorisation** évalue exactement **un rôle** par requête : `anonymous` sans jeton, `authenticated` avec un jeton valide, ou le rôle nommé dans l'en-tête `X-MS-API-ROLE`, qui doit figurer dans la revendication `roles` du jeton (sinon 403). Une entité n'a aucune autorisation par défaut.

```json
{
  "runtime": {
    "host": {
      "mode": "production",
      "authentication": {
        "provider": "EntraId",
        "jwt": {
          "audience": "api://orders-api",
          "issuer": "https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0"
        }
      }
    },
    "graphql": { "enabled": true, "path": "/graphql", "allow-introspection": false }
  },
  "entities": {
    "Order": {
      "source": { "object": "dbo.Orders", "type": "table" },
      "permissions": [
        {
          "role": "customer",
          "actions": [
            {
              "action": "read",
              "fields": { "include": [ "*" ], "exclude": [ "CostPrice", "InternalNotes" ] },
              "policy": { "database": "@item.CustomerId eq @claims.oid" }
            }
          ]
        },
        { "role": "order-admin", "actions": [ "*" ] }
      ]
    }
  }
}
```

| Contrôle | Règle |
| --- | --- |
| Actions | Tables et vues : `create`, `read`, `update`, `delete` ; procédures stockées : `execute` ; `*` pour toutes |
| Champs | `include` / `exclude` par action ; une requête qui référence un champ exclu est rejetée |
| Stratégie de base de données | Prédicat `@item` (colonne) et `@claims` (jeton) ajouté à la requête ; pris en charge pour `read`, `update`, `delete`, pas pour `create` ni `execute` |
| Héritage des rôles (DAB 2.0) | Un rôle nommé non configuré hérite de `authenticated`, qui hérite de `anonymous` |
| RLS de la base | `dab init --set-session-context true` envoie les revendications du jeton avec `sp_set_session_context` pour les prédicats RLS ; cela désactive la mise en cache des réponses |
| GraphQL | `allow-introspection: false` en production masque le schéma |
| MCP | Les mêmes rôles et autorisations s'appliquent à chaque outil MCP ; `"mcp": { "dml-tools": false }` masque une entité |

En sortie, DAB se connecte à la base avec une identité managée (`Authentication=Active Directory Managed Identity` dans une chaîne de connexion lue avec `@env()`), si bien qu'aucun mot de passe ne figure dans le fichier de configuration. Derrière l'API, limitez la base avec des points de terminaison privés et des règles de pare-feu, et ne donnez à l'identité de DAB que les autorisations nécessaires à ses entités.

> **Piège d'examen.** Une stratégie de base de données et un prédicat RLS filtrent tous deux des lignes, mais à des endroits différents : une stratégie DAB ne protège que les appels passant par DAB, alors que RLS (alimentée par le contexte de session) protège tous les chemins d'accès. Une autorisation `read` accordée à `anonymous` est héritée par `authenticated` et les rôles nommés dans DAB 2.0 : accorder `anonymous` expose donc l'entité à tout le monde.

<!-- section: key-points -->
## Points clés

- TDE pour les fichiers et les sauvegardes ; chiffrement au niveau des colonnes pour des clés dans la base ; Always Encrypted quand même les administrateurs ne doivent pas voir les données (déterministe pour l'égalité, aléatoire sinon, enclaves pour les plages et `LIKE`).
- Le DDM ne masque que les résultats ; `UNMASK` au niveau de la base, du schéma, de la table ou de la colonne ; un filtrage peut encore déduire les valeurs.
- RLS : TVF inline avec `SCHEMABINDING` + stratégie de sécurité ; les prédicats de blocage empêchent les écritures hors du périmètre de l'utilisateur ; `SESSION_CONTEXT` pour les connexions partagées.
- `DENY` l'emporte sur `GRANT` ; les autorisations au niveau du schéma couvrent les objets futurs ; le chaînage des propriétés permet à `EXECUTE` de remplacer les autorisations sur les tables, sauf pour le SQL dynamique.
- Identité managée + `CREATE USER ... FROM EXTERNAL PROVIDER` = sans mot de passe ; l'authentification Microsoft Entra uniquement supprime les connexions SQL.
- Audit d'Azure SQL : stockage, Log Analytics ou Event Hubs ; la stratégie du serveur s'applique à toutes les bases.
- Points de terminaison d'IA : informations d'identification nommées d'après l'URL, `IDENTITY = 'Managed Identity'`, rôle sur la ressource Azure OpenAI, `EXECUTE` sur le modèle externe.
- DAB : un rôle par requête, `X-MS-API-ROLE`, champs include/exclude, stratégies `@item`/`@claims`, pas d'introspection en production, même RBAC pour MCP.
