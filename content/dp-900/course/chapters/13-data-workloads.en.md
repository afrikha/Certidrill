A data workload is either transactional (it records what the business does, as it happens) or analytical (it reads what was recorded to understand the business). The exam gives a short description and asks which of the two it is, or which property a term such as ACID or OLTP designates.

<!-- section: transactional-workloads | objectives: 1.3.1 -->
## Transactional workloads

A **transaction** is a small, discrete unit of work: a payment, a money transfer, an order, a seat reservation. A **transactional system** records these events; the work it does is called **online transactional processing (OLTP)**.

- The volume is often high (sometimes millions of transactions a day) and each operation must be fast.
- The database is optimized for **both reads and writes**.
- The operations are **CRUD**: create, retrieve, update and delete records.
- OLTP systems support the **line-of-business (LOB) applications** that run the organization: point of sale, banking, booking, order entry.
- Operations are applied **transactionally**, which protects the integrity of the data. This guarantee is summarized by the four **ACID** properties.

Example: a transfer of 200 from account A (balance 1,000) to account B (balance 500).

| Property | Meaning | In the example |
| --- | --- | --- |
| **Atomicity** | A transaction is a single unit that succeeds completely or fails completely | The debit of A and the credit of B both happen, or neither does |
| **Consistency** | A transaction takes the database from one valid state to another valid state | After the transfer, A holds 800 and B holds 700: no money appeared or vanished |
| **Isolation** | Concurrent transactions don't interfere with one another | Someone who reads the balances during the transfer sees both old values or both new values, never a mix |
| **Durability** | Once a transaction is committed, it stays committed | The new balances survive a shutdown and restart of the database system |

> **Exam trap.** Atomicity is "all or nothing"; durability is "committed changes are never lost". A statement about a power failure after the commit tests durability, not atomicity.

<!-- section: analytical-workloads | objectives: 1.3.2 -->
## Analytical workloads

Analytical processing uses systems that are **read-only or read-mostly** and that hold large volumes of **historical data** or business metrics. The analysis is based on a snapshot of the data at a point in time, or on a series of snapshots. Its purpose is to answer questions such as "how did sales change by region over three years?".

A typical analytical solution works in four steps:

1. **Ingest.** Data from the operational systems is extracted, transformed and loaded (ETL), or extracted, loaded and then transformed (ELT), into a data lake.
2. **Structure.** The data is loaded into a schema of tables, either in a data lakehouse or in a data warehouse.
3. **Aggregate.** Data can be aggregated into a **semantic model** (historically an OLAP model, or *cube*): numeric **measures** are calculated across **dimensions**, for example sales revenue by date, customer and product.
4. **Consume.** The lake, the warehouse and the model are queried to produce reports, visualizations and dashboards.

| Store | What it is |
| --- | --- |
| **Data lake** | File-based storage for collecting and analyzing very large volumes of data |
| **Data warehouse** | Relational schema and SQL engine, optimized for read operations |
| **Data lakehouse** | Combines the flexible, scalable storage of a lake with the relational query semantics of a warehouse |
| **Semantic model** | Pre-aggregated data that lets users drill up and down through levels (region, city, address) with fast summary queries |

Different people use different layers:

| Who | Works with | To do what |
| --- | --- | --- |
| Data scientists | Data files in the data lake | Explore and model the data |
| Data analysts | Tables in the data warehouse | Produce reports and visualizations |
| Business users | Aggregated data in a semantic model | Consume reports and dashboards |

Analytical schemas may **denormalize** the data that comes from OLTP systems: some duplication is accepted so that queries run faster.

<!-- section: comparing-workloads | objectives: 1.3.1, 1.3.2 -->
## Telling the two workloads apart

| Aspect | Transactional (OLTP) | Analytical |
| --- | --- | --- |
| Purpose | Record business events as they happen | Understand the business from recorded data |
| Operations | Many small reads and writes (CRUD) | Mostly reads, often over a very large number of rows |
| Data | Current, detailed, one row per event | Historical, often aggregated, snapshots |
| Guarantee | ACID transactions | Fast queries over large volumes |
| Design | Optimized for reads and writes | Optimized for reads; may be denormalized |
| Users | Line-of-business applications and their users | Data scientists, data analysts, business users |

| Scenario in the question | Workload |
| --- | --- |
| A point-of-sale application records each purchase | Transactional |
| A bank moves money between two accounts | Transactional |
| A website updates the stock level when an order is placed | Transactional |
| A dashboard shows monthly revenue by product line for five years | Analytical |
| An analyst looks for seasonal trends in sales | Analytical |
| A nightly process copies the day's orders into a data warehouse | Analytical (ingestion step) |

> **Exam trap.** OLTP and OLAP differ by one letter. OL**T**P is transactional processing; OL**A**P is analytical. An analytical system doesn't record the transactions: it receives a copy of the data that the transactional systems produced.

> **Exam tip.** "Read and write", "integrity", "ACID", "line-of-business application" point to transactional. "Historical", "aggregate", "trends", "reports", "read-only" point to analytical.

<!-- section: key-points -->
## Key points

- Transaction: a small, discrete unit of work. OLTP: high volume, fast, optimized for reads and writes, CRUD operations.
- ACID: atomicity (all or nothing), consistency (valid state to valid state), isolation (no interference), durability (committed stays committed).
- Analytical: read-only or read-mostly, historical data, snapshots, reports and dashboards.
- Analytical steps: ingest (ETL or ELT), structure (lakehouse or warehouse), aggregate (semantic model), consume.
- Data scientists use the lake, data analysts the warehouse, business users the semantic model.
