# FIX-az-802-2 — chapters 22, 31, 32, 33 and 41 corrected from the quiz reports

Checked on 2026-11-24. Results: `check-cert az-802 22-azure-hybrid-services 31-hyper-v-guests 32-hyper-v-storage-networking 33-azure-vms 41-name-resolution` 0 problems; `content:validate --cert az-802` 0 problems, 0 warnings (638 files); `check-quiz az-802` (same chapters) 0 problems, 0 warnings.

Sources: WebFetch on learn.microsoft.com for every change below, except where "(source repo)" is written. The shared WebFetch budget was used up several times during the task (and the hourly limit at the end). Those points were read in the Learn source repositories (MicrosoftDocs/windowsserverdocs clone of 2026-11-16, azure-docs, azure-compute-docs, windows-powershell-docs on raw.githubusercontent.com).

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. No section marker changed.

## 22-azure-hybrid-services

| Finding | Learn | Change |
| --- | --- | --- |
| Automatic agent upgrade is preview | **Ambiguous.** Only the meta description of "Manage Azure Connected Machine agent versions" says "(preview)". The body of that page and the specific page "Automatically upgrade the Azure Connected Machine agent" never say preview (agent 1.67 or later, Azure public cloud only) | None. Human decision |
| Monitor mode: lists can't be changed | Confirmed (security-extensions): only monitoring and security extensions, Microsoft maintains the allow list, "you can't modify the extension allow list or block list" in monitor mode, return with `config.mode full`. The code comment "allow only monitoring and security extensions" matches Learn | machine-configuration: new sentence after the lockdown code block |
| Publisher names inconsistent | Confirmed: the Arc extensions table gives `Microsoft.Azure.Key.Vault` and `Microsoft.Compute` (Hybrid Worker), the Key Vault page `Microsoft.Azure.KeyVault`, the Hybrid Worker install and security pages `Microsoft.Azure.Automation.HybridWorker`. The chapter table gives only the type for these three | None (no bank question tests these publisher strings) |
| Key Vault extension "with the server's managed identity" on Arc | Not confirmed either way: the Key Vault extension page covers Azure VMs and scale sets only (managed identity required); the Arc table lists the extension with no authentication detail | None |
| Hybrid Runbook Worker: supported OS stops at Windows Server 2022, Windows PowerShell 5.1 | Confirmed (extension-based-hybrid-runbook-worker-install): list ends at Windows Server 2022, "Windows PowerShell 5.1 … PowerShell Core isn't supported", .NET Framework 4.6.2 | Hybrid Runbook Worker table: new "Requirements" row |
| Which managed identity on a worker | Confirmed (automation-hrw-run-runbooks): the Automation account's system-assigned identity (user-assigned not possible on a worker); once it's enabled, the VM or Arc identity can no longer be used | Authentication paragraph: new sentence |
| (found while checking) "Run As credential" on the group | Learn names it "Hybrid Worker credentials" (Default / Custom, a credential asset); Linux workers don't support it | Identity row reworded |
| Customer Managed Schedules for Arc | **Finding not confirmed; the bank is right.** "Scheduling Recurring Updates in Azure Update Manager": "For Azure Arc-enabled machines, it is not a requirement." The dynamic scoping prerequisites are in tabs: the Arc tab says "There are no prerequisites for patch orchestration" (source repo include `dynamic-scope-prerequisites.md`; WebFetch shows only the Azure VM tab) | Patch orchestration table and Key points: "of Azure VMs" added |
| WSM enabled by Azure Arc conditions | Consistent with chapter 22 (chapter 21 isn't mine) | None |
| One-time update limits | Not in the chapter, not tested | None |

## 31-hyper-v-guests

| Finding | Learn | Change |
| --- | --- | --- |
| GPU-P: number of partitions per VM | **Learn contradicts itself.** "Partition and share GPUs with virtual machines on Hyper-V" (ms.date 2025-07-18, WebFetch): "If you assign more than one GPU partition to a VM, each partition appears as another GPU". "Partition and assign GPUs to a virtual machine in Hyper-V" (ms.date 2025-01-09, source repo; its WebFetch hit the hourly limit): "Currently, you can assign only a single GPU partition to a VM" | None. Human decision (see below) |
| (found while checking) GPU-P supported GPUs | The list now also has NVIDIA RTX Pro 6000 Blackwell Server Edition | Comparison table, Supported GPUs row |
| SSH Direct (`hvc ssh`) has no Learn page | Still none found. Objective 3.1.2 names "SSH Direct for Linux guests" | None. Flag |
| Dynamic Memory: buffer and weight changed while the VM runs | Confirmed: "Dynamic Memory for Hyper-V Virtual Machines" lists only "Increase the maximum memory" and "Decrease the minimum memory" as run-time changes, nothing on buffer or weight | Run-time table row now lists only the two documented changes |
| Turning Dynamic Memory on/off needs the VM off | Not confirmed: the same page says nothing about it | None (chapter, quiz Q4/Q7 and Key points unchanged). Flag |
| DDA and clusters | Consistent: the planning page lists "Adding the VM to a high availability (HA) cluster" as unavailable; the graphics DDA page is for standalone hosts and points to GPU pools for clustered VMs. The chapter says both | None |
| Stale reference titles | DDA planning page now titled "Deploy devices by using Discrete Device Assignment" (title and H1, WebFetch). VMConnect page: the bank title equals the page H1 (the `<title>` is shorter) and the old URL redirects; checkpoints: title "Using checkpoints" unchanged, old URL redirects; PowerShell Direct: old URL redirects | DDA title fixed in 3 bank questions (below). Others left |

## 32-hyper-v-storage-networking

| Finding | Learn | Change |
| --- | --- | --- |
| Stale reference title | "Set up hosts for live migration without Failover Clustering" (WebFetch). The page also confirms the Windows Server 2025 Credential Guard / CredSSP / Kerberos (cifs, Microsoft Virtual System Migration Service) facts of the chapter | Title fixed in 1 bank question |
| Static IP injection, primary vs replica | Learn says both "set these values on both the primary server and replica server" and "You configure static IP injection on the replica VM after replication is enabled"; requires synthetic adapters (not legacy) and the latest integration services (WebFetch, "Replicate a virtual machine with Hyper-V Replica") | Hyper-V Replica section: "after replication is enabled", run on the replica host, synthetic adapters and current integration services. Primary/replica wording left as is (quiz Q10 holds with either reading) |
| VHD Set `-SupportPersistentReservations` not on the VHD Set page | It's an `Add-VMHardDiskDrive` parameter (QZ report) | None |
| `New-VMSwitch` teams by default with several adapters | Doesn't contradict `-EnableEmbeddedTeaming $true` | None |

## 33-azure-vms

| Finding | Learn | Change |
| --- | --- | --- |
| FR « appairés » | Glossary: « peering », avoid « appairage » | Bastion table and Bastion permissions bullet: « connectés par peering » |
| NewestVM / OldestVM balance zones first | Confirmed ("Use scale-in policies with Azure Virtual Machine Scale Sets"): both delete "after balancing VMs across availability zones (for zone-spanning scale sets)" | Autoscale table, Scale-in policy row |
| JIT: Azure Firewall on the same virtual network | Confirmed ("Enable Just-in-Time Access"): supported "VMs protected by Azure Firewall on the same virtual network (VNet) as the VM"; unsupported: firewalls controlled by Azure Firewall Manager | JIT table, Prerequisite row |
| Bursting | Confirmed ("Managed disk bursting"): credit-based for Premium SSD 512 GiB or less and Standard SSD 1,024 GiB or less, on by default, no extra cost, best effort, 30 minutes at the maximum burst rate; on-demand for Premium SSD larger than 512 GiB, you enable it, billed | vm-storage: new sentence after the performance tier sentence |
| Deallocation releases dynamic IPs (Learn inconsistency) | Not checked again; the chapter takes no position | None |
| Uniform maximum 200 vs 100 | The chapter's 100 "with fault domain guarantees" matches the detailed table (QZ report) | None |

## 41-name-resolution

| Finding | Learn | Change |
| --- | --- | --- |
| Conditional forwarder below a hosted zone | Confirmed ("Fix a DNS Forwarder Conflict in Windows Server", ms.date 2026-10-22): an enclosing hosted authoritative zone requires the forwarder to be "at or below an appropriate delegation in that zone", otherwise it's rejected even with a different name; for a child namespace, create a delegation | forwarding section: same bullet, new sentences |
| 168.63.129.16 with VPN Gateway and custom DNS | Confirmed ("Azure Virtual Network Name Resolution Guide", Important note): with Azure VPN Gateway and custom DNS server IPs on a virtual network, 168.63.129.16 "must be added in the list to maintain undisrupted service" | hybrid-dns section: new bullet. Bank question changed (below). Human decision on the design |
| « ancres d'approbation » | Not in the glossary | None. Listed below |

## Mock-exam bank questions changed

- `questions/hybrid/az802-2b-ext-requirements.yaml` (stem EN + FR): the servers run Windows Server **2022** instead of 2025. The answer maps a requirement to the Hybrid Runbook Worker extension, and Learn's supported OS list for the extension-based worker stops at Windows Server 2022. Answer unchanged.
- `questions/networking/az802-4a-vnet-dns-dcs.yaml` (stem EN + FR): VNet1 is connected to on-premises by **an ExpressRoute circuit** instead of a site-to-site VPN. With Azure VPN Gateway, Learn says 168.63.129.16 must be added to the custom DNS list, so the intended answer (DNS servers = DC3 and DC4 only) was incomplete. Answer unchanged.
- Reference titles only: `vms/az802-3a-mem-true-statements`, `vms/az802-3a-dda-mmio`, `vms/az802-3a-dda-limitations` ("Plan for Deploying Devices using Discrete Device Assignment" → "Deploy devices by using Discrete Device Assignment"); `vms/az802-3a-ha-lm-statements` ("Setting Up Hosts for Live Migration Without Failover Clustering" → "Set up hosts for live migration without Failover Clustering"). Same URLs.

## Checked and left unchanged

- Customer Managed Schedules: az802-2b-um-orchestration-hotarea, az802-2b-um-wsus, az802-cs3b-patch-orchestration all say it isn't required for Arc-enabled machines, which Learn confirms.
- Hybrid Runbook Worker: az802-2b-rb-hybrid-credentials (custom Hybrid Worker credentials, matches Learn), az802-sr2-hybrid-worker-* (FS1 runs Windows Server 2022), az802-2b-rb-managed-identity (Automation account system-assigned identity, Azure resources only).
- Extensions: az802-2b-ext-keyvault (Windows Server 2022, matches the Key Vault extension's supported OS; the Arc managed identity sentence isn't contradicted by Learn), az802-2b-ext-cse-command, az802-cs1a-arc-allowlist, az802-2b-ext-both-lists, az802-2b-mc-local-control (monitor mode facts match).
- Memory: az802-3a-mem-* (buffer 5-2000 and priority 0-100 confirmed in the Set-VMMemory reference, source repo; none relies on a run-time buffer or weight change).
- GPU-P: az802-3a-gpup-statements (s1 = No) and az802-cs3c-gpu-partitioning (s3 = No) rely on "one partition per VM". Not changed because Learn is ambiguous (see below).
- JIT and scale sets: az802-cs2c-lab-jit, az802-3b-jit-facts, az802-3b-vmss-* (no Azure Firewall or scale-in policy claim that contradicts the new wording).
- DNS: az802-4a-hybrid-dns-facts (exhibit with custom DNS and a site-to-site VPN, but no statement depends on the 168.63.129.16 note), az802-4a-forwarder-facts, az802-4a-resolution-path, az802-4a-cf-* (no conditional forwarder below a hosted zone).

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 22 Q10 (monitor mode with an allowlist) matches the new sentence: monitor mode uses Microsoft's list.

## For a human decision

- **GPU partitions per VM**: decide which Learn page wins ("more than one GPU partition" in the concept page of July 2025, "only a single GPU partition" in the how-to page of January 2025). It decides the chapter sentence "one partition per VM", its Key points, and the answers of az802-3a-gpup-statements s1 and az802-cs3c-gpu-partitioning s3.
- **Automatic agent upgrade (Arc) preview or GA**: only a meta description says preview. If it's preview, the chapter's upgrade sentence should say so.
- **168.63.129.16 in the virtual network DNS list with VPN Gateway**: Learn's note goes against the usual "VNet DNS = domain controllers only" design. The chapter now quotes the note; the scenario table row "Domain-joined Azure VMs" wasn't changed. Check whether other chapters or case studies (for example cs3b-blue-yonder, cs4a-trey-research, with Azure DCs and a VPN) need the same note.
- **SSH Direct (`hvc ssh`)**: named by objective 3.1.2 but no Learn page found; the chapter keeps its paragraph.
- **Dynamic Memory on/off only with the VM off**: stated by the chapter (table and Key points) and used by quiz 31, not found on Learn.
- **SLA figures in 33** (availability set 99.95 %, zones 99.99 %): not in my QZ report; the AZ-104 pass found 99.99 % for zones not on Learn. Not checked again here.

## French terms not settled (not in the glossary, or not decided)

- « bursting basé sur les crédits », « bursting à la demande », « taux de burst » (33, new sentence): not in the glossary.
- « groupe identique réparti sur plusieurs zones » (zone-spanning scale set, 33): not in the glossary.
- « mode monitor » / « mode complet » (22): the chapter and quiz use « mode monitor », bank question az802-2b-mc-local-control uses « mode surveillance ».
- « informations d'identification Hybrid Worker » (22), as in the bank: not in the glossary.
- « ancres d'approbation » (trust anchors, 41 and bank): not in the glossary.
- « cmdlet » (undecided): existing text of 31 uses it; not changed.
- Out of scope, not changed: `questions/vms/az802-cs2c-lab-jit.yaml` FR says « pare-feu Azure Firewall » (glossary: « Pare-feu Azure »).
