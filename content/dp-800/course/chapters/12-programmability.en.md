Programmability objects package T-SQL in the database: views to expose a stable shape of the data, functions to compute values or return rowsets, stored procedures to run business operations, and triggers to react to changes. Exam questions show a definition to complete or fix, then ask which object type fits a requirement: "reusable in a `SELECT`", "returns several result sets", "modify rows of two tables", "runs automatically after each insert". T-SQL is shown in plain-text blocks.

<!-- section: views | objectives: 1.2.1 -->
## Views

A view is a stored `SELECT` that behaves like a table. It hides joins and columns, gives applications a stable contract while the tables change, and can be granted permissions without granting access to the tables (ownership chaining when owners match).

```text
CREATE OR ALTER VIEW Sales.vActiveCustomer
WITH SCHEMABINDING
AS
SELECT c.CustomerID, c.FullName, c.Email, c.Region
FROM Sales.Customer AS c
WHERE c.IsActive = 1
WITH CHECK OPTION;
```

| Option | Effect |
| --- | --- |
| `WITH SCHEMABINDING` | Base tables and columns used by the view can't be dropped or altered; requires two-part names and no `SELECT *` |
| `WITH CHECK OPTION` | An `INSERT` or `UPDATE` through the view must produce rows that the view still returns |
| `WITH ENCRYPTION` | Obfuscates the definition in `sys.sql_modules` |
| `WITH VIEW_METADATA` | Client APIs see the view's metadata instead of the base tables' |

Rules the exam tests:

- `ORDER BY` isn't allowed in a view unless `TOP`, `OFFSET` or `FOR JSON` is used, and even then the order of the outer query isn't guaranteed: sort in the query that reads the view.
- A view is **updatable** when the modification touches columns of only one base table and the columns aren't computed or aggregated. To update several tables through one view, write an `INSTEAD OF` trigger on the view.
- A view defined with `SELECT *` keeps its original column list; after a table change, run `sp_refreshview` (or use schema binding and explicit columns).

**Indexed views** store the result of the view: a unique clustered index materializes it, and the engine maintains it on every change to the base tables. They speed up repeated joins and aggregations at the cost of slower writes.

```text
CREATE VIEW Sales.vSalesByProduct
WITH SCHEMABINDING
AS
SELECT ol.ProductID,
       SUM(ol.Quantity * ol.UnitPrice) AS Revenue,
       COUNT_BIG(*) AS LineCount
FROM Sales.OrderLine AS ol
GROUP BY ol.ProductID;
GO
CREATE UNIQUE CLUSTERED INDEX UCX_vSalesByProduct
    ON Sales.vSalesByProduct (ProductID);
```

Requirements: `WITH SCHEMABINDING`, two-part names, deterministic expressions, `COUNT_BIG(*)` when there is a `GROUP BY`, no outer joins, no `TOP`, no subqueries, and the first index must be **unique clustered**. The `NOEXPAND` table hint forces the optimizer to use the view's index.

> **Exam trap.** A plain view stores no data and doesn't make a query faster by itself. "Precompute an aggregate that many queries reuse" is an indexed view; "hide columns from a user" is a plain view with permissions on the view only.

<!-- section: scalar-functions | objectives: 1.2.2 -->
## Scalar functions

A scalar user-defined function (UDF) returns one value and can be used wherever an expression is allowed: `SELECT` list, `WHERE`, computed column, `CHECK` or `DEFAULT` constraint.

```text
CREATE OR ALTER FUNCTION Sales.ufn_NetPrice
(
    @UnitPrice decimal(10, 2),
    @Discount  decimal(4, 3)
)
RETURNS decimal(10, 2)
WITH SCHEMABINDING, RETURNS NULL ON NULL INPUT
AS
BEGIN
    RETURN @UnitPrice * (1 - @Discount);
END;
GO
SELECT OrderLineID, Sales.ufn_NetPrice(UnitPrice, 0.1) AS NetPrice
FROM Sales.OrderLine;
```

| Rule | Detail |
| --- | --- |
| Body | `BEGIN ... END` with a final `RETURN` of the declared type |
| Call | Always with the schema name: `Sales.ufn_NetPrice(...)` |
| Side effects | Not allowed: no `INSERT`, `UPDATE` or `DELETE` on tables, no `TRY...CATCH`, no dynamic SQL, no `NEWID()` |
| `RETURNS NULL ON NULL INPUT` | Returns NULL without running the body when an argument is NULL |
| `WITH SCHEMABINDING` | Protects the referenced objects and lets the engine treat the function as deterministic when it is |
| Default arguments | Must be passed explicitly with the keyword `DEFAULT` |

**Performance.** Historically, a scalar UDF ran once per row, serially, and hid its cost from the optimizer. **Scalar UDF inlining** (database compatibility level 150 or higher) transforms an eligible function into an expression of the calling query. Check `is_inlineable` in `sys.sql_modules`; disable it for one function with `WITH INLINE = OFF`, or for a database with the `TSQL_SCALAR_UDF_INLINING` database-scoped configuration. A function that calls a time-dependent intrinsic function such as `GETDATE()` isn't inlined.

> **Exam trap.** A scalar function used in a `WHERE` clause on a column (`WHERE Sales.ufn_NetPrice(UnitPrice, 0.1) > 100`) isn't SARGable: the index on `UnitPrice` can't be sought. Rewrite the predicate on the column itself, or use an inline table-valued function.

<!-- section: table-valued-functions | objectives: 1.2.3 -->
## Table-valued functions

A table-valued function (TVF) returns a rowset and is used in a `FROM` clause, like a parameterized view.

```text
-- Inline TVF: a single SELECT, expanded into the calling query
CREATE OR ALTER FUNCTION Sales.ufn_OrdersByCustomer (@CustomerID int)
RETURNS TABLE
AS
RETURN
(
    SELECT o.OrderID, o.OrderDate, o.Amount
    FROM Sales.Orders AS o
    WHERE o.CustomerID = @CustomerID
);
GO
-- Multi-statement TVF: fills a declared table variable
CREATE OR ALTER FUNCTION Sales.ufn_TopProducts (@Year int, @Top int)
RETURNS @result TABLE (ProductID int PRIMARY KEY, Revenue decimal(14, 2))
AS
BEGIN
    INSERT INTO @result (ProductID, Revenue)
    SELECT TOP (@Top) ol.ProductID, SUM(ol.Quantity * ol.UnitPrice)
    FROM Sales.OrderLine AS ol
    JOIN Sales.Orders AS o ON o.OrderID = ol.OrderID
    WHERE YEAR(o.OrderDate) = @Year
    GROUP BY ol.ProductID
    ORDER BY SUM(ol.Quantity * ol.UnitPrice) DESC;
    RETURN;
END;
```

| | Inline TVF | Multi-statement TVF |
| --- | --- | --- |
| Header | `RETURNS TABLE` | `RETURNS @t TABLE (...)` |
| Body | `RETURN (SELECT ...)` only | `BEGIN ... END` with several statements and a bare `RETURN` |
| Optimization | Expanded into the calling query: real statistics, index seeks, parallelism | Opaque table variable with a fixed row estimate (improved by interleaved execution from compatibility level 140) |
| Updatable | Yes, like a view, when the rules of updatable views are met | No |
| Choose when | One query can express the logic (most cases) | Procedural logic is needed: loops, conditional steps |

To call a TVF once **per row** of another table, use `APPLY`:

```text
SELECT c.CustomerID, c.FullName, o.OrderID, o.Amount
FROM Sales.Customer AS c
CROSS APPLY Sales.ufn_OrdersByCustomer(c.CustomerID) AS o;  -- customers with orders

SELECT c.CustomerID, c.FullName, o.OrderID, o.Amount
FROM Sales.Customer AS c
OUTER APPLY Sales.ufn_OrdersByCustomer(c.CustomerID) AS o;  -- all customers
```

> **Exam trap.** A TVF can't be joined with `JOIN ... ON` when its argument comes from the other table: that needs `CROSS APPLY` (inner semantics) or `OUTER APPLY` (keeps rows without a match, with NULLs).

<!-- section: stored-procedures | objectives: 1.2.4 -->
## Stored procedures

A stored procedure runs one or more statements as a unit: it can modify data, manage transactions, call dynamic SQL, return several result sets, output parameters and an integer return code. It can't be used inside a `SELECT`; it is called with `EXECUTE`.

```text
CREATE OR ALTER PROCEDURE Sales.usp_PlaceOrder
    @CustomerID int,
    @Lines      Sales.OrderLineType READONLY,   -- table-valued parameter
    @Channel    varchar(10) = 'web',            -- default value
    @OrderID    int OUTPUT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM Sales.Customer WHERE CustomerID = @CustomerID)
        RETURN 1;                               -- business error code

    BEGIN TRANSACTION;
        INSERT INTO Sales.Orders (CustomerID, Channel)
        VALUES (@CustomerID, @Channel);
        SET @OrderID = SCOPE_IDENTITY();

        INSERT INTO Sales.OrderLine (OrderID, ProductID, Quantity, UnitPrice)
        SELECT @OrderID, ProductID, Quantity, UnitPrice FROM @Lines;
    COMMIT TRANSACTION;
    RETURN 0;
END;
GO
DECLARE @id int, @rc int, @lines Sales.OrderLineType;
INSERT INTO @lines VALUES (7, 2, 19.90);
EXECUTE @rc = Sales.usp_PlaceOrder @CustomerID = 42, @Lines = @lines, @OrderID = @id OUTPUT;
```

| Element | Rule |
| --- | --- |
| `OUTPUT` | Required both in the definition and in the call; without it in the call, the variable isn't set |
| `RETURN n` | Integer status only (0 = success by convention); data goes through result sets or `OUTPUT` |
| Table-valued parameter | Declared with a user-defined table type, always `READONLY` |
| `SET NOCOUNT ON` | Suppresses "n rows affected" messages: less network traffic |
| `EXECUTE AS OWNER` | The body runs with the owner's permissions: callers need only `EXECUTE` |
| `SCOPE_IDENTITY()` | Last identity value in the current scope; `@@IDENTITY` can return a value generated by a trigger |
| `WITH RECOMPILE` / `OPTION (RECOMPILE)` | New plan at each call (whole procedure / one statement): a fix for parameter sensitivity |

Stored procedures are the unit of **least privilege**: grant `EXECUTE` on the procedure (or the schema) and no permission on the tables; ownership chaining covers the tables when the owners match, but not dynamic SQL, which runs with the caller's permissions unless `EXECUTE AS` is used. Pass values to dynamic SQL through `sp_executesql` parameters, never by concatenation (SQL injection).

> **Exam trap.** A procedure returns rows through `SELECT` result sets, not through `RETURN`. "Return the new order ID to the caller" is an `OUTPUT` parameter (or a result set); `RETURN` carries only a status code.

<!-- section: triggers | objectives: 1.2.5 -->
## Triggers

A trigger is a special procedure that runs automatically. DML triggers react to `INSERT`, `UPDATE` and `DELETE`; DDL triggers to schema events (`CREATE_TABLE`, `ALTER_TABLE`, ... on the database or server, details in `EVENTDATA()`); logon triggers to sign-ins.

```text
CREATE OR ALTER TRIGGER Sales.trg_Orders_Audit
ON Sales.Orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(Amount) RETURN;

    INSERT INTO Audit.OrderAmountChange (OrderID, OldAmount, NewAmount, ChangedBy, ChangedAt)
    SELECT d.OrderID, d.Amount, i.Amount, SUSER_SNAME(), SYSUTCDATETIME()
    FROM inserted AS i
    JOIN deleted  AS d ON d.OrderID = i.OrderID
    WHERE i.Amount <> d.Amount;
END;
```

| Fact | Detail |
| --- | --- |
| `inserted` / `deleted` | Pseudo-tables: new rows (`INSERT`, `UPDATE`) and old rows (`DELETE`, `UPDATE`) |
| Firing | Once per statement, whatever the number of rows (also for 0 rows) |
| `AFTER` | On tables only; runs after the change and the constraint checks; several per action, first and last set with `sp_settriggerorder` |
| `INSTEAD OF` | On tables or views, one per action; replaces the statement: makes multi-table views updatable |
| `UPDATE(col)` | True if the column is in the `SET` list, even if the value didn't change |
| Transaction | The trigger runs inside the statement's transaction; `ROLLBACK` or `THROW` in it cancels the statement |
| Nesting | Triggers can fire other triggers up to 32 levels; direct recursion needs the `RECURSIVE_TRIGGERS` database option (off by default) |

When to use a trigger and when not:

| Requirement | Answer |
| --- | --- |
| Validate a value of the same row | `CHECK` constraint, not a trigger |
| Keep a full history of every row version | Temporal table, not a trigger |
| Write a custom audit row with business context | `AFTER` trigger |
| Update two base tables through one view | `INSTEAD OF` trigger on the view |
| Block `DROP TABLE` in production | DDL trigger `ON DATABASE FOR DROP_TABLE` with `ROLLBACK` |
| Refresh an embedding or notify another system after a change | A trigger works but adds latency to every write; prefer Change Tracking, CDC or change event streaming (see the integration chapters) |

> **Exam trap.** A trigger that reads `inserted` into variables (`SELECT @id = OrderID FROM inserted`) handles only one row: a multi-row `INSERT` silently processes a single arbitrary row. Always write set-based triggers that join `inserted` and `deleted`.

<!-- section: key-points -->
## Key points

- Views: `SCHEMABINDING` protects dependencies, `CHECK OPTION` keeps modified rows visible, no guaranteed `ORDER BY`; indexed views need schema binding, `COUNT_BIG(*)` and a unique clustered index first.
- Scalar UDFs return one value and have no side effects; inlining (level 150+) removes the row-by-row cost; a UDF on a column in `WHERE` isn't SARGable.
- Inline TVF (`RETURNS TABLE`, one `SELECT`) is optimized like a view; multi-statement TVF is opaque; `CROSS APPLY` / `OUTER APPLY` call a TVF per row.
- Procedures: `OUTPUT` in definition and call, `RETURN` for status only, TVPs are `READONLY`, `EXECUTE` permission for least privilege, `sp_executesql` with parameters.
- Triggers fire once per statement; use `inserted` and `deleted` set-based; `INSTEAD OF` for views; prefer constraints and temporal tables when they meet the need.
