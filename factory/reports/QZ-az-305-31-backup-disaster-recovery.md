# QZ-az-305-31-backup-disaster-recovery — report

File: `content/az-305/quizzes/31-backup-disaster-recovery.yaml` (10 questions, `az305-qz-31-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Objectives: 3.1.1 (Q1, Q5, Q9, Q10), 3.1.2 (Q2, Q8), 3.1.3 (Q3, Q6), 3.1.4 (Q4, Q7). Positions 6-10: dropdown, dropdown, yesno_statements, multi, single.

## Chapter or mock exam out of date against current Learn

- **Blob backup policies (important).** "Overview of Azure Blobs backup" (updated 2026-08-26) says that a new backup policy supports operational backup only together with vaulted backup. You can't create an operational-only policy, and vaulted backup is selected by default and can't be turned off. Existing policies are unchanged. The chapter (section `unstructured-backup`, table "Operational backup / Vaulted backup" and the requirement table) presents the two as independent modes. Mock questions that recommend an operational backup on its own should get a note or a rewording: `az305-sr2c-q2` ("operational backup with a 14-day retention") and possibly `az305-3a-uns-blob-backup-modes`. Quiz Q4 states a policy that contains both.
- **Operational backup and deletion of the account.** The same page says that operational backup also guards against the deletion of the storage account, by applying a delete lock to it. The chapter says that only vaulted backup protects against it. That is true for an off-site copy, but the lock is worth one line.
- **Standard to Enhanced policy migration.** The Enhanced policy page says the migration from Standard to Enhanced is "now supported and available in preview". The chapter table states "Can move to Enhanced" as a plain fact.
- **Standard policy and Trusted Launch.** Learn now allows Trusted Launch VM backup with the Standard policy, but only through CLI 2.73.0+, PowerShell Az 14.0.0+ or REST 2025-01-01+. The chapter doesn't mention it, and the quiz doesn't depend on it.
- **Instant restore retention.** "Azure Instant Restore Capability" gives 1–5 days (Standard) and 1–30 days (Enhanced) in one place, then "5 to 20 days for the Enhanced policy" and "default two days for each policy" in others, so the page contradicts itself. The Enhanced policy page says 1–30 days, default 7. Q8 uses 1–5 and 1–30.

## Unverified or partly verified facts

- "Microsoft commits to an RTO of up to one hour" for Site Recovery (chapter) doesn't appear on "About Azure Site Recovery". I didn't fetch the SLA page, and the quiz doesn't use this fact.
- The SQL Database business continuity overview page (RTO/RPO table) failed to load (client error). Q9 relies on an RPO of seconds for a failover group (asynchronous geo-replication) and asks for "less than one minute". I took this from the chapter and could not re-check the figure this session.
- Q10 relies on MABS restoring whole VMware virtual machines. The fetched page covers agentless VMware protection, local disk plus online protection, and long-term retention, but it only describes file-level recovery. Whole-VM recovery is in a separate MABS article that I didn't fetch.
- The Azure Files support matrix confirms Cross Region Restore for vaulted backup only through the failover table ("Only cross-region restore from the vault is supported") and the intro ("cross-region recovery"). Q7 uses a geo-redundant Recovery Services vault with Cross Region Restore.

## Doubts

- Q3 recommends the Standard (DTU) tier as the cheapest way out of Basic for a 14-day PITR retention. The choice is reasonable, but the stem gives no price data.
