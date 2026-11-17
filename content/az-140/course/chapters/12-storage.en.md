In a pooled host pool, users land on a different session host at almost every sign-in, so their profile can't live on the virtual machine: FSLogix stores it in a container on an SMB share and attaches it at sign-in. Exam questions ask which storage service fits a scale, latency or identity constraint, and how to configure the storage account, the share permissions and the FSLogix settings in the right order.

<!-- section: user-data-planning | objectives: 1.2.1 -->
## Plan storage for user data

User data to place:

| Data | Where |
| --- | --- |
| User profiles in a pooled host pool | FSLogix profile container (a VHD or VHDX per user) on an SMB share |
| Microsoft 365 Apps data only (Outlook cache, Teams, OneDrive cache) | FSLogix ODFC container, alongside another profile solution |
| User profiles in a personal host pool | Can stay on the OS disk of the user's session host; FSLogix is still useful to rebuild or replace the host |
| App attach packages | A separate SMB share read by session hosts |

Storage options compared:

| Feature | Azure Files | Azure NetApp Files | Storage Spaces Direct |
| --- | --- | --- | --- |
| Use case | General purpose | General purpose to enterprise scale | Cross-platform |
| Platform service | Yes | Yes | No, self-managed virtual machines |
| Regions | All | Select regions | All |
| Redundancy | LRS, ZRS, GRS, GZRS (SSD shares: LRS and ZRS only) | LRS, ZRS with cross-zone replication, cross-region replication | LRS, ZRS, GRS |
| Performance | HDD (standard) or SSD (premium); up to 100,000 IOPS and 10 GBps per share, about 3 ms latency | Standard, Premium, Ultra; up to 460,000 IOPS and 4.5 GBps per volume, about 1 ms latency | Limited by the managed disks; Premium disks recommended |
| Capacity | 100 TiB per share; minimum share 1 GiB | 100 TiB per volume; minimum capacity pool 1 TiB, minimum volume 50 GiB | 32 TiB per disk; two VMs and a cloud witness, or three VMs |
| Identity | AD DS, Microsoft Entra Domain Services, Microsoft Entra Kerberos | AD DS, Microsoft Entra Domain Services | AD DS, Microsoft Entra Domain Services |
| Backup | Azure Backup snapshots | Azure NetApp Files snapshots and backup | Azure Backup |

Choosing:

| Requirement | Answer |
| --- | --- |
| Most deployments, minimal administration | Azure Files with SSD (premium) shares; HDD only for light, cost-driven workloads |
| Thousands of users, lowest latency, enterprise scale | Azure NetApp Files |
| Session hosts are Microsoft Entra joined, users are cloud-only | Azure Files with Microsoft Entra Kerberos (Azure public cloud); Azure NetApp Files doesn't support cloud-only identities |
| Survive the loss of a zone | ZRS share, or Azure NetApp Files volumes in several zones |
| Survive the loss of a region | FSLogix Cloud Cache with a location in each region |

Sizing rules:

- Put the storage in the **same region as the session hosts**: every profile read and write crosses the network at sign-in and during the session.
- FSLogix containers are dynamic VHD files with a default maximum of 30,000 MB (`SizeInMBs`); Microsoft's sizing baseline is at least 30 GB of profile storage per user.
- Sign-in storms are the peak: size IOPS and throughput for the number of users who sign in at 9 AM, not for the average.

> **Exam trap.** The join type of the session hosts constrains the storage. Azure NetApp Files needs Kerberos from AD DS or Microsoft Entra Domain Services; Microsoft Entra joined hosts are supported only when the identities come from AD DS. Cloud-only users mean Azure Files with Microsoft Entra Kerberos.

<!-- section: fslogix-storage | objectives: 1.2.2 -->
## Storage for FSLogix components

| Component | Settings key | Storage setting |
| --- | --- | --- |
| Profile container | `HKLM\SOFTWARE\FSLogix\Profiles` | `Enabled` = 1, `VHDLocations` = one or more SMB paths |
| ODFC container | `HKLM\SOFTWARE\Policies\FSLogix\ODFC` | `Enabled` = 1, `VHDLocations` = SMB paths, often a separate share |
| Cloud Cache | Profiles or ODFC key | `CCDLocations` instead of `VHDLocations`: several storage providers |

```powershell
$regPath = "HKLM:\SOFTWARE\FSLogix\profiles"
New-ItemProperty -Path $regPath -Name Enabled -PropertyType DWORD -Value 1 -Force
New-ItemProperty -Path $regPath -Name VHDLocations -PropertyType MultiString -Value \\<storage-account-name>.file.core.windows.net\<share-name> -Force
```

Defaults worth knowing:

| Setting | Default | Meaning |
| --- | --- | --- |
| `VolumeType` | `vhd` | Set `vhdx` explicitly for VHDX containers |
| `IsDynamic` | 1 | The file grows as data is written, up to `SizeInMBs` |
| `SizeInMBs` | 30000 | Maximum size; it can be increased, never decreased |
| `FlipFlopProfileDirectoryName` | 0 | Folder name `%sid%_%username%`; 1 gives `%username%_%sid%` |
| `DeleteLocalProfileWhenVHDShouldApply` | 0 | 1 permanently deletes a local profile that would block the container |
| `AccessNetworkAsComputerObject` | 0 | The container is attached as the user; 1 (computer account) is a security risk |

Deploy these values in the image, with Group Policy or with Intune so that every session host gets them. FSLogix is preinstalled on Windows Enterprise multi-session images but may be outdated.

**Cloud Cache** keeps a local cache on the session host (`C:\ProgramData\FSLogix\Cache`) and writes every change to all the providers listed in `CCDLocations`, in order of proximity then preference; only one provider is read. If a provider is down, changes are queued and flushed when it recovers. The price: more local disk space and more I/O on the session host.

> **Exam tip.** Several paths in `VHDLocations` aren't replication: FSLogix uses the first location that works. Copies kept in sync in several places mean Cloud Cache.

<!-- section: storage-accounts | objectives: 1.2.3 -->
## Storage accounts for Azure Virtual Desktop

Create the account in the session hosts' region with:

- **Performance**: Premium for SSD file shares (LRS or ZRS) when IOPS and latency matter, which is the usual case for profiles; Standard (HDD) otherwise.
- **Identity-based access**: one source per account. The account can't use Microsoft Entra Kerberos together with AD DS or Microsoft Entra Domain Services.
- **Networking**: a private endpoint for the `file` sub-resource (private DNS zone `privatelink.file.core.windows.net`) or a service endpoint from the session host subnet. SMB uses TCP 445, often blocked by ISPs: one more reason to keep access inside Azure.
- **Storage account key access**: the AD DS procedure requires it to stay enabled, and the key lets an administrator mount the share to set the first ACLs.

Identity source by session host type:

| Session hosts | Users | Azure Files identity source |
| --- | --- | --- |
| Joined to AD DS | Hybrid | AD DS: join the storage account to the domain |
| Joined to Microsoft Entra Domain Services | Synced from Microsoft Entra ID | Microsoft Entra Domain Services: enable it on the account |
| Microsoft Entra joined or hybrid joined | Hybrid | Microsoft Entra Kerberos; hosts don't need line of sight to a domain controller |
| Microsoft Entra joined | Cloud-only or external | Microsoft Entra Kerberos, Azure public cloud only |

Join the account to AD DS from a domain-joined machine with the AzFilesHybrid module; the signed-in Azure account needs Owner, Contributor or storage account owner rights:

```powershell
Import-Module -Name AzFilesHybrid
Connect-AzAccount
Join-AzStorageAccount `
    -ResourceGroupName "rg-avd-storage" `
    -StorageAccountName "stavdprofiles01" `
    -DomainAccountType "ComputerAccount" `
    -OrganizationalUnitDistinguishedName "OU=AVD,DC=contoso,DC=com"

# Check the result
(Get-AzStorageAccount -ResourceGroupName "rg-avd-storage" -Name "stavdprofiles01").AzureFilesIdentityBasedAuth.DirectoryServiceOptions
```

The account is represented in AD DS by a computer account. If domain policy expires its password, rotate it before expiry or users lose access. Starting with the April 2026 Windows Server update, the default Kerberos encryption type changes from RC4 to AES-SHA1: upgrade FSLogix shares to AES before installing it.

> **Exam trap.** A storage account already joined to AD DS can't also enable Microsoft Entra Kerberos. If new Microsoft Entra joined session hosts must use the share without line of sight to a domain controller, plan Microsoft Entra Kerberos on that account, or on a new one, rather than adding a second identity source.

<!-- section: file-shares | objectives: 1.2.4 -->
## File shares and permissions

Access to a profile share is checked twice: **share-level permissions** (Azure RBAC) and **NTFS permissions** (Windows ACLs). Both must allow the user.

| Who | Share level | Why |
| --- | --- | --- |
| All users of the host pool | Storage File Data SMB Share Contributor, as the **default share-level permission** for all authenticated identities, or assigned to the users' group | Read, write and delete in the share |
| Administrators who set ACLs | Storage File Data SMB Share Elevated Contributor | Change NTFS permissions without the storage account key |

Recommended NTFS permissions on the share root:

| Principal | Access | Applies to |
| --- | --- | --- |
| CREATOR OWNER | Modify | Subfolders and files only |
| Administrators' group | Full control | This folder, subfolders and files |
| Users' group | Modify | This folder only |

Users can create their own folder but can't open anyone else's. Without these ACLs, a user could delete another user's profile.

```powershell
# Mount with the storage account key (or use Elevated Contributor), then set ACLs
net use Z: \\stavdprofiles01.file.core.windows.net\profiles /user:Azure\stavdprofiles01 <storage-account-key>
icacls Z: /inheritance:r
icacls Z: /grant:r "CREATOR OWNER:(OI)(CI)(IO)(M)"
icacls Z: /grant:r "CONTOSO\AVD-Admins:(OI)(CI)(F)"
icacls Z: /grant:r "CONTOSO\AVD-Users:(M)"
```

With **Microsoft Entra Kerberos**, three extra steps:

1. Grant **admin consent** to the application that enabling Microsoft Entra Kerberos creates for the storage account, and exclude it from MFA: tickets must be obtained silently at sign-in. For cloud-only groups, add the `kdc_enable_cloud_group_sids` tag to its manifest.
2. On session hosts, enable cloud Kerberos ticket retrieval (Intune `Kerberos/CloudKerberosTicketRetrievalEnabled`, or the registry), and allow credential keys to load from the profile.
3. Set the ACLs from a machine with line of sight to a domain controller, or, for cloud-only identities, from the **Manage access** tab of the share.

```powershell
reg add HKLM\SYSTEM\CurrentControlSet\Control\Lsa\Kerberos\Parameters /v CloudKerberosTicketRetrievalEnabled /t REG_DWORD /d 1
reg add HKLM\Software\Policies\Microsoft\AzureADAccount /v LoadCredKeyFromProfile /t REG_DWORD /d 1
```

Validate: a test user signs in, the share shows a folder named `<user SID>_<username>` containing the container. An existing local profile takes precedence: delete it, or use `DeleteLocalProfileWhenVHDShouldApply`.

> **Exam trap.** A user with the Contributor role on the storage account still can't open the share over SMB with an identity: management roles don't give data access. Share access comes from the Storage File Data SMB Share roles.

<!-- section: netapp-files | objectives: 1.2.5 -->
## Azure NetApp Files

Implementation order:

1. Register the `Microsoft.NetApp` resource provider, then create a **NetApp account** in the region of the volumes.
2. Create a **capacity pool** (1 TiB minimum) and pick its service level.
3. Create the **Active Directory connection**: one per NetApp account; primary DNS server (the domain controllers, or the Microsoft Entra Domain Services IP addresses), AD DNS domain name, AD site, SMB server prefix, OU (default `CN=Computers`; `OU=AADDC Computers` with Microsoft Entra Domain Services) and a domain account that can create computer accounts.
4. Delegate a subnet to `Microsoft.NetApp/volumes`: only one delegated subnet per virtual network, and its size can't change afterwards.
5. Create an **SMB volume** with **Continuous Availability** enabled.
6. Set the NTFS permissions as for Azure Files, then point `VHDLocations` to the volume's SMB path.

| Service level | Throughput per TiB provisioned |
| --- | --- |
| Standard | Up to 16 MiB/s |
| Premium | Up to 64 MiB/s |
| Ultra | Up to 128 MiB/s |

With auto QoS, a volume's throughput is its quota times the service level: a 2 TiB Premium volume gets 128 MiB/s.

Rules to know:

- Keep at most **3,000 concurrent active profiles per regular volume**; beyond that, spread users across volumes in different availability zones.
- With Basic network features you can't put an NSG on the delegated subnet; upgrade to **Standard** network features. Global virtual network peering also needs Standard.
- Protect profiles with Azure NetApp Files snapshots and backup.
- The AD connection account can't exceed a 64-character password and must support AES for Windows Server 2025 domain controllers.

> **Exam trap.** The Storage File Data SMB Share roles belong to Azure Files. On an Azure NetApp Files SMB volume, access is controlled by Windows permissions, so there is no Azure role to assign to users for the profile share.

<!-- section: key-points -->
## Key points

- Pooled host pools need FSLogix containers on SMB storage in the same region as the session hosts.
- Azure Files premium for most cases; Azure NetApp Files for scale and lowest latency; Storage Spaces Direct only if you accept managing VMs.
- Identity: AD DS join, Microsoft Entra Domain Services or Microsoft Entra Kerberos, one per storage account; cloud-only users need Microsoft Entra Kerberos.
- Two permission layers on Azure Files: Storage File Data SMB Share roles, then NTFS (CREATOR OWNER Modify on subfolders, users Modify on the root only).
- `VHDLocations` lists alternatives; `CCDLocations` (Cloud Cache) writes to all providers.
- Azure NetApp Files: NetApp account, capacity pool of 1 TiB minimum, one AD connection per account, one delegated subnet per virtual network, Continuous Availability, 3,000 active profiles per volume.
