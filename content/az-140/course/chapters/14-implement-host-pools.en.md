Planning decided which host pools you need; this chapter is about building them. The exam asks which portal option, cmdlet or template property produces a given result, what you must have before session hosts can register, which host pool setting answers a requirement, and which license a scenario needs for Windows client and Windows Server session hosts.

<!-- section: portal-deployment | objectives: 1.4.1 -->
## Create a host pool and session hosts in the Azure portal

An Azure Virtual Desktop deployment is a set of linked objects: a **host pool** (the session hosts and their settings), at least one **application group** (what users get: a desktop or RemoteApps), a **workspace** (what users see in their client) and **role assignments** of users to application groups. The portal can create all of them in one flow (**Azure Virtual Desktop > Host pools > Create**) or one by one.

Prerequisites for the account that deploys:

| Resource | Minimum role |
| --- | --- |
| Host pool, workspace, application group | Desktop Virtualization Contributor (resource group or subscription) |
| Session host virtual machines on Azure | Virtual Machine Contributor |
| Adding session hosts to an existing host pool in the portal | Desktop Virtualization Host Pool Contributor and Virtual Machine Contributor |
| Key vault secrets read during deployment | Key Vault Secrets User |
| Assigning users to the application group | A role with `Microsoft.Authorization/roleAssignments/write`: User Access Administrator or Owner |

For an AD DS domain join, the join account needs, on the target OU: reset password, validated write to DNS host name, validated write to service principal name, read and write account restrictions. For Microsoft Entra Domain Services, the account must be a member of **AAD DC Administrators**. The subnet must reach the required URLs of the service, otherwise registration fails.

The **Basics** tab sets the choices that can't be changed later:

| Field | Values and rules |
| --- | --- |
| Management approach | **Standard** or **Use a session host configuration**. Fixed at creation: a standard host pool can't receive a session host configuration later |
| Host pool type | Pooled or Personal. A session host configuration supports **pooled only** |
| Load balancing algorithm (pooled) | Breadth-first or depth-first, plus **Max session limit** |
| Assignment type (personal) | Automatic or Direct; with Direct, optionally **Assign multiple desktops to a single user**, which can't be disabled once enabled |
| Preferred app group type | Desktop or RemoteApp; the portal creates a Desktop application group |
| Validation environment | Yes or No |

The **Virtual machines** tab (standard management) creates the session hosts at the same time:

- **Name prefix** up to 11 characters (10 with a session host configuration); Azure adds a hyphen and a number (`hp01-sh-0`), and the full computer name is limited to 15 characters.
- **Number of VMs**: up to 400 in one deployment, within your quota. You can add more later.
- **Security type**: Standard, **Trusted launch** (default) or Confidential virtual machines.
- **Image**: Azure Marketplace, Azure Compute Gallery or managed image (see the images chapter).
- **Availability options**: availability zones, availability set or none.
- **Hibernate**: personal host pools only, not supported with FSLogix or App attach.
- **Network and security**: virtual network and subnet; **Public inbound ports: No** (session hosts need no inbound port; the agent connects outbound to the service). Prefer an NSG on the subnet to a per-NIC NSG.
- **Domain to join**: Microsoft Entra ID or Active Directory (AD DS or Microsoft Entra Domain Services, with OU path and join credentials).
- **Virtual Machine Administrator account**: the local administrator.

The **Workspace** tab registers the desktop application group with a new or existing workspace, and the **Management** tab can enable diagnostic settings to a Log Analytics workspace.

> **Exam trap.** Users can connect only after you assign them to an **application group** (role Desktop Virtualization User). Creating the host pool, the session hosts and the workspace isn't enough, and assigning a role on the host pool itself gives no access to resources.

To add session hosts to an existing standard host pool: **Host pools > `<pool>` > Session hosts > + Add**. The portal reuses the pool settings and generates a registration key. With a session host configuration, you only increase the host pool size and the service creates the virtual machines from the configuration.

<!-- section: automation | objectives: 1.4.2 -->
## Automate with PowerShell, Azure CLI, ARM templates and Bicep

The resource provider is `Microsoft.DesktopVirtualization`. The order is always the same: host pool, application group linked to the host pool, workspace referencing the application group, registration token, virtual machines that install the agent with the token, then user assignments.

```powershell
# Module Az.DesktopVirtualization
$hp = New-AzWvdHostPool -ResourceGroupName rg-avd -Name hp-finance -Location westeurope `
    -HostPoolType Pooled -LoadBalancerType BreadthFirst -PreferredAppGroupType Desktop `
    -MaxSessionLimit 10

$dag = New-AzWvdApplicationGroup -ResourceGroupName rg-avd -Name hp-finance-dag `
    -Location westeurope -ApplicationGroupType Desktop -HostPoolArmPath $hp.Id

New-AzWvdWorkspace -ResourceGroupName rg-avd -Name ws-finance -Location westeurope `
    -ApplicationGroupReference $dag.Id

New-AzWvdRegistrationInfo -ResourceGroupName rg-avd -HostPoolName hp-finance `
    -ExpirationTime $((Get-Date).ToUniversalTime().AddHours(8).ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ'))

New-AzRoleAssignment -SignInName ana@contoso.com -RoleDefinitionName "Desktop Virtualization User" `
    -ResourceName hp-finance-dag -ResourceGroupName rg-avd `
    -ResourceType 'Microsoft.DesktopVirtualization/applicationGroups'
```

```bash
# Extension desktopvirtualization (installed on first use)
az desktopvirtualization hostpool create -g rg-avd -n hp-finance --location westeurope \
  --host-pool-type Pooled --load-balancer-type BreadthFirst \
  --preferred-app-group-type Desktop --max-session-limit 10 \
  --registration-info expiration-time="2026-12-01T08:00:00.000Z" registration-token-operation=Update

az desktopvirtualization hostpool retrieve-registration-token -g rg-avd -n hp-finance
```

Accepted values to recognize:

| Parameter | Values |
| --- | --- |
| Host pool type | `Pooled`, `Personal` |
| Load balancer type | `BreadthFirst`, `DepthFirst` (pooled); `Persistent` (personal) |
| Preferred app group type | `Desktop`, `RailApplications` (RemoteApp), `None` |
| Personal desktop assignment type | `Automatic`, `Direct` |
| Registration token operation | `Update` (create or renew), `Delete`, `None` |

In Bicep or an ARM template, the same objects are three resources linked by resource ID:

```bicep
param location string = resourceGroup().location
param baseTime string = utcNow()

resource hostPool 'Microsoft.DesktopVirtualization/hostPools@2024-04-03' = {
  name: 'hp-finance'
  location: location
  properties: {
    hostPoolType: 'Pooled'
    loadBalancerType: 'DepthFirst'
    maxSessionLimit: 12
    preferredAppGroupType: 'Desktop'
    validationEnvironment: false
    registrationInfo: {
      expirationTime: dateTimeAdd(baseTime, 'PT8H')
      registrationTokenOperation: 'Update'
    }
  }
}

resource dag 'Microsoft.DesktopVirtualization/applicationGroups@2024-04-03' = {
  name: 'hp-finance-dag'
  location: location
  properties: {
    applicationGroupType: 'Desktop'
    hostPoolArmPath: hostPool.id
  }
}

resource ws 'Microsoft.DesktopVirtualization/workspaces@2024-04-03' = {
  name: 'ws-finance'
  location: location
  properties: {
    applicationGroupReferences: [
      dag.id
    ]
  }
}
```

Session hosts are ordinary virtual machines: the template or script creates them, joins them to the domain or to Microsoft Entra ID, then installs the **Azure Virtual Desktop Agent** and the **Agent Bootloader** with the registration token (the Microsoft templates use a PowerShell DSC extension, so don't disable WinRM). Manually, you run the agent installer, paste the token when prompted, then run the bootloader installer; the host shows **Available** once registered. On Windows Server, install the Remote Desktop Session Host role first.

Registration token rules:

- Its lifetime is chosen at generation, **up to 27 days**; generate a new one for longer deployments. A host that registers with an expired token fails with `EXPIRED_MACHINE_TOKEN`.
- The token is only needed to **register**. Once registered, the host keeps a machine token that refreshes itself, but a host powered off for more than 90 days loses it.
- With a session host configuration, you can't retrieve a registration token to add hosts built outside the service.

> **Exam trap.** A question that shows hosts deployed but stuck in **Unavailable** or absent from the pool usually points to the registration step: expired token, agent not installed, or blocked outbound access to the required URLs. Inbound ports and public IP addresses are never the fix.

<!-- section: host-pool-settings | objectives: 1.4.3 -->
## Configure host pool and session host settings

Most settings are on **Host pools > `<pool>` > Properties** and can be changed at any time with `Update-AzWvdHostPool` or `az desktopvirtualization hostpool update`. Only the host pool type, the management approach and the deployment scope are fixed.

| Requirement | Setting |
| --- | --- |
| Spread users evenly for the best performance | Breadth-first (no session limit needed; default limit 999999) |
| Fill one host before using the next, to power off idle hosts and save cost | Depth-first, with a **max session limit** (required) |
| Each user gets the same personal VM at first sign-in, no admin action | Personal, assignment type **Automatic** |
| An administrator chooses which user gets which personal VM | Personal, assignment type **Direct** |
| Receive service updates before production to test them | **Validation environment: Yes** on a non-production pool |
| Agent updates only during a weekend window | **Scheduled agent updates** |
| Maintain a host without new users arriving | **Drain mode** on the session host |

How the algorithms choose:

- **Breadth-first** picks randomly among the half of available hosts that have the fewest sessions, so the spread isn't perfectly even.
- **Depth-first** picks the available host with the most sessions that is still under the limit. When every host reaches the limit, new connections fail until you raise the limit or add hosts.
- Lowering the limit doesn't disconnect existing sessions.

```powershell
Update-AzWvdHostPool -ResourceGroupName rg-avd -Name hp-finance `
    -LoadBalancerType DepthFirst -MaxSessionLimit 12

# Drain mode: no new sessions on this host
Update-AzWvdSessionHost -ResourceGroupName rg-avd -HostPoolName hp-finance `
    -Name hp01-sh-0.contoso.com -AllowNewSession:$false
```

**Drain mode** (portal: **Session hosts**, select the hosts, **Turn drain mode on**) stops new sessions on a host. Existing sessions continue, and a user with an active or disconnected session on that host is still reconnected to it. Use it before patching, resizing or deleting a host.

**Scheduled agent updates** control when the agent, the side-by-side stack and the Geneva Monitoring agent update: one or two maintenance windows of **two hours**, set at the host pool level, in one time zone or in each host's local time. They can be enabled only on an existing host pool; hosts must be running during the window, and after four failed attempts the update is forced. Critical security updates ignore the schedule.

A **validation environment** receives service updates first. Keep it similar to production, have users connect to it regularly, and don't use it for production. Changing the setting requires at least Desktop Virtualization Host Pool Contributor.

Other properties that later chapters detail: **RDP properties** (redirections, display, authentication), **Start VM on Connect**, **scaling plans** and session timeouts.

> **Exam trap.** Load balancing applies to **pooled** host pools only. A personal host pool always sends a user to their assigned host; if the requirement is to reassign a personal desktop, change the assignment, not the algorithm.

<!-- section: licensing | objectives: 1.4.4 -->
## Configure licensing for session hosts

The Azure Virtual Desktop service itself has no separate license for internal users: each user needs an **eligible license**, and the virtual machines are billed as Azure compute.

| Session host OS | Internal users (employees, contractors) | External users (customers of a SaaS app) |
| --- | --- | --- |
| Windows 11 or Windows 10 Enterprise, single or multi-session | Microsoft 365 E3, E5, A3, A5, F3, Business Premium, Student Use Benefit; Windows Enterprise E3, E5; Windows Education A3, A5; Windows VDA per user | **Per-user access pricing** on an enrolled Azure subscription |
| Windows Server 2016, 2019, 2022 or 2025 | **RDS CAL** with Software Assurance (per user or per device), or RDS User Subscription Licenses | Not supported: no per-user access pricing for Windows Server |

**Windows client session hosts.** The OS license is covered by the users' eligible licenses. The portal and the Microsoft templates set the virtual machine `LicenseType` to `Windows_Client` automatically; for a host created another way, apply it so you don't pay for a Windows license twice:

```powershell
$vm = Get-AzVM -ResourceGroupName rg-avd -Name hp01-sh-0
$vm.LicenseType = "Windows_Client"
Update-AzVM -ResourceGroupName rg-avd -VM $vm
```

**Windows Server session hosts.** Every user or device needs an **RDS CAL**, issued by a **Remote Desktop license server** that the session hosts can reach (on-premises or in Azure). Point the hosts at it with Group Policy, under Computer Configuration > Administrative Templates > Windows Components > Remote Desktop Services > Remote Desktop Session Host > Licensing:

- **Use the specified Remote Desktop license servers**: the license server names.
- **Set the Remote Desktop licensing mode**: **Per User** or **Per Device**, matching the CALs bought.

| CAL rule | Detail |
| --- | --- |
| Grace period | 120 days without a license server; then connections need a CAL |
| Per User | Assigned to a user in Active Directory; can't be used in a workgroup |
| Per Device | Assigned to a device; suits shift workers sharing computers |
| Version | The CAL version must be equal to or later than the session host's Windows Server version |

**Per-user access pricing** is for external commercial use only: the subscription is enrolled, each user who connects at least once in the month is charged a flat monthly price (Apps tier or Desktops + apps tier), and it doesn't include Microsoft Office. Guest (B2B) identities used by your own staff or contractors don't make it applicable; they need an eligible license like internal users.

> **Exam trap.** Per-user access pricing isn't a way to license guests or contractors, and it never covers Windows Server. Contractors are internal users: give them Microsoft 365 E3 or another eligible license. Windows Server session hosts always need RDS CALs.

<!-- section: key-points -->
## Key points

- A deployment = host pool + application group + workspace + user assignments to the application group (Desktop Virtualization User).
- Host pool type, management approach and deployment scope are fixed at creation; a session host configuration supports pooled pools only.
- Session hosts need no inbound port: they register outbound with a token valid up to 27 days.
- Breadth-first for performance, depth-first with a max session limit for cost; load balancing doesn't apply to personal pools.
- Drain mode blocks new sessions; scheduled agent updates use two-hour windows; a validation pool gets service updates first.
- Windows client: eligible per-user license and `Windows_Client`; Windows Server: RDS CALs and a reachable license server; external users: per-user access pricing.
