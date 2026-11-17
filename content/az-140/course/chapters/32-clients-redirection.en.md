Users reach Azure Virtual Desktop through a client app, and what they can use in the session (clipboard, drives, webcams, printers, video) depends on redirection settings at three levels. Questions ask which client fits a platform or feature requirement, how to deploy and update it, which RDP property or policy enables or blocks a redirection, and how to print without redirecting local printers.

<!-- section: choose-client | objectives: 3.2.1 -->
## Choosing an Azure Virtual Desktop client

**Windows App** is the client for Azure Virtual Desktop on every platform. It replaces the Remote Desktop clients:

| Client | Status |
| --- | --- |
| Windows App (Windows, macOS, iOS/iPadOS, Android/Chrome OS, web browser, Meta Quest) | Current client |
| Remote Desktop client for Windows (MSI, "Remote Desktop") | No longer supported in public cloud since March 27, 2026 |
| Remote Desktop web client | No longer supported in public cloud since March 27, 2026; replaced by Windows App in a browser |
| Remote Desktop app for Windows (Microsoft Store) | End of support reached in September 2025, no longer available |
| Remote Desktop for macOS and iOS/iPadOS | Replaced by Windows App |

Windows App signs in with a Microsoft work or school account (Microsoft Entra ID); a personal Microsoft account isn't accepted. The web version runs at `https://windows.cloud.microsoft` in current Microsoft Edge, Google Chrome, Safari (macOS) or Firefox, with no installation, but mobile browsers aren't supported.

Features differ by platform. The ones that decide exam answers:

| Feature | Windows | macOS | iOS/iPadOS | Android/Chrome OS | Web browser |
| --- | --- | --- | --- | --- | --- |
| Multiple monitors | Yes | Yes | No | No | No |
| Multimedia redirection (video playback and calls) | Yes | No | No | No | No |
| Teams media optimization (WebRTC) | Yes | Yes | Yes | Yes | No |
| USB and serial port redirection | Yes | No | No | No | No |
| Printer redirection | Yes | Yes | No | No | Yes |
| Scanner redirection | Yes | No | No | No | No |
| RDP Shortpath (managed and public networks) | Yes | Yes | Yes | Yes | No |
| RDP Multipath | Yes | No | No | No | No |
| Private Link | Yes | Yes | Yes | Yes | No |
| Drives | Yes | Yes | Yes | Yes | Upload and download only |

> **Exam trap.** A requirement for redirected video playback, a USB device or a COM port means Windows App on **Windows**. The web browser has no RDP Shortpath and no Private Link, and it only uploads and downloads files instead of redirecting drives.

> **Exam tip.** Windows App on Windows doesn't connect to on-premises Remote Desktop Services; it does connect to Azure Virtual Desktop, Windows 365, Microsoft Dev Box and remote PCs.

<!-- section: deploy-client | objectives: 3.2.2, 3.2.3 -->
## Deploying and troubleshooting clients

Deployment methods for Windows App on Windows (Windows 11, Windows 10 1809 or later, Windows Server 2019 or later):

| Method | When to use |
| --- | --- |
| Microsoft Store | Default. Updates come from the Store; a background task checks every 8 hours and installs when the app is closed |
| Standalone MSIX package | Store blocked, enterprise deployment tool, images. Updates come from a Microsoft CDN by default |
| `winget download --id 9N1F85V9T8BN` then `Add-AppxPackage` | Offline device or Store disabled by policy: install the framework dependencies (VCLibs, Windows App Runtime) first, then the Windows App package |
| Intune, Configuration Manager or another deployment tool | Push the Store app or the MSIX package to managed devices |
| Web browser | No installation possible (kiosk, unmanaged or Linux device) |
| App stores (Apple App Store, Google Play) | macOS, iOS/iPadOS, Android/Chrome OS |

Update behavior is set on the local device with a registry value, which you can deploy with Intune, Configuration Manager or Group Policy:

```powershell
# 0 = updates enabled (default), 1 = disable all, 2 = disable Store updates, 3 = disable CDN updates
$path = "HKLM:\SOFTWARE\Microsoft\WindowsApp"
If (!(Test-Path $path)) { New-Item -Path $path -Force }
New-ItemProperty -Path $path -Name DisableAutomaticUpdates -PropertyType DWORD -Value 1 -Force
```

Automatic updates can only be disabled for an MSIX installation; a Store installation follows the Store update settings. Microsoft doesn't recommend disabling updates and can block outdated client versions.

Troubleshooting checklist:

| Symptom | Cause and fix |
| --- | --- |
| "Your system administrator has not yet configured any resources" | The user isn't assigned to an application group, or the application group isn't registered to a workspace |
| Feed empty or sign-in works but connection fails behind a proxy or firewall | The end-user device can't reach the required Azure Virtual Desktop FQDNs and endpoints for end-user devices |
| A user can't sign in with a personal account | Only work or school accounts are supported |
| App doesn't open or behaves incorrectly | Update to the latest version, then **Repair** or **Reset** it in Windows Settings (Apps); test with Windows App in a browser to isolate the device |
| Slow or unstable sessions | Check the round-trip time with the Azure Virtual Desktop Experience Estimator and the transport (RDP Shortpath) in the connection information |
| New RDP property not applied | Users must refresh their resources (or reconnect) to receive the updated `.rdp` file |

<!-- section: device-redirection | objectives: 3.2.4 -->
## Configuring device redirection

Redirection is controlled at three points, and **the most restrictive setting wins** wherever it's configured:

| Control point | Tool | Example |
| --- | --- | --- |
| Session host (server side) | Intune settings catalog or Group Policy: **Administrative Templates > Windows Components > Remote Desktop Services > Remote Desktop Session Host > Device and Resource Redirection** (and **Printer Redirection**) | **Do not allow Clipboard redirection** = Enabled blocks it, whatever the RDP property |
| Host pool | RDP properties (portal: host pool > **RDP Properties**, tabs Connection information, Session behavior, Device redirection, Display settings, Advanced) | `redirectclipboard:i:1` |
| Local device | Registry `HKLM\Software\Microsoft\Terminal Server Client` (`DisableClipboardRedirection`, `DisablePrinterRedirection` = 1), or Intune app protection on iOS/iPadOS, Android and Edge | Blocks one device while others keep the redirection |

Microsoft recommends allowing the redirection on the session hosts, then controlling it with the host pool RDP properties. Clipboard and printer redirection are disabled in the RDP properties of **newly created host pools**.

| Redirection | RDP property | Values |
| --- | --- | --- |
| Clipboard | `redirectclipboard:i:` | 0 off, 1 on |
| Local, removable and network drives | `drivestoredirect:s:` | empty none, `*` all, `DynamicDrives` drives connected later, `C:\;E:\;` listed drives |
| Microphone | `audiocapturemode:i:` | 0 off (default), 1 on |
| Audio output | `audiomode:i:` | 0 local device (default), 1 remote session, 2 none |
| Cameras | `camerastoredirect:s:` | `*` all, a device path list, `-` prefix to exclude |
| MTP/PTP devices (digital cameras, media players) | `devicestoredirect:s:` | `*` all, `DynamicDevices` |
| Printers | `redirectprinters:i:` | 0 off, 1 on |
| Smart cards | `redirectsmartcards:i:` | 1 on (default) |
| Serial/COM ports | `redirectcomports:i:` | 0 off, 1 on |
| USB (opaque low-level) | `usbdevicestoredirect:s:` | empty none, `*`, class GUID, instance path |
| Location | `redirectlocation:i:` | 0 session host location (default), 1 local device location |
| WebAuthn (Windows Hello, security keys in the session) | `redirectwebauthn:i:` | 1 on (default) |

```powershell
# Replaces the custom RDP properties of the host pool (an empty string removes them all)
Update-AzWvdHostPool -Name hp-sales -ResourceGroupName rg-avd `
  -CustomRdpProperty "redirectclipboard:i:0;drivestoredirect:s:;usbdevicestoredirect:s:;audiocapturemode:i:1;camerastoredirect:s:*"
```

**High-level redirection** (most classes: keyboard, clipboard, drives, cameras, microphones, printers, smart cards) uses an optimized protocol, needs the driver on the local device only, and the device stays usable locally. **Opaque low-level redirection** (`usbdevicestoredirect`, serial ports, all-in-one printer/scanners, biometric readers, VoIP headsets) forwards raw USB traffic: the driver must be installed **in the session host**, and the device is unavailable locally while redirected. USB network adapters and USB displays can never be redirected.

```text
usbdevicestoredirect:s:*;{<DeviceClassGUID>};<USBInstanceID>;<-USBInstanceID>
```

The values are processed in that order: `*`, class GUIDs, instance paths to include, then instance paths prefixed with `-` to exclude.

> **Exam trap.** If drive redirection is blocked on the session host by policy, users also can't copy **files** through the clipboard; text and images still work.

> **Exam trap.** Allowing a redirection in the host pool RDP properties isn't enough when the session host policy blocks it. Check the most restrictive point first.

<!-- section: multimedia-redirection | objectives: 3.2.5 -->
## Configuring multimedia redirection

Multimedia redirection (MMR) offloads work from the session host to the local device:

| Function | Effect |
| --- | --- |
| Video playback redirection | The browser in the session fetches the video, the bitstream is decoded and rendered on the local device (YouTube, Microsoft Stream, LinkedIn Learning and other listed sites). Protected content isn't supported |
| Call redirection | WebRTC calls from browser-based calling apps (contact-center apps such as Genesys, Five9, Twilio Flex) are offloaded to the local device |

Requirements and setup:

1. Session hosts with the latest Microsoft Edge or Google Chrome and Microsoft Visual C++ Redistributable 2015-2022 (14.32.31332.0 or later), also on local Windows devices.
2. Users connect with **Windows App on Windows** (2.0.297.0 or later).
3. Install the single MSI (`https://aka.ms/avdmmr/msi`) on the session hosts with the browsers closed: it installs the **Remote Desktop Multimedia Redirection Service** and the browser extension. `msiexec /i <file> /qn` for silent deployment. The service doesn't update itself; the extension does.
4. Users are prompted to enable the extension, or you force-install it with the browser policy **Configure extension management settings** (Intune settings catalog, Group Policy or the Microsoft Edge management service).

```json
{
  "joeclbldhdmoijbaagobkhlpfjglcihd": {
    "installation_mode": "force_installed",
    "update_url": "https://edge.microsoft.com/extensionwebstorebase/v1/crx"
  }
}
```

Extra sites are added with the `AllowedVideoRedirectionSites` and `AllowedCallRedirectionSites` registry values under the extension policy key; `runtime_blocked_hosts` in the extension settings blocks the extension on chosen domains. The extension icon shows whether the page is redirected.

> **Exam trap.** Multimedia redirection isn't the Teams optimization. Microsoft Teams uses its own media optimization (WebRTC Redirector Service or SlimCore); MMR is for video and calls **in a browser**.

<!-- section: printing | objectives: 3.2.6 -->
## Configuring printing and Universal Print

Two ways to print from a session:

| Approach | How it works | Choose it when |
| --- | --- | --- |
| Printer redirection | `redirectprinters:i:1`: every printer of the local device appears in the session as *Printer name (redirected n)* using the **Remote Desktop Easy Print** driver. The real driver is needed only on the local device | Users print to printers attached to or installed on their own device |
| Universal Print | Microsoft 365 cloud print service: printers are registered in Universal Print (directly or through the Universal Print connector), shared, and users are granted access. Users sign in with Microsoft Entra ID and install shared printers in the session | No print server, printers in the office regardless of the client device, mobile or browser clients that can't redirect printers |

Printer redirection details:

- All local printers are redirected, never a selection; the local default printer becomes the default printer in the session.
- Block it on the session host with **Do not allow client printer redirection** (Intune settings catalog or Group Policy, under **Remote Desktop Session Host > Printer Redirection**), on the host pool with `redirectprinters:i:0`, or on one device with `DisablePrinterRedirection`.
- `SmartRawPrinters:s:*` (or a driver name prefix) enables RAW printing for redirected printers whose jobs aren't XPS-compatible; printer redirection must be on.
- Check in the session with `Get-Printer | ? DriverName -eq "Remote Desktop Easy Print"`.

Universal Print on multi-session hosts (Windows 11 Enterprise multi-session 22H2 or later): printers are installed **per user** rather than machine-wide, roam with the FSLogix profile to other session hosts, and location-based search can use the client device's location if **Location services** and **Allow location override** are enabled on the session hosts.

> **Exam tip.** "Users connect from iPads and must print to office printers without a print server" points to Universal Print: Windows App on iOS/iPadOS doesn't redirect printers.

<!-- section: key-points -->
## Key points

- Windows App is the client everywhere; the MSI client and the web client lost support in public cloud on March 27, 2026.
- Only Windows App on Windows offers multimedia redirection, USB and COM port redirection and RDP Multipath; the browser has no RDP Shortpath and no Private Link.
- Store installs update through the Store; MSIX installs can be controlled with `DisableAutomaticUpdates`.
- Redirection = session host policy + host pool RDP property + local device: the most restrictive wins; new host pools disable clipboard and printer redirection.
- Opaque low-level USB redirection needs the driver in the session; high-level redirection needs it locally.
- MMR = one MSI on session hosts + browser extension, Windows clients only.
- Printer redirection uses Remote Desktop Easy Print; Universal Print is the cloud alternative, with per-user printers on Windows 11 multi-session.
