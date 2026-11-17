Microsoft Power BI is the suite of tools that turns data into interactive reports and dashboards; it is a core workload of Microsoft Fabric. The exam asks you which Power BI tool does what, how an analytical data model is built, and which visual suits a kind of data.

<!-- section: power-bi-tools | objectives: 4.3.1 -->
## Power BI tools and workflow

| Tool | What it is | Use |
| --- | --- | --- |
| **Power BI Desktop** | Windows application | Connect to data sources, transform data with Power Query, build the data model, create reports |
| **Power BI service** | Cloud service, used in a web browser | Publish, share and collaborate in workspaces; schedule data refreshes; create dashboards and apps; limited report editing |
| **Power BI mobile apps** | Applications for phones and tablets | View reports and dashboards on the go |
| **Power BI Report Builder** | Authoring tool | Create **paginated reports**: precisely formatted, printable documents such as invoices |
| **Power BI Report Server** | On-premises report server | Keep reports on-premises |

The typical workflow has three steps:

1. An analyst imports and models data in **Power BI Desktop** and creates a report.
2. The report and its model are published to the **Power BI service**, where refreshes are scheduled and content is shared.
3. Business users consume reports, dashboards and apps in a browser or in the mobile app.

In Microsoft Fabric, Power BI content lives in **workspaces** next to the other Fabric items. Copilot in Power BI can summarize a report, create report pages and write DAX from a description in natural language.

> **Exam trap.** Full data modeling is done in Power BI Desktop. Sharing, scheduled refresh and dashboards belong to the Power BI service.

<!-- section: reports-dashboards | objectives: 4.3.1 -->
## Reports, dashboards and apps

| | Report | Dashboard |
| --- | --- | --- |
| **Pages** | One or more pages | A single page |
| **Source** | One semantic model | Visuals pinned from one or more reports |
| **Filtering and slicing** | Yes | No |
| **Data alerts** | No | Yes, on tiles |
| **Created in** | Power BI Desktop or the Power BI service | The Power BI service only |

- A **tile** is a visual **pinned** to a dashboard; selecting it usually opens the report it comes from.
- An **app** groups related reports and dashboards to distribute them to many users in one place.
- A **semantic model** is the data, with its relationships and calculations, on which reports are built; one model can serve several reports.

<!-- section: data-models | objectives: 4.3.2 -->
## Data models in Power BI

An analytical model, called a **semantic model** in Power BI and Microsoft Fabric, is made of related tables. It defines **measures**, the numeric values to analyze, and **dimensions**, the entities by which measures are aggregated.

| Element | Description | Example |
| --- | --- | --- |
| **Fact table** | One row per recorded event, with the numeric values | Sales: quantity, revenue |
| **Dimension table** | One row per entity, with a unique key and descriptive attributes | Product, Customer, Time |
| **Relationship** | Link between the key of a dimension table and the matching column of the fact table | Sales to Product |
| **Measure** | Calculation aggregated at query time, written in DAX (Data Analysis Expressions) | Total revenue |
| **Hierarchy** | Levels of a dimension, to drill up or drill down through aggregated values | Year, month, day |

- A fact table related to its dimension tables forms a **star schema**. When a dimension is itself related to more detailed tables (Product to Category), the schema is a **snowflake**.
- Most models include a **time** dimension, to aggregate by day, month or year.
- The **Model view** of Power BI Desktop is where you create relationships and hierarchies and set data types and display formats.

| Storage mode | Where the data is | Remember |
| --- | --- | --- |
| **Import** | Copied into the model, in memory | Fast queries; the data is only as current as the last refresh |
| **DirectQuery** | Left in the source; each query is sent to it | No scheduled refresh; current data; for volumes too large to import |
| **Direct Lake** | Delta tables in OneLake, loaded directly into memory | In-memory speed without copying the data into the model; Microsoft Fabric |

> **Exam tip.** Numbers to add up are in the fact table; the words after "by" (by product, by month, by city) are dimensions.

<!-- section: visualizations | objectives: 4.3.3 -->
## Choosing a visualization

| You want to | Visual |
| --- | --- |
| Show many related, exact values in rows and columns | **Table** |
| Summarize values across several dimensions, in rows and columns | **Matrix** |
| Highlight one important figure, such as total revenue | **Card** |
| Show progress toward a target | **KPI** or **gauge** |
| Compare numeric values for discrete categories | **Bar chart** or **column chart** |
| Show a trend, usually over time | **Line chart** |
| Compare the parts of a total, with few categories | **Pie chart** or **doughnut chart** |
| Show the proportions of hierarchical data as nested rectangles | **Treemap** |
| Find a relationship or correlation between two numeric measures | **Scatter chart** |
| Compare values across geographic areas | **Map** |
| Follow the stages of a process, such as a sales pipeline | **Funnel chart** |
| Explain how positive and negative changes lead from an initial value to a total | **Waterfall chart** |
| Let users filter the page from the report canvas | **Slicer** |
| Find the factors that drive a metric | **Key influencers** |

Visuals of a report page are linked: selecting a category in one visual **cross-filters or highlights** the others. Power BI can be extended with custom visuals.

> **Exam trap.** A trend over time calls for a line chart, not a pie chart; a correlation between two measures calls for a scatter chart, not a bar chart.

<!-- section: key-points -->
## Key points

- Power BI Desktop: model and create reports. Power BI service: publish, share, refresh, dashboards, apps. Mobile apps: consume.
- Paginated reports are created with Power BI Report Builder.
- Report: several pages, one semantic model, filters. Dashboard: one page of pinned tiles, alerts, no filtering.
- Semantic model: fact tables, dimension tables, relationships, measures in DAX, hierarchies; star schema.
- Import copies the data; DirectQuery queries the source; Direct Lake reads Delta tables in OneLake.
- Line: trend. Bar or column: comparison of categories. Pie: parts of a total. Scatter: correlation. Map: geography. Card: one figure. Table and matrix: detailed values.
