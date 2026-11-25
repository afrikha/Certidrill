An Azure Storage account offers three non-relational data services that the exam compares: blob containers for unstructured data, file shares, and key/value tables. You must know what each one stores, its main options, and which one answers a given need.

<!-- section: blob-storage | objectives: 3.1.1 -->
## Azure Blob Storage

Azure Blob Storage stores massive amounts of **unstructured data** as binary large objects, or **blobs**, which applications read and write through an API.

- Blobs are stored in **containers**, which group related blobs inside a storage account. Access is controlled at the container level; Microsoft Entra ID with Azure role-based access control (RBAC) is the recommended way to authorize users.
- A `/` in blob names shows the blobs as **virtual folders**. These folders don't really exist: by default, you can't set permissions or run bulk operations on a folder.

| Blob type | Structure | Maximum size | Use |
| --- | --- | --- | --- |
| **Block blob** | A set of blocks of up to 4,000 MiB each | About 190.7 TiB (50,000 blocks) | Discrete, large binary objects that change infrequently: images, videos, documents, backups |
| **Page blob** | Fixed-size 512-byte pages | 8 TiB | Random read and write operations; Azure uses page blobs for the virtual disks of virtual machines |
| **Append blob** | A block blob in which blocks are only added at the end | Just over 195 GiB | Data that only grows, such as logs |

> **Exam trap.** "Log file to which lines are continually added" is an append blob; "virtual machine disk" or "random access" is a page blob. Everything else, which is most of what you store, is a block blob.

<!-- section: blob-tiers-data-lake | objectives: 3.1.1 -->
## Access tiers, lifecycle and data lakes

Access tiers balance the cost of storage against the cost and speed of access:

| Tier | For data that is | Minimum storage period | To remember |
| --- | --- | --- | --- |
| **Hot** | Accessed frequently | None | The default; highest storage cost, lowest access cost |
| **Cool** | Accessed infrequently | 30 days | Lower storage cost, higher access cost than hot |
| **Cold** | Rarely accessed, but must stay immediately readable | 90 days | Lower storage cost, higher access cost than cool |
| **Archive** | Kept for history and almost never read | 180 days | Lowest storage cost; the blob is offline |

- Blobs in the hot, cool and cold tiers are read in milliseconds. A blob in the archive tier must first be **rehydrated** by changing its tier to hot, cool or cold, which can take up to 15 hours.
- Removing a blob before the minimum period leads to an early deletion charge.
- A **lifecycle management policy** moves blobs automatically from hot to cool, cold and archive according to the number of days since their last modification, and can delete outdated blobs.
- The **smart tier**, set as the default access tier of a standard general-purpose v2 account with zone-redundant storage (ZRS, GZRS or RA-GZRS), moves block blobs between hot, cool and cold according to their access, without a policy to write; it doesn't use the archive tier.

**Azure Data Lake Storage Gen2** is Blob Storage with the **hierarchical namespace** enabled on the storage account. Blobs are then organized in real directories, on which POSIX-compliant access control lists set permissions for individual files and folders. Analytics platforms such as Azure Databricks and Microsoft Fabric work with it. An existing account can be upgraded, but the upgrade can't be reverted.

<!-- section: azure-files | objectives: 3.1.2 -->
## Azure Files

Azure Files provides **network file shares in the cloud**, like the shares of a corporate file server, without hardware to buy or maintain. A file share is created in a storage account and can be mounted by many users and applications at the same time.

| Item | Value |
| --- | --- |
| Protocols | **SMB** (Server Message Block), used by Windows, Linux and macOS; **NFS** (Network File System), used by Linux clients |
| NFS constraints | Not supported on Windows; requires the SSD tier; access is controlled through a private endpoint or a service endpoint of a virtual network |
| Media tiers | **HDD**: lower cost. **SSD**: greater throughput, at a higher rate |
| Maximum size of a file | 4 TiB |
| Concurrent access | Up to 2,000 concurrent handles per file or directory |

Ways to load and keep data in a share:

- the **Azure portal**, to upload files directly;
- **AzCopy**, a command-line utility that copies files to Azure Files;
- **Azure File Sync**, a service that synchronizes locally cached copies of shared files with the data in Azure Files.

> **Exam trap.** A "shared folder", "mapped drive" or "replacement of a file server" is Azure Files, not Blob Storage. Blob Storage is accessed through an API or a URL, not mounted as a network share over SMB.

<!-- section: table-storage | objectives: 3.1.3 -->
## Azure Table storage

Azure Table storage is a **NoSQL** service that stores **key/value** items in tables. Each item is a row whose columns hold its data fields.

- The key of a row has two parts: the **partition key** (`PartitionKey`) identifies the partition that contains the row, and the **row key** (`RowKey`) is unique within that partition.
- A **timestamp** column records when the row was last modified. All other columns can vary from one row to another: the data is **semi-structured**.
- Rows with the same partition key are stored together, in row key order. Partitions are independent, and a search that includes the partition key reads less data.
- A **point query** gives both keys and returns one row: it is the fastest lookup. A **range query** reads a contiguous block of rows inside one partition.

| Aspect | Azure Table storage | Relational table |
| --- | --- | --- |
| Schema | Columns can differ from one row to another | The same columns for every row |
| Key | Partition key plus row key | Primary key |
| Relationships and objects | No foreign keys, no joins, no stored procedures, no views | Foreign keys, joins, stored procedures, views |
| Design | Denormalized: one row holds all the data of an entity | Normalized: data is split between related tables |

**Azure Cosmos DB for Table** is a newer service that uses the same key/value model, with higher performance and availability, global distribution and automatic secondary indexes.

<!-- section: choosing-storage | objectives: 3.1.1, 3.1.2, 3.1.3 -->
## Choosing a storage service

| Need in the question | Answer |
| --- | --- |
| Store images, videos, documents or backups at low cost | Azure Blob Storage, block blobs |
| Keep rarely read data for years at the lowest cost, with retrieval in hours accepted | Archive tier |
| Folders with permissions per directory, for large-scale analytics | Azure Data Lake Storage Gen2 (hierarchical namespace) |
| Replace a file server; share mounted by several computers | Azure Files |
| Fast lookup of semi-structured items by key, in a storage account | Azure Table storage |

<!-- section: key-points -->
## Key points

- Blob Storage: unstructured data in containers. Block blobs (general use), page blobs (virtual disks, random access), append blobs (logs).
- Tiers: hot (default), cool (30 days), cold (90 days), archive (180 days, offline, rehydration needed); lifecycle policies move or delete blobs as they age.
- Data Lake Storage Gen2: Blob Storage plus the hierarchical namespace, with POSIX access control lists.
- Azure Files: file shares over SMB or NFS; NFS needs the SSD tier and isn't supported on Windows.
- Table storage: NoSQL key/value rows, partition key plus row key, no relationships, no stored procedures.
