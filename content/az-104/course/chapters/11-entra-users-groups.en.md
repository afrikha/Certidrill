Microsoft Entra ID is the identity service of Azure: every person, application or service that touches a subscription first authenticates against a Microsoft Entra tenant. This chapter covers the accounts, groups, licenses, guests and password reset settings an administrator manages every day.

<!-- section: tenant-and-roles | objectives: 1.1.1 -->
## Tenant, editions and administrator roles

A **tenant** is one instance of Microsoft Entra ID, with an initial domain `name.onmicrosoft.com` to which you can add verified custom domains (`contoso.com`). Several subscriptions can trust the same tenant.

Features depend on the edition:

| Edition | What matters for the exam |
| --- | --- |
| Free | Users, groups, B2B guests, password **change**, basic security defaults |
| P1 | Dynamic membership groups, group-based licensing, self-service password **reset** with writeback, Conditional Access |
| P2 | P1 plus Privileged Identity Management, Identity Protection, access reviews |

Two role systems coexist and don't replace each other:

| | Microsoft Entra roles | Azure roles (Azure RBAC) |
| --- | --- | --- |
| Control | Directory objects: users, groups, licenses, domains | Azure resources: virtual machines, storage, networks |
| Scope | Tenant (or administrative unit) | Management group, subscription, resource group, resource |
| Examples | Global Administrator, User Administrator | Owner, Contributor, Reader |

Least-privilege Microsoft Entra roles to know:

| Task | Least privileged role |
| --- | --- |
| Create and manage users, reset passwords of non-administrators | User Administrator |
| Create and manage groups, their members and owners | Groups Administrator |
| Only invite guests | Guest Inviter |
| Reset passwords of non-administrators and some limited administrators | Helpdesk Administrator |
| Assign licenses to users | License Administrator |
| Assign licenses to groups (group-based licensing) | User Administrator |
| Assign Microsoft Entra roles, create role-assignable groups | Privileged Role Administrator |

> **Exam trap.** Global Administrator has no access to Azure resources by default. It can **elevate** its access (Microsoft Entra ID > Properties > *Access management for Azure resources*), which assigns User Access Administrator at the root scope. Remove this access after use.

<!-- section: users | objectives: 1.1.1, 1.1.2 -->
## Creating and managing users

| Account type | Where it is mastered | Notes |
| --- | --- | --- |
| Cloud-only member | Microsoft Entra ID | Created in the portal, by script or in bulk |
| Synchronized member | On-premises AD DS, through Microsoft Entra Connect (Sync or cloud sync) | Identity, contact and job attributes are changed on-premises, then synchronized |
| Guest (B2B) | The guest's own organization or identity provider | Invited; `userType` is Guest |

Ways to create member accounts:

- **Portal**: Users > New user > Create new user. Required: user principal name (UPN) and display name; the initial password is generated or typed, and must be changed at first sign-in.
- **Bulk create**: Users > Bulk operations > Bulk create. Download the CSV template, fill it in, upload it. Required columns: name, user name (UPN) and initial password. No invitation is sent.
- **Command line**:

```bash
az ad user create --display-name "Ana Diaz" \
  --user-principal-name ana@contoso.com --password "<initial password>"
```

```powershell
$pw = @{ Password = "<initial password>"; ForceChangePasswordNextSignIn = $true }
New-MgUser -DisplayName "Ana Diaz" -UserPrincipalName "ana@contoso.com" `
  -MailNickname "ana" -AccountEnabled -PasswordProfile $pw
```

Properties worth remembering:

- **Usage location** (two-letter country code) is required before a license can be assigned directly to a user. It can be edited in Microsoft Entra ID even for synchronized users.
- **Department, job title, manager** feed dynamic group rules.
- From the **All users** list you can select several users (up to 60) and edit some properties at once: department, job title, usage location.
- For a synchronized user, an administrator's password reset in the cloud only reaches AD DS if **password writeback** is enabled.

**Deletion.** A deleted user stays 30 days in **Deleted users**. Restoring it brings back its properties, group memberships and the licenses it had. After 30 days, or if an administrator deletes it permanently, the account can't be recovered.

<!-- section: groups | objectives: 1.1.1, 1.1.2 -->
## Creating and managing groups

| Choice | Options | Rules |
| --- | --- | --- |
| Group type | **Security** or **Microsoft 365** | Can't be changed after creation. Security groups can contain users, devices, service principals and other groups. Microsoft 365 groups contain users only and come with a mailbox, a SharePoint site and other collaboration resources |
| Membership type | **Assigned**, **Dynamic User**, **Dynamic Device** | Dynamic Device exists for security groups only. The membership type can be changed later |

**Dynamic membership** adds and removes members automatically according to a rule on attributes:

```text
(user.department -eq "Sales") and (user.userType -eq "Member")
(user.country -in ["FR","BE"]) and (user.accountEnabled -eq true)
(device.deviceOSType -eq "Windows")
Direct Reports for "{object ID of the manager}"
```

- Requires a Microsoft Entra ID P1 license (or higher) for each user who is a member of a dynamic group.
- You can't add or remove members by hand in a dynamic group.
- A group is either made of users or of devices, never both through rules.
- Operators: `-eq`, `-ne`, `-startsWith`, `-contains`, `-match`, `-in`, `-notIn`, combined with `and`, `or`, `not`.
- A rule isn't instantaneous: after a rule or attribute change, processing can take minutes to hours.
- Converting an assigned group to dynamic keeps its name and ID; members who don't match the rule are removed.
- The *Direct Reports* rule can't be combined with other expressions.

**Nesting.** A security group can be a member of another security group, and Azure role assignments made to the parent apply to nested members. Group-based licensing and several application features, however, ignore nested groups.

**Role-assignable groups.** To assign a Microsoft Entra role to a group, the group must be created with *Microsoft Entra roles can be assigned to the group* = Yes. This can't be changed later, the membership must be Assigned, the group can't contain other groups, and creating it requires Privileged Role Administrator and a P1 license.

**Owners** manage the membership of their group without holding an administrator role. A deleted Microsoft 365 group can be restored for 30 days.

<!-- section: licenses | objectives: 1.1.3 -->
## Managing licenses

A license (product, or SKU) contains **service plans** that can be turned off individually, for example Microsoft 365 E5 without Bookings.

| Method | How it works |
| --- | --- |
| Direct assignment | To one user. The user must have a usage location |
| Group-based licensing | To a security group or a Microsoft 365 group; every direct member receives the license, including members added later. Members leaving the group lose it |

Rules of group-based licensing:

- **Nested groups aren't supported**: only first-level user members receive the license.
- Users without a usage location inherit the tenant's location.
- A user can hold the same license directly and through one or more groups; it consumes one license. Removing the user from the group doesn't remove a direct assignment.
- To move a user from one licensed group to another without interruption: add to the new group, check that the license is applied, then remove from the old group.
- Processing errors show on the group: **not enough licenses**, **conflicting service plans**, **service plans that depend on another plan**, **usage location not allowed**. After correcting the cause, *Reprocess* the group.

```powershell
Get-MgSubscribedSku | Select-Object SkuPartNumber, SkuId, ConsumedUnits
Update-MgUser -UserId ana@contoso.com -UsageLocation "FR"
Set-MgUserLicense -UserId ana@contoso.com `
  -AddLicenses @{ SkuId = "<sku id>" } -RemoveLicenses @()
```

Deleting a user frees its licenses; restoring the user gives them back.

<!-- section: external-users | objectives: 1.1.4 -->
## Managing external users

Microsoft Entra B2B collaboration lets a person from outside sign in with their own identity (another Microsoft Entra tenant, a Microsoft account, Google, or a one-time passcode by email).

1. An inviter enters the email address (Users > New user > Invite external user, bulk invite, or `New-MgInvitation`).
2. A guest object is created immediately, in the *Pending acceptance* state. Its UPN has the form `kim_fabrikam.com#EXT#@contoso.onmicrosoft.com`.
3. The guest redeems the invitation (link in the email, or direct link to an application) and accepts the consent prompt.

```powershell
New-MgInvitation -InvitedUserEmailAddress "kim@fabrikam.com" `
  -InviteRedirectUrl "https://myapps.microsoft.com" -SendInvitationMessage:$true
```

Facts about guests:

- `userType` is **Guest** by default, with restricted directory permissions. It's a property, not a location: a guest can be converted to Member and vice versa.
- A guest can be added to groups and can receive Azure role assignments and licenses like any other user.
- If the guest's email address changes, update the mail property then **reset the redemption status**: the object ID, memberships and assignments are kept.
- Bulk invite: Users > Bulk operations > Bulk invite, with a CSV containing the email address and the redirection URL.

Two groups of settings in **External Identities**:

| Setting | What it controls |
| --- | --- |
| External collaboration settings | Guest user access level; **who can invite** (anyone including guests, members, only specific admin roles, or no one); **collaboration restrictions**: allow list or block list of domains (one or the other) |
| Cross-tenant access settings | Inbound and outbound B2B collaboration with *other Microsoft Entra organizations*, per organization, users and groups; trust of the partner's MFA and device claims |

<!-- section: sspr | objectives: 1.1.5 -->
## Configuring self-service password reset (SSPR)

SSPR lets users reset a forgotten password or unlock their account without the help desk. Configure it under Microsoft Entra ID > Password reset.

| Page | Settings |
| --- | --- |
| Properties | SSPR enabled for **None**, **Selected** (one security group; nested groups are supported) or **All** |
| Authentication methods | Number of methods required to reset: **1 or 2**; security questions. Since September 30, 2025, the other methods (Microsoft Authenticator, OATH tokens, email, SMS or voice call...) can't be managed here: enable them for SSPR in the **Authentication methods policy** |
| Registration | Require users to register at sign-in; number of days before users reconfirm their information (0 to 730; 0 = never) |
| Notifications | Notify users on password resets; notify all admins when another admin resets their password |
| Customization | Custom help desk link or email |
| On-premises integration | Password writeback to AD DS; allow users to unlock accounts without resetting the password |

Licensing:

| Scenario | Minimum |
| --- | --- |
| Cloud-only user **changes** a known password | Every edition, including Free |
| Cloud-only user **resets** a forgotten password | Microsoft Entra ID P1 (or Microsoft 365 Business Standard) |
| Reset or change with **writeback** to on-premises AD DS | Microsoft Entra ID P1 (or Microsoft 365 Business Premium) |

**Password writeback** for synchronized users needs three steps, in this order: grant the Microsoft Entra Connect account the reset permissions in AD DS; enable the *Password writeback* optional feature in Microsoft Entra Connect; turn on writeback in the *On-premises integration* page. Without writeback, a synchronized user is told to contact the administrator.

> **Exam trap.** Administrator accounts don't follow the user policy. They are always enabled for SSPR with a **two-gate policy**: two methods required, security questions forbidden. Microsoft Authenticator and OATH tokens count as **one** method: they can't be combined to satisfy a two-method requirement.

A user can reset only if they are in scope, have registered enough distinct methods and, for synchronized accounts, writeback is enabled.

<!-- section: key-points -->
## Key points

- Microsoft Entra roles manage the directory; Azure roles manage resources. Neither grants the other.
- Dynamic membership and group-based licensing require P1; the group type never changes, the membership type can.
- Group-based licensing ignores nested groups; direct license assignment needs a usage location.
- Deleted users and Microsoft 365 groups are restorable for 30 days.
- A guest's UPN contains `#EXT#`; who may invite and which domains are allowed are external collaboration settings.
- SSPR: None, Selected (one group) or All; 1 or 2 methods; writeback needs P1 and Microsoft Entra Connect; administrators always use two methods.
