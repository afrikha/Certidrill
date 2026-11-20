# C-saa-c03-4 — COURSE SAA-C03, chapters 35, 36, 37, 41 (2026-11-19)

## Output
- `content/saa-c03/course/chapters/35-network-performance.{en,fr}.md` (EN about 2,060 words outside code)
- `content/saa-c03/course/chapters/36-data-ingestion.{en,fr}.md` (about 1,720)
- `content/saa-c03/course/chapters/37-data-lakes-analytics.{en,fr}.md` (about 1,590)
- `content/saa-c03/course/chapters/41-cost-storage-services.{en,fr}.md` (about 2,120)
- `check-cert.ts saa-c03 35-network-performance 36-data-ingestion 37-data-lakes-analytics 41-cost-storage-services`: 0 course problems for these chapters.

## Facts verified on AWS docs this session (WebFetch, model-summarised)
Global Accelerator static IPs, traffic dial and weights; ELB cross-zone defaults, ALB algorithms, stickiness, slow start, deregistration delay; NLB protocols (incl. QUIC) and targets; GWLB GENEVE 6081; VPN tunnel quotas (1.25 Gbps standard, 5 Gbps large bandwidth); accelerated VPN requires transit gateway; Direct Connect dedicated (1/10/100/400 Gbps) and hosted (50 Mbps–25 Gbps) speeds, MACsec (10/100/400 dedicated only); placement group limits; subnet sizing and 5 reserved addresses; Transit Gateway; VPC peering limits; CloudFront Functions vs Lambda@Edge; origin failover; Local Zones; Kinesis Data Streams limits (10 MiB record, 4 MB/s on-demand start, mode switch twice/24 h, 365-day retention), enhanced fan-out; Firehose destinations, buffering (1–128 MiB/5, 0–900 s/300), JSON-only format conversion, dynamic partitioning; DataSync locations and Enhanced/Basic modes; FSx File Gateway and Snowball Edge closed to new customers; Data Transfer Terminal; Transfer Family endpoints; S3 50 TB max object, 5 GB single PUT; Transfer Acceleration; Athena, Lake Formation, Glue, EMR architecture, EMR Serverless; Quick / SPICE; EBS volume table (gp3 now 64 TiB / 80,000 IOPS / 2,000 MiB/s) and Elastic Volumes (4 modifications per rolling 24 h, no shrink); RDS storage autoscaling (new rule: fewer than four modifications in 24 h); Aurora up to 256 TiB on specific versions; EFS classes and throughput modes; FSx family; cost allocation tags; Cost Explorer (13 months history, 18-month forecast); Budgets and budget actions; Data Exports / CUR 2.0; Cost Anomaly Detection; consolidated billing; S3 lifecycle small-object rules and 40 KB Glacier overhead.

## Stated from general knowledge (stable, not re-fetched)
Two tunnels per Site-to-Site VPN connection; Global Accelerator TCP/UDP listeners; VPC CIDR range /16–/28 for the VPC itself (only subnet range fetched); PrivateLink working with overlapping CIDRs; Direct Connect VIF types (private, transit, public); io1/io2 as boot volumes and sc1 size 125 GiB–16 TiB (cells blank in the fetched table); DataSync per-GB and Transfer Family per-endpoint-hour pricing model; Kinesis default retention 24 h; Glue job bookmarks; Lambda 15-minute limit; EFS not supporting SMB/Windows clients; Tape Gateway as a VTL for backup software; peering has no hourly charge. A reviewer may want to spot-check these.

## Naming note
The exam guide and Athena docs write "Amazon Quick"; the Quick user guide currently writes "AWS Quick" and "AWS Quick Sight". Chapters use "Amazon Quick" (exam guide) and "Quick Sight (formerly Amazon QuickSight)".

## Deviations
- The Athena CTAS example is in a `text` code block (SQL is not an allowed course language).
- No links in the chapters (`course.yaml` references left untouched, as instructed).
- Chapter 41 keeps S3 storage classes and lifecycle light, since chapter 42 (4.1.7, 4.1.10, 4.1.16, 4.1.19, 4.1.20) owns them; small-object lifecycle cost appears only under 4.1.12.
