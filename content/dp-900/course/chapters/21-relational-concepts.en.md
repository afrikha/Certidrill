A relational database stores structured data in tables that reference one another. The exam checks four things: the vocabulary of tables, the purpose of normalization, the family and effect of a SQL statement, and the role of views, stored procedures and indexes.

<!-- section: relational-data | objectives: 2.1.1 -->
## Features of relational data

- Each **table** models a collection of **entities**: customers, products, orders.
- Each **row** is one instance of the entity (one customer, one order).
- Every row of a table has the same **columns**; each column stores values of one **data type** (text, integer, decimal, date and time). The available types depend on the database system, around a common set defined by the ANSI standard.
- A column doesn't need a value in every row: an empty value is **NULL** (an unknown or absent middle name, for example).
- Tables are linked by **keys**, which is what makes the model relational.

<!-- section: normalization | objectives: 2.1.2 -->
## Normalization and why it is used

**Normalization** is the schema design process that **minimizes the duplication of data and enforces data integrity**. Its practical rules:

1. Separate each **entity** into its own table.
2. Separate each discrete **attribute** into its own column.
3. Identify each row uniquely with a **primary key**.
4. Use **foreign key** columns to link related entities.

Before normalization, one table repeats the customer and the product on every line and mixes several attributes in one cell:

| OrderNo | Customer | Product | Qty |
| --- | --- | --- | --- |
| 1001 | Ana Ruiz, 4 Harbor St, Lisbon | Kettle (24.50) | 1 |
| 1001 | Ana Ruiz, 4 Harbor St, Lisbon | Toaster (31.00) | 2 |
| 1002 | Kenji Sato, 9 Hill Rd, Osaka | Kettle (24.50) | 3 |

After normalization:

| Table | Primary key | Foreign keys |
| --- | --- | --- |
| Customer | CustomerID | None |
| Product | ProductID | None |
| SalesOrder | OrderNo | CustomerID (to Customer) |
| LineItem | OrderNo + ItemNo (composite key) | OrderNo (to SalesOrder), ProductID (to Product) |

- A **primary key** uniquely identifies each row. A **composite key** is a key made of several columns.
- A **foreign key** holds the primary key of the related row in another table. The database can enforce **referential integrity**: no order for a customer that doesn't exist.
- Benefits: each fact is stored once (changing an address modifies one row), each column has an enforced data type, and queries can filter on individual attributes such as the city.

> **Exam trap.** Normalization reduces duplicated data; it doesn't make read queries faster. Reading normalized data requires joins between tables, which is why analytical stores often denormalize.

<!-- section: sql-statements | objectives: 2.1.3 -->
## Common SQL statements

SQL is standardized by ANSI and ISO, and each vendor adds its dialect: **Transact-SQL (T-SQL)** for SQL Server and the Azure SQL services, **PL/pgSQL** for PostgreSQL, **PL/SQL** for Oracle.

| Family | Purpose | Statements |
| --- | --- | --- |
| **DDL**, data definition language | Create, modify and remove objects (tables, views, stored procedures) | `CREATE`, `ALTER`, `DROP`, `RENAME` |
| **DCL**, data control language | Manage permissions; mostly used by database administrators | `GRANT`, `DENY`, `REVOKE` |
| **DML**, data manipulation language | Query and change the rows of tables | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

```text
CREATE TABLE Customer
(
    CustomerID INT PRIMARY KEY,
    Email VARCHAR(100) NOT NULL,
    City VARCHAR(50) NULL
);

GRANT SELECT, INSERT
ON Customer
TO analyst1;

INSERT INTO Customer (CustomerID, Email, City)
VALUES (4, 'omar@contoso.com', 'Rabat');

UPDATE Customer
SET City = 'Porto'
WHERE CustomerID = 1;

DELETE FROM Customer
WHERE CustomerID = 4;

SELECT c.Email, o.OrderDate
FROM SalesOrder AS o
JOIN Customer AS c
    ON o.CustomerID = c.CustomerID
WHERE c.City = 'Lyon'
ORDER BY o.OrderDate;
```

- `WHERE` filters the rows. Without it, `UPDATE` modifies **every** row and `DELETE` removes **every** row of the table.
- `JOIN ... ON` combines the rows of two tables, usually by matching a foreign key with its primary key.
- `ORDER BY` sorts the result; without it, the order of the rows isn't guaranteed.
- `GRANT` gives a permission, `DENY` refuses it, `REVOKE` removes a permission that was granted.

> **Exam trap.** `DELETE` (DML) removes rows and keeps the table; `DROP` (DDL) removes the table with all its rows. Microsoft Learn classifies `SELECT` in DML; some sources put queries in a separate family called DQL.

<!-- section: database-objects | objectives: 2.1.4 -->
## Common database objects

```text
CREATE VIEW LyonCustomers
AS
SELECT CustomerID, Email
FROM Customer
WHERE City = 'Lyon';

CREATE PROCEDURE ChangeCity
    @CustomerID INT,
    @City VARCHAR(50)
AS
UPDATE Customer
SET City = @City
WHERE CustomerID = @CustomerID;

EXEC ChangeCity 1, 'Porto';

CREATE INDEX idx_Customer_City
ON Customer(City);
```

| Object | What it is | Use |
| --- | --- | --- |
| **Table** | Rows and columns that store the data | Hold the entities |
| **View** | A virtual table based on the result of a `SELECT` query; it is queried like a table | Reuse a query, for example a join, and expose only some rows or columns |
| **Stored procedure** | SQL statements saved in the database and run on command, with optional parameters | Encapsulate the logic of an action that applications perform |
| **Index** | A sorted copy of the values of a column, with pointers to the rows | Find rows faster when the column is used in a `WHERE` clause |

An index has a cost: it consumes storage, and it must be maintained at every insert, update and delete, which slows down those operations. A table can have several indexes; they are most useful on tables with many rows.

> **Exam tip.** "Simplify a complex query" or "virtual table": view. "Run the same logic with parameters": stored procedure. "Speed up searches": index.

<!-- section: key-points -->
## Key points

- Table: entity. Row: instance. Column: attribute with a data type. NULL: no value.
- Normalization minimizes duplication and enforces integrity: one table per entity, primary keys, foreign keys.
- Composite key: several columns. Referential integrity: a foreign key must match an existing primary key.
- DDL: `CREATE`, `ALTER`, `DROP`, `RENAME`. DCL: `GRANT`, `DENY`, `REVOKE`. DML: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- View: virtual table. Stored procedure: saved statements with parameters. Index: faster searches, slower writes.
