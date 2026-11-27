# Q-gcp-pca-1c — report

43 questions written in `content/gcp-pca/questions/design/` (prefix `gcppca-1c-`): 34 single, 9 multi; difficulty 9 easy / 21 medium / 13 hard. Per objective: 1.3.4–1.5.2 four each, 1.5.3 three. English only. Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-1c-` → 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-1c-` → 0 problem(s), 0 warning(s).

## Product names (checked on docs.cloud.google.com, 2026-11-27)

- Cloud Composer is now **Managed Service for Apache Airflow** ("Managed Airflow"). Used as "Managed Service for Apache Airflow (formerly Cloud Composer)" in the option text.
- Dataproc (on Compute Engine) and Google Cloud Serverless for Apache Spark are now **Managed Service for Apache Spark** (cluster and serverless deployments). Used under the new name; the explanation says "formerly Dataproc". The exam guide and other batches may still say Dataproc / Cloud Composer: harmonize across the bank and the course.
- Cloud Run functions (former Cloud Functions 2nd gen), Google Cloud Managed Service for Apache Kafka (GA 2024-11-12, Kafka Connect GA 2025-10-01), Compute flexible CUDs (cover Compute Engine, GKE and Cloud Run) are used with their current names.
- cloud.google.com/<product>/docs URLs now redirect to docs.cloud.google.com: references use docs.cloud.google.com (allowed host).

## Doubts / facts not stated verbatim on a fetched page

- Spot VMs: the current page gives a preemption notice of 0 s (default) or 120 s, followed by a best-effort shutdown of up to 30 s. The profile's "30 s notice" trap looks outdated; no question in this batch depends on it.
- Auto mode VPC subnet ranges inside 10.128.0.0/9 (`gcppca-1c-ip-plan-overlap`): from knowledge, not on the fetched best-practices page (which only says auto mode ranges can overlap on-premises ones).
- Bigtable replication is not strongly consistent (`gcppca-1c-global-relational-writes`, distractor explanation): not on the fetched overview.
- Microsoft License Mobility requires Software Assurance and does not cover Windows Server (`gcppca-1c-windows-byol-sole-tenant`): the Google page only says Windows Server BYOL must run on sole-tenant nodes and points SQL Server/SharePoint to License Mobility.
- `gcppca-1c-test-clone-before-cutover`: the fetched Migrate to VMs pages confirm that a test-clone is built from the last replication cycle while replication continues, but do not explicitly recommend an isolated VPC; the isolation is stated by the scenario requirement.
- `gcppca-1c-hyperdisk-iops`: assumes C3 supports Hyperdisk Balanced (not re-checked on the machine series page).
- Spanner 99.999 % SLA: the product page cites "up to 99.999 %"; the configurations page confirms 99.99 % regional and higher for dual/multi-region.
- GA status not printed on the fetched pages for BigQuery Omni, Infrastructure Manager and the AlloyDB columnar engine (all long-established; only the columnar expression cache is marked Preview and is not used).
- Reference titles are the page H1 (without the " | Google Cloud Documentation" suffix).
