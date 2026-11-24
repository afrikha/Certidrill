# QZ-az-802-52-file-shares — report

File: `content/az-802/quizzes/52-file-shares.yaml` (10 questions, `az802-qz-52-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 52-file-shares` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 5.2.1 | single | 1 | `-ContinuouslyAvailable` for open VM files across a node failover |
| 2 | 5.2.3 | single | 1 | DFS-R initial replication: the primary member is authoritative |
| 3 | 5.2.2 | single | 2 | Quota template edit: apply only to derived quotas that still match the template |
| 4 | 5.2.5 | single | 2 | Alternative SMB port on the client: `New-SmbMapping -TcpPort` |
| 5 | 5.2.4 | single | 2 | Renewed QUIC certificate = new thumbprint, update the certificate mapping |
| 6 | 5.2.1 | single | 3 | Restrict local (RDP) and network access in one place: share Full + NTFS |
| 7 | 5.2.2 | single | 3 | Screens don't touch existing files; FilesByFileGroup report vs FileScreenAuditFiles |
| 8 | 5.2.3 | multi (3) | 3 | Branch DFS-R: Robocopy pre-seed + HQ primary + read-only membership |
| 9 | 5.2.4 | yesno | 3 | QUIC client access control: root allowed, intermediate blocked, leaf allowed, no entry |
| 10 | 5.2.5 | dropdown | 3 | Per-share encryption vs server-wide/RejectUnencryptedAccess; client RequireEncryption; keep APP1 default for a non-encrypting NAS |

All 26 mock-exam questions of 5.2.1–5.2.5 (bank, case studies cs3a/cs3c/cs4b, series sr2) were read first; no decision reused with the same answer (q2 makes "designate primary member" correct for initial replication, where `az802-5a-dfsr-conflict-restore` uses it as a wrong option after a later conflict).

## Chapter issues against current Learn (chapter not edited)

- **Event 1003 / Access denied (smb-settings):** the chapter says "an SMB 3 client that can't encrypt is rejected". SMB Security Enhancements says the rejection and event 1003 concern clients that **don't support SMB 3.x**. Reword.
- **Share permission design (share-access):** the chapter says "Everyone or Authenticated Users Full". The only Learn page found (archived "Share and NTFS Permissions on a File Server") recommends Full Control for **Everyone**; Authenticated Users isn't mentioned. Q6 uses Authenticated Users as the chapter does; harmless, but unsourced.
- **Continuously available shares:** the SOFS overview says CA shares are incompatible with FSRM and slower for large copies (write-through), and unsuited to home folders / folder redirection. The chapter's table doesn't mention it; a possible exam trap worth one line.
- **DFS-R read-only folders:** the DFS Replication FAQ still describes read-only replicated folders "if you're using Windows Server 2012 or 2008 R2" (dated wording); `Set-DfsrMembership -ReadOnly` is current. No change needed.
- **SMB over QUIC client:** the chapter says "Windows 11 (or Windows Server 2025)"; the SMB over QUIC prerequisites list only "A Windows 11 device" (client access control lists Windows Server 2025 as a client). Minor.

## Doubts / not fully verified

- Q1: `New-SmbShare` documents `-ContinuouslyAvailable` only as "the share is continuously available"; the transparent-failover meaning comes from the SOFS overview (table: SMB Continuous Availability supported on general-use clustered file servers too).
- Q7: the French UI name of the Files by File Group report isn't verified; the option uses the `-ReportType` enum values (`FilesByFileGroup`, `FileScreenAuditFiles`) from the `New-FsrmStorageReport` reference.
- Q9 s3 (LAPTOP9 refused): the client access control page states "if none … denied and at least one is allowed, the client is granted access"; the outcome with no allow entry is the direct consequence but isn't spelled out.
- `Set-SmbClientConfiguration -RequireEncryption` syntax was read in the PowerShell tab of the Learn source (WebFetch didn't render that tab).
- French: "cmdlet" is `undecided` in the glossary; the French stems avoid it ("commande"). "handles ouverts" (Q1) not checked on fr-fr Learn.
