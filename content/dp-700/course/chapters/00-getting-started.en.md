DP-700, Implementing Data Engineering Solutions Using Microsoft Fabric, is the exam of the Microsoft Certified: Fabric Data Engineer Associate certification. It targets the data engineer who secures and deploys Fabric workspaces, orchestrates and loads data in batch and in streaming, and monitors and tunes lakehouses, warehouses, eventhouses and Spark. Questions test judgement and hands-on reading: you choose an engine, a store, a setting or a permission for stated constraints, and you read and complete PySpark, T-SQL and KQL code.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 100 minutes |
| Questions | Not published; plan for about 45 to 58, including one case study and one Yes/No series |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn is available during associate exams, on the same clock |
| Lab | None |
| Skills measured | Study guide dated October 19, 2026 |
| Validity | One year, renewable for free with an online assessment on Microsoft Learn |

The three domains weigh the same:

| Domain | Weight |
| --- | --- |
| Implement and manage an analytics solution | 30 to 35 % |
| Ingest and transform data | 30 to 35 % |
| Monitor and optimize an analytics solution | 30 to 35 % |

Monitoring and optimization is a full third of the score: reading the Monitoring hub, fixing pipeline, notebook, eventstream and T-SQL errors, and tuning Delta tables, Spark and queries are tested as much as loading data.

Expected formats: one answer among four or five (the most frequent), code completion with drop-down lists in PySpark, T-SQL or KQL, several answers ("each correct answer presents part of the solution"), Yes/No statements, drag and drop, ordering of steps, and rarely a hot area. In a Yes/No series, the same scenario comes back with a different solution each time and you can't go back. Questions with several elements usually give one point per correct element. Most questions cover generally available features; a preview feature can appear if it is commonly used.

If the exam isn't available in your language, you can request 30 extra minutes; localized versions are updated about eight weeks after the English one. Microsoft offers a free practice assessment and an exam sandbox (`aka.ms/examdemo`) to try the interface.

> **Exam tip.** Microsoft Learn is open but searching costs minutes. Use it to confirm one value (a setting name, a function argument, a limit), never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences with named items: "You have a Fabric workspace named Workspace1 that contains a lakehouse named Lakehouse1 and a warehouse named DW1... You need to... The solution must minimize development effort." Locate the **item** (lakehouse, warehouse, eventhouse, pipeline, notebook), the **user** and their role, then the **constraint**: it decides between several features that all work.

| Words in the question | Think of |
| --- | --- |
| "minimize development effort", "low-code", "Power Query" | Dataflow Gen2 or a copy job |
| "orchestrate", "run in sequence", "on failure send an email" | Pipeline |
| "complex transformations", "PySpark", "machine learning libraries" | Notebook |
| "without copying the data", "data stays in ADLS or S3" | OneLake shortcut |
| "near real time from Azure SQL Database", "no ETL" | Mirroring |
| "multi-table transactions", "the team knows only T-SQL" | Warehouse |
| "files of any format", "Spark and SQL users" | Lakehouse |
| "telemetry", "billions of events", "time series", "KQL" | Eventhouse |
| "only new or changed rows since the last run" | Incremental load with a watermark |
| "least privilege", "only this folder" | Item permission or OneLake security role, not a workspace role |
| "many small files", "queries got slower over time" | `OPTIMIZE` (and V-Order) on the Delta table |

Read the code completely. In a drop-down question, the clauses around the blank (`groupBy`, `writeStream`, `MERGE ... WHEN MATCHED`, `summarize ... by bin()`) often exclude half of the options. Check the language too: a PySpark method never completes a KQL query.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Lakehouse | Warehouse | A lakehouse stores Delta tables and files, written with Spark, and exposes a read-only SQL analytics endpoint; a warehouse accepts T-SQL writes and multi-table transactions |
| Warehouse | Eventhouse | A warehouse serves relational analytics in T-SQL; an eventhouse stores high-volume, time-based events queried in KQL |
| Dataflow Gen2 | Pipeline | A dataflow transforms data with Power Query; a pipeline orchestrates activities (copy, notebook, dataflow, conditions, loops) |
| Pipeline | Notebook | A pipeline coordinates and copies with little code; a notebook transforms with PySpark or Spark SQL code |
| Shortcut | Mirroring | A shortcut points to data where it is; mirroring replicates a database into OneLake continuously |
| Mirroring | Copy activity | Mirroring keeps a replica in sync automatically; a copy activity or copy job moves data when it runs |
| Eventstream | Spark structured streaming | An eventstream ingests, transforms and routes events without code; structured streaming processes streams with code in a notebook |
| Tumbling window | Hopping window | Tumbling windows are fixed and don't overlap; hopping windows are fixed and overlap |
| Session window | Sliding window | A session window closes after a gap without events; a sliding window is evaluated when events enter or leave it |
| Workspace role | Item permission | A role covers every item of the workspace; an item permission covers one shared item |
| Item permission | OneLake security | An item permission opens the whole item; a OneLake security role limits tables, folders, rows or columns for every engine |
| Column-level security | Dynamic data masking | CLS denies the column; masking returns the column with hidden values |
| Git integration | Deployment pipeline | Git versions item definitions; a pipeline promotes items between stage workspaces |
| Deployment pipeline | Database project | A pipeline copies Fabric items; a database project builds and publishes a warehouse schema as a .dacpac |
| `OPTIMIZE` | `VACUUM` | OPTIMIZE compacts small files into larger ones; VACUUM deletes old files that the table no longer references |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: workspace settings, lifecycle and security first, because every later scenario names a workspace, a role and an item.
2. Practice in a Fabric trial capacity: create a workspace, a lakehouse with a shortcut, a notebook that loads a Delta table with `MERGE`, a warehouse loaded with `COPY INTO`, a pipeline that runs both with parameters, an eventstream into an eventhouse, and a KQL query with `summarize` and `bin()`.
3. Write the code you will have to complete: PySpark reads, joins, `groupBy` and `writeStream`; T-SQL `MERGE`, `GRANT` and security policies; KQL `where`, `summarize`, `join` and window functions.
4. Break things on purpose: make a pipeline activity fail, a notebook hit a missing column, a shortcut lose its target, and read the error in the Monitoring hub.
5. Connect the workspace to Git, branch out, and deploy through a deployment pipeline with a default lakehouse rule.
6. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
7. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
