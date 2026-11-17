A Windows Server VM in Azure is managed through Azure Resource Manager, not through the guest alone: disks, size, placement, administrative access and IP addresses are properties of Azure resources. Questions usually hinge on one detail: whether the VM must be deallocated, which SKU or option is required, or where a setting must be made (Azure or the guest OS).

<!-- section: vm-storage | objectives: 3.2.1 -->
## Managing storage for Windows Server VMs in Azure

A VM has three kinds of disks:

| Disk | Role | Persistence |
| --- | --- | --- |
| OS disk (C:) | Boot volume, managed disk. Maximum 4,095 GiB, but an MBR partition uses only 2 TiB | Persistent |
| Data disks | Managed disks presented as SCSI drives, with a LUN; their number depends on the VM size | Persistent |
| Temporary disk (D: by default) | Local, not a managed disk: page file, tempdb | Lost during maintenance, redeployment or stop (deallocation); kept across a normal restart |

| Type | Max size | Max IOPS | OS disk |
| --- | --- | --- | --- |
| Ultra Disk | 65,536 GiB | 400,000 | No |
| Premium SSD v2 | 65,536 GiB | 80,000 | No |
| Premium SSD | 32,767 GiB | 20,000 | Yes |
| Standard SSD | 32,767 GiB | 6,000 | Yes |
| Standard HDD | 32,767 GiB | 2,000 or 3,000 | Yes, retiring on September 8, 2028 |

Premium SSD needs a VM size that supports premium storage. Ultra Disks and Premium SSD v2 let you change IOPS and throughput independently of size; a Premium SSD gets its performance from its size, or from a **performance tier** that you raise temporarily.

```powershell
# Create an empty data disk and attach it at LUN 1
$diskConfig = New-AzDiskConfig -SkuName Premium_LRS -Location westeurope `
  -CreateOption Empty -DiskSizeGB 128
$disk = New-AzDisk -ResourceGroupName RG1 -DiskName VM1-data1 -Disk $diskConfig
$vm = Get-AzVM -ResourceGroupName RG1 -Name VM1
$vm = Add-AzVMDataDisk -VM $vm -Name VM1-data1 -CreateOption Attach `
  -ManagedDiskId $disk.Id -Lun 1
Update-AzVM -ResourceGroupName RG1 -VM $vm
```

Then initialize the disk in the guest (Disk Management or `Initialize-Disk`): GPT is mandatory at 2 TiB or more.

| Operation | VM state required |
| --- | --- |
| Attach or detach a data disk | Running is fine |
| Expand an OS disk | Deallocated |
| Expand a data disk | Running for eligible data disks; deallocated otherwise. A Standard HDD, Standard SSD or Premium SSD of 4 TiB or less must be deallocated and **detached** to grow beyond 4 TiB (not applicable to Ultra Disks and Premium SSD v2) |
| Shrink a disk | Not supported |
| Change the type (Standard HDD, Standard SSD, Premium SSD) | Deallocated; at most twice per day |

```powershell
Stop-AzVM -ResourceGroupName RG1 -Name VM1 -Force
$disk = Get-AzDisk -ResourceGroupName RG1 -DiskName VM1-os
$disk.DiskSizeGB = 256
Update-AzDisk -ResourceGroupName RG1 -DiskName VM1-os -Disk $disk
Start-AzVM -ResourceGroupName RG1 -Name VM1
```

After the Azure operation, extend the volume in Windows: **Disk Management > Extend Volume**, or DiskPart (`select volume`, `extend`).

> **Exam trap.** Expanding the managed disk doesn't change the C: or F: volume. The last step is always in the guest. And an OS disk larger than 2 TiB still shows 2 TiB usable if it is MBR.

Other storage options: **shared disks** (several VMs attach one managed disk; requires a cluster manager such as Windows Server Failover Clustering, which arbitrates access with SCSI persistent reservations), **snapshots** (crash-consistent, read-only copy of one disk) and **images** (all disks of a generalized VM).

<!-- section: capacity | objectives: 3.2.2 -->
## Managing capacity: resizing and VM Scale Sets

Resizing changes the VM size (vCPU, memory, maximum disks and NICs).

- A running VM **restarts** when resized. If the target size isn't available on the hardware cluster that hosts the VM, you must deallocate it first.
- In an **availability set**, if the new size isn't available on the current cluster, deallocate **all** VMs of the set, resize, then start them.
- Windows VMs: resize only between sizes that both have a local temp disk, or both have none. A SCSI-based VM can't be resized directly to a size with a remote NVMe disk controller.

```powershell
Get-AzVMSize -ResourceGroupName RG1 -VMName VM1
$vm = Get-AzVM -ResourceGroupName RG1 -Name VM1
$vm.HardwareProfile.VmSize = "Standard_D4s_v5"
Update-AzVM -ResourceGroupName RG1 -VM $vm
```

```bash
az vm list-vm-resize-options --resource-group RG1 --name VM1 --output table
az vm resize --resource-group RG1 --name VM1 --size Standard_D4s_v5
```

**Virtual Machine Scale Sets** manage a group of load-balanced VMs whose number changes with demand or a schedule.

| | Flexible orchestration | Uniform orchestration |
| --- | --- | --- |
| Instances | Standard VMs with full control of VMs, NICs and disks; Windows and Linux can be mixed | Identical instances from one model |
| Maximum instances (with fault domain guarantees) | 1,000 | 100 |
| Add an existing VM to the set | Yes | No |
| Spot and regular instances mixed | Yes | No |
| Assign a VM to a specific zone or fault domain | Yes | No |
| Recommended for | New deployments; the replacement for availability sets | Large stateless fleets, Service Fabric, AKS |

Autoscale (Azure Monitor) works with a profile and rules:

| Element | Meaning |
| --- | --- |
| Minimum / maximum / default | Bounds of the instance count, and the default count |
| Scale-out rule | Example: Percentage CPU above 70 % on average, increase the count |
| Scale-in rule | Example: Percentage CPU below 30 %, decrease the count. Always pair it with a scale-out rule |
| Duration | Time over which the metric is averaged (10 minutes in the portal default rule) |
| Cool down | Wait before the next scale action (5 minutes by default) |
| Scale-in policy | Which instances are removed: Default (balance across zones, then fault domains, then highest instance ID), NewestVM or OldestVM |

```bash
az vmss scale --resource-group RG1 --name VMSS1 --new-capacity 5
az monitor autoscale create --resource-group RG1 --resource VMSS1 \
  --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name autoscale1 --min-count 2 --max-count 10 --count 2
az monitor autoscale rule create --resource-group RG1 --autoscale-name autoscale1 \
  --condition "Percentage CPU > 70 avg 5m" --scale out 2
az monitor autoscale rule create --resource-group RG1 --autoscale-name autoscale1 \
  --condition "Percentage CPU < 30 avg 5m" --scale in 1
```

> **Exam trap.** Resizing (scale up) changes the size of one VM and restarts it; a scale set adds or removes instances (scale out) without changing their size. "Handle more users during business hours with no downtime" points to a scale set with autoscale, not to a bigger size.

<!-- section: availability | objectives: 3.2.3 -->
## Managing availability sets and availability zones

| | Availability set | Availability zones |
| --- | --- | --- |
| Protects against | Hardware, rack, power or network switch failure in one datacenter | Loss of a whole datacenter (power, cooling, network) in the region |
| How | Fault domains (up to 3) and update domains (up to 20, 5 by default) | VMs placed in zones 1, 2 or 3 (zonal), with zone-redundant or zonal resources |
| SLA for two or more VMs | 99.95 % | 99.99 % |
| Latency between VMs | Lower | Higher |
| Choice | At creation only | At creation (zone of a VM) |

Rules to remember:

- A VM is added to an availability set only **when it is created**. To change it, delete the VM (with its disks set to detach) and recreate it from the existing disks.
- Fault and update domain counts can't be changed after the set is created. With five update domains, the sixth VM shares the first VM's update domain. During planned maintenance, only one update domain restarts at a time, with 30 minutes to recover.
- Managed disks of a VM are aligned to its fault domain; a region has two or three managed-disk fault domains. Only VMs with managed disks can join a managed availability set.
- Availability sets and zones are mutually exclusive for a VM. Availability sets don't support Ultra Disks.
- Microsoft recommends Virtual Machine Scale Sets with Flexible orchestration for new deployments: they spread instances across fault domains or zones.
- An availability set doesn't protect against an operating system or application failure; you still need two or more VMs behind a load balancer.

```powershell
New-AzAvailabilitySet -ResourceGroupName RG1 -Name AS-Web -Location westeurope `
  -Sku Aligned -PlatformFaultDomainCount 2 -PlatformUpdateDomainCount 5
```

> **Exam trap.** "Protect against the failure of a datacenter" = availability zones. "The region has no availability zones" or "lowest latency between the VMs" = availability set. Neither is chosen after the VM exists.

<!-- section: jit-bastion | objectives: 3.2.4 -->
## Managing just-in-time VM access and Azure Bastion

**Just-in-time (JIT) VM access** keeps management ports closed until an approved request opens them for one source IP address and a limited time.

| Item | Detail |
| --- | --- |
| Prerequisite | Microsoft Defender for Servers **Plan 2** on the subscription; a network security group or an Azure Firewall (classic rules, not Firewall Manager policies) in front of the VM; Azure Resource Manager VMs |
| When enabled | Defender for Cloud adds *deny all inbound* rules for the selected ports (by default 3389 for Windows, 22 for Linux; 5985 and 5986 for WinRM are suggested) |
| Per port | Protocol, allowed source IPs (default any), maximum request time (default 3 hours) |
| On request | Allow rules for the requester's IP address and the requested ports, for the requested time; rules are restored afterward. Established connections aren't cut |
| Where | Defender for Cloud > **Workload protections** > **Just-in-time VM access**, or the VM's **Configuration** page; request from the VM's **Connect** page |
| Permissions to request | `Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action` plus read on the VM and network resources |

```powershell
$JitPolicy = (@{
    id="/subscriptions/<sub-id>/resourceGroups/RG1/providers/Microsoft.Compute/virtualMachines/VM1";
    ports=(@{ number=3389; protocol="*"; allowedSourceAddressPrefix=@("*"); maxRequestAccessDuration="PT3H"})})
Set-AzJitNetworkAccessPolicy -Kind "Basic" -Location "westeurope" -Name "default" `
  -ResourceGroupName "RG1" -VirtualMachine @($JitPolicy)
```

**Azure Bastion** gives RDP and SSH over TLS from the portal or a native client, without a public IP address on the VM.

| Feature | Developer | Basic | Standard | Premium |
| --- | --- | --- | --- | --- |
| Dedicated AzureBastionSubnet and public IP | No | Yes | Yes | Subnet yes; no public IP with private-only deployment |
| VMs in peered virtual networks | No | Yes | Yes | Yes |
| Native client (`az network bastion rdp`), file transfer | No | No | Yes | Yes |
| Shareable link, IP-based connection, custom port | No | No | Yes | Yes |
| Host scaling | No | No (2 instances) | 2 to 50 instances | 2 to 50 instances |
| Session recording, private-only deployment | No | No | No | Yes |

- The subnet must be named **AzureBastionSubnet**, /26 or larger, in the virtual network of the host. The public IP address is Standard SKU, static.
- You can upgrade a SKU, never downgrade it.
- To connect, a user needs Reader on the VM, on its NIC and on the Bastion resource (plus the virtual network of the VM when Bastion is in a peered network), and the right to sign in to Windows (Remote Desktop Users or Administrators). The VM needs no public IP address.

```bash
az network bastion rdp --name Bastion1 --resource-group RG1 \
  --target-resource-id "/subscriptions/<sub-id>/resourceGroups/RG1/providers/Microsoft.Compute/virtualMachines/VM1"
```

> **Exam trap.** "Connect from the local Remote Desktop client through Bastion" needs Standard or Premium (native client), and "keep the Bastion host without any public IP address" needs Premium (private-only).

<!-- section: vm-network | objectives: 3.2.5 -->
## Managing Azure VM network configuration

A VM connects through one or more **network interfaces** (NICs). Each NIC has a primary IP configuration (private IPv4, optional public IP) and optional secondary IP configurations.

| Task | Rule |
| --- | --- |
| Give a VM a fixed private IP address | Set the NIC IP configuration to **Static** in Azure. Never set the address manually in Windows, except secondary addresses that you add in the guest |
| Address range | Any address of the subnet except the five reserved by Azure (network, `.1` gateway, `.2` and `.3` DNS mapping, broadcast) |
| Add a second NIC | Deallocate the VM, add the NIC, start the VM. All NICs are in the **same virtual network** (different subnets allowed); the VM size limits the number of NICs; one NIC is primary |
| Move a NIC | It can change subnet, never virtual network; NIC, virtual network and VM share subscription and region |
| Delete a NIC | Only when it isn't attached to a VM |
| Accelerated Networking (SR-IOV) | Supported sizes and images; enable it only while the VM is stopped (deallocated) |
| Filter traffic | NSG on the NIC and/or the subnet; check **Effective security rules** on the NIC |
| DNS servers | Inherited from the virtual network or custom per NIC (overrides the virtual network). Run `ipconfig /renew` or restart the VM after a change |
| Act as a router or firewall | Enable **IP forwarding** on the NIC, and forwarding in the guest |

```bash
# Static private IP and custom DNS on a NIC
az network nic ip-config update --resource-group RG1 --nic-name vm1-nic \
  --name ipconfig1 --private-ip-address 10.0.1.10
az network nic update --resource-group RG1 --name vm1-nic --dns-servers 10.0.1.4 10.0.1.5
az network nic update --resource-group RG1 --name nva1-nic --ip-forwarding true

# Add a second NIC to a deallocated VM
az vm deallocate --resource-group RG1 --name VM1
az vm nic add --resource-group RG1 --vm-name VM1 --nics vm1-nic2
az vm start --resource-group RG1 --name VM1
```

With multiple NICs, Windows gets a default gateway only on the primary NIC: add routes in the guest for traffic that must leave through a secondary NIC.

> **Exam trap.** A static IP address typed in the Windows network settings of an Azure VM breaks connectivity when it doesn't match the NIC. Configure static allocation on the Azure NIC and leave Windows on DHCP.

<!-- section: key-points -->
## Key points

- Temp disk D: is lost when the VM is deallocated or redeployed; OS disk up to 4,095 GiB but 2 TiB usable with MBR.
- Expand an OS disk deallocated, then extend the volume in Windows; no shrink; disk type change deallocated, twice a day.
- Resizing restarts the VM; deallocate when the size isn't available on the cluster (all VMs of an availability set).
- Flexible scale sets: mixed instances, existing VMs, zones; autoscale = min/max/default + paired rules + cool down.
- Availability set 99.95 % (fault domains, update domains) vs zones 99.99 %; chosen at creation.
- JIT = Defender for Servers Plan 2 + NSG or Azure Firewall; Bastion = AzureBastionSubnet /26, native client from Standard, private-only in Premium.
- Static IP, extra NICs, accelerated networking and DNS servers are configured on the Azure NIC, not in the guest.
