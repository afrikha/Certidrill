Azure SQL security questions combine three layers: who can reach the logical server or managed instance (network), who can sign in and how data is encrypted (identity and keys), and how activity is recorded and watched (auditing and Microsoft Defender for Databases). Most answers depend on a scope detail: server or database, Azure SQL Database or Azure SQL Managed Instance, subscription or resource.

<!-- section: sql-network | objectives: 2.2.1 -->
## Network access to Azure SQL

For a logical server of Azure SQL Database, **Security > Networking** has three settings that work together.

| Setting | Values | Exam facts |
| --- | --- | --- |
| Public network access | Disable, Selected networks | Disabled: only private endpoints connect (error 47073), and firewall rules can't be created or edited (error 42101) |
| Minimum TLS version | 1.2 (lowest supported), 1.3 | Clients below the minimum fail with error 47072. Once a minimum is enforced, you can't return to the default |
| Connection policy | Default, Redirect, Proxy | Redirect is recommended over Proxy (lowest latency, highest throughput) |

With **Selected networks**, the firewall admits:

| Rule | Scope | How to create | Limits |
| --- | --- | --- | --- |
| Server-level IP rule | All databases of the server; stored in `master` | Portal, CLI, PowerShell (subscription Owner or Contributor, SQL Server Contributor, SQL Security Manager) or `sp_set_firewall_rule` in `master` | 256 per server |
| Database-level IP rule | One database; stored in the database (portable with it) | T-SQL only: `sp_set_database_firewall_rule`, with `CONTROL DATABASE` | 256 per database |
| Virtual network rule | All databases of the server | Subnet with the `Microsoft.Sql` service endpoint (Network Contributor), then the rule (SQL Server Contributor) | 128 per server |
| Allow Azure services and resources to access this server | Rule `AllowAllWindowsAzureIps` (0.0.0.0) | A checkbox, off by default | Admits **every** Azure service, including other customers' subscriptions |

Evaluation: the database-level rules of the target database are checked first, then the server-level rules; no match means the connection fails. Changes can take up to five minutes (`DBCC FLUSHAUTHCACHE` forces a refresh). Clients outside Azure need outbound TCP 1433.

```bash
az sql server firewall-rule create --resource-group RG-Sql --server sql-contoso \
  --name HQ --start-ip-address 131.107.10.0 --end-ip-address 131.107.10.255
az sql server update --resource-group RG-Sql --name sql-contoso \
  --enable-public-network false
```

A **private endpoint** (sub-resource `sqlServer`, zone `privatelink.database.windows.net`) is the way to remove internet exposure entirely. Azure SQL Managed Instance lives in its own subnet and has no server firewall rules: access is controlled by the NSG of that subnet, and its optional **public endpoint** (port 3342) is disabled by default.

> **Exam trap.** "Allow Azure services and resources to access this server" doesn't mean "my subscription". To admit only an app in your virtual network, use a virtual network rule or a private endpoint and leave the checkbox off.

<!-- section: sql-identity-encryption | objectives: 2.2.1 -->
## Authentication and encryption

**Microsoft Entra authentication** requires a **Microsoft Entra admin** on the server or managed instance (one user or group). **Microsoft Entra-only authentication** then disables SQL authentication: SQL logins, including the server admin, can no longer connect, but they aren't deleted.

| Fact | Value |
| --- | --- |
| Prerequisite | The Microsoft Entra admin is set |
| Who can enable or disable it | SQL Security Manager (also Owner or Contributor); **not** SQL Server Contributor or SQL Managed Instance Contributor |
| Enforce for new servers | Built-in Azure Policy definitions |
| Check with T-SQL | `SERVERPROPERTY('IsExternalAuthenticationOnly')` returns 1 |

```bash
az sql server ad-only-auth enable --resource-group RG-Sql --name sql-contoso
az sql mi ad-only-auth enable --resource-group RG-Sql --name sqlmi-contoso
```

**Transparent data encryption (TDE)** encrypts data files, logs and backups at rest with a database encryption key (DEK), itself protected by the **TDE protector**. New databases use a **service-managed** protector. A **customer-managed** protector (BYOK) is set at the server level (SQL Database) or instance level (SQL Managed Instance) and inherited by databases; database-level keys are also possible for SQL Database.

| Customer-managed TDE requirement | Value |
| --- | --- |
| Key store | Azure Key Vault or Managed HSM, any region |
| Vault settings | Soft delete and purge protection, otherwise setup fails |
| Key | RSA or RSA-HSM 2048 or 3072 bits, enabled, not expired |
| Server identity | System-assigned or user-assigned managed identity |
| Access | Role **Key Vault Crypto Service Encryption User** (RBAC model) or `get`, `wrapKey`, `unwrapKey` (access policy model) |
| Vault firewall | Allow trusted Microsoft services, unless you use a private endpoint |
| Rotation | Automatic rotation is off by default; when on, the protector moves to the latest key version within 24 hours. Keep old versions: backups need them |
| Geo-replication | Both servers need access to the key vaults that hold the keys |

Switching from a service-managed to a customer-managed key re-encrypts only the DEK: online, no downtime. If the server loses access to the key (permission removed, key or vault deleted, firewall change, identity deleted), databases become **Inaccessible** within about 10 minutes; restored within 30 minutes, they heal automatically.

Other platform controls the exam contrasts:

| Requirement | Feature |
| --- | --- |
| Encrypt files and backups at rest | TDE |
| Keep sensitive columns encrypted from the database engine and its administrators | Always Encrypted |
| Hide part of a value in query results for non-privileged users | Dynamic data masking (not encryption) |
| Return only the rows a user is allowed to see | Row-level security |

> **Exam trap.** Revoking the server identity's access to the TDE protector makes the whole database inaccessible, not only encrypted columns. Revocation is a deliberate kill switch; key vault hygiene (purge protection, keeping old key versions) is what prevents accidental loss.

<!-- section: sql-auditing | objectives: 2.2.2 -->
## Auditing Azure SQL Database and SQL Managed Instance

Auditing records database events to one or more destinations: an **Azure Storage** account, a **Log Analytics** workspace or **Event Hubs**.

| Topic | Azure SQL Database | Azure SQL Managed Instance |
| --- | --- | --- |
| Where configured | Portal, CLI, PowerShell, REST at server or database level | T-SQL `CREATE SERVER AUDIT`, plus diagnostic settings for Log Analytics or Event Hubs |
| Scope | A server policy applies to all existing and new databases; a database policy exists side by side with it | Server audit plus server or database audit specifications |
| Default events | `BATCH_COMPLETED_GROUP`, `SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP`, `FAILED_DATABASE_AUTHENTICATION_GROUP` | What the audit specification lists |
| Storage authentication | Managed identity (recommended) or storage access keys | Credential with a SAS token for `TO URL` |
| Retention | Retention days for storage; 0 (default) means unlimited | `RETENTION_DAYS` in `CREATE SERVER AUDIT`, 0 means unlimited |
| Microsoft support operations | Auditing of Microsoft support operations | Separate server audit with `OPERATOR_AUDIT = ON` and diagnostic category DevOps operations Audit Logs |

```bash
az sql server audit-policy update --resource-group RG-Sql --name sql-contoso \
  --state Enabled --blob-storage-target-state Enabled \
  --storage-account staudit01 --retention-days 180 \
  --log-analytics-target-state Enabled \
  --log-analytics-workspace-resource-id "<workspace resource ID>"
```

Sending audit logs to Log Analytics or Event Hubs creates a diagnostic setting named `SQLSecurityAuditEvents_...`; deleting it makes auditing fail silently. Audit logs written to storage are append blobs in `.xel` format. A storage account behind a firewall or virtual network must be **general-purpose v2**, and the server then authenticates with its managed identity.

For SQL Managed Instance:

```text
CREATE CREDENTIAL [https://staudit01.blob.core.windows.net/sqlmi-audit]
WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = '<SAS token without ?>';

CREATE SERVER AUDIT [Audit-Logins]
TO URL (PATH = 'https://staudit01.blob.core.windows.net/sqlmi-audit', RETENTION_DAYS = 180);

CREATE SERVER AUDIT SPECIFICATION [Spec-Logins]
FOR SERVER AUDIT [Audit-Logins]
ADD (SUCCESSFUL_LOGIN_GROUP), ADD (FAILED_LOGIN_GROUP)
WITH (STATE = ON);

ALTER SERVER AUDIT [Audit-Logins] WITH (STATE = ON);
```

To send Managed Instance audit events to Log Analytics or Event Hubs instead, add a diagnostic setting with the category **SQLSecurityAuditEvents**, then create the audit with `TO EXTERNAL_MONITOR`.

> **Exam trap.** Enabling auditing on both the server and a database doesn't replace one with the other: both run and you get two audit trails. Use the server policy for "all databases, including future ones", and a database policy only for a different destination or event set.

<!-- section: defender-for-databases | objectives: 2.2.3 -->
## Configuring Defender for Databases

In **Defender for Cloud > Environment settings > subscription > Defender plans**, the **Databases** plan groups four plans, each priced separately. Turning Databases **On** enables all four; **Select types** lets you choose.

| Plan | Protects | Notes |
| --- | --- | --- |
| Defender for Azure SQL Databases | Azure SQL Database (single databases, elastic pools), SQL Managed Instance, Azure Synapse dedicated SQL pools | Vulnerability assessment and Advanced Threat Protection |
| Defender for SQL servers on machines | SQL Server on Azure VMs and SQL Server enabled by Azure Arc | Non-Azure machines must be Azure Arc-enabled |
| Defender for open-source relational databases | Azure Database for PostgreSQL and MySQL flexible servers; Amazon RDS (PostgreSQL, MySQL, MariaDB, Aurora) | Not supported on Azure Arc-enabled machines |
| Defender for Azure Cosmos DB | Azure Cosmos DB for **NoSQL** only | Doesn't read the account data; no performance impact |

```bash
az security pricing create --name SqlServers --tier Standard
az security pricing create --name OpenSourceRelationalDatabases --tier Standard
```

When enabled at the subscription, all supported resources, existing and future, are protected. Defender for Azure SQL can also be enabled on a single logical server or managed instance from its **Microsoft Defender for Cloud** page.

**Advanced Threat Protection** raises alerts for potential SQL injection, anomalous access and query patterns (for example a brute force attack) and suspicious activity (a user connecting from a machine that talked to a crypto-mining command-and-control server). Alerts appear in Defender for Cloud with mitigation steps and can be investigated in Microsoft Sentinel.

**SQL vulnerability assessment** scans for misconfigurations, excessive permissions and unprotected sensitive data, with remediation scripts.

| | Express configuration (recommended) | Classic configuration |
| --- | --- | --- |
| Scan results storage | Managed by Defender for Cloud, no storage account | Your Azure Storage account |
| Recurring scans | Always active | Can be turned on or off |
| Baselines | Batch or single rule; apply without rescanning | Single rule; apply after a rescan |
| Change settings | SQL Security Manager or Security Admin | SQL Security Manager **and** Storage Blob Data Reader **and** Owner of the storage account |
| View results in recommendations | Security Admin or Security Reader | Security Admin or Security Reader |

> **Exam trap.** Defender for Azure Cosmos DB covers only the NoSQL API: a Cosmos DB for MongoDB or Cassandra account gets no alerts from it. Likewise, PostgreSQL or MySQL running on an Azure Arc-enabled server isn't covered by the open-source relational databases plan.

<!-- section: key-points -->
## Key points

- Public network access Disable leaves only private endpoints; the "Allow Azure services" rule admits every Azure customer.
- Database-level IP rules are T-SQL only and checked before server-level rules; virtual network rules need the `Microsoft.Sql` service endpoint.
- Microsoft Entra-only authentication needs an Entra admin first; SQL Security Manager can toggle it, SQL Server Contributor can't.
- Customer-managed TDE: soft delete and purge protection, RSA key, managed identity with Key Vault Crypto Service Encryption User; losing the key makes databases inaccessible.
- Server auditing covers all databases; Managed Instance auditing is T-SQL `CREATE SERVER AUDIT` to URL or `EXTERNAL_MONITOR`.
- Defender for Databases = four plans; vulnerability assessment express configuration needs no storage account.
