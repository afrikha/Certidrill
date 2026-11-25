The analytics development lifecycle covers how Fabric items are versioned, promoted from development to production, checked for downstream impact and reused. The exam mixes tools that look alike: Git integration versions a workspace, deployment pipelines promote content between stage workspaces, the XMLA endpoint lets external tools write to a semantic model, and .pbip, .pbit and .pbids are three different files. Questions ask which one meets a requirement, who may use it, and what it copies or doesn't copy.

<!-- section: git-integration | objectives: 1.2.1 -->
## Version control with Git integration

Git integration connects **one workspace** to **one branch and one folder** of a repository in **Azure DevOps, GitHub or GitHub Enterprise** (cloud only). All items of the workspace are versioned together, and workspace folders map to Git folders. Git stores **item definitions, never data**. Support depends on the item type: lakehouses, warehouses, notebooks, pipelines and Dataflow Gen2 are supported, while the Power BI **Report**, **Semantic model** and **Paginated report** items are still listed as preview.

Prerequisites and permissions:

- The workspace is on a Fabric capacity (or Power BI Premium), and a Fabric admin enables the tenant setting **Users can synchronize workspace items with their Git repositories** (plus the GitHub setting for GitHub).
- **Only a workspace Admin connects or disconnects** the workspace (**Workspace settings > Git integration**: provider, organization, project, repository, branch, folder, then **Connect and sync**).
- Commit and update need **Contributor** (with write on the items) and the matching Git rights: Read to update; Read, Contribute and a branch policy that allows direct commits to commit. Viewers can't do any Git action.
- Switching or creating a branch from Fabric is Admin-only unless the Admin enables **Allow users with at least Contributor role to change Git branch**.

At the first sync, if one side is empty its content is copied from the other; if both have content, you choose the direction: **commit** overwrites Git, **update** overwrites the workspace.

| Git status of an item | Meaning | What to do |
| --- | --- | --- |
| Synced | Workspace and branch are identical | Nothing |
| Uncommitted changes | Changed in the workspace | Commit from the Source control pane |
| Update required | Changed in Git (for example, a merged pull request) | Update; it always pulls the whole branch |
| Conflict | Changed on both sides | Resolve; commit and update are blocked |
| Unsupported item | The item type can't be synced | Ignored by Git, not deleted |

Branching patterns:

- **Branch out** creates a new workspace connected to a new branch, so each developer works in an isolated workspace, then merges through a **pull request** in Git.
- Commits are disabled while Git has newer changes: update first, then commit.
- Limits worth knowing: 1,000 items per workspace for sync, 25 MB per file, folders 10 levels deep.

> **Exam trap.** Git integration doesn't move content to a test or production workspace and doesn't change data sources. It versions definitions. Promoting with environment-specific connections is the job of deployment pipelines (or of Git branches connected to each stage workspace).

<!-- section: pbip-projects | objectives: 1.2.2 -->
## Power BI Desktop projects (.pbip)

A .pbix is one binary file. Saving as a **Power BI project** (**File > Save as**, type *Power BI Project (.pbip)*) writes the report and the semantic model as **plain-text files** that Git can diff and merge:

```text
Sales/
├── Sales.pbip                  pointer that opens the report (optional)
├── Sales.Report/
│   └── definition.pbir         points to the semantic model
├── Sales.SemanticModel/
│   ├── definition.pbism
│   ├── definition/             model metadata as TMDL files
│   └── .pbi/cache.abf          local data cache, not committed
└── .gitignore                  excludes .pbi/localSettings.json and .pbi/cache.abf
```

- The `.gitignore` is created only if none exists. The local cache keeps data out of the repository: **a project stores definitions, not data**.
- Model metadata can be edited outside Desktop (TMDL in Visual Studio Code, or external tools connected to Desktop); Desktop detects external changes and offers to apply them. Undocumented files such as `report.json` or `diagramLayout.json` shouldn't be edited by hand.
- Deploy a project with Fabric Git integration (commit the folder to the branch of a connected workspace; the Report and Semantic model items are in preview there), the Fabric REST APIs, or **Publish** in Desktop, which also uploads the cache.
- Convert .pbix to .pbip and back only through **Save as** in Desktop.
- Limitations: no sensitivity labels in a project, can't save directly to OneDrive or SharePoint, keep the root path short (260 characters on Windows).

> **Exam tip.** "Several developers must work on the same report and model, review changes line by line and merge them" calls for .pbip with Git. A .pbix in a repository can only be replaced as a whole.

<!-- section: deployment-pipelines | objectives: 1.2.3 -->
## Deployment pipelines

A deployment pipeline has **2 to 10 stages** (default three: Development, Test, Production), **one workspace per stage**, on Fabric capacity. Deploying copies items from one stage to an adjacent stage, in either direction, and overwrites the **paired** items of the target.

| Copied | Not copied |
| --- | --- |
| Item metadata and definitions, report pages, model metadata, relationships between items | **Data**: refresh semantic models after deploying to an empty stage |
| Data sources and parameters (then changed by rules) | Permissions and workspace settings; app content |
| Sensitivity labels, only for new items or when the source label is protected and the target's isn't | Semantic model role assignments, refresh schedule, data source credentials, query caching settings, endorsement |

**Deployment rules** change values in the **target** stage so that test and production use their own sources:

| Rule | Items |
| --- | --- |
| Data source rule | Semantic models, dataflows Gen1, paginated reports, mirrored databases |
| Parameter rule | Semantic models, dataflows Gen1 |
| Default lakehouse rule | Notebooks |

- Rules are created in the target stage (never in the first stage) by the **owner** of the item, and take effect at the next deployment.
- A data source rule can only switch to a source **of the same type**.
- For Direct Lake on SQL models use data source rules; for **Direct Lake on OneLake** models use M parameters and **parameter rules**.

**Autobinding** keeps dependencies inside the stage: a report deployed to Test binds to the Test copy of its semantic model. If the dependency doesn't exist in the target, the deployment fails; use **Select related** to deploy it too. Autobinding isn't supported for Dataflow Gen2. The first deployment of a Power BI item also fails if the target stage already holds an item with the same name and type.

Permissions:

| Action | Needs |
| --- | --- |
| Create a pipeline | Pro, PPU or Premium license; you become pipeline Admin |
| Assign a workspace to a stage | Pipeline Admin and workspace Admin |
| Deploy to an empty stage | Pipeline Admin and Contributor on the source workspace |
| Deploy to the next stage | Pipeline Admin and Contributor on both workspaces (and owner of the item for dataflows) |
| Create a deployment rule | Pipeline Admin, Contributor or higher on the target, owner of the item |
| View deployment history | Pipeline Admin |

> **Exam trap.** Pipeline Admin is the only pipeline permission and it doesn't give access to workspace content. A pipeline Admin without a workspace role can't deploy.

| Requirement | Tool |
| --- | --- |
| Track every change, roll back, merge parallel work | Git integration |
| Promote tested content to production with production connection strings | Deployment pipeline with rules |
| Developers each work in isolation | Branch out to personal workspaces |

<!-- section: impact-analysis | objectives: 1.2.4 -->
## Impact analysis of downstream dependencies

Before changing a lakehouse, a warehouse, a dataflow or a semantic model, run **impact analysis** on it: from its card in the workspace **lineage view**, or from the item's details page. It needs **write permission** on the item.

| Tab or option | Shows |
| --- | --- |
| Child items | Only the direct children |
| All downstream items | Every dependent item, with the number of items and workspaces affected |
| Browse by item type / Browse by workspace | Groups the affected items |
| Limited access | Items you can't open appear without their name |
| Notify contacts | Sends an email with your message to the contact lists of every affected workspace, even those you can't access |

For a **data source**, the pane shows only the direct children and the connection string; run impact analysis again on a child to go further.

> **Exam tip.** "Before you rename a column of the lakehouse table, identify every report in other workspaces that may break and inform their owners" means impact analysis, **All downstream items**, then **Notify contacts**.

<!-- section: xmla-endpoint | objectives: 1.2.5 -->
## Managing semantic models through the XMLA endpoint

Workspaces on a Fabric, Premium or PPU capacity expose an **XMLA endpoint**, the Analysis Services protocol, so that tools manage semantic models like an Analysis Services server:

```text
powerbi://api.powerbi.com/v1.0/myorg/Sales%20Analytics
```

Copy the address from **Workspace settings > Premium > Workspace connection**; spaces in the workspace name are URI-encoded.

| Setting | Allows | Where |
| --- | --- | --- |
| **Read** (default) | Queries, metadata and traces: DAX Studio, Excel, SQL Server Profiler | Capacity settings, semantic model workload, **XMLA Endpoint** |
| **Read Write** | Also deploy models, run TMSL scripts, change metadata, refresh individual partitions | Same setting, set by a capacity admin; applies to all workspaces of the capacity |

- The tenant setting **Allow XMLA endpoints and Analyze in Excel with on-premises semantic models** must also be on (it is by default).
- **Contributor or higher** in the workspace acts as database administrator through XMLA; **Build** permission gives read access (as database reader, filtered by RLS).
- Tools: Tabular Editor and ALM Toolkit (write metadata, compare and deploy), SSMS (TMSL scripts, partition refresh), Visual Studio with Analysis Services projects, PowerShell `Invoke-ASCmd`, DAX Studio (read).
- XMLA refreshes aren't limited to the 48 scheduled refreshes per day and can target single partitions, such as incremental refresh partitions. They don't refresh tile caches, which refresh when a user opens the report.
- Data source credentials can't be set through XMLA: set them in the semantic model settings.
- Microsoft recommends the **large semantic model storage format** for models written through XMLA. Write operations on a model authored in Power BI Desktop require **enhanced metadata**.

> **Exam trap.** After a write through XMLA, a semantic model authored in Power BI Desktop **can't be downloaded as a .pbix** anymore. Keep the source .pbix or, better, a .pbip in Git.

<!-- section: reusable-assets | objectives: 1.2.6 -->
## Reusable assets: .pbit, .pbids and shared semantic models

| File or asset | Contains | Created with | Use it to |
| --- | --- | --- | --- |
| Template (.pbit) | Report pages and visuals, model definition (tables, relationships, measures), queries and parameters; **no data** | **File > Export > Power BI template** in Desktop | Start new reports with the same design and model; parameters are prompted at opening |
| Data source file (.pbids) | One connection in JSON: protocol, address, optional mode | **File > Options and settings > Data source settings > Export PBIDS**, or by hand | Give report authors a ready connection; Desktop opens Navigator to choose tables |
| Shared semantic model | A published model reused by many reports | Publish once, grant **Build** | One governed model, many thin reports |

A .pbids file holds **exactly one** data source and **no credentials, tables or query**; if `mode` is missing, the user chooses Import or DirectQuery. For SQL Server (`tds`), `database` is optional, so one file can point to a server without naming a database:

```json
{
  "version": "0.1",
  "connections": [
    {
      "details": {
        "protocol": "tds",
        "address": {
          "server": "sql-contoso.database.windows.net",
          "database": "SalesDB"
        }
      },
      "options": {},
      "mode": "DirectQuery"
    }
  ]
}
```

**Shared semantic models.** Report authors connect from Power BI Desktop or the service to a published model (**Power BI semantic models** in Get data, or the OneLake catalog) and build **thin reports** with a live connection: no data or model in the report file. They need **Build** permission on the model (through the Contributor role or higher, or granted on the model or the app). Endorse the model (Promoted or Certified) and make it discoverable so that authors find it. A change to the shared model reaches every report: check it with impact analysis first.

> **Exam trap.** A .pbit doesn't carry data and a .pbids doesn't carry tables or credentials. Neither replaces a shared semantic model when the requirement is "a single source of truth that every report uses".

<!-- section: key-points -->
## Key points

- Git integration: workspace Admin connects; one branch and one folder; definitions only; Report and Semantic model items still in preview; commit, update, branch out, pull requests.
- .pbip = text files for Git; .pbit = template without data; .pbids = one connection without credentials.
- Deployment pipelines: 2 to 10 stages, metadata only, rules in the target stage by the item owner, autobinding within the stage, pipeline Admin plus Contributor on both workspaces to deploy.
- Impact analysis needs write permission; All downstream items and Notify contacts answer "who breaks and who to warn".
- XMLA Read is the default; Read Write is a capacity setting; a written Desktop model can't be downloaded as .pbix.
- Shared semantic models need Build permission and are found through endorsement and discovery.
