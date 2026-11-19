Performance questions on storage give you a workload (a database, a shared file system, a data lake, an on-premises file server) and a constraint (IOPS, throughput, latency, concurrent access, growth, protocol) and ask which service and which configuration meet it. Start from the storage type, pick the service, then tune the configuration: volume type, storage class, throughput mode or deployment type.

<!-- section: storage-types | objectives: 3.1.3 -->
## Block, file and object storage

| Type | Unit of access | Shared by | AWS services | Typical workload |
| --- | --- | --- | --- | --- |
| Block | Fixed-size blocks on a volume, formatted by the OS | One instance (Multi-Attach io1/io2: up to 16 Nitro instances in one AZ) | Amazon EBS, EC2 instance store | Boot volumes, relational and NoSQL databases on EC2, transactional applications |
| File | Files and directories over NFS or SMB, with locking | Thousands of clients at once | Amazon EFS, Amazon FSx (Windows File Server, Lustre, NetApp ONTAP, OpenZFS) | Shared content, home directories, lift-and-shift applications, HPC |
| Object | Whole objects addressed by key over HTTPS (API) | Any number of clients, any network | Amazon S3 | Data lakes, media, backups, static web content, logs |

Characteristics that decide exam answers:

- **Block** has the lowest latency and is the only type a database engine or an OS boot disk uses directly. An EBS volume lives in **one Availability Zone** and is attached to instances in that AZ. Snapshots go to S3 and can be copied to other AZs and Regions.
- **Instance store** is physically attached to the host: highest IOPS for the price, but **temporary**. Use it for buffers, caches, scratch data and data replicated across a fleet, never for the only copy.
- **File** is the answer as soon as several instances (or containers, or on-premises servers) must read and write the **same files** concurrently with a POSIX or Windows file interface.
- **Object** storage scales without limit, is accessed by API (not mounted as a disk by default) and replaces an object as a whole: no in-place partial update.

> **Exam trap.** "Several EC2 instances in different Availability Zones need shared access to the same files" is never EBS: EBS Multi-Attach works only in one AZ and needs a cluster-aware file system. The answer is EFS (Linux, NFS) or FSx for Windows File Server (SMB).

<!-- section: storage-services | objectives: 3.1.2 -->
## Choosing a storage service

| Requirement | Service |
| --- | --- |
| Persistent low-latency disk for one EC2 instance, database on EC2 | Amazon EBS |
| Highest random I/O for temporary data, lost when the instance stops | EC2 instance store |
| Shared Linux file system (NFS), elastic, multi-AZ, no capacity to manage | Amazon EFS |
| Windows file shares (SMB), Active Directory, Windows ACLs | Amazon FSx for Windows File Server |
| HPC, ML training, sub-millisecond parallel file system linked to S3 | Amazon FSx for Lustre |
| Migrate NetApp workloads; NFS, SMB and iSCSI on the same data; SnapMirror, FlexClone | Amazon FSx for NetApp ONTAP |
| Migrate a ZFS or Linux NFS file server, snapshots and clones | Amazon FSx for OpenZFS |
| Unlimited object storage, data lake, static website origin, backup target | Amazon S3 |
| Single-digit millisecond object access co-located with compute | S3 Express One Zone (directory bucket) |

Notes the exam uses:

- **EFS** is Linux only (NFSv4). Regional file systems store data across several AZs; One Zone file systems store it in one AZ at lower cost. Storage classes: EFS Standard (SSD), EFS Infrequent Access and EFS Archive, with lifecycle management between them.
- **FSx for Windows File Server** joins an Active Directory (AWS Managed Microsoft AD or self-managed), offers Single-AZ or Multi-AZ (standby file server in another AZ), SSD or HDD storage.
- **FSx for NetApp ONTAP** is the multiprotocol answer (Linux, Windows and macOS clients on the same volume) and moves cold data automatically to a capacity pool tier.

> **Exam tip.** Protocol is the fastest filter: SMB plus Active Directory means FSx for Windows File Server; NFS for Linux with zero administration means EFS; "parallel", "HPC" or "process S3 data as files" means FSx for Lustre; "NetApp" or iSCSI plus NFS plus SMB means FSx for NetApp ONTAP.

<!-- section: ebs-performance | objectives: 3.1.4 -->
## Amazon EBS volume types and performance

| Volume type | Media | Size | Max IOPS per volume | Max throughput per volume | Use |
| --- | --- | --- | --- | --- | --- |
| gp3 | SSD | 1 GiB–64 TiB | 80,000 | 2,000 MiB/s | Default for most workloads: boot, dev/test, most databases |
| gp2 | SSD | 1 GiB–16 TiB | 16,000 | 250 MiB/s | Previous general purpose type; performance tied to size |
| io2 Block Express | SSD | 4 GiB–64 TiB | 256,000 | 4,000 MiB/s | Mission-critical databases, sub-millisecond latency, 99.999 % durability |
| io1 | SSD | 4 GiB–16 TiB | 64,000 | 1,000 MiB/s | Older Provisioned IOPS type |
| st1 | HDD | 125 GiB–16 TiB | 500 | 500 MiB/s | Large sequential reads and writes: big data, log processing, data warehouses |
| sc1 | HDD | 125 GiB–16 TiB | 250 | 250 MiB/s | Cold, rarely accessed sequential data at the lowest cost |

How performance is obtained:

- **gp3**: a baseline of **3,000 IOPS and 125 MiB/s** is included whatever the size. Extra IOPS (up to 500 per GiB) and extra throughput (up to 0.25 MiB/s per provisioned IOPS) are provisioned and billed **independently of capacity**. No burst credits.
- **gp2**: 3 IOPS per GiB (minimum 100, maximum 16,000 reached at 5,334 GiB); volumes under 1 TiB burst to 3,000 IOPS with I/O credits. Migrating gp2 to gp3 usually gives more performance for less money.
- **io2 Block Express**: up to 1,000 IOPS per GiB; full 256,000 IOPS only on Nitro-based instances. io1 and io2 support **Multi-Attach** (up to 16 Nitro instances in the same AZ).
- **st1 and sc1** are measured in MiB/s for large (1 MiB) sequential I/O; they **can't be boot volumes** and perform badly on small random I/O.
- The instance limits the volume: choose an **EBS-optimized** instance type with enough EBS bandwidth, or the volume never reaches its provisioned figures.

| Requirement | Answer |
| --- | --- |
| Database needs 20,000 IOPS on a 200 GiB volume, cost-effective | gp3 with 20,000 provisioned IOPS |
| More than 80,000 IOPS, or sub-millisecond latency for a critical database | io2 Block Express on a Nitro instance |
| Sequential throughput for a Hadoop or log workload, lowest cost per GiB | st1 |
| Archive data read a few times a year on a block volume | sc1 |
| Millions of random IOPS for a temporary cache | Instance store (NVMe) on a storage optimized instance |

> **Exam trap.** On gp2, the only way to get more IOPS is a bigger volume; on gp3 you raise IOPS without paying for unused capacity. A question that says "the volume is oversized only to get IOPS" points to gp3.

<!-- section: s3-performance | objectives: 3.1.4 -->
## Amazon S3 performance

- Request rate: at least **3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second per partitioned prefix**, with no limit on the number of prefixes. Spread keys across prefixes and parallelize to multiply the rate (10 prefixes allow about 55,000 reads per second). While S3 scales up, clients can get **503 Slow Down** errors: retry with backoff.
- **Multipart upload**: best practice for objects of 100 MB or more; parts upload in parallel and a failed part is retried alone (up to 10,000 parts).
- **Byte-range fetches**: download parts of a large object in parallel, or only the part you need.
- **S3 Transfer Acceleration**: routes uploads and downloads through CloudFront edge locations over the AWS network; for clients far from the bucket's Region.
- **Amazon CloudFront** or **ElastiCache** in front of S3: for many repeated reads, higher transfer rates per connection or single-digit millisecond latency.
- **S3 Express One Zone**: directory buckets in **one AZ** that you choose, consistent single-digit millisecond access, data access up to 10x faster and request costs 80 % lower than S3 Standard; place it in the AZ of the EC2, ECS or EKS compute. Not for data that must survive the loss of an AZ.

> **Exam trap.** Transfer Acceleration speeds up long-distance transfers to a bucket; it doesn't cache anything. Repeated downloads by users worldwide call for CloudFront.

<!-- section: file-performance | objectives: 3.1.2, 3.1.4 -->
## EFS and FSx performance settings

**Amazon EFS**

| Setting | Options | Choose |
| --- | --- | --- |
| Performance mode | General Purpose (default, lowest latency), Max I/O (previous generation) | General Purpose for every file system; Max I/O isn't supported with Elastic throughput or One Zone |
| Throughput mode | Elastic, Provisioned, Bursting | Elastic for spiky or unpredictable workloads (pay per use); Provisioned when throughput needs are known and higher than size allows; Bursting scales with stored data (50 KiBps per GiB baseline) |

A Bursting file system that runs out of burst credits slows down: switch it to Elastic, or to Provisioned for steady known throughput. After switching to Provisioned or changing the amount, you must wait 24 hours before decreasing it or switching back.

**Amazon FSx for Lustre**

| Deployment type | Behavior | Use |
| --- | --- | --- |
| Scratch | Data not replicated, lost if a file server fails | Short-term processing, cheapest per job |
| Persistent | Data replicated, file servers replaced on failure | Long-running workloads, longer-term storage |

FSx for Lustre gives sub-millisecond latency, up to multiple TBps and millions of IOPS. A **data repository association** with an S3 bucket presents objects as files, loads them on first access and can export results back to S3. Storage classes: SSD (small random I/O, consistent latency), HDD (throughput-heavy, optional SSD read cache) and Intelligent-Tiering (elastic, with optional SSD read cache).

**FSx for Windows File Server and FSx for NetApp ONTAP** let you size storage capacity, SSD IOPS and throughput capacity separately and change them later.

> **Exam tip.** "Process millions of files from an S3 data lake with an HPC cluster, then write results back to S3" is FSx for Lustre linked to the bucket, usually with a scratch deployment when the data is already safe in S3.

<!-- section: hybrid-storage | objectives: 3.1.1 -->
## Hybrid storage solutions

| Requirement | Service |
| --- | --- |
| On-premises applications write files over NFS or SMB, data stored as S3 objects, local cache for recent data | AWS Storage Gateway, S3 File Gateway |
| On-premises applications use iSCSI block volumes, primary data in AWS, frequently accessed data cached locally | Volume Gateway, cached volumes |
| iSCSI volumes kept entirely on premises with asynchronous backup to AWS as EBS snapshots | Volume Gateway, stored volumes |
| Replace physical tapes without changing the backup software | Tape Gateway (virtual tape library, tapes archived in S3 Glacier classes) |
| One-time or scheduled online transfer of large datasets between on premises (NFS, SMB, HDFS, object), other clouds and S3, EFS or FSx | AWS DataSync |
| Partners exchange files with SFTP, FTPS or FTP into S3 or EFS | AWS Transfer Family |
| Low-latency file access in Windows branch offices to FSx for Windows File Server | FSx for Windows File Server directly over Direct Connect or Site-to-Site VPN |
| Data must stay on premises for latency or residency but use AWS services | AWS Outposts (EBS and S3 on Outposts) |
| NetApp on premises replicated to AWS | FSx for NetApp ONTAP with SnapMirror |

- Storage Gateway runs as a VM (VMware ESXi, Hyper-V, KVM, Nutanix), a hardware appliance or an EC2 instance. The **local cache** gives on-premises applications low latency while the data lives in AWS.
- **DataSync** moves data (an agent on premises reads the source, transfers are encrypted, validated and parallel, over the internet or Direct Connect); **Storage Gateway** keeps giving ongoing local access. A question that says "migrate, then decommission the NAS" is DataSync; "keep using the share from the office" is Storage Gateway.

> **Exam trap.** Amazon FSx File Gateway is no longer available to new customers, and AWS Snow Family devices can no longer be ordered. Don't pick them for a new design: access FSx for Windows File Server directly, and transfer online with DataSync.

<!-- section: storage-scaling | objectives: 3.1.5 -->
## Storage that scales with future needs

| Service | How it grows | What you manage |
| --- | --- | --- |
| Amazon S3 | Unlimited objects and capacity; request rate scales per prefix | Nothing; key design for very high request rates |
| Amazon EFS | Grows and shrinks automatically as files are added and removed, to petabytes | Throughput mode only |
| Amazon EBS | Elastic Volumes: increase size, change type, IOPS and throughput while attached | Extend the partition and file system after a size increase; size can't be reduced |
| FSx file systems | Increase storage capacity and throughput capacity of an existing file system | Plan increases; FSx for Lustre Intelligent-Tiering and ONTAP capacity pool are elastic |
| Aurora storage | Cluster volume grows automatically | Nothing |

```bash
# Change an attached gp2 volume to gp3 with more IOPS and throughput (Elastic Volumes)
aws ec2 modify-volume --volume-id vol-0abc1234def567890 \
  --volume-type gp3 --iops 6000 --throughput 500
```

- For **unpredictable growth** with no capacity planning, prefer the elastic services: S3, EFS, FSx for Lustre Intelligent-Tiering.
- For **unpredictable throughput**, EFS Elastic throughput and S3 scale without provisioning; gp3 and io2 need you to provision new figures.
- Beyond one EBS volume's limits, stripe several volumes in RAID 0 on the instance, or move the data to a scalable service.

> **Exam tip.** "Without downtime" for a growing EBS volume means Elastic Volumes (modify-volume), not snapshot and restore to a bigger volume.

<!-- section: key-points -->
## Key points

- Block for one instance and databases, file for shared access, object for unlimited scale and API access.
- gp3 is the default: 3,000 IOPS and 125 MiB/s included, IOPS and throughput provisioned apart from size. io2 Block Express for extreme IOPS and latency; st1/sc1 for sequential HDD, never boot.
- S3 scales per prefix (3,500 writes / 5,500 reads per second); multipart upload, byte-range fetches, Transfer Acceleration, CloudFront, S3 Express One Zone.
- EFS: General Purpose plus Elastic throughput for most cases. FSx for Lustre for HPC on S3 data.
- Hybrid: Storage Gateway for ongoing local access, DataSync for transfers, Transfer Family for SFTP partners, Outposts for data that stays on premises.
