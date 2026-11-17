A Windows Server file server combines share and NTFS permissions, File Server Resource Manager (FSRM) policies, DFS Namespaces and DFS Replication, and SMB settings that Windows Server 2025 hardened. Exam questions describe a user who can't open or save a file, a branch that needs one path to several servers, or a security requirement for SMB traffic, and ask which setting or cmdlet answers it.

<!-- section: share-access | objectives: 5.2.1 -->
## Configure access to file shares

Two permission sets apply to a file opened over the network, and the **most restrictive** of the two effective results wins:

| Layer | Where | Values | Applies to |
| --- | --- | --- | --- |
| Share permissions | Share properties, `New-SmbShare`, `Grant-SmbShareAccess` | Full, Change, Read (and deny) | Network access only |
| NTFS permissions | Security tab of the folder, `icacls` | Full control, Modify, Read and execute, List folder contents, Read, Write, special | Local and network access |

Within each layer, permissions from all the user's groups add up and an explicit deny wins. A common design gives **Everyone or Authenticated Users Full** at the share and controls everything with NTFS.

```powershell
New-SmbShare -Name Finance -Path D:\Shares\Finance `
  -FullAccess "CONTOSO\File Admins" -ChangeAccess "CONTOSO\Finance Users" `
  -FolderEnumerationMode AccessBased -CachingMode None
Grant-SmbShareAccess -Name Finance -AccountName "CONTOSO\Auditors" -AccessRight Read -Force
Get-SmbShareAccess -Name Finance
```

| Requirement | Setting |
| --- | --- |
| Users see only the folders they can open | Access-based enumeration: `-FolderEnumerationMode AccessBased` (Server Manager: *Enable access-based enumeration*) |
| No offline copies of the share on clients | `-CachingMode None` (other values: Manual, Documents, Programs, BranchCache) |
| Share survives a node failover without interruption (Hyper-V, SQL Server) | `-ContinuouslyAvailable` on a clustered file server or Scale-Out File Server |
| Limit simultaneous connections | `-ConcurrentUserLimit` (0 = unlimited, the default) |
| Encrypt traffic of this share only | `-EncryptData $true` |

> **Exam trap.** A user with Modify in NTFS but Read at the share can only read over the network; the same user signed in locally on the server can modify. When "access works locally but not from the network", check the share permissions.

Since Windows Server 2025, creating a share enables the **File and Printer Sharing (Restrictive)** firewall group, which no longer opens the NetBIOS ports 137 to 139.

<!-- section: fsrm | objectives: 5.2.2 -->
## Configure File Server Resource Manager

FSRM is a role service of File and Storage Services (`Install-WindowsFeature FS-Resource-Manager -IncludeManagementTools`). It works on **NTFS volumes only**, not ReFS.

| Feature | Does | Example |
| --- | --- | --- |
| Quota management | Limits space for a volume or folder, with notification thresholds | 200 MB per home folder, warn at 180 MB |
| File screening management | Controls which file types (by file group) can be saved | Block audio and video files in user shares |
| File Classification Infrastructure | Sets classification properties on files, by folder or by content rules | Mark files containing customer data |
| File management tasks | Act on files selected by location, classification or dates | Expire files not modified for 10 years |
| Storage reports | Report on usage, file groups, owners, duplicates, quota and screening | Weekly report of large files |

**Quotas.** A **hard quota** stops users from saving past the limit; a **soft quota** only sends notifications (monitoring). An **auto apply quota** applies a template to every existing and future subfolder of a path (one quota per user folder). Create quotas from **templates**: updating a template can update every quota derived from it. FSRM quotas apply to a folder or volume for all users, unlike NTFS disk quotas, which are per user per volume.

**File screens.** An **active** screen blocks saving files of the selected **file groups** (patterns such as `*.mp3`); a **passive** screen allows the save but notifies (auditing). A **file screen exception** on a subfolder allows file groups blocked by a screen on a parent folder. Screens don't remove files saved before they existed.

Notifications can send e-mail, write to the event log, run a command or generate a report. E-mail requires the SMTP server set in the FSRM options first.

```powershell
New-FsrmQuota -Path "D:\Shares\Projects" -Size 10GB -Description "Hard limit"
New-FsrmQuota -Path "D:\Shares\Temp" -Size 2GB -SoftLimit
New-FsrmFileScreen -Path "D:\Shares\Users" -IncludeGroup "Audio and Video Files" -Active
New-FsrmFileScreen -Path "D:\Shares\Public" -IncludeGroup "Executable Files" -Active:$false
```

> **Exam trap.** "Notify when users exceed 5 GB but don't stop them" is a soft quota; "log attempts to save executables without blocking" is a passive screen. Hard quota and active screen are the blocking variants.

The command-line tools are `dirquota.exe` (quotas), `filescrn.exe` (screens) and `storrept.exe` (reports).

<!-- section: dfs | objectives: 5.2.3 -->
## Implement and configure DFS

**DFS Namespaces** (`FS-DFS-Namespace`) groups shared folders from several servers under one path. A namespace has a root, folders, and **folder targets** (UNC paths to real shares); clients receive a referral to one target, ordered by AD DS site cost by default.

| Characteristic | Stand-alone | Domain-based, Windows Server 2008 mode |
| --- | --- | --- |
| Path | `\\ServerName\RootName` | `\\contoso.com\RootName` |
| Metadata stored in | Registry of the namespace server | AD DS and each namespace server's cache |
| High availability | Failover cluster | Several namespace servers in the same domain |
| Access-based enumeration | Yes | Yes |
| Requirements | None (AD DS not required) | Forest level Windows Server 2003, domain level Windows Server 2008 |

The older domain-based **Windows 2000 Server mode** doesn't support access-based enumeration and is limited to about 5,000 folders with targets; Windows Server 2008 mode recommends up to 50,000.

```powershell
Install-WindowsFeature FS-DFS-Namespace, RSAT-DFS-Mgmt-Con
New-DfsnRoot -Path "\\contoso.com\Public" -TargetPath "\\FS1\Public" -Type DomainV2
New-DfsnFolder -Path "\\contoso.com\Public\Tools" -TargetPath "\\LDN-FS1\Tools"
New-DfsnFolderTarget -Path "\\contoso.com\Public\Tools" -TargetPath "\\NYC-FS1\Tools"
```

Access-based enumeration on a namespace hides DFS folders from users without permission (`dfsutil property abe enable \\contoso.com\Public`), but it doesn't block access to a known path: only the target's share and NTFS permissions do.

**DFS Replication** (`FS-DFS-Replication`) keeps folders synchronized between members of a **replication group**, multi-master, using **remote differential compression** (RDC) to send only changed blocks (files of 64 KB or more).

- NTFS volumes only (no ReFS, no FAT, no Cluster Shared Volumes).
- **Initial replication**: the **primary member** is authoritative; its files win conflicts with other members. Pre-seed large data with Robocopy to cut initial traffic.
- No distributed file locking: when two users change the same file on two members, the last writer wins and the other version goes to `DfsrPrivate\ConflictandDeleted` (recover with `Restore-DfsrPreservedFiles`).
- A replicated folder can be **read-only** on a member (for example a branch copy).
- Over a firewall, DFS-R needs RPC endpoint mapper (TCP 135) and a dynamic RPC port, which `Set-DfsrMachineConfiguration` can make static.
- Since the Windows Server 2008 domain functional level, DFS-R also replicates **SYSVOL**.

> **Exam trap.** DFS Namespaces gives one path; DFS Replication copies data. Two folder targets without replication show different content depending on the referral. And DFS-R isn't a disaster recovery tool for open files: Storage Replica is.

<!-- section: smb-over-quic | objectives: 5.2.4 -->
## Configure SMB over QUIC

SMB over QUIC carries SMB inside a **TLS 1.3** tunnel on **UDP 443** instead of TCP 445: remote users reach an edge file server over the internet without VPN.

Requirements:

- Server: **any edition of Windows Server 2025**, or Windows Server 2022 Datacenter: Azure Edition. Client: Windows 11 (or Windows Server 2025).
- A certificate from a trusted CA: Server Authentication EKU, a subject, and a **Subject Alternative Name** for each DNS name clients use (no IP address), private key included.
- Firewall: allow UDP 443 inbound; don't open TCP 445 inbound.
- Server and client domain-joined (recommended; workgroup with local accounts and NTLM is possible). The server needs a domain controller; the clients don't.

```powershell
# On the file server (Windows Server 2025: use PowerShell, not Windows Admin Center)
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Subject -Match "fsedge1" }
New-SmbServerCertificateMapping -Name fsedge1.contoso.com -Thumbprint $cert.Thumbprint -StoreName My
# On the client: force QUIC (by default the client tries TCP first, then QUIC)
New-SmbMapping -LocalPath Z: -RemotePath \\fsedge1.contoso.com\sales -TransportType QUIC
```

| Need | Configuration |
| --- | --- |
| Kerberos for external clients instead of NTLMv2 | KDC Proxy on the file server (HTTPS 443) and the GPO *Specify KDC proxy servers for Kerberos clients* |
| Only approved devices may connect | Client access control: `Set-SmbServerCertificateMapping -RequireClientAuthentication $true`, then `Grant-SmbClientAccessToServer` or `Block-SmbClientAccessToServer` (client certificates) |
| Disable QUIC on a server or a client | `Set-SmbServerConfiguration -EnableSMBQUIC $false` / `Set-SmbClientConfiguration -EnableSMBQUIC $false`, or the *Enable SMB over QUIC* policy (Lanman Server or Lanman Workstation) |
| Certificate renewed | Map the new thumbprint again |

> **Exam trap.** SMB over QUIC on Windows Server 2022 requires the **Azure Edition**; on Windows Server 2025 Standard and Datacenter support it. A deny entry in client access control anywhere in the certificate chain wins over an allow entry.

<!-- section: smb-settings | objectives: 5.2.5 -->
## Configure SMB settings and management

Server-side settings use `Set-SmbServerConfiguration`, client-side settings `Set-SmbClientConfiguration`; Group Policy has the same settings under **Network\Lanman Server** and **Network\Lanman Workstation**.

| Requirement | Setting |
| --- | --- |
| Encrypt one share / the whole server | `Set-SmbShare -Name Data -EncryptData $true` / `Set-SmbServerConfiguration -EncryptData $true` |
| Let clients without SMB 3 read an encrypted share during a transition | `Set-SmbServerConfiguration -RejectUnencryptedAccess $false` (default `$true`) |
| A client must encrypt every outbound connection (Windows Server 2025) | `Set-SmbClientConfiguration -RequireEncryption $true` |
| Encrypt one mapping | `New-SmbMapping -RequirePrivacy $true` or `net use /REQUIREPRIVACY` |
| Require signing | `-RequireSecuritySignature $true` on server or client (GPO *Microsoft network server/client: Digitally sign communications (always)*) |
| Accept only SMB 3.1.1 (Windows Server 2025) | `Set-SmbServerConfiguration -Smb2DialectMin SMB311` |
| Block NTLM for outbound SMB (Windows Server 2025) | `Set-SmbClientConfiguration -BlockNTLM $true`, exceptions in the *Block NTLM Server Exception List* policy |
| Slow down password guessing over SMB | Authentication rate limiter: `-InvalidAuthenticationDelayTimeInMs` (default 2000, on by default in Windows Server 2025; 0 disables) |
| Find third-party devices without signing or encryption | `-AuditClientDoesNotSupportSigning` and the related audit settings |
| Connect to a server on a non-default port | `New-SmbMapping -TcpPort` or `-QuicPort` (Windows Server 2025) |

Defaults to know:

- **SMB 1.0** isn't installed by default since Windows Server version 1709; remove it where it remains, because it bypasses SMB 3.1.1 pre-authentication integrity.
- Windows Server 2025 **requires signing for outbound connections** by default. Domain controllers require signing from their clients (SYSVOL, NETLOGON).
- SMB 3.1.1 negotiates **AES-128-GCM** encryption by default; AES-256-GCM and AES-256-CCM are available since Windows Server 2022.
- With encryption required, an SMB 3 client that can't encrypt is rejected with **Access denied** and event 1003 in `Microsoft-Windows-SmbServer/Operational`.
- **SMB Multichannel** uses several network paths automatically and is required for SMB Direct (see the storage chapter).

> **Exam trap.** SMB encryption protects data in transit only. Data at rest is BitLocker's job, and SMB encryption doesn't need EFS or BitLocker.

<!-- section: key-points -->
## Key points

- Over the network, the most restrictive of share and NTFS permissions applies.
- Access-based enumeration hides folders; it doesn't grant or block access.
- FSRM: hard quota and active screen block, soft quota and passive screen only notify; NTFS only.
- DFS Namespaces = one path, DFS Replication = copies with RDC; the primary member wins initial replication.
- SMB over QUIC: UDP 443, TLS 1.3 certificate with SANs, any Windows Server 2025 edition.
- Windows Server 2025: outbound signing required, client-side encryption mandate, NTLM blocking, dialect control, authentication rate limiter.
