Every connection to an Azure SQL resource passes two checks: authentication (who are you, through SQL authentication, Windows authentication or Microsoft Entra ID) and authorization (what can you do, through server and database principals, roles and permissions). Exam questions describe an identity, an offering and a constraint (least privilege, no passwords, minimal administrative effort) and ask which principal to create, where, and with which T-SQL statement.

<!-- section: entra-authentication | objectives: 2.1.1 -->
## Microsoft Entra authentication

Microsoft Entra authentication starts with a **Microsoft Entra admin** on the logical server (Azure SQL Database) or on the managed instance. Without it, no Microsoft Entra identity can connect.

| Fact | Detail |
| --- | --- |
| Number of admins | **One** per server or instance |
| Admin type | User, group, service principal or managed identity |
| Group as admin | Every member of the group is admin |
| Effect in databases | Mapped to `dbo` (member of `db_owner`) in every user database |
| Removing the admin | Disables **all** Microsoft Entra connections, even for users who have database permissions |
| Portal | Server or managed instance > Settings > **Microsoft Entra ID** > **Set admin** > Save |

```bash
az sql server ad-admin create --resource-group RG1 --server-name sql-contoso \
  --display-name "SQL Admins" --object-id 00000000-0000-0000-0000-000000000000

az sql mi ad-admin create --resource-group RG1 --managed-instance mi-contoso \
  --display-name "SQL Admins" --object-id 00000000-0000-0000-0000-000000000000
```

Authentication methods offered by drivers and tools:

| Method | Use it for |
| --- | --- |
| Microsoft Entra MFA (Universal with MFA, interactive) | Administrators and users who must pass multifactor authentication |
| Microsoft Entra Password | Cloud identities with a password stored in Microsoft Entra ID (no MFA) |
| Microsoft Entra Integrated | Domain-joined clients with hybrid identities federated with AD DS: single sign-on |
| Managed identity (system-assigned or user-assigned) | Azure-hosted applications: token based, **no secret to store**, the recommended choice |
| Service principal with a client secret | Applications outside Azure; not recommended because the secret is a password |

**Microsoft Entra-only authentication** disables SQL authentication (and Windows authentication on a managed instance) for the whole server or instance. Existing SQL logins aren't deleted; they just can't connect. A Microsoft Entra admin must be set first, and it can't be removed while the feature is on.

```bash
az sql server ad-only-auth enable --resource-group RG1 --name sql-contoso
az sql mi ad-only-auth enable --resource-group RG1 --name mi-contoso
```

The **SQL Security Manager** role (or Owner, Contributor) can enable it; SQL Server Contributor and SQL Managed Instance Contributor can't. Azure Policy can force new servers to be created with Microsoft Entra-only authentication.

**SQL Server 2022 and later** also accepts Microsoft Entra authentication, on Windows and Linux:

| Where SQL Server runs | Prerequisite |
| --- | --- |
| On-premises or other clouds | Register SQL Server and its host with **Azure Arc** (Azure Connected Machine agent and the Azure extension for SQL Server) |
| Azure virtual machine (Windows) | Register with the **SQL IaaS Agent extension**, not Azure Arc, then enable it in Security Configuration (see next section) |

> **Exam trap.** Microsoft Entra authentication doesn't integrate with Azure RBAC for data access. SQL DB Contributor or SQL Server Contributor on the resource lets someone manage the database, not read it: database access always needs a database principal.

<!-- section: vm-mi-authentication | objectives: 2.1.2 -->
## Authentication on SQL Server VMs and SQL Managed Instance

The two offerings that keep a full SQL Server instance have different options:

| Method | SQL Server on Azure VM | Azure SQL Managed Instance |
| --- | --- | --- |
| SQL authentication | Yes, if the instance runs in **mixed mode** | Yes (SQL admin created at deployment) |
| Windows authentication with AD DS | Yes, when the VM is joined to an AD DS domain | No domain join |
| Windows authentication for Microsoft Entra principals | No | Yes, through **Microsoft Entra Kerberos** |
| Microsoft Entra authentication | SQL Server 2022 or later, through the SQL IaaS Agent extension | Yes, Microsoft Entra admin plus logins |

**SQL Server on an Azure VM.** Windows authentication is always enabled. In the portal, the **SQL Server settings** tab of the virtual machine creation enables SQL authentication with a login name and password: this sets mixed mode. On an existing instance, change the server authentication mode in SSMS (Server properties > Security) and **restart the SQL Server service**.

To enable Microsoft Entra authentication on a SQL Server VM:

1. Run SQL Server 2022 or later on Windows, and register the VM with the SQL IaaS Agent extension.
2. Give the VM a system-assigned or user-assigned **managed identity** in the same tenant.
3. Grant that identity the **Directory Readers** Microsoft Entra role, or the Microsoft Graph application permissions `User.Read.All`, `GroupMember.Read.All` and `Application.Read.All`.
4. Allow outbound ports 80 and 443 to Microsoft Entra ID (NSG service tag `AzureActiveDirectory`).
5. In the portal: SQL virtual machine > Security > **Security Configuration** > Microsoft Entra authentication > Enable, and select the identity.
6. Create logins with `CREATE LOGIN ... FROM EXTERNAL PROVIDER`.

Once enabled, it **can't be disabled**. Failover cluster instances aren't supported.

**SQL Managed Instance.** The instance's managed identity needs **Directory Readers** (or equivalent Graph permissions) for Microsoft Entra logins and groups to work; a banner on the Microsoft Entra ID page lets a Privileged Role Administrator grant it. **Windows authentication for Microsoft Entra principals** uses Microsoft Entra Kerberos: hybrid identities on domain-joined, Microsoft Entra joined or hybrid joined clients connect with Windows authentication, without Microsoft Entra Domain Services or new on-premises infrastructure. It is the answer for a lift and shift of a legacy application that can't change its authentication code.

> **Exam trap.** Managed Instance can't join an AD DS domain. "Keep Windows authentication for an application moved to SQL Managed Instance" means Windows authentication for Microsoft Entra principals (Kerberos), not a domain join.

<!-- section: security-principals | objectives: 2.1.3 -->
## Security principals

Principals exist at two levels:

| Level | Principal | Created with | Stored in |
| --- | --- | --- | --- |
| Server | SQL login, Windows login (VM), Microsoft Entra login | `CREATE LOGIN` | `master` |
| Database | User mapped to a login | `CREATE USER ... FROM LOGIN` | The user database |
| Database | Contained user (SQL password or Microsoft Entra identity) | `CREATE USER ... WITH PASSWORD` or `FROM EXTERNAL PROVIDER` | The user database only |
| Database | Database role, application role | `CREATE ROLE`, `CREATE APPLICATION ROLE` | The user database |

Login or contained user:

| Need | Choose |
| --- | --- |
| The database moves between servers or is geo-replicated without recreating principals | Contained user: authentication data travels with the database |
| One identity reaches many databases with one password | Login in `master` plus a user in each database |
| Server-level permissions (create databases, read server state) | Login, added to a server role |

> **Exam trap.** With geo-replication or failover groups, a login must be created on the secondary server **with the same SID**, otherwise the users in the replicated database are orphaned after failover. Contained users avoid the problem.

Server-level roles differ by offering:

| Offering | Server roles |
| --- | --- |
| SQL Server (VM) and SQL Managed Instance | Classic fixed server roles: `sysadmin`, `securityadmin`, `serveradmin`, `dbcreator`, `processadmin`... |
| Azure SQL Database | `##MS_DatabaseConnector##`, `##MS_DatabaseManager##`, `##MS_DefinitionReader##`, `##MS_LoginManager##`, `##MS_SecurityDefinitionReader##`, `##MS_ServerStateManager##`, `##MS_ServerStateReader##` |
| Azure SQL Database, `master` only | Database roles `dbmanager` (create databases) and `loginmanager` (create logins) |

In Azure SQL Database there is no `sysadmin`: the server admin and the Microsoft Entra admin are the only full administrators, and only they can add logins to server roles. `##MS_DatabaseManager##` creates databases; the creator becomes `dbo` of that database only.

The nine fixed database roles: `db_owner`, `db_securityadmin`, `db_accessadmin`, `db_backupoperator`, `db_ddladmin`, `db_datawriter`, `db_datareader`, `db_denydatawriter`, `db_denydatareader`.

<!-- section: entra-users | objectives: 2.1.4 -->
## Creating users from Microsoft Entra identities

```text
-- Contained users, run in the user database
CREATE USER [adrian@contoso.com] FROM EXTERNAL PROVIDER;   -- user: UPN
CREATE USER [SQL Readers] FROM EXTERNAL PROVIDER;          -- group: display name
CREATE USER [app-orders] FROM EXTERNAL PROVIDER;           -- managed identity or app: display name
CREATE USER [alice@fabrikam.com] FROM EXTERNAL PROVIDER;    -- guest of the tenant

-- Server principal, run in master (Azure SQL Database) or on the instance
CREATE LOGIN [SQL Operators] FROM EXTERNAL PROVIDER;
CREATE USER [SQL Operators] FROM LOGIN [SQL Operators];    -- in each database
```

Rules to remember:

- Only a **Microsoft Entra** principal can run these statements: the SQL server admin and SQL logins can't create Microsoft Entra users or logins, whatever their permissions.
- The first Microsoft Entra principals are created by the Microsoft Entra admin. Creating a user needs `ALTER ANY USER`; creating a login needs the Microsoft Entra admin or `loginmanager` / `##MS_LoginManager##`.
- The server resolves names through Microsoft Graph: in Azure SQL Database the server identity can hold `User.Read.All`, `GroupMember.Read.All` and `Application.Read.All`; SQL Managed Instance needs Directory Readers on its identity.
- A new user receives only `CONNECT`. Grant permissions to roles, and add groups to roles.
- Members of a group have no implicit user: they have no default schema. Create the group user with `WITH DEFAULT_SCHEMA = dbo` if members create objects.
- `ALTER LOGIN [name] DISABLE` blocks a Microsoft Entra login and every user created from it, but not contained users, and it isn't supported for groups.

> **Exam tip.** "The application runs in Azure App Service and must not store credentials" means: enable a managed identity on the app, then `CREATE USER [app name] FROM EXTERNAL PROVIDER` and grant a role. Neither a SQL login nor a service principal secret.

<!-- section: graphical-tools | objectives: 2.1.5 -->
## Permissions with graphical tools

Database and object permissions live inside the engine, so the graphical tool is **SQL Server Management Studio (SSMS)**, not the Azure portal, whose Access control (IAM) assigns Azure roles on the resource.

| Task in SSMS | Path |
| --- | --- |
| Create a login | Server > Security > Logins > New Login |
| Create a database user | Database > Security > Users > New User (user type: with login, without login, Microsoft Entra...) |
| Add a user to a role | User Properties > **Membership** page, or Role Properties > Add |
| Grant permissions on the database | Database Properties > **Permissions** page: select the principal, then Grant / With Grant / Deny |
| Grant permissions on an object | Table or procedure Properties > **Permissions** page, or User Properties > **Securables** page > Search |
| Column permissions | On the object's Permissions page, select Select, then **Column Permissions** |

Every dialog has a **Script** button that produces the equivalent T-SQL.

<!-- section: least-privilege | objectives: 2.1.6 -->
## Least privilege for all securables

Securables form a hierarchy: **server > database > schema > object** (table, view, procedure, function). A permission granted at one level applies to everything below it: `GRANT SELECT ON SCHEMA::Sales` covers every current and future table of the schema.

| Requirement | Least-privilege answer |
| --- | --- |
| Read all tables of one database | `db_datareader`, or `SELECT` on the database |
| Read only the tables of one schema | `GRANT SELECT ON SCHEMA::Sales` |
| Change data only through stored procedures | `GRANT EXECUTE` on the procedures (or the schema), no table permission: **ownership chaining** lets the procedure reach tables of the same owner |
| Hide a few columns | Column-level `GRANT SELECT (col1, col2)` or a view |
| Manage users and roles | `db_securityadmin` and `db_accessadmin`, not `db_owner` |
| Read the DMVs of one database | `VIEW DATABASE STATE` (or `VIEW DATABASE PERFORMANCE STATE`) |
| Read DMVs across a logical server | `##MS_ServerStateReader##` |
| Connect to every database for monitoring without creating users | `##MS_DatabaseConnector##` |
| Manage the Azure resource, not the data | Azure role SQL DB Contributor (databases), SQL Server Contributor (servers), SQL Managed Instance Contributor |
| Manage auditing, TDE, firewall and security policies | Azure role **SQL Security Manager** |

Permission logic:

1. Permissions are **cumulative**: a user gets the union of its own grants, its roles and its groups.
2. **DENY wins** over GRANT at the same or a lower level, with one exception: a column-level GRANT overrides a table-level DENY.
3. `REVOKE` only removes a previous GRANT or DENY; it doesn't block access granted elsewhere.
4. Members of `sysadmin` and object owners can't be denied permissions; in Azure SQL Database the server admin and the Microsoft Entra admin map to `dbo`.

> **Exam trap.** Adding an application to `db_owner` "so that it works" is never the least-privilege answer. Create a custom role (`CREATE ROLE`), grant it exactly what is needed, and add the user to the role.

<!-- section: troubleshoot-access | objectives: 2.1.7 -->
## Troubleshooting authentication and authorization

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Error **18456** Login failed | Wrong password, disabled login, login or user missing | Check `sys.sql_logins.is_disabled`, `ALTER LOGIN ... ENABLE`, create the principal |
| 18456 for a **contained user** | The connection targets `master`, where the contained user doesn't exist | Set the database name in the connection string |
| Error **40615** Cannot connect | The client IP isn't allowed by the firewall | Add a server-level or database-level IP rule |
| Error **4060** Cannot open database | Wrong database name, or no user for the login in it | Create the user or correct the name |
| Error **229** permission denied on an object | Authenticated, but not authorized | Grant the permission to a role of the user; look for a DENY |
| Error **33134** on `CREATE USER ... FROM EXTERNAL PROVIDER` | Conditional Access blocks Microsoft Graph, or a service principal runs the statement | Review Conditional Access, run it as a user |
| Microsoft Entra users fail after failover | No Microsoft Entra admin on the secondary server or instance | Set a Microsoft Entra admin on both sides |
| A permission change is not seen | Permissions are cached per connection (server role changes take up to 5 minutes) | Reconnect, or run `DBCC FLUSHAUTHCACHE` |
| SQL logins fail everywhere on the server | Microsoft Entra-only authentication is enabled | Use Microsoft Entra identities, or disable the feature |

Useful checks:

```text
SELECT name, type_desc, authentication_type_desc FROM sys.database_principals;
SELECT * FROM sys.fn_my_permissions(NULL, 'DATABASE');
SELECT HAS_PERMS_BY_NAME('Sales.Orders', 'OBJECT', 'SELECT');
SELECT SERVERPROPERTY('IsExternalAuthenticationOnly');
```

<!-- section: tsql-access | objectives: 2.1.8 -->
## Managing access with T-SQL

```text
-- Azure SQL Database: login in master, user in the database
CREATE LOGIN app_login WITH PASSWORD = 'Str0ng!Passw0rd#2026';
CREATE USER app_user FROM LOGIN app_login;

-- Contained SQL user, run in the user database
CREATE USER report_user WITH PASSWORD = 'An0ther!Str0ng#Pass';

-- Custom role with least privilege
CREATE ROLE sales_reader;
GRANT SELECT ON SCHEMA::Sales TO sales_reader;
DENY SELECT ON Sales.Salaries TO sales_reader;
ALTER ROLE sales_reader ADD MEMBER report_user;

-- Procedures only
GRANT EXECUTE ON SCHEMA::Api TO app_user;

-- Remove access
REVOKE SELECT ON SCHEMA::Sales FROM sales_reader;
ALTER ROLE sales_reader DROP MEMBER report_user;

-- Server role in Azure SQL Database, run in master
ALTER SERVER ROLE ##MS_ServerStateReader## ADD MEMBER monitor_login;

-- Server role in SQL Managed Instance or SQL Server
ALTER SERVER ROLE dbcreator ADD MEMBER [deploy@contoso.com];
```

| Statement | Effect |
| --- | --- |
| `GRANT ... WITH GRANT OPTION` | The grantee can grant the permission to others |
| `ALTER ROLE ... ADD MEMBER` | Database role membership (replaces `sp_addrolemember`) |
| `ALTER SERVER ROLE ... ADD MEMBER` | Server role membership (replaces `sp_addsrvrolemember`) |
| `ALTER USER ... WITH DEFAULT_SCHEMA = dbo` | Default schema for object names without a schema |
| `EXECUTE AS USER = '...'` | Impersonates a database user to test permissions; `REVERT` returns. Login impersonation isn't supported in Azure SQL Database |

In Azure SQL Database, `USE` doesn't switch databases: connect to `master` for logins and server roles, and to the user database for users and permissions.

<!-- section: key-points -->
## Key points

- One Microsoft Entra admin per server or instance; make it a group. Removing it stops all Microsoft Entra connections.
- Microsoft Entra-only authentication blocks SQL logins without deleting them; SQL Security Manager can switch it.
- Only Microsoft Entra principals create Microsoft Entra users: `CREATE USER [name] FROM EXTERNAL PROVIDER`.
- Managed identity is the passwordless answer for applications.
- Managed Instance: Directory Readers for its identity, Windows authentication through Microsoft Entra Kerberos, no domain join.
- SQL Server VM: mixed mode for SQL logins; Microsoft Entra authentication from SQL Server 2022 through the SQL IaaS Agent extension and a managed identity.
- Contained users travel with the database; logins need the same SID on every replica.
- Least privilege: custom roles, schema-level grants, EXECUTE on procedures; DENY wins except over a column GRANT.
- Azure RBAC manages the resource; database principals and permissions manage the data.
