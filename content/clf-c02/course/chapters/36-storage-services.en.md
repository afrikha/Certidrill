AWS storage comes in three types: object storage (Amazon S3), block storage (Amazon EBS and instance store) and file storage (Amazon EFS and Amazon FSx), plus hybrid and backup services. The exam asks you to match a need to a type and a service, to pick an S3 storage class from an access pattern, and to know when lifecycle policies and AWS Backup apply.

<!-- section: storage-services | objectives: 3.6.1 -->
## AWS storage services

| Type | Service | Accessed as |
| --- | --- | --- |
| Object | **Amazon S3** (including the S3 Glacier storage classes) | Whole objects in buckets, through HTTPS APIs |
| Block | **Amazon EBS**, **EC2 instance store** | A disk (volume) attached to an EC2 instance |
| File | **Amazon EFS**, **Amazon FSx** | A shared file system mounted by many clients |
| Hybrid | **AWS Storage Gateway** | On-premises access to cloud storage |
| Protection | **AWS Backup**, **AWS Elastic Disaster Recovery** | Central backups; recovery of servers into AWS |

<!-- section: object-storage | objectives: 3.6.2 -->
## Uses of object storage

**Amazon S3** stores any amount of data as **objects** (a file plus its metadata, identified by a key) in **buckets**. Storage is virtually unlimited, designed for 99.999999999 % (11 nines) durability, and accessed over HTTPS from anywhere you allow.

Typical uses: static website content, images and videos (often delivered through CloudFront), backups and archives, data lakes for analytics (queried with Athena), and logs that grow without limit.

> **Exam trap.** S3 is not a disk for an operating system or a database engine: an object is replaced as a whole. A boot volume or a database on EC2 needs block storage (EBS).

<!-- section: s3-storage-classes | objectives: 3.6.3 -->
## Amazon S3 storage classes

| Class | For data that is | Minimum storage duration | Retrieval |
| --- | --- | --- | --- |
| **S3 Standard** | Accessed frequently | None | Milliseconds |
| **S3 Intelligent-Tiering** | Accessed with unknown or changing patterns; moved automatically between tiers | None | Milliseconds (optional archive tiers need a restore) |
| **S3 Standard-IA** | Accessed infrequently but needed immediately | 30 days | Milliseconds, per-GB retrieval fee |
| **S3 One Zone-IA** | Infrequently accessed and re-creatable; stored in **one** Availability Zone | 30 days | Milliseconds, per-GB retrieval fee |
| **S3 Glacier Instant Retrieval** | Archive accessed about once a quarter | 90 days | Milliseconds |
| **S3 Glacier Flexible Retrieval** | Archive accessed once or twice a year | 90 days | Minutes to hours (restore first) |
| **S3 Glacier Deep Archive** | Long-term retention, read almost never; the lowest cost | 180 days | Within 12 hours (restore first) |
| **S3 Express One Zone** | Data needing consistent single-digit millisecond access, in one chosen AZ | None | Single-digit milliseconds |

All classes except One Zone-IA and Express One Zone store data across at least three Availability Zones.

> **Exam trap.** "Infrequently accessed but must be available immediately" is Standard-IA (or Glacier Instant Retrieval), not Glacier Flexible Retrieval or Deep Archive, which need a restore. "Unknown access pattern" is Intelligent-Tiering.

<!-- section: block-storage | objectives: 3.6.4 -->
## Block storage: Amazon EBS and instance store

| | Amazon EBS | Instance store |
| --- | --- | --- |
| What it is | Network-attached volumes for EC2 | Disks physically attached to the host computer |
| Persistence | Persists independently of the instance's life | **Temporary**: data is lost when the instance stops or terminates, or if the disk fails |
| Scope | One Availability Zone; attached to instances in that AZ | Only the instance it belongs to |
| Backups | **Snapshots**, incremental, stored in Amazon S3; can be copied to other AZs and Regions | None built in |
| Use | Boot volumes, databases, any data that must survive | Buffers, caches, scratch data, data replicated elsewhere |

EBS volumes are SSD-backed (gp3 by default, io2 for critical databases) or HDD-backed (st1, sc1).

> **Exam trap.** "Temporary storage with the highest I/O, data can be lost" is instance store. "Data must persist after the instance is stopped" is EBS.

<!-- section: file-storage | objectives: 3.6.5 -->
## File services: Amazon EFS and Amazon FSx

| Service | Protocol and clients | Use |
| --- | --- | --- |
| **Amazon EFS** | NFS, Linux | Serverless, elastic file system shared by thousands of instances, containers and functions across AZs |
| **Amazon FSx for Windows File Server** | SMB, Windows, Active Directory integration | Windows file shares, home directories, lift-and-shift of Windows applications |
| **Amazon FSx for NetApp ONTAP** | NFS, SMB and iSCSI | Migrating NetApp workloads; Linux, Windows and macOS clients on the same data |
| **Amazon FSx for OpenZFS** | NFS | Migrating ZFS or Linux file servers |

> **Exam tip.** Several instances must read and write **the same files** at the same time: file storage. Linux points to EFS; Windows and SMB point to FSx for Windows File Server.

<!-- section: hybrid-storage | objectives: 3.6.6 -->
## Cached file systems: AWS Storage Gateway

**AWS Storage Gateway** gives on-premises applications access to cloud storage. It runs as a virtual machine or a hardware appliance in your data center and keeps a **local cache** of recently used data, so applications get low-latency access while the data lives in AWS.

| Gateway type | On-premises interface | Data stored in AWS as |
| --- | --- | --- |
| **S3 File Gateway** | NFS or SMB file shares | Objects in Amazon S3 |
| **Volume Gateway** | iSCSI block volumes (cached or stored) | Volumes backed up as EBS snapshots |
| **Tape Gateway** | Virtual tape library for existing backup software | Virtual tapes in S3, archived in the S3 Glacier classes |

> **Exam trap.** Amazon FSx File Gateway is no longer offered to new customers. Users who must keep accessing files from the office while the data moves to S3 point to S3 File Gateway.

<!-- section: lifecycle | objectives: 3.6.7 -->
## Use cases for lifecycle policies

An **S3 Lifecycle** configuration applies rules to the objects of a bucket (all objects, or a prefix or tags):

- **Transition actions** move objects to a cheaper storage class after a number of days.
- **Expiration actions** delete objects at the end of their retention period, including old versions in a versioned bucket.

| Requirement | Lifecycle rule |
| --- | --- |
| Logs read often for 30 days, rarely afterward, kept 7 years | Transition to Standard-IA, then to Glacier Flexible Retrieval or Deep Archive; expire after 7 years |
| Temporary exports must be deleted after 90 days | Expiration after 90 days |

Amazon EFS also has lifecycle management, which moves files that aren't accessed to lower-cost storage classes.

> **Exam tip.** A known, predictable access pattern ("after 30 days, rarely") is a lifecycle rule; an unknown pattern is Intelligent-Tiering.

<!-- section: aws-backup | objectives: 3.6.8 -->
## Use cases for AWS Backup

**AWS Backup** centralizes and automates backups across AWS services: EC2, EBS, EFS, FSx, RDS, Aurora, DynamoDB, S3, Storage Gateway volumes and more.

- **Backup plans** define the frequency, retention and lifecycle of backups; resources are assigned by tags or IDs.
- Backups are stored in encrypted **backup vaults**; **Vault Lock** prevents anyone from deleting them before the end of their retention.
- **Cross-Region and cross-account copies** protect against a Regional outage or a compromised account.
- With AWS Organizations, **backup policies** apply the same plan to every account.

> **Exam trap.** EBS snapshots back up one volume; AWS Backup is the answer for "central, policy-based backups of many services and accounts". AWS Elastic Disaster Recovery replicates whole servers for fast recovery, which is a different need.

<!-- section: key-points -->
## Key points

- Object (S3), block (EBS, instance store), file (EFS, FSx), hybrid (Storage Gateway), protection (AWS Backup, Elastic Disaster Recovery).
- S3 classes: Standard, Intelligent-Tiering, Standard-IA and One Zone-IA (30 days), Glacier Instant and Flexible Retrieval (90 days), Deep Archive (180 days, cheapest).
- EBS persists in one AZ with snapshots in S3; instance store is temporary.
- EFS for Linux NFS shared files; FSx for Windows File Server for SMB and Active Directory.
- Storage Gateway: local cache, data in S3 (File), volumes (Volume), virtual tapes (Tape).
- Lifecycle rules transition and expire objects; AWS Backup centralizes plans, vaults and cross-Region copies.
