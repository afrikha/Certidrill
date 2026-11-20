# Q-sap-c03-4a — QUESTIONS SAP-C03, domain resilience (4.1.1–4.1.6, migration and modernization)

- 42 questions in `content/sap-c03/questions/resilience/sapc03-4a-*.yaml`, 7 per objective; single 35, multi 7 (6 with 5 options / choose 2, none with 6 / choose 3); difficulty 6 easy / 22 medium / 14 hard; single answer positions a 9, b 9, c 9, d 8.
- Validator: `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-4a-` gives 0 problem(s).
- No SAP-C03 course chapter existed while this batch was written. Facts come from AWS pages fetched on 2026-11-20, and every reference was fetched. Reference titles are the page H1 without the " - Service" suffix.
- The multi stems end with "(Choose two.)" / « (Choisissez deux réponses.) » and have **no** scoring NOTE, because AWS scores multiple response all or nothing (profile, blueprint `scoring.multi: all_or_nothing`, SPECS-AWS §3.3). SAA-C03 batches are inconsistent on this point, so add the NOTE if the reviewer wants it.

## Service status checked (drives answers and distractors)
- These are no longer open to new customers and are used only as distractors: AWS Migration Hub (and its Refactor Spaces, noted on the strangler fig page), AWS Application Discovery Service, AWS Mainframe Modernization (both the managed runtime environment and the self-managed experience, including Replatform with Rocket), and the .NET Modernization Tools (Porting Assistant, App2Container, Toolkit for .NET Refactoring, Microservice Extractor). All of these stopped accepting new customers on November 7, 2025.
- MGN agentless replication (MGN vCenter Client) is "no longer available for new deployments", and AWS Transform does not support it. It is used as a distractor.
- Snowball Edge is unavailable to new customers. AWS Data Transfer Terminal is the answer for one offline transfer (Paris location, 100G LR4 QSFP). The FAQ fetched today does not mention an Enterprise Support requirement, which the SAA-C03 report flagged.
- The AWS Transform for mainframe Runtime is deployed by the customer on EC2, ECS on EC2, EKS on EC2 or ECS on Fargate. The page says access comes "as part of your AWS Transform for mainframe project engagement".

## Facts that decide answers
- MGN private replication (Prescriptive Guidance, restricted replication): turn on Use private IP. Replication servers need an S3 gateway endpoint plus MGN and EC2 interface endpoints. Agents need MGN and S3 interface endpoints and a Route 53 Resolver inbound endpoint.
- MGN replication template: default replication server t3.small; m5.large recommended for fewer than 26 disks; dedicated replication server for write-intensive servers; no bandwidth throttling by default.
- AWS Transform multi-account migration: the `mgn:account-id` inventory column. AWS Transform initializes MGN and its IAM roles in each target account and Region.
- Discovery tool: sends WinRM/SSH, collects samples every 10 minutes, reports average, p95 and peak, keeps data up to 30 days. SQL Server availability group membership and replica roles need database credentials.
- DMS Schema Conversion: Db2 for z/OS paths work through the API or CLI only (not the console). Generative AI conversion is available for Oracle, SQL Server, Db2 LUW, Db2 z/OS and SAP ASE to PostgreSQL targets, and not for Db2 z/OS to RDS for Db2. Example Regions on the page: us-east-1, us-west-2, eu-west-1, ap-northeast-1.
- DMS SAP ASE source: clusters and MSA/Warm Standby are not supported as sources. The stem states that the source is a single server.
- DataSync: a task's mode cannot be changed after creation. NFS transfers in Enhanced mode need an Enhanced mode agent.
- Amazon MQ cross-Region data replication works only for ActiveMQ active/standby brokers. Step Functions Express workflows run at most 5 minutes and do not support `.waitForTaskToken` or `.sync`. The SQS FIFO deduplication interval is 5 minutes.
- No answer depends on the Lambda maximum timeout. The batch question rules Lambda out entirely.

## Stated from general AWS knowledge, not read verbatim on a fetched page
- RDS Multi-AZ fails over automatically (the fetched page says only "failover support").
- DataSync preserves NTFS permissions on SMB transfers to FSx for Windows File Server.
- DMS premigration assessments do not inventory availability group roles.
- EventBridge Pipes was deliberately not used; the outbox question uses a Lambda stream reader.
- An Elastic Beanstalk worker environment keeps at least one EC2 instance running.
- The RabbitMQ federation plugin exists.
- The Aurora `aws_s3` extension imports data files, not other engines' dumps.

## Overlap with SAA-C03
- `sapc03-4a-babelfish-dual-dialect` reuses the Babelfish idea of `saac03-4c-babelfish-sqlserver`. The decision here is different: the TDS and PostgreSQL endpoints are used side by side for incremental modernization, and a distractor is "Babelfish with TDS for everything".
- Several AWS Transform questions (4.1.6 mainframe x3) have the same service in the answer but test different decisions: refactor vs replatform or rehost, the runtime hosting target, and incremental domain waves vs big bang.
