# Q-saa-c03-3a — report

56 questions in `content/saa-c03/questions/performance/` (prefix `saac03-3a-`): 4 per objective 3.1.1–3.1.5 and 3.2.1–3.2.9; single 46, multi 10; difficulty 17 easy / 28 medium / 11 hard. Validator: 0 problem(s).

## Context
- No SAA-C03 course chapters existed when the batch was written; every fact comes from AWS pages fetched on 2026-11-19 (cited in each question).

## Facts worth aligning in the course
- EBS gp3 now goes up to 80,000 IOPS, 2,000 MiB/s and 64 TiB (500 IOPS/GiB, 0.25 MiB/s per IOPS); io2 Block Express 256,000 IOPS, 4,000 MiB/s, 99.999 % durability; io1 64,000 IOPS. Older 16,000 / 1,000 MiB/s gp3 figures are stale.
- Amazon FSx File Gateway is no longer available to new customers (filegateway docs): not used anywhere.
- Lambda quotas: 900 s timeout, except up to 5,400 s for some asynchronous / event source mapping invocations on Lambda Managed Instances; explanations mention this so "Lambda max 15 minutes" is not stated absolutely.
- SnapStart: Java 11+, Python 3.12+, .NET 8+; not compatible with provisioned concurrency, EFS, or ephemeral storage above 512 MB.
- Lambda concurrency page is now titled "Understanding Lambda Event Function scaling"; EventBridge docs now distinguish "Custom Event Bus" and "Custom Event Bus - Classic" (rules and targets).
- S3 event notifications cannot target SQS FIFO queues (EventBridge needed).

## Points from general AWS knowledge, not stated on the fetched pages
- ALBs cannot use Elastic IP addresses and handle only HTTP/HTTPS; CloudFront does not carry custom UDP.
- CloudFront Functions cost less than Lambda@Edge.
- EventBridge rules can run ECS tasks on Fargate; Fargate supports a 14 GB task.
- Outposts is installed in the customer's facility; Wavelength Zones are in 5G carrier networks.
- Amazon Data Firehose buffers records before delivery.
- SNS HTTPS delivery relies on retries (no durable per-subscriber buffer).
