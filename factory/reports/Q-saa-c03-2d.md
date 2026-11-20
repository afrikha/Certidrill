# Q-saa-c03-2d — QUESTIONS SAA-C03, domain resilient (2.2.12–2.2.20)

36 questions, prefix `saac03-2d-`, 4 per objective; single 30 / multi 6 (all 5 options, choose 2); difficulty 11 easy / 18 medium / 7 hard. Validator: 0 problem(s).

## Sources
All facts checked with WebFetch on docs.aws.amazon.com (and the OpenSearch Service FAQ) on 2026-11-19; every reference URL was fetched. Course chapters for 2.2 were not yet available, so nothing was aligned with them.

## Points to note
- **Regional NAT gateway** (VPC, availability mode `regional`, launched Nov. 2025) exists. `saac03-2d-nat-gateway-per-az` keeps the classic answer (one zonal NAT gateway per AZ, qualifier "highest availability", no regional option offered) and mentions the regional NAT gateway in the explanation. Course writers should cover both.
- **EC2 simplified automatic recovery** is on by default for supported instances; `saac03-2d-ec2-recover-legacy` makes the CloudWatch alarm recover action the answer through the email-notification requirement (simplified recovery notifies only via Health Dashboard).
- Lambda page title is now "Visualize Lambda Event Function invocations using AWS X-Ray" (verified twice); used as is.
- X-Ray SDK/daemon maintenance status could not be confirmed on the fetched pages; no question depends on the SDK or daemon (only on API Gateway stage tracing and Lambda active tracing).
- Amazon MQ protocol list was not confirmed on the fetched pages, so questions only say "JMS with an Apache ActiveMQ broker". FR uses « agent de messages (broker) » then « agent ».
- AWS Backup FR term used: « coffre-fort de sauvegarde ». Route 53/ELB health checks: « vérification de l'état ».
- Avoided as answers: AWS Elastic Disaster Recovery and Amazon MemoryDB (not in the guide's in-scope list), and any retired service.
