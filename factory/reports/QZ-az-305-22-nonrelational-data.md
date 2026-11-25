# QZ-az-305-22-nonrelational-data — report

File: `content/az-305/quizzes/22-nonrelational-data.yaml`, 10 questions (2.2.1 ×3, 2.2.2 ×2, 2.2.3 ×3, 2.2.4 ×2). `npx tsx factory/check-quiz.ts az-305 22-nonrelational-data` → 0 problem(s), 0 warning(s).

Formats in positions 6–10: dragdrop, yesno_statements, dropdown, single ×2.

## Chapter out of date or imprecise against current Learn (Nov. 2026)

- **Per-request consistency "only relaxable"** (section semi-structured). True for the classic `ConsistencyLevel` override, but *Manage Consistency - Azure Cosmos DB* now documents `ReadConsistencyStrategy` (preview, Java SDK v4.69+, .NET SDK v3.46+, direct mode), which can **strengthen** a read above the account default. Suggest "only relaxable per request (a preview read strategy can strengthen reads)". The quiz avoids any statement on strengthening.
- **"A multi-region account offers 99.999% read and write availability."** The Cosmos DB reliability page no longer gives figures; it lists "Accounts that use multiple write regions (Business Critical tier)" as an SLA factor. My understanding (SLA page not fetched) is that 99.999% *write* availability needs multiple write regions; a single-write-region multi-region account has 99.999% reads only. The new **Business Critical tier** for multi-region writes is not in the chapter and should be checked; it may affect mock questions that assume multi-region writes (az305-2b-consistency-multiwrite, az305-2b-multiwrite-conflicts, az305-sr2b-*).
- **Azure Files NFS.** *NFS file shares in Azure Files* now shows NFS on HDD in **preview** (provisioned v2 only, LRS only) and a new `Microsoft.FileShares` resource type (standalone share, no storage account) "recommended for new deployments". "NFS 4.1 shares exist on SSD only" is still right for GA, but the chapter's account-type table might mention the new resource type. Quiz q6 says each workload is deployed in a storage account to stay unambiguous.
- Access tiers page also lists a **Turbo tier (preview)**; not in the chapter (fine, preview).

## Unverified or partly verified

- Blob vaulted backup: the vaulted-backup tab of the support matrix was not readable, so support for premium block blob accounts is unknown. q9 option c is wrong for other reasons (backup copies aren't readable; restores to schedule), and its explanation makes no support claim.
- Object replication: Learn says "both the source and destination accounts must be either general-purpose v2 or premium block blob accounts" (unclear whether mixing is allowed). q9 uses premium → premium to stay safe.
- Azure File Sync caching on Windows Server only (q3 option c): from general knowledge; the Files planning page doesn't say it.
- q10 uses fictional prices (stated as assumptions); the 90-day cold minimum and the prorated early deletion charge are from *Access tiers for blob data*.

## Overlap with the mock exam

The bank has 56 questions on 2.2.x. Decisions avoided: API choice, Table Storage vs Cosmos Table, partition-key choice/change, hierarchical keys, multi-write consistency, Strong for RPO 0, tier choices already tested (cold for audits, GRS + archive), PITR, immutability, lock against deletion. New angles: default consistency, serverless single-region vs autoscale, NFSv3 → NetApp, vaulted backup vs account deletion, premium block blobs + HNS, autoscale idle billing per region + bounded staleness RU cost + 20 GB logical partition, GZRS forcing cold (archive unsupported), object replication for a premium account, cold + early deletion cheaper than cool.
