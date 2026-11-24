Organizations keep data in two broad categories of data store: file stores and databases. The exam asks you to recognize a file format from its description, to tell the kinds of database apart, and to name the Azure service that fits a common use case.

<!-- section: file-formats | objectives: 1.2.1 -->
## Common formats for data files

The format of a file depends on the type of data (structured, semi-structured, unstructured), on the applications that must read and write it, and on whether people must be able to read it or whether efficient storage and processing matter more.

| Format | Kind | What to remember |
| --- | --- | --- |
| **Delimited text** | Text, readable by people | Fields separated by a delimiter and rows ended by a new line; the first line may hold the field names. Comma-separated values (CSV) is the most common; tab-separated (TSV) and fixed-width files also exist. A good choice for structured data that many applications and people must read |
| **JSON** | Text, hierarchical | Objects enclosed in braces, collections in square brackets, attributes written as name-value pairs. Suits structured and semi-structured data |
| **XML** | Text, hierarchical | Tags in angle brackets define elements and attributes. Popular in the 1990s and 2000s, more verbose than JSON, which has largely replaced it |
| **BLOB** | Binary | Binary large object: raw binary data that an application must interpret. Images, video, audio and application-specific documents |
| **Avro** | Binary, row-based | Each file has a header in JSON that describes the structure; the records are stored as binary. Good for compressing data and reducing storage and network bandwidth |
| **Parquet** | Binary, columnar | Data is organized in row groups in which the values of each column are stored together, with metadata that lets a reader fetch only the columns it needs. Efficient compression, supports nested data; widely used in data lakes and lakehouses |
| **Delta Lake** | Parquet plus a log | Open-source storage format that adds a transaction log to Parquet files: ACID transactions, data versioning and reliable updates on files in a data lake |

The same two customers as delimited text, then as XML:

```text
CustomerID,FirstName,City
1,Ana,Lisbon
2,Kenji,Osaka
```

```text
<Customers>
  <Customer id="1" firstName="Ana" city="Lisbon"/>
  <Customer id="2" firstName="Kenji" city="Osaka"/>
</Customers>
```

Avro, Parquet and Delta Lake are **optimized file formats**: they can't be read in a text editor, but they compress well and are fast to process.

> **Exam trap.** Parquet is **columnar**, Avro is **row-based**. "Read only a few columns of a very large file" points to Parquet; "a JSON header followed by binary records" points to Avro.

<!-- section: data-stores | objectives: 1.2.2 -->
## File stores and databases

A **file store** keeps files on a local disk, on a network share or in the cloud. A **database** is a dedicated system that manages data records rather than files, and that applications query.

**Relational databases** store structured data in **tables** that represent entities. Each row has a **primary key** that identifies it; other tables reference that key, so a customer's details are stored once instead of being repeated in every order (the database is **normalized**). Tables are managed and queried with **SQL**, a language based on an ANSI standard and therefore similar across database systems.

**Non-relational databases** don't apply a relational schema to the data. They are often called **NoSQL** databases. Four kinds are common:

| Kind | How data is stored | Example of use |
| --- | --- | --- |
| **Key-value** | Each record is a unique key and an associated value, which can be in any format | Session data, user preferences |
| **Document** | A key-value database in which the value is a JSON document that the system can parse and query | Product catalog whose attributes vary |
| **Column family** | Rows and columns, but the columns are divided into groups (column families) of logically related columns | Wide tables in which each row uses different groups of columns |
| **Graph** | Entities are nodes, connected by links that define the relationships between them | Social network, organization chart, recommendations |

> **Exam trap.** NoSQL doesn't mean that SQL is forbidden: some non-relational databases support a variant of the SQL language. The name only says that the data isn't organized in a relational schema.

| Requirement | Kind of store |
| --- | --- |
| Structured data, relationships between tables, SQL queries | Relational database |
| JSON items whose fields differ | Document database |
| Fast lookup of one value from its key | Key-value database |
| Following relationships such as "who reports to whom" | Graph database |
| Images, videos, backups, raw data files | File store |

<!-- section: azure-data-stores | objectives: 1.2.3 -->
## Azure data stores for common use cases

| Use case | Azure service |
| --- | --- |
| Transactional data of line-of-business applications, on the SQL Server database engine | **Azure SQL** (Azure SQL Database, Azure SQL Managed Instance, SQL Server on Azure Virtual Machines) |
| Relational database for an application built on an open-source engine | **Azure Database for MySQL**, **Azure Database for PostgreSQL** |
| Global-scale non-relational database: JSON documents, key-value pairs, column families, graphs | **Azure Cosmos DB** |
| Scalable, cost-effective storage of binary files and other unstructured data | **Azure Blob Storage** (blob containers of a storage account) |
| Network file shares like those of a corporate network | **Azure Files** |
| Key-value storage for applications that read and write values quickly | **Azure Table storage** |
| Data lake: files organized in folders for large-scale analytics | **Azure Data Lake Storage** (Blob Storage with a hierarchical namespace) |
| One analytics platform delivered as software as a service (SaaS), with a shared data lake (OneLake) | **Microsoft Fabric** |

Blob containers, file shares and tables are three services of the same **Azure Storage** account.

> **Exam trap.** On Azure, a data lake isn't a separate storage product: it is an Azure Storage account in which the **hierarchical namespace** is enabled, so that blobs are organized in real folders.

<!-- section: key-points -->
## Key points

- Delimited text, JSON and XML are readable text; Avro, Parquet and Delta Lake are optimized formats.
- Avro: row-based, JSON header, binary data. Parquet: columnar. Delta Lake: Parquet plus a transaction log.
- BLOB: binary large object, for images, video, audio and documents.
- Relational: tables, keys, SQL. Non-relational: key-value, document, column family, graph.
- Azure SQL and the open-source services are relational; Azure Cosmos DB is non-relational at global scale.
- Azure Storage: blob containers for unstructured data, file shares, key-value tables, and data lakes with the hierarchical namespace.
