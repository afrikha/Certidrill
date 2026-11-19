# C-saa-c03-2 — course SAA-C03, chapters 21, 22, 23, 24 (EN + FR)

Checker: `course problems (your chapters): 0` (all chapters: 0 at the time of the run). All chapters `draft`; course.yaml untouched. No earlier files existed for these chapters.

Prose length (my count, no code blocks, table cells included): 21: about 2,230; 22: about 2,170; 23: about 2,200; 24: about 2,180 English words. That is the top of the 1,300–2,200 range. 21 is a little over it because its 10 objectives cover APIs, ELB, SQS/SNS/MQ, EventBridge/Kinesis, Step Functions and managed services.

## Sources fetched (2026-11-19)

- SQS: message quotas (1 MiB maximum message, retention 1 min to 14 days with a default of 4 days, visibility timeout 30 s by default and 12 h maximum, timers up to 15 min); FIFO quotas (long polling 20 s, in-flight 120,000); high-throughput FIFO (300/3,000 per partition).
- API Gateway: REST vs HTTP; account throttle (10,000 rps, burst 5,000, lower defaults in some Regions); REST quotas (integration timeout from 50 ms to 29 s, can be raised for Regional and private APIs; payload 10 MB; cache TTL 300 s by default, 0–3,600 s).
- Step Functions: choosing the workflow type. Transfer Family: what is. Amazon MQ: what is. SNS FIFO topics. Kinesis key concepts (retention 24 h to 365 days, shard limits).
- ELB: how ELB works (cross-zone defaults, internal vs internet-facing); ALB and NLB introductions. EventBridge quotas (5 targets per rule).
- Lambda: quotas (1 MB async payload, 15 min, 10,240 MB, /tmp, 1,000 concurrency, packages); Lambda with SQS; SQS configuration (visibility timeout at least 6x the function timeout, maxReceiveCount of at least 5).
- RDS: read replicas; quotas (15 read replicas); Multi-AZ DB instance, Multi-AZ DB cluster, failover (60–120 s, DNS change, JVM TTL); backup retention (0–35 days, 7 days in the console, 1 day from the API/CLI); RDS Proxy. Aurora: replication (15 replicas, under 100 ms); Global Database (10 secondary Regions, switchover/failover, 16 readers per secondary).
- ElastiCache: what is (Valkey, Redis OSS, Memcached; serverless); caching strategies. DAX. Secrets Manager (intro, replication). EC2 Auto Scaling (dynamic, scaling options). Global Accelerator (how it works). CloudFront origin failover.
- X-Ray: concepts (sampling, annotations); SDK/daemon timeline (maintenance mode since February 25, 2026, migrate to OpenTelemetry).
- DR whitepaper "Disaster recovery options in the cloud"; DynamoDB global tables (MREC/MRSC); S3 RTC (99.9 % within 15 minutes, not 99.99 %); S3 data protection (at least 3 AZs, 11 nines); EFS replication (RPO 15 min); ARC what is, plus its readiness check availability change.
- Route 53 routing policies and active-active/active-passive; AWS Backup what is; EBS volume types (durability; gp3 now 80,000 IOPS / 2,000 MiB/s); AZs (at least three per Region).
- VPC NAT gateways and **regional NAT gateways** (new: one NAT for the VPC, no public subnet, expands across AZs); EC2 automatic recovery; Capacity Reservations; Service Quotas request templates (10 quotas); CLI Service Quotas examples (`L-1216C47A`).
- Well-Architected REL05-BP03 (retries), REL08-BP04 (immutable infrastructure), REL01-BP01 (quotas).
- ECS (capacity options, including ECS Managed Instances), EKS (Auto Mode, Hybrid Nodes), Fargate (Fargate Spot 2-minute warning), App2Container, Comprehend (and its availability change), Polly.

## Deviations and decisions

- Regional NAT gateway is mentioned beside the classic "one zonal NAT gateway per AZ" answer, because it is current AWS documentation. Question writers should not make "one NAT gateway for all AZs" automatically wrong when it is a regional NAT gateway.
- Left out because closed to new customers: AWS App2Container (closed since November 7, 2025), ARC readiness check, Comprehend topic modeling, event detection and prompt safety classification. The AWS Proton and Data Pipeline status from the profile was respected, so they are not named as answers.
- AWS Elastic Disaster Recovery is left out: it is not in the profile's in-scope list, and the exam guide's in-scope page could not be read (the proxy blocks curl, and WebFetch returned only metadata).
- DR strategies get no numeric RPO/RTO ranges (the "hours / tens of minutes / minutes / real time" figure isn't in the whitepaper text). They are described in relative terms, plus the verified Aurora figures (under 1 s of lag, promotion in under a minute).
- Cross-chapter overlap kept small: read replicas (2.1.15) are covered at decision level, with details left to 34-database-scaling. Storage types (2.1.13) don't repeat EBS performance numbers (31-storage-performance).

## Not verified (written from stable knowledge; review)

- FIFO queue throughput without high throughput mode (300 API calls per second per action, 3,000 messages per second with batching): the fetched page gives these figures per partition only.
- SQS FIFO deduplication interval of 5 minutes; Lambda async retries twice; ALB HTTP/2, gRPC and WebSocket; CloudFront WebSocket support.
- Aurora storage "replicated across AZs" (the "six copies in three AZs" figure is not stated); DynamoDB "across multiple AZs".
- KMS multi-Region keys and ECR cross-Region replication (named only); DynamoDB PITR "any second of the last 35 days".
- Capacity Reservations "billed at the On-Demand rate whether used or not": the page only implies it.
- Elastic Beanstalk immutable and traffic-splitting deployment policies; ALB weighted target groups; CloudFormation StackSets, stack policies, drift detection (only drift detection is on a fetched page).
- 99.9 % ≈ 8.8 h a year and 99.99 % ≈ 53 min a year are my own arithmetic.

## Doubts

- Chapter 23's "static stability" example (3 per AZ, 9 in total) and the CloudFormation ASG snippet (MinSize 3) are independent examples. A reviewer might want them aligned.
