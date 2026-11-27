# Q-gcp-pca-2a — report

48 questions written in `content/gcp-pca/questions/provisioning/` (prefix `gcppca-2a-`), 4 per objective 2.1.1–2.3.1.
Types: single 38, multi 10. Difficulty: 10 easy, 24 medium, 14 hard.
Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-2a-` → 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-2a-` → 0 problem(s), 0 warning(s).
Multi breakdown: 8 "Choose two." (5 options), 2 "Choose three." (6 options: peering-hybrid-transit, cmek-bucket-default-key). No per-point NOTE (blueprint scores multi all or nothing).

## Product names (checked on docs.cloud.google.com, 2026-11-27)

- **Dataproc is now "Managed Service for Apache Spark"**: the docs say it is the new name of both Dataproc on Compute Engine (cluster deployment) and Google Cloud Serverless for Apache Spark (serverless deployment). The questions `spark-serverless-batches` and `spark-clusters-hive-migration` use the new name in options and say "formerly Dataproc" in the explanation. The exam guide may still say Dataproc: a reviewer should decide whether options should also show the former name.
- **Cloud Composer is becoming "Managed Service for Apache Airflow"** (short name Managed Airflow). Not used in this batch, but other agents should know.
- Backup and DR: the docs name it "Backup and DR" (not "Backup and DR Service").
- References use `https://docs.cloud.google.com/...`: every `cloud.google.com/<product>/docs` URL now redirects there (302).

## Facts that changed versus common knowledge (avoided as traps)

- Cloud Storage soft delete: default 7 days, configurable **3 to 90 days** (not 7–90). Only the 7-day default and the 90-day maximum are used.
- Cloud SQL storage **can now be shrunk manually** (instance settings page). No question claims it cannot be decreased.
- Cloud Armor preconfigured WAF rules now include CRS 4.22 (`sqli-v422-stable`), used in `armor-waf-throttle`.
- Global external passthrough Network Load Balancer is Preview: not offered as an option.
- Spanner single-region 99.99% Dedicated Interconnect topology exists (connection group `PRODUCTION_CRITICAL`); `dedicated-interconnect-9999` is framed as the multi-region topology with workloads in two regions so the distractors stay wrong.

## Doubts / facts not found word for word on a fetched page

- NCC VPC spokes: the overview pages do not state "GA" explicitly; VPC spokes carry no Preview label (only some IPv6/hybrid features do).
- Relied on general knowledge, not on a fetched sentence: Cloud Storage FUSE is not an NFS server and not fully POSIX (`filestore-regional-tier`); quota is not a capacity guarantee (`reservation-guaranteed-capacity`); HDFS data is lost when a cluster is deleted (`spark-clusters-hive-migration`); each cluster of a replicated Bigtable instance holds a full copy (`bigtable-storage-autoscaling`); IAM conditions cannot restrict individual BigQuery columns (`bq-policy-tags-ssn`); the constraint name `storage.uniformBucketLevelAccess` (`public-access-prevention-org`). A reviewer may want to confirm them.
- `soft-delete-restore` assumes the bucket was created recently enough for soft delete to be on by default (the stem says "created with default settings").
- `cloudsql-pitr-gcloud`: the docs say PITR (and automated backups) are not enabled by default for Enterprise edition instances created with gcloud; the stem relies on that.
