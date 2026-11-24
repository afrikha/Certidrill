Fabric security works in layers: Microsoft Entra ID authenticates the user, a workspace role or an item permission opens the item, then the engine that reads the data (SQL, the semantic model or OneLake) applies its own row, column, object or folder rules. Exam questions give you a user, a requirement and a "least privilege" constraint, and ask which role, permission or security feature to use and where to define it.

<!-- section: workspace-roles | objectives: 1.1.1 -->
## Workspace roles

A workspace role applies to **every item** of the workspace, present and future. It doesn't extend to other workspaces, to the capacity or to the tenant. Users with no role and no item permission don't see the workspace.

| Capability | Admin | Member | Contributor | Viewer |
| --- | --- | --- | --- | --- |
| Update and delete the workspace, add or remove admins | Yes | No | No | No |
| Connect the workspace to Git, create a workspace identity | Yes | No | No | No |
| Add members and lower roles, allow others to reshare | Yes | Yes | No | No |
| Create, edit and delete items, write lakehouse and warehouse data | Yes | Yes | Yes | No |
| Run or cancel notebooks, Spark job definitions and pipelines | Yes | Yes | Yes | No |
| Read lakehouse and warehouse data with T-SQL (SQL analytics endpoint) | Yes | Yes | Yes | Yes |
| Read data through OneLake APIs, Spark and Lakehouse explorer (ReadAll) | Yes | Yes | Yes | No |
| View content and execution output of items | Yes | Yes | Yes | Yes |

Rules to apply in questions:

- Roles can be given to users, **security groups, Microsoft 365 groups and distribution lists**, and to service principals. Nested groups pass the role to their members.
- A user who gets several roles through several groups has the **highest** of them; roles don't combine into something new.
- Contributors and Viewers can share an item only if they hold **Reshare** on it.
- Viewer is the only role subject to semantic model row-level and object-level security, and to OneLake security roles. Admin, Member and Contributor have write permission on the items, so those rules don't filter them.

| Requirement | Role |
| --- | --- |
| Build and run notebooks, pipelines and warehouses, but don't manage access | Contributor |
| Also add other people to the workspace | Member |
| Connect the workspace to a Git repository, or delete it | Admin |
| Read reports and query the SQL analytics endpoint, change nothing | Viewer |

> **Exam trap.** A Viewer can query a lakehouse through its SQL analytics endpoint but can't read its files with Spark or Lakehouse explorer: that needs ReadAll, which Viewer doesn't include.

<!-- section: item-permissions | objectives: 1.1.2 -->
## Item permissions and sharing

To give access to **one item** without opening the whole workspace, share the item. The recipient gets **Read** by default, plus the additional permissions you select in the sharing dialog. Sharing doesn't create a workspace role, and the recipient sees only the shared item.

| Permission (sharing dialog) | Internal name | What it allows |
| --- | --- | --- |
| Always granted | Read | Find the item in the OneLake catalog, open it, connect to the SQL analytics endpoint. No table access by itself |
| Read all with SQL analytics endpoint / Read all data using SQL | ReadData | Read every table and view with T-SQL, like `db_datareader` |
| Read all with Apache Spark / Read all data using Apache Spark | ReadAll | Read the files in OneLake through Spark, OneLake APIs and Lakehouse explorer |
| Share | Reshare | Share the item onward, up to the recipient's own permissions |
| Build (semantic model) | Build | Create reports on the model, use Analyze in Excel, query it through the XMLA endpoint |
| Execute | Execute | Run or cancel the item |
| Subscribe to OneLake events | SubscribeOneLakeEvents | Subscribe to the item's OneLake events; currently granted together with ReadAll |

Points that decide answers:

- **ReadData and ReadAll are independent.** A user with only ReadData can use the SQL analytics endpoint but not the lakehouse URL or Spark.
- Lakehouse sharing never grants **write**. Writing requires the Contributor role or higher (or a OneLake security ReadWrite role, see below).
- For **granular** SQL access, share with no additional permission (Read only), then grant object permissions with T-SQL in the warehouse or SQL analytics endpoint. On a lakehouse, this applies to the default delegated identity mode of the SQL analytics endpoint: in **User's identity** mode, table `GRANT`/`REVOKE` are ignored and ReadData gives no SQL data access (see OneLake security below).
- A report in **Direct Lake** or **DirectQuery** over a warehouse needs the reader to have ReadData or granular SQL permissions; an **Import** report doesn't.
- A warehouse can't be shared directly with a service principal, and warehouse recipients can't reshare it.
- Revoking a permission can take up to **two hours** for users who are signed in.
- A lakehouse can also be shared with **Execute Apache Spark**, which lets the recipient run Spark jobs through the lakehouse Livy endpoint.
- On a semantic model, **Write** (republish, change the model through XMLA) comes with the Admin, Member and Contributor roles, and can also be added to a user on the model's **Manage permissions** page.

```text
-- Warehouse or SQL analytics endpoint: one table, after sharing with Read only
GRANT SELECT ON OBJECT::dbo.FactSales TO [ana@contoso.com];
DENY SELECT ON OBJECT::dbo.Payroll TO [ana@contoso.com];
```

> **Exam trap.** "Read" on a shared lakehouse or warehouse isn't read access to the data. Without ReadData, ReadAll or a T-SQL grant, the recipient opens the item and sees no rows.

<!-- section: data-level-security | objectives: 1.1.3 -->
## Row, column, object and file-level security

Each security feature is defined in one engine and enforced only by the queries that go through that engine. Always check every path a user can take to the data.

| Requirement | Feature | Defined in | Applies to |
| --- | --- | --- | --- |
| Restrict rows in T-SQL queries | Row-level security: predicate function and security policy | Warehouse or SQL analytics endpoint (T-SQL) | Every SQL query, including the workspace Admin |
| Hide columns in T-SQL queries | Column-level security: `GRANT SELECT` on a column list | Warehouse or SQL analytics endpoint (T-SQL) | SQL queries |
| Restrict rows in reports | Semantic model RLS: roles with DAX filters | Power BI Desktop (Manage roles), TMDL view, Tabular Editor | Viewers of the model and its reports |
| Hide a table or column and its metadata in reports | Object-level security (OLS) | TMDL view or Tabular Editor | Viewers of the model |
| Restrict folders or tables in a lakehouse for every engine | OneLake security data access roles (with optional RLS and CLS) | The lakehouse (OneLake security roles) | Spark, SQL analytics endpoint in user's identity mode, other OneLake readers |

SQL row-level security uses an inline table-valued function as a **filter predicate**, bound to the table by a security policy:

```text
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

- Filtered rows disappear silently from `SELECT`, `UPDATE` and `DELETE`. Each table needs its own predicate; one security policy can hold the predicates of several tables.
- `SCHEMABINDING = ON` is the default; to change the function, drop the policy, alter the function, recreate the policy.

Column-level security grants `SELECT` on the allowed columns only. A `SELECT *` from that user then **fails** with a permission error instead of returning the other columns:

```text
GRANT SELECT ON dbo.Customers (CustomerID, FirstName, LastName, Email) TO [Sales];
```

> **Exam trap.** When a warehouse or SQL analytics endpoint has RLS or CLS, a Direct Lake model that reads through it **falls back to DirectQuery** to enforce the rules. To keep Direct Lake, secure the data in the semantic model instead.

**Semantic model RLS.** Create roles in Power BI Desktop (**Modeling > Manage roles**) with a DAX expression per table; rows where it returns TRUE stay visible. Assign members in the service (semantic model **More options > Security**), never in Desktop. Dynamic RLS filters a user-mapping table and lets the relationship propagate the filter:

```text
-- Role filter on the UserAccess table
[UserEmail] = USERPRINCIPALNAME()
```

- Roles are **additive**: a user in two roles sees both sets of rows. A Viewer in no role sees no data.
- Members can be users, security groups, distribution groups and mail-enabled groups, but **not Microsoft 365 groups**, and not service principals: RLS doesn't apply to an app whose effective identity is a service principal.
- Viewers with **Build** are still filtered, for example in Analyze in Excel.
- Test with **Test as role** on the Security page.

**OLS** sets a table or column permission to **None** in a role, in TMDL view or Tabular Editor. The object then doesn't exist for the user: a visual that uses it shows an error. RLS can't hide columns; OLS can't filter rows. RLS and OLS can't be combined from **different** roles: a user who is a member of such a combination gets an error at query time.

**OneLake security** (file-level and table-level) creates data access roles on a lakehouse: each role grants **Read** (or **ReadWrite** on lakehouses) to chosen folders, tables or schemas, optionally with row and column rules. Workspace Admins and Members create and manage the roles. Access is deny-by-default and roles combine as a union. The **DefaultReader** role automatically includes every user with ReadAll: remove a user from it, or delete it, when you restrict that user with a custom role. The SQL analytics endpoint enforces OneLake security only after an Admin or Member switches it from delegated identity mode to **User's identity** access mode (Security tab). In that mode, table access, RLS and CLS come only from the OneLake security roles: T-SQL can't define RLS or CLS, table `GRANT`/`REVOKE` are ignored, and SQL permissions remain only for views, stored procedures and functions. The switch deletes the endpoint's existing SQL roles.

> **Exam trap.** Workspace Admins, Members and Contributors aren't restricted by semantic model RLS, OLS or OneLake security roles. To test or enforce them for a user, give that user the Viewer role or item permissions only.

<!-- section: sensitivity-labels | objectives: 1.1.4 -->
## Sensitivity labels

Sensitivity labels come from **Microsoft Purview Information Protection**. A Fabric admin enables them, and labels must be **published** to the users who apply them.

- Apply a label manually from the sensitivity indicator in the **item header** or in the item **Settings > Sensitivity**. You need a **Power BI Pro or PPU** license and **edit permission** on the item. A label shown in grey isn't available to you.
- Power BI Desktop can label a .pbix too; opening a protected .pbix requires Desktop December 2020 or later.

| Behavior | What happens |
| --- | --- |
| Default label | Applied to new or changed items when the user doesn't choose one (full support for Power BI items, partial for others) |
| Mandatory label | Power BI items can't be saved without a label; partial support for other items |
| Inheritance from data sources | A Power BI semantic model takes the label of the labeled source it ingests |
| Inheritance upon creation | A notebook, pipeline or shortcut created from a labeled lakehouse takes its label |
| Downstream inheritance | Labels flow to dependent items: Fabric to Fabric, Fabric to Power BI, Power BI to Power BI, but **not Power BI to Fabric** |
| Export | Label and protection travel with exports to Excel, PDF, PowerPoint and .pbix; not to .csv or .txt |

> **Exam trap.** A label doesn't hide data inside Fabric from users who already have access, unless it's associated with a Microsoft Purview **protection policy**, which then controls access to the labeled item in the tenant. Otherwise it classifies the item and protects the files exported from it. To restrict who sees rows or tables, use the security features of the previous section.

<!-- section: endorsement | objectives: 1.1.5 -->
## Endorsement

Endorsement marks trustworthy items with a badge that search and lists favor. Apply it in the item **Settings > Endorsement**.

| Badge | Meaning | Who applies it | Eligible items |
| --- | --- | --- | --- |
| Promoted | The creators think the item is ready to share and reuse | Anyone with **write** permission on the item | All Fabric and Power BI items except dashboards |
| Certified | An authorized reviewer checked it against the organization's standards | Only users a Fabric admin authorizes (can be delegated to domain admins), with write permission | All items except dashboards |
| Master data | The item is a core, single source of truth (customers, products) | Only users a Fabric admin authorizes, with write permission | Items that contain data, such as lakehouses and semantic models |

- Promotion needs no admin setup; certification and master data must be **enabled by a Fabric admin**.
- A user who isn't authorized sees **Certified** greyed out and can only **request** certification through the link the admin provides.
- When promoting or certifying a semantic model, **Make discoverable** lets users who don't have access to it find it.

> **Exam tip.** "Signal to the whole organization that the model is the official, reviewed source" means Certified. "Let my team know it's ready to reuse, without an admin" means Promoted.

<!-- section: key-points -->
## Key points

- Workspace role = all items; item permission = one item. Admin alone deletes the workspace and connects Git; Member adds people; Contributor builds; Viewer reads.
- Sharing grants Read only; data needs ReadData (SQL, delegated mode), ReadAll (Spark and OneLake) or T-SQL grants; in User's identity mode, OneLake security roles decide SQL table access. Build is for semantic models.
- SQL RLS and CLS protect SQL queries and make Direct Lake fall back to DirectQuery; semantic model RLS and OLS protect reports; OneLake security protects folders and tables for every engine.
- RLS, OLS and OneLake roles only restrict Viewers and users with item permissions.
- Labels classify and protect exports, and control access only through a Purview protection policy; downstream inheritance doesn't go from Power BI to Fabric.
- Promoted = any writer; Certified and Master data = admin-authorized reviewers.
