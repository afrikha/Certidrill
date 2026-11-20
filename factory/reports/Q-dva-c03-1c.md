# Q-dva-c03-1c — report

55 questions in `content/dva-c03/questions/development/` (prefix `dvac03-1c-`): 11 per objective (1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.3.1), single 46 / multi 9, difficulty 17 easy / 27 medium / 11 hard. Validator: 0 problem(s).

## Facts checked on AWS docs (November 2026) that differ from older knowledge
- Lambda docs now title most pages "... Event Function(s) ..." (new function types: Managed Instances, durable functions, MicroVMs, Web Functions). Reference titles copy the current titles.
- Lambda maximum timeout is now 1,800 seconds (30 min); async invocation payload 1 MB. No question depends on these values.
- S3 Object Lock now has variable retention (event hold); not used.
- ECR lifecycle policies now also archive images; ECR not used.
- CloudWatch Logs account-level retention policies exist (min 30 days); question uses PutRetentionPolicy on one log group.

## Facts used without a fetched page stating them explicitly (low risk, standard knowledge)
- CloudWatch Logs subscription filters cannot target SQS (explanation of a distractor in `err-onfailure-destination`).
- S3 Glacier Instant Retrieval storage is cheaper than Standard-IA for quarterly access (`life-s3-transition-expire`); pricing page not fetched.
- DynamoDB stream view types KEYS_ONLY / NEW_IMAGE / OLD_IMAGE / NEW_AND_OLD_IMAGES and `eventName` filtering (INSERT/MODIFY/REMOVE).
- Interface endpoint security group must allow inbound HTTPS 443 (`vpc-secrets-endpoint`).

## Deliberately avoided
- The "30 days in Standard before transition to Standard-IA" lifecycle rule: not found on the current S3 pages.
- ElastiCache TTL / caching strategies (covered by the 1.3.2 batch `dvac03-1d-cache-*`).
