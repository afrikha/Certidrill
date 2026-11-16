Virtual machines are the most configurable compute service of Azure, and the exam questions go into detail: sizes, disks, encryption, availability and scale sets.

<!-- section: create-vm | objectives: 3.2.1 -->
## Creating a virtual machine

A virtual machine is a set of resources: the machine itself, an **OS disk**, a **network interface** in a subnet of a virtual network, and optionally a public IP address, a network security group and data disks. The machine and its virtual network must be in the **same region and subscription**; the network can be in another resource group.

Choices at creation: region and availability option, **image** (Marketplace or your own from an Azure Compute Gallery), **size**, administrator account (password, or SSH public key for Linux), disks, network, management options (managed identity, auto-shutdown, backup, boot diagnostics).

```bash
az vm create -g RG1 -n VM1 --image Ubuntu2204 --size Standard_D2s_v5 \
  --admin-username azureuser --generate-ssh-keys \
  --vnet-name VNet1 --subnet Subnet1 --zone 2 --public-ip-sku Standard
```

```powershell
New-AzVM -ResourceGroupName RG1 -Name VM1 -Location westeurope -Image Win2022Datacenter `
  -Size Standard_D2s_v5 -VirtualNetworkName VNet1 -SubnetName Subnet1 -Credential (Get-Credential)
```

**Power states and billing:**

| State | How you get there | Compute billed |
| --- | --- | --- |
| Running | Start | Yes |
| Stopped | Shut down from inside the operating system | **Yes**: the hardware stays allocated |
| Stopped (deallocated) | *Stop* in the portal, `az vm deallocate`, `Stop-AzVM` | No. Disks are still billed. The content of the temporary disk is lost |

**Connecting:** RDP (TCP 3389) for Windows, SSH (TCP 22) for Linux, through a public IP address, a VPN, or **Azure Bastion** (no public IP on the machine). Signing in with Microsoft Entra ID requires the *Virtual Machine Administrator Login* or *Virtual Machine User Login* role.

**Configuring after creation:**

| Mechanism | Use |
| --- | --- |
| **Custom Script Extension** | Downloads and runs a script (from a storage account or GitHub) at or after deployment. One execution of up to 90 minutes; secrets go in *protected settings*; it can read private blobs with the machine's managed identity |
| **cloud-init** | First-boot configuration of Linux machines (`--custom-data`) |
| **Desired State Configuration** extension | Keeps a Windows configuration in the desired state |
| **Run Command** | Runs a script on a running machine through the Azure agent, even without network access to it |

**Spot virtual machines** use unused capacity at a large discount, without SLA: Azure can evict them at any time with 30 seconds' notice. Eviction policy **Deallocate** (default: the machine is stopped, disks are kept and billed) or **Delete** (machine and disks removed).

Other facts: **boot diagnostics** shows a screenshot and the serial log of a machine that doesn't start; **redeploy** moves the machine to another host (fixes host problems; the temporary disk is lost); **Azure Hybrid Benefit** reuses Windows Server licenses.

<!-- section: disk-encryption | objectives: 3.2.2 -->
## Disk encryption

| Option | Where encryption happens | Covers | Key |
| --- | --- | --- | --- |
| **Server-side encryption** (SSE) with platform-managed keys | Storage service | OS and data disks at rest. **Always on** | Microsoft |
| SSE with **customer-managed keys** | Storage service | Same | Your key in Key Vault, through a **disk encryption set** |
| **Encryption at host** | The host server of the machine | Also the **temporary disk and disk caches**, and the data flow to storage | Platform or customer-managed |
| **Azure Disk Encryption** (ADE) | Inside the guest: **BitLocker** (Windows) or **DM-Crypt** (Linux) | OS and data volumes | Secrets in **Azure Key Vault** |
| Confidential disk encryption | Bound to the machine's TPM | Confidential virtual machines | Platform or customer-managed |

Azure Disk Encryption requirements, the classic exam topic:

- A key vault in the **same region and subscription** as the virtual machine, with the access policy **Azure Disk Encryption for volume encryption** enabled (`EnabledForDiskEncryption`).
- A supported size and OS: not Basic or A-series machines, and enough memory.
- The machine must be **running**: the extension encrypts volumes from inside the guest.
- Encrypt the OS disk before or together with the data disks on Windows.

```powershell
Set-AzVMDiskEncryptionExtension -ResourceGroupName RG1 -VMName VM1 `
  -DiskEncryptionKeyVaultUrl $kv.VaultUri -DiskEncryptionKeyVaultId $kv.ResourceId
```

```bash
az vm encryption enable -g RG1 -n VM1 --disk-encryption-keyvault kv1 --volume-type All
```

Encryption at host: register the `EncryptionAtHost` feature on the subscription, then enable it at creation, or on an existing machine after **deallocating** it. It can't be combined with Azure Disk Encryption on the same machine.

> **Exam trap.** Azure Disk Encryption is scheduled for retirement on September 15, 2028, and Microsoft recommends encryption at host for new deployments. It is still in the exam objectives: know both.

<!-- section: move-vm | objectives: 3.2.3 -->
## Moving a virtual machine

| Move to | How | Notes |
| --- | --- | --- |
| Another **resource group** | Move operation (portal, `az resource move`, `Move-AzResource`) | No downtime; the resource ID changes; move the machine with its disks and network interface |
| Another **subscription** | Same operation | Same tenant; all dependent resources in one resource group and moved together; the virtual network must move too, with everything attached to it. Not possible while Azure Disk Encryption is enabled; machines with Marketplace plans and some others have restrictions |
| Another **region** | **Azure Resource Mover** (or Azure Site Recovery) | The machine is replicated, then recreated in the target region |
| Another **availability zone** | Move from the portal (regional to zonal), or recreate from snapshots | |

Azure Resource Mover steps: add the resources to a **move collection** for a source and destination region pair; **resolve dependencies**; **prepare** (replication starts); **initiate move** (resources are created in the target region); **commit** (or **discard** before committing); finally **delete the source** resources yourself.

A resource group move never changes the region of a resource.

<!-- section: vm-sizes | objectives: 3.2.4 -->
## Virtual machine sizes

| Family | Type | Typical workload |
| --- | --- | --- |
| B | Burstable | Low average CPU usage: test servers, small web sites |
| D | General purpose | Most applications, balanced CPU and memory |
| F | Compute optimized | High CPU-to-memory ratio: batch, application servers |
| E, M | Memory optimized | Databases, in-memory caches |
| L | Storage optimized | High disk throughput and IOPS |
| N | GPU | Rendering, machine learning |
| H | High performance computing | Simulation |

Reading a size name, for example `Standard_E16ads_v5`: family **E**, **16** vCPUs, **a** = AMD processor, **d** = local temporary disk, **s** = supports **Premium Storage**, **v5** = generation. Without the `s`, Premium SSD disks can't be attached.

Resizing:

- Changing the size **restarts** the machine.
- A running machine can only take a size available on its current hardware cluster. If the size isn't listed, **deallocate** the machine first: all sizes of the region become available.
- In an **availability set**, when the new size isn't available on the cluster, **all the machines of the set** must be deallocated before resizing.
- Quotas (vCPUs per family and per region) can block a resize.

```bash
az vm list-vm-resize-options -g RG1 -n VM1 --output table
az vm deallocate -g RG1 -n VM1
az vm resize -g RG1 -n VM1 --size Standard_E4s_v5
az vm start -g RG1 -n VM1
```

```powershell
Get-AzVMSize -ResourceGroupName RG1 -VMName VM1
$vm = Get-AzVM -ResourceGroupName RG1 -Name VM1
$vm.HardwareProfile.VmSize = "Standard_E4s_v5"
Update-AzVM -ResourceGroupName RG1 -VM $vm
```

<!-- section: vm-disks | objectives: 3.2.5 -->
## Virtual machine disks

| Disk role | Content | Persistence |
| --- | --- | --- |
| OS disk | Operating system (`C:` or `/`) | Managed disk, persistent |
| **Temporary disk** | Page file, scratch data (`D:` on Windows, `/dev/sdb1` on Linux) | **Lost** on deallocation, redeploy, resize or host maintenance. Never store data on it |
| Data disks | Application data | Managed disks, persistent. The maximum number depends on the size |

| Disk type | Performance | OS disk | Use |
| --- | --- | --- | --- |
| Standard HDD | Lowest | Yes | Backups, rarely accessed data |
| Standard SSD | Consistent, moderate | Yes | Web servers, test and development |
| Premium SSD | High | Yes | Production; requires an `s` size |
| **Premium SSD v2** | Higher; IOPS and throughput set independently of size, **changed without downtime** | **No** | Demanding databases, cheaper than Ultra |
| **Ultra Disk** | Highest, sub-millisecond latency | **No** | The most demanding workloads |

Operations:

- **Expand** a disk at any time (data disks online, with limits around 4 TiB for older types); then extend the volume inside the operating system. A disk can **never be shrunk**.
- **Change the type** between Standard HDD, Standard SSD and Premium SSD; the usual procedure is to deallocate the machine, change the type, then start it.
- **Attach and detach** data disks while the machine runs.
- **Host caching**: None, ReadOnly or ReadWrite.
- **Snapshot**: point-in-time read-only copy of one disk. *Full* or **incremental** (only the changes since the previous one, billed for the used size, stored on Standard HDD). A snapshot can create a new disk.
- **Image**: generalized copy of a whole machine (`sysprep` on Windows, `waagent -deprovision` on Linux) stored in an Azure Compute Gallery to create identical machines.
- Disk redundancy: LRS, or ZRS for Premium SSD and Standard SSD.

```bash
az disk update -g RG1 -n VM1-data1 --size-gb 512
az vm disk attach -g RG1 --vm-name VM1 --name VM1-data2 --new --size-gb 128 --sku Premium_LRS
az snapshot create -g RG1 -n snap1 --source VM1-data1 --incremental true
```

<!-- section: vm-availability | objectives: 3.2.6 -->
## Availability zones and availability sets

| Option | Protects against | SLA | How |
| --- | --- | --- | --- |
| Single machine with Premium SSD or Ultra disks | Nothing beyond disk durability | 99.9 % | |
| **Availability set** | Failure of a rack (**fault domain**) and planned maintenance (**update domain**) inside one datacenter | 99.95 % | Up to 3 fault domains and 20 update domains (default 5) |
| **Availability zones** | Failure of a whole **datacenter** | 99.99 % | Two or more machines in two or more zones of the region |
| Virtual Machine Scale Sets | According to its configuration (zones or fault domains) | | Adds elasticity |

- A **fault domain** shares a power source and a network switch. An **update domain** is a group restarted together during planned maintenance; only one update domain is restarted at a time.
- Machines are assigned to update domains in turn: with 5 update domains and 7 machines, two domains hold 2 machines. At most that many machines restart together.
- A machine can join an availability set **only at creation**. To change it, delete the machine while keeping its disks and network interface, then recreate it.
- A machine is in an availability set **or** in a zone, not both. Availability sets remain useful in regions without zones.
- All machines of an availability set should run the same application tier, behind a load balancer. Across zones, use a **zone-redundant** Standard load balancer and Standard public IP address.
- A **proximity placement group** places machines close together for low latency; it works against resilience, not for it.

```bash
az vm availability-set create -g RG1 -n AS1 \
  --platform-fault-domain-count 2 --platform-update-domain-count 5
az vm create -g RG1 -n VM1 --image Ubuntu2204 --availability-set AS1
```

<!-- section: vmss | objectives: 3.2.7 -->
## Virtual Machine Scale Sets

A scale set manages a group of load-balanced machines created from the same configuration, and changes their number manually, on a schedule or automatically.

| Orchestration mode | Characteristics |
| --- | --- |
| **Flexible** (default, recommended) | Standard virtual machines; different sizes and operating systems can be mixed; existing machines can be added; spread across fault domains or zones |
| **Uniform** | Identical instances from the scale set model; managed through the scale set APIs |

**Autoscale** (Azure Monitor autoscale) is defined by:

- **Instance limits**: minimum, maximum and default. No rule ever goes outside the limits.
- **Rules**: a metric (for example *Percentage CPU*, a host metric that needs no agent), an aggregation over a time window, a threshold, an action (increase or decrease count by N, or to N) and a **cool down** period.
- Always pair a **scale-out** rule with a **scale-in** rule; otherwise the set never shrinks.
- **Profiles**: default, recurring schedule (weekdays) or fixed dates, each with its own limits and rules.

```bash
az monitor autoscale create -g RG1 --name as-vmss1 --resource vmss1 \
  --resource-type Microsoft.Compute/virtualMachineScaleSets --min-count 2 --max-count 10 --count 2
az monitor autoscale rule create -g RG1 --autoscale-name as-vmss1 \
  --condition "Percentage CPU > 70 avg 10m" --scale out 2
az monitor autoscale rule create -g RG1 --autoscale-name as-vmss1 \
  --condition "Percentage CPU < 30 avg 10m" --scale in 1
```

Other settings:

| Setting | Values |
| --- | --- |
| **Upgrade policy** (how instances receive a model change) | **Manual** (you upgrade each instance), **Automatic** (all at once, in random order), **Rolling** (in batches with health checks; recommended for production) |
| **Scale-in policy** (which instance is removed) | **Default** (balance zones and fault domains, then highest instance ID), **NewestVM**, **OldestVM** |
| Instance protection | Protect an instance from scale-in or from scale set actions |
| Automatic instance repairs | Replace unhealthy instances (needs the Application Health extension or a load balancer probe) |
| Zones | Spread instances across zones for resilience |
| Spot | Use Spot instances for interruptible workloads |

A scale set supports up to 1,000 instances. Manual scale: `az vmss scale -g RG1 -n vmss1 --new-capacity 5`.

<!-- section: key-points -->
## Key points

- Stopped from the OS = still billed; deallocated = not billed for compute, temporary disk lost.
- SSE is always on; encryption at host adds temp disk and caches; Azure Disk Encryption works in the guest and needs a key vault in the same region enabled for disk encryption.
- Resource group and subscription moves keep the region; region moves use Azure Resource Mover.
- `s` in a size = Premium Storage. Resize restarts; deallocate when the size isn't available (the whole availability set if needed).
- Ultra Disk and Premium SSD v2 can't be OS disks; disks grow but never shrink; incremental snapshots are the cheapest.
- Availability set: fault and update domains, 99.95 %, only at creation. Zones: 99.99 %.
- Scale sets: Flexible or Uniform; autoscale limits bound every rule; upgrade policy Manual, Automatic or Rolling.
