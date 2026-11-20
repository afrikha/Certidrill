# Q-saa-c03-4c — report

44 questions in `content/saa-c03/questions/cost/`, prefix `saac03-4c-`, 2 per objective (4.3.7–4.3.14, 4.4.1–4.4.14). Types: single 37, multi 7 (5 options, 2 correct). Difficulty: 13 easy, 22 medium, 9 hard. Validator: 0 problem(s).

## Deviations
- Multi stems end with "(Choose two.)" / « (Choisissez deux réponses.) » and carry **no** scoring NOTE: AWS scores multiple response all-or-nothing (docs/SPECS-AWS.md §3.3, blueprint `scoring.multi: all_or_nothing`).
- 4.4.1 / 4.4.2 have the same wording as 4.3.1 / 4.3.2 (task 4b). To avoid duplicates, my questions are network-cost flavored (tags on NAT gateways/endpoints/ALBs, consolidated billing for data transfer tiers, Budgets forecast on data transfer, CUR + Athena per-resource data transfer). Check overlap with 4b anyway.
- 4.4.8 uses the **regional NAT gateway** (availability mode Regional, launched 2025; billed per hour in each AZ where it is active) as the correct answer of `saac03-4c-regional-nat-gateway`, and as a distractor in `saac03-4c-single-nat-test-vpc`.
- 4.4.14 uses Site-to-Site VPN **large bandwidth tunnels** (5 Gbps, transit gateway / Cloud WAN only, not VGW, not accelerated VPN).
- Route 53 Resolver is named "Route 53 VPC Resolver" (current doc name).
- 4.3.13: Timestream for LiveAnalytics is closed to new customers (since June 20, 2025), so the time series question uses Timestream for InfluxDB; LiveAnalytics appears nowhere.

## Facts used but only partly verified
- Restore time of archived EBS snapshots (24–72 h) could not be read on the docs pages (empty pages); the stem only says "a restore that takes a few days is acceptable".
- Direct Connect DTO "typically lower" than internet DTO: the DX pricing page shows $0.02–$0.19/GB but does not list internet rates; wording kept generic.
- Same-AZ private-IP traffic free / inter-AZ billed per GB each direction: from the VPC pricing page examples (peering, NAT), the EC2 pricing data transfer section was empty when fetched.
- VPC peering "no hourly or processing charge" and CUR "can include resource IDs": general knowledge, not on the fetched pages.
- DynamoDB interface endpoints (PrivateLink) were not used as an option to avoid relying on an unfetched fact.
