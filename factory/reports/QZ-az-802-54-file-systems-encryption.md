# QZ-az-802-54-file-systems-encryption — report

File: `content/az-802/quizzes/54-file-systems-encryption.yaml` (10 questions, `az802-qz-54-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 54-file-systems-encryption` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 5.3.8 | single | 1 | Azure File Sync server endpoint → NTFS only |
| 2 | 5.3.11 | single | 1 | Find BitLocker Recovery Password → first 8 characters of the password ID |
| 3 | 5.3.5 | yesno | 2 | Post-processing (No), Default skips in-use files (Yes), chunk store in System Volume Information (Yes) |
| 4 | 5.3.9 | dropdown | 2 | `-UseFixed`, `IPAddress:` initiator ID, `Add-IscsiVirtualDiskTargetMapping` |
| 5 | 5.3.10 | single | 2 | `Suspend-BitLocker -RebootCount 1` before a firmware update (vs 0, Disable, recovery key) |
| 6 | 5.3.8 | multi | 3 | ReFS blockers on WS2025: ODX and shrink (EFS on ReFS is WS2025-only, dedup since 2019) |
| 7 | 5.3.5 | single | 3 | Unoptimization job alone; Disable-DedupVolume leaves files optimized and blocks later job cmdlets |
| 8 | 5.3.9 | multi (3) | 3 | MPIO: feature, `Enable-MSDSMAutomaticClaim -BusType iSCSI`, one `-IsMultipathEnabled` session per path |
| 9 | 5.3.10 | yesno | 3 | AD account protector not for OS volume, auto-unlock of data volume, `-UsedSpaceOnly` leaves free space unencrypted |
| 10 | 5.3.11 | single | 3 | DRA unlocks an OS drive only when attached as a data drive elsewhere (`manage-bde -unlock -Certificate -ct`) |

All mock-exam questions of 5.3.5, 5.3.8–5.3.11 (az802-5b-*, az802-cs1b-*, az802-cs2b-dedup-usage) were read first; none of their decisions is reused with the same answer.

## Chapter issues against current Learn (chapter not edited)

- **NTFS maximum volume size:** the chapter says 8 PB (WS2019+, 2 MB clusters). The "Resilient File System (ReFS) overview" limits table now gives NTFS 256 TB (max file and volume). Learn is inconsistent with the NTFS overview; not used.
- **"FSRM and DFS Replication require NTFS":** neither the ReFS overview nor the "Distributed File System (DFS) Replication overview" states it any more. Not used (Azure File Sync, which the planning page confirms as NTFS-only, was used instead).
- **Deduplication usage types:** Learn's table says the Backup usage type also optimizes in-use files (not partial files); the chapter omits it.
- **Disable-DedupVolume:** Learn says that once deduplication is disabled, job cmdlets such as `Start-DedupJob` no longer work on the volume, so Unoptimization must run before (or instead of) disabling. Worth an Exam trap in the chapter.
- **Suspend-BitLocker:** the page text says the default RebootCount is 1; its parameter table says "None". `-RebootCount 0` = suspended until `Resume-BitLocker`.
- **AD account protector:** `Add-BitLockerKeyProtector` says OS volumes can't use it, but both that page and `Enable-BitLocker` show it on `C:` in their examples (Learn inconsistency).
- **Recovery process page** says to type "the first eight characters of the recovery password" in the **Password ID (first 8 characters)** box; the chapter's "password ID" matches the box label.

## Unverified (not used, or only as context)

- Restart requirement after installing Multipath I/O or running `Enable-MSDSMAutomaticClaim` (the cmdlet page says nothing); hence a multi rather than an ordering. Feature name `Multipath-IO` from the chapter.
- `Enable-BitLockerAutoUnlock` doesn't say that the OS volume must itself be BitLocker-protected; question 9 only relies on the documented behavior (data volumes unlock after the OS volume).
- Chapter claims not checked and not used: dedup memory sizing, nested virtualization / multi-tier S2D limits, Robocopy and the chunk store, "unlocking with the recovery password resets TPM measurements".
