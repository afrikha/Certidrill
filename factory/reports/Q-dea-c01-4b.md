# Q-dea-c01-4b — QUESTIONS DEA-C01, governance (4.2.3–4.2.6, 4.3.1–4.3.4, 4.4.1–4.4.3)

44 questions, prefix `deac01-4b-`, 4 per objective; single 37 / multi 7 (no scoring NOTE: AWS all or nothing); difficulty 13 easy / 22 medium / 9 hard. `factory/validate.ts` and `tools/validate-questions.ts`: 0 problem(s). The `dragdrop` warning on `blueprint.yaml` does not come from this batch.

No DEA-C01 course chapter existed when the batch was written. Facts come from the AWS pages fetched (one or two references per question).

## Service status
- 4.4.3 (CloudTrail Lake): Lake is never the right answer for a new design. `ctlake-new-customer-cw` (customer since September 2026) → CloudWatch telemetry enablement rule for the organization, plus centralization and Logs Insights; Lake is a distractor. The three other questions concern existing customers: Export to CloudWatch import, data before 2023 not migrated, and a "two true statements" multi on what still works (org event data store covers new accounts; account event data store does not).
- CloudWatch Logs Infrequent Access is now called **Essentials** (the page says the API returns `ESSENTIALS` from December 2026). The options say "Essentials (formerly Infrequent Access)".
- Redshift Python UDFs are no longer supported after June 30, 2026 (DDM page). The DDM questions use no Python UDF.

## Facts kept that a fetched page does not state word for word
- `GRANT SELECT ON ALL TABLES IN SCHEMA` covers existing tables only. The ALTER DEFAULT PRIVILEGES page sends you to "GRANT or scoped permissions" for existing objects, and the scoped permissions page says "current and future". The question assumes a superuser runs the scoped grant: the page does not say who may grant it.
- DynamoDB Streams records do not identify the IAM principal behind each request (used as a distractor explanation in `ct-dynamodb-data-events`).
- DataBrew DETERMINISTIC_ENCRYPT output can be joined. This follows from "deterministic" (same input gives same ciphertext); the page does not say "join".
- Logs Insights supports OpenSearch SQL (the Supported query languages page lists it). Telemetry enablement rules are org-level and use the CloudTrail service-linked channel. Centralization rules copy logs to one account. Whether new accounts are covered automatically is implied by the org/OU scope; the page does not state it.
- Glue job parameter `--encryption-type sse-s3` (distractor) and enhanced VPC routing = COPY/UNLOAD traffic (distractor explanations): standard docs, not on the fetched pages.
- `logs.amazonaws.com` "global" service principal: used only as a distractor (the KMS page requires the Regional principal).
- Athena S3 permissions for the result location: the S3 page gives only generic read/write examples, so the option is worded generically ("read and write access to the query result prefix").

## Overlaps avoided
- SAA-C03/DVA-C03 already test S3 Bucket Keys, `aws:SecureTransport`, envelope encryption and the 4 KB limit, encryption context, client-side encryption tools, log retention, Lambda JSON logs and log-level filtering, LF row/column filters, LF-Tags at scale, organization trails, Object Lock + integrity validation, and S3 data events found through Athena. This batch uses other decisions on data-engineering services (Glue, Redshift, Athena, EMR, Kinesis, MSK, MWAA, DataBrew).

## Notes for reviewers
- French: « journal de suivi » (trail), « entrepôt de données d'événements » (event data store), « groupe de journaux », « signets de tâche (job bookmarks) », « agents (brokers) » for MSK, « restauration à un instant dans le passé » (PITR). The AWS glossary `content/_shared/glossary-aws.yaml` is missing from this clone, so the validator ran no terminology check.
- About 11 single questions have a correct option that ties or nearly ties the longest distractor. The lengths were rebalanced, but these are worth a glance.
