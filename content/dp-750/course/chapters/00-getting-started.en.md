DP-750, Implementing Data Engineering Solutions Using Azure Databricks, is the exam of the Microsoft Certified: Azure Databricks Data Engineer Associate certification. It targets the data engineer who sets up compute and Unity Catalog, secures and governs data, ingests and transforms it, and deploys and runs pipelines with Lakeflow Jobs and Databricks Asset Bundles. Questions are hands-on: you read and complete SQL, Python (PySpark) or bundle YAML, pick a compute type or an ingestion method for stated constraints, and order the steps of a pipeline or a deployment.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 120 minutes |
| Questions | Not published; plan for about 45 to 58, including one case study and one Yes/No series |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn is available during associate exams, on the same clock |
| Interactive components | The exam "may have interactive components"; no lab is announced |
| Skills measured | Study guide dated March 11, 2026 |
| Validity | One year, renewable for free with an online assessment on Microsoft Learn |

The four domains:

| Domain | Weight |
| --- | --- |
| Set up and configure an Azure Databricks environment | 15 to 20 % |
| Secure and govern Unity Catalog objects | 15 to 20 % |
| Prepare and process data | 30 to 35 % |
| Deploy and maintain data pipelines and workloads | 30 to 35 % |

Two domains carry two thirds of the score: data preparation (ingestion, transformation, data quality) and pipelines (Lakeflow Jobs, bundles, monitoring and optimization).

Expected formats: one answer among four or five (the most frequent), code completion with drop-down lists in SQL, Python or bundle YAML, several answers ("each correct answer presents part of the solution"), Yes/No statements, drag and drop, and ordering of steps. In a Yes/No series, the same scenario comes back with a different solution each time and you can't go back. Questions with several elements usually give one point per correct element. Most questions cover generally available features; a commonly used preview feature can appear.

If the exam isn't available in your language, you can request 30 extra minutes. Microsoft offers a free practice assessment and an exam sandbox (`aka.ms/examdemo`) to try the interface.

> **Exam tip.** Microsoft Learn is open but searching costs minutes. Use it to confirm one value (a privilege name, a `REFRESH` option, a bundle key), never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences: "You have an Azure Databricks workspace that contains a Unity Catalog catalog named `prod_sales`... You need to... The solution must minimize cost." Locate the **object** (`catalog.schema.table`, a volume, a job), then the **constraint**: it decides between several features that all work.

| Words in the question | Think of |
| --- | --- |
| "minimize cost", "scheduled production job" | Job compute (serverless or classic), never an all-purpose cluster left running; automatic termination |
| "no infrastructure to manage", "start immediately" | Serverless compute, serverless SQL warehouse |
| "R", "Scala notebook", "RDD", "init script", "Maven library" | Classic compute (dedicated for R) |
| "several users share", "shared compute" | Standard access mode |
| "least privilege" | The narrowest privilege (`SELECT` on one table, `READ VOLUME`) on the narrowest object, plus `USE CATALOG` and `USE SCHEMA` |
| "without copying the data", "query the database where it is" | Lakehouse Federation (foreign catalog) |
| "incrementally ingest new files", "schema evolves" | Auto Loader, in a notebook or a Lakeflow Spark Declarative Pipeline |
| "keep the files when the table is dropped" | External table or external volume |
| "only the failed tasks" | Repair a job run |
| "no secret to rotate" | Managed identity (access connector) |

Read the code completely. In a drop-down question, the keywords around the blank (`USING CONNECTION`, `MANAGED LOCATION`, `readStream`, `cloudFiles`) often exclude half of the options.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Job compute | All-purpose compute | Job compute exists for one run; all-purpose compute is interactive, shared and restarted by users |
| Serverless compute | SQL warehouse | Serverless runs notebooks, jobs and pipelines in Python and SQL; a warehouse runs only SQL, for queries, dashboards and SQL tasks |
| Standard access mode | Dedicated access mode | Standard is shared by several isolated users; dedicated is assigned to one user or group and supports R and ML runtimes |
| Managed table | External table | Unity Catalog deletes a managed table's data on drop; an external table's files stay |
| Volume | Table | A volume governs files of any format; a table governs rows and columns |
| View | Materialized view | A view stores the query; a materialized view stores and refreshes results |
| Foreign catalog | Lakeflow Connect | Federation queries the source in place, read-only; Lakeflow Connect ingests into Delta tables |
| COPY INTO | Auto Loader | COPY INTO is an idempotent SQL load of files; Auto Loader incrementally processes new files as a stream and scales to large numbers of files |
| Partitioning | Liquid clustering | Partitions are fixed directories on low-cardinality columns; liquid clustering keys can change without rewriting the table |
| OPTIMIZE | VACUUM | OPTIMIZE compacts and clusters files; VACUUM deletes files no longer referenced |
| Row filter | Column mask | A filter removes rows; a mask changes one column's values |
| Row filter or mask | ABAC policy | Filters and masks are set per table; ABAC policies apply by tag across catalogs and schemas |
| Repair run | Restart | Repair reruns only failed and dependent tasks; a new run reruns everything |
| Service principal | Managed identity | A service principal has a secret and works outside Azure; a managed identity has no secret and reaches firewalled storage |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: compute and Unity Catalog come first because every later answer depends on them.
2. Practice in a workspace with Unity Catalog: create a catalog, schemas, a volume and managed and external tables; grant privileges to a group; run a notebook on serverless and on a small classic cluster.
3. Write the code you will have to complete: `CREATE CATALOG`, `GRANT`, `COPY INTO`, Auto Loader with `readStream.format("cloudFiles")`, `MERGE INTO`, a declarative pipeline with expectations, a job with dependent tasks, and a `databricks.yml` deployed with `databricks bundle deploy`.
4. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
