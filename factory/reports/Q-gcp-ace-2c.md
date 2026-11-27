# Q-gcp-ace-2c — report

48 questions written (`gcpace-2c-*`, `content/gcp-ace/questions/planning/`). There are 8 for each of 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.3.1 and 2.3.2. Types: single 38, multi 10. Difficulty: 14 easy, 24 medium, 10 hard. `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-2c-`: 0 problem(s). `npm run content:validate -- --cert gcp-ace --prefix gcpace-2c-`: 0 problem(s), 0 warning(s).

## Verification
- Every command and flag was checked against the local `gcloud --help` / `bq help` (Google Cloud SDK 570.0.0) and against the gcloud reference pages that the questions cite. Facts were checked on docs.cloud.google.com on 2026-11-27. Reference titles are the HTML titles of the pages I fetched.

## Doubts and deliberate choices
- **Cloud SQL import** (`gcpace-2c-cloudsql-import-bucket-access`): the official procedure grants the instance's service account `roles/storage.objectAdmin` on the bucket. I used that role in the correct option, even though it is broader than least privilege. I did not offer Storage Object Viewer for the service account as a distractor, because it would also work.
- **Implied firewall rules**: the current Cloud NGFW pages call them "implied actions" and no longer give a priority (65535). The questions do not use 65535. The "delete the implied rule" distractor is explained as an implied action that can't be deleted.
- **Bucket location**: the locations page now says a bucket can be relocated if Storage Intelligence is configured, while the local `gcloud storage buckets create --help` still says the location can't be changed. No question relies on either statement.
- **BigQuery managed disaster recovery**: the release notes of 2026-11-17 mark the API configuration of cross-region replication and failover reservations as GA. The managed DR page itself states no launch stage. `INFORMATION_SCHEMA.FAILOVER_HISTORY` is Preview and is not used.
- **Managed Lustre**: GA for all customers since 2025-06-30, per its release notes. The Filestore maximum capacity (100 TiB, zonal and regional tiers) is used to rule Filestore out for a 1.5 PiB data set.
- **Spanner**: dual-region and multi-region configurations require the Enterprise Plus edition (the instance-configurations page). A distractor uses `--edition=STANDARD` with `nam3`.
- **Memorystore**: the question uses Memorystore for Redis Standard vs Basic Tier. Memorystore for Valkey and Redis Cluster are current too but are not offered as options.
- **Overlap avoided with other prefixes**:
  - subnet expansion (`expand-ip-range`) belongs to 3.3.1;
  - peering transitivity belongs to 2.3.4;
  - lifecycle rules belong to 3.2.2;
  - backups and restores belong to 3.2.5;
  - service-account and secure-tag targets belong to 2.3.3.

  When this batch was written, no other gcp-ace question used objectives 2.2.x or 2.3.1–2.3.2.
- NetApp Volumes Flex File: from 2026-09-15, no new Flex File storage pools can be created. This was not needed and is not used.
