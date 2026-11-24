# QZ-az-900-23-storage — report

File: `content/az-900/quizzes/23-storage.yaml` (10 questions). Check: `npx tsx factory/check-quiz.ts az-900 23-storage` → 0 problem(s), 0 warning(s).

## Chapter out of date against current Learn

- **Azure Data Box capacity (section migration-options, EN and FR)**: "It holds about 80 terabytes." *What is Azure Data Box?* (fetched) now describes the **Data Box Next-gen** devices: 120 TB usable and 525 TB usable. The 80-TB device is being retired region by region (no new orders after retirement), and Data Box Heavy is retired. Suggested fix: "Next-gen devices hold 120 TB or 525 TB of usable capacity", or drop the figure. The quiz doesn't test capacity.
- Learn now calls premium file shares "SSD file shares" (and standard ones "HDD file shares") on the redundancy and Azure Files pages. *Overview of storage accounts* still uses the type name "Premium file shares", which the chapter and quiz keep.
- Not in the chapter but new on Learn: the blob **smart tier** (moves data automatically between hot, cool and cold). Azure Storage redundancy also mentions **Geo priority replication** (RPO ≤ 15 min for block blobs). Neither is needed for AZ-900. The quiz doesn't use them.

## Facts checked (pages fetched)

- The default account tier can be hot, cool or cold, never archive. Changing the default only affects blobs whose tier is inferred. Archive rehydration can take up to 15 hours. Cold costs less to store and more to access than cool (q10).
- GZRS uses three or more zones in the primary region plus a secondary region. Replication to the secondary region is asynchronous, so the latest writes can be lost. The secondary can be read only after a failover unless RA- is enabled, and customer-managed failover is available (q2, q8, q9).
- Azure Files: GRS/GZRS only for HDD (standard) shares, SSD (premium) shares LRS/ZRS only, and no RA-GRS/RA-GZRS for Azure Files (q6).
- Queue messages are up to 64 KB and queues build a backlog of asynchronous work (q7). Tables are a schemaless key/attribute NoSQL store (q1, q7).
- Data Box use case "initial bulk transfer followed by incremental transfers over the network" (q5).
- File Sync cloud tiering keeps hot files locally and tiers cool files to the Azure file share (q4).

## Doubts / unverified

- q8 (dropdown): "GRS is the cheapest option that survives a region loss; zone redundancy and read access to the secondary each add cost" comes from Azure pricing, not from a fetched Learn page. The ranking LRS < ZRS < GRS < RA-GRS < GZRS < RA-GZRS is standard. Check it against the pricing page if needed.
- The account-overview table marks premium page blobs as LRS/ZRS, but the redundancy page recommends LRS only for premium page blobs. The quiz doesn't test this.

## Mock-exam overlap

The 42 mock questions of 2.3.x cover 2.3.5 almost completely: AzCopy in a script and one-way sync, Storage Explorer as a GUI that uses AzCopy, File Sync across offices, the agent and cloud tiering by name. The quiz tests 2.3.5 once, through a new decision: a small branch disk with File Sync and cloud tiering. Other new decisions: Tables for a flexible address book, GZRS definition, GPv2 endpoints / Data Lake / GZRS, Data Box seed + AzCopy increments, Standard GPv2 + GZRS for files (premium has no geo-redundancy), queue 64-KB limit and backlog, RA-GZRS vs GRS for two accounts, GZRS asynchronous replication / failover, default tier vs explicit tiers.
