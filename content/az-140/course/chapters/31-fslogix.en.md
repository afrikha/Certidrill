FSLogix roams the Windows user profile between pooled session hosts by attaching a virtual disk (VHD or VHDX) stored on an SMB share at sign-in. Exam questions give a host pool, a storage design and a requirement (high availability, a third-party profile solution, hiding an app from some users) and ask which container, which registry value or which FSLogix feature to configure.

<!-- section: recommend-fslogix | objectives: 3.1.1 -->
## Recommending an FSLogix configuration

FSLogix has two families of features:

| Feature | What it does | Configured in |
| --- | --- | --- |
| Profile container | Redirects the **entire** user profile into one VHD(x) | `HKLM\SOFTWARE\FSLogix\Profiles` |
| ODFC container (Office Data File Containers) | Redirects only Microsoft 365 apps data (Outlook, OneDrive, Teams, Office activation...) into a VHD(x) | `HKLM\SOFTWARE\Policies\FSLogix\ODFC` |
| Cloud Cache | Keeps a local cache of the container and writes it to up to four storage providers | `CCDLocations` instead of `VHDLocations`, in either key above |
| Application masking (Rule Sets) | Hides, redirects or sets values for files, registry keys, apps, printers and fonts, per user or group | Rule Set files in `C:\Program Files\FSLogix\Apps\Rules` |

Microsoft's recommendation is the simplest design that meets the requirement:

| Requirement | Recommended configuration |
| --- | --- |
| Pooled host pool, users must keep their settings on any session host | Profile container only (**single container**), `VHDLocations` with one SMB share |
| The organization keeps a third-party roaming profile solution and only needs Office data to roam | ODFC container only, and exclude the ODFC paths from the third-party solution |
| Separate storage, size or isolation for Office data (for example a 10 GB profile and a 50 GB ODFC container) | Profile container plus ODFC container (dual container) |
| The profile must stay available if one storage provider fails, in the same region | Cloud Cache with at least two providers in the session hosts' region |
| Disaster recovery to a second region with profile data | Cloud Cache with a provider in each region, closest provider first |
| Disaster recovery, simplest option, users accept new profiles | Duplicate infrastructure in the other region, standard `VHDLocations`, no profile recovery |
| Some users must not see an installed application | Application masking hiding rule assigned to those users or groups |

General recommendations that apply to every design:

- Use **VHDX** (`VolumeType = vhdx`): larger supported size and fewer corruption scenarios than the default `vhd`.
- Keep `ProfileType = 0`: one read-write connection per profile. Azure Virtual Desktop doesn't support multiple connections to the same profile within the same host pool.
- Put the storage in the **same region** as the session hosts. Azure Files (Premium for production pools) or Azure NetApp Files are the usual SMB providers; share-level and NTFS permissions must be set before the first sign-in.
- Configure the settings once for all session hosts: registry values in the image, Group Policy (the FSLogix ADMX/ADML templates add an **FSLogix** node under Administrative Templates) or the Intune settings catalog.
- Add the FSLogix antivirus exclusions (VHD and VHDX files, the Cloud Cache folders).

> **Exam trap.** Several entries in `VHDLocations` aren't a high-availability design. FSLogix uses the first location the user can reach and creates a new, empty profile there if the usual location is down. Resiliency requires Cloud Cache.

<!-- section: profile-container | objectives: 3.1.2 -->
## Configuring Profile Containers

FSLogix creates no configuration value at installation: any setting left absent uses its default. A profile container needs only two values, `Enabled` and `VHDLocations`; the others below are the values Microsoft recommends.

| Value | Type | Data | Purpose |
| --- | --- | --- | --- |
| `Enabled` | DWORD | 1 | Required. Default 0 (disabled) |
| `VHDLocations` | MULTI_SZ or REG_SZ | `\\<storage-account>.file.core.windows.net\<share>` | Required. SMB paths searched in order; a new container is created in the first one. Separate REG_SZ entries with `;` |
| `VolumeType` | REG_SZ | vhdx | Recommended (default `vhd`) |
| `SizeInMBs` | DWORD | 30000 | Default. Maximum size of a new container; can be increased, never decreased |
| `IsDynamic` | DWORD | 1 | Default. The disk consumes only the space used |
| `DeleteLocalProfileWhenVHDShouldApply` | DWORD | 1 | Recommended. Deletes a local profile that would otherwise be used instead of the container |
| `FlipFlopProfileDirectoryName` | DWORD | 1 | Recommended for new deployments. Folder named `%username%_%sid%` instead of `%sid%_%username%` |
| `LockedRetryCount` / `LockedRetryInterval` | DWORD | 3 / 15 | Recommended (defaults 12 / 5): fail faster when the VHD is locked |
| `ReAttachRetryCount` / `ReAttachIntervalSeconds` | DWORD | 3 / 15 | Recommended (defaults 60 / 10) |
| `ProfileType` | DWORD | 0 | Default. 1 read-write only, 2 read-only only, 3 try read-write then fall back to read-only |

```powershell
$VHDLocations = "\\stcontosoprofiles.file.core.windows.net\profiles"
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name Enabled -PropertyType dword -Value 1 -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name VHDLocations -PropertyType string -Value $VHDLocations -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name VolumeType -PropertyType string -Value vhdx -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name DeleteLocalProfileWhenVHDShouldApply -PropertyType dword -Value 1 -Force
New-ItemProperty -Path HKLM:\SOFTWARE\FSLogix\Profiles\ -Name FlipFlopProfileDirectoryName -PropertyType dword -Value 1 -Force
```

Other settings that appear in questions:

| Need | Setting |
| --- | --- |
| Use FSLogix only for Azure Virtual Desktop sessions on the host | `IgnoreNonWVD = 1` |
| Block the sign-in (FRXShell message) instead of giving a temporary or local profile | `PreventLoginWithFailure = 1`, `PreventLoginWithTempProfile = 1` |
| Send some users or groups to another share | `HKLM\SOFTWARE\FSLogix\Profiles\ObjectSpecific\<SID>` with its own `VHDLocations` |
| Keep folders out of the container (caches, temporary data) | A `redirections.xml` file in the folder named by `RedirXMLSourceFolder` |
| Attach the disk with the computer account instead of the user | `AccessNetworkAsComputerObject = 1` (security risk, only when required) |

**Who gets a container** is controlled by four local groups created on each session host: *FSLogix Profile Include List*, *FSLogix Profile Exclude List*, *FSLogix ODFC Include List* and *FSLogix ODFC Exclude List*. Everyone is a member of the include lists by default; membership in an exclude list wins over the include list. To pilot FSLogix with one group, remove Everyone from *FSLogix Profile Include List* and add that group.

Verify on the session host, signed in as a standard user: `frx.exe list-redirects` in `C:\Program Files\FSLogix\Apps` shows the redirections, the container appears in the user's folder on the share, and the logs are in `%ProgramData%\FSLogix\Logs` and in Event Viewer under **Applications and Services Logs > Microsoft > FSLogix**.

> **Exam trap.** Changing `FlipFlopProfileDirectoryName`, `SIDDirNamePattern` or `VHDNamePattern` on an existing deployment makes FSLogix look in a new folder: users get new, empty profiles. Set naming values before the first sign-in.

<!-- section: odfc-container | objectives: 3.1.3 -->
## Configuring ODFC containers

The ODFC container holds the data of Microsoft 365 apps that can be rebuilt from the cloud: Outlook OST files, OneDrive cache, Teams cache, Office activation. Its values live under `HKLM\SOFTWARE\Policies\FSLogix\ODFC` and mirror the profile values (`Enabled`, `VHDLocations`, `VolumeType`, `SizeInMBs`, retry counts), plus the **Include** values that choose the apps:

| Value | Default | Redirects |
| --- | --- | --- |
| `IncludeOfficeActivation` | 1 | Office activation (licensing) data |
| `IncludeOneDrive` | 1 | OneDrive cache |
| `IncludeOutlook` | 1 | Outlook data (classic and new Outlook for Windows) |
| `IncludeOutlookPersonalization` | 1 | Outlook personalization (classic Outlook only) |
| `IncludeSharepoint` | 1 | SharePoint data |
| `IncludeSkype` | 1 | Skype for Business Global Address List |
| `IncludeTeams` | **0** | Teams data (classic and new Teams); also registers the new Teams package at sign-in |
| `IncludeOneNote` / `IncludeOneNote_UWP` | 0 | OneNote notebook files |

When to use it:

- **Single container (recommended)**: the profile container already includes all Office data. Don't add an ODFC container.
- **ODFC alone**: with a third-party roaming profile solution (roaming profiles, Citrix UPM, VMware DEM). Exclude the ODFC paths from that solution, for example `%userprofile%\AppData\Local\Microsoft\Outlook` and `%userprofile%\AppData\Local\Microsoft\OneDrive`.
- **Profile + ODFC (dual container)**: optional, when Office data needs its own location, size or isolation. The Include values only have an effect in this mode or with ODFC alone.

`VHDAccessMode` (ODFC only) allows concurrent sessions with difference disks (1, 2) or one VHD per session (3); with Outlook cached mode only 0 or 3 are supported. OneDrive never supports concurrent connections to the same profile.

> **Exam trap.** `IncludeTeams` is the only Microsoft 365 workload off by default. If Teams data must be in the ODFC container, set it to 1.

<!-- section: cloud-cache | objectives: 3.1.4 -->
## Configuring FSLogix Cloud Cache

Cloud Cache mounts a **local cache** of the container on the session host (`C:\ProgramData\FSLogix\Cache` by default) and writes changes asynchronously to every storage provider listed in `CCDLocations`. Reads come from the first provider while it is healthy; writes go to all of them. It protects users from short storage outages and, with providers in two regions, supports disaster recovery.

| Rule | Detail |
| --- | --- |
| Setting | `CCDLocations` replaces `VHDLocations`. Both must never be present in the same key |
| Providers | Up to four, `smb` (Azure Files, Azure NetApp Files, file server) or `azure` (page blob) |
| Order | Closest provider first, then by preference. A failover site lists its own provider first |
| Azure page blob | The connection string is stored as a protected key with the `frx` utility, never in plain text |
| Container types | Works for profile and ODFC containers |
| Session host | Extra IOPS and disk space: put the cache on SSD or NVMe class storage. `CacheDirectory` is set in `HKLM\SYSTEM\CurrentControlSet\Services\frxccd\Parameters` and can't rely on Group Policy |

```text
CCDLocations (REG_SZ) in HKLM\SOFTWARE\FSLogix\Profiles
type=smb,name="FILES WEST",connectionString=\\stwestprofiles.file.core.windows.net\profiles;type=smb,name="FILES EAST",connectionString=\\steastprofiles.file.core.windows.net\profiles
```

Parameters are case sensitive (`type=smb`, `connectionString=`) and take no spaces around delimiters.

Registration settings decide what happens when providers are unavailable:

| Value | Default | Recommended / meaning |
| --- | --- | --- |
| `ClearCacheOnLogoff` | 0 | 1 on pooled hosts: deletes the local cache at sign-out to save disk space |
| `HealthyProvidersRequiredForRegister` | 0 | 1: blocks sign-in when no provider is healthy (combine with `PreventLoginWithFailure`) |
| `HealthyProvidersRequiredForUnregister` | 1 | Number of healthy providers needed to sign out; 0 isn't recommended (data loss risk) |
| `CcdUnregisterTimeout` | 0 | Seconds the sign-out waits for providers; 0 waits indefinitely |
| `ClearCacheOnForcedUnregister` | 0 | 1 deletes the local cache when the timeout expires (unflushed data is lost) |

> **Exam tip.** "Primary region West Europe, failover North Europe, profiles must survive a regional outage" points to Cloud Cache: West Europe hosts list the West Europe share first and the North Europe share second; North Europe hosts use the reverse order.

> **Exam trap.** Cloud Cache doesn't make sign-in faster and costs local disk and IOPS. If the requirement is only "roam profiles at the lowest cost", keep `VHDLocations` with one share.

<!-- section: app-masking | objectives: 3.1.5 -->
## Implementing FSLogix application masking

Application masking lets one image serve users with different entitlements: the application is installed on every session host, and an FSLogix **Rule Set** hides it from the users who mustn't use it. The `frxsvc` service applies the rules.

1. Install the **FSLogix Apps RuleEditor** (part of the FSLogix download) on a reference machine where the application is installed.
2. Create a Rule Set (**File > New**), choose the application from the installed programs and select **Scan**: the editor creates hiding rules for its files, folders and registry keys.
3. Test with **Apply Rules to System** (run the editor as administrator), then select it again to remove the test.
4. Select **Manage Assignments** and set who the rules apply to.
5. Copy the two files to `C:\Program Files\FSLogix\Apps\Rules` on every session host. They apply **immediately**.

| File | Contains |
| --- | --- |
| `.fxr` | The rules |
| `.fxa` | The assignments |

Rule types:

| Rule | Effect |
| --- | --- |
| Hiding | Hides files, folders, registry keys or values, printers or fonts |
| Redirection | Redirects a path or key to another location, for example non-profile data into the profile container |
| Specify value | Sets a registry value at sign-in for the matching users |
| App container (VHD) | Retired on February 11, 2025 |

Assignments can target a user, a group, a process, a network location (IP address), a computer, a directory container (distinguished name) or an environment variable. A new Rule Set starts with `Everyone, Applies: No`. Assignments are processed **top to bottom** and the last match decides: with `Everyone: No` at the top and `CONTOSO\Sales: Yes` below it, the rules apply to Sales only; with Everyone at the bottom, they apply to nobody.

> **Exam trap.** Rule Set assignments need Active Directory users and groups synchronized to Microsoft Entra ID and line of sight to a domain controller to resolve SIDs. Microsoft Entra ID cloud-only accounts aren't supported.

> **Exam tip.** "Hide App1 from all users except the Finance group, without maintaining two images" is application masking: a hiding rule assigned to Everyone (`Applies: Yes`) with Finance (`Applies: No`) below it.

<!-- section: key-points -->
## Key points

- Single profile container in VHDX, `ProfileType = 0`, one SMB share in the session hosts' region is the default answer.
- `Enabled` and `VHDLocations` are the only required profile values; FSLogix creates no value at installation.
- Include and exclude local groups decide who gets a container; exclude wins.
- ODFC alone goes with a third-party profile solution; `IncludeTeams` is off by default.
- Cloud Cache uses `CCDLocations` (up to four providers, never together with `VHDLocations`) for high availability or cross-region recovery; multiple `VHDLocations` isn't resiliency.
- Application masking: RuleEditor, `.fxr` + `.fxa` files in `C:\Program Files\FSLogix\Apps\Rules`, ordered assignments, AD-synchronized identities only.
