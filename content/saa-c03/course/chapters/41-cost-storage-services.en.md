Cost questions on storage give a workload and ask for the MOST cost-effective service, volume type, size or transfer method that still meets the stated performance, durability and access requirements. The method: pick the storage type the workload needs, then the cheapest service and configuration of that type, then check how the data gets there and how the spending is tracked.

<!-- section: storage-types-services | objectives: 4.1.11, 4.1.4 -->
## Storage types and how they are billed

| Type | Services | Billing model | Characteristics |
| --- | --- | --- | --- |
| Object | Amazon S3 | Per GB-month actually stored (by storage class), plus requests, retrievals and data transfer out | Unlimited, accessed by API, 11 nines durability design, lifecycle to cheaper classes |
| Block | Amazon EBS | Per GB-month **provisioned**, plus provisioned IOPS and throughput above the baseline (gp3, io1, io2) | One AZ, attached to instances, lowest latency |
| Block, temporary | EC2 instance store | Included in the instance price | Lost on stop or termination; caches, buffers, scratch |
| File, Linux (NFS) | Amazon EFS | Per GB-month used, by storage class; throughput depends on mode | Elastic: grows and shrinks automatically; many clients across AZs |
| File, managed third-party file systems | Amazon FSx for Windows File Server, Lustre, NetApp ONTAP, OpenZFS | Mostly provisioned storage and throughput capacity; Intelligent-Tiering class (Lustre, OpenZFS) billed for data stored | Native protocols and features (SMB and Active Directory, Lustre, ONTAP, ZFS) |

> **Exam trap.** An EBS volume costs the same whether it is full or empty: you pay for the provisioned size. A 2 TiB volume holding 200 GiB wastes 90 % of its cost, while EFS or S3 bill only what is stored.

<!-- section: block-storage | objectives: 4.1.6 -->
## Block storage options: SSD and HDD volume types

| Volume type | Size | Maximum IOPS | Maximum throughput | Boot volume | Choose it for |
| --- | --- | --- | --- | --- | --- |
| gp3 (General Purpose SSD) | 1 GiB – 64 TiB | 80,000 | 2,000 MiB/s | Yes | Default for most workloads: 3,000 IOPS and 125 MiB/s included at any size, more provisioned independently of size |
| gp2 (General Purpose SSD, previous) | 1 GiB – 16 TiB | 16,000 | 250 MiB/s | Yes | Legacy: 3 IOPS per GiB, bursts to 3,000 IOPS with credits |
| io2 Block Express (Provisioned IOPS SSD) | 4 GiB – 64 TiB | 256,000 | 4,000 MiB/s | Yes | Critical databases needing sustained IOPS, sub-millisecond latency, 99.999 % durability |
| io1 (Provisioned IOPS SSD, previous) | 4 GiB – 16 TiB | 64,000 | 1,000 MiB/s | Yes | Existing I/O-intensive databases |
| st1 (Throughput Optimized HDD) | 125 GiB – 16 TiB | 500 | 500 MiB/s | No | Large sequential I/O: big data, data warehouses, log processing |
| sc1 (Cold HDD) | 125 GiB – 16 TiB | 250 | 250 MiB/s | No | Infrequently accessed sequential data, lowest cost per GiB |

Cost rules:

- **gp3 is cheaper than gp2** per GiB and decouples performance from size. With gp2, getting 9,000 IOPS means provisioning 3,000 GiB; with gp3, a small volume plus 9,000 provisioned IOPS.
- Pay for io2 only when gp3's limits or durability aren't enough.
- HDD volumes are cheap but can't be boot volumes and perform badly on small random I/O.
- **Elastic Volumes** change type, size, IOPS and throughput on an attached volume without downtime (up to four modifications per volume in a rolling 24 hours). Size can only increase: to shrink, create a smaller volume and copy the data. After a size increase, extend the file system.

```bash
# Convert a gp2 volume to gp3 in place, keeping the gp3 baseline performance
aws ec2 modify-volume --volume-id vol-0abc1234def567890 \
  --volume-type gp3 --iops 3000 --throughput 125
```

> **Exam tip.** "Reduce EBS cost without downtime and without changing performance" for gp2 volumes is a modification to gp3 with Elastic Volumes. "Sequential throughput, lowest cost, not a boot volume" is st1; "rarely accessed" is sc1.

<!-- section: cost-effective-service | objectives: 4.1.4, 4.1.21 -->
## Selecting the most cost-effective storage service

| Requirement | Most cost-effective answer |
| --- | --- |
| Store large amounts of unstructured data accessed by applications over HTTPS | S3, with the storage class matching the access pattern (S3 Intelligent-Tiering when unknown) |
| Shared Linux file system, unpredictable size, many instances | EFS with Elastic throughput and a lifecycle policy to EFS Infrequent Access and Archive |
| Shared file system for a single-AZ, non-critical workload (dev, test) | EFS One Zone, or FSx single-AZ deployment |
| Windows file shares with Active Directory, DFS, SMB | FSx for Windows File Server; HDD storage for home directories and general shares, SSD for latency-sensitive workloads; Single-AZ when Multi-AZ isn't required |
| HPC or ML scratch space over data in S3 | FSx for Lustre scratch deployment linked to the S3 bucket (data not replicated, cheapest) |
| Migrate an on-premises NetApp system, NFS, SMB and iSCSI together | FSx for NetApp ONTAP: automatic tiering to a lower-cost capacity pool, deduplication and compression |
| Migrate ZFS or Linux NFS servers needing low latency | FSx for OpenZFS |
| Database on EC2 needing moderate IOPS | EBS gp3 |
| Temporary data that the application can regenerate | Instance store (no extra charge) |

EFS storage classes: Standard, **Infrequent Access** (up to 95 % lower cost than Standard, no minimum storage duration) and **Archive** (lower again, 90-day minimum storage duration, higher access charges). Files smaller than 128 KiB are billed as 128 KiB in IA and Archive. One Zone file systems store data in a single AZ: cheaper, but not resilient to an AZ loss.

> **Exam trap.** EFS doesn't support Windows clients over SMB. "Windows servers need a shared file system" is FSx for Windows File Server, even if EFS would be cheaper.

<!-- section: storage-sizing | objectives: 4.1.13, 4.1.15 -->
## Storage size and storage auto scaling

| Service | Capacity behavior | What you do |
| --- | --- | --- |
| S3, EFS | Elastic, pay for what is stored | Nothing to size; control growth with lifecycle rules |
| Aurora | Cluster volume grows automatically (up to 256 TiB on specific engine versions) and frees space when data is dropped; billed for space used | Nothing to size |
| RDS (MySQL, MariaDB, PostgreSQL, Oracle, SQL Server) | Allocated storage, paid as provisioned | Enable **storage autoscaling** with a maximum storage threshold |
| EBS | Provisioned size, no automatic growth | Monitor usage (CloudWatch agent disk metrics) and increase with Elastic Volumes |
| FSx (SSD storage classes) | Provisioned storage capacity | Increase capacity when needed; Intelligent-Tiering (Lustre, OpenZFS) is elastic |

RDS storage autoscaling adds storage when free space is at most 10 % of allocated storage for at least five minutes, and storage optimization from the previous modification has completed with fewer than four modifications in the past 24 hours. The increment is the largest of 10 GiB, 10 % of allocated storage, or the predicted growth for the next 7 hours. Allocated storage **never shrinks**, so start small and let it grow.

```bash
# Turn on RDS storage autoscaling with a ceiling of 2,000 GiB
aws rds modify-db-instance --db-instance-identifier orders-db \
  --max-allocated-storage 2000 --apply-immediately
```

Right-sizing rules: size provisioned storage for current need plus growth until the next review, not for the five-year maximum; use storage that scales automatically when growth is unpredictable; reduce over-provisioned EBS by migrating to a smaller volume.

> **Exam tip.** "Database storage grows unpredictably; avoid outages caused by full storage and avoid paying for unused capacity" is RDS storage autoscaling (or Aurora), not a large initial allocation.

<!-- section: upload-strategies | objectives: 4.1.12 -->
## Storage strategies: batch uploads versus individual uploads

S3 charges for every request (`PUT`, `COPY`, `POST`, `LIST`, lifecycle transitions) in addition to storage. Many small objects multiply request and per-object costs:

| Situation | Cost-effective strategy |
| --- | --- |
| Millions of small files (sensor readings, logs) to store in S3 | Aggregate before upload: Data Firehose buffers records into larger objects, or bundle files (tar, zip, Parquet) in a batch |
| Small objects to archive | Lifecycle doesn't transition objects smaller than 128 KB by default; each transition is one request; Glacier Flexible Retrieval and Deep Archive add 40 KB of metadata per object (8 KB at S3 Standard rates). Aggregate small objects into larger archives first |
| Standard-IA, One Zone-IA, Glacier Instant Retrieval | Minimum billable object size of 128 KB: storing 10 KB objects there costs more than expected |
| Large files (GB) | Multipart upload: parallel parts, retry only failed parts; a single `PUT` is limited to 5 GB, an object to 50 TB |
| Bulk action on existing objects (copy, tag, restore, change class) | S3 Batch Operations instead of scripts issuing individual calls |
| Recurring bulk file loads from on premises | DataSync task on a schedule rather than a custom per-file upload script |

> **Exam trap.** Moving billions of tiny objects to S3 Glacier Deep Archive can cost more than leaving them in S3 Standard, because of per-object transition requests and the 40 KB overhead per object. Combine them first.

<!-- section: hybrid-transfer | objectives: 4.1.8, 4.1.14, 4.1.18 -->
## Hybrid storage, migration services and lowest-cost transfer

| Need | Service |
| --- | --- |
| One-time or recurring copy of file or object data into S3, EFS or FSx | AWS DataSync (charged per GB transferred) |
| On-premises applications keep NFS or SMB while data is stored in S3 | Storage Gateway S3 File Gateway |
| Replace a physical tape library | Storage Gateway Tape Gateway, tapes archived in S3 Glacier Flexible Retrieval or Deep Archive |
| Back up or extend on-premises iSCSI volumes | Storage Gateway Volume Gateway (cached or stored) |
| Partners send files over SFTP, FTPS, FTP or AS2 | AWS Transfer Family (charged per hour while each protocol endpoint is enabled, plus per GB) |
| Migrate databases | AWS DMS (not a storage transfer service) |
| Migrate whole servers | AWS Application Migration Service |
| Very large data set, little bandwidth | AWS Data Transfer Terminal (bring your own devices); Snowball Edge is no longer available to new customers |

Lowest-cost transfer method:

1. Data transfer **into** AWS over the internet has no data transfer charge. If the existing internet link can move the data before the deadline, use it (with DataSync for integrity checks and scheduling, or the AWS CLI for a simple copy to S3).
2. If the link is too slow, compare the time and cost of a Direct Connect connection (port hours plus a physical cross-connect with a long lead time; worth it for ongoing transfers) with a physical transfer at a Data Transfer Terminal.
3. Avoid paying for a feature you don't need: S3 Transfer Acceleration adds a charge and only helps long-distance uploads.
4. Throttle DataSync with a bandwidth limit during business hours rather than buying more bandwidth.

> **Exam trap.** "Cheapest way to copy 5 TB once over an underused 1 Gbps link" is a network transfer (about half a day at full speed), not Direct Connect, whose setup takes longer than the transfer itself.

<!-- section: cost-management | objectives: 4.1.2, 4.1.3 -->
## Cost management features and tools

Features:

- **Cost allocation tags**: AWS-generated (prefix `aws:`, such as `aws:createdBy`) and user-defined tags must be **activated** in the Billing and Cost Management console before they appear in Cost Explorer and cost reports. In an organization, only the management account activates them; they can take up to 24 hours to appear. Standardize tag keys and values with tag policies in AWS Organizations.
- **Consolidated billing** (AWS Organizations): one bill for all member accounts, paid by the management account; usage is combined for volume pricing tiers; Reserved Instance and Savings Plans discounts are shared across accounts.
- **Cost Categories**: rules that group costs (by account, tag, service) into business units.

Tools:

| Tool | What it answers | Key facts |
| --- | --- | --- |
| AWS Cost Explorer | "Where did the money go, and what's the trend?" | Interactive charts and filters (service, account, tag); up to 13 months of history; forecast up to 18 months; Reserved Instance reports and recommendations; refreshed at least every 24 hours |
| AWS Budgets | "Warn or act before we exceed X" | Cost, usage, RI and Savings Plans utilization or coverage budgets; alerts on actual or forecasted values by email or SNS; budget actions apply an IAM policy or SCP or target EC2 and RDS instances, automatically or after approval; data updated up to three times a day |
| AWS Cost and Usage Report (CUR 2.0 through AWS Data Exports) | "Every line item, for our own analysis" | Most detailed data, by hour, day or month, delivered to S3; query with Athena, load into Redshift or visualize in Quick |
| AWS Cost Anomaly Detection | "Tell us about unusual spend" | Machine learning monitors by service, linked account, cost allocation tag or cost category; individual alerts by SNS or daily and weekly email summaries; root cause analysis |

> **Exam tip.** "Notify the finance team when forecasted monthly spend will exceed the budget" is AWS Budgets with a forecasted alert. "Chargeback per department with SQL on line items" is cost allocation tags plus CUR 2.0 queried with Athena.

<!-- section: key-points -->
## Key points

- S3 and EFS bill what is stored; EBS and most FSx configurations bill what is provisioned.
- gp3 is the default and cheaper than gp2; io2 only for extreme IOPS or durability; st1 and sc1 for sequential, non-boot data. EBS can grow, never shrink.
- Cheapest file storage: EFS IA or Archive with lifecycle, One Zone for non-critical data, FSx HDD or Single-AZ when allowed, Lustre scratch for temporary HPC data.
- RDS storage autoscaling for unpredictable growth; Aurora, S3 and EFS grow by themselves.
- Aggregate small objects before upload or archive; multipart upload for large ones; S3 Batch Operations for bulk changes.
- Transfer in is free: use the existing network when time allows; DataSync to migrate, Storage Gateway for hybrid access, Transfer Family for SFTP; Data Transfer Terminal for huge data sets.
- Tags must be activated; Cost Explorer explores, Budgets alerts and acts, CUR 2.0 gives line items, Cost Anomaly Detection finds surprises.
