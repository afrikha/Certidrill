# FIX-az-802-3 — chapters 42, 51 to 54 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-802 42-ip-addressing 51-azure-files 52-file-shares 53-storage-spaces 54-file-systems-encryption` 0 problems; `content:validate --cert az-802` 0 problems, 0 warnings; `check-quiz az-802` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The shared WebFetch budget ran out several times; every finding below was fetched in the end, except where marked.

## 42-ip-addressing (QZ report: no error found)

| Finding | Learn | Change |
| --- | --- | --- |
| MCLT 1 hour, hot standby uses the whole pool only after MCLT and not in COMM-INT | Taken from the QZ report's fetches (Add-DhcpServerv4Failover, DHCP failover); the chapter agrees | None |
| Dynamic private IPs are released only when the NIC is deleted, moved or switched to static | Not re-fetched. The chapter and the 4.2.x bank questions make no claim about stop/deallocate | None |
| FR glossary | No « appairé », « portée » or other avoided term in the FR file | None |

## 51-azure-files

| Finding | Learn | Change |
| --- | --- | --- |
| AD DS-only users get share-level access through a synced group | Confirmed (Assign share-level permissions, AD DS authentication only): Azure Files reads group SIDs from the Kerberos ticket and applies the RBAC role of synced groups | 5.1.2 exam trap: the identity can't receive a role itself, but gets the role of a synced AD DS group; otherwise default share-level permission |
| Role table: Take Ownership role missing; SMB Admin wording | Confirmed: "Storage File Data SMB Take Ownership" (take ownership of a file/directory); SMB Admin = "admin access equivalent to a storage account key" over SMB | SMB Admin row reworded (no longer says "take ownership of any file"); new Take Ownership row |
| Account must allow SMB 3.1.1, NTLMv2, AES-128-GCM: source? | Confirmed on Deploy Azure File Sync, Prerequisites: "SMB security settings must allow the SMB 3.1.1 protocol version, NTLM v2 authentication, and AES-128-GCM encryption" | None |
| Managed identity deployments | Confirmed (Deploy Azure File Sync): the managed identity or service principal needs roles such as Reader and Data Access or Storage File Data Privileged Contributor. Same page: account read-only access is not enough to create a cloud endpoint | Prerequisites paragraph: two sentences |
| Same-region rule | Confirmed (Deploy Azure File Sync: "must be in the same region as the storage sync service") | None |
| `-LocalCacheMode DownloadNewAndModifiedFiles` | The cmdlet reference (New-AzStorageSyncServerEndpoint) lists `-LocalCacheMode` with `DownloadNewAndModifiedFiles` and `UpdateLocallyCachedFiles`, but explains neither value. The Deploy and server-endpoint pages describe proactive recall in portal terms only | None. The value meaning is inferred, not stated by Learn |
| NFS HDD shares (billing page) vs NFS requires SSD (classic share page) | Not re-fetched; the QZ report shows that Learn is inconsistent | None. For a human decision |

## 52-file-shares

| Finding | Learn | Change |
| --- | --- | --- |
| Event 1003: "an SMB 3 client that can't encrypt is rejected" | Wrong (SMB security enhancements): with `RejectUnencryptedAccess` at its default `$true`, clients that **don't support SMB 3.x** get Access denied and event 1003; SMB 1.0 clients are also rejected | smb-settings bullet reworded |
| Continuously available shares | Confirmed (Scale-Out File Server overview): CA shares write through without buffering, so they slow Folder Redirection, Offline Files, roaming user profiles, home directories and large copies, and they are incompatible with FSRM | share-access: new sentence after the requirement table |
| FSRM is NTFS only | Confirmed (FSRM overview: "NTFS file system only. The Resilient File System isn't supported") | None |
| "Everyone or Authenticated Users Full" at the share | The only source is an archived page that recommends Everyone; no current page contradicts the wording | None. For a human decision |
| SMB over QUIC client "Windows 11 (or Windows Server 2025)" | The SMB over QUIC Prerequisites list only "A Windows 11 device"; the QZ report says the client access control page lists Windows Server 2025 as a client (not re-fetched) | None. Two pages disagree; for a human decision |
| DFS-R read-only folder (dated FAQ wording) | Confirmed: the DFS-R FAQ still says "Windows Server 2012 or Windows Server 2008 R2" | None |

## 53-storage-spaces

| Finding | Learn | Change |
| --- | --- | --- |
| Mount point folder: NTFS only? | Wrong: "Assign a mount point folder path" requires an empty folder on an NTFS **or ReFS** drive and a volume formatted with NTFS or ReFS. The Disk Management option is still labeled "Mount in the following empty NTFS folder" | disks-volumes bullet |
| Three-way mirror: 5 disks, not counting hot spares | Confirmed (Deploy Storage Spaces on a stand-alone server: at least five disks, "does not include any disks that are allocated as hot spares") | Resiliency table, three-way mirror row |
| QoS policy type can't change after creation | Confirmed (Storage QoS overview: name and limits can change; "the Policy Type (Aggregated/Dedicated) cannot be changed") | storage-qos: new bullet |
| QoS: several VHDX files of one VM with the same Dedicated policy share the limit | Learn contradicts itself on the same page: the body says they share the limit, the FAQ says they don't | None. For a human decision |
| Storage Replica test failover cmdlet | Confirmed (Mount-SRDestination reference): mounts a snapshot of the destination for testing or backup ("test failover"); `-TemporaryPath` must be an unused NTFS or ReFS volume that isn't replicating; `Dismount-SRDestination` is the companion cmdlet | storage-replica bullet names both cmdlets |
| Nested mirror-accelerated parity about 35 % to 40 % | Already confirmed in the QZ report (39.1 %) | None |

## 54-file-systems-encryption

| Finding | Learn | Change |
| --- | --- | --- |
| NTFS maximum 8 PB vs ReFS overview "256 TB" | The NTFS overview (the more specific page) gives 8 PB with 2048 KB clusters on Windows Server 2019 and later, 256 TB on earlier versions | None. The ReFS overview table is out of date |
| "FSRM and DFS Replication require NTFS" | Confirmed: FSRM overview (NTFS only) and DFS Replication FAQ ("supports volumes formatted with the NTFS file system only; ReFS and FAT aren't supported"; no CSV) | None |
| Backup usage type optimizes in-use files | Confirmed (Understanding Data Deduplication): Backup = minimum age 0 days, in-use files Yes, partial files No, priority optimization | Usage type table, Backup row |
| `Disable-DedupVolume` blocks later job cmdlets | Confirmed (Disable-DedupVolume reference): the volume stays deduplicated and readable, and job cmdlets such as `Start-DedupJob` can't be used on it. Running deduplication: Unoptimization fails without enough space for the unoptimized data | New paragraph after the job table |
| Suspend-BitLocker default RebootCount (1 in text, None in table) | Not re-fetched. The chapter always passes `-RebootCount 1` | None |
| AD account protector on OS volumes | Not re-fetched. Learn is inconsistent (text says not for OS volumes, examples use C:); the chapter says it doesn't unlock an OS volume at preboot | None. For a human decision |

## Mock-exam bank questions changed

None. No bank question of objectives 4.2.1–4.2.5, 5.1.1–5.1.6, 5.2.1–5.2.5 or 5.3.1–5.3.11 is contradicted by a verified Learn fact.

## Checked and left unchanged

- `az802-5a-perm-gmsa-default` (5.1.2): "identities that exist only in AD DS cannot receive role assignments" is still true. Note for a reviewer: under Learn's group-SID rule, adding gmsaReports to the synced group Report-Editors would also give it share access. No option offers this, so the answer stays unique; a stem saying that gmsaReports must not join existing groups would close the gap.
- `az802-5a-smb1-audit` (5.2.5): option b explanation ("event 1003 records clients rejected because they cannot use SMB encryption") matches Learn in substance (clients without SMB 3.x on an encrypted share).
- `az802-5a-sync-prereq-fix`, `az802-5a-sync-change-detection`, `az802-5a-sync-endpoint-ps` (5.1.3): same region, NTFS only, HTTPS 443, `-LocalCacheMode` exists.
- `az802-5a-perm-effective-statements`, `az802-cs2b-share-roles` (5.1.2): role behavior and "higher of default vs assignment" confirmed.
- `az802-5a-dfsr-unsupported-locations` (5.2.3): NTFS-only and no-CSV confirmed by the DFS-R FAQ. `az802-5a-fsrm-refs-volume` (5.2.2): FSRM NTFS-only confirmed.
- `az802-5a-share-settings-hotarea` (5.2.1): doesn't rely on CA behavior.
- `az802-cs1b-pool-resiliency`, `az802-5b-spaces-newvd-dropdown` (5.3.2): the pools have six disks and no hot spare, so "five disks" holds.
- `az802-5b-qos-*` (5.3.7): none changes a policy type or relies on the same-VM Dedicated sharing.
- `az802-5b-dedup-*`, `az802-cs1b-vdi-dedup`, `az802-cs2b-dedup-usage` (5.3.5): no claim about Backup and in-use files; Unoptimization explanation matches Learn.
- `az802-5b-fs-ntfs-cluster` (5.3.8): 64 KB = 256 TB and 2048 KB = 8 PB match the NTFS overview.
- 4.2.x: no question says that a dynamic private IP changes on stop/deallocate.

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 54's Disable-DedupVolume question and quiz 53's mount-point question already state what the chapters now say.

## For a human decision

- 51: NFS on HDD (provisioned v2 billing page) vs NFS requires SSD (classic share page).
- 51: the meaning of `-LocalCacheMode DownloadNewAndModifiedFiles` (proactive recall) isn't documented on Learn; only the portal wording is.
- 52: share permission design "Everyone or Authenticated Users Full" has no current Learn source.
- 52: SMB over QUIC client: Prerequisites say Windows 11 only; client access control lists Windows Server 2025 as a client.
- 53: Storage QoS overview contradicts itself on whether disks of one VM with the same Dedicated policy share the limit.
- 53: Deploy Storage Spaces on a stand-alone server lists SAS, SATA, iSCSI/FC and USB, not NVMe; the chapter lists NVMe (true for S2D). Not changed.
- 54: AD account protector on OS volumes and the Suspend-BitLocker default RebootCount are inconsistent on Learn.

## French terms not settled

- « cmdlet » is `undecided` in the glossary; chapters 51, 52 and 54 use « cmdlet(s) » in prose (existing text and the new sentence in 54).
- New, not in the glossary: « redirection de dossiers », « fichiers hors connexion », « profils utilisateur itinérants », « dossiers de base » (52); « disques de secours » for hot spares (53, existing usage); « type de stratégie » (53); « réhydrater » (54); « partages continuellement disponibles » (52, as in quiz 52).
