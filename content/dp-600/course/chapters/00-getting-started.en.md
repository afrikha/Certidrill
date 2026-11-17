DP-600, Implementing Analytics Solutions Using Microsoft Fabric, is the exam of the Microsoft Certified: Fabric Analytics Engineer Associate certification. It targets the analytics engineer who secures and versions Fabric items, prepares data in lakehouses, warehouses and eventhouses, and builds and optimizes semantic models. Questions test judgement: you choose a store, an ingestion method, a permission or a storage mode for stated constraints, and you read and complete short T-SQL, KQL, DAX or PySpark code.

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

The three domains:

| Domain | Weight |
| --- | --- |
| Maintain a data analytics solution | 25 to 30 % |
| Prepare data | 45 to 50 % |
| Implement and manage semantic models | 25 to 30 % |

Data preparation alone weighs almost half of the score: getting data, transforming it, and querying it with SQL, KQL, DAX and the Visual query editor.

Expected formats: one answer among four or five (the most frequent), code completion with drop-down lists in T-SQL, KQL, DAX and sometimes PySpark, several answers ("each correct answer presents part of the solution"), Yes/No statements, drag and drop, ordering of steps, and rarely a hot area. In a Yes/No series, the same scenario comes back with a different solution each time and you can't go back. Questions with several elements usually give one point per correct element. Most questions cover generally available features; a commonly used preview feature can appear.

If the exam isn't available in your language, you can request 30 extra minutes. Microsoft offers a free practice assessment and an exam sandbox (`aka.ms/examdemo`) to try the interface.

> **Exam tip.** Microsoft Learn is open but searching costs minutes. Use it to confirm one value (a setting name, a limit, a function argument), never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences with named items: "You have a Fabric workspace named Workspace1 that contains a lakehouse named Lakehouse1... You need to... The solution must minimize development effort." Locate the **item** (lakehouse, warehouse, eventhouse, semantic model), the **user** and their role, then the **constraint**: it decides between several features that all work.

| Words in the question | Think of |
| --- | --- |
| "without copying the data", "data stays in ADLS" | OneLake shortcut |
| "near real time from Azure SQL Database", "no ETL" | Mirroring |
| "the team knows only T-SQL", "multi-table transactions" | Warehouse |
| "PySpark and SQL users", "files of any format" | Lakehouse |
| "telemetry", "billions of events", "time series" | Eventhouse and KQL |
| "least privilege", "only this table" | Share the item with Read only, then a T-SQL `GRANT`, or a OneLake security role |
| "users see only their region's rows in reports" | Semantic model RLS with `USERPRINCIPALNAME()` |
| "track changes and merge work of several developers" | Git integration with .pbip files |
| "promote to production with production connection strings" | Deployment pipeline with deployment rules |
| "edit the model with Tabular Editor and deploy it" | XMLA endpoint in Read Write |
| "largest data volume, fresh data, no refresh to import it" | Direct Lake |

Read the code completely. In a drop-down question, the clauses around the blank (`GROUP BY`, `summarize ... by`, `CALCULATE`, `FILTER`, `VAR ... RETURN`) often exclude half of the options.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Workspace role | Item permission | A role covers every item of the workspace; an item permission covers one shared item |
| ReadData | ReadAll | ReadData reads with T-SQL through the SQL analytics endpoint; ReadAll reads OneLake files with Spark and APIs |
| SQL row-level security | Semantic model RLS | SQL RLS filters T-SQL queries and makes Direct Lake fall back to DirectQuery; model RLS filters report viewers with DAX |
| Object-level security | Column-level security | OLS hides a table or column in a semantic model; CLS restricts columns in T-SQL |
| Git integration | Deployment pipeline | Git versions definitions of one workspace; a pipeline copies content between stage workspaces |
| .pbip | .pbit | A project is a folder of text files for source control; a template is one file that starts new reports, without data |
| .pbit | .pbids | A template carries the report and model; a data source file carries only one connection |
| XMLA Read | XMLA Read Write | Read queries and traces; Read Write deploys and changes models, and is a capacity setting |
| Shortcut | Mirroring | A shortcut points to data where it is; mirroring replicates a database into OneLake |
| Lakehouse SQL analytics endpoint | Warehouse | The endpoint is read-only T-SQL over Delta tables; the warehouse accepts T-SQL writes |
| Direct Lake on OneLake | Direct Lake on SQL analytics endpoint | On OneLake reads Delta tables directly and never falls back; on SQL can fall back to DirectQuery through the endpoint |
| Calculation group | Field parameter | A calculation group changes how measures are calculated; a field parameter lets users switch the fields of a visual |
| Iterator (SUMX) | Aggregation (SUM) | An iterator evaluates an expression row by row; an aggregation works on one column |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: security and lifecycle first, because every later scenario names a workspace, a role and an item.
2. Practice in a Fabric trial capacity: create a workspace, a lakehouse with a shortcut and a table loaded by a notebook, a warehouse loaded with `COPY INTO`, an eventhouse with a KQL table, and a Direct Lake semantic model with a report.
3. Write the code you will have to complete: T-SQL views, `GRANT` and security policies; KQL `where`, `summarize` and `bin()`; DAX measures with `CALCULATE`, variables and iterators; a short PySpark read and write to a Delta table.
4. Connect a workspace to Git, save a report as .pbip, and deploy it through a deployment pipeline with a rule.
5. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
6. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
