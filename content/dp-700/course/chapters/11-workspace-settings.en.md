A Fabric workspace carries settings that change how every item in it runs: the Spark pool and environment that notebooks start on, the domain the workspace belongs to, OneLake options such as the shortcut cache and diagnostics, and the pool that runs Apache Airflow jobs. Exam questions describe a symptom (slow session start, a job that blocks the capacity, high egress costs, an audit requirement) or a constraint (minimize cost, production DAGs that must always run) and ask which setting to change, at which level, and who can change it.

<!-- section: spark-pools | objectives: 1.1.1 -->
## Spark pools for the workspace

Spark settings are in **Workspace settings > Data Engineering/Science > Spark settings**, and only a workspace **Admin** can change them. The **Pool** section sets the **Default pool for workspace**, used by every notebook and Spark job definition that doesn't pick something else.

| | Starter pool | Custom Spark pool |
| --- | --- | --- |
| Created | Automatically, with every workspace (the default) | By a workspace Admin, with **New Pool** |
| Session start | About 5 to 10 seconds: prehydrated live clusters of medium nodes | About 3 minutes, because nodes are provisioned on demand |
| Sizing | Handled by Fabric, depends on the capacity SKU; the Admin can adjust max nodes and executors | Node family, node size, autoscale and executor bounds chosen by the Admin |
| Prerequisite | None | The capacity setting **Customized workspace pools** (Capacity settings > Spark Compute) must be on; it is on by default |
| Typical use | Interactive development, short jobs | Workloads that need larger or memory-heavy nodes, or a fixed node count |

Node sizes of a custom pool:

| Node size | vCores | Memory |
| --- | --- | --- |
| Small | 4 | 32 GB |
| Medium | 8 | 64 GB |
| Large | 16 | 128 GB |
| X-Large | 32 | 256 GB |
| XX-Large | 64 | 512 GB |

Options of a custom pool:

- **Autoscale**: the pool grows up to the maximum node count while jobs run and releases nodes afterwards. A custom pool can have up to **200 nodes**.
- **Dynamically allocate executors**: Spark picks the number of executors, within the bounds you set, according to the data volume.
- **Single node**: set the minimum node count to 1 so that the driver and the executor run on the same node.
- A session on a custom pool **autopauses** after 2 minutes of inactivity once its job is finished; you pay only while compute is used.

> **Exam trap.** Switching the workspace default from the starter pool to a custom pool makes every session start take minutes instead of seconds. If the requirement is "minimize session start time" for interactive notebooks, keep the starter pool.

<!-- section: spark-environment-jobs | objectives: 1.1.1 -->
## Environment, jobs and high concurrency

**Environment.** An **Environment** item bundles the Spark runtime version, Spark properties, compute properties and libraries. Select one as the workspace **default environment** to give every notebook the same libraries and runtime; if no default environment is set, choose the **Runtime version** in a drop-down list. The toggle **Customize compute configurations for items** lets users change driver and executor cores and memory per item (through an environment or a session). When it is off, the **Compute** section of environment items is disabled (no **Environment pool**, no driver or executor sizes) and every Spark job uses the workspace default pool: choosing a pool in an environment requires this toggle on.

**Jobs.** These settings control how Spark jobs are admitted on the capacity:

| Setting | Default | Effect |
| --- | --- | --- |
| Optimistic job admission | On | A job starts with its minimum cores and grows if capacity is free |
| **Reserve maximum cores for active Spark jobs** | Off | Turns optimistic admission off: each job reserves its maximum cores, so fewer jobs run at once but none is starved |
| **Spark session timeout** | 20 minutes | Interactive notebook sessions expire after this idle time |
| **Set maximum job lifetime** | Off | Fabric cancels user jobs (notebooks, also run from pipelines, Spark job definitions, Livy sessions) that exceed the limit; system jobs such as table maintenance aren't affected |

**High concurrency.** High concurrency mode lets several notebooks **share one Spark session**: the second notebook starts instantly, and only the notebook that started the session is billed. Each notebook keeps its own REPL, so variables don't collide.

| Setting | Where it applies | How it is used |
| --- | --- | --- |
| **For notebooks** | Interactive notebooks; on by default | In the notebook, **Run** tab > session type **New high concurrency session**, then attach other notebooks to that session |
| **For pipeline running multiple notebooks** | Notebook activities of pipelines | Notebook activities with the same **session tag** (Advanced settings) share a session |

Notebooks share a session only if they are run by the **same user**, in the same workspace, with the **same default lakehouse** (or none), the **same Spark compute configuration** and the **same library packages**. A session holds **5 notebooks** by default; set the Spark property `spark.highConcurrency.max` (2 to 50) in the environment to change it. A sixth notebook with the same session tag gets a new session.

**Automatic logging** for machine learning models and experiments (MLflow autologging) is also a workspace setting.

| Requirement | Setting |
| --- | --- |
| Same libraries in every notebook of the workspace | Default environment |
| Stop runaway jobs that consume the capacity for hours | Set maximum job lifetime |
| Guarantee that a running job is never short of cores | Reserve maximum cores for active Spark jobs |
| Ten notebooks in a pipeline start too slowly | High concurrency for pipelines, with a session tag |
| Users must not size their own drivers and executors | Turn off Customize compute configurations for items |

> **Exam trap.** Notebooks run by two different users, or attached to two different default lakehouses, never share a high concurrency session, whatever the session tag.

<!-- section: domains | objectives: 1.1.2 -->
## Domains

A **domain** groups workspaces by business area (Finance, Sales, HR). Every item of a workspace belongs to the domain of its workspace. Domains drive discovery (the domain filter of the OneLake catalog) and **federated governance**: some tenant settings can be delegated to the domain. **Subdomains** refine a domain; they have no admins of their own (those of the parent domain apply) and only general settings.

| Role | Assigned by | Can do |
| --- | --- | --- |
| Fabric admin | Fabric Administrator role in Microsoft Entra ID | Create, rename and delete domains, name domain admins and contributors, assign any workspace |
| Domain admin | Fabric admin | Edit the description, image and contributors of their domain, assign workspaces, override delegated settings; can't rename or delete the domain or add other domain admins |
| Domain contributor | Fabric admin or domain admin (everyone by default) | Assign a workspace **they administer** to the domain, from the workspace settings |

Ways to assign workspaces:

| Method | Who | Effect |
| --- | --- | --- |
| By workspace name | Fabric or domain admin, in the admin portal | The selected workspaces |
| By workspace admin | Fabric or domain admin | All workspaces that the chosen users or groups administer today (not My workspaces, not future ones) |
| By capacity | Fabric or domain admin | All workspaces on the chosen capacities today (not workspaces added later) |
| From workspace settings | Workspace Admin who is a domain contributor | That workspace |
| Default domain | Users or groups listed in the domain's default domain setting | Their unassigned workspaces and every workspace they create later go to the domain |

**Delegated settings** of a domain override the tenant setting for the domain's workspaces: a **default sensitivity label** for the domain, and **certification** (enable it, name the domain's certifiers and the documentation URL).

> **Exam trap.** A domain doesn't grant or restrict access. A user who sees an item in a domain still needs a workspace role or an item permission to open it.

<!-- section: onelake-settings | objectives: 1.1.3 -->
## OneLake settings

The **OneLake** tab of the workspace settings holds two features that exam questions mix up with security.

**Shortcut cache.** When OneLake reads files through an external shortcut, it can keep them in a workspace cache, which reduces **cross-cloud egress costs**.

- Supported for **Amazon S3, S3 compatible, Google Cloud Storage and on-premises data gateway** shortcuts; ADLS Gen2 shortcuts aren't in the supported list.
- Turn the cache **On** and set the **Retention Period**, from **1 to 28 days**. Each read of a file resets its retention period.
- Files larger than **1 GB** aren't cached.
- **Reset cache** removes every cached file of the workspace at once.

**OneLake diagnostics.** The toggle **Add diagnostic events to a lakehouse** streams **data access events** as JSON files into a lakehouse you select. Every operation through the Fabric portal and the Blob or ADLS APIs is logged, including access through shortcuts; for access by Fabric engines (Spark, SQL), only a `FabricWorkloadAccess` event records that temporary access was granted, and the details are in the engine's own logs.

- Requires the **Admin** role on the monitored workspace and **Contributor** on the destination lakehouse.
- The destination lakehouse must be on the **same capacity** as the monitored workspace. Moving the workspace to another capacity, or deleting the destination lakehouse, disables diagnostics (for every workspace that points to that lakehouse); events already written aren't deleted.
- Events start to arrive within about an hour, under `Files/DiagnosticLogs/OneLake/Workspaces/...`.
- **Immutability** can be applied to the workspace that holds the diagnostic lakehouse, so no one can change or delete the files during the retention period; it can't be changed once set.

| Requirement | Setting |
| --- | --- |
| Reduce the cost of reading an S3 bucket from notebooks every day | Shortcut cache on, retention long enough to cover the read interval |
| Prove who accessed files of a lakehouse, with tamper-proof records | OneLake diagnostics to a lakehouse, with immutability |
| Empty the shortcut cache of the workspace now | Reset cache |

> **Exam tip.** OneLake diagnostics records data access in OneLake. Activities such as creating, sharing or deleting items are in the Fabric audit log (see the security chapter).

<!-- section: airflow-settings | objectives: 1.1.4 -->
## Apache Airflow job settings

An **Apache Airflow job** runs Airflow DAGs on Fabric-managed compute. Its workspace settings are in **Workspace settings > Data Factory > Apache Airflow Runtime Settings**, where **Default Data Workflow Setting** selects the pool. When the setting for customizing compute configurations for items is off, the starter pool is used for every environment of the workspace.

| | Starter pool | Custom pool |
| --- | --- | --- |
| Default | Yes | No: select **New Pool** |
| Availability | Starts instantly, resumes in up to 5 minutes; **shuts down after 20 minutes of inactivity** | Created stopped; **always on** until manually paused; resumes in up to 5 minutes |
| Node size | Large (fixed) | **Small** (simple DAGs) or **Large** (complex or production DAGs) |
| Scaling | None | **Enable autoscale**, and **Extra nodes**: each one adds capacity for about three more workers, so more DAG tasks run in parallel |
| Suggested use | Development and occasional runs | Production DAGs that must run on schedule without start delay |

- A custom pool starts with three base nodes (scheduler, web server, worker) and consumes capacity units while it runs, even without DAG activity: pause it, or pause the capacity, to stop the cost.
- Microsoft recommends at least an **F8** capacity for a small pool and **F16** for a large one.
- Private networks and virtual networks aren't supported with Apache Airflow jobs.

> **Exam trap.** A DAG scheduled every hour on the starter pool waits for the environment to resume after each 20-minute idle period. For production schedules without delay, use a custom pool; for development, the starter pool costs less.

<!-- section: key-points -->
## Key points

- Spark settings are Admin-only. Starter pool = seconds to start, Fabric-sized; custom pool = your nodes, about 3 minutes to start, needs Customized workspace pools on the capacity.
- Jobs tab: optimistic admission by default, reserve maximum cores to avoid starvation, session timeout 20 minutes, maximum job lifetime to stop runaway jobs.
- High concurrency: same user, same default lakehouse, same compute and libraries; 5 notebooks per session by default; pipelines group notebooks by session tag; only the first notebook is billed.
- Domains organize and delegate governance (default label, certification) but never grant access; contributors must be workspace Admins.
- OneLake tab: shortcut cache for S3, GCS, S3 compatible and gateway shortcuts (1 to 28 days, 1 GB per file); diagnostics to a lakehouse on the same capacity.
- Airflow: starter pool stops after 20 minutes idle; custom pool is always on, Small or Large, with autoscale and extra nodes.
