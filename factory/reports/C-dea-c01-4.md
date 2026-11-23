# C-dea-c01-4 — COURSE DEA-C01 (2026-11-23)

Chapters written (EN + FR): `34-data-quality`, `41-authentication`, `42-authorization`, `43-encryption-masking`. All 22 objectives (3.4.1–3.4.5, 4.1.1–4.1.7, 4.2.1–4.2.6, 4.3.1–4.3.4) covered, one section each. `check-cert.ts`: 0 problems for these chapters. English prose (code excluded): 2,031 / 2,190 / 1,846 / 1,761 words. FR built from a template with code blocks copied from EN (identical by construction).

## Verified on AWS pages this session
DQDL rule types, syntax, thresholds, `where`, dynamic rules, analyzers, limits (2,000 rules, 65 KB); Glue Data Quality entry points comparison; Evaluate Data Quality outputs and actions; DataBrew rulesets, EventBridge event, profile statistics, project sampling (first n / random, 500 default, up to 5,000); DataBrew PII steps, `ENCRYPT` (Encryption SDK + KMS) and `DETERMINISTIC_ENCRYPT` (AES-GCM-SIV, Secrets Manager, DataBrew-only decrypt); Glue skewness metrics; Athena `TABLESAMPLE`; `SVV_TABLE_INFO.skew_rows`; Glue self-referencing SG rule; MSK ports, encryption, SCRAM secret rules (`AmazonMSK_`, customer managed key); Secrets Manager schedules (4 hours minimum, 999 days max); Redshift managed admin password (30-day rotation, `--manage-master-password`), encryption default, Jan 2025 secure defaults (`default.redshift-2.0`, `require_ssl`); Redshift system roles, GRANT forms, RLS, masking policies (highest priority wins, default 0), Python UDF end of support June 30, 2026; `GetClusterCredentialsWithIAM` 1:1 mapping, 900–3600 s; S3 access point delegation; SageMaker Unified Studio concepts and domain unit policies; Lake Formation permissions, data filters, defaults, hybrid mode, registration roles, LF-TBAC; KMS rotation (365 default, 90–2,560, on demand), cross-account rules; EMR and Athena encryption options; Glue security configuration and Data Catalog encryption; Access Analyzer policy generation (90 days, trail required).

## Not verified on a page (common knowledge, kept)
- DQDL arithmetic `avg(last(7)) * 0.8` (only `+`/`-` seen in docs) and `RowCountMatch "reference" >= 0.99` syntax.
- Spark AQE skew join on by default (Spark docs, not AWS).
- RDS IAM auth (15-minute tokens, `rds_iam`), `rds.force_ssl`, `require_secure_transport`, `s3:TlsVersion`, Glue "Require SSL connection", Kinesis/Firehose SSE, DMS data validation, MWAA Secrets Manager backend, API Gateway credentials role, S3 replication with KMS (replica key, role permissions), "AWS managed keys not usable cross-account" (deduced from non-editable key policy).

## Left out
- `IAM:` / `IAMR:` user name prefixes of `GetClusterCredentialsWithIAM` (not on the API page).
- Data filter and LF-Tag quotas; DataBrew profile job row sampling (not documented on the pages read).
