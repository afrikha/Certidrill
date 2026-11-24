This chapter covers the host side of a Hyper-V virtual machine: availability (failover clustering, live migration), virtual hard disks, networking (adapters, virtual switches, teaming) and site recovery (Hyper-V Replica). Questions name a host, a VM and a constraint, and ask which feature, setting or cmdlet meets it.

<!-- section: high-availability | objectives: 3.1.9 -->
## High availability for Hyper-V VMs

Choose the technology from the failure you must survive:

| Requirement | Answer |
| --- | --- |
| A VM restarts automatically on another host when its host fails | Failover cluster of Hyper-V hosts, VM added as a clustered role, VM files on shared storage (CSV, SMB share, Storage Spaces Direct) |
| Move a running VM to another host with no perceived downtime | Live migration (in a cluster, or shared-nothing between standalone hosts) |
| Empty a node before maintenance | Pause the node with **Drain Roles**: its VMs are live migrated to other nodes |
| Keep a copy of the VM on another site, asynchronously | Hyper-V Replica (see the last section) |
| The application itself must fail over inside the guests | Guest cluster: a cluster of VMs that share a VHD Set (`.vhds`) |

Failover cluster essentials:

- Run validation before creation (`Test-Cluster`), then `New-Cluster`. Hosts should use matching hardware and processors with hardware-assisted virtualization and DEP; a cluster of Hyper-V hosts with SAN or NAS storage holds 1 to 64 nodes, a hyperconverged Storage Spaces Direct cluster 1 to 16.
- Make the VM highly available with `Add-ClusterVirtualMachineRole` (or the **Configure Role** wizard). A VM created only in Hyper-V Manager isn't clustered and doesn't fail over.
- Store VMs on **Cluster Shared Volumes** (CSV, formatted NTFS or ReFS) so that every node reads and writes the same volume.
- Quorum: each node has a vote; configure a witness so that the number of votes is odd. Witness types are disk, file share and cloud witness (a blob in an Azure storage account, useful when you have no third site).

```powershell
Test-Cluster -Node HV1, HV2
New-Cluster -Name HVCLU1 -Node HV1, HV2 -StaticAddress 10.0.0.50
Add-ClusterSharedVolume -Name "Cluster Disk 1"
Set-ClusterQuorum -CloudWitness -AccountName contosowitness -AccessKey "<storage-account-key>"
Add-ClusterVirtualMachineRole -VirtualMachine VM1
Suspend-ClusterNode -Name HV1 -Drain
Move-ClusterVirtualMachineRole -Name VM1 -Node HV2
```

Live migration settings (per host, or **Live Migration Settings** of the cluster networks):

| Setting | Values |
| --- | --- |
| Authentication | **CredSSP** (default up to Windows Server 2022; you must be signed in to the source host) or **Kerberos** (requires constrained delegation on each host's computer account to the **cifs** and **Microsoft Virtual System Migration Service** services) |
| Performance option | TCP/IP; **Compression** (default); SMB (uses SMB Direct when the adapters have RDMA, and SMB Multichannel) |
| Simultaneous live migrations | Default 2 |
| Incoming migration networks | Any network, or a list of subnets (`Set-VMMigrationNetwork`) |

```powershell
Enable-VMMigration
Set-VMMigrationNetwork 192.168.10.1
Set-VMHost -VirtualMachineMigrationAuthenticationType Kerberos `
  -VirtualMachineMigrationPerformanceOption SMB
```

> **Exam trap.** On Windows Server 2025, Credential Guard is enabled by default on domain-joined servers that aren't domain controllers, so CredSSP-based live migration fails after an upgrade. The fix is Kerberos with constrained delegation, not disabling the firewall or adding the user to a group.

**Processor compatibility mode** lets a VM move between hosts with different processor generations of the **same manufacturer** (never Intel to AMD). The VM must be shut down to change it. Windows Server 2025 adds a dynamic mode that computes the features common to all cluster nodes (VM configuration version 10.0 or later).

```powershell
Set-VMProcessor -VMName VM1 -CompatibilityForMigrationEnabled $true `
  -CompatibilityForMigrationMode CommonClusterFeatureSet
```

<!-- section: virtual-hard-disks | objectives: 3.1.10 -->
## Managing Hyper-V virtual hard disks

| Format | Maximum size | Notes |
| --- | --- | --- |
| VHD | 2,040 GB | Legacy format, kept for compatibility |
| VHDX | 64 TB | Online resize, better protection against data corruption, 4 KB logical sectors. The default choice |
| VHD Set (`.vhds`) | Same as VHDX | Shared disk for guest clusters; supports online resize, Hyper-V Replica and application-consistent checkpoints |

| Type | Behavior |
| --- | --- |
| Fixed | Full size allocated at creation; predictable performance |
| Dynamically expanding | Grows as data is written; the default of `New-VHD` |
| Differencing | Child of a parent disk; stores only the changes, the parent stays unchanged |
| Pass-through | A physical disk, **offline on the host**, given directly to the VM (`Add-VMHardDiskDrive -DiskNumber`) |

Controllers: a generation 1 VM boots from an IDE disk (2 IDE controllers, 4 devices); a generation 2 VM boots from SCSI and has no IDE. Each VM has up to 4 SCSI controllers of 64 disks.

```powershell
New-VHD -Path D:\VMs\Data1.vhdx -SizeBytes 200GB -Dynamic
New-VHD -Path D:\VMs\Web2.vhdx -ParentPath D:\VMs\Base.vhdx -Differencing
Add-VMHardDiskDrive -VMName VM1 -ControllerType SCSI -Path D:\VMs\Data1.vhdx
Resize-VHD -Path D:\VMs\Data1.vhdx -SizeBytes 300GB
Optimize-VHD -Path D:\VMs\Data1.vhdx
Convert-VHD -Path D:\VMs\Old.vhd -DestinationPath D:\VMs\Old.vhdx
```

| Operation | Rule |
| --- | --- |
| `Resize-VHD` | Expands VHD and VHDX; shrinks only VHDX, never below its minimum size. Online only when the disk is on a **SCSI** controller; on IDE the VM must be off |
| `Optimize-VHD` (compact) | Reclaims unused blocks of dynamic and differencing disks, not fixed disks. The disk must be detached or attached read-only |
| `Convert-VHD` | Changes format (by extension) or type. Offline: the disk must not be attached |
| `Merge-VHD` | Merges a differencing chain. Offline |
| `Set-VHD -ParentPath` | Reconnects a differencing disk to a moved parent |

After an expansion, extend the volume inside the guest. To shrink, first shrink the volume in the guest: `Resize-VHD` fails below the disk's `MinimumSize`.

> **Exam trap.** "Reduce the size of the .vhdx file on the host" is `Optimize-VHD`; "reduce the disk size seen by the guest" is `Resize-VHD` on a VHDX. `Resize-VHD` never removes empty blocks.

A shared disk for a guest cluster is a VHD Set attached to each VM with `-SupportPersistentReservations`. To migrate a shared VHDX to a VHD Set, take the VMs offline, remove the disk, `Convert-VHD existing.vhdx new.vhds`, then add it back.

<!-- section: network-adapters | objectives: 3.1.11 -->
## Configuring the Hyper-V network adapter

| Adapter | Use |
| --- | --- |
| Network adapter (synthetic) | Generation 1 and 2; driver from integration services; best performance. On generation 2 it also boots from the network (PXE) |
| Legacy network adapter | Generation 1 only; emulates an Intel 21140 card; needed to PXE boot a generation 1 VM or for a guest without integration services |

You can't convert one type into the other: add a new adapter. A generation 1 VM has up to 8 synthetic and 4 legacy adapters; a generation 2 VM up to 64 synthetic adapters, which can be added and removed while it runs.

| `Set-VMNetworkAdapter` parameter | Effect |
| --- | --- |
| `-StaticMacAddress` / `-DynamicMacAddress` | A fixed MAC address, or a MAC address assigned by Hyper-V |
| `-MacAddressSpoofing On` | Lets the guest send frames with a MAC address not assigned to it; required on the adapter of a VM that hosts nested VMs |
| `-DhcpGuard On` | Drops DHCP server messages from this VM |
| `-RouterGuard On` | Drops router advertisement and redirection messages from this VM |
| `-PortMirroring Source` / `Destination` | Copies traffic of a source adapter to a destination adapter (a monitoring VM) |
| `-MaximumBandwidth` / `-MinimumBandwidthWeight` | Caps (bits per second) or guarantees a relative share (0 to 100) |
| `-VmqWeight` / `-IovWeight` | 0 disables VMQ / SR-IOV for the adapter |
| `-DeviceNaming On` | Exposes the adapter name to the guest (generation 2) |
| `-AllowTeaming On` | Allows teaming inside the guest |

VLANs are set per adapter. Access mode tags all traffic with one VLAN; trunk mode lets an appliance VM receive several VLANs. The physical adapter and switch must support 802.1q.

```powershell
Add-VMNetworkAdapter -VMName VM1 -SwitchName External1 -Name Backend
Set-VMNetworkAdapter -VMName VM1 -Name Backend -DhcpGuard On -RouterGuard On
Set-VMNetworkAdapterVlan -VMName VM1 -VMNetworkAdapterName Backend -Access -VlanId 20
Set-VMNetworkAdapterVlan -VMName FW1 -Trunk -AllowedVlanIdList 10-30 -NativeVlanId 10
Set-VMNetworkAdapterVlan -ManagementOS -Access -VlanId 5
```

> **Exam trap.** DHCP guard and router guard are configured on the adapter of the **rogue** VM (or of all VMs except the legitimate server), not on the DHCP server VM.

<!-- section: virtual-switch | objectives: 3.1.13 -->
## Configuring the Hyper-V Virtual Switch

| Type | Connects VMs to | Host can use it | Created with |
| --- | --- | --- | --- |
| External | The physical network, through one physical adapter or team | Yes when **Allow management operating system to share this network adapter** is selected | `-NetAdapterName` (implies External) |
| Internal | Other VMs on the host and the host | Yes (a host vNIC is created) | `-SwitchType Internal` |
| Private | Other VMs on the same host only | No | `-SwitchType Private` |

```powershell
Get-NetAdapter
New-VMSwitch -Name External1 -NetAdapterName "Ethernet 2" -AllowManagementOS $true
New-VMSwitch -Name LabNet -SwitchType Private
New-VMSwitch -Name NatSwitch -SwitchType Internal
New-NetIPAddress -IPAddress 192.168.0.1 -PrefixLength 24 -InterfaceAlias "vEthernet (NatSwitch)"
New-NetNat -Name LabNAT -InternalIPInterfaceAddressPrefix 192.168.0.0/24
```

Points that decide answers:

- An external switch on the host's only adapter, without management OS sharing, cuts the host off the network.
- **SR-IOV** must be enabled when the switch is created (`-EnableIov $true`); it can't be turned on later. The VM adapter then needs a nonzero `IovWeight`.
- Minimum bandwidth mode (`-MinimumBandwidthMode Absolute` or `Weight`) is also chosen at creation.
- A NAT network gives internal VMs outbound access through the host; there is one NAT network per host.

<!-- section: nic-teaming | objectives: 3.1.12 -->
## NIC teaming on the host and in the VM

| | Switch Embedded Teaming (SET) | NIC Teaming (LBFO) |
| --- | --- | --- |
| Where | Built into the Hyper-V Virtual Switch | Operating system feature, independent of Hyper-V |
| Hyper-V switch on top | Yes | **No** since Windows Server 2022: a Hyper-V switch can't be bound to an LBFO team |
| Members | Up to 8 identical adapters (same make, model, speed, configuration) | Adapters of different speeds aren't supported |
| Teaming modes | Switch independent only | Switch independent, Static, LACP |
| Load balancing | Hyper-V Port or Dynamic | Address hash (TransportPorts, IPAddresses, MacAddresses), Hyper-V Port, Dynamic |
| Teaming of RDMA adapters, guest RDMA | Yes | No |

```powershell
# Host: SET switch over two identical adapters
New-VMSwitch -Name SETswitch -NetAdapterName "NIC1","NIC2" -EnableEmbeddedTeaming $true `
  -AllowManagementOS $true
Set-VMSwitchTeam -Name SETswitch -LoadBalancingAlgorithm HyperVPort
Add-VMSwitchTeamMember -VMSwitchName SETswitch -NetAdapterName "NIC3"

# Server without Hyper-V: LBFO team
New-NetLbfoTeam -Name Team1 -TeamMembers "NIC1","NIC2" -TeamingMode Lacp `
  -LoadBalancingAlgorithm Dynamic
```

`Set-VMSwitchTeam` accepts `Dynamic` (default) and `HyperVPort`; Microsoft recommends Hyper-V Port for adapters of 10 Gbps or more. LACP and Static need configuration on the physical switch; switch independent lets the members connect to different switches.

**Teaming inside a VM**: give the VM two network adapters, allow teaming on them from the host, then create an LBFO team in the guest.

```powershell
# On the host
Set-VMNetworkAdapter -VMName VM1 -AllowTeaming On
# In the guest
New-NetLbfoTeam -Name GuestTeam -TeamMembers "Ethernet","Ethernet 2"
```

> **Exam trap.** "Team two adapters on a Hyper-V host and connect VMs to them" on Windows Server 2022 or 2025 = SET (`New-VMSwitch -EnableEmbeddedTeaming`), not `New-NetLbfoTeam` followed by a switch.

<!-- section: hyper-v-replica | objectives: 3.1.14 -->
## Configuring Hyper-V Replica

Hyper-V Replica keeps an offline, asynchronously updated copy (replica VM) of a running VM (primary VM) on another host or cluster, at the same site or another one. It is included in Windows Server, not in client Hyper-V.

| Setting | Values |
| --- | --- |
| Replication frequency | 30 seconds, 5 minutes (default) or 15 minutes |
| Recovery points | Latest only (default) or up to 24 additional hourly points, optionally application-consistent (VSS snapshot frequency) |
| Authentication | Kerberos over HTTP, port 80 (hosts in the same or trusted domains, no encryption) or certificate over HTTPS, port 443 (workgroup or untrusted hosts, or encryption required) |
| Certificate | Client and Server Authentication EKUs, private key, trusted root, subject or SAN = host FQDN (or the Replica Broker FQDN for a cluster) |
| Initial copy | Over the network now or scheduled (up to 7 days), from external media, or from an existing restored VM |
| Disks | All or a subset (exclude page file or temp disks) |
| Extended replication | Replica host to a third host; never primary to two replicas |

Order of operations:

1. On the **receiving** host, enable it as a Replica server, choose authentication and authorization (any authenticated server, or specific servers with a storage path and trust group). For a receiving cluster, first create the **Hyper-V Replica Broker** role (a client access point with its own name and IP address).
2. On the receiving hosts, enable the firewall rule **Hyper-V Replica HTTP Listener (TCP-In)** or **Hyper-V Replica HTTPS Listener (TCP-In)**; Hyper-V creates them disabled.
3. From the primary, test the connection, enable replication on the VM and start the initial replication.

```powershell
# Replica server
Set-VMReplicationServer -ReplicationEnabled $true -AllowedAuthenticationType Kerberos
Enable-NetFirewallRule -DisplayName "Hyper-V Replica HTTP Listener (TCP-In)"

# Primary server
Test-VMReplicationConnection -ReplicaServerName HV3.contoso.com -ReplicaServerPort 80 `
  -AuthenticationType Kerberos
Enable-VMReplication -VMName VM1 -ReplicaServerName HV3.contoso.com -ReplicaServerPort 80 `
  -AuthenticationType Kerberos
Start-VMInitialReplication -VMName VM1
Get-VMReplication -VMName VM1
Measure-VMReplication -VMName VM1
```

| Failover | Started on | Steps | Data loss |
| --- | --- | --- | --- |
| Test | Replica host | `Start-VMFailover -AsTest` creates an isolated test VM; `Stop-VMFailover` deletes it | None; replication continues |
| Planned | Primary, then replica | Shut down the primary VM, `Start-VMFailover -Prepare` on the primary, `Start-VMFailover` on the replica, `Set-VMReplication -Reverse`, `Start-VM` | None |
| Unplanned | Replica host | `Start-VMFailover`, `Start-VM`, then `Complete-VMFailover` (merges the recovery points). Later, `Set-VMReplication -AsReplica` on the old primary and reverse replication | Possible |

To give the VM another IP address on the recovery site, configure **static IP injection** on the replica VM after replication is enabled (`Set-VMNetworkAdapterFailoverConfiguration`, run on the replica host), applied by the Key-Value Pair Exchange integration service. It requires synthetic network adapters (not legacy adapters) and current integration services in the guest.

> **Exam trap.** Hyper-V Replica isn't high availability: nothing fails over automatically. A cluster restarts VMs automatically on the same site; Replica requires a failover action that you start.

<!-- section: key-points -->
## Key points

- Automatic restart on host failure = failover cluster + clustered VM role + shared storage; no downtime move = live migration.
- Windows Server 2025 blocks CredSSP live migration (Credential Guard): use Kerberos constrained delegation (cifs and Microsoft Virtual System Migration Service).
- VHDX: 64 TB, online resize on SCSI, shrink allowed; `Optimize-VHD` compacts, `Convert-VHD` and `Merge-VHD` are offline; shared disks for guest clusters = VHD Set.
- Legacy adapter only for PXE boot of generation 1; guards are set on the VMs that must not answer.
- External, internal, private switch; SR-IOV only at switch creation.
- Hyper-V switch + teaming on Windows Server 2022 or later = SET (switch independent, Hyper-V Port or Dynamic); `-AllowTeaming On` for teaming in a guest.
- Replica: configure the receiving side first, Broker for clusters, firewall listener rules, 30 s / 5 min / 15 min, up to 24 recovery points; planned failover needs the primary shut down.
