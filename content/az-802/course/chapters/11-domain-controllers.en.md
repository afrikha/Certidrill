Domain controllers run Active Directory Domain Services (AD DS): they hold the directory database, authenticate users and computers, and replicate changes to each other. Exam questions ask how to add or remove one (on premises or in Azure), when an RODC is the right choice and how to control which passwords it caches, and how to move or recover the five FSMO roles.

<!-- section: deploy-locally | objectives: 1.1.1 -->
## Deploying and removing domain controllers on premises

Promotion is a two-step process: install the role, then configure it with Server Manager (**Promote this server to a domain controller**) or with the ADDSDeployment module.

```powershell
# 1. Install the role and the management tools
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

# 2a. First domain controller of a new forest (prompts for the DSRM password)
Install-ADDSForest -DomainName "corp.contoso.com" -InstallDns

# 2b. Additional domain controller in an existing domain
Install-ADDSDomainController -DomainName "corp.contoso.com" -InstallDns `
  -SiteName "Paris" -Credential (Get-Credential "CORP\Admin1")
```

| Operation | Cmdlet | Minimum credentials |
| --- | --- | --- |
| New forest | `Install-ADDSForest` | Local Administrator on the server |
| New child or tree domain | `Install-ADDSDomain` | Enterprise Admins |
| Additional domain controller | `Install-ADDSDomainController` | Domain Admins |
| Demote a DC | `Uninstall-ADDSDomainController` | Domain Admins; Enterprise Admins for the last DC of a domain, which removes the domain |

Promotion rules:

- **Adprep runs automatically** for the first DC of a newer version: the **schema master** must be reachable (`adprep /forestprep`) and the domain's **infrastructure master** (`adprep /domainprep`). Run adprep manually only before an in-place upgrade of a DC, or when the installer isn't an Enterprise Admin.
- **Every promotion needs the RID master**; adding or removing a domain needs the **domain naming master**.
- `-SiteName` must name an existing site. Without it, the DC joins the site of its subnet.
- The **Directory Services Restore Mode (DSRM) password** is asked for every promotion; it is used to start the DC in DSRM for an offline restore.
- The `Test-ADDS*` cmdlets run the prerequisites check alone. Server Manager can't skip it; `-SkipPreChecks` exists but is discouraged.
- **Install from media (IFM)** avoids the initial replication over a slow link. Create the media on a DC of the same Windows Server version; IFM can't install the first DC of a domain.

```powershell
# On an existing DC: create IFM media that includes SYSVOL
ntdsutil "activate instance ntds" ifm "create sysvol full nodefrag C:\IFM" quit quit

# On the new DC
Install-ADDSDomainController -DomainName "corp.contoso.com" -InstallationMediaPath "C:\IFM"
```

**Functional levels** decide which Windows Server versions can be DCs. Current levels: Windows Server 2012 R2, Windows Server 2016 (also the latest level for Windows Server 2019 and 2022) and Windows Server 2025 (Windows Server 2025 DCs only). A Windows Server 2025 DC can join only a domain and forest at the Windows Server 2016 level or higher, and new forests start at that level at least. Raise levels with `Set-ADDomainMode` and `Set-ADForestMode`; a raised level generally can't be lowered.

**Upgrades and removal.** Microsoft recommends promoting new servers and demoting the old ones rather than upgrading a DC in place. A normal demotion moves the FSMO roles away and removes the DC from the directory. For a DC that can't reach the others, `-ForceRemoval` demotes it without cleaning the directory: seize its roles and perform **metadata cleanup** from a healthy DC, by deleting its computer object in Active Directory Users and Computers (and confirming it is permanently offline) or with `ntdsutil` > `metadata cleanup` > `remove selected server`.

**Virtualized DCs.** Hyper-V exposes a **VM-Generation ID** that lets AD DS detect a VM restored from a snapshot and protect itself.

> **Exam trap.** The VM-Generation ID doesn't protect a DC whose VHD or VHDX files were copied over the existing ones, or restored with file or full-disk backup software: the result can be a USN rollback. Back up domain controllers with a system state backup.

<!-- section: azure-dcs | objectives: 1.1.2 -->
## Domain controllers in Azure

AD DS runs on Azure virtual machines as on premises (unlike Microsoft Entra Domain Services, a managed service). The Azure-specific rules:

| Area | Requirement |
| --- | --- |
| Availability | At least two DC VMs in different availability zones, or in an availability set where the region has no zones |
| IP address | A static private IP address set on the VM's network interface in Azure. No public IP address; administer through Azure Bastion |
| Disks | A separate data disk for `NTDS.dit`, logs and SYSVOL, with host caching set to **None** (the database engine manages its own write ordering). Persistent managed OS disk, never ephemeral |
| DNS | The DCs as custom DNS servers of the virtual network and of peered networks |
| Sites | An AD DS site with the Azure subnets, and a site link to the on-premises sites |
| Global catalog | At least two Azure DCs as global catalog servers |
| Network | An NSG that allows AD DS traffic from and to on premises only, over site-to-site VPN or ExpressRoute |
| Shutdown | From inside the guest operating system, not by stopping (deallocating) the VM in the portal |

The prerequisites check warns that the network adapter has no static IP address: ignore it, the address is static in Azure. VMs keep their DNS settings until they restart, so restart them after you change the virtual network DNS servers. On a DC, its own address or the loopback address goes only in second or third position in the DNS list.

Deallocating a DC VM resets its VM-Generation ID: the DC discards its RID pool, resets its invocation ID and marks SYSVOL nonauthoritative. If every DC of a domain is deallocated at once, none finds an authoritative replica at restart.

> **Exam trap.** A virtual network left on Azure-provided DNS can't resolve the on-premises domain, so the VM can't find a DC to promote against. Point the virtual network DNS to the on-premises DNS servers before you deploy the first DC in Azure, then list the Azure DCs first once they are promoted.

<!-- section: rodc-deploy | objectives: 1.1.3 -->
## Deploying read-only domain controllers

An RODC is meant for locations where physical security can't be guaranteed, typically a branch office:

| Feature | Effect |
| --- | --- |
| Read-only AD DS database and SYSVOL | Changes are made on a writable DC and replicated to the RODC |
| Unidirectional replication | The RODC replicates inbound only; writable DCs never replicate from it |
| Credential caching | By default only its own computer account and its own `krbtgt` account (so its tickets aren't valid on other DCs); other passwords only if its policy allows |
| Administrator role separation | A delegated user or group is local administrator of the RODC without any domain right |
| Read-only DNS | Read-only copies of the AD-integrated zones |
| Filtered attribute set | Sensitive attributes (for example BitLocker recovery data) never replicate to any RODC |

Two ways to install one:

1. **Without staging.** A Domain Admin promotes the server with `Install-ADDSDomainController -ReadOnlyReplica`, optionally with `-DelegatedAdministratorAccountName`, `-AllowPasswordReplicationAccountName` and `-DenyPasswordReplicationAccountName`. The first unstaged RODC runs `adprep /rodcprep` automatically.
2. **Staged.** A Domain Admin pre-creates the account (Active Directory Administrative Center > Domain Controllers > **Pre-create a Read-only domain controller account**, or `Add-ADDSReadOnlyDomainControllerAccount`) with its name, site, options, policy and delegated administrator. Later the delegated administrator, without domain rights, attaches a server of the **same name** with `-UseExistingAccount`.

```powershell
# Step 1, by a Domain Admin
Add-ADDSReadOnlyDomainControllerAccount -DomainControllerAccountName "RODC1" `
  -DomainName "corp.contoso.com" -SiteName "Lyon" `
  -DelegatedAdministratorAccountName "CORP\Lyon-RODC-Admins"

# Step 2, on the branch server, by a member of Lyon-RODC-Admins
Install-ADDSDomainController -DomainName "corp.contoso.com" -UseExistingAccount `
  -Credential (Get-Credential "CORP\LyonAdmin")
```

Prerequisites: a writable DC reachable from the RODC, and `adprep /rodcprep` (Enterprise Admins) once per forest. A staged install doesn't run it: run it manually or install one unstaged RODC first. Keep DNS and global catalog on the RODC so the branch works when the WAN link is down. Change the delegated administrator later on the **Managed By** tab of the RODC computer account; it accepts one principal, so use a group.

> **Exam trap.** The delegated administrator of an RODC isn't added to Domain Admins or to the domain Administrators group. It can install drivers, restart AD DS and read logs on that RODC only.

<!-- section: rodc-accounts | objectives: 1.1.4 -->
## Managing account security on an RODC

The **Password Replication Policy (PRP)** of each RODC is an Allowed list and a Denied list on its computer account. **Deny wins** over Allow; an account in neither list isn't cached.

| Default list | Members |
| --- | --- |
| Allowed | Allowed RODC Password Replication Group (empty by default) |
| Denied | Administrators, Server Operators, Backup Operators, Account Operators, Denied RODC Password Replication Group |

The Denied RODC Password Replication Group contains Domain Admins, Enterprise Admins, Schema Admins, Cert Publishers, Group Policy Creator Owners, Domain Controllers and Read-only Domain Controllers. To treat one branch differently, edit the lists of its RODC rather than these domain-wide groups.

At the first sign-in at the branch, the RODC forwards the authentication to a writable DC, which checks the PRP; if allowed, the password is cached and the RODC then authenticates the account alone, even with the WAN link down. Allow the branch **computer accounts** too, or computers can't authenticate when the link is down.

| Need | Tool |
| --- | --- |
| Edit the lists | RODC account > **Password Replication Policy** tab, or `Add-ADDomainControllerPasswordReplicationPolicy -Identity RODC1 -AllowedList "Lyon-Users"` (or `-DeniedList`) |
| Cache passwords in advance | **Advanced** > **Prepopulate Passwords**, `repadmin /rodcpwdrepl` or `Sync-ADObject -PasswordOnly` |
| See which passwords are cached | `Get-ADDomainControllerPasswordReplicationPolicyUsage -RevealedAccounts` |
| See who authenticated through the RODC | `Get-ADDomainControllerPasswordReplicationPolicyUsage -AuthenticatedAccounts`: candidates for the Allowed list |
| Check the result for one account | **Advanced** > **Resultant Policy**, or `Get-ADAccountResultantPasswordReplicationPolicy` |

```powershell
Get-ADDomainController -Filter "IsReadOnly -eq `$true" |
  Get-ADDomainControllerPasswordReplicationPolicyUsage -RevealedAccounts

Get-ADUser -Identity ana | Sync-ADObject -Destination "RODC1" -PasswordOnly
```

**When an RODC is stolen**, delete its computer account in the Domain Controllers OU. The dialog offers to reset the passwords cached on it and to **export the list of accounts that were cached** to a file: export it, the list is gone once the account is deleted. Then rebuild the RODC.

> **Exam trap.** Removing a user from the Allowed list doesn't remove a password already cached on the RODC. Only a password reset on a writable DC makes the cached copy useless.

<!-- section: fsmo | objectives: 1.1.5 -->
## Managing and troubleshooting FSMO roles

| Role | Scope | What it does | If it is unavailable |
| --- | --- | --- | --- |
| Schema master | Forest | Only DC that writes schema changes (`adprep /forestprep`, applications) | Schema extensions fail |
| Domain naming master | Forest | Adds and removes domains and application partitions | You can't add or remove a domain |
| PDC emulator | Domain | Gets password changes first, is checked after a bad password, processes lockouts, default DC for Group Policy edits; in the forest root, time source of the forest | Password, lockout and time problems appear quickly |
| RID master | Domain | Gives DCs RID pools (500 RIDs by default) to create SIDs | DCs create objects until their pool runs out; new DCs can't be promoted |
| Infrastructure master | Domain | Updates references to objects of other domains | Stale cross-domain references |

Placement: forest roles in the forest root domain, the PDC emulator on a reliable and powerful DC, and a standby DC (a direct replication partner) for each holder. The infrastructure master shouldn't be a global catalog server, unless every DC is one or the AD Recycle Bin is enabled (the role then has no work).

```powershell
# Find the role holders
Get-ADDomain | Format-List InfrastructureMaster, RIDMaster, PDCEmulator
Get-ADForest | Format-List DomainNamingMaster, SchemaMaster
netdom query fsmo

# Transfer to DC2 (both DCs online)
Move-ADDirectoryServerOperationMasterRole -Identity "DC2" -OperationMasterRole PDCEmulator, RIDMaster

# Seize on DC2 (former holder permanently offline)
Move-ADDirectoryServerOperationMasterRole -Identity "DC2" -OperationMasterRole RIDMaster -Force
```

`-Identity` is the DC that **receives** the roles; with `-Force` the cmdlet tries a transfer first and seizes if it fails. With `ntdsutil`: `roles` > `connections` > `connect to server DC2` > `quit` > `seize rid master` (or `seize pdc`, `seize infrastructure master`, `seize schema master`, `seize naming master`). Moving the schema master requires Schema Admins, the domain naming master Enterprise Admins, the three domain roles Domain Admins.

1. Holder online, or back soon: **transfer**, or wait if no role-dependent task is needed. Roles don't move when a DC shuts down.
2. Holder lost for good: **seize** on the standby DC, then clean up the old DC's metadata.
3. Old holder repaired later: never reconnect it; reinstall it. Restored, it would still believe it holds the roles.

Diagnose with `dcdiag /test:KnowsOfRoleHolders` and `dcdiag /test:RidManager`. A seizure that fails with "The current FSMO holder could not be contacted", then finds no DC, points to an invalid `fSMORoleOwner` value (for example a deleted NTDS Settings object).

> **Exam trap.** A transfer needs both DCs online. If the holder can't be contacted, seizing is the only option, and it is final for the old holder.

<!-- section: key-points -->
## Key points

- Install the role, then promote with `Install-ADDSForest`, `Install-ADDSDomain` or `Install-ADDSDomainController`; adprep runs automatically, the RID master must be reachable.
- Windows Server 2025 DCs need domain and forest functional levels of Windows Server 2016 or higher.
- In Azure: static private IP on the NIC, data disk with host caching None, DCs as virtual network DNS servers, an AD site for the Azure subnets, shutdown from the guest.
- RODC: read-only, inbound replication, caching controlled by the PRP; Deny wins; a staged install lets a delegated administrator attach the server.
- Stolen RODC: export the cached list, delete its account, reset the cached passwords.
- Forest roles: schema master, domain naming master. Domain roles: PDC emulator, RID master, infrastructure master.
- Transfer when the holder is online; seize with `-Force` or `ntdsutil` only when it is gone, then clean up metadata.
