# QZ-dp-900-31-azure-storage — end-of-chapter quiz, DP-900 chapter 31

File: `content/dp-900/quizzes/31-azure-storage.yaml` (10 questions, `dp900-qz-31-01` to `-10`).
Objectives: 3.1.1 = Q1, Q4, Q7, Q9, Q10; 3.1.2 = Q3, Q6; 3.1.3 = Q2, Q5, Q8.
Types: single 5, yesno_statements 3, multi 1, dragdrop 1. Positions 6–10: single, multi, yesno, dragdrop, yesno.
Check: `npx tsx factory/check-quiz.ts dp-900 31-azure-storage` -> 0 problem(s), 0 warning(s).

## Sources fetched (2026-11-24)

Training units 2 (blob), 3 (Data Lake Storage Gen2), 4 (Azure Files), 5 (Azure Tables) of `explore-provision-deploy-non-relational-data-services-azure`; docs `storage/blobs/access-tiers-overview`, `storage/blobs/lifecycle-management-overview`, `storage/blobs/storage-feature-support-in-storage-accounts`, `storage/tables/table-storage-design-for-query`.

## Overlap with the mock exam

The 53 mock questions of 3.1.x cover almost every fact of the chapter. The quiz tests other decisions or combinations: hot tier = no minimum period (Q1), fastest query described by its keys (Q2), portal for a browser-only upload (Q3), 50,000 blocks / 512-byte pages / no bulk operation on virtual folders (Q4), choosing the row key for a chronological range (Q5), protocol + tier + service combined (Q6), HNS + archive lifecycle together (Q7), consequences of denormalization and of a non-key filter (Q8), service matching with the Table storage / Cosmos DB for Table trap (Q9), lifecycle + early deletion arithmetic + last-modified reset (Q10).

## Doubts and facts to watch

- Q10 s2 (early deletion when the lifecycle policy deletes an archived blob after 90 days): from the prorated early deletion rule of the access tiers page. If blob soft delete is enabled, the charge is deferred until the soft-delete retention expires (still before 180 days here); the stem doesn't mention soft delete.
- Q7: archive tier and lifecycle tiering on HNS accounts checked on the feature-support page (supported). Both Q7 and Q10 state LRS because the archive tier isn't supported on ZRS/GZRS/RA-GZRS accounts.
- Q1 states a general-purpose v2 account: legacy Blob Storage accounts have no minimum period for cool and cold.
- Rehydration: Learn now says "up to 15 hours"; the chapter says "can take hours" (consistent, less precise).

## Chapter vs current Learn (not edited)

- The access tiers doc lists a **smart tier** (moves data between hot, cool and cold; no preview label) and a **Turbo tier (Preview)**; chapter 31 lists only four tiers. Smart tier could deserve one sentence.
- The Data Lake Storage unit says Microsoft Fabric OneLake is built on ADLS Gen2; the chapter only says Fabric "works with it" (fine).
- The Table storage unit calls the data "semi-structured" (chapter agrees); the Table docs say "structured NoSQL data" (already noted in Q-dp-900-3a report).
