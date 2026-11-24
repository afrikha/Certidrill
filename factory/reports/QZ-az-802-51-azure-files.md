# QZ-az-802-51-azure-files — report

File: `content/az-802/quizzes/51-azure-files.yaml` (10 questions). `npx tsx factory/check-quiz.ts az-802 51-azure-files`: 0 problems, 0 warnings.

Objectives: 5.1.1 (Q1, Q6), 5.1.2 (Q4, Q10), 5.1.3 (Q5, Q8), 5.1.4 (Q2), 5.1.5 (Q9), 5.1.6 (Q3, Q7). Positions 6–10 use the formats single, multi, yesno_statements, dropdown and multi.

## Facts checked on Learn (fetched)
- Azure Files management concepts: Microsoft.FileShares is NFS only, SSD only, no Azure File Sync, GA.
- Create a classic file share / Understand Azure Files billing: the provisioned v2 SKUs; geo-redundancy on HDD only; start in the transaction optimized tier during migration; up to 50 shares per account.
- Deploy Azure File Sync: "Allow storage account key access must be set to Enabled" is a prerequisite. The page lists the 10 DFS-R migration steps and the "Azure file share download" mode for proactive recall.
- Plan an Azure File Sync deployment: cluster support covers File Server for general use on clustered disks only (no SOFS or CSV), with the agent on every node. Users with only read permissions on the storage account can't create cloud endpoints.
- Monitor Azure File Sync: event 9302 is logged every 5–10 minutes during an active session.
- Migration Overview: for a 2012 R2 cloud-only target, use Storage Mover or Robocopy. AzCopy is limited to 10 million files per sync job.
- Identity overview: Entra Domain Services needs clients joined to the managed domain, cloud-only identities OK. Entra Kerberos needs clients that are Entra joined or hybrid joined.
- Assign share-level permissions: propagation takes about 30 minutes; when both apply, the higher permission wins; the role must go to the synced identity.

## Doubts
- Q5: the PowerShell parameter for proactive recall (`-LocalCacheMode DownloadNewAndModifiedFiles`, used in the chapter) couldn't be confirmed. The fetched pages show only the portal steps ("Azure file share download" mode), so the question uses the portal wording.
- Q7: assumes Robocopy runs on FS-OLD (Windows Server 2012 R2, SMB 3.0) against the mounted share. This works with the default SMB security settings of the account, but would fail if the account were restricted to SMB 3.1.1 / AES-GCM. The stem doesn't mention SMB settings.
- Q9 partly overlaps mock question az802-cs3a-dfsr-migration on "disable DFS-R, then create the other endpoints". It differs in testing the first server when one replica is incomplete and tiering when a volume is full. The objective is narrow, and the bank already covers every DFS-R decision.

## Chapter vs Learn
- 5.1.2, exam trap "a user that exists only in AD DS can't receive an RBAC role": that's true for the user, but Learn now says such users can still get share-level access through a synced AD DS group, because Azure Files reads group SIDs from the Kerberos ticket (AD DS authentication only). The chapter should mention this so learners don't conclude that only the default share-level permission works.
- 5.1.2, role table: Learn also lists **Storage File Data SMB Take Ownership**, which the chapter doesn't mention. Learn describes **Storage File Data SMB Admin** as "admin access equivalent to a storage account key, over SMB".
- 5.1.3, prerequisites: the chapter says the account "must allow SMB 3.1.1, NTLMv2 and AES-128-GCM". The Plan page doesn't say this, and it says Azure File Sync uses HTTPS 443 and never SMB between server and share. Please check where this requirement comes from.
- 5.1.3, permissions: Learn now also describes **managed identity deployments** of Azure File Sync (roles such as Reader and Data Access or Storage File Data Privileged Contributor for the Azure File Sync identity). The chapter covers only the listKeys path. The Deploy page still requires key access to be enabled, so Q6 holds.
- 5.1.1: Understand Azure Files billing mentions NFS HDD shares (LRS only) under provisioned v2. Create a classic file share says NFS requires an SSD account. Learn is inconsistent here. The chapter follows the second page, and no question depends on it.
- 5.1.3: the Deploy page doesn't state the same-region rule between the Storage Sync Service and the storage account (it wasn't on the fetched sections). The chapter and the mock questions rely on it; this quiz doesn't.
