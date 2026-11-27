# QZ-gcp-pca-22-storage-systems — report

File: `content/gcp-pca/quizzes/22-storage-systems.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-pca 22-storage-systems` → 0 problem(s), 0 warning(s).

## Plan

| # | Objective | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.2.1 | 1 | single | Archive class is read in milliseconds (no restore step) |
| 2 | 2.2.2 | 1 | single | Spanner smallest capacity: 100 processing units |
| 3 | 2.2.3 | 2 | single | Storage Object Creator for upload-only clients (no list, read, delete, overwrite) |
| 4 | 2.2.4 | 2 | single | Cloud SQL cross-region read replica for remote readers (not the HA standby) |
| 5 | 2.2.6 | 2 | single | Bigtable row key `meter_id#reversed_timestamp` against hotspots |
| 6 | 2.2.2 | 3 | single | BigQuery Enterprise edition: cheapest edition with CMEK, VPC-SC, policy tags and commitments |
| 7 | 2.2.7 | 3 | single | Dual-region + turbo replication (not multi-region, not default replication) for a 15-min RPO |
| 8 | 2.2.5 | 3 | single | Object Retention Lock in Locked mode for per-object retention |
| 9 | 2.2.3 | 3 | multi (2) | Workload Identity Federation (AWS provider) + bucket-scoped grant to the principal set |
| 10 | 2.2.7 | 3 | multi (3) | Cloud SQL HA + in-place upgrade to Enterprise Plus for 14-day PITR + cross-region replica |

Mock-exam questions of 2.2.1–2.2.7 were read first; none of their decisions is repeated (e.g. the bank tests Coldline for quarterly reads, Bucket Lock, event-based holds, PITR enablement, signed URLs, PAP, CMEK default key, BigQuery reservations, Bigtable storage autoscaling).

## Facts verified (docs.cloud.google.com, fetched 2026-11-27)

- Storage classes: Archive "available within milliseconds", 365-day minimum, retrieval fees.
- Spanner: 1,000 PUs = 1 node, multiples of 100 below 1,000 (the page gives no explicit "minimum" sentence; 100 is the smallest multiple).
- IAM roles for Cloud Storage: objectCreator "does not give permission to view, delete, or overwrite objects"; legacyBucketWriter = create, overwrite, delete, list.
- Cloud SQL replication (read replicas read-only, asynchronous, closer to users); HA (synchronous, automatic failover, standby "is not a replica"); PITR retention 1–7 days Enterprise, 1–35 days Enterprise Plus; in-place upgrade to Enterprise Plus page exists.
- Bigtable schema design: no timestamp-first keys, high-cardinality value first, reversed timestamps.
- BigQuery editions: Standard has no commitments, no baseline, no CMEK, no VPC-SC, no fine-grained security, max 1,600 slots.
- Turbo replication: dual-region only, 15-minute RPO; default replication 12 hours. Configurable dual-region europe-west1 + europe-west4 allowed.
- Object Retention Lock: Unlocked vs Locked mode; no Preview label on the page.
- WIF with AWS: direct resource access recommended; Cloud Storage supported (GA) only for uniform bucket-level access buckets; federated identities can't generate signed URLs.

## Not verified on a fetched page (general knowledge, kept as distractor reasoning only)

- Q4: that the Cloud SQL HA standby cannot serve reads (pages only say it is "not a replica" and takes over on failover).
- Q6: that Enterprise Plus slots cost more than Enterprise slots (pricing page not fetched).
- Q9: that HMAC keys stay valid until deactivated (long-lived).

## Chapter remarks (not edited)

- 2.2.1 "the location is chosen at creation": Cloud Storage now supports **bucket relocation** after creation, available only with Storage Intelligence configured (Bucket locations page). The chapter could mention it.
- 2.2.3 Exam trap on Workload Identity Federation: worth adding that identity federation with Cloud Storage works only on buckets with uniform bucket-level access, and that federated identities can't generate signed URLs.
- 2.2.3 encryption table lists CSEK for "Cloud Storage and Compute Engine" with no warning, while the exam profile lists CSEK for Compute Engine as deprecated. Not re-verified here; worth a check by the course owner.
