Every notebook, job, pipeline and SQL query in Azure Databricks runs on compute. DP-750 asks you to pick the compute type that fits a workload and its constraints (cost, startup latency, isolation, language), then to size it, choose its runtime and features, install libraries and control who can use it. Most wrong answers on the exam are real compute types used for the wrong workload.

<!-- section: compute-types | objectives: 1.1.1 -->
## Compute types and when to use them

Azure Databricks offers three families: serverless compute managed by Databricks, classic compute that runs in your Azure subscription, and SQL warehouses for SQL and BI.

| Compute type | What it is | Typical use |
| --- | --- | --- |
| Serverless compute for notebooks | Interactive Python and SQL in notebooks, automatic scaling, no infrastructure to manage | Interactive development without waiting for a cluster |
| Serverless compute for jobs | Runs Lakeflow Jobs tasks without configuring infrastructure | Default for notebook, Python script, Python wheel, JAR and dbt CLI tasks |
| Serverless pipelines | Runs Lakeflow Spark Declarative Pipelines without configuring infrastructure | Declarative ETL with no cluster to tune |
| Classic all-purpose compute | A cluster you create, share and restart; standard or dedicated access mode | Interactive work that serverless doesn't support (R, Scala notebooks, RDD code, init scripts, Maven libraries) |
| Classic jobs compute | A cluster created for a job run with the same settings as all-purpose compute | Production jobs that need classic features, and Spark Submit tasks |
| SQL warehouse | Compute optimized for SQL queries, analytics and BI, in serverless, pro or classic type | SQL tasks, dashboards, BI tools, Genie Agents |
| Instance pool | A set of idle, ready-to-use VMs that clusters draw from | Reduce start and autoscaling time of classic compute |

Serverless compute requires a workspace enabled for Unity Catalog in a supported region. It is available by default in most workspaces. Its main limitations:

- Python and SQL only in notebooks: Scala and R notebooks aren't supported (JAR tasks in jobs are).
- Only Spark Connect APIs: RDD APIs aren't supported.
- No compute-scoped libraries, no Maven coordinates, no compute-scoped init scripts: use a base environment or notebook-scoped libraries.
- No Spark UI: use the query profile. Only a limited set of Spark properties can be set, at session level.
- `CACHE TABLE`, `df.checkpoint()` and `spark.catalog.cacheTable()` raise an exception; `df.cache()` and `df.persist()` work.

For jobs, serverless has a **Performance optimized** setting. Disabled (standard mode), it uses fewer DBUs and tolerates a startup latency of 4 to 6 minutes; enabled, the job starts and runs faster for time-sensitive workloads. Both use the same SKU.

Recommended compute by job task type:

| Task type | Recommended | Also supported |
| --- | --- | --- |
| Notebook, Python script, Python wheel, JAR | Serverless jobs | Classic jobs, classic all-purpose |
| SQL, dbt | Serverless SQL warehouse | Pro SQL warehouse |
| Lakeflow pipeline | Serverless pipeline | Classic pipeline |
| Spark Submit | Classic jobs | None |

A classic job cluster starts when the first task that uses it begins and terminates after the last one. A job cluster shared by several tasks is scoped to one job run: other jobs and other runs of the same job can't use it.

> **Exam trap.** All-purpose compute can run a job task, but Databricks doesn't recommend it for production jobs. When a stem says "scheduled production job" and "minimize cost", the answer is job compute (serverless or classic), never an all-purpose cluster left running.

SQL warehouse types:

| Type | Photon | Predictive IO | Intelligent workload management | Startup |
| --- | --- | --- | --- | --- |
| Serverless | Yes | Yes | Yes | Typically 2 to 6 seconds |
| Pro | Yes | Yes | No | Several minutes (about 4) |
| Classic | Yes | No | No | Several minutes (about 4) |

Choose serverless for the best startup and rapid autoscaling when queries queue. Choose pro when serverless isn't available in the region or when the warehouse must reach databases through your own network (federation, hybrid). In the UI the default type is serverless where it is supported; the SQL warehouses API defaults to classic unless you set `enable_serverless_compute` to `true` with `warehouse_type` set to `pro`.

> **Exam trap.** Materialized views, Lakehouse Federation queries and Genie Agents need a **pro or serverless** SQL warehouse (standalone materialized views can also be created and refreshed from a notebook on serverless compute). A classic warehouse is the distractor.

<!-- section: access-modes | objectives: 1.1.1 -->
## Access modes: standard and dedicated

Classic compute has an access mode that decides who can share it and how Unity Catalog isolates users.

| Access mode | Former name | Users | Languages |
| --- | --- | --- | --- |
| Standard | Shared | Several users, isolated from each other by Lakeguard | Python, SQL, Scala |
| Dedicated | Single user | One user or one group | Python, SQL, Scala, R |
| No isolation shared | Same | Legacy, not recommended, no Unity Catalog | Not to be chosen |

Access mode is **Auto** by default: it resolves to Standard, unless you select a machine learning runtime, a GPU instance type or a Databricks Runtime below 14.3, in which case it resolves to Dedicated. Databricks recommends standard access mode unless a feature you need isn't supported there.

| Requirement | Answer |
| --- | --- |
| Several analysts share one cluster, Unity Catalog isolation | Standard access mode ("shared compute" in the study guide) |
| R notebooks, or Databricks Runtime ML with Unity Catalog data | Dedicated access mode |
| A team shares a cluster that needs dedicated-only features | Dedicated access mode assigned to a group (Public Preview) |
| No cluster to manage, Python and SQL only | Serverless compute |

<!-- section: performance-settings | objectives: 1.1.2 -->
## Performance settings: nodes, autoscaling, termination, pools

A compute resource has one **driver** node and zero or more **worker** nodes; Azure Databricks runs one executor per worker. The driver type defaults to the worker type (Auto); choose a larger driver when code collects large results to the driver with `collect()`.

- **Node type** (worker type) sets CPU cores and memory per node; GPU types are for deep learning.
- **Single node**: the driver acts as master and worker, Spark runs locally with one executor thread per core minus one. It can't be converted to multi-node, and a multi-node cluster can't be scaled to 0 workers: use single node for small data or library tests.
- **Workers**: a fixed number, or **Enable autoscaling** with **Min** and **Max** workers. Autoscaling isn't available for `spark-submit` jobs.
- **Spot instances** (Use spot instances checkbox): the driver is always on-demand; evicted spot workers are replaced by spot or on-demand instances. Don't use a pool of spot instances for the driver.
- **Local storage**: disks autoscale automatically, up to 5 TB per VM.
- **Tags**: applied to VMs, disks and usage logs, for cost attribution. With a pool, custom tags only reach DBU usage reports.

| Autoscaling | Plan | Behavior |
| --- | --- | --- |
| Optimized | Premium | Scales from min to max in at most 2 steps; scales down after 40 seconds of underuse on job compute, 150 seconds on all-purpose compute |
| Standard | Standard | Adds 8 nodes first, then scales up exponentially; scales down when 90 % of nodes are idle for 10 minutes |

For streaming workloads, Databricks recommends Lakeflow Spark Declarative Pipelines with enhanced autoscaling rather than cluster autoscaling.

**Automatic termination** stops all-purpose compute after an inactivity period between 10 and 10,000 minutes; clear the checkbox or set `0` to opt out. Compute is inactive when every command, Spark job, Structured Streaming query and JDBC call has finished. A terminated cluster keeps its configuration for 30 days, after which it is deleted unless an admin **pins** it (up to 100 pinned). Editing a running compute (other than size and permissions) requires a restart.

**Instance pools** keep idle VMs ready: clusters attached to the pool start and autoscale faster, and released instances return to the pool. Azure Databricks charges no DBUs for idle pool instances, but Azure VM costs apply. Creating a pool requires the **Allow pool creation** entitlement (workspace admins by default). Driver and workers can use the same or different pools (`driver_instance_pool_id`, `instance_pool_id`). With autoscaling, the cluster minimum should not exceed the pool's minimum idle instances (otherwise startup is no faster than without a pool), and a maximum above the pool capacity makes cluster creation fail. If the workload supports serverless, Databricks recommends serverless instead of pools.

```json
{
  "cluster_name": "etl-nightly",
  "spark_version": "<lts-runtime-version>",
  "autoscale": { "min_workers": 2, "max_workers": 8 },
  "autotermination_minutes": 30,
  "runtime_engine": "PHOTON",
  "instance_pool_id": "<worker-pool-id>",
  "driver_instance_pool_id": "<driver-pool-id>",
  "custom_tags": { "costcenter": "finance" }
}
```

Compute **policies** limit what users can configure. Without the **Unrestricted cluster creation** entitlement, a user creates compute only through granted policies; every user has the **Personal Compute** policy (single-machine compute) by default.

> **Exam trap.** Pools reduce start time, not the cost of running nodes: idle pool VMs are still billed by Azure. To cut the cost of idle interactive clusters, lower the automatic termination period.

<!-- section: feature-settings | objectives: 1.1.3 -->
## Feature settings: runtime, Photon, machine learning

**Databricks Runtime** (DBR) versions all include Apache Spark; the version sets the Spark and library versions. Recommendations:

| Workload | Runtime |
| --- | --- |
| All-purpose compute | The most current version |
| Operational job compute | A Long Term Support (LTS) version |
| Data science and machine learning | Databricks Runtime ML |

**Databricks Runtime ML**: select the **Machine learning** checkbox in the create compute UI. It adds the common ML and deep learning libraries and sets the access mode to **Dedicated** with your account as the user: Unity Catalog data on an ML runtime requires dedicated access mode. For GPU compute, select a GPU instance type as worker type.

**Photon** is the native vectorized C++ engine that replaces the JVM-based Spark SQL execution for supported operations.

- Always on for serverless compute, SQL warehouses and serverless pipelines; enabled by default on classic compute (**Use Photon Acceleration** checkbox under **Performance**).
- The Clusters and Jobs APIs require `"runtime_engine": "PHOTON"` explicitly; the Pipelines API uses `"photon": true`.
- Benefits: SQL and DataFrame workloads with large scans, joins, aggregations and Delta, Iceberg or Parquet writes (`MERGE`, `INSERT`, CTAS); it replaces sort-merge joins with hash joins. Predictive I/O and dynamic file pruning in `MERGE`, `UPDATE` and `DELETE` require Photon.
- No benefit: queries that finish in under two seconds. Not supported: UDFs, RDD and Dataset APIs, stateful streaming. Unsupported operations fall back to Spark transparently.
- Photon instance types consume DBUs at a different rate than the same instance without Photon.

> **Exam tip.** "Speed up SQL and DataFrame ETL on large tables" points to Photon. "The job is mostly Python UDFs" or "RDD code" means Photon won't help.

<!-- section: libraries | objectives: 1.1.4 -->
## Installing libraries

| Scope | How | Visible to |
| --- | --- | --- |
| Compute-scoped | Compute > Libraries tab > Install new (or API, CLI) | All notebooks and jobs on the compute |
| Notebook-scoped (Python, R) | `%pip install` in the notebook | That notebook session only; reinstall each session |
| Serverless | Environment side panel (base environment, dependencies) | The notebook or job task |
| Job task | Dependent libraries of the task, or a job environment | That task |

Compute-scoped library sources: Workspace files, Unity Catalog volumes, a file path or ADLS URI (`abfss://...`), PyPI, Maven, CRAN, and DBFS (not recommended: any user can modify DBFS files; storing libraries in the DBFS root is disabled by default from DBR 15.1).

```text
%pip install /Volumes/prod_shared/tools/wheels/contoso_utils-1.2.0-py3-none-any.whl
```

Rules the exam uses:

- With Unity Catalog on DBR 13.3 LTS and above, install from **volumes** on standard access mode compute and grant read access on the volume to the users.
- On standard access mode, an admin must add **Maven coordinates and JAR paths** to the **allowlist**.
- The installing identity needs read access to the file: the installing user on standard mode, the dedicated principal on dedicated mode.
- JARs can't be notebook-scoped. Notebook-scoped libraries don't affect other notebooks on the same compute.
- A notebook already attached doesn't see a new compute library until it starts a new session.
- Uninstalling shows **Uninstall pending restart** until the compute restarts. To update, uninstall the old version and install the new one (a reinstalled `requirements.txt` doesn't need this).
- A policy that enforces libraries installs them automatically and blocks any other install or uninstall.
- Python precedence: notebook-scoped (`%pip`) wins over compute-scoped, which wins over the runtime's built-in libraries.

> **Exam trap.** On serverless compute there is no Libraries tab: compute-scoped libraries, Maven and init scripts aren't supported. Use the environment or `%pip`.

<!-- section: compute-permissions | objectives: 1.1.5 -->
## Compute access permissions

| Ability | CAN ATTACH TO | CAN RESTART | CAN MANAGE |
| --- | --- | --- | --- |
| Attach a notebook, view Spark UI and metrics | Yes | Yes | Yes |
| Start, restart, terminate | No | Yes | Yes |
| Edit, resize, attach libraries | No | No | Yes |
| View driver logs | No | No | Yes |
| Modify permissions | No | No | Yes |

CAN VIEW is a Beta level. You need CAN MANAGE on a compute to change its permissions. To let CAN ATTACH TO or CAN RESTART users read driver logs, set `spark.databricks.acl.needAdminPermissionToViewLogs false` in the Spark config. Pools have NO PERMISSIONS, CAN ATTACH TO (attach a cluster to the pool) and CAN MANAGE (edit, delete, permissions).

| SQL warehouse level | Allows |
| --- | --- |
| CAN VIEW | View details, queries and monitoring; no query execution |
| CAN USE | Start the warehouse and run queries |
| CAN MONITOR | CAN USE plus view all warehouse queries and the monitoring tab |
| IS OWNER / CAN MANAGE | Also stop, edit, delete and modify permissions |

Compute permissions and Unity Catalog privileges are separate: CAN ATTACH TO lets a user run code, but each query is still checked against the user's Unity Catalog privileges on standard access mode.

> **Exam trap.** "The user must restart the cluster but not change its configuration" is CAN RESTART; "install a library" requires CAN MANAGE, not CAN RESTART.

<!-- section: key-points -->
## Key points

- Serverless first (notebooks, jobs, pipelines); classic when you need R or Scala notebooks, RDDs, init scripts, Maven or a specific VM.
- Production jobs run on job compute, not all-purpose compute; SQL and dbt tasks run on a serverless or pro SQL warehouse.
- "Shared compute" is standard access mode; ML runtime and R need dedicated access mode.
- Pools speed up starts, charge no DBUs while idle, but VMs are still billed; automatic termination is 10 to 10,000 minutes.
- Photon is on by default, helps large SQL and DataFrame work, not UDFs, RDDs or short queries.
- Install libraries from volumes; Maven and JARs need the allowlist on standard mode; uninstall needs a restart.
- CAN ATTACH TO runs code, CAN RESTART controls state, CAN MANAGE configures.
