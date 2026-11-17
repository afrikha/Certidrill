DP-900 checks that you understand core data concepts and that you can match a need to the right Azure data service. It doesn't ask you to build anything: every question comes down to recognizing a kind of data, a workload, a role, a SQL statement or a service.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 45 minutes of exam time |
| Questions | Not published; about 35 to 45 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Closed book: Microsoft Learn isn't available during fundamentals exams |
| Validity | Doesn't expire |
| Prerequisites | None |

The four domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Describe core data concepts | 25 to 30 % |
| Identify considerations for relational data on Azure | 20 to 25 % |
| Describe considerations for working with non-relational data on Azure | 15 to 20 % |
| Describe an analytics workload | 25 to 30 % |

Question formats: one answer among several, several answers ("select two"), series of three Yes/No statements, sentences to complete with a drop-down list, and matching by drag and drop. There is no case study and no lab. Questions with several elements give one point per correct element.

The only code is elementary SQL: you must recognize what a statement does and which family it belongs to. There is no command line and no portal procedure.

<!-- section: reading-questions -->
## Reading a question

Stems are short: one to three sentences that describe data, a need or a task. Train yourself to turn the sentence into a keyword:

| Words in the question | Think of |
| --- | --- |
| "fixed schema", "rows and columns", "every record has the same fields" | Structured data, relational database |
| "JSON documents whose fields vary from one item to another" | Semi-structured data |
| "images, video, audio, scanned documents" | Unstructured data, Azure Blob Storage |
| "records each sale as it happens", "many small reads and writes" | Transactional workload (OLTP) |
| "historical data", "trends", "reports and dashboards" | Analytical workload |
| "backs up, restores, grants access" | Database administrator |
| "builds pipelines", "ingests, cleans and transforms" | Data engineer |
| "explores data", "builds reports and visualizations" | Data analyst |
| "reduce duplicated data in tables" | Normalization |
| "new cloud application, least administration" | Azure SQL Database |
| "migrate SQL Server with minimal changes" | Azure SQL Managed Instance |
| "full control of the operating system" | SQL Server on Azure Virtual Machines |
| "file share mounted by several computers" | Azure Files |
| "key/value items, NoSQL, inside a storage account" | Azure Table storage |

In Yes/No statements, absolute words ("always", "only", "all", "never") deserve a second look: they are often what makes a statement false.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Semi-structured data | Unstructured data | Semi-structured data has fields, but they vary between items (JSON); unstructured data has no fields at all (image, video, document) |
| Transactional workload | Analytical workload | Transactional records business events with fast reads and writes; analytical reads large volumes of historical data to produce reports |
| Database administrator | Data engineer | The administrator keeps databases available, secure and backed up; the engineer moves and transforms data between systems |
| Data engineer | Data analyst | The engineer prepares the data; the analyst explores it and turns it into reports and visualizations |
| DDL | DML | DDL defines objects (`CREATE`, `ALTER`, `DROP`); DML works on rows (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) |
| `DELETE` | `DROP` | `DELETE` removes rows from a table; `DROP` removes the table itself |
| View | Index | A view is a saved query used like a virtual table; an index speeds up searches on a column |
| Azure SQL Database | Azure SQL Managed Instance | Both are PaaS; SQL Database targets new cloud applications, Managed Instance offers near-100 % compatibility with SQL Server for migrations |
| Azure SQL Managed Instance | SQL Server on Azure Virtual Machines | Managed Instance is PaaS (Azure patches and backs up); the virtual machine is IaaS (you manage everything, including the operating system) |
| Azure Blob Storage | Azure Files | Blob Storage holds objects read through an API; Azure Files provides network file shares over SMB or NFS |
| Azure Table storage | Relational table | A Table storage table holds key/value rows whose columns vary, with no foreign keys, no joins and no stored procedures |
| Data lake | Data warehouse | A data lake stores files of any format; a data warehouse stores data in relational tables optimized for queries |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order; each one is short and builds on the vocabulary of the previous ones.
2. Create a free Azure account and look at a storage account and an Azure SQL database in the portal: seeing containers, file shares, tables and a query editor makes the vocabulary concrete.
3. After each domain, take a mock exam and reread the sections linked to your mistakes.
4. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
