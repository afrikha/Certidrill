Azure Arc projects servers that run outside Azure (on-premises, on Hyper-V or VMware, in other clouds) into Azure Resource Manager, so the same Azure services manage them as Azure VMs: Azure Policy and machine configuration, VM extensions, Azure Update Manager and Azure Automation. Exam questions ask how to onboard, which role or network rule is missing, and which service fits a requirement.

<!-- section: arc-onboarding | objectives: 2.2.1 -->
## Onboarding Windows Server to Azure Arc

An Arc-enabled server is a `Microsoft.HybridCompute/machines` resource in a resource group, created by the **Azure Connected Machine agent** installed on the server. The agent's services include the Hybrid Instance Metadata Service (`himds`, running as `NT SERVICE\himds`, which needs the *Log on as a service* right), the guest configuration service and the extension manager. Each Arc-enabled server gets a **system-assigned managed identity** in Microsoft Entra ID.

Prerequisites:

| Item | Requirement |
| --- | --- |
| Operating system | Windows Server 2012 R2, 2016, 2019, 2022, 2025 (Desktop Experience or Server Core), x64. Windows Server 2012: last compatible agent is 1.69 |
| Not supported | Azure VMs (except to simulate on-premises in a lab), Azure Stack Hub and Azure Stack Edge VMs; cloned machines or golden images with the agent already connected |
| Local rights | Local administrator to install and connect the agent |
| Resource providers | `Microsoft.HybridCompute`, `Microsoft.GuestConfiguration`, `Microsoft.HybridConnectivity` (plus `Microsoft.AzureArcData` for SQL Server, `Microsoft.Compute` for Update Manager) |
| Role to onboard | **Azure Connected Machine Onboarding** (or Contributor) on the resource group |
| Role to manage the resources | **Azure Connected Machine Resource Administrator** (read, modify, delete machines, deploy extensions) |
| Network | **Outbound only**, TCP **443**, TLS 1.2 or 1.3, directly, through a proxy, through Azure Arc gateway or through an **Azure Arc private link scope** |

Service tags to allow outbound: `AzureActiveDirectory`, `AzureTrafficManager`, `AzureResourceManager`, `AzureArcInfrastructure`, `Storage`, `AzureFrontDoor.Frontend` (and `WindowsAdminCenter` if WAC is used). A Log Analytics gateway can't be used as the agent's proxy.

| Onboarding method | When |
| --- | --- |
| Portal-generated script (Azure Arc > Add > Onboard existing machines), interactive sign-in | One or a few servers |
| Same script with a **service principal** holding **Azure Connected Machine Onboarding** | At scale, deployed by Group Policy, Configuration Manager, Ansible or another tool; the service principal is used only at connection time |

```powershell
# At-scale onboarding with a service principal (run as local administrator)
azcmagent connect --service-principal-id "<app-id>" --service-principal-secret "<secret>" `
    --tenant-id "<tenant-id>" --subscription-id "<subscription-id>" `
    --resource-group "RG-Arc" --location "westeurope"

azcmagent show          # agent status and connection
azcmagent check         # test connectivity to the Arc endpoints
azcmagent disconnect    # remove the Azure resource and disconnect
```

> **Exam trap.** The onboarding service principal needs **Azure Connected Machine Onboarding**, not Azure Connected Machine Resource Administrator: least privilege for "connect servers but don't manage them". Creating the service principal itself needs the right to register applications in the tenant, and assigning the role needs Owner or User Access Administrator.

The agent is upgraded through Microsoft Update (enable "updates for other Microsoft products"), WSUS or Configuration Manager (product *Azure Connected Machine Agent*), Azure Update Manager, or automatic agent upgrade; no restart is needed.

**Windows Server Management enabled by Azure Arc**: servers with active Software Assurance or subscription licenses (attested in Azure Arc > Licenses > Azure Benefits - Windows Server), or enrolled in Windows Server pay-as-you-go, get Azure Update Manager, Change Tracking and Inventory, machine configuration, Windows Admin Center in Azure, Best Practices Assessment and other services at no extra cost (agent 1.47 or later, machine connected). Other servers can buy Update Manager, Change Tracking and Inventory and machine configuration separately.

<!-- section: machine-configuration | objectives: 2.2.2 -->
## Device configuration with machine configuration and Azure Policy

**Azure Machine Configuration** (Azure Policy's machine configuration feature, formerly guest configuration) audits or sets operating system settings inside the machine: security baselines, registry values, installed applications, local group membership, services. On Arc-enabled servers it's **built into the Connected Machine agent**; on Azure VMs it needs the machine configuration extension and a system-assigned managed identity.

| Assignment type | Behavior |
| --- | --- |
| Audit | Reports compliance only |
| ApplyAndMonitor | Applies the configuration once, then reports drift |
| ApplyAndAutoCorrect | Applies the configuration and corrects drift |

How it's used:

- **Built-in policies and initiatives** (for example the Windows security baseline, or "audit machines missing a given application"): assign them at a management group, subscription or resource group; they cover both Azure VMs and Arc-enabled servers.
- **Custom configurations**: write a PowerShell DSC configuration, build a package with the `GuestConfiguration` module, test it, publish it to storage, then create a policy definition or a guest assignment that references it.
- Results per setting appear in the machine's **Guest assignments** page and in Azure Policy compliance.
- Up to 50 guest assignments per machine. Machine configuration isn't available on Arm64 Arc-enabled servers.

```powershell
# Package and test a custom configuration (GuestConfiguration module)
New-GuestConfigurationPackage -Name "TimeZoneParis" -Configuration ".\TimeZoneParis\localhost.mof" `
    -Type AuditAndSet -Force
Get-GuestConfigurationPackageComplianceStatus -Path ".\TimeZoneParis.zip"
```

> **Exam trap.** The DSC VM extension isn't the answer for Arc-enabled servers: it's no longer available for them. Use machine configuration to keep settings enforced, or the Custom Script Extension for a one-off script.

Other Arc device configuration features: **Azure Policy** at the resource level (tags, allowed locations, deploying extensions with `DeployIfNotExists` policies such as "configure Arc machines to run Azure Monitor Agent"), **resource tags** for dynamic scopes, and **Change Tracking and Inventory** to see changes to software, files, registry and services.

Local lockdown with the agent's own configuration, which only a local administrator can change (not even an Azure Owner):

```powershell
azcmagent config set guestconfiguration.enabled false   # block machine configuration on this server
azcmagent config set config.mode monitor                # allow only monitoring and security extensions
azcmagent config list
```

<!-- section: vm-extensions | objectives: 2.2.3 -->
## VM extensions on non-Azure machines

Arc-enabled servers run many of the same **VM extensions** as Azure VMs, deployed from the portal, Azure CLI (`az connectedmachine extension create`), Azure PowerShell (`New-AzConnectedMachineExtension`), ARM templates or Azure Policy. Deploying one needs `Microsoft.HybridCompute/machines/extensions/write`, included in **Azure Connected Machine Resource Administrator**.

| Requirement | Extension (publisher/type) |
| --- | --- |
| Collect events and performance counters to Log Analytics, VM insights | Azure Monitor Agent (`Microsoft.Azure.Monitor/AzureMonitorWindowsAgent`), associated with a data collection rule |
| Map processes and dependencies in VM insights | Dependency agent (`DependencyAgentWindows`), with Azure Monitor Agent |
| Run a script once on many servers | Custom Script Extension (`Microsoft.Compute/CustomScriptExtension`) |
| Get certificates from Azure Key Vault and renew them automatically | Key Vault extension (`KeyVaultForWindows`), using the server's managed identity |
| Onboard to Microsoft Defender for Endpoint | `MDE.Windows` (deployed by Defender for Servers) |
| Run Azure Automation runbooks on the server | Hybrid Runbook Worker (`HybridWorkerForWindows`) |
| Manage the server from the portal | Windows Admin Center (`Microsoft.AdminCenter/AdminCenter`) |
| Patch from Azure | Windows OS Update Extension / Windows Patch extension, pushed automatically by Update Manager |
| Sign in with Microsoft Entra ID | `AADLoginForWindows` |

```powershell
New-AzConnectedMachineExtension -ResourceGroupName "RG-Arc" -MachineName "SRV1" -Location "westeurope" `
    -Name "AzureMonitorWindowsAgent" -Publisher "Microsoft.Azure.Monitor" `
    -ExtensionType "AzureMonitorWindowsAgent" -EnableAutomaticUpgrade
```

Many extensions support **automatic extension upgrade**. The legacy Log Analytics agent (MMA) is retired: use Azure Monitor Agent.

Restrict extensions **locally** on the server with an allowlist (preferred: blocks anything not listed, including future extensions) or a blocklist, entries in `Publisher/Type` form:

```powershell
azcmagent config set extensions.allowlist "Microsoft.Azure.Monitor/AzureMonitorWindowsAgent,Microsoft.Azure.AzureDefenderForServers/MDE.Windows"
azcmagent config set extensions.blocklist "Microsoft.Compute/CustomScriptExtension"
azcmagent config set extensions.enabled false   # disable the extension manager
```

> **Exam trap.** An allowlist or blocklist doesn't remove extensions already installed, and deletion is always allowed. An extension in both lists is blocked. Azure Policy can also restrict extensions, but anyone who can edit the assignment can undo it; the local setting can't be changed from Azure.

<!-- section: update-manager | objectives: 2.2.4 -->
## Azure Update Manager

Azure Update Manager assesses and installs Windows and Linux updates on Azure VMs and **Arc-enabled servers** (and Arc-enabled VMware and SCVMM machines, Azure Local), with no Log Analytics workspace and no Automation account. It replaces Automation Update Management (retired). Its extensions are pushed automatically at the first operation on a machine. Updates come from the source configured on the server: Microsoft Update, Windows Update or **WSUS**.

| Operation | Use |
| --- | --- |
| Check for updates (on demand) | Immediate assessment |
| Periodic assessment | Automatic assessment every **24 hours**; enable it at scale with Azure Policy |
| One-time update | Install now, with classifications, include/exclude KB lists, reboot option and a maximum duration |
| Scheduled updates | A **maintenance configuration** (schedule, recurrence, duration, classifications, reboot setting) assigned to machines or to a **dynamic scope** (subscription, resource group, location, OS, tags) |
| Pre- and post-events | Run actions before and after a scheduled maintenance (for example a runbook through Event Grid) |
| Reporting | Compliance views, Azure Workbooks, Azure Resource Graph, alerts |

Patch orchestration (Update settings):

| Option | Effect |
| --- | --- |
| Customer Managed Schedules | Required for scheduled patching; sets patch mode to Azure-orchestrated with `BypassPlatformSafetyChecksOnUserSchedule` = TRUE |
| Azure Managed - Safe Deployment | Automatic VM guest patching (`AutomaticByPlatform`), Azure VMs only, not Arc-enabled servers |
| Windows Automatic Updates | `AutomaticByOS`: the OS installs updates itself |
| Manual updates | Windows automatic updates disabled; patching only when triggered |

**Hotpatching** installs security updates without a restart: on Windows Server Azure Edition VMs, and on Windows Server 2025 Arc-enabled servers through the Arc-enabled hotpatch service.

Billing: free for Azure VMs; for Arc-enabled servers it's billed per server unless covered by Windows Server Management enabled by Azure Arc (Software Assurance attestation or pay-as-you-go).

> **Exam tip.** "Patch on-premises servers every second Tuesday at 22:00, only those tagged `Ring=1`, and stop a service first" means Arc-enabled servers, a maintenance configuration with a dynamic scope on the tag, and a pre-event. Servers still pointed at WSUS install only the updates approved in WSUS.

<!-- section: automation-runbooks | objectives: 2.2.5 -->
## Azure Automation runbooks

An **Automation account** holds runbooks, schedules, webhooks, shared assets (credentials, variables, certificates, connections) and modules. A **runbook** is a script run as a job, in an Azure **sandbox** or on a **Hybrid Runbook Worker**.

| Runbook type | Notes |
| --- | --- |
| PowerShell | Recommended; runtime versions 7.6, 7.4 and 5.1 (7.1 and 7.2 no longer supported). Signed runbooks and workflows not supported in 7.x |
| Python | Python 3.10 (2.7 and 3.8 no longer supported); no webhooks to start Python runbooks |
| Graphical | Windows PowerShell based, created and edited only in the portal's graphical editor; can't run on a Linux Hybrid Runbook Worker |
| PowerShell Workflow and Graphical PowerShell Workflow | Not recommended; no PowerShell 7 support, slow to start (compiled) |

Steps: create the runbook (or import it), edit, test in the **Test pane**, **Publish** (only published runbooks can be started by a schedule or webhook), then start it manually, from a **schedule**, a **webhook**, an alert, or another runbook.

Authentication: Run As accounts are gone; runbooks use the Automation account's **managed identity**, which needs Azure roles on the target resources.

```powershell
# Inside a runbook: authenticate with the Automation account's system-assigned managed identity
Disable-AzContextAutosave -Scope Process
$ctx = (Connect-AzAccount -Identity).Context
Set-AzContext -SubscriptionName $ctx.Subscription -DefaultProfile $ctx
Get-AzVM -ResourceGroupName "RG-App" -Status | Where-Object PowerState -eq "VM running"
```

**Hybrid Runbook Worker**: runs jobs on a Windows or Linux machine (Azure VM or **Arc-enabled server**) to reach local resources.

| Point | Rule |
| --- | --- |
| Deployment | **Extension-based** (Hybrid Worker extension), the only supported model: the agent-based model (Log Analytics agent) was retired on August 31, 2024 and its jobs stopped in April 2025 |
| Groups | Workers belong to a **Hybrid Runbook Worker group**; you start a runbook on a group, and any worker in it takes the job. Several workers = high availability |
| Identity | Jobs run as **Local System** on Windows (`nxautomation` on Linux) unless a Run As credential is set on the group; to reach Azure, use a managed identity |
| Limits | No sandbox limits (fair share, the three-hour cloud job limit, memory, sockets); only the machine's resources |
| One machine | One worker reporting to one Automation account |

```powershell
Start-AzAutomationRunbook -AutomationAccountName "AA-Ops" -ResourceGroupName "RG-Ops" `
    -Name "Restart-PrintSpooler" -RunOn "HRW-Paris" -Parameters @{ ServerName = "PRN1" }
```

> **Exam trap.** A cloud runbook can't reach an on-premises server or a share on the internal network, and cloud jobs are limited to three hours by fair share. Both requirements point to a Hybrid Runbook Worker group.

<!-- section: key-points -->
## Key points

- Arc: Connected Machine agent, outbound 443 only; onboard with Azure Connected Machine Onboarding (service principal at scale); manage with Azure Connected Machine Resource Administrator; not for Azure VMs.
- Machine configuration is built into the Arc agent; Audit, ApplyAndMonitor, ApplyAndAutoCorrect; the DSC extension isn't available on Arc.
- Extensions: Azure Monitor Agent, Custom Script, Key Vault, MDE, Hybrid Worker, AdminCenter; lock down locally with `azcmagent config` allowlists.
- Update Manager: periodic assessment every 24 hours, maintenance configurations with dynamic scopes, Customer Managed Schedules for scheduled patching; Arc servers are billed unless Windows Server Management enabled by Azure Arc applies.
- Runbooks: PowerShell 7.6/7.4/5.1 or Python 3.10, publish before scheduling, managed identity; Hybrid Runbook Worker groups (extension-based) for local resources and long jobs.
