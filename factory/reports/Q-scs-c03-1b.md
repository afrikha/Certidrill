# Q-scs-c03-1b — report

48 questions in `content/scs-c03/questions/detection/` (prefix `scsc03-1b-`), 8 per objective (1.2.3–1.2.6, 1.3.1, 1.3.2). Types: single 37, multi 7, ordering 2, dragdrop 2. Difficulty: 7 easy / 24 medium / 17 hard. Validator: 0 problem(s).

## Deduplication against parallel batches
I checked the batches written at the same time (1a, 2b, 3a, 5b). I replaced six of my drafts that tested the same decision with the same answer as an existing question:
- Route 53 health check metrics only in us-east-1 (1a-r53-metric-region)
- Logs Insights across accounts through cross-account observability (2b-cw-cross-account-insights)
- Athena partition projection for CloudTrail (2b-ath-org-trail-projection)
- NAT gateway flow log fields pkt-srcaddr/pkt-dstaddr (2b-flow-nat-pkt-srcaddr)
- Security Lake custom source in OCSF/Parquet (2b-sl-custom-source-ocsf)
- Object Lock compliance mode for log retention (5b-objlock-compliance-broker, 1a-trail-long-retention)

Related questions that remain but test different decisions: 1b-sl-siem-data-access (data access + SQS) vs 2b/3a query-access subscribers; 1b-resolver-query-logs (choosing the source) vs 2b-resolver-query-instance (querying it); 1b-cloudtrail-insights (API call rate) vs 1a-insights-error-rate.

## Facts relied on that the pages I fetched did not state outright
- sl-org-setup-order: the explanation says Security Lake creates and maintains the Glue Data Catalog tables of native sources itself. The custom-source page confirms the crawler; for native sources this is general knowledge.
- sl-siem-data-access / os-security-lake-query: the query-access prerequisite pages loaded with no content. Only the overview pages were checked (data access = S3 + HTTPS/SQS notifications; query access = Lake Formation; OpenSearch direct query needs a query-access subscriber when it runs from another account).
- osi-grok-s3: "S3 is not a Firehose source" is general knowledge (Firehose sources are Direct PUT, Kinesis Data Streams, MSK...).
- cwli-unauthorized-calls: the two error-code patterns come from the Security Hub CSPM control CloudWatch.2 filter (`*UnauthorizedOperation` / `AccessDenied*`). The Logs Insights regex form is my adaptation of it.
- cwagent-ssm-order: the order of the AWS-ConfigureAWSPackage / wizard / AmazonCloudWatch-ManageAgent steps follows the documented procedure. The fleet-install page loaded with no content. The policies and the `AmazonCloudWatch-` name prefix were verified.
- flowlog-ecs-fields: the ECS fields also need ecs:List* permissions. The question does not mention them.
- nfw-flow-alert-logs: the stem uses only the ALERT action. This avoids the "Next Generation policy" case, where DROP rules alert only with the alert keyword.

## Closed services
No closed or retired service is a correct answer. CloudTrail Lake, Audit Manager and the other closed services do not appear. The former Security Hub is always called "Security Hub CSPM".
