# Q-sap-c03-2c — report

56 questions (`sapc03-2c-*`, security domain), 8 per objective 2.3.5, 2.3.6, 2.4.1–2.4.5; single 46 / multi 10; difficulty 7 / 28 / 21. Validator: 0 problem(s).

## Facts used from general knowledge (not on a fetched page)
- Control Tower proactive controls *fail* noncompliant CloudFormation operations (page fetched says hooks check before provisioning, not the failure mode). No control IDs cited for RDS.
- AWS Backup cross-account copy to a vault in the **same** Region (page does not say it explicitly); Backup Vault Lock compliance vs governance behaviour.
- Aurora Global Database RPO "typically seconds" (Region support page fetched, not RPO).
- Only opt-in Regions can be disabled; CloudTrail event history = 90 days; KMS `ReplicateKey` called in the primary key's Region.
- S3 bucket-policy pattern to reject other KMS keys / SSE-S3 while allowing header-less uploads (described as behaviour, no JSON).
- Clean Rooms "aggregation" analysis rule type (fetched page only says analysis rules restrict queries/outputs).

## Choices and deviations
- AWS Audit Manager (closed to new customers) and CloudTrail Lake (closed since 31 May 2026) appear only as wrong options, with stems stating the company never used them.
- Security Hub CSPM declarative policies (`SECURITYHUB_CSPM_POLICY`) used as the answer for a new org; central configuration (legacy) not offered as an option. The stem avoids claiming members are blocked from changes (not stated on the page).
- Multi questions carry the "NOTE: Each correct selection is worth one point." line, as the other AWS banks do, although SAP-C03 scores multi all-or-nothing.
- Overlap check: `sapc03-2d-invocation-logs-audit` (2.5.1) tests cross-account delivery of Bedrock invocation logs; my 2.4.3 items test CloudTrail-vs-invocation-logging, agent/KB data events, inferenceRegion evidence and CloudWatch Logs centralization of app audit logs instead.
- Course chapters for these objectives did not exist yet; questions rely on the fetched AWS pages listed in each file.
