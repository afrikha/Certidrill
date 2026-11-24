Security principals are the accounts that can be granted access: users, computers, groups and service accounts. Exam questions ask which group scope to create so that accounts of several domains or forests reach a resource, how to create and manage accounts in bulk with PowerShell, and which kind of service account fits a service.

<!-- section: users-groups | objectives: 1.3.1 -->
## Creating and managing users and groups

Tools: Active Directory Users and Computers (`dsa.msc`), Active Directory Administrative Center, and the ActiveDirectory PowerShell module (installed with the AD DS role or with the Remote Server Administration Tools).

```powershell
New-ADOrganizationalUnit -Name "Sales" -Path "DC=corp,DC=contoso,DC=com"

New-ADUser -Name "Ana Silva" -SamAccountName "ana" -UserPrincipalName "ana@contoso.com" `
  -Path "OU=Sales,DC=corp,DC=contoso,DC=com" `
  -AccountPassword (Read-Host -AsSecureString "Password") -Enabled $true `
  -ChangePasswordAtLogon $true

New-ADGroup -Name "Sales-Users" -GroupScope Global -GroupCategory Security `
  -Path "OU=Sales,DC=corp,DC=contoso,DC=com"
Add-ADGroupMember -Identity "Sales-Users" -Members "ana"

# Bulk creation from a CSV file with columns Name, Sam, Ou
Import-Csv C:\Temp\users.csv | ForEach-Object {
  New-ADUser -Name $_.Name -SamAccountName $_.Sam -Path $_.Ou -Enabled $false
}
```

Daily operations:

| Task | Console | PowerShell |
| --- | --- | --- |
| Reset a password, unlock | **Reset Password** (with **Unlock the user account**) | `Set-ADAccountPassword -Reset`, `Unlock-ADAccount` |
| Disable or enable | **Disable Account** | `Disable-ADAccount`, `Enable-ADAccount` |
| Find locked, disabled or inactive accounts | Saved queries | `Search-ADAccount -LockedOut`, `-AccountDisabled`, `-AccountInactive` |
| Set an expiration date | Account tab | `Set-ADAccountExpiration` |
| Group membership of a user | **Member Of** tab | `Add-ADPrincipalGroupMembership`, `Get-ADPrincipalGroupMembership` |

A **user created by copying** a template account gets its group memberships and some of its properties, never its name or password. **Organizational units** hold accounts for delegation and Group Policy; they are not security principals and grant no access.

**Group types.** A **security** group can be used in permissions and user rights; a **distribution** group only for email. **Group scopes:**

| Scope | Can contain | Can be granted permissions in | Converts to |
| --- | --- | --- | --- |
| Global | Accounts and global groups of the **same domain** | Any domain of the forest and trusting domains or forests | Universal, if it isn't a member of another global group |
| Universal | Accounts, global and universal groups of **any domain of the forest** | Any domain of the forest and trusting forests | Domain local, if it isn't a member of another universal group; global, if it contains no universal group |
| Domain local | Accounts, global and universal groups of any domain or trusted domain (including other forests), domain local groups of the same domain | **Its own domain only** | Universal, if it contains no other domain local group |

The default groups of the Builtin container (Administrators, Backup Operators...) have the **Builtin Local** scope, which can't be changed. Change a scope with `Set-ADGroup -GroupScope`; a global group can't become domain local directly (go through universal).

The classic strategy (AGDLP): put **A**ccounts in **G**lobal groups by role, put global groups in **D**omain **L**ocal groups by resource, and grant the **P**ermissions to the domain local groups. In a multi-domain forest, universal groups gather global groups of several domains (AGUDLP).

> **Exam trap.** A global group can't contain users of another domain, and a domain local group can't be used for permissions outside its domain. When the stem mixes domains, check the scope against both rules before anything else.

<!-- section: multi-domain-forest | objectives: 1.3.2 -->
## Users and groups across domains and forests

Choosing the scope:

| Requirement | Group to use |
| --- | --- |
| Users of one domain, access to resources in several domains of the forest | Global group in the users' domain |
| Users of several domains of the forest, one list reused everywhere | Universal group containing the global groups of each domain |
| Users of another forest (through a trust) on a resource of this domain | Domain local group in the resource domain, with the users or global groups of the other forest as members |
| Permission on a file server's folder, members from anywhere | Domain local group of the server's domain |

Points that decide answers:

- **Universal group memberships** are stored in the **global catalog** and replicated forest-wide. Keep universal groups stable and nest global groups in them rather than individual users, so membership changes don't replicate to every global catalog.
- A member from another forest or an external domain is stored in the local domain as a **foreign security principal** (container `ForeignSecurityPrincipals`), a reference to its SID. When the source account is deleted, the reference stays: clean it up manually.
- **Only domain local groups** (and local groups of computers) can contain principals of another forest. Global and universal groups are limited to their domain and their forest.
- A one-way trust allows members of the trusted forest to be added to groups of the trusting forest, not the reverse. `Get-ADGroupMember` can fail on a group of the trusting forest that contains members of the trusted forest; use Active Directory Users and Computers in that case.
- **UPN suffixes** let users sign in with a friendly name (`ana@contoso.com`) whatever their domain: add them in Active Directory Domains and Trusts (properties of the root node) or with `Set-ADForest -UPNSuffixes @{Add="contoso.com"}`. Across a forest trust, the suffixes are routed to the forest that owns them; a suffix used in both forests is in conflict.
- Moving a user to another domain of the forest gives it a new SID; the old SID is copied to `SIDHistory` and stays in the access token, so ACLs that name the old SID don't need to change. Moving it between OUs of the same domain keeps its SID.

```powershell
# Universal group in the forest root, fed by the global groups of two domains
New-ADGroup -Name "All-Sales" -GroupScope Universal -GroupCategory Security
Add-ADGroupMember -Identity "All-Sales" -Members "CN=Sales-Users,OU=Sales,DC=corp,DC=contoso,DC=com"

# Domain local group on the resource side, members from the trusted forest fabrikam.com
New-ADGroup -Name "DL-Finance-Share-Read" -GroupScope DomainLocal -GroupCategory Security
Add-ADGroupMember -Identity "DL-Finance-Share-Read" `
  -Members (Get-ADGroup -Identity "Auditors" -Server "fabrikam.com")
```

> **Exam trap.** Users of a trusted forest can't be added to a global or universal group of your forest. To give them access, create a domain local group in the resource domain, add their accounts or global groups to it, and grant the permission to that group.

<!-- section: service-accounts | objectives: 1.3.3 -->
## Selecting and managing service accounts

| Account | Password | Used by | Choose it when |
| --- | --- | --- | --- |
| Domain user account | Set and rotated by an administrator, follows the password policy | Any server | Only for applications that support nothing else |
| Standalone managed service account (sMSA) | Managed by Windows | One computer | A service on one server, never a cluster or farm |
| Group managed service account (gMSA) | Computed by the DCs (default rotation every 30 days), retrieved by authorized hosts | Several servers | A farm, a load-balanced service, a cluster, scheduled tasks on several servers |
| Delegated managed service account (dMSA) | Fully randomized keys held by the DCs, bound to the machine identity | Computers mapped to it (Windows Server 2025) | A new standalone account, or the replacement of an existing service account, that stops credential theft (kerberoasting) |
| Virtual account (`NT SERVICE\name`) | None; uses the computer account on the network | One computer | A local service that needs no domain identity of its own |

**gMSA prerequisites and steps:**

1. A **KDS root key** in the forest, created once by a Domain Admin or Enterprise Admin. DCs wait up to 10 hours after its creation before using it, so that it replicates everywhere. In a lab with one DC, back-date it.
2. A security group that contains the computer accounts of the hosts allowed to use the account.
3. Create the gMSA, then install and test it on each host, and configure the service to run as `CORP\svc-web$` with an empty password.

```powershell
# 1. Once per forest (production: let it replicate before use)
Add-KdsRootKey -EffectiveImmediately
# Lab with a single DC only
Add-KdsRootKey -EffectiveTime ((Get-Date).AddHours(-10))

# 2-3. Create the gMSA for the hosts of the group WebFarm-Hosts
New-ADServiceAccount -Name "svc-web" -DNSHostName "svc-web.corp.contoso.com" `
  -PrincipalsAllowedToRetrieveManagedPassword "WebFarm-Hosts"

# On each host (after a restart if it was just added to the group)
Install-ADServiceAccount -Identity "svc-web"
Test-ADServiceAccount -Identity "svc-web"
```

Rules to remember: gMSA names are unique in the forest; the password interval (`-ManagedPasswordIntervalInDays`) can be set only at creation; `Reset-ADServiceAccountPassword` applies to sMSAs only; to let another host use the gMSA, add its computer account to the group. An sMSA is created with `New-ADServiceAccount -RestrictToSingleComputer`, linked to its computer with `Add-ADComputerServiceAccount`, then installed with `Install-ADServiceAccount`.

**dMSA migration** (Windows Server 2025): create the dMSA with `New-ADServiceAccount -CreateDelegatedServiceAccount`, start the migration with `Start-ADServiceAccountMigration -Identity "<dMSA>" -SupersededAccount "<DN of the old account>"`, let it learn the computers that use the old account, then run `Complete-ADServiceAccountMigration`. The old account is disabled and its SPNs move to the dMSA. Prerequisites: a KDS root key, Windows Server 2025 (dMSA setup is available only on Windows Server 2025, and every machine that uses the account must support dMSA), a writable DC for the migration, and the **Enable Delegated Managed Service Account logons** Kerberos policy (or the `DelegatedMSAEnabled` registry value) on the computers. Once the account is linked, restart the services that use it; the dMSA adds a computer at each ticket renewal. A dMSA can also be created as a standalone account, without migration. You can't migrate an sMSA or a gMSA to a dMSA; don't delete the old account after migration.

> **Exam trap.** "The service runs on three Windows Server 2022 servers behind a load balancer and the password must change automatically" is a gMSA, not an sMSA (one computer) and not a dMSA (available only on Windows Server 2025). If the gMSA creation succeeds but the host can't use it, check the KDS root key age and the host's group membership.

<!-- section: key-points -->
## Key points

- Global: members from its own domain. Universal: members from the whole forest, stored in the global catalog. Domain local: members from anywhere, permissions in its own domain only.
- AGDLP: accounts in global groups, global groups in domain local groups, permissions on domain local groups; universal groups to span domains.
- Principals of another forest go only into domain local groups; they appear as foreign security principals.
- UPN suffixes are added at the forest level and routed across forest trusts.
- sMSA: one computer. gMSA: several hosts, needs a KDS root key and a host group. dMSA: Windows Server 2025, a standalone account or the replacement of an existing service account, bound to machines.
- gMSA steps: `Add-KdsRootKey`, `New-ADServiceAccount -PrincipalsAllowedToRetrieveManagedPassword`, `Install-ADServiceAccount`, `Test-ADServiceAccount`.
