Performance questions show a resource that is too slow, too big or too expensive, with its metrics, and ask for the lowest-risk change: an instance or volume type, a transfer method, a storage class, a file system setting, a database feature or a placement. This chapter maps each metric symptom to its optimization.

<!-- section: compute-rightsizing | objectives: 1.3.1 -->
## Rightsizing compute with metrics, tags and AWS tools

**AWS Compute Optimizer** analyzes CloudWatch utilization and recommends better configurations for EC2 instances, Auto Scaling groups, EBS volumes, Lambda functions, ECS services on Fargate, RDS and Aurora databases, NAT gateways and commercial software licenses, and identifies idle resources.

- Nothing is analyzed until you **opt in**, for one account or, from the management account, for the whole organization.
- It looks at **14 days** of metrics by default; the paid **enhanced infrastructure metrics** option extends it to **93 days** (useful for monthly cycles).
- EC2 findings: **Under-provisioned** (at least one of CPU, memory, network, EBS or disk doesn't meet the need), **Over-provisioned** (can be sized down, nothing under-provisioned), **Optimized**. Each option shows a **performance risk** from very low to very high and the price difference; a preference can include Graviton (arm64) types.
- **Memory** is analyzed only on instances that run the CloudWatch agent; without it, a memory-bound instance may be reported as over-provisioned.

```bash
aws compute-optimizer update-enrollment-status --status Active --include-member-accounts
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=Overprovisioned
```

**Trusted Advisor** also flags low-utilization EC2 instances and underutilized EBS volumes (all checks need Business, Enterprise On-Ramp or Enterprise Support).

**Tags** link resources to owners and actions: cost allocation tags split cost per application in Cost Explorer, Tag Editor finds an application's resources, tags target Run Command and Automation (resize every `Env=dev` instance), and the AWS Config `required-tags` rule enforces them.

Applying a recommendation:

| Resource | How to change it |
| --- | --- |
| Single EBS-backed instance | Stop, change the type, start (or `AWS-ResizeInstance`); instance store data is lost; plan the downtime |
| Auto Scaling group | New launch template version with the new type, then an **instance refresh** (rolling replacement) |
| Move to Graviton | A new arm64 AMI and software built for arm64; changing only the type fails on an x86 AMI |
| T instance always out of credits | A fixed-performance type, or unlimited mode if bursts are short |
| Lambda | Adjust memory (CPU scales with it) as Compute Optimizer suggests |

```bash
aws ec2 stop-instances --instance-ids i-0abc1234def567890
aws ec2 modify-instance-attribute --instance-id i-0abc1234def567890 \
  --instance-type "{\"Value\": \"m7i.large\"}"
aws ec2 start-instances --instance-ids i-0abc1234def567890
```

> **Exam trap.** "Downsize based on CPU only" is a trap when the application is memory-bound. Install the CloudWatch agent first so Compute Optimizer and your alarms see memory.

<!-- section: ebs-performance | objectives: 1.3.2 -->
## Analyzing and optimizing EBS performance

EBS sends volume metrics to `AWS/EBS` every minute at no charge while the volume is attached:

| Metric | Read it as |
| --- | --- |
| `VolumeReadOps`, `VolumeWriteOps` (Sum) | IOPS = (read ops + write ops) ÷ period in seconds |
| `VolumeReadBytes`, `VolumeWriteBytes` | Throughput; bytes ÷ ops gives the I/O size |
| `VolumeTotalReadTime` ÷ `VolumeReadOps` | Average latency per read (same for writes) |
| `VolumeQueueLength` | Requests waiting; persistently high with high latency means the volume is the bottleneck |
| `VolumeIdleTime` | Seconds with no I/O; an always-idle volume is a deletion candidate |
| `BurstBalance` | Remaining credits of gp2 (I/O) and st1/sc1 (throughput); at 0, performance falls to baseline |
| `VolumeThroughputPercentage`, `VolumeConsumedReadWriteOps` | Provisioned IOPS volumes only: share of provisioned IOPS delivered and consumed |
| `VolumeAvgIOPS`, `VolumeAvgThroughput`, `VolumeAvgReadLatency`, `VolumeAvgWriteLatency` | Per-minute averages, on Nitro instances |
| `VolumeIOPSExceededCheck`, `VolumeThroughputExceededCheck` | 1 when the application tried to exceed the volume's provisioned IOPS or throughput |

The instance has its own EBS limits, in `AWS/EC2`: `InstanceEBSIOPSExceededCheck` and `InstanceEBSThroughputExceededCheck` (Nitro), and `EBSIOBalance%`, `EBSByteBalance%` for smaller sizes that burst their EBS bandwidth.

| Diagnosis | Fix |
| --- | --- |
| gp2 volume, `BurstBalance` drops to 0 at peak | Modify to **gp3** and provision the IOPS needed (gp3 includes 3,000 IOPS and 125 MiB/s at any size, up to 80,000 IOPS and 2,000 MiB/s), usually cheaper |
| `VolumeIOPSExceededCheck` = 1 | Raise the volume's provisioned IOPS or throughput, or move to io2 Block Express |
| `InstanceEBSIOPSExceededCheck` = 1 while the volume has headroom | The instance is the limit: choose a type with more EBS bandwidth |
| Slow first reads on a volume restored from a snapshot | Blocks load from S3 on first access: enable fast snapshot restore, set a volume initialization rate (100 to 300 MiB/s) at creation, or read every block with `fio` or `dd` |
| io1/io2 volume with low `VolumeConsumedReadWriteOps` | Over-provisioned: lower the IOPS or move to gp3 |
| st1 used for small random I/O | Wrong media: SSD (gp3) |

**Elastic Volumes** change size, type, IOPS and throughput while the volume is in use. You can modify a volume up to **four times in a rolling 24-hour period**, each change must reach `completed` before the next, size can only grow, a size increase is usable from the `optimizing` state, and you must then extend the partition and file system.

```bash
aws ec2 modify-volume --volume-id vol-0abc1234def567890 \
  --volume-type gp3 --iops 8000 --throughput 400
aws ec2 describe-volumes-modifications --volume-ids vol-0abc1234def567890
sudo growpart /dev/nvme1n1 1 && sudo xfs_growfs -d /data
```

> **Exam trap.** No metric shows a shrinkable volume: EBS can't be made smaller. Reducing an over-sized volume means creating a smaller one and copying the data with `rsync` or `robocopy`.

<!-- section: s3-performance | objectives: 1.3.3 -->
## S3 transfer and storage performance

- **Request rate**: at least 3,500 writes and 5,500 reads per second per prefix. `503 Slow Down` errors mean too many requests on one prefix: retry with backoff and spread keys over more prefixes.
- **Multipart upload**: recommended from 100 MB, parts of 5 MiB to 5 GiB, up to 10,000 parts, objects up to 48.8 TiB. Parts upload in parallel and a failed part is retried alone. The AWS CLI switches automatically above `multipart_threshold`.
- **Byte-range fetches** download parts of an object in parallel.

```bash
aws configure set default.s3.max_concurrent_requests 20
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB
```

| Requirement | Answer |
| --- | --- |
| Users on several continents upload large files to one bucket slowly | **S3 Transfer Acceleration**: edge locations, then the AWS network |
| Migrate or sync NFS, SMB, HDFS or object data to S3, EFS or FSx with integrity checks | **AWS DataSync** task (agent on premises), scheduled, bandwidth-limited, verified |
| Many repeated downloads worldwide | CloudFront in front of the bucket (Transfer Acceleration doesn't cache) |
| Objects cooling down after a known age | **S3 Lifecycle** transitions and expirations |
| Unknown or changing access pattern | S3 Intelligent-Tiering |
| Organization-wide view of usage and activity per bucket | S3 Storage Lens |

Transfer Acceleration needs a DNS-compliant bucket name **without periods**, the endpoint `bucket-name.s3-accelerate.amazonaws.com` and virtual-hosted-style requests; the gain can take 20 minutes to appear after `put-bucket-accelerate-configuration`.

```json
{
  "Rules": [
    {
      "ID": "logs-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 180, "StorageClass": "GLACIER_IR" }
      ],
      "Expiration": { "Days": 730 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

Lifecycle rules to remember: objects must stay 30 days in S3 Standard before moving to Standard-IA or One Zone-IA; objects smaller than 128 KB aren't transitioned by default; **AbortIncompleteMultipartUpload** removes the invisible parts of failed uploads, which are billed.

> **Exam trap.** Transfer Acceleration fails for a bucket named `media.example.com`: the name contains periods. The fix is a new bucket with a compliant name, not a different endpoint.

<!-- section: shared-storage | objectives: 1.3.4 -->
## Choosing and optimizing shared storage

| Requirement | Service |
| --- | --- |
| Linux clients share files over NFS, capacity grows by itself, Regional or One Zone | Amazon EFS |
| Windows clients over SMB, Active Directory, Windows ACLs, DFS | Amazon FSx for Windows File Server |
| HPC or ML training with massive parallel throughput, sub-millisecond latency, linked to an S3 bucket | Amazon FSx for Lustre |
| NFS, SMB and iSCSI on the same data, NetApp snapshots, SnapMirror, cloning | Amazon FSx for NetApp ONTAP |
| File access to data that already lives in an S3 bucket, without copying it out | Amazon S3 Files |

**Amazon S3 Files** is a shared file system built on EFS and linked to an S3 bucket or prefix. EC2, Lambda, EKS and ECS mount it over NFS 4.1 or 4.2 (read-after-write consistency, locking, POSIX permissions). Only the active working set is copied to high-performance storage (files under 128 KiB by default, evicted after 30 days without reads, configurable from 1 to 365); large reads stream from S3. Changes sync both ways with the bucket. Create one mount target per AZ.

**EFS performance and cost**:

| Setting or metric | What to know |
| --- | --- |
| Throughput mode | **Elastic** (automatic, pay per use, spiky loads), **Provisioned** (fixed, independent of size), **Bursting** (grows with data stored, burst credits) |
| `BurstCreditBalance` falling to 0 and `PermittedThroughput` dropping | Bursting mode exhausted: switch to Elastic, or Provisioned for steady known needs |
| `MeteredIOBytes` close to `PermittedThroughput` | The file system uses all its allowed throughput |
| `PercentIOLimit` | How close a General Purpose file system is to its I/O limit |
| `ClientConnections` | One per mounted instance with the standard client |
| Lifecycle management | By default, files unread for 30 days go to **Infrequent Access**, after 90 days to **Archive**; **on first access** brings them back to Standard for latency-sensitive workloads; one policy per file system |

```bash
aws efs put-lifecycle-configuration --file-system-id fs-0abc1234def567890 \
  --lifecycle-policies TransitionToIA=AFTER_30_DAYS TransitionToArchive=AFTER_90_DAYS \
  TransitionToPrimaryStorageClass=AFTER_1_ACCESS
```

FSx file systems are sized explicitly: raise storage and **throughput capacity** (Windows File Server, ONTAP) when metrics show the limit; FSx for Lustre has scratch (not replicated) and persistent deployments.

> **Exam tip.** "Most files are rarely read but some are reopened often and must be fast" points to EFS lifecycle management with the transition back to Standard on first access, not to a second file system.

<!-- section: rds-performance | objectives: 1.3.5 -->
## Monitoring and tuning Amazon RDS performance

| CloudWatch metric | High or low value means |
| --- | --- |
| `CPUUtilization` | Compute-bound queries, or an instance class too small |
| `FreeableMemory`, `SwapUsage` | Memory pressure: a class with more memory, fewer connections |
| `DatabaseConnections` | Connection storms from Lambda or many app servers: RDS Proxy |
| `ReadIOPS`, `WriteIOPS`, `ReadLatency`, `WriteLatency`, `DiskQueueDepth` | Storage-bound: provision more IOPS (gp3 or io2) |
| `FreeStorageSpace` | Storage autoscaling with a maximum threshold, or an increase |
| `ReplicaLag` | Replica can't keep up: larger replica class, fewer long writes |
| `BurstBalance` | gp2 storage out of credits: move to gp3 |

**Enhanced Monitoring** adds OS metrics and the process list every 1 to 60 seconds (an IAM monitoring role is required). **Performance Insights**, now documented as **CloudWatch Database Insights** for RDS, measures **DB load** in **average active sessions (AAS)**, collected every second and sliced by **wait events**, **top SQL**, hosts and users. A load above the **Max vCPU** line means sessions wait for CPU. Seven days of history are included; longer retention (1 to 24 months) is paid. **Proactive recommendations**, on the RDS **Recommendations** page, are raised when metrics cross thresholds learned from the database's baseline; they require detailed per-query and counter metrics with a paid-tier retention period.

**RDS Proxy** keeps a pool of database connections and reuses them, queues or throttles client connections it can't serve, and keeps application connections during a Multi-AZ failover. Facts the exam uses:

- Same VPC as the database, **never publicly accessible**; default endpoint in two AZs.
- IAM authentication can be enforced for clients; the proxy uses Secrets Manager secrets or IAM database authentication.
- On RDS DB instances it fronts the writer, not a read replica.
- **Pinning** (session state, statements over 16 KB) ties a client to one connection: watch `DatabaseConnectionsCurrentlySessionPinned`.

```bash
aws rds create-db-proxy --db-proxy-name orders-proxy --engine-family MYSQL \
  --auth AuthScheme=SECRETS,SecretArn=arn:aws:secretsmanager:eu-west-1:111122223333:secret:orders-db,IAMAuth=REQUIRED \
  --role-arn arn:aws:iam::111122223333:role/orders-proxy-secrets \
  --vpc-subnet-ids subnet-0aaa1111bbbb2222c subnet-0ddd3333eeee4444f --require-tls
aws rds register-db-proxy-targets --db-proxy-name orders-proxy \
  --db-instance-identifiers orders-db
```

> **Exam trap.** "Lambda functions exhaust the database connections at peak" is RDS Proxy, not a read replica (it adds read capacity, not connections to the writer) and not a bigger instance class.

<!-- section: ec2-optimization | objectives: 1.3.6 -->
## Optimizing EC2 instances, their storage and networking

| Placement group | Layout | Use and limits |
| --- | --- | --- |
| **Cluster** | Instances packed close together in one AZ | Lowest latency and highest per-flow throughput for HPC and tightly coupled jobs; a hardware fault can hit them all |
| **Partition** | Groups of instances on separate racks, up to 7 partitions per AZ | Large distributed systems (HDFS, Cassandra, Kafka) that place replicas by partition |
| **Spread** | Each instance on distinct hardware, up to 7 running instances per AZ per group | A few critical instances that must not fail together |

- **Insufficient capacity** in a cluster placement group: launch all instances in one request with one type, or stop and start all instances of the group.
- To move an existing instance into a group: stop it, `modify-instance-placement`, start it.
- **Enhanced networking** with the ENA driver (EFA for HPC and ML needing OS bypass), **jumbo frames** (MTU 9001) inside the VPC, and a larger size for more bandwidth and packets per second.
- **EBS-optimized** bandwidth is dedicated on current generation types; **instance store** NVMe gives the lowest latency for temporary data that is lost when the instance stops.

When the network is the suspect, read the ENA driver counters with `ethtool -S` and publish them with the CloudWatch agent:

| Counter | Meaning |
| --- | --- |
| `bw_in_allowance_exceeded`, `bw_out_allowance_exceeded` | Packets queued or dropped: the instance's aggregate bandwidth was exceeded |
| `pps_allowance_exceeded` | Packet-per-second limit exceeded |
| `conntrack_allowance_exceeded` | Too many tracked connections (security group tracking): new connections fail |
| `linklocal_allowance_exceeded` | Too many packets to Amazon DNS, the instance metadata service or Time Sync |

```bash
aws ec2 create-placement-group --group-name hpc-cluster --strategy cluster
aws ec2 stop-instances --instance-ids i-0abc1234def567890
aws ec2 modify-instance-placement --instance-id i-0abc1234def567890 --group-name hpc-cluster
aws ec2 start-instances --instance-ids i-0abc1234def567890
ethtool -S eth0 | grep allowance
```

> **Exam tip.** Rising `bw_out_allowance_exceeded` with normal CPU means the instance size caps bandwidth: choose a larger or network-optimized type.

<!-- section: key-points -->
## Key points

- Compute Optimizer: opt in, 14 days (93 with enhanced infrastructure metrics), memory needs the CloudWatch agent; apply with stop-modify-start or an instance refresh.
- EBS: IOPS from `VolumeReadOps` + `VolumeWriteOps`; `BurstBalance` at 0 on gp2 means gp3; exceeded checks tell volume limit from instance limit; Elastic Volumes up to four changes per 24 hours, never smaller.
- S3: 3,500 writes / 5,500 reads per second per prefix; multipart from 100 MB; Transfer Acceleration needs a name without periods; DataSync for migrations; abort incomplete uploads.
- Shared storage: EFS, FSx for Windows, FSx for Lustre, FSx for ONTAP, S3 Files; EFS Elastic throughput, lifecycle to IA and Archive.
- RDS: Enhanced Monitoring for the OS, Database Insights for DB load by waits and SQL, proactive recommendations on paid retention, RDS Proxy for connection storms.
- EC2: cluster, partition and spread placement groups; ENA, jumbo frames; ENA allowance counters for network limits.
