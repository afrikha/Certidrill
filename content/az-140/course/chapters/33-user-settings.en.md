This chapter covers what an administrator tunes once the host pool runs: user and session host settings delivered by Intune or Group Policy, the RDP properties of the host pool, session time limits, Start VM on Connect for cost savings, and the assignment of personal desktops. Exam questions test the right tool, the right role and the exact setting or command.

<!-- section: user-settings-policies | objectives: 3.2.7 -->
## Configuring user settings with Intune or Group Policy

Session host and user settings come from the same two tools as for physical devices, with rules specific to multi-session:

| Requirement | Tool |
| --- | --- |
| Session hosts joined to Active Directory Domain Services (domain-joined or Microsoft Entra hybrid joined) | Group Policy, or Intune if the hosts are enrolled |
| Microsoft Entra joined session hosts | Intune (enable **Enroll the VM with Intune** when you add session hosts) |
| Session hosts joined to Microsoft Entra Domain Services | Group Policy only: they can't be managed with Intune |
| Settings that must follow the user, not the host | User-scope settings: Intune settings catalog assigned to **user** groups, or Group Policy user settings |

**Intune and Windows Enterprise multi-session:**

- Use the **settings catalog**. Filter the settings picker on *OS edition == Enterprise multi-session*; user-scope settings show *(User)*. Templates aren't delivered, except certificate profiles (trusted, SCEP, PKCS) and device-tunnel VPN, and appear as *Not applicable*.
- Device configuration is assigned to device groups, user configuration to user groups: the other way round reports *Error* or *Not applicable*.
- Hybrid joined hosts enroll with **device credentials** (Group Policy auto-enrollment or Configuration Manager co-management); user-credential enrollment isn't supported. One MDM provider only.
- Apps install in the system context with **Required** or **Uninstall** intent; *Available* isn't supported.
- Compliance policies are device-targeted only; Conditional Access supports user and device configurations.
- Don't enroll a cloned image of a device already enrolled, and keep FSLogix `RoamIdentity = 0` so tokens don't roam between hosts.

**Group Policy on session hosts:**

- Most session settings are computer settings under **Computer Configuration > Administrative Templates > Windows Components > Remote Desktop Services > Remote Desktop Session Host**, in the folders Device and Resource Redirection, Printer Redirection, Security, Session Time Limits.
- Azure Virtual Desktop specific settings come from the administrative template `terminalserver-avd.admx` / `.adml`, copied to the Central Store (`\\contoso.com\SYSVOL\contoso.com\Policies\PolicyDefinitions`).
- To apply user settings based on the **computer** the user signs in to (session host OU) rather than the user's OU, enable **loopback processing** (Merge or Replace) in a GPO linked to the session hosts' OU.

> **Exam trap.** A user-scope setting that must apply only when users sign in to session hosts, not on their laptops: Group Policy loopback processing on the session host OU, or an Intune user-scope policy filtered to the multi-session devices. A normal user GPO linked to the users' OU applies everywhere.

<!-- section: rdp-properties | objectives: 3.2.8 -->
## Configuring RDP properties on a host pool

Each desktop and app in a user's feed comes with an `.rdp` file built from the **host pool RDP properties**: every session host of the pool shares them. Change them with the **Desktop Virtualization Host Pool Contributor** role (or equivalent):

- Portal: host pool > **RDP Properties**: tabs for connection information, session behavior, device redirection, display settings, and **Advanced**, which shows the raw semicolon-separated string.
- PowerShell: `Update-AzWvdHostPool -CustomRdpProperty`. CLI: `az desktopvirtualization hostpool update --custom-rdp-property`.
- The value **replaces** the custom properties: to add one, read the current string first and append to it; an empty string removes them all.
- Users must **refresh** their resources (or reconnect) to receive the new properties.

```powershell
$hp = Get-AzWvdHostPool -Name hp-finance -ResourceGroupName rg-avd
$props = $hp.CustomRdpProperty + "use multimon:i:0;screen mode id:i:1;"
Update-AzWvdHostPool -Name hp-finance -ResourceGroupName rg-avd -CustomRdpProperty $props
Get-AzWvdHostPool -Name hp-finance -ResourceGroupName rg-avd | Format-Table Name, CustomRdpProperty
```

Properties beyond redirection that appear in questions:

| Requirement | RDP property |
| --- | --- |
| Single sign-on with Microsoft Entra authentication to the session hosts | `enablerdsaadauth:i:1` (replaces `targetisaadjoined`) |
| Connect to Microsoft Entra joined hosts with user name and password from a device that isn't Entra joined or registered (legacy) | `targetisaadjoined:i:1` |
| Use a Kerberos KDC proxy for authentication | `kdcproxyname:s:kdc.contoso.com` |
| Reconnect automatically after a network drop | `autoreconnection enabled:i:1` (default) |
| Single monitor only | `use multimon:i:0` (default 1) |
| Only some local monitors | `selectedmonitors:s:` with display IDs from `mstsc.exe /l`, requires `use multimon:i:1` |
| Open in a window instead of full screen | `screen mode id:i:1` (default 2, full screen) |
| Scale the session content to the window | `smart sizing:i:1` |
| Keep the resolution fixed when the window is resized | `dynamic resolution:i:0` (default 1) |
| Windows key combinations go to the session only in full screen | `keyboardhook:i:2` (default) |
| Start a program instead of Explorer | `alternate shell:s:C:\Program Files\App\app.exe` |
| Disable bulk compression, bandwidth or network auto-detection | `compression:i:0`, `bandwidthautodetect:i:0`, `networkautodetect:i:0` |

> **Exam trap.** RDP properties are set per **host pool**, not per user or per application group. Two groups of users who need different redirections or display settings need two host pools (or a session host policy that restricts one of them).

<!-- section: session-timeouts | objectives: 3.2.9 -->
## Configuring session timeout properties

Session time limits are Windows policies on the session hosts, under **Administrative Templates > Windows Components > Remote Desktop Services > Remote Desktop Session Host > Session Time Limits** (Group Policy, computer or user configuration, or the same path in the Intune settings catalog):

| Policy | Effect |
| --- | --- |
| Set time limit for active but idle Remote Desktop Services sessions | An idle session is disconnected (or ended, see below) after the limit |
| Set time limit for disconnected sessions | A disconnected session is signed out after the limit, which frees resources on pooled hosts |
| Set time limit for active Remote Desktop Services sessions | Maximum duration of an active session |
| End session when time limits are reached | Ends the session instead of disconnecting it when the idle or active limit is reached |
| Set time limit for logoff of RemoteApp sessions | Delay before a RemoteApp session with no open application is signed out |

A typical pooled host pool: idle limit 1 hour, disconnected limit 2 hours, so that idle sessions don't hold capacity and autoscale can drain hosts.

**Session lock behavior.** When a remote session is locked (by the user or by an inactivity lock policy), it either disconnects or shows the remote lock screen:

| Authentication | Default on lock | Setting (Remote Desktop Session Host > **Security**) |
| --- | --- | --- |
| Single sign-on with Microsoft Entra ID | Disconnect the session | **Disconnect remote session on lock for Microsoft identity platform authentication** |
| Legacy protocols (NTLM, CredSSP, RDSTLS...) | Show the remote lock screen | **Disconnect remote session on lock for legacy authentication** |

Disconnecting on lock makes the user reconnect through Microsoft Entra ID, so Conditional Access (MFA, sign-in frequency) is evaluated again and passwordless methods such as passkeys work. It requires Windows 11, Windows 10 21H2 or later, or Windows Server 2022 with the 2024-05/06 cumulative updates.

> **Exam trap.** A disconnect time limit doesn't sign out users who are still connected but idle. To free sessions of users who leave their desktop open, configure the idle limit **and** the disconnected limit (or End session when time limits are reached).

<!-- section: start-vm-on-connect | objectives: 3.2.10 -->
## Implementing Start VM on Connect

Start VM on Connect lets you deallocate session hosts to save compute cost: when a user connects and no suitable VM is running, Azure Virtual Desktop starts one.

Requirements:

1. Assign the **Desktop Virtualization Power On Contributor** role to the **Azure Virtual Desktop service principal** or to a **managed identity of the host pool**, at a scope that contains the host pool and its session host VMs (the subscription is recommended when several host pools exist).
2. Your account needs **Desktop Virtualization Host Pool Contributor** to enable the setting.
3. Enable it on an **existing** host pool (it can't be enabled during host pool creation): host pool > **Properties** > **Start VM on connect** = Yes.
4. Host pool, session host and resource group names use ANSI characters only.

```powershell
Update-AzWvdHostPool -Name hp-dev -ResourceGroupName rg-avd -StartVMOnConnect:$true
```

| Host pool type | Behavior |
| --- | --- |
| Personal | Starts the VM assigned to the user (or one that can be assigned to them) |
| Pooled | Starts a VM only when none is running, and another one only when the running VMs reach their session limit; at most one start every five minutes, other users get *No resources available* meanwhile |

- Works for session hosts on Azure and Azure Local.
- The first connection takes longer while the VM boots; the client shows that the VM is being started.
- Connecting directly to the VM by name or IP address, outside Azure Virtual Desktop, doesn't start it.
- Start VM on Connect only **starts** VMs. Deallocating them again is done by autoscale (scaling plans) or by your own automation.

> **Exam trap.** The Power On role goes to the **Azure Virtual Desktop service principal** (or the host pool managed identity), not to the users. Users need nothing more than their application group assignment.

<!-- section: personal-desktops | objectives: 3.2.11 -->
## Assigning and unassigning personal desktops

In a personal host pool each session host belongs to one user. The host pool's assignment type decides how users get one:

| Assignment type | How it works |
| --- | --- |
| Automatic (default) | Assign users (or groups) to the desktop application group; at first connection each user gets any unassigned session host, permanently |
| Direct | Assign users to the application group **and** to a specific session host. Without a session host assignment, the user gets *No resources available* |

You can directly assign a user to a session host even when the type is Automatic. Set the type in host pool > **Properties** > **Assignment**, or with `Update-AzWvdHostPool -PersonalDesktopAssignmentType Direct`.

```powershell
# Assign a session host to a user
Update-AzWvdSessionHost -HostPoolName hp-dev -ResourceGroupName rg-avd `
  -Name vm-dev-03.contoso.com -AssignedUser ana@contoso.com

# Give the desktop a name users can recognize in their feed
Update-AzWvdSessionHost -HostPoolName hp-dev -ResourceGroupName rg-avd `
  -Name vm-dev-03.contoso.com -FriendlyName "Dev desktop (GPU)"
```

| Task | Portal (host pool > Session hosts) | PowerShell |
| --- | --- | --- |
| Assign | **Assignment > Assign user** (or Application groups > Assignments > **Assign VM**) | `Update-AzWvdSessionHost -AssignedUser` |
| Unassign | **Assignment > Unassign user** | REST `PATCH` on the session host with `assignedUser` empty and `force=true` (`Invoke-AzRestMethod`) |
| Reassign | **Assignment > Assign to a different user** | REST `PATCH` with the new `assignedUser` |

Azure CLI can set the assignment type but can't assign, unassign or reassign personal desktops. Configuring personal desktop assignment requires the **Desktop Virtualization Contributor** role or equivalent.

**Multiple personal desktops per user** in one host pool: set the assignment type to **Direct** and save, then select **Assign multiple desktops to a single user** (load balancer type `MultiplePersistent` in PowerShell). Once enabled it can't be disabled; automatic assignment and pooled host pools aren't supported. Give the hosts friendly names, and allow concurrent FSLogix connections if one profile container serves the pool.

> **Exam trap.** Unassigning a desktop doesn't clean the VM: the previous user's data stays on its OS disk. Reimage or redeploy the session host before giving it to someone else if the data mustn't be kept.

> **Exam tip.** "Users must always land on the same VM, and the administrator chooses which" = personal host pool with **Direct** assignment.

<!-- section: key-points -->
## Key points

- Intune on multi-session: settings catalog only (plus certificate and device-tunnel VPN templates), device policies to device groups, user policies to user groups, apps in system context with Required intent.
- Group Policy: Remote Desktop Session Host folders for redirection, security, time limits; loopback processing for user settings that depend on the session host.
- RDP properties are per host pool; `-CustomRdpProperty` replaces the string; users refresh to get changes; `enablerdsaadauth:i:1` for Entra single sign-on.
- Time limits: idle, disconnected, active, End session; session lock disconnects by default with Entra SSO.
- Start VM on Connect: Desktop Virtualization Power On Contributor to the Azure Virtual Desktop service principal or host pool managed identity, enabled on an existing host pool.
- Personal desktops: Automatic (default) or Direct; `Update-AzWvdSessionHost -AssignedUser` to assign; unassign and reassign in the portal or through REST, not with Azure CLI.
