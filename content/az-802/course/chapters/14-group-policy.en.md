Group Policy is how AD DS pushes configuration to domain-joined Windows Server and Windows clients. Exam questions describe a forest with sites, OUs and GPO links, then ask which setting wins, why a GPO doesn't apply to one server, or which feature to use: a policy setting, a preference, a filter or loopback processing.

<!-- section: gpo-anatomy | objectives: 1.4.1 -->
## Anatomy of a GPO and the tools

A Group Policy Object (GPO) is stored in two places, replicated separately:

| Part | Where | Replicated by |
| --- | --- | --- |
| Group Policy Container (GPC) | AD DS, `CN=Policies,CN=System,DC=contoso,DC=com`: version, status, links to WMI filters | AD DS replication |
| Group Policy Template (GPT) | SYSVOL, `\\contoso.com\SYSVOL\contoso.com\Policies\{GUID}`: settings files, scripts | DFS Replication (SYSVOL) |

Each GPO has two halves: **Computer Configuration** (applied at startup and at background refresh, whoever signs in) and **User Configuration** (applied at sign-in and refresh). Each half has **Policies** (software settings, Windows settings such as security and scripts, Administrative Templates) and **Preferences** (see [Group Policy preferences](#preferences)).

The two GPOs created with the domain:

| GPO | Linked to | Use it for |
| --- | --- | --- |
| Default Domain Policy | The domain | Domain account policies: password, account lockout, Kerberos policy |
| Default Domain Controllers Policy | The Domain Controllers OU | User rights assignment and security options of domain controllers |

> **Exam trap.** Password and account lockout settings for **domain** accounts take effect only from a GPO linked to the **domain**. The same settings in a GPO linked to an OU change the local accounts of the computers in that OU, not the domain users. Different password rules for a group of domain users need a fine-grained password policy, not an OU GPO.

**Administrative Templates** are defined by ADMX files (language-neutral) and ADML files (per language). By default the editor reads them from `C:\Windows\PolicyDefinitions` on the admin's computer. A **central store** makes every administrator use the same templates: create `\\contoso.com\SYSVOL\contoso.com\Policies\PolicyDefinitions`, copy the ADMX files and the language folders (`en-US`, `fr-FR`) there. When the folder exists, the Group Policy Management Editor uses it instead of the local folder.

A **starter GPO** is a template containing only Administrative Templates settings, used as the base for new GPOs.

Tools: the Group Policy Management Console (GPMC, `gpmc.msc`) to create, link, filter, back up and report; the Group Policy Management Editor to edit settings; the `GroupPolicy` PowerShell module (installed with GPMC, part of RSAT).

```powershell
# Create a GPO from a starter GPO and link it to an OU
New-GPO -Name "Servers-Baseline" -StarterGpoName "Server Template" |
    New-GPLink -Target "OU=Servers,DC=contoso,DC=com" -LinkEnabled Yes

# Set a registry-based policy value (Administrative Templates)
Set-GPRegistryValue -Name "Servers-Baseline" `
    -Key "HKLM\Software\Policies\Microsoft\Windows NT\Terminal Services" `
    -ValueName "fDenyTSConnections" -Type DWord -Value 0
```

<!-- section: processing-order | objectives: 1.4.1 -->
## Processing order, inheritance and precedence

GPOs are applied in the order **L-S-D-OU**: local GPO, then GPOs linked to the **site**, then to the **domain**, then to each **OU** from the parent down to the OU that contains the object. When two GPOs configure the same setting with different values, the one **applied last wins**: the closest OU wins over the domain, the domain wins over the site.

Inside one container, several GPOs are ordered by **link order**: link order 1 has the **highest** precedence, so it is processed last.

| Feature | Set on | Effect |
| --- | --- | --- |
| Block Inheritance | A domain or an OU | GPOs linked to parent containers (and sites) don't apply below it |
| Enforced | A GPO **link** | The GPO applies through Block Inheritance and its settings win over GPOs linked lower |
| Link enabled = No | A GPO link | The link is ignored; the GPO still exists and can be linked elsewhere |
| GPO status | The GPO | All settings enabled, User settings disabled, Computer settings disabled, All settings disabled |

When two **enforced** GPOs conflict, the one linked **higher** (closer to the domain) wins. Enforcement always beats Block Inheritance.

> **Exam trap.** Enforced is a property of the link, Block Inheritance a property of the container. To make a domain-level security baseline apply to an OU whose administrator blocked inheritance, enforce the domain link. Removing Block Inheritance would also let every other parent GPO in.

Refresh: computer settings apply at startup, user settings at sign-in, then both refresh in the background every **90 minutes** with a random offset of up to **30 minutes**; domain controllers refresh every **5 minutes**. Security settings are reapplied every 16 hours even if the GPO didn't change. Some settings (software installation, folder redirection) apply only at startup or sign-in, never in the background.

```powershell
gpupdate /force                         # local refresh of computer and user settings
Invoke-GPUpdate -Computer SRV1 -Force   # remote refresh through a scheduled task on SRV1
Set-GPLink -Name "Security-Baseline" -Target "DC=contoso,DC=com" -Enforced Yes
Set-GPInheritance -Target "OU=Lab,DC=contoso,DC=com" -IsBlocked Yes
Set-GPLink -Name "Servers-Baseline" -Target "OU=Servers,DC=contoso,DC=com" -Order 1
```

GPOs linked to a **site** apply to the computers whose IP address maps to that site (and to the users who sign in to them), whatever their domain in the forest.

<!-- section: filtering-loopback | objectives: 1.4.1 -->
## Filtering and loopback processing

A linked GPO applies to an object in scope only if the filters allow it:

| Filter | How it works | Typical requirement |
| --- | --- | --- |
| Security filtering | The user or computer needs **Read** and **Apply group policy** on the GPO. Default: Authenticated Users | "Apply only to the members of group G-Web" |
| Deny Apply group policy | A deny ACE on the GPO for a group | "Apply to the whole OU except group G-Exempt" |
| WMI filter | A WQL query evaluated on the target computer; false = the GPO isn't applied. One WMI filter per GPO, one filter can serve many GPOs | "Only servers running a given OS version" or "only computers with more than 8 GB of memory" |
| Item-level targeting | Per preference item, not per GPO | See [Group Policy preferences](#preferences) |

> **Exam trap.** When you replace Authenticated Users with a user group in security filtering, the user settings stop applying: user GPOs are read in the computer's security context. Keep Read (without Apply) for Authenticated Users or Domain Computers on the GPO.

**Loopback processing** makes the **user** settings depend on the **computer** the user signs in to. It's a computer setting: Computer Configuration > Policies > Administrative Templates > System > Group Policy > *Configure user Group Policy loopback processing mode*, set in a GPO that applies to the computers (for example the Remote Desktop session hosts' OU).

| Mode | Resulting user settings |
| --- | --- |
| Merge | User's own GPOs first, then the User Configuration of the GPOs that apply to the computer; on conflict the computer's GPOs win |
| Replace | Only the User Configuration of the GPOs that apply to the computer; the user's own GPOs are ignored |

```powershell
# A WMI filter query that matches only servers that aren't domain controllers (ProductType 3)
# SELECT * FROM Win32_OperatingSystem WHERE ProductType = "3"

# Security filtering: only G-Web applies the GPO, computers keep Read
Set-GPPermission -Name "Web-Settings" -TargetName "G-Web" -TargetType Group -PermissionLevel GpoApply
Set-GPPermission -Name "Web-Settings" -TargetName "Authenticated Users" -TargetType Group -PermissionLevel GpoRead -Replace
```

> **Exam tip.** "Users get a locked-down desktop only when they sign in to RDS1 and RDS2, whatever OU their account is in" means loopback in **Replace** mode on a GPO linked to the servers' OU. "Keep their normal settings and add the server's" means **Merge**.

<!-- section: troubleshoot-backup | objectives: 1.4.1 -->
## Troubleshooting, backup and migration

| Tool | Answers |
| --- | --- |
| `gpresult /r` | Which GPOs applied or were filtered out (and why) for the current user and computer |
| `gpresult /h report.html` | The full Resultant Set of Policy (RSoP) report, with the winning GPO of each setting |
| Group Policy Results (GPMC) | Same report, collected from a remote computer |
| Group Policy Modeling (GPMC) | Simulation of a "what if" (another OU, site, group membership, loopback) before the change |
| Event Viewer, `Microsoft-Windows-GroupPolicy/Operational` | Processing details and errors (DC not reachable, slow link, a client-side extension failing) |

Run `gpresult /scope computer /r` from an elevated prompt to see the computer part. A GPO shown as "Denied (Security)" is filtered by permissions; "Denied (WMI Filter)" by its WMI filter; "Not applied (Empty)" has no settings in that half.

Common causes of a GPO not applying: the object isn't in the linked OU (GPOs link to OUs, sites and domains, not to the default `Users` and `Computers` containers), the link is disabled, Block Inheritance, security or WMI filtering, the relevant half of the GPO disabled, a setting placed in the wrong half (a computer setting can't apply to users), or SYSVOL not yet replicated to the DC the client uses.

Backup and copy:

```powershell
Backup-GPO -All -Path "\\FS1\GpoBackup"                     # settings, security filtering, WMI filter link
Restore-GPO -Name "Servers-Baseline" -Path "\\FS1\GpoBackup" # same domain, same GPO (GUID)
Import-GPO -BackupGpoName "Servers-Baseline" -Path "\\FS1\GpoBackup" `
    -TargetName "Servers-Baseline" -CreateIfNeeded -MigrationTable "\\FS1\GpoBackup\fabrikam.migtable"
Copy-GPO -SourceName "Servers-Baseline" -TargetName "Servers-Baseline-Test"
```

| Need | Operation |
| --- | --- |
| Undo a bad edit of an existing GPO | Restore-GPO from a backup |
| Recreate a GPO deleted by mistake | Restore-GPO (the backup recreates it with its GUID) |
| Move settings to another domain or forest | Import-GPO into a GPO of the target domain, with a **migration table** that maps the source domain's users, groups and UNC paths |
| Duplicate a GPO in the same domain | Copy-GPO |

> **Exam trap.** Restoring or importing a GPO doesn't recreate its **links**: link it again to the sites, domain and OUs afterwards.

<!-- section: preferences | objectives: 1.4.2 -->
## Group Policy preferences

Preferences configure items that policies don't cover (drive maps, files, shortcuts, local groups, scheduled tasks, any registry value), with a different behavior:

| | Policy settings | Preferences |
| --- | --- | --- |
| Where the value is written | Policy registry keys (`...\Policies\...`) | The normal location used by Windows or the application |
| Can the user change it | No, the UI is locked | Yes, until the next refresh rewrites it (or never, with *Apply once*) |
| When the GPO no longer applies | Removed automatically | Stays in place ("tattoo") unless *Remove this item when it is no longer applied* is selected |
| Targeting | Per GPO (security, WMI filter) | Per item (item-level targeting) |

Preference extensions are under Computer Configuration or User Configuration > Preferences:

| Group | Items | Available in |
| --- | --- | --- |
| Windows Settings | Environment, Files, Folders, Ini Files, Registry, Shortcuts | Computer and User |
| Windows Settings | Drive Maps | User only |
| Windows Settings | Network Shares | Computer only |
| Control Panel Settings | Data Sources, Devices, Folder Options, Local Users and Groups, Network Options, Power Options, Printers, Scheduled Tasks | Computer and User |
| Control Panel Settings | Services | Computer only |
| Control Panel Settings | Internet Settings, Regional Options, Start Menu | User only |

Every item has an **action**:

| Action | Item missing | Item present |
| --- | --- | --- |
| Create | Created | Left unchanged |
| Replace | Created | Deleted and recreated with the configured values |
| Update (default for most items) | Created | Only the configured properties are changed |
| Delete | Nothing | Deleted |

The **Common** tab of each item adds: *Stop processing items in this extension if an error occurs*, *Run in logged-on user's security context* (needed for user items that read user resources, such as a drive map to a share the computer account can't reach), *Remove this item when it is no longer applied* (forces the Replace action), *Apply once and do not reapply*, and *Item-level targeting*.

**Item-level targeting** filters one item with conditions combined by AND/OR, negated with "is not", and grouped in collections: security group, organizational unit, site, computer name, operating system, IP address range, registry match, WMI query, language, time range, battery present and others.

> **Exam tip.** "Map drive `S:` to `\\FS1\Sales` only for the members of G-Sales, and drive `F:` to `\\FS1\Finance` only for G-Finance, with one GPO" means one GPO with two Drive Maps items, each with item-level targeting on a security group. Two GPOs with security filtering also work but don't meet "one GPO".

> **Exam trap.** Preferences can no longer store passwords: since security update MS14-025 the password fields of Local Users and Groups, Drive Maps, Services, Scheduled Tasks and Data Sources are disabled, because the stored value could be decrypted by any domain user. To manage local administrator passwords, use Windows LAPS.

**Local Users and Groups** is the preferred way to add a domain group to the local Administrators group of servers: action **Update**, group "Administrators (built-in)", add `CONTOSO\G-SrvAdmins`. It adds members without removing the others, unless *Delete all member users* / *Delete all member groups* is selected. The older **Restricted Groups** policy (Computer Configuration > Policies > Windows Settings > Security Settings) with "Members of this group" **replaces** the whole membership.

<!-- section: key-points -->
## Key points

- Order L-S-D-OU; the last GPO applied wins; link order 1 = highest precedence inside a container.
- Enforced (on a link) beats Block Inheritance (on a container); between enforced GPOs the higher one wins.
- Domain password and lockout policy only from a GPO linked to the domain.
- Security filtering needs Read + Apply; computers must keep Read for user settings to apply. One WMI filter per GPO.
- Loopback: computer setting, Merge keeps user GPOs, Replace ignores them.
- Restore-GPO for the same domain, Import-GPO with a migration table across domains; links are never restored.
- Preferences: normal registry locations, user can change them, they stay after removal unless told otherwise; actions Create, Replace, Update, Delete; item-level targeting per item; no passwords.
