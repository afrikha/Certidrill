Azure Storage offers several data services inside one storage account. The exam asks you to match a kind of data to a service, a usage pattern to a tier, a resilience need to a redundancy option, and a transfer need to a tool.

<!-- section: storage-accounts | objectives: 2.3.4 -->
## Storage accounts and storage types

A **storage account** is the container of your Azure Storage data. Its name is unique in the world, 3 to 24 characters, lowercase letters and digits only, because it forms the address of the data.

| Account type | Supported services | Redundancy options | Use |
| --- | --- | --- | --- |
| **Standard general-purpose v2** | Blob Storage (including Data Lake Storage), Queue Storage, Table Storage, Azure Files | LRS, GRS, RA-GRS, ZRS, GZRS, RA-GZRS | The standard choice for most scenarios |
| **Premium block blobs** | Block blobs and append blobs | LRS, ZRS | High transaction rates, small objects, low latency |
| **Premium file shares** | Azure Files | LRS, ZRS | Enterprise or high-performance file shares |
| **Premium page blobs** | Page blobs | LRS, ZRS | Page blobs only |

Premium accounts use solid-state drives; they don't offer geo-redundancy.

Each service has its own endpoint:

| Service | Endpoint |
| --- | --- |
| Blob Storage | `https://<account>.blob.core.windows.net` |
| Data Lake Storage | `https://<account>.dfs.core.windows.net` |
| Azure Files | `https://<account>.file.core.windows.net` |
| Queue Storage | `https://<account>.queue.core.windows.net` |
| Table Storage | `https://<account>.table.core.windows.net` |

<!-- section: storage-services | objectives: 2.3.1 -->
## Comparing Azure Storage services

| Service | Stores | Typical use |
| --- | --- | --- |
| **Azure Blobs** | Massive amounts of **unstructured** data: text or binary objects, in containers | Images and documents served to a browser, video and audio streaming, backups, archives, data for analysis |
| **Azure Files** | Fully managed **file shares**, accessed over SMB or NFS | Replacing or extending file servers; shares mounted at the same time from Azure and from on-premises, on Windows, Linux and macOS |
| **Azure Queues** | **Messages** between application components, up to 64 KB each, by the millions | Decoupling components and building a backlog of work to process asynchronously |
| **Azure Disks** | Block-level volumes managed by Azure | Disks of virtual machines |
| **Azure Tables** | **Structured, non-relational** (NoSQL) data, as keys and attributes | Flexible datasets such as address books or device metadata |

All of them are durable, highly available, secure (encrypted), scalable, managed by Microsoft and reachable over HTTP or HTTPS from anywhere.

<!-- section: storage-tiers | objectives: 2.3.2 -->
## Storage tiers

Blob access tiers let you pay less for data you rarely read:

| Tier | For data that is | Minimum storage | Storage cost | Access cost |
| --- | --- | --- | --- | --- |
| **Hot** | Accessed frequently | None | Highest | Lowest |
| **Cool** | Accessed infrequently | 30 days | Lower | Higher |
| **Cold** | Rarely accessed | 90 days | Lower still | Higher still |
| **Archive** | Rarely accessed, with flexible latency requirements | 180 days | Lowest | Highest |

- Hot, cool and cold are **online** tiers: data is available immediately.
- Archive is **offline**: the data must be **rehydrated** to an online tier before it can be read, which takes hours.
- A default tier (hot, cool or cold) is set on the account; archive is set **blob by blob**, never at the account level.

<!-- section: redundancy | objectives: 2.3.3 -->
## Redundancy options

Azure Storage always keeps several copies of your data. The option decides where they are:

| Option | Copies | Protects against |
| --- | --- | --- |
| **LRS**, locally redundant | Three copies in **one datacenter** of the primary region | Failure of a disk or a server rack |
| **ZRS**, zone-redundant | Three copies in **three availability zones** of the primary region | Failure of a datacenter |
| **GRS**, geo-redundant | LRS in the primary region, plus three copies in the **paired region** | Failure of a region |
| **GZRS**, geo-zone-redundant | ZRS in the primary region, plus three copies in the paired region | Failure of a zone and of a region; the highest protection |
| **RA-GRS**, **RA-GZRS** | Same as GRS or GZRS, with **read access** to the secondary copy at any time | Same, and reading stays possible during a regional outage |

LRS is the cheapest option and the least durable. With GRS and GZRS, the data in the secondary region can only be read after a failover, unless read access (RA-) is enabled. Copying to the secondary region is asynchronous.

<!-- section: moving-files | objectives: 2.3.5 -->
## Moving files

| Tool | Type | Use |
| --- | --- | --- |
| **AzCopy** | Command-line utility | Copy blobs or files to, from and between storage accounts; can synchronize in **one direction** (source to destination). Scriptable |
| **Azure Storage Explorer** | Graphical application for Windows, macOS and Linux | Browse and manage blobs and files, upload and download; uses AzCopy behind the scenes |
| **Azure File Sync** | Service with an agent on Windows Server | Centralize file shares in Azure Files while keeping a local Windows file server as a fast cache; stays **synchronized in both directions**, and **cloud tiering** keeps only frequently used files locally |

Azure File Sync is the answer when users must keep accessing a local file server with the usual protocols while the data lives in Azure, or when several sites need the same files.

<!-- section: migration-options | objectives: 2.3.6 -->
## Migration options

**Azure Migrate** is the hub for migrating an on-premises environment to Azure. It provides one portal to **discover, assess and migrate** servers, databases, web applications and virtual desktops, with integrated tools:

| Tool | Role |
| --- | --- |
| Discovery and assessment | Find on-premises servers (VMware, Hyper-V, physical) and check their readiness for Azure |
| Migration and modernization | Migrate machines to Azure |
| Azure Database Migration Service | Migrate databases |
| App Service migration assistant | Assess and migrate web applications to Azure App Service |
| Azure Data Box | Move large amounts of offline data |

**Azure Data Box** is a physical device that Microsoft ships to you. You copy the data to it and ship it back; Microsoft loads it into your storage account and then wipes the device. The next-generation devices hold up to 120 or 525 terabytes of usable data; the older 80-terabyte device is being retired region by region.

| Choose Data Box when | Examples |
| --- | --- |
| The amount of data is large and the network is limited or too slow | One-time migration of a media library; initial bulk transfer followed by network increments; periodic uploads from a remote site |
| You need to bring data **out of** Azure to your datacenter | Disaster recovery, regulatory requirements, moving back on-premises |

<!-- section: key-points -->
## Key points

- Blobs: unstructured objects. Files: managed file shares. Queues: messages. Disks: virtual machine volumes. Tables: NoSQL key-attribute data.
- Standard general-purpose v2 is the default account type; premium accounts are LRS or ZRS only.
- Hot, cool (30 days), cold (90 days), archive (180 days, offline, per blob).
- LRS: one datacenter. ZRS: three zones. GRS: paired region. GZRS: zones plus region. RA-: readable secondary.
- AzCopy: command line. Storage Explorer: graphical. File Sync: local Windows server synchronized with Azure Files.
- Azure Migrate: discover, assess, migrate. Data Box: ship data on a device when the network isn't enough.
