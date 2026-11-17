Azure SQL protects data in three states: at rest (transparent data encryption, column encryption), in transit (TLS, firewall rules, private connectivity) and in use (Always Encrypted, with or without secure enclaves). Exam questions name what must be protected and from whom (a stolen backup, a database administrator, the internet) and expect the one feature that matches.

| Threat or requirement | Feature |
| --- | --- |
| Files, backups and logs are unreadable if stolen; no application change | TDE |
| Keep control of the encryption key, revoke access to the data | TDE with a customer-managed key in Azure Key Vault |
| Database administrators and cloud operators must never see plaintext values | Always Encrypted |
| Same, plus range queries, `LIKE` or in-place encryption | Always Encrypted with secure enclaves |
| Encrypt a few values with keys stored in the database, decrypted in T-SQL | Column-level encryption (`ENCRYPTBYKEY`) |
| Only some IP addresses may connect | Server-level or database-level IP firewall rules |
| Traffic from a subnet, server keeps its public endpoint | Virtual network service endpoint and virtual network rule |
| Private IP address, no public endpoint, access from on-premises over VPN or ExpressRoute | Private endpoint (Azure Private Link) |

<!-- section: tde | objectives: 2.2.1 -->
## Transparent data encryption

TDE encrypts the database files, the transaction log and the **backups** at the page level, in real time, without any application change. A symmetric **database encryption key (DEK)** encrypts the pages; the **TDE protector** encrypts the DEK.

| Point | Azure SQL Database | SQL Managed Instance | SQL Server on a VM |
| --- | --- | --- | --- |
| Default | On for new databases | On for new databases | Off: enable it yourself |
| Protector | Service-managed certificate or customer-managed key, set on the **server** (or per database for SQL Database) | Service-managed or customer-managed key, set on the instance | Certificate in `master`, or an asymmetric key through EKM (Azure Key Vault connector) |
| Turn on or off | Portal, PowerShell, CLI | T-SQL `ALTER DATABASE ... SET ENCRYPTION` | T-SQL |

Service-managed TDE uses a certificate unique to the server, rotated by Microsoft. **Customer-managed TDE (BYOK)** stores an RSA or RSA-HSM key (2,048 or 3,072 bits) in Azure Key Vault or Azure Key Vault Managed HSM:

1. The key vault must have **soft delete and purge protection** enabled, otherwise the setup fails.
2. The server or instance needs a system-assigned or user-assigned **managed identity** with **Key Vault Crypto Service Encryption User** (Azure RBAC model) or the get, wrapKey and unwrapKey key permissions (access policy model).
3. If the vault has a firewall, allow trusted Microsoft services or use a private endpoint.
4. Select the key as TDE protector; optionally enable **automatic key rotation** (off by default; the server picks up a new key version within 24 hours).

```bash
az sql server key create --resource-group RG1 --server sql-contoso \
  --kid https://kv-contoso.vault.azure.net/keys/tde-key/0123456789abcdef0123456789abcdef
az sql server tde-key set --resource-group RG1 --server sql-contoso \
  --server-key-type AzureKeyVault \
  --kid https://kv-contoso.vault.azure.net/keys/tde-key/0123456789abcdef0123456789abcdef
```

If the server loses access to the key (permission revoked, key deleted), the database becomes **Inaccessible** after about 30 minutes and refuses connections. Restored within 30 minutes, it heals automatically; later, it must be revalidated manually. Keep old key versions: old backups still need them. With geo-replication, both servers must reach the primary's key material before the link or failover group is created.

SQL Server on a VM, the classic procedure:

```text
USE master;
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'Str0ng!Master#Key';
CREATE CERTIFICATE TdeCert WITH SUBJECT = 'TDE certificate';
BACKUP CERTIFICATE TdeCert TO FILE = 'D:\Keys\TdeCert.cer'
  WITH PRIVATE KEY (FILE = 'D:\Keys\TdeCert.pvk',
  ENCRYPTION BY PASSWORD = 'Str0ng!Backup#Key');

USE Sales;
CREATE DATABASE ENCRYPTION KEY WITH ALGORITHM = AES_256
  ENCRYPTION BY SERVER CERTIFICATE TdeCert;
ALTER DATABASE Sales SET ENCRYPTION ON;

SELECT DB_NAME(database_id), encryption_state_desc
FROM sys.dm_database_encryption_keys;
```

> **Exam trap.** A TDE-encrypted backup restores on another SQL Server only after the **certificate** (with its private key) is created on the target. Same idea in SQL Managed Instance: a manual `COPY_ONLY` backup of a database protected by **service-managed** TDE isn't supported, because nobody can export that certificate. Switch to a customer-managed key, or use point-in-time restore to move the database.

Also remember: `master` isn't encrypted by TDE, `tempdb` is encrypted automatically, and a BACPAC export isn't encrypted. TDE does nothing against a user who can query the database: it protects files, not query results.

<!-- section: object-encryption | objectives: 2.2.2 -->
## Object-level encryption

Column-level (cell-level) encryption encrypts individual values with keys that the database stores in a hierarchy: **database master key > certificate > symmetric key**. It works in SQL Server, Azure SQL Database and SQL Managed Instance. The column must be `varbinary`, and the application decrypts in T-SQL after opening the key.

```text
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'Str0ng!Db#Master';
CREATE CERTIFICATE CardCert WITH SUBJECT = 'Card numbers';
CREATE SYMMETRIC KEY CardKey WITH ALGORITHM = AES_256
  ENCRYPTION BY CERTIFICATE CardCert;

ALTER TABLE Sales.Payment ADD CardNumberEnc varbinary(160);

OPEN SYMMETRIC KEY CardKey DECRYPTION BY CERTIFICATE CardCert;
UPDATE Sales.Payment
SET CardNumberEnc = ENCRYPTBYKEY(KEY_GUID('CardKey'), CardNumber);
SELECT CONVERT(nvarchar(25), DECRYPTBYKEY(CardNumberEnc)) AS CardNumber
FROM Sales.Payment;
CLOSE SYMMETRIC KEY CardKey;
```

| | Column-level encryption | Always Encrypted |
| --- | --- | --- |
| Where encryption happens | In the database engine | In the client driver |
| Keys | Inside the database | Column master key outside the database (Key Vault, certificate store) |
| Protects against a DBA | No: anyone with `CONTROL` on the keys decrypts | Yes |
| Application change | Queries must call `ENCRYPTBYKEY` / `DECRYPTBYKEY` | Connection string setting, parameterized queries |

The functions `ENCRYPTBYPASSPHRASE`, `ENCRYPTBYCERT` and `ENCRYPTBYASYMKEY` exist too; symmetric keys are preferred for performance. Back up the database master key and certificates.

<!-- section: firewall-rules | objectives: 2.2.3 -->
## Server-level and database-level firewall rules

Azure SQL Database refuses all connections to its public endpoint until a firewall rule allows the client IP address.

| | Server-level rule | Database-level rule |
| --- | --- | --- |
| Scope | Every database of the logical server | One database (`master` included) |
| Stored in | `master` | The database itself: it travels with geo-replication and copies |
| Managed with | Portal, PowerShell, CLI, REST, T-SQL | **T-SQL only** |
| Limit | 256 per server | 256 per database |
| T-SQL | `sp_set_firewall_rule`, `sys.firewall_rules` | `sp_set_database_firewall_rule`, `sys.database_firewall_rules` |

Evaluation: the **database-level** rules of the requested database are checked first; if none matches, the server-level rules; if none matches, the connection fails with error 40615. The first server-level setting must exist before database-level rules can be created.

```text
-- In master: server-level rule
EXECUTE sp_set_firewall_rule @name = N'HQ',
  @start_ip_address = '203.0.113.0', @end_ip_address = '203.0.113.255';

-- In the user database: database-level rule
EXECUTE sp_set_database_firewall_rule @name = N'ReportingApp',
  @start_ip_address = '198.51.100.20', @end_ip_address = '198.51.100.20';
```

```bash
az sql server firewall-rule create --resource-group RG1 --server sql-contoso \
  --name HQ --start-ip-address 203.0.113.0 --end-ip-address 203.0.113.255
```

**Allow Azure services and resources to access this server** creates the rule `AllowAllWindowsAzureIps` (0.0.0.0 to 0.0.0.0). It allows every Azure service, **including other customers' subscriptions**: prefer service endpoints or private endpoints. Rule changes can take up to five minutes to apply (`DBCC FLUSHAUTHCACHE` forces a refresh). Managing server-level rules needs SQL Server Contributor, SQL Security Manager or Owner.

> **Exam trap.** "Each database must have its own allowed IP list, and the list must follow the database after a geo-replication failover" means **database-level** rules, created with T-SQL. The portal can't create them.

SQL Managed Instance has no IP firewall rules: it lives in a subnet, and access is filtered by the **network security group** of that subnet. Clients also need outbound TCP 1433.

<!-- section: always-encrypted | objectives: 2.2.4 -->
## Always Encrypted

Always Encrypted encrypts sensitive columns **in the client driver**: the database engine stores and returns ciphertext and never sees the keys in plaintext. It separates the people who own the data from the people who manage the database.

| Key | Role | Where it lives |
| --- | --- | --- |
| Column master key (CMK) | Protects the column encryption keys | Outside the database: Azure Key Vault, Windows certificate store, HSM. The database stores only its metadata |
| Column encryption key (CEK) | Encrypts the column data | Stored encrypted in the database |

| Encryption type | Behavior | Queries allowed |
| --- | --- | --- |
| Deterministic | Same plaintext, same ciphertext | Equality (`=`), `IN`, joins on equality, `GROUP BY`, `DISTINCT`, indexes. Leaks patterns on columns with few values |
| Randomized | Same plaintext, different ciphertext | None on the column without an enclave; most secure |

Implementation:

1. In SSMS, right-click the table or database > **Encrypt Columns** (Always Encrypted wizard): choose columns, encryption type, CEK and CMK store. The wizard can run immediately or generate a PowerShell script.
2. With **role separation**, a security administrator creates the keys with the SqlServer PowerShell module (`New-SqlAzureKeyVaultColumnMasterKeySettings`, `New-SqlColumnMasterKey`, `New-SqlColumnEncryptionKey`) without access to the database, and the DBA gets only the metadata.
3. T-SQL can't create keys or encrypt data; it only declares metadata and the column definitions.
4. Applications add `Column Encryption Setting=Enabled` to the connection string, use **parameterized** queries, and need access to the CMK (for example Key Vault permissions get, unwrapKey and verify).

```text
CREATE TABLE HR.Employee (
  EmployeeID int IDENTITY PRIMARY KEY,
  NationalID char(11) COLLATE Latin1_General_BIN2
    ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK1,
      ENCRYPTION_TYPE = DETERMINISTIC,
      ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'),
  Salary money
    ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK1,
      ENCRYPTION_TYPE = RANDOMIZED,
      ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256')
);
```

Limits to know: string columns with deterministic encryption need a `_BIN2` collation; no comparison with literals (use parameters); not supported for `xml`, `rowversion`, `sql_variant`, spatial types or identity columns; no default or check constraints, full-text indexes or replication on encrypted columns. Always On availability groups are supported. In Azure SQL Database, grant `VIEW ANY COLUMN MASTER KEY DEFINITION` and `VIEW ANY COLUMN ENCRYPTION KEY DEFINITION` explicitly to users who query encrypted columns.

> **Exam trap.** "The database administrators must not be able to read credit card numbers" eliminates TDE, dynamic data masking and column-level encryption: only Always Encrypted keeps the keys away from the server, provided the DBAs have no access to the column master key.

<!-- section: secure-enclaves | objectives: 2.2.5 -->
## Always Encrypted with secure enclaves

A **secure enclave** is a protected memory region inside the database engine process. The client driver sends the column encryption key to the enclave over a secure channel, so the engine can compute on plaintext **inside the enclave** without exposing it.

What enclaves add, with **randomized** encryption and enclave-enabled keys:

- Comparison operators, `BETWEEN`, `IN`, `LIKE`, `DISTINCT`, joins, `ORDER BY`, `GROUP BY` (Azure SQL Database and SQL Server 2022; SQL Server 2019 supports fewer).
- **In-place encryption**: encrypt, re-encrypt, rotate a key or decrypt an existing column with `ALTER TABLE ... ALTER COLUMN`, without moving data to the client.
- Nonclustered indexes on randomized enclave-enabled columns.

| Platform | Enclave | Attestation |
| --- | --- | --- |
| SQL Server 2019 and later on Windows | VBS | Host Guardian Service, or none |
| Azure SQL Database, any vCore or DTU configuration | **VBS** (no special hardware) | None (not supported) |
| Azure SQL Database, vCore DC-series hardware | Intel SGX | Microsoft Azure Attestation, required |

SQL Managed Instance isn't in the list of platforms. Intel SGX enclaves reach end of support on **October 31, 2027**: after that date, Azure moves the remaining DC-series databases to standard-series and enables VBS enclaves. VBS enclaves protect against attacks inside the VM, not against privileged host accounts.

Setup in Azure SQL Database with VBS:

1. Enable the enclave: database > Security > **Data Encryption** > Always Encrypted tab > **Enable secure enclaves** = ON (database property `preferredEnclaveType` = `VBS`).
2. Create an **enclave-enabled** column master key: keep **Allow enclave computations** selected (metadata property `ENCLAVE_COMPUTATIONS`), then a CEK protected by it.
3. Connect with Always Encrypted and the attestation protocol: in SSMS, Always Encrypted tab > Enable Always Encrypted > Enable secure enclaves > Protocol **None**.
4. Encrypt in place, then query with parameters.

```text
-- Connection string for VBS enclaves without attestation
Server=tcp:sql-contoso.database.windows.net;Database=HR;Column Encryption Setting=Enabled;Attestation Protocol=None;

-- In-place encryption of an existing column (enclave-enabled CEK1)
ALTER TABLE HR.Employee ALTER COLUMN LastName nvarchar(50)
  COLLATE Latin1_General_BIN2
  ENCRYPTED WITH (COLUMN_ENCRYPTION_KEY = CEK1,
    ENCRYPTION_TYPE = RANDOMIZED,
    ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256');
```

Confidential queries need database compatibility level 160 or higher, and character columns need a `_BIN2` or UTF-8 collation. Every replica (availability group secondaries, geo-secondaries) must support enclaves.

> **Exam tip.** "Encrypted column + range search or pattern matching" or "encrypt an existing large column without exporting it" points to secure enclaves. "Only equality searches" is satisfied by deterministic Always Encrypted without an enclave.

<!-- section: private-connectivity | objectives: 2.2.6 -->
## Private links and service endpoints

| | Virtual network service endpoint | Private endpoint (Azure Private Link) |
| --- | --- | --- |
| How | Subnet tagged with `Microsoft.Sql`, plus a **virtual network rule** on the server | Network interface with a **private IP** of your virtual network, mapped to the server |
| Server address | Still the public endpoint; traffic comes from the subnet over the Azure backbone | Private IP, resolved by the `privatelink.database.windows.net` private DNS zone |
| Scope | Server-level only (all databases), subnets in the same region | One server (Azure SQL Database) or one managed instance |
| On-premises clients | Not covered: they still need IP firewall rules | Yes, over site-to-site VPN or ExpressRoute private peering |
| Public access | Remains enabled | Can be disabled: **Deny public network access** |
| Data exfiltration protection | No: the subnet can reach any server in the region | Yes: the endpoint maps to one specific resource |

```bash
az sql server vnet-rule create --resource-group RG1 --server sql-contoso \
  --name AppSubnet --vnet-name vnet-app --subnet snet-app

az network private-endpoint create --resource-group RG1 --name pe-sql-contoso \
  --vnet-name vnet-app --subnet snet-data \
  --private-connection-resource-id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.Sql/servers/sql-contoso \
  --group-id sqlServer --connection-name sql-contoso-link
```

Private endpoint rules:

- Clients keep using `sql-contoso.database.windows.net`: the name resolves to the private IP through DNS. Connecting to the IP or to the `privatelink` name directly fails.
- A private endpoint doesn't block public access by itself: select **Deny public network access**. Once denied, public connections fail with error 47073, and firewall rules can't be edited (error 42101).
- The SQL admin approves or rejects pending connections under Security > Networking > **Private access**.
- With the **Redirect** connection policy (recommended for latency), clients need ports 1433 to 65535; Proxy uses 1433 only.

Other network settings of the logical server (Security > Networking > Connectivity): **minimum TLS version** (1.2 is the lowest still available; older clients fail with error 47072) and the connection policy.

SQL Managed Instance endpoints:

| Endpoint | Address | Port | Use |
| --- | --- | --- | --- |
| VNet-local (default) | `mi-contoso.0123abcd.database.windows.net`, private IP of the subnet | 1433 | Applications in the virtual network or peered networks |
| Public endpoint | `mi-contoso.public.0123abcd.database.windows.net` | **3342** | Clients on the internet; restrict with an NSG rule; client traffic only |
| Private endpoint | Fixed IP in another virtual network | 1433 | Client traffic from another virtual network; several endpoints per instance |

> **Exam trap.** A service endpoint can't give on-premises users private access, and it leaves the public endpoint open. "On-premises over ExpressRoute, no public internet exposure" is a private endpoint with public network access denied.

<!-- section: key-points -->
## Key points

- TDE protects files and backups, not query results; on by default in Azure SQL, off on SQL Server VMs.
- Customer-managed TDE: Key Vault with soft delete and purge protection, managed identity with wrapKey and unwrapKey; losing the key makes the database inaccessible.
- A TDE backup restores elsewhere only with the certificate; no `COPY_ONLY` backup with service-managed TDE on Managed Instance.
- Column-level encryption keeps keys in the database; Always Encrypted keeps them away from the server.
- Deterministic allows equality; randomized allows nothing without an enclave.
- Enclaves: VBS in Azure SQL Database without attestation; Intel SGX (DC-series) ends on October 31, 2027.
- Database-level firewall rules: T-SQL only, checked first, travel with the database. Managed Instance uses NSGs.
- Service endpoint = subnet to public endpoint; private endpoint = private IP, on-premises access, exfiltration protection.
