The file system decides which features a volume supports, Data Deduplication reclaims space on file servers and VDI hosts, iSCSI Target Server shares block storage over Ethernet, and BitLocker encrypts volumes at rest. Exam questions ask which file system a feature needs, which deduplication usage type fits a workload, how to present a LUN to a cluster, and how to unlock or recover an encrypted volume.

<!-- section: ntfs-refs | objectives: 5.3.8 -->
## Select and configure NTFS and ReFS

**NTFS** is the general-purpose file system and the only choice for many features; **ReFS** (Resilient File System) targets integrity and scale, especially for Hyper-V and Storage Spaces Direct.

| Feature | NTFS | ReFS |
| --- | --- | --- |
| BitLocker, ACLs, Data Deduplication, CSV, failover clustering | Yes | Yes (deduplication since Windows Server 2019) |
| Boot volume, removable media | Yes | No (ReFS boot is only in preview) |
| Shrink a volume | Yes | No |
| Disk quotas, object IDs, transactions, short names | Yes | No |
| File system encryption (EFS) | Yes | Windows Server 2025 only |
| Offloaded Data Transfer (ODX) | Yes | No |
| Block cloning, sparse VDL (fast VHDX creation, checkpoint merge) | No | Yes |
| Integrity streams (checksums), online repair with Storage Spaces copies | No | Yes |
| Mirror-accelerated parity | No | Yes, on Storage Spaces Direct |
| Maximum volume size | 8 PB (Windows Server 2019 and later, 2 MB clusters) | 35 PB |

Features that require **NTFS**: FSRM, DFS Replication, Azure File Sync server endpoints, and SAN volumes that need thin provisioning, TRIM/UNMAP or ODX.

| Workload | File system |
| --- | --- |
| Hyper-V VHDX on Storage Spaces Direct CSVs | ReFS (`CSVFS_ReFS`) |
| General file server with FSRM quotas and DFS-R | NTFS |
| Backup target, archives on Storage Spaces | ReFS |
| CSV on a SAN that must use Direct I/O | NTFS |

NTFS cluster size sets the maximum volume and file size: 4 KB (default) allows 16 TB, 64 KB allows 256 TB, 2048 KB allows 8 PB. ReFS supports 4 KB (recommended) and 64 KB clusters. For deduplicated volumes or volumes holding VHDX files over 1 TB, format NTFS with 64 KB clusters and large file record segments:

```powershell
Format-Volume -DriveLetter F -FileSystem NTFS -AllocationUnitSize 65536 -UseLargeFRS
Format-Volume -DriveLetter G -FileSystem ReFS -SetIntegrityStreams $true
```

> **Exam trap.** "The volume must support FSRM quotas", "must host a DFS-R replicated folder" or "must be reduced in size later" all rule out ReFS. "Fastest VHDX creation and checkpoint merge" points to ReFS.

<!-- section: data-deduplication | objectives: 5.3.5 -->
## Configure Data Deduplication

Data Deduplication (`FS-Data-Deduplication`) finds identical variable-size chunks across the files of a volume, stores each chunk once (optionally compressed) in the **chunk store** under System Volume Information, and replaces the files with reparse points. It is **post-processing**: data is written normally, then optimized by scheduled jobs. It is enabled per volume, on NTFS, or ReFS since Windows Server 2019.

```powershell
Install-WindowsFeature -Name FS-Data-Deduplication
C:\Windows\System32\DDPEval.exe E:\Shares     # estimate savings before enabling
Enable-DedupVolume -Volume E: -UsageType Default
Set-DedupVolume -Volume E: -MinimumFileAgeDays 5
Start-DedupJob -Volume E: -Type Optimization
Get-DedupStatus -Volume E:
```

| Usage type | Workload | Policy |
| --- | --- | --- |
| Default | General file servers: team shares, home folders, Work Folders | Files older than 3 days; no in-use or partial files |
| Hyper-V | VDI servers | Files older than 3 days; optimizes in-use and partial files |
| Backup | Virtualized backup applications such as DPM | Files older than 0 days; optimizes in-use files, not partial files; priority optimization |

| Job | Does | Default schedule |
| --- | --- | --- |
| Optimization | Chunks, compresses and stores data | Every hour |
| Garbage Collection | Frees chunks no longer referenced after deletes or changes | Saturday 2:35 AM |
| Integrity Scrubbing | Detects chunk store corruption and repairs from mirror or parity copies | Saturday 3:35 AM |
| Unoptimization | Undoes deduplication and disables it on the volume | Manual only |

`Disable-DedupVolume` only stops further deduplication: optimized files stay deduplicated and readable, and job cmdlets such as `Start-DedupJob` no longer run on that volume. To rehydrate the files, run the Unoptimization job, which fails if the volume lacks space for the unoptimized data.

Space freed by deleting files appears only after **Garbage Collection** runs. Typical savings: user documents 30 to 50 %, deployment shares 70 to 80 %, virtualization libraries 80 to 95 %.

Interoperability:

- Failover clusters: install the feature on **every node**; run manual jobs on the CSV owner node.
- Storage Replica: supported; don't run deduplication on the destination copy.
- Quotas: **no hard quota on the volume root** of a deduplicated volume (soft quotas and subfolder quotas work; quotas count logical size).
- Not supported: nested virtualization, Windows client, volumes with multiple storage tiers on S2D. Windows Search skips deduplicated files, and Robocopy can corrupt the chunk store.
- Memory: at least 300 MB plus 50 MB per TB of logical data; ideally 1 GB per TB.

> **Exam trap.** A user deletes 2 TB from a deduplicated volume and free space doesn't change: shared chunks are released by Garbage Collection, not at deletion. Run `Start-DedupJob -Type GarbageCollection` instead of disabling deduplication.

Windows Server 2025 also adds **ReFS native deduplication and compression** for active workloads, separate from this feature.

<!-- section: iscsi | objectives: 5.3.9 -->
## Configure and manage iSCSI

**iSCSI Target Server** (role service `FS-iSCSITarget-Server`) turns Windows Server into block storage over Ethernet: it publishes **iSCSI virtual disks** (`.vhdx` files) through **targets**, and each target lists the **initiators** allowed to connect. Uses: shared storage for test or guest clusters, diskless boot, applications that need block storage.

```powershell
# Target server
Install-WindowsFeature FS-iSCSITarget-Server
New-IscsiVirtualDisk -Path E:\iSCSI\LUN1.vhdx -SizeBytes 500GB          # dynamic unless -UseFixed
New-IscsiServerTarget -TargetName ClusterDisks `
  -InitiatorIds "IQN:iqn.1991-05.com.microsoft:node1.contoso.com","IQN:iqn.1991-05.com.microsoft:node2.contoso.com"
Add-IscsiVirtualDiskTargetMapping -TargetName ClusterDisks -Path E:\iSCSI\LUN1.vhdx
# Each initiator
Set-Service -Name MSiSCSI -StartupType Automatic; Start-Service MSiSCSI
New-IscsiTargetPortal -TargetPortalAddress 10.0.10.5
Connect-IscsiTarget -NodeAddress (Get-IscsiTarget).NodeAddress -IsPersistent $true
```

- Initiator IDs use the format `IdType:Value` with `IQN`, `IPAddress`, `IPv6Address`, `DNSName` or `MACAddress`. The initiator IQN is on the **Configuration** tab of the iSCSI Initiator tool.
- **CHAP**: one-way CHAP lets the target authenticate the initiator; mutual CHAP also authenticates the target (`-AuthenticationType ONEWAYCHAP` or `MUTUALCHAP`).
- `-IsPersistent $true` reconnects the session after every restart. After connecting, the disk appears offline: bring it online and initialize it once, from one node.
- **MPIO** for redundant paths: install `Multipath-IO` on the initiator, claim iSCSI devices (`Enable-MSDSMAutomaticClaim -BusType iSCSI`), connect with `-IsMultipathEnabled $true` over each path.

| Limit | Value |
| --- | --- |
| Targets per iSCSI Target Server | 256 |
| Virtual disks per target server / per target | 512 / 256 |
| Sessions per target | 544 |
| MPIO paths | 4 |
| Failover cluster nodes for a clustered target server | 8 |
| VHDX maximum size (fixed, dynamic or differencing) | 64 TB |

> **Exam trap.** A new node can't see the cluster LUN although it connected to the portal: its IQN isn't in the target's initiator list. Add it with `Set-IscsiServerTarget -InitiatorIds` on the target server.

<!-- section: bitlocker | objectives: 5.3.10 -->
## Manage BitLocker Drive Encryption

BitLocker isn't installed by default on Windows Server: install the `BitLocker` feature and restart (`Install-WindowsFeature BitLocker -IncludeAllSubFeature -IncludeManagementTools -Restart`). Encrypted hard drives also need the **Enhanced Storage** feature, which PowerShell doesn't add.

| Protector | Use |
| --- | --- |
| TPM | OS volume unlocks silently if boot components are unchanged |
| TPM + PIN / TPM + startup key | Preboot authentication for the OS volume |
| Password | Data volumes |
| Recovery password (48 digits) / recovery key (`.bek` file) | Recovery |
| AD account or group (SID) | Data volumes and cluster disks; doesn't unlock an OS volume at preboot |
| Network (certificate based) | Network Unlock of the OS volume at restart |

```powershell
Enable-BitLocker -MountPoint C: -EncryptionMethod XtsAes256 -UsedSpaceOnly -TpmProtector
Add-BitLockerKeyProtector -MountPoint C: -RecoveryPasswordProtector
$id = ((Get-BitLockerVolume C:).KeyProtector | Where-Object KeyProtectorType -eq RecoveryPassword).KeyProtectorId
Backup-BitLockerKeyProtector -MountPoint C: -KeyProtectorId $id     # to AD DS
Enable-BitLocker -MountPoint D: -PasswordProtector -Password (Read-Host -AsSecureString)
Enable-BitLockerAutoUnlock -MountPoint D:
Suspend-BitLocker -MountPoint C: -RebootCount 1                     # before a firmware update
```

- `-UsedSpaceOnly` encrypts only used space (fast on new volumes); full encryption also covers free space.
- **Suspend** before firmware or boot changes, then resume: suspension keeps the data encrypted but stops checking protectors. `Disable-BitLocker` decrypts the volume.
- Backup to AD DS: the policies *Choose how BitLocker-protected operating system drives can be recovered* (and the fixed data drive equivalent) can store recovery information in AD DS and refuse to enable BitLocker until it is stored. Recovery data becomes `ms-FVE-RecoveryInformation` child objects of the computer object.
- **Cluster disks and CSV**: put the disk in maintenance mode (`Suspend-ClusterResource`), enable BitLocker with an **AD account protector for the cluster name object** (`-AdAccountOrGroupProtector -AdAccountOrGroup CLUSTER1$`), then resume the resource. NTFS volume with a drive letter for the initial step; requires a Windows Server 2012 or later domain controller.

**Network Unlock** restarts domain-joined servers without typing a PIN when they are on the corporate network: UEFI firmware with DHCP on the first network adapter, TPM plus PIN protectors, a **WDS** server with the **BitLocker Network Unlock** feature (`BitLocker-NetworkUnlock`), a separate DHCP server, a 2048-bit RSA certificate, and the GPO *Allow Network Unlock at startup*. Off the network, the server falls back to the TPM + PIN prompt.

> **Exam trap.** An AD account protector alone can't unlock an operating system volume at startup; the OS volume also needs a TPM-based protector. For servers that must restart unattended with TPM + PIN, the answer is Network Unlock.

<!-- section: bitlocker-recovery | objectives: 5.3.11 -->
## Manage and recover encrypted volumes

A volume enters **recovery mode** when BitLocker can't unlock it normally, for example after a TPM clear or failure, a firmware or boot manager change, a motherboard replacement, too many wrong PINs, booting from DVD or PXE first, or moving the disk to another computer.

| Recovery option | Details |
| --- | --- |
| Recovery password | 48 digits (eight blocks of six); stored in AD DS, Microsoft Entra ID, a file or a printout |
| Recovery key | `.bek` file on removable media |
| Key package | Rebuilds critical parts of a damaged volume with `repair-bde`; stored in AD DS or a file, never in Microsoft Entra ID |
| Data recovery agent | Certificate whose public key protects drives; unlocks a data drive (an OS drive must be attached as a data drive on another computer) |

**Find the recovery password in AD DS.** The recovery screen shows the **password ID**. In Active Directory Users and Computers with the **BitLocker Recovery Password Viewer** (an RSAT extension), open the computer object's **BitLocker Recovery** tab, or right-click the domain and use **Find BitLocker Recovery Password** with the **first eight characters** of the password ID (the search covers the forest). By default only **Domain Admins** can read recovery information; delegate read access for help desk staff.

```powershell
Unlock-BitLocker -MountPoint E: -RecoveryPassword 111111-222222-333333-444444-555555-666666-777777-888888
```

```text
manage-bde -status
manage-bde -unlock E: -RecoveryPassword 111111-222222-333333-444444-555555-666666-777777-888888
manage-bde -protectors -get C:
manage-bde -KeyPackage C: -id {GUID} -path F:\Packages
repair-bde C: D: -rp 111111-222222-333333-444444-555555-666666-777777-888888
repair-bde C: D: -kp F:\RecoveryKeyPackage -rk F:\RecoveryKey.bek -f
```

- `repair-bde` copies the decrypted content of the damaged volume to an **output volume that it overwrites entirely**. With corrupted BitLocker metadata you need the **key package** plus the recovery password or key. It can't repair a drive that failed during encryption or decryption.
- After recovery, find the cause (`manage-bde -status`, event log) and fix it: a forgotten PIN is reset after unlocking; for planned firmware updates, suspend BitLocker beforehand. Unlocking with the recovery password resets the TPM validation measurements to the current configuration.
- Old recovery passwords stay in AD DS until the computer object is deleted. Generate a new recovery password after one has been disclosed (remove the old protector, add a new one, back it up).

> **Exam trap.** The help desk can't see any password on the BitLocker Recovery tab: either recovery information was never backed up to AD DS, or the account lacks delegated read rights. The viewer doesn't distinguish the two cases.

<!-- section: key-points -->
## Key points

- ReFS: block cloning, integrity streams, 35 PB, no shrink, no boot, no FSRM or DFS-R; NTFS for everything else.
- Deduplication: post-processing, usage types Default, Hyper-V, Backup; space returns after Garbage Collection; no hard quota on the volume root.
- iSCSI: virtual disk, target with initiator IDs, mapping; initiator portal, persistent connection, CHAP, MPIO.
- BitLocker: install the feature; TPM-based protectors for OS volumes; back up recovery passwords to AD DS; CNO protector for cluster disks; Network Unlock needs WDS and UEFI DHCP.
- Recovery: password ID, first 8 characters, Domain Admins by default; key package plus `repair-bde` for damaged volumes.
