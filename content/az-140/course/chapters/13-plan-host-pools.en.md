Before you deploy a single session host, you decide where the resources live, which Windows runs on the hosts, how users are licensed, what kind of host pool serves them and how many virtual machines of which size it needs. Exam questions give you a population of users and a constraint (cost, isolation, external customers, graphics, peak sign-ins) and ask for the operating system, the license, the host pool type and settings, or the number and size of hosts.

<!-- section: resource-organization | objectives: 1.3.1 -->
## Resource groups, subscriptions and management groups

A typical enterprise layout separates resources by lifecycle and owner:

| Level | Contents |
| --- | --- |
| Management group | The Azure Virtual Desktop landing zone subscriptions, under the platform's management group hierarchy: Azure Policy and Azure RBAC assigned once for every subscription, present and future |
| Platform subscriptions | Connectivity (hub virtual network, Azure Firewall, VPN or ExpressRoute gateway), identity (domain controllers or Microsoft Entra Domain Services), management |
| Shared services subscription | Azure Compute Gallery, Log Analytics workspaces, data collection rules, automation |
| Workload subscriptions | Session hosts, storage accounts, key vaults, private endpoints; scale decides how many |

Inside a workload subscription, use one resource group per lifecycle and region:

| Resource group | Contents | Why separate |
| --- | --- | --- |
| Service objects | Host pools, application groups, workspaces, scaling plans | Small, long-lived metadata; delegate it to the Azure Virtual Desktop administrators |
| Pool compute | Session host VMs, disks, network interfaces | Rebuilt at every image update; delete and recreate without touching the rest |
| Storage | Profile and App attach storage accounts or NetApp accounts | Holds user data: protect it with a lock and stricter roles |
| Network | Spoke virtual network, NSGs, route tables | Often managed by the network team |

Rules that decide answers:

- The metadata of host pools, application groups and workspaces is stored in the geography of the region you choose (**geographical** deployment scope, the default), or in that region only (**regional** scope, offered in a few regions). Session hosts can run in any region.
- Keep a host pool's session hosts in one region, close to users, with their virtual network, profile storage and images. For users in two regions, build a host pool per region.
- Microsoft recommends no more than **5,000 VMs per subscription per region**; beyond that, add subscriptions as spokes peered to the hub, or use another region.
- Service limits: 10,000 session hosts per host pool, 500 RemoteApps per application group, 200 role assignments per Azure Virtual Desktop object.
- Session host name prefixes can't exceed 11 characters (10 with a session host configuration): Azure adds a suffix and the NetBIOS name is limited to 15 characters.
- Tags (cost center, environment, owner) feed Cost Management filters and automation.

> **Exam trap.** A question that asks where to assign a policy or a role "for all Azure Virtual Desktop subscriptions, including those created later" wants the management group, not each subscription.

<!-- section: operating-system | objectives: 1.3.2 -->
## Choose the session host operating system

Supported session host operating systems, 64-bit only:

| Operating system | Sessions per host | Typical use |
| --- | --- | --- |
| Windows 11 Enterprise multi-session | Several | Pooled host pools: the default choice |
| Windows 11 Enterprise | One | Personal host pools |
| Windows 10 Enterprise multi-session and Windows 10 Enterprise | Several / one | Existing deployments only |
| Windows Server 2025, 2022, 2019, 2016 | Several | Apps that require a server OS, or organizations licensed with RDS CALs |

Not supported for session hosts: 32-bit editions, N, KN and LTSC editions, Ultra disks as the OS disk, ephemeral OS disks, Virtual Machine Scale Sets, and Arm64-based Azure VMs.

| Requirement | Answer |
| --- | --- |
| Many users, Windows client experience, lowest cost per user | Windows 11 Enterprise multi-session, pooled |
| One user needs local admin rights or a dedicated, persistent machine | Windows 11 Enterprise, personal |
| An application vendor supports only Windows Server, or users are licensed with RDS CALs | Windows Server 2025 |
| Users are licensed with Microsoft 365 E3 and need Microsoft 365 Apps | Windows 11 Enterprise multi-session image with Microsoft 365 Apps from Azure Marketplace |

Windows 10 reached end of support on October 14, 2025. Windows 10 session hosts in Azure Virtual Desktop are eligible for Extended Security Updates without an extra license, on version 22H2, but Microsoft recommends using them only when an app or hardware dependency blocks Windows 11.

> **Exam trap.** Windows 11 Enterprise multi-session isn't Windows Server: it is licensed with the users' Windows client entitlement (Microsoft 365 E3, E5, F3...), not with RDS CALs. A Windows Server session host is the case that needs RDS CALs.

<!-- section: licensing | objectives: 1.3.3 -->
## Choose a licensing model

| Session host OS | Internal users (employees, students, contractors) | External users (customers of your SaaS app) |
| --- | --- | --- |
| Windows 11 or 10 Enterprise, single or multi-session | Microsoft 365 E3, E5, A3, A5, F3, Business Premium, Student Use Benefit; Windows Enterprise E3, E5; Windows Education A3, A5; Windows VDA per user | Per-user access pricing, by enrolling the Azure subscription |
| Windows Server 2016 to 2025 | RDS CAL with Software Assurance (per user or per device), or RDS User Subscription Licenses | Not supported: per-user access pricing isn't available for Windows Server |

The license grants access rights only. Compute, storage and networking are always billed by Azure on top.

**Per-user access pricing** is for external commercial purposes only:

- Enroll the Azure subscription; charges appear on its bill.
- A user is charged a flat monthly price only if they connect at least once in the billing month: the **Apps** tier if they used only RemoteApps, the **Desktops + apps** tier if they used a full desktop.
- At most one charge per user per billing period, even across several subscriptions in the tenant.
- It covers Azure Virtual Desktop access rights and FSLogix, not Microsoft Office, Microsoft Defender XDR or Universal Print.
- An enrolled subscription also charges users who already hold an eligible license: put internal users in a separate, non-enrolled subscription.

Other rules:

- External collaborators (guests, B2B) are internal use: assign them an eligible license in your tenant. A license in their home tenant doesn't count, and per-user access pricing isn't a way to license guests.
- Session hosts must carry the right license type and be activated. The portal applies `Windows_Client` automatically; for Windows client VMs created with PowerShell or the Azure CLI, set it yourself.
- Windows Server session hosts need an RDS license server reachable from the session hosts.
- Azure Dev/Test subscriptions let users connect for acceptance testing without a separate license.

```powershell
$vm = Get-AzVM -ResourceGroupName "rg-avd-pool-compute" -Name "avd-sh-0"
$vm.LicenseType = "Windows_Client"
Update-AzVM -ResourceGroupName "rg-avd-pool-compute" -VM $vm
```

> **Exam trap.** "Contoso sells access to its accounting app to external companies" means per-user access pricing on Windows client session hosts. If the app needs Windows Server, there is no compliant per-user option in Azure Virtual Desktop.

<!-- section: host-pool-architecture | objectives: 1.3.4 -->
## Plan the host pool architecture

| Feature | Pooled | Personal |
| --- | --- | --- |
| Users per session host | Several, up to the max session limit | One |
| Load balancing | Breadth-first or depth-first | None: users always return to their assigned host |
| Assignment | None: any host | Automatic (first available host) or direct (an administrator assigns the host) |
| User data | FSLogix containers | Can stay on the OS disk |
| Updates | Redeploy hosts from an updated image | Windows Update, Configuration Manager or other tools |
| Application groups | Desktop and RemoteApp | Desktop |

Load balancing in a pooled host pool:

- **Breadth-first** spreads new sessions: it picks randomly among the half of available hosts with the fewest sessions. No session limit is required; created with breadth-first, a host pool's **max session limit** defaults to 999999, the highest value.
- **Depth-first** fills one host up to the max session limit, then the next one. A max session limit is required. It keeps fewer hosts busy, which autoscale can turn off.
- When every host reaches the limit, new users can't connect: raise the limit or add hosts. Lowering the limit doesn't affect existing sessions.
- **Drain mode** on a host stops new sessions there, but a user with an existing or disconnected session on it is still sent back to it.

Other design choices:

- **Application groups**: one desktop application group per host pool, several RemoteApp groups. If a user is assigned both types on the same host pool, only the **preferred application group type** is shown. Each application group belongs to one workspace.
- **Management approach**, chosen at creation and never changed: **session host configuration** (pooled only: the service creates, updates and scales hosts from a configuration of image, size, join and network) or **standard** (you manage hosts with your own tools and registration tokens).
- **Validation environment**: a host pool flagged as validation receives service updates first. Make it similar to production and use it regularly.
- All hosts of a pool should come from the same image. Different apps, sizes or identity types mean different host pools.

| Requirement | Answer |
| --- | --- |
| 300 call-center agents with the same apps, lowest cost | Pooled, Windows 11 multi-session, depth-first with autoscale |
| Developers who install their own tools and need admin rights | Personal, direct or automatic assignment |
| Spread users evenly for the best performance per user | Pooled, breadth-first |
| Publish only a line-of-business app to finance users | RemoteApp application group on a pooled host pool |
| Test agent and service updates before production | A validation host pool |

> **Exam trap.** Depth-first without a correct max session limit puts everyone on the first host. Breadth-first ignores the limit until hosts are full; depth-first depends on it.

<!-- section: performance | objectives: 1.3.5 -->
## Design for performance

Multi-session sizing baseline (Microsoft's starting points, to validate with a pilot):

| Workload | Example users | Max users per vCPU | Minimum host | Example sizes |
| --- | --- | --- | --- | --- |
| Light | Basic data entry | 6 | 8 vCPUs, 16 GB RAM | D8s_v5, D8as_v4, F8s_v2 |
| Medium | Consultants, Word, static web pages | 4 | 8 vCPUs, 16 GB RAM | D8s_v5, D16s_v5 |
| Heavy | Engineers, Outlook, PowerPoint, dynamic web | 2 | 8 vCPUs, 16 GB RAM | D8s_v5, D16s_v5 |
| Power | Designers, CAD, video editing | 1 | 6 vCPUs, 56 GB RAM | D16ds_v5, NV-series |

Single-session (personal) baseline: 2 vCPUs and 8 GB for light, 4 vCPUs and 16 GB for medium, 8 vCPUs and 32 GB for heavy workloads.

Rules for multi-session hosts:

- At least 4 cores (2-core hosts are unstable with several users), at most 32; 4 to 24 vCPUs gives the best returns. Doubling cores multiplies capacity by only 1.5 to 1.9.
- With 20 or more users, several smaller hosts beat one large host, and they are easier to drain, update and turn off.
- Sign-in is CPU-intensive: keep headroom for the morning peak.
- Profile storage is part of performance: premium Azure Files or Azure NetApp Files, in the hosts' region.

**GPU** for graphics-intensive apps (3D, CAD, video) or when the total display resolution exceeds 3840 × 2160, where CPU encoding starts to produce artifacts:

| VM series | Rendering | Encoding |
| --- | --- | --- |
| NVadsA10 v5, NCasT4_v3 | Yes | HEVC/H.265 and AVC/H.264 |

- The NVv3 and NVv4 series, still listed on the Azure Virtual Desktop GPU page, had their retirement planned for September 30, 2026: don't plan new session hosts on them.
- HEVC/H.265 encoding needs Windows 10 or Windows 11 session hosts (not Windows Server) and GRID driver 16.2 or later.
- Avoid NC, NCv2, NCv3, ND and NDv2: built for compute, they don't accelerate the Windows desktop.
- NVIDIA sizes need the **GRID** driver (the NVIDIA GPU Driver Extension installs it), not CUDA. Only drivers distributed by Azure are supported.
- Enable the policies **Use hardware graphics adapters for all Remote Desktop Services sessions** and **Configure H.264/AVC hardware encoding for Remote Desktop connections**, then restart the hosts.

> **Exam tip.** "Users run a CAD application and complain about choppy graphics" calls for an NV-series GPU host with the GRID driver and the hardware rendering and encoding policies, not for more vCPUs.

<!-- section: vm-capacity | objectives: 1.3.6 -->
## Design for virtual machine capacity

Work from concurrency, not from the headcount:

1. **Concurrent users** at peak: 1,000 employees with 60 % connected at 10 AM means 600 sessions.
2. **Users per host**: medium workload, 4 users per vCPU, D8s_v5 (8 vCPUs): 32 users per host.
3. **Hosts**: 600 ÷ 32 = 18.75, so 19 hosts, plus headroom for a host in drain mode or being updated: 20.
4. **Quota**: 20 × 8 = 160 vCPUs of the DSv5 family in the region. Check the regional and per-family vCPU quotas of the subscription and request an increase before deploying.
5. **Max session limit**: 32, used by depth-first and by autoscale to decide when to start another host.

Personal host pools need one VM per user, active or not: 200 developers mean 200 VMs. Start VM on Connect and autoscale for personal host pools keep the cost down by deallocating idle machines.

| Requirement | Answer |
| --- | --- |
| Capacity follows office hours | Scaling plan (autoscale) with ramp-up, peak, ramp-down and off-peak phases |
| Survive the loss of a datacenter | Spread session hosts across availability zones |
| More than 5,000 VMs in one region | Several subscriptions, or a second region |
| Users in Europe and in North America | One host pool per region, each with its own storage, close to its users |

> **Exam trap.** The regional vCPU quota counts the cores of deployed VMs, allocated or deallocated. Hosts that autoscale turns off still consume quota: plan it for every host of the pool, not for those running off-peak.

<!-- section: key-points -->
## Key points

- Separate resource groups by lifecycle: service objects, compute, storage, network; governance at the management group.
- Up to 5,000 VMs per subscription per region; 10,000 session hosts per host pool; host name prefix of 11 characters at most (10 with a session host configuration).
- Windows 11 Enterprise multi-session for pooled, Windows 11 Enterprise for personal, Windows Server when an app or RDS CAL licensing requires it.
- Internal users: eligible per-user Windows client licenses or RDS CALs for Windows Server. External users: per-user access pricing, Windows client only.
- Breadth-first spreads, depth-first fills up to the max session limit; personal pools use automatic or direct assignment.
- Session host configuration is pooled only and chosen at creation.
- Size from peak concurrency: users per vCPU, 4 to 24 vCPUs per host, headroom, vCPU quota; GPU (NV-series, GRID driver) for graphics.
