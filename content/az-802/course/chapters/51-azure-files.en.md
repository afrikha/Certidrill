Azure Files provides SMB file shares in Azure, and Azure File Sync turns a Windows file server into a cache of such a share. Exam questions ask which account and share to create, how to give AD DS users access, how to build a sync topology, and how to move a file server or a DFS Replication deployment to Azure.

<!-- section: azure-file-shares | objectives: 5.1.1 -->
## Create and manage Azure file shares

Azure Files now has two management models:

| Model | Resource provider | Protocols | Notes |
| --- | --- | --- | --- |
| Classic file share | `Microsoft.Storage` (in a storage account) | SMB and NFS | SSD or HDD; supports Azure File Sync and identity-based access |
| File share | `Microsoft.FileShares` (no storage account) | NFS only | SSD, provisioned v2, LRS or ZRS; no Azure File Sync |

Windows Server scenarios therefore use a **classic file share in a storage account**, whose kind and SKU decide billing, media tier and redundancy:

| Media tier and billing | Account kind | SKUs |
| --- | --- | --- |
| SSD or HDD, provisioned v2 (recommended for new deployments) | `FileStorage` | `PremiumV2_LRS`, `PremiumV2_ZRS`, `StandardV2_LRS`, `StandardV2_ZRS`, `StandardV2_GRS`, `StandardV2_GZRS` |
| SSD, provisioned v1 | `FileStorage` | `Premium_LRS`, `Premium_ZRS` |
| HDD, pay-as-you-go | `StorageV2` | `Standard_LRS`, `Standard_ZRS`, `Standard_GRS`, `Standard_GZRS` |

- **Provisioned v2**: storage (32 GiB to 256 TiB), IOPS and throughput are provisioned and billed separately; 50 classic shares per account.
- **Provisioned v1**: storage only (100 GiB to 100 TiB); IOPS and throughput follow the size.
- **Pay-as-you-go**: used storage plus transactions; access tier *transaction optimized* (default), *hot* or *cool*; up to 100 TiB per share.
- Geo-redundancy exists only on HDD. The account is a trust boundary: network rules and the identity source apply to all its shares.

```powershell
# SSD provisioned v2 account, then a 1 TiB SMB share (recommended IOPS and throughput)
New-AzStorageAccount -ResourceGroupName RG-Files -Name contosofiles01 -Location westeurope `
  -Kind FileStorage -SkuName PremiumV2_ZRS -EnableHttpsTrafficOnly $true -MinimumTlsVersion TLS1_2
New-AzRmStorageShare -ResourceGroupName RG-Files -StorageAccountName contosofiles01 `
  -Name projects -QuotaGiB 1024 -EnabledProtocol SMB
```

**Mounting from Windows.** SMB uses **TCP 445**. Test it, then mount with an identity or with the account key (user `localhost\<storage-account-name>`):

```powershell
Test-NetConnection -ComputerName contosofiles01.file.core.windows.net -Port 445
net use Z: \\contosofiles01.file.core.windows.net\projects
```

> **Exam trap.** If an ISP or firewall blocks TCP 445, the mount fails from on-premises however the share is configured. Use a VPN or ExpressRoute (usually with a private endpoint), or an Azure File Sync server in between.

**Protection settings** (file service of the account):

| Feature | What it protects | Facts |
| --- | --- | --- |
| Soft delete | Deletion of a share | On by default, 7 days; 1 to 365 days |
| Share snapshots | Changed or deleted files | Read-only, incremental, 200 per share; **Previous Versions** in Windows. Deleted with the share |
| Require Encryption in Transit for SMB | Unencrypted SMB | Selected by default in the portal |
| Storage account key access | Key-based access | Must stay enabled for Azure File Sync |

<!-- section: share-permissions | objectives: 5.1.2 -->
## Manage permissions for Azure file shares

Access has three layers: **authentication** by an identity source, **share-level permissions** (Azure RBAC) and **Windows ACLs** (NTFS permissions). One identity source per storage account:

| Identity source | Use when | Requirements |
| --- | --- | --- |
| On-premises AD DS | Existing AD DS, clients can reach domain controllers | Storage account joined to AD DS; identities synced to Microsoft Entra ID for user- or group-specific share permissions |
| Microsoft Entra Domain Services | Managed domain in Azure | Clients joined to the managed domain |
| Microsoft Entra Kerberos | Microsoft Entra joined or hybrid joined clients without domain controller line of sight | Hybrid identities synced from AD DS, or cloud-only identities |

**Join the account to AD DS** with `Join-AzStorageAccount` (AzFilesHybrid module, Windows PowerShell 5.1, domain-joined machine). It creates a computer account (default) or service logon account with the SPN `cifs/<storage-account-name>.file.core.windows.net` and AES-256 Kerberos. You need rights to create it in the OU, Contributor on the account and Reader on its resource group. Rotate its password before the maximum password age if the OU enforces expiration.

```powershell
Import-Module -Name AzFilesHybrid
Join-AzStorageAccount -ResourceGroupName RG-Files -StorageAccountName contosofiles01 `
  -SamAccountName contosofiles01 -DomainAccountType ComputerAccount `
  -OrganizationalUnitDistinguishedName "OU=StorageAccounts,DC=contoso,DC=com"
Debug-AzStorageAccountAuth -StorageAccountName contosofiles01 -ResourceGroupName RG-Files -Verbose
```

**Share-level permissions** are Azure role assignments on the share (scope `.../fileServices/default/fileshares/<share-name>`) to Microsoft Entra users or groups:

| Role | Grants |
| --- | --- |
| Storage File Data SMB Share Reader | Read |
| Storage File Data SMB Share Contributor | Read, write, delete |
| Storage File Data SMB Share Elevated Contributor | Read, write, delete, modify ACLs (like the *Change* share permission) |
| Storage File Data SMB Admin | Admin access over SMB, including take ownership of any file |
| Storage File Data Privileged Reader / Privileged Contributor | Read / read-write-modify ACLs, overriding existing ACLs |

A **default share-level permission** (`Set-AzStorageAccount -DefaultSharePermission StorageFileDataSmbShareContributor`) gives one role to every authenticated identity on every share of the account: use it for identities not synced to Microsoft Entra ID (computer accounts, gMSAs), for AD DS synced to another tenant, or to let only ACLs decide. It starts at **None**. With both, the higher permission applies. Changes take up to about 30 minutes.

> **Exam trap.** Share-level roles are assigned to the **Microsoft Entra** identity of a synced user or group. A user or a computer account that exists only in AD DS can't receive an RBAC role: give it access with the default share-level permission.

**Windows ACLs.** Share level and ACL combine and the **most restrictive** wins: Contributor plus a Read ACL gives Read. To edit ACLs, mount with `net use` from a machine that reaches a domain controller, as a holder of **Storage File Data SMB Admin** (recommended) or with the account key, then use File Explorer or `icacls`.

> **Exam tip.** Order of configuration: enable the identity source, assign share-level permissions, configure Windows ACLs, then configure networking and DNS, and mount.

<!-- section: azure-file-sync | objectives: 5.1.3 -->
## Configure and manage Azure File Sync

| Component | Role | Limits |
| --- | --- | --- |
| Storage Sync Service | Azure resource that trusts registered servers | A server registers with **one** service only; servers of different services can't sync together; 100 registered servers per service |
| Sync group | One sync topology | Exactly **one cloud endpoint**; up to 100 server endpoints |
| Cloud endpoint | Pointer to a classic SMB Azure file share | Storage account in the **same region** as the Storage Sync Service |
| Server endpoint | A path (volume root, folder or mount point) on a registered server | One server endpoint per server in a given sync group; 30 per server; local NTFS volume only, no NAS or mapped share |

Prerequisites: Windows Server 2016 to 2025 (Full or Core), .NET Framework 4.7.2, 2 GiB of memory, a local **NTFS** volume (not ReFS), and on a cluster the **File Server for general use** role with clustered disks (not Scale-Out File Server or CSV) and the agent on every node. The account must allow SMB 3.1.1, NTLMv2 and AES-128-GCM. The administrator needs Azure File Sync Administrator, Owner or Contributor on the service, plus `listKeys` on the account (Reader and Data Access or Storage Account Contributor).

Deployment order:

1. Create the storage account and classic SMB share, then the **Storage Sync Service** in the same region.
2. On the server, disable IE Enhanced Security Configuration, then install the agent (MSI, or the **Azure File Sync Agent for Windows** extension on an Azure Arc-enabled server).
3. **Register** the server (`ServerRegistration.exe` or `Register-AzStorageSyncServer`, run on the server itself).
4. Create the **sync group** with its **cloud endpoint**.
5. Add **server endpoints**, with or without cloud tiering.

```powershell
$sss = New-AzStorageSyncService -ResourceGroupName RG-Files -Name sss-contoso -Location westeurope
$server = Register-AzStorageSyncServer -ParentObject $sss
$account = Get-AzStorageAccount -ResourceGroupName RG-Files -Name contosofiles01
$group = New-AzStorageSyncGroup -ParentObject $sss -Name projects
New-AzStorageSyncCloudEndpoint -Name projects -ParentObject $group `
  -StorageAccountResourceId $account.Id -AzureFileShareName projects
New-AzStorageSyncServerEndpoint -Name FS1 -SyncGroup $group -ServerResourceId $server.ResourceId `
  -ServerLocalPath "D:\Projects" -CloudTiering -VolumeFreeSpacePercent 20
```

**Cloud tiering** keeps the namespace locally and leaves only a reparse point for cool files; opening one recalls it.

| Policy | Effect |
| --- | --- |
| Volume free space | Keep at least X % of the **volume** free; applies per volume, so set the same value on every server endpoint of a volume |
| Date | Tier files not read or written for X days |

No cloud tiering on the **system volume**. The first server endpoint *merges* with the share by default (*server authoritative* after pre-seeding); later ones download the namespace first, the namespace only, or avoid tiered files.

| Need | Use |
| --- | --- |
| Changes made directly in the Azure file share appear late (detection runs every 24 hours) | `Invoke-AzStorageSyncChangeDetection` |
| Branch server must have new and changed files before users arrive | Proactive recall: `-LocalCacheMode DownloadNewAndModifiedFiles` |
| Recall files before disabling tiering or for performance | `Invoke-StorageSyncFileRecall -Path D:\Projects` |
| Users restore earlier versions on a tiered volume | `Enable-StorageSyncSelfServiceRestore` on each volume with a tiering server endpoint |

> **Exam trap.** A sync group has exactly one cloud endpoint and at most one server endpoint per registered server. Two folders of the same server that must both sync go into two sync groups, each with its own Azure file share.

<!-- section: monitor-file-sync | objectives: 5.1.4 -->
## Monitor Azure File Sync

The **Storage Sync Service** shows registered server health and, per server endpoint, sync errors, sync activity, tiering savings and recall errors. Metrics reach Azure Monitor every 15 minutes. A server in **Appears Offline** state isn't reaching the service: check that **AzureStorageSyncMonitor.exe** runs. **Set up recommended alerts** creates these rules:

| Scenario | Metric |
| --- | --- |
| Server endpoint shows an error | Sync session result |
| Files fail to sync | Files not syncing |
| Server doesn't communicate with the service | Server online status |
| Server endpoint in low disk space mode | Cloud tiering low disk space mode |
| More than 500 GiB recalled in a day | Cloud tiering recall size |
| Agent version approaching expiration | Agent version expiration information |

On the server, the Telemetry log is in Event Viewer under `Applications and Services\Microsoft\FileSync\Agent`:

| Event ID | Meaning |
| --- | --- |
| 9102 | Sync session completed: `HResult = 0` is success, `PerItemErrorCount` counts failed files |
| 9121 | One per-item error |
| 9302 | Progress of an active session |
| 9301 | Server polling the service every 30 seconds |
| 9003 / 9006 | Tiering errors / recall errors |

Performance Monitor has the **AFS Bytes Transferred** and **AFS Sync Operations** objects.

<!-- section: migrate-dfsr | objectives: 5.1.5 -->
## Migrate DFS Replication to Azure File Sync

Azure File Sync replaces DFS Replication (DFS-R) in most cases: the full copy lives in the share, servers keep a cache, and DFS Namespaces keeps working in front of them.

Migration order:

1. Create a sync group that represents the DFS-R topology.
2. On the server that holds the **full data set**, install the agent, register the server and create a server endpoint **without cloud tiering**.
3. Let all data upload to the cloud endpoint.
4. Install and register the agent on each remaining DFS-R server.
5. **Disable DFS-R**.
6. Create a server endpoint on each remaining server, still without cloud tiering.
7. Check that sync completes, then retire DFS-R.
8. Enable cloud tiering where needed.

Keep both side by side only when some servers can't reach the internet or branches consolidate onto a hub: then no cloud tiering on DFS-R volumes, no server endpoint on a read-only replicated folder, and one server endpoint at most overlapping a DFS-R location.

> **Exam trap.** Creating server endpoints on the other members before disabling DFS-R, or enabling tiering during the migration, lets two engines change the same files. Tiering comes last.

<!-- section: migrate-shares | objectives: 5.1.6 -->
## Migrate file shares to Azure Files

Choose the target, **cloud only** or **hybrid** (Azure File Sync cache), then the tool:

| Source | Hybrid target | Cloud-only target |
| --- | --- | --- |
| Windows Server 2016 or later | Install Azure File Sync on the server (optionally Azure Data Box for the bulk) | Azure File Sync then remove the server endpoint, Robocopy to the mounted share, or Azure Storage Mover |
| Windows Server 2012 R2 or earlier | New Windows Server 2016 or later server with Azure File Sync, copy with Robocopy; or Storage Migration Service to Windows Server 2019 or later, then Azure File Sync | Azure Storage Mover, or Robocopy to the mounted share |
| NAS | Azure Storage Mover upload or Data Box, then Azure File Sync | Azure Storage Mover, Data Box, or Robocopy to the mounted share |

| Tool | File fidelity |
| --- | --- |
| Azure File Sync, Robocopy, Azure Storage Mover, Azure Data Box | Full (ACLs, timestamps, attributes) |
| AzCopy | Some fidelity can be lost (REST API); up to 10 million files per sync job |
| Azure Storage Explorer | Loses most fidelity, such as ACLs |
| Azure Data Factory | Doesn't copy metadata |

- Set the **root ACL** of the share before copying many files; changing it afterwards propagates slowly.
- Migrate into the **transaction optimized** tier, then move to a cooler tier.
- Rerun Robocopy with `/MIR`: later passes copy only changes, so the cut-over is short.
- Keep user paths with **DFS Namespaces** pointing to the new location.
- To pre-seed a share for Azure File Sync, mount it with the **account key** and freeze changes until reconciliation ends.

```text
robocopy <SourcePath> <Dest.Path> /MT:20 /R:2 /W:1 /B /MIR /IT /COPY:DATSO /DCOPY:DAT /NP /NFL /NDL /XD "System Volume Information" /UNILOG:<FilePathAndName>
```

`/COPY:DATSO` copies data, attributes, timestamps, ACLs and owner; `/B` reads in backup mode; `/MIR` also deletes at the target what left the source.

<!-- section: key-points -->
## Key points

- Windows Server and Azure File Sync scenarios use classic SMB shares in a storage account; `Microsoft.FileShares` is NFS only.
- Provisioned v2 is recommended; SSD offers LRS and ZRS only; SMB needs TCP 445.
- Access = identity source + share-level RBAC role (or default share-level permission) + Windows ACLs; the most restrictive wins.
- One Storage Sync Service per server, one cloud endpoint per sync group, same region, NTFS only, no tiering on the system volume.
- Direct changes in the share are detected every 24 hours unless you run `Invoke-AzStorageSyncChangeDetection`.
- DFS-R migration: full-data server first, no tiering, disable DFS-R before adding the other servers, tiering last.
