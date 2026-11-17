Users don't connect to session hosts: they connect to what an **application group** publishes, a full desktop or individual RemoteApp applications, and the applications themselves come from the image or are attached dynamically with **App attach**. Questions test the delivery method that fits a requirement, the application group type, the role that grants access and the steps to package and attach an application.

<!-- section: app-deployment-methods | objectives: 3.3.1 -->
## Choosing a method for deploying an app

Two separate decisions: **how the app gets onto the session host**, and **how users see it** (inside a full desktop or as a RemoteApp window).

| Method | How it works | Choose it when |
| --- | --- | --- |
| Install in the image | The app is installed in the golden image used to create session hosts | Apps used by everyone, apps that can't be packaged (drivers, services), fewest moving parts. Every update means a new image and redeployment |
| App attach | The app, packaged as MSIX/Appx in a disk image or as App-V, is mounted from an SMB share at sign-in and registered only for the assigned users | Different apps for different users on the same pooled hosts, one image for all, updates without rebuilding the image, several versions side by side |
| Intune (Win32, MSI, Store apps) on Windows Enterprise multi-session | Installed per device in the system context, **Required** or **Uninstall** intent only | Hosts already managed by Intune that need an app on every host |
| FSLogix application masking | The app is in the image but hidden from users who aren't entitled | One image, a few apps that must be hidden from some users (licensing) |

| Presentation | Application group type | Choose it when |
| --- | --- | --- |
| Full desktop | Desktop | Users work all day in the session, personal desktops |
| RemoteApp | RemoteApp | Users need one or two line-of-business apps that integrate with their local desktop; RemoteApp is available for pooled host pools |

> **Exam trap.** App attach doesn't replace the application group: a user gets an App attach app only if the package is assigned to the host pool **and** to the user (or group), **and** the user is in an application group of that host pool.

> **Exam tip.** "Some users of the same pooled host pool need App1, others App2, and the image must stay generic" = App attach (or masking if the apps are already in the image). "Minimize images and update apps without redeploying session hosts" = App attach.

<!-- section: application-groups | objectives: 3.3.2, 3.3.3 -->
## Creating application groups and assigning users

An application group belongs to **one** host pool; a host pool can have **one desktop** application group and any number of RemoteApp application groups. To appear in users' feeds, an application group must be **registered to a workspace**.

| Rule | Detail |
| --- | --- |
| Desktop application group | Pooled or personal host pools. The portal creates one automatically with each host pool, named `<hostpool>-DAG`; delete it if you only want RemoteApp |
| RemoteApp application group | Pooled host pools. Users in several RemoteApp groups of the same host pool see all their apps |
| User in both a desktop and a RemoteApp group of the same pooled host pool | Sees only the type set by the host pool's **preferred application group type** (Desktop or RemoteApp; Desktop is the portal default and is enforced when none is set) |
| Same user, desktop group on hp01 and RemoteApp group on hp02 | Sees both: the preference applies within one host pool |

Access is an Azure RBAC role assignment of **Desktop Virtualization User** on the application group, to users or (better) groups. Assigning it needs `Microsoft.Authorization/roleAssignments/write` (Owner, User Access Administrator or Role Based Access Control Administrator); creating application groups and publishing apps needs **Desktop Virtualization Application Group Contributor** or **Desktop Virtualization Contributor**.

```powershell
$hp = Get-AzWvdHostPool -Name hp-sales -ResourceGroupName rg-avd

New-AzWvdApplicationGroup -Name ag-sales-apps -ResourceGroupName rg-avd -Location westeurope `
  -ApplicationGroupType RemoteApp -HostPoolArmPath $hp.Id

$ag = Get-AzWvdApplicationGroup -Name ag-sales-apps -ResourceGroupName rg-avd
Register-AzWvdApplicationGroup -WorkspaceName ws-sales -ResourceGroupName rg-avd `
  -ApplicationGroupPath $ag.Id

New-AzRoleAssignment -ObjectId <group object ID> -RoleDefinitionName "Desktop Virtualization User" `
  -Scope $ag.Id
```

In the portal: **Application groups > + Create** (Basics: host pool and type; Applications; Assignments; Workspace: **Register application group** = Yes), or later **Assignments > + Add** on the application group.

> **Exam trap.** Users assigned to an application group that isn't registered to any workspace see nothing in Windows App. Registration to a workspace and the Desktop Virtualization User role are both required.

> **Exam trap.** The Desktop Virtualization User role gives access to the published resources, not to the Azure resources: it lets users connect, not manage. Administrators who manage the host pool need a Desktop Virtualization Contributor-type role instead.

<!-- section: remoteapp | objectives: 3.3.4 -->
## Publishing an application as a RemoteApp

Requirements: a RemoteApp application group, at least one session host **powered on**, and the app installed on every session host of the host pool (or an App attach package assigned to the host pool).

Application sources in **Application groups > (group) > Applications > + Add**:

| Source | What you provide |
| --- | --- |
| Start menu | Pick an app found on the session hosts' Start menu; the path is filled in |
| File path | The path of the `.exe` on the session hosts, an application identifier, a display name |
| App attach | A package already added and assigned to the host pool, and the application inside it |

Options: description, **Require command line** with the arguments to pass (`CommandLineSetting`: `DoNotAllow`, `Allow` or `Require`), icon path and index (local path for Start menu and File path, UNC path allowed for App attach), and **Show in portal**.

```powershell
# Start menu application
Get-AzWvdStartMenuItem -ApplicationGroupName ag-sales-apps -ResourceGroupName rg-avd |
  Select-Object Name, AppAlias
New-AzWvdApplication -Name WordPad -AppAlias wordpad -GroupName ag-sales-apps `
  -ResourceGroupName rg-avd -CommandLineSetting DoNotAllow

# File path application with a required argument
New-AzWvdApplication -Name "Excel Finance" -GroupName ag-sales-apps -ResourceGroupName rg-avd `
  -FilePath "C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE" `
  -IconPath "C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE" -IconIndex 1 `
  -CommandLineSetting Require -CommandLineArgument "/t \\fs01\templates\finance.xltx" -ShowInPortal:$true
```

- Microsoft Store apps change folder at every update: publish them with `shell:appsFolder\<PackageFamilyName>!<AppId>` as the file path and a local icon file.
- Applications can't be published with Azure CLI.
- Users get all the apps of the RemoteApp groups they're assigned to; to give different apps to different users, use several RemoteApp groups (or App attach assignments).

> **Exam trap.** A RemoteApp fails to launch for users of some session hosts: the app is installed only on some hosts. Every session host of the pool must have it (or use App attach).

<!-- section: app-attach | objectives: 3.3.9 -->
## Configuring dynamic application delivery with App attach

App attach mounts application images from an SMB share into the user session at sign-in, without installing anything on the session host. Compared with the earlier MSIX app attach, the current **App attach** creates a package resource that you assign to **several host pools** and **directly to users and groups**, and it also accepts App-V packages.

| Item | Detail |
| --- | --- |
| Package formats | MSIX and MSIX bundle, Appx and Appx bundle, App-V (`.appv`) |
| Disk images (MSIX/Appx) | **CimFS** (fastest mount and unmount, less CPU and memory, recommended with Windows 11 hosts), VHDX, VHD (not recommended) |
| Session hosts | Windows client and supported Windows Server versions, joined to Microsoft Entra ID or AD DS (Microsoft Entra Domain Services isn't supported) |
| Storage | SMB share in the **same region** as the session hosts; Azure Files recommended, Azure NetApp Files requires AD DS joined hosts; don't share it with FSLogix profiles; exclude images from antivirus |
| Share permissions | Session host **computer accounts** need read access. Azure Files with AD DS: Storage File Data SMB Share Reader as default share-level permission + NTFS read. Azure Files with Entra joined hosts: **Reader and Data Access** to the Azure Virtual Desktop and Azure Virtual Desktop ARM Provider service principals |
| Certificates | Every MSIX/Appx package is signed: the whole chain must be trusted on the session hosts |
| Registration | **On-demand** (default, recommended: full registration when the app starts) or **Log on blocking** (register at sign-in, slower sign-in) |
| State | Active or Inactive (inactive packages are ignored at sign-in) |
| Health | **Health check status on failure** sets the `AppAttachHealthCheck` result (for example NeedsAssistance) when staging fails |

Steps in the portal: **Azure Virtual Desktop > App attach > + Create**: Basics (subscription, resource group, a host pool, location), Image path (storage account or UNC, package inside the image, display name, version, registration type, state, health check), Assignments (host pools, users or groups), Review + create. With PowerShell:

```powershell
$app = Import-AzWvdAppAttachPackageInfo -HostPoolName hp-sales -ResourceGroupName rg-avd `
  -Path "\\stappattach.file.core.windows.net\apps\Contoso\Contoso.cim"

New-AzWvdAppAttachPackage -AppAttachPackage $app -Name contoso-crm -ResourceGroupName rg-avd `
  -Location westeurope -ImageDisplayName "Contoso CRM" -ImageIsActive:$true `
  -ImageIsRegularRegistration:$false -FailHealthCheckOnStagingFailure NeedsAssistance

$pkg = Get-AzWvdAppAttachPackage -Name contoso-crm -ResourceGroupName rg-avd
Update-AzWvdAppAttachPackage -Name contoso-crm -ResourceGroupName rg-avd -Location westeurope `
  -HostPoolReference @((Get-AzWvdHostPool -Name hp-sales -ResourceGroupName rg-avd).Id)
New-AzRoleAssignment -ObjectId <group object ID> -RoleDefinitionName "Desktop Virtualization User" -Scope $pkg.Id
```

- A package assigned to a host pool and to users appears automatically in their **desktop** sessions. For RemoteApp, also add it to a RemoteApp application group (source **App attach**); MSIX apps can't be added to a desktop application group.
- `-HostPoolReference` **replaces** the list of host pools; an empty array unassigns them all.
- New version: **side by side** (a new package assigned to the same users) or **in place** (Update the package with the new image; the version must differ; keep the old image until nobody uses it). Users get the new version at next sign-in.
- Adding packages needs **Desktop Virtualization Contributor** on the resource group; App attach can't be managed with Azure CLI.
- Disable Microsoft Store automatic updates on the session hosts (`AutoDownload = 2` under `HKLM\Software\Policies\Microsoft\WindowsStore`) so attached apps aren't updated outside your images.

> **Exam trap.** Entra joined session hosts with Azure Files: the role isn't Storage File Data SMB Share Reader for the users, it's **Reader and Data Access** for the two Azure Virtual Desktop service principals. With AD DS, it's the share-level permission plus NTFS read for the computer accounts.

<!-- section: app-attach-package | objectives: 3.3.10 -->
## Creating an application package for App attach

| Step | Tool | Detail |
| --- | --- | --- |
| 1. Package the app | **MSIX Packaging Tool** | Converts an MSI, EXE, ClickOnce or App-V installer into an `.msix`; or get the MSIX from the vendor |
| 2. Sign it | Code signing certificate (EKU `1.3.6.1.5.5.7.3.3`) | Public CA, internal CA (AD CS) or self-signed (test only); **timestamp** the package so it stays valid after the certificate expires |
| 3. Trust the chain on session hosts | Group Policy (AD DS) or Intune trusted certificate profile (Entra joined) | Public CA: trusted by default; self-signed: Trusted Root Certification Authorities on each host |
| 4. Create the disk image | **MSIXMGR** (`msixmgr.exe`), as administrator on Windows 10 or 11 | Expands the package into a CimFS, VHDX or VHD image |
| 5. Upload | SMB share | Each CimFS image is a `.cim` file plus `objectid_` and `region_` files: copy them all, one folder per image |
| 6. Add | App attach | Add the package, assign host pools and users |

```text
msixmgr.exe -Unpack -packagePath "C:\msix\ContosoCRM.msix" -destination "C:\msix\ContosoCRM\ContosoCRM.cim" -applyACLs -create -fileType cim -rootDirectory apps

msixmgr.exe -Unpack -packagePath "C:\msix\ContosoCRM.msix" -destination "C:\msix\ContosoCRM.vhdx" -applyACLs -create -fileType vhdx -rootDirectory apps
```

- Create the destination folder before running MSIXMGR.
- Generate CIM images on a Windows version **lower than or equal to** the one running on the session hosts (a CIM built on Windows 11 may not work on Windows 10).
- App-V packages don't need a disk image: the `.appv` file is stored on the share as is, optionally with its `_UserConfig.xml` and `_DeploymentConfig.xml` dynamic configuration files.

> **Exam trap.** The order matters: package (MSIX Packaging Tool), **sign**, then expand into an image (MSIXMGR). An unsigned or untrusted package fails to stage on the session hosts.

<!-- section: key-points -->
## Key points

- Delivery (image, App attach, Intune, masking) and presentation (desktop or RemoteApp) are separate choices.
- One desktop application group per host pool, many RemoteApp groups; register to a workspace; Desktop Virtualization User on the application group.
- Preferred application group type decides what a user in both group types of one pooled host pool sees.
- RemoteApp sources: Start menu, file path, App attach; the app must be on every session host; at least one host powered on.
- App attach: package resource, multiple host pools, direct user and group assignment, CimFS for Windows 11, on-demand registration by default, computer accounts read the share.
- Package creation: MSIX Packaging Tool, sign and timestamp, MSIXMGR to CimFS or VHDX, trust the certificate chain on hosts.
