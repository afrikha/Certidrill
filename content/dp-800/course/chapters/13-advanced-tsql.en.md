This chapter covers the T-SQL that DP-800 asks you to read, complete and debug: common table expressions, window functions, the JSON, regular expression and fuzzy matching functions added in SQL Server 2022 and 2025, graph queries, correlated subqueries and error handling. Expect code with blanks, a wrong result to explain, or a platform and compatibility level to check before choosing a function. T-SQL is shown in plain-text blocks.

<!-- section: ctes | objectives: 1.3.1 -->
## Common table expressions

A CTE names a query for the single statement that follows it. It makes multi-step logic readable and lets you filter on computed columns, such as a window function result.

```text
WITH OrderTotals AS
(
    SELECT CustomerID, SUM(Amount) AS Total
    FROM Sales.Orders
    GROUP BY CustomerID
),
Ranked AS
(
    SELECT CustomerID, Total,
           DENSE_RANK() OVER (ORDER BY Total DESC) AS Rnk
    FROM OrderTotals
)
SELECT CustomerID, Total
FROM Ranked
WHERE Rnk <= 10;
```

A **recursive CTE** walks hierarchies (managers, bills of materials, category trees): an anchor member, `UNION ALL`, and a recursive member that references the CTE.

```text
WITH OrgChart AS
(
    SELECT EmployeeID, ManagerID, FullName, 0 AS Depth
    FROM HR.Employee
    WHERE ManagerID IS NULL                      -- anchor
    UNION ALL
    SELECT e.EmployeeID, e.ManagerID, e.FullName, oc.Depth + 1
    FROM HR.Employee AS e
    JOIN OrgChart AS oc ON e.ManagerID = oc.EmployeeID   -- recursive member
)
SELECT EmployeeID, FullName, Depth
FROM OrgChart
OPTION (MAXRECURSION 500);
```

| Rule | Detail |
| --- | --- |
| Scope | Only the next `SELECT`, `INSERT`, `UPDATE`, `DELETE` or `MERGE` |
| Several CTEs | One `WITH`, separated by commas; a later CTE can reference an earlier one |
| Preceding statement | Must end with a semicolon |
| Recursion limit | 100 levels by default; `OPTION (MAXRECURSION n)` up to 32,767, `0` for no limit |
| Materialization | None: a CTE referenced twice is evaluated twice; use a temporary table to reuse a costly result |

> **Exam trap.** Error 530 ("maximum recursion 100 has been exhausted") on a deep but finite hierarchy is fixed with `OPTION (MAXRECURSION ...)` on the outer statement, not inside the CTE. On a cyclic hierarchy, fix the data or stop the recursion with a depth condition.

<!-- section: window-functions | objectives: 1.3.2 -->
## Window functions

A window function computes a value over a set of rows related to the current row without collapsing them, unlike `GROUP BY`.

```text
SELECT OrderID, CustomerID, OrderDate, Amount,
       ROW_NUMBER() OVER (PARTITION BY CustomerID ORDER BY OrderDate DESC) AS RecentRank,
       LAG(Amount, 1, 0) OVER (PARTITION BY CustomerID ORDER BY OrderDate) AS PreviousAmount,
       SUM(Amount) OVER (PARTITION BY CustomerID ORDER BY OrderDate
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningTotal,
       AVG(Amount) OVER (ORDER BY OrderDate
                         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS MovingAvg7
FROM Sales.Orders;
```

| Family | Functions | Notes |
| --- | --- | --- |
| Ranking | `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE(n)` | Ties: `ROW_NUMBER` 1,2,3; `RANK` 1,1,3; `DENSE_RANK` 1,1,2 |
| Offset | `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE` | `LAG(col, offset, default)`: offset 1 and NULL by default |
| Aggregate | `SUM`, `AVG`, `COUNT`, `MIN`, `MAX` with `OVER` | Running totals, moving averages, share of total |
| Distribution | `PERCENT_RANK`, `CUME_DIST`, `PERCENTILE_CONT`, `PERCENTILE_DISC` | Percentiles use `WITHIN GROUP (ORDER BY ...)` |

Frame rules: with `ORDER BY` and no frame, the default is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which includes all **ties** of the current row and spills to disk more easily; write `ROWS` explicitly for a running total. SQL Server 2022 added the `WINDOW` clause to name a window once, and `IGNORE NULLS` for `FIRST_VALUE`, `LAST_VALUE`, `LAG` and `LEAD`.

> **Exam trap.** `LAST_VALUE(x) OVER (ORDER BY d)` returns the current row's value because the default frame ends at the current row. Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. And a window function can't appear in `WHERE`: compute it in a CTE, then filter.

<!-- section: json-functions | objectives: 1.3.3 -->
## JSON functions

| Function | Returns | Platform |
| --- | --- | --- |
| `JSON_OBJECT('k':v, ...)` | An object; default `NULL ON NULL` | SQL Server 2022 and later, Azure SQL, SQL database in Fabric |
| `JSON_ARRAY(v, ...)` | An array; default `ABSENT ON NULL` | Same |
| `JSON_ARRAYAGG(v ORDER BY ...)` | An array aggregated over rows; default `ABSENT ON NULL` | SQL Server 2025, Azure SQL, Fabric |
| `JSON_CONTAINS(doc, value, path)` | 1, 0 or NULL | SQL Server 2025, Azure SQL, SQL database in Fabric |
| `JSON_VALUE(doc, path)` | A scalar, `nvarchar(4000)` | All |
| `JSON_QUERY(doc, path)` | An object or array | All |
| `OPENJSON(doc, path) WITH (...)` | Rows and typed columns | Compatibility level 130 or higher |

Constructors accept `RETURNING json` to return the `json` type instead of `nvarchar(max)`.

```text
-- Shape relational rows as one JSON document per customer
SELECT c.CustomerID,
       JSON_OBJECT('id': c.CustomerID,
                   'name': c.FullName,
                   'email': c.Email,
                   'orders': (SELECT JSON_ARRAYAGG(o.OrderID ORDER BY o.OrderDate)
                              FROM Sales.Orders AS o
                              WHERE o.CustomerID = c.CustomerID)
                   ABSENT ON NULL) AS Doc   -- omit keys whose value is NULL
FROM Sales.Customer AS c;

-- Shred a JSON array into typed rows
DECLARE @payload nvarchar(max) =
    N'{"order":{"id":981,"lines":[{"sku":"A-12","qty":2},{"sku":"B-07","qty":1}]}}';

SELECT JSON_VALUE(@payload, '$.order.id') AS OrderID, l.Sku, l.Qty
FROM OPENJSON(@payload, '$.order.lines')
     WITH (Sku varchar(20) '$.sku',
           Qty int         '$.qty') AS l;

-- Filter documents that contain a value in an array
SELECT CustomerID
FROM Sales.CustomerProfile
WHERE JSON_CONTAINS(Profile, 'vip', '$.tags[*]') = 1;
```

Path rules: paths are case-sensitive; **lax** mode (default) returns NULL when a path doesn't exist or doesn't point to the right kind of value, **strict** mode (`'strict $.order.id'`) raises an error. `JSON_VALUE` returns NULL in lax mode for objects, arrays and values longer than 4,000 characters; `JSON_QUERY` returns objects and arrays. In `OPENJSON ... WITH`, a column that returns a nested object needs `nvarchar(max) AS JSON`. In SQL Server 2025, `JSON_VALUE(doc, path RETURNING int)` returns a typed value. `JSON_CONTAINS` currently requires the path, with a wildcard (`[*]`) when it targets an array.

> **Exam trap.** `JSON_VALUE(doc, '$.order.lines')` returns NULL, not the array: use `JSON_QUERY` or `OPENJSON`. And `JSON_OBJECT` keeps NULL keys by default while `JSON_ARRAY` and `JSON_ARRAYAGG` drop NULL elements by default.

<!-- section: regular-expressions | objectives: 1.3.4 -->
## Regular expressions

The `REGEXP_*` functions (SQL Server 2025, Azure SQL Database, SQL database in Fabric, Azure SQL Managed Instance with the SQL Server 2025 or Always-up-to-date update policy) use RE2 syntax. They don't exist in SQL Server 2022.

| Function | Signature | Returns |
| --- | --- | --- |
| `REGEXP_LIKE` | `(string, pattern [, flags])` | Boolean, for `WHERE` and `CHECK`; needs compatibility level 170 |
| `REGEXP_REPLACE` | `(string, pattern [, replacement [, start [, occurrence [, flags]]]])` | String; occurrence `0` (default) replaces all; `\1` to `\9` back-references |
| `REGEXP_SUBSTR` | `(string, pattern [, start [, occurrence [, flags [, group]]]])` | The nth match or capture group, NULL if none |
| `REGEXP_INSTR` | `(string, pattern [, start [, occurrence [, return_option [, flags [, group]]]]])` | Start position (`0`) or end position (`1`); 0 if none |
| `REGEXP_COUNT` | `(string, pattern [, start [, flags]])` | Number of matches |
| `REGEXP_MATCHES` | Table-valued `(string, pattern [, flags])` | One row per match: `match_id`, `start_position`, `end_position`, `match_value`, `substring_matches` (json) |
| `REGEXP_SPLIT_TO_TABLE` | Table-valued `(string, pattern [, flags])` | `value`, `ordinal` |

```text
ALTER DATABASE CURRENT SET COMPATIBILITY_LEVEL = 170;

CREATE TABLE Sales.Contact
(
    ContactID int PRIMARY KEY,
    Email     varchar(320)
        CHECK (REGEXP_LIKE(Email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
    Phone     varchar(20)
);

SELECT ContactID,
       REGEXP_REPLACE(Phone, '(\d{3})-(\d{3})-(\d{4})', '(\1) \2-\3') AS Formatted,
       REGEXP_SUBSTR(Email, '@(.+)$', 1, 1, 'i', 1) AS EmailDomain
FROM Sales.Contact
WHERE REGEXP_LIKE(Email, '@contoso\.com$', 'i');

SELECT m.match_value
FROM REGEXP_MATCHES('Ticket #A-102 replaces #A-099', '#([A-Z]-\d+)') AS m;
```

Flags: `i` case-insensitive, `c` case-sensitive (default), `m` multi-line `^` and `$`, `s` lets `.` match a newline; when flags conflict, the last one wins. Inputs up to 2 MB, patterns up to 8,000 bytes. The two table-valued functions need compatibility level 170 unless the `ALLOW_BUILTIN_TVF_IN_ALL_COMPAT_LEVELS` database-scoped configuration is on. Regular expressions ignore collation rules, and `REGEXP_LIKE` can use an index seek only when the pattern starts with `^`.

> **Exam trap.** "`REGEXP_LIKE` isn't recognized" on Azure SQL Database means a compatibility level below 170. The other scalar `REGEXP_*` functions work at any level, so they aren't proof that the level is high enough.

<!-- section: fuzzy-matching | objectives: 1.3.5 -->
## Fuzzy string matching

Fuzzy functions find near-duplicates and typos that `LIKE` and regular expressions miss: "Contoso Ltd" against "Contosso Ltd.", "Colour" against "Color". They are in **preview**; in SQL Server 2025 they require `ALTER DATABASE SCOPED CONFIGURATION SET PREVIEW_FEATURES = ON`.

| Function | Returns | Meaning |
| --- | --- | --- |
| `EDIT_DISTANCE(a, b [, max])` | `int` | Insertions, deletions, substitutions and transpositions (Damerau-Levenshtein, optimal string alignment); 0 = identical; above `max` returns `max + 1` |
| `EDIT_DISTANCE_SIMILARITY(a, b)` | `int`, 0 to 100 | `(1 - distance / longer length) * 100`; 100 = identical |
| `JARO_WINKLER_DISTANCE(a, b)` | `float` | Lower = closer; favors strings that match from the beginning |
| `JARO_WINKLER_SIMILARITY(a, b)` | 0 to 100 | Higher = closer |

```text
ALTER DATABASE SCOPED CONFIGURATION SET PREVIEW_FEATURES = ON;

SELECT s.SupplierID, s.SupplierName, c.CandidateName,
       EDIT_DISTANCE_SIMILARITY(s.SupplierName, c.CandidateName) AS Similarity
FROM Purchasing.Supplier AS s
JOIN Staging.SupplierCandidate AS c
     ON LEFT(s.SupplierName, 1) = LEFT(c.CandidateName, 1)   -- cheap blocking predicate
WHERE EDIT_DISTANCE(s.SupplierName, c.CandidateName, 3) <= 2;
```

Arguments can't be `varchar(max)` or `nvarchar(max)`; NULL input returns NULL; non-binary `SQL_*` collations aren't supported (apply a Windows or binary collation with `COLLATE`). Every comparison is computed row by row, so reduce the candidate pairs first. Choose edit distance for typos in codes and short strings, Jaro-Winkler for names where the beginning matters most.

> **Exam trap.** Distance and similarity go in opposite directions: filter `EDIT_DISTANCE(...) <= 2` but `EDIT_DISTANCE_SIMILARITY(...) >= 80`. A query that keeps rows with a high distance returns the least similar strings.

<!-- section: graph-match | objectives: 1.3.6 -->
## Graph queries with MATCH

`MATCH` traverses node and edge tables with an ASCII-art pattern in the `WHERE` clause. With the `Graph.Person`, `Graph.Product` and `Graph.Bought` tables of the database objects chapter, plus a `Graph.FriendOf` edge between people:

```text
-- Products bought by the friends of Ana
SELECT DISTINCT p2.FullName AS Friend, pr.ProductName
FROM Graph.Person AS p1, Graph.FriendOf AS f,
     Graph.Person AS p2, Graph.Bought AS b, Graph.Product AS pr
WHERE MATCH(p1-(f)->p2-(b)->pr)
  AND p1.FullName = N'Ana';

-- Shortest friend chain from Ana to everyone up to 3 hops away
SELECT p1.FullName,
       STRING_AGG(p2.FullName, '->') WITHIN GROUP (GRAPH PATH) AS Path,
       LAST_VALUE(p2.FullName) WITHIN GROUP (GRAPH PATH) AS Reached
FROM Graph.Person AS p1,
     Graph.FriendOf FOR PATH AS f,
     Graph.Person FOR PATH AS p2
WHERE MATCH(SHORTEST_PATH(p1(-(f)->p2){1,3}))
  AND p1.FullName = N'Ana';
```

| Rule | Detail |
| --- | --- |
| Tables | Every node and edge in the pattern is listed in `FROM` (comma-separated, with aliases) |
| Direction | Required: `a-(e)->b` and `b<-(e)-a` are the same relationship |
| Repetition | A node alias can repeat in a pattern; an edge alias can't |
| Combining | `MATCH` combines with other predicates by `AND` only; no `OR` or `NOT` |
| Two paths to one node | `MATCH(a-(e1)->x AND b-(e2)->x)` or `MATCH(a-(e1)->x<-(e2)-b)` |
| Arbitrary length | `SHORTEST_PATH` with `+` (1 or more) or `{1,n}`; the repeated tables are marked `FOR PATH` and their columns are read only through `STRING_AGG`, `LAST_VALUE`, `COUNT`, `SUM`, `AVG`, `MIN` or `MAX` `WITHIN GROUP (GRAPH PATH)` |
| `LAST_NODE` | Inside `SHORTEST_PATH` only: starts a pattern at, or merges two patterns on, the last node of a path |

> **Exam trap.** Joining `$from_id = $node_id` by hand works but is slower and harder to read; the expected answer is `MATCH`. And a multi-hop pattern needs one alias per occurrence of the edge table (`f1`, `f2`).

<!-- section: correlated-queries | objectives: 1.3.7 -->
## Correlated queries

A correlated subquery references a column of the outer query and is logically evaluated once per outer row.

```text
-- Customers with at least one order over 1,000
SELECT c.CustomerID, c.FullName
FROM Sales.Customer AS c
WHERE EXISTS (SELECT 1 FROM Sales.Orders AS o
              WHERE o.CustomerID = c.CustomerID AND o.Amount > 1000);

-- Orders above the customer's own average
SELECT o.OrderID, o.CustomerID, o.Amount
FROM Sales.Orders AS o
WHERE o.Amount > (SELECT AVG(o2.Amount) FROM Sales.Orders AS o2
                  WHERE o2.CustomerID = o.CustomerID);

-- Latest three orders per customer
SELECT c.CustomerID, t.OrderID, t.OrderDate
FROM Sales.Customer AS c
CROSS APPLY (SELECT TOP (3) o.OrderID, o.OrderDate
             FROM Sales.Orders AS o
             WHERE o.CustomerID = c.CustomerID
             ORDER BY o.OrderDate DESC) AS t;
```

| Requirement | Pattern |
| --- | --- |
| Rows that have / don't have a match | `EXISTS` / `NOT EXISTS` |
| Compare to a per-group aggregate | Correlated scalar subquery, or a window function (`AVG(...) OVER (PARTITION BY ...)`) |
| Top n per group, several columns | `CROSS APPLY (SELECT TOP (n) ... ORDER BY ...)` |
| Keep outer rows without a match | `OUTER APPLY` |

A scalar subquery in the `SELECT` list must return one row: more raises error 512. The optimizer usually rewrites correlated subqueries as joins, so performance depends on an index on the correlated column (`Sales.Orders (CustomerID)`).

> **Exam trap.** `WHERE CustomerID NOT IN (SELECT CustomerID FROM Sales.Blocked)` returns **no rows** if the subquery returns one NULL. `NOT EXISTS` with a correlated predicate gives the expected result.

<!-- section: error-handling | objectives: 1.3.8 -->
## Error handling

```text
CREATE OR ALTER PROCEDURE Sales.usp_TransferCredit
    @FromID int, @ToID int, @Amount decimal(10, 2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        IF @Amount <= 0
            THROW 50001, N'Amount must be positive.', 1;

        BEGIN TRANSACTION;
            UPDATE Sales.Credit SET Balance -= @Amount WHERE CustomerID = @FromID;
            UPDATE Sales.Credit SET Balance += @Amount WHERE CustomerID = @ToID;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;

        INSERT INTO dbo.ErrorLog (Number, Severity, ProcName, Line, Message)
        VALUES (ERROR_NUMBER(), ERROR_SEVERITY(), ERROR_PROCEDURE(), ERROR_LINE(), ERROR_MESSAGE());

        THROW;   -- re-raise the original error to the caller
    END CATCH;
END;
```

| Element | Rule |
| --- | --- |
| `TRY...CATCH` | Catches run-time errors of severity above 10 that don't close the connection, including errors in called procedures and triggers |
| Not caught at the same level | Severity 10 or lower (messages), compile and syntax errors, object name resolution errors in the same batch, errors that close the connection |
| `ERROR_*()` functions | `ERROR_NUMBER`, `ERROR_MESSAGE`, `ERROR_SEVERITY`, `ERROR_STATE`, `ERROR_LINE`, `ERROR_PROCEDURE`; meaningful only inside `CATCH` |
| `XACT_STATE()` | `1` committable, `-1` uncommittable (only rollback is possible), `0` no transaction |
| `SET XACT_ABORT ON` | Most run-time errors roll back the whole transaction; recommended in procedures with transactions |
| `THROW n, msg, state` | Error number 50000 or more, severity always 16; the previous statement must end with a semicolon |
| `THROW;` | Only inside `CATCH`: re-raises the original error, number and message unchanged |
| `RAISERROR` | Older; supports format strings and severities; doesn't honor `XACT_ABORT`; new code should use `THROW` |

> **Exam trap.** A `CATCH` block that logs the error but doesn't re-raise it makes the call look successful to the application. End with `THROW;` unless the error is truly handled, and roll back before writing the log row, or the log insert is rolled back with the transaction.

<!-- section: key-points -->
## Key points

- CTEs live for one statement; recursive CTEs stop at 100 levels unless `OPTION (MAXRECURSION n)`; CTEs aren't materialized.
- Window functions: `ROWS` for running totals, full frame for `LAST_VALUE`, filter results through a CTE; `RANK` leaves gaps, `DENSE_RANK` doesn't.
- JSON: `JSON_OBJECT` defaults to `NULL ON NULL`, `JSON_ARRAY` and `JSON_ARRAYAGG` to `ABSENT ON NULL`; `JSON_VALUE` for scalars, `JSON_QUERY` for fragments, `OPENJSON ... WITH` to shred, `JSON_CONTAINS` to search.
- `REGEXP_*`: SQL Server 2025 and Azure SQL only; `REGEXP_LIKE` and the table-valued functions need compatibility level 170; occurrence `0` replaces all.
- Fuzzy matching is in preview (`PREVIEW_FEATURES = ON` in SQL Server 2025); distance down, similarity up; no `max` types.
- `MATCH` needs explicit arrows, `AND` only, distinct edge aliases; `SHORTEST_PATH` with `FOR PATH` and `WITHIN GROUP (GRAPH PATH)`.
- Prefer `NOT EXISTS` to `NOT IN` with nullable columns; `CROSS APPLY` with `TOP` for top n per group.
- `SET XACT_ABORT ON`, `TRY...CATCH`, rollback when `XACT_STATE() <> 0`, then `THROW;`.
