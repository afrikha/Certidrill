# Q-saa-c03-4b — report

46 questions in `content/saa-c03/questions/cost/` (prefix `saac03-4b-`), 2 per objective (4.1.20–4.1.21, 4.2.1–4.2.15, 4.3.1–4.3.6). Types: single 38, multi 8. Difficulty: 14 easy / 23 medium / 9 hard. Validator: 0 problem(s). All references were fetched (docs.aws.amazon.com).

## Choices and deviations

- Course chapters for these objectives did not exist yet, so the questions were written from AWS documentation only. Check consistency once the chapters land.
- Multi stems end with "(Choose two.)" plus the scoring NOTE. "Each correct answer presents part of the solution." was left out (AWS style, BRIEF-AWS §3–4).
- French: "groupe Auto Scaling" (AWS fr_fr usage) instead of the English "Auto Scaling group"; "route" (not "itinéraire") for VPC route-table entries; "mono-AZ (Single-AZ)"; "instances de base de données réservées (Reserved DB instances)"; "rubrique Amazon SNS".
- `saac03-4b-dynamodb-rcu-calc` uses `shuffle: false` (ascending numbers, correct = b).

## Facts to watch

- `saac03-4b-nat-per-az-s3-endpoint`: the correct answer is a NAT gateway per AZ (the NAT gateway pricing page recommends it). If AWS now offers a regional NAT gateway mode, it isn't among the options, but a reviewer may want to check the explanation.
- `saac03-4b-budget-action-stop-dev`: the budget action docs say actions "target" EC2/RDS instances. Stopping them comes from the SSM action subtypes (STOP_EC2_INSTANCES / STOP_RDS_INSTANCES), seen in the CloudFormation reference title. I didn't fetch that page.
- `saac03-4b-t3-unlimited-sustained`: relies on the documented breakeven (52.5% for t3.xlarge vs M5). No prices are quoted.
- `saac03-4b-fargate-scheduled-long-job`: Lambda max is 15 min per invocation (Lambda Managed Instances allow up to 90 min for async, which is still under 3 h). The explanation states only the 15-minute limit.
- `saac03-4b-rds-monthly-backup-year`: "snapshot exports to S3 cannot be restored directly" is general knowledge. I didn't fetch the export page.
- Database Savings Plans now exist (up to 35%, covers RDS/Aurora/DynamoDB…). No question here depends on it, but the RDS RI size-flexibility question (`saac03-4b-rds-ri-size-flex`) offers no SP option on purpose.
- `saac03-4b-aurora-serverless-zero-acu` and `saac03-4b-data-api-no-connections` pin Aurora PostgreSQL 16.4 (auto-pause needs ≥16.3; Data API ≥16.1).
