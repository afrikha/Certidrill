A session host is a shared Windows desktop reachable from anywhere, so it combines the risks of a server and of a user PC. This chapter covers the controls the exam names: Microsoft Defender for Cloud and Defender for Servers, Microsoft Defender Antivirus tuned for VDI and FSLogix, Defender for Endpoint onboarding of non-persistent hosts, network filtering with NSGs, UDRs and Azure Firewall, administrative access through Azure Bastion or JIT, App Control for Business and Controlled folder access, and Trusted launch or confidential VMs.

<!-- section: defender-for-cloud | objectives: 2.2.1 -->
## Secure session hosts with Microsoft Defender for Cloud

Session hosts are Azure virtual machines, so Defender for Cloud protects them like any server:

- **Foundational CSPM** (free): the secure score and recommendations, with **Quick Fix** for some of them.
- **Enhanced security features**: enable the **Defender for Servers** plan on the subscription (or on selected resources) to get threat protection, vulnerability assessment and regulatory compliance dashboards (for example PCI DSS).

| Need | Plan |
| --- | --- |
| Microsoft Defender for Endpoint integration and licensing for the servers | Defender for Servers Plan 1 or Plan 2 |
| Just-in-time VM access, file integrity monitoring | **Defender for Servers Plan 2** |
| Recommendations for Secure Boot, vTPM and the Guest Attestation extension, attestation failure alerts | Trusted launch VMs with Defender for Cloud |

Microsoft's guidance for Azure Virtual Desktop:

- Work through the **secure score** recommendations; remediate in the image when the finding concerns the OS, otherwise the next redeployment brings it back.
- Install an **EDR** product on every session host. On Windows Server session hosts with Defender for Cloud enabled, Defender for Endpoint is deployed through the integration; on Windows client OS (including multi-session), deploy Defender for Endpoint (see below) or a third-party EDR.
- Use Defender for Endpoint **vulnerability management**, surfaced in Defender for Cloud, to find vulnerable software on the hosts and in the image.

> **Exam trap.** Defender for Cloud doesn't patch or reimage session hosts. A recommendation about missing updates is fixed in the golden image and by redeploying hosts; Defender for Cloud only reports it.

<!-- section: defender-antivirus | objectives: 2.2.2 -->
## Configure Microsoft Defender Antivirus on session hosts

Microsoft Defender Antivirus is built into Windows 11 and Windows 10 Enterprise multi-session and Windows Server. On pooled hosts with many users, configure it for VDI with Group Policy, Intune or PowerShell:

| Setting | Recommended value and reason |
| --- | --- |
| **Define security intelligence location for VDI clients** | A file share that receives the unpacked updates once, so each VM doesn't download and unpack them (`Set-MpPreference -SharedSignaturesPath`) |
| Randomize scheduled scan times | Enabled, so all hosts don't scan at the same moment |
| Turn on catch-up quick scan | Enabled for non-persistent hosts that miss scheduled scans |
| Scan after a security intelligence update | Can be disabled only for images already scanned, at the cost of protection |
| Suppress notifications, headless UI | Enabled: users don't see Defender pop-ups |
| Local administrator merge behavior | Disabled: only central policy applies |
| Cloud-delivered protection, tamper protection | On |

Before sealing the image, run the **Windows Defender Cache Maintenance** scheduled task, otherwise each new VM spends CPU rebuilding the cache.

**FSLogix exclusions** are mandatory when profiles are VHD(X) containers: scanning the container while it's attached causes sign-in delays and profile failures. Exclude:

| Type | Exclusions |
| --- | --- |
| Containers on the share | `\\<server>\<share>\*\*.VHD`, `*.VHDX` and their `.lock`, `.meta`, `.metadata` files |
| Local temporary disks | `%TEMP%\*\*.VHD`, `%TEMP%\*\*.VHDX`, `%WINDIR%\TEMP\*\*.VHD`, `%WINDIR%\TEMP\*\*.VHDX` |
| Cloud Cache | `%ProgramData%\FSLogix\Cache\*`, `%ProgramData%\FSLogix\Proxy\*` |
| Processes | `frxsvc.exe`, `frxccds.exe` |

```powershell
Set-MpPreference -SharedSignaturesPath "\\fs01.contoso.com\mdatp$\wdav-update"
Add-MpPreference -ExclusionPath "%TEMP%\*\*.VHDX", "%WINDIR%\TEMP\*\*.VHDX", "\\stprofiles.file.core.windows.net\profiles\*\*.VHDX"
Add-MpPreference -ExclusionProcess "frxsvc.exe", "frxccds.exe"
```

> **Exam trap.** The fix for slow sign-ins with "profile failed to attach" on FSLogix hosts with antivirus is the FSLogix exclusions, not disabling real-time protection or moving the profiles.

<!-- section: defender-for-endpoint | objectives: 2.2.3 -->
## Configure Microsoft Defender for Endpoint: onboarding and scanning

Defender for Endpoint adds EDR, attack surface reduction and automated investigation to Defender Antivirus. Persistent session hosts (personal desktops) onboard like any Windows device: Intune, Group Policy, Configuration Manager or the local script. **Non-persistent** pooled hosts need the **VDI onboarding scripts** from the Microsoft Defender portal (Settings > Endpoints > Onboarding, deployment method **VDI onboarding scripts for non-persistent endpoints**):

| Model | Files | Result |
| --- | --- | --- |
| Single entry per device | `Onboard-NonPersistentMachine.ps1` (which calls `WindowsDefenderATPOnboardingScript.cmd`) | One device entry per computer name, even when the VM is re-created |
| Multiple entries per device | `WindowsDefenderATPOnboardingScript.cmd` | A new entry for each provisioned instance |

Steps: copy the files to `C:\Windows\System32\GroupPolicy\Machine\Scripts\Startup` in the image, then add them as a **computer startup script** (local or domain Group Policy, PowerShell Scripts tab for the single-entry model). The script runs at the first boot of each new host, after it has its final name. The first report can take 3 to 4 hours.

Rules for the image:

- **Never onboard the golden image** or the build VM: clones would share the same `senseGuid` and not appear as separate devices.
- If the image was onboarded by mistake, offboard it and delete the registration data (the `Cyber` folder and the `senseGuid` and `senseId` registry values) before capturing.
- Onboarding doesn't configure antivirus: apply the VDI antivirus settings of the previous section separately.

**Scanning options** that matter on multi-session hosts: rely on real-time protection plus a daily **quick scan** with randomized start times, avoid full scans during working hours, use the shared security intelligence location, and use catch-up quick scans for hosts that were off.

> **Exam trap.** For pooled hosts that are deleted and re-created from the image, the answer is the VDI onboarding script run at startup, with the single-entry model if the device inventory must not fill with duplicates. Onboarding the image before Sysprep is always wrong.

<!-- section: network-security | objectives: 2.2.4 -->
## Network security: NSGs, UDRs and Azure Firewall

Session hosts need **no inbound port** from the internet: the agent and RDP use outbound connections to the service (reverse connect). Required outbound access from the session host subnet:

| Destination | Port | Service tag |
| --- | --- | --- |
| `login.microsoftonline.com` | TCP 443 | `AzureActiveDirectory` |
| `*.wvd.microsoft.com` (service traffic and TCP RDP) | TCP 443 | `WindowsVirtualDesktop` |
| `*.prod.warm.ingest.monitor.core.windows.net`, `gcs.prod.monitoring.core.windows.net` | TCP 443 | `AzureMonitor` |
| `catalogartifact.azureedge.net` | TCP 443 | `AzureFrontDoor.Frontend` |
| `mrsglobalsteus2prod.blob.core.windows.net` (agent updates) | TCP 443 | `Storage` |
| `azkms.core.windows.net` (Windows activation) | TCP 1688 | `Internet` |
| `169.254.169.254` (IMDS), `168.63.129.16` (platform) | TCP 80 and more | Never proxied or intercepted |

Check access with the **Azure Virtual Desktop Agent URL Tool** on a session host.

**NSGs.** Associate an NSG with the session host subnet: deny inbound from the internet (default rules already do), allow RDP 3389 only from the Azure Bastion subnet or a management subnet, and if you restrict outbound, allow the service tags above before a deny rule. Use application security groups to group hosts.

**Azure Firewall** filters outbound traffic in a hub:

- Use the **`WindowsVirtualDesktop` FQDN tag** in an application rule plus network rules for the other required endpoints; enable **DNS proxy** in the firewall policy to use FQDNs in network rules.
- Scope rules to a host pool with an **IP group** of its session hosts as source.
- **Don't use TLS inspection** on Azure Virtual Desktop traffic.
- Control user web browsing with application rules and **web categories**.

**UDRs.** A route table with `0.0.0.0/0` to the firewall sends all traffic through it. Because firewall scale-in can drop Azure Virtual Desktop connections, add a route for the **`WindowsVirtualDesktop` service tag with next hop Internet** on the session host subnet, so service traffic bypasses the firewall.

```bash
az network route-table route create -g rg-avd --route-table-name rt-avd-hosts -n to-firewall \
  --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
az network route-table route create -g rg-avd --route-table-name rt-avd-hosts -n avd-direct \
  --address-prefix WindowsVirtualDesktop --next-hop-type Internet
```

> **Exam trap.** Opening TCP 3389 inbound on the session hosts is never required for users. If a question proposes a public IP or an inbound NSG rule so users can connect, it's wrong; users go through the Azure Virtual Desktop gateway.

<!-- section: admin-access | objectives: 2.2.5 -->
## Administrative access: Azure Bastion or just-in-time VM access

Administrators sometimes need RDP to a session host outside Azure Virtual Desktop (broken agent, host in drain mode). Microsoft recommends avoiding direct RDP; the two controlled options:

| Option | How it works | Requirements |
| --- | --- | --- |
| **Azure Bastion** | RDP over TLS 443 from the Azure portal (or the native client) to the host's private IP; no public IP on the VM | `AzureBastionSubnet` in the virtual network (or a peered one), a Bastion SKU that supports the features you need (native client and IP-based connection need Standard or Premium); NSG on hosts allows 3389 from the Bastion subnet |
| **Just-in-time VM access** (Defender for Cloud) | The management port is closed by default; an authorized user requests access, and a temporary rule opens the port for the requester's IP for a limited time | **Defender for Servers Plan 2**; an NSG or Azure Firewall in front of the VM; defaults on Windows: port 3389, maximum 3 hours |

JIT is enabled from Defender for Cloud (Workload protections > Just-in-time VM access) or from the VM (Configuration). Requesting access requires `Microsoft.Security/locations/jitNetworkAccessPolicies/initiate/action` plus reads on the VM, NICs and public IPs; configuring the policy requires `jitNetworkAccessPolicies/write` and `Microsoft.Compute/virtualMachines/write`. Every request is logged in the activity log.

> **Exam tip.** "No public IP on the session hosts and connect from the browser" = Azure Bastion. "Port closed except when an administrator asks, for a few hours, from their IP" = JIT, which needs Defender for Servers Plan 2.

<!-- section: threat-protection | objectives: 2.2.6 -->
## Windows threat protection: App Control for Business and Controlled folder access

**App Control for Business** (formerly Windows Defender Application Control) allows only approved code to run: apps, drivers, scripts, MSI installers; PowerShell runs in Constrained Language Mode. It complements antivirus, it doesn't replace it.

| Point | Rule |
| --- | --- |
| Scope | Policies apply to the **device**: on a multi-session host, a policy affects every user. Don't plan per-user policies |
| Rollout | Start in **audit mode**, review the code integrity events, then switch to **enforced** |
| Structure | A base policy, plus supplemental policies to allow line-of-business apps |
| Trust options | Signed code, managed installer (apps deployed by Intune or Configuration Manager), Intelligent Security Graph reputation |
| Deployment | Intune, Group Policy, Configuration Manager or script (`CiTool.exe`) |
| AppLocker | Older; supports per-user or per-group rules, useful when different users of a multi-session host need different app lists |

Allow the Azure Virtual Desktop components (agent, side-by-side stack, FSLogix, Teams optimizations) before enforcing, or session hosts stop working. Remember that publishing apps as **RemoteApp isn't a security boundary**: it doesn't stop a user from starting other applications.

**Controlled folder access** (a Microsoft Defender Antivirus feature) protects folders against ransomware: only trusted applications can modify files in protected folders (Documents, Pictures, Videos, Music, Favorites, Public folders, and boot sectors). It requires Defender Antivirus as the active antivirus with real-time protection on.

| Mode | Effect |
| --- | --- |
| Disabled (default) | Off |
| Enabled (Block) | Untrusted apps can't change protected files |
| Audit Mode | Changes allowed and logged; start here |
| Block / Audit disk modification only | Protect only the disk sectors |

```powershell
Set-MpPreference -EnableControlledFolderAccess AuditMode
Add-MpPreference -ControlledFolderAccessProtectedFolders "\\stprofiles.file.core.windows.net\data"
Add-MpPreference -ControlledFolderAccessAllowedApplications "C:\Program Files\Contoso\Ledger\ledger.exe"
```

When folders are redirected (OneDrive Known Folder Move), the redirected location is protected. Add allowed apps only for verified line-of-business apps that are blocked.

> **Exam trap.** App Control for Business controls which code **runs**; Controlled folder access controls which apps can **write** to protected folders. A ransomware requirement points to Controlled folder access; an "only approved apps can run" requirement points to App Control for Business.

<!-- section: trusted-launch-confidential | objectives: 2.2.7 -->
## Trusted launch and Azure confidential VMs

**Trusted launch** is the default security type for session hosts created in the portal and meets the Windows 11 requirements. It needs **Generation 2** VMs and a supported size, and doesn't support managed images (use Azure Compute Gallery).

| Feature | Protects against |
| --- | --- |
| Secure Boot | Rootkits and bootkits: only signed boot loaders, kernels and drivers start |
| vTPM | Stores keys and measurements; enables BitLocker and remote attestation |
| Boot integrity monitoring | Guest Attestation extension verifies the boot chain; Defender for Cloud alerts on attestation failure |
| Virtualization-based security | Enables HVCI and Credential Guard in Windows |

**Azure confidential VMs** add hardware-based isolation from the hypervisor and the host: memory is encrypted with keys held in the CPU's secure processor (**AMD SEV-SNP** or **Intel TDX**), using DCasv5, ECasv5 and later confidential sizes. Choose the **Confidential virtual machines** security type when you create the host pool or add hosts; supported session host OS: Windows 11 and Windows 10 Enterprise (single and multi-session), Windows Server 2022 and 2019.

| Option | Detail |
| --- | --- |
| Confidential OS disk encryption | Optional, set at creation and can't be changed; keys bound to the VM's vTPM; platform-managed or customer-managed keys |
| Limitations | No Azure Site Recovery, no Accelerated Networking, no live migration; limited regions and sizes |

| Requirement | Answer |
| --- | --- |
| Protect hosts from boot malware at no extra cost | Trusted launch (Secure Boot and vTPM) |
| Data in use encrypted, isolated even from Azure operators and the hypervisor | Confidential VMs |
| Alert when a host boots with modified components | Trusted launch with the Guest Attestation extension and Defender for Cloud |

> **Exam trap.** A confidential or Trusted launch session host needs an image whose Gallery definition supports that security type and a Gen2 size. A Gen1 managed image can't be used; rebuild the image as a Gen2 Azure Compute Gallery version first.

<!-- section: key-points -->
## Key points

- Defender for Cloud: secure score and Defender for Servers; JIT and file integrity monitoring need Plan 2.
- Defender Antivirus for VDI: shared security intelligence location, randomized scans, FSLogix VHD(X) and process exclusions.
- Defender for Endpoint on non-persistent hosts: VDI onboarding script at startup; never onboard the golden image.
- No inbound ports; NSG on the subnet; Azure Firewall with the `WindowsVirtualDesktop` FQDN tag, no TLS inspection; route the `WindowsVirtualDesktop` service tag to Internet.
- Admin access: Azure Bastion (no public IP) or JIT (temporary port opening).
- App Control for Business = which code runs, device-wide, audit then enforce; Controlled folder access = ransomware protection of folders.
- Trusted launch (Gen2, Secure Boot, vTPM) is the default; confidential VMs add hardware memory encryption and confidential OS disk encryption.
