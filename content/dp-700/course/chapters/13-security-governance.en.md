Fabric security works in layers. A **workspace role** or an **item permission** opens an item; then the engine that reads the data applies finer rules: T-SQL permissions, row-level and column-level security and dynamic data masking in the warehouse and the SQL analytics endpoint, and **OneLake security** roles for folders and tables read by every engine. Governance adds sensitivity labels, endorsement and audit logs. Questions give a user, a requirement and a "least privilege" constraint, and ask which control to use and where to define it.

<!-- section: workspace-roles | objectives: 1.3.1 -->
## Workspace roles

A workspace role applies to **every item** of the workspace, present and future. It can be given to users, security groups, Microsoft 365 groups, distribution lists and service principals; a user who gets several roles keeps the **highest** one.

| Capability | Admin | Member | Contributor | Viewer |
| --- | --- | --- | --- | --- |
| Delete the workspace, add or remove Admins, change workspace settings (Spark, Git connection) | Yes | No | No | No |
| Add members and lower roles | Yes | Yes | No | No |
| Share items and allow others to reshare | Yes | Yes | With Reshare only | With Reshare only |
| Create, edit and delete items; write lakehouse and warehouse data | Yes | Yes | Yes | No |
| Run notebooks, pipelines and Spark job definitions | Yes | Yes | Yes | No |
| Read data with Spark and OneLake APIs (ReadAll) | Yes | Yes | Yes | No |
| Query lakehouse and warehouse tables with T-SQL | Yes | Yes | Yes | Yes |
| View items and run history | Yes | Yes | Yes | Yes |

| Requirement | Role |
| --- | --- |
| Build and run notebooks and pipelines, no access management | Contributor |
| Also add colleagues to the workspace | Member |
| Change Spark settings, connect Git, assign the workspace to a domain | Admin |
| Read reports and query tables with T-SQL, change nothing | Viewer |

> **Exam trap.** Admin, Member and Contributor have write permission on every item, so they bypass the fine-grained controls of this chapter: SQL row-level security still applies to their T-SQL queries, but OneLake security roles and dynamic data masking don't restrict them. Give users who must be restricted the Viewer role or item permissions only.

<!-- section: item-permissions | objectives: 1.3.2 -->
## Item permissions

To give access to **one item** without a workspace role, **share** it (or use **Manage permissions**). The recipient always gets **Read**, plus the options you select. Sharing never grants write.

| Option in the sharing dialog | Permission | Allows |
| --- | --- | --- |
| (always) | Read | Open the item and connect to the SQL analytics endpoint; no table access by itself |
| Read all data using SQL | ReadData | Read every table and view with T-SQL, like `db_datareader` |
| Read all data using Apache Spark | ReadAll | Read the item's files in OneLake with Spark, OneLake APIs and the lakehouse explorer |
| Subscribe to events | SubscribeOneLakeEvents | Subscribe to the item's OneLake events in Real-Time hub; granted with ReadAll |
| Share | Reshare | Share the item onward |

Warehouses also have a **Monitor** permission (query DMVs) and an **Audit** permission (configure and query SQL audit logs; workspace Admins hold it by default). Revoking or granting can take **up to two hours** to propagate. A warehouse can't be shared directly with a service principal, and its recipients can't reshare it.

| Requirement | Grant |
| --- | --- |
| Analysts query all tables of DW1 with T-SQL | Share with ReadData |
| A data scientist reads lakehouse files in a notebook from another workspace | Share with ReadAll |
| A user reads only the `Sales` schema | Share with no option (Read), then `GRANT` in T-SQL |

> **Exam trap.** ReadData and ReadAll are independent. A user with ReadData only can query the SQL analytics endpoint but gets an access error when a notebook reads the lakehouse files.

<!-- section: granular-access | objectives: 1.3.3 -->
## Object, column and row-level security

In a warehouse or SQL analytics endpoint, fine-grained controls are T-SQL. You can't run `CREATE USER`: `GRANT` or `DENY` creates the database user, who still needs a workspace role or at least Read on the item to connect.

| Level | Feature | Behavior |
| --- | --- | --- |
| Object | `GRANT`, `DENY`, `REVOKE` on schemas, tables, views, procedures | `DENY` wins over `GRANT`; custom database roles group permissions |
| Column | `GRANT SELECT` on a column list | A `SELECT *` by the user fails instead of returning the other columns |
| Row | Predicate function plus security policy | Rows that don't match disappear silently from `SELECT`, `UPDATE` and `DELETE` |
| Folder, file, table for every engine | OneLake security roles | See the OneLake security section |

```text
-- Object level: one schema readable, one table hidden
GRANT SELECT ON SCHEMA::Sales TO [Analysts];
DENY SELECT ON OBJECT::Sales.Payroll TO [Analysts];

-- Column level
GRANT SELECT ON dbo.Customers (CustomerID, City, Segment) TO [Marketing];

-- Row level
CREATE FUNCTION Security.fn_region(@Region AS varchar(20))
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS allowed
    WHERE @Region = (SELECT Region FROM Security.UserRegion
                     WHERE UserName = USER_NAME());
GO
CREATE SECURITY POLICY Security.RegionFilter
ADD FILTER PREDICATE Security.fn_region(Region) ON dbo.FactSales
WITH (STATE = ON);
```

- One security policy can carry predicates for several tables; each table needs its own `ADD FILTER PREDICATE`.
- To change the function, drop or alter the policy first, because the function is schema-bound.
- Users check their own rights with `sys.fn_my_permissions`.

> **Exam trap.** T-SQL security protects only queries that go through the SQL engine. A user with ReadAll reads the same Delta files with Spark, without any of these rules. Protect every path: remove ReadAll, or use OneLake security.

<!-- section: onelake-security | objectives: 1.3.3, 1.3.8 -->
## OneLake security

**OneLake security** defines **data access roles** on an item: each role grants access to chosen **tables, schemas or folders** (folder-level and file-level security), optionally with **row-level** and **column-level** rules, to users or groups. The rules apply to every engine that reads through OneLake: Spark, the SQL analytics endpoint, the lakehouse explorer, OneLake APIs and the other Fabric engines.

| Item | Permissions of a role |
| --- | --- |
| Lakehouse | **Read**, **ReadWrite** (write data in the chosen tables or folders through Spark, OneLake file explorer or APIs, without creating or managing items) |
| Mirrored database, mirrored catalog, Azure Databricks mirrored catalog | Read |

Rules:

- Roles are created by users with **Write and Reshare**, in practice workspace Admins and Members.
- Access is **deny by default**: a restricted user who is in no role sees no data. Several roles combine as a union.
- The default role **DefaultReader** contains every user who has ReadAll. When you restrict a user with a custom role, **remove the user from DefaultReader** (or delete it, or remove ReadAll), otherwise the user keeps full access.
- The SQL analytics endpoint starts in **delegated identity mode** (queries use the item owner's identity and T-SQL permissions). To enforce OneLake security there, switch it once to **User's identity access mode**: **Security** tab > **Data access mode settings** > **Use OneLake security for tables**.
- Roles restrict Viewers and users with item permissions; Admins, Members and Contributors keep access through their Write permission.

| Requirement | Control |
| --- | --- |
| Interns read only the `Files/public` folder of Lakehouse1 with Spark | OneLake security role on that folder; remove interns from DefaultReader |
| Regional managers see their region's rows in Spark and in T-SQL | OneLake security role with a row rule, endpoint in user's identity mode |
| Hide a salary column from Power BI users and notebook users alike | OneLake security role with a column rule |
| Partner team writes into one folder without being Contributor | Role with ReadWrite on that folder |

> **Exam trap.** A OneLake security role on a lakehouse has no effect on T-SQL queries while the SQL analytics endpoint stays in delegated identity mode.

<!-- section: dynamic-data-masking | objectives: 1.3.4 -->
## Dynamic data masking

Dynamic data masking (DDM) hides sensitive values **in query results** of a warehouse or SQL analytics endpoint; the stored data doesn't change.

| Function | Result |
| --- | --- |
| `default()` | Full mask by type: `XXXX` for strings, 0 for numbers, `1900-01-01` for dates |
| `email()` | `aXXX@XXXX.com`: first letter and `.com` |
| `random(start, end)` | A random number in the range, for numeric columns |
| `partial(prefix, "padding", suffix)` | Keeps the first and last characters, pads the middle |

```text
CREATE TABLE dbo.Employee (
    EmployeeID int,
    LastName varchar(50) MASKED WITH (FUNCTION = 'default()') NULL,
    SSN char(11) MASKED WITH (FUNCTION = 'partial(0,"XXX-XX-",4)') NULL,
    Email varchar(256) NULL
);
ALTER TABLE dbo.Employee
ALTER COLUMN Email ADD MASKED WITH (FUNCTION = 'email()');

GRANT UNMASK ON dbo.Employee TO [HRManagers];
ALTER TABLE dbo.Employee ALTER COLUMN Email DROP MASKED;
```

| Operation | Permission |
| --- | --- |
| See masked data | `SELECT` |
| See real values | `UNMASK` on the table or column, or `CONTROL` on the database |
| Add, change or remove a mask | `ALTER ANY MASK` and `ALTER` on the table |

Workspace Admins, Members and Contributors have `CONTROL`, so they always see unmasked data.

> **Exam trap.** Masking isn't a security boundary. A user who can query the column can infer values with `WHERE Salary BETWEEN 99999 AND 100001`. When users must not access a column at all, use column-level security.

<!-- section: sensitivity-labels | objectives: 1.3.5 -->
## Sensitivity labels

Sensitivity labels come from **Microsoft Purview Information Protection**. A Fabric admin enables them in the tenant settings, and labels must be published to the users who apply them.

- Apply a label from the sensitivity indicator in the item header or in **Settings > Sensitivity**. You need a Power BI Pro or PPU license and edit permission on the item.
- A domain can set a **default label** for its workspaces (delegated setting).

| Behavior | Effect |
| --- | --- |
| Default label | Applied to new or edited items when the user chooses none |
| Mandatory label | Users must apply a label before saving (full support for Power BI items, partial for others) |
| Inheritance upon creation | A notebook, pipeline or shortcut created from a labeled lakehouse takes its label |
| Downstream inheritance | Labels flow to dependent items, Fabric to Fabric and Fabric to Power BI, not Power BI to Fabric |
| Export | Label and protection follow exports to Excel, PDF, PowerPoint and .pbix |

> **Exam trap.** A label classifies an item and protects exported files; it doesn't hide rows or tables from users who already have access inside Fabric.

<!-- section: endorsement | objectives: 1.3.6 -->
## Endorsement

Endorsement adds a badge that tells users which items to trust; endorsed items rank higher in the OneLake catalog. Set it in the item's **Settings > Endorsement**.

| Badge | Meaning | Who applies it |
| --- | --- | --- |
| Promoted | Ready to share and reuse, in the creator's opinion | Anyone with write permission on the item; no admin setup |
| Certified | Reviewed against the organization's standards | Users authorized by a Fabric admin, or by a domain admin when certification is delegated to the domain |
| Master data | The authoritative source for core data (customers, products) | Users authorized by a Fabric admin; only items that contain data, such as lakehouses and semantic models |

Users who aren't authorized see **Certified** unavailable and can request certification through the link set by the admin.

> **Exam tip.** "Mark the lakehouse as the official, reviewed source for the Finance domain" means Certified, with certification delegated to the domain. "Tell colleagues it's ready, without involving an admin" means Promoted.

<!-- section: audit-logs | objectives: 1.3.7 -->
## Audit logs

Three sources answer "who did what":

| Source | Records | Access |
| --- | --- | --- |
| **Fabric audit log** (Microsoft Purview unified audit log) | User and admin activities across Fabric and Power BI: creating, viewing, sharing, deleting items, changing settings | Purview portal (`purview.microsoft.com/audit`) or Exchange Online PowerShell `Search-UnifiedAuditLog`; role **Audit Logs** or **View-Only Audit Logs**. Admin portal > **Audit logs** links there |
| **Power BI activity log** | Power BI activities only | Fabric administrator, through the admin REST API `activityevents` or `Get-PowerBIActivityEvent`; one UTC day per request |
| **SQL audit logs** | Warehouse and SQL analytics endpoint events: logins, object access, schema and permission changes, batches | Off by default; enabled and queried by users with the **Audit** permission (workspace Admins have it) |

- Purview keeps Fabric audit records **180 days** for users without an E5 license; with E5, audit log retention policies can keep them up to one year. Records can take an hour or more to appear.
- SQL audit logs are `.XEL` files in the warehouse's **Audit** folder in OneLake. You choose **action groups** (Object Was Accessed, Schema Was Changed, User Failed To Log In...) and an optional predicate filter. On the SQL analytics endpoint, DML isn't captured.

```text
-- Let an auditor query the SQL audit logs without being workspace Admin
GRANT VIEW DATABASE SECURITY AUDIT TO [auditor@contoso.com];
-- The auditor then reads the events with sys.fn_get_audit_file_v2
```

```powershell
Get-PowerBIActivityEvent -StartDateTime '2026-11-02T00:00:00' -EndDateTime '2026-11-02T23:59:59' -ActivityType 'ViewReport'
```

| Requirement | Source |
| --- | --- |
| Find who deleted a lakehouse last week | Fabric audit log in Purview |
| Track failed logins and permission changes on DW1 | SQL audit logs |
| Record every file read in a lakehouse, including through shortcuts | OneLake diagnostics (workspace OneLake settings) |

> **Exam trap.** `GRANT VIEW DATABASE SECURITY AUDIT` lets a user query the SQL audit logs, but not change the audit configuration or open the `.XEL` files.

<!-- section: key-points -->
## Key points

- Roles: Admin manages the workspace, Member adds people, Contributor builds and writes data, Viewer reads with T-SQL only (no ReadAll).
- Sharing gives Read; add ReadData for T-SQL, ReadAll for Spark and OneLake; never write.
- T-SQL controls: `GRANT`/`DENY` for objects, column lists for CLS, predicate function plus security policy for RLS; they don't protect Spark access.
- OneLake security: roles on tables and folders with optional row and column rules, for every engine; remove restricted users from DefaultReader; switch the SQL endpoint to user's identity mode.
- DDM masks results for users without `UNMASK` or `CONTROL`; Admin, Member and Contributor see real values; not a security boundary.
- Labels classify and protect exports; endorsement: Promoted by writers, Certified and Master data by authorized reviewers.
- Audit: Purview for Fabric activities, SQL audit logs for warehouse events, OneLake diagnostics for data access.
