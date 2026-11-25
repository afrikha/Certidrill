# Q-dop-c02-4b — DOP-C02 monitoring questions (prefix dopc02-4b-)

42 questions (single 35, multi 7; difficulty 1/2/3 = 7/21/14) in content/dop-c02/questions/monitoring/.
Validator: `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-4b-` → 0 problem(s); `npm run content:validate -- --cert dop-c02 --prefix dopc02-4b-` → 0 problems, 0 warnings.

Facts checked on docs.aws.amazon.com (2026-11-23) and points to note:
- Subscription filters per log group: the CloudWatch Logs user guide (Subscriptions.html) says up to five, the PutSubscriptionFilter API reference still says two. No question uses the number.
- CloudWatch Logs KMS page now states that callers reading encrypted log data (GetLogEvents, FilterLogEvents, StartQuery) need KMS permissions themselves (kms:ViaService logs.<Region>.amazonaws.com). Used in dopc02-4b-kms-reader-permissions; the page does not map each operation to a KMS action, so the option says "such as kms:Decrypt".
- Inspector ECR re-scan durations changed on October 15, 2026 (7 days for new activations): no question uses the values.
- Inspector Classic (assessment templates, objective 4.2.3), CodeGuru Security, X-Ray SDK/daemon appear only as distractors. X-Ray questions use the AWS Lambda Layer for OpenTelemetry / Application Signals and the CloudWatch agent as collector, as the X-Ray migration page recommends.
- Quick Sight is named "Quick Sight (part of AWS Quick)"; the reference title is "Authorizing connections to Amazon Athena - AWS Quick".
- Kinesis Data Streams now has On-demand Standard and On-demand Advantage modes; the question says "an on-demand capacity mode" to stay neutral.
- Overlap avoided with dopc02-4a-* (integrity validation, cross-account observability, custom metric dimensions, JSON metric filter are covered there).
