# Q-clf-c02-4a — QUESTIONS CLF-C02, domain billing (4.1.1–4.1.7, 4.2.1–4.2.7)

- 42 questions in `content/clf-c02/questions/billing/clfc02-4a-*.yaml`, 3 per objective; single 37, multi 5 (5 options / choose 2); difficulty 17 easy / 19 medium / 6 hard.
- Validator: `CERT=clf-c02 npx tsx factory/validate.ts --prefix clfc02-4a-` → 0 problem(s).
- No CLF-C02 course chapter existed while writing; facts come from AWS pages fetched on 2026-11-19 (every reference was fetched).
- French: purchasing options kept in English (On-Demand Instances, Reserved Instances, Savings Plans, Capacity Reservations…) as in `objectives.yaml`; support case = « dossier » (AWS fr console wording); « Centre de support AWS (AWS Support Center) ».

## Facts checked (Nov 2026) that drive answers
- Savings Plans types now: Compute (up to 66 %, covers EC2 + Fargate + Lambda), EC2 Instance (up to 72 %), SageMaker AI, and Database Savings Plans (new). Not used: per-type percentages.
- On-Demand Capacity Reservations for immediate use: no term commitment, cancel any time, no billing discount of their own (combine with Savings Plans / regional RIs). Dedicated Hosts: socket/core visibility, BYOL per-socket/core/VM; Dedicated Instances: no visibility.
- RI/SP discount sharing: commitments apply first to the owning account; the management account deactivates sharing per account (Billing preferences); both accounts must have sharing on. New sharing modes (prioritized / restricted group sharing) exist but are not tested.
- AWS Free Tier since 2025: Free account plan vs Paid account plan, USD 100 credits + up to 100 earned, Free plan ends after 6 months or when credits are used, no charges until upgrade; Free plan has only Always Free offers.
- Billing help: account and billing support is free for all accounts (Basic included); root or IAM identity with support permissions; no instant messaging for billing.
- Pricing Calculator: public (no account) vs in-console (workload estimates free; bill estimates for management/standalone accounts, 5 free per month then USD 2); estimates exclude taxes.
- Price List API: Query + Bulk (JSON/CSV by service and Region); informational, pricing page prevails.

## Stated from sources other than an AWS docs reference
- "Data transfer within the same Availability Zone is free" (clfc02-4a-dt-charged-paths, option c): from the AWS Architecture Blog "Overview of Data Transfer Costs for Common Architectures"; the docs pages fetched did not cover same-AZ traffic.
- "Prices can vary by Region" (clfc02-4a-service-pricing-page explanation): general AWS knowledge, implied by Price List files organized by Region.
- Regional RI size flexibility worded as "Linux/Unix" per the EC2 scope page.
