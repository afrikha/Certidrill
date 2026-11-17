On a multi-session session host, the productivity apps users expect (Microsoft 365 Apps, OneDrive, Teams and a browser) must be installed **per machine**, licensed for **shared use**, kept up to date **through the image**, and tuned so that their caches roam with FSLogix without bloating it. Exam questions give you a pooled host pool and ask which setting, registry value or install switch is missing.

<!-- section: m365-apps | objectives: 3.3.5 -->
## Microsoft 365 Apps on session hosts

**Supported editions.** Windows 11 and Windows 10 Enterprise multi-session support only:

| Edition | Supported on multi-session |
| --- | --- |
| Microsoft 365 Apps for enterprise | Yes |
| Microsoft 365 Apps for business included in **Microsoft 365 Business Premium** | Yes |
| Other Office editions (volume-licensed Office, consumer plans) | No |

Two ways to get the apps on a session host:

| Requirement | Answer |
| --- | --- |
| Fastest start, no custom image | Marketplace image **Windows 11 Enterprise multi-session + Microsoft 365 Apps**, offered when you create the host pool |
| Control over languages, channel, excluded apps | Install with the **Office Deployment Tool (ODT)** in a custom image, then capture it |

**Shared computer activation** is mandatory when several users share the same machine: each user gets a licensing token when they start an app, instead of the machine being activated for one user. Enable it with the ODT property `SharedComputerLicensing`, with Group Policy (*Computer Configuration\Policies\Administrative Templates\Microsoft Office 2016 (Machine)\Licensing Settings*) or with the registry.

Sample `configuration.xml` used by the Azure Virtual Desktop documentation:

```text
<Configuration>
  <Add OfficeClientEdition="64" Channel="MonthlyEnterprise">
    <Product ID="O365ProPlusRetail">
      <Language ID="en-US" />
      <Language ID="MatchOS" />
      <ExcludeApp ID="Groove" />
      <ExcludeApp ID="Lync" />
      <ExcludeApp ID="OneDrive" />
      <ExcludeApp ID="Teams" />
    </Product>
  </Add>
  <RemoveMSI/>
  <Updates Enabled="FALSE"/>
  <Display Level="None" AcceptEULA="TRUE" />
  <Logging Level="Standard" Path="%temp%\WVDOfficeInstall" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE"/>
  <Property Name="SharedComputerLicensing" Value="1"/>
</Configuration>
```

| Element | Why |
| --- | --- |
| `OfficeClientEdition="64"` | 64-bit, the edition recommended by the Office team |
| `Channel="MonthlyEnterprise"` | Monthly Enterprise Channel: predictable monthly updates |
| `ExcludeApp ID="OneDrive"` and `"Teams"` | Both are installed separately, per machine (next sections) |
| `ExcludeApp ID="Lync"` | Skype for Business isn't supported on Azure Virtual Desktop |
| `RemoveMSI` | Removes existing MSI Office installations |
| `Updates Enabled="FALSE"` | No automatic updates on the session hosts: updates go into the image |
| `SharedComputerLicensing` = `1` | Shared computer activation |

Run `setup.exe /configure configuration.xml` from an elevated prompt.

After the install, the documentation applies these settings, some of them in the **default user hive** so that every new profile inherits them:

```powershell
# Default user hive: settings inherited by every new profile
reg load HKU\TempDefault C:\Users\Default\NTUSER.DAT
reg add HKU\TempDefault\SOFTWARE\Policies\Microsoft\office\16.0\common /v InsiderSlabBehavior /t REG_DWORD /d 2 /f
reg add "HKU\TempDefault\software\policies\microsoft\office\16.0\outlook\cached mode" /v enable /t REG_DWORD /d 1 /f
reg add "HKU\TempDefault\software\policies\microsoft\office\16.0\outlook\cached mode" /v syncwindowsetting /t REG_DWORD /d 1 /f
reg unload HKU\TempDefault
# Machine: hide the update UI from users
reg add HKLM\SOFTWARE\Policies\Microsoft\office\16.0\common\officeupdate /v hideupdatenotifications /t REG_DWORD /d 1 /f
reg add HKLM\SOFTWARE\Policies\Microsoft\office\16.0\common\officeupdate /v hideenabledisableupdates /t REG_DWORD /d 1 /f
```

`InsiderSlabBehavior` = 2 hides the Office Insider option; the *cached mode* values turn on Outlook Cached Exchange Mode and limit the mail synchronization window, which keeps the OST small.

**Updates.** With automatic updates disabled, either add the updates to the custom image and redeploy the session hosts regularly, or update the hosts manually while no user is signed in, so that no Office app is in use. Install line-of-business apps after Microsoft 365 Apps.

**Where the Office data lives.** The licensing token, the Outlook OST and the Office caches are per user: in a pooled host pool they roam in the FSLogix Profile Container, or in a separate **ODFC container** whose default content includes Office activation, Outlook, OneDrive and SharePoint data (chapter 31).

> **Exam trap.** A pooled host pool where users are asked to activate Office at every sign-in is missing **shared computer activation** (`SharedComputerLicensing` = `1`). If activation works but must be repeated on each new host, the licensing token isn't roaming: check the FSLogix container (Office activation is included in ODFC by default).

<!-- section: onedrive | objectives: 3.3.6 -->
## OneDrive in multi-session environments

By default the OneDrive sync app installs **per user** in `%localappdata%`. On a multi-session or non-persistent host it must be installed **per machine** (in `C:\Program Files\Microsoft OneDrive`), as non-persistent environments require. That is why the ODT sample excludes OneDrive.

The documented sequence, from an elevated prompt (`C:\Staging` stands for your staging location):

```powershell
# 1. Remove a per-user OneDrive installed with Office, if any
C:\Staging\OneDriveSetup.exe /uninstall
# 2. Mark the machine for an all-users installation
REG ADD "HKLM\Software\Microsoft\OneDrive" /v "AllUsersInstall" /t REG_DWORD /d 1 /reg:64
# 3. Install per machine
C:\Staging\OneDriveSetup.exe /allusers
# 4. Start OneDrive at sign-in for every user
REG ADD "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v OneDrive /t REG_SZ /d "C:\Program Files\Microsoft OneDrive\OneDrive.exe /background" /f
# 5. Sign users in silently with their Windows credentials
REG ADD "HKLM\SOFTWARE\Policies\Microsoft\OneDrive" /v "SilentAccountConfig" /t REG_DWORD /d 1 /f
# 6. Move Desktop, Documents and Pictures to OneDrive without prompting
REG ADD "HKLM\SOFTWARE\Policies\Microsoft\OneDrive" /v "KFMSilentOptIn" /t REG_SZ /d "<tenant-id>" /f
```

| Requirement | Setting |
| --- | --- |
| Users must not have to sign in to OneDrive | `SilentAccountConfig` = 1 (needs the machine connected to Microsoft Entra ID; silent sign-in can take a few seconds) |
| Redirect Known Folders without user interaction | `KFMSilentOptIn` = the Microsoft Entra **tenant ID** (a string, not 1) |
| OneDrive must start in every session | `Run` key in HKLM with `/background` |
| One install serving all users, updated centrally | `AllUsersInstall` = 1 and `OneDriveSetup.exe /allusers` |

OneDrive on non-persistent desktops is supported with Azure Virtual Desktop, and with FSLogix (latest version) for the profile or the Office container. The OneDrive cache is per user: with an ODFC container, OneDrive data is included by default and can be sized separately, for example a 10 GB Profile Container and a 50 GB ODFC container for heavy OneDrive users. FSLogix doesn't support running several instances of the same container at the same time.

> **Exam trap.** `KFMSilentOptIn` takes the **tenant ID**, while `SilentAccountConfig` is a DWORD set to 1. And `OneDriveSetup.exe /allusers` without the `AllUsersInstall` value, or with a per-user copy left in place, isn't the documented per-machine installation.

<!-- section: teams | objectives: 3.3.7 -->
## Microsoft Teams and media optimization

Without optimization, Teams audio and video are encoded on the session host and sent through RDP, which loads the host's CPU and adds latency. **Media optimization** offloads calls and meetings to the local device; chat and collaboration work everywhere.

| Component | Used by | Where it runs |
| --- | --- | --- |
| **SlimCore** (new VDI optimization architecture) | New Teams, by default | Media engine `MsTeamsVdi.exe` on the **client**; its plugin is bundled with Windows App and downloaded automatically |
| **Remote Desktop WebRTC Redirector Service** | Classic Teams; **fallback** for new Teams when the client can't use SlimCore | Installed on the **session host** (MSI) |

Microsoft recommends installing the WebRTC Redirector Service alongside new Teams, so that a user who roams to a device without SlimCore support still gets optimization. Teams tries SlimCore first, then WebRTC, then falls back to unoptimized server-side rendering.

**Classic Teams** reached end of support on October 1, 2026 on virtual desktops, and end of availability on April 1, 2027: deploy **new Teams**.

Configuration of a session host:

| Step | How |
| --- | --- |
| 1. Prerequisites | Windows 11 or Windows 10 Enterprise (multi-session or single-session; N and KN editions not supported); latest Microsoft Visual C++ Redistributable on session hosts and clients; WebView2 on multi-session |
| 2. Declare the environment | `HKLM\SOFTWARE\Microsoft\Teams`, `IsWVDEnvironment` (DWORD) = 1 |
| 3. WebRTC Redirector Service | Install the MSI (`https://aka.ms/msrdcwebrtcsvc/msi`) |
| 4. Install new Teams per machine | `teamsbootstrapper.exe -p` (required for pooled host pools) |
| 5. FSLogix | FSLogix 2210 hotfix 4 or later (recommended by the Teams documentation); with an ODFC container, set `IncludeTeams` = 1 (off by default) so the Teams cache is kept |

```powershell
New-Item -Path "HKLM:\SOFTWARE\Microsoft\Teams" -Force
New-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Teams" -Name IsWVDEnvironment -PropertyType DWORD -Value 1 -Force
# Provision new Teams for all users (online, latest version)
.\teamsbootstrapper.exe -p
# Offline: provision from a local MSIX package (full path required)
.\teamsbootstrapper.exe -p -o "C:\Staging\MSTeams-x64.msix"
# Remove Teams for all users
.\teamsbootstrapper.exe -x
```

New Teams is an MSIX package installed in `C:\Program Files\WindowsApps` and **updates automatically**. In a non-persistent pool, set `disableAutoUpdate` (DWORD) = 1 under `HKLM\SOFTWARE\Microsoft\Teams` and update Teams through the image. To publish new Teams as a RemoteApp, use the stable path `shell:appsFolder\MSTeams_8wekyb3d8bbwe!MSTeams`, because the package folder changes with every version.

**Clients.** Optimization needs a supported client: Windows App on Windows, macOS (non-Store version for new Teams), iOS/iPadOS and Android. The web client isn't in the list, and the Teams documentation no longer supports the Remote Desktop client for new Teams. SlimCore also needs a recent Windows App, and Teams administrators can turn it off per user with the `VDI2Optimization` setting of `Set-CsTeamsVdiPolicy`.

**Verify.** In Teams, *Settings > About Teams* shows **AVD SlimCore Media Optimized** (SlimCore) or **AVD Media Optimized** (WebRTC). *AVD Media not connected* or a device list showing *Remote audio* means optimization didn't load: restart Teams, then check the client version and the registry value.

**Unoptimized Teams.** If media optimization can't be used, redirect the devices through RDP properties of the host pool instead: `audiocapturemode:i:1` (microphone), `audiomode:i:0` (play audio locally) and `camerastoredirect:s:*` (all cameras). With optimization, this redirection isn't needed for Teams.

> **Exam trap.** The WebRTC Redirector Service is installed on the **session host**, not on the user's device, and `IsWVDEnvironment` is also set on the session host. A pooled host pool needs a **per-machine** Teams installation (`teamsbootstrapper.exe -p`); a per-user installer is the wrong answer.

<!-- section: browsers | objectives: 3.3.8 -->
## Browsers in Azure Virtual Desktop sessions

Microsoft Edge is included in Windows 10 and Windows 11. Install another channel or version silently from the Microsoft Edge for Business MSI: `msiexec /i <path_to_msi> /qn /norestart`. The same rules as the other apps apply:

| Topic | Recommendation for pooled host pools |
| --- | --- |
| Updates | Turn off automatic updates and update Edge in the **golden image**, so all hosts of the pool run the same version |
| Favorites, history, settings | **Microsoft Entra ID sync** (Enterprise sync): supports several concurrent sessions and different versions. On-premises sync doesn't support concurrent sessions |
| Roaming the user data folder | Don't redirect the whole `User Data` folder; if you redirect part of it, exclude the caches (`Default\Cache`, `Default\Code Cache`, jump list icon folders) |
| Sizing | Microsoft's Edge guidance for virtual desktops: 2–4 vCPU cores and 1 GB of RAM per user as a minimum; large web apps and extensions need more |
| Settings | Edge policies through Group Policy (Edge ADMX) or the Intune **settings catalog**, or the Microsoft Edge management service |

**Multimedia redirection** (chapter 32) is delivered as a browser extension for **Microsoft Edge and Google Chrome**. The extension comes with the host MSI and can be forced through browser policy, for example in the Intune settings catalog (*Microsoft Edge > Extensions > Configure extension management settings*):

```json
{
  "joeclbldhdmoijbaagobkhlpfjglcihd": {
    "installation_mode": "force_installed",
    "runtime_blocked_hosts": [ "*://*.contoso.com" ],
    "update_url": "https://edge.microsoft.com/extensionwebstorebase/v1/crx",
    "toolbar_state": "default_shown"
  }
}
```

`runtime_blocked_hosts` stops the extension on the listed sites; `runtime_allowed_hosts` only creates exceptions and doesn't enable redirection on a site that isn't on a supported list. Restart the session hosts after the policy applies. The service on the host doesn't update itself (reinstall the newer MSI); the extension does.

> **Exam tip.** "Users of a pooled host pool lose their Edge favorites when they connect to another host and sometimes have two sessions at once" points to **Microsoft Entra ID sync**, not to redirecting the Edge profile folder.

<!-- section: key-points -->
## Key points

- Microsoft 365 Apps on multi-session: Microsoft 365 Apps for enterprise, or for business with Business Premium, with `SharedComputerLicensing` = 1, 64-bit, automatic updates off and updates through the image.
- Exclude OneDrive and Teams from the ODT install and install both **per machine**.
- OneDrive: `AllUsersInstall` = 1, `OneDriveSetup.exe /allusers`, `SilentAccountConfig` = 1, `KFMSilentOptIn` = tenant ID.
- Teams: new Teams via `teamsbootstrapper.exe -p`, `IsWVDEnvironment` = 1, WebRTC Redirector Service on the host as fallback, SlimCore on the client; check *About Teams* for the optimized state.
- FSLogix: 2210 hotfix 4 or later for new Teams; ODFC includes Office activation, Outlook and OneDrive by default, Teams only with `IncludeTeams` = 1.
- Edge: update in the image, Microsoft Entra ID sync for roaming, multimedia redirection extension for Edge and Chrome.
