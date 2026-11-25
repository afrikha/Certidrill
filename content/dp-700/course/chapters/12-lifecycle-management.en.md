Lifecycle management in Fabric uses three tools that exam questions put side by side. **Git integration** versions the definitions of a workspace's items in a repository. **Database projects** describe a warehouse or a SQL database as T-SQL files that you build into a .dacpac and publish. **Deployment pipelines** promote items from a development workspace to test and production. Questions ask which tool meets a requirement, who may run it, and what it copies, especially what happens to data, shortcuts and connections.

<!-- section: git-integration | objectives: 1.2.1 -->
## Version control with Git integration

Git integration connects **one workspace** to **one branch** and one folder of a repository in **Azure DevOps, GitHub or GitHub Enterprise** (cloud providers only). All supported items of the workspace are versioned together, and workspace folders are kept as Git folders (up to 10 levels). Unsupported items stay in the workspace: they are ignored, not deleted.

Data engineering items that Git supports include lakehouses, notebooks, Spark job definitions, environments, pipelines, Dataflow Gen2, copy jobs, mirrored databases, warehouses, SQL databases, eventhouses, KQL databases, eventstreams and variable libraries. What Git stores depends on the item:

| Item | Stored in Git | Not stored |
| --- | --- | --- |
| Lakehouse | Metadata (name, description, SQL analytics endpoint metadata) and OneLake **shortcut** definitions (`shortcuts.metadata.json`); the object types to track are chosen in **Lakehouse settings** (stored in `alm.settings.json`, all GA types selected for a new lakehouse) | Tables and files: data is preserved by every Git operation |
| Notebook, pipeline, Spark job definition, environment | The item definition (code, activities, settings) | Run history |
| Warehouse | A **database project**: one T-SQL file per object | Table data |
| SQL database | A SQL project folder (`<name>.SQLDatabase`) with one `.sql` file per object | Data, collation and compatibility level |

Permissions combine the workspace role and the Git permissions:

| Action | Workspace role | Git permission |
| --- | --- | --- |
| Connect, sync or disconnect the workspace | Admin | Read |
| Commit | Contributor or higher, with write on all items | Read and Contribute; the branch policy must allow direct commits |
| Update from Git | Contributor or higher, with write on all items | Read |
| Switch or create a branch from Fabric | Admin, or Member and Contributor if the Admin turns on **Allow users with at least Contributor role to change Git branch** | Read (and Create branch to create one) |
| Branch out to another workspace | Contributor or higher | Read and Create branch |
| Any Git action | Viewer: none | |

How synchronization works:

- At the first connection, if both sides have content, you choose the direction: commit overwrites the branch, update overwrites the workspace (and you lose workspace content, so Fabric asks to confirm).
- **Update** always pulls the **whole branch** to the latest commit; you can't pick items. Commit and undo can select items.
- If Git has newer commits, commits are disabled until you update. If the same item changed on both sides, the item is in **Conflict** and update is disabled until you resolve it.
- **Branch out** creates a new workspace connected to a new branch, so that each developer works in isolation and merges through a **pull request** in the Git provider; the connected workspace then gets the merge with **Update**.
- Limits: 1,000 items per workspace, 25 MB per file, 250 characters per file path, 244 per branch name. My workspace isn't supported.

| Item status | Meaning |
| --- | --- |
| Synced | Same in the workspace and the branch |
| Uncommitted changes | Changed in the workspace: commit it |
| Update required | Changed in Git: update the workspace |
| Conflict | Changed on both sides |
| Unsupported item | Can't be versioned |

> **Exam trap.** Git integration never moves lakehouse data. A new workspace synced from Git gets an **empty** lakehouse with its shortcut definitions; OneLake shortcuts whose target doesn't exist in that workspace are invalid (in the Tables section, they move to **Unidentified**) until the target is created. An update also creates, updates or deletes the workspace's shortcuts to match the branch.

<!-- section: database-projects | objectives: 1.2.2 -->
## Database projects

A **database project** (SQL project) describes the schema of a database declaratively: one `CREATE` script per table, view, function or procedure, plus a `.sqlproj` file. Building the project validates the T-SQL and produces a **.dacpac**; publishing compares the .dacpac with the target and generates the `ALTER` statements needed. In Fabric, database projects apply to **SQL database** (target platform SQL database in Microsoft Fabric; SDK-style projects are generally available in Visual Studio Code) and to the **warehouse**, where warehouse projects are still **in preview**.

Developing a warehouse project in Visual Studio Code needs the **.NET SDK**, the **SQL Database Projects** and **SQL Server (mssql)** extensions, and the Contributor role or higher on the warehouse.

| Step | How |
| --- | --- |
| Create | **Database Projects: New**, target platform **Synapse Data Warehouse in Microsoft Fabric**, SDK-style project (the only supported type); or **Create Project From Database** to extract an existing warehouse |
| Connect | Server = the warehouse **SQL connection string** (`*.datawarehouse.fabric.microsoft.com`), authentication Microsoft Entra ID - Universal with MFA support |
| Edit | Change the `.sql` files under each schema folder; changes stay local |
| Build | **Build**: produces `bin/debug/<project>.dacpac`; build errors catch broken references before deployment |
| Publish | **Publish to an existing SQL server**, then **Generate Script** (review the T-SQL) or **Publish** (apply it); save a publish profile (`.publish.xml`) per environment |

In the `.sqlproj` file, set the Microsoft.Build.Sql SDK and reference the Fabric warehouse system objects (versions change often; without `DatabaseVariableLiteralValue`, publishing code that uses `sys` views can fail):

```text
<Sdk Name="Microsoft.Build.Sql" Version="2.3.0" />
<ItemGroup>
  <PackageReference Include="Microsoft.SqlServer.Dacpacs.FabricDw" Version="170.0.4">
    <DatabaseVariableLiteralValue>master</DatabaseVariableLiteralValue>
    <SuppressMissingDependenciesErrors>False</SuppressMissingDependenciesErrors>
  </PackageReference>
</ItemGroup>
```

Deployment properties of the publish profile:

| Property | Effect | Guidance |
| --- | --- | --- |
| `BlockOnPossibleDataLoss` | Stops the deployment if a change could lose data (dropping a column, narrowing a type) | `True` by default: never set it to `False` in production |
| `DropObjectsNotInSource` | Drops target objects that aren't in the project | `False` by default; turn it on in development and test only |
| Pre-deployment script | Runs before the schema changes | Idempotent scripts |
| Post-deployment script | Runs after the schema changes, for example to load reference data with `MERGE` | Avoid heavy operations on large production tables |

In CI/CD (Azure DevOps or GitHub), the same build and publish run from the command line with DacFx:

```bash
dotnet build DW_Sales.sqlproj
sqlpackage /Action:Publish /SourceFile:bin/Debug/DW_Sales.dacpac \
  /TargetConnectionString:"$TARGET_CONNECTION" /p:BlockOnPossibleDataLoss=true
```

For a **SQL database** in Fabric, Git integration stores the database as a SQL project, and **Update** from Git runs a project build followed by a SqlPackage publish. Pre- and post-deployment scripts are kept in **Shared Queries** and also run during deployment pipeline deployments.

| Requirement | Answer |
| --- | --- |
| Catch a view that references a dropped column before anything is deployed | Build the database project |
| Review the T-SQL that a deployment will run on production | Generate Script |
| Block a release that would drop a column with data | `BlockOnPossibleDataLoss` = True |
| Insert the same lookup rows after every deployment | Post-deployment script |

> **Exam trap.** A database project deploys **schema**, not table data. Rows reach the target only through a post-deployment script or a load process.

<!-- section: deployment-pipelines | objectives: 1.2.3 -->
## Deployment pipelines

A deployment pipeline has **2 to 10 stages** (3 by default: Development, Test, Production), and each stage is **one workspace** on a Fabric capacity; a workspace can be assigned to only one deployment pipeline. The number and names of stages can't be changed after creation. Deploying copies the selected items to the next stage and **overwrites** the paired items there; an item keeps its ID, URL and permissions in the target. A deployment holds at most **300 items**.

| Copied | Not copied |
| --- | --- |
| Item definitions and metadata, relationships between items | **Data**: tables, files, Spark views |
| Data sources and parameters (then changed by rules) | Permissions and workspace settings |
| Folders that contain deployed items | Semantic model role assignments, refresh schedule, credentials, endorsement |

Data engineering items in a pipeline:

| Item | Behavior on deployment |
| --- | --- |
| Lakehouse | An **empty** lakehouse with the same name is created in the target; its shortcuts are deployed. Shortcuts to **external** targets (ADLS Gen2, S3) keep the same target; **OneLake** shortcuts are remapped to the target stage, but the target tables and folders must exist there. The deployment overrides the target's shortcuts: they're created, updated or deleted to match the source, so manual edits in the target are lost |
| Notebook, Spark job definition | References to a lakehouse of the stage are **remapped** to the lakehouse of the target stage; a **default lakehouse rule** sets another lakehouse |
| Warehouse | Definition deployed, data not copied |
| Any item that depends on another | Bound to the copy in the same stage; if the dependency isn't in the target, the deployment fails: use **Select related** |

**Deployment rules** set stage-specific values. They are created in a **target** stage (never in the first one), by the **owner** of the item, and apply at the next deployment.

| Rule | Items |
| --- | --- |
| Default lakehouse rule | Notebooks |
| Data source rule | Semantic models, dataflows Gen1, paginated reports, mirrored databases |
| Parameter rule | Semantic models, dataflows Gen1 |

For items without rules, such as pipelines and Dataflow Gen2 connections or a shortcut that must point to S3 in development and ADLS Gen2 in production, use a **variable library**: a workspace item that holds variables with one **value set** per stage; the active value set of each stage decides the value at run time. Pipelines, notebooks, lakehouse shortcuts, Dataflow Gen2, copy jobs and eventstreams can consume variables.

| Action | Permissions |
| --- | --- |
| Create a pipeline | Pro, PPU or Premium license; you become pipeline Admin |
| Assign a workspace to a stage | Pipeline Admin and workspace Admin |
| Deploy to the next stage | Pipeline Admin and Contributor on the source and target workspaces |
| Create a deployment rule | Pipeline Admin, Contributor or higher on the target, owner of the item |
| Compare stages | Pipeline Admin and Contributor on both workspaces |

> **Exam trap.** Deploying a lakehouse to Test doesn't copy a single row. Load data in each stage with its own pipelines or notebooks, after the deployment.

Choosing the tool:

| Requirement | Tool |
| --- | --- |
| Track every change to notebooks and pipelines, roll back, merge parallel work | Git integration |
| Each developer works in an isolated workspace | Branch out |
| Validate and script warehouse schema changes, block data loss | Database project |
| Promote tested items to production with production lakehouse and connections | Deployment pipeline with rules or a variable library |

> **Exam tip.** Git and deployment pipelines work together: develop in a Git-connected workspace, then promote with a pipeline. A pipeline alone doesn't give history, and Git alone doesn't change connections per stage.

<!-- section: key-points -->
## Key points

- Git: one workspace, one branch, one folder; Admin connects; Contributor commits and updates; update pulls the whole branch; lakehouse data and tables never go to Git, only metadata and shortcuts.
- Database projects: SDK-style; SQL database in Fabric (generally available) or warehouse (target Synapse Data Warehouse in Microsoft Fabric, preview); build gives a .dacpac; Generate Script to review, Publish to apply; `BlockOnPossibleDataLoss` stays `True` (its default) in production; pre and post-deployment scripts.
- Deployment pipelines: 2 to 10 stages, one workspace each, 300 items per deployment, metadata only; lakehouses arrive empty; autobinding inside the stage.
- Rules live in the target stage, are created by the item owner and apply at the next deployment; default lakehouse rule for notebooks; variable libraries for the rest.
- Deploying needs pipeline Admin plus Contributor on both workspaces.
