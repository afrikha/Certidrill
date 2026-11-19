# C-saa-c03-3 — COURSE, SAA-C03, chapters 31, 32, 33, 34

Files: `content/saa-c03/course/chapters/{31-storage-performance,32-elastic-compute,33-database-selection,34-database-scaling}.{en,fr}.md` (8 files). The `chapters/` folder did not exist; it was created. `course.yaml` not touched (chapters already `status: draft` there).
Check: `npx tsx factory/check-cert.ts saa-c03 31-storage-performance 32-elastic-compute 33-database-selection 34-database-scaling` → `course problems (your chapters): 0`.
English words (table syntax and markers excluded): 31 = 2,160; 32 = 2,053; 33 = 1,838; 34 = 1,775.

## Objective coverage

- 31: 3.1.1 (hybrid-storage), 3.1.2 (storage-services, file-performance), 3.1.3 (storage-types), 3.1.4 (ebs-performance, s3-performance, file-performance), 3.1.5 (storage-scaling).
- 32: 3.2.1 (compute-services), 3.2.2 (distributed-computing), 3.2.3 + 3.2.7 (decoupling), 3.2.4 (auto-scaling), 3.2.5 (serverless), 3.2.6 (containers), 3.2.8 (scaling-metrics), 3.2.9 (instance-selection), 3.2.10 (right-sizing).
- 33: 3.3.3 (access-patterns), 3.3.4 (capacity-planning), 3.3.6 (migrations), 3.3.8 (database-types), 3.3.10 (database-architectures), 3.3.11 (engine-choice), 3.3.12 (database-type-choice).
- 34: 3.3.1 (global-infrastructure), 3.3.2 (caching-services), 3.3.5 (connections-proxies), 3.3.7 (replication-concepts), 3.3.9 (read-replicas-config), 3.3.13 (caching-integration).

## Facts verified on docs.aws.amazon.com / aws.amazon.com on 2026-11-19 (recent, worth a reviewer's eye)

- EBS: **gp3 now 1 GiB–64 TiB, up to 80,000 IOPS (500 IOPS/GiB) and 2,000 MiB/s** (0.25 MiB/s per IOPS); baseline 3,000 IOPS / 125 MiB/s. io2 Block Express 256,000 IOPS, 4,000 MiB/s, 64 TiB, 1,000:1. Multi-Attach io1/io2, 16 Nitro instances, same AZ. Question writers using the old 16,000 IOPS / 1,000 MiB/s gp3 limits would be wrong.
- Amazon FSx File Gateway: "no longer available to new customers" (no date on the page).
- EFS: Max I/O is "previous generation", not supported with Elastic throughput or One Zone; 24-hour lock after switching to / changing Provisioned.
- FSx for Lustre storage classes: SSD, HDD, Intelligent-Tiering.
- S3 Express One Zone: up to 10x faster access, 80 % lower request cost than S3 Standard.
- Lambda: async payload now 1 MB (not written in chapter); Lambda Managed Instances allow 90-minute async timeout (not written; chapter says 900 s for standard functions). Fargate Linux tasks now up to **32 vCPU / 244 GB**.
- SQS maximum message size now **1 MiB** (was 256 KiB).
- Aurora Global Database: up to **10** secondary Regions, up to 16 readers per secondary cluster. Aurora Serverless v2: 0–256 ACUs (MySQL) / 0–384 ACUs (PostgreSQL). Aurora cluster volume: the RDS quotas page says 128 TiB, the storage page and FAQ say 256 TiB for specific engine versions — chapter says "128 TiB, or 256 TiB on recent engine versions".
- AWS Auto Scaling scaling plans still offered; AWS recommends predictive scaling policies directly on resources instead of plans for predictive-only use.
- DynamoDB on-demand is the "default and recommended" mode; MRSC global tables exist (same account only, mode fixed at creation).
- RDS read replicas: 15 per source (Oracle: recommend 5); "RDS doesn't support autoscaling of read replicas".

## Not confirmed by a page fetched in this session (general knowledge)

- sc1 size range 125 GiB–16 TiB (table cell did not extract); st1/sc1 125 GiB minimum confirmed for st1 only.
- SQS long polling maximum 20 seconds; "backlog per instance" scaling recommendation; SQS FIFO figures beyond "300 msg/s per partition, 3,000 with batching" (chapter only says FIFO throughput is limited).
- DynamoDB 400 KB item size and 3,000 RCU / 1,000 WCU per partition (the quotas page fetched did not show them).
- AWS Compute Optimizer resource list (EC2, ASG, EBS, Lambda, ECS on Fargate); T instance credit modes (standard / unlimited).
- RDS Custom (Oracle, SQL Server), Babelfish for Aurora PostgreSQL, Aurora zero-ETL to Redshift, DMS Serverless, RDS Proxy read-only endpoints for Aurora (mentioned only as linked blog on the FAQ).
- Local Zones / Wavelength / CloudFront Functions / Global Accelerator descriptions.
- AWS SCT: the fetched SCT page shows no deprecation notice; the chapter presents DMS Schema Conversion first and SCT as an alternative.

## Deviations

- No `content/saa-c03/glossary.yaml` exists; French terms follow BRIEF-AWS §6 (compartiment, groupe de sécurité, Région, politique, réplica en lecture, point de terminaison, groupe Auto Scaling, instance de base de données / cluster de bases de données as in AWS fr_fr RDS docs). Some feature names kept in English with French gloss: warm pools, reader endpoint, write forwarding, switchover/failover (« permutation » / « basculement »).
- Timestream, QLDB and Aurora DSQL deliberately left out (not in the guide's in-scope list or retired).
