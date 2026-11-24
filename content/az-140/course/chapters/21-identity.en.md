Every Azure Virtual Desktop connection authenticates twice: once to the service through Microsoft Entra ID (feed, gateway), then to Windows on the session host. The identity scenario you choose decides how session hosts are joined, which storage FSLogix can use, whether single sign-on works, and which roles users need. The exam gives a set of identities and devices and asks which scenario, join type, role, Conditional Access target or RDP property meets the requirement.

<!-- section: identity-scenarios | objectives: 2.1.1 -->
## Select an identity scenario

Users always need an identity in **Microsoft Entra ID**: the service authenticates them there. They must also sign in to Windows with **the same identity**; signing in to Microsoft Entra ID with one account and to Windows with another (a local account, for example) isn't supported.

| Scenario | Where users live | Session host join | Supported |
| --- | --- | --- | --- |
| AD DS only, users not in Microsoft Entra ID | On-premises AD (with or without AD FS) | AD DS | **No** |
| Hybrid identity with AD DS | AD DS, synced to Microsoft Entra ID with **Microsoft Entra Connect** (federation with AD FS allowed) | AD DS joined, optionally Microsoft Entra hybrid joined | Yes |
| Hybrid identity with Microsoft Entra Domain Services | Microsoft Entra ID (cloud or synced), synced one way to the managed domain | Joined to the Microsoft Entra Domain Services domain | Yes |
| Cloud-only identity | Microsoft Entra ID only | **Microsoft Entra joined** | Yes |
| Third-party identity provider | Federated with Microsoft Entra ID | Microsoft Entra joined or hybrid joined, with Microsoft Entra authentication enabled | Yes |
| External identities (Microsoft Entra B2B guests) | Their home tenant or provider, invited into yours | Microsoft Entra joined, with SSO; Windows 11 Enterprise 24H2 or Windows Server 2025 with recent updates; Windows App | Yes |

For hybrid identities, the AD DS account and the Microsoft Entra account must match on **UPN or SID** (`ObjectSID` = `OnPremisesSecurityIdentifier`). Hybrid users can also use Microsoft Entra joined session hosts.

How to choose:

| Requirement | Scenario |
| --- | --- |
| Group Policy, legacy apps that need Kerberos or NTLM to on-premises servers, existing domain | AD DS (hybrid identity) |
| Domain services without managing domain controllers, no on-premises AD | Microsoft Entra Domain Services |
| No domain controller at all, Intune management, cloud-only users | Microsoft Entra ID (Microsoft Entra joined hosts) |
| Give access to users from a partner organization without creating accounts | External identities on Microsoft Entra joined hosts |

> **Exam trap.** "Users exist only in on-premises Active Directory" is never a valid end state: they must be synced to Microsoft Entra ID with Microsoft Entra Connect before they can use Azure Virtual Desktop, even if session hosts stay AD DS joined.

<!-- section: session-host-requirements | objectives: 2.1.2 -->
## Session host requirements for each identity scenario

| Scenario | What the session hosts need |
| --- | --- |
| AD DS | Line of sight to a domain controller (virtual network DNS pointing to the DCs, through peering, VPN or ExpressRoute); a join account with create-computer rights on the OU (reset password, validated writes to DNS host name and service principal name, read and write account restrictions) |
| Microsoft Entra Domain Services | Virtual network DNS set to the managed domain addresses; a join account member of **AAD DC Administrators**; password hashes available in the managed domain for the users: cloud-only users must change their password after Domain Services is enabled, synced users need password hash synchronization through **Microsoft Entra Connect Sync** (Microsoft Entra Cloud Sync isn't supported with Domain Services) |
| Microsoft Entra ID | Join type **Microsoft Entra ID** in the portal (optionally **enroll with Intune**), same tenant as the subscription; Windows 11, Windows 10 2004 or later, Windows Server 2022 or 2019; no domain controller needed |

Extra rules for **Microsoft Entra joined** session hosts:

- Users need the **Virtual Machine User Login** role (administrators: **Virtual Machine Administrator Login**) on the VMs, preferably on the resource group, assigned to the same group as the application group. This assignment is required only for host pools **without** a session host configuration.
- Without single sign-on, the Windows client connects only if the local PC is Microsoft Entra joined, hybrid joined or registered (Windows 10 2004 or later) in the **same tenant**. For other PCs and for the web, macOS, iOS and Android clients, add the RDP property `targetisaadjoined:i:1` (username and password only). The recommended answer is to enable SSO.
- FSLogix profiles go to Azure Files with **Microsoft Entra Kerberos**; reaching on-premises file servers or apps still needs AD DS and line of sight to it.
- Don't mix join types in one host pool.

> **Exam trap.** Microsoft Entra Domain Services and Microsoft Entra ID aren't the same option. Microsoft Entra Domain Services is a managed AD domain: hosts are domain joined, users need password hashes in it, and Microsoft Entra single sign-on isn't supported there. Microsoft Entra joined hosts need no domain at all.

<!-- section: azure-rbac | objectives: 2.1.3 -->
## Plan and implement Azure RBAC for Azure Virtual Desktop

Built-in roles cover the service objects (provider `Microsoft.DesktopVirtualization`). There is no Azure Virtual Desktop Owner role: use Owner.

| Role | Allows | Doesn't allow |
| --- | --- | --- |
| Desktop Virtualization Contributor | Manage all host pools, application groups, workspaces | Assign users (needs User Access Administrator), manage VMs |
| Desktop Virtualization Reader | View all Azure Virtual Desktop resources | Any change |
| Desktop Virtualization User | Use the desktop or apps of an **application group** (data action `useApplications`) | Any management |
| Desktop Virtualization Host Pool, Application Group or Workspace Contributor / Reader | Manage / view that object type | Create VMs, assign users (needs User Access Administrator) |
| Desktop Virtualization User Session Operator | Send messages, disconnect and sign out user sessions | Drain mode, remove hosts, change host pool settings |
| Desktop Virtualization Session Host Operator | View and remove session hosts, change drain mode | Add hosts in the portal |
| Desktop Virtualization Power On Contributor | Start VMs (given to the Azure Virtual Desktop service principal for Start VM on Connect) | Stop or deallocate |
| Desktop Virtualization Power On Off Contributor | Start, stop, deallocate, restart VMs (for scaling plans) | Create or delete VMs |
| Desktop Virtualization Virtual Machine Contributor | Create and replace session host VMs (for the managed identity of a session host configuration) | Application groups, workspaces |

To see the applications of the application groups related to a workspace, a Workspace Contributor also needs **Desktop Virtualization Application Group Reader**.

Typical answers:

| Requirement | Assignment |
| --- | --- |
| Users can open the desktop | Desktop Virtualization User on the **desktop application group** |
| Help desk signs out stuck users of one pool | User Session Operator on that **host pool** |
| An operator puts hosts in drain mode for patching | Session Host Operator |
| Start VM on Connect works | Power On Contributor for the Azure Virtual Desktop service principal on the VMs' resource group or subscription |
| An autoscale scaling plan can stop VMs | Power On Off Contributor for the service principal |
| A team creates application groups but never assigns users | Application Group Contributor |

> **Exam trap.** Azure RBAC roles control the Azure objects, not what a user can do inside Windows. Owner on the subscription doesn't make someone a local administrator of a session host, and Desktop Virtualization User on a **host pool** gives no access: it must be on the application group.

<!-- section: conditional-access | objectives: 2.1.4 -->
## Plan and implement Conditional Access policies

Conditional Access requires **Microsoft Entra ID P1** (or P2), can't be used while security defaults are enabled, and is created by at least a **Conditional Access Administrator** (Protection > Conditional Access > Policies > New policy).

| Policy setting | Value for Azure Virtual Desktop |
| --- | --- |
| Users | A group containing the Azure Virtual Desktop users |
| Target resources | **Azure Virtual Desktop** (app ID `9cdead84-a844-4324-93f2-b2e6bb768d07`): feed subscription, gateway, diagnostics. With SSO, also **Windows Cloud Login** (`270efc09-cd0d-444b-a71f-39af4910ec45`): sign-in to the session host |
| Not to target | **Azure Virtual Desktop Azure Resource Manager Provider**: it must not require MFA |
| Conditions > Client apps | Browser and Mobile apps and desktop clients |
| Grant | Require multifactor authentication (or require a compliant device, and so on) |
| Session > Sign-in frequency | Periodic reauthentication; **Every time** only on Windows Cloud Login with SSO |

Recommended structure with SSO: two matching policies, one on Azure Virtual Desktop and one on Windows Cloud Login, differing only by sign-in frequency. **Every time** on the Azure Virtual Desktop app would prompt at every feed refresh. On Windows Cloud Login, **Every time** prompts users when they launch a new connection 5 to 10 minutes or more after their last authentication.

For **Microsoft Entra joined** session hosts, disable legacy per-user MFA (otherwise "The sign-in method you're trying to use isn't allowed"), and exclude **Azure Windows VM Sign-In** from the policy if you don't want to restrict sign-in to strong methods such as Windows Hello for Business.

> **Exam tip.** "Require MFA when users connect from outside the corporate network" = a policy on the Azure Virtual Desktop app with a location condition excluding the trusted named location. "Prompt again every time a session host is opened" = sign-in frequency **Every time** on **Windows Cloud Login**, which requires SSO.

<!-- section: authentication-options | objectives: 2.1.5 -->
## Authentication options: passwordless, smart card and MFA

Three phases, each with its own options:

| Phase | Methods |
| --- | --- |
| Service (Microsoft Entra ID) | Password, MFA through Conditional Access, passwordless (Windows Hello for Business, FIDO2 security keys, Microsoft Authenticator), smart card through **Microsoft Entra certificate-based authentication** or AD FS, federated third-party provider |
| Session host (Windows sign-in) | With SSO: any method used for the service, including passwordless. Without SSO: password, or smart card and Windows Hello for Business certificate trust |
| In session (apps and websites) | Passwordless through **WebAuthn redirection** (Windows Hello for Business or FIDO2 key of the local device), smart card through **smart card redirection** |

Rules behind exam answers:

- **Smart cards and Windows Hello for Business at the session host use Kerberos only**, which needs line of sight to a domain controller KDC. From outside the corporate network: VPN, or a **KDC proxy** (a Windows Server 2016 or later server with the KDC proxy service of the RD Gateway role), declared on the host pool with the RDP property `kdcproxyname:s:<fqdn>`. The KDC proxy is supported by the Windows client, not by the web client.
- **WebAuthn redirection** is enabled by default on supported OS versions; disable it with `redirectwebauthn:i:0` or the **WebAuthn redirection** check box of the host pool RDP properties. For FIDO2 sign-in to Microsoft Entra resources, enable the FIDO2 security key method for the users.
- **Smart card redirection** also needs the card drivers on the session host.
- Passwordless sign-in **to the session host itself** (FIDO2, passkey, Authenticator) requires Microsoft Entra SSO.

```text
kdcproxyname:s:kdc.contoso.com
redirectwebauthn:i:1
redirectsmartcards:i:1
```

> **Exam trap.** Users who sign in to the feed with a FIDO2 key are still prompted for a password by the session host when SSO isn't configured. The fix is Microsoft Entra single sign-on, not another Conditional Access policy.

<!-- section: session-host-rights | objectives: 2.1.6 -->
## Manage roles, groups and rights on session hosts

Inside Windows, rights come from local groups and user rights assignments, managed per join type:

| Need | AD DS or Microsoft Entra Domain Services joined | Microsoft Entra joined |
| --- | --- | --- |
| Sign in as a standard user | Application group assignment; standard domain user | Application group assignment plus **Virtual Machine User Login** (pools without session host configuration) |
| Local administrator for the support team | Group Policy (Restricted Groups or Group Policy Preferences) adds a domain group to the local **Administrators** group | **Virtual Machine Administrator Login** role, or Intune account protection policy (local user group membership); Microsoft Entra Joined Device Local Administrator covers all joined devices |

Least-privilege practices:

- Users get standard rights; administrators use separate non-admin accounts and elevate in the session (Run as administrator).
- Manage local groups centrally (Group Policy or Intune), never by hand: hosts are re-created from the image.

> **Exam trap.** On a Microsoft Entra joined session host, Virtual Machine Administrator Login is the Azure role that grants **local administrator** rights at sign-in. Virtual Machine Contributor manages the VM resource but gives no sign-in right at all.

<!-- section: single-sign-on | objectives: 2.1.7 -->
## Configure Microsoft Entra single sign-on

Microsoft Entra SSO signs users in to Windows with their Microsoft Entra token: no second credential prompt, passwordless methods and third-party providers work at the session host, and Conditional Access applies to the host sign-in.

Prerequisites:

- Session hosts **Microsoft Entra joined or Microsoft Entra hybrid joined**. Hosts joined only to AD DS or to Microsoft Entra Domain Services aren't supported.
- Windows 11 or Windows 10 Enterprise (single or multi-session) or Windows Server 2022, with the October 2022 cumulative update or later.
- Application Administrator or Cloud Application Administrator role.
- Hybrid joined hosts in a domain other than the users' domain need a two-way trust.

Steps:

1. **Enable Microsoft Entra authentication for RDP** on the **Windows Cloud Login** service principal: Microsoft Entra ID > Devices > Remote connection configuration, or set `isRemoteDesktopProtocolEnabled` to true with Microsoft Graph.
2. **Hide the consent prompt**: add up to **10 device groups** (a dynamic group of the session hosts is convenient; dynamic groups need Microsoft Entra ID P1 or Intune for Education) as target device groups. Otherwise users approve each new host (remembered for 15 hosts and 30 days).
3. **Create a Microsoft Entra Kerberos server object** in AD DS when hosts are hybrid joined, or when Microsoft Entra joined hosts must reach AD DS resources (SMB shares, integrated authentication).
4. **Review Conditional Access**: add Windows Cloud Login to the policies.
5. **Enable SSO on the host pool**: RDP properties > Connection information > **Microsoft Entra single sign-on**, or the property below.

```text
enablerdsaadauth:i:1
```

With SSO, a locked session **disconnects** by default instead of showing the remote lock screen, so Conditional Access is evaluated again at reconnection.

> **Exam trap.** SSO isn't configured with an AD FS server or by saving credentials in the client: it's the Windows Cloud Login setting plus `enablerdsaadauth:i:1`. If hosts are only AD DS joined, the answer is to make them hybrid joined first.

<!-- section: key-points -->
## Key points

- Users must exist in Microsoft Entra ID and use the same identity for the service and for Windows; AD DS-only identities aren't supported.
- AD DS = line of sight to DCs; Microsoft Entra Domain Services = AAD DC Administrators and password hashes; cloud-only = Microsoft Entra joined hosts plus Virtual Machine User Login.
- Access = Desktop Virtualization User on the application group; operators get User Session Operator or Session Host Operator; the service principal gets Power On (Off) Contributor.
- Conditional Access targets the Azure Virtual Desktop app, plus Windows Cloud Login with SSO; never the Azure Resource Manager Provider app.
- Smart cards and Windows Hello for Business at the host use Kerberos: KDC proxy from outside; WebAuthn redirection for passwordless in session.
- SSO needs Microsoft Entra joined or hybrid joined hosts, Windows Cloud Login RDP authentication enabled, and `enablerdsaadauth:i:1`.
