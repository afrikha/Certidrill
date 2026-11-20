# Q-sap-c03-3a — QUESTIONS SAP-C03, domain cost (3.1.1–3.2.2)

40 questions in `content/sap-c03/questions/cost/sapc03-3a-*.yaml`: 7/7/7/7/6/6 per objective, single 33 / multi 7, difficulty 6 easy / 20 medium / 14 hard. Validator: 0 problem(s).

## Facts verified on fetched AWS pages (Nov 20, 2026)
- Bedrock service tiers Reserved / Priority / Standard (`default`) / Flex; Flex at a 50% discount to Standard, Priority at a 75% premium (pricing page footnotes); Reserved = 1 or 3 months, minimum 100k input TPM, through the account team.
- Bedrock batch inference at 50% lower price than on-demand for select models (pricing page); prompt caching applies to on-demand only, not batch; 5-minute default TTL reset by hits.
- Intelligent prompt routing: same family, English only, fallback model + response quality difference.
- Savings Plans: four types incl. Database Savings Plans (up to 35%, 1-year term per the Database Savings Plan page) and SageMaker AI Savings Plans; group sharing via a cost category with the "Benefit group sharing" association, Prioritized vs Restricted modes.
- Capacity Blocks for ML (GPU/Trainium types only, up to 8 weeks ahead); future-dated Capacity Reservations only for C, G, I, M, R, T, U, X families.
- Lambda Managed Instances (EC2 price + 15% fee, EC2 discounts on the instance part, multi-concurrency); Lambda durable functions (no compute charge during waits, up to one year, Python SDK).
- Step Functions: Distributed Map only in Standard parents, EXPRESS or STANDARD children; Serverless Lens recommends combining Standard and Express for cost.
- Compute Optimizer: preferences presets (Maximum savings = P90 / 0% / 10%), org/account/Region scope, EIM 93 days for EC2, ASG and RDS, memory needs CloudWatch agent or external metrics.
- CloudFront Origin Shield (multi-CDN, JIT packaging, Region closest to origin, dynamic requests always charged), origin failover (GET/HEAD/OPTIONS, 3 x 10 s default), origin request policies, compression range 1,000–10,000,000 bytes.
- EKS cost networking (IP target mode, PreferClose, internalTrafficPolicy Local drops traffic); ECR endpoints need an S3 gateway endpoint for layers; S3 interface endpoints reachable from on-premises, gateway endpoints not (nor through a transit gateway); MSK best practices recommend `client.rack` = AZ ID.

## Stated from general knowledge (not on a fetched page) — reviewer may check
- CloudFront Functions cost less than Lambda@Edge (pricing not on the fetched comparison page).
- CloudFront does not cache POST responses; Global Accelerator endpoints are ALB/NLB/EC2/EIP (not S3).
- Standard RI modification cannot change the instance family; DynamoDB reserved capacity applies only to provisioned capacity.
- ECR stores multi-architecture images (image index) under one tag (the manifest-format page does not say it).
- MSK broker-side rack-aware replica selection: the MSK page only documents `client.rack`; option wording kept generic ("enable rack-aware replica selection on the cluster").
- Database Savings Plans covering DynamoDB on-demand tables: inferred from "applies to serverless usage" and DynamoDB in the covered list.
- Inline Map 40-iteration limit inferred from the Distributed Map page ("more than 40 concurrent iterations").

## Choices and deviations
- Not used: CloudFront flat-rate plans (feature restrictions on the page looked inconsistent), price classes (doc page now redirects to pricing), cross-Region inference (3.2.5, other task), MSK/ALB cross-zone charges (no doc statement found).
- `sapc03-3a-compute-db-savings-plans` (3.1.1) uses Database Savings Plans, which 3.4.3 also names: check overlap with the 3.4.x task.
- Multi stems follow the SAA-C03 bank style: "(Choose two.)" only, no scoring NOTE (AWS multiple response is all or nothing).
- `sapc03-3a-calendar-scheduled-scaling`: the correct option creates the scheduled actions month by month because an Auto Scaling group allows at most 125 scheduled actions.
- No answer depends on the Lambda maximum timeout; no closed service (Migration Hub, ADS, Snow, OpsWorks, Q Developer) appears.
