Three roles share most of the work on data: the database administrator, the data engineer and the data analyst. The exam describes a task, or lists a few, and asks which role is responsible for it. Organizations may name the roles differently, and one person may hold several of them.

<!-- section: database-administrator | objectives: 1.4.1 -->
## Database administrators

A **database administrator** manages databases: the design, implementation, maintenance and operation of database systems, on-premises and in the cloud.

- Keeps databases **available**, with consistent **performance**, and optimizes them.
- Defines and implements **backup and recovery** policies, tools and processes, so that data can be restored after a disaster or a human error.
- Manages the **security of the data** in the database: grants privileges over data, grants or denies access to users.
- On Azure, provisions and manages database services such as Azure SQL, Azure Database for MySQL and Azure Database for PostgreSQL.

The SQL statements `GRANT`, `DENY` and `REVOKE`, which control permissions, belong to the administrator's daily work.

> **Exam trap.** The administrator restores a database after a failure and decides who can read a table. The administrator doesn't build the pipelines that load a data warehouse (data engineer) and doesn't design reports (data analyst).

<!-- section: data-engineer | objectives: 1.4.2 -->
## Data engineers

A **data engineer** manages the infrastructure and the processes that **integrate data** across the organization.

- Designs and implements data workloads with the stakeholders: **ingestion pipelines**, **cleansing and transformation** of data, and the **data stores for analytical workloads**.
- Works with many technologies: relational and non-relational databases, file stores and data streams.
- Identifies **data governance** rules and makes sure that **data privacy** is maintained in the cloud and between on-premises and cloud data stores.
- Owns the management and monitoring of **data pipelines**, so that data loads run as expected.

Typical services of the data engineer: Azure Data Factory (defining and scheduling pipelines that transfer and transform data), Microsoft Fabric, Azure Databricks, Azure Stream Analytics (processing streams of data in real time), Azure Storage (hosting data lakes) and Microsoft Purview (governance and data lineage).

<!-- section: data-analyst | objectives: 1.4.3 -->
## Data analysts

A **data analyst** helps the organization get the most value from its data assets.

- **Explores and analyzes** data to identify trends and relationships.
- Designs and builds **analytical models**.
- Creates **reports and visualizations** that turn raw data into insights matching the business requirements, so that decisions are informed.

The main tool of the data analyst is **Power BI**: connecting to data sources, building interactive reports and dashboards, and sharing them. An analyst can also query log and telemetry data in Azure Data Explorer, or query and visualize data in the notebooks of Azure Databricks.

> **Exam trap.** Both the data engineer and the data analyst "transform" and "model" data. The engineer does it to load clean data into the analytical stores; the analyst does it afterwards, to build the models and reports that business users read.

<!-- section: matching-roles | objectives: 1.4.1, 1.4.2, 1.4.3 -->
## Matching a task to a role

| Task in the question | Role |
| --- | --- |
| Back up a database and restore it after a failure | Database administrator |
| Grant a user permission to read a table | Database administrator |
| Monitor and tune the performance of a database server | Database administrator |
| Plan the availability of a database during maintenance | Database administrator |
| Build a pipeline that ingests sales files every night | Data engineer |
| Clean and transform raw data before it is loaded into a data warehouse | Data engineer |
| Monitor data loads and fix a failed pipeline | Data engineer |
| Apply data governance and privacy rules to data that moves between systems | Data engineer |
| Create a report that shows revenue by region | Data analyst |
| Explore data to find trends and relationships | Data analyst |
| Build an analytical model for self-service reporting | Data analyst |

The same Azure service is seen differently by each role. For Azure SQL:

| Role | What the role does with the service |
| --- | --- |
| Database administrator | Provisions and manages the databases |
| Data engineer | Uses them as a source for the pipelines that ingest transactional data into analytical systems |
| Data analyst | Queries them for reports, most often after the data has been combined with other sources in an analytical data store |

Microsoft Learn names other roles, which are not objectives of this exam: the **AI engineer**, who builds AI-powered features with tools such as Microsoft Foundry, the data scientist, the data architect and the application developer. AI assistants don't change the split: AI tools help draft queries, generate transformation code or suggest visualizations, but each role keeps its responsibilities.

> **Exam tip.** Find the verb. Back up, restore, secure, grant: administrator. Ingest, pipeline, clean, load: engineer. Explore, visualize, report: analyst.

<!-- section: key-points -->
## Key points

- Database administrator: availability, performance, backup and recovery, security and access to databases.
- Data engineer: data integration, ingestion pipelines, cleansing and transformation, analytical data stores, governance and privacy, pipeline monitoring.
- Data analyst: exploring data, analytical models, reports and visualizations for decisions.
- Power BI is the analyst's tool; Azure Data Factory builds the engineer's pipelines; the administrator provisions and manages database services.
- One person can hold several roles; the question is about the task, not the job title.
