Windows Server builds its own storage stack: disks and volumes, Storage Spaces on one server, Storage Spaces Direct across a cluster, Storage Replica between sites, SMB Direct for fast networks and Storage QoS for Hyper-V. Exam questions give a number of disks or servers and a failure to survive, and ask which resiliency, which command or which replication scenario fits.

<!-- section: disks-volumes | objectives: 5.3.1 -->
## Configure disks and volumes

A new disk is **offline or not initialized**: bring it online, initialize it with a partition style, then create and format a volume.

| Partition style | Use |
| --- | --- |
| GPT (default in Disk Management) | Disks and volumes larger than 2 TB, UEFI boot; required by Storage Replica for data and log disks |
| MBR | Older systems, BIOS boot, removable media |

```powershell
Get-Disk | Where-Object PartitionStyle -eq RAW
Set-Disk -Number 2 -IsOffline $false
Initialize-Disk -Number 2 -PartitionStyle GPT
New-Partition -DiskNumber 2 -UseMaximumSize -DriveLetter E |
  Format-Volume -FileSystem NTFS -NewFileSystemLabel Data
```

Rules for resizing:

- **Extend** a volume only into unallocated space **immediately after it on the same disk**, and only if it is NTFS or ReFS (`Resize-Partition -DriveLetter E -Size (Get-PartitionSupportedSize -DriveLetter E).SizeMax`).
- **Shrink** only NTFS or raw basic volumes, never ReFS. Unmovable files (page file, shadow copy storage) limit the shrink; event 259 names the blocking file. `diskpart`: `select volume 3`, then `shrink desired=10240`.
- A volume can be mounted in an empty NTFS folder instead of a drive letter.

**Virtual hard disks.** Disk Management (Action > Create VHD / Attach VHD) or Hyper-V cmdlets create `.vhd` or `.vhdx` (recommended) files, **fixed size** or **dynamically expanding**. An attached VHDX behaves like a physical disk; detaching it keeps the file and its data.

```powershell
New-VHD -Path D:\VHD\Data1.vhdx -SizeBytes 200GB -Dynamic
Mount-VHD -Path D:\VHD\Data1.vhdx
```

<!-- section: storage-spaces | objectives: 5.3.2 -->
## Configure and manage Storage Spaces

Storage Spaces groups physical disks into a **storage pool**, carves **virtual disks** (storage spaces) from the pool with a resiliency type, and you create volumes on them. Available disks appear first in the **primordial pool**.

Disk prerequisites: SAS, SATA, NVMe (USB possible but not recommended); at least **4 GB**, blank and unformatted; HBAs in non-RAID pass-through mode. iSCSI or Fibre Channel disks support only non-resilient (simple) spaces.

| Resiliency | Copies or parity | Minimum disks | Tolerates | Use |
| --- | --- | --- | --- | --- |
| Simple | Stripe, no redundancy | 1 | Nothing | Temporary or easily recreated data |
| Two-way mirror | 2 copies | 2 | 1 disk | Most workloads, file shares, VHD libraries |
| Three-way mirror | 3 copies | 5 | 2 disks | Critical data needing two failures |
| Parity | Data plus parity (journaled) | 3 | 1 disk | Archives, backups, sequential workloads |

- **Provisioning**: **fixed** takes the full size from the pool at creation; **thin** allocates on demand and allows over-allocation, so monitor pool free space. Both can coexist in one pool.
- A resilient virtual disk uses more pool space than its size: choose *Create the largest virtual disk possible* to avoid size errors.
- **Hot spare** disks wait to replace a failed disk (`Add-PhysicalDisk -Usage HotSpare`). Without one, add a disk, mark the failed one retired (`Set-PhysicalDisk -Usage Retired`), run `Repair-VirtualDisk`, then remove the failed disk.

```powershell
Get-StoragePool -IsPrimordial $true | Get-PhysicalDisk -CanPool $true
New-StoragePool -FriendlyName Pool1 -StorageSubSystemFriendlyName "Windows Storage*" `
  -PhysicalDisks (Get-PhysicalDisk -CanPool $true)
New-VirtualDisk -StoragePoolFriendlyName Pool1 -FriendlyName VDisk1 `
  -ResiliencySettingName Mirror -NumberOfDataCopies 3 -Size 2TB -ProvisioningType Thin
Get-VirtualDisk -FriendlyName VDisk1 | Get-Disk | Initialize-Disk -PassThru |
  New-Partition -AssignDriveLetter -UseMaximumSize | Format-Volume -FileSystem ReFS
```

> **Exam trap.** If `Get-PhysicalDisk -CanPool $true` returns nothing, the disks don't qualify: they already have partitions, sit behind a RAID controller that hides them, or are too small. Clear the disk (`Clear-Disk -RemoveData`) or change the controller mode.

<!-- section: storage-spaces-direct | objectives: 5.3.3 -->
## Implement and manage Storage Spaces Direct

Storage Spaces Direct (S2D) pools the **local drives of 2 to 16 servers** of a failover cluster into one software-defined pool. Volumes are **Cluster Shared Volumes**, usually ReFS. The Software Storage Bus lets every node see every drive; the fastest drives become a read/write **cache** automatically.

Requirements:

- **Windows Server Datacenter** edition on every node.
- Drives directly attached to one server each (SATA, SAS, NVMe, persistent memory), behind a simple HBA, no RAID; at least 4 capacity drives per server (all-flash), or 2 cache drives plus 4 capacity drives when a cache is used. Cache drives of 32 GB or more.
- Network: 10 Gbps or faster for 2 or 3 nodes, 25 Gbps and RDMA (iWARP or RoCE) recommended; SMB Direct and SMB Multichannel carry east-west traffic.
- 4 GB of RAM per TB of cache drive capacity per server, for metadata.
- A cluster witness; a two-node cluster needs one.

Deployment order:

1. Install `Failover-Clustering`, `Hyper-V` (hyperconverged), `Data-Center-Bridging` (RoCE) and `FS-FileServer` on every node.
2. Clean the drives (`Clear-Disk -RemoveData -RemoveOEM`).
3. Validate: `Test-Cluster -Node N1,N2,N3,N4 -Include "Storage Spaces Direct","Inventory","Network","System Configuration"`.
4. Create the cluster **without storage**: `New-Cluster -Name S2D1 -Node N1,N2,N3,N4 -NoStorage`, then configure a witness.
5. `Enable-ClusterStorageSpacesDirect`: creates the pool (named like "S2D on S2D1"), configures the cache and the default tiers.
6. Create volumes with `New-Volume`, which creates the virtual disk, partition, file system and CSV in one step.

```powershell
New-Volume -FriendlyName Volume1 -FileSystem CSVFS_ReFS -StoragePoolFriendlyName S2D* `
  -Size 2TB -ResiliencySettingName Mirror
```

| Resiliency | Minimum servers | Failures tolerated | Efficiency |
| --- | --- | --- | --- |
| Two-way mirror | 2 | 1 | 50 % |
| Three-way mirror | 3 | 2 | 33.3 % |
| Single parity (discouraged) | 3 | 1 | Higher than three-way mirror |
| Dual parity | 4 | 2 | 50 % to 80 % |
| Mirror-accelerated parity | 4 | 2 | Between mirror and parity |
| Nested two-way mirror (two servers only) | 2 | Drive and server failures at the same time | 25 % |
| Nested mirror-accelerated parity (two servers only) | 2 | Drive and server failures at the same time | About 35 % to 40 % |

> **Exam trap.** A two-server cluster that must keep running when one server is down **and** a drive fails in the other needs **nested resiliency** (Windows Server 2019 or later); a classic two-way mirror survives only one failure.

**Deployment models**: **hyperconverged** runs Hyper-V VMs on the storage nodes; **converged** (disaggregated) adds a Scale-Out File Server on top of S2D and serves SMB 3 shares to separate compute hosts. Before maintenance on a node, pause it and drain roles (`Suspend-ClusterNode -Drain`), then let storage resync complete before working on the next node (`Get-StorageJob`).

<!-- section: storage-replica | objectives: 5.3.4 -->
## Configure and manage Storage Replica

Storage Replica replicates **volumes at block level** over SMB 3, synchronously (zero data loss, about 5 ms round-trip latency or less) or asynchronously (longer distances, RPO above zero).

| Scenario | Storage | Failover |
| --- | --- | --- |
| Stretch cluster | Two sets of asymmetric shared storage in one cluster (SAS, SAN, iSCSI) | Automatic |
| Cluster to cluster | S2D, shared SAS, SAN, iSCSI | Manual |
| Server to server | Local drives, SAN, iSCSI, Storage Spaces | Manual |

Requirements:

- An AD DS forest; at least 2 GB of RAM and 2 cores per server; TCP 445 (or 5445 with RDMA) between partners.
- Feature `Storage-Replica` (plus `FS-FileServer` for `Test-SRTopology`), then restart.
- On each side, a **data volume** and a **log volume**; disks initialized as **GPT**; data volumes of identical size; same sector size for all data disks and for all log disks; log volume on fast storage (SSD), at least 10 GB, used for nothing else; the log size defaults to 8 GB (`-LogSizeInBytes`).
- **Standard edition** (Windows Server 2019 or later): one replicated volume of up to 2 TB. **Datacenter**: unlimited.

```powershell
Test-SRTopology -SourceComputerName SR-SRV01 -SourceVolumeName F: -SourceLogVolumeName G: `
  -DestinationComputerName SR-SRV02 -DestinationVolumeName F: -DestinationLogVolumeName G: `
  -DurationInMinutes 30 -ResultPath C:\Temp
New-SRPartnership -SourceComputerName SR-SRV01 -SourceRGName RG01 -SourceVolumeName F: `
  -SourceLogVolumeName G: -DestinationComputerName SR-SRV02 -DestinationRGName RG02 `
  -DestinationVolumeName F: -DestinationLogVolumeName G:
Get-SRGroup; (Get-SRGroup).Replicas | Select-Object NumOfBytesRemaining
# Reverse the direction (planned failover to SR-SRV02)
Set-SRPartnership -NewSourceComputerName SR-SRV02 -SourceRGName RG02 `
  -DestinationComputerName SR-SRV01 -DestinationRGName RG01
```

- The **destination volume is dismounted** while it replicates; a test failover (Windows Server 2019 and later) temporarily mounts a writable snapshot of it for tests or backups.
- To remove replication, run `Remove-SRPartnership` on the **source** only and `Remove-SRGroup` on both servers.
- Storage Replica **isn't a backup**: a deletion is replicated at once. It also replicates VSS snapshots, since it works below the file system.

> **Exam trap.** Need zero data loss for a volume with open files between two buildings: Storage Replica (synchronous). DFS Replication replicates closed files with hours of latency, and Hyper-V Replica protects VMs, not volumes.

<!-- section: smb-direct | objectives: 5.3.6 -->
## Configure SMB Direct

SMB Direct is SMB over **RDMA** network adapters (iWARP, RoCE, InfiniBand): high throughput, low latency and low CPU, used by Hyper-V over SMB, Scale-Out File Server, S2D and Storage Replica.

- Requires RDMA-capable adapters on both computers; it is enabled by default.
- **SMB Multichannel** detects RDMA capability: disabling Multichannel disables SMB Direct.
- RDMA adapters can be teamed with **Switch Embedded Teaming** (SET). A VM's virtual adapter doesn't get RDMA.
- Since Windows Server 2022, SMB encryption works with SMB Direct (data is encrypted before placement) instead of falling back to TCP-like performance.
- RoCE needs Data Center Bridging and correctly configured switches; iWARP doesn't.

```powershell
Get-NetAdapterRdma                      # RDMA enabled per adapter
Get-SmbServerNetworkInterface           # RDMA Capable column on the server
Get-SmbClientNetworkInterface           # same on the client
Get-SmbMultichannelConnection           # connections actually in use
Enable-NetAdapterRdma -Name "SLOT 2"
Set-NetOffloadGlobalSetting -NetworkDirect Enabled
```

<!-- section: storage-qos | objectives: 5.3.7 -->
## Configure Storage QoS

Storage Quality of Service manages storage performance of **Hyper-V virtual disks** centrally, in two scenarios: Hyper-V hosts using a **Scale-Out File Server**, or a Hyper-V cluster using **Cluster Shared Volumes**. The **Storage QoS Resource** (Policy Manager) is created automatically as a cluster core resource; Hyper-V supports it by default. Without policies, it already prevents one VM from starving the others.

- Performance is measured in **normalized IOPS**: each I/O of 8 KB or less counts as one; a 256 KB I/O counts as 32.
- A policy has **MinimumIops** (reservation), **MaximumIops** (limit) and optionally **MaximumIOBandwidth** (bytes per second); the first limit reached applies.

| Policy type | Applies |
| --- | --- |
| Dedicated (formerly multi-instance) | The minimum and maximum to **each** virtual disk assigned |
| Aggregated (formerly single-instance) | One shared minimum and maximum for **all** the virtual disks assigned together (keep to 20 or fewer) |

```powershell
# On the storage cluster
$policy = New-StorageQosPolicy -Name Desktop -PolicyType Dedicated -MinimumIops 100 -MaximumIops 200
# On the Hyper-V host
Get-VM -Name Build* | Get-VMHardDiskDrive | Set-VMHardDiskDrive -QoSPolicyID $policy.PolicyId
Get-StorageQosFlow | Sort-Object StorageNodeIOPS -Descending
Get-StorageQosPolicy -Name Desktop | Set-StorageQosPolicy -MaximumIops 300
```

> **Exam trap.** "Five SQL Server VMs must share 5,000 IOPS in total" is an **Aggregated** policy; "each desktop VM gets at least 100 and at most 200 IOPS" is a **Dedicated** policy.

<!-- section: key-points -->
## Key points

- Initialize disks as GPT for volumes over 2 TB and for Storage Replica; extend only into adjacent space; ReFS can't shrink.
- Storage Spaces minimums: two-way mirror 2 disks, three-way mirror 5, parity 3; disks blank, at least 4 GB, no RAID.
- S2D: Datacenter edition, 2 to 16 servers, `New-Cluster -NoStorage`, `Enable-ClusterStorageSpacesDirect`, `New-Volume`; three-way mirror needs 3 servers, dual parity 4; nested resiliency for two servers.
- Storage Replica: block level, GPT, data plus log volumes, `Test-SRTopology` first; Standard edition limited to one 2 TB volume.
- SMB Direct needs RDMA adapters and SMB Multichannel; teaming with SET.
- Storage QoS: normalized 8 KB IOPS; Dedicated per disk, Aggregated shared.
