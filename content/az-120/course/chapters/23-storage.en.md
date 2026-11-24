Storage questions hinge on support: a disk type that isn't supported for a HANA volume, a missing Write Accelerator, the wrong cache setting, a share with the wrong protocol. This chapter gives the support matrix, then striping, caching, Write Accelerator, encryption, Azure NetApp Files and Azure Files.

<!-- section: storage-types | objectives: 2.3.1 -->
## Choosing a storage type

Only four storage types are certified for SAP HANA `/hana/data` and `/hana/log`: **Premium SSD (v1), Premium SSD v2, Ultra Disk and Azure NetApp Files (NFS v4.1)**.

| Usage | Standard SSD | Premium SSD | Premium SSD v2 | Ultra Disk | Azure NetApp Files | Azure Files (SSD) |
| --- | --- | --- | --- | --- | --- | --- |
| OS disk | Non-production only | Recommended | Not possible | Not possible | Not possible | Not possible |
| `/hana/data` | Not supported | Recommended | Recommended | Recommended | Recommended | Not supported |
| `/hana/log` on M family | Not supported | With Write Accelerator | Recommended | Recommended | Recommended | Not supported |
| `/hana/log` on E family | Not supported | Not supported | Recommended | Recommended | Recommended | Not supported |
| `/hana/shared` | Not supported | Recommended | Recommended | Recommended | Recommended | Recommended |
| `/sapmnt` | Non-production only | Recommended | Recommended | Recommended | Recommended | Highly recommended |
| Non-HANA database data and log | Non-production only | Recommended | Recommended | Recommended | Limited (specific DBMS releases) | Not supported |

| Type | Key facts |
| --- | --- |
| Premium SSD | Performance fixed by size tier (P10, P15...); bursting on disks up to 512 GiB; host caching; Write Accelerator on M family |
| Premium SSD v2 | Size, IOPS and throughput set independently; 3,000 IOPS and 125 MB/s included per disk; no host caching, no bursting, not an OS disk; zonal VMs in most regions (availability sets only in a few regions without availability zones, after feature registration); performance changes four times per 24 hours |
| Ultra Disk | Lowest latency; data disks only, created empty; no caching; single VM or availability zones, **not availability sets**; IOPS and throughput adjustable without restart |
| Azure NetApp Files | NFS (and SMB) volumes; under 1 ms; service levels; snapshots; cross-zone and cross-region replication |
| Azure Files (SSD) | NFS v4.1 or SMB shares; LRS or ZRS; for shared SAP file systems, never for database files |
| Standard HDD | Backups and rarely used retired systems only |

Rules that decide answers:

- New SAP VMs use **managed disks**; zonal deployments require them.
- Database data and log files use **LRS** only: Azure block storage already keeps three copies, so no RAID redundancy is needed.
- In HANA System Replication, both replicas use the same storage type for `/hana/data` and the same for `/hana/log`. Mixing types across volumes on one system is supported (for example, data on Premium SSD v2 and log on Ultra Disk).

> **Exam trap.** "Lowest latency for `/hana/log` in an availability set" can't be Ultra Disk: Ultra Disk doesn't support availability sets.

<!-- section: striping | objectives: 2.3.2 -->
## Disk striping and simple volumes

Striping several disks with LVM (or mdadm) adds their IOPS and throughput: three P30 disks give three times the IOPS and throughput of one P30.

| Situation | Choice |
| --- | --- |
| Premium SSD v1 for `/hana/data` or `/hana/log` | **Stripe**: several smaller disks often give the best price/performance (two P15 striped reach 250 MiB/s; one disk needs a P40) |
| Premium SSD v2 or Ultra Disk | **Simple volume** is enough because IOPS and throughput are provisioned per disk; striping Premium SSD v2 is an option to use the included 3,000 IOPS and 125 MB/s of each disk |
| NFS or SMB shares (Azure NetApp Files, Azure Files) | Can't be striped; use HANA data volume partitioning (HANA 2.0 SPS03 or later) across several volumes for more throughput |
| `/hana/shared`, `/usr/sap`, OS | Simple volume |

Stripe rules: stripe size **256 KB for `/hana/data`** and **64 KB for `/hana/log`**; all disks in a stripe set have the same size (and the same IOPS and throughput for Premium SSD v2 and Ultra Disk); separate volume groups for data, log and shared, never the root volume group; no RAID 1 or RAID 5.

```bash
sudo pvcreate /dev/disk/azure/scsi1/lun0 /dev/disk/azure/scsi1/lun1 /dev/disk/azure/scsi1/lun2
sudo vgcreate vg_hana_data_HN1 /dev/disk/azure/scsi1/lun0 /dev/disk/azure/scsi1/lun1 /dev/disk/azure/scsi1/lun2
sudo lvcreate --stripes 3 --stripesize 256 --extents 100%FREE --name hana_data vg_hana_data_HN1
sudo mkfs.xfs /dev/vg_hana_data_HN1/hana_data
```

<!-- section: storage-security | objectives: 2.3.3 -->
## Storage security considerations

- **Network isolation**: private endpoints for Azure Files and Blob Storage, public network access disabled; Azure NetApp Files volumes are reachable only from the delegated subnet's virtual network and peered networks.
- **NFS authorization is network-based**: NFS Azure file shares have no identity-based authentication, so access is limited by private endpoint or virtual network rules. Azure NetApp Files uses **export policies** (allowed client IPs, read-write or read-only, root access).
- **UID and GID**: the `<sid>adm` user and `sapsys` group IDs must match on every VM that mounts the NFS volumes, or files show as `nobody`.
- **SMB shares for Windows**: join the storage account to AD DS, give SAP accounts the **Storage File Data SMB Share Elevated Contributor** role, and set NTFS ACLs (`<sid>adm`, `SAPService<SID>`, `SAP_<SID>_GlobalAdmin`, cluster computer account) **before** running SAPinst.

<!-- section: data-protection | objectives: 2.3.4 -->
## Data protection

| Mechanism | What it protects | Notes |
| --- | --- | --- |
| Azure Backup for SAP HANA | HANA databases, streamed through Backint | Backint certified; minimum RPO 15 minutes; requires running the pre-registration script on the HANA VM |
| Azure Backup HANA instance snapshots | HANA data disks, HANA-consistent | Instant backup and restore; snapshots stay on Standard HDD storage, not in the vault |
| Azure VM backup | Whole VM (application servers, central services) | Backs up Write Accelerator data disks (no snapshot of a Write Accelerator OS disk); Ultra Disk and Premium SSD v2 need the Enhanced policy; shared disks aren't supported |
| Managed disk incremental snapshots | Individual disks | Stored on Standard HDD, ZRS where available; up to 500 per disk; Premium SSD v2 and Ultra Disk snapshots usable only after the background copy completes, unless instant access is enabled when the snapshot is created; at most three in-progress snapshots per disk |
| Azure NetApp Files snapshots | Volumes | Space-efficient; application-consistent for HANA with **AzAcSnap** (or SnapCenter) |

Application-consistent HANA snapshot on Azure NetApp Files:

```text
BACKUP DATA FOR FULL SYSTEM CREATE SNAPSHOT COMMENT 'SNAPSHOT-2026-11-17:02:00';
az netappfiles snapshot create -g RG-SAP-PRD --account-name anf-prd --pool-name pool-ultra --volume-name hn1-data --name snap-20261117
BACKUP DATA FOR FULL SYSTEM CLOSE SNAPSHOT BACKUP_ID <backup id> SUCCESSFUL 'SNAPSHOT-2026-11-17:02:00';
```

The storage snapshot is taken on `/hana/data` only. Closing the HANA snapshot is mandatory: an open HANA snapshot keeps growing memory demand and can halt HANA.

> **Exam trap.** A snapshot on the same volume isn't a protected backup. Copy at least one snapshot per day to another location (another environment, another Azure region, or Blob Storage).

<!-- section: disk-caching | objectives: 2.3.5 -->
## Caching for disks

Host caching exists only on Premium SSD (v1) and Standard disks; Premium SSD v2 and Ultra Disk have none.

| Volume | Cache setting |
| --- | --- |
| OS disk | Keep the default set by Azure at creation (ReadWrite) |
| `/hana/data` | None or ReadOnly |
| `/hana/log` | **None**; on M family VMs, None + Write Accelerator (mandatory) |
| `/hana/shared` | ReadOnly |
| SQL Server data files | ReadOnly |
| SQL Server log file | None |
| SQL Server tempdb on a data disk | None (or place it on the temporary D: drive) |
| Stripe set holding both data and log (cost-conscious systems) | None |

- **No SAP database volume uses ReadWrite** caching.
- On some M(b)v3 sizes, read-cached Premium SSD can give lower IOPS and throughput than uncached disks.

> **Exam trap.** Write Accelerator is set together with caching: the allowed combinations are None + Write Accelerator and ReadOnly + Write Accelerator. ReadWrite + Write Accelerator doesn't exist.

<!-- section: write-accelerator | objectives: 2.3.6 -->
## Configuring Write Accelerator

Write Accelerator lowers write latency for transaction logs on **M family VMs** with **Premium SSD managed disks**.

- Use it **only for log volumes** (`/hana/log`, SQL Server log, Oracle redo, Db2 log), not for data volumes. For HANA on M family with Premium SSD, it's **mandatory** on `/hana/log`: HANA certification of M family VMs assumes it.
- Not available on Premium SSD v2 or Ultra Disk (they don't need it) and not on non-M families.
- Caching must be None or ReadOnly.
- Only I/O of 64 KiB or less takes the accelerated path.
- The number of Write Accelerator disks and their IOPS are limited **per VM** (shared by all accelerated disks):

| VM size | Max Write Accelerator disks | Write Accelerator IOPS per VM |
| --- | --- | --- |
| M32ms, M32ls, M32ts | 4 | 5,000 |
| M64ms, M64s, M64ds_v2 | 8 | 10,000 |
| M128ms, M128s, M416ms_v2 | 16 | 20,000 |
| Standard_M48ds_1_v3 | 4 | 5,000 |
| Standard_M176ds_4_v3 | 16 | 20,000 |

```bash
# Existing disk at LUN 1
az vm update --resource-group RG-SAP-PRD --name hdbprd01 --write-accelerator 1=true
# Attach an existing disk with Write Accelerator
az vm disk attach --resource-group RG-SAP-PRD --vm-name hdbprd01 --name hdbprd01-log2 --enable-write-accelerator
```

```powershell
$vm = Get-AzVM -ResourceGroupName RG-SAP-PRD -Name hdbprd01
Set-AzVMDataDisk -VM $vm -Name hdbprd01-log1 -Caching None -WriteAccelerator:$true
Update-AzVM -ResourceGroupName RG-SAP-PRD -VM $vm
```

Order of operations: stop the database using the disk; for a volume striped over several disks, **shut down the VM** and enable Write Accelerator on **every** disk of the volume. Enabling it on the OS disk reboots the VM (and isn't needed for SAP).

<!-- section: encryption | objectives: 2.3.7 -->
## Encryption for storage, disks and data

| Option | What it encrypts | Keys |
| --- | --- | --- |
| Server-side encryption (SSE) | Managed disk data at rest on the storage clusters; always on | Platform-managed, or customer-managed through a **disk encryption set** (Key Vault or Managed HSM) |
| Encryption at host | Adds temporary disks and disk caches, and encrypts data flowing to storage | Same as SSE (temporary disks: platform-managed keys only) |
| Azure Disk Encryption (ADE) | OS and data disks inside the VM (DM-Crypt, BitLocker) | Key Vault, optional key encryption key; uses VM CPU |
| Confidential disk encryption | OS disk bound to the VM's TPM | Confidential VM sizes |
| Database encryption | HANA data and log volume encryption, SQL Server TDE (supported by SAP), Oracle TDE | Managed by the DBMS |
| Azure Files and Azure NetApp Files | Encrypted at rest; customer-managed keys supported | Encryption in transit: SMB 3 encryption, or TLS for NFS through the AZNFS mount helper |

- **ADE retires on September 15, 2028**: after that date, ADE-encrypted disks fail to unlock at reboot. Migrate to **encryption at host**, which is Microsoft's recommendation for new VMs.
- Migration from ADE to encryption at host isn't in place: it needs new disks and new VMs, and ADE can't be disabled on a Linux OS disk.
- ADE uses VM CPU and doesn't work with custom Linux images; SSE and encryption at host have neither limit.

> **Exam tip.** "Encrypt the temporary disk and the cache of an SAP VM without CPU overhead" points to encryption at host, not ADE.

<!-- section: azure-netapp-files | objectives: 2.3.8 -->
## Volumes with Azure NetApp Files

Hierarchy: **NetApp account** (per region) → **capacity pool** (service level, 1 TiB minimum, grows by 1 TiB) → **volumes** (NFS v3, NFS v4.1 or SMB).

| Service level | Throughput per TiB with automatic QoS |
| --- | --- |
| Standard | 16 MiB/s |
| Premium | 64 MiB/s |
| Ultra | 128 MiB/s |

With **manual QoS**, throughput is assigned per volume independently of its size, within the pool's total: a large data volume and a small, fast log volume can share one pool without oversizing.

| HANA volume | Minimum KPI | Size on Premium | Size on Ultra | NFS |
| --- | --- | --- | --- | --- |
| `/hana/log` | 250 MB/s write | 4 TiB | 2 TiB | v4.1 |
| `/hana/data` | 400 MB/s read, 250 MB/s write | 6.3 TiB | 3.2 TiB | v4.1 |
| `/hana/shared` (scale-up) | | Min(1 TB, 1 x RAM) | Min(1 TB, 1 x RAM) | v3 or v4.1 |

Design rules:

- **NFS v4.1 is mandatory** for `/hana/data` and `/hana/log`; v3 is allowed only for shared and backup volumes.
- Same region and same or peered virtual network; delegated subnet (`/25` recommended).
- Latency from the database VM must stay **below 1 ms**: place volumes in the **same availability zone** as the VM (enough in most regions), or use the **application volume group for SAP HANA**, which places data and log volumes on different storage controllers. With a proximity placement group, the application volume group needs a Microsoft request to pin the availability set to hardware, which limits later VM size and family changes: keep that method for systems that need the lowest latency.
- One NFS session writes 1.2 to 1.4 GB/s; `nconnect` adds sessions.
- Volumes resize online, without unmounting or stopping HANA.
- HANA scale-out with **standby nodes** requires Azure NetApp Files.
- ANF traffic uses the VM's **network** bandwidth, not its storage bandwidth.

```text
10.3.1.4:/hn1-data-mnt00001 /hana/data/HN1/mnt00001 nfs rw,nfsvers=4.1,hard,timeo=600,rsize=262144,wsize=262144,noatime,lock,_netdev,sec=sys 0 0
```

<!-- section: azure-files | objectives: 2.3.9 -->
## Volumes with Azure Files

Azure Files serves the **shared SAP file systems**, never database files.

| | NFS shares | SMB shares |
| --- | --- | --- |
| Clients | Linux only (NFS isn't supported for Windows) | Windows |
| SAP use | `/sapmnt/<SID>`, `/usr/sap/trans`, `/usr/sap/<SID>/SYS`, ASCS/ERS directories, `/hana/shared` | `sapmnt` share for ASCS/SCS on a Windows failover cluster, transport directory |
| Account | SSD (premium) file shares; FileStorage account for classic shares | Premium for production, Standard enough for non-production |
| Redundancy | LRS or ZRS (no GRS) | LRS or ZRS |
| Authentication | Network only (private endpoint or virtual network rules) | Storage account joined to AD DS, RBAC role and NTFS ACLs |
| Size | 100 GiB minimum; performance scales with provisioned size | 256 GiB per SID as a starting size |

NFS rules for SAP:

- Choose **ZRS** when the VMs are spread across zones: data is replicated synchronously across three zones, and NFS clients move to a healthy zone without remounting.
- Select **No root squash**, use a **private endpoint**, and either use encryption in transit with the AZNFS mount helper (`fstype aznfs`) or, to mount without TLS, disable **Require Encryption in Transit for NFS** on the storage account. That setting is enabled by default on accounts created in the portal; while it's not selected, **Secure transfer required** controls NFS, and a non-TLS mount times out if it's on.
- One `sapmnt` share per SAP system, no other use for `sapmnt` and `saptrans`, at most about five SAP systems per storage account, production and non-production in different accounts.
- `/usr/sap/<SID>/J<nr>` of SAP Java systems isn't supported on NFS Azure Files.
- Azure Files has no automatic cross-region replication.

```text
sapnfs.file.core.windows.net:/sapnfs/sapnw1/sapmntNW1 /sapmnt/NW1 nfs noresvport,vers=4,minorversion=1,sec=sys 0 0
```

SMB rules for SAP (Windows): run the Azure Files script that joins the storage account to AD DS, assign **Storage File Data SMB Share Elevated Contributor** to `<sid>adm`, `SAPService<SID>` and `SAP_<SID>_GlobalAdmin`, set full-control ACLs on `sapmnt` before SAPinst, and use SAP kernel 7.22 or later with a recent SWPM. Put `sapmnt` and the transport directory in different storage accounts, except for small systems.

| Requirement | Answer |
| --- | --- |
| Shared `/sapmnt` for a zonal Linux ASCS/ERS cluster, managed, no NFS server VMs | NFS Azure Files on ZRS |
| `/hana/data` or `/hana/log` on a file service | Azure NetApp Files (NFS v4.1) |
| HANA scale-out with standby node | Azure NetApp Files |
| File share for a Windows ASCS/SCS cluster | SMB Azure Files (or Azure NetApp Files SMB) |

> **Exam trap.** Azure Files ZRS is synchronous across zones, but it doesn't replicate to another region: cross-region disaster recovery of `sapmnt` needs another mechanism. Learn lists custom replication (such as rsync) for NFS on Azure Files, and cross-region replication for Azure NetApp Files.

<!-- section: key-points -->
## Key points

- HANA data and log: Premium SSD, Premium SSD v2, Ultra Disk or Azure NetApp Files NFS v4.1 only; Azure Files never.
- E family HANA can't put `/hana/log` on Premium SSD v1; Ultra Disk doesn't support availability sets; Premium SSD v2 and Ultra Disk have no caching and no Write Accelerator.
- Stripe Premium SSD v1 with LVM (256 KB data, 64 KB log); simple volumes on Premium SSD v2 and Ultra Disk; shares can't be striped.
- Caching: data None or ReadOnly, log None, shared ReadOnly, never ReadWrite for databases.
- Write Accelerator: M family, Premium SSD, log volumes only, None or ReadOnly cache, per-VM disk and IOPS limits, all disks of a striped volume.
- Encryption at host replaces ADE (retiring September 15, 2028).
- Azure NetApp Files: service level × size = throughput (or manual QoS), same zone for under 1 ms, application volume group for HANA.
- Azure Files: NFS for Linux shared file systems, SMB for Windows; ZRS across zones; private endpoints.
