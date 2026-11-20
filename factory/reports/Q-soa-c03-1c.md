# Q-soa-c03-1c — report

40 questions (single 33, multi 7; difficulty 12/20/8), prefix `soac03-1c-`, objectives 1.3.3–1.3.6 × 10. Validator: 0 problem(s).

## Notes and deviations

- **Performance Insights → Database Insights.** The CloudWatch Database Insights page states that Performance Insights reached end of life on July 31, 2026, and users were migrated to Database Insights (Standard/Advanced). The RDS user guide pages (`USER_PerfInsights*`) are now titled "Database Insights". Questions for 1.3.5 therefore say "Amazon CloudWatch Database Insights"; the CloudWatch metrics (DBLoad, DBLoadRelativeToNumVCPUs) and the reference page title "Amazon CloudWatch metrics for Amazon RDS Performance Insights" keep the old name as AWS still does. The course chapter 13 should use the same wording.
- **Conflicting docs on Database Insights default mode** (RDS page says Advanced by default, CloudWatch page says Standard is the default): no question depends on the default mode.
- **Proactive recommendations**: per the RDS page, they require detailed per-query and database counter metrics with a paid retention period. Advanced mode was kept out of the options to avoid ambiguity.
- **S3 maximum object size** now reads 48.8 TiB / 50 TB on AWS pages (no longer 5 TiB): no question depends on it; only the 5 GB single-PUT limit is used.
- **EFS small files in IA**: AWS pages disagree (features page vs FAQ) on files under 128 KiB; not used.
- **S3 30-day minimum before Standard-IA transitions**: not found on current pages; not used.
- **DataSync Basic mode quota** is adjustable (25 M between AWS services); the Enhanced-mode question relies on "as soon as possible" (quota request takes days, Basic is sequential).
- S3 Files questions (3) are based on the S3 user guide S3 Files section (prerequisites, synchronization customization) fetched 2026-11-20.
- No question uses OpsWorks, Cloud9, Amazon Q Developer, X-Ray or Lambda timeouts.
