DP-800 is the exam of the Microsoft Certified: SQL AI Developer Associate certification. It targets a database developer who designs and builds solutions on SQL Server, Azure SQL and SQL database in Microsoft Fabric, and who adds AI capabilities to them: embeddings, vector and hybrid search, calls to language models from T-SQL. It tests what you write and configure: most questions show T-SQL, a Data API builder configuration or a deployment pipeline to read, complete or fix, or a set of constraints that decides which feature to use.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 120 minutes of exam time |
| Questions | Not published; plan for about 45 to 58, including one case study and one "does the solution meet the goal" series |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn is available during the exam, but searching it costs time: use it to confirm a syntax, not to learn a topic |
| Labs | None announced on Microsoft Learn |
| Skills measured | Study guide "as of March 12, 2026"; the French page already shows an October 19, 2026 version with minor changes |
| Preview features | Most questions cover generally available features; a preview feature can appear if it is commonly used |
| Validity | One year, renewable for free with an online assessment on Microsoft Learn |

The three domains:

| Domain | Weight |
| --- | --- |
| Design and develop database solutions | 35 to 40 % |
| Secure, optimize, and deploy database solutions | 35 to 40 % |
| Implement AI capabilities in database solutions | 25 to 30 % |

Expected formats: one answer among four or five (the most frequent), code with two to four drop-down lists to complete, several answers ("each correct answer presents part of the solution"), Yes/No statements, drag and drop of code fragments, and ordering of deployment steps. In a "does the solution meet the goal" series, the same scenario comes back with a different solution each time, and you can't go back to a previous question of the series. Questions with several elements usually give one point per correct element.

If the exam isn't available in your language, you can request 30 extra minutes.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences: a fictional company, a table definition or a code excerpt, then the constraints that decide the answer: least privilege, no change to the application, latency, cost, the platform (SQL Server 2022, SQL Server 2025, Azure SQL Database, SQL database in Fabric). Underline the constraints and the platform first: many recent features exist only on some platforms or need a compatibility level.

| Words in the question | Think of |
| --- | --- |
| "query the data as it was on a past date" | Temporal table and `FOR SYSTEM_TIME AS OF` |
| "prove that no one, including administrators, altered the rows" | Ledger table, digests in immutable storage |
| "query Parquet files without loading them" | External table (data virtualization) |
| "store and query JSON documents, index one property" | `json` column with `CREATE JSON INDEX`, or a `JSON_VALUE` computed column |
| "the same number series for several tables" | Sequence |
| "remove a year of data instantly" | Partition `SWITCH` or `TRUNCATE ... WITH (PARTITIONS (...))` |
| "reusable in a `FROM` clause with a parameter" | Inline table-valued function |
| "users run it without permissions on the tables" | Stored procedure with `EXECUTE` permission |
| "validate an email format in a constraint" | `CHECK` with `REGEXP_LIKE` (compatibility level 170) |
| "match names despite typos" | `EDIT_DISTANCE`, `JARO_WINKLER_SIMILARITY` (preview) |
| "the admins must never see the plaintext" | Always Encrypted |
| "show only the last four digits to support staff" | Dynamic Data Masking |
| "each sales rep sees only their region's rows" | Row-Level Security |
| "find documents with a similar meaning" | Embeddings and vector search |
| "exact keywords and meaning together" | Hybrid search with reciprocal rank fusion |
| "expose tables as REST and GraphQL without writing an API" | Data API builder |
| "push every row change to Azure Event Hubs" | Change event streaming |

Code questions show T-SQL with blanks: the clause that makes a CTE recursive, the frame of a window function, the null clause of `JSON_OBJECT`, the argument order of `REGEXP_REPLACE`. Read every snippet of this course until you can say what each line does. T-SQL in this course is shown in plain-text blocks.

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Temporal table | Ledger table | Temporal keeps queryable history; ledger makes tampering detectable and can't be turned off |
| Inline table-valued function | Multi-statement table-valued function | Inline is one `SELECT` expanded into the query; multi-statement fills a table variable that the optimizer sees as opaque |
| Scalar function | Table-valued function | A scalar function returns one value in an expression; a TVF returns rows in `FROM` |
| `CROSS APPLY` | `OUTER APPLY` | `CROSS` drops outer rows without a result; `OUTER` keeps them with NULLs |
| `RANK` | `DENSE_RANK` | After a tie, `RANK` skips numbers, `DENSE_RANK` doesn't |
| `JSON_VALUE` | `JSON_QUERY` | `JSON_VALUE` returns a scalar; `JSON_QUERY` returns an object or array |
| `THROW` | `RAISERROR` | `THROW` is the modern way, severity 16, re-raises with `THROW;`; `RAISERROR` is older and ignores `XACT_ABORT` |
| Always Encrypted | Column-level encryption | Always Encrypted encrypts in the client driver, so the engine never sees plaintext; column-level encryption uses keys inside the database |
| Dynamic Data Masking | Row-Level Security | Masking hides parts of values in results; RLS filters which rows are returned |
| Change Tracking | Change data capture (CDC) | Change Tracking records which rows changed; CDC also keeps the changed values |
| CDC | Change event streaming (CES) | CDC stores changes in tables inside the database; CES (preview) streams them as CloudEvents to Azure Event Hubs or Fabric Eventstream |
| READ COMMITTED SNAPSHOT | SNAPSHOT isolation | RCSI gives each statement a consistent version; SNAPSHOT gives the whole transaction one, with update conflicts |
| Full-text search | Vector search | Full-text matches words and forms; vector search matches meaning through embeddings |
| ENN (exact) | ANN (approximate) | ENN compares the query with every vector, exact but slow at scale; ANN uses a vector index, fast with a small loss of recall |
| REST endpoint | GraphQL endpoint | REST exposes one URL per entity; GraphQL lets the client choose fields and follow relationships in one query |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the T-SQL module gives the vocabulary that the security, performance, integration and AI modules reuse.
2. Install SQL Server 2025 Developer edition or create a small Azure SQL Database, set the compatibility level to 170, and run every snippet of this course; change one argument at a time to see its effect.
3. Build a small project end to end: a table with a `json` column, a few procedures, a SQL database project in source control, a Data API builder configuration, then embeddings and a vector query.
4. For every recent function, note the platforms and settings it needs (SQL Server 2025, compatibility level 170, preview features): questions often hinge on them.
5. Practise finding a page on Microsoft Learn quickly (T-SQL reference, Data API builder configuration reference): during the exam it is your reference.
6. After each module, take a mock exam and reread the sections linked to your mistakes. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
