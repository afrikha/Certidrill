A semantic model turns tables into a business layer: storage mode, star schema, relationships and DAX measures. Exam questions describe data volumes, latency and sources and ask for a storage mode or a relationship setting, or show a DAX measure with gaps to complete.

<!-- section: storage-modes | objectives: 3.1.1 -->
## Choosing a storage mode

| Mode | Where the data lives | Freshness | Main limits |
| --- | --- | --- | --- |
| Import | Copied into the model (VertiPaq, in memory) | As of the last refresh | Model size, refresh time and schedule |
| DirectQuery | Stays in the source; DAX translated to the source's query language | At query time | Slower visuals, limited M and DAX, load on the source |
| Direct Lake | Delta tables in OneLake, columns loaded into memory on demand | As of the last framing (automatic by default) | Fabric Delta sources only; guardrails per capacity SKU |
| Dual | Both: cached copy and DirectQuery | Depends on the query | Same restrictions as DirectQuery |

| Requirement | Answer |
| --- | --- |
| Fastest visuals, data fits in memory, daily refresh acceptable, non-Fabric sources | Import |
| Source must be queried live (seconds of latency), or data can't be copied | DirectQuery |
| Data already in Fabric lakehouse or warehouse Delta tables, large volume, no import refresh window | Direct Lake |
| Dimension related to both Import and DirectQuery tables from the same source | Dual |
| History imported, today's rows live | Hybrid table: incremental refresh with **Get the latest data in real time with DirectQuery**, which adds a real-time DirectQuery partition |

Direct Lake has two flavours: **Direct Lake on OneLake** (Power BI Desktop or web modeling through the **OneLake catalog**; can combine several Fabric items; no DirectQuery fallback) and **Direct Lake on SQL** (from a SQL analytics endpoint with **New semantic model**; single source; falls back to DirectQuery).

Storage mode is set per table in Model view, **Properties > Advanced > Storage mode**. A table can be changed only if it was created in DirectQuery or Direct Lake on OneLake mode.

> **Exam trap.** Switching a table from DirectQuery to Import or Dual can't be undone in Power BI Desktop (web modeling and live editing keep a version history that can reverse it). Dual tables have the same limits as DirectQuery tables.

<!-- section: star-schema-model | objectives: 3.1.2 -->
## Implementing a star schema in a semantic model

- **Dimensions filter facts**: one-to-many relationships from the dimension key (one side) to the fact foreign key (many side), single cross-filter direction.
- **Flatten snowflakes** upstream or in Power Query so each dimension is one table.
- **Date table**: one row per date, contiguous, marked with **Mark as date table**; relate it on a date or date key column.
- **Hide** foreign keys and numeric fact columns, and expose explicit measures. **Discourage implicit measures** is required for calculation groups.
- **Degenerate dimension**: an attribute such as the order number kept in the fact table.
- **Role-playing dimension**: one Date table related to OrderDate (active) and ShipDate (inactive); a measure activates the inactive relationship with `USERELATIONSHIP`. Alternative: a second copy of the table when users need both roles in the same visual as separate fields.

```text
Sales by Ship Date =
CALCULATE ( [Total Sales], USERELATIONSHIP ( Sales[ShipDateKey], 'Date'[DateKey] ) )
```

> **Exam trap.** Only one active relationship can exist between two tables (or along one filter path). Two dates in a fact table means one active relationship plus inactive ones, not two active ones.

<!-- section: relationships | objectives: 3.1.3 -->
## Relationships, bridge tables and many-to-many

| Property | Values | Guidance |
| --- | --- | --- |
| Cardinality | One-to-many, many-to-one, one-to-one, many-to-many | Dimension key on the one side; many-to-many only when no unique side exists |
| Cross-filter direction | Single, Both | Single by default; Both only where a filter must flow from the many side (bridge) |
| Active | Yes or No | Inactive relationships are used by `USERELATIONSHIP` |
| Apply security filter in both directions | On or Off | Lets row-level security on a dimension filter through a bidirectional relationship |

**Regular** relationships (one-to-many within the same source group) behave like left outer joins: fact rows with no matching dimension key are grouped under a blank member. **Limited** relationships (many-to-many cardinality, or relationships between source groups in a composite model) behave like inner joins, don't add a blank member and don't support `RELATED`.

The three many-to-many scenarios:

| Scenario | Example | Design |
| --- | --- | --- |
| Many-to-many dimensions | A customer has several accounts, an account has several customers | Bridge table AccountCustomer with one row per pair; one-to-many relationships from Account and Customer to the bridge; set **Both** on one relationship (Account to AccountCustomer) so filters reach the fact; hide the bridge |
| Many-to-many facts | Order and Fulfillment on OrderID | Not recommended: add shared dimensions (OrderLine, Product, dates) and relate each fact to them |
| Higher-grain facts | Targets by year and product category, sales by day and product | Date: store the first day of the period and relate one-to-many to Date. Other grain (category): many-to-many relationship, single direction, from the dimension to the target fact |

For higher-grain facts, a measure hides results at levels below the grain:

```text
Target Quantity =
IF (
    NOT ISFILTERED ( 'Product'[ProductID] )
        && NOT ISFILTERED ( 'Product'[Product] ),
    SUM ( Target[TargetQuantity] )
)
```

`TREATAS` applies the values of one column as a filter on another column without a physical relationship; `CROSSFILTER` changes a relationship's direction inside one measure, which is safer than setting Both on the model.

> **Exam trap.** Many-to-many totals aren't additive: a customer with two accounts is counted once in the total but appears under each account. That is correct behaviour, not a bug.

<!-- section: dax-calculations | objectives: 3.1.4 -->
## DAX variables, iterators, filtering, windowing and information functions

```text
Margin % =
VAR _Sales = SUM ( Sales[SalesAmount] )
VAR _Cost = SUMX ( Sales, Sales[Quantity] * Sales[UnitCost] )
RETURN
    DIVIDE ( _Sales - _Cost, _Sales )

Sales All Regions = CALCULATE ( [Total Sales], REMOVEFILTERS ( Store[Region] ) )
Region Share = DIVIDE ( [Total Sales], [Sales All Regions] )

Big Customer Sales =
CALCULATE (
    [Total Sales],
    FILTER ( VALUES ( Customer[CustomerKey] ), [Total Sales] > 10000 )
)
```

| Family | Functions | Remember |
| --- | --- | --- |
| Variables | `VAR ... RETURN` | Evaluated once, where defined: a variable used inside `CALCULATE` isn't recomputed in the new filter context |
| Iterators | `SUMX`, `AVERAGEX`, `COUNTX`, `MAXX`, `RANKX`, `CONCATENATEX` | Evaluate an expression row by row, then aggregate; a measure called inside triggers context transition |
| Table filtering | `CALCULATE`, `FILTER`, `ALL`, `ALLEXCEPT`, `REMOVEFILTERS`, `ALLSELECTED`, `KEEPFILTERS`, `VALUES` | A Boolean filter on a column replaces the existing filter on that column; `KEEPFILTERS` intersects instead |
| Windowing | `WINDOW`, `OFFSET`, `INDEX`, `RANK`, `ROWNUMBER`, with `ORDERBY`, `PARTITIONBY`, `MATCHBY` | Rows relative to the current row; `REL` (default) or `ABS` positions |
| Information | `ISBLANK`, `ISFILTERED`, `ISCROSSFILTERED`, `ISINSCOPE`, `HASONEVALUE`, `ISEMPTY`, `USERPRINCIPALNAME` | Test the evaluation context; `SELECTEDVALUE ( col, alternate )` returns the single value or the alternate |

```text
Running Sales FY =
SUMX (
    WINDOW (
        1, ABS, 0, REL,
        ALLSELECTED ( 'Date'[Fiscal Year], 'Date'[Month Number] ),
        ORDERBY ( 'Date'[Month Number], ASC ),
        PARTITIONBY ( 'Date'[Fiscal Year] )
    ),
    [Total Sales]
)

Previous Month Sales =
CALCULATE (
    [Total Sales],
    OFFSET (
        -1,
        ALLSELECTED ( 'Date'[Year], 'Date'[Month Number] ),
        ORDERBY ( 'Date'[Year], ASC, 'Date'[Month Number], ASC )
    )
)

Level Label =
SWITCH (
    TRUE (),
    ISINSCOPE ( 'Product'[Product] ), "Product",
    ISINSCOPE ( 'Product'[Category] ), "Category",
    "Total"
)
```

`WINDOW ( 1, ABS, 0, REL, ... )` means "from the first row of the partition to the current row": a running total that restarts for each fiscal year. `WINDOW ( -2, REL, 0, REL, ... )` is a three-row moving window.

> **Exam trap.** `SUM ( Sales[Quantity] ) * SUM ( Sales[UnitPrice] )` multiplies two totals; revenue is `SUMX ( Sales, Sales[Quantity] * Sales[UnitPrice] )`. Use an iterator whenever the calculation must happen per row before aggregation.

`ISINSCOPE` tests the hierarchy level in a matrix; `ISFILTERED` is also true when a slicer filters the column. `DIVIDE` returns blank on division by zero.

<!-- section: calc-groups-format-params | objectives: 3.1.5 -->
## Calculation groups, dynamic format strings and field parameters

**Calculation groups** apply the same logic to any measure. In Power BI Desktop Model view, select **Calculation group** (Discourage implicit measures must be on), then write **calculation items**; `SELECTEDMEASURE()` stands for the measure being evaluated.

```text
Current = SELECTEDMEASURE ()
YTD = CALCULATE ( SELECTEDMEASURE (), DATESYTD ( 'Date'[Date] ) )
PY = CALCULATE ( SELECTEDMEASURE (), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
YOY% =
VAR _PY = CALCULATE ( SELECTEDMEASURE (), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
RETURN
    DIVIDE ( SELECTEDMEASURE () - _PY, _PY )

Orders YOY % = CALCULATE ( [Orders], 'Time Intelligence'[Time Calculation] = "YOY%" )
```

- Each item can have its own **Dynamic format string** (for example `#,##0.00%` for YOY%).
- **Precedence** orders several calculation groups applied to the same measure; items are reordered in the **Calculation items** section of the **Properties** pane (or with move up or down in their context menu), and the **Ordinal** column sorts them.
- With a calculation group, report measures use the `variant` data type.
- Calculation groups only affect explicit measures.

**Dynamic format strings for measures**: select the measure, **Measure tools > Format > Dynamic**, and write a DAX expression that returns a format string. Unlike `FORMAT()`, which returns text, the measure stays numeric, so charts still work.

```text
SELECTEDVALUE ( 'Country Currency Format'[Format], "\$#,0.00;(\$#,0.00);\$#,0.00" )
```

**Field parameters**: **Modeling > New parameter > Fields** creates a calculated table that report readers use in a slicer to change the measures or columns of a visual.

```text
Metric = {
    ("Sales", NAMEOF ( Sales[Total Sales] ), 0),
    ("Margin", NAMEOF ( Sales[Margin %] ), 1),
    ("Orders", NAMEOF ( Sales[Orders] ), 2)
}
```

| Requirement | Feature |
| --- | --- |
| Same YTD, PY and YoY logic on 30 measures without 90 new measures | Calculation group |
| One measure shown in the currency of the selected country | Dynamic format string |
| Readers choose which measure or which dimension a chart displays | Field parameter |
| A YoY item displayed as a percentage whatever the base measure | Dynamic format string on the calculation item |

> **Exam trap.** Field parameters don't support implicit measures, AI visuals or Q&A, and selecting nothing equals selecting everything. On a live connection, they need a local model (composite model).

<!-- section: large-model-format | objectives: 3.1.6 -->
## Large semantic model storage format

The **Large semantic model storage format** removes the default size limit of a published model: the limit becomes the capacity's memory or the maximum size set by the capacity administrator.

| Use case | Why |
| --- | --- |
| Model above 10 GB | Required |
| Model that grows through incremental refresh | Enable before the first refresh when it may exceed 1 GB |
| Write operations through the XMLA endpoint | Improves XMLA write performance, even for smaller models |
| Faster availability after eviction | On-demand load: only needed data pages are loaded |

How to enable it:

- Per model: semantic model **Settings > Large semantic model storage format > On > Apply** (after publishing).
- Per workspace: workspace **Settings > Premium > Default storage format**: Large semantic model storage format, for new models; an existing model needs the per-model setting.
- PowerShell, as capacity and workspace admin:

```powershell
Set-PowerBIDataset -Id <semantic model ID> -TargetStorageMode PremiumFiles
```

Requirements and limits: Fabric F, Premium P, Embedded A SKUs or Premium Per User. Pro workspaces can use the format only when assigned to Reserved Capacity for Pro Workspaces, and their limit stays 1 GB; semantic models in Pro workspaces don't support XMLA write operations. The Power BI Desktop upload limit stays 10 GB: the model grows beyond it through refresh in the service. Large models use 8-million-row segments by default. Push semantic models don't support the format, and the workspace can't then move to a capacity in another region.

> **Exam trap.** The format doesn't make a single model bigger than the capacity's memory, and it doesn't raise the 10 GB upload limit. To publish a model that will grow, publish it small and load history with incremental refresh.

<!-- section: composite-models | objectives: 3.1.7 -->
## Designing and building composite models

A model is **composite** when it mixes storage modes (Import, DirectQuery, Direct Lake), or DirectQuery tables from different sources. Several Import sources alone aren't a composite model.

- **Source group**: all Import tables (and Direct Lake tables) form one group; each DirectQuery source is its own group. Relationships between groups are **limited** and default to many-to-many cardinality.
- **DirectQuery for Power BI semantic models**: connect live to a published model, select **Make changes to this model**, then add local tables or measures. The owner needs **Build** permission on each source model; viewers generally need Read on the composite model and the sources (Build might be required when the reports are in a Pro workspace).
- **Dual** on dimensions shared with DirectQuery facts from the same source avoids limited relationships.
- **Direct Lake on OneLake** can be combined with Import tables (web modeling) or DirectQuery tables (XMLA tools). Direct Lake on SQL can't be part of a composite model.

| Limit of DirectQuery to semantic models | Value |
| --- | --- |
| Chain length | 3 at most |
| Row-level security | Applies only in the source model where it's defined; can't be defined on remote tables |
| Calculation groups on remote sources | Not supported (undefined query results) |
| Data types of remote columns | Can't be changed; use a calculated column |
| Sources not supported | My workspace models, SSAS Tabular before 2022, SSAS Multidimensional, SAP HANA, SAP BW, real-time (streaming) and sample models, Excel Online Refresh, data imported from Excel or CSV files in the service, usage metrics |

> **Exam trap.** A composite model can send values from one source inside queries to another (names from Excel in a SQL `WHERE` clause): a risk when sources have different security or encryption.

<!-- section: key-points -->
## Key points

- Import is fastest but stale between refreshes; DirectQuery is live but slower; Direct Lake reads Fabric Delta tables with Import-like speed; Dual serves both.
- Star schema: single-direction one-to-many from dimensions to facts, a marked date table, inactive relationships plus `USERELATIONSHIP` for role-playing dates.
- Many-to-many dimensions use a bridge table with one Both relationship; avoid fact-to-fact relationships.
- Iterate with `SUMX` when the calculation is per row; variables are evaluated once; `KEEPFILTERS` intersects.
- `WINDOW`, `OFFSET` and `INDEX` with `ORDERBY` and `PARTITIONBY` handle running totals and previous periods.
- Calculation group = logic for all measures; dynamic format string = format of one measure; field parameter = reader chooses the field.
- Large storage format: above 10 GB, for XMLA writes and incremental refresh growth; not beyond capacity memory.
- Composite: relationships across source groups are limited; Build permission on source models; chains of 3 at most.
