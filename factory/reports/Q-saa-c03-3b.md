# Q-saa-c03-3b — report

57 questions (47 single, 10 multi), `content/saa-c03/questions/performance/saac03-3b-*.yaml`, 3 per objective (3.2.10, 3.3.1–3.3.13, 3.4.1–3.4.5). Difficulty 17 easy / 29 medium / 11 hard. Validator: 0 problem(s).

## Notes and deviations

- Course chapters for these objectives did not exist yet, so every fact comes from AWS documentation pages fetched on 2026-11-19 (all references were fetched).
- Reference titles follow the current page H1s. Lambda pages are now titled "Configure Lambda Event Function memory" and "Configure ephemeral storage for Lambda Event Functions" (checked twice). Question text still says "Lambda function", as the page body does.
- Aurora Serverless: the user guide page is titled "Using Aurora serverless" (no "v2" in the H1). The question says "Aurora Serverless" with a minimum capacity of 0 ACUs (auto-pause, resume in about 15 s, per the auto-pause page).
- Heterogeneous migration uses **DMS Schema Conversion**, not AWS SCT, because I could not confirm the current status of SCT.
- `saac03-3b-replica-vs-multiaz` is a "Which statements are correct? (Choose two.)" item with a short scenario, not a "which solution" item.
- Left out because I could not confirm them on a fetched page: the maximum number of RDS read replicas per engine, Site-to-Site VPN as a documented backup for Direct Connect, whether DAX can front a table in another Region, the exact Multi-AZ DB cluster failover time, and subnet CIDR immutability (I used the VPC CIDR rule instead).
- RDS storage limits used: gp3 up to 64,000 IOPS (PostgreSQL/MySQL), io2 Block Express up to 256,000 IOPS, 64 TiB max for RDS MySQL/PostgreSQL. The RDS storage page also has an internal inconsistency for SQL Server gp3 IOPS (80,000 vs 16,000), which none of the questions rely on.
