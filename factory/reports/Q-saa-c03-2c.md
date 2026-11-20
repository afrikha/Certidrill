# Q-saa-c03-2c — report

48 questions in `content/saa-c03/questions/resilient/`, prefix `saac03-2c-`: 4 per objective (2.1.23, 2.2.1 to 2.2.11), 40 single and 8 multi, difficulty 14 / 24 / 10. Validator: 0 problems. The course chapters did not exist yet, so the facts come from AWS documentation pages fetched on 2026-11-19 (each reference is a page that was fetched).

## Format choices
- Multi stems end with "(Choose two.)" followed by the scoring NOTE (FR « (Choisissez-en deux.) » + « Remarque : … »). I left out the AZ-104 sentence "Each correct answer presents…", because AWS stems do not use it.
- Reference titles are the H1 of each page, without the " - Service" suffix.

## Facts I checked and how I handled them
- Regional NAT gateways (no public subnet needed) now exist. The NAT question therefore says outright that the company uses one **zonal** public NAT gateway, so the "create it in the public subnet" answer is not ambiguous.
- The S3 RTC page gives 99.9 % within 15 minutes, while other AWS material often says 99.99 %. The question avoids the percentage and only cites the 15-minute SLA and the OperationMissedThreshold event.
- The EBS pages give no durability figures per volume type, so no figure is used.
- Rekognition: there is a notice about feature availability changes. Rekognition appears only as a distractor (image and video analysis); people pathing is not used.
- The Lambda documentation now names functions "Event Functions" in its page titles. The reference titles are copied as they are, and the question text says "Lambda function".
- The Service Quotas "Automatic Management" feature can send usage notifications. It is left out of the quota multi question so that the CloudWatch alarm option stays the only correct notification answer.
- RDS Proxy: the Aurora reader endpoint and the IAM client authentication come from the Aurora RDS Proxy pages. No failover-time percentage is used, because the pages give none.

## Possible overlap with sibling batches
- 2.1.23 has the same wording as 2.2.20 (batch 2d). My 2.1.23 questions cover Neptune (fraud graph), Keyspaces (Cassandra without a rewrite), OpenSearch (full-text search) and DynamoDB + ElastiCache.
- 2.2.4 is about understanding the strategies and RPO/RTO. Selecting a DR strategy belongs to 2.2.18 (batch 2d), and the warm standby, backup and restore, and active-active scenarios may come close to it.
