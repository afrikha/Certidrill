A database solution is secured in layers: encryption decides who can read the stored bytes, masking and Row-Level Security decide what a query returns, permissions decide what a principal can run, passwordless authentication removes secrets, auditing records what happened, and the AI and API endpoints in front of the database get their own identities and roles. Exam questions state who must not see what (an administrator, a support agent, another tenant, an anonymous caller) and expect the one feature that fits, often with the T-SQL or JSON to complete.

<!-- section: encryption | objectives: 2.1.1 -->
## Data encryption: Always Encrypted and column-level encryption

| Requirement | Feature |
| --- | --- |
| Encrypt data files, log and backups at rest, no code change | Transparent Data Encryption (TDE), on by default in Azure SQL and in SQL database in Fabric |
| Database administrators and cloud operators must never see the plaintext | **Always Encrypted**: keys stay outside the engine, the client driver encrypts and decrypts |
| Encrypt a few values with keys stored in the database, decrypted in T-SQL by authorized users | **Column-level encryption** (`ENCRYPTBYKEY` / `DECRYPTBYKEY`) |
| Equality search, join or `GROUP BY` on an encrypted column | Always Encrypted, **deterministic** |
| Strongest protection, no lookup on the column | Always Encrypted, **randomized** |

**Always Encrypted** uses two keys: the **column master key (CMK)**, stored in a key store outside the database (Azure Key Vault, Windows certificate store, HSM), and the **column encryption key (CEK)**, stored in the database encrypted by the CMK.

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

The application connects with `Column Encryption Setting=Enabled` and passes values as **parameters**; the driver needs access to the CMK (for example a Key Vault role or permission for its identity). Deterministic string columns need a `_BIN2` collation. With **secure enclaves**, randomized columns also support range comparisons and `LIKE`, and existing columns can be encrypted in place.

**Column-level encryption** keeps the key hierarchy in the database (database master key > certificate > symmetric key); the column is `varbinary`:

```text
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<strong password>';
CREATE CERTIFICATE CertCards WITH SUBJECT = 'Card numbers';
CREATE SYMMETRIC KEY KeyCards WITH ALGORITHM = AES_256 ENCRYPTION BY CERTIFICATE CertCards;

OPEN SYMMETRIC KEY KeyCards DECRYPTION BY CERTIFICATE CertCards;
UPDATE dbo.Payment SET CardEnc = ENCRYPTBYKEY(KEY_GUID('KeyCards'), CardNumber);
SELECT PaymentID, CONVERT(varchar(19), DECRYPTBYKEY(CardEnc)) AS CardNumber FROM dbo.Payment;
CLOSE SYMMETRIC KEY KeyCards;
```

Who can decrypt is controlled by permissions on the key and certificate (`CONTROL` on the certificate, `VIEW DEFINITION` on the symmetric key), so a `db_owner` can always decrypt.

> **Exam trap.** "Even the DBA must not read the card numbers" eliminates TDE, Dynamic Data Masking and column-level encryption: only Always Encrypted keeps the keys out of the server. And Always Encrypted needs no change to the stored procedures but does need a client driver that supports it.

<!-- section: dynamic-data-masking | objectives: 2.1.2 -->
## Dynamic Data Masking

Dynamic Data Masking (DDM) obfuscates column values in query results for users without the `UNMASK` permission. The stored data doesn't change and no application change is needed.

| Function | Result |
| --- | --- |
| `default()` | Whole value replaced: `XXXX` for strings, 0 for numbers, 1900-01-01 for dates |
| `email()` | First letter, then `XXX@XXXX.com` |
| `partial(prefix, "padding", suffix)` | Keeps the first and last characters you choose |
| `random(start, end)` | A random number in the range, for numeric columns |
| `datetime("Y")` | Masks one part of a date or time (SQL Server 2022 and later, Azure SQL) |

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

Granular `UNMASK` (schema, table, column) is available in SQL Server 2022 and later and in Azure SQL. Administrators and principals with `CONTROL` on the database always see real values. Masking applies to results only: `WHERE` clauses still use the real values, so a user can infer data by filtering, and a user with `ALTER` on the table can drop the mask.

> **Exam trap.** DDM isn't encryption and doesn't protect against a privileged user or an ad hoc query that guesses values. "Support agents see only the last four digits" is DDM with `partial`; "nobody but the application can ever read the value" is Always Encrypted.

<!-- section: row-level-security | objectives: 2.1.3 -->
## Row-Level Security

Row-Level Security (RLS) filters rows by who runs the query, transparently for every access path (queries, views, procedures, APIs). It has two parts: an inline table-valued **predicate function**, and a **security policy** that binds it to tables.

| Predicate | Effect | Operations |
| --- | --- | --- |
| Filter | Rows that fail the predicate are silently excluded | `SELECT`, `UPDATE`, `DELETE` |
| Block | An error is raised when a write violates the predicate | `AFTER INSERT`, `AFTER UPDATE`, `BEFORE UPDATE`, `BEFORE DELETE` |

Multitenant pattern with `SESSION_CONTEXT`, set by a middle tier that connects with a shared identity:

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

- Use `USER_NAME()`, `IS_MEMBER()` or `DATABASE_PRINCIPAL_ID()` in the predicate when every user connects with their own identity.
- `@read_only = 1` stops later code in the session from changing the value.
- `WITH SCHEMABINDING` on the function prevents schema changes from breaking the predicate; keep predicate functions in a dedicated schema.
- Index the predicate column: the predicate is added to every query.
- `ALTER SECURITY POLICY ... WITH (STATE = OFF)` disables the policy for troubleshooting; `sys.security_policies` and `sys.security_predicates` list them.

> **Exam trap.** A filter predicate alone lets a user insert a row for another tenant (and then lose sight of it). "Users must not insert or move rows outside their tenant" needs **block** predicates `AFTER INSERT` and `AFTER UPDATE`. RLS applies to every user, `db_owner` included, unless the predicate exempts them (although a `db_owner` can alter or disable the policy).

<!-- section: object-permissions | objectives: 2.1.4 -->
## Object-level permissions

| Statement | Effect |
| --- | --- |
| `GRANT` | Gives a permission |
| `DENY` | Blocks a permission, overriding any `GRANT` from a role or a higher scope |
| `REVOKE` | Removes a previous `GRANT` or `DENY`; access can still come from another grant |

Permissions are granted at the server, database, schema, object or column level and inherited downward: `GRANT SELECT ON SCHEMA::Sales` covers tables and views created in that schema later.

```text
CREATE ROLE SalesReader;
GRANT SELECT ON SCHEMA::Sales TO SalesReader;
GRANT EXECUTE ON SCHEMA::Api TO AppRole;
GRANT SELECT ON dbo.Employee (EmployeeID, FullName, Department) TO Directory;  -- columns
DENY SELECT ON dbo.EmployeeSalary TO HRAssistant;
ALTER ROLE SalesReader ADD MEMBER [analysts@contoso.com];
SELECT * FROM fn_my_permissions('Sales.Orders', 'OBJECT');
```

**Ownership chaining**: when a procedure or view and the tables it uses have the same owner, the engine checks only the permission on the procedure or view. Granting `EXECUTE` on `Api.usp_GetOrders` is enough to read `Sales.Orders` through it, with no `SELECT` on the table. The chain doesn't cover **dynamic SQL** run inside the module: grant the permission to the caller, use `EXECUTE AS` in the module definition, or sign the module with a certificate.

Least-privilege design: assign permissions to roles that match job functions, grant at the schema level for API schemas, prefer `EXECUTE` on procedures over table permissions, and avoid the fixed roles `db_datareader`, `db_datawriter` and `db_owner` when a narrower grant works.

> **Exam tip.** "Users can run the reporting procedures but must not query the tables directly" = `GRANT EXECUTE` on the procedures (or their schema) and no table permission; ownership chaining does the rest, unless the procedures use dynamic SQL.

<!-- section: passwordless-access | objectives: 2.1.5 -->
## Secure and passwordless database access

**Microsoft Entra authentication** works with Azure SQL Database, Azure SQL Managed Instance, SQL database in Fabric (which supports only Microsoft Entra authentication) and SQL Server 2022 and later (through Azure Arc). The logical server needs a Microsoft Entra admin; database users are created by a Microsoft Entra principal that has `ALTER ANY USER`:

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

| Caller | Choice |
| --- | --- |
| App on App Service, Functions, Container Apps or a VM | **Managed identity**: no secret exists. User-assigned when several apps share the same database permissions |
| Developer workstation and the same code in Azure | `Active Directory Default` (developer sign-in locally, managed identity in Azure) |
| Pipeline outside Azure | Service principal with a federated credential or a certificate rather than a client secret |
| Ban SQL logins entirely | **Microsoft Entra-only authentication** on the server |

Remaining secrets (if any) go to Azure Key Vault or environment variables, never in code. Network access is limited with firewall rules and private endpoints.

> **Exam trap.** An Azure RBAC role such as SQL DB Contributor manages the resource; it gives no access to the data. A managed identity can read tables only after `CREATE USER ... FROM EXTERNAL PROVIDER` and a database role or `GRANT`.

<!-- section: auditing | objectives: 2.1.6 -->
## Auditing

**Azure SQL Database auditing** writes audit logs to an Azure Storage account, a Log Analytics workspace or Event Hubs, in any combination.

| Point | Detail |
| --- | --- |
| Server-level policy | Applies to every database on the logical server, existing and new; it always applies, whatever the database setting |
| Database-level policy | For one database; enabling both creates two separate audits |
| Default action groups | `BATCH_COMPLETED_GROUP`, `SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP`, `FAILED_DATABASE_AUTHENTICATION_GROUP` |
| Reading logs | Storage: `sys.fn_get_audit_file` or the portal; Log Analytics: KQL on `AzureDiagnostics`, category `SQLSecurityAuditEvents` |
| Protection | Store logs outside the audited database, use immutable blob storage, set retention to the regulatory period |

```kusto
AzureDiagnostics
| where Category == "SQLSecurityAuditEvents"
| where TimeGenerated > ago(7d)
| where action_name_s == "SELECT"
| summarize Queries = count() by server_principal_name_s, client_ip_s
| order by Queries desc
```

**SQL Server Audit** (SQL Server) uses a server audit (the target: file, Windows Security log or Application log) and audit specifications:

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

`ON_FAILURE = SHUTDOWN` stops the instance when the audit can't be written, for strict compliance. Audit focused action groups: `BATCH_COMPLETED_GROUP` records every batch and produces large volumes.

> **Exam tip.** "Analyze audit events with KQL and alert on them" = Log Analytics destination. "Stream audit events to a SIEM" = Event Hubs. "Cheapest long-term retention" = storage account.

<!-- section: model-endpoints | objectives: 2.1.7 -->
## Securing model endpoints with managed identity

Calls from the database to AI models go through `sp_invoke_external_rest_endpoint` or an **external model** used by `AI_GENERATE_EMBEDDINGS`. Both authenticate with a **database scoped credential** whose name is the endpoint URL (protocol and host must match the called URL, no query string). Both are available in SQL Server 2025, Azure SQL Database, Azure SQL Managed Instance and SQL database in Fabric.

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

| Credential `IDENTITY` | Sends |
| --- | --- |
| `Managed Identity` | A token for the server's managed identity; no secret stored |
| `HTTPEndpointHeaders` | A key in a header, for example `{"api-key":"..."}` |
| `HTTPEndpointQueryString` | A key in the query string |
| `Shared Access Signature` | A SAS token |

Other controls: Azure SQL Database and Managed Instance only call endpoints on an **allowlist** of Azure domains (`*.openai.azure.com` among them; put other services behind API Management); `sp_invoke_external_rest_endpoint` is enabled by default in Azure SQL Database and in Fabric, and must be enabled with `sp_configure 'external rest endpoint enabled'` in SQL Server 2025 and Managed Instance. On SQL Server 2025, managed identity requires Azure Arc and `sp_configure 'allow server scoped db credentials', 1`. Wrap AI calls in procedures, grant `EXECUTE` to a dedicated role, and log callers, because every call costs money and sends data out.

> **Exam trap.** An API key in `HTTPEndpointHeaders` works but is a stored secret to rotate. "No secrets stored in the database" = `IDENTITY = 'Managed Identity'` plus an Azure role on the model resource for that identity; forgetting that role assignment makes the endpoint reject the call (HTTP 401 or 403 in the response), whatever the SQL permissions.

<!-- section: api-endpoints | objectives: 2.1.8 -->
## Securing GraphQL, REST and MCP endpoints

Data API builder (DAB) publishes the same entities over REST, GraphQL and MCP, with one security model.

**Authentication** (`runtime.host.authentication.provider`): `EntraId` (validates Microsoft Entra JWTs, with `jwt.audience` and `jwt.issuer`), `AppService` (App Service authentication headers), `Custom` (JWTs from another identity provider), `Simulator` (development only, every request authenticated). DAB doesn't support API keys: put Azure API Management in front for key-based clients.

**Authorization** evaluates exactly **one role** per request: `anonymous` without a token, `authenticated` with a valid token, or the role named in the `X-MS-API-ROLE` header, which must appear in the token's `roles` claim (otherwise 403). An entity has no permissions by default.

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

| Control | Rule |
| --- | --- |
| Actions | Tables and views: `create`, `read`, `update`, `delete`; stored procedures: `execute`; `*` for all |
| Fields | `include` / `exclude` per action; a request that references an excluded field is rejected |
| Database policy | `@item` (column) and `@claims` (token) predicate added to the query; supported for `read`, `update`, `delete`, not `create` or `execute` |
| Role inheritance (DAB 2.0) | A named role not configured inherits from `authenticated`, which inherits from `anonymous` |
| Database RLS | `dab init --set-session-context true` sends the token claims with `sp_set_session_context` for RLS predicates; it disables response caching |
| GraphQL | `allow-introspection: false` in production hides the schema |
| MCP | Same roles and permissions apply to every MCP tool; `"mcp": { "dml-tools": false }` hides an entity |

Outbound, DAB connects to the database with a managed identity (`Authentication=Active Directory Managed Identity` in a connection string read with `@env()`), so no password sits in the configuration file. Behind the API, restrict the database with private endpoints and firewall rules, and give the DAB identity only the permissions its entities need.

> **Exam trap.** A database policy and an RLS predicate both filter rows, but in different places: a DAB policy protects only calls through DAB, while RLS (fed by session context) protects every access path. An anonymous `read` grant is inherited by `authenticated` and named roles in DAB 2.0, so granting `anonymous` exposes the entity to everyone.

<!-- section: key-points -->
## Key points

- TDE for files and backups; column-level encryption for keys in the database; Always Encrypted when even administrators must not see data (deterministic for equality, randomized otherwise, enclaves for range and `LIKE`).
- DDM masks results only; `UNMASK` at database, schema, table or column level; filtering can still infer values.
- RLS: inline TVF with `SCHEMABINDING` + security policy; block predicates stop writes outside the user's scope; `SESSION_CONTEXT` for shared connections.
- `DENY` wins over `GRANT`; schema-level grants cover future objects; ownership chaining lets `EXECUTE` replace table permissions, except for dynamic SQL.
- Managed identity + `CREATE USER ... FROM EXTERNAL PROVIDER` = passwordless; Microsoft Entra-only authentication removes SQL logins.
- Azure SQL auditing: storage, Log Analytics or Event Hubs; the server policy applies to every database.
- AI endpoints: credential named after the URL, `IDENTITY = 'Managed Identity'`, role on the Azure OpenAI resource, `EXECUTE` on the external model.
- DAB: one role per request, `X-MS-API-ROLE`, field include/exclude, `@item`/`@claims` policies, no introspection in production, same RBAC for MCP.
