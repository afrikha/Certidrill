# QZ-gcp-ace-34-manage-storage-data — report

File: `content/gcp-ace/quizzes/34-manage-storage-data.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-ace 34-manage-storage-data` → 0 problem(s), 0 warning(s).

Coverage: 3.2.1 (q1, q8 multi), 3.2.2 (q10 multi), 3.2.3 (q3), 3.2.4 (q5), 3.2.5 (q6, q9 multi), 3.2.6 (q2), 3.2.7 (q4), 3.2.8 (q7). The 33 mock questions of these objectives were read; the quiz tests other decisions (soft-delete restore vs versioned-object copy, Dataflow drain, legacy SQL default of `bq query`, Security Command Center for Database Center security issues, free `bq head` preview vs `LIMIT`, Cloud SQL final backup retention, CMEK key location for a configurable dual-region bucket, Firestore restore excludes TTL and Security Rules but includes indexes, `sizeAboveBytes` and `AbortIncompleteMultipartUpload` conditions).

## Verification (2026-11-27)
- Cloud Storage: soft delete overview and "Use soft-deleted objects" (`gcloud storage restore`, latest version when no generation); "Use versioned objects" (copy `#GENERATION` to restore, live version becomes noncurrent); lifecycle page (Class A charge per transition, `sizeAboveBytes`, `AbortIncompleteMultipartUpload` accepts only `age`/`matchesPrefix`/`matchesSuffix`); CMEK page (configurable dual-region US-EAST1+US-WEST1 → key ring in `us`; service agent does the encryption). Commands checked with local `gcloud storage ls/restore --help`.
- Dataflow "Stop a running Dataflow pipeline" (drain streaming only; cancel may lose in-flight data; force cancel last resort).
- BigQuery: "Estimate and control costs" (LIMIT does not reduce bytes read on non-clustered tables; table preview / `bq head` free; maximum bytes billed). Legacy SQL default when no flag and no prefix: verified with local `bq query --help` (bq 2.1.32); the bq CLI reference page was fetched but its extract was truncated before the flag.
- Database Center "Set up Database Center" (Viewer required; Recommender Viewer optional for recommender issues; security issues need Security Command Center, Built-in tier for basic, Premium for all).
- Cloud SQL backups overview (final backup 30 days by default, 1–365 days for standard backups; on-demand kept until deleted); flags `--enable-final-backup`, `--final-backup-retention-days`, `--retain-backups-on-delete` checked with local gcloud help.
- Firestore "Back up and restore data" (restore to a new database ID only; backups include index configurations, exclude TTL policies and Security Rules).

## Doubts and chapter / mock issues
- Mock question `gcpace-3c-disk-cmek-convert` (3.2.8) treats `gcloud compute disks update-kms-key` as wrong. The command exists in the GA `gcloud compute disks` group (gcloud 570): "updates the KMS key of a Compute Engine Persistent or Hyperdisk Disk by rotating it to the primary version of the key or to the primary version of a new KMS key". Whether it can convert a disk encrypted with a Google-owned key to CMEK was not verified (reference page extract truncated). Option b of that question may be valid: needs review.
- Chapter section querying-data / cost-estimation: "`LIMIT` does not reduce BigQuery bytes billed" — the docs qualify it "for non-clustered tables". Suggest adding the qualifier.
- Chapter section cmek: "regional resource → same region; multi-region → matching multi-region" lacks the dual-region rule (configurable pair → matching multi-region key ring such as `us`; predefined dual-region such as NAM4 → key ring in NAM4).
- Chapter section database-center: "Checks that depend on Security Command Center or Gemini Cloud Assist show as passing when those aren't enabled" — not found on the fetched setup/overview pages (they only say SCC must be activated to see security issues). Unverified.
- Chapter section backup-restore (Firestore): could add that backups include index configurations (only TTL policies and Security Rules must be reapplied).
