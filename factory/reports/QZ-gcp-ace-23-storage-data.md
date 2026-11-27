# QZ-gcp-ace-23-storage-data — notes

`content/gcp-ace/quizzes/23-storage-data.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.2.1 (q1, q5, q8), 2.2.2 (q2, q6), 2.2.3 (q3, q7), 2.2.4 (q4, q9, q10). Positions 6–10: single ×3, multi ×2 (q9 and q10, choose three).

## Chapter vs current docs

- **Filestore Regional capacity**: the "About service tiers" page now gives Regional as 100 GiB–10,239 GiB and 10 TiB–100 TiB. Instances under 1,024 GiB need custom performance settings. The chapter only gives a range for Zonal (1–100 TiB). Its tier list is consistent with the docs: Zonal, Regional and Multishares for GKE (Enterprise) are primary tiers, and Basic HDD/SSD are legacy. Basic SSD starts at 2.5 TiB.
- **Spanner instance moves**: the chapter says "an instance can be moved between configurations without downtime". That is right, but it leaves out conditions the exam can test. A Standard edition instance must first be upgraded to Enterprise Plus, which takes about 10 minutes with zero downtime. The instance needs at least 1 node (1,000 PUs), no managed autoscaler and no backups. q9 tests the first two conditions. Worth adding to the 2.2.4 table.
- **Spanner minimum capacity**: the compute-capacity page no longer says "minimum 100" in so many words. It says that below 1,000, PUs are set in multiples of 100 (100, 200, 300…). The chapter's "minimum 100" is consistent with that.
- **Firestore**: the location can't be changed after creation. Multi-region is ≥ 99.999 % and regional ≥ 99.99 %. Both are confirmed and agree with the chapter. The chapter could add the migration path (new database + export/import, since import into another database is supported), which q10 tests.
- **Soft delete** (Cloud Storage) is on by default with a 7-day retention, configurable from 3 to 90 days. The chapter's "replication is not backup" trap lists backups, PITR and Object Versioning but not soft delete, the default protection. Worth adding.
- `gcloud filestore instances create` without `--tier` defaults to `BASIC_HDD` (local help, SDK 570.0.0), as the chapter says. The "Create an instance" doc page shows `--tier` as required and is inconsistent about `--location` vs `--region` for regional instances. The quiz uses `--location=REGION`, which matches the page's syntax block.
- Confirmed as written: storage class guidance (Nearline monthly, Coldline quarterly, Archive less than yearly, minimums 30/90/365 days, millisecond access). BigQuery Data Transfer Service sources include Google Ads, Amazon S3 and Azure Blob Storage. Private services access needs a `--purpose=VPC_PEERING` range plus `gcloud services vpc-peerings connect`. Storage Transfer Service `--delete-from=destination-if-unique` / `source-after-transfer`.

## Doubts / not verified on a fetched page

- q8 option c: that Enterprise Plus costs more than Standard is from the edition ordering ("higher edition"). I didn't fetch a pricing page.
- q10 option d: the Firestore backups page says that a backup resides in the source database's location, and its restore command uses one LOCATION for both the backup and the new database. It doesn't state "same location only" in one sentence. The export/import page confirms cross-database import, but it doesn't explicitly mention importing into a database in another location. That is the standard migration path, but no page states it word for word.
- q4: that a deletion in a dual-region bucket removes the object from both regions (one bucket, replication isn't backup) comes from the chapter's trap and from general Cloud Storage behavior. The soft delete page I fetched doesn't state it word for word.
- q5 option d: the claim that Cloud SQL runs in a Google-managed service producer network comes from the private services access page ("service producer network").

## Design notes

- I avoided the decisions of the mock bank. The bank's 2.2.x questions already test: AlloyDB HTAP and its secondary cluster, Archive facts, Autoclass creation, BigQuery managed DR, Bigtable for meters and its multi-cluster routing, `bq load` with a header / `--replace`, Cloud SQL cross-region DR, HA and import access, Dataflow windowing, Filestore for a render farm, Firestore multi-region creation, turbo replication, Managed Kafka, Managed Lustre, Memorystore sessions, Nearline monthly, NetApp SMB, Pub/Sub BigQuery and pull subscriptions, no-failover multi-region, rewriting the class of existing objects, Spanner global and multi-region creation, local `rsync` mirroring, Storage Transfer Service from S3 and NFS agents, early deletion of temporary files, and Transfer Appliance.
- The new decisions are: Firestore for offline mobile sync, Coldline for quarterly access, BigQuery Data Transfer Service for Google Ads, deletion vs replication vs soft delete, private services access before a Cloud SQL private IP, a Regional Filestore tier (and the default Basic HDD), a bucket-to-bucket Storage Transfer Service mirror with `destination-if-unique`, the smallest Spanner instance (100 PUs, Standard), the Spanner move prerequisites, and Firestore relocation through a new database + export/import.
