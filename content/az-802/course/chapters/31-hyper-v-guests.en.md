This chapter covers the settings of a Hyper-V guest: connecting to it and managing it from the host, memory and integration services, direct hardware access (nested virtualization, Discrete Device Assignment, GPU partitioning) and checkpoints. Questions name a host (HV1), a VM (VM1) and a requirement, then ask which setting or cmdlet to use, or what to do first (often: turn off the VM).

<!-- section: enhanced-session | objectives: 3.1.1 -->
## Enhanced Session Mode

Virtual Machine Connection (VMConnect, `vmconnect.exe`) opens a VM's console. **Basic** mode gives only screen, keyboard and mouse. **Enhanced Session Mode** uses an RDP session over the VMBus, so it works **without network connectivity** to the VM and adds local resources: display resizing, audio, clipboard, printers, smart cards, USB devices, local drives and supported Plug and Play devices.

Requirements:

| Where | Requirement |
| --- | --- |
| Hyper-V host | The host **policy** allows it (Hyper-V Settings > Server > Enhanced Session Mode Policy, or `Set-VMHost -EnableEnhancedSessionMode $true`) **and** the user setting is on (Hyper-V Settings > User > Enhanced Session Mode) |
| Guest | Windows 10 or Windows Server 2016 or later, **Remote Desktop Services enabled in the guest**; the feature is documented for Windows VMs |
| Client running VMConnect | Windows 10 or Windows Server 2016 or later |

```powershell
Set-VMHost -EnableEnhancedSessionMode $true   # host policy, on HV1
vmconnect.exe HV1 VM1 /edit                   # reopen the connection settings (resources to share)
```

On Windows Server hosts the policy is off by default, unlike Windows client hosts. A greyed-out toolbar icon means the VM isn't ready (Remote Desktop disabled in the guest, unsupported guest, OS not started).

> **Exam trap.** Enhanced Session Mode needs no virtual switch or IP address in the VM: copying a file into an isolated VM is a typical "enable Enhanced Session Mode" answer. Copy-VMFile and PowerShell Direct are the scripted alternatives.

<!-- section: remote-vm-management | objectives: 3.1.2 -->
## Managing VMs with PowerShell, PowerShell Direct and SSH Direct

**Managing the host remotely.** The Hyper-V module cmdlets accept `-ComputerName` or `-CimSession`; Hyper-V Manager connects to remote hosts over WS-Management (Kerberos, NTLM or CredSSP). The user must be a member of **Hyper-V Administrators** (or Administrators) on the host.

```powershell
Get-VM -ComputerName HV1, HV2 | Where-Object State -eq Running
```

**PowerShell Direct** runs PowerShell **inside** a guest from its host over the VMBus, whatever the VM's network, firewall or remoting configuration:

| Requirement | Detail |
| --- | --- |
| Location | The VM runs **on the local host**; you run the command on that host |
| State | The VM is **running** and its OS has finished booting |
| Host rights | You are signed in to the host as a Hyper-V administrator |
| Guest credentials | You supply valid credentials **of the guest** (`-Credential`); `-RunAsAdministrator` can't be used |
| OS | Host and guest Windows 10 / Windows Server 2016 or later; guest service *Hyper-V PowerShell Direct Service* (`vmicvmsession`) running |

```powershell
Enter-PSSession -VMName VM1 -Credential (Get-Credential)                  # interactive
Invoke-Command -VMName VM1 -Credential $cred -FilePath C:\Scripts\Set-Ip.ps1
$s = New-PSSession -VMName VM1 -Credential $cred                           # persistent session
Copy-Item -ToSession $s -Path C:\Tools\agent.msi -Destination C:\Temp\
Remove-PSSession $s
```

**SSH Direct for Linux guests.** Linux guests have no PowerShell Direct service. From the host, the `hvc.exe` command-line tool connects to a VM by name: `hvc ssh user@VM1` opens an SSH session to the SSH server running in the Linux guest, without you looking up its IP address. The Linux VM must run and have its SSH server configured.

> **Exam trap.** PowerShell Direct fails from a management workstation (the VM must be local to the host where you run the command), fails if the VM is off or still booting, and uses **guest** credentials, not the host's. "The VM has no network adapter" doesn't block it.

<!-- section: nested-virtualization | objectives: 3.1.3 -->
## Nested virtualization

Nested virtualization exposes the processor's virtualization extensions to a VM so it can run Hyper-V itself (labs, Hyper-V isolated containers, WSL2 in a VM).

| Requirement | Intel (VT-x with EPT) | AMD EPYC / Ryzen |
| --- | --- | --- |
| Host | Windows Server 2016 or later, Windows 10 or later | Windows Server 2022 or later, Windows 11 or later |
| VM configuration version | 8.0 or higher | 9.3 or higher |

```powershell
Stop-VM -Name VM1                                                     # the VM must be off
Set-VMProcessor -VMName VM1 -ExposeVirtualizationExtensions $true
Get-VMNetworkAdapter -VMName VM1 | Set-VMNetworkAdapter -MacAddressSpoofing On
Start-VM -Name VM1
# Then install the Hyper-V role inside VM1
```

Networking for the nested VMs:

| Option | When |
| --- | --- |
| MAC address spoofing on the first-level VM's adapter | Packets of the nested VMs must cross two virtual switches; the usual on-premises answer |
| NAT inside the first-level VM (internal switch + `New-NetNat`) | MAC spoofing isn't possible, for example in a public cloud |

Limits: while Hyper-V runs inside the VM, its memory can't change while it's running (Dynamic Memory has no effect, runtime resize fails). For an Azure VM, set the security type to **Standard**. Nested setups are supported in production but recommended mainly for test labs, not for failover clustering or performance-sensitive workloads.

> **Exam trap.** `Set-VMProcessor -ExposeVirtualizationExtensions` fails on a running VM, and nested VMs get no network until MAC address spoofing (or NAT) is configured on the outer VM.

<!-- section: memory | objectives: 3.1.4 -->
## VM memory settings

| Setting | Static memory | Dynamic Memory |
| --- | --- | --- |
| Startup RAM (`-StartupBytes`) | The fixed amount the VM always has | Amount allocated at startup |
| Minimum RAM (`-MinimumBytes`) | n/a | The floor Hyper-V can reclaim down to |
| Maximum RAM (`-MaximumBytes`) | n/a | The ceiling the VM can grow to |
| Memory buffer (`-Buffer`) | n/a | Extra memory, as a percentage of current demand (5 to 2000 %), kept available |
| Memory weight (`-Priority`, 0 to 100) | n/a | Which VMs get memory first when the host runs short |

```powershell
Set-VMMemory -VMName VM1 -DynamicMemoryEnabled $true -MinimumBytes 1GB -StartupBytes 2GB `
    -MaximumBytes 8GB -Buffer 20 -Priority 80
Set-VMMemory -VMName VM2 -StartupBytes 6GB      # static VM: runtime resize while running
```

What can change while the VM runs:

| Change | Running VM? |
| --- | --- |
| Turn Dynamic Memory on or off | No, turn the VM off |
| Static memory size (runtime memory resize) | Yes, for generation 1 and 2 VMs running Windows Server 2016 / Windows 10 or later |
| Dynamic Memory: increase the maximum, decrease the minimum | Yes |

Other rules:

- **Smart Paging** lets a VM restart when the host can't provide its startup memory but its minimum is lower: disk is used temporarily during boot (`Set-VM -SmartPagingFilePath`).
- Dynamic Memory can't be used with **Discrete Device Assignment**, and has no effect on a VM running nested Hyper-V.

> **Exam tip.** "VM1 must use 2 to 8 GB depending on load" means Dynamic Memory. "VM1 has static memory and needs 4 GB more now, without downtime" means runtime memory resize (guest Windows Server 2016 or later).

<!-- section: integration-services | objectives: 3.1.5 -->
## Integration services

Integration services are host-guest components over the VMBus. Each must be enabled on the host **and** running in the guest. Windows guests get updates through Windows Update; on Linux they're built into the kernel and updated with it.

| Service (host name) | Guest service | Purpose | Default |
| --- | --- | --- | --- |
| Heartbeat | `vmicheartbeat` | Reports that the OS booted and responds (`Status` "Operating normally") | On |
| Shutdown | `vmicshutdown` | Clean shutdown from the host; without it, Stop-VM is a power-off | On |
| Time Synchronization | `vmictimesync` | Syncs the guest clock with the host | On |
| Key-Value Pair Exchange | `vmickvpexchange` | Exchanges metadata strings (Data Exchange service) | On |
| VSS | `vmicvss` | Backup of a running VM and **production checkpoints** | On |
| Guest Service Interface | `vmicguestinterface` | File copy host to guest with **`Copy-VMFile`** | **Off** |
| PowerShell Direct (guest only) | `vmicvmsession` | PowerShell Direct sessions | On (Windows guests) |

```powershell
Get-VMIntegrationService -VMName VM1
Enable-VMIntegrationService -VMName VM1 -Name "Guest Service Interface"
Copy-VMFile -Name VM1 -SourcePath C:\ISO\tool.zip -DestinationPath C:\Temp\tool.zip `
    -FileSource Host -CreateFullPath
Disable-VMIntegrationService -VMName VM1 -Name "Time Synchronization"
```

> **Exam trap.** `Copy-VMFile` fails on a new VM because **Guest Service Interface** is the only integration service off by default. Manage integration services from the host (Hyper-V Manager or the cmdlets above), not by stopping the services inside the guest.

<!-- section: device-assignment | objectives: 3.1.6 -->
## Discrete Device Assignment

Discrete Device Assignment (DDA) passes an entire PCIe device through to **one** VM, which loads the vendor's driver and accesses the hardware directly. Microsoft supports two classes: **GPUs** and **NVMe storage**. Supported on Windows Server 2016 to 2025 hosts (standalone; clustered VMs follow separate guidance), generation 1 or 2 VMs, Windows Server 2016 / Windows 10 or later guests.

Prerequisites: administrator rights on the host, server-class hardware with native PCI Express control and a PCIe root complex that supports Access Control Services (the firmware may expose this as "Enable SR-IOV"), and the `SurveyDDA.ps1` script to list assignable devices, their **location path** and their MMIO needs. While a device is assigned, the VM loses **save/restore**, **live migration**, **Dynamic Memory** and **adding the VM to a high availability cluster**.

```powershell
# 1. Prepare the VM (off)
Set-VM -Name VM1 -AutomaticStopAction TurnOff
Set-VM -Name VM1 -GuestControlledCacheTypes $true -LowMemoryMappedIoSpace 3GB -HighMemoryMappedIoSpace 33280MB

# 2. Remove the device from the host
$dev = Get-PnpDevice -PresentOnly | Where-Object { $_.Class -eq "Display" -and $_.Manufacturer -like "NVIDIA*" }
$path = ($dev | Get-PnpDeviceProperty DEVPKEY_Device_LocationPaths).Data[0]
Disable-PnpDevice -InstanceId $dev.InstanceId -Confirm:$false
Dismount-VMHostAssignableDevice -LocationPath $path -Force

# 3. Assign it, start the VM, install the vendor driver in the guest
Add-VMAssignableDevice -LocationPath $path -VMName VM1

# Give it back to the host (VM off)
Remove-VMAssignableDevice -LocationPath $path -VMName VM1
Mount-VMHostAssignableDevice -LocationPath $path
```

MMIO space defaults to 128 MB low and 512 MB high per VM; GPUs usually need more high MMIO. `-Force` on `Dismount-VMHostAssignableDevice` is needed when the vendor provides no device mitigation driver; that weakens isolation, so use DDA for trusted tenants only.

> **Exam trap.** The order matters: set `AutomaticStopAction` to `TurnOff`, disable the device on the host, **dismount** it from the host, then add it to the VM. Adding a device still mounted on the host fails.

<!-- section: gpu-partitioning | objectives: 3.1.7 -->
## GPU partitioning

GPU partitioning (GPU-P) shares one physical GPU between VMs: SR-IOV gives each VM a **dedicated fraction** of the GPU (VRAM, encoders, decoders, compute) behind a hardware security boundary.

| | Discrete Device Assignment | GPU partitioning |
| --- | --- | --- |
| VMs per GPU | One VM gets the whole GPU | Several VMs, one partition each |
| GPU mode | DDA | Partitionable (a GPU is one or the other, not both) |
| Host OS | Windows Server 2016 to 2025 | **Windows Server 2025** |
| Live migration | No | Yes on Windows Server 2025 with IOMMU DMA bit tracking processors (it falls back to TCP/IP with compression) |
| Supported GPUs | More models | A short list of data center GPUs: NVIDIA A and L series, NVIDIA RTX Pro 6000 Blackwell Server Edition, AMD Radeon PRO V710 |

Prerequisites: SR-IOV and virtualization enabled in the BIOS, IOMMU (Intel VT-d or AMD-Vi), the GPU vendor's host driver (NVIDIA vGPU software), the guest driver in each VM. Guests: Windows 10 or later, Windows Server 2019 or later, Ubuntu 18.04/20.04/22.04 LTS. Clusters (failover for unplanned downtime) need **Windows Server 2025 Datacenter** and identical GPUs (make, model, size, partition count) on every node.

Limits: **one partition per VM**; the VM and its partition stay on the same host; partitions are assigned automatically (you can't pick which one).

```powershell
Get-VMHostPartitionableGpu | Select-Object Name
Set-VMHostPartitionableGpu -Name "<gpu-name>" -PartitionCount 4
Add-VMGpuPartitionAdapter -VMName VM1 -InstancePath "<gpu-name>"   # VM off
Get-VMGpuPartitionAdapter -VMName VM1
Remove-VMGpuPartitionAdapter -VMName VM1
```

Windows Admin Center (GPUs extension) is the recommended tool: it checks GPU homogeneity, sets the partition count, and turns the VM off and on to assign a partition.

> **Exam tip.** "Ten VDI VMs need GPU acceleration, there are two GPUs, and VMs must live migrate between Windows Server 2025 hosts" means GPU partitioning. "One VM needs the full power of a GPU" means DDA.

<!-- section: checkpoints | objectives: 3.1.8 -->
## VM checkpoints

A checkpoint captures a VM at a point in time. Its disk changes go to a differencing disk, an **`.avhdx`** file next to the `.vhdx`.

| Type | How | Memory state | After applying |
| --- | --- | --- | --- |
| **Production** (default for new VMs) | VSS in Windows guests, file system freeze in Linux guests: application-consistent, like a backup | Not captured | The VM is **off**; start it |
| Standard | Saves disks **and memory** (saved state) | Captured | The VM resumes exactly where it was, apps open |

`Set-VM -CheckpointType` values:

| Value | Behavior |
| --- | --- |
| `Production` | Production checkpoint; falls back to a standard checkpoint if the guest can't create one |
| `ProductionOnly` | Production checkpoint; the operation **fails** if the guest can't create one |
| `Standard` | Standard checkpoint |
| `Disabled` | No checkpoints |

```powershell
Set-VM -Name VM1 -CheckpointType ProductionOnly
Checkpoint-VM -Name VM1 -SnapshotName "Before KB update"
Get-VMSnapshot -VMName VM1
Restore-VMSnapshot -VMName VM1 -Name "Before KB update" -Confirm:$false
Remove-VMSnapshot -VMName VM1 -Name "Before KB update"     # merges the .avhdx into the parent
Set-VM -Name VM1 -AutomaticCheckpointsEnabled $false
```

"Checkpoint" and "snapshot" are interchangeable in the module (`Get-VMCheckpoint`, `Restore-VMCheckpoint` are aliases).

Rules:

- **Apply** offers *Create Checkpoint and Apply* (keeps the current state as a new checkpoint) or *Apply* (current state lost).
- **Delete** a checkpoint from Hyper-V Manager or PowerShell: Hyper-V merges the `.avhdx` into its parent. Never delete `.avhdx` files by hand. *Delete Checkpoint Subtree* deletes a checkpoint and its children.
- Checkpoints aren't backups: they sit on the VM's storage, and long `.avhdx` chains cost performance and space.

> **Exam trap.** Standard checkpoints can cause data consistency problems with systems that replicate between nodes, such as Active Directory domain controllers; use production checkpoints (or real backups). "Applying the checkpoint must bring back the open applications" requires a **standard** checkpoint; production checkpoints never capture memory.

<!-- section: key-points -->
## Key points

- Enhanced Session Mode: host policy + user setting + Remote Desktop Services in the Windows guest; no network needed.
- PowerShell Direct: `-VMName`, local host only, VM running, guest credentials; `hvc ssh` for Linux guests.
- Nested virtualization: VM off, `Set-VMProcessor -ExposeVirtualizationExtensions $true`, MAC address spoofing; AMD needs Windows Server 2022 and VM version 9.3.
- Dynamic Memory: startup, minimum, maximum, buffer, weight; on/off only when the VM is off; runtime resize for static memory.
- Guest Service Interface is off by default and needed by `Copy-VMFile`; VSS enables production checkpoints.
- DDA: whole GPU or NVMe device to one VM, dismount from the host first, no live migration. GPU-P: Windows Server 2025, one partition per VM, live migration.
- Production checkpoints (default) use VSS, no memory, VM off after apply; `ProductionOnly` fails instead of falling back.
