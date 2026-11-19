# C-clf-c02-2 — COURSE CLF-C02, chapters 24, 31–37 (2026-11-19)

8 chapters × EN/FR written; `check-cert.ts` → `course problems (your chapters): 0`. English length 760–1,210 words (fundamentals range; 36-storage is at the upper limit).

## Sources
- Fetched this session (docs.aws.amazon.com): Trusted Advisor overview and check reference, Regions and AZs, AWS SCT user guide, Amazon Q Business and Q Developer "what is" pages, AWS Quick "what is" and Quick Sight pages, Security Hub and Security Hub CSPM pages, AWS overview whitepaper (deployment models), AWS CDK guide, Aurora overview, RDS user guide, ElastiCache, EC2 instance types, Storage Gateway.
- The hourly WebFetch quota ran out midway; the other facts were reused from the finished SAA-C03 chapters (already verified there: S3 classes and durations, WAF attachment targets, Shield, GuardDuty/Inspector/Macie, security groups vs NACLs, Lambda limits, ELB types, DMS/DMS Schema Conversion, FSx File Gateway closed to new customers, Kinesis/Firehose, Quick).

## Points to review
- **Amazon Quick naming**: the exam guide v1.3 says "Amazon Quick"; the documentation (page title, two pages fetched) now says **"AWS Quick"** ("AWS Quick evolved from Amazon QuickSight. QuickSight continues as AWS Quick Sight"). Chapter 37 uses the guide's name and states the documentation name once. SAA-C03 chapter 37 still says "Amazon Quick" only; worth aligning the profile.
- **Amazon Q Business is no longer open to new customers** (notice on its user guide, AWS points to Amazon Quick). Not in the CLF-C02 profile's "verify availability" list: question writers must not make Q Business a correct answer. Q Developer: console experience renamed "AWS assistant"; IDE plugins supported until April 30, 2027 (Kiro suggested) — chapter mentions the rename only.
- **Aurora**: the overview page now says "up to 6x the throughput" of stock MySQL and PostgreSQL (older material: 5x/3x) and max cluster volume 256 TiB; the chapter gives 256 TiB and no throughput multiple.
- **Trusted Advisor**: full checks with Business Support+, Enterprise Support, Unified Operations; Basic Support = all service limits checks + selected security checks (EBS public snapshots, RDS public snapshots, S3 bucket permissions, MFA on root account, Security Groups – Specific Ports Unrestricted) and selected fault tolerance checks, manual refresh. Six categories including operational excellence.
- Left out (not verified): minimum number of AZs per Region (the Regions page only says "multiple"), Shield Advanced price/commitment, Fargate billing granularity, ElastiCache latency figures, Local Zones latency figure.
- Not fetched, written from general knowledge (low risk): AWS Security Center / Security Blog / Knowledge Center (re:Post) descriptions, AWS Marketplace security category, Route 53 routing policies (also in SAA-C03), IaaS/PaaS/SaaS examples.
- Out-of-scope services avoided (Network Firewall, FSx for Lustre, CloudShell, Wavelength, Data Lifecycle Manager, MemoryDB).
