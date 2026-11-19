# Q-saa-c03-2a — QUESTIONS SAA-C03, domain resilient, objectives 2.1.1–2.1.10 (2026-11-19)

## Result
- 46 questions, prefix `saac03-2a-`, in `content/saa-c03/questions/resilient/`: 38 single, 8 multi (5 options, 2 correct). Each objective got exactly the count in the task.
- Difficulty: 14 easy, 23 medium, 9 hard. Correct single answers: a 9, b 10, c 9, d 10.
- `CERT=saa-c03 npx tsx factory/validate.ts --prefix saac03-2a-` → 46 files, 0 problem(s).
- No course chapters existed for 2.1.x when I wrote the questions. Every fact was checked with WebFetch on docs.aws.amazon.com or aws.amazon.com FAQs, and every reference was fetched. Titles use the page's H1 heading.

## Facts found during verification (2026 changes)
- **Regional NAT gateways** now exist (availability mode `regional`, no public subnet needed, they expand across AZs automatically). The classic answer "one NAT gateway per AZ" is no longer the only HA design, so I left out any NAT-per-AZ question. `saac03-2d-nat-gateway-per-az` may need a review against this.
- **AWS App2Container** has been closed to new customers since Nov 7, 2025 (AWS Transform is recommended instead). I did not use it.
- Elastic Volumes: up to 4 modifications per volume in a rolling 24 h (the old rule was 6 h between changes). No question depends on this.
- DynamoDB on-demand: a table instantly handles up to double its previous peak, a new table up to 4,000 writes/s, and the default table quota is 40,000. The question stays under these values.
- ElastiCache: node-based clusters for Valkey, Memcached and Redis OSS, plus Serverless. Engine names follow the current docs ("ElastiCache for Valkey").

## Deduplication across parallel batches
- 2b, 2c and 2d were written at the same time as this batch, and several of their stems were almost identical to my first drafts. Examples: Amazon MQ JMS migration, SQS FIFO with the account as group ID, SNS→SQS fanout, Kinesis replay, S3→Lambda thumbnails, EventBridge SaaS partner, ElastiCache session store, idempotent SQS consumer, scheduled scaling for a known event, single EC2 to ASG/ALB, SQS buffer between tiers, EKS manifests migration, Fargate without servers, Global Accelerator UDP, three-tier layout, ELB health checks in the ASG.
- I replaced 20 of my drafts with other decisions, for example AS2, delay queue, Lambda partial batch response, Secrets Manager replica secret, Lambda state across invocations, ALB stickiness for a legacy stateful app, Lambda async on-failure destination, EventBridge cross-account bus, SNS filter policies, Kinesis enhanced fan-out, predictive scaling with a warm pool, vertical resize, CloudFront Functions, ECR enhanced scanning, awslogs, Beanstalk worker tier and ALB deregistration delay.
- **Overlaps that remain with other domains** (same classic decision, different scenario). A bank-level review should pick which ones to keep:
  - 2a-apigw-stage-cache ↔ 3b-apigw-stage-cache
  - 2a-dax-microsecond-reads ↔ 4b-dax-hot-reads
  - 2a-nlb-static-ip-tcp ↔ 2c-nlb-udp-static-ips
  - 2a-cloudfront-functions ↔ 4b-cloudfront-functions-headers
  - 2a-gateway-endpoints-tier ↔ 1b-s3-gateway-endpoint-cost / 4c-gateway-endpoints-s3-ddb
  - 2a-cloudfront-s3-oac ↔ 1b-cloudfront-oac
  - 2a-ebs-elastic-volumes ↔ 3a-ebs-elastic-volumes
  - 2a-transfer-family-sftp ↔ 4a-transfer-family-sftp
  - 2a-alb-path-routing ↔ 3b-alb-path-routing
  - 2a-security-group-chaining ↔ 1c-sg-reference-db-tier
  - 2a-kinesis-enhanced-fanout ↔ 3c-kds-enhanced-fanout
  - 2a-gwlb-inspection ↔ 3c-gwlb-firewall-fleet
  - 2a-apigw-usage-plans ↔ 2c-api-gateway-usage-plans
  - 2a-vertical-instance-resize ↔ 4b-vertical-licensed-monthend

## Points a reviewer may want to check
- French terms with no clear AWS fr_fr equivalent keep the English term in parentheses: scale-in protection, long polling, duration-based stickiness, deregistration delay, warm pool, lazy loading / write-through, enhanced fan-out, shards.
- `saac03-2a-lambda-global-state`: the answer uses a DynamoDB atomic counter (UpdateItem). AWS notes that an atomic counter is not idempotent if an update is retried. The stem only asks for an accurate shared count.
- `saac03-2a-alb-stickiness-legacy`: duration-based stickiness is correct only because the application cannot be changed. The explanation says that externalizing the state is the preferred design.
