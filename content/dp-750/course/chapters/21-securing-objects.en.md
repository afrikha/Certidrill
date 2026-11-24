Securing Unity Catalog means granting the right privileges to the right principals, restricting tables, columns and rows, keeping credentials out of code, and letting Azure Databricks reach storage and services without a password. Exam questions give a principal, a `catalog.schema.table` path and a least-privilege constraint, then ask for the `GRANT` statement, the filter or mask to apply, or the identity to configure.

<!-- section: privileges | objectives: 2.1.1 -->
## Granting privileges to principals

A **principal** is a user (email address), a group, or a service principal (its **application ID**). Names with special characters such as `@` or `-` go in backticks. Grant to groups whenever possible: membership then drives access.

Privileges are **inherited** downward: a privilege granted on a catalog applies to all its current and future schemas and objects. Denials inherit the same way: ABAC policies can grant privileges, or deny some of them (DENY policies are Beta), on all child objects. Reading a table always needs three privileges:

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

| Privilege | Allows | Granted on |
| --- | --- | --- |
| `USE CATALOG`, `USE SCHEMA` | Interact with objects inside; no data access by itself | Catalog, schema |
| `SELECT` | Query a table, view or materialized view | Table, view, or a container |
| `MODIFY` | Insert, update, delete (also needs `SELECT`) | Table, or a container |
| `CREATE SCHEMA` / `CREATE TABLE` / `CREATE VOLUME` / `CREATE FUNCTION` / `CREATE MATERIALIZED VIEW` | Create child objects (`CREATE TABLE` also creates views) | Catalog or schema |
| `READ VOLUME` / `WRITE VOLUME` | Read / add, modify, delete files in a volume | Volume, or a container |
| `EXECUTE` | Call a function or load a model | Function, or a container |
| `REFRESH` | Refresh a materialized view | Materialized view |
| `BROWSE` | See metadata and request access without data access | Catalog |
| `APPLY TAG` | Add and edit tags | Any object |
| `MANAGE` | Grant and revoke, transfer ownership, rename, drop | Any object; inherited by children |
| `READ METADATA` | See all owner-visible metadata (permissions, row filters, column masks, ABAC policies) without modifying it or reading data; a child of `MANAGE` | Any object; on the metastore, inherited by every object |
| `ALL PRIVILEGES` | Every privilege on the object and children, except `MANAGE`, `READ METADATA`, `EXTERNAL USE SCHEMA` and `EXTERNAL USE LOCATION` | Any object |
| `READ FILES` / `WRITE FILES` / `CREATE EXTERNAL TABLE` / `CREATE MANAGED STORAGE` | Path-level access and table or storage creation | External location |

Who can grant on an object: its **owner**, the owner of its catalog or schema, a user with **`MANAGE`** on it, or a **metastore admin**. Every object has one owner, who holds all privileges on it; assign production ownership to groups. The owner of a parent object doesn't own its children, but can manage all new and existing child objects, which works like `MANAGE` (not shown by `SHOW GRANTS`). `MANAGE` doesn't grant data access by itself: a user with `MANAGE` can grant themselves `SELECT`. `REVOKE` succeeds even if the privilege was never granted. Workspace admins own the workspace catalog; all workspace users get `USE CATALOG` on it.

> **Exam trap.** Revoking `SELECT` on a table doesn't remove access inherited from a `SELECT` grant on the schema or catalog. Revoke at the level where it was granted.

> **Exam trap.** `ALL PRIVILEGES` doesn't include `MANAGE` (nor `READ METADATA`, `EXTERNAL USE SCHEMA` or `EXTERNAL USE LOCATION`): a principal with `ALL PRIVILEGES` can read and write but can't grant to others.

<!-- section: table-column-row-security | objectives: 2.1.2 -->
## Table-, column- and row-level security

| Requirement | Mechanism |
| --- | --- |
| Allow or deny a whole table | `GRANT` / `REVOKE SELECT` on the table |
| Hide some columns from everyone | A view that selects only the allowed columns; grant `SELECT` on the view, not on the table |
| Show a column's value only to some groups | Column mask (a SQL UDF attached to the column) |
| Show only some rows to each group | Row filter (a SQL UDF returning `BOOLEAN`) |
| A curated or transformed subset for a consumer | Dynamic view using `is_account_group_member()` |
| The same rule on many tables, driven by tags | ABAC policy (chapter "Govern Unity Catalog objects") |

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

Rules to know:

- A row filter function returns `BOOLEAN`; rows where it returns `FALSE` or `NULL` are filtered out. A mask function takes the column value as its first parameter and must return a type castable to the column type; other inputs come from `USING COLUMNS`. Each column has at most one mask.
- Applying them requires `EXECUTE` on the function, `USE SCHEMA` and `USE CATALOG`, and being the table owner or holding `MANAGE` (plus `SELECT` for masks).
- `is_account_group_member()` checks account-level group membership of the user running the query.
- Filters and masks can't be applied to a view, block time travel and clones on the table, and can't reference tables that also have filters or masks. Prefer simple `CASE` expressions over mapping tables for performance.
- Compute: DBR 12.2 LTS and above (older runtimes return no data); dedicated access mode needs DBR 15.4 LTS and above with serverless enabled for the workspace, because filtering runs on serverless compute. On dedicated compute, DBR 15.4 to 16.2 only read such tables; writes need DBR 16.3 and above with supported patterns such as `MERGE INTO`.
- Databricks recommends **ABAC policies** when the same filter or mask must apply consistently across many tables; table owners can't override them.

> **Exam trap.** Column masks change the values returned, not the column list; to remove a column from users' sight entirely, expose a view without it. A row filter is attached with `ALTER TABLE ... SET ROW FILTER`, never with `GRANT`.

<!-- section: key-vault-secrets | objectives: 2.1.3 -->
## Accessing Azure Key Vault secrets

Secrets are grouped in **secret scopes**. An **Azure Key Vault-backed** scope is a read-only interface to a key vault: you manage the secrets in Azure. A Databricks-backed scope is stored in an encrypted database managed by Azure Databricks.

Creating a Key Vault-backed scope:

1. The key vault must use the **Vault access policy** permission model: Azure RBAC isn't supported for Key Vault-backed scopes.
2. You need the Key Vault Contributor, Contributor or Owner role on the key vault.
3. Open `https://<databricks-instance>#secrets/createScope` (case-sensitive), enter the scope name, the **Manage Principal** (Creator, which needs the Premium plan, or All workspace users), the vault **DNS Name** and **Resource ID**. Azure Databricks receives the **Get** and **List** secret permissions through an access policy.
4. Check with `databricks secrets list-scopes`.

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

| Secret ACL | Read and list | Write | Modify permissions |
| --- | --- | --- | --- |
| READ | Yes | No | No |
| WRITE | Yes | Yes | No |
| MANAGE | Yes | Yes | Yes |

ACLs apply to a **whole scope**, and granting permissions on a scope requires the Premium plan: users granted a Key Vault-backed scope can read every secret of that vault. To separate secrets, use separate key vaults and scopes. Values read with `dbutils.secrets.get()` or referenced in Spark config are shown as `[REDACTED]` in output; redaction is best effort, so grant scopes only to those who need them. Key Vault-backed scopes are read-only from Azure Databricks: create and update their secrets in Azure.

Learn also documents **Unity Catalog secrets**: securables named `catalog.schema.secret`, available in every workspace attached to the metastore, with Unity Catalog privileges granted on the secret, schema or catalog. They are Azure Databricks-managed or backed by Azure Key Vault (Beta). Workspace secret scopes have no secret-level access control.

> **Exam trap.** "The key vault uses Azure RBAC and scope creation fails" is fixed by switching the vault to the access policy model, not by assigning Key Vault Secrets User.

<!-- section: service-principals | objectives: 2.1.4 -->
## Authenticating data access with service principals

A service principal is an API-only identity for automation: jobs, CI/CD, scripts. It receives Unity Catalog privileges, group memberships and workspace roles like a user.

| Type | Managed in | Authenticates with | Recommended for |
| --- | --- | --- | --- |
| Azure Databricks managed | Azure Databricks account | Databricks OAuth, personal access tokens | Databricks automation |
| Microsoft Entra ID managed | Microsoft Entra ID (an app registration) | Databricks OAuth, Microsoft Entra ID tokens | Accessing Azure Databricks and other Azure resources with the same identity |

- **Service principal user** role: lets a user run jobs as the service principal, so production jobs don't break when the owner leaves. The **service principal manager** role manages the principal's roles and doesn't include the user role.
- **OAuth machine-to-machine (M2M)**: generate an OAuth secret for the service principal (lifetime up to 730 days, up to five secrets, shown once; scopes are fixed when the secret is generated, and a secret unused for 90 days is deleted automatically). Access tokens last one hour and are renewed automatically by unified authentication.
- Production writes: Databricks recommends running jobs as service principals and reserving `MODIFY` on production tables for them.

```bash
export DATABRICKS_HOST=https://adb-1234567890123456.7.azuredatabricks.net
export DATABRICKS_CLIENT_ID=<service-principal-application-id>
export DATABRICKS_CLIENT_SECRET=<oauth-secret>
databricks bundle deploy -t prod
```

For storage, a Unity Catalog **storage credential** can hold a Microsoft Entra ID service principal or a managed identity; the managed identity is preferred. The legacy alternative sets OAuth properties per storage account, with the client secret read from a secret scope; the service principal needs **Storage Blob Data Contributor** on the account:

```text
service_credential = dbutils.secrets.get(scope="kv-finance", key="sp-client-secret")
spark.conf.set("fs.azure.account.auth.type.stcontosoraw.dfs.core.windows.net", "OAuth")
spark.conf.set("fs.azure.account.oauth.provider.type.stcontosoraw.dfs.core.windows.net", "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider")
spark.conf.set("fs.azure.account.oauth2.client.id.stcontosoraw.dfs.core.windows.net", "<application-id>")
spark.conf.set("fs.azure.account.oauth2.client.secret.stcontosoraw.dfs.core.windows.net", service_credential)
spark.conf.set("fs.azure.account.oauth2.client.endpoint.stcontosoraw.dfs.core.windows.net", "https://login.microsoftonline.com/<directory-id>/oauth2/token")
```

This legacy pattern isn't governed by Unity Catalog, and the Hive metastore client ignores session-level settings. Databricks recommends external locations and volumes instead; mounts and credential passthrough are deprecated.

> **Exam trap.** A user's personal access token in a production job is the wrong answer: use a service principal with OAuth M2M, and run the job as that service principal.

<!-- section: managed-identities | objectives: 2.1.5 -->
## Authenticating resource access with managed identities

The **Access Connector for Azure Databricks** is an Azure resource that connects managed identities to the Azure Databricks account. It deploys with a system-assigned identity by default and can also hold one or more user-assigned identities. Unity Catalog uses it to reach ADLS Gen2.

1. Create the access connector (Contributor or Owner on the resource group), in the same region as the storage account. Note its resource ID: `/subscriptions/<id>/resourceGroups/<rg>/providers/Microsoft.Databricks/accessConnectors/<name>`.
2. On the storage account (Owner or User Access Administrator), assign **Storage Blob Data Contributor** to the connector's identity, on the account or, with **Storage Blob Delegator** on the account, on one container only.
3. Create a **storage credential** that references the connector (and the user-assigned identity, if any).
4. Create an **external location** for the path, then grant privileges on it.

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

Creating an external location requires metastore admin or `CREATE EXTERNAL LOCATION` on the metastore, plus `CREATE EXTERNAL LOCATION` on the storage credential. Metastore admins hold `CREATE EXTERNAL LOCATION` and `CREATE STORAGE CREDENTIAL` on the metastore by default, and so do workspace admins of workspaces enabled for Unity Catalog automatically.

| Requirement | Answer |
| --- | --- |
| No secret to store or rotate | Managed identity |
| Storage account protected by a firewall or network rules | Managed identity (a service principal can't reach it through Unity Catalog) |
| Auto Loader file events | Add Storage Queue Data Contributor, plus Storage Account Contributor and EventGrid EventSubscription Contributor for automatic setup |
| The same identity must also call Azure Databricks APIs from outside | Microsoft Entra ID managed service principal |

> **Exam tip.** Managed identity is the default answer for Unity Catalog storage access on Azure. A service principal is chosen when the stem requires an identity outside Azure Databricks, such as a CI/CD pipeline.

<!-- section: key-points -->
## Key points

- Reading a table needs `USE CATALOG` + `USE SCHEMA` + `SELECT`; privileges inherit down; grant to groups; service principals by application ID.
- Owners, container owners, `MANAGE` holders and metastore admins can grant; `ALL PRIVILEGES` excludes `MANAGE`.
- Columns: views or masks; rows: row filters or dynamic views; many tables: ABAC.
- Key Vault-backed scopes need the vault access policy model, are read-only and scope-wide; read with `dbutils.secrets.get()` or `{{secrets/scope/key}}`.
- Automation runs as a service principal with OAuth M2M; production `MODIFY` belongs to service principals.
- Storage access: access connector managed identity, storage credential, external location, grants.
